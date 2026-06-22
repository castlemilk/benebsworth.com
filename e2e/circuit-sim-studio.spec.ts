import { test, expect, type Page } from '@playwright/test'

// Defaults to the static export served by the Playwright config (baseURL :4321).
// Set CS_BASE=http://localhost:3000 to run against a live dev server instead.
const PAGE = (process.env.CS_BASE ?? '') + '/lab/circuit-sim/'

const ignorable = (e: string) => e.includes('hydration') || e.includes('Minified React')

async function loadSample(page: Page, name: string) {
  await page.getByRole('button', { name: 'Circuit library' }).first().click()
  await page.getByText(name, { exact: false }).first().click()
  await page.waitForTimeout(250)
}

async function openStudio(page: Page) {
  await page.getByRole('button', { name: 'Open Studio' }).click()
  await expect(page.getByTestId('circuit-studio')).toBeVisible()
}

/** Component count from the studio status bar ("N comp …"). */
async function compCount(page: Page): Promise<number> {
  const txt = await page.getByTestId('circuit-studio').locator('footer').textContent()
  const m = txt?.match(/(\d+)\s*comp/)
  return m ? Number(m[1]) : -1
}

// Suppress the first-run guided tour for interaction tests (its backdrop would
// block clicks). The dedicated tour test re-opens it via the "?" button.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('cs.studio.tourSeen', '1') } catch { /* ignore */ }
  })
})

test.describe('circuit-sim embedded', () => {
  test('loads cleanly with the new controls present', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto(PAGE)
    await expect(page.getByRole('heading', { name: 'Circuit Simulator' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Studio' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cursors' })).toBeVisible()
    expect(errors.filter(e => !ignorable(e))).toEqual([])
  })

  test('palette items are draggable (drag-to-place wiring)', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('button', { name: 'Ω Resistor' })).toHaveAttribute('draggable', 'true')
  })

  test('Duplicate action exists for the selected component', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('button', { name: 'Duplicate (⌘D)' })).toBeVisible()
  })
})

