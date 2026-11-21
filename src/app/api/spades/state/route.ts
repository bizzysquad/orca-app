import { NextRequest } from 'next/server'
import { actorFrom, errorResponse, json, store } from '@/lib/spades/http'
import { actAsPlayer, isDirector, isStaff } from '@/lib/spades/service'
import { activityState, adminState, findTournament, loadBundle, matchDetail, pastChampions, playerState, publicEvents, publicLiveGames, publicState, supervisorState, viewerInfo } from '@/lib/spades/views'
import type { TournamentRow } from '@/lib/spades/types'
import { normalizeRules } from '@/lib/spades/rules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// One read endpoint for every screen. ?view=public|play|match|supervisor|admin
export async function GET(req: NextRequest) {
  try {
    const s = store()
    let actor = await actorFrom(req, s)
    const sp = req.nextUrl.searchParams
    // Test Mode: director previews exactly what a simulated player sees.
    const as = sp.get('as')
    if (as) actor = await actAsPlayer(s, actor, as)
    const view = sp.get('view') || 'public'
    if (view === 'activity') {
      if (actor.kind !== 'owner') return json({ error: 'Owner sign in required' }, 401)
      return json({ serverNow: s.now().toISOString(), ...(await activityState(s, s.now())) })
    }
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
    if (!t) {
      // No event posted yet: every screen still works (create one, start a game, winners).
      if (view === 'match') return json({ error: 'Match not found', viewer: viewerInfo(actor, null) }, 404)
      if (view === 'admin' && actor.kind !== 'owner') return json({ error: 'Director sign in required', viewer: viewerInfo(actor, null) }, 401)
      const tournaments = actor.kind === 'owner'
        ? (await s.select<TournamentRow>('sp_tournaments', {}, { order: [{ col: 'created_at', asc: false }], limit: 100 })).map(x => ({ id: x.id, slug: x.slug, name: x.name, status: x.status, eventType: x.event_type || 'tournament', isTest: !!x.is_test, isFeatured: x.is_featured, startsAt: x.starts_at, teamLimit: x.team_limit || x.capacity, registrationOpen: x.registration_open, rosterLocked: x.roster_locked, rules: normalizeRules(x.rules) }))
        : undefined
      const liveGames = sp.get('games') === '1' ? await publicLiveGames(s) : undefined
      return json({ noEvent: true, serverNow: s.now().toISOString(), viewer: viewerInfo(actor, null), events: [], tournaments, liveGames })
    }

    const now = s.now()
    const b = await loadBundle(s, t)
    const viewer = viewerInfo(actor, b)
    const tournaments = actor.kind === 'owner'
      ? (await s.select<TournamentRow>('sp_tournaments', {}, { order: [{ col: 'created_at', asc: false }], limit: 100 })).map(x => ({ id: x.id, slug: x.slug, name: x.name, status: x.status, eventType: x.event_type || 'tournament', isTest: !!x.is_test, isFeatured: x.is_featured, startsAt: x.starts_at, teamLimit: x.team_limit || x.capacity, registrationOpen: x.registration_open, rosterLocked: x.roster_locked, rules: normalizeRules(x.rules) }))
      : undefined

    if (view === 'public') {
      const past = sp.get('winners') === '1' ? await pastChampions(s, t.id) : undefined
      const events = sp.get('events') === '1' ? await publicEvents(s) : undefined
      const liveGames = sp.get('games') === '1' ? await publicLiveGames(s) : undefined
      return json({ ...publicState(b, now), viewer, pastChampions: past, events, liveGames })
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
