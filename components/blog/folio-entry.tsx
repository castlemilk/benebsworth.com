import styles from './archive-discovery.module.css'
import type { CSSProperties, ReactNode } from 'react'

/** A reading surface, not an interactive dashboard card. Its parent link owns navigation. */
export function FolioEntry({ children, accent, className = '' }: { children: ReactNode; accent: string; className?: string }) {
  return <article className={`folio-entry group/spot ${styles.entry} ${className}`} style={{ '--entry-accent': accent } as CSSProperties}>{children}</article>
}
