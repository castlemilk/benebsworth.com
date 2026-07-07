import { expect, test } from '@playwright/test'

test('DSpark post renders the interactive architecture walkthrough', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto('/blog/dspark-speculative-decoding/')

  await expect(page.getByRole('heading', { name: 'DSpark turns speculation into a scheduler', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A few simple diagrams first', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The speculative loop', level: 2 })).toBeVisible()
  await expect(page.locator('link[rel="alternate"][type="text/markdown"][href$="/blog/dspark-speculative-decoding/index.md"]')).toHaveCount(1)

  const eli5 = page.getByTestId('deepspec-eli5-flow')
  await eli5.scrollIntoViewIfNeeded()
  await expect(eli5).toBeVisible()
  await expect(eli5.getByText('One token at a time')).toBeVisible()
  await expect(eli5.getByText('Pay the big model every step')).toBeVisible()

  await eli5.getByRole('button', { name: 'Guess ahead' }).click()
  await expect(eli5.getByText('Guess four tokens, verify once')).toBeVisible()
  await expect(eli5.getByText(/Bad suffixes are expensive guesses/i)).toBeVisible()

  await eli5.getByRole('button', { name: 'DSpark' }).click()
  await expect(eli5.getByText('Schedule only the useful prefix')).toBeVisible()
  await expect(eli5.getByText(/Parallel draft stays fast/i)).toBeVisible()

  const diagram = page.getByTestId('deepspec-architecture')
  await diagram.scrollIntoViewIfNeeded()
  await expect(diagram).toBeVisible()
  await expect(diagram.getByText('Parallel drafter')).toBeVisible()
  await expect(diagram.getByText('Confidence scheduler')).toBeVisible()

  await diagram.getByRole('button', { name: 'Verify prefix' }).click()
  await expect(diagram.getByText('Keep E F G')).toBeVisible()
  await expect(diagram.getByText('Drop H')).toBeVisible()

  await diagram.getByRole('button', { name: 'System view' }).click()
  await expect(diagram.getByText(/Light load verifies more/i)).toBeVisible()
  await expect(diagram.getByText(/heavy load trims earlier/i)).toBeVisible()

  await expect(page.getByRole('heading', { name: 'A careful neurology parallel', level: 2 })).toBeVisible()
  await expect(page.getByText(/brain comparison is an analogy/i)).toBeVisible()

  expect(errors).toEqual([])
})
