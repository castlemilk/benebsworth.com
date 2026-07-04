// Re-inline external CDN dependencies (three.js, tailwind, …) into every
// generated HTML artifact in results.json so the sandboxed demo iframes are
// fully self-contained and need ZERO network access — they then render under
// any CSP, including a tight one with no CDN hosts in script-src.
//
// The live harness already inlines deps per run, but the SEEDED sample outputs
// (scripts/sample-outputs.json → seed-mock-results.mjs) bypass that step and
// keep raw CDN <script src> tags, which a strict CSP blocks (THREE undefined,
// unstyled Tailwind). This pass fixes them in place.
//
// Usage: node scripts/inline-benchmark-outputs.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'

// The inliner is TypeScript; run this script via tsx (see package.json script).
const { inlineDependenciesAsync } = await import('../lib/lab/llm-benchmark/sandbox/inline-dependencies.ts')

// Some artifacts ship a `<script type="text/babel">` React app that relies on
// Babel Standalone transpiling JSX in the browser — which needs `unsafe-eval`,
// deliberately absent from the hardened CSP, so the app never renders. Compile
// the JSX to plain React.createElement calls at build time (esbuild, classic
// runtime → the inlined React global) so the demo runs without any eval.
async function transpileBabelBlocks(html) {
  const re = /<script\b[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/gi
  const blocks = [...html.matchAll(re)]
  if (blocks.length === 0) return { html, count: 0 }
  let out = ''
  let last = 0
  let count = 0
  for (const m of blocks) {
    out += html.slice(last, m.index)
    try {
      const { code } = await transform(m[1], {
        loader: 'jsx',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
      })
      out += `<script>\n${code}</script>`
      count++
    } catch (err) {
      console.warn(`  babel-transpile failed: ${err instanceof Error ? err.message : String(err)}`)
      out += m[0] // leave as-is on failure
    }
    last = m.index + m[0].length
  }
  out += html.slice(last)
  return { html: out, count }
}

// Once every text/babel block has been pre-compiled, an inlined Babel
// Standalone runtime (~2.4MB) is dead weight — nothing left for it to
// transpile. Strip any huge script block carrying its signature so the stored
// artifact (and the JSON the demo fetches) stays a sane size.
function stripBabelStandalone(html) {
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let out = ''
  let last = 0
  let stripped = 0
  let m
  while ((m = re.exec(html)) !== null) {
    const body = m[1]
    const isBabelRuntime =
      body.length > 100_000 && (body.includes('@babel/standalone') || body.includes('transformScriptTags'))
    out += html.slice(last, m.index)
    if (isBabelRuntime) stripped++
    else out += m[0]
    last = m.index + m[0].length
  }
  out += html.slice(last)
  return { html: out, stripped }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = resolve(root, 'lib/lab/llm-benchmark/results.json')
const results = JSON.parse(readFileSync(path, 'utf8'))

const HTML_RE = /<html[\s>]|<!doctype|<head>|<body>|<script\b|<canvas\b|<svg\b/i
let changed = 0
let touched = 0

for (const r of results) {
  const out = r.output
  if (!out || !HTML_RE.test(out)) continue
  touched++
  try {
    const res = await inlineDependenciesAsync(out)
    let next = res.output
    const babel = await transpileBabelBlocks(next)
    next = babel.html
    // Only strip the Babel runtime if every text/babel block compiled — a
    // leftover block still needs it (and shows the "can't render" note anyway).
    let strippedRuntime = 0
    if (babel.count > 0 && !/type=["']text\/babel["']/i.test(next)) {
      const strip = stripBabelStandalone(next)
      next = strip.html
      strippedRuntime = strip.stripped
    }
    if (next !== out) {
      r.output = next
      changed++
    }
    if (res.inlined.length || res.failed.length || res.removed.length || babel.count || strippedRuntime) {
      console.log(
        `${r.taskId}/${r.modelId}: inlined ${res.inlined.length}, removed ${res.removed.length}, failed ${res.failed.length}, jsx-compiled ${babel.count}, babel-runtime-stripped ${strippedRuntime}` +
          (res.failed.length ? ` [${res.failed.join(', ')}]` : ''),
      )
    }
  } catch (err) {
    console.warn(`${r.taskId}/${r.modelId}: inline failed — ${err instanceof Error ? err.message : String(err)}`)
  }
}

writeFileSync(path, JSON.stringify(results, null, 2) + '\n')
console.log(`\nProcessed ${touched} HTML outputs; rewrote ${changed}.`)

// Warn about any output that STILL references an external CDN script at runtime.
const stragglers = []
for (const r of results) {
  const o = r.output || ''
  const m = [...o.matchAll(/<script[^>]+src=["']?(https?:\/\/[^"'\s>]+)/gi)].map((x) => x[1])
  if (m.length) stragglers.push(`${r.taskId}/${r.modelId}: ${m.join(', ')}`)
}
if (stragglers.length) {
  console.warn(`\n⚠️  ${stragglers.length} output(s) still load external <script src> (CSP-fragile):`)
  for (const s of stragglers) console.warn('   ' + s)
} else {
  console.log('\n✓ No output loads an external <script src> — all self-contained.')
}
