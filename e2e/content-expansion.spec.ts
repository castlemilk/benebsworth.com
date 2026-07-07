import { expect, test } from '@playwright/test'

const blogPosts = [
  {
    slug: 'how-dram-remembers-a-bit',
    title: 'How DRAM remembers a bit',
    section: 'The cell: one transistor, one capacitor',
  },
  {
    slug: 'backpressure-is-the-system-saying-no',
    title: 'Backpressure is the system saying no',
    section: 'A queue stores time',
  },
] as const

const labPages = [
  { slug: 'aliasing-and-nyquist', title: 'Aliasing and Nyquist' },
  { slug: 'feedback-stability-margins', title: 'Feedback Stability Margins' },
  { slug: 'complex-maps-and-airfoils', title: 'Complex Maps and Airfoils' },
  { slug: 'chaos-sensitivity', title: 'Sensitive Dependence' },
  { slug: 'turing-patterns', title: 'Turing Patterns' },
] as const

for (const post of blogPosts) {
  test(`new blog post renders: ${post.slug}`, async ({ page }) => {
    await page.goto(`/blog/${post.slug}/`)
    await expect(page.getByRole('heading', { name: post.title, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: post.section, level: 2 })).toBeVisible()
    await expect(page.locator('.katex').first()).toBeVisible()
    await expect(page.locator(`link[rel="alternate"][type="text/markdown"][href$="/blog/${post.slug}/index.md"]`)).toHaveCount(1)
  })
}

for (const lab of labPages) {
  test(`new lab page renders: ${lab.slug}`, async ({ page }) => {
    await page.goto(`/lab/${lab.slug}/`)
    await expect(page.getByRole('heading', { name: lab.title, level: 1 })).toBeVisible()
    await expect(page.getByRole('img', { name: `${lab.title} animation` })).toBeVisible()
  })
}

test('new lab guide pages are separated from demo category sections', async ({ page }) => {
  await page.goto('/lab/')
  const guideSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Concept guides' }),
  })
  await expect(guideSection).toBeVisible()

  for (const lab of labPages) {
    await expect(guideSection.locator(`a[href="/lab/${lab.slug}/"]`)).toHaveCount(1)
  }

  await expect(page.locator('#cat-engineering a[href="/lab/aliasing-and-nyquist/"]')).toHaveCount(0)
  await expect(page.locator('#cat-engineering a[href="/lab/feedback-stability-margins/"]')).toHaveCount(0)
  await expect(page.locator('#cat-maths a[href="/lab/complex-maps-and-airfoils/"]')).toHaveCount(0)
  await expect(page.locator('#cat-maths a[href="/lab/chaos-sensitivity/"]')).toHaveCount(0)
  await expect(page.locator('#cat-maths a[href="/lab/turing-patterns/"]')).toHaveCount(0)

  await expect(page.locator('#cat-engineering a[href="/lab/fft-spectrum/"]')).toHaveCount(1)
  await expect(page.locator('#cat-engineering a[href="/lab/bode-plotter/"]')).toHaveCount(1)
  await expect(page.locator('#cat-maths a[href="/lab/conformal-grid/"]')).toHaveCount(1)
  await expect(page.locator('#cat-maths a[href="/lab/lorenz-attractor/"]')).toHaveCount(1)
  await expect(page.locator('#cat-maths a[href="/lab/reaction-diffusion/"]')).toHaveCount(1)
})
