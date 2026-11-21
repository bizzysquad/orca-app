import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as S from '../../src/lib/spades/service.ts'
import * as V from '../../src/lib/spades/views.ts'
import { MemoryStore } from '../../src/lib/spades/store.ts'
import type { MatchRow, TeamRow, TournamentRow } from '../../src/lib/spades/types.ts'
import { CLASSIC, expectReject, getMatch, lockAndStart, openHand, owner, playHand, roundMatches, setup } from './helpers.ts'

async function bundle(store: MemoryStore, tid: string) {
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  return V.loadBundle(store, t)
}

test('best of 3 series: first to two games, scores and bags reset each game', async () => {
  const { store, tid } = await setup({ teams: 2, rules: { gamesToWin: 2, targetDefault: 100, targetFinal: 100 } })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  assert.equal(m.time_limit_min, 0)
  await playHand(store, m.id, [3, 3, 2, 2], 8)
  await playHand(store, m.id, [3, 3, 2, 2], 8)
  let mm = await getMatch(store, m.id)
  assert.equal(mm.games_a, 1)
  assert.equal(mm.current_game, 2)
  assert.equal(mm.score_a, 0)
  assert.equal((await openHand(store, m.id)).game_number, 2)
  await playHand(store, m.id, [2, 2, 3, 3], 5)
  await playHand(store, m.id, [2, 2, 3, 3], 5)
  mm = await getMatch(store, m.id)
  assert.equal(mm.games_b, 1)
  assert.equal(mm.status, 'live')
  await playHand(store, m.id, [3, 3, 2, 2], 8)
  await playHand(store, m.id, [3, 3, 2, 2], 8)
  mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, mm.team_a_id)
  assert.equal(mm.games_a, 2)
  await S.finalizeMatch(store, owner, { matchId: m.id })
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.equal(t.champion_team_id, mm.team_a_id)
})

test('event types: 6 team small event gets an 8 bracket with byes; exhibition is 2 teams; 3 teams fit a 4 bracket', async () => {
  await expectReject(S.createTournament(new MemoryStore(), owner, { name: 'x', eventType: 'small', teamLimit: 5 }), 400)
  const store = new MemoryStore()
  const small = await S.createTournament(store, owner, { name: 'Small Six', eventType: 'small', teamLimit: 6 })
  for (let i = 1; i <= 7; i++) await S.registerTeam(store, owner, { tournamentId: small.id, name: `S${i}`, player1: `s${i}a`, player2: `s${i}b` })
  assert.equal((await store.select<TeamRow>('sp_teams', { tournament_id: small.id, status: 'approved' })).length, 6)
  await S.setRosterLock(store, owner, { tournamentId: small.id, locked: true })
  const ms = await store.select<MatchRow>('sp_matches', { tournament_id: small.id })
  assert.equal(ms.length, 7)
  assert.equal(ms.filter(m => m.result_kind === 'bye').length, 2)
  const ex = await S.createTournament(store, owner, { name: 'Exhibition', eventType: 'exhibition' })
  const [et] = await store.select<TournamentRow>('sp_tournaments', { id: ex.id })
  assert.equal(et.team_limit, 2)
  assert.equal(et.capacity, 2)
  const three = await S.createTournament(store, owner, { name: 'Three teams', eventType: 'custom', teamLimit: 3 })
  for (let i = 1; i <= 3; i++) await S.registerTeam(store, owner, { tournamentId: three.id, name: `C${i}`, player1: `c${i}a`, player2: `c${i}b` })
  await S.setRosterLock(store, owner, { tournamentId: three.id, locked: true })
  const [ft] = await store.select<TournamentRow>('sp_tournaments', { id: three.id })
  assert.equal(ft.capacity, 4)
})

