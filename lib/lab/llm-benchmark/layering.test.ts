/**
 * Dependency-layering guard.
 *
 * The benchmark harness is a strict DAG with a deliberate layering:
 *
 *     types.ts  →  scorers/**  →  runners/**  →  scripts/*.mjs
 *
 * (arrow = "is imported by"; nothing ever reaches back up). That property is
 * load-bearing: `types.ts` stays importable from anywhere without dragging in
 * Playwright/fs/network code, scorers stay runnable without a provider, and the
 * scripts layer stays the only place that wires everything together. Process
 * discipline is not enough to keep it true, so this test parses the actual
 * import graph and asserts the shape structurally.
 *
 * The checker below is intentionally a handful of small pure functions living
 * IN this test file — it is a guard, not a library, and nothing else should
 * grow a dependency on it.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../../..')
const LIB_DIR = path.relative(REPO_ROOT, HERE) // 'lib/lab/llm-benchmark'
const SCRIPTS_DIR = 'scripts'

/** Repo-relative POSIX path — the identity used for graph nodes and messages. */
type NodeId = string

interface ImportEdge {
  from: NodeId
  to: NodeId
  /** 1-based line of the `from '...'` clause, for failure messages. */
  line: number
  specifier: string
}

// ---------------------------------------------------------------------------
// file collection
// ---------------------------------------------------------------------------

function walk(absDir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (entry.isFile()) out.push(abs)
  }
  return out
}

function toId(abs: string): NodeId {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/')
}

/**
 * Every non-test TypeScript module in the benchmark tree — `.tsx` included.
 *
 * `.tsx` files (plugin demo components) are real modules that can carry real
 * in-tree edges: a demo importing `../../runners/provider` would drag Playwright
 * and node:fs into a client bundle, and a `.ts`-only scan could not see it. The
 * rules below only ever concern IN-TREE edges, so a demo's `react` /
 * `@/components/…` imports stay invisible to the graph exactly as a lib
 * module's do.
 */
function collectLibModules(): NodeId[] {
  return walk(path.join(REPO_ROOT, LIB_DIR))
    .map(toId)
    .filter(
      (id) =>
        (id.endsWith('.ts') || id.endsWith('.tsx')) &&
        !id.endsWith('.test.ts') &&
        !id.endsWith('.test.tsx')
    )
    .sort()
}

/** `scripts/*.mjs` that reach into the benchmark tree. */
function collectBenchmarkScripts(): NodeId[] {
  const dir = path.join(REPO_ROOT, SCRIPTS_DIR)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.mjs'))
    .map((name) => `${SCRIPTS_DIR}/${name}`)
    .filter((id) => readFileSync(path.join(REPO_ROOT, id), 'utf8').includes(LIB_DIR))
    .sort()
}

// ---------------------------------------------------------------------------
// import parsing + resolution
// ---------------------------------------------------------------------------

/**
 * Static text scan for module specifiers. The codebase uses plain static
 * imports (plus one `await import(...)` in a script), so regexes over source
 * text are sufficient and keep this test dependency-free.
 */
function parseSpecifiers(source: string): Array<{ specifier: string; line: number }> {
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g, // import … from 'x' / export … from 'x'
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // import('x')
    /\bimport\s+['"]([^'"]+)['"]/g, // import 'x' (side-effect)
  ]
  const found: Array<{ specifier: string; line: number }> = []
  source.split('\n').forEach((text, i) => {
    if (text.trimStart().startsWith('*') || text.trimStart().startsWith('//')) return
    for (const re of patterns) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) found.push({ specifier: m[1], line: i + 1 })
    }
  })
  return found
}

function isFile(abs: string): boolean {
  try {
    return statSync(abs).isFile()
  } catch {
    return false
  }
}

/**
 * Resolve a RELATIVE specifier to a repo-relative file id. Node builtins,
 * bare packages and `@/…` alias imports (which point outside the benchmark
 * tree) return null and are ignored — only in-tree edges are graphed.
 */
