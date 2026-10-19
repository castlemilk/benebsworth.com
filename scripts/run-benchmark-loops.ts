#!/usr/bin/env tsx
// Iterate one artefact: generate, measure in a real browser, reflect, improve.
//
//   npx tsx scripts/run-benchmark-loops.mjs \
//     --model <model-id> --task <task-id> [--loops 5] [--skills-dir <path> --skills a,b] \
//     [--inspect <inspect.mjs>] [--timeout-ms 1200000] [--out <dir>]
//
// One generation is one sample of what a model does with a brief. Loops ask what
// is wrong with what it built: each round after the first is handed the previous
// artefact plus measurements taken in a real browser (screenshots at three
// widths) and the design rules that failed, and asked to improve AND extend it.
// Every loop is scored with the task's own rubric, so the progression is a
// series of comparable numbers rather than a series of impressions.
//
// The loop stops early when a round neither improves the rubric nor removes a
// defect: past that point the model is re-writing the same page, and each round
// costs a full generation.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
} from "../lib/lab/llm-benchmark/registry.js";
import { scoreWithBreakdown } from "../lib/lab/llm-benchmark/scorers/behavioral.js";
import { buildSkillBlock } from "../lib/lab/llm-benchmark/skills-context.js";
import {
  compactImage,
  imageBrief,
  imagePrompt,
  INLINE_IMAGE_BUDGET,
  inlineLocalImages,
  planImageSubjects,
  queryFromArtifact,
  sourceImage,
} from "../lib/lab/llm-benchmark/images.js";
import {
  fetchGammaAssets,
  gammaBrief,
  gammaStylesheet,
  type GammaAssets,
} from "../lib/lab/llm-benchmark/gamma.js";
import {
  buildLoopPrompt,
  loopProgress,
  SCORER_VERSION,
  type LoopReport,
} from "../lib/lab/llm-benchmark/loops.js";
import {
  calibrateFamilies,
  failedRewardMass,
  rewardOutcome,
  successPrioritised,
  type RewardCalibration,
  type VerifierOutcome,
} from "../lib/lab/llm-benchmark/reward.js";
import {
  askOpencode,
  runOpencodeArtifact,
  type OpencodeLoopOptions,
} from "../lib/lab/llm-benchmark/runners/opencode-loops.js";
import {
  captureIntoGamma,
  DEFAULT_CAPTURE_MAX_BYTES,
  defaultGammaCaptureOptions,
  evaluateGates,
} from "../lib/lab/llm-benchmark/capture.js";

