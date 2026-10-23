/**
 * Regenerate the manual figures that need a document open in an editor:
 * the AI panel, the tab strip, the Markdown/Docs/Sheets/Slides ribbon bands
 * and the two PDF annotation states.
 *
 * `npx tsx tools/gen-help-editor-figures.ts`
 *
 * ## Why a scratch profile
 *
 * The figures are committed screenshots, so they must not pick up the
 * developer's account, home directory or recent files. HOME, userData and the
 * sample folder are temporary, exactly as in gen-help-screenshots.ts.
 *
 * ## Why this script opens the files from Home
 *
 * The shell's Home rows are the real open path (double-click a file), and the
 * shell is also where the tab strip lives. Opening the documents here keeps
 * every figure on the same built app and the same profile.
 */
import {
  _electron as electron,
  type CDPSession,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { buildBlankDocx } from '../packages/docx-engine/src/blank'
import { createBlankPptx } from '../packages/pptx-engine/src/blank'
import { buildSheetsFixture } from '../apps/sheets/tests/fixture-builder'

const REPO = resolve(__dirname, '..')
const SHELL_DIR = join(REPO, 'apps/shell')
const OUT_DIR = join(REPO, 'apps/shell/src/renderer/src/i18n/help/topics/img')

/** One-page PDF matching the captions the manual already uses. */
function minimalPdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const stream =
    'BT /F1 18 Tf 72 700 Td (Plot Docs Manual Sample) Tj ET\n' +
    'BT /F1 11 Tf 72 660 Td (This paragraph is here so you can try text selection.) Tj ET\n' +
    'BT /F1 11 Tf 72 620 Td (SECRET ONE needs redaction.) Tj ET\n' +
    'BT /F1 11 Tf 72 580 Td (More filler text on the sample page.) Tj ET'
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

interface Scratch {
  home: string
  userData: string
  samples: string
  dispose: () => void
}

async function makeScratch(): Promise<Scratch> {
  const root = mkdtempSync(join(tmpdir(), 'plotdocs-help-editor-figs-'))
  const home = join(root, 'home')
  const userData = join(root, 'userdata')
  const samples = join(root, 'help-samples')
  const saveDir = process.platform === 'win32' ? 'C:\\Plot Docs' : '/tmp/Plot Docs'
  for (const dir of [home, userData, samples, saveDir]) mkdirSync(dir, { recursive: true })

  writeFileSync(join(samples, 'doc.docx'), await buildBlankDocx())
  writeFileSync(join(samples, 'deck.pptx'), await createBlankPptx())
  writeFileSync(join(samples, 'book.xlsx'), await buildSheetsFixture())
  writeFileSync(join(samples, 'sample.pdf'), minimalPdf())
  writeFileSync(
    join(samples, 'notes.md'),
    '# Product Specification — Workspace 2.0\n\n' +
      'Status: Draft for review\n\n' +
      '## Summary\n\n' +
      'Workspace 2.0 gives a team one calm place to start, draft and finish work.\n\n' +
      '## Goals\n\n' +
      '- Make the first useful action obvious from the home screen.\n' +
      '- Keep every file local-first and reviewable.\n',
  )

  writeFileSync(
    join(userData, 'app-settings.json'),
    JSON.stringify(
      {
        onboardingSeen: true,
        folderRoots: [samples],
        defaultSaveDir: saveDir,
        authorName: 'Plot Docs User',
        starPrompt: { resolved: true },
      },
      null,
      2,
    ),
  )

  return { home, userData, samples, dispose: () => rmSync(root, { recursive: true, force: true }) }
}

async function launch(scratch: Scratch): Promise<ElectronApplication> {
  const require = createRequire(join(SHELL_DIR, 'package.json'))
  const { ELECTRON_RUN_AS_NODE: _drop, ...hostEnv } = process.env
  const args: string[] = []
  if (process.platform === 'linux') args.push('--no-sandbox', '--disable-gpu')
  args.push(SHELL_DIR)
  return electron.launch({
    executablePath: require('electron') as unknown as string,
    args,
    env: {
      ...hostEnv,
      HOME: scratch.home,
      PLOTDOCS_USER_DATA: scratch.userData,
      PLOTDOCS_AUTH_DIR: join(scratch.home, '.plotdocs'),
      PLOTDOCS_NO_SPARE_VIEW: '1',
      PLOTDOCS_LANG: 'en',
    },
  })
}

async function frame(page: Page, width = 1360): Promise<CDPSession> {
  await page.setViewportSize({ width, height: 850 })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 850,
    deviceScaleFactor: 2,
    mobile: false,
  })
  await page.waitForTimeout(600)
  return cdp
}

interface Clip {
  x: number
  y: number
  width: number
  height: number
}

async function capture(page: Page, cdp: CDPSession, clip?: Clip): Promise<Buffer> {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
  })
  return Buffer.from(data, 'base64')
}

