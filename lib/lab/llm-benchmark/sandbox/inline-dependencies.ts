/**
 * Dependency sandbox for generated benchmark artifacts.
 *
 * Many models emit single-file HTML pages that load external libraries from
 * CDNs (Three.js, Tailwind, fonts, etc.). Inside a blob iframe those requests
 * are governed by the parent page's CSP, which blocks most third-party origins.
 *
 * This module rewrites common external <script src> and <link rel="stylesheet">
 * references to inline the fetched content directly into the HTML, producing a
 * self-contained artifact that renders without extra CSP exemptions.
 *
 * It also performs a small amount of "intelligent" compatibility rewriting:
 *   - ES module imports for known libraries are converted to global references.
 *   - Import maps are removed and any missing global library scripts are
 *     injected so the rewritten globals actually exist.
 *   - Google Fonts / preconnect / preload links and CSS @imports are stripped.
 */

export interface DependencyRewriteResult {
  output: string
  inlined: string[]
  failed: string[]
  removed: string[]
  warnings: string[]
}

interface KnownDependency {
  /** Canonical origin URL. */
  url: string
  /** Additional URL patterns that map to the same resource. */
  aliases?: string[]
  /** Content-Type hint when fetching. */
  type: 'script' | 'stylesheet'
}

const THREE_VERSION = '0.128.0'

const THREE_CDN_BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`

const KNOWN_DEPENDENCIES: KnownDependency[] = [
  {
    url: `${THREE_CDN_BASE}/build/three.min.js`,
    aliases: [
      `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`,
      `https://unpkg.com/three@${THREE_VERSION}/build/three.min.js`,
      `https://unpkg.com/three@0.160.0/build/three.min.js`,
      `https://unpkg.com/three@0.160.0/build/three.module.js`,
    ],
    type: 'script',
  },
  {
    url: `${THREE_CDN_BASE}/examples/js/controls/OrbitControls.js`,
    aliases: [
      `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls.js`,
      `https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js`,
    ],
    type: 'script',
  },
  {
    url: `${THREE_CDN_BASE}/examples/js/loaders/GLTFLoader.js`,
    aliases: [
      `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js`,
      `https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js`,
    ],
    type: 'script',
  },
  {
    url: `${THREE_CDN_BASE}/examples/js/loaders/OBJLoader.js`,
    aliases: [
      `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/OBJLoader.js`,
      `https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js`,
    ],
    type: 'script',
  },
  {
    url: `${THREE_CDN_BASE}/examples/js/loaders/FontLoader.js`,
    aliases: [
      `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/FontLoader.js`,
      `https://unpkg.com/three@0.160.0/examples/jsm/loaders/FontLoader.js`,
    ],
    type: 'script',
  },
  {
    url: `${THREE_CDN_BASE}/examples/js/geometries/TextGeometry.js`,
    aliases: [
      `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/geometries/TextGeometry.js`,
      `https://unpkg.com/three@0.160.0/examples/jsm/geometries/TextGeometry.js`,
    ],
    type: 'script',
  },
  {
    url: 'https://cdn.tailwindcss.com',
    aliases: ['https://cdn.tailwindcss.com/'],
    type: 'stylesheet',
  },
]

const THREE_GLOBAL_ALIASES: Record<string, string> = {
  THREE: 'window.THREE',
  OrbitControls: 'window.THREE.OrbitControls',
  GLTFLoader: 'window.THREE.GLTFLoader',
  OBJLoader: 'window.THREE.OBJLoader',
  FontLoader: 'window.THREE.FontLoader',
  TextGeometry: 'window.THREE.TextGeometry',
}

// Map common addon import paths (used in import maps / ES modules) to the
// canonical global script that defines them on window.THREE.
const ADDON_IMPORT_TO_SCRIPT: Record<string, string> = {
  'controls/OrbitControls.js': `${THREE_CDN_BASE}/examples/js/controls/OrbitControls.js`,
  'loaders/GLTFLoader.js': `${THREE_CDN_BASE}/examples/js/loaders/GLTFLoader.js`,
  'loaders/OBJLoader.js': `${THREE_CDN_BASE}/examples/js/loaders/OBJLoader.js`,
  'loaders/FontLoader.js': `${THREE_CDN_BASE}/examples/js/loaders/FontLoader.js`,
  'geometries/TextGeometry.js': `${THREE_CDN_BASE}/examples/js/geometries/TextGeometry.js`,
}

