// Spades HQ service layer. Every write in the app goes through a function in
// this file. Each one:
//   1. loads the records it touches from the store (never trusts client ids
//      for tournament scope; scope always comes from the stored row),
//   2. checks the caller's permission for that tournament / match / table,
//   3. checks the record is still in the state the caller saw (stale or
//      replayed requests get a 409 instead of being applied),
//   4. writes, using conditional (version checked) updates and unique
//      indexes so double taps and retries are no-ops,
//   5. appends an audit row and bumps the tournament pulse so every open
//      screen refetches.
// Official scores are never written from client input. They are recomputed
// from verified hands by scoring.ts every time a hand changes.

import { normalizeRules, type Rules } from './rules.ts'
import { computeMatch, computeSeries, elapsedMs, matchOutcome, validBid, validBooks, type SeriesState, type Side, type VerifiedHand } from './scoring.ts'
import { generateBracket as buildBracket, isPowerOfTwo, nextSlot, shuffle, totalRounds } from './bracket.ts'
import { StoreError, type Store } from './store.ts'
import { cryptoRandom, formatCode, hashToken, isAccessCode, newAccessCode, newToken, normalizeCode } from './tokens.ts'
import type {
  ApprovalRow, BidRow, DisputeKind, DisputeRow, HandRow, InviteRow, MatchRow, PlayerRow, ReportRow,
  BidControl, EventType, SessionRow, StaffRow, TableRow, TeamRow, TeamStatus, TournamentRow,
} from './types.ts'

export class SpadesError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function fail(status: number, message: string): never {
  throw new SpadesError(status, message)
}

export type Actor =
  | { kind: 'public' }
  | { kind: 'owner'; name: string; sessionId?: string }
  | { kind: 'staff'; staffId: string; tournamentId: string; role: 'director' | 'supervisor'; name: string; sessionId?: string }
  | { kind: 'player'; playerId: string; teamId: string; tournamentId: string; isCaptain: boolean; name: string; sessionId?: string }

export const PUBLIC: Actor = { kind: 'public' }
const SYSTEM_NAME = 'System'

const uid = () => globalThis.crypto.randomUUID()
const nowIso = (store: Store) => store.now().toISOString()
export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

function cleanText(v: unknown, label: string, max = 40, required = true): string {
  if (v === undefined || v === null || v === '') {
    if (required) fail(400, `${label} is required`)
    return ''
  }
  if (typeof v !== 'string') fail(400, `${label} must be text`)
  const s = v.trim().replace(/\s+/g, ' ')
  if (required && !s) fail(400, `${label} is required`)
  if (s.length > max) fail(400, `${label} must be ${max} characters or less`)
  return s
}

async function one<T>(store: Store, table: string, filter: Record<string, any>, msg = 'Not found'): Promise<T> {
  const rows = await store.select<T>(table, filter, { limit: 1 })
  if (!rows[0]) fail(404, msg)
  return rows[0]
}

async function maybe<T>(store: Store, table: string, filter: Record<string, any>): Promise<T | null> {
  const rows = await store.select<T>(table, filter, { limit: 1 })
  return rows[0] || null
}

// ─── permissions ────────────────────────────────────────────────────────────

export function actorName(a: Actor): string {
  return a.kind === 'public' ? 'Public' : a.kind === 'owner' ? a.name : a.name
}

export function isDirector(a: Actor, tournamentId: string): boolean {
  return a.kind === 'owner' || (a.kind === 'staff' && a.tournamentId === tournamentId && a.role === 'director')
}

export function isStaff(a: Actor, tournamentId: string): boolean {
  return a.kind === 'owner' || (a.kind === 'staff' && a.tournamentId === tournamentId)
}

export function supervisesTable(a: Actor, tournamentId: string, table: TableRow | null): boolean {
  if (isDirector(a, tournamentId)) return true
  if (a.kind !== 'staff' || a.tournamentId !== tournamentId) return false
  // Unassigned tables can be helped by any supervisor of the event.
  return !table || !table.supervisor_id || table.supervisor_id === a.staffId
}

function requireDirector(a: Actor, tournamentId: string) {
  if (!isDirector(a, tournamentId)) fail(403, 'Tournament director access required')
}

function requireStaff(a: Actor, tournamentId: string) {
  if (!isStaff(a, tournamentId)) fail(403, 'Staff access required')
}

export function playerSide(a: Actor, match: MatchRow): Side | null {
  if (a.kind !== 'player' || a.tournamentId !== match.tournament_id) return null
  if (a.teamId === match.team_a_id) return 'a'
  if (a.teamId === match.team_b_id) return 'b'
  return null
}

function requirePlayerInMatch(a: Actor, match: MatchRow): Side {
  const side = playerSide(a, match)
  if (!side) fail(403, 'You are not playing in this match')
  return side
}

// ─── audit + pulse ──────────────────────────────────────────────────────────

export async function audit(
  store: Store,
  actor: Actor,
  e: { tournamentId: string | null; matchId?: string | null; handId?: string | null; action: string; before?: unknown; after?: unknown; reason?: string | null }
) {
  await store.insert('sp_audit', {
    tournament_id: e.tournamentId,
    match_id: e.matchId || null,
    hand_id: e.handId || null,
    actor_kind: actor.kind,
    actor_id: actor.kind === 'staff' ? actor.staffId : actor.kind === 'player' ? actor.playerId : null,
    actor_name: actor.kind === 'public' ? null : actorName(actor),
    actor_role: actor.kind === 'staff' ? actor.role : actor.kind === 'player' ? (actor.isCaptain ? 'captain' : 'player') : actor.kind,
    action: e.action,
    before: e.before ?? null,
    after: e.after ?? null,
    reason: e.reason || null,
    created_at: nowIso(store),
  })
}

export async function touch(store: Store, tournamentId: string) {
  await store.update('sp_tournaments', { id: tournamentId }, { pulse: uid(), updated_at: nowIso(store) })
}

// ─── rate limits ────────────────────────────────────────────────────────────

export async function rateLimit(store: Store, key: string, kind: string, max: number, windowMs: number) {
  const since = new Date(store.now().getTime() - windowMs).toISOString()
  const n = await store.count('sp_auth_attempts', { key_hash: hashToken(key), kind, created_at: { gte: since } })
  if (n >= max) fail(429, 'Too many attempts. Wait a few minutes and try again.')
}

export async function recordAttempt(store: Store, key: string, kind: string) {
  await store.insert('sp_auth_attempts', { id: uid(), key_hash: hashToken(key), kind, created_at: nowIso(store) })
}

// ─── match context ──────────────────────────────────────────────────────────

export interface Seat { pos: number; playerId: string; teamId: string; side: Side; name: string; isCaptain: boolean }

export function buildSeats(match: MatchRow, players: PlayerRow[]): Seat[] {
  const bySeat = (x: PlayerRow, y: PlayerRow) => x.seat - y.seat
  const a = players.filter(p => p.team_id === match.team_a_id).sort(bySeat)
  const b = players.filter(p => p.team_id === match.team_b_id).sort(bySeat)
  if (a.length !== 2 || b.length !== 2) fail(409, 'Both teams need exactly two players')
  // Clockwise: A1, B1, A2, B2. Partners sit across from each other.
  return [a[0], b[0], a[1], b[1]].map((p, pos) => ({
    pos, playerId: p.id, teamId: p.team_id, side: (pos % 2 === 0 ? 'a' : 'b') as Side, name: p.display_name, isCaptain: p.is_captain,
  }))
}

export function biddingOrder(dealerPos: number): number[] {
  return [1, 2, 3, 4].map(i => (dealerPos + i) % 4)
}

interface MatchCtx { match: MatchRow; players: PlayerRow[]; teams: TeamRow[]; table: TableRow | null; rules: Rules }

async function loadMatchCtx(store: Store, matchId: string): Promise<MatchCtx> {
  const match = await one<MatchRow>(store, 'sp_matches', { id: matchId }, 'Match not found')
  const teamIds = [match.team_a_id, match.team_b_id].filter(Boolean) as string[]
  const players = teamIds.length ? await store.select<PlayerRow>('sp_players', { team_id: { in: teamIds } }) : []
  const teams = teamIds.length ? await store.select<TeamRow>('sp_teams', { id: { in: teamIds } }) : []
  const table = match.table_id ? await maybe<TableRow>(store, 'sp_tables', { id: match.table_id }) : null
  return { match, players, teams, table, rules: normalizeRules(match.rules) }
}

// Who enters a team's bids: the captain for both partners, or each player.
// Teams choose this themselves; older teams fall back to the event default.
export function teamControl(team: TeamRow | undefined, rules: Rules): BidControl {
  if (team?.bid_control === 'captain' || team?.bid_control === 'individual') return team.bid_control
  return rules.biddingMode === 'individual' ? 'individual' : 'captain'
}

export function limitOf(t: TournamentRow): number {
  return t.team_limit || t.capacity
}

export function nextPow2(n: number): number {
  let c = 2
  while (c < n) c *= 2
  return c
}

async function loadHandCtx(store: Store, handId: unknown) {
  if (typeof handId !== 'string' || !handId) fail(400, 'Hand id is required')
  const hand = await one<HandRow>(store, 'sp_hands', { id: handId }, 'Hand not found')
  const ctx = await loadMatchCtx(store, hand.match_id)
  return { hand, ...ctx }
}

function sideOfTeam(match: MatchRow, teamId: string | null): Side | null {
  if (!teamId) return null
  return teamId === match.team_a_id ? 'a' : teamId === match.team_b_id ? 'b' : null
}

function teamOfSide(match: MatchRow, side: Side): string {
  return (side === 'a' ? match.team_a_id : match.team_b_id) as string
}

function requireLiveForPlayers(match: MatchRow, staff: boolean) {
  if (match.status === 'live') return
  if (match.status === 'paused') { if (staff) return; fail(409, 'This match is paused by the tournament staff') }
  fail(409, 'This match is not in progress')
}

function timeExpired(match: MatchRow, now: Date): boolean {
  if (!match.time_limit_min || !match.started_at) return false
  // A completed match is judged at the moment it ended, not at "now".
  const at = match.completed_at ? new Date(match.completed_at) : now
  return elapsedMs(match.started_at, match.paused_ms, match.paused_at, at) >= match.time_limit_min * 60000
}

// ─── bidding ────────────────────────────────────────────────────────────────

export async function submitBids(store: Store, actor: Actor, input: { handId: string; bids: { playerId: string; bid: number }[] }) {
  const { hand, match, players, teams, table, rules } = await loadHandCtx(store, input.handId)
  const staff = supervisesTable(actor, match.tournament_id, table)
  if (!staff) requirePlayerInMatch(actor, match)
  if (hand.status !== 'bidding') fail(409, 'Bids for this hand are already locked')
  requireLiveForPlayers(match, staff)

  const seats = buildSeats(match, players)
  const entries = Array.isArray(input.bids) ? input.bids : []
  if (entries.length < 1 || entries.length > 4) fail(400, 'No bids submitted')
  const seen = new Set<string>()
  for (const e of entries) {
    if (!seats.some(s => s.playerId === e.playerId)) fail(400, 'That player is not at this table')
    if (seen.has(e.playerId)) fail(400, 'A player appears twice')
    seen.add(e.playerId)
    if (!validBid(e.bid, rules)) fail(400, `Bids must be whole numbers from 0 to ${rules.maxBid}`)
  }

  let mySide: Side | null = null
  let myControl: BidControl | null = null
  if (!staff && actor.kind === 'player') {
    mySide = sideOfTeam(match, actor.teamId)
    myControl = teamControl(teams.find(t => t.id === actor.teamId), rules)
    const mine = seats.filter(s => s.teamId === actor.teamId).map(s => s.playerId)
    if (!entries.every(e => mine.includes(e.playerId))) fail(403, 'You can only enter bids for your own team')
    if (myControl === 'captain') {
      if (!actor.isCaptain) fail(403, 'Your captain enters the bids for your team')
      if (entries.length !== 2) fail(400, 'Enter a bid for both partners')
    } else if (!actor.isCaptain && (entries.length !== 1 || entries[0].playerId !== actor.playerId)) {
      // Each-player teams: you enter your own bid. The captain may also fill in for a partner who is away.
      fail(403, 'You can only enter your own bid')
    }
  }

  const current = await store.select<BidRow>('sp_bids', { hand_id: hand.id, active: true })
  const after = new Map(current.map(b => [b.player_id, b.bid]))
  for (const e of entries) after.set(e.playerId, e.bid)

  if (rules.bidOrder === 'sequential' && !staff) {
    const order = biddingOrder(hand.dealer_pos)
    const has = (pos: number) => after.has(seats[pos].playerId)
    const hadBefore = (pos: number) => current.some(b => b.player_id === seats[pos].playerId)
    if (myControl === 'captain' || entries.length > 1) {
      const firstSide = seats[order[0]].side
      if (mySide !== firstSide) {
        const firstDone = seats.filter(s => s.side === firstSide).every(s => current.some(b => b.player_id === s.playerId))
        if (!firstDone) fail(409, 'The other team bids first this hand')
      } else {
        const otherStarted = seats.filter(s => s.side !== firstSide).some(s => current.some(b => b.player_id === s.playerId))
        if (otherStarted) fail(409, 'The other team already bid. Ask the table supervisor to correct it.')
      }
    } else {
      for (const e of entries) {
        const pos = seats.find(s => s.playerId === e.playerId)!.pos
        const idx = order.indexOf(pos)
        const waiting = order.slice(0, idx).find(p => !has(p))
        if (waiting !== undefined) fail(409, `Waiting on ${seats[waiting].name} to bid first`)
        if (hadBefore(pos) && order.slice(idx + 1).some(hadBefore)) fail(409, 'A later player already bid. Ask the table supervisor to correct it.')
      }
    }
  }

  for (const side of ['a', 'b'] as Side[]) {
    const ids = seats.filter(s => s.side === side).map(s => s.playerId)
    if (!entries.some(e => ids.includes(e.playerId))) continue
    if (!ids.every(id => after.has(id))) continue
    const sum = ids.reduce((s, id) => s + (after.get(id) || 0), 0)
    if (sum < rules.minTeamBid) {
      if (!staff && myControl === 'individual' && actor.kind === 'player' && entries.length === 1) {
        const partner = ids.find(id => id !== actor.playerId)!
        const need = rules.minTeamBid - (after.get(partner) || 0)
        fail(400, `Your team must bid at least ${rules.minTeamBid} combined. Your partner bid ${after.get(partner)}, so bid ${need} or more.`)
      }
      fail(400, `Each team must bid at least ${rules.minTeamBid} books combined`)
    }
  }

  let changed = 0
  for (const e of entries) {
    const prev = current.find(b => b.player_id === e.playerId)
    if (prev && prev.bid === e.bid) continue
    if (prev) {
      const sup = await store.update('sp_bids', { id: prev.id, active: true }, { active: false, superseded_at: nowIso(store) })
      if (!sup.length) fail(409, 'This bid was just changed on another device. Refresh and check.')
    }
    const seat = seats.find(s => s.playerId === e.playerId)!
    try {
      await store.insert('sp_bids', {
        id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_id: hand.id,
        player_id: e.playerId, team_id: seat.teamId, bid: e.bid,
        entered_by_kind: actor.kind, entered_by_id: actor.kind === 'player' ? actor.playerId : actor.kind === 'staff' ? actor.staffId : null,
        entered_by_name: actorName(actor), active: true, superseded_at: null, created_at: nowIso(store),
      })
    } catch (err) {
      if (err instanceof StoreError && err.code === 'unique') fail(409, 'This bid was just submitted on another device. Refresh and check.')
      throw err
    }
    changed++
    await audit(store, actor, {
      tournamentId: match.tournament_id, matchId: match.id, handId: hand.id,
      action: prev ? 'bid.correct' : 'bid.submit',
      before: prev ? { player: seat.name, bid: prev.bid } : null,
      after: { player: seat.name, bid: e.bid },
    })
  }
  if (changed) {
    await tryLockBids(store, actor, hand.id, seats, rules)
    await touch(store, match.tournament_id)
  }
  return { ok: true, changed }
}

