import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

/**
 * Images for a generated artefact.
 *
 * The task requires a single self-contained HTML file, so an <img src="https://…">
 * does not count as an image that loads: the page has to carry the bytes. That
 * makes this step two jobs — SOURCE the picture, then INLINE it as a data URI —
 * and the inlining is the half that is easy to forget and impossible to fake.
 *
 * Sources are tried in cost order, and the first one that returns something is
 * used:
 *
 *   1. Open collections (Openverse, Wikimedia, the museums) via the design
 *      skill's `assets.mjs`. No key, no cost, licences cleared for commercial
 *      use, and it records the credit line. This is the one that works with an
 *      exhausted API balance.
 *   2. A cheap image model through OpenRouter. Needs credit.
 *   3. BrandBrain, for brand marks and logos where the subject is a real
 *      company. Needs the platform reachable (or its MCP authenticated).
 *
 * A page that says "observation logs" gets photographs of instruments and
 * telemetry, not gradients: the subject comes from the artefact itself, so the
 * search terms describe what the page is about rather than a generic mood.
 */

export interface ImageRequest {
  /** Search terms describing the page's subject. */
  query: string
  /** Where the file must land, relative to the loop directory. */
  fileName: string
  /** Attribution line for the footer or the report. */
  credit?: string
}

export interface SourcedImage extends ImageRequest {
  /** Absolute path on disk. */
  path: string
  bytes: number
  source: 'open-collection' | 'image-model' | 'brandbrain'
  licence?: string
  creator?: string
  page?: string
}

export interface ImageSources {
  /** Path to the vendored design skill's assets.mjs. */
  assetsScript?: string
  /** OpenRouter key for the image-model path. */
  openrouterKey?: string
  /** Cheap image model id, e.g. google/gemini-3.1-flash-lite-image. */
  imageModel?: string
  /** BrandBrain search endpoint, when the platform is reachable. */
  brandbrainUrl?: string
  /** Directory downloads land in. */
  into: string
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

/**
 * Replace local image references with data URIs.
 *
 * The model is asked to write `src="images/hero.jpg"`; this turns that into the
 * bytes, so the delivered file is one self-contained document. Anything that does
 * not resolve to a file under `dir` is left exactly as written, and reported:
 * an <img> pointing at a path the page cannot load is the exact failure this
 * whole step exists to prevent, so it is never silently passed through.
 */
export function inlineLocalImages(
  html: string,
  dir: string,
  { maxBytes = 900_000 }: { maxBytes?: number } = {}
): { html: string; inlined: string[]; unresolved: string[]; skippedTooLarge: string[] } {
  const inlined: string[] = []
  const unresolved: string[] = []
  const skippedTooLarge: string[] = []
  let out = html

  for (const match of html.matchAll(/src=(["'])([^"']+)\1/g)) {
    const [, quote, src] = match
    if (!src || /^(https?:|data:|blob:|#)/i.test(src)) continue
    const candidate = path.resolve(dir, src)
    // Refuse anything that escapes the loop directory.
    if (!candidate.startsWith(path.resolve(dir) + path.sep)) {
      unresolved.push(src)
      continue
    }
    if (!fs.existsSync(candidate)) {
      unresolved.push(src)
      continue
    }
    const bytes = fs.readFileSync(candidate)
    if (bytes.byteLength > maxBytes) {
      skippedTooLarge.push(src)
      continue
    }
    const mime = MIME[path.extname(candidate).toLowerCase()] ?? 'application/octet-stream'
    const dataUri = `data:${mime};base64,${bytes.toString('base64')}`
    out = out.split(`${quote}${src}${quote}`).join(`${quote}${dataUri}${quote}`)
    inlined.push(src)
  }

  return { html: out, inlined, unresolved, skippedTooLarge }
}

/** Run a command and capture stdout, without throwing on a non-zero exit. */
function run(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c) => (stdout += String(c)))
    child.stderr.on('data', (c) => (stderr += String(c)))
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }))
  })
}

/**
 * Search the open collections and download the first result.
 *
 * `--json` keeps the parse mechanical, and the design skill's own `--get` does
 * the licence-checked download plus the credit record, so nothing here has to
 * re-implement provenance.
 */
