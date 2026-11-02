'use client'

import { GammaButton } from '@/components/gamma/GammaButton'
import { useRef, type CSSProperties } from 'react'
import { TOPIC } from '@/lib/topics'
import { TopicGlyph } from './topic-marker'
import styles from './blog-filter.module.css'

export type BlogFilterItem = { key: string; label: string; accent: string; count: number }

export function BlogFilter({ topics, searchQuery, onSearchChange, activeTopic, onTopicChange }: {
  topics: BlogFilterItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  activeTopic: string | null
  onTopicChange: (key: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const total = topics.reduce((sum, topic) => sum + topic.count, 0)
  return <section id="archive-index" className={styles.discovery} aria-label="Find an article">
    <div className={styles.labelRow}>
      <label htmlFor="archive-search">Search the archive</label>
      <span className={styles.note} aria-hidden="true">Start with a question.
        <svg viewBox="0 0 52 35" fill="none"><path d="M48 3C27 2 12 10 7 30m-3-9 3 9 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    </div>
    <div className={styles.search}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg>
      <input id="archive-search" ref={inputRef} type="search" aria-label="Search posts" placeholder="Search posts, topics or ideas…" value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
      {searchQuery && <GammaButton type="button" variant="quiet" className={styles.clear} aria-label="Clear search" onClick={() => { onSearchChange(''); inputRef.current?.focus() }}><span aria-hidden="true">×</span></GammaButton>}
    </div>
    <div className={styles.topics} role="group" aria-label="Filter by topic">
      <GammaButton type="button" variant="quiet" className={styles.topic} aria-pressed={!activeTopic} onClick={() => onTopicChange(null)}><span>All topics</span><span className={styles.count}>{total}</span></GammaButton>
      {topics.map(topic => {
        const symbol = TOPIC[topic.key as keyof typeof TOPIC]
        return <GammaButton key={topic.key} type="button" variant="quiet" className={styles.topic} aria-pressed={activeTopic === topic.key} style={{ '--ink': topic.accent } as CSSProperties} onClick={() => onTopicChange(activeTopic === topic.key ? null : topic.key)}>
          {symbol && <TopicGlyph topic={symbol} size={17}/>}
          <span>{topic.label}</span><span className={styles.count}>{topic.count}</span>
        </GammaButton>
      })}
    </div>
  </section>
}
