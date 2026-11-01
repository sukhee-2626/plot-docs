import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import type {
  AnalyticsDatasetDetail,
  AnalyticsPythonRequest,
  AnalyticsQueryResult,
} from '../src/shared/analytics-api'
import { parseAnalyticsPlan } from '../src/main/analytics/ai'
import { linearForecast } from '../src/main/analytics/forecast'
import { ungroundedNumbers } from '../src/main/analytics/grounding'
import { parseAnalyticsFile, tableFromMatrix } from '../src/main/analytics/import'
import { buildLocalPlan, parseAiPlan } from '../src/main/analytics/plan'
import { profileDataset } from '../src/main/analytics/profile'
import { runPythonAggregation } from '../src/main/analytics/python'
import { installReadOnlyAuthorizer, quoteIdent, toCsv, validateReadOnlySql } from '../src/main/analytics/sql'
import { redactConnection, redactUrl } from '../src/main/analytics/sources'
import { AnalyticsStore } from '../src/main/analytics/store'
import { normalizeChartSpec, normalizeCleanOperation } from '../src/main/analytics/validation'

const temporaryDirectories: string[] = []

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'plotdocs-data-analytics-'))
  temporaryDirectories.push(directory)
  return directory
}

function planDetail(): AnalyticsDatasetDetail {
  return {
    id: 'ds_plan',
    name: 'Sales plan fixture',
    sourceName: 'sales.csv',
    sourceType: 'csv',
    rowCount: 100,
    columnCount: 5,
    qualityScore: 94,
    duplicateRows: 0,
    missingCells: 3,
    createdAt: 1,
    updatedAt: 1,
    canUndo: false,
    columns: [
      {
        name: 'region',
        type: 'text',
        nullCount: 0,
        distinctCount: 4,
        min: null,
        max: null,
        mean: null,
        topValues: [],
      },
      {
        name: 'month',
        type: 'date',
        nullCount: 0,
        distinctCount: 12,
        min: '2024-01-01',
        max: '2024-12-01',
        mean: null,
        topValues: [],
      },
      {
        name: 'amount',
        type: 'integer',
        nullCount: 2,
        distinctCount: 90,
        min: 10,
        max: 500,
        mean: 120,
        topValues: [],
      },
      {
        name: 'units',
        type: 'integer',
        nullCount: 1,
        distinctCount: 60,
        min: 1,
        max: 40,
        mean: 12,
        topValues: [],
      },
      {
        name: 'order_id',
        type: 'integer',
        nullCount: 0,
        distinctCount: 100,
        min: 1,
        max: 100,
        mean: 50,
        topValues: [],
      },
    ],
    preview: {
      columns: ['region', 'month', 'amount', 'units', 'order_id'],
      rows: [
        ['East', '2024-01-01', 100, 10, 1],
        ['West', '2024-02-01', 120, 12, 2],
      ],
      truncated: false,
    },
  }
}

const pythonCommand = process.env.PLOTDOCS_PYTHON || 'python'
const pythonProbe = spawnSync(pythonCommand, ['-V'], { encoding: 'utf8', windowsHide: true })
const hasPython = pythonProbe.status === 0

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true })
  }
})

afterAll(() => {
  // keep the probe explicit so an unavailable Python binary is visible in test output
  if (!hasPython) console.info('Python tests skipped:', pythonProbe.error?.message ?? 'not available')
})

