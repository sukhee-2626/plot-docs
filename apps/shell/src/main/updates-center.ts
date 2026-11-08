// Real-time updates + notifications center.
//
// /updates and /notifications are ordinary folders, watched with fs.watch.
// GitHub is checked on launch, on demand, and on window focus (throttled) —
// never with a continuous polling loop. Downloads are streamed to a .part file,
// checksum-verified when the release publishes a digest, and only replaced after
// the user explicitly confirms. The previous executable is always backed up.

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, readFileSync } from 'node:fs'
import { appendFile, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { once } from 'node:events'
import { dirname, extname, join, resolve } from 'node:path'
import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { atomicWriteFile } from './atomic-write'
import {
  cleanupOldExecutables,
  compareVersions,
  formatBytes,
  isAllowedGithubAssetUrl,
  isPathInside,
  normalizeVersion,
  notificationContentHash,
  packageId,
  parseGithubRelease,
  replaceExecutable,
  safeFileName,
  scanNotificationDirectory,
  scanUpdateDirectory,
  sha256File,
  sortPackages,
  watchDirectory,
  type NotificationFileState,
} from './updates-center-core'
import {
  UPDATES_CENTER_CHANNELS,
  isUpdatesFolderKind,
  type GithubReleaseInfo,
  type InAppNotification,
  type InstallUpdateInput,
  type UpdateActionResult,
  type UpdateHistoryEntry,
  type UpdatePackage,
  type UpdatesCenterState,
  type UpdatesFolderKind,
  type UpdateSignatureStatus,
} from '../shared/updates-center-api'

const DEFAULT_GITHUB_REPO = 'sukhee-2626/plot-docs'
const GITHUB_CHECK_THROTTLE_MS = 15 * 60 * 1000
const GITHUB_REQUEST_TIMEOUT_MS = 20_000
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024 * 1024
const MAX_STATE_BYTES = 1_000_000
const HISTORY_LIMIT = 100
const LOG_LIMIT_BYTES = 1_000_000

interface InstalledRecord {
  at: number
  version: string | null
  backupPath: string | null
  signature: UpdateSignatureStatus
}

interface PersistedUpdateState {
  history: UpdateHistoryEntry[]
  installed: Record<string, InstalledRecord>
}

export interface UpdatesCenterOptions {
  currentVersion?: string
  isPackaged?: boolean
  platform?: NodeJS.Platform
  arch?: string
  userDataDir?: string
  repoRoot?: string | null
  updatesDir?: string
  notificationsDir?: string
  githubRepo?: string
  getWindow: () => BrowserWindow | null
  showWindow?: () => void
  fetchImpl?: typeof fetch
  now?: () => number
  currentExePath?: string
  checkSignature?: (filePath: string) => Promise<UpdateSignatureStatus>
  readFileVersion?: (filePath: string) => Promise<string | null>
  relaunch?: (options: { execPath: string; args: string[] }) => void
  quit?: () => void
}

export interface UpdatesCenter {
  start(): Promise<void>
  dispose(): void
  getState(): Promise<UpdatesCenterState>
  refresh(): Promise<UpdatesCenterState>
  checkGithub(): Promise<UpdatesCenterState>
  maybeCheckGithub(): Promise<UpdatesCenterState>
  downloadGithub(): Promise<UpdateActionResult>
  installUpdate(input: InstallUpdateInput): Promise<UpdateActionResult>
  restartApp(): Promise<UpdateActionResult>
  markRead(id: string): Promise<UpdatesCenterState>
  markAllRead(): Promise<UpdatesCenterState>
  deleteNotification(id: string): Promise<UpdatesCenterState>
  openFolder(kind: UpdatesFolderKind): Promise<boolean>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRepo(value: string | undefined): string | null {
  const repo = (value ?? DEFAULT_GITHUB_REPO).trim()
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ? repo : null
}

function findRepoRoot(): string | null {
  if (app.isPackaged) return null
  let dir = app.getAppPath()
  for (let depth = 0; depth < 6; depth += 1) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        name?: unknown
      }
      if (pkg.name === 'plot-docs') return dir
    } catch {
      // keep walking; an app path can be an asar or a build directory
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function parseHistory(raw: unknown): UpdateHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const entries: UpdateHistoryEntry[] = []
  for (const item of raw) {
    if (!isObject(item)) continue
    if (
      typeof item.id !== 'string' ||
      typeof item.fileName !== 'string' ||
      typeof item.status !== 'string' ||
      typeof item.at !== 'number' ||
      typeof item.message !== 'string'
    ) {
      continue
    }
    entries.push({
      id: item.id,
      version: typeof item.version === 'string' ? item.version : null,
      fileName: item.fileName,
      status: item.status as UpdateHistoryEntry['status'],
      at: item.at,
      message: item.message,
      backupPath: typeof item.backupPath === 'string' ? item.backupPath : null,
    })
  }
  return entries.slice(0, HISTORY_LIMIT)
}

function parseInstalled(raw: unknown): Record<string, InstalledRecord> {
  if (!isObject(raw)) return {}
  const records: Record<string, InstalledRecord> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isObject(value) || typeof value.at !== 'number') continue
    records[id] = {
      at: value.at,
      version: typeof value.version === 'string' ? value.version : null,
      backupPath: typeof value.backupPath === 'string' ? value.backupPath : null,
      signature:
        value.signature === 'valid' ||
        value.signature === 'invalid' ||
        value.signature === 'unsigned'
          ? value.signature
          : 'unknown',
    }
  }
  return records
}

