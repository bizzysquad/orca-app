import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as S from '../../src/lib/spades/service.ts'
import * as V from '../../src/lib/spades/views.ts'
import { MemoryStore } from '../../src/lib/spades/store.ts'
import type { AuditRow, BidRow, DisputeRow, HandRow, MatchRow, TeamRow, TournamentRow } from '../../src/lib/spades/types.ts'
import { expectReject, getMatch, lockAndStart, matchPlayers, openHand, owner, playHand, roundMatches, setup } from './helpers.ts'

async function bundle(store: MemoryStore, tid: string) {
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  return V.loadBundle(store, t)
}

test('1. registers eight teams', async () => {
  const { store, tid } = await setup()
  const teams = await store.select<TeamRow>('sp_teams', { tournament_id: tid, status: 'approved' })
  assert.equal(teams.length, 8)
  const pub = V.publicState(await bundle(store, tid), store.now())
  assert.equal(pub.registration.full, true)
  assert.equal(pub.teams.length, 8)
})

test('2. capacity, waitlist and duplicate prevention', async () => {
  const { store, tid } = await setup()
  const r = await S.registerTeam(store, owner, { tournamentId: tid, name: 'Team Nine', player1: 'Nina', player2: 'Nate' })
  assert.equal(r.status, 'waitlist')
  await expectReject(S.registerTeam(store, owner, { tournamentId: tid, name: 'team 1', player1: 'X', player2: 'Y' }), 409, /taken/)
  await expectReject(S.registerTeam(store, owner, { tournamentId: tid, name: 'Fresh', player1: 'P1A', player2: 'Zed' }), 409, /already registered/)
  await expectReject(S.registerTeam(store, owner, { tournamentId: tid, name: 'Same', player1: 'Kim', player2: ' kim ' }), 400)
  const waitTeam = (await store.select<TeamRow>('sp_teams', { tournament_id: tid, name: 'Team Nine' }))[0]
  await expectReject(S.setTeamStatus(store, owner, { teamId: waitTeam.id, status: 'approved' }), 409, /Already 8/)
  // Public registration goes to pending or waitlist, never straight into the bracket.
  const pub = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: 'Walk In', player1: 'W1', player2: 'W2' })
  assert.equal(pub.status, 'waitlist')
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await expectReject(S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: 'Late', player1: 'L1', player2: 'L2' }), 409, /closed/)
  const ms = await store.select<MatchRow>('sp_matches', { tournament_id: tid })
  const inBracket = new Set(ms.flatMap(m => [m.team_a_id, m.team_b_id]).filter(Boolean))
  assert.equal(inBracket.has(waitTeam.id), false)
  assert.equal(inBracket.size, 8)
})

test('3/5/6. individual bidding, corrections before lock, combined minimum', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  await S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 1 }] })
  // Partner must bring the team to at least 4.
  await expectReject(S.submitBids(store, mp.a[1], { handId: h.id, bids: [{ playerId: mp.ids.a[1], bid: 2 }] }), 400, /at least 4/)
  await expectReject(S.submitBids(store, mp.a[1], { handId: h.id, bids: [{ playerId: mp.ids.a[1], bid: 14 }] }), 400)
  await expectReject(S.submitBids(store, mp.a[1], { handId: h.id, bids: [{ playerId: mp.ids.a[1], bid: 2.5 as any }] }), 400)
  // Correction before lock keeps history.
  await S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] })
  const all = await store.select<BidRow>('sp_bids', { hand_id: h.id, player_id: mp.ids.a[0] })
  assert.equal(all.length, 2)
  assert.equal(all.filter(b => b.active).length, 1)
  await S.submitBids(store, mp.a[1], { handId: h.id, bids: [{ playerId: mp.ids.a[1], bid: 2 }] })
  await S.submitBids(store, mp.b[0], { handId: h.id, bids: [{ playerId: mp.ids.b[0], bid: 3 }] })
  let fresh = await openHand(store, m.id)
  assert.equal(fresh.status, 'bidding') // not locked until all four
  await S.submitBids(store, mp.b[1], { handId: h.id, bids: [{ playerId: mp.ids.b[1], bid: 3 }] })
  fresh = await openHand(store, m.id)
  assert.equal(fresh.status, 'playing')
  // Locked: players cannot change bids any more.
  await expectReject(S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 5 }] }), 409, /locked/)
})

