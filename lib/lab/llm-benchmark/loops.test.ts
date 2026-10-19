import { describe, it, expect } from "vitest";
import {
  buildLoopPrompt,
  defectCredit,
  externalResources,
  judgementProgress,
  loopProgress,
  type LoopRuleFinding,
  type LoopReport,
} from "./loops.js";

const BRIEF =
  "Build a single-file React + Tailwind landing page with a hero, feature grid, pricing cards.";

function report(overrides: Partial<LoopReport> = {}): LoopReport {
  return {
    measurements: [
      { width: 390, summary: "hero fills the fold", overflowPx: 3 },
    ],
    findings: [
      {
        id: "eyebrow",
        level: "FAIL",
        message: "badge above the headline",
        fix: "delete it",
      },
      {
        id: "icon-cards",
        level: "FAIL",
        message: "four identical icon cards",
        fix: "one composed section",
      },
      { id: "few-pictures", level: "WARN", message: "no imagery" },
    ],
    rubricScore: 65,
    ...overrides,
  };
}

/**
 * Loops only mean something if each one is told what the browser actually
 * found, and if the brief stays last. These tests pin both, plus the property
 * that makes a loop chain rather than a series of unrelated generations.
 */
describe("buildLoopPrompt", () => {
  it("loop 1 is the bare brief, so the first version is not already an intervention", () => {
    const plan = buildLoopPrompt({
      loop: 1,
      taskPrompt: BRIEF,
      artifact: "",
      report: report(),
    });
    expect(plan.intent).toBe("generate");
    expect(plan.prompt).toBe(BRIEF);
  });

  it("carries the previous artefact, the measurements and the defects", () => {
    const artifact = "<html><body>Nimbus</body></html>";
    const plan = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact,
      report: report(),
    });

    expect(plan.intent).toBe("reflect-and-improve");
    expect(plan.prompt).toContain(
      "390px: hero fills the fold (horizontal overflow 3px)",
    );
    expect(plan.prompt).toContain(
      "[FAIL] badge above the headline — delete it",
    );
    expect(plan.prompt).toContain("revision 2");
    expect(plan.prompt).toContain(artifact);
    // The brief stays last: it is the instruction to build the artefact.
    expect(plan.prompt.trimEnd().endsWith(BRIEF)).toBe(true);
  });

  it("orders FAILs before WARNs and caps each band", () => {
    const many: LoopReport = {
      ...report(),
      findings: [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `w${i}`,
          level: "WARN" as const,
          message: `warn ${i}`,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `f${i}`,
          level: "FAIL" as const,
          message: `fail ${i}`,
        })),
      ],
    };
    const prompt = buildLoopPrompt({
      loop: 3,
      taskPrompt: BRIEF,
      artifact: "x",
      report: many,
    }).prompt;
    const firstWarn = prompt.indexOf("[WARN] warn 0");
    const lastFail = prompt.lastIndexOf("[FAIL] fail 19");
    expect(lastFail).toBeLessThan(firstWarn);
    expect(prompt).toContain("[FAIL] fail 11");
    expect(prompt).not.toContain("fail 12");
    expect(prompt).not.toContain("warn 8");
  });

  it("asks for improvement AND extension, because fixing alone converges to thin", () => {
    const prompt = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: "x",
      report: report(),
    }).prompt;
    expect(prompt).toMatch(/Extend it/);
    expect(prompt).toMatch(/immaculate and empty|complete/);
  });

  it("truncates a huge artefact rather than blowing the context window", () => {
    const huge = "x".repeat(200_000);
    const prompt = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: huge,
      report: report(),
    }).prompt;
    expect(prompt).toContain("truncated: 140000 more characters");
    expect(prompt.length).toBeLessThan(80_000);
  });

  it("mounts the skills block when the arm has one, and stays identical when it does not", () => {
    const withSkills = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: "x",
      report: report(),
      skillsText: "Follow the design procedure below.",
    }).prompt;
    expect(withSkills.startsWith("Follow the design procedure below.")).toBe(
      true,
    );

    const without = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: "x",
      report: report(),
    }).prompt;
    expect(without).not.toContain("Follow the design procedure");
  });
});

