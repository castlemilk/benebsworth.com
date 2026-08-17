import {
  failureSignature,
  formatBenchRef,
  relatedRuns,
  resolveBenchRef,
  type BenchBoard,
} from './bench-ref'
import { modelCompletion } from './analytics'
import { getChecksForTask } from './scorers/checks'
import { renderTranscript } from './transcript'
import { parseRunLog } from './runlog-format'
import { isSafePathSegment, type TraceIndexEntry, type TraceRef } from './traces'
import { isFallbackCheck } from './types'
import type { BenchmarkModel, BenchmarkResult, BenchmarkTask, IterationCheckResult } from './types'

/**
 * The benchmark board, as a READ-ONLY MCP server — the pure half.
 *
 * An agent session (opencode, the OMEGA harness, Claude Code) should be able to
 * answer "what did deepseek score on the platformer and which check tripped?"
 * without opening a 5 MB results.json into its context. `bench://` (#32) gave
 * that question a reference syntax; this module is the read transport for it.
 *
 * Everything here is PURE: tool definitions, JSON-RPC routing and the handlers,
 * over a `BenchMcpDeps` the caller supplies. `scripts/bench-mcp.mjs` is the
 * only thing that touches stdio, and `mcp-fs.ts` is the only thing that touches
 * the filesystem — so the whole surface is unit-testable without spawning a
 * process, which is what `mcp.test.ts` does.
 *
 * NO TOOL MUTATES ANYTHING. There is no write path in this file, the server
 * opens no file for writing, and every handler is a projection of data that was
 * already committed. That is a property of the design, not a policy: the
 * benchmark's evidence chain (run logs are append-only, records are produced by
 * sweeps) would be worthless if an agent could edit it over a socket.
 *
 * TRANSPORT. MCP stdio: newline-delimited JSON-RPC 2.0, one message per line,
 * UTF-8, NO framing headers (that is LSP, and the difference is a common
 * mis-implementation). Implemented protocol version: **2024-11-05**, the
 * version this server is written against; a client that asks for a later one
 * from `SUPPORTED_PROTOCOL_VERSIONS` gets that version echoed, because the
 * surface used here (tools only, `content: [{type:'text'}]`, `isError`) is
 * unchanged across them. Anything else falls back to `MCP_PROTOCOL_VERSION`.
 * JSON-RPC BATCHES are refused (`-32600`): they are absent from the stdio
 * transport at 2024-11-05 and were removed outright in 2025-06-18.
 *
 * ERROR SHAPES, two of them, per the spec's own split:
 *  - PROTOCOL errors (unknown method, unknown tool, missing/ill-typed
 *    arguments) → a JSON-RPC `error` object.
 *  - TOOL errors (unknown model id, no record, no trace, an unresolvable ref)
 *    → a normal result with `isError: true` whose text is
 *    `{"error":{"code":…,"message":…}}`. The model is meant to read those and
 *    correct itself, so they must not look like the transport broke.
 */

/** The protocol version this server is written against. */
export const MCP_PROTOCOL_VERSION = '2024-11-05'

/**
 * Versions whose tool surface is identical for our purposes, so a client
 * asking for one gets it echoed rather than being told to downgrade.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
] as const

export const SERVER_INFO = { name: 'bench', version: '1.0.0' } as const

/** Ceiling on an artifact returned by `bench_get_result` (opt-in already). */
export const MAX_ARTIFACT_BYTES = 32 * 1024

/** Ceiling on a transcript returned by `bench_get_trace`. */
export const MAX_TRANSCRIPT_BYTES = 128 * 1024

// ---------------------------------------------------------------------------
// dependencies
// ---------------------------------------------------------------------------

/** An opened run log, whatever tree it came from. */
export interface TraceHandle extends TraceRef {
  /** Where the bytes were found — a local sweep tree, or the published copy. */
  origin: 'local-sweep' | 'published'
  /** The raw JSONL. */
  text: string
  /** Resolve a spill ref, when the store came along with the log. */
  readSpill?: (spillRef: string) => string
}

export interface BenchMcpDeps {
  models: BenchmarkModel[]
  tasks: BenchmarkTask[]
  results: BenchmarkResult[]
  /** Published trace index, when one is available (adds trace candidates). */
  traceIndex?: TraceIndexEntry[]
  /** Open a run log. Absent/undefined return = there is no trace to serve. */
  openTrace?: (ref: TraceRef) => TraceHandle | undefined
  /** Override the check resolver (tests); defaults to the real registry. */
  checksForTask?: (task: BenchmarkTask) => unknown[]
}

