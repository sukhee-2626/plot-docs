import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  compareVersions,
  isAllowedGithubAssetUrl,
  isInstallablePackageName,
  normalizeSha256,
  normalizeVersion,
  parseGithubRelease,
  parseNotificationDocument,
  parseTextNotification,
  parseUpdateManifest,
  replaceExecutable,
  safeFileName,
  scanNotificationDirectory,
  scanUpdateDirectory,
  sha256File,
  versionFromFileName,
  watchDirectory,
} from '../src/main/updates-center-core'

const tempDirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'plotdocs-updates-core-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('version handling', () => {
  it('normalizes tags and file-name versions', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3')
    expect(normalizeVersion('refs/tags/v2.0.0-beta.1')).toBe('2.0.0-beta.1')
    expect(normalizeVersion('not-a-version')).toBeNull()
    expect(versionFromFileName('Plot-Docs-1.2.3.exe')).toBe('1.2.3')
    expect(versionFromFileName('app-v2.0.0-beta.1.dmg')).toBe('2.0.0-beta.1')
    expect(versionFromFileName('notes-2026-11-08.txt')).toBeNull()
  })

  it('compares releases, prereleases, and missing patch components', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBe(1)
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1)
  })

  it('normalizes checksums', () => {
    const hash = 'a'.repeat(64)
    expect(normalizeSha256(`sha256:${hash}`)).toBe(hash)
    expect(normalizeSha256(`sha256-${hash}`)).toBe(hash)
    expect(normalizeSha256(hash.toUpperCase())).toBe(hash)
    expect(normalizeSha256('nope')).toBeNull()
  })
})

describe('manifest and package scanning', () => {
  it('parses single, array, and wrapped manifests', () => {
    expect(
      parseUpdateManifest({
        version: '1.0.1',
        file: 'Plot-Docs-1.0.1.exe',
        sha256: `sha256:${'b'.repeat(64)}`,
        notes: 'Fixes',
      }),
    ).toMatchObject([
      {
        file: 'Plot-Docs-1.0.1.exe',
        version: '1.0.1',
        sha256: 'b'.repeat(64),
        releaseNotes: 'Fixes',
      },
    ])
    expect(parseUpdateManifest({ updates: [{ version: '2.0.0' }] })).toHaveLength(1)
    expect(parseUpdateManifest([{ version: '1.0.0' }, { file: 'x.exe' }])).toHaveLength(2)
  })

  it('scans packages, applies manifests, and ignores state/example files', async () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'Plot-Docs-1.0.1.exe'), 'new')
    writeFileSync(join(dir, 'Plot-Docs-Setup-1.0.2.exe'), 'setup')
    writeFileSync(join(dir, 'README.md'), 'docs')
    writeFileSync(join(dir, 'state.json'), '{"history":[]}')
    writeFileSync(join(dir, 'update.example.json'), '{"version":"9.9.9"}')
    writeFileSync(
      join(dir, 'update.json'),
      JSON.stringify({
        version: '1.0.1',
        file: 'Plot-Docs-1.0.1.exe',
        sha256: 'c'.repeat(64),
        releaseNotes: 'Release notes',
      }),
    )

    const packages = await scanUpdateDirectory({ dir, currentVersion: '1.0.0' })
    expect(packages).toHaveLength(2)
    const portable = packages.find((pkg) => pkg.fileName === 'Plot-Docs-1.0.1.exe')
    expect(portable).toMatchObject({
      version: '1.0.1',
      newer: true,
      sha256: 'c'.repeat(64),
      releaseNotes: 'Release notes',
      installable: true,
    })
    const setup = packages.find((pkg) => pkg.fileName === 'Plot-Docs-Setup-1.0.2.exe')
    expect(setup?.installable).toBe(false)
  })

  it('keeps a package with an unknown version but does not treat a same-version file as newer', async () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'Plot-Docs-1.0.0.exe'), 'same')
    writeFileSync(join(dir, 'custom-package.exe'), 'unknown')
    const packages = await scanUpdateDirectory({ dir, currentVersion: '1.0.0' })
    expect(packages.find((pkg) => pkg.fileName === 'Plot-Docs-1.0.0.exe')?.newer).toBe(false)
    expect(packages.find((pkg) => pkg.fileName === 'custom-package.exe')?.newer).toBe(true)
  })

  it('hashes files with SHA-256', async () => {
    const dir = tempDir()
    const file = join(dir, 'payload.bin')
    writeFileSync(file, 'hello')
    expect(await sha256File(file)).toBe(
      createHash('sha256').update('hello').digest('hex'),
    )
  })
})

