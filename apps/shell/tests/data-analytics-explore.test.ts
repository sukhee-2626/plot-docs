import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  buildCohortSql,
  buildFunnelSql,
  buildPivotSql,
  toMatrix,
} from '../src/shared/analytics-explore'

function database(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE data (
    region TEXT,
    month TEXT,
    channel TEXT,
    amount INTEGER,
    user_id TEXT,
    event TEXT,
    happened_at TEXT
  )`)
  const insert = db.prepare(
    'INSERT INTO data (region, month, channel, amount, user_id, event, happened_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const rows: [string, string, string, number, string, string, string][] = [
    ['East', '2026-01-02', 'Web', 10, 'u1', 'view', '2026-01-02T10:00:00Z'],
    ['East', '2026-01-03', 'Web', 20, 'u1', 'signup', '2026-01-03T10:00:00Z'],
    ['East', '2026-01-04', 'Web', 30, 'u1', 'buy', '2026-01-04T10:00:00Z'],
    ['West', '2026-01-05', 'Store', 40, 'u2', 'view', '2026-01-05T10:00:00Z'],
    ['West', '2026-01-06', 'Store', 50, 'u2', 'buy', '2026-01-06T10:00:00Z'],
    ['West', '2026-02-05', 'Store', 45, 'u2', 'buy', '2026-02-05T10:00:00Z'],
    ['North', '2026-02-01', 'Web', 60, 'u3', 'view', '2026-02-01T10:00:00Z'],
    ['North', '2026-02-02', 'Web', 70, 'u3', 'signup', '2026-02-02T10:00:00Z'],
    ['South', '2026-02-03', 'Store', 80, 'u4', 'signup', '2026-02-03T10:00:00Z'],
    ['South', '2026-02-04', 'Store', 90, 'u4', 'buy', '2026-02-04T10:00:00Z'],
    ['East', '2026-03-01', 'Web', 100, 'u1', 'buy', '2026-03-01T10:00:00Z'],
    ['West', '2026-03-02', 'Store', 110, 'u2', 'buy', '2026-03-02T10:00:00Z'],
    ['North', '2026-03-03', 'Web', 120, 'u3', 'buy', '2026-03-03T10:00:00Z'],
  ]
  for (const row of rows) insert.run(...row)
  return db
}

describe('pivot SQL builder', () => {
  it('builds a two-axis pivot with quoted identifiers and returns a matrix', () => {
    const db = database()
    try {
      const sql = buildPivotSql({
        rows: 'region',
        columns: 'channel',
        metric: 'amount',
        aggregation: 'sum',
        limit: 100,
      })
      const result = db.prepare(sql).all() as Array<{
        row: string
        column: string
        value: number
      }>
      expect(result).toContainEqual({ row: 'East', column: 'Web', value: 160 })
      expect(result).toContainEqual({ row: 'West', column: 'Store', value: 245 })
      const matrix = toMatrix(
        result.map((row) => [row.row, row.column, row.value]),
        0,
        1,
        2,
      )
      expect(matrix.rows).toEqual(['East', 'North', 'South', 'West'])
      expect(matrix.columns).toEqual(['Store', 'Web'])
      expect(matrix.values[0]).toEqual([null, 160])
    } finally {
      db.close()
    }
  })

  it('supports a one-axis count and treats identifiers as quoted names', () => {
    const db = database()
    try {
      const sql = buildPivotSql({ rows: 'region', aggregation: 'count', limit: 2 })
      const result = db.prepare(sql).all() as Array<{ row: string; value: number }>
      expect(result).toHaveLength(2)
      expect(result.reduce((sum, row) => sum + Number(row.value), 0)).toBeGreaterThan(0)
    } finally {
      db.close()
    }
  })

  it('rejects missing or conflicting columns and clamps the row limit', () => {
    expect(() => buildPivotSql({ rows: '', aggregation: 'count' })).toThrow('Pivot row is required')
    expect(() =>
      buildPivotSql({ rows: 'region', columns: 'region', aggregation: 'count' }),
    ).toThrow('must be different')
    expect(() =>
      buildPivotSql({ rows: 'region', aggregation: 'sum' }),
    ).toThrow('metric column is required')
    const sql = buildPivotSql({ rows: 'region', aggregation: 'count', limit: 999_999 })
    expect(sql).toContain('LIMIT 5000')
  })
})

describe('funnel SQL builder', () => {
  it('counts ordered first occurrences and excludes users who never completed a step', () => {
    const db = database()
    try {
      const sql = buildFunnelSql({
        user: 'user_id',
        event: 'event',
        time: 'happened_at',
        steps: ['view', 'signup', 'buy'],
      })
      const rows = db.prepare(sql).all() as Array<{ step: number; label: string; users: number }>
      expect(rows.map((row) => [row.step, row.label, Number(row.users)])).toEqual([
        [1, 'view', 3],
        [2, 'signup', 2],
        [3, 'buy', 2],
      ])
    } finally {
      db.close()
    }
  })

  it('treats event labels as literals, not SQL', () => {
    const db = database()
    try {
      db.prepare(
        'INSERT INTO data (region, month, channel, amount, user_id, event, happened_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(
        'East',
        '2026-01-07',
        'Web',
        5,
        'u9',
        "view' OR '1'='1",
        '2026-01-07T10:00:00Z',
      )
      const sql = buildFunnelSql({
        user: 'user_id',
        event: 'event',
        time: 'happened_at',
        steps: ["view' OR '1'='1", 'buy'],
      })
      const rows = db.prepare(sql).all() as Array<{ users: number }>
      expect(Number(rows[0]?.users)).toBe(1)
      expect(Number(rows[1]?.users)).toBe(0)
    } finally {
      db.close()
    }
  })

  it('validates step count, uniqueness and required columns', () => {
    const base = { user: 'user_id', event: 'event', time: 'happened_at' }
    expect(() => buildFunnelSql({ ...base, steps: ['view'] })).toThrow('at least two steps')
    expect(() =>
      buildFunnelSql({ ...base, steps: ['view', 'view'] }),
    ).toThrow('must be unique')
    expect(() =>
      buildFunnelSql({ ...base, steps: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }),
    ).toThrow('at most 8 steps')
  })
})

describe('cohort SQL builder', () => {
  it('assigns monthly cohorts and counts distinct returning users', () => {
    const db = database()
    try {
      const sql = buildCohortSql({ user: 'user_id', date: 'happened_at', periods: 3 })
      const rows = db.prepare(sql).all() as Array<{
        cohort: string
        period: number
        users: number
        cohort_size: number
      }>
      expect(rows).toContainEqual({ cohort: '2026-01', period: 0, users: 2, cohort_size: 2 })
      expect(rows).toContainEqual({ cohort: '2026-01', period: 1, users: 1, cohort_size: 2 })
      expect(rows).toContainEqual({ cohort: '2026-01', period: 2, users: 2, cohort_size: 2 })
      expect(rows).toContainEqual({ cohort: '2026-02', period: 0, users: 2, cohort_size: 2 })
      expect(rows).toContainEqual({ cohort: '2026-02', period: 1, users: 1, cohort_size: 2 })
      expect(rows.some((row) => row.cohort === '2026-02' && row.period === 2)).toBe(false)
    } finally {
      db.close()
    }
  })

  it('clamps periods and rejects missing columns', () => {
    expect(() => buildCohortSql({ user: '', date: 'happened_at' })).toThrow(
      'User column is required',
    )
    const sql = buildCohortSql({ user: 'user_id', date: 'happened_at', periods: 999 })
    expect(sql).toContain('p."period" <= 36')
  })
})

describe('matrix conversion', () => {
  it('sorts numeric labels and keeps null cells explicit', () => {
    const matrix = toMatrix(
      [
        ['A', '10', 1],
        ['A', '2', 2],
        ['B', '2', 3],
      ],
      0,
      1,
      2,
    )
    expect(matrix.columns).toEqual(['2', '10'])
    expect(matrix.values).toEqual([
      [2, 1],
      [3, null],
    ])
  })
})
