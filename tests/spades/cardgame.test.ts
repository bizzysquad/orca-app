import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  beats, cardRank, collectTrick, isPracticeGame, legalCards, makeDeck, newPractice, nextHand, placeBid, playCard,
  RULE_SETS, scoreTeam, shuffle, trickWinner, whyIllegal, type PracticeGame,
} from '../../src/lib/spades/cardgame.ts'
import { botBid, botPlay, explainTrick } from '../../src/lib/spades/bots.ts'

const house = RULE_SETS.house
const std = RULE_SETS.standard

function ok(r: PracticeGame | string): PracticeGame {
  if (typeof r === 'string') throw new Error(r)
  return r
}

// Plays every seat with the bot until the hand is scored.
function playHand(g: PracticeGame): PracticeGame {
  let x = g
  let guard = 0
  while (x.phase !== 'handover') {
    if (++guard > 500) throw new Error('hand did not finish')
    if (x.phase === 'bidding') x = ok(placeBid(x, x.turn, botBid(x, x.turn).bid))
    else if (x.trick.length === 4) x = ok(collectTrick(x))
    else {
      const a = botPlay(x, x.turn)
      assert.ok(legalCards(x, x.turn).includes(a.card), `bot picked an illegal card ${a.card}`)
      assert.ok(a.reason.length > 0)
      x = ok(playCard(x, x.turn, a.card))
    }
  }
  return x
}

test('house deck: jokers in, 2 of hearts and 2 of diamonds out, 52 cards', () => {
  const d = makeDeck(house)
  assert.equal(d.length, 52)
  assert.ok(d.includes('BJ') && d.includes('LJ'))
  assert.ok(!d.includes('2H') && !d.includes('2D'))
  assert.equal(d.filter(c => c === 'BJ' || c === 'LJ' || c[1] === 'S').length, 15)
})

test('standard deck: plain 52, no jokers', () => {
  const d = makeDeck(std)
  assert.equal(d.length, 52)
  assert.ok(!d.includes('BJ') && d.includes('2H'))
})

test('house trump order: Big Joker, Little Joker, 2 of spades, Ace of spades', () => {
  assert.ok(cardRank('BJ', house) > cardRank('LJ', house))
  assert.ok(cardRank('LJ', house) > cardRank('2S', house))
  assert.ok(cardRank('2S', house) > cardRank('AS', house))
  assert.ok(cardRank('AS', std) > cardRank('2S', std))
})

test('trick winner: spades beat other suits, otherwise highest of the suit led', () => {
  const w = (cards: string[], rs = house) => trickWinner(cards.map((card, seat) => ({ seat, card })), rs)!.seat
  assert.equal(w(['KH', 'AH', '3S', 'QH']), 2)
  assert.equal(w(['KH', 'AH', 'AD', 'QH']), 1)
  assert.equal(w(['AS', '2S', 'LJ', 'KS']), 2)
  assert.equal(w(['AS', '2S', 'KS', 'QS'], std), 0)
  assert.equal(w(['5C', 'BJ', '2S', 'AC']), 1)
  assert.ok(beats('LJ', 'AH', 'H', house))
  assert.ok(!beats('AD', '3H', 'H', house))
})

test('first hand of a house game bids itself and starts in play', () => {
  const g = newPractice({ rules: 'house', learn: true, gamesToWin: 1, seed: 7 })
  assert.equal(g.bidItself, true)
  assert.equal(g.phase, 'playing')
  assert.equal(g.turn, (g.dealer + 1) % 4)
  assert.deepEqual(g.hands.map(h => h.length), [13, 13, 13, 13])
  const all = g.hands.flat()
  assert.equal(new Set(all).size, 52)
})

test('standard first hand has bidding in seat order from left of the dealer', () => {
  let g = newPractice({ rules: 'standard', learn: false, gamesToWin: 1, seed: 11 })
  assert.equal(g.phase, 'bidding')
  const first = g.turn
  assert.equal(first, (g.dealer + 1) % 4)
  assert.equal(typeof placeBid(g, (first + 1) % 4, 3), 'string')
  for (let i = 0; i < 4; i++) g = ok(placeBid(g, g.turn, 3))
  assert.equal(g.phase, 'playing')
  assert.equal(g.turn, first)
})

test('must follow suit; jokers count as spades; spades cannot be led until broken', () => {
  const base = newPractice({ rules: 'house', learn: true, gamesToWin: 1, seed: 1 })
  const g: PracticeGame = { ...base, hands: [['AH', '3H', 'BJ', '4S', '9C'], ['2C'], ['3C'], ['4C']], turn: 0, trick: [], spadesBroken: false }
  assert.deepEqual(legalCards(g, 0).sort(), ['3H', '9C', 'AH'].sort())
  assert.match(whyIllegal(g, 0, 'BJ')!, /Jokers count as spades/)
  const led: PracticeGame = { ...g, turn: 0, trick: [{ seat: 3, card: 'KH' }] }
  assert.deepEqual(legalCards(led, 0).sort(), ['3H', 'AH'])
  assert.match(whyIllegal(led, 0, '4S')!, /follow suit/)
  const spadeLed: PracticeGame = { ...g, turn: 0, trick: [{ seat: 3, card: 'KS' }] }
  assert.deepEqual(legalCards(spadeLed, 0).sort(), ['4S', 'BJ'])
  const onlySpades: PracticeGame = { ...g, hands: [['4S', 'LJ'], [], [], []] }
  assert.deepEqual(legalCards(onlySpades, 0).sort(), ['4S', 'LJ'])
})

