import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { renderOgCard } from './og'

describe('high-contrast hiking OpenGraph backgrounds', () => {
  it('renders a full-sized scrim over a worst-case white photograph', async () => {
    const background = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#ffffff' } }).png().toBuffer()
    const response = renderOgCard({
      eyebrow: 'Hiking', title: 'Snow-covered trail', description: 'Photograph', footer: 'Trail overview',
      backgroundUri: `data:image/png;base64,${background.toString('base64')}`,
      backgroundContrast: 'high',
    })
    const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([1200, 630])
    // Outside the frame/text, all four corners must be darkened, including the
    // far right. This catches an empty, zero-sized absolute overlay in Satori.
    for (const [x, y] of [[10, 10], [1190, 10], [10, 620], [1190, 620]]) {
      const offset = (y * info.width + x) * info.channels
      expect(Math.max(...data.subarray(offset, offset + 3))).toBeLessThan(100)
    }
  }, 30_000)
})
