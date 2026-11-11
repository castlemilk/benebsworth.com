/** Hash-only search navigation may repeat the current hash, which emits no hashchange. */
export const SEARCH_ANCHOR_EVENT = 'site-search:anchor'

export function announceSearchAnchor(destination: string) {
  const url = new URL(destination, window.location.href)
  if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
    window.dispatchEvent(new CustomEvent<string>(SEARCH_ANCHOR_EVENT, { detail: url.hash }))
  }
}
