import { test, expect, type Page } from '@playwright/test'

async function expectGraphGroupsToWrapNodes(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const groups = new Map(
            Array.from(document.querySelectorAll('[data-graph-group]')).map((element) => [
              element.getAttribute('data-graph-group'),
              element.getBoundingClientRect(),
            ]),
          )
          const misses: string[] = []

          document.querySelectorAll('[data-graph-node-id][data-graph-cluster]').forEach((element) => {
            const cluster = element.getAttribute('data-graph-cluster')
            const nodeId = element.getAttribute('data-graph-node-id')
            const groupRect = groups.get(cluster)
            if (!cluster || !nodeId || !groupRect) return

            const nodeRect = element.getBoundingClientRect()
            const margin = 1
            if (
              nodeRect.left < groupRect.left - margin ||
              nodeRect.right > groupRect.right + margin ||
              nodeRect.top < groupRect.top - margin ||
              nodeRect.bottom > groupRect.bottom + margin
            ) {
              misses.push(`${nodeId}:${cluster}`)
            }
          })

          return misses
        }),
      { timeout: 2_000 },
    )
    .toEqual([])
}

test('memory chip ecosystem post renders and widgets respond', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto('/blog/memory-chip-ecosystem/')

  await expect(page.getByRole('heading', { name: 'The Memory Stack: Why AI Turned DRAM Into Strategy' })).toBeVisible()
  await expect(page.getByText('The memory hierarchy is a map of compromise')).toBeVisible()
  await expect(page.getByText('A DRAM bit is charge with a deadline')).toBeVisible()
  await expect(page.getByText('For inference, the second model is the cache')).toBeVisible()

  await page.getByRole('button', { name: 'training' }).click()
  await expect(page.getByText('high reuse inside the GPU: activations, gradients, optimizer state')).toBeVisible()

  await page.getByRole('button', { name: 'consumer GPU' }).click()
  await expect(page.getByText('GDDR7').first()).toBeVisible()

  await page.getByRole('button', { name: '8B edge model' }).click()
  await expect(page.getByText('4 GB').first()).toBeVisible()

  await page.getByRole('button', { name: 'NAND revenue, 1Q26' }).click()
  await expect(page.getByText(/enterprise QLC SSD demand/)).toBeVisible()

  await expect(page.getByText('Memory market knowledge graph')).toBeVisible()
  const graph = page.getByTestId('memory-knowledge-graph')
  await expect(graph).toBeVisible()
  await expect
    .poll(async () => graph.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true)
  await expect(page.getByTestId('knowledge-graph-canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Zoom In' }).click()
  await expect(page.getByText('Zoom 100%')).toBeVisible()
  await page.getByRole('button', { name: 'Zoom Out' }).click()
  await expect(page.getByText('Zoom 92%')).toBeVisible()
  await page.getByLabel('Graph zoom').fill('120')
  await expect(page.getByText('Zoom 120%')).toBeVisible()
  await expectGraphGroupsToWrapNodes(page)
  await page.getByTestId('knowledge-graph-canvas').dispatchEvent('wheel', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    deltaY: 120,
  })
  await expect(page.getByText('Zoom 90%')).toBeVisible()
  await page.getByRole('button', { name: 'Fit graph' }).click()
  await expect(page.getByText('Zoom 92%')).toBeVisible()
  await page.getByRole('button', { name: 'Expand graph' }).click()
  const expandedGraph = page.getByRole('dialog', { name: 'Memory market graph expanded' })
  await expect(expandedGraph).toBeVisible()
  await expect(page.getByTestId('knowledge-graph-fullscreen')).toBeVisible()
  await page.getByRole('button', { name: 'Close expanded graph' }).click()
  await expect(expandedGraph).toBeHidden()
  await page.getByRole('button', { name: 'NVIDIA accelerator platform' }).click()
  await expect(page.getByText('FY2026 data center revenue').last()).toBeVisible()
  await expect(page.getByText('SK hynix -> NVIDIA').last()).toBeVisible()

  await page.getByRole('button', { name: 'Financial Flow' }).click()
  await expect(page.getByText('AWS AI infrastructure commitments').last()).toBeVisible()
  await expect(page.getByText('company financial anchors').last()).toBeVisible()
  await expect(page.getByText('USD 556.9B').last()).toBeVisible()

  await page.getByRole('button', { name: 'Route Trace' }).click()
  await page.getByRole('button', { name: 'Micron -> Azure HBM supplier to Azure demand' }).click()
  await expect(page.getByText('Micron -> NVIDIA -> Microsoft / Azure').last()).toBeVisible()
  await expect(page.getByText(/worst-link evidence: direct/).last()).toBeVisible()

  const refresh = page.getByLabel('Time since last DRAM refresh')
  await refresh.focus()
  await page.keyboard.press('End')
  await expect(page.getByText('refresh now')).toBeVisible()

  expect(errors).toEqual([])
})

test('memory market graph collapses dense controls on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/blog/memory-chip-ecosystem/')

  const graph = page.getByTestId('memory-knowledge-graph')
  await graph.scrollIntoViewIfNeeded()
  await expect(graph).toBeVisible()
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    .toBe(true)

  await expect(page.getByRole('button', { name: 'Drilldown' })).toBeVisible()
  const legendDisclosure = page.locator('details').filter({ hasText: 'Legend and controls' })
  await expect(legendDisclosure).toBeVisible()
  await expect(legendDisclosure.getByText('Node types')).toBeHidden()
  await legendDisclosure.getByText('Legend and controls').click()
  await expect(legendDisclosure.getByText('Node types')).toBeVisible()

  const detailDisclosure = page.locator('details').filter({ hasText: 'NVIDIA Details' })
  await expect(detailDisclosure).toBeVisible()
  await expect(detailDisclosure.getByText('FY2026 data center revenue')).toBeHidden()
  await detailDisclosure.getByText('NVIDIA Details').click()
  await expect(detailDisclosure.getByText('FY2026 data center revenue')).toBeVisible()
})

test('memory market graph context nodes are selectable', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 })
  await page.goto('/blog/memory-chip-ecosystem/')

  const graph = page.getByTestId('memory-knowledge-graph')
  await graph.scrollIntoViewIfNeeded()

  await page.getByRole('button', { name: /KLA/i }).click()
  await expect(page.getByRole('heading', { name: 'KLA' })).toBeVisible()
  await expect(page.getByText(/process control and inspection/i).last()).toBeVisible()

  await page.getByRole('button', { name: /Lam Research/i }).click()
  await expect(page.getByRole('heading', { name: 'Lam Research' })).toBeVisible()
  await expect(page.getByText(/etch and deposition/i).last()).toBeVisible()
})
