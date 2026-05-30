import { describe, it, expect } from 'vitest'
import { pack, type Placement } from './packer'

const WORDS = [
  { key: 'blog', text: 'BLOG' },
  { key: 'project', text: 'PROJECT' },
  { key: 'about', text: 'ABOUT' },
]

function isMonotone(cells: [number, number][]) {
  for (let i = 1; i < cells.length; i++) {
    const [pc, pr] = cells[i - 1]
    const [c, r] = cells[i]
    const right = c === pc + 1 && r === pr
    const down = r === pr + 1 && c === pc
    if (!right && !down) return false
  }
  return true
}

function allCells(p: Placement) {
  return Object.values(p).flat()
}

describe('pack', () => {
  for (const [cols, rows] of [[5, 4], [4, 5]] as const) {
    it(`packs ${cols}x${rows} with monotone, disjoint, in-bounds paths`, () => {
      const p = pack(cols, rows, WORDS, 123)
      expect(p).not.toBeNull()
      const placement = p!
      // length matches each word
      for (const w of WORDS) expect(placement[w.key].length).toBe(w.text.length)
      // monotone
      for (const w of WORDS) expect(isMonotone(placement[w.key])).toBe(true)
      // in bounds
      for (const [c, r] of allCells(placement)) {
        expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(cols)
        expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(rows)
      }
      // disjoint
      const seen = new Set(allCells(placement).map(([c, r]) => `${c},${r}`))
      expect(seen.size).toBe(16)
    })
  }

  it('is deterministic for a given seed', () => {
    expect(pack(5, 4, WORDS, 7)).toEqual(pack(5, 4, WORDS, 7))
  })
})
