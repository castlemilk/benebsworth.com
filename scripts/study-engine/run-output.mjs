import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDispatcher } from './agents.mjs'
import { totals } from './metrics.mjs'

export async function writeArtifacts(directory, artifacts) {
  for (const [name, content] of artifacts) {
    const target = path.join(directory, name)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
}

export function budgetedDispatcher(receipt, cacheDir, maxCalls, tokenStop) {
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 0) throw new Error('Invalid --max-calls')
  if (tokenStop !== null && (!Number.isSafeInteger(tokenStop) || tokenStop < 0)) throw new Error('Invalid --stop-after-tokens')
  Object.assign(receipt, { maxCalls, stopAfterTokens: tokenStop, liveCalls: 0 })
  return createDispatcher({ cacheDir, beforeInvoke() {
    if (receipt.liveCalls >= maxCalls) throw new Error('Live call limit reached (' + maxCalls + ')')
    if (tokenStop !== null && totals(receipt.calls).total >= tokenStop) throw new Error('Token threshold reached before the next call')
    receipt.liveCalls++
  } })
}

export async function writeJson(file, value) {
  const partial = file + '.partial'
  await writeFile(partial, JSON.stringify(value, null, 2) + '\n')
  await rename(partial, file)
}
