import katex from 'katex'
import type { StudyEquation } from '@/lib/gen/study'
import { renderMarkdown } from '@/lib/study/markdown'
import { Equation } from '@/components/mdx/equation'

/**
 * "Key equations" block for chapter pages. Each StudyEquation is rendered to
 * KaTeX HTML by the packet markdown pipeline, then wrapped in the gamma
 * Equation figure so it gets numbering, a caption, the copy-LaTeX
 * action menu, and the per-symbol drilldown for free. Symbol glyphs are
 * rendered server-side so the drilldown needs no client katex.
 */
export async function EquationList({ equations }: { equations: StudyEquation[] }) {
  if (!equations.length) return null
  const rendered = await Promise.all(
    equations.map(async (eq) => ({
      eq,
      mathHtml: await renderMarkdown(`$$\n${eq.latex}\n$$`),
      captionHtml: await renderMarkdown(
        eq.caption ? `**${eq.title}**: ${eq.caption}` : `**${eq.title}**`,
      ),
    })),
  )
  return (
    <>
      {rendered.map(({ eq, mathHtml, captionHtml }) => (
        <Equation
          key={eq.id}
          id={`eq-${eq.id}`}
          number={String(eq.number)}
          latex={eq.latex}
          symbols={eq.symbols.map((s) => ({
            symbol: s.symbol,
            symbolHtml: katex.renderToString(s.symbol, { throwOnError: false, output: 'html' }),
            name: s.name || undefined,
            meaning: s.meaning,
          }))}
          caption={
            <span
              className="[&_p]:inline"
              dangerouslySetInnerHTML={{ __html: captionHtml }}
            />
          }
        >
          <div dangerouslySetInnerHTML={{ __html: mathHtml }} />
        </Equation>
      ))}
    </>
  )
}
