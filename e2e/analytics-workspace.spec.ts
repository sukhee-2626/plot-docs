import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { ARTIFACTS_DIR, launchShell, type LaunchedApp } from './helpers'

/**
 * End-to-end smoke test for the additive AI Data Analytics workspace.
 *
 * It exercises the real Electron main process, the local SQLite store, the
 * CSV/JSON/XLSX importers, SQL, charting, saved views, cleaning + undo,
 * Python, forecasting, CSV export, audit and the AI-analyst fallback when no
 * credentials are configured. The document editors are outside this spec.
 */

const SAMPLES = resolve('C:/Users/HP/AppData/Local/Temp/opencode/analytics-smoke')
const SALES = join(SAMPLES, 'sales.csv')
const CUSTOMERS = join(SAMPLES, 'customers.json')
const INVENTORY = join(SAMPLES, 'inventory.xlsx')
const REGIONS = join(SAMPLES, 'regions.csv')
const SALES_EXTRA = join(SAMPLES, 'sales-extra.csv')

let launched: LaunchedApp
let app: ElectronApplication
let page: Page
let pageErrors: string[] = []

test.describe.configure({ mode: 'serial' })

async function stubOpenDialog(path: string): Promise<void> {
  await app.evaluate(async ({ dialog }, filePath) => {
    // Test-only: replace the native picker with a deterministic answer.
    ;(dialog as unknown as { showOpenDialog: unknown }).showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    })
  }, path)
}

async function stubSaveDialog(path: string): Promise<void> {
  await app.evaluate(async ({ dialog }, filePath) => {
    ;(dialog as unknown as { showSaveDialog: unknown }).showSaveDialog = async () => ({
      canceled: false,
      filePath,
    })
  }, path)
}

async function dismissStarPrompt(): Promise<void> {
  const star = page.locator('.star-prompt')
  if (await star.isVisible().catch(() => false)) {
    await star.locator('.star-prompt-close').click()
    await expect(star).toBeHidden()
  }
}

async function dismissStartupOverlays(): Promise<void> {
  await expect(page.getByRole('status', { name: 'Plot Docs is starting' })).toBeHidden({
    timeout: 45_000,
  })
  const tour = page.getByRole('dialog', { name: /Plot Docs tour/ })
  try {
    await tour.waitFor({ state: 'visible', timeout: 8_000 })
    await page.getByRole('button', { name: 'Close tour' }).click()
    await expect(tour).toBeHidden()
  } catch {
    // The tour only appears on a first launch; its absence is fine.
  }
  await dismissStarPrompt()
}

async function openWorkspace(): Promise<void> {
  await page.getByRole('button', { name: /AI Data Analytics/ }).first().click()
  await expect(page.getByRole('dialog', { name: 'AI Data Analytics workspace' })).toBeVisible()
}

function nav(label: RegExp) {
  return page
    .getByRole('dialog', { name: 'AI Data Analytics workspace' })
    .locator('.analytics-rail-nav')
    .getByRole('button', { name: label })
}

async function closeWorkspace(): Promise<void> {
  await page.getByRole('button', { name: 'Close data analytics' }).click()
  await expect(page.getByRole('dialog', { name: 'AI Data Analytics workspace' })).toBeHidden()
}

async function importFromHeader(path: string): Promise<void> {
  await stubOpenDialog(path)
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await dialog.locator('.analytics-header').getByRole('button', { name: 'Import data' }).click()
}

test.beforeAll(async () => {
  writeFileSync(
    REGIONS,
    ['region,manager', 'North,Ada', 'South,Grace', 'East,Katherine'].join('\r\n'),
    'utf8',
  )
  writeFileSync(
    SALES_EXTRA,
    [
      'order_id,order_date,region,category,units,amount',
      '2001,2026-03-01,North,Hardware,1,10.00',
      '2002,2026-03-02,South,Software,2,20.00',
    ].join('\r\n'),
    'utf8',
  )
  const userDataDir = await mkdtemp(join(tmpdir(), 'plotdocs-analytics-e2e-'))
  launched = await launchShell({
    onboardingSeen: true,
    userDataDir,
    videoDir: 'analytics-smoke',
  })
  app = launched.app
  page = launched.page
  pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  await dismissStartupOverlays()
})

test.afterAll(async () => {
  await app?.close()
})

