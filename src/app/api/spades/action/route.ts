import { NextRequest } from 'next/server'
import { actorFrom, checkWrite, clientKey, errorResponse, json, readJson, setSessionCookie, store } from '@/lib/spades/http'
import * as S from '@/lib/spades/service'
import type { Store } from '@/lib/spades/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Handler = (s: Store, a: S.Actor, b: Record<string, any>) => Promise<unknown>

// Every write in Spades HQ. The handler only forwards the body; all
// permission checks, scope checks and validation live in service.ts.
const ACTIONS: Record<string, Handler> = {
  // gameplay
  bid: (s, a, b) => S.submitBids(s, a, { handId: b.handId, bids: b.bids }),
  report: (s, a, b) => S.reportBooks(s, a, { handId: b.handId, booksA: b.booksA, booksB: b.booksB, teamId: b.teamId }),
  approve: (s, a, b) => S.approveHand(s, a, { handId: b.handId }),
  dispute: (s, a, b) => S.raiseDispute(s, a, { matchId: b.matchId, handId: b.handId, kind: b.kind, reason: b.reason }),
  // supervisor
  resolve: (s, a, b) => S.resolveDispute(s, a, { disputeId: b.disputeId, resolution: b.resolution, dismiss: !!b.dismiss, booksA: b.booksA, booksB: b.booksB, renegeTeamId: b.renegeTeamId, bids: b.bids }),
  correct: (s, a, b) => S.correctHand(s, a, { handId: b.handId, reason: b.reason, booksA: b.booksA, booksB: b.booksB, renegeTeamId: b.renegeTeamId, bids: b.bids }),
  voidHand: (s, a, b) => S.voidHand(s, a, { handId: b.handId, reason: b.reason }),
  pause: (s, a, b) => S.pauseMatch(s, a, { matchId: b.matchId, reason: b.reason }),
  resume: (s, a, b) => S.resumeMatch(s, a, { matchId: b.matchId }),
  verifyCompletion: (s, a, b) => S.verifyCompletion(s, a, { matchId: b.matchId }),
  ready: (s, a, b) => S.setReady(s, a, { matchId: b.matchId, ready: !!b.ready, teamId: b.teamId }),
  checkIn: (s, a, b) => S.checkInTeam(s, a, { teamId: b.teamId, present: !!b.present }),
  // director
  startMatch: (s, a, b) => S.startMatch(s, a, { matchId: b.matchId }),
  startRound: (s, a, b) => S.startRound(s, a, { tournamentId: b.tournamentId, round: Number(b.round) }),
  finalize: (s, a, b) => S.finalizeMatch(s, a, { matchId: b.matchId }),
  forfeit: (s, a, b) => S.forfeitMatch(s, a, { matchId: b.matchId, winnerTeamId: b.winnerTeamId, kind: b.kind, reason: b.reason }),
  resetMatch: (s, a, b) => S.resetMatch(s, a, { matchId: b.matchId, reason: b.reason }),
  editMatch: (s, a, b) => S.editMatch(s, a, { matchId: b.matchId, target: b.target, timeLimitMin: b.timeLimitMin, tableId: b.tableId, scheduledAt: b.scheduledAt }),
  scheduleRound: (s, a, b) => S.scheduleRound(s, a, { tournamentId: b.tournamentId, round: Number(b.round), scheduledAt: b.scheduledAt ?? null, autoStart: b.autoStart }),
  endNow: (s, a, b) => S.endMatchNow(s, a, { matchId: b.matchId, reason: b.reason }),
  bidControl: (s, a, b) => S.setBidControl(s, a, { teamId: b.teamId, control: b.control }),
  partnerCode: (s, a) => S.issuePartnerCode(s, a),
  createTest: (s, a, b) => S.createTestEvent(s, a, { gamesToWin: b.gamesToWin, target: b.target, control: b.control }),
  deleteTest: (s, a, b) => S.deleteTestEvent(s, a, { tournamentId: b.tournamentId }),
  createTournament: (s, a, b) => S.createTournament(s, a, { name: b.name, slug: b.slug, teamLimit: b.teamLimit, capacity: b.capacity, startsAt: b.startsAt, venue: b.venue, address: b.address, eventType: b.eventType, gamesToWin: b.gamesToWin, targetDefault: b.targetDefault, targetFinal: b.targetFinal }),
  updateTournament: (s, a, b) => S.updateTournament(s, a, { tournamentId: b.tournamentId, patch: b.patch }),
  rosterLock: (s, a, b) => S.setRosterLock(s, a, { tournamentId: b.tournamentId, locked: !!b.locked, generate: b.generate }),
  addTeam: (s, a, b) => S.registerTeam(s, a, { tournamentId: b.tournamentId, name: b.name, player1: b.player1, player2: b.player2, captainSeat: b.captainSeat, contact: b.contact }),
  updateTeam: (s, a, b) => S.updateTeam(s, a, { teamId: b.teamId, name: b.name, player1: b.player1, player2: b.player2, captainSeat: b.captainSeat, contact: b.contact }),
  teamStatus: (s, a, b) => S.setTeamStatus(s, a, { teamId: b.teamId, status: b.status }),
  approveAll: (s, a, b) => S.approveAllTeams(s, a, { tournamentId: b.tournamentId }),
  removeTeam: (s, a, b) => S.removeTeam(s, a, { teamId: b.teamId }),
  generateBracket: (s, a, b) => S.generateBracket(s, a, { tournamentId: b.tournamentId, mode: b.mode === 'manual' ? 'manual' : 'random', order: b.order }),
  publishBracket: (s, a, b) => S.publishBracket(s, a, { tournamentId: b.tournamentId, published: !!b.published }),
  addStaff: (s, a, b) => S.addStaff(s, a, { tournamentId: b.tournamentId, name: b.name, role: b.role, contact: b.contact }),
  updateStaff: (s, a, b) => S.updateStaff(s, a, { staffId: b.staffId, active: b.active, role: b.role }),
  setTables: (s, a, b) => S.setTableCount(s, a, { tournamentId: b.tournamentId, count: Number(b.count) }),
  assignSupervisor: (s, a, b) => S.assignTableSupervisor(s, a, { tableId: b.tableId, staffId: b.staffId || null }),
  invite: (s, a, b) => S.issueInvite(s, a, { playerId: b.playerId, staffId: b.staffId, revokeSessions: !!b.revokeSessions }),
  teamInvites: (s, a, b) => S.issueTeamInvites(s, a, { teamId: b.teamId, revokeSessions: !!b.revokeSessions }),
  revokeAccess: (s, a, b) => S.revokeAccess(s, a, { playerId: b.playerId, staffId: b.staffId }),
}

