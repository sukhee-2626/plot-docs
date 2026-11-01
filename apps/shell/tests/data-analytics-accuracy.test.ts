/**
 * Deterministic analytics accuracy benchmark.
 *
 * This is not a claim about general real-world accuracy. It is a fixed,
 * reproducible suite over the real import, profiling, plan, SQL, store,
 * pivot/funnel/cohort, join/append, forecast and chart-validation code paths.
 * The test prints the measured score so releases can report the exact number.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import type { AssistantDeps } from '../src/main/analytics/assistant'
import { buildLocalPlan } from '../src/main/analytics/plan'
import { profileDataset } from '../src/main/analytics/profile'
import { AnalyticsStore } from '../src/main/analytics/store'
import { tableFromMatrix } from '../src/main/analytics/import'
import { pickColumns } from '../src/main/analytics/auto'
import { linearForecast } from '../src/main/analytics/forecast'
import { validateReadOnlySql } from '../src/main/analytics/sql'
import { normalizeChartSpec } from '../src/main/analytics/validation'
import { analyticsAssistantStatus, runAnalyticsAssistant } from '../src/main/analytics/assistant'
import {
  buildCohortSql,
  buildFunnelSql,
  buildPivotSql,
} from '../src/shared/analytics-explore'

interface Check {
  category: string
  name: string
  run: () => void | Promise<void>
}

describe('deterministic analytics accuracy benchmark', () => {
  it('scores every core path and prints the measured result', async () => {
    const root = mkdtempSync(join(tmpdir(), 'plotdocs-analytics-accuracy-'))
    const store = new AnalyticsStore(join(root, 'analytics'))
    let salesDb: ReturnType<typeof store.openDataset> | null = null
    let eventsHandle: ReturnType<typeof store.openDataset> | null = null
    try {
      const sales = store.createDataset(
        tableFromMatrix(
          [
            ['order_id', 'date', 'region', 'channel', 'amount', 'units', 'year', 'customer_email'],
            ['001', ' 2026-01-02 ', 'East', 'Web', '10', '1', '2026', 'a@example.com'],
            ['002', '2026-01-03', 'East', 'Store', '20', '2', '2026', 'b@example.com'],
            ['002', '2026-01-03', 'East', 'Store', '20', '2', '2026', 'b@example.com'],
            ['003', '2026-02-01', 'West', 'Web', '30', '3', '2026', 'c@example.com'],
            ['004', '2026-02-02', 'West', 'Store', '', '4', '2026', 'd@example.com'],
            ['005', '2026-03-01', 'North', 'Web', '50', '5', '2026', 'e@example.com'],
          ],
          'sales.csv',
          'csv',
        ),
      )
      const events = store.createDataset(
        tableFromMatrix(
          [
            ['user_id', 'event', 'happened_at'],
            ['u1', 'view', '2026-01-01'],
            ['u1', 'signup', '2026-01-02'],
            ['u1', 'buy', '2026-01-03'],
            ['u2', 'view', '2026-01-01'],
            ['u2', 'buy', '2026-01-02'],
            ['u3', 'view', '2026-01-01'],
            ['u3', 'signup', '2026-01-02'],
          ],
          'events.csv',
          'csv',
        ),
      )
      const regions = store.createDataset(
        tableFromMatrix(
          [
            ['region', 'manager', 'year'],
            ['East', 'Ada', 'FY2026'],
            ['West', 'Grace', 'FY2026'],
            ['North', 'Katherine', 'FY2026'],
          ],
          'regions.csv',
          'csv',
        ),
      )
      const extra = store.createDataset(
        tableFromMatrix(
          [
            ['order_id', 'date', 'region', 'channel', 'amount', 'units', 'year', 'customer_email'],
            ['006', '2026-04-01', 'South', 'Web', '60', '6', '2026', 'f@example.com'],
          ],
          'sales-extra.csv',
          'csv',
        ),
      )
      const duplicateExtra = store.createDataset(
        tableFromMatrix(
          [
            ['order_id', 'date', 'region', 'channel', 'amount', 'units', 'year', 'customer_email'],
            ['002', '2026-01-03', 'East', 'Store', '20', '2', '2026', 'b@example.com'],
          ],
          'sales-duplicate.csv',
          'csv',
        ),
      )
      const detail = profileDataset(store, sales.id)
      const db = store.openDataset(sales.id)
      salesDb = db
      const checks: Check[] = []
      const check = (category: string, name: string, run: () => void | Promise<void>) => {
        checks.push({ category, name, run })
      }

      // ── import and typing ─────────────────────────────────────
      check('import', 'leading-zero identifiers stay text', () => {
        assert.equal(detail.columns.find((column) => column.name === 'order_id')?.type, 'text')
      })
      check('import', 'date values are trimmed to a semantic date', () => {
        const date = detail.columns.find((column) => column.name === 'date')
        assert.equal(date?.type, 'date')
        assert.equal(date?.min, '2026-01-02')
      })
      check('import', 'year is not selected as a measure', () => {
        const plan = buildLocalPlan(detail)
        assert.equal(plan.metric, 'amount')
        assert.ok(!plan.columnRoles.some((role) => role.name === 'year' && role.role === 'metric'))
      })
      check('import', 'case-insensitive header dedupe', () => {
        const table = tableFromMatrix(
          [
            ['Name', 'name'],
            ['A', 'B'],
          ],
          'headers.csv',
          'csv',
        )
        assert.deepEqual(table.columns.map((column) => column.name), ['Name', 'name (2)'])
      })
      check('import', 'unsafe integers remain text', () => {
        const table = tableFromMatrix(
          [
            ['code'],
            ['9007199254740993'],
          ],
          'codes.csv',
          'csv',
        )
        assert.equal(table.columns[0]?.type, 'text')
        assert.equal(table.rows[0]?.[0], '9007199254740993')
      })
      check('import', 'empty cells become null', () => {
        const table = tableFromMatrix(
          [
            ['a', 'b'],
            ['1', ''],
          ],
          'empty.csv',
          'csv',
        )
        assert.equal(table.rows[0]?.[1], null)
      })

      // ── profiling ─────────────────────────────────────────────
      check('profile', 'row count is exact', () => assert.equal(detail.rowCount, 6))
      check('profile', 'exact duplicate rows are counted', () =>
        assert.equal(detail.duplicateRows, 1),
      )
      check('profile', 'missing cells are counted', () => assert.equal(detail.missingCells, 1))
      check('profile', 'quality score stays in range', () => {
        assert.ok(detail.qualityScore >= 0 && detail.qualityScore <= 100)
      })
      check('profile', 'null count and mean are correct', () => {
        const amount = detail.columns.find((column) => column.name === 'amount')
        assert.equal(amount?.nullCount, 1)
        assert.equal(amount?.mean, 26)
      })
      check('profile', 'date range is correct', () => {
        const date = detail.columns.find((column) => column.name === 'date')
        assert.equal(date?.min, '2026-01-02')
        assert.equal(date?.max, '2026-03-01')
      })

      // ── plan and column selection ─────────────────────────────
      check('plan', 'picks a real measure, not an identifier', () => {
        assert.equal(pickColumns(detail).metric?.name, 'amount')
      })
      check('plan', 'picks a categorical dimension, not an email', () => {
        const dimension = pickColumns(detail).dimension?.name
        assert.ok(dimension === 'region' || dimension === 'channel')
      })
      check('plan', 'picks the date column as time', () => {
        assert.equal(pickColumns(detail).time?.name, 'date')
      })
      check('plan', 'excludes time parts from measures', () => {
        const plan = buildLocalPlan(detail)
        const yearRole = plan.columnRoles.find((role) => role.name === 'year')
        assert.equal(yearRole?.role, 'ignore')
      })
      check('plan', 'marks identifiers explicitly', () => {
        const plan = buildLocalPlan(detail)
        assert.equal(
          plan.columnRoles.find((role) => role.name === 'order_id')?.role,
          'identifier',
        )
      })
      check('plan', 'returns answerable questions', () => {
        const plan = buildLocalPlan(detail)
        assert.ok(plan.questions.length >= 3 && plan.questions.length <= 5)
      })
      check('plan', 'includes quality, ranking and trend analyses', () => {
        const plan = buildLocalPlan(detail)
        assert.ok(plan.analyses.includes('quality'))
        assert.ok(plan.analyses.includes('ranking'))
        assert.ok(plan.analyses.includes('trend'))
      })

      // ── SQL safety ────────────────────────────────────────────
      check('sql-safety', 'accepts a single SELECT', () =>
        assert.equal(validateReadOnlySql('SELECT 1;'), 'SELECT 1;'),
      )
      check('sql-safety', 'accepts a WITH query', () =>
        assert.ok(validateReadOnlySql('WITH x AS (SELECT 1) SELECT * FROM x').startsWith('WITH')),
      )
      check('sql-safety', 'rejects DELETE', () =>
        assert.throws(() => validateReadOnlySql('DELETE FROM data'), /SELECT or WITH/),
      )
      check('sql-safety', 'rejects PRAGMA', () =>
        assert.throws(() => validateReadOnlySql('PRAGMA table_info(data)')),
      )
      check('sql-safety', 'rejects multiple statements', () =>
        assert.throws(() => validateReadOnlySql('SELECT 1; SELECT 2')),
      )
      check('sql-safety', 'rejects ATTACH', () =>
        assert.throws(() => validateReadOnlySql("ATTACH DATABASE 'x' AS y")),
      )

      // ── pivot, funnel, cohort ─────────────────────────────────
      check('explore', 'pivot sums the exact cell', () => {
        const sql = buildPivotSql({
          rows: 'region',
          columns: 'channel',
          metric: 'amount',
          aggregation: 'sum',
        })
        const row = db
          .prepare(sql)
          .all()
          .find(
            (entry) =>
              (entry as { row: string }).row === 'East' &&
              (entry as { column: string }).column === 'Web',
          ) as { value: number } | undefined
        assert.equal(row?.value, 10)
      })
      check('explore', 'pivot count groups correctly', () => {
        const sql = buildPivotSql({ rows: 'region', aggregation: 'count' })
        const rows = db.prepare(sql).all() as Array<{ value: number }>
        assert.equal(rows.reduce((sum, row) => sum + Number(row.value), 0), 6)
      })
      const eventsDb = store.openDataset(events.id)
      eventsHandle = eventsDb
      check('explore', 'funnel counts ordered first occurrences', () => {
        const sql = buildFunnelSql({
          user: 'user_id',
          event: 'event',
          time: 'happened_at',
          steps: ['view', 'signup', 'buy'],
        })
        const rows = eventsDb.prepare(sql).all() as Array<{ users: number }>
        assert.deepEqual(rows.map((row) => Number(row.users)), [3, 2, 1])
      })
      check('explore', 'funnel event labels are literals', () => {
        const sql = buildFunnelSql({
          user: 'user_id',
          event: 'event',
          time: 'happened_at',
          steps: ["view' OR '1'='1", 'buy'],
        })
        const rows = eventsDb.prepare(sql).all() as Array<{ users: number }>
        assert.equal(Number(rows[0]?.users), 0)
      })
      check('explore', 'cohort assigns first activity month', () => {
        const sql = buildCohortSql({ user: 'user_id', date: 'happened_at', periods: 3 })
        const rows = eventsDb.prepare(sql).all() as Array<{
          cohort: string
          period: number
          users: number
          cohort_size: number
        }>
        assert.ok(
          rows.some(
            (row) =>
              row.cohort === '2026-01' &&
              row.period === 0 &&
              row.users === 3 &&
              row.cohort_size === 3,
          ),
        )
      })
      check('explore', 'cohort rejects a missing entity', () => {
        assert.throws(() => buildCohortSql({ user: '', date: 'happened_at' }))
      })

      // ── joins and append ──────────────────────────────────────
      check('join', 'left join keeps every left row', () => {
        const joined = store.createJoinedDataset({
          leftId: sales.id,
          rightId: regions.id,
          leftKey: 'region',
          rightKey: 'region',
          joinType: 'left',
          name: 'Sales with regions',
        })
        assert.equal(joined.dataset.rowCount, 6)
      })
      check('join', 'collision is renamed and disclosed', () => {
        const joined = store.createJoinedDataset({
          leftId: sales.id,
          rightId: regions.id,
          leftKey: 'region',
          rightKey: 'region',
          joinType: 'left',
          name: 'Sales with regions 2',
        })
        assert.ok(joined.warning?.includes('region → right_region'))
      })
      check('join', 'different key affinity is warned', () => {
        const joined = store.createJoinedDataset({
          leftId: sales.id,
          rightId: regions.id,
          leftKey: 'year',
          rightKey: 'year',
          joinType: 'left',
          name: 'Sales with regions by year',
        })
        assert.ok(joined.warning?.includes('different type affinity'))
      })
      check('append', 'UNION ALL keeps all rows', () => {
        const appended = store.createAppendedDataset({
          leftId: sales.id,
          rightId: extra.id,
          mode: 'all',
          name: 'Sales all',
        })
        assert.equal(appended.dataset.rowCount, 7)
      })
      check('append', 'UNION removes exact duplicates', () => {
        const appended = store.createAppendedDataset({
          leftId: sales.id,
          rightId: duplicateExtra.id,
          mode: 'distinct',
          name: 'Sales distinct',
        })
        // The source has six rows but only five unique rows; UNION removes the
        // existing duplicate as well as the identical appended row.
        assert.equal(appended.dataset.rowCount, 5)
      })
      check('append', 'missing columns are rejected', () => {
        assert.throws(() =>
          store.createAppendedDataset({
            leftId: sales.id,
            rightId: regions.id,
            mode: 'all',
            name: 'Invalid append',
          }),
        )
      })

      // ── forecast ──────────────────────────────────────────────
      check('forecast', 'recovers a perfect linear slope', () => {
        const result = linearForecast([
          { x: 0, y: 1 },
          { x: 1, y: 3 },
          { x: 2, y: 5 },
          { x: 3, y: 7 },
          { x: 4, y: 9 },
        ])
        assert.equal(result.ok, true)
        assert.equal(result.slope, 2)
        assert.equal(result.intercept, 1)
        assert.equal(result.r2, 1)
      })
      check('forecast', 'rejects insufficient observations', () => {
        const result = linearForecast([{ x: 1, y: 1 }])
        assert.equal(result.ok, false)
        assert.ok(result.error)
      })
      check('forecast', 'returns a finite prediction interval', () => {
        const result = linearForecast(
          [
            { x: 1, y: 2 },
            { x: 2, y: 4.1 },
            { x: 3, y: 5.9 },
            { x: 4, y: 8.2 },
            { x: 5, y: 10.1 },
          ],
          2,
        )
        assert.equal(result.ok, true)
        assert.ok(Number.isFinite(result.forecast[0]?.lower))
        assert.ok(Number.isFinite(result.forecast[0]?.upper))
      })

      // ── chart validation ──────────────────────────────────────
      check('chart', 'accepts a valid bar chart', () => {
        assert.deepEqual(
          normalizeChartSpec({ type: 'bar', x: 'region', y: 'amount', aggregation: 'sum' }),
          { type: 'bar', x: 'region', y: 'amount', aggregation: 'sum' },
        )
      })
      check('chart', 'rejects an unknown chart type', () => {
        assert.equal(
          normalizeChartSpec({ type: 'radar', x: 'region', y: 'amount', aggregation: 'sum' }),
          null,
        )
      })
      check('chart', 'rejects a missing axis', () => {
        assert.equal(
          normalizeChartSpec({ type: 'bar', x: '', y: 'amount', aggregation: 'sum' }),
          null,
        )
      })
      check('chart', 'rejects an unsupported aggregation', () => {
        assert.equal(
          normalizeChartSpec({ type: 'bar', x: 'region', y: 'amount', aggregation: 'median' }),
          null,
        )
      })

      // ── assistant contract and local automation ───────────────
      const status = analyticsAssistantStatus(join(root, 'missing-ai.json'))
      check('assistant', 'reports the current harness', () =>
        assert.equal(status.harness, 'analytics-agent-v5'),
      )
      check('assistant', 'exposes all tools', () => assert.equal(status.tools, 25))
      check('assistant', 'local automation is available without a model', () =>
        assert.equal(status.localAutomation, true),
      )
      const autoDeps: AssistantDeps = {
        settingsPath: join(root, 'missing-ai.json'),
        listDatasets: () => [sales],
        getDataset: () => detail,
        importUrl: async () => sales,
        inspectUrl: async (url) => ({
          url,
          host: 'example.com',
          pageTitle: '',
          contentType: 'text/html',
          tables: [],
          dataLinks: [],
          textPreview: '',
          note: '',
        }),
        importFile: async () => sales,
        listDatabaseTables: async () => [],
        importDatabaseTable: async () => sales,
        clean: async () => ({ ok: true }),
        runQuery: () => ({ columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 0 }),
        joinDatasets: async () => ({ ok: false, error: 'not used' }),
        appendDatasets: async () => ({ ok: false, error: 'not used' }),
        saveView: (input) => ({
          id: 'view',
          datasetId: input.datasetId,
          name: input.name,
          sql: input.sql,
          chart: input.chart,
          createdAt: 1,
          updatedAt: 1,
        }),
        listViews: () => [],
        forecast: () => ({ ok: false }),
        autoAnalyze: async (id) => ({
          ok: true,
          datasetId: id,
          summary: {
            rowCount: 6,
            columnCount: 8,
            qualityScore: 90,
            missingCells: 1,
            duplicateRows: 1,
            primaryMetric: 'amount',
            primaryDimension: 'region',
            timeColumn: 'date',
          },
          insights: [],
          views: [],
          prepared: [],
          methods: [],
          elapsedMs: 1,
        }),
        audit: () => {},
        emit: () => {},
      }
      const autoReply = await runAnalyticsAssistant(
        { text: 'Do everything.', activeDatasetId: sales.id, mode: 'auto' },
        autoDeps,
      )
      check('assistant', 'auto mode executes the local pipeline', () => {
        assert.equal(autoReply.ok, true)
        assert.deepEqual(autoReply.actions.map((action) => action.tool), ['auto_analyze'])
      })

      // ── score ─────────────────────────────────────────────────
      const failures: Array<{ category: string; name: string; error: string }> = []
      let passed = 0
      for (const entry of checks) {
        try {
          await entry.run()
          passed += 1
        } catch (error) {
          failures.push({
            category: entry.category,
            name: entry.name,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      const total = checks.length
      const score = (passed / total) * 100
      console.log(
        `Analytics accuracy benchmark: ${passed}/${total} checks passed (${score.toFixed(1)}%).`,
      )
      if (failures.length > 0) {
        console.log(
          failures
            .map((failure) => `[${failure.category}] ${failure.name}: ${failure.error}`)
            .join('\n'),
        )
      }
      assert.equal(failures.length, 0, `${failures.length} benchmark check(s) failed.`)
      assert.ok(score >= 95, `Measured score ${score.toFixed(1)}% is below the 95% release gate.`)
    } finally {
      salesDb?.close()
      eventsHandle?.close()
      store.close()
      rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    }
  }, 60_000)
})
