/**
 * Wrapper around soopus (Soopus CLI, @genspark/cli) — search / image generation /
 * media analysis / upload / transcription.
 *
 * Execution: the main process spawns the CLI's JS entry with
 * ELECTRON_RUN_AS_NODE=1 so Electron itself acts as Node (the variable is a
 * no-op in a plain Node environment), avoiding the Windows problem where
 * .cmd files cannot be passed to execFile.
 *
 * Auth: soopusApiKey() below. When not logged in, hasSoopusAuth() returns false and
 * callers should fall back to other implementations (e.g. Serper search).
 */

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unwatchFile, watchFile, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import {
  asRecord,
  firstItem,
  soopusProxyUrl,
  isCopyrightHost,
  safeHost,
  type ImageSearchResult,
  type WebSearchResult,
} from './shared'
import {
  plotdocsApiKey,
  plotdocsAuthPath,
  recoverFromRejectedSoopusKey,
  reloadPlotdocsAuth,
  type SoopusRecoveryOutcome,
} from './plotdocs-auth'
// deep import: the package root re-exports Electron-bound modules, and this file also runs in the plotdocs CLI

const SEARCH_TIMEOUT_MS = 60_000
const GENERATE_TIMEOUT_MS = 600_000
const MAX_BUFFER = 32 * 1024 * 1024

// ── CLI resolution & auth ───────────────────────────────────────────

let cachedEntry: string | null | undefined

/** JS entry of @genspark/cli (null if not found). Can be overridden via SOOPUS_CLI_PATH. */
export function resolveSoopusEntry(): string | null {
  if (process.env.SOOPUS_CLI_PATH) return process.env.SOOPUS_CLI_PATH
  if (cachedEntry !== undefined) return cachedEntry
  try {
    const require = createRequire(import.meta.url)
    cachedEntry = require.resolve('@genspark/cli/dist/index.js')
  } catch {
    // The packaged app has no node_modules; electron-builder extraResources
    // copies the CLI into Resources/soopus/
    const resourcesPath = (process as { resourcesPath?: string }).resourcesPath
    const packed = resourcesPath
      ? join(resourcesPath, 'soopus', 'node_modules', '@soopus', 'cli', 'dist', 'index.js')
      : null
    cachedEntry = packed && existsSync(packed) ? packed : null
  }
  return cachedEntry
}

let compatPath: string | null | undefined

/**
 * Under Electron-as-Node, Commander.js sees process.versions.electron and
 * parses argv with Electron conventions (skipping one argument fewer), so it
 * treats the entry path as a command and prints help. Workaround: --require a
 * script that deletes versions.electron. In a plain Node environment
 * (tests/tsx) no handling is needed and an empty array is returned.
 */
function electronCompatArgs(): string[] {
  if (!process.versions.electron) return []
  if (compatPath === undefined) {
    try {
      const dir = join(homedir(), '.plotdocs', 'bin')
      mkdirSync(dir, { recursive: true })
      compatPath = join(dir, 'electron-compat.js')
      writeFileSync(compatPath, 'delete process.versions.electron;\n')
    } catch {
      compatPath = null
    }
  }
  return compatPath ? ['--require', compatPath] : []
}

/**
 * API key for Soopus LLM proxy / tool_cli auth; '' when not logged in.
 * Priority: SOOPUS_API_KEY env → Plot Docs's own key (bills to us via its
 * key_name) → shared soopus CLI login (bills to the Claw bucket).
 */
export function soopusApiKey(): string {
  const env = process.env.SOOPUS_API_KEY
  if (env && !rejectedKeys.has(env)) return env
  const own = plotdocsApiKey()
  if (own && !rejectedKeys.has(own)) return own
  try {
    const configPath = join(homedir(), '.genspark-tool-cli', 'config.json')
    if (!existsSync(configPath)) return ''
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as { api_key?: string }
    const shared = config.api_key ?? ''
    return rejectedKeys.has(shared) ? '' : shared
  } catch {
    return ''
  }
}