describe('analytics import typing', () => {
  it('infers semantic types, keeps unsafe integers as text, and deduplicates headers', () => {
    const table = tableFromMatrix(
      [
        [' Name ', 'Active', 'When', 'Amount', 'Code', 'Name'],
        [' Alpha ', 'true', '2024-01-02', '1.5', '9007199254740993', 'x'],
        [' Beta ', 'false', '2024-02-03', '2', '42', 'y'],
      ],
      'sample.csv',
      'csv',
    )

    expect(table.name).toBe('sample')
    expect(table.columns.map((column) => column.name)).toEqual([
      'Name',
      'Active',
      'When',
      'Amount',
      'Code',
      'Name (2)',
    ])
    expect(table.columns.map((column) => column.type)).toEqual([
      'text',
      'boolean',
      'date',
      'real',
      'text',
      'text',
    ])
    expect(table.columns.map((column) => column.sqlType)).toEqual([
      'TEXT',
      'BOOLEAN',
      'DATE',
      'REAL',
      'TEXT',
      'TEXT',
    ])
    expect(table.rows[0]).toEqual([' Alpha ', 1, '2024-01-02', 1.5, '9007199254740993', 'x'])
    expect(table.rows[1]).toEqual([' Beta ', 0, '2024-02-03', 2, '42', 'y'])
  })

  it('fills missing cells with null and preserves safe integer values', () => {
    const table = tableFromMatrix(
      [
        ['id', 'value'],
        ['1', '10'],
        ['2', ''],
      ],
      'sample.csv',
      'csv',
    )
    expect(table.columns[0]?.type).toBe('integer')
    expect(table.columns[1]?.type).toBe('integer')
    expect(table.rows).toEqual([
      [1, 10],
      [2, null],
    ])
  })

  it('parses BOM-prefixed CSV and JSON files', async () => {
    const directory = temporaryDirectory()
    const csvPath = join(directory, 'input.csv')
    writeFileSync(csvPath, '\uFEFFregion,amount\r\nEast,10\r\nWest,20\r\n', 'utf8')
    const csv = await parseAnalyticsFile(csvPath)
    expect(csv.columns.map((column) => column.name)).toEqual(['region', 'amount'])
    expect(csv.columns.map((column) => column.type)).toEqual(['text', 'integer'])
    expect(csv.rows).toEqual([
      ['East', 10],
      ['West', 20],
    ])

    const jsonPath = join(directory, 'input.json')
    writeFileSync(jsonPath, '\uFEFF[{"a":1,"b":"x"},{"a":2,"c":"y"}]', 'utf8')
    const json = await parseAnalyticsFile(jsonPath)
    expect(json.columns.map((column) => column.name)).toEqual(['a', 'b', 'c'])
    expect(json.rows).toEqual([
      [1, 'x', null],
      [2, null, 'y'],
    ])
  })

  it('rejects unsupported extensions and empty files', async () => {
    const directory = temporaryDirectory()
    const textPath = join(directory, 'notes.txt')
    writeFileSync(textPath, 'hello', 'utf8')
    await expect(parseAnalyticsFile(textPath)).rejects.toThrow('Choose a CSV')

    const emptyPath = join(directory, 'empty.csv')
    writeFileSync(emptyPath, '', 'utf8')
    await expect(parseAnalyticsFile(emptyPath)).rejects.toThrow('no data rows')
  })
})

