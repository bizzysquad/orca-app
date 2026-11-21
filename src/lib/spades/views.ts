// Read models for every screen. One batched load per tournament (loadBundle)
// and pure, role-aware redaction on top of it. This is the only place that
// decides who can see a bid, a book report or a dispute.

import { normalizeRules, type Rules } from './rules.ts'
import { scoreHand, type Side } from './scoring.ts'
import { roundName, totalRounds } from './bracket.ts'
import type { Store } from './store.ts'
import { biddingOrder, isDirector, isStaff, playerSide, supervisesTable, teamControl, type Actor } from './service.ts'
import type {
  ApprovalRow, AuditRow, BidRow, DisputeRow, HandRow, InviteRow, LedgerRow, MatchRow, PlayerRow, ReportRow,
  SessionRow, StaffRow, TableRow, TeamRow, TournamentRow,
} from './types.ts'

const OPEN = ['bidding', 'playing', 'review', 'disputed']

export interface Bundle {
  t: TournamentRow
  teams: TeamRow[]
  players: PlayerRow[]
  staff: StaffRow[]
  tables: TableRow[]
  matches: MatchRow[]
  hands: HandRow[]
  bids: BidRow[]
  reports: ReportRow[]
  approvals: ApprovalRow[]
  disputes: DisputeRow[]
  ledger: LedgerRow[]
}

export async function findTournament(store: Store, slug?: string | null): Promise<TournamentRow | null> {
  if (slug) {
    const rows = await store.select<TournamentRow>('sp_tournaments', { slug }, { limit: 1 })
    return rows[0] || null
  }
  const featured = await store.select<TournamentRow>('sp_tournaments', { is_featured: true }, { limit: 1 })
  if (featured[0]) return featured[0]
  const latest = await store.select<TournamentRow>('sp_tournaments', { status: { neq: 'archived' } }, { order: [{ col: 'created_at', asc: false }], limit: 1 })
  return latest[0] || null
}

export async function loadBundle(store: Store, t: TournamentRow): Promise<Bundle> {
  const tid = t.id
  const [teams, players, staff, tables, matches, hands, disputes, ledger] = await Promise.all([
    store.select<TeamRow>('sp_teams', { tournament_id: tid }, { order: [{ col: 'created_at' }] }),
    store.select<PlayerRow>('sp_players', { tournament_id: tid }),
    store.select<StaffRow>('sp_staff', { tournament_id: tid }, { order: [{ col: 'created_at' }] }),
    store.select<TableRow>('sp_tables', { tournament_id: tid }, { order: [{ col: 'number' }] }),
    store.select<MatchRow>('sp_matches', { tournament_id: tid }, { order: [{ col: 'round' }, { col: 'slot' }] }),
    store.select<HandRow>('sp_hands', { tournament_id: tid }, { order: [{ col: 'hand_number' }] }),
    store.select<DisputeRow>('sp_disputes', { tournament_id: tid }, { order: [{ col: 'created_at', asc: false }] }),
    store.select<LedgerRow>('sp_score_ledger', { tournament_id: tid }, { order: [{ col: 'hand_number' }] }),
  ])
  const openIds = hands.filter(h => OPEN.includes(h.status)).map(h => h.id)
  const [bids, reports, approvals] = openIds.length
    ? await Promise.all([
        store.select<BidRow>('sp_bids', { hand_id: { in: openIds }, active: true }),
        store.select<ReportRow>('sp_book_reports', { hand_id: { in: openIds }, active: true }),
        store.select<ApprovalRow>('sp_hand_approvals', { hand_id: { in: openIds } }),
      ])
    : [[], [], []]
  return { t, teams, players, staff, tables, matches, hands, bids, reports, approvals, disputes, ledger }
}

// ─── public ─────────────────────────────────────────────────────────────────

