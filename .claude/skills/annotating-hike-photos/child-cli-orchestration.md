# Orchestrating an agentic child CLI for image classification

The reusable pattern `tools/hike-annotate` uses to drive **`agy`** (the Antigravity
CLI, Gemini vision) as a headless image classifier from Node — and when to wrap it as
an MCP. Generalises to any agentic CLI you want to use as a structured-output worker.

## The `agy` invocation
```bash
agy --add-dir <imageDir> --dangerously-skip-permissions -p '<prompt>'
```
- `-p` / `--print` — headless one-shot (prints the response; no interactive session).
- `--add-dir <dir>` — give agy file access to the dir holding the image, then reference
  the image by absolute path in the prompt ("Look at the image file /tmp/.../x.webp").
- `--dangerously-skip-permissions` — don't block on tool-permission prompts.
- `--model` optional; default is the account's model (Gemini 3.x Pro under AI Pro).

## CRITICAL gotcha — close stdin
`agy` (like many agentic CLIs) **blocks on an open stdin pipe**. Node's `execFile`
leaves stdin open, so the call hangs until timeout. Use `spawn` with stdin ignored:
```js
import { spawn } from 'node:child_process'
const child = spawn('agy', args, { stdio: ['ignore', 'pipe', 'pipe'] }) // 'ignore' = closed stdin
```
(From a shell, `printf '' | agy …` has the same effect — closing stdin is what matters.)

## Strict-JSON contract
Agentic CLIs may wrap output in prose or code fences. So:
- Prompt: *"Return ONLY a JSON object — no prose, no markdown fence — with EXACTLY these keys: …"*.
- Parse defensively: strip ```` ``` ```` fences, then scan for the first **balanced**
  `{…}` (track brace depth — a naive `indexOf('{')`…`lastIndexOf('}')` breaks on nested
  objects) and `JSON.parse` it.
- One retry with "Return ONLY the JSON object" appended; then mark `needsManual` and
  continue the batch rather than aborting.
- Validate/clamp every field — enum the `sceneType`, ensure the returned `waypoint` is a
  real waypoint name, clamp 0–10 scores. Never trust the model's shape.

## Throughput
~15–20 s per image. Run a small concurrency pool (≈5 concurrent `spawn`s) — each call
is a separate process. Classify the small `*-thumb.webp` (≈40 KB), not the full image.
Covered by AI Pro (no per-call billing), but mind rate limits; expose `--concurrency`
and `--limit N` for trial runs.

## Feed geo + context into the prompt
The geo half is deterministic (haversine to geocoded waypoints) and is a strong prior.
Pass the geo-nearest candidates + the full ordered route into the prompt so the model
picks among *plausible* waypoints and can override a noisy GPS by scene (e.g. it sees
the Matterhorn ⇒ Zermatt). Tell it not to invent place names it cannot actually see.

## Reading repo TypeScript data from a plain Node tool
The waypoints live in `content/hiking.ts` (TypeScript). A standalone `.mjs` tool reads
it with `node --experimental-strip-types` — its only import is type-only (`import type`),
which strips cleanly, so no path-alias resolution is needed. Spawn a child:
`node --experimental-strip-types --input-type=module -e "import {getHike} from 'file://…/content/hiking.ts'; …"`.

## CLI vs MCP
- **CLI** (`bin/annotate.mjs`) — for running the batch + the review-then-write flow
  directly; it caches the proposal so `--apply` writes exactly what was reviewed.
- **MCP** (`mcp/server.mjs`) — wrap the same core so Claude can drive it across a
  session: `propose_annotations` → inspect the report path → `write_manifest({confirm:true})`.
  Statefulness between calls comes from the shared proposal cache
  (`.cache/proposals/<slug>/`). Register the server's absolute path in a **local,
  untracked** `.mcp.json` (machine-specific paths shouldn't be committed); it loads on
  the next Claude reconnect.

## Auth separation (keep the two explicit)
- **Model**: `agy` has its own login (Antigravity / Google AI Pro). The dead path is the
  free `gemini` CLI Code-Assist login (`IneligibleTierError`).
- **Storage write**: pinned gcloud — `CLOUDSDK_CORE_ACCOUNT=ben.ebsworth@gmail.com gsutil
  -h "Cache-Control:no-store" cp … gs://benebsworth-hiking/manifest/hike/<slug>.json`.
  Never rely on the ambient gcloud active account.

## Review-then-write is non-negotiable
Writing the gallery manifest is a live production write. The pipeline always produces a
**proposal + a visual report** first; the actual GCS write is a separate, confirm-gated
step (CLI `--apply`/`--write` with a `yes` prompt; MCP `write_manifest` requires
`confirm:true` and refuses a partial proposal). It backs up the current manifest locally
before overwriting.