async function tryLockBids(store: Store, actor: Actor, handId: string, seats: Seat[], rules: Rules) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const hand = await one<HandRow>(store, 'sp_hands', { id: handId })
    if (hand.status !== 'bidding') return
    const bids = await store.select<BidRow>('sp_bids', { hand_id: handId, active: true })
    const bidOf = (id: string) => bids.find(b => b.player_id === id)?.bid
    if (!seats.every(s => bidOf(s.playerId) !== undefined)) return
    const sum = (side: Side) => seats.filter(s => s.side === side).reduce((t, s) => t + (bidOf(s.playerId) || 0), 0)
    if (sum('a') < rules.minTeamBid || sum('b') < rules.minTeamBid) return
    const upd = await store.update('sp_hands', { id: handId, version: hand.version, status: 'bidding' }, {
      status: 'playing', bids_locked_at: nowIso(store), version: hand.version + 1,
    })
    if (upd.length) {
      await audit(store, actor, { tournamentId: hand.tournament_id, matchId: hand.match_id, handId, action: 'hand.bids_locked', after: { bidA: sum('a'), bidB: sum('b') } })
      return
    }
  }
}

// ─── book reports + approval ────────────────────────────────────────────────

export async function reportBooks(store: Store, actor: Actor, input: { handId: string; booksA: number; booksB: number; teamId?: string }) {
  const { hand, match, table, rules } = await loadHandCtx(store, input.handId)
  const staff = supervisesTable(actor, match.tournament_id, table)
  if (!staff) requirePlayerInMatch(actor, match)
  if (hand.status === 'bidding') fail(409, 'Bids are not locked yet')
  if (!['playing', 'review', 'disputed'].includes(hand.status)) fail(409, 'This hand is already closed')
  requireLiveForPlayers(match, staff)
  if (!validBooks(input.booksA, input.booksB)) fail(400, 'Books must be whole numbers that add up to 13')

  let teams: string[]
  if (staff && actor.kind !== 'player') {
    if (input.teamId === 'both') teams = [match.team_a_id!, match.team_b_id!]
    else if (input.teamId === match.team_a_id || input.teamId === match.team_b_id) teams = [input.teamId]
    else fail(400, 'Choose which team this report is for')
  } else {
    if (actor.kind !== 'player' || !actor.isCaptain) fail(403, 'Only the team captain reports books')
    teams = [actor.teamId]
  }

  const current = await store.select<ReportRow>('sp_book_reports', { hand_id: hand.id, active: true })
  let changed = 0
  for (const teamId of teams) {
    const prev = current.find(r => r.team_id === teamId)
    if (prev && prev.books_a === input.booksA && prev.books_b === input.booksB) continue
    if (prev) {
      const sup = await store.update('sp_book_reports', { id: prev.id, active: true }, { active: false, superseded_at: nowIso(store) })
      if (!sup.length) fail(409, 'This report was just changed on another device. Refresh and check.')
    }
    try {
      await store.insert('sp_book_reports', {
        id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_id: hand.id, team_id: teamId,
        books_a: input.booksA, books_b: input.booksB, reporter_kind: actor.kind,
        reporter_id: actor.kind === 'player' ? actor.playerId : actor.kind === 'staff' ? actor.staffId : null,
        reporter_name: actorName(actor), active: true, superseded_at: null, created_at: nowIso(store),
      })
    } catch (err) {
      if (err instanceof StoreError && err.code === 'unique') fail(409, 'A report was just submitted on another device. Refresh and check.')
      throw err
    }
    changed++
    await audit(store, actor, {
      tournamentId: match.tournament_id, matchId: match.id, handId: hand.id,
      action: prev ? 'report.amend' : 'report.submit',
      before: prev ? { team: teamId, booksA: prev.books_a, booksB: prev.books_b } : null,
      after: { team: teamId, booksA: input.booksA, booksB: input.booksB },
    })
  }
  if (changed) {
    // A changed report invalidates any confirmations already given.
    const cleared = await store.remove('sp_hand_approvals', { hand_id: hand.id })
    if (cleared) await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId: hand.id, action: 'hand.approvals_cleared', after: { count: cleared } })
    await evaluateReports(store, actor, hand.id, rules)
    await touch(store, match.tournament_id)
  }
  return { ok: true, changed }
}

async function evaluateReports(store: Store, actor: Actor, handId: string, rules: Rules) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const hand = await one<HandRow>(store, 'sp_hands', { id: handId })
    if (!['playing', 'review', 'disputed'].includes(hand.status)) return
    const match = await one<MatchRow>(store, 'sp_matches', { id: hand.match_id })
    const reports = await store.select<ReportRow>('sp_book_reports', { hand_id: handId, active: true })
    const ra = reports.find(r => r.team_id === match.team_a_id)
    const rb = reports.find(r => r.team_id === match.team_b_id)
    if (!ra || !rb) return
    const agree = ra.books_a === rb.books_a && ra.books_b === rb.books_b
    let target: HandRow['status']
    if (agree) {
      const mism = await store.select<DisputeRow>('sp_disputes', { hand_id: handId, kind: 'report_mismatch', status: 'open' })
      for (const d of mism) {
        await store.update('sp_disputes', { id: d.id, status: 'open' }, {
          status: 'resolved', resolution: 'Captains amended their reports to match', resolved_by_name: SYSTEM_NAME, resolved_at: nowIso(store),
        })
      }
      target = 'review'
    } else {
      target = 'disputed'
      try {
        await store.insert('sp_disputes', {
          id: uid(), tournament_id: hand.tournament_id, match_id: hand.match_id, hand_id: handId, kind: 'report_mismatch', status: 'open',
          raised_by_kind: 'system', raised_by_id: null, raised_by_name: SYSTEM_NAME,
          reason: `Captain reports disagree: Team A says ${ra.books_a} to ${ra.books_b}, Team B says ${rb.books_a} to ${rb.books_b}`,
          resolution: null, resolved_by_name: null, resolved_at: null, created_at: nowIso(store),
        })
      } catch (err) {
        if (!(err instanceof StoreError && err.code === 'unique')) throw err
      }
    }
    if (hand.status !== target) {
      const upd = await store.update('sp_hands', { id: handId, version: hand.version }, { status: target, version: hand.version + 1 })
      if (!upd.length) continue
      await audit(store, actor, { tournamentId: hand.tournament_id, matchId: hand.match_id, handId, action: target === 'review' ? 'hand.reports_agree' : 'hand.disputed', after: { a: [ra.books_a, ra.books_b], b: [rb.books_a, rb.books_b] } })
    }
    if (target === 'review' && !rules.requireCaptainApproval) {
      const open = await store.count('sp_disputes', { hand_id: handId, status: 'open' })
      if (!open) await verifyHand(store, actor, handId, ra.books_a, ra.books_b, {})
    }
    return
  }
}

export async function approveHand(store: Store, actor: Actor, input: { handId: string }) {
  const { hand, match, table } = await loadHandCtx(store, input.handId)
  const staff = supervisesTable(actor, match.tournament_id, table)
  if (!staff) requirePlayerInMatch(actor, match)
  requireLiveForPlayers(match, staff)
  if (hand.status === 'verified') return { ok: true, verified: true }
  if (hand.status === 'disputed') fail(409, 'This hand is disputed. A supervisor must resolve it.')
  if (hand.status !== 'review') fail(409, 'This hand is not ready to confirm yet')
  const open = await store.count('sp_disputes', { hand_id: hand.id, status: 'open' })
  if (open) fail(409, 'A dispute is open on this hand. A supervisor must resolve it first.')
  const reports = await store.select<ReportRow>('sp_book_reports', { hand_id: hand.id, active: true })
  const ra = reports.find(r => r.team_id === match.team_a_id)
  if (!ra) fail(409, 'Book reports are missing')

  let teams: string[]
  if (staff && actor.kind !== 'player') teams = [match.team_a_id!, match.team_b_id!]
  else if (actor.kind === 'player' && actor.isCaptain) teams = [actor.teamId]
  else fail(403, 'Only the team captain confirms the hand')

  for (const teamId of teams) {
    try {
      await store.insert('sp_hand_approvals', {
        id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_id: hand.id, team_id: teamId,
        approver_kind: actor.kind, approver_id: actor.kind === 'player' ? actor.playerId : actor.kind === 'staff' ? actor.staffId : null,
        approver_name: actorName(actor), created_at: nowIso(store),
      })
    } catch (err) {
      if (!(err instanceof StoreError && err.code === 'unique')) throw err
    }
  }
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId: hand.id, action: staff && actor.kind !== 'player' ? 'hand.verify_by_staff' : 'hand.approve', after: { teams } })
  const approvals = await store.select<ApprovalRow>('sp_hand_approvals', { hand_id: hand.id })
  let verified = false
  if (approvals.some(a => a.team_id === match.team_a_id) && approvals.some(a => a.team_id === match.team_b_id)) {
    await verifyHand(store, actor, hand.id, ra.books_a, ra.books_b, {})
    verified = true
  }
  await touch(store, match.tournament_id)
  return { ok: true, verified }
}

async function verifyHand(store: Store, actor: Actor, handId: string, booksA: number, booksB: number, opts: { renegeTeamId?: string | null; ruling?: string | null }) {
  const hand = await one<HandRow>(store, 'sp_hands', { id: handId })
  if (hand.status === 'verified') return
  if (!['playing', 'review', 'disputed'].includes(hand.status)) fail(409, 'This hand cannot be verified from its current state')
  const patch: Record<string, any> = { status: 'verified', books_a: booksA, books_b: booksB, verified_at: nowIso(store), version: hand.version + 1 }
  if (opts.renegeTeamId !== undefined) patch.renege_team_id = opts.renegeTeamId
  if (opts.ruling) patch.ruling = opts.ruling
  const upd = await store.update('sp_hands', { id: handId, version: hand.version }, patch)
  if (!upd.length) {
    const fresh = await one<HandRow>(store, 'sp_hands', { id: handId })
    if (fresh.status === 'verified') return
    fail(409, 'This hand changed on another device. Refresh and try again.')
  }
  await audit(store, actor, { tournamentId: hand.tournament_id, matchId: hand.match_id, handId, action: 'hand.verified', after: { booksA, booksB, renegeTeamId: patch.renege_team_id ?? hand.renege_team_id } })
  await recomputeMatch(store, hand.match_id)
  await afterVerification(store, actor, hand.match_id)
}

async function loadVerifiedHands(store: Store, match: MatchRow): Promise<VerifiedHand[]> {
  const hands = await store.select<HandRow>('sp_hands', { match_id: match.id, status: 'verified' }, { order: [{ col: 'hand_number' }] })
  if (!hands.length) return []
  const bids = await store.select<BidRow>('sp_bids', { match_id: match.id, active: true })
  return hands.map(h => {
    const hb = bids.filter(b => b.hand_id === h.id)
    return {
      id: h.id,
      handNumber: h.hand_number,
      bidA: hb.filter(b => b.team_id === match.team_a_id).reduce((s, b) => s + b.bid, 0),
      bidB: hb.filter(b => b.team_id === match.team_b_id).reduce((s, b) => s + b.bid, 0),
      booksA: h.books_a ?? 0,
      booksB: h.books_b ?? 0,
      renegeSide: sideOfTeam(match, h.renege_team_id),
      game: h.game_number || 1,
    }
  })
}

export async function recomputeMatch(store: Store, matchId: string): Promise<{ a: { total: number; bags: number }; b: { total: number; bags: number }; series: SeriesState | null }> {
  const match = await one<MatchRow>(store, 'sp_matches', { id: matchId })
  const rules = normalizeRules(match.rules)
  const hands = await loadVerifiedHands(store, match)
  const series = rules.gamesToWin > 1 ? computeSeries(hands, rules, match.target) : null
  const comp = series ? null : computeMatch(hands, rules)
  const allRows = series ? series.games.flatMap(g => g.comp.rows) : comp!.rows
  await store.remove('sp_score_ledger', { match_id: matchId })
  const rows: Record<string, any>[] = []
  for (const r of allRows) {
    for (const side of ['a', 'b'] as Side[]) {
      const t = r[side]
      rows.push({
        id: uid(), tournament_id: match.tournament_id, match_id: matchId, hand_id: r.handId, hand_number: r.handNumber,
        team_id: teamOfSide(match, side), bid: t.bid, books: t.books, made: t.made, renege: t.renege, points: t.points,
        bags_earned: t.bagsEarned, bag_penalty: t.bagPenalty, total_after: t.totalAfter, bags_after: t.bagsAfter, created_at: nowIso(store),
      })
    }
  }
  if (rows.length) await store.insert('sp_score_ledger', rows)
  if (series) {
    // Show the game in progress, or the deciding game once the series is over.
    const shown = series.games.find(g => g.game === series.currentGame)?.comp || (series.done && series.games.length ? series.games[series.games.length - 1].comp : null)
    const a = shown ? shown.a : { total: 0, bags: rules.initialBags }
    const b = shown ? shown.b : { total: 0, bags: rules.initialBags }
    await store.update('sp_matches', { id: matchId }, {
      score_a: a.total, score_b: b.total, bags_a: a.bags, bags_b: b.bags, hands_verified: allRows.length,
      games_a: series.winsA, games_b: series.winsB, current_game: series.currentGame,
    })
    return { a, b, series }
  }
  await store.update('sp_matches', { id: matchId }, {
    score_a: comp!.a.total, score_b: comp!.b.total, bags_a: comp!.a.bags, bags_b: comp!.b.bags, hands_verified: comp!.rows.length,
  })
  return { a: comp!.a, b: comp!.b, series: null }
}

