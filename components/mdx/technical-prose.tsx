import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

// Structural containment follows these globally registered renderers. Reading
// surfaces alone own the palette, typography, borders and spacing.
const scrollContainment: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto' }

/** Native code semantics and PrettyCode attributes remain on the actual pre. */
export function TechnicalPre({ className, style, ...props }: ComponentPropsWithoutRef<'pre'>) {
  return <pre tabIndex={0} aria-label="Code example, horizontally scrollable" {...props} style={{ ...scrollContainment, ...style }} className={['technical-pre', className].filter(Boolean).join(' ')} />
}

/** The wrapper scrolls; the table keeps its native layout and header semantics. */
export function TechnicalTable(props: ComponentPropsWithoutRef<'table'>) {
  return <div style={scrollContainment} className="technical-table-scroll" role="region" aria-label="Table, horizontally scrollable" tabIndex={0}><table {...props} /></div>
}
