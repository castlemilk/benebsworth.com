import {AnnotationMark} from './annotation-marks'
import type { ReactNode } from 'react'

/** Static MDX primitives: body content remains semantic and readable without JS. */
export function FieldNote({title='Field note',kind='observation',children}:{title?:string;kind?:'observation'|'caution'|'method';children:ReactNode}) {
 return <aside className="folio-note not-prose" data-kind={kind} aria-label={title}><div className="folio-note-label"><AnnotationMark kind="underline"/> {title}</div><div className="folio-note-content">{children}</div></aside>
}
export function Assumptions({title='Working assumptions',children}:{title?:string;children:ReactNode}) {
 return <section className="folio-assumptions not-prose" aria-label={title}><h3>{title}</h3><div>{children}</div></section>
}
export function FigureFocus({title,caption,note,children}:{title:string;caption?:ReactNode;note?:ReactNode;children:ReactNode}) {
 return <figure className="folio-focus not-prose"><div className="folio-focus-main"><div className="folio-focus-label">{title}</div><div className="folio-focus-art">{children}</div>{caption&&<figcaption>{caption}</figcaption>}</div>{note&&<aside className="folio-focus-note" aria-label={'Reading note for '+title}><AnnotationMark kind="arrow" className="folio-connector"/><div>{note}</div></aside>}</figure>
}
