import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_CHANNELS } from '../src/shared/analytics-api'

const electronState = vi.hoisted(() => ({
  userData: '',
  savePath: '',
  beforeQuit: null as null | (() => void),
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => electronState.userData,
    once: (event: string, callback: () => void) => {
      if (event === 'before-quit') electronState.beforeQuit = callback
    },
  },
  BrowserWindow: { getFocusedWindow: () => null },
  dialog: {
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
    showSaveDialog: async () => ({
      canceled: !electronState.savePath,
      filePath: electronState.savePath,
    }),
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      electronState.handlers.set(channel, handler)
    },
  },
}))

import {
  registerAnalyticsIpc,
  stopAnalyticsWorkflowScheduler,
} from '../src/main/analytics/service'

const pythonCommand = process.env.PLOTDOCS_PYTHON || 'python'
const hasPython =
  spawnSync(pythonCommand, ['-V'], { encoding: 'utf8', windowsHide: true }).status === 0

function handler<T extends (...args: never[]) => unknown>(channel: string): T {
  const found = electronState.handlers.get(channel)
  if (!found) throw new Error(`No handler registered for ${channel}`)
  return found as T
}

let temporaryRoot = ''
let csvPath = ''
let regionsPath = ''
let datasetId = ''

beforeAll(() => {
  temporaryRoot = mkdtempSync(join(tmpdir(), 'plotdocs-data-analytics-ipc-'))
  electronState.userData = join(temporaryRoot, 'userData')
  csvPath = join(temporaryRoot, 'sales.csv')
  writeFileSync(
    csvPath,
    [
      'id,month,region,amount,note',
      '1,1,East,10, alpha ',
      '1,1,East,10, alpha ',
      '3,3,West,20,beta',
      '4,4,West,,gamma',
      '5,5,North,30,delta',
    ].join('\r\n'),
    'utf8',
  )
  regionsPath = join(temporaryRoot, 'regions.csv')
  writeFileSync(regionsPath, ['region,manager', 'East,Ada', 'North,Grace'].join('\r\n'), 'utf8')
  registerAnalyticsIpc()
})

afterAll(() => {
  stopAnalyticsWorkflowScheduler()
  electronState.beforeQuit?.()
  rmSync(temporaryRoot, { recursive: true, force: true })
})

