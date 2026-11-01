import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { decodeCsvBuffer, parseCsv, sniffDelimiter } from '@plotdocs/xlsx-gateway/gateway/csv-import'
import { readBasicWorkbook } from '@plotdocs/xlsx-gateway/gateway/xlsx-gateway'
import type { AnalyticsCell, AnalyticsColumnType } from '../../shared/analytics-api'
import { quoteIdent } from './sql'

export const MAX_IMPORT_BYTES = 100 * 1024 * 1024
export const MAX_IMPORT_ROWS = 250_000
export const MAX_IMPORT_COLUMNS = 256

export interface ParsedColumn {
  name: string
  type: AnalyticsColumnType
  /**
   * SQLite accepts these declared type names and preserves them in
   * `PRAGMA table_info`. BOOLEAN and DATE carry the semantic type through
   * profiling even though SQLite stores them with numeric/text affinity.
   */
  sqlType: 'INTEGER' | 'REAL' | 'TEXT' | 'BOOLEAN' | 'DATE'
}

export interface ParsedTable {
  name: string
  sourceName: string
  sourceType: string
  columns: ParsedColumn[]
  rows: AnalyticsCell[][]
  warning?: string
}

const INTEGER_RE = /^[+-]?\d+$/
const REAL_RE = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?$/
const BOOLEAN_RE = /^(?:true|false)$/i

