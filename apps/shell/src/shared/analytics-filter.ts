/**
 * Dashboard slicers rewrite a saved read-only query so the chosen value is
 * applied to the base table before the card's own aggregation. Wrapping the
 * table reference (rather than filtering the aggregated output) keeps sums,
 * averages and counts correct.
 */

export interface AnalyticsDashboardFilter {
  column: string
  value: string
}

export interface AnalyticsFilteredSql {
  sql: string
  /** False when the saved query does not read from the dataset table. */
  applied: boolean
}

const SQL_CLAUSE_KEYWORDS = new Set([
  'AS',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'WINDOW',
  'JOIN',
  'LEFT',
  'RIGHT',
  'FULL',
  'INNER',
  'OUTER',
  'CROSS',
  'NATURAL',
  'ON',
  'USING',
  'AND',
  'OR',
  'NOT',
  'INDEXED',
  'RETURNING',
  'QUALIFY',
  'FETCH',
  'FOR',
  'VALUES',
  'SET',
])

const TABLE_REFERENCE =
  /\b(FROM|JOIN)\s+(?:data\b|"data"|\[data\])(\s+(?:AS\s+)?((?:"(?:[^"]|"")+")|(?:[A-Za-z_][A-Za-z0-9_]*)))?/gi

function quoteIdent(name: string): string {
  if (!name || name.includes('\u0000')) throw new Error('Invalid slicer column.')
  return `"${name.replace(/"/g, '""')}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function unquoteAlias(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"')
  }
  return value
}

export function dashboardFilterLabel(filter: AnalyticsDashboardFilter): string {
  return `${filter.column} = ${filter.value}`
}

export function applyDashboardFilter(
  sql: string,
  filter: AnalyticsDashboardFilter | null | undefined,
): AnalyticsFilteredSql {
  if (!filter || !filter.column || filter.value === '') {
    return { sql, applied: false }
  }
  const predicate = `${quoteIdent(filter.column)} = ${quoteLiteral(filter.value)}`
  let applied = false
  const rewritten = sql.replace(
    TABLE_REFERENCE,
    (_match, keyword: string, aliasPart: string | undefined, aliasRaw: string | undefined) => {
      applied = true
      if (!aliasRaw) {
        return `${keyword} (SELECT * FROM data WHERE ${predicate}) AS "data"`
      }
      const aliasName = unquoteAlias(aliasRaw)
      const quotedAlias = aliasRaw.startsWith('"')
      // `FROM data WHERE ...` looks like an alias to the regex. Preserve the
      // real clause instead of swallowing it as an alias.
      if (!quotedAlias && SQL_CLAUSE_KEYWORDS.has(aliasName.toUpperCase())) {
        return `${keyword} (SELECT * FROM data WHERE ${predicate}) AS "data"${aliasPart ?? ''}`
      }
      return `${keyword} (SELECT * FROM data WHERE ${predicate}) AS ${quoteIdent(aliasName)}`
    },
  )
  return { sql: applied ? rewritten : sql, applied }
}
