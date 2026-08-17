import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildTraceExport, traceExportFilename, traceExportReadme } from './trace-export'
import type { TraceIndexEntry } from './traces'

const ENTRY: TraceIndexEntry = {
  runId: '2026-08-17T06-34-06',
  file: 'gemini-3.6-flash-tic-tac-toe.jsonl',
  modelId: 'gemini-3.6-flash',
  taskId: 'tic-tac-toe',
  bytes: 1234,
  spillRefs: ['spill/aaaabbbbccccdddd.txt'],
}

const HEADER = {
  type: 'header',
  seq: 0,
  version: 1,
  runId: ENTRY.runId,
  modelId: ENTRY.modelId,
  taskId: ENTRY.taskId,
  createdAt: '2026-08-17T06:34:06.000Z',
  configSnapshot: { iterations: 5, timeoutMs: 600000, maxRetries: 2, bustCache: false },
}

const CLEAN = {
  type: 'clean',
  seq: 1,
  ts: '2026-08-17T06:35:00.000Z',
  iterationIndex: 0,
  output: { spillRef: 'spill/aaaabbbbccccdddd.txt', preview: '<!doctype html>', bytes: 42 },
}

const AGGREGATE = {
  type: 'aggregate',
  seq: 2,
  ts: '2026-08-17T06:40:00.000Z',
  result: {
    modelId: ENTRY.modelId,
    taskId: ENTRY.taskId,
    score: 78,
    status: 'success',
    iterations: 5,
    iterationsSucceeded: 5,
    costUsd: 0.0123,
    failureReason: 'none',
  },
}

const LOG_TEXT = [HEADER, CLEAN, AGGREGATE].map((e) => JSON.stringify(e)).join('\n') + '\n'
const SPILL_TEXT = '<!doctype html>\n<title>tic tac toe</title>\n'

function reader(files: Record<string, string>) {
  const seen: string[] = []
  return {
    seen,
    read: async (relPath: string) => {
      seen.push(relPath)
      const text = files[relPath]
      if (text === undefined) throw new Error(`HTTP 404 for ${relPath}`)
      return text
    },
  }
}

const FILES = { [ENTRY.file]: LOG_TEXT, 'spill/aaaabbbbccccdddd.txt': SPILL_TEXT }

describe('traceExportFilename', () => {
  it('names the archive by model, task and run', () => {
    expect(traceExportFilename(ENTRY)).toBe(
      'trace-gemini-3.6-flash-tic-tac-toe-2026-08-17T06-34-06.zip'
    )
  })

  it('produces a filename with no path separators or spaces', () => {
    const name = traceExportFilename({ ...ENTRY, modelId: 'a/b', taskId: 'c d' })
    expect(name).not.toMatch(/[/\\\s]/)
  })
})

describe('traceExportReadme', () => {
  const readme = () =>
    traceExportReadme({
      entry: ENTRY,
      logFile: ENTRY.file,
      spillRefs: ['spill/aaaabbbbccccdddd.txt'],
      missingSpill: [],
      aggregate: AGGREGATE.result,
      exportedAt: new Date('2026-08-17T12:00:00Z'),
    })

  it('states the score the trace backs, from the log’s own aggregate', () => {
    const text = readme()
    expect(text).toContain('score 78')
    expect(text).toContain('success')
    expect(text).toContain('5/5')
    expect(text).toContain('$0.0123')
  })

  it('lists every file in the archive', () => {
    const text = readme()
    expect(text).toContain(ENTRY.file)
    expect(text).toContain('spill/aaaabbbbccccdddd.txt')
    expect(text).toContain('README.txt')
  })

  it('gives the offline re-verification commands', () => {
    const text = readme()
    expect(text).toContain('retrace.mjs --dir')
    expect(text).toContain('shasum -a 256')
  })

  it('says so loudly when a spill file could not be fetched', () => {
    const text = traceExportReadme({
      entry: ENTRY,
      logFile: ENTRY.file,
      spillRefs: [],
      missingSpill: ['spill/aaaabbbbccccdddd.txt'],
      aggregate: AGGREGATE.result,
      exportedAt: new Date('2026-08-17T12:00:00Z'),
    })
    expect(text).toMatch(/INCOMPLETE/)
    expect(text).toContain('spill/aaaabbbbccccdddd.txt')
  })

  it('does not invent a score when the log has no aggregate', () => {
    const text = traceExportReadme({
      entry: ENTRY,
      logFile: ENTRY.file,
      spillRefs: [],
      missingSpill: [],
      aggregate: undefined,
      exportedAt: new Date('2026-08-17T12:00:00Z'),
    })
    expect(text).toMatch(/no aggregate/i)
    expect(text).not.toMatch(/score \d/)
  })
})

