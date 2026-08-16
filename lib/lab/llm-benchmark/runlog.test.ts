import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The writer opens its FileHandle through node:fs/promises. Keep the real
// implementation by default and swap `open` only inside the rollback test —
// forcing a genuine write failure portably (disk full, revoked fd) is not
// otherwise reproducible on a developer machine.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, default: actual, open: vi.fn(actual.open) }
})
import { open } from 'node:fs/promises'

import {
  SPILL_PREVIEW_CHARS,
  SPILL_THRESHOLD_BYTES,
  WRITE_BATCH_MAX_DELAY_MS,
  getRunLogDir,
  openRunLog,
  readRunLog,
  runLogFileName,
  setRunLogDir,
  spillPreview,
} from './runlog'

const dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'runlog-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  setRunLogDir(undefined)
  vi.mocked(open).mockClear()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const META = {
  modelId: 'test-model',
  taskId: 'task-x',
  configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 1, bustCache: true },
}

describe('setRunLogDir / openRunLog', () => {
  it('returns undefined when no run-log dir is set (logging disabled)', () => {
    expect(getRunLogDir()).toBeUndefined()
    expect(openRunLog(META)).toBeUndefined()
  })

  it('names the file <modelId>-<taskId>.jsonl under the run-log dir and derives runId from its basename', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    expect(log).toBeDefined()
    expect(log.file).toBe(runLogFileName(META.modelId, META.taskId))
    expect(log.file).toBe('test-model-task-x.jsonl')
    expect(log.runId).toBe(dir.split('/').pop())
    await log.close()
    expect(existsSync(join(dir, log.file))).toBe(true)
  })

  it('writes an immutable header as line 0 with the config snapshot', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    await log.close()

    const { header, events } = readRunLog(join(dir, log.file))
    expect(header.type).toBe('header')
    expect(header.seq).toBe(0)
    expect(header.version).toBe(1)
    expect(header.modelId).toBe('test-model')
    expect(header.taskId).toBe('task-x')
    expect(header.configSnapshot).toEqual(META.configSnapshot)
    expect(typeof header.createdAt).toBe('string')
    expect(events).toEqual([])
  })

  it('truncates an existing file for the same model+task (one file per pair per sweep)', async () => {
    const dir = tempDir()
    setRunLogDir(dir)

    const first = openRunLog(META)!
    first.append({ type: 'request', iterationIndex: 0, promptHash: 'aaa', promptLength: 3 })
    await first.close()
    expect(readRunLog(join(dir, first.file)).events).toHaveLength(1)

    const second = openRunLog(META)!
    await second.close()
    const reopened = readRunLog(join(dir, second.file))
    expect(reopened.events).toEqual([])
  })
})

describe('append / seq', () => {
  it('keeps seq contiguous: line i has seq === i', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    log.append({ type: 'request', iterationIndex: 0, promptHash: 'h', promptLength: 5 })
    log.append({ type: 'response', iterationIndex: 0, rawOutput: 'hi', tokensIn: 1, tokensOut: 2, runtimeMs: 3, cacheHit: false })
    log.append({ type: 'clean', iterationIndex: 0, output: 'hi' })
    await log.close()

    const lines = readFileSync(join(dir, log.file), 'utf8').trimEnd().split('\n')
    expect(lines).toHaveLength(4)
    lines.forEach((line, i) => {
      expect(JSON.parse(line).seq).toBe(i)
    })
    const { events } = readRunLog(join(dir, log.file))
    expect(events.map((e) => e.type)).toEqual(['request', 'response', 'clean'])
    for (const event of events) expect(typeof event.ts).toBe('string')
  })

  it('stamps every event with an ISO timestamp', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    log.append({ type: 'failure', iterationIndex: 1, error: 'boom', failureReason: 'model_error', timedOut: false })
    await log.close()
    const [event] = readRunLog(join(dir, log.file)).events
    expect(event.ts).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
  })
})

