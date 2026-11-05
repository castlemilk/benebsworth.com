// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { hikes } from '@/content/hiking'
import { hikeImagery } from '@/content/hiking-imagery'
import { HikeCover } from './hike-cover'
import { HikeCard } from './hike-card'
import type { Asset } from '@/lib/gen/content'
import { JourneyMap } from './journey-map'
import { HikeGallery } from './hike-gallery'
import { project, smoothPath } from './journey-core'
import HikePage from '@/app/hiking/[slug]/page'

vi.mock('@/components/site/site-nav', () => ({ SiteNav: () => <nav /> }))
vi.mock('@/components/site/site-footer', () => ({ SiteFooter: () => <footer /> }))
vi.mock('@/components/motion/reveal', () => ({ Reveal: ({children}: {children:React.ReactNode}) => <>{children}</> }))
vi.mock('@/components/hiking/hike-journey', () => ({ HikeJourney: ({hike}: {hike:{slug:string}}) => <div data-journey={hike.slug} /> }))

beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function doc(element: React.ReactNode) { return new DOMParser().parseFromString(renderToStaticMarkup(element), 'text/html') }

describe('consistent hiking image family', () => {
  it.each(hikes)('retains $slug image identity, reserved geometry and separate schematic route', hike => {
    const cover = doc(<HikeCover hike={hike} />)
    const media = hikeImagery(hike)
    const img = cover.querySelector('img')!
    expect(img.getAttribute('src')).toBe(media.src)
    expect(img.getAttribute('alt')).toBe(media.alt)
    expect(img.getAttribute('width')).toBe(String(media.width))
    expect(img.getAttribute('height')).toBe(String(media.height))
    expect(cover.querySelector('figcaption')?.textContent).toContain(media.caption)
    expect(cover.querySelector('figcaption svg path')?.getAttribute('d')).toBe(smoothPath(hike.waypoints.map(project)))
    expect(img.parentElement?.querySelector('svg')).toBeNull()
    expect(media.kind).toBe(['haute-route', 'overland-track'].includes(hike.slug) ? 'photograph' : 'illustration')
    expect(doc(<HikeCard hike={hike} />).querySelector('img')?.getAttribute('src')).toBe(media.src)
  })

  it.each(hikes)('uses the same verified cover on the $slug detail page without altering the journey', async hike => {
    const detail = doc(await HikePage({params:Promise.resolve({slug:hike.slug})}))
    expect(detail.querySelector('main')?.getAttribute('data-hiking-page')).toBe('detail')
    expect(detail.querySelector('.hand-underline, .annotated-block, .handwritten-note')).toBeNull()
    expect(detail.querySelector('[data-hike-cover] img')?.getAttribute('src')).toBe(hikeImagery(hike).src)
    expect(detail.querySelector('[data-hike-cover] img')?.getAttribute('loading')).toBe('eager')
    expect(detail.querySelector('h1')?.textContent).toBe(hike.name)
    expect(detail.querySelector('h2')?.textContent).toBe(hike.status === 'planned' ? 'Planned route' : 'The journey')
    expect(detail.querySelector('[data-journey]')?.getAttribute('data-journey')).toBe(hike.slug)
    expect([...detail.querySelectorAll('a')].some(link => link.getAttribute('href')?.replace(/\/$/, '') === '/hiking')).toBe(true)
  })

  it('falls back from a failed photograph to the retained illustration, then an honest empty state', () => {
    const hike = hikes.find(hike => hike.slug === 'haute-route')!
    render(<HikeCover hike={hike} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img').getAttribute('src')).toBe(hike.hero)
    expect(screen.getByRole('img').getAttribute('alt')).toBe(`Illustration of ${hike.name}`)
    expect(screen.getByText('Trail illustration')).toBeTruthy()
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('Image unavailable').length).toBeGreaterThan(0)
  })

  it('keeps guide thumbnails compact while preserving honest alternative text', () => {
    const html = doc(<HikeCover hike={hikes[0]} compact />)
    expect(html.querySelector('figcaption')).toBeNull()
    expect(html.querySelector('img')?.getAttribute('sizes')).toBe('128px')
    expect(html.querySelector('img')?.getAttribute('alt')).toContain('Illustration')
  })

  it.each([hikes[0], hikes.find(hike => hike.status === 'planned')!])('does not fabricate photo tiles for empty $status galleries', hike => {
    const gallery = doc(<HikeGallery hike={hike} gallery={[]} active={null} onSelect={() => {}} />)
    expect(gallery.querySelectorAll('img, button')).toHaveLength(0)
    expect(gallery.querySelector('h3')?.textContent).toBe('Gallery')
    expect(gallery.body.textContent).toContain(hike.status === 'planned' ? 'This walk is still planned.' : 'No gallery photographs are available to display.')
  })
  it('labels the existing route and profile as schematic in every context', () => {
    for (const compact of [false, true]) {
      const map = doc(<JourneyMap hike={hikes[0]} compact={compact} />)
      expect(map.querySelector('figcaption')?.textContent).toContain('Route shape and elevation spacing are illustrative, not geographic. Not for navigation.')
    }
  })

  it('preserves real gallery ordering, waypoint filtering, keyboard navigation and close focus', () => {
    const gallery: Asset[] = [0, 1].map(i => ({id:String(i),url:`/photo-${i}.webp`,thumb:`/thumb-${i}.webp`,alt:`Trail photo ${i}`,caption:`Caption ${i}`,width:1200,height:900,slot:i ? 'Second stop' : 'First stop',lat:0,lng:0,takenAt:''}))
    const onSelect = vi.fn()
    const view = render(<HikeGallery hike={hikes[0]} gallery={gallery} active={null} onSelect={onSelect} />)
    const opener = screen.getByRole('button', {name:'Trail photo 0'})
    act(() => opener.focus())
    fireEvent.click(opener)
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 1 of 2')
    fireEvent.keyDown(screen.getByRole('dialog'), {key:'ArrowRight'})
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 2 of 2')
    fireEvent.keyDown(screen.getByRole('dialog'), {key:'Escape'})
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
    view.rerender(<HikeGallery hike={hikes[0]} gallery={gallery} active="Second stop" onSelect={onSelect} />)
    expect(screen.queryByRole('button', {name:'Trail photo 0'})).toBeNull()
    expect(screen.getByRole('button', {name:'Trail photo 1'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name:'Second stop ✕'}))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

})
