// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { ArtworkCollection } from './collection'
import { ARTWORK } from '@/lib/editorial-artwork/registry'
import { GenerativeGallery } from '../generative-svg/gallery'

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/vectors/') })
it('server-renders real images, anchor targets and original PNG download names', () => {
  expect(renderToString(<ArtworkCollection />)).toContain('Editorial artwork')
  render(<ArtworkCollection />)
  for (const asset of ARTWORK) {
    const img = screen.getByAltText(asset.alt)
    expect(img.getAttribute('src')).toBe(asset.src)
    expect(img.getAttribute('loading')).toBe('lazy')
    const link = screen.getByRole('link', { name: `Download ${asset.title} PNG` })
    expect(link.getAttribute('href')).toBe(asset.src)
    expect(link.getAttribute('download')).toBe(asset.src.split('/').pop())
    expect(document.getElementById(`artwork-${asset.id}`)).toBeTruthy()
    expect(screen.getByRole('link', { name: `Link to ${asset.title}` }).getAttribute('href')).toBe(`#artwork-${asset.id}`)
  }
  expect(screen.queryByRole('link', { name: 'Download SVG' })).toBeNull()
  expect(screen.getByText(/not editable SVGs/)).toBeTruthy()
})
it('intersects name/tag filters and recovers empty results to a focused input', () => {
  render(<ArtworkCollection />)
  fireEvent.change(screen.getByLabelText('Find artwork'), { target: { value: 'memory' } })
  expect(screen.getAllByRole('link', { name: /^Download .* PNG$/ })).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Artwork tag'), { target: { value: 'writing' } })
  expect(screen.getByRole('heading', { name: 'No matching artwork' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Show all artwork' }))
  expect(document.activeElement).toBe(screen.getByLabelText('Find artwork'))
  expect(screen.getAllByRole('link', { name: /^Download .* PNG$/ })).toHaveLength(ARTWORK.length)
})
it('changes the matte without altering images/downloads or SVG tuning', () => {
  render(<GenerativeGallery />)
  fireEvent.change(screen.getByLabelText('Amplitude'), { target: { value: '0.4' } })
  fireEvent.change(screen.getByLabelText('Line weight'), { target: { value: '3.7' } })
  const before = screen.getByRole('link', { name: 'Download SVG' }).getAttribute('href')
  fireEvent.change(screen.getByLabelText('Artwork preview surface'), { target: { value: 'dark' } })
  for (const asset of ARTWORK) {
    expect(screen.getByAltText(asset.alt).parentElement?.getAttribute('data-surface')).toBe('dark')
    expect(screen.getByAltText(asset.alt).getAttribute('src')).toBe(asset.src)
  }
  fireEvent.change(screen.getByLabelText('Find artwork'), { target: { value: 'missing' } })
  fireEvent.click(screen.getByRole('button', { name: 'Clear artwork filters' }))
  expect(screen.getByRole('link', { name: 'Download SVG' }).getAttribute('href')).toBe(before)
})
it('reveals a hidden native anchor on hash navigation and restores focus without touching SVG parameters', () => {
  render(<GenerativeGallery />)
  fireEvent.change(screen.getByLabelText('Amplitude'), { target: { value: '0.4' } })
  const svg = screen.getByRole('link', { name: 'Download SVG' }).getAttribute('href')
  fireEvent.change(screen.getByLabelText('Find artwork'), { target: { value: 'no-match' } })
  const target = document.getElementById(`artwork-${ARTWORK[0].id}`)!
  expect(target.hidden).toBe(true)
  window.history.replaceState(null, '', `/vectors/#artwork-${ARTWORK[0].id}`)
  fireEvent(window, new HashChangeEvent('hashchange'))
  expect(target.hidden).toBe(false)
  expect(document.activeElement).toBe(target)
  expect(screen.getByRole('link', { name: 'Download SVG' }).getAttribute('href')).toBe(svg)
})
