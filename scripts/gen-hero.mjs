// Usage: node scripts/gen-hero.mjs <slug> "<scene prompt>"
// Generates a 1536x1024 hero with gpt-image-2 → /tmp/heroes/<slug>.png (staging,
// never clobbers an existing hero), then converts to webp q80 into BOTH
// content/blog/<slug>/hero.webp and public/blog/<slug>/hero.webp.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const [slug, scene] = process.argv.slice(2)
if (!slug || !scene) { console.error('usage: gen-hero.mjs <slug> "<scene>"'); process.exit(1) }

// Load OPENAI_API_KEY from project .env without printing it
const env = readFileSync('.env', 'utf8')
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!key) { console.error('OPENAI_API_KEY missing from .env'); process.exit(1) }

const NO_TEXT = 'Strict: no text, no letters, no numbers, no logos, no watermarks anywhere in the image.'

// Guard BEFORE the paid API call: never half-write the content/ + public/ pair
// (the skill's #1 breakage rule is that both dirs must carry the image).
for (const d of ['content', 'public']) {
  if (existsSync(`${d}/blog/${slug}/hero.webp`)) {
    console.error(`hero.webp already exists for ${slug} in ${d}/ — delete both copies first if regenerating`)
    process.exit(1)
  }
}

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model: 'gpt-image-2', prompt: `${scene}\n\n${NO_TEXT}`, n: 1, size: '1536x1024' }),
})
if (!res.ok) { console.error('image API', res.status, await res.text()); process.exit(1) }
const b64 = (await res.json()).data[0].b64_json
mkdirSync('/tmp/heroes', { recursive: true })
const staging = `/tmp/heroes/${slug}.png`
writeFileSync(staging, Buffer.from(b64, 'base64'))

const sharp = (await import('sharp')).default
const webp = await sharp(staging).resize(1536, 1024, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()
for (const d of ['content', 'public']) {
  mkdirSync(`${d}/blog/${slug}`, { recursive: true })
  writeFileSync(`${d}/blog/${slug}/hero.webp`, webp)
}
console.log(`hero written for ${slug} (${Math.round(webp.length / 1024)}KB webp)`)
