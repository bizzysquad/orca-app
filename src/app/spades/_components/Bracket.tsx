'use client'

import Link from 'next/link'
import { StatusChip } from './ui'

// Before the draw: a preliminary bracket filled in sign up order, so people
// can follow along as teams register. The real matchups are drawn at random
// when the director locks the roster.
export function provisionalData(data: any) {
  const T = data.tournament
  const reg: any[] = data.registered || []
  const rounds: number = T.rounds
  const matches: any[] = []
  for (let r = 1; r <= rounds; r++) {
    const n = T.capacity / 2 ** r
    const roundName = r === rounds ? 'Championship' : r === rounds - 1 ? 'Semifinals' : r === rounds - 2 ? 'Quarterfinals' : `Round ${r}`
    for (let i = 0; i < n; i++) {
      matches.push({
        id: `prov-${r}-${i}`, round: r, slot: i, roundName, status: 'pending', label: 'Not set', table: null,
        teamA: r === 1 ? reg[2 * i]?.id ?? null : null, teamB: r === 1 ? reg[2 * i + 1]?.id ?? null : null,
        winner: null, resultKind: null, scoreA: 0, scoreB: 0, current: null,
      })
    }
  }
  return { ...data, teams: reg.map(t => ({ id: t.id, name: t.name, seed: null })), matches, provisional: true }
}