test('21. players cannot bid for others or act in other matches', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m1, m2] = await roundMatches(store, tid, 1)
  const mp1 = await matchPlayers(store, m1.id)
  const mp2 = await matchPlayers(store, m2.id)
  const h1 = await openHand(store, m1.id)
  await expectReject(S.submitBids(store, mp1.a[1], { handId: h1.id, bids: [{ playerId: mp1.ids.a[0], bid: 4 }] }), 403)
  await expectReject(S.submitBids(store, mp1.a[0], { handId: h1.id, bids: [{ playerId: mp1.ids.b[0], bid: 4 }] }), 403)
  await expectReject(S.submitBids(store, mp2.a[0], { handId: h1.id, bids: [{ playerId: mp2.ids.a[0], bid: 4 }] }), 403)
  await expectReject(S.submitBids(store, S.PUBLIC, { handId: h1.id, bids: [{ playerId: mp1.ids.a[0], bid: 4 }] }), 403)
  await expectReject(S.finalizeMatch(store, mp1.capA, { matchId: m1.id }), 403)
  await expectReject(S.startMatch(store, mp1.capA, { matchId: m2.id }), 403)
  await expectReject(S.correctHand(store, mp1.capA, { handId: h1.id, reason: 'x', booksA: 13, booksB: 0 }), 403)
  // Non captain cannot report books.
  for (const [a, pid, bid] of [[mp1.a[0], mp1.ids.a[0], 2], [mp1.a[1], mp1.ids.a[1], 2], [mp1.b[0], mp1.ids.b[0], 2], [mp1.b[1], mp1.ids.b[1], 2]] as const) {
    await S.submitBids(store, a, { handId: h1.id, bids: [{ playerId: pid, bid }] })
  }
  const nonCap = mp1.a.find(a => a.kind === 'player' && !a.isCaptain)!
  await expectReject(S.reportBooks(store, nonCap, { handId: h1.id, booksA: 7, booksB: 6 }), 403)
})

test('4. team captain bidding mode', async () => {
  const { store, tid } = await setup({ rules: { biddingMode: 'captain' } })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  const nonCap = mp.a.find(a => a.kind === 'player' && !a.isCaptain)!
  await expectReject(S.submitBids(store, nonCap, { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }, { playerId: mp.ids.a[1], bid: 2 }] }), 403)
  await expectReject(S.submitBids(store, mp.capA, { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }), 400, /both/)
  await expectReject(S.submitBids(store, mp.capA, { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 1 }, { playerId: mp.ids.a[1], bid: 2 }] }), 400, /at least 4/)
  await S.submitBids(store, mp.capA, { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 3 }, { playerId: mp.ids.a[1], bid: 2 }] })
  // Opponent view before lock: submitted but hidden.
  let d = V.matchDetail(await bundle(store, tid), mp.capB, m.id, store.now())!
  assert.equal(d.current.seats.filter((s: any) => s.side === 'a').every((s: any) => s.submitted && s.bid === null), true)
  assert.equal(d.current.teamBid.a, null)
  await S.submitBids(store, mp.capB, { handId: h.id, bids: [{ playerId: mp.ids.b[0], bid: 4 }, { playerId: mp.ids.b[1], bid: 1 }] })
  d = V.matchDetail(await bundle(store, tid), mp.capB, m.id, store.now())!
  assert.equal(d.current.status, 'playing')
  assert.equal(d.current.teamBid.a, 5)
  const bids = await store.select<BidRow>('sp_bids', { hand_id: h.id, active: true })
  assert.equal(bids.length, 4)
  assert.ok(bids.every(b => b.entered_by_kind === 'player' && b.entered_by_name))
  // Mid-tournament rule change does not affect this running match.
  await S.updateTournament(store, owner, { tournamentId: tid, patch: { rules: { biddingMode: 'individual' } } })
  const mm = await getMatch(store, m.id)
  assert.equal((mm.rules as any).biddingMode, 'captain')
})

test('sequential bidding enforces seat order and shows earlier bids', async () => {
  const { store, tid } = await setup({ rules: { bidOrder: 'sequential' } })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id) // hand 1: dealer pos 0, so B1 (pos 1) bids first
  await expectReject(S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }), 409, /Waiting on/)
  await S.submitBids(store, mp.b[0], { handId: h.id, bids: [{ playerId: mp.ids.b[0], bid: 3 }] })
  const d = V.matchDetail(await bundle(store, tid), mp.a[0], m.id, store.now())!
  assert.equal(d.current.seats[1].bid, 3)
  const pub = V.matchDetail(await bundle(store, tid), S.PUBLIC, m.id, store.now())!
  assert.equal(pub.current.seats[1].bid, null)
})

