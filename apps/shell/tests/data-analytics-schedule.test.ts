import { describe, expect, it } from 'vitest'
import type { AnalyticsWorkflow, AnalyticsWorkflowSchedule } from '../src/shared/analytics-api'
import {
  isWorkflowDue,
  nextWorkflowRun,
  normalizeWorkflowSchedule,
} from '../src/main/analytics/schedule'

const daily: AnalyticsWorkflowSchedule = { frequency: 'daily', hour: 9, weekday: 1 }
const weekly: AnalyticsWorkflowSchedule = { frequency: 'weekly', hour: 9, weekday: 1 }
const hourly: AnalyticsWorkflowSchedule = { frequency: 'hourly', hour: 9, weekday: 1 }

function workflow(overrides: Partial<AnalyticsWorkflow> = {}): AnalyticsWorkflow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    datasetId: '22222222-2222-4222-8222-222222222222',
    name: 'Daily refresh',
    schedule: daily,
    enabled: true,
    prepare: true,
    maxRetries: 1,
    version: 1,
    createdAt: 0,
    updatedAt: 0,
    runCount: 0,
    ...overrides,
  }
}

describe('analytics workflow schedules', () => {
  it('normalizes valid local-time schedules', () => {
    expect(normalizeWorkflowSchedule({ frequency: 'weekly', hour: 18, weekday: 5 })).toEqual({
      frequency: 'weekly',
      hour: 18,
      weekday: 5,
    })
    expect(normalizeWorkflowSchedule({ frequency: 'manual', hour: 0, weekday: 0 })).toEqual({
      frequency: 'manual',
      hour: 0,
      weekday: 0,
    })
  })

  it('rejects malformed schedules instead of silently guessing', () => {
    expect(normalizeWorkflowSchedule(null)).toBeNull()
    expect(normalizeWorkflowSchedule({ frequency: 'yearly', hour: 9, weekday: 1 })).toBeNull()
    expect(normalizeWorkflowSchedule({ frequency: 'daily', hour: 24, weekday: 1 })).toBeNull()
    expect(normalizeWorkflowSchedule({ frequency: 'daily', hour: 9, weekday: 7 })).toBeNull()
    expect(normalizeWorkflowSchedule({ frequency: 'daily', hour: 9.5, weekday: 1 })).toBeNull()
  })

  it('schedules hourly runs at the next local hour boundary', () => {
    const from = new Date(2026, 9, 27, 10, 15, 20, 0).getTime()
    expect(nextWorkflowRun(hourly, from)).toBe(new Date(2026, 9, 27, 11, 0, 0, 0).getTime())
  })

  it('schedules daily runs at the next local occurrence', () => {
    const before = new Date(2026, 9, 27, 8, 30, 0, 0).getTime()
    expect(nextWorkflowRun(daily, before)).toBe(new Date(2026, 9, 27, 9, 0, 0, 0).getTime())

    const after = new Date(2026, 9, 27, 10, 0, 0, 0).getTime()
    expect(nextWorkflowRun(daily, after)).toBe(new Date(2026, 9, 28, 9, 0, 0, 0).getTime())
  })

  it('schedules weekly runs on the next matching weekday', () => {
    const mondayBefore = new Date(2026, 9, 26, 8, 0, 0, 0).getTime()
    expect(nextWorkflowRun(weekly, mondayBefore)).toBe(
      new Date(2026, 9, 26, 9, 0, 0, 0).getTime(),
    )

    const mondayAfter = new Date(2026, 9, 26, 10, 0, 0, 0).getTime()
    expect(nextWorkflowRun(weekly, mondayAfter)).toBe(
      new Date(2026, 10, 2, 9, 0, 0, 0).getTime(),
    )

    const tuesday = new Date(2026, 9, 27, 8, 0, 0, 0).getTime()
    expect(nextWorkflowRun(weekly, tuesday)).toBe(
      new Date(2026, 10, 2, 9, 0, 0, 0).getTime(),
    )
  })

  it('never schedules a manual or disabled workflow', () => {
    const from = new Date(2026, 9, 27, 10, 0, 0, 0).getTime()
    expect(nextWorkflowRun({ ...daily, frequency: 'manual' }, from)).toBeNull()
    expect(nextWorkflowRun(daily, from, false)).toBeNull()
  })

  it('only considers enabled workflows with a due timestamp', () => {
    const now = new Date(2026, 9, 27, 10, 0, 0, 0).getTime()
    expect(isWorkflowDue(workflow({ nextRunAt: now - 1 }), now)).toBe(true)
    expect(isWorkflowDue(workflow({ nextRunAt: now + 1 }), now)).toBe(false)
    expect(isWorkflowDue(workflow({ enabled: false, nextRunAt: now - 1 }), now)).toBe(false)
    expect(isWorkflowDue(workflow({ nextRunAt: undefined }), now)).toBe(false)
    expect(
      isWorkflowDue(
        workflow({ schedule: { frequency: 'manual', hour: 9, weekday: 1 }, nextRunAt: now - 1 }),
        now,
      ),
    ).toBe(false)
  })
})
