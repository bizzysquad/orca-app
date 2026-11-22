import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addHand, computeQuick, defaultSetup, nextSeat, resultText, scoreSide, seatName, undoHand, type QuickGame } from '../../src/lib/spades/quickgame.ts'

function game(over: Partial<ReturnType<typeof defaultSetup>> = {}, firstDealer = 0): QuickGame {
  return { setup: { ...defaultSetup(), teamA: 'Aces', teamB: 'Kings', ...over }, firstDealer, hands: [], startedAt: '2026-11-22T00:00:00Z' }
}
function play(g: QuickGame, bidA: number | null, bidB: number | null, booksA: number): QuickGame {
  const r = addHand(g, { bidA, bidB, booksA })
  if (typeof r === 'string') throw new Error(r)
  return r
}

test('first hand books bid themselves at 10 per book', () => {
  const g = play(game(), 5, 5, 8) // bids ignored on the first hand
  const st = computeQuick(g)
  assert.equal(g.hands[0].bidA, null)
  assert.equal(st.current.totalA, 80)
  assert.equal(st.current.totalB, 50)
  assert.equal(st.nextIsFirstHand, false)
})

test('made bid scores 10 per book bid, extras earn nothing by default, set scores 0', () => {
  const s = game().setup
  assert.deepEqual(scoreSide(5, 7, s), { bid: 5, books: 7, made: true, points: 50 })
  assert.deepEqual(scoreSide(5, 4, s), { bid: 5, books: 4, made: false, points: 0 })
  assert.equal(scoreSide(5, 4, { ...s, setLoses: true }).points, -50)
  assert.equal(scoreSide(5, 7, { ...s, extraBookPoints: 1 }).points, 52)
})

test('second hand needs both bids', () => {
  const g = play(game(), null, null, 7)
  assert.equal(typeof addHand(g, { bidA: 4, bidB: null, booksA: 6 }), 'string')
})

test('dealer rotates clockwise from the chosen first dealer', () => {
  let g = game({}, 2)
  assert.equal(computeQuick(g).nextDealer, 2)
  g = play(g, null, null, 7)
  assert.equal(computeQuick(g).nextDealer, 3)
  g = play(g, 4, 4, 6)
  assert.equal(computeQuick(g).nextDealer, 0)
  assert.equal(nextSeat(3), 0)
})

test('one game ends when a team passes the target ahead', () => {
  let g = game({ target: 100 })
  g = play(g, null, null, 9) // 90 - 40
  g = play(g, 3, 5, 4) // A +30 = 120, B 9 books bid 5 +50 = 90
  const st = computeQuick(g)
  assert.equal(st.done, true)
  assert.equal(st.winner, 'a')
  assert.equal(typeof addHand(g, { bidA: 1, bidB: 1, booksA: 1 }), 'string')
})

test('tied at the target keeps playing', () => {
  let g = game({ target: 100 })
  g = play(g, null, null, 5) // 50 - 80
  g = play(g, 5, 2, 5) // A +50 = 100, B bid 2 took 8 = +20 = 100
  const st = computeQuick(g)
  assert.equal(st.done, false)
  assert.equal(st.tiedAtTarget, true)
})

test('best 2 of 3: new game resets scores and its first hand bids itself', () => {
  let g = game({ target: 100, gamesToWin: 2 })
  g = play(g, null, null, 13) // A 130 wins game 1
  let st = computeQuick(g)
  assert.equal(st.winsA, 1)
  assert.equal(st.done, false)
  assert.equal(st.currentGame, 2)
  assert.equal(st.nextIsFirstHand, true)
  assert.equal(st.current.totalA, 0)
  g = play(g, 4, 4, 0) // first hand of game 2: B 130
  st = computeQuick(g)
  assert.equal(g.hands[1].bidA, null)
  assert.equal(st.winsB, 1)
  g = play(g, null, null, 11)
  st = computeQuick(g)
  assert.equal(st.done, true)
  assert.equal(st.winner, 'a')
  assert.equal(st.games.length, 3)
  assert.match(resultText(g, st), /Aces win the series 2 to 1/)
})

test('undo takes back the last hand, even one that ended a game', () => {
  let g = game({ target: 100 })
  g = play(g, null, null, 13)
  assert.equal(computeQuick(g).done, true)
  g = undoHand(g)
  assert.equal(computeQuick(g).done, false)
  assert.equal(g.hands.length, 0)
})

test('blank player names fall back to team name', () => {
  const s = { ...game().setup, players: ['Dre', '', '', ''] as [string, string, string, string] }
  assert.equal(seatName(s, 0), 'Dre')
  assert.equal(seatName(s, 3), 'Kings player 2')
})
