import { describe, expect, it } from 'vitest'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  MAX_ARTIFACT_BYTES,
  MCP_PROTOCOL_VERSION,
  SERVER_INFO,
  callTool,
  handleLine,
  handleMessage,
  toolDefinitions,
  type BenchMcpDeps,
} from './mcp'
import { openTraceFromDisk } from './mcp-fs'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
import { loadTraceIndex } from './traces-server'
import type { TraceIndexEntry } from './traces'
import type { BenchmarkResult } from './types'

/**
 * The MCP surface, tested WITHOUT stdio.
 *
 * Everything below drives `handleMessage`/`callTool` directly against the REAL
 * registry (models/tasks are the shipped ones — an agent's blind tool call has
 * to work against those, not against a fixture roster) plus a small results
 * fixture, so the assertions stay stable when a sweep rewrites results.json.
 * One integration test at the bottom spawns the real server over stdio; it is
 * the only thing that proves the framing.
 */

const ARTIFACT = '<!doctype html>\n' + 'x'.repeat(MAX_ARTIFACT_BYTES * 2)

const platformer: BenchmarkResult = {
  taskId: 'mini-platformer',
  modelId: 'deepseek-v4-flash-free',
  score: 55.3,
  runtimeMs: 42_000,
  tokensIn: 900,
  tokensOut: 4200,
  costUsd: 0,
  iterations: 2,
  iterationsSucceeded: 2,
  iterationScores: [55.3, 55.3],
  iterationCheckResults: [
    [
      { name: 'platformer-jump', passed: false, points: 0, maxPoints: 30, detail: 'pixel diff 0.0%' },
      { name: 'platformer-move', passed: true, points: 25, maxPoints: 25 },
    ],
    [
      { name: 'platformer-jump', passed: false, points: 0, maxPoints: 30, detail: 'pixel diff 0.0%' },
      { name: 'platformer-move', passed: true, points: 25, maxPoints: 25 },
    ],
  ],
  status: 'partial',
  failureReason: 'none',
  createdAt: '2026-08-17T05:00:00.000Z',
  runLogRef: { runId: '2026-08-17T05-41-46', file: 'deepseek-v4-flash-free-mini-platformer.jsonl' },
  promptBundle: 'pb-1234',
  source: 'live',
  output: ARTIFACT,
}

const landing: BenchmarkResult = {
  taskId: 'landing-page-morph',
  modelId: 'gemini-3.6-flash',
  score: 92.4,
  runtimeMs: 21_000,
  tokensIn: 800,
  tokensOut: 3000,
  costUsd: 0.02,
  iterations: 1,
  iterationsSucceeded: 1,
  iterationScores: [92.4],
  iterationCheckResults: [
    [
      { name: 'landing-structure', passed: true, points: 30, maxPoints: 30 },
      { name: 'landing-animates', passed: false, points: 0, maxPoints: 35, detail: 'no motion' },
    ],
  ],
  status: 'success',
  createdAt: '2026-08-17T06:34:06.000Z',
  runLogRef: { runId: '2026-08-17T06-34-06', file: 'gemini-3.6-flash-landing-page-morph.jsonl' },
  source: 'live',
  budgetExceeded: { spentUsd: 1.5, capUsd: 1.5 },
  quotaNextResetAt: '2026-08-18T00:00:00.000Z',
}

/** A third record so `relatedRuns` has a neighbour that shares a failed check. */
const neighbour: BenchmarkResult = {
  taskId: 'landing-page-morph',
  modelId: 'kimi-k3',
  score: 40,
  runtimeMs: 10_000,
  tokensIn: 100,
  tokensOut: 500,
  costUsd: 0.01,
  iterations: 1,
  iterationsSucceeded: 1,
  iterationCheckResults: [
    [{ name: 'landing-animates', passed: false, points: 0, maxPoints: 35, detail: 'static' }],
  ],
  status: 'partial',
  createdAt: '2026-08-16T06:34:06.000Z',
  source: 'live',
}

