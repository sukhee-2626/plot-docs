import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/**
 * The default provider is Soopus AI. Its integration card must read as an
 * account connection (not a bare API-key form), stay inside the pane at the
 * minimum window size, and keep the model/tools controls reachable below it.
 */
test('Soopus AI integration card fits both regular and minimum windows', async () => {
  test.setTimeout(300_000)
  const launched = await launchShell({
    onboardingSeen: true,
    settings: { starPrompt: { resolved: true } },
    videoDir: 'settings-soopus-integration',
  })
  const { page, app } = launched
  try {
    // The splash can park at its last percent while fonts warm up; its escape
    // hatch is the same entry the user gets. Poll for it instead of checking
    // once, because the button only appears after the progress stalls.
    const splash = page.locator('.plot-splash')
    // Give the first paint a moment to mount the splash; checking too early
    // sees an absent node and mistakes it for a finished launch.
    await expect(splash).toBeVisible({ timeout: 10_000 }).catch(() => undefined)
    const splashDeadline = Date.now() + 45_000
    while (Date.now() < splashDeadline) {
      if (await splash.isHidden().catch(() => true)) break
      if (await page.locator('.plot-splash-skip').isVisible().catch(() => false)) {
        // The cinematic button can still be moving when the test sees it, and
        // Playwright's stability wait would miss the 30-second auto-dismiss.
        await page
          .locator('.plot-splash-skip')
          .evaluate((button) => (button as HTMLElement).click())
          .catch(() => undefined)
        await page.waitForTimeout(250)
        continue
      }
      await page.waitForTimeout(200)
    }
    await expect(splash).toBeHidden({ timeout: 15_000 })
    // A scratch profile has no localStorage yet, so Home may raise its guided
    // tour after the splash. Dismiss it before opening the account menu.
    const skipTour = page.getByRole('button', { name: 'Skip tour' })
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (await skipTour.isVisible().catch(() => false)) {
        await skipTour.click()
        break
      }
      await page.waitForTimeout(300)
    }
    await expect(page.locator('.home-tour')).toBeHidden({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.locator('.set-dialog')).toBeVisible({ timeout: 30_000 })
    await page.locator('.set-nav-item').filter({ hasText: 'AI Model' }).click()

    const hero = page.locator('.set-soopus-hero')
    await expect(hero).toBeVisible()
    await expect(hero).toContainText('Soopus AI')
    await expect(hero.locator('.set-soopus-state')).toContainText('Sign in with Soopus')
    await expect(hero.getByRole('button', { name: 'Sign in with Soopus' })).toBeVisible()
    await expect(page.locator('.set-pane-ai-model')).toContainText('Soopus AI cloud tools')
    const cloudTools = page.getByRole('switch', { name: 'Soopus AI cloud tools' })
    await expect(cloudTools).toHaveAttribute('aria-checked', 'true')
    await expect(cloudTools).toBeDisabled()

    for (const size of [
      { width: 1280, height: 800 },
      { width: 720, height: 550 },
    ]) {
      await app.evaluate(({ BrowserWindow }, { width, height }) => {
        BrowserWindow.getAllWindows()[0]!.setSize(width, height)
      }, size)
      await expect(page.locator('.set-pane-ai-model')).toBeVisible()
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(size.width)

      const overflow = await hero.evaluate((card) => {
        const elements = [card, ...card.querySelectorAll<HTMLElement>('*')]
        return elements
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => ({
            className: element.className,
            text: element.textContent?.trim().slice(0, 80),
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
          }))
      })
      expect(overflow).toEqual([])

      await page.screenshot({
        path: screenshotPath(`settings-soopus-${size.width}`),
      })
    }

    await page.evaluate(async () => {
      await window.aiOffice.setTheme('dark')
    })
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark')
    await hero.scrollIntoViewIfNeeded()
    await page.screenshot({ path: screenshotPath('settings-soopus-dark') })
    await page.evaluate(async () => {
      await window.aiOffice.setTheme('system')
    })

    // The signed-in branch is driven by the provider's device login, not by
    // the separate local account profile. Mock that one channel and reopen the
    // pane to prove the account identity and test action render.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('ai:soopus-status')
      ipcMain.handle('ai:soopus-status', () => ({
        loggedIn: true,
        email: 'analyst@example.com',
      }))
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('.set-dialog')).toBeHidden()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.locator('.set-nav-item').filter({ hasText: 'AI Model' }).click()
    await expect(hero.locator('.set-soopus-state')).toContainText('Signed in to Soopus')
    await expect(hero).toContainText('analyst@example.com')
    await expect(hero.getByRole('button', { name: 'Test connection' })).toBeVisible()
    await page.screenshot({ path: screenshotPath('settings-soopus-signed-in') })
  } finally {
    await closeAndSaveVideo(launched, 'settings-soopus-integration')
  }
})
