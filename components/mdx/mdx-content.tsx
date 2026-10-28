import { MDXRemote } from 'next-mdx-remote/rsc'
import 'katex/dist/katex.min.css'
import { mdxComponents } from './mdx-components'
import { mdxOptions } from './mdx-options'

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
    <div className="prose dark:prose-invert max-w-none prose-pre:text-[#ececf0] prose-pre:rounded-xl prose-pre:px-5 prose-pre:py-4 prose-pre:overflow-x-auto [&_[data-rehype-pretty-code-figure]]:my-7 prose-code:bg-transparent prose-code:p-0 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={mdxOptions(basePath)}
      />
    </div>
  )
}
