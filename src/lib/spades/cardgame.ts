// Practice spades: a full card game against computer players that runs
// entirely in the browser. Nothing here is sent to the server or saved in the
// database; the page keeps a game in progress in localStorage only.
//
// Seats go clockwise: 0 = you (south), 1 = left (west), 2 = partner (north),
// 3 = right (east). Seats 0 and 2 are team A, 1 and 3 are team B, the same
// convention as the scorekeeper (quickgame.ts). The deal moves one seat
// clockwise each hand and the player left of the dealer bids and leads first.
//
// Every move function returns a new game, or a string explaining why the move
// is not allowed. Imported by node:test too, so only erasable TypeScript.

import { HOUSE_RULES } from './rules.ts'

export type Suit = 'S' | 'H' | 'D' | 'C'
export type Side = 'a' | 'b'
export type RuleSetId = 'house' | 'standard'
export type Phase = 'bidding' | 'playing' | 'handover'

export const PRACTICE_KEY = 'spades-hq-practice'

export interface RuleSet {
  id: RuleSetId
  name: string
  // Joker deck: Big and Little Joker in, 2 of hearts and 2 of diamonds out,
  // and the 2 of spades ranks just under the jokers.
  jokers: boolean
  pointsPerBook: number
  // Points for each book over the bid.
  extraBookPoints: number
  // true = a set team loses its bid x pointsPerBook. false = a set scores 0.
  setLoses: boolean
  // A bid of 0 is nil: +nilPoints if that player takes no books, minus if not.
  nil: boolean
  nilPoints: number
  // Extra books are counted as bags; every bagLimit bags costs bagPenalty.
  bags: boolean
  bagLimit: number
  bagPenalty: number
  target: number
  // The first hand of every game has no bidding: each team scores every book.
  firstHandBidsItself: boolean
}

// House rules come from the same settings tournaments use, so the practice
// game always plays the way Spades HQ events are scored.
export const RULE_SETS: Record<RuleSetId, RuleSet> = {
  house: {
    id: 'house',
    name: 'House rules',
    jokers: true,
    pointsPerBook: HOUSE_RULES.pointsPerBook ?? 10,
    extraBookPoints: HOUSE_RULES.bagValue ?? 0,
    setLoses: (HOUSE_RULES.setPenaltyPerBook ?? 0) > 0,
    nil: false,
    nilPoints: 0,
    bags: false,
    bagLimit: 10,
    bagPenalty: 100,
    target: HOUSE_RULES.targetDefault ?? 250,
    firstHandBidsItself: HOUSE_RULES.firstHandBidsItself ?? true,
  },
  standard: {
    id: 'standard',
    name: 'Standard rules',
    jokers: false,
    pointsPerBook: 10,
    extraBookPoints: 1,
    setLoses: true,
    nil: true,
    nilPoints: 100,
    bags: true,
    bagLimit: 10,
    bagPenalty: 100,
    target: 500,
    firstHandBidsItself: false,
  },
}

export function ruleSet(id: RuleSetId): RuleSet {
  return RULE_SETS[id] || RULE_SETS.house
}

// ---------- cards ----------
// A card is a two letter id: rank (2-9, T, J, Q, K, A) then suit, e.g. "TH" is
// the 10 of hearts. The jokers are "BJ" and "LJ" and always count as spades.

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS: Suit[] = ['S', 'H', 'D', 'C']

export function isJoker(card: string): boolean {
  return card === 'BJ' || card === 'LJ'
}

export function cardSuit(card: string): Suit {
  return isJoker(card) ? 'S' : (card[1] as Suit)
}

export function isSpade(card: string): boolean {
  return cardSuit(card) === 'S'
}

// Higher wins within a suit. Joker deck: 2S = 15, LJ = 16, BJ = 17.
export function cardRank(card: string, rs: RuleSet): number {
  if (card === 'BJ') return 17
  if (card === 'LJ') return 16
  if (rs.jokers && card === '2S') return 15
  return RANKS.indexOf(card[0]) + 2
}

