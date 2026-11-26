import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { TranscriptSegment } from '../lib/gen/study'

const chapter = 'vol1/11-hw-acceleration'
const { segments }: { segments: TranscriptSegment[] } = JSON.parse(
  readFileSync(`study/mlsys/${chapter}/transcript.json`, 'utf8'),
)

for (const width of [390, 1440]) {
  test.describe(`${chapter} · transcript slides at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width === 390, colorScheme: width === 390 ? 'light' : 'dark' })
    test('keeps the slide, transcript and recording together on playback and seeks', async ({ page }) => {
      await page.goto(`/study/${chapter}/`)
      const player = page.locator('.audio-overview')
      const stage = player.getByRole('figure', { name: 'Current slide' })
      const audio = player.locator('audio')
      const first = segments[0]
      const diagram = segments[1]
      const equation = segments.find(s => s.eq?.id === 'projection-work')!
      await expect(stage).toHaveCount(0)
      await player.getByRole('button', { name: 'Show transcript' }).click()
      await expect(stage.getByRole('img')).toHaveAttribute('src', first.visual!.src)
      await expect.poll(() => stage.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      const frame = (await stage.boundingBox())!
      const text = (await player.getByRole('list').boundingBox())!
      if (width === 390) expect(frame.y + frame.height).toBeLessThanOrEqual(text.y)
      else expect(frame.x + frame.width).toBeLessThanOrEqual(text.x)

      await player.getByRole('button', { name: 'Next slide' }).click()
      await expect(stage.getByRole('img')).toHaveAttribute('src', diagram.visual!.src)
      expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true)
      await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeCloseTo(diagram.start, 1)
      await player.getByRole('button', { name: 'Previous slide' }).click()
      await expect(stage.getByRole('img')).toHaveAttribute('src', first.visual!.src)

      // Start just before the boundary and let the real recording advance across it.
      await audio.evaluate((a: HTMLAudioElement, start) => { a.currentTime = start - 0.6 }, diagram.start)
      await player.getByRole('button', { name: 'Play', exact: true }).click()
      await expect(stage.getByRole('img')).toHaveAttribute('src', diagram.visual!.src)
      await expect(player.locator('.ao-seg.is-active')).toContainText(diagram.text.split(' ').slice(0, 4).join(' '))
      await player.locator('.ao-seg-btn').nth(segments.indexOf(equation)).click()
      await expect(stage.locator('.katex')).toBeVisible()
      await expect(stage).toContainText(equation.eq!.title)
      await player.getByRole('button', { name: 'Pause', exact: true }).click()
      await player.getByRole('button', { name: 'Hide transcript' }).click()
      await player.getByRole('button', { name: 'Show transcript' }).click()
      await expect(stage).toContainText(equation.eq!.title)
      // The third turn continues the previous diagram without a cue of its own.
      await player.locator('.ao-seg-btn').nth(2).press('Enter')
      await expect(stage.getByRole('img')).toHaveAttribute('src', diagram.visual!.src)
      await expect(player.locator('.ao-seg.is-active')).toContainText(segments[2].text.split(' ').slice(0, 4).join(' '))
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    })
  })
}
