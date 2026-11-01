import { existsSync, readFileSync } from 'node:fs'
import {
  activeProvider,
  chatForProvider,
  defaultAiSettings,
  resolveAiSettings,
  resolveProfileCredential,
  type AiProviderConfig,
  type AiProviderId,
  type AiSettings,
} from '@plotdocs/ai-provider'
import { soopusApiKey } from '@plotdocs/ai-search'
import type {
  AnalyticsAskResult,
  AnalyticsChartSpec,
  AnalyticsDatasetDetail,
  AnalyticsQueryResult,
} from '../../shared/analytics-api'
import { ungroundedNumbers, withTimeout } from './grounding'
import { validateReadOnlySql } from './sql'
import { normalizeChartSpec } from './validation'

interface AiAnalystInput {
  settingsPath: string
  dataset: AnalyticsDatasetDetail
  question: string
  runQuery: (sql: string) => AnalyticsQueryResult
  audit: (action: string, detail: unknown) => void
}

function readSettings(path: string): Partial<AiSettings> {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as Partial<AiSettings>
  } catch {
    /* fall through to defaults */
  }
  return {}
}

type AnalyticsAiConfig =
  | { ok: true; provider: AiProviderId; config: AiProviderConfig; model: string }
  | { ok: false; error: string; provider?: AiProviderId }

/**
 * Resolve the same Soopus/provider configuration the rest of the app uses.
 * The analytics surfaces must never invent credentials or store them.
 */
export function resolveAnalyticsAiConfig(settingsPath: string): AnalyticsAiConfig {
  const stored = readSettings(settingsPath)
  const settings = resolveAiSettings(stored, defaultAiSettings())
  settings.provider = activeProvider(settings)
  const provider = settings.provider
  let config = settings.providers?.[provider]
  if (provider === 'soopus' && config && !config.apiKey) {
    config = { ...config, apiKey: soopusApiKey() }
  }
  config = config ? resolveProfileCredential(config) : config
  if (!config || (provider !== 'codex' && !config.apiKey)) {
    return {
      ok: false,
      provider,
      error:
        provider === 'soopus'
          ? 'Sign in to Soopus AI or pick another model in Settings → AI Model.'
          : `Add a key for ${provider} in Settings → AI Model, or pick another model.`,
    }
  }
  if (provider !== 'codex' && !config.model) {
    return {
      ok: false,
      provider,
      error: 'Choose a model in the picker or in Settings → AI Model.',
    }
  }
  return { ok: true, provider, config, model: config.model ?? 'default' }
}

export function parseAnalyticsPlan(text: string): {
  explanation: string
  sql: string
  chart: AnalyticsChartSpec | null
  caveats: string[]
} {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const candidate =
    fenced?.[1] ??
    (() => {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      return start >= 0 && end > start ? text.slice(start, end + 1) : text
    })()
  let raw: unknown
  try {
    raw = JSON.parse(candidate.trim())
  } catch {
    throw new Error('The AI did not return a machine-readable analysis plan. Try rephrasing the question.')
  }
  if (!raw || typeof raw !== 'object') throw new Error('The AI plan was empty.')
  const record = raw as Record<string, unknown>
  const sql = typeof record.sql === 'string' ? record.sql.trim() : ''
  if (!sql) throw new Error('The AI plan did not include SQL. No result was produced.')
  const explanation =
    typeof record.explanation === 'string' ? record.explanation.trim() : 'Analysis plan'
  const caveats = Array.isArray(record.caveats)
    ? record.caveats.filter((item): item is string => typeof item === 'string').slice(0, 8)
    : []
  const chart = normalizeChartSpec(record.chart)
  return { explanation, sql, chart, caveats }
}

function buildPrompt(dataset: AnalyticsDatasetDetail): string {
  const schema = dataset.columns
    .map(
      (column) =>
        `- ${JSON.stringify(column.name)} (${column.type}; ${column.nullCount} nulls; ${column.distinctCount} distinct)`,
    )
    .join('\n')
  const sample = JSON.stringify(
    dataset.preview.rows.slice(0, 6).map((row) =>
      Object.fromEntries(dataset.preview.columns.map((column, index) => [column, row[index] ?? null])),
    ),
    null,
    0,
  )
  return `Table: data (SQLite)
Rows: ${dataset.rowCount}
Columns:
${schema}

Six sample rows (values may be null):
${sample}

Write one read-only SQLite query over the table data. Use the exact quoted column names. Use only SELECT or WITH. Do not use PRAGMA, ATTACH, INSERT, UPDATE, DELETE, DROP, ALTER or CREATE. Prefer a small result (add LIMIT 200) and readable aliases. If the question cannot be answered from these columns, explain that and return sql as an empty string.`
}

