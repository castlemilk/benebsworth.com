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
  level: "FAIL" | "WARN";
  message: string;
  fix?: string;
}

export interface LoopReport {
  /** The design inspector's own verdict, when it ran. */
  verdict?: string;
  headline?: string;
  words?: number;
  screens?: number;
  /**
   * Which scoring semantics produced `rubricScore` and the reward.
   *
   * Terminal-RSI (§2.1, "value drift across recursive supervision") is explicit
   * that a critic's values are only calibrated for the policy and reward that
   * produced them: after the actor changes, inherited values are not reliable,
   * so the method recalibrates before trusting them. Here the critic is the
   * scorer. Changing what a check measures moves every number it has ever
   * produced, so the version travels with the score and a comparison across two
   * versions is reported as uncalibrated instead of as a delta.
   */
  scorerVersion?: string;
  /**
   * What the verifier said, priced: passed checks, strict success, and the
   * two rewards. Present so a decision never rests on the rubric alone.
   */
  reward?: {
    family: string;
    passed: number;
    total: number;
    strict?: boolean;
    strictEvaluated: boolean;
    /** Family Dense Reward: progress, normalised by family. */
    fdr: number;
    /** Success-Prioritised Reward: progress that cannot out-earn completion. */
    spr: number;
  };
  measurements: LoopMeasurement[];
  findings: LoopRuleFinding[];
  /** The task rubric's score for this loop, when it was scored. */
  rubricScore?: number;
  /** Output tokens for the generation that produced this artefact. */
  tokensOut?: number;
  runtimeMs?: number;
  costUsd?: number;
  /** Where each picture came from, so a stock fallback is visible in the record. */
  imageSources?: string[];
  /**
   * The pictures this loop was given, in full: what was asked for, where it came
   * from, how big it landed and how long it took. A record that only says
   * "hero.jpg: comfy" cannot answer whether the generation was worth its 72
   * seconds, or whether the picture on the page is the one that was asked for.
   */
  images?: {
    file: string;
    source: string;
    subject: string;
    bytes: number;
    ms: number;
  }[];
  error?: string;
}

export interface LoopPlan {
  /** 1-based loop index. */
  loop: number;
  prompt: string;
  /** What this loop is being asked to do, for the manifest. */
  intent: "generate" | "reflect-and-improve";
}

const MAX_ARTIFACT_CHARS = 60_000;

/**
 * Which scoring semantics the loop is running under.
 *
 * Bump this whenever a check changes what it measures, not when it changes how
 * it is worded. `landing-animates` moving from canvas pixels to declared DOM
 * motion is a version change: every score produced before it means something
 * different from every score after it, and the manifest has to be able to say so.
 */
export const SCORER_VERSION = "2026-10-19.dom-motion";

/** One finding, weighted by how many turns it has survived. */
export interface DefectCredit {
  id: string;
  message: string;
  level: "FAIL" | "WARN";
  fix?: string;
  /** How many loops this finding has appeared in. */
  seenIn: number;
  /** Present in the most recent loop AND seen more than once. */
  persistent: boolean;
  /** Credit weight: persistent findings keep full weight, one-offs decay. */
  weight: number;
}

/**
 * Credit across turns, not across mentions.
 *
 * The paper's TB-GAE (§2.3) objects to credit that decays by textual length:
 * observations carry no decisions, so they should not add recursion steps. The
 * loop's observations are the inspector's screenshots and measurements — one
 * finding can be restated by three of them, and counting each mention would make
 * a well-measured defect look like three defects and a badly measured one look
 * like nothing.
 *
 * So each rule id gets credit once per loop, and a finding that keeps coming back
 * across turns keeps its weight while a finding that appeared once decays. The
 * decay constant is the loop's turn discount, and it is applied only across turn
 * boundaries — the direct analogue of the paper's (γ_turn, λ_turn) clock.
 */
