import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { applyDashboardFilter, dashboardFilterLabel } from '../src/shared/analytics-filter'

const east = { column: 'region', value: 'East' }

describe('dashboard slicers', () => {
  it('filters the base table before the saved aggregation runs', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(`
      CREATE TABLE data (region TEXT, amount REAL);
      INSERT INTO data VALUES ('East', 10), ('East', 15), ('West', 99);
    `)
    const filtered = applyDashboardFilter(
      'SELECT region, SUM(amount) AS total FROM data GROUP BY region',
      east,
    )
    expect(filtered.applied).toBe(true)
    expect(filtered.sql).toContain('FROM (SELECT * FROM data WHERE "region" = \'East\') AS "data"')

    const rows = db.prepare('SELECT region, SUM(amount) AS total FROM data GROUP BY region').all()
    expect(rows).toEqual([
      { region: 'East', total: 25 },
      { region: 'West', total: 99 },
    ])
    const filteredRows = db.prepare(filtered.sql).all()
    expect(filteredRows).toEqual([{ region: 'East', total: 25 }])

    const escaped = applyDashboardFilter('SELECT * FROM data', { column: 'region', value: "O'Brien" })
    expect(escaped.sql).toContain('"region" = \'O\'\'Brien\'')
    db.close()
  })

  it('preserves real aliases and SQL clauses', () => {
    const aliased = applyDashboardFilter(
      'SELECT d.region FROM data AS d WHERE d.amount > 0',
      east,
    )
    expect(aliased.applied).toBe(true)
    expect(aliased.sql).toContain(
      'FROM (SELECT * FROM data WHERE "region" = \'East\') AS "d" WHERE d.amount > 0',
    )

    const unaliased = applyDashboardFilter('SELECT * FROM data\nWHERE amount > 0', east)
    expect(unaliased.sql).toContain(
      'FROM (SELECT * FROM data WHERE "region" = \'East\') AS "data"\nWHERE amount > 0',
    )

    const quotedAlias = applyDashboardFilter('SELECT * FROM data AS "d"', east)
    expect(quotedAlias.sql).toContain(
      'FROM (SELECT * FROM data WHERE "region" = \'East\') AS "d"',
    )
  })

  it('rewrites joins and leaves queries without the dataset table alone', () => {
    const joined = applyDashboardFilter(
      'SELECT a.region, b.amount FROM data a JOIN data b ON a.rowid = b.rowid',
      east,
    )
    expect(joined.applied).toBe(true)
    expect(joined.sql.match(/SELECT \* FROM data WHERE/g)).toHaveLength(2)

    const unrelated = applyDashboardFilter('SELECT 1 AS ok', east)
    expect(unrelated).toEqual({ sql: 'SELECT 1 AS ok', applied: false })
    expect(applyDashboardFilter('SELECT * FROM data', null)).toEqual({
      sql: 'SELECT * FROM data',
      applied: false,
    })
  })

  it('formats a clear slicer label', () => {
    expect(dashboardFilterLabel({ column: 'region', value: 'East' })).toBe('region = East')
  })
})
