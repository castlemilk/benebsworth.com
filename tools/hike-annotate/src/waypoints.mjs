import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const pexec = promisify(execFile)
// src/ -> hike-annotate -> tools -> repo root
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const HIKING_URL = pathToFileURL(resolve(REPO_ROOT, 'content/hiking.ts')).href

// content/hiking.ts is TypeScript whose only import is type-only (erased by
// --experimental-strip-types), so a child `node` can import it with no aliasing.
async function evalHike(slug, pick) {
  const code =
    `import { getHike } from ${JSON.stringify(HIKING_URL)};` +
    `const h = getHike(${JSON.stringify(slug)});` +
    `if(!h){process.stderr.write('no hike: '+${JSON.stringify(slug)});process.exit(2);}` +
    `process.stdout.write(JSON.stringify(${pick}));`
  const { stdout } = await pexec(
    'node',
    ['--experimental-strip-types', '--input-type=module', '-e', code],
    { env: process.env, maxBuffer: 8 * 1024 * 1024 },
  )
  return JSON.parse(stdout)
}

/** Ordered waypoints for a hike: [{ name, elev, day, note, x, y }]. */
export function getWaypoints(slug) {
  return evalHike(slug, 'h.waypoints.map(w=>({name:w.name,elev:w.elev,day:w.day,note:w.note,x:w.x,y:w.y}))')
}

/** Lightweight hike metadata for prompt context. */
export function getHikeMeta(slug) {
  return evalHike(slug, '({name:h.name,region:h.region,country:h.country,year:h.year,summary:h.summary,accent:h.accent})')
}