test('team bid control: captain mode, each-player mode, partner code, switch only before start', async () => {
  const { store, tid } = await setup({ teams: 0 })
  const r1 = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: 'Caps', player1: 'Cap1', player2: 'Pal1', bidControl: 'captain' })
  const r2 = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: 'Solo', player1: 'Cap2', player2: 'Pal2', bidControl: 'individual' })
  const sess = async (playerId: string) => S.resolveSession(store, (await S.createSession(store, { kind: 'player', tournamentId: tid, playerId, staffId: null, invitationId: null, ttlMs: 1e7 })).sessionToken)
  const cap1 = await sess(r1.captainPlayerId)
  const cap2 = await sess(r2.captainPlayerId)
  const pc = await S.issuePartnerCode(store, cap2)
  const pal2 = await S.resolveSession(store, (await S.redeemInvite(store, pc.token)).sessionToken)
  assert.equal(pal2.kind === 'player' && !pal2.isCaptain, true)
  await expectReject(S.issuePartnerCode(store, pal2), 403)
  await S.setBidControl(store, cap1, { teamId: r1.teamId, control: 'individual' })
  await S.setBidControl(store, cap1, { teamId: r1.teamId, control: 'captain' })
  await expectReject(S.setBidControl(store, pal2, { teamId: r2.teamId, control: 'captain' }), 403)
  await S.approveAllTeams(store, owner, { tournamentId: tid })
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  await S.startRound(store, owner, { tournamentId: tid, round: 1 })
  const [m] = await roundMatches(store, tid, 1)
  const h = await openHand(store, m.id)
  const ps = await store.select<any>('sp_players', { tournament_id: tid })
  const of = (team: string) => ps.filter((p: any) => p.team_id === team)
  await S.submitBids(store, cap1, { handId: h.id, bids: of(r1.teamId).map((p: any) => ({ playerId: p.id, bid: 2 })) })
  const pal2Id = (pal2 as any).playerId
  await expectReject(S.submitBids(store, pal2, { handId: h.id, bids: [{ playerId: r2.captainPlayerId, bid: 2 }] }), 403)
  await S.submitBids(store, pal2, { handId: h.id, bids: [{ playerId: pal2Id, bid: 2 }] })
  await S.submitBids(store, cap2, { handId: h.id, bids: [{ playerId: r2.captainPlayerId, bid: 2 }] })
  assert.equal((await openHand(store, m.id)).status, 'playing')
  await expectReject(S.setBidControl(store, cap1, { teamId: r1.teamId, control: 'individual' }), 409)
})

test('scheduled start: auto begins when due and exposes the start time for countdowns', async () => {
  const { store, tid } = await setup({ teams: 2 })
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  const at = new Date(store.now().getTime() + 10 * 60000).toISOString()
  await S.scheduleRound(store, owner, { tournamentId: tid, round: 1, scheduledAt: at, autoStart: true })
  let t = (await store.select<TournamentRow>('sp_tournaments', { id: tid }))[0]
  assert.equal(await S.autoStartDue(store, t), 0)
  const pub = V.publicState(await bundle(store, tid), store.now())
  assert.equal(pub.matches[0].scheduledAt, at)
  store.advance(11 * 60000)
  t = (await store.select<TournamentRow>('sp_tournaments', { id: tid }))[0]
  assert.equal(await S.autoStartDue(store, t), 1)
  const [m] = await roundMatches(store, tid, 1)
  assert.equal(m.status, 'live')
})

test('director can end a game early: leader wins, a tie is refused', async () => {
  const { store, tid } = await setup({ teams: 2 })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  await expectReject(S.endMatchNow(store, owner, { matchId: m.id, reason: 'curfew' }), 409, /tied/)
  await playHand(store, m.id, [2, 2, 2, 2], 7)
  await S.endMatchNow(store, owner, { matchId: m.id, reason: 'curfew' })
  const mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'final')
  assert.equal(mm.winner_team_id, mm.team_a_id)
  await S.finalizeMatch(store, owner, { matchId: m.id }) // harmless repeat
})