interface Args {
  model: string;
  task: string;
  loops: number;
  skillsDir?: string;
  skills: string[];
  inspect?: string;
  timeoutMs: number;
  out: string;
  stopWhenStuck: boolean;
  /** Seconds to allow the model's one-line answer before giving up on the run. */
  preflightSeconds: number;
  /** Hard ceiling on a delivered page, so it can be filed. Gamma's is 500KB. */
  captureMaxBytes: number;
  /** Source pictures when the rules report none on the page. */
  images: boolean;
  assetsScript?: string;
  /** Gamma MCP endpoint for components, backgrounds and effects. */
  gammaUrl?: string;
  /** BrandBrain MCP endpoint. */
  brandbrainUrl?: string;
  brandbrainToken?: string;
  /** flow-orchestrator server path: generated pictures instead of searched ones. */
  flowServerPath?: string;
  /** Ceiling for one generated picture, in USD micros. */
  flowBudgetMicros: number;
  /** ComfyUI server URL (Comfy Desktop's backend) — the UI-backed route. */
  comfyUrl?: string;
  /** Capture qualifying pages into Gamma's design inbox. */
  captureGamma: boolean;
  /** Local MLX generation: the fallback when no ComfyUI server answers. */
  mlxCommand?: string;
  mlxSteps?: number;
  mlxWidth?: number;
  mlxHeight?: number;
  mlxModel?: string;
  /** Let a generated page wear a real company's mark. Off by default. */
  allowRealBrandMarks: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const model = get("--model") ?? process.env.RUN_MODELS?.split(",")[0];
  const task = get("--task") ?? process.env.RUN_TASKS?.split(",")[0];
  if (!model || !task) {
    console.error(
      "usage: --model <id> --task <id> [--loops n] [--skills-dir p --skills a,b]",
    );
    process.exit(2);
  }
  return {
    model,
    task,
    loops: Number(get("--loops") ?? process.env.RUN_LOOPS ?? 5),
    skillsDir: get("--skills-dir") ?? process.env.RUN_SKILLS_DIR,
    skills: (get("--skills") ?? process.env.RUN_SKILLS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    inspect: get("--inspect"),
    timeoutMs: Number(get("--timeout-ms") ?? 1_200_000),
    out:
      get("--out") ??
      `loops/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`,
    stopWhenStuck: !argv.includes("--no-stop-when-stuck"),
    // A stalled endpoint otherwise costs the full generation timeout per loop,
    // with a retry on top: up to fifty minutes to learn the model is not there.
    preflightSeconds: Number(get("--preflight-seconds") ?? 90),
    captureMaxBytes: Number(
      get("--capture-max-bytes") ?? DEFAULT_CAPTURE_MAX_BYTES,
    ),
    images: argv.includes("--images"),
    assetsScript: get("--assets-script"),
    gammaUrl: get("--gamma"),
    brandbrainUrl: get("--brandbrain"),
    brandbrainToken: get("--brandbrain-token"),
    flowServerPath: get("--flow-mcp"),
    flowBudgetMicros: Number(get("--flow-budget-micros") ?? 20_000),
    comfyUrl: get("--comfy"),
    captureGamma: argv.includes("--capture-gamma"),
    mlxCommand: get("--mlx"),
    mlxSteps: Number(get("--mlx-steps") ?? 8),
    mlxWidth: Number(get("--mlx-width") ?? 1024),
    mlxHeight: Number(get("--mlx-height") ?? 576),
    mlxModel: get("--mlx-model"),
    allowRealBrandMarks: argv.includes("--allow-real-brand-marks"),
  };
}

/** Read the OpenRouter key for the image-model rung, if the user has one. */
function openrouterKey(): string | undefined {
  const raw = fs.existsSync(
    `${process.env.HOME}/.local/share/opencode/auth.json`,
  )
    ? fs.readFileSync(
        `${process.env.HOME}/.local/share/opencode/auth.json`,
        "utf8",
      )
    : "{}";
  try {
    const auth = JSON.parse(raw) as {
      openrouter?: { key?: string; access?: string };
    };
    return auth.openrouter?.key ?? auth.openrouter?.access;
  } catch {
    return undefined;
  }
}

/**
 * Measure the artefact in a real browser: screenshots at three widths plus the
 * design rules' own findings.
 *
 * The inspector is an external script on purpose — the design skill already
 * ships one, and a second CDP implementation in this repo would drift from it.
 * When it is not supplied the loop still runs, and the reflection says plainly
 * that no measurements were taken, which is honest rather than silent.
 */
async function inspectArtifact(
  artifactPath: string,
  loopDir: string,
  inspectScript: string | undefined,
): Promise<{ report: LoopReport; screenshots: string[] }> {
  const screenshotsDir = path.join(loopDir, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const report: LoopReport = { measurements: [], findings: [] };

  if (!inspectScript || !fs.existsSync(inspectScript)) {
    return { report, screenshots: [] };
  }

  const raw = await new Promise<string>((resolve) => {
    const child = spawn("node", [inspectScript, artifactPath], {
      cwd: loopDir,
    });
    let out = "";
    child.stdout.on("data", (c) => (out += String(c)));
    child.stderr.on("data", (c) => (out += String(c)));
    child.on("close", () => resolve(out));
  });

  // The inspector writes screenshots next to its own report; adopt them.
  const shots = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter((f) => f.endsWith(".jpg"))
    : [];
  for (const shot of shots) {
    const from = path.join(loopDir, ".taste-skill", "inspect", shot);
    if (fs.existsSync(from))
      fs.copyFileSync(from, path.join(screenshotsDir, shot));
  }

  const reportFile = path.join(
    loopDir,
    ".taste-skill",
    "inspect",
    "report.json",
  );
  if (!fs.existsSync(reportFile)) {
    // A measurement step that produced nothing must be visible: the loop would
    // otherwise reflect on a page it never actually looked at, and say so in
    // the prompt as if the page were clean.
    console.warn(
      `[loops] inspector produced no report for loop artefact — see ${path.basename(loopDir)}/`,
    );
    return { report, screenshots: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(reportFile, "utf8")) as {
      findings?: {
        level?: string;
        id?: string;
        message?: string;
        fix?: string;
      }[];
    };
    report.findings = (parsed.findings ?? [])
      .filter((f) => f.level === "FAIL" || f.level === "WARN")
      .map((f) => ({
        id: f.id ?? "finding",
        level: f.level === "FAIL" ? "FAIL" : "WARN",
        message: f.message ?? "",
        fix: f.fix,
      }));
  } catch {
    // A malformed report is not fatal: the loop proceeds with no findings.
  }

  const headline = /hero headline\s+"([^"]+)"/.exec(raw)?.[1];
  const words = /(\d+)\s+words/.exec(raw)?.[1];
  const screens = /([\d.]+)\s+screens/.exec(raw)?.[1];
  const verdict = /RESULT:\s*(\d+ FAIL)/.exec(raw)?.[1];
  report.headline = headline;
  report.words = words ? Number(words) : undefined;
  report.screens = screens ? Number(screens) : undefined;
  report.verdict = verdict;
  for (const width of [1440, 768, 390]) {
    report.measurements.push({
      width,
      summary: headline ? `headline "${headline}"` : "rendered",
    });
  }
  report.measurements = report.measurements.map((m) => ({
    ...m,
    screenshot: shots.find((s) => s.includes(String(m.width))) ?? shots[0],
  }));