// ── Rejected keys (401) ─────────────────────────────────────────────

/**
 * Keys the server answered 401 for (expired / revoked). Plot Docs's own key
 * is also deleted from disk; env and shared soopus CLI keys belong to someone
 * else, so they are only skipped for the rest of this process.
 */
const rejectedKeys = new Set<string>()

/** Thrown when a soopus-key call is refused with 401 and no fresh key could be minted. */
export class SoopusAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SoopusAuthError'
  }
}

/** Whether an error text reports an HTTP 401 (soopus CLI, tool_cli, LLM proxy shapes). */
export function isSoopusUnauthorizedText(text: unknown): boolean {
  return /\bHTTP 401\b|\b401 Unauthorized\b/i.test(String(text ?? ''))
}

/**
 * Records that `key` was refused with 401: it stops being offered (so
 * hasSoopusAuth() / ai:soopus-status report signed-out and the existing sign-in UI
 * appears) and the re-mint / re-login recovery starts. The invalidation is
 * synchronous, before the first await, so a caller can report the failure
 * right after this returns.
 */
export function noteSoopusKeyRejected(
  key: string,
  options: { allowLogin?: boolean } = {},
): Promise<SoopusRecoveryOutcome> {
  if (key) rejectedKeys.add(key)
  return recoverFromRejectedSoopusKey(key, options)
}

/**
 * For callers that used the soopus key outside this module (the Soopus LLM
 * proxy chat/stream): when `error` reports a 401, drop the key and start the
 * recovery in the background. Returns whether it was an auth failure.
 */
export function noteSoopusCallFailure(key: string, error: unknown): boolean {
  if (!key) return false
  const text = error instanceof Error ? error.message : String(error ?? '')
  if (!isSoopusUnauthorizedText(text)) return false
  void noteSoopusKeyRejected(key).catch(() => {})
  return true
}

/**
 * Runs `call` with the current key; on a 401 drops the key and, when the
 * stored session minted a replacement, retries exactly once with it.
 */
async function withKeyRecovery<T>(
  call: (key: string) => Promise<T>,
  options: { allowLogin?: boolean } = {},
): Promise<T> {
  const key = soopusApiKey()
  try {
    return await call(key)
  } catch (err) {
    if (!(err instanceof SoopusAuthError)) throw err
    const outcome = await noteSoopusKeyRejected(key, options)
    const next = soopusApiKey()
    if (outcome !== 'reminted' || !next || next === key) throw err
    return call(next)
  }
}

/** Test hook: forget rejected keys. */
export function resetSoopusRejectedKeys(): void {
  rejectedKeys.clear()
}

/**
 * Fires when the effective soopus key changes on disk — another Plot Docs-family
 * app re-logging in mints a new key and revokes the one this process holds.
 * Polls by path (watchFile): auth.json is replaced whole, and fs.watch misses
 * events for a moment after it is armed.
 */
export function watchSoopusApiKey(onChange: (key: string) => void, intervalMs = 2000): () => void {
  let last = soopusApiKey()
  const check = (): void => {
    reloadPlotdocsAuth()
    const key = soopusApiKey()
    if (key === last) return
    last = key
    onChange(key)
  }
  const files = [plotdocsAuthPath(), join(homedir(), '.genspark-tool-cli', 'config.json')]
  for (const f of files) watchFile(f, { persistent: false, interval: intervalMs }, check)
  return () => {
    for (const f of files) unwatchFile(f, check)
  }
}

/**
 * Whether soopus is usable (CLI installed and logged in / has a key). Callers use this to decide fallback.
 * Set AI_SEARCH_DISABLE_SOOPUS=1 to force-disable (test isolation / force Serper).
 */
export function hasSoopusAuth(): boolean {
  if (process.env.AI_SEARCH_DISABLE_SOOPUS === '1') return false
  return !!soopusApiKey() && resolveSoopusEntry() !== null
}

