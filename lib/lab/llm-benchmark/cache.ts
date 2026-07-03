import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface CachedResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
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

function buildCacheKey(modelId: string, taskId: string, prompt: string, iterationIndex: number): string {
  const promptHash = hashPrompt(prompt)
  return `${modelId}::${taskId}::${promptHash}::${iterationIndex}`
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