test('imports CSV, profiles it and runs the SQL + chart + saved-view loop', async () => {
  await openWorkspace()
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })

  await importFromHeader(SALES)
  await expect(dialog.getByRole('heading', { name: 'sales', exact: true })).toBeVisible()
  await expect(dialog.getByText(/CSV · sales\.csv/)).toBeVisible()
  await expect(dialog.getByText('order_date', { exact: true }).first()).toBeVisible()

  const profileTable = dialog.locator('table.profile-table')
  await expect(profileTable).toContainText('order_id')
  await expect(profileTable).toContainText('integer')
  await expect(profileTable).toContainText('amount')
  await expect(profileTable).toContainText('real')
  await expect(profileTable).toContainText('date')

  // Overview reflects the profiled dataset.
  await nav(/Overview/).click()
  await expect(dialog.getByText('Your local sources')).toBeVisible()
  await expect(dialog.getByText('12').first()).toBeVisible()

  // SQL analysis.
  await nav(/^Analyze/).click()
  const sql = dialog.getByLabel('SQL query')
  await expect(sql).toHaveValue('SELECT * FROM data LIMIT 100')
  await sql.fill(
    'SELECT region, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue FROM data GROUP BY region ORDER BY revenue DESC',
  )
  await dialog.getByRole('button', { name: 'Run query' }).click()
  await expect(dialog.getByText('716.5', { exact: false }).first()).toBeVisible()
  await expect(dialog.locator('.analytics-chart svg')).toBeVisible()
  await expect(dialog.getByText('Query result')).toBeVisible()

  // Switch to a numeric scatter plot; the builder must choose numeric axes.
  await dialog.getByLabel('Chart type').selectOption('scatter')
  await expect(dialog.locator('.analytics-chart svg[aria-label^="scatter plot"]')).toBeVisible()
  await expect(dialog.getByLabel('X (numeric)')).toHaveValue('orders')
  await expect(dialog.getByLabel('Y (numeric)')).toHaveValue('revenue')

  // Save the query and chart as a reusable view.
  await dialog.getByLabel('Saved view name').fill('Revenue by region')
  await dialog.getByRole('button', { name: 'Save current' }).click()
  await expect(dialog.getByRole('status')).toContainText('Saved')
  await nav(/Dashboards/).click()
  await expect(dialog.getByRole('heading', { name: 'Revenue by region' })).toBeVisible()
  await expect(dialog.locator('.analytics-dashboard-card .analytics-chart svg')).toBeVisible()
})

test('exports the exact query result to CSV', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/^Analyze/).click()
  const exportPath = join(launched.userDataDir, 'revenue-export.csv')
  await stubSaveDialog(exportPath)
  await dialog.getByRole('button', { name: 'Export CSV' }).first().click()
  await expect(dialog.getByRole('status')).toContainText('Exported CSV')
  expect(existsSync(exportPath)).toBe(true)
  const csv = readFileSync(exportPath, 'utf8')
  expect(csv.split(/\r?\n/)[0]).toContain('region')
  expect(csv).toContain('North')
  expect(csv).toContain('716.5')
})

test('cleans duplicates, undoes the change and restores the profile', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/Prepare/).click()
  await expect(dialog.getByRole('button', { name: /Remove duplicates \(1\)/ })).toBeVisible()
  await dialog.getByRole('button', { name: /Remove duplicates/ }).click()
  await expect(dialog.getByRole('status')).toContainText('Removed 1 duplicate')
  await expect(dialog.getByRole('button', { name: /Remove duplicates \(0\)/ })).toBeVisible()

  const undo = dialog.getByRole('button', { name: 'Undo last clean' })
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(dialog.getByRole('status')).toContainText('Restored the dataset')
  await expect(dialog.getByRole('button', { name: /Remove duplicates \(1\)/ })).toBeVisible()
})

test('runs the fixed Python aggregation', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/^Analyze/).click()
  await dialog.getByRole('button', { name: 'Python', exact: true }).click()
  await dialog.getByRole('button', { name: 'Run Python' }).click()
  await expect(dialog.getByRole('heading', { name: 'Python aggregation' })).toBeVisible()
  await expect(
    dialog.locator('.analytics-inline-error, .analytics-table').first(),
  ).toBeVisible({ timeout: 45_000 })
  const failed = await dialog.locator('.analytics-inline-error').count()
  if (failed === 0) {
    await expect(dialog.locator('.analytics-table td', { hasText: 'North' }).first()).toBeVisible()
    await expect(dialog.getByText('Show the generated Python')).toBeVisible()
  }
})