function parseNotificationState(raw: unknown): NotificationFileState {
  if (!isObject(raw)) return { read: {}, deleted: {}, hashes: {} }
  const read: Record<string, boolean> = {}
  const deleted: Record<string, string> = {}
  const hashes: Record<string, string> = {}
  if (isObject(raw.read)) {
    for (const [id, value] of Object.entries(raw.read)) {
      if (value === true) read[id] = true
    }
  }
  if (isObject(raw.deleted)) {
    for (const [id, value] of Object.entries(raw.deleted)) {
      if (typeof value === 'string') deleted[id] = value
    }
  }
  if (isObject(raw.hashes)) {
    for (const [id, value] of Object.entries(raw.hashes)) {
      if (typeof value === 'string') hashes[id] = value
    }
  }
  return { read, deleted, hashes }
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    const info = await stat(filePath)
    if (!info.isFile() || info.size > MAX_STATE_BYTES) return null
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown
  } catch {
    return null
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteFile(filePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'))
}

function runPowerShell(script: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 15_000, windowsHide: true, maxBuffer: 64 * 1024 },
      (error, stdout) => {
        if (error) reject(error)
        else resolvePromise(String(stdout ?? '').trim())
      },
    )
  })
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export async function readWindowsFileVersion(filePath: string): Promise<string | null> {
  if (process.platform !== 'win32') return null
  try {
    const output = await runPowerShell(
      `(Get-Item -LiteralPath ${quotePowerShell(filePath)}).VersionInfo.FileVersion`,
    )
    return normalizeVersion(output)
  } catch {
    return null
  }
}

export async function checkAuthenticode(filePath: string): Promise<UpdateSignatureStatus> {
  if (process.platform !== 'win32') return 'unknown'
  try {
    const output = await runPowerShell(
      `$s = Get-AuthenticodeSignature -LiteralPath ${quotePowerShell(filePath)}; $s.Status`,
    )
    if (output === 'Valid') return 'valid'
    if (output === 'NotSigned') return 'unsigned'
    return 'invalid'
  } catch {
    return 'unknown'
  }
}

function releaseVersionLabel(release: GithubReleaseInfo): string {
  return `v${release.version}`
}

function emptyState(
  currentVersion: string,
  platform: string,
  arch: string,
  updatesDir: string,
  notificationsDir: string,
  updateDirs: string[],
  notificationDirs: string[],
): UpdatesCenterState {
  return {
    currentVersion,
    platform,
    arch,
    updatesDir,
    notificationsDir,
    updates: [],
    notifications: [],
    unreadCount: 0,
    updateAvailable: false,
    latestVersion: null,
    github: null,
    githubChecking: false,
    githubError: null,
    lastCheckedAt: null,
    history: [],
    restartRequired: false,
    updateDirs,
    notificationDirs,
  }
}

class UpdatesCenterService implements UpdatesCenter {
  private readonly options: UpdatesCenterOptions
  private readonly currentVersion: string
  private readonly platform: NodeJS.Platform
  private readonly arch: string
  private readonly isPackaged: boolean
  private readonly now: () => number
  private readonly githubRepo: string | null
  private readonly primaryUpdatesDir: string
  private readonly primaryNotificationsDir: string
  private readonly candidateUpdateDirs: string[]
  private readonly candidateNotificationDirs: string[]
  private activeUpdateDirs: string[] = []
  private activeNotificationDirs: string[] = []
  private readonly state: UpdatesCenterState
  private updateState: PersistedUpdateState = { history: [], installed: {} }
  private notificationState: NotificationFileState = { read: {}, deleted: {}, hashes: {} }
  private readonly runtime = new Map<string, Partial<UpdatePackage>>()
  private readonly synthetic = new Map<string, UpdatePackage>()
  private readonly watchers: Array<() => void> = []
  private readonly nativeNotifications = new Set<Notification>()
  private startPromise: Promise<void> | null = null
  private started = false
  private disposed = false
  private scanPromise: Promise<void> | null = null
  private scanRequested = false
  private githubInFlight: Promise<UpdatesCenterState> | null = null
  private downloadInFlight: Promise<UpdateActionResult> | null = null
  private githubAbort: AbortController | null = null
  private downloadAbort: AbortController | null = null
  private githubTimer: NodeJS.Timeout | null = null
  private knownNotificationIds = new Set<string>()
  private knownUpdateKeys = new Set<string>()
  private initialScan = true
  private restartRequired = false

  constructor(options: UpdatesCenterOptions) {
    this.options = options
    this.currentVersion = options.currentVersion ?? app.getVersion()
    this.platform = options.platform ?? process.platform
    this.arch = options.arch ?? process.arch
    this.isPackaged = options.isPackaged ?? app.isPackaged
    this.now = options.now ?? (() => Date.now())
    this.githubRepo = normalizeRepo(
      options.githubRepo ??
        process.env.PLOTDOCS_GITHUB_REPO ??
        DEFAULT_GITHUB_REPO,
    )

    const userDataDir = options.userDataDir ?? app.getPath('userData')
    const repoRoot = options.repoRoot === undefined ? findRepoRoot() : options.repoRoot
    const envUpdatesDir = process.env.PLOTDOCS_UPDATES_DIR
    const envNotificationsDir = process.env.PLOTDOCS_NOTIFICATIONS_DIR
    this.primaryUpdatesDir = resolve(
      options.updatesDir ??
        envUpdatesDir ??
        (repoRoot ? join(repoRoot, 'updates') : join(userDataDir, 'updates')),
    )
    this.primaryNotificationsDir = resolve(
      options.notificationsDir ??
        envNotificationsDir ??
        (repoRoot ? join(repoRoot, 'notifications') : join(userDataDir, 'notifications')),
    )

    this.candidateUpdateDirs = [this.primaryUpdatesDir]
    this.candidateNotificationDirs = [this.primaryNotificationsDir]
    // Packaged installs also look beside the executable when that folder is
    // writable. This covers portable builds and a user-created /updates next to
    // the app, while userData remains the durable default.
    if (this.isPackaged && !options.updatesDir && !envUpdatesDir) {
      const exeUpdates = join(dirname(this.currentExecutablePath()), 'updates')
      if (exeUpdates !== this.primaryUpdatesDir) this.candidateUpdateDirs.push(exeUpdates)
    }
    if (this.isPackaged && !options.notificationsDir && !envNotificationsDir) {
      const exeNotifications = join(dirname(this.currentExecutablePath()), 'notifications')
      if (exeNotifications !== this.primaryNotificationsDir) {
        this.candidateNotificationDirs.push(exeNotifications)
      }
    }

    this.state = emptyState(
      this.currentVersion,
      this.platform,
      this.arch,
      this.primaryUpdatesDir,
      this.primaryNotificationsDir,
      [...this.candidateUpdateDirs],
      [...this.candidateNotificationDirs],
    )
  }

