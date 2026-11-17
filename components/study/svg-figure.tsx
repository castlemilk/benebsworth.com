import type { LoadedFigure } from '@/lib/study/load'

/** Inline a study figure (SVG inline; raster via data URI). `book` adds the
 * attribution chip inline `::fig` embeds carry, for parity in galleries. */
export function SvgFigure({ figure, book }: { figure: LoadedFigure; book?: boolean }) {
  return (
    <figure id={`fig-${figure.id}`} className="not-prose my-6 scroll-mt-20 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      {figure.svg ? (
        <div
          className="[&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: figure.svg }}
        />
      ) : figure.imageUri ? (
        <img src={figure.imageUri} alt={figure.title} loading="lazy" decoding="async" className="h-auto w-full" />
      ) : null}
      <figcaption className="mt-3 border-t border-border/40 pt-3">
        {book && <span className="study-fig-badge">book figure · CC-BY-NC-SA 4.0</span>}
        {figure.title && <span className="text-sm font-medium">{figure.title}: </span>}
        <span className="text-sm text-muted-foreground">{figure.caption}</span>
      </figcaption>
    </figure>
  )
}
