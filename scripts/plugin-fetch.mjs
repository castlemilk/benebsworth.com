// Fetch a third-party benchmark plugin for REVIEW. It does not register it.
//
// Run: npx tsx scripts/plugin-fetch.mjs <git-url>
//
// Shallow-clones the repo into lib/lab/llm-benchmark/plugins/third-party/<repo-name>/,
// drops the nested .git (a repo inside a repo commits as a broken gitlink, and
// the clone has to be committable — see below), prints the cloned commit for
// the eventual commit message, and STOPS with a review checklist.
//
// It never edits plugins/index.ts. A plugin can ship a demo component that runs
// arbitrary JS in every visitor's browser, so the roster edit — the single
// place a plugin enters the build — stays a human action taken after reading
// the code. `task bench:plugin-validate -- <dir>` is step one of that review.
//
// third-party/ is deliberately NOT gitignored. Once reviewed and rostered the
// code is a build input (the static export renders its tasks and demos), so
// hiding it from git would mean shipping code that is not in the repo — a worse
// failure than a big diff. The checklist says "commit after review".
//
// Refuses if the target directory already exists: re-cloning over a reviewed
// plugin would silently swap the approved code for whatever the remote holds
// today. URL→directory-name and the refusal rules live in
// lib/lab/llm-benchmark/plugins/fetch-plugin.ts (unit-tested, no network).
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

import {
  THIRD_PARTY_DIR,
  repoDirName,
  fetchTargetProblem,
  reviewChecklist,
} from '../lib/lab/llm-benchmark/plugins/fetch-plugin.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PARENT = join(REPO_ROOT, THIRD_PARTY_DIR)
const USAGE = 'Usage: npx tsx scripts/plugin-fetch.mjs <git-url>'

function die(message) {
  console.error(`error: ${message}`)
  console.error(USAGE)
  process.exit(1)
}

const [url] = process.argv.slice(2)

mkdirSync(PARENT, { recursive: true })
const existingDirs = readdirSync(PARENT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

const problem = fetchTargetProblem(url ?? '', existingDirs)
if (problem) die(problem)

const name = repoDirName(url)
const target = join(PARENT, name)

// No shell: the URL is an argument, never a command fragment.
const clone = spawnSync('git', ['clone', '--depth', '1', '--', url, target], { stdio: 'inherit' })
if (clone.status !== 0) {
  // Leave nothing half-cloned behind — a partial tree would then trip the
  // "already exists" refusal on the retry.
  if (existsSync(target)) rmSync(target, { recursive: true, force: true })
  die(`git clone failed (exit ${clone.status ?? 'signal'})`)
}

const head = spawnSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
const sha = head.status === 0 ? head.stdout.trim() : '<unknown>'

// The clone is going to be committed into THIS repo after review; a nested .git
// would make it a gitlink pointing at a commit nobody else can fetch.
rmSync(join(target, '.git'), { recursive: true, force: true })

console.log('')
console.log(`Fetched into ${THIRD_PARTY_DIR}/${name}/`)
console.log(`  origin: ${url}`)
console.log(`  commit: ${sha}`)
console.log('  (nested .git removed — the tree is now plain files, ready to commit after review)')
console.log('')
console.log('NOT registered. Review it first:')
console.log('')
reviewChecklist(name).forEach((step, i) => console.log(`  ${i + 1}. ${step}`))
console.log('')