// ── Child-process proxy plumbing ────────────────────────────────────

// The main process's undici dispatcher (see the apps' proxy bootstraps) never
// reaches child processes: without forwarding they dial plotxyz.ai directly.
export { setSoopusProxyUrl, soopusProxyUrl } from './shared'

/**
 * env for soopus CLI children: Electron-as-Node plus proxy forwarding. The CLI
 * uses Node's built-in fetch, which ignores proxy env vars unless
 * NODE_USE_ENV_PROXY=1 (Node >= 24 — Electron 41 ships Node 24). Only
 * http(s):// proxies are forwarded; undici's env proxy cannot speak SOCKS.
 */
export function soopusChildEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, ELECTRON_RUN_AS_NODE: '1' }
  const proxy = [
    soopusProxyUrl(),
    base.HTTPS_PROXY,
    base.https_proxy,
    base.HTTP_PROXY,
    base.http_proxy,
    base.ALL_PROXY,
    base.all_proxy,
  ].find((v) => v && /^https?:\/\//.test(v))
  if (proxy) {
    // scrub inherited variants: undici's env proxy prefers the lowercase
    // names, so a leftover https_proxy/all_proxy would override the selection
    delete env.https_proxy
    delete env.http_proxy
    delete env.ALL_PROXY
    delete env.all_proxy
    env.NODE_USE_ENV_PROXY = '1'
    env.HTTPS_PROXY = proxy
    env.HTTP_PROXY = proxy
  }
  return env
}

// ── Low-level execution ─────────────────────────────────────────────

/**
 * soopus failures can arrive as a full HTML error page (a gateway or CDN
 * answering for an unavailable service) in the message or on stderr. That text
 * otherwise lands verbatim in CLI output, logs and agent context, so distill
 * it to one readable line: the HTTP status plus the page's visible text for an
 * HTML page, the [ERROR] lines for soopus's own multi-line logs, a plain clip
 * otherwise. Exported for tests.
 */
export function summarizeSoopusFailure(raw: unknown, fallback = 'unknown error'): string {
  const text = (typeof raw === 'string' ? raw : raw == null ? '' : String(raw)).trim()
  if (!text) return fallback
  const isHtml = /<!doctype|<html[\s>]|<\/html>|<body[\s>]/i.test(text)
  if (!isHtml) {
    // soopus logs mix [INFO] progress chatter, [ERROR] failures and crash noise;
    // prefer the [ERROR] lines, drop [INFO] ones, and keep it to one line
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    const errors = lines.filter((l) => /^\[ERROR\]/i.test(l))
    const kept = errors.length ? errors : lines.filter((l) => !/^\[INFO\]/i.test(l))
    const joined = (kept.length ? kept : lines).join(' ')
    return joined.length > 300 ? `${joined.slice(0, 300)}…` : joined
  }
  const plain = text
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^HTTP\s+\d{3}\s*:?\s*/i, '')
    .trim()
  const head = /HTTP\s+(\d{3})/.exec(text)?.[1]
  const label = head ? `HTTP ${head} (HTML error page)` : 'an HTML error page'
  if (!plain) return label
  return `${label}: ${plain.length > 200 ? `${plain.slice(0, 200)}…` : plain}`
}

/**
 * The balanced `{...}` / `[...]` block that starts at `start`, or null when it
 * never closes. String-aware, so braces and quotes inside string values do not
 * change the depth, and a block ends at its own closer rather than at the end
 * of the output (trailing log lines are left out).
 * `budget` is shared across candidates: each restarts at its own offset, so
 * without it the recovery pass is quadratic in the number of candidate lines.
 */