// ---------------------------------------------------------------------------
// JSON-RPC + MCP shapes (only what this server speaks)
// ---------------------------------------------------------------------------

export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; default?: unknown }>
    required?: string[]
    additionalProperties: false
  }
}

export interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export type JsonRpcId = string | number | null

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string }
}

export type ToolCallOutcome =
  | { ok: true; result: CallToolResult }
  | { ok: false; code: number; message: string }

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function fail(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/** A successful tool result: one text block of pretty JSON. */
function json(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] }
}

/** A TOOL-level (not protocol-level) failure the model is meant to read. */
function toolError(code: string, message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }, null, 2) }],
    isError: true,
  }
}

// ---------------------------------------------------------------------------
// tool definitions
// ---------------------------------------------------------------------------

const MODEL_ARG = {
  type: 'string',
  description: "Model id exactly as `bench_list_models` reports it, e.g. 'deepseek-v4-flash-free'.",
} as const

const TASK_ARG = {
  type: 'string',
  description: "Task id exactly as `bench_list_tasks` reports it, e.g. 'mini-platformer'.",
} as const

const TOOLS: McpToolDefinition[] = [
  {
    name: 'bench_list_models',
    description:
      'Every model on the benchmark board with its per-model completion stats (how many tasks it finished, mean score, mean runtime, total spend, cost per point). Start here to get valid model ids. Seeded sample records are excluded from the stats.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'bench_list_tasks',
    description:
      'Every task on the board: id, category, title, which scorer grades it, and the plugin that contributed it (null for built-ins). Start here to get valid task ids.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'bench_get_result',
    description:
      "One (model, task) record: score, status, per-iteration scores, a summary of which behavioural checks failed and how often, the prompt-bundle stamp, the run-log pointer, and any quota/budget stamps. The model's generated artifact is EXCLUDED by default — pass include_artifact to get up to 32 KB of it.",
    inputSchema: {
      type: 'object',
      properties: {
        model: MODEL_ARG,
        task: TASK_ARG,
        include_artifact: {
          type: 'boolean',
          description:
            'Include the generated artifact (HTML/text the model produced), truncated to 32 KB with a note. Default false — artifacts are large and usually not what the question needs.',
          default: false,
        },
      },
      required: ['model', 'task'],
      additionalProperties: false,
    },
  },
  {
    name: 'bench_get_trace',
    description:
      'The run-log transcript for a (model, task) record — the prompt hash, every attempt and retry, per-iteration check verdicts, and the aggregate. Reads the local sweep tree when present, otherwise the published trace. Returns a no-trace error for records whose log was never published or predates run logging.',
    inputSchema: {
      type: 'object',
      properties: {
        model: MODEL_ARG,
        task: TASK_ARG,
        run: {
          type: 'string',
          description:
            "Pin a specific sweep run id (e.g. '2026-08-17T06-34-06'). Omit for the run the current record came from.",
        },
      },
      required: ['model', 'task'],
      additionalProperties: false,
    },
  },
  {
    name: 'bench_related_runs',
    description:
      "Other runs that failed at least one of the same behavioural checks as this record, ranked (same task, then same model, then everything else) and returned as `bench://` references. Use it to answer 'did anything else fail the same way?'. Empty when the record failed no named check.",
    inputSchema: {
      type: 'object',
      properties: { model: MODEL_ARG, task: TASK_ARG },
      required: ['model', 'task'],
      additionalProperties: false,
    },
  },
  {
    name: 'bench_resolve_ref',
    description:
      "Resolve a `bench://<modelId>/<taskId>[/<iterationIndex>][?run=<runId>]` reference against the board: the model, the task, the record's headline numbers and, when an iteration was named, that iteration's score and check verdicts. Unparseable or dangling refs come back as a typed error, never a crash.",
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: "A bench:// URI, e.g. 'bench://deepseek-v4-flash-free/mini-platformer/0'.",
        },
      },
      required: ['uri'],
      additionalProperties: false,
    },
  },
  {
    name: 'bench_checks_used',
    description:
      "The checks a task is graded by, from TWO independent sources, reported separately because for some tasks they disagree. `browserCheckCount` is how many browser CheckFns the registry resolves for the task — 0 for a task scored by a non-browser scorer, e.g. the EXECUTABLE scorer, whose checks are node-side probes that are not registered there. `recordedChecks` (with `totalPoints`) are the names and point budgets observed in recorded results, which is the only place a check's budget exists at rest. `scorer` says which evaluator produced them. A count of 0 beside a full recorded list is therefore correct, not a bug; a task that has never been run reports its count with an empty recorded list.",
    inputSchema: {
      type: 'object',
      properties: { task: TASK_ARG },
      required: ['task'],
      additionalProperties: false,
    },
  },
]

