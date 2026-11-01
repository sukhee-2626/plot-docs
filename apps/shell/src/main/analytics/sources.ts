import { existsSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type {
  AnalyticsDatabaseKind,
  AnalyticsDatabaseSource,
  AnalyticsDatabaseTable,
  AnalyticsUrlInspection,
} from '../../shared/analytics-api'
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  tableFromMatrix,
  type ParsedTable,
} from './import'
import { quoteIdent } from './sql'

const URL_TIMEOUT_MS = 30_000
const MAX_REDIRECTS = 4
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443'])
const MAX_HTML_BYTES = 20 * 1024 * 1024
const MAX_HTML_TABLES = 20

export class AnalyticsSourceError extends Error {}

function sourceError(message: string): AnalyticsSourceError {
  return new AnalyticsSourceError(message)
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }
  const [a, b] = parts as [number, number, number, number]
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function isPrivateIpv6(ip: string): boolean {
  const value = ip.toLowerCase()
  if (value === '::' || value === '::1') return true
  if (value.startsWith('fc') || value.startsWith('fd')) return true
  if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) {
    return true
  }
  if (value.startsWith('::ffff:')) return isPrivateIpv4(value.slice(7))
  return false
}

function assertPublicHost(hostname: string): void {
  const lower = hostname.toLowerCase().replace(/\.$/, '')
  if (!lower || lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw sourceError('That address points to this device. Use a public data link instead.')
  }
  const family = isIP(lower)
  if (family === 4 && isPrivateIpv4(lower)) {
    throw sourceError('Private and local network addresses are not allowed for link imports.')
  }
  if (family === 6 && isPrivateIpv6(lower)) {
    throw sourceError('Private and local network addresses are not allowed for link imports.')
  }
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw sourceError('Enter a valid http or https link.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw sourceError('Only http and https links are supported.')
  }
  if (url.username || url.password) {
    throw sourceError('Links with embedded credentials are not supported. Use a database connection instead.')
  }
  if (url.port && !ALLOWED_PORTS.has(url.port)) {
    throw sourceError('That port is not allowed for data links.')
  }
  assertPublicHost(url.hostname)
  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => [])
  if (addresses.length === 0) throw sourceError('The link host could not be resolved.')
  for (const address of addresses) {
    if (address.family === 4 ? isPrivateIpv4(address.address) : isPrivateIpv6(address.address)) {
      throw sourceError('The link resolves to a private address and was blocked.')
    }
  }
  return url
}

async function readLimitedBody(
  response: Response,
  maxBytes = MAX_IMPORT_BYTES,
): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw sourceError(
      maxBytes === MAX_HTML_BYTES
        ? 'The web page is larger than the 20 MB scraping limit.'
        : 'The link is larger than the 100 MB import limit.',
    )
  }
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      throw sourceError(
        maxBytes === MAX_HTML_BYTES
          ? 'The web page is larger than the 20 MB scraping limit.'
          : 'The link is larger than the 100 MB import limit.',
      )
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

function extensionFromContentType(contentType: string): string {
  const value = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  if (value.includes('text/csv') || value.includes('application/csv')) return '.csv'
  if (value.includes('tab-separated')) return '.tsv'
  if (value.includes('json')) return '.json'
  if (value.includes('spreadsheetml') || value.includes('ms-excel')) return '.xlsx'
  return ''
}

function sniffExtension(buffer: Buffer, url: URL): string {
  const pathExt = extname(url.pathname).toLowerCase()
  if (['.csv', '.tsv', '.json', '.xlsx', '.xlsm'].includes(pathExt)) return pathExt
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return '.xlsx'
  const head = buffer.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart()
  if (head.startsWith('{') || head.startsWith('[')) return '.json'
  const firstLine = head.split(/\r?\n/)[0] ?? ''
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  if (tabs > commas && tabs > 0) return '.tsv'
  if (commas > 0) return '.csv'
  return ''
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase()
    if (lower === '#39' || lower === 'apos') return "'"
    if (lower === 'nbsp') return ' '
    if (lower === 'amp') return '&'
    if (lower === 'lt') return '<'
    if (lower === 'gt') return '>'
    if (lower === 'quot') return '"'
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return match
  })
}

function plainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeHtml(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 4096).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase()
  return (
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    head.startsWith('<body') ||
    head.startsWith('<table') ||
    /<(?:table|html|body)\b/.test(head)
  )
}

export interface HtmlTable {
  index: number
  caption: string
  headers: string[]
  matrix: string[][]
  score: number
}

function parseRows(tableHtml: string): { cells: string[]; header: boolean }[] {
  const rows: { cells: string[]; header: boolean }[] = []
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  for (const rowMatch of tableHtml.matchAll(rowRe)) {
    const cells: string[] = []
    let header = false
    const cellRe = /<(t[hd])\b([^>]*)>([\s\S]*?)<\/\1>/gi
    for (const cellMatch of rowMatch[1]!.matchAll(cellRe)) {
      if (cellMatch[1]!.toLowerCase() === 'th') header = true
      const value = plainText(cellMatch[3] ?? '').slice(0, 500)
      const colspan = Number(/colspan\s*=\s*["']?(\d+)/i.exec(cellMatch[2] ?? '')?.[1] ?? 1)
      const repeat = Math.min(10, Math.max(1, Number.isFinite(colspan) ? colspan : 1))
      cells.push(value)
      for (let index = 1; index < repeat; index += 1) cells.push('')
    }
    if (cells.some((cell) => cell !== '')) rows.push({ cells, header })
  }
  return rows
}

function tableFromHtml(html: string, index: number): HtmlTable | null {
  const tableMatch = /<table\b[^>]*>([\s\S]*?)<\/table>/gi.exec(html)
  if (!tableMatch) return null
  const source = tableMatch[1] ?? ''
  const captionMatch = /<caption\b[^>]*>([\s\S]*?)<\/caption>/i.exec(source)
  const caption = captionMatch ? plainText(captionMatch[1] ?? '').slice(0, 120) : ''
  const rows = parseRows(source)
  if (rows.length === 0) return null
  const first = rows[0]!
  const uniqueFirst = new Set(first.cells.map((cell) => cell.toLowerCase())).size === first.cells.length
  const numericFirst = first.cells.filter((cell) => /^[-+]?\d+(?:\.\d+)?%?$/.test(cell)).length
  const headerLike =
    first.header ||
    (first.cells.length >= 2 &&
      uniqueFirst &&
      numericFirst < Math.ceil(first.cells.length / 2) &&
      first.cells.every((cell) => cell.length <= 120))
  const width = Math.max(...rows.map((row) => row.cells.length))
  if (width < 2) return null
  const headers = headerLike
    ? Array.from({ length: width }, (_, column) => first.cells[column] ?? `Column ${column + 1}`)
    : Array.from({ length: width }, (_, column) => `Column ${column + 1}`)
  const body = headerLike ? rows.slice(1) : rows
  if (body.length === 0) return null
  const matrix = [
    headers,
    ...body.map((row) =>
      Array.from({ length: width }, (_, column) => row.cells[column] ?? ''),
    ),
  ]
  return {
    index,
    caption,
    headers,
    matrix,
    score: body.length * Math.min(width, 12) + (caption ? 2 : 0),
  }
}

export function parseHtmlTables(html: string): HtmlTable[] {
  const tables: HtmlTable[] = []
  const tableRe = /<table\b[^>]*>[\s\S]*?<\/table>/gi
  let index = 0
  for (const match of html.matchAll(tableRe)) {
    if (tables.length >= MAX_HTML_TABLES) break
    try {
      const parsed = tableFromHtml(match[0]!, index)
      if (parsed) tables.push(parsed)
    } catch {
      // Skip a malformed table; another table on the page may still be usable.
    }
    index += 1
  }
  return tables
}

function pageTitle(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return match ? plainText(match[1] ?? '').slice(0, 120) : ''
}

function dataLinks(html: string, base: URL): string[] {
  const links: string[] = []
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(anchorRe)) {
    const raw = (match[1] ?? '').trim()
    if (!raw || raw.startsWith('#') || raw.toLowerCase().startsWith('javascript:')) continue
    let resolved: URL
    try {
      resolved = new URL(raw, base)
    } catch {
      continue
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue
    const label = plainText(match[2] ?? '').toLowerCase()
    const path = resolved.pathname.toLowerCase()
    const looksTabular =
      /\.(?:csv|tsv|json|xlsx|xlsm)$/.test(path) ||
      /[?&](?:format|output)=(?:csv|json)/.test(resolved.search.toLowerCase()) ||
      /\.(?:csv|tsv|json|xlsx|xlsm)\b/.test(label)
    if (looksTabular && !links.includes(resolved.toString())) links.push(resolved.toString())
    if (links.length >= 8) break
  }
  return links
}

export interface UrlTable {
  table: ParsedTable
  url: URL
  bytes: number
}

export interface FetchUrlTableOptions {
  /** Zero-based HTML table index returned by inspect_url. */
  tableIndex?: number
}

interface FetchedUrl {
  buffer: Buffer
  url: URL
  contentType: string
  declaredHtml: boolean
}

async function fetchUrlBuffer(rawUrl: string): Promise<FetchedUrl> {
  let current: URL
  try {
    current = await assertPublicUrl(rawUrl.trim())
  } catch (error) {
    throw error instanceof AnalyticsSourceError ? error : sourceError(String(error))
  }
  let response: Response | null = null
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS)
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'PlotDocs-Analytics/1.0',
          accept:
            'text/csv, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/html, */*',
        },
      })
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'The data link timed out after 30 seconds.'
          : `The data link could not be reached: ${error instanceof Error ? error.message : String(error)}`
      throw sourceError(message)
    } finally {
      clearTimeout(timer)
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw sourceError('The link redirected without a destination.')
      if (hop === MAX_REDIRECTS) throw sourceError('The link redirected too many times.')
      current = await assertPublicUrl(new URL(location, current).toString())
      continue
    }
    break
  }
  if (!response) throw sourceError('The data link did not return a response.')
  if (!response.ok) {
    throw sourceError(`The data link returned HTTP ${response.status}.`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  const declaredHtml =
    contentType.toLowerCase().includes('text/html') ||
    contentType.toLowerCase().includes('application/xhtml')
  const buffer = await readLimitedBody(response, declaredHtml ? MAX_HTML_BYTES : MAX_IMPORT_BYTES)
  if (buffer.byteLength === 0) throw sourceError('The data link returned an empty file.')
  return { buffer, url: current, contentType, declaredHtml }
}

function selectedTableIndex(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw >= 100) {
    return undefined
  }
  return raw
}