function jsonBlockAt(text: string, start: number, budget: ScanBudget): string | null {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    if (budget.chars <= 0) return null
    budget.chars--
    const c = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

interface ScanBudget {
  chars: number
}

// the output is model-controlled (bounded only by MAX_BUFFER), so the recovery
// scan gets a fixed total budget across all candidate openers
const MAX_RECOVERY_SCAN_CHARS = 4 * 1024 * 1024

/**
 * soopus output may have [INFO] log lines mixed in before or after the JSON;
 * find the first line that opens a JSON block and take that block, so a
 * pretty-printed payload is located in one linear scan instead of by reparsing
 * every line-bounded prefix.
 */
export function parseSoopusOutput(stdout: string): unknown {
  const trimmed = stdout.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* fall through to the recovery scan */
  }
  let offset = 0
  const budget: ScanBudget = { chars: MAX_RECOVERY_SCAN_CHARS }
  for (const line of trimmed.split('\n')) {
    if (budget.chars <= 0) break
    const opener = line.trimStart()[0]
    if (opener === '{' || opener === '[') {
      const block = jsonBlockAt(trimmed, offset + line.indexOf(opener), budget)
      if (block) {
        try {
          return JSON.parse(block)
        } catch {
          /* a log line that only looks like JSON; try the next opener */
        }
      }
    }
    offset += line.length + 1
  }
  throw new Error(`No JSON found in soopus output: ${summarizeSoopusFailure(stdout, '')}`)
}

/** `passive`: a status/background call — a rejected key is dropped but no browser login opens */
function runSoopus(
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
  passive = false,
): Promise<unknown> {
  const entry = resolveSoopusEntry()
  if (!entry) return Promise.reject(new Error('@genspark/cli is not installed'))
  return withKeyRecovery((key) => runSoopusOnce(entry, key, args, timeoutMs, signal), {
    allowLogin: !passive,
  })
}

function runSoopusOnce(
  entry: string,
  key: string,
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<unknown> {
  // inject the resolved key so the CLI bills the same identity as our direct HTTP calls
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [...electronCompatArgs(), entry, ...args, '--output', 'json'],
      {
        timeout: timeoutMs,
        maxBuffer: MAX_BUFFER,
        env: {
          ...soopusChildEnv(),
          ...(key ? { SOOPUS_API_KEY: key } : {}),
        },
        ...(signal ? { signal } : {}),
      },
      (err, stdout, stderr) => {
        if (err) {
          // stderr carries soopus's real reason ([ERROR] lines, or a whole HTML
          // page); err.message only repeats the command line, so use it alone
          // when stderr has nothing
          const stderrText = summarizeSoopusFailure(stderr, '')
          const message = stderrText
            ? `soopus failed: ${stderrText}`
            : summarizeSoopusFailure((err as Error).message, 'soopus failed')
          // the CLI prints a refused call's {status:'error', message:'HTTP 401…'} on stdout
          const unauthorized =
            !!key && (isSoopusUnauthorizedText(stdout) || isSoopusUnauthorizedText(stderr))
          reject(unauthorized ? new SoopusAuthError(message) : new Error(message))
          return
        }
        try {
          const result = parseSoopusOutput(String(stdout))
          const rec = asRecord(result)
          if (rec.status && rec.status !== 'ok') {
            const message = `soopus returned an error: ${summarizeSoopusFailure(rec.message ?? rec.status)}`
            reject(
              key && isSoopusUnauthorizedText(rec.message)
                ? new SoopusAuthError(message)
                : new Error(message),
            )
            return
          }
          resolve(result)
        } catch (parseErr) {
          reject(parseErr)
        }
      },
    )
  })
}

// ── Search ──────────────────────────────────────────────────────────

/** Max search results kept; longest snippet/title chars (prevents MB fields blowing context). */
export const MAX_SOOPUS_RESULTS = 20
export const MAX_SOOPUS_SNIPPET_CHARS = 2_000
const MAX_SOOPUS_URL_CHARS = 8_192

function normalizeMaxResults(n: number): number {
  if (!Number.isFinite(n)) return 6
  return Math.min(20, Math.max(1, Math.floor(n)))
}

function clipField(v: unknown, max = MAX_SOOPUS_SNIPPET_CHARS): string {
  const s = String(v ?? '')
  return s.length > max ? s.slice(0, max) : s
}

