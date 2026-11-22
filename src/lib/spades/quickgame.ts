// One-phone scorekeeper for a single spades game or series. Runs entirely in
// the browser: nothing here is sent to the server or written to the database.
//
// Seats go clockwise: 0 = team A player 1, 1 = team B player 1,
// 2 = team A player 2, 3 = team B player 2, so partners sit across.
// The deal moves one seat clockwise each hand, and the player to the
// dealer's left bids and leads first.
//
// Imported by node:test too, so only erasable TypeScript.

export type Side = 'a' | 'b'

// localStorage key for a game in progress on this phone (never sent anywhere).
export const QUICK_KEY = 'spades-hq-scorekeeper'

export interface QuickSetup {
  teamA: string
  teamB: string
  // Optional names in seat order. Blank means "<team> player 1/2".
  players: [string, string, string, string]
  // 1 = one game, 2 = best 2 of 3, 3 = best 3 of 5, 4 = best 4 of 7.
  gamesToWin: number
  target: number
  pointsPerBook: number
  // true = a set team loses its bid x points. false = a set scores 0.
  setLoses: boolean
  // Points for each book over the bid. 0 = extra books earn nothing.
  extraBookPoints: number
}

export interface QuickHand {
  game: number
  dealer: number
  // null on the first hand of each game: the books bid themselves.
  bidA: number | null
  bidB: number | null
  booksA: number
}

export interface QuickGame {
  setup: QuickSetup
  firstDealer: number
  hands: QuickHand[]
  startedAt: string
}

export const GAME_TYPES = [
  { gamesToWin: 1, label: 'One game' },
  { gamesToWin: 2, label: 'Best 2 out of 3' },
  { gamesToWin: 3, label: 'Best 3 out of 5' },
  { gamesToWin: 4, label: 'Best 4 out of 7' },
]

export function gameTypeLabel(gamesToWin: number): string {
  return GAME_TYPES.find(g => g.gamesToWin === gamesToWin)?.label || `First to ${gamesToWin} games`
}

export function defaultSetup(): QuickSetup {
  return { teamA: '', teamB: '', players: ['', '', '', ''], gamesToWin: 1, target: 250, pointsPerBook: 10, setLoses: false, extraBookPoints: 0 }
}

export function seatTeam(seat: number): Side {
  return seat % 2 === 0 ? 'a' : 'b'
}

export function seatName(setup: QuickSetup, seat: number): string {
  const s = ((seat % 4) + 4) % 4
  const typed = (setup.players[s] || '').trim()
  if (typed) return typed
  const team = seatTeam(s) === 'a' ? setup.teamA : setup.teamB
  return `${team.trim() || (seatTeam(s) === 'a' ? 'Team 1' : 'Team 2')} player ${s < 2 ? 1 : 2}`
}

export function nextSeat(seat: number): number {
  return (seat + 1) % 4
}

export interface SideResult {
  bid: number | null
  books: number
  made: boolean
  points: number
}

export function scoreSide(bid: number | null, books: number, s: QuickSetup): SideResult {
  if (bid === null) return { bid, books, made: true, points: books * s.pointsPerBook }
  if (books >= bid) return { bid, books, made: true, points: bid * s.pointsPerBook + (books - bid) * s.extraBookPoints }
  return { bid, books, made: false, points: s.setLoses ? -bid * s.pointsPerBook : 0 }
}

export interface HandRow {
  index: number // position in game.hands
  handInGame: number
  dealer: number
  a: SideResult
  b: SideResult
  totalA: number
  totalB: number
}

export interface GameResult {
  game: number
  rows: HandRow[]
  totalA: number
  totalB: number
  winner: Side | null
}

export interface QuickState {
  games: GameResult[]
  winsA: number
  winsB: number
  currentGame: number
  // The game being played has no winner yet.
  current: GameResult
  done: boolean
  winner: Side | null
  nextDealer: number
  // The next hand is the first of its game, so it has no bidding.
  nextIsFirstHand: boolean
  // A team reached the target but the score is tied, so play continues.
  tiedAtTarget: boolean
}

function gameWinner(a: number, b: number, target: number): Side | null {
  if ((a >= target || b >= target) && a !== b) return a > b ? 'a' : 'b'
  return null
}