export function toolDefinitions(): McpToolDefinition[] {
  return TOOLS
}

// ---------------------------------------------------------------------------
// argument helpers (protocol-level validation)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

class InvalidArgs extends Error {}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidArgs(`'${key}' is required and must be a non-empty string`)
  }
  return value
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidArgs(`'${key}', when present, must be a non-empty string`)
  }
  return value
}

function optionalBoolean(args: Record<string, unknown>, key: string): boolean {
  const value = args[key]
  if (value === undefined || value === null) return false
  if (typeof value !== 'boolean') throw new InvalidArgs(`'${key}', when present, must be a boolean`)
  return value
}

// ---------------------------------------------------------------------------
// shared lookups
// ---------------------------------------------------------------------------

type Lookup =
  | { ok: true; model: BenchmarkModel; task: BenchmarkTask; result?: BenchmarkResult }
  | { ok: false; error: CallToolResult }

function lookup(deps: BenchMcpDeps, modelId: string, taskId: string): Lookup {
  const model = deps.models.find((m) => m.id === modelId)
  if (!model) {
    return {
      ok: false,
      error: toolError('unknown-model', `no model '${modelId}' — call bench_list_models for valid ids`),
    }
  }
  const task = deps.tasks.find((t) => t.id === taskId)
  if (!task) {
    return {
      ok: false,
      error: toolError('unknown-task', `no task '${taskId}' — call bench_list_tasks for valid ids`),
    }
  }
  const result = deps.results.find((r) => r.modelId === modelId && r.taskId === taskId)
  return { ok: true, model, task, result }
}

/** Truncate to a byte ceiling without splitting a UTF-8 character. */
function clampBytes(text: string, maxBytes: number): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text) <= maxBytes) return { text, truncated: false }
  let cut = Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8')
  while (Buffer.byteLength(cut) > maxBytes) cut = cut.slice(0, -1)
  return { text: cut, truncated: true }
}

/**
 * Which checks this record failed, and how persistently.
 *
 * "At least one iteration" is the same rule `failureSignature` uses, but the
 * count is kept: 1-of-5 (flaky) and 5-of-5 (broken) are different findings and
 * a summary that collapsed them would mislead the reader it exists to inform.
 *
 * Fallback rows are excluded, for the same reason and by the same predicate:
 * `code-fallback` is the HARNESS reporting that it could not judge, and an
 * agent reading this summary would otherwise report "the model failed the
 * code-fallback check" — a defect that does not exist.
 */
interface FailedCheckSummary {
  name: string
  failedIterations: number
  iterations: number
  maxPoints: number
  detail?: string
}

function failedChecks(result: BenchmarkResult): FailedCheckSummary[] {
  const iterations = result.iterationCheckResults ?? []
  const byName = new Map<string, FailedCheckSummary>()
  for (const iteration of iterations) {
    for (const check of iteration) {
      if (!check.name || isFallbackCheck(check)) continue
      const row =
        byName.get(check.name) ??
        ({ name: check.name, failedIterations: 0, iterations: 0, maxPoints: check.maxPoints } as FailedCheckSummary)
      row.iterations += 1
      if (!check.passed) {
        row.failedIterations += 1
        if (!row.detail && check.detail) row.detail = check.detail
      }
      byName.set(check.name, row)
    }
  }
  return [...byName.values()].filter((row) => row.failedIterations > 0)
}

// ---------------------------------------------------------------------------
// handlers
// ---------------------------------------------------------------------------

function listModels(deps: BenchMcpDeps): CallToolResult {
  return json({
    tasksTotal: deps.tasks.length,
    models: deps.models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      completion: modelCompletion(
        deps.results.filter((r) => r.modelId === model.id),
        deps.tasks.length,
      ),
    })),
  })
}

function listTasks(deps: BenchMcpDeps): CallToolResult {
  return json({
    tasks: deps.tasks.map((task) => ({
      id: task.id,
      category: task.category,
      title: task.title,
      // `?? null` and not `?? undefined`: an absent key would vanish from the
      // JSON, and "this task declares no scorer" is a fact worth transmitting.
      scorer: task.scorer ?? null,
      pluginId: task.pluginId ?? null,
    })),
  })
}