describe("loopProgress", () => {
  it("the first loop has nothing to improve on", () => {
    expect(loopProgress(undefined, report())).toMatchObject({
      improving: true,
      regressed: false,
    });
  });

  it("a higher rubric score is progress, a lower one is a regression", () => {
    const noFindings = { ...report({ rubricScore: 65 }), findings: [] };
    const noFindings100 = { ...report({ rubricScore: 100 }), findings: [] };
    expect(loopProgress(noFindings, noFindings100).improving).toBe(true);
    const down = loopProgress(noFindings100, noFindings);
    expect(down.regressed).toBe(true);
    expect(down.reason).toContain("fell");
  });

  it("prefers fewer defects over a higher rubric when they disagree", () => {
    // The discriminating case: the rubric FELL but the design rules found far
    // fewer defects. A rubric-first rule calls that a regression and stops the
    // run; the page is in fact being repaired. This is the landing-page run in
    // miniature — the rubric can only move in steps of ten while the defect
    // count moves one at a time.
    const before = report({ rubricScore: 65 });
    before.findings = Array.from({ length: 5 }, (_, i) => ({
      id: `f${i}`,
      level: "FAIL" as const,
      message: `defect ${i}`,
    }));
    const after = report({ rubricScore: 58 });
    after.findings = [
      { id: "only", level: "FAIL" as const, message: "one left" },
    ];

    const progress = loopProgress(before, after);
    expect(progress.improving).toBe(true);
    expect(progress.regressed).toBe(false);
    expect(progress.reason).toContain("FAIL findings 5 → 1");
  });

  it("defects decide before the rubric, because the rubric saturates", () => {
    // The observed landing-page run: the rubric never moved off 100 while the
    // design rules went 10 -> 8 -> 4 -> 2. A rubric-first rule calls that "no
    // movement" and stops a run that is genuinely improving.
    const before = report({ rubricScore: 100 });
    const after = report({ rubricScore: 100 });
    after.findings = after.findings.slice(0, 1);
    const progress = loopProgress(before, after);
    expect(progress.improving).toBe(true);
    expect(progress.reason).toContain("FAIL findings");

    // And a rising rubric cannot rescue a rising defect count.
    const worse = report({ rubricScore: 100 });
    worse.findings = [
      ...worse.findings,
      { id: "extra", level: "FAIL" as const, message: "new defect" },
    ];
    expect(loopProgress(before, worse).regressed).toBe(true);
  });

  it("falls back to defect counts when a loop was not scored", () => {
    const prev = report({
      rubricScore: undefined,
      findings: [{ id: "a", level: "FAIL", message: "x" }],
    });
    const next = report({ rubricScore: undefined, findings: [] });
    expect(loopProgress(prev, next).improving).toBe(true);
  });

  it("reports no movement when nothing changed, so a run can stop burning tokens", () => {
    const verdict = loopProgress(report(), report());
    expect(verdict.improving).toBe(false);
    expect(verdict.reason).toContain("no movement");
  });
});

describe("judgementProgress", () => {
  it("reads a rising criterion score as progress", () => {
    const before = {
      loop: 1,
      criteria: [
        { criterion: "hierarchy", score: 3 },
        { criterion: "craft", score: 2 },
      ],
    };
    const after = {
      loop: 2,
      criteria: [
        { criterion: "hierarchy", score: 7 },
        { criterion: "craft", score: 6 },
      ],
    };
    expect(judgementProgress(before, after)).toBe("improving");
    expect(judgementProgress(after, before)).toBe("regressing");
    expect(judgementProgress(after, after)).toBe("flat");
  });

  it("says unknown when no verdict has been recorded", () => {
    expect(judgementProgress(undefined, undefined)).toBe("unknown");
    expect(
      judgementProgress(
        { criteria: [{ criterion: "x", score: 1 }] },
        undefined,
      ),
    ).toBe("unknown");
  });

  it("falls back to the named winner when no numeric rubric was used", () => {
    expect(
      judgementProgress({ winner: "Page A" }, { winner: "Page B" }),
    ).not.toBe("unknown");
    expect(judgementProgress({ winner: "Page A" }, { winner: "Page A" })).toBe(
      "flat",
    );
  });
});