export function computeQuick(g: QuickGame): QuickState {
  const s = g.setup
  const games: GameResult[] = []
  let winsA = 0
  let winsB = 0
  let cur: GameResult = { game: 1, rows: [], totalA: 0, totalB: 0, winner: null }
  g.hands.forEach((h, index) => {
    if (h.game !== cur.game) {
      if (cur.rows.length) games.push(cur)
      cur = { game: h.game, rows: [], totalA: 0, totalB: 0, winner: null }
    }
    const a = scoreSide(h.bidA, h.booksA, s)
    const b = scoreSide(h.bidB, 13 - h.booksA, s)
    cur.totalA += a.points
    cur.totalB += b.points
    cur.rows.push({ index, handInGame: cur.rows.length + 1, dealer: h.dealer, a, b, totalA: cur.totalA, totalB: cur.totalB })
    const w = gameWinner(cur.totalA, cur.totalB, s.target)
    if (w) {
      cur.winner = w
      if (w === 'a') winsA++
      else winsB++
    }
  })
  if (cur.rows.length) games.push(cur)
  const done = winsA >= s.gamesToWin || winsB >= s.gamesToWin
  const last = games[games.length - 1]
  const current = last && !last.winner ? last : done ? last : { game: (last?.game || 0) + 1, rows: [], totalA: 0, totalB: 0, winner: null }
  const lastHand = g.hands[g.hands.length - 1]
  return {
    games,
    winsA,
    winsB,
    currentGame: current.game,
    current,
    done,
    winner: done ? (winsA > winsB ? 'a' : 'b') : null,
    nextDealer: lastHand ? nextSeat(lastHand.dealer) : g.firstDealer,
    nextIsFirstHand: current.rows.length === 0,
    tiedAtTarget: !current.winner && current.rows.length > 0 && current.totalA === current.totalB && current.totalA >= s.target,
  }
}

export function validBidValue(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 13
}

// Adds a hand to the game, or returns an error message.
export function addHand(g: QuickGame, input: { bidA: number | null; bidB: number | null; booksA: number; dealer?: number }): QuickGame | string {
  const st = computeQuick(g)
  if (st.done) return 'This match is over.'
  if (!validBidValue(input.booksA)) return 'Books must be 0 to 13.'
  const first = st.nextIsFirstHand
  if (!first && (!validBidValue(input.bidA) || !validBidValue(input.bidB))) return 'Enter both bids.'
  const dealer = input.dealer !== undefined ? ((input.dealer % 4) + 4) % 4 : st.nextDealer
  const hand: QuickHand = { game: st.currentGame, dealer, bidA: first ? null : input.bidA, bidB: first ? null : input.bidB, booksA: input.booksA }
  return { ...g, hands: [...g.hands, hand] }
}

export function undoHand(g: QuickGame): QuickGame {
  return { ...g, hands: g.hands.slice(0, -1) }
}

export function scoringSummary(s: QuickSetup): string {
  const parts = [
    `${s.pointsPerBook} points per book bid`,
    s.extraBookPoints ? `${s.extraBookPoints} per extra book` : 'extra books earn nothing',
    s.setLoses ? 'set loses the bid' : 'set scores 0',
    'first hand of each game the books bid themselves',
  ]
  return parts.join(', ')
}

export function resultText(g: QuickGame, st: QuickState = computeQuick(g)): string {
  const s = g.setup
  const name = (side: Side) => (side === 'a' ? s.teamA : s.teamB)
  const lines: string[] = []
  const date = new Date(g.startedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  lines.push(`Spades HQ results, ${date}`)
  if (st.winner) {
    lines.push(s.gamesToWin > 1 ? `${name(st.winner)} win the series ${Math.max(st.winsA, st.winsB)} to ${Math.min(st.winsA, st.winsB)}` : `${name(st.winner)} win`)
  }
  for (const gm of st.games) {
    lines.push(`${s.gamesToWin > 1 ? `Game ${gm.game}: ` : ''}${s.teamA} ${gm.totalA}, ${s.teamB} ${gm.totalB}`)
  }
  const roster = (side: Side) => {
    const seats = side === 'a' ? [0, 2] : [1, 3]
    const typed = seats.map(x => s.players[x].trim()).filter(Boolean)
    return typed.length ? `${name(side)}: ${typed.join(' and ')}` : ''
  }
  const r = [roster('a'), roster('b')].filter(Boolean)
  if (r.length) lines.push(r.join(' | '))
  lines.push(`${gameTypeLabel(s.gamesToWin)}, played to ${s.target}`)
  lines.push('orcafin.app/spades')
  return lines.join('\n')
}
