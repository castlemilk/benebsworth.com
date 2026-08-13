import { describe, it, expect } from 'vitest'
import { extractLikelyCode, generateFromCli } from './cli'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
