// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LibraryPage, { metadata as libraryMetadata } from './page'
import OriginalsPage, { metadata as archiveMetadata } from './originals/page'
import { getAllVectors, getVectorBatches } from '@/lib/vectors/registry'
import { STUDIES } from '@/lib/generative-svg/model'
import { GROUNDED_ARTWORK, groundedArtworkUrl } from '@/lib/grounded-artwork/registry'
import { ARTWORK } from '@/lib/editorial-artwork/registry'
import { SITE_URL } from '@/components/seo/json-ld'

vi.mock('@/components/site/site-nav', () => ({ SiteNav: () => <nav aria-label="Site" /> }))
vi.mock('@/components/site/site-footer', () => ({ SiteFooter: () => <footer /> }))
// Components retain their own full interaction tests. Pin the archive's wiring here.
vi.mock('@/components/vectors/vector-gallery-view', () => ({ VectorGalleryView: (props: object) => <div data-original-gallery={JSON.stringify(props)} /> }))
const render = (Page: () => React.JSX.Element) => new DOMParser().parseFromString(renderToStaticMarkup(<Page />), 'text/html')
const structured = (doc: Document) => JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!) as Record<string, unknown>[]

describe('SVG library and preserved original gallery routes', () => {
  it('keeps the current library, tuning, PNG downloads and discoverable archive together', () => {
    const doc = render(LibraryPage)
    expect(doc.querySelectorAll('main')).toHaveLength(1)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(libraryMetadata.alternates?.canonical).toBe('/vectors/')
    expect(libraryMetadata.openGraph).toMatchObject({ url: '/vectors/' })
    expect(doc.querySelector('a[href="/vectors/originals/"]')?.textContent).toBe('Original vectors')
    expect(doc.querySelector('a[href="/vectors/grounded/"],a[href="/vectors/grounded"]')).toBeTruthy()
    expect(doc.querySelector('input[type="range"]')).toBeTruthy()
    expect(doc.querySelector('a[download="sine-wave.svg"]')).toBeTruthy()
    for (const asset of ARTWORK) expect(doc.querySelector(`a[download="${asset.id}-v1.png"]`)).toBeTruthy()
    const collection = structured(doc).find(item => item['@type'] === 'CollectionPage')!
    for (const art of GROUNDED_ARTWORK) expect(JSON.stringify(collection)).toContain(`${SITE_URL}${groundedArtworkUrl(art)}`)
    expect(collection.url).toBe(`${SITE_URL}/vectors/`)
    expect((collection.mainEntity as { itemListElement: unknown[] }).itemListElement).toHaveLength(STUDIES.length + ARTWORK.length + GROUNDED_ARTWORK.length)
  })
  it('preserves original gallery inputs, source asset URLs and historical pipeline facts', () => {
    const doc = render(OriginalsPage)
    const props = JSON.parse(doc.querySelector('[data-original-gallery]')!.getAttribute('data-original-gallery')!)
    expect(props.batches).toEqual(getVectorBatches())
    expect(props.allVectors).toEqual(getAllVectors())
    expect(doc.querySelectorAll('main#main-content')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe('Original vectors')
    expect(doc.querySelector('a[href="/vectors/"]')).toBeTruthy()
    expect(doc.body.textContent).toContain('not mathematical models or validated scientific diagrams')
    expect(doc.body.textContent).toContain('historical pipeline notes')
    expect(doc.body.textContent).toContain('VTracer 0.6.4')
    expect(doc.body.textContent).not.toContain('production-ready')
    const collection = structured(doc).find(item => item['@type'] === 'CollectionPage')!
    const items = (collection.mainEntity as { itemListElement: { url: string }[] }).itemListElement
    expect(items.map(item => item.url)).toEqual(getAllVectors().map(asset => `${SITE_URL}${asset.svgPath}`))
    expect(items.every(item => !item.url.includes('/vectors/originals/'))).toBe(true)
  })
  it('uses a distinct archive canonical, OG URL and complete breadcrumbs', () => {
    const doc = render(OriginalsPage)
    expect(archiveMetadata.alternates?.canonical).toBe('/vectors/originals/')
    expect(archiveMetadata.openGraph).toMatchObject({ url: '/vectors/originals/' })
    expect(structured(doc).find(item => item['@type'] === 'CollectionPage')?.url).toBe(`${SITE_URL}/vectors/originals/`)
    expect(structured(doc).find(item => item['@type'] === 'BreadcrumbList')?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Asset library', item: `${SITE_URL}/vectors/` },
      { '@type': 'ListItem', position: 3, name: 'Original vectors', item: `${SITE_URL}/vectors/originals/` },
    ])
  })
})