function tableSelectionWarning(
  chosen: HtmlTable,
  tables: HtmlTable[],
  explicit: boolean,
): string {
  if (explicit) {
    return `Imported table ${chosen.index + 1} of ${tables.length} from this page${chosen.caption ? ` (“${chosen.caption}”)` : ''}.`
  }
  if (tables.length > 1) {
    return `Imported the largest of ${tables.length} tables found on this page${chosen.caption ? ` (“${chosen.caption}”)` : ''}. Use inspect_url and tableIndex to choose a specific table.`
  }
  return 'Imported an HTML table from this page.'
}

/** Download a public data link into a temporary file and parse it as a dataset. */
export async function fetchUrlTable(
  rawUrl: string,
  depth = 0,
  options: FetchUrlTableOptions = {},
): Promise<UrlTable> {
  const fetched = await fetchUrlBuffer(rawUrl)
  const { buffer, url: current, contentType, declaredHtml } = fetched

  if (declaredHtml || looksLikeHtml(buffer)) {
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw sourceError('The web page is larger than the 20 MB scraping limit.')
    }
    const html = buffer.toString('utf8').replace(/^\uFEFF/, '')
    const tables = parseHtmlTables(html)
    if (tables.length > 0) {
      const requested = selectedTableIndex(options.tableIndex)
      const explicit = requested !== undefined
      const chosen = explicit
        ? tables.find((table) => table.index === requested)
        : [...tables].sort((a, b) => b.score - a.score)[0]
      if (!chosen) {
        throw sourceError(
          `Table ${(requested ?? 0) + 1} was not found. This page has ${tables.length} usable table${tables.length === 1 ? '' : 's'}: ${tables.map((table) => table.index + 1).join(', ')}.`,
        )
      }
      const pageName = pageTitle(html) || basename(current.pathname) || current.hostname
      const table = tableFromMatrix(chosen.matrix, pageName, 'html')
      table.name = (chosen.caption || pageName || 'Web table').slice(0, 120)
      table.sourceName = `${current.hostname}${current.pathname}`.slice(0, 200)
      table.sourceType = 'html'
      table.warning = tableSelectionWarning(chosen, tables, explicit)
      return { table, url: current, bytes: buffer.byteLength }
    }
    const links = dataLinks(html, current)
    if (links[0] && depth < 2) {
      const followed = await fetchUrlTable(links[0], depth + 1)
      followed.table.warning = `No HTML table was found on ${current.hostname}; imported the linked data file instead.`
      return followed
    }
    throw sourceError(
      'No data table was found on that page. Paste a direct CSV, TSV, JSON or XLSX link, or a page containing an HTML table.',
    )
  }

  const extension = extensionFromContentType(contentType) || sniffExtension(buffer, current)
  if (!extension) {
    throw sourceError('The link is not a CSV, TSV, JSON, XLSX, XLSM or HTML table.')
  }

  const temp = mkdtempSync(join(tmpdir(), 'plotdocs-link-'))
  const fileName = `${basename(current.pathname).replace(/[^\w.-]+/g, '-').slice(0, 80) || 'link'}${extension}`
  const path = join(temp, fileName)
  try {
    writeFileSync(path, buffer)
    const { parseAnalyticsFile } = await import('./import')
    const table = await parseAnalyticsFile(path)
    table.sourceName = fileName
    table.sourceType = extension.replace('.', '').replace('xlsm', 'xlsx')
    if (!table.name || table.name === 'Dataset') {
      table.name = basename(current.pathname) || 'Linked data'
    }
    return { table, url: current, bytes: buffer.byteLength }
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

/**
 * Fetch a public page and describe its usable HTML tables, direct data links
 * and a short text preview. The model uses this bounded inspection to decide
 * which table or file answers the request before importing anything.
 */
export async function inspectUrlTables(rawUrl: string): Promise<AnalyticsUrlInspection> {
  const fetched = await fetchUrlBuffer(rawUrl)
  const { buffer, url: current, contentType, declaredHtml } = fetched
  const isHtml = declaredHtml || looksLikeHtml(buffer)
  if (!isHtml) {
    const extension = extensionFromContentType(contentType) || sniffExtension(buffer, current)
    return {
      url: current.toString(),
      host: current.hostname,
      pageTitle: basename(current.pathname) || current.hostname,
      contentType,
      tables: [],
      dataLinks: [],
      textPreview: '',
      note: extension
        ? `This is a direct ${extension.replace('.', '').replace('xlsm', 'xlsx').toUpperCase()} data file. Call import_url with this source to import it.`
        : 'This link is not an HTML page and no supported data file type was detected.',
    }
  }
  if (buffer.byteLength > MAX_HTML_BYTES) {
    throw sourceError('The web page is larger than the 20 MB scraping limit.')
  }
  const html = buffer.toString('utf8').replace(/^\uFEFF/, '')
  const tables = parseHtmlTables(html)
  const links = dataLinks(html, current)
  return {
    url: current.toString(),
    host: current.hostname,
    pageTitle: pageTitle(html) || basename(current.pathname) || current.hostname,
    contentType,
    tables: tables.map((table) => ({
      index: table.index,
      caption: table.caption,
      headers: table.headers.slice(0, 20),
      rowCount: Math.max(0, table.matrix.length - 1),
      columnCount: table.headers.length,
      score: table.score,
      sampleRows: table.matrix.slice(1, 4).map((row) => row.slice(0, 20)),
    })),
    dataLinks: links,
    textPreview: plainText(html).slice(0, 4000),
    note: tables.length
      ? `${tables.length} usable table${tables.length === 1 ? '' : 's'} found. Choose the table whose headers and sample rows answer the request, then call import_url with sourceId and the zero-based tableIndex.`
      : links.length
        ? 'No HTML table was found, but direct data links are listed. Call import_url with the chosen direct data link.'
        : 'No usable HTML table or direct data link was found on this page.',
  }
}

export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw)
    return `${url.origin}${url.pathname}`
  } catch {
    return 'link'
  }
}

