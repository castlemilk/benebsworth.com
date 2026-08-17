import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scrubEnv } from '../env-scrub'

/**
 * code-runtime: pull the model's PROGRAM out of an artifact and run it, bounded.
 *
 * The structural scorers read the text; this one executes it. That is the
 * whole point of #15 — a `crypto-hash-race` answer that reads like a textbook
 * and raises `NameError` on the first call is not a 92, and only running it
 * can tell you so.
 *
 * ── ISOLATION, HONESTLY ────────────────────────────────────────────────────
 *
 * The artifact is UNTRUSTED model output. What this module actually provides:
 *
 *  - **A separate process, always.** Never a worker thread: workers share the
 *    harness process's fs and network handles, so "isolation" there would mean
 *    isolation from the event loop, not from the machine.
 *  - **A hard wall-clock budget** (default 5s; a probe may raise it) enforced
 *    by SIGTERM to the child's own process group, escalated to SIGKILL.
 *  - **An output cap**; a program that floods stdout is killed, not buffered
 *    until the harness dies.
 *  - **No inherited environment.** The child gets `MINIMAL_ENV_KEYS` only —
 *    an ALLOWLIST, not a denylist — and that allowlist is still run through
 *    `scrubEnv` so a future addition cannot quietly re-introduce a credential.
 *  - **A throwaway cwd** (`mkdtemp`), removed afterwards.
 *  - **For JavaScript only: a real permission boundary.** Node 22's
 *    `--experimental-permission` denies filesystem writes, child processes and
 *    worker threads unless explicitly granted; we grant read of the scratch
 *    dir and nothing else. (It does NOT cover the network — Node's permission
 *    model has no net flag.)
 *  - **For Python: NO comparable boundary exists.** CPython has no permission
 *    model, so the driver best-effort disables `socket` before the model's code
 *    runs, and that is the extent of it. A determined program could still touch
 *    the filesystem.
 *
 * So this is a BUDGET and a BLAST-RADIUS REDUCER, not a security sandbox. That
 * is acceptable at this trust level and it is worth being precise about why:
 * the harness ALREADY executes these same artifacts locally in headless
 * Chromium (`scorers/sandbox.ts`, launched with `--no-sandbox`) during
 * behavioural scoring, and readers execute them in their own browsers on the
 * published task pages. Executing the code is not a new exposure; running it
 * unbounded would be.
 */

export type CodeLanguage = 'python' | 'javascript'

/** Where in the artifact the program was found — reported, never guessed. */
export type ProgramOrigin = 'fenced-block' | 'script-tag' | 'pre-code' | 'bare'

export interface ExtractedProgram {
  language: CodeLanguage
  source: string
  origin: ProgramOrigin
}

/**
 * Why an executed score could not be produced. `wrong-output` is deliberately
 * NOT here: that is a program that ran fine and answered wrong, which is a
 * failed CHECK, not a failed execution.
 */
export type CodeFailureKind =
  | 'extraction-failed'
  | 'runtime-error'
  | 'timeout'
  | 'output-limit'
  | 'runtime-unavailable'

export type ExtractionResult =
  | { ok: true; program: ExtractedProgram }
  | { ok: false; reason: 'extraction-failed'; detail: string }

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
  truncated: boolean
  durationMs: number
  /** Absent iff the program ran to completion with exit code 0. */
  failure?: CodeFailureKind
}

export interface InterpreterSpec {
  command: string
  /** Args BEFORE the script path. */
  args: string[]
}

export interface RunProgramOptions {
  /** Hard wall-clock cap. */
  timeoutMs?: number
  /** Cap on captured stdout+stderr; exceeding it kills the child. */
  maxOutputBytes?: number
  /** Extra files to drop beside the program in the scratch dir. */
  files?: Record<string, string>
  /** Override the interpreter (tests; and the `runtime-unavailable` path). */
  interpreter?: InterpreterSpec
}

// ---------------------------------------------------------------------------
// extraction
// ---------------------------------------------------------------------------

const FENCE = /```[ \t]*([A-Za-z0-9+#._-]*)[ \t]*\r?\n([\s\S]*?)```/g
const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
const PRE_CODE = /<pre\b[^>]*>\s*(?:<code\b[^>]*>)?([\s\S]*?)(?:<\/code\s*>)?\s*<\/pre\s*>/gi

const HTML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

/** Decode the entity set a model's `<pre><code>` block actually contains.
 *  `&amp;` LAST, so `&amp;lt;` does not become `<`. */
function decodeEntities(text: string): string {
  let out = text
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    out = out.split(entity).join(char)
  }
  return out.split('&amp;').join('&')
}

