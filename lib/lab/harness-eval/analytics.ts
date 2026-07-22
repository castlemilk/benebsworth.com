import type { HarnessModelSummary, FailureCategory } from './types.js';

export interface ModelRanking {
  model: HarnessModelSummary['model'];
  passRate: number;
  totalTasks: number;
  totalTokens: number;
  totalCostUsd: number | null;
  averageTurns: number | null;
  totalToolCalls: number | null;
  toolBreakdown: Record<string, number>;
  avgDurationMs: number;
}

export interface FailureBreakdown {
  category: FailureCategory;
  count: number;
  examples: string[];
}

export function rankModels(summaries: HarnessModelSummary[]): ModelRanking[] {
  return summaries
    .map((s) => ({
      model: s.model,
      passRate: s.passRate,
      totalTasks: s.totalTasks,
      totalTokens: s.totalTokens,
      totalCostUsd: s.totalCostUsd ?? null,
      averageTurns: s.averageTurns ?? null,
      totalToolCalls: s.totalToolCalls ?? null,
      toolBreakdown: s.toolBreakdown ?? {},
      avgDurationMs: s.avgDurationMs,
    }))
    .sort((a, b) => b.passRate - a.passRate || a.totalTokens - b.totalTokens);
}

export function aggregateFailures(summaries: HarnessModelSummary[]): FailureBreakdown[] {
  const map = new Map<FailureCategory, { count: number; examples: string[] }>();
  for (const s of summaries) {
    for (const t of s.tasks) {
      if (!t.failure) continue;
      const existing = map.get(t.failure.category) ?? { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(`${t.task.name}: ${t.failure.rootCause}`);
      map.set(t.failure.category, existing);
    }
  }
  return [...map.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function overallStats(summaries: HarnessModelSummary[]) {
  const totalTasks = summaries.reduce((a, s) => a + s.totalTasks, 0);
  const totalPassed = summaries.reduce((a, s) => a + s.passed, 0);
  const totalTokens = summaries.reduce((a, s) => a + s.totalTokens, 0);
  const totalCost = summaries.reduce((a, s) => a + (s.totalCostUsd ?? 0), 0);
  const modelsWithCost = summaries.filter(s => typeof s.totalCostUsd === 'number' && s.totalCostUsd > 0);
  return {
    models: summaries.length,
    totalTasks,
    totalPassed,
    overallPassRate: totalTasks > 0 ? Math.round((totalPassed / totalTasks) * 100) : 0,
    totalTokens,
    totalCostUsd: modelsWithCost.length > 0 ? Number(totalCost.toFixed(2)) : null,
  };
}
