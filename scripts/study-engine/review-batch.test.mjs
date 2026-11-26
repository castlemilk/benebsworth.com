import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBatchPrompt, createReviewBatch, unpackBatchReply } from './review-batch.mjs'

const profile = { model: 'gpt-6.1-terra', effort: 'low' }
const items = Array.from({ length: 5 }, (_, i) => ({ section: `s${i}`, prompt: `evidence ${i}` }))
const pass = { verdict: 'pass', issues: [] }
const revise = { verdict: 'revise', issues: ['Fix the calculation'] }

test('batch prompt carries shared rubric once and individual payloads', () => {
  const prompt = buildBatchPrompt(items.slice(0, 2), 'Unique shared rubric')
  assert.equal(prompt.split('Unique shared rubric').length - 1, 1)
  assert.match(prompt, /evidence 0/)
  assert.match(prompt, /evidence 1/)
})

test('rejects missing, extra, duplicate and invalid reviews', () => {
  const valid = { section: 's0', ...pass }
  const second = { section: 's1', ...revise }
  const encode = (reviews) => JSON.stringify({ reviews })
  assert.deepEqual(unpackBatchReply(encode([second, valid]), ['s0', 's1']), { s1: revise, s0: pass })
  for (const replies of [[valid], [valid, second, { section: 'extra', ...pass }], [valid, valid, second], [valid, { section: 's1', verdict: 'pass', issues: ['bad'] }], [valid, { section: 's1', verdict: 'revise', issues: [] }]]) {
    assert.throws(() => unpackBatchReply(encode(replies), ['s0', 's1']))
  }
  assert.throws(() => unpackBatchReply('{', ['s0']))
})

test('partitions into batches and preserves the ordinary single prompt and receipts', async () => {
  const requests = []
  const replies = [
    { text: JSON.stringify({ reviews: items.slice(0, 4).map(({ section }) => ({ section, ...pass })) }), usage: { input: 10 } },
    { text: JSON.stringify(revise), usage: { input: 5 } },
  ]
  const dispatch = async (request) => { requests.push(request); return replies.shift() }
  const coordinator = createReviewBatch({ dispatch, profile, rubric: 'Review rubric' })
  const result = await coordinator.review(items)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].role, 'reviewer')
  assert.equal(requests[0].model, profile.model)
  assert.equal(requests[1].prompt, 'Review rubric\nevidence 4')
  assert.deepEqual(result.outcomes.s4, revise)
  assert.equal(result.responses.length, 2)
})

test('without a rubric a single call preserves the complete prompt', async () => {
  let called
  const response = { text: JSON.stringify(pass), cached: true }
  const review = createReviewBatch({ profile, dispatch: async (request) => { called = request; return response } })
  assert.deepEqual(await review.review([items[0]]), { outcomes: { s0: pass }, responses: [response] })
  assert.equal(called.prompt, items[0].prompt)
})

test('failure includes completed responses for accounting and never yields partial outcomes', async () => {
  const response = { text: JSON.stringify({ reviews: [{ section: 's0', ...pass }] }), usage: { input: 123 } }
  const review = createReviewBatch({ profile, dispatch: async () => response })
  await assert.rejects(review.review(items.slice(0, 2)), (error) => {
    assert.match(error.message, /Missing/)
    assert.deepEqual(error.responses, [response])
    return true
  })
})

test('rejects malformed requests before dispatch', async () => {
  assert.throws(() => createReviewBatch({ profile, dispatch: () => {}, maxSize: 5 }))
  let calls = 0
  const review = createReviewBatch({ profile, dispatch: async () => { calls++ } })
  await assert.rejects(review.review([]))
  await assert.rejects(review.review([items[0], items[0]]), /Duplicate/)
  assert.equal(calls, 0)
})
