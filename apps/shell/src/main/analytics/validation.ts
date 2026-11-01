import type {
  AnalyticsChartSpec,
  AnalyticsCleanOperation,
} from '../../shared/analytics-api'

const CHART_TYPES = new Set(['bar', 'line', 'area', 'pie', 'donut', 'scatter'])
const AGGREGATIONS = new Set(['sum', 'avg', 'min', 'max', 'count'])
const CLEAN_KINDS = new Set(['drop_duplicates', 'drop_nulls', 'trim', 'fill_mean', 'fill_value'])

function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || text.length > maxLength || text.includes('\u0000')) return null
  return text
}

export function normalizeChartSpec(input: unknown): AnalyticsChartSpec | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  const type = record.type
  const x = safeText(record.x, 300)
  const y = safeText(record.y, 300)
  const aggregation = record.aggregation
  if (
    typeof type !== 'string' ||
    !CHART_TYPES.has(type) ||
    !x ||
    !y ||
    typeof aggregation !== 'string' ||
    !AGGREGATIONS.has(aggregation)
  ) {
    return null
  }
  return {
    type: type as AnalyticsChartSpec['type'],
    x,
    y,
    aggregation: aggregation as AnalyticsChartSpec['aggregation'],
  }
}

/**
 * Validate a cleaning request coming over IPC. The database column is checked
 * against the live schema later; this only proves the request has the shape
 * the rest of the pipeline expects.
 */
export function normalizeCleanOperation(input: unknown): AnalyticsCleanOperation | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  const kind = record.kind
  if (typeof kind !== 'string' || !CLEAN_KINDS.has(kind)) return null
  if (kind === 'drop_duplicates') return { kind }
  const column = safeText(record.column, 200)
  if (!column) return null
  if (kind === 'fill_value') {
    if (typeof record.value !== 'string' || record.value.length > 2000 || record.value.includes('\u0000')) {
      return null
    }
    return { kind, column, value: record.value }
  }
  return { kind: kind as 'drop_nulls' | 'trim' | 'fill_mean', column }
}
