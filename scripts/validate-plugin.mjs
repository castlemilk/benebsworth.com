// Validate a benchmark plugin — every problem at once, before you roster it.
//
// Run: task bench:plugin-validate -- <dir-or-roster-id>
//      npx tsx scripts/validate-plugin.mjs lib/lab/llm-benchmark/plugins/echo-provider
//      npx tsx scripts/validate-plugin.mjs community-tasks
//
// Two argument forms, because the two reviews are different:
//
//   <dir>        a path that exists on disk. Imports <dir>/index.ts via tsx and
//                picks the plugin-shaped export. This is the third-party review
//                path: the plugin is NOT registered, so nothing it contributes
//                is mounted just because you looked at it.
//   <roster id>  anything else. Reads the already-registered object out of the
//                roster (plugins/index.ts) — "is what we ship still clean?".
//
// Prints the capability table (what it declares beside what it actually
// contributes), then every warning and every error with its rule name. Exit 1
// on errors, 0 otherwise; warnings never fail the run.
//
// `registerPlugin()` throws on the FIRST violation, which is right for a loader
// and useless for a review. The rules themselves are shared — one generator in
// plugins/registry.ts feeds both paths — so this tool cannot drift from what
// registration will do (plugins/validate-plugin.test.ts asserts the parity).
import { existsSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { validatePlugin, pickPluginExport, formatReport } from '../lib/lab/llm-benchmark/plugins/validate-plugin.ts'
import { getPlugin, getPlugins } from '../lib/lab/llm-benchmark/plugins/index.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const USAGE = 'Usage: task bench:plugin-validate -- <plugin-dir | roster-id>'
/** Entry files a plugin directory may use, in resolution order. */
const ENTRIES = ['index.ts', 'index.tsx', 'index.mjs', 'index.js']

function die(message) {
  console.error(`error: ${message}`)
  console.error(USAGE)
  process.exit(1)
}

/** Repo-relative when it is in the repo; absolute otherwise (`../../../tmp/...` helps nobody). */
function displayPath(abs) {
  const rel = relative(REPO_ROOT, abs)
  return rel.startsWith('..') ? abs : rel
}

const [target] = process.argv.slice(2)
if (!target) die('a plugin directory or roster id is required')

const asPath = resolve(REPO_ROOT, target)
const isDir = existsSync(asPath) && statSync(asPath).isDirectory()

let plugin
let source

if (isDir) {
  const entry = ENTRIES.map((name) => join(asPath, name)).find((file) => existsSync(file))
  if (!entry) {
    die(`${displayPath(asPath)}/ has no plugin entry file (looked for ${ENTRIES.join(', ')})`)
  }
  const mod = await import(pathToFileURL(entry).href)
  const picked = pickPluginExport(mod)
  if (picked.error) die(`${displayPath(entry)}: ${picked.error}`)
  plugin = picked.plugin
  source = `${displayPath(entry)} (export '${picked.exportName}' — imported for review, NOT registered)`
} else {
  plugin = getPlugin(target)
  if (!plugin) {
    die(
      `no registered plugin '${target}' and no such directory. Rostered plugins: ${getPlugins()
        .map((p) => p.id)
        .join(', ')}`
    )
  }
  source = `roster (lib/lab/llm-benchmark/plugins/index.ts)`
}

const report = validatePlugin(plugin)
for (const line of formatReport(report, source)) console.log(line)

process.exit(report.ok ? 0 : 1)
