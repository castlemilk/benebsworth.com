import type { Artifact } from '@/lib/gen/content'
import { ArtifactKind } from '@/lib/gen/content'

/**
 * Pool of artifact tiles for landing gaps. More than the gap count so the
 * selection reshuffles each load. `latest post` is patched at runtime with the
 * newest blog slug/title (see grid-nav).
 */
export const ARTIFACTS: Artifact[] = [
  { id: 'nutry', label: 'Nutry →', link: '/projects/nutry/', kind: ArtifactKind.IMAGE, image: '/artifacts/nutry.webp', lines: [], glyph: '' },
  { id: 'latest', label: 'latest post →', link: '/blog/', kind: ArtifactKind.TEXT, image: '', lines: ['↳ NEW', 'latest', 'post'], glyph: '' },
  { id: 'doodle', label: 'generative →', link: '/lab/', kind: ArtifactKind.ANIM, image: '', lines: [], glyph: '' },
  { id: 'me', label: 'about me →', link: '/about/', kind: ArtifactKind.AVATAR, image: '', lines: [], glyph: '' },
  { id: 'gh', label: 'github →', link: 'https://github.com/castlemilk', kind: ArtifactKind.GLYPH, image: '', lines: [], glyph: '{ }' },
  { id: 'archive', label: 'the old site →', link: '/archive/', kind: ArtifactKind.GLYPH, image: '', lines: [], glyph: '⌘' },
]