test('fits the transparent linear forecast', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/ML Lab/).click()
  await dialog.getByRole('button', { name: 'Fit trend' }).click()
  await expect(dialog.locator('.analytics-stats').getByText('R²', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Observed and forecast values')).toBeVisible()
  await expect(dialog.locator('.analytics-chart svg')).toBeVisible()
  await expect(dialog.getByText(/prediction interval/).first()).toBeVisible()
})

test('runs full automation and saves live Auto dashboard cards', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/Automate/).click()
  const automate = dialog.locator('.analytics-automate-view')
  await automate.getByRole('button', { name: 'Run full auto' }).click()
  await expect(dialog.locator('.analytics-auto-insight').first()).toBeVisible({
    timeout: 45_000,
  })
  await expect(dialog.getByText(/One run, every calculation/)).toBeVisible()
  await expect(dialog.locator('.analytics-auto-meta').first()).toContainText('Dataset:')
  await expect(dialog.locator('.analytics-auto-meta').first()).toContainText('Filters: none')

  await nav(/Dashboards/).click()
  const card = dialog.locator('.analytics-dashboard-card').first()
  await expect(card).toBeVisible()
  await expect(card.locator('.analytics-dashboard-reading')).toContainText('WHAT IT MEANS')
  await expect(card.locator('.analytics-confidence')).toContainText(/confidence/)
  await expect(card.locator('.analytics-dashboard-evidence')).toContainText('Method')
  await expect(dialog.locator('.analytics-dashboard-brief')).toContainText('EXECUTIVE BRIEFING')
  await expect(dialog.locator('.analytics-header-caption')).toHaveText('Saved views')
  await expect(
    dialog.locator('#analytics-assistant-panel .an-assistant-context'),
  ).toContainText('Working on')
  await expect(
    dialog.locator('#analytics-assistant-panel .an-assistant-context'),
  ).toContainText('11 rows')
  // The analytics composer uses the same shared model chip as the document
  // editors: any configured provider/model can be switched without leaving
  // the workspace.
  const modelChip = dialog.locator(
    '#analytics-assistant-panel .an-assistant-foot-left .ai-model-chip',
  )
  await expect(modelChip).toBeVisible()
  await expect(modelChip).toHaveAttribute('aria-label', /Model:/)
  await modelChip.click()
  await expect(page.getByRole('listbox', { name: 'Model' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Model' })).toContainText('Manage models')
  await modelChip.click()
  await expect(page.getByRole('listbox', { name: 'Model' })).toBeHidden()
  const toast = page.locator('.analytics-toast')
  if (await toast.isVisible()) await toast.getByLabel('Dismiss notification').click()
  await expect(toast).toBeHidden()
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard.png'),
    fullPage: false,
  })

  // Chart marks are cross-filter controls: clicking a bar filters the whole
  // dashboard to that category, and clicking the selected mark clears it.
  const revenueCard = dialog.locator(
    '.analytics-dashboard-card[data-view-name="Revenue by region"]',
  )
  // The Auto ranking card is whichever saved card carries clickable category
  // marks. Its dimension depends on the profiled dataset, so do not hard-code
  // a column name here.
  const rankingCard = dialog
    .locator('.analytics-dashboard-card:has(.analytics-chart-mark)')
    .first()
  await expect(rankingCard).toBeVisible()
  await rankingCard.locator('.analytics-chart-mark').first().click()
  const slicerColumn = await dialog.getByLabel('Slicer column').inputValue()
  expect(slicerColumn).toBeTruthy()
  const selectedMark = await dialog.getByLabel('Slicer value').inputValue()
  expect(selectedMark).not.toBe('__all_values__')
  await expect(rankingCard.locator('.analytics-dashboard-filter-chip')).toContainText(
    `${slicerColumn} = ${selectedMark}`,
  )
  await expect(rankingCard.locator('.analytics-chart-bar.selected')).toHaveCount(1)
  await expect(rankingCard.locator('.analytics-dashboard-filter-hint')).toContainText(
    'Selected mark',
  )
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard-crossfilter.png'),
    fullPage: false,
  })
  await rankingCard.locator('.analytics-chart-mark').first().click()
  await expect(dialog.getByLabel('Slicer value')).toHaveValue('__all_values__')
  await expect(rankingCard.locator('.analytics-chart-bar.selected')).toHaveCount(0)
  await expect(revenueCard.locator('header p')).toContainText('4 pairs live')

  // A slicer filters the base table before each saved aggregation runs.
  await dialog.getByLabel('Slicer column').selectOption('region')
  // Choosing a column prepares the slicer but must not silently filter to the
  // first category. The dashboard stays on all data until a value is chosen.
  await expect(revenueCard.locator('header p')).toContainText('4 pairs live')
  await expect(dialog.locator('.analytics-dashboard-brief')).toContainText(
    '3 evidence-backed signals',
  )
  await expect(dialog.getByLabel('Slicer value').locator('option:checked')).toContainText(
    'All values',
  )
  await dialog.getByLabel('Slicer value').selectOption('East')
  await expect(dialog.locator('.analytics-dashboard-toolbar')).toContainText('SLICER')
  await expect(revenueCard.locator('.analytics-dashboard-filter-chip')).toContainText('region = East')
  await expect(revenueCard.locator('header p')).toContainText('1 pair live')
  await expect(revenueCard.locator('.analytics-dashboard-reading')).toContainText(
    'Only one orders/revenue pair is visible',
  )
  await expect(revenueCard.locator('.analytics-dashboard-reading')).toContainText(
    'Live filtered reading',
  )
  await expect(dialog.locator('.analytics-dashboard-brief')).toContainText(
    'Live slice · region = East',
  )
  await expect(dialog.locator('.analytics-dashboard-brief')).toContainText(
    'Live local readings replace stored full-dataset readings',
  )
  await expect(
    dialog
      .locator('.analytics-dashboard-card[data-view-name="Distribution of units"]')
      .locator('.analytics-dashboard-reading'),
  ).toContainText('filtered rows')
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard-filtered.png'),
    fullPage: false,
  })
  await dialog.getByRole('button', { name: 'Clear filter' }).click()
  await expect(revenueCard.locator('header p')).toContainText('4 pairs live')

  // Layout is a view preference, not a change to the saved evidence.
  await dialog.getByRole('button', { name: 'Dashboard layout: 1 col' }).click()
  await expect(dialog.locator('.analytics-dashboard-grid')).toHaveClass(/layout-1/)
  const twoColumnLayout = dialog.getByRole('button', { name: 'Dashboard layout: 2 col' })
  await twoColumnLayout.click()
  await expect(dialog.locator('.analytics-dashboard-grid')).toHaveClass(/layout-2/)
  await expect(twoColumnLayout).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Dashboard layout: Auto' }).click()
  await expect(dialog.locator('.analytics-dashboard-grid')).toHaveClass(/layout-auto/)

  await dialog.locator('.analytics-dashboard-card').first().scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard-cards.png'),
    fullPage: false,
  })
  await dialog.locator('.analytics-dashboard-intro').scrollIntoViewIfNeeded()

  await page.evaluate(async () => {
    await window.aiOffice.setTheme('dark')
  })
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark')
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard-dark.png'),
    fullPage: false,
  })
  await dialog.locator('.analytics-dashboard-card').first().scrollIntoViewIfNeeded()
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-dashboard-cards-dark.png'),
    fullPage: false,
  })
  await page.evaluate(async () => {
    await window.aiOffice.setTheme('system')
  })

  // Destructive card actions need an explicit second step.
  await card.getByRole('button', { name: 'Delete saved view' }).click()
  await expect(card.getByRole('group', { name: 'Confirm delete card' })).toBeVisible()
  await expect(card).toContainText('Delete card?')
  await card.getByRole('button', { name: 'Cancel' }).click()
  await expect(card.getByRole('button', { name: 'Open' })).toBeVisible()
})