function resolveRelative(fromId: NodeId, specifier: string): NodeId | null {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(REPO_ROOT, path.dirname(fromId), specifier)
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (isFile(candidate)) return toId(candidate)
  }
  return null
}

function buildGraph(nodes: NodeId[]): { edges: ImportEdge[]; unresolved: string[] } {
  const nodeSet = new Set(nodes)
  const edges: ImportEdge[] = []
  const unresolved: string[] = []
  for (const from of nodes) {
    const source = readFileSync(path.join(REPO_ROOT, from), 'utf8')
    for (const { specifier, line } of parseSpecifiers(source)) {
      if (!specifier.startsWith('.')) continue
      const to = resolveRelative(from, specifier)
      if (to === null) {
        unresolved.push(`${from}:${line} → '${specifier}' (no such file)`)
        continue
      }
      // JSON data files are leaves, not modules — they can't create a cycle.
      if (to.endsWith('.json')) continue
      // Graph anything in the tracked node set, plus ANY scripts/ file, so an
      // upward (lib → scripts) import is caught even if that script itself
      // doesn't touch the benchmark tree.
      if (nodeSet.has(to) || to.startsWith(`${SCRIPTS_DIR}/`)) {
        edges.push({ from, to, line, specifier })
      }
    }
  }
  return { edges, unresolved }
}

// ---------------------------------------------------------------------------
// Tarjan SCC
// ---------------------------------------------------------------------------

/** Strongly-connected components; a DAG yields only singletons. */
function tarjan(nodes: NodeId[], edges: ImportEdge[]): NodeId[][] {
  const adj = new Map<NodeId, NodeId[]>()
  for (const n of nodes) adj.set(n, [])
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.from)!.push(e.to)
  }

  const index = new Map<NodeId, number>()
  const low = new Map<NodeId, number>()
  const onStack = new Set<NodeId>()
  const stack: NodeId[] = []
  const components: NodeId[][] = []
  let counter = 0

  const strongConnect = (v: NodeId): void => {
    index.set(v, counter)
    low.set(v, counter)
    counter += 1
    stack.push(v)
    onStack.add(v)
    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) {
        strongConnect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: NodeId[] = []
      let w: NodeId
      do {
        w = stack.pop()!
        onStack.delete(w)
        component.push(w)
      } while (w !== v)
      components.push(component)
    }
  }

  for (const v of adj.keys()) if (!index.has(v)) strongConnect(v)
  return components
}

/** A concrete cycle path through a component, for the failure message. */
function cyclePath(component: NodeId[], edges: ImportEdge[]): string {
  const members = new Set(component)
  const adj = new Map<NodeId, NodeId[]>()
  for (const e of edges) {
    if (!members.has(e.from) || !members.has(e.to)) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    adj.get(e.from)!.push(e.to)
  }
  const start = [...component].sort()[0]
  const path_: NodeId[] = []
  const seen = new Set<NodeId>()
  const dfs = (v: NodeId): NodeId[] | null => {
    path_.push(v)
    seen.add(v)
    for (const w of adj.get(v) ?? []) {
      if (w === start) return [...path_, start]
      if (!seen.has(w)) {
        const hit = dfs(w)
        if (hit) return hit
      }
    }
    path_.pop()
    return null
  }
  const found = dfs(start)
  return (found ?? [...component, start]).join(' → ')
}

// ---------------------------------------------------------------------------
// layers
// ---------------------------------------------------------------------------

type Layer = 'types' | 'scorers' | 'runners' | 'lib' | 'scripts'

function layerOf(id: NodeId): Layer {
  if (id.startsWith(`${SCRIPTS_DIR}/`)) return 'scripts'
  const rel = id.slice(`${LIB_DIR}/`.length)
  if (rel === 'types.ts') return 'types'
  if (rel.startsWith('scorers/')) return 'scorers'
  if (rel.startsWith('runners/')) return 'runners'
  return 'lib'
}

