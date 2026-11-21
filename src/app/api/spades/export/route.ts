import { NextRequest, NextResponse } from 'next/server'
import { actorFrom, errorResponse, json, store } from '@/lib/spades/http'
import { isDirector, isStaff } from '@/lib/spades/service'
import { findTournament, loadBundle, standings } from '@/lib/spades/views'
import { roundName, totalRounds } from '@/lib/spades/bracket'
import type { AuditRow } from '@/lib/spades/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  // Stop spreadsheet formula injection from team or player names.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csv(rows: Record<string, unknown>[], headers: string[]): string {
  return [headers.join(','), ...rows.map(r => headers.map(h => csvCell(r[h])).join(','))].join('\r\n') + '\r\n'
}

export async function GET(req: NextRequest) {
  try {
    const s = store()
    const actor = await actorFrom(req, s)
    const t = await findTournament(s, req.nextUrl.searchParams.get('t'))
    if (!t) return json({ error: 'Tournament not found' }, 404)
    const kind = req.nextUrl.searchParams.get('kind') || 'teams'
    if (!isStaff(actor, t.id)) return json({ error: 'Staff sign in required' }, 401)
    if ((kind === 'teams' || kind === 'disputes') && !isDirector(actor, t.id)) return json({ error: 'Director access required' }, 403)
    const b = await loadBundle(s, t)
    const team = (id: string | null) => b.teams.find(x => x.id === id)?.name || ''
    const rounds = totalRounds(t.capacity)
    let body = ''
    if (kind === 'teams') {
      body = csv(b.teams.map(x => {
        const ps = b.players.filter(p => p.team_id === x.id).sort((p, q) => p.seat - q.seat)
        return {
          team: x.name, status: x.status, seed: x.seed, player1: ps[0]?.display_name, player2: ps[1]?.display_name,
          captain: ps.find(p => p.is_captain)?.display_name, contact: x.contact, checked_in: x.checked_in_at, registered_at: x.created_at,
        }
      }), ['team', 'status', 'seed', 'player1', 'player2', 'captain', 'contact', 'checked_in', 'registered_at'])
    } else if (kind === 'matches') {
      body = csv(b.matches.map(m => ({
        round: roundName(m.round, rounds), match: m.slot + 1, table: b.tables.find(x => x.id === m.table_id)?.number,
        team_a: team(m.team_a_id), team_b: team(m.team_b_id), score_a: m.score_a, score_b: m.score_b, bags_a: m.bags_a, bags_b: m.bags_b,
        winner: team(m.winner_team_id), result: m.result_kind, note: m.result_note, status: m.status, target: m.target,
        hands: m.hands_verified, started_at: m.started_at, completed_at: m.completed_at, finalized_at: m.finalized_at,
      })), ['round', 'match', 'table', 'team_a', 'team_b', 'score_a', 'score_b', 'bags_a', 'bags_b', 'winner', 'result', 'note', 'status', 'target', 'hands', 'started_at', 'completed_at', 'finalized_at'])
    } else if (kind === 'hands') {
      body = csv(b.ledger.map(l => {
        const m = b.matches.find(x => x.id === l.match_id)!
        return {
          round: m ? roundName(m.round, rounds) : '', match: m ? `${team(m.team_a_id)} vs ${team(m.team_b_id)}` : '', hand: l.hand_number,
          team: team(l.team_id), bid: l.bid, books: l.books, result: l.renege ? 'renege' : l.made ? 'made' : 'set', points: l.points,
          bags_earned: l.bags_earned, bag_penalty: l.bag_penalty, total: l.total_after, bags: l.bags_after,
        }
      }), ['round', 'match', 'hand', 'team', 'bid', 'books', 'result', 'points', 'bags_earned', 'bag_penalty', 'total', 'bags'])
    } else if (kind === 'standings') {
      body = csv(standings(b), ['place', 'team', 'eliminatedIn'])
    } else if (kind === 'disputes') {
      const auditRows = await s.select<AuditRow>('sp_audit', { tournament_id: t.id }, { order: [{ col: 'id' }], limit: 5000 })
      const disputes = b.disputes.map(d => ({
        type: 'dispute', at: d.created_at, match: (() => { const m = b.matches.find(x => x.id === d.match_id); return m ? `${team(m.team_a_id)} vs ${team(m.team_b_id)}` : '' })(),
        hand: b.hands.find(h => h.id === d.hand_id)?.hand_number, action: d.kind, by: d.raised_by_name, role: '', before: d.reason, after: d.resolution, reason: d.status, resolved_by: d.resolved_by_name,
      }))
      const corrections = auditRows
        .filter(a => /correction|void|forfeit|dq|reset|repropagat|winner_changed|reopened|dispute|finalize/.test(a.action))
        .map(a => ({ type: 'audit', at: a.created_at, match: a.match_id, hand: b.hands.find(h => h.id === a.hand_id)?.hand_number, action: a.action, by: a.actor_name, role: a.actor_role, before: a.before, after: a.after, reason: a.reason, resolved_by: '' }))
      body = csv([...disputes, ...corrections], ['type', 'at', 'match', 'hand', 'action', 'by', 'role', 'before', 'after', 'reason', 'resolved_by'])
    } else return json({ error: 'Unknown export' }, 400)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${t.slug}-${kind}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
