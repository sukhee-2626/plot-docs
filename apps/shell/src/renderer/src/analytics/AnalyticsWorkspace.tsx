import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, ReactNode } from 'react'
import type {
  AnalyticsAiPlan,
  AnalyticsApi,
  AnalyticsAskResult,
  AnalyticsAuditEvent,
  AnalyticsAutoAnalysis,
  AnalyticsAutoInsight,
  AnalyticsChartSpec,
  AnalyticsCleanOperation,
  AnalyticsColumnProfile,
  AnalyticsDataset,
  AnalyticsDatasetDetail,
  AnalyticsAppendMode,
  AnalyticsAppendResult,
  AnalyticsForecastResult,
  AnalyticsInterpretation,
  AnalyticsJoinResult,
  AnalyticsJoinType,
  AnalyticsPythonResult,
  AnalyticsQueryResult,
  AnalyticsSavedView,
  AnalyticsWorkflow,
  AnalyticsWorkflowFrequency,
  AnalyticsWorkflowRun,
  AnalyticsWorkflowSchedule,
  AnalyticsWorkflowVersion,
} from '../../../shared/analytics-api'
import {
  applyDashboardFilter,
  dashboardFilterLabel,
  type AnalyticsDashboardFilter,
} from '../../../shared/analytics-filter'
import {
  buildCohortSql,
  buildFunnelSql,
  buildPivotSql,
  toMatrix,
  type AnalyticsExploreAggregation,
} from '../../../shared/analytics-explore'
import { AnalyticsChart } from './AnalyticsChart'
import { AnalyticsAssistant } from './AnalyticsAssistant'
import './analytics.css'

declare global {
  interface Window {
    plotdocsAnalytics?: AnalyticsApi
  }
}

type TabId =
  | 'overview'
  | 'data'
  | 'prepare'
  | 'analyze'
  | 'dashboards'
  | 'ai'
  | 'ml'
  | 'automate'
  | 'governance'

const TABS: { id: TabId; label: string; caption: string }[] = [
  { id: 'overview', label: 'Overview', caption: 'Workspace' },
  { id: 'data', label: 'Data', caption: 'Sources & profile' },
  { id: 'prepare', label: 'Prepare', caption: 'Clean & repair' },
  { id: 'analyze', label: 'Analyze', caption: 'SQL, pivot, funnel, cohort, joins & append' },
  { id: 'dashboards', label: 'Dashboards', caption: 'Saved views' },
  { id: 'ai', label: 'AI Analyst', caption: 'Evidence first' },
  { id: 'ml', label: 'ML Lab', caption: 'Trend forecast' },
  { id: 'automate', label: 'Automate', caption: 'Pipeline' },
  { id: 'governance', label: 'Governance', caption: 'Audit & privacy' },
]

// The slicer needs a distinct "all values" sentinel so an actual empty-string
// category can still be selected as a filter.
const ALL_SLICER_VALUES = '__all_values__'

const MODULES: { id: TabId; title: string; body: string; status: 'live' | 'preview' | 'next' }[] = [
  {
    id: 'data',
    title: 'Data ingestion',
    body: 'Files, public links, HTML tables and SQLite, PostgreSQL or MySQL connections, with type inference and preview.',
    status: 'live',
  },
  {
    id: 'data',
    title: 'Data quality',
    body: 'Missing cells, duplicate rows, distinct counts and a transparent quality score.',
    status: 'live',
  },
  {
    id: 'prepare',
    title: 'Prepare',
    body: 'Remove duplicates, drop nulls, trim text and fill missing values with an undo step.',
    status: 'live',
  },
  {
    id: 'analyze',
    title: 'SQL analytics',
    body: 'Read-only SQLite queries, cross-dataset joins and appends, result tables, CSV export and chart building.',
    status: 'live',
  },
  {
    id: 'analyze',
    title: 'Python analytics',
    body: 'Safe, app-generated Python aggregation with a 20 second timeout.',
    status: 'preview',
  },
  {
    id: 'ai',
    title: 'AI analyst',
    body: 'Plot AI plans with a connected model and always executes locally; the deterministic engine finishes the job without one.',
    status: 'live',
  },
  {
    id: 'ml',
    title: 'ML lab',
    body: 'Ordinary least squares trend preview with R², slope and six future points.',
    status: 'preview',
  },
  {
    id: 'dashboards',
    title: 'Dashboards',
    body: 'Auto-generated live cards with saved SQL, rankings, trends, distributions and evidence.',
    status: 'live',
  },
  {
    id: 'automate',
    title: 'Full automation',
    body: 'One run imports, prepares, profiles, ranks, trends, correlates, finds outliers, forecasts and publishes.',
    status: 'live',
  },
  {
    id: 'governance',
    title: 'Governance',
    body: 'Local audit trail, source transparency and dataset deletion.',
    status: 'live',
  },
]

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'number') return formatNumber(value)
  return String(value)
}

function qualityClass(score: number): string {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warn'
  return 'bad'
}

