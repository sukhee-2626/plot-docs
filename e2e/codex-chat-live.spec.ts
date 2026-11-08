import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Live Codex chat smoke test.
 *
 * This is opt-in because it needs the OpenAI Codex CLI to be installed and
 * signed in, plus network access to the model catalog. Enable it with:
 *
 *   PLOTDOCS_LIVE_CODEX=1 npm run test:e2e -- codex-chat-live.spec.ts
 *
 * It uses the real app IPC, the real Codex app-server and the real document AI
 * panel. No provider response is mocked.
 */
test.skip(
  process.env.PLOTDOCS_LIVE_CODEX !== '1',
  'Set PLOTDOCS_LIVE_CODEX=1 to run the live Codex chat test.',
)

test('Codex chat streams a real response without crashing', async () => {
  test.setTimeout(300_000)
  const launched = await launchShell({
    onboardingSeen: true,
    settings: { starPrompt: { resolved: true } },
    videoDir: 'codex-chat-live',
  })
  const { page, app } = launched
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  try {
    // The splash can park at its last percent while fonts warm up; its escape
    // hatch is the same entry the user gets.
    const splash = page.locator('.plot-splash')
    await expect(splash).toBeVisible({ timeout: 10_000 }).catch(() => undefined)
    const splashDeadline = Date.now() + 45_000
    while (Date.now() < splashDeadline) {
      if (await splash.isHidden().catch(() => true)) break
      if (await page.locator('.plot-splash-skip').isVisible().catch(() => false)) {
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

    const tour = page.getByRole('dialog', { name: /Plot Docs tour/ })
    if (await tour.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Close tour' }).click()
      await expect(tour).toBeHidden()
    }
    const star = page.locator('.star-prompt')
    if (await star.isVisible().catch(() => false)) {
      await star.locator('.star-prompt-close').click()
      await expect(star).toBeHidden()
    }

    const initial = await page.evaluate(async () => {
      const settings = await window.aiOffice.getAiSettings()
      let catalog: Awaited<ReturnType<typeof window.aiOffice.getCodexModels>> | null = null
      let catalogError = ''
      try {
        catalog = await window.aiOffice.getCodexModels()
      } catch (error) {
        catalogError = String(error)
      }
      return { settings, catalog, catalogError }
    })
    expect(initial.catalogError, initial.catalogError).toBe('')
    expect(initial.catalog?.models.length ?? 0).toBeGreaterThan(0)

    // Use the model the installed CLI reports as its default instead of a
    // hard-coded id that may have been retired.
    const chosenModel = initial.catalog?.defaultModel || initial.catalog!.models[0]
    await page.evaluate(
      async ({ settings, model }) => {
        await window.aiOffice.setAiSettings({
          ...settings,
          provider: 'codex',
          providers: {
            ...settings.providers,
            codex: { ...(settings.providers.codex ?? {}), model },
          },
        })
      },
      { settings: initial.settings, model: chosenModel },
    )

    await page.getByRole('button', { name: /AI Docs/ }).first().click()
    const editor = await waitForPageWithUrl(app, '://docs/', 60_000)
    await editor.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 60_000 })

    if ((await editor.locator('.ai-dock.collapsed').count()) > 0) {
      await editor.locator('.ai-rail').click()
    }
    const composer = editor.locator('.ai-composer textarea')
    await expect(composer).toBeVisible({ timeout: 30_000 })
    await composer.fill('Reply with exactly CODEX_LIVE_OK and nothing else. Do not use any tools.')
    await editor.locator('.ai-send-btn').click()

    await expect
      .poll(
        async () => {
          const error = await editor
            .locator('.ai-msg-error')
            .last()
            .innerText()
            .catch(() => '')
          if (error) throw new Error(`Codex chat returned an error: ${error}`)
          return editor
            .locator('.ai-msg-assistant')
            .last()
            .innerText()
            .catch(() => '')
        },
        { timeout: 180_000, intervals: [1_000] },
      )
      .toContain('CODEX_LIVE_OK')

    // The app is still interactive after the turn and the composer is ready for
    // the next message.
    await expect(composer).toBeEditable()
    await expect(editor.locator('.ai-send-btn')).toBeVisible()
    await editor.screenshot({ path: screenshotPath('codex-chat-live') })
    expect(pageErrors).toEqual([])
  } finally {
    await closeAndSaveVideo(launched, 'codex-chat-live')
  }
})
