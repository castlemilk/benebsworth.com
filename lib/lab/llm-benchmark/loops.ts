/**
 * Iterative improvement loops for a generated artefact.
 *
 * One generation is a single sample of what a model does with a brief. Loops
 * ask a different question: given what you built, measured in a real browser,
 * what is wrong with it and what is missing? Each loop after the first is a
 * reflection over the PREVIOUS artefact, not a fresh sample of the same brief,
 * which is the only reason to run more than one.
 *
 * The three jobs of a loop, in order:
 *   1. measure  — the artefact is opened in a real browser at three widths and
 *      screenshotted, and the design skills' rule set is run against it. This
 *      is what turns "looks fine to me" into a list of checkable defects.
 *   2. reflect — the measurements, the rule findings and the previous artefact
 *      become a prompt that asks for specific fixes AND for what is missing.
 *      Improvement alone converges to "polish what exists"; the extend half is
 *      what keeps a page from being immaculate and thin.
 *   3. regenerate — the model rewrites the artefact; the result is scored the
 *      same way as loop 1, so the progression is comparable rather than a
 *      series of impressions.
 */

export interface LoopMeasurement {
  width: number;
  /** Short form of what the page showed at this width. */
  summary: string;
  /** Horizontal overflow in px, the defect that breaks a layout most visibly. */
  overflowPx?: number;
  /** Screenshot path relative to the loop directory. */
  screenshot?: string;
}

export interface LoopRuleFinding {
  id: string;
  level: 'FAIL' | 'WARN';
  message: string;
  fix?: string;
}

export interface LoopReport {
  /** The design inspector's own verdict, when it ran. */
  verdict?: string;
  headline?: string;
  words?: number;
  screens?: number;
  measurements: LoopMeasurement[];
  findings: LoopRuleFinding[];
  /** The task rubric's score for this loop, when it was scored. */
  rubricScore?: number;
  /** Output tokens for the generation that produced this artefact. */
  tokensOut?: number;
  runtimeMs?: number;
  costUsd?: number;
  error?: string;
}

export interface LoopPlan {
  /** 1-based loop index. */
  loop: number;
  prompt: string;
  /** What this loop is being asked to do, for the manifest. */
  intent: 'generate' | 'reflect-and-improve';
}

const MAX_ARTIFACT_CHARS = 60_000;

/**
 * The reflection prompt.
 *
 * Three rules this prompt has to keep:
 *
 * 1. **The model sees measurements, not opinions.** A rule finding names the
 *    defect and the fix; "make it pop" is not actionable and produces noise.
 * 2. **Findings are ordered by severity and capped.** A page with forty
 *    findings gets a model that fixes forty small things and breaks the three
 *    that mattered. FAILs first, then a bounded number of WARNs.
 * 3. **Improve AND extend.** A loop that only fixes defects converges to a
 *    competent, thin page — which is exactly what the first loop already was.
 */
export function buildLoopPrompt(args: {
  loop: number
  taskPrompt: string
  artifact: string
  report: LoopReport
  /** Skills block, already rendered; undefined on a skills-less run. */
  skillsText?: string
}): LoopPlan {
  const { loop, taskPrompt, artifact, report } = args
  if (loop <= 1) {
    return { loop, intent: 'generate', prompt: taskPrompt }
  }

  const fails = report.findings.filter((f) => f.level === 'FAIL').slice(0, 12);
  const warns = report.findings.filter((f) => f.level === 'WARN').slice(0, 8);
  const findingLines = [...fails, ...warns].map(
    (f) => `- [${f.level}] ${f.message}${f.fix ? ` — ${f.fix}` : ''}`
  );
  const widthLines = report.measurements.map(
    (m) => `- ${String(m.width)}px: ${m.summary}${m.overflowPx ? ` (horizontal overflow ${String(m.overflowPx)}px)` : ''}`
  );

  const sections: string[] = [];

  if (args.skillsText && args.skillsText.length > 0) {
    sections.push(args.skillsText.trimEnd());
  }

  sections.push(
    [
      `This is revision ${String(loop)} of the page below. A previous version already exists and has been`,
      'measured in a real browser. Your job is to improve it against what the measurements',
      'found, and to extend it where it is thin — not to start over, and not to keep what',
      'is wrong.',
      '',
      '## What the browser found',
      ...(widthLines.length > 0 ? widthLines : ['- no measurements were taken']),
      '',
      '## Defects to fix',
      ...(findingLines.length > 0 ? findingLines : ['- no rule findings were recorded']),
      '',
      '## The rubric last time',
      report.rubricScore !== undefined
        ? `The scoring rubric gave the previous version ${String(report.rubricScore)}/100.`
        : 'The previous version was not scored.',
      '',
      '## How to revise',
      '1. Fix every FAIL above. They are defects, not preferences.',
      '2. Fix the WARNs that make the page read as generic rather than designed.',
      '3. Extend it: the rubric rewards a page that carries its full content — a real',
      '   pricing story, a working demonstration, the sections a visitor needs to',
      '   decide. A page that is immaculate and empty scores worse than one that is',
      '   plain and complete.',
      '4. Change as little as possible per defect. A rewrite that fixes the findings',
      '   and loses the good parts is a worse revision.',
      '5. Keep it a single self-contained HTML file with no build step, exactly as the',
      '   brief requires.',
      '',
      '## The page as it stands',
      '```html',
      artifact.length > MAX_ARTIFACT_CHARS
        ? `${artifact.slice(0, MAX_ARTIFACT_CHARS)}\n<!-- truncated: ${String(artifact.length - MAX_ARTIFACT_CHARS)} more characters -->\n`
        : artifact,
      '```',
      '',
      '---',
      '',
      taskPrompt,
    ].join('\n')
  );

  return { loop, intent: 'reflect-and-improve', prompt: sections.join('\n\n') }
}

/**
 * Did this loop actually improve anything?
 *
 * Compares on the rubric first, then on defects: a loop that fixed a FAIL but
 * lost the rubric's responsive band is not a win, and a loop that fixed nothing
 * should stop the run rather than burn another generation.
 */
export function loopProgress(
  previous: LoopReport | undefined,
  current: LoopReport
): { improving: boolean; regressed: boolean; reason: string } {
  if (!previous) return { improving: true, regressed: false, reason: 'first loop' };
  const prevFails = previous.findings.filter((f) => f.level === 'FAIL').length;
  const nowFails = current.findings.filter((f) => f.level === 'FAIL').length;
  const prevScore = previous.rubricScore;
  const nowScore = current.rubricScore;

  if (prevScore !== undefined && nowScore !== undefined) {
    if (nowScore < prevScore) {
      return { improving: false, regressed: true, reason: `rubric fell ${String(prevScore)} → ${String(nowScore)}` };
    }
    if (nowScore > prevScore) {
      return { improving: true, regressed: false, reason: `rubric rose ${String(prevScore)} → ${String(nowScore)}` };
    }
  }
  if (nowFails < prevFails) {
    return { improving: true, regressed: false, reason: `FAIL findings ${String(prevFails)} → ${String(nowFails)}` };
  }
  if (nowFails > prevFails) {
    return { improving: false, regressed: true, reason: `FAIL findings rose ${String(prevFails)} → ${String(nowFails)}` };
  }
  return { improving: false, regressed: false, reason: 'no movement in rubric or defects' };
}
