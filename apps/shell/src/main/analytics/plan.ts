import { chatForProvider } from '@plotdocs/ai-provider'
import type {
  AnalyticsAiColumnRole,
  AnalyticsAiColumnUnderstanding,
  AnalyticsAiPlan,
  AnalyticsAiPlanResult,
  AnalyticsAiPreparation,
  AnalyticsAutoInsightKind,
  AnalyticsColumnProfile,
  AnalyticsDatasetDetail,
} from '../../shared/analytics-api'
import { resolveAnalyticsAiConfig } from './ai'
import { isIdentifierColumn, isTimePartColumn, pickColumns } from './auto'
import { withTimeout } from './grounding'

const MAX_PLAN_MS = 20_000
const MAX_CONTEXT_CHARS = 20_000
const SUPPORTED_ANALYSES: AnalyticsAutoInsightKind[] = [
  'quality',
  'ranking',
  'trend',
  'distribution',
  'correlation',
  'outlier',
  'forecast',
]
const SUPPORTED_ROLES: AnalyticsAiColumnRole[] = [
  'metric',
  'dimension',
  'time',
  'identifier',
  'text',
  'ignore',
]
const SUPPORTED_PREPARATION: AnalyticsAiPreparation['kind'][] = [
  'drop_duplicates',
  'drop_nulls',
  'trim',
  'fill_mean',
]

export interface PlanDeps {
  settingsPath: string
  audit(action: string, detail: unknown): void
}

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
    throw new Error('The AI understanding was not valid JSON.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI understanding was empty.')
  }
  return parsed as Record<string, unknown>
}

function numeric(column: AnalyticsColumnProfile): boolean {
  return column.type === 'integer' || column.type === 'real'
}

function isUsableMetric(column: AnalyticsColumnProfile | undefined): boolean {
  return !!column && numeric(column) && !isIdentifierColumn(column) && !isTimePartColumn(column)
}

function isUsableDimension(
  column: AnalyticsColumnProfile | undefined,
  metric?: AnalyticsColumnProfile | null,
  time?: AnalyticsColumnProfile | null,
): boolean {
  if (!column || column.name === metric?.name || column.name === time?.name) return false
  if (column.type === 'date') return false
  if (isIdentifierColumn(column)) return false
  return column.distinctCount > 1 && column.distinctCount <= 500
}

function isUsableTime(column: AnalyticsColumnProfile | undefined): boolean {
  return !!column && column.type === 'date'
}

function columnDescription(column: AnalyticsColumnProfile, role: AnalyticsAiColumnRole): string {
  const missing = column.nullCount > 0 ? `, ${column.nullCount.toLocaleString()} missing` : ''
  switch (role) {
    case 'time':
      return `Date-like column used as the time axis${missing}.`
    case 'metric':
      return `Numeric measure with ${column.distinctCount.toLocaleString()} distinct values${missing}.`
    case 'dimension':
      return `Categorical column with ${column.distinctCount.toLocaleString()} distinct values${missing}.`
    case 'identifier':
      return `Identifier-like column with ${column.distinctCount.toLocaleString()} distinct values${missing}.`
    case 'text':
      return `Free-text or high-cardinality column with ${column.distinctCount.toLocaleString()} distinct values${missing}.`
    case 'ignore':
      return `Excluded from automatic measures: the column name or type marks it as a time part, identifier or unsupported field${missing}.`
    default:
      return `Column with ${column.distinctCount.toLocaleString()} distinct values${missing}.`
  }
}

function heuristicRole(column: AnalyticsColumnProfile): AnalyticsAiColumnRole {
  if (column.type === 'date') return 'time'
  if (numeric(column)) {
    if (isTimePartColumn(column)) return 'ignore'
    return isIdentifierColumn(column) ? 'identifier' : 'metric'
  }
  if (column.type === 'boolean') return 'dimension'
  if (column.type === 'text') {
    if (isIdentifierColumn(column)) return 'identifier'
    return column.distinctCount > 1 && column.distinctCount <= 200 ? 'dimension' : 'text'
  }
  return 'ignore'
}

