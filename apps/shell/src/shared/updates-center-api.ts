// Contract between the shell renderer and the main-process updates center.
//
// The updates center owns two file-backed channels:
//   /updates       update packages + manifests + status/history
//   /notifications JSON notification files
//
// It also checks the configured GitHub repository for the latest release. The
// renderer never supplies paths or download URLs; every action is resolved
// against state the main process scanned itself.

export const UPDATES_CENTER_CHANNELS = {
  getState: 'updates-center:get-state',
  refresh: 'updates-center:refresh',
  checkGithub: 'updates-center:check-github',
  downloadGithub: 'updates-center:download-github',
  installUpdate: 'updates-center:install-update',
  restartApp: 'updates-center:restart-app',
  markRead: 'updates-center:mark-read',
  markAllRead: 'updates-center:mark-all-read',
  deleteNotification: 'updates-center:delete-notification',
  openFolder: 'updates-center:open-folder',
  changed: 'updates-center:changed',
  /** main asks the renderer to open the panel (native notification click) */
  openRequested: 'updates-center:open-requested',
} as const

export type UpdatePackageStatus =
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'installed'
  | 'failed'

export type UpdatePackageSource = 'local' | 'github'

/** Best-effort Authenticode result for a Windows executable. */
export type UpdateSignatureStatus = 'valid' | 'invalid' | 'unsigned' | 'unknown'

export interface UpdatePackage {
  /** opaque id derived from the file path/size/mtime; never a renderer path */
  id: string
  fileName: string
  /** absolute path on this machine (display + open-folder only) */
  path: string
  /** normalized version, or null when the file carries none */
  version: string | null
  modifiedAt: number
  size: number
  source: UpdatePackageSource
  status: UpdatePackageStatus
  /** true when the package version is newer than the running app */
  newer: boolean
  /** checksum from a manifest; for downloads also the verified digest */
  sha256: string | null
  /** true when a manifest/digest checksum was verified against the file */
  hashVerified: boolean
  /** release notes from a local manifest or the GitHub release body */
  releaseNotes: string | null
  /** set for GitHub assets; absent for local files */
  htmlUrl: string | null
  publishedAt: string | null
  /** 0-100 while downloading */
  progress: number | null
  /** transferred bytes while downloading */
  transferred: number | null
  error: string | null
  installedAt: number | null
  backupPath: string | null
  signature: UpdateSignatureStatus
  /** true when this file can safely replace the running executable */
  installable: boolean
}

export interface InAppNotification {
  id: string
  title: string
  message: string
  /** ISO date supplied by the file, else the file mtime */
  date: string
  type: 'info' | 'success' | 'warning' | 'error' | 'update'
  read: boolean
  /** absolute source path */
  sourceFile: string
  createdAt: number
  updatedAt: number
}

export interface UpdateHistoryEntry {
  id: string
  version: string | null
  fileName: string
  status: UpdatePackageStatus
  at: number
  message: string
  backupPath: string | null
}

export interface GithubReleaseInfo {
  version: string
  tag: string
  name: string
  releaseNotes: string
  publishedAt: string
  htmlUrl: string
  /** true when the release version is newer than the running app */
  newer: boolean
  asset: {
    name: string
    size: number
    downloadUrl: string
    sha256: string | null
    installable: boolean
  } | null
}

export interface UpdatesCenterState {
  currentVersion: string
  platform: string
  arch: string
  updatesDir: string
  notificationsDir: string
  updates: UpdatePackage[]
  notifications: InAppNotification[]
  unreadCount: number
  updateAvailable: boolean
  latestVersion: string | null
  github: GithubReleaseInfo | null
  githubChecking: boolean
  githubError: string | null
  lastCheckedAt: number | null
  history: UpdateHistoryEntry[]
  /** true after an executable was replaced and the app has not restarted yet */
  restartRequired: boolean
  /** friendly path list when packaged builds watch more than one folder */
  updateDirs: string[]
  notificationDirs: string[]
}

export interface UpdateActionResult {
  ok: boolean
  error?: string
  state?: UpdatesCenterState
  /** install succeeded; the user should restart the app to run the new build */
  restartRequired?: boolean
  /** the executable is unsigned/unverified; retry with allowUnsigned after review */
  requiresUnsignedConfirmation?: boolean
}

export interface InstallUpdateInput {
  id: string
  confirmed: boolean
  /** explicit acknowledgement for an unsigned/unverified executable */
  allowUnsigned?: boolean
}

export type UpdatesFolderKind = 'updates' | 'notifications'

export type UpdatesCenterTab = 'notifications' | 'updates'

export interface UpdatesCenterApi {
  getState(): Promise<UpdatesCenterState>
  refresh(): Promise<UpdatesCenterState>
  checkGithub(): Promise<UpdatesCenterState>
  downloadGithub(): Promise<UpdateActionResult>
  installUpdate(input: InstallUpdateInput): Promise<UpdateActionResult>
  restartApp(): Promise<UpdateActionResult>
  markRead(id: string): Promise<UpdatesCenterState>
  markAllRead(): Promise<UpdatesCenterState>
  deleteNotification(id: string): Promise<UpdatesCenterState>
  openFolder(kind: UpdatesFolderKind): Promise<boolean>
  onChanged(handler: (state: UpdatesCenterState) => void): () => void
  onOpenRequested(handler: () => void): () => void
}

const NOTIFICATION_TYPES = new Set(['info', 'success', 'warning', 'error', 'update'])
const PACKAGE_STATUSES = new Set([
  'available',
  'downloading',
  'downloaded',
  'installing',
  'installed',
  'failed',
])

export function isNotificationType(value: unknown): value is InAppNotification['type'] {
  return typeof value === 'string' && NOTIFICATION_TYPES.has(value)
}

export function isUpdatePackageStatus(value: unknown): value is UpdatePackageStatus {
  return typeof value === 'string' && PACKAGE_STATUSES.has(value)
}

export function isUpdatesFolderKind(value: unknown): value is UpdatesFolderKind {
  return value === 'updates' || value === 'notifications'
}