describe('SQL safety', () => {
  it('accepts one read-only statement and ignores comment and string noise', () => {
    expect(validateReadOnlySql('SELECT 1;')).toBe('SELECT 1;')
    expect(validateReadOnlySql('WITH x AS (SELECT 1) SELECT * FROM x')).toContain('WITH')
    expect(validateReadOnlySql("SELECT ';' AS semi, 'delete' AS word;")).toContain("';'")
    expect(validateReadOnlySql('SELECT "delete" FROM data')).toContain('"delete"')
    expect(validateReadOnlySql('SELECT 1 -- ; DROP TABLE data')).toContain('DROP TABLE')
  })

  it('rejects writes, pragmas, extensions and multiple statements', () => {
    for (const sql of [
      'INSERT INTO data VALUES (1)',
      'UPDATE data SET amount = 0',
      'DELETE FROM data',
      'PRAGMA table_info(data)',
      'ATTACH DATABASE \'x\' AS other',
      'SELECT 1; SELECT 2',
      'SELECT load_extension(\'evil\')',
      'VACUUM',
      'CREATE TABLE x (a INTEGER)',
    ]) {
      expect(() => validateReadOnlySql(sql), sql).toThrow()
    }
    expect(() => validateReadOnlySql('   ')).toThrow('Write a SQL query first')
    expect(() => validateReadOnlySql(`SELECT ${'x'.repeat(20_001)}`)).toThrow('too long')
  })

  it('enforces the read-only authorizer at SQLite level', () => {
    const db = new DatabaseSync(':memory:')
    db.exec('CREATE TABLE data (a INTEGER, b TEXT)')
    db.exec("INSERT INTO data VALUES (1, 'x'), (2, 'y')")
    installReadOnlyAuthorizer(db)
    try {
      expect(db.prepare('SELECT a, b FROM data ORDER BY a').all()).toEqual([
        { a: 1, b: 'x' },
        { a: 2, b: 'y' },
      ])
      expect(() => db.prepare('SELECT name FROM sqlite_master').all()).toThrow()
      expect(() => db.prepare("SELECT load_extension('evil')").all()).toThrow()
      expect(() => db.exec('CREATE TABLE other (a INTEGER)')).toThrow()
    } finally {
      db.close()
    }
  })

  it('quotes identifiers and serializes CSV predictably', () => {
    expect(quoteIdent('a"b')).toBe('"a""b"')
    expect(() => quoteIdent('a\0b')).toThrow()
    expect(toCsv(['a', 'b'], [[1, 'x,y'], [null, 'line\nbreak']])).toBe(
      'a,b\r\n1,"x,y"\r\n,"line\nbreak"\r\n',
    )
  })
})

describe('chart and cleaning validation', () => {
  it('normalizes valid chart specs and rejects unsafe or incomplete ones', () => {
    expect(
      normalizeChartSpec({ type: 'bar', x: ' region ', y: 'total', aggregation: 'sum' }),
    ).toEqual({ type: 'bar', x: 'region', y: 'total', aggregation: 'sum' })
    expect(normalizeChartSpec({ type: 'pie', x: 'a', y: 'b', aggregation: 'sum' })).toEqual({
      type: 'pie',
      x: 'a',
      y: 'b',
      aggregation: 'sum',
    })
    expect(normalizeChartSpec({ type: 'donut', x: 'a', y: 'b', aggregation: 'sum' })).toEqual({
      type: 'donut',
      x: 'a',
      y: 'b',
      aggregation: 'sum',
    })
    expect(normalizeChartSpec({ type: 'scatter', x: 'a', y: 'b', aggregation: 'sum' })).toEqual({
      type: 'scatter',
      x: 'a',
      y: 'b',
      aggregation: 'sum',
    })
    expect(normalizeChartSpec({ type: 'radar', x: 'a', y: 'b', aggregation: 'sum' })).toBeNull()
    expect(normalizeChartSpec({ type: 'bar', x: '', y: 'b', aggregation: 'sum' })).toBeNull()
    expect(
      normalizeChartSpec({ type: 'bar', x: 'a', y: 'b', aggregation: 'median' }),
    ).toBeNull()
    expect(normalizeChartSpec({ type: 'bar', x: 'a\0b', y: 'b', aggregation: 'sum' })).toBeNull()
  })

  it('normalizes cleaning operations and rejects malformed values', () => {
    expect(normalizeCleanOperation({ kind: 'drop_duplicates', column: 'ignored' })).toEqual({
      kind: 'drop_duplicates',
    })
    expect(normalizeCleanOperation({ kind: 'fill_value', column: 'amount', value: '0' })).toEqual({
      kind: 'fill_value',
      column: 'amount',
      value: '0',
    })
    expect(normalizeCleanOperation({ kind: 'drop_nulls', column: ' ' })).toBeNull()
    expect(normalizeCleanOperation({ kind: 'fill_value', column: 'x', value: 1 })).toBeNull()
    expect(normalizeCleanOperation({ kind: 'shell', column: 'x' })).toBeNull()
  })
})

