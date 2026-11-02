/** Metadata emitted by the exported article and returned by Pagefind. */
export interface PagefindData {
  url: string
  excerpt: string
  meta?: { title?: string; image?: string; description?: string; topicIcon?: string; topicLabel?: string; topicMode?: string }
  sub_results?: { url: string; excerpt: string; title?: string }[]
}
export interface Hit {
  url: string
  title: string
  excerpt: string
  description?: string
  topicIcon?: string
  topicLabel?: string
  topicMode?: 'mask' | 'image'
}
export function mapSearchHit(data: PagefindData): Hit {
  const icon = data.meta?.topicIcon
  // Only our exported, path-safe topic assets may become CSS masks or images.
  const topicIcon = icon && /^\/topics\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:svg|png|webp)$/.test(icon) ? icon : undefined
  return {
    url: data.url,
    title: data.meta?.title || data.sub_results?.[0]?.title || data.url,
    excerpt: data.excerpt,
    description: data.meta?.description?.trim() || undefined,
    topicIcon,
    topicLabel: data.meta?.topicLabel,
    topicMode: topicIcon ? (data.meta?.topicMode === 'mask' ? 'mask' : 'image') : undefined,
  }
}

/** Native nearest scrolling keeps arrow navigation inside the result viewport. */
export function revealSearchSelection(dialog: HTMLElement | null) {
  dialog?.querySelector<HTMLElement>('a[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' })
}
