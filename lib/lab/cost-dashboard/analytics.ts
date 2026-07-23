// Cost-dashboard analytics: aggregate the harness-eval results into the
// views the /lab/cost-dashboard/ page needs.
//
// The data flows in from gen-harness-eval.mjs (which reads the harness
// server's model-eval reports). We use ONLY the per-model summaries to
// avoid shipping the full patch corpus to the client.

import type { HarnessModelSummary, HarnessTaskResult } from '@/lib/lab/harness-eval/types';

export interface PerModelRow {
  modelId: string;
  displayName: string;
  provider: string;
  tasks: number;
  passed: number;
  failed: number;
  timeouts: number;
  passRate: number;
  totalCostUsd: number;
  totalTokens: number;
  totalDurationMs: number;
  /** Cost divided by tasks that passed. null if model never passed anything. */
  costPerSolvedTask: number | null;
  /** Average wall time per task, ms. */
  avgDurationMs: number;
  /** Tokens divided by tasks that passed. null if model never passed. */
  tokensPerSolvedTask: number | null;
  /** Tool-call totals. */
  totalToolCalls: number | null;
  toolBreakdown: Record<string, number>;
  /** Has structured metrics (tokens + cost). External CLIs without parsers will be false. */
  hasCostData: boolean;
}

export interface PerSuiteRow {
  suite: string;
  models: number;
  runs: number;
  passed: number;
  totalCostUsd: number;
  totalTokens: number;
  totalDurationMs: number;
}

export interface PerComplexityRow {
  complexity: string;
  runs: number;
  passed: number;
  totalCostUsd: number;
  totalTokens: number;
  avgDurationMs: number;
}

export interface ExpensiveTask {
  taskId: string;
  taskTitle: string;
  suite: string;
  modelId: string;
  modelName: string;
  costUsd: number;
  tokens: number;
  durationMs: number;
  passed: boolean;
}

export interface BudgetAlert {
  modelId: string;
  displayName: string;
  severity: 'warn' | 'alert';
  reason: string;
  value: number;
  threshold: number;
}

export interface DashboardStats {
  totalCostUsd: number;
  totalTokens: number;
  totalTasks: number;
  totalModels: number;
  totalRuns: number;
  costPerSolvedTask: number;
  modelsWithCostData: number;
  modelsWithoutCostData: number;
}

export interface DashboardData {
  stats: DashboardStats;
  perModel: PerModelRow[];
  perSuite: PerSuiteRow[];
  perComplexity: PerComplexityRow[];
  expensiveTasks: ExpensiveTask[];
  alerts: BudgetAlert[];
}

/**
 * Cost thresholds for the budget alerts. Tuned for a coding-agent workload
 * where most tasks should be well under $1. Anything above $1/task is
 * expensive; anything above $5/task is alarming.
 */
const COST_PER_TASK_WARN = 0.5;
const COST_PER_TASK_ALERT = 2.0;
const TOTAL_COST_ALERT = 5.0;

