// Pure filesystem/version logic for the updates center. Kept free of Electron
// imports so the scanner, manifest parser, notification parser, version
// comparison and executable replacement can be unit-tested on any platform.

import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { watch, type FSWatcher } from 'node:fs'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import type {
  GithubReleaseInfo,
  InAppNotification,
  UpdatePackage,
} from '../shared/updates-center-api'

const PACKAGE_EXTENSIONS = new Set([
  '.exe',
  '.msi',
  '.msix',
  '.appx',
  '.zip',
  '.7z',
  '.dmg',
  '.pkg',
  '.appimage',
  '.deb',
  '.rpm',
])

const IGNORED_JSON_NAMES = new Set([
  'package.json',
  'package-lock.json',
  'state.json',
  'update-state.json',
  'read-state.json',
  'tsconfig.json',
])

const INSTALLER_NAME = /(?:^|[-_.\s])(setup|installer|uninstall|unins\d*)(?:[-_.\s]|$)/i

export interface UpdateManifestEntry {
  file: string | null
  version: string | null
  sha256: string | null
  releaseNotes: string | null
  publishedAt: string | null
  htmlUrl: string | null
}

export interface ScanUpdateOptions {
  dir: string
  currentVersion: string
  now?: number
  /** optional Windows PE FileVersion reader (injected so tests stay offline) */
  readFileVersion?: (path: string) => Promise<string | null>
}

export interface ReplaceExecutableInput {
  currentExePath: string
  updatePath: string
  backupDir: string
  currentVersion: string
  now?: number
}

export interface ReplaceExecutableResult {
  ok: boolean
  backupPath?: string
  oldPath?: string
  error?: string
}

export interface NotificationFileState {
  read?: Record<string, boolean>
  deleted?: Record<string, string>
  hashes?: Record<string, string>
}

export interface ScanNotificationOptions {
  dir: string
  sourceKey: string
  state: NotificationFileState
  now?: number
}

/** Normalize a version/tag to a bare dotted version, or null when it is not one. */
export function normalizeVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let text = value.trim()
  if (!text || text.length > 80) return null
  text = text.replace(/^refs\/tags\//i, '').replace(/^v/i, '')
  const match = /^(\d+(?:\.\d+){1,3}(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?)(?:\+[0-9A-Za-z.-]+)?$/.exec(
    text,
  )
  return match?.[1] ?? null
}

/** Find a version in a file name such as Plot-Docs-1.2.3.exe or app-v2.0.0-beta.1.dmg. */
export function versionFromFileName(fileName: string): string | null {
  let name = basename(fileName)
  const extension = extname(name).toLowerCase()
  if (PACKAGE_EXTENSIONS.has(extension)) name = name.slice(0, -extension.length)
  const match = /(?:^|[^0-9A-Za-z])v?(\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?)(?=[^0-9A-Za-z]|$)/.exec(
    name,
  )
  return match?.[1] ?? null
}

function versionParts(version: string): { numbers: number[]; prerelease: string[] } {
  const [core, prerelease = ''] = version.split('-', 2)
  const numbers = core.split('.').map((part) => Number.parseInt(part, 10) || 0)
  return {
    numbers: [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 0],
    prerelease: prerelease ? prerelease.split('.') : [],
  }
}

/** Semver-ish comparison that also accepts a missing patch (1.2 == 1.2.0). */
export function compareVersions(left: string, right: string): number {
  const a = versionParts(normalizeVersion(left) ?? left)
  const b = versionParts(normalizeVersion(right) ?? right)
  for (let i = 0; i < 4; i += 1) {
    if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] < b.numbers[i] ? -1 : 1
  }
  // A release outranks a prerelease of the same core version.
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1
  if (b.prerelease.length === 0 && a.prerelease.length > 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < length; i += 1) {
    const x = a.prerelease[i]
    const y = b.prerelease[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) return Number(x) < Number(y) ? -1 : 1
    if (xn !== yn) return xn ? -1 : 1
    return x < y ? -1 : 1
  }
  return 0
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}

/** Accept sha256:<hex>, sha256-<hex>, or a bare 64-char hex digest. */
export function normalizeSha256(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  const match = /^(?:sha256[:_-]?)?([0-9a-f]{64})$/.exec(text)
  return match?.[1] ?? null
}

export function isPackageFileName(fileName: string): boolean {
  return PACKAGE_EXTENSIONS.has(extname(fileName).toLowerCase())
}