const TRACE_TEXT = [
  JSON.stringify({
    type: 'header',
    seq: 0,
    version: 1,
    runId: '2026-08-17T06-34-06',
    modelId: 'gemini-3.6-flash',
    taskId: 'landing-page-morph',
    createdAt: '2026-08-17T06:34:06.000Z',
    configSnapshot: { iterations: 1, timeoutMs: 600_000, maxRetries: 2, bustCache: false },
  }),
  JSON.stringify({
    type: 'request',
    seq: 1,
    ts: '2026-08-17T06:34:07.000Z',
    iterationIndex: 0,
    promptHash: 'a'.repeat(64),
    promptLength: 1200,
  }),
  JSON.stringify({
    type: 'check',
    seq: 2,
    ts: '2026-08-17T06:35:00.000Z',
    iterationIndex: 0,
    check: { name: 'landing-animates', passed: false, points: 0, maxPoints: 35, detail: 'static' },
  }),
  '',
].join('\n')

function deps(overrides: Partial<BenchMcpDeps> = {}): BenchMcpDeps {
  return {
    models: BENCHMARK_MODELS,
    tasks: BENCHMARK_TASKS,
    results: [platformer, landing, neighbour],
    openTrace: (ref) =>
      ref.runId === '2026-08-17T06-34-06'
        ? { ...ref, origin: 'published', text: TRACE_TEXT }
        : undefined,
    ...overrides,
  }
}

/** The JSON payload a tool call carries in its single text content block. */
function payload(name: string, args: unknown, d: BenchMcpDeps = deps()): any {
  const call = callTool(name, args, d)
  expect(call.ok, `callTool(${name}) rejected: ${call.ok ? '' : call.message}`).toBe(true)
  if (!call.ok) throw new Error('unreachable')
  expect(call.result.content).toHaveLength(1)
  expect(call.result.content[0].type).toBe('text')
  return { ...JSON.parse(call.result.content[0].text), __isError: call.result.isError === true }
}

describe('mcp: handshake', () => {
  it('answers initialize with the protocol version, serverInfo and a tools capability', () => {
    const res = handleMessage(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'x', version: '1' } },
      },
      deps(),
    )
    expect(res).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_INFO.name },
      },
    })
  })

  it('echoes a newer protocol version it can still speak, and falls back otherwise', () => {
    const newer = handleMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      deps(),
    ) as any
    expect(newer.result.protocolVersion).toBe('2025-06-18')

    const alien = handleMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 'banana' } },
      deps(),
    ) as any
    expect(alien.result.protocolVersion).toBe(MCP_PROTOCOL_VERSION)
  })

  it('ignores notifications (no id) and answers ping', () => {
    expect(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, deps())).toBeNull()
    expect(handleMessage({ jsonrpc: '2.0', id: 7, method: 'ping' }, deps())).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: {},
    })
  })

  it('rejects unknown methods with method-not-found', () => {
    const res = handleMessage({ jsonrpc: '2.0', id: 2, method: 'resources/list' }, deps()) as any
    expect(res.error.code).toBe(-32601)
    expect(res.result).toBeUndefined()
  })

  it('rejects a malformed line with a parse error but keeps the shape valid', () => {
    const res = handleLine('{not json', deps()) as any
    expect(res).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32700 } })
  })

  it('rejects a non-object message and a batch array as invalid requests', () => {
    expect((handleLine('42', deps()) as any).error.code).toBe(-32600)
    const batch = handleLine('[{"jsonrpc":"2.0","id":1,"method":"ping"}]', deps()) as any
    expect(batch.error.code).toBe(-32600)
    expect(batch.error.message).toMatch(/batch/i)
    expect(batch.id).toBeNull()
  })

  it('skips blank lines entirely', () => {
    expect(handleLine('   ', deps())).toBeNull()
  })
})

