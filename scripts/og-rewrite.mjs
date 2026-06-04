// Postbuild: Next emits OpenGraph images as EXTENSIONLESS route files named
// `opengraph-image`. Our CloudFront function rewrites any extensionless path to
// `<path>/index.html` (trailing-slash static hosting), so `/opengraph-image`
// 404s. Give the files a `.png` extension and rewrite the HTML references to
// match — then the URL contains a `.`, the rewrite skips it, S3 serves the PNG,
// and `aws s3 sync` sets Content-Type: image/png from the extension.
import { readdirSync, statSync, renameSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'out'

function walk(dir, fn) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    statSync(p).isDirectory() ? walk(p, fn) : fn(p)
  }
}

let renamed = 0
walk(OUT, (p) => {
  if (p.endsWith('/opengraph-image')) {
    renameSync(p, `${p}.png`)
    renamed++
  }
})

let rewritten = 0
walk(OUT, (p) => {
  if (!p.endsWith('.html')) return
  const html = readFileSync(p, 'utf8')
  if (!html.includes('opengraph-image?')) return
  // og:image / twitter:image URLs always carry a ?<hash> query → match precisely.
  writeFileSync(p, html.replaceAll('opengraph-image?', 'opengraph-image.png?'))
  rewritten++
})

console.log(`[og-rewrite] renamed ${renamed} OG image files → .png; rewrote ${rewritten} HTML files`)
