import { describe, expect, it } from 'vitest'
import { ARTISTIC_OBJECTS } from './artistic-objects'
import { ARTISTIC_PLACES } from './artistic-places'
import { STUDY_REGISTRY } from './model'
import { searchStudies, studySearchRecords } from './registry'
import { prepareArtPacket } from '../../scripts/lib/svg-art-packet'

const subjects = [...ARTISTIC_OBJECTS, ...ARTISTIC_PLACES]

describe('authored objects and imagined places integration', () => {
  it('adds six distinct subjects without counting palette variants as artworks', () => {
    expect(subjects.map(s => s.id)).toEqual(['index-cabinet', 'signal-lantern', 'mosaic-carafe', 'scalloped-fan', 'winding-quarter', 'harbour-rigging'])
    expect(new Set(subjects.map(s => s.id)).size).toBe(6)
    for (const subject of subjects) {
      expect(STUDY_REGISTRY.get(subject.id)).toEqual(subject)
      expect(subject.category).toBe('Illustration')
      expect(subject.provenance).toBe('illustrative')
      expect(subject.parameters).toHaveLength(0)
    }
  })

  it.each(subjects)('discovers $id by curated names and aliases without indexing its caveats', subject => {
    for (const query of [subject.title, subject.id, ...subject.aliases]) expect(searchStudies(STUDY_REGISTRY, query)).toContainEqual(subject)
    for (const tag of subject.tags) expect(searchStudies(STUDY_REGISTRY, '', { category: 'Illustration', tag })).toContainEqual(subject)
    const record = studySearchRecords(STUDY_REGISTRY).find(r => r.url.endsWith(`=${subject.id}`))!
    expect(record.content).not.toContain(subject.basis)
    expect(record.meta.kind).toBe('SVG study')
  })

  it('uses the existing immutable factory without a second renderer or manual manifests', () => {
    const input = { version: 1, batch_id: 'objects-and-places', revision: 1, artworks: subjects.map(s => ({ study: s.id })) }
    const packet = prepareArtPacket(input)
    expect(prepareArtPacket(input)).toEqual(packet)
    expect(packet.manifest.artworks.map(a => a.id)).toEqual(subjects.map(s => s.id))
    expect(packet.manifest.artworks.map(a => a.style)).toEqual(['intaglio-object', 'intaglio-object', 'inlaid-ornament', 'inlaid-ornament', 'imagined-place', 'imagined-place'])
    expect(Object.keys(packet.files)).toHaveLength(25)
    for (const artwork of packet.manifest.artworks) {
      expect(artwork.provenance).toBe('illustrative')
      expect(Object.keys(artwork.files)).toEqual(['light', 'dark', 'mono', 'mono-dark'])
      expect(artwork.recipe.parameters).toEqual({})
      expect(artwork).not.toHaveProperty('visual_approved')
    }
  })
})
