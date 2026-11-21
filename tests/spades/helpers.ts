import { MemoryStore } from '../../src/lib/spades/store.ts'
import * as S from '../../src/lib/spades/service.ts'
import type { Actor } from '../../src/lib/spades/service.ts'
import type { HandRow, MatchRow, PlayerRow, TeamRow } from '../../src/lib/spades/types.ts'

export const owner: Actor = { kind: 'owner', name: 'Test Director' }
// Classic 10-per-book scoring, used by the older flow tests.
export const CLASSIC = { pointsPerBook: 10, bagValue: 1, setPenaltyPerBook: 10, targetDefault: 250, targetFinal: 350, bagsEnabled: true, requireCaptainApproval: true }

export async function setup(opts: { rules?: Record<string, unknown>; teams?: number; capacity?: number } = {}) {
  const store = new MemoryStore()
  const { id: tid } = await S.createTournament(store, owner, { name: `Test Spades ${Math.random()}`, capacity: opts.capacity ?? 8 })
  await S.updateTournament(store, owner, { tournamentId: tid, patch: { registration_open: true, rules: { biddingMode: 'individual', ...CLASSIC, ...(opts.rules || {}) } } })
  await S.setTableCount(store, owner, { tournamentId: tid, count: 4 })
  const n = opts.teams ?? 8
  for (let i = 1; i <= n; i++) {
    await S.registerTeam(store, owner, { tournamentId: tid, name: `Team ${i}`, player1: `P${i}a`, player2: `P${i}b`, captainSeat: 1 })
  }
  return { store, tid }
}

export async function lockAndStart(store: MemoryStore, tid: string) {
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  await S.startRound(store, owner, { tournamentId: tid, round: 1 })
}

// Real invitation flow: issue, redeem, resolve the session to an actor.
const actorCache = new WeakMap<MemoryStore, Map<string, Actor>>()
export async function playerActor(store: MemoryStore, playerId: string): Promise<Actor> {
  let cache = actorCache.get(store)
  if (!cache) { cache = new Map(); actorCache.set(store, cache) }
  if (cache.has(playerId)) return cache.get(playerId)!
  const inv = await S.issueInvite(store, owner, { playerId })
  const { sessionToken } = await S.redeemInvite(store, inv.token)
  const a = await S.resolveSession(store, sessionToken)
  cache.set(playerId, a)
  return a
}

export async function matchPlayers(store: MemoryStore, matchId: string) {
  const [m] = await store.select<MatchRow>('sp_matches', { id: matchId })
  const pa = (await store.select<PlayerRow>('sp_players', { team_id: m.team_a_id! })).sort((x, y) => x.seat - y.seat)
  const pb = (await store.select<PlayerRow>('sp_players', { team_id: m.team_b_id! })).sort((x, y) => x.seat - y.seat)
  return {
    match: m,
    a: [await playerActor(store, pa[0].id), await playerActor(store, pa[1].id)],
    b: [await playerActor(store, pb[0].id), await playerActor(store, pb[1].id)],
    ids: { a: [pa[0].id, pa[1].id], b: [pb[0].id, pb[1].id] },
    capA: await playerActor(store, pa.find(p => p.is_captain)!.id),
    capB: await playerActor(store, pb.find(p => p.is_captain)!.id),
  }
}

export async function openHand(store: MemoryStore, matchId: string): Promise<HandRow> {
  const hs = await store.select<HandRow>('sp_hands', { match_id: matchId, status: { in: ['bidding', 'playing', 'review', 'disputed'] } })
  if (hs.length !== 1) throw new Error(`expected one open hand, got ${hs.length}`)
  return hs[0]
}

export async function getMatch(store: MemoryStore, matchId: string): Promise<MatchRow> {
  const [m] = await store.select<MatchRow>('sp_matches', { id: matchId })
  return m
}

// Plays one full hand through the real individual-bidding flow.
export async function playHand(store: MemoryStore, matchId: string, bids: [number, number, number, number], booksA: number) {
  const mp = await matchPlayers(store, matchId)
  const h = await openHand(store, matchId)
  const order: [Actor, string, number][] = [
    [mp.a[0], mp.ids.a[0], bids[0]], [mp.b[0], mp.ids.b[0], bids[2]], [mp.a[1], mp.ids.a[1], bids[1]], [mp.b[1], mp.ids.b[1], bids[3]],
  ]
  for (const [actor, pid, bid] of order) await S.submitBids(store, actor, { handId: h.id, bids: [{ playerId: pid, bid }] })
  await S.reportBooks(store, mp.capA, { handId: h.id, booksA, booksB: 13 - booksA })
  await S.reportBooks(store, mp.capB, { handId: h.id, booksA, booksB: 13 - booksA })
  await S.approveHand(store, mp.capA, { handId: h.id })
  await S.approveHand(store, mp.capB, { handId: h.id })
  return h
}

export async function teamByName(store: MemoryStore, tid: string, name: string) {
  const [t] = await store.select<TeamRow>('sp_teams', { tournament_id: tid, name })
  return t
}

export async function roundMatches(store: MemoryStore, tid: string, round: number) {
  return (await store.select<MatchRow>('sp_matches', { tournament_id: tid, round })).sort((x, y) => x.slot - y.slot)
}

export async function expectReject(p: Promise<unknown>, status: number, match?: RegExp) {
  try {
    await p
  } catch (err: any) {
    if (!(err instanceof S.SpadesError)) throw err
    if (err.status !== status) throw new Error(`expected status ${status}, got ${err.status}: ${err.message}`)
    if (match && !match.test(err.message)) throw new Error(`message "${err.message}" does not match ${match}`)
    return err
  }
  throw new Error(`expected rejection with ${status}`)
}
