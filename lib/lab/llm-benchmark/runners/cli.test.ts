import { describe, it, expect } from 'vitest'
import { extractLikelyCode, generateFromCli, runCli, scrubEnv, setSweepRoot } from './cli'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_MODEL = {
  id: 'test',
  name: 'Test',
  provider: 'Test',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 1000,
  capabilities: '',
}

const TEST_TASK = {
  id: 't',
  category: 'ui-building' as const,
  title: 'T',
  blurb: '',
  prompt: 'do it',
  runtimeHint: '',
  iterationsDefault: 1,
  methodNotes: '',
  demoComponentName: 'D',
  slug: 't',
}

const FULL_COMPONENT = [
  'export default function App() {',
  '  const [dark, setDark] = useState(false)',
  '  return (',
  '    <main>hi</main>',
  '  );',
  '}',
].join('\n')

describe('extractLikelyCode', () => {
  it('returns the exact html document span when prose surrounds it', () => {
    const doc = '<!DOCTYPE html>\n<html>\n<body><script>go();</script></body>\n</html>'
    const stdout = `Here is the artifact you asked for:\n\n${doc}\n\nLet me know if you want tweaks!`
    expect(extractLikelyCode(stdout)).toBe(doc)
  })

  it('returns the largest fenced code block with fences and language line stripped', () => {
    const small = 'console.log("small")'
    const large = 'function bigger() {\n  return "this block is clearly larger"\n}'
    const stdout = `First a helper:\n\n\`\`\`js\n${small}\n\`\`\`\n\nAnd the main artifact:\n\n\`\`\`tsx\n${large}\n\`\`\`\n\nDone.`
    expect(extractLikelyCode(stdout)).toBe(large)
  })

  it('REGRESSION: keeps the full unfenced codex component, not a slice from an interior const', () => {
    // Codex shape: banner chrome, a log line above the artifact that contains
    // the word "const", then the complete component. The old marker-based
    // extractor sliced at the earliest code marker and ate the head.
    const stdout = [
      'OpenAI Codex v0.13.0 (research preview)',
      '--------',
      'workdir: /tmp/llm-bench-abc123',
      'model: gpt-5.5-codex',
      'provider: openai',
      'approval: never',
      'sandbox: workspace-write',
      'reasoning effort: high',
      '--------',
      '[2026-07-03T10:00:01] codex: the component keeps a const dark flag in state',
      FULL_COMPONENT,
      '[2026-07-03T10:05:01] tokens used: 15,268',
      '',
    ].join('\n')

    const result = extractLikelyCode(stdout)
    expect(result.startsWith('export default function App')).toBe(true)
    expect(result).toBe(FULL_COMPONENT)
  })

  it('handles file-mode stdout that is only chrome plus DONE without throwing', () => {
    const stdout = [
      'OpenAI Codex v0.13.0',
      '--------',
      'workdir: /tmp/llm-bench-xyz',
      'sandbox: workspace-write',
      '--------',
      'DONE',
      'tokens used 4,212',
    ].join('\n')

    const result = extractLikelyCode(stdout)
    expect(result).toBe('DONE')
  })

  it('falls through to chrome-stripped stdout for truncated html with no closing tag', () => {
    const truncated = '<!DOCTYPE html>\n<html>\n<head><style>body { margin: 0;'
    const stdout = `model: gemini-3.5-flash\n${truncated}`
    const result = extractLikelyCode(stdout)
    expect(result).toBe(truncated)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('runCli process-group timeout', () => {
  it('kills the whole process group on timeout so CLI server grandchildren cannot leak', async () => {
    // A CLI that spawns a grandchild inheriting the pipes, then sleeps: this
    // mirrors opencode run (bun server child). The grandchild's pid is written
    // to a file so the test can assert it died too.
    const dir = await mkdtemp(join(tmpdir(), 'llm-bench-cli-test-'))
    const pidFile = join(dir, 'grandchild.pid')
    const script = join(dir, 'cli.mjs')
    await writeFile(
      script,
      [
        "import { spawn } from 'node:child_process'",
        "import { writeFileSync } from 'node:fs'",
        // Grandchild that holds stdout open via inherited pipe and outlives us.
        "const kid = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'inherit' })",
        `writeFileSync('${pidFile}', String(kid.pid))`,
        'await new Promise(() => {})', // parent never exits
      ].join('\n')
    )

    await expect(
      generateFromCli(
        {
          command: process.execPath,
          buildArgs: () => [script],
          timeoutMs: 2500,
        },
        {
          id: 'test',
          name: 'Test',
          provider: 'Test',
          costPer1kInputUsd: 0,
          costPer1kOutputUsd: 0,
          contextWindow: 1000,
          capabilities: '',
        },
        {
          id: 't',
          category: 'ui-building',
          title: 'T',
          blurb: '',
          prompt: 'do it',
          runtimeHint: '',
          iterationsDefault: 1,
          methodNotes: '',
          demoComponentName: 'D',
          slug: 't',
        }
      )
    ).rejects.toThrow(/Timeout after 2500ms/)

    // Give the SIGTERM → SIGKILL escalation a beat, then assert the
    // grandchild is gone (ESRCH from process.kill(0) = dead).
    await new Promise((r) => setTimeout(r, 2500))
    const grandchildPid = Number(await readFile(pidFile, 'utf8'))
    let alive = true
    try {
      process.kill(grandchildPid, 0)
    } catch {
      alive = false
    }
    expect(alive).toBe(false)
    await rm(dir, { recursive: true, force: true })
  }, 20_000)
})

describe('generateFromCli unique artifact names', () => {
  it('reads the file named by artifactName(iterationIndex) via the printed absolute path', async () => {
    // The CLI writes the artifact somewhere OTHER than the scratch cwd (this
    // mirrors opencode/agy resolving against their own session dir) and only
    // prints the absolute path. generateFromCli must read THAT file, not the
    // scratch-dir name.
    const dir = await mkdtemp(join(tmpdir(), 'llm-bench-name-test-'))
    const script = join(dir, 'cli.mjs')
    const artifactPath = join(dir, 'custom-2.html')
    await writeFile(
      script,
      [
        "import { writeFileSync } from 'node:fs'",
        `writeFileSync('${artifactPath}', '<h1>NAME_TEST</h1>')`,
        `console.log('${artifactPath}')`,
        "console.log('DONE')",
      ].join('\n')
    )

    const response = await generateFromCli(
      {
        command: process.execPath,
        artifactViaFile: true,
        artifactName: (i) => `custom-${i}.html`,
        buildArgs: () => [script],
      },
      {
        id: 'test',
        name: 'Test',
        provider: 'Test',
        costPer1kInputUsd: 0,
        costPer1kOutputUsd: 0,
        contextWindow: 1000,
        capabilities: '',
      },
      {
        id: 't',
        category: 'ui-building',
        title: 'T',
        blurb: '',
        prompt: 'do it',
        runtimeHint: '',
        iterationsDefault: 1,
        methodNotes: '',
        demoComponentName: 'D',
        slug: 't',
      },
      2 // iterationIndex → artifactName returns 'custom-2.html'
    )

    expect(response.output).toContain('<h1>NAME_TEST</h1>')
    await rm(dir, { recursive: true, force: true })
  }, 20_000)
})

describe('runCli first-output telemetry (TTFT proxy)', () => {
  it('stamps ttftMs at the FIRST stdout chunk, well before the process exits', async () => {
    const started = Date.now()
    const { stdout, ttftMs } = await runCli(
      process.execPath,
      [
        '-e',
        // First output at ~150ms, process alive for ~500ms more: a ttft that
        // equalled the total runtime would prove we timed the wrong boundary.
        'setTimeout(() => { console.log("first"); setTimeout(() => console.log("last"), 500) }, 150)',
      ],
      { timeoutMs: 20_000 }
    )
    const totalMs = Date.now() - started

    expect(stdout).toContain('first')
    expect(stdout).toContain('last')
    expect(ttftMs).toBeDefined()
    // Generous lower bound (CI timers drift); node startup alone pushes past it.
    expect(ttftMs!).toBeGreaterThanOrEqual(140)
    expect(ttftMs!).toBeLessThanOrEqual(totalMs)
    // The point of the measurement: first output, not completion.
    expect(ttftMs!).toBeLessThan(totalMs - 200)
  }, 30_000)

  it('leaves ttftMs ABSENT when the CLI never writes to stdout (no faked zero)', async () => {
    const { ttftMs } = await runCli(
      process.execPath,
      ['-e', 'console.error("only stderr here")'],
      { timeoutMs: 20_000 }
    )
    expect(ttftMs).toBeUndefined()
  }, 30_000)
})

describe('generateFromCli first-output telemetry', () => {
  it('threads the CLI first-output boundary onto the response, bounded by runtimeMs', async () => {
    const response = await generateFromCli(
      {
        command: process.execPath,
        buildArgs: () => [
          '-e',
          `setTimeout(() => { console.log(${JSON.stringify('<h1>' + 'x'.repeat(60) + '</h1>')}) }, 150)`,
        ],
      },
      TEST_MODEL,
      TEST_TASK
    )

    expect(response.ttftMs).toBeDefined()
    expect(response.ttftMs!).toBeGreaterThanOrEqual(140)
    expect(response.ttftMs!).toBeLessThanOrEqual(response.runtimeMs)
  }, 30_000)
})

describe('generateFromCli sweep retention', () => {
  it('keeps the scratch dir under the sweep root and copies the artifact to artifacts/ (0600)', async () => {
    const sweepRoot = await mkdtemp(join(tmpdir(), 'llm-bench-sweep-'))
    const scriptDir = await mkdtemp(join(tmpdir(), 'llm-bench-script-'))
    const script = join(scriptDir, 'cli.mjs')
    // The fake CLI writes ./artifact.html relative to its cwd (the scratch dir),
    // exercising the direct-name handoff path.
    await writeFile(
      script,
      [
        "import { writeFileSync } from 'node:fs'",
        "writeFileSync('artifact.html', '<h1>SWEEP_KEEP</h1>')",
        "console.log('DONE')",
      ].join('\n')
    )

    try {
      setSweepRoot(sweepRoot)
      const response = await generateFromCli(
        { command: process.execPath, artifactViaFile: true, buildArgs: () => [script] },
        TEST_MODEL,
        TEST_TASK,
        0
      )

      expect(response.output).toContain('<h1>SWEEP_KEEP</h1>')

      // Scratch dir survives, at the deterministic per-iteration path.
      const scratch = join(sweepRoot, 'scratch', 'test-t-0')
      expect(existsSync(scratch)).toBe(true)
      expect(await readFile(join(scratch, 'artifact.html'), 'utf8')).toContain('SWEEP_KEEP')

      // And the artifact is copied into the sweep root's artifacts/ dir.
      const copy = join(sweepRoot, 'artifacts', 'artifact-test-t-0.html')
      expect(await readFile(copy, 'utf8')).toContain('SWEEP_KEEP')
      const info = await stat(copy)
      expect(info.mode & 0o777).toBe(0o600)
    } finally {
      setSweepRoot(undefined)
      await rm(sweepRoot, { recursive: true, force: true })
      await rm(scriptDir, { recursive: true, force: true })
    }
  }, 20_000)

  it('overwrites the artifact copy on a retry of the same iteration', async () => {
    const sweepRoot = await mkdtemp(join(tmpdir(), 'llm-bench-sweep-'))
    const scriptDir = await mkdtemp(join(tmpdir(), 'llm-bench-script-'))
    const script = join(scriptDir, 'cli.mjs')
    await writeFile(
      script,
      [
        "import { writeFileSync } from 'node:fs'",
        "writeFileSync('artifact.html', `<h1>${process.env.BENCH_MARKER ?? 'first'}</h1>`)",
        "console.log('DONE')",
      ].join('\n')
    )

    try {
      setSweepRoot(sweepRoot)
      const config = { command: process.execPath, artifactViaFile: true, buildArgs: () => [script] }
      await generateFromCli(config, TEST_MODEL, TEST_TASK, 0)
      await generateFromCli(
        { ...config, env: { BENCH_MARKER: 'second' } },
        TEST_MODEL,
        TEST_TASK,
        0
      )

      const copy = join(sweepRoot, 'artifacts', 'artifact-test-t-0.html')
      expect(await readFile(copy, 'utf8')).toContain('<h1>second</h1>')
    } finally {
      setSweepRoot(undefined)
      await rm(sweepRoot, { recursive: true, force: true })
      await rm(scriptDir, { recursive: true, force: true })
    }
  }, 30_000)

  it('keeps the scratch dir when the CLI fails, so the failure is forensically inspectable', async () => {
    const sweepRoot = await mkdtemp(join(tmpdir(), 'llm-bench-sweep-'))
    const scriptDir = await mkdtemp(join(tmpdir(), 'llm-bench-script-'))
    const script = join(scriptDir, 'cli.mjs')
    await writeFile(
      script,
      [
        "import { writeFileSync } from 'node:fs'",
        "writeFileSync('half-written.html', '<h1>PARTIAL</h1>')",
        "console.error('boom')",
        'process.exit(3)',
      ].join('\n')
    )

    try {
      setSweepRoot(sweepRoot)
      await expect(
        generateFromCli(
          { command: process.execPath, artifactViaFile: true, buildArgs: () => [script] },
          TEST_MODEL,
          TEST_TASK,
          4
        )
      ).rejects.toThrow(/exited with code 3/)

      const scratch = join(sweepRoot, 'scratch', 'test-t-4')
      expect(existsSync(scratch)).toBe(true)
      expect(await readFile(join(scratch, 'half-written.html'), 'utf8')).toContain('PARTIAL')
    } finally {
      setSweepRoot(undefined)
      await rm(sweepRoot, { recursive: true, force: true })
      await rm(scriptDir, { recursive: true, force: true })
    }
  }, 20_000)

  it('deletes the scratch dir when NO sweep root is set (unit-test / ad-hoc behaviour)', async () => {
    const scriptDir = await mkdtemp(join(tmpdir(), 'llm-bench-script-'))
    const script = join(scriptDir, 'cli.mjs')
    // Record the scratch cwd OUTSIDE the scratch dir so the assertion survives
    // the deletion we are asserting on.
    const cwdFile = join(scriptDir, 'cwd.txt')
    await writeFile(
      script,
      [
        "import { writeFileSync } from 'node:fs'",
        `writeFileSync(${JSON.stringify(cwdFile)}, process.cwd())`,
        "writeFileSync('artifact.html', '<h1>EPHEMERAL</h1>')",
        "console.log('DONE')",
      ].join('\n')
    )

    try {
      const response = await generateFromCli(
        { command: process.execPath, artifactViaFile: true, buildArgs: () => [script] },
        TEST_MODEL,
        TEST_TASK,
        0
      )
      expect(response.output).toContain('<h1>EPHEMERAL</h1>')
      const scratch = await readFile(cwdFile, 'utf8')
      expect(scratch).toContain('llm-bench-')
      expect(existsSync(scratch)).toBe(false)
    } finally {
      await rm(scriptDir, { recursive: true, force: true })
    }
  }, 20_000)
})

describe('scrubEnv', () => {
  it('drops every credential-shaped key', () => {
    const scrubbed = scrubEnv({
      OPENROUTER_API_KEY: 'sk-or-secret',
      MY_SECRET: 'shh',
      AUTH_HEADER: 'Bearer x',
      GH_TOKEN: 'ghp_x',
      DB_PASSWORD: 'hunter2',
      PRIVATE_THING: 'rsa',
      SOME_CREDENTIAL: 'blob',
    })
    expect(Object.keys(scrubbed)).toEqual([])
  })

  it('keeps the vars a child process actually needs', () => {
    const scrubbed = scrubEnv({
      PATH: '/usr/bin',
      HOME: '/Users/x',
      NODE_ENV: 'test',
      TMPDIR: '/tmp',
      LANG: 'en_AU.UTF-8',
      OPENROUTER_API_KEY: 'sk-or-secret',
    })
    expect(scrubbed).toEqual({
      PATH: '/usr/bin',
      HOME: '/Users/x',
      NODE_ENV: 'test',
      TMPDIR: '/tmp',
      LANG: 'en_AU.UTF-8',
    })
  })

  it('matches case-insensitively', () => {
    const scrubbed = scrubEnv({ my_api_key: 'a', Some_Token: 'b', aWs_SeCrEt: 'c', plain: 'd' })
    expect(scrubbed).toEqual({ plain: 'd' })
  })

  it('does not mutate the input env', () => {
    const source = { OPENROUTER_API_KEY: 'sk-or-secret', PATH: '/usr/bin' }
    scrubEnv(source)
    expect(source.OPENROUTER_API_KEY).toBe('sk-or-secret')
  })
})

describe('runCli credential scrub', () => {
  it('hides parent credentials from the child while keeping PATH', async () => {
    process.env.FAKE_TEST_API_KEY = 'leak-me-if-you-can'
    try {
      const { stdout } = await runCli(
        process.execPath,
        ['-e', 'console.log(JSON.stringify(process.env))'],
        { timeoutMs: 20_000 }
      )
      const childEnv = JSON.parse(stdout) as Record<string, string>
      expect(childEnv.FAKE_TEST_API_KEY).toBeUndefined()
      expect(Object.keys(childEnv).filter((k) => /(key|secret|token|password|auth|credential|private)/i.test(k))).toEqual(
        []
      )
      expect(childEnv.PATH).toBe(process.env.PATH)
    } finally {
      delete process.env.FAKE_TEST_API_KEY
    }
  }, 30_000)

  it('lets a provider env override re-add a scrubbed var', async () => {
    process.env.FAKE_TEST_API_KEY = 'parent-value'
    try {
      const { stdout } = await runCli(
        process.execPath,
        ['-e', 'console.log(process.env.FAKE_TEST_API_KEY ?? "<absent>")'],
        { timeoutMs: 20_000, env: { FAKE_TEST_API_KEY: 'explicitly-allowed' } }
      )
      expect(stdout.trim()).toBe('explicitly-allowed')
    } finally {
      delete process.env.FAKE_TEST_API_KEY
    }
  }, 30_000)
})

describe('runCli error-message redaction', () => {
  it('redacts a secret-bearing stderr in the non-zero-exit error', async () => {
    await expect(
      runCli(
        process.execPath,
        ['-e', 'console.error("auth failed for API_KEY=sk-live-abc123"); process.exit(3)'],
        { timeoutMs: 20_000 }
      )
    ).rejects.toThrow(/CLI exited with code 3: auth failed for API_KEY=\*\*\*REDACTED\*\*\*/)
  }, 30_000)

  it('redacts a secret flag value in the timeout message but keeps the prompt', async () => {
    const prompt = 'Build a keyboard demo with @keyframes.'
    await expect(
      runCli(
        process.execPath,
        // `--` so node treats the rest as script args rather than its own flags.
        ['-e', 'setInterval(() => {}, 1000)', '--', '--api-key', 'sk-live-abc123', prompt],
        { timeoutMs: 500 }
      )
    ).rejects.toThrow(
      new RegExp(
        `Timeout after 500ms: .*--api-key \\*\\*\\*REDACTED\\*\\*\\* ${prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
      )
    )
  }, 30_000)
})