describe("defectCredit", () => {
  const failing = (id: string): LoopRuleFinding => ({
    id,
    level: "FAIL",
    message: `${id} defect`,
    fix: "fix it",
  });

  it("counts a defect once per turn, not once per measurement", () => {
    // TB-GAE's complaint: observations carry no decisions. One rule id reported
    // at three widths is one defect, and must not outrank three real ones.
    const noisy: LoopReport = {
      measurements: [390, 768, 1440].map((width) => ({
        width,
        summary: "same page",
      })),
      findings: [failing("eyebrow"), failing("eyebrow"), failing("eyebrow")],
    };
    const credits = defectCredit([noisy]);
    expect(credits).toHaveLength(1);
    expect(credits[0]?.seenIn).toBe(1);
  });

  it("keeps full weight for a finding that survives every round", () => {
    const history: LoopReport[] = [
      { measurements: [], findings: [failing("eyebrow")] },
      { measurements: [], findings: [failing("eyebrow")] },
      { measurements: [], findings: [failing("eyebrow")] },
    ];
    const credits = defectCredit(history);
    expect(credits[0]?.persistent).toBe(true);
    expect(credits[0]?.seenIn).toBe(3);
    expect(credits[0]?.weight).toBe(1);
  });

  it("decays a finding that has gone, across turns", () => {
    const history: LoopReport[] = [
      { measurements: [], findings: [failing("eyebrow")] },
      { measurements: [], findings: [failing("eyebrow")] },
      { measurements: [], findings: [] },
    ];
    const credits = defectCredit(history);
    expect(credits[0]?.persistent).toBe(false);
    expect(credits[0]?.weight).toBeLessThan(1);
  });

  it("orders persistent findings ahead of fresh ones", () => {
    const history: LoopReport[] = [
      { measurements: [], findings: [failing("eyebrow")] },
      {
        measurements: [],
        findings: [failing("eyebrow"), failing("icon-cards")],
      },
    ];
    expect(defectCredit(history).map((c) => c.id)).toEqual([
      "eyebrow",
      "icon-cards",
    ]);
  });
});

describe("buildLoopPrompt with persistence", () => {
  it("tells the model which finding has survived its own revisions", () => {
    const stubborn = (id: string): LoopRuleFinding => ({
      id,
      level: "FAIL",
      message: `${id} defect`,
    });
    const history: LoopReport[] = [
      {
        measurements: [],
        findings: [stubborn("eyebrow"), stubborn("icon-cards")],
      },
      { measurements: [], findings: [stubborn("eyebrow")] },
    ];
    const plan = buildLoopPrompt({
      loop: 3,
      taskPrompt: BRIEF,
      artifact: "<html></html>",
      report: history[1] as LoopReport,
      history,
    });
    expect(plan.prompt).toContain("still here after 2 revisions");
    // Gone this round: kept in the record, but not presented as a live defect.
    expect(plan.prompt).toContain("icon-cards defect");
  });
});

