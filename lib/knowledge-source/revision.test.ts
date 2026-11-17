import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { verifyInputRevision } from './revision'
import { sha256 } from './identity'
import type { SourceInput } from './schema'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))
const file = 'content/blog/example/index.mdx'
const bytes = '---\ntitle: Example\n---\nAn authored source.\n'
const input = () => ({
  repository: 'castlemilk/benebsworth.com', revision: 'a'.repeat(40), files: [{ path: file, sha256: sha256(bytes) }],
  documents: [],
}) as unknown as SourceInput

beforeEach(() => {
  vi.mocked(execFileSync).mockImplementation(((_cmd: string, args: string[]) => {
    if (args[0] === 'remote') return 'https://github.com/castlemilk/benebsworth.com.git\n'
    if (args[0] === 'ls-tree') return `${file}\n`
    return Buffer.from(bytes)
  }) as typeof execFileSync)
})
describe('commit-to-source verification', () => {
  it('accepts exact UTF-8 bytes at the verified origin and revision', () => expect(() => verifyInputRevision(input())).not.toThrow())
  it('rejects a missing committed article even when every remaining input matches', () => {
    const source = input(); source.files = []
    expect(() => verifyInputRevision(source)).toThrow(/Committed content is missing/)
  })
  it('rejects working-tree bytes borrowed from an older revision', () => {
    const source = input(); source.files[0].sha256 = sha256('changed')
    expect(() => verifyInputRevision(source)).toThrow(/Source bytes differ/)
  })
  it('rejects an untracked input that does not exist at the claimed commit', () => {
    vi.mocked(execFileSync).mockImplementation(((_cmd: string, args: string[]) => {
      if (args[0] === 'remote') return 'https://github.com/castlemilk/benebsworth.com.git\n'
      if (args[0] === 'ls-tree') return `${file}\n`
      throw new Error('not in tree')
    }) as typeof execFileSync)
    expect(() => verifyInputRevision(input())).toThrow(/absent at the claimed revision/)
  })
  it('rejects a different repository rather than substituting a lookalike', () => {
    vi.mocked(execFileSync).mockReturnValue('https://github.com/castlemilk/startup-atlas.git\n')
    expect(() => verifyInputRevision(input())).toThrow(/origin does not match/)
  })
})
