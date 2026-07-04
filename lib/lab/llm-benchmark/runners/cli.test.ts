import { describe, it, expect } from 'vitest'
import { extractLikelyCode } from './cli'

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
