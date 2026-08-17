/**
 * Credential hygiene for anything the harness SPAWNS.
 *
 * Two consumers, one implementation:
 *  - `runners/cli.ts` — the model CLIs, whose stdout is published verbatim;
 *  - `scorers/code-runtime.ts` — the model's own PROGRAM, executed to score it.
 *
 * It lives at the lib layer (not inside `runners/`) precisely so the scorers
 * layer can use it: `scorers/**` must never import `runners/**`
 * (`layering.test.ts` enforces the direction), and a second copy of a
 * security-relevant regex is exactly the kind of thing that drifts.
 */

/** Anything whose NAME looks like a credential is not handed to a child. */
const CREDENTIAL_KEY = /(key|secret|token|password|auth|credential|private)/i

/**
 * Strip credential-shaped variables out of an environment block.
 *
 * WHY: the CLI child we spawn IS the model, and its output is published
 * publicly on the benchmark site. A model that dumps `env` — degenerate
 * free-tier behaviour we have already seen in other forms (prompt echoing,
 * empty bodies) — would put every key in the repo environment
 * (OPENROUTER_API_KEY, ANTHROPIC_API_KEY, Cloudflare/GitHub tokens, …) into a
 * public HTML page. The model CLIs authenticate from their own local
 * credential stores (opencode `~/.config/opencode` + keychain, agy `~/.gemini`,
 * codex `~/.codex`), so they need none of it.
 *
 * Deliberately broad: SSH_AUTH_SOCK, GITHUB_TOKEN and friends go too. Nothing
 * a child actually needs (PATH, HOME, TMPDIR, SHELL, TERM, LANG/LC_*, USER)
 * matches the pattern, so there is no allowlist to keep in sync.
 *
 * CONTRACT: this is applied to the INHERITED env only. A provider's explicit
 * `env` override is merged AFTER the scrub, so a runner that genuinely needs a
 * credential can re-add it by name — opt-in, never ambient.
 */
export function scrubEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const scrubbed: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(env)) {
    if (CREDENTIAL_KEY.test(key)) continue
    scrubbed[key] = value
  }
  return scrubbed
}