test.describe('circuit studio', () => {
  test('opens and closes with Escape', async ({ page }) => {
    await page.goto(PAGE)
    await openStudio(page)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('circuit-studio')).toHaveCount(0)
  })

  test('Esc deselects on the canvas before it closes the studio', async ({ page }) => {
    await page.goto(PAGE)
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    // Place + select a component (this focuses the canvas).
    await studio.getByRole('button', { name: 'Ω Resistor' }).click()
    await studio.locator('main canvas').click()
    // First Esc clears the selection — the studio must stay open.
    await page.keyboard.press('Escape')
    await expect(studio).toBeVisible()
    // Second Esc has nothing to cancel — now it closes the studio.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('circuit-studio')).toHaveCount(0)
  })

  test('DC operating-point overlay toggles', async ({ page }) => {
    await page.goto(PAGE)
    await loadSample(page, 'Voltage Divider')
    await openStudio(page)
    const dc = page.getByTestId('circuit-studio').getByRole('button', { name: 'DC operating point' })
    await dc.click()
    await expect(dc).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('circuit-studio').getByText('DC operating point').last()).toBeVisible()
  })

  test('run / pause / resume / step transport', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto(PAGE)
    await loadSample(page, 'RC Low-Pass Filter')
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    const run = page.getByTestId('studio-run')

    await run.click()
    await expect(run).toContainText('Pause')
    await page.waitForTimeout(600)
    await expect(studio.locator('footer')).toContainText('running')

    await run.click()
    await expect(run).toContainText('Resume')
    await expect(studio.locator('footer')).toContainText('paused')

    await studio.getByRole('button', { name: 'Step' }).click()
    await expect(studio.locator('footer')).toContainText('paused')

    await studio.getByRole('button', { name: '↺ Reset' }).click()
    await expect(studio.locator('footer')).toContainText('idle')

    expect(errors.filter(e => !ignorable(e))).toEqual([])
  })

  test('undo / redo via keyboard around a placement', async ({ page }) => {
    await page.goto(PAGE)
    await loadSample(page, 'Voltage Divider')
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')

    const before = await compCount(page)
    await studio.getByRole('button', { name: 'Ω Resistor' }).click()
    await studio.locator('main canvas').click()
    expect(await compCount(page)).toBe(before + 1)

    await page.keyboard.press('Control+z')
    expect(await compCount(page)).toBe(before)

    await page.keyboard.press('Control+Shift+Z')
    expect(await compCount(page)).toBe(before + 1)
  })

  test('scope cursors show Δt / ΔV readouts', async ({ page }) => {
    await page.goto(PAGE)
    await loadSample(page, 'RC Low-Pass Filter')
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    await page.getByTestId('studio-run').click()
    await page.waitForTimeout(800)
    await studio.getByRole('button', { name: 'Cursors' }).click()
    await expect(studio.getByText('Δt', { exact: false }).first()).toBeVisible()
    await expect(studio.getByText('ΔV', { exact: false }).first()).toBeVisible()
  })

  test('resizable docks persist a wider right panel', async ({ page }) => {
    await page.goto(PAGE)
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    const aside = studio.locator('aside').nth(1)
    const w1 = (await aside.boundingBox())!.width
    await studio.locator('[class*="cursor-col-resize"]').nth(1).dragTo(studio.locator('main'))
    const w2 = (await aside.boundingBox())!.width
    expect(w2).toBeGreaterThan(w1)
    const stored = await page.evaluate(() => localStorage.getItem('cs.studio.rightW'))
    expect(Number(stored)).toBeGreaterThan(w1)
  })

  test('probe manager rename + remove', async ({ page }) => {
    await page.goto(PAGE)
    await loadSample(page, 'Voltage Divider') // auto-probes one node
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    await expect(studio.getByText(/Probes \(1\)/)).toBeVisible()

    const label = studio.locator('input[aria-label^="Rename"]').first()
    await label.fill('Vout')
    await expect(label).toHaveValue('Vout')

    await studio.getByRole('button', { name: /^Remove/ }).first().click()
    await expect(studio.getByText(/Probes \(0\)/)).toBeVisible()
  })

  test('speed control changes the status-bar rate', async ({ page }) => {
    await page.goto(PAGE)
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    const slider = studio.getByRole('slider', { name: 'Speed' })
    await slider.fill('2')
    await expect(studio.locator('footer')).toContainText('2.00×')
  })

  test('guided tour walks the studio and is dismissable', async ({ page }) => {
    await page.goto(PAGE)
    await openStudio(page)
    const studio = page.getByTestId('circuit-studio')
    await studio.getByRole('button', { name: 'Guided tour' }).click()

    const tour = page.getByTestId('studio-tour')
    await expect(tour).toBeVisible()
    await expect(tour).toContainText('1 / 9')

    // Advance by button, then by keyboard.
    await tour.getByRole('button', { name: /Next/ }).click()
    await expect(tour).toContainText('2 / 9')
    await page.keyboard.press('ArrowRight')
    await expect(tour).toContainText('3 / 9')
    await page.keyboard.press('ArrowLeft')
    await expect(tour).toContainText('2 / 9')

    // Esc dismisses the tour but leaves the studio open.
    await page.keyboard.press('Escape')
    await expect(tour).toHaveCount(0)
    await expect(studio).toBeVisible()

    // Skip button works too.
    await studio.getByRole('button', { name: 'Guided tour' }).click()
    await expect(tour).toBeVisible()
    await tour.getByRole('button', { name: /Skip/ }).click()
    await expect(tour).toHaveCount(0)
  })

  test('first-run tour auto-opens once, then stays dismissed', async ({ page }) => {
    // Opt back IN to the first-run tour for this test only.
    await page.addInitScript(() => {
      try { localStorage.removeItem('cs.studio.tourSeen') } catch { /* ignore */ }
    })
    await page.goto(PAGE)
    await openStudio(page)
    // Auto-opens shortly after the studio mounts.
    await expect(page.getByTestId('studio-tour')).toBeVisible({ timeout: 4000 })
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('studio-tour')).toHaveCount(0)
    // Re-opening the studio must NOT re-trigger it (seen flag persisted).
    await page.keyboard.press('Escape') // close studio
    await expect(page.getByTestId('circuit-studio')).toHaveCount(0)
    await openStudio(page)
    await page.waitForTimeout(800)
    await expect(page.getByTestId('studio-tour')).toHaveCount(0)
  })
})
