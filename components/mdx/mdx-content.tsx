import fs from 'node:fs'
import path from 'node:path'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'
import type { Root as HastRoot } from 'hast'
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

/**
 * Reads intrinsic pixel dimensions from a PNG / GIF / JPEG header. Zero-dep and
 * best-effort: returns null on anything it can't parse (SVG, WebP, missing file)
 * so the build never breaks — the image just ships without explicit dimensions.
 */
function imageDimensions(file: string): { width: number; height: number } | null {
  try {
    const fd = fs.openSync(file, 'r')
    const buf = Buffer.alloc(65536)
    const n = fs.readSync(fd, buf, 0, 65536, 0)
    fs.closeSync(fd)
    if (n < 24) return null
    if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } // PNG
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) } // GIF
    if (buf[0] === 0xff && buf[1] === 0xd8) { // JPEG: scan for a Start-Of-Frame marker
      let o = 2
      while (o < n - 8) {
        if (buf[o] !== 0xff) { o++; continue }
        const m = buf[o + 1]
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) }
        }
        o += 2 + buf.readUInt16BE(o + 2)
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Rehype plugin: make markdown images cheap. Adds `loading="lazy"` +
 * `decoding="async"` (below-the-fold images don't block) and best-effort
 * intrinsic width/height read from the file in `public/` so the browser can
 * reserve space — eliminating layout shift (CLS). Runs after image URLs are
 * already rewritten to `/blog/<slug>/...` by the remark plugin above.
 */
function rehypeImageAttrs() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const props = (node.properties ??= {})
      props.loading ??= 'lazy'
      props.decoding ??= 'async'
      const src = typeof props.src === 'string' ? props.src : ''
      if (!src.startsWith('/') || src.startsWith('//') || props.width != null || props.height != null) return
      const dim = imageDimensions(path.join(process.cwd(), 'public', src))
      if (dim) {
        props.width = dim.width
        props.height = dim.height
      }
    })
  }
}

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
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, [remarkImageBasePath, basePath]],
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: 'github-dark' }], rehypeImageAttrs],
          },
        }}
      />
    </div>
  )
}