function describeEdge(e: ImportEdge): string {
  return `${e.from}:${e.line} → ${e.to}  (import '${e.specifier}')`
}

// ---------------------------------------------------------------------------
// the guard
// ---------------------------------------------------------------------------

const LIB_MODULES = collectLibModules()
const BENCHMARK_SCRIPTS = collectBenchmarkScripts()
const NODES = [...LIB_MODULES, ...BENCHMARK_SCRIPTS]
const { edges: EDGES, unresolved: UNRESOLVED } = buildGraph(NODES)

describe('llm-benchmark dependency layering', () => {
  it('finds the module tree it is meant to guard', () => {
    // Guards the guard: a rename/move that empties the scan must fail here
    // rather than making every rule below vacuously true.
    expect(LIB_MODULES.length).toBeGreaterThan(20)
    expect(BENCHMARK_SCRIPTS.length).toBeGreaterThan(5)
    expect(LIB_MODULES).toContain(`${LIB_DIR}/types.ts`)
    expect(LIB_MODULES).toContain(`${LIB_DIR}/runners/provider.ts`)
    expect(LIB_MODULES).toContain(`${LIB_DIR}/scorers/index.ts`)
    // .tsx is in scope too — a plugin demo is a graph node, not a blind spot.
    expect(LIB_MODULES.some((id) => id.endsWith('.tsx'))).toBe(true)
    expect(EDGES.length).toBeGreaterThan(30)
  })

  it('resolves every relative import to a real file', () => {
    expect(UNRESOLVED, `unresolvable relative imports:\n  ${UNRESOLVED.join('\n  ')}`).toEqual([])
  })

  it('has no import cycles (every SCC is a single module)', () => {
    const cyclic = tarjan(NODES, EDGES).filter((c) => c.length > 1)
    const selfLoops = EDGES.filter((e) => e.from === e.to)
    const report = [
      ...cyclic.map((c) => `cycle: ${cyclePath(c, EDGES)}`),
      ...selfLoops.map((e) => `self-import: ${describeEdge(e)}`),
    ]
    expect(report, `import cycles found:\n  ${report.join('\n  ')}`).toEqual([])
  })

  it('keeps types.ts a leaf — it imports nothing in-tree', () => {
    const fromTypes = EDGES.filter((e) => e.from === `${LIB_DIR}/types.ts`)
    expect(
      fromTypes.map(describeEdge),
      `types.ts must import nothing from the benchmark tree (it is the bottom layer):\n  ${fromTypes
        .map(describeEdge)
        .join('\n  ')}`,
    ).toEqual([])
  })

  it('never imports upward from a lib module into scripts/', () => {
    const upward = EDGES.filter((e) => layerOf(e.from) !== 'scripts' && layerOf(e.to) === 'scripts')
    expect(
      upward.map(describeEdge),
      `scripts/ is the TOP of the tree — no lib module may import from it:\n  ${upward
        .map(describeEdge)
        .join('\n  ')}`,
    ).toEqual([])
  })

  it('keeps the scorers → runners direction one-way', () => {
    // runners/provider.ts imports ../scorers (selectScorer); the reverse edge
    // would invert the layering and, via that import, close a cycle.
    const reversed = EDGES.filter((e) => layerOf(e.from) === 'scorers' && layerOf(e.to) === 'runners')
    expect(
      reversed.map(describeEdge),
      `scorers/ must not import from runners/ (runners depend on scorers, not the reverse):\n  ${reversed
        .map(describeEdge)
        .join('\n  ')}`,
    ).toEqual([])
    // …and assert the forward edge still exists, so the rule above stays real.
    expect(
      EDGES.some((e) => layerOf(e.from) === 'runners' && layerOf(e.to) === 'scorers'),
    ).toBe(true)
  })
})
