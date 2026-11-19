import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_CATALOGUE = path.join(repositoryRoot, 'content/art/monumental-worlds-range-study.json')
export const ARTWORK_SCHEMA = JSON.parse(readFileSync(new URL('../docs/art-space/artwork.schema.json', import.meta.url), 'utf8'))
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const MAX_ORIGINAL_BYTES = 64 * 1024 * 1024

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const typeMatches = (value, type) => type === 'null' ? value === null
  : type === 'array' ? Array.isArray(value)
    : type === 'object' ? isObject(value)
      : type === 'integer' ? Number.isSafeInteger(value)
        : type === 'number' ? typeof value === 'number' && Number.isFinite(value)
          : typeof value === type

const SUPPORTED_KEYWORDS = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern', 'format', 'minimum', 'maximum', 'exclusiveMinimum'])
const SUPPORTED_TYPES = new Set(['null', 'boolean', 'string', 'number', 'integer', 'object', 'array'])
const SUPPORTED_FORMATS = new Set(['date', 'date-time', 'uri'])
const scalar = value => value === null || ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))

/** Fail closed when the checked-in schema grows beyond this reader's explicit subset. */
export function assertSupportedSchema(schema) {
  const fail = (location, message) => { throw new Error(`Unsupported art schema at ${location}: ${message}`) }
  function visit(rule, location) {
    if (!isObject(rule)) fail(location, 'expected an object schema')
    for (const [keyword, value] of Object.entries(rule)) {
      const at = `${location}.${keyword}`
      if (!SUPPORTED_KEYWORDS.has(keyword)) fail(at, `unsupported keyword ${keyword}`)
      if (['$schema', '$id', '$ref', 'title', 'description', 'pattern', 'format'].includes(keyword) && typeof value !== 'string') fail(at, 'expected a string')
      if (keyword === '$schema' && value !== 'https://json-schema.org/draft/2020-12/schema') fail(at, 'only JSON Schema 2020-12 is supported')
      if (keyword === 'type' && !([].concat(value).length && [].concat(value).every(type => SUPPORTED_TYPES.has(type)))) fail(at, 'invalid type declaration')
      if (keyword === 'const' && !scalar(value)) fail(at, 'only scalar constants are supported')
      if (keyword === 'enum' && !(Array.isArray(value) && value.length && value.every(scalar))) fail(at, 'expected a nonempty scalar array')
      if (keyword === 'required' && !(Array.isArray(value) && value.every(item => typeof item === 'string') && new Set(value).size === value.length)) fail(at, 'expected unique property names')
      if (['additionalProperties', 'uniqueItems'].includes(keyword) && typeof value !== 'boolean') fail(at, 'expected a boolean')
      if (['minItems', 'minLength'].includes(keyword) && !(Number.isSafeInteger(value) && value >= 0)) fail(at, 'expected a nonnegative integer')
      if (['minimum', 'maximum', 'exclusiveMinimum'].includes(keyword) && !(typeof value === 'number' && Number.isFinite(value))) fail(at, 'expected a finite number')
      if (keyword === 'format' && !SUPPORTED_FORMATS.has(value)) fail(at, `unsupported format ${value}`)
      if (keyword === 'pattern') {
        try { new RegExp(value) } catch { fail(at, 'invalid regular expression') }
      }
      if (keyword === '$ref') {
        if (!value.startsWith('#/$defs/') || !Object.hasOwn(schema.$defs ?? {}, value.slice('#/$defs/'.length))) fail(at, 'expected a resolved local #/$defs/ reference')
        if (Object.keys(rule).some(key => !['$ref', 'title', 'description', '$id', '$schema'].includes(key))) fail(location, 'assertion siblings beside $ref are not supported')
      }
      if (keyword === 'properties' || keyword === '$defs') {
        if (!isObject(value)) fail(at, 'expected a map of object schemas')
        // Keys here are user property/definition names, never schema keywords.
        for (const [name, child] of Object.entries(value)) visit(child, `${at}.${name}`)
      }
      if (keyword === 'items') visit(value, at)
    }
  }
  visit(schema, '$')
}

