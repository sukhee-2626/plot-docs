import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AnalyticsAppendRequest,
  AnalyticsAutoAnalysis,
  AnalyticsDataset,
  AnalyticsDatasetDetail,
  AnalyticsJoinRequest,
} from '../src/shared/analytics-api'

const aiState = vi.hoisted(() => ({ chat: vi.fn() }))

vi.mock('@plotdocs/ai-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@plotdocs/ai-provider')>()
  return { ...actual, chatForProvider: aiState.chat }
})

vi.mock('@plotdocs/ai-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@plotdocs/ai-search')>()
  return { ...actual, soopusApiKey: () => '' }
})

import {
  analyticsAssistantStatus,
  runAnalyticsAssistant,
  type AssistantDeps,
} from '../src/main/analytics/assistant'

const temporaryDirectories: string[] = []

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'plotdocs-assistant-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true })
  }
})

beforeEach(() => {
  aiState.chat.mockReset()
})

const dataset: AnalyticsDataset = {
  id: 'ds_sales',
  name: 'Sales',
  sourceName: 'sales.csv',
  sourceType: 'csv',
  rowCount: 12,
  columnCount: 2,
  qualityScore: 96,
  duplicateRows: 0,
  missingCells: 0,
  createdAt: 1,
  updatedAt: 1,
  canUndo: false,
}

const detail: AnalyticsDatasetDetail = {
  ...dataset,
  columns: [
    {
      name: 'region',
      type: 'text',
      nullCount: 0,
      distinctCount: 3,
      min: null,
      max: null,
      mean: null,
      topValues: [],
    },
    {
      name: 'amount',
      type: 'integer',
      nullCount: 0,
      distinctCount: 12,
      min: 10,
      max: 120,
      mean: 65,
      topValues: [],
    },
  ],
  preview: { columns: ['region', 'amount'], rows: [['East', 10]], truncated: false },
}

function analysis(datasetId = dataset.id): AnalyticsAutoAnalysis {
  return {
    ok: true,
    datasetId,
    summary: {
      rowCount: 12,
      columnCount: 2,
      qualityScore: 96,
      missingCells: 0,
      duplicateRows: 0,
      primaryMetric: 'amount',
      primaryDimension: 'region',
      timeColumn: null,
    },
    insights: [
      {
        id: 'quality',
        kind: 'quality',
        title: 'Data quality',
        detail: '12 rows × 2 columns · quality 96/100.',
        confidence: 'high',
      },
    ],
    views: [],
    prepared: [],
    methods: ['SQLite GROUP BY aggregation'],
    elapsedMs: 2,
  }
}

function configuredSettingsPath(): string {
  const directory = temporaryDirectory()
  const settingsPath = join(directory, 'ai-settings.json')
  writeFileSync(
    settingsPath,
    JSON.stringify({
      provider: 'custom',
      providers: {
        custom: {
          apiKey: 'test-key',
          model: 'test-model',
          baseUrl: 'http://127.0.0.1:1/v1',
        },
      },
    }),
    'utf8',
  )
  return settingsPath
}

function fakeDeps(overrides: Partial<AssistantDeps> = {}): AssistantDeps {
  const deps: AssistantDeps = {
    settingsPath: join(temporaryDirectory(), 'missing-ai-settings.json'),
    listDatasets: () => [dataset],
    getDataset: () => detail,
    importUrl: async () => dataset,
    inspectUrl: async (url) => ({
      url,
      host: 'example.com',
      pageTitle: 'Example page',
      contentType: 'text/html',
      tables: [],
      dataLinks: [],
      textPreview: '',
      note: 'No usable table was found.',
    }),
    importFile: async () => dataset,
    listDatabaseTables: async () => [],
    importDatabaseTable: async () => dataset,
    clean: async () => ({ ok: true }),
    runQuery: () => ({ columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 0 }),
    joinDatasets: async () => ({
      ok: true,
      dataset: { ...dataset, id: 'ds_joined', name: 'Sales + Regions', sourceType: 'join' },
      sql: 'SELECT * FROM data AS l LEFT JOIN right.data AS r ON l.region = r.region',
      elapsedMs: 1,
    }),
    appendDatasets: async () => ({
      ok: true,
      dataset: { ...dataset, id: 'ds_appended', name: 'Sales + More sales', sourceType: 'union' },
      sql: 'SELECT * FROM data AS l UNION ALL SELECT * FROM right.data AS r',
      elapsedMs: 1,
    }),
    saveView: (input) => ({
      id: input.id ?? 'view_1',
      datasetId: input.datasetId,
      name: input.name,
      sql: input.sql,
      chart: input.chart,
      ...(input.filterColumn ? { filterColumn: input.filterColumn } : {}),
      ...(input.takeaway ? { takeaway: input.takeaway } : {}),
      createdAt: 1,
      updatedAt: 1,
    }),
    listViews: () => [],
    forecast: () => ({ ok: false }),
    autoAnalyze: async (id) => analysis(id),
    audit: () => {},
    emit: () => {},
    ...overrides,
  }
  return deps
}

