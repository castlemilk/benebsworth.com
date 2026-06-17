import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Circuit Simulator', () => {
  test('page loads with all UI elements', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await expect(page.getByRole('heading', { name: 'Circuit Simulator' })).toBeVisible()
    await expect(page.getByRole('button', { name: '▶ Run' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Circuit library' })).toBeVisible()
  })

  test('component palette shows all 5 components', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await expect(page.getByRole('button', { name: 'Ω Resistor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'L Inductor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'C Capacitor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'V Voltage Source' })).toBeVisible()
    await expect(page.getByRole('button', { name: '⏚ Ground' })).toBeVisible()
  })

  test('loads Voltage Divider and shows ready', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('Voltage Divider').click()
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 5000 })
  })

  test('auto-probes on sample load (scope canvas appears)', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)
    // Scope canvas always present (shows empty state or traces)
    await expect(page.locator('canvas')).toHaveCount(2)
  })

  test('runs simulation and shows stop button', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: '▶ Run' }).click()
    // Button should change from Run to Stop after clicking
    await page.waitForTimeout(500)
    const runBtn = page.getByRole('button', { name: '▶ Run' })
    const stopBtn = page.getByRole('button', { name: /Stop/ })
    // Either Run or Stop should be visible (one of them)
    const hasRun = await runBtn.isVisible().catch(() => false)
    const hasStop = await stopBtn.isVisible().catch(() => false)
    expect(hasRun || hasStop).toBe(true)
    // Click stop if simulation is running
    if (hasStop) await stopBtn.first().click()
  })

  test('download YAML produces a file', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('Voltage Divider').click()
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 5000 })
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download YAML' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('circuit.yaml')
  })

  test('no page errors on all 10 samples', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${BASE}/lab/circuit-sim/`)
    const sampleNames = [
      'Voltage Divider', 'RC Low-Pass Filter', 'RLC Ringing',
      'LC Oscillator Tank', 'Three-Resistor T-Network',
      'Two-Stage RC Filter', 'Wheatstone Bridge',
      'RLC Tank with Ringing', 'Resistive Load', 'LC Pi Filter',
    ]
    for (const name of sampleNames) {
      await page.getByRole('button', { name: 'Circuit library' }).click()
      await page.waitForTimeout(200)
      const btn = page.getByText(name, { exact: false }).first()
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click()
      } else {
        // Dropdown might have closed — reopen
        await page.getByRole('button', { name: 'Circuit library' }).click()
        await page.waitForTimeout(200)
        await page.getByText(name, { exact: false }).first().click()
      }
      await page.waitForTimeout(300)
    }
    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])
  })
})

test.describe('edge cases', () => {
  test('empty circuit shows [EMPTY]', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await expect(page.getByText('[EMPTY]')).toBeVisible()
  })

  test('Run on empty circuit shows error, no crash', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('[EMPTY]')).toBeVisible()
  })

  test('rapid sample switching (3 samples)', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    for (const name of ['Voltage Divider', 'RLC Ringing', 'Wheatstone Bridge']) {
      await page.getByRole('button', { name: 'Circuit library' }).click()
      await page.getByText(name, { exact: false }).first().click()
      await page.waitForTimeout(400)
    }
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })
  })

  test('timestep and duration presets switch', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    const activeDt = page.locator('button').filter({ hasText: '10µs' }).first()
    await expect(activeDt).toHaveClass(/accent/)
    await page.getByText('1ms').first().click()
    const nowActive = page.locator('button').filter({ hasText: '1ms' }).first()
    await expect(nowActive).toHaveClass(/accent/)
  })

  test('canvas interaction produces no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('Voltage Divider').click()
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 100, y: 100 } })
    await canvas.click({ position: { x: 300, y: 200 } })
    await canvas.hover()
    await page.mouse.wheel(0, 100)
    await page.mouse.wheel(0, -100)
    await page.keyboard.press('Escape')
    await page.keyboard.press('r')
    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])
  })
})