assertSupportedSchema(ARTWORK_SCHEMA)

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function validFormat(value, format) {
  if (format === 'date') return validDate(value)
  if (format === 'date-time') return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
    && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
  if (format === 'uri') {
    try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password } catch { return false }
  }
  throw new Error(`Unsupported schema format: ${format}`)
}

/** Implements only the keywords used by this checked-in schema; not a general JSON Schema library. */
function checkShape(value, rule, location, errors) {
  if (rule.$ref) {
    if (!rule.$ref.startsWith('#/$defs/')) throw new Error(`Unsupported schema reference: ${rule.$ref}`)
    const target = ARTWORK_SCHEMA.$defs[rule.$ref.slice('#/$defs/'.length)]
    if (!target) throw new Error(`Unresolved schema reference: ${rule.$ref}`)
    checkShape(value, target, location, errors)
    return
  }
  if (rule.type && !(Array.isArray(rule.type) ? rule.type : [rule.type]).some(type => typeMatches(value, type))) {
    errors.push(`${location}: expected ${[].concat(rule.type).join(' or ')}`)
    return
  }
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(`${location}: must equal ${JSON.stringify(rule.const)}`)
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${location}: must be one of ${rule.enum.join(', ')}`)
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && [...value].length < rule.minLength) errors.push(`${location}: string is too short`)
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${location}: invalid string format`)
    if (rule.format && !validFormat(value, rule.format)) errors.push(`${location}: invalid ${rule.format}`)
  }
  if (typeof value === 'number') {
    if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${location}: must be at least ${rule.minimum}`)
    if (rule.maximum !== undefined && value > rule.maximum) errors.push(`${location}: must be at most ${rule.maximum}`)
    if (rule.exclusiveMinimum !== undefined && value <= rule.exclusiveMinimum) errors.push(`${location}: must be greater than ${rule.exclusiveMinimum}`)
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${location}: must contain at least ${rule.minItems} item(s)`)
    if (rule.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${location}: duplicate item`)
    if (rule.items) value.forEach((item, index) => checkShape(item, rule.items, `${location}[${index}]`, errors))
  }
  if (isObject(value)) {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${location}.${key}: required`)
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties ?? {}, key)) checkShape(item, rule.properties[key], `${location}.${key}`, errors)
      else if (rule.additionalProperties === false) errors.push(`${location}.${key}: unknown property`)
    }
  }
}

/** Read-only validation. Does not normalize, trim, rewrite or infer prompt/metadata values. */
export function validateCatalogue(catalogue) {
  const errors = []
  checkShape(catalogue, ARTWORK_SCHEMA, '$', errors)
  if (errors.length) return errors
  const artworkIds = new Set()
  const slugs = new Set()
  for (const [index, artwork] of catalogue.artworks.entries()) {
    const location = `$.artworks[${index}] (${artwork.id})`
    if (artworkIds.has(artwork.id)) errors.push(`${location}.id: duplicate artwork id`)
    if (slugs.has(artwork.slug)) errors.push(`${location}.slug: duplicate artwork slug`)
    artworkIds.add(artwork.id)
    slugs.add(artwork.slug)
    const seenVersions = new Set()
    for (const version of artwork.versions) {
      const versionLocation = `${location}.versions (${version.id})`
      if (seenVersions.has(version.id)) errors.push(`${versionLocation}: duplicate version id`)
      if (version.operation === 'generate' && version.parentVersionId !== null) errors.push(`${versionLocation}: generate must have a null parentVersionId`)
      if (version.operation === 'edit' && (version.parentVersionId === null || !seenVersions.has(version.parentVersionId))) errors.push(`${versionLocation}: edit parent must be an earlier version in this artwork`)
      if (version.parentVersionId === version.id) errors.push(`${versionLocation}: a version cannot be its own parent`)
      seenVersions.add(version.id)
      if (version.asset.availability === 'not-imported' && version.asset.src !== null) errors.push(`${versionLocation}.asset.src: not-imported assets must use null, not a guessed URL`)
      if (version.asset.availability === 'imported' && version.asset.src === null) errors.push(`${versionLocation}.asset.src: imported assets require a public path`)
      if (version.asset.bytes > MAX_ORIGINAL_BYTES) errors.push(`${versionLocation}.asset.bytes: exceeds the 64 MiB original verification budget`)
      if (artwork.status === 'published' && version.asset.availability !== 'imported') errors.push(`${versionLocation}: published artwork requires every recorded original to be imported`)
    }
    if (!seenVersions.has(artwork.selectedVersionId)) errors.push(`${location}.selectedVersionId: unresolved version`)
    const annotationIds = new Set()
    for (const annotation of artwork.annotations) {
      const annotationLocation = `${location}.annotations (${annotation.id})`
      if (annotationIds.has(annotation.id)) errors.push(`${annotationLocation}: duplicate annotation id`)
      annotationIds.add(annotation.id)
      if (!seenVersions.has(annotation.versionId)) errors.push(`${annotationLocation}.versionId: unresolved version`)
      const region = annotation.region
      if (region && (region.x + region.width > 1 + 1e-9 || region.y + region.height > 1 + 1e-9)) errors.push(`${annotationLocation}.region: rectangle extends outside the image`)
    }
  }
  return errors
}