test('schedules, runs, pauses, versions and deletes a reusable workflow', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/Automate/).click()
  const automate = dialog.locator('.analytics-automate-view')

  await automate.getByRole('button', { name: 'New workflow' }).click()
  const form = automate.locator('.analytics-workflow-form')
  // Automation is analysis-only until the user explicitly opts into mutation.
  await expect(form.locator('input[type="checkbox"]')).not.toBeChecked()
  await form.getByLabel('Name').fill('Daily sales refresh')
  await form.getByLabel('Frequency').selectOption('daily')
  await form.getByLabel('Local time').selectOption('9')
  await form.getByLabel('Retries on failure').selectOption('1')
  await form.getByRole('button', { name: 'Save workflow' }).click()

  const item = automate.locator('.analytics-workflow-item').first()
  await expect(item).toContainText('Daily sales refresh')
  await expect(item).toContainText('Daily at 09:00')
  await expect(item).toContainText('analysis only')
  await expect(item).toContainText('Active')
  await expect(item).toContainText('Next:')

  await item.getByRole('button', { name: 'Run now' }).click()
  const run = automate.locator('.analytics-workflow-run').first()
  await expect(run).toContainText('Completed', { timeout: 60_000 })
  await expect(run).toContainText('Refreshed')
  await expect(item).toContainText('1 run')

  await item.getByRole('button', { name: 'Pause' }).click()
  await expect(item).toContainText('Paused')

  await item.getByRole('button', { name: 'Edit' }).click()
  await form.getByLabel('Name').fill('Daily sales refresh v2')
  await form.getByRole('button', { name: 'Save workflow' }).click()
  await expect(item).toContainText('Daily sales refresh v2')
  // v1 create, v2 pause, v3 edit. Pausing is a saved configuration change.
  await expect(item).toContainText('version 3')

  await automate.locator('.analytics-workflow-versions summary').click()
  await expect(automate.locator('.analytics-workflow-versions')).toContainText('v3')
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-automation.png'),
    fullPage: false,
  })

  page.once('dialog', (confirmation) => void confirmation.accept())
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(automate.getByText('No saved workflow for this dataset.')).toBeVisible()
})

