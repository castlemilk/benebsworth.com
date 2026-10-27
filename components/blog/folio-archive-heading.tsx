import { AnnotationMark } from '@/components/mdx/annotation-marks'

export function FolioArchiveHeading() {
  return <header className="folio-archive-heading">
    <div>
      <p className="folio-archive-kicker">Engineering field notes</p>
      <h1>Notes from<br />the <span>cluster<AnnotationMark kind="underline" /></span></h1>
      <p className="folio-archive-intro">Long-form technical writing on Kubernetes, service mesh, CI/CD and the developer experience — worked examples, diagrams, and the occasional algorithm.</p>
    </div>
    <aside className="folio-archive-note" aria-label="Browse the archive">
      <AnnotationMark kind="arrow" />
      <p>Pick a thread.<br />Follow the details.</p>
      <a href="#archive-index">Browse by topic or search</a>
    </aside>
  </header>
}