function localQuestions(
  metric: AnalyticsColumnProfile | null,
  secondary: AnalyticsColumnProfile | null,
  dimension: AnalyticsColumnProfile | null,
  time: AnalyticsColumnProfile | null,
): string[] {
  const questions: string[] = []
  if (dimension) {
    questions.push(
      metric
        ? `Which ${dimension.name} has the highest total ${metric.name}?`
        : `Which ${dimension.name} has the most records?`,
    )
  }
  if (time && metric) questions.push(`How has ${metric.name} changed over ${time.name}?`)
  if (metric) questions.push(`How concentrated is ${metric.name}, and which values are unusual?`)
  if (metric && secondary) {
    questions.push(`Do ${metric.name} and ${secondary.name} move together, or does the pattern disappear within groups?`)
  }
  questions.push('What does one row represent, and which columns are complete enough to rely on?')
  return questions.slice(0, 5)
}

function localPreparation(detail: AnalyticsDatasetDetail, metric: AnalyticsColumnProfile | null): AnalyticsAiPreparation[] {
  const steps: AnalyticsAiPreparation[] = []
  if (detail.duplicateRows > 0) {
    steps.push({
      kind: 'drop_duplicates',
      reason: `${detail.duplicateRows.toLocaleString()} exact duplicate rows are present. Removing them first prevents double-counting.`,
    })
  }
  if (metric && metric.nullCount > 0) {
    steps.push({
      kind: 'fill_mean',
      column: metric.name,
      reason: `${metric.nullCount.toLocaleString()} ${metric.name} values are missing. Only impute the mean if missingness is random; otherwise keep the gaps visible.`,
    })
  }
  return steps
}

/**
 * Build an honest, deterministic reading of a dataset from its schema and
 * profile. This is the fallback when no model is configured, and it is also
 * the baseline that model choices are validated against.
 */
export function buildLocalPlan(detail: AnalyticsDatasetDetail): AnalyticsAiPlan {
  const picks = pickColumns(detail)
  const metric = picks.metric
  const secondary = picks.secondaryMetric
  const dimension = picks.dimension
  const time = picks.time
  const measures = detail.columns.filter((column) => isUsableMetric(column)).slice(0, 4)
  const groups = detail.columns
    .filter((column) => column.type === 'text' && isUsableDimension(column, metric, time))
    .sort((a, b) => a.distinctCount - b.distinctCount)
    .slice(0, 4)
  const dates = detail.columns.filter((column) => column.type === 'date').slice(0, 3)

  const pieces: string[] = [
    `${detail.rowCount.toLocaleString()} rows across ${detail.columnCount.toLocaleString()} columns.`,
  ]
  if (measures.length > 0) {
    pieces.push(`Numeric measures include ${measures.map((column) => column.name).join(', ')}.`)
  } else {
    pieces.push('No numeric measure was detected, so the run will count records and describe categories rather than sum values.')
  }
  if (groups.length > 0) {
    pieces.push(`Categorical dimensions include ${groups.map((column) => column.name).join(', ')}.`)
  }
  if (dates.length > 0) {
    pieces.push(`Time is recorded in ${dates.map((column) => column.name).join(', ')}.`)
  } else {
    pieces.push('No date column was detected, so no time trend will be calculated.')
  }

  const identifier = detail.columns.find(
    (column) =>
      isIdentifierColumn(column) &&
      column.distinctCount === detail.rowCount &&
      detail.rowCount > 0,
  )
  const grain = identifier
    ? `One row per ${identifier.name}: the identifier is unique in the imported copy.`
    : detail.duplicateRows > 0
      ? 'One row appears to be one record, but the grain is not verified and exact duplicates are present.'
      : 'One row appears to be one record. No unique key was verified, so the grain remains a hypothesis.'

  const analyses: AnalyticsAutoInsightKind[] = ['quality']
  if (dimension) analyses.push('ranking')
  if (time) analyses.push('trend')
  if (metric) analyses.push('distribution', 'outlier')
  if (metric && secondary) analyses.push('correlation')
  if (metric && (time || secondary)) analyses.push('forecast')

  return {
    summary: pieces.join(' ').slice(0, 600),
    grain,
    columnRoles: detail.columns.map((column) => {
      const role = heuristicRole(column)
      return { name: column.name, role, description: columnDescription(column, role) }
    }),
    metric: metric?.name ?? null,
    dimension: dimension?.name ?? null,
    timeColumn: time?.name ?? null,
    questions: localQuestions(metric, secondary, dimension, time),
    analyses: [...new Set(analyses)],
    preparation: localPreparation(detail, metric),
    caveats: [
      'This is a heuristic reading of column names, types and profiles, not a model’s interpretation.',
      'Column meanings are inferred; verify business definitions with the data owner.',
      'No causal relationships are assumed.',
      ...(identifier ? [] : ['The grain was not verified with a unique key.']),
      ...(detail.duplicateRows > 0
        ? ['Duplicate rows are present; the automatic run removes exact duplicates first.']
        : []),
    ],
    source: 'local',
    verified: true,
    note: 'Generated locally from the schema and profile. No model was used.',
  }
}

