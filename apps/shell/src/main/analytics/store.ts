import { backup, DatabaseSync } from 'node:sqlite'
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AnalyticsAuditEvent,
  AnalyticsChartSpec,
  AnalyticsDataset,
  AnalyticsSavedView,
  AnalyticsWorkflow,
  AnalyticsWorkflowRun,
  AnalyticsWorkflowSchedule,
  AnalyticsWorkflowVersion,
} from '../../shared/analytics-api'
import type { ParsedTable } from './import'
import { createDataTableSql, MAX_IMPORT_ROWS } from './import'
import { normalizeWorkflowSchedule } from './schedule'
import { quoteIdent, quoteLiteral } from './sql'

/**
 * SQLite's declared-type affinity. Two columns with different affinities can
 * compare differently even when their displayed values look identical, so join
 * and append diagnostics use this instead of a numeric/text guess.
 */
function sqliteAffinity(type: string): string {
  const normalized = type.toUpperCase()
  if (!normalized) return 'text'
  if (normalized.includes('INT')) return 'integer'
  if (
    normalized.includes('REAL') ||
    normalized.includes('FLOA') ||
    normalized.includes('DOUB')
  ) {
    return 'real'
  }
  if (normalized.includes('BOOL')) return 'boolean'
  if (normalized.includes('DATE') || normalized.includes('TIME')) return 'date'
  return 'text'
}

const META_SCHEMA = `
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  missing_cells INTEGER NOT NULL DEFAULT 0,
  warning TEXT,
  backup_available INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dataset_profiles (
  dataset_id TEXT PRIMARY KEY REFERENCES datasets(id) ON DELETE CASCADE,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_views (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sql TEXT NOT NULL,
  chart_json TEXT,
  insight_kind TEXT,
  filter_column TEXT,
  takeaway TEXT,
  meaning TEXT,
  method TEXT,
  detail TEXT,
  confidence TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  prepare INTEGER NOT NULL,
  max_retries INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  next_run_at INTEGER,
  last_run_at INTEGER,
  last_run_status TEXT,
  last_run_message TEXT,
  run_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  dataset_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  message TEXT NOT NULL,
  error TEXT,
  insights INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  rows_before INTEGER,
  rows_after INTEGER,
  elapsed_ms INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS workflow_versions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_views_dataset ON saved_views(dataset_id);
CREATE INDEX IF NOT EXISTS audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_dataset ON workflows(dataset_id);
CREATE INDEX IF NOT EXISTS workflows_due ON workflows(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS workflow_runs_workflow ON workflow_runs(workflow_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS workflow_versions_workflow ON workflow_versions(workflow_id, version DESC);
`

export interface DatasetProfilePayload {
  columns: unknown
  preview: unknown
  duplicateRows: number
  missingCells: number
  qualityScore: number
  /** Present on profiles written by this build; older profiles fall back. */
  rowCount?: number
  columnCount?: number
}

