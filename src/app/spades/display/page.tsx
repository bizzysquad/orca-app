'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { Bracket } from '../_components/Bracket'
import { useSpades } from '../_components/useSpades'
import { ConnectionBadge, MatchTimer, SpadeIcon, StatusChip } from '../_components/ui'

// Read only TV / projector view. Public data only. Reconnects on its own and
// does a full reload every 30 minutes so a long running screen stays fresh.
function Display() {
  const t = useSearchParams().get('t')
  const { data, online, serverNow } = useSpades<any>('public', { t })
  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 30 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])
  if (!data?.tournament) {
    return <div className="min-h-screen grid place-items-center"><div className="text-center"><div className="sp-vinyl mx-auto mb-4" style={{ width: 120, height: 120 }} /><p className="sp-label">Connecting</p></div></div>
  }
  const T = data.tournament
  const name = (id: string | null) => data.teams.find((x: any) => x.id === id)?.name || 'TBD'
  const champ = T.championTeamId ? name(T.championTeamId) : null
  const active = data.matches.filter((m: any) => ['live', 'paused', 'completed'].includes(m.status))
  const upcoming = data.matches.filter((m: any) => m.status === 'ready')
  const currentRound = active[0]?.roundName || upcoming[0]?.roundName || (champ ? 'Complete' : '')
  return (
    <div className="min-h-screen p-6 lg:p-10 grid gap-8" style={{ gridTemplateRows: 'auto 1fr auto' }}>
      <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <span className="inline-grid place-items-center rounded-full" style={{ width: 96, height: 96, background: 'var(--sp-gold)', color: 'var(--sp-wine)' }}><SpadeIcon size={56} /></span>
          <div>
            <p className="sp-label text-base" style={{ color: 'var(--sp-gold)' }}>DJ Maskoff presents</p>
            <h1 className="sp-display" style={{ fontSize: 'clamp(36px, 5vw, 84px)' }}>{T.name.replace(/^DJ Maskoff Presents\s*/i, '')}</h1>
          </div>
        </div>
        <div className="text-right grid gap-2 justify-items-end">
          <ConnectionBadge online={online} />
          {currentRound && <span className="sp-display text-3xl" style={{ color: 'var(--sp-gold)' }}>{currentRound}</span>}
        </div>
      </header>

      {champ ? (
        <section className="grid place-items-center text-center">
          <div>
            <p className="sp-label text-2xl" style={{ color: 'var(--sp-gold)' }}>Your champions</p>
            <p className="sp-display" style={{ fontSize: 'clamp(64px, 12vw, 200px)' }}>{champ}</p>
            <p className="sp-serif italic text-4xl mt-4">{T.award || 'Championship trophy'}</p>
          </div>
        </section>
      ) : (
        <section className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 grid gap-5">
            {active.length === 0 && upcoming.length === 0 && <p className="sp-display text-4xl" style={{ color: 'var(--sp-muted)' }}>{T.bracketPublished ? 'Next round coming up' : 'Bracket drawn after check in'}</p>}
            {active.map((m: any) => {
              const lead = m.scoreA === m.scoreB ? null : m.scoreA > m.scoreB ? 'a' : 'b'
              return (
                <div key={m.id} className="sp-card p-6" style={m.status === 'live' ? { borderColor: 'var(--sp-green)' } : undefined}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="sp-display text-3xl">Table {m.table}</span>
                    <div className="flex items-center gap-4"><StatusChip label={m.label} /><MatchTimer m={m} serverNow={serverNow} big /></div>
                  </div>
                  {(['a', 'b'] as const).map(side => (
                    <div key={side} className="flex items-center justify-between gap-4">
                      <span className="font-black truncate" style={{ fontSize: 'clamp(28px, 3vw, 52px)', color: lead === side ? 'var(--sp-gold)' : undefined }}>{name(side === 'a' ? m.teamA : m.teamB)}</span>
                      <span className="sp-display sp-num" style={{ fontSize: 'clamp(48px, 6vw, 110px)' }}>{side === 'a' ? m.scoreA : m.scoreB}</span>
                    </div>
                  ))}
                  <div className="text-xl mt-2" style={{ color: 'var(--sp-muted)' }}>
                    {m.current ? `Hand ${m.current.handNumber}${m.current.isTiebreak ? ' · tiebreaker' : ''}` : ''}{m.current?.bidA !== null && m.current?.bidA !== undefined ? ` · bids ${m.current.bidA} and ${m.current.bidB}` : ''} · playing to {m.target}
                  </div>
                </div>
              )
            })}
            {upcoming.length > 0 && (
              <div className="sp-card p-5">
                <p className="sp-label text-base mb-2">Up next</p>
                {upcoming.map((m: any) => <p key={m.id} className="text-3xl font-black">{name(m.teamA)} <span style={{ color: 'var(--sp-gold)' }}>vs</span> {name(m.teamB)}{m.table ? <span className="text-xl" style={{ color: 'var(--sp-muted)' }}> · table {m.table}</span> : null}</p>)}
              </div>
            )}
          </div>
          <div className="lg:col-span-2">{T.bracketPublished && <Bracket data={data} linkMatches={false} />}</div>
        </section>
      )}
      <footer className="flex justify-between text-lg" style={{ color: 'var(--sp-dim)' }}>
        <span>{T.venue} · orcafin.app/spades</span>
        <span>No gambling or wagering. Trophy for recognition only.</span>
      </footer>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Display /></Suspense>
}
