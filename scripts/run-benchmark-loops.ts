#!/usr/bin/env tsx
// Iterate one artefact: generate, measure in a real browser, reflect, improve.
//
//   npx tsx scripts/run-benchmark-loops.mjs \
//     --model <model-id> --task <task-id> [--loops 5] [--skills-dir <path> --skills a,b] \
//     [--inspect <inspect.mjs>] [--timeout-ms 1200000] [--out <dir>]
//
// One generation is one sample of what a model does with a brief. Loops ask what
// is wrong with what it built: each round after the first is handed the previous
// artefact plus measurements taken in a real browser (screenshots at three
// widths) and the design rules that failed, and asked to improve AND extend it.
// Every loop is scored with the task's own rubric, so the progression is a
// series of comparable numbers rather than a series of impressions.
//
// The loop stops early when a round neither improves the rubric nor removes a
// defect: past that point the model is re-writing the same page, and each round
// costs a full generation.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.js'
import { scoreWithBreakdown } from '../lib/lab/llm-benchmark/scorers/behavioral.js'
import { buildSkillBlock } from '../lib/lab/llm-benchmark/skills-context.js'
import { buildLoopPrompt, loopProgress, type LoopReport } from '../lib/lab/llm-benchmark/loops.js'
import { runOpencodeArtifact, type OpencodeLoopOptions } from '../lib/lab/llm-benchmark/runners/opencode-loops.js'

interface Args {
  model: string
  task: string
  loops: number
  skillsDir?: string
  skills: string[]
  inspect?: string
  timeoutMs: number
  out: string
  stopWhenStuck: boolean
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const model = get('--model') ?? process.env.RUN_MODELS?.split(',')[0]
  const task = get('--task') ?? process.env.RUN_TASKS?.split(',')[0]
  if (!model || !task) {
    console.error('usage: --model <id> --task <id> [--loops n] [--skills-dir p --skills a,b]')
    process.exit(2)
  }
  return {
    model,
    task,
    loops: Number(get('--loops') ?? process.env.RUN_LOOPS ?? 5),
    skillsDir: get('--skills-dir') ?? process.env.RUN_SKILLS_DIR,
    skills: (get('--skills') ?? process.env.RUN_SKILLS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    inspect: get('--inspect'),
    timeoutMs: Number(get('--timeout-ms') ?? 1_200_000),
    out: get('--out') ?? `loops/${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`,
    stopWhenStuck: !argv.includes('--no-stop-when-stuck'),
  }
}

/**
 * Measure the artefact in a real browser: screenshots at three widths plus the
 * design rules' own findings.
 *
 * The inspector is an external script on purpose — the design skill already
 * ships one, and a second CDP implementation in this repo would drift from it.
 * When it is not supplied the loop still runs, and the reflection says plainly
 * that no measurements were taken, which is honest rather than silent.
 */
async function inspectArtifact(
  artifactPath: string,
  loopDir: string,
  inspectScript: string | undefined
): Promise<{ report: LoopReport; screenshots: string[] }> {
  const screenshotsDir = path.join(loopDir, 'screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })
  const report: LoopReport = { measurements: [], findings: [] }

  if (!inspectScript || !fs.existsSync(inspectScript)) {
    return { report, screenshots: [] }
  }

  const raw = await new Promise<string>((resolve) => {
    const child = spawn('node', [inspectScript, artifactPath], { cwd: loopDir })
    let out = ''
    child.stdout.on('data', (c) => (out += String(c)))
    child.stderr.on('data', (c) => (out += String(c)))
    child.on('close', () => resolve(out))
  })

  // The inspector writes screenshots next to its own report; adopt them.
  const shots = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter((f) => f.endsWith('.jpg'))
    : []
  for (const shot of shots) {
    const from = path.join(loopDir, '.taste-skill', 'inspect', shot)
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(screenshotsDir, shot))
  }

  const reportFile = path.join(loopDir, '.taste-skill', 'inspect', 'report.json')
  if (!fs.existsSync(reportFile)) {
    // A measurement step that produced nothing must be visible: the loop would
    // otherwise reflect on a page it never actually looked at, and say so in
    // the prompt as if the page were clean.
    console.warn(`[loops] inspector produced no report for loop artefact — see ${path.basename(loopDir)}/`)
    return { report, screenshots: [] }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(reportFile, 'utf8')) as {
      findings?: { level?: string; id?: string; message?: string; fix?: string }[]
    }
    report.findings = (parsed.findings ?? [])
      .filter((f) => f.level === 'FAIL' || f.level === 'WARN')
      .map((f) => ({
        id: f.id ?? 'finding',
        level: f.level === 'FAIL' ? 'FAIL' : 'WARN',
        message: f.message ?? '',
        fix: f.fix,
      }))
  } catch {
    // A malformed report is not fatal: the loop proceeds with no findings.
  }

