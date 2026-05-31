import { describe, it, expect } from 'vitest'
import { encodeParams, decodeParams } from './url-params'
import type { ControlSpec } from './types'

const specs: ControlSpec[] = [
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 2, step: 0.1 },
  { key: 'glow', label: 'Glow', type: 'toggle' },
  { key: 'color', label: 'Color', type: 'color' },
  { key: 'mode', label: 'Mode', type: 'select', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
]
const defaults = { speed: 1, glow: true, color: '#00e0b8', mode: 'a' }

describe('url-params', () => {
  it('round-trips encode → decode', () => {
    const p = { speed: 1.5, glow: false, color: '#ff7a59', mode: 'b' }
    expect(decodeParams(encodeParams(p), defaults, specs)).toEqual(p)
  })
  it('falls back to defaults for absent keys', () => {
    expect(decodeParams('speed=0.5', defaults, specs)).toEqual({ ...defaults, speed: 0.5 })
  })
  it('clamps out-of-range ranges', () => {
    expect(decodeParams('speed=99', defaults, specs).speed).toBe(2)
    expect(decodeParams('speed=-5', defaults, specs).speed).toBe(0)
  })
  it('rejects invalid color / select, keeps default', () => {
    expect(decodeParams('color=notacolor&mode=z', defaults, specs)).toEqual(defaults)
  })
  it('ignores unknown keys', () => {
    expect(decodeParams('bogus=1', defaults, specs)).toEqual(defaults)
  })
})
