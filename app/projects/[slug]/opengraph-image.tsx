import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { getAllProjects, getProject } from '@/lib/content'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Project · Ben Ebsworth'

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getProject(slug)
  const footer = p?.technologies?.slice(0, 3).map((t) => t.text).join('  ·  ') || 'Project'
  return renderOgCard({
    eyebrow: 'Project',
    title: p?.title ?? 'Ben Ebsworth',
    footer,
    accent: '#7c5cff',
  })
}