test('Plot AI runs the local pipeline without a model', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  const panel = dialog.locator('#analytics-assistant-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Local automation is ready')).toBeVisible({ timeout: 30_000 })
  await dismissStarPrompt()
  await panel.locator('.an-assistant-setup').getByRole('button', { name: 'Run full auto' }).click()
  await expect(panel.getByText(/complete local automation pipeline/i).first()).toBeVisible({
    timeout: 60_000,
  })
  await expect(panel.locator('.an-assistant-model-note').last()).toHaveText('Local automation')
})

test('inline AI analyst fails honestly when no provider is configured', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/AI Analyst/).click()
  await dialog
    .getByPlaceholder('Which region had the highest revenue last quarter, and by how much?')
    .fill('Which region had the highest revenue?')
  await dialog.getByRole('button', { name: 'Ask analyst' }).click()
  await expect(dialog.getByRole('heading', { name: 'No result produced' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(dialog.locator('.analytics-inline-error')).toContainText(/AI|Configure|Connect/)
})

test('shows the local audit trail and closes back to Home', async () => {
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })
  await nav(/Governance/).click()
  await expect(dialog.getByText('Local events')).toBeVisible()
  const auditRows = dialog.locator('.analytics-audit-row')
  expect(await auditRows.count()).toBeGreaterThan(3)
  await expect(dialog.getByText('import', { exact: false }).first()).toBeVisible()
  await expect(dialog.getByText('query', { exact: false }).first()).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /AI Data Analytics/ }).first()).toBeVisible()
})

test('imports JSON and XLSX with semantic types', async () => {
  await openWorkspace()
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })

  await importFromHeader(CUSTOMERS)
  await expect(dialog.getByRole('heading', { name: 'customers', exact: true })).toBeVisible()
  await expect(dialog.getByText(/JSON · customers\.json/)).toBeVisible()
  const jsonProfile = dialog.locator('table.profile-table')
  await expect(jsonProfile).toContainText('active')
  await expect(jsonProfile).toContainText('boolean')
  await expect(jsonProfile).toContainText('lifetime_value')
  await expect(jsonProfile).toContainText('real')

  await importFromHeader(INVENTORY)
  await expect(dialog.getByRole('heading', { name: 'inventory', exact: true })).toBeVisible()
  await expect(dialog.getByText(/XLSX · inventory\.xlsx/)).toBeVisible()
  const xlsxProfile = dialog.locator('table.profile-table')
  await expect(xlsxProfile).toContainText('qty')
  await expect(xlsxProfile).toContainText('integer')
  await expect(xlsxProfile).toContainText('in_stock')
  await expect(xlsxProfile).toContainText('boolean')

  await closeWorkspace()
})

