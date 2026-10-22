import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// the shared soopus CLI login (~/.genspark-tool-cli) is a key fallback: point
// homedir at an empty dir so the developer's real login cannot leak in
const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>()
  return { ...os, homedir: () => home.dir || os.homedir() }
})

import {
  FRESH_AUTH_REQUIRED,
  resetPlotdocsAuthCache,
  setPlotdocsLoginOpener,
} from '../src/plotdocs-auth'
import {
  SoopusAuthError,
  soopusApiKey,
  soopusWebSearch,
  hasSoopusAuth,
  isSoopusUnauthorizedText,
  noteSoopusCallFailure,
  noteSoopusKeyRejected,
  resetSoopusRejectedKeys,
} from '../src/soopus'

const AUTH_URL = `https://www.genspark.ai/api/office_addin_auth/verify?code=${'a'.repeat(64)}`

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'soopus-reauth-'))
  home.dir = dir
  process.env.PLOTDOCS_AUTH_DIR = dir
  process.env.SOOPUS_CLI_PATH = '/fake/soopus.js'
  delete process.env.SOOPUS_API_KEY
  delete process.env.AI_SEARCH_DISABLE_SOOPUS
  resetPlotdocsAuthCache()
  resetSoopusRejectedKeys()
  writeFileSync(
    join(dir, 'auth.json'),
    JSON.stringify({ api_key: 'soopus-expired', key_id: 'kid-1', access_token: 'bearer-old' }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  setPlotdocsLoginOpener(null)
  resetPlotdocsAuthCache()
  resetSoopusRejectedKeys()
  rmSync(dir, { recursive: true, force: true })
  home.dir = ''
  delete process.env.PLOTDOCS_AUTH_DIR
  delete process.env.SOOPUS_CLI_PATH
})

function response(body: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers()
  if (setCookie) headers.append('set-cookie', setCookie)
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(text, { status, headers })
}

const ndjsonOk = (data: unknown) => response(`${JSON.stringify({ status: 'ok', data })}\n`)

/**
 * tool_cli answers 401 for the expired key and succeeds for any other; the
 * auth endpoints answer `create` for the silent re-mint.
 */
function stubServer(create: () => Response) {
  const toolKeys: string[] = []
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/tool_cli/')) {
      const key = (init?.headers as Record<string, string>)['X-Api-Key']!
      toolKeys.push(key)
      if (key === 'soopus-expired') return response('{"detail":"invalid api key"}', 401)
      return ndjsonOk({ download_url: 'https://93.184.216.34/deck.pptx' })
    }
    if (url.includes('/office_addin_auth/session')) {
      return response({ status: 'ok' }, 200, 'session_id=sess; Path=/')
    }
    if (url.includes('/api_tokens/create')) return create()
    if (url.includes('/office_addin_auth/device_code')) {
      return response({ device_code: 'a'.repeat(64), auth_url: AUTH_URL, expires_in: 600 })
    }
    if (url.includes('/office_addin_auth/token')) return response({ status: 'pending' })
    if (url.includes('/api_tokens/revoke')) return response({ status: 0 })
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, toolKeys }
}

describe('isSoopusUnauthorizedText', () => {
  it('matches the 401 shapes of soopus CLI, tool_cli and the LLM proxy', () => {
    expect(isSoopusUnauthorizedText('HTTP 401: Unauthorized')).toBe(true)
    expect(isSoopusUnauthorizedText('tool_cli /x HTTP 401: {}')).toBe(true)
    expect(isSoopusUnauthorizedText('Claude HTTP 401: {"error":"invalid key"}')).toBe(true)
    expect(isSoopusUnauthorizedText('HTTP 4011')).toBe(false)
    expect(isSoopusUnauthorizedText('HTTP 403: forbidden')).toBe(false)
  })
})

describe('soopus CLI 401 recovery', () => {
  /** fake CLI: a 401 for the expired key (printed on stdout like the real CLI), results otherwise */
  function fakeCli(): string {
    const log = join(dir, 'cli-keys.log')
    const script = join(dir, 'fake-soopus.mjs')
    writeFileSync(
      script,
      [
        "import { appendFileSync } from 'node:fs'",
        `appendFileSync(${JSON.stringify(log)}, process.env.SOOPUS_API_KEY + '\\n')`,
        "if (process.env.SOOPUS_API_KEY === 'soopus-expired') {",
        "  console.log(JSON.stringify({ status: 'error', message: 'HTTP 401: Unauthorized', data: null }))",
        '  process.exit(1)',
        '}',
        "console.log(JSON.stringify({ status: 'ok', data: { organic_results: [{ title: 't', link: 'https://e.x', snippet: 's' }] } }))",
      ].join('\n'),
    )
    process.env.SOOPUS_CLI_PATH = script
    return log
  }

  it('re-mints after a CLI 401 and reruns the command with the new key', async () => {
    const log = fakeCli()
    stubServer(() => response({ status: 0, data: { key_id: 'kid-2', token: 'soopus-new' } }))
    const out = await soopusWebSearch('q')
    expect(out.results).toHaveLength(1)
    expect(readFileSync(log, 'utf-8').trim().split('\n')).toEqual(['soopus-expired', 'soopus-new'])
  })

  it('reports the auth failure and signs out when a fresh login is required', async () => {
    fakeCli()
    stubServer(() => response({ detail: FRESH_AUTH_REQUIRED }, 403))
    await expect(soopusWebSearch('q')).rejects.toBeInstanceOf(SoopusAuthError)
    expect(hasSoopusAuth()).toBe(false)
  })
})

describe('noteSoopusCallFailure (LLM proxy chat/stream)', () => {
  it('marks the injected key invalid on a 401 so the sign-in button appears', () => {
    stubServer(() => response({ detail: FRESH_AUTH_REQUIRED }, 403))
    expect(noteSoopusCallFailure('soopus-expired', new Error('Claude HTTP 401: invalid'))).toBe(true)
    expect(hasSoopusAuth()).toBe(false)
  })

  it('ignores non-auth failures and calls made without the soopus key', () => {
    expect(noteSoopusCallFailure('soopus-expired', new Error('HTTP 500: busy'))).toBe(false)
    expect(noteSoopusCallFailure('', new Error('HTTP 401: bad byok key'))).toBe(false)
    expect(hasSoopusAuth()).toBe(true)
  })

  it('stops offering a rejected env key without touching anyone else’s file', () => {
    process.env.SOOPUS_API_KEY = 'soopus-env'
    try {
      stubServer(() => response({ detail: FRESH_AUTH_REQUIRED }, 403))
      expect(soopusApiKey()).toBe('soopus-env')
      noteSoopusCallFailure('soopus-env', 'HTTP 401: Unauthorized')
      // falls through to Plot Docs's own (still valid) key
      expect(soopusApiKey()).toBe('soopus-expired')
    } finally {
      delete process.env.SOOPUS_API_KEY
    }
  })
})

describe('passive calls', () => {
  it('a 401 from a background call drops the key without opening the browser', async () => {
    stubServer(() => response({ detail: FRESH_AUTH_REQUIRED }, 403))
    const opener = vi.fn()
    setPlotdocsLoginOpener(opener)
    await expect(noteSoopusKeyRejected('soopus-expired', { allowLogin: false })).resolves.toBe(
      'login_required',
    )
    expect(hasSoopusAuth()).toBe(false)
    expect(opener).not.toHaveBeenCalled()
  })
})
