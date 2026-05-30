/**
 * Extract a YouTube video id from common URL forms:
 *   https://www.youtube.com/watch?v=<id>
 *   https://youtu.be/<id>
 *   https://www.youtube.com/embed/<id> or /shorts/<id>
 * Returns null if the url is not a recognised YouTube link.
 *
 * Pure helper with no React dependency, so it can be called from server
 * components (the client <YouTube> facade lives separately).
 */
export function youtubeId(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)
      if (m) return m[1]
    }
    return null
  } catch {
    return null
  }
}
