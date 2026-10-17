import fs from 'node:fs';
import path from 'node:path';

/**
 * Optional skill context for a benchmark run.
 *
 * A model asked to build a landing page from a two-sentence brief will produce
 * something generic; the same model handed a design procedure produces
 * something decided. That is the whole claim under test, and it can only be
 * tested if the injection is mechanical and identical between arms: same
 * block, same wording, same order, derived from the same files — and never
 * from the task's own scoring notes, which would be leaking the answer key.
 *
 * The block is prepended to the task prompt rather than appended: the brief
 * stays the last thing the model reads, which is where the instruction to
 * actually build the artefact belongs.
 */

export interface SkillBlock {
  /** Skill names, in the order they were rendered. */
  names: string[];
  /** The exact text prepended to the task prompt. */
  text: string;
  /** Character length, for reporting alongside token estimates. */
  chars: number;
}

/** Frontmatter keys are stripped; only the body is instructions. */
function body(markdown: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  return (match ? markdown.slice(match[0].length) : markdown).trim();
}

/** The `name:` from SKILL.md frontmatter, falling back to the directory. */
function name(markdown: string, dir: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  const fromFrontmatter = match?.[1]?.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  return fromFrontmatter && fromFrontmatter.length > 0 ? fromFrontmatter : path.basename(dir);
}

/**
 * Render the skills named in `skillNames` from a skills directory.
 *
 * Missing or empty names produce an empty block rather than an error: an arm
 * that silently gains no context is worse than one that refuses to run, but a
 * typo in a sweep flag should not take a paid run down with it — so the caller
 * gets `names: []` and can report the arm honestly as un-injected.
 */
export function buildSkillBlock(skillsDir: string, skillNames: readonly string[]): SkillBlock {
  const wanted = skillNames.map((n) => n.trim()).filter((n) => n.length > 0);
  if (wanted.length === 0 || skillsDir.length === 0) return { names: [], text: '', chars: 0 };

  const sections: string[] = [];
  const names: string[] = [];
  for (const skillName of wanted) {
    const file = path.join(skillsDir, skillName, 'SKILL.md');
    let markdown: string;
    try {
      markdown = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const content = body(markdown);
    if (content.length === 0) continue;
    names.push(name(markdown, path.dirname(file)));
    sections.push(`### ${name(markdown, path.dirname(file))}\n\n${content}`);
  }
  if (sections.length === 0) return { names: [], text: '', chars: 0 };

  const text = [
    'Follow the design procedure below before you write any code. It is a set of',
    'decisions to make, not code to copy: apply it to the brief, and where it',
    'conflicts with the brief, the brief wins.',
    '',
    ...sections,
    '',
  ].join('\n');

  return { names, text, chars: text.length };
}

/** Prepend the block to the task prompt. Identity when there is nothing to add. */
export function applySkillBlock(taskPrompt: string, block: SkillBlock | undefined): string {
  if (!block || block.chars === 0) return taskPrompt;
  return `${block.text}\n---\n\n${taskPrompt}`;
}
