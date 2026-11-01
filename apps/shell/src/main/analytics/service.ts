import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { basename, extname, isAbsolute, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type {
  AnalyticsAiPlanResult,
  AnalyticsAppendRequest,
  AnalyticsAppendResult,
  AnalyticsAskResult,
  AnalyticsAssistantEvent,
  AnalyticsAutoAnalysis,
  AnalyticsAutoRequest,
  AnalyticsAssistantReply,
  AnalyticsAssistantRequest,
  AnalyticsAssistantStatus,
  AnalyticsAuditEvent,
  AnalyticsCell,
  AnalyticsCleanOperation,
  AnalyticsCleanResult,
  AnalyticsDatabaseSource,
  AnalyticsDatabaseTable,
  AnalyticsDataset,
  AnalyticsDatasetDetail,
  AnalyticsForecastResult,
  AnalyticsJoinRequest,
  AnalyticsJoinResult,
  AnalyticsPythonRequest,
  AnalyticsPythonResult,
  AnalyticsQueryResult,
  AnalyticsSavedView,
  AnalyticsUrlInspection,
  AnalyticsWorkflow,
  AnalyticsWorkflowInput,
  AnalyticsWorkflowRun,
  AnalyticsWorkflowRunResult,
  AnalyticsWorkflowVersion,
} from '../../shared/analytics-api'
import { ANALYTICS_CHANNELS } from '../../shared/analytics-api'
import { parseAnalyticsFile } from './import'
import { profileDataset } from './profile'
import { askAnalyticsAi } from './ai'
import { buildLocalInterpretation, runAutoAnalysis } from './auto'
import { analyticsAssistantStatus, runAnalyticsAssistant } from './assistant'
import { interpretAnalysisWithAi } from './interpret'
import { planDatasetWithAi } from './plan'
import { runPythonAggregation } from './python'
import { AnalyticsStore } from './store'
import {
  fetchUrlTable,
  importDatabaseTable,
  inspectUrlTables,
  listDatabaseTables,
  normalizeDatabaseSource,
  redactConnection,
  sourceLabelForUrl,
  urlSourceDetail,
} from './sources'
import {
  installReadOnlyAuthorizer,
  quoteIdent,
  toCsv,
  validateReadOnlySql,
} from './sql'
import { normalizeChartSpec, normalizeCleanOperation } from './validation'
import { linearForecast } from './forecast'
import { nextWorkflowRun, normalizeWorkflowSchedule } from './schedule'

let store: AnalyticsStore | null = null
let registered = false
let schedulerTimer: ReturnType<typeof setInterval> | null = null
let schedulerKickoff: ReturnType<typeof setTimeout> | null = null
let schedulerRecovered = false
let dueRunInFlight = false
let workflowRunLock: Promise<void> = Promise.resolve()
const activeAssistantSenders = new Set<number>()
const runningWorkflows = new Set<string>()

function analyticsStore(): AnalyticsStore {
  if (!store) {
    store = new AnalyticsStore(join(app.getPath('userData'), 'analytics'))
  }
  return store
}

function audit(action: string, detail: unknown): void {
  try {
    analyticsStore().recordAudit(action, detail)
  } catch {
    /* auditing must never fail an analysis */
  }
}

const MAX_QUERY_ROWS = 5_000
const MAX_EXPORT_ROWS = 250_000

function normalizeLimit(value: unknown, fallback = 500, maximum = MAX_QUERY_ROWS): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(1, Math.floor(number)))
}

function cell(value: unknown): AnalyticsCell {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'bigint') return Number(value)
  return String(value)
}