test('7/8. book totals and conflicting captain reports create a dispute', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  for (const [a, pid] of [[mp.a[0], mp.ids.a[0]], [mp.a[1], mp.ids.a[1]], [mp.b[0], mp.ids.b[0]], [mp.b[1], mp.ids.b[1]]] as const) {
    await S.submitBids(store, a, { handId: h.id, bids: [{ playerId: pid, bid: 3 }] })
  }
  await expectReject(S.reportBooks(store, mp.capA, { handId: h.id, booksA: 7, booksB: 7 }), 400, /13/)
  await S.reportBooks(store, mp.capA, { handId: h.id, booksA: 7, booksB: 6 })
  await S.reportBooks(store, mp.capB, { handId: h.id, booksA: 6, booksB: 7 })
  let hand = await openHand(store, m.id)
  assert.equal(hand.status, 'disputed')
  const ds = await store.select<DisputeRow>('sp_disputes', { hand_id: h.id, status: 'open' })
  assert.equal(ds.length, 1)
  await expectReject(S.approveHand(store, mp.capA, { handId: h.id }), 409, /disputed/)
  // Score did not advance.
  assert.equal((await getMatch(store, m.id)).score_a, 0)
  // Captain amends to agree -> dispute auto-resolves -> review.
  await S.reportBooks(store, mp.capB, { handId: h.id, booksA: 7, booksB: 6 })
  hand = await openHand(store, m.id)
  assert.equal(hand.status, 'review')
  assert.equal((await store.select<DisputeRow>('sp_disputes', { hand_id: h.id, status: 'open' })).length, 0)
  await S.approveHand(store, mp.capA, { handId: h.id })
  await S.approveHand(store, mp.capB, { handId: h.id })
  const mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 61)
  assert.equal(mm.score_b, 60)
  assert.equal(mm.bags_a, 1)
})

test('17. supervisor resolves a dispute with a documented ruling', async () => {
  const { store, tid } = await setup()
  const staffRes = await S.addStaff(store, owner, { tournamentId: tid, name: 'Sup One', role: 'supervisor' })
  const { sessionToken } = await S.redeemInvite(store, staffRes.invite.token)
  const sup = await S.resolveSession(store, sessionToken)
  assert.equal(sup.kind, 'staff')
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  for (const [a, pid] of [[mp.a[0], mp.ids.a[0]], [mp.a[1], mp.ids.a[1]], [mp.b[0], mp.ids.b[0]], [mp.b[1], mp.ids.b[1]]] as const) {
    await S.submitBids(store, a, { handId: h.id, bids: [{ playerId: pid, bid: 3 }] })
  }
  await S.reportBooks(store, mp.capA, { handId: h.id, booksA: 8, booksB: 5 })
  await S.reportBooks(store, mp.capB, { handId: h.id, booksA: 6, booksB: 7 })
  const [d] = await store.select<DisputeRow>('sp_disputes', { hand_id: h.id, status: 'open' })
  await expectReject(S.resolveDispute(store, sup, { disputeId: d.id, resolution: '' }), 400)
  await expectReject(S.resolveDispute(store, sup, { disputeId: d.id, resolution: 'checked' }), 400, /official book/)
  await S.resolveDispute(store, sup, { disputeId: d.id, resolution: 'Recounted tricks with both captains', booksA: 7, booksB: 6 })
  const [hv] = await store.select<HandRow>('sp_hands', { id: h.id })
  assert.equal(hv.status, 'verified')
  assert.equal(hv.books_a, 7)
  const mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 61)
  // Renege ruling on a later hand
  const h2 = await openHand(store, m.id)
  for (const [a, pid, bid] of [[mp.a[0], mp.ids.a[0], 3], [mp.a[1], mp.ids.a[1], 2], [mp.b[0], mp.ids.b[0], 2], [mp.b[1], mp.ids.b[1], 2]] as const) {
    await S.submitBids(store, a, { handId: h2.id, bids: [{ playerId: pid, bid }] })
  }
  const { disputeId } = await S.raiseDispute(store, mp.capA, { matchId: m.id, handId: h2.id, kind: 'renege', reason: 'Team B trumped while holding hearts' })
  await S.reportBooks(store, mp.capA, { handId: h2.id, booksA: 5, booksB: 8 })
  await S.reportBooks(store, mp.capB, { handId: h2.id, booksA: 5, booksB: 8 })
  await expectReject(S.approveHand(store, mp.capA, { handId: h2.id }), 409, /dispute/)
  await S.resolveDispute(store, sup, { disputeId, resolution: 'Renege confirmed on trick 6', renegeTeamId: m.team_b_id })
  await S.approveHand(store, mp.capA, { handId: h2.id })
  await S.approveHand(store, mp.capB, { handId: h2.id })
  const m2 = await getMatch(store, m.id)
  assert.equal(m2.score_a, 61 + 50) // A bid 5 and gets 10 per book bid
  assert.equal(m2.score_b, 60 - 40) // B loses its 4 bid
  assert.equal(m2.bags_b, 0)
  const audits = await store.select<AuditRow>('sp_audit', { tournament_id: tid })
  assert.ok(audits.some(a => a.action === 'dispute.resolved' && a.actor_role === 'supervisor' && a.reason))
})

