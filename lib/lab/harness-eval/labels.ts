import type { HarnessModelSummary } from './types.js';

/**
 * Human-readable names for the model list.
 *
 * The catalog stores ids (`agy+MiniMax-M3+deepseek-v4-pro`,
 * `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`), which are the right key
 * and the wrong label: a ranking table's first column has to be readable at a
 * glance, and the id form is where the old page lost its credibility. The id
 * stays in the DOM as the link target and the accessible title; this only
 * changes what is printed.
 *
 * Vendor prefixes that carry no information for a reader are dropped
 * (`openrouter/`, `external/`), the routing-provider split is turned into a
 * readable slash (`provider/model`), and the known families are title-cased.
 */
const FAMILY_WORDS: Record<string, string> = {
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  kimi: 'Kimi',
  glm: 'GLM',
  nemotron: 'Nemotron',
  minimax: 'MiniMax',
  nvidia: 'NVIDIA',
  claude: 'Claude',
  gpt: 'GPT',
  gemini: 'Gemini',
  gemma: 'Gemma',
  llama: 'Llama',
  mistral: 'Mistral',
  cohere: 'Cohere',
  agy: 'AGY',
  opencode: 'OpenCode',
  zen: 'Zen',
  flash: 'Flash',
  pro: 'Pro',
  mini: 'Mini',
  max: 'Max',
  preview: 'Preview',
  light: 'Light',
  lite: 'Lite',
  free: 'Free',
  turbo: 'Turbo',
  plus: 'Plus',
  ultra: 'Ultra',
  coder: 'Coder',
  reasoning: 'Reasoning',
  thinking: 'Thinking',
  exp: 'Exp',
  vision: 'Vision',
};

const DROPPED_PROVIDERS = new Set(['openrouter', 'external', 'internal']);

/** Title-case one id segment: `v4.1-flash-free` → `V4.1 Flash Free`. */
function titleSegment(segment: string): string {
  return segment
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => {
      const lower = word.toLowerCase();
      const known = FAMILY_WORDS[lower];
      if (known) return known;
      // Version-ish tokens keep their dots and digits: v4.1, 0731, q4.
      if (/^v?\d/.test(lower)) return word.charAt(0).toUpperCase() + word.slice(1);
      // Suffixes stay lowercase unless they start a segment.
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatModelLabel(modelId: string): string {
  const raw = modelId.trim();
  if (raw === '') return raw;

  // A routed id (`openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`) reads as
  // vendor / model once the access provider is dropped.
  const [maybeProvider, ...rest] = raw.split('/');
  const routed = rest.length > 0 && DROPPED_PROVIDERS.has(maybeProvider.toLowerCase());
  const body = routed ? rest.join('/') : raw;

  // `:free` is a pricing fact, already shown in its own column — but on the
  // free route it is the whole point, so keep it as a word.
  const [clean, variant] = body.split(/:(.+)$/);
  const segments = clean.split('/');

  // `deepseek/deepseek-v4-pro` names the same vendor twice. Keep the vendor
  // segment and strip the repeated leading word from the model, so the label
  // reads "DeepSeek V4 Pro" rather than "DeepSeek / DeepSeek V4 Pro". When the
  // vendor was absorbed, the two segments are one phrase, not a vendor and a
  // model, so they join with a space rather than the routed-id separator.
  let absorbed = false;
  const deduped = segments.map((segment, i) => {
    if (i === 0 || segments.length < 2) return segment;
    const vendor = segments[0]!.toLowerCase();
    const lower = segment.toLowerCase();
    if (lower === vendor) {
      absorbed = true;
      return null;
    }
    if (lower.startsWith(`${vendor}-`)) {
      absorbed = true;
      return segment.slice(vendor.length + 1);
    }
    return segment;
  });

  const labelled = deduped
    .filter((segment): segment is string => segment !== null)
    // A consensus id (`deepseek-v4-pro+qwen3.8-max-preview`) lists its members
    // with `+`; that is a separator to a reader, not part of a word.
    .join('/')
    .split('+')
    .map((member) => {
      const words = member
        .split('/')
        .map((segment) => titleSegment(segment))
        .join(absorbed ? ' ' : ' / ');
      return words;
    })
    .join(' + ');

  return variant ? `${labelled} ${titleSegment(variant)}` : labelled;
}

/**
 * Pass rate per suite for every model, for the coverage matrix.
 *
 * The rankings table answers "who scored best overall"; a matrix answers "who
 * was even run, and where" — the question a pass rate on one task cannot. Cells
 * carry the measured rate, so a model with a single task is visibly not the
 * same as a model with twenty.
 */
export interface SuiteCoverageCell {
  suite: string;
  passRate: number | null;
  passed: number;
  totalTasks: number;
}

export interface SuiteCoverageRow {
  model: HarnessModelSummary['model'];
  cells: SuiteCoverageCell[];
  suitesRun: number;
  tasksRun: number;
}

export function suiteCoverage(
  summaries: HarnessModelSummary[],
  suites: string[]
): SuiteCoverageRow[] {
  return summaries.map((s) => {
    const bySuite = new Map<string, { passed: number; total: number }>();
    for (const t of s.tasks ?? []) {
      const suite = t.task.suite;
      const bucket = bySuite.get(suite) ?? { passed: 0, total: 0 };
      bucket.total += 1;
      if (t.passed) bucket.passed += 1;
      bySuite.set(suite, bucket);
    }
    const cells = suites.map((suite) => {
      const bucket = bySuite.get(suite);
      if (!bucket) return { suite, passRate: null, passed: 0, totalTasks: 0 };
      return {
        suite,
        passRate: Math.round((bucket.passed / bucket.total) * 100),
        passed: bucket.passed,
        totalTasks: bucket.total,
      };
    });
    return {
      model: s.model,
      cells,
      suitesRun: cells.filter((c) => c.passRate !== null).length,
      tasksRun: cells.reduce((a, c) => a + c.totalTasks, 0),
    };
  });
}