function TabIcon({ id }: { id: TabId }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (id === 'overview') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  if (id === 'data') {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
        <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
        <path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
      </svg>
    )
  }
  if (id === 'prepare') {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h10M4 17h7" />
        <path d="m17 14 2 2 3-3" />
      </svg>
    )
  }
  if (id === 'analyze') {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 4-4 3 2 5-6" />
        <circle cx="7" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="11" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'dashboards') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <path d="M8 16v-4M12 16V8M16 16v-6" />
      </svg>
    )
  }
  if (id === 'ai') {
    return (
      <svg {...common}>
        <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  }
  if (id === 'ml') {
    return (
      <svg {...common}>
        <path d="m4 17 5-6 4 3 6-8" />
        <path d="M4 21h16" />
        <path d="m15 6 4-1 1 4" />
      </svg>
    )
  }
  if (id === 'automate') {
    return (
      <svg {...common}>
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M21 3v6h-6" />
        <path d="M12 8v4l3 2" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 10 4.1-1.6 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function QualityBadge({ score }: { score: number }) {
  return <span className={`analytics-quality ${qualityClass(score)}`}>{Math.round(score)}%</span>
}

function ResultTable({ result, maxRows = 200 }: { result: AnalyticsQueryResult; maxRows?: number }) {
  if (result.columns.length === 0) {
    return <div className="analytics-empty-inline">The query returned no columns.</div>
  }
  const visible = result.rows.slice(0, maxRows)
  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            {result.columns.map((column, index) => (
              <th key={`${column}-${index}`}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={result.columns.length} className="analytics-table-empty">
                No rows. The query was valid, but the result is empty.
              </td>
            </tr>
          ) : (
            visible.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {result.columns.map((column, columnIndex) => {
                  const value = row[columnIndex]
                  return (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      className={value === null ? 'is-null' : ''}
                      title={value === null ? 'null' : String(value)}
                    >
                      {formatCell(value)}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {result.rows.length > maxRows && (
        <div className="analytics-table-foot">
          Showing {maxRows.toLocaleString()} of {result.rows.length.toLocaleString()} returned rows.
          Export the query for the full result.
        </div>
      )}
    </div>
  )
}

interface DashboardReading {
  takeaway: string
  meaning: string
  method: string
  detail: string
  confidence: 'high' | 'medium' | 'low'
  source: 'stored' | 'local'
}

const SLICER_IDENTIFIER_HINT =
  /phone|mobile|telephone|email|e-mail|url|website|address|street|postal|zip|fax|uuid|guid|ssn|account.?number|card.?number|ip.?address/i
const SLICER_ID_LIKE = /(^|_)id$|^id($|_)|uuid|guid|^key$|_key$|^code$/i

/**
 * Only low-cardinality business segments make useful slicers. Contact details
 * and identifiers are excluded for the same reason automatic analysis excludes
 * them: "filter by phone" is technically possible but operationally useless.
 */
function slicerColumns(detail: AnalyticsDatasetDetail | null) {
  if (!detail) return []
  return detail.columns.filter((column) => {
    if (column.type !== 'text' && column.type !== 'date' && column.type !== 'boolean') return false
    if (column.topValues.length === 0 || column.distinctCount > 50) return false
    return !SLICER_ID_LIKE.test(column.name) && !SLICER_IDENTIFIER_HINT.test(column.name)
  })
}

/**
 * A deterministic reading for manually saved views that were created before
 * card metadata existed. It uses only the exact rows returned by the saved
 * query, so the dashboard never shows a fabricated interpretation.
 */
function chartMeasureLabel(view: AnalyticsSavedView, chart: AnalyticsChartSpec): string {
  const fromName = view.name
    .replace(/^Auto · /, '')
    .match(/\bby\s+(.+)$/i)?.[1]
    ?.trim()
  if (fromName && (chart.y.toLowerCase() === 'value' || chart.y.toLowerCase() === 'count')) {
    return fromName
  }
  return chart.y
}

function localDashboardReading(
  view: AnalyticsSavedView,
  result: AnalyticsQueryResult,
): DashboardReading {
  const chart = view.chart
  const measure = chart ? chartMeasureLabel(view, chart) : ''
  const base = {
    method: chart
      ? `Saved read-only SQL · ${chart.aggregation} of ${measure} by ${chart.x} · ${chart.type} chart`
      : 'Saved read-only SQL shown as a table',
    detail: `${result.rowCount.toLocaleString()} rows returned${result.truncated ? ' (row cap reached)' : ''}.`,
    confidence: 'medium' as const,
    source: 'local' as const,
  }
  if (!chart) {
    return {
      ...base,
      takeaway: `${result.rowCount.toLocaleString()} rows in this saved view`,
      meaning:
        'This card returns the exact rows produced by its saved read-only query. Use the SQL and table below to verify the evidence before acting on it.',
    }
  }
  const xIndex = result.columns.indexOf(chart.x)
  const yIndex = result.columns.indexOf(chart.y)
  if (xIndex < 0 || yIndex < 0) {
    return {
      ...base,
      takeaway: 'The saved chart columns are no longer present',
      meaning:
        'The query result does not contain the label and value columns stored with this chart. Open the card to repair the chart definition.',
      confidence: 'low',
    }
  }
  const points = result.rows
    .map((row) => ({
      label: String(row[xIndex] ?? '—'),
      value: typeof row[yIndex] === 'number' ? row[yIndex] : Number(row[yIndex]),
    }))
    .filter((point) => Number.isFinite(point.value))
  if (points.length === 0) {
    return {
      ...base,
      takeaway: 'No numeric values to chart',
      meaning:
        'The query returned rows, but the selected value column has no finite numbers. Open the card and choose another measure.',
      confidence: 'low',
    }
  }
  if (chart.type === 'scatter') {
    const pairs = result.rows
      .map((row) => ({
        x: typeof row[xIndex] === 'number' ? row[xIndex] : Number(row[xIndex]),
        y: typeof row[yIndex] === 'number' ? row[yIndex] : Number(row[yIndex]),
      }))
      .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y))
    if (pairs.length === 0) {
      return {
        ...base,
        takeaway: 'No complete numeric pairs to plot',
        meaning:
          'The selected scatter columns do not contain a row with two finite numbers. Open the card and choose two numeric columns, or remove the slicer.',
        confidence: 'low',
      }
    }
    const xs = pairs.map((pair) => pair.x)
    const ys = pairs.map((pair) => pair.y)
    const xRange = `${formatNumber(Math.min(...xs))} – ${formatNumber(Math.max(...xs))}`
    const yRange = `${formatNumber(Math.min(...ys))} – ${formatNumber(Math.max(...ys))}`
    const takeaway =
      pairs.length === 1
        ? `Only one ${chart.x}/${chart.y} pair is visible`
        : `${chart.y} vs ${chart.x} across ${pairs.length.toLocaleString()} returned rows`
    return {
      ...base,
      method: `Saved read-only SQL · scatter of ${chart.y} vs ${chart.x} · ${pairs.length.toLocaleString()} complete numeric pairs`,
      detail: `${pairs.length.toLocaleString()} complete numeric pairs returned${result.truncated ? ' (row cap reached)' : ''}. ${chart.x} range: ${xRange}. ${chart.y} range: ${yRange}.`,
      takeaway,
      meaning:
        pairs.length < 3
          ? 'Fewer than three complete pairs cannot show a relationship. A slicer or a narrow query may have reduced the data too far; widen the filter or inspect the saved SQL.'
          : 'Each dot is one row from the saved query. Look for a consistent direction and for clusters or gaps, but treat this as an association rather than a causal claim. The rows may already be grouped aggregates, so do not read the pattern as a row-level correlation.',
      confidence: pairs.length >= 8 ? 'medium' : 'low',
    }
  }
  if (view.insightKind === 'distribution') {
    const subject =
      view.name
        .replace(/^Auto · /, '')
        .replace(/^Distribution of /i, '')
        .trim() || chart.x
    const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0)
    const top = points.reduce((best, point) => (point.value > best.value ? point : best), points[0]!)
    const share = total > 0 ? (top.value / total) * 100 : null
    const verb = top.value === 1 ? 'falls' : 'fall'
    return {
      ...base,
      method: `Saved read-only SQL · histogram of ${subject} · ${chart.type} chart`,
      takeaway:
        share === null
          ? `${top.label} is the largest ${subject} bin`
          : `Most ${subject} values fall in ${top.label}`,
      meaning:
        share === null
          ? `${top.label} is the largest bin in this result (${formatNumber(top.value)}). Compare the bins before treating the peak as typical.`
          : `${formatNumber(top.value)} of ${formatNumber(total)} filtered rows ${verb} in the ${top.label} bin (${share.toFixed(1)}%). This is a row count for the slice, not an average or a forecast; check the other bins for a second peak or a long tail.`,
      confidence: total >= 10 ? 'medium' : 'low',
    }
  }
  if (chart.type === 'line' || chart.type === 'area') {
    const first = points[0]!
    const last = points[points.length - 1]!
    const change = first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : null
    return {
      ...base,
      takeaway:
        change === null
          ? `${measure} across ${points.length.toLocaleString()} points`
          : `${measure} ${change >= 0 ? 'rose' : 'fell'} ${Math.abs(change).toFixed(1)}% from first to last`,
      meaning:
        change === null
          ? 'The first value is zero or missing, so a percentage change cannot be calculated. Read the shape of the line rather than a single growth figure.'
          : `The end-to-end change is ${change >= 0 ? '+' : ''}${change.toFixed(1)}%. This compares only the first and last point; it does not prove a steady trend or seasonality.`,
    }
  }
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0)
  const top = points.reduce((best, point) => (point.value > best.value ? point : best), points[0]!)
  const share = total > 0 ? (top.value / total) * 100 : null
  return {
    ...base,
    takeaway:
      share === null
        ? `${top.label} has the largest ${measure} value`
        : `${top.label} leads with ${share.toFixed(1)}% of ${measure}`,
    meaning:
      share === null
        ? `${top.label} has the largest value in this result (${formatNumber(top.value)}). Compare it with the other groups before treating it as the best performer.`
        : `${top.label} has the largest value (${formatNumber(top.value)}) and represents ${share.toFixed(1)}% of the total ${measure} across the ${points.length.toLocaleString()} returned groups. This is a concentration reading, not a causal explanation.`,
  }
}

function dashboardResultSummary(view: AnalyticsSavedView, count: number): string {
  const unit =
    view.insightKind === 'distribution'
      ? 'bin'
      : view.insightKind === 'ranking'
        ? 'group'
        : view.insightKind === 'trend'
          ? 'period'
          : view.insightKind === 'correlation' || view.chart?.type === 'scatter'
            ? 'pair'
            : view.chart?.type === 'pie' || view.chart?.type === 'donut'
              ? 'slice'
              : 'row'
  return `${count.toLocaleString()} ${unit}${count === 1 ? '' : 's'} live`
}

function dashboardReading(
  view: AnalyticsSavedView,
  result: AnalyticsQueryResult,
  liveSlice = false,
): DashboardReading {
  const local = localDashboardReading(view, result)
  if (liveSlice) return local
  const stored = !!(view.takeaway || view.meaning)
  return {
    takeaway: view.takeaway ?? local.takeaway,
    meaning: view.meaning ?? local.meaning,
    method: view.method ?? local.method,
    detail: view.detail ?? local.detail,
    confidence: view.confidence ?? local.confidence,
    source: stored ? 'stored' : 'local',
  }
}

function DashboardCard({
  view,
  api,
  onOpen,
  onDelete,
  onFilter,
  refreshKey,
  filter,
}: {
  view: AnalyticsSavedView
  api: AnalyticsApi
  onOpen: () => void
  onDelete: () => void
  onFilter: (column: string, value: string) => void
  refreshKey: number
  filter: AnalyticsDashboardFilter | null
}) {
  const [result, setResult] = useState<AnalyticsQueryResult | null>(null)
  const [error, setError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const filterColumn = filter?.column
  const filterValue = filter?.value
  const crossFilterColumn = view.filterColumn
  const canCrossFilter =
    !!crossFilterColumn &&
    !!view.chart &&
    (view.chart.type === 'bar' || view.chart.type === 'pie' || view.chart.type === 'donut')
  const filtered = useMemo(
    () =>
      applyDashboardFilter(
        view.sql,
        filterColumn !== undefined && filterValue !== undefined
          ? { column: filterColumn, value: filterValue }
          : null,
      ),
    [view.sql, filterColumn, filterValue],
  )
  useEffect(() => {
    let alive = true
    setResult(null)
    setError('')
    void api
      .runQuery(view.datasetId, filtered.sql, 200)
      .then((value) => {
        if (alive) setResult(value)
      })
      .catch((reason) => {
        if (alive) setError(errorText(reason))
      })
    return () => {
      alive = false
    }
  }, [api, view.datasetId, view.id, filtered.sql, refreshKey])
  const reading = useMemo(
    () => (result ? dashboardReading(view, result, filter !== null) : null),
    [filter, result, view],
  )
  const kind = view.insightKind ?? (view.chart ? 'chart' : 'table')
  const displayName = view.name.replace(/^Auto · /, '')
  return (
    <article
      className={`analytics-dashboard-card ${view.insightKind ?? 'custom'}`}
      data-view-name={displayName}
    >
      <header>
        <div className="analytics-dashboard-heading">
          <span className={`analytics-dashboard-kind ${kind}`}>{kind}</span>
          <h3 title={view.name}>{displayName}</h3>
          <p>
            Saved {new Date(view.updatedAt).toLocaleString()}
            {result ? ` · ${dashboardResultSummary(view, result.rowCount)}` : ''}
          </p>
          {filter && (
            <span className={`analytics-dashboard-filter-chip ${filtered.applied ? '' : 'warn'}`}>
              {filtered.applied
                ? `Filtered · ${dashboardFilterLabel(filter)}`
                : 'Slicer not applicable'}
            </span>
          )}
        </div>
        <div className="analytics-card-actions">
          {confirmingDelete ? (
            <div className="analytics-delete-confirm" role="group" aria-label="Confirm delete card">
              <span>Delete card?</span>
              <button className="analytics-btn small danger" onClick={onDelete}>
                Delete
              </button>
              <button
                className="analytics-btn small ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button className="analytics-btn small" onClick={onOpen}>
                Open
              </button>
              <button
                className="analytics-icon-btn"
                onClick={() => setConfirmingDelete(true)}
                title="Delete saved view"
                aria-label="Delete saved view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </header>
      {reading && (
        <div className="analytics-dashboard-reading">
          <span className="analytics-eyebrow">WHAT IT MEANS</span>
          <strong>{reading.takeaway}</strong>
          <p>{reading.meaning}</p>
          <div className="analytics-dashboard-meta">
            <span className={`analytics-confidence ${reading.confidence}`}>
              {reading.confidence} confidence
            </span>
            <span>
              {reading.source === 'stored'
                ? 'Evidence reading'
                : filter
                  ? 'Live filtered reading'
                  : 'Local reading'}
            </span>
          </div>
        </div>
      )}
      {error ? (
        <div className="analytics-inline-error">{error}</div>
      ) : result ? (
        <div className="analytics-dashboard-visual">
          {view.chart ? (
            <AnalyticsChart
              result={result}
              spec={view.chart}
              height={200}
              compact
              selectedLabel={
                filter?.column === crossFilterColumn ? filter?.value : undefined
              }
              onSelect={
                canCrossFilter && crossFilterColumn
                  ? (label) => onFilter(crossFilterColumn, label)
                  : undefined
              }
            />
          ) : (
            <ResultTable result={result} maxRows={5} />
          )}
          {canCrossFilter && (
            <p className="analytics-dashboard-filter-hint">
              {filter?.column === crossFilterColumn
                ? 'Selected mark · click again to clear.'
                : 'Click a bar or slice to filter this dashboard.'}
            </p>
          )}
        </div>
      ) : (
        <div className="analytics-skeleton" />
      )}
      <details className="analytics-dashboard-evidence">
        <summary>Method &amp; evidence</summary>
        <p>
          <strong>Method.</strong> {reading?.method ?? 'Loading the saved calculation.'}
        </p>
        {reading?.detail && (
          <p>
            <strong>Evidence.</strong> {reading.detail}
          </p>
        )}
        {filter && (
          <p>
            <strong>Filter.</strong>{' '}
            {filtered.applied
              ? `${dashboardFilterLabel(filter)} is applied to the base table before this card's aggregation.`
              : 'This saved query does not read from the dataset table, so the slicer cannot be applied.'}
          </p>
        )}
        {filter && (view.takeaway || view.meaning) && (
          <p>
            <strong>Saved reading.</strong> The stored full-dataset reading is hidden while a
            slicer is active. Clear the filter to compare it with the live slice.
          </p>
        )}
        <code>{filtered.sql.replace(/\s+/g, ' ').slice(0, 220)}</code>
      </details>
    </article>
  )
}

function ReadingSource({ interpretation }: { interpretation: AnalyticsInterpretation }) {
  return (
    <span className={`analytics-reading-source ${interpretation.source}`}>
      {interpretation.source === 'ai' ? 'AI reading' : 'Local reading'}
      {interpretation.source === 'ai' && interpretation.model ? ` · ${interpretation.model}` : ''}
    </span>
  )
}

function AutoReading({ interpretation }: { interpretation: AnalyticsInterpretation }) {
  return (
    <section className={`analytics-reading-card ${interpretation.source}`}>
      <header>
        <div>
          <span className="analytics-eyebrow">WHAT THE EVIDENCE MEANS</span>
          <h2>{interpretation.headline}</h2>
        </div>
        <ReadingSource interpretation={interpretation} />
      </header>
      <p className="analytics-reading-meaning">{interpretation.meaning}</p>
      <div className="analytics-reading-columns">
        {interpretation.actions.length > 0 && (
          <div>
            <strong>What to check next</strong>
            <ul>
              {interpretation.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        )}
        {interpretation.caveats.length > 0 && (
          <div>
            <strong>Limits of this reading</strong>
            <ul>
              {interpretation.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {interpretation.note && <small className="analytics-reading-note">{interpretation.note}</small>}
    </section>
  )
}

function PlanSource({ plan }: { plan: AnalyticsAiPlan }) {
  return (
    <span className={`analytics-plan-source ${plan.source}`}>
      {plan.source === 'ai' ? 'AI understanding' : 'Local understanding'}
      {plan.source === 'ai' && plan.model ? ` · ${plan.model}` : ''}
    </span>
  )
}

function AiPlanCard({ plan }: { plan: AnalyticsAiPlan }) {
  return (
    <section className={`analytics-plan-card ${plan.source}`}>
      <header>
        <div>
          <span className="analytics-eyebrow">WHAT THE DATA IS</span>
          <h2>
            {plan.source === 'ai'
              ? 'The model’s read of this dataset'
              : 'What the local engine can tell from the schema'}
          </h2>
        </div>
        <PlanSource plan={plan} />
      </header>
      <p className="analytics-plan-summary">{plan.summary}</p>
      <div className="analytics-plan-facts">
        <div>
          <span>Grain</span>
          <strong>{plan.grain}</strong>
        </div>
        <div>
          <span>Measure</span>
          <strong>{plan.metric ?? 'Record count'}</strong>
        </div>
        <div>
          <span>Grouping</span>
          <strong>{plan.dimension ?? 'None selected'}</strong>
        </div>
        <div>
          <span>Time axis</span>
          <strong>{plan.timeColumn ?? 'None detected'}</strong>
        </div>
      </div>
      <div className="analytics-plan-columns">
        {plan.questions.length > 0 && (
          <div>
            <strong>Questions worth answering</strong>
            <ul>
              {plan.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.preparation.length > 0 && (
          <div>
            <strong>Preparation suggested</strong>
            <ul>
              {plan.preparation.map((step) => (
                <li key={`${step.kind}:${step.column ?? ''}`}>
                  {step.kind === 'drop_duplicates' ? 'Remove duplicate rows' : `${step.kind} · ${step.column}`}
                  {` — ${step.reason}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {plan.columnRoles.length > 0 && (
        <details className="analytics-plan-roles">
          <summary>How each column was read ({plan.columnRoles.length})</summary>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Role</th>
                  <th>Reading</th>
                </tr>
              </thead>
              <tbody>
                {plan.columnRoles.map((column) => (
                  <tr key={column.name}>
                    <td title={column.name}>{column.name}</td>
                    <td>
                      <span className={`analytics-plan-role ${column.role}`}>{column.role}</span>
                    </td>
                    <td>{column.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {plan.caveats.length > 0 && (
        <ul className="analytics-plan-caveats">
          {plan.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
      {plan.note && <small className="analytics-plan-note">{plan.note}</small>}
    </section>
  )
}

function AutoInsightCard({
  insight,
  datasetName,
  meaning,
}: {
  insight: AnalyticsAutoInsight
  datasetName: string
  meaning?: string
}) {
  const [showSql, setShowSql] = useState(false)
  return (
    <article className={`analytics-auto-insight ${insight.confidence}`}>
      <header>
        <span className={`analytics-auto-kind ${insight.kind}`}>{insight.kind}</span>
        <span className={`analytics-auto-confidence ${insight.confidence}`}>
          {insight.confidence} confidence
        </span>
      </header>
      <h3>{insight.title}</h3>
      <p>{insight.detail}</p>
      {insight.method && (
        <p className="analytics-auto-method">
          <span>Method</span>
          {insight.method}
        </p>
      )}
      {meaning && (
        <div className="analytics-auto-meaning">
          <span>What it means</span>
          <p>{meaning}</p>
        </div>
      )}
      <div className="analytics-auto-meta">
        <span>Dataset: {datasetName}</span>
        <span>Filters: none</span>
      </div>
      {insight.chart && insight.result && (
        <div className="analytics-auto-chart">
          <AnalyticsChart result={insight.result} spec={insight.chart} height={190} compact />
        </div>
      )}
      {insight.sql && (
        <div className="analytics-auto-evidence">
          <button type="button" onClick={() => setShowSql((value) => !value)}>
            {showSql ? 'Hide SQL' : 'Show SQL & rows'}
          </button>
          {showSql && (
            <>
              <pre>{insight.sql}</pre>
              {insight.result && <ResultTable result={insight.result} maxRows={20} />}
            </>
          )}
        </div>
      )}
    </article>
  )
}

function DetailEmpty({ onImport }: { onImport: () => void }) {
  return (
    <div className="analytics-empty-panel">
      <div className="analytics-empty-icon">
        <TabIcon id="data" />
      </div>
      <h2>Bring in a dataset to begin</h2>
      <p>
        Import a CSV, TSV, XLSX or JSON file. Everything is profiled locally; the document editors
        are never touched.
      </p>
      <button className="analytics-btn primary" onClick={onImport}>
        Import data
      </button>
    </div>
  )
}

function StatCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="analytics-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}

const WORKFLOW_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function workflowScheduleLabel(schedule: AnalyticsWorkflowSchedule): string {
  if (schedule.frequency === 'manual') return 'Manual only'
  if (schedule.frequency === 'hourly') return 'Every hour'
  const time = `${String(schedule.hour).padStart(2, '0')}:00`
  if (schedule.frequency === 'daily') return `Daily at ${time}`
  return `Weekly on ${WORKFLOW_WEEKDAYS[schedule.weekday] ?? 'Monday'} at ${time}`
}

function workflowStatusLabel(workflow: AnalyticsWorkflow): string {
  if (workflow.lastRunStatus === 'running') return 'Running'
  if (workflow.schedule.frequency === 'manual') return 'Manual'
  return workflow.enabled ? 'Active' : 'Paused'
}

function workflowWhen(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Not yet'
}

const EXPLORE_ID_HINT = /(^|_)(id|uuid|guid|key|code|number|no)$|^(id|uuid|guid|key|code)($|_)/i
const EXPLORE_TIME_PART_HINT =
  /^(?:(?:fiscal|calendar)_?)?(?:year|yr|month|quarter|week|day|period)$|(?:^|_)(?:year|yr|month|quarter|week|day)$/i
const EXPLORE_EVENT_HINT = /event|action|step|stage|status|type|funnel|journey|conversion/i

function exploreNumeric(column: AnalyticsColumnProfile): boolean {
  return column.type === 'integer' || column.type === 'real'
}

function suggestExploreDefaults(detail: AnalyticsDatasetDetail) {
  const columns = detail.columns
  const dimensions = columns
    .filter(
      (column) =>
        (column.type === 'text' || column.type === 'boolean') &&
        column.distinctCount > 1 &&
        column.distinctCount <= 500,
    )
    .sort((a, b) => a.distinctCount - b.distinctCount)
  const dates = columns.filter((column) => column.type === 'date')
  const numeric = columns.filter(
    (column) =>
      exploreNumeric(column) &&
      !EXPLORE_ID_HINT.test(column.name) &&
      !EXPLORE_TIME_PART_HINT.test(column.name),
  )
  const identifiers = columns.filter(
    (column) => column.type !== 'date' && EXPLORE_ID_HINT.test(column.name),
  )
  const event =
    dimensions.find((column) => EXPLORE_EVENT_HINT.test(column.name)) ??
    dimensions.find((column) => column.distinctCount <= 20) ??
    dimensions[0] ??
    columns.find((column) => column.type === 'text')
  const user = identifiers[0] ?? dimensions[0] ?? columns[0]
  const time =
    dates[0] ??
    columns.find((column) => /time|date|timestamp|order/i.test(column.name)) ??
    columns.find(exploreNumeric) ??
    columns[0]
  const pivotRows = dimensions[0]?.name ?? dates[0]?.name ?? columns[0]?.name ?? ''
  const pivotColumns =
    dimensions.find((column) => column.name !== pivotRows && column.distinctCount <= 30)?.name ?? ''
  const pivotMetric = numeric[0]?.name ?? ''
  const stepValues = event?.topValues.map((entry) => entry.value).slice(0, 4) ?? []
  return {
    pivotRows,
    pivotColumns,
    pivotMetric,
    pivotAggregation: (pivotMetric ? 'sum' : 'count') as AnalyticsExploreAggregation,
    funnelUser: user?.name ?? '',
    funnelEvent: event?.name ?? '',
    funnelTime: time?.name ?? '',
    funnelSteps: stepValues.join('\n'),
    cohortUser: user?.name ?? '',
    cohortDate: dates[0]?.name ?? time?.name ?? '',
  }
}

function exploreStepList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 0)
}

export function AnalyticsWorkspace({
  onClose,
  onOpenModelSettings,
}: {
  onClose: () => void
  onOpenModelSettings: () => void
}) {
  const api = window.plotdocsAnalytics
  const [tab, setTab] = useState<TabId>('overview')
  const [datasets, setDatasets] = useState<AnalyticsDataset[]>([])
  const [datasetId, setDatasetId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AnalyticsDatasetDetail | null>(null)
  const [audit, setAudit] = useState<AnalyticsAuditEvent[]>([])
  const [views, setViews] = useState<AnalyticsSavedView[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'bad' } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [sql, setSql] = useState('SELECT * FROM data LIMIT 100')
  const [lastSql, setLastSql] = useState('')
  const [result, setResult] = useState<AnalyticsQueryResult | null>(null)
  const [queryError, setQueryError] = useState('')
  const [chartSpec, setChartSpec] = useState<AnalyticsChartSpec | null>(null)
  const [viewName, setViewName] = useState('')
  const [mode, setMode] = useState<
    'sql' | 'python' | 'join' | 'append' | 'pivot' | 'funnel' | 'cohort'
  >('sql')
  const [joinRightId, setJoinRightId] = useState('')
  const [joinRightDetail, setJoinRightDetail] = useState<AnalyticsDatasetDetail | null>(null)
  const [joinLeftKey, setJoinLeftKey] = useState('')
  const [joinRightKey, setJoinRightKey] = useState('')
  const [joinType, setJoinType] = useState<AnalyticsJoinType>('left')
  const [joinName, setJoinName] = useState('')
  const [joinResult, setJoinResult] = useState<AnalyticsJoinResult | null>(null)
  const [joinError, setJoinError] = useState('')
  const [appendRightId, setAppendRightId] = useState('')
  const [appendMode, setAppendMode] = useState<AnalyticsAppendMode>('all')
  const [appendName, setAppendName] = useState('')
  const [appendResult, setAppendResult] = useState<AnalyticsAppendResult | null>(null)
  const [appendError, setAppendError] = useState('')
  const [pivotRows, setPivotRows] = useState('')
  const [pivotColumns, setPivotColumns] = useState('')
  const [pivotMetric, setPivotMetric] = useState('')
  const [pivotAggregation, setPivotAggregation] =
    useState<AnalyticsExploreAggregation>('sum')
  const [funnelUser, setFunnelUser] = useState('')
  const [funnelEvent, setFunnelEvent] = useState('')
  const [funnelTime, setFunnelTime] = useState('')
  const [funnelSteps, setFunnelSteps] = useState('')
  const [cohortUser, setCohortUser] = useState('')
  const [cohortDate, setCohortDate] = useState('')
  const [cohortPeriods, setCohortPeriods] = useState(12)
  const [exploreResult, setExploreResult] = useState<{
    kind: 'pivot' | 'funnel' | 'cohort'
    result: AnalyticsQueryResult
    sql: string
    aggregation?: AnalyticsExploreAggregation
  } | null>(null)
  const [exploreError, setExploreError] = useState('')
  const [groupBy, setGroupBy] = useState('')
  const [metric, setMetric] = useState('')
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'min' | 'max' | 'count'>('sum')
  const [pythonResult, setPythonResult] = useState<AnalyticsPythonResult | null>(null)
  const [question, setQuestion] = useState('')
  const [aiResult, setAiResult] = useState<AnalyticsAskResult | null>(null)
  const [forecastX, setForecastX] = useState('')
  const [forecastY, setForecastY] = useState('')
  const [forecast, setForecast] = useState<AnalyticsForecastResult | null>(null)
  const [cleanColumn, setCleanColumn] = useState('')
  const [fillValue, setFillValue] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(true)
  const [autoAnalysis, setAutoAnalysis] = useState<AnalyticsAutoAnalysis | null>(null)
  const [autoBusy, setAutoBusy] = useState(false)
  const [aiPlan, setAiPlan] = useState<AnalyticsAiPlan | null>(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [workflows, setWorkflows] = useState<AnalyticsWorkflow[]>([])
  const [workflowSelectedId, setWorkflowSelectedId] = useState<string | null>(null)
  const [workflowRuns, setWorkflowRuns] = useState<AnalyticsWorkflowRun[]>([])
  const [workflowVersions, setWorkflowVersions] = useState<AnalyticsWorkflowVersion[]>([])
  const [workflowBusy, setWorkflowBusy] = useState<string | null>(null)
  const [workflowFormOpen, setWorkflowFormOpen] = useState(false)
  const [workflowEditingId, setWorkflowEditingId] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState('Scheduled refresh')
  const [workflowFrequency, setWorkflowFrequency] =
    useState<AnalyticsWorkflowFrequency>('daily')
  const [workflowHour, setWorkflowHour] = useState(9)
  const [workflowWeekday, setWorkflowWeekday] = useState(1)
  // Scheduled automation is analysis-only by default. Duplicate removal is an
  // explicit opt-in because it changes the working dataset (with a backup).
  const [workflowPrepare, setWorkflowPrepare] = useState(false)
  const [workflowRetries, setWorkflowRetries] = useState(1)
  const [dashboardRefresh, setDashboardRefresh] = useState(0)
  const [dashboardFilter, setDashboardFilter] = useState<AnalyticsDashboardFilter | null>(null)
  const [dashboardSlicerColumnName, setDashboardSlicerColumnName] = useState('')
  const [dashboardLayout, setDashboardLayout] = useState<'auto' | '1' | '2'>('auto')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionToken = useRef(0)

  const numericColumns = useMemo(
    () => detail?.columns.filter((column) => column.type === 'integer' || column.type === 'real') ?? [],
    [detail],
  )
  const dashboardSlicerColumns = useMemo(() => slicerColumns(detail), [detail])
  const dashboardSlicerColumn = useMemo(
    () =>
      dashboardSlicerColumns.find(
        (column) => column.name === (dashboardFilter?.column ?? dashboardSlicerColumnName),
      ) ?? null,
    [dashboardFilter?.column, dashboardSlicerColumnName, dashboardSlicerColumns],
  )
  useEffect(() => {
    if (dashboardFilter && !dashboardSlicerColumn) setDashboardFilter(null)
    if (dashboardSlicerColumnName && !dashboardSlicerColumn) setDashboardSlicerColumnName('')
  }, [dashboardFilter, dashboardSlicerColumn, dashboardSlicerColumnName])
  const cleanColumnProfile = useMemo(
    () => detail?.columns.find((column) => column.name === cleanColumn) ?? null,
    [cleanColumn, detail],
  )

  useEffect(() => {
    let alive = true
    if (!api || mode !== 'join' || !joinRightId) {
      setJoinRightDetail(null)
      setJoinRightKey('')
      return () => {
        alive = false
      }
    }
    void api
      .getDataset(joinRightId)
      .then((next) => {
        if (!alive) return
        setJoinRightDetail(next)
        const preferred =
          next?.columns.find((column) =>
            detail?.columns.some((left) => left.name === column.name),
          )?.name ??
          next?.columns[0]?.name ??
          ''
        setJoinRightKey(preferred)
      })
      .catch(() => {
        if (!alive) return
        setJoinRightDetail(null)
        setJoinRightKey('')
      })
    return () => {
      alive = false
    }
  }, [api, detail, joinRightId, mode])

  const totalRows = useMemo(() => datasets.reduce((sum, dataset) => sum + dataset.rowCount, 0), [datasets])
  const averageQuality = useMemo(
    () =>
      datasets.length
        ? Math.round(datasets.reduce((sum, dataset) => sum + dataset.qualityScore, 0) / datasets.length)
        : 0,
    [datasets],
  )
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0]!

  function notify(message: string, tone: 'ok' | 'bad' = 'ok') {
    setToast({ message, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5200)
  }

  async function refreshAudit() {
    if (!api) return
    try {
      setAudit(await api.listAudit())
    } catch {
      /* audit is secondary */
    }
  }

  async function selectDataset(id: string) {
    if (!api) return
    const token = selectionToken.current + 1
    selectionToken.current = token
    setDatasetId(id)
    setDetail(null)
    setError('')
    setQueryError('')
    setResult(null)
    setLastSql('')
    setPythonResult(null)
    setAiResult(null)
    setForecast(null)
    setChartSpec(null)
    setAutoAnalysis((current) => (current?.datasetId === id ? current : null))
    setAiPlan(null)
    setDashboardFilter(null)
    setMode('sql')
    setJoinRightId('')
    setJoinRightDetail(null)
    setJoinLeftKey('')
    setJoinRightKey('')
    setJoinName('')
    setJoinResult(null)
    setJoinError('')
    setAppendRightId('')
    setAppendMode('all')
    setAppendName('')
    setAppendResult(null)
    setAppendError('')
    setExploreResult(null)
    setExploreError('')
    setWorkflows([])
    setWorkflowSelectedId(null)
    setWorkflowRuns([])
    setWorkflowVersions([])
    setWorkflowFormOpen(false)
    setWorkflowEditingId(null)
    try {
      const [nextDetail, nextViews, nextWorkflows] = await Promise.all([
        api.getDataset(id),
        api.listViews(id),
        api.listWorkflows(id),
      ])
      // A slower response for a dataset the user already navigated away from
      // must never replace the current workspace state.
      if (selectionToken.current !== token) return
      if (!nextDetail) {
        setError('That dataset could not be opened.')
        return
      }
      setDetail(nextDetail)
      const exploreDefaults = suggestExploreDefaults(nextDetail)
      setPivotRows(exploreDefaults.pivotRows)
      setPivotColumns(exploreDefaults.pivotColumns)
      setPivotMetric(exploreDefaults.pivotMetric)
      setPivotAggregation(exploreDefaults.pivotAggregation)
      setFunnelUser(exploreDefaults.funnelUser)
      setFunnelEvent(exploreDefaults.funnelEvent)
      setFunnelTime(exploreDefaults.funnelTime)
      setFunnelSteps(exploreDefaults.funnelSteps)
      setCohortUser(exploreDefaults.cohortUser)
      setCohortDate(exploreDefaults.cohortDate)
      setCohortPeriods(12)
      setJoinLeftKey(nextDetail.columns[0]?.name ?? '')
      setViews(nextViews)
      setWorkflows(nextWorkflows)
      setWorkflowSelectedId(nextWorkflows[0]?.id ?? null)
      setSql('SELECT * FROM data LIMIT 100')
      setViewName(`${nextDetail.name} view`)
      if (nextWorkflows[0]) {
        const [runs, versions] = await Promise.all([
          api.listWorkflowRuns(nextWorkflows[0].id, 8),
          api.listWorkflowVersions(nextWorkflows[0].id),
        ])
        if (selectionToken.current !== token) return
        setWorkflowRuns(runs)
        setWorkflowVersions(versions)
      }
    } catch (reason) {
      if (selectionToken.current === token) setError(errorText(reason))
    }
  }

  async function reloadDatasets(preferredId?: string) {
    if (!api) return
    try {
      const list = await api.listDatasets()
      setDatasets(list)
      const target = preferredId && list.some((dataset) => dataset.id === preferredId)
        ? preferredId
        : datasetId && list.some((dataset) => dataset.id === datasetId)
          ? datasetId
          : list[0]?.id
      if (target) await selectDataset(target)
      else {
        setDatasetId(null)
        setDetail(null)
        setViews([])
      }
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    }
  }

  async function refreshWorkflowHistory(id: string) {
    if (!api) return
    try {
      const [runs, versions] = await Promise.all([
        api.listWorkflowRuns(id, 8),
        api.listWorkflowVersions(id),
      ])
      setWorkflowRuns(runs)
      setWorkflowVersions(versions)
    } catch {
      /* workflow history is secondary to the analysis itself */
    }
  }

  async function selectWorkflow(id: string) {
    setWorkflowSelectedId(id)
    await refreshWorkflowHistory(id)
  }

  async function refreshWorkflows(targetDatasetId = datasetId, preferredId = workflowSelectedId) {
    if (!api || !targetDatasetId) return
    const list = await api.listWorkflows(targetDatasetId)
    setWorkflows(list)
    const target =
      preferredId && list.some((workflow) => workflow.id === preferredId)
        ? preferredId
        : list[0]?.id ?? null
    setWorkflowSelectedId(target)
    if (target) await refreshWorkflowHistory(target)
    else {
      setWorkflowRuns([])
      setWorkflowVersions([])
    }
  }

  function openWorkflowForm(workflow?: AnalyticsWorkflow) {
    setWorkflowEditingId(workflow?.id ?? null)
    setWorkflowName(workflow?.name ?? 'Scheduled refresh')
    setWorkflowFrequency(workflow?.schedule.frequency ?? 'daily')
    setWorkflowHour(workflow?.schedule.hour ?? 9)
    setWorkflowWeekday(workflow?.schedule.weekday ?? 1)
    setWorkflowPrepare(workflow?.prepare ?? false)
    setWorkflowRetries(workflow?.maxRetries ?? 1)
    setWorkflowFormOpen(true)
  }

  function closeWorkflowForm() {
    setWorkflowFormOpen(false)
    setWorkflowEditingId(null)
  }

  async function saveWorkflowForm() {
    if (!api || !datasetId) return
    const name = workflowName.trim()
    if (!name) {
      notify('Give the workflow a name first.', 'bad')
      return
    }
    setWorkflowBusy('save')
    try {
      const existing = workflowEditingId
        ? workflows.find((workflow) => workflow.id === workflowEditingId)
        : null
      const saved = await api.saveWorkflow({
        ...(workflowEditingId ? { id: workflowEditingId } : {}),
        datasetId,
        name,
        schedule: {
          frequency: workflowFrequency,
          hour: workflowHour,
          weekday: workflowWeekday,
        },
        enabled: existing?.enabled ?? true,
        prepare: workflowPrepare,
        maxRetries: workflowRetries,
      })
      await refreshWorkflows(datasetId, saved.id)
      closeWorkflowForm()
      notify(`Saved “${saved.name}” · version ${saved.version}.`)
      await refreshAudit()
    } catch (reason) {
      notify(errorText(reason), 'bad')
    } finally {
      setWorkflowBusy(null)
    }
  }

  async function runWorkflow(id: string) {
    if (!api) return
    setWorkflowBusy(`run:${id}`)
    try {
      const result = await api.runWorkflow(id)
      if (result.dataset) setDetail(result.dataset)
      if (result.workflow) {
        setWorkflows((current) =>
          current.map((workflow) => (workflow.id === id ? result.workflow! : workflow)),
        )
      }
      await refreshWorkflowHistory(id)
      if (result.ok) {
        if (datasetId) {
          setViews(await api.listViews(datasetId))
          setDatasets(await api.listDatasets())
          setDashboardRefresh((value) => value + 1)
        }
        notify(result.run?.message ?? 'Workflow completed.')
        await refreshAudit()
      } else {
        notify(result.error ?? 'The workflow failed. Open its run history for details.', 'bad')
      }
    } catch (reason) {
      notify(errorText(reason), 'bad')
    } finally {
      setWorkflowBusy(null)
    }
  }

  async function toggleWorkflow(workflow: AnalyticsWorkflow) {
    if (!api) return
    setWorkflowBusy(`toggle:${workflow.id}`)
    try {
      const saved = await api.saveWorkflow({
        id: workflow.id,
        datasetId: workflow.datasetId,
        name: workflow.name,
        schedule: workflow.schedule,
        enabled: !workflow.enabled,
        prepare: workflow.prepare,
        maxRetries: workflow.maxRetries,
      })
      await refreshWorkflows(workflow.datasetId, saved.id)
      notify(saved.enabled ? 'Workflow resumed.' : 'Workflow paused. Manual runs still work.')
      await refreshAudit()
    } catch (reason) {
      notify(errorText(reason), 'bad')
    } finally {
      setWorkflowBusy(null)
    }
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!api) return
    if (!window.confirm(`Delete the automation “${name}” and its run history?`)) return
    setWorkflowBusy(`delete:${id}`)
    try {
      await api.deleteWorkflow(id)
      await refreshWorkflows(datasetId)
      notify('Workflow deleted. The dataset and its dashboards were not changed.')
      await refreshAudit()
    } catch (reason) {
      notify(errorText(reason), 'bad')
    } finally {
      setWorkflowBusy(null)
    }
  }

  async function openAssistantSql(
    targetDatasetId: string,
    nextSql: string,
    nextResult?: AnalyticsQueryResult,
    nextChart?: AnalyticsChartSpec | null,
  ) {
    if (targetDatasetId !== datasetId) await selectDataset(targetDatasetId)
    setSql(nextSql)
    setLastSql(nextSql)
    setQueryError('')
    if (nextResult) {
      setResult(nextResult)
      setChartSpec(nextChart ?? null)
    }
    setTab('analyze')
  }

  function openAssistantDataset(targetDatasetId: string) {
    setTab('data')
    void reloadDatasets(targetDatasetId)
  }

  useEffect(() => {
    if (!api) return
    let alive = true
    void (async () => {
      try {
        const [list, log] = await Promise.all([api.listDatasets(), api.listAudit()])
        if (!alive) return
        setDatasets(list)
        setAudit(log)
        if (list[0]) await selectDataset(list[0].id)
      } catch (reason) {
        if (alive) setError(errorText(reason))
      }
    })()
    return () => {
      alive = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // dataset selection is intentionally a one-time bootstrap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!detail) return
    const numeric = detail.columns.filter(
      (column) => column.type === 'integer' || column.type === 'real',
    )
    // Grouping by an id-like first column produces one row per record, which is
    // rarely what a user wants. Prefer a label column and a different metric.
    const groupCandidate =
      detail.columns.find((column) => column.type === 'text')?.name ??
      detail.columns.find((column) => column.type === 'date')?.name ??
      detail.columns.find((column) => column.type === 'boolean')?.name ??
      detail.columns[0]?.name ??
      ''
    // Prefer a real measure over an id-like numeric column.
    const isIdLike = (name: string) => /(^id$|_id$|Id$)/.test(name)
    const metricCandidate =
      numeric.find((column) => column.name !== groupCandidate && !isIdLike(column.name))?.name ??
      numeric.find((column) => column.name !== groupCandidate)?.name ??
      numeric[0]?.name ??
      ''
    const secondNumeric = numeric.find((column) => column.name !== metricCandidate)?.name ?? metricCandidate
    setGroupBy((current) =>
      detail.columns.some((column) => column.name === current) ? current : groupCandidate,
    )
    setMetric((current) =>
      numeric.some((column) => column.name === current) ? current : metricCandidate,
    )
    setForecastX((current) =>
      numeric.some((column) => column.name === current) ? current : metricCandidate,
    )
    setForecastY((current) =>
      numeric.some((column) => column.name === current) ? current : secondNumeric,
    )
    setCleanColumn((current) =>
      detail.columns.some((column) => column.name === current) ? current : detail.columns[0]?.name ?? '',
    )
  }, [detail])

  useEffect(() => {
    if (!result) return
    setChartSpec((current) => {
      if (current && result.columns.includes(current.x) && result.columns.includes(current.y)) return current
      const numeric = result.columns.find((column) => {
        const index = result.columns.indexOf(column)
        return result.rows.some((row) => {
          const value = row[index]
          return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
        })
      })
      const label = result.columns.find((column) => column !== numeric)
      return numeric && label
        ? { type: 'bar', x: label, y: numeric, aggregation: 'sum' }
        : null
    })
  }, [result])

  async function importFile() {
    if (!api || busy) return
    setBusy('import')
    setError('')
    try {
      const dataset = await api.importFile()
      if (!dataset) return
      await reloadDatasets(dataset.id)
      setTab('data')
      notify(`Imported ${dataset.name} (${dataset.rowCount.toLocaleString()} rows).`)
    } catch (reason) {
      setError(errorText(reason))
      notify('Import failed.', 'bad')
    } finally {
      setBusy(null)
    }
  }

  async function importDroppedFile(file: File) {
    if (!api || busy) return
    setBusy('import')
    setError('')
    try {
      const path = window.aiOffice.pathForFile(file)
      const dataset = await api.importPath(path)
      await reloadDatasets(dataset.id)
      setTab('data')
      notify(`Imported ${dataset.name} (${dataset.rowCount.toLocaleString()} rows).`)
    } catch (reason) {
      setError(errorText(reason))
      notify('Import failed.', 'bad')
    } finally {
      setBusy(null)
    }
  }

  async function deleteDataset() {
    if (!api || !detail) return
    if (!window.confirm(`Delete the dataset “${detail.name}” from this device? The source file is not touched.`)) {
      return
    }
    setBusy('delete')
    try {
      await api.deleteDataset(detail.id)
      notify('Dataset removed from Plot Docs.')
      await reloadDatasets()
      setTab('overview')
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function executeSql(text: string) {
    if (!api || !detail) return
    setBusy('query')
    setQueryError('')
    setError('')
    try {
      const next = await api.runQuery(detail.id, text, 1000)
      setResult(next)
      setLastSql(text)
      await refreshAudit()
    } catch (reason) {
      setQueryError(errorText(reason))
      setResult(null)
    } finally {
      setBusy(null)
    }
  }

  async function runQuery() {
    await executeSql(sql)
  }

  async function createJoin() {
    if (!api || !detail || busy) return
    if (!joinRightId || !joinLeftKey || !joinRightKey) {
      setJoinError('Choose a right dataset and a key column on each side.')
      return
    }
    setBusy('join')
    setJoinError('')
    setError('')
    try {
      const result = await api.joinDatasets({
        leftDatasetId: detail.id,
        rightDatasetId: joinRightId,
        leftKey: joinLeftKey,
        rightKey: joinRightKey,
        joinType,
        ...(joinName.trim() ? { name: joinName.trim() } : {}),
      })
      if (!result.ok || !result.dataset) {
        setJoinResult(null)
        setJoinError(result.error ?? 'The join did not produce a dataset.')
        notify('Join failed.', 'bad')
        return
      }
      setJoinResult(result)
      setDatasets(await api.listDatasets())
      notify(
        `Created ${result.dataset.name} with ${result.dataset.rowCount.toLocaleString()} rows.`,
      )
      await refreshAudit()
    } catch (reason) {
      setJoinResult(null)
      setJoinError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function openJoinedDataset() {
    if (!joinResult?.dataset) return
    const id = joinResult.dataset.id
    setJoinResult(null)
    await selectDataset(id)
  }

  async function createAppend() {
    if (!api || !detail || busy) return
    if (!appendRightId) {
      setAppendError('Choose a second dataset with the same column names.')
      return
    }
    setBusy('append')
    setAppendError('')
    setError('')
    try {
      const result = await api.appendDatasets({
        leftDatasetId: detail.id,
        rightDatasetId: appendRightId,
        mode: appendMode,
        ...(appendName.trim() ? { name: appendName.trim() } : {}),
      })
      if (!result.ok || !result.dataset) {
        setAppendResult(null)
        setAppendError(result.error ?? 'The append did not produce a dataset.')
        notify('Append failed.', 'bad')
        return
      }
      setAppendResult(result)
      setDatasets(await api.listDatasets())
      notify(
        `Created ${result.dataset.name} with ${result.dataset.rowCount.toLocaleString()} rows.`,
      )
      await refreshAudit()
    } catch (reason) {
      setAppendResult(null)
      setAppendError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function openAppendedDataset() {
    if (!appendResult?.dataset) return
    const id = appendResult.dataset.id
    setAppendResult(null)
    await selectDataset(id)
  }

  async function clean(operation: AnalyticsCleanOperation) {
    if (!api || !detail || busy) return
    setBusy('clean')
    setError('')
    try {
      const cleaned = await api.clean(detail.id, operation)
      if (!cleaned.ok || !cleaned.dataset) {
        setError(cleaned.error ?? 'Cleaning failed.')
        notify('Cleaning failed.', 'bad')
        return
      }
      setDetail(cleaned.dataset)
      setDatasets(await api.listDatasets())
      notify(cleaned.message ?? 'Dataset updated.')
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function undoClean() {
    if (!api || !detail || busy) return
    setBusy('undo')
    try {
      const undone = await api.undoClean(detail.id)
      if (!undone.ok || !undone.dataset) {
        setError(undone.error ?? 'Undo failed.')
        return
      }
      setDetail(undone.dataset)
      setDatasets(await api.listDatasets())
      notify(undone.message ?? 'Restored the previous state.')
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function saveView() {
    if (!api || !detail || busy) return
    setBusy('save')
    try {
      const filterColumn =
        chartSpec && (chartSpec.type === 'bar' || chartSpec.type === 'pie' || chartSpec.type === 'donut')
          ? slicerColumns(detail).find((column) => column.name === chartSpec.x)?.name
          : undefined
      const saved = await api.saveView({
        datasetId: detail.id,
        name: viewName || `${detail.name} view`,
        sql: lastSql || sql,
        chart: chartSpec,
        ...(filterColumn ? { filterColumn } : {}),
      })
      setViews(await api.listViews(detail.id))
      notify(`Saved “${saved.name}”.`)
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function deleteView(id: string) {
    if (!api) return
    try {
      await api.deleteView(id)
      if (detail) setViews(await api.listViews(detail.id))
      notify('Saved view deleted.')
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    }
  }

  async function openView(view: AnalyticsSavedView) {
    setTab('analyze')
    setSql(view.sql)
    setChartSpec(view.chart)
    await executeSql(view.sql)
  }

  function chooseSlicerColumn(name: string) {
    const column = dashboardSlicerColumns.find((candidate) => candidate.name === name)
    if (!column) {
      setDashboardSlicerColumnName('')
      setDashboardFilter(null)
      return
    }
    // Selecting a column only prepares the slicer. The dashboard stays
    // unfiltered until the user chooses a specific value, so opening the
    // control cannot silently narrow every card to the first category.
    setDashboardSlicerColumnName(column.name)
    setDashboardFilter(null)
  }

  function chooseSlicerValue(value: string) {
    if (!dashboardSlicerColumn) return
    setDashboardFilter(
      value === ALL_SLICER_VALUES ? null : { column: dashboardSlicerColumn.name, value },
    )
  }

  function applyChartFilter(columnName: string, value: string) {
    const column = dashboardSlicerColumns.find((candidate) => candidate.name === columnName)
    if (!column) return
    setDashboardSlicerColumnName(column.name)
    setDashboardFilter((current) =>
      current?.column === column.name && current.value === value
        ? null
        : { column: column.name, value },
    )
  }

  async function exportCsv() {
    if (!api || !detail) return
    const source = lastSql || sql
    if (!source.trim()) return
    setBusy('export')
    try {
      const path = await api.exportCsv(detail.id, source, `${detail.name}-analysis`)
      if (path) notify(`Exported CSV to ${path}.`)
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function runPython() {
    if (!api || !detail || busy) return
    setBusy('python')
    setError('')
    try {
      const next = await api.python({
        datasetId: detail.id,
        groupBy,
        metric,
        aggregation,
        limit: 100,
      })
      setPythonResult(next)
      await refreshAudit()
    } catch (reason) {
      setPythonResult({ ok: false, error: errorText(reason) })
    } finally {
      setBusy(null)
    }
  }

  async function runExplore() {
    if (!api || !detail || busy) return
    const kind = mode
    if (kind !== 'pivot' && kind !== 'funnel' && kind !== 'cohort') return
    let text = ''
    try {
      if (kind === 'pivot') {
        text = buildPivotSql({
          rows: pivotRows,
          columns: pivotColumns || null,
          metric: pivotMetric || null,
          aggregation: pivotAggregation,
          limit: 1_000,
        })
      } else if (kind === 'funnel') {
        text = buildFunnelSql({
          user: funnelUser,
          event: funnelEvent,
          time: funnelTime,
          steps: exploreStepList(funnelSteps),
        })
      } else {
        text = buildCohortSql({
          user: cohortUser,
          date: cohortDate,
          periods: cohortPeriods,
        })
      }
    } catch (reason) {
      setExploreResult(null)
      setExploreError(errorText(reason))
      return
    }
    setBusy('explore')
    setExploreError('')
    setError('')
    try {
      const next = await api.runQuery(detail.id, text, 5_000)
      setExploreResult({
        kind,
        result: next,
        sql: text,
        ...(kind === 'pivot' ? { aggregation: pivotAggregation } : {}),
      })
      setLastSql(text)
      await refreshAudit()
    } catch (reason) {
      setExploreResult(null)
      setExploreError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function openExploreInSql(sqlText: string) {
    setSql(sqlText)
    setLastSql(sqlText)
    setMode('sql')
    await executeSql(sqlText)
  }

  async function exportExploreCsv() {
    if (!api || !detail || !exploreResult) return
    setBusy('export')
    try {
      const path = await api.exportCsv(
        detail.id,
        exploreResult.sql,
        `${detail.name}-${exploreResult.kind}`,
      )
      if (path) notify(`Exported CSV to ${path}.`)
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(null)
    }
  }

  async function askAi() {
    if (!api || !detail || busy) return
    const trimmed = question.trim()
    if (!trimmed) return
    setBusy('ai')
    setError('')
    setAiResult(null)
    try {
      const answer = await api.ask(detail.id, trimmed)
      setAiResult(answer)
      await refreshAudit()
    } catch (reason) {
      setAiResult({ ok: false, question: trimmed, error: errorText(reason), caveats: [] })
    } finally {
      setBusy(null)
    }
  }

  function openAiInAnalyze() {
    if (!aiResult?.result || !aiResult.sql) return
    setSql(aiResult.sql)
    setLastSql(aiResult.sql)
    setResult(aiResult.result)
    setChartSpec(aiResult.chart ?? null)
    setTab('analyze')
  }

  async function understandData() {
    if (!api || !detail || planBusy || busy) return
    setPlanBusy(true)
    setError('')
    try {
      const result = await api.understandDataset(detail.id)
      if (!result.ok || !result.plan) {
        setError(result.error ?? 'The dataset understanding could not be generated.')
        notify('Dataset understanding failed.', 'bad')
        return
      }
      setAiPlan(result.plan)
      notify(
        result.plan.source === 'ai'
          ? 'AI read of the dataset is ready.'
          : 'Local read of the dataset is ready. Connect a model for an AI reading.',
      )
      await refreshAudit()
    } catch (reason) {
      setError(errorText(reason))
      notify('Dataset understanding failed.', 'bad')
    } finally {
      setPlanBusy(false)
    }
  }

  async function runAuto() {
    if (!api || !detail || autoBusy || busy) return
    setAutoBusy(true)
    setError('')
    try {
      const analysis = await api.autoAnalyze({ datasetId: detail.id, prepare: true })
      setAutoAnalysis(analysis)
      if (analysis.plan) setAiPlan(analysis.plan)
      if (!analysis.ok) {
        setError(analysis.error ?? 'The automated analysis failed.')
        notify('Auto analysis failed.', 'bad')
        return
      }
      const [nextDetail, nextViews, nextDatasets] = await Promise.all([
        api.getDataset(detail.id),
        api.listViews(detail.id),
        api.listDatasets(),
      ])
      if (nextDetail) setDetail(nextDetail)
      setViews(nextViews)
      setDatasets(nextDatasets)
      await refreshAudit()
      setTab('automate')
      notify(
        `Auto analysis: ${analysis.insights.length} insights, ${analysis.views.length} dashboard card${analysis.views.length === 1 ? '' : 's'}.`,
      )
    } catch (reason) {
      setError(errorText(reason))
      notify('Auto analysis failed.', 'bad')
    } finally {
      setAutoBusy(false)
    }
  }

  async function runForecast() {
    if (!api || !detail || busy) return
    setBusy('forecast')
    setError('')
    setForecast(null)
    try {
      setForecast(await api.forecast(detail.id, forecastX, forecastY))
      await refreshAudit()
    } catch (reason) {
      setForecast({ ok: false, error: errorText(reason) })
    } finally {
      setBusy(null)
    }
  }

  const forecastResult = useMemo<AnalyticsQueryResult | null>(() => {
    if (!forecast?.ok || !forecast.points || !forecast.forecast || !forecast.xColumn || !forecast.yColumn) {
      return null
    }
    return {
      columns: [forecast.xColumn, forecast.yColumn],
      rows: [...forecast.points, ...forecast.forecast].map((point) => [point.x, point.y]),
      rowCount: forecast.points.length + forecast.forecast.length,
      truncated: false,
      elapsedMs: 0,
    }
  }, [forecast])

  const forecastTable = useMemo<AnalyticsQueryResult | null>(() => {
    if (!forecast?.ok || !forecast.points || !forecast.forecast || !forecast.xColumn || !forecast.yColumn) {
      return null
    }
    const rows = [
      ...forecast.points.map((point) => [point.x, point.y, null, null, 'observed']),
      ...forecast.forecast.map((point) => [
        point.x,
        point.y,
        point.lower ?? null,
        point.upper ?? null,
        'forecast',
      ]),
    ]
    return {
      columns: [forecast.xColumn, forecast.yColumn, 'lower 95%', 'upper 95%', 'kind'],
      rows,
      rowCount: rows.length,
      truncated: false,
      elapsedMs: 0,
    }
  }, [forecast])

  function renderOverview() {
    if (datasets.length === 0) {
      return (
        <div className="analytics-overview">
          <section className="analytics-hero">
            <div className="analytics-hero-copy">
              <span className="analytics-pill">LOCAL-FIRST · SOOPUS AI OPTIONAL</span>
              <h2>
                Your data, with <span>receipts.</span>
              </h2>
              <p>
                Import a spreadsheet, inspect its quality, clean it, run SQL or safe Python, and ask
                an AI analyst that must show the calculation behind every answer.
              </p>
              <div className="analytics-hero-actions">
                <button className="analytics-btn primary" onClick={() => void importFile()}>
                  {busy === 'import' ? 'Importing…' : 'Import data'}
                </button>
                <button className="analytics-btn ghost" onClick={() => setTab('ai')}>
                  How AI evidence works
                </button>
              </div>
              <div className="analytics-format-row">
                {['.csv', '.tsv', '.xlsx', '.json'].map((format) => (
                  <span key={format}>{format}</span>
                ))}
                <small>Up to 100 MB and 250,000 rows in this build.</small>
              </div>
            </div>
            <div className="analytics-hero-visual" aria-hidden="true">
              <div className="analytics-visual-top">
                <span>quality</span>
                <strong>94</strong>
              </div>
              <div className="analytics-visual-bars">
                {[42, 68, 54, 82, 66, 95, 74, 88].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="analytics-visual-foot">
                <span>local SQLite</span>
                <span>evidence attached</span>
              </div>
            </div>
          </section>
          <section className="analytics-module-section">
            <div className="analytics-section-heading">
              <div>
                <span>INSIDE DATA ANALYTICS</span>
                <h3>One workspace, the whole analysis loop.</h3>
              </div>
              <p>Live modules are functional now. Preview and next-phase modules are labelled honestly.</p>
            </div>
            <div className="analytics-module-grid">
              {MODULES.map((module) => (
                <button
                  key={`${module.id}-${module.title}`}
                  className="analytics-module-card"
                  onClick={() => setTab(module.id)}
                >
                  <span className={`analytics-status ${module.status}`}>{module.status}</span>
                  <strong>{module.title}</strong>
                  <p>{module.body}</p>
                  <span className="analytics-module-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )
    }

    return (
      <div className="analytics-overview">
        <div className="analytics-stats">
          <StatCard label="Datasets" value={datasets.length} note="local only" />
          <StatCard label="Rows" value={totalRows.toLocaleString()} note="profiled" />
          <StatCard label="Average quality" value={`${averageQuality}%`} note="missing + duplicates" />
          <StatCard
            label="Duplicate rows"
            value={datasets.reduce((sum, dataset) => sum + dataset.duplicateRows, 0).toLocaleString()}
            note="across all datasets"
          />
        </div>
        <div className="analytics-overview-grid">
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">RECENT DATASETS</span>
                <h2>Your local sources</h2>
              </div>
              <button className="analytics-btn small" onClick={() => void importFile()}>
                Import
              </button>
            </div>
            <div className="analytics-dataset-list">
              {datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  className={`analytics-dataset-row${dataset.id === datasetId ? ' active' : ''}`}
                  onClick={() => {
                    void selectDataset(dataset.id)
                    setTab('data')
                  }}
                >
                  <span className="analytics-dataset-mark">{dataset.sourceType.toUpperCase()}</span>
                  <span className="analytics-dataset-copy">
                    <strong>{dataset.name}</strong>
                    <small>
                      {dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} columns ·{' '}
                      {new Date(dataset.updatedAt).toLocaleDateString()}
                    </small>
                  </span>
                  <QualityBadge score={dataset.qualityScore} />
                </button>
              ))}
            </div>
          </section>
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">QUALITY WATCH</span>
                <h2>What needs attention</h2>
              </div>
            </div>
            <div className="analytics-watch-list">
              {datasets.filter(
                (dataset) => dataset.missingCells > 0 || dataset.duplicateRows > 0 || dataset.warning,
              ).length === 0 ? (
                <div className="analytics-clear">
                  <span>✓</span>
                  <div>
                    <strong>No structural issues found</strong>
                    <p>Profiling did not detect missing cells or duplicate rows. This is not a correctness guarantee.</p>
                  </div>
                </div>
              ) : (
                datasets
                  .filter((dataset) => dataset.missingCells > 0 || dataset.duplicateRows > 0 || dataset.warning)
                  .slice(0, 5)
                  .map((dataset) => (
                    <button
                      key={dataset.id}
                      className="analytics-watch-row"
                      onClick={() => {
                        void selectDataset(dataset.id)
                        setTab('prepare')
                      }}
                    >
                      <span>
                        <strong>{dataset.name}</strong>
                        <small>
                          {dataset.missingCells.toLocaleString()} missing cells ·{' '}
                          {dataset.duplicateRows.toLocaleString()} duplicates
                        </small>
                      </span>
                      <span>Prepare →</span>
                    </button>
                  ))
              )}
            </div>
          </section>
        </div>
        <section className="analytics-quick-actions">
          <button onClick={() => void runAuto()} disabled={autoBusy || !!busy}>
            <TabIcon id="automate" />
            <span>
              <strong>{autoBusy ? 'Running full auto…' : 'Run full auto'}</strong>
              <small>Prepare, analyse, chart and publish</small>
            </span>
          </button>
          <button onClick={() => setTab('analyze')}>
            <TabIcon id="analyze" />
            <span>
              <strong>Run a query</strong>
              <small>SQL or Python, with a result table</small>
            </span>
          </button>
          <button onClick={() => setTab('ai')}>
            <TabIcon id="ai" />
            <span>
              <strong>Ask the AI analyst</strong>
              <small>Schema + question → SQL → evidence</small>
            </span>
          </button>
          <button onClick={() => setTab('ml')}>
            <TabIcon id="ml" />
            <span>
              <strong>Forecast a trend</strong>
              <small>Linear preview with R² and caveat</small>
            </span>
          </button>
          <button onClick={() => setTab('governance')}>
            <TabIcon id="governance" />
            <span>
              <strong>Review the audit trail</strong>
              <small>See exactly what ran locally</small>
            </span>
          </button>
        </section>
      </div>
    )
  }

  function renderData() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    return (
      <div className="analytics-data-view">
        <section className="analytics-detail-head">
          <div>
            <span className="analytics-eyebrow">
              {detail.sourceType.toUpperCase()} · {detail.sourceName}
            </span>
            <h2>{detail.name}</h2>
            <p>
              {detail.rowCount.toLocaleString()} rows · {detail.columnCount} columns · imported{' '}
              {new Date(detail.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="analytics-detail-actions">
            <button className="analytics-btn small" onClick={() => void exportCsv()} disabled={!lastSql}>
              Export CSV
            </button>
            <button className="analytics-btn danger small" onClick={() => void deleteDataset()}>
              Delete local data
            </button>
          </div>
        </section>
        {detail.warning && <div className="analytics-banner warn">{detail.warning}</div>}
        <div className="analytics-stats compact">
          <StatCard label="Quality" value={<QualityBadge score={detail.qualityScore} />} note="transparent heuristic" />
          <StatCard label="Rows" value={detail.rowCount.toLocaleString()} />
          <StatCard label="Columns" value={detail.columnCount} />
          <StatCard label="Missing cells" value={detail.missingCells.toLocaleString()} />
          <StatCard label="Duplicate rows" value={detail.duplicateRows.toLocaleString()} />
        </div>
        <section className="analytics-card intro-card analytics-plan-prompt">
          <div>
            <span className="analytics-eyebrow">UNDERSTAND THE DATA</span>
            <h2>Read what the dataset is before calculating</h2>
            <p>
              Plot AI reads the schema, profile and bounded sample rows (with obvious identifiers
              redacted) to identify the grain, what each column appears to mean, and the questions
              worth asking. Every calculation still runs locally; the plan only chooses which
              evidence to produce.
            </p>
          </div>
          <button
            className="analytics-btn primary"
            onClick={() => void understandData()}
            disabled={planBusy || !!busy}
          >
            {planBusy ? 'Reading…' : aiPlan ? 'Read again' : 'Understand with AI'}
          </button>
        </section>
        {aiPlan && <AiPlanCard plan={aiPlan} />}
        <div className="analytics-split">
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">SCHEMA</span>
                <h2>Columns and profile</h2>
              </div>
            </div>
            <div className="analytics-table-wrap">
              <table className="analytics-table profile-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Nulls</th>
                    <th>Distinct</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.columns.map((column) => (
                    <tr key={column.name}>
                      <td title={column.name}>{column.name}</td>
                      <td>
                        <span className="analytics-type">{column.type}</span>
                      </td>
                      <td>{column.nullCount.toLocaleString()}</td>
                      <td>{column.distinctCount.toLocaleString()}</td>
                      <td>{formatCell(column.min)}</td>
                      <td>{formatCell(column.max)}</td>
                      <td>{column.mean === null ? '—' : formatNumber(column.mean)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">PREVIEW</span>
                <h2>First {detail.preview.rows.length} rows</h2>
              </div>
              <span className="analytics-muted">nulls shown as ∅</span>
            </div>
            <ResultTable
              result={{
                columns: detail.preview.columns,
                rows: detail.preview.rows,
                rowCount: detail.preview.rows.length,
                truncated: detail.preview.truncated,
                elapsedMs: 0,
              }}
              maxRows={50}
            />
          </section>
        </div>
        <div className="analytics-note">
          <strong>Local by design.</strong> The imported copy lives in a private SQLite database under
          the app’s userData folder. The original file is never modified.
        </div>
      </div>
    )
  }

  function renderPrepare() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    return (
      <div className="analytics-prepare-view">
        <section className="analytics-card intro-card">
          <div>
            <span className="analytics-eyebrow">PREPARE</span>
            <h2>Clean with a receipt</h2>
            <p>
              Each action makes a one-step backup first. Undo restores the dataset exactly as it was
              before the last clean. Nothing is written back to the source file.
            </p>
          </div>
          <button className="analytics-btn ghost" onClick={() => void undoClean()} disabled={!detail.canUndo || !!busy}>
            Undo last clean
          </button>
        </section>
        <div className="analytics-clean-grid">
          <article className="analytics-card clean-card">
            <span className="analytics-clean-icon">01</span>
            <h3>Remove duplicate rows</h3>
            <p>Keeps the first occurrence of each distinct row. All columns participate in the comparison.</p>
            <button
              className="analytics-btn primary small"
              onClick={() => void clean({ kind: 'drop_duplicates' })}
              disabled={!!busy}
            >
              Remove duplicates ({detail.duplicateRows.toLocaleString()})
            </button>
          </article>
          <article className="analytics-card clean-card">
            <span className="analytics-clean-icon">02</span>
            <h3>Drop rows with a null</h3>
            <p>Choose the column that must contain a value. Rows with a null in that column are removed.</p>
            <select value={cleanColumn} onChange={(event) => setCleanColumn(event.target.value)}>
              {detail.columns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </select>
            <button
              className="analytics-btn small"
              onClick={() => void clean({ kind: 'drop_nulls', column: cleanColumn })}
              disabled={!!busy || !cleanColumn}
            >
              Drop null rows
            </button>
          </article>
          <article className="analytics-card clean-card">
            <span className="analytics-clean-icon">03</span>
            <h3>Trim whitespace</h3>
            <p>Trims leading and trailing spaces from text values in one column. Numbers are untouched.</p>
            <select value={cleanColumn} onChange={(event) => setCleanColumn(event.target.value)}>
              {detail.columns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </select>
            <button
              className="analytics-btn small"
              onClick={() => void clean({ kind: 'trim', column: cleanColumn })}
              disabled={
                !!busy ||
                !cleanColumn ||
                (cleanColumnProfile?.type !== 'text' && cleanColumnProfile?.type !== 'date')
              }
            >
              Trim text
            </button>
          </article>
          <article className="analytics-card clean-card">
            <span className="analytics-clean-icon">04</span>
            <h3>Fill missing values</h3>
            <p>Use the numeric column mean, or a value you type. The filled count is reported after the action.</p>
            <div className="analytics-inline-form">
              <select value={cleanColumn} onChange={(event) => setCleanColumn(event.target.value)}>
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
              <input
                value={fillValue}
                onChange={(event) => setFillValue(event.target.value)}
                placeholder="Custom value"
              />
            </div>
            <div className="analytics-button-row">
              <button
                className="analytics-btn small"
                onClick={() => void clean({ kind: 'fill_mean', column: cleanColumn })}
                disabled={
                  !!busy ||
                  !cleanColumn ||
                  (cleanColumnProfile?.type !== 'integer' && cleanColumnProfile?.type !== 'real')
                }
              >
                Fill with mean
              </button>
              <button
                className="analytics-btn small"
                onClick={() => void clean({ kind: 'fill_value', column: cleanColumn, value: fillValue })}
                disabled={!!busy || !cleanColumn || fillValue === ''}
              >
                Fill custom
              </button>
            </div>
          </article>
        </div>
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">AFTER CLEANING</span>
              <h2>Current quality</h2>
            </div>
            <QualityBadge score={detail.qualityScore} />
          </div>
          <div className="analytics-stats compact">
            <StatCard label="Rows" value={detail.rowCount.toLocaleString()} />
            <StatCard label="Missing" value={detail.missingCells.toLocaleString()} />
            <StatCard label="Duplicates" value={detail.duplicateRows.toLocaleString()} />
            <StatCard label="Undo available" value={detail.canUndo ? 'Yes' : 'No'} />
          </div>
        </section>
      </div>
    )
  }

  function renderSqlMode() {
    const chartNumericColumns = result
      ? result.columns.filter((column) => {
          const index = result.columns.indexOf(column)
          return result.rows.some((row) => {
            const value = row[index]
            return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
          })
        })
      : []
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card query-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">SQLITE · READ ONLY</span>
              <h2>Query the active dataset</h2>
            </div>
            <div className="analytics-card-actions">
              <button className="analytics-btn small" onClick={() => void exportCsv()} disabled={!!busy || !result}>
                Export CSV
              </button>
              <button className="analytics-btn primary small" onClick={() => void runQuery()} disabled={!!busy}>
                {busy === 'query' ? 'Running…' : 'Run query'}
              </button>
            </div>
          </div>
          <textarea
            className="analytics-sql"
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            rows={9}
            aria-label="SQL query"
          />
          <div className="analytics-query-foot">
            <span>Table: <code>data</code> · single SELECT or WITH · writes are blocked</span>
            <span>{result ? `${result.rowCount.toLocaleString()} rows · ${result.elapsedMs} ms` : 'No query run yet'}</span>
          </div>
          {queryError && <div className="analytics-inline-error">{queryError}</div>}
        </section>
        {result && (
          <>
            <section className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <span className="analytics-eyebrow">CHART BUILDER</span>
                  <h2>Visualize this result</h2>
                </div>
              </div>
              {chartSpec ? (
                <>
                  <div className="analytics-chart-controls">
                    <label>
                      Chart
                      <select
                        aria-label="Chart type"
                        value={chartSpec.type}
                        onChange={(event) => {
                          const type = event.target.value as AnalyticsChartSpec['type']
                          setChartSpec(
                            type === 'scatter'
                              ? {
                                  ...chartSpec,
                                  type,
                                  x: chartNumericColumns[0] ?? chartSpec.x,
                                  y: chartNumericColumns[1] ?? chartNumericColumns[0] ?? chartSpec.y,
                                }
                              : { ...chartSpec, type },
                          )
                        }}
                      >
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                        <option value="pie">Pie</option>
                        <option value="donut">Donut</option>
                        <option value="scatter">Scatter</option>
                      </select>
                    </label>
                    <label>
                      {chartSpec.type === 'scatter' ? 'X (numeric)' : 'Label (X)'}
                      <select
                        value={chartSpec.x}
                        onChange={(event) => setChartSpec({ ...chartSpec, x: event.target.value })}
                      >
                        {(chartSpec.type === 'scatter' ? chartNumericColumns : result.columns).map((column) => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {chartSpec.type === 'scatter' ? 'Y (numeric)' : 'Value (Y)'}
                      <select
                        value={chartSpec.y}
                        onChange={(event) => setChartSpec({ ...chartSpec, y: event.target.value })}
                      >
                        {(chartSpec.type === 'scatter' ? chartNumericColumns : result.columns).map((column) => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </label>
                    {chartSpec.type !== 'scatter' && (
                      <label>
                        Aggregate
                        <select
                          value={chartSpec.aggregation}
                          onChange={(event) =>
                            setChartSpec({
                              ...chartSpec,
                              aggregation: event.target.value as AnalyticsChartSpec['aggregation'],
                            })
                          }
                        >
                          {['sum', 'avg', 'min', 'max', 'count'].map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <AnalyticsChart result={result} spec={chartSpec} />
                </>
              ) : (
                <div className="analytics-empty-inline">
                  The result needs one label column and one numeric column to draw a chart.
                </div>
              )}
            </section>
            <section className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <span className="analytics-eyebrow">EVIDENCE</span>
                  <h2>Query result</h2>
                </div>
                <span className="analytics-muted">
                  {result.truncated ? 'Row cap reached; export for the complete result.' : 'Complete result for this query.'}
                </span>
              </div>
              <ResultTable result={result} />
            </section>
          </>
        )}
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">SAVED VIEWS</span>
              <h2>Reusable analysis</h2>
            </div>
            <div className="analytics-inline-form">
              <input
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="View name"
                aria-label="Saved view name"
              />
              <button className="analytics-btn small" onClick={() => void saveView()} disabled={!!busy || !lastSql}>
                Save current
              </button>
            </div>
          </div>
          {views.length === 0 ? (
            <div className="analytics-empty-inline">
              Run a query, then save it with its chart. Saved views appear in Dashboards.
            </div>
          ) : (
            <div className="analytics-view-list">
              {views.map((view) => (
                <div key={view.id} className="analytics-view-row">
                  <button onClick={() => void openView(view)}>
                    <strong>{view.name}</strong>
                    <small>{new Date(view.updatedAt).toLocaleString()}</small>
                  </button>
                  <button className="analytics-icon-btn" onClick={() => void deleteView(view.id)} title="Delete view">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  function renderPythonMode() {
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">SAFE PYTHON · APP-GENERATED CODE</span>
              <h2>Python aggregation</h2>
            </div>
            <button className="analytics-btn primary small" onClick={() => void runPython()} disabled={!!busy}>
              {busy === 'python' ? 'Running…' : 'Run Python'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            No arbitrary Python is accepted. The app writes a fixed aggregation script, exports only
            the two selected columns to a temporary file, and runs it with Python’s isolated mode and a
            20 second timeout. If Python is unavailable, SQL analysis remains available.
          </p>
          <div className="analytics-python-form">
            <label>
              Group by
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                {detail?.columns.map((column) => (
                  <option key={column.name} value={column.name}>{column.name}</option>
                ))}
              </select>
            </label>
            <label>
              Metric
              <select value={metric} onChange={(event) => setMetric(event.target.value)}>
                {numericColumns.map((column) => (
                  <option key={column.name} value={column.name}>{column.name}</option>
                ))}
              </select>
            </label>
            <label>
              Aggregation
              <select
                value={aggregation}
                onChange={(event) => setAggregation(event.target.value as typeof aggregation)}
              >
                {['sum', 'avg', 'min', 'max', 'count'].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          {pythonResult && !pythonResult.ok && <div className="analytics-inline-error">{pythonResult.error}</div>}
          {pythonResult?.ok && pythonResult.result && (
            <>
              <div className="analytics-query-foot">
                <span>{pythonResult.result.rowCount.toLocaleString()} groups</span>
                <span>{pythonResult.elapsedMs ?? 0} ms</span>
              </div>
              <ResultTable result={pythonResult.result} />
            </>
          )}
          {pythonResult?.code && (
            <details className="analytics-code">
              <summary>Show the generated Python</summary>
              <pre>{pythonResult.code}</pre>
            </details>
          )}
        </section>
      </div>
    )
  }

  function renderJoinMode() {
    if (!detail) return null
    const candidates = datasets.filter((dataset) => dataset.id !== detail.id)
    const canJoin =
      !!joinRightId && !!joinLeftKey && !!joinRightKey && !!joinRightDetail && !busy
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">LOCAL JOIN · NEW DERIVED DATASET</span>
              <h2>Join two datasets</h2>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => void createJoin()}
              disabled={!canJoin}
            >
              {busy === 'join' ? 'Joining…' : 'Create joined dataset'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            Match one key column in <strong>{detail.name}</strong> to one key column in another
            local dataset. The result is materialized as a new dataset; both sources stay
            unchanged. Right-hand columns that collide with a left column are prefixed{' '}
            <code>right_</code>. Joins are capped at 250,000 rows.
          </p>
          {candidates.length === 0 ? (
            <div className="analytics-empty-inline">
              Import a second dataset to join with {detail.name}.
            </div>
          ) : (
            <div className="analytics-join-form">
              <label>
                Right dataset
                <select
                  aria-label="Right dataset"
                  value={joinRightId}
                  onChange={(event) => {
                    setJoinRightId(event.target.value)
                    setJoinRightKey('')
                    setJoinResult(null)
                    setJoinError('')
                  }}
                >
                  <option value="">Choose a dataset</option>
                  {candidates.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} · {dataset.rowCount.toLocaleString()} rows
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Left key · {detail.name}
                <select
                  aria-label="Left join key"
                  value={joinLeftKey}
                  onChange={(event) => {
                    setJoinLeftKey(event.target.value)
                    setJoinResult(null)
                  }}
                >
                  {detail.columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name} · {column.type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Right key
                <select
                  aria-label="Right join key"
                  value={joinRightKey}
                  onChange={(event) => {
                    setJoinRightKey(event.target.value)
                    setJoinResult(null)
                  }}
                  disabled={!joinRightDetail}
                >
                  <option value="">
                    {joinRightDetail ? 'Choose a column' : 'Choose a right dataset first'}
                  </option>
                  {joinRightDetail?.columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name} · {column.type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Join type
                <select
                  aria-label="Join type"
                  value={joinType}
                  onChange={(event) => {
                    setJoinType(event.target.value as AnalyticsJoinType)
                    setJoinResult(null)
                  }}
                >
                  <option value="left">Left · keep every left row</option>
                  <option value="inner">Inner · only matching rows</option>
                </select>
              </label>
              <label className="analytics-join-name">
                New dataset name
                <input
                  aria-label="Joined dataset name"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder={`${detail.name} + ${joinRightDetail?.name ?? 'dataset'}`}
                />
              </label>
            </div>
          )}
          <div className="analytics-query-foot">
            <span>
              Output: <code>data</code> in a new local SQLite dataset
            </span>
            <span>
              {joinRightDetail
                ? `${joinRightDetail.rowCount.toLocaleString()} right rows · ${joinRightDetail.columnCount} columns`
                : 'No right dataset selected'}
            </span>
          </div>
          {joinError && <div className="analytics-inline-error">{joinError}</div>}
        </section>

        {joinResult?.ok && joinResult.dataset && (
          <section className="analytics-card analytics-join-result">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">JOIN EVIDENCE</span>
                <h2>{joinResult.dataset.name}</h2>
              </div>
              <button
                className="analytics-btn primary small"
                onClick={() => void openJoinedDataset()}
              >
                Open dataset
              </button>
            </div>
            <div className="analytics-join-summary">
              <span>
                <strong>{joinResult.dataset.rowCount.toLocaleString()}</strong> rows
              </span>
              <span>
                <strong>{joinResult.dataset.columnCount}</strong> columns
              </span>
              <span>
                <strong>{joinType}</strong> join
              </span>
              {joinResult.elapsedMs !== undefined && <span>{joinResult.elapsedMs} ms</span>}
            </div>
            {joinResult.warning && (
              <div className="analytics-banner warn">{joinResult.warning}</div>
            )}
            {joinResult.sql && (
              <div className="analytics-code-block">
                <div className="analytics-code-head">
                  <span>Exact logical join SQL</span>
                  <span>Sources remain unchanged</span>
                </div>
                <pre>{joinResult.sql}</pre>
              </div>
            )}
            <p className="analytics-intro-copy">
              Open the new dataset to query, chart, clean, or delete it independently. Its profile,
              warnings and audit event are stored locally.
            </p>
          </section>
        )}
      </div>
    )
  }

  function renderAppendMode() {
    if (!detail) return null
    const candidates = datasets.filter((dataset) => dataset.id !== detail.id)
    const selected = candidates.find((dataset) => dataset.id === appendRightId)
    const canAppend = !!appendRightId && !busy
    const resultMode = appendResult?.mode ?? appendMode
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">LOCAL APPEND · NEW DERIVED DATASET</span>
              <h2>Stack rows from two datasets</h2>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => void createAppend()}
              disabled={!canAppend}
            >
              {busy === 'append' ? 'Appending…' : 'Create appended dataset'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            Append rows from <strong>{detail.name}</strong> and another local dataset with the same
            column names. Columns are aligned by name. Choose <strong>all rows</strong> to keep
            duplicates or <strong>distinct</strong> to remove exact duplicate rows. Both sources stay
            unchanged, and the result is capped at 250,000 rows.
          </p>
          {candidates.length === 0 ? (
            <div className="analytics-empty-inline">
              Import a second dataset with the same columns to append to {detail.name}.
            </div>
          ) : (
            <div className="analytics-join-form">
              <label>
                Second dataset
                <select
                  aria-label="Second dataset to append"
                  value={appendRightId}
                  onChange={(event) => {
                    setAppendRightId(event.target.value)
                    setAppendResult(null)
                    setAppendError('')
                  }}
                >
                  <option value="">Choose a dataset</option>
                  {candidates.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} · {dataset.rowCount.toLocaleString()} rows
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Append mode
                <select
                  aria-label="Append mode"
                  value={appendMode}
                  onChange={(event) => {
                    setAppendMode(event.target.value as AnalyticsAppendMode)
                    setAppendResult(null)
                  }}
                >
                  <option value="all">All rows · UNION ALL keeps duplicates</option>
                  <option value="distinct">Distinct · UNION removes exact duplicates</option>
                </select>
              </label>
              <label className="analytics-join-name">
                New dataset name
                <input
                  aria-label="Appended dataset name"
                  value={appendName}
                  onChange={(event) => setAppendName(event.target.value)}
                  placeholder={`${detail.name} + ${selected?.name ?? 'dataset'}`}
                />
              </label>
            </div>
          )}
          <div className="analytics-query-foot">
            <span>
              Output: <code>data</code> in a new local SQLite dataset
            </span>
            <span>
              {selected
                ? `${selected.rowCount.toLocaleString()} rows · ${selected.columnCount} columns`
                : 'No second dataset selected'}
            </span>
          </div>
          {appendError && <div className="analytics-inline-error">{appendError}</div>}
        </section>

        {appendResult?.ok && appendResult.dataset && (
          <section className="analytics-card analytics-join-result">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">APPEND EVIDENCE</span>
                <h2>{appendResult.dataset.name}</h2>
              </div>
              <button
                className="analytics-btn primary small"
                onClick={() => void openAppendedDataset()}
              >
                Open dataset
              </button>
            </div>
            <div className="analytics-join-summary">
              <span>
                <strong>{appendResult.dataset.rowCount.toLocaleString()}</strong> rows
              </span>
              <span>
                <strong>{appendResult.dataset.columnCount}</strong> columns
              </span>
              <span>
                <strong>{resultMode === 'distinct' ? 'distinct' : 'all rows'}</strong>
              </span>
              {appendResult.elapsedMs !== undefined && <span>{appendResult.elapsedMs} ms</span>}
            </div>
            {appendResult.warning && (
              <div className="analytics-banner warn">{appendResult.warning}</div>
            )}
            {appendResult.sql && (
              <div className="analytics-code-block">
                <div className="analytics-code-head">
                  <span>Exact logical union SQL</span>
                  <span>Sources remain unchanged</span>
                </div>
                <pre>{appendResult.sql}</pre>
              </div>
            )}
            <p className="analytics-intro-copy">
              Open the new dataset to query, chart, clean, or delete it independently. Its profile,
              warnings and audit event are stored locally.
            </p>
          </section>
        )}
      </div>
    )
  }

  function renderPivotMode() {
    if (!detail) return null
    const evidence = exploreResult?.kind === 'pivot' ? exploreResult : null
    const matrix =
      evidence && evidence.result.columns.length >= 3
        ? toMatrix(evidence.result.rows, 0, 1, 2)
        : null
    const canTotal = evidence?.aggregation === 'sum' || evidence?.aggregation === 'count'
    const columnTotals =
      matrix && canTotal
        ? matrix.columns.map((_, x) =>
            matrix.rows.reduce((sum, __, y) => sum + (matrix.values[y]?.[x] ?? 0), 0),
          )
        : []
    const rowTotals =
      matrix && canTotal
        ? matrix.rows.map((_, y) =>
            matrix.columns.reduce((sum, __, x) => sum + (matrix.values[y]?.[x] ?? 0), 0),
          )
        : []
    const grandTotal = rowTotals.reduce((sum, value) => sum + value, 0)
    const oneAxisRows = evidence?.result.columns.length === 2 ? evidence.result.rows : []
    const oneAxisTotal = oneAxisRows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0)
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">EXPLORE · PIVOT</span>
              <h2>Turn rows into a cross-tab</h2>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => void runExplore()}
              disabled={!!busy || !pivotRows}
            >
              {busy === 'explore' ? 'Building…' : 'Build pivot'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            Group by one or two columns and aggregate a measure. The result is a real SQLite
            query, so every cell can be traced back to the exact SQL shown below. Totals are only
            displayed for <strong>sum</strong> and <strong>count</strong>; averaging already
            averaged groups would be misleading.
          </p>
          <div className="analytics-join-form analytics-explore-form">
            <label>
              Rows
              <select
                aria-label="Pivot rows"
                value={pivotRows}
                onChange={(event) => {
                  setPivotRows(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Columns (optional)
              <select
                aria-label="Pivot columns"
                value={pivotColumns}
                onChange={(event) => {
                  setPivotColumns(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                <option value="">No column split</option>
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Metric
              <select
                aria-label="Pivot metric"
                value={pivotMetric}
                onChange={(event) => {
                  setPivotMetric(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                <option value="">Count rows</option>
                {detail.columns
                  .filter((column) => column.type === 'integer' || column.type === 'real')
                  .map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name} · {column.type}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Aggregation
              <select
                aria-label="Pivot aggregation"
                value={pivotAggregation}
                onChange={(event) => {
                  setPivotAggregation(event.target.value as AnalyticsExploreAggregation)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {['sum', 'avg', 'min', 'max', 'count'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="analytics-query-foot">
            <span>
              Table: <code>data</code> · read-only pivot
            </span>
            <span>{pivotRows ? `${detail.rowCount.toLocaleString()} source rows` : 'Choose a row column'}</span>
          </div>
          {exploreError && <div className="analytics-inline-error">{exploreError}</div>}
        </section>

        {evidence && (
          <section className="analytics-card analytics-join-result">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">PIVOT EVIDENCE</span>
                <h2>
                  {evidence.result.rowCount.toLocaleString()} groups · {evidence.result.elapsedMs} ms
                </h2>
              </div>
              <div className="analytics-card-actions">
                <button className="analytics-btn ghost small" onClick={() => void exportExploreCsv()}>
                  Export CSV
                </button>
                <button
                  className="analytics-btn small"
                  onClick={() => void openExploreInSql(evidence.sql)}
                >
                  Open in SQL
                </button>
              </div>
            </div>
            {matrix ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table analytics-pivot-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      {matrix.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                      {canTotal && <th>Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row, y) => (
                      <tr key={row}>
                        <th scope="row">{row}</th>
                        {matrix.columns.map((column, x) => (
                          <td key={`${row}-${column}`}>{formatCell(matrix.values[y]?.[x] ?? null)}</td>
                        ))}
                        {canTotal && <td><strong>{formatCell(rowTotals[y])}</strong></td>}
                      </tr>
                    ))}
                  </tbody>
                  {canTotal && (
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        {matrix.columns.map((column, x) => (
                          <td key={`total-${column}`}>{formatCell(columnTotals[x])}</td>
                        ))}
                        <td>{formatCell(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : oneAxisRows.length > 0 ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table analytics-pivot-table">
                  <thead>
                    <tr>
                      <th>{evidence.result.columns[0]}</th>
                      <th>{evidence.result.columns[1]}</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneAxisRows.map((row, index) => {
                      const value = Number(row[1]) || 0
                      return (
                        <tr key={`${row[0]}-${index}`}>
                          <th scope="row">{formatCell(row[0])}</th>
                          <td>{formatCell(row[1])}</td>
                          <td>
                            {oneAxisTotal > 0
                              ? `${((value / oneAxisTotal) * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="analytics-empty-inline">The pivot returned no rows.</div>
            )}
            <div className="analytics-code-block">
              <div className="analytics-code-head">
                <span>Executed pivot SQL</span>
                <button
                  onClick={() => {
                    void (async () => {
                      try {
                        if (!navigator.clipboard) throw new Error('Clipboard is unavailable.')
                        await navigator.clipboard.writeText(evidence.sql)
                        notify('Pivot SQL copied.')
                      } catch {
                        notify('The SQL could not be copied.', 'bad')
                      }
                    })()
                  }}
                >
                  Copy
                </button>
              </div>
              <pre>{evidence.sql}</pre>
            </div>
          </section>
        )}
      </div>
    )
  }

  function renderFunnelMode() {
    if (!detail) return null
    const evidence = exploreResult?.kind === 'funnel' ? exploreResult : null
    const eventProfile = detail.columns.find((column) => column.name === funnelEvent)
    const rows = evidence?.result.rows ?? []
    const first = Number(rows[0]?.[2] ?? 0)
    const completed = Number(rows[rows.length - 1]?.[2] ?? 0)
    const overall = first > 0 ? (completed / first) * 100 : 0
    const steps = exploreStepList(funnelSteps)
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">EXPLORE · FUNNEL</span>
              <h2>See where users drop off</h2>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => void runExplore()}
              disabled={!!busy || !funnelUser || !funnelEvent || !funnelTime || steps.length < 2}
            >
              {busy === 'explore' ? 'Building…' : 'Build funnel'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            Each step counts users at the <strong>first occurrence</strong> of that event, and a
            later step only counts when it happens at or after the previous step. Enter one event
            value per line, in order. This is an event-order funnel, not a causal claim.
          </p>
          <div className="analytics-join-form analytics-explore-form">
            <label>
              User / entity
              <select
                aria-label="Funnel user column"
                value={funnelUser}
                onChange={(event) => {
                  setFunnelUser(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event column
              <select
                aria-label="Funnel event column"
                value={funnelEvent}
                onChange={(event) => {
                  setFunnelEvent(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time / order column
              <select
                aria-label="Funnel time column"
                value={funnelTime}
                onChange={(event) => {
                  setFunnelTime(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label className="analytics-join-name">
              Steps · one per line
              <textarea
                aria-label="Funnel steps"
                value={funnelSteps}
                onChange={(event) => {
                  setFunnelSteps(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
                rows={4}
                placeholder={'visited\nsigned_up\npurchased'}
              />
            </label>
          </div>
          {eventProfile && eventProfile.topValues.length > 0 && (
            <div className="analytics-example-row">
              {eventProfile.topValues.slice(0, 8).map((entry) => (
                <button
                  key={entry.value}
                  onClick={() => {
                    const current = exploreStepList(funnelSteps)
                    if (current.includes(entry.value)) return
                    setFunnelSteps([...current, entry.value].join('\n'))
                    setExploreResult(null)
                  }}
                >
                  + {entry.value}
                </button>
              ))}
            </div>
          )}
          <div className="analytics-query-foot">
            <span>
              {steps.length} step{steps.length === 1 ? '' : 's'} · first occurrence per user
            </span>
            <span>{detail.rowCount.toLocaleString()} source rows</span>
          </div>
          {exploreError && <div className="analytics-inline-error">{exploreError}</div>}
        </section>

        {evidence && (
          <section className="analytics-card analytics-join-result">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">FUNNEL EVIDENCE</span>
                <h2>{formatNumber(completed)} of {formatNumber(first)} users completed all steps</h2>
              </div>
              <div className="analytics-card-actions">
                <button className="analytics-btn ghost small" onClick={() => void exportExploreCsv()}>
                  Export CSV
                </button>
                <button
                  className="analytics-btn small"
                  onClick={() => void openExploreInSql(evidence.sql)}
                >
                  Open in SQL
                </button>
              </div>
            </div>
            <div className="analytics-join-summary">
              <span><strong>{formatNumber(first)}</strong> entered</span>
              <span><strong>{formatNumber(completed)}</strong> completed</span>
              <span><strong>{overall.toFixed(1)}%</strong> overall conversion</span>
              <span>{evidence.result.elapsedMs} ms</span>
            </div>
            {rows.length > 0 ? (
              <div className="analytics-funnel">
                {rows.map((row, index) => {
                  const users = Number(row[2]) || 0
                  const previous = index === 0 ? users : Number(rows[index - 1]?.[2]) || 0
                  const fromFirst = first > 0 ? (users / first) * 100 : 0
                  const fromPrevious = previous > 0 ? (users / previous) * 100 : 0
                  return (
                    <div className="analytics-funnel-row" key={`${row[0]}-${index}`}>
                      <div className="analytics-funnel-label">
                        <span className="analytics-funnel-step">{index + 1}</span>
                        <div>
                          <strong>{formatCell(row[1])}</strong>
                          <small>
                            {formatNumber(users)} users · {fromFirst.toFixed(1)}% of step 1
                            {index > 0 ? ` · ${fromPrevious.toFixed(1)}% from previous` : ''}
                          </small>
                        </div>
                      </div>
                      <div className="analytics-funnel-track" aria-hidden="true">
                        <div style={{ width: `${Math.max(0, Math.min(100, fromFirst))}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="analytics-empty-inline">
                No users matched these steps. Check the event values, order column and step order.
              </div>
            )}
            <details className="analytics-code" open>
              <summary>Exact funnel result</summary>
              <ResultTable result={evidence.result} />
            </details>
            <div className="analytics-code-block">
              <div className="analytics-code-head">
                <span>Executed funnel SQL</span>
                <span>First occurrence, ordered</span>
              </div>
              <pre>{evidence.sql}</pre>
            </div>
          </section>
        )}
      </div>
    )
  }

  function renderCohortMode() {
    if (!detail) return null
    const evidence = exploreResult?.kind === 'cohort' ? exploreResult : null
    const matrix = evidence ? toMatrix(evidence.result.rows, 0, 1, 2) : null
    const cohortSizes = new Map<string, number>()
    if (evidence) {
      for (const row of evidence.result.rows) {
        if (row[0] === null || row[0] === undefined) continue
        cohortSizes.set(String(row[0]), Number(row[3]) || 0)
      }
    }
    const dateColumns = detail.columns.filter((column) => column.type === 'date')
    return (
      <div className="analytics-analyze-stack">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">EXPLORE · COHORT</span>
              <h2>Monthly retention by first activity</h2>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => void runExplore()}
              disabled={!!busy || !cohortUser || !cohortDate}
            >
              {busy === 'explore' ? 'Building…' : 'Build cohort'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            Each user is assigned to the month of their first activity. Period 0 is that month;
            later columns show the share of the same users who were active again. Dates must be
            ISO-like values such as <code>2026-01-31</code> so SQLite can group them by month.
          </p>
          <div className="analytics-join-form analytics-explore-form">
            <label>
              User / entity
              <select
                aria-label="Cohort user column"
                value={cohortUser}
                onChange={(event) => {
                  setCohortUser(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Activity date
              <select
                aria-label="Cohort date column"
                value={cohortDate}
                onChange={(event) => {
                  setCohortDate(event.target.value)
                  setExploreResult(null)
                  setExploreError('')
                }}
              >
                {detail.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} · {column.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Monthly periods
              <input
                type="number"
                min={0}
                max={36}
                value={cohortPeriods}
                onChange={(event) => {
                  setCohortPeriods(
                    Math.max(0, Math.min(36, Number.parseInt(event.target.value, 10) || 0)),
                  )
                  setExploreResult(null)
                }}
              />
            </label>
          </div>
          {dateColumns.length === 0 && (
            <div className="analytics-banner warn">
              No date column was detected. Choose an ISO-like date text column, or prepare the
              date column before building a cohort.
            </div>
          )}
          <div className="analytics-query-foot">
            <span>Period 0 = first activity month · max 36 monthly periods</span>
            <span>{detail.rowCount.toLocaleString()} source rows</span>
          </div>
          {exploreError && <div className="analytics-inline-error">{exploreError}</div>}
        </section>

        {evidence && (
          <section className="analytics-card analytics-join-result">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">COHORT EVIDENCE</span>
                <h2>{matrix?.rows.length ?? 0} monthly cohorts</h2>
              </div>
              <div className="analytics-card-actions">
                <button className="analytics-btn ghost small" onClick={() => void exportExploreCsv()}>
                  Export CSV
                </button>
                <button
                  className="analytics-btn small"
                  onClick={() => void openExploreInSql(evidence.sql)}
                >
                  Open in SQL
                </button>
              </div>
            </div>
            {matrix && matrix.rows.length > 0 ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table analytics-pivot-table analytics-cohort-table">
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Users</th>
                      {matrix.columns.map((period) => (
                        <th key={period}>{period === '0' ? 'Month 0' : `M+${period}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((cohort, y) => {
                      const size = cohortSizes.get(cohort) ?? 0
                      return (
                        <tr key={cohort}>
                          <th scope="row">{cohort}</th>
                          <td>{formatNumber(size)}</td>
                          {matrix.columns.map((period, x) => {
                            const users = matrix.values[y]?.[x]
                            const share =
                              size > 0 && users !== null ? (users / size) * 100 : null
                            return (
                              <td key={`${cohort}-${period}`}>
                                {share === null ? '—' : `${share.toFixed(1)}%`}
                                {users !== null && (
                                  <small className="analytics-cohort-count">
                                    {formatNumber(users)} users
                                  </small>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="analytics-empty-inline">
                No cohorts were produced. Check that the date values are ISO-like and the user
                column contains stable identifiers.
              </div>
            )}
            <div className="analytics-code-block">
              <div className="analytics-code-head">
                <span>Executed cohort SQL</span>
                <span>Monthly retention</span>
              </div>
              <pre>{evidence.sql}</pre>
            </div>
          </section>
        )}
      </div>
    )
  }

  function renderAnalyze() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    return (
      <div className="analytics-analyze-view">
        <div className="analytics-mode-switch">
          <button className={mode === 'sql' ? 'active' : ''} onClick={() => setMode('sql')}>
            SQL
          </button>
          <button className={mode === 'python' ? 'active' : ''} onClick={() => setMode('python')}>
            Python
          </button>
          <button className={mode === 'pivot' ? 'active' : ''} onClick={() => setMode('pivot')}>
            Pivot
          </button>
          <button className={mode === 'funnel' ? 'active' : ''} onClick={() => setMode('funnel')}>
            Funnel
          </button>
          <button className={mode === 'cohort' ? 'active' : ''} onClick={() => setMode('cohort')}>
            Cohort
          </button>
          <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
            Join
          </button>
          <button className={mode === 'append' ? 'active' : ''} onClick={() => setMode('append')}>
            Append
          </button>
          <span>{detail.name}</span>
        </div>
        {mode === 'sql'
          ? renderSqlMode()
          : mode === 'python'
            ? renderPythonMode()
            : mode === 'pivot'
              ? renderPivotMode()
              : mode === 'funnel'
                ? renderFunnelMode()
                : mode === 'cohort'
                  ? renderCohortMode()
                  : mode === 'join'
                    ? renderJoinMode()
                    : renderAppendMode()}
      </div>
    )
  }

  function renderAi() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    return (
      <div className="analytics-ai-view">
        <section className="analytics-ai-hero">
          <span className="analytics-pill">EVIDENCE-BACKED AI ANALYST</span>
          <h2>Ask in plain language. See the calculation.</h2>
          <p>
            The analyst receives the column schema, profile summary, bounded sample/query rows and
            any page content you ask it to inspect. It returns a plan; Plot Docs executes the SQL
            locally against the dataset, shows the exact result, and explains what that result means
            without inventing numbers.
          </p>
          <div className="analytics-ai-composer">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void askAi()
              }}
              rows={3}
              placeholder="Which region had the highest revenue last quarter, and by how much?"
            />
            <button className="analytics-btn primary" onClick={() => void askAi()} disabled={!!busy || !question.trim()}>
              {busy === 'ai' ? 'Analyzing…' : 'Ask analyst'}
            </button>
          </div>
          <div className="analytics-example-row">
            {[
              'Which category has the highest total?',
              'Show the monthly trend of sales.',
              'Which rows have missing values?',
            ].map((example) => (
              <button key={example} onClick={() => setQuestion(example)}>
                {example}
              </button>
            ))}
          </div>
          <div className="analytics-privacy-line">
            <span>AI is optional.</span> Only the schema, profile, bounded sample/query rows and
            inspected page content leave the app; obvious identifiers are redacted and the full
            dataset stays local. The AI never returns a result that was not executed here.
          </div>
        </section>
        {aiResult && (
          <section className="analytics-card ai-result-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">ANALYSIS · {aiResult.model ?? 'LOCAL EVIDENCE'}</span>
                <h2>{aiResult.ok ? 'Evidence from the query' : 'No result produced'}</h2>
              </div>
              {aiResult.ok && aiResult.result && (
                <button className="analytics-btn small" onClick={openAiInAnalyze}>
                  Open in Analyze
                </button>
              )}
            </div>
            {aiResult.error && <div className="analytics-inline-error">{aiResult.error}</div>}
            {aiResult.explanation && <p className="analytics-ai-explanation">{aiResult.explanation}</p>}
            {aiResult.meaning && (
              <div className={`analytics-ai-meaning ${aiResult.meaningSource ?? 'local'}`}>
                <span>
                  {aiResult.meaningSource === 'ai'
                    ? `AI reading${aiResult.meaningModel ? ` · ${aiResult.meaningModel}` : ''}`
                    : 'Local reading'}
                </span>
                <p>{aiResult.meaning}</p>
              </div>
            )}
            {aiResult.sql && (
              <div className="analytics-code-block">
                <div className="analytics-code-head">
                  <span>Executed SQL</span>
                  <button
                    onClick={() => {
                      void (async () => {
                        try {
                          if (!navigator.clipboard) throw new Error('Clipboard is unavailable.')
                          await navigator.clipboard.writeText(aiResult.sql ?? '')
                          notify('SQL copied.')
                        } catch {
                          notify('The SQL could not be copied.', 'bad')
                        }
                      })()
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre>{aiResult.sql}</pre>
              </div>
            )}
            {aiResult.caveats.length > 0 && (
              <div className="analytics-caveats">
                <strong>Caveats</strong>
                <ul>
                  {aiResult.caveats.map((caveat, index) => (
                    <li key={index}>{caveat}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiResult.result && (
              <>
                {aiResult.chart && <AnalyticsChart result={aiResult.result} spec={aiResult.chart} />}
                <ResultTable result={aiResult.result} />
              </>
            )}
          </section>
        )}
      </div>
    )
  }

  function renderMl() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    return (
      <div className="analytics-ml-view">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">ML LAB · PREVIEW</span>
              <h2>Linear trend forecast</h2>
            </div>
            <button className="analytics-btn primary small" onClick={() => void runForecast()} disabled={!!busy}>
              {busy === 'forecast' ? 'Fitting…' : 'Fit trend'}
            </button>
          </div>
          <p className="analytics-intro-copy">
            A transparent baseline, not a production forecasting model. It fits ordinary least squares
            to two numeric columns, reports R², the slope confidence interval, the residual standard
            error and an approximate 95% prediction interval, then extrapolates six points at the last
            observed spacing.
          </p>
          <div className="analytics-python-form">
            <label>
              X (numeric)
              <select value={forecastX} onChange={(event) => setForecastX(event.target.value)}>
                {numericColumns.map((column) => (
                  <option key={column.name} value={column.name}>{column.name}</option>
                ))}
              </select>
            </label>
            <label>
              Y (numeric)
              <select value={forecastY} onChange={(event) => setForecastY(event.target.value)}>
                {numericColumns.map((column) => (
                  <option key={column.name} value={column.name}>{column.name}</option>
                ))}
              </select>
            </label>
          </div>
          {forecast && !forecast.ok && <div className="analytics-inline-error">{forecast.error}</div>}
          {forecast?.ok && forecastResult && (
            <div className="analytics-forecast-result">
              <div className="analytics-stats compact">
                <StatCard label="Observations" value={formatNumber(forecast.n ?? forecast.points?.length ?? 0)} />
                <StatCard label="Slope" value={formatNumber(forecast.slope ?? 0)} />
                <StatCard label="R²" value={formatNumber(forecast.r2 ?? 0)} />
                <StatCard
                  label="Residual SE"
                  value={
                    forecast.residualStdError === undefined
                      ? '—'
                      : formatNumber(forecast.residualStdError)
                  }
                  note="lower is tighter"
                />
                <StatCard
                  label="Slope 95% CI"
                  value={
                    forecast.slopeCi95
                      ? `${formatNumber(forecast.slopeCi95[0])} to ${formatNumber(forecast.slopeCi95[1])}`
                      : '—'
                  }
                  note="approximate"
                />
              </div>
              <AnalyticsChart
                result={forecastResult}
                spec={{
                  type: 'line',
                  x: forecast.xColumn ?? '',
                  y: forecast.yColumn ?? '',
                  aggregation: 'sum',
                }}
                height={300}
              />
              <div className="analytics-note">
                <strong>Read the line carefully.</strong> The solid line includes six extrapolated
                points after the last observation. The forecast table shows the approximate 95%
                prediction interval; it widens away from the observed range and is not a guarantee.
                {' '}
                {forecast.method}
              </div>
              {forecastTable && (
                <details className="analytics-code" open>
                  <summary>Observed and forecast values</summary>
                  <ResultTable result={forecastTable} maxRows={260} />
                </details>
              )}
            </div>
          )}
          {numericColumns.length < 2 && (
            <div className="analytics-empty-inline">This dataset needs two numeric columns for a trend fit.</div>
          )}
        </section>
      </div>
    )
  }

  function renderDashboards() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    const takeaways = views
      .map((view) => view.takeaway)
      .filter((value): value is string => !!value)
    const lastUpdated = views.reduce((latest, view) => Math.max(latest, view.updatedAt), 0)
    const evidenceBacked = views.filter((view) => view.takeaway || view.meaning).length
    const highConfidence = views.filter((view) => view.confidence === 'high').length
    const filterLabel = dashboardFilter ? dashboardFilterLabel(dashboardFilter) : null
    const filteredCoverage = dashboardFilter
      ? views.filter((view) => applyDashboardFilter(view.sql, dashboardFilter).applied).length
      : views.length
    const briefingHeadline = filterLabel
      ? `Live slice · ${filterLabel}`
      : takeaways.length > 0
        ? `${takeaways.length} evidence-backed signal${takeaways.length === 1 ? '' : 's'} on this dashboard`
        : `${views.length} live card${views.length === 1 ? '' : 's'}, each tied to a saved calculation`
    const briefingBody = filterLabel
      ? `${filteredCoverage} of ${views.length} cards apply this slicer before aggregation. Each card shows a live local reading computed from the filtered rows; stored readings describe the full dataset and are hidden while the slicer is active.`
      : takeaways.length > 0
        ? takeaways.slice(0, 3).join(' · ')
        : 'Every card re-runs its saved read-only SQL against the local dataset. Open a card to inspect its exact rows, method and uncertainty before acting.'
    return (
      <div className="analytics-dashboard-view">
        <section className="analytics-card intro-card analytics-dashboard-intro">
          <div>
            <span className="analytics-eyebrow">POWER DASHBOARD</span>
            <h2>Dashboards built from evidence</h2>
            <p>
              Every card re-runs its saved SQL against the local dataset, explains what the result
              means, and keeps the calculation visible. Queries are read-only and the same row cap
              applies.
            </p>
            <p className="analytics-dashboard-source">
              {detail.name} · {formatNumber(detail.rowCount)} rows ·{' '}
              {Math.round(detail.qualityScore)}% quality
            </p>
          </div>
          <div className="analytics-dashboard-actions">
            <button
              className="analytics-btn ghost small"
              onClick={() => setDashboardRefresh((value) => value + 1)}
              disabled={views.length === 0}
            >
              Refresh all
            </button>
            <button className="analytics-btn ghost small" onClick={() => setTab('analyze')}>
              Create in Analyze
            </button>
          </div>
        </section>
        {views.length > 0 && (
          <>
            <section className="analytics-dashboard-toolbar" aria-label="Dashboard controls">
              <div className="analytics-dashboard-slicer">
                <div className="analytics-dashboard-control-label">
                  <span className="analytics-eyebrow">SLICER</span>
                  <small>Applied before each card&apos;s saved aggregation.</small>
                </div>
                {dashboardSlicerColumns.length > 0 ? (
                  <>
                    <label className="analytics-dashboard-control">
                      <span>Column</span>
                      <select
                        aria-label="Slicer column"
                        value={dashboardSlicerColumn?.name ?? ''}
                        onChange={(event) => chooseSlicerColumn(event.target.value)}
                      >
                        <option value="">All data</option>
                        {dashboardSlicerColumns.map((column) => (
                          <option key={column.name} value={column.name}>
                            {column.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {dashboardSlicerColumn && (
                      <label className="analytics-dashboard-control">
                        <span>Value</span>
                        <select
                          aria-label="Slicer value"
                          value={dashboardFilter?.value ?? ALL_SLICER_VALUES}
                          onChange={(event) => chooseSlicerValue(event.target.value)}
                        >
                          <option value={ALL_SLICER_VALUES}>
                            All values · {formatNumber(detail.rowCount)} rows
                          </option>
                          {dashboardFilter &&
                            !dashboardSlicerColumn.topValues.some(
                              (entry) => entry.value === dashboardFilter.value,
                            ) && (
                              <option value={dashboardFilter.value}>
                                {dashboardFilter.value || '(empty)'} · selected mark
                              </option>
                            )}
                          {dashboardSlicerColumn.topValues.map((entry) => (
                            <option key={entry.value} value={entry.value}>
                              {entry.value || '(empty)'} · {entry.count.toLocaleString()} rows
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {dashboardFilter && (
                      <button
                        className="analytics-btn ghost small analytics-dashboard-clear-filter"
                        onClick={() => setDashboardFilter(null)}
                      >
                        Clear filter
                      </button>
                    )}
                  </>
                ) : (
                  <span className="analytics-dashboard-control-empty">
                    No low-cardinality segment column is available for a slicer.
                  </span>
                )}
              </div>
              <div
                className="analytics-dashboard-control analytics-dashboard-layout"
                role="group"
                aria-label="Dashboard layout"
              >
                <span>Layout</span>
                <div className="analytics-layout-switch">
                  {(
                    [
                      ['auto', 'Auto'],
                      ['1', '1 col'],
                      ['2', '2 col'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`analytics-layout-btn ${dashboardLayout === value ? 'active' : ''}`}
                      aria-label={`Dashboard layout: ${label}`}
                      aria-pressed={dashboardLayout === value}
                      onClick={() => setDashboardLayout(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <div className="analytics-dashboard-kpis">
              <StatCard label="Cards" value={views.length} note="live saved views" />
              <StatCard
                label="Evidence-backed"
                value={`${evidenceBacked}/${views.length}`}
                note={dashboardFilter ? 'stored on full dataset' : 'with a stored reading'}
              />
              <StatCard
                label="High confidence"
                value={highConfidence}
                note={dashboardFilter ? 'stored on full dataset' : 'strong evidence'}
              />
              <StatCard
                label="Last saved"
                value={lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '—'}
                note={lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'not run'}
              />
            </div>
            <section className="analytics-dashboard-brief">
              <div>
                <span className="analytics-eyebrow">EXECUTIVE BRIEFING</span>
                <h2>{briefingHeadline}</h2>
                <p>{briefingBody}</p>
              </div>
              <div className="analytics-brief-points">
                {filterLabel ? (
                  <>
                    <div>
                      <span>SLICE</span>
                      <strong>{filterLabel}</strong>
                    </div>
                    <div>
                      <span>COVERAGE</span>
                      <strong>
                        {filteredCoverage} of {views.length} cards apply it before aggregation
                      </strong>
                    </div>
                    <div>
                      <span>READINGS</span>
                      <strong>Live local readings replace stored full-dataset readings</strong>
                    </div>
                  </>
                ) : (
                  views.slice(0, 3).map((view) => (
                    <div key={view.id}>
                      <span>{view.insightKind ?? (view.chart ? 'chart' : 'table')}</span>
                      <strong>{view.takeaway ?? view.name.replace(/^Auto · /, '')}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
        {views.length === 0 ? (
          <div className="analytics-empty-panel">
            <div className="analytics-empty-icon"><TabIcon id="dashboards" /></div>
            <h2>No saved views yet</h2>
            <p>Run a query in Analyze, choose a chart, and save it. It will appear here as a live card.</p>
            <button className="analytics-btn primary" onClick={() => setTab('analyze')}>Go to Analyze</button>
          </div>
        ) : (
          <div className={`analytics-dashboard-grid layout-${dashboardLayout}`}>
            {views.map((view) => (
              <DashboardCard
                key={view.id}
                view={view}
                api={api!}
                refreshKey={dashboardRefresh}
                filter={dashboardFilter}
                onFilter={applyChartFilter}
                onOpen={() => void openView(view)}
                onDelete={() => void deleteView(view.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderAutomate() {
    if (!detail) return <DetailEmpty onImport={() => void importFile()} />
    const meaningByInsight = new Map(
      (autoAnalysis?.interpretation?.findings ?? []).map((finding) => [
        finding.insightId,
        finding.meaning,
      ]),
    )
    const selectedWorkflow =
      workflows.find((workflow) => workflow.id === workflowSelectedId) ?? null
    return (
      <div className="analytics-automate-view">
        <section className="analytics-card intro-card">
          <div>
            <span className="analytics-eyebrow">FULL AUTOMATION</span>
            <h2>One run, every calculation, with meaning</h2>
            <p>
              Plot AI prepares exact duplicates, profiles the schema, ranks dimensions, builds a time
              trend, a distribution, correlation and IQR outliers, fits a linear forecast and saves
              every eligible chart as a live dashboard card. The local engine calculates every
              number; when a model is connected it also writes the plain-language reading. Without
              one, a local reading explains the same evidence.
            </p>
          </div>
          <button className="analytics-btn primary" onClick={() => void runAuto()} disabled={autoBusy || !!busy}>
            {autoBusy ? 'Running…' : autoAnalysis ? 'Run again' : 'Run full auto'}
          </button>
        </section>

        <section className="analytics-card analytics-workflow-card">
          <div className="analytics-card-head">
            <div>
              <span className="analytics-eyebrow">SCHEDULED AUTOMATION</span>
              <h2>Keep this analysis current</h2>
              <p className="analytics-muted">
                Save a deterministic workflow that runs the same local pipeline on a local-time
                schedule while Plot Docs is open. A missed schedule runs once on the next launch,
                then returns to its regular slot. No arbitrary SQL or model-generated code runs here.
              </p>
            </div>
            <button
              className="analytics-btn primary small"
              onClick={() => openWorkflowForm()}
              disabled={workflowBusy !== null}
            >
              New workflow
            </button>
          </div>

          {workflows.length === 0 ? (
            <div className="analytics-workflow-empty">
              <strong>No saved workflow for this dataset.</strong>
              <p>
                Create one to refresh its dashboard automatically, or keep it manual and use “Run
                now” whenever you need a fresh reading.
              </p>
            </div>
          ) : (
            <div className="analytics-workflow-list">
              {workflows.map((workflow) => {
                const status = workflowStatusLabel(workflow)
                const isSelected = workflow.id === workflowSelectedId
                const isRunning = workflowBusy === `run:${workflow.id}`
                return (
                  <article
                    key={workflow.id}
                    className={`analytics-workflow-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => void selectWorkflow(workflow.id)}
                  >
                    <div className="analytics-workflow-main">
                      <div className="analytics-workflow-title">
                        <strong>{workflow.name}</strong>
                        <span className={`analytics-workflow-pill ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </div>
                      <p>
                        {workflowScheduleLabel(workflow.schedule)} · version {workflow.version} ·{' '}
                        {workflow.prepare ? 'prepares duplicates' : 'analysis only'}
                      </p>
                      <div className="analytics-workflow-meta">
                        <span>Next: {workflowWhen(workflow.nextRunAt)}</span>
                        <span>Last: {workflowWhen(workflow.lastRunAt)}</span>
                        <span>{workflow.runCount.toLocaleString()} runs</span>
                      </div>
                      {workflow.lastRunStatus === 'error' && workflow.lastRunMessage && (
                        <small className="analytics-workflow-error">{workflow.lastRunMessage}</small>
                      )}
                    </div>
                    <div
                      className="analytics-workflow-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="analytics-btn primary small"
                        onClick={() => void runWorkflow(workflow.id)}
                        disabled={workflowBusy !== null}
                      >
                        {isRunning ? 'Running…' : 'Run now'}
                      </button>
                      {workflow.schedule.frequency !== 'manual' && (
                        <button
                          className="analytics-btn ghost small"
                          onClick={() => void toggleWorkflow(workflow)}
                          disabled={workflowBusy !== null}
                        >
                          {workflow.enabled ? 'Pause' : 'Resume'}
                        </button>
                      )}
                      <button
                        className="analytics-btn ghost small"
                        onClick={() => openWorkflowForm(workflow)}
                        disabled={workflowBusy !== null}
                      >
                        Edit
                      </button>
                      <button
                        className="analytics-btn ghost small danger"
                        onClick={() => void deleteWorkflow(workflow.id, workflow.name)}
                        disabled={workflowBusy !== null}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {workflowFormOpen && (
            <div className="analytics-workflow-form">
              <div className="analytics-card-head">
                <div>
                  <span className="analytics-eyebrow">
                    {workflowEditingId ? 'EDIT WORKFLOW' : 'NEW WORKFLOW'}
                  </span>
                  <h3>{workflowEditingId ? 'Update the automation' : 'Schedule this dataset'}</h3>
                </div>
                <button className="analytics-btn ghost small" onClick={closeWorkflowForm}>
                  Close
                </button>
              </div>
              <label className="analytics-workflow-field">
                <span>Name</span>
                <input
                  value={workflowName}
                  maxLength={120}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder="Weekly revenue refresh"
                />
              </label>
              <div className="analytics-workflow-form-row">
                <label className="analytics-workflow-field">
                  <span>Frequency</span>
                  <select
                    value={workflowFrequency}
                    onChange={(event) =>
                      setWorkflowFrequency(event.target.value as AnalyticsWorkflowFrequency)
                    }
                  >
                    <option value="manual">Manual only</option>
                    <option value="hourly">Every hour</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                {(workflowFrequency === 'daily' || workflowFrequency === 'weekly') && (
                  <label className="analytics-workflow-field">
                    <span>Local time</span>
                    <select
                      value={workflowHour}
                      onChange={(event) => setWorkflowHour(Number(event.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {workflowFrequency === 'weekly' && (
                  <label className="analytics-workflow-field">
                    <span>Day</span>
                    <select
                      value={workflowWeekday}
                      onChange={(event) => setWorkflowWeekday(Number(event.target.value))}
                    >
                      {WORKFLOW_WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="analytics-workflow-field">
                  <span>Retries on failure</span>
                  <select
                    value={workflowRetries}
                    onChange={(event) => setWorkflowRetries(Number(event.target.value))}
                  >
                    {[0, 1, 2, 3].map((retries) => (
                      <option key={retries} value={retries}>
                        {retries}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="analytics-workflow-check">
                <input
                  type="checkbox"
                  checked={workflowPrepare}
                  onChange={(event) => setWorkflowPrepare(event.target.checked)}
                />
                <span>
                  Remove exact duplicate rows before each run. The action creates a reversible
                  backup; the source file is never changed.
                </span>
              </label>
              <div className="analytics-workflow-form-actions">
                <button
                  className="analytics-btn primary"
                  onClick={() => void saveWorkflowForm()}
                  disabled={workflowBusy !== null}
                >
                  {workflowBusy === 'save' ? 'Saving…' : 'Save workflow'}
                </button>
                <button className="analytics-btn ghost" onClick={closeWorkflowForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedWorkflow && (
            <div className="analytics-workflow-history">
              <div className="analytics-card-head">
                <div>
                  <span className="analytics-eyebrow">EVIDENCE</span>
                  <h3>Run history</h3>
                </div>
                <span className="analytics-muted">
                  {workflowRuns.length} recent run{workflowRuns.length === 1 ? '' : 's'}
                </span>
              </div>
              {workflowRuns.length === 0 ? (
                <p className="analytics-muted">No runs yet. Use “Run now” to create the first one.</p>
              ) : (
                <div className="analytics-workflow-runs">
                  {workflowRuns.map((run) => (
                    <article key={run.id} className={`analytics-workflow-run ${run.status}`}>
                      <div>
                        <strong>{run.status === 'ok' ? 'Completed' : 'Failed'}</strong>
                        <span>{new Date(run.finishedAt).toLocaleString()}</span>
                      </div>
                      <p>{run.message}</p>
                      <small>
                        {run.rowsBefore !== undefined && run.rowsAfter !== undefined
                          ? `${run.rowsBefore.toLocaleString()} → ${run.rowsAfter.toLocaleString()} rows · `
                          : ''}
                        {run.insights} insights · {run.views} cards · {run.attempts} attempt
                        {run.attempts === 1 ? '' : 's'} · {run.elapsedMs.toLocaleString()} ms
                      </small>
                    </article>
                  ))}
                </div>
              )}
              {workflowVersions.length > 0 && (
                <details className="analytics-workflow-versions">
                  <summary>Version history ({workflowVersions.length})</summary>
                  <ul>
                    {workflowVersions.slice(0, 8).map((version) => (
                      <li key={version.id}>
                        <strong>v{version.version}</strong>
                        <span>
                          {version.name} · {workflowScheduleLabel(version.schedule)} ·{' '}
                          {version.enabled ? 'enabled' : 'paused'}
                        </span>
                        <time>{new Date(version.createdAt).toLocaleString()}</time>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>

        {autoAnalysis?.ok && autoAnalysis.summary && (
          <>
            <div className="analytics-stats">
              <StatCard label="Rows" value={formatNumber(autoAnalysis.summary.rowCount)} />
              <StatCard label="Columns" value={formatNumber(autoAnalysis.summary.columnCount)} />
              <StatCard label="Quality" value={`${Math.round(autoAnalysis.summary.qualityScore)}%`} />
              <StatCard label="Insights" value={autoAnalysis.insights.length} />
              <StatCard label="Cards" value={autoAnalysis.views.length} />
              <StatCard label="Elapsed" value={`${formatNumber(autoAnalysis.elapsedMs)} ms`} />
            </div>
            {autoAnalysis.prepared.length > 0 && (
              <div className="analytics-note">
                <strong>Prepared automatically.</strong> {autoAnalysis.prepared.join(' ')} The clean
                step is reversible from Prepare.
              </div>
            )}
            {autoAnalysis.plan && <AiPlanCard plan={autoAnalysis.plan} />}
            {autoAnalysis.interpretation && (
              <AutoReading interpretation={autoAnalysis.interpretation} />
            )}
            <div className="analytics-auto-grid">
              {autoAnalysis.insights.map((insight) => (
                <AutoInsightCard
                  key={insight.id}
                  insight={insight}
                  datasetName={detail.name}
                  meaning={meaningByInsight.get(insight.id) ?? insight.meaning}
                />
              ))}
            </div>
            <section className="analytics-card">
              <div className="analytics-card-head">
                <div>
                  <span className="analytics-eyebrow">DASHBOARD</span>
                  <h2>
                    {autoAnalysis.views.length
                      ? `${autoAnalysis.views.length} live cards refreshed`
                      : 'No chart cards were eligible'}
                  </h2>
                </div>
                <button className="analytics-btn ghost small" onClick={() => setTab('dashboards')}>
                  Open dashboards
                </button>
              </div>
              <p className="analytics-muted">
                Every card stores its read-only SQL and re-runs locally. {autoAnalysis.views.map((view) => view.name).join(' · ')}
              </p>
            </section>
            <details className="analytics-code analytics-method-card">
              <summary>Algorithms used in this run</summary>
              <ul>
                {autoAnalysis.methods.map((method) => (
                  <li key={method}>{method}</li>
                ))}
              </ul>
            </details>
          </>
        )}

        {!autoAnalysis && (
          <div className="analytics-pipeline">
            {[
              ['01', 'Import', 'Pick a file, drop it here, or let Plot AI download a public data link or scrape a web table.'],
              ['02', 'Prepare', 'Exact duplicates are removed with a reversible backup; missingness is measured, never silently filled.'],
              ['03', 'Profile', 'Rows, columns, nulls, distinct values and a transparent quality score are computed.'],
              ['04', 'Analyse', 'Rankings, trend periods, distributions, Pearson correlation, IQR outliers and a linear fit.'],
              ['05', 'Publish', 'Save every eligible chart to Dashboards with its exact SQL and open it in Analyze.'],
            ].map(([step, title, body]) => (
              <article key={step} className="analytics-pipeline-step">
                <span>{step}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
                <span className="analytics-pipeline-state">local</span>
              </article>
            ))}
          </div>
        )}

        <section className="analytics-card roadmap-card">
          <div>
            <span className="analytics-eyebrow">COMMERCIAL ROADMAP</span>
            <h2>What is not enabled yet</h2>
          </div>
          <ul>
            <li>
              Scheduled workflows run while Plot Docs is open; an OS-level background service is
              not installed.
            </li>
            <li>Webhook, folder and email destinations with explicit consent.</li>
            <li>Team review queues and approval gates before an export leaves the device.</li>
          </ul>
        </section>
      </div>
    )
  }

  function renderGovernance() {
    return (
      <div className="analytics-governance-view">
        <section className="analytics-card intro-card">
          <div>
            <span className="analytics-eyebrow">GOVERNANCE</span>
            <h2>Know what happened, and where the data lives</h2>
            <p>
              Analytics data stays in local SQLite under the application’s private userData folder.
              The document editors and their files are outside this workspace.
            </p>
          </div>
          <button className="analytics-btn ghost small" onClick={() => void refreshAudit()}>
            Refresh audit
          </button>
        </section>
        <div className="analytics-governance-grid">
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">AUDIT TRAIL</span>
                <h2>Local events</h2>
              </div>
              <span className="analytics-muted">{audit.length} shown</span>
            </div>
            <div className="analytics-audit-list">
              {audit.length === 0 ? (
                <div className="analytics-empty-inline">No analytics events yet.</div>
              ) : (
                audit.map((event) => (
                  <div key={event.id} className="analytics-audit-row">
                    <span className={`analytics-audit-dot ${event.action.includes('failed') ? 'bad' : ''}`} />
                    <div>
                      <strong>{event.action}</strong>
                      <pre>{event.detail}</pre>
                    </div>
                    <time>{new Date(event.createdAt).toLocaleString()}</time>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="analytics-card">
            <div className="analytics-card-head">
              <div>
                <span className="analytics-eyebrow">CONTROLS</span>
                <h2>Privacy and retention</h2>
              </div>
            </div>
            <dl className="analytics-facts">
              <div><dt>Storage</dt><dd>Local SQLite metadata + one file per dataset</dd></div>
              <div><dt>AI provider</dt><dd>Any configured provider and model through Settings → AI Model</dd></div>
              <div><dt>AI payload</dt><dd>Dataset schema, profile, bounded sample/query rows and inspected page content; obvious identifiers redacted</dd></div>
              <div><dt>Query access</dt><dd>SELECT / WITH only; read-only connection</dd></div>
              <div><dt>Python</dt><dd>Fixed app-generated script; 20 second timeout</dd></div>
              <div><dt>Original file</dt><dd>Never modified</dd></div>
            </dl>
            {detail && (
              <div className="analytics-danger-zone">
                <div>
                  <strong>Remove this dataset from Plot Docs</strong>
                  <p>The source file stays where it is. The local analytical copy and saved views are deleted.</p>
                </div>
                <button className="analytics-btn danger" onClick={() => void deleteDataset()}>
                  Delete local data
                </button>
              </div>
            )}
          </section>
        </div>
        {!detail && (
          <div className="analytics-empty-panel small">
            <h2>No active dataset</h2>
            <p>Import a file to see dataset-level governance controls.</p>
          </div>
        )}
      </div>
    )
  }

  if (!api) {
    return (
      <div className="analytics-workspace analytics-workspace-broken">
        <div className="analytics-broken-card">
          <h2>Analytics bridge unavailable</h2>
          <p>Restart Plot Docs so the preload bridge can load, then open AI Data Analytics again.</p>
          <button className="analytics-btn primary" onClick={onClose}>Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`analytics-workspace ${assistantOpen ? 'assistant-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="AI Data Analytics workspace"
      onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(event: ReactDragEvent<HTMLDivElement>) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) void importDroppedFile(file)
      }}
    >
      <aside className="analytics-rail">
        <div className="analytics-brand">
          <span className="analytics-brand-mark">
            <TabIcon id="analyze" />
          </span>
          <span>
            <strong>Data Analytics</strong>
            <small>local-first · evidence first</small>
          </span>
        </div>
        <button
          className={`analytics-rail-assistant ${assistantOpen ? 'active' : ''}`}
          onClick={() => setAssistantOpen(true)}
          aria-pressed={assistantOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2.8c.5 4.9 2.6 7 7.5 7.5-4.9.5-7 2.6-7.5 7.5-.5-4.9-2.6-7-7.5-7.5 4.9-.5 7-2.6 7.5-7.5Z"
              fill="currentColor"
            />
            <path
              d="M19 15.4c.2 1.8 1 2.6 2.8 2.8-1.8.2-2.6 1-2.8 2.8-.2-1.8-1-2.6-2.8-2.8 1.8-.2 2.6-1 2.8-2.8Z"
              fill="currentColor"
              opacity=".62"
            />
          </svg>
          <span>
            <strong>Plot AI</strong>
            <small>Run every step</small>
          </span>
        </button>
        <nav className="analytics-rail-nav" aria-label="Analytics modules">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              <TabIcon id={item.id} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.caption}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="analytics-rail-foot">
          <div className="analytics-rail-card">
            <strong>Local SQLite</strong>
            <span>Soopus AI optional</span>
            <span>Docs &amp; editors untouched</span>
          </div>
          <button className="analytics-btn ghost" onClick={onClose}>Back to Home</button>
        </div>
      </aside>
      <section className="analytics-main">
        <header className="analytics-header">
          <div>
            <span className="analytics-eyebrow">AI DATA ANALYTICS</span>
            <h1>{activeTab.label}</h1>
            <span className="analytics-header-caption">{activeTab.caption}</span>
          </div>
          <div className="analytics-header-actions">
            {datasets.length > 0 && (
              <select
                className="analytics-dataset-select"
                value={datasetId ?? ''}
                onChange={(event) => {
                  if (event.target.value) void selectDataset(event.target.value)
                }}
                aria-label="Active dataset"
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            )}
            {detail && (
              <button
                className="analytics-btn auto"
                onClick={() => void runAuto()}
                disabled={autoBusy || !!busy}
                title="Prepare, profile, analyse, chart and publish locally"
              >
                {autoBusy ? 'Analysing…' : 'Run full auto'}
              </button>
            )}
            <button className="analytics-btn primary" onClick={() => void importFile()} disabled={!!busy}>
              {busy === 'import' ? 'Importing…' : 'Import data'}
            </button>
            <button
              className={`analytics-assistant-toggle ${assistantOpen ? 'active' : ''}`}
              onClick={() => setAssistantOpen((value) => !value)}
              aria-pressed={assistantOpen}
              aria-controls="analytics-assistant-panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2.8c.5 4.9 2.6 7 7.5 7.5-4.9.5-7 2.6-7.5 7.5-.5-4.9-2.6-7-7.5-7.5 4.9-.5 7-2.6 7.5-7.5Z"
                  fill="currentColor"
                />
              </svg>
              Plot AI
            </button>
            <button className="analytics-close-btn" onClick={onClose} aria-label="Close data analytics">
              ×
            </button>
          </div>
        </header>
        {error && (
          <div className="analytics-banner bad">
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        <div className="analytics-content">
          {tab === 'overview' && renderOverview()}
          {tab === 'data' && renderData()}
          {tab === 'prepare' && renderPrepare()}
          {tab === 'analyze' && renderAnalyze()}
          {tab === 'dashboards' && renderDashboards()}
          {tab === 'ai' && renderAi()}
          {tab === 'ml' && renderMl()}
          {tab === 'automate' && renderAutomate()}
          {tab === 'governance' && renderGovernance()}
        </div>
        {toast && (
          <div className={`analytics-toast ${toast.tone}`} role="status" aria-live="polite">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
          </div>
        )}
      </section>
      {assistantOpen && (
        <AnalyticsAssistant
          api={api}
          activeDatasetId={datasetId}
          datasets={datasets}
          onClose={() => setAssistantOpen(false)}
          onDataChanged={(preferredId) => {
            void reloadDatasets(preferredId)
          }}
          onOpenSql={(targetId, nextSql, nextResult, nextChart) => {
            void openAssistantSql(targetId, nextSql, nextResult, nextChart)
          }}
          onOpenDashboard={() => {
            setTab('dashboards')
            void api.listViews(datasetId ?? undefined).then(setViews).catch(() => {})
          }}
          onOpenDataset={openAssistantDataset}
          onOpenModelSettings={onOpenModelSettings}
        />
      )}
      {dragging && (
        <div className="analytics-dropzone">
          <div>
            <TabIcon id="data" />
            <strong>Drop a data file to import</strong>
            <span>CSV · TSV · XLSX · JSON</span>
          </div>
        </div>
      )}
    </div>
  )
}