export function makeDeck(rs: RuleSet): string[] {
  const deck: string[] = []
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s)
  if (!rs.jokers) return deck
  return [...deck.filter(c => c !== '2H' && c !== '2D'), 'BJ', 'LJ']
}

const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }
const SUIT_SINGULAR: Record<Suit, string> = { S: 'spade', H: 'heart', D: 'diamond', C: 'club' }
const RANK_NAME: Record<string, string> = { T: '10', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' }

export function suitName(s: Suit): string {
  return SUIT_NAME[s]
}

export function suitSingular(s: Suit): string {
  return SUIT_SINGULAR[s]
}

export function suitSymbol(s: Suit): string {
  return s === 'S' ? '♠' : s === 'H' ? '♥' : s === 'D' ? '♦' : '♣'
}

// Face label: "A", "10", "2". Jokers return "BIG" and "LITTLE".
export function rankLabel(card: string): string {
  if (card === 'BJ') return 'BIG'
  if (card === 'LJ') return 'LITTLE'
  return card[0] === 'T' ? '10' : card[0]
}

// "Ace of hearts", "Big Joker".
export function cardName(card: string): string {
  if (card === 'BJ') return 'Big Joker'
  if (card === 'LJ') return 'Little Joker'
  return `${RANK_NAME[card[0]] || card[0]} of ${SUIT_NAME[cardSuit(card)]}`
}

// Spades first, then hearts, clubs, diamonds (alternating colors), high to low.
export function sortHand(cards: string[], rs: RuleSet): string[] {
  const order: Record<Suit, number> = { S: 0, H: 1, C: 2, D: 3 }
  return [...cards].sort((x, y) => order[cardSuit(x)] - order[cardSuit(y)] || cardRank(y, rs) - cardRank(x, rs))
}

// ---------- seats ----------

export function seatSide(seat: number): Side {
  return seat % 2 === 0 ? 'a' : 'b'
}

export function sideSeats(side: Side): [number, number] {
  return side === 'a' ? [0, 2] : [1, 3]
}

export function nextSeat(seat: number): number {
  return (seat + 1) % 4
}

// ---------- seeded shuffle (mulberry32) ----------
// The seed lives on the game so a refresh deals the same way.

function random(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

export function shuffle(cards: string[], seed: number): [string[], number] {
  const out = [...cards]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    const [r, n] = random(s)
    s = n
    const j = Math.floor(r * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, s]
}

// ---------- game state ----------

export interface PlayedCard { seat: number; card: string }
export interface TrickRecord { leader: number; cards: PlayedCard[]; winner: number }

export interface TeamHandResult {
  side: Side
  // Team bid (nil bids excluded). null = the hand bid itself.
  bid: number | null
  books: number
  made: boolean
  points: number
  bagsAdded: number
  bagsAfter: number
  // Plain English breakdown, shown at the end of every hand.
  lines: string[]
}

export interface HandResult {
  game: number
  handInGame: number
  dealer: number
  bidItself: boolean
  bids: (number | null)[]
  won: number[]
  a: TeamHandResult
  b: TeamHandResult
  scoreA: number
  scoreB: number
  gameWinner: Side | null
  matchWinner: Side | null
}

export interface PracticeGame {
  version: 1
  rules: RuleSetId
  learn: boolean
  // 1 = one game, 2 = best of 3, 3 = best of 5, 4 = best of 7.
  gamesToWin: number
  seed: number
  game: number
  winsA: number
  winsB: number
  scoreA: number
  scoreB: number
  bagsA: number
  bagsB: number
  handInGame: number
  dealer: number
  hands: string[][]
  // Each seat's bid, null until they bid. All null on a hand that bids itself.
  bids: (number | null)[]
  bidItself: boolean
  phase: Phase
  // Whose move it is. -1 while a finished trick is on the table.
  turn: number
  trick: PlayedCard[]
  tricks: TrickRecord[]
  won: number[]
  spadesBroken: boolean
  lastResult: HandResult | null
  history: HandResult[]
  matchWinner: Side | null
}

export interface PracticeOptions {
  rules: RuleSetId
  learn: boolean
  gamesToWin: number
  seed?: number
}

export function newPractice(opts: PracticeOptions): PracticeGame {
  const seed = (opts.seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0
  const [r, s] = random(seed)
  const g: PracticeGame = {
    version: 1,
    rules: opts.rules === 'standard' ? 'standard' : 'house',
    learn: !!opts.learn,
    gamesToWin: Math.min(4, Math.max(1, Math.trunc(opts.gamesToWin) || 1)),
    seed: s,
    game: 1,
    winsA: 0,
    winsB: 0,
    scoreA: 0,
    scoreB: 0,
    bagsA: 0,
    bagsB: 0,
    handInGame: 1,
    dealer: Math.floor(r * 4),
    hands: [[], [], [], []],
    bids: [null, null, null, null],
    bidItself: false,
    phase: 'bidding',
    turn: 0,
    trick: [],
    tricks: [],
    won: [0, 0, 0, 0],
    spadesBroken: false,
    lastResult: null,
    history: [],
    matchWinner: null,
  }
  return deal(g)
}

// Shuffles and deals 13 cards to each seat, starting left of the dealer.
function deal(g: PracticeGame): PracticeGame {
  const rs = ruleSet(g.rules)
  const [deck, seed] = shuffle(makeDeck(rs), g.seed)
  const hands: string[][] = [[], [], [], []]
  deck.forEach((c, i) => hands[(g.dealer + 1 + i) % 4].push(c))
  const bidItself = rs.firstHandBidsItself && g.handInGame === 1
  return {
    ...g,
    seed,
    hands,
    bids: [null, null, null, null],
    bidItself,
    phase: bidItself ? 'playing' : 'bidding',
    turn: nextSeat(g.dealer),
    trick: [],
    tricks: [],
    won: [0, 0, 0, 0],
    spadesBroken: false,
  }
}

export function isPracticeGame(x: unknown): x is PracticeGame {
  const g = x as PracticeGame
  return !!g && typeof g === 'object' && g.version === 1 && (g.rules === 'house' || g.rules === 'standard') &&
    Array.isArray(g.hands) && g.hands.length === 4 && Array.isArray(g.bids) && g.bids.length === 4 &&
    Array.isArray(g.trick) && Array.isArray(g.tricks) && Array.isArray(g.won) && Array.isArray(g.history) &&
    (g.phase === 'bidding' || g.phase === 'playing' || g.phase === 'handover')
}

// ---------- bidding ----------

export function isNilBid(g: PracticeGame, seat: number): boolean {
  return ruleSet(g.rules).nil && !g.bidItself && g.bids[seat] === 0
}

export function placeBid(g: PracticeGame, seat: number, bid: number): PracticeGame | string {
  if (g.phase !== 'bidding') return 'Bidding is over for this hand.'
  if (seat !== g.turn) return 'It is not your turn to bid.'
  if (!Number.isInteger(bid) || bid < 0 || bid > 13) return 'Bids are 0 to 13.'
  const bids = [...g.bids]
  bids[seat] = bid
  const done = bids.every(b => b !== null)
  return { ...g, bids, phase: done ? 'playing' : 'bidding', turn: done ? nextSeat(g.dealer) : nextSeat(seat) }
}

// Team total, nil bids excluded. null on a hand that bids itself.
export function teamBid(g: PracticeGame, side: Side): number | null {
  if (g.bidItself) return null
  return sideSeats(side).reduce((t, s) => t + (isNilBid(g, s) ? 0 : g.bids[s] ?? 0), 0)
}

// ---------- play ----------

// The card currently winning a trick (complete or not).
export function trickWinner(cards: PlayedCard[], rs: RuleSet): PlayedCard | null {
  if (!cards.length) return null
  const led = cardSuit(cards[0].card)
  let best = cards[0]
  for (const p of cards.slice(1)) {
    if (beats(p.card, best.card, led, rs)) best = p
  }
  return best
}

// Does card x beat card y, with `led` the suit that was led?
export function beats(x: string, y: string, led: Suit, rs: RuleSet): boolean {
  const xs = cardSuit(x)
  const ys = cardSuit(y)
  if (xs === ys) return cardRank(x, rs) > cardRank(y, rs)
  if (xs === 'S') return true
  if (ys === 'S') return false
  return xs === led
}

export function legalCards(g: PracticeGame, seat: number): string[] {
  const hand = g.hands[seat]
  if (!g.trick.length) {
    if (g.spadesBroken) return hand
    const other = hand.filter(c => !isSpade(c))
    return other.length ? other : hand
  }
  const led = cardSuit(g.trick[0].card)
  const follow = hand.filter(c => cardSuit(c) === led)
  return follow.length ? follow : hand
}

// Why a card cannot be played right now, in plain words, or null if it can.
export function whyIllegal(g: PracticeGame, seat: number, card: string): string | null {
  if (!g.hands[seat].includes(card)) return 'That card is not in your hand.'
  if (legalCards(g, seat).includes(card)) return null
  const joker = isJoker(card) ? ' Jokers count as spades.' : ''
  if (!g.trick.length) return `Spades are not broken yet, so lead a different suit.${joker} Spades open up once someone plays one on a trick they could not follow.`
  const led = cardSuit(g.trick[0].card)
  return `You still have ${suitName(led)}, so you have to follow suit.${joker}`
}

export function playCard(g: PracticeGame, seat: number, card: string): PracticeGame | string {
  if (g.phase !== 'playing') return 'Wait for bidding to finish.'
  if (g.trick.length === 4) return 'This trick is still being collected.'
  if (seat !== g.turn) return 'It is not your turn.'
  const why = whyIllegal(g, seat, card)
  if (why) return why
  const hands = g.hands.map((h, i) => (i === seat ? h.filter(c => c !== card) : h))
  const trick = [...g.trick, { seat, card }]
  return {
    ...g,
    hands,
    trick,
    spadesBroken: g.spadesBroken || isSpade(card),
    turn: trick.length === 4 ? -1 : nextSeat(seat),
  }
}

// Clears a finished trick: the winner takes the book and leads next. After
// the 13th book the hand is scored.
export function collectTrick(g: PracticeGame): PracticeGame | string {
  if (g.phase !== 'playing' || g.trick.length !== 4) return 'The trick is not finished.'
  const rs = ruleSet(g.rules)
  const w = trickWinner(g.trick, rs)!
  const won = [...g.won]
  won[w.seat]++
  const tricks = [...g.tricks, { leader: g.trick[0].seat, cards: g.trick, winner: w.seat }]
  const next: PracticeGame = { ...g, won, tricks, trick: [], turn: w.seat }
  return tricks.length === 13 ? scoreHand(next) : next
}

// ---------- scoring ----------

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function scoreTeam(rs: RuleSet, side: Side, bids: (number | null)[], won: number[], bagsBefore: number, bidItself: boolean): TeamHandResult {
  const seats = sideSeats(side)
  const books = won[seats[0]] + won[seats[1]]
  const lines: string[] = []
  if (bidItself) {
    const points = books * rs.pointsPerBook
    lines.push(`First hand bids itself: ${plural(books, 'book')} x ${rs.pointsPerBook} = ${points}.`)
    return { side, bid: null, books, made: true, points, bagsAdded: 0, bagsAfter: bagsBefore, lines }
  }
  let points = 0
  let bagsAdded = 0
  const nilSeats = rs.nil ? seats.filter(s => bids[s] === 0) : []
  const contractSeats = seats.filter(s => !nilSeats.includes(s))
  for (const s of nilSeats) {
    const ok = won[s] === 0
    points += ok ? rs.nilPoints : -rs.nilPoints
    lines.push(ok ? `Nil made (no books taken): +${rs.nilPoints}.` : `Nil missed (took ${plural(won[s], 'book')}): -${rs.nilPoints}.`)
    if (won[s] > 0) {
      bagsAdded += won[s]
      points += won[s] * rs.extraBookPoints
      if (rs.extraBookPoints) lines.push(`The nil player's ${plural(won[s], 'book')} count as extra books: +${won[s] * rs.extraBookPoints}.`)
    }
  }
  const bid = contractSeats.reduce((t, s) => t + (bids[s] ?? 0), 0)
  const contractBooks = contractSeats.reduce((t, s) => t + won[s], 0)
  let made = true
  if (contractSeats.length) {
    if (contractBooks >= bid) {
      const extra = contractBooks - bid
      const base = bid * rs.pointsPerBook
      points += base + extra * rs.extraBookPoints
      bagsAdded += extra
      lines.push(`Bid ${bid}, took ${contractBooks}: made it. ${bid} x ${rs.pointsPerBook} = ${base}.`)
      if (extra) lines.push(rs.extraBookPoints ? `${plural(extra, 'extra book')}: +${extra * rs.extraBookPoints}.` : `${plural(extra, 'extra book')}: worth nothing under these rules.`)
    } else {
      made = false
      const loss = rs.setLoses ? bid * rs.pointsPerBook : 0
      points -= loss
      lines.push(`Bid ${bid}, took ${contractBooks}: set. ${loss ? `Lose ${bid} x ${rs.pointsPerBook} = ${loss}.` : 'A set scores 0.'}`)
    }
  }
  let bagsAfter = bagsBefore
  if (rs.bags) {
    bagsAfter += bagsAdded
    if (bagsAdded) lines.push(`${plural(bagsAdded, 'bag')} added (${bagsAfter} total).`)
    while (bagsAfter >= rs.bagLimit) {
      bagsAfter -= rs.bagLimit
      points -= rs.bagPenalty
      lines.push(`${rs.bagLimit} bags reached: -${rs.bagPenalty}. Bags back to ${bagsAfter}.`)
    }
  }
  return { side, bid, books, made, points, bagsAdded, bagsAfter, lines }
}

function gameWinner(a: number, b: number, target: number): Side | null {
  if ((a >= target || b >= target) && a !== b) return a > b ? 'a' : 'b'
  return null
}

function scoreHand(g: PracticeGame): PracticeGame {
  const rs = ruleSet(g.rules)
  const a = scoreTeam(rs, 'a', g.bids, g.won, g.bagsA, g.bidItself)
  const b = scoreTeam(rs, 'b', g.bids, g.won, g.bagsB, g.bidItself)
  const scoreA = g.scoreA + a.points
  const scoreB = g.scoreB + b.points
  const gw = gameWinner(scoreA, scoreB, rs.target)
  const winsA = g.winsA + (gw === 'a' ? 1 : 0)
  const winsB = g.winsB + (gw === 'b' ? 1 : 0)
  const matchWinner: Side | null = winsA >= g.gamesToWin ? 'a' : winsB >= g.gamesToWin ? 'b' : null
  const result: HandResult = {
    game: g.game,
    handInGame: g.handInGame,
    dealer: g.dealer,
    bidItself: g.bidItself,
    bids: g.bids,
    won: g.won,
    a,
    b,
    scoreA,
    scoreB,
    gameWinner: gw,
    matchWinner,
  }
  return {
    ...g,
    phase: 'handover',
    turn: -1,
    scoreA,
    scoreB,
    bagsA: a.bagsAfter,
    bagsB: b.bagsAfter,
    winsA,
    winsB,
    lastResult: result,
    history: [...g.history, result],
    matchWinner,
  }
}

// Deals the next hand. If the last hand ended a game, the next game starts
// fresh (scores and bags reset, and the first hand bids itself again).
export function nextHand(g: PracticeGame): PracticeGame | string {
  if (g.phase !== 'handover') return 'Finish this hand first.'
  if (g.matchWinner) return 'This match is over.'
  const newGame = !!g.lastResult?.gameWinner
  return deal({
    ...g,
    dealer: nextSeat(g.dealer),
    game: newGame ? g.game + 1 : g.game,
    handInGame: newGame ? 1 : g.handInGame + 1,
    scoreA: newGame ? 0 : g.scoreA,
    scoreB: newGame ? 0 : g.scoreB,
    bagsA: newGame ? 0 : g.bagsA,
    bagsB: newGame ? 0 : g.bagsB,
  })
}

// A tied score at or past the target keeps going: tell the players why.
export function tiedAtTarget(g: PracticeGame): boolean {
  const t = ruleSet(g.rules).target
  return g.scoreA === g.scoreB && g.scoreA >= t
}