export function publicTournament(t: TournamentRow) {
  return {
    id: t.id, slug: t.slug, name: t.name, subtitle: t.subtitle, venue: t.venue, address: t.address, timezone: t.timezone,
    startsAt: t.starts_at, endsAt: t.ends_at, scheduleNote: t.schedule_note, award: t.award, status: t.status,
    capacity: t.capacity, registrationOpen: t.registration_open, waitlistEnabled: t.waitlist_enabled,
    rosterLocked: t.roster_locked, bracketPublished: t.bracket_published, championTeamId: t.champion_team_id,
    rules: normalizeRules(t.rules), rounds: totalRounds(t.capacity),
    eventType: t.event_type || 'tournament', isTest: !!t.is_test, teamLimit: t.team_limit || t.capacity, autoStart: !!t.auto_start,
    gamesToWin: normalizeRules(t.rules).gamesToWin,
  }
}

export type StatusLabel =
  | 'Not set' | 'Waiting for players' | 'Waiting for bids' | 'Playing' | 'Awaiting book reports'
  | 'Awaiting approval' | 'Disputed' | 'Paused' | 'Completed' | 'Final'

export function statusLabel(m: MatchRow, hand: HandRow | undefined, reports: ReportRow[]): StatusLabel {
  if (m.status === 'pending') return 'Not set'
  if (m.status === 'ready') return 'Waiting for players'
  if (m.status === 'paused') return 'Paused'
  if (m.status === 'completed') return 'Completed'
  if (m.status === 'final') return 'Final'
  if (!hand) return 'Playing'
  if (hand.status === 'bidding') return 'Waiting for bids'
  if (hand.status === 'playing') return reports.some(r => r.hand_id === hand.id) ? 'Awaiting book reports' : 'Playing'
  if (hand.status === 'review') return 'Awaiting approval'
  if (hand.status === 'disputed') return 'Disputed'
  return 'Playing'
}

function currentHand(b: Bundle, m: MatchRow) {
  return b.hands.find(h => h.match_id === m.id && OPEN.includes(h.status))
}

function teamBidSum(b: Bundle, hand: HandRow, teamId: string | null): number | null {
  if (!teamId) return null
  const rows = b.bids.filter(x => x.hand_id === hand.id && x.team_id === teamId)
  return rows.length === 2 ? rows.reduce((s, x) => s + x.bid, 0) : null
}

export function publicMatch(b: Bundle, m: MatchRow) {
  const hand = currentHand(b, m)
  const table = b.tables.find(x => x.id === m.table_id)
  const rounds = totalRounds(b.t.capacity)
  return {
    id: m.id, round: m.round, roundName: roundName(m.round, rounds), slot: m.slot, status: m.status,
    label: statusLabel(m, hand, b.reports),
    teamA: m.team_a_id, teamB: m.team_b_id, table: table ? table.number : null,
    scoreA: m.score_a, scoreB: m.score_b, bagsA: m.bags_a, bagsB: m.bags_b, winner: m.winner_team_id,
    resultKind: m.result_kind, target: m.target, timeLimitMin: m.time_limit_min,
    startedAt: m.started_at, pausedAt: m.paused_at, pausedMs: m.paused_ms, completedAt: m.completed_at,
    handsVerified: m.hands_verified,
    readyA: !!m.ready_a_at, readyB: !!m.ready_b_at,
    scheduledAt: m.scheduled_at || null,
    gamesA: m.games_a || 0, gamesB: m.games_b || 0, currentGame: m.current_game || 1,
    gamesToWin: normalizeRules(m.rules ?? b.t.rules).gamesToWin,
    resultNote: m.result_kind && m.result_kind !== 'played' ? m.result_note : m.result_note?.startsWith('Ended by director') ? 'Ended early by the director' : null,
    current: hand ? {
      handNumber: hand.hand_number, status: hand.status, isTiebreak: hand.is_tiebreak,
      // Team bids become public only once every bid is locked.
      bidA: hand.bids_locked_at ? teamBidSum(b, hand, m.team_a_id) : null,
      bidB: hand.bids_locked_at ? teamBidSum(b, hand, m.team_b_id) : null,
    } : null,
  }
}

