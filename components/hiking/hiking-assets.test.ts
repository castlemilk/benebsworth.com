import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { hikes } from '@/content/hiking'
import { hikeImagery } from '@/content/hiking-imagery'

describe('hiking image assets', () => {
  it.each(hikes)('keeps $slug source dimensions and original illustration available', async hike => {
    const media = hikeImagery(hike)
    const file = resolve('public', media.src.slice(1))
    const metadata = await sharp(readFileSync(file)).metadata()
    expect(metadata.width).toBe(media.width)
    expect(metadata.height).toBe(media.height)
    expect(statSync(resolve('public', hike.hero.slice(1))).isFile()).toBe(true)
    if (media.srcSet) {
      const thumb = media.srcSet.split(' ')[0]
      const small = await sharp(readFileSync(resolve('public', thumb.slice(1)))).metadata()
      expect(small.width).toBe(640)
      expect(small.height).toBe(480)
    }
  })
})
