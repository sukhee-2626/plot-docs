import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  classifyMintResponse,
  FRESH_AUTH_REQUIRED,
  invalidatePlotdocsKey,
  recoverFromRejectedSoopusKey,
  setPlotdocsLoginOpener,
  plotdocsApiKey,
  plotdocsAuthPath,
  plotdocsLoginInFlight,
  plotdocsLogout,
  plotdocsProxyFallbackPreferred,
  loadPlotdocsAuth,
  resetPlotdocsAuthCache,
  startPlotdocsLogin,
  type SoopusLoginProgress,
} from '../src/plotdocs-auth'
import { soopusApiKey, setSoopusProxyUrl, watchSoopusApiKey } from '../src/soopus'

const CODE = 'a'.repeat(64)
const AUTH_URL = `https://www.genspark.ai/api/office_addin_auth/verify?code=${CODE}`

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'plotdocs-auth-'))
  process.env.PLOTDOCS_AUTH_DIR = dir
  delete process.env.SOOPUS_API_KEY
  delete process.env.PLOTDOCS_NATIVE_WAF
  resetPlotdocsAuthCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(dir, { recursive: true, force: true })
  delete process.env.PLOTDOCS_AUTH_DIR
  delete process.env.SOOPUS_API_KEY
  delete process.env.PLOTDOCS_NATIVE_WAF
  setSoopusProxyUrl('')
  resetPlotdocsAuthCache()
})

function jsonResponse(json: unknown, opts: { status?: number; setCookie?: string } = {}): Response {
  const headers = new Headers()
  if (opts.setCookie) headers.append('set-cookie', opts.setCookie)
  return {
    ok: (opts.status ?? 200) < 400,
    status: opts.status ?? 200,
    json: async () => json,
    headers,
  } as unknown as Response
}

const deviceCodeOk = {
  device_code: CODE,
  auth_url: AUTH_URL,
  expires_in: 600,
  poll_interval: 0.001,
}

