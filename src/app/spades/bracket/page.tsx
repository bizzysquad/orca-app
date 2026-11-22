'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bracket, provisionalData } from '../_components/Bracket'
import { useSpades } from '../_components/useSpades'
import { ErrorBox, Loading, NoEvents, Shell } from '../_components/ui'

function BracketView() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, reload } = useSpades<any>('public', { t, events: '1', games: '1' })
  if (loading && !data) return <Shell active="bracket"><Loading /></Shell>
  if (data?.noEvent) return <Shell active="bracket" online={online} viewer={data?.viewer}><div className="sp-wrap grid gap-4"><h1 className="sp-display text-4xl">Scores</h1><LiveGames games={data.liveGames || []} /></div><NoEvents viewer={data?.viewer} /></Shell>
  if (!data?.tournament) return <Shell active="bracket" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const champ = T.championTeamId ? data.teams.find((x: any) => x.id === T.championTeamId) : null
  const events: any[] = data.events || []
  const playing: any[] = data.registered || []
  return (
    <Shell active="bracket" online={online} viewer={data.viewer}>
      <div className="sp-wrap grid gap-4">
        <h1 className="sp-display text-4xl">Scores</h1>
        <LiveGames games={data.liveGames || []} />
        {events.length > 1 && (
          <nav aria-label="Pick an event" className="grid gap-2">
            <span className="sp-label">Pick an event</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {events.map(e => (
                <Link
                  key={e.slug}
                  href={`/spades/bracket?t=${e.slug}`}
                  aria-current={e.slug === T.slug ? 'page' : undefined}
                  className="px-4 py-3 rounded-xl font-bold whitespace-nowrap"
                  style={e.slug === T.slug ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { background: 'rgba(0,0,0,0.3)', color: 'var(--sp-muted)', border: '1px solid var(--sp-line)' }}
                >
                  {e.name}
                  {e.status === 'live' && <span className="sp-chip sp-chip-live ml-2"><span className="sp-dot sp-dot-pulse" />Live</span>}
                  {e.status !== 'live' && e.status !== 'completed' && !e.registrationOpen && <span className="sp-chip sp-chip-dim ml-2">Registration closed</span>}
                  {e.registrationOpen && <span className="sp-chip sp-chip-warn ml-2">Registration open</span>}
                </Link>
              ))}
            </div>
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
            <h2 className="sp-display text-3xl mt-1">{T.useBracket ? 'Tournament bracket' : 'Games'}</h2>
          </div>
          <div className="flex gap-2">
            {T.registrationOpen && !T.rosterLocked && <Link href="/spades#signup" className="sp-btn sp-btn-sm sp-btn-gold">Sign up</Link>}
            <Link href={`/spades/display?t=${T.slug}`} className="sp-btn sp-btn-sm sp-btn-ghost">TV mode</Link>
          </div>
        </div>
        {champ && <div className="sp-card-paper p-5 text-center"><p className="sp-label">Champions</p><p className="sp-display text-4xl">{champ.name}</p></div>}

        <section className="sp-card p-4" aria-label="Who's playing">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="sp-display text-xl">Who&apos;s playing</h2>
            <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>{data.registration.approved} of {T.teamLimit} teams</span>
          </div>
          {playing.length ? (
            <div className="flex flex-wrap gap-2">
              {playing.map(x => (
                <span key={x.id} className="px-3 py-2 rounded-lg font-bold" style={{ background: 'rgba(0,0,0,0.25)', opacity: x.status === 'approved' ? 1 : 0.6 }}>
                  {x.name}{x.solo ? ' (needs a partner)' : x.status !== 'approved' ? ' (pending)' : ''}{x.ready && !T.rosterLocked ? ' ✓' : ''}
                </span>
              ))}
            </div>
          ) : <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>No teams yet. Be the first to register.</p>}
        </section>

        {T.bracketPublished && data.matches.length ? <Bracket data={data} /> : T.rules?.firstHandBidsItself ? <p className="text-sm" style={{ color: "var(--sp-muted)" }}>The bracket is drawn when the director starts the tournament, with the teams that are ready.</p> : <Bracket data={provisionalData(data)} linkMatches={false} />}
        <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Scores update live as hands are scored.</p>
      </div>
    </Shell>
  )
}

function LiveGames({ games }: { games: any[] }) {
  if (!games.length) return null
  return (
    <section aria-label="Games being played" className="grid gap-2">
      <h2 className="sp-display text-2xl">Games being played</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map(g => (
          <div key={g.id} className="sp-card p-4" style={{ borderColor: 'var(--sp-green)' }}>
            <div className="flex justify-between mb-1"><span className="sp-label">{g.handNumber ? `Hand ${g.handNumber}` : 'Live'} · to {g.target}</span><span className="sp-chip sp-chip-live"><span className="sp-dot sp-dot-pulse" />{g.status === 'paused' ? 'Paused' : 'Live'}</span></div>
            <div className="flex justify-between font-bold text-lg"><span className="truncate">{g.teamA}</span><span className="sp-display sp-num">{g.scoreA}</span></div>
            <div className="flex justify-between font-bold text-lg"><span className="truncate">{g.teamB}</span><span className="sp-display sp-num">{g.scoreB}</span></div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><BracketView /></Suspense>
}
