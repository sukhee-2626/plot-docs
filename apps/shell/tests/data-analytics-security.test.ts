import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { tableFromMatrix } from '../src/main/analytics/import'
import { installReadOnlyAuthorizer } from '../src/main/analytics/sql'
import {
  inspectUrlTables,
  redactConnection,
  redactUrl,
} from '../src/main/analytics/sources'
import { AnalyticsStore } from '../src/main/analytics/store'
import {
  buildFunnelSql,
  buildPivotSql,
} from '../src/shared/analytics-explore'

describe('analytics security boundaries', () => {
  it('quotes pivot identifiers so a malicious name cannot execute SQL', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('CREATE TABLE data (region TEXT, amount INTEGER)')
      db.exec("INSERT INTO data VALUES ('East', 10), ('West', 20)")
      const malicious = 'region"; DROP TABLE data; --'
      const sql = buildPivotSql({ rows: malicious, aggregation: 'count' })
      expect(sql).toContain('""')
      expect(() => db.prepare(sql).all()).toThrow()
      const count = db.prepare('SELECT COUNT(*) AS n FROM data').get() as { n: number }
      expect(Number(count.n)).toBe(2)
    } finally {
      db.close()
    }
  })

  it('quotes funnel event labels so they cannot execute SQL', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('CREATE TABLE data (user_id TEXT, event TEXT, happened_at TEXT)')
      db.exec(
        "INSERT INTO data VALUES ('u1', 'view', '2026-01-01'), ('u1', 'buy', '2026-01-02')",
      )
      const malicious = "view'); DROP TABLE data; --"
      const sql = buildFunnelSql({
        user: 'user_id',
        event: 'event',
        time: 'happened_at',
        steps: [malicious, 'buy'],
      })
      const rows = db.prepare(sql).all() as Array<{ users: number }>
      expect(Number(rows[0]?.users)).toBe(0)
      const count = db.prepare('SELECT COUNT(*) AS n FROM data').get() as { n: number }
      expect(Number(count.n)).toBe(2)
    } finally {
      db.close()
    }
  })

  it('rejects join keys that are not in the live schema', () => {
    const directory = mkdtempSync(join(tmpdir(), 'plotdocs-security-'))
    const store = new AnalyticsStore(join(directory, 'analytics'))
    try {
      const left = store.createDataset(
        tableFromMatrix(
          [
            ['region', 'amount'],
            ['East', '10'],
          ],
          'left.csv',
          'csv',
        ),
      )
      const right = store.createDataset(
        tableFromMatrix(
          [
            ['region', 'manager'],
            ['East', 'Ada'],
          ],
          'right.csv',
          'csv',
        ),
      )
      expect(() =>
        store.createJoinedDataset({
          leftId: left.id,
          rightId: right.id,
          leftKey: 'region"; DROP TABLE data; --',
          rightKey: 'region',
          joinType: 'left',
          name: 'Injection attempt',
        }),
      ).toThrow('no column named')
      expect(store.getDataset(left.id)?.rowCount).toBe(1)
    } finally {
      store.close()
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    }
  })

  it('blocks filesystem functions and non-data tables in the SQLite authorizer', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('CREATE TABLE data (region TEXT)')
      db.exec("INSERT INTO data VALUES ('East')")
      installReadOnlyAuthorizer(db)
      expect(db.prepare('SELECT * FROM data').all()).toHaveLength(1)
      expect(() => db.prepare("SELECT readfile('C:/Windows/win.ini')").all()).toThrow()
      expect(() => db.prepare("SELECT writefile('C:/temp/x', 'x')").all()).toThrow()
      expect(() => db.prepare('SELECT * FROM sqlite_master').all()).toThrow()
    } finally {
      db.close()
    }
  })

  it('blocks SSRF, local files and credential-bearing links before fetching', async () => {
    await expect(inspectUrlTables('http://127.0.0.1/private.csv')).rejects.toThrow()
    await expect(inspectUrlTables('http://localhost/private.csv')).rejects.toThrow()
    await expect(inspectUrlTables('http://[::1]/private.csv')).rejects.toThrow()
    await expect(inspectUrlTables('file:///C:/Windows/win.ini')).rejects.toThrow()
    await expect(inspectUrlTables('https://user:pass@example.com/data.csv')).rejects.toThrow()
    await expect(inspectUrlTables('http://example.com:22/data.csv')).rejects.toThrow()
  })

  it('removes signed query strings and masks database secrets', () => {
    expect(
      redactUrl('https://example.com/data.csv?token=abc&signature=xyz#fragment'),
    ).toBe('https://example.com/data.csv')
    const masked = redactConnection(
      'postgres://analyst:supersecret@db.example.com:5432/warehouse?api_key=abc&sslmode=require',
    )
    expect(masked).not.toContain('supersecret')
    expect(masked).not.toContain('api_key=abc')
    expect(masked).toContain('***')
  })
})
