import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { mdxComponents } from './mdx-components'

export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose-invert max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: 'github-dark' }]],
          },
        }}
      />
    </div>
  )
}
