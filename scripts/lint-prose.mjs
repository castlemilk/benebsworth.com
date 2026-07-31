#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import {
  changedManifestFiles,
  lintFiles,
  globToRegExp,
  readManifest,
  resolveManifestFiles,
} from './prose-lint.mjs'

const root = process.cwd()
const manifest = readManifest(new URL('./prose-sources.json', import.meta.url))

function usage() {
  return 'Usage: lint-prose [--files <paths...>] [--format table|json] [--ci]'
}

function parseArgs(args) {
  const options = { files: [], format: 'table', ci: false, changed: false }
  let explicit = false
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--files') {
      explicit = true
      while (i + 1 < args.length && !args[i + 1].startsWith('--')) options.files.push(args[++i])
    } else if (arg === '--format') {
      options.format = args[++i]
      if (!['table', 'json'].includes(options.format)) throw new Error(`Unknown format: ${options.format}`)
    } else if (arg === '--ci') options.ci = true
    else if (arg === '--changed') options.changed = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  options.explicit = explicit
  return options
}

function expandPath(input) {
  const absolute = resolve(root, input)
  if (!existsSync(absolute)) return [input]
  const info = statSync(absolute)
  if (info.isFile()) return [relative(root, absolute).replaceAll('\\', '/')]
  const output = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = resolve(dir, entry.name)
      if (entry.isDirectory()) visit(child)
      else output.push(relative(root, child).replaceAll('\\', '/'))
    }
  }
  visit(absolute)
  return output
}

function resolveExplicit(inputs) {
  const all = resolveManifestFiles(root, manifest)
  const allowed = new Set(all)
  const selected = new Set()
  for (const input of inputs) {
    if (/[*?]/.test(input)) {
      const re = globToRegExp(input)
      for (const file of all) if (re.test(file)) selected.add(file)
    } else {
      for (const file of expandPath(input)) if (allowed.has(file)) selected.add(file)
    }
  }
  return [...selected].sort()
}

function printTable(reports) {
  const lines = ['FILE  WORDS  HARD  WARNINGS']
  for (const report of reports) {
    const hard = report.findings.filter((finding) => finding.severity === 'error').length
    const warnings = report.findings.filter((finding) => finding.severity === 'warning').length
    lines.push(`${report.file}  ${report.words}  ${hard}  ${warnings}`)
    for (const finding of report.findings) lines.push(`  ${finding.line}:${finding.column} ${finding.severity} ${finding.rule}: ${finding.match}`)
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

export function run(argv = process.argv.slice(2), env = process.env) {
  let options
  try { options = parseArgs(argv) } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage()}\n`)
    return 2
  }
  if (options.help) { process.stdout.write(`${usage()}\n`); return 0 }
  const mode = options.ci ? 'ci' : 'source-audit'
  let files
  try {
    files = options.explicit
      ? resolveExplicit(options.files)
      : (options.changed || env.PROSE_BASE !== undefined ? changedManifestFiles(root, manifest, env.PROSE_BASE || 'HEAD') : resolveManifestFiles(root, manifest))
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }
  if (!files.length && options.explicit) {
    process.stderr.write('No supported prose files selected.\n')
    return 2
  }
  const reports = lintFiles(files, { mode })
  if (options.format === 'json') process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`)
  else printTable(reports)
  if (!options.ci) return 0
  if (reports.some((report) => report.findings.some((finding) => finding.rule === 'input' || finding.rule === 'masking'))) return 2
  return reports.some((report) => report.hasHardFailures) ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = run()
