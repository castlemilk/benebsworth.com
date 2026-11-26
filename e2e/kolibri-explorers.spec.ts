import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('Kolibri diagrams explain token stages, selection bias, and the memory budget', async ({ page }) => {
  await page.goto('/learning/')
  await page.getByRole('link', { name: /Kolibri: A sparse model as a system/ }).click()
  const explorer = page.getByRole('region', { name: 'Explore Kolibri' })
  await expect(explorer).toBeVisible()

  await explorer.getByRole('tab', { name: 'Embed', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(explorer.getByRole('tab', { name: 'Attend', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(explorer.getByText('48 query heads · 4 KV heads')).toBeVisible()

  await explorer.getByRole('tab', { name: 'Expert router' }).click()
  await expect(explorer.getByText('A + B + shared', { exact: true })).toBeVisible()
  await explorer.getByRole('slider', { name: 'Expert C selection bias' }).focus()
  await page.keyboard.press('End')
  await expect(explorer.getByText('A + C + shared', { exact: true })).toBeVisible()
  await expect(explorer.getByText(/Routed weights sum to 1.38/)).toBeVisible()

  await explorer.getByRole('tab', { name: 'Attention cache' }).click()
  await expect(explorer.getByText('2.52 GiB', { exact: true })).toBeVisible()
  await explorer.getByRole('radio', { name: '1M', exact: true }).click()
  await explorer.getByRole('radio', { name: 'BF16', exact: true }).click()
  await expect(explorer.getByText('100.00 GiB', { exact: true })).toBeVisible()
  const chart = explorer.getByRole('img', { name: /KV cache comparison/ })
  await expect(chart.locator('svg').first()).toBeVisible()
  await expect(chart).toHaveAccessibleName(/Kolibri 20.04, all full 100.00/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('switch', { name: 'Toggle dark mode' }).click()
  await expect(explorer.getByText('100.00 GiB', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  await explorer.getByRole('tab', { name: 'Expert router' }).click()
  await expect(explorer.getByText('A + C + shared', { exact: true })).toBeVisible()
})

test('Kolibri packet loads a primary figure at each illustrated heading', async ({ page, request }) => {
  await page.goto('/study/research/kolibri/')
  const sections = [
    ['Follow one token through the model', 'token-path'],
    ['Sparse capacity and routing', 'sparse-path'],
    ['Attention and long context', 'attention-cycle'],
    ['Why German changes the tokeniser and the data', 'bytes-vs-tokens'],
    ['From raw data to Kolibri Base', 'training-stages'],
    ['Optimisation and the training cluster', 'pretraining-cluster'],
    ['Supervised fine-tuning and the reasoning dial', 'effort-labels'],
    ['Reinforcement learning from attempts', 'rollout-loop'],
    ['How the released model scores', 'checkpoint-benchmarks'],
    ['What happens as context grows', 'ruler-context'],
    ['Read the evaluations in the right order', 'throughput-frontier'],
    ['Read the evaluations in the right order', 'decode-throughput-kpi'],
  ]
  const packet = page.locator('main article')
  for (const [heading, figure] of sections) {
    const image = packet.locator(`img[src="/study-research/kolibri/${figure}.svg"]`)
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect(image).toHaveAccessibleName(/\S/)
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    const localHeading = await image.evaluate((img) => {
      let block = img.closest('p, figure') ?? img
      while (block.previousElementSibling) {
        block = block.previousElementSibling
        if (block.matches('h2, h3')) return block.textContent
      }
      return null
    })
    expect(localHeading?.trim()).toBe(heading)
    expect((await request.get(`/study-research/kolibri/${figure}.svg`)).ok()).toBe(true)
  }
  const instructionFollowing = packet.getByRole('row', { name: /IFBench.*loose-prompt.*29.9 pp/ })
  await expect(instructionFollowing.getByRole('cell', { name: /^78\.1\s*Best$/ })).toBeVisible()
  const millionTokens = packet.getByRole('row', { name: /1,048,576.*63.2%.*58.5%.*57.5%/ })
  await expect(millionTokens).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' })

  test('can tap a cache preset', async ({ page }) => {
    await page.goto('/study/research/kolibri/')
    const explorer = page.getByRole('region', { name: 'Explore Kolibri' })
    await explorer.getByRole('tab', { name: 'Attention cache' }).tap()
    await explorer.getByRole('radio', { name: '64k', exact: true }).tap()
    await expect(explorer.getByRole('radio', { name: '64k', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(explorer.getByText('0.64 GiB', { exact: true })).toBeVisible()
  })

  test('benchmark rows link to providers and highlight the leader across different models', async ({ page }) => {
    await page.goto('/study/research/kolibri/#how-the-released-model-scores')
    const toolCalling = page.getByRole('row', { name: /BFCL v4.*multi-turn/ })
    await expect(toolCalling.getByRole('link', { name: 'BFCL v4' })).toHaveAttribute('href', 'https://gorilla.cs.berkeley.edu/leaderboard.html')
    await expect(toolCalling.getByRole('cell', { name: /^58\.1\s*Best$/ })).toBeVisible()
    const closedBook = page.getByRole('row', { name: /RGB.*Closed-Book/ })
    await expect(closedBook.getByRole('cell', { name: /^80\.0\s*Best$/ })).toBeVisible()
    const longContext = page.getByRole('row', { name: /1,048,576.*63.2%.*Best/ })
    await expect(longContext.getByRole('cell', { name: /^63\.2%\s*Best$/ })).toBeVisible()
    const table = page.getByRole('table').filter({ has: toolCalling })
    await expect(table.locator('.benchmark-score-track > span').first()).toBeVisible()
    const region = table.locator('..')
    await region.focus()
    await expect(region).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