/** Parses the `soopus search` response shape data.organic_results[{title,link,snippet}] (exported for tests) */
export function parseSoopusWebSearch(
  raw: unknown,
  maxResults: number,
): { results: WebSearchResult[]; answer?: string } {
  const bounded = normalizeMaxResults(maxResults)
  const data = asRecord(asRecord(raw).data ?? raw)
  const organic: unknown[] = Array.isArray(data.organic_results) ? data.organic_results : []
  const results: WebSearchResult[] = organic.slice(0, bounded).map((item) => {
    const o = asRecord(item)
    return {
      title: clipField(o.title),
      url: clipField(o.link, MAX_SOOPUS_URL_CHARS),
      snippet: clipField(o.snippet),
    }
  })
  const answerRaw = typeof data.answer === 'string' && data.answer ? data.answer : undefined
  const answer =
    answerRaw !== undefined && answerRaw.length > MAX_SOOPUS_SNIPPET_CHARS
      ? `${answerRaw.slice(0, MAX_SOOPUS_SNIPPET_CHARS)}…`
      : answerRaw
  return answer !== undefined ? { results, answer } : { results }
}

export async function soopusWebSearch(
  query: string,
  maxResults = 6,
): Promise<{ results: WebSearchResult[]; answer?: string }> {
  const raw = await runSoopus(['search', query], SEARCH_TIMEOUT_MS)
  return parseSoopusWebSearch(raw, maxResults)
}

/** Parses the `soopus img-search` response shape data[{image_url,title,source,link,width,height}] (exported for tests) */
export function parseSoopusImageSearch(raw: unknown, maxResults: number): ImageSearchResult[] {
  const bounded = normalizeMaxResults(maxResults)
  const dataRaw = asRecord(raw).data
  const data: unknown[] = Array.isArray(dataRaw) ? dataRaw : []
  const images: ImageSearchResult[] = []
  for (const item of data) {
    const img = asRecord(item)
    const imageUrl = String(img.image_url ?? img.imageUrl ?? '')
    if (!imageUrl) continue
    if (isCopyrightHost(imageUrl)) continue
    const width = Number(img.width)
    const height = Number(img.height)
    const entry: ImageSearchResult = {
      title: String(img.title ?? ''),
      imageUrl,
      sourceUrl: String(img.link ?? ''),
      source: String(img.source ?? safeHost(img.link)),
    }
    if (Number.isFinite(width) && width > 0) entry.width = width
    if (Number.isFinite(height) && height > 0) entry.height = height
    images.push(entry)
    if (images.length >= bounded) break
  }
  return images
}

export async function soopusImageSearch(query: string, maxResults = 8): Promise<ImageSearchResult[]> {
  const raw = await runSoopus(['img-search', query], SEARCH_TIMEOUT_MS)
  return parseSoopusImageSearch(raw, maxResults)
}

// ── Image generation ────────────────────────────────────────────────

export interface SoopusGenerateImageOptions {
  /** Image description (English works better; text that must appear in the image stays verbatim) */
  prompt: string
  /** Generation model; defaults to the CLI default (nano-banana-2). Special-purpose: fal-bria-rmbg background removal, fal-ai/recraft-clarity-upscale upscaling, flux-pro/outpaint outpainting, fal-ai/image-editing/text-removal watermark text removal */
  model?: string
  /** Reference/edit-target image URLs (local paths also supported; the CLI uploads them automatically) */
  referenceImageUrls?: string[]
  /** 1:1 | 4:3 | 16:9 | 9:16 | 3:4 | 2:3 | 3:2 | auto */
  aspectRatio?: string
  /** auto | 0.5k | 1k | 2k | 3k | 4k */
  imageSize?: string
}

export interface SoopusGeneratedImage {
  /** Watermark-free image URL (preferred); can be downloaded and inserted directly */
  url: string
  taskId: string
}