// Champion and runner up of this tournament, once the final is decided.
export function winners(b: Bundle) {
  const rounds = totalRounds(b.t.capacity)
  const final = b.matches.find(m => m.round === rounds && m.status === 'final' && m.winner_team_id)
  if (!final) return null
  const name = (id: string | null) => b.teams.find(t => t.id === id)?.name || null
  const ru = final.team_a_id === final.winner_team_id ? final.team_b_id : final.team_a_id
  return {
    champion: name(final.winner_team_id),
    championPlayers: b.players.filter(p => p.team_id === final.winner_team_id).sort((x, y) => x.seat - y.seat).map(p => p.display_name),
    runnerUp: name(ru),
    score: final.result_kind === 'played' ? `${Math.max(final.score_a, final.score_b)} to ${Math.min(final.score_a, final.score_b)}` : null,
  }
}

// Champions of other finished tournaments, newest first, for the winners wall.
export async function pastChampions(store: Store, currentId: string) {
  const ts = await store.select<TournamentRow>('sp_tournaments', { status: { in: ['completed', 'archived'] } }, { order: [{ col: 'created_at', asc: false }], limit: 20 })
  const out: { tournament: string; slug: string; champion: string; date: string | null }[] = []
  for (const t of ts) {
    if (t.id === currentId || !t.champion_team_id || t.is_test || t.event_type === 'exhibition' || t.event_type === 'test') continue
    const team = (await store.select<TeamRow>('sp_teams', { id: t.champion_team_id }, { limit: 1 }))[0]
    if (team) out.push({ tournament: t.name, slug: t.slug, champion: team.name, date: t.starts_at })
  }
  return out
}

export function publicState(b: Bundle, now: Date) {
  const approved = b.teams.filter(t => t.status === 'approved')
  const pending = b.teams.filter(t => t.status === 'pending').length
  return {
    serverNow: now.toISOString(),
    pulse: b.t.pulse,
    tournament: publicTournament(b.t),
    registration: {
      approved: approved.length, pending, waitlist: b.teams.filter(t => t.status === 'waitlist').length,
      full: approved.length + pending >= (b.t.team_limit || b.t.capacity),
    },
    teams: approved.map(t => ({ id: t.id, name: t.name, seed: t.seed, checkedIn: !!t.checked_in_at })),
    matches: b.t.bracket_published ? b.matches.map(m => publicMatch(b, m)) : [],
    // Everyone signed up so far (in sign up order), for the preliminary
    // bracket shown before the draw.
    registered: b.teams.filter(t => t.status === 'approved' || t.status === 'pending').map(t => ({ id: t.id, name: t.name, status: t.status })),
    winners: b.t.bracket_published ? winners(b) : null,
  }
}

// ─── match detail (role aware) ──────────────────────────────────────────────

type Level = 'public' | 'player' | 'staff'

function levelFor(b: Bundle, actor: Actor, m: MatchRow): { level: Level; side: Side | null; canSupervise: boolean; director: boolean } {
  const table = b.tables.find(x => x.id === m.table_id) || null
  const director = isDirector(actor, b.t.id)
  const canSup = supervisesTable(actor, b.t.id, table)
  if (isStaff(actor, b.t.id)) return { level: 'staff', side: null, canSupervise: canSup, director }
  const side = playerSide(actor, m)
  if (side) return { level: 'player', side, canSupervise: false, director: false }
  return { level: 'public', side: null, canSupervise: false, director: false }
}