const SYSTEM_PROMPT = `You are the Plot Docs AI Data Analyst. You turn a user's question into one evidence-backed analysis plan.
Return ONLY JSON (no markdown, no prose outside JSON):
{
  "explanation": "one or two sentences describing the calculation",
  "sql": "one read-only SQLite SELECT or WITH query over the table data",
  "chart": {"type":"bar|line|area","x":"exact column alias","y":"exact numeric column alias","aggregation":"sum|avg|min|max|count"} or null,
  "caveats": ["short limitation or assumption"]
}
Never invent columns or values. Never claim a result you did not query. The app will execute the SQL and show its exact output as evidence. If the schema cannot answer the question, return an empty sql and explain why.`

type ReadyAiConfig = Extract<AnalyticsAiConfig, { ok: true }>

const QUERY_READING_PROMPT = `You explain what a single executed query result means.
You receive the question, the exact SQL, the result shape and the first rows. You do not query data and you do not calculate anything.
Rules:
- Use only numbers and values that appear in the evidence. Never calculate a new total, percentage, difference or average.
- Never invent a column, row, cause or business context.
- Separate description from causation.
- Explain the practical meaning in two to four sentences.
- If the result is empty or too small to support a conclusion, say so plainly.
- Plain text only. No markdown, no code blocks.

Return ONLY one JSON object:
{"meaning":"two to four sentences","caveats":["one to four limits"]}`

function displayCell(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : String(value)
  }
  return String(value).slice(0, 160)
}

function localQueryMeaning(result: AnalyticsQueryResult): string {
  if (result.columns.length === 0) {
    return 'The query returned no columns, so there is no result to interpret.'
  }
  if (result.rowCount === 0) {
    return 'The query returned no rows. On this dataset, that means the question is not answered by the current filters or values; check the column values before concluding the answer is zero.'
  }
  const first = result.rows[0]
  if (result.rowCount === 1 && result.columns.length === 1) {
    return `The query returns a single value: ${displayCell(first?.[0])}. That is the direct answer from the current rows; it inherits any missing values or filters used by the query.`
  }
  if (result.columns.length >= 2 && first) {
    return `The query returned ${result.rowCount.toLocaleString()} rows. The leading row is ${displayCell(first[0])} with ${displayCell(first[1])}. Read this as the top of the current result, not proof that the pattern is causal.`
  }
  return `The query returned ${result.rowCount.toLocaleString()} rows across ${result.columns.length} columns. The exact rows are shown below; use the SQL and row count to judge how far the result generalizes.`
}

function parseQueryReading(raw: string): { meaning: string; caveats: string[] } {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  const candidate =
    fenced?.[1] ??
    (() => {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      return start >= 0 && end > start ? raw.slice(start, end + 1) : raw
    })()
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate.trim())
  } catch {
    throw new Error('The AI explanation was not valid JSON.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI explanation was empty.')
  }
  const record = parsed as Record<string, unknown>
  const meaning =
    typeof record.meaning === 'string' ? record.meaning.replace(/\s+/g, ' ').trim().slice(0, 1200) : ''
  if (!meaning) throw new Error('The AI explanation did not include a meaning.')
  const caveats = Array.isArray(record.caveats)
    ? record.caveats
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, 240))
        .filter(Boolean)
        .slice(0, 4)
    : []
  return { meaning, caveats }
}

