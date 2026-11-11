import { CategoryIcon } from './category-icon'

export function LabDetailHeader({ title, blurb, category, label, glyph, hasExplainer }: {
  title: string
  blurb: string
  category: string
  label: string
  glyph: string
  hasExplainer: boolean
}) {
  return <header className="lab-detail-header">
    <p className="lab-detail-category"><CategoryIcon category={category} fallback={glyph} size={28} /><span>{label}</span></p>
    <p className="lab-detail-kicker">Field notebook / interactive study</p>
    <h1>{title}</h1>
    <p className="lab-detail-blurb">{blurb}</p>
    <nav aria-label="Study sections" className="lab-detail-sections"><a href="#experiment">Explore the simulation</a>{hasExplainer && <a href="#explanation">Read the idea</a>}</nav>
  </header>
}
