/**
 * Value-based redaction for text the harness LOGS or PERSISTS.
 *
 * `scrubEnv` in `runners/cli.ts` is the NAME-based half of credential hygiene:
 * it stops a secret reaching the model child in the first place. This module is
 * the VALUE-based half — it stops a secret that is already inside a string from
 * reaching a durable surface. Three of those exist:
 *
 *   1. command lines — `runCli`'s timeout/exit errors embed the full argv and
 *      the child's stderr; those messages flow onward into results.json
 *      `output` and the run log's `failure` event, so redacting at the source
 *      covers all three transitively;
 *   2. run-log storage — every event string (raw output, cleaned artifact,
 *      error text, the aggregate result), redacted BEFORE spilling so the
 *      content-addressed `spill/` files are redacted too;
 *   3. config snapshots — the run-log header and the `--dump-config` output.
 *
 * Ported from paperclip `packages/adapter-utils/src/command-redaction.ts`
 * (`SECRET_NAME_PATTERN` + bearer/assignment/flag regexes), with three
 * deliberate divergences, all of them tuned for the fact that the strings we
 * run this over are mostly MODEL-AUTHORED HTML:
 *
 *   - **No high-entropy-literal rules.** Paperclip also nukes bare `sk-…`,
 *     `ghp_…` and anything JWT-shaped. We do not: a benchmark artifact is full
 *     of hashes, base64 data URIs and dotted identifiers, and a false positive
 *     there silently corrupts the artifact we are supposed to be scoring.
 *     Redaction here is NAME-ADJACENT ONLY — a value is redacted because
 *     something next to it is called a credential, never because of how it
 *     looks. Explicit non-goal; a credential that appears with no name beside
 *     it survives.
 *   - **No bare `key` in the name set.** Paperclip wraps its names in
 *     `[A-Za-z0-9_-]*` on both sides, which would mangle `data-key="physics"`,
 *     `@keyframes` and `keydown` in artifact HTML. Only compound forms
 *     (`api_key`, `private_key`) are names here, a vendor PREFIX needs no
 *     wildcard (the match simply starts later — `MOONSHOT_API_KEY` matches at
 *     `API_KEY` and the prefix is left untouched), and every name must END at a
 *     `[A-Za-z0-9_-]` boundary so `--max-tokens` and `"tokensIn"` are safe.
 *   - **No unbounded `*` prefix at all**, which also removes the quadratic
 *     backtracking risk of scanning a 100KB artifact containing one 50KB
 *     word-character run (a base64 data URI).
 *
 * ACCEPTED COLLATERAL (small, and documented rather than hidden): a bare
 * `Authorization`/`token`/`secret`/`password`/`cookie` immediately followed by
 * `:` or `=` is redacted wherever it appears, so `document.cookie = "a=1"` in
 * model JS, or a YAML key literally called `secret:`, would be rewritten in the
 * FORENSIC copy. `--token: #333` (a CSS custom property, which is the likely
 * artifact shape) is explicitly excluded via a `(?<!--)` guard; the colon form
 * of a CLI flag does not exist, and `--token=…` / `--token …` are still caught
 * by the flag rule.
 *
 * Pure and dependency-free by design (bottom of the layering DAG, see
 * `layering.test.ts`): it is imported by runners, by the run log, and by the
 * sweep script.
 */

/** The replacement every rule writes. */
export const REDACTED = '***REDACTED***'

/**
 * Names that make the value next to them a credential.
 *
 * Source: paperclip's `SECRET_NAME_PATTERN`, minus the surrounding
 * `[A-Za-z0-9_-]*` wildcards and minus a bare `key` (see the module comment).
 * Exported both as documentation and as the cheap short-circuit probe.
 */
const SECRET_NAME_SOURCE = String.raw`(?:api[_-]?key|authorization|bearer|token|secret|passwd|password|credential|jwt|private[_-]?key|cookie|connection[_-]?string)`

/** Non-global (so `.test()` is not stateful) form of the name set. */
export const SECRET_NAME_PATTERN = new RegExp(SECRET_NAME_SOURCE, 'i')

/**
 * `Authorization: <value>` / `Authorization = <value>`, quoted or not: keep the
 * header name AND the auth scheme, drop everything after it to the end of the
 * line (or the closing quote/comma/angle bracket). To-EOL rather than
 * to-whitespace because a log line's header value is the whole tail;
 * over-redacting a log line is the safe direction.
 */
const AUTH_HEADER_RE = new RegExp(
  String.raw`(\bauthorization["']?\s*[:=]\s*["']?)((?:bearer|basic|digest|token)\s+)?[^"',<>\r\n]*`,
  'gi'
)

/**
 * A `Bearer <token>` with no `Authorization:` in front of it. The value must
 * look like a token (>= 8 chars from the base64url/JWT alphabet) so English
 * prose — "the bearer of bad news" — is left alone. `*` is deliberately NOT in
 * that alphabet, which is what makes this rule idempotent.
 */