async function openNextHand(store: Store, match: MatchRow, tiebreak: boolean) {
  const open = await store.count('sp_hands', { match_id: match.id, status: { in: ['bidding', 'playing', 'review', 'disputed'] } })
  if (open) return
  const last = await store.select<HandRow>('sp_hands', { match_id: match.id }, { order: [{ col: 'hand_number', asc: false }], limit: 1 })
  const n = (last[0]?.hand_number || 0) + 1
  const fresh = await one<MatchRow>(store, 'sp_matches', { id: match.id })
  const series = normalizeRules(fresh.rules).gamesToWin > 1
  try {
    await store.insert('sp_hands', {
      id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_number: n, status: 'bidding',
      dealer_pos: (n - 1) % 4, is_tiebreak: tiebreak, bids_locked_at: null, books_a: null, books_b: null,
      renege_team_id: null, ruling: null, verified_at: null, version: 1, created_at: nowIso(store),
      ...(series ? { game_number: fresh.current_game || 1 } : {}),
    })
  } catch (err) {
    if (!(err instanceof StoreError && err.code === 'unique')) throw err
  }
}

async function afterVerification(store: Store, actor: Actor, matchId: string) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: matchId })
  if (match.status !== 'live' && match.status !== 'paused') return
  const rules = normalizeRules(match.rules)
  if (rules.gamesToWin > 1) {
    const st = computeSeries(await loadVerifiedHands(store, match), rules, match.target)
    if (st.done) {
      const winner = teamOfSide(match, st.winner!)
      const upd = await store.update('sp_matches', { id: matchId, version: match.version }, {
        status: 'completed', winner_team_id: winner, result_kind: 'played', completed_at: nowIso(store), version: match.version + 1,
        ...(match.paused_at ? { paused_at: null, paused_ms: match.paused_ms + (store.now().getTime() - new Date(match.paused_at).getTime()) } : {}),
      })
      if (upd.length) await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'match.completed', after: { winner, gamesA: st.winsA, gamesB: st.winsB, reason: 'series' } })
      return
    }
    const prevGame = match.current_game || 1
    if (st.currentGame > prevGame) await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'series.game_won', after: { game: prevGame, gamesA: st.winsA, gamesB: st.winsB } })
    await openNextHand(store, match, st.tiebreak)
    return
  }
  const outcome = matchOutcome(match.score_a, match.score_b, match.target, timeExpired(match, store.now()))
  if (outcome.done) {
    const winner = teamOfSide(match, outcome.winner!)
    const upd = await store.update('sp_matches', { id: matchId, version: match.version }, {
      status: 'completed', winner_team_id: winner, result_kind: 'played', completed_at: nowIso(store), version: match.version + 1,
      ...(match.paused_at ? { paused_at: null, paused_ms: match.paused_ms + (store.now().getTime() - new Date(match.paused_at).getTime()) } : {}),
    })
    if (upd.length) {
      await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'match.completed', after: { winner, scoreA: match.score_a, scoreB: match.score_b, reason: outcome.reason } })
    }
    return
  }
  await openNextHand(store, match, outcome.tiebreak)
}

// ─── disputes, corrections, voids ───────────────────────────────────────────

const PLAYER_DISPUTE_KINDS: DisputeKind[] = ['renege', 'other', 'correction_request']
const STAFF_DISPUTE_KINDS: DisputeKind[] = ['renege', 'other', 'correction_request', 'director_request', 'forfeit_report']

export async function raiseDispute(store: Store, actor: Actor, input: { matchId: string; handId?: string | null; kind: DisputeKind; reason: string }) {
  const { match, table } = await loadMatchCtx(store, input.matchId)
  const staff = supervisesTable(actor, match.tournament_id, table) || isStaff(actor, match.tournament_id)
  if (!staff) requirePlayerInMatch(actor, match)
  const kinds = staff && actor.kind !== 'player' ? STAFF_DISPUTE_KINDS : PLAYER_DISPUTE_KINDS
  if (!kinds.includes(input.kind)) fail(400, 'Unknown dispute type')
  const reason = cleanText(input.reason, 'Reason', 500)
  let handId: string | null = null
  if (input.handId) {
    const hand = await one<HandRow>(store, 'sp_hands', { id: input.handId }, 'Hand not found')
    if (hand.match_id !== match.id) fail(400, 'That hand is not in this match')
    handId = hand.id
  }
  const row = {
    id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_id: handId, kind: input.kind, status: 'open',
    raised_by_kind: actor.kind, raised_by_id: actor.kind === 'player' ? actor.playerId : actor.kind === 'staff' ? actor.staffId : null,
    raised_by_name: actorName(actor), reason, resolution: null, resolved_by_name: null, resolved_at: null, created_at: nowIso(store),
  }
  await store.insert('sp_disputes', row)
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId, action: `dispute.open.${input.kind}`, after: { reason } })
  await touch(store, match.tournament_id)
  return { ok: true, disputeId: row.id }
}

interface Ruling {
  booksA?: number
  booksB?: number
  renegeTeamId?: string | null
  bids?: { playerId: string; bid: number }[]
}

// Shared by correctHand and resolveDispute. Applies an authorized staff
// ruling to a hand in any state, recalculates every later hand, and keeps
// the bracket consistent.
async function applyRuling(store: Store, actor: Actor, handId: string, ruling: Ruling, reason: string) {
  const { hand, match, players, table, rules } = await loadHandCtx(store, handId)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (match.status === 'final' && !isDirector(actor, match.tournament_id)) fail(403, 'This match is finalized. Only the tournament director can change it.')
  if (hand.status === 'void') fail(409, 'This hand was voided')

  const hasBooks = ruling.booksA !== undefined || ruling.booksB !== undefined
  if (hasBooks && !validBooks(ruling.booksA, ruling.booksB)) fail(400, 'Books must be whole numbers that add up to 13')
  if (ruling.renegeTeamId !== undefined && ruling.renegeTeamId !== null && !sideOfTeam(match, ruling.renegeTeamId)) fail(400, 'Renege team is not in this match')
  if (hand.status === 'bidding' && (hasBooks || ruling.renegeTeamId)) fail(409, 'Lock bids before ruling on books')

  const seats = buildSeats(match, players)
  const currentBids = await store.select<BidRow>('sp_bids', { hand_id: hand.id, active: true })
  const newBids = new Map(currentBids.map(b => [b.player_id, b.bid]))
  if (ruling.bids) {
    for (const e of ruling.bids) {
      if (!seats.some(s => s.playerId === e.playerId)) fail(400, 'That player is not at this table')
      if (!validBid(e.bid, rules)) fail(400, `Bids must be whole numbers from 0 to ${rules.maxBid}`)
      newBids.set(e.playerId, e.bid)
    }
    if (hand.status !== 'bidding') {
      for (const side of ['a', 'b'] as Side[]) {
        const ids = seats.filter(s => s.side === side).map(s => s.playerId)
        if (!ids.every(id => newBids.has(id))) fail(400, 'Every player needs a bid')
        if (ids.reduce((t, id) => t + (newBids.get(id) || 0), 0) < rules.minTeamBid) fail(400, `Each team must bid at least ${rules.minTeamBid} books combined`)
      }
    }
  }

  const before = { status: hand.status, booksA: hand.books_a, booksB: hand.books_b, renegeTeamId: hand.renege_team_id, bids: Object.fromEntries(currentBids.map(b => [b.player_id, b.bid])) }

  // Dry run on finalized matches: the bracket must stay consistent.
  let finalWinnerChange: string | null = null
  if (match.status === 'final' && hand.status === 'verified') {
    const hands = await loadVerifiedHands(store, match)
    const sum = (side: Side) => seats.filter(s => s.side === side).reduce((t, s) => t + (newBids.get(s.playerId) || 0), 0)
    const edited = hands.map(h => h.id !== hand.id ? h : {
      ...h, bidA: sum('a'), bidB: sum('b'),
      booksA: hasBooks ? ruling.booksA! : h.booksA, booksB: hasBooks ? ruling.booksB! : h.booksB,
      renegeSide: ruling.renegeTeamId !== undefined ? sideOfTeam(match, ruling.renegeTeamId) : h.renegeSide,
    })
    if (match.result_kind === 'played') {
      let winSide: Side
      if (rules.gamesToWin > 1) {
        const st = computeSeries(edited, rules, match.target)
        if (!st.done) fail(409, 'This correction would leave the finalized series undecided. Reset the match instead.')
        winSide = st.winner!
      } else {
        const comp = computeMatch(edited, rules)
        const out = matchOutcome(comp.a.total, comp.b.total, match.target, true)
        if (!out.done) fail(409, 'This correction would leave the finalized match tied. Reset the match instead.')
        winSide = out.winner!
      }
      const w = teamOfSide(match, winSide)
      if (w !== match.winner_team_id) {
        const ns = nextSlot(match.round, match.slot, await roundsOf(store, match.tournament_id))
        if (ns) {
          const next = await maybe<MatchRow>(store, 'sp_matches', { tournament_id: match.tournament_id, round: ns.round, slot: ns.slot })
          if (next && !['pending', 'ready'].includes(next.status)) fail(409, 'The winner would change, but the next match already started. Reset the next match first.')
        }
        finalWinnerChange = w
      }
    }
  }

  // Bids
  if (ruling.bids) {
    for (const e of ruling.bids) {
      const prev = currentBids.find(b => b.player_id === e.playerId)
      if (prev && prev.bid === e.bid) continue
      if (prev) await store.update('sp_bids', { id: prev.id, active: true }, { active: false, superseded_at: nowIso(store) })
      const seat = seats.find(s => s.playerId === e.playerId)!
      await store.insert('sp_bids', {
        id: uid(), tournament_id: match.tournament_id, match_id: match.id, hand_id: hand.id, player_id: e.playerId, team_id: seat.teamId,
        bid: e.bid, entered_by_kind: actor.kind, entered_by_id: actor.kind === 'staff' ? actor.staffId : null, entered_by_name: actorName(actor),
        active: true, superseded_at: null, created_at: nowIso(store),
      })
    }
    if (hand.status === 'review') await store.remove('sp_hand_approvals', { hand_id: hand.id })
  }

  if (hand.status === 'verified') {
    const patch: Record<string, any> = { version: hand.version + 1, ruling: reason }
    if (hasBooks) { patch.books_a = ruling.booksA; patch.books_b = ruling.booksB }
    if (ruling.renegeTeamId !== undefined) patch.renege_team_id = ruling.renegeTeamId
    const upd = await store.update('sp_hands', { id: hand.id, version: hand.version }, patch)
    if (!upd.length) fail(409, 'This hand changed on another device. Refresh and try again.')
  } else if (hasBooks) {
    await verifyHand(store, actor, hand.id, ruling.booksA!, ruling.booksB!, { renegeTeamId: ruling.renegeTeamId, ruling: reason })
  } else if (ruling.renegeTeamId !== undefined) {
    const upd = await store.update('sp_hands', { id: hand.id, version: hand.version }, { renege_team_id: ruling.renegeTeamId, ruling: reason, version: hand.version + 1 })
    if (!upd.length) fail(409, 'This hand changed on another device. Refresh and try again.')
  }

  const fresh = await one<HandRow>(store, 'sp_hands', { id: hand.id })
  await audit(store, actor, {
    tournamentId: match.tournament_id, matchId: match.id, handId: hand.id, action: 'hand.correction', reason,
    before, after: { status: fresh.status, booksA: fresh.books_a, booksB: fresh.books_b, renegeTeamId: fresh.renege_team_id, bids: Object.fromEntries(newBids) },
  })

  if (hand.status === 'verified') {
    const comp = await recomputeMatch(store, match.id)
    await reconcileAfterCorrection(store, actor, match.id, comp, finalWinnerChange, reason)
  } else if (hand.status === 'bidding' && ruling.bids) {
    await tryLockBids(store, actor, hand.id, seats, rules)
  } else if (hand.status === 'review' && ruling.bids) {
    await evaluateReports(store, actor, hand.id, rules)
  }
}

async function roundsOf(store: Store, tournamentId: string): Promise<number> {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: tournamentId })
  return totalRounds(t.capacity)
}

async function reconcileAfterCorrection(store: Store, actor: Actor, matchId: string, comp: Awaited<ReturnType<typeof recomputeMatch>>, finalWinnerChange: string | null, reason: string) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: matchId })
  if (match.result_note?.startsWith('Ended by director')) return
  if (match.status === 'completed' && match.result_kind === 'played') {
    const out = comp.series
      ? { done: comp.series.done, winner: comp.series.winner, tiebreak: comp.series.tiebreak }
      : matchOutcome(comp.a.total, comp.b.total, match.target, timeExpired(match, store.now()))
    if (out.done) {
      const w = teamOfSide(match, out.winner!)
      if (w !== match.winner_team_id) {
        await store.update('sp_matches', { id: matchId }, { winner_team_id: w, version: match.version + 1 })
        await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'match.winner_changed', after: { winner: w }, reason })
      }
    } else {
      // The correction un-decided the match: back to live play.
      await store.update('sp_matches', { id: matchId }, { status: 'live', winner_team_id: null, result_kind: null, completed_at: null, completion_verified_by: null, version: match.version + 1 })
      await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'match.reopened', reason })
      await openNextHand(store, { ...match, status: 'live' }, out.tiebreak)
    }
  } else if (match.status === 'final' && finalWinnerChange) {
    const old = match.winner_team_id
    await store.update('sp_matches', { id: matchId }, { winner_team_id: finalWinnerChange, version: match.version + 1 })
    await placeInNext(store, match, finalWinnerChange, old)
    await audit(store, actor, { tournamentId: match.tournament_id, matchId, action: 'bracket.repropagated', before: { winner: old }, after: { winner: finalWinnerChange }, reason })
  }
}

export async function correctHand(store: Store, actor: Actor, input: { handId: string; reason: string } & Ruling) {
  const reason = cleanText(input.reason, 'Reason', 500)
  const { hand } = await loadHandCtx(store, input.handId)
  await applyRuling(store, actor, input.handId, { booksA: input.booksA, booksB: input.booksB, renegeTeamId: input.renegeTeamId, bids: input.bids }, reason)
  await touch(store, hand.tournament_id)
  return { ok: true }
}