/** fetch stub for the full flow; token polls: pending × (pendingPolls) then approved */
function stubFlow(
  opts: {
    pendingPolls?: number
    createResponse?: unknown
    /** overrides fields of the device_code response (poll_interval, expires_in, …) */
    deviceCode?: Record<string, unknown>
    /** keep answering "pending", so only the expiry can end the flow */
    alwaysPending?: boolean
    nativePass?: string
  } = {},
) {
  let tokenPolls = 0
  const fetchMock = vi.fn(async (input: string | URL, _init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/native-waf/pass') && opts.nativePass) {
      return Response.json({ data: { token: opts.nativePass } })
    }
    if (url.includes('/office_addin_auth/device_code')) {
      return jsonResponse({ ...deviceCodeOk, ...opts.deviceCode })
    }
    if (url.includes('/office_addin_auth/token')) {
      tokenPolls++
      if (!opts.alwaysPending && tokenPolls > (opts.pendingPolls ?? 1)) {
        return jsonResponse({ status: 'approved', access_token: 'bearer-token' })
      }
      return jsonResponse({ status: 'pending' })
    }
    if (url.includes('/office_addin_auth/session')) {
      return jsonResponse(
        { status: 'ok', cogen_id: 'user-1' },
        { setCookie: 'session_id=sess-abc; Path=/; HttpOnly' },
      )
    }
    if (url.includes('/api_tokens/create')) {
      return jsonResponse(
        opts.createResponse ?? {
          status: 0,
          data: { key_id: 'kid-1', key_name: 'plotdocs', token: 'soopus-plotdocs-key' },
        },
      )
    }
    if (url.includes('/api_tokens/revoke')) return jsonResponse({ status: 0 })
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function loginAndCollect(): Promise<SoopusLoginProgress[]> {
  const events: SoopusLoginProgress[] = []
  startPlotdocsLogin((progress) => events.push(progress))
  await vi.waitFor(() => {
    expect(['success', 'error']).toContain(events.at(-1)?.phase)
  })
  return events
}

describe('startPlotdocsLogin', () => {
  it('opt-in signs the cookie mint only and preserves Bearer session exchange', async () => {
    process.env.PLOTDOCS_NATIVE_WAF = '1'
    const token = `${Math.floor(Date.now() / 1000)}-${'a'.repeat(43)}`
    const fetchMock = stubFlow({ nativePass: token, pendingPolls: 0 })
    const events = await loginAndCollect()
    expect(events.at(-1)?.phase).toBe('success')
    const calls = fetchMock.mock.calls
    const mint = calls.find(([u]) => String(u).includes('/api_tokens/create'))!
    expect(new Headers(mint[1]?.headers).get('X-Soopus-Native-Pass')).toBe(token)
    expect(new Headers(mint[1]?.headers).get('Cookie')).toBe('session_id=sess-abc')
    expect(mint[1]?.redirect).toBe('manual')
    const session = calls.find(([u]) => String(u).includes('/office_addin_auth/session'))!
    expect(new Headers(session[1]?.headers).get('Authorization')).toBe('Bearer bearer-token')
    expect(new Headers(session[1]?.headers).has('X-Soopus-Native-Pass')).toBe(false)
    expect(calls.filter(([u]) => String(u).endsWith('/api/native-waf/pass'))).toHaveLength(1)
  })
  it('runs device_code → poll → session → key create and stores the key', async () => {
    const fetchMock = stubFlow({ pendingPolls: 2 })
    const events = await loginAndCollect()

    expect(events[0]).toEqual({ phase: 'url', url: AUTH_URL, expiresInSec: 600 })
    expect(events.at(-1)).toEqual({ phase: 'success' })

    const saved = JSON.parse(readFileSync(plotdocsAuthPath(), 'utf-8'))
    expect(saved).toEqual({
      api_key: 'soopus-plotdocs-key',
      key_id: 'kid-1',
      access_token: 'bearer-token',
    })
    if (process.platform !== 'win32') expect(statSync(plotdocsAuthPath()).mode & 0o777).toBe(0o600)
    expect(plotdocsApiKey()).toBe('soopus-plotdocs-key')
    expect(plotdocsLoginInFlight()).toBe(false)

    // the key create call must ride on the session cookie
    const createCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/api_tokens/create'))!
    const init = createCall[1]!
    expect((init.headers as Record<string, string>).Cookie).toBe('session_id=sess-abc')
    expect(JSON.parse(String(init.body))).toEqual({ key_name: 'plotdocs' })
  })

  it('feeds soopusApiKey(), losing only to an explicit SOOPUS_API_KEY env override', async () => {
    stubFlow()
    await loginAndCollect()
    expect(soopusApiKey()).toBe('soopus-plotdocs-key')
    process.env.SOOPUS_API_KEY = 'soopus-env-override'
    expect(soopusApiKey()).toBe('soopus-env-override')
  })

  it('reports a network failure at device_code as error "network"', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)
    const events = await loginAndCollect()
    expect(events).toEqual([{ phase: 'error', error: 'network' }])
    expect(loadPlotdocsAuth()).toBeNull()
    // no proxy registered → nothing better to retry through
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries through the registered proxy channel when the direct fetch cannot connect', async () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const flow = stubFlow()
    let deviceCodeCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/device_code') && ++deviceCodeCalls === 1) {
          throw new Error('ECONNRESET')
        }
        return flow(input, init)
      }),
    )
    const events = await loginAndCollect()
    expect(deviceCodeCalls).toBe(2)
    expect(events.at(-1)).toEqual({ phase: 'success' })
    expect(plotdocsApiKey()).toBe('soopus-plotdocs-key')
    expect(plotdocsProxyFallbackPreferred()).toBe(true)
  })

  it('treats a gateway status (502) as channel failure: fails over without adopting the channel', async () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const fetchMock = vi.fn(async () => jsonResponse({}, { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)
    const events = await loginAndCollect()
    expect(events).toEqual([{ phase: 'error', error: 'network' }])
    // both channels tried, neither adopted
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(plotdocsProxyFallbackPreferred()).toBe(false)
  })

  it('counts an endpoint 4xx (authorization_pending) as channel success', async () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const flow = stubFlow({ pendingPolls: 0 })
    let deviceCodeCalls = 0
    let tokenCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/device_code') && ++deviceCodeCalls === 1) {
          throw new Error('ECONNRESET')
        }
        if (url.includes('/office_addin_auth/token') && ++tokenCalls === 1) {
          return jsonResponse({ status: 'pending' }, { status: 400 })
        }
        return flow(input, init)
      }),
    )
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'success' })
    // the 400 poll neither failed over to a second attempt nor dropped the preference
    expect(tokenCalls).toBe(2)
    expect(plotdocsProxyFallbackPreferred()).toBe(true)
  })

  it('reports an expired device code as error "expired"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('/device_code')) {
          return jsonResponse({
            device_code: CODE,
            auth_url: AUTH_URL,
            expires_in: 600,
            poll_interval: 0.001,
          })
        }
        return jsonResponse({ status: 'expired' })
      }),
    )
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'expired' })
  })

  it('surfaces the server message when key creation fails', async () => {
    stubFlow({ createResponse: { status: -1, message: 'Invalid API key name.' } })
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'Invalid API key name.' })
    expect(loadPlotdocsAuth()).toBeNull()
  })

  // The device-code endpoint chooses the poll interval and the expiry, so one odd
  // response could stretch a login for hours or leave it polling at a crawl.
  // Both are clamped; the ceiling is MAX_LOGIN_SEC / MAX_POLL_INTERVAL_MS.
  it('clamps a server poll interval far above the ceiling', async () => {
    vi.useFakeTimers()
    try {
      stubFlow({ pendingPolls: 0, deviceCode: { ...deviceCodeOk, poll_interval: 2_000_000 } })
      const events: SoopusLoginProgress[] = []
      startPlotdocsLogin((progress) => events.push(progress))
      // 10s is the clamped ceiling; the ~23 days the server asked for never elapse
      await vi.advanceTimersByTimeAsync(0) // let the device_code reply land and arm the sleep
      await vi.advanceTimersByTimeAsync(10_000)
      await vi.waitFor(() => {
        expect(['success', 'error']).toContain(events.at(-1)?.phase)
      })
      expect(events.at(-1)).toEqual({ phase: 'success' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops waiting for a device code at the clamped expiry', async () => {
    vi.useFakeTimers()
    try {
      stubFlow({
        alwaysPending: true,
        deviceCode: { ...deviceCodeOk, expires_in: 1e9, poll_interval: 2_000_000 },
      })
      const events: SoopusLoginProgress[] = []
      startPlotdocsLogin((progress) => events.push(progress))
      // 1h is the clamped ceiling: still waiting one second before it
      await vi.advanceTimersByTimeAsync(3_599_000)
      expect(events.some((e) => e.phase === 'error')).toBe(false)
      await vi.advanceTimersByTimeAsync(2_000)
      await vi.waitFor(() => {
        expect(events.at(-1)).toEqual({ phase: 'error', error: 'expired' })
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('honors a provider lifetime longer than the old 15 min ceiling', async () => {
    // A clamp must never truncate a code the server still considers valid:
    // Google's device_code answers 1800s, which the previous 900s ceiling cut
    // in half and logged out a user who could still approve.
    vi.useFakeTimers()
    try {
      stubFlow({
        alwaysPending: true,
        deviceCode: { ...deviceCodeOk, expires_in: 1800, poll_interval: 2_000 },
      })
      const events: SoopusLoginProgress[] = []
      startPlotdocsLogin((progress) => events.push(progress))
      await vi.advanceTimersByTimeAsync(0)
      expect(events.at(-1)).toEqual({ phase: 'url', url: AUTH_URL, expiresInSec: 1800 })
      // still alive well past the old 900s ceiling
      await vi.advanceTimersByTimeAsync(1_500_000)
      expect(events.some((e) => e.phase === 'error')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-login revokes the superseded key (best-effort)', async () => {
    stubFlow()
    await loginAndCollect()

    const fetchMock = stubFlow({
      createResponse: { status: 0, data: { key_id: 'kid-2', token: 'soopus-plotdocs-key-2' } },
    })
    await loginAndCollect()
    expect(loadPlotdocsAuth()).toMatchObject({ apiKey: 'soopus-plotdocs-key-2', keyId: 'kid-2' })
    await vi.waitFor(() => {
      const revoke = fetchMock.mock.calls.find(([u]) => String(u).includes('/api_tokens/revoke'))
      expect(revoke).toBeDefined()
      expect(JSON.parse(String(revoke![1]!.body))).toEqual({ key_id: 'kid-1' })
    })
  })

  it('a new login cancels the in-flight one without emitting on it', async () => {
    // first flow polls pending forever
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('/device_code')) {
          return jsonResponse({
            device_code: CODE,
            auth_url: AUTH_URL,
            expires_in: 600,
            poll_interval: 0.001,
          })
        }
        return jsonResponse({ status: 'pending' })
      }),
    )
    const first: SoopusLoginProgress[] = []
    startPlotdocsLogin((progress) => first.push(progress))
    await vi.waitFor(() => expect(first.length).toBeGreaterThan(0))
    expect(plotdocsLoginInFlight()).toBe(true)

    stubFlow()
    const second = await loginAndCollect()
    expect(second.at(-1)).toEqual({ phase: 'success' })
    expect(first.every((e) => e.phase === 'url')).toBe(true)
  })
})

describe('plotdocsLogout', () => {
  it('revokes the key server-side and removes the local file', async () => {
    const fetchMock = stubFlow()
    await loginAndCollect()

    await plotdocsLogout()
    expect(existsSync(plotdocsAuthPath())).toBe(false)
    expect(plotdocsApiKey()).toBe('')
    const revokeCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/api_tokens/revoke'))!
    const init = revokeCall[1]!
    expect((init.headers as Record<string, string>).Cookie).toBe('session_id=sess-abc')
    expect(JSON.parse(String(init.body))).toEqual({ key_id: 'kid-1' })
  })

  it('still clears locally when the server revoke fails', async () => {
    stubFlow()
    await loginAndCollect()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await plotdocsLogout()
    expect(existsSync(plotdocsAuthPath())).toBe(false)
    expect(loadPlotdocsAuth()).toBeNull()
  })

  it('is a no-op network-wise when not signed in', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await plotdocsLogout()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('watchSoopusApiKey', () => {
  it('drops the cached key and reports the new one when another process rewrites auth.json', async () => {
    const write = (key: string) =>
      writeFileSync(join(dir, 'auth.json'), JSON.stringify({ api_key: key, key_id: key }))
    write('soopus-old')
    expect(soopusApiKey()).toBe('soopus-old')
    const seen: string[] = []
    const stop = watchSoopusApiKey((key) => seen.push(key), 20)
    try {
      // the first stat runs off-thread; a write that lands before it becomes the baseline
      await new Promise((r) => setTimeout(r, 100))
      write('soopus-new')
      await vi.waitFor(() => expect(seen).toEqual(['soopus-new']), { timeout: 3000 })
      expect(plotdocsApiKey()).toBe('soopus-new')
    } finally {
      stop()
    }
  })
})

describe('classifyMintResponse', () => {
  it('reads a minted key', () => {
    expect(
      classifyMintResponse(200, { status: 0, data: { key_id: 'kid', token: 'soopus-x' } }),
    ).toEqual({ kind: 'ok', apiKey: 'soopus-x', keyId: 'kid' })
  })

  it('recognises the fresh-login refusal', () => {
    expect(classifyMintResponse(403, { detail: FRESH_AUTH_REQUIRED })).toEqual({
      kind: 'fresh_auth_required',
    })
  })

  it('keeps other refusals plain errors', () => {
    expect(classifyMintResponse(403, { detail: 'forbidden' })).toEqual({
      kind: 'error',
      reason: 'forbidden',
    })
    expect(classifyMintResponse(500, {})).toEqual({
      kind: 'error',
      reason: 'API key creation failed (HTTP 500)',
    })
    expect(classifyMintResponse(200, { status: -1, message: 'nope' })).toEqual({
      kind: 'error',
      reason: 'nope',
    })
  })
})

describe('login mint refused with fresh_browser_authentication_required', () => {
  it('reports fresh_auth_required and stores nothing', async () => {
    const flow = stubFlow()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/api_tokens/create')) {
          return jsonResponse({ detail: FRESH_AUTH_REQUIRED }, { status: 403 })
        }
        return flow(input, init)
      }),
    )
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'fresh_auth_required' })
    expect(loadPlotdocsAuth()).toBeNull()
  })
})

describe('recoverFromRejectedSoopusKey', () => {
  afterEach(() => setPlotdocsLoginOpener(null))

  async function signIn(): Promise<void> {
    stubFlow()
    await loginAndCollect()
    expect(plotdocsApiKey()).toBe('soopus-plotdocs-key')
  }

  /** fetch stub for the silent re-mint: session ok, create answers `create` */
  function stubRemint(create: () => Response) {
    const flow = stubFlow({ pendingPolls: 0 })
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      if (String(input).includes('/api_tokens/create')) return create()
      return flow(input, init)
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('drops the rejected key from memory and disk', async () => {
    await signIn()
    expect(invalidatePlotdocsKey('soopus-other')).toBe(false)
    expect(invalidatePlotdocsKey('soopus-plotdocs-key')).toBe(true)
    expect(plotdocsApiKey()).toBe('')
    expect(existsSync(plotdocsAuthPath())).toBe(false)
  })

  it('re-mints with the stored session when the server still allows it (gate off)', async () => {
    await signIn()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    const fetchMock = stubRemint(() =>
      jsonResponse({ status: 0, data: { key_id: 'kid-2', token: 'soopus-reminted' } }),
    )
    await expect(recoverFromRejectedSoopusKey('soopus-plotdocs-key')).resolves.toBe('reminted')
    expect(plotdocsApiKey()).toBe('soopus-reminted')
    expect(opener).not.toHaveBeenCalled()
    // no device code: the stored Bearer rebuilt the session
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/device_code'))).toBe(false)
  })

  it('falls back to one device-code login when the re-mint needs a fresh login', async () => {
    await signIn()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    let creates = 0
    stubRemint(() => {
      // the silent re-mint is refused; the post-login mint (fresh session) succeeds
      if (++creates === 1) return jsonResponse({ detail: FRESH_AUTH_REQUIRED }, { status: 403 })
      return jsonResponse({ status: 0, data: { key_id: 'kid-3', token: 'soopus-fresh' } })
    })
    await expect(recoverFromRejectedSoopusKey('soopus-plotdocs-key')).resolves.toBe('login_started')
    expect(plotdocsApiKey()).toBe('')
    await vi.waitFor(() => expect(opener).toHaveBeenCalledWith(AUTH_URL))
    await vi.waitFor(() => expect(plotdocsApiKey()).toBe('soopus-fresh'))
    expect(creates).toBe(2)
  })

  it('launches the login at most once per failure streak', async () => {
    await signIn()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    // the device code is never approved: the user abandoned the browser
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('/office_addin_auth/session')) {
          return jsonResponse({}, { setCookie: 'session_id=old; Path=/' })
        }
        if (url.includes('/api_tokens/create')) {
          return jsonResponse({ detail: FRESH_AUTH_REQUIRED }, { status: 403 })
        }
        if (url.includes('/device_code')) return jsonResponse(deviceCodeOk)
        return jsonResponse({ status: 'expired' })
      }),
    )
    const [a, b] = await Promise.all([
      recoverFromRejectedSoopusKey('soopus-plotdocs-key'),
      recoverFromRejectedSoopusKey('soopus-plotdocs-key'),
    ])
    expect([a, b]).toEqual(['login_started', 'login_started'])
    await vi.waitFor(() => expect(plotdocsLoginInFlight()).toBe(false))
    // further rejected calls leave the inline sign-in button to the user
    await expect(recoverFromRejectedSoopusKey('soopus-plotdocs-key')).resolves.toBe('login_required')
    await expect(recoverFromRejectedSoopusKey('')).resolves.toBe('login_required')
    expect(opener).toHaveBeenCalledTimes(1)
  })

  it('a reminted key rejected again goes straight to login instead of re-minting forever', async () => {
    await signIn()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    let creates = 0
    stubRemint(() => {
      creates++
      return jsonResponse({ status: 0, data: { key_id: `kid-${creates}`, token: 'soopus-reminted' } })
    })
    await expect(recoverFromRejectedSoopusKey('soopus-plotdocs-key')).resolves.toBe('reminted')
    await expect(recoverFromRejectedSoopusKey('soopus-reminted')).resolves.toBe('login_started')
    expect(creates).toBe(1)
  })

  it('without an opener only signs out locally', async () => {
    await signIn()
    stubRemint(() => jsonResponse({ detail: FRESH_AUTH_REQUIRED }, { status: 403 }))
    await expect(recoverFromRejectedSoopusKey('soopus-plotdocs-key')).resolves.toBe('login_required')
    expect(plotdocsApiKey()).toBe('')
    expect(plotdocsLoginInFlight()).toBe(false)
  })
})

