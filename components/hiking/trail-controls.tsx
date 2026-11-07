'use client'

import {useId,type ButtonHTMLAttributes,type SelectHTMLAttributes,type ReactNode} from 'react'
import {ArrowDownRight,ChevronDown,ChevronLeft,ChevronRight,Expand,MapPin} from 'lucide-react'
import styles from './trail-controls.module.css'

/** Adapted from Gamma Button's native-action/priority contract, with Atelier's
 * six-pixel control radius and restrained timing. Hiking owns its colors/fonts. */
export function TrailButton({variant='secondary',icon,children,className='',type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'quiet';icon?:ReactNode}) {
 return <button type={type} className={`${styles.button} ${styles[variant]} ${className}`} {...props}><span>{children}</span>{icon&&<span className={styles.icon} aria-hidden="true">{icon}</span>}</button>
}
export function TrailIconButton({children,className='',type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>) {
 return <button type={type} className={`${styles.button} ${styles.secondary} ${styles.iconButton} ${className}`} {...props}>{children}</button>
}
/** A styled native select, never a replacement listbox. */
export function TrailSelect({label,children,className='',id,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string}) {
 const generated=useId(),fieldId=id??generated
 return <label htmlFor={fieldId} className={`${styles.field} ${className}`}><span>{label}</span><span className={styles.selectFrame}><select id={fieldId} {...props}>{children}</select><ChevronDown size={17} aria-hidden="true" className={styles.chevron}/></span></label>
}
/** One native action around the original image and its action face, no nested CTA. */
export function TrailPhotoButton({media,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{media:ReactNode}) {
 return <button type="button" className={`${styles.photoButton} ${className}`} {...props}><span className={styles.photoMedia}>{media}</span><span className={styles.photoAction}><span>{children}</span><ArrowDownRight size={19} aria-hidden="true"/></span></button>
}
/** Paired native controls for an image-bound overlay. The caller owns reveal
 * behavior and keeps the photograph position separately visible. */
export function TrailPhotoNavigation({onPrevious,onNext}:{onPrevious:()=>void;onNext:()=>void}) {
 return <div className={styles.photoNavigation} role="group" aria-label="Photo navigation"><TrailIconButton onClick={onPrevious} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true"/></TrailIconButton><TrailIconButton onClick={onNext} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true"/></TrailIconButton></div>
}
/** The original-file action remains a native new-tab link, not browser fullscreen. */
export function TrailPhotoExpand({href}:{href:string}) {
 return <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open full-size photo (new tab)" title="Open full-size photo (new tab)" className={`${styles.photoNavigation} ${styles.photoExpand}`}><Expand size={20} aria-hidden="true"/></a>
}
/** Returns to the verified approximate area; never implies an exact GPS marker. */
export function TrailPhotoLocation({areaNumber,onClick}:{areaNumber:number;onClick:()=>void}) {
 const label=`Show approximate photo area ${areaNumber} on map`
 return <button type="button" onClick={onClick} aria-label={label} title={label} className={`${styles.photoNavigation} ${styles.photoExpand}`}><MapPin size={20} aria-hidden="true"/></button>
}
export function TrailPhotoPosition({index,count}:{index:number;count:number}) {
 return <span className={styles.position} aria-live="polite" aria-atomic="true">{index+1}<span aria-hidden="true"> / </span><span className={styles.srOnly}> of </span>{count}</span>
}
