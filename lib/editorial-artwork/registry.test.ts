import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ARTWORK, ARTWORK_TAGS, artworkSearchRecords, artworkUrl, searchArtwork } from './registry'
import { STUDIES } from '../generative-svg/model'

describe('generated artwork is a separate, reusable raster catalogue', () => {
  it('has unique safe identities, curated metadata and no procedural models', () => {
    expect(new Set(ARTWORK.map(a => a.id)).size).toBe(ARTWORK.length)
    for (const asset of ARTWORK) {
      expect(asset.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
      expect(asset.src).toMatch(new RegExp(`^/artwork/editorial/${asset.id}-v[1-9][0-9]*\\.png$`))
      expect(asset.format).toBe('png'); expect(asset.provenance).toBe('generated-artwork')
      expect(asset.transparent).toBe(true); expect(asset.masterUnmodified).toBe(true)
      expect(asset.tags.length).toBeGreaterThan(0)
      expect(new Set(asset.tags).size).toBe(asset.tags.length)
      for (const tag of asset.tags) expect(tag).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
      for (const field of [asset.title, asset.alt, asset.use, asset.basis, asset.prompt, asset.generator]) expect(field.trim()).not.toBe('')
      expect(STUDIES.some(study => study.id === asset.id)).toBe(false)
      expect(asset).not.toHaveProperty('model')
    }
    expect(ARTWORK_TAGS).toEqual([...new Set(ARTWORK.flatMap(a => [...a.tags]))].sort())
  })
  it.each(ARTWORK)('preserves $id master bytes, dimensions and real alpha', async asset => {
    const bytes = fs.readFileSync(path.join('public', asset.src))
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(bytes.length).toBe(asset.bytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
    const metadata = await sharp(bytes).metadata()
    expect([metadata.width, metadata.height, metadata.hasAlpha]).toEqual([asset.width, asset.height, true])
    const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true })
    let transparent = 0, min = 255, max = 0
    for (let i = info.channels - 1; i < data.length; i += info.channels) { const alpha = data[i]; if (!alpha) transparent++; min = Math.min(min, alpha); max = Math.max(max, alpha) }
    expect({ min, max, transparentPixels: transparent }).toEqual({ min: asset.alpha.min, max: asset.alpha.max, transparentPixels: asset.alpha.transparentPixels })
  })
  it('finds every name, alias and tag with intersecting queries and excludes caveats', () => {
    for (const asset of ARTWORK) for (const query of [asset.title, ...asset.aliases, ...asset.tags]) expect(searchArtwork(`  ${query.toUpperCase()}  `)).toContain(asset)
    expect(searchArtwork('memory cache', 'hardware').map(a => a.id)).toContain('memory-layer-stack')
    expect(searchArtwork('memory', 'writing')).toEqual([])
    expect(searchArtwork('validated')).toEqual([])
    expect(searchArtwork('')).toHaveLength(ARTWORK.length)
  })
  it('provides truthful index records and exact public provenance without internal paths', () => {
    for (const [i, record] of artworkSearchRecords().entries()) {
      expect(record.url).toBe(artworkUrl(ARTWORK[i])); expect(record.meta.kind).toBe('PNG artwork')
      expect(record.content).not.toContain(ARTWORK[i].basis)
      expect(record.filters.kind).toEqual(['PNG artwork'])
    }
    const raw = fs.readFileSync('public/artwork/editorial/provenance.json', 'utf8')
    expect(JSON.parse(raw).assets).toEqual(ARTWORK)
    expect(raw).not.toMatch(/\/workspace\/|library-file:|libfile_|sediment:\/\//)
  })
})
