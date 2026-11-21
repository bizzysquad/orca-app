import { NextRequest } from 'next/server'
import { actorFrom, errorResponse, json, store } from '@/lib/spades/http'
import { isDirector, isStaff } from '@/lib/spades/service'
import { adminState, findTournament, loadBundle, matchDetail, pastChampions, playerState, publicState, supervisorState, viewerInfo } from '@/lib/spades/views'
import type { TournamentRow } from '@/lib/spades/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// One read endpoint for every screen. ?view=public|play|match|supervisor|admin
export async function GET(req: NextRequest) {
  try {
    const s = store()
    const actor = await actorFrom(req, s)
    const sp = req.nextUrl.searchParams
    const view = sp.get('view') || 'public'
    let slug = sp.get('t')
    let t: TournamentRow | null = null
    if (slug) t = await findTournament(s, slug)
    else if ((actor.kind === 'player' || actor.kind === 'staff')) {
      const rows = await s.select<TournamentRow>('sp_tournaments', { id: actor.tournamentId }, { limit: 1 })
      t = rows[0] || null
    }
    if (!t && view === 'match' && sp.get('match')) {
      const m = await s.select<any>('sp_matches', { id: sp.get('match')! }, { limit: 1 })
      if (m[0]) t = (await s.select<TournamentRow>('sp_tournaments', { id: m[0].tournament_id }, { limit: 1 }))[0] || null
    }
    if (!t) t = await findTournament(s, null)
    if (!t) return json({ error: 'No tournament found', viewer: viewerInfo(actor, null) }, 404)

    const now = s.now()
    const b = await loadBundle(s, t)
    const viewer = viewerInfo(actor, b)
    const tournaments = actor.kind === 'owner'
      ? (await s.select<TournamentRow>('sp_tournaments', {}, { order: [{ col: 'created_at', asc: false }], limit: 100 })).map(x => ({ slug: x.slug, name: x.name, status: x.status }))
      : undefined

    if (view === 'public') {
      const past = sp.get('winners') === '1' ? await pastChampions(s, t.id) : undefined
      return json({ ...publicState(b, now), viewer, pastChampions: past })
    }
    if (view === 'play') return json({ ...publicState(b, now), viewer, me: playerState(b, actor, now) })
    if (view === 'match') {
      const id = sp.get('match') || ''
      const d = matchDetail(b, actor, id, now)
      if (!d) return json({ error: 'Match not found', viewer }, 404)
      return json({ ...d, viewer: { ...viewer, ...d.viewer } })
    }
    if (view === 'supervisor') {
      if (!isStaff(actor, t.id)) return json({ error: 'Staff sign in required', viewer, tournament: { slug: t.slug, name: t.name } }, 401)
      return json(supervisorState(b, actor, now))
    }
    if (view === 'admin') {
      if (!isDirector(actor, t.id)) return json({ error: 'Director sign in required', viewer, tournament: { slug: t.slug, name: t.name } }, 401)
      return json({ ...(await adminState(s, b, actor, now)), tournaments })
    }
    return json({ error: 'Unknown view' }, 400)
  } catch (err) {
    return errorResponse(err)
  }
}
