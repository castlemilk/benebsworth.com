/** Presentation contracts only. The graph owner supplies identity and meaning. */
export type FolioTheme = 'inherit' | 'light' | 'dark'

export type FolioSource = {
  id: string
  title: string
  /** Recorded means a locator was supplied, not that a claim was peer reviewed. */
  state: 'recorded' | 'unchecked' | 'unavailable' | 'missing'
  href?: string
  locator?: string
  revision?: string
  detail?: string
}

export type FolioEntity = {
  /** Opaque, consumer-owned identity. Never infer this from a title or slug. */
  id: string
  kind: string
  kindLabel: string
  title: string
  summary?: string
  href?: string
  actionLabel: string
  /** Preserve each source registry's vocabulary. */
  category?: { registry: string; key: string; label: string }
  tags: readonly string[]
  sources: readonly FolioSource[]
  context?: string
}

export type FolioRelationship = {
  id: string
  subject: string
  predicate: string
  object: string
  basis: 'source-record' | 'proposal' | 'unknown'
  basisLabel: string
  explanation: string
  sources: readonly FolioSource[]
}

export type FolioFacet = {
  id: string
  label: string
  options: readonly { id: string; label: string; count?: number; disabled?: boolean }[]
}

/** An empty group means unrestricted; OR within a group, AND across groups. */
export type FolioSelection = Readonly<Record<string, readonly string[]>>

export type FolioReadingPreferences = {
  size: number
  measure: 'comfortable' | 'wide'
  notes: boolean
}

export const DEFAULT_READING: FolioReadingPreferences = {
  size: 19,
  measure: 'comfortable',
  notes: true,
}

export type FolioCollectionState =
  | { kind: 'loading'; message: string }
  | { kind: 'empty'; reason: 'filters' | 'collection'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'missing'; message: string }

/** Safe navigation only; this helper neither fetches nor validates a source. */
export function folioHref(value: string | undefined): string | undefined {
  if (!value || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char === '\\')) return undefined
  if (/^\/(?!\/)/.test(value) || /^#[A-Za-z][\w-]*$/.test(value)) return value
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}