async function explainQueryResult(
  config: ReadyAiConfig,
  question: string,
  dataset: AnalyticsDatasetDetail,
  sql: string,
  result: AnalyticsQueryResult,
): Promise<{ meaning: string; caveats: string[]; source: 'ai' | 'local'; model?: string }> {
  const local = localQueryMeaning(result)
  const evidence = [
    `Dataset: ${dataset.name}`,
    `Question: ${question}`,
    `SQL:\n${sql}`,
    `Result: ${result.rowCount.toLocaleString()} rows${result.truncated ? ' (capped)' : ''}; columns: ${result.columns.join(', ')}`,
    `First rows (JSON): ${JSON.stringify(
      result.rows.slice(0, 12).map((row) =>
        Object.fromEntries(result.columns.map((column, index) => [column, row[index] ?? null])),
      ),
    )}`,
  ].join('\n')
  try {
    const response = await withTimeout(
      chatForProvider(config.provider, config.config, QUERY_READING_PROMPT, evidence),
      20_000,
    )
    if (!response.ok || !response.content) {
      throw new Error(response.error ?? 'The AI provider returned no explanation.')
    }
    const parsed = parseQueryReading(response.content)
    const ungrounded = ungroundedNumbers([parsed.meaning, ...parsed.caveats], evidence)
    if (ungrounded.length > 0) {
      throw new Error(
        `The AI explanation introduced numbers that are not in the result: ${ungrounded.slice(0, 5).join(', ')}.`,
      )
    }
    return { ...parsed, source: 'ai', model: config.model }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      meaning: local,
      caveats: [
        `The AI explanation was unavailable, so this is a local reading. ${message}`.slice(0, 240),
      ],
      source: 'local',
    }
  }
}

export async function askAnalyticsAi(input: AiAnalystInput): Promise<AnalyticsAskResult> {
  const question = input.question.trim()
  if (!question) {
    return { ok: false, question, error: 'Ask a question first.', caveats: [] }
  }
  if (question.length > 2000) {
    return { ok: false, question, error: 'Keep the question under 2,000 characters.', caveats: [] }
  }
  const configResult = resolveAnalyticsAiConfig(input.settingsPath)
  if (!configResult.ok) {
    return { ok: false, question, error: configResult.error, caveats: [] }
  }
  const { provider, config } = configResult
  const response = await chatForProvider(
    provider,
    config,
    SYSTEM_PROMPT,
    `${buildPrompt(input.dataset)}\n\nUser question: ${question}`,
  )
  if (!response.ok || !response.content) {
    const failure = response.error ?? 'The AI provider returned no answer.'
    input.audit('ai-failure', { datasetId: input.dataset.id, question, error: failure.slice(0, 500) })
    return { ok: false, question, error: failure, caveats: [] }
  }
  let plan: ReturnType<typeof parseAnalyticsPlan>
  try {
    plan = parseAnalyticsPlan(response.content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    input.audit('ai-plan-rejected', { datasetId: input.dataset.id, question, error: message })
    return { ok: false, question, error: message, caveats: [] }
  }
  if (!plan.sql) {
    input.audit('ai-no-query', { datasetId: input.dataset.id, question, explanation: plan.explanation })
    return {
      ok: false,
      question,
      explanation: plan.explanation,
      caveats: plan.caveats,
      model: config.model,
      error: plan.explanation || 'The available columns cannot answer that question.',
    }
  }
  try {
    const sql = validateReadOnlySql(plan.sql)
    const result = input.runQuery(sql)
    // A chart is evidence only when its axes exist in the actual result.
    const chart =
      plan.chart &&
      result.columns.includes(plan.chart.x) &&
      result.columns.includes(plan.chart.y)
        ? plan.chart
        : null
    const reading = await explainQueryResult(configResult, question, input.dataset, sql, result)
    input.audit('ai-query', {
      datasetId: input.dataset.id,
      question,
      sql,
      rowCount: result.rowCount,
      model: config.model,
      reading: reading.source,
    })
    return {
      ok: true,
      question,
      explanation: plan.explanation,
      meaning: reading.meaning,
      meaningSource: reading.source,
      ...(reading.model ? { meaningModel: reading.model } : {}),
      sql,
      chart,
      caveats: [...plan.caveats, ...reading.caveats].slice(0, 8),
      result,
      model: config.model,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    input.audit('ai-query-failed', {
      datasetId: input.dataset.id,
      question,
      sql: plan.sql,
      error: message,
    })
    return {
      ok: false,
      question,
      explanation: plan.explanation,
      sql: plan.sql,
      chart: plan.chart,
      caveats: plan.caveats,
      model: config.model,
      error: `The AI's query was rejected or failed: ${message}`,
    }
  }
}