  const headline = /hero headline\s+"([^"]+)"/.exec(raw)?.[1]
  const words = /(\d+)\s+words/.exec(raw)?.[1]
  const screens = /([\d.]+)\s+screens/.exec(raw)?.[1]
  const verdict = /RESULT:\s*(\d+ FAIL)/.exec(raw)?.[1]
  report.headline = headline
  report.words = words ? Number(words) : undefined
  report.screens = screens ? Number(screens) : undefined
  report.verdict = verdict
  for (const width of [1440, 768, 390]) {
    report.measurements.push({ width, summary: headline ? `headline "${headline}"` : 'rendered' })
  }
  report.measurements = report.measurements.map((m) => ({
    ...m,
    screenshot: shots.find((s) => s.includes(String(m.width))) ?? shots[0],
  }))

  return { report, screenshots: shots }
}

const args = parseArgs(process.argv.slice(2))
const model = BENCHMARK_MODELS.find((m) => m.id === args.model)
const task = BENCHMARK_TASKS.find((t) => t.id === args.task)
if (!model || !task) {
  console.error(`unknown model or task. models=${BENCHMARK_MODELS.length} tasks=${BENCHMARK_TASKS.length}`)
  process.exit(2)
}
// A model with no CLI id cannot be routed: the loops driver only knows how to
// spawn opencode, so say that plainly instead of spawning with `-m undefined`.
if (!model.apiModelId) {
  console.error(`model ${args.model} has no apiModelId — the loop driver cannot route it.`)
  process.exit(2)
}

const skills = args.skillsDir ? buildSkillBlock(args.skillsDir, args.skills) : undefined
if (args.skills.length > 0 && (!skills || skills.chars === 0)) {
  console.error(`no skill resolved from ${args.skills.join(',')} — refusing to run an un-injected arm.`)
  process.exit(2)
}

const outDir = path.resolve(args.out)
fs.mkdirSync(outDir, { recursive: true })
const manifest: { model: string; task: string; skills: string[]; loops: LoopReport[] } = {
  model: args.model,
  task: args.task,
  skills: skills?.names ?? [],
  loops: [],
}

console.log(`[loops] model=${args.model} task=${args.task} loops=${String(args.loops)}`)
console.log(`[loops] skills: ${skills && skills.names.length > 0 ? skills.names.join(', ') : 'none (baseline)'}`)
console.log(`[loops] out: ${path.relative(process.cwd(), outDir)}/`)

let previousReport: LoopReport | undefined
let artifact = ''
let artifactPath = ''

for (let loop = 1; loop <= args.loops; loop += 1) {
  const loopDir = path.join(outDir, `loop-${String(loop)}`)
  fs.mkdirSync(loopDir, { recursive: true })

  const plan = buildLoopPrompt({
    loop,
    taskPrompt: task.prompt,
    artifact,
    report: previousReport ?? { measurements: [], findings: [] },
    skillsText: skills?.text,
  })
  fs.writeFileSync(path.join(loopDir, 'prompt.md'), plan.prompt, 'utf8')

  const options: OpencodeLoopOptions = {
    model: model.apiModelId,
    prompt: plan.prompt,
    artifactPath: path.join(loopDir, 'artifact.html'),
    timeoutMs: args.timeoutMs,
  }
  const started = Date.now()
  const generation = await runOpencodeArtifact(options)
  const report: LoopReport = { measurements: [], findings: [] }

  if (!generation.ok) {
    report.error = generation.error
    report.runtimeMs = Date.now() - started
    manifest.loops.push(report)
    fs.writeFileSync(path.join(loopDir, 'report.json'), JSON.stringify(report, null, 2))
    console.error(`[loops] loop ${String(loop)}: FAILED — ${generation.error}`)
    break
  }

  artifact = generation.artifact
  artifactPath = options.artifactPath
  report.runtimeMs = generation.runtimeMs
  report.tokensOut = generation.tokensOut
  report.costUsd = 0

  const measured = await inspectArtifact(artifactPath, loopDir, args.inspect)
  report.findings = measured.report.findings
  report.headline = measured.report.headline
  report.words = measured.report.words
  report.screens = measured.report.screens
  report.verdict = measured.report.verdict
  report.measurements = measured.report.measurements

  const scored = await scoreWithBreakdown(artifact, task)
  report.rubricScore = scored.score
  fs.writeFileSync(path.join(loopDir, 'report.json'), JSON.stringify(report, null, 2))

  const progress = loopProgress(previousReport, report)
  manifest.loops.push(report)
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(
    `[loops] loop ${String(loop)} (${plan.intent}): rubric=${String(report.rubricScore)} ` +
      `fails=${String(report.findings.filter((f) => f.level === 'FAIL').length)} ` +
      `tokens=${String(report.tokensOut ?? 0)} ${progress.reason}`
  )

  if (loop > 1 && progress.improving === false && args.stopWhenStuck) {
    console.log(`[loops] stopping: ${progress.reason}`)
    break
  }
  previousReport = report
}

const scores = manifest.loops.map((l) => l.rubricScore).filter((s): s is number => s !== undefined)
console.log(`[loops] done. rubric across loops: ${scores.join(' → ')}`)
process.exit(0)
