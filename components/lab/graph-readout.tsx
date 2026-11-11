import { Fragment, type CSSProperties } from 'react'
import type { InspectionRow } from '@/lib/lab/types'
import styles from './inspection.module.css'

export function GraphReadout({id,rows,title='Sample readout',caption,docked=false,style,onClose}:{
  id:string; rows:InspectionRow[]; title?:string; caption?:string; docked?:boolean; style?:CSSProperties; onClose:()=>void
}) {
  const primary=rows.find(row=>row.role==='primary')
  const position=rows.find(row=>row.role==='position')
  const details=rows.filter(row=>row!==primary && row!==position)
  return <div id={id} role={docked?'region':'tooltip'} aria-label={title} className={`${styles.readout} ${docked?styles.docked:''}`} style={style}>
    <div className={styles.readoutHeader}><span>{position ? <>Sample <b>{position.value}</b></> : title}</span>{docked && <button type="button" onClick={onClose} aria-label="Close graph readout">× Close</button>}</div>
    {primary && <div className={styles.primary}><output style={{color:primary.color}}>{primary.value}</output><span>{primary.label}</span></div>}
    <dl>{details.map(row=><Fragment key={row.label}><dt>{row.color && <i aria-hidden="true" style={{background:row.color}}/>}{row.label}</dt><dd>{row.value}</dd></Fragment>)}</dl>
    <footer><span>Frame held{caption && <small>{caption}</small>}</span><kbd>Esc</kbd></footer>
  </div>
}