describe('mcp: tools/list', () => {
  const listed = handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, deps()) as any

  it('lists every tool with a description and an object input schema', () => {
    const names = listed.result.tools.map((t: any) => t.name).sort()
    expect(names).toEqual([
      'bench_checks_used',
      'bench_get_result',
      'bench_get_trace',
      'bench_list_models',
      'bench_list_tasks',
      'bench_related_runs',
      'bench_resolve_ref',
    ])
    for (const tool of listed.result.tools) {
      expect(tool.description, tool.name).toBeTruthy()
      expect(tool.inputSchema.type, tool.name).toBe('object')
      for (const [prop, schema] of Object.entries<any>(tool.inputSchema.properties ?? {})) {
        expect(schema.description, `${tool.name}.${prop}`).toBeTruthy()
      }
    }
  })

  it('exposes the same definitions as toolDefinitions()', () => {
    expect(listed.result.tools).toEqual(toolDefinitions())
  })
})

describe('mcp: bench_list_models', () => {
  it('returns every registry model with completion stats', () => {
    const out = payload('bench_list_models', {})
    expect(out.models.length).toBe(BENCHMARK_MODELS.length)
    const deepseek = out.models.find((m: any) => m.id === 'deepseek-v4-flash-free')
    expect(deepseek.completion.tasksTotal).toBe(BENCHMARK_TASKS.length)
    expect(deepseek.completion.attempted).toBe(1)
    expect(deepseek.completion.meanScore).toBeCloseTo(55.3, 5)
  })
})

describe('mcp: bench_list_tasks', () => {
  it('returns id/category/title/scorer/pluginId for every task', () => {
    const out = payload('bench_list_tasks', {})
    expect(out.tasks.length).toBe(BENCHMARK_TASKS.length)
    const task = out.tasks.find((t: any) => t.id === 'mini-platformer')
    expect(task).toMatchObject({ id: 'mini-platformer', category: expect.any(String), title: expect.any(String) })
    expect(Object.keys(task).sort()).toEqual(['category', 'id', 'pluginId', 'scorer', 'title'])
  })
})

describe('mcp: bench_get_result', () => {
  it('returns the record with a failed-check summary and no artifact by default', () => {
    const out = payload('bench_get_result', { model: 'deepseek-v4-flash-free', task: 'mini-platformer' })
    expect(out.score).toBe(55.3)
    expect(out.status).toBe('partial')
    expect(out.iterationScores).toEqual([55.3, 55.3])
    expect(out.runLogRef.runId).toBe('2026-08-17T05-41-46')
    expect(out.promptBundle).toBe('pb-1234')
    expect(out.failedChecks).toEqual([
      { name: 'platformer-jump', failedIterations: 2, iterations: 2, maxPoints: 30, detail: 'pixel diff 0.0%' },
    ])
    expect(out.ref).toBe('bench://deepseek-v4-flash-free/mini-platformer?run=2026-08-17T05-41-46')
    expect(out.artifact).toBeUndefined()
    expect(out.artifactBytes).toBe(Buffer.byteLength(ARTIFACT))
  })

  it('excludes the code-fallback row from failedChecks (I1)', () => {
    // An agent reading this summary would otherwise report "the model failed
    // the code-fallback check" — a defect that does not exist. The row says
    // the HARNESS could not judge the artifact.
    const fellBack: BenchmarkResult = {
      taskId: 'equation-solver',
      modelId: 'kimi-k3',
      score: 61,
      runtimeMs: 5_000,
      tokensIn: 100,
      tokensOut: 400,
      costUsd: 0,
      iterations: 1,
      iterationsSucceeded: 1,
      iterationScores: [61],
      iterationCheckResults: [
        [
          {
            name: 'code-fallback',
            passed: false,
            points: 0,
            maxPoints: 0,
            kind: 'fallback',
            detail: 'extraction-failed: no program in the artifact',
          },
          { name: 'solutions-correct', passed: false, points: 0, maxPoints: 70, detail: 'missing (3, 4)' },
        ],
      ],
      status: 'success',
      createdAt: '2026-08-17T07:00:00.000Z',
      source: 'live',
    }
    const out = payload(
      'bench_get_result',
      { model: 'kimi-k3', task: 'equation-solver' },
      deps({ results: [fellBack] }),
    )
    expect(out.failedChecks.map((c: any) => c.name)).toEqual(['solutions-correct'])
  })

  it('carries the quota and budget stamps when present', () => {
    const out = payload('bench_get_result', { model: 'gemini-3.6-flash', task: 'landing-page-morph' })
    expect(out.budgetExceeded).toEqual({ spentUsd: 1.5, capUsd: 1.5 })
    expect(out.quotaNextResetAt).toBe('2026-08-18T00:00:00.000Z')
  })

  it('includes the artifact on request, capped with a truncation note', () => {
    const out = payload('bench_get_result', {
      model: 'deepseek-v4-flash-free',
      task: 'mini-platformer',
      include_artifact: true,
    })
    expect(Buffer.byteLength(out.artifact)).toBeLessThanOrEqual(MAX_ARTIFACT_BYTES)
    expect(out.artifactTruncated).toBe(true)
    expect(out.artifactNote).toMatch(/truncated/i)
  })

  it('errors on a missing argument, an unknown model, an unknown task and a missing record', () => {
    const missing = callTool('bench_get_result', { model: 'deepseek-v4-flash-free' }, deps())
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.code).toBe(-32602)

    const badModel = payload('bench_get_result', { model: 'no-such-model', task: 'mini-platformer' })
    expect(badModel.__isError).toBe(true)
    expect(badModel.error.code).toBe('unknown-model')

    const badTask = payload('bench_get_result', { model: 'deepseek-v4-flash-free', task: 'no-such-task' })
    expect(badTask.error.code).toBe('unknown-task')

    const noRecord = payload('bench_get_result', { model: 'claude-4', task: 'mini-platformer' })
    expect(noRecord.error.code).toBe('no-result')
  })
})