async function regularAssetFile(publicRoot, src) {
  // The schema's path grammar excludes dot segments, escapes, queries and absolute hostnames.
  const root = path.resolve(publicRoot)
  let current = root
  const rootStat = await lstat(root)
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('public root must be a real directory')
  const segments = src.slice(1).split('/')
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment)
    const stat = await lstat(current)
    if (stat.isSymbolicLink()) throw new Error('symlinked asset paths are not allowed')
    if (index < segments.length - 1 && !stat.isDirectory()) throw new Error('asset parent is not a directory')
    if (index === segments.length - 1 && !stat.isFile()) throw new Error('asset is not a regular file')
  }
  return current
}

/** Verify imported originals only. Checks receipts and PNG IHDR, not a full pixel decode or browser render. */
export async function verifyImportedAssets(catalogue, publicRoot = path.join(repositoryRoot, 'public')) {
  const errors = validateCatalogue(catalogue)
  if (errors.length) return errors
  for (const artwork of catalogue.artworks) {
    for (const version of artwork.versions) {
      const asset = version.asset
      if (asset.availability !== 'imported') continue
      const location = `${artwork.id}/${version.id}`
      try {
        const filename = await regularAssetFile(publicRoot, asset.src)
        const stat = await lstat(filename)
        if (stat.size !== asset.bytes) throw new Error(`byte length differs: expected ${asset.bytes}, got ${stat.size}`)
        const bytes = await readFile(filename)
        if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('SHA-256 differs from the recorded original')
        if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('invalid PNG signature or IHDR')
        const width = bytes.readUInt32BE(16)
        const height = bytes.readUInt32BE(20)
        if (width !== asset.width || height !== asset.height) throw new Error(`PNG dimensions differ: expected ${asset.width}×${asset.height}, got ${width}×${height}`)
      } catch (error) {
        errors.push(`${location}: ${error.message}`)
      }
    }
  }
  return errors
}

async function main(args) {
  if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/validate-art-catalogue.mjs [catalogue.json] [--assets]\nValidates source records. --assets also verifies imported local PNG receipts; no network or writes.\n')
    return
  }
  if (args.filter(arg => arg === '--assets').length > 1 || args.some(arg => arg.startsWith('--') && arg !== '--assets')) throw new Error('Unknown or repeated flag. Use --help.')
  const positional = args.filter(arg => arg !== '--assets')
  if (positional.length > 1) throw new Error('Expected at most one catalogue path. Use --help.')
  const catalogue = JSON.parse(await readFile(positional[0] ?? DEFAULT_CATALOGUE, 'utf8'))
  const errors = args.includes('--assets') ? await verifyImportedAssets(catalogue) : validateCatalogue(catalogue)
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  const versions = catalogue.artworks.flatMap(artwork => artwork.versions)
  const imported = versions.filter(version => version.asset.availability === 'imported').length
  process.stdout.write(`Valid catalogue: ${catalogue.artworks.length} artworks, ${versions.length} versions; ${imported} imported, ${versions.length - imported} not imported.\n`)
  process.stdout.write(args.includes('--assets') ? `Verified ${imported} local PNG receipts. Unimported assets were not verified.\n` : 'Asset files were not verified (use --assets).\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`Art catalogue validation failed: ${error.message}\n`)
    process.exitCode = 1
  })
}
