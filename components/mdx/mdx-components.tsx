import type { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  h2: (p) => <h2 className="mt-10 text-2xl font-bold text-fg" {...p} />,
  h3: (p) => <h3 className="mt-8 text-xl font-semibold text-fg" {...p} />,
  p: (p) => <p className="mt-4 leading-7 text-fg/90" {...p} />,
  a: (p) => <a className="text-project underline underline-offset-4" {...p} />,
  ul: (p) => <ul className="mt-4 list-disc pl-6" {...p} />,
  code: (p) => <code className="rounded bg-white/5 px-1.5 py-0.5 text-sm" {...p} />,
}