describe('mcp: bench_get_trace', () => {
  it('returns the transcript for a record whose log is available', () => {
    const out = payload('bench_get_trace', { model: 'gemini-3.6-flash', task: 'landing-page-morph' })
    expect(out.origin).toBe('published')
    expect(out.runId).toBe('2026-08-17T06-34-06')
    expect(out.transcript).toContain('gemini-3.6-flash :: landing-page-morph')
    expect(out.transcript).toContain('request  prompt 1200 chars')
    expect(out.transcript).toContain('check    FAIL landing-animates 0/35')
  })

  it('reports a typed not-found when no log is available anywhere', () => {
    const out = payload('bench_get_trace', { model: 'deepseek-v4-flash-free', task: 'mini-platformer' })
    expect(out.__isError).toBe(true)
    expect(out.error.code).toBe('no-trace')
  })

  it('refuses a run that does not match the record', () => {
    const out = payload('bench_get_trace', {
      model: 'gemini-3.6-flash',
      task: 'landing-page-morph',
      run: '2026-01-01T00-00-00',
    })
    expect(out.error.code).toBe('no-trace')
  })

  it('errors on missing args and unknown ids', () => {
    expect(callTool('bench_get_trace', {}, deps()).ok).toBe(false)
    expect(payload('bench_get_trace', { model: 'no-such-model', task: 'mini-platformer' }).error.code).toBe(
      'unknown-model',
    )
  })
})

describe('mcp: bench_related_runs', () => {
  it('ranks neighbours that failed the same checks, as bench:// refs', () => {
    const out = payload('bench_related_runs', { model: 'gemini-3.6-flash', task: 'landing-page-morph' })
    expect(out.signature).toEqual(['landing-animates'])
    expect(out.related).toEqual([
      {
        ref: 'bench://kimi-k3/landing-page-morph',
        modelId: 'kimi-k3',
        taskId: 'landing-page-morph',
        sharedChecks: ['landing-animates'],
        tier: 'same-task',
      },
    ])
  })

  it('returns an empty list (not an error) for a record with no failed checks', () => {
    const clean: BenchmarkResult = { ...neighbour, modelId: 'gpt-5', iterationCheckResults: [[]] }
    const out = payload(
      'bench_related_runs',
      { model: 'gpt-5', task: 'landing-page-morph' },
      deps({ results: [platformer, landing, clean] }),
    )
    expect(out.related).toEqual([])
    expect(out.__isError).toBe(false)
  })

  it('errors on missing args and unknown ids', () => {
    expect(callTool('bench_related_runs', { task: 'mini-platformer' }, deps()).ok).toBe(false)
    expect(payload('bench_related_runs', { model: 'gpt-5', task: 'no-such-task' }).error.code).toBe('unknown-task')
  })
})

