import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  AnalyticsAiPlan,
  AnalyticsCell,
  AnalyticsCleanOperation,
  AnalyticsDatasetDetail,
  AnalyticsQueryResult,
} from '../src/shared/analytics-api'
import { runAutoAnalysis } from '../src/main/analytics/auto'
import { tableFromMatrix } from '../src/main/analytics/import'
import { profileDataset } from '../src/main/analytics/profile'
import { parseHtmlTables } from '../src/main/analytics/sources'
import { installReadOnlyAuthorizer, quoteIdent } from '../src/main/analytics/sql'
import { AnalyticsStore } from '../src/main/analytics/store'

const temporaryDirectories: string[] = []

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'plotdocs-auto-analysis-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true })
  }
})

function detailOf(store: AnalyticsStore, id: string): AnalyticsDatasetDetail {
  const dataset = store.getDataset(id)
  if (!dataset) throw new Error('dataset missing')
  const profile = store.getProfile(id)
  if (!profile) return profileDataset(store, id)
  return {
    ...dataset,
    columns: profile.columns ?? [],
    preview: profile.preview ?? { columns: [], rows: [], truncated: false },
  }
}

function query(
  store: AnalyticsStore,
  id: string,
  sql: string,
  limit = 200,
): AnalyticsQueryResult {
  const started = Date.now()
  const db = store.openDataset(id)
  try {
    installReadOnlyAuthorizer(db)
    const statement = db.prepare(sql)
    const raw = statement.all() as Record<string, unknown>[]
    const columns = raw.length > 0 ? Object.keys(raw[0]!) : []
    const rows = raw.map((row) =>
      columns.map((column) => (row[column] ?? null) as AnalyticsCell),
    )
    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated: rows.length >= limit,
      elapsedMs: Date.now() - started,
    }
  } finally {
    db.close()
  }
}

async function removeDuplicates(
  store: AnalyticsStore,
  id: string,
  operation: AnalyticsCleanOperation,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (operation.kind !== 'drop_duplicates') {
    return { ok: false, error: 'unsupported test cleanup' }
  }
  const before = store.getDataset(id)?.rowCount ?? 0
  const db = store.openDataset(id)
  try {
    await store.makeBackup(id, db)
    const columns = detailOf(store, id).columns.map((column) => quoteIdent(column.name)).join(', ')
    db.exec(
      `DELETE FROM data WHERE rowid NOT IN (SELECT MIN(rowid) FROM data GROUP BY ${columns})`,
    )
  } finally {
    db.close()
  }
  profileDataset(store, id)
  const after = store.getDataset(id)?.rowCount ?? before
  return {
    ok: true,
    message: `Removed ${(before - after).toLocaleString()} duplicate row${before - after === 1 ? '' : 's'}.`,
  }
}