describe('linear forecast', () => {
  it('fits a deterministic least-squares line and extrapolates', () => {
    const result = linearForecast(
      [
        { x: 2, y: 5 },
        { x: 0, y: 1 },
        { x: 1, y: 3 },
      ],
      2,
    )
    expect(result.ok).toBe(true)
    expect(result.slope).toBeCloseTo(2)
    expect(result.intercept).toBeCloseTo(1)
    expect(result.r2).toBeCloseTo(1)
    expect(result.points).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])
    expect(result.forecast).toEqual([
      { x: 3, y: 7, lower: 7, upper: 7 },
      { x: 4, y: 9, lower: 9, upper: 9 },
    ])
    expect(result.n).toBe(3)
    expect(result.residualStdError).toBe(0)
    expect(result.slopeCi95).toEqual([2, 2])
  })

  it('reports residual error, a slope interval and a widening prediction interval', () => {
    const result = linearForecast(
      [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 4 },
        { x: 4, y: 5 },
      ],
      2,
    )
    expect(result.ok).toBe(true)
    expect(result.n).toBe(5)
    expect(result.residualStdError).toBeGreaterThan(0)
    expect(result.slopeStdError).toBeGreaterThan(0)
    expect(result.slopeCi95?.[0]).toBeLessThan(result.slope!)
    expect(result.slopeCi95?.[1]).toBeGreaterThan(result.slope!)
    expect(result.tCritical).toBeCloseTo(3.182, 3)
    const first = result.forecast[0]!
    const second = result.forecast[1]!
    expect(first.lower).toBeLessThan(first.y)
    expect(first.upper).toBeGreaterThan(first.y)
    expect(second.upper! - second.lower!).toBeGreaterThan(first.upper! - first.lower!)
  })

  it('reports insufficient data and no X variation', () => {
    expect(linearForecast([{ x: 1, y: 1 }]).ok).toBe(false)
    expect(
      linearForecast([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]).error,
    ).toContain('no variation')
  })

  it('keeps the last point when downsampling the plot', () => {
    const result = linearForecast(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ],
      1,
      2,
    )
    expect(result.ok).toBe(true)
    expect(result.points.at(-1)).toEqual({ x: 3, y: 3 })
    expect(result.points.length).toBeLessThanOrEqual(3)
  })
})

describe('AI plan parsing', () => {
  it('extracts valid JSON, validates the chart, and caps caveats', () => {
    const plan = parseAnalyticsPlan(
      `Here is the plan:\n\`\`\`json\n${JSON.stringify({
        explanation: 'Total by region',
        sql: 'SELECT region, SUM(amount) AS total FROM data GROUP BY region',
        chart: { type: 'bar', x: 'region', y: 'total', aggregation: 'sum' },
        caveats: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
      })}\n\`\`\``,
    )
    expect(plan.sql).toContain('SELECT region')
    expect(plan.chart).toEqual({ type: 'bar', x: 'region', y: 'total', aggregation: 'sum' })
    expect(plan.caveats).toHaveLength(8)
  })

  it('drops an invalid chart and rejects plans without SQL', () => {
    const plan = parseAnalyticsPlan(
      '{"explanation":"x","sql":"SELECT 1","chart":{"type":"radar","x":"a","y":"b","aggregation":"sum"}}',
    )
    expect(plan.chart).toBeNull()
    expect(() => parseAnalyticsPlan('{"explanation":"no query"}')).toThrow('did not include SQL')
    expect(() => parseAnalyticsPlan('not json')).toThrow('machine-readable')
  })
})

