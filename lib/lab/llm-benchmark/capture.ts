import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Feed a loop's best pages into Gamma's capture inbox.
 *
 * This is the answer to paying for a design library: the harness already
 * generates, scores and measures more pages than any catalogue could list, so
 * the growth loop is "capture what scored well, review it, promote the good
 * parts". Two conditions gate it, and both come from measurements rather than
 * taste:
 *
 *  - the rubric has to be high (the task's own score, not ours), and
 *  - the design rules have to be quiet (few FAIL findings).
 *
 * The rubric alone is not enough — it read 100 on a page with ten design
 * defects — which is why the defect gate exists rather than being a nice extra.
 *
 * A capture that fails never fails the loop: the run's result is the artefact,
 * and the inbox is a side effect.
 */

export interface GammaCaptureOptions {
  /** Path to Gamma's capture client (scripts/capture-page.mjs). */
  scriptPath: string;
  /** Gamma's base URL. */
  apiUrl: string;
  /** Minimum rubric score to capture at all. */
  minScore?: number;
  /** Maximum design-rule FAIL findings to capture with. */
  maxFails?: number;
  /**
   * Require the delivered file to actually carry its pictures.
   *
   * The inbox is a component catalogue: what lands there gets read as an example
   * of how to do this. A page that scores well while shipping two references to
   * files that do not exist is a page that teaches broken images, and one with no
   * images at all teaches a design system that never uses a picture. Both are
   * worse than not capturing, and neither shows up in the rubric or the design
   * rules. Left unset, the check is skipped.
   */
  requireImages?: boolean;
}

export interface CaptureOutcome {
  captured: boolean;
  reason: string;
}

/** What the verifier measured about one artefact. */
export interface GateInput {
  /** The task's own rubric score, 0-100. Undefined means "not scored". */
  score?: number;
  /** Design-rule FAIL findings. */
  fails?: number;
  /** Pictures embedded in the delivered file. */
  embeddedImages?: number;
  /** Picture references that resolve to nothing. */
  unresolvedImages?: number;
}

export interface GateResult {
  /** True only when every evaluated gate passed. */
  ok: boolean;
  /** Why not, when it did not. Empty when it did. */
  reasons: string[];
  /**
   * False when the gates could not be evaluated at all.
   *
   * Distinct from `ok: false`: an unscored loop has not failed a gate, it has
   * not been judged, and scoring it as a failure would demote unknown pages to
   * wrong ones.
   */
  evaluated: boolean;
}

/**
 * The protected verifier: the one definition of "this passed".
 *
 * Terminal-RSI is strict about this — strict success requires the complete
 * verifier, not an agent declaration or a subset of passed checks — and the same
 * discipline applies here. The capture gate and the reward both used to have
 * their own thresholds inline; two definitions of success is how a page gets
 * filed as an example while the record calls it a failure. One function, both
 * callers.
 */
export function evaluateGates(
  input: GateInput,
  options: {
    minScore?: number;
    maxFails?: number;
    requireImages?: boolean;
  } = {},
): GateResult {
  const minScore = options.minScore ?? 90;
  const maxFails = options.maxFails ?? 3;
  const reasons: string[] = [];

  if (input.score === undefined)
    return { ok: false, reasons: ["loop was not scored"], evaluated: false };
  if (input.score < minScore)
    reasons.push(`rubric ${input.score} < ${minScore}`);
  if (input.fails !== undefined && input.fails > maxFails) {
    reasons.push(`${input.fails} design FAIL findings > ${maxFails}`);
  }
  if (options.requireImages) {
    if (input.embeddedImages === 0)
      reasons.push("no pictures are embedded in the file");
    if ((input.unresolvedImages ?? 0) > 0) {
      reasons.push(
        `${String(input.unresolvedImages)} picture reference(s) do not resolve`,
      );
    }
  }
  return { ok: reasons.length === 0, reasons, evaluated: true };
}

export async function captureIntoGamma(
  artifactPath: string,
  meta: {
    model: string;
    loop: number;
    score?: number;
    fails?: number;
    title: string;
    notes: string;
  },
  options: GammaCaptureOptions,
): Promise<CaptureOutcome> {
  if (!fs.existsSync(artifactPath))
    return { captured: false, reason: "no artefact at that path" };

  let embeddedImages: number | undefined;
  let unresolvedImages: number | undefined;
  if (options.requireImages) {
    const html = fs.readFileSync(artifactPath, "utf8");
    embeddedImages = (html.match(/src="data:image\//g) ?? []).length;
    unresolvedImages = (html.match(/src="(?!data:|https?:)[^"]+"/g) ?? [])
      .length;
  }

  const gates = evaluateGates(
    { score: meta.score, fails: meta.fails, embeddedImages, unresolvedImages },
    {
      minScore: options.minScore,
      maxFails: options.maxFails,
      requireImages: options.requireImages,
    },
  );
  if (!gates.ok) {
    return {
      captured: false,
      reason: gates.evaluated
        ? gates.reasons.join("; ")
        : (gates.reasons[0] ?? "not scored"),
    };
  }

  const args = [
    options.scriptPath,
    artifactPath,
    "--api",
    options.apiUrl,
    "--name",
    meta.title,
    "--tags",
    [
      "generated",
      `loop-${meta.loop}`,
      `rubric-${meta.score}`,
      `model-${meta.model.replaceAll("/", "-")}`,
    ].join(","),
    "--notes",
    `${meta.notes}\nrecorded by the harness loop: model ${meta.model}, loop ${meta.loop}, rubric ${meta.score}, design FAILs ${meta.fails ?? "unmeasured"}`,
  ];

  return new Promise((resolve) => {
    const child = spawn("node", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (chunk) => (out += String(chunk)));
    child.stderr.on("data", (chunk) => (out += String(chunk)));
    child.on("error", () =>
      resolve({ captured: false, reason: "capture client could not start" }),
    );
    child.on("close", (code) => {
      resolve(
        code === 0
          ? { captured: true, reason: "captured" }
          : {
              captured: false,
              reason: out.trim().split("\n").pop() ?? `exit ${code ?? 0}`,
            },
      );
    });
  });
}

/** Default Gamma location on this machine, if it is there. */
export function defaultGammaCaptureOptions(): GammaCaptureOptions | undefined {
  const home = process.env.HOME ?? "";
  const script = path.join(home, "projects/gamma/scripts/capture-page.mjs");
  if (!fs.existsSync(script)) return undefined;
  // On by default here: the inbox is read by people looking for examples, and an
  // example with broken or missing pictures is the one thing it must not contain.
  return {
    scriptPath: script,
    apiUrl: "http://127.0.0.1:3000",
    requireImages: true,
  };
}
