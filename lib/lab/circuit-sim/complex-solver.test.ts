import { describe, it, expect } from 'vitest'
import { cluSolve, cadd, csub, cmul, cdiv } from './complex-solver'

describe('complex helpers', () => {
  it('adds complex numbers', () => {
    expect(cadd(1, 2, 3, 4)).toEqual([4, 6])
  })

  it('subtracts complex numbers', () => {
    expect(csub(5, 6, 1, 2)).toEqual([4, 4])
  })

  it('multiplies complex numbers', () => {
    // (1+2j)(3+4j) = 3 + 4j + 6j + 8j^2 = -5 + 10j
    expect(cmul(1, 2, 3, 4)).toEqual([-5, 10])
  })

  it('divides complex numbers', () => {
    // (3+4j)/(1+2j) = 2.2 - 0.4j
    const [re, im] = cdiv(3, 4, 1, 2)
    expect(re).toBeCloseTo(2.2, 12)
    expect(im).toBeCloseTo(-0.4, 12)
  })
})

describe('cluSolve', () => {
  it('solves scalar n=1: (1+2j) x = (3+4j)', () => {
    const n = 1
    // A = [[1+2j]]  → length 2*1*1
    const A = new Float64Array([1, 2])
    // b = [3+4j]    → length 2*1
    const b = new Float64Array([3, 4])
    const x = cluSolve(n, A, b)
    expect(x).not.toBeNull()
    // x = (3+4j)/(1+2j) = 11/5 + (-2/5)j = 2.2 - 0.4j
    expect(x![0]).toBeCloseTo(2.2, 6)
    expect(x![1]).toBeCloseTo(-0.4, 6)
  })

  it('solves a 2x2 complex system (hand-verified)', () => {
    // A = [[1+1j, 2+0j], [3+0j, 4-1j]]
    // b = [5+1j, 6+2j]
    // numpy solution: x0 = -2.4 - 2.2j, x1 = 2.6 + 2.8j
    const n = 2
    const A = new Float64Array([
      1, 1, 2, 0, // row 0: (1+1j) (2+0j)
      3, 0, 4, -1, // row 1: (3+0j) (4-1j)
    ])
    const b = new Float64Array([5, 1, 6, 2])
    const x = cluSolve(n, A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(-2.4, 6) // x0 real
    expect(x![1]).toBeCloseTo(-2.2, 6) // x0 imag
    expect(x![2]).toBeCloseTo(2.6, 6) // x1 real
    expect(x![3]).toBeCloseTo(2.8, 6) // x1 imag
  })

  it('verifies the 2x2 solution satisfies A x = b', () => {
    const n = 2
    const A = new Float64Array([1, 1, 2, 0, 3, 0, 4, -1])
    const b = new Float64Array([5, 1, 6, 2])
    // keep a copy of A since cluSolve mutates in place
    const Acopy = A.slice()
    const x = cluSolve(n, A, b)!
    // compute Acopy * x and compare to b
    for (let r = 0; r < n; r++) {
      let re = 0
      let im = 0
      for (let c = 0; c < n; c++) {
        const ar = Acopy[(r * n + c) * 2]
        const ai = Acopy[(r * n + c) * 2 + 1]
        const xr = x[c * 2]
        const xi = x[c * 2 + 1]
        re += ar * xr - ai * xi
        im += ar * xi + ai * xr
      }
      expect(re).toBeCloseTo(b[r * 2], 6)
      expect(im).toBeCloseTo(b[r * 2 + 1], 6)
    }
  })

  it('requires partial pivoting: zero pivot in first position', () => {
    // A = [[0, 1+0j], [1+0j, 0]] → swap rows needed.
    // b = [2+0j, 3+0j] → x0 = 3, x1 = 2
    const n = 2
    const A = new Float64Array([
      0, 0, 1, 0,
      1, 0, 0, 0,
    ])
    const b = new Float64Array([2, 0, 3, 0])
    const x = cluSolve(n, A, b)
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(3, 6)
    expect(x![1]).toBeCloseTo(0, 6)
    expect(x![2]).toBeCloseTo(2, 6)
    expect(x![3]).toBeCloseTo(0, 6)
  })

  it('returns null for a singular matrix', () => {
    // A = [[1+0j, 2+0j], [2+0j, 4+0j]] (second row = 2 * first) → singular
    const n = 2
    const A = new Float64Array([
      1, 0, 2, 0,
      2, 0, 4, 0,
    ])
    const b = new Float64Array([1, 0, 2, 0])
    expect(cluSolve(n, A, b)).toBeNull()
  })

  it('returns null for a complex singular matrix', () => {
    // row1 = (1+1j) * row0 → singular
    const n = 2
    const A = new Float64Array([
      1, 0, 0, 1, // (1+0j) (0+1j)
      1, 1, -1, 1, // (1+1j)*(1) , (1+1j)*(0+1j) = (-1+1j)
    ])
    const b = new Float64Array([1, 0, 1, 1])
    expect(cluSolve(n, A, b)).toBeNull()
  })
})
