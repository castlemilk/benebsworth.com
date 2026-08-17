/**
 * Methodology citation check — pure helpers.
 *
 * The bar itself is prose (`docs/lab/llm-benchmark/eval-methodology.md`); this
 * module is the MECHANICAL half of it: given a blog post's frontmatter and
 * body, decide (a) whether the post makes a benchmark claim at all, (b) whether
 * it declares the reproduction inputs that make the claim checkable, and
 * (c) whether a missing declaration is a failure or a grandfathered warning.
 *
 * It never judges the claim — no scoring, no NLP, no "is this comparison
 * fair?". A judgement this file cannot mechanically defend does not belong in
 * it; that is what the doc is for.
 *
 * The convention it enforces is one frontmatter key, because gray-matter YAML
 * is the only metadata channel the MDX pipeline already carries end to end
 * (`lib/content.ts` ignores unknown keys, `scripts/gen-md-siblings.mjs` copies
 * them verbatim into the published `.md` sibling, and `scripts/prose-lint.mjs`
 * only lints `title`/`description`/`takeaways`, so a repro block is invisible
 * to the prose linter). An HTML comment would NOT work: MDX 3 parses `<!-- -->`
 * as JSX and errors.
 *
 *     benchRepro:
 *       commit: 6f9ed47
 *       sweeps:
 *         - 2026-08-16T09-30-12
 *       bundles:          # optional
 *         - 4f1c9a02b3d7e155
 *
 * Pure by construction: no fs, no process, no clock. The script shell
 * (`scripts/methodology-check.mjs`) reads the files and prints.
 */

/**
 * Posts published on or after this date must carry a `benchRepro` block if they
 * reference the benchmark; earlier ones are GRANDFATHERED (warn, exit 0).
 *
 * The convention landed 2026-08-17 and cannot be retro-satisfied honestly: the
 * three shipped benchmark posts predate `runLogRef`-backed sweep ids for most
 * of their numbers, so back-stamping them would invent provenance — exactly the
 * failure the check exists to prevent. Grandfathering is therefore documented,
 * not silent: every warned post is listed by name on every run.
 */
export const METHODOLOGY_CUTOFF = '2026-08-17'

/** A blog post as the script hands it over — frontmatter + raw MDX body. */
export interface PostInput {
  slug: string
  /** Parsed YAML frontmatter (gray-matter `data`). */
  frontmatter: Record<string, unknown>
  /** MDX body with the frontmatter stripped. */
  body: string
}

/** The reproduction inputs a benchmark claim must cite. */
export interface BenchRepro {
  /** Repo commit the published numbers were produced at (7-40 hex). */
  commit: string
  /** Sweep run ids (`sweepRunId()` shape) the numbers came from. */
  sweeps: string[]
  /** Optional prompt-bundle hashes (`promptBundleHash`, 16 hex). */
  bundles?: string[]
}

export type ReproParse =
  | { kind: 'absent' }
  | { kind: 'malformed'; errors: string[] }
  | { kind: 'ok'; repro: BenchRepro }

export type PostStatus = 'skipped' | 'ok' | 'grandfathered' | 'failed'

export interface PostVerdict {
  slug: string
  status: PostStatus
  /** Why the post was considered a benchmark claim (empty when skipped). */
  signals: string[]
  /** Human-readable explanation of the status. */
  reason: string
  repro?: BenchRepro
}

/** Sweep run id: `2026-08-16T09-30-12` (see `sweepRunId()` in sweep.ts). */
const SWEEP_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/
/** Abbreviated or full git sha. */
const COMMIT = /^[0-9a-f]{7,40}$/
/** `promptBundleHash()` output: 16 hex chars. */
const BUNDLE = /^[0-9a-f]{16}$/

/**
 * Does this post make a benchmark claim?
 *
 * Two signals, both mechanical and both under the author's control:
 *
 * - the body links to the benchmark section (`/lab/llm-benchmark`), which every
 *   published benchmark post does because the claim needs the board; or
 * - the post is labelled `benchmarking` in frontmatter (`labels` or `tags`).
 *
 * Deliberately NOT a signal: "mentions a model name" or "contains a number near
 * a model name". Those over-trigger on architecture explainers (the K3
 * teardown quotes vendor benchmark numbers and claims nothing of its own) and
 * under-trigger on a comparison written without a score table. The label is the
 * author's declaration that this is a benchmark report, and the doc makes
 * adding it the first step of writing one.
 */
export function benchmarkSignals(post: PostInput): string[] {
  const signals: string[] = []
  if (post.body.includes('/lab/llm-benchmark')) signals.push('links /lab/llm-benchmark')
  if (postLabels(post.frontmatter).includes('benchmarking')) signals.push('labelled benchmarking')
  return signals
}

