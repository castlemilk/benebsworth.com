// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { VECTOR_CATEGORIES, getAllVectors, getVectorBatches } from '@/lib/vectors/registry'
import { VectorGalleryView, filterVectors } from './vector-gallery-view'

vi.mock('@/components/vectors/vector-studio-modal', () => ({
  VectorStudioModal: ({ item }: { item: { name: string } | null }) => <div data-studio={item?.name ?? ''} />,
}))

const allVectors = getAllVectors()
const batches = getVectorBatches()
afterEach(cleanup)

function renderGallery() {
  return render(<VectorGalleryView batches={batches} allVectors={allVectors} />)
}
const cards = () => document.querySelectorAll('[data-vector-card]')
const count = () => document.querySelector('[data-vector-count]')!.textContent ?? ''

describe('filterVectors', () => {
  it('intersects category and query across name, role, description, category and prompt', () => {
    expect(filterVectors(allVectors, 'all', '')).toHaveLength(allVectors.length)
    for (const category of VECTOR_CATEGORIES) {
      const inCategory = filterVectors(allVectors, category.key, '')
      expect(inCategory.length).toBeGreaterThan(0)
      expect(inCategory.every((item) => item.categoryKey === category.key)).toBe(true)
    }
    const first = allVectors[0]
    expect(filterVectors(allVectors, first.categoryKey, first.name.toUpperCase())).toContainEqual(first)
    expect(filterVectors(allVectors, 'all', first.semantic_role)).toContainEqual(first)
    expect(filterVectors(allVectors, 'all', '   ')).toHaveLength(allVectors.length)
    expect(filterVectors(allVectors, 'all', 'zzzz-no-such-vector')).toHaveLength(0)
  })
})

describe('VectorGalleryView', () => {
  it('announces the count and narrows by category toggle with a visible pressed state', () => {
    renderGallery()
    expect(count()).toContain(`Showing ${allVectors.length} of ${allVectors.length} vectors.`)
    const filters = within(screen.getByRole('group', { name: 'Filter by category' }))
    expect(filters.getByRole('button', { name: /^All/ }).getAttribute('aria-pressed')).toBe('true')
    const category = VECTOR_CATEGORIES[1]
    fireEvent.click(filters.getByRole('button', { name: new RegExp(category.label) }))
    const expected = allVectors.filter((item) => item.categoryKey === category.key).length
    expect(cards()).toHaveLength(expected)
    expect(count()).toContain(`Showing ${expected} of ${allVectors.length} vectors in ${category.label}.`)
    expect(count()).toContain(category.description)
    expect(filters.getByRole('button', { name: new RegExp(category.label) }).getAttribute('aria-pressed')).toBe('true')
    expect(filters.getByRole('button', { name: /^All/ }).getAttribute('aria-pressed')).toBe('false')
  })

  it('combines search with the category, recovers from no results and returns focus to the field', () => {
    renderGallery()
    const search = screen.getByRole('textbox', { name: 'Search vectors' })
    const category = VECTOR_CATEGORIES[0]
    fireEvent.click(screen.getByRole('button', { name: new RegExp(category.label) }))
    const target = allVectors.find((item) => item.categoryKey === category.key)!
    fireEvent.change(search, { target: { value: target.name } })
    expect(cards()).toHaveLength(filterVectors(allVectors, category.key, target.name).length)
    expect(count()).toContain(`in ${category.label} matching “${target.name}”`)

    fireEvent.change(search, { target: { value: 'quasar' } })
    expect(cards()).toHaveLength(0)
    const empty = document.querySelector('[data-vector-empty]')!
    expect(empty.textContent).toContain(`Nothing in ${category.label} matching “quasar”.`)
    fireEvent.click(within(empty as HTMLElement).getByRole('button', { name: 'Clear search and filters' }))
    expect(cards()).toHaveLength(allVectors.length)
    expect((search as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(search)
    expect(screen.getByRole('button', { name: /^All/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('clears only the query from the field and keeps focus there', () => {
    renderGallery()
    const search = screen.getByRole('textbox', { name: 'Search vectors' })
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    fireEvent.change(search, { target: { value: 'wave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect((search as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(search)
    expect(cards()).toHaveLength(allVectors.length)
  })

  it('switches matte and size as pressed toggles and opens inspection from a card', () => {
    renderGallery()
    const matte = within(screen.getByRole('group', { name: 'Matte' }))
    fireEvent.click(matte.getByRole('button', { name: 'Light' }))
    expect(matte.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe('true')
    expect(matte.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')).toBe('false')
    const size = within(screen.getByRole('group', { name: 'Size' }))
    fireEvent.click(size.getByRole('button', { name: 'S' }))
    expect(size.getByRole('button', { name: 'S' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: `Inspect ${allVectors[0].name}` }))
    expect(document.querySelector('[data-studio]')!.getAttribute('data-studio')).toBe(allVectors[0].name)
  })
})