export async function resolveDispute(store: Store, actor: Actor, input: { disputeId: string; resolution: string; dismiss?: boolean } & Ruling) {
  const resolution = cleanText(input.resolution, 'Resolution', 500)
  const d = await one<DisputeRow>(store, 'sp_disputes', { id: input.disputeId }, 'Dispute not found')
  const { match, table } = await loadMatchCtx(store, d.match_id)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (d.status !== 'open') fail(409, 'This dispute is already closed')
  if (d.kind === 'director_request' && !isDirector(actor, match.tournament_id)) fail(403, 'Only the tournament director can close a director request')

  const hasRuling = input.booksA !== undefined || input.booksB !== undefined || input.renegeTeamId !== undefined || !!input.bids
  if (d.hand_id) {
    const hand = await one<HandRow>(store, 'sp_hands', { id: d.hand_id })
    if (d.kind === 'report_mismatch' && hand.status === 'disputed' && !(input.booksA !== undefined)) {
      fail(400, 'Enter the official book count to settle a report mismatch')
    }
  }
  // Close the dispute first so verification is not blocked by it.
  const closed = await store.update('sp_disputes', { id: d.id, status: 'open' }, {
    status: input.dismiss ? 'dismissed' : 'resolved', resolution, resolved_by_name: actorName(actor), resolved_at: nowIso(store),
  })
  if (!closed.length) fail(409, 'This dispute was just closed on another device')
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId: d.hand_id, action: input.dismiss ? 'dispute.dismissed' : 'dispute.resolved', reason: resolution, before: { kind: d.kind, reason: d.reason } })
  if (hasRuling && d.hand_id) {
    try {
      await applyRuling(store, actor, d.hand_id, input, resolution)
    } catch (err) {
      // Ruling rejected: reopen the dispute so nothing is lost.
      await store.update('sp_disputes', { id: d.id }, { status: 'open', resolution: null, resolved_by_name: null, resolved_at: null })
      await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId: d.hand_id, action: 'dispute.reopened', reason: err instanceof Error ? err.message : 'ruling failed' })
      throw err
    }
  }
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function voidHand(store: Store, actor: Actor, input: { handId: string; reason: string }) {
  const reason = cleanText(input.reason, 'Reason', 500)
  const { hand, match, table } = await loadHandCtx(store, input.handId)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (match.status === 'final' || match.status === 'completed') {
    if (!isDirector(actor, match.tournament_id)) fail(403, 'Only the tournament director can void a hand in a finished match')
    if (match.status === 'final') fail(409, 'Reset the match before voiding hands in a finalized match')
  }
  if (hand.status === 'void') return { ok: true }
  const upd = await store.update('sp_hands', { id: hand.id, version: hand.version }, { status: 'void', ruling: reason, version: hand.version + 1 })
  if (!upd.length) fail(409, 'This hand changed on another device. Refresh and try again.')
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, handId: hand.id, action: 'hand.void', reason, before: { status: hand.status } })
  const openDisputes = await store.select<DisputeRow>('sp_disputes', { hand_id: hand.id, status: 'open' })
  for (const d of openDisputes) await store.update('sp_disputes', { id: d.id }, { status: 'resolved', resolution: `Hand voided: ${reason}`, resolved_by_name: actorName(actor), resolved_at: nowIso(store) })
  if (hand.status === 'verified') {
    const comp = await recomputeMatch(store, match.id)
    await reconcileAfterCorrection(store, actor, match.id, comp, null, reason)
  }
  const fresh = await one<MatchRow>(store, 'sp_matches', { id: match.id })
  if (fresh.status === 'live' || fresh.status === 'paused') await openNextHand(store, fresh, false)
  await touch(store, match.tournament_id)
  return { ok: true }
}

// ─── match control ──────────────────────────────────────────────────────────

export async function startMatch(store: Store, actor: Actor, input: { matchId: string }) {
  const { match, players } = await loadMatchCtx(store, input.matchId)
  requireDirector(actor, match.tournament_id)
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: match.tournament_id })
  const bracket = normalizeRules(t.rules).useBracket
  if (bracket && !t.bracket_published) fail(409, 'Publish the bracket before starting matches')
  if (match.status !== 'ready') fail(409, match.status === 'pending' ? 'Both teams for this match are not set yet' : 'This match already started')
  if (!match.team_a_id || !match.team_b_id) fail(409, 'Both teams for this match are not set yet')
  const running = await store.select<MatchRow>('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused'] } })
  if (running.some(m => m.id !== match.id && [m.team_a_id, m.team_b_id].some(x => x === match.team_a_id || x === match.team_b_id))) {
    fail(409, 'One of these teams is already playing another game')
  }
  if (!match.table_id) {
    const tables = await store.select<TableRow>('sp_tables', { tournament_id: t.id }, { order: [{ col: 'number' }] })
    const taken = new Set((await store.select<MatchRow>('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed'] } })).map(x => x.table_id))
    const free = tables.find(tb => !taken.has(tb.id))
    if (free) {
      await store.update('sp_matches', { id: match.id }, { table_id: free.id })
      match.table_id = free.id
    } else if (bracket) fail(409, 'Assign a table before starting')
  }
  if (match.table_id) {
    const busy = await store.select<MatchRow>('sp_matches', { table_id: match.table_id, status: { in: ['live', 'paused', 'completed'] } })
    if (busy.some(m => m.id !== match.id)) fail(409, 'That table still has a match in progress or waiting to be finalized')
  }
  buildSeats(match, players)
  for (const teamId of [match.team_a_id, match.team_b_id]) {
    if (!players.some(p => p.team_id === teamId && p.is_captain)) fail(409, 'Each team needs a captain before starting')
  }
  const rules = normalizeRules(t.rules)
  const upd = await store.update('sp_matches', { id: match.id, version: match.version, status: 'ready' }, {
    status: 'live', rules, started_at: nowIso(store), paused_at: null, paused_ms: 0, version: match.version + 1,
  })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  await openNextHand(store, { ...match, status: 'live' }, false)
  if (t.status !== 'live') await store.update('sp_tournaments', { id: t.id }, { status: 'live', registration_open: false, roster_locked: true })
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.start', after: { biddingMode: rules.biddingMode, bidOrder: rules.bidOrder, target: match.target, timeLimitMin: match.time_limit_min } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function startRound(store: Store, actor: Actor, input: { tournamentId: string; round: number }) {
  requireDirector(actor, input.tournamentId)
  const ms = await store.select<MatchRow>('sp_matches', { tournament_id: input.tournamentId, round: input.round }, { order: [{ col: 'slot' }] })
  if (!ms.length) fail(404, 'No matches in that round')
  const prior = input.round > 1 ? await store.select<MatchRow>('sp_matches', { tournament_id: input.tournamentId, round: input.round - 1 }) : []
  if (prior.some(m => m.status !== 'final')) fail(409, 'Finalize every match in the previous round first')
  const tables = await store.select<TableRow>('sp_tables', { tournament_id: input.tournamentId }, { order: [{ col: 'number' }] })
  const busyIds = new Set((await store.select<MatchRow>('sp_matches', { tournament_id: input.tournamentId, status: { in: ['live', 'paused', 'completed'] } })).map(m => m.table_id))
  ms.forEach(m => { if (m.table_id && m.status === 'ready') busyIds.add(m.table_id) })
  const started: string[] = []
  for (const m of ms) {
    if (m.status !== 'ready') continue
    if (!m.table_id) {
      const free = tables.find(tb => !busyIds.has(tb.id))
      if (!free) fail(409, 'Not enough free tables. Add tables or finish other matches.')
      await store.update('sp_matches', { id: m.id }, { table_id: free.id })
      busyIds.add(free.id)
    }
    await startMatch(store, actor, { matchId: m.id })
    started.push(m.id)
  }
  return { ok: true, started: started.length }
}

export async function pauseMatch(store: Store, actor: Actor, input: { matchId: string; reason?: string }) {
  const { match, table } = await loadMatchCtx(store, input.matchId)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (match.status !== 'live') fail(409, 'Only a live match can be paused')
  const upd = await store.update('sp_matches', { id: match.id, version: match.version }, { status: 'paused', paused_at: nowIso(store), version: match.version + 1 })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.pause', reason: input.reason || null })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function resumeMatch(store: Store, actor: Actor, input: { matchId: string }) {
  const { match, table } = await loadMatchCtx(store, input.matchId)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (match.status !== 'paused') fail(409, 'This match is not paused')
  const pausedFor = match.paused_at ? store.now().getTime() - new Date(match.paused_at).getTime() : 0
  const upd = await store.update('sp_matches', { id: match.id, version: match.version }, {
    status: 'live', paused_at: null, paused_ms: (match.paused_ms || 0) + Math.max(0, pausedFor), version: match.version + 1,
  })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.resume', after: { pausedMs: pausedFor } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

// Team captains tap Ready at their table so the director knows both teams
// are seated. Informational only: the director still taps Begin.
export async function setReady(store: Store, actor: Actor, input: { matchId: string; ready: boolean; teamId?: string }) {
  const { match, table } = await loadMatchCtx(store, input.matchId)
  let side: Side | null
  if (actor.kind === 'player') {
    side = requirePlayerInMatch(actor, match)
    if (!actor.isCaptain) fail(403, 'Your team scorekeeper taps Ready')
  } else {
    if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
    side = sideOfTeam(match, input.teamId || null)
    if (!side) fail(400, 'Choose a team')
  }
  if (match.status !== 'ready') fail(409, match.status === 'pending' ? 'Your opponent is not decided yet' : 'This game already began')
  const col = side === 'a' ? 'ready_a_at' : 'ready_b_at'
  try {
    await store.update('sp_matches', { id: match.id, status: 'ready' }, { [col]: input.ready ? nowIso(store) : null })
  } catch (err) {
    if (err instanceof StoreError) fail(503, 'The Ready button needs supabase-migration-spades-ready.sql. Ask the director.')
    throw err
  }
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: input.ready ? 'match.team_ready' : 'match.team_not_ready', after: { team: teamOfSide(match, side) } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

async function clearReady(store: Store, matchId: string) {
  try { await store.update('sp_matches', { id: matchId }, { ready_a_at: null, ready_b_at: null }) } catch { /* column not migrated yet */ }
}

export async function verifyCompletion(store: Store, actor: Actor, input: { matchId: string }) {
  const { match, table } = await loadMatchCtx(store, input.matchId)
  if (!supervisesTable(actor, match.tournament_id, table)) fail(403, 'You are not assigned to this table')
  if (match.status !== 'completed') fail(409, 'This match is not complete yet')
  await store.update('sp_matches', { id: match.id }, { completion_verified_by: actorName(actor) })
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.completion_verified' })
  await touch(store, match.tournament_id)
  return { ok: true }
}

async function placeInNext(store: Store, match: MatchRow, winner: string, previousWinner?: string | null) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: match.tournament_id })
  if (!normalizeRules(t.rules).useBracket) return // open play: winners do not advance
  const ns = nextSlot(match.round, match.slot, totalRounds(t.capacity))
  if (!ns) {
    await store.update('sp_tournaments', { id: t.id }, { champion_team_id: winner, status: 'completed' })
    return
  }
  const next = await maybe<MatchRow>(store, 'sp_matches', { tournament_id: match.tournament_id, round: ns.round, slot: ns.slot })
  if (!next) fail(500, 'Bracket is missing the next match')
  if (!['pending', 'ready'].includes(next.status)) fail(409, 'The next match already started')
  const col = ns.side === 'a' ? 'team_a_id' : 'team_b_id'
  if (previousWinner && next[col] && next[col] !== previousWinner) fail(409, 'Bracket slot holds a different team. Reset the next match first.')
  const other = ns.side === 'a' ? next.team_b_id : next.team_a_id
  await store.update('sp_matches', { id: next.id }, { [col]: winner, status: other ? 'ready' : 'pending', version: next.version + 1 })
  await clearReady(store, next.id)
}