export function isManifestFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (!lower.endsWith('.json')) return false
  if (lower.startsWith('.')) return false
  if (lower.endsWith('.example.json') || lower.endsWith('.sample.json')) return false
  return !IGNORED_JSON_NAMES.has(lower)
}

/** A portable executable can replace the running app; installers are never run automatically. */
export function isInstallablePackageName(fileName: string): boolean {
  return extname(fileName).toLowerCase() === '.exe' && !INSTALLER_NAME.test(basename(fileName))
}

export function safeFileName(value: string): string {
  let name = basename(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim()
  if (!name) name = 'update.exe'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`
  if (name.length > 180) {
    const ext = extname(name)
    name = `${name.slice(0, 180 - ext.length)}${ext}`
  }
  return name
}

export function packageId(filePath: string, size: number, modifiedAt: number): string {
  return `pkg_${createHash('sha1')
    .update(`${resolve(filePath)}\0${size}\0${Math.round(modifiedAt)}`)
    .digest('hex')
    .slice(0, 20)}`
}

export function isPathInside(root: string, candidate: string): boolean {
  const rootPath = resolve(root)
  const target = resolve(candidate)
  return target === rootPath || target.startsWith(`${rootPath}${sep}`)
}

export async function sha256File(filePath: string): Promise<string> {
  const { createReadStream } = await import('node:fs')
  return new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolvePromise(hash.digest('hex')))
  })
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function manifestEntry(raw: unknown): UpdateManifestEntry | null {
  const obj = objectValue(raw)
  if (!obj) return null
  const file = stringValue(obj.file, obj.fileName, obj.path, obj.asset)
  const version = normalizeVersion(obj.version ?? obj.tag ?? obj.tag_name)
  const sha256 = normalizeSha256(obj.sha256 ?? obj.checksum ?? obj.digest)
  const releaseNotes = stringValue(
    obj.releaseNotes,
    obj.notes,
    obj.changelog,
    obj.body,
    obj.description,
  )
  const publishedAt = stringValue(obj.publishedAt, obj.releasedAt, obj.date)
  const htmlUrl = stringValue(obj.htmlUrl, obj.html_url, obj.url)
  if (!file && !version && !sha256 && !releaseNotes) return null
  return {
    file: file ? basename(file) : null,
    version,
    sha256,
    releaseNotes: releaseNotes ? releaseNotes.slice(0, 20_000) : null,
    publishedAt,
    htmlUrl,
  }
}

/**
 * Read an update manifest. Supported shapes:
 *   { version, file, sha256, notes }
 *   { updates: [ ... ] } / { files: [ ... ] } / [ ... ]
 * A manifest without `file` applies to every package in the folder.
 */
export function parseUpdateManifest(raw: unknown): UpdateManifestEntry[] {
  const root = objectValue(raw)
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root?.updates)
      ? root.updates
      : Array.isArray(root?.files)
        ? root.files
        : [raw]
  const entries: UpdateManifestEntry[] = []
  for (const item of list) {
    const entry = manifestEntry(item)
    if (entry) entries.push(entry)
  }
  return entries
}

export function sortPackages(packages: UpdatePackage[]): UpdatePackage[] {
  const rank: Record<UpdatePackage['status'], number> = {
    downloading: 0,
    downloaded: 1,
    available: 2,
    failed: 3,
    installing: 4,
    installed: 5,
  }
  return [...packages].sort((a, b) => {
    const status = rank[a.status] - rank[b.status]
    if (status !== 0) return status
    if (a.newer !== b.newer) return a.newer ? -1 : 1
    return b.modifiedAt - a.modifiedAt
  })
}

/** Scan /updates for executable/package files and matching JSON manifests. */
export async function scanUpdateDirectory(options: ScanUpdateOptions): Promise<UpdatePackage[]> {
  const { dir, currentVersion, readFileVersion } = options
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const manifestEntries: UpdateManifestEntry[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !isManifestFileName(entry.name)) continue
    try {
      const text = await readFile(join(dir, entry.name), 'utf8')
      if (text.length > 1_000_000) continue
      manifestEntries.push(...parseUpdateManifest(JSON.parse(text) as unknown))
    } catch {
      // A half-written manifest is expected while the user saves it; the next
      // watcher event rescans it. Never fail the whole folder for one file.
    }
  }
  const byFile = new Map<string, UpdateManifestEntry>()
  const wildcard = manifestEntries.find((entry) => !entry.file) ?? null
  for (const entry of manifestEntries) {
    if (entry.file) byFile.set(entry.file.toLowerCase(), entry)
  }

  const packages: UpdatePackage[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !isPackageFileName(entry.name)) continue
    const filePath = join(dir, entry.name)
    let info
    try {
      info = await stat(filePath)
    } catch {
      continue
    }
    if (!info.isFile()) continue
    const manifest = byFile.get(entry.name.toLowerCase()) ?? wildcard
    let version = manifest?.version ?? versionFromFileName(entry.name)
    if (!version && extname(entry.name).toLowerCase() === '.exe' && readFileVersion) {
      try {
        version = normalizeVersion(await readFileVersion(filePath))
      } catch {
        version = null
      }
    }
    const newer = version ? isNewerVersion(version, currentVersion) : true
    packages.push({
      id: packageId(filePath, info.size, info.mtimeMs),
      fileName: entry.name,
      path: filePath,
      version,
      modifiedAt: info.mtimeMs,
      size: info.size,
      source: 'local',
      status: 'available',
      newer,
      sha256: manifest?.sha256 ?? null,
      hashVerified: false,
      releaseNotes: manifest?.releaseNotes ?? null,
      htmlUrl: manifest?.htmlUrl ?? null,
      publishedAt: manifest?.publishedAt ?? null,
      progress: null,
      transferred: null,
      error: null,
      installedAt: null,
      backupPath: null,
      signature: 'unknown',
      installable: isInstallablePackageName(entry.name),
    })
  }
  return sortPackages(packages)
}

function isoDate(value: unknown, fallbackMs: number): string {
  let ms = fallbackMs
  if (typeof value === 'number' && Number.isFinite(value)) {
    ms = value < 1_000_000_000_000 ? value * 1000 : value
  } else if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) ms = parsed
  }
  return new Date(ms).toISOString()
}

function notificationType(value: unknown): InAppNotification['type'] {
  return value === 'success' ||
    value === 'warning' ||
    value === 'error' ||
    value === 'update' ||
    value === 'info'
    ? value
    : 'info'
}

function notificationHash(
  title: string,
  message: string,
  date: string,
  type: InAppNotification['type'],
): string {
  return createHash('sha1').update(`${title}\0${message}\0${date}\0${type}`).digest('hex')
}

function notificationItem(
  raw: unknown,
  fileName: string,
  mtimeMs: number,
  sourceKey: string,
  index: number,
): InAppNotification | null {
  const obj = objectValue(raw)
  if (!obj) return null
  const title = stringValue(obj.title, obj.heading, obj.subject)
  const message = stringValue(obj.message, obj.body, obj.text, obj.content)
  if (!title && !message) return null
  const safeTitle = (title ?? 'Notification').slice(0, 300)
  const safeMessage = (message ?? '').slice(0, 20_000)
  const date = isoDate(obj.date ?? obj.createdAt ?? obj.timestamp, mtimeMs)
  const type = notificationType(obj.type ?? obj.kind)
  const explicitId = stringValue(obj.id)
  const seed = `${explicitId ?? ''}|${safeTitle}|${safeMessage}|${date}|${index}`
  const suffix = explicitId
    ? explicitId.replace(/[^0-9A-Za-z_.-]/g, '_').slice(0, 80)
    : notificationHash(safeTitle, safeMessage, date, type).slice(0, 16)
  const createdAt =
    typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt)
      ? obj.createdAt < 1_000_000_000_000
        ? obj.createdAt * 1000
        : obj.createdAt
      : mtimeMs
  return {
    id: `${sourceKey}:${fileName}:${suffix || index}`,
    title: safeTitle,
    message: safeMessage,
    date,
    type,
    read: obj.read === true,
    sourceFile: fileName,
    createdAt,
    updatedAt: mtimeMs,
  }
}

/**
 * Parse one notification file. A file may contain one object, an array, or
 * { notifications: [...] }; every item becomes one in-app notification.
 */
export function parseNotificationDocument(
  raw: unknown,
  fileName: string,
  mtimeMs: number,
  sourceKey = '',
): InAppNotification[] {
  const root = objectValue(raw)
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root?.notifications)
      ? root.notifications
      : [raw]
  const notifications: InAppNotification[] = []
  const seen = new Set<string>()
  list.forEach((item, index) => {
    const parsed = notificationItem(item, basename(fileName), mtimeMs, sourceKey, index)
    if (!parsed) return
    let id = parsed.id
    let counter = 1
    while (seen.has(id)) id = `${parsed.id}-${counter++}`
    seen.add(id)
    notifications.push({ ...parsed, id })
  })
  return notifications
}

export function notificationContentHash(notification: InAppNotification): string {
  return notificationHash(
    notification.title,
    notification.message,
    notification.date,
    notification.type,
  )
}

/** Scan every .json notification file directly inside the folder. */
export async function scanNotificationDirectory(
  options: ScanNotificationOptions,
): Promise<InAppNotification[]> {
  const { dir, sourceKey, state } = options
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const notifications: InAppNotification[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const lower = entry.name.toLowerCase()
    if (!lower.endsWith('.json')) continue
    if (lower.startsWith('.') || lower === 'state.json' || lower === 'read-state.json') continue
    if (lower.endsWith('.example.json') || lower.endsWith('.sample.json')) continue
    const filePath = join(dir, entry.name)
    let info
    try {
      info = await stat(filePath)
      if (info.size > 1_000_000) continue
      const text = await readFile(filePath, 'utf8')
      const parsed = parseNotificationDocument(JSON.parse(text) as unknown, entry.name, info.mtimeMs, sourceKey)
      for (const notification of parsed) {
        const hash = notificationContentHash(notification)
        const knownHash = state.hashes?.[notification.id]
        if (state.deleted?.[notification.id] === hash) continue
        const read = state.read?.[notification.id] === true && knownHash === hash
        notifications.push({
          ...notification,
          read: notification.read || read,
          sourceFile: filePath,
        })
      }
    } catch {
      // Ignore malformed/partially-written files; the next watcher event retries.
    }
  }
  return notifications.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

/**
 * Watch one folder for added/changed/removed files. Debounced because a single
 * save can produce several rename/change events. Returns a close function.
 */
export function watchDirectory(dir: string, onChange: () => void): () => void {
  let watcher: FSWatcher | null = null
  let timer: NodeJS.Timeout | null = null
  let retry: NodeJS.Timeout | null = null
  let closed = false

  const schedule = (): void => {
    if (closed) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (!closed) onChange()
    }, 250)
  }

  const start = (): void => {
    if (closed) return
    try {
      watcher = watch(dir, { persistent: false }, schedule)
      watcher.on('error', () => {
        watcher?.close()
        watcher = null
        if (!closed) {
          retry = setTimeout(start, 1500)
        }
      })
    } catch {
      if (!closed) retry = setTimeout(start, 1500)
    }
  }

  start()
  return () => {
    closed = true
    if (timer) clearTimeout(timer)
    if (retry) clearTimeout(retry)
    watcher?.close()
    watcher = null
  }
}

/**
 * Replace the running executable with a downloaded one, keeping a timestamped
 * copy in backupDir. On Windows a running exe may be renamed, so the order is:
 * copy backup -> rename current aside -> copy new into place. If the final copy
 * fails, the old executable is renamed back.
 */
export async function replaceExecutable(
  input: ReplaceExecutableInput,
): Promise<ReplaceExecutableResult> {
  const { currentExePath, updatePath, backupDir, currentVersion } = input
  const now = input.now ?? Date.now()
  if (resolve(currentExePath) === resolve(updatePath)) {
    return { ok: false, error: 'The update file is the running executable.' }
  }
  try {
    const updateInfo = await stat(updatePath)
    if (!updateInfo.isFile()) return { ok: false, error: 'The update package is not a file.' }
  } catch {
    return { ok: false, error: 'The update package no longer exists.' }
  }
  await mkdir(backupDir, { recursive: true })
  const stamp = new Date(now).toISOString().replace(/[:.]/g, '-')
  const ext = extname(currentExePath) || '.exe'
  const version = normalizeVersion(currentVersion) ?? 'unknown'
  let backupPath = join(backupDir, `Plot-Docs-${version}-${stamp}${ext}`)
  for (let suffix = 1; suffix < 100; suffix += 1) {
    try {
      await stat(backupPath)
      backupPath = join(backupDir, `Plot-Docs-${version}-${stamp}-${suffix}${ext}`)
    } catch {
      break
    }
  }
  const oldPath = `${currentExePath}.old-${stamp}`
  try {
    await copyFile(currentExePath, backupPath)
    await rename(currentExePath, oldPath)
    try {
      await copyFile(updatePath, currentExePath)
    } catch (error) {
      await rename(oldPath, currentExePath).catch(() => undefined)
      throw error
    }
    return { ok: true, backupPath, oldPath }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      backupPath,
    }
  }
}

/** Remove `.old-*` executables left by a previous replacement (best effort). */
export async function cleanupOldExecutables(currentExePath: string): Promise<void> {
  const dir = dirname(resolve(currentExePath))
  const prefix = `${basename(currentExePath)}.old-`
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.startsWith(prefix))
        .map((entry) => rm(join(dir, entry.name), { force: true }).catch(() => undefined)),
    )
  } catch {
    // not fatal: the old file is only a cleanup leftover
  }
}

const GITHUB_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'github-releases.githubusercontent.com',
  'release-assets.githubusercontent.com',
])

export function isAllowedGithubAssetUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    const host = url.hostname.toLowerCase()
    return GITHUB_DOWNLOAD_HOSTS.has(host) || host.endsWith('.githubusercontent.com')
  } catch {
    return false
  }
}

function releaseAssetInstallable(name: string, platform: NodeJS.Platform): boolean {
  if (platform === 'win32') return isInstallablePackageName(name)
  if (platform === 'linux') return extname(name).toLowerCase() === '.appimage'
  if (platform === 'darwin') return extname(name).toLowerCase() === '.dmg'
  return false
}

function chooseReleaseAsset(
  rawAssets: unknown,
  platform: NodeJS.Platform,
  arch: string,
): GithubReleaseInfo['asset'] {
  if (!Array.isArray(rawAssets)) return null
  const candidates = rawAssets
    .map((raw) => objectValue(raw))
    .filter((asset): asset is Record<string, unknown> => Boolean(asset))
    .map((asset) => {
      const name = stringValue(asset.name)
      const url = stringValue(asset.browser_download_url, asset.downloadUrl)
      const size = typeof asset.size === 'number' && Number.isFinite(asset.size) ? asset.size : 0
      const sha256 = normalizeSha256(asset.digest ?? asset.sha256)
      return name && url && isAllowedGithubAssetUrl(url)
        ? { name: safeFileName(name), url, size, sha256 }
        : null
    })
    .filter(
      (asset): asset is { name: string; url: string; size: number; sha256: string | null } =>
        Boolean(asset),
    )

  const extensionRank = (name: string): number => {
    const ext = extname(name).toLowerCase()
    if (platform === 'win32') return ext === '.exe' ? 0 : 99
    if (platform === 'linux') return ext === '.appimage' ? 0 : ext === '.deb' ? 1 : ext === '.rpm' ? 2 : 99
    if (platform === 'darwin') return ext === '.dmg' ? 0 : ext === '.pkg' ? 1 : 99
    return 99
  }
  const archRank = (name: string): number => {
    const lower = name.toLowerCase()
    if (platform !== 'darwin') return 0
    if (arch === 'arm64') return lower.includes('arm64') || lower.includes('aarch64') ? 0 : 1
    return lower.includes('x64') || lower.includes('intel') ? 0 : 1
  }
  const portableRank = (name: string): number => (isInstallablePackageName(name) ? 0 : 1)
  const sorted = [...candidates].sort((a, b) => {
    const ext = extensionRank(a.name) - extensionRank(b.name)
    if (ext !== 0) return ext
    const archDiff = archRank(a.name) - archRank(b.name)
    if (archDiff !== 0) return archDiff
    return portableRank(a.name) - portableRank(b.name)
  })
  const chosen = sorted.find((asset) => extensionRank(asset.name) < 99)
  if (!chosen) return null
  return {
    name: chosen.name,
    size: chosen.size,
    downloadUrl: chosen.url,
    sha256: chosen.sha256,
    installable: releaseAssetInstallable(chosen.name, platform),
  }
}

/** Parse GitHub's /releases/latest payload into the small state the UI needs. */
export function parseGithubRelease(
  raw: unknown,
  currentVersion: string,
  platform: NodeJS.Platform,
  arch: string,
): GithubReleaseInfo | null {
  const obj = objectValue(raw)
  if (!obj) return null
  const tag = stringValue(obj.tag_name, obj.name)
  const version = normalizeVersion(tag)
  if (!tag || !version) return null
  const htmlUrl = stringValue(obj.html_url)
  const safeHtmlUrl =
    htmlUrl && /^https:\/\/github\.com\//i.test(htmlUrl) ? htmlUrl : ''
  return {
    version,
    tag,
    name: stringValue(obj.name) ?? tag,
    releaseNotes: (stringValue(obj.body) ?? '').slice(0, 20_000),
    publishedAt: isoDate(obj.published_at, Date.now()),
    htmlUrl: safeHtmlUrl,
    newer: isNewerVersion(version, currentVersion),
    asset: chooseReleaseAsset(obj.assets, platform, arch),
  }
}

/** Human-readable byte size shared by main-side logs and the renderer. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`
}
