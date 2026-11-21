// Authoritative spades scoring. Every official total is recomputed from the
// verified hands with these pure functions, so a hand can never be counted
// twice and a correction to an early hand flows through every later one.
// All values are integers.

import type { Rules } from './rules.ts'

export type Side = 'a' | 'b'

export interface TeamHandResult {
  bid: number
  books: number
  made: boolean
  renege: boolean
  points: number // change from this hand, including any bag penalty
  bagsEarned: number
  bagPenalty: number // positive number of points deducted for bags
  totalAfter: number
  bagsAfter: number
}

export interface TeamTotals {
  total: number
  bags: number
}

export function scoreTeamHand(bid: number, books: number, bagsBefore: number, rules: Rules): Omit<TeamHandResult, 'totalAfter' | 'renege'> {
  if (books >= bid) {
    const extra = books - bid
    if (!rules.bagsEnabled) {
      return { bid, books, made: true, points: rules.pointsPerBook * bid + rules.bagValue * extra, bagsEarned: 0, bagPenalty: 0, bagsAfter: 0 }
    }
    let bags = bagsBefore + extra
    let penalty = 0
    while (bags >= rules.bagLimit) {
      bags -= rules.bagLimit
      penalty += rules.bagPenalty
    }
    const points = rules.pointsPerBook * bid + rules.bagValue * extra - penalty
    return { bid, books, made: true, points, bagsEarned: extra, bagPenalty: penalty, bagsAfter: bags }
  }
  return { bid, books, made: false, points: -rules.pointsPerBook * bid, bagsEarned: 0, bagPenalty: 0, bagsAfter: bagsBefore }
}

export interface HandInput {
  bidA: number
  bidB: number
  booksA: number
  booksB: number
  renegeSide?: Side | null
}

export function scoreHand(h: HandInput, before: { a: TeamTotals; b: TeamTotals }, rules: Rules): { a: TeamHandResult; b: TeamHandResult } {
  if (h.renegeSide) {
    // Confirmed renege: offender loses its bid points, the other team scores
    // its bid, and nobody earns bags on this hand.
    const off = h.renegeSide
    const make = (side: Side): TeamHandResult => {
      const bid = side === 'a' ? h.bidA : h.bidB
      const books = side === 'a' ? h.booksA : h.booksB
      const prev = before[side]
      const points = side === off ? -rules.pointsPerBook * bid : rules.pointsPerBook * bid
      return {
        bid, books, made: side !== off, renege: side === off, points,
        bagsEarned: 0, bagPenalty: 0, totalAfter: prev.total + points, bagsAfter: prev.bags,
      }
    }
    return { a: make('a'), b: make('b') }
  }
  const a = scoreTeamHand(h.bidA, h.booksA, before.a.bags, rules)
  const b = scoreTeamHand(h.bidB, h.booksB, before.b.bags, rules)
  return {
    a: { ...a, renege: false, totalAfter: before.a.total + a.points },
    b: { ...b, renege: false, totalAfter: before.b.total + b.points },
  }
}

export interface VerifiedHand extends HandInput {
  id: string
  handNumber: number
  game?: number
}

export interface MatchComputation {
  rows: { handId: string; handNumber: number; a: TeamHandResult; b: TeamHandResult }[]
  a: TeamTotals
  b: TeamTotals
}

export function computeMatch(hands: VerifiedHand[], rules: Rules): MatchComputation {
  const sorted = [...hands].sort((x, y) => x.handNumber - y.handNumber)
  let a: TeamTotals = { total: 0, bags: rules.initialBags }
  let b: TeamTotals = { total: 0, bags: rules.initialBags }
  const rows: MatchComputation['rows'] = []
  for (const h of sorted) {
    const r = scoreHand(h, { a, b }, rules)
    a = { total: r.a.totalAfter, bags: r.a.bagsAfter }
    b = { total: r.b.totalAfter, bags: r.b.bagsAfter }
    rows.push({ handId: h.id, handNumber: h.handNumber, a: r.a, b: r.b })
  }
  return { rows, a, b }
}

export interface Outcome {
  done: boolean
  winner: Side | null
  reason: 'target' | 'time' | null
  tiebreak: boolean
}

// Evaluated only after a hand is officially verified.
export function matchOutcome(scoreA: number, scoreB: number, target: number, timeExpired: boolean): Outcome {
  const reached = scoreA >= target || scoreB >= target
  if (reached || timeExpired) {
    if (scoreA === scoreB) return { done: false, winner: null, reason: null, tiebreak: true }
    return { done: true, winner: scoreA > scoreB ? 'a' : 'b', reason: reached ? 'target' : 'time', tiebreak: false }
  }
  return { done: false, winner: null, reason: null, tiebreak: false }
}

// Elapsed live time in ms, excluding paused time. Uses server timestamps.
export function elapsedMs(startedAt: string | null, pausedMs: number, pausedAt: string | null, now: Date): number {
  if (!startedAt) return 0
  const end = pausedAt ? new Date(pausedAt).getTime() : now.getTime()
  return Math.max(0, end - new Date(startedAt).getTime() - (pausedMs || 0))
}

export function validBid(bid: unknown, rules: Rules): bid is number {
  return typeof bid === 'number' && Number.isInteger(bid) && bid >= 0 && bid <= rules.maxBid
}

export function validBooks(booksA: unknown, booksB: unknown): boolean {
  return (
    typeof booksA === 'number' && typeof booksB === 'number' &&
    Number.isInteger(booksA) && Number.isInteger(booksB) &&
    booksA >= 0 && booksB >= 0 && booksA + booksB === 13
  )
}

export interface SeriesState {
  games: { game: number; comp: MatchComputation; winner: Side | null; decided: boolean }[]
  winsA: number
  winsB: number
  currentGame: number
  current: { a: TeamTotals; b: TeamTotals }
  done: boolean
  winner: Side | null
  tiebreak: boolean
}

// Best of N: each game plays to the target with fresh scores and bags. A
// game is decided the moment a verified hand puts a team past the target
// with the higher score. The series ends when a team reaches gamesToWin.
// (Series games ignore the match clock.)
export function computeSeries(hands: VerifiedHand[], rules: Rules, target: number): SeriesState {
  const maxGame = hands.reduce((m, h) => Math.max(m, h.game || 1), 1)
  const games: SeriesState['games'] = []
  let winsA = 0
  let winsB = 0
  let currentGame = 0
  let tiebreak = false
  for (let g = 1; g <= maxGame; g++) {
    const comp = computeMatch(hands.filter(h => (h.game || 1) === g), rules)
    const out = matchOutcome(comp.a.total, comp.b.total, target, false)
    games.push({ game: g, comp, winner: out.winner, decided: out.done })
    if (out.done) {
      if (out.winner === 'a') winsA++
      else winsB++
    } else if (!currentGame) {
      currentGame = g
      tiebreak = out.tiebreak
    }
  }
  const done = winsA >= rules.gamesToWin || winsB >= rules.gamesToWin
  if (!currentGame) currentGame = done ? maxGame : maxGame + 1
  const cur = games.find(x => x.game === currentGame)
  const zero = { total: 0, bags: rules.initialBags }
  return {
    games, winsA, winsB, currentGame,
    current: cur ? { a: cur.comp.a, b: cur.comp.b } : { a: zero, b: { ...zero } },
    done, winner: done ? (winsA > winsB ? 'a' : 'b') : null, tiebreak,
  }
}
