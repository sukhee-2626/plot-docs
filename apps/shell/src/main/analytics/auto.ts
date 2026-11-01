import type {
  AnalyticsAiPlan,
  AnalyticsAutoAnalysis,
  AnalyticsAutoInsight,
  AnalyticsAutoInsightKind,
  AnalyticsChartSpec,
  AnalyticsColumnProfile,
  AnalyticsCleanOperation,
  AnalyticsDatasetDetail,
  AnalyticsInterpretation,
  AnalyticsQueryResult,
  AnalyticsSavedView,
} from '../../shared/analytics-api'
import { linearForecast } from './forecast'
import { quoteIdent } from './sql'

export interface AutoAnalysisDeps {
  getDataset(id: string): AnalyticsDatasetDetail
  runQuery(id: string, sql: string, limit?: number): AnalyticsQueryResult
  listViews(datasetId: string): AnalyticsSavedView[]
  saveView(input: {
    id?: string
    datasetId: string
    name: string
    sql: string
    chart?: AnalyticsChartSpec | null
    insightKind?: AnalyticsSavedView['insightKind']
    takeaway?: string
    meaning?: string
    method?: string
    detail?: string
    confidence?: AnalyticsSavedView['confidence']
  }): AnalyticsSavedView
  deleteView?(id: string): boolean
  clean(
    id: string,
    operation: AnalyticsCleanOperation,
  ): Promise<{ ok: boolean; message?: string; error?: string }>
  audit(action: string, detail: unknown): void
}

const ID_LIKE =
  /(^|_)(id|uuid|guid|key|code|number|no)$|^(id|uuid|guid|key|code)($|_)|uuid|guid/i
// Contact details, links and addresses identify a row; they are not business
// segments. Ranking them produces a chart that is technically correct but
// operationally meaningless ("Top Phone by records"), so they are excluded
// from automatic dimension and metric selection.
const IDENTIFIER_HINT =
  /phone|mobile|telephone|email|e-mail|url|website|address|street|postal|zip|fax|uuid|guid|ssn|account.?number|card.?number|ip.?address/i
// A year, month number or quarter is a time coordinate, not a measure. Summing
// it produces a meaningless "total year", so it is never chosen as a metric.
const TIME_PART_HINT =
  /^(?:(?:fiscal|calendar)_?)?(?:year|yr|month|quarter|week|day|period)$|(?:^|_)(?:year|yr|month|quarter|week|day)$/i
const METRIC_HINT =
  /revenue|sales|amount|total|price|cost|profit|margin|qty|quantity|units|count|score|rate|value|spend|visits|users|orders/i
const AUTO_PREFIX = 'Auto · '
const MAX_INSIGHTS = 8

function q(value: string): string {
  return quoteIdent(value)
}

function numeric(column: AnalyticsColumnProfile): boolean {
  return column.type === 'integer' || column.type === 'real'
}

export function isIdentifierColumn(column: AnalyticsColumnProfile): boolean {
  return ID_LIKE.test(column.name) || IDENTIFIER_HINT.test(column.name)
}

