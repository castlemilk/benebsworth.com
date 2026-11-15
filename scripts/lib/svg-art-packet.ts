import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { STUDY_REGISTRY, parametersFor } from '../../lib/generative-svg/model'
import { appearanceFor, renderStudySvg, type Appearance } from '../../lib/generative-svg/render'

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object')
  return value as Record<string, unknown>
}
const fields = (value: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown packet field')
}
const slug = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) throw new Error('Invalid batch ID')
  return value
}

/** Repo-specific recipes become inputs to the separate artistic-vector review factory. */
export function prepareArtPacket(input: unknown) {
  const request = object(input)
  fields(request, ['version', 'batch_id', 'revision', 'artworks'])
  if (request.version !== 1) throw new Error('Unsupported packet version')
  const id = slug(request.batch_id), revision = request.revision
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1 || revision > 999) throw new Error('Invalid revision')
  if (!Array.isArray(request.artworks) || request.artworks.length === 0 || request.artworks.length > 40) throw new Error('Choose 1–40 artworks')
  const files: Record<string, string> = {}, seen = new Set<string>()
  const artworks = request.artworks.map(item => {
    const recipe = object(item)
    fields(recipe, ['study', 'parameters', 'appearance'])
    if (typeof recipe.study !== 'string') throw new Error('Missing study ID')
    const study = STUDY_REGISTRY.get(recipe.study)
    if (!study || study.category !== 'Illustration' || study.provenance !== 'illustrative') throw new Error('Choose a registered illustrative artwork')
    if (seen.has(study.id)) throw new Error('Duplicate artwork: variants are not extra artworks')
    seen.add(study.id)
    const parameters = parametersFor(study, object(recipe.parameters ?? {}) as Record<string, number>)
    const appearance = appearanceFor(object(recipe.appearance ?? {}) as Partial<Appearance>)
    const variants: Record<string, string> = {}, hashes: Record<string, string> = {}
    for (const [name, theme, palette] of [['light', 'light', appearance.palette], ['dark', 'dark', appearance.palette], ['mono', 'light', 'monochrome'], ['mono-dark', 'dark', 'monochrome']] as const) {
      const filename = `${study.id}-${name}.svg`
      // Custom inks are preserved on both surfaces. The reviewer, not this exporter,
      // must reject poor contrast; silently recolouring a custom recipe is misleading.
      const svg = renderStudySvg(study, parameters, { ...appearance, theme, palette })
      files[filename] = svg; variants[name] = filename
      hashes[filename] = createHash('sha256').update(svg).digest('hex')
    }
    return { id: study.id, revision, title: study.title, style: study.tags.find(tag => ['engraved-natural', 'cut-paper', 'expressive-ink'].includes(tag)) ?? 'authored-vector', brief: study.description, provenance: study.provenance, sources: [], minimum_display_width: 160, files: variants, recipe: { study: study.id, parameters, appearance }, basis: study.basis, sha256: hashes }
  })
  const manifest = { version: 1, batch_id: id, artworks }
  files['batch.json'] = JSON.stringify(manifest, null, 2) + '\n'
  return { directory: `${id}-v${revision}`, manifest, files }
}

/** Never overwrites an existing packet; batch.json is written last as completion marker. */
export async function writeArtPacket(input: unknown, outputRoot: string): Promise<string> {
  const packet = prepareArtPacket(input), directory = resolve(outputRoot, packet.directory)
  await mkdir(directory)
  for (const [name, contents] of Object.entries(packet.files)) await writeFile(resolve(directory, name), contents, { flag: 'wx' })
  return directory
}

/** Recompute from the registered source, not hashes supplied by the packet itself. */
export async function verifyArtPacket(input: unknown, directory: string): Promise<void> {
  const packet = prepareArtPacket(input)
  const expected = Object.keys(packet.files).sort()
  const actual = (await readdir(directory)).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Packet file inventory differs from the recipe')
  for (const name of expected) {
    if (await readFile(resolve(directory, name), 'utf8') !== packet.files[name]) throw new Error(`Packet differs from registered source: ${name}`)
  }
}