export function buildCostDashboard(summaries: HarnessModelSummary[]): DashboardData {
  // Per-model rows. Filter to summaries with at least one task.
  const active = summaries.filter((s) => s.totalTasks > 0);

  const perModel: PerModelRow[] = active
    .map((s) => {
      const hasCostData = (s.totalCostUsd ?? 0) > 0;
      const costPerSolved = s.passed > 0 && s.totalCostUsd != null ? s.totalCostUsd / s.passed : null;
      const tokensPerSolved = s.passed > 0 && s.totalTokens > 0 ? s.totalTokens / s.passed : null;
      return {
        modelId: s.model.id,
        displayName: s.model.displayName,
        provider: s.model.provider,
        tasks: s.totalTasks,
        passed: s.passed,
        failed: s.failed,
        timeouts: s.timeouts,
        passRate: s.passRate,
        totalCostUsd: s.totalCostUsd ?? 0,
        totalTokens: s.totalTokens,
        totalDurationMs: s.totalDurationMs,
        costPerSolvedTask: costPerSolved,
        avgDurationMs: s.avgDurationMs,
        tokensPerSolvedTask: tokensPerSolved,
        totalToolCalls: s.totalToolCalls ?? null,
        toolBreakdown: s.toolBreakdown ?? {},
        hasCostData,
      };
    })
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.totalTokens - a.totalTokens);

  // Per-suite rollup. We need to walk the per-task results (which carry
  // the suite + complexity labels) so we re-use the same source of truth
  // as the harness-eval page.
  const suiteMap = new Map<string, PerSuiteRow>();
  for (const s of active) {
    for (const t of s.tasks) {
      const key = t.task.suite ?? 'unknown';
      const row = suiteMap.get(key) ?? {
        suite: key,
        models: 0,
        runs: 0,
        passed: 0,
        totalCostUsd: 0,
        totalTokens: 0,
        totalDurationMs: 0,
      };
      // Track distinct models per suite.
      row.runs++;
      if (t.passed) row.passed++;
      row.totalCostUsd += t.costUsd ?? 0;
      row.totalTokens += t.tokens ?? 0;
      row.totalDurationMs += t.durationMs;
      suiteMap.set(key, row);
    }
  }
  // Count distinct models per suite.
  for (const s of active) {
    for (const t of s.tasks) {
      const key = t.task.suite ?? 'unknown';
      const row = suiteMap.get(key);
      if (row) row.models = new Set([...new Set([s.model.id])]).size;
    }
  }
  // Better: count distinct models across all tasks in the suite.
  const perSuite: PerSuiteRow[] = [];
  for (const [suite, row] of suiteMap) {
    const modelSet = new Set<string>();
    for (const s of active) {
      for (const t of s.tasks) {
        if ((t.task.suite ?? 'unknown') === suite) modelSet.add(s.model.id);
      }
    }
    row.models = modelSet.size;
    perSuite.push(row);
  }
  perSuite.sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  // Per-complexity rollup.
  const complexityMap = new Map<string, PerComplexityRow>();
  for (const s of active) {
    for (const t of s.tasks) {
      const key = t.task.complexity ?? 'unknown';
      const row = complexityMap.get(key) ?? {
        complexity: key,
        runs: 0,
        passed: 0,
        totalCostUsd: 0,
        totalTokens: 0,
        avgDurationMs: 0,
      };
      row.runs++;
      if (t.passed) row.passed++;
      row.totalCostUsd += t.costUsd ?? 0;
      row.totalTokens += t.tokens ?? 0;
      row.avgDurationMs += t.durationMs;
      complexityMap.set(key, row);
    }
  }
  const perComplexity: PerComplexityRow[] = [];
  for (const [, row] of complexityMap) {
    if (row.runs > 0) row.avgDurationMs = Math.round(row.avgDurationMs / row.runs);
    perComplexity.push(row);
  }
  perComplexity.sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  // Top 10 most expensive individual task-runs.
  const allRuns: ExpensiveTask[] = [];
  for (const s of active) {
    for (const t of s.tasks) {
      if ((t.costUsd ?? 0) <= 0) continue;
      allRuns.push({
        taskId: t.task.id,
        taskTitle: t.task.title,
        suite: t.task.suite ?? 'unknown',
        modelId: s.model.id,
        modelName: s.model.displayName,
        costUsd: t.costUsd ?? 0,
        tokens: t.tokens ?? 0,
        durationMs: t.durationMs,
        passed: t.passed,
      });
    }
  }
  const expensiveTasks = allRuns.sort((a, b) => b.costUsd - a.costUsd).slice(0, 10);

  // Top stats.
  const stats: DashboardStats = {
    totalCostUsd: perModel.reduce((s, m) => s + m.totalCostUsd, 0),
    totalTokens: perModel.reduce((s, m) => s + m.totalTokens, 0),
    totalTasks: perModel.reduce((s, m) => s + m.tasks, 0),
    totalModels: perModel.length,
    totalRuns: perModel.reduce((s, m) => s + m.tasks, 0),
    costPerSolvedTask: 0,
    modelsWithCostData: perModel.filter((m) => m.hasCostData).length,
    modelsWithoutCostData: perModel.filter((m) => !m.hasCostData).length,
  };
  const totalPassed = perModel.reduce((s, m) => s + m.passed, 0);
  stats.costPerSolvedTask = totalPassed > 0 ? stats.totalCostUsd / totalPassed : 0;

  // Budget alerts.
  const alerts: BudgetAlert[] = [];
  for (const m of perModel) {
    if (!m.hasCostData) continue;
    if (m.costPerSolvedTask !== null) {
      if (m.costPerSolvedTask > COST_PER_TASK_ALERT) {
        alerts.push({
          modelId: m.modelId,
          displayName: m.displayName,
          severity: 'alert',
          reason: `cost per solved task exceeds $${COST_PER_TASK_ALERT.toFixed(2)}`,
          value: m.costPerSolvedTask,
          threshold: COST_PER_TASK_ALERT,
        });
      } else if (m.costPerSolvedTask > COST_PER_TASK_WARN) {
        alerts.push({
          modelId: m.modelId,
          displayName: m.displayName,
          severity: 'warn',
          reason: `cost per solved task exceeds $${COST_PER_TASK_WARN.toFixed(2)}`,
          value: m.costPerSolvedTask,
          threshold: COST_PER_TASK_WARN,
        });
      }
    }
    if (m.totalCostUsd > TOTAL_COST_ALERT) {
      alerts.push({
        modelId: m.modelId,
        displayName: m.displayName,
        severity: 'alert',
        reason: `total run cost exceeds $${TOTAL_COST_ALERT.toFixed(2)}`,
        value: m.totalCostUsd,
        threshold: TOTAL_COST_ALERT,
      });
    }
  }

  return {
    stats,
    perModel,
    perSuite,
    perComplexity,
    expensiveTasks,
    alerts,
  };
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(3)}`;
  if (usd < 1) return `$${usd.toFixed(2)}`;
  if (usd < 100) return `$${usd.toFixed(1)}`;
  return `$${Math.round(usd)}`;
}

export function formatTokens(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s - m * 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m - h * 60}m`;
}