function normalizeUrl(url: string): string {
  return url.replace(/^https:\/\//, 'https://').replace(/\/$/, '')
}

function buildUrlMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const dep of KNOWN_DEPENDENCIES) {
    map.set(normalizeUrl(dep.url), dep.url)
    for (const alias of dep.aliases ?? []) {
      map.set(normalizeUrl(alias), dep.url)
    }
  }
  return map
}

const URL_MAP = buildUrlMap()

async function fetchDependency(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept:
          url.endsWith('.js')
            ? 'application/javascript,*/*'
            : 'text/css,*/*',
      },
    })
    if (!res.ok) return undefined
    return await res.text()
  } catch {
    return undefined
  }
}

function resolveUrl(maybeRelative: string, base: string): string | undefined {
  try {
    return new URL(maybeRelative, base).href
  } catch {
    return undefined
  }
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && !url.startsWith('data:')
}

// A tiny in-memory cache so repeated rewrites in the same process reuse fetches.
const fetchCache = new Map<string, string | undefined>()

async function prefetchKnown(urls: Iterable<string>): Promise<void> {
  const pending: Promise<void>[] = []
  for (const url of urls) {
    pending.push(
      (async () => {
        if (!fetchCache.has(url)) {
          fetchCache.set(url, await fetchDependency(url))
        }
      })()
    )
  }
  await Promise.all(pending)
}

interface ThreeUsage {
  usesThree: boolean
  addonScripts: Set<string>
}