describe('batching', () => {
  it('coalesces appends into one batched write; flush bypasses the window', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    log.append({ type: 'request', iterationIndex: 0, promptHash: 'h', promptLength: 5 })
    log.append({ type: 'clean', iterationIndex: 0, output: 'x' })

    // Nothing (not even the header) has reached disk yet: the batch window is
    // still open, which is the whole point of coalescing.
    expect(readFileSync(join(dir, log.file), 'utf8')).toBe('')

    await log.flush()
    const lines = readFileSync(join(dir, log.file), 'utf8').trimEnd().split('\n')
    expect(lines).toHaveLength(3)

    // A flush with an empty queue is a no-op that still resolves.
    await log.flush()
    expect(readFileSync(join(dir, log.file), 'utf8').trimEnd().split('\n')).toHaveLength(3)
    await log.close()
  })

  it('writes queued events without an explicit flush once the batch window elapses', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    log.append({ type: 'request', iterationIndex: 0, promptHash: 'h', promptLength: 5 })
    await new Promise((resolve) => setTimeout(resolve, WRITE_BATCH_MAX_DELAY_MS * 3))
    expect(readRunLog(join(dir, log.file)).events).toHaveLength(1)
    await log.close()
  })

  it('serializes concurrent flushes so batches never interleave', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    for (let i = 0; i < 20; i++) {
      log.append({ type: 'request', iterationIndex: i, promptHash: `h${i}`, promptLength: i })
      void log.flush()
    }
    await log.close()
    const { events } = readRunLog(join(dir, log.file))
    expect(events).toHaveLength(20)
    events.forEach((event, i) => expect(event.seq).toBe(i + 1))
  })
})

describe('spill', () => {
  it('inlines strings below the threshold', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    const small = 'a'.repeat(SPILL_THRESHOLD_BYTES - 1)
    log.append({ type: 'clean', iterationIndex: 0, output: small })
    await log.close()

    const [event] = readRunLog(join(dir, log.file)).events
    expect(event.type).toBe('clean')
    expect(event.type === 'clean' && event.output).toBe(small)
    expect(existsSync(join(dir, 'spill'))).toBe(false)
  })

  it('spills strings above the threshold to a content-addressed file with a preview', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    const big = 'b'.repeat(SPILL_THRESHOLD_BYTES + 10)
    log.append({ type: 'clean', iterationIndex: 0, output: big })
    await log.close()

    const [event] = readRunLog(join(dir, log.file)).events
    if (event.type !== 'clean') throw new Error('expected a clean event')
    const spilled = event.output
    if (typeof spilled === 'string') throw new Error('expected the output to spill')
    expect(spilled.spillRef).toMatch(/^spill\/[0-9a-f]{16}\.txt$/)
    expect(spilled.bytes).toBe(SPILL_THRESHOLD_BYTES + 10)
    expect(spilled.preview).toHaveLength(SPILL_PREVIEW_CHARS)
    expect(readFileSync(join(dir, spilled.spillRef), 'utf8')).toBe(big)
    // The whole point of the spill: the JSONL line stays small.
    const line = readFileSync(join(dir, log.file), 'utf8').trimEnd().split('\n')[1]
    expect(line.length).toBeLessThan(SPILL_THRESHOLD_BYTES)
    expect(spillPreview(spilled)).toBe(spilled.preview)
    expect(spillPreview('short')).toBe('short')
  })

  it('content-addresses identical payloads to one file (dedupe)', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    const big = 'c'.repeat(SPILL_THRESHOLD_BYTES + 1)
    log.append({ type: 'response', iterationIndex: 0, rawOutput: big, tokensIn: 1, tokensOut: 2, runtimeMs: 3, cacheHit: false })
    log.append({ type: 'clean', iterationIndex: 0, output: big })
    await log.close()

    expect(readdirSync(join(dir, 'spill'))).toHaveLength(1)
    const [response, clean] = readRunLog(join(dir, log.file)).events
    const a = response.type === 'response' ? response.rawOutput : undefined
    const b = clean.type === 'clean' ? clean.output : undefined
    expect(typeof a === 'object' && typeof b === 'object' && a!.spillRef === b!.spillRef).toBe(true)
  })

  it('spills nested strings (e.g. the aggregate result output) too', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    const big = 'd'.repeat(SPILL_THRESHOLD_BYTES + 1)
    log.append({ type: 'aggregate', result: { score: 90, output: big } })
    await log.close()

    const [event] = readRunLog(join(dir, log.file)).events
    if (event.type !== 'aggregate') throw new Error('expected an aggregate event')
    const output = (event.result as { output: { spillRef: string } }).output
    expect(output.spillRef).toMatch(/^spill\/[0-9a-f]{16}\.txt$/)
    expect(readFileSync(join(dir, output.spillRef), 'utf8')).toBe(big)
  })
})