export async function finalizeMatch(store: Store, actor: Actor, input: { matchId: string }) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Match not found')
  requireDirector(actor, match.tournament_id)
  if (match.status === 'final') return { ok: true }
  if (match.status !== 'completed') fail(409, 'This match has not been completed yet')
  const open = await store.count('sp_disputes', { match_id: match.id, status: 'open' })
  if (open) fail(409, 'Resolve open disputes on this match before finalizing')
  const comp = await recomputeMatch(store, match.id)
  if (!match.result_note?.startsWith('Ended by director')) {
    const out = comp.series ? { done: comp.series.done, winner: comp.series.winner } : matchOutcome(comp.a.total, comp.b.total, match.target, true)
    if (!out.done || teamOfSide(match, out.winner!) !== match.winner_team_id) fail(409, 'Scores do not match the recorded winner. Review the hands first.')
  }
  const upd = await store.update('sp_matches', { id: match.id, version: match.version, status: 'completed' }, { status: 'final', finalized_at: nowIso(store), version: match.version + 1 })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  await placeInNext(store, match, match.winner_team_id!)
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.finalize', after: { winner: match.winner_team_id, scoreA: comp.a.total, scoreB: comp.b.total } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function forfeitMatch(store: Store, actor: Actor, input: { matchId: string; winnerTeamId: string; kind: 'forfeit' | 'dq'; reason: string }) {
  const reason = cleanText(input.reason, 'Reason', 500)
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Match not found')
  requireDirector(actor, match.tournament_id)
  if (!['ready', 'live', 'paused', 'completed'].includes(match.status)) fail(409, 'This match cannot be forfeited from its current state')
  if (!sideOfTeam(match, input.winnerTeamId)) fail(400, 'Winner must be one of the two teams')
  if (input.kind !== 'forfeit' && input.kind !== 'dq') fail(400, 'Unknown result type')
  const openHands = await store.select<HandRow>('sp_hands', { match_id: match.id, status: { in: ['bidding', 'playing', 'review', 'disputed'] } })
  for (const h of openHands) await store.update('sp_hands', { id: h.id }, { status: 'void', ruling: `Match ${input.kind}: ${reason}`, version: h.version + 1 })
  const upd = await store.update('sp_matches', { id: match.id, version: match.version }, {
    status: 'final', winner_team_id: input.winnerTeamId, result_kind: input.kind, result_note: reason,
    completed_at: nowIso(store), finalized_at: nowIso(store), version: match.version + 1,
  })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  const disputes = await store.select<DisputeRow>('sp_disputes', { match_id: match.id, status: 'open' })
  for (const d of disputes) await store.update('sp_disputes', { id: d.id }, { status: 'resolved', resolution: `Match ${input.kind}: ${reason}`, resolved_by_name: actorName(actor), resolved_at: nowIso(store) })
  await placeInNext(store, match, input.winnerTeamId)
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: `match.${input.kind}`, reason, after: { winner: input.winnerTeamId } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function resetMatch(store: Store, actor: Actor, input: { matchId: string; reason: string }) {
  const reason = cleanText(input.reason, 'Reason', 500)
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Match not found')
  requireDirector(actor, match.tournament_id)
  if (match.status === 'pending' || match.status === 'ready') fail(409, 'This match has not started')
  if (match.result_kind === 'bye') fail(409, 'Byes cannot be reset')
  if (match.status === 'final' && match.winner_team_id && await usesBracket(store, match.tournament_id)) {
    const ns = nextSlot(match.round, match.slot, await roundsOf(store, match.tournament_id))
    if (ns) {
      const next = await one<MatchRow>(store, 'sp_matches', { tournament_id: match.tournament_id, round: ns.round, slot: ns.slot })
      if (!['pending', 'ready'].includes(next.status)) fail(409, 'The next match already started. Reset it first.')
      const col = ns.side === 'a' ? 'team_a_id' : 'team_b_id'
      await store.update('sp_matches', { id: next.id }, { [col]: null, status: 'pending', version: next.version + 1 })
    } else {
      await store.update('sp_tournaments', { id: match.tournament_id }, { champion_team_id: null, status: 'live' })
    }
  }
  const hands = await store.select<HandRow>('sp_hands', { match_id: match.id, status: { neq: 'void' } })
  for (const h of hands) await store.update('sp_hands', { id: h.id }, { status: 'void', ruling: `Match reset: ${reason}`, version: h.version + 1 })
  const disputes = await store.select<DisputeRow>('sp_disputes', { match_id: match.id, status: 'open' })
  for (const d of disputes) await store.update('sp_disputes', { id: d.id }, { status: 'resolved', resolution: `Match reset: ${reason}`, resolved_by_name: actorName(actor), resolved_at: nowIso(store) })
  await store.update('sp_matches', { id: match.id }, {
    status: 'ready', winner_team_id: null, result_kind: null, result_note: null, started_at: null, paused_at: null, paused_ms: 0,
    completed_at: null, completion_verified_by: null, finalized_at: null, version: match.version + 1,
  })
  await recomputeMatch(store, match.id)
  try { await store.update('sp_matches', { id: match.id }, { games_a: 0, games_b: 0, current_game: 1 }) } catch { /* v3 not migrated */ }
  await clearReady(store, match.id)
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.reset', reason, before: { status: match.status, winner: match.winner_team_id, scoreA: match.score_a, scoreB: match.score_b } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function editMatch(store: Store, actor: Actor, input: { matchId: string; target?: number; timeLimitMin?: number; tableId?: string | null; scheduledAt?: string | null }) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Match not found')
  requireDirector(actor, match.tournament_id)
  const patch: Record<string, any> = {}
  if (input.scheduledAt !== undefined) {
    if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt))) fail(400, 'Start time is not a valid date')
    if (!['pending', 'ready'].includes(match.status)) fail(409, 'This game already began')
    patch.scheduled_at = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null
  }
  if (input.target !== undefined) {
    if (!Number.isInteger(input.target) || input.target < 10 || input.target > 2000) fail(400, 'Target must be 10 to 2000')
    if (!['pending', 'ready'].includes(match.status)) fail(409, 'Target can only change before the match starts')
    patch.target = input.target
  }
  if (input.timeLimitMin !== undefined) {
    if (!Number.isInteger(input.timeLimitMin) || input.timeLimitMin < 0 || input.timeLimitMin > 600) fail(400, 'Time limit must be 0 to 600 minutes')
    if (['completed', 'final'].includes(match.status)) fail(409, 'This match is finished')
    patch.time_limit_min = input.timeLimitMin
  }
  if (input.tableId !== undefined) {
    if (input.tableId) {
      const tb = await one<TableRow>(store, 'sp_tables', { id: input.tableId }, 'Table not found')
      if (tb.tournament_id !== match.tournament_id) fail(400, 'Table belongs to another tournament')
      const busy = await store.select<MatchRow>('sp_matches', { table_id: tb.id, status: { in: ['live', 'paused', 'completed'] } })
      if (busy.some(m => m.id !== match.id)) fail(409, 'That table has a match in progress')
    }
    if (match.status === 'final') fail(409, 'This match is finished')
    patch.table_id = input.tableId
  }
  if (!Object.keys(patch).length) return { ok: true }
  await store.update('sp_matches', { id: match.id }, { ...patch, version: match.version + 1 })
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.edit', before: { target: match.target, timeLimitMin: match.time_limit_min, tableId: match.table_id, scheduledAt: match.scheduled_at ?? null }, after: patch })
  await touch(store, match.tournament_id)
  return { ok: true }
}

// Sets one start time for every game in a round that has not begun.
export async function scheduleRound(store: Store, actor: Actor, input: { tournamentId: string; round: number; scheduledAt: string | null; autoStart?: boolean }) {
  requireDirector(actor, input.tournamentId)
  if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt))) fail(400, 'Start time is not a valid date')
  const ms = await store.select<MatchRow>('sp_matches', { tournament_id: input.tournamentId, round: input.round, status: { in: ['pending', 'ready'] } })
  const at = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null
  for (const m of ms) await store.update('sp_matches', { id: m.id }, { scheduled_at: at })
  if (input.autoStart !== undefined) await store.update('sp_tournaments', { id: input.tournamentId }, { auto_start: !!input.autoStart })
  await audit(store, actor, { tournamentId: input.tournamentId, action: 'round.schedule', after: { round: input.round, scheduledAt: at, autoStart: input.autoStart } })
  await touch(store, input.tournamentId)
  return { ok: true, updated: ms.length }
}

// Starts any game whose scheduled time has passed, when the event has
// automatic start on. Called from the pulse endpoint, so it runs as soon as
// any screen is open. Failures (for example no free table) are retried on
// the next pulse and do not spam the audit log.
export async function autoStartDue(store: Store, t: TournamentRow): Promise<number> {
  if (!t.auto_start || !t.bracket_published) return 0
  const due = await store.select<MatchRow>('sp_matches', { tournament_id: t.id, status: 'ready', scheduled_at: { lt: store.now().toISOString() } })
  let started = 0
  const system: Actor = { kind: 'owner', name: 'Scheduled start' }
  for (const m of due) {
    try {
      if (!m.table_id) {
        const tables = await store.select<TableRow>('sp_tables', { tournament_id: t.id }, { order: [{ col: 'number' }] })
        const busy = new Set((await store.select<MatchRow>('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed'] } })).map(x => x.table_id))
        const free = tables.find(tb => !busy.has(tb.id))
        if (!free) continue
        await store.update('sp_matches', { id: m.id }, { table_id: free.id })
      }
      await startMatch(store, system, { matchId: m.id })
      started++
    } catch (err) {
      console.warn('[spades] auto start skipped', m.id, err instanceof Error ? err.message : err)
    }
  }
  return started
}

// Director ends a running game early. The leader wins (series: more games
// won, then the current game score). A tie has to be played out or forfeited.
export async function endMatchNow(store: Store, actor: Actor, input: { matchId: string; reason: string }) {
  const reason = cleanText(input.reason, 'Reason', 500)
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Match not found')
  requireDirector(actor, match.tournament_id)
  if (!['live', 'paused'].includes(match.status)) fail(409, 'Only a game in progress can be ended')
  const comp = await recomputeMatch(store, match.id)
  let side: Side | null = null
  if (comp.series && comp.series.winsA !== comp.series.winsB) side = comp.series.winsA > comp.series.winsB ? 'a' : 'b'
  else if (comp.a.total !== comp.b.total) side = comp.a.total > comp.b.total ? 'a' : 'b'
  if (!side) fail(409, 'The score is tied. Play another hand, or record a forfeit.')
  const openHands = await store.select<HandRow>('sp_hands', { match_id: match.id, status: { in: ['bidding', 'playing', 'review', 'disputed'] } })
  for (const h of openHands) await store.update('sp_hands', { id: h.id }, { status: 'void', ruling: `Game ended by director: ${reason}`, version: h.version + 1 })
  const fresh = await one<MatchRow>(store, 'sp_matches', { id: match.id })
  const upd = await store.update('sp_matches', { id: match.id, version: fresh.version }, {
    status: 'completed', winner_team_id: teamOfSide(match, side), result_kind: 'played', result_note: `Ended by director: ${reason}`,
    completed_at: nowIso(store), paused_at: null, version: fresh.version + 1,
  })
  if (!upd.length) fail(409, 'This match changed on another device. Refresh and try again.')
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'match.ended_early', reason, after: { winner: teamOfSide(match, side), scoreA: comp.a.total, scoreB: comp.b.total } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

// ─── tournament + registration ──────────────────────────────────────────────

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

const EVENT_TYPES: EventType[] = ['tournament', 'small', 'exhibition', 'series', 'custom', 'test']

export async function createTournament(store: Store, actor: Actor, input: {
  name: string; slug?: string; capacity?: number; teamLimit?: number; startsAt?: string; venue?: string; address?: string
  eventType?: EventType; gamesToWin?: number; targetDefault?: number; targetFinal?: number; useBracket?: boolean
}) {
  if (actor.kind !== 'owner') fail(403, 'Only the site owner can create events')
  const name = cleanText(input.name, 'Event name', 120)
  const eventType: EventType = input.eventType && EVENT_TYPES.includes(input.eventType) ? input.eventType : 'tournament'
  let slug = slugify(input.slug || name)
  if (!slug) fail(400, 'Event link is required')
  if (eventType === 'test') slug = `test-${slug.slice(0, 40)}-${Math.floor(cryptoRandom() * 1e6).toString(36)}`
  const presetLimit: Partial<Record<EventType, number>> = { exhibition: 2, series: 2, test: 2 }
  const limit = presetLimit[eventType] ?? input.teamLimit ?? input.capacity ?? 8
  if (!Number.isInteger(limit) || limit < 2 || limit > 64) fail(400, 'Number of teams must be 2 to 64')
  if (eventType === 'small' && ![2, 4, 6].includes(limit)) fail(400, 'A small tournament has 2, 4 or 6 teams')
  const capacity = nextPow2(limit)
  const short = eventType === 'exhibition' || eventType === 'series' || eventType === 'test'
  const rules = normalizeRules({
    gamesToWin: eventType === 'series' ? input.gamesToWin ?? 2 : eventType === 'custom' ? input.gamesToWin ?? 1 : 1,
    targetDefault: input.targetDefault ?? 250,
    targetFinal: input.targetFinal ?? (short ? input.targetDefault ?? 250 : 350),
    useBracket: input.useBracket === false ? false : true,
  })
  const row = {
    id: uid(), slug, name, subtitle: null, venue: input.venue ? cleanText(input.venue, 'Venue', 120) : null,
    address: input.address ? cleanText(input.address, 'Address', 200) : null, timezone: 'America/New_York',
    starts_at: input.startsAt || null, ends_at: null, schedule_note: null, award: null,
    status: eventType === 'test' ? 'registration' : 'draft', capacity,
    registration_open: false, waitlist_enabled: eventType !== 'exhibition' && eventType !== 'series' && eventType !== 'test',
    roster_locked: false, bracket_published: false, is_featured: false,
    champion_team_id: null, rules, pulse: uid(), created_at: nowIso(store), updated_at: nowIso(store),
    event_type: eventType, is_test: eventType === 'test', team_limit: limit, auto_start: false,
  }
  try {
    await store.insert('sp_tournaments', row)
  } catch (err) {
    if (err instanceof StoreError && err.code === 'unique') fail(409, 'A tournament with that link already exists')
    throw err
  }
  await audit(store, actor, { tournamentId: row.id, action: 'tournament.create', after: { name, slug, eventType, teamLimit: limit, gamesToWin: rules.gamesToWin } })
  return { ok: true, id: row.id, slug }
}

const T_EDITABLE = ['name', 'subtitle', 'venue', 'address', 'starts_at', 'ends_at', 'schedule_note', 'award'] as const

export async function updateTournament(store: Store, actor: Actor, input: { tournamentId: string; patch: Record<string, any> }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  const p = input.patch || {}
  const patch: Record<string, any> = {}
  for (const k of T_EDITABLE) {
    if (p[k] === undefined) continue
    if (k === 'starts_at' || k === 'ends_at') {
      if (p[k] && Number.isNaN(Date.parse(p[k]))) fail(400, `${k} is not a valid date`)
      patch[k] = p[k] || null
    } else patch[k] = p[k] === null || p[k] === '' ? (k === 'name' ? fail(400, 'Name is required') : null) : cleanText(p[k], k, k === 'name' ? 120 : 300)
  }
  if (p.rules !== undefined) {
    patch.rules = normalizeRules({ ...normalizeRules(t.rules), ...p.rules })
    if (patch.rules.useBracket !== normalizeRules(t.rules).useBracket) {
      const n = await store.count('sp_matches', { tournament_id: t.id })
      if (n) fail(409, 'Clear the existing matches first (unlock the roster, or delete the games) before switching bracket on or off')
    }
  }
  const newLimit = p.team_limit ?? p.capacity
  if (newLimit !== undefined) {
    if (!Number.isInteger(newLimit) || newLimit < 2 || newLimit > 64) fail(400, 'Number of teams must be 2 to 64')
    const n = await store.count('sp_matches', { tournament_id: t.id })
    if (n) fail(409, 'The team limit cannot change after the bracket is drawn')
    const approved = await store.count('sp_teams', { tournament_id: t.id, status: 'approved' })
    if (approved > newLimit) fail(409, 'More approved teams than the new limit')
    patch.team_limit = newLimit
    patch.capacity = nextPow2(newLimit)
  }
  if (p.auto_start !== undefined) patch.auto_start = !!p.auto_start
  if (p.registration_open !== undefined) {
    if (p.registration_open && t.roster_locked) fail(409, 'Unlock the roster before reopening registration')
    patch.registration_open = !!p.registration_open
    if (p.registration_open && t.status === 'draft') patch.status = 'registration'
  }
  if (p.waitlist_enabled !== undefined) patch.waitlist_enabled = !!p.waitlist_enabled
  if (p.is_featured !== undefined) {
    if (actor.kind !== 'owner') fail(403, 'Only the site owner can feature a tournament')
    if (p.is_featured) await store.update('sp_tournaments', { is_featured: true }, { is_featured: false })
    patch.is_featured = !!p.is_featured
  }
  if (p.status !== undefined) {
    if (p.status === 'archived') {
      const live = await store.count('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed'] } })
      if (live) fail(409, 'Finish or finalize running matches before archiving')
      patch.status = 'archived'
      patch.registration_open = false
    } else if (p.status === 'registration' && t.status === 'draft') patch.status = 'registration'
    else if (p.status === 'completed' && t.champion_team_id) patch.status = 'completed'
    else if (p.status !== t.status) fail(400, 'That status change is not allowed here')
  }
  if (!Object.keys(patch).length) return { ok: true }
  await store.update('sp_tournaments', { id: t.id }, { ...patch, updated_at: nowIso(store) })
  await audit(store, actor, { tournamentId: t.id, action: 'tournament.update', before: Object.fromEntries(Object.keys(patch).map(k => [k, (t as any)[k]])), after: patch })
  await touch(store, t.id)
  return { ok: true }
}

