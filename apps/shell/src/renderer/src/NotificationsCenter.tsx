import { useEffect, useRef, useState } from 'react'
import type {
  InAppNotification,
  UpdateActionResult,
  UpdatePackage,
  UpdatesCenterApi,
  UpdatesCenterState,
  UpdatesCenterTab,
  UpdatesFolderKind,
} from '../../shared/updates-center-api'

function formatDate(value: string | number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`
}

function shortHash(value: string | null): string {
  if (!value) return 'Not published'
  return `${value.slice(0, 12)}…${value.slice(-6)}`
}

function baseName(value: string): string {
  const parts = value.split(/[\\/]/)
  return parts[parts.length - 1] || value
}

function statusLabel(status: UpdatePackage['status']): string {
  if (status === 'available') return 'Available'
  if (status === 'downloading') return 'Downloading'
  if (status === 'downloaded') return 'Downloaded'
  if (status === 'installing') return 'Installing'
  if (status === 'installed') return 'Installed'
  return 'Failed'
}

function typeLabel(type: InAppNotification['type']): string {
  if (type === 'update') return 'Update'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 6.5h6l1.8 2H20.5v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18.5h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12M10 10.5v5M14 10.5v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 21 20H3L12 3.5ZM12 9v5M12 17.2v.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spinner() {
  return <span className="uc-spinner" aria-label="Working" />
}

function StatusChip({ status }: { status: UpdatePackage['status'] }) {
  return <span className={`uc-status uc-status-${status}`}>{statusLabel(status)}</span>
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: InAppNotification
  onRead: () => void
  onDelete: () => void
}) {
  return (
    <article
      className={`uc-notification${notification.read ? '' : ' is-unread'}`}
      onClick={() => {
        if (!notification.read) onRead()
      }}
    >
      <div className={`uc-notification-mark uc-type-${notification.type}`} aria-hidden="true">
        {notification.type === 'success' ? <CheckIcon /> : <AlertIcon />}
      </div>
      <div className="uc-notification-body">
        <div className="uc-notification-top">
          <strong>{notification.title}</strong>
          <span className={`uc-type-chip uc-type-${notification.type}`}>{typeLabel(notification.type)}</span>
        </div>
        {notification.message ? <p>{notification.message}</p> : null}
        <div className="uc-notification-meta">
          <span>{formatDate(notification.date)}</span>
          <span>{baseName(notification.sourceFile)}</span>
        </div>
      </div>
      <div className="uc-notification-actions">
        {!notification.read ? (
          <button
            className="uc-icon-btn"
            title="Mark as read"
            aria-label="Mark as read"
            onClick={(event) => {
              event.stopPropagation()
              onRead()
            }}
          >
            <CheckIcon />
          </button>
        ) : null}
        <button
          className="uc-icon-btn uc-danger"
          title="Delete notification"
          aria-label="Delete notification"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  )
}

function UpdateCard({
  pkg,
  busy,
  confirming,
  allowUnsigned,
  onAllowUnsigned,
  onConfirm,
  onCancel,
  onInstall,
  onOpenFolder,
}: {
  pkg: UpdatePackage
  busy: string | null
  confirming: boolean
  allowUnsigned: boolean
  onAllowUnsigned: (value: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  onInstall: () => void
  onOpenFolder: () => void
}) {
  const canInstall = pkg.installable && (pkg.status === 'available' || pkg.status === 'downloaded' || pkg.status === 'failed')
  const signatureBlocked = pkg.signature === 'invalid'
  return (
    <article className={`uc-update-card uc-update-${pkg.status}`}>
      <div className="uc-update-head">
        <div className="uc-update-title">
          <strong title={pkg.path}>{pkg.fileName}</strong>
          <div className="uc-update-sub">
            {pkg.version ? <span>v{pkg.version}</span> : <span>Version unknown</span>}
            <span>{formatDate(pkg.modifiedAt)}</span>
            <span>{formatBytes(pkg.size)}</span>
          </div>
        </div>
        <StatusChip status={pkg.status} />
      </div>

      {pkg.status === 'downloading' ? (
        <div className="uc-progress-wrap">
          <div className="uc-progress">
            <span style={{ width: `${Math.max(0, Math.min(100, pkg.progress ?? 0))}%` }} />
          </div>
          <span className="uc-progress-label">
            {pkg.progress === null ? 'Downloading…' : `${Math.round(pkg.progress)}%`}
            {pkg.transferred ? ` · ${formatBytes(pkg.transferred)}` : ''}
          </span>
        </div>
      ) : null}

      <div className="uc-integrity">
        <span className={`uc-check ${pkg.hashVerified ? 'ok' : 'warn'}`}>
          {pkg.hashVerified ? <CheckIcon /> : <AlertIcon />}
          {pkg.hashVerified ? 'SHA-256 verified' : pkg.sha256 ? 'SHA-256 published, verified on install' : 'No published checksum'}
        </span>
        {pkg.sha256 ? <code title={pkg.sha256}>{shortHash(pkg.sha256)}</code> : null}
        <span className={`uc-signature uc-signature-${pkg.signature}`}>
          {pkg.signature === 'valid'
            ? 'Signed'
            : pkg.signature === 'invalid'
              ? 'Invalid signature'
              : pkg.signature === 'unsigned'
                ? 'Unsigned'
                : 'Signature checked on install'}
        </span>
      </div>

      {pkg.releaseNotes ? <div className="uc-notes">{pkg.releaseNotes}</div> : null}
      {pkg.error ? <div className="uc-inline-error">{pkg.error}</div> : null}

      {pkg.status === 'installed' ? (
        <div className="uc-installed">
          <CheckIcon />
          <span>Installed {pkg.installedAt ? formatDate(pkg.installedAt) : ''}</span>
          {pkg.backupPath ? <code title={pkg.backupPath}>Backup: {baseName(pkg.backupPath)}</code> : null}
        </div>
      ) : null}

      <div className="uc-update-actions">
        {canInstall ? (
          <button className="uc-primary-btn" onClick={onConfirm} disabled={busy !== null || signatureBlocked}>
            {pkg.status === 'failed' ? 'Retry install' : 'Install update'}
          </button>
        ) : null}
        {!pkg.installable && pkg.status !== 'installed' ? (
          <button className="uc-secondary-btn" onClick={onOpenFolder}>
            <FolderIcon />
            Open folder
          </button>
        ) : null}
        {!pkg.installable && pkg.status !== 'installed' ? (
          <span className="uc-muted">Installer packages are never executed automatically.</span>
        ) : null}
      </div>

      {confirming ? (
        <div className="uc-confirm">
          <div className="uc-confirm-title">
            <AlertIcon />
            Replace the current Plot Docs executable?
          </div>
          <p>
            A timestamped backup of the current executable will be saved in the updates folder.
            The app must restart before the new version runs. Your documents and settings are not
            touched.
          </p>
          {signatureBlocked ? (
            <div className="uc-inline-error">
              This file has an invalid code signature and cannot be installed.
            </div>
          ) : pkg.signature !== 'valid' ? (
            <label className="uc-unsigned">
              <input
                type="checkbox"
                checked={allowUnsigned}
                onChange={(event) => onAllowUnsigned(event.target.checked)}
              />
              I understand this update is not code-signed and I trust where it came from.
            </label>
          ) : null}
          <div className="uc-confirm-actions">
            <button
              className="uc-primary-btn"
              onClick={onInstall}
              disabled={busy !== null || signatureBlocked || (pkg.signature !== 'valid' && !allowUnsigned)}
            >
              {busy === `install:${pkg.id}` ? <Spinner /> : null}
              Install update
            </button>
            <button className="uc-secondary-btn" onClick={onCancel} disabled={busy !== null}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function GithubCard({
  state,
  busy,
  onCheck,
  onDownload,
  onInstall,
  onOpenFolder,
  githubDownloading,
  githubReady,
}: {
  state: UpdatesCenterState
  busy: string | null
  onCheck: () => void
  onDownload: () => void
  onInstall: (pkg: UpdatePackage) => void
  onOpenFolder: () => void
  githubDownloading: UpdatePackage | null
  githubReady: UpdatePackage | null
}) {
  const release = state.github
  if (!release) {
    return (
      <section className="uc-github-card">
        <div className="uc-section-heading">
          <div>
            <strong>GitHub releases</strong>
            <span>Automatic release detection</span>
          </div>
          <button className="uc-secondary-btn" onClick={onCheck} disabled={busy !== null}>
            {state.githubChecking ? <Spinner /> : <RefreshIcon />}
            Check now
          </button>
        </div>
        {state.githubError ? (
          <div className="uc-inline-error">{state.githubError}</div>
        ) : (
          <p className="uc-muted">
            No release has been found yet. Publish a GitHub release with a portable .exe asset to
            make updates available here.
          </p>
        )}
      </section>
    )
  }

  const asset = release.asset
  return (
    <section className={`uc-github-card${release.newer ? ' has-update' : ''}`}>
      <div className="uc-section-heading">
        <div>
          <strong>GitHub release v{release.version}</strong>
          <span>
            {release.newer ? 'New version available' : 'You are up to date'}
            {release.publishedAt ? ` · ${formatDate(release.publishedAt)}` : ''}
          </span>
        </div>
        <button className="uc-secondary-btn" onClick={onCheck} disabled={busy !== null}>
          {state.githubChecking ? <Spinner /> : <RefreshIcon />}
          Check
        </button>
      </div>

      {release.releaseNotes ? <div className="uc-notes">{release.releaseNotes}</div> : null}

      {asset ? (
        <div className="uc-asset">
          <div>
            <strong>{asset.name}</strong>
            <span>
              {formatBytes(asset.size)}
              {asset.sha256 ? ' · SHA-256 published' : ' · no published checksum'}
              {asset.installable ? ' · portable executable' : ' · installer package'}
            </span>
          </div>
          {asset.installable ? (
            <span className={`uc-check ${asset.sha256 ? 'ok' : 'warn'}`}>
              {asset.sha256 ? <CheckIcon /> : <AlertIcon />}
              {asset.sha256 ? 'Verified on download' : 'Unverified download'}
            </span>
          ) : (
            <span className="uc-muted">Download only</span>
          )}
        </div>
      ) : (
        <div className="uc-inline-error">
          This release has no asset for {state.platform}/{state.arch}.
        </div>
      )}

      {githubDownloading ? (
        <div className="uc-progress-wrap">
          <div className="uc-progress">
            <span style={{ width: `${Math.max(0, Math.min(100, githubDownloading.progress ?? 0))}%` }} />
          </div>
          <span className="uc-progress-label">
            {githubDownloading.progress === null
              ? 'Downloading…'
              : `${Math.round(githubDownloading.progress)}%`}
            {githubDownloading.transferred
              ? ` · ${formatBytes(githubDownloading.transferred)}`
              : ''}
          </span>
        </div>
      ) : null}

      {githubDownloading?.error ? <div className="uc-inline-error">{githubDownloading.error}</div> : null}

      <div className="uc-update-actions">
        {release.newer && asset && !githubReady && !githubDownloading ? (
          <button className="uc-primary-btn" onClick={onDownload} disabled={busy !== null}>
            {busy === 'download' ? <Spinner /> : <DownloadIcon />}
            Download update
          </button>
        ) : null}
        {githubReady && githubReady.status !== 'installed' ? (
          <button className="uc-primary-btn" onClick={() => onInstall(githubReady)} disabled={busy !== null}>
            Install downloaded update
          </button>
        ) : null}
        {!release.newer ? (
          <span className="uc-muted">Plot Docs v{state.currentVersion} is the latest GitHub release.</span>
        ) : null}
        {asset && !asset.installable ? (
          <button className="uc-secondary-btn" onClick={onOpenFolder}>
            <FolderIcon />
            Open folder
          </button>
        ) : null}
      </div>
      {release.htmlUrl ? (
        <a className="uc-release-link" href={release.htmlUrl} target="_blank" rel="noreferrer">
          View release on GitHub
        </a>
      ) : null}
    </section>
  )
}

export interface NotificationsCenterPanelProps {
  open: boolean
  tab: UpdatesCenterTab
  onTab: (tab: UpdatesCenterTab) => void
  onClose: () => void
  state: UpdatesCenterState | null
  loading: boolean
  error: string | null
  api: UpdatesCenterApi | null
  onState: (state: UpdatesCenterState) => void
}

export function NotificationsCenterPanel({
  open,
  tab,
  onTab,
  onClose,
  state,
  loading,
  error,
  api,
  onState,
}: NotificationsCenterPanelProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [allowUnsigned, setAllowUnsigned] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setConfirmId(null)
      setActionError(null)
      setNotice(null)
      setAllowUnsigned(false)
    }
  }, [open])

  if (!open) return null

  const run = async (key: string, action: () => Promise<UpdateActionResult | void>): Promise<void> => {
    if (!api || busy) return
    setBusy(key)
    setActionError(null)
    setNotice(null)
    try {
      const result = await action()
      if (result) {
        if (result.state) onState(result.state)
        if (!result.ok) throw new Error(result.error ?? 'The action failed.')
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  const refresh = (): void => {
    if (!api) return
    setBusy('refresh')
    setActionError(null)
    void api
      .refresh()
      .then(onState)
      .catch((error: unknown) => setActionError(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(null))
  }

  const checkGithub = (): void => {
    if (!api) return
    setBusy('github')
    setActionError(null)
    void api
      .checkGithub()
      .then(onState)
      .catch((error: unknown) => setActionError(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(null))
  }

  const download = (): void => {
    if (!api) return
    void run('download', async () => {
      const result = await api.downloadGithub()
      if (result.ok) setNotice('Update downloaded. Review it, then install when ready.')
      return result
    })
  }

  const install = (pkg: UpdatePackage): void => {
    if (!api) return
    void run(`install:${pkg.id}`, async () => {
      const result = await api.installUpdate({
        id: pkg.id,
        confirmed: true,
        allowUnsigned,
      })
      if (result.ok) {
        setConfirmId(null)
        setAllowUnsigned(false)
        setNotice('Update installed. Restart Plot Docs to run the new version.')
      }
      return result
    })
  }

  const restart = (): void => {
    if (!api) return
    void run('restart', async () => {
      const result = await api.restartApp()
      if (!result.ok) throw new Error(result.error ?? 'The app could not be restarted.')
      return result
    })
  }

  const openFolder = (kind: UpdatesFolderKind): void => {
    if (!api) return
    void api.openFolder(kind).catch(() => undefined)
  }

  const notifications = state?.notifications ?? []
  const updates = state?.updates ?? []
  const github = state?.github ?? null
  const githubDownloading =
    updates.find((pkg) => pkg.source === 'github' && pkg.status === 'downloading') ?? null
  const githubReady =
    (github
      ? updates.find(
          (pkg) =>
            pkg.fileName === github.asset?.name ||
            (pkg.source === 'github' && pkg.version === github.version),
        )
      : null) ?? null
  const localPackages = updates.filter((pkg) => pkg.source === 'local')
  const installedReady = updates.some((pkg) => pkg.status === 'installed')
  const heroVersion = state?.latestVersion ?? null
  const showHero = Boolean(state && (state.updateAvailable || state.restartRequired))

  return (
    <div className="uc-layer">
      <div className="uc-scrim" onClick={onClose} />
      <section className="uc-panel" role="dialog" aria-label="Notifications and updates">
        <header className="uc-header">
          <div>
            <strong>Notifications &amp; updates</strong>
            <span>Plot Docs v{state?.currentVersion ?? '—'}</span>
          </div>
          <div className="uc-header-actions">
            <button className="uc-icon-btn" title="Refresh" aria-label="Refresh" onClick={refresh} disabled={busy !== null}>
              {busy === 'refresh' ? <Spinner /> : <RefreshIcon />}
            </button>
            <button className="uc-icon-btn" title="Close" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>

        {showHero ? (
          <div className={`uc-update-hero${state?.restartRequired ? ' is-restart' : ''}`}>
            <div className="uc-update-hero-icon" aria-hidden="true">
              {state?.restartRequired ? <CheckIcon /> : <DownloadIcon />}
            </div>
            <div className="uc-update-hero-body">
              <strong>
                {state?.restartRequired
                  ? 'Restart to finish the update'
                  : `Update available${heroVersion ? ` · v${heroVersion}` : ''}`}
              </strong>
              <span>
                {state?.restartRequired
                  ? 'The new executable is installed. Your documents and settings are untouched.'
                  : 'Review the release, download the portable build, and install when ready.'}
              </span>
            </div>
            {state?.restartRequired ? (
              <button className="uc-primary-btn" onClick={restart} disabled={busy !== null}>
                {busy === 'restart' ? <Spinner /> : null}
                Restart now
              </button>
            ) : (
              <button className="uc-primary-btn" onClick={() => onTab('updates')}>
                View update
              </button>
            )}
          </div>
        ) : null}

        <div className="uc-tabs" role="tablist">
          <button
            className={tab === 'notifications' ? 'active' : ''}
            role="tab"
            aria-selected={tab === 'notifications'}
            onClick={() => onTab('notifications')}
          >
            Notifications
            {state && state.unreadCount > 0 ? <span className="uc-tab-badge">{state.unreadCount}</span> : null}
          </button>
          <button
            className={tab === 'updates' ? 'active' : ''}
            role="tab"
            aria-selected={tab === 'updates'}
            onClick={() => onTab('updates')}
          >
            Updates
            {state?.updateAvailable ? <span className="uc-tab-dot" aria-label="Update available" /> : null}
          </button>
        </div>

        <div className="uc-content">
          {error ? <div className="uc-inline-error">{error}</div> : null}
          {actionError ? <div className="uc-inline-error">{actionError}</div> : null}
          {notice ? (
            <div className="uc-success">
              <CheckIcon />
              {notice}
            </div>
          ) : null}
          {state?.restartRequired ? (
            <div className="uc-restart-banner">
              <div>
                <strong>Restart to finish the update</strong>
                <span>The new executable is installed and the previous one is backed up.</span>
              </div>
              <button className="uc-primary-btn" onClick={restart} disabled={busy !== null}>
                {busy === 'restart' ? <Spinner /> : null}
                Restart now
              </button>
            </div>
          ) : null}

          {loading && !state ? (
            <div className="uc-empty">
              <Spinner />
              <span>Loading notifications and updates…</span>
            </div>
          ) : null}

          {!state && !loading ? (
            <div className="uc-empty">
              <AlertIcon />
              <span>Updates and notifications are unavailable.</span>
            </div>
          ) : null}

          {state && tab === 'notifications' ? (
            <div className="uc-notifications">
              {notifications.length === 0 ? (
                <div className="uc-empty">
                  <AlertIcon />
                  <strong>No notifications yet</strong>
                  <span>
                    Add a JSON file to the notifications folder and it will appear here instantly.
                  </span>
                  <button className="uc-secondary-btn" onClick={() => openFolder('notifications')}>
                    <FolderIcon />
                    Open notifications folder
                  </button>
                </div>
              ) : (
                <>
                  <div className="uc-list-toolbar">
                    <span>{notifications.length} notification{notifications.length === 1 ? '' : 's'}</span>
                    {state.unreadCount > 0 ? (
                      <button
                        className="uc-link-btn"
                        onClick={() => {
                          if (!api) return
                          void api.markAllRead().then(onState).catch(() => undefined)
                        }}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  {notifications.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onRead={() => {
                        if (!api) return
                        void api.markRead(notification.id).then(onState).catch(() => undefined)
                      }}
                      onDelete={() => {
                        if (!api) return
                        if (!window.confirm('Delete this notification file permanently?')) return
                        void api
                          .deleteNotification(notification.id)
                          .then(onState)
                          .catch((deleteError: unknown) =>
                            setActionError(
                              deleteError instanceof Error ? deleteError.message : String(deleteError),
                            ),
                          )
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          ) : null}

          {state && tab === 'updates' ? (
            <div className="uc-updates">
              <GithubCard
                state={state}
                busy={busy}
                onCheck={checkGithub}
                onDownload={download}
                onInstall={(pkg) => {
                  setConfirmId(pkg.id)
                  setAllowUnsigned(false)
                }}
                onOpenFolder={() => openFolder('updates')}
                githubDownloading={githubDownloading}
                githubReady={githubReady}
              />

              <section className="uc-local-section">
                <div className="uc-section-heading">
                  <div>
                    <strong>Local update packages</strong>
                    <span>Drop portable .exe files into the updates folder</span>
                  </div>
                  <button className="uc-secondary-btn" onClick={() => openFolder('updates')}>
                    <FolderIcon />
                    Open folder
                  </button>
                </div>
                {localPackages.length === 0 ? (
                  <div className="uc-empty uc-empty-small">
                    <span>No local packages found.</span>
                  </div>
                ) : (
                  localPackages.map((pkg) => (
                    <UpdateCard
                      key={pkg.id}
                      pkg={pkg}
                      busy={busy}
                      confirming={confirmId === pkg.id}
                      allowUnsigned={allowUnsigned}
                      onAllowUnsigned={setAllowUnsigned}
                      onConfirm={() => {
                        setConfirmId(pkg.id)
                        setAllowUnsigned(false)
                      }}
                      onCancel={() => {
                        setConfirmId(null)
                        setAllowUnsigned(false)
                      }}
                      onInstall={() => install(pkg)}
                      onOpenFolder={() => openFolder('updates')}
                    />
                  ))
                )}
              </section>

              <details className="uc-history">
                <summary>
                  Update history
                  <span>{state.history.length}</span>
                </summary>
                {state.history.length === 0 ? (
                  <p className="uc-muted">No update activity yet.</p>
                ) : (
                  <div className="uc-history-list">
                    {state.history.map((entry) => (
                      <div className="uc-history-row" key={`${entry.id}:${entry.at}:${entry.status}`}>
                        <StatusChip status={entry.status} />
                        <div>
                          <strong>
                            {entry.fileName} {entry.version ? `v${entry.version}` : ''}
                          </strong>
                          <span>{entry.message}</span>
                          <span>{formatDate(entry.at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>

              <div className="uc-folders">
                <div>
                  <span>Updates</span>
                  <code title={state.updatesDir}>{state.updatesDir}</code>
                  <button className="uc-link-btn" onClick={() => openFolder('updates')}>
                    Open
                  </button>
                </div>
                <div>
                  <span>Notifications</span>
                  <code title={state.notificationsDir}>{state.notificationsDir}</code>
                  <button className="uc-link-btn" onClick={() => openFolder('notifications')}>
                    Open
                  </button>
                </div>
                {state.updateDirs.length > 1 ? (
                  <p className="uc-muted">Also watching {state.updateDirs.length - 1} extra update folder(s).</p>
                ) : null}
                {installedReady ? (
                  <p className="uc-muted">Installed packages stay in the folder so you can roll back or reinstall.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

/**
 * A single, prominent update popup.
 *
 * This mirrors the update pattern used by desktop apps such as VS Code and
 * Slack: the app checks quietly, then surfaces one clear "update available"
 * card with View / Later actions. Dismissal is remembered per version for the
 * current window session, so a refresh cannot spam the user, while a new
 * version (or a fresh launch) shows it again.
 */
export function UpdateToast({
  state,
  hidden,
  onOpen,
  onRestart,
}: {
  state: UpdatesCenterState | null
  hidden?: boolean
  onOpen: () => void
  onRestart: () => void
}) {
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem('plotdocs.update.dismissed')
    } catch {
      return null
    }
  })
  const [restartDismissed, setRestartDismissed] = useState(false)

  const version = state?.latestVersion ?? null
  const restart = Boolean(state?.restartRequired)
  const available = Boolean(state?.updateAvailable)
  const dismissKey = version ?? (restart ? 'restart' : 'update')
  const visible = !hidden && (restart ? !restartDismissed : available && dismissKey !== dismissedVersion)

  const dismiss = (): void => {
    if (restart) {
      setRestartDismissed(true)
      return
    }
    setDismissedVersion(dismissKey)
    try {
      window.sessionStorage.setItem('plotdocs.update.dismissed', dismissKey)
    } catch {
      // sessionStorage can be unavailable in hardened renderers; the popup
      // simply reappears next launch, which is the safe default.
    }
  }

  // Opening the update panel is an acknowledgement: do not pop the same
  // version back up after the user closes the panel.
  useEffect(() => {
    if (!hidden || restart || !available || dismissKey === dismissedVersion) return
    setDismissedVersion(dismissKey)
    try {
      window.sessionStorage.setItem('plotdocs.update.dismissed', dismissKey)
    } catch {
      // ignore storage failures
    }
  }, [hidden, restart, available, dismissKey, dismissedVersion])

  // A later update/install should be allowed to surface its own restart card.
  useEffect(() => {
    if (!restart) setRestartDismissed(false)
  }, [restart])

  if (!state || !visible) return null

  const title = restart
    ? 'Restart to finish the update'
    : version
      ? `Plot Docs v${version} is available`
      : 'A new Plot Docs update is available'
  const message = restart
    ? 'The new executable is installed and your previous version is backed up.'
    : state.github?.newer && state.github.releaseNotes
      ? state.github.releaseNotes.split('\n').find((line) => line.trim()) ?? 'A new version is ready.'
      : 'A new version is ready to review, download, and install.'

  return (
    <section className="uc-update-toast" role="status" aria-label={title}>
      <div className="uc-update-toast-icon" aria-hidden="true">
        {restart ? <CheckIcon /> : <DownloadIcon />}
      </div>
      <div className="uc-update-toast-body">
        <span className="uc-update-toast-eyebrow">{restart ? 'Ready to restart' : 'Update available'}</span>
        <strong>{title}</strong>
        <p>{message}</p>
        <div className="uc-update-toast-actions">
          {restart ? (
            <button className="uc-primary-btn" onClick={onRestart}>
              Restart now
            </button>
          ) : (
            <button
              className="uc-primary-btn"
              onClick={() => {
                dismiss()
                onOpen()
              }}
            >
              View update
            </button>
          )}
          <button className="uc-link-btn" onClick={dismiss}>
            Later
          </button>
        </div>
      </div>
      <button className="uc-icon-btn" title="Dismiss" aria-label="Dismiss update" onClick={dismiss}>
        <CloseIcon />
      </button>
    </section>
  )
}

export function NotificationToast({
  notifications,
  onOpen,
}: {
  notifications: InAppNotification[]
  onOpen: () => void
}) {
  const seen = useRef<Set<string> | null>(null)
  const [toast, setToast] = useState<InAppNotification | null>(null)

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((notification) => notification.id))
      return
    }
    const fresh = notifications.find(
      (notification) => !notification.read && !seen.current?.has(notification.id),
    )
    for (const notification of notifications) seen.current.add(notification.id)
    if (fresh) setToast(fresh)
  }, [notifications])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 7000)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  return (
    <div
      className={`uc-toast uc-type-${toast.type}`}
      role="status"
      onClick={() => {
        setToast(null)
        onOpen()
      }}
    >
      <div className="uc-toast-mark" aria-hidden="true">
        {toast.type === 'success' ? <CheckIcon /> : <AlertIcon />}
      </div>
      <div>
        <strong>{toast.title}</strong>
        {toast.message ? <p>{toast.message}</p> : null}
        <span>{formatDate(toast.date)}</span>
      </div>
      <button
        className="uc-icon-btn"
        title="Dismiss"
        aria-label="Dismiss"
        onClick={(event) => {
          event.stopPropagation()
          setToast(null)
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