test('house scoring: 10 per book bid, extras 0, set 0, first hand counts every book', () => {
  const bids = [3, 2, 2, 2]
  assert.equal(scoreTeam(house, 'a', bids, [4, 0, 3, 0], 0, false).points, 50)
  assert.equal(scoreTeam(house, 'a', bids, [2, 0, 2, 0], 0, false).points, 0)
  assert.equal(scoreTeam(house, 'a', [null, null, null, null], [4, 0, 4, 0], 0, true).points, 80)
  // A house 0 bid is not nil: it is just part of the team bid.
  assert.equal(scoreTeam(house, 'a', [0, 0, 4, 0], [2, 0, 3, 0], 0, false).points, 40)
})

test('standard scoring: set loses, extras are bags, 10 bags cost 100, nil is +/-100', () => {
  assert.equal(scoreTeam(std, 'a', [3, 0, 2, 0], [4, 0, 3, 0], 0, false).points, 52)
  assert.equal(scoreTeam(std, 'a', [3, 0, 2, 0], [2, 0, 2, 0], 0, false).points, -50)
  const bagged = scoreTeam(std, 'a', [3, 0, 2, 0], [5, 0, 3, 0], 8, false)
  assert.equal(bagged.bagsAfter, 1)
  assert.equal(bagged.points, 50 + 3 - 100)
  const nilMade = scoreTeam(std, 'a', [0, 0, 4, 0], [0, 0, 5, 0], 0, false)
  assert.equal(nilMade.points, 100 + 40 + 1)
  const nilMissed = scoreTeam(std, 'a', [0, 0, 4, 0], [2, 0, 4, 0], 0, false)
  assert.equal(nilMissed.points, -100 + 40 + 2)
  assert.equal(nilMissed.bagsAfter, 2)
})

test('shuffle is repeatable from a seed', () => {
  const [a] = shuffle(makeDeck(house), 42)
  const [b] = shuffle(makeDeck(house), 42)
  assert.deepEqual(a, b)
})

test('a full hand: 13 books, every move legal, score recorded', () => {
  const g = playHand(newPractice({ rules: 'standard', learn: true, gamesToWin: 1, seed: 99 }))
  assert.equal(g.won.reduce((t, n) => t + n, 0), 13)
  assert.equal(g.tricks.length, 13)
  assert.ok(g.hands.every(h => h.length === 0))
  assert.equal(g.history.length, 1)
  assert.equal(g.scoreA, g.lastResult!.a.points)
})

test('bots finish whole matches under both rule sets', () => {
  for (const rules of ['house', 'standard'] as const) {
    for (let seed = 1; seed <= 12; seed++) {
      let g = newPractice({ rules, learn: false, gamesToWin: 2, seed })
      let hands = 0
      while (!g.matchWinner) {
        g = playHand(g)
        hands++
        assert.ok(hands < 400, 'match never ended')
        if (!g.matchWinner) {
          const prev = g
          g = ok(nextHand(g))
          if (prev.lastResult!.gameWinner) {
            assert.equal(g.scoreA, 0)
            assert.equal(g.handInGame, 1)
            assert.equal(g.bidItself, rules === 'house')
          }
          assert.equal(g.dealer, (prev.dealer + 1) % 4)
        }
      }
      assert.ok(g.winsA === 2 || g.winsB === 2)
      assert.equal(typeof nextHand(g), 'string')
    }
  }
})

test('bid advice is in range and explains itself', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = newPractice({ rules: 'standard', learn: true, gamesToWin: 1, seed })
    const a = botBid(g, g.turn)
    assert.ok(a.bid >= 0 && a.bid <= 13)
    assert.ok(a.reason.length > 10)
  }
})

test('trick explanations name the winner and the reason', () => {
  const names = ['You', 'Left', 'Partner', 'Right']
  const t = (cards: string[]) => cards.map((card, seat) => ({ seat, card }))
  assert.match(explainTrick(t(['KH', 'AH', '3S', 'QH']), house, names), /Partner trumped with the 3 of spades/)
  assert.match(explainTrick(t(['KH', 'BJ', '3S', 'QH']), house, names), /Big Joker/)
  assert.match(explainTrick(t(['KH', 'AH', '3D', 'QH']), house, names), /Left wins with the Ace of hearts/)
  assert.match(explainTrick(t(['AH', 'KH', '3H', '2S']), house, names), /3rd highest/)
})

test('saved games are recognized after a refresh', () => {
  const g = newPractice({ rules: 'house', learn: true, gamesToWin: 1, seed: 5 })
  assert.ok(isPracticeGame(JSON.parse(JSON.stringify(g))))
  assert.ok(!isPracticeGame({ version: 2 }))
})
