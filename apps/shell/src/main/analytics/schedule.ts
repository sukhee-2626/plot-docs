import type {
  AnalyticsWorkflow,
  AnalyticsWorkflowSchedule,
} from '../../shared/analytics-api'

const FREQUENCIES = new Set(['manual', 'hourly', 'daily', 'weekly'])

/**
 * Validate a renderer-supplied schedule. The scheduler runs in local time so
 * “daily at 09:00” means 09:00 on the user's machine, not UTC.
 */
export function normalizeWorkflowSchedule(raw: unknown): AnalyticsWorkflowSchedule | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const frequency = typeof record.frequency === 'string' ? record.frequency : ''
  if (!FREQUENCIES.has(frequency)) return null
  const hour = Number(record.hour)
  const weekday = Number(record.weekday)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
  return {
    frequency: frequency as AnalyticsWorkflowSchedule['frequency'],
    hour,
    weekday,
  }
}

/**
 * The next local-time run strictly after `from`. Manual workflows return null
 * even when enabled, because only an explicit “Run now” should start them.
 */
export function nextWorkflowRun(
  schedule: AnalyticsWorkflowSchedule,
  from: number,
  enabled = true,
): number | null {
  if (!enabled || schedule.frequency === 'manual') return null
  if (schedule.frequency === 'hourly') {
    const next = new Date(from)
    next.setMinutes(0, 0, 0)
    next.setHours(next.getHours() + 1)
    return next.getTime()
  }
  if (schedule.frequency === 'daily') {
    const next = new Date(from)
    next.setHours(schedule.hour, 0, 0, 0)
    if (next.getTime() <= from) next.setDate(next.getDate() + 1)
    return next.getTime()
  }
  const next = new Date(from)
  next.setHours(schedule.hour, 0, 0, 0)
  const delta = (schedule.weekday - next.getDay() + 7) % 7
  next.setDate(next.getDate() + delta)
  if (next.getTime() <= from) next.setDate(next.getDate() + 7)
  return next.getTime()
}

export function isWorkflowDue(workflow: AnalyticsWorkflow, now: number): boolean {
  return (
    workflow.enabled &&
    workflow.schedule.frequency !== 'manual' &&
    typeof workflow.nextRunAt === 'number' &&
    workflow.nextRunAt <= now
  )
}