const BEARER_RE = /(\bbearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi

/**
 * `NAME=value`, `NAME: value`, `"NAME": "value"`. The value runs to the first
 * whitespace/quote/comma/semicolon/angle-bracket/EOL, and surrounding quotes
 * are preserved because the opening quote is captured into the prefix and the
 * closing one is never consumed.
 *
 * `(?<!--)` skips CSS custom properties (`--token: #333`); the negative
 * lookahead — which sits AFTER the optional opening quote, so it inspects the
 * value itself in both the bare and the JSON form — skips an auth SCHEME, so a
 * header already rewritten to
 * `Authorization: Bearer ***REDACTED***` is not re-mangled into
 * `Authorization: ***REDACTED*** ***REDACTED***`.
 *
 * `<` and `>` terminate the value (paperclip's class does not exclude them)
 * because the strings we run this over are HTML: without it,
 * `<p>API_KEY=abc</p>` would swallow the closing tag and every byte after it up
 * to the next space, silently eating the rest of an artifact.
 */
const ASSIGNMENT_RE = new RegExp(
  String.raw`(?<!--)(${SECRET_NAME_SOURCE})(?![A-Za-z0-9_-])(["']?\s*[:=]\s*)(["']?)(?!(?:bearer|basic|digest)\b)[^\s"',;<>\r\n]+`,
  'gi'
)

/**
 * `--api-key value` / `--api-key=value` inside a flattened command line. The
 * flag name may carry a prefix (`--openai-api-key`) but must END at a secret
 * word, so `--max-tokens` is untouched.
 */
const CLI_FLAG_RE = new RegExp(
  String.raw`(--?[A-Za-z0-9_-]*?${SECRET_NAME_SOURCE}(?![A-Za-z0-9_-])(?:\s+|=)(["']?))[^\s"'<>` +
    '`' +
    String.raw`]+`,
  'gi'
)

/** A flag NAME (dashes already stripped) that ends at a secret word. */
const SECRET_FLAG_NAME_RE = new RegExp(String.raw`^[A-Za-z0-9_-]*?${SECRET_NAME_SOURCE}$`, 'i')

/**
 * Redact credential values out of arbitrary text.
 *
 * Four compiled regex passes, each linear in the input, behind a single
 * `SECRET_NAME_PATTERN` probe: the overwhelming majority of strings we run this
 * over are model-authored artifacts that mention no credential name at all, and
 * those return the ORIGINAL string reference after one scan instead of four.
 * (The probe is not a heuristic — every rule below is gated on the same name
 * set, so a string it rejects provably cannot match any of them, with one
 * exception that is itself gated: `BEARER_RE` needs the word "bearer", which is
 * in the probe.) No per-character work anywhere; a 100KB artifact costs a
 * handful of linear scans.
 */
export function redactText(text: string): string {
  if (!SECRET_NAME_PATTERN.test(text)) return text
  return text
    .replace(AUTH_HEADER_RE, (_m, prefix: string, scheme: string | undefined) =>
      scheme ? `${prefix}${scheme}${REDACTED}` : `${prefix}${REDACTED}`
    )
    .replace(BEARER_RE, `$1${REDACTED}`)
    .replace(ASSIGNMENT_RE, `$1$2$3${REDACTED}`)
    .replace(CLI_FLAG_RE, `$1${REDACTED}`)
}

/**
 * Flag-aware redaction over an argv ARRAY, where the value of `--api-key` is a
 * separate element and cannot be found by a text regex.
 *
 * Non-flag elements (crucially the PROMPT, which is one giant argv entry) go
 * through `redactText`, so the task text survives byte-for-byte unless it
 * itself contains a credential assignment.
 */
export function redactArgs(args: string[]): string[] {
  const out: string[] = []
  let redactNext = false
  for (const arg of args) {
    if (redactNext) {
      redactNext = false
      out.push(REDACTED)
      continue
    }
    const flag = /^(--?)([A-Za-z0-9_-]+)(=)?/.exec(arg)
    if (flag && SECRET_FLAG_NAME_RE.test(flag[2])) {
      if (flag[3]) {
        // --name=value: keep everything up to and including the '='.
        out.push(`${arg.slice(0, flag[0].length)}${REDACTED}`)
      } else if (arg.length === flag[0].length) {
        // Bare --name: the NEXT element is the value.
        out.push(arg)
        redactNext = true
      } else {
        out.push(redactText(arg))
      }
      continue
    }
    out.push(redactText(arg))
  }
  return out
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Apply `redactText` to every string anywhere in `value` (paperclip's
 * `redactHomePathUserSegmentsInValue` shape). Deterministic, so the run log's
 * content-addressed spill store still dedupes across events.
 */
export function redactValue<T>(value: T): T {
  if (typeof value === 'string') return redactText(value) as T
  if (Array.isArray(value)) return value.map((item) => redactValue(item)) as T
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) out[key] = redactValue(item)
  return out as T
}