function queryDataset(
  id: string,
  sqlRaw: string,
  limitRaw?: unknown,
  maximumRows = MAX_QUERY_ROWS,
): AnalyticsQueryResult {
  const analytics = analyticsStore()
  analytics.assertDatasetId(id)
  if (!analytics.getDataset(id)) throw new Error('Dataset not found.')
  const sql = validateReadOnlySql(sqlRaw)
  const limit = normalizeLimit(limitRaw, 500, maximumRows)
  const path = analytics.datasetDbPath(id)
  if (!existsSync(path)) throw new Error('Dataset storage is missing. Re-import the file.')
  const db = new DatabaseSync(path, { readOnly: true })
  const started = Date.now()
  try {
    db.exec('PRAGMA query_only = ON')
    installReadOnlyAuthorizer(db)
    const statement = db.prepare(sql)
    const columns = statement.columns().map((column) => column.name)
    statement.setReturnArrays(true)
    const rows: AnalyticsCell[][] = []
    let truncated = false
    for (const row of statement.iterate()) {
      if (rows.length >= limit) {
        truncated = true
        break
      }
      rows.push((row as unknown as unknown[]).map(cell))
    }
    const elapsedMs = Date.now() - started
    audit('query', { datasetId: id, sql: sql.slice(0, 2000), rowCount: rows.length, truncated })
    return { columns, rows, rowCount: rows.length, truncated, elapsedMs }
  } catch (error) {
    audit('query-failed', {
      datasetId: id,
      sql: sql.slice(0, 2000),
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    try {
      db.close()
    } catch {
      /* already closed */
    }
  }
}

function normalizeJoinInput(raw: unknown): AnalyticsJoinRequest {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid join request.')
  const record = raw as Record<string, unknown>
  const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
  const leftDatasetId = text(record.leftDatasetId)
  const rightDatasetId = text(record.rightDatasetId)
  const leftKey = text(record.leftKey)
  const rightKey = text(record.rightKey)
  if (!leftDatasetId || !rightDatasetId) throw new Error('Choose two datasets to join.')
  if (!leftKey || !rightKey) throw new Error('Choose a join key for each dataset.')
  if (record.joinType !== 'inner' && record.joinType !== 'left') {
    throw new Error('Choose an inner or left join.')
  }
  const name = text(record.name).slice(0, 120)
  return {
    leftDatasetId,
    rightDatasetId,
    leftKey,
    rightKey,
    joinType: record.joinType,
    ...(name ? { name } : {}),
  }
}

/**
 * Materialize a local join as a new dataset. This is an additive operation:
 * neither source dataset is modified, and the derived dataset can be deleted
 * independently. The exact logical SQL and any key warnings are returned.
 */
function joinDatasets(raw: unknown): AnalyticsJoinResult {
  const started = Date.now()
  let input: AnalyticsJoinRequest | null = null
  try {
    input = normalizeJoinInput(raw)
    const analytics = analyticsStore()
    const left = analytics.getDataset(input.leftDatasetId)
    if (!left) throw new Error('The left dataset no longer exists.')
    const right = analytics.getDataset(input.rightDatasetId)
    if (!right) throw new Error('The right dataset no longer exists.')
    if (left.id === right.id) throw new Error('Choose two different datasets to join.')
    const name = input.name || `${left.name} + ${right.name}`.slice(0, 120)
    const joined = analytics.createJoinedDataset({
      leftId: left.id,
      rightId: right.id,
      leftKey: input.leftKey,
      rightKey: input.rightKey,
      joinType: input.joinType,
      name,
    })
    let warning = joined.warning
    try {
      profileDataset(analytics, joined.dataset.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warning = [warning, `Profiling failed after the join: ${message}`].filter(Boolean).join(' ')
    }
    analytics.updateDatasetWarning(joined.dataset.id, warning ?? null)
    audit('join', {
      datasetId: joined.dataset.id,
      name,
      leftDatasetId: left.id,
      rightDatasetId: right.id,
      leftKey: input.leftKey,
      rightKey: input.rightKey,
      joinType: input.joinType,
      rows: joined.dataset.rowCount,
      columns: joined.dataset.columnCount,
      sql: joined.sql.slice(0, 4_000),
    })
    const latest = analytics.getDataset(joined.dataset.id)
    return {
      ok: true,
      dataset: latest ?? joined.dataset,
      sql: joined.sql,
      ...(warning ? { warning } : {}),
      elapsedMs: Date.now() - started,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    audit('join-failed', {
      leftDatasetId: input?.leftDatasetId,
      rightDatasetId: input?.rightDatasetId,
      leftKey: input?.leftKey,
      rightKey: input?.rightKey,
      joinType: input?.joinType,
      error: message,
    })
    return { ok: false, error: message, elapsedMs: Date.now() - started }
  }
}

function normalizeAppendInput(raw: unknown): AnalyticsAppendRequest {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid append request.')
  const record = raw as Record<string, unknown>
  const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
  const leftDatasetId = text(record.leftDatasetId)
  const rightDatasetId = text(record.rightDatasetId)
  if (!leftDatasetId || !rightDatasetId) throw new Error('Choose two datasets to append.')
  if (record.mode !== 'all' && record.mode !== 'distinct') {
    throw new Error('Choose append all rows or union distinct rows.')
  }
  const name = text(record.name).slice(0, 120)
  return {
    leftDatasetId,
    rightDatasetId,
    mode: record.mode,
    ...(name ? { name } : {}),
  }
}

/**
 * Append two same-schema datasets into a new local dataset. This is additive:
 * neither source is modified, and the derived dataset can be deleted
 * independently. The exact logical UNION SQL and any warnings are returned.
 */
function appendDatasets(raw: unknown): AnalyticsAppendResult {
  const started = Date.now()
  let input: AnalyticsAppendRequest | null = null
  try {
    input = normalizeAppendInput(raw)
    const analytics = analyticsStore()
    const left = analytics.getDataset(input.leftDatasetId)
    if (!left) throw new Error('The left dataset no longer exists.')
    const right = analytics.getDataset(input.rightDatasetId)
    if (!right) throw new Error('The right dataset no longer exists.')
    if (left.id === right.id) throw new Error('Choose two different datasets to append.')
    const name = input.name || `${left.name} + ${right.name}`.slice(0, 120)
    const appended = analytics.createAppendedDataset({
      leftId: left.id,
      rightId: right.id,
      mode: input.mode,
      name,
    })
    let warning = appended.warning
    try {
      profileDataset(analytics, appended.dataset.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warning = [warning, `Profiling failed after the append: ${message}`].filter(Boolean).join(' ')
    }
    analytics.updateDatasetWarning(appended.dataset.id, warning ?? null)
    audit('append', {
      datasetId: appended.dataset.id,
      name,
      leftDatasetId: left.id,
      rightDatasetId: right.id,
      mode: input.mode,
      rows: appended.dataset.rowCount,
      columns: appended.dataset.columnCount,
      sql: appended.sql.slice(0, 4_000),
    })
    const latest = analytics.getDataset(appended.dataset.id)
    return {
      ok: true,
      dataset: latest ?? appended.dataset,
      mode: input.mode,
      sql: appended.sql,
      ...(warning ? { warning } : {}),
      elapsedMs: Date.now() - started,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    audit('append-failed', {
      leftDatasetId: input?.leftDatasetId,
      rightDatasetId: input?.rightDatasetId,
      mode: input?.mode,
      error: message,
    })
    return { ok: false, error: message, elapsedMs: Date.now() - started }
  }
}

function datasetDetail(id: string): AnalyticsDatasetDetail {
  const analytics = analyticsStore()
  const dataset = analytics.getDataset(id)
  if (!dataset) throw new Error('Dataset not found.')
  let profile = analytics.getProfile(id)
  if (!profile) {
    const profiled = profileDataset(analytics, id)
    return profiled
  }
  return {
    ...dataset,
    columns: (profile.columns ?? []) as AnalyticsDatasetDetail['columns'],
    preview: (profile.preview ?? { columns: [], rows: [], truncated: false }) as AnalyticsDatasetDetail['preview'],
  }
}

async function importPath(path: string): Promise<AnalyticsDataset> {
  const table = await parseAnalyticsFile(path)
  return createImportedDataset(table, { kind: 'file', sourceName: table.sourceName })
}

function createImportedDataset(
  table: Awaited<ReturnType<typeof parseAnalyticsFile>>,
  auditContext: Record<string, unknown>,
): AnalyticsDataset {
  const analytics = analyticsStore()
  const dataset = analytics.createDataset(table)
  try {
    profileDataset(analytics, dataset.id)
    analytics.updateDatasetWarning(
      dataset.id,
      table.warning ?? (table.sourceType === 'xlsx' ? 'Imported first worksheet only.' : null),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    analytics.updateDatasetWarning(
      dataset.id,
      `Imported, but profiling failed: ${message}. SQL is still available.`,
    )
  }
  audit('import', {
    datasetId: dataset.id,
    name: dataset.name,
    sourceName: dataset.sourceName,
    rows: dataset.rowCount,
    columns: dataset.columnCount,
    ...auditContext,
  })
  const result = analytics.getDataset(dataset.id)
  if (!result) throw new Error('Dataset metadata could not be read after import.')
  return result
}

async function cleanDataset(id: string, operation: AnalyticsCleanOperation): Promise<AnalyticsCleanResult> {
  const analytics = analyticsStore()
  const dataset = analytics.getDataset(id)
  if (!dataset) return { ok: false, error: 'Dataset not found.' }
  const cleanOperation = normalizeCleanOperation(operation)
  if (!cleanOperation) return { ok: false, error: 'Invalid cleaning request.' }
  const db = analytics.openDataset(id)
  let backupMade = false
  let committed = false
  let message = ''
  try {
    const tableInfo = db
      .prepare('PRAGMA table_info(data)')
      .all() as unknown as Array<{ name: string; type: string }>
    const columnNames = new Set(tableInfo.map((column) => column.name))
    const target = 'column' in cleanOperation ? cleanOperation.column : ''
    if (target && !columnNames.has(target)) {
      db.close()
      return { ok: false, error: 'Unknown column.' }
    }
    await analytics.makeBackup(id, db)
    backupMade = true
    db.exec('BEGIN IMMEDIATE')
    try {
      if (cleanOperation.kind === 'drop_duplicates') {
        const allColumns = tableInfo.map((column) => quoteIdent(column.name)).join(', ')
        if (!allColumns) throw new Error('The table has no columns.')
        const before = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
        db.exec(
          `DELETE FROM data WHERE rowid NOT IN (SELECT MIN(rowid) FROM data GROUP BY ${allColumns})`,
        )
        const after = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
        message = `Removed ${Math.max(0, Number(before.n) - Number(after.n)).toLocaleString()} duplicate rows.`
      } else if (cleanOperation.kind === 'drop_nulls') {
        const before = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
        db.prepare(`DELETE FROM data WHERE ${quoteIdent(cleanOperation.column)} IS NULL`).run()
        const after = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
        message = `Removed ${Math.max(0, Number(before.n) - Number(after.n)).toLocaleString()} rows with a null ${cleanOperation.column}.`
      } else if (cleanOperation.kind === 'trim') {
        const info = tableInfo.find((column) => column.name === cleanOperation.column)
        if (!info || !/CHAR|CLOB|TEXT|DATE/i.test(info.type)) {
          throw new Error('Trim requires a text or date column.')
        }
        const before = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
        const result = db
          .prepare(
            `UPDATE data SET ${quoteIdent(cleanOperation.column)} = TRIM(${quoteIdent(cleanOperation.column)})
             WHERE ${quoteIdent(cleanOperation.column)} IS NOT NULL
               AND TRIM(${quoteIdent(cleanOperation.column)}) <> ${quoteIdent(cleanOperation.column)}`,
          )
          .run()
        message = `Trimmed ${Number(result.changes).toLocaleString()} values (${Number(before.n).toLocaleString()} rows scanned).`
      } else if (cleanOperation.kind === 'fill_mean') {
        const info = tableInfo.find((column) => column.name === cleanOperation.column)
        if (!info || !/INT|REAL|FLOA|DOUB/i.test(info.type) || /BOOL/i.test(info.type)) {
          throw new Error('Filling with the mean requires a numeric column.')
        }
        const avg = db
          .prepare(`SELECT AVG(${quoteIdent(cleanOperation.column)}) AS v FROM data`)
          .get() as unknown as { v: number | null }
        if (avg.v === null || avg.v === undefined) throw new Error('The column has no numeric values.')
        const result = db
          .prepare(
            `UPDATE data SET ${quoteIdent(cleanOperation.column)} = ? WHERE ${quoteIdent(cleanOperation.column)} IS NULL`,
          )
          .run(avg.v)
        message = `Filled ${Number(result.changes).toLocaleString()} nulls with the mean (${avg.v}).`
      } else if (cleanOperation.kind === 'fill_value') {
        const info = tableInfo.find((column) => column.name === cleanOperation.column)
        if (!info) throw new Error('Unknown column.')
        const type = info.type.toUpperCase()
        let value: string | number = cleanOperation.value
        if (type.includes('BOOL')) {
          const normalized = cleanOperation.value.trim().toLowerCase()
          if (normalized === 'true' || normalized === '1') value = 1
          else if (normalized === 'false' || normalized === '0') value = 0
          else throw new Error('Enter true, false, 1 or 0 for this boolean column.')
        } else if (/INT|REAL|FLOA|DOUB/i.test(type)) {
          const parsed = Number(cleanOperation.value)
          if (!Number.isFinite(parsed)) throw new Error('Enter a number for this column.')
          value = parsed
        }
        const result = db
          .prepare(
            `UPDATE data SET ${quoteIdent(cleanOperation.column)} = ? WHERE ${quoteIdent(cleanOperation.column)} IS NULL`,
          )
          .run(value)
        message = `Filled ${Number(result.changes).toLocaleString()} nulls.`
      } else {
        throw new Error('Unknown cleaning operation.')
      }
      db.exec('COMMIT')
      committed = true
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    db.close()

    let profiled: AnalyticsDatasetDetail | null = null
    try {
      profiled = profileDataset(analytics, id)
      analytics.updateDatasetWarning(id, null)
    } catch (profileError) {
      // The cleaning transaction committed. Keep the backup and the dataset
      // usable even if a follow-up profile hits a transient SQLite error.
      const detail = profileError instanceof Error ? profileError.message : String(profileError)
      analytics.updateDatasetWarning(id, `Cleaned, but profiling failed: ${detail}. Re-import if this persists.`)
      const latest = analytics.getDataset(id)
      const prior = analytics.getProfile(id)
      if (latest && prior) {
        profiled = {
          ...latest,
          columns: (prior.columns ?? []) as AnalyticsDatasetDetail['columns'],
          preview: (prior.preview ?? { columns: [], rows: [], truncated: false }) as AnalyticsDatasetDetail['preview'],
        }
      }
    }
    audit('clean', { datasetId: id, operation: cleanOperation, message })
    return { ok: true, message, ...(profiled ? { dataset: profiled } : {}) }
  } catch (error) {
    try {
      db.close()
    } catch {
      /* already closed */
    }
    if (backupMade && !committed) analytics.clearBackup(id)
    const detail = error instanceof Error ? error.message : String(error)
    audit('clean-failed', { datasetId: id, operation: cleanOperation, error: detail })
    return { ok: false, error: detail }
  }
}

function undoClean(id: string): AnalyticsCleanResult {
  const analytics = analyticsStore()
  try {
    if (!analytics.undoBackup(id)) return { ok: false, error: 'There is no cleaning backup to undo.' }
    const profiled = profileDataset(analytics, id)
    audit('undo-clean', { datasetId: id })
    return { ok: true, message: 'Restored the dataset to its state before the last clean.', dataset: profiled }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    audit('undo-clean-failed', { datasetId: id, error: message })
    return { ok: false, error: message }
  }
}

function forecastDataset(id: string, xColumn: string, yColumn: string): AnalyticsForecastResult {
  const analytics = analyticsStore()
  const dataset = datasetDetail(id)
  const x = dataset.columns.find((column) => column.name === xColumn)
  const y = dataset.columns.find((column) => column.name === yColumn)
  if (!x || !y) return { ok: false, error: 'Choose valid columns.' }
  if ((x.type !== 'integer' && x.type !== 'real') || (y.type !== 'integer' && y.type !== 'real')) {
    return { ok: false, error: 'Forecasting needs two numeric columns.' }
  }
  const db = new DatabaseSync(analytics.datasetDbPath(id), { readOnly: true })
  try {
    const statement = db.prepare(
      `SELECT CAST(${quoteIdent(xColumn)} AS REAL) AS x, CAST(${quoteIdent(yColumn)} AS REAL) AS y
       FROM data
       WHERE ${quoteIdent(xColumn)} IS NOT NULL AND ${quoteIdent(yColumn)} IS NOT NULL
       ORDER BY x ASC
       LIMIT 10000`,
    )
    const raw = statement.all() as unknown as Array<{ x: number; y: number }>
    const fitted = linearForecast(raw, 6, 200)
    if (!fitted.ok) return { ok: false, error: fitted.error ?? 'The forecast could not be calculated.' }
    audit('forecast', { datasetId: id, xColumn, yColumn, slope: fitted.slope, r2: fitted.r2 })
    return {
      ok: true,
      xColumn,
      yColumn,
      points: fitted.points,
      forecast: fitted.forecast,
      slope: fitted.slope ?? 0,
      intercept: fitted.intercept ?? 0,
      r2: fitted.r2 ?? 0,
      n: fitted.n,
      residualStdError: fitted.residualStdError,
      slopeStdError: fitted.slopeStdError,
      slopeCi95: fitted.slopeCi95,
      tCritical: fitted.tCritical,
      method: fitted.method ?? 'Ordinary least squares trend.',
    }
  } finally {
    db.close()
  }
}

async function autoAnalyzeDataset(
  id: string,
  options: { prepare?: boolean; interpret?: boolean; understand?: boolean } = {},
): Promise<AnalyticsAutoAnalysis> {
  const settingsPath = join(app.getPath('userData'), 'ai-settings.json')
  const detail = datasetDetail(id)
  const planned =
    options.understand === false
      ? null
      : await planDatasetWithAi(detail, { settingsPath, audit })
  const analysis = await runAutoAnalysis(
    id,
    {
      getDataset: datasetDetail,
      runQuery: (datasetId, sql, limit) => queryDataset(datasetId, sql, limit),
      listViews: (datasetId) => analyticsStore().listViews(datasetId),
      saveView: (input) => analyticsStore().saveView(input),
      deleteView: (viewId) => analyticsStore().deleteView(viewId),
      clean: cleanDataset,
      audit,
    },
    { ...options, plan: planned?.plan ?? null },
  )
  if (!analysis.ok || options.interpret === false) return analysis

  // The calculations are already complete and saved. The model only adds a
  // plain-language reading; a failure never changes or hides the evidence.
  const datasetName = analysis.datasetName ?? detail.name
  const reading = await interpretAnalysisWithAi(analysis, datasetName, {
    settingsPath,
    audit,
  })
  if (reading.interpretation) {
    return { ...analysis, interpretation: reading.interpretation }
  }
  const note = reading.error
    ? `AI reading unavailable: ${reading.error} This reading was generated locally from the same evidence.`
    : 'No AI reading was produced. This reading was generated locally from the same evidence.'
  audit('auto-interpretation-fallback', {
    datasetId: id,
    error: reading.error?.slice(0, 500) ?? null,
  })
  return {
    ...analysis,
    interpretation: buildLocalInterpretation(analysis, datasetName, { note }),
  }
}

async function askDataset(id: string, question: string): Promise<AnalyticsAskResult> {
  const dataset = datasetDetail(id)
  return askAnalyticsAi({
    settingsPath: join(app.getPath('userData'), 'ai-settings.json'),
    dataset,
    question,
    runQuery: (sql) => queryDataset(id, sql, 500),
    audit,
  })
}

async function pythonDataset(input: AnalyticsPythonRequest): Promise<AnalyticsPythonResult> {
  const dataset = datasetDetail(input.datasetId)
  return runPythonAggregation(input, {
    columns: dataset.columns,
    runQuery: (sql) => queryDataset(input.datasetId, sql, 250000),
  })
}

async function importUrlSource(
  rawUrl: string,
  label?: string,
  tableIndex?: number,
): Promise<AnalyticsDataset> {
  const fetched = await fetchUrlTable(rawUrl, 0, { tableIndex })
  const cleanLabel = sourceLabelForUrl(rawUrl, label).slice(0, 120)
  if (label?.trim()) fetched.table.name = cleanLabel
  return createImportedDataset(fetched.table, {
    kind: 'url',
    host: fetched.url.host,
    url: urlSourceDetail(rawUrl),
    bytes: fetched.bytes,
  })
}

async function inspectUrlSource(rawUrl: string): Promise<AnalyticsUrlInspection> {
  return inspectUrlTables(rawUrl)
}

async function importDatabaseSourceTable(
  source: AnalyticsDatabaseSource,
  table: string,
  schema?: string,
): Promise<AnalyticsDataset> {
  const normalized = normalizeDatabaseSource(source)
  const parsed = await importDatabaseTable(normalized, table, schema)
  return createImportedDataset(parsed, {
    kind: normalized.kind,
    database: redactConnection(normalized.connection),
    table,
    schema: schema ?? null,
  })
}

function normalizeWorkflowInput(raw: unknown): AnalyticsWorkflowInput {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid workflow.')
  const record = raw as Record<string, unknown>
  const datasetId = typeof record.datasetId === 'string' ? record.datasetId.trim() : ''
  if (!datasetId) throw new Error('Choose a dataset for this workflow.')
  const analytics = analyticsStore()
  analytics.assertDatasetId(datasetId)
  if (!analytics.getDataset(datasetId)) throw new Error('Dataset not found.')
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (!name || name.length > 120) throw new Error('Give the workflow a name (120 characters or fewer).')
  const schedule = normalizeWorkflowSchedule(record.schedule)
  if (!schedule) throw new Error('Choose a valid schedule.')
  const retries = Number(record.maxRetries)
  const maxRetries = Number.isInteger(retries) ? Math.min(3, Math.max(0, retries)) : 1
  const id = typeof record.id === 'string' && record.id ? record.id : undefined
  if (id && !analytics.getWorkflow(id)) throw new Error('Workflow not found.')
  return {
    ...(id ? { id } : {}),
    datasetId,
    name,
    schedule,
    enabled: record.enabled !== false,
    // Mutation is opt-in for automation. The renderer sends this explicitly;
    // older callers that omit it get the safe analysis-only behavior.
    prepare: record.prepare === true,
    maxRetries,
  }
}

function saveAutomationWorkflow(raw: unknown): AnalyticsWorkflow {
  const input = normalizeWorkflowInput(raw)
  const analytics = analyticsStore()
  const nextRunAt = nextWorkflowRun(input.schedule, Date.now(), input.enabled)
  const saved = analytics.saveWorkflow({
    ...input,
    prepare: input.prepare === true,
    maxRetries: input.maxRetries ?? 1,
    nextRunAt,
  })
  audit(input.id ? 'workflow-update' : 'workflow-create', {
    workflowId: saved.id,
    datasetId: saved.datasetId,
    version: saved.version,
    schedule: saved.schedule,
    enabled: saved.enabled,
    nextRunAt: saved.nextRunAt ?? null,
  })
  return saved
}

const workflowWait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

async function executeAutomationWorkflow(
  id: string,
  trigger: 'manual' | 'schedule',
  dueAt = Date.now(),
): Promise<AnalyticsWorkflowRunResult> {
  const analytics = analyticsStore()
  const workflow = analytics.getWorkflow(id)
  if (!workflow) return { ok: false, error: 'Workflow not found.' }
  if (runningWorkflows.has(id)) {
    return { ok: false, error: 'This workflow is already running.', workflow }
  }
  // A queued scheduler run can become stale while an earlier workflow finishes:
  // the user may have paused it, edited its schedule, or run it manually.
  if (
    trigger === 'schedule' &&
    (!workflow.enabled ||
      workflow.schedule.frequency === 'manual' ||
      typeof workflow.nextRunAt !== 'number' ||
      workflow.nextRunAt > Math.max(dueAt, Date.now()))
  ) {
    return { ok: false, error: 'Workflow is no longer due.', workflow }
  }
  const dataset = analytics.getDataset(workflow.datasetId)
  if (!dataset) return { ok: false, error: 'The dataset for this workflow no longer exists.', workflow }

  runningWorkflows.add(id)
  const startedAt = Date.now()
  const rowsBefore = dataset.rowCount
  let attempts = 0
  let analysis: AnalyticsAutoAnalysis | null = null
  let failure = 'The automation pipeline did not complete.'

  try {
    analytics.markWorkflowRunning(id, startedAt)
    const maxAttempts = 1 + Math.max(0, Math.min(3, workflow.maxRetries))
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      attempts = attempt + 1
      try {
        analysis = await autoAnalyzeDataset(workflow.datasetId, {
          prepare: workflow.prepare,
          interpret: false,
          understand: false,
        })
        if (analysis.ok) break
        failure = analysis.error ?? failure
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
      }
      if (attempt < maxAttempts - 1) await workflowWait(300)
    }

    const finishedAt = Date.now()
    const ok = analysis?.ok === true
    const latest = analytics.getWorkflow(id) ?? workflow
    const nextRunAt = nextWorkflowRun(latest.schedule, finishedAt, latest.enabled)
    const rowsAfter = analytics.getDataset(workflow.datasetId)?.rowCount ?? rowsBefore
    const insightCount = analysis?.insights.length ?? 0
    const viewCount = analysis?.views.length ?? 0
    const prepared = analysis?.prepared.length ? ` Prepared: ${analysis.prepared.join(' ')}` : ''
    const message = ok
      ? `Refreshed ${viewCount.toLocaleString()} dashboard card${viewCount === 1 ? '' : 's'} from ${insightCount.toLocaleString()} insight${insightCount === 1 ? '' : 's'}.${prepared}`
      : `Automation failed after ${attempts.toLocaleString()} attempt${attempts === 1 ? '' : 's'}: ${failure}`
    const run: AnalyticsWorkflowRun = {
      id: randomUUID(),
      workflowId: id,
      datasetId: workflow.datasetId,
      status: ok ? 'ok' : 'error',
      startedAt,
      finishedAt,
      message,
      ...(ok ? {} : { error: failure }),
      insights: insightCount,
      views: viewCount,
      rowsBefore,
      rowsAfter,
      elapsedMs: Math.max(0, finishedAt - startedAt),
      attempts,
    }
    try {
      analytics.recordWorkflowRun(run)
      analytics.finishWorkflowRun({
        id,
        status: run.status,
        message,
        nextRunAt,
        finishedAt,
      })
    } catch (persistError) {
      // The workflow may have been deleted while a long analysis was running.
      // Do not turn a completed calculation into a failed one because its
      // history row can no longer be attached.
      audit('workflow-history-failed', {
        workflowId: id,
        error: persistError instanceof Error ? persistError.message : String(persistError),
      })
    }
    audit(ok ? 'workflow-run' : 'workflow-run-failed', {
      workflowId: id,
      datasetId: workflow.datasetId,
      trigger,
      status: run.status,
      attempts,
      insights: insightCount,
      views: viewCount,
      rowsBefore,
      rowsAfter,
      elapsedMs: run.elapsedMs,
      nextRunAt,
      error: ok ? null : failure.slice(0, 500),
    })
    let refreshed: AnalyticsDatasetDetail | undefined
    try {
      refreshed = datasetDetail(workflow.datasetId)
    } catch {
      /* the run itself remains valid even if the follow-up preview fails */
    }
    return {
      ok,
      ...(ok ? {} : { error: failure }),
      workflow: analytics.getWorkflow(id) ?? latest,
      run,
      ...(refreshed ? { dataset: refreshed } : {}),
    }
  } catch (error) {
    const finishedAt = Date.now()
    const detail = error instanceof Error ? error.message : String(error)
    const latest = analytics.getWorkflow(id) ?? workflow
    const nextRunAt = nextWorkflowRun(latest.schedule, finishedAt, latest.enabled)
    const run: AnalyticsWorkflowRun = {
      id: randomUUID(),
      workflowId: id,
      datasetId: workflow.datasetId,
      status: 'error',
      startedAt,
      finishedAt,
      message: `Automation failed: ${detail}`,
      error: detail,
      insights: 0,
      views: 0,
      rowsBefore,
      rowsAfter: analytics.getDataset(workflow.datasetId)?.rowCount ?? rowsBefore,
      elapsedMs: Math.max(0, finishedAt - startedAt),
      attempts: Math.max(1, attempts),
    }
    try {
      analytics.recordWorkflowRun(run)
      analytics.finishWorkflowRun({
        id,
        status: 'error',
        message: run.message,
        nextRunAt,
        finishedAt,
      })
    } catch {
      /* history is best-effort when the workflow or database disappeared */
    }
    audit('workflow-run-failed', {
      workflowId: id,
      datasetId: workflow.datasetId,
      trigger,
      status: 'error',
      attempts: run.attempts,
      error: detail.slice(0, 500),
    })
    return {
      ok: false,
      error: detail,
      workflow: analytics.getWorkflow(id) ?? latest,
      run,
    }
  } finally {
    runningWorkflows.delete(id)
  }
}

/**
 * Serialize every workflow execution, including manual run-now requests. This
 * keeps SQLite writers and the deterministic analysis pipeline from competing
 * when a scheduled run is long enough to overlap another scheduler tick.
 */
async function executeWorkflowExclusive(
  id: string,
  trigger: 'manual' | 'schedule',
  dueAt?: number,
): Promise<AnalyticsWorkflowRunResult> {
  let release!: () => void
  const previous = workflowRunLock
  workflowRunLock = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await executeAutomationWorkflow(id, trigger, dueAt)
  } finally {
    release()
  }
}

/**
 * Run every enabled workflow whose local next-run time has passed. Runs are
 * sequential so a slow analysis cannot starve the UI or open many SQLite
 * writers at once. A missed backlog is intentionally collapsed into one run:
 * the next run is always computed from the finish time, not from the old slot.
 */
export async function runDueAutomationWorkflows(
  now = Date.now(),
): Promise<AnalyticsWorkflowRunResult[]> {
  // A long analysis can outlive the one-minute scheduler interval. Only one
  // due scan may be in flight; later ticks are no-ops until it finishes.
  if (dueRunInFlight) return []
  dueRunInFlight = true
  try {
    const analytics = analyticsStore()
    const due = analytics.dueWorkflows(now)
    const results: AnalyticsWorkflowRunResult[] = []
    for (const workflow of due) {
      if (runningWorkflows.has(workflow.id)) continue
      results.push(await executeWorkflowExclusive(workflow.id, 'schedule', now))
    }
    return results
  } finally {
    dueRunInFlight = false
  }
}

export function startAnalyticsWorkflowScheduler(): void {
  if (schedulerTimer) return
  const tick = () => {
    try {
      if (!schedulerRecovered) {
        analyticsStore().recoverInterruptedWorkflows()
        schedulerRecovered = true
      }
      void runDueAutomationWorkflows().catch((error: unknown) => {
        audit('workflow-scheduler-failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
    } catch (error) {
      audit('workflow-scheduler-failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  // Give the rest of app startup a head start, then check once a minute.
  schedulerKickoff = setTimeout(tick, 2_000)
  schedulerKickoff.unref?.()
  schedulerTimer = setInterval(tick, 60_000)
  schedulerTimer.unref?.()
}

export function stopAnalyticsWorkflowScheduler(): void {
  if (schedulerKickoff) clearTimeout(schedulerKickoff)
  if (schedulerTimer) clearInterval(schedulerTimer)
  schedulerKickoff = null
  schedulerTimer = null
  schedulerRecovered = false
}

export function registerAnalyticsIpc(): void {
  if (registered) return
  registered = true

  ipcMain.handle(ANALYTICS_CHANNELS.importFile, async (): Promise<AnalyticsDataset | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Import data',
          properties: ['openFile'],
          filters: [
            { name: 'Data files', extensions: ['csv', 'tsv', 'json', 'xlsx', 'xlsm'] },
            { name: 'All files', extensions: ['*'] },
          ],
        })
      : await dialog.showOpenDialog({
          title: 'Import data',
          properties: ['openFile'],
          filters: [{ name: 'Data files', extensions: ['csv', 'tsv', 'json', 'xlsx', 'xlsm'] }],
        })
    if (result.canceled || !result.filePaths[0]) return null
    return importPath(result.filePaths[0])
  })

  ipcMain.handle(ANALYTICS_CHANNELS.importPath, async (_event, path: unknown): Promise<AnalyticsDataset> => {
    if (typeof path !== 'string' || !path || path.length > 4096) throw new Error('Invalid file path.')
    if (!isAbsolute(path)) throw new Error('Use a full absolute path for file imports.')
    if (!existsSync(path)) throw new Error('That file no longer exists.')
    return importPath(path)
  })

  ipcMain.handle(ANALYTICS_CHANNELS.listDatasets, (): AnalyticsDataset[] => analyticsStore().listDatasets())
  ipcMain.handle(ANALYTICS_CHANNELS.getDataset, (_event, id: unknown): AnalyticsDatasetDetail | null => {
    if (typeof id !== 'string') return null
    try {
      return datasetDetail(id)
    } catch {
      return null
    }
  })
  ipcMain.handle(ANALYTICS_CHANNELS.deleteDataset, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    const deleted = analyticsStore().deleteDataset(id)
    if (deleted) audit('delete-dataset', { datasetId: id })
    return deleted
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.runQuery,
    (_event, id: unknown, sql: unknown, limit: unknown): AnalyticsQueryResult => {
      if (typeof id !== 'string' || typeof sql !== 'string') throw new Error('Invalid query request.')
      return queryDataset(id, sql, limit)
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.joinDatasets,
    (_event, input: unknown): AnalyticsJoinResult => joinDatasets(input),
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.appendDatasets,
    (_event, input: unknown): AnalyticsAppendResult => appendDatasets(input),
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.clean,
    async (_event, id: unknown, operation: unknown): Promise<AnalyticsCleanResult> => {
      if (typeof id !== 'string' || !operation || typeof operation !== 'object') {
        return { ok: false, error: 'Invalid cleaning request.' }
      }
      return cleanDataset(id, operation as AnalyticsCleanOperation)
    },
  )
  ipcMain.handle(ANALYTICS_CHANNELS.undoClean, (_event, id: unknown): AnalyticsCleanResult => {
    if (typeof id !== 'string') return { ok: false, error: 'Invalid dataset.' }
    return undoClean(id)
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.saveView,
    (
      _event,
      input: unknown,
    ): AnalyticsSavedView => {
      if (!input || typeof input !== 'object') throw new Error('Invalid view.')
      const raw = input as Record<string, unknown>
      if (typeof raw.datasetId !== 'string' || typeof raw.name !== 'string' || typeof raw.sql !== 'string') {
        throw new Error('Invalid view.')
      }
      validateReadOnlySql(raw.sql)
      const insightKinds = new Set([
        'quality',
        'trend',
        'ranking',
        'distribution',
        'correlation',
        'outlier',
        'forecast',
      ])
      const insightKind =
        typeof raw.insightKind === 'string' && insightKinds.has(raw.insightKind)
          ? (raw.insightKind as AnalyticsSavedView['insightKind'])
          : undefined
      const confidence =
        raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
          ? raw.confidence
          : undefined
      const cardText = (value: unknown, max: number): string | undefined =>
        typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
      const filterColumnName = cardText(raw.filterColumn, 200)
      const filterColumn = filterColumnName
        ? datasetDetail(raw.datasetId).columns.find(
            (column) =>
              column.name === filterColumnName &&
              (column.type === 'text' || column.type === 'date' || column.type === 'boolean'),
          )?.name
        : undefined
      const view = analyticsStore().saveView({
        ...(typeof raw.id === 'string' ? { id: raw.id } : {}),
        datasetId: raw.datasetId,
        name: raw.name,
        sql: raw.sql,
        chart: normalizeChartSpec(raw.chart),
        ...(insightKind ? { insightKind } : {}),
        ...(filterColumn ? { filterColumn } : {}),
        ...(cardText(raw.takeaway, 500) ? { takeaway: cardText(raw.takeaway, 500) } : {}),
        ...(cardText(raw.meaning, 2000) ? { meaning: cardText(raw.meaning, 2000) } : {}),
        ...(cardText(raw.method, 500) ? { method: cardText(raw.method, 500) } : {}),
        ...(cardText(raw.detail, 2000) ? { detail: cardText(raw.detail, 2000) } : {}),
        ...(confidence ? { confidence } : {}),
      })
      audit('save-view', { datasetId: view.datasetId, viewId: view.id, name: view.name })
      return view
    },
  )
  ipcMain.handle(ANALYTICS_CHANNELS.listViews, (_event, datasetId: unknown): AnalyticsSavedView[] => {
    return analyticsStore().listViews(typeof datasetId === 'string' ? datasetId : undefined)
  })
  ipcMain.handle(ANALYTICS_CHANNELS.deleteView, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    const deleted = analyticsStore().deleteView(id)
    if (deleted) audit('delete-view', { viewId: id })
    return deleted
  })
  ipcMain.handle(ANALYTICS_CHANNELS.ask, async (_event, id: unknown, question: unknown): Promise<AnalyticsAskResult> => {
    if (typeof id !== 'string' || typeof question !== 'string') {
      return { ok: false, question: '', error: 'Invalid question.', caveats: [] }
    }
    try {
      return await askDataset(id, question)
    } catch (error) {
      return {
        ok: false,
        question,
        error: error instanceof Error ? error.message : String(error),
        caveats: [],
      }
    }
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.autoAnalyze,
    async (_event, input: unknown): Promise<AnalyticsAutoAnalysis> => {
      if (!input || typeof input !== 'object') {
        return {
          ok: false,
          error: 'Invalid auto-analysis request.',
          datasetId: '',
          insights: [],
          views: [],
          prepared: [],
          methods: [],
          elapsedMs: 0,
        }
      }
      const request = input as AnalyticsAutoRequest
      if (typeof request.datasetId !== 'string' || !request.datasetId) {
        return {
          ok: false,
          error: 'Choose a dataset first.',
          datasetId: '',
          insights: [],
          views: [],
          prepared: [],
          methods: [],
          elapsedMs: 0,
        }
      }
      try {
        return await autoAnalyzeDataset(request.datasetId, {
          prepare: request.prepare !== false,
          interpret: true,
        })
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          datasetId: request.datasetId,
          insights: [],
          views: [],
          prepared: [],
          methods: [],
          elapsedMs: 0,
        }
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.understandDataset,
    async (_event, id: unknown): Promise<AnalyticsAiPlanResult> => {
      if (typeof id !== 'string' || !id) {
        return { ok: false, error: 'Choose a dataset first.' }
      }
      try {
        const detail = datasetDetail(id)
        return await planDatasetWithAi(detail, {
          settingsPath: join(app.getPath('userData'), 'ai-settings.json'),
          audit,
        })
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.forecast,
    (_event, id: unknown, xColumn: unknown, yColumn: unknown): AnalyticsForecastResult => {
      if (typeof id !== 'string' || typeof xColumn !== 'string' || typeof yColumn !== 'string') {
        return { ok: false, error: 'Invalid forecast request.' }
      }
      try {
        return forecastDataset(id, xColumn, yColumn)
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )
  ipcMain.handle(ANALYTICS_CHANNELS.python, async (_event, input: unknown): Promise<AnalyticsPythonResult> => {
    if (!input || typeof input !== 'object') return { ok: false, error: 'Invalid Python request.' }
    const request = input as Partial<AnalyticsPythonRequest>
    const groupBy = typeof request.groupBy === 'string' ? request.groupBy.trim() : ''
    const metric = typeof request.metric === 'string' ? request.metric.trim() : ''
    if (
      typeof request.datasetId !== 'string' ||
      !groupBy ||
      groupBy.length > 300 ||
      !metric ||
      metric.length > 300 ||
      !['sum', 'avg', 'min', 'max', 'count'].includes(request.aggregation ?? '')
    ) {
      return { ok: false, error: 'Invalid Python request.' }
    }
    const normalized: AnalyticsPythonRequest = {
      datasetId: request.datasetId,
      groupBy,
      metric,
      aggregation: request.aggregation as AnalyticsPythonRequest['aggregation'],
      limit: normalizeLimit(request.limit, 100, 1_000),
    }
    try {
      return await pythonDataset(normalized)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.exportCsv,
    async (_event, id: unknown, sql: unknown, suggestedName: unknown): Promise<string | null> => {
      if (typeof id !== 'string' || typeof sql !== 'string') throw new Error('Invalid export request.')
      const result = queryDataset(id, sql, MAX_EXPORT_ROWS, MAX_EXPORT_ROWS)
      const safeName = (typeof suggestedName === 'string' ? basename(suggestedName) : 'analytics-export')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
        .replace(/\.csv$/i, '')
        .slice(0, 100) || 'analytics-export'
      const win = BrowserWindow.getFocusedWindow()
      const save = win
        ? await dialog.showSaveDialog(win, {
            title: 'Export query as CSV',
            defaultPath: `${safeName}.csv`,
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          })
        : await dialog.showSaveDialog({
            title: 'Export query as CSV',
            defaultPath: `${safeName}.csv`,
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          })
      if (save.canceled || !save.filePath) return null
      const path = extname(save.filePath).toLowerCase() === '.csv' ? save.filePath : `${save.filePath}.csv`
      writeFileSync(path, toCsv(result.columns, result.rows), 'utf8')
      audit('export-csv', { datasetId: id, path, rowCount: result.rowCount })
      return path
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.importUrl,
    async (_event, input: unknown): Promise<AnalyticsDataset> => {
      if (!input || typeof input !== 'object') throw new Error('Invalid data link.')
      const record = input as { url?: unknown; label?: unknown; tableIndex?: unknown }
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (!url || url.length > 8192) throw new Error('Enter a valid data link.')
      const label = typeof record.label === 'string' ? record.label.slice(0, 120) : undefined
      const tableIndex =
        typeof record.tableIndex === 'number' &&
        Number.isInteger(record.tableIndex) &&
        record.tableIndex >= 0 &&
        record.tableIndex < 100
          ? record.tableIndex
          : undefined
      return importUrlSource(url, label, tableIndex)
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.inspectUrl,
    async (_event, input: unknown): Promise<AnalyticsUrlInspection> => {
      if (!input || typeof input !== 'object') throw new Error('Invalid data link.')
      const record = input as { url?: unknown }
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (!url || url.length > 8192) throw new Error('Enter a valid data link.')
      return inspectUrlSource(url)
    },
  )
  ipcMain.handle(ANALYTICS_CHANNELS.pickDatabaseFile, async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Choose a SQLite database',
          properties: ['openFile'],
          filters: [{ name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3', 'db3'] }],
        })
      : await dialog.showOpenDialog({
          title: 'Choose a SQLite database',
          properties: ['openFile'],
          filters: [{ name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3', 'db3'] }],
        })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.databaseTables,
    async (_event, source: unknown): Promise<AnalyticsDatabaseTable[]> => {
      const normalized = normalizeDatabaseSource(source as AnalyticsDatabaseSource)
      try {
        return await listDatabaseTables(normalized)
      } finally {
        audit('database-tables', {
          kind: normalized.kind,
          database: redactConnection(normalized.connection),
        })
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.importDatabaseTable,
    async (_event, input: unknown): Promise<AnalyticsDataset> => {
      if (!input || typeof input !== 'object') throw new Error('Invalid database import.')
      const record = input as { source?: unknown; table?: unknown; schema?: unknown }
      const table = typeof record.table === 'string' ? record.table.trim() : ''
      const schema = typeof record.schema === 'string' ? record.schema.trim() : undefined
      if (!table || table.length > 128) throw new Error('Choose a table to import.')
      return importDatabaseSourceTable(
        record.source as AnalyticsDatabaseSource,
        table,
        schema,
      )
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.assistant,
    async (event, input: unknown): Promise<AnalyticsAssistantReply> => {
      if (!input || typeof input !== 'object') {
        return {
          ok: false,
          text: 'That request could not be read.',
          actions: [],
          sources: [],
          datasets: [],
          error: 'Invalid assistant request.',
        }
      }
      const request = input as AnalyticsAssistantRequest
      if (typeof request.text !== 'string' || !request.text.trim()) {
        return {
          ok: false,
          text: 'Ask Plot AI what to do with your data.',
          actions: [],
          sources: [],
          datasets: [],
          error: 'Ask a question first.',
        }
      }
      if (activeAssistantSenders.has(event.sender.id)) {
        return {
          ok: false,
          text: 'Plot AI is already working on the previous request.',
          actions: [],
          sources: [],
          datasets: [],
          error: 'An assistant run is already active.',
        }
      }
      activeAssistantSenders.add(event.sender.id)
      const emit = (assistantEvent: AnalyticsAssistantEvent) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(ANALYTICS_CHANNELS.assistantEvent, assistantEvent)
        }
      }
      try {
        return await runAnalyticsAssistant(request, {
          settingsPath: join(app.getPath('userData'), 'ai-settings.json'),
          listDatasets: () => analyticsStore().listDatasets(),
          getDataset: datasetDetail,
          importUrl: (url, tableIndex) => importUrlSource(url, undefined, tableIndex),
          inspectUrl: (url) => inspectUrlSource(url),
          importFile: (path) => importPath(path),
          listDatabaseTables,
          importDatabaseTable: (source, table, schema) =>
            importDatabaseSourceTable(source, table, schema),
          clean: cleanDataset,
          runQuery: (id, sql, limit) => queryDataset(id, sql, limit),
          joinDatasets: async (input) => joinDatasets(input),
          appendDatasets: async (input) => appendDatasets(input),
          saveView: (input) => analyticsStore().saveView(input),
          listViews: (datasetId) => analyticsStore().listViews(datasetId),
          forecast: forecastDataset,
          autoAnalyze: (datasetId) =>
            autoAnalyzeDataset(datasetId, { interpret: false, understand: false }),
          audit,
          emit,
        })
      } finally {
        activeAssistantSenders.delete(event.sender.id)
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.assistantStatus,
    (): AnalyticsAssistantStatus =>
      analyticsAssistantStatus(join(app.getPath('userData'), 'ai-settings.json')),
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.listWorkflows,
    (_event, datasetId: unknown): AnalyticsWorkflow[] => {
      if (datasetId !== undefined && typeof datasetId !== 'string') return []
      try {
        return analyticsStore().listWorkflows(typeof datasetId === 'string' ? datasetId : undefined)
      } catch {
        return []
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.saveWorkflow,
    (_event, input: unknown): AnalyticsWorkflow => saveAutomationWorkflow(input),
  )
  ipcMain.handle(ANALYTICS_CHANNELS.deleteWorkflow, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    const deleted = analyticsStore().deleteWorkflow(id)
    if (deleted) audit('workflow-delete', { workflowId: id })
    return deleted
  })
  ipcMain.handle(
    ANALYTICS_CHANNELS.runWorkflow,
    async (_event, id: unknown): Promise<AnalyticsWorkflowRunResult> => {
      if (typeof id !== 'string' || !id) return { ok: false, error: 'Invalid workflow.' }
      try {
        return await executeWorkflowExclusive(id, 'manual')
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.listWorkflowRuns,
    (_event, workflowId: unknown, limit: unknown): AnalyticsWorkflowRun[] => {
      if (typeof workflowId !== 'string') return []
      return analyticsStore().listWorkflowRuns(workflowId, normalizeLimit(limit, 10, 100))
    },
  )
  ipcMain.handle(
    ANALYTICS_CHANNELS.listWorkflowVersions,
    (_event, workflowId: unknown): AnalyticsWorkflowVersion[] => {
      if (typeof workflowId !== 'string') return []
      return analyticsStore().listWorkflowVersions(workflowId)
    },
  )
  ipcMain.handle(ANALYTICS_CHANNELS.listAudit, (): AnalyticsAuditEvent[] => analyticsStore().listAudit())

  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.PLOTDOCS_DISABLE_ANALYTICS_SCHEDULER !== '1'
  ) {
    startAnalyticsWorkflowScheduler()
  }
}

app.once('before-quit', () => {
  stopAnalyticsWorkflowScheduler()
  store?.close()
  store = null
})
