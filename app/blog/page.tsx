import type { Metadata } from 'next'
import { getPublishedPosts, type BlogPostSummary } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { BlogContent } from '@/components/blog/blog-content'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Engineering writing by Ben Ebsworth — Kubernetes, Istio service mesh, CI/CD, platform engineering, cloud (GCP/AWS) and hands-on field notes.',
  alternates: { canonical: '/blog/' },
  openGraph: {
    type: 'website',
    title: 'Blog · Ben Ebsworth',
    description: 'Kubernetes, service mesh, CI/CD, platform engineering and cloud — practical writing & field notes.',
    url: '/blog/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Blog · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function BlogPage() {
  const posts = getPublishedPosts()

  const postSummaries: BlogPostSummary[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    description: p.description,
    tags: p.tags,
    heroImage: p.heroImage,
  }))

  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Blog', url: `${SITE_URL}/blog/` },
    ]),
    collectionPageLd({
      name: 'Blog · Ben Ebsworth',
      description: 'Long-form technical writing on Kubernetes, service mesh, CI/CD and developer experience.',
      url: `${SITE_URL}/blog/`,
      items: posts.map((p) => ({ name: p.title, url: `${SITE_URL}/blog/${p.slug}/` })),
    }),
  ]

  return (
    <>
      <JsonLd data={ld} />
      {postSummaries[0]?.heroImage && (
        <link rel="preload" as="image" href={postSummaries[0].heroImage} fetchPriority="high" />
      )}
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />

        <section className="pt-8 pb-20 md:pt-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-blog">
              Writing · Platform &amp; cloud-native
            </p>
          </Reveal>
          <AnimatedHeading
            text="Notes from the cluster"
            as="h1"
            className="type-h1 mt-4"
          />
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl font-sans text-[1.2rem] leading-8 text-fg/70">
              Long-form technical writing on Kubernetes, service mesh, CI/CD and the
              developer experience — worked examples, diagrams, and the occasional algorithm.
            </p>
          </Reveal>
        </section>

        <BlogContent posts={postSummaries} />
      </main>

      <SiteFooter />
    </>
  )
}
