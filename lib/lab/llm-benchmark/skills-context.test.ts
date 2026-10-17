import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { applySkillBlock, buildSkillBlock } from './skills-context.js'

/**
 * The skills arm is only evidence if the injection is mechanical. These tests
 * pin the properties the experiment depends on: one block, deterministic
 * order, frontmatter stripped, missing skills inert, and — critically — the
 * task brief still last so the model builds what was asked.
 */
function makeSkillsDir(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-skills-'))
  for (const [name, contents] of Object.entries(files)) {
    fs.mkdirSync(path.join(root, name), { recursive: true })
    fs.writeFileSync(path.join(root, name, 'SKILL.md'), contents)
  }
  return root
}

const SKILL_A = `---
name: frontend-design
description: Visual design direction for UI work.
---

Use a deliberate type scale and one coherent palette.`

const SKILL_B = `---
name: high-end-visual-design
description: What expensive-looking interfaces do.
---

Restraint plus one strong idea beats decoration.`

describe('buildSkillBlock', () => {
  it('renders the named skills, frontmatter stripped, in the order asked', () => {
    const dir = makeSkillsDir({ 'frontend-design': SKILL_A, 'high-end-visual-design': SKILL_B })
    const block = buildSkillBlock(dir, ['frontend-design', 'high-end-visual-design'])

    expect(block.names).toEqual(['frontend-design', 'high-end-visual-design'])
    expect(block.text).toContain('Use a deliberate type scale')
    expect(block.text).toContain('Restraint plus one strong idea')
    // Frontmatter must not ride along: it is metadata, and `description:` in
    // the prompt is noise the model does not need.
    expect(block.text).not.toContain('description:')
    expect(block.text.indexOf('frontend-design')).toBeLessThan(
      block.text.indexOf('high-end-visual-design'),
    )
  })

  it('is deterministic — the same inputs produce the same bytes', () => {
    const dir = makeSkillsDir({ a: SKILL_A, b: SKILL_B })
    const names = ['frontend-design', 'high-end-visual-design'] as const
    expect(buildSkillBlock(dir, names).text).toBe(buildSkillBlock(dir, names).text)
  })

  it('ignores missing skills rather than failing the run, and reports what it got', () => {
    const dir = makeSkillsDir({ 'frontend-design': SKILL_A })
    const block = buildSkillBlock(dir, ['frontend-design', 'does-not-exist'])
    expect(block.names).toEqual(['frontend-design'])
    expect(block.chars).toBeGreaterThan(0)
  })

  it('returns an empty block when nothing was asked for or found', () => {
    const dir = makeSkillsDir({ 'frontend-design': SKILL_A })
    expect(buildSkillBlock(dir, []).chars).toBe(0)
    expect(buildSkillBlock(dir, ['nope']).chars).toBe(0)
    expect(buildSkillBlock('', ['frontend-design']).chars).toBe(0)
  })
})

describe('applySkillBlock', () => {
  it('keeps the task brief last, where the instruction to build lives', () => {
    const dir = makeSkillsDir({ 'frontend-design': SKILL_A })
    const block = buildSkillBlock(dir, ['frontend-design'])
    const prompt = applySkillBlock('Build a single-file landing page.', block)

    expect(prompt.endsWith('Build a single-file landing page.')).toBe(true)
    expect(prompt.indexOf('Use a deliberate type scale')).toBeLessThan(
      prompt.indexOf('Build a single-file landing page.'),
    )
  })

  it('is the identity when there is no block, so the baseline arm is untouched', () => {
    const brief = 'Build a single-file landing page.'
    expect(applySkillBlock(brief, undefined)).toBe(brief)
    expect(applySkillBlock(brief, { names: [], text: '', chars: 0 })).toBe(brief)
  })
})