test('18/correction: changing a verified hand recalculates later hands and audits it', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const h1 = await playHand(store, m.id, [2, 2, 3, 3], 7) // A 4 bid 7 books: +43, bags 3
  await playHand(store, m.id, [2, 2, 3, 3], 8) // A +44 bags 7
  let mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 87)
  assert.equal(mm.bags_a, 7)
  await expectReject(S.correctHand(store, owner, { handId: h1.id, reason: '', booksA: 4, booksB: 9 }), 400)
  await S.correctHand(store, owner, { handId: h1.id, reason: 'Miscounted hand 1', booksA: 4, booksB: 9 })
  mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, 40 + 44)
  assert.equal(mm.bags_a, 4)
  assert.equal(mm.score_b, 63 - 60) // B: +63 on hand 1, set on hand 2 (bid 6, won 5)
  const audits = await store.select<AuditRow>('sp_audit', { hand_id: h1.id, action: 'hand.correction' })
  assert.equal(audits.length, 1)
  assert.equal((audits[0].before as any).booksA, 7)
  assert.equal((audits[0].after as any).booksA, 4)
  assert.equal(audits[0].reason, 'Miscounted hand 1')
  // Audit log is append only.
  await assert.rejects(store.update('sp_audit', { id: audits[0].id }, { reason: 'tampered' }))
  await assert.rejects(store.remove('sp_audit', { id: audits[0].id }))
})

test('23/24. duplicate taps and simultaneous devices never double count', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  // Same bid sent twice in parallel from two devices.
  const r = await Promise.allSettled([
    S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }),
    S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }),
  ])
  assert.ok(r.some(x => x.status === 'fulfilled'))
  assert.equal((await store.select<BidRow>('sp_bids', { hand_id: h.id, active: true })).length, 1)
  for (const [a, pid] of [[mp.a[1], mp.ids.a[1]], [mp.b[0], mp.ids.b[0]], [mp.b[1], mp.ids.b[1]]] as const) {
    await S.submitBids(store, a, { handId: h.id, bids: [{ playerId: pid, bid: 2 }] })
  }
  await Promise.all([
    S.reportBooks(store, mp.capA, { handId: h.id, booksA: 7, booksB: 6 }),
    S.reportBooks(store, mp.capB, { handId: h.id, booksA: 7, booksB: 6 }),
  ])
  await S.reportBooks(store, mp.capA, { handId: h.id, booksA: 7, booksB: 6 }) // retry is a no-op
  await Promise.allSettled([
    S.approveHand(store, mp.capA, { handId: h.id }),
    S.approveHand(store, mp.capA, { handId: h.id }),
    S.approveHand(store, mp.capB, { handId: h.id }),
    S.approveHand(store, mp.capB, { handId: h.id }),
  ])
  await S.approveHand(store, mp.capB, { handId: h.id }) // late retry after verify
  const mm = await getMatch(store, m.id)
  assert.equal(mm.hands_verified, 1)
  assert.equal(mm.score_a, 43)
  const hands = await store.select<HandRow>('sp_hands', { match_id: m.id })
  assert.equal(hands.length, 2) // verified hand 1 + open hand 2, never two open
  // Stale submission for the old hand after reconnecting is rejected.
  await expectReject(S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 5 }] }), 409)
  await expectReject(S.reportBooks(store, mp.capA, { handId: h.id, booksA: 3, booksB: 10 }), 409, /closed/)
})

