import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const manifest = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))

describe('root package manager contract', () => {
  it('does not direct dependency tooling away from the npm lockfile', () => {
    // A stale pnpm declaration can keep Dependabot's fetcher from including
    // the npm lockfile, hiding its transitive dependencies from updates.
    if (manifest.packageManager !== undefined) {
      expect(manifest.packageManager).toMatch(/^npm@/)
    }
    for (const alternative of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
      expect(existsSync(resolve(root, alternative)), alternative).toBe(false)
    }
  })

  it('keeps root dependency declarations synchronized with the npm lock', () => {
    expect(lock.lockfileVersion).toBe(3)
    expect(lock.name).toBe(manifest.name)
    expect(lock.packages[''].name).toBe(manifest.name)
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      expect(lock.packages[''][section] ?? {}, section).toEqual(manifest[section] ?? {})
    }
  })

  it.each([
    '.github/workflows/site-checks.yml',
    '.github/workflows/publish-site.yml',
    '.github/workflows/vercel-artifact.yml',
    '.github/workflows/vercel-preview.yml',
    'Taskfile.yml',
  ])('keeps %s on the committed npm dependency graph', (path) => {
    const source = read(path)
    expect(source).toMatch(/\bnpm ci\b/)
    expect(source).not.toMatch(/\b(?:pnpm|yarn|bun) (?:install|i)\b/)
  })
})
