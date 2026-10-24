import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import matter from 'gray-matter'
import { compile } from '@mdx-js/mdx'
import { compileMDX } from 'next-mdx-remote/rsc'
import { renderToStaticMarkup } from 'react-dom/server'
import { Figure } from '../components/mdx/editorial-components'
import { getPost, getPublishedPosts } from './content'

const slug = 'using-my-dot-with-codex'
describe('dot article native MDX', () => {
  it('loads native metadata and honours the configured publication gate', () => {
    const post = getPost(slug)!
    expect(post.title).toContain('my dot')
    const { data } = matter(fs.readFileSync(`content/blog/${slug}/index.mdx`, 'utf8'))
    expect(typeof data.draft).toBe('boolean')
    expect(typeof data.release).toBe('boolean')
    expect(getPublishedPosts().some(p => p.slug === slug)).toBe(data.release !== false && !data.draft)
    expect(post.heroImage).toBe(`/blog/${slug}/hero.webp`)
  })
  it('compiles the MDX with existing Figure components', async () => {
    const post = getPost(slug)!
    await expect(compile(post.body)).resolves.toBeTruthy()
    expect((post.body.match(/<Figure\s/g) || []).length).toBe(3)
    expect(post.body).not.toMatch(/<html|<head|<style|data:image/)
  })
  it('renders screenshots through the registered Figure implementation', async () => {
    const { content } = await compileMDX({ source: getPost(slug)!.body, components: { Figure }, options: { blockJS: false, blockDangerousJS: false } })
    const rendered = renderToStaticMarkup(content)
    expect((rendered.match(/<figure/g) || []).length).toBe(3)
    expect(rendered).toContain('dot-desktop-tools.png')
    expect(rendered).toContain('dot-resource-monitor.png')
    expect(rendered).toContain('<figcaption')
    expect(rendered).toContain('width="1323"')
  })
  it('mirrors each referenced asset byte for byte', () => {
    for (const name of ['hero.webp', 'dot-desktop-tools.png', 'dot-resource-monitor.png']) {
      const source = fs.readFileSync(`content/blog/${slug}/${name}`)
      expect(source.length).toBeGreaterThan(0)
      expect(source.equals(fs.readFileSync(`public/blog/${slug}/${name}`))).toBe(true)
    }
  })
  it('describes observed resources without promising a fixed instance size', () => {
    const body = getPost(slug)!.body
    expect(body).toContain('9.73 GiB')
    expect(body).toContain('9 visible logical CPUs')
    expect(body).toContain('rather than a specification for every dot session')
  })
})
