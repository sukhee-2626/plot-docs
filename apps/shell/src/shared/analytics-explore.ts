/**
 * Deterministic SQL builders for the Explore tools (pivot, funnel, cohort).
 *
 * These builders are shared by the renderer and tests. They never interpolate
 * a raw identifier: every column name is quoted, and every event label is
 * quoted as a string literal. The caller still validates names against the
 * live dataset schema before running the generated SQL.
 */

export type AnalyticsExploreAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count'

export interface AnalyticsPivotSpec {
  rows: string
  columns?: string | null
  metric?: string | null
  aggregation: AnalyticsExploreAggregation
  limit?: number
}

export interface AnalyticsFunnelSpec {
  user: string
  event: string
  time: string
  steps: readonly string[]
}

export interface AnalyticsCohortSpec {
  user: string
  date: string
  /** Number of monthly periods after period 0. */
  periods?: number
}

export const MAX_FUNNEL_STEPS = 8
export const MAX_COHORT_PERIODS = 36
export const DEFAULT_PIVOT_LIMIT = 1_000
export const MAX_PIVOT_LIMIT = 5_000

function columnName(value: unknown, label: string): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) throw new Error(`${label} is required.`)
  if (name.length > 200) throw new Error(`${label} is too long.`)
  if (name.includes('\u0000')) throw new Error(`${label} contains an invalid character.`)
  return name
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function aggregationExpression(
  aggregation: AnalyticsExploreAggregation,
  metric: string | null,
): string {
  if (aggregation === 'count') return metric ? `COUNT(${quoteIdent(metric)})` : 'COUNT(*)'
  if (!metric) throw new Error(`A metric column is required for ${aggregation}.`)
  const fn =
    aggregation === 'sum'
      ? 'SUM'
      : aggregation === 'avg'
        ? 'AVG'
        : aggregation === 'min'
          ? 'MIN'
          : 'MAX'
  return `${fn}(${quoteIdent(metric)})`
}

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_PIVOT_LIMIT
  return Math.max(1, Math.min(MAX_PIVOT_LIMIT, Math.trunc(value as number)))
}

/**
 * Build a two-axis pivot. The output is long-form:
 *   row, column, value  (when a column axis is supplied)
 *   row, value          (when it is not)
 * The renderer turns this into a matrix and adds totals; keeping the SQL
 * long-form means the exact result is also usable in SQL mode and exports.
 */
export function buildPivotSql(spec: AnalyticsPivotSpec): string {
  const rows = columnName(spec.rows, 'Pivot row')
  const columns = spec.columns ? columnName(spec.columns, 'Pivot column') : null
  if (columns && columns === rows) {
    throw new Error('Pivot row and pivot column must be different columns.')
  }
  const metric = spec.metric ? columnName(spec.metric, 'Metric') : null
  const value = aggregationExpression(spec.aggregation, metric)
  const limit = clampLimit(spec.limit)

  if (!columns) {
    return `SELECT ${quoteIdent(rows)} AS "row", ${value} AS "value"
FROM data
WHERE ${quoteIdent(rows)} IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC, 1 ASC
LIMIT ${limit}`
  }

  return `SELECT ${quoteIdent(rows)} AS "row", ${quoteIdent(columns)} AS "column", ${value} AS "value"
FROM data
WHERE ${quoteIdent(rows)} IS NOT NULL AND ${quoteIdent(columns)} IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 ASC, 2 ASC
LIMIT ${limit}`
}

/**
 * Build an ordered funnel. Each step is measured by the first time a user
 * performs that event; a later step only counts if it happened at or after the
 * previous step. This avoids counting a returning user's earlier event as
 * forward progress.
 */
export function buildFunnelSql(spec: AnalyticsFunnelSpec): string {
  const user = columnName(spec.user, 'User column')
  const event = columnName(spec.event, 'Event column')
  const time = columnName(spec.time, 'Time column')
  const steps = spec.steps
    .map((step) => (typeof step === 'string' ? step.trim() : ''))
    .filter((step) => step.length > 0)
  if (steps.length < 2) throw new Error('A funnel needs at least two steps.')
  if (steps.length > MAX_FUNNEL_STEPS) {
    throw new Error(`A funnel can have at most ${MAX_FUNNEL_STEPS} steps.`)
  }
  if (steps.some((step) => step.length > 200)) throw new Error('A funnel step is too long.')
  if (new Set(steps).size !== steps.length) throw new Error('Funnel steps must be unique.')

  const stepCtes = steps.map(
    (step, index) => `step_${index + 1} AS (
  SELECT ${quoteIdent(user)} AS "user_id", MIN(${quoteIdent(time)}) AS "at"
  FROM data
  WHERE ${quoteIdent(user)} IS NOT NULL
    AND ${quoteIdent(time)} IS NOT NULL
    AND ${quoteIdent(event)} = ${quoteLiteral(step)}
  GROUP BY 1
)`,
  )

  const selects = steps.map((step, index) => {
    if (index === 0) {
      return `  SELECT 1 AS "step", ${quoteLiteral(step)} AS "label", COUNT(*) AS "users"
  FROM step_1 AS s1`
    }
    const joins = Array.from({ length: index }, (_, joinIndex) => {
      const left = `s${joinIndex + 1}`
      const right = `s${joinIndex + 2}`
      return `  JOIN step_${joinIndex + 2} AS ${right}
    ON ${right}."user_id" = ${left}."user_id" AND ${right}."at" >= ${left}."at"`
    }).join('\n')
    return `  UNION ALL
  SELECT ${index + 1} AS "step", ${quoteLiteral(step)} AS "label", COUNT(*) AS "users"
  FROM step_1 AS s1
${joins}`
  })

  return `WITH
${stepCtes.join(',\n')},
funnel AS (
${selects.join('\n')}
)
SELECT "step", "label", "users"
FROM funnel
ORDER BY "step"`
}

