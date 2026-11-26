import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { summarizeRun, totals } from './metrics.mjs'
import { budgetedDispatcher, writeArtifacts } from './run-output.mjs'
import { createHash } from 'node:crypto'
import { generatePackets, planLesson, profiles } from './pipeline.mjs'

function print(data) { process.stdout.write(JSON.stringify(data, null, 2) + '\n') }

async function main() {
  const { positionals: [command, file, ...extra], values: flags } = parseArgs({ allowPositionals: true, options: {
    profile: { type: 'string' }, out: { type: 'string' }, cache: { type: 'string', default: '.cache/study-engine/cache' },
    'review-size': { type: 'string', default: '2' }, 'stop-after-tokens': { type: 'string' },
    'max-calls': { type: 'string' }, rates: { type: 'string' }, outline: { type: 'string' },
  } })
  if (command === 'outline' || command === 'chapter') {
    if (!file || extra.length || !flags.out) throw new Error('Use outline|chapter SPEC --out NEW_DIR with one chapter spec')
    const { runChapter } = await import('./chapter-cli.mjs')
    const receipt = await runChapter(command, file, flags)
    print({ out: path.resolve(flags.out), status: receipt.status, sections: receipt.sections.length, liveCalls: receipt.liveCalls, tokens: receipt.tokens, error: receipt.error })
    if (receipt.status === 'blocked') process.exitCode = 1
    return
  }
  if (flags.outline) throw new Error('--outline applies to the chapter command')
  flags.profile ??= 'lean'
  if (command === 'report' && file) {
    const rates = flags.rates ? JSON.parse(await readFile(flags.rates, 'utf8')) : undefined
    return print(await Promise.all([file, ...extra].map(async directory => ({
      directory, ...summarizeRun(JSON.parse(await readFile(path.join(directory, 'run.json'), 'utf8')), rates),
    }))))
  }
  if (!['plan', 'run'].includes(command) || !file || !Object.hasOwn(profiles, flags.profile)) throw new Error('Usage: node scripts/study-engine/index.mjs outline|chapter SPEC --out NEW_DIR, report RUN_DIR..., or plan|run BRIEF... [--profile lean|reference] [--review-size 1..4] [--out NEW_DIR] [--max-calls N] [--stop-after-tokens N] [--rates FILE]')
  const plans = await Promise.all([file, ...extra].map(async name => {
    const brief = JSON.parse(await readFile(name, 'utf8'))
    return planLesson(brief, await readFile(brief.source.file, 'utf8'))
  }))
  const routing = profiles[flags.profile]
  const reviewSize = Number(flags['review-size'])
  if (!Number.isInteger(reviewSize) || reviewSize < 1 || reviewSize > 4) throw new Error('Review size must be 1–4')
  const describe = ({ brief, sourceHash, sourceBytes }) => ({
    id: brief.id, title: brief.title, sourceUrl: brief.source.url, sourceHash, sourceBytes,
    briefHash: createHash('sha256').update(JSON.stringify(brief)).digest('hex'),
  })
  const info = { ...(plans.length === 1 ? describe(plans[0]) : { packets: plans.map(describe) }), profile: flags.profile, routing, reviewSize }
  if (command === 'plan') return print({ ...info,
    coverage: plans.map(p => ({ id: p.brief.id, otherSourceHeadings: p.unrepresented })),
    sections: plans.flatMap(plan => plan.sections.map(({ section, evidence }) => ({
    chapter: plan.brief.id, id: section.id, excerptBytes: evidence.excerptBytes, ranges: evidence.excerpts.map(e => [e.startLine, e.endLine]), containsDynamicSource: evidence.needsVerification,
  }))) })
  if (!flags.out) throw new Error('Run requires --out NEW_DIR')
  const max = Number(flags['max-calls'] ?? plans.reduce((n, plan) => n + plan.sections.length * 4, 0))
  if (!Number.isSafeInteger(max) || max < 0) throw new Error('Invalid --max-calls')
  const tokenStop = flags['stop-after-tokens'] === undefined ? null : Number(flags['stop-after-tokens'])
  if (tokenStop !== null && (!Number.isSafeInteger(tokenStop) || tokenStop < 0)) throw new Error('Invalid --stop-after-tokens')
  const rates = flags.rates ? JSON.parse(await readFile(flags.rates, 'utf8')) : undefined
  if (rates) for (const { model } of Object.values(routing)) {
    if (!['input', 'cachedInput', 'output'].every(k => Number.isFinite(rates[model]?.[k]) && rates[model][k] >= 0)) throw new Error('Missing USD-per-million rates for ' + model)
  }
  const out = path.resolve(flags.out)
  await mkdir(path.dirname(out), { recursive: true })
  await mkdir(out)
  const receipt = { ...info, status: 'working', sections: [], calls: [], maxCalls: max, stopAfterTokens: tokenStop, liveCalls: 0 }
  const dispatch = budgetedDispatcher(receipt, flags.cache, max, tokenStop)
  const stage = path.join(out, '.partial')
  const start = Date.now()
  try {
    const packets = await generatePackets(plans, routing, dispatch, receipt, reviewSize)
    if (plans.length === 1) {
      await writeArtifacts(stage, packets[0])
      await rename(stage, path.join(out, 'packet'))
    } else {
      for (const [i, plan] of plans.entries()) {
        const dir = path.join(stage, plan.brief.id)
        await writeArtifacts(path.join(dir, 'packet'), packets[i])
        await writeFile(path.join(dir, 'run.json'), JSON.stringify({ ...describe(plan), status: 'accepted', sharedReceipt: '../../../run.json' }, null, 2) + '\n')
      }
      await rename(stage, path.join(out, 'packets'))
    }
    receipt.status = 'accepted'
  } catch (error) {
    receipt.status = 'blocked'
    receipt.error = error.message
    process.exitCode = 1
  } finally {
    await rm(stage, { recursive: true, force: true })
    Object.assign(receipt, { elapsedMs: Date.now() - start, tokens: totals(receipt.calls, rates), usageIncomplete: receipt.calls.some(c => c.error && !c.usage && !/^(Live call limit|Token threshold) reached/.test(c.error)) })
    await writeFile(path.join(out, 'run.json'), JSON.stringify(receipt, null, 2) + '\n')
    print({ out, status: receipt.status, liveCalls: receipt.liveCalls, tokens: receipt.tokens, error: receipt.error, usageIncomplete: receipt.usageIncomplete })
  }
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1 })