test('test mode: create, act as each simulated player, play, delete without touching real events', async () => {
  const store = new MemoryStore()
  const real = await S.createTournament(store, owner, { name: 'Real Event' })
  const tst = await S.createTestEvent(store, owner)
  const players = await store.select<any>('sp_players', { tournament_id: tst.id })
  assert.equal(players.length, 4)
  const realTeam = await S.registerTeam(store, owner, { tournamentId: real.id, name: 'Real', player1: 'R1', player2: 'R2' })
  await expectReject(S.actAsPlayer(store, owner, realTeam.captainPlayerId), 403)
  const [m] = await store.select<MatchRow>('sp_matches', { tournament_id: tst.id })
  await S.startMatch(store, owner, { matchId: m.id })
  const h = await openHand(store, m.id)
  for (const p of players.filter((x: any) => x.is_captain)) {
    const a = await S.actAsPlayer(store, owner, p.id)
    const mates = players.filter((x: any) => x.team_id === p.team_id)
    await S.submitBids(store, a, { handId: h.id, bids: mates.map((x: any) => ({ playerId: x.id, bid: 2 })) })
  }
  assert.equal((await openHand(store, m.id)).status, 'playing')
  const past = await V.pastChampions(store, real.id)
  assert.equal(past.length, 0)
  await S.deleteTestEvent(store, owner, { tournamentId: tst.id })
  assert.equal((await store.select<any>('sp_tournaments', { id: tst.id })).length, 0)
  assert.equal((await store.select<any>('sp_audit', { tournament_id: tst.id })).length, 0)
  assert.equal((await store.select<any>('sp_tournaments', { id: real.id })).length, 1)
  await expectReject(S.deleteTestEvent(store, owner, { tournamentId: real.id }), 403)
  await assert.rejects(store.remove('sp_audit', { tournament_id: real.id }))
})

test('open play without a bracket: director pairs games, teams replay, no advancement, standings', async () => {
  const store = new MemoryStore()
  const ev = await S.createTournament(store, owner, { name: 'Open Night', eventType: 'custom', teamLimit: 4, useBracket: false, targetDefault: 100 })
  await S.updateTournament(store, owner, { tournamentId: ev.id, patch: { rules: { ...CLASSIC, targetDefault: 100, requireCaptainApproval: false, bagsEnabled: false } } })
  await S.setTableCount(store, owner, { tournamentId: ev.id, count: 2 })
  const ids: string[] = []
  for (let i = 1; i <= 4; i++) ids.push((await S.registerTeam(store, owner, { tournamentId: ev.id, name: `O${i}`, player1: `o${i}a`, player2: `o${i}b`, bidControl: "individual" })).teamId)
  await S.setRosterLock(store, owner, { tournamentId: ev.id, locked: true })
  assert.equal((await store.select<MatchRow>('sp_matches', { tournament_id: ev.id })).length, 0) // no auto bracket
  await expectReject(S.generateBracket(store, owner, { tournamentId: ev.id, mode: 'random' }), 409)
  const g1 = await S.createGame(store, owner, { tournamentId: ev.id, teamAId: ids[0], teamBId: ids[1] })
  const g2 = await S.createGame(store, owner, { tournamentId: ev.id, teamAId: ids[0], teamBId: ids[2] })
  await expectReject(S.createGame(store, owner, { tournamentId: ev.id, teamAId: ids[0], teamBId: ids[0] }), 400)
  await S.setGameTeams(store, owner, { matchId: g2.matchId, teamAId: ids[2], teamBId: ids[3] })
  const r = await S.startAllReady(store, owner, { tournamentId: ev.id })
  assert.equal(r.started, 2)
  // Team busy guard: a third game with a playing team cannot start.
  const g3 = await S.createGame(store, owner, { tournamentId: ev.id, teamAId: ids[0], teamBId: ids[2] })
  await expectReject(S.startMatch(store, owner, { matchId: g3.matchId }), 409, /already playing/)
  await S.deleteGame(store, owner, { matchId: g3.matchId })
  await playHand(store, g1.matchId, [3, 3, 2, 2], 8)
  await playHand(store, g1.matchId, [3, 3, 2, 2], 8)
  assert.equal((await getMatch(store, g1.matchId)).status, 'completed')
  await S.finalizeMatch(store, owner, { matchId: g1.matchId })
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: ev.id })
  assert.equal(t.champion_team_id, null) // nobody advances, no champion
  const pub = V.publicState(await bundle(store, ev.id), store.now())
  assert.equal(pub.results[0].teamId, ids[0])
  assert.equal(pub.results[0].wins, 1)
  assert.equal(pub.matches[0].roundName, 'Game 1')
})

