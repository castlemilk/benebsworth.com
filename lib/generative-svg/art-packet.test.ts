import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { prepareArtPacket, verifyArtPacket, writeArtPacket } from '../../scripts/lib/svg-art-packet'

const input = { version: 1, batch_id: 'bespoke-proof', revision: 1, artworks: [{ study: 'offset-portal', parameters: { arrangement: 3 } }, { study: 'wind-cut-branch', appearance: { weight: 4 } }] }
describe('reproducible art factory input', () => {
  it('exports distinct artwork identities with four deterministic surface recipes each', () => {
    const packet = prepareArtPacket(input)
    expect(prepareArtPacket(input)).toEqual(packet)
    expect(packet.manifest.artworks).toHaveLength(2)
    expect(Object.keys(packet.files)).toHaveLength(9)
    for (const artwork of packet.manifest.artworks) {
      expect(artwork.provenance).toBe('illustrative')
      expect(artwork.minimum_display_width).toBe(160)
      expect(Object.keys(artwork.files)).toEqual(['light', 'dark', 'mono', 'mono-dark'])
      expect(Object.values(artwork.sha256).every(hash => /^[a-f0-9]{64}$/.test(hash))).toBe(true)
      expect(artwork).not.toHaveProperty('visual_approved')
      for (const file of Object.values(artwork.files)) {
        expect(packet.files[file]).toContain('<metadata>')
        expect(artwork.sha256[file]).toBe(createHash('sha256').update(packet.files[file]).digest('hex'))
      }
    }
  })
  it('keeps chosen custom inks in light and dark exports and uses real monochrome variants', () => {
    const packet = prepareArtPacket({ ...input, artworks: [{ study: 'offset-portal', appearance: { palette: 'custom', inkColor: '#123456', accentColor: '#AbCdEf' } }] })
    for (const mode of ['light', 'dark']) {
      expect(packet.files[`offset-portal-${mode}.svg`]).toContain('fill="#123456"')
      expect(packet.files[`offset-portal-${mode}.svg`]).toContain('fill="#abcdef"')
    }
    expect(packet.files['offset-portal-mono.svg']).not.toContain('fill="#abcdef"')
  })
  it.each([null, [], {}, { ...input, version: 2 }, { ...input, revision: 0 }, { ...input, revision: 1.5 }, { ...input, batch_id: '../escape' }, { ...input, extra: true }, { ...input, artworks: [] }, { ...input, artworks: new Array(41).fill(input.artworks[0]) }, { ...input, artworks: [input.artworks[0], input.artworks[0]] }, { ...input, artworks: [{ study: 'sine-wave' }] }, { ...input, artworks: [{ study: 'missing' }] }, { ...input, artworks: [{ study: 'offset-portal', parameters: { arrangement: 4 } }] }, { ...input, artworks: [{ study: 'offset-portal', appearance: { weight: 999 } }] }, { ...input, artworks: [{ study: 'offset-portal', appearance: { inkColor: 'url(evil)' } }] }, { ...input, artworks: [{ study: 'offset-portal', approved: true }] }])('rejects malformed or non-artistic recipes before writing %j', value => {
    expect(() => prepareArtPacket(value)).toThrow()
  })
  it('writes complete packet once and refuses a repeat rather than overwrite evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'svg-art-packet-'))
    try {
      const path = await writeArtPacket(input, root)
      expect(JSON.parse(await readFile(join(path, 'batch.json'), 'utf8'))).toEqual(prepareArtPacket(input).manifest)
      await expect(verifyArtPacket(input, path)).resolves.toBeUndefined()
      const before = await readFile(join(path, 'offset-portal-light.svg'), 'utf8')
      await expect(writeArtPacket({ ...input, artworks: [{ study: 'offset-portal', parameters: { arrangement: 1 } }] }, root)).rejects.toThrow()
      expect(await readFile(join(path, 'offset-portal-light.svg'), 'utf8')).toBe(before)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})

describe('packet receipt verification', () => {
  it.each(['changed-svg', 'changed-recipe', 'changed-hash', 'missing-file', 'extra-file'])('rejects %s independently of declared metadata', async mutation => {
    const root = await mkdtemp(join(tmpdir(), 'svg-art-receipt-'))
    try {
      const path = await writeArtPacket(input, root)
      if (mutation === 'changed-svg') await writeFile(join(path, 'offset-portal-light.svg'), '<svg/>')
      else if (mutation === 'missing-file') await unlink(join(path, 'offset-portal-light.svg'))
      else if (mutation === 'extra-file') await writeFile(join(path, 'extra.svg'), '<svg/>')
      else {
        const manifest = JSON.parse(await readFile(join(path, 'batch.json'), 'utf8'))
        if (mutation === 'changed-recipe') manifest.artworks[0].recipe.parameters.arrangement = 1
        else manifest.artworks[0].sha256['offset-portal-light.svg'] = '0'.repeat(64)
        await writeFile(join(path, 'batch.json'), JSON.stringify(manifest, null, 2) + '\n')
      }
      await expect(verifyArtPacket(input, path)).rejects.toThrow()
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
