// Online spades tables: up to four people on their own phones, joined with a
// typed invite code, with the computer filling any empty seat.
//
// The server holds the deal so nobody can see another player's cards: each
// request gets a view with only that player's hand and no shuffle seed. The
// row is temporary. It is deleted 30 minutes after the match ends, after 6
// hours without activity, or when the host closes the table.
//
// Computer moves and trick collection happen lazily when anyone polls, paced
// by moved_at so the table plays at a watchable speed. Every write is a
// compare-and-swap on `version`, so two phones acting at once cannot clobber
// each other.
//
// Server only (uses node:crypto through tokens.ts). Pages import the types
// with `import type`, which is erased at build time.

import {
  collectTrick, newPractice, nextHand, placeBid, playCard, type PracticeGame, type RuleSetId,
} from './cardgame.ts'
import { botBid, botPlay } from './bots.ts'
import { SpadesError } from './service.ts'
import { StoreError, type Store } from './store.ts'
import { cryptoRandom, formatCode, hashToken, isAccessCode, newAccessCode, newToken, normalizeCode } from './tokens.ts'

export const LIVE_TABLE = 'sp_live_tables'
export const BOT_MS = 900
export const TRICK_MS = 1800
export const LIFETIME_MS = 6 * 60 * 60 * 1000
export const FINISHED_MS = 30 * 60 * 1000
export const ONLINE_MS = 20 * 1000
const SEEN_REFRESH_MS = 8 * 1000

export type SeatKind = 'open' | 'human' | 'bot'
export type LiveStatus = 'lobby' | 'playing' | 'finished'

export interface LiveSeat {
  kind: SeatKind
  name: string
  // Set for a person's seat. Kept when the host hands an absent player's
  // seat to the computer, so that player can take it back.
  token_hash: string | null
  last_seen: string | null
}

export interface LiveSettings {
  rules: RuleSetId
  gamesToWin: number
}

export interface LiveRow {
  id: string
  code: string
  status: LiveStatus
  version: number
  seats: LiveSeat[]
  game: PracticeGame | null
  settings: LiveSettings
  moved_at: string | null
  created_at: string
  updated_at: string
  expires_at: string
}

export interface LiveSeatView {
  name: string
  kind: SeatKind
  online: boolean
  you: boolean
  host: boolean
  // A person's seat that the computer is covering for now.
  covered: boolean
}

export interface LiveView {
  code: string
  status: LiveStatus
  version: number
  you: number | null
  isHost: boolean
  // This phone's seat was handed to the computer and can be taken back.
  canReclaim: number | null
  seats: LiveSeatView[]
  settings: LiveSettings
  // Other players' hands are empty arrays and the seed is 0.
  game: PracticeGame | null
  handCounts: number[]
  serverNow: string
}

export interface Joined { token: string; view: LiveView }

const HOST_SEAT = 0

function fail(status: number, message: string): never {
  throw new SpadesError(status, message)
}

function cleanName(raw: unknown): string {
  const n = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 20) : ''
  if (!n) fail(400, 'Enter your name.')
  return n
}

function cleanSettings(raw: Record<string, unknown>): LiveSettings {
  const rules: RuleSetId = raw.rules === 'standard' ? 'standard' : 'house'
  const n = Math.trunc(Number(raw.gamesToWin))
  return { rules, gamesToWin: n >= 1 && n <= 4 ? n : 1 }
}

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function emptySeat(): LiveSeat {
  return { kind: 'open', name: '', token_hash: null, last_seen: null }
}

function botSeat(keepToken: string | null = null, name = 'Computer'): LiveSeat {
  return { kind: 'bot', name, token_hash: keepToken, last_seen: null }
}

// The seat this token belongs to (a person's seat or one the computer is
// covering), or -1.
function seatOf(row: LiveRow, token: string | null | undefined): number {
  if (!token || typeof token !== 'string') return -1
  const h = hashToken(token)
  return row.seats.findIndex(s => s.token_hash === h)
}

function shuffleSeed(): number {
  return Math.floor(cryptoRandom() * 2 ** 32)
}

// ---------- computer turns ----------

