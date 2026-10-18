import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Feed a loop's best pages into Gamma's capture inbox.
 *
 * This is the answer to paying for a design library: the harness already
 * generates, scores and measures more pages than any catalogue could list, so
 * the growth loop is "capture what scored well, review it, promote the good
 * parts". Two conditions gate it, and both come from measurements rather than
 * taste:
 *
 *  - the rubric has to be high (the task's own score, not ours), and
 *  - the design rules have to be quiet (few FAIL findings).
 *
 * The rubric alone is not enough — it read 100 on a page with ten design
 * defects — which is why the defect gate exists rather than being a nice extra.
 *
 * A capture that fails never fails the loop: the run's result is the artefact,
 * and the inbox is a side effect.
 */

export interface GammaCaptureOptions {
  /** Path to Gamma's capture client (scripts/capture-page.mjs). */
  scriptPath: string
  /** Gamma's base URL. */
  apiUrl: string
  /** Minimum rubric score to capture at all. */
  minScore?: number
  /** Maximum design-rule FAIL findings to capture with. */
  maxFails?: number
}

export interface CaptureOutcome {
  captured: boolean
  reason: string
}

export async function captureIntoGamma(
  artifactPath: string,
  meta: { model: string; loop: number; score?: number; fails?: number; title: string; notes: string },
  options: GammaCaptureOptions
): Promise<CaptureOutcome> {
  const minScore = options.minScore ?? 90
  const maxFails = options.maxFails ?? 3

  if (!fs.existsSync(artifactPath)) return { captured: false, reason: 'no artefact at that path' }
  if (meta.score === undefined) return { captured: false, reason: 'loop was not scored' }
  if (meta.score < minScore) {
    return { captured: false, reason: `rubric ${meta.score} < ${minScore}` }
  }
  if (meta.fails !== undefined && meta.fails > maxFails) {
    return { captured: false, reason: `${meta.fails} design FAIL findings > ${maxFails}` }
  }

  const args = [
    options.scriptPath,
    artifactPath,
    '--api',
    options.apiUrl,
    '--name',
    meta.title,
    '--tags',
    ['generated', `loop-${meta.loop}`, `rubric-${meta.score}`, `model-${meta.model.replaceAll('/', '-')}`].join(','),
    '--notes',
    `${meta.notes}\nrecorded by the harness loop: model ${meta.model}, loop ${meta.loop}, rubric ${meta.score}, design FAILs ${meta.fails ?? 'unmeasured'}`,
  ]

  return new Promise((resolve) => {
    const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (chunk) => (out += String(chunk)))
    child.stderr.on('data', (chunk) => (out += String(chunk)))
    child.on('error', () => resolve({ captured: false, reason: 'capture client could not start' }))
    child.on('close', (code) => {
      resolve(
        code === 0
          ? { captured: true, reason: 'captured' }
          : { captured: false, reason: out.trim().split('\n').pop() ?? `exit ${code ?? 0}` }
      )
    })
  })
}

/** Default Gamma location on this machine, if it is there. */
export function defaultGammaCaptureOptions(): GammaCaptureOptions | undefined {
  const home = process.env.HOME ?? ''
  const script = path.join(home, 'projects/gamma/scripts/capture-page.mjs')
  if (!fs.existsSync(script)) return undefined
  return { scriptPath: script, apiUrl: 'http://127.0.0.1:3000' }
}
