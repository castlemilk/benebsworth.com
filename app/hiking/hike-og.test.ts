import { describe, expect, it, vi } from 'vitest'
import { hikes } from '@/content/hiking'
import { hikeImagery } from '@/content/hiking-imagery'

const mocks = vi.hoisted(() => ({image:vi.fn(async (src:string) => `data:${src}`), render:vi.fn((props:object) => props)}))
vi.mock('@/lib/og', () => ({renderOgCard:mocks.render, publicOgImageDataUri:mocks.image, OG_SIZE:{width:1200,height:630}, OG_CONTENT_TYPE:'image/png'}))
import Image from './[slug]/opengraph-image'
import IndexImage from './opengraph-image'

describe('hiking social thumbnails', () => {
  it.each(hikes)('uses the same $slug image and truthful type as the page', async hike => {
    await Image({params:Promise.resolve({slug:hike.slug})})
    expect(mocks.image).toHaveBeenLastCalledWith(hikeImagery(hike).src, {width:1200,height:630,fit:'cover'})
    expect(mocks.render).toHaveBeenLastCalledWith(expect.objectContaining({title:hike.name, backgroundContrast:'high', backgroundUri:`data:${hikeImagery(hike).src}`, description:expect.stringContaining(hikeImagery(hike).kind === 'photograph' ? 'Photograph' : 'Illustration')}))
  })
  it('brings the index into the same cover family', async () => {
    await IndexImage()
    expect(mocks.image).toHaveBeenLastCalledWith(hikeImagery(hikes[0]).src, {width:1200,height:630,fit:'cover'})
    expect(mocks.render).toHaveBeenLastCalledWith(expect.objectContaining({backgroundContrast:'high'}))
  })
})