export async function sourceOpenCollection(request: ImageRequest, sources: ImageSources): Promise<SourcedImage | undefined> {
  const script = sources.assetsScript
  if (!script || !fs.existsSync(script)) return undefined
  fs.mkdirSync(sources.into, { recursive: true })

  const searched = await run(
    'node',
    [script, request.query, '--limit', '4', '--min-width', '900', '--json', '--no-check'],
    sources.into
  )
  if (searched.code !== 0) return undefined

  // The skill reports per source: `{ sources: [{ source, items: [{ ref, … }] }] }`.
  // Flatten across sources in the order the skill ranked them, keeping only the
  // refs its own `--get` can resolve.
  let results: { ref?: string; title?: string }[]
  try {
    const parsed = JSON.parse(searched.stdout) as {
      sources?: { items?: { ref?: string; title?: string }[] }[]
    }
    results = (parsed.sources ?? []).flatMap((source) => source.items ?? [])
  } catch {
    return undefined
  }

  for (const result of results) {
    const ref = result.ref
    if (!ref) continue
    const before = listFiles(sources.into)
    const fetched = await run('node', [
      script,
      '--get',
      String(ref),
      '--to',
      sources.into,
      '--name',
      path.basename(request.fileName),
    ])
    if (fetched.code !== 0) continue
    // The skill normalises the extension to the format it actually downloaded
    // (`hero.jpg` lands as `hero-jpg.jpg`), so the file to use is whatever
    // appeared, not the name we asked for. Assuming the name is how a page ends
    // up with an <img> pointing at a path that was never written.
    const landed = listFiles(sources.into).filter((f) => !before.includes(f))
    const target = landed[0]
    if (!target) continue
    const credit = creditFor(sources.into, path.basename(target))
    const { size } = fs.statSync(target)
    return {
      ...request,
      fileName: path.basename(target),
      path: target,
      bytes: size,
      source: 'open-collection',
      licence: credit?.license,
      creator: credit?.creator,
      page: credit?.sourcePage,
      credit: credit
        ? `${credit.title ?? 'photograph'} — ${credit.creator ?? 'unknown'}, ${credit.license ?? 'licence unrecorded'}`
        : undefined,
    }
  }
  return undefined
}

/** File names directly inside a directory (no recursion). */
function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => !name.endsWith('.json') && !name.startsWith('.'))
    .map((name) => path.join(dir, name))
}

/** The skill records provenance in credits.json next to the downloads. */
function creditFor(
  dir: string,
  fileName: string
): { title?: string; creator?: string; license?: string; sourcePage?: string } | undefined {
  try {
    const records = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8')) as {
      file?: string
      title?: string
      creator?: string
      license?: string
      page?: string
      sourceUrl?: string
    }[]
    const hit = records.find((r) => r.file === fileName)
    if (!hit) return undefined
    return {
      title: hit.title,
      creator: hit.creator,
      license: hit.license,
      sourcePage: hit.page ?? hit.sourceUrl,
    }
  } catch {
    return undefined
  }
}

/**
 * Generate an image with a cheap image model through OpenRouter.
 *
 * Refuses to start without a positive balance: a run that discovers the balance
 * is gone by generating four images and failing on the fourth is worse than one
 * that says so up front.
 */
export async function sourceImageModel(request: ImageRequest, sources: ImageSources): Promise<SourcedImage | undefined> {
  const key = sources.openrouterKey
  const model = sources.imageModel
  if (!key || !model) return undefined

  const balance = await openrouterBalance(key)
  if (balance === null || balance <= 0.05) return undefined

  fs.mkdirSync(sources.into, { recursive: true })
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: request.query }],
      modalities: ['image', 'text'],
    }),
  })
  if (!response.ok) return undefined

  const body = (await response.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[]
  }
  const url = body.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) return undefined

  const image = await fetch(url)
  if (!image.ok) return undefined
  const bytes = Buffer.from(await image.arrayBuffer())
  const target = path.join(sources.into, path.basename(request.fileName))
  fs.writeFileSync(target, bytes)
  return { ...request, path: target, bytes: bytes.byteLength, source: 'image-model' }
}

async function openrouterBalance(key: string): Promise<number | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { data?: { total_credits?: number; total_usage?: number } }
    const total = data.data?.total_credits ?? 0
    const used = data.data?.total_usage ?? 0
    return total - used
  } catch {
    return null
  }
}

