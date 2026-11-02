import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BlogFilter } from './blog-filter'
const topics=[{key:'ai',label:'AI',accent:'#7c5cff',count:5},{key:'kubernetes',label:'Kubernetes',accent:'#00e0b8',count:4}]
const render=(query='',topic:string|null=null)=>renderToStaticMarkup(<BlogFilter topics={topics} searchQuery={query} activeTopic={topic} onSearchChange={()=>{}} onTopicChange={()=>{}}/> )
describe('archive discovery controls',()=>{
 it('pairs a visible label with a full search control and a meaningful note',()=>{
  const html=render();expect(html).toContain('for="archive-search"');expect(html).toContain('id="archive-search"');expect(html).toContain('Search the archive');expect(html).toContain('Start with a question.');expect(html).not.toContain('Pick a thread.');expect(html).not.toContain('sticky');expect(html).not.toContain('overflow-x-auto')
 })
 it('keeps topics in an accessible group with exact counts and canonical symbols',()=>{
  const html=render('', 'ai');expect(html).toContain('aria-label="Filter by topic"');expect(html).toContain('/topics/custom-v6/ai.svg');expect(html).toContain('src="/topics/kubernetes.png"');expect(html).toContain('>9</span>');expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);expect(html).toContain('type="button"')
 })
 it('shows clear only for an active query and preserves authored search text',()=>{
  expect(render()).not.toContain('aria-label="Clear search"');const html=render('Quantum & circuits');expect(html).toContain('aria-label="Clear search"');expect(html).toContain('value="Quantum &amp; circuits"')
 })
})