describe('notifications', () => {
  it('parses one object, arrays, and wrapped notifications', () => {
    const one = parseNotificationDocument(
      { title: 'Hello', message: 'World', type: 'success' },
      'a.json',
      1_700_000_000_000,
      'n0',
    )
    expect(one[0]).toMatchObject({
      title: 'Hello',
      message: 'World',
      type: 'success',
      read: false,
    })
    const many = parseNotificationDocument(
      { notifications: [{ title: 'One' }, { title: 'Two', body: 'Body', type: 'warning' }] },
      'b.json',
      1_700_000_000_000,
      'n0',
    )
    expect(many).toHaveLength(2)
    expect(many[1]).toMatchObject({ title: 'Two', message: 'Body', type: 'warning' })
    expect(parseNotificationDocument({ nope: true }, 'c.json', 0, 'n0')).toHaveLength(0)
  })

  it('applies persisted read state and hides deleted content until it changes', async () => {
    const dir = tempDir()
    const file = join(dir, 'notice.json')
    writeFileSync(file, JSON.stringify({ title: 'Saved', message: 'Read me', type: 'info' }))
    const first = await scanNotificationDirectory({
      dir,
      sourceKey: 'n0',
      state: { read: {}, deleted: {}, hashes: {} },
    })
    expect(first).toHaveLength(1)
    const id = first[0].id
    const hash = createHash('sha1')
      .update(`${first[0].title}\0${first[0].message}\0${first[0].date}\0${first[0].type}`)
      .digest('hex')
    const read = await scanNotificationDirectory({
      dir,
      sourceKey: 'n0',
      state: { read: { [id]: true }, deleted: {}, hashes: { [id]: hash } },
    })
    expect(read[0].read).toBe(true)
    const deleted = await scanNotificationDirectory({
      dir,
      sourceKey: 'n0',
      state: { read: {}, deleted: { [id]: hash }, hashes: { [id]: hash } },
    })
    expect(deleted).toHaveLength(0)
  })

  it('parses plain-text notifications, header blocks, and frontmatter', () => {
    const plain = parseTextNotification(
      '# Maintenance tonight\n\nThe workspace will be read-only for 30 minutes.',
      'not.txt',
      1_700_000_000_000,
      'github',
      'github:not.txt',
    )
    expect(plain[0]).toMatchObject({
      id: 'github:not.txt',
      title: 'Maintenance tonight',
      message: 'The workspace will be read-only for 30 minutes.',
      type: 'info',
      remote: true,
    })

    const headers = parseTextNotification(
      'Title: New release\nType: success\nDate: 2026-11-09T18:00:00Z\n\nPlot Docs 1.0.1 is ready.',
      'release.txt',
      1_700_000_000_000,
      'n0',
    )
    expect(headers[0]).toMatchObject({
      title: 'New release',
      message: 'Plot Docs 1.0.1 is ready.',
      type: 'success',
      date: '2026-11-09T18:00:00.000Z',
    })
    expect(headers[0]?.remote).toBeUndefined()

    const frontmatter = parseTextNotification(
      '---\ntitle: Warning\ntype: warning\n---\nPlease back up your work.',
      'warning.txt',
      1_700_000_000_000,
      'n0',
    )
    expect(frontmatter[0]).toMatchObject({
      title: 'Warning',
      message: 'Please back up your work.',
      type: 'warning',
    })
    expect(parseTextNotification('   ', 'empty.txt', 0, 'n0')).toHaveLength(0)
  })

  it('scans .txt notification files from a local folder', async () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'not.txt'), 'Hello from a text notification')
    const notifications = await scanNotificationDirectory({
      dir,
      sourceKey: 'n0',
      state: { read: {}, deleted: {}, hashes: {} },
    })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      title: 'Hello from a text notification',
      sourceFile: join(dir, 'not.txt'),
    })
  })

  it('watches a folder for a newly written file', async () => {
    const dir = tempDir()
    const seen = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        close()
        reject(new Error('watcher did not fire'))
      }, 8000)
      const close = watchDirectory(dir, () => {
        clearTimeout(timeout)
        close()
        resolve()
      })
    })
    // Give fs.watch a moment to attach before creating the file.
    await new Promise((resolve) => setTimeout(resolve, 250))
    writeFileSync(join(dir, 'new.json'), '{"title":"New"}')
    await seen
  })
})