/**
 * Source one image, trying the chain in cost order and reporting which rung
 * answered. The rung is recorded so a run that silently fell back to stock
 * photography is visible in the report rather than assumed.
 */
export async function sourceImage(
  request: ImageRequest,
  sources: ImageSources
): Promise<{ image?: SourcedImage; attempted: string[]; reason?: string }> {
  const attempted: string[] = []

  if (sources.brandbrainUrl) {
    attempted.push('brandbrain')
    const branded = await sourceBrandAsset(request, sources)
    if (branded) return { image: branded, attempted }
  }
  if (sources.imageModel && sources.openrouterKey) {
    attempted.push('image-model')
    const generated = await sourceImageModel(request, sources)
    if (generated) return { image: generated, attempted }
  }
  attempted.push('open-collection')
  const collected = await sourceOpenCollection(request, sources)
  if (collected) return { image: collected, attempted }

  return { attempted, reason: 'no source returned an image' }
}

/** BrandBrain search, when the platform is reachable. */
async function sourceBrandAsset(request: ImageRequest, sources: ImageSources): Promise<SourcedImage | undefined> {
  if (!sources.brandbrainUrl) return undefined
  try {
    const url = new URL('/api/search', sources.brandbrainUrl)
    url.searchParams.set('q', request.query)
    const response = await fetch(url)
    if (!response.ok) return undefined
    const body = (await response.json()) as { results?: { logoUrl?: string; name?: string; sourceUrl?: string }[] }
    const hit = body.results?.find((r) => typeof r.logoUrl === 'string')
    if (!hit?.logoUrl) return undefined
    const image = await fetch(hit.logoUrl)
    if (!image.ok) return undefined
    const bytes = Buffer.from(await image.arrayBuffer())
    fs.mkdirSync(sources.into, { recursive: true })
    const ext = path.extname(new URL(hit.logoUrl).pathname) || '.png'
    const target = path.join(sources.into, `${path.basename(request.fileName, path.extname(request.fileName))}${ext}`)
    fs.writeFileSync(target, bytes)
    return { ...request, path: target, bytes: bytes.byteLength, source: 'brandbrain', page: hit.sourceUrl }
  } catch {
    return undefined
  }
}

/**
 * Turn the artefact into a search query.
 *
 * The words come from what the page is about: its headline, its title, and the
 * nouns in its headings. "dashboard" produces stock dashboards; "See every
 * request" produces observability photographs, which is the difference between a
 * picture that belongs and one that decorates.
 */
export function queryFromArtifact(html: string): string {
  const headline = /<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i.exec(html)?.[1] ?? ''
  const title = /<title[^>]*>([\s\S]{0,120}?)<\/title>/i.exec(html)?.[1] ?? ''
  const headings = [...html.matchAll(/<h[23][^>]*>([\s\S]{0,120}?)<\/h[23]>/gi)]
    .map((m) => stripTags(m[1] ?? ''))
    .filter((t) => t.length > 3)
    .slice(0, 4)

  const text = stripTags([headline, ...headings].join(' '))
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'our', 'you', 'are', 'was', 'has', 'have',
    'not', 'but', 'all', 'can', 'will', 'one', 'two', 'see', 'get', 'new', 'use', 'how', 'why', 'what', 'when',
  ])
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .slice(0, 6)
  const subject = title ? stripTags(title) : 'technology'
  return [...words, subject].join(' ').slice(0, 120)
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The note handed to the model so it composes the pictures it is given. */
export function imageBrief(files: { fileName: string; credit?: string }[]): string {
  if (files.length === 0) return ''
  const lines = files.map((f) => `- images/${f.fileName}${f.credit ? ` — ${f.credit}` : ''}`)
  return [
    '## Pictures are available',
    'These files sit next to this page in the `images/` folder. Reference them with a',
    'relative path, exactly as named, in a real `<img src="...">`:',
    ...lines,
    '',
    'Choose one that belongs to what the page is about, give it a real `alt` describing',
    'it, and let it carry the composition rather than sit in a grid of equal boxes. The',
    'delivered file is inlined for you — a path that does not resolve is worse than no',
    'picture at all.',
  ].join('\n')
}
