import type { DatabaseSync } from 'node:sqlite'
import type {
  AnalyticsCell,
  AnalyticsColumnProfile,
  AnalyticsColumnType,
  AnalyticsDatasetDetail,
  AnalyticsPreview,
} from '../../shared/analytics-api'
import type { AnalyticsStore } from './store'
import { quoteIdent } from './sql'

interface TableInfoRow {
  name: string
  type: string
}

function columnType(sqlType: string): AnalyticsColumnType {
  const type = sqlType.toUpperCase()
  // Check the semantic types before affinity types: BOOLEAN has NUMERIC
  // affinity and DATE usually stores text, but the declared type is the
  // information the analyst needs.
  if (type.includes('BOOL')) return 'boolean'
  if (type.includes('DATE') || type.includes('TIME')) return 'date'
  if (type.includes('INT')) return 'integer'
  if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) return 'real'
  return 'text'
}

function asCell(value: unknown): AnalyticsCell {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'bigint') return Number(value)
  return String(value)
}

export function profileDataset(store: AnalyticsStore, id: string): AnalyticsDatasetDetail {
  const dataset = store.getDataset(id)
  if (!dataset) throw new Error('Dataset not found.')
  const db: DatabaseSync = store.openDataset(id)
  try {
    db.exec('PRAGMA query_only = ON')
    const tableInfo = db.prepare('PRAGMA table_info(data)').all() as unknown as TableInfoRow[]
    const info = tableInfo.map((row) => ({ name: row.name, type: columnType(row.type) }))
    const totalRow = db.prepare('SELECT COUNT(*) AS n FROM data').get() as unknown as { n: number }
    const rowCount = Number(totalRow?.n ?? 0)
    const columns: AnalyticsColumnProfile[] = info.map((column) => {
      const identifier = quoteIdent(column.name)
      const stats = db
        .prepare(
          `SELECT COUNT(${identifier}) AS present,
                  COUNT(DISTINCT ${identifier}) AS distinct_count,
                  MIN(${identifier}) AS min_value,
                  MAX(${identifier}) AS max_value,
                  ${column.type === 'integer' || column.type === 'real' ? `AVG(${identifier})` : 'NULL'} AS mean_value
           FROM data`,
        )
        .get() as unknown as {
        present: number
        distinct_count: number
        min_value: unknown
        max_value: unknown
        mean_value: unknown
      }
      const topRows =
        column.type === 'text' || column.type === 'date'
          ? (db
              .prepare(
                `SELECT ${identifier} AS value, COUNT(*) AS n
                 FROM data
                 WHERE ${identifier} IS NOT NULL
                 GROUP BY ${identifier}
                 ORDER BY n DESC, value ASC
                 LIMIT 5`,
              )
              .all() as unknown as Array<{ value: unknown; n: number }>)
          : []
      return {
        name: column.name,
        type: column.type,
        nullCount: Math.max(0, rowCount - Number(stats?.present ?? 0)),
        distinctCount: Number(stats?.distinct_count ?? 0),
        min: asCell(stats?.min_value),
        max: asCell(stats?.max_value),
        mean:
          stats?.mean_value === null || stats?.mean_value === undefined
            ? null
            : Number(stats.mean_value),
        topValues: topRows.map((row) => ({ value: String(row.value ?? ''), count: Number(row.n) })),
      }
    })
    const previewStatement = db.prepare('SELECT * FROM data LIMIT 51')
    previewStatement.setReturnArrays(true)
    const rawPreview = previewStatement.all() as unknown as unknown[][]
    const preview: AnalyticsPreview = {
      columns: info.map((column) => column.name),
      rows: rawPreview.slice(0, 50).map((row) => row.map(asCell)),
      truncated: rawPreview.length > 50,
    }
    const distinctStatement = db.prepare('SELECT COUNT(*) AS n FROM (SELECT DISTINCT * FROM data)')
    const distinct = distinctStatement.get() as unknown as { n: number }
    const distinctRows = Number(distinct?.n ?? rowCount)
    const duplicateRows = Math.max(0, rowCount - distinctRows)
    const missingCells = columns.reduce((sum, column) => sum + column.nullCount, 0)
    const totalCells = Math.max(1, rowCount * Math.max(1, columns.length))
    const duplicateShare = rowCount > 0 ? duplicateRows / rowCount : 0
    const missingShare = missingCells / totalCells
    const qualityScore = Math.max(
      0,
      Math.min(100, Math.round(100 - missingShare * 60 - duplicateShare * 40)),
    )
    store.saveProfile(id, {
      columns,
      preview,
      duplicateRows,
      missingCells,
      qualityScore,
      rowCount,
      columnCount: columns.length,
    })
    const updated = store.getDataset(id)
    if (!updated) throw new Error('Dataset metadata disappeared while profiling.')
    return { ...updated, columns, preview }
  } finally {
    try {
      db.close()
    } catch {
      /* already closed */
    }
  }
}
