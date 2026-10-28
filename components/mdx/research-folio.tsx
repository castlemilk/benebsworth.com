import {HandUnderline} from './hand-underline'
import {AnnotationLayout} from './annotation-layout'
import type { ReactNode } from 'react'
import styles from './folio-notes.module.css'

const noteKinds = { observation: 'Observation', caution: 'Caution', method: 'Method' } as const

/** Static MDX primitives: body content remains semantic and readable without JS. */
export function FieldNote({title='Field note',kind='observation',children}:{title?:string;kind?:keyof typeof noteKinds;children:ReactNode}) {
 if (!Object.hasOwn(noteKinds, kind)) throw new Error('FieldNote requires a supported note kind.')
 const showKind = title.trim().toLowerCase() !== noteKinds[kind].toLowerCase()
 // Long authored labels get a full row rather than a tall, cramped margin.
 // The conservative threshold leaves ordinary short note titles unchanged.
 const longTitle = title.length > 48
 return <aside className={`folio-note not-prose ${styles.note}${longTitle ? ` ${styles.longTitle}` : ''}`} data-kind={kind} aria-label={title}><div className="folio-note-label">{showKind && <span className={styles.kind}>{noteKinds[kind]}</span>}<HandUnderline>{title}</HandUnderline></div><div className="folio-note-content">{children}</div></aside>
}
export function Assumptions({title='Working assumptions',children}:{title?:string;children:ReactNode}) {
 return <section className={`folio-assumptions not-prose ${styles.copy}`} aria-label={title}><h3>{title}</h3><div>{children}</div></section>
}
export function FigureFocus({title,caption,note,children}:{title:string;caption?:ReactNode;note?:ReactNode;children:ReactNode}) {
 return <figure className="folio-focus not-prose"><AnnotationLayout placement="margin"><div data-annotation-target className="folio-focus-main"><div className="folio-focus-label">{title}</div><div className="folio-focus-art">{children}</div>{caption&&<figcaption>{caption}</figcaption>}</div>{note&&<aside data-annotation-note className="folio-focus-note" aria-label={'Reading note for '+title}><div>{note}</div></aside>}</AnnotationLayout></figure>
}
