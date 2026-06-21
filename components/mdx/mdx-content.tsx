import fs from 'node:fs'
import path from 'node:path'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
// Side-effect import: pulls in KaTeX's CSS rules on the MDX pages only.
// The custom overrides in app/globals.css follow this so they cascade.
import 'katex/dist/katex.min.css'
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
 * Reads intrinsic pixel dimensions from a PNG / GIF / JPEG / WebP header.
 * Zero-dep and best-effort: returns null on anything it can't parse (SVG,
 * missing file) so the build never breaks — the image just ships without
 * explicit dimensions. WebP matters most here: nearly every hero/inline image
 * on the site is `.webp`, so parsing it is what actually reserves layout space
 * and prevents CLS on long-form posts.
 */
function imageDimensions(file: string): { width: number; height: number } | null {
  try {
    const fd = fs.openSync(file, 'r')
    const buf = Buffer.alloc(65536)
    const n = fs.readSync(fd, buf, 0, 65536, 0)
    fs.closeSync(fd)
    if (n < 30) return null
    if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } // PNG
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) } // GIF
    // WebP: "RIFF"...."WEBP" then a 4CC chunk header. Three encodings carry the
    // canvas size in different layouts (VP8 lossy / VP8L lossless / VP8X extended).
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50 // WEBP
    ) {
      const fourcc = buf.toString('ascii', 12, 16)
      if (fourcc === 'VP8 ') {
        // Lossy: 14-bit width/height little-endian at offsets 26/28.
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
      }
      if (fourcc === 'VP8L') {
        // Lossless: 14-bit (size-1) fields packed across bytes 21..24 after the 0x2f sig.
        const b1 = buf[21], b2 = buf[22], b3 = buf[23], b4 = buf[24]
        const width = 1 + (((b2 & 0x3f) << 8) | b1)
        const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
        return { width, height }
      }
      if (fourcc === 'VP8X') {
        // Extended: 24-bit (size-1) canvas dimensions little-endian at offsets 24/27.
        const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
        const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
        return { width, height }
      }
      return null
    }
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
          // next-mdx-remote v6 defaults `blockJS` to true, which injects a
          // remark plugin that strips JSX *expression* attributes — so
          // `params={{ ... }}` and `height={420}` on lab embeds were silently
          // dropped (string attrs like `effect`/`caption` survived, masking it).
          // Our MDX is first-party, version-controlled content, so restore
          // standard MDX expression handling.
          blockJS: false,
          blockDangerousJS: false,
          mdxOptions: {
            // remark-math parses `$...$` and `$$...$$` into math nodes;
            // rehype-katex renders them as KaTeX HTML.
            remarkPlugins: [remarkGfm, remarkMath, [remarkImageBasePath, basePath]],
            rehypePlugins: [
              rehypeSlug,
              [rehypePrettyCode, { theme: 'github-dark' }],
              rehypeImageAttrs,
              // strict:false allows physical units like \rm, deprecated TeX
              // commands. The post may include legacy syntax.
              [rehypeKatex, { strict: false, throwOnError: false }],
            ],
          },
        }}
      />
    </div>
  )
}
