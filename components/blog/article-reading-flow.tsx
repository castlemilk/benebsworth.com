import type { ReactNode } from 'react'
import { MobileToc } from './mobile-toc'
import { KeyTakeaways } from './key-takeaways'

/** Lead with the authored argument; preserve its recap after the reading body. */
export function ArticleReadingFlow({ children, takeaways, accent }: {
  children: ReactNode
  takeaways?: string[]
  accent: string
}) {
  return <>
    <MobileToc />
    {children}
    {takeaways?.length ? <div className="folio-reading-recap">
      <KeyTakeaways items={takeaways} accent={accent} />
    </div> : null}
  </>
}
