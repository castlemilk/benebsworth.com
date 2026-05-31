import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'
import { mdxComponents } from './mdx-components'

/**
 * Remark plugin that rewrites relative image URLs in MDX to the static export
 * location `/blog/<slug>/<basename>`. Co-located post images are copied into
 * `public/blog/<slug>/` during migration; markdown refs use forms like
 * `./x.png`, `x.png`, or root-relative legacy paths like `/x.png`. Absolute
 * URLs (http(s)://, //) are left untouched. No-op when no basePath is given.
 */
function remarkImageBasePath(basePath?: string) {
  return (tree: Root) => {
    if (!basePath) return
    visit(tree, 'image', (node) => {
      const url = node.url
      if (!url || /^(https?:)?\/\//.test(url) || url.startsWith('data:')) return
      const basename = url.split('/').pop()
      if (!basename) return
      node.url = `${basePath.replace(/\/$/, '')}/${basename}`
    })
  }
}
// Registered as a unified tuple `[attacher, options]` so unified calls the
// attacher with `basePath`; the attacher returns the transformer.

export function MdxContent({
  source,
  slug,
  imageBasePath,
}: {
  source: string
  slug?: string
  imageBasePath?: string
}) {
  const basePath = imageBasePath ?? (slug ? `/blog/${slug}` : undefined)
  return (
    <div className="prose dark:prose-invert max-w-none prose-pre:bg-[#0c0c10] prose-pre:text-[#ececf0] prose-pre:p-0 prose-code:bg-transparent prose-code:p-0 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, [remarkImageBasePath, basePath]],
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: 'github-dark' }]],
          },
        }}
      />
    </div>
  )
}