// Plays every computer move and collects every finished trick that is due,
// never faster than BOT_MS per move and TRICK_MS per finished trick.
export function advance(g: PracticeGame, seats: LiveSeat[], movedAt: number, now: number): { game: PracticeGame; movedAt: number; changed: boolean } {
  let game = g
  let at = movedAt
  let changed = false
  for (let i = 0; i < 80; i++) {
    if (game.phase === 'handover') break
    if (game.phase === 'playing' && game.trick.length === 4) {
      if (now - at < TRICK_MS) break
      const r = collectTrick(game)
      if (typeof r === 'string') break
      game = r
      at += TRICK_MS
      changed = true
      continue
    }
    const seat = game.turn
    if (seat < 0 || seats[seat]?.kind !== 'bot') break
    if (now - at < BOT_MS) break
    const r = game.phase === 'bidding' ? placeBid(game, seat, botBid(game, seat).bid) : playCard(game, seat, botPlay(game, seat).card)
    if (typeof r === 'string') break
    game = r
    at += BOT_MS
    changed = true
  }
  return { game, movedAt: at, changed }
}

// ---------- reads ----------

async function load(s: Store, code: unknown): Promise<LiveRow> {
  const c = typeof code === 'string' ? normalizeCode(code) : ''
  if (!isAccessCode(c)) fail(404, 'No table with that code. Check it and try again.')
  const rows = await s.select<LiveRow>(LIVE_TABLE, { code: c }, { limit: 1 })
  const row = rows[0]
  if (!row) fail(404, 'No table with that code. It may have closed.')
  if (Date.parse(row.expires_at) <= s.now().getTime()) {
    await s.remove(LIVE_TABLE, { id: row.id })
    fail(404, 'That table has closed.')
  }
  return row
}

export function viewFor(row: LiveRow, token: string | null | undefined, now: number): LiveView {
  const mine = seatOf(row, token)
  const you = mine >= 0 && row.seats[mine].kind === 'human' ? mine : null
  const g = row.game
  const game = g ? { ...g, seed: 0, hands: g.hands.map((h, i) => (i === you ? h : [])) } : null
  return {
    code: formatCode(row.code),
    status: row.status,
    version: row.version,
    you,
    isHost: you === HOST_SEAT,
    canReclaim: mine >= 0 && row.seats[mine].kind === 'bot' ? mine : null,
    seats: row.seats.map((s, i) => ({
      name: s.kind === 'open' ? '' : s.name,
      kind: s.kind,
      online: s.kind === 'bot' || (!!s.last_seen && now - Date.parse(s.last_seen) < ONLINE_MS),
      you: i === you,
      host: i === HOST_SEAT,
      covered: s.kind === 'bot' && !!s.token_hash,
    })),
    settings: row.settings,
    game,
    handCounts: g ? g.hands.map(h => h.length) : [0, 0, 0, 0],
    serverNow: iso(now),
  }
}

// What a poll does: catch the table up on computer moves, note that this
// phone is still here, and return this player's view.
export async function getView(s: Store, code: unknown, token: string | null | undefined): Promise<LiveView> {
  const row = await load(s, code)
  const now = s.now().getTime()
  const patch: Partial<LiveRow> = {}
  if (row.game && row.status === 'playing') {
    const a = advance(row.game, row.seats, Date.parse(row.moved_at || row.updated_at), now)
    if (a.changed) Object.assign(patch, gamePatch(a.game, a.movedAt, now))
  }
  const mine = seatOf(row, token)
  if (mine >= 0 && row.seats[mine].kind === 'human') {
    const seen = row.seats[mine].last_seen
    if (!seen || now - Date.parse(seen) > SEEN_REFRESH_MS) {
      patch.seats = row.seats.map((x, i) => (i === mine ? { ...x, last_seen: iso(now) } : x))
    }
  }
  if (!Object.keys(patch).length) return viewFor(row, token, now)
  const saved = await save(s, row, patch, now)
  if (saved) return viewFor(saved, token, now)
  // Someone else wrote first: show the latest state instead.
  return viewFor(await load(s, code), token, now)
}

// ---------- writes ----------

function gamePatch(game: PracticeGame, movedAt: number, now: number): Partial<LiveRow> {
  const finished = !!game.matchWinner
  return {
    game,
    moved_at: iso(movedAt),
    status: finished ? 'finished' : 'playing',
    expires_at: iso(now + (finished ? FINISHED_MS : LIFETIME_MS)),
  }
}

// Compare-and-swap on version. Returns null if another write got there first.
async function save(s: Store, row: LiveRow, patch: Partial<LiveRow>, now: number): Promise<LiveRow | null> {
  const full: Partial<LiveRow> = {
    expires_at: iso(now + (row.status === 'finished' ? FINISHED_MS : LIFETIME_MS)),
    ...patch,
    version: row.version + 1,
    updated_at: iso(now),
  }
  const out = await s.update<LiveRow>(LIVE_TABLE, { id: row.id, version: row.version }, full)
  return out[0] || null
}

