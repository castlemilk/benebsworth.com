import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const exporter = path.join(root, 'scripts/export-knowledge-source.mts')
const entrypointError = 'Knowledge source export must run as the CLI entrypoint in a fresh Node process'
const usageError = 'Usage: node --import tsx scripts/export-knowledge-source.mts'
let temporaryRoot: string
let output: string

beforeEach(() => {
  temporaryRoot = mkdtempSync(path.join(tmpdir(), 'kg01-execution-contract-'))
  output = path.join(temporaryRoot, 'export')
  expect(existsSync(output)).toBe(false)
})

afterEach(() => rmSync(temporaryRoot, { recursive: true, force: true }))

function run(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', ...args], {
    cwd: root, encoding: 'utf8', timeout: 20_000,
  })
}

// Exercise the ordinary CLI boundary, not arbitrary preloads, rewritten argv,
// or the runtime identity of a manually mixed/cached module graph.
describe('fresh-process exporter entrypoint contract', () => {
  it('rejects importing the exporter as a library before creating an output directory', () => {
    const result = run([
      '--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(exporter).href)})`,
      '--', 'kg01-import-host', '--out', output,
    ])
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(entrypointError)
    expect(result.stderr).not.toContain(usageError)
    expect(result.stdout).toBe('')
    expect(existsSync(output)).toBe(false)
  }, 30_000)

  it('accepts direct CLI entry and reaches argument validation without creating output', () => {
    const result = run([exporter, '--unsupported', 'value', '--out', output])
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(usageError)
    expect(result.stderr).not.toContain(entrypointError)
    expect(result.stdout).toBe('')
    expect(existsSync(output)).toBe(false)
  }, 30_000)
})