describe('executable replacement', () => {
  it('backs up the current executable and swaps in the new one', async () => {
    const dir = tempDir()
    const current = join(dir, 'Plot Docs.exe')
    const update = join(dir, 'Plot-Docs-1.0.1.exe')
    const backups = join(dir, 'backups')
    writeFileSync(current, 'old build')
    writeFileSync(update, 'new build')

    const result = await replaceExecutable({
      currentExePath: current,
      updatePath: update,
      backupDir: backups,
      currentVersion: '1.0.0',
      now: 1_700_000_000_000,
    })
    expect(result.ok).toBe(true)
    expect(readFileSync(current, 'utf8')).toBe('new build')
    expect(result.backupPath).toBeTruthy()
    expect(readFileSync(result.backupPath!, 'utf8')).toBe('old build')
    expect(result.oldPath).toBeTruthy()
    expect(readFileSync(result.oldPath!, 'utf8')).toBe('old build')
  })

  it('refuses to replace the executable with itself', async () => {
    const dir = tempDir()
    const current = join(dir, 'Plot Docs.exe')
    writeFileSync(current, 'same')
    const result = await replaceExecutable({
      currentExePath: current,
      updatePath: current,
      backupDir: join(dir, 'backups'),
      currentVersion: '1.0.0',
    })
    expect(result.ok).toBe(false)
  })
})

describe('GitHub release parsing', () => {
  it('selects a portable Windows asset and reads its digest', () => {
    const hash = 'd'.repeat(64)
    const release = parseGithubRelease(
      {
        tag_name: 'v1.2.0',
        name: 'Plot Docs 1.2.0',
        body: 'Notes',
        html_url: 'https://github.com/sukhee-2626/plot-docs/releases/tag/v1.2.0',
        published_at: '2026-11-08T12:00:00.000Z',
        assets: [
          {
            name: 'Plot-Docs-Setup-1.2.0.exe',
            size: 100,
            browser_download_url:
              'https://github.com/sukhee-2626/plot-docs/releases/download/v1.2.0/Plot-Docs-Setup-1.2.0.exe',
          },
          {
            name: 'Plot-Docs-1.2.0.exe',
            size: 90,
            digest: `sha256:${hash}`,
            browser_download_url:
              'https://github.com/sukhee-2626/plot-docs/releases/download/v1.2.0/Plot-Docs-1.2.0.exe',
          },
        ],
      },
      '1.0.0',
      'win32',
      'x64',
    )
    expect(release).toMatchObject({
      version: '1.2.0',
      newer: true,
      asset: { name: 'Plot-Docs-1.2.0.exe', sha256: hash, installable: true },
    })
  })

  it('rejects untrusted asset URLs and accepts GitHub download hosts', () => {
    expect(
      isAllowedGithubAssetUrl('https://github.com/o/r/releases/download/v1/a.exe'),
    ).toBe(true)
    expect(
      isAllowedGithubAssetUrl('https://objects.githubusercontent.com/github-production-release-asset/a.exe'),
    ).toBe(true)
    expect(
      isAllowedGithubAssetUrl('https://api.github.com/repos/o/r/contents/updates/Plot-Docs-1.0.1.exe'),
    ).toBe(true)
    expect(isAllowedGithubAssetUrl('http://github.com/o/r/a.exe')).toBe(false)
    expect(isAllowedGithubAssetUrl('https://evil.example/a.exe')).toBe(false)
    expect(isAllowedGithubAssetUrl('https://github.com.evil.example/a.exe')).toBe(false)
  })

  it('marks a setup-only release as download-only', () => {
    const release = parseGithubRelease(
      {
        tag_name: 'v1.2.0',
        assets: [
          {
            name: 'Plot-Docs-Setup-1.2.0.exe',
            size: 100,
            browser_download_url: 'https://github.com/o/r/releases/download/v1.2.0/setup.exe',
          },
        ],
      },
      '1.0.0',
      'win32',
      'x64',
    )
    expect(release?.asset?.installable).toBe(false)
  })

  it('sanitizes downloaded asset names and installer detection', () => {
    expect(safeFileName('../../Plot Docs.exe')).toBe('Plot Docs.exe')
    expect(safeFileName('CON.exe')).toBe('_CON.exe')
    expect(isInstallablePackageName('Plot-Docs-1.0.1.exe')).toBe(true)
    expect(isInstallablePackageName('Plot-Docs-Setup-1.0.1.exe')).toBe(false)
    expect(isInstallablePackageName('uninstall.exe')).toBe(false)
  })
})
