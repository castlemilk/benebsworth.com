/**
 * Content addressing — the ONE definition of "what is this blob called?".
 *
 * Two stores in this harness are content-addressed, and they must agree on the
 * naming or nothing can be cross-checked:
 *
 *  - the run log's spill store (`runlog.ts` `writeSpill`) — `spill/<addr>.txt`,
 *    which is where the artifact that was actually SCORED lives, and what
 *    `publish-traces.mjs` serves;
 *  - the retained CLI artifact copies (`runners/cli.ts` `retainArtifact`) —
 *    `artifacts/<addr>.html`, plus an `index.json` that keeps the
 *    human-readable `artifact-<model>-<task>-<n>` name recoverable.
 *
 * Because the NAME is derived from the BYTES, "does this file still hold what
 * was scored?" is a re-hash and a string compare — no second copy, no manifest
 * to drift (`verify-results.ts`'s `artifact-integrity` check). That property is
 * the entire reason this module exists as a shared leaf rather than as a
 * private helper in each store: two `sha256(...).slice(0, 16)` expressions in
 * two files are one refactor away from disagreeing, and the day they disagree
 * every stored file is orphaned with no error.
 *
 * Node-only (`node:crypto`), like `prompt-bundle.ts`. Deliberately NOT imported
 * by `runlog-format.ts`, which must stay browser-safe.
 */
import { createHash } from 'node:crypto'

/**
 * How many hex characters of the digest name a blob.
 *
 * 16 hex = 64 bits. Not a security boundary (nothing here defends against a
 * chosen-prefix attacker); it is a collision budget for a store that holds
 * thousands of artifacts, where 64 bits is ~2^32 blobs before a birthday
 * collision is likely. Kept at the value the spill store shipped with, so no
 * existing file is orphaned.
 */
export const CONTENT_ADDRESS_CHARS = 16

/** Full SHA-256 hex digest. Used whole for `hashPrompt`. */
export function sha256Hex(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

/** The address a blob is stored under: the digest's first 16 hex chars. */
export function contentAddress(content: string | Buffer): string {
  return sha256Hex(content).slice(0, CONTENT_ADDRESS_CHARS)
}

/** `<addr><ext>` — e.g. `contentAddressedName(html, '.html')`. */
export function contentAddressedName(content: string | Buffer, ext: string): string {
  return `${contentAddress(content)}${ext}`
}

const ADDRESSED_NAME = new RegExp(`^([0-9a-f]{${CONTENT_ADDRESS_CHARS}})\\.[a-z0-9]+$`)

/**
 * The address a path CLAIMS, or `undefined` when the name is not one of ours.
 *
 * Accepts a bare basename or a ref with directories (`spill/<addr>.txt`, the
 * form the run log stores). Returning `undefined` rather than throwing is what
 * lets the integrity check SKIP legacy run-scoped names
 * (`artifact-<model>-<task>-<n>.html`) still sitting in old sweep trees instead
 * of failing on files that never promised anything.
 */
export function parseContentAddress(refOrName: string): string | undefined {
  const base = refOrName.slice(refOrName.lastIndexOf('/') + 1)
  return ADDRESSED_NAME.exec(base)?.[1]
}

/** The outcome of re-hashing a stored blob against the name it lives under. */
export interface ContentAddressCheck {
  ok: boolean
  /** The address the filename claims. */
  expected: string
  /** The address the bytes actually hash to. */
  actual: string
}

/**
 * Re-derive a stored blob's address from its bytes and compare it to its name.
 *
 * `undefined` when the name carries no address to check (see
 * `parseContentAddress`).
 */
export function verifyContentAddress(
  refOrName: string,
  content: string | Buffer
): ContentAddressCheck | undefined {
  const expected = parseContentAddress(refOrName)
  if (expected === undefined) return undefined
  const actual = contentAddress(content)
  return { ok: actual === expected, expected, actual }
}
