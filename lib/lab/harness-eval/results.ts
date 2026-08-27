// SERVER-SIDE ONLY — importing results.json ships the full dataset to the client.
//
// results.json is ACCUMULATED eval history, not a derived artifact: every
// record cost real API spend. scripts/gen-harness-eval.mjs MERGES fresh
// reports into it (lib/lab/harness-eval/merge.mjs) and refuses to shrink it;
// deliberate resets require BENCH_RESET_HARNESS=1. Never regenerate it
// wholesale, and never commit a hand-emptied version — the 1.3MB of model
// summaries here represent the only copy of runs dating back to 2026-07.
import type { HarnessEvalReport, HarnessTaskResult, HarnessModelSummary } from './types.js';

import resultsData from './results.json';

export const EVAL_REPORT = resultsData as unknown as HarnessEvalReport;
export const ALL_SUMMARIES: HarnessModelSummary[] = EVAL_REPORT.models;

export function resultsForModel(modelId: string): HarnessTaskResult[] {
  const summary = ALL_SUMMARIES.find((s) => s.model.id === modelId);
  return summary?.tasks ?? [];
}

export function resultsForTask(taskId: string): { modelId: string; result: HarnessTaskResult }[] {
  const out: { modelId: string; result: HarnessTaskResult }[] = [];
  for (const summary of ALL_SUMMARIES) {
    const task = summary.tasks.find((t) => t.task.id === taskId);
    if (task) out.push({ modelId: summary.model.id, result: task });
  }
  return out;
}

export function stripPatch(r: HarnessTaskResult): HarnessTaskResult & { patchVersion: string } {
  const { patch, ...rest } = r as HarnessTaskResult & { patch: string };
  return { ...rest, patchVersion: hashStr(patch ?? '') };
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).padStart(8, '0');
}
