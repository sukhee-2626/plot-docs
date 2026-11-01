import { constants, type DatabaseSync } from 'node:sqlite'

const FORBIDDEN_TOKENS = new Set([
  'ATTACH',
  'DETACH',
  'PRAGMA',
  'VACUUM',
  'REINDEX',
  'ANALYZE',
  'INSERT',
  'UPDATE',
  'DELETE',
  'REPLACE',
  'UPSERT',
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'LOAD_EXTENSION',
])

export function quoteIdent(name: string): string {
  if (name.includes('\u0000')) throw new Error('Invalid identifier.')
  return `"${name.replace(/"/g, '""')}"`
}

export function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Remove comments, string literals and quoted identifiers so keyword checks
 * cannot be fooled by text inside a value or a column name.
 */
function stripSqlNoise(sql: string): string {
  let out = ''
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]
    if (char === '-' && next === '-') {
      while (index < sql.length && sql[index] !== '\n') index += 1
      out += ' '
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1
      index += 1
      out += ' '
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      index += 1
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) index += 2
          else break
        } else {
          index += 1
        }
      }
      out += ' '
      continue
    }
    if (char === '[') {
      while (index < sql.length && sql[index] !== ']') index += 1
      out += ' '
      continue
    }
    out += char
  }
  return out
}

/** Validate a user/AI query before it reaches the read-only dataset DB. */
export function validateReadOnlySql(sql: string): string {
  const trimmed = sql.trim()
  if (!trimmed) throw new Error('Write a SQL query first.')
  if (trimmed.length > 20_000) throw new Error('The query is too long (20,000 character limit).')
  const stripped = stripSqlNoise(trimmed)
  const withoutTrailing = stripped.replace(/;\s*$/, '')
  if (withoutTrailing.includes(';')) throw new Error('Only one SQL statement is allowed.')
  const first = withoutTrailing.trim().split(/\s+/, 1)[0]?.toUpperCase()
  if (first !== 'SELECT' && first !== 'WITH') {
    throw new Error('Analytics queries must start with SELECT or WITH.')
  }
  const tokens = withoutTrailing.toUpperCase().match(/[A-Z_]+/g) ?? []
  for (const token of tokens) {
    if (FORBIDDEN_TOKENS.has(token)) {
      throw new Error(`Read-only analytics queries cannot use ${token}.`)
    }
  }
  return trimmed
}

const DENIED_FUNCTIONS = new Set([
  'load_extension',
  'writefile',
  'readfile',
  'edit',
  'fts3_tokenizer',
])

/**
 * Second line of defence after validateReadOnlySql and the read-only
 * connection: allow only reads from the dataset table and ordinary functions.
 */
export function installReadOnlyAuthorizer(db: DatabaseSync): void {
  db.setAuthorizer((action, arg1, arg2) => {
    if (action === constants.SQLITE_SELECT || action === constants.SQLITE_RECURSIVE) {
      return constants.SQLITE_OK
    }
    if (action === constants.SQLITE_READ) {
      return arg1 === 'data' ? constants.SQLITE_OK : constants.SQLITE_DENY
    }
    if (action === constants.SQLITE_FUNCTION) {
      return arg2 && DENIED_FUNCTIONS.has(arg2.toLowerCase())
        ? constants.SQLITE_DENY
        : constants.SQLITE_OK
    }
    return constants.SQLITE_DENY
  })
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(columns: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  return `${lines.join('\r\n')}\r\n`
}
