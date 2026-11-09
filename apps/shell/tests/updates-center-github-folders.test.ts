import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: () => '',
    isPackaged: false,
    relaunch: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: { getFocusedWindow: () => null },
  Notification: class {
    static isSupported() {
      return false
    }
    on() {}
    close() {}
    show() {}
  },
  shell: { openPath: async () => '' },
  ipcMain: { handle: vi.fn() },
}))

import { createUpdatesCenter } from '../src/main/updates-center'

const roots: string[] = []

function temporaryRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'plotdocs-github-folders-'))
  roots.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function text(value: string): Response {
  return new Response(value, { status: 200, headers: { 'content-type': 'text/plain' } })
}

function windowStub(): {
  isDestroyed: () => boolean
  isFocused: () => boolean
  webContents: { send: () => void }
} {
  return {
    isDestroyed: () => false,
    isFocused: () => true,
    webContents: { send: () => undefined },
  }
}

describe('GitHub folder updates and notifications', () => {
  it('uses a portable exe from the repository updates folder and reads not.txt', async () => {
    const root = temporaryRoot()
    const hash = createHash('sha256').update('new build').digest('hex')
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/releases/latest')) {
        return json({ message: 'Not Found' }, 404)
      }
      if (url.includes('/contents/updates')) {
        return json([
          {
            name: 'Plot-Docs-1.0.1.exe',
            path: 'updates/Plot-Docs-1.0.1.exe',
            sha: 'abc123',
            size: 9,
            type: 'file',
            download_url:
              'https://raw.githubusercontent.com/sukhee-2626/plot-docs/main/updates/Plot-Docs-1.0.1.exe',
            html_url:
              'https://github.com/sukhee-2626/plot-docs/blob/main/updates/Plot-Docs-1.0.1.exe',
          },
          {
            name: 'update.json',
            path: 'updates/update.json',
            sha: 'def456',
            size: 200,
            type: 'file',
            download_url:
              'https://raw.githubusercontent.com/sukhee-2626/plot-docs/main/updates/update.json',
            html_url:
              'https://github.com/sukhee-2626/plot-docs/blob/main/updates/update.json',
          },
        ])
      }
      if (url.includes('/contents/notifications')) {
        return json([
          {
            name: 'not.txt',
            path: 'notifications/not.txt',
            sha: 'txt123',
            size: 40,
            type: 'file',
            download_url:
              'https://raw.githubusercontent.com/sukhee-2626/plot-docs/main/notifications/not.txt',
            html_url:
              'https://github.com/sukhee-2626/plot-docs/blob/main/notifications/not.txt',
          },
        ])
      }
      if (url.endsWith('/updates/update.json')) {
        return json({
          version: '1.0.1',
          file: 'Plot-Docs-1.0.1.exe',
          sha256: hash,
          notes: 'Fixes the update center.',
        })
      }
      if (url.endsWith('/notifications/not.txt')) {
        return text('Title: Maintenance tonight\nType: warning\n\nPlot Docs will restart shortly.')
      }
      if (url.endsWith('/updates/Plot-Docs-1.0.1.exe')) {
        return new Response('new build', {
          status: 200,
          headers: {
            'content-type': 'application/octet-stream',
            'content-length': '9',
          },
        })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    const currentExe = join(root, 'Plot Docs.exe')
    writeFileSync(currentExe, 'old build')
    const service = createUpdatesCenter({
      currentVersion: '1.0.0',
      isPackaged: true,
      platform: 'win32',
      arch: 'x64',
      userDataDir: join(root, 'userData'),
      repoRoot: null,
      updatesDir: join(root, 'updates'),
      notificationsDir: join(root, 'notifications'),
      githubRepo: 'sukhee-2626/plot-docs',
      getWindow: () => windowStub() as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      currentExePath: currentExe,
      checkSignature: async () => 'valid',
    })
    try {
      await service.start()
      const state = await service.checkGithub()
      expect(state.github).toMatchObject({
        version: '1.0.1',
        newer: true,
        asset: {
          name: 'Plot-Docs-1.0.1.exe',
          sha256: hash,
          installable: true,
        },
      })
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0]).toMatchObject({
        title: 'Maintenance tonight',
        message: 'Plot Docs will restart shortly.',
        type: 'warning',
        remote: true,
      })
      expect(state.unreadCount).toBe(1)

      const read = await service.markRead(state.notifications[0]!.id)
      expect(read.notifications[0]?.read).toBe(true)
      expect(read.unreadCount).toBe(0)

      const downloaded = await service.downloadGithub()
      expect(downloaded.ok).toBe(true)
      const packageToInstall = downloaded.state?.updates.find(
        (pkg) => pkg.fileName === 'Plot-Docs-1.0.1.exe' && pkg.status === 'downloaded',
      )
      expect(packageToInstall).toBeTruthy()

      const installed = await service.installUpdate({
        id: packageToInstall!.id,
        confirmed: true,
      })
      expect(installed.ok).toBe(true)
      expect(installed.restartRequired).toBe(true)
      expect(readFileSync(currentExe, 'utf8')).toBe('new build')
      expect(installed.state?.updates.some((pkg) => pkg.status === 'installed')).toBe(true)
    } finally {
      service.dispose()
    }
  })

  it('prefers the newer of a GitHub release and a repository folder update', async () => {
    const root = temporaryRoot()
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/releases/latest')) {
        return json({
          tag_name: 'v1.0.2',
          name: 'Plot Docs 1.0.2',
          body: 'Release notes',
          html_url: 'https://github.com/sukhee-2626/plot-docs/releases/tag/v1.0.2',
          published_at: '2026-11-09T12:00:00Z',
          assets: [
            {
              name: 'Plot-Docs-1.0.2.exe',
              size: 20,
              browser_download_url:
                'https://github.com/sukhee-2626/plot-docs/releases/download/v1.0.2/Plot-Docs-1.0.2.exe',
            },
          ],
        })
      }
      if (url.includes('/contents/updates')) {
        return json([
          {
            name: 'Plot-Docs-1.0.1.exe',
            path: 'updates/Plot-Docs-1.0.1.exe',
            sha: 'abc',
            size: 9,
            type: 'file',
            download_url:
              'https://raw.githubusercontent.com/sukhee-2626/plot-docs/main/updates/Plot-Docs-1.0.1.exe',
            html_url:
              'https://github.com/sukhee-2626/plot-docs/blob/main/updates/Plot-Docs-1.0.1.exe',
          },
        ])
      }
      if (url.includes('/contents/notifications')) return json([])
      throw new Error(`unexpected fetch: ${url}`)
    })

    const service = createUpdatesCenter({
      currentVersion: '1.0.0',
      isPackaged: false,
      platform: 'win32',
      arch: 'x64',
      userDataDir: join(root, 'userData'),
      repoRoot: null,
      updatesDir: join(root, 'updates'),
      notificationsDir: join(root, 'notifications'),
      githubRepo: 'sukhee-2626/plot-docs',
      getWindow: () => windowStub() as never,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      currentExePath: join(root, 'Plot Docs.exe'),
    })
    try {
      await service.start()
      const state = await service.checkGithub()
      expect(state.github?.version).toBe('1.0.2')
      expect(state.github?.asset?.name).toBe('Plot-Docs-1.0.2.exe')
    } finally {
      service.dispose()
    }
  })
})
