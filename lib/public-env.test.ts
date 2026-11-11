import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Next inlines NEXT_PUBLIC_* at build time. A value the production build does
// not receive compiles to undefined without any error (docs/postmortem/0011).
// Each one the code reads must either be supplied by the publish workflow or
// be listed here with a working default.
const OPTIONAL: Record<string, string> = {
  NEXT_PUBLIC_CARBON_URL: 'defaults to https://carbon.benebsworth.com',
  NEXT_PUBLIC_CF_BEACON_TOKEN: 'Cloudflare beacon is optional; GA4 is the analytics of record',
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full)
    return /\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('public build configuration', () => {
  it('supplies every NEXT_PUBLIC value the code reads to the production build', () => {
    const read = new Set<string>()
    for (const file of ['app', 'components', 'lib'].flatMap(sourceFiles)) {
      for (const [, name] of fs.readFileSync(file, 'utf8').matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) read.add(name)
    }
    const workflow = fs.readFileSync('.github/workflows/publish-site.yml', 'utf8')
    const missing = [...read].filter((name) => !OPTIONAL[name] && !workflow.includes(`${name}: \${{ vars.${name} }}`))
    expect(read.size).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })
})
