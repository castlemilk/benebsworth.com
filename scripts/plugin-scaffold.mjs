// Scaffold a new benchmark plugin under lib/lab/llm-benchmark/plugins/<id>/.
//
// Run: task bench:plugin-scaffold -- <id> "<Display Name>"
//      npx tsx scripts/plugin-scaffold.mjs <id> "<Display Name>"
//
// Writes manifest.json, index.ts, checks.ts and demo.tsx from the templates in
// scripts/templates/plugin/, then prints the roster lines to add to
// plugins/index.ts and the rest of the wiring checklist.
//
// It does NOT edit the roster. A scaffolded plugin is dead code until it is
// imported there, which is the point: `task verify` stays green on an
// unrostered scaffold (nothing imports it; it is only typechecked and linted),
// so an author can iterate before wiring it into the published task set.
//
// Refuses to overwrite an existing directory, and refuses an id that collides
// with a registered plugin OR an existing directory. Validation and naming
// live in lib/lab/llm-benchmark/plugins/scaffold.ts (unit-tested).
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  validatePluginId,
  validatePluginName,
  templateVars,
  renderTemplate,
  nextSteps,
} from '../lib/lab/llm-benchmark/plugins/scaffold.ts'
import { getPlugins } from '../lib/lab/llm-benchmark/plugins/index.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const TEMPLATE_DIR = join(HERE, 'templates', 'plugin')
const PLUGINS_DIR = join(REPO_ROOT, 'lib', 'lab', 'llm-benchmark', 'plugins')

/** template file → generated file name. */
const FILES = {
  'manifest.json.tmpl': 'manifest.json',
  'index.ts.tmpl': 'index.ts',
  'checks.ts.tmpl': 'checks.ts',
  'demo.tsx.tmpl': 'demo.tsx',
}

const USAGE = 'Usage: task bench:plugin-scaffold -- <plugin-id> "<Display Name>"'

function die(message) {
  console.error(`error: ${message}`)
  console.error(USAGE)
  process.exit(1)
}

function existingPluginDirs() {
  return readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

const [id, name] = process.argv.slice(2)
if (!id || !name) die('both <plugin-id> and "<Display Name>" are required')

const nameProblem = validatePluginName(name)
if (nameProblem) die(nameProblem)

const idProblem = validatePluginId(id, {
  registeredIds: getPlugins().map((p) => p.id),
  existingDirs: existingPluginDirs(),
})
if (idProblem) die(idProblem)

const targetDir = join(PLUGINS_DIR, id)
if (existsSync(targetDir)) die(`${targetDir} already exists — refusing to overwrite it`)

const vars = templateVars(id, name)
mkdirSync(targetDir, { recursive: true })
for (const [template, output] of Object.entries(FILES)) {
  const source = readFileSync(join(TEMPLATE_DIR, template), 'utf8')
  writeFileSync(join(targetDir, output), renderTemplate(source, vars), 'utf8')
}

const roster = renderTemplate(readFileSync(join(TEMPLATE_DIR, 'roster.tmpl'), 'utf8'), vars)

console.log(`Scaffolded lib/lab/llm-benchmark/plugins/${id}/`)
for (const output of Object.values(FILES)) console.log(`  ${output}`)
console.log('')
console.log('Add to lib/lab/llm-benchmark/plugins/index.ts:')
console.log('')
for (const line of roster.trimEnd().split('\n')) console.log(`  ${line}`)
console.log('')
console.log('Then:')
nextSteps(id).forEach((step, i) => console.log(`  ${i + 1}. ${step}`))
