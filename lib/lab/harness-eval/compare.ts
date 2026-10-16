import type { HarnessModelSummary, HarnessTaskResult } from './types.js';

/**
 * Side-by-side comparison of two models on the same tasks.
 *
 * A pass rate answers "how often did it pass"; a comparison has to answer
 * "what did each one actually do, on the same task". That means per-task
 * pairing — including the tasks only one of them ran, which is the difference
 * between a 1/1 and a 1/22 and the single most misleading thing a ranked list
 * can hide.
 */

export interface ComparisonTaskRow {
  key: string;
  suite: string;
  taskId: string;
  taskName: string;
  /** Present only when this model has a recorded run for the task. */
  left: ComparisonRun | null;
  right: ComparisonRun | null;
  /** True when both ran it and the outcomes differ. */
  divergent: boolean;
}

export interface ComparisonRun {
  passed: boolean;
  status: string;
  durationMs: number | null;
  tokens: number | null;
  costUsd: number | null;
  turns: number | null;
  toolCalls: number | null;
  patchBytes: number | null;
  hasPatch: boolean;
}

export interface ComparisonTotals {
  tasks: number;
  passed: number;
  tokens: number | null;
  costUsd: number | null;
  avgDurationMs: number | null;
}

export interface ModelComparison {
  left: { id: string; totals: ComparisonTotals };
  right: { id: string; totals: ComparisonTotals };
  rows: ComparisonTaskRow[];
  /** Tasks both models ran — the only basis for a fair head-to-head. */
  sharedTasks: number;
  /** Tasks only one model ran, so a shared-task rate is not read as absolute. */
  leftOnlyTasks: number;
  rightOnlyTasks: number;
  /** Shared tasks where exactly one side solved it. */
  contestedTasks: number;
}

function toRun(task: HarnessTaskResult | undefined): ComparisonRun | null {
  if (!task) return null;
  // The per-task tool field is a breakdown by tool name; the total is the sum
  // of its values, and a run with no recorded breakdown reports no count rather
  // than a zero that would read as "called nothing".
  const breakdown = task.toolCalls;
  const toolCalls = breakdown
    ? Object.values(breakdown).reduce((a, n) => a + n, 0)
    : null;
  return {
    passed: task.passed,
    status: task.status,
    durationMs: task.durationMs ?? null,
    tokens: task.tokens ?? null,
    costUsd: task.costUsd ?? null,
    turns: task.turns ?? null,
    toolCalls,
    patchBytes: task.patchBytes ?? null,
    hasPatch: Boolean(task.hasPatch),
  };
}

function totals(s: HarnessModelSummary): ComparisonTotals {
  // A timeout is not a measured duration: the run never finished, so averaging
  // it in would report a slow model for a run that produced nothing.
  const measured = (s.tasks ?? []).filter(
    (t) => t.status !== 'timeout' && typeof t.durationMs === 'number' && t.durationMs > 0
  );
  return {
    tasks: s.tasks?.length ?? 0,
    passed: s.passed,
    tokens: s.totalTokens ?? null,
    costUsd: s.totalCostUsd ?? null,
    avgDurationMs:
      measured.length > 0
        ? Math.round(measured.reduce((a, t) => a + (t.durationMs ?? 0), 0) / measured.length)
        : null,
  };
}

/**
 * Build the comparison. `left` and `right` are full model summaries; tasks are
 * paired on `(suite, task id)` so two models cannot be credited with the same
 * run, and a task one model skipped shows as an explicit gap rather than
 * silently vanishing from the row.
 */
export function buildComparison(
  left: HarnessModelSummary | undefined,
  right: HarnessModelSummary | undefined
): ModelComparison | null {
  if (!left || !right || left.model.id === right.model.id) return null;

  const leftByTask = new Map((left.tasks ?? []).map((t) => [`${t.task.suite}|${t.task.id}`, t]));
  const rightByTask = new Map((right.tasks ?? []).map((t) => [`${t.task.suite}|${t.task.id}`, t]));
  const keys = [...new Set([...leftByTask.keys(), ...rightByTask.keys()])];

  const rows: ComparisonTaskRow[] = keys
    .map((key) => {
      const l = leftByTask.get(key);
      const r = rightByTask.get(key);
      const source = l ?? r;
      return {
        key,
        suite: source?.task.suite ?? '',
        taskId: source?.task.id ?? '',
        taskName: source?.task.title || source?.task.name || key,
        left: toRun(l),
        right: toRun(r),
        divergent: Boolean(l && r && l.passed !== r.passed),
      };
    })
    // Shared tasks first — the comparison — then the gaps, so a reader does not
    // have to hunt past a model's unique coverage to find the head-to-head.
    .sort((a, b) => {
      const aShared = a.left && a.right ? 0 : 1;
      const bShared = b.left && b.right ? 0 : 1;
      if (aShared !== bShared) return aShared - bShared;
      if (a.divergent !== b.divergent) return a.divergent ? -1 : 1;
      return a.suite.localeCompare(b.suite) || a.taskId.localeCompare(b.taskId);
    });

  const shared = rows.filter((r) => r.left && r.right);
  return {
    left: { id: left.model.id, totals: totals(left) },
    right: { id: right.model.id, totals: totals(right) },
    rows,
    sharedTasks: shared.length,
    leftOnlyTasks: rows.filter((r) => r.left && !r.right).length,
    rightOnlyTasks: rows.filter((r) => r.right && !r.left).length,
    contestedTasks: shared.filter((r) => r.divergent).length,
  };
}

/**
 * Pair candidates for a model page's "compare with" control.
 *
 * Ranked by how much a comparison would actually teach: a model that solved
 * tasks this one failed beats a model with an identical pass rate, and shared
 * task count breaks that tie, so the suggestion is never a dead end.
 */
export function compareCandidates(
  subject: HarnessModelSummary,
  all: HarnessModelSummary[],
  limit = 6
): HarnessModelSummary[] {
  const subjectTasks = new Set((subject.tasks ?? []).map((t) => `${t.task.suite}|${t.task.id}`));
  return all
    .filter((s) => s.model.id !== subject.model.id)
    .map((s) => {
      const shared = (s.tasks ?? []).filter((t) => subjectTasks.has(`${t.task.suite}|${t.task.id}`)).length;
      const subjectFailed = new Set(
        (subject.tasks ?? []).filter((t) => !t.passed).map((t) => `${t.task.suite}|${t.task.id}`)
      );
      const solvesWhatSubjectMissed = (s.tasks ?? []).filter((t) => t.passed && subjectFailed.has(`${t.task.suite}|${t.task.id}`)).length;
      return { summary: s, shared, solvesWhatSubjectMissed };
    })
    .filter((c) => c.shared > 0)
    .sort(
      (a, b) =>
        b.solvesWhatSubjectMissed - a.solvesWhatSubjectMissed ||
        b.shared - a.shared ||
        b.summary.passRate - a.summary.passRate ||
        a.summary.model.id.localeCompare(b.summary.model.id)
    )
    .slice(0, limit)
    .map((c) => c.summary);
}
