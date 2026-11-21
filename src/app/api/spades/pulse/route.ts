import { NextRequest } from 'next/server'
import { errorResponse, json, store } from '@/lib/spades/http'
import type { TournamentRow } from '@/lib/spades/types'
import { autoStartDue } from '@/lib/spades/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Tiny change detector polled every couple of seconds by every open screen.
// The pulse is a random value replaced on every write, so clients refetch the
// full state only when something actually changed.
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('t') || ''
    if (!slug) return json({ error: 't is required' }, 400)
    const s = store()
    const rows = await s.select<TournamentRow>('sp_tournaments', { slug }, { limit: 1 })
    if (!rows[0]) return json({ error: 'Not found' }, 404)
    // Scheduled games begin on their own once their start time passes.
    if (rows[0].auto_start && rows[0].bracket_published) {
      const started = await autoStartDue(s, rows[0])
      if (started) {
        const fresh = await s.select<TournamentRow>('sp_tournaments', { id: rows[0].id }, { limit: 1 })
        return json({ pulse: fresh[0]?.pulse || rows[0].pulse, serverNow: s.now().toISOString() })
      }
    }
    return json({ pulse: rows[0].pulse, serverNow: s.now().toISOString() })
  } catch (err) {
    return errorResponse(err)
  }
}
