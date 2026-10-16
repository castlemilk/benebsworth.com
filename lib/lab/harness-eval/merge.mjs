// lib/lab/harness-eval/merge.mjs
//
// Merge semantics for harness-eval results.json. The file is ACCUMULATED
// eval history — every record in it cost real API spend and wall time — so
// regeneration must MERGE, never replace. The failure this guards against
// (docs/postmortem/0005-harness-eval-clobber.md): scripts/gen-harness-eval.mjs
// runs in prebuild on EVERY machine that builds the site, and a machine with
// no ~/.omega/reports used to rewrite the file to {"models": []}, silently
// discarding the committed history.
//
// Plain .mjs (not .ts) because gen-harness-eval.mjs runs under plain `node`
// in prebuild — it cannot import TypeScript. Vitest imports .mjs fine, so
// the unit tests (merge.test.ts) exercise the same module the script uses.

/**
 * Recompute a model summary's aggregate fields from its task list.
 *
 * Aggregates (passRate, totals, toolBreakdown, …) are derived data; after a
 * merge changes a model's task list they must be recomputed rather than
 * carried from either side. This is the same computation buildModelSummaries
 * in the gen script performs on fresh reports — one function, two callers,
 * so a fresh-only model and a merged model summarise identically.
 *
 * @param {import('./types.js').HarnessModel} model
 * @param {import('./types.js').HarnessTaskResult[]} tasks
 * @returns {import('./types.js').HarnessModelSummary}
 */
export function computeSummary(model, tasks) {
  const passed = tasks.filter((t) => t.passed).length;
  const failed = tasks.filter((t) => !t.passed && t.status !== 'timeout').length;
  const timeouts = tasks.filter((t) => t.status === 'timeout').length;
  const totalTokens = tasks.reduce((a, t) => a + (t.tokens ?? 0), 0);
  const totalCost = tasks.reduce((a, t) => a + (t.costUsd ?? 0), 0);
  /**
   * A numeric 0 is a MEASURED cost — a route that genuinely bills nothing —
   * not missing data. The per-task field carries that distinction: `null`
   * means the provider reported no cost and the pricing table had no entry,
   * while 0 means the estimate was computed and came to nothing.
   */
  const hasCost = tasks.some((t) => typeof t.costUsd === 'number');
  const totalTurns = tasks.reduce((a, t) => a + (t.turns ?? 0), 0);
  const hasTurns = tasks.some((t) => typeof t.turns === 'number' && t.turns > 0);

  const toolBreakdown = {};
  let totalToolCalls = 0;
  for (const task of tasks) {
    if (!task.toolCalls || typeof task.toolCalls !== 'object') continue;
    for (const [name, count] of Object.entries(task.toolCalls)) {
      if (typeof count === 'number' && count > 0) {
        totalToolCalls += count;
        toolBreakdown[name] = (toolBreakdown[name] ?? 0) + count;
      }
    }
  }
  const hasTools = totalToolCalls > 0;

  const totalDuration = tasks.reduce((a, t) => a + t.durationMs, 0);

  return {
    model,
    totalTasks: tasks.length,
    passed,
    failed,
    timeouts,
    passRate: tasks.length > 0 ? Math.round((passed / tasks.length) * 100) : 0,
    totalDurationMs: totalDuration,
    totalTokens,
    totalCostUsd: hasCost ? Number(totalCost.toFixed(4)) : null,
    totalTurns: hasTurns ? totalTurns : null,
    averageTurns: hasTurns && tasks.length > 0 ? Number((totalTurns / tasks.length).toFixed(1)) : null,
    totalToolCalls: hasTools ? totalToolCalls : null,
    toolBreakdown,
    avgDurationMs: tasks.length > 0 ? Math.round(totalDuration / tasks.length) : 0,
    tasks,
  };
}

/** Identity of a task result within a model: same suite + same task id. */
const taskKey = (t) => `${t.task.suite}|${t.task.id}`;

/**
 * Normalise a task list to one result per (suite, task).
 *
 * Task lists are assembled newest report first, so the FIRST record for a key
 * is the most recent measurement; anything after it is history. Collapsing
 * duplicates is normalisation, not loss: "same suite + same task id" is this
 * module's identity for a result, `resultsForTask` looks a result up with
 * `.find()`, and `totalTasks` is presented to readers as "tasks" — none of
 * which a re-run is. Duplicates only ever got in through
 * `BENCH_RESET_HARNESS=1` runs and through benchmark reports, where one task
 * can appear in several reports.
 *
 * @param {import('./types.js').HarnessTaskResult[]} tasks
 * @returns {import('./types.js').HarnessTaskResult[]}
 */