type Mutation = (row: LiveRow, now: number) => Partial<LiveRow> | 'delete'

// Load, catch up on computer moves, apply the change, save. Retries a few
// times when another phone wrote in between.
async function mutate(s: Store, code: unknown, fn: Mutation): Promise<LiveRow | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const loaded = await load(s, code)
    const now = s.now().getTime()
    let row = loaded
    if (row.game && row.status === 'playing') {
      const a = advance(row.game, row.seats, Date.parse(row.moved_at || row.updated_at), now)
      if (a.changed) row = { ...row, ...gamePatch(a.game, a.movedAt, now) }
    }
    const change = fn(row, now)
    if (change === 'delete') {
      await s.remove(LIVE_TABLE, { id: row.id })
      return null
    }
    const saved = await save(s, loaded, { ...diff(loaded, row), ...change }, now)
    if (saved) return saved
  }
  fail(409, 'The table was busy. Try again.')
}

// Fields the catch-up changed (so they are saved along with the action).
function diff(before: LiveRow, after: LiveRow): Partial<LiveRow> {
  if (before === after) return {}
  return { game: after.game, moved_at: after.moved_at, status: after.status, expires_at: after.expires_at }
}

export async function createTable(s: Store, input: Record<string, unknown>): Promise<Joined> {
  const name = cleanName(input.name)
  const settings = cleanSettings(input)
  const now = s.now().getTime()
  // Sweep tables nobody closed.
  await s.remove(LIVE_TABLE, { expires_at: { lt: iso(now) } })
  const token = newToken()
  const seats: LiveSeat[] = [{ kind: 'human', name, token_hash: hashToken(token), last_seen: iso(now) }, emptySeat(), emptySeat(), emptySeat()]
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await s.insert<LiveRow>(LIVE_TABLE, {
        code: newAccessCode(),
        status: 'lobby',
        version: 1,
        seats,
        game: null,
        settings,
        moved_at: null,
        created_at: iso(now),
        updated_at: iso(now),
        expires_at: iso(now + LIFETIME_MS),
      })
      return { token, view: viewFor(rows[0], token, now) }
    } catch (err) {
      if (err instanceof StoreError && err.code === 'unique') continue
      throw err
    }
  }
  fail(500, 'Could not make a table code. Try again.')
}

// Take a seat. Open seats can be taken before the game starts; once it is
// running, a new person can take over any seat the computer is playing for
// nobody in particular.
export async function joinTable(s: Store, code: unknown, input: Record<string, unknown>): Promise<Joined> {
  const existing = typeof input.token === 'string' ? input.token : null
  if (existing) {
    const row = await load(s, code)
    const mine = seatOf(row, existing)
    if (mine >= 0 && row.seats[mine].kind === 'human') return { token: existing, view: viewFor(row, existing, s.now().getTime()) }
  }
  const name = cleanName(input.name)
  const seat = Math.trunc(Number(input.seat))
  if (!(seat >= 0 && seat <= 3)) fail(400, 'Pick a seat.')
  const token = newToken()
  const row = await mutate(s, code, (r, now) => {
    const target = r.seats[seat]
    const ok = r.status === 'lobby' ? target.kind === 'open' : r.status === 'playing' && target.kind === 'bot' && !target.token_hash
    if (!ok) fail(409, r.status === 'lobby' ? 'Someone just took that seat. Pick another.' : 'That seat is taken.')
    if (r.seats.some(x => x.kind === 'human' && x.name.toLowerCase() === name.toLowerCase())) fail(409, 'Someone at this table already has that name. Add an initial.')
    const seats = r.seats.map((x, i) => (i === seat ? { kind: 'human' as const, name, token_hash: hashToken(token), last_seen: iso(now) } : x))
    return { seats }
  })
  return { token, view: viewFor(row!, token, s.now().getTime()) }
}