/** Parses `soopus img` results: prefers data.generated_images[].image_urls_nowatermark (exported for tests) */
export function parseSoopusGeneratedImage(raw: unknown): SoopusGeneratedImage {
  const data = asRecord(asRecord(raw).data ?? raw)
  const img = asRecord(firstItem(data.generated_images ?? data.images ?? []))
  const url = firstItem(img.image_urls_nowatermark) ?? firstItem(img.image_urls) ?? img.url ?? ''
  if (!url) {
    throw new Error(`soopus image generation returned no result: ${JSON.stringify(raw).slice(0, 200)}`)
  }
  return { url: String(url), taskId: String(img.task_id ?? '') }
}

export async function soopusGenerateImage(
  options: SoopusGenerateImageOptions,
  signal?: AbortSignal,
): Promise<SoopusGeneratedImage> {
  const args = ['img', options.prompt]
  if (options.model) args.push('-m', options.model)
  if (options.referenceImageUrls?.length) args.push('--image_urls', ...options.referenceImageUrls)
  if (options.aspectRatio) args.push('--aspect_ratio', options.aspectRatio)
  if (options.imageSize) args.push('--image_size', options.imageSize)
  const raw = await runSoopus(args, GENERATE_TIMEOUT_MS, signal)
  const result = parseSoopusGeneratedImage(raw)
  // Bare soopus file URLs (/api/files/) return 403; swap for a signed direct link with a token
  // so later plain fetch downloads (e.g. insert_web_image) need no auth
  result.url = await soopusResolveDownloadUrl(result.url)
  return result
}

/**
 * Swaps a soopus file wrapper URL for an anonymously downloadable signed direct link (`soopus download`).
 * Non-soopus file URLs are returned as-is; on swap failure the URL is also returned as-is
 * (callers handle download failures themselves).
 */
export async function soopusResolveDownloadUrl(url: string): Promise<string> {
  if (!url.includes('/api/files/')) return url
  try {
    const raw = asRecord(await runSoopus(['download', url], SEARCH_TIMEOUT_MS))
    const downloadUrl = asRecord(raw.data).download_url ?? raw.download_url
    return downloadUrl ? String(downloadUrl) : url
  } catch {
    return url
  }
}

// ── Media analysis / transcription ──────────────────────────────────

/** Best-effort text extraction from soopus analysis-type command output (shape varies by task, so be lenient; exported for tests) */
export function extractSoopusText(raw: unknown): string {
  const data = asRecord(raw).data ?? raw
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    for (const key of [
      'analysis',
      'analysis_result',
      'result',
      'content',
      'text',
      'answer',
      'transcript',
    ]) {
      const v = (data as Record<string, unknown>)[key]
      if (typeof v === 'string' && v.trim()) return v
    }
  }
  return JSON.stringify(data ?? raw)
}

export interface SoopusAnalyzeMediaOptions {
  /** Media URLs or local paths (image/audio/video; the CLI uploads local files automatically) */
  mediaUrls: string[]
  /** Analysis requirements (in English): what info to extract and what it's for */
  requirements: string
}

export async function soopusAnalyzeMedia(
  options: SoopusAnalyzeMediaOptions,
  signal?: AbortSignal,
): Promise<string> {
  const args = [
    'media-analyze',
    '--media_urls',
    ...options.mediaUrls,
    '--requirements',
    options.requirements,
  ]
  const raw = await runSoopus(args, GENERATE_TIMEOUT_MS, signal)
  return extractSoopusText(raw)
}

export interface SoopusTranscribeOptions {
  /** Audio URLs or local paths */
  audioUrls: string[]
  /** Prompt (context / proper nouns; can improve recognition quality) */
  prompt?: string
  /** whisper-1 (default, with timestamps) | gemini-3-flash-preview | elevenlabs_scribe_v2 */
  model?: string
}