describe('buildTraceExport', () => {
  it('fetches the log and every spill file it references, exactly once each', async () => {
    const io = reader(FILES)
    const result = await buildTraceExport({ entry: ENTRY, readFile: io.read })
    expect(io.seen).toEqual([ENTRY.file, 'spill/aaaabbbbccccdddd.txt'])
    expect(result.names).toEqual([ENTRY.file, 'spill/aaaabbbbccccdddd.txt', 'README.txt'])
    expect(result.missingSpill).toEqual([])
    expect(result.filename).toBe(traceExportFilename(ENTRY))
  })

  it('finds spill refs the INDEX does not list (the log is the authority)', async () => {
    const extra = {
      type: 'response',
      seq: 3,
      ts: '2026-08-17T06:36:00.000Z',
      iterationIndex: 1,
      rawOutput: { spillRef: 'spill/1111222233334444.txt', preview: 'x', bytes: 9 },
      tokensIn: 1,
      tokensOut: 2,
      runtimeMs: 3,
      cacheHit: false,
    }
    const text = LOG_TEXT + JSON.stringify(extra) + '\n'
    const io = reader({ ...FILES, [ENTRY.file]: text, 'spill/1111222233334444.txt': 'x' })
    const result = await buildTraceExport({ entry: { ...ENTRY, spillRefs: [] }, readFile: io.read })
    expect(result.names).toContain('spill/1111222233334444.txt')
  })

  it('still produces an archive when a spill file 404s, and records it', async () => {
    const io = reader({ [ENTRY.file]: LOG_TEXT })
    const result = await buildTraceExport({ entry: ENTRY, readFile: io.read })
    expect(result.missingSpill).toEqual(['spill/aaaabbbbccccdddd.txt'])
    expect(result.names).toEqual([ENTRY.file, 'README.txt'])
  })

  it('fails loudly when the LOG itself cannot be fetched', async () => {
    const io = reader({})
    await expect(buildTraceExport({ entry: ENTRY, readFile: io.read })).rejects.toThrow(/404/)
  })

  it('fails loudly when the fetched log is not a run log', async () => {
    const io = reader({ [ENTRY.file]: 'not json at all\n' })
    await expect(buildTraceExport({ entry: ENTRY, readFile: io.read })).rejects.toThrow(/header/i)
  })

  it('round-trips through unzip with byte-identical members', async () => {
    let available = true
    try {
      execFileSync('unzip', ['-v'], { stdio: 'ignore' })
    } catch {
      available = false
    }
    if (!available) {
      // NOTE: `unzip` is absent on this machine — extraction was not verified.
      expect(available).toBe(false)
      return
    }

    const io = reader(FILES)
    const result = await buildTraceExport({ entry: ENTRY, readFile: io.read })
    const dir = mkdtempSync(join(tmpdir(), 'trace-export-'))
    try {
      const zipFile = join(dir, result.filename)
      writeFileSync(zipFile, result.bytes)
      execFileSync('unzip', ['-q', '-o', zipFile, '-d', join(dir, 'out')])
      expect(readFileSync(join(dir, 'out', ENTRY.file), 'utf8')).toBe(LOG_TEXT)
      expect(readFileSync(join(dir, 'out/spill/aaaabbbbccccdddd.txt'), 'utf8')).toBe(SPILL_TEXT)
      expect(readFileSync(join(dir, 'out/README.txt'), 'utf8')).toContain('score 78')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
