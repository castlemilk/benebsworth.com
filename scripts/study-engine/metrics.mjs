export function totals(calls, rates) {
  const usage = { input: 0, cachedInput: 0, output: 0 }
  let usd = 0
  for (const call of calls) {
    if (!call.usage) continue
    for (const key of Object.keys(usage)) usage[key] += call.usage[key]
    if (rates) {
      const { input, cachedInput, output } = call.usage
      const p = rates[call.model]
      if (!['input', 'cachedInput', 'output'].every(k => Number.isFinite(p?.[k]) && p[k] >= 0)) throw new Error('Missing USD-per-million rates for ' + call.model)
      usd += ((input - cachedInput) * p.input + cachedInput * p.cachedInput + output * p.output) / 1e6
    }
  }
  return { ...usage, total: usage.input + usage.output, ...(rates ? { estimatedUsd: usd } : {}) }
}

export function summarizeRun(receipt, rates) {
  if (!Array.isArray(receipt.calls)) throw new Error('Use the top-level run.json that records model calls')
  const calls = receipt.calls
  return {
    status: receipt.status, profile: receipt.profile, ...(receipt.chapterProfile ? { chapterProfile: receipt.chapterProfile } : {}), liveCalls: receipt.liveCalls,
    acceptedSections: receipt.status === 'accepted' ? receipt.sections.length : 0,
    incremental: totals(calls, rates),
    includingOriginalCallsBehindCacheHits: totals(calls.map(c => ({ ...c, usage: c.originalUsage ?? c.usage })), rates),
    usageIncomplete: receipt.usageIncomplete,
  }
}