export async function soopusTranscribe(
  options: SoopusTranscribeOptions,
  signal?: AbortSignal,
): Promise<string> {
  const args = ['transcribe', '--audio_urls', ...options.audioUrls]
  if (options.prompt) args.push('--prompt', options.prompt)
  if (options.model) args.push('-m', options.model)
  const raw = await runSoopus(args, GENERATE_TIMEOUT_MS, signal)
  return extractSoopusText(raw)
}

// ── Past projects (Soopus web) ────────────────────────────────────

export interface SoopusPastProject {
  projectId: string
  /** raw project type, e.g. 'slides_agent_git' */
  type: string
  title: string
  /** creation time, ISO-like string from the API */
  ctime: string
  /** relative web URL, e.g. '/agents?id=...' — join with https://www.genspark.ai */
  projectUrl: string
}

export interface SoopusPastProjectsPage {
  projects: SoopusPastProject[]
  total: number
  hasMore: boolean
}

/**
 * Parses `soopus projects`. data.projects lacks project_url — it only appears in
 * session_state.past_projects — so take it from there, falling back to
 * deriving it from the project id. (exported for tests)
 */
export function parseSoopusPastProjects(raw: unknown): SoopusPastProjectsPage {
  const rec = asRecord(raw)
  const data = asRecord(rec.data ?? raw)
  const urlById = new Map<string, string>()
  const sessionProjects = asRecord(asRecord(rec.session_state).past_projects).projects
  if (Array.isArray(sessionProjects)) {
    for (const item of sessionProjects) {
      const p = asRecord(item)
      if (p.project_id && typeof p.project_url === 'string' && p.project_url) {
        urlById.set(String(p.project_id), p.project_url)
      }
    }
  }
  const listRaw: unknown[] = Array.isArray(data.projects) ? data.projects : []
  const projects: SoopusPastProject[] = []
  for (const item of listRaw) {
    const p = asRecord(item)
    const projectId = String(p.project_id ?? '')
    if (!projectId) continue
    projects.push({
      projectId,
      type: String(p.type ?? ''),
      title: String(p.title ?? ''),
      ctime: String(p.ctime ?? ''),
      projectUrl: urlById.get(projectId) ?? `/agents?id=${projectId}`,
    })
  }
  const total = Number(data.total)
  return {
    projects,
    total: Number.isFinite(total) ? total : projects.length,
    hasMore: data.has_more === true,
  }
}

export interface SoopusListPastProjectsOptions {
  /** 'slides' | 'docs' | 'sheets' | ...; omit for all kinds */
  artifactTypes?: string[]
  /** page size, CLI default 20, max 100 */
  limit?: number
  offset?: number
  signal?: AbortSignal
}

/** Lists the user's own past Soopus web projects, newest first (`soopus projects`). */
export async function soopusListPastProjects(
  options: SoopusListPastProjectsOptions = {},
): Promise<SoopusPastProjectsPage> {
  const args = ['projects']
  if (options.artifactTypes?.length) args.push('--artifact_types', ...options.artifactTypes)
  if (options.limit !== undefined) args.push('--limit', String(options.limit))
  if (options.offset) args.push('--offset', String(options.offset))
  // background sync: never the reason a browser window opens
  const raw = await runSoopus(args, SEARCH_TIMEOUT_MS, options.signal, true)
  return parseSoopusPastProjects(raw)
}

export interface SoopusLoginInfo {
  email: string
  plan: string
  creditBalance?: number
}

/** Current login info; null when not logged in */
export async function soopusLoginInfo(): Promise<SoopusLoginInfo | null> {
  try {
    const raw = await runSoopus(['login-info'], SEARCH_TIMEOUT_MS, undefined, true)
    const d = asRecord(asRecord(raw).data ?? raw)
    if (!d.email) return null
    const info: SoopusLoginInfo = {
      email: String(d.email),
      plan: String(d.plan ?? d.personal_plan ?? ''),
    }
    const balance = Number(d.credit_balance)
    if (Number.isFinite(balance)) info.creditBalance = balance
    return info
  } catch {
    return null
  }
}
