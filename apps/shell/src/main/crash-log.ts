import { app } from 'electron'
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Local crash and error diagnostics.
 *
 * Plot Docs is a local-first app: when a renderer dies, a child process exits,
 * or the main process throws, the user (and support) need a durable record
 * without any network call. Every entry is best effort and capped so a broken
 * disk can never make the original failure worse.
 */
const MAX_FIELD = 8_000
const MAX_LOG_BYTES = 2 * 1024 * 1024

function diagnosticsPath(): string {
  try {
    return join(app.getPath('userData'), 'diagnostics.log')
  } catch {
    return join(process.cwd(), 'plotdocs-diagnostics.log')
  }
}

function text(value: unknown, max = MAX_FIELD): string {
  if (typeof value === 'string') return value.slice(0, max)
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ''}`.slice(0, max)
  try {
    return JSON.stringify(value).slice(0, max)
  } catch {
    return String(value).slice(0, max)
  }
}

function append(entry: Record<string, unknown>): void {
  try {
    const path = diagnosticsPath()
    mkdirSync(dirname(path), { recursive: true })
    // Node has no append-with-cap primitive; rotate a single backup once the
    // file grows past the cap. Diagnostics never block the caller.
    try {
      if (statSync(path).size > MAX_LOG_BYTES) renameSync(path, `${path}.1`)
    } catch {
      /* first write or the file vanished; append will create it */
    }
    const line = `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`
    appendFileSync(path, line, { encoding: 'utf8' })
  } catch {
    /* diagnostics must never throw into the failure path */
  }
}

/** Record a renderer/main-process failure in userData/diagnostics.log. */
export function recordDiagnostic(kind: string, details: Record<string, unknown>): void {
  append({ kind, ...details })
}

/**
 * Attach process-level diagnostics once, at startup. This only observes:
 * normal navigation, tabs and documents are untouched.
 */
export function installCrashDiagnostics(): void {
  app.on('render-process-gone', (_event, contents, details) => {
    recordDiagnostic('render-process-gone', {
      webContentsId: contents?.id,
      url: (() => {
        try {
          return contents?.getURL()
        } catch {
          return ''
        }
      })(),
      reason: details?.reason,
      exitCode: details?.exitCode,
    })
  })
  app.on('child-process-gone', (_event, details) => {
    recordDiagnostic('child-process-gone', {
      type: details?.type,
      reason: details?.reason,
      exitCode: details?.exitCode,
      serviceName: details?.serviceName,
      name: details?.name,
    })
  })
  process.on('uncaughtException', (error) => {
    recordDiagnostic('uncaught-exception', {
      error: text(error),
    })
    // Keep the existing Electron error dialog/console behavior; this listener
    // only adds the local record.
    console.error('[crash] uncaught exception:', error)
  })
  process.on('unhandledRejection', (reason) => {
    recordDiagnostic('unhandled-rejection', { reason: text(reason) })
    console.error('[crash] unhandled rejection:', reason)
  })
}