export function isTimePartColumn(column: AnalyticsColumnProfile): boolean {
  return TIME_PART_HINT.test(column.name)
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function tidy(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(Number(value.toFixed(3)))
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export interface Picks {
  metric: AnalyticsColumnProfile | null
  secondaryMetric: AnalyticsColumnProfile | null
  dimension: AnalyticsColumnProfile | null
  time: AnalyticsColumnProfile | null
}

function isPlanDimension(
  column: AnalyticsColumnProfile | undefined,
  metric?: AnalyticsColumnProfile | null,
  time?: AnalyticsColumnProfile | null,
): boolean {
  if (!column || column.name === metric?.name || column.name === time?.name) return false
  if (column.type === 'date' || isIdentifierColumn(column)) return false
  return column.distinctCount > 1 && column.distinctCount <= 500
}

/**
 * Pick the columns used by the deterministic engine.
 *
 * When an AI (or local) plan is supplied, its validated choices take
 * precedence. Invalid or missing choices fall back to the same heuristics
 * used without a plan, so analysis never depends on an unvalidated column.
 */
export function pickColumns(
  detail: AnalyticsDatasetDetail,
  plan?: AnalyticsAiPlan | null,
): Picks {
  const byName = new Map(detail.columns.map((column) => [column.name, column]))
  const numerics = detail.columns.filter(numeric)
  const usableMetrics = numerics.filter(
    (column) => !isIdentifierColumn(column) && !isTimePartColumn(column),
  )
  const hinted = usableMetrics.find((column) => METRIC_HINT.test(column.name))
  const heuristicMetric =
    hinted ??
    usableMetrics[0] ??
    numerics.find((column) => !isIdentifierColumn(column) && !isTimePartColumn(column)) ??
    null

  const planMetric = plan?.metric ? byName.get(plan.metric) : undefined
  const metric = plan
    ? planMetric && numeric(planMetric) && !isIdentifierColumn(planMetric)
      ? planMetric
      : null
    : heuristicMetric

  const secondaryMetric =
    numerics.find(
      (column) =>
        column.name !== metric?.name &&
        !isIdentifierColumn(column) &&
        !isTimePartColumn(column) &&
        column.distinctCount > 1,
    ) ??
    numerics.find(
      (column) =>
        column.name !== metric?.name &&
        !isIdentifierColumn(column) &&
        !isTimePartColumn(column),
    ) ??
    null

  const heuristicTime =
    detail.columns.find(
      (column) => column.type === 'date' && column.name !== metric?.name,
    ) ??
    detail.columns.find((column) => column.type === 'date') ??
    null
  const planTime = plan?.timeColumn ? byName.get(plan.timeColumn) : undefined
  const time = plan
    ? planTime && planTime.type === 'date'
      ? planTime
      : null
    : heuristicTime

  const textGroups = detail.columns.filter(
    (column) =>
      column.type === 'text' &&
      !isIdentifierColumn(column) &&
      column.distinctCount > 1 &&
      column.distinctCount <= 200 &&
      column.name !== metric?.name &&
      column.name !== time?.name,
  )
  const heuristicDimension =
    textGroups.sort((a, b) => a.distinctCount - b.distinctCount)[0] ??
    detail.columns.find(
      (column) =>
        column.type === 'boolean' &&
        column.name !== metric?.name &&
        column.name !== time?.name,
    ) ??
    textGroups[0] ??
    null
  const planDimension = plan?.dimension ? byName.get(plan.dimension) : undefined
  const dimension = plan
    ? isPlanDimension(planDimension, metric, time)
      ? planDimension!
      : null
    : heuristicDimension

  return { metric, secondaryMetric, dimension, time }
}

function qualityInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  removedDuplicates: boolean,
): AnalyticsAutoInsight {
  const cells = Math.max(1, detail.rowCount * detail.columnCount)
  const missing = (detail.missingCells / cells) * 100
  const pieces = [
    `${detail.rowCount.toLocaleString()} rows × ${detail.columnCount.toLocaleString()} columns`,
    `${percent(missing)} missing cells`,
    `${detail.duplicateRows.toLocaleString()} duplicate rows`,
    `quality ${Math.round(detail.qualityScore)}/100`,
  ]
  const notes: string[] = []
  if (removedDuplicates) notes.push('duplicate rows were removed automatically')
  else if (detail.duplicateRows > 0) notes.push('duplicate rows remain; cleanup did not complete')
  if (missing > 5) notes.push('missingness is high enough to affect aggregates')
  if (picks.time) notes.push(`time axis: ${picks.time.name}`)
  let meaning: string
  if (missing > 20) {
    meaning = `${percent(missing)} of cells are missing, so totals and averages may understate the real picture. Treat the quality score as a warning to inspect coverage before using these results for a decision.`
  } else if (missing > 5) {
    meaning = `${percent(missing)} of cells are missing. That is enough to move aggregates, so compare the affected columns before relying on totals.`
  } else if (removedDuplicates) {
    meaning = `Duplicate rows were removed before this run, so the calculations below count unique rows. The remaining profile is clean enough for descriptive analysis, but the quality score is a screening signal, not a correctness guarantee.`
  } else if (detail.duplicateRows > 0) {
    meaning = `Duplicate rows are still present and can double-count totals. The rankings and trend below use the current rows, so read them as a description of this copy rather than a deduplicated ledger.`
  } else {
    meaning = `No duplicate or missing-cell issue stands out. That makes the dataset usable for descriptive analysis, though the quality score does not prove the values are correct.`
  }
  return {
    id: 'quality',
    kind: 'quality',
    title: 'Data quality',
    detail: `${pieces.join(' · ')}.${notes.length ? ` ${notes.join('; ')}.` : ''}`,
    method: 'Profile-based quality score from missing cells and exact duplicate rows',
    takeaway: `Quality ${Math.round(detail.qualityScore)}/100 across ${detail.rowCount.toLocaleString()} rows`,
    meaning,
    confidence: 'high',
  }
}

function rankingInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const dimension = picks.dimension
  if (!dimension) return null
  const metric = picks.metric
  const aggregate = metric ? `SUM(${q(metric.name)})` : 'COUNT(*)'
  const sql = `WITH grouped AS (
  SELECT ${q(dimension.name)} AS "group", ${aggregate} AS "value"
  FROM data
  WHERE ${q(dimension.name)} IS NOT NULL
  GROUP BY 1
), ranked AS (
  SELECT "group", "value",
         SUM("value") OVER () AS "total",
         RANK() OVER (ORDER BY "value" DESC) AS "rank",
         COUNT(*) OVER () AS "groups"
  FROM grouped
)
SELECT "group", "value", "total", "rank", "groups"
FROM ranked
ORDER BY "rank" ASC
LIMIT 10`
  const result = deps.runQuery(detail.id, sql, 200)
  if (result.rows.length === 0) return null
  const top = result.rows[0]
  const topLabel = String(top?.[0] ?? '—')
  const topValue = numberOrNull(top?.[1])
  const total = numberOrNull(top?.[2]) ?? result.rows.reduce((sum, row) => sum + (numberOrNull(row[1]) ?? 0), 0)
  const groupCount = numberOrNull(top?.[4]) ?? result.rowCount
  const measure = metric ? `sum of ${metric.name}` : 'record count'
  const topShare = topValue !== null && total > 0 ? (topValue / total) * 100 : null
  const chart: AnalyticsChartSpec = {
    type: 'bar',
    x: 'group',
    y: 'value',
    aggregation: 'sum',
  }
  const shareText =
    topShare === null
      ? ''
      : ` It contributes ${percent(topShare)} of the ${measure} across all ${groupCount.toLocaleString()} groups.`
  return {
    id: 'ranking',
    kind: 'ranking',
    title: `Top ${dimension.name} by ${metric?.name ?? 'records'}`,
    detail: `Showing the top ${result.rows.length.toLocaleString()} of ${groupCount.toLocaleString()} ${dimension.name} ${groupCount === 1 ? 'group' : 'groups'} ranked by ${measure}. ${topLabel} ranks #1 with ${tidy(topValue ?? 0)}.${shareText}`,
    method: 'SQL GROUP BY with a windowed total, RANK and full group count',
    takeaway: `${topLabel} ranks #1 of ${groupCount.toLocaleString()} ${dimension.name} groups by ${metric?.name ?? 'record count'}`,
    meaning: `${topLabel} is the largest ${dimension.name} group by ${measure}.${shareText} This is a concentration reading: a SUM can be dominated by a few large rows, so inspect the underlying records before treating the leader as the best-performing group.`,
    confidence: groupCount <= 60 ? 'high' : 'medium',
    sql,
    result,
    chart,
    filterColumn: dimension.name,
  }
}

function trendInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const time = picks.time
  if (!time) return null
  const metric = picks.metric
  const aggregate = metric ? `SUM(${q(metric.name)})` : 'COUNT(*)'
  const alias = metric ? 'value' : 'rows'
  const sql = `SELECT ${q(time.name)} AS "period", ${aggregate} AS "${alias}"
FROM data
WHERE ${q(time.name)} IS NOT NULL
GROUP BY 1
ORDER BY 1 ASC
LIMIT 120`
  const result = deps.runQuery(detail.id, sql, 300)
  if (result.rows.length < 2) return null
  const first = numberOrNull(result.rows[0]?.[1])
  const last = numberOrNull(result.rows[result.rows.length - 1]?.[1])
  const change =
    first !== null && last !== null && first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null
  const changeText =
    change === null ? 'change could not be calculated' : `${change >= 0 ? '+' : ''}${percent(change)} from first to last period`
  const chart: AnalyticsChartSpec = {
    type: 'line',
    x: 'period',
    y: alias,
    aggregation: 'sum',
  }
  const metricName = metric?.name ?? 'Records'
  return {
    id: 'trend',
    kind: 'trend',
    title: `${metricName} over ${time.name}`,
    detail: `${result.rowCount.toLocaleString()} periods, ${changeText}. Points are simple period totals, not seasonally adjusted.`,
    method: 'SQL period aggregation with first-to-last change',
    takeaway:
      change === null
        ? `${metricName} over ${time.name}`
        : `${metricName} ${change >= 0 ? 'rose' : 'fell'} ${percent(Math.abs(change))} from the first to the last ${time.name} period`,
    meaning:
      change === null
        ? `The first and last period totals could not be compared because a value was zero or missing. The chart still describes the observed periods, but it is not enough to establish a trend.`
        : `The end-to-end change is ${changeText}. That compares only the first and last period; it does not prove a steady trend or seasonality. Check the chart for a level shift or a few volatile periods before extrapolating.`,
    confidence: result.rowCount >= 6 ? 'medium' : 'low',
    sql,
    result,
    chart,
  }
}

function distributionInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const metric = picks.metric
  if (!metric) return null
  const min = numberOrNull(metric.min)
  const max = numberOrNull(metric.max)
  if (min === null || max === null || min === max) return null
  const width = (max - min) / 6
  const bounds = Array.from({ length: 5 }, (_, index) => min + width * (index + 1))
  const labels = [
    `${tidy(min)} – ${tidy(bounds[0] ?? max)}`,
    `${tidy(bounds[0] ?? min)} – ${tidy(bounds[1] ?? max)}`,
    `${tidy(bounds[1] ?? min)} – ${tidy(bounds[2] ?? max)}`,
    `${tidy(bounds[2] ?? min)} – ${tidy(bounds[3] ?? max)}`,
    `${tidy(bounds[3] ?? min)} – ${tidy(bounds[4] ?? max)}`,
    `${tidy(bounds[4] ?? min)} – ${tidy(max)}`,
  ]
  const cases = bounds
    .map((bound, index) => `WHEN ${q(metric.name)} < ${bound} THEN ${quoteLiteral(labels[index] ?? '')}`)
    .join('\n  ')
  const sql = `SELECT CASE
  ${cases}
  ELSE ${quoteLiteral(labels[5] ?? '')}
END AS "range", COUNT(*) AS "rows", MIN(${q(metric.name)}) AS "sort"
FROM data
WHERE ${q(metric.name)} IS NOT NULL
GROUP BY 1
ORDER BY "sort" ASC`
  const result = deps.runQuery(detail.id, sql, 200)
  if (result.rows.length === 0) return null
  const total = result.rows.reduce((sum, row) => sum + (numberOrNull(row[1]) ?? 0), 0)
  const widest = result.rows.reduce(
    (best, row) => ((numberOrNull(row[1]) ?? 0) > (numberOrNull(best[1]) ?? 0) ? row : best),
    result.rows[0]!,
  )
  const widestLabel = String(widest[0] ?? '—')
  const widestCount = numberOrNull(widest[1]) ?? 0
  const widestShare = total > 0 ? (widestCount / total) * 100 : 0
  const chart: AnalyticsChartSpec = {
    type: 'bar',
    x: 'range',
    y: 'rows',
    aggregation: 'sum',
  }
  return {
    id: 'distribution',
    kind: 'distribution',
    title: `Distribution of ${metric.name}`,
    detail: `${total.toLocaleString()} non-null values in six equal-width ranges. The busiest range is ${widestLabel} with ${tidy(widestCount)} rows.`,
    method: 'Six equal-width SQL histogram buckets',
    takeaway: `Most ${metric.name} values sit in ${widestLabel}`,
    meaning: `${percent(widestShare)} of non-null ${metric.name} values fall in ${widestLabel}. That tells you where typical values cluster; an average alone would hide the concentration. Check the tails when the decision depends on extreme values.`,
    confidence: metric.nullCount === 0 ? 'high' : 'medium',
    sql,
    result,
    chart,
  }
}

export function pearson(rows: { x: number; y: number }[]): number | null {
  if (rows.length < 3) return null
  const n = rows.length
  const meanX = rows.reduce((sum, row) => sum + row.x, 0) / n
  const meanY = rows.reduce((sum, row) => sum + row.y, 0) / n
  let numerator = 0
  let sumX = 0
  let sumY = 0
  for (const row of rows) {
    const dx = row.x - meanX
    const dy = row.y - meanY
    numerator += dx * dy
    sumX += dx * dx
    sumY += dy * dy
  }
  const denominator = Math.sqrt(sumX * sumY)
  return denominator === 0 ? null : numerator / denominator
}

function averageRanks(values: number[]): number[] {
  const ordered = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
  const ranks = new Array<number>(values.length)
  let start = 0
  while (start < ordered.length) {
    let end = start + 1
    while (end < ordered.length && ordered[end]!.value === ordered[start]!.value) end += 1
    // Average the 1-based positions occupied by a tie group.
    const rank = (start + 1 + end) / 2
    for (let index = start; index < end; index += 1) {
      ranks[ordered[index]!.index] = rank
    }
    start = end
  }
  return ranks
}

export function spearman(rows: { x: number; y: number }[]): number | null {
  if (rows.length < 3) return null
  const xRanks = averageRanks(rows.map((row) => row.x))
  const yRanks = averageRanks(rows.map((row) => row.y))
  return pearson(xRanks.map((x, index) => ({ x, y: yRanks[index]! })))
}

function correlationInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const x = picks.metric
  const y = picks.secondaryMetric
  if (!x || !y || x.name === y.name) return null
  const sql = `SELECT CAST(${q(x.name)} AS REAL) AS "x", CAST(${q(y.name)} AS REAL) AS "y"
FROM data
WHERE ${q(x.name)} IS NOT NULL AND ${q(y.name)} IS NOT NULL
LIMIT 5000`
  const result = deps.runQuery(detail.id, sql, 5000)
  const points = result.rows
    .map((row) => ({ x: numberOrNull(row[0]), y: numberOrNull(row[1]) }))
    .filter((row): row is { x: number; y: number } => row.x !== null && row.y !== null)
  const pearsonR = pearson(points)
  const spearmanR = spearman(points)
  if (pearsonR === null && spearmanR === null) return null
  // Prefer the rank correlation when the monotonic signal is clearly stronger
  // than the linear fit. This is more robust to outliers and curved monotonic
  // relationships, while Pearson remains the better choice for a linear signal.
  const useSpearman =
    spearmanR !== null &&
    (pearsonR === null || Math.abs(spearmanR) > Math.abs(pearsonR) + 0.1)
  const r = useSpearman ? spearmanR! : (pearsonR ?? spearmanR!)
  const method = useSpearman
    ? 'Spearman rank correlation, selected because the monotonic signal is stronger than the linear fit'
    : 'Pearson correlation, selected because the linear signal is at least as strong as the rank signal'
  const magnitude = Math.abs(r)
  const strength =
    magnitude >= 0.7 ? 'strong' : magnitude >= 0.4 ? 'moderate' : magnitude >= 0.2 ? 'weak' : 'very weak'
  const both =
    pearsonR === null || spearmanR === null
      ? ''
      : ` Pearson r = ${pearsonR.toFixed(3)}; Spearman ρ = ${spearmanR.toFixed(3)}.`
  return {
    id: 'correlation',
    kind: 'correlation',
    title: `${x.name} and ${y.name}`,
    detail: `${method}.${both} Across ${points.length.toLocaleString()} complete rows, the selected coefficient is ${r.toFixed(3)} (${strength} ${r >= 0 ? 'positive' : 'negative'} relationship). Correlation is not causation.`,
    method,
    takeaway: `${x.name} and ${y.name} show a ${strength} ${r >= 0 ? 'positive' : 'negative'} ${useSpearman ? 'monotonic' : 'linear'} relationship`,
    meaning: `Across ${points.length.toLocaleString()} complete rows, ${x.name} and ${y.name} move ${r >= 0 ? 'in the same direction' : 'in opposite directions'} with a selected coefficient of ${r.toFixed(3)}.${both} This is co-movement in this sample, not evidence that one causes the other; a hidden segment or time effect could drive both.`,
    confidence: points.length >= 30 ? 'high' : points.length >= 10 ? 'medium' : 'low',
    sql,
    result,
  }
}

function outlierInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const metric = picks.metric
  if (!metric) return null
  const sql = `SELECT CAST(${q(metric.name)} AS REAL) AS "value"
FROM data
WHERE ${q(metric.name)} IS NOT NULL
LIMIT 10000`
  const result = deps.runQuery(detail.id, sql, 10000)
  const values = result.rows
    .map((row) => numberOrNull(row[0]))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)
  if (values.length < 8) return null
  const quartile = (fraction: number) => {
    const index = (values.length - 1) * fraction
    const low = Math.floor(index)
    const high = Math.ceil(index)
    const weight = index - low
    return (values[low] ?? 0) * (1 - weight) + (values[high] ?? 0) * weight
  }
  const q1 = quartile(0.25)
  const q3 = quartile(0.75)
  const spread = q3 - q1
  const lowFence = q1 - spread * 1.5
  const highFence = q3 + spread * 1.5
  const low = values.filter((value) => value < lowFence).length
  const high = values.filter((value) => value > highFence).length
  const total = low + high
  const outlierShare = (total / values.length) * 100
  return {
    id: 'outliers',
    kind: 'outlier',
    title: `Outliers in ${metric.name}`,
    detail: `${total.toLocaleString()} of ${values.length.toLocaleString()} values (${percent(outlierShare)}) fall outside the 1.5×IQR fences [${tidy(lowFence)}, ${tidy(highFence)}]; ${low.toLocaleString()} low and ${high.toLocaleString()} high.`,
    method: '1.5×IQR outlier fences over up to 10,000 values',
    takeaway: `${percent(outlierShare)} of ${metric.name} values fall outside the typical range`,
    meaning: `The 1.5×IQR fences are ${tidy(lowFence)} to ${tidy(highFence)}. ${total.toLocaleString()} values fall outside them (${low.toLocaleString()} low, ${high.toLocaleString()} high). Review those rows before averaging: valid extremes may be the most important records, while entry errors will distort totals.`,
    confidence: values.length === detail.rowCount ? 'high' : 'medium',
    sql,
    result,
  }
}

