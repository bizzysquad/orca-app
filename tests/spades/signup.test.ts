import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStore } from '../../src/lib/spades/store.ts'
import * as S from '../../src/lib/spades/service.ts'
import { normalizeRules } from '../../src/lib/spades/rules.ts'
import type { HandRow, MatchRow, PlayerRow, TeamRow, TournamentRow } from '../../src/lib/spades/types.ts'
import { getMatch, openHand, owner, playerActor } from './helpers.ts'

async function house(championship = true, target = 250) {
  const store = new MemoryStore()
  const { id } = await S.createTournament(store, owner, { name: `Friday ${Math.random()}`, house: true, championship, target })
  return { store, tid: id }
}

async function signUp(store: MemoryStore, tid: string, who: { team?: string; p1: string; p2?: string }) {
  const solo = !who.p2
  const r = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: who.team || '', player1: who.p1, player2: who.p2 || '', solo })
  return { teamId: r.teamId, actor: await playerActor(store, r.captainPlayerId) }
}

async function ready(store: MemoryStore, a: S.Actor) {
  await S.setPresent(store, a, { ready: true })
}

test('house tournament: open sign ups, championship flag, house scoring, featured', async () => {
  const { store, tid } = await house(true, 300)
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  const r = normalizeRules(t.rules)
  assert.equal(t.registration_open, true)
  assert.equal(t.is_featured, true)
  assert.equal(r.championship, true)
  assert.equal(r.pointsPerBook, 10)
  assert.equal(r.minTeamBid, 0)
  assert.equal(r.firstHandBidsItself, true)
  assert.equal(r.scorekeeping, 'one')
  assert.equal(r.targetDefault, 300)
  assert.equal(r.targetFinal, 300)
})

test('solo sign up needs no team name; teams need one', async () => {
  const { store, tid } = await house()
  const solo = await signUp(store, tid, { p1: 'Dre' })
  const [team] = await store.select<TeamRow>('sp_teams', { id: solo.teamId })
  assert.equal(team.name, 'Dre')
  assert.equal((await store.select<PlayerRow>('sp_players', { team_id: team.id })).length, 1)
  await assert.rejects(S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: '', player1: 'A', player2: 'B' }), /Team name is required/)
  // A solo name never blocks a real team with the same name.
  await signUp(store, tid, { team: 'Dre', p1: 'Kim', p2: 'Lou' })
})

test('pair ready solos at random; odd one out waits; pair can rename', async () => {
  const { store, tid } = await house()
  const s1 = await signUp(store, tid, { p1: 'Ann' })
  const s2 = await signUp(store, tid, { p1: 'Bo' })
  const s3 = await signUp(store, tid, { p1: 'Cy' })
  const s4 = await signUp(store, tid, { p1: 'Di' })
  for (const s of [s1, s2, s3]) await ready(store, s.actor)
  const r = await S.pairSolos(store, owner, { tournamentId: tid })
  assert.equal(r.pairs.length, 1)
  assert.ok(r.left)
  const teams = await store.select<TeamRow>('sp_teams', { tournament_id: tid })
  assert.equal(teams.length, 3) // one pair, the leftover ready solo, and Di (not ready, not paired)
  const pair = teams.find(x => x.name.includes('&'))!
  const ps = await store.select<PlayerRow>('sp_players', { team_id: pair.id })
  assert.equal(ps.length, 2)
  assert.equal(ps.filter(p => p.is_captain).length, 1)
  assert.ok(pair.checked_in_at, 'both were ready, so the pair is ready')
  // The moved player's phone session now belongs to the new team.
  const moved = ps.find(p => !p.is_captain)!
  const a = await playerActor(store, moved.id)
  await S.renameMyTeam(store, { ...a, teamId: pair.id } as S.Actor, { name: 'Lucky Draw' })
  const [renamed] = await store.select<TeamRow>('sp_teams', { id: pair.id })
  assert.equal(renamed.name, 'Lucky Draw')
  assert.ok(s4)
})

test('start with whoever is ready: bracket of ready full teams, others set aside, games begin', async () => {
  const { store, tid } = await house()
  const a = await signUp(store, tid, { team: 'Aces', p1: 'A1', p2: 'A2' })
  const b = await signUp(store, tid, { team: 'Kings', p1: 'K1', p2: 'K2' })
  const c = await signUp(store, tid, { team: 'Queens', p1: 'Q1', p2: 'Q2' })
  const late = await signUp(store, tid, { team: 'Late', p1: 'L1', p2: 'L2' })
  const solo = await signUp(store, tid, { p1: 'Solo' })
  for (const x of [a, b, c, solo]) await ready(store, x.actor)
  const r = await S.startTournament(store, owner, { tournamentId: tid })
  assert.equal(r.teams, 3)
  assert.equal(r.started, 1) // 3 teams: one game plus a bye
  const teams = await store.select<TeamRow>('sp_teams', { tournament_id: tid })
  assert.equal(teams.find(x => x.id === late.teamId)!.status, 'waitlist')
  assert.equal(teams.find(x => x.id === solo.teamId)!.status, 'waitlist')
  const live = await store.select<MatchRow>('sp_matches', { tournament_id: tid, status: 'live' })
  assert.equal(live.length, 1)
  await assert.rejects(S.setPresent(store, late.actor, { ready: true }), /already started/)
})

