import {Children,isValidElement,type ReactNode,type ReactElement} from 'react'
import {AnnotationLayout} from './annotation-layout'
type TargetProps={id:string;children:ReactNode}
type NoteProps={target:string;label?:string;children:ReactNode;mark?:'connector'|'bracket'|'none'}
export function AnnotationTarget({id,children}:TargetProps){return <div id={id} className="annotation-target" data-annotation-target>{children}</div>}
export function MarginNote({target,label='Working note',children,mark='connector'}:NoteProps){return <aside data-annotation-note data-annotation-mark={mark} className="margin-note" aria-label={label}><a className="margin-note-label" href={'#'+target}>{label}</a><div className="handwritten-note">{children}</div></aside>}
/** One target/note per block. No runtime measuring or random paths. */
export function AnnotatedBlock({children,placement='margin'}:{children:ReactNode;placement?:'margin'|'above'|'below'}){
 const nodes=Children.toArray(children).filter(isValidElement) as ReactElement[];
 const targets=nodes.filter(n=>n.type===AnnotationTarget) as ReactElement<TargetProps>[];
 const notes=nodes.filter(n=>n.type===MarginNote) as ReactElement<NoteProps>[];
 if(nodes.length!==2||targets.length!==1||notes.length!==1)throw Error('AnnotatedBlock requires one AnnotationTarget and one MarginNote.');
 if(!/^[A-Za-z][\w-]*$/.test(targets[0].props.id)||targets[0].props.id!==notes[0].props.target)throw Error('Annotation target must be a valid matching identifier.');
 return <AnnotationLayout placement={placement} className="annotated-block not-prose">{targets[0]}{notes[0]}</AnnotationLayout>;
}
