import { test, expect } from '@playwright/test'
const BASE = process.env.CS_BASE ?? ''

test('debug: dump validation state for RC filter', async ({ page }) => {
  await page.goto(`${BASE}/lab/circuit-sim/`)
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Circuit library' }).click()
  await page.waitForTimeout(300)
  await page.getByText('RC Low-Pass Filter').click()
  await page.waitForTimeout(1500)

  const pageText = await page.locator('body').textContent()
  console.log('Has "Circuit ready":', pageText?.includes('Circuit ready'))
  console.log('Has "READY":', pageText?.includes('READY'))
  console.log('Has "OPEN_LOOP":', pageText?.includes('OPEN_LOOP'))
  console.log('Has "FLOATING":', pageText?.includes('FLOATING'))
  console.log('Canvas count:', await page.locator('canvas').count())

  // Dump all the diagnostic-like text
  const allDivs = await page.locator('div').allTextContents()
  const diagDivs = allDivs.filter(t => t.includes('READY') || t.includes('OPEN') || t.includes('FLOAT') || t.includes('Circuit'))
  console.log('Diagnostic divs:', JSON.stringify(diagDivs))
})
