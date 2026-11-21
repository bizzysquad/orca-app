import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_RULES, normalizeRules } from '../../src/lib/spades/rules.ts'
import { computeMatch, matchOutcome, scoreHand, scoreTeamHand, validBooks, elapsedMs } from '../../src/lib/spades/scoring.ts'
import { generateBracket, nextSlot, seedPositions, roundName } from '../../src/lib/spades/bracket.ts'

const R = { ...DEFAULT_RULES, bagsEnabled: true } // classic bag scoring

test('9. made bid: bid 5 win 7 = +52 and 2 bags', () => {
  const r = scoreTeamHand(5, 7, 0, R)
  assert.equal(r.made, true)
  assert.equal(r.points, 52)
  assert.equal(r.bagsEarned, 2)
  assert.equal(r.bagsAfter, 2)
})

test('10. set bid: bid 5 win 4 = minus 50, no bags', () => {
  const r = scoreTeamHand(5, 4, 3, R)
  assert.equal(r.made, false)
  assert.equal(r.points, -50)
  assert.equal(r.bagsEarned, 0)
  assert.equal(r.bagsAfter, 3)
})

test('11. bags accumulate across hands', () => {
  const c = computeMatch([
    { id: 'h1', handNumber: 1, bidA: 4, bidB: 6, booksA: 7, booksB: 6 },
    { id: 'h2', handNumber: 2, bidA: 4, bidB: 6, booksA: 7, booksB: 6 },
  ], R)
  assert.equal(c.a.bags, 6)
  assert.equal(c.a.total, 86)
  assert.equal(c.b.bags, 0)
  assert.equal(c.b.total, 120)
})

test('12. bag penalty: every 10 bags costs 100, leftovers carry', () => {
  const r = scoreTeamHand(4, 9, 7, R) // 5 extra -> 12 bags -> penalty, 2 left
  assert.equal(r.bagPenalty, 100)
  assert.equal(r.bagsAfter, 2)
  assert.equal(r.points, 40 + 5 - 100)
  const big = scoreTeamHand(0, 13, 19, { ...R, minTeamBid: 0 }) // 13 extra -> 32 -> 3 penalties
  assert.equal(big.bagPenalty, 300)
  assert.equal(big.bagsAfter, 2)
})

test('12b. configurable initial bags', () => {
  const rules = normalizeRules({ initialBags: 8, bagsEnabled: true })
  const c = computeMatch([{ id: 'h', handNumber: 1, bidA: 4, bidB: 4, booksA: 6, booksB: 7 }], rules)
  assert.equal(c.a.bags, 0) // 8 + 2 = 10 -> penalty
  assert.equal(c.a.total, 42 - 100)
  assert.equal(c.b.bags, 1) // 8 + 3 = 11 -> 1
})

test('13. negative scores are kept as integers', () => {
  const c = computeMatch([
    { id: 'h1', handNumber: 1, bidA: 8, bidB: 4, booksA: 3, booksB: 10 },
    { id: 'h2', handNumber: 2, bidA: 7, bidB: 4, booksA: 2, booksB: 11 },
  ], R)
  assert.equal(c.a.total, -150)
  assert.ok(Number.isInteger(c.a.total))
})

test('renege policy: offender loses bid, other side scores its bid, no bags', () => {
  const r = scoreHand({ bidA: 5, bidB: 6, booksA: 8, booksB: 5, renegeSide: 'a' }, { a: { total: 100, bags: 4 }, b: { total: 50, bags: 3 } }, R)
  assert.equal(r.a.points, -50)
  assert.equal(r.b.points, 60)
  assert.equal(r.a.bagsAfter, 4)
  assert.equal(r.b.bagsAfter, 3)
  assert.equal(r.a.bagsEarned + r.b.bagsEarned, 0)
})

test('7. books must total exactly 13', () => {
  assert.equal(validBooks(7, 6), true)
  assert.equal(validBooks(7, 7), false)
  assert.equal(validBooks(-1, 14), false)
  assert.equal(validBooks(6.5, 6.5), false)
})

test('14/16. outcomes: target, tie above target, championship target', () => {
  assert.deepEqual(matchOutcome(260, 240, 250, false), { done: true, winner: 'a', reason: 'target', tiebreak: false })
  assert.deepEqual(matchOutcome(270, 280, 250, false), { done: true, winner: 'b', reason: 'target', tiebreak: false })
  assert.equal(matchOutcome(260, 260, 250, false).tiebreak, true)
  assert.equal(matchOutcome(300, 200, 350, false).done, false) // championship plays to 350
  assert.equal(matchOutcome(352, 200, 350, false).done, true)
})

test('15. time limit: higher score wins, tie keeps playing', () => {
  assert.deepEqual(matchOutcome(120, 90, 250, true), { done: true, winner: 'a', reason: 'time', tiebreak: false })
  assert.equal(matchOutcome(100, 100, 250, true).tiebreak, true)
  const start = '2026-11-21T20:45:00Z'
  assert.equal(elapsedMs(start, 60000, null, new Date('2026-11-21T20:55:00Z')), 9 * 60000)
})

test('rules normalization keeps nil off and clamps values', () => {
  const r = normalizeRules({ nilAllowed: true, minTeamBid: 99, biddingMode: 'captain', targetFinal: '350' })
  assert.equal(r.nilAllowed, false)
  assert.equal(r.minTeamBid, 13)
  assert.equal(r.biddingMode, 'captain')
  assert.equal(r.targetFinal, 350)
})

test('bracket: 8 team seeding, advancement slots, byes', () => {
  assert.deepEqual(seedPositions(8), [1, 8, 4, 5, 2, 7, 3, 6])
  const ids = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
  const b = generateBracket(ids, 8)
  assert.equal(b.length, 7)
  assert.deepEqual(b.filter(x => x.round === 1).map(x => [x.teamA, x.teamB]), [['s1', 's8'], ['s4', 's5'], ['s2', 's7'], ['s3', 's6']])
  assert.deepEqual(nextSlot(1, 3, 3), { round: 2, slot: 1, side: 'b' })
  assert.equal(nextSlot(3, 0, 3), null)
  const withByes = generateBracket(['s1', 's2', 's3', 's4', 's5', 's6'], 8)
  assert.equal(withByes.filter(x => x.bye).length, 2)
  assert.equal(roundName(3, 3), 'Championship')
  assert.throws(() => generateBracket(['a', 'a'], 2))
})

test('no bags (default): extra books score 1 each, never counted, never penalized', () => {
  const r = normalizeRules({})
  assert.equal(r.bagsEnabled, false)
  const c = computeMatch(Array.from({ length: 6 }, (_, i) => ({ id: `h${i}`, handNumber: i + 1, bidA: 4, bidB: 4, booksA: 9, booksB: 4 })), r)
  assert.equal(c.a.total, 6 * 45) // 40 + 5 extra each hand, no penalty ever
  assert.equal(c.a.bags, 0)
})
