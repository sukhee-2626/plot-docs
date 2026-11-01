/**
 * Deterministic linear-trend preview.
 *
 * This is deliberately a small, transparent ordinary-least-squares fit rather
 * than a black-box forecasting package. It is used by the ML Lab preview and
 * by tests; no I/O belongs here.
 */

export interface ForecastPoint {
  x: number
  y: number
  /** Approximate lower bound of the 95% prediction interval, when available. */
  lower?: number
  /** Approximate upper bound of the 95% prediction interval, when available. */
  upper?: number
}

export interface LinearForecast {
  ok: boolean
  error?: string
  points: ForecastPoint[]
  forecast: ForecastPoint[]
  slope?: number
  intercept?: number
  r2?: number
  /** Number of complete observations used in the fit. */
  n?: number
  /** Residual standard error (RMSE with n-2 degrees of freedom). */
  residualStdError?: number
  /** Standard error of the slope. */
  slopeStdError?: number
  /** Approximate 95% confidence interval for the slope. */
  slopeCi95?: [number, number]
  /** Two-sided 95% t critical value used for the intervals. */
  tCritical?: number
  method?: string
}

export const LINEAR_FORECAST_METHOD =
  'Ordinary least squares trend with R², slope standard error and an approximate 95% prediction interval. This is a local scenario, not a causal forecast.'

function tCritical95(degreesOfFreedom: number): number {
  const table = [
    12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
    2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086,
    2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
  ]
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom < 1) return 1.96
  if (degreesOfFreedom <= 30) return table[Math.floor(degreesOfFreedom) - 1] ?? 1.96
  return 1.96
}

export function linearForecast(
  input: readonly ForecastPoint[],
  horizon = 6,
  maxPlotPoints = 200,
): LinearForecast {
  const points = input
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice()
    .sort((a, b) => a.x - b.x)
  if (points.length < 2) {
    return {
      ok: false,
      error: 'At least two complete numeric rows are needed.',
      points: [],
      forecast: [],
    }
  }
  const n = points.length
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n
  let covariance = 0
  let varianceX = 0
  let totalY = 0
  for (const point of points) {
    const dx = point.x - meanX
    const dy = point.y - meanY
    covariance += dx * dy
    varianceX += dx * dx
    totalY += dy * dy
  }
  if (varianceX === 0) {
    return {
      ok: false,
      error: 'The X column has no variation.',
      points: [],
      forecast: [],
    }
  }
  const slope = covariance / varianceX
  const intercept = meanY - slope * meanX
  let residual = 0
  for (const point of points) {
    const predicted = intercept + slope * point.x
    residual += (point.y - predicted) ** 2
  }
  const r2 = totalY === 0 ? 1 : Math.max(0, Math.min(1, 1 - residual / totalY))
  const degreesOfFreedom = Math.max(1, n - 2)
  const residualStdError = n > 2 ? Math.sqrt(residual / degreesOfFreedom) : undefined
  const slopeStdError =
    residualStdError !== undefined && varianceX > 0
      ? residualStdError / Math.sqrt(varianceX)
      : undefined
  const critical = tCritical95(degreesOfFreedom)
  const slopeCi95: [number, number] | undefined =
    slopeStdError !== undefined
      ? [slope - critical * slopeStdError, slope + critical * slopeStdError]
      : undefined
  const step =
    n > 1 && points[n - 1]!.x !== points[n - 2]!.x
      ? points[n - 1]!.x - points[n - 2]!.x
      : 1
  const lastX = points[n - 1]!.x
  const count = Math.max(1, Math.min(60, Math.floor(horizon)))
  const forecast = Array.from({ length: count }, (_, index) => {
    const nextX = lastX + step * (index + 1)
    const predicted = intercept + slope * nextX
    if (residualStdError === undefined) return { x: nextX, y: predicted }
    // Approximate prediction interval for a new observation at nextX. This is
    // wider than the confidence interval for the mean and grows away from the
    // observed centre, which is the honest uncertainty for an extrapolation.
    const distance = ((nextX - meanX) ** 2) / varianceX
    const standardError = residualStdError * Math.sqrt(1 + 1 / n + distance)
    return {
      x: nextX,
      y: predicted,
      lower: predicted - critical * standardError,
      upper: predicted + critical * standardError,
    }
  })
  const stride = Math.max(1, Math.ceil(n / Math.max(1, maxPlotPoints)))
  const plotted = points.filter((_, index) => index % stride === 0)
  // Always include the last observed point so the chart connects the trend to
  // the forecast origin.
  if (plotted[plotted.length - 1] !== points[n - 1]) plotted.push(points[n - 1]!)
  return {
    ok: true,
    points: plotted,
    forecast,
    slope,
    intercept,
    r2,
    n,
    residualStdError,
    slopeStdError,
    slopeCi95,
    tCritical: critical,
    method: LINEAR_FORECAST_METHOD,
  }
}
