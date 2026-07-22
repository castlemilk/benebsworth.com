export type FailureCategory =
  | 'install_failure'
  | 'dependency_error'
  | 'patch_apply_failed'
  | 'verifier_timeout'
  | 'compile_error'
  | 'build_failure'
  | 'test_failure'
  | 'model_error'
  | 'timeout'
  | 'validation_failure'
  | 'tool_misuse'
  | 'parse_error'
  | 'plan_error'
  | 'unknown';

export interface HarnessTask {
  id: string;
  name: string;
  title: string;
  description?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  suite: string;
}

export interface HarnessModel {
  id: string;
  provider: string;
  model: string;
  displayName: string;
}

export interface HarnessSuite {
  slug: string;
  label: string;
  description: string;
  taskCount: number;
}

export interface HarnessFailure {
  category: FailureCategory;
  rootCause: string;
  evidence: string[];
}

export interface HarnessToolSummary {
  tool: string;
  total: number;
  success: number;
  failure: number;
  successRate: number;
}

export interface HarnessTaskResult {
  task: HarnessTask;
  passed: boolean;
  status: 'done' | 'failed' | 'timeout';
  durationMs: number;
  score?: number;
  tokens?: number;
  costUsd?: number | null;
  turns?: number | null;
  toolCalls?: Record<string, number>;
  failure?: HarnessFailure;
  tools?: HarnessToolSummary[];
  patchBytes: number;
  hasPatch: boolean;
  patch?: string;
}

export interface HarnessModelSummary {
  model: HarnessModel;
  totalTasks: number;
  passed: number;
  failed: number;
  timeouts: number;
  passRate: number;
  totalDurationMs: number;
  totalTokens: number;
  totalCostUsd?: number | null;
  totalTurns?: number | null;
  averageTurns?: number | null;
  totalToolCalls?: number | null;
  toolBreakdown?: Record<string, number>;
  avgDurationMs: number;
  tasks: HarnessTaskResult[];
}

export interface HarnessEvalReport {
  timestamp: string;
  models: HarnessModelSummary[];
}