test('start all: only games where both teams tapped ready', async () => {
  const { store, tid } = await setup()
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  const ms = await roundMatches(store, tid, 1)
  const caps = await Promise.all([ms[0].team_a_id, ms[0].team_b_id].map(async id => {
    const p = (await store.select<any>('sp_players', { team_id: id!, is_captain: true }))[0]
    return S.actAsPlayer(store, owner, p.id).catch(() => null)
  }))
  assert.equal(caps[0], null) // not a test event: impersonation refused
  await store.update('sp_matches', { id: ms[0].id }, { ready_a_at: store.now().toISOString(), ready_b_at: store.now().toISOString() })
  const r = await S.startAllReady(store, owner, { tournamentId: tid, onlyBothReady: true })
  assert.equal(r.started, 1)
  const r2 = await S.startAllReady(store, owner, { tournamentId: tid })
  assert.equal(r2.started, 3)
})

test('delete event: unplayed events go completely, played events must be archived', async () => {
  const store = new MemoryStore()
  const a = await S.createTournament(store, owner, { name: 'Never Played' })
  await S.registerTeam(store, owner, { tournamentId: a.id, name: 'Z', player1: 'z1', player2: 'z2' })
  await S.deleteEvent(store, owner, { tournamentId: a.id })
  assert.equal((await store.select<any>('sp_tournaments', { id: a.id })).length, 0)
  const { store: s2, tid } = await setup({ teams: 2 })
  await lockAndStart(s2, tid)
  const [m] = await roundMatches(s2, tid, 1)
  await playHand(s2, m.id, [2, 2, 2, 2], 7)
  await expectReject(S.deleteEvent(s2, owner, { tournamentId: tid }), 409, /Archive/)
})

test('default flow: each captain enters own books once; 13 total scores it with no confirm step', async () => {
  const { store, tid } = await setup({ teams: 2, rules: { bagsEnabled: false, requireCaptainApproval: false } })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const ps = await store.select<any>('sp_players', { tournament_id: tid })
  const capOf = async (team: string) => S.actAsPlayer(store, owner, ps.find((p: any) => p.team_id === team && p.is_captain).id).catch(() => null)
  assert.equal(await capOf(m.team_a_id!), null) // real event: no impersonation
  const sess = async (team: string) => S.resolveSession(store, (await S.createSession(store, { kind: 'player', tournamentId: tid, playerId: ps.find((p: any) => p.team_id === team && p.is_captain).id, staffId: null, invitationId: null, ttlMs: 1e7 })).sessionToken)
  const ca = await sess(m.team_a_id!), cb = await sess(m.team_b_id!)
  const h = await openHand(store, m.id)
  await S.submitBids(store, ca, { handId: h.id, bids: ps.filter((p: any) => p.team_id === m.team_a_id).map((p: any) => ({ playerId: p.id, bid: 2 })) })
  await S.submitBids(store, cb, { handId: h.id, bids: ps.filter((p: any) => p.team_id === m.team_b_id).map((p: any) => ({ playerId: p.id, bid: 2 })) })
  // A says they have 7; B says they have 5: 12, not 13 -> recount
  await S.reportBooks(store, ca, { handId: h.id, booksA: 7, booksB: 6 })
  await S.reportBooks(store, cb, { handId: h.id, booksA: 8, booksB: 5 })
  assert.equal((await openHand(store, m.id)).status, 'disputed')
  // B recounts: 6. Now 7 + 6 = 13 and the hand is scored immediately.
  await S.reportBooks(store, cb, { handId: h.id, booksA: 7, booksB: 6 })
  const mm = await getMatch(store, m.id)
  assert.equal(mm.hands_verified, 1)
  assert.equal(mm.score_a, 43)
  assert.equal(mm.score_b, 42)
  assert.equal(mm.bags_a, 0)
})

