import { describe, it, expect } from 'vitest'
import { youtubeId } from './youtube'

describe('youtubeId', () => {
  it('extracts id from a youtube.com/watch?v= url', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=PXgMofDT5To')).toBe('PXgMofDT5To')
  })
  it('extracts id from a youtu.be short url', () => {
    expect(youtubeId('https://youtu.be/tGDAuij5RvE')).toBe('tGDAuij5RvE')
  })
  it('extracts id from an /embed/ url', () => {
    expect(youtubeId('https://www.youtube.com/embed/abc123')).toBe('abc123')
  })
  it('returns null for non-youtube urls', () => {
    expect(youtubeId('https://2019.container.camp/au/speakers/ben-ebsworth/')).toBeNull()
    expect(youtubeId('https://melbkubernetes.org/istion-in-the-real-world/')).toBeNull()
  })
  it('returns null for empty / undefined / malformed input', () => {
    expect(youtubeId('')).toBeNull()
    expect(youtubeId(undefined)).toBeNull()
    expect(youtubeId('not a url')).toBeNull()
  })
})