  return { report, screenshots: shots };
}

const args = parseArgs(process.argv.slice(2));
const model = BENCHMARK_MODELS.find((m) => m.id === args.model);
// opencode resolves provider/model ids. `--model` names a registry entry, and
// passing its id to the CLI fails to resolve — silently, as an empty reply.
const apiModelId = model?.apiModelId;
if (!apiModelId) {
  console.error(
    `[loops] no API model id for "${args.model}" — the registry entry needs one to run.`,
  );
  process.exit(2);
}
const task = BENCHMARK_TASKS.find((t) => t.id === args.task);
if (!model || !task) {
  console.error(
    `unknown model or task. models=${BENCHMARK_MODELS.length} tasks=${BENCHMARK_TASKS.length}`,
  );
  process.exit(2);
}
// A model with no CLI id cannot be routed: the loops driver only knows how to
// spawn opencode, so say that plainly instead of spawning with `-m undefined`.
if (!model.apiModelId) {
  console.error(
    `model ${args.model} has no apiModelId — the loop driver cannot route it.`,
  );
  process.exit(2);
}

const skills = args.skillsDir
  ? buildSkillBlock(args.skillsDir, args.skills)
  : undefined;
if (args.skills.length > 0 && (!skills || skills.chars === 0)) {
  console.error(
    `no skill resolved from ${args.skills.join(",")} — refusing to run an un-injected arm.`,
  );
  process.exit(2);
}

const outDir = path.resolve(args.out);
fs.mkdirSync(outDir, { recursive: true });
const manifest: {
  model: string;
  task: string;
  skills: string[];
  loops: LoopReport[];
} = {
  model: args.model,
  task: args.task,
  skills: skills?.names ?? [],
  loops: [],
};

// Fetched once for the whole run: the catalogue is stable between rounds, and
// a per-loop fetch would make two loops non-comparable for no reason.
let gammaAssets: GammaAssets | undefined;
if (args.gammaUrl) {
  gammaAssets = await fetchGammaAssets("landing page marketing", {
    url: args.gammaUrl,
  });
  console.log(
    `[loops] gamma: ${gammaAssets.reachable ? `reachable (system ${gammaAssets.system ?? "unknown"}, ${String(gammaAssets.componentSlugs.length)} components)` : "not reachable"}`,
  );
  for (const note of gammaAssets.notes) console.warn(`[loops] gamma: ${note}`);
}
const gammaCss = gammaAssets ? gammaStylesheet(gammaAssets) : "";

console.log(
  `[loops] model=${args.model} task=${args.task} loops=${String(args.loops)}`,
);
console.log(
  `[loops] skills: ${skills && skills.names.length > 0 ? skills.names.join(", ") : "none (baseline)"}`,
);
console.log(`[loops] out: ${path.relative(process.cwd(), outDir)}/`);