test('clearing a practice run: restart the game, unlock, remove the test teams', async () => {
  const { store, tid } = await setup({ teams: 2 })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const h = await openHand(store, m.id)
  await expectReject(S.setRosterLock(store, owner, { tournamentId: tid, locked: false }), 409, /Restart/)
  await S.resetMatch(store, owner, { matchId: m.id, reason: 'practice over' })
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: false })
  assert.equal((await store.select<any>('sp_hands', { id: h.id })).length, 0)
  for (const t of await store.select<TeamRow>('sp_teams', { tournament_id: tid })) await S.removeTeam(store, owner, { teamId: t.id })
  assert.equal((await store.select<TeamRow>('sp_teams', { tournament_id: tid })).length, 0)
  const [tt] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.equal(tt.status, 'registration')
})


test('director ends any match any time without a reason, picks a winner on a tie, redeals and restarts freely', async () => {
  const { store, tid } = await setup()
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  const [m1, m2] = await roundMatches(store, tid, 1)
  // Before it starts: end it, chosen team advances.
  await S.endMatchNow(store, owner, { matchId: m1.id, winnerTeamId: m1.team_b_id })
  let mm = await getMatch(store, m1.id)
  assert.equal(mm.status, 'final')
  assert.equal(mm.result_kind, 'forfeit')
  const sf = (await roundMatches(store, tid, 2))[0]
  assert.equal(sf.team_a_id, m1.team_b_id)
  // Live and tied: needs a pick.
  await S.startMatch(store, owner, { matchId: m2.id })
  await expectReject(S.endMatchNow(store, owner, { matchId: m2.id }), 409, /Pick/)
  // Redeal (void) and restart without reasons.
  const h = await openHand(store, m2.id)
  await S.voidHand(store, owner, { handId: h.id, reason: '' })
  assert.notEqual((await openHand(store, m2.id)).id, h.id)
  await S.resetMatch(store, owner, { matchId: m2.id, reason: '' })
  assert.equal((await getMatch(store, m2.id)).status, 'ready')
  await S.startMatch(store, owner, { matchId: m2.id })
  await playHand(store, m2.id, [2, 2, 2, 2], 7)
  await S.correctHand(store, owner, { handId: (await store.select<any>('sp_hands', { match_id: m2.id, status: 'verified' }))[0].id, reason: '', booksA: 6, booksB: 7 })
  await S.endMatchNow(store, owner, { matchId: m2.id })
  mm = await getMatch(store, m2.id)
  assert.equal(mm.winner_team_id, mm.team_b_id)
  const audits = await store.select<any>('sp_audit', { match_id: m2.id, action: 'hand.void' })
  assert.equal(audits[0].reason, 'Director decision')
  // Supervisors still need a reason.
  const st = await S.addStaff(store, owner, { tournamentId: tid, name: 'Sup', role: 'supervisor' })
  const sup = await S.resolveSession(store, (await S.redeemInvite(store, st.invite.token)).sessionToken)
  const [m3] = (await roundMatches(store, tid, 1)).slice(2)
  await S.startMatch(store, owner, { matchId: m3.id })
  await expectReject(S.voidHand(store, sup, { handId: (await openHand(store, m3.id)).id, reason: '' }), 400)
})