interface DatasetRow {
  id: string
  name: string
  source_name: string
  source_type: string
  row_count: number
  column_count: number
  quality_score: number
  duplicate_rows: number
  missing_cells: number
  warning: string | null
  backup_available: number
  created_at: number
  updated_at: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class AnalyticsStore {
  private readonly db: DatabaseSync
  readonly dataDir: string
  private readonly datasetsDir: string

  constructor(rootDir: string) {
    this.dataDir = rootDir
    this.datasetsDir = join(rootDir, 'datasets')
    mkdirSync(this.datasetsDir, { recursive: true })
    this.db = new DatabaseSync(join(rootDir, 'analytics.sqlite'))
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA busy_timeout = 5000')
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec(META_SCHEMA)
    this.ensureViewColumns()
  }

  /**
   * Additive migration for dashboards created by older builds. Keeping the
   * card reading in the same row means a saved dashboard is still meaningful
   * after a restart, without re-running the whole auto analysis.
   */
  private ensureViewColumns(): void {
    const columns = new Set(
      (
        this.db.prepare('PRAGMA table_info(saved_views)').all() as unknown as Array<{ name: string }>
      ).map((column) => column.name),
    )
    const additions: Array<[string, string]> = [
      ['insight_kind', 'TEXT'],
      ['filter_column', 'TEXT'],
      ['takeaway', 'TEXT'],
      ['meaning', 'TEXT'],
      ['method', 'TEXT'],
      ['detail', 'TEXT'],
      ['confidence', 'TEXT'],
    ]
    for (const [name, type] of additions) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE saved_views ADD COLUMN ${name} ${type}`)
    }
  }

  close(): void {
    try {
      this.db.close()
    } catch {
      /* already closed */
    }
  }

  assertDatasetId(id: string): string {
    if (!UUID_RE.test(id)) throw new Error('Unknown dataset.')
    return id
  }

  datasetDbPath(id: string): string {
    return join(this.datasetsDir, `${this.assertDatasetId(id)}.sqlite`)
  }

  private datasetBackupPath(id: string): string {
    return join(this.datasetsDir, `${this.assertDatasetId(id)}.before-clean.sqlite`)
  }

  private rowToDataset(row: DatasetRow): AnalyticsDataset {
    return {
      id: row.id,
      name: row.name,
      sourceName: row.source_name,
      sourceType: row.source_type,
      rowCount: row.row_count,
      columnCount: row.column_count,
      qualityScore: row.quality_score,
      duplicateRows: row.duplicate_rows,
      missingCells: row.missing_cells,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      canUndo: row.backup_available === 1,
      ...(row.warning ? { warning: row.warning } : {}),
    }
  }

  listDatasets(): AnalyticsDataset[] {
    const rows = this.db
      .prepare('SELECT * FROM datasets ORDER BY updated_at DESC')
      .all() as unknown as DatasetRow[]
    return rows.map((row) => this.rowToDataset(row))
  }

  getDataset(id: string): AnalyticsDataset | null {
    const row = this.db
      .prepare('SELECT * FROM datasets WHERE id = ?')
      .get(this.assertDatasetId(id)) as unknown as DatasetRow | undefined
    return row ? this.rowToDataset(row) : null
  }

  getProfile(id: string): DatasetProfilePayload | null {
    const row = this.db
      .prepare('SELECT payload FROM dataset_profiles WHERE dataset_id = ?')
      .get(this.assertDatasetId(id)) as unknown as { payload: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.payload) as DatasetProfilePayload
    } catch {
      return null
    }
  }

  saveProfile(id: string, profile: DatasetProfilePayload): void {
    this.db
      .prepare(
        `INSERT INTO dataset_profiles(dataset_id, payload) VALUES (?, ?)
         ON CONFLICT(dataset_id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(this.assertDatasetId(id), JSON.stringify(profile))
    this.db
      .prepare(
        `UPDATE datasets SET
           quality_score = ?,
           duplicate_rows = ?,
           missing_cells = ?,
           row_count = COALESCE(?, row_count),
           column_count = COALESCE(?, column_count),
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        profile.qualityScore,
        profile.duplicateRows,
        profile.missingCells,
        profile.rowCount ?? null,
        profile.columnCount ?? null,
        Date.now(),
        id,
      )
  }

  private datasetConn(id: string): DatabaseSync {
    const db = new DatabaseSync(this.datasetDbPath(id))
    db.exec('PRAGMA busy_timeout = 5000')
    return db
  }

  createDataset(table: ParsedTable): AnalyticsDataset {
    const id = randomUUID()
    const dbPath = this.datasetDbPath(id)
    const db = new DatabaseSync(dbPath)
    try {
      db.exec('PRAGMA journal_mode = DELETE')
      db.exec('PRAGMA synchronous = NORMAL')
      db.exec(createDataTableSql('data', table.columns))
      const row = table.rows
      if (row.length > MAX_IMPORT_ROWS) throw new Error('Dataset is too large.')
      const placeholders = table.columns.map(() => '?').join(', ')
      const insert = db.prepare(
        `INSERT INTO data (${table.columns.map((c) => quoteIdent(c.name)).join(', ')}) VALUES (${placeholders})`,
      )
      db.exec('BEGIN')
      try {
        for (const values of row) insert.run(...values)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    } catch (error) {
      db.close()
      rmSync(dbPath, { force: true })
      throw error
    }
    db.close()

    try {
      return this.registerDataset({
        id,
        name: table.name,
        sourceName: table.sourceName,
        sourceType: table.sourceType,
        rowCount: table.rows.length,
        columnCount: table.columns.length,
      })
    } catch (error) {
      // Do not leave an orphan analytical database when metadata persistence
      // fails (disk full, read-only profile, etc.).
      rmSync(dbPath, { force: true })
      throw error
    }
  }

  private registerDataset(input: {
    id: string
    name: string
    sourceName: string
    sourceType: string
    rowCount: number
    columnCount: number
  }): AnalyticsDataset {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO datasets(
           id, name, source_name, source_type, row_count, column_count,
           quality_score, duplicate_rows, missing_cells, warning, backup_available,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, NULL, 0, ?, ?)`,
      )
      .run(
        input.id,
        input.name,
        input.sourceName,
        input.sourceType,
        input.rowCount,
        input.columnCount,
        now,
        now,
      )
    const dataset = this.getDataset(input.id)
    if (!dataset) throw new Error('Dataset metadata could not be saved.')
    return dataset
  }

  /**
   * Materialize an inner or left join in a new dataset database. The source
   * databases are attached read-only by SQLite and never written. Column names
   * are quoted from the live schema; only the join type and the two key names
   * come from the request, and both keys are validated against that schema.
   */
  createJoinedDataset(input: {
    leftId: string
    rightId: string
    leftKey: string
    rightKey: string
    joinType: 'inner' | 'left'
    name: string
  }): { dataset: AnalyticsDataset; sql: string; warning?: string } {
    this.assertDatasetId(input.leftId)
    this.assertDatasetId(input.rightId)
    if (input.leftId === input.rightId) throw new Error('Choose two different datasets to join.')
    const left = this.getDataset(input.leftId)
    const right = this.getDataset(input.rightId)
    if (!left) throw new Error('The left dataset no longer exists.')
    if (!right) throw new Error('The right dataset no longer exists.')
    const leftPath = this.datasetDbPath(input.leftId)
    const rightPath = this.datasetDbPath(input.rightId)
    if (!existsSync(leftPath)) throw new Error('The left dataset storage is missing.')
    if (!existsSync(rightPath)) throw new Error('The right dataset storage is missing.')

    const columnsOf = (path: string): Array<{ name: string; type: string }> => {
      const db = new DatabaseSync(path, { readOnly: true })
      try {
        return db.prepare('PRAGMA table_info(data)').all() as unknown as Array<{
          name: string
          type: string
        }>
      } finally {
        db.close()
      }
    }
    const leftColumns = columnsOf(leftPath)
    const rightColumns = columnsOf(rightPath)
    const leftKey = leftColumns.find((column) => column.name === input.leftKey)
    const rightKey = rightColumns.find((column) => column.name === input.rightKey)
    if (!leftKey) throw new Error(`The left dataset has no column named “${input.leftKey}”.`)
    if (!rightKey) throw new Error(`The right dataset has no column named “${input.rightKey}”.`)

    const used = new Set(leftColumns.map((column) => column.name))
    const renamed: Array<{ from: string; to: string }> = []
    const select: string[] = leftColumns.map(
      (column) => `l.${quoteIdent(column.name)} AS ${quoteIdent(column.name)}`,
    )
    for (const column of rightColumns) {
      let alias = used.has(column.name) ? `right_${column.name}` : column.name
      let suffix = 2
      while (used.has(alias)) {
        alias = `right_${column.name}_${suffix}`
        suffix += 1
      }
      if (alias !== column.name) renamed.push({ from: column.name, to: alias })
      used.add(alias)
      select.push(`r.${quoteIdent(column.name)} AS ${quoteIdent(alias)}`)
    }
    const joinKeyword = input.joinType === 'inner' ? 'INNER JOIN' : 'LEFT JOIN'
    const sql = `SELECT ${select.join(', ')} FROM data AS l ${joinKeyword} right.data AS r ON l.${quoteIdent(input.leftKey)} = r.${quoteIdent(input.rightKey)} LIMIT ${MAX_IMPORT_ROWS + 1}`

    const id = randomUUID()
    const dbPath = this.datasetDbPath(id)
    const db = new DatabaseSync(dbPath)
    let rowCount = 0
    let leftNulls = 0
    let rightNulls = 0
    let leftRows = 0
    let matchedLeftRows = 0
    let duplicateRightKeys = 0
    try {
      db.exec('PRAGMA journal_mode = DELETE')
      db.exec('PRAGMA synchronous = NORMAL')
      db.exec(`ATTACH DATABASE ${quoteLiteral(leftPath)} AS left_src`)
      db.exec(`ATTACH DATABASE ${quoteLiteral(rightPath)} AS right_src`)
      const scalar = (sql: string): number => {
        const row = db.prepare(sql).get() as unknown as { n: number }
        return Number(row.n)
      }
      const nullCount = (alias: 'left_src' | 'right_src', key: string): number =>
        scalar(`SELECT COUNT(*) AS n FROM ${alias}.data WHERE ${quoteIdent(key)} IS NULL`)
      leftNulls = nullCount('left_src', input.leftKey)
      rightNulls = nullCount('right_src', input.rightKey)
      leftRows = scalar('SELECT COUNT(*) AS n FROM left_src.data')
      matchedLeftRows = scalar(
        `SELECT COUNT(*) AS n FROM left_src.data AS l WHERE EXISTS (SELECT 1 FROM right_src.data AS r WHERE l.${quoteIdent(
          input.leftKey,
        )} = r.${quoteIdent(input.rightKey)})`,
      )
      duplicateRightKeys = scalar(
        `SELECT COUNT(*) AS n FROM (SELECT ${quoteIdent(input.rightKey)} AS key FROM right_src.data WHERE ${quoteIdent(
          input.rightKey,
        )} IS NOT NULL GROUP BY ${quoteIdent(input.rightKey)} HAVING COUNT(*) > 1)`,
      )
      db.exec(
        `CREATE TABLE data AS SELECT ${select.join(', ')} FROM left_src.data AS l ${joinKeyword} right_src.data AS r ON l.${quoteIdent(
          input.leftKey,
        )} = r.${quoteIdent(input.rightKey)} LIMIT ${MAX_IMPORT_ROWS + 1}`,
      )
      const count = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
      rowCount = Number(count.n)
      if (rowCount > MAX_IMPORT_ROWS) {
        throw new Error(
          `The join produced more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Filter or aggregate a source before joining.`,
        )
      }
    } catch (error) {
      try {
        db.close()
      } catch {
        /* already closed */
      }
      rmSync(dbPath, { force: true })
      throw error
    }
    db.close()

    const warnings: string[] = []
    if (renamed.length > 0) {
      warnings.push(
        `Right columns renamed to avoid collisions: ${renamed
          .map((entry) => `${entry.from} → ${entry.to}`)
          .join(', ')}.`,
      )
    }
    if (leftNulls > 0) {
      warnings.push(
        `${leftNulls.toLocaleString()} left row${leftNulls === 1 ? '' : 's'} ${leftNulls === 1 ? 'has' : 'have'} a null join key.`,
      )
    }
    if (rightNulls > 0) {
      warnings.push(
        `${rightNulls.toLocaleString()} right row${rightNulls === 1 ? '' : 's'} ${rightNulls === 1 ? 'has' : 'have'} a null join key and cannot match.`,
      )
    }
    const unmatchedLeftRows = Math.max(0, leftRows - matchedLeftRows)
    if (unmatchedLeftRows > 0) {
      warnings.push(
        input.joinType === 'inner'
          ? `${unmatchedLeftRows.toLocaleString()} left row${unmatchedLeftRows === 1 ? '' : 's'} had no match in the right dataset and were excluded by the inner join.`
          : `${unmatchedLeftRows.toLocaleString()} left row${unmatchedLeftRows === 1 ? '' : 's'} had no match; their right-side columns are null.`,
      )
    }
    if (duplicateRightKeys > 0) {
      warnings.push(
        `${duplicateRightKeys.toLocaleString()} right key value${duplicateRightKeys === 1 ? ' is' : 's are'} duplicated, so matching left rows may appear more than once.`,
      )
    }
    if (leftKey.type && rightKey.type) {
      const leftAffinity = sqliteAffinity(leftKey.type)
      const rightAffinity = sqliteAffinity(rightKey.type)
      if (leftAffinity !== rightAffinity) {
        warnings.push(
          `The join keys have different type affinity (${leftKey.type || 'untyped'} → ${leftAffinity} vs ${rightKey.type || 'untyped'} → ${rightAffinity}); matching values can be missed or coerced.`,
        )
      }
    }
    if (rowCount === 0) warnings.push('The join matched no rows. Check the key columns and their values.')

    try {
      const dataset = this.registerDataset({
        id,
        name: input.name.slice(0, 120),
        sourceName: `Join: ${left.name} + ${right.name}`,
        sourceType: 'join',
        rowCount,
        columnCount: used.size,
      })
      return { dataset, sql, ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}) }
    } catch (error) {
      rmSync(dbPath, { force: true })
      throw error
    }
  }

