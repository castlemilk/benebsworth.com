import { spawn } from 'node:child_process'
import { AGY_BIN, AGY_MODEL } from './config.mjs'

export const SCENE_TYPES = [
  'summit', 'pass', 'lake', 'hut', 'glacier', 'town', 'valley', 'ridge',
  'trail', 'forest', 'river', 'wildlife', 'flora', 'person', 'food', 'other',
]

function buildPrompt(imagePath, ctx) {
  const cand = ctx.candidates.map((c) => `${c.name} (${c.km} km)`).join(', ')
  const route = ctx.waypoints.map((w) => `${w.name} (${w.day})`).join(' → ')
  return [
    'You are classifying ONE photo for a hiking trip photo gallery.',
    `Hike: ${ctx.hike.name} — ${ctx.hike.region}, ${ctx.hike.country}, ${ctx.hike.year}.`,
    ctx.takenAt ? `Taken: ${ctx.takenAt}.` : '',
    `The photo's GPS is nearest these route waypoints: ${cand}.`,
    `Full route, in order: ${route}.`,
    `Look at the image file ${imagePath}.`,
    'Return ONLY a JSON object — no prose, no markdown fence — with EXACTLY these keys:',
    '{"waypoint": the single best waypoint NAME from the route this photo belongs to (prefer the geo-nearest candidates above, but override when the scene clearly indicates another — e.g. the Matterhorn implies Zermatt; use an exact name from the route list),',
    `"sceneType": one of [${SCENE_TYPES.join(', ')}],`,
    '"subjectTags": array of 3-7 short tags (named peaks, features, conditions),',
    '"caption": one evocative sentence, British spelling; do NOT invent place names you cannot actually identify,',
    '"alt": a plain factual accessibility description,',
    '"heroWorthiness": integer 0-10 (how striking/representative as a cover image),',
    '"quality": integer 0-10 (low for blurry, dark, or accidental shots),',
    '"skip": true if blurry/accidental/screenshot/duplicate-feeling/not gallery-worthy, else false,',
    '"reason": a brief why for the waypoint choice and the skip flag}',
  ].filter(Boolean).join('\n')
}

/** Pull the first balanced {...} JSON object out of agy's (possibly chatty) output. */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < body.length; i++) {
    if (body[i] === '{') depth++
    else if (body[i] === '}' && --depth === 0) {
      try {
        return JSON.parse(body.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function validate(obj, ctx) {
  if (!obj || typeof obj !== 'object') return null
  const names = new Set(ctx.waypoints.map((w) => w.name))
  const clampI = (v) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)))
  return {
    waypoint: typeof obj.waypoint === 'string' && names.has(obj.waypoint) ? obj.waypoint : '',
    sceneType: SCENE_TYPES.includes(obj.sceneType) ? obj.sceneType : 'other',
    subjectTags: Array.isArray(obj.subjectTags) ? obj.subjectTags.slice(0, 8).map(String) : [],
    caption: typeof obj.caption === 'string' ? obj.caption.trim() : '',
    alt: typeof obj.alt === 'string' ? obj.alt.trim() : '',
    heroWorthiness: clampI(obj.heroWorthiness),
    quality: clampI(obj.quality),
    skip: Boolean(obj.skip),
    reason: typeof obj.reason === 'string' ? obj.reason.trim() : '',
  }
}

function runAgy(imageDir, prompt) {
  const args = ['--add-dir', imageDir, '--dangerously-skip-permissions', '-p', prompt]
  if (AGY_MODEL) args.push('--model', AGY_MODEL)
  return new Promise((resolve, reject) => {
    // stdin MUST be 'ignore' (closed) — agy blocks on an open stdin pipe.
    const child = spawn(AGY_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('agy timed out (5m)'))
    }, 5 * 60 * 1000)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 && !out.trim()) reject(new Error(`agy exit ${code}: ${err.slice(0, 400)}`))
      else resolve(out)
    })
  })
}

const FAIL = {
  needsManual: true, waypoint: '', sceneType: 'other', subjectTags: [],
  caption: '', alt: '', heroWorthiness: 0, quality: 0, skip: false, reason: 'classification failed',
}

/** Classify one image via agy (one retry on bad JSON). `imagePath` must be inside `imageDir`. */
export async function classifyImage(imagePath, imageDir, ctx) {
  const base = buildPrompt(imagePath, ctx)
  for (let attempt = 0; attempt < 2; attempt++) {
    let out
    try {
      out = await runAgy(imageDir, attempt === 0 ? base : `${base}\n\nReturn ONLY the JSON object and nothing else.`)
    } catch (e) {
      if (attempt === 1) return { ...FAIL, reason: e.message.slice(0, 160) }
      continue
    }
    const valid = validate(extractJson(out), ctx)
    if (valid && (valid.caption || valid.waypoint)) return valid
  }
  return { ...FAIL }
}
