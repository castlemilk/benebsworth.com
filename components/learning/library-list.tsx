'use client'

import { useState } from 'react'
import Link from 'next/link'
import './library-list.css'

export type LearningEntry = {
  id: string
  title: string
  creator: string
  description: string
  type: 'Book' | 'Course' | 'Research'
  href: string
  image?: string
  detail: string
}

const filters = ['All', 'Book', 'Course', 'Research'] as const
const filterLabels = { All: 'All', Book: 'Books', Course: 'Courses', Research: 'Research' } as const

export function LibraryList({ entries }: { entries: LearningEntry[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const results = entries.filter((entry) => {
    const haystack = `${entry.title} ${entry.creator} ${entry.description} ${entry.type}`.toLocaleLowerCase()
    return (filter === 'All' || entry.type === filter) && words.every((word) => haystack.includes(word))
  })

  return (
    <section className="learning-library" aria-label="Learning library">
      <div className="learning-controls">
        <label className="learning-search">
          <span>Search the library</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, author or topic" />
        </label>
        <fieldset className="learning-filters">
          <legend>Type</legend>
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{filterLabels[item]}</button>
          ))}
        </fieldset>
      </div>
      <p className="learning-count" aria-live="polite">{results.length} {results.length === 1 ? 'entry' : 'entries'}</p>
      {results.length ? (
        <ul className="learning-list">
          {results.map((entry) => (
            <li key={entry.id}>
              <Link href={entry.href} className="learning-row">
                {entry.image && (
                  <span className="learning-row-media" aria-hidden="true">
                    <img src={entry.image} alt="" width={400} height={500} loading="lazy" />
                  </span>
                )}
                <span className="learning-row-kind">{entry.type}</span>
                <span className="learning-row-body"><strong>{entry.title}</strong><span className="learning-row-creator">{entry.creator}</span></span>
                <span className="learning-row-description">{entry.description}</span>
                <span className="learning-row-detail">{entry.detail}<span aria-hidden="true"> →</span></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="learning-empty"><p>No entries match your search.</p><button type="button" onClick={() => { setQuery(''); setFilter('All') }}>Clear search and filters</button></div>
      )}
    </section>
  )
}
