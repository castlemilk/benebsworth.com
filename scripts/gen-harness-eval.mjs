#!/usr/bin/env node
// scripts/gen-harness-eval.mjs
// Reads harness report JSONs from ~/.omega/reports/ and generates:
// 1. lib/lab/harness-eval/results.json  — structured eval data
// 2. lib/lab/harness-eval/registry.ts   — populated with actual models/tasks
// 3. public/lab-data/harness-eval/patches/  — per-task per-model patches
// 4. public/lab-data/harness-eval/failures/ — per-task per-model failure details
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME || '/Users/' + process.env.USER;
const REPORTS_DIR = path.join(HOME, '.omega', 'reports');
const OUT_DIR = path.resolve(import.meta.dirname, '..');
const PUBLIC_DATA = path.join(OUT_DIR, 'public', 'lab-data', 'harness-eval');
const LIB_OUT = path.join(OUT_DIR, 'lib', 'lab', 'harness-eval');

function loadJsonFiles(prefix) {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json') && !f.includes('latest'))
    .sort()
    .reverse();
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf-8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Pricing map (USD per 1K tokens, prompt + completion).
 * Used to estimate cost when the provider didn't return a cost field
 * (e.g. z.ai GLM, kimi). Numbers are approximate public-list rates.
 */
const PRICING_USD_PER_1K = {
  // Internal models
  'kimi/moonshot-v1-128k': { prompt: 0.002, completion: 0.002 },
  'kimi/moonshot-v1-32k': { prompt: 0.001, completion: 0.001 },
  'kimi/moonshot-v1-8k': { prompt: 0.0003, completion: 0.0003 },
  'minimax/MiniMax-M3': { prompt: 0.0003, completion: 0.0012 },
  'deepseek/deepseek-v4-pro': { prompt: 0.00027, completion: 0.0011 },
  'qwen/qwen3.8-max-preview': { prompt: 0.00026, completion: 0.00156 },
  'glm/glm-5.2': { prompt: 0.0001, completion: 0.0003 },
  // External CLIs — no cost data from PTY; just placeholder
  'external/agy': null,
  'external/opencode': null,
  'external/claude-code': { prompt: 0.003, completion: 0.015 },
  'external/codex': null,
  'external/cursor-cli': null,
  'external/aider': null,
};

/**
 * For consensus (multi-agent) reports, sum the pricing of each constituent
 * model. The cost is the union of what the candidates spent.
 * Keyed by the consensus report's `modelId` (provider/model = consensus/<joined-models>).
 */
const CONSENSUS_COMPONENT_PRICING = {
  'consensus/agy+MiniMax-M3+deepseek-v4-pro': {
    'minimax/MiniMax-M3': { prompt: 0.0003, completion: 0.0012 },
    'deepseek/deepseek-v4-pro': { prompt: 0.00027, completion: 0.0011 },
  },
  'consensus/external:agy+minimax/MiniMax-M3+deepseek/deepseek-v4-pro': {
    'minimax/MiniMax-M3': { prompt: 0.0003, completion: 0.0012 },
    'deepseek/deepseek-v4-pro': { prompt: 0.00027, completion: 0.0011 },
  },
  // For "consensus/agx+..." (lowercased) — match the actual modelId from the report
  'consensus/external:agy+minimax/minimax-m3+deepseek/deepseek-v4-pro': {
    'minimax/MiniMax-M3': { prompt: 0.0003, completion: 0.0012 },
    'deepseek/deepseek-v4-pro': { prompt: 0.00027, completion: 0.0011 },
  },
};

function estimateCostUsd(modelId, promptTokens, completionTokens, totalTokens) {
  if (!promptTokens && !completionTokens && !totalTokens) return null;

  // Consensus reports: sum the pricing of every constituent model.
  if (modelId in CONSENSUS_COMPONENT_PRICING) {
    const components = CONSENSUS_COMPONENT_PRICING[modelId];
    let total = 0;
    if (promptTokens || completionTokens) {
      // Split the tokens evenly across the consensus members.
      const n = Object.keys(components).length;
      for (const p of Object.values(components)) {
        total += ((promptTokens ?? 0) / n / 1000) * p.prompt;
        total += ((completionTokens ?? 0) / n / 1000) * p.completion;
      }
    } else {
      // 95/5 split, evenly distributed.
      const n = Object.keys(components).length;
      for (const p of Object.values(components)) {
        total += ((totalTokens * 0.95) / n / 1000) * p.prompt;
        total += ((totalTokens * 0.05) / n / 1000) * p.completion;
      }
    }
    return Number(total.toFixed(6));
  }

  const pricing = PRICING_USD_PER_1K[modelId];
  if (!pricing) return null;
  let p, c;
  if (promptTokens || completionTokens) {
    p = (promptTokens ?? 0) / 1000 * pricing.prompt;
    c = (completionTokens ?? 0) / 1000 * pricing.completion;
  } else {
    // Fallback: assume a 95/5 prompt/completion split (typical for agentic loops
    // where most tokens are prompt/context). This is approximate but better than 0.
    p = (totalTokens * 0.95) / 1000 * pricing.prompt;
    c = (totalTokens * 0.05) / 1000 * pricing.completion;
  }
  return Number((p + c).toFixed(6));
}

function extractTaskResults(report, provider, model) {
  const modelId = `${provider || ''}/${model || ''}`;
  return (report.results || []).map(r => {
    const agentRun = r.agentRun || {};
    let toolCalls;
    if (typeof agentRun.toolCalls === 'string' && agentRun.toolCalls.length > 0) {
      try {
        toolCalls = JSON.parse(agentRun.toolCalls);
      } catch {
        toolCalls = undefined;
      }
    }
    // Prefer real cost from the provider; fall back to estimate from tokens.
    // For consensus (multi-agent) reports, the per-task agentRun is missing
    // but the evaluation.metrics carries the aggregate across candidates.
    const consensusMetrics = r.evaluation?.metrics ?? {};
    const consensusTokens = consensusMetrics.totalCandidatesTokens ?? null;
    const promptTokens = agentRun.promptTokens ?? null;
    const completionTokens = agentRun.completionTokens ?? null;
    const totalTokens = agentRun.totalTokens ?? r.usage?.totalTokens ?? consensusTokens ?? null;
    const realCost = agentRun.costUsd ?? null;
    const estimatedCost = realCost ?? estimateCostUsd(modelId, promptTokens, completionTokens, totalTokens);

    return {
      task: {
        id: r.task.id,
        name: r.task.name,
        title: r.task.title,
        description: r.task.description,
        complexity: r.task.complexity,
        suite: report.suite || 'unknown',
      },
      passed: r.evaluation?.passed ?? false,
      status: r.status || 'failed',
      durationMs: r.durationMs || 0,
      score: r.evaluation?.score,
      tokens: agentRun.totalTokens ?? r.usage?.totalTokens ?? consensusTokens,
      promptTokens,
      completionTokens,
      costUsd: estimatedCost,
      turns: agentRun.turnCount ?? null,
      toolCalls,
      failure: r.failureAnalysis ? {
        category: r.failureAnalysis.category,
        rootCause: r.failureAnalysis.rootCause,
        evidence: r.failureAnalysis.evidence || [],
      } : undefined,
      tools: r.traceSummary?.toolSummary,
      patchBytes: (r.diffs || []).reduce((a, d) => a + (d.patch?.length ?? 0), 0),
      hasPatch: (r.diffs?.length ?? 0) > 0,
      patch: r.diffs?.[0]?.patch || '',
    };
  });
}

function buildModelSummaries(modelEvalReports, benchmarkReports) {
  const modelMap = new Map();

  for (const report of modelEvalReports) {
    if (report.models && report.results) {
      for (const result of report.results) {
        const key = `${result.provider}/${result.model}`;
        if (!modelMap.has(key)) {
          modelMap.set(key, {
            model: { id: key, provider: result.provider, model: result.model, displayName: result.model },
            results: [],
          });
        }
        modelMap.get(key).results.push(...extractTaskResults(result.report, result.provider, result.model));
      }
    }
  }

  for (const report of benchmarkReports) {
    const key = report.suite === 'deep-swe' ? 'kimi/moonshot-v1-128k' : 'internal/default';
    if (!modelMap.has(key)) {
      const [provider, model] = key.split('/');
      modelMap.set(key, {
        model: { id: key, provider, model, displayName: model },
        results: [],
      });
    }
    modelMap.get(key).results.push(...extractTaskResults(report, key.split('/')[0], key.split('/').slice(1).join('/')));
  }

  const summaries = [];
  for (const [, entry] of modelMap) {
    const tasks = entry.results;
    const passed = tasks.filter(t => t.passed).length;
    const failed = tasks.filter(t => !t.passed && t.status !== 'timeout').length;
    const timeouts = tasks.filter(t => t.status === 'timeout').length;
    const totalTokens = tasks.reduce((a, t) => a + (t.tokens ?? 0), 0);
    const totalCost = tasks.reduce((a, t) => a + (t.costUsd ?? 0), 0);
    const hasCost = tasks.some(t => typeof t.costUsd === 'number' && t.costUsd > 0);
    const totalTurns = tasks.reduce((a, t) => a + (t.turns ?? 0), 0);
    const hasTurns = tasks.some(t => typeof t.turns === 'number' && t.turns > 0);

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

    summaries.push({
      model: entry.model,
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
    });
  }

  return summaries.sort((a, b) => b.passRate - a.passRate || a.totalTokens - b.totalTokens);
}

function writePatchFiles(summaries) {
  const patchDir = path.join(PUBLIC_DATA, 'patches');
  fs.mkdirSync(patchDir, { recursive: true });
  for (const summary of summaries) {
    for (const task of summary.tasks) {
      if (!task.hasPatch || !task.patch) continue;
      const taskDir = path.join(patchDir, task.task.suite, task.task.id);
      fs.mkdirSync(taskDir, { recursive: true });
      const file = path.join(taskDir, `${summary.model.id.replace(/[\/:]/g, '-')}.json`);
      fs.writeFileSync(file, JSON.stringify({ taskId: task.task.id, modelId: summary.model.id, patch: task.patch }));
    }
  }
}

function writeFailureFiles(summaries) {
  const failDir = path.join(PUBLIC_DATA, 'failures');
  fs.mkdirSync(failDir, { recursive: true });
  for (const summary of summaries) {
    for (const task of summary.tasks) {
      if (!task.failure) continue;
      const taskDir = path.join(failDir, task.task.suite, task.task.id);
      fs.mkdirSync(taskDir, { recursive: true });
      const file = path.join(taskDir, `${summary.model.id.replace(/[\/:]/g, '-')}.json`);
      fs.writeFileSync(file, JSON.stringify({ taskId: task.task.id, modelId: summary.model.id, failure: task.failure }));
    }
  }
}

function generateRegistry(summaries, allTasks) {
  const models = summaries.map(s => s.model);
  const suiteMap = new Map();
  for (const t of allTasks) {
    if (!suiteMap.has(t.suite)) suiteMap.set(t.suite, 0);
    suiteMap.set(t.suite, suiteMap.get(t.suite) + 1);
  }
  const suites = [...suiteMap.entries()].map(([slug, count]) => {
    // Try to pull the first paragraph from content/lab/harness-eval/suites/<slug>.mdx
    let description = '';
    try {
      const mdxPath = path.join(OUT_DIR, 'content', 'lab', 'harness-eval', 'suites', `${slug}.mdx`);
      if (fs.existsSync(mdxPath)) {
        const mdx = fs.readFileSync(mdxPath, 'utf-8');
        // First non-empty, non-heading paragraph
        const firstPara = mdx
          .split('\n\n')
          .map((s) => s.trim())
          .find((s) => s && !s.startsWith('#') && !s.startsWith('-') && !s.startsWith('*'));
        if (firstPara) description = firstPara.slice(0, 240);
      }
    } catch {
      // ignore
    }
    return {
      slug,
      label: slug.charAt(0).toUpperCase() + slug.slice(1) + ' Suite',
      description,
      taskCount: count,
    };
  });

  return `// AUTO-GENERATED by scripts/gen-harness-eval.mjs — do not edit manually
import type { HarnessModel, HarnessSuite, HarnessTask } from './types.js';

export const HARNESS_MODELS: HarnessModel[] = ${JSON.stringify(models, null, 2)};

export const HARNESS_SUITES: HarnessSuite[] = ${JSON.stringify(suites, null, 2)};

export const HARNESS_TASKS: HarnessTask[] = ${JSON.stringify(allTasks, null, 2)};

export function modelsForSuite(_slug: string): HarnessModel[] {
  return HARNESS_MODELS;
}

export function suiteForSlug(slug: string): HarnessSuite | undefined {
  return HARNESS_SUITES.find((s) => s.slug === slug);
}

export function tasksForSuite(slug: string): HarnessTask[] {
  return HARNESS_TASKS.filter((t) => t.suite === slug);
}
`;
}

// ── Main ──
const modelEvalReports = loadJsonFiles('model-eval-');
const benchmarkReports = loadJsonFiles('benchmark-');
console.log(`Found ${String(modelEvalReports.length)} model-eval + ${String(benchmarkReports.length)} benchmark reports`);

const summaries = buildModelSummaries(modelEvalReports, benchmarkReports);
const allTasks = [...new Map(summaries.flatMap(s => s.tasks.map(t => [t.task.id, t.task]))).values()];
console.log(`Extracted ${String(summaries.length)} model summaries, ${String(allTasks.length)} unique tasks`);

fs.mkdirSync(LIB_OUT, { recursive: true });
fs.mkdirSync(PUBLIC_DATA, { recursive: true });

// results.json
const resultsData = { timestamp: new Date().toISOString(), models: summaries };
fs.writeFileSync(path.join(LIB_OUT, 'results.json'), JSON.stringify(resultsData, null, 2));

// registry.ts
fs.writeFileSync(path.join(LIB_OUT, 'registry.ts'), generateRegistry(summaries, allTasks));

// static data files
writePatchFiles(summaries);
writeFailureFiles(summaries);

console.log('Generated harness-eval data: results.json, registry.ts, patches/, failures/');
