import type { ReactNode } from 'react'
import { FieldNote } from './research-folio'
import styles from './folio-notes.module.css'

const formats = { explainer: 'Explainer', experiment: 'Experiment', essay: 'Essay', guide: 'Practical guide' } as const

/** An orientation block, not a replacement for the article title or metadata. */
export function PostBrief({ kind, children, audience, prerequisites = [] }: {
  kind: keyof typeof formats
  children: ReactNode
  audience?: string
  prerequisites?: string[]
}) {
  if (!Object.hasOwn(formats, kind)) throw new Error('PostBrief requires a supported post kind.')
  return <aside className={`folio-brief not-prose ${styles.copy}`} data-post-kind={kind} aria-label={`${formats[kind]} reading brief`}>
    <p className="folio-pattern-label">{formats[kind]}</p>
    <div className="folio-brief-summary">{children}</div>
    {audience && <p className="folio-brief-audience"><strong>Written for</strong> {audience}</p>}
    {prerequisites.length > 0 && <div className="folio-prerequisites"><p>Before you start</p>
      <ul>{prerequisites.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>}
  </aside>
}

const evidenceLabels = { measured: 'Measured result', simulated: 'Simulation', illustrative: 'Illustration', interpretation: 'Interpretation' } as const
/** Authors must declare evidence type. A component never infers a measured result. */
export function EvidenceNote({ basis, children, limitations }: {
  basis: keyof typeof evidenceLabels
  children: ReactNode
  limitations?: ReactNode
}) {
  if (!Object.hasOwn(evidenceLabels, basis)) throw new Error('EvidenceNote requires an explicit evidence basis.')
  return <FieldNote title={evidenceLabels[basis]} kind="method">
    <div data-evidence-basis={basis}>{children}</div>
    {limitations && <div className="folio-evidence-limit"><strong>Limits</strong><div>{limitations}</div></div>}
  </FieldNote>
}

/** Ordered only for real procedures; never use numbering as ornamental decoration. */
export function MethodSteps({ title = 'Method', steps }: {
  title?: string
  steps: { title: string; content: ReactNode }[]
}) {
  if (!steps.length) throw new Error('MethodSteps requires at least one real step.')
  return <section className={`folio-method not-prose ${styles.copy}`} aria-label={title}>
    <h3 className="folio-pattern-label">{title}</h3>
    <ol>{steps.map((step, i) => <li key={i}><h4>{step.title}</h4><div>{step.content}</div></li>)}</ol>
  </section>
}