describe('mcp: bench_resolve_ref', () => {
  it('resolves a well-formed ref to its model, task and record', () => {
    const out = payload('bench_resolve_ref', { uri: 'bench://deepseek-v4-flash-free/mini-platformer/0' })
    expect(out.ok).toBe(true)
    expect(out.modelId).toBe('deepseek-v4-flash-free')
    expect(out.taskId).toBe('mini-platformer')
    expect(out.iterationScore).toBe(55.3)
    expect(out.iterationChecks).toHaveLength(2)
  })

  it('returns a typed miss for garbage rather than crashing', () => {
    for (const uri of ['', 'not a ref', 'bench://', 'bench://a/b/c/d', 'bench://a/b/9x', '../../etc/passwd']) {
      const out = payload('bench_resolve_ref', { uri })
      expect(out.__isError, uri).toBe(true)
      expect(typeof out.error.code, uri).toBe('string')
    }
  })

  it('errors when uri is absent or not a string', () => {
    expect(callTool('bench_resolve_ref', {}, deps()).ok).toBe(false)
    expect(callTool('bench_resolve_ref', { uri: 3 }, deps()).ok).toBe(false)
  })
})

describe('mcp: bench_checks_used', () => {
  it('lists the checks and point budgets for a behavioural task', () => {
    const out = payload('bench_checks_used', { task: 'mini-platformer' })
    expect(out.taskId).toBe('mini-platformer')
    expect(out.browserCheckCount).toBe(2)
    expect(out.recordedChecks).toEqual([
      { name: 'platformer-jump', maxPoints: 30 },
      { name: 'platformer-move', maxPoints: 25 },
    ])
    expect(out.totalPoints).toBe(55)
  })

  it('reports the two check sources separately for an executable task (M1)', () => {
    // The incoherence this replaced: `checkCount: 0` printed beside a list of
    // recorded named checks, with nothing to say the count was BROWSER-only.
    // An executable task has no browser CheckFns by construction — its probes
    // live in scorers/executable.ts — so 0 is the right number, and the field
    // name is what makes it readable rather than contradictory.
    const out = payload('bench_checks_used', { task: 'equation-solver' })
    expect(out.__isError).toBe(false)
    expect(out.scorer).toBe('executable')
    expect(out.browserCheckCount).toBe(0)
    expect(out.browserChecksFrom).toContain('getChecksForTask')
    expect(out.recordedChecksFrom).toContain('recorded')
    expect(Array.isArray(out.recordedChecks)).toBe(true)
  })

  it('errors on missing args and an unknown task', () => {
    expect(callTool('bench_checks_used', {}, deps()).ok).toBe(false)
    expect(payload('bench_checks_used', { task: 'no-such-task' }).error.code).toBe('unknown-task')
  })
})

describe('mcp: tools/call routing', () => {
  it('maps a rejected call to an invalid-params JSON-RPC error', () => {
    const res = handleMessage(
      { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'bench_get_result', arguments: {} } },
      deps(),
    ) as any
    expect(res.error.code).toBe(-32602)
  })

  it('rejects an unknown tool name and malformed params', () => {
    const unknown = handleMessage(
      { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'bench_drop_table', arguments: {} } },
      deps(),
    ) as any
    expect(unknown.error.code).toBe(-32602)
    expect(unknown.error.message).toMatch(/unknown tool/i)

    const noParams = handleMessage({ jsonrpc: '2.0', id: 11, method: 'tools/call' }, deps()) as any
    expect(noParams.error.code).toBe(-32602)

    const badArgs = handleMessage(
      { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'bench_list_models', arguments: 'nope' } },
      deps(),
    ) as any
    expect(badArgs.error.code).toBe(-32602)
  })

  it('treats absent arguments as {} for a no-argument tool', () => {
    const res = handleMessage(
      { jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'bench_list_tasks' } },
      deps(),
    ) as any
    expect(res.result.content[0].type).toBe('text')
  })
})

