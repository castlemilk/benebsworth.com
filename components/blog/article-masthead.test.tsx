import React from 'react'
import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {ArticleMasthead} from './article-masthead'
import {KeyTakeaways} from './key-takeaways'
import {AuthorBio} from './author-bio'
import {topicFor} from '@/lib/topics'
const topic=topicFor({slug:'every-wire-is-an-rlc-circuit',tags:['electronics']} as Parameters<typeof topicFor>[0])
describe('shared reading folio shell',()=>{
 it('preserves authored masthead data with one semantic h1',()=>{
  const html=renderToStaticMarkup(<ArticleMasthead title="A deliberately long technical title" description="Authored description, unchanged." date="2026-10-22" readingTime={7} tags={['circuits','systems']} topic={topic}/>);
  expect(html).toContain('folio-post-topic accent-ink');expect(html).toContain(`--ink:${topic.accent}`);expect(html.match(/<h1/g)).toHaveLength(1);expect(html).toContain('A deliberately long technical title');expect(html).toContain('Authored description, unchanged.');expect(html).toContain('dateTime="2026-10-22"');expect(html).toContain('min read');expect(html).toContain('Ben Ebsworth');expect(html).toContain('aria-label="Article topics"');expect(html).not.toContain('blur-3xl');expect(html).not.toContain('radial-gradient');
 });
 it('omits absent deck/tags without placeholders and keeps the six-tag limit',()=>{
  const empty=renderToStaticMarkup(<ArticleMasthead title="Title" date="2026-10-22" readingTime={1} tags={[]} topic={topic}/>);expect(empty).not.toContain('folio-post-deck');expect(empty).not.toContain('Article topics');
  const full=renderToStaticMarkup(<ArticleMasthead title="Title" date="2026-10-22" readingTime={1} tags={['a','b','c','d','e','f','seventh']} topic={topic}/>);expect(full.match(/<li>/g)).toHaveLength(6);expect(full).not.toContain('seventh');
 });
 it('renders exact authored takeaways without invented annotation copy',()=>{
  const html=renderToStaticMarkup(<KeyTakeaways items={['First exact claim.','Second exact claim.']} accent="#abcdef"/>);expect(html).toContain('First exact claim.');expect(html).toContain('Second exact claim.');expect(html.match(/<li>/g)).toHaveLength(2);expect(html).toContain('Key takeaways');expect(html).toContain('hand-underline');expect(html).not.toContain('rounded-xl');expect(renderToStaticMarkup(<KeyTakeaways items={[]} accent="red"/>)).toBe('');
 });
 it('keeps author identity, portrait and about destination',()=>{
  const html=renderToStaticMarkup(<AuthorBio/>);expect(html).toContain('/about/portrait-main.webp');expect(html).toContain('href="/about');expect(html).toContain('Ben Ebsworth');expect(html).toContain('Software, platform &amp; hardware engineer in Melbourne');expect(html).toContain('loading="lazy"');expect(html).not.toContain('rounded-xl');
 });
})
