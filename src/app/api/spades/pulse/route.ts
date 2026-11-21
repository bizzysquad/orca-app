import { NextRequest } from 'next/server'
import { errorResponse, json, store } from '@/lib/spades/http'
import type { TournamentRow } from '@/lib/spades/types'

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
    return json({ pulse: rows[0].pulse, serverNow: s.now().toISOString() })
  } catch (err) {
    return errorResponse(err)
  }
}