function buildPlanContext(detail: AnalyticsDatasetDetail): string {
  const columns = detail.columns
    .map((column) => {
      const top = column.topValues
        .slice(0, 3)
        .map((entry) => `${JSON.stringify(entry.value)} (${entry.count})`)
        .join(', ')
      return `- ${JSON.stringify(column.name)} (${column.type}; ${column.nullCount} nulls; ${column.distinctCount} distinct; min ${JSON.stringify(column.min)}; max ${JSON.stringify(column.max)}; mean ${column.mean ?? 'null'}${top ? `; top ${top}` : ''})`
    })
    .join('\n')
  const sample = JSON.stringify(
    detail.preview.rows.slice(0, 6).map((row) =>
      Object.fromEntries(detail.preview.columns.map((column, index) => [column, row[index] ?? null])),
    ),
  )
  return `Dataset: ${detail.name}
Source: ${detail.sourceType} (${detail.sourceName})
Rows: ${detail.rowCount}; columns: ${detail.columnCount}; duplicate rows: ${detail.duplicateRows}; missing cells: ${detail.missingCells}; quality score: ${detail.qualityScore}/100
Columns:
${columns}

Six sample rows (values may be null):
${sample}`.slice(0, MAX_CONTEXT_CHARS)
}

const SYSTEM_PROMPT = `You are Plot AI's dataset-understanding layer. You read a schema, profile and six sample rows before any analysis runs.
You do not write SQL and you do not calculate results. A deterministic engine will execute every calculation after your plan.

Your job:
- Explain what this dataset appears to represent and what one row represents (the grain).
- Give every column a likely role and a short description.
- Choose the single best metric, dimension and time column for an automated first analysis.
- Propose questions a person would actually want answered from these columns.
- Choose which supported analyses are worth running.
- Suggest only reversible preparation that the profile justifies.

Rules:
- Use exact column names, including case.
- Use only the schema, profile and sample values you are given. Treat column meanings as hypotheses. You may say "the column names suggest…"; do not assert business facts you cannot see.
- Never invent rows, values, totals, causes or external context.
- Choose a metric only if it is numeric and is a measure, not an identifier or a year.
- Choose a dimension only if it is categorical or low-cardinality and is not the metric.
- Choose timeColumn only if it is a date column.
- Questions must be answerable from the available columns.
- Only propose preparation when the profile shows an issue. Prefer no preparation over a destructive change.
- Supported analyses: quality, ranking, trend, distribution, correlation, outlier, forecast.
- Supported preparation kinds: drop_duplicates, drop_nulls, trim, fill_mean.

Return ONLY one JSON object:
{
  "summary": "two to four sentences describing what the data appears to contain",
  "grain": "one sentence describing what one row represents, or that it is unverified",
  "columnRoles": [{"name": "exact column name", "role": "metric|dimension|time|identifier|text|ignore", "description": "short, evidence-based description"}],
  "metric": "exact numeric column name or null",
  "dimension": "exact categorical column name or null",
  "timeColumn": "exact date column name or null",
  "questions": ["three to five answerable questions"],
  "analyses": ["quality", "ranking", "trend", "distribution", "correlation", "outlier", "forecast"],
  "preparation": [{"kind": "drop_duplicates|drop_nulls|trim|fill_mean", "column": "exact column name when required", "reason": "why the profile justifies it"}],
  "caveats": ["short limits or uncertainties"]
}`