describe('dataset understanding plan', () => {
  it('builds a deterministic local plan with validated roles and questions', () => {
    const plan = buildLocalPlan(planDetail())
    expect(plan).toMatchObject({
      metric: 'amount',
      dimension: 'region',
      timeColumn: 'month',
      source: 'local',
      verified: true,
    })
    expect(plan.analyses).toEqual(
      expect.arrayContaining(['quality', 'ranking', 'trend', 'distribution', 'correlation', 'forecast']),
    )
    expect(plan.columnRoles.find((entry) => entry.name === 'order_id')?.role).toBe('identifier')
    expect(plan.questions.length).toBeGreaterThanOrEqual(3)
    expect(plan.questions.join(' ')).toContain('amount')
    expect(plan.note).toContain('No model was used')
  })

  it('validates model column choices against the real schema and filters unsafe steps', () => {
    const plan = parseAiPlan(
      JSON.stringify({
        summary: 'Monthly sales by region.',
        grain: 'One row per order.',
        columnRoles: [
          { name: 'region', role: 'metric', description: 'A region name.' },
          { name: 'amount', role: 'metric', description: 'Order value.' },
          { name: 'invented', role: 'metric', description: 'Not a real column.' },
        ],
        metric: 'region',
        dimension: 'amount',
        timeColumn: 'amount',
        questions: ['Which region has the highest amount?'],
        analyses: ['ranking', 'not-a-real-analysis'],
        preparation: [
          { kind: 'fill_mean', column: 'region', reason: 'Invalid: region is text.' },
          { kind: 'drop_nulls', column: 'missing', reason: 'Invalid: no such column.' },
          { kind: 'drop_duplicates', reason: 'Exact duplicates would double-count.' },
        ],
        caveats: [],
      }),
      planDetail(),
      'test-model',
    )
    expect(plan).toMatchObject({
      metric: 'amount',
      dimension: 'region',
      timeColumn: 'month',
      source: 'ai',
      model: 'test-model',
      verified: true,
    })
    expect(plan.analyses).toEqual(['quality', 'ranking'])
    expect(plan.preparation).toEqual([
      { kind: 'drop_duplicates', reason: 'Exact duplicates would double-count.' },
    ])
    expect(plan.columnRoles.find((entry) => entry.name === 'region')?.role).toBe('dimension')
    expect(plan.columnRoles.some((entry) => entry.name === 'invented')).toBe(false)
    expect(plan.caveats.join(' ')).toContain('verify business definitions')
    expect(plan.note).toContain('validated against the imported data')
  })
})

describe('numeric grounding for AI readings', () => {
  it('accepts rounded, formatted and structural numbers present in evidence', () => {
    expect(
      ungroundedNumbers(
        ['R² 0.84 across 12 rows; total 1,234.5 and 36.1% share.'],
        'R² 0.843; 12 rows; total 1,234.5; 36.1% share.',
      ),
    ).toEqual([])
  })

  it('rejects data-scale numbers that the evidence does not contain', () => {
    expect(
      ungroundedNumbers(
        ['Revenue reached 99,999 and 87% of plan.'],
        'Revenue 1,234.5; 12 rows; 36.1% share.',
      ),
    ).toEqual(['99999', '87%'])
  })
})

