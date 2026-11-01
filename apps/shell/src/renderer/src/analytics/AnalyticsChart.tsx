import { useMemo, type KeyboardEvent } from 'react'
import type { AnalyticsChartSpec, AnalyticsQueryResult } from '../../../shared/analytics-api'

interface AnalyticsChartProps {
  result: AnalyticsQueryResult
  spec: AnalyticsChartSpec
  height?: number
  compact?: boolean
  /** Called when a category mark is activated; enables dashboard cross-filtering. */
  onSelect?: (label: string) => void
  /** Category label currently used as the dashboard filter. */
  selectedLabel?: string
}

interface SeriesPoint {
  label: string
  value: number
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function buildScatter(result: AnalyticsQueryResult, spec: AnalyticsChartSpec): { x: number; y: number }[] {
  const xIndex = result.columns.indexOf(spec.x)
  const yIndex = result.columns.indexOf(spec.y)
  if (xIndex < 0 || yIndex < 0) return []
  return result.rows
    .slice(0, 5000)
    .map((row) => ({ x: numberValue(row[xIndex]), y: numberValue(row[yIndex]) }))
    .filter((point): point is { x: number; y: number } => point.x !== null && point.y !== null)
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  if (Number.isInteger(value)) return value.toLocaleString()
  const digits = Math.abs(value) >= 10 ? 1 : Math.abs(value) >= 1 ? 2 : 3
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

/**
 * Pick rounded grid lines instead of slicing the data range into arbitrary
 * fractions. Counts should read 0, 1, 2, 3 — not 0.00, 0.75, 1.50, 2.25.
 */
function niceTicks(min: number, max: number, target: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) return [min]
  const span = max - min
  const rough = span / Math.max(2, target)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const residual = rough / magnitude
  const step =
    (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10) *
    magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)))
  }
  return ticks.length > 0 ? ticks : [min, max]
}

const CHART_COLORS = [
  '#a78bfa',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#a3e635',
  '#f97316',
  '#94a3b8',
]

