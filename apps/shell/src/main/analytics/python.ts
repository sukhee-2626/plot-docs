import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  AnalyticsPythonRequest,
  AnalyticsPythonResult,
  AnalyticsQueryResult,
} from '../../shared/analytics-api'
import { quoteIdent, toCsv } from './sql'

export const SAFE_PYTHON_SCRIPT = `# Plot Docs safe Python aggregation.
# Only this application-generated script is executed; no user-authored code runs.
import csv, json, sys

csv_path, agg, limit_text = sys.argv[1:4]
limit = max(1, min(1000, int(limit_text)))
groups = {}
with open(csv_path, newline='', encoding='utf-8-sig') as handle:
    for row in csv.DictReader(handle):
        group = row.get('group', '') or '(blank)'
        if agg == 'count':
            groups[group] = groups.get(group, 0.0) + 1.0
            continue
        raw = row.get('metric', '')
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if agg == 'sum':
            groups[group] = groups.get(group, 0.0) + value
        elif agg == 'avg':
            total, count = groups.get(group, (0.0, 0))
            groups[group] = (total + value, count + 1)
        elif agg == 'min':
            groups[group] = min(groups.get(group, value), value)
        elif agg == 'max':
            groups[group] = max(groups.get(group, value), value)

rows = []
for group, value in groups.items():
    if agg == 'avg':
        total, count = value
        value = total / count if count else 0.0
    rows.append([group, round(value, 6)])
rows.sort(key=lambda item: (-item[1], item[0]))
rows = rows[:limit]
print(json.dumps({'columns': ['group', 'value'], 'rows': rows, 'rowCount': len(rows)}))
`

function aggLabel(aggregation: AnalyticsPythonRequest['aggregation']): string {
  if (aggregation === 'avg') return 'average'
  return aggregation
}

export async function runPythonAggregation(
  request: AnalyticsPythonRequest,
  options: {
    columns: readonly { name: string; type: string }[]
    runQuery: (sql: string) => AnalyticsQueryResult
  },
): Promise<AnalyticsPythonResult> {
  const group = request.groupBy
  const metric = request.metric
  if (!options.columns.some((column) => column.name === group)) {
    return { ok: false, error: 'Choose a valid grouping column.' }
  }
  if (!['count', 'sum', 'avg', 'min', 'max'].includes(request.aggregation)) {
    return { ok: false, error: 'Choose a valid aggregation.' }
  }
  if (request.aggregation !== 'count') {
    const metricColumn = options.columns.find((column) => column.name === metric)
    if (!metricColumn) return { ok: false, error: 'Choose a valid numeric metric column.' }
    if (metricColumn.type !== 'integer' && metricColumn.type !== 'real') {
      return { ok: false, error: 'The metric column must be numeric.' }
    }
  }
  const metricExpression = request.aggregation === 'count' ? '1 AS metric' : quoteIdent(metric)
  const sql = `SELECT ${quoteIdent(group)} AS "group", ${metricExpression} FROM data WHERE ${quoteIdent(group)} IS NOT NULL LIMIT 250000`
  let query: AnalyticsQueryResult
  try {
    query = options.runQuery(sql)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  const temp = mkdtempSync(join(tmpdir(), 'plotdocs-analytics-'))
  const csvPath = join(temp, 'input.csv')
  const scriptPath = join(temp, 'aggregate.py')
  const started = Date.now()
  try {
    writeFileSync(csvPath, toCsv(['group', 'metric'], query.rows), 'utf8')
    writeFileSync(scriptPath, SAFE_PYTHON_SCRIPT, 'utf8')
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        process.env.PLOTDOCS_PYTHON || 'python',
        [
          '-I',
          scriptPath,
          csvPath,
          request.aggregation,
          String(Math.max(1, Math.min(1000, Math.floor(Number(request.limit) || 100)))),
        ],
        {
          timeout: 20_000,
          windowsHide: true,
          maxBuffer: 20 * 1024 * 1024,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        },
        (error, out) => {
          if (error) {
            reject(error)
            return
          }
          resolve(String(out))
        },
      )
    })
    const parsed = JSON.parse(stdout.trim()) as {
      columns: string[]
      rows: unknown[][]
      rowCount: number
    }
    const rows = parsed.rows.map((row) =>
      row.map((value) => (typeof value === 'number' ? value : value === null ? null : String(value))),
    )
    const result: AnalyticsQueryResult = {
      columns: parsed.columns,
      rows,
      rowCount: parsed.rowCount,
      truncated: query.truncated,
      elapsedMs: Date.now() - started,
    }
    return {
      ok: true,
      code: SAFE_PYTHON_SCRIPT,
      result,
      elapsedMs: Date.now() - started,
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    const message =
      code === 'ENOENT'
        ? 'Python is not installed or not on PATH. SQL analysis is still available.'
        : code === 'ETIMEDOUT'
          ? 'Python stopped after the 20 second safety timeout.'
          : error instanceof Error
            ? error.message
            : String(error)
    return {
      ok: false,
      error: `${message} (safe ${aggLabel(request.aggregation)} aggregation)`,
      code: SAFE_PYTHON_SCRIPT,
      elapsedMs: Date.now() - started,
    }
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}