export function defectCredit(
  history: LoopReport[],
  { turnDecay = 0.6 }: { turnDecay?: number } = {},
): DefectCredit[] {
  const seen = new Map<string, { finding: LoopRuleFinding; loops: number }>();
  const turns = Math.max(1, history.length);
  for (const report of history) {
    // Once per turn per rule id. A defect reported at three widths is one defect,
    // and counting each mention is how a well-measured page looks worse than a
    // badly measured one.
    const inThisTurn = new Set<string>();
    for (const finding of report.findings) {
      if (inThisTurn.has(finding.id)) continue;
      inThisTurn.add(finding.id);
      const entry = seen.get(finding.id) ?? { finding, loops: 0 };
      entry.finding = finding;
      entry.loops += 1;
      seen.set(finding.id, entry);
    }
  }
  const currentIds = new Set(
    (history[history.length - 1]?.findings ?? []).map((f) => f.id),
  );
  const credits: DefectCredit[] = [...seen.values()].map(
    ({ finding, loops }) => {
      const persistent = loops > 1 && currentIds.has(finding.id);
      // Decay is by turns survived, so a finding fixed last loop contributes
      // turnDecay^(turns - loops) — near zero once gone, full while it lasts.
      const weight = persistent ? 1 : Math.max(0, turnDecay ** (turns - loops));
      return {
        id: finding.id,
        message: finding.message,
        level: finding.level,
        fix: finding.fix,
        seenIn: loops,
        persistent,
        weight,
      };
    },
  );
  // Persistent first, then by credit, then severity: the finding that has
  // survived every round is the one the model is not fixing.
  return credits.sort((a, b) => {
    if (a.persistent !== b.persistent) return a.persistent ? -1 : 1;
    if (a.weight !== b.weight) return b.weight - a.weight;
    if (a.level !== b.level) return a.level === "FAIL" ? -1 : 1;
    return 0;
  });
}

/**
 * The reflection prompt.
 *
 * Four rules this prompt has to keep:
 *
 * 1. **The model sees measurements, not opinions.** A rule finding names the
 *    defect and the fix; "make it pop" is not actionable and produces noise.
 * 2. **Findings are ordered by persistence and severity, and capped.** A page
 *    with forty findings gets a model that fixes forty small things and breaks
 *    the three that mattered. Findings that survived every round come first,
 *    because those are the ones the previous revisions failed to fix.
 * 3. **Improve AND extend.** A loop that only fixes defects converges to a
 *    competent, thin page — which is exactly what the first loop already was.
 * 4. **What the verifier thought, in the verifier's terms.** The rubric number
 *    alone has lied in both directions here — 100 on a page with ten defects,
 *    62 on one with three — so the page is told both the progress score and
 *    whether it actually cleared the bar.
 */