test('22. access codes: reusable until replaced, expired or wrong codes rejected', async () => {
  const { store, tid } = await setup()
  const [team] = await store.select<TeamRow>('sp_teams', { tournament_id: tid, name: 'Team 1' })
  const { invites } = await S.issueTeamInvites(store, owner, { teamId: team.id })
  const first = invites[0]
  assert.match(first.token, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  const { sessionToken } = await S.redeemInvite(store, first.token)
  // Typing it again (lowercase, no dash) on another phone still works.
  const again = await S.redeemInvite(store, first.token.toLowerCase().replace('-', ''))
  assert.equal((await S.resolveSession(store, again.sessionToken)).kind, 'player')
  assert.equal((await S.resolveSession(store, sessionToken)).kind, 'player')
  // Lost phone: a new code signs out the old phones and kills the old code.
  const re = await S.issueInvite(store, owner, { playerId: first.playerId, revokeSessions: true })
  assert.equal((await S.resolveSession(store, sessionToken)).kind, 'public')
  await expectReject(S.redeemInvite(store, first.token), 410, /replaced/)
  await S.redeemInvite(store, re.token)
  store.advance(S.INVITE_TTL_MS + 1000)
  await expectReject(S.redeemInvite(store, re.token), 410, /expired/)
  await expectReject(S.redeemInvite(store, 'ZZZZ-ZZZZ'), 404)
  await expectReject(S.redeemInvite(store, 'nope'), 404)
  const rows = await store.select<any>('sp_invitations', { tournament_id: tid })
  assert.ok(rows.every(r => r.token_hash && !JSON.stringify(r).includes(first.token.replace('-', ''))))
})

test('registrant gets one access code; only captains of new teams', async () => {
  const { store, tid } = await setup({ teams: 0 })
  const r = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: 'Coders', player1: 'Cee', player2: 'Dee' })
  const code = await S.issueRegistrantCode(store, r.captainPlayerId)
  await expectReject(S.issueRegistrantCode(store, r.captainPlayerId), 409)
  const a = await S.resolveSession(store, (await S.redeemInvite(store, code.token)).sessionToken)
  assert.equal(a.kind === 'player' && a.isCaptain, true)
  const partner = (await store.select<any>('sp_players', { team_id: r.teamId, is_captain: false }))[0]
  await expectReject(S.issueRegistrantCode(store, partner.id), 403)
})

test('captains tap ready before the director begins; others cannot', async () => {
  const { store, tid } = await setup()
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const nonCap = mp.a.find(a => a.kind === 'player' && !a.isCaptain)!
  await expectReject(S.setReady(store, nonCap, { matchId: m.id, ready: true }), 403)
  await expectReject(S.setReady(store, mp.capA, { matchId: (await roundMatches(store, tid, 1))[1].id, ready: true }), 403)
  await S.setReady(store, mp.capA, { matchId: m.id, ready: true })
  await S.setReady(store, mp.capB, { matchId: m.id, ready: true })
  let mm = await getMatch(store, m.id)
  assert.ok(mm.ready_a_at && mm.ready_b_at)
  const pub = V.publicState(await bundle(store, tid), store.now())
  assert.equal(pub.matches.find((x: any) => x.id === m.id)!.readyA, true)
  await S.setReady(store, mp.capB, { matchId: m.id, ready: false })
  mm = await getMatch(store, m.id)
  assert.equal(mm.ready_b_at, null)
  await S.startMatch(store, owner, { matchId: m.id })
  await expectReject(S.setReady(store, mp.capA, { matchId: m.id, ready: false }), 409, /began/)
})

test('20. cross tournament authorization', async () => {
  const one = await setup()
  const two = await setup()
  // Staff of tournament one cannot touch tournament two even sharing a store.
  const store = one.store
  const t2 = await S.createTournament(store, owner, { name: 'Other Event', capacity: 4 })
  const sres = await S.addStaff(store, owner, { tournamentId: one.tid, name: 'Dir One', role: 'director' })
  const dir1 = await S.resolveSession(store, (await S.redeemInvite(store, sres.invite.token)).sessionToken)
  await expectReject(S.updateTournament(store, dir1, { tournamentId: t2.id, patch: { name: 'Hijacked' } }), 403)
  await expectReject(S.registerTeam(store, dir1, { tournamentId: t2.id, name: 'Sneaky', player1: 'a1', player2: 'a2' }), 409)
  await S.updateTournament(store, dir1, { tournamentId: one.tid, patch: { name: 'Renamed OK' } })
  await expectReject(S.addStaff(store, dir1, { tournamentId: one.tid, name: 'X', role: 'director' }), 403)
  assert.ok(two.tid)
})