export function matchDetail(b: Bundle, actor: Actor, matchId: string, now: Date) {
  const m = b.matches.find(x => x.id === matchId)
  if (!m) return null
  if (!b.t.bracket_published && !isStaff(actor, b.t.id)) return null
  const { level, side, canSupervise, director } = levelFor(b, actor, m)
  const rules: Rules = normalizeRules(m.rules ?? b.t.rules)
  const table = b.tables.find(x => x.id === m.table_id) || null
  const sup = table?.supervisor_id ? b.staff.find(s => s.id === table.supervisor_id) : null
  const teamOf = (id: string | null) => {
    if (!id) return null
    const t = b.teams.find(x => x.id === id)
    if (!t) return null
    const ps = b.players.filter(p => p.team_id === id).sort((x, y) => x.seat - y.seat)
    return {
      id: t.id, name: t.name, seed: t.seed, bidControl: teamControl(t, rules),
      players: level === 'public' ? [] : ps.map(p => ({ id: p.id, name: p.display_name, seat: p.seat, isCaptain: p.is_captain })),
    }
  }
  const teamA = teamOf(m.team_a_id)
  const teamB = teamOf(m.team_b_id)

  // History from the ledger (verified hands only).
  const led = b.ledger.filter(l => l.match_id === m.id)
  const handNums = Array.from(new Set(led.map(l => l.hand_number))).sort((x, y) => x - y)
  const history = handNums.map(n => {
    const la = led.find(l => l.hand_number === n && l.team_id === m.team_a_id)!
    const lb = led.find(l => l.hand_number === n && l.team_id === m.team_b_id)!
    const h = b.hands.find(x => x.id === la?.hand_id)
    const pack = (l: LedgerRow | undefined) => l && ({ bid: l.bid, books: l.books, made: l.made, renege: l.renege, points: l.points, bagsEarned: l.bags_earned, bagPenalty: l.bag_penalty, total: l.total_after, bags: l.bags_after })
    return { handNumber: n, handId: la?.hand_id, game: h?.game_number || 1, isTiebreak: !!h?.is_tiebreak, ruling: level === 'public' ? null : h?.ruling || null, a: pack(la), b: pack(lb) }
  })
  const voided = level === 'public' ? [] : b.hands.filter(h => h.match_id === m.id && h.status === 'void').map(h => ({ handNumber: h.hand_number, ruling: h.ruling }))

  let current: any = null
  const hand = currentHand(b, m)
  if (hand && m.team_a_id && m.team_b_id) {
    const pa = b.players.filter(p => p.team_id === m.team_a_id).sort((x, y) => x.seat - y.seat)
    const pb = b.players.filter(p => p.team_id === m.team_b_id).sort((x, y) => x.seat - y.seat)
    const seatsRaw = pa.length === 2 && pb.length === 2 ? [pa[0], pb[0], pa[1], pb[1]] : []
    const hb = b.bids.filter(x => x.hand_id === hand.id)
    const locked = !!hand.bids_locked_at
    const canSeeBid = (bidSide: Side) => {
      if (locked) return true
      if (level === 'public') return false
      if (rules.bidOrder === 'sequential') return true
      return level === 'player' && side === bidSide
    }
    const seats = seatsRaw.map((p, pos) => {
      const s: Side = pos % 2 === 0 ? 'a' : 'b'
      const bid = hb.find(x => x.player_id === p.id)
      return {
        pos, side: s, playerId: level === 'public' ? null : p.id, name: level === 'public' ? null : p.display_name,
        isCaptain: p.is_captain, submitted: !!bid, bid: bid && canSeeBid(s) ? bid.bid : null,
      }
    })
    const sumFor = (s: Side) => {
      const own = seats.filter(x => x.side === s)
      return own.every(x => x.bid !== null) && own.length === 2 ? own.reduce((t, x) => t + (x.bid as number), 0) : null
    }
    const reps = b.reports.filter(r => r.hand_id === hand.id)
    const both = reps.length === 2
    const repFor = (teamId: string, s: Side) => {
      const r = reps.find(x => x.team_id === teamId)
      if (!r) return null
      const visible = level === 'staff' || (level === 'player' && (both || side === s))
      return visible ? { booksA: r.books_a, booksB: r.books_b, by: level === 'staff' ? r.reporter_name : null } : { hidden: true }
    }
    const apps = b.approvals.filter(a => a.hand_id === hand.id)
    let provisional = null
    if ((hand.status === 'review') && level !== 'public') {
      const r = reps[0]
      const prevA = history.length ? history[history.length - 1].a : null
      const prevB = history.length ? history[history.length - 1].b : null
      const bidA = teamBidSum(b, hand, m.team_a_id) || 0
      const bidB = teamBidSum(b, hand, m.team_b_id) || 0
      provisional = scoreHand(
        { bidA, bidB, booksA: r.books_a, booksB: r.books_b, renegeSide: hand.renege_team_id ? (hand.renege_team_id === m.team_a_id ? 'a' : 'b') : null },
        { a: { total: prevA?.total ?? 0, bags: prevA?.bags ?? rules.initialBags }, b: { total: prevB?.total ?? 0, bags: prevB?.bags ?? rules.initialBags } },
        rules
      )
    }
    const order = biddingOrder(hand.dealer_pos)
    const nextToBid = rules.bidOrder === 'sequential' && !locked ? order.find(p => !seats[p]?.submitted) ?? null : null
    current = {
      id: hand.id, version: hand.version, handNumber: hand.hand_number, status: hand.status, isTiebreak: hand.is_tiebreak,
      dealerPos: hand.dealer_pos, leadPos: (hand.dealer_pos + 1) % 4, order, nextToBid, locked, seats,
      teamBid: { a: sumFor('a'), b: sumFor('b') },
      reports: level === 'public' ? null : { a: repFor(m.team_a_id, 'a'), b: repFor(m.team_b_id, 'b') },
      approvals: { a: apps.some(x => x.team_id === m.team_a_id), b: apps.some(x => x.team_id === m.team_b_id) },
      provisional,
      renegeTeamId: level === 'public' ? null : hand.renege_team_id,
    }
  }

  const disputes = level === 'public' ? [] : b.disputes.filter(d => d.match_id === m.id).map(d => ({
    id: d.id, handId: d.hand_id, handNumber: b.hands.find(h => h.id === d.hand_id)?.hand_number ?? null, kind: d.kind,
    status: d.status, reason: d.reason, raisedBy: d.raised_by_name, resolution: d.resolution, resolvedBy: d.resolved_by_name,
    createdAt: d.created_at, resolvedAt: d.resolved_at,
  }))

  return {
    serverNow: now.toISOString(),
    pulse: b.t.pulse,
    tournament: { id: b.t.id, slug: b.t.slug, name: b.t.name },
    match: {
      ...publicMatch(b, m),
      rules, biddingMode: rules.biddingMode, bidOrder: rules.bidOrder,
      completionVerifiedBy: level === 'staff' ? m.completion_verified_by : null,
      resultNote: level === 'public' ? null : m.result_note, version: m.version,
    },
    table: table ? { id: table.id, number: table.number, supervisor: sup?.display_name || null } : null,
    teamA, teamB,
    viewer: {
      level, side, canSupervise, isDirector: director,
      control: side ? teamControl(b.teams.find(t => t.id === (side === 'a' ? m.team_a_id : m.team_b_id)), rules) : null,
      playerId: actor.kind === 'player' ? actor.playerId : null,
      isCaptain: actor.kind === 'player' && !!side ? actor.isCaptain : false,
    },
    history, voided, current, disputes,
  }
}

