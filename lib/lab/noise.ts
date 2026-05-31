/** Tiny deterministic 2D value noise in [-1,1]. No deps. */
export function makeNoise2D(seed: number): (x: number, y: number) => number {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
    h = (h ^ (h >>> 13)) * 1274126177
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295 // [0,1)
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y)
    const fx = smooth(x - x0), fy = smooth(y - y0)
    const v00 = hash(x0, y0), v10 = hash(x0 + 1, y0)
    const v01 = hash(x0, y0 + 1), v11 = hash(x0 + 1, y0 + 1)
    const top = lerp(v00, v10, fx), bot = lerp(v01, v11, fx)
    return lerp(top, bot, fy) * 2 - 1
  }
}
