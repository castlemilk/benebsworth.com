const toyExperts = [
  { id: 'A', logit: 2 },
  { id: 'B', logit: 1 },
  { id: 'C', logit: 0 },
] as const

export function routeToyToken(cBias: number) {
  const ranked = toyExperts.map(({ id, logit }) => ({
    id,
    logit,
    score: logit + (id === 'C' ? cBias : 0),
    weight: 1 / (1 + Math.exp(-logit)),
  }))
  const winners = new Set([...ranked].sort((a, b) => b.score - a.score).slice(0, 2).map(({ id }) => id))
  return ranked.map((expert) => ({ ...expert, selected: winners.has(expert.id) }))
}

export function cacheBudget(tokens: number, bytesPerValue: 1 | 2) {
  const gibPerPosition = (2 * 4 * 128 * bytesPerValue) / 2 ** 30
  const local = 40 * Math.min(tokens, 513) * gibPerPosition
  const global = 10 * tokens * gibPerPosition
  return { local, global, hybrid: local + global, full: 50 * tokens * gibPerPosition }
}