describe('analytics store and profiling', () => {
  it('profiles duplicates, missing cells, semantic types and updates row counts after restore', async () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['region', 'amount', 'active'],
        ['East', '10', 'true'],
        ['East', '10', 'true'],
        ['West', '', 'false'],
      ],
      'sample.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      const detail = profileDataset(store, created.id)
      expect(detail.rowCount).toBe(3)
      expect(detail.columnCount).toBe(3)
      expect(detail.duplicateRows).toBe(1)
      expect(detail.missingCells).toBe(1)
      expect(detail.qualityScore).toBeLessThan(100)
      expect(detail.columns.map((column) => column.type)).toEqual([
        'text',
        'integer',
        'boolean',
      ])
      expect(detail.columns[1]).toMatchObject({
        name: 'amount',
        nullCount: 1,
        distinctCount: 1,
        min: 10,
        max: 10,
        mean: 10,
      })
      expect(detail.preview.rows).toHaveLength(3)

      const db = store.openDataset(created.id)
      await store.makeBackup(created.id, db)
      expect(store.getDataset(created.id)?.canUndo).toBe(true)
      db.prepare("DELETE FROM data WHERE region = 'East'").run()
      db.close()

      expect(store.undoBackup(created.id)).toBe(true)
      expect(store.undoBackup(created.id)).toBe(false)
      const restored = profileDataset(store, created.id)
      expect(restored.rowCount).toBe(3)
      expect(restored.canUndo).toBe(false)
    } finally {
      store.close()
    }
  })

  it('materializes joins with collision, null, duplicate and unmatched-key warnings', () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const left = store.createDataset(
      tableFromMatrix(
        [
          ['order_id', 'region', 'amount'],
          ['1', 'North', '10'],
          ['2', 'South', '20'],
          ['3', 'West', '30'],
          ['4', '', '40'],
        ],
        'orders.csv',
        'csv',
      ),
    )
    const right = store.createDataset(
      tableFromMatrix(
        [
          ['region', 'manager'],
          ['North', 'Ada'],
          ['North', 'Grace'],
          ['East', 'Katherine'],
          ['', 'Nobody'],
        ],
        'regions.csv',
        'csv',
      ),
    )
    try {
      const leftJoin = store.createJoinedDataset({
        leftId: left.id,
        rightId: right.id,
        leftKey: 'region',
        rightKey: 'region',
        joinType: 'left',
        name: 'Orders with regions',
      })
      expect(leftJoin.dataset).toMatchObject({
        sourceType: 'join',
        rowCount: 5,
        columnCount: 5,
      })
      expect(leftJoin.sql).toContain('LEFT JOIN')
      expect(leftJoin.warning).toContain('region → right_region')
      expect(leftJoin.warning).toContain('1 left row has a null join key')
      expect(leftJoin.warning).toContain('1 right row has a null join key')
      expect(leftJoin.warning).toContain('3 left rows had no match')
      expect(leftJoin.warning).toContain('1 right key value is duplicated')

      const db = store.openDataset(leftJoin.dataset.id)
      try {
        const columns = db.prepare('PRAGMA table_info(data)').all() as unknown as Array<{
          name: string
        }>
        expect(columns.map((column) => column.name)).toEqual([
          'order_id',
          'region',
          'amount',
          'right_region',
          'manager',
        ])
        const rows = db
          .prepare('SELECT order_id, manager FROM data ORDER BY order_id, manager')
          .all() as unknown as Array<{ order_id: number; manager: string | null }>
        expect(rows.map((row) => [row.order_id, row.manager])).toEqual([
          [1, 'Ada'],
          [1, 'Grace'],
          [2, null],
          [3, null],
          [4, null],
        ])
      } finally {
        db.close()
      }

      const inner = store.createJoinedDataset({
        leftId: left.id,
        rightId: right.id,
        leftKey: 'region',
        rightKey: 'region',
        joinType: 'inner',
        name: 'Orders inner regions',
      })
      expect(inner.dataset.rowCount).toBe(2)
      expect(inner.warning).toContain('excluded by the inner join')

      const empty = store.createJoinedDataset({
        leftId: left.id,
        rightId: right.id,
        leftKey: 'region',
        rightKey: 'manager',
        joinType: 'inner',
        name: 'Orders with managers',
      })
      expect(empty.dataset.rowCount).toBe(0)
      expect(empty.warning).toContain('matched no rows')

      expect(() =>
        store.createJoinedDataset({
          leftId: left.id,
          rightId: right.id,
          leftKey: 'missing',
          rightKey: 'region',
          joinType: 'left',
          name: 'Invalid',
        }),
      ).toThrow('no column named')
      expect(() =>
        store.createJoinedDataset({
          leftId: left.id,
          rightId: left.id,
          leftKey: 'region',
          rightKey: 'region',
          joinType: 'left',
          name: 'Same',
        }),
      ).toThrow('different datasets')

      // Source row counts and columns are unchanged by every join above.
      expect(store.getDataset(left.id)).toMatchObject({ rowCount: 4, columnCount: 3 })
      expect(store.getDataset(right.id)).toMatchObject({ rowCount: 4, columnCount: 2 })
    } finally {
      store.close()
    }
  })

  it('appends and unions same-schema datasets by column name without changing sources', () => {
    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const left = store.createDataset(
      tableFromMatrix(
        [
          ['region', 'amount'],
          ['East', '10'],
          ['West', '20'],
          ['East', '10'],
        ],
        'sales-2024.csv',
        'csv',
      ),
    )
    // Same columns in a different order, plus a REAL amount, to prove the
    // append aligns by name and reports the type difference.
    const right = store.createDataset(
      tableFromMatrix(
        [
          ['amount', 'region'],
          ['30.5', 'North'],
          ['10', 'East'],
        ],
        'sales-2025.csv',
        'csv',
      ),
    )
    const incompatible = store.createDataset(
      tableFromMatrix(
        [
          ['region', 'manager'],
          ['East', 'Ada'],
        ],
        'regions.csv',
        'csv',
      ),
    )
    try {
      const appended = store.createAppendedDataset({
        leftId: left.id,
        rightId: right.id,
        mode: 'all',
        name: 'Sales 2024-2025',
      })
      expect(appended.dataset).toMatchObject({
        name: 'Sales 2024-2025',
        sourceType: 'union',
        rowCount: 5,
        columnCount: 2,
      })
      expect(appended.dataset.sourceName).toContain('Append: sales-2024 + sales-2025')
      expect(appended.sql).toContain('UNION ALL')
      expect(appended.warning).toContain('different declared types')
      expect(appended.warning).toContain('amount')

      const db = store.openDataset(appended.dataset.id)
      try {
        const columns = db.prepare('PRAGMA table_info(data)').all() as unknown as Array<{
          name: string
        }>
        expect(columns.map((column) => column.name)).toEqual(['region', 'amount'])
        const rows = db
          .prepare('SELECT region, amount FROM data ORDER BY region, amount')
          .all() as unknown as Array<{ region: string; amount: number }>
        expect(rows.map((row) => [row.region, row.amount])).toEqual([
          ['East', 10],
          ['East', 10],
          ['East', 10],
          ['North', 30.5],
          ['West', 20],
        ])
      } finally {
        db.close()
      }

      const distinct = store.createAppendedDataset({
        leftId: left.id,
        rightId: right.id,
        mode: 'distinct',
        name: 'Distinct sales',
      })
      expect(distinct.dataset.rowCount).toBe(3)
      expect(distinct.sql).toContain('UNION')
      expect(distinct.sql).not.toContain('UNION ALL')
      expect(distinct.warning).toContain('removed 2 exact duplicate rows')

      expect(() =>
        store.createAppendedDataset({
          leftId: left.id,
          rightId: incompatible.id,
          mode: 'all',
          name: 'Invalid append',
        }),
      ).toThrow('same column names')
      expect(() =>
        store.createAppendedDataset({
          leftId: left.id,
          rightId: left.id,
          mode: 'all',
          name: 'Same append',
        }),
      ).toThrow('different datasets')

      // Every source keeps its exact row and column counts.
      expect(store.getDataset(left.id)).toMatchObject({ rowCount: 3, columnCount: 2 })
      expect(store.getDataset(right.id)).toMatchObject({ rowCount: 2, columnCount: 2 })
      expect(store.getDataset(incompatible.id)).toMatchObject({ rowCount: 1, columnCount: 2 })
    } finally {
      store.close()
    }
  })

  it('persists datasets, views and audit events, then removes local files', async () => {

    const directory = temporaryDirectory()
    const store = new AnalyticsStore(join(directory, 'analytics'))
    const table = tableFromMatrix(
      [
        ['x', 'y'],
        ['1', '2'],
      ],
      'tiny.csv',
      'csv',
    )
    const created = store.createDataset(table)
    try {
      profileDataset(store, created.id)
      const view = store.saveView({
        datasetId: created.id,
        name: 'Tiny view',
        sql: 'SELECT * FROM data',
        chart: { type: 'line', x: 'x', y: 'y', aggregation: 'sum' },
        insightKind: 'trend',
        filterColumn: 'x',
        takeaway: 'Y rose from the first to the last row',
        meaning: 'The saved reading survives a restart.',
        method: 'Saved SQL line chart',
        detail: '2 rows returned.',
        confidence: 'medium',
      })
      expect(store.listViews(created.id)).toHaveLength(1)
      expect(store.listViews(created.id)[0]).toMatchObject({
        insightKind: 'trend',
        filterColumn: 'x',
        takeaway: 'Y rose from the first to the last row',
        meaning: 'The saved reading survives a restart.',
        method: 'Saved SQL line chart',
        detail: '2 rows returned.',
        confidence: 'medium',
      })
      store.recordAudit('view-created', { viewId: view.id })
      expect(store.listAudit()).toEqual([
        expect.objectContaining({ action: 'view-created', detail: JSON.stringify({ viewId: view.id }) }),
      ])
      expect(store.deleteView(view.id)).toBe(true)
      expect(store.listViews(created.id)).toHaveLength(0)
      expect(store.deleteDataset(created.id)).toBe(true)
      expect(store.listDatasets()).toHaveLength(0)
      expect(store.getDataset(created.id)).toBeNull()
    } finally {
      store.close()
    }
  })
})

