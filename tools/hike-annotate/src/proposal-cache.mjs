import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const CACHE = resolve(dirname(fileURLToPath(import.meta.url)), '../.cache/proposals')

/** Persist a proposal so a later write_manifest call can apply it. */
export async function saveProposal(slug, run, reportPath, stamp) {
  const dir = join(CACHE, slug)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'proposal.json'), JSON.stringify(run.proposal))
  await writeFile(join(dir, 'manifest-backup.json'), JSON.stringify(run.manifest, null, 2))
  await writeFile(join(dir, 'metas.json'), JSON.stringify(run.metas))
  let reportCopy = reportPath
  try {
    reportCopy = join(dir, 'report.html')
    await copyFile(reportPath, reportCopy)
  } catch {
    reportCopy = reportPath
  }
  await writeFile(
    join(dir, 'meta.json'),
    JSON.stringify({ slug, partial: run.partial, heroId: run.heroId, reportPath: reportCopy, savedAt: stamp }),
  )
  return { dir, reportPath: reportCopy }
}

/** Load a previously saved proposal (or throw if none). */
export async function loadProposal(slug) {
  const dir = join(CACHE, slug)
  const [proposal, manifest, meta] = await Promise.all([
    readFile(join(dir, 'proposal.json'), 'utf8').then(JSON.parse),
    readFile(join(dir, 'manifest-backup.json'), 'utf8').then(JSON.parse),
    readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse),
  ])
  return { proposal, manifest, ...meta, dir }
}
