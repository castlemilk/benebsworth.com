import { createHash } from 'node:crypto'
import type { CategorySource, ContentKind } from './schema'

/** Locale-independent UTF-16 ordering for canonical JSON and deterministic IDs. */
export const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
export const sha256 = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex')

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => compare(a, b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
}
export function sortedUnique<T>(items: readonly T[]): T[] {
  return [...new Map(items.map(item => [canonical(item), item])).entries()]
    .sort(([a], [b]) => compare(a, b)).map(([, item]) => item)
}
export const hasControlCharacters = (value: string, includeSpace = false) => [...value]
  .some(character => character.charCodeAt(0) <= (includeSpace ? 32 : 31) || character.charCodeAt(0) === 127)
function component(key: string): string {
  if (!key || key !== key.trim() || hasControlCharacters(key)) {
    throw new Error('knowledge source: keys must be nonempty, trimmed and free of control characters')
  }
  return encodeURIComponent(key.normalize('NFC'))
}
export const contentId = (kind: ContentKind, key: string) => `${kind}:${component(key)}`
export const categoryId = (namespace: CategorySource['namespace'], key: string) => `category:${namespace}:${component(key)}`
export const conceptId = (kind: ContentKind, key: string, concept: string) => `concept:${kind}:${component(key)}:${component(concept)}`

/** Lexical discovery only. Hyphens, punctuation and scientific symbols survive. */
export const normalizeTag = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()
export const tagId = (value: string) => `tag:${component(normalizeTag(value))}`
/** URL identity is deliberately conservative; queries and fragments are retained. */
export const citationId = (url: string) => `citation:${sha256(url)}`
export const edgeId = (source: string, predicate: string, target: string) => `edge:${sha256(canonical([source, predicate, target]))}`

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