  start(): Promise<void> {
    if (this.startPromise) return this.startPromise
    this.startPromise = this.startInternal().catch((error) => {
      this.startPromise = null
      throw error
    })
    return this.startPromise
  }

  private async startInternal(): Promise<void> {
    if (this.disposed) return
    this.activeUpdateDirs = await this.ensureDirs(this.candidateUpdateDirs, this.primaryUpdatesDir)
    this.activeNotificationDirs = await this.ensureDirs(
      this.candidateNotificationDirs,
      this.primaryNotificationsDir,
    )
    this.state.updateDirs = [...this.activeUpdateDirs]
    this.state.notificationDirs = [...this.activeNotificationDirs]

    const persistedUpdates = await readJson(join(this.primaryUpdatesDir, 'state.json'))
    if (isObject(persistedUpdates)) {
      this.updateState = {
        history: parseHistory(persistedUpdates.history),
        installed: parseInstalled(persistedUpdates.installed),
      }
    }
    const persistedNotifications = await readJson(
      join(this.primaryNotificationsDir, 'state.json'),
    )
    this.notificationState = parseNotificationState(persistedNotifications)
    this.state.history = [...this.updateState.history]

    await this.cleanupInterruptedDownloads()
    await cleanupOldExecutables(this.currentExecutablePath()).catch(() => undefined)
    await this.refreshInternal()
    this.started = true
    this.installWatchers()
    // Give the renderer a moment to paint, then make one release check. There
    // is deliberately no interval here; focus checks are throttled separately.
    this.githubTimer = setTimeout(() => {
      this.githubTimer = null
      void this.checkGithub().catch(() => undefined)
    }, 1500)
    this.githubTimer.unref?.()
  }

  private async ensureDirs(candidates: string[], primary: string): Promise<string[]> {
    const active: string[] = []
    for (const dir of candidates) {
      try {
        await mkdir(dir, { recursive: true })
        active.push(dir)
      } catch (error) {
        if (dir === primary) throw error
        this.log(`watch folder unavailable: ${dir} (${error instanceof Error ? error.message : String(error)})`)
      }
    }
    return active
  }

  private installWatchers(): void {
    for (const dir of this.activeUpdateDirs) {
      this.watchers.push(
        watchDirectory(dir, () => {
          void this.refreshInternal().catch((error) => this.log(`update scan failed: ${String(error)}`))
        }),
      )
    }
    for (const dir of this.activeNotificationDirs) {
      this.watchers.push(
        watchDirectory(dir, () => {
          void this.refreshInternal().catch((error) =>
            this.log(`notification scan failed: ${String(error)}`),
          )
        }),
      )
    }
  }