function forecastInsight(
  detail: AnalyticsDatasetDetail,
  picks: Picks,
  deps: AutoAnalysisDeps,
): AnalyticsAutoInsight | null {
  const metric = picks.metric
  if (!metric) return null
  const time = picks.time
  const secondary = picks.secondaryMetric
  if (!time && (!secondary || secondary.name === metric.name)) return null

  const sql = time
    ? `WITH grouped AS (
  SELECT ${q(time.name)} AS "period", SUM(${q(metric.name)}) AS "y"
  FROM data
  WHERE ${q(time.name)} IS NOT NULL AND ${q(metric.name)} IS NOT NULL
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 120
), ordered AS (
  SELECT "period", "y" FROM grouped ORDER BY "period" ASC
), indexed AS (
  SELECT ROW_NUMBER() OVER (ORDER BY "period") - 1 AS "x", "y" FROM ordered
)
SELECT "x", "y" FROM indexed`
    : `SELECT CAST(${q(secondary!.name)} AS REAL) AS "x", CAST(${q(metric.name)} AS REAL) AS "y"
FROM data
WHERE ${q(secondary!.name)} IS NOT NULL AND ${q(metric.name)} IS NOT NULL
ORDER BY "x" ASC
LIMIT 10000`
  const result = deps.runQuery(detail.id, sql, 10000)
  const points = result.rows
    .map((row) => ({ x: numberOrNull(row[0]), y: numberOrNull(row[1]) }))
    .filter((row): row is { x: number; y: number } => row.x !== null && row.y !== null)
  if (points.length < 8) return null
  const fitted = linearForecast(points, 6, 200)
  if (!fitted.ok || fitted.r2 === undefined || fitted.slope === undefined) return null
  const next = fitted.forecast?.[fitted.forecast.length - 1]
  const xLabel = time ? `${time.name} period index` : secondary!.name
  const intervalText =
    next && next.lower !== undefined && next.upper !== undefined
      ? ` Approximate 95% prediction interval: ${tidy(next.lower)} to ${tidy(next.upper)}.`
      : ''
  const slopeCiText = fitted.slopeCi95
    ? ` Approximate 95% slope interval: ${tidy(fitted.slopeCi95[0])} to ${tidy(fitted.slopeCi95[1])} per ${xLabel}.`
    : ''
  return {
    id: 'forecast',
    kind: 'forecast',
    title: time ? `${metric.name} forecast over ${time.name}` : `${metric.name} against ${secondary!.name}`,
    detail: time
      ? `Ordinary least squares over ${points.length.toLocaleString()} ${time.name} periods: slope ${tidy(fitted.slope)} ${metric.name} per period, R² ${fitted.r2.toFixed(3)}${next ? `; six periods ahead extrapolates to ${tidy(next.y)} (period index ${tidy(next.x)})` : ''}.${intervalText} This is a linear scenario, not a causal forecast.`
      : `Ordinary least squares fit across ${points.length.toLocaleString()} rows: slope ${tidy(fitted.slope)} per ${xLabel}, R² ${fitted.r2.toFixed(3)}${next ? `, next extrapolated point (${tidy(next.x)}, ${tidy(next.y)})` : ''}.${intervalText} This is a linear scenario, not a causal forecast.`,
    method: fitted.method ?? 'Ordinary least squares linear fit with R²',
    takeaway: `${metric.name} trends ${fitted.slope >= 0 ? 'up' : 'down'} by ${tidy(fitted.slope)} per ${xLabel}`,
    meaning: `The line explains ${(fitted.r2 * 100).toFixed(1)}% of the variation in ${metric.name} (R² ${fitted.r2.toFixed(3)}).${next ? ` Six periods ahead extrapolates to ${tidy(next.y)}.` : ''}${intervalText}${slopeCiText} This is a linear scenario, not a causal forecast; values far outside the observed range are increasingly uncertain.`,
    confidence: fitted.r2 >= 0.5 ? 'medium' : 'low',
    sql,
    result,
  }
}

const READING_PRIORITY: AnalyticsAutoInsightKind[] = [
  'trend',
  'ranking',
  'correlation',
  'forecast',
  'distribution',
  'outlier',
  'quality',
]

const LOCAL_READING_NOTE = 'Generated locally from the same SQL and statistics; no model was used.'

/**
 * Build a deterministic plain-language reading from evidence that was already
 * calculated. It never adds a number that is not present in an insight.
 */
