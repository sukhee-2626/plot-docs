import { chatForProvider } from '@plotdocs/ai-provider'
import type {
  AnalyticsAutoAnalysis,
  AnalyticsInterpretation,
  AnalyticsInterpretationFinding,
} from '../../shared/analytics-api'
import { resolveAnalyticsAiConfig } from './ai'
import { ungroundedNumbers, withTimeout } from './grounding'

const MAX_INTERPRETATION_MS = 20_000
const MAX_EVIDENCE_CHARS = 24_000

export interface InterpretationDeps {
  settingsPath: string
  audit(action: string, detail: unknown): void
}

export interface InterpretationResult {
  interpretation: AnalyticsInterpretation | null
  error?: string
  model?: string
}

const SYSTEM_PROMPT = `You are the interpretation layer of Plot AI, a local-first data analyst.
You receive evidence that the app already calculated with SQL and documented statistics. You do not query data and you do not calculate anything.
Your job is to explain what the evidence means for a person who has to make a decision.

Rules:
- Use only facts and numbers that appear in the evidence. Never calculate a new number, percentage, total or difference.
- Never invent a column, row, table, cause, business context or result.
- Separate description from causation. Say "moves with", not "causes".
- Explain the strongest pattern, the practical implication, and the main uncertainty.
- If the evidence is weak or incomplete, say so plainly instead of filling the gap.
- findings must use the exact insight ids from the evidence and explain that specific insight.
- actions must be concrete checks or next steps that follow from the evidence.
- Use plain text only. No markdown, no code blocks.

Return ONLY one JSON object:
{
  "headline": "one short sentence a reader can scan",
  "meaning": "two to four sentences explaining what the evidence means and how to read it",
  "findings": [{"insightId": "exact id", "meaning": "one or two sentences about this insight"}],
  "actions": ["two to four concrete next checks"],
  "caveats": ["one to four limits or uncertainties"]
}`

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    const clean = text(item, maxLength)
    if (clean && !result.includes(clean)) result.push(clean)
    if (result.length >= maxItems) break
  }
  return result
}

function parseJsonObject(raw: string): Record<string, unknown> {
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
    throw new Error('The AI reading was not valid JSON.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI reading was empty.')
  }
  return parsed as Record<string, unknown>
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, 120)
    } catch {
      return String(value).slice(0, 120)
    }
  }
  return String(value).slice(0, 120)
}

export function buildEvidenceDigest(analysis: AnalyticsAutoAnalysis, datasetName: string): string {
  const summary = analysis.summary
  const lines: string[] = [`Dataset: ${datasetName}`]
  if (summary) {
    lines.push(
      `Rows: ${summary.rowCount}; columns: ${summary.columnCount}; quality score: ${summary.qualityScore}/100; missing cells: ${summary.missingCells}; duplicate rows: ${summary.duplicateRows}`,
    )
    if (summary.primaryMetric) lines.push(`Primary metric: ${summary.primaryMetric}`)
    if (summary.primaryDimension) lines.push(`Primary dimension: ${summary.primaryDimension}`)
    if (summary.timeColumn) lines.push(`Time column: ${summary.timeColumn}`)
  }
  if (analysis.plan) {
    lines.push(`Dataset understanding (${analysis.plan.source}): ${analysis.plan.summary}`)
    lines.push(`Grain: ${analysis.plan.grain}`)
    if (analysis.plan.metric) lines.push(`Chosen metric: ${analysis.plan.metric}`)
    if (analysis.plan.dimension) lines.push(`Chosen dimension: ${analysis.plan.dimension}`)
    if (analysis.plan.timeColumn) lines.push(`Chosen time axis: ${analysis.plan.timeColumn}`)
    if (analysis.plan.questions.length > 0) {
      lines.push(`Questions the plan set out to answer: ${analysis.plan.questions.join(' | ')}`)
    }
  }
  lines.push('Computed insights:')
  for (const insight of analysis.insights) {
    lines.push(`- [${insight.id}] ${insight.kind}: ${insight.title}`)
    lines.push(`  Confidence: ${insight.confidence}`)
    lines.push(`  Detail: ${insight.detail}`)
    if (insight.takeaway) lines.push(`  Takeaway: ${insight.takeaway}`)
    if (insight.meaning) lines.push(`  Local meaning: ${insight.meaning}`)
    if (insight.result) {
      lines.push(`  Result columns: ${insight.result.columns.join(', ')}`)
      const rows = insight.result.rows
        .slice(0, 5)
        .map((row) => row.map(cell).join(' | '))
        .join(' ;; ')
      if (rows) lines.push(`  First rows: ${rows}`)
    }
  }
  if (analysis.prepared.length > 0) lines.push(`Prepared: ${analysis.prepared.join(' ')}`)
  if (analysis.methods.length > 0) lines.push(`Methods: ${analysis.methods.join(' ')}`)
  return lines.join('\n').slice(0, MAX_EVIDENCE_CHARS)
}