export async function setRosterLock(store: Store, actor: Actor, input: { tournamentId: string; locked: boolean; generate?: boolean }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  if (!input.locked) {
    const started = await store.count('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed', 'final'] }, result_kind: { neq: 'bye' } })
    if (started) fail(409, 'The tournament already started')
    await store.remove('sp_matches', { tournament_id: t.id })
    await store.update('sp_tournaments', { id: t.id }, { roster_locked: false, bracket_published: false, status: 'registration' })
    await audit(store, actor, { tournamentId: t.id, action: 'roster.unlock' })
    await touch(store, t.id)
    return { ok: true }
  }
  await store.update('sp_tournaments', { id: t.id }, { roster_locked: true, registration_open: false, status: t.status === 'live' ? 'live' : 'locked' })
  await audit(store, actor, { tournamentId: t.id, action: 'roster.lock' })
  let generated = false
  const existing = await store.count('sp_matches', { tournament_id: t.id })
  if (!existing && input.generate !== false && normalizeRules(t.rules).useBracket) {
    const approved = await store.count('sp_teams', { tournament_id: t.id, status: 'approved' })
    if (approved >= 2) {
      await generateBracket(store, actor, { tournamentId: t.id, mode: 'random' })
      generated = true
    }
  }
  await touch(store, t.id)
  return { ok: true, generated }
}

interface TeamInput { name: string; player1: string; player2: string; captainSeat?: number; contact?: string; bidControl?: BidControl }

export async function registerTeam(store: Store, actor: Actor, input: { tournamentId: string } & TeamInput) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  const director = isDirector(actor, t.id)
  if (!director) {
    if (!t.registration_open || t.roster_locked || t.status === 'archived') fail(409, 'Registration is closed')
  } else if (t.roster_locked) fail(409, 'The roster is locked. Unlock it to add teams.')

  const name = cleanText(input.name, 'Team name', 40)
  const p1 = cleanText(input.player1, 'Player 1 name', 40)
  const p2 = cleanText(input.player2, 'Player 2 name', 40)
  if (nameKey(p1) === nameKey(p2)) fail(400, 'The two players need different names')
  const captainSeat = input.captainSeat === 2 ? 2 : 1
  const contact = input.contact ? cleanText(input.contact, 'Contact', 120, false) : null

  const existingTeams = await store.select<TeamRow>('sp_teams', { tournament_id: t.id })
  if (existingTeams.some(x => x.name_key === nameKey(name))) fail(409, 'That team name is already taken')
  const players = await store.select<PlayerRow>('sp_players', { tournament_id: t.id })
  for (const p of [p1, p2]) if (players.some(x => x.name_key === nameKey(p))) fail(409, `${p} is already registered on a team. Use a different display name if this is a different person.`)

  const approved = existingTeams.filter(x => x.status === 'approved').length
  const pending = existingTeams.filter(x => x.status === 'pending').length
  const limit = limitOf(t)
  let status: TeamStatus
  if (director) status = approved < limit ? 'approved' : t.waitlist_enabled ? 'waitlist' : fail(409, 'The event is full')
  else status = approved + pending < limit ? 'pending' : t.waitlist_enabled ? 'waitlist' : fail(409, 'Registration is full')
  const bidControl: BidControl = input.bidControl === 'individual' || input.bidControl === 'captain'
    ? input.bidControl : normalizeRules(t.rules).biddingMode === 'individual' ? 'individual' : 'captain'

  const teamId = uid()
  const p1Id = uid()
  const p2Id = uid()
  try {
    await store.insert('sp_teams', { id: teamId, tournament_id: t.id, name, name_key: nameKey(name), status, seed: null, contact, checked_in_at: null, created_at: nowIso(store), bid_control: bidControl })
  } catch (err) {
    if (err instanceof StoreError && err.code === 'unique') fail(409, 'That team name is already taken')
    throw err
  }
  try {
    await store.insert('sp_players', [
      { id: p1Id, tournament_id: t.id, team_id: teamId, seat: 1, display_name: p1, name_key: nameKey(p1), is_captain: captainSeat === 1, contact: null, created_at: nowIso(store) },
      { id: p2Id, tournament_id: t.id, team_id: teamId, seat: 2, display_name: p2, name_key: nameKey(p2), is_captain: captainSeat === 2, contact: null, created_at: nowIso(store) },
    ])
  } catch (err) {
    await store.remove('sp_players', { team_id: teamId })
    await store.remove('sp_teams', { id: teamId })
    if (err instanceof StoreError && err.code === 'unique') fail(409, 'One of those players is already registered on a team')
    throw err
  }
  await audit(store, actor, { tournamentId: t.id, action: director ? 'team.add' : 'team.register', after: { name, players: [p1, p2], captainSeat, status } })
  await touch(store, t.id)
  return { ok: true, teamId, status, captainPlayerId: captainSeat === 1 ? p1Id : p2Id }
}

async function teamHasStarted(store: Store, teamId: string): Promise<boolean> {
  const a = await store.select<MatchRow>('sp_matches', { team_a_id: teamId })
  const b = await store.select<MatchRow>('sp_matches', { team_b_id: teamId })
  return [...a, ...b].some(m => m.result_kind !== 'bye' && !['pending', 'ready'].includes(m.status))
}

export async function updateTeam(store: Store, actor: Actor, input: { teamId: string; name?: string; player1?: string; player2?: string; captainSeat?: number; contact?: string }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  requireDirector(actor, team.tournament_id)
  if (await teamHasStarted(store, team.id)) fail(409, 'This team already played. Rosters cannot change now.')
  const players = await store.select<PlayerRow>('sp_players', { team_id: team.id }, { order: [{ col: 'seat' }] })
  const before = { name: team.name, players: players.map(p => p.display_name), captainSeat: players.find(p => p.is_captain)?.seat, contact: team.contact }
  if (input.name !== undefined) {
    const name = cleanText(input.name, 'Team name', 40)
    if (nameKey(name) !== team.name_key) {
      const clash = await store.count('sp_teams', { tournament_id: team.tournament_id, name_key: nameKey(name) })
      if (clash) fail(409, 'That team name is already taken')
      await store.update('sp_teams', { id: team.id }, { name, name_key: nameKey(name) })
    }
  }
  if (input.contact !== undefined) await store.update('sp_teams', { id: team.id }, { contact: input.contact ? cleanText(input.contact, 'Contact', 120, false) : null })
  for (const seat of [1, 2]) {
    const raw = seat === 1 ? input.player1 : input.player2
    if (raw === undefined) continue
    const nm = cleanText(raw, `Player ${seat} name`, 40)
    const p = players.find(x => x.seat === seat)
    if (!p || p.name_key === nameKey(nm)) continue
    const clash = await store.count('sp_players', { tournament_id: team.tournament_id, name_key: nameKey(nm) })
    if (clash) fail(409, `${nm} is already registered on a team`)
    await store.update('sp_players', { id: p.id }, { display_name: nm, name_key: nameKey(nm) })
    // A new person in this seat: old invitations and sessions stop working.
    await revokeSubject(store, { playerId: p.id })
  }
  if (input.captainSeat === 1 || input.captainSeat === 2) {
    await store.update('sp_players', { team_id: team.id }, { is_captain: false })
    await store.update('sp_players', { team_id: team.id, seat: input.captainSeat }, { is_captain: true })
  }
  const after = await store.select<PlayerRow>('sp_players', { team_id: team.id }, { order: [{ col: 'seat' }] })
  const t2 = await one<TeamRow>(store, 'sp_teams', { id: team.id })
  await audit(store, actor, { tournamentId: team.tournament_id, action: 'team.update', before, after: { name: t2.name, players: after.map(p => p.display_name), captainSeat: after.find(p => p.is_captain)?.seat, contact: t2.contact } })
  await touch(store, team.tournament_id)
  return { ok: true }
}

export async function setTeamStatus(store: Store, actor: Actor, input: { teamId: string; status: TeamStatus }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  requireDirector(actor, team.tournament_id)
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: team.tournament_id })
  if (!['pending', 'approved', 'waitlist', 'rejected'].includes(input.status)) fail(400, 'Unknown status')
  if (t.roster_locked) fail(409, 'The roster is locked')
  if (input.status === 'approved' && team.status !== 'approved') {
    const approved = await store.count('sp_teams', { tournament_id: t.id, status: 'approved' })
    if (approved >= limitOf(t)) fail(409, `Already ${limitOf(t)} approved teams. Move one to the waitlist first.`)
  }
  await store.update('sp_teams', { id: team.id }, { status: input.status })
  await audit(store, actor, { tournamentId: t.id, action: 'team.status', before: { status: team.status }, after: { status: input.status, team: team.name } })
  await touch(store, t.id)
  return { ok: true }
}

// Approves pending teams in sign up order until the bracket is full. Anything
// left over stays pending so the director can waitlist or reject it.
export async function approveAllTeams(store: Store, actor: Actor, input: { tournamentId: string }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  if (t.roster_locked) fail(409, 'The roster is locked')
  const teams = await store.select<TeamRow>('sp_teams', { tournament_id: t.id }, { order: [{ col: 'created_at' }] })
  let open = limitOf(t) - teams.filter(x => x.status === 'approved').length
  const pending = teams.filter(x => x.status === 'pending')
  if (!pending.length) fail(409, 'No pending teams to approve')
  if (open <= 0) fail(409, `Already ${limitOf(t)} approved teams. The event is full.`)
  const approved: string[] = []
  for (const team of pending) {
    if (open <= 0) break
    await store.update('sp_teams', { id: team.id, status: 'pending' }, { status: 'approved' })
    approved.push(team.name)
    open--
  }
  await audit(store, actor, { tournamentId: t.id, action: 'team.approve_all', after: { approved } })
  await touch(store, t.id)
  return { ok: true, approved: approved.length, leftPending: pending.length - approved.length }
}

export async function removeTeam(store: Store, actor: Actor, input: { teamId: string }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  requireDirector(actor, team.tournament_id)
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: team.tournament_id })
  if (t.roster_locked) fail(409, 'The roster is locked. Unlock it to remove teams.')
  const inBracket = (await store.count('sp_matches', { team_a_id: team.id })) + (await store.count('sp_matches', { team_b_id: team.id }))
  if (inBracket) fail(409, 'This team is in the bracket')
  const players = await store.select<PlayerRow>('sp_players', { team_id: team.id })
  for (const p of players) {
    await store.remove('sp_sessions', { player_id: p.id })
    await store.remove('sp_invitations', { player_id: p.id })
  }
  await store.remove('sp_players', { team_id: team.id })
  await store.remove('sp_teams', { id: team.id })
  await audit(store, actor, { tournamentId: t.id, action: 'team.remove', before: { name: team.name, players: players.map(p => p.display_name) } })
  await touch(store, t.id)
  return { ok: true }
}

export async function checkInTeam(store: Store, actor: Actor, input: { teamId: string; present: boolean }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  requireStaff(actor, team.tournament_id)
  await store.update('sp_teams', { id: team.id }, { checked_in_at: input.present ? nowIso(store) : null })
  await audit(store, actor, { tournamentId: team.tournament_id, action: input.present ? 'team.check_in' : 'team.check_out', after: { team: team.name } })
  await touch(store, team.tournament_id)
  return { ok: true }
}

// ─── bracket ────────────────────────────────────────────────────────────────

export async function generateBracket(store: Store, actor: Actor, input: { tournamentId: string; mode: 'random' | 'manual'; order?: string[] }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  if (!normalizeRules(t.rules).useBracket) fail(409, 'This event does not use a bracket. Add games on the Run tab instead.')
  if (!t.roster_locked) fail(409, 'Lock the roster before generating the bracket')
  const started = await store.count('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed'] } })
  const finals = (await store.select<MatchRow>('sp_matches', { tournament_id: t.id, status: 'final' })).filter(m => m.result_kind !== 'bye')
  if (started || finals.length) fail(409, 'Matches already started. The bracket cannot be regenerated.')
  const teams = await store.select<TeamRow>('sp_teams', { tournament_id: t.id, status: 'approved' })
  if (teams.length < 2) fail(409, 'Approve at least two teams first')
  if (teams.length > limitOf(t)) fail(409, `More approved teams than the limit of ${limitOf(t)}`)
  // The bracket is sized to the teams actually playing; extra slots become byes.
  const capacity = nextPow2(teams.length)
  if (capacity !== t.capacity) await store.update('sp_tournaments', { id: t.id }, { capacity })
  let order: string[]
  if (input.mode === 'manual') {
    order = Array.isArray(input.order) ? input.order : []
    const ids = new Set(teams.map(x => x.id))
    if (order.length !== teams.length || new Set(order).size !== order.length || !order.every(id => ids.has(id))) {
      fail(400, 'Manual bracket must list every approved team exactly once')
    }
  } else {
    order = shuffle(teams.map(x => x.id), cryptoRandom)
  }
  const slots = buildBracket(order, capacity)
  const rounds = totalRounds(capacity)
  const rules = normalizeRules(t.rules)
  await store.remove('sp_matches', { tournament_id: t.id })
  for (let i = 0; i < order.length; i++) await store.update('sp_teams', { id: order[i] }, { seed: i + 1 })
  const rows = slots.map(s => ({
    id: uid(), tournament_id: t.id, round: s.round, slot: s.slot, team_a_id: s.teamA, team_b_id: s.teamB, table_id: null,
    status: s.round === 1 && s.teamA && s.teamB ? 'ready' : 'pending', winner_team_id: null, result_kind: null, result_note: null,
    target: s.round === rounds ? rules.targetFinal : rules.targetDefault,
    time_limit_min: rules.gamesToWin > 1 ? 0 : s.round === rounds ? rules.timeFinalMin : rules.timeDefaultMin,
    rules: null, started_at: null, paused_at: null, paused_ms: 0, completed_at: null, completion_verified_by: null, finalized_at: null,
    score_a: 0, score_b: 0, bags_a: 0, bags_b: 0, hands_verified: 0, version: 1, created_at: nowIso(store),
  }))
  await store.insert('sp_matches', rows)
  // Default table plan for round one: match slot N plays at table N+1.
  const tables = await store.select<TableRow>('sp_tables', { tournament_id: t.id }, { order: [{ col: 'number' }] })
  const r1 = rows.filter(r => r.round === 1 && r.status === 'ready')
  for (let i = 0; i < r1.length && i < tables.length; i++) await store.update('sp_matches', { id: r1[i].id }, { table_id: tables[i].id })
  // Byes advance immediately.
  for (const r of rows.filter(r => r.round === 1 && (!r.team_a_id || !r.team_b_id))) {
    const winner = (r.team_a_id || r.team_b_id) as string
    await store.update('sp_matches', { id: r.id }, { status: 'final', winner_team_id: winner, result_kind: 'bye', result_note: 'Bye', finalized_at: nowIso(store) })
    await placeInNext(store, { ...(r as any), status: 'final' }, winner)
  }
  await store.update('sp_tournaments', { id: t.id }, { bracket_published: false })
  await audit(store, actor, { tournamentId: t.id, action: 'bracket.generate', after: { mode: input.mode, seeds: order } })
  await touch(store, t.id)
  return { ok: true }
}

