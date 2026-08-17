import { describe, it, expect } from 'vitest'

import {
  contentAddress,
  contentAddressedName,
  parseContentAddress,
  sha256Hex,
  verifyContentAddress,
  CONTENT_ADDRESS_CHARS,
} from './content-address'

describe('contentAddress', () => {
  it('is the first 16 hex chars of the SHA-256 of the bytes', () => {
    // The well-known digest of "abc" — pinned so a future "improvement" to the
    // hash silently orphaning every stored spill/artifact name is a test
    // failure rather than a mystery.
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
    expect(contentAddress('abc')).toBe('ba7816bf8f01cfea')
    expect(contentAddress('abc')).toHaveLength(CONTENT_ADDRESS_CHARS)
  })

  it('addresses a Buffer and its string form identically', () => {
    expect(contentAddress(Buffer.from('<h1>hi</h1>', 'utf8'))).toBe(contentAddress('<h1>hi</h1>'))
  })

  it('separates different bytes', () => {
    expect(contentAddress('a')).not.toBe(contentAddress('b'))
  })
})

describe('contentAddressedName / parseContentAddress', () => {
  it('round-trips a name through its address', () => {
    const name = contentAddressedName('abc', '.html')
    expect(name).toBe('ba7816bf8f01cfea.html')
    expect(parseContentAddress(name)).toBe('ba7816bf8f01cfea')
  })

  it('returns undefined for a name that is not content-addressed', () => {
    // The legacy run-scoped names, which must SKIP rather than fail the
    // integrity check when an old sweep tree is still on disk.
    expect(parseContentAddress('artifact-deepseek-v4-flash-free-equation-solver-0.html')).toBeUndefined()
    expect(parseContentAddress('index.json')).toBeUndefined()
    // Right length, wrong alphabet.
    expect(parseContentAddress('zzzzzzzzzzzzzzzz.html')).toBeUndefined()
    // Right alphabet, wrong length.
    expect(parseContentAddress('ba7816bf.html')).toBeUndefined()
  })

  it('accepts a nested ref (the run log stores `spill/<hash>.txt`)', () => {
    expect(parseContentAddress('spill/ba7816bf8f01cfea.txt')).toBe('ba7816bf8f01cfea')
  })
})

describe('verifyContentAddress', () => {
  it('passes when the bytes hash to the name', () => {
    expect(verifyContentAddress('spill/ba7816bf8f01cfea.txt', 'abc')).toEqual({
      ok: true,
      expected: 'ba7816bf8f01cfea',
      actual: 'ba7816bf8f01cfea',
    })
  })

  it('fails when a byte is flipped', () => {
    const result = verifyContentAddress('spill/ba7816bf8f01cfea.txt', 'abd')
    expect(result?.ok).toBe(false)
    expect(result?.expected).toBe('ba7816bf8f01cfea')
    expect(result?.actual).not.toBe('ba7816bf8f01cfea')
  })

  it('returns undefined for a name that carries no address to check', () => {
    expect(verifyContentAddress('artifact-test-t-0.html', 'anything')).toBeUndefined()
  })
})
