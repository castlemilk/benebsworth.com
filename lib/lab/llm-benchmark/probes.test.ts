import { describe, it, expect } from 'vitest'

import { SANDBOX_CONSTRAINTS } from './prompts'
import {
  PROBES,
  ASSERT_KINDS,
  evaluateProbe,
  parseProbes,
  probePrompt,
  type Probe,
  type ProbeAssert,
} from './probes'

function probe(over: Partial<Probe> = {}): Probe {
  return {
    id: 'p',
    description: 'a probe',
    prompt: 'do the thing',
    appendGlobalContract: false,
    asserts: [{ kind: 'contains', value: 'x' }],
    ...over,
  }
}

/** The raw JSON shape (one probe, in a document) the loader validates. */
function doc(over: Record<string, unknown> = {}): unknown {
  return [
    {
      id: 'p',
      description: 'a probe',
      prompt: 'do the thing',
      appendGlobalContract: false,
      asserts: [{ kind: 'contains', value: 'x' }],
      ...over,
    },
  ]
}

describe('parseProbes', () => {
  it('accepts a well-formed document', () => {
    expect(parseProbes(doc())).toEqual([probe()])
  })

  it('rejects a document that is not an array', () => {
    expect(() => parseProbes({ p: {} })).toThrow(/must be an array/i)
  })

  it('rejects a non-object entry, naming its position', () => {
    expect(() => parseProbes(['nope'])).toThrow(/probe #1/i)
  })

  it('rejects an unknown key, naming the probe', () => {
    expect(() => parseProbes(doc({ retries: 3 }))).toThrow(/probe "p".*unknown key "retries"/i)
  })

  it('rejects an empty prompt, naming the probe', () => {
    expect(() => parseProbes(doc({ prompt: '   ' }))).toThrow(/probe "p".*prompt/i)
  })

  it('rejects a missing description', () => {
    const raw = doc() as Record<string, unknown>[]
    delete raw[0].description
    expect(() => parseProbes(raw)).toThrow(/probe "p".*description/i)
  })

  it('rejects a missing appendGlobalContract — it must be stated, never guessed', () => {
    const raw = doc() as Record<string, unknown>[]
    delete raw[0].appendGlobalContract
    expect(() => parseProbes(raw)).toThrow(/probe "p".*appendGlobalContract/i)
  })

  it('rejects an empty assert list — a probe that asserts nothing always passes', () => {
    expect(() => parseProbes(doc({ asserts: [] }))).toThrow(/probe "p".*at least one assert/i)
  })

  it('rejects an unknown assert kind, naming the probe and listing the kinds', () => {
    expect(() => parseProbes(doc({ asserts: [{ kind: 'equals', value: 'x' }] }))).toThrow(
      /probe "p".*assert #1.*unknown kind "equals"/i
    )
    expect(() => parseProbes(doc({ asserts: [{ kind: 'equals', value: 'x' }] }))).toThrow(
      /not-contains/
    )
  })

  it('rejects an assert whose value is not a non-empty string', () => {
    expect(() => parseProbes(doc({ asserts: [{ kind: 'contains', value: '' }] }))).toThrow(
      /probe "p".*assert #1.*value/i
    )
  })

  it('rejects an uncompilable regex, naming the probe and quoting the pattern', () => {
    expect(() => parseProbes(doc({ asserts: [{ kind: 'matches', value: '<canvas[' }] }))).toThrow(
      /probe "p".*assert #1.*<canvas\[/
    )
  })

  it('rejects invalid regex flags', () => {
    expect(() =>
      parseProbes(doc({ asserts: [{ kind: 'matches', value: 'a', flags: 'q' }] }))
    ).toThrow(/probe "p".*assert #1/i)
  })

  it('rejects flags on a substring assert — they would silently do nothing', () => {
    expect(() =>
      parseProbes(doc({ asserts: [{ kind: 'contains', value: 'a', flags: 'i' }] }))
    ).toThrow(/probe "p".*assert #1.*flags/i)
  })

  it('rejects duplicate probe ids', () => {
    const raw = [...(doc() as unknown[]), ...(doc() as unknown[])]
    expect(() => parseProbes(raw)).toThrow(/duplicate probe id "p"/i)
  })
})

describe('the shipped probes.json', () => {
  it('round-trips through the loader', () => {
    expect(PROBES.length).toBeGreaterThan(0)
    expect(parseProbes(JSON.parse(JSON.stringify(PROBES)))).toEqual(PROBES)
  })

  it('has unique ids', () => {
    expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length)
  })

  it('ships the six probes the runbook names', () => {
    expect(PROBES.map((p) => p.id).sort()).toEqual([
      'css-sized-canvas',
      'doctype-first',
      'fills-viewport',
      'no-cdn',
      'scoped-context',
      'try-catch-alert',
    ])
  })

  it('keeps every prompt short — probes are meant to be cheap', () => {
    for (const p of PROBES) {
      expect(p.prompt.length, `${p.id} prompt`).toBeLessThan(600)
    }
  })

  it('bakes no sandbox-contract text into the data (it is appended at run time)', () => {
    for (const p of PROBES) {
      expect(p.prompt, `${p.id} prompt`).not.toContain('EXECUTION ENVIRONMENT')
    }
  })
})

describe('probePrompt', () => {
  it('appends the REAL sandbox contract when the probe asks for it', () => {
    const composed = probePrompt(probe({ appendGlobalContract: true }))
    expect(composed.startsWith('do the thing')).toBe(true)
    // A distinctive line from prompts.ts — this is the derivation lock: the
    // probe must fail the moment the contract stops saying it.
    expect(composed).toContain('The DOCTYPE must be the very first node')
    expect(composed).toContain(SANDBOX_CONSTRAINTS.trim())
  })

  it('leaves the prompt alone otherwise', () => {
    expect(probePrompt(probe({ appendGlobalContract: false }))).toBe('do the thing')
  })
})

describe('evaluateProbe', () => {
  function evalWith(reply: string, asserts: ProbeAssert[]) {
    return evaluateProbe(reply, probe({ asserts }))
  }

  it('covers every assert kind in ASSERT_KINDS', () => {
    // Guard: a new kind must arrive with tests below, not silently untested.
    expect([...ASSERT_KINDS].sort()).toEqual([
      'contains',
      'matches',
      'not-contains',
      'not-matches',
      'starts-with',
    ])
  })

  it('starts-with — passes and fails', () => {
    expect(evalWith('<!DOCTYPE html>', [{ kind: 'starts-with', value: '<!DOCTYPE' }]).passed).toBe(
      true
    )
    expect(evalWith('Sure! <!DOCTYPE', [{ kind: 'starts-with', value: '<!DOCTYPE' }]).passed).toBe(
      false
    )
  })

  it('contains — passes and fails', () => {
    expect(evalWith('a role="alert" b', [{ kind: 'contains', value: 'role="alert"' }]).passed).toBe(
      true
    )
    expect(evalWith('nothing here', [{ kind: 'contains', value: 'role="alert"' }]).passed).toBe(
      false
    )
  })

  it('not-contains — passes and fails', () => {
    expect(evalWith('no imports', [{ kind: 'not-contains', value: '@import' }]).passed).toBe(true)
    expect(evalWith('@import url(x)', [{ kind: 'not-contains', value: '@import' }]).passed).toBe(
      false
    )
  })

  it('matches — passes and fails, honouring flags', () => {
    expect(evalWith('body{margin: 0}', [{ kind: 'matches', value: 'margin:\\s*0' }]).passed).toBe(
      true
    )
    expect(evalWith('MARGIN:0', [{ kind: 'matches', value: 'margin:\\s*0' }]).passed).toBe(false)
    expect(
      evalWith('MARGIN:0', [{ kind: 'matches', value: 'margin:\\s*0', flags: 'i' }]).passed
    ).toBe(true)
  })

  it('not-matches — passes and fails', () => {
    expect(
      evalWith('<canvas style="width:100%">', [
        { kind: 'not-matches', value: '<canvas[^>]*\\s(width|height)=', flags: 'i' },
      ]).passed
    ).toBe(true)
    expect(
      evalWith('<canvas width="800">', [
        { kind: 'not-matches', value: '<canvas[^>]*\\s(width|height)=', flags: 'i' },
      ]).passed
    ).toBe(false)
  })

  it('collects EVERY failure, not just the first', () => {
    const result = evalWith('<script src="cdn"></script> @import x', [
      { kind: 'not-matches', value: '<script[^>]+src=', flags: 'i' },
      { kind: 'not-contains', value: '@import' },
      { kind: 'contains', value: 'role="alert"' },
    ])
    expect(result.passed).toBe(false)
    expect(result.failures.map((f) => f.index)).toEqual([0, 1, 2])
    expect(result.failures.map((f) => f.assert.kind)).toEqual([
      'not-matches',
      'not-contains',
      'contains',
    ])
  })

  it('reports what a negative assert actually matched', () => {
    const result = evalWith('x <script src="https://cdn"> y', [
      { kind: 'not-matches', value: '<script[^>]+src=', flags: 'i' },
    ])
    expect(result.failures[0].detail).toContain('<script src=')
  })

  it('passes cleanly when every assert holds', () => {
    const result = evalWith('<!DOCTYPE html><body style="margin:0">', [
      { kind: 'starts-with', value: '<!DOCTYPE html' },
      { kind: 'matches', value: 'margin:\\s*0' },
      { kind: 'not-contains', value: '@import' },
    ])
    expect(result).toEqual({ probeId: 'p', passed: true, failures: [] })
  })

  it('evaluates the RAW reply — no fence stripping, no cleaning', () => {
    // The runner deliberately does not clean; a probe that wants to tolerate a
    // fence says so in its own pattern (see doctype-first).
    const fenced = '```html\n<!DOCTYPE html>\n```'
    expect(evalWith(fenced, [{ kind: 'starts-with', value: '<!DOCTYPE' }]).passed).toBe(false)
    expect(
      evalWith(fenced, [
        { kind: 'matches', value: '^\\s*(?:```[a-zA-Z]*\\s*)?<!doctype html', flags: 'i' },
      ]).passed
    ).toBe(true)
  })

  it('is stateless across calls with a global-flagged pattern', () => {
    const asserts: ProbeAssert[] = [{ kind: 'matches', value: 'a', flags: 'g' }]
    expect(evalWith('a', asserts).passed).toBe(true)
    expect(evalWith('a', asserts).passed).toBe(true)
  })
})

describe('the shipped probes against reference replies', () => {
  function byId(id: string): Probe {
    const found = PROBES.find((p) => p.id === id)
    if (!found) throw new Error(`no probe ${id}`)
    return found
  }

  it('doctype-first tolerates a leading code fence but not a prose preamble', () => {
    expect(evaluateProbe('```html\n<!DOCTYPE html>\n<html></html>', byId('doctype-first')).passed).toBe(true)
    expect(
      evaluateProbe('Here you go:\n<!DOCTYPE html>', byId('doctype-first')).passed
    ).toBe(false)
  })

  it('css-sized-canvas fails an attribute-sized canvas, passes a JS-sized one', () => {
    expect(
      evaluateProbe('<canvas id="c"></canvas><script>c.width=innerWidth</script>', byId('css-sized-canvas'))
        .passed
    ).toBe(true)
    expect(evaluateProbe('<canvas width="800" height="600"></canvas>', byId('css-sized-canvas')).passed).toBe(
      false
    )
  })

  it('no-cdn fails a CDN script tag', () => {
    expect(
      evaluateProbe('<script src="https://cdn.tailwindcss.com"></script>', byId('no-cdn')).passed
    ).toBe(false)
    expect(evaluateProbe('<script>const a=1</script>', byId('no-cdn')).passed).toBe(true)
  })

  it('try-catch-alert fails window.alert and a missing alert region', () => {
    const bad = evaluateProbe('<script>window.alert("boom")</script>', byId('try-catch-alert'))
    expect(bad.passed).toBe(false)
    expect(bad.failures.length).toBe(2)
    expect(
      evaluateProbe('<div role="alert"></div><script>try{}catch(e){}</script>', byId('try-catch-alert'))
        .passed
    ).toBe(true)
  })

  it('scoped-context fails any reach for external data', () => {
    expect(evaluateProbe('fetch("/api")', byId('scoped-context')).passed).toBe(false)
    expect(evaluateProbe('<dl><dt>orbiter</dt></dl>', byId('scoped-context')).passed).toBe(true)
  })

  it('fills-viewport wants a zeroed margin', () => {
    expect(evaluateProbe('html,body{margin: 0;padding:0}', byId('fills-viewport')).passed).toBe(true)
    expect(evaluateProbe('body{margin: 2rem}', byId('fills-viewport')).passed).toBe(false)
  })
})
