import { describe, it, expect } from 'vitest'
import { buildLoopPrompt, loopProgress, type LoopReport } from './loops.js'

const BRIEF = 'Build a single-file React + Tailwind landing page with a hero, feature grid, pricing cards.'

function report(overrides: Partial<LoopReport> = {}): LoopReport {
  return {
    measurements: [{ width: 390, summary: 'hero fills the fold', overflowPx: 3 }],
    findings: [
      { id: 'eyebrow', level: 'FAIL', message: 'badge above the headline', fix: 'delete it' },
      { id: 'icon-cards', level: 'FAIL', message: 'four identical icon cards', fix: 'one composed section' },
      { id: 'few-pictures', level: 'WARN', message: 'no imagery' },
    ],
    rubricScore: 65,
    ...overrides,
  }
}

/**
 * Loops only mean something if each one is told what the browser actually
 * found, and if the brief stays last. These tests pin both, plus the property
 * that makes a loop chain rather than a series of unrelated generations.
 */
describe('buildLoopPrompt', () => {
  it('loop 1 is the bare brief, so the first version is not already an intervention', () => {
    const plan = buildLoopPrompt({ loop: 1, taskPrompt: BRIEF, artifact: '', report: report() })
    expect(plan.intent).toBe('generate')
    expect(plan.prompt).toBe(BRIEF)
  })

  it('carries the previous artefact, the measurements and the defects', () => {
    const artifact = '<html><body>Nimbus</body></html>'
    const plan = buildLoopPrompt({ loop: 2, taskPrompt: BRIEF, artifact, report: report() })

    expect(plan.intent).toBe('reflect-and-improve')
    expect(plan.prompt).toContain('390px: hero fills the fold (horizontal overflow 3px)')
    expect(plan.prompt).toContain('[FAIL] badge above the headline — delete it')
    expect(plan.prompt).toContain('revision 2')
    expect(plan.prompt).toContain(artifact)
    // The brief stays last: it is the instruction to build the artefact.
    expect(plan.prompt.trimEnd().endsWith(BRIEF)).toBe(true)
  })

  it('orders FAILs before WARNs and caps each band', () => {
    const many: LoopReport = {
      ...report(),
      findings: [
        ...Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, level: 'WARN' as const, message: `warn ${i}` })),
        ...Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, level: 'FAIL' as const, message: `fail ${i}` })),
      ],
    }
    const prompt = buildLoopPrompt({ loop: 3, taskPrompt: BRIEF, artifact: 'x', report: many }).prompt
    const firstWarn = prompt.indexOf('[WARN] warn 0')
    const lastFail = prompt.lastIndexOf('[FAIL] fail 19')
    expect(lastFail).toBeLessThan(firstWarn)
    expect(prompt).toContain('[FAIL] fail 11')
    expect(prompt).not.toContain('fail 12')
    expect(prompt).not.toContain('warn 8')
  })

  it('asks for improvement AND extension, because fixing alone converges to thin', () => {
    const prompt = buildLoopPrompt({ loop: 2, taskPrompt: BRIEF, artifact: 'x', report: report() }).prompt
    expect(prompt).toMatch(/Extend it/)
    expect(prompt).toMatch(/immaculate and empty|complete/)
  })

  it('truncates a huge artefact rather than blowing the context window', () => {
    const huge = 'x'.repeat(200_000)
    const prompt = buildLoopPrompt({ loop: 2, taskPrompt: BRIEF, artifact: huge, report: report() }).prompt
    expect(prompt).toContain('truncated: 140000 more characters')
    expect(prompt.length).toBeLessThan(80_000)
  })

  it('mounts the skills block when the arm has one, and stays identical when it does not', () => {
    const withSkills = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: 'x',
      report: report(),
      skillsText: 'Follow the design procedure below.',
    }).prompt
    expect(withSkills.startsWith('Follow the design procedure below.')).toBe(true)

    const without = buildLoopPrompt({ loop: 2, taskPrompt: BRIEF, artifact: 'x', report: report() }).prompt
    expect(without).not.toContain('Follow the design procedure')
  })
})

describe('loopProgress', () => {
  it('the first loop has nothing to improve on', () => {
    expect(loopProgress(undefined, report())).toMatchObject({ improving: true, regressed: false })
  })

  it('a higher rubric score is progress, a lower one is a regression', () => {
    expect(loopProgress(report({ rubricScore: 65 }), report({ rubricScore: 100 })).improving).toBe(true)
    const down = loopProgress(report({ rubricScore: 100 }), report({ rubricScore: 65 }))
    expect(down.regressed).toBe(true)
    expect(down.reason).toContain('fell')
  })

  it('falls back to defect counts when a loop was not scored', () => {
    const prev = report({ rubricScore: undefined, findings: [{ id: 'a', level: 'FAIL', message: 'x' }] })
    const next = report({ rubricScore: undefined, findings: [] })
    expect(loopProgress(prev, next).improving).toBe(true)
  })

  it('reports no movement when nothing changed, so a run can stop burning tokens', () => {
    const verdict = loopProgress(report(), report())
    expect(verdict.improving).toBe(false)
    expect(verdict.reason).toContain('no movement')
  })
})