describe('sign-out during recovery', () => {
  afterEach(() => setPlotdocsLoginOpener(null))

  it('a re-mint still in flight at logout neither saves a key nor opens the login', async () => {
    stubFlow()
    await loginAndCollect()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    let releaseCreate: ((r: Response) => void) | null = null
    const flow = stubFlow({ pendingPolls: 0 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/api_tokens/create')) {
          return new Promise<Response>((resolve) => (releaseCreate = resolve))
        }
        return flow(input, init)
      }),
    )
    const pending = recoverFromRejectedSoopusKey('soopus-plotdocs-key')
    // hold the re-mint at the create call, then sign out underneath it
    await vi.waitFor(() => expect(releaseCreate).not.toBeNull())
    await plotdocsLogout()
    releaseCreate!(jsonResponse({ status: 0, data: { key_id: 'kid-9', token: 'soopus-late' } }))
    await expect(pending).resolves.toBe('login_required')
    expect(plotdocsApiKey()).toBe('')
    expect(existsSync(plotdocsAuthPath())).toBe(false)
    expect(opener).not.toHaveBeenCalled()
  })

  it('callers sharing the cancelled recovery do not relaunch the login after sign-out', async () => {
    stubFlow()
    await loginAndCollect()
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    let releaseCreate: ((r: Response) => void) | null = null
    const flow = stubFlow({ pendingPolls: 0 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/api_tokens/create')) {
          return new Promise<Response>((resolve) => (releaseCreate = resolve))
        }
        return flow(input, init)
      }),
    )
    const first = recoverFromRejectedSoopusKey('soopus-plotdocs-key')
    const second = recoverFromRejectedSoopusKey('soopus-plotdocs-key')
    await vi.waitFor(() => expect(releaseCreate).not.toBeNull())
    await plotdocsLogout()
    releaseCreate!(jsonResponse({ status: 0, data: { key_id: 'kid-9', token: 'soopus-late' } }))
    await expect(first).resolves.toBe('login_required')
    await expect(second).resolves.toBe('login_required')
    expect(opener).not.toHaveBeenCalled()
    expect(plotdocsLoginInFlight()).toBe(false)
    expect(plotdocsApiKey()).toBe('')
  })
})