/**
 * Validate a model reading against the exact evidence it was given.
 *
 * This is intentionally conservative: a data-scale number that cannot be
 * found in the evidence rejects the whole reading, and the caller falls back
 * to the deterministic local reading.
 */
export function parseInterpretation(
  raw: string,
  analysis: AnalyticsAutoAnalysis,
  model = 'default',
  datasetName?: string,
): AnalyticsInterpretation {
  const record = parseJsonObject(raw)
  const headline = text(record.headline, 180)
  const meaning = text(record.meaning, 1400)
  if (!headline || !meaning) {
    throw new Error('The AI reading did not include a headline and meaning.')
  }
  const validIds = new Set(analysis.insights.map((insight) => insight.id))
  const findings: AnalyticsInterpretationFinding[] = []
  if (Array.isArray(record.findings)) {
    for (const item of record.findings) {
      if (!item || typeof item !== 'object') continue
      const entry = item as Record<string, unknown>
      const insightId = text(entry.insightId, 80)
      const finding = text(entry.meaning, 420)
      if (!validIds.has(insightId) || !finding) continue
      if (findings.some((existing) => existing.insightId === insightId)) continue
      findings.push({ insightId, meaning: finding })
      if (findings.length >= 8) break
    }
  }
  const actions = stringList(record.actions, 4, 240)
  const caveats = stringList(record.caveats, 5, 240)

  const digest = buildEvidenceDigest(
    analysis,
    datasetName ?? analysis.datasetName ?? analysis.datasetId,
  )
  const readingTexts = [
    headline,
    meaning,
    ...findings.map((finding) => finding.meaning),
    ...actions,
    ...caveats,
  ]
  const ungrounded = ungroundedNumbers(readingTexts, digest)
  if (ungrounded.length > 0) {
    throw new Error(
      `The AI reading introduced numbers that are not in the evidence: ${ungrounded.slice(0, 5).join(', ')}.`,
    )
  }

  return {
    headline,
    meaning,
    findings,
    actions,
    caveats,
    source: 'ai',
    model,
    basis: analysis.insights.map((insight) => insight.id),
    generatedAt: Date.now(),
    verified: true,
    note: `Generated by ${model} from the same evidence. Data-scale numbers were checked against it.`,
  }
}

/**
 * Ask the configured model for a plain-language reading of the computed
 * evidence. Returns `null` on any failure so the caller can keep the local
 * reading and label it honestly.
 */
export async function interpretAnalysisWithAi(
  analysis: AnalyticsAutoAnalysis,
  datasetName: string,
  deps: InterpretationDeps,
): Promise<InterpretationResult> {
  if (!analysis.ok || analysis.insights.length === 0) {
    return { interpretation: null, error: 'There is no evidence to interpret.' }
  }
  const config = resolveAnalyticsAiConfig(deps.settingsPath)
  if (!config.ok) {
    return { interpretation: null, error: config.error }
  }
  try {
    const digest = buildEvidenceDigest(analysis, datasetName)
    const response = await withTimeout(
      chatForProvider(
        config.provider,
        config.config,
        SYSTEM_PROMPT,
        `Evidence:\n${digest}\n\nWrite the reading for a non-technical reader who must decide what to do next.`,
      ),
      MAX_INTERPRETATION_MS,
    )
    if (!response.ok || !response.content) {
      throw new Error(response.error ?? 'The AI provider returned no reading.')
    }
    const interpretation = parseInterpretation(
      response.content,
      analysis,
      config.model,
      datasetName,
    )
    deps.audit('auto-interpretation', {
      datasetId: analysis.datasetId,
      source: 'ai',
      model: config.model,
      insights: interpretation.basis,
    })
    return { interpretation, model: config.model }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    deps.audit('auto-interpretation-failed', {
      datasetId: analysis.datasetId,
      error: message.slice(0, 500),
    })
    return { interpretation: null, error: message }
  }
}