describe('deterministic auto analysis', () => {
  it('does not rank identifier-only columns such as phone numbers', async () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['phone', 'email'],
        ['555-0100', 'a@example.com'],
        ['555-0101', 'b@example.com'],
        ['555-0102', 'c@example.com'],
      ],
      'contacts.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      profileDataset(store, created.id)
      const result = await runAutoAnalysis(created.id, {
        getDataset: (id: string) => detailOf(store, id),
        runQuery: (id: string, sql: string, limit?: number) => query(store, id, sql, limit),
        listViews: (datasetId: string) => store.listViews(datasetId),
        saveView: (input: Parameters<AnalyticsStore['saveView']>[0]) => store.saveView(input),
        clean: (id: string, operation: AnalyticsCleanOperation) =>
          removeDuplicates(store, id, operation),
        audit: () => undefined,
      })
      expect(result.insights.map((insight) => insight.kind)).toEqual(['quality'])
      expect(result.views).toHaveLength(0)
      expect(store.listViews(created.id)).toHaveLength(0)
    } finally {
      store.close()
    }
  })

  it('cleans duplicates, produces evidence-backed insights, and reuses Auto cards', async () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['id', 'date', 'region', 'amount', 'units'],
        ['1', '2024-01-01', 'East', '100', '10'],
        ['2', '2024-02-01', 'East', '120', '12'],
        ['3', '2024-03-01', 'East', '140', '14'],
        ['4', '2024-04-01', 'East', '160', '16'],
        ['5', '2024-05-01', 'West', '90', '9'],
        ['6', '2024-06-01', 'West', '110', '11'],
        ['7', '2024-07-01', 'West', '130', '13'],
        ['8', '2024-08-01', 'West', '150', '15'],
        ['9', '2024-09-01', 'North', '80', '8'],
        ['10', '2024-10-01', 'North', '100', '10'],
        ['11', '2024-11-01', 'North', '120', '12'],
        ['12', '2024-12-01', 'North', '140', '14'],
        ['1', '2024-01-01', 'East', '100', '10'],
        ['1', '2024-01-01', 'East', '100', '10'],
      ],
      'sales.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      profileDataset(store, created.id)
      const audit: string[] = []
      const deps = {
        getDataset: (id: string) => detailOf(store, id),
        runQuery: (id: string, sql: string, limit?: number) => query(store, id, sql, limit),
        listViews: (datasetId: string) => store.listViews(datasetId),
        saveView: (input: Parameters<AnalyticsStore['saveView']>[0]) => store.saveView(input),
        clean: (id: string, operation: AnalyticsCleanOperation) =>
          removeDuplicates(store, id, operation),
        audit: (action: string) => {
          audit.push(action)
        },
      }

      const first = await runAutoAnalysis(created.id, deps)
      expect(first.ok).toBe(true)
      expect(first.summary).toMatchObject({
        rowCount: 12,
        columnCount: 5,
        primaryMetric: 'amount',
        primaryDimension: 'region',
        timeColumn: 'date',
      })
      expect(first.prepared[0]).toContain('Removed 2 duplicate rows')
      expect(first.insights.map((insight) => insight.kind)).toEqual(
        expect.arrayContaining(['quality', 'ranking', 'trend', 'distribution', 'correlation', 'forecast']),
      )
      for (const insight of first.insights) {
        expect(insight.title.length).toBeGreaterThan(0)
        expect(insight.detail.length).toBeGreaterThan(0)
        expect(insight.method?.length).toBeGreaterThan(0)
        if (insight.sql) {
          expect(insight.sql).toMatch(/SELECT|WITH/i)
          expect(insight.result?.rowCount).toBeGreaterThanOrEqual(0)
        }
      }
      const ranking = first.insights.find((insight) => insight.kind === 'ranking')
      expect(ranking?.result?.columns).toEqual(['group', 'value', 'total', 'rank', 'groups'])
      expect(ranking?.result?.rows[0]).toEqual(['East', 520, 1440, 1, 3])
      expect(ranking?.detail).toContain('36.1%')
      expect(ranking?.method).toContain('windowed total')
      const correlation = first.insights.find((insight) => insight.kind === 'correlation')
      expect(correlation?.detail).toContain('Pearson r =')
      expect(correlation?.detail).toContain('Spearman')
      expect(correlation?.method).toContain('Pearson')
      const forecast = first.insights.find((insight) => insight.kind === 'forecast')
      expect(forecast?.detail).toContain('prediction interval')
      expect(forecast?.method).toContain('Ordinary least squares')
      expect(first.views).toHaveLength(3)
      expect(first.views.map((view) => view.name)).toEqual(
        expect.arrayContaining([
          'Auto · Top region by amount',
          'Auto · amount over date',
          'Auto · Distribution of amount',
        ]),
      )
      expect(first.views.find((view) => view.name === 'Auto · Top region by amount')?.filterColumn).toBe(
        'region',
      )
      for (const view of first.views) {
        expect(view.sql).toContain('FROM data')
        expect(view.chart).not.toBeNull()
        expect(view.takeaway?.length).toBeGreaterThan(0)
        expect(view.meaning?.length).toBeGreaterThan(0)
        expect(view.method?.length).toBeGreaterThan(0)
        expect(view.confidence).toMatch(/high|medium|low/)
      }
      expect(audit).toContain('auto-analysis')

      const second = await runAutoAnalysis(created.id, deps)
      expect(second.ok).toBe(true)
      expect(second.prepared).toEqual([])
      expect(second.views).toHaveLength(3)
      expect(store.listViews(created.id)).toHaveLength(3)
      expect(second.views.map((view) => view.id).sort()).toEqual(
        first.views.map((view) => view.id).sort(),
      )
    } finally {
      store.close()
    }
  })

  it('honours a validated understanding plan for columns and analyses', async () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['region', 'channel', 'amount', 'units'],
        ['East', 'Web', '100', '4'],
        ['East', 'Store', '120', '6'],
        ['West', 'Web', '80', '8'],
        ['West', 'Store', '90', '3'],
      ],
      'plan.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      profileDataset(store, created.id)
      const detail = detailOf(store, created.id)
      const plan: AnalyticsAiPlan = {
        summary: 'Sales by region and channel.',
        grain: 'One row per region and channel.',
        columnRoles: detail.columns.map((column) => ({
          name: column.name,
          role: column.name === 'units' ? 'metric' : 'dimension',
          description: 'Fixture role.',
        })),
        metric: 'units',
        dimension: 'channel',
        timeColumn: null,
        questions: ['Which channel sells the most units?'],
        analyses: ['quality', 'ranking'],
        preparation: [],
        caveats: [],
        source: 'ai',
        model: 'test-model',
        verified: true,
        note: 'Test plan.',
      }
      const result = await runAutoAnalysis(
        created.id,
        {
          getDataset: (id: string) => detailOf(store, id),
          runQuery: (id: string, sql: string, limit?: number) => query(store, id, sql, limit),
          listViews: (datasetId: string) => store.listViews(datasetId),
          saveView: (input: Parameters<AnalyticsStore['saveView']>[0]) => store.saveView(input),
          clean: async () => ({ ok: false, error: 'not needed' }),
          audit: () => {},
        },
        { prepare: false, plan },
      )
      expect(result.ok).toBe(true)
      expect(result.plan?.model).toBe('test-model')
      expect(result.summary).toMatchObject({
        primaryMetric: 'units',
        primaryDimension: 'channel',
        timeColumn: null,
      })
      expect(result.insights.map((insight) => insight.kind)).toEqual(['quality', 'ranking'])
      expect(result.views).toHaveLength(1)
      expect(result.views[0]?.name).toBe('Auto · Top channel by units')
    } finally {
      store.close()
    }
  })

  it('keeps the original rows when cleanup is declined', async () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['region', 'amount'],
        ['East', '10'],
        ['East', '10'],
        ['West', '20'],
        ['West', '20'],
        ['North', '30'],
        ['North', '30'],
        ['South', '40'],
        ['South', '40'],
        ['Central', '50'],
        ['Central', '50'],
      ],
      'duplicates.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      profileDataset(store, created.id)
      const deps = {
        getDataset: (id: string) => detailOf(store, id),
        runQuery: (id: string, sql: string, limit?: number) => query(store, id, sql, limit),
        listViews: (datasetId: string) => store.listViews(datasetId),
        saveView: (input: Parameters<AnalyticsStore['saveView']>[0]) => store.saveView(input),
        clean: async () => ({ ok: false, error: 'cleanup declined' }),
        audit: () => {},
      }
      const result = await runAutoAnalysis(created.id, deps)
      expect(result.ok).toBe(true)
      expect(result.summary?.rowCount).toBe(10)
      expect(result.prepared).toEqual([])
      expect(result.insights[0]?.detail).toContain('duplicate rows remain')
    } finally {
      store.close()
    }
  })
})

