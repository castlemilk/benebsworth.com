import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LabNotebookHeader } from './lab-notebook-header'
vi.mock('./lab-card', () => ({ LabCard: ({ slug }: { slug: string }) => <div data-preview={slug} /> }))

describe('Lab field notebook entry', () => {
  it('preserves all research destinations in a named tools index', () => {
    const html = renderToStaticMarkup(<LabNotebookHeader />)
    for (const slug of ['llm-benchmark', 'harness-eval', 'cost-dashboard', 'carbon']) {
      expect(html).toMatch(new RegExp(`href="/lab/${slug}/?"`))
    }
    expect(html).toContain('aria-labelledby="lab-tools-heading"')
    expect(html.match(/<h1 /g)).toHaveLength(1)
  })
  it('pairs the featured experiment link with its real preview and canonical icon', () => {
    const html = renderToStaticMarkup(<LabNotebookHeader />)
    expect(html).toMatch(/href="\/lab\/wave-superposition\/?"/)
    expect(html).toContain('data-preview="wave-superposition"')
    expect(html).toContain('/topics/custom-v6/physics.svg')
    expect(html).toContain('href="#experiment-index"')
  })
})