export type MatchDetail = NonNullable<ReturnType<typeof matchDetail>>

// ─── supervisor dashboard ───────────────────────────────────────────────────

export function pendingActions(d: MatchDetail): string[] {
  const out: string[] = []
  const c = d.current
  if (d.match.status === 'completed') out.push(d.match.completionVerifiedBy ? 'Ready to finalize' : 'Verify completion')
  if (c && d.match.status === 'live') {
    if (c.status === 'bidding') {
      const missing = c.seats.filter((s: any) => !s.submitted).map((s: any) => s.name)
      if (missing.length) out.push(`Bids missing: ${missing.join(', ')}`)
    }
    if (c.status === 'playing') {
      const miss = [] as string[]
      if (!c.reports?.a) miss.push(d.teamA?.name || 'Team A')
      if (!c.reports?.b) miss.push(d.teamB?.name || 'Team B')
      if (miss.length && c.reports && (c.reports.a || c.reports.b)) out.push(`Book report missing: ${miss.join(', ')}`)
    }
    if (c.status === 'review') {
      const miss = [] as string[]
      if (!c.approvals.a) miss.push(d.teamA?.name || 'Team A')
      if (!c.approvals.b) miss.push(d.teamB?.name || 'Team B')
      if (miss.length) out.push(`Waiting on confirmation: ${miss.join(', ')}`)
    }
    if (c.status === 'disputed') out.push('Captain reports disagree')
  }
  const open = d.disputes.filter(x => x.status === 'open')
  if (open.length) out.push(`${open.length} open dispute${open.length > 1 ? 's' : ''}`)
  return out
}