function getResult(deps: BenchMcpDeps, args: Record<string, unknown>): CallToolResult {
  const modelId = requireString(args, 'model')
  const taskId = requireString(args, 'task')
  const includeArtifact = optionalBoolean(args, 'include_artifact')

  const found = lookup(deps, modelId, taskId)
  if (!found.ok) return found.error
  const { result } = found
  if (!result) {
    return toolError('no-result', `no recorded run of '${taskId}' by '${modelId}'`)
  }

  const artifact = result.output ?? ''
  const payload: Record<string, unknown> = {
    ref: formatBenchRef({
      modelId,
      taskId,
      ...(result.runLogRef ? { runId: result.runLogRef.runId } : {}),
    }),
    modelId,
    taskId,
    score: result.score,
    status: result.status,
    failureReason: result.failureReason ?? null,
    iterations: result.iterations,
    iterationsSucceeded: result.iterationsSucceeded ?? null,
    iterationScores: result.iterationScores ?? null,
    failedChecks: failedChecks(result),
    runtimeMs: result.runtimeMs,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costUsd: result.costUsd,
    usage: result.usage ?? null,
    telemetry: result.telemetry ?? null,
    promptBundle: result.promptBundle ?? null,
    runLogRef: result.runLogRef ?? null,
    quotaNextResetAt: result.quotaNextResetAt ?? null,
    budgetExceeded: result.budgetExceeded ?? null,
    source: result.source ?? 'live',
    createdAt: result.createdAt,
    artifactBytes: Buffer.byteLength(artifact),
  }

  if (includeArtifact && artifact !== '') {
    const { text, truncated } = clampBytes(artifact, MAX_ARTIFACT_BYTES)
    payload.artifact = text
    payload.artifactTruncated = truncated
    if (truncated) {
      payload.artifactNote = `artifact truncated to ${MAX_ARTIFACT_BYTES} bytes of ${Buffer.byteLength(artifact)}; the full bytes are published under public/lab-data/outputs/`
    }
  }

  return json(payload)
}

function getTrace(deps: BenchMcpDeps, args: Record<string, unknown>): CallToolResult {
  const modelId = requireString(args, 'model')
  const taskId = requireString(args, 'task')
  const runId = optionalString(args, 'run')

  const found = lookup(deps, modelId, taskId)
  if (!found.ok) return found.error

  // Candidates, in preference order: the run the record itself names, then any
  // published trace for the same pair (a rerun's log can outlive the record it
  // produced). `openTrace` decides local-sweep vs published per candidate.
  const candidates: TraceRef[] = []
  const push = (ref: TraceRef | undefined | null): void => {
    if (!ref || !isSafePathSegment(ref.runId) || !isSafePathSegment(ref.file)) return
    if (runId && ref.runId !== runId) return
    if (candidates.some((c) => c.runId === ref.runId && c.file === ref.file)) return
    candidates.push({ runId: ref.runId, file: ref.file })
  }
  push(found.result?.runLogRef)
  for (const entry of deps.traceIndex ?? []) {
    if (entry.modelId === modelId && entry.taskId === taskId) push(entry)
  }

  for (const candidate of candidates) {
    const handle = deps.openTrace?.(candidate)
    if (!handle) continue
    let parsed
    try {
      parsed = parseRunLog(handle.text, `${handle.runId}/${handle.file}`)
    } catch (err) {
      return toolError('bad-trace', `run log ${handle.runId}/${handle.file} is unreadable: ${(err as Error).message}`)
    }
    const transcript = renderTranscript(parsed, { file: handle.file, readSpill: handle.readSpill })
    const clamped = clampBytes(transcript, MAX_TRANSCRIPT_BYTES)
    return json({
      modelId,
      taskId,
      runId: handle.runId,
      file: handle.file,
      origin: handle.origin,
      eventCount: parsed.events.length,
      transcript: clamped.text,
      ...(clamped.truncated
        ? { transcriptTruncated: true, transcriptNote: `transcript truncated to ${MAX_TRANSCRIPT_BYTES} bytes` }
        : {}),
    })
  }

  return toolError(
    'no-trace',
    runId
      ? `no run log for '${modelId}'/'${taskId}' in run '${runId}' (locally or published)`
      : `no run log available for '${modelId}'/'${taskId}' — the record may predate run logging, or its trace was never published`,
  )
}

