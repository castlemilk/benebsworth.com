import { mulberry32, shuffle } from './rng'

export type Cell = [number, number]
export type Word = { key: string; text: string }
export type Placement = Record<string, Cell[]>

const key = (c: number, r: number) => `${c},${r}`

/**
 * Pack words into a cols×rows grid. Each word occupies a contiguous monotone
 * path (each step right or down only). Words are disjoint; gaps allowed.
 * Largest word is placed first to improve packing success. Returns null if no
 * packing is found. Deterministic for a given seed.
 */
export function pack(cols: number, rows: number, words: Word[], seed: number): Placement | null {
  const rng = mulberry32(seed)
  const order = [...words].sort((a, b) => b.text.length - a.text.length)
  const occ = new Set<string>()
  const place: Placement = {}

  function put(wi: number): boolean {
    if (wi === order.length) return true
    const len = order[wi].text.length
    const starts: Cell[] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if (!occ.has(key(c, r))) starts.push([c, r])

    for (const st of shuffle(starts, rng)) {
      const path: Cell[] = []
      const ext = (c: number, r: number): boolean => {
        path.push([c, r]); occ.add(key(c, r))
        if (path.length === len) {
          if (put(wi + 1)) { place[order[wi].key] = path.slice(); return true }
        } else {
          for (const [dc, dr] of shuffle([[1, 0], [0, 1]] as Cell[], rng)) {
            const nc = c + dc, nr = r + dr
            if (nc < cols && nr < rows && !occ.has(key(nc, nr)) && ext(nc, nr)) return true
          }
        }
        path.pop(); occ.delete(key(c, r)); return false
      }
      if (ext(st[0], st[1])) return true
    }
    return false
  }

  return put(0) ? place : null
}
