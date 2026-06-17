import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test('complete flow: load → probe → run → scope → stop → switch → reset', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))

  await page.goto(`${BASE}/lab/circuit-sim/`)

  await page.getByRole('button', { name: '📐 Load example...' }).click()
  await page.getByText('RC Low-Pass Filter').click()
  await page.waitForTimeout(500)

  await expect(page.locator('canvas')).toHaveCount(2, { timeout: 5000 })
  await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Probes')).toBeVisible({ timeout: 3000 })

  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForTimeout(500)
  await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible({ timeout: 3000 })
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /Stop/ }).first().click()
  await page.waitForTimeout(300)
  await expect(page.getByRole('button', { name: '▶ Run' })).toBeVisible({ timeout: 2000 })

  await page.getByRole('button', { name: '📐 Load example...' }).click()
  await page.getByText('RLC Ringing').click()
  await page.waitForTimeout(500)
  await expect(page.locator('canvas')).toHaveCount(2, { timeout: 5000 })
  await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /Stop/ }).first().click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: '↺ Reset' }).click()
  await page.waitForTimeout(300)
  // Scope canvas stays but shows empty state (always 2 canvases now)
  await expect(page.locator('canvas')).toHaveCount(2)

  const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
  expect(real).toEqual([])
})

test('all 10 samples: validate, auto-probe, run, stop', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto(`${BASE}/lab/circuit-sim/`)

  const samples = [
    'Voltage Divider', 'RC Low-Pass Filter', 'RLC Ringing',
    'LC Oscillator Tank', 'Three-Resistor T-Network',
    'Two-Stage RC Filter', 'Wheatstone Bridge',
    'RLC Tank with Ringing', 'Resistive Load', 'LC Pi Filter',
  ]

  for (const name of samples) {
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    const btn = page.getByText(name, { exact: false }).first()
    if (await btn.isVisible({ timeout: 500 })) await btn.click()
    else {
      await page.getByRole('button', { name: '📐 Load example...' }).click()
      await page.getByText(name, { exact: false }).first().click()
    }
    await page.waitForTimeout(400)

    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('canvas')).toHaveCount(2, { timeout: 3000 })

    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(600)
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 500 })) await stopBtn.click()
    await page.waitForTimeout(200)
  }

  const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
  expect(real).toEqual([])
})
