/**
 * Pure helpers behind `scripts/plugin-fetch.mjs` (same split as
 * `scaffold.ts` vs `scripts/plugin-scaffold.mjs`: the script owns the network,
 * the filesystem and the console; everything decidable without them lives
 * here so it is unit-testable, and the tests need no network).
 *
 * What the fetch step deliberately does NOT do: register anything. It clones
 * into `plugins/third-party/<repo-name>/` and stops. A plugin can ship a demo
 * component that runs arbitrary JS in a visitor's browser, so the roster edit
 * — the single place a plugin enters the build — stays a human action taken
 * after reading `reviewChecklist()`.
 */

/** Where fetched plugins land, repo-relative. */
export const THIRD_PARTY_DIR = 'lib/lab/llm-benchmark/plugins/third-party'

/**
 * Directory names we will create. Deliberately stricter than "whatever git
 * would name it": the value is joined onto a path, so `.`, `..` and anything
 * with a separator are refused rather than sanitized.
 */
const DIR_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * `https://github.com/acme/bench-plugin.git` → `bench-plugin`.
 * Also handles scp-style (`git@host:acme/bench-plugin.git`), trailing
 * slashes, and a bare local path. Returns `null` when no usable name exists.
 */
export function repoDirName(url: string): string | null {
  const trimmed = (url ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) return null
  // scp-style has no scheme; split on both separators and take the last segment.
  const segment = trimmed.split(/[/:]/).pop() ?? ''
  const name = segment.replace(/\.git$/i, '')
  if (!DIR_NAME_PATTERN.test(name)) return null
  if (name === '.' || name === '..') return null
  return name
}

/**
 * The reason this fetch must not proceed, or `null`.
 *
 * Refusing an existing directory is not politeness — re-cloning over a
 * reviewed, committed third-party plugin would silently swap the code the
 * review approved for whatever the remote holds today.
 */
export function fetchTargetProblem(url: string, existingDirs: readonly string[] = []): string | null {
  if (!url || !url.trim()) return 'a git URL is required'
  const name = repoDirName(url)
  if (!name) {
    return `cannot derive a directory name from '${url}' — expected a git URL ending in a repository name`
  }
  if (existingDirs.includes(name)) {
    return `${THIRD_PARTY_DIR}/${name}/ already exists — review or remove it rather than re-cloning over it`
  }
  return null
}

/**
 * The review checklist printed after a successful clone. Everything here is a
 * human step; the script performs none of them.
 */
export function reviewChecklist(name: string): string[] {
  const dir = `${THIRD_PARTY_DIR}/${name}`
  return [
    `Validate it: task bench:plugin-validate -- ${dir} — every rule registration enforces, plus the manifest rules, reported at once.`,
    `Read ${dir}/demo.tsx (and any component it imports). A demo runs arbitrary JS in a visitor's browser; this is the contribution that needs eyes, not the task text.`,
    `Read ${dir}/checks.ts for the client-bundle rule: checks must \`import type { CheckFn }\`, never a runtime import of scorers/sandbox.ts, and generators must be lazy \`() => import(...)\` factories.`,
    `Compare the capability table from validate against the actual diff. Under-declaration is rejected at registration; over-declaration only over-warns you.`,
    `Add the roster lines to lib/lab/llm-benchmark/plugins/index.ts BY HAND. Untrusted demo? registerPlugin(thePlugin, { deny: ['demos'] }) — its tasks and checks mount, its demo does not.`,
    `Commit the plugin source. It is NOT gitignored: the site builds from it, so unreviewed-but-present code would be a worse failure than a fat diff. Put the origin URL and cloned commit in the commit message.`,
    `task verify && task build.`,
  ]
}
