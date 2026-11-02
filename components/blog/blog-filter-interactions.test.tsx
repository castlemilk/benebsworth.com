// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BlogFilter } from './blog-filter'
afterEach(cleanup)
function Harness(){
 const [q,setQ]=useState('');const [topic,setTopic]=useState<string|null>(null)
 return <BlogFilter topics={[{key:'ai',label:'AI',accent:'#7c5cff',count:5}]} searchQuery={q} onSearchChange={setQ} activeTopic={topic} onTopicChange={setTopic}/>
}
describe('archive discovery interaction',()=>{
 it('clears the query back into the input without losing the selected topic',()=>{
  render(<Harness/>);const input=screen.getByRole('searchbox',{name:'Search posts'});fireEvent.click(screen.getByRole('button',{name:/AI\s*5/}));fireEvent.change(input,{target:{value:'neural'}});fireEvent.click(screen.getByRole('button',{name:'Clear search'}));expect((input as HTMLInputElement).value).toBe('');expect(document.activeElement).toBe(input);expect(screen.getByRole('button',{name:/AI\s*5/}).getAttribute('aria-pressed')).toBe('true');expect(screen.queryByRole('button',{name:'Clear search'})).toBeNull()
 })
 it('toggles a topic repeatedly and restores all without resetting the query',()=>{
  render(<Harness/>);const input=screen.getByRole('searchbox',{name:'Search posts'});fireEvent.change(input,{target:{value:'model'}});const topic=screen.getByRole('button',{name:/AI\s*5/});fireEvent.click(topic);fireEvent.click(topic);expect(topic.getAttribute('aria-pressed')).toBe('false');fireEvent.click(topic);fireEvent.click(screen.getByRole('button',{name:/All topics\s*5/}));expect(topic.getAttribute('aria-pressed')).toBe('false');expect((input as HTMLInputElement).value).toBe('model')
 })
})