export function supervisorState(b: Bundle, actor: Actor, now: Date) {
  const pub = publicState(b, now)
  const ms = b.matches.filter(m => m.team_a_id && m.team_b_id && m.result_kind !== 'bye')
  const cards = ms.map(m => {
    const d = matchDetail(b, actor, m.id, now)!
    const table = b.tables.find(x => x.id === m.table_id)
    return { ...d, pending: pendingActions(d), mine: actor.kind === 'staff' ? table?.supervisor_id === actor.staffId : false }
  })
  return {
    ...pub,
    viewer: viewerInfo(actor, b),
    tables: b.tables.map(t => ({ id: t.id, number: t.number, supervisor: b.staff.find(s => s.id === t.supervisor_id)?.display_name || null, supervisorId: t.supervisor_id })),
    cards,
    teamsFull: b.teams.filter(t => t.status === 'approved').map(t => ({
      id: t.id, name: t.name, seed: t.seed, checkedIn: !!t.checked_in_at,
      players: b.players.filter(p => p.team_id === t.id).sort((x, y) => x.seat - y.seat).map(p => ({ id: p.id, name: p.display_name, isCaptain: p.is_captain })),
    })),
    openDisputes: b.disputes.filter(d => d.status === 'open').length,
  }
}

export function viewerInfo(actor: Actor, b: Bundle | null) {
  if (actor.kind === 'public') return { kind: 'public' as const }
  if (actor.kind === 'owner') return { kind: 'owner' as const, name: actor.name, role: 'director' }
  if (actor.kind === 'staff') return { kind: 'staff' as const, name: actor.name, role: actor.role, staffId: actor.staffId, tournamentId: actor.tournamentId }
  const team = b?.teams.find(t => t.id === actor.teamId)
  return { kind: 'player' as const, name: actor.name, playerId: actor.playerId, teamId: actor.teamId, teamName: team?.name || null, isCaptain: actor.isCaptain, tournamentId: actor.tournamentId }
}

// ─── player dashboard ───────────────────────────────────────────────────────

export function playerState(b: Bundle, actor: Actor, now: Date) {
  if (actor.kind !== 'player' || actor.tournamentId !== b.t.id) return null
  const team = b.teams.find(t => t.id === actor.teamId)
  const mine = b.matches.filter(m => m.team_a_id === actor.teamId || m.team_b_id === actor.teamId).sort((x, y) => y.round - x.round)
  const active = mine.find(m => ['live', 'paused', 'completed', 'ready'].includes(m.status)) || null
  const finished = mine.filter(m => m.status === 'final' && m.result_kind !== 'bye')
  const eliminated = mine.some(m => m.status === 'final' && m.winner_team_id && m.winner_team_id !== actor.teamId)
  return {
    team: team ? {
      id: team.id, name: team.name, seed: team.seed, checkedIn: !!team.checked_in_at, status: team.status, bidControl: teamControl(team, normalizeRules(b.t.rules)),
      players: b.players.filter(p => p.team_id === team.id).sort((x, y) => x.seat - y.seat).map(p => ({ id: p.id, name: p.display_name, isCaptain: p.is_captain })),
    } : null,
    activeMatch: active && b.t.bracket_published ? matchDetail(b, actor, active.id, now) : null,
    finished: finished.map(m => publicMatch(b, m)),
    eliminated,
    champion: b.t.champion_team_id === actor.teamId,
  }
}

// ─── admin ──────────────────────────────────────────────────────────────────