async function shoot(page: Page, cdp: CDPSession, name: string): Promise<void> {
  writeFileSync(join(OUT_DIR, `${name}.en.png`), await capture(page, cdp))
  process.stdout.write(`wrote ${name}.en.png\n`)
}

async function shootBand(page: Page, name: string): Promise<void> {
  const cdp = await frame(page, 1680)
  const band = page.locator('[data-ribbon-body]').first()
  await band.waitFor({ state: 'visible', timeout: 30_000 })
  const box = await band.boundingBox()
  if (!box) throw new Error(`${name}: ribbon band not measurable`)
  writeFileSync(
    join(OUT_DIR, `${name}.en.png`),
    await capture(page, cdp, { x: box.x, y: box.y, width: box.width, height: box.height }),
  )
  process.stdout.write(
    `wrote ${name}.en.png (${Math.round(box.width)}x${Math.round(box.height)} @2x)\n`,
  )
}

async function dismissHomeChrome(page: Page): Promise<void> {
  await page
    .locator('.plot-splash')
    .waitFor({ state: 'detached', timeout: 20_000 })
    .catch(() => {})
  await page.waitForTimeout(1_800)
  const skip = page.locator('.home-tour-skip, .home-tour-close').first()
  if (await skip.count()) await skip.click().catch(() => {})
  const star = page.locator('.star-prompt-close')
  if (await star.count()) await star.click().catch(() => {})
  await page.waitForTimeout(300)
}

