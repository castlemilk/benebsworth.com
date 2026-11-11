import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { CATEGORIES, effectsByCategory, LAB_EFFECTS } from '@/lib/lab/registry'
import type { CategoryNavItem } from '@/components/lab/category-nav'
import { LabContent } from '@/components/lab/lab-content'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { LabNotebookHeader } from '@/components/lab/lab-notebook-header'
import './notebook.css'

const CATEGORY_ACCENT: Record<string, string> = {
  art: '#00e0b8',
  maths: '#7c5cff',
  physics: '#ff7a59',
  chemistry: '#f472b6',
  biology: '#a3e635',
  earth: '#38bdf8',
  engineering: '#00b4d8',
}

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'Interactive experiments in generative art, mathematics, physics, chemistry, life sciences, earth and space science, and electrical engineering — canvas and 3D animations with live parameter controls.',
  alternates: { canonical: '/lab/' },
  openGraph: {
    type: 'website',
    title: 'Lab · Ben Ebsworth',
    description: 'Interactive experiments in generative art, mathematics, physics, chemistry, life sciences, earth and space science, and electrical engineering.',
    url: '/lab/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Lab · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function LabPage() {
  const navItems: CategoryNavItem[] = CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    glyph: cat.glyph,
    accent: CATEGORY_ACCENT[cat.key] ?? '#7c5cff',
    count: effectsByCategory(cat.key).length,
  }))

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
          ]),
          collectionPageLd({
            name: 'Lab · Ben Ebsworth',
            description: 'Interactive experiments in generative art, mathematics, physics, chemistry, life sciences, and earth and space science.',
            url: `${SITE_URL}/lab/`,
            items: LAB_EFFECTS.map((e) => ({ name: e.title, url: `${SITE_URL}/lab/${e.slug}/` })),
          }),
        ]}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl lab-notebook px-6 pb-20 sm:px-8">
        <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Lab' }]} />

        <LabNotebookHeader />
        <div id="experiment-index" className="scroll-mt-24" />

        <LabContent navItems={navItems} />
      </main>
      <SiteFooter />
    </>
  )
}
