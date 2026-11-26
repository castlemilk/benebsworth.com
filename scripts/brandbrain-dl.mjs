// Download a BrandBrain artifact URL and write the site's webp roots.
//   node scripts/brandbrain-dl.mjs <slug> <url> [hero|lab|study]
// hero  → 1536×1024 → content/blog/<slug>/hero.webp + public/blog/<slug>/hero.webp
// lab   → 768×768   → public/lab/previews/<slug>.webp
// study → 1536×1024 → study/mlsys/<vol>/<slug>/cover.webp + public/study/<vol>/<slug>/cover.webp
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [slug, url, kind = 'hero', vol] = process.argv.slice(2)
if (!slug || !url) { console.error('usage: brandbrain-dl.mjs <slug> <url> [hero|lab|study] [vol]'); process.exit(1) }

const res = await fetch(url)
if (!res.ok) { console.error('fetch', res.status, await res.text()); process.exit(1) }
const buf = Buffer.from(await res.arrayBuffer())

const put = (file, webp) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, webp) }

if (kind === 'hero') {
  const webp = await sharp(buf).resize(1536, 1024, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()
  put(`content/blog/${slug}/hero.webp`, webp)
  put(`public/blog/${slug}/hero.webp`, webp)
  console.log(`${slug}: ${Math.round(webp.length / 1024)}KB → content+public hero`)
} else if (kind === 'lab') {
  const webp = await sharp(buf).resize(768, 768, { fit: 'cover' }).webp({ quality: 82 }).toBuffer()
  put(`public/lab/previews/${slug}.webp`, webp)
  console.log(`${slug}: ${Math.round(webp.length / 1024)}KB → lab preview`)
} else if (kind === 'study') {
  if (!vol) { console.error('study kind needs <vol>'); process.exit(1) }
  const webp = await sharp(buf).resize(1536, 1024, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()
  put(`study/mlsys/${vol}/${slug}/cover.webp`, webp)
  put(`public/study/${vol}/${slug}/cover.webp`, webp)
  console.log(`${vol}/${slug}: ${Math.round(webp.length / 1024)}KB → study cover (both roots)`)
}