export function buildLoopPrompt(args: {
  loop: number;
  taskPrompt: string;
  artifact: string;
  report: LoopReport;
  /** Every loop so far, oldest first. Used to weight findings by persistence. */
  history?: LoopReport[];
  /** Skills block, already rendered; undefined on a skills-less run. */
  skillsText?: string;
}): LoopPlan {
  const { loop, taskPrompt, artifact, report } = args;
  if (loop <= 1) {
    return { loop, intent: "generate", prompt: taskPrompt };
  }

  const history =
    args.history && args.history.length > 0 ? args.history : [report];
  const credits = defectCredit(history);
  const fails = credits.filter((c) => c.level === "FAIL").slice(0, 12);
  const warns = credits.filter((c) => c.level === "WARN").slice(0, 8);
  const findingLines = [...fails, ...warns].map((c) => {
    // Persistence, not mention count: one defect measured at three widths is
    // still one defect, and a finding that survived every round is the one the
    // model keeps failing to fix, which a flat list gave no way to see.
    const seen =
      c.persistent && c.seenIn > 1
        ? ` (still here after ${String(c.seenIn)} revisions — the last attempts did not fix it)`
        : c.seenIn > 1
          ? ` (seen in ${String(c.seenIn)} revisions)`
          : "";
    return `- [${c.level}] ${c.message}${seen}${c.fix ? ` — ${c.fix}` : ""}`;
  });
  const widthLines = report.measurements.map(
    (m) =>
      `- ${String(m.width)}px: ${m.summary}${m.overflowPx ? ` (horizontal overflow ${String(m.overflowPx)}px)` : ""}`,
  );

  const sections: string[] = [];

  if (args.skillsText && args.skillsText.length > 0) {
    sections.push(args.skillsText.trimEnd());
  }

  sections.push(
    [
      `This is revision ${String(loop)} of the page below. A previous version already exists and has been`,
      "measured in a real browser. Your job is to improve it against what the measurements",
      "found, and to extend it where it is thin — not to start over, and not to keep what",
      "is wrong.",
      "",
      "## What the browser found",
      ...(widthLines.length > 0
        ? widthLines
        : ["- no measurements were taken"]),
      "",
      "## Defects to fix",
      ...(findingLines.length > 0
        ? findingLines
        : ["- no rule findings were recorded"]),
      "",
      "## The rubric last time",
      report.rubricScore !== undefined
        ? [
            `The scoring rubric gave the previous version ${String(report.rubricScore)}/100.`,
            // The rubric alone is a partial-progress signal and has been wrong
            // in both directions here, so it is never presented as a verdict.
            report.reward
              ? `Its progress reward was ${report.reward.spr.toFixed(2)}` +
                (report.reward.strictEvaluated
                  ? report.reward.strict
                    ? ", and it cleared every gate — this is the standard to hold."
                    : ", and it did NOT clear every gate, so partial credit is all it has."
                  : " (the gates were not evaluated).")
              : "",
          ]
            .filter(Boolean)
            .join(" ")
        : "The previous version was not scored.",
      "",
      "## How to revise",
      "1. Fix every FAIL above. They are defects, not preferences.",
      "2. Fix the WARNs that make the page read as generic rather than designed.",
      "3. Extend it: the rubric rewards a page that carries its full content — a real",
      "   pricing story, a working demonstration, the sections a visitor needs to",
      "   decide. A page that is immaculate and empty scores worse than one that is",
      "   plain and complete.",
      "4. Change as little as possible per defect. A rewrite that fixes the findings",
      "   and loses the good parts is a worse revision.",
      "5. Keep it a single self-contained HTML file with no build step, exactly as the",
      "   brief requires.",
      "",
      "## The page as it stands",
      "```html",
      artifact.length > MAX_ARTIFACT_CHARS
        ? `${artifact.slice(0, MAX_ARTIFACT_CHARS)}\n<!-- truncated: ${String(artifact.length - MAX_ARTIFACT_CHARS)} more characters -->\n`
        : artifact,
      "```",
      "",
      "---",
      "",
      taskPrompt,
    ].join("\n"),
  );

  return { loop, intent: "reflect-and-improve", prompt: sections.join("\n\n") };
}

/**
 * Did this loop actually improve anything?
 *
 * Three signals, in the order the evidence supports.
 *
 * Clearing the gate is an improvement on its own: Terminal-RSI's central claim is
 * that partial progress must stay subordinate to verified completion, so a loop
 * that finally passes is not merely a loop with a higher number.
 *
 * Then the success-prioritised reward, which moves when the verifier moved.
 *
 * Then defects, then the rubric as a tie-break. Defects decide before the rubric
 * because the rubric measured 100 on loop 1 of the landing-page run — while that
 * page still had ten design defects — and 62 on a later page with three. A
 * single number has been wrong in both directions here.
 *
 * A comparison across two scoring versions is reported, not acted on. Terminal-RSI
 * §2.1 calls this value drift: a critic's values are calibrated for the policy
 * that produced them, so after the scorer changes, an inherited number is not
 * evidence of anything. Ours moved the same day it changed what it measured.
 */
