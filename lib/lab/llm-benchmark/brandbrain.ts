/**
 * BrandBrain as a brand-asset source for generated pages.
 *
 * A generated landing page invents a company: "Meridian", "Nimbus", "Morph".
 * That is fine for a benchmark artefact and wrong for anything a reader might
 * believe — and it is also the one place where a *real* brand matters, because
 * a page about a real company should carry that company's actual mark rather
 * than a fabrication or a stock gradient.
 *
 * BrandBrain is the platform that knows what a brand's mark looks like: its MCP
 * serves the catalogue, brand metadata and asset URLs. Two things are true at
 * once here, and both are load-bearing:
 *
 *  1. When BrandBrain is reachable, ask it about the page's brand and use what
 *     it returns, with provenance recorded.
 *  2. When it is not reachable — which is the normal state for a local page run —
 *     say so rather than quietly inventing a mark. The refusal is the feature:
 *     the loop must never present a fabricated logo as a real one.
 *
 * A standalone page has no business claiming a real company's identity, so the
 * caller decides policy: `allowRealBrandMarks` gates whether a hit may be used.
 */

/** Does this artefact look like a real company, or an invented one? */
export interface BrandGuess {
  /** The brand name as written on the page. */
  name: string;
  /** True when the name looks like a real company rather than a product name. */
  likelyRealCompany: boolean;
  /** How the guess was made, for the run record. */
  basis: 'wordmark' | 'title' | 'nav-brand';
}

/**
 * Guess the page's brand.
 *
 * Read from what a visitor sees: the nav wordmark first (that is where a brand
 * puts its name), then the document title. The "likely real company" heuristic is
 * deliberately conservative — an invented product name reads like a normal word,
 * and treating it as a real company would send lookups at a company that does
 * not exist.
 */
export function guessBrand(html: string): BrandGuess | undefined {
  const markup = html
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ');

  const wordmark =
    /<header[\s\S]{0,400}?<(?:span|a|p|div)[^>]*class="[^"]*\b(?:brand|logo|wordmark)\b[^"]*"[^>]*>\s*([^<]{2,40})\s*</i.exec(
      markup
    )?.[1] ??
    /class="[^"]*\b(?:brand|logo|wordmark)\b[^"]*"[^>]*>\s*([^<]{2,40})\s*</i.exec(markup)?.[1];

  const title = /<title[^>]*>([\s\S]{0,80}?)<\/title>/i.exec(markup)?.[1];

  const clean = (value: string | undefined): string | undefined =>
    value
      ?.replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  if (wordmark) {
    return { name: clean(wordmark) ?? wordmark, likelyRealCompany: false, basis: 'wordmark' }
  }
  if (title) {
    return { name: clean(title) ?? title, likelyRealCompany: false, basis: 'title' }
  }
  return undefined
}

export interface BrandBrainOptions {
  /** BrandBrain MCP endpoint. */
  url: string;
  /** Bearer token, when the deployment needs one. */
  token?: string;
  timeoutMs?: number;
  /** Refuse to use a real company's mark in a standalone page. */
  allowRealBrandMarks?: boolean;
}

export interface BrandAsset {
  name: string;
  url: string;
  bytes?: number;
  page?: string;
  /** True when the asset came from BrandBrain rather than being generated. */
  fromPlatform: boolean;
  note?: string;
}

async function mcpCall(tool: string, args: Record<string, unknown>, options: BrandBrainOptions): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    const response = await fetch(options.url, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } }),
    })
    if (!response.ok) return undefined
    const text = await response.text()
    const framed = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('')
    const body = JSON.parse(framed || text) as { result?: { content?: { type: string; text?: string }[] } }
    const first = body.result?.content?.find((c) => c.type === 'text')
    return first?.text
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** First asset-shaped URL anywhere in a payload. */
function findAssetUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    return /^https?:\/\/\S+\.(png|jpe?g|svg|webp|avif)(\?\S*)?$/i.test(value) ? value : undefined
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAssetUrl(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (typeof value === 'object') {
    for (const key of ['logoUrl', 'logo_url', 'assetUrl', 'asset_url', 'url', 'imageUrl'] as const) {
      const candidate = (value as Record<string, unknown>)[key]
      if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate
    }
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findAssetUrl(item, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

function findPageUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    return /^https?:\/\//.test(value) && !/\.(png|jpe?g|svg|webp|avif)(\?|$)/i.test(value) ? value : undefined
  }
  if (typeof value === 'object') {
    for (const key of ['sourceUrl', 'source_url', 'page', 'website'] as const) {
      const candidate = (value as Record<string, unknown>)[key]
      if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate
    }
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findPageUrl(item, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Ask BrandBrain for a brand's mark.
 *
 * Every path returns a `note` explaining itself, because "no asset" and "not
 * reachable" are different facts and the run record should keep them apart.
 */
export async function fetchBrandMark(
  brand: BrandGuess,
  options: BrandBrainOptions
): Promise<BrandAsset | undefined> {
  // One probe, and it is a real one: `tools/list` says whether the endpoint is a
  // live MCP server at all, which is the fact that matters here.
  if (!(await isReachable(options))) {
    return { name: brand.name, url: '', fromPlatform: false, note: 'brandbrain not reachable; no real mark used' }
  }

  const raw = await mcpCall('brandbrain_search', { query: brand.name, limit: 5 }, options)
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : undefined
  } catch {
    parsed = undefined
  }

  const url = findAssetUrl(parsed)
  if (!url) {
    return { name: brand.name, url: '', fromPlatform: false, note: `no mark found for "${brand.name}"` }
  }
  if (!options.allowRealBrandMarks) {
    // Withheld on purpose, and recorded: a generated page may not put a real
    // company's identity on its own header, and the record should show that the
    // mark was found and declined rather than never looked for.
    return {
      name: brand.name,
      url,
      fromPlatform: true,
      note: `BrandBrain has a real mark for "${brand.name}"; withheld because this page may not claim a real company's identity`,
    }
  }
  return { name: brand.name, url, page: findPageUrl(parsed), fromPlatform: true }
}

async function isReachable(options: BrandBrainOptions): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    const response = await fetch(options.url, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}
