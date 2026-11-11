import { HandUnderline } from '@/components/mdx/hand-underline'

export function FolioArchiveHeading() {
  return <header className="folio-archive-heading">
    <div>
      <p className="folio-archive-kicker">Engineering field notes</p>
      <h1>Notes from<br />the <HandUnderline>cluster</HandUnderline></h1>
      <p className="folio-archive-intro">Long-form technical writing on Kubernetes, service mesh, CI/CD and the developer experience — worked examples, diagrams, and the occasional algorithm.</p>
    </div>

  </header>
}