export async function POST(req: NextRequest) {
  const blocked = checkWrite(req)
  if (blocked) return blocked
  try {
    const s = store()
    const body = await readJson(req)
    const name = String(body.action || '')

    // Public team sign up: rate limited per IP (venue wifi shares one IP, so
    // the limit is generous), lands as pending or waitlist. The phone that
    // registers is signed in as the team captain and becomes the team's
    // scorekeeper: it enters bids and books once the director begins the game.
    if (name === 'register') {
      const key = clientKey(req)
      await S.rateLimit(s, key, 'register', 30, 30 * 60 * 1000)
      await S.recordAttempt(s, key, 'register')
      const r = await S.registerTeam(s, S.PUBLIC, {
        tournamentId: body.tournamentId, name: body.name, player1: body.player1, player2: body.player2, captainSeat: 1, contact: body.contact, bidControl: body.bidControl,
      })
      const sess = await S.createSession(s, { kind: 'player', tournamentId: body.tournamentId, playerId: r.captainPlayerId, staffId: null, invitationId: null, ttlMs: S.PLAYER_SESSION_MS })
      const code = await S.issueRegistrantCode(s, r.captainPlayerId)
      const res = json({ ok: true, status: r.status, accessCode: code.token, name: code.name })
      setSessionCookie(res, sess.sessionToken, sess.expiresAt)
      return res
    }

    const handler = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null
    if (!handler) return json({ error: 'Unknown action' }, 400)
    let actor = await actorFrom(req, s)
    if (actor.kind === 'public') return json({ error: 'Please sign in with your access code first' }, 401)
    // Test Mode: the director acts as a simulated player of a test event.
    if (typeof body.asPlayerId === 'string' && body.asPlayerId) actor = await S.actAsPlayer(s, actor, body.asPlayerId)
    const result = await handler(s, actor, body)
    return json(result ?? { ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
