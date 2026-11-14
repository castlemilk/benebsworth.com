/** Fixed, reviewed artwork. Never coerced into the 320×240 tunable Study model. */
export const GROUNDED_THEMES = ['light', 'dark', 'mono'] as const
export type GroundedTheme = typeof GROUNDED_THEMES[number]
export interface GroundedVariant {
  master: string
  sha256: string
  bytes: number
  thumbnail: string
  thumbnailSha256: string
  thumbnailBytes: number
  preview: string
  previewSha256: string
  previewBytes: number
}
export interface GroundedArtwork {
  slug: string
  title: string
  batchId: string
  sourceId: string
  sourceDirectoryId: string
  revision: number
  width: number
  height: number
  viewBox: string
  minimumDisplayWidth: number
  caption: string
  basis: string
  limitations: string
  provenance: string
  subject: string
  tags: string[]
  aliases: string[]
  sources: { title: string; url: string }[]
  variants: Record<GroundedTheme, GroundedVariant>
}

/** Small discovery record; detailed scientific notes and master receipts stay off the index client. */
export type GroundedCard = Pick<GroundedArtwork, 'slug' | 'title' | 'subject' | 'tags' | 'aliases' | 'caption' | 'minimumDisplayWidth'> & {
  thumbnails: Record<GroundedTheme, string>
}