async function openRow(app: ElectronApplication, home: Page, name: string): Promise<Page> {
  const row = home.locator('.recent-row').filter({ hasText: name }).first()
  // Opening a file makes that tab active, which hides Home's row list. Bring
  // Home back before reaching for the next sample.
  if (!(await row.isVisible().catch(() => false))) {
    await home.locator('.tab-home').first().click()
    await home.waitForTimeout(350)
  }
  await row.waitFor({ state: 'visible', timeout: 15_000 })
  const next = app.waitForEvent('window')
  // The row's own left-hand cell stops click propagation; the name cell is
  // the reliable hit target.
  await row.locator('.recent-name').first().click()
  const page = await Promise.race([
    next,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${name}: no editor window opened`)), 30_000),
    ),
  ])
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  return page
}

async function typeSample(docs: Page): Promise<void> {
  const page = docs.locator('.doc-page').first()
  await page.waitFor({ state: 'visible', timeout: 30_000 })
  await page.click()
  await docs.keyboard.type('Quarterly review')
  await docs.keyboard.press('Enter')
  await docs.keyboard.type('Performance, insight and the decisions that follow.')
  await docs.keyboard.press('Enter')
  await docs.keyboard.type('Revenue grew 18% quarter over quarter, led by mid-market expansion.')
  await docs.waitForTimeout(400)
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })
  // `npx tsx tools/gen-help-editor-figures.ts pdf` regenerates one group while
  // iterating on a single figure; no arguments regenerates everything.
  const only = new Set(process.argv.slice(2))
  const take = (group: string) => only.size === 0 || only.has(group)
  const scratch = await makeScratch()
  let app: ElectronApplication | null = null
  try {
    app = await launch(scratch)
    const home = app.windows()[0] ?? (await app.firstWindow())
    await frame(home)
    await dismissHomeChrome(home)

    // Select the scratch folder so its rows are the openable sample set.
    const treeFolder = home
      .locator('.tree-item')
      .filter({ hasText: 'help-samples' })
      .locator('.tree-name')
    await treeFolder.first().click()
    await home.locator('.recent-row').first().waitFor({ state: 'visible', timeout: 15_000 })

    if (take('docs')) {
      // ── Docs: AI panel, References ribbon and the tab strip ───────────────
      const docs = await openRow(app, home, 'doc.docx')
      await docs.locator('.doc-page').first().waitFor({ state: 'visible', timeout: 45_000 })
      await typeSample(docs)
      const docsCdp = await frame(docs)

      const aiPanel = docs.locator('.ai-panel').first()
      if (!(await aiPanel.isVisible().catch(() => false))) {
        await docs.locator('.rb-big.ai-entry').first().click()
        await aiPanel.waitFor({ state: 'visible', timeout: 15_000 })
      }
      await docs.waitForTimeout(700)
      await shoot(docs, docsCdp, 'ai-panel')

      const references = docs.locator('.ribbon-tab', { hasText: 'References' }).first()
      await references.click()
      await shootBand(docs, 'docs-references')

      const notes = await openRow(app, home, 'notes.md')
      await notes.locator('.doc-editor').waitFor({ state: 'visible', timeout: 45_000 })
      await shootBand(notes, 'md-toolbar')

      // The tab strip is the shell window's, not an editor's.
      await home.waitForFunction(
        () => document.querySelectorAll('.tab-bar .tab-title').length >= 2,
        undefined,
        { timeout: 15_000 },
      )
      const tabBar = home.locator('.tab-bar').first()
      const tabBox = await tabBar.boundingBox()
      if (!tabBox) throw new Error('tab strip not measurable')
      const homeCdp = await home.context().newCDPSession(home)
      await homeCdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1360,
        height: 850,
        deviceScaleFactor: 2,
        mobile: false,
      })
      writeFileSync(
        join(OUT_DIR, 'tabs.en.png'),
        await capture(home, homeCdp, {
          x: tabBox.x,
          y: tabBox.y,
          width: tabBox.width,
          height: tabBox.height,
        }),
      )
      process.stdout.write('wrote tabs.en.png\n')
    }

    if (take('sheets')) {
      // ── Sheets: Data and Formulas ribbon bands ────────────────────────────
      const sheets = await openRow(app, home, 'book.xlsx')
      await sheets.locator('.sheet-grid, canvas, [data-ribbon-body]').first().waitFor({
        state: 'visible',
        timeout: 45_000,
      })
      await sheets.locator('.ribbon-tab', { hasText: 'Data' }).first().click()
      await shootBand(sheets, 'sheets-data')
      await sheets.locator('.ribbon-tab', { hasText: 'Formulas' }).first().click()
      await shootBand(sheets, 'sheets-formulas')
    }

    if (take('slides')) {
      // ── Slides: Transitions and Animations ribbon bands ───────────────────
      const slides = await openRow(app, home, 'deck.pptx')
      await slides
        .locator('[data-ribbon-body]')
        .first()
        .waitFor({ state: 'visible', timeout: 45_000 })
      await slides.locator('.ribbon-tab', { hasText: 'Transitions' }).first().click()
      await shootBand(slides, 'slides-transitions')
      await slides.locator('.ribbon-tab', { hasText: 'Animations' }).first().click()
      await shootBand(slides, 'slides-animations')
    }

    if (take('pdf')) {
      // ── PDF: selection popup and a marked redaction ───────────────────────
      const pdf = await openRow(app, home, 'sample.pdf')
      await pdf.locator('.textLayer span').first().waitFor({ state: 'visible', timeout: 45_000 })
      const pdfCdp = await frame(pdf)
      // A real drag, not a programmatic Range: the selection popup is driven by
      // the pointer-up path, and a Range alone never opens it.
      const secret = pdf.locator('.textLayer span').filter({ hasText: 'SECRET ONE' }).first()
      await secret.waitFor({ state: 'visible', timeout: 15_000 })
      const secretBox = await secret.boundingBox()
      if (!secretBox) throw new Error('PDF secret line not measurable')
      await pdf.mouse.move(secretBox.x + 1, secretBox.y + secretBox.height / 2)
      await pdf.mouse.down()
      await pdf.mouse.move(secretBox.x + secretBox.width - 1, secretBox.y + secretBox.height / 2, {
        steps: 12,
      })
      await pdf.mouse.up()
      const popup = pdf.locator('.pdf-sel-popup').first()
      await popup.waitFor({ state: 'visible', timeout: 15_000 })
      const popupBox = await popup.boundingBox()
      if (!popupBox) throw new Error('PDF selection popup not measurable')
      writeFileSync(
        join(OUT_DIR, 'pdf-highlight.en.png'),
        await capture(pdf, pdfCdp, {
          x: popupBox.x,
          y: popupBox.y,
          width: popupBox.width,
          height: popupBox.height,
        }),
      )
      process.stdout.write('wrote pdf-highlight.en.png\n')

      await pdf.getByRole('button', { name: 'Annotate', exact: true }).click()
      await pdf.getByRole('button', { name: 'Redact area', exact: true }).click()
      const redactionLayer = pdf.locator('.pdf-redaction-layer').first()
      await redactionLayer.waitFor({ state: 'visible', timeout: 15_000 })
      const layerBox = await redactionLayer.boundingBox()
      if (!layerBox) throw new Error('PDF redaction layer missing')
      // The sample page is 612×792pt; "SECRET ONE" sits about 22% down from the
      // top. A generous box is deliberate: the layer ignores a one-line drag as
      // too small to be a safe redaction.
      await pdf.mouse.move(layerBox.x + layerBox.width * 0.09, layerBox.y + layerBox.height * 0.17)
      await pdf.mouse.down()
      await pdf.mouse.move(
        layerBox.x + layerBox.width * 0.55,
        layerBox.y + layerBox.height * 0.25,
        {
          steps: 12,
        },
      )
      await pdf.mouse.up()
      await pdf
        .locator('.pdf-redaction-mark')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
      await pdf.waitForTimeout(400)
      await shoot(pdf, pdfCdp, 'pdf-redact')
    }

    // Unsaved docs are intentional; answer the close prompt with "Don't Save"
    // so the run finishes without a native dialog.
    await app
      .evaluate(({ dialog }) => {
        dialog.showMessageBox = (async () => ({
          response: 1,
          checkboxChecked: false,
        })) as typeof dialog.showMessageBox
      })
      .catch(() => {})
  } finally {
    await app?.close().catch(() => {})
    scratch.dispose()
  }
}

void main()
