import { describe, expect, it } from 'vitest'
import { renderMarkdown, type StudyEmbedReport } from './markdown'

const figures = new Map([
  ['loop', { title: 'Loop', caption: 'the loop', svg: '<svg viewBox="0 0 1 1"></svg>' }],
])
const chartInfo = new Map([['survey', { title: 'Survey', captionHtml: '<p>crowd shares</p>' }]])

function newEmbeds(): StudyEmbedReport {
  return { figIds: new Set(), chartIds: new Set() }
}

describe('::fig embeds', () => {
  it('embeds a standalone marker as a figure with anchor + caption', async () => {
    const embeds = newEmbeds()
    const html = await renderMarkdown('Some prose.\n\n::fig[loop]\n\nMore prose.', {
      inlineFigures: figures,
      embeds,
    })
    expect(html).toContain('id="fig-loop"')
    expect(html).toContain('<svg viewBox="0 0 1 1">')
    expect(embeds.figIds.has('loop')).toBe(true)
  })

  it('emits a visible stub for unknown ids instead of vanishing', async () => {
    const html = await renderMarkdown('::fig[nope]', { inlineFigures: figures })
    expect(html).toContain('study-fig-missing')
    expect(html).toContain('nope')
  })

  it('does not embed markers inside code fences — and does not report them', async () => {
    const embeds = newEmbeds()
    const html = await renderMarkdown('Write it like this:\n\n```\n::fig[loop]\n```\n\nThen done.', {
      inlineFigures: figures,
      embeds,
    })
    expect(html).not.toContain('id="fig-loop"')
    expect(embeds.figIds.size).toBe(0)
  })

  it('does not embed markers glued to a paragraph — and does not report them', async () => {
    const embeds = newEmbeds()
    const html = await renderMarkdown('Glued paragraph\n::fig[loop]\n\nNext.', { inlineFigures: figures, embeds })
    expect(html).not.toContain('id="fig-loop"')
    expect(embeds.figIds.size).toBe(0)
  })
})

describe('::chart embeds', () => {
  it('emits a data-study-chart placeholder carrying the server-rendered caption', async () => {
    const embeds = newEmbeds()
    const html = await renderMarkdown('::chart[survey]', { chartInfo, embeds })
    expect(html).toContain('data-study-chart="survey"')
    expect(html).toContain('id="fig-survey"')
    expect(html).toContain('study-chart-slot')
    expect(html).toContain('crowd shares')
    expect(embeds.chartIds.has('survey')).toBe(true)
  })

  it('emits a stub for unknown chart ids', async () => {
    const html = await renderMarkdown('::chart[ghost]', { chartInfo })
    expect(html).toContain('study-fig-missing')
    expect(html).not.toContain('data-study-chart')
  })
})

describe('::eq markers', () => {
  it('leaves a missing stub when the $$ block never arrives', async () => {
    const html = await renderMarkdown('::eq[orphan]\n\nJust prose after.', {
      equationSymbols: new Map(),
    })
    expect(html).toContain('study-fig-missing')
    expect(html).toContain('orphan')
  })
})

it('links reference book figures without exporting SVG or raster bytes', async () => {
  const html = await renderMarkdown('::fig[reference]', {
    inlineFigures: new Map([['reference', { title: 'Source illustration', svg: '<svg id="upstream-bytes"></svg>', imageUri: 'data:image/png;base64,PRIVATE' }]]),
    bookFigureIds: new Set(['reference']),
  })
  expect(html).toContain('https://mlsysbook.ai/')
  expect(html).toContain('Reference image not republished')
  expect(html).not.toContain('upstream-bytes')
  expect(html).not.toContain('data:image')
})