  /**
   * Append two datasets with identical column names into a new dataset.
   * `all` is UNION ALL (duplicates kept); `distinct` is UNION (exact duplicate
   * rows removed). Columns are aligned by name, and source databases are
   * attached read-only and never written.
   */
  createAppendedDataset(input: {
    leftId: string
    rightId: string
    mode: 'all' | 'distinct'
    name: string
  }): { dataset: AnalyticsDataset; sql: string; warning?: string } {
    this.assertDatasetId(input.leftId)
    this.assertDatasetId(input.rightId)
    if (input.leftId === input.rightId) {
      throw new Error('Choose two different datasets to append.')
    }
    const left = this.getDataset(input.leftId)
    const right = this.getDataset(input.rightId)
    if (!left) throw new Error('The left dataset no longer exists.')
    if (!right) throw new Error('The right dataset no longer exists.')
    const leftPath = this.datasetDbPath(input.leftId)
    const rightPath = this.datasetDbPath(input.rightId)
    if (!existsSync(leftPath)) throw new Error('The left dataset storage is missing.')
    if (!existsSync(rightPath)) throw new Error('The right dataset storage is missing.')

    const columnsOf = (path: string): Array<{ name: string; type: string }> => {
      const db = new DatabaseSync(path, { readOnly: true })
      try {
        return db.prepare('PRAGMA table_info(data)').all() as unknown as Array<{
          name: string
          type: string
        }>
      } finally {
        db.close()
      }
    }
    const leftColumns = columnsOf(leftPath)
    const rightColumns = columnsOf(rightPath)
    const leftNames = leftColumns.map((column) => column.name)
    const rightNames = rightColumns.map((column) => column.name)
    const leftSet = new Set(leftNames)
    const rightSet = new Set(rightNames)
    const missing = leftNames.filter((name) => !rightSet.has(name))
    const extra = rightNames.filter((name) => !leftSet.has(name))
    if (missing.length > 0 || extra.length > 0) {
      const parts = [
        missing.length ? `missing from the right dataset: ${missing.join(', ')}` : '',
        extra.length ? `extra in the right dataset: ${extra.join(', ')}` : '',
      ].filter(Boolean)
      throw new Error(`The datasets must have the same column names; ${parts.join('; ')}.`)
    }
    if (leftColumns.length === 0) throw new Error('The datasets have no columns to append.')

    const typeWarnings: string[] = []
    for (const leftColumn of leftColumns) {
      const rightColumn = rightColumns.find((column) => column.name === leftColumn.name)
      if (!rightColumn) continue
      if (sqliteAffinity(leftColumn.type) !== sqliteAffinity(rightColumn.type)) {
        typeWarnings.push(
          `${leftColumn.name} (${leftColumn.type || 'untyped'} vs ${rightColumn.type || 'untyped'})`,
        )
      }
    }

    const selectFor = (alias: string) =>
      leftColumns
        .map((column) => `${alias}.${quoteIdent(column.name)} AS ${quoteIdent(column.name)}`)
        .join(', ')
    const keyword = input.mode === 'distinct' ? 'UNION' : 'UNION ALL'
    // This is the logical query retained as evidence. The materialization
    // below uses the read-only attached aliases left_src and right_src.
    const sql = `SELECT ${selectFor('l')} FROM data AS l ${keyword} SELECT ${selectFor('r')} FROM right.data AS r LIMIT ${MAX_IMPORT_ROWS + 1}`

    const id = randomUUID()
    const dbPath = this.datasetDbPath(id)
    const db = new DatabaseSync(dbPath)
    let rowCount = 0
    let sourceRows = 0
    try {
      db.exec('PRAGMA journal_mode = DELETE')
      db.exec('PRAGMA synchronous = NORMAL')
      db.exec(`ATTACH DATABASE ${quoteLiteral(leftPath)} AS left_src`)
      db.exec(`ATTACH DATABASE ${quoteLiteral(rightPath)} AS right_src`)
      const scalar = (query: string): number => {
        const row = db.prepare(query).get() as unknown as { n: number }
        return Number(row.n)
      }
      sourceRows =
        scalar('SELECT COUNT(*) AS n FROM left_src.data') +
        scalar('SELECT COUNT(*) AS n FROM right_src.data')
      db.exec(
        `CREATE TABLE data AS SELECT ${selectFor('l')} FROM left_src.data AS l ${keyword} SELECT ${selectFor('r')} FROM right_src.data AS r LIMIT ${MAX_IMPORT_ROWS + 1}`,
      )
      rowCount = scalar('SELECT COUNT(*) AS n FROM data')
      if (rowCount > MAX_IMPORT_ROWS) {
        throw new Error(
          `The append produced more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Filter or aggregate a source before appending.`,
        )
      }
    } catch (error) {
      try {
        db.close()
      } catch {
        /* already closed */
      }
      rmSync(dbPath, { force: true })
      throw error
    }
    db.close()

    const warnings: string[] = []
    if (typeWarnings.length > 0) {
      warnings.push(
        `Columns with different declared types were aligned by name: ${typeWarnings.join(', ')}. SQLite may coerce values to the left column type.`,
      )
    }
    if (input.mode === 'distinct') {
      const removed = Math.max(0, sourceRows - rowCount)
      warnings.push(
        removed > 0
          ? `UNION removed ${removed.toLocaleString()} exact duplicate row${removed === 1 ? '' : 's'} across both datasets.`
          : 'UNION removed no exact duplicate rows across both datasets.',
      )
    }
    if (rowCount === 0) warnings.push('The append produced an empty dataset.')

    try {
      const dataset = this.registerDataset({
        id,
        name: input.name.slice(0, 120),
        sourceName: `${input.mode === 'distinct' ? 'Union' : 'Append'}: ${left.name} + ${right.name}`,
        sourceType: 'union',
        rowCount,
        columnCount: leftColumns.length,
      })
      return { dataset, sql, ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}) }
    } catch (error) {
      rmSync(dbPath, { force: true })
      throw error
    }
  }

  updateDatasetWarning(id: string, warning: string | null): void {
    this.db
      .prepare('UPDATE datasets SET warning = ?, updated_at = ? WHERE id = ?')
      .run(warning, Date.now(), this.assertDatasetId(id))
  }

  deleteDataset(id: string): boolean {
    this.assertDatasetId(id)
    const dbPath = this.datasetDbPath(id)
    const backupPath = this.datasetBackupPath(id)
    this.db.prepare('DELETE FROM saved_views WHERE dataset_id = ?').run(id)
    this.db.prepare('DELETE FROM dataset_profiles WHERE dataset_id = ?').run(id)
    this.db.prepare('DELETE FROM workflow_runs WHERE dataset_id = ?').run(id)
    this.db
      .prepare(
        'DELETE FROM workflow_versions WHERE workflow_id IN (SELECT id FROM workflows WHERE dataset_id = ?)',
      )
      .run(id)
    this.db.prepare('DELETE FROM workflows WHERE dataset_id = ?').run(id)
    const result = this.db.prepare('DELETE FROM datasets WHERE id = ?').run(id)
    rmSync(dbPath, { force: true })
    rmSync(backupPath, { force: true })
    return Number(result.changes) > 0
  }

  /**
   * Use SQLite's online backup API rather than copying a live database file.
   * The caller can pass the connection it already has open for cleaning; the
   * backup remains transactionally consistent even if the database is busy.
   */
  async makeBackup(id: string, sourceDb?: DatabaseSync): Promise<void> {
    const dbPath = this.datasetDbPath(id)
    if (!existsSync(dbPath)) throw new Error('Dataset storage is missing.')
    const db = sourceDb ?? new DatabaseSync(dbPath, { readOnly: true })
    try {
      await backup(db, this.datasetBackupPath(id))
    } finally {
      if (!sourceDb) db.close()
    }
    this.db.prepare('UPDATE datasets SET backup_available = 1 WHERE id = ?').run(id)
  }

  undoBackup(id: string): boolean {
    const backupPath = this.datasetBackupPath(id)
    if (!existsSync(backupPath)) return false
    const dbPath = this.datasetDbPath(id)
    const tempPath = `${dbPath}.restore-${process.pid}-${Date.now()}.tmp`
    try {
      // Copy beside the target and rename so an interrupted restore cannot
      // leave a half-written analytical database behind.
      copyFileSync(backupPath, tempPath)
      renameSync(tempPath, dbPath)
      rmSync(backupPath, { force: true })
      this.db
        .prepare('UPDATE datasets SET backup_available = 0, updated_at = ? WHERE id = ?')
        .run(Date.now(), id)
      return true
    } finally {
      rmSync(tempPath, { force: true })
    }
  }

  clearBackup(id: string): void {
    rmSync(this.datasetBackupPath(id), { force: true })
    this.db.prepare('UPDATE datasets SET backup_available = 0 WHERE id = ?').run(id)
  }

  /** Read a dataset connection; caller owns it. */
  openDataset(id: string): DatabaseSync {
    return this.datasetConn(id)
  }

  recordAudit(action: string, detail: unknown): void {
    const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
    this.db
      .prepare('INSERT INTO audit_events(id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), action.slice(0, 80), text.slice(0, 4000), Date.now())
  }

  listAudit(limit = 150): AnalyticsAuditEvent[] {
    const bound = Math.min(500, Math.max(1, Math.floor(limit)))
    const rows = this.db
      .prepare('SELECT id, action, detail, created_at FROM audit_events ORDER BY created_at DESC LIMIT ?')
      .all(bound) as unknown as Array<{
      id: string
      action: string
      detail: string
      created_at: number
    }>
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      createdAt: row.created_at,
    }))
  }

  listViews(datasetId?: string): AnalyticsSavedView[] {
    const rows = datasetId
      ? (this.db
          .prepare('SELECT * FROM saved_views WHERE dataset_id = ? ORDER BY updated_at DESC')
          .all(this.assertDatasetId(datasetId)) as unknown as SavedViewRow[])
      : (this.db
          .prepare('SELECT * FROM saved_views ORDER BY updated_at DESC')
          .all() as unknown as SavedViewRow[])
    return rows.map((row) => this.rowToView(row))
  }

  saveView(input: {
    id?: string
    datasetId: string
    name: string
    sql: string
    chart?: AnalyticsChartSpec | null
    insightKind?: AnalyticsSavedView['insightKind']
    filterColumn?: string
    takeaway?: string
    meaning?: string
    method?: string
    detail?: string
    confidence?: AnalyticsSavedView['confidence']
  }): AnalyticsSavedView {
    const datasetId = this.assertDatasetId(input.datasetId)
    const now = Date.now()
    const id = input.id && UUID_RE.test(input.id) ? input.id : randomUUID()
    const name = input.name.trim().slice(0, 120) || 'Untitled view'
    this.db
      .prepare(
        `INSERT INTO saved_views(
           id, dataset_id, name, sql, chart_json, insight_kind, filter_column, takeaway, meaning,
           method, detail, confidence, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           dataset_id = excluded.dataset_id,
           name = excluded.name,
           sql = excluded.sql,
           chart_json = excluded.chart_json,
           insight_kind = excluded.insight_kind,
           filter_column = excluded.filter_column,
           takeaway = excluded.takeaway,
           meaning = excluded.meaning,
           method = excluded.method,
           detail = excluded.detail,
           confidence = excluded.confidence,
           updated_at = excluded.updated_at`,
      )
      .run(
        id,
        datasetId,
        name,
        input.sql,
        input.chart ? JSON.stringify(input.chart) : null,
        input.insightKind ?? null,
        input.filterColumn?.trim().slice(0, 200) || null,
        input.takeaway?.trim().slice(0, 500) || null,
        input.meaning?.trim().slice(0, 2000) || null,
        input.method?.trim().slice(0, 500) || null,
        input.detail?.trim().slice(0, 2000) || null,
        input.confidence ?? null,
        now,
        now,
      )
    const row = this.db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id) as unknown as
      | SavedViewRow
      | undefined
    if (!row) throw new Error('The view could not be saved.')
    return this.rowToView(row)
  }

  deleteView(id: string): boolean {
    if (!UUID_RE.test(id)) return false
    const result = this.db.prepare('DELETE FROM saved_views WHERE id = ?').run(id)
    return Number(result.changes) > 0
  }

  listWorkflows(datasetId?: string): AnalyticsWorkflow[] {
    const rows = datasetId
      ? (this.db
          .prepare('SELECT * FROM workflows WHERE dataset_id = ? ORDER BY updated_at DESC')
          .all(this.assertDatasetId(datasetId)) as unknown as WorkflowRow[])
      : (this.db
          .prepare('SELECT * FROM workflows ORDER BY updated_at DESC')
          .all() as unknown as WorkflowRow[])
    return rows.map((row) => this.rowToWorkflow(row))
  }

  getWorkflow(id: string): AnalyticsWorkflow | null {
    if (!UUID_RE.test(id)) return null
    const row = this.db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as unknown as
      | WorkflowRow
      | undefined
    return row ? this.rowToWorkflow(row) : null
  }

  saveWorkflow(input: {
    id?: string
    datasetId: string
    name: string
    schedule: AnalyticsWorkflowSchedule
    enabled: boolean
    prepare: boolean
    maxRetries: number
    nextRunAt: number | null
  }): AnalyticsWorkflow {
    const datasetId = this.assertDatasetId(input.datasetId)
    const existing = input.id ? this.getWorkflow(input.id) : null
    if (existing && existing.datasetId !== datasetId) {
      throw new Error('A workflow cannot be moved to another dataset.')
    }
    const id = existing?.id ?? randomUUID()
    const version = (existing?.version ?? 0) + 1
    const now = Date.now()
    const name = input.name.trim().slice(0, 120) || 'Automation workflow'
    const scheduleJson = JSON.stringify(input.schedule)
    if (existing) {
      this.db
        .prepare(
          `UPDATE workflows SET
             name = ?, schedule_json = ?, enabled = ?, prepare = ?, max_retries = ?,
             version = ?, updated_at = ?, next_run_at = ?
           WHERE id = ?`,
        )
        .run(
          name,
          scheduleJson,
          input.enabled ? 1 : 0,
          input.prepare ? 1 : 0,
          input.maxRetries,
          version,
          now,
          input.nextRunAt,
          id,
        )
    } else {
      this.db
        .prepare(
          `INSERT INTO workflows(
             id, dataset_id, name, schedule_json, enabled, prepare, max_retries, version,
             created_at, updated_at, next_run_at, run_count
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        )
        .run(
          id,
          datasetId,
          name,
          scheduleJson,
          input.enabled ? 1 : 0,
          input.prepare ? 1 : 0,
          input.maxRetries,
          version,
          now,
          now,
          input.nextRunAt,
        )
    }
    this.db
      .prepare(
        `INSERT INTO workflow_versions(id, workflow_id, version, payload, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        id,
        version,
        JSON.stringify({
          name,
          schedule: input.schedule,
          enabled: input.enabled,
          prepare: input.prepare,
          maxRetries: input.maxRetries,
        }),
        now,
      )
    const saved = this.getWorkflow(id)
    if (!saved) throw new Error('The workflow could not be saved.')
    return saved
  }

  deleteWorkflow(id: string): boolean {
    if (!UUID_RE.test(id)) return false
    this.db.prepare('DELETE FROM workflow_runs WHERE workflow_id = ?').run(id)
    this.db.prepare('DELETE FROM workflow_versions WHERE workflow_id = ?').run(id)
    const result = this.db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
    return Number(result.changes) > 0
  }

  markWorkflowRunning(id: string, startedAt: number): void {
    this.db
      .prepare(
        `UPDATE workflows SET last_run_at = ?, last_run_status = 'running',
           last_run_message = 'Running…', updated_at = ?
         WHERE id = ?`,
      )
      .run(startedAt, startedAt, id)
  }

  finishWorkflowRun(input: {
    id: string
    status: 'ok' | 'error'
    message: string
    nextRunAt: number | null
    finishedAt: number
  }): void {
    this.db
      .prepare(
        `UPDATE workflows SET
           last_run_status = ?, last_run_message = ?, next_run_at = ?,
           run_count = run_count + 1, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.status, input.message.slice(0, 1000), input.nextRunAt, input.finishedAt, input.id)
  }

  recordWorkflowRun(run: AnalyticsWorkflowRun): void {
    this.db
      .prepare(
        `INSERT INTO workflow_runs(
           id, workflow_id, dataset_id, status, started_at, finished_at, message, error,
           insights, views, rows_before, rows_after, elapsed_ms, attempts
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        run.id,
        run.workflowId,
        run.datasetId,
        run.status,
        run.startedAt,
        run.finishedAt,
        run.message.slice(0, 2000),
        run.error?.slice(0, 2000) ?? null,
        run.insights,
        run.views,
        run.rowsBefore ?? null,
        run.rowsAfter ?? null,
        run.elapsedMs,
        run.attempts,
      )
  }

  listWorkflowRuns(workflowId: string, limit = 10): AnalyticsWorkflowRun[] {
    if (!UUID_RE.test(workflowId)) return []
    const bound = Math.min(100, Math.max(1, Math.floor(limit)))
    const rows = this.db
      .prepare(
        'SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY finished_at DESC LIMIT ?',
      )
      .all(workflowId, bound) as unknown as WorkflowRunRow[]
    return rows.map((row) => this.rowToWorkflowRun(row))
  }

  listWorkflowVersions(workflowId: string): AnalyticsWorkflowVersion[] {
    if (!UUID_RE.test(workflowId)) return []
    const rows = this.db
      .prepare('SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC')
      .all(workflowId) as unknown as WorkflowVersionRow[]
    return rows.map((row) => this.rowToWorkflowVersion(row))
  }

  dueWorkflows(now: number): AnalyticsWorkflow[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workflows
         WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
         ORDER BY next_run_at ASC`,
      )
      .all(now) as unknown as WorkflowRow[]
    return rows.map((row) => this.rowToWorkflow(row))
  }

  recoverInterruptedWorkflows(): void {
    this.db
      .prepare(
        `UPDATE workflows SET last_run_status = 'error',
           last_run_message = 'Interrupted when Plot Docs closed.'
         WHERE last_run_status = 'running'`,
      )
      .run()
  }

  private rowToWorkflow(row: WorkflowRow): AnalyticsWorkflow {
    let schedule: AnalyticsWorkflowSchedule = { frequency: 'manual', hour: 9, weekday: 1 }
    try {
      schedule = normalizeWorkflowSchedule(JSON.parse(row.schedule_json)) ?? schedule
    } catch {
      /* keep the safe manual fallback */
    }
    return {
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      schedule,
      enabled: row.enabled === 1,
      prepare: row.prepare === 1,
      maxRetries: row.max_retries,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      runCount: row.run_count,
      ...(row.next_run_at !== null ? { nextRunAt: row.next_run_at } : {}),
      ...(row.last_run_at !== null ? { lastRunAt: row.last_run_at } : {}),
      ...(row.last_run_status === 'running' ||
      row.last_run_status === 'ok' ||
      row.last_run_status === 'error'
        ? { lastRunStatus: row.last_run_status }
        : {}),
      ...(row.last_run_message ? { lastRunMessage: row.last_run_message } : {}),
    }
  }

  private rowToWorkflowRun(row: WorkflowRunRow): AnalyticsWorkflowRun {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      datasetId: row.dataset_id,
      status: row.status === 'error' ? 'error' : 'ok',
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      message: row.message,
      ...(row.error ? { error: row.error } : {}),
      insights: row.insights,
      views: row.views,
      ...(row.rows_before !== null ? { rowsBefore: row.rows_before } : {}),
      ...(row.rows_after !== null ? { rowsAfter: row.rows_after } : {}),
      elapsedMs: row.elapsed_ms,
      attempts: row.attempts,
    }
  }

  private rowToWorkflowVersion(row: WorkflowVersionRow): AnalyticsWorkflowVersion {
    let payload: {
      name?: unknown
      schedule?: unknown
      enabled?: unknown
      prepare?: unknown
      maxRetries?: unknown
    } = {}
    try {
      payload = JSON.parse(row.payload) as typeof payload
    } catch {
      /* an unreadable snapshot still has a version number */
    }
    return {
      id: row.id,
      workflowId: row.workflow_id,
      version: row.version,
      name: typeof payload.name === 'string' ? payload.name : 'Automation workflow',
      schedule:
        normalizeWorkflowSchedule(payload.schedule) ?? { frequency: 'manual', hour: 9, weekday: 1 },
      enabled: payload.enabled === true,
      prepare: payload.prepare === true,
      maxRetries: typeof payload.maxRetries === 'number' ? payload.maxRetries : 1,
      createdAt: row.created_at,
    }
  }

  private rowToView(row: SavedViewRow): AnalyticsSavedView {
    let chart: AnalyticsChartSpec | null = null
    if (row.chart_json) {
      try {
        chart = JSON.parse(row.chart_json) as AnalyticsChartSpec
      } catch {
        chart = null
      }
    }
    return {
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      sql: row.sql,
      chart,
      ...(row.insight_kind ? { insightKind: row.insight_kind as AnalyticsSavedView['insightKind'] } : {}),
      ...(row.filter_column ? { filterColumn: row.filter_column } : {}),
      ...(row.takeaway ? { takeaway: row.takeaway } : {}),
      ...(row.meaning ? { meaning: row.meaning } : {}),
      ...(row.method ? { method: row.method } : {}),
      ...(row.detail ? { detail: row.detail } : {}),
      ...(row.confidence ? { confidence: row.confidence as AnalyticsSavedView['confidence'] } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

interface SavedViewRow {
  id: string
  dataset_id: string
  name: string
  sql: string
  chart_json: string | null
  insight_kind: string | null
  filter_column: string | null
  takeaway: string | null
  meaning: string | null
  method: string | null
  detail: string | null
  confidence: string | null
  created_at: number
  updated_at: number
}

interface WorkflowRow {
  id: string
  dataset_id: string
  name: string
  schedule_json: string
  enabled: number
  prepare: number
  max_retries: number
  version: number
  created_at: number
  updated_at: number
  next_run_at: number | null
  last_run_at: number | null
  last_run_status: string | null
  last_run_message: string | null
  run_count: number
}

interface WorkflowRunRow {
  id: string
  workflow_id: string
  dataset_id: string
  status: string
  started_at: number
  finished_at: number
  message: string
  error: string | null
  insights: number
  views: number
  rows_before: number | null
  rows_after: number | null
  elapsed_ms: number
  attempts: number
}

interface WorkflowVersionRow {
  id: string
  workflow_id: string
  version: number
  payload: string
  created_at: number
}