export function loopProgress(
  previous: LoopReport | undefined,
  current: LoopReport,
): { improving: boolean; regressed: boolean; reason: string } {
  if (!previous)
    return { improving: true, regressed: false, reason: "first loop" };
  const prevFails = previous.findings.filter((f) => f.level === "FAIL").length;
  const nowFails = current.findings.filter((f) => f.level === "FAIL").length;
  const prevScore = previous.rubricScore;
  const nowScore = current.rubricScore;

  const failsDropped = nowFails < prevFails;
  const failsRose = nowFails > prevFails;
  const rubricFell =
    prevScore !== undefined && nowScore !== undefined && nowScore < prevScore;
  const rubricRose =
    prevScore !== undefined && nowScore !== undefined && nowScore > prevScore;

  const prevReward = previous.reward;
  const nowReward = current.reward;
  const sameScorer =
    previous.scorerVersion === undefined || current.scorerVersion === undefined
      ? true
      : previous.scorerVersion === current.scorerVersion;
  const uncalibrated =
    (prevScore !== undefined && nowScore !== undefined && !sameScorer) ||
    (prevReward !== undefined && nowReward !== undefined && !sameScorer);
  const drift = uncalibrated
    ? ` (uncalibrated: scoring changed ${String(previous.scorerVersion)} → ${String(current.scorerVersion)}, so these numbers are not comparable)`
    : "";

  if (
    !uncalibrated &&
    prevReward &&
    nowReward &&
    prevReward.strictEvaluated &&
    nowReward.strictEvaluated
  ) {
    const gainedStrict = !prevReward.strict && nowReward.strict;
    const lostStrict = prevReward.strict && !nowReward.strict;
    if (gainedStrict) {
      return {
        improving: true,
        regressed: false,
        reason: `cleared the gate — reward ${prevReward.spr.toFixed(2)} → ${nowReward.spr.toFixed(2)}`,
      };
    }
    if (lostStrict) {
      return {
        improving: false,
        regressed: true,
        reason: `lost the gate it had — reward ${prevReward.spr.toFixed(2)} → ${nowReward.spr.toFixed(2)}`,
      };
    }
    if (nowReward.spr > prevReward.spr) {
      return {
        improving: true,
        regressed: false,
        reason: `reward ${prevReward.spr.toFixed(2)} → ${nowReward.spr.toFixed(2)}`,
      };
    }
    if (nowReward.spr < prevReward.spr) {
      return {
        improving: false,
        regressed: true,
        reason: `reward fell ${prevReward.spr.toFixed(2)} → ${nowReward.spr.toFixed(2)}${drift}`,
      };
    }
  }

  if (failsDropped) {
    return {
      improving: true,
      regressed: false,
      reason: `FAIL findings ${String(prevFails)} → ${String(nowFails)}${drift}`,
    };
  }
  if (failsRose || (rubricFell && !uncalibrated)) {
    return {
      improving: false,
      regressed: true,
      reason: failsRose
        ? `FAIL findings rose ${String(prevFails)} → ${String(nowFails)}`
        : `rubric fell ${String(prevScore)} → ${String(nowScore)}${drift}`,
    };
  }
  if (rubricRose && !uncalibrated) {
    return {
      improving: true,
      regressed: false,
      reason: `rubric rose ${String(prevScore)} → ${String(nowScore)}`,
    };
  }
  return {
    improving: false,
    regressed: false,
    reason: uncalibrated
      ? `no comparable movement${drift}`
      : "no movement in defects or rubric",
  };
}

/**
 * A human verdict on a loop's artefact, as recorded by the review surface.
 *
 * The rubric cannot see craft: it scored a page with ten design defects at 100,
 * and a human looking at the same page called the other one better. A recorded
 * judgement is therefore a first-class loop signal, not a nicety — it is the
 * only one that measures the thing the rubric is blind to.
 */
export interface LoopJudgement {
  /** Which loop the judge was looking at. */
  loop?: number;
  /** Free-form: which arm won, and why. */
  winner?: string;
  notes?: string;
  /** Per-criterion scores, when the judge used the review surface's rubric. */
  criteria?: { criterion: string; score: number }[];
  recordedAt?: string;
}

/**
 * Has the human verdict moved against the previous one?
 *
 * Compared as a plain score (sum of criterion scores, or the ones recorded),
 * because the review surface labels its arms A and B and the loop only needs to
 * know whether the page got better in the judgement that matters. A verdict
 * naming a different artefact than the loop's own does not apply: a judge
 * looking at loop 2 has not ruled on loop 5.
 */
export function judgementProgress(
  previous: LoopJudgement | undefined,
  current: LoopJudgement | undefined,
): "improving" | "regressing" | "flat" | "unknown" {
  if (!current) return "unknown";
  const scoreOf = (j: LoopJudgement | undefined): number | undefined => {
    if (!j) return undefined;
    if (Array.isArray(j.criteria) && j.criteria.length > 0) {
      return j.criteria.reduce((sum, c) => sum + (Number(c.score) || 0), 0);
    }
    return undefined;
  };
  const now = scoreOf(current);
  const before = scoreOf(previous);
  if (now === undefined || before === undefined) {
    // No numeric rubric: fall back to whether the named winner changed.
    if (!previous || !current) return "unknown";
    if (!previous.winner || !current.winner) return "unknown";
    return previous.winner === current.winner ? "flat" : "improving";
  }
  if (now > before) return "improving";
  if (now < before) return "regressing";
  return "flat";
}