test('self-serve: players create a game, both ready starts it, it finishes itself, rematch, owner sees activity', async () => {
  const store = new MemoryStore()
  const real = await S.createTournament(store, owner, { name: 'Real Event' })
  await S.updateTournament(store, owner, { tournamentId: real.id, patch: { registration_open: true } })
  const g = await S.createSelfServeGame(store, { teamA: 'Aces', captainA: 'Ann', partnerA: 'Al', teamB: 'Kings', captainB: 'Kim', partnerB: 'Ken', target: 10 })
  const ann = await S.resolveSession(store, (await S.createSession(store, { kind: 'player', tournamentId: g.tournamentId, playerId: g.captainPlayerId, staffId: null, invitationId: null, ttlMs: 1e7 })).sessionToken)
  const kim = await S.resolveSession(store, (await S.redeemInvite(store, g.otherCode)).sessionToken)
  assert.equal(kim.kind === 'player' && kim.isCaptain, true)
  const [m] = await store.select<MatchRow>('sp_matches', { tournament_id: g.tournamentId })
  assert.equal(m.status, 'ready')
  await S.setReady(store, ann, { matchId: m.id, ready: true })
  assert.equal((await getMatch(store, m.id)).status, 'ready')
  const r = await S.setReady(store, kim, { matchId: m.id, ready: true })
  assert.equal(r.started, true)
  assert.equal((await getMatch(store, m.id)).time_limit_min, 0)
  const ps = await store.select<any>('sp_players', { tournament_id: g.tournamentId })
  const ids = (team: string) => ps.filter((p: any) => p.team_id === team).map((p: any) => p.id)
  const hand = async (bidA: number, bidB: number, booksA: number) => {
    const h = await openHand(store, m.id)
    await S.submitBids(store, ann, { handId: h.id, bids: ids(m.team_a_id!).map((id: string, i: number) => ({ playerId: id, bid: i ? 2 : bidA - 2 })) })
    await S.submitBids(store, kim, { handId: h.id, bids: ids(m.team_b_id!).map((id: string, i: number) => ({ playerId: id, bid: i ? 2 : bidB - 2 })) })
    await S.reportBooks(store, ann, { handId: h.id, booksA, booksB: 13 - booksA })
    await S.reportBooks(store, kim, { handId: h.id, booksA, booksB: 13 - booksA })
  }
  await hand(6, 4, 8) // Ann 6, Kim 4 (5 books, bid 4 -> 4)
  await hand(6, 4, 8) // Ann 12 -> past 10, wins
  let mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'final') // no director needed
  assert.equal(mm.winner_team_id, m.team_a_id)
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: g.tournamentId })
  assert.equal(t.champion_team_id, null)
  // Rematch: Kim asks, Ann taps Ready, it starts.
  await S.requestRematch(store, kim)
  const games = await store.select<MatchRow>('sp_matches', { tournament_id: g.tournamentId })
  const re = games.find(x => x.id !== m.id)!
  assert.equal(re.status, 'ready')
  await S.setReady(store, ann, { matchId: re.id, ready: true })
  assert.equal((await getMatch(store, re.id)).status, 'live')
  // Private: not on the public events list; owner sees it in activity.
  const pubEvents = await V.publicEvents(store)
  assert.ok(pubEvents.every((e: any) => e.slug !== g.slug))
  assert.ok(pubEvents.some((e: any) => e.name === 'Real Event'))
  const act = await V.activityState(store, store.now())
  assert.equal(act.totals.events, 1)
  assert.equal(act.totals.live, 1)
  assert.equal(act.totals.gamesPlayed, 1)
  // Player view: record and rematch flag
  const b = await V.loadBundle(store, t)
  const pv = V.playerState(b, kim, store.now())!
  assert.equal(pv.rematchable, true)
  assert.equal(pv.record.losses, 1)
  // Lost code: captain makes a new one for the other captain, old one dies.
  const fresh = await S.issueOpponentCode(store, ann)
  await expectReject(S.redeemInvite(store, g.otherCode), 410)
  await S.redeemInvite(store, fresh.token)
  // Rate-limited creation input checks
  await expectReject(S.createSelfServeGame(store, { teamA: 'X', captainA: 'a', partnerA: 'b', teamB: 'x', captainB: 'c', partnerB: 'd' }), 400)
})
