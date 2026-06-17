import type { Circuit } from './types'
import { serializeCircuit, deserializeCircuit } from './yaml'

/**
 * Circuit persistence + sharing.
 * - encode/decode: URL-safe base64 of the YAML, for shareable links.
 * - saved circuits: a small localStorage-backed library (SSR-guarded).
 *
 * The list/upsert/remove helpers are pure so they can be unit-tested without a
 * DOM; the localStorage wrappers compose them.
 */

const STORAGE_KEY = 'circuit-sim:saved'

export interface SavedCircuit {
  name: string
  yaml: string
  savedAt: number
}

// ── Share-link codec ────────────────────────────────────────────────

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeCircuit(circuit: Circuit): string {
  return toB64Url(serializeCircuit(circuit))
}

export function decodeCircuit(encoded: string): Circuit | null {
  try {
    const yaml = fromB64Url(encoded)
    const c = deserializeCircuit(yaml)
    return c.components.length > 0 ? c : null
  } catch {
    return null
  }
}

/** Decode a share param back to YAML (for the editor's importYaml). Null if invalid. */
export function decodeShareYaml(encoded: string): string | null {
  try {
    const yaml = fromB64Url(encoded)
    const c = deserializeCircuit(yaml)
    return c.components.length > 0 ? yaml : null
  } catch {
    return null
  }
}

// ── Pure library helpers ────────────────────────────────────────────

export function upsertSaved(list: SavedCircuit[], name: string, yaml: string, savedAt: number): SavedCircuit[] {
  const trimmed = name.trim()
  if (!trimmed) return list
  const without = list.filter(s => s.name !== trimmed)
  return [{ name: trimmed, yaml, savedAt }, ...without]
}

export function removeSaved(list: SavedCircuit[], name: string): SavedCircuit[] {
  return list.filter(s => s.name !== name)
}

// ── localStorage wrappers (SSR-safe) ────────────────────────────────

function read(): SavedCircuit[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSaved) : []
  } catch {
    return []
  }
}

function write(list: SavedCircuit[]): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* quota / disabled */ }
}

function isSaved(x: unknown): x is SavedCircuit {
  return !!x && typeof x === 'object' && typeof (x as SavedCircuit).name === 'string' && typeof (x as SavedCircuit).yaml === 'string'
}

export function listSaved(): SavedCircuit[] {
  return read()
}

export function saveCircuit(name: string, yaml: string, now: number): SavedCircuit[] {
  const next = upsertSaved(read(), name, yaml, now)
  write(next)
  return next
}

export function deleteSaved(name: string): SavedCircuit[] {
  const next = removeSaved(read(), name)
  write(next)
  return next
}