test('one scorekeeper per table: first hand bids itself, dealer pick, 10 per book, no bid minimum', async () => {
  const { store, tid } = await house(true, 200)
  const a = await signUp(store, tid, { team: 'Aces', p1: 'A1', p2: 'A2' })
  const b = await signUp(store, tid, { team: 'Kings', p1: 'K1', p2: 'K2' })
  await ready(store, a.actor)
  await ready(store, b.actor)
  await S.startTournament(store, owner, { tournamentId: tid })
  const [m] = await store.select<MatchRow>('sp_matches', { tournament_id: tid, status: 'live' })
  const sideA = m.team_a_id === a.teamId ? a : b
  const sideB = sideA === a ? b : a
  // The partner who did not sign up keeps score.
  const partner = (await store.select<PlayerRow>('sp_players', { team_id: sideB.teamId })).find(p => !p.is_captain)!
  const keeper = await playerActor(store, partner.id)
  await S.claimScorekeeper(store, keeper, { matchId: m.id })
  await S.setFirstDealer(store, keeper, { matchId: m.id, seat: 2 })

  let h = await openHand(store, m.id)
  assert.equal(h.status, 'playing', 'first hand has no bidding')
  assert.equal(h.dealer_pos, 2)
  // Anyone else at the table is locked out.
  await assert.rejects(S.reportBooks(store, sideA.actor, { handId: h.id, booksA: 3, booksB: 10 }), /keeping score/)
  await S.reportBooks(store, keeper, { handId: h.id, booksA: 10, booksB: 3 })
  let mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 100)
  assert.equal(mm.score_b, 30)

  h = await openHand(store, m.id)
  assert.equal(h.status, 'bidding')
  assert.equal(h.dealer_pos, 3, 'deal rotates left')
  await assert.rejects(S.setFirstDealer(store, keeper, { matchId: m.id, seat: 0 }), /already scored/)
  const ps = (await store.select<PlayerRow>('sp_players', { team_id: m.team_a_id! })).sort((x, y) => x.seat - y.seat)
  const qs = (await store.select<PlayerRow>('sp_players', { team_id: m.team_b_id! })).sort((x, y) => x.seat - y.seat)
  // Team B bids 2 (below the old minimum of 4) and is set; Team A bids 9 and makes it.
  await S.submitBids(store, keeper, { handId: h.id, bids: [{ playerId: ps[0].id, bid: 9 }, { playerId: ps[1].id, bid: 0 }, { playerId: qs[0].id, bid: 2 }, { playerId: qs[1].id, bid: 0 }] })
  h = await openHand(store, m.id)
  assert.equal(h.status, 'playing')
  await S.reportBooks(store, keeper, { handId: h.id, booksA: 12, booksB: 1 })
  mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 190, 'made 9: +90, extra books earn nothing')
  assert.equal(mm.score_b, 30, 'set: 0 for the hand')

  // Hand 3 finishes the game.
  h = await openHand(store, m.id)
  await S.submitBids(store, keeper, { handId: h.id, bids: [{ playerId: ps[0].id, bid: 2 }, { playerId: ps[1].id, bid: 0 }, { playerId: qs[0].id, bid: 3 }, { playerId: qs[1].id, bid: 0 }] })
  h = await openHand(store, m.id)
  await S.reportBooks(store, keeper, { handId: h.id, booksA: 5, booksB: 8 })
  mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, m.team_a_id)
  await S.finalizeMatch(store, owner, { matchId: m.id })
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.equal(t.champion_team_id, m.team_a_id)

  // Clear the scoreboard: archived and no longer the main event.
  await S.updateTournament(store, owner, { tournamentId: tid, patch: { status: 'archived' } })
  const [t2] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.equal(t2.status, 'archived')
  assert.equal(t2.is_featured, false)
})

test('scorekeeper can hand off; director can pick anyone', async () => {
  const { store, tid } = await house()
  const a = await signUp(store, tid, { team: 'Aces', p1: 'A1', p2: 'A2' })
  const b = await signUp(store, tid, { team: 'Kings', p1: 'K1', p2: 'K2' })
  await ready(store, a.actor)
  await ready(store, b.actor)
  await S.startTournament(store, owner, { tournamentId: tid })
  const [m] = await store.select<MatchRow>('sp_matches', { tournament_id: tid, status: 'live' })
  await S.claimScorekeeper(store, a.actor, { matchId: m.id })
  await assert.rejects(S.claimScorekeeper(store, b.actor, { matchId: m.id }), /keeping score/)
  await S.setScorekeeper(store, a.actor, { matchId: m.id, playerId: null })
  await S.claimScorekeeper(store, b.actor, { matchId: m.id })
  const k2 = (await store.select<PlayerRow>('sp_players', { team_id: a.teamId })).find(p => !p.is_captain)!
  await S.setScorekeeper(store, owner, { matchId: m.id, playerId: k2.id })
  assert.equal(normalizeRules((await getMatch(store, m.id)).rules).scorekeeperPlayerId, k2.id)
  const hs = await store.select<HandRow>('sp_hands', { match_id: m.id })
  assert.equal(hs.length, 1)
})