function detectThreeUsage(html: string): ThreeUsage {
  const addonScripts = new Set<string>()
  let usesThree = false

  // Import map imports.
  html.replace(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi, (_match, json: string) => {
    try {
      const map: { imports?: Record<string, string> } = JSON.parse(json)
      for (const [key, url] of Object.entries(map.imports ?? {})) {
        if (key === 'three' || key.startsWith('three/')) {
          usesThree = true
          if (key.startsWith('three/addons/')) {
            const addonPath = key.replace('three/addons/', '')
            const script = ADDON_IMPORT_TO_SCRIPT[addonPath]
            if (script) addonScripts.add(script)
          }
          const mappedScript = ADDON_IMPORT_TO_SCRIPT[Object.keys(ADDON_IMPORT_TO_SCRIPT).find((p) => url.includes(p)) ?? '']
          if (mappedScript) addonScripts.add(mappedScript)
        }
      }
    } catch {
      // ignore malformed importmap
    }
    return ''
  })

  // ES module imports.
  html.replace(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (_match, code: string) => {
    const importRe = /import\s+.*?from\s+["']([^"']+)["'];?/gi
    let m: RegExpExecArray | null
    while ((m = importRe.exec(code)) !== null) {
      const source = m[1]
      if (/three/.test(source)) {
        usesThree = true
        const addonPath = Object.keys(ADDON_IMPORT_TO_SCRIPT).find((p) => source.includes(p))
        if (addonPath) addonScripts.add(ADDON_IMPORT_TO_SCRIPT[addonPath])
      }
    }
    return ''
  })

  // Classic script / link references.
  if (/<script\b[^>]*src=["'][^"']*three[^"']*["']/i.test(html) || /<link\b[^>]*href=["'][^"']*three[^"']*["']/i.test(html)) {
    usesThree = true
  }

  return { usesThree, addonScripts }
}

async function ensureThreeGlobals(
  html: string,
  inlined: string[],
  failed: string[],
  warnings: string[]
): Promise<string> {
  const { usesThree, addonScripts } = detectThreeUsage(html)
  if (!usesThree) return html

  const threeCanonical = `${THREE_CDN_BASE}/build/three.min.js`
  const neededScripts = [threeCanonical, ...addonScripts]
  await prefetchKnown(neededScripts)

  const alreadyInlined = new Set(inlined)
  const blocks: string[] = []

  for (const canonical of neededScripts) {
    if (alreadyInlined.has(canonical)) continue
    const content = fetchCache.get(canonical)
    if (content === undefined) {
      failed.push(canonical)
      warnings.push(`could not fetch ${canonical} for Three.js global injection`)
      continue
    }
    inlined.push(canonical)
    blocks.push(`<script>\n${content}\n</script>`)
  }

  if (blocks.length === 0) return html
  const block = blocks.join('\n') + '\n'

  const firstScript = html.search(/<script\b/i)
  if (firstScript >= 0) {
    return html.slice(0, firstScript) + block + html.slice(firstScript)
  }
  const headMatch = html.match(/<head[^>]*>/i)
  if (headMatch && headMatch.index !== undefined) {
    return html.slice(0, headMatch.index + headMatch[0].length) + '\n' + block + html.slice(headMatch.index + headMatch[0].length)
  }
  return block + html
}

/**
 * Rewrite ES module imports inside <script type="module"> blocks so they
 * reference the globals provided by inlined library scripts instead of
 * fetching remote modules.
 */
function rewriteModuleScripts(
  html: string,
  warnings: string[]
): { html: string; warnings: string[] } {
  let output = html

  // Remove import maps entirely — after rewriting imports they are unused.
  output = output.replace(/<script\b[^>]*\btype=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi, () => {
    warnings.push('removed importmap')
    return ''
  })

  // Rewrite known Three.js module imports to globals.
  output = output.replace(
    /<script\b([^>]*)\btype=["']module["']([^>]*)>([\s\S]*?)<\/script>/gi,
    (match, beforeAttrs: string, afterAttrs: string, code: string) => {
      let rewritten = code

      // import * as THREE from '...'
      rewritten = rewritten.replace(
        /import\s+\*\s+as\s+THREE\s+from\s+["'][^"']*three[^"']*["'];?/gi,
        'const THREE = window.THREE;'
      )

      // import THREE from '...'
      rewritten = rewritten.replace(
        /import\s+THREE\s+from\s+["'][^"']*three[^"']*["'];?/gi,
        'const THREE = window.THREE;'
      )

      // import { OrbitControls, ... } from '...three...'
      rewritten = rewritten.replace(
        /import\s+\{\s*([^}]+)\s*\}\s+from\s+["'][^"']*three[^"']*["'];?/gi,
        (_importMatch, names: string) => {
          const bindings = names
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
          const assignments: string[] = []
          for (const name of bindings) {
            const globalRef = THREE_GLOBAL_ALIASES[name]
            if (globalRef) {
              assignments.push(`${name} = ${globalRef}`)
            } else {
              warnings.push(`unsupported Three.js module import: ${name}`)
              assignments.push(`${name} = undefined`)
            }
          }
          return `const { ${bindings.join(', ')} } = (() => { ${assignments.join('; ')}; return { ${bindings.join(', ')} }; })();`
        }
      )

      // Catch remaining external module imports so we can warn.
      const remainingImports = rewritten.match(/import\s+.*?from\s+["'][^"']+["'];?/gi)
      if (remainingImports) {
        for (const imp of remainingImports) {
          const urlMatch = imp.match(/from\s+["']([^"']+)["']/)
          const url = urlMatch?.[1] ?? 'unknown'
          if (isExternalUrl(url)) {
            warnings.push(`unsupported external module import left intact: ${url}`)
          }
        }
      }

      // Drop type="module" so the script runs as a classic script and can use
      // the inlined globals directly.
      const cleanBefore = beforeAttrs.replace(/\s*type=["']module["']/gi, '').trim()
      const cleanAfter = afterAttrs.replace(/\s*type=["']module["']/gi, '').trim()
      return `<script ${cleanBefore} ${cleanAfter}>\n${rewritten}\n</script>`
    }
  )

  return { html: output, warnings }
}

/**
 * Strip external CSS @import rules (especially Google Fonts) and inline any
 * known dependency stylesheets that were not already converted.
 */
async function rewriteCssImports(
  html: string,
  inlined: string[],
  failed: string[],
  removed: string[]
): Promise<string> {
  let output = html

  const importUrls = new Set<string>()
  output.replace(/@import\s+(?:url\()?["']([^"']+)["']\)?[^;]*;/gi, (_match, url: string) => {
    const absolute = resolveUrl(url, 'https://example.com/')
    if (absolute && URL_MAP.has(normalizeUrl(absolute))) {
      importUrls.add(URL_MAP.get(normalizeUrl(absolute))!)
    } else {
      removed.push(url)
    }
    return ''
  })

  await prefetchKnown(importUrls)

  output = output.replace(/@import\s+(?:url\()?["']([^"']+)["']\)?[^;]*;/gi, (match, url: string) => {
    const absolute = resolveUrl(url, 'https://example.com/')
    const canonical = absolute ? URL_MAP.get(normalizeUrl(absolute)) : undefined
    if (!canonical) return ''
    const content = fetchCache.get(canonical)
    if (content === undefined) {
      failed.push(canonical)
      return ''
    }
    inlined.push(canonical)
    return content
  })

  return output
}

/**
 * Rewrite a generated HTML string so that known external dependencies are
 * inlined and the artifact is as self-contained as possible.
 */
export async function inlineDependenciesAsync(output: string): Promise<DependencyRewriteResult> {
  const inlined: string[] = []
  const failed: string[] = []
  const removed: string[] = []
  const warnings: string[] = []

  let rewritten = output

  // 1. Collect known external scripts / stylesheets.
  const scripts = new Map<string, string>() // canonical -> original src
  const styles = new Map<string, string>()

  rewritten.replace(
    /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>(?:<\/script>)?/gi,
    (_match, src: string) => {
      const absolute = resolveUrl(src, 'https://example.com/')
      const canonical = absolute ? URL_MAP.get(normalizeUrl(absolute)) : undefined
      if (canonical) scripts.set(canonical, src)
      else removed.push(src)
      return ''
    }
  )

  rewritten.replace(
    /<link\b[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["']([^"']+)["'][^>]*>/gi,
    (_match, href: string) => {
      const absolute = resolveUrl(href, 'https://example.com/')
      const canonical = absolute ? URL_MAP.get(normalizeUrl(absolute)) : undefined
      if (canonical) styles.set(canonical, href)
      else removed.push(href)
      return ''
    }
  )

  // 2. Fetch all known dependencies in parallel.
  await prefetchKnown([...scripts.keys(), ...styles.keys()])

  // 3. Inline known <script src> and <link rel="stylesheet"> tags.
  rewritten = rewritten.replace(
    /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>(?:<\/script>)?/gi,
    (match, src: string) => {
      const absolute = resolveUrl(src, 'https://example.com/')
      const canonical = absolute ? URL_MAP.get(normalizeUrl(absolute)) : undefined
      if (!canonical) return ''
      const content = fetchCache.get(canonical)
      if (content === undefined) {
        failed.push(canonical)
        return ''
      }
      inlined.push(canonical)
      return `<script>\n${content}\n</script>`
    }
  )

  rewritten = rewritten.replace(
    /<link\b[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      const absolute = resolveUrl(href, 'https://example.com/')
      const canonical = absolute ? URL_MAP.get(normalizeUrl(absolute)) : undefined
      if (!canonical) return ''
      const content = fetchCache.get(canonical)
      if (content === undefined) {
        failed.push(canonical)
        return ''
      }
      inlined.push(canonical)
      return `<style>\n${content}\n</style>`
    }
  )

  // 4. Remove Google Fonts / preconnect / preload links.
  rewritten = rewritten.replace(
    /<link\b[^>]*?\b(?:rel=["'](?:preconnect|dns-prefetch|preload)["']|href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"]*["'])[^>]*>/gi,
    (match) => {
      const hrefMatch = match.match(/href=["']([^"']+)["']/i)
      removed.push(hrefMatch?.[1] ?? 'external resource')
      return ''
    }
  )

  // 5. Ensure Three.js globals exist if the artifact uses Three.js modules
  // (must happen before rewriting module imports so the globals are already
  // injected ahead of any <script type="module">).
  rewritten = await ensureThreeGlobals(rewritten, inlined, failed, warnings)

  // 6. Rewrite module imports and import maps for CSP-safe globals.
  const moduleRewrite = rewriteModuleScripts(rewritten, [])
  rewritten = moduleRewrite.html
  warnings.push(...moduleRewrite.warnings)

  // 7. Strip remaining external CSS @imports.
  rewritten = await rewriteCssImports(rewritten, inlined, failed, removed)

  return { output: rewritten, inlined, failed, removed, warnings }
}