export function sourceLabelForUrl(raw: string, label?: string): string {
  const clean = label?.trim().slice(0, 120)
  return clean || redactUrl(raw)
}

const SECRET_QUERY_KEY =
  /pass(?:word)?|pwd|secret|token|api[-_]?key|auth|credential|signature|sig|session|access[-_]?token|refresh[-_]?token|client[-_]?secret/i

/**
 * Redact credentials before a connection string can reach a transcript, audit
 * row, error message or model observation. Besides the URL userinfo, database
 * URLs commonly carry passwords and tokens in query parameters, so those are
 * masked too. The original connection stays only in the local source record.
 */
export function redactConnection(connection: string): string {
  try {
    const url = new URL(connection)
    if (url.password) url.password = '***'
    if (url.username) url.username = url.username.slice(0, 2) + '***'
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY_KEY.test(key)) url.searchParams.set(key, '***')
    }
    url.hash = ''
    return url.toString()
  } catch {
    return 'database'
  }
}

function assertSqlitePath(connection: string): string {
  let path = connection.trim()
  if (path.startsWith('sqlite://')) path = path.slice('sqlite://'.length)
  if (!path || path.length > 4096) throw sourceError('Choose a valid SQLite database file.')
  if (!existsSync(path)) throw sourceError('That SQLite database file does not exist.')
  if (!statSync(path).isFile()) throw sourceError('Choose a SQLite database file, not a folder.')
  if (!['.db', '.sqlite', '.sqlite3', '.db3'].includes(extname(path).toLowerCase())) {
    throw sourceError('Choose a .db, .sqlite or .sqlite3 database file.')
  }
  return path
}