describe('readRunLog', () => {
  it('keeps the complete prefix and ignores a truncated tail line (crash recovery)', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const log = openRunLog(META)!
    log.append({ type: 'request', iterationIndex: 0, promptHash: 'h', promptLength: 5 })
    log.append({ type: 'clean', iterationIndex: 0, output: 'ok' })
    await log.close()

    const file = join(dir, log.file)
    appendFileSync(file, '{"type":"clean","seq":3,"ts":"2026-')
    const { header, events } = readRunLog(file)
    expect(header.type).toBe('header')
    expect(events.map((e) => e.type)).toEqual(['request', 'clean'])

    // Anything after the first bad line is ignored as well, even if valid.
    appendFileSync(file, '\n' + JSON.stringify({ type: 'clean', seq: 4, ts: 'x', output: 'later' }) + '\n')
    expect(readRunLog(file).events).toHaveLength(2)
  })

  it('throws when the header line is missing or invalid', () => {
    const dir = tempDir()
    const bogus = join(dir, 'bogus.jsonl')
    writeFileSync(bogus, '')
    expect(() => readRunLog(bogus)).toThrow(/header/i)
    writeFileSync(bogus, JSON.stringify({ type: 'request', seq: 0 }) + '\n')
    expect(() => readRunLog(bogus)).toThrow(/header/i)
    writeFileSync(bogus, 'not json at all\n')
    expect(() => readRunLog(bogus)).toThrow(/header/i)
  })
})

describe('write-failure rollback', () => {
  it('truncates back to the last durable length and keeps the sweep alive', async () => {
    const dir = tempDir()
    setRunLogDir(dir)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const actualOpen = (await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).open
    let failNext = false
    vi.mocked(open).mockImplementationOnce(async (...args: Parameters<typeof actualOpen>) => {
      const handle = await actualOpen(...args)
      return new Proxy(handle, {
        get(target, prop, receiver) {
          if (prop === 'write' && failNext) {
            return async () => {
              // Simulate a partial write that then errors: bytes land on disk,
              // the promise rejects, and rollback must undo them.
              await target.write('{"type":"gar')
              throw new Error('ENOSPC: simulated write failure')
            }
          }
          const value = Reflect.get(target, prop, receiver)
          return typeof value === 'function' ? value.bind(target) : value
        },
      }) as typeof handle
    })

    const log = openRunLog(META)!
    log.append({ type: 'request', iterationIndex: 0, promptHash: 'h', promptLength: 5 })
    await log.flush()
    const durable = readFileSync(join(dir, log.file), 'utf8')
    expect(durable.trimEnd().split('\n')).toHaveLength(2)

    failNext = true
    log.append({ type: 'clean', iterationIndex: 0, output: 'dropped' })
    await log.flush()
    failNext = false

    // File is byte-identical to its last durable state; the batch is dropped,
    // never re-queued, and nothing threw.
    expect(readFileSync(join(dir, log.file), 'utf8')).toBe(durable)
    expect(warn).toHaveBeenCalled()

    // The log keeps working after a failed batch.
    log.append({ type: 'clean', iterationIndex: 1, output: 'kept' })
    await log.close()
    const { events } = readRunLog(join(dir, log.file))
    expect(events.map((e) => e.type)).toEqual(['request', 'clean'])
    expect(events[1].type === 'clean' && events[1].output).toBe('kept')
    warn.mockRestore()
  })
})