function normaliseRoles(
  raw: unknown,
  detail: AnalyticsDatasetDetail,
  fallback: AnalyticsAiPlan,
): AnalyticsAiColumnUnderstanding[] {
  const byName = new Map(detail.columns.map((column) => [column.name, column]))
  const fallbackByName = new Map(fallback.columnRoles.map((entry) => [entry.name, entry]))
  const seen = new Set<string>()
  const result: AnalyticsAiColumnUnderstanding[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const entry = item as Record<string, unknown>
      const name = text(entry.name, 200)
      const column = byName.get(name)
      if (!column || seen.has(name)) continue
      const requested = text(entry.role, 40) as AnalyticsAiColumnRole
      const role = SUPPORTED_ROLES.includes(requested) ? requested : heuristicRole(column)
      const compatible =
        (role === 'metric' &&
          numeric(column) &&
          !isIdentifierColumn(column) &&
          !isTimePartColumn(column)) ||
        (role === 'time' && column.type === 'date') ||
        (role === 'dimension' &&
          column.type !== 'date' &&
          !isIdentifierColumn(column) &&
          !isTimePartColumn(column)) ||
        (role === 'text' && column.type === 'text') ||
        role === 'identifier' ||
        role === 'ignore'
      const safeRole = compatible ? role : heuristicRole(column)
      const description = text(entry.description, 220) || columnDescription(column, safeRole)
      result.push({ name, role: safeRole, description })
      seen.add(name)
    }
  }
  for (const column of detail.columns) {
    if (seen.has(column.name)) continue
    const local = fallbackByName.get(column.name)
    result.push(
      local ?? {
        name: column.name,
        role: heuristicRole(column),
        description: columnDescription(column, heuristicRole(column)),
      },
    )
  }
  return result
}

function normalisePreparation(
  raw: unknown,
  detail: AnalyticsDatasetDetail,
  fallback: AnalyticsAiPreparation[],
): AnalyticsAiPreparation[] {
  if (!Array.isArray(raw)) return fallback
  const columns = new Map(detail.columns.map((column) => [column.name, column]))
  const result: AnalyticsAiPreparation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const kind = text(entry.kind, 40) as AnalyticsAiPreparation['kind']
    if (!SUPPORTED_PREPARATION.includes(kind)) continue
    const columnName = text(entry.column, 200)
    if (kind !== 'drop_duplicates') {
      const column = columns.get(columnName)
      if (!column) continue
      if (kind === 'fill_mean' && !numeric(column)) continue
      if (kind === 'trim' && column.type !== 'text' && column.type !== 'date') continue
    }
    const reason = text(entry.reason, 240)
    if (!reason) continue
    const key = `${kind}:${columnName}`
    if (result.some((step) => `${step.kind}:${step.column ?? ''}` === key)) continue
    result.push({
      kind,
      ...(kind === 'drop_duplicates' ? {} : { column: columnName }),
      reason,
    })
    if (result.length >= 5) break
  }
  return result
}

/**
 * Validate a model plan against the real schema. Invalid column choices fall
 * back to the deterministic local plan rather than reaching the analysis
 * engine unchecked.
 */