  private async cleanupInterruptedDownloads(): Promise<void> {
    for (const dir of this.activeUpdateDirs) {
      try {
        const entries = await readFileDirectory(dir)
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.part')) continue
          await rm(join(dir, entry.name), { force: true }).catch(() => undefined)
          this.log(`removed interrupted download: ${entry.name}`)
        }
      } catch {
        // the folder may have been removed while the app was closed
      }
    }
  }

  private async refreshInternal(): Promise<void> {
    if (this.disposed) return
    if (this.scanPromise) {
      this.scanRequested = true
      return this.scanPromise
    }
    this.scanPromise = (async () => {
      do {
        this.scanRequested = false
        await this.scanAll()
      } while (this.scanRequested && !this.disposed)
    })().finally(() => {
      this.scanPromise = null
    })
    return this.scanPromise
  }

  private async scanAll(): Promise<void> {
    const updateLists = await Promise.all(
      this.activeUpdateDirs.map((dir) =>
        scanUpdateDirectory({
          dir,
          currentVersion: this.currentVersion,
          readFileVersion:
            this.platform === 'win32'
              ? (this.options.readFileVersion ?? readWindowsFileVersion)
              : undefined,
        }),
      ),
    )
    const byPath = new Map<string, UpdatePackage>()
    for (const pkg of updateLists.flat()) byPath.set(pkg.path, pkg)

    for (const pkg of byPath.values()) {
      const installed = this.updateState.installed[pkg.id]
      if (installed) {
        pkg.status = 'installed'
        pkg.installedAt = installed.at
        pkg.backupPath = installed.backupPath
        pkg.signature = installed.signature
        pkg.hashVerified = Boolean(pkg.sha256)
      }
      const runtime = this.runtime.get(pkg.id)
      if (runtime) Object.assign(pkg, runtime)
    }

    const updates = [...byPath.values()]
    for (const pkg of this.synthetic.values()) {
      if (!updates.some((candidate) => candidate.id === pkg.id)) updates.push(pkg)
    }
    this.state.updates = sortPackages(updates)
    this.state.history = [...this.updateState.history]
    this.state.restartRequired = this.restartRequired

    const notificationLists = await Promise.all(
      this.activeNotificationDirs.map((dir, index) =>
        scanNotificationDirectory({
          dir,
          sourceKey: `n${index}`,
          state: this.notificationState,
        }),
      ),
    )
    const notifications = notificationLists
      .flat()
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    this.state.notifications = notifications
    this.state.unreadCount = notifications.filter((notification) => !notification.read).length

    let notificationStateChanged = false
    for (const notification of notifications) {
      const hash = notificationContentHash(notification)
      const known = this.notificationState.hashes?.[notification.id]
      if (known !== hash) {
        this.notificationState.hashes = this.notificationState.hashes ?? {}
        this.notificationState.hashes[notification.id] = hash
        if (this.notificationState.read?.[notification.id]) {
          delete this.notificationState.read[notification.id]
        }
        if (this.notificationState.deleted?.[notification.id]) {
          delete this.notificationState.deleted[notification.id]
        }
        notificationStateChanged = true
      }
    }
    if (notificationStateChanged) {
      await this.writeNotificationState().catch(() => undefined)
    }

    this.recalculateSummary()
    this.notifyNewItems()
    this.initialScan = false
    this.emit()
  }

  private recalculateSummary(): void {
    const updates = this.state.updates
    const versions = [
      ...updates.flatMap((pkg) => (pkg.version ? [pkg.version] : [])),
      ...(this.state.github?.version ? [this.state.github.version] : []),
    ]
    let latest: string | null = null
    for (const version of versions) {
      if (latest === null || compareVersions(version, latest) > 0) latest = version
    }
    this.state.latestVersion = latest
    const packageUpdate = updates.some(
      (pkg) =>
        pkg.status !== 'installed' &&
        (pkg.version === null || pkg.newer) &&
        pkg.status !== 'failed',
    )
    const failedNewer = updates.some(
      (pkg) => pkg.status === 'failed' && (pkg.version === null || pkg.newer),
    )
    this.state.updateAvailable = packageUpdate || failedNewer || Boolean(this.state.github?.newer)
  }

  private notifyNewItems(): void {
    const notificationIds = new Set(this.state.notifications.map((item) => item.id))
    const updateKeys = new Set(
      this.state.updates
        .filter((pkg) => pkg.status !== 'installed' && (pkg.version === null || pkg.newer))
        .map((pkg) => `${pkg.version ?? 'unknown'}:${pkg.fileName}`),
    )
    if (!this.initialScan) {
      const freshNotification = this.state.notifications.find(
        (item) => !item.read && !this.knownNotificationIds.has(item.id),
      )
      if (freshNotification) {
        this.nativeNotify('New notification', freshNotification.title)
      }
      const freshUpdate = [...updateKeys].find((key) => !this.knownUpdateKeys.has(key))
      if (freshUpdate) {
        const pkg = this.state.updates.find(
          (candidate) => `${candidate.version ?? 'unknown'}:${candidate.fileName}` === freshUpdate,
        )
        if (pkg) {
          this.nativeNotify(
            'Update available',
            `${pkg.fileName}${pkg.version ? ` (v${pkg.version})` : ''} is ready to install.`,
          )
        }
      }
    }
    this.knownNotificationIds = notificationIds
    this.knownUpdateKeys = updateKeys
  }

  private emit(): void {
    if (this.disposed) return
    const win = this.options.getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(UPDATES_CENTER_CHANNELS.changed, this.snapshot())
  }

  private snapshot(): UpdatesCenterState {
    return JSON.parse(JSON.stringify(this.state)) as UpdatesCenterState
  }

  async getState(): Promise<UpdatesCenterState> {
    await this.start()
    return this.snapshot()
  }

  async refresh(): Promise<UpdatesCenterState> {
    await this.start()
    await this.refreshInternal()
    return this.snapshot()
  }

  async maybeCheckGithub(): Promise<UpdatesCenterState> {
    await this.start()
    if (
      this.state.lastCheckedAt !== null &&
      this.now() - this.state.lastCheckedAt < GITHUB_CHECK_THROTTLE_MS
    ) {
      return this.snapshot()
    }
    return this.checkGithub()
  }

  async checkGithub(): Promise<UpdatesCenterState> {
    await this.start()
    if (this.githubInFlight) return this.githubInFlight
    this.githubInFlight = this.checkGithubInternal().finally(() => {
      this.githubInFlight = null
    })
    return this.githubInFlight
  }

  private async checkGithubInternal(): Promise<UpdatesCenterState> {
    if (!this.githubRepo) {
      this.state.githubChecking = false
      this.state.githubError = 'GitHub repository is not configured.'
      this.emit()
      return this.snapshot()
    }
    this.state.githubChecking = true
    this.state.githubError = null
    this.emit()

    const controller = new AbortController()
    this.githubAbort = controller
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS)
    try {
      const token =
        process.env.PLOTDOCS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
      const response = await (this.options.fetchImpl ?? fetch)(
        `https://api.github.com/repos/${this.githubRepo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Plot-Docs-Updates',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        },
      )
      this.state.lastCheckedAt = this.now()
      if (response.status === 404) {
        this.state.github = null
        this.state.githubError = `No published GitHub release was found for ${this.githubRepo} yet.`
        return this.snapshot()
      }
      if (response.status === 403 || response.status === 429) {
        const reset = response.headers.get('x-ratelimit-reset')
        const resetText = reset ? new Date(Number(reset) * 1000).toLocaleString() : null
        this.state.githubError = resetText
          ? `GitHub rate limit reached. Try again after ${resetText}.`
          : 'GitHub rate limit reached. Try again later.'
        return this.snapshot()
      }
      if (!response.ok) {
        this.state.githubError = `GitHub update check failed (HTTP ${response.status}).`
        return this.snapshot()
      }
      const text = await response.text()
      if (text.length > 2_000_000) {
        this.state.githubError = 'GitHub returned an unexpectedly large release payload.'
        return this.snapshot()
      }
      let payload: unknown
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        this.state.githubError = 'GitHub returned an unreadable release payload.'
        return this.snapshot()
      }
      const release = parseGithubRelease(payload, this.currentVersion, this.platform, this.arch)
      if (!release) {
        this.state.githubError = 'GitHub returned an unsupported release.'
        return this.snapshot()
      }
      this.state.github = release
      this.state.githubError = null
      if (release.newer) {
        this.nativeNotify(
          'GitHub update available',
          `${releaseVersionLabel(release)} is available for download.`,
        )
      }
      return this.snapshot()
    } catch (error) {
      this.state.lastCheckedAt = this.now()
      this.state.githubError =
        error instanceof Error && error.name === 'AbortError'
          ? 'GitHub update check timed out. Check your network and try again.'
          : 'Could not reach GitHub. Check your network and try again.'
      this.log(`GitHub check failed: ${error instanceof Error ? error.message : String(error)}`)
      return this.snapshot()
    } finally {
      clearTimeout(timeout)
      this.githubAbort = null
      this.state.githubChecking = false
      this.recalculateSummary()
      this.emit()
    }
  }

  async downloadGithub(): Promise<UpdateActionResult> {
    await this.start()
    if (this.downloadInFlight) {
      return { ok: false, error: 'A download is already in progress.', state: this.snapshot() }
    }
    this.downloadInFlight = this.downloadGithubInternal().finally(() => {
      this.downloadInFlight = null
    })
    return this.downloadInFlight
  }

  private syntheticGithubPackage(
    release: GithubReleaseInfo,
    asset: NonNullable<GithubReleaseInfo['asset']>,
    status: UpdatePackage['status'],
    extra: Partial<UpdatePackage> = {},
  ): UpdatePackage {
    const destination = join(this.primaryUpdatesDir, safeFileName(asset.name))
    return {
      id: `github:${release.version}:${asset.name}`,
      fileName: safeFileName(asset.name),
      path: destination,
      version: release.version,
      modifiedAt: this.now(),
      size: asset.size,
      source: 'github',
      status,
      newer: release.newer,
      sha256: asset.sha256,
      hashVerified: false,
      releaseNotes: release.releaseNotes,
      htmlUrl: release.htmlUrl,
      publishedAt: release.publishedAt,
      progress: status === 'downloading' ? 0 : null,
      transferred: null,
      error: null,
      installedAt: null,
      backupPath: null,
      signature: 'unknown',
      installable: asset.installable,
      ...extra,
    }
  }

  private setSynthetic(pkg: UpdatePackage): void {
    this.synthetic.set(pkg.id, pkg)
    const others = this.state.updates.filter((candidate) => candidate.id !== pkg.id)
    this.state.updates = sortPackages([...others, pkg])
    this.recalculateSummary()
    this.emit()
  }

  private async downloadGithubInternal(): Promise<UpdateActionResult> {
    const release = this.state.github
    const asset = release?.asset
    if (!release || !asset) {
      return {
        ok: false,
        error: 'No GitHub release asset is available. Check for updates first.',
        state: this.snapshot(),
      }
    }
    if (!isAllowedGithubAssetUrl(asset.downloadUrl)) {
      return { ok: false, error: 'The GitHub asset URL is not trusted.', state: this.snapshot() }
    }
    const fileName = safeFileName(asset.name)
    const destination = join(this.primaryUpdatesDir, fileName)
    const partPath = `${destination}.part`
    const synthetic = this.syntheticGithubPackage(release, asset, 'downloading', {
      progress: 0,
      transferred: 0,
    })
    this.setSynthetic(synthetic)

    const controller = new AbortController()
    this.downloadAbort = controller
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
    try {
      // Duplicate prevention: an already-downloaded asset is reused instead of
      // downloading the same release again.
      try {
        const existing = await stat(destination)
        if (existing.isFile()) {
          if (asset.sha256) {
            const actual = await sha256File(destination)
            if (actual === asset.sha256) {
              return await this.finishGithubDownload(
                release,
                asset,
                destination,
                actual,
                true,
                synthetic.id,
              )
            }
            return {
              ok: false,
              error: 'A file with this name already exists but its checksum does not match the release.',
              state: this.snapshot(),
            }
          }
          if (asset.size > 0 && existing.size === asset.size) {
            return await this.finishGithubDownload(
              release,
              asset,
              destination,
              await sha256File(destination),
              false,
              synthetic.id,
            )
          }
          return {
            ok: false,
            error: 'A different file with this name already exists in /updates.',
            state: this.snapshot(),
          }
        }
      } catch {
        // no existing file: continue with the download
      }

      await rm(partPath, { force: true }).catch(() => undefined)
      const response = await (this.options.fetchImpl ?? fetch)(asset.downloadUrl, {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'Plot-Docs-Updates',
          ...(process.env.PLOTDOCS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
            ? {
                Authorization: `Bearer ${
                  process.env.PLOTDOCS_GITHUB_TOKEN ??
                  process.env.GITHUB_TOKEN ??
                  process.env.GH_TOKEN
                }`,
              }
            : {}),
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`)
      const contentType = response.headers.get('content-type') ?? ''
      if (/text\/html/i.test(contentType)) {
        throw new Error('GitHub returned a web page instead of the update file.')
      }
      const contentLength = Number(response.headers.get('content-length') ?? '0')
      if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
        throw new Error('The update file is larger than the 4 GB safety limit.')
      }
      if (!response.body) throw new Error('GitHub returned an empty download.')

      const total = asset.size > 0 ? asset.size : contentLength
      const hash = createHash('sha256')
      const output = createWriteStream(partPath)
      let received = 0
      let lastProgressAt = 0
      try {
        const reader = response.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value || value.byteLength === 0) continue
          received += value.byteLength
          if (received > MAX_DOWNLOAD_BYTES) {
            throw new Error('The update download exceeded the 4 GB safety limit.')
          }
          hash.update(value)
          if (!output.write(Buffer.from(value))) await once(output, 'drain')
          const now = this.now()
          if (now - lastProgressAt > 200) {
            lastProgressAt = now
            const progress = total > 0 ? Math.min(99, (received / total) * 100) : null
            this.setSynthetic({
              ...synthetic,
              progress,
              transferred: received,
            })
          }
        }
        await new Promise<void>((resolvePromise, reject) => {
          output.end((error?: Error | null) => (error ? reject(error) : resolvePromise()))
        })
      } catch (error) {
        output.destroy()
        await rm(partPath, { force: true }).catch(() => undefined)
        throw error
      }

      const actualSha = hash.digest('hex')
      if (asset.sha256 && actualSha !== asset.sha256) {
        await rm(partPath, { force: true }).catch(() => undefined)
        throw new Error('Checksum verification failed. The update was not installed.')
      }
      try {
        await rename(partPath, destination)
      } catch (error) {
        await rm(partPath, { force: true }).catch(() => undefined)
        throw error
      }
      return await this.finishGithubDownload(
        release,
        asset,
        destination,
        actualSha,
        Boolean(asset.sha256),
        synthetic.id,
      )
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'The download was interrupted. Try again.'
          : error instanceof Error
            ? error.message
            : String(error)
      const failed = {
        ...synthetic,
        status: 'failed' as const,
        error: message,
        progress: null,
        transferred: null,
      }
      this.setSynthetic(failed)
      this.recordHistory(failed, 'failed', message)
      await this.writeUpdateState().catch(() => undefined)
      this.log(`GitHub download failed: ${message}`)
      return { ok: false, error: message, state: this.snapshot() }
    } finally {
      clearTimeout(timeout)
      this.downloadAbort = null
    }
  }

  private async finishGithubDownload(
    release: GithubReleaseInfo,
    asset: NonNullable<GithubReleaseInfo['asset']>,
    destination: string,
    sha256: string,
    hashVerified: boolean,
    syntheticId: string,
  ): Promise<UpdateActionResult> {
    const info = await stat(destination)
    const id = packageId(destination, info.size, info.mtimeMs)
    const pkg: UpdatePackage = {
      ...this.syntheticGithubPackage(release, asset, 'downloaded', {
        id,
        path: destination,
        modifiedAt: info.mtimeMs,
        size: info.size,
        sha256,
        hashVerified,
        progress: 100,
        transferred: info.size,
      }),
    }
    this.synthetic.delete(syntheticId)
    this.runtime.set(id, {
      status: 'downloaded',
      sha256,
      hashVerified,
      progress: 100,
      transferred: info.size,
    })
    this.recordHistory(pkg, 'downloaded', hashVerified ? 'Downloaded and checksum verified.' : 'Downloaded; no published checksum was available.')
    await this.writeUpdateState().catch(() => undefined)
    await this.refreshInternal()
    this.log(
      `downloaded ${asset.name} (${formatBytes(info.size)}, ${hashVerified ? 'verified' : 'unverified'})`,
    )
    this.nativeNotify('Update downloaded', `${asset.name} is ready to install.`)
    return { ok: true, state: this.snapshot() }
  }

  async installUpdate(input: InstallUpdateInput): Promise<UpdateActionResult> {
    await this.start()
    if (!input || typeof input.id !== 'string' || !input.id) {
      return { ok: false, error: 'Invalid update id.', state: this.snapshot() }
    }
    if (input.confirmed !== true) {
      return {
        ok: false,
        error: 'Installing an update requires explicit confirmation.',
        state: this.snapshot(),
      }
    }
    let pkg = this.state.updates.find((candidate) => candidate.id === input.id)
    if (!pkg) {
      await this.refreshInternal()
      pkg = this.state.updates.find((candidate) => candidate.id === input.id)
    }
    if (!pkg) return { ok: false, error: 'That update is no longer available.', state: this.snapshot() }
    if (pkg.status === 'installed') {
      return { ok: false, error: 'That update is already installed.', state: this.snapshot() }
    }
    if (!pkg.installable || extname(pkg.fileName).toLowerCase() !== '.exe') {
      return {
        ok: false,
        error:
          'This package is an installer, not a portable executable. Open the updates folder and run it manually after reviewing it.',
        state: this.snapshot(),
      }
    }
    if (this.platform !== 'win32') {
      return {
        ok: false,
        error: 'Automatic executable replacement is supported on Windows only.',
        state: this.snapshot(),
      }
    }
    if (!this.isPackaged) {
      return {
        ok: false,
        error: 'Executable replacement is only available in the packaged app.',
        state: this.snapshot(),
      }
    }
    if (!this.activeUpdateDirs.some((dir) => isPathInside(dir, pkg!.path))) {
      return { ok: false, error: 'The update path is outside the watched folders.', state: this.snapshot() }
    }
    let info
    try {
      info = await stat(pkg.path)
      if (!info.isFile()) throw new Error('not a file')
    } catch {
      return { ok: false, error: 'The update file no longer exists.', state: this.snapshot() }
    }

    const expectedSha = pkg.sha256
    const actualSha = await sha256File(pkg.path)
    if (expectedSha && actualSha !== expectedSha) {
      this.markFailed(pkg, 'Checksum verification failed. The update was not installed.')
      return {
        ok: false,
        error: 'Checksum verification failed. The update was not installed.',
        state: this.snapshot(),
      }
    }

    const signature =
      this.options.checkSignature?.(pkg.path) ?? checkAuthenticode(pkg.path)
    const resolvedSignature = await signature
    if (resolvedSignature === 'invalid') {
      this.markFailed(pkg, 'The update has an invalid code signature and was not installed.')
      return {
        ok: false,
        error: 'The update has an invalid code signature and was not installed.',
        state: this.snapshot(),
      }
    }
    if (
      (resolvedSignature === 'unsigned' || resolvedSignature === 'unknown') &&
      input.allowUnsigned !== true
    ) {
      return {
        ok: false,
        error:
          'This executable is not code-signed. Review the file and confirm the unsigned-update warning to continue.',
        requiresUnsignedConfirmation: true,
        state: this.snapshot(),
      }
    }

    const currentExePath = this.currentExecutablePath()
    const backupDir = join(this.primaryUpdatesDir, 'backups')
    this.runtime.set(pkg.id, {
      ...this.runtime.get(pkg.id),
      status: 'installing',
      signature: resolvedSignature,
      sha256: actualSha,
      hashVerified: Boolean(expectedSha),
    })
    this.state.updates = sortPackages(
      this.state.updates.map((candidate) =>
        candidate.id === pkg!.id
          ? {
              ...candidate,
              status: 'installing',
              signature: resolvedSignature,
              sha256: actualSha,
              hashVerified: Boolean(expectedSha),
            }
          : candidate,
      ),
    )
    this.emit()

    const replaced = await replaceExecutable({
      currentExePath,
      updatePath: pkg.path,
      backupDir,
      currentVersion: this.currentVersion,
      now: this.now(),
    })
    if (!replaced.ok) {
      this.markFailed(pkg, replaced.error ?? 'The executable could not be replaced.')
      this.log(`install failed: ${replaced.error ?? 'unknown error'}`)
      return {
        ok: false,
        error: replaced.error ?? 'The executable could not be replaced.',
        state: this.snapshot(),
      }
    }

    const installedAt = this.now()
    this.updateState.installed[pkg.id] = {
      at: installedAt,
      version: pkg.version,
      backupPath: replaced.backupPath ?? null,
      signature: resolvedSignature,
    }
    this.runtime.set(pkg.id, {
      ...this.runtime.get(pkg.id),
      status: 'installed',
      installedAt,
      backupPath: replaced.backupPath ?? null,
      signature: resolvedSignature,
      sha256: actualSha,
      hashVerified: Boolean(expectedSha),
      error: null,
      progress: null,
      transferred: null,
    })
    this.restartRequired = true
    this.state.restartRequired = true
    const installedPkg: UpdatePackage = {
      ...pkg,
      status: 'installed',
      installedAt,
      backupPath: replaced.backupPath ?? null,
      signature: resolvedSignature,
      sha256: actualSha,
      hashVerified: Boolean(expectedSha),
      error: null,
      progress: null,
      transferred: null,
    }
    this.recordHistory(installedPkg, 'installed', `Installed ${pkg.fileName}; restart to apply.`)
    await this.writeUpdateState().catch(() => undefined)
    await this.refreshInternal()
    this.log(`installed ${pkg.fileName}; backup ${replaced.backupPath ?? 'not recorded'}`)
    this.nativeNotify('Update installed', 'Restart Plot Docs to run the new version.')
    return { ok: true, state: this.snapshot(), restartRequired: true }
  }

  private markFailed(pkg: UpdatePackage, message: string): void {
    this.runtime.set(pkg.id, {
      ...this.runtime.get(pkg.id),
      status: 'failed',
      error: message,
      progress: null,
      transferred: null,
    })
    this.state.updates = sortPackages(
      this.state.updates.map((candidate) =>
        candidate.id === pkg.id
          ? { ...candidate, status: 'failed', error: message, progress: null, transferred: null }
          : candidate,
      ),
    )
    this.recordHistory(pkg, 'failed', message)
    void this.writeUpdateState().catch(() => undefined)
    this.recalculateSummary()
    this.emit()
  }

  async restartApp(): Promise<UpdateActionResult> {
    await this.start()
    if (!this.restartRequired) {
      return { ok: false, error: 'No installed update is waiting for a restart.', state: this.snapshot() }
    }
    const exe = this.currentExecutablePath()
    try {
      if (this.options.relaunch) {
        this.options.relaunch({ execPath: exe, args: [] })
      } else {
        app.relaunch({ execPath: exe, args: [] })
      }
      if (this.options.quit) this.options.quit()
      else app.quit()
      return { ok: true, state: this.snapshot() }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'The app could not be restarted.',
        state: this.snapshot(),
      }
    }
  }

  async markRead(id: string): Promise<UpdatesCenterState> {
    await this.start()
    const notification = this.state.notifications.find((item) => item.id === id)
    if (!notification) return this.snapshot()
    this.notificationState.read = this.notificationState.read ?? {}
    this.notificationState.read[id] = true
    notification.read = true
    this.state.unreadCount = this.state.notifications.filter((item) => !item.read).length
    await this.writeNotificationState().catch(() => undefined)
    this.emit()
    return this.snapshot()
  }

  async markAllRead(): Promise<UpdatesCenterState> {
    await this.start()
    this.notificationState.read = this.notificationState.read ?? {}
    for (const notification of this.state.notifications) {
      notification.read = true
      this.notificationState.read[notification.id] = true
    }
    this.state.unreadCount = 0
    await this.writeNotificationState().catch(() => undefined)
    this.emit()
    return this.snapshot()
  }

  async deleteNotification(id: string): Promise<UpdatesCenterState> {
    await this.start()
    const notification = this.state.notifications.find((item) => item.id === id)
    if (!notification) return this.snapshot()
    const allowed = this.activeNotificationDirs.some((dir) => isPathInside(dir, notification.sourceFile))
    if (!allowed) return this.snapshot()
    this.notificationState.deleted = this.notificationState.deleted ?? {}
    this.notificationState.deleted[id] = notificationContentHash(notification)
    await rm(notification.sourceFile, { force: true }).catch(() => undefined)
    this.state.notifications = this.state.notifications.filter((item) => item.id !== id)
    this.state.unreadCount = this.state.notifications.filter((item) => !item.read).length
    await this.writeNotificationState().catch(() => undefined)
    this.emit()
    return this.snapshot()
  }

  async openFolder(kind: UpdatesFolderKind): Promise<boolean> {
    await this.start()
    if (!isUpdatesFolderKind(kind)) return false
    const dir = kind === 'updates' ? this.primaryUpdatesDir : this.primaryNotificationsDir
    try {
      await mkdir(dir, { recursive: true })
      const result = await shell.openPath(dir)
      return result === ''
    } catch {
      return false
    }
  }

  private currentExecutablePath(): string {
    const portable = process.env.PORTABLE_EXECUTABLE_FILE
    if (portable && existsSync(portable)) return resolve(portable)
    if (this.options.currentExePath) return resolve(this.options.currentExePath)
    return resolve(process.execPath)
  }

  private recordHistory(pkg: UpdatePackage, status: UpdateHistoryEntry['status'], message: string): void {
    const entry: UpdateHistoryEntry = {
      id: pkg.id,
      version: pkg.version,
      fileName: pkg.fileName,
      status,
      at: this.now(),
      message,
      backupPath: pkg.backupPath,
    }
    this.updateState.history = [entry, ...this.updateState.history].slice(0, HISTORY_LIMIT)
    this.state.history = [...this.updateState.history]
  }

  private async writeUpdateState(): Promise<void> {
    await writeJson(join(this.primaryUpdatesDir, 'state.json'), this.updateState)
  }

  private async writeNotificationState(): Promise<void> {
    await writeJson(join(this.primaryNotificationsDir, 'state.json'), this.notificationState)
  }

  private log(message: string): void {
    void (async () => {
      try {
        const dir = join(this.primaryUpdatesDir, 'logs')
        await mkdir(dir, { recursive: true })
        const file = join(dir, 'update.log')
        const info = await stat(file).catch(() => null)
        if (info && info.size > LOG_LIMIT_BYTES) {
          await rename(file, `${file}.1`).catch(() => undefined)
        }
        await appendFile(file, `${new Date(this.now()).toISOString()} ${message}\n`, 'utf8')
      } catch {
        // logging is best effort
      }
    })()
  }

  private nativeNotify(title: string, body: string): void {
    try {
      const win = this.options.getWindow()
      if (win && !win.isDestroyed() && win.isFocused()) return
      if (!Notification.isSupported()) return
      const notification = new Notification({ title, body })
      this.nativeNotifications.add(notification)
      notification.on('click', () => this.openCenter())
      notification.on('close', () => this.nativeNotifications.delete(notification))
      notification.show()
    } catch {
      // native notifications are optional; the in-app badge is the source of truth
    }
  }

  private openCenter(): void {
    const win = this.options.getWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
    this.options.showWindow?.()
    if (win && !win.isDestroyed()) {
      win.webContents.send(UPDATES_CENTER_CHANNELS.openRequested)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.githubTimer) clearTimeout(this.githubTimer)
    this.githubTimer = null
    this.githubAbort?.abort()
    this.downloadAbort?.abort()
    for (const close of this.watchers) close()
    this.watchers.length = 0
    for (const notification of this.nativeNotifications) {
      notification.close()
    }
    this.nativeNotifications.clear()
  }
}

