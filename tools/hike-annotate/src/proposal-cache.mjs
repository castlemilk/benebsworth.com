import { mkdir, writeFile, readFile, copyFile, rename, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateHikeSlug } from './config.mjs'

const CACHE = resolve(dirname(fileURLToPath(import.meta.url)), '../.cache/proposals')

/** Persist a proposal so a later write_manifest call can apply it. */
export async function saveProposal(slug, run, reportPath, stamp) {
  validateHikeSlug(slug)
  const dir = join(CACHE, slug)
  const proposalId = randomUUID()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'proposal.json'), JSON.stringify(run.proposal))
  await writeFile(join(dir, 'manifest-backup.json'), JSON.stringify(run.manifest, null, 2))
  await writeFile(join(dir, 'metas.json'), JSON.stringify(run.metas))
  let reportCopy = reportPath
  try {
    reportCopy = join(dir, `report-${proposalId}.html`)
    await copyFile(reportPath, reportCopy)
  } catch {
    reportCopy = reportPath
  }
  await writeFile(
    join(dir, 'meta.json'),
    JSON.stringify({ slug, partial: run.partial, heroId: run.heroId, reportPath: reportCopy, savedAt: stamp }),
  )
  // Commit the proposal and its source generation together, even when saves overlap.
  const record = { slug, proposalId, proposal: run.proposal, manifest: run.manifest, generation: run.generation,
    partial: run.partial, heroId: run.heroId, reportPath: reportCopy, savedAt: stamp }
  const temporary = join(dir, `proposal-${proposalId}.tmp`)
  try {
    await writeFile(temporary, JSON.stringify(record), { flag: 'wx' })
    await rename(temporary, join(dir, 'proposal-record.json'))
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
  return { dir, reportPath: reportCopy, proposalId }
}

/** Load a previously saved proposal (or throw if none). */
export async function loadProposal(slug) {
  validateHikeSlug(slug)
  const dir = join(CACHE, slug)
  let record
  try {
    record = JSON.parse(await readFile(join(dir, 'proposal-record.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (record) {
    if (record.slug !== slug) throw new Error('Cached proposal does not match the hike')
    return { ...record, dir }
  }
  const [proposal, manifest, meta] = await Promise.all([
    readFile(join(dir, 'proposal.json'), 'utf8').then(JSON.parse),
    readFile(join(dir, 'manifest-backup.json'), 'utf8').then(JSON.parse),
    readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse),
  ])
  return { proposal, manifest, ...meta, generation: undefined, dir }
}
