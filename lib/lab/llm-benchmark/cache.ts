/**
 * On-disk response cache for the benchmark harness.
 *
 * The key is everything that changes what a REPLAY would be a replay OF:
 * (model, task, amended prompt, iteration index, frame-prelude fingerprint).
 * See `buildCacheKey` for why the prelude is in there.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { framePreludeFingerprint } from './prompt-bundle'
import type { UsageProvenance } from './types'

/**
 * The generation payload a cache hit replays.
 *
 * Structurally a subset of `GenerationResponse`, and the optional fields are
 * declared HERE rather than left to widening: `setCachedResponse` is called
 * with a whole response object, but every consumer builds a `CachedResponse`
 * field by field, and a field the type does not know about is silently dropped
 * on the way through. `usageSource` and `ttftMs` are provenance — losing them
 * turns "estimated" into "unknown", which is then presented as reported.
 *
 * Absent means absent, on both: `ttftMs` has no zero (a 0ms first token is
 * impossible) and `usageSource` defaults to `'estimated'` at the consumer.
 */
export interface CachedResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /** Where the token counts came from — see `GenerationResponse.usageSource`. */
  usageSource?: UsageProvenance
  /** Time-to-first-observable-output of the ORIGINAL call, in ms. */
  ttftMs?: number
}

export interface CacheEntry {
  key: string
  modelId: string
  taskId: string
  iterationIndex: number
  promptHash: string
  createdAt: string
  response: CachedResponse
}

const CACHE_FILE = resolve(process.cwd(), '.cache', 'llm-benchmark-responses.json')

let loaded = false
let entries: CacheEntry[] = []
let bustCache = false
export let saveQueue: Promise<void> = Promise.resolve()

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

/**
 * The cache key: (model, task, amended prompt, iteration, PRELUDE).
 *
 * WHY THE PRELUDE IS IN HERE. `promptBundleHash` — the stamp that tells the
 * board "these numbers describe conditions that no longer exist" — covers the
 * amended prompt AND `framePreludeFingerprint()`. The cache used to cover only
 * the prompt, so a prelude edit staled every stored record while leaving every
 * cache entry reachable: the re-sweep the stale marker asked for hit the cache,
 * replayed the OLD bytes, and `aggregateRuns` stamped them with the NEW bundle
 * hash. The warnings cleared and nothing had been regenerated — the worst
 * possible outcome, because it looks like the fix.
 *
 * Keying on it makes the cache honour the promise the bundle hash makes: change
 * the prelude, and the next sweep really does re-generate. Entries written
 * under the old key shape simply become unreachable — a cold cache after a
 * prelude edit, which is exactly the intent and costs one sweep.
 *
 * `preludeFingerprint` is injectable for tests only; production passes the real
 * one.
 */
export function buildCacheKey(
  modelId: string,
  taskId: string,
  prompt: string,
  iterationIndex: number,
  preludeFingerprint: string = framePreludeFingerprint()
): string {
  const promptHash = hashPrompt(prompt)
  return `${modelId}::${taskId}::${promptHash}::${iterationIndex}::${preludeFingerprint}`
}

function load(): void {
  if (loaded) return
  loaded = true
  entries = []
  if (bustCache) return
  if (!existsSync(CACHE_FILE)) return
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as { entries?: CacheEntry[] }
    if (Array.isArray(parsed.entries)) entries = parsed.entries
  } catch {
    entries = []
  }
}

function flush(): void {
  saveQueue = saveQueue
    .then(() => {
      mkdirSync(dirname(CACHE_FILE), { recursive: true })
      writeFileSync(CACHE_FILE, JSON.stringify({ entries }, null, 2) + '\n')
    })
    .catch((err) => {
      console.error(
        `[harness] cache write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    })
}

/** Ignore existing cached entries and start with an empty in-memory cache. */
export function setBustCache(bust: boolean): void {
  bustCache = bust
  loaded = false
}

export function getCachedResponse(
  modelId: string,
  taskId: string,
  prompt: string,
  iterationIndex: number
): CachedResponse | undefined {
  load()
  const key = buildCacheKey(modelId, taskId, prompt, iterationIndex)
  return entries.find((e) => e.key === key)?.response
}

export function setCachedResponse(
  modelId: string,
  taskId: string,
  prompt: string,
  iterationIndex: number,
  response: CachedResponse
): void {
  load()
  const key = buildCacheKey(modelId, taskId, prompt, iterationIndex)
  const existingIndex = entries.findIndex((e) => e.key === key)
  const entry: CacheEntry = {
    key,
    modelId,
    taskId,
    iterationIndex,
    promptHash: hashPrompt(prompt),
    createdAt: new Date().toISOString(),
    response,
  }
  if (existingIndex >= 0) {
    entries[existingIndex] = entry
  } else {
    entries.push(entry)
  }
  flush()
}

export function clearCache(): void {
  load()
  entries = []
  flush()
}
