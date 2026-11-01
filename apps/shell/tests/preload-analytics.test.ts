import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsApi } from '../src/shared/analytics-api'
import { ANALYTICS_CHANNELS } from '../src/shared/analytics-api'
import type { HomeApi } from '../src/shared/home-api'
import { HOME_CHANNELS } from '../src/shared/home-api'

const electronMocks = vi.hoisted(() => ({
  exposed: new Map<string, unknown>(),
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => electronMocks.exposed.set(name, api),
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    send: electronMocks.send,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
  // the preload imports @plotdocs/electron-utils (drop-open bridge), which
  // binds webUtils at module scope even though node env never installs it
  webUtils: { getPathForFile: () => '' },
}))

import '../src/preload/index'

const homeApi = electronMocks.exposed.get('aiOffice') as HomeApi
const dataApi = electronMocks.exposed.get('plotdocsAnalytics') as AnalyticsApi

beforeEach(() => {
  electronMocks.invoke.mockReset()
  electronMocks.send.mockReset()
})

describe('analytics consent preload API', () => {
  it('defaults malformed main-process state to on', async () => {
    electronMocks.invoke.mockResolvedValue('invalid')
    await expect(homeApi.getAnalyticsEnabled()).resolves.toBe(true)
  })

  it('rejects non-boolean consent before invoking the main process', async () => {
    const setAnalytics = homeApi.setAnalyticsEnabled as (enabled: unknown) => Promise<boolean>

    await expect(setAnalytics('true')).rejects.toThrow('Invalid analytics consent')
    expect(electronMocks.invoke).not.toHaveBeenCalled()
  })

  it('forwards explicit booleans and reports persistence success', async () => {
    electronMocks.invoke.mockResolvedValue(true)

    await expect(homeApi.setAnalyticsEnabled(false)).resolves.toBe(true)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(HOME_CHANNELS.setAnalyticsEnabled, false)

    await expect(homeApi.setOnboardingSeen()).resolves.toBe(true)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(HOME_CHANNELS.setOnboardingSeen)
  })
})

describe('data analytics preload API', () => {
  it('is exposed and forwards dataset and query operations', async () => {
    electronMocks.invoke.mockResolvedValue([])
    expect(dataApi).toBeTruthy()

    await expect(dataApi.listDatasets()).resolves.toEqual([])
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(ANALYTICS_CHANNELS.listDatasets)

    electronMocks.invoke.mockResolvedValue({ columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 1 })
    await dataApi.runQuery('dataset-id', 'SELECT 1', 25)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ANALYTICS_CHANNELS.runQuery,
      'dataset-id',
      'SELECT 1',
      25,
    )
  })

  it('rejects an empty import path before crossing the bridge', async () => {
    await expect(dataApi.importPath('')).rejects.toThrow('Invalid file path')
    expect(electronMocks.invoke).not.toHaveBeenCalled()
  })

  it('normalizes non-string export results to null', async () => {
    electronMocks.invoke.mockResolvedValue({ path: 'x.csv' })
    await expect(dataApi.exportCsv('dataset-id', 'SELECT 1', 'export')).resolves.toBeNull()
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ANALYTICS_CHANNELS.exportCsv,
      'dataset-id',
      'SELECT 1',
      'export',
    )
  })

  it('forwards web inspection and table selection', async () => {
    electronMocks.invoke.mockResolvedValue({ tables: [] })
    await dataApi.inspectUrl({ url: 'https://example.com/data' })
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(ANALYTICS_CHANNELS.inspectUrl, {
      url: 'https://example.com/data',
    })

    electronMocks.invoke.mockResolvedValue({})
    await dataApi.importUrl({ url: 'https://example.com/data', tableIndex: 1 })
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(ANALYTICS_CHANNELS.importUrl, {
      url: 'https://example.com/data',
      tableIndex: 1,
    })
  })

  it('forwards a join request unchanged and returns its evidence', async () => {
    const request = {
      leftDatasetId: 'left-id',
      rightDatasetId: 'right-id',
      leftKey: 'region',
      rightKey: 'region',
      joinType: 'left' as const,
      name: 'Sales with regions',
    }
    const response = {
      ok: true,
      dataset: { id: 'joined-id', name: 'Sales with regions' },
      sql: 'SELECT * FROM data AS l LEFT JOIN right.data AS r ON l.region = r.region',
      warning: 'Sources remain unchanged.',
    }
    electronMocks.invoke.mockResolvedValue(response)

    await expect(dataApi.joinDatasets(request)).resolves.toEqual(response)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(ANALYTICS_CHANNELS.joinDatasets, request)
  })

  it('forwards cleaning, AI and forecast requests unchanged', async () => {
    electronMocks.invoke.mockResolvedValue({ ok: true })
    const operation = { kind: 'drop_nulls' as const, column: 'amount' }
    await dataApi.clean('dataset-id', operation)
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ANALYTICS_CHANNELS.clean,
      'dataset-id',
      operation,
    )

    await dataApi.ask('dataset-id', 'Which region is strongest?')
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ANALYTICS_CHANNELS.ask,
      'dataset-id',
      'Which region is strongest?',
    )

    await dataApi.forecast('dataset-id', 'month', 'revenue')
    expect(electronMocks.invoke).toHaveBeenLastCalledWith(
      ANALYTICS_CHANNELS.forecast,
      'dataset-id',
      'month',
      'revenue',
    )
  })
})