function related(deps: BenchMcpDeps, args: Record<string, unknown>): CallToolResult {
  const modelId = requireString(args, 'model')
  const taskId = requireString(args, 'task')

  const found = lookup(deps, modelId, taskId)
  if (!found.ok) return found.error
  if (!found.result) return toolError('no-result', `no recorded run of '${taskId}' by '${modelId}'`)

  return json({
    modelId,
    taskId,
    signature: failureSignature(found.result),
    related: relatedRuns(found.result, deps.results).map((row) => ({
      ref: formatBenchRef(row.ref),
      modelId: row.ref.modelId,
      taskId: row.ref.taskId,
      sharedChecks: row.sharedChecks,
      tier: row.tier,
    })),
  })
}

function resolveRef(deps: BenchMcpDeps, args: Record<string, unknown>): CallToolResult {
  // Deliberately NOT `requireString`: `''` is a ref the parser has a typed
  // verdict for ('empty'), and answering a garbage ref with a tool error the
  // model can read beats a protocol error that looks like a broken transport.
  // A MISSING or non-string `uri` is still a protocol failure.
  const uri = args.uri
  if (typeof uri !== 'string') throw new InvalidArgs("'uri' is required and must be a string")
  const board: BenchBoard = { models: deps.models, tasks: deps.tasks, results: deps.results }
  const resolved = resolveBenchRef(uri, board)
  if (!resolved.ok) return toolError(resolved.code, resolved.message)

  const { ref, model, task, result } = resolved
  return json({
    ok: true,
    uri: formatBenchRef(ref),
    modelId: model.id,
    modelName: model.name,
    taskId: task.id,
    taskTitle: task.title,
    iterationIndex: ref.iterationIndex ?? null,
    runId: ref.runId ?? result.runLogRef?.runId ?? null,
    score: result.score,
    status: result.status,
    iterationScore: resolved.iterationScore ?? null,
    iterationChecks: resolved.iterationChecks ?? null,
  })
}

function checksUsed(deps: BenchMcpDeps, args: Record<string, unknown>): CallToolResult {
  const taskId = requireString(args, 'task')
  const task = deps.tasks.find((t) => t.id === taskId)
  if (!task) {
    return toolError('unknown-task', `no task '${taskId}' — call bench_list_tasks for valid ids`)
  }

  // DEVIATION from the backlog sketch, which said "names + point budgets from
  // getChecksForTask": a `CheckFn` is an opaque async function until it runs in
  // a browser, so a check's NAME and `maxPoints` only exist in the results it
  // produced. `getChecksForTask` therefore supplies the COUNT (and proves the
  // task's declared checks all resolve), and the budgets are read off recorded
  // `iterationCheckResults` — observed facts, in first-seen order. A task that
  // has never been run reports its count with an empty budget list rather than
  // inventing one.
  //
  // THE TWO SOURCES ARE REPORTED SEPARATELY, and the field names say which is
  // which. `getChecksForTask` only knows about BROWSER checks, so an
  // executable-scored task (crypto-hash-race, equation-solver) resolves ZERO —
  // its checks are node-side probes in `scorers/executable.ts`, never
  // registered in CHECKS_BY_TASK. A bare `checkCount: 0` printed beside five
  // recorded named checks read as a contradiction; naming the source turns it
  // into a fact ("no browser checks; these five came from the executable
  // scorer"), which is what an agent needs to reason about the number.
  let browserCheckCount: number
  try {
    browserCheckCount = (deps.checksForTask ?? getChecksForTask)(task).length
  } catch (err) {
    return toolError('unresolvable-checks', (err as Error).message)
  }

  // Includes the scorer's synthetic `no-runtime-errors` entry (maxPoints 0,
  // appended only when the page threw) — it is a real line in the record's
  // check list, it costs nothing in the total, and hiding it would make a
  // trace's checks disagree with this tool's.
  const budgets = new Map<string, number>()
  for (const record of deps.results) {
    if (record.taskId !== taskId) continue
    for (const iteration of record.iterationCheckResults ?? []) {
      for (const check of iteration as IterationCheckResult[]) {
        if (check.name && !budgets.has(check.name)) budgets.set(check.name, check.maxPoints)
      }
    }
  }
  const recordedChecks = [...budgets.entries()].map(([name, maxPoints]) => ({ name, maxPoints }))

  return json({
    taskId,
    scorer: task.scorer ?? null,
    declaredChecks: task.checks ?? null,
    /** Browser CheckFns the registry resolves. 0 for a non-browser scorer. */
    browserCheckCount,
    browserChecksFrom: 'getChecksForTask (browser check registry)',
    /** Names + budgets OBSERVED in recorded results, whatever produced them. */
    recordedChecks,
    totalPoints: recordedChecks.reduce((sum, c) => sum + c.maxPoints, 0),
    recordedChecksFrom: 'recorded iteration check results',
  })
}