test('15. time limit ends the match after the hand in progress', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  await playHand(store, m.id, [2, 2, 3, 3], 7)
  store.advance(51 * 60000)
  await playHand(store, m.id, [2, 2, 3, 3], 7)
  const mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, mm.team_b_id) // 120 vs 86
})

test('14. tie at the time limit plays a tiebreaker hand', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  await playHand(store, m.id, [3, 3, 3, 3], 7) // A 61, B 60
  store.advance(51 * 60000)
  await playHand(store, m.id, [3, 3, 3, 3], 6) // A 121, B 121 at time
  let mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'live')
  assert.equal((await openHand(store, m.id)).is_tiebreak, true)
  await playHand(store, m.id, [2, 2, 2, 2], 5) // B wins the tiebreaker
  mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, mm.team_b_id)
})

test('correcting a completed (not final) match updates or reopens it', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  store.advance(51 * 60000)
  const h = await playHand(store, m.id, [3, 3, 3, 3], 7) // A 61 v B 60, time expired
  let mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, mm.team_a_id)
  await S.correctHand(store, owner, { handId: h.id, reason: 'recount', booksA: 6, booksB: 7 })
  mm = await getMatch(store, m.id)
  assert.equal(mm.winner_team_id, mm.team_b_id)
  await S.finalizeMatch(store, owner, { matchId: m.id })
  const sf = (await roundMatches(store, tid, 2))[0]
  assert.equal(sf.team_a_id, mm.team_b_id)
})

test('14b. exact tie at the target forces a tiebreaker', async () => {
  const { store, tid } = await setup({ rules: { targetDefault: 100 } })
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  // hand 1: A 6 bid 7 books = 61, B 6 bid 6 books = 60
  await playHand(store, m.id, [3, 3, 3, 3], 7)
  // hand 2: A 6 bid 6 books = 60, B 6 bid 7 books = 61 -> 121 v 121, both past 100
  await playHand(store, m.id, [3, 3, 3, 3], 6)
  let mm = await getMatch(store, m.id)
  assert.equal(mm.score_a, mm.score_b)
  assert.equal(mm.status, 'live')
  const tb = await openHand(store, m.id)
  assert.equal(tb.is_tiebreak, true)
  await playHand(store, m.id, [2, 2, 2, 2], 8)
  mm = await getMatch(store, m.id)
  assert.equal(mm.status, 'completed')
  assert.equal(mm.winner_team_id, mm.team_a_id)
})

test('pause stops the clock; players blocked while paused, staff can assist', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  await S.pauseMatch(store, owner, { matchId: m.id })
  store.advance(30 * 60000)
  await expectReject(S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }), 409, /paused/)
  await S.submitBids(store, owner, { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] }) // assisted
  await S.resumeMatch(store, owner, { matchId: m.id })
  const mm = await getMatch(store, m.id)
  assert.equal(mm.paused_ms, 30 * 60000)
})

test('19/E2E. a complete eight team tournament from registration to champion', async () => {
  const { store, tid } = await setup()
  await expectReject(S.startRound(store, owner, { tournamentId: tid, round: 1 }), 404, /No matches/)
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  // Preview before publish: public sees no bracket yet.
  let pub = V.publicState(await bundle(store, tid), store.now())
  assert.equal(pub.matches.length, 0)
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  pub = V.publicState(await bundle(store, tid), store.now())
  assert.equal(pub.matches.length, 7)
  await expectReject(S.startRound(store, owner, { tournamentId: tid, round: 2 }), 409, /previous round/)
  for (const round of [1, 2, 3]) {
    await S.startRound(store, owner, { tournamentId: tid, round })
    const ms = await roundMatches(store, tid, round)
    for (const m of ms) {
      assert.equal(m.status, 'live')
      let guard = 0
      while ((await getMatch(store, m.id)).status === 'live') {
        await playHand(store, m.id, [3, 3, 2, 2], 8) // A +62ish, B 4 bid 5 books
        if (++guard > 40) throw new Error('match never ended')
      }
      const done = await getMatch(store, m.id)
      assert.equal(done.status, 'completed')
      assert.ok(done.score_a >= done.target)
      // Winner does not advance before finalization.
      if (round < 3) {
        const next = (await roundMatches(store, tid, round + 1))[Math.floor(m.slot / 2)]
        assert.notEqual(next.team_a_id, done.winner_team_id)
        assert.notEqual(next.team_b_id, done.winner_team_id)
      }
      await S.finalizeMatch(store, owner, { matchId: m.id })
    }
  }
  const final = (await roundMatches(store, tid, 3))[0]
  assert.equal(final.target, 350)
  assert.equal(final.time_limit_min, 70)
  assert.ok(final.score_a >= 350)
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.equal(t.status, 'completed')
  assert.equal(t.champion_team_id, final.winner_team_id)
  const st = V.standings(await bundle(store, tid))
  assert.equal(st.length, 8)
  assert.equal(st[0].place, '1')
  // Finalized result changes need the director; winner flip blocked downstream? (final has no downstream)
  const qf = (await roundMatches(store, tid, 1))[0]
  const qfHand = (await store.select<HandRow>('sp_hands', { match_id: qf.id, status: 'verified' }))[0]
  await expectReject(S.correctHand(store, owner, { handId: qfHand.id, reason: 'flip it', booksA: 0, booksB: 13 }), 409)
})

