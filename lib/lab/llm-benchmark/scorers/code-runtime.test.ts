import { describe, it, expect } from 'vitest'

import {
  extractProgram,
  interpreterAvailable,
  runProgram,
  MINIMAL_ENV_KEYS,
} from './code-runtime'

describe('extractProgram', () => {
  it('extracts a fenced python block', () => {
    const artifact = [
      'Here is the module you asked for.',
      '',
      '```python',
      'import hashlib',
      '',
      'def hash_password(p):',
      '    return hashlib.sha256(p.encode()).hexdigest()',
      '```',
      '',
      'It uses the standard library only.',
    ].join('\n')
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.language).toBe('python')
    expect(result.program.origin).toBe('fenced-block')
    expect(result.program.source).toContain('def hash_password')
    expect(result.program.source).not.toContain('```')
    expect(result.program.source).not.toContain('Here is the module')
  })

  it('extracts a fenced javascript block', () => {
    const artifact = ['Solution:', '```js', 'console.log(3 * 4)', '```'].join('\n')
    const result = extractProgram(artifact, { prefer: 'javascript' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.language).toBe('javascript')
    expect(result.program.source.trim()).toBe('console.log(3 * 4)')
  })

  it('extracts <script> contents from an HTML artifact', () => {
    const artifact = `<!DOCTYPE html><html><body><h1>Solver</h1>
<script>
const pairs = [[3, 4], [4, 3]]
console.log(JSON.stringify(pairs))
</script>
</body></html>`
    const result = extractProgram(artifact, { prefer: 'javascript' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.origin).toBe('script-tag')
    expect(result.program.source).toContain('const pairs')
    expect(result.program.source).not.toContain('<h1>')
  })

  it('extracts a python <script type="text/python"> block', () => {
    const artifact = `<html><body>
<script type="text/python" id="raw-python-code">
import hmac
def constant_time_compare(a, b):
    return hmac.compare_digest(a, b)
</script>
</body></html>`
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.language).toBe('python')
    expect(result.program.source).toContain('def constant_time_compare')
  })

  it('extracts and unescapes a <pre><code> block', () => {
    const artifact = `<html><body><p>Prose about the module.</p>
<pre><code>import hmac

def constant_time_compare(left: str, right: str) -&gt; bool:
    """Compare &amp; report."""
    return hmac.compare_digest(left, right)
</code></pre></body></html>`
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.origin).toBe('pre-code')
    // Entities decoded — otherwise the program is a syntax error.
    expect(result.program.source).toContain('-> bool')
    expect(result.program.source).toContain('&')
    expect(result.program.source).not.toContain('&gt;')
  })

  it('extracts a bare program (no fence, no markup)', () => {
    const artifact = `import hashlib
import os


def hash_password(password: str) -> str:
    return hashlib.sha256(os.urandom(16) + password.encode()).hexdigest()
`
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.origin).toBe('bare')
    expect(result.program.language).toBe('python')
  })

  it('picks the code out of a mixed prose + code artifact', () => {
    const artifact = `Let $s = x + y$. Then $s^2 - 2p = 25$ so $s = \\pm 7$.

\`\`\`python
pairs = [(3, 4), (4, 3), (-3, -4), (-4, -3)]
for x, y in pairs:
    print(x, y)
\`\`\`

Every pair satisfies both equations.`
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.program.source.startsWith('pairs =')).toBe(true)
  })

  it('returns a typed extraction failure for prose with no program', () => {
    const artifact =
      'Let s = x + y and p = xy = 12. Then s^2 = 49, so s = 7 or s = -7, giving (3, 4), (4, 3), (-3, -4) and (-4, -3).'
    const result = extractProgram(artifact, { prefer: 'python' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('extraction-failed')
    expect(result.detail).toMatch(/no .*program/i)
  })

  it('returns a typed extraction failure for an empty artifact', () => {
    const result = extractProgram('   \n  ', { prefer: 'python' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('extraction-failed')
  })

  it('does not return a python program when javascript was asked for', () => {
    const artifact = '```python\nimport os\nprint(os.getcwd())\n```'
    const result = extractProgram(artifact, { prefer: 'javascript' })
    expect(result.ok).toBe(false)
  })
})

describe('runProgram', () => {
  const hasPython = interpreterAvailable('python')

  it('captures stdout from a javascript program', async () => {
    const result = await runProgram(
      { language: 'javascript', source: 'console.log("hello from js")', origin: 'bare' },
      { timeoutMs: 10_000 }
    )
    expect(result.failure).toBeUndefined()
    expect(result.stdout.trim()).toBe('hello from js')
    expect(result.exitCode).toBe(0)
  })

  it.runIf(hasPython)('captures stdout from a python program', async () => {
    const result = await runProgram(
      { language: 'python', source: 'print("hello from py")', origin: 'bare' },
      { timeoutMs: 10_000 }
    )
    expect(result.failure).toBeUndefined()
    expect(result.stdout.trim()).toBe('hello from py')
  })

  it('reports a crash as runtime-error with the message on stderr', async () => {
    const result = await runProgram(
      { language: 'javascript', source: 'undefinedFunction()', origin: 'bare' },
      { timeoutMs: 10_000 }
    )
    expect(result.failure).toBe('runtime-error')
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/undefinedFunction/)
  })

  it('times out at the cap instead of hanging', async () => {
    const started = Date.now()
    const result = await runProgram(
      { language: 'javascript', source: 'while (true) {}', origin: 'bare' },
      { timeoutMs: 1200 }
    )
    const elapsed = Date.now() - started
    expect(result.failure).toBe('timeout')
    expect(result.timedOut).toBe(true)
    // Bounded: the cap plus the SIGTERM→SIGKILL escalation grace, not forever.
    expect(elapsed).toBeLessThan(8000)
  }, 20_000)

  it('caps captured output', async () => {
    const result = await runProgram(
      {
        language: 'javascript',
        source: 'for (let i = 0; i < 100000; i++) console.log("x".repeat(200))',
        origin: 'bare',
      },
      { timeoutMs: 15_000, maxOutputBytes: 4096 }
    )
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(4096 + 200)
  }, 25_000)

  it('inherits no environment beyond the minimal allowlist', async () => {
    const poison = { BENCH_POISON_VALUE: 'leaked', OPENROUTER_API_KEY: 'sk-should-not-leak' }
    const previous = { ...process.env }
    Object.assign(process.env, poison)
    try {
      const result = await runProgram(
        {
          language: 'javascript',
          source: 'console.log(JSON.stringify(Object.keys(process.env).sort()))',
          origin: 'bare',
        },
        { timeoutMs: 10_000 }
      )
      const keys: string[] = JSON.parse(result.stdout.trim())
      expect(keys).not.toContain('BENCH_POISON_VALUE')
      expect(keys).not.toContain('OPENROUTER_API_KEY')
      // Everything the child sees is either from the allowlist or injected by
      // the OS below us (macOS CoreFoundation adds __CF_USER_TEXT_ENCODING to
      // every spawn regardless of the env block).
      const platformInjected = new Set(['__CF_USER_TEXT_ENCODING'])
      const unexpected = keys.filter(
        (k) => !(MINIMAL_ENV_KEYS as readonly string[]).includes(k) && !platformInjected.has(k)
      )
      expect(unexpected).toEqual([])
    } finally {
      for (const key of Object.keys(poison)) delete process.env[key]
      Object.assign(process.env, previous)
    }
  })

  it('denies filesystem writes to a javascript program', async () => {
    // The node permission model is a REAL boundary for the JS runner; python
    // has no equivalent, which is why the isolation claim is scoped in the
    // module doc rather than stated globally.
    const result = await runProgram(
      {
        language: 'javascript',
        source:
          'import fs from "node:fs"\nfs.writeFileSync("/tmp/bench-should-not-exist", "x")',
        origin: 'bare',
      },
      { timeoutMs: 10_000 }
    )
    expect(result.failure).toBe('runtime-error')
    expect(result.stderr).toMatch(/ERR_ACCESS_DENIED|not allowed|Permission/i)
  })

  it('reports an unavailable interpreter rather than throwing', async () => {
    const result = await runProgram(
      { language: 'python', source: 'print(1)', origin: 'bare' },
      { timeoutMs: 5000, interpreter: { command: 'definitely-not-an-interpreter-xyz', args: [] } }
    )
    expect(result.failure).toBe('runtime-unavailable')
  })
})