export function parseAiPlan(
  raw: string,
  detail: AnalyticsDatasetDetail,
  model = 'default',
): AnalyticsAiPlan {
  const record = parseJsonObject(raw)
  const fallback = buildLocalPlan(detail)
  const summary = text(record.summary, 600)
  const grain = text(record.grain, 300)
  if (!summary || !grain) {
    throw new Error('The AI understanding did not include a summary and grain.')
  }

  const columns = new Map(detail.columns.map((column) => [column.name, column]))
  const requestedMetric = text(record.metric, 200)
  const requestedDimension = text(record.dimension, 200)
  const requestedTime = text(record.timeColumn, 200)
  const hasMetric = Object.prototype.hasOwnProperty.call(record, 'metric')
  const hasDimension = Object.prototype.hasOwnProperty.call(record, 'dimension')
  const hasTime = Object.prototype.hasOwnProperty.call(record, 'timeColumn')

  const metricColumn = columns.get(requestedMetric)
  const metric = hasMetric
    ? requestedMetric
      ? isUsableMetric(metricColumn)
        ? metricColumn!.name
        : fallback.metric
      : null
    : fallback.metric

  const timeColumn = hasTime
    ? requestedTime
      ? isUsableTime(columns.get(requestedTime))
        ? requestedTime
        : fallback.timeColumn
      : null
    : fallback.timeColumn

  const dimensionColumn = columns.get(requestedDimension)
  const metricProfile = metric ? columns.get(metric) : undefined
  const timeProfile = timeColumn ? columns.get(timeColumn) : undefined
  const dimension = hasDimension
    ? requestedDimension
      ? isUsableDimension(dimensionColumn, metricProfile, timeProfile)
        ? dimensionColumn!.name
        : fallback.dimension
      : null
    : fallback.dimension

  const questions = stringList(record.questions, 5, 240)
  const requestedAnalyses = Array.isArray(record.analyses)
    ? (record.analyses
        .map((item) => text(item, 40) as AnalyticsAutoInsightKind)
        .filter((kind) => SUPPORTED_ANALYSES.includes(kind)) as AnalyticsAutoInsightKind[])
    : []
  const analyses = [...new Set(requestedAnalyses)]
  if (!analyses.includes('quality')) analyses.unshift('quality')

  const caveats = stringList(record.caveats, 5, 240)
  const standardCaveat =
    'Column meanings are inferred from names, types and sample values; verify business definitions with the data owner.'
  if (!caveats.includes(standardCaveat)) caveats.push(standardCaveat)

  return {
    summary,
    grain,
    columnRoles: normaliseRoles(record.columnRoles, detail, fallback),
    metric,
    dimension,
    timeColumn,
    questions: questions.length > 0 ? questions : fallback.questions,
    analyses: requestedAnalyses.length > 0 ? analyses : fallback.analyses,
    preparation: normalisePreparation(record.preparation, detail, fallback.preparation),
    caveats: caveats.slice(0, 5),
    source: 'ai',
    model,
    verified: true,
    note: `Generated by ${model} from the schema, profile and six sample rows. Column choices were validated against the imported data; descriptions are hypotheses, not verified business definitions.`,
  }
}

/**
 * Ask the configured model to understand the dataset. A local heuristic plan
 * is always returned when no model is available or the model fails, so the
 * workspace can show an honest reading without blocking automation.
 */
export async function planDatasetWithAi(
  detail: AnalyticsDatasetDetail,
  deps: PlanDeps,
): Promise<AnalyticsAiPlanResult> {
  const local = buildLocalPlan(detail)
  if (detail.columns.length === 0) {
    return { ok: true, plan: local }
  }
  const config = resolveAnalyticsAiConfig(deps.settingsPath)
  if (!config.ok) {
    deps.audit('dataset-understanding-local', {
      datasetId: detail.id,
      reason: config.error,
    })
    return {
      ok: true,
      plan: {
        ...local,
        note: `Local reading: ${config.error}`,
      },
    }
  }
  try {
    const response = await withTimeout(
      chatForProvider(
        config.provider,
        config.config,
        SYSTEM_PROMPT,
        `Read this dataset and return the JSON plan.\n\n${buildPlanContext(detail)}`,
      ),
      MAX_PLAN_MS,
    )
    if (!response.ok || !response.content) {
      throw new Error(response.error ?? 'The AI provider returned no understanding.')
    }
    const plan = parseAiPlan(response.content, detail, config.model)
    deps.audit('dataset-understanding', {
      datasetId: detail.id,
      source: 'ai',
      model: config.model,
      metric: plan.metric,
      dimension: plan.dimension,
      timeColumn: plan.timeColumn,
      analyses: plan.analyses,
    })
    return { ok: true, plan }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    deps.audit('dataset-understanding-fallback', {
      datasetId: detail.id,
      error: message.slice(0, 500),
    })
    return {
      ok: true,
      plan: {
        ...local,
        note: `AI understanding unavailable: ${message} A local heuristic reading was used instead.`,
      },
    }
  }
}