/** Drop syntax-highlighting markup, keeping `<br>` as the line break it is. */
function stripTags(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[a-zA-Z][^>]*>/g, '')
}

/** Language names models actually write on a fence. */
const FENCE_LANGUAGES: Record<string, CodeLanguage> = {
  py: 'python',
  python: 'python',
  python3: 'python',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  mjs: 'javascript',
  node: 'javascript',
  ts: 'javascript',
  typescript: 'javascript',
}

const PYTHON_SIGNALS = [
  /^\s*(?:import|from)\s+[\w.]+/m,
  /^\s*def\s+\w+\s*\(/m,
  /^\s*class\s+\w+\s*[(:]/m,
  /\bprint\s*\(/,
  /:\s*$/m,
]

const JS_SIGNALS = [
  /^\s*(?:const|let|var)\s+\w+\s*=/m,
  /\bfunction\s+\w*\s*\(/,
  /=>/,
  /\bconsole\.(?:log|error)\s*\(/,
  /^\s*(?:import|export)\s+.*\bfrom\s+['"]/m,
]

/** Signal count for a language — the tiebreak when a fence carries no tag. */
function languageAffinity(source: string, language: CodeLanguage): number {
  const signals = language === 'python' ? PYTHON_SIGNALS : JS_SIGNALS
  let hits = 0
  for (const signal of signals) if (signal.test(source)) hits += 1
  // Cheap disambiguators for the pairs that overlap (`print(` exists in
  // neither JS nor Python exclusively once a model writes helper prose).
  if (language === 'python' && /[;{}]\s*$/m.test(source) && /\bconsole\.log\b/.test(source)) hits -= 2
  if (language === 'javascript' && /^\s*def\s+\w+\s*\(/m.test(source)) hits -= 2
  return hits
}

interface Candidate {
  source: string
  origin: ProgramOrigin
  /** Language the artifact DECLARED (fence tag / script type), if any. */
  declared?: CodeLanguage
}

function collectCandidates(artifact: string): Candidate[] {
  const candidates: Candidate[] = []

  for (const match of artifact.matchAll(FENCE)) {
    const declared = FENCE_LANGUAGES[(match[1] ?? '').toLowerCase()]
    const source = match[2]
    if (source.trim()) candidates.push({ source, origin: 'fenced-block', declared })
  }

  for (const match of artifact.matchAll(SCRIPT_TAG)) {
    const attrs = match[1] ?? ''
    const source = match[2]
    if (!source.trim()) continue
    if (/\bsrc\s*=/.test(attrs)) continue
    const type = /type\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase()
    let declared: CodeLanguage | undefined
    if (type === undefined || /javascript|module|text\/babel/.test(type)) declared = 'javascript'
    else if (/python/.test(type)) declared = 'python'
    // Everything else (notably `type="text/plain"`, which is how the codex
    // models smuggle a Python module into an HTML artifact) declares NOTHING
    // and is judged on affinity. Skipping unknown types cost three real
    // artifacts their executed score.
    candidates.push({ source: decodeEntities(source), origin: 'script-tag', declared })
  }

  for (const match of artifact.matchAll(PRE_CODE)) {
    // Tags FIRST, entities second: a highlighted block is
    // `<span class="kw">def</span> f(<span class="op">a</span>)`, and the code's
    // own `<`/`>` are entities at this point, so stripping tags cannot eat
    // them. (Claude's crypto artifact hand-highlights every token; without
    // this it "fails to import" on line 1 — a harness bug that would have
    // read as a model failure.)
    const source = decodeEntities(stripTags(match[1]))
    if (source.trim()) candidates.push({ source, origin: 'pre-code' })
  }

  // The whole artifact, but only when it is not markup — a bare program is how
  // every API-provider text record in this benchmark actually looks.
  if (!/^\s*(?:<!doctype|<html\b)/i.test(artifact) && artifact.trim()) {
    candidates.push({ source: artifact, origin: 'bare' })
  }

  return candidates
}

/**
 * Pull the model's program out of an artifact.
 *
 * `prefer` is a REQUIREMENT, not a hint: a probe that needs Python cannot
 * score a JavaScript answer, and silently running the wrong thing would
 * produce a confident wrong verdict. A candidate is accepted only if it
 * declares the wanted language or reads like it.
 */
export function extractProgram(
  artifact: string,
  options: { prefer: CodeLanguage }
): ExtractionResult {
  const accepted = rankCandidates(artifact ?? '', options.prefer)
  if (accepted.programs.length === 0) {
    return {
      ok: false,
      reason: 'extraction-failed',
      detail: `no ${options.prefer} program found in the artifact (${accepted.inspected} candidate block(s) inspected)`,
    }
  }
  return { ok: true, program: accepted.programs[0] }
}

/**
 * EVERY acceptable program in the artifact, best first.
 *
 * Models routinely split the answer across sibling blocks — the codex family
 * ships `<script type="text/plain" id="module-source">` and a second
 * `id="tests-source">` that does `import secure_passwords`. Scoring only the
 * first block would mark "include unit tests" not-found on an artifact that
 * plainly includes them, so a probe can take the siblings too (see the
 * crypto driver's extra-source handling).
 *
 * SAME-ORIGIN ONLY beyond the first: the `bare` candidate is the WHOLE
 * artifact, so mixing it with a fenced block would re-execute prose.
 */
export function extractPrograms(
  artifact: string,
  options: { prefer: CodeLanguage }
): ExtractedProgram[] {
  const { programs } = rankCandidates(artifact ?? '', options.prefer)
  if (programs.length === 0) return []
  const origin = programs[0].origin
  if (origin === 'bare') return [programs[0]]
  return programs.filter((p) => p.origin === origin)
}

function rankCandidates(
  artifact: string,
  want: CodeLanguage
): { programs: ExtractedProgram[]; inspected: number } {
  const candidates = collectCandidates(artifact)
  const scored: Array<{ rank: number; program: ExtractedProgram }> = []
  for (const candidate of candidates) {
    if (candidate.declared !== undefined && candidate.declared !== want) continue
    const affinity = languageAffinity(candidate.source, want)
    const declaredBonus = candidate.declared === want ? 3 : 0
    // A fenced/script/pre block that declares nothing still has to LOOK like
    // the language; the bare whole-artifact candidate has to look like it hard
    // enough that prose can't sneak through.
    const floor = candidate.origin === 'bare' ? 2 : 1
    if (affinity < floor) continue
    scored.push({
      rank: affinity + declaredBonus,
      program: {
        language: want,
        source: dedent(candidate.source).replace(/^\s*\n/, '').trimEnd(),
        origin: candidate.origin,
      },
    })
  }
  // Stable by rank, then by size — the module is normally the biggest block.
  scored.sort((a, b) => b.rank - a.rank || b.program.source.length - a.program.source.length)
  return { programs: scored.map((s) => s.program), inspected: candidates.length }
}

/** Strip the common leading indentation an HTML `<pre>` block often carries. */
function dedent(source: string): string {
  const lines = source.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return source
  let common = Infinity
  for (const line of lines) {
    const indent = /^[ \t]*/.exec(line)![0].length
    if (indent < common) common = indent
  }
  if (!Number.isFinite(common) || common === 0) return source
  return source
    .split('\n')
    .map((line) => line.slice(common))
    .join('\n')
}

// ---------------------------------------------------------------------------
// execution
// ---------------------------------------------------------------------------

/**
 * The complete environment a scored program may see. An ALLOWLIST: `PATH` so
 * the interpreter can find its own shims, `HOME`/`TMPDIR` repointed at the
 * scratch dir, locale so text output is stable. Nothing else — not the repo's
 * `.env`, not the shell's exports.
 *
 * NOT exhaustive of what the child OBSERVES: macOS CoreFoundation injects
 * `__CF_USER_TEXT_ENCODING` into every spawn below this layer. The allowlist is
 * what the harness HANDS OVER, which is the property that matters.
 */
export const MINIMAL_ENV_KEYS = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'SystemRoot'] as const

function minimalEnv(scratchDir: string): Record<string, string> {
  const base: Record<string, string | undefined> = {
    PATH: process.env.PATH,
    HOME: scratchDir,
    TMPDIR: scratchDir,
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    // Windows spawn needs it; absent (and so omitted) elsewhere.
    SystemRoot: process.env.SystemRoot,
  }
  const scrubbed = scrubEnv(base)
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(scrubbed)) {
    if (typeof value === 'string') env[key] = value
  }
  return env
}

const SCRIPT_NAME: Record<CodeLanguage, string> = {
  python: 'subject.py',
  javascript: 'subject.mjs',
}

function defaultInterpreter(language: CodeLanguage, scratchDir: string): InterpreterSpec {
  if (language === 'python') {
    // -I isolated mode: ignores PYTHON* env and the user site-packages dir, so
    // the subject cannot be steered by anything outside the scratch dir.
    // -B: no __pycache__ writes.
    return { command: process.env.BENCH_PYTHON ?? 'python3', args: ['-I', '-B'] }
  }
  return {
    command: process.execPath,
    args: [
      '--experimental-permission',
      `--allow-fs-read=${scratchDir}`,
      '--no-warnings',
    ],
  }
}

/**
 * Is an interpreter for this language present on the machine?
 *
 * Memoized: the executable scorer asks once per artifact, and a sweep asks
 * dozens of times. The answer cannot change within a process.
 */
const available = new Map<CodeLanguage, boolean>()

export function interpreterAvailable(language: CodeLanguage): boolean {
  const cached = available.get(language)
  if (cached !== undefined) return cached
  let answer: boolean
  if (language === 'javascript') {
    answer = true
  } else {
    const command = process.env.BENCH_PYTHON ?? 'python3'
    try {
      answer = spawnSync(command, ['-c', 'pass'], { stdio: 'ignore', timeout: 5000 }).status === 0
    } catch {
      answer = false
    }
  }
  available.set(language, answer)
  return answer
}

/**
 * Run a program under the budget described in the module doc. NEVER throws for
 * a program's own misbehaviour — a crash, a hang and a missing interpreter all
 * come back as a `failure` kind, because the scorer has to be able to say
 * WHICH one happened.
 */
export async function runProgram(
  program: ExtractedProgram,
  options: RunProgramOptions = {}
): Promise<ExecutionResult> {
  const timeoutMs = options.timeoutMs ?? 5000
  const maxOutputBytes = options.maxOutputBytes ?? 256 * 1024

  const scratchDir = mkdtempSync(join(tmpdir(), 'bench-code-runtime-'))
  const scriptPath = join(scratchDir, SCRIPT_NAME[program.language])
  writeFileSync(scriptPath, program.source, 'utf8')
  for (const [name, contents] of Object.entries(options.files ?? {})) {
    writeFileSync(join(scratchDir, name), contents, 'utf8')
  }

  const interpreter = options.interpreter ?? defaultInterpreter(program.language, scratchDir)
  const started = Date.now()

  const result = await new Promise<ExecutionResult>((resolve) => {
    let stdout = ''
    let stderr = ''
    let truncated = false
    let timedOut = false
    let settled = false

    let child: ReturnType<typeof spawn>
    try {
      child = spawn(interpreter.command, [...interpreter.args, scriptPath], {
        cwd: scratchDir,
        // The cast is only for Next's ProcessEnv augmentation (it declares
        // NODE_ENV as required, which no plain env-shaped record satisfies) —
        // the same one `runners/cli.ts` needs for the same reason.
        env: minimalEnv(scratchDir) as NodeJS.ProcessEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Own process group, so a program that forks is killed whole.
        detached: true,
      })
    } catch (e) {
      resolve({
        stdout: '',
        stderr: e instanceof Error ? e.message : String(e),
        exitCode: null,
        timedOut: false,
        truncated: false,
        durationMs: Date.now() - started,
        failure: 'runtime-unavailable',
      })
      return
    }

    const killGroup = (signal: NodeJS.Signals) => {
      if (child.pid === undefined) return
      try {
        process.kill(-child.pid, signal)
      } catch {
        // Group already gone.
      }
    }

    const timer = setTimeout(() => {
      timedOut = true
      killGroup('SIGTERM')
      setTimeout(() => killGroup('SIGKILL'), 1000)
    }, timeoutMs)

    const capture = (chunk: Buffer, sink: 'out' | 'err') => {
      const text = chunk.toString('utf8')
      const total = stdout.length + stderr.length
      if (total >= maxOutputBytes) {
        if (!truncated) {
          truncated = true
          killGroup('SIGKILL')
        }
        return
      }
      const room = maxOutputBytes - total
      const slice = text.length > room ? text.slice(0, room) : text
      if (slice.length < text.length) {
        truncated = true
      }
      if (sink === 'out') stdout += slice
      else stderr += slice
      if (truncated) killGroup('SIGKILL')
    }

    child.stdout?.on('data', (chunk: Buffer) => capture(chunk, 'out'))
    child.stderr?.on('data', (chunk: Buffer) => capture(chunk, 'err'))

    const finish = (exitCode: number | null, spawnError?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      let failure: CodeFailureKind | undefined
      if (spawnError) failure = 'runtime-unavailable'
      else if (timedOut) failure = 'timeout'
      else if (truncated) failure = 'output-limit'
      else if (exitCode !== 0) failure = 'runtime-error'
      resolve({
        stdout,
        stderr: spawnError ? `${stderr}${spawnError.message}` : stderr,
        exitCode,
        timedOut,
        truncated,
        durationMs: Date.now() - started,
        failure,
      })
    }

    child.on('error', (e) => finish(null, e))
    child.on('close', (code) => finish(code))
  })

  rmSync(scratchDir, { recursive: true, force: true })
  return result
}