// ---------------------------------------------------------------------------
// tool dispatch
// ---------------------------------------------------------------------------

type Handler = (deps: BenchMcpDeps, args: Record<string, unknown>) => CallToolResult

const HANDLERS: Record<string, Handler> = {
  bench_list_models: (deps) => listModels(deps),
  bench_list_tasks: (deps) => listTasks(deps),
  bench_get_result: getResult,
  bench_get_trace: getTrace,
  bench_related_runs: related,
  bench_resolve_ref: resolveRef,
  bench_checks_used: checksUsed,
}

/**
 * Run one tool. `ok: false` is a PROTOCOL failure (no such tool, bad
 * arguments); a tool that ran and has bad news returns `ok: true` with
 * `isError` set on the result.
 */
export function callTool(name: unknown, args: unknown, deps: BenchMcpDeps): ToolCallOutcome {
  if (typeof name !== 'string' || !(name in HANDLERS)) {
    return { ok: false, code: INVALID_PARAMS, message: `unknown tool '${String(name)}'` }
  }
  if (args !== undefined && args !== null && !isRecord(args)) {
    return { ok: false, code: INVALID_PARAMS, message: 'arguments must be an object' }
  }
  try {
    return { ok: true, result: HANDLERS[name](deps, isRecord(args) ? args : {}) }
  } catch (err) {
    if (err instanceof InvalidArgs) return { ok: false, code: INVALID_PARAMS, message: err.message }
    // An unexpected throw is the TOOL failing, not the transport: report it as
    // a tool error so one bad record can't look like a dead server.
    return { ok: true, result: toolError('internal-error', (err as Error).message) }
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC routing
// ---------------------------------------------------------------------------

/**
 * Route one PARSED message. Returns the response to write, or `null` for a
 * notification (no `id`), which per JSON-RPC must never be answered.
 */
export function handleMessage(message: unknown, deps: BenchMcpDeps): JsonRpcResponse | null {
  if (Array.isArray(message)) {
    return fail(null, INVALID_REQUEST, 'batch requests are not supported by this server')
  }
  if (!isRecord(message)) return fail(null, INVALID_REQUEST, 'message must be a JSON-RPC object')

  const method = message.method
  const id = (message.id ?? null) as JsonRpcId
  const isNotification = message.id === undefined
  if (typeof method !== 'string') {
    return isNotification ? null : fail(id, INVALID_REQUEST, "'method' must be a string")
  }
  if (isNotification) return null // includes notifications/initialized

  switch (method) {
    case 'initialize': {
      const params = isRecord(message.params) ? message.params : {}
      const asked = params.protocolVersion
      const protocolVersion =
        typeof asked === 'string' && (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(asked)
          ? asked
          : MCP_PROTOCOL_VERSION
      return ok(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'Read-only access to the benebsworth.com LLM benchmark: model/task rosters, per-(model,task) records with failed-check summaries, run-log transcripts, related-run neighbours and bench:// reference resolution. Nothing here writes.',
      })
    }
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: toolDefinitions() })
    case 'tools/call': {
      if (!isRecord(message.params)) {
        return fail(id, INVALID_PARAMS, "'params' must be an object with a tool 'name'")
      }
      const outcome = callTool(message.params.name, message.params.arguments, deps)
      return outcome.ok ? ok(id, outcome.result) : fail(id, outcome.code, outcome.message)
    }
    default:
      return fail(id, METHOD_NOT_FOUND, `method not found: ${method}`)
  }
}

/**
 * Route one LINE of the stdio stream: blank lines are skipped, unparsable ones
 * become a parse error and — critically — do not end the session. A truncated
 * write from a client is a bad message, not a dead server.
 */
export function handleLine(line: string, deps: BenchMcpDeps): JsonRpcResponse | null {
  if (line.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch (err) {
    return fail(null, PARSE_ERROR, `parse error: ${(err as Error).message}`)
  }
  return handleMessage(parsed, deps)
}
