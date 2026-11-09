import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type {
  AnalyticsAutoAnalysis,
  AnalyticsDataset,
  AnalyticsDatasetDetail,
} from '../src/shared/analytics-api'

/**
 * Live structured-output test for the analytics agent.
 *
 * This is opt-in because it starts the real Codex app-server and spends a real
 * model turn:
 *
 *   PLOTDOCS_LIVE_CODEX=1 npx vitest run apps/shell/tests/data-analytics-live-codex.test.ts
 *
 * It verifies the exact failure mode this guard exists for: a configured Codex
 * model must return a tool plan (not prose that falls back to `auto_analyze`).
 */

vi.mock('@plotdocs/ai-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@plotdocs/ai-search')>()
  return { ...actual, soopusApiKey: () => '' }
})

import { runAnalyticsAssistant, type AssistantDeps } from '../src/main/analytics/assistant'

function liveCodexModel(): string {
  if (process.env.PLOTDOCS_CODEX_MODEL) return process.env.PLOTDOCS_CODEX_MODEL
  try {
    const settings = JSON.parse(
      readFileSync(join(process.env.APPDATA ?? '', 'Plot Docs', 'ai-settings.json'), 'utf8'),
    ) as { providers?: { codex?: { model?: string } } }
    return settings.providers?.codex?.model ?? ''
  } catch {
    return ''
  }
}

const model = liveCodexModel()

const dataset: AnalyticsDataset = {
  id: 'ds_live_sales',
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
    insights: [],
    views: [],
    prepared: [],
    methods: [],
    elapsedMs: 1,
  }
}

function liveDeps(settingsPath: string): AssistantDeps {
  return {
    settingsPath,
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
    runQuery: () => ({
      columns: ['region', 'total_sales'],
      rows: [
        ['East', 260],
        ['North', 200],
        ['South', 100],
      ],
      rowCount: 3,
      truncated: false,
      elapsedMs: 1,
    }),
    joinDatasets: async () => ({ ok: false }),
    appendDatasets: async () => ({ ok: false }),
    saveView: (input) => ({
      id: input.id ?? 'view_live',
      datasetId: input.datasetId,
      name: input.name,
      sql: input.sql,
      chart: input.chart,
      createdAt: 1,
      updatedAt: 1,
    }),
    listViews: () => [],
    forecast: () => ({ ok: false }),
    autoAnalyze: async (id) => analysis(id),
    audit: () => {},
    emit: () => {},
  }
}

describe.skipIf(process.env.PLOTDOCS_LIVE_CODEX !== '1')('live Codex analytics plan', () => {
  it.skipIf(!model)(
    'returns a run_sql tool plan instead of prose or auto_analyze fallback',
    async () => {
      const settingsPath = join(
        process.env.TEMP ?? process.env.TMP ?? '.',
        `plotdocs-live-codex-${Date.now()}.json`,
      )
      writeFileSync(
        settingsPath,
        JSON.stringify({
          provider: 'codex',
          providers: { codex: { apiKey: '', model } },
        }),
        'utf8',
      )

      const reply = await runAnalyticsAssistant(
        {
          text: 'What were total sales by region? Use the amount column and show the exact SQL.',
          activeDatasetId: dataset.id,
        },
        liveDeps(settingsPath),
      )

      const tools = reply.actions.map((action) => action.tool)
      expect(tools).not.toContain('auto_analyze')
      expect(tools).toContain('run_sql')
      const sqlAction = reply.actions.find((action) => action.tool === 'run_sql')
      expect(sqlAction?.sql).toMatch(/group\s+by/i)
      expect(sqlAction?.sql).toMatch(/amount/i)
      expect(reply.ok).toBe(true)
    },
    300_000,
  )
})