describe('HTML table scraping parser', () => {
  it('selects the largest table, decodes entities, and strips scripts', () => {
    const tables = parseHtmlTables(`
      <html><head><title>Quarterly sales</title></head><body>
      <table><caption>Ignored single column</caption>
        <tr><th>Only</th></tr><tr><td>1</td></tr>
      </table>
      <table>
        <caption>Sales by region</caption>
        <thead><tr><th>Region</th><th>Amount</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>East</td><td>10</td><td>A &amp; B</td></tr>
          <tr><td>West</td><td>20</td><td><script>bad()</script>Clean</td></tr>
        </tbody>
      </table>
      </body></html>
    `)
    expect(tables).toHaveLength(1)
    const best = tables[0]!
    expect(best.caption).toBe('Sales by region')
    expect(best.headers).toEqual(['Region', 'Amount', 'Note'])
    expect(best.matrix[1]).toEqual(['East', '10', 'A & B'])
    expect(best.matrix[2]).toEqual(['West', '20', 'Clean'])
    expect(best.score).toBeGreaterThan(0)
  })

  it('generates headers for headerless tables and expands colspan', () => {
    const tables = parseHtmlTables(`
      <table>
        <tr><td>East</td><td>10</td></tr>
        <tr><td colspan="2">Wide</td></tr>
      </table>
    `)
    expect(tables).toHaveLength(1)
    expect(tables[0]?.headers).toEqual(['Column 1', 'Column 2'])
    expect(tables[0]?.matrix).toEqual([
      ['Column 1', 'Column 2'],
      ['East', '10'],
      ['Wide', ''],
    ])
  })

  it('returns no tables for pages without one', () => {
    expect(parseHtmlTables('<html><body><p>No data</p></body></html>')).toEqual([])
  })
})
