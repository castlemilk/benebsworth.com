// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LibraryList, type LearningEntry } from './library-list'

const entries: LearningEntry[] = [
  { id: 'book', title: 'Machine Learning Systems', creator: 'Reddi', description: 'Chapter notes', type: 'Book', image: '/learning/ml-systems.webp', href: '/learning/ml-systems/', detail: '9 packets' },
  { id: 'research', title: 'Kolibri', creator: 'Aleph Alpha', description: 'Sparse model', type: 'Research', href: '/study/research/kolibri/', detail: 'Study packet' },
]
afterEach(cleanup)
describe('learning library', () => {
  it('searches content, combines filters, and recovers from no results', () => {
    render(<LibraryList entries={entries} />)
    const book = screen.getByRole('link', { name: /Machine Learning Systems/ })
    expect(book.getAttribute('href')).toBe('/learning/ml-systems')
    expect(book.querySelector('img')?.getAttribute('src')).toBe('/learning/ml-systems.webp')
    expect(book.querySelector('img')?.getAttribute('alt')).toBe('')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the library' }), { target: { value: 'sparse' } })
    expect(screen.getByRole('link', { name: /Kolibri/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Machine Learning Systems/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Books' }))
    expect(screen.getByText('No entries match your search.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
  })
})