test('25. reconnecting client sees server truth; stale hand ids are rejected', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h1 = await playHand(store, m.id, [2, 2, 2, 2], 7)
  // A device that was offline during hand 1 still holds h1 and tries to bid on it.
  await expectReject(S.submitBids(store, mp.a[0], { handId: h1.id, bids: [{ playerId: mp.ids.a[0], bid: 4 }] }), 409)
  const d = V.matchDetail(await bundle(store, tid), mp.a[0], m.id, store.now())!
  assert.equal(d.current.handNumber, 2)
  assert.equal(d.history.length, 1)
  assert.equal(d.match.scoreA, 43)
  // Pulse changes on every write so polling clients refetch.
  const [t1] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  await S.submitBids(store, mp.a[0], { handId: d.current.id, bids: [{ playerId: mp.ids.a[0], bid: 2 }] })
  const [t2] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.notEqual(t1.pulse, t2.pulse)
})

test('forfeit and byes advance with audit records', async () => {
  const { store, tid } = await setup({ teams: 6 })
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  const r1 = await roundMatches(store, tid, 1)
  assert.equal(r1.filter(m => m.result_kind === 'bye' && m.status === 'final').length, 2)
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  await S.startRound(store, owner, { tournamentId: tid, round: 1 })
  const live = (await roundMatches(store, tid, 1)).filter(m => m.status === 'live')
  assert.equal(live.length, 2)
  await expectReject(S.forfeitMatch(store, owner, { matchId: live[0].id, winnerTeamId: live[0].team_a_id!, kind: 'forfeit', reason: '' }), 400)
  await S.forfeitMatch(store, owner, { matchId: live[0].id, winnerTeamId: live[0].team_a_id!, kind: 'forfeit', reason: 'Team B no show' })
  const audits = await store.select<AuditRow>('sp_audit', { match_id: live[0].id, action: 'match.forfeit' })
  assert.equal(audits.length, 1)
  const sf = await roundMatches(store, tid, 2)
  assert.ok(sf.some(m => m.team_a_id === live[0].team_a_id || m.team_b_id === live[0].team_a_id))
})

test('public view never exposes unrevealed bids, reports or player names', async () => {
  const { store, tid } = await setup()
  await lockAndStart(store, tid)
  const [m] = await roundMatches(store, tid, 1)
  const mp = await matchPlayers(store, m.id)
  const h = await openHand(store, m.id)
  await S.submitBids(store, mp.a[0], { handId: h.id, bids: [{ playerId: mp.ids.a[0], bid: 4 }] })
  const b = await bundle(store, tid)
  const pub = JSON.stringify(V.publicState(b, store.now()))
  const det = V.matchDetail(b, S.PUBLIC, m.id, store.now())!
  assert.equal(det.teamA!.players.length, 0)
  assert.ok(det.current.seats.every((s: any) => s.bid === null && s.name === null))
  assert.equal(det.disputes.length, 0)
  assert.ok(!pub.includes('P1a'))
  // Partner sees it, opponent does not (simultaneous mode)
  const partner = V.matchDetail(b, mp.a[1], m.id, store.now())!
  const opp = V.matchDetail(b, mp.b[0], m.id, store.now())!
  assert.equal(partner.current.seats[0].bid, 4)
  assert.equal(opp.current.seats[0].bid, null)
  assert.equal(opp.current.seats[0].submitted, true)
})