// ---------------------------------------------------------------------------
// the fs adapter: where the bytes come from
// ---------------------------------------------------------------------------

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('mcp-fs: openTraceFromDisk', () => {
  const published: TraceIndexEntry | undefined = loadTraceIndex()[0]

  it('opens a published trace, and prefers the local sweep tree when it exists', () => {
    if (!published) return // a checkout with no published traces has nothing to assert
    const handle = openTraceFromDisk({ runId: published.runId, file: published.file }, root)
    expect(handle).toBeDefined()
    expect(handle!.text.startsWith('{"type":"header"')).toBe(true)
    // Both trees carry this run in a working checkout; local wins when present.
    const local = existsSync(join(root, 'sweeps', published.runId, published.file))
    expect(handle!.origin).toBe(local ? 'local-sweep' : 'published')
  })

  it('returns undefined for an absent run and refuses an unsafe path segment', () => {
    expect(openTraceFromDisk({ runId: 'no-such-run', file: 'a.jsonl' }, root)).toBeUndefined()
    expect(openTraceFromDisk({ runId: '../../etc', file: 'passwd' }, root)).toBeUndefined()
    expect(openTraceFromDisk({ runId: '2026-08-17T05-41-46', file: '../results.json' }, root)).toBeUndefined()
  })

  it('refuses an unsafe spill ref through the handle', () => {
    if (!published) return
    const handle = openTraceFromDisk({ runId: published.runId, file: published.file }, root)!
    expect(() => handle.readSpill!('../../../etc/passwd')).toThrow(/unsafe spill ref/)
  })
})

// ---------------------------------------------------------------------------
// the one integration test: the real server, over real stdio
// ---------------------------------------------------------------------------

const tsx = join(root, 'node_modules/.bin/tsx')

describe('scripts/bench-mcp.mjs over stdio', () => {
  it('completes a handshake, lists tools and answers a tool call', async () => {
    const child = spawn(tsx, [join(root, 'scripts/bench-mcp.mjs')], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    try {
      const responses: any[] = []
      let buffer = ''
      const done = new Promise<void>((resolveDone, rejectDone) => {
        child.stdout.setEncoding('utf8')
        child.stdout.on('data', (chunk: string) => {
          buffer += chunk
          let nl: number
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl)
            buffer = buffer.slice(nl + 1)
            if (line.trim() === '') continue
            try {
              responses.push(JSON.parse(line))
            } catch {
              rejectDone(new Error(`non-JSON line from server: ${line}`))
              return
            }
            if (responses.length === 3) resolveDone()
          }
        })
        child.on('error', rejectDone)
        child.on('exit', (code) => rejectDone(new Error(`server exited early (${code})`)))
      })

      const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + '\n')
      send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: MCP_PROTOCOL_VERSION } })
      send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'bench_checks_used', arguments: { task: 'mini-platformer' } },
      })

      await done

      expect(responses[0].result.serverInfo.name).toBe(SERVER_INFO.name)
      expect(responses[0].result.capabilities.tools).toBeDefined()
      expect(responses[1].result.tools.length).toBe(toolDefinitions().length)
      const checks = JSON.parse(responses[2].result.content[0].text)
      expect(checks.taskId).toBe('mini-platformer')
      expect(checks.browserCheckCount).toBe(2)
      // Against the REAL board, so assert containment: the scorer's synthetic
      // `no-runtime-errors` entry rides along whenever some run's page threw.
      expect(checks.recordedChecks.map((c: any) => c.name)).toEqual(
        expect.arrayContaining(['platformer-jump', 'platformer-move']),
      )
      expect(checks.totalPoints).toBe(55)
    } finally {
      child.kill('SIGKILL')
    }
  }, 90_000)

  it('is importable without side effects on stdout', () => {
    // The server module must not print anything at import time — a stray
    // console.log would corrupt the very first framed message.
    const out = execFileSync(
      tsx,
      [
        '-e',
        "import('./lib/lab/llm-benchmark/mcp-fs.ts').then(() => process.stdout.write('clean'))",
      ],
      { cwd: root, encoding: 'utf8' },
    )
    expect(out).toBe('clean')
  }, 60_000)
})