export async function publishBracket(store: Store, actor: Actor, input: { tournamentId: string; published: boolean }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  const n = await store.count('sp_matches', { tournament_id: t.id })
  if (input.published && !n) fail(409, 'Generate the bracket first')
  if (!input.published) {
    const started = await store.count('sp_matches', { tournament_id: t.id, status: { in: ['live', 'paused', 'completed'] } })
    if (started) fail(409, 'Matches are running. The bracket stays published.')
  }
  await store.update('sp_tournaments', { id: t.id }, { bracket_published: !!input.published })
  await audit(store, actor, { tournamentId: t.id, action: input.published ? 'bracket.publish' : 'bracket.unpublish' })
  await touch(store, t.id)
  return { ok: true }
}

// ─── staff + tables ─────────────────────────────────────────────────────────

export async function addStaff(store: Store, actor: Actor, input: { tournamentId: string; name: string; role: 'director' | 'supervisor'; contact?: string }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  if (input.role === 'director' && actor.kind !== 'owner') fail(403, 'Only the site owner can add directors')
  if (input.role !== 'director' && input.role !== 'supervisor') fail(400, 'Role must be director or supervisor')
  const name = cleanText(input.name, 'Name', 40)
  const row = { id: uid(), tournament_id: t.id, display_name: name, role: input.role, active: true, contact: input.contact ? cleanText(input.contact, 'Contact', 120, false) : null, created_at: nowIso(store) }
  await store.insert('sp_staff', row)
  await audit(store, actor, { tournamentId: t.id, action: 'staff.add', after: { name, role: input.role } })
  const invite = await issueInvite(store, actor, { staffId: row.id })
  return { ok: true, staffId: row.id, invite }
}

export async function updateStaff(store: Store, actor: Actor, input: { staffId: string; active?: boolean; role?: 'director' | 'supervisor' }) {
  const s = await one<StaffRow>(store, 'sp_staff', { id: input.staffId }, 'Staff member not found')
  requireDirector(actor, s.tournament_id)
  if ((input.role === 'director' || s.role === 'director') && actor.kind !== 'owner') fail(403, 'Only the site owner can change directors')
  const patch: Record<string, any> = {}
  if (input.active !== undefined) patch.active = !!input.active
  if (input.role !== undefined) {
    if (input.role !== 'director' && input.role !== 'supervisor') fail(400, 'Role must be director or supervisor')
    patch.role = input.role
  }
  await store.update('sp_staff', { id: s.id }, patch)
  if (patch.active === false) {
    await revokeSubject(store, { staffId: s.id })
    await store.update('sp_tables', { supervisor_id: s.id }, { supervisor_id: null })
  }
  await audit(store, actor, { tournamentId: s.tournament_id, action: 'staff.update', before: { active: s.active, role: s.role, name: s.display_name }, after: patch })
  await touch(store, s.tournament_id)
  return { ok: true }
}

export async function setTableCount(store: Store, actor: Actor, input: { tournamentId: string; count: number }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Tournament not found')
  requireDirector(actor, t.id)
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 32) fail(400, 'Table count must be 1 to 32')
  const tables = await store.select<TableRow>('sp_tables', { tournament_id: t.id })
  for (let n = 1; n <= input.count; n++) {
    if (!tables.some(x => x.number === n)) await store.insert('sp_tables', { id: uid(), tournament_id: t.id, number: n, label: null, supervisor_id: null, created_at: nowIso(store) })
  }
  for (const x of tables.filter(x => x.number > input.count)) {
    const used = await store.count('sp_matches', { table_id: x.id, status: { in: ['live', 'paused', 'completed'] } })
    if (used) fail(409, `Table ${x.number} has a match in progress`)
    await store.update('sp_matches', { table_id: x.id }, { table_id: null })
    await store.remove('sp_tables', { id: x.id })
  }
  await audit(store, actor, { tournamentId: t.id, action: 'tables.set', before: { count: tables.length }, after: { count: input.count } })
  await touch(store, t.id)
  return { ok: true }
}

export async function assignTableSupervisor(store: Store, actor: Actor, input: { tableId: string; staffId: string | null }) {
  const tb = await one<TableRow>(store, 'sp_tables', { id: input.tableId }, 'Table not found')
  requireDirector(actor, tb.tournament_id)
  if (input.staffId) {
    const s = await one<StaffRow>(store, 'sp_staff', { id: input.staffId }, 'Staff member not found')
    if (s.tournament_id !== tb.tournament_id || !s.active) fail(400, 'That staff member is not active in this tournament')
  }
  await store.update('sp_tables', { id: tb.id }, { supervisor_id: input.staffId || null })
  await audit(store, actor, { tournamentId: tb.tournament_id, action: 'table.assign_supervisor', before: { table: tb.number, supervisor: tb.supervisor_id }, after: { supervisor: input.staffId || null } })
  await touch(store, tb.tournament_id)
  return { ok: true }
}

// ─── invitations + sessions ─────────────────────────────────────────────────

export const INVITE_TTL_MS = 1000 * 60 * 60 * 72 // 72 hours
export const PLAYER_SESSION_MS = 1000 * 60 * 60 * 18
export const STAFF_SESSION_MS = 1000 * 60 * 60 * 14
export const OWNER_SESSION_MS = 1000 * 60 * 60 * 12

async function revokeSubject(store: Store, who: { playerId?: string; staffId?: string }) {
  const now = nowIso(store)
  const col = who.playerId ? 'player_id' : 'staff_id'
  const id = (who.playerId || who.staffId) as string
  await store.update('sp_invitations', { [col]: id, used_at: null, revoked_at: null }, { revoked_at: now })
  await store.update('sp_sessions', { [col]: id, revoked_at: null }, { revoked_at: now })
}

export async function issueInvite(store: Store, actor: Actor, input: { playerId?: string; staffId?: string; revokeSessions?: boolean }) {
  let tournamentId: string
  let name: string
  let kind: 'player' | 'staff'
  if (input.playerId) {
    const p = await one<PlayerRow>(store, 'sp_players', { id: input.playerId }, 'Player not found')
    tournamentId = p.tournament_id
    name = p.display_name
    kind = 'player'
  } else if (input.staffId) {
    const s = await one<StaffRow>(store, 'sp_staff', { id: input.staffId }, 'Staff member not found')
    if (!s.active) fail(409, 'This staff member is deactivated')
    tournamentId = s.tournament_id
    name = s.display_name
    kind = 'staff'
  } else fail(400, 'Choose a player or staff member')
  requireDirector(actor, tournamentId)
  return mintAccessCode(store, actor, { tournamentId, kind, name, playerId: input.playerId || null, staffId: input.staffId || null, revokeSessions: !!input.revokeSessions })
}

// Access codes replace any earlier code for the same person and work until
// they expire or the director issues a new one. They can be typed on more
// than one phone (e.g. a scorekeeper switching phones), so the director
// reissues a code to cut off a lost phone. Only the hash is stored.
async function mintAccessCode(store: Store, actor: Actor, m: { tournamentId: string; kind: 'player' | 'staff'; name: string; playerId: string | null; staffId: string | null; revokeSessions: boolean }) {
  const now = nowIso(store)
  const col = m.kind === 'player' ? 'player_id' : 'staff_id'
  const id = (m.playerId || m.staffId) as string
  await store.update('sp_invitations', { [col]: id, revoked_at: null }, { revoked_at: now })
  if (m.revokeSessions) await store.update('sp_sessions', { [col]: id, revoked_at: null }, { revoked_at: now })
  const code = newAccessCode()
  const expiresAt = new Date(store.now().getTime() + INVITE_TTL_MS).toISOString()
  await store.insert('sp_invitations', {
    id: uid(), tournament_id: m.tournamentId, kind: m.kind, player_id: m.playerId, staff_id: m.staffId,
    token_hash: hashToken(code), expires_at: expiresAt, used_at: null, revoked_at: null, created_at: now,
  })
  await audit(store, actor, { tournamentId: m.tournamentId, action: m.revokeSessions ? 'invite.reissue' : 'invite.issue', after: { kind: m.kind, name: m.name } })
  await touch(store, m.tournamentId)
  return { token: formatCode(code), kind: m.kind, name: m.name, expiresAt }
}

// Called right after a public registration so the scorekeeper can sign back
// in with a typed code. Only for a captain of a team registered moments ago.
export async function issueRegistrantCode(store: Store, playerId: string) {
  const p = await one<PlayerRow>(store, 'sp_players', { id: playerId }, 'Player not found')
  if (!p.is_captain) fail(403, 'Only the team scorekeeper gets an access code')
  const existing = await store.count('sp_invitations', { player_id: p.id })
  if (existing) fail(409, 'This player already has an access code. Ask the director for a new one.')
  return mintAccessCode(store, PUBLIC, { tournamentId: p.tournament_id, kind: 'player', name: p.display_name, playerId: p.id, staffId: null, revokeSessions: false })
}

export async function issueTeamInvites(store: Store, actor: Actor, input: { teamId: string; revokeSessions?: boolean }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  requireDirector(actor, team.tournament_id)
  if (team.status !== 'approved') fail(409, 'Approve the team before sending invitations')
  const players = await store.select<PlayerRow>('sp_players', { team_id: team.id }, { order: [{ col: 'seat' }] })
  const out = []
  for (const p of players) out.push({ playerId: p.id, ...(await issueInvite(store, actor, { playerId: p.id, revokeSessions: input.revokeSessions })) })
  return { ok: true, invites: out }
}

export async function revokeAccess(store: Store, actor: Actor, input: { playerId?: string; staffId?: string }) {
  const row = input.playerId
    ? await one<PlayerRow>(store, 'sp_players', { id: input.playerId }, 'Player not found')
    : await one<StaffRow>(store, 'sp_staff', { id: input.staffId || '' }, 'Staff member not found')
  requireDirector(actor, row.tournament_id)
  await revokeSubject(store, input)
  await audit(store, actor, { tournamentId: row.tournament_id, action: 'access.revoke', after: { name: row.display_name } })
  await touch(store, row.tournament_id)
  return { ok: true }
}

export interface InvitePreview {
  status: 'ok' | 'used' | 'expired' | 'revoked' | 'invalid'
  kind?: 'player' | 'staff'
  name?: string
  teamName?: string
  role?: string
  tournamentName?: string
  tournamentSlug?: string
  playerId?: string
  staffId?: string
}

// Accepts a typed access code (any case, with or without the dash) or an
// older long link token.
function inviteKey(token: unknown): string | null {
  if (typeof token !== 'string') return null
  if (isAccessCode(token)) return normalizeCode(token)
  const t = token.trim()
  return t.length >= 20 && t.length <= 100 ? t : null
}

export async function previewInvite(store: Store, token: string): Promise<InvitePreview> {
  const key = inviteKey(token)
  if (!key) return { status: 'invalid' }
  const inv = await maybe<InviteRow>(store, 'sp_invitations', { token_hash: hashToken(key) })
  if (!inv) return { status: 'invalid' }
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: inv.tournament_id })
  const base: InvitePreview = { status: 'ok', kind: inv.kind, tournamentName: t.name, tournamentSlug: t.slug, playerId: inv.player_id || undefined, staffId: inv.staff_id || undefined }
  if (inv.kind === 'player') {
    const p = await maybe<PlayerRow>(store, 'sp_players', { id: inv.player_id })
    if (!p) return { status: 'invalid' }
    const team = await one<TeamRow>(store, 'sp_teams', { id: p.team_id })
    Object.assign(base, { name: p.display_name, teamName: team.name, role: p.is_captain ? 'Captain' : 'Player' })
  } else {
    const s = await maybe<StaffRow>(store, 'sp_staff', { id: inv.staff_id })
    if (!s || !s.active) return { status: 'revoked' }
    Object.assign(base, { name: s.display_name, role: s.role === 'director' ? 'Tournament Director' : 'Table Supervisor' })
  }
  if (inv.revoked_at) return { ...base, status: 'revoked' }
  if (inv.used_at && !isAccessCode(key)) return { ...base, status: 'used' }
  if (new Date(inv.expires_at).getTime() <= store.now().getTime()) return { ...base, status: 'expired' }
  return base
}

export async function redeemInvite(store: Store, token: string) {
  const preview = await previewInvite(store, token)
  if (preview.status !== 'ok') {
    const msg = {
      used: 'This link was already used. Ask the tournament director for an access code.',
      expired: 'This access code expired. Ask the tournament director for a new one.',
      revoked: 'This access code was replaced. Ask the tournament director for the new one.',
      invalid: 'That access code is not right. Check the letters and try again.',
      ok: '',
    }[preview.status]
    fail(preview.status === 'invalid' ? 404 : 410, msg)
  }
  const key = inviteKey(token) as string
  const inv = await one<InviteRow>(store, 'sp_invitations', { token_hash: hashToken(key) })
  const used = await store.update('sp_invitations', { id: inv.id, used_at: null, revoked_at: null }, { used_at: nowIso(store) })
  // Long links work once; typed access codes can be reused until replaced.
  if (!used.length && !isAccessCode(key)) fail(410, 'This invitation was already used. Ask the tournament director for a new one.')
  const session = await createSession(store, {
    kind: inv.kind, tournamentId: inv.tournament_id, playerId: inv.player_id, staffId: inv.staff_id, invitationId: inv.id,
    ttlMs: inv.kind === 'player' ? PLAYER_SESSION_MS : STAFF_SESSION_MS,
  })
  await audit(store, { kind: 'public' }, { tournamentId: inv.tournament_id, action: 'invite.redeemed', after: { kind: inv.kind, name: preview.name } })
  await touch(store, inv.tournament_id)
  return { ...session, preview }
}