describe('source redaction', () => {
  it('masks passwords and secret query parameters in database connections', () => {
    const redacted = redactConnection(
      'postgresql://alice:s3cret@db.example.com:5432/sales?password=query-secret&sslmode=require&token=abc#frag',
    )
    expect(redacted).not.toContain('s3cret')
    expect(redacted).not.toContain('query-secret')
    expect(redacted).not.toContain('token=abc')
    expect(redacted).not.toContain('#frag')
    expect(redacted).toContain('al***:***@db.example.com')
    expect(redacted).toContain('sslmode=require')
    expect(redacted).toContain('password=***')
    expect(redacted).toContain('token=***')
  })

  it('strips query strings and fragments from display URLs', () => {
    expect(redactUrl('https://example.com/report.csv?token=secret#section')).toBe(
      'https://example.com/report.csv',
    )
    expect(redactUrl('not a url')).toBe('link')
  })
})

describe('safe Python aggregation', () => {
  it.skipIf(!hasPython)('runs only the fixed script and aggregates the two selected columns', async () => {
    const request: AnalyticsPythonRequest = {
      datasetId: '00000000-0000-4000-8000-000000000000',
      groupBy: 'region',
      metric: 'amount',
      aggregation: 'avg',
      limit: 10,
    }
    let executedSql = ''
    const query: AnalyticsQueryResult = {
      columns: ['group', 'metric'],
      rows: [
        ['A', 1],
        ['A', 3],
        ['B', 2],
      ],
      rowCount: 3,
      truncated: false,
      elapsedMs: 1,
    }
    const result = await runPythonAggregation(request, {
      columns: [
        { name: 'region', type: 'text' },
        { name: 'amount', type: 'integer' },
      ],
      runQuery: (sql) => {
        executedSql = sql
        return query
      },
    })
    expect(executedSql).toContain('SELECT "region" AS "group", "amount" FROM data')
    expect(result.ok).toBe(true)
    expect(result.result?.rows).toEqual([
      ['A', 2],
      ['B', 2],
    ])
    expect(result.code).toContain('csv.DictReader')
  })

  it('rejects a non-numeric metric without launching Python', async () => {
    const result = await runPythonAggregation(
      {
        datasetId: '00000000-0000-4000-8000-000000000000',
        groupBy: 'region',
        metric: 'note',
        aggregation: 'sum',
      },
      {
        columns: [
          { name: 'region', type: 'text' },
          { name: 'note', type: 'text' },
        ],
        runQuery: () => {
          throw new Error('must not be called')
        },
      },
    )
    expect(result).toMatchObject({ ok: false, error: 'The metric column must be numeric.' })
  })
})