describe('data analytics IPC', () => {
  it('imports a file, profiles it, and executes read-only SQL', async () => {
    const imported = await handler<(...args: never[]) => Promise<{ id: string; rowCount: number }>>(
      ANALYTICS_CHANNELS.importPath,
    )({}, csvPath)
    datasetId = imported.id
    expect(imported.rowCount).toBe(5)

    const detail = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.getDataset,
    )({}, datasetId)
    expect(detail).toMatchObject({
      id: datasetId,
      rowCount: 5,
      columnCount: 5,
      duplicateRows: 1,
      missingCells: 1,
    })

    const query = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.runQuery,
    )(
      {},
      datasetId,
      'SELECT region, SUM(amount) AS total FROM data GROUP BY region ORDER BY total DESC, region ASC',
      100,
    )
    expect(query).toMatchObject({
      columns: ['region', 'total'],
      rows: [
        ['North', 30],
        ['East', 20],
        ['West', 20],
      ],
      rowCount: 3,
      truncated: false,
    })

    expect(() =>
      handler<(...args: never[]) => unknown>(ANALYTICS_CHANNELS.runQuery)(
        {},
        datasetId,
        'DELETE FROM data',
        100,
      ),
    ).toThrow('must start with SELECT or WITH')
  })

  it('rejects malformed IPC payloads and relative import paths', async () => {
    const importPath = handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.importPath,
    )
    await expect(importPath({}, 'sales.csv')).rejects.toThrow('absolute path')
    await expect(importPath({}, 42)).rejects.toThrow('Invalid file path')
    await expect(importPath({}, 'x'.repeat(5_000))).rejects.toThrow('Invalid file path')
    await expect(importPath({}, join(temporaryRoot, 'missing.csv'))).rejects.toThrow(
      'no longer exists',
    )

    expect(() =>
      handler<(...args: never[]) => unknown>(ANALYTICS_CHANNELS.runQuery)(
        {},
        42,
        'SELECT 1',
        10,
      ),
    ).toThrow('Invalid query request')
    expect(() =>
      handler<(...args: never[]) => unknown>(ANALYTICS_CHANNELS.runQuery)(
        {},
        datasetId,
        'SELECT 1; SELECT 2',
        10,
      ),
    ).toThrow('Only one SQL statement')

    const badJoin = await handler<(...args: never[]) => Promise<{ ok: boolean }>>(
      ANALYTICS_CHANNELS.joinDatasets,
    )({}, { leftDatasetId: datasetId })
    expect(badJoin.ok).toBe(false)
    const badAppend = await handler<(...args: never[]) => Promise<{ ok: boolean }>>(
      ANALYTICS_CHANNELS.appendDatasets,
    )({}, { leftDatasetId: datasetId, rightDatasetId: datasetId, mode: 'all' })
    expect(badAppend.ok).toBe(false)
  })

  it('cleans with a backup and restores the original rows', async () => {
    const cleaned = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.clean,
    )({}, datasetId, { kind: 'drop_duplicates' })
    expect(cleaned).toMatchObject({ ok: true, dataset: { rowCount: 4, canUndo: true } })

    // A backup covers exactly one cleaning step. Undo after the duplicate
    // removal restores the source rows, not a later state.
    const restored = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.undoClean,
    )({}, datasetId)
    expect(restored).toMatchObject({ ok: true, dataset: { rowCount: 5, canUndo: false } })

    const trimmed = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.clean,
    )({}, datasetId, { kind: 'trim', column: 'note' })
    expect(trimmed).toMatchObject({ ok: true, dataset: { rowCount: 5, canUndo: true } })

    const trimmedRows = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.runQuery,
    )({}, datasetId, 'SELECT note FROM data WHERE id = 1 LIMIT 1', 10)
    expect(trimmedRows).toMatchObject({ rows: [['alpha']] })

    const undoTrim = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.undoClean,
    )({}, datasetId)
    expect(undoTrim).toMatchObject({ ok: true, dataset: { rowCount: 5, canUndo: false } })

    const invalid = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.clean,
    )({}, datasetId, { kind: 'fill_mean', column: 'region' })
    expect(invalid).toMatchObject({ ok: false })
  })

  it('joins two local datasets into a new dataset without changing either source', async () => {
    const regions = await handler<
      (...args: never[]) => Promise<{ id: string; name: string; rowCount: number }>
    >(ANALYTICS_CHANNELS.importPath)({}, regionsPath)
    expect(regions).toMatchObject({ name: 'regions', rowCount: 2 })

    type JoinResponse = {
      ok: boolean
      error?: string
      dataset?: {
        id: string
        name: string
        sourceType: string
        rowCount: number
        columnCount: number
      }
      sql?: string
      warning?: string
      elapsedMs?: number
    }
    const join = handler<(...args: never[]) => Promise<JoinResponse>>(
      ANALYTICS_CHANNELS.joinDatasets,
    )
    const joined = await join({}, {
      leftDatasetId: datasetId,
      rightDatasetId: regions.id,
      leftKey: 'region',
      rightKey: 'region',
      joinType: 'left',
      name: 'Sales with regions',
    })
    expect(joined).toMatchObject({
      ok: true,
      dataset: {
        name: 'Sales with regions',
        sourceType: 'join',
        rowCount: 5,
        columnCount: 7,
      },
    })
    expect(joined.sql).toContain('LEFT JOIN')
    expect(joined.warning).toContain('right_region')
    expect(joined.warning).toContain('2 left rows had no match')

    const managers = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.runQuery,
    )(
      {},
      joined.dataset!.id,
      'SELECT manager, COUNT(*) AS n FROM data GROUP BY manager ORDER BY manager IS NULL, n DESC, manager ASC',
      100,
    )
    expect(managers).toMatchObject({
      columns: ['manager', 'n'],
      rows: [
        ['Ada', 2],
        ['Grace', 1],
        [null, 2],
      ],
    })

    // The left source is untouched by the derived join.
    const source = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.getDataset,
    )({}, datasetId)
    expect(source).toMatchObject({ rowCount: 5, columnCount: 5 })

    const inner = await join({}, {
      leftDatasetId: datasetId,
      rightDatasetId: regions.id,
      leftKey: 'region',
      rightKey: 'region',
      joinType: 'inner',
      name: 'Sales inner regions',
    })
    expect(inner).toMatchObject({ ok: true, dataset: { rowCount: 3 } })
    expect(inner.warning).toContain('excluded by the inner join')

    const invalidKey = await join({}, {
      leftDatasetId: datasetId,
      rightDatasetId: regions.id,
      leftKey: 'not_a_column',
      rightKey: 'region',
      joinType: 'left',
    })
    expect(invalidKey.ok).toBe(false)
    expect(invalidKey.error).toContain('no column named')

    const sameDataset = await join({}, {
      leftDatasetId: datasetId,
      rightDatasetId: datasetId,
      leftKey: 'region',
      rightKey: 'region',
      joinType: 'left',
    })
    expect(sameDataset.ok).toBe(false)
    expect(sameDataset.error).toContain('different datasets')

    for (const id of [joined.dataset!.id, inner.dataset!.id, regions.id]) {
      expect(
        await handler<(...args: never[]) => Promise<boolean>>(ANALYTICS_CHANNELS.deleteDataset)(
          {},
          id,
        ),
      ).toBe(true)
    }
  })

  it('appends and unions same-schema datasets without changing either source', async () => {
    const morePath = join(temporaryRoot, 'more-sales.csv')
    writeFileSync(
      morePath,
      [
        'id,month,region,amount,note',
        '1,1,East,10, alpha ',
        '6,6,East,40,epsilon',
      ].join('\r\n'),
      'utf8',
    )
    const more = await handler<
      (...args: never[]) => Promise<{ id: string; name: string; rowCount: number }>
    >(ANALYTICS_CHANNELS.importPath)({}, morePath)
    expect(more).toMatchObject({ name: 'more-sales', rowCount: 2 })

    type AppendResponse = {
      ok: boolean
      error?: string
      mode?: string
      dataset?: {
        id: string
        name: string
        sourceType: string
        rowCount: number
        columnCount: number
      }
      sql?: string
      warning?: string
      elapsedMs?: number
    }
    const append = handler<(...args: never[]) => Promise<AppendResponse>>(
      ANALYTICS_CHANNELS.appendDatasets,
    )
    const all = await append({}, {
      leftDatasetId: datasetId,
      rightDatasetId: more.id,
      mode: 'all',
      name: 'All sales rows',
    })
    expect(all).toMatchObject({
      ok: true,
      mode: 'all',
      dataset: {
        name: 'All sales rows',
        sourceType: 'union',
        rowCount: 7,
        columnCount: 5,
      },
    })
    expect(all.sql).toContain('UNION ALL')

    const distinct = await append({}, {
      leftDatasetId: datasetId,
      rightDatasetId: more.id,
      mode: 'distinct',
      name: 'Distinct sales rows',
    })
    expect(distinct).toMatchObject({
      ok: true,
      mode: 'distinct',
      dataset: { rowCount: 5, columnCount: 5 },
    })
    expect(distinct.sql).toContain('UNION')
    expect(distinct.sql).not.toContain('UNION ALL')
    expect(distinct.warning).toContain('removed 2 exact duplicate rows')

    const regions = await handler<
      (...args: never[]) => Promise<{ id: string; name: string; rowCount: number }>
    >(ANALYTICS_CHANNELS.importPath)({}, regionsPath)
    const mismatch = await append({}, {
      leftDatasetId: datasetId,
      rightDatasetId: regions.id,
      mode: 'all',
    })
    expect(mismatch.ok).toBe(false)
    expect(mismatch.error).toContain('same column names')

    const same = await append({}, {
      leftDatasetId: datasetId,
      rightDatasetId: datasetId,
      mode: 'all',
    })
    expect(same.ok).toBe(false)
    expect(same.error).toContain('different datasets')

    const source = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.getDataset,
    )({}, datasetId)
    expect(source).toMatchObject({ rowCount: 5, columnCount: 5 })

    for (const id of [all.dataset!.id, distinct.dataset!.id, more.id, regions.id]) {
      expect(
        await handler<(...args: never[]) => Promise<boolean>>(ANALYTICS_CHANNELS.deleteDataset)(
          {},
          id,
        ),
      ).toBe(true)
    }
  })

  it('saves normalized views and runs the transparent forecast', async () => {
    const saved = await handler<(...args: never[]) => Promise<{ id: string; chart: unknown }>>(
      ANALYTICS_CHANNELS.saveView,
    )(
      {},
      {
        datasetId,
        name: 'Regional totals',
        sql: 'SELECT region, SUM(amount) AS total FROM data GROUP BY region',
        chart: { type: 'pie', x: 'region', y: 'total', aggregation: 'sum' },
      },
    )
    expect(saved.chart).toEqual({
      type: 'pie',
      x: 'region',
      y: 'total',
      aggregation: 'sum',
    })

    const invalidChart = await handler<
      (...args: never[]) => Promise<{ id: string; chart: unknown }>
    >(ANALYTICS_CHANNELS.saveView)(
      {},
      {
        datasetId,
        name: 'Invalid chart',
        sql: 'SELECT region, SUM(amount) AS total FROM data GROUP BY region',
        chart: { type: 'radar', x: 'region', y: 'total', aggregation: 'sum' },
      },
    )
    expect(invalidChart.chart).toBeNull()
    await handler<(...args: never[]) => Promise<boolean>>(ANALYTICS_CHANNELS.deleteView)(
      {},
      invalidChart.id,
    )

    const views = await handler<(...args: never[]) => Promise<unknown[]>>(
      ANALYTICS_CHANNELS.listViews,
    )({}, datasetId)
    expect(views).toHaveLength(1)

    const forecast = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.forecast,
    )({}, datasetId, 'month', 'amount')
    expect(forecast).toMatchObject({ ok: true, xColumn: 'month', yColumn: 'amount' })
    expect((forecast as { forecast: unknown[] }).forecast).toHaveLength(6)

    const removed = await handler<(...args: never[]) => Promise<boolean>>(
      ANALYTICS_CHANNELS.deleteView,
    )({}, saved.id)
    expect(removed).toBe(true)
  })

  it.skipIf(!hasPython)('runs the safe Python aggregation through IPC', async () => {
    const result = await handler<(...args: never[]) => Promise<unknown>>(
      ANALYTICS_CHANNELS.python,
    )(
      {},
      {
        datasetId,
        groupBy: 'region',
        metric: 'amount',
        aggregation: 'sum',
        limit: 10,
      },
    )
    expect(result).toMatchObject({
      ok: true,
      result: {
        columns: ['group', 'value'],
        rows: [
          ['North', 30],
          ['East', 20],
          ['West', 20],
        ],
      },
    })
  })

  it('exports the exact query result as CSV', async () => {
    electronState.savePath = join(temporaryRoot, 'regional')
    const exported = await handler<(...args: never[]) => Promise<string | null>>(
      ANALYTICS_CHANNELS.exportCsv,
    )({}, datasetId, 'SELECT region, amount FROM data ORDER BY id', 'regional')
    expect(exported).toBe(join(temporaryRoot, 'regional.csv'))
    expect(existsSync(exported!)).toBe(true)
    expect(readFileSync(exported!, 'utf8')).toBe(
      'region,amount\r\nEast,10\r\nEast,10\r\nWest,20\r\nWest,\r\nNorth,30\r\n',
    )
  })

  it('runs full auto through IPC and keeps Auto dashboard cards idempotent', async () => {
    const first = await handler<
      (...args: never[]) => Promise<{
        ok: boolean
        insights: Array<{ kind: string; sql?: string }>
        views: Array<{ id: string; name: string }>
      }>
    >(ANALYTICS_CHANNELS.autoAnalyze)({}, { datasetId, prepare: false })
    expect(first.ok).toBe(true)
    expect(first.insights.map((insight) => insight.kind)).toEqual(
      expect.arrayContaining(['quality', 'ranking', 'distribution']),
    )
    expect(first.views.length).toBeGreaterThanOrEqual(2)
    expect(first.views.every((view) => view.name.startsWith('Auto · '))).toBe(true)

    const second = await handler<
      (...args: never[]) => Promise<{ ok: boolean; views: Array<{ id: string }> }>
    >(ANALYTICS_CHANNELS.autoAnalyze)({}, { datasetId, prepare: false })
    expect(second.ok).toBe(true)
    const views = await handler<(...args: never[]) => Promise<unknown[]>>(
      ANALYTICS_CHANNELS.listViews,
    )({}, datasetId)
    expect(views).toHaveLength(first.views.length)
  })

  it('saves, runs, versions, pauses, and deletes an automation workflow', async () => {
    const saved = await handler<
      (...args: never[]) => Promise<{
        id: string
        name: string
        version: number
        enabled: boolean
        prepare: boolean
        runCount: number
        nextRunAt?: number
      }>
    >(ANALYTICS_CHANNELS.saveWorkflow)({}, {
      datasetId,
      name: 'Daily sales refresh',
      schedule: { frequency: 'daily', hour: 9, weekday: 1 },
      enabled: true,
      prepare: true,
      maxRetries: 1,
    })
    expect(saved).toMatchObject({
      name: 'Daily sales refresh',
      version: 1,
      enabled: true,
      prepare: true,
      runCount: 0,
    })
    expect(saved.nextRunAt).toBeGreaterThan(Date.now())

    expect(
      await handler<(...args: never[]) => Promise<unknown[]>>(ANALYTICS_CHANNELS.listWorkflowRuns)(
        {},
        saved.id,
      ),
    ).toHaveLength(0)

    const result = await handler<
      (...args: never[]) => Promise<{
        ok: boolean
        workflow?: { lastRunStatus?: string; runCount: number }
        run?: {
          status: string
          attempts: number
          rowsBefore?: number
          rowsAfter?: number
          insights: number
          views: number
          message: string
        }
      }>
    >(ANALYTICS_CHANNELS.runWorkflow)({}, saved.id)
    expect(result.ok).toBe(true)
    expect(result.workflow).toMatchObject({ lastRunStatus: 'ok', runCount: 1 })
    expect(result.run).toMatchObject({
      status: 'ok',
      attempts: 1,
      rowsBefore: 5,
      rowsAfter: 4,
    })
    expect(result.run!.insights).toBeGreaterThanOrEqual(2)
    expect(result.run!.views).toBeGreaterThanOrEqual(2)
    expect(result.run!.message).toContain('Refreshed')

    const runs = await handler<
      (...args: never[]) => Promise<Array<{ status: string; attempts: number }>>
    >(ANALYTICS_CHANNELS.listWorkflowRuns)({}, saved.id, 10)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ status: 'ok', attempts: 1 })

    const versions = await handler<
      (...args: never[]) => Promise<Array<{ version: number; enabled: boolean }>>
    >(ANALYTICS_CHANNELS.listWorkflowVersions)({}, saved.id)
    expect(versions.map((version) => version.version)).toEqual([1])

    const updated = await handler<
      (...args: never[]) => Promise<{
        version: number
        enabled: boolean
        nextRunAt?: number
      }>
    >(ANALYTICS_CHANNELS.saveWorkflow)({}, {
      id: saved.id,
      datasetId,
      name: 'Manual sales refresh',
      schedule: { frequency: 'manual', hour: 9, weekday: 1 },
      enabled: false,
      prepare: true,
      maxRetries: 2,
    })
    expect(updated.version).toBe(2)
    expect(updated.enabled).toBe(false)
    expect(updated.nextRunAt).toBeUndefined()

    const updatedVersions = await handler<
      (...args: never[]) => Promise<Array<{ version: number; enabled: boolean }>>
    >(ANALYTICS_CHANNELS.listWorkflowVersions)({}, saved.id)
    expect(updatedVersions.map((version) => version.version)).toEqual([2, 1])

    expect(() =>
      handler<(...args: never[]) => unknown>(ANALYTICS_CHANNELS.saveWorkflow)({}, {
        datasetId,
        name: 'Invalid schedule',
        schedule: { frequency: 'daily', hour: 99, weekday: 1 },
        enabled: true,
      }),
    ).toThrow('Choose a valid schedule.')

    // Scheduled mutation is opt-in. Omitting prepare must not remove rows.
    const analysisOnly = await handler<
      (...args: never[]) => Promise<{ id: string; prepare: boolean; maxRetries: number }>
    >(ANALYTICS_CHANNELS.saveWorkflow)({}, {
      datasetId,
      name: 'Analysis only',
      schedule: { frequency: 'manual', hour: 9, weekday: 1 },
      enabled: false,
    })
    expect(analysisOnly.prepare).toBe(false)
    expect(analysisOnly.maxRetries).toBe(1)
    expect(
      await handler<(...args: never[]) => Promise<boolean>>(ANALYTICS_CHANNELS.deleteWorkflow)(
        {},
        analysisOnly.id,
      ),
    ).toBe(true)

    expect(
      await handler<(...args: never[]) => Promise<boolean>>(ANALYTICS_CHANNELS.deleteWorkflow)(
        {},
        saved.id,
      ),
    ).toBe(true)
    expect(
      await handler<(...args: never[]) => Promise<unknown[]>>(ANALYTICS_CHANNELS.listWorkflows)(
        {},
        datasetId,
      ),
    ).toHaveLength(0)
  })

  it('records audit events and deletes the dataset', async () => {
    const audit = await handler<(...args: never[]) => Promise<Array<{ action: string }>>>(
      ANALYTICS_CHANNELS.listAudit,
    )({})
    expect(audit.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'import',
        'query',
        'join',
        'join-failed',
        'append',
        'append-failed',
        'clean',
        'undo-clean',
        'forecast',
        'export-csv',
        'auto-analysis',
        'workflow-create',
        'workflow-run',
        'workflow-update',
        'workflow-delete',
      ]),
    )

    const deleted = await handler<(...args: never[]) => Promise<boolean>>(
      ANALYTICS_CHANNELS.deleteDataset,
    )({}, datasetId)
    expect(deleted).toBe(true)
    const datasets = await handler<(...args: never[]) => Promise<unknown[]>>(
      ANALYTICS_CHANNELS.listDatasets,
    )({})
    expect(datasets).toHaveLength(0)
  })
})
