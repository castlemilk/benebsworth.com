import { execFileSync } from 'node:child_process'
import { sha256 } from './identity'
import type { SourceInput } from './schema'

/**
 * Run before exporting a repository snapshot. A complete working-tree read is
 * not proof it came from the claimed commit. Verify every input against Git.
 */
export function verifyInputRevision(input: SourceInput): void {
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim()
  const accepted = new Set(['https://github.com/castlemilk/benebsworth.com.git', 'https://github.com/castlemilk/benebsworth.com', 'git@github.com:castlemilk/benebsworth.com.git'])
  if (!accepted.has(remote)) throw new Error('Knowledge source repository origin does not match the verified blog')
  if (!/^[a-f0-9]{40}$/.test(input.revision)) throw new Error('Exact Git revision required')
  const paths = new Set(input.files.map(file => file.path))
  const labPaths = new Set(input.documents.filter(doc => doc.kind === 'lab').map(doc => `content/lab/${doc.key}.mdx`))
  const committedContent = execFileSync('git', ['ls-tree', '-r', '--name-only', input.revision, '--', 'content/blog', 'content/lab'], { encoding: 'utf8' }).trim().split('\n')
  for (const filePath of committedContent) {
    if ((/^content\/blog\/[^/]+\/index\.mdx$/.test(filePath) || labPaths.has(filePath)) && !paths.has(filePath)) {
      throw new Error(`Committed content is missing from the input manifest: ${filePath}`)
    }
  }
  for (const file of input.files) {
    let bytes: Buffer
    try { bytes = execFileSync('git', ['show', `${input.revision}:${file.path}`], { maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) }
    catch { throw new Error(`Source is absent at the claimed revision: ${file.path}`) }
    if (sha256(bytes) !== file.sha256) throw new Error(`Source bytes differ from the claimed revision: ${file.path}`)
  }
}
