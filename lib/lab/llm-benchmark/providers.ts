/**
 * The provider names the harness itself knows how to generate with.
 *
 * These are exactly the cases of `runners/provider.ts:configForModel`. The
 * list lives in its own leaf module (no imports, no side effects) because two
 * layers need it and neither may import the other:
 *
 *   - `runners/provider.ts` uses it to explain an unsupported provider.
 *   - `plugins/registry.ts` uses it to REJECT a plugin generator that would
 *     shadow a built-in provider — and `plugins/registry.ts` is reachable from
 *     the client bundle, so it must never import `runners/` (Playwright,
 *     node:child_process, API keys) to find out.
 *
 * `provider.test.ts` asserts every name here actually resolves in
 * `configForModel`, so the list cannot drift from the switch it mirrors.
 */
export const BUILTIN_PROVIDERS: readonly string[] = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Moonshot AI',
  'OpenRouter',
  'Agy',
  'Codex',
  'OpenCode',
]

/** True when the harness has a built-in generator for this provider name. */
export function isBuiltinProvider(provider: string): boolean {
  return BUILTIN_PROVIDERS.includes(provider)
}