// Events without a bracket: a list of games plus the standings.
export function GamesList({ data, big = false, linkMatches = true }: { data: any; big?: boolean; linkMatches?: boolean }) {
  const teams = new Map<string, any>((data.teams || []).map((t: any) => [t.id, t]))
  const games = (data.provisional ? [] : data.matches || []).slice().sort((a: any, b: any) => {
    const rank = (m: any) => (m.status === 'live' || m.status === 'paused' ? 0 : m.status === 'ready' ? 1 : m.status === 'completed' ? 2 : 3)
    return rank(a) - rank(b) || a.slot - b.slot
  })
  const results: any[] = data.results || []
  return (
    <div className="grid gap-4">
      {games.length === 0 ? (
        <div className="sp-card p-5 text-center" style={{ color: 'var(--sp-muted)' }}>Games show up here as the director sets them up.</div>
      ) : (
        <div className={`grid gap-3 ${big ? '' : 'sm:grid-cols-2'}`}>
          {games.map((m: any) => {
            const card = (
              <div className="sp-card p-3" style={m.status === 'live' ? { borderColor: 'var(--sp-green)' } : undefined}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="sp-label">{m.roundName}{m.table ? ` · Table ${m.table}` : ''}</span>
                  <StatusChip label={m.label} />
                </div>
                {(['a', 'b'] as const).map(side => {
                  const id = side === 'a' ? m.teamA : m.teamB
                  const won = m.winner && m.winner === id
                  return (
                    <div key={side} className="flex items-center justify-between gap-2 py-1" style={{ opacity: m.winner && !won ? 0.5 : 1 }}>
                      <span className={`font-bold truncate ${big ? 'text-2xl' : ''}`} style={{ color: won ? 'var(--sp-gold)' : undefined }}>{teams.get(id)?.name || 'TBD'}</span>
                      {!['pending', 'ready'].includes(m.status) && <span className={`sp-display sp-num ${big ? 'text-4xl' : 'text-xl'}`}>{side === 'a' ? m.scoreA : m.scoreB}</span>}
                    </div>
                  )
                })}
                {m.status === 'ready' && m.scheduledAt && <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>Starts {new Date(m.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>}
                {m.gamesToWin > 1 && !['pending', 'ready'].includes(m.status) && <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>Games {m.gamesA} to {m.gamesB}</div>}
              </div>
            )
            return linkMatches && m.teamA && m.teamB ? <Link key={m.id} href={`/spades/match/${m.id}`}>{card}</Link> : <div key={m.id}>{card}</div>
          })}
        </div>
      )}
      {results.length > 0 && (
        <section className="sp-card p-4">
          <h3 className="sp-display text-xl mb-2">Standings</h3>
          <div className="sp-scroll">
            <table className="sp-table">
              <thead><tr><th>Team</th><th>Won</th><th>Lost</th><th>Points</th></tr></thead>
              <tbody>{results.map((r: any) => <tr key={r.teamId}><td className="font-bold">{r.team}</td><td className="sp-num">{r.wins}</td><td className="sp-num">{r.losses}</td><td className="sp-num">{r.points}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export function Bracket({ data, big = false, linkMatches = true }: { data: any; big?: boolean; linkMatches?: boolean }) {
  if (data.tournament?.useBracket === false) return <GamesList data={data} big={big} linkMatches={linkMatches} />
  if (data.provisional) return <><div className="sp-banner sp-banner-info text-sm mb-3">Preliminary bracket: teams appear as they register. The real matchups are drawn at random when registration closes.</div><BracketGrid data={data} big={big} linkMatches={linkMatches} /></>
  return <BracketGrid data={data} big={big} linkMatches={linkMatches} />
}

function BracketGrid({ data, big = false, linkMatches = true }: { data: any; big?: boolean; linkMatches?: boolean }) {
  const teams = new Map<string, any>((data.teams || []).map((t: any) => [t.id, t]))
  const rounds: number = data.tournament.rounds
  const byRound = Array.from({ length: rounds }, (_, i) => (data.matches || []).filter((m: any) => m.round === i + 1).sort((a: any, b: any) => a.slot - b.slot))
  const name = (id: string | null, m: any, side: 'a' | 'b') => {
    if (id) return teams.get(id)?.name || 'Team'
    if (m.resultKind === 'bye') return 'Bye'
    if (data.provisional) return m.round === 1 ? 'Open spot' : 'Winner advances'
    return m.round === 1 ? 'Bye' : 'Winner advances'
  }
  return (
    <div className="grid gap-4 sp-bracket" style={{ ['--rounds' as any]: rounds }}>
      {byRound.map((ms, i) => (
        <div key={i} className="grid gap-3 content-around">
          <h3 className={`sp-display ${big ? 'text-3xl' : 'text-lg'}`} style={{ color: 'var(--sp-gold)' }}>{ms[0]?.roundName || `Round ${i + 1}`}</h3>
          {ms.map((m: any) => {
            const box = (
              <div className="sp-card p-3" style={m.status === 'live' ? { borderColor: 'var(--sp-green)' } : m.label === 'Disputed' ? { borderColor: 'var(--sp-red)' } : undefined}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="sp-label">{m.table ? `Table ${m.table}` : `Match ${m.slot + 1}`}</span>
                  {m.resultKind !== 'bye' && !data.provisional && <StatusChip label={m.label} />}
                </div>
                {(['a', 'b'] as const).map(side => {
                  const id = side === 'a' ? m.teamA : m.teamB
                  const won = m.winner && m.winner === id
                  const lost = m.winner && id && m.winner !== id
                  return (
                    <div key={side} className="flex items-center justify-between gap-2 py-1" style={{ opacity: lost ? 0.5 : 1 }}>
                      <span className={`font-bold truncate ${big ? 'text-2xl' : ''}`} style={{ color: won ? 'var(--sp-gold)' : undefined }}>
                        {teams.get(id)?.seed ? <span className="sp-num text-xs mr-1" style={{ color: 'var(--sp-dim)' }}>{teams.get(id).seed}</span> : null}
                        {name(id, m, side)}
                      </span>
                      {m.resultKind !== 'bye' && id && m.status !== 'pending' && m.status !== 'ready' && (
                        <span className={`sp-display sp-num ${big ? 'text-4xl' : 'text-xl'}`}>{side === 'a' ? m.scoreA : m.scoreB}</span>
                      )}
                    </div>
                  )
                })}
                {m.current && m.status === 'live' && (
                  <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>
                    Hand {m.current.handNumber}{m.current.isTiebreak ? ' (tiebreaker)' : ''}{m.current.bidA !== null ? ` · bids ${m.current.bidA} and ${m.current.bidB}` : ''} · to {m.target}
                  </div>
                )}
                {m.resultKind && m.resultKind !== 'played' && m.resultKind !== 'bye' && <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>{m.resultKind === 'dq' ? 'Disqualification' : 'Forfeit'}</div>}
              </div>
            )
            return linkMatches && m.teamA && m.teamB && m.resultKind !== 'bye' ? (
              <Link key={m.id} href={`/spades/match/${m.id}`} aria-label={`Match details: ${name(m.teamA, m, 'a')} vs ${name(m.teamB, m, 'b')}`}>{box}</Link>
            ) : <div key={m.id}>{box}</div>
          })}
        </div>
      ))}
    </div>
  )
}