/** `labels: a,b,c` (string) or `tags: [a, b]` (list), normalised and lowercased. */
function postLabels(frontmatter: Record<string, unknown>): string[] {
  const raw = frontmatter.labels ?? frontmatter.tags
  const parts = typeof raw === 'string' ? raw.split(',') : Array.isArray(raw) ? raw : []
  return parts.map((p) => String(p).trim().toLowerCase()).filter(Boolean)
}

/**
 * Parse and validate the `benchRepro` frontmatter block.
 *
 * A malformed block is never treated as an absent one: absence is "this post
 * predates the convention", malformation is "this post claims provenance it
 * does not have", and the second is a failure at any date.
 */
export function parseBenchRepro(frontmatter: Record<string, unknown>): ReproParse {
  const raw = frontmatter.benchRepro
  if (raw === undefined || raw === null) return { kind: 'absent' }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'malformed', errors: ['benchRepro must be a mapping with `commit` and `sweeps`'] }
  }
  const value = raw as Record<string, unknown>
  const errors: string[] = []

  const commit = typeof value.commit === 'string' ? value.commit.trim() : ''
  if (!commit) errors.push('benchRepro.commit is required (the commit the numbers were produced at)')
  else if (!COMMIT.test(commit)) errors.push(`benchRepro.commit is not a git sha: '${commit}'`)

  const sweepsRaw = value.sweeps
  const sweeps = Array.isArray(sweepsRaw) ? sweepsRaw.map((s) => String(s).trim()) : []
  if (!Array.isArray(sweepsRaw) || sweeps.length === 0) {
    errors.push('benchRepro.sweeps is required (one or more sweep run ids)')
  } else {
    for (const id of sweeps) {
      if (!SWEEP_ID.test(id)) errors.push(`benchRepro.sweeps entry is not a sweep run id: '${id}'`)
    }
  }

  const bundlesRaw = value.bundles
  let bundles: string[] | undefined
  if (bundlesRaw !== undefined) {
    if (!Array.isArray(bundlesRaw)) errors.push('benchRepro.bundles must be a list of prompt-bundle hashes')
    else {
      bundles = bundlesRaw.map((b) => String(b).trim())
      for (const hash of bundles) {
        if (!BUNDLE.test(hash)) errors.push(`benchRepro.bundles entry is not a 16-hex bundle hash: '${hash}'`)
      }
    }
  }

  if (errors.length) return { kind: 'malformed', errors }
  return { kind: 'ok', repro: bundles ? { commit, sweeps, bundles } : { commit, sweeps } }
}

/**
 * `date` frontmatter as a `YYYY-MM-DD` prefix — the only part the cutoff
 * compares, so a post dated `2026-08-17T09:00:00.000Z` and one dated
 * `2026-08-17` are the same day. An unparseable/absent date is treated as
 * newer than any cutoff: a post that cannot prove it predates the convention
 * does not get grandfathered by ambiguity.
 */
export function postDay(frontmatter: Record<string, unknown>): string {
  const raw = frontmatter.date
  const text = raw instanceof Date ? raw.toISOString() : String(raw ?? '')
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : '9999-12-31'
}

/** Classify one post against the bar. Dates are compared as ISO day strings. */
export function classifyPost(post: PostInput, cutoff: string = METHODOLOGY_CUTOFF): PostVerdict {
  const signals = benchmarkSignals(post)
  if (signals.length === 0) {
    return { slug: post.slug, status: 'skipped', signals, reason: 'no benchmark reference' }
  }
  const parsed = parseBenchRepro(post.frontmatter)
  if (parsed.kind === 'ok') {
    const { commit, sweeps } = parsed.repro
    return {
      slug: post.slug,
      status: 'ok',
      signals,
      reason: `benchRepro: commit ${commit}, ${sweeps.length} sweep${sweeps.length === 1 ? '' : 's'}`,
      repro: parsed.repro,
    }
  }
  if (parsed.kind === 'malformed') {
    return { slug: post.slug, status: 'failed', signals, reason: parsed.errors.join('; ') }
  }
  const day = postDay(post.frontmatter)
  if (day < cutoff) {
    return {
      slug: post.slug,
      status: 'grandfathered',
      signals,
      reason: `no benchRepro; published ${day}, before the ${cutoff} cutoff`,
    }
  }
  return {
    slug: post.slug,
    status: 'failed',
    signals,
    reason: `no benchRepro; published ${day}, on or after the ${cutoff} cutoff`,
  }
}

export interface MethodologySummary {
  total: number
  skipped: number
  ok: number
  grandfathered: number
  failed: number
  /** 1 iff any post failed — warnings never fail the check. */
  exitCode: number
}

export function summarize(verdicts: PostVerdict[]): MethodologySummary {
  const count = (s: PostStatus): number => verdicts.filter((v) => v.status === s).length
  const failed = count('failed')
  return {
    total: verdicts.length,
    skipped: count('skipped'),
    ok: count('ok'),
    grandfathered: count('grandfathered'),
    failed,
    exitCode: failed > 0 ? 1 : 0,
  }
}