export async function adminState(store: Store, b: Bundle, actor: Actor, now: Date) {
  const [invites, sessions, auditRows] = await Promise.all([
    store.select<InviteRow>('sp_invitations', { tournament_id: b.t.id }, { order: [{ col: 'created_at', asc: false }] }),
    store.select<SessionRow>('sp_sessions', { tournament_id: b.t.id, revoked_at: null }),
    store.select<AuditRow>('sp_audit', { tournament_id: b.t.id }, { order: [{ col: 'id', asc: false }], limit: 300 }),
  ])
  const nowMs = now.getTime()
  const inviteStatus = (col: 'player_id' | 'staff_id', id: string) => {
    const latest = invites.find(i => i[col] === id)
    const live = sessions.filter(s => s[col] === id && new Date(s.expires_at).getTime() > nowMs).length
    let status = 'none'
    if (latest) status = latest.revoked_at ? 'revoked' : latest.used_at ? 'used' : new Date(latest.expires_at).getTime() <= nowMs ? 'expired' : 'pending'
    return { status, issuedAt: latest?.created_at || null, usedAt: latest?.used_at || null, activeSessions: live }
  }
  return {
    ...supervisorState(b, actor, now),
    // Directors preview the bracket before it is published.
    matches: b.matches.map(m => publicMatch(b, m)),
    teams: b.teams.filter(t => t.status === 'approved').map(t => ({ id: t.id, name: t.name, seed: t.seed, checkedIn: !!t.checked_in_at })),
    tournamentFull: { ...publicTournament(b.t), isFeatured: b.t.is_featured },
    allTeams: b.teams.map(t => ({
      id: t.id, name: t.name, status: t.status, seed: t.seed, contact: t.contact, checkedIn: !!t.checked_in_at, createdAt: t.created_at, bidControl: teamControl(t, normalizeRules(b.t.rules)),
      players: b.players.filter(p => p.team_id === t.id).sort((x, y) => x.seat - y.seat).map(p => ({
        id: p.id, name: p.display_name, seat: p.seat, isCaptain: p.is_captain, invite: inviteStatus('player_id', p.id),
      })),
    })),
    staff: b.staff.map(s => ({ id: s.id, name: s.display_name, role: s.role, active: s.active, invite: inviteStatus('staff_id', s.id) })),
    disputes: b.disputes.map(d => {
      const m = b.matches.find(x => x.id === d.match_id)
      const tn = (id: string | null | undefined) => b.teams.find(t => t.id === id)?.name || 'TBD'
      return {
        id: d.id, matchId: d.match_id, matchLabel: m ? `${tn(m.team_a_id)} vs ${tn(m.team_b_id)}` : '', handNumber: b.hands.find(h => h.id === d.hand_id)?.hand_number ?? null,
        kind: d.kind, status: d.status, reason: d.reason, raisedBy: d.raised_by_name, resolution: d.resolution, resolvedBy: d.resolved_by_name, createdAt: d.created_at,
      }
    }),
    audit: auditRows.map(a => ({ id: a.id, at: a.created_at, actor: a.actor_name, role: a.actor_role, action: a.action, matchId: a.match_id, handId: a.hand_id, before: a.before, after: a.after, reason: a.reason })),
  }
}

// ─── standings ──────────────────────────────────────────────────────────────

export function standings(b: Bundle) {
  const rounds = totalRounds(b.t.capacity)
  const out: { place: string; teamId: string; team: string; eliminatedIn: string | null }[] = []
  const name = (id: string) => b.teams.find(t => t.id === id)?.name || ''
  const final = b.matches.find(m => m.round === rounds && m.status === 'final')
  if (final?.winner_team_id) {
    out.push({ place: '1', teamId: final.winner_team_id, team: name(final.winner_team_id), eliminatedIn: null })
    const ru = final.team_a_id === final.winner_team_id ? final.team_b_id : final.team_a_id
    if (ru) out.push({ place: '2', teamId: ru, team: name(ru), eliminatedIn: 'Championship' })
  }
  for (let r = rounds - 1; r >= 1; r--) {
    const losers = b.matches
      .filter(m => m.round === r && m.status === 'final' && m.winner_team_id && m.result_kind !== 'bye')
      .map(m => (m.team_a_id === m.winner_team_id ? m.team_b_id : m.team_a_id))
      .filter(Boolean) as string[]
    const lo = 2 ** (rounds - r) + 1
    const hi = 2 ** (rounds - r + 1)
    for (const id of losers) out.push({ place: `${lo}-${hi}`, teamId: id, team: name(id), eliminatedIn: roundName(r, rounds) })
  }
  return out
}