export function buildLocalInterpretation(
  analysis: Pick<AnalyticsAutoAnalysis, 'insights' | 'summary' | 'prepared' | 'methods' | 'plan'>,
  datasetName: string,
  options: { note?: string } = {},
): AnalyticsInterpretation {
  const insights = analysis.insights
  const ranked = READING_PRIORITY.flatMap((kind) => insights.filter((insight) => insight.kind === kind))
  const primary = ranked.find((insight) => insight.takeaway)
  const supporting = ranked
    .filter((insight) => insight.kind !== 'quality' && insight.takeaway)
    .slice(0, 3)
  const summary = analysis.summary
  const quality = insights.find((insight) => insight.kind === 'quality')

  const headline = (
    primary?.takeaway ??
    (summary
      ? `${datasetName}: ${summary.rowCount.toLocaleString()} rows, ${summary.columnCount} columns`
      : `${datasetName}: automated analysis`)
  ).slice(0, 180)

  const summarySentence = summary
    ? `Across ${summary.rowCount.toLocaleString()} rows and ${summary.columnCount} columns in ${datasetName}, the run produced ${insights.length} evidence-backed insight${insights.length === 1 ? '' : 's'}.`
    : ''
  const chosenSentence = analysis.plan
    ? `The run treated ${analysis.plan.metric ?? 'record count'} as the measure${analysis.plan.dimension ? ` and ${analysis.plan.dimension} as the main grouping` : ''}${analysis.plan.timeColumn ? `, with ${analysis.plan.timeColumn} as the time axis` : ''}.`
    : ''
  const signalSentence = supporting.length
    ? `The strongest signals are that ${supporting
        .map((insight) => (insight.takeaway ?? '').replace(/[.!?]+$/, ''))
        .join('; ')}.`
    : ''
  const closing =
    'These are descriptive readings of the imported copy, not causal explanations. Use the evidence cards and their confidence labels before acting.'
  const meaning = [chosenSentence, summarySentence, signalSentence, quality?.meaning, closing]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1600)

  const actions: string[] = []
  const addAction = (value: string) => {
    if (actions.length < 4 && !actions.includes(value)) actions.push(value)
  }
  const ranking = insights.find((insight) => insight.kind === 'ranking')
  if (ranking) {
    addAction(
      `Inspect the rows behind "${ranking.title}" to confirm the leader is not driven by a few large records.`,
    )
  }
  const trend = insights.find((insight) => insight.kind === 'trend')
  if (trend) {
    addAction(
      `Check "${trend.title}" for seasonality or a level change before treating the first-to-last change as a trend.`,
    )
  }
  const correlation = insights.find((insight) => insight.kind === 'correlation')
  if (correlation) {
    addAction(
      `Test the ${correlation.title} relationship within segments before assuming one measure drives the other.`,
    )
  }
  const outliers = insights.find((insight) => insight.kind === 'outlier')
  if (outliers) {
    addAction(`Review the values behind "${outliers.title}" to separate valid extremes from entry errors.`)
  }
  const forecast = insights.find((insight) => insight.kind === 'forecast')
  if (forecast) {
    addAction(`Treat "${forecast.title}" as a scenario and compare it with the most recent observed periods.`)
  }
  if (quality && summary && (summary.missingCells > 0 || summary.duplicateRows > 0)) {
    addAction('Resolve the remaining missing cells or duplicates before using these totals for a decision.')
  }
  if (actions.length === 0) {
    addAction('Inspect the profile and run a focused query to establish a baseline before acting.')
  }

  const caveats: string[] = []
  const addCaveat = (value: string) => {
    if (caveats.length < 5 && !caveats.includes(value)) caveats.push(value)
  }
  addCaveat('This reading describes the imported copy, not the source system.')
  addCaveat('Correlation and linear trends do not establish causation.')
  if (!summary?.timeColumn) {
    addCaveat('No date column was available, so no time trend was calculated.')
  }
  if (!insights.some((insight) => insight.kind === 'correlation')) {
    addCaveat('Correlation was skipped because fewer than two usable numeric measures were available.')
  }
  if (!insights.some((insight) => insight.kind === 'forecast')) {
    addCaveat('A forecast was skipped because the dataset has no usable date or second numeric column.')
  }
  addCaveat('Aggregates are sensitive to missing values, duplicates and outliers.')

  return {
    headline,
    meaning,
    findings: insights.map((insight) => ({
      insightId: insight.id,
      meaning: insight.meaning ?? insight.detail,
    })),
    actions,
    caveats,
    source: 'local',
    basis: insights.map((insight) => insight.id),
    generatedAt: Date.now(),
    verified: true,
    note: options.note ?? LOCAL_READING_NOTE,
  }
}

function saveCard(
  detail: AnalyticsDatasetDetail,
  insight: AnalyticsAutoInsight,
  views: AnalyticsSavedView[],
  deps: AutoAnalysisDeps,
  saved: AnalyticsSavedView[],
): void {
  if (!insight.sql || !insight.result) return
  const name = `${AUTO_PREFIX}${insight.title}`.slice(0, 120)
  const existing = views.find((view) => view.name === name)
  const view = deps.saveView({
    ...(existing ? { id: existing.id } : {}),
    datasetId: detail.id,
    name,
    sql: insight.sql,
    chart: insight.chart ?? null,
    insightKind: insight.kind,
    ...(insight.filterColumn ? { filterColumn: insight.filterColumn } : {}),
    takeaway: insight.takeaway,
    meaning: insight.meaning,
    method: insight.method,
    detail: insight.detail,
    confidence: insight.confidence,
  })
  saved.push(view)
}

