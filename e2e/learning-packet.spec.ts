import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import matter from 'gray-matter'
import { test, expect } from '@playwright/test'

type Section = { figure?: string }
type Plan = { sections: Record<string, Section> }
type Question = { id: string; kind: string; correctOptionId?: string; options: { id: string }[] }

const root = 'study/mlsys'
for (const filename of globSync('vol*/*/diagram-plan.json', { cwd: root })) {
  const packet = dirname(filename)
  const folder = join(root, packet)
  const plan: Plan = JSON.parse(readFileSync(join(root, filename), 'utf8'))
  const { content, data } = matter(readFileSync(join(folder, 'packet.md'), 'utf8'))
  const glossCount = [...content.matchAll(/==(?:[^=\n]|=(?!=))+==\{/g)].length
  const { questions }: { questions: Question[] } = JSON.parse(readFileSync(join(folder, 'quiz.json'), 'utf8'))
  const url = '/study/' + packet + '/'

  for (const layout of ['phone', 'desktop'] as const) {
    test.describe(`${packet} · ${layout}`, () => {
      const phone = layout === 'phone'
      test.use({
        viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
        hasTouch: phone, isMobile: phone, colorScheme: phone ? 'light' : 'dark',
        contextOptions: { reducedMotion: 'reduce' },
      })

      test('find the packet, read the figures and explainer, then try the quiz', async ({ page, request }) => {
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        await page.goto('/learning/')
        await page.getByRole('button', { name: 'Books', exact: true }).click()
        const book = page.getByRole('link', { name: /Machine Learning Systems/ })
        if (phone) {
          const description = book.locator('.learning-row-description')
          expect((await description.boundingBox())!.width).toBeGreaterThan(300)
        }
        await book.click()
        await expect(page.getByRole('link', { name: /^Read chapter \d+ ·/ })).toBeVisible()
        await page.locator(`ol a[href="${url}"]`).click()
        if (data.openingQuestion) {
          await expect(page.locator('main header').getByText(data.openingQuestion, { exact: true })).toBeInViewport()
        }

        for (const { figure } of Object.values(plan.sections)) {
          const marker = figure?.match(/^::(fig|chart)\[([\w-]+)\]$/)
          if (!marker) continue
          const node = page.locator(`#fig-${marker[2]}`)
          await node.scrollIntoViewIfNeeded()
          await expect(node.locator('svg').first()).toBeVisible()
          await expect(node.locator('figcaption')).toContainText(/\S/)
          for (const label of await node.locator('span[title]').all()) {
            expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
          }
        }
        for (const svg of await page.locator('svg.study-fig-fit').all()) {
          expect(await svg.evaluate(el => {
            const frame = el.closest('figure')!
            return frame.scrollWidth <= frame.clientWidth + 1
          })).toBe(true)
          expect(await svg.evaluate(el => {
            const ids = el.getAttribute('aria-labelledby')?.split(/\s+/) ?? []
            return ids.length > 0 && ids.every(id => el.contains(document.getElementById(id)))
          })).toBe(true)
          const labelProblems = await svg.evaluate(el => {
            const frame = el.getBoundingClientRect()
            const labels = Array.from(el.querySelectorAll('text:not(:has(tspan)), tspan:not(:has(tspan))'))
              .map(label => ({ text: label.textContent, box: label.getBoundingClientRect() }))
              .filter(({ box }) => box.width && box.height)
            const problems: string[] = []
            for (const [i, { text, box }] of labels.entries()) {
              if (box.left < frame.left - 1 || box.right > frame.right + 1 ||
                  box.top < frame.top - 1 || box.bottom > frame.bottom + 1) {
                problems.push(`clipped: ${text}`)
              }
              for (const other of labels.slice(i + 1)) {
                const width = Math.min(box.right, other.box.right) - Math.max(box.left, other.box.left)
                const height = Math.min(box.bottom, other.box.bottom) - Math.max(box.top, other.box.top)
                // Small intersections can be font ascenders and descenders on adjacent lines.
                if (width > 2 && height > Math.max(2, Math.min(box.height, other.box.height) * 0.2)) {
                  problems.push(`overlap: ${text} / ${other.text}`)
                }
              }
            }
            return problems
          })
          expect(labelProblems, await svg.getAttribute('aria-labelledby') ?? 'compact SVG').toEqual([])
        }

        const explainers = page.locator('mark[tabindex="0"]').filter({ has: page.getByRole('note', { includeHidden: true }) })
        await expect(explainers).toHaveCount(glossCount)
        for (const mark of await explainers.all()) {
          await mark.evaluate(el => el.scrollIntoView({ block: 'center' }))
          if (phone) await mark.tap()
          else await mark.focus()
          const gloss = mark.getByRole('note')
          await expect(gloss).toBeVisible()
          const bounds = await gloss.boundingBox()
          expect(bounds!.x).toBeGreaterThanOrEqual(0)
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
          if (phone) {
            // A wide note can cover the next phrase and even the reading margin.
            // Tap the chapter title, which is outside every note.
            await page.locator('main h1').tap()
            await expect(gloss).toBeHidden()
          }
        }

        const index = questions.findIndex(q => q.kind === 'MCQ')
        if (index >= 0) {
          const q = questions[index]
          const wrong = q.options.findIndex(option => option.id !== q.correctOptionId)
          const article = page.getByRole('article', { name: `Question ${index + 1}`, exact: true })
          await article.getByRole('button').nth(wrong).click()
          await expect(article.getByRole('status')).toContainText(/not quite/i)
          await expect(article.getByText('Correct answer', { exact: true })).toBeVisible()
          await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
        }

        const exported = await request.get(url + 'index.md')
        expect(exported.ok()).toBe(true)
        const markdown = await exported.text()
        expect(markdown).toContain('## Self-test')
        if (data.openingQuestion) expect(markdown).toContain(data.openingQuestion)
        for (const link of await page.locator('mark a[href^="#fig-"]').all()) {
          const fragment = await link.getAttribute('href')
          expect(markdown).toContain(url + fragment)
          await expect(page.locator(fragment!)).toHaveCount(1)
        }
        expect(markdown).not.toMatch(/^::(?:fig|chart|eq)\[/m)
        expect(errors).toEqual([])
      })
    })
  }
}