function textOf(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function inferType(values: readonly string[]): AnalyticsColumnType {
  const present = values.filter((v) => v.trim() !== '')
  if (present.length === 0) return 'text'
  if (present.every((v) => BOOLEAN_RE.test(v.trim()))) return 'boolean'
  if (present.every((v) => INTEGER_RE.test(v.trim()))) {
    // JavaScript numbers are IEEE-754 doubles. If any integer cannot be
    // represented exactly, keep the whole column as text instead of silently
    // rounding identifiers such as 64-bit account numbers. Leading zeros are
    // also meaningful in identifiers (ZIP codes, account codes, product
    // codes), so never turn 00123 into 123.
    const leadingZero = present.some((v) => /^[+-]?0\d/.test(v.trim()))
    return !leadingZero && present.every((v) => Number.isSafeInteger(Number(v)))
      ? 'integer'
      : 'text'
  }
  if (present.every((v) => REAL_RE.test(v.trim()))) return 'real'
  if (present.every((v) => ISO_DATE_RE.test(v.trim()))) return 'date'
  return 'text'
}

function sqlTypeOf(type: AnalyticsColumnType): ParsedColumn['sqlType'] {
  if (type === 'integer') return 'INTEGER'
  if (type === 'boolean') return 'BOOLEAN'
  if (type === 'real') return 'REAL'
  if (type === 'date') return 'DATE'
  return 'TEXT'
}

function normalizedCell(raw: string, type: AnalyticsColumnType): AnalyticsCell {
  const value = raw.trim()
  if (value === '') return null
  if (type === 'integer') return Number.parseInt(value, 10)
  if (type === 'real') return Number(value)
  if (type === 'boolean') return /^true$/i.test(value) ? 1 : 0
  // A date is a semantic value, not free text. Keeping surrounding spaces
  // would break ISO ordering, date filters and month grouping even though the
  // column was correctly detected as a date.
  if (type === 'date') return value
  return raw
}

function safeColumnNames(raw: readonly string[]): string[] {
  const used = new Set<string>()
  return raw.slice(0, MAX_IMPORT_COLUMNS).map((header, index) => {
    let base = header.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
    if (!base) base = `Column ${index + 1}`
    let name = base
    let suffix = 2
    while (used.has(name.toLowerCase())) {
      name = `${base} (${suffix})`
      suffix += 1
    }
    used.add(name.toLowerCase())
    return name
  })
}

/** Convert a rectangular string table (first row = header) to typed rows. */
export function tableFromMatrix(
  matrix: readonly (readonly string[])[],
  sourceName: string,
  sourceType: string,
): ParsedTable {
  const nonEmpty = matrix.filter((row) => row.some((cell) => cell.trim() !== ''))
  if (nonEmpty.length === 0) throw new Error('The file contains no data rows.')
  if (nonEmpty.length > MAX_IMPORT_ROWS + 1) {
    throw new Error(`This file has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Split it first.`)
  }
  const header = safeColumnNames(nonEmpty[0] ?? [])
  if (header.length === 0) throw new Error('The file has no columns.')
  const body = nonEmpty.slice(1)
  const columns = header.map((name, columnIndex) => {
    const values = body.map((row) => textOf(row[columnIndex] ?? ''))
    const type = inferType(values)
    return { name, type, sqlType: sqlTypeOf(type) }
  })
  const rows = body.map((row) =>
    columns.map((column, columnIndex) => normalizedCell(textOf(row[columnIndex] ?? ''), column.type)),
  )
  return {
    name: basename(sourceName).replace(/\.[^.]+$/, '').slice(0, 120) || 'Dataset',
    sourceName: basename(sourceName),
    sourceType,
    columns,
    rows,
  }
}

function parseCsvTable(buffer: Buffer, sourceName: string): ParsedTable {
  const text = decodeCsvBuffer(new Uint8Array(buffer))
  const delimiter = sniffDelimiter(text)
  return tableFromMatrix(parseCsv(text, delimiter), sourceName, delimiter === '\t' ? 'tsv' : 'csv')
}

function columnIndexFromLetters(lettersRaw: string): number {
  const letters = lettersRaw.toUpperCase()
  let value = 0
  for (const letter of letters) value = value * 26 + (letter.charCodeAt(0) - 64)
  return value - 1
}

async function parseXlsxTable(buffer: Buffer, sourceName: string): Promise<ParsedTable> {
  const workbook = await readBasicWorkbook(buffer)
  const sheet = workbook.snapshot.sheets[0]
  if (!sheet) throw new Error('The workbook has no worksheets.')
  let maxRow = 0
  let maxColumn = 0
  const cells = new Map<string, string>()
  for (const [address, cell] of Object.entries(sheet.cells)) {
    const match = /^([A-Za-z]+)(\d+)$/.exec(address)
    if (!match) continue
    const column = columnIndexFromLetters(match[1] ?? '')
    const row = Number.parseInt(match[2] ?? '0', 10) - 1
    if (column < 0 || row < 0) continue
    maxRow = Math.max(maxRow, row)
    maxColumn = Math.max(maxColumn, column)
    const value = cell.rawValue ?? cell.value
    if (value !== null && value !== undefined) cells.set(`${row}:${column}`, textOf(value))
  }
  if (maxRow + 1 > MAX_IMPORT_ROWS + 1) {
    throw new Error(`This sheet has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Split it first.`)
  }
  if (maxColumn + 1 > MAX_IMPORT_COLUMNS) {
    throw new Error(`This sheet has more than ${MAX_IMPORT_COLUMNS} columns. Remove unused columns first.`)
  }
  const matrix: string[][] = []
  for (let row = 0; row <= maxRow; row += 1) {
    const line: string[] = []
    for (let column = 0; column <= maxColumn; column += 1) {
      line.push(cells.get(`${row}:${column}`) ?? '')
    }
    matrix.push(line)
  }
  return tableFromMatrix(matrix, sourceName, 'xlsx')
}

function parseJsonTable(buffer: Buffer, sourceName: string): ParsedTable {
  const parsed: unknown = JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''))
  const root = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null
  const data = Array.isArray(parsed) ? parsed : root?.data ?? root?.rows
  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of objects, an array of rows, or { "data": [...] }.')
  }
  if (data.length === 0) throw new Error('The JSON file contains no rows.')
  if (data.every((row) => Array.isArray(row))) {
    return tableFromMatrix(
      (data as unknown[][]).map((row) => row.map(textOf)),
      sourceName,
      'json',
    )
  }
  if (!data.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('JSON rows must all be objects or all be arrays.')
  }
  const keys: string[] = []
  for (const row of data as Record<string, unknown>[]) {
    for (const key of Object.keys(row)) if (!keys.includes(key)) keys.push(key)
  }
  const matrix = [
    keys,
    ...(data as Record<string, unknown>[]).map((row) => keys.map((key) => textOf(row[key]))),
  ]
  return tableFromMatrix(matrix, sourceName, 'json')
}

export async function parseAnalyticsFile(path: string): Promise<ParsedTable> {
  const ext = extname(path).toLowerCase()
  if (!['.csv', '.tsv', '.json', '.xlsx', '.xlsm'].includes(ext)) {
    throw new Error('Choose a CSV, TSV, JSON, XLSX or XLSM file.')
  }
  const stats = statSync(path)
  if (!stats.isFile()) throw new Error('Choose a data file, not a folder.')
  if (stats.size > MAX_IMPORT_BYTES) {
    throw new Error('This file is larger than 100 MB. Split it before importing.')
  }
  const buffer = readFileSync(path)
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new Error('This file is larger than 100 MB. Split it before importing.')
  }
  if (ext === '.csv' || ext === '.tsv') return parseCsvTable(buffer, path)
  if (ext === '.json') return parseJsonTable(buffer, path)
  return parseXlsxTable(buffer, path)
}

export function createDataTableSql(tableName: string, columns: readonly ParsedColumn[]): string {
  return `CREATE TABLE ${quoteIdent(tableName)} (${columns
    .map((column) => `${quoteIdent(column.name)} ${column.sqlType}`)
    .join(', ')})`
}
