import { test, expect } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeAndSaveVideo, dismissShellOverlays, launchShell } from './helpers'

/**
 * End-to-end coverage for the file-backed updates/notifications center.
 *
 * Uses isolated folders so the test never touches the repository's real
 * `updates/` or `notifications/` directories.
 */
test.describe('updates and notifications center', () => {
  test('detects notification files live, marks read, deletes, and scans local packages', async () => {
    test.setTimeout(120_000)
    const root = await mkdtemp(join(tmpdir(), 'plotdocs-updates-e2e-'))
    const updatesDir = join(root, 'updates')
    const notificationsDir = join(root, 'notifications')
    await mkdir(updatesDir, { recursive: true })
    await mkdir(notificationsDir, { recursive: true })

    const launched = await launchShell({
      onboardingSeen: true,
      videoDir: 'updates-notifications',
      env: {
        PLOTDOCS_UPDATES_DIR: updatesDir,
        PLOTDOCS_NOTIFICATIONS_DIR: notificationsDir,
      },
    })
    const { page } = launched

    try {
      // Wait until the main service has resolved the isolated folders.
      await expect
        .poll(
          async () =>
            page.evaluate(async () => {
              const api = (window as unknown as { plotdocsUpdates?: { getState: () => Promise<{ updatesDir: string } | null> } })
                .plotdocsUpdates
              const state = await api?.getState()
              return state?.updatesDir ?? null
            }),
          { timeout: 20_000 },
        )
        .toBe(updatesDir)

      await dismissShellOverlays(page)

      const bell = page.locator('.tab-notification-btn')
      await expect(bell).toBeVisible()
      await expect(page.locator('.tab-notification-badge')).toHaveCount(0)

      // Dropping a JSON file must update the badge and panel without a reload.
      await writeFile(
        join(notificationsDir, 'welcome.json'),
        JSON.stringify({
          title: 'E2E welcome',
          message: 'A real-time notification.',
          date: '2026-11-08T12:00:00.000Z',
          type: 'success',
        }),
      )
      await expect(page.locator('.tab-notification-badge')).toHaveText('1', { timeout: 15_000 })

      await bell.click()
      const panel = page.locator('.uc-panel')
      await expect(panel).toBeVisible()
      await expect(panel).toContainText('Notifications & updates')
      await expect(panel.locator('.uc-notification')).toContainText('E2E welcome')
      await expect(panel.locator('.uc-notification')).toContainText('A real-time notification.')

      // Mark read: badge clears and the read state is persisted.
      await panel.locator('.uc-notification').getByRole('button', { name: 'Mark as read' }).click()
      await expect(page.locator('.tab-notification-badge')).toHaveCount(0)
      await expect
        .poll(async () => {
          const state = JSON.parse(
            await readFile(join(notificationsDir, 'state.json'), 'utf8'),
          ) as { read?: Record<string, boolean> }
          return Object.values(state.read ?? {}).some(Boolean)
        })
        .toBe(true)

      // Delete: confirm the native dialog, source file and row both disappear.
      page.once('dialog', (dialog) => void dialog.accept())
      await panel.locator('.uc-notification').getByRole('button', { name: 'Delete notification' }).click()
      await expect(panel.locator('.uc-notification')).toHaveCount(0)
      await expect(panel).toContainText('No notifications yet')
      await expect.poll(async () => {
        try {
          await readFile(join(notificationsDir, 'welcome.json'), 'utf8')
          return true
        } catch {
          return false
        }
      }).toBe(false)

      // Local package detection: manifest supplies version and notes.
      await panel.getByRole('button', { name: 'Close' }).click()
      await expect(panel).toBeHidden()
      await writeFile(join(updatesDir, 'Plot-Docs-9.9.9.exe'), Buffer.from('not a real executable'))
      await writeFile(
        join(updatesDir, 'update.json'),
        JSON.stringify({
          version: '9.9.9',
          file: 'Plot-Docs-9.9.9.exe',
          releaseNotes: 'E2E local package',
          sha256: '0'.repeat(64),
        }),
      )

      // A newly detected update must pop up once, with a clear View/Later action.
      const updateToast = page.locator('.uc-update-toast')
      await expect(updateToast).toBeVisible({ timeout: 15_000 })
      await expect(updateToast).toContainText('Update available')
      await expect(updateToast).toContainText('Plot Docs v9.9.9 is available')
      await expect(page.locator('.tab-update-dot')).toBeVisible()

      await updateToast.getByRole('button', { name: 'View update' }).click()
      await expect(updateToast).toBeHidden()
      await expect(panel).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Updates' })).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('.uc-update-hero')).toContainText('Update available · v9.9.9')
      const card = page.locator('.uc-update-card')
      await expect(card).toBeVisible({ timeout: 15_000 })
      await expect(card).toContainText('Plot-Docs-9.9.9.exe')
      await expect(card).toContainText('v9.9.9')
      await expect(card).toContainText('E2E local package')
      await expect(card).toContainText('Available')
    } finally {
      await closeAndSaveVideo(launched, 'updates-notifications')
      await rm(root, { recursive: true, force: true }).catch(() => undefined)
    }
  })
})