let previousReport: LoopReport | undefined;
let artifact = "";
let artifactPath = "";
/** Set when the previous loop's rules reported no pictures on the page. */
let imageBriefText = "";
let imageFeedback = "";
/** What each supplied image actually shows, by file name. */
const imageDescriptions: Record<string, string> = {};
const imageCredits: string[] = [];

// One copy of the generated pictures for the whole run, so every loop has the
// files its brief promises. They were previously written into the loop that was
// being measured, which meant the NEXT loop's artefact referenced
// `images/hero.jpg` next to an empty images/ folder — the brief was true for
// one round and a lie for the next.
const runImagesDir = path.join(outDir, "images");

// Every verifier outcome this run has produced, so family divisors and the
// failure-share diagnostic are computed from what actually happened rather than
// from a constant.
const allOutcomes: VerifierOutcome[] = [];
let calibration: RewardCalibration = { divisor: {}, divisorPrime: {} };

/**
 * Re-encode the loop's images so a self-contained page fits the capture limit.
 *
 * Returns the files it touched, so the run can say what it did rather than the
 * page silently arriving smaller than the pictures that made it.
 */
async function fitImagesToBudget(
  dir: string,
  maxBytes: number,
): Promise<string[]> {
  const touched: string[] = [];
  const walk = async (current: string, depth: number): Promise<void> => {
    if (depth > 2 || !fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "screenshots") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (/\.(png|jpe?g|webp|avif)$/i.test(entry.name)) {
        try {
          const fit = await compactImage(full, maxBytes);
          if (fit.compacted) touched.push(path.basename(fit.file));
        } catch {
          // A file sharp cannot read is left alone; the inliner will report it
          // as unresolved rather than this passing quietly.
        }
      }
    }
  };
  await walk(dir, 0);
  return touched;
}

// Is the model actually there? A generation that is slow and a generation that
// is stalled look identical from inside the run, and the difference between them
// is the whole timeout — with a retry, fifty minutes per loop to find out. One
// question settles it in seconds, and the answer is also the run's record of
// how healthy the endpoint was before any work started.
{
  const startedAt = Date.now();
  const probe = await askOpencode({
    model: apiModelId,
    prompt: "Reply with one word: ready",
    timeoutMs: args.preflightSeconds * 1000,
  });
  const waited = Math.round((Date.now() - startedAt) / 1000);
  if (!probe.ok) {
    console.error(
      `[loops] preflight: ${model.apiModelId} did not answer within ${String(args.preflightSeconds)}s ` +
        `(${probe.error ?? "no output"}). Nothing has been generated; fix the endpoint or pick another model.`,
    );
    process.exit(1);
  }
  console.log(
    `[loops] preflight: ${model.apiModelId} answered in ${String(waited)}s — ${probe.text.trim().slice(0, 40)}`,
  );
}

