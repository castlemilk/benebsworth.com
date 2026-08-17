#!/usr/bin/env node
// Verify that every published post making a benchmark claim cites its
// reproduction inputs — MECHANICAL, not judgmental.
//
// The methodology bar is prose: docs/lab/llm-benchmark/eval-methodology.md.
// This script enforces the one part of it a machine can check: a post that
// references the benchmark (links /lab/llm-benchmark, or is labelled
// `benchmarking`) must declare a `benchRepro` frontmatter block naming the
// commit and the sweep run ids its numbers came from.
//
//     benchRepro:
//       commit: 6f9ed47
//       sweeps:
//         - 2026-08-16T09-30-12
//       bundles:                 # optional promptBundleHash values
//         - 4f1c9a02b3d7e155
//
// Exit semantics: 1 only on a FAILURE — a post published on or after the
// cutoff (METHODOLOGY_CUTOFF in lib/lab/llm-benchmark/methodology.ts) with no
// repro block, or a malformed block at any date. Posts that predate the
// convention WARN and exit 0; they are listed by name every run, because a
// grandfather clause nobody sees is a grandfather clause that never expires.
//
// Run: npx tsx scripts/methodology-check.mjs [--quiet] [--strict]
//
//   --quiet    summary line only
//   --strict   warnings are failures too (grandfathered posts fail)
//
// All detection/parse/cutoff logic is pure and unit-tested in
// lib/lab/llm-benchmark/methodology.test.ts; this is a shell that reads
// content/blog/*/index.mdx and prints.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

import {
  METHODOLOGY_CUTOFF,
  classifyPost,
  summarize,
} from '../lib/lab/llm-benchmark/methodology.ts'

const USAGE = 'Usage: npx tsx scripts/methodology-check.mjs [--quiet] [--strict]'

const options = { quiet: false, strict: false }
for (const arg of process.argv.slice(2)) {
  if (arg === '--quiet') options.quiet = true
  else if (arg === '--strict') options.strict = true
  else if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(USAGE)
    process.exit(1)
  }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLOG_DIR = join(ROOT, 'content/blog')

const posts = readdirSync(BLOG_DIR)
  .filter((slug) => existsSync(join(BLOG_DIR, slug, 'index.mdx')))
  .sort()
  .map((slug) => {
    const parsed = matter(readFileSync(join(BLOG_DIR, slug, 'index.mdx'), 'utf8'))
    return { slug, frontmatter: parsed.data, body: parsed.content }
  })

const verdicts = posts.map((post) => classifyPost(post))
const summary = summarize(verdicts)

if (!options.quiet) {
  console.log(`methodology-check — cutoff ${METHODOLOGY_CUTOFF} (posts dated on/after must cite their repro)\n`)
  for (const verdict of verdicts) {
    if (verdict.status === 'skipped') continue
    const mark = verdict.status === 'ok' ? 'ok  ' : verdict.status === 'grandfathered' ? 'WARN' : 'FAIL'
    console.log(`  ${mark}  ${verdict.slug}`)
    console.log(`        signals: ${verdict.signals.join(', ')}`)
    console.log(`        ${verdict.reason}`)
  }
  if (summary.grandfathered > 0) {
    console.log(
      `\n  ${summary.grandfathered} post(s) predate the convention and are grandfathered. They are not\n` +
        '  back-stamped on purpose: their numbers were produced before sweep run ids were\n' +
        '  recorded, so a commit/sweep citation would be invented provenance.',
    )
  }
  console.log('')
}

console.log(
  `${summary.total} posts scanned, ${summary.skipped} not benchmark claims, ` +
    `${summary.ok} cited, ${summary.grandfathered} grandfathered, ${summary.failed} failures`,
)

if (summary.failed > 0) {
  console.error(
    '\nA benchmark claim must name what would reproduce it. Add to the post frontmatter:\n\n' +
      '  benchRepro:\n    commit: <sha>\n    sweeps:\n      - <sweep run id>\n\n' +
      'See docs/lab/llm-benchmark/eval-methodology.md.',
  )
  process.exit(1)
}
if (options.strict && summary.grandfathered > 0) {
  console.error('\n--strict: grandfathered posts are failures.')
  process.exit(1)
}