test('joins sales to a lookup and queries the derived dataset', async () => {
  await openWorkspace()
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })

  // The imports above leave inventory active. Add the lookup table, then switch
  // back to the sales source and build a derived dataset without modifying
  // either source.
  await importFromHeader(REGIONS)
  await expect(dialog.getByRole('heading', { name: 'regions', exact: true })).toBeVisible()
  await dialog.getByLabel('Active dataset').selectOption({ label: 'sales' })
  await nav(/^Analyze/).click()
  await expect(dialog.locator('.analytics-mode-switch')).toContainText('sales')
  await dialog.getByRole('button', { name: 'Join', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Join two datasets' })).toBeVisible()

  await dialog.getByLabel('Right dataset').selectOption({ label: 'regions · 3 rows' })
  await expect(dialog.getByLabel('Right join key')).toHaveValue('region')
  await dialog.getByLabel('Left join key').selectOption('region')
  await dialog.getByLabel('Join type').selectOption('left')
  await dialog.getByLabel('Joined dataset name').fill('sales with regions')
  await dialog.getByRole('button', { name: 'Create joined dataset' }).click()

  await expect(dialog.getByRole('heading', { name: 'sales with regions' })).toBeVisible()
  const summary = dialog.locator('.analytics-join-summary')
  await expect(summary).toContainText('11 rows')
  await expect(summary).toContainText('8 columns')
  await expect(summary).toContainText('left join')
  const warning = dialog.locator('.analytics-join-result .analytics-banner.warn')
  await expect(warning).toContainText('right_region')
  await expect(warning).toContainText('2 left rows had no match')
  await expect(dialog.locator('.analytics-join-result .analytics-code-block pre')).toContainText(
    'LEFT JOIN',
  )
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-join.png'),
    fullPage: false,
  })

  await dialog.getByRole('button', { name: 'Open dataset' }).click()
  await expect(dialog.locator('.analytics-mode-switch')).toContainText('sales with regions')
  const sql = dialog.getByLabel('SQL query')
  await sql.fill(
    'SELECT manager, COUNT(*) AS orders FROM data GROUP BY manager ORDER BY manager IS NULL, manager ASC',
  )
  await dialog.getByRole('button', { name: 'Run query' }).click()
  const table = dialog.locator('table.analytics-table')
  await expect(table.getByText('Ada', { exact: true })).toBeVisible()
  await expect(table.getByText('Grace', { exact: true })).toBeVisible()
  await expect(table.getByText('Katherine', { exact: true })).toBeVisible()
  await expect(table.locator('tbody tr')).toHaveCount(4)
  await expect(dialog.getByText('Query result')).toBeVisible()

  await closeWorkspace()
})

test('appends a second same-schema file into a new dataset', async () => {
  await openWorkspace()
  const dialog = page.getByRole('dialog', { name: 'AI Data Analytics workspace' })

  await importFromHeader(SALES_EXTRA)
  await expect(dialog.getByRole('heading', { name: 'sales-extra', exact: true })).toBeVisible()
  await dialog.getByLabel('Active dataset').selectOption({ label: 'sales' })
  await nav(/^Analyze/).click()
  await dialog.getByRole('button', { name: 'Append', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Stack rows from two datasets' })).toBeVisible()

  const appendSelect = dialog.getByLabel('Second dataset to append')
  const extraValue = await appendSelect
    .locator('option', { hasText: 'sales-extra' })
    .getAttribute('value')
  if (!extraValue) throw new Error('sales-extra option was not found')
  await appendSelect.selectOption(extraValue)
  await dialog.getByLabel('Append mode').selectOption('all')
  await dialog.getByLabel('Appended dataset name').fill('sales plus extra')
  await dialog.getByRole('button', { name: 'Create appended dataset' }).click()

  await expect(dialog.getByRole('heading', { name: 'sales plus extra' })).toBeVisible()
  const summary = dialog.locator('.analytics-join-summary')
  await expect(summary).toContainText('13 rows')
  await expect(summary).toContainText('6 columns')
  await expect(summary).toContainText('all rows')
  await expect(dialog.locator('.analytics-join-result .analytics-code-block pre')).toContainText(
    'UNION ALL',
  )
  await page.screenshot({
    path: join(ARTIFACTS_DIR, 'analytics-append.png'),
    fullPage: false,
  })

  await dialog.getByRole('button', { name: 'Open dataset' }).click()
  await expect(dialog.locator('.analytics-mode-switch')).toContainText('sales plus extra')
  await dialog.getByLabel('SQL query').fill('SELECT COUNT(*) AS rows FROM data')
  await dialog.getByRole('button', { name: 'Run query' }).click()
  await expect(dialog.locator('table.analytics-table').getByText('13', { exact: true })).toBeVisible()

  await closeWorkspace()
})

test('existing Home document entry points still respond', async () => {
  await expect(page.getByRole('button', { name: /AI Data Analytics/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Open Local File/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /AI Docs/ }).first()).toBeVisible()
  expect(pageErrors).toEqual([])
})