for (let loop = 1; loop <= args.loops; loop += 1) {
  const loopDir = path.join(outDir, `loop-${String(loop)}`);
  fs.mkdirSync(loopDir, { recursive: true });

  // Each loop's own copy, so a reviewer opening loop-3 sees the pictures that
  // page was built with rather than having to know about the run-level folder.
  if (fs.existsSync(runImagesDir)) {
    const localImages = path.join(loopDir, "images");
    fs.mkdirSync(localImages, { recursive: true });
    for (const file of fs.readdirSync(runImagesDir)) {
      const from = path.join(runImagesDir, file);
      if (fs.statSync(from).isFile())
        fs.copyFileSync(from, path.join(localImages, file));
    }
  }

  const plan = buildLoopPrompt({
    loop,
    // The picture brief joins the task prompt so it sits with the brief rather
    // than with the reflection's findings: it is an instruction about the page,
    // not a defect to fix.
    taskPrompt: [
      task.prompt,
      imageBriefText,
      imageFeedback,
      gammaAssets ? gammaBrief(gammaAssets) : "",
    ]
      .filter((part) => part.length > 0)
      .join("\n\n"),
    artifact,
    report: previousReport ?? { measurements: [], findings: [] },
    history: manifest.loops,
    skillsText: skills?.text,
  });
  fs.writeFileSync(path.join(loopDir, "prompt.md"), plan.prompt, "utf8");

  const options: OpencodeLoopOptions = {
    model: model.apiModelId,
    prompt: plan.prompt,
    artifactPath: path.join(loopDir, "artifact.html"),
    timeoutMs: args.timeoutMs,
  };
  const started = Date.now();
  // One generation takes 10-16 minutes routinely, and the cap is not much above
  // that. A run that dies because one attempt landed slow throws away every loop
  // before it, so a timeout gets one more go — and only a timeout, because a
  // model that answered with a real failure would just burn the same wait twice.
  let generation = await runOpencodeArtifact(options);
  if (!generation.ok && /timed out|timeout/i.test(generation.error ?? "")) {
    console.warn(`[loops] loop ${String(loop)}: timed out, retrying once`);
    const retried = await runOpencodeArtifact(options);
    generation = {
      ...retried,
      tokensOut: generation.tokensOut + retried.tokensOut,
      runtimeMs: generation.runtimeMs + retried.runtimeMs,
      // Both attempts failed if the second did; say so rather than blaming the
      // retry for the first one's timeout.
      error: retried.ok ? undefined : retried.error,
    };
    if (generation.ok)
      console.log(`[loops] loop ${String(loop)}: retry produced the page`);
  }
  const report: LoopReport = { measurements: [], findings: [] };

  if (!generation.ok) {
    report.error = generation.error;
    report.runtimeMs = Date.now() - started;
    manifest.loops.push(report);
    fs.writeFileSync(
      path.join(loopDir, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.error(`[loops] loop ${String(loop)}: FAILED — ${generation.error}`);
    // Nothing to reflect on yet if the first loop died. After that the last good
    // page is still in hand, and one lost round is no reason to throw away the
    // rest — but the failed report must not become the previous report, or the
    // next prompt inherits a failure as if it were a finding about the page.
    if (loop === 1) break;
    continue;
  }

  artifact = generation.artifact;
  artifactPath = options.artifactPath;
  report.runtimeMs = generation.runtimeMs;
  report.tokensOut = generation.tokensOut;
  report.costUsd = 0;

  // The Gamma stylesheet is injected rather than referenced: the delivered file
  // must stand alone, and tokens that live in a separate file are tokens the
  // page will not have.
  if (gammaCss.length > 0) {
    artifact = artifact.includes("/* Gamma design tokens")
      ? artifact
      : artifact.replace(
          /<\/head>/i,
          `<style>\n${gammaCss}\n</style>\n</head>`,
        );
    fs.writeFileSync(artifactPath, artifact, "utf8");
    console.log(
      `[loops] loop ${String(loop)}: inlined ${String(gammaCss.length)} chars of Gamma CSS`,
    );
  }

  // Pictures must be EMBEDDED: the task ships one self-contained file, so a
  // referenced path is a broken image in the delivered artefact. Inline first,
  // then measure the artefact that will actually be delivered.
  if (args.images) {
    // Fit the page under the inbox's limit before embedding anything.
    //
    // A single-file page with three photographs in it is over half a megabyte,
    // and the first page to clear every quality gate was rejected for exactly
    // that. Per-image budget alone does not solve it: 900KB x 3 is 2.7MB. What
    // matters is the whole document, so the cap is divided across the pictures
    // the page actually references, and the files are re-encoded to fit.
    const captureLimit = args.captureMaxBytes;
    const referenceCount = Math.max(
      1,
      [...artifact.matchAll(/src=["'](?!data:|https?:)[^"']+["']/g)].length,
    );
    const baseBytes = Buffer.byteLength(artifact);
    const room = Math.max(0, captureLimit - baseBytes);
    const perImageBudget = Math.max(
      20_000,
      Math.min(INLINE_IMAGE_BUDGET, Math.floor(room / referenceCount)),
    );
    if (perImageBudget < INLINE_IMAGE_BUDGET) {
      const shrunken = await fitImagesToBudget(loopDir, perImageBudget);
      if (shrunken.length > 0) {
        console.log(
          `[loops] loop ${String(loop)}: ${String(shrunken.length)} image(s) re-encoded to fit the ${String(Math.round(captureLimit / 1000))}KB capture limit (${String(Math.round(perImageBudget / 1000))}KB each)`,
        );
      }
    }
    const inlined = inlineLocalImages(artifact, loopDir, {
      descriptions: imageDescriptions,
      maxBytes: perImageBudget,
    });
    if (
      inlined.inlined.length > 0 ||
      inlined.unresolved.length > 0 ||
      inlined.substituted.length > 0
    ) {
      artifact = inlined.html;
      fs.writeFileSync(artifactPath, artifact, "utf8");
      console.log(
        `[loops] loop ${String(loop)}: inlined ${String(inlined.inlined.length)} image(s)` +
          (inlined.substituted.length > 0
            ? `, ${String(inlined.substituted.length)} substituted`
            : "") +
          (inlined.unresolved.length > 0
            ? `, ${String(inlined.unresolved.length)} unresolved`
            : ""),
      );
    }

    // The loop is the only place that can fix this, and it cannot fix what it
    // was never told. The harness quietly repaired the references above; the
    // next round is told what it actually got, so the model stops inventing
    // names and starts using the ones it was given.
    const invented = [...inlined.substituted, ...inlined.unresolved];
    imageFeedback = invented.length
      ? [
          "## Your last page referenced pictures that do not exist",
          `${String(invented.length)} reference(s) named a file that was never supplied:`,
          ...invented.slice(0, 6).map((entry) => `- ${entry}`),
          "",
          "The harness put a real photograph in their place and corrected the alt text,",
          "so the page no longer breaks — but it is no longer the picture you designed.",
          "This round, use only the file paths listed above, spelled exactly as written.",
        ].join("\n")
      : "";
  }

  const measured = await inspectArtifact(artifactPath, loopDir, args.inspect);
  report.findings = measured.report.findings;
  report.headline = measured.report.headline;
  report.words = measured.report.words;
  report.screens = measured.report.screens;
  report.verdict = measured.report.verdict;
  report.measurements = measured.report.measurements;

  const scored = await scoreWithBreakdown(artifact, task);
  report.rubricScore = scored.score;
  report.scorerVersion = SCORER_VERSION;

  // What the verifier said, priced. The rubric is a progress signal that has been
  // wrong in both directions on this task, so it is never the only number in the
  // record: the checks that passed are counted, and strict success is recorded
  // separately from partial progress so neither can stand in for the other.
  const passedChecks = (scored.checks ?? []).reduce(
    (sum, c) => sum + c.points,
    0,
  );
  const totalChecks = (scored.checks ?? []).reduce(
    (sum, c) => sum + c.maxPoints,
    0,
  );
  const gates = evaluateGates(
    {
      score: report.rubricScore,
      fails: report.findings.filter((f) => f.level === "FAIL").length,
      embeddedImages: (artifact.match(/src="data:image\//g) ?? []).length,
      unresolvedImages: (artifact.match(/src="(?!data:|https?:)[^"]+"/g) ?? [])
        .length,
    },
    { requireImages: args.images },
  );
  const outcome: VerifierOutcome = {
    passed: passedChecks,
    total: totalChecks,
    // Strict success is the gate, evaluated once and used by the reward and the
    // capture decision alike.
    strict: gates.evaluated ? gates.ok : undefined,
    family: task.category ?? task.id,
  };
  // Divisors come from what this run has seen, so the first loop is priced
  // against its own check total and later ones against the family's 90th
  // percentile rather than a constant guessed in advance.
  if (allOutcomes.length >= 2) calibration = calibrateFamilies(allOutcomes);
  const priced = rewardOutcome(outcome, calibration);
  report.reward = priced;
  allOutcomes.push(outcome);
  const failureShare = failedRewardMass(allOutcomes, (o) =>
    successPrioritised(o, calibration),
  );
  // The per-loop reward is always logged; the share is the paper's audit metric
  // and means little on one page, so it waits for enough outcomes behind it.
  console.log(
    `[loops] loop ${String(loop)}: reward ${priced.spr.toFixed(2)} ` +
      `(dense ${priced.fdr.toFixed(2)}, strict ${
        priced.strictEvaluated ? String(priced.strict) : "not evaluated"
      })` +
      (failureShare !== undefined && allOutcomes.length >= 3
        ? ` · failure share of reward mass ${(failureShare * 100).toFixed(0)}%`
        : ""),
  );
  fs.writeFileSync(
    path.join(loopDir, "report.json"),
    JSON.stringify(report, null, 2),
  );

  const progress = loopProgress(previousReport, report);
  manifest.loops.push(report);
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  // Feed Gamma's inbox when this page is worth promoting: a high rubric AND few
  // design defects. The rubric alone is not enough — it read 100 on a page with
  // ten defects — so the second gate is what keeps the catalogue clean.
  if (args.captureGamma) {
    const gamma = defaultGammaCaptureOptions();
    const fails = report.findings.filter((f) => f.level === "FAIL").length;
    const outcome = gamma
      ? await captureIntoGamma(
          artifactPath,
          {
            model: args.model,
            loop,
            score: report.rubricScore,
            fails,
            title: `${task.title} — ${args.model} (loop ${loop})`,
            notes: `Generated by the harness improvement loop, ${String(args.skills.length)} design skill(s) mounted.`,
          },
          gamma,
        )
      : { captured: false, reason: "gamma not present on this machine" };
    console.log(
      outcome.captured
        ? `[loops] loop ${String(loop)}: captured into gamma's inbox`
        : `[loops] loop ${String(loop)}: not captured (${outcome.reason})`,
    );
  }

  if (imageCredits.length > 0) {
    report.imageSources = [...new Set(imageCredits)];
    fs.writeFileSync(
      path.join(loopDir, "report.json"),
      JSON.stringify(report, null, 2),
    );
  }

  console.log(
    `[loops] loop ${String(loop)} (${plan.intent}): rubric=${String(report.rubricScore)} ` +
      `fails=${String(report.findings.filter((f) => f.level === "FAIL").length)} ` +
      `tokens=${String(report.tokensOut ?? 0)} ${progress.reason}`,
  );

  // When the rules say the page carries no pictures, source some for the NEXT
  // round: the reflection is the only place a model can be told what it had to
  // work with, and a rule finding on its own ("0 pictures") is not a brief.
  if (args.images && report.findings.some((f) => f.id === "few-pictures")) {
    // Into `images/`, because that is the path the brief hands the model. The
    // brief used to say `images/` while the files landed in the loop root, so
    // the only path the model was ever given was a lie, and it wrote its own.
    const imageDir = runImagesDir;
    let plannerFailure: string | undefined;

    // The model knows what it built; keyword extraction does not. Asking it what
    // to photograph costs one short call and is the difference between a
    // photograph of this page and a photograph of a suspension bridge.
    const subjects = await planImageSubjects(
      artifact,
      async (prompt) => {
        const asked = await askOpencode({
          // The API id, not `--model`'s registry id: opencode cannot resolve
          // "glm-5.3-coding-plan", and the planner has been silently answering
          // "no image subjects" for that reason since it was written.
          model: apiModelId,
          prompt,
          timeoutMs: Math.min(args.timeoutMs, 240_000),
        });
        return asked.text;
      },
      (reason) => {
        plannerFailure = reason;
      },
    );
    if (subjects) {
      console.log(
        `[loops] loop ${loop}: image subjects: ${subjects.hero} / ${subjects.detail}`,
      );
      if (subjects.palette)
        console.log(`[loops] loop ${loop}: image palette: ${subjects.palette}`);
    } else {
      console.warn(
        `[loops] loop ${loop}: no image subjects from the model (${plannerFailure ?? "unknown reason"}); ` +
          "falling back to page keywords",
      );
    }

    const fallback = queryFromArtifact(artifact);
    const wanted = [
      { fileName: "hero.jpg", role: "hero" as const, subject: subjects?.hero },
      {
        fileName: "detail.jpg",
        role: "detail" as const,
        subject: subjects?.detail,
      },
    ];
    const sourced: {
      fileName: string;
      credit?: string;
      description?: string;
    }[] = [];
    const loopImages: NonNullable<LoopReport["images"]> = [];
    for (const request of wanted) {
      const subject =
        request.subject ??
        `${fallback} ${request.role === "hero" ? "wide establishing view" : "close-up detail"}`;
      const startedAt = Date.now();
      const result = await sourceImage(
        {
          query: imagePrompt(request.role, subject, subjects?.palette),
          fileName: request.fileName,
        },
        {
          into: imageDir,
          assetsScript: args.assetsScript,
          openrouterKey: openrouterKey(),
          imageModel: "google/gemini-3.1-flash-lite-image",
          comfyUrl: args.comfyUrl,
          mlxCommand: args.mlxCommand,
          mlxSteps: args.mlxSteps,
          mlxWidth: args.mlxWidth,
          mlxHeight: args.mlxHeight,
          mlxCount: 3,
          mlxModel: args.mlxModel,
          flowServerPath: args.flowServerPath,
          flowMaxSpendMicros: args.flowBudgetMicros,
          brandbrainUrl: args.brandbrainUrl,
          brandbrainToken: args.brandbrainToken,
          allowRealBrandMarks: args.allowRealBrandMarks,
          artifactHtml: artifact,
        },
      );
      if (result.image) {
        const name = path.basename(result.image.path);
        imageDescriptions[name] = subject;
        sourced.push({
          fileName: name,
          description: subject,
          credit: result.image.credit,
        });
        imageCredits.push(`${name}: ${result.image.source}`);
        loopImages.push({
          file: name,
          source: result.image.source,
          subject,
          bytes: result.image.bytes,
          ms: Date.now() - startedAt,
        });
        console.log(
          `[loops] loop ${String(loop)}: sourced ${path.basename(result.image.path)} from ${result.image.source}`,
        );
      } else {
        console.warn(
          `[loops] loop ${String(loop)}: no image for "${subject}" (tried ${result.attempted.join(", ")}${
            result.reason ? `, ${result.reason}` : ""
          })`,
        );
      }
    }
    imageBriefText = imageBrief(sourced);

    // The manifest and the loop's own report were written before this ran, so
    // the provenance set here landed in neither. A run record that cannot say
    // where its pictures came from is a run record that cannot be audited.
    if (loopImages.length > 0) {
      report.images = loopImages;
      report.imageSources = [...new Set(imageCredits)];
      fs.writeFileSync(
        path.join(loopDir, "report.json"),
        JSON.stringify(report, null, 2),
      );
      fs.writeFileSync(
        path.join(outDir, "manifest.json"),
        JSON.stringify(manifest, null, 2),
      );
    }
  }

  if (loop > 1 && progress.improving === false && args.stopWhenStuck) {
    console.log(`[loops] stopping: ${progress.reason}`);
    break;
  }
  // Only a loop that produced a page can be the basis for the next one.
  if (!report.error) previousReport = report;
}

const scores = manifest.loops
  .map((l) => l.rubricScore)
  .filter((s): s is number => s !== undefined);
console.log(`[loops] done. rubric across loops: ${scores.join(" → ")}`);

// An index of every run under the review surface, so the page can offer them
// all instead of one hardcoded directory that goes stale the moment a new run
// starts. Written from the manifests on disk rather than from this run's memory,
// because the point is to describe runs that are not this one.
{
  const runsDir = path.dirname(outDir);
  const indexPath = path.join(runsDir, "index.json");
  const existing = fs.existsSync(indexPath)
    ? (JSON.parse(fs.readFileSync(indexPath, "utf8")) as { runs?: unknown[] })
    : { runs: [] };
  const runs = (existing.runs ?? []).filter(
    (entry) => (entry as { dir?: string }).dir !== path.basename(outDir),
  );
  const finished = fs.readFileSync(path.join(outDir, "manifest.json"), "utf8");
  const parsed = JSON.parse(finished) as {
    model?: string;
    task?: string;
    skills?: string[];
    loops?: LoopReport[];
  };
  runs.unshift({
    dir: path.basename(outDir),
    model: parsed.model ?? args.model,
    task: parsed.task ?? args.task,
    skills: parsed.skills ?? args.skills,
    startedAt: fs.statSync(outDir).birthtime.toISOString(),
    loops: (parsed.loops ?? []).map((l, i) => ({
      loop: i + 1,
      rubricScore: l.rubricScore ?? null,
      fails: (l.findings ?? []).filter((f) => f.level === "FAIL").length,
      tokensOut: l.tokensOut ?? null,
      runtimeMs: l.runtimeMs ?? null,
      images: l.images ?? [],
      error: l.error ?? null,
    })),
  });
  fs.writeFileSync(indexPath, JSON.stringify({ runs }, null, 2));
  console.log(
    `[loops] indexed ${String(runs.length)} run(s) at ${path.relative(process.cwd(), indexPath)}`,
  );
}

process.exit(0);
