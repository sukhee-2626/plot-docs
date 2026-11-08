import { test, expect } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeAndSaveVideo, dismissShellOverlays, launchShell } from './helpers'

/**
 * Live GitHub release checks.
 *
 * These require network access to api.github.com, so they are opt-in:
 *
 *   $env:PLOTDOCS_LIVE_GITHUB = '1'
 *   npx playwright test e2e/updates-github.spec.ts --config e2e/playwright.config.ts
 *
 * The current-release test is a snapshot of the live repository state. When a
 * newer release is published, update the expected tag/asset below or use the
 * generic assertions.
 */
const live = process.env.PLOTDOCS_LIVE_GITHUB === '1'

test.describe('GitHub release detection', () => {
  test.skip(!live, 'set PLOTDOCS_LIVE_GITHUB=1 to run live GitHub checks')

  test('shows the current release and marks installer assets download-only', async () => {
    test.setTimeout(120_000)
    const root = await mkdtemp(join(tmpdir(), 'plotdocs-github-current-'))
    const updatesDir = join(root, 'updates')
    const notificationsDir = join(root, 'notifications')
    await mkdir(updatesDir, { recursive: true })
    await mkdir(notificationsDir, { recursive: true })
    const launched = await launchShell({
      videoDir: 'updates-github-current',
      onboardingSeen: true,
      env: {
        PLOTDOCS_GITHUB_REPO: 'sukhee-2626/plot-docs',
        PLOTDOCS_UPDATES_DIR: updatesDir,
        PLOTDOCS_NOTIFICATIONS_DIR: notificationsDir,
      },
    })

    try {
      await launched.page.waitForSelector('.app-frame', { timeout: 30_000 })
      await dismissShellOverlays(launched.page)
      await launched.page.locator('.tab-notification-btn').click()
      await launched.page.getByRole('tab', { name: 'Updates' }).click()

      const card = launched.page.locator('.uc-github-card')
      await expect(card).toBeVisible({ timeout: 30_000 })
      await expect(card).toContainText('GitHub release v1.0.0')
      await expect(card).toContainText('You are up to date')
      await expect(card).toContainText('Plot-Docs-Setup-1.0.0.exe')
      await expect(card).toContainText('Download only')
      await expect(card).toContainText('Plot Docs v1.0.0 is the latest GitHub release.')
    } finally {
      await closeAndSaveVideo(launched, 'updates-github-current')
      await rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  test('shows a friendly state when the repository has no release', async () => {
    test.setTimeout(120_000)
    const root = await mkdtemp(join(tmpdir(), 'plotdocs-github-none-'))
    const updatesDir = join(root, 'updates')
    const notificationsDir = join(root, 'notifications')
    await mkdir(updatesDir, { recursive: true })
    await mkdir(notificationsDir, { recursive: true })
    const launched = await launchShell({
      videoDir: 'updates-github-none',
      onboardingSeen: true,
      env: {
        PLOTDOCS_GITHUB_REPO: 'sukhee-2626/plot-docs-no-such-release-for-e2e',
        PLOTDOCS_UPDATES_DIR: updatesDir,
        PLOTDOCS_NOTIFICATIONS_DIR: notificationsDir,
      },
    })

    try {
      await launched.page.waitForSelector('.app-frame', { timeout: 30_000 })
      await dismissShellOverlays(launched.page)
      await launched.page.locator('.tab-notification-btn').click()
      await launched.page.getByRole('tab', { name: 'Updates' }).click()

      const card = launched.page.locator('.uc-github-card')
      await expect(card).toBeVisible({ timeout: 30_000 })
      await expect(card).toContainText('No published GitHub release was found for')
      await expect(card).toContainText('Check now')
    } finally {
      await closeAndSaveVideo(launched, 'updates-github-none')
      await rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  })
})