/**
 * Build monthly cohort retention. A user's cohort is the month of their first
 * activity. Period 0 is that first month; each later period counts distinct
 * users active in that month. Dates must be ISO-like values supported by
 * SQLite's strftime (for example 2026-01-31 or 2026-01-31T10:00:00Z).
 */
export function buildCohortSql(spec: AnalyticsCohortSpec): string {
  const user = columnName(spec.user, 'User column')
  const date = columnName(spec.date, 'Date column')
  const periods = Number.isFinite(spec.periods)
    ? Math.max(0, Math.min(MAX_COHORT_PERIODS, Math.trunc(spec.periods as number)))
    : 12

  return `WITH first_seen AS (
  SELECT ${quoteIdent(user)} AS "user_id", MIN(${quoteIdent(date)}) AS "first_at"
  FROM data
  WHERE ${quoteIdent(user)} IS NOT NULL AND ${quoteIdent(date)} IS NOT NULL
  GROUP BY 1
),
activity AS (
  SELECT ${quoteIdent(user)} AS "user_id", ${quoteIdent(date)} AS "activity_at"
  FROM data
  WHERE ${quoteIdent(user)} IS NOT NULL AND ${quoteIdent(date)} IS NOT NULL
),
cohorts AS (
  SELECT "user_id" AS "user_id", strftime('%Y-%m', "first_at") AS "cohort"
  FROM first_seen
),
sizes AS (
  SELECT "cohort" AS "cohort", COUNT(*) AS "cohort_size"
  FROM cohorts
  WHERE "cohort" IS NOT NULL
  GROUP BY 1
),
periods AS (
  SELECT c."user_id" AS "user_id",
         c."cohort" AS "cohort",
         (CAST(strftime('%Y', a."activity_at") AS INTEGER) - CAST(strftime('%Y', f."first_at") AS INTEGER)) * 12
           + (CAST(strftime('%m', a."activity_at") AS INTEGER) - CAST(strftime('%m', f."first_at") AS INTEGER)) AS "period"
  FROM cohorts c
  JOIN first_seen f ON f."user_id" = c."user_id"
  JOIN activity a ON a."user_id" = c."user_id"
  WHERE c."cohort" IS NOT NULL AND a."activity_at" >= f."first_at"
)
SELECT p."cohort" AS "cohort",
       p."period" AS "period",
       COUNT(DISTINCT p."user_id") AS "users",
       s."cohort_size" AS "cohort_size"
FROM periods p
JOIN sizes s ON s."cohort" = p."cohort"
WHERE p."period" >= 0 AND p."period" <= ${periods}
GROUP BY 1, 2
ORDER BY 1, 2`
}

/** A compact matrix shape used by the pivot and cohort renderers. */
export interface AnalyticsMatrix {
  rows: string[]
  columns: string[]
  values: (number | null)[][]
}

/** Convert long-form pivot/cohort rows into a stable matrix. */
export function toMatrix(
  rows: readonly (readonly (string | number | null)[])[],
  rowIndex: number,
  columnIndex: number,
  valueIndex: number,
): AnalyticsMatrix {
  const rowLabels: string[] = []
  const columnLabels: string[] = []
  const rowSet = new Set<string>()
  const columnSet = new Set<string>()
  for (const row of rows) {
    const rowLabel = row[rowIndex]
    const columnLabel = row[columnIndex]
    if (rowLabel !== null && rowLabel !== undefined && !rowSet.has(String(rowLabel))) {
      rowSet.add(String(rowLabel))
      rowLabels.push(String(rowLabel))
    }
    if (columnLabel !== null && columnLabel !== undefined && !columnSet.has(String(columnLabel))) {
      columnSet.add(String(columnLabel))
      columnLabels.push(String(columnLabel))
    }
  }
  rowLabels.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  columnLabels.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const rowPosition = new Map(rowLabels.map((label, index) => [label, index]))
  const columnPosition = new Map(columnLabels.map((label, index) => [label, index]))
  const values: (number | null)[][] = rowLabels.map(() => columnLabels.map(() => null))
  for (const row of rows) {
    const rowLabel = row[rowIndex]
    const columnLabel = row[columnIndex]
    if (rowLabel === null || rowLabel === undefined) continue
    if (columnLabel === null || columnLabel === undefined) continue
    const y = rowPosition.get(String(rowLabel))
    const x = columnPosition.get(String(columnLabel))
    if (y === undefined || x === undefined) continue
    const raw = row[valueIndex]
    values[y]![x] = typeof raw === 'number' && Number.isFinite(raw) ? raw : raw === null ? null : Number(raw)
  }
  return { rows: rowLabels, columns: columnLabels, values }
}