export function normalizeDatabaseSource(source: AnalyticsDatabaseSource): AnalyticsDatabaseSource {
  if (!source || typeof source !== 'object') throw sourceError('Choose a database connection.')
  if (!['sqlite', 'postgres', 'mysql'].includes(source.kind)) {
    throw sourceError('Unsupported database type.')
  }
  if (typeof source.connection !== 'string' || !source.connection.trim() || source.connection.length > 8192) {
    throw sourceError('Enter a valid database connection.')
  }
  if (source.kind === 'sqlite') {
    return { kind: 'sqlite', connection: assertSqlitePath(source.connection) }
  }
  let url: URL
  try {
    url = new URL(source.connection.trim())
  } catch {
    throw sourceError('Enter a full database URL, including the user, password, host and database name.')
  }
  if (!['postgres:', 'postgresql:', 'mysql:'].includes(url.protocol)) {
    throw sourceError('Use a postgres:// or mysql:// connection URL.')
  }
  if (!url.hostname || !url.pathname || url.pathname === '/') {
    throw sourceError('The database URL must include a host and database name.')
  }
  return { kind: source.kind, connection: url.toString() }
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildMatrix(columns: readonly string[], rows: readonly unknown[][]): string[][] {
  const seen = new Set<string>()
  const header = columns.slice(0, MAX_IMPORT_COLUMNS).map((column, index) => {
    let name = String(column || `Column ${index + 1}`).slice(0, 120)
    let suffix = 2
    while (seen.has(name.toLowerCase())) {
      name = `${String(column || `Column ${index + 1}`).slice(0, 110)} (${suffix})`
      suffix += 1
    }
    seen.add(name.toLowerCase())
    return name
  })
  const matrix = [header]
  for (const row of rows) {
    matrix.push(row.slice(0, MAX_IMPORT_COLUMNS).map(stringValue))
  }
  return matrix
}

export function listSqliteTables(connection: string): AnalyticsDatabaseTable[] {
  const path = assertSqlitePath(connection)
  const db = new DatabaseSync(path, { readOnly: true })
  try {
    const rows = db
      .prepare(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name LIMIT 1000",
      )
      .all() as unknown as Array<{ name: string; type: string }>
    return rows
      .filter((row) => row.name)
      .map((row) => ({ name: row.name, type: row.type === 'view' ? 'view' : 'table' }))
  } finally {
    db.close()
  }
}

export function importSqliteTable(connection: string, table: string): ParsedTable {
  const path = assertSqlitePath(connection)
  const db = new DatabaseSync(path, { readOnly: true })
  try {
    const known = db
      .prepare("SELECT name, type FROM sqlite_master WHERE name = ? AND type IN ('table','view')")
      .get(table) as unknown as { name: string; type: string } | undefined
    if (!known) throw sourceError('That table no longer exists in the database.')
    const statement = db.prepare(`SELECT * FROM ${quoteIdent(table)} LIMIT ${MAX_IMPORT_ROWS + 1}`)
    statement.setReturnArrays(true)
    const columns = statement.columns().map((column) => column.name)
    const rows: unknown[][] = []
    for (const row of statement.iterate()) rows.push(row as unknown as unknown[])
    if (rows.length > MAX_IMPORT_ROWS) {
      throw sourceError(`That table has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Use a query or a smaller table.`)
    }
    return tableFromMatrix(buildMatrix(columns, rows), `${table}.sqlite`, 'sqlite')
  } finally {
    db.close()
  }
}

interface PgResult {
  fields: { name: string }[]
  rows: Record<string, unknown>[]
}

interface PgClient {
  query(sql: string): Promise<PgResult>
  end(): Promise<void>
}

async function connectPostgres(connection: string): Promise<PgClient> {
  type PgModule = {
    Client: new (config: {
      connectionString: string
      connectionTimeoutMillis: number
      query_timeout: number
      statement_timeout: number
      ssl?: { rejectUnauthorized: boolean }
    }) => {
      connect(): Promise<void>
      query(sql: string): Promise<PgResult>
      end(): Promise<void>
    }
  }
  let module: PgModule
  try {
    module = (await import('pg')) as unknown as PgModule
  } catch {
    throw sourceError('PostgreSQL support is not installed in this build. Use a SQLite file or a data link.')
  }
  const client = new module.Client({
    connectionString: connection,
    connectionTimeoutMillis: 15_000,
    query_timeout: 45_000,
    statement_timeout: 45_000,
  })
  await client.connect()
  return client
}

interface MySqlConnection {
  query(options: { sql: string; timeout?: number }): Promise<[unknown[], unknown[]]>
  end(): Promise<void>
}

async function connectMysql(connection: string): Promise<MySqlConnection> {
  type MysqlModule = {
    createConnection(config: string | Record<string, unknown>): Promise<MySqlConnection>
  }
  let module: MysqlModule
  try {
    module = (await import('mysql2/promise')) as unknown as MysqlModule
  } catch {
    throw sourceError('MySQL support is not installed in this build. Use a SQLite file or a data link.')
  }
  return module.createConnection({ uri: connection, connectTimeout: 15_000, timeout: 45_000 })
}

export async function listDatabaseTables(source: AnalyticsDatabaseSource): Promise<AnalyticsDatabaseTable[]> {
  const normalized = normalizeDatabaseSource(source)
  if (normalized.kind === 'sqlite') return listSqliteTables(normalized.connection)
  if (normalized.kind === 'postgres') {
    const client = await connectPostgres(normalized.connection)
    try {
      const result = await client.query(
        "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name LIMIT 1000",
      )
      return result.rows.map((row) => ({
        schema: String(row.table_schema ?? ''),
        name: String(row.table_name ?? ''),
        type: String(row.table_type ?? '').toUpperCase().includes('VIEW') ? 'view' : 'table',
      }))
    } finally {
      await client.end().catch(() => {})
    }
  }
  const client = await connectMysql(normalized.connection)
  try {
    const [rows] = await client.query({
      sql: "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name LIMIT 1000",
      timeout: 45_000,
    })
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      schema: String(row.table_schema ?? ''),
      name: String(row.table_name ?? ''),
      type: String(row.table_type ?? '').toUpperCase().includes('VIEW') ? 'view' : 'table',
    }))
  } finally {
    await client.end().catch(() => {})
  }
}

