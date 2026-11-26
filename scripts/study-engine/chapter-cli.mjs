import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { totals } from './metrics.mjs'
import { budgetedDispatcher, writeArtifacts, writeJson } from './run-output.mjs'

const digest = text => createHash('sha256').update(text).digest('hex')

function checkSpec(spec) {
  if (!/^vol[1-5]\/\d\d_[a-z0-9]+(?:_[a-z0-9]+)*$/.test(spec.id) ||
      ![spec.title, spec.question, spec.source?.file].every(value => typeof value === 'string' && value.trim()) ||
      !/^https?:\/\//.test(spec.source?.url)) {
    throw new Error('Chapter spec needs a valid id, title, opening question, source file and source URL')
  }
}

// Persist each completed call before another stage starts. Only fully assembled packets reach preview.
export async function runChapter(command, file, flags) {
  const chapterProfile = flags.profile ?? 'mixed'
  if (!['mixed', 'astra'].includes(chapterProfile)) throw new Error('Chapter --profile must be mixed or astra')
  const route = model => chapterProfile === 'astra' ? 'gpt-6.2-astra' : model
  const spec = JSON.parse(await readFile(file, 'utf8'))
  checkSpec(spec)
  if (spec.seedBrief) {
    const seed = JSON.parse(await readFile(path.resolve(path.dirname(file), spec.seedBrief), 'utf8'))
    if (seed.source?.url !== spec.source.url || !Array.isArray(seed.sections) || !seed.sections.length) throw new Error('Seed brief must contain worked sections from the same source')
    spec.sections = seed.sections
  }
  if (flags.outline && command !== 'chapter') throw new Error('--outline supplies a saved plan to chapter')
  const qmd = await readFile(spec.source.file, 'utf8')
  const sourceHash = digest(qmd)
  const rates = flags.rates ? JSON.parse(await readFile(flags.rates, 'utf8')) : undefined
  const priceModels = command === 'outline' ? ['gpt-6.2-sol'] : ['gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna']
  if (rates) for (const model of new Set(priceModels.map(route))) {
    if (!['input', 'cachedInput', 'output'].every(k => Number.isFinite(rates[model]?.[k]) && rates[model][k] >= 0)) throw new Error('Missing USD-per-million rates for ' + model)
  }
  const folder = path.resolve(flags.out)
  const receiptFile = path.join(folder, 'run.json')
  const partial = path.join(folder, '.packet')
  const receipt = { id: spec.id, title: spec.title, profile: 'chapter', chapterProfile, command, sourceUrl: spec.source.url,
    sourceHash, specHash: digest(JSON.stringify(spec)), status: 'working', sections: [], calls: [] }
  const maxCalls = Number(flags['max-calls'] ?? (command === 'outline' ? 2 : 24))
  const tokenStop = flags['stop-after-tokens'] === undefined ? null : Number(flags['stop-after-tokens'])
  const worker = budgetedDispatcher(receipt, flags.cache, maxCalls, tokenStop)
  await mkdir(path.dirname(folder), { recursive: true })
  await mkdir(folder)
  const started = Date.now()
  let pendingSave = Promise.resolve()
  const save = () => {
    receipt.tokens = totals(receipt.calls, rates)
    receipt.usageIncomplete = receipt.calls.some(c => c.error && !c.usage && !/^(Live call limit|Token threshold) reached/.test(c.error))
    receipt.elapsedMs = Date.now() - started
    const snapshot = structuredClone(receipt)
    pendingSave = pendingSave.then(() => writeJson(receiptFile, snapshot))
    return pendingSave
  }
  const dispatch = async ({ role, model: requestedModel, effort, prompt, sectionIds = [] }) => {
    const model = route(requestedModel)
    const trace = { role, model, effort, sections: sectionIds, promptBytes: Buffer.byteLength(prompt) }
    receipt.calls.push(trace)
    try {
      const result = await worker({ role, model, effort, prompt })
      const { cached, key, usage, originalUsage } = result
      Object.assign(trace, { cached, key, usage, originalUsage })
      return result
    } catch (error) {
      Object.assign(trace, { error: error.message, usage: error.usage })
      throw error
    } finally {
      await save()
    }
  }
  await save()
  try {
    const planner = await import('./chapter-plan.mjs')
    let plan
    if (flags.outline) {
      const saved = JSON.parse(await readFile(flags.outline, 'utf8'))
      if (saved.id !== spec.id || saved.sourceHash !== sourceHash || saved.specHash !== receipt.specHash) throw new Error('Saved outline belongs to a different spec or source revision')
      plan = planner.validateChapterPlan(saved.plan, planner.chapterEvidence(qmd))
      receipt.outlineSource = path.resolve(flags.outline)
    } else {
      plan = await planner.planChapter(spec, qmd, dispatch)
      if (plan.copyEdits !== undefined) throw new Error('Editorial copy edits must come from a saved outline')
    }
    const envelope = { id: spec.id, sourceHash, specHash: receipt.specHash, plan }
    await writeJson(path.join(folder, 'outline.json'), envelope)
    receipt.sections = plan.sections.map(({ id, heading, sourceHeadings }) => ({ id, heading, sourceHeadings }))
    if (command === 'outline') {
      receipt.status = 'planned'
    } else {
      const { writeChapter } = await import('./chapter-write.mjs')
      receipt.reviews = []
      const artifacts = await writeChapter(spec, qmd, plan, dispatch, {
        async onDraft(draft) {
          await writeArtifacts(path.join(folder, 'first-draft'), draft)
        },
        async onReview(outcome) {
          receipt.reviews.push(outcome)
          await save()
        },
      })
      await writeArtifacts(partial, artifacts)
      await rename(partial, path.join(folder, 'packet'))
      receipt.status = 'accepted'
    }
  } catch (error) {
    receipt.status = 'blocked'
    receipt.error = error.message
  } finally {
    await rm(partial, { recursive: true, force: true })
    await save()
  }
  return receipt
}
