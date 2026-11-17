import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const temporary: string[] = []
afterEach(() => { for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true }) })
const output = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kg01-bridge-cli-'))
  temporary.push(directory)
  return path.join(directory, 'export')
}
const script = path.resolve('scripts/export-knowledge-integration.mts')

describe('verified integration export execution boundary', () => {
  it('rejects an imported entrypoint before argument handling, extraction or output', () => {
    const destination = output()
    const source = `process.argv = ['node', 'retained-host', '--out', ${JSON.stringify(destination)}]; await import(${JSON.stringify(pathToFileURL(script).href)});`
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], { encoding: 'utf8' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Integration export requires its own CLI in a fresh Node process and stable checkout')
    expect(result.stdout).toBe('')
    expect(fs.existsSync(destination)).toBe(false)
  })
  it('allows direct CLI entry to validate arguments but emits no partial artifact on invalid invocation', () => {
    const destination = output()
    const result = spawnSync(process.execPath, ['--import', 'tsx', script, '--out', destination, '--unknown', 'value'], { encoding: 'utf8' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Usage: node --import tsx scripts/export-knowledge-integration.mts')
    expect(result.stderr).not.toContain('Integration export requires its own CLI')
    expect(result.stdout).toBe('')
    expect(fs.existsSync(destination)).toBe(false)
  })
})
