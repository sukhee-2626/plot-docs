import { test, expect, _electron as electron } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { closeAndSaveVideo, dismissShellOverlays } from './helpers'

/**
 * Packaged install smoke test.
 *
 * Launches the unpacked release build against a scratch profile and an isolated
 * updates folder, then installs a copy of its own executable. This exercises the
 * real packaged path: checksum, Authenticode check, unsigned acknowledgement,
 * backup, executable replacement, installed state, and restart banner.
 *
 * Run `npm run dist:portable -w @plotdocs/shell` first.
 */
test.describe('packaged update install', () => {
  test.skip(process.platform !== 'win32', 'Windows executable replacement only')

  test('backs up and replaces the packaged executable after confirmation', async () => {
    test.setTimeout(180_000)
    const packagedExe = resolve(
      __dirname,
      '../apps/shell/release-portable/win-unpacked/Plot Docs.exe',
    )
    test.skip(!existsSync(packagedExe), 'unpacked release build is missing')

    const root = await mkdtemp(join(tmpdir(), 'plotdocs-install-e2e-'))
    const updatesDir = join(root, 'updates')
    const notificationsDir = join(root, 'notifications')
    const userDataDir = join(root, 'user-data')
    await mkdir(updatesDir, { recursive: true })
    await mkdir(notificationsDir, { recursive: true })
    await mkdir(userDataDir, { recursive: true })
    await writeFile(
      join(userDataDir, 'app-settings.json'),
      JSON.stringify({ onboardingSeen: true, starPrompt: { resolved: true } }),
    )

    const updatePath = join(updatesDir, 'Plot-Docs-9.9.9.exe')
    await copyFile(packagedExe, updatePath)
    const updateSha = createHash('sha256').update(await readFile(updatePath)).digest('hex')
    await writeFile(
      join(updatesDir, 'update.json'),
      JSON.stringify({
        version: '9.9.9',
        file: 'Plot-Docs-9.9.9.exe',
        sha256: updateSha,
        releaseNotes: 'Packaged install E2E.',
      }),
    )

    const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...hostEnv } = process.env
    const app = await electron.launch({
      executablePath: packagedExe,
      args: [],
      env: {
        ...hostEnv,
        PLOTDOCS_USER_DATA: userDataDir,
        PLOTDOCS_NO_SPARE_VIEW: '1',
        PLOTDOCS_LANG: 'en',
        PLOTDOCS_UPDATES_DIR: updatesDir,
        PLOTDOCS_NOTIFICATIONS_DIR: notificationsDir,
      },
    })
    const page = await app.firstWindow()
    const launched = { app, page, userDataDir }

    try {
      await page.waitForSelector('.app-frame', { timeout: 30_000 })
      await dismissShellOverlays(page)
      await expect(page.locator('.tab-notification-btn')).toBeVisible()

      await page.locator('.tab-notification-btn').click()
      await page.getByRole('tab', { name: 'Updates' }).click()
      const card = page.locator('.uc-update-card').filter({ hasText: 'Plot-Docs-9.9.9.exe' })
      await expect(card).toBeVisible({ timeout: 20_000 })
      await expect(card).toContainText('v9.9.9')

      await card.getByRole('button', { name: 'Install update' }).click()
      const confirm = card.locator('.uc-confirm')
      await expect(confirm).toBeVisible()
      await confirm.locator('input[type="checkbox"]').check()
      await confirm.getByRole('button', { name: 'Install update' }).click()

      await expect(page.locator('.uc-restart-banner')).toBeVisible({ timeout: 60_000 })
      await expect(page.locator('.uc-restart-banner')).toContainText('Restart to finish the update')
      await expect(card).toContainText('Installed')

      const backups = await readdir(join(updatesDir, 'backups'))
      expect(backups.some((name) => name.endsWith('.exe'))).toBe(true)
      const installedSha = createHash('sha256').update(await readFile(packagedExe)).digest('hex')
      expect(installedSha).toBe(updateSha)

      const installedState = JSON.parse(
        await readFile(join(updatesDir, 'state.json'), 'utf8'),
      ) as { installed?: Record<string, { backupPath?: string }> }
      expect(Object.keys(installedState.installed ?? {}).length).toBeGreaterThan(0)
    } finally {
      await closeAndSaveVideo(launched, 'updates-install')
      await rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  })
})