describe("loopProgress with rewards", () => {
  const withReward = (
    over: Partial<LoopReport> & { spr: number; strict?: boolean },
  ): LoopReport => ({
    measurements: [],
    findings: [],
    rubricScore: 62,
    scorerVersion: "v1",
    reward: {
      family: "page",
      passed: 30,
      total: 65,
      strict: over.strict,
      strictEvaluated: over.strict !== undefined,
      fdr: 0.5,
      spr: over.spr,
    },
    ...stripReward(over),
  });

  function stripReward(
    over: { spr: number; strict?: boolean } & Partial<LoopReport>,
  ): Partial<LoopReport> {
    const {
      spr: _spr,
      strict: _strict,
      ...rest
    } = over as Partial<LoopReport> & { spr: number; strict?: boolean };
    return rest;
  }

  it("calls clearing the gate an improvement even when nothing else moved", () => {
    const progress = loopProgress(
      withReward({ spr: 0.9, strict: false }),
      withReward({ spr: 1.95, strict: true }),
    );
    expect(progress.improving).toBe(true);
    expect(progress.reason).toContain("cleared the gate");
  });

  it("calls losing the gate a regression even when the rubric rose", () => {
    const progress = loopProgress(
      withReward({ spr: 1.95, strict: true, rubricScore: 62 }),
      withReward({ spr: 1.6, strict: false, rubricScore: 90 }),
    );
    expect(progress.regressed).toBe(true);
    expect(progress.reason).toContain("lost the gate");
  });

  it("refuses to compare scores produced by different scoring versions", () => {
    const before = withReward({
      spr: 0.9,
      strict: false,
      scorerVersion: "old",
    });
    const after = withReward({ spr: 1.1, strict: false, scorerVersion: "new" });
    const progress = loopProgress(before, after);
    // The movement is real in the numbers and not evidence of anything, so it is
    // reported as no movement with the reason attached rather than as a gain.
    expect(progress.improving).toBe(false);
    expect(progress.reason).toContain("uncalibrated");
  });
});

describe("externalResources", () => {
  it("catches a CDN loader written inside a script, where no attribute holds the URL", () => {
    // This is the case that mattered: one loop produced a page that pulled React
    // and Babel from a CDN at runtime, so a src/href scan called it self-contained
    // and the inspector measured its error box.
    const html = `<html><body><div id="root"></div>
      <script>
        const CDN = 'https://unpkg.com/react@18/umd/react.production.min.js';
        const FALLBACK = "https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js";
        import(CDN);
      </script></body></html>`;
    expect(externalResources(html)).toHaveLength(2);
  });

  it("finds ordinary markup references", () => {
    const html =
      '<img src="https://example.com/a.png"><link href="https://fonts.googleapis.com/css2?family=X">';
    expect(externalResources(html)).toEqual([
      "https://example.com/a.png",
      "https://fonts.googleapis.com/css2?family=X",
    ]);
  });

  it("calls a genuinely self-contained page self-contained", () => {
    const html =
      '<html><body><img src="data:image/png;base64,AAA"><style>a{color:red}</style></body></html>';
    expect(externalResources(html)).toEqual([]);
  });
});

describe("a page that cannot render on its own", () => {
  const html =
    '<html><body><script src="https://unpkg.com/react@18/umd/react.production.min.js"></script></body></html>';

  it("discards the findings that were measured against the fallback", () => {
    // The inspector reported six defects for a page that had never rendered:
    // no headline, no pictures, no buttons, nothing moved. Reflecting on those
    // took the rubric from 97 to 30.
    const report: LoopReport = {
      measurements: [],
      consoleErrors: ["TypeError: Cannot read properties of undefined (reading 'createRoot')"],
      externalResources: externalResources(html),
      findings: [
        {
          id: "external-runtime",
          level: "FAIL",
          message: "the page loads 1 resource(s) from the network at runtime",
        },
      ],
    };
    const plan = buildLoopPrompt({
      loop: 2,
      taskPrompt: BRIEF,
      artifact: html,
      report,
    });
    expect(plan.prompt).toContain("threw");
    expect(plan.prompt).toContain("unpkg.com/react");
    // The suspended judgements are named as suspended, not listed as defects.
    expect(plan.prompt).not.toContain("No headline found");
    expect(plan.prompt).toContain("TypeError");
  });
});