function pointOnCircle(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

function sectorPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = pointOnCircle(cx, cy, outerRadius, startAngle)
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  if (innerRadius <= 0) {
    return `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} Z`
  }
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endAngle)
  const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle)
  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`
}

function buildSeries(result: AnalyticsQueryResult, spec: AnalyticsChartSpec): SeriesPoint[] {
  const xIndex = result.columns.indexOf(spec.x)
  const yIndex = result.columns.indexOf(spec.y)
  if (xIndex < 0 || yIndex < 0) return []
  const groups = new Map<string, { total: number; count: number; min: number; max: number }>()
  for (const row of result.rows) {
    const label = String(row[xIndex] ?? '—')
    const value = numberValue(row[yIndex])
    if (value === null) continue
    const current = groups.get(label)
    if (current) {
      current.total += value
      current.count += 1
      current.min = Math.min(current.min, value)
      current.max = Math.max(current.max, value)
    } else {
      groups.set(label, { total: value, count: 1, min: value, max: value })
    }
  }
  return [...groups.entries()]
    .map(([label, group]) => {
      const value =
        spec.aggregation === 'count'
          ? group.count
          : spec.aggregation === 'avg'
            ? group.total / group.count
            : spec.aggregation === 'min'
              ? group.min
              : spec.aggregation === 'max'
                ? group.max
                : group.total
      return { label, value }
    })
    .slice(0, 60)
}

export function AnalyticsChart({
  result,
  spec,
  height = 280,
  compact = false,
  onSelect,
  selectedLabel,
}: AnalyticsChartProps) {
  const onMarkKeyDown = (event: KeyboardEvent<SVGElement>, label: string) => {
    if (!onSelect) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(label)
    }
  }
  const scatter = useMemo(
    () => (spec.type === 'scatter' ? buildScatter(result, spec) : []),
    [result, spec],
  )
  const points = useMemo(() => buildSeries(result, spec), [result, spec])
  const width = compact ? 360 : 720
  if (spec.type === 'scatter') {
    if (scatter.length === 0) {
      return (
        <div className="analytics-chart-empty">
          Choose two numeric columns with at least one complete pair of values.
        </div>
      )
    }
    const margin = compact
      ? { top: 12, right: 8, bottom: 30, left: 34 }
      : { top: 18, right: 16, bottom: 42, left: 52 }
    const xs = scatter.map((point) => point.x)
    const ys = scatter.map((point) => point.y)
    const xLow = Math.min(...xs)
    const xHigh = Math.max(...xs)
    const yLow = Math.min(...ys)
    const yHigh = Math.max(...ys)
    const xPad = xLow === xHigh ? 1 : (xHigh - xLow) * 0.05
    const yPad = yLow === yHigh ? 1 : (yHigh - yLow) * 0.08
    let xMin = xLow - xPad
    let xMax = xHigh + xPad
    let yMin = yLow - yPad
    let yMax = yHigh + yPad
    const xTicks = niceTicks(xMin, xMax, compact ? 4 : 5)
    const yTicks = niceTicks(yMin, yMax, compact ? 4 : 5)
    xMin = Math.min(xMin, xTicks[0] ?? xMin)
    xMax = Math.max(xMax, xTicks[xTicks.length - 1] ?? xMax)
    yMin = Math.min(yMin, yTicks[0] ?? yMin)
    yMax = Math.max(yMax, yTicks[yTicks.length - 1] ?? yMax)
    const xOf = (value: number) =>
      margin.left + ((value - xMin) / (xMax - xMin)) * (width - margin.left - margin.right)
    const yOf = (value: number) =>
      margin.top + ((yMax - value) / (yMax - yMin)) * (height - margin.top - margin.bottom)
    return (
      <div className={`analytics-chart ${compact ? 'compact' : ''}`} style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`scatter plot of ${spec.y} by ${spec.x}`}
          preserveAspectRatio="none"
        >
          {yTicks.map((value) => (
            <g key={`y-${value}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={yOf(value)}
                y2={yOf(value)}
                className="analytics-chart-grid"
              />
              <text
                x={margin.left - 8}
                y={yOf(value) + 3}
                textAnchor="end"
                className="analytics-chart-tick"
              >
                {formatTick(value)}
              </text>
            </g>
          ))}
          {xTicks.map((value) => (
            <g key={`x-${value}`}>
              <line
                x1={xOf(value)}
                x2={xOf(value)}
                y1={margin.top}
                y2={height - margin.bottom}
                className="analytics-chart-grid"
              />
              <text
                x={xOf(value)}
                y={height - (compact ? 9 : 16)}
                textAnchor="middle"
                className="analytics-chart-label"
              >
                {formatTick(value)}
              </text>
            </g>
          ))}
          {scatter.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={xOf(point.x)}
              cy={yOf(point.y)}
              r={compact ? 2.2 : 3.1}
              className="analytics-chart-scatter-dot"
            >
              <title>{`${spec.x}: ${point.x.toLocaleString()} · ${spec.y}: ${point.y.toLocaleString()}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    )
  }
  if (points.length === 0) {
    return <div className="analytics-chart-empty">Choose a label column and a numeric value column.</div>
  }
  const isPie = spec.type === 'pie' || spec.type === 'donut'
  if (isPie) {
    if (points.some((point) => point.value < 0)) {
      return (
        <div className="analytics-chart-empty">
          Pie and donut charts need non-negative values. Choose a different measure or use a bar chart.
        </div>
      )
    }
    const maxSlices = compact ? 5 : 8
    const ordered = [...points].sort((a, b) => b.value - a.value)
    const visible = ordered.slice(0, maxSlices)
    const rest = ordered.slice(maxSlices)
    const display =
      rest.length > 0
        ? [
            ...visible,
            {
              label: `Other (${rest.length})`,
              value: rest.reduce((sum, point) => sum + point.value, 0),
            },
          ]
        : visible
    const total = display.reduce((sum, point) => sum + point.value, 0)
    if (total <= 0) {
      return <div className="analytics-chart-empty">Pie and donut charts need a positive total.</div>
    }
    const legendWidth = compact ? 160 : 236
    const margin = compact
      ? { top: 10, right: 8, bottom: 10, left: 8 }
      : { top: 16, right: 14, bottom: 16, left: 14 }
    const availableWidth = width - margin.left - margin.right - legendWidth
    const radius = Math.max(
      24,
      Math.min(availableWidth / 2, (height - margin.top - margin.bottom) / 2) * 0.9,
    )
    const cx = margin.left + availableWidth / 2
    const cy = margin.top + (height - margin.top - margin.bottom) / 2
    const innerRadius = spec.type === 'donut' ? radius * 0.58 : 0
    const legendX = width - legendWidth + 6
    const legendStart = Math.max(16, cy - (display.length * 18) / 2)
    let angle = -Math.PI / 2
    return (
      <div className={`analytics-chart ${compact ? 'compact' : ''}`} style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${spec.type} chart of ${spec.y} by ${spec.x}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {display.length === 1 ? (
            innerRadius > 0 ? (
              <path
                d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx - 0.01} ${cy - innerRadius} Z`}
                fillRule="evenodd"
                style={{ fill: CHART_COLORS[0] }}
                className={`analytics-chart-slice ${onSelect ? 'selectable' : ''} ${selectedLabel === display[0]!.label ? 'selected' : ''}`}
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={onSelect ? `Filter dashboard by ${display[0]!.label}` : undefined}
                onClick={onSelect ? () => onSelect(display[0]!.label) : undefined}
                onKeyDown={onSelect ? (event) => onMarkKeyDown(event, display[0]!.label) : undefined}
              >
                <title>{`${display[0]!.label}: ${display[0]!.value.toLocaleString()} (100%)`}</title>
              </path>
            ) : (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                style={{ fill: CHART_COLORS[0] }}
                className={`analytics-chart-slice ${onSelect ? 'selectable' : ''} ${selectedLabel === display[0]!.label ? 'selected' : ''}`}
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={onSelect ? `Filter dashboard by ${display[0]!.label}` : undefined}
                onClick={onSelect ? () => onSelect(display[0]!.label) : undefined}
                onKeyDown={onSelect ? (event) => onMarkKeyDown(event, display[0]!.label) : undefined}
              >
                <title>{`${display[0]!.label}: ${display[0]!.value.toLocaleString()} (100%)`}</title>
              </circle>
            )
          ) : (
            display.map((point, index) => {
              const sweep = (point.value / total) * Math.PI * 2
              const start = angle
              const end = angle + sweep
              angle = end
              const selectable = !!onSelect && !point.label.startsWith('Other (')
              return (
                <path
                  key={`${point.label}-${index}`}
                  d={sectorPath(cx, cy, radius, innerRadius, start, end)}
                  style={{ fill: CHART_COLORS[index % CHART_COLORS.length] }}
                  className={`analytics-chart-slice ${selectable ? 'selectable' : ''} ${selectedLabel === point.label ? 'selected' : ''}`}
                  role={selectable ? 'button' : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  aria-label={selectable ? `Filter dashboard by ${point.label}` : undefined}
                  onClick={selectable ? () => onSelect?.(point.label) : undefined}
                  onKeyDown={selectable ? (event) => onMarkKeyDown(event, point.label) : undefined}
                >
                  <title>{`${point.label}: ${point.value.toLocaleString()} (${((point.value / total) * 100).toFixed(1)}%)`}</title>
                </path>
              )
            })
          )}
          {display.map((point, index) => (
            <g key={`legend-${point.label}-${index}`}>
              <rect
                x={legendX}
                y={legendStart + index * 18 - 8}
                width={9}
                height={9}
                rx={2}
                style={{ fill: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <text
                x={legendX + 14}
                y={legendStart + index * 18}
                className="analytics-chart-legend-label"
              >
                {point.label.length > (compact ? 15 : 24)
                  ? `${point.label.slice(0, compact ? 15 : 24)}…`
                  : point.label}
              </text>
              <text
                x={width - margin.right}
                y={legendStart + index * 18}
                textAnchor="end"
                className="analytics-chart-legend-value"
              >
                {((point.value / total) * 100).toFixed(1)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }
  const rotateLabels =
    compact && (points.length > 4 || points.some((point) => point.label.length > 9))
  const margin = compact
    ? { top: 20, right: 8, bottom: rotateLabels ? 48 : 30, left: 34 }
    : { top: 22, right: 16, bottom: 46, left: 52 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const values = points.map((point) => point.value)
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (min === max) {
    max = min + 1
  }
  const gridValues = niceTicks(min, max, compact ? 4 : 5)
  min = Math.min(min, gridValues[0] ?? min)
  max = Math.max(max, gridValues[gridValues.length - 1] ?? max)
  const span = max - min
  const yOf = (value: number) => margin.top + ((max - value) / span) * plotHeight
  const band = plotWidth / Math.max(1, points.length)
  const baseline = yOf(Math.max(min, Math.min(max, 0)))
  const step = Math.max(1, Math.ceil(points.length / (compact ? 6 : 9)))
  const labelOf = (label: string) => {
    const maxChars = compact ? (rotateLabels ? 14 : 9) : 14
    return label.length > maxChars ? `${label.slice(0, maxChars)}…` : label
  }

  return (
    <div className={`analytics-chart ${compact ? 'compact' : ''}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${spec.type} chart of ${spec.y} by ${spec.x}`}
        preserveAspectRatio="none"
      >
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yOf(value)}
              y2={yOf(value)}
              className="analytics-chart-grid"
            />
            <text x={margin.left - 8} y={yOf(value) + 3} textAnchor="end" className="analytics-chart-tick">
              {formatTick(value)}
            </text>
          </g>
        ))}
        {spec.type === 'bar' ? (
          points.map((point, index) => {
            const x = margin.left + index * band + band * 0.16
            const barWidth = Math.max(2, band * 0.68)
            const top = Math.min(yOf(point.value), baseline)
            const bottom = Math.max(yOf(point.value), baseline)
            const labelY = point.value < 0 ? bottom + 10 : top - 4
            const selectable = !!onSelect
            return (
              <g
                key={`${point.label}-${index}`}
                className={selectable ? 'analytics-chart-mark' : undefined}
                role={selectable ? 'button' : undefined}
                tabIndex={selectable ? 0 : undefined}
                aria-label={selectable ? `Filter dashboard by ${point.label}` : undefined}
                onClick={selectable ? () => onSelect?.(point.label) : undefined}
                onKeyDown={selectable ? (event) => onMarkKeyDown(event, point.label) : undefined}
              >
                <title>{`${point.label}: ${point.value.toLocaleString()}`}</title>
                <rect
                  x={x}
                  y={top}
                  width={barWidth}
                  height={Math.max(1, bottom - top)}
                  rx={Math.min(4, barWidth / 3)}
                  className={`analytics-chart-bar ${selectedLabel === point.label ? 'selected' : ''}`}
                />
                {points.length <= 12 && (
                  <text
                    x={x + barWidth / 2}
                    y={labelY}
                    textAnchor="middle"
                    className="analytics-chart-value-label"
                  >
                    {formatTick(point.value)}
                  </text>
                )}
              </g>
            )
          })
        ) : (
          <>
            {spec.type === 'area' && (
              <path
                d={`${points
                  .map((point, index) => {
                    const x = margin.left + index * band + band / 2
                    return `${index === 0 ? 'M' : 'L'}${x},${yOf(point.value)}`
                  })
                  .join(' ')} L${margin.left + (points.length - 1) * band + band / 2},${baseline} L${margin.left + band / 2},${baseline} Z`}
                className="analytics-chart-area"
              />
            )}
            <path
              d={points
                .map((point, index) => {
                  const x = margin.left + index * band + band / 2
                  return `${index === 0 ? 'M' : 'L'}${x},${yOf(point.value)}`
                })
                .join(' ')}
              className="analytics-chart-line"
            />
            {points.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={margin.left + index * band + band / 2}
                cy={yOf(point.value)}
                r={compact ? 1.8 : 2.8}
                className="analytics-chart-dot"
              >
                <title>{`${point.label}: ${point.value.toLocaleString()}`}</title>
              </circle>
            ))}
            {points.map((point, index) => {
              if (points.length > 8 && index !== points.length - 1) return null
              return (
                <text
                  key={`value-${point.label}-${index}`}
                  x={margin.left + index * band + band / 2}
                  y={yOf(point.value) - 5}
                  textAnchor="middle"
                  className="analytics-chart-value-label"
                >
                  {formatTick(point.value)}
                </text>
              )
            })}
          </>
        )}
        {points.map((point, index) => {
          if (index % step !== 0 && index !== points.length - 1) return null
          const x = margin.left + index * band + band / 2
          const y = height - (rotateLabels ? 7 : compact ? 13 : 16)
          return (
            <text
              key={`label-${point.label}-${index}`}
              x={x}
              y={y}
              textAnchor={rotateLabels ? 'end' : 'middle'}
              transform={rotateLabels ? `rotate(-32 ${x} ${y})` : undefined}
              className="analytics-chart-label"
            >
              {labelOf(point.label)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