export function dedupeTasks(tasks) {
  const byKey = new Map();
  for (const t of tasks ?? []) {
    const key = taskKey(t);
    if (!byKey.has(key)) byKey.set(key, t);
  }
  return [...byKey.values()];
}

/**
 * Merge fresh report summaries into the accumulated baseline.
 *
 * Rules (the results.json analogue of mergeResults in
 * lib/lab/llm-benchmark/results.ts):
 *  - A model in the baseline but ABSENT from the fresh reports is KEPT
 *    (normalised, nothing dropped). Fresh reports are a delta, not a census: a
 *    machine with an empty/partial ~/.omega/reports must not be able to delete
 *    history.
 *  - For a model present on both sides, task results merge by
 *    (suite, task id): a fresh result REPLACES the same-key baseline result
 *    (a re-run is an update), novel tasks APPEND, and duplicates collapse to
 *    the newest record in hand.
 *  - Aggregates are recomputed from the merged task list.
 *  - A model only in the fresh reports is appended, normalised.
 *
 * Consequence: the output has >= the models of the baseline and >= its
 * distinct (suite, task) keys, on every input. The gen script asserts exactly
 * that (the shrink guard) — if it ever trips, the merge is broken, not the
 * data.
 *
 * @param {import('./types.js').HarnessModelSummary[]} existing
 * @param {import('./types.js').HarnessModelSummary[]} fresh
 * @returns {import('./types.js').HarnessModelSummary[]}
 */
export function mergeModelSummaries(existing, fresh) {
  const byModel = new Map(
    existing.map((m) => [m.model.id, { model: m.model, tasks: dedupeTasks(m.tasks) }]),
  );
  for (const f of fresh) {
    const prev = byModel.get(f.model.id);
    if (!prev) {
      byModel.set(f.model.id, { model: f.model, tasks: dedupeTasks(f.tasks) });
      continue;
    }
    const byTask = new Map(prev.tasks.map((t) => [taskKey(t), t]));
    for (const t of dedupeTasks(f.tasks)) byTask.set(taskKey(t), t);
    prev.tasks = [...byTask.values()];
  }
  return [...byModel.values()]
    .map(({ model, tasks }) => computeSummary(model, tasks))
    .sort((a, b) => b.passRate - a.passRate || a.totalTokens - b.totalTokens);
}

/**
 * The shrink guard the gen script runs before writing: mergeModelSummaries
 * keeps every baseline model and every distinct (suite, task) key BY
 * CONSTRUCTION, so anything missing afterwards means the merge itself is
 * broken — refuse the write rather than persist the loss. Record counts are
 * deliberately not compared: normalising duplicate records (dedupeTasks) is
 * the merge doing its job, not losing data.
 *
 * Throws with an operator-facing message (the script catches nothing; exit 1
 * is correct).
 *
 * @param {import('./types.js').HarnessModelSummary[]} existing
 * @param {import('./types.js').HarnessModelSummary[]} merged
 */
export function assertNoShrink(existing, merged) {
  const mergedByModel = new Map(
    merged.map((m) => [m.model.id, new Set((m.tasks ?? []).map(taskKey))]),
  );
  const missingModels = [];
  const missingKeys = [];
  for (const m of existing) {
    const keys = mergedByModel.get(m.model.id);
    if (!keys) {
      missingModels.push(m.model.id);
      continue;
    }
    for (const t of m.tasks ?? []) {
      const key = taskKey(t);
      if (!keys.has(key)) missingKeys.push(`${m.model.id} ${key}`);
    }
  }
  if (missingModels.length > 0 || missingKeys.length > 0) {
    const missing = [...missingModels, ...missingKeys];
    throw new Error(
      `merge would shrink results.json: ${String(missingModels.length)} model(s) and ` +
        `${String(missingKeys.length)} task key(s) were dropped ` +
        `(missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? `, +${String(missing.length - 5)} more` : ''}). ` +
        'The merge keeps models missing from fresh reports and merges task results by (suite, task), ' +
        'so a drop is a bug in the merge, not a data state. ' +
        'To deliberately discard accumulated history, re-run with BENCH_RESET_HARNESS=1.',
    );
  }
}