/**
 * Deterministic, local-first analysis pipeline.
 *
 * Every number comes from a read-only SQLite query or a documented JavaScript
 * statistic. The engine never invents values and never calls a model.
 */
export async function runAutoAnalysis(
  datasetId: string,
  deps: AutoAnalysisDeps,
  options: { prepare?: boolean; plan?: AnalyticsAiPlan | null } = {},
): Promise<AnalyticsAutoAnalysis> {
  const started = Date.now()
  let detail = deps.getDataset(datasetId)
  const prepared: string[] = []

  if (options.prepare !== false && detail.duplicateRows > 0) {
    try {
      const cleaned = await deps.clean(detail.id, { kind: 'drop_duplicates' })
      if (cleaned.ok) {
        prepared.push(cleaned.message ?? 'Removed duplicate rows.')
        detail = deps.getDataset(datasetId)
      }
    } catch {
      // Automatic cleanup is a convenience; analysis still proceeds on the
      // original rows when the reversible step cannot be completed.
    }
  }

  const picks = pickColumns(detail, options.plan)
  const insights: AnalyticsAutoInsight[] = [
    qualityInsight(detail, picks, prepared.length > 0),
  ]
  const requested = options.plan?.analyses
  const builders: { name: string; run: () => AnalyticsAutoInsight | null }[] = [
    { name: 'trend', run: () => trendInsight(detail, picks, deps) },
    { name: 'ranking', run: () => rankingInsight(detail, picks, deps) },
    { name: 'distribution', run: () => distributionInsight(detail, picks, deps) },
    { name: 'correlation', run: () => correlationInsight(detail, picks, deps) },
    { name: 'outlier', run: () => outlierInsight(detail, picks, deps) },
    { name: 'forecast', run: () => forecastInsight(detail, picks, deps) },
  ].filter((builder) => !requested || requested.includes(builder.name as AnalyticsAutoInsightKind))
  for (const builder of builders) {
    if (insights.length >= MAX_INSIGHTS) break
    try {
      const insight = builder.run()
      if (insight) insights.push(insight)
    } catch (error) {
      deps.audit('auto-insight-failed', {
        datasetId,
        kind: builder.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const existingViews = deps.listViews(detail.id)
  const saved: AnalyticsSavedView[] = []
  for (const insight of insights) {
    if (insight.chart && insight.sql && insight.result) {
      try {
        saveCard(detail, insight, existingViews, deps, saved)
      } catch (error) {
        deps.audit('auto-card-failed', {
          datasetId,
          insight: insight.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  // Remove machine-generated cards that no longer correspond to a valid
  // insight (for example an old "Top Phone" card after identifiers became
  // excluded). Only cards created by this engine are touched; user-created
  // views are never candidates.
  if (deps.deleteView) {
    const liveIds = new Set(saved.map((view) => view.id))
    for (const view of existingViews) {
      if (view.name.startsWith(AUTO_PREFIX) && !liveIds.has(view.id)) {
        if (deps.deleteView(view.id)) {
          deps.audit('auto-card-removed', { datasetId: detail.id, viewId: view.id, name: view.name })
        }
      }
    }
  }

  const methods = [
    'SQLite GROUP BY with windowed total, RANK and full group count for rankings',
    'SQL period aggregation for trends and six equal-width histogram buckets',
    'Pearson and Spearman correlation over up to 5,000 complete pairs, selecting the stronger monotonic signal when it is materially higher',
    '1.5×IQR outlier fences over up to 10,000 values',
    'Ordinary least squares trend with R², slope confidence interval and approximate 95% prediction intervals',
    'Quality score from missing cells and duplicate rows',
  ]

  const summary = {
    rowCount: detail.rowCount,
    columnCount: detail.columnCount,
    qualityScore: detail.qualityScore,
    missingCells: detail.missingCells,
    duplicateRows: detail.duplicateRows,
    primaryMetric: picks.metric?.name ?? null,
    primaryDimension: picks.dimension?.name ?? null,
    timeColumn: picks.time?.name ?? null,
  }
  const interpretation = buildLocalInterpretation(
    { insights, summary, prepared, methods, plan: options.plan ?? undefined },
    detail.name,
  )

  deps.audit('auto-analysis', {
    datasetId,
    insights: insights.map((insight) => ({ id: insight.id, title: insight.title })),
    cards: saved.map((view) => view.name),
    prepared,
    reading: interpretation.source,
    plan: options.plan?.source ?? null,
    planMetric: picks.metric?.name ?? null,
    planDimension: picks.dimension?.name ?? null,
  })

  return {
    ok: true,
    datasetId: detail.id,
    datasetName: detail.name,
    summary,
    insights,
    plan: options.plan ?? undefined,
    interpretation,
    views: saved,
    prepared,
    methods,
    elapsedMs: Date.now() - started,
  }
}