export async function act(s: Store, code: unknown, token: unknown, body: Record<string, unknown>): Promise<LiveView | null> {
  const t = typeof token === 'string' ? token : null
  const action = String(body.action || '')
  const row = await mutate(s, code, (r, now) => {
    const mine = seatOf(r, t)
    if (mine < 0) fail(403, 'You are not seated at this table.')
    const seated = r.seats[mine].kind === 'human'
    const host = seated && mine === HOST_SEAT

    if (action === 'reclaim') {
      if (r.seats[mine].kind !== 'bot') fail(409, 'You already have your seat.')
      return { seats: r.seats.map((x, i) => (i === mine ? { ...x, kind: 'human' as const, last_seen: iso(now) } : x)) }
    }
    if (!seated) fail(403, 'The computer is playing your seat. Take it back first.')

    switch (action) {
      case 'seat': {
        const to = Math.trunc(Number(body.seat))
        if (r.status !== 'lobby') fail(409, 'Seats are set once the game starts.')
        if (host) fail(409, 'The host keeps the first seat.')
        if (!(to >= 0 && to <= 3) || r.seats[to].kind !== 'open') fail(409, 'That seat is taken.')
        const seats = r.seats.map((x, i) => (i === to ? r.seats[mine] : i === mine ? emptySeat() : x))
        return { seats }
      }
      case 'fill': {
        if (!host) fail(403, 'Only the host can do that.')
        const at = Math.trunc(Number(body.seat))
        if (!(at >= 0 && at <= 3) || at === HOST_SEAT) fail(400, 'Pick a seat.')
        const target = r.seats[at]
        if (r.status === 'lobby' && target.kind === 'open') return { seats: r.seats.map((x, i) => (i === at ? botSeat() : x)) }
        if (r.status !== 'lobby' && target.kind === 'human') {
          return { seats: r.seats.map((x, i) => (i === at ? botSeat(x.token_hash, x.name) : x)) }
        }
        fail(409, 'That seat cannot be handed to the computer.')
      }
      // eslint-disable-next-line no-fallthrough
      case 'clear': {
        if (!host) fail(403, 'Only the host can do that.')
        const at = Math.trunc(Number(body.seat))
        if (r.status !== 'lobby') fail(409, 'Seats are set once the game starts.')
        if (!(at >= 1 && at <= 3) || r.seats[at].kind === 'open') fail(400, 'That seat is already open.')
        return { seats: r.seats.map((x, i) => (i === at ? emptySeat() : x)) }
      }
      case 'start': {
        if (!host) fail(403, 'Only the host can start the game.')
        if (r.status !== 'lobby') fail(409, 'The game already started.')
        const seats = r.seats.map(x => (x.kind === 'open' ? botSeat() : x))
        const game = newPractice({ rules: r.settings.rules, learn: false, gamesToWin: r.settings.gamesToWin, seed: shuffleSeed() })
        return { seats, game, status: 'playing', moved_at: iso(now), expires_at: iso(now + LIFETIME_MS) }
      }
      case 'bid': {
        if (r.status !== 'playing' || !r.game) fail(409, 'The game is not running.')
        const res = placeBid(r.game, mine, Math.trunc(Number(body.bid)))
        if (typeof res === 'string') fail(409, res)
        return gamePatch(res, now, now)
      }
      case 'play': {
        if (r.status !== 'playing' || !r.game) fail(409, 'The game is not running.')
        const res = playCard(r.game, mine, String(body.card || ''))
        if (typeof res === 'string') fail(409, res)
        return gamePatch(res, now, now)
      }
      case 'next': {
        if (r.status !== 'playing' || !r.game) fail(409, 'The game is not running.')
        if (r.game.phase !== 'handover') return {}
        const res = nextHand(r.game)
        if (typeof res === 'string') fail(409, res)
        return gamePatch(res, now, now)
      }
      case 'rematch': {
        if (!host) fail(403, 'Only the host can start a rematch.')
        if (r.status !== 'finished') fail(409, 'Finish this match first.')
        const game = newPractice({ rules: r.settings.rules, learn: false, gamesToWin: r.settings.gamesToWin, seed: shuffleSeed() })
        return { game, status: 'playing', moved_at: iso(now), expires_at: iso(now + LIFETIME_MS) }
      }
      case 'leave': {
        if (host) return 'delete'
        if (r.status === 'lobby') return { seats: r.seats.map((x, i) => (i === mine ? emptySeat() : x)) }
        return { seats: r.seats.map((x, i) => (i === mine ? botSeat() : x)) }
      }
      case 'end': {
        if (!host) fail(403, 'Only the host can close the table.')
        return 'delete'
      }
      default:
        fail(400, 'Unknown action.')
    }
  })
  return row ? viewFor(row, t, s.now().getTime()) : null
}