test('approve all fills open spots in sign up order and leaves the rest pending', async () => {
  const { store, tid } = await setup({ teams: 6 })
  for (let i = 1; i <= 4; i++) await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: `Walk ${i}`, player1: `W${i}a`, player2: `W${i}b` })
  const pendingBefore = await store.select<TeamRow>('sp_teams', { tournament_id: tid, status: 'pending' })
  assert.equal(pendingBefore.length, 2) // 6 approved + 2 pending fill 8, the rest waitlist
  const r = await S.approveAllTeams(store, owner, { tournamentId: tid })
  assert.equal(r.approved, 2)
  assert.equal((await store.select<TeamRow>('sp_teams', { tournament_id: tid, status: 'approved' })).length, 8)
  await expectReject(S.approveAllTeams(store, owner, { tournamentId: tid }), 409)
  const mp = await S.addStaff(store, owner, { tournamentId: tid, name: 'Sup', role: 'supervisor' })
  const sup = await S.resolveSession(store, (await S.redeemInvite(store, mp.invite.token)).sessionToken)
  await expectReject(S.approveAllTeams(store, sup, { tournamentId: tid }), 403)
})

test('custom rules text is saved, sanitized, and does not change scoring settings', async () => {
  const { store, tid } = await setup({ teams: 2 })
  await S.updateTournament(store, owner, { tournamentId: tid, patch: { rules: { customSections: [{ title: 'House', items: ['No phones on the table', '', 42] }, { title: '', items: [] }] } } })
  const [t] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  const { normalizeRules, displayRules } = await import('../../src/lib/spades/rules.ts')
  const r = normalizeRules(t.rules)
  assert.deepEqual(r.customSections, [{ title: 'House', items: ['No phones on the table'] }])
  assert.equal(displayRules(r)[0].title, 'House')
  assert.equal(r.targetDefault, 250)
  await S.updateTournament(store, owner, { tournamentId: tid, patch: { rules: { customSections: [] } } })
  const [t2] = await store.select<TournamentRow>('sp_tournaments', { id: tid })
  assert.ok(displayRules(normalizeRules(t2.rules)).length > 3)
})

test('the registering player is the captain scorekeeper and can run a captain-mode hand', async () => {
  const { store, tid } = await setup({ teams: 0, rules: { biddingMode: 'captain' } })
  const caps: S.Actor[] = []
  for (let i = 1; i <= 8; i++) {
    const r = await S.registerTeam(store, S.PUBLIC, { tournamentId: tid, name: `Reg ${i}`, player1: `R${i}a`, player2: `R${i}b` })
    assert.equal(r.status, 'pending')
    const sess = await S.createSession(store, { kind: 'player', tournamentId: tid, playerId: r.captainPlayerId, staffId: null, invitationId: null, ttlMs: S.PLAYER_SESSION_MS })
    const a = await S.resolveSession(store, sess.sessionToken)
    assert.equal(a.kind === 'player' && a.isCaptain, true)
    caps.push(a)
  }
  await S.approveAllTeams(store, owner, { tournamentId: tid })
  await S.setRosterLock(store, owner, { tournamentId: tid, locked: true })
  await S.publishBracket(store, owner, { tournamentId: tid, published: true })
  await S.startRound(store, owner, { tournamentId: tid, round: 1 })
  const [m] = await store.select<MatchRow>('sp_matches', { tournament_id: tid, round: 1, slot: 0 })
  const capOf = (teamId: string) => caps.find(c => c.kind === 'player' && c.teamId === teamId)!
  const ca = capOf(m.team_a_id!), cb = capOf(m.team_b_id!)
  const pa = await store.select<any>('sp_players', { team_id: m.team_a_id! })
  const pb = await store.select<any>('sp_players', { team_id: m.team_b_id! })
  const [h] = await store.select<HandRow>('sp_hands', { match_id: m.id, status: 'bidding' })
  await S.submitBids(store, ca, { handId: h.id, bids: pa.map((p: any) => ({ playerId: p.id, bid: 3 })) })
  await S.submitBids(store, cb, { handId: h.id, bids: pb.map((p: any) => ({ playerId: p.id, bid: 2 })) })
  await S.reportBooks(store, ca, { handId: h.id, booksA: 8, booksB: 5 })
  await S.reportBooks(store, cb, { handId: h.id, booksA: 8, booksB: 5 })
  await S.approveHand(store, ca, { handId: h.id })
  await S.approveHand(store, cb, { handId: h.id })
  const mm = (await store.select<MatchRow>('sp_matches', { id: m.id }))[0]
  assert.equal(mm.score_a, 62)
  assert.equal(mm.score_b, 41)
})