async function readFileDirectory(dir: string): Promise<Array<{ name: string; isFile: () => boolean }>> {
  return readdir(dir, { withFileTypes: true })
}

export function createUpdatesCenter(options: UpdatesCenterOptions): UpdatesCenter {
  return new UpdatesCenterService(options)
}

function installInput(raw: unknown): InstallUpdateInput | null {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 300) return null
  return {
    id: raw.id,
    confirmed: raw.confirmed === true,
    allowUnsigned: raw.allowUnsigned === true,
  }
}

export function registerUpdatesCenterIpc(getService: () => UpdatesCenter | null): void {
  const service = (): UpdatesCenter => {
    const current = getService()
    if (!current) throw new Error('The updates center is not ready.')
    return current
  }

  ipcMain.handle(UPDATES_CENTER_CHANNELS.getState, () => service().getState())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.refresh, () => service().refresh())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.checkGithub, () => service().checkGithub())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.downloadGithub, () => service().downloadGithub())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.installUpdate, (_event, raw: unknown) => {
    const input = installInput(raw)
    if (!input) {
      return {
        ok: false,
        error: 'Invalid update request.',
      } satisfies UpdateActionResult
    }
    return service().installUpdate(input)
  })
  ipcMain.handle(UPDATES_CENTER_CHANNELS.restartApp, () => service().restartApp())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.markRead, (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('Invalid notification id.')
    return service().markRead(id)
  })
  ipcMain.handle(UPDATES_CENTER_CHANNELS.markAllRead, () => service().markAllRead())
  ipcMain.handle(UPDATES_CENTER_CHANNELS.deleteNotification, (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('Invalid notification id.')
    return service().deleteNotification(id)
  })
  ipcMain.handle(UPDATES_CENTER_CHANNELS.openFolder, (_event, kind: unknown) => {
    if (!isUpdatesFolderKind(kind)) throw new Error('Invalid folder kind.')
    return service().openFolder(kind)
  })
}

// Keep the imported type available to consumers that only need the state type.
export type { InAppNotification, UpdatesCenterState }
