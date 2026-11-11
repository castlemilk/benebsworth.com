import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  VECTOR_CATEGORIES,
  CATEGORY_MAP,
  getVectorBatches,
  getAllVectors,
} from './registry'

describe('Vector Registry', () => {
  it('defines the 5 core technical categories with distinct accents and glyphs', () => {
    expect(VECTOR_CATEGORIES).toHaveLength(5)
    const keys = VECTOR_CATEGORIES.map((c) => c.key)
    expect(keys).toEqual([
      'math-functions',
      'physics-quantum',
      'cs-algorithms',
      'distributed-systems',
      'rf-electronics',
    ])

    // Verify all accents and glyphs are non-empty
    for (const cat of VECTOR_CATEGORIES) {
      expect(cat.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(cat.glyph.length).toBeGreaterThan(0)
      expect(cat.label.length).toBeGreaterThan(0)
    }
  })

  it('maps category keys accurately', () => {
    expect(CATEGORY_MAP.get('math-functions')?.glyph).toBe('∫')
    expect(CATEGORY_MAP.get('physics-quantum')?.glyph).toBe('Ψ')
    expect(CATEGORY_MAP.get('cs-algorithms')?.glyph).toBe('λ')
    expect(CATEGORY_MAP.get('distributed-systems')?.glyph).toBe('⚡')
    expect(CATEGORY_MAP.get('rf-electronics')?.glyph).toBe('∿')
  })

  it('contains 5 items per batch in default configs totaling 25 curated vectors', () => {
    const batches = getVectorBatches()
    expect(batches).toHaveLength(5)

    const allVectors = getAllVectors()
    expect(allVectors).toHaveLength(25)

    // Verify each vector item has required properties and file paths
    for (const v of allVectors) {
      expect(v.id).toBeDefined()
      expect(v.name).toBeDefined()
      expect(v.semantic_role).toBeDefined()
      expect(v.description).toBeDefined()
      expect(v.generation_prompt).toBeDefined()
      expect(v.svgPath).toMatch(/^\/vectors\/[\w-]+\/[\w-]+\.svg$/)
      expect(v.pngPath).toMatch(/^\/vectors\/[\w-]+\/[\w-]+\.png$/)
      expect(v.desired_formats).toContain('svg')
      expect(v.desired_formats).toContain('png')
    }
  })

  it('resolves every advertised vector to a shipped SVG and PNG asset', () => {
    for (const vector of getAllVectors()) {
      const svg = readFileSync(new URL(`../../public${vector.svgPath}`, import.meta.url), 'utf8')
      expect(svg, vector.svgPath).toContain('<svg')

      const png = readFileSync(new URL(`../../public${vector.pngPath}`, import.meta.url))
      expect(png.subarray(0, 8).toString('hex'), vector.pngPath).toBe('89504e470d0a1a0a')
    }
  })

  it('keeps vector identities aligned with the shipped generation manifests', () => {
    for (const batch of getVectorBatches()) {
      const manifest = JSON.parse(readFileSync(
        new URL(`../../public/vectors/${batch.id}/manifest.json`, import.meta.url), 'utf8',
      )) as { items: { id: string; filename_stem: string }[] }
      const identities = (items: { id: string; filename_stem: string }[]) =>
        items.map(({ id, filename_stem }) => ({ id, filename_stem }))

      expect(identities(batch.items), batch.id).toEqual(identities(manifest.items))
    }
  })

  it('maintains grid index ordering 0 to 4 in each batch', () => {
    const batches = getVectorBatches()
    for (const batch of batches) {
      expect(batch.items).toHaveLength(5)
      const indices = batch.items.map((item) => item.grid_index)
      expect(indices).toEqual([0, 1, 2, 3, 4])
    }
  })
})