export async function createSession(store: Store, s: { kind: 'owner' | 'staff' | 'player'; tournamentId: string | null; playerId: string | null; staffId: string | null; invitationId: string | null; ttlMs: number }) {
  const token = newToken()
  const expiresAt = new Date(store.now().getTime() + s.ttlMs).toISOString()
  await store.insert('sp_sessions', {
    id: uid(), token_hash: hashToken(token), kind: s.kind, tournament_id: s.tournamentId, player_id: s.playerId, staff_id: s.staffId,
    invitation_id: s.invitationId, expires_at: expiresAt, revoked_at: null, created_at: nowIso(store),
  })
  return { sessionToken: token, expiresAt }
}

export async function resolveSession(store: Store, token: string | null | undefined): Promise<Actor> {
  if (!token || token.length < 20 || token.length > 100) return PUBLIC
  const s = await maybe<SessionRow>(store, 'sp_sessions', { token_hash: hashToken(token) })
  if (!s || s.revoked_at || new Date(s.expires_at).getTime() <= store.now().getTime()) return PUBLIC
  if (s.kind === 'owner') return { kind: 'owner', name: 'Tournament Director', sessionId: s.id }
  if (s.kind === 'staff' && s.staff_id) {
    const st = await maybe<StaffRow>(store, 'sp_staff', { id: s.staff_id })
    if (!st || !st.active) return PUBLIC
    return { kind: 'staff', staffId: st.id, tournamentId: st.tournament_id, role: st.role, name: st.display_name, sessionId: s.id }
  }
  if (s.kind === 'player' && s.player_id) {
    const p = await maybe<PlayerRow>(store, 'sp_players', { id: s.player_id })
    if (!p) return PUBLIC
    return { kind: 'player', playerId: p.id, teamId: p.team_id, tournamentId: p.tournament_id, isCaptain: p.is_captain, name: p.display_name, sessionId: s.id }
  }
  return PUBLIC
}

export async function revokeSession(store: Store, token: string) {
  if (!token) return
  await store.update('sp_sessions', { token_hash: hashToken(token), revoked_at: null }, { revoked_at: nowIso(store) })
}


// ─── team choices ───────────────────────────────────────────────────────────

export async function setBidControl(store: Store, actor: Actor, input: { teamId: string; control: BidControl }) {
  const team = await one<TeamRow>(store, 'sp_teams', { id: input.teamId }, 'Team not found')
  if (input.control !== 'captain' && input.control !== 'individual') fail(400, 'Choose captain or each player')
  const director = isDirector(actor, team.tournament_id)
  if (!director && !(actor.kind === 'player' && actor.teamId === team.id && actor.isCaptain)) fail(403, 'Only your captain can change this')
  const playing = (await store.select<MatchRow>('sp_matches', { team_a_id: team.id, status: { in: ['live', 'paused'] } })).length
    + (await store.select<MatchRow>('sp_matches', { team_b_id: team.id, status: { in: ['live', 'paused'] } })).length
  if (playing && !director) fail(409, 'Your game already began. Ask the director to change this.')
  await store.update('sp_teams', { id: team.id }, { bid_control: input.control })
  await audit(store, actor, { tournamentId: team.tournament_id, action: 'team.bid_control', before: { control: team.bid_control ?? null }, after: { control: input.control, team: team.name } })
  await touch(store, team.tournament_id)
  return { ok: true }
}

// The captain makes an access code for their partner so the partner can
// sign in on their own phone. A new code replaces the previous partner code.
export async function issuePartnerCode(store: Store, actor: Actor) {
  if (actor.kind !== 'player' || !actor.isCaptain) fail(403, 'Only the team captain can invite a partner')
  const partner = (await store.select<PlayerRow>('sp_players', { team_id: actor.teamId })).find(p => p.id !== actor.playerId)
  if (!partner) fail(404, 'Partner not found')
  return mintAccessCode(store, actor, { tournamentId: actor.tournamentId, kind: 'player', name: partner.display_name, playerId: partner.id, staffId: null, revokeSessions: false })
}

// ─── test mode ──────────────────────────────────────────────────────────────

// A private practice event: two teams, four simulated players, one table,
// bracket drawn and published, ready to Begin. Never featured, never in the
// winners history, and deletable.
export async function createTestEvent(store: Store, actor: Actor, input: { gamesToWin?: number; target?: number; control?: BidControl } = {}) {
  if (actor.kind !== 'owner') fail(403, 'Only the site owner can create test matches')
  const stamp = new Date(store.now().getTime()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
  const ev = await createTournament(store, actor, {
    name: `Test match ${stamp}`, eventType: 'test', gamesToWin: input.gamesToWin ?? 1, targetDefault: input.target ?? 250, targetFinal: input.target ?? 250,
  })
  await setTableCount(store, actor, { tournamentId: ev.id, count: 1 })
  const control = input.control === 'individual' ? 'individual' : 'captain'
  await registerTeam(store, actor, { tournamentId: ev.id, name: 'Test Team North', player1: 'Sim Ana', player2: 'Sim Ben', bidControl: control })
  await registerTeam(store, actor, { tournamentId: ev.id, name: 'Test Team South', player1: 'Sim Cy', player2: 'Sim Dee', bidControl: control })
  await setRosterLock(store, actor, { tournamentId: ev.id, locked: true })
  await publishBracket(store, actor, { tournamentId: ev.id, published: true })
  return { ok: true, id: ev.id, slug: ev.slug }
}

export async function deleteTestEvent(store: Store, actor: Actor, input: { tournamentId: string }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Event not found')
  requireDirector(actor, t.id)
  if (!t.is_test) fail(403, 'Only test events can be deleted')
  const tid = t.id
  for (const table of ['sp_hand_approvals', 'sp_score_ledger', 'sp_book_reports', 'sp_bids', 'sp_disputes', 'sp_hands', 'sp_sessions', 'sp_invitations']) {
    await store.remove(table, { tournament_id: tid })
  }
  await store.update('sp_tournaments', { id: tid }, { champion_team_id: null })
  await store.remove('sp_matches', { tournament_id: tid })
  await store.remove('sp_tables', { tournament_id: tid })
  await store.remove('sp_players', { tournament_id: tid })
  await store.remove('sp_teams', { tournament_id: tid })
  await store.remove('sp_staff', { tournament_id: tid })
  await store.remove('sp_audit', { tournament_id: tid })
  await store.remove('sp_tournaments', { id: tid })
  return { ok: true }
}

// In a test event, the director can act as any simulated player to see and
// do exactly what that player would. Never allowed in real events.
export async function actAsPlayer(store: Store, actor: Actor, playerId: string): Promise<Actor> {
  const p = await one<PlayerRow>(store, 'sp_players', { id: playerId }, 'Player not found')
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: p.tournament_id })
  if (!t.is_test) fail(403, 'Acting as a player is only allowed in test matches')
  if (!isDirector(actor, t.id)) fail(403, 'Director access required')
  return { kind: 'player', playerId: p.id, teamId: p.team_id, tournamentId: p.tournament_id, isCaptain: p.is_captain, name: p.display_name }
}


// ─── open play (no bracket) + bulk start + event delete ─────────────────────

async function usesBracket(store: Store, tournamentId: string): Promise<boolean> {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: tournamentId })
  return normalizeRules(t.rules).useBracket
}

// Open play: the director pairs any two approved teams into a game.
export async function createGame(store: Store, actor: Actor, input: { tournamentId: string; teamAId: string; teamBId: string; tableId?: string | null; scheduledAt?: string | null }) {
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Event not found')
  requireDirector(actor, t.id)
  const rules = normalizeRules(t.rules)
  if (rules.useBracket) fail(409, 'This event uses a bracket. Turn the bracket off in the event settings to add games by hand.')
  if (!input.teamAId || !input.teamBId || input.teamAId === input.teamBId) fail(400, 'Pick two different teams')
  for (const id of [input.teamAId, input.teamBId]) {
    const team = await one<TeamRow>(store, 'sp_teams', { id }, 'Team not found')
    if (team.tournament_id !== t.id || team.status !== 'approved') fail(400, 'Both teams must be approved teams in this event')
  }
  if (input.tableId) {
    const tb = await one<TableRow>(store, 'sp_tables', { id: input.tableId }, 'Table not found')
    if (tb.tournament_id !== t.id) fail(400, 'Table belongs to another event')
  }
  if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt))) fail(400, 'Start time is not a valid date')
  const last = await store.select<MatchRow>('sp_matches', { tournament_id: t.id, round: 1 }, { order: [{ col: 'slot', asc: false }], limit: 1 })
  const row = {
    id: uid(), tournament_id: t.id, round: 1, slot: (last[0]?.slot ?? -1) + 1, team_a_id: input.teamAId, team_b_id: input.teamBId,
    table_id: input.tableId || null, status: 'ready', winner_team_id: null, result_kind: null, result_note: null,
    target: rules.targetDefault, time_limit_min: rules.gamesToWin > 1 ? 0 : rules.timeDefaultMin,
    rules: null, started_at: null, paused_at: null, paused_ms: 0, completed_at: null, completion_verified_by: null, finalized_at: null,
    score_a: 0, score_b: 0, bags_a: 0, bags_b: 0, hands_verified: 0, version: 1, created_at: nowIso(store),
    ...(input.scheduledAt ? { scheduled_at: new Date(input.scheduledAt).toISOString() } : {}),
  }
  await store.insert('sp_matches', row)
  if (!t.bracket_published) await store.update('sp_tournaments', { id: t.id }, { bracket_published: true })
  await audit(store, actor, { tournamentId: t.id, matchId: row.id, action: 'game.create', after: { teamA: input.teamAId, teamB: input.teamBId, tableId: row.table_id, scheduledAt: input.scheduledAt || null } })
  await touch(store, t.id)
  return { ok: true, matchId: row.id }
}

// Open play: change who plays in a game that has not begun.
export async function setGameTeams(store: Store, actor: Actor, input: { matchId: string; teamAId: string; teamBId: string }) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Game not found')
  requireDirector(actor, match.tournament_id)
  if (await usesBracket(store, match.tournament_id)) fail(409, 'Bracket events change matchups by redrawing or seeding the bracket')
  if (!['ready', 'pending'].includes(match.status)) fail(409, 'This game already began')
  if (!input.teamAId || input.teamAId === input.teamBId) fail(400, 'Pick two different teams')
  for (const id of [input.teamAId, input.teamBId]) {
    const team = await one<TeamRow>(store, 'sp_teams', { id }, 'Team not found')
    if (team.tournament_id !== match.tournament_id || team.status !== 'approved') fail(400, 'Both teams must be approved teams in this event')
  }
  await store.update('sp_matches', { id: match.id }, { team_a_id: input.teamAId, team_b_id: input.teamBId, status: 'ready', version: match.version + 1 })
  await clearReady(store, match.id)
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'game.teams', before: { teamA: match.team_a_id, teamB: match.team_b_id }, after: { teamA: input.teamAId, teamB: input.teamBId } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

export async function deleteGame(store: Store, actor: Actor, input: { matchId: string }) {
  const match = await one<MatchRow>(store, 'sp_matches', { id: input.matchId }, 'Game not found')
  requireDirector(actor, match.tournament_id)
  if (await usesBracket(store, match.tournament_id)) fail(409, 'Bracket games cannot be deleted one by one')
  if (!['ready', 'pending'].includes(match.status)) fail(409, 'This game already began. Restart or end it instead.')
  const hands = await store.count('sp_hands', { match_id: match.id })
  if (hands) fail(409, 'This game has hand history. Restart or end it instead.')
  await store.remove('sp_matches', { id: match.id })
  await audit(store, actor, { tournamentId: match.tournament_id, matchId: match.id, action: 'game.delete', before: { teamA: match.team_a_id, teamB: match.team_b_id } })
  await touch(store, match.tournament_id)
  return { ok: true }
}

// Begin every game that is ready (optionally only those where both teams
// tapped Ready). Games that cannot start (team busy, no table) are skipped
// and reported, never half started.
export async function startAllReady(store: Store, actor: Actor, input: { tournamentId: string; onlyBothReady?: boolean; matchIds?: string[] }) {
  requireDirector(actor, input.tournamentId)
  let ms = await store.select<MatchRow>('sp_matches', { tournament_id: input.tournamentId, status: 'ready' }, { order: [{ col: 'round' }, { col: 'slot' }] })
  ms = ms.filter(m => m.team_a_id && m.team_b_id)
  if (input.matchIds?.length) ms = ms.filter(m => input.matchIds!.includes(m.id))
  if (input.onlyBothReady) ms = ms.filter(m => m.ready_a_at && m.ready_b_at)
  if (!ms.length) fail(409, input.onlyBothReady ? 'No games where both teams tapped Ready' : 'No games are ready to begin')
  const started: string[] = []
  const skipped: { matchId: string; reason: string }[] = []
  for (const m of ms) {
    try {
      await startMatch(store, actor, { matchId: m.id })
      started.push(m.id)
    } catch (err) {
      skipped.push({ matchId: m.id, reason: err instanceof Error ? err.message : 'Could not start' })
    }
  }
  return { ok: true, started: started.length, skipped }
}

// Removes an event completely if it never played a hand. Events with played
// hands keep their records: archive those instead. The event is first marked
// disposable (is_test) so the audit trigger allows removing its log.
export async function deleteEvent(store: Store, actor: Actor, input: { tournamentId: string }) {
  if (actor.kind !== 'owner') fail(403, 'Only the site owner can delete events')
  const t = await one<TournamentRow>(store, 'sp_tournaments', { id: input.tournamentId }, 'Event not found')
  const played = await store.count('sp_hands', { tournament_id: t.id, status: 'verified' })
  if (played && !t.is_test) fail(409, 'This event has played hands, so its records are kept. Archive it instead.')
  if (!t.is_test) await store.update('sp_tournaments', { id: t.id }, { is_test: true, is_featured: false })
  return deleteTestEvent(store, actor, { tournamentId: t.id })
}
