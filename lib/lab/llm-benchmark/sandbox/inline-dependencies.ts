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
  {
    url: 'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
    aliases: [
      'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
      'https://unpkg.com/react@18/umd/react.production.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
    ],
    type: 'script',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
    aliases: [
      'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
      'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
    ],
    type: 'script',
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

async function prefetchAll(urls: Iterable<string>): Promise<void> {
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

const REACT_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
]

function detectReactUsage(html: string): boolean {
  let usesReact = false
  html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_match, code: string) => {
    if (/\bReact\b/.test(code)) usesReact = true
    return ''
  })
  return usesReact
}

async function ensureReactGlobals(
  html: string,
  inlined: string[],
  failed: string[],
  warnings: string[]
): Promise<string> {
  if (!detectReactUsage(html)) return html

  const alreadyInlined = new Set(inlined)
  const needed = REACT_SCRIPTS.filter((url) => !alreadyInlined.has(url))
  if (needed.length === 0) return html

  await prefetchKnown(needed)

  const blocks: string[] = []
  for (const url of needed) {
    const content = fetchCache.get(url)
    if (content === undefined) {
      failed.push(url)
      warnings.push(`could not fetch ${url} for React global injection`)
      continue
    }
    inlined.push(url)
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
    return (
      html.slice(0, headMatch.index + headMatch[0].length) +
      '\n' +
      block +
      html.slice(headMatch.index + headMatch[0].length)
    )
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

      // import * as React from 'react'
      rewritten = rewritten.replace(
        /import\s+\*\s+as\s+React\s+from\s+["'][^"']*react[^"']*["'];?/gi,
        'const React = window.React;'
      )

      // import React from 'react'
      rewritten = rewritten.replace(
        /import\s+React\s+from\s+["'][^"']*react[^"']*["'];?/gi,
        'const React = window.React;'
      )

      // import { useState, ... } from 'react'
      rewritten = rewritten.replace(
        /import\s+\{\s*([^}]+)\s*\}\s+from\s+["'][^"']*react["'][^;]*;?/gi,
        (_importMatch, names: string) => {
          const bindings = names
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
          return `const { ${bindings.join(', ')} } = window.React;`
        }
      )

      // import ReactDOM from 'react-dom' or 'react-dom/client'
      rewritten = rewritten.replace(
        /import\s+ReactDOM\s+from\s+["'][^"']*react-dom[^"']*["'];?/gi,
        'const ReactDOM = window.ReactDOM;'
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
              assignments.push(`const ${name} = ${globalRef}`)
            } else {
              warnings.push(`unsupported Three.js module import: ${name}`)
              assignments.push(`const ${name} = undefined`)
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

  // 1. Collect all external script / stylesheet URLs, resolving known aliases
  // (e.g. unpkg three.module.js) to their canonical classic-build URL BEFORE
  // fetching — inlining an ES-module build as a classic script is a guaranteed
  // syntax error. Unknown URLs are still fetched and inlined so models that
  // pull in React, Vue, etc. from arbitrary CDNs continue to work.
  const scriptFetch = new Map<string, string>() // original src -> fetch url
  const styleFetch = new Map<string, string>() // original href -> fetch url

  rewritten.replace(
    /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>(?:<\/script>)?/gi,
    (_match, src: string) => {
      const absolute = resolveUrl(src, 'https://example.com/')
      if (absolute && isExternalUrl(absolute)) {
        scriptFetch.set(src, URL_MAP.get(normalizeUrl(absolute)) ?? absolute)
      } else {
        removed.push(src)
      }
      return ''
    }
  )

  rewritten.replace(
    /<link\b[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["']([^"']+)["'][^>]*>/gi,
    (_match, href: string) => {
      const absolute = resolveUrl(href, 'https://example.com/')
      if (absolute && isExternalUrl(absolute)) {
        styleFetch.set(href, URL_MAP.get(normalizeUrl(absolute)) ?? absolute)
      } else {
        removed.push(href)
      }
      return ''
    }
  )

  // 2. Fetch every external resource in parallel (aliases collapse to one fetch).
  const allUrls = new Set<string>([...scriptFetch.values(), ...styleFetch.values()])
  await prefetchAll(allUrls)

  // 3. Inline all <script src> and <link rel="stylesheet"> tags. Each canonical
  // URL is inlined at most once — duplicate CDN tags (models often list both
  // unpkg and cdnjs copies of three.js) would otherwise redefine globals.
  const alreadyInlined = new Set<string>()
  rewritten = rewritten.replace(
    /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>(?:<\/script>)?/gi,
    (match, beforeAttrs: string, src: string, afterAttrs: string) => {
      const fetchUrl = scriptFetch.get(src)
      if (!fetchUrl) return ''
      if (alreadyInlined.has(fetchUrl)) {
        removed.push(src)
        return ''
      }
      const content = fetchCache.get(fetchUrl)
      if (content === undefined) {
        if (URL_MAP.has(normalizeUrl(fetchUrl))) failed.push(fetchUrl)
        else removed.push(src)
        return ''
      }
      alreadyInlined.add(fetchUrl)
      inlined.push(fetchUrl)
      // Known canonical URLs are classic builds. Unknown module scripts keep
      // their module semantics — self-contained ESM still runs; one that
      // imports bare specifiers would fail, but classic-inlining it would
      // guarantee failure instead.
      const isModule = /\btype=["']module["']/i.test(beforeAttrs + afterAttrs)
      const typeAttr = isModule && !URL_MAP.has(normalizeUrl(fetchUrl)) ? ' type="module"' : ''
      return `<script${typeAttr}>\n${content}\n</script>`
    }
  )

  rewritten = rewritten.replace(
    /<link\b[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      const fetchUrl = styleFetch.get(href)
      if (!fetchUrl) return ''
      if (alreadyInlined.has(fetchUrl)) {
        removed.push(href)
        return ''
      }
      const content = fetchCache.get(fetchUrl)
      if (content === undefined) {
        if (URL_MAP.has(normalizeUrl(fetchUrl))) failed.push(fetchUrl)
        else removed.push(href)
        return ''
      }
      alreadyInlined.add(fetchUrl)
      inlined.push(fetchUrl)
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

  // 5. Ensure Three.js / React globals exist if the artifact uses modules
  // (must happen before rewriting module imports so the globals are already
  // injected ahead of any <script type="module">).
  rewritten = await ensureThreeGlobals(rewritten, inlined, failed, warnings)
  rewritten = await ensureReactGlobals(rewritten, inlined, failed, warnings)

  // 6. Rewrite module imports and import maps for CSP-safe globals.
  const moduleRewrite = rewriteModuleScripts(rewritten, [])
  rewritten = moduleRewrite.html
  warnings.push(...moduleRewrite.warnings)

  // 7. Strip remaining external CSS @imports.
  rewritten = await rewriteCssImports(rewritten, inlined, failed, removed)

  return { output: rewritten, inlined, failed, removed, warnings }
}