export async function importDatabaseTable(
  source: AnalyticsDatabaseSource,
  table: string,
  schema?: string,
): Promise<ParsedTable> {
  const normalized = normalizeDatabaseSource(source)
  const tableName = String(table ?? '').trim()
  if (!tableName || tableName.length > 128) throw sourceError('Choose a table to import.')
  if (normalized.kind === 'sqlite') {
    return importSqliteTable(normalized.connection, tableName)
  }

  const available = await listDatabaseTables(normalized)
  const match = available.find((entry) => entry.name === tableName && (!schema || entry.schema === schema))
  if (!match) throw sourceError('That table is not available in this database.')
  const qualified =
    normalized.kind === 'postgres' && match.schema
      ? `${quoteIdent(match.schema)}.${quoteIdent(match.name)}`
      : quoteIdent(match.name)

  if (normalized.kind === 'postgres') {
    const client = await connectPostgres(normalized.connection)
    try {
      const result = await client.query(`SELECT * FROM ${qualified} LIMIT ${MAX_IMPORT_ROWS + 1}`)
      if (result.rows.length > MAX_IMPORT_ROWS) {
        throw sourceError(`That table has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows.`)
      }
      const columns = result.fields.map((field) => field.name)
      return tableFromMatrix(
        buildMatrix(columns, result.rows.map((row) => columns.map((column) => row[column]))),
        `${match.schema ? `${match.schema}.` : ''}${match.name}.postgres`,
        'postgres',
      )
    } finally {
      await client.end().catch(() => {})
    }
  }

  const client = await connectMysql(normalized.connection)
  try {
    const [rows, fields] = await client.query({
      sql: `SELECT * FROM ${qualified} LIMIT ${MAX_IMPORT_ROWS + 1}`,
      timeout: 45_000,
    })
    if (rows.length > MAX_IMPORT_ROWS) {
      throw sourceError(`That table has more than ${MAX_IMPORT_ROWS.toLocaleString()} rows.`)
    }
    const columns = (fields as Array<{ name: string }>).map((field) => field.name)
    return tableFromMatrix(
      buildMatrix(columns, (rows as Array<Record<string, unknown>>).map((row) => columns.map((column) => row[column]))),
      `${match.schema ? `${match.schema}.` : ''}${match.name}.mysql`,
      'mysql',
    )
  } finally {
    await client.end().catch(() => {})
  }
}

export function newSourceId(): string {
  return `src_${randomUUID()}`
}

export function urlSourceDetail(rawUrl: string): string {
  return redactUrl(rawUrl)
}