describe('Plot AI local automation fallback', () => {
  it('reports local automation as available even without a model', () => {
    const status = analyticsAssistantStatus(join(temporaryDirectory(), 'missing.json'))
    expect(status.configured).toBe(false)
    expect(status.localAutomation).toBe(true)
    expect(status.harness).toBe('analytics-agent-v5')
    expect(status.tools).toBe(25)
    expect(status.trainingExamples).toBe(9)
  })

  it('runs the deterministic pipeline in auto mode without calling a model', async () => {
    const deps = fakeDeps()
    const reply = await runAnalyticsAssistant(
      {
        text: 'Do everything with this dataset.',
        activeDatasetId: dataset.id,
        mode: 'auto',
      },
      deps,
    )
    expect(reply.ok).toBe(true)
    expect(reply.model).toBe('Local automation')
    expect(reply.text).toContain('complete local automation pipeline')
    expect(reply.actions.map((action) => action.tool)).toEqual(['auto_analyze'])
    expect(reply.actions[0]).toMatchObject({
      status: 'ok',
      datasetId: dataset.id,
    })
    expect(aiState.chat).not.toHaveBeenCalled()
  })

  it('imports an attached URL and then analyses the new dataset', async () => {
    const imported = { ...dataset, id: 'ds_web', name: 'Web sales' }
    const datasets = [dataset]
    let importedUrl = ''
    const deps = fakeDeps({
      listDatasets: () => datasets,
      importUrl: async (url) => {
        importedUrl = url
        datasets.push(imported)
        return imported
      },
      autoAnalyze: async (id) => analysis(id),
    })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Import this and build the dashboard.',
        mode: 'auto',
        sources: [
          {
            id: 'src_1',
            kind: 'url',
            label: 'Sales table',
            url: 'https://example.com/sales.csv',
          },
        ],
      },
      deps,
    )
    expect(importedUrl).toBe('https://example.com/sales.csv')
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['import_url', 'auto_analyze'])
    expect(reply.actions[1]?.datasetId).toBe('ds_web')
    expect(reply.text).toContain('I imported')
  })

  it('inspects a web page, lets the model choose a table, and imports that table', async () => {
    const webDataset = { ...dataset, id: 'ds_web_table', name: 'City population' }
    const datasets = [dataset]
    let inspectedUrl = ''
    let importedIndex: number | undefined
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will inspect the page and identify the city population table.',
          tool: { name: 'inspect_url', args: { sourceId: 'src_web' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Table 2 has the city population headers, so I will import it.',
          tool: { name: 'import_url', args: { sourceId: 'src_web', tableIndex: 1 } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'The city population table is imported and ready to analyse.',
          tool: null,
        }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      listDatasets: () => datasets,
      inspectUrl: async (url) => {
        inspectedUrl = url
        return {
          url,
          host: 'example.com',
          pageTitle: 'World cities',
          contentType: 'text/html',
          tables: [
            {
              index: 0,
              caption: 'Country GDP',
              headers: ['country', 'gdp'],
              rowCount: 2,
              columnCount: 2,
              score: 10,
              sampleRows: [['A', '100'], ['B', '200']],
            },
            {
              index: 1,
              caption: 'City population',
              headers: ['city', 'population'],
              rowCount: 2,
              columnCount: 2,
              score: 12,
              sampleRows: [['Tokyo', '37000000'], ['Delhi', '32000000']],
            },
          ],
          dataLinks: [],
          textPreview: 'World cities and population data.',
          note: '2 usable tables found. Choose one with tableIndex.',
        }
      },
      importUrl: async (_url, tableIndex) => {
        importedIndex = tableIndex
        datasets.push(webDataset)
        return webDataset
      },
    })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Use the city population table from this page.',
        sources: [
          {
            id: 'src_web',
            kind: 'url',
            label: 'World cities',
            url: 'https://example.com/cities',
          },
        ],
      },
      deps,
    )
    expect(inspectedUrl).toBe('https://example.com/cities')
    expect(importedIndex).toBe(1)
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['inspect_url', 'import_url'])
    expect(reply.actions[0]?.summary).toContain('2 usable tables')
    expect(reply.actions[1]?.datasetId).toBe('ds_web_table')
    expect(reply.text).toContain('city population')
  })

  it('ships input/output training examples and repairs one malformed plan', async () => {
    aiState.chat
      .mockResolvedValueOnce({ ok: true, content: 'not a json plan' })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The dataset is ready.', tool: null }),
      })
    const deps = fakeDeps({ settingsPath: configuredSettingsPath() })
    const reply = await runAnalyticsAssistant(
      { text: 'Say what is ready.', activeDatasetId: dataset.id },
      deps,
    )
    expect(aiState.chat).toHaveBeenCalledTimes(2)
    const systemPrompt = aiState.chat.mock.calls[0]?.[2]
    expect(typeof systemPrompt).toBe('string')
    expect(systemPrompt).toContain('Training examples')
    expect(systemPrompt).toContain('inspect_url')
    expect(systemPrompt).toContain('tableIndex')
    expect(systemPrompt).toContain('Never repeat the same failing call')
    expect(systemPrompt).toContain('bounded tool observations')
    expect(systemPrompt).not.toContain('never receive')
    expect(reply.ok).toBe(true)
    expect(reply.text).toContain('ready')
  })

  it('accepts OpenAI-style tool_calls and stringified arguments', async () => {
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will list the local datasets.',
          tool_calls: [
            {
              function: {
                name: 'list_datasets',
                arguments: '{}',
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'One local dataset is available.', tool: null }),
      })
    const deps = fakeDeps({ settingsPath: configuredSettingsPath() })
    const reply = await runAnalyticsAssistant(
      { text: 'What datasets are available?', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['list_datasets'])
  })


  it('falls back to the local engine when a configured model call fails', async () => {
    const directory = temporaryDirectory()
    const settingsPath = join(directory, 'ai-settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        provider: 'custom',
        providers: {
          custom: {
            apiKey: 'test-key',
            model: 'test-model',
            baseUrl: 'http://127.0.0.1:1/v1',
          },
        },
      }),
      'utf8',
    )
    aiState.chat.mockResolvedValue({ ok: false, error: 'Codex CLI is not installed.' })
    const deps = fakeDeps({ settingsPath })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Analyse this dataset.',
        activeDatasetId: dataset.id,
      },
      deps,
    )
    expect(aiState.chat).toHaveBeenCalledTimes(1)
    expect(reply.ok).toBe(true)
    expect(reply.model).toBe('Local automation (AI unavailable)')
    expect(reply.text).toContain('Codex CLI is not installed.')
    expect(reply.actions.map((action) => action.tool)).toEqual(['auto_analyze'])
  })

  it('uses the local engine when no provider is configured', async () => {
    const deps = fakeDeps()
    const reply = await runAnalyticsAssistant(
      {
        text: 'Analyse this dataset.',
        activeDatasetId: dataset.id,
      },
      deps,
    )
    expect(aiState.chat).not.toHaveBeenCalled()
    expect(reply.ok).toBe(true)
    expect(reply.model).toBe('Local automation (AI unavailable)')
    expect(reply.text).toContain('The model path was not available.')
  })

  it('returns a clear message when automation has no data', async () => {
    const deps = fakeDeps({ listDatasets: () => [] })
    const reply = await runAnalyticsAssistant({ text: 'Do everything.', mode: 'auto' }, deps)
    expect(reply.ok).toBe(false)
    expect(reply.error).toContain('No dataset or source')
  })

  it('ranks groups with a windowed total and returns exact SQL evidence', async () => {
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Ranking the regions.',
          tool: {
            name: 'rank_groups',
            args: { dimension: 'region', metric: 'amount', aggregation: 'sum', limit: 2 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'East leads the ranked regions.', tool: null }),
      })
    let executedSql = ''
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      runQuery: (_id, sql) => {
        executedSql = sql
        return {
          columns: ['group', 'value', 'total', 'rank', 'groups'],
          rows: [
            ['East', 30, 100, 1, 3],
            ['West', 20, 100, 2, 3],
          ],
          rowCount: 2,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Sort the regions by amount.', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    expect(reply.model).toBe('test-model')
    expect(reply.actions).toHaveLength(1)
    const action = reply.actions[0]!
    expect(action).toMatchObject({
      tool: 'rank_groups',
      status: 'ok',
      datasetId: dataset.id,
      chart: { type: 'bar', x: 'group', y: 'value' },
    })
    expect(action.summary).toContain('East ranks #1 of 3 region groups')
    expect(action.summary).toContain('30.0% of the total across all groups')
    expect(action.sql).toContain('RANK() OVER')
    expect(action.sql).toContain('COUNT(*) OVER')
    expect(executedSql).toContain('SUM("value") OVER ()')
    expect(action.result?.columns).toEqual(['group', 'value', 'total', 'rank', 'groups'])
    expect(action.result?.rows[0]).toEqual(['East', 30, 100, 1, 3])
    expect(reply.text).toContain('East')
  })

  it('predicts a date trend with slope and prediction-interval evidence', async () => {
    const trendDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: [
        ...detail.columns,
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
      ],
      preview: {
        columns: ['region', 'amount', 'month'],
        rows: [['East', 10, '2024-01-01']],
        truncated: false,
      },
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Fitting the monthly trend.',
          tool: {
            name: 'predict_trend',
            args: { metric: 'amount', timeColumn: 'month', horizon: 6 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The monthly trend is upward.', tool: null }),
      })
    let executedSql = ''
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      getDataset: () => trendDetail,
      runQuery: (_id, sql) => {
        executedSql = sql
        const rows = Array.from({ length: 12 }, (_, index) => [
          index,
          10 + index * 2 + (index % 2 === 0 ? 1 : -1),
        ])
        return {
          columns: ['x', 'y'],
          rows,
          rowCount: rows.length,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Predict the next six months.', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('predict_trend')
    expect(action.summary).toContain('slope')
    expect(action.summary).toContain('prediction interval')
    expect(action.chart).toMatchObject({ type: 'line', x: 'x', y: 'y' })
    expect(executedSql).toContain('ROW_NUMBER() OVER')
    expect(action.result?.rowCount).toBe(12)
    expect(action.summary).toContain('Approximate 95% prediction interval')
    expect(action.summary).toContain('Approximate 95% slope interval')
    expect(reply.text).toContain('upward')
  })

  it('selects Spearman for a monotonic relationship and returns a scatter plot', async () => {
    const numericDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: [
        ...detail.columns,
        {
          name: 'units',
          type: 'integer',
          nullCount: 0,
          distinctCount: 8,
          min: 1,
          max: 100,
          mean: 20,
          topValues: [],
        },
      ],
      preview: {
        columns: ['region', 'amount', 'units'],
        rows: [['East', 10, 1]],
        truncated: false,
      },
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Testing the relationship.',
          tool: { name: 'correlate', args: { x: 'amount', y: 'units' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The relationship is monotonic.', tool: null }),
      })
    const rows = [1, 2, 3, 4, 5, 6, 7, 100].map((value, index) => [index + 1, value])
    let executedSql = ''
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      getDataset: () => numericDetail,
      runQuery: (_id, sql) => {
        executedSql = sql
        return {
          columns: ['x', 'y'],
          rows,
          rowCount: rows.length,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Does amount move with units?', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('correlate')
    expect(action.status).toBe('ok')
    expect(action.summary).toContain('Spearman')
    expect(action.summary).toContain('Correlation is not causation')
    expect(action.chart).toMatchObject({ type: 'scatter', x: 'x', y: 'y' })
    expect(executedSql).toContain('CAST("amount" AS REAL)')
    expect(action.result?.rowCount).toBe(8)
    expect(reply.text).toContain('monotonic')
  })

  it('finds IQR outliers and returns the exact unusual rows', async () => {
    let calls = 0
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      runQuery: (_id, sql) => {
        calls += 1
        if (sql.includes('__row_id')) {
          return {
            columns: ['__row_id', 'region', 'amount'],
            rows: [[9, 'East', 100]],
            rowCount: 1,
            truncated: false,
            elapsedMs: 1,
          }
        }
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 100]
        return {
          columns: ['value'],
          rows: values.map((value) => [value]),
          rowCount: values.length,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Checking for unusual values.',
          tool: { name: 'find_anomalies', args: { metric: 'amount', limit: 5 } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'One high value is unusual.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Find anomalies in amount.', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('find_anomalies')
    expect(action.summary).toContain('1 of 9')
    expect(action.summary).toContain('11.1%')
    expect(action.summary).toContain('high')
    expect(action.detail).toContain('1.5×IQR')
    expect(action.result?.rows[0]).toEqual([9, 'East', 100])
    expect(action.sql).toContain('__row_id')
    expect(calls).toBe(2)
    expect(reply.text).toContain('high value')
  })

  it('imports a local file path supplied by the user', async () => {
    const imported = { ...dataset, id: 'ds_file', name: 'Sukhee' }
    let importedPath = ''
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Importing the local file.',
          tool: { name: 'import_file', args: { path: 'C:\\data\\sukhee.csv' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The file is ready to analyse.', tool: null }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      listDatasets: () => [dataset, imported],
      importFile: async (path) => {
        importedPath = path
        return imported
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Add C:\\data\\sukhee.csv and inspect it.', activeDatasetId: dataset.id },
      deps,
    )
    expect(importedPath).toBe('C:\\data\\sukhee.csv')
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['import_file'])
    expect(reply.actions[0]).toMatchObject({ status: 'ok', datasetId: 'ds_file' })
    expect(reply.actions[0]?.summary).toContain('Sukhee')
  })

  it('refuses to import a path that the user did not supply', async () => {
    let called = false
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will import the payroll file.',
          tool: { name: 'import_file', args: { path: 'C:\\secret\\payroll.csv' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The import was blocked.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Import the payroll file.', activeDatasetId: dataset.id },
      fakeDeps({
        settingsPath: configuredSettingsPath(),
        importFile: async () => {
          called = true
          return dataset
        },
      }),
    )
    expect(called).toBe(false)
    expect(reply.actions[0]).toMatchObject({ status: 'error' })
    expect(reply.actions[0]?.error).toContain('appears in the user')
  })

  it('redacts obvious identifiers from describe_dataset observations', async () => {
    const sensitiveDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: [
        ...detail.columns,
        {
          name: 'email',
          type: 'text',
          nullCount: 0,
          distinctCount: 2,
          min: null,
          max: null,
          mean: null,
          topValues: [{ value: 'alice@example.com', count: 2 }],
        },
      ],
      preview: {
        columns: ['region', 'amount', 'email'],
        rows: [['East', 10, 'alice@example.com']],
        truncated: false,
      },
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will inspect the schema.',
          tool: { name: 'describe_dataset', args: {} },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The schema is visible.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Describe this dataset.', activeDatasetId: dataset.id },
      fakeDeps({ settingsPath: configuredSettingsPath(), getDataset: () => sensitiveDetail }),
    )
    expect(reply.ok).toBe(true)
    const observationPrompt = aiState.chat.mock.calls[1]?.[3]
    expect(typeof observationPrompt).toBe('string')
    expect(observationPrompt).not.toContain('alice@example.com')
    expect(observationPrompt).toContain('[redacted]')
    expect(observationPrompt).toContain('"email"')
  })

  it('does not send top values through categorize_columns', async () => {
    const topValueDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: detail.columns.map((column) =>
        column.name === 'region'
          ? { ...column, topValues: [{ value: 'Secret Region', count: 4 }] }
          : column,
      ),
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will categorize the columns.',
          tool: { name: 'categorize_columns', args: {} },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The columns are categorized.', tool: null }),
      })
    await runAnalyticsAssistant(
      { text: 'Categorize this data.', activeDatasetId: dataset.id },
      fakeDeps({ settingsPath: configuredSettingsPath(), getDataset: () => topValueDetail }),
    )
    const observationPrompt = aiState.chat.mock.calls[1]?.[3]
    expect(typeof observationPrompt).toBe('string')
    expect(observationPrompt).not.toContain('Secret Region')
  })

  it('strips signed query strings from inspect_url observations', async () => {
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will inspect the page.',
          tool: { name: 'inspect_url', args: { sourceId: 'src_web' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The page was inspected.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Inspect this page.',
        sources: [
          {
            id: 'src_web',
            kind: 'url',
            label: 'Page',
            url: 'https://example.com/data',
          },
        ],
      },
      fakeDeps({
        settingsPath: configuredSettingsPath(),
        inspectUrl: async (url) => ({
          url: `${url}?token=secret`,
          host: 'example.com',
          pageTitle: 'Page',
          contentType: 'text/html',
          tables: [
            {
              index: 0,
              caption: 'Contacts',
              headers: ['email', 'amount'],
              rowCount: 1,
              columnCount: 2,
              score: 10,
              sampleRows: [['bob@example.com', '10']],
            },
          ],
          dataLinks: [],
          textPreview: 'Contact bob@example.com for the report.',
          note: 'One usable table was found.',
        }),
      }),
    )
    expect(reply.ok).toBe(true)
    const observationPrompt = aiState.chat.mock.calls[1]?.[3]
    expect(typeof observationPrompt).toBe('string')
    expect(observationPrompt).not.toContain('token=secret')
    expect(observationPrompt).not.toContain('bob@example.com')
    expect(observationPrompt).toContain('[redacted')
    expect(observationPrompt).toContain('https://example.com/data')
  })

  it('keeps a signed direct data link local while letting the model choose it', async () => {
    let importedUrl = ''
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will inspect the page.',
          tool: { name: 'inspect_url', args: { sourceId: 'src_web' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'I will import the CSV link.',
          tool: { name: 'import_url', args: { url: 'https://example.com/download.csv' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The CSV is imported.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Inspect this page and import its CSV link.',
        sources: [
          {
            id: 'src_web',
            kind: 'url',
            label: 'Page',
            url: 'https://example.com/page',
          },
        ],
      },
      fakeDeps({
        settingsPath: configuredSettingsPath(),
        inspectUrl: async () => ({
          url: 'https://example.com/page?token=page-secret',
          host: 'example.com',
          pageTitle: 'Page',
          contentType: 'text/html',
          tables: [],
          dataLinks: ['https://example.com/download.csv?token=download-secret'],
          textPreview: '',
          note: 'One direct data link found.',
        }),
        importUrl: async (url) => {
          importedUrl = url
          return { ...dataset, id: 'ds_csv', name: 'Downloaded CSV' }
        },
      }),
    )
    expect(reply.ok).toBe(true)
    expect(importedUrl).toBe('https://example.com/download.csv?token=download-secret')
    for (const call of aiState.chat.mock.calls) {
      expect(String(call[3] ?? '')).not.toContain('download-secret')
      expect(String(call[3] ?? '')).not.toContain('page-secret')
    }
  })

  it('materializes a join through the local tool and keeps its SQL as evidence', async () => {
    let captured: AnalyticsJoinRequest | null = null
    const joined: AnalyticsDataset = {
      ...dataset,
      id: 'ds_joined',
      name: 'Sales with regions',
      sourceType: 'join',
      rowCount: 12,
      columnCount: 3,
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Joining the sales and regions datasets.',
          tool: {
            name: 'join_datasets',
            args: {
              rightDatasetId: 'ds_regions',
              leftKey: 'region',
              rightKey: 'region',
              joinType: 'left',
              name: 'Sales with regions',
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The joined dataset is ready.', tool: null }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      joinDatasets: async (input) => {
        captured = input
        return {
          ok: true,
          dataset: joined,
          sql: 'SELECT l."region", l."amount", r."manager" FROM data AS l LEFT JOIN right.data AS r ON l."region" = r."region"',
          warning: '1 right row has a null join key and cannot match.',
          elapsedMs: 3,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Join sales to regions and keep every sale.', activeDatasetId: dataset.id },
      deps,
    )
    expect(captured).toEqual({
      leftDatasetId: dataset.id,
      rightDatasetId: 'ds_regions',
      leftKey: 'region',
      rightKey: 'region',
      joinType: 'left',
      name: 'Sales with regions',
    })
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['join_datasets'])
    const action = reply.actions[0]!
    expect(action.status).toBe('ok')
    expect(action.datasetId).toBe('ds_joined')
    expect(action.summary).toContain('12 rows')
    expect(action.detail).toContain('null join key')
    expect(action.sql).toContain('LEFT JOIN')
  })

  it('appends two same-schema datasets and keeps the union SQL as evidence', async () => {
    let captured: AnalyticsAppendRequest | null = null
    const appended: AnalyticsDataset = {
      ...dataset,
      id: 'ds_appended',
      name: 'Sales 2024-2025',
      sourceType: 'union',
      rowCount: 24,
      columnCount: 2,
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Stacking the two sales datasets.',
          tool: {
            name: 'append_datasets',
            args: {
              rightDatasetId: 'ds_sales_2025',
              mode: 'all',
              name: 'Sales 2024-2025',
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The appended dataset is ready.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Stack the two sales datasets.', activeDatasetId: dataset.id },
      fakeDeps({
        settingsPath: configuredSettingsPath(),
        listDatasets: () => [
          dataset,
          { ...dataset, id: 'ds_sales_2025', name: 'Sales 2025' },
        ],
        appendDatasets: async (input) => {
          captured = input
          return {
            ok: true,
            dataset: appended,
            mode: 'all',
            sql: 'SELECT l."region", l."amount" FROM data AS l UNION ALL SELECT r."region", r."amount" FROM right.data AS r',
            warning: 'UNION removed no exact duplicate rows across both datasets.',
            elapsedMs: 3,
          }
        },
      }),
    )
    expect(captured).toEqual({
      leftDatasetId: dataset.id,
      rightDatasetId: 'ds_sales_2025',
      mode: 'all',
      name: 'Sales 2024-2025',
    })
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['append_datasets'])
    const action = reply.actions[0]!
    expect(action.status).toBe('ok')
    expect(action.datasetId).toBe('ds_appended')
    expect(action.summary).toContain('Sales')
    expect(action.summary).toContain('Sales 2025')
    expect(action.summary).toContain('24 rows')
    expect(action.summary).toContain('all rows kept')
    expect(action.sql).toContain('UNION ALL')
  })

  it('rejects a join without both key columns before calling the backend', async () => {
    let called = false
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Joining without a right key.',
          tool: {
            name: 'join_datasets',
            args: { rightDatasetId: 'ds_regions', leftKey: 'region', rightKey: '' },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The join needs two key columns.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Join these datasets.', activeDatasetId: dataset.id },
      fakeDeps({
        settingsPath: configuredSettingsPath(),
        joinDatasets: async () => {
          called = true
          return { ok: false, error: 'should not run' }
        },
      }),
    )
    expect(called).toBe(false)
    expect(reply.ok).toBe(true)
    expect(reply.actions[0]?.status).toBe('error')
    expect(reply.actions[0]?.error).toContain('join key')
  })

  it('categorizes columns into measures, dimensions and time axes', async () => {
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Categorizing the schema.',
          tool: { name: 'categorize_columns', args: {} },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The schema is categorized.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Categorize this data.', activeDatasetId: dataset.id },
      fakeDeps({ settingsPath: configuredSettingsPath() }),
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('categorize_columns')
    expect(action.summary).toContain('2 columns categorized')
    expect(action.detail).toContain('Measures: amount')
    expect(action.detail).toContain('Dimensions: region')
  })

  it('builds a two-dimensional pivot with exact SQL', async () => {
    const pivotDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: [
        ...detail.columns,
        {
          name: 'channel',
          type: 'text',
          nullCount: 0,
          distinctCount: 2,
          min: null,
          max: null,
          mean: null,
          topValues: [],
        },
      ],
    }
    let executedSql = ''
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Building the cross-tab.',
          tool: {
            name: 'pivot_table',
            args: {
              rows: 'region',
              columns: 'channel',
              metric: 'amount',
              aggregation: 'sum',
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The pivot is ready.', tool: null }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      getDataset: () => pivotDetail,
      runQuery: (_id, sql) => {
        executedSql = sql
        return {
          columns: ['row', 'column', 'value'],
          rows: [
            ['East', 'Online', 30],
            ['East', 'Retail', 20],
            ['West', 'Online', 10],
          ],
          rowCount: 3,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Pivot region by channel.', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('pivot_table')
    expect(action.summary).toContain('2 region rows')
    expect(action.sql).toContain('GROUP BY 1, 2')
    expect(executedSql).toContain('SUM("amount")')
    expect(action.result?.columns).toEqual(['row', 'column', 'value'])
  })

  it('runs an ordered funnel and a monthly cohort with exact SQL', async () => {
    const eventDetail: AnalyticsDatasetDetail = {
      ...detail,
      columns: [
        {
          name: 'user_id',
          type: 'text',
          nullCount: 0,
          distinctCount: 3,
          min: null,
          max: null,
          mean: null,
          topValues: [],
        },
        {
          name: 'event',
          type: 'text',
          nullCount: 0,
          distinctCount: 3,
          min: null,
          max: null,
          mean: null,
          topValues: [],
        },
        {
          name: 'happened_at',
          type: 'date',
          nullCount: 0,
          distinctCount: 9,
          min: '2026-01-01',
          max: '2026-03-01',
          mean: null,
          topValues: [],
        },
        {
          name: 'amount',
          type: 'integer',
          nullCount: 0,
          distinctCount: 9,
          min: 1,
          max: 100,
          mean: 20,
          topValues: [],
        },
      ],
    }
    const executed: string[] = []
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Measuring the funnel.',
          tool: {
            name: 'funnel',
            args: {
              user: 'user_id',
              event: 'event',
              time: 'happened_at',
              steps: ['view', 'signup', 'buy'],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Measuring monthly retention.',
          tool: {
            name: 'cohort',
            args: { user: 'user_id', date: 'happened_at', periods: 3 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'The funnel and cohort are ready.',
          tool: null,
        }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      getDataset: () => eventDetail,
      runQuery: (_id, sql) => {
        executed.push(sql)
        if (sql.includes('funnel AS')) {
          return {
            columns: ['step', 'label', 'users'],
            rows: [
              [1, 'view', 3],
              [2, 'signup', 2],
              [3, 'buy', 1],
            ],
            rowCount: 3,
            truncated: false,
            elapsedMs: 1,
          }
        }
        return {
          columns: ['cohort', 'period', 'users', 'cohort_size'],
          rows: [
            ['2026-01', 0, 2, 2],
            ['2026-01', 1, 1, 2],
            ['2026-02', 0, 1, 1],
          ],
          rowCount: 3,
          truncated: false,
          elapsedMs: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      {
        text: 'Show the view to signup to buy funnel and monthly retention.',
        activeDatasetId: dataset.id,
      },
      deps,
    )
    expect(reply.ok).toBe(true)
    expect(reply.actions.map((action) => action.tool)).toEqual(['funnel', 'cohort'])
    expect(reply.actions[0]?.summary).toContain('3 entered')
    expect(reply.actions[0]?.summary).toContain('1 completed')
    expect(reply.actions[0]?.sql).toContain('step_1')
    expect(executed[0]).toContain('MIN("happened_at")')
    expect(reply.actions[1]?.summary).toContain('monthly cohort')
    expect(executed[1]).toContain("strftime('%Y-%m'")
    expect(reply.text).toContain('funnel and cohort are ready')
  })

  it('builds and validates a multi-card dashboard in one action', async () => {
    const saved: Array<{ name: string; filterColumn?: string }> = []
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Building the dashboard.',
          tool: {
            name: 'build_dashboard',
            args: {
              name: 'Sales overview',
              cards: [
                {
                  name: 'Revenue by region',
                  sql: 'SELECT region AS "region", SUM(amount) AS "value" FROM data GROUP BY 1',
                  chart: { type: 'bar', x: 'region', y: 'value', aggregation: 'sum' },
                },
                {
                  name: 'Revenue trend',
                  sql: 'SELECT region AS "period", SUM(amount) AS "value" FROM data GROUP BY 1',
                  chart: { type: 'line', x: 'period', y: 'value', aggregation: 'sum' },
                },
              ],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'Two cards are live.', tool: null }),
      })
    const deps = fakeDeps({
      settingsPath: configuredSettingsPath(),
      runQuery: (_id, sql) => ({
        columns: sql.includes('period') ? ['period', 'value'] : ['region', 'value'],
        rows: [
          ['East', 30],
          ['West', 20],
        ],
        rowCount: 2,
        truncated: false,
        elapsedMs: 1,
      }),
      saveView: (input) => {
        saved.push({ name: input.name, filterColumn: input.filterColumn })
        return {
          id: `view_${saved.length}`,
          datasetId: input.datasetId,
          name: input.name,
          sql: input.sql,
          chart: input.chart,
          ...(input.filterColumn ? { filterColumn: input.filterColumn } : {}),
          createdAt: 1,
          updatedAt: 1,
        }
      },
    })
    const reply = await runAnalyticsAssistant(
      { text: 'Build a sales dashboard.', activeDatasetId: dataset.id },
      deps,
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('build_dashboard')
    expect(action.summary).toContain('2 live cards')
    expect(action.detail).toContain('Revenue by region')
    expect(saved).toEqual([
      { name: 'Revenue by region', filterColumn: 'region' },
      { name: 'Revenue trend', filterColumn: undefined },
    ])
  })

  it('audits data quality with high-priority findings', async () => {
    const dirtyDetail: AnalyticsDatasetDetail = {
      ...detail,
      duplicateRows: 2,
      missingCells: 12,
      columns: [
        detail.columns[0]!,
        {
          ...detail.columns[1]!,
          nullCount: 12,
          distinctCount: 0,
        },
      ],
    }
    aiState.chat
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({
          reply: 'Auditing the data.',
          tool: { name: 'data_quality', args: {} },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: JSON.stringify({ reply: 'The audit found issues.', tool: null }),
      })
    const reply = await runAnalyticsAssistant(
      { text: 'Audit this dataset.', activeDatasetId: dataset.id },
      fakeDeps({ settingsPath: configuredSettingsPath(), getDataset: () => dirtyDetail }),
    )
    expect(reply.ok).toBe(true)
    const action = reply.actions[0]!
    expect(action.tool).toBe('data_quality')
    expect(action.summary).toContain('high priority')
    expect(action.detail).toContain('entirely empty')
    expect(action.detail).toContain('duplicate row')
  })
})
