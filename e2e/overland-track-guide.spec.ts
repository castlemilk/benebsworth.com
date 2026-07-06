import { expect, test } from '@playwright/test'

test('published Overland Track winter guide renders and links to the hike overview', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto('/blog/overland-track-guide/')

  await expect(page.getByRole('heading', { name: 'The Overland Track in winter — a trail guide' })).toBeVisible()
  await expect(page.getByText('The Overland Track is usually a six-day summer walk')).toBeVisible()
  await expect(page.getByText('The shuttle from Launceston was meant to drop us at Ronny Creek')).toBeVisible()
  await expect(page.getByText('Night one, below Barn Bluff. Cold, exposed, and a good place to get dinner sorted early.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Overland Track — map, stats & gallery/i })).toHaveAttribute(
    'href',
    '/hiking/overland-track/',
  )

  await page.getByRole('button', { name: /Lake Windermere, 1,000 metres, Day 2/i }).first().click()
  await expect(page.getByRole('link', { name: /Day 2/i })).toHaveAttribute('href', '#day-2')

  await page.getByRole('link', { name: /Overland Track — map, stats & gallery/i }).click()
  await expect(page).toHaveURL(/\/hiking\/overland-track\/$/)
  await expect(page.getByRole('heading', { name: 'Overland Track' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Read the trail guide/i })).toHaveAttribute(
    'href',
    '/blog/overland-track-guide/',
  )

  expect(errors).toEqual([])
})
