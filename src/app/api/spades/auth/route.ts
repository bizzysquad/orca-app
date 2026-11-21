import { NextRequest } from 'next/server'
import {
  actorFrom, checkWrite, clearSessionCookie, clientKey, directorPassword, errorResponse, json, passwordMatches, readJson,
  setSessionCookie, store, SESSION_COOKIE,
} from '@/lib/spades/http'
import { OWNER_SESSION_MS, audit, createSession, previewInvite, rateLimit, recordAttempt, redeemInvite, revokeSession } from '@/lib/spades/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const blocked = checkWrite(req)
  if (blocked) return blocked
  try {
    const s = store()
    const body = await readJson(req)
    const key = clientKey(req)

    if (body.action === 'login') {
      if (!directorPassword()) return json({ error: 'Director password is not configured on the server' }, 503)
      await rateLimit(s, key, 'login_fail', 8, 15 * 60 * 1000)
      if (!passwordMatches(body.password)) {
        await recordAttempt(s, key, 'login_fail')
        return json({ error: 'Wrong password' }, 401)
      }
      const sess = await createSession(s, { kind: 'owner', tournamentId: null, playerId: null, staffId: null, invitationId: null, ttlMs: OWNER_SESSION_MS })
      await audit(s, { kind: 'owner', name: 'Tournament Director' }, { tournamentId: null, action: 'auth.director_login' })
      const res = json({ ok: true })
      setSessionCookie(res, sess.sessionToken, sess.expiresAt)
      return res
    }

    if (body.action === 'preview' || body.action === 'redeem') {
      await rateLimit(s, key, 'invite', 40, 10 * 60 * 1000)
      await recordAttempt(s, key, 'invite')
      const token = typeof body.token === 'string' ? body.token.trim() : ''
      if (body.action === 'preview') {
        const p = await previewInvite(s, token)
        // Lets the join page say "you're already signed in" on a reused link.
        const current = await actorFrom(req, s)
        const signedInAsThis =
          (current.kind === 'player' && current.playerId === p.playerId) || (current.kind === 'staff' && current.staffId === p.staffId)
        return json({ status: p.status, kind: p.kind, name: p.name, teamName: p.teamName, role: p.role, tournamentName: p.tournamentName, tournamentSlug: p.tournamentSlug, signedInAsThis })
      }
      const r = await redeemInvite(s, token)
      const res = json({ ok: true, kind: r.preview.kind, tournamentSlug: r.preview.tournamentSlug })
      setSessionCookie(res, r.sessionToken, r.expiresAt)
      return res
    }

    if (body.action === 'logout') {
      const tok = req.cookies.get(SESSION_COOKIE)?.value
      if (tok) await revokeSession(s, tok)
      const res = json({ ok: true })
      clearSessionCookie(res)
      return res
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return errorResponse(err)
  }
}
