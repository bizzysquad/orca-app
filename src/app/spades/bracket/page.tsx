'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bracket, provisionalData } from '../_components/Bracket'
import { useSpades } from '../_components/useSpades'
import { ErrorBox, Loading, Shell } from '../_components/ui'

function BracketView() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, reload } = useSpades<any>('public', { t, events: '1' })
  if (loading && !data) return <Shell active="bracket"><Loading /></Shell>
  if (!data?.tournament) return <Shell active="bracket" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const champ = T.championTeamId ? data.teams.find((x: any) => x.id === T.championTeamId) : null
  const events: any[] = data.events || []
  const playing: any[] = data.registered || []
  return (
    <Shell active="bracket" online={online} viewer={data.viewer}>
      <div className="sp-wrap grid gap-4">
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
                </Link>
              ))}
            </div>
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
            <h1 className="sp-display text-4xl mt-1">{T.useBracket ? 'Live bracket' : 'Games'}</h1>
          </div>
          <div className="flex gap-2">
            {T.registrationOpen && !T.rosterLocked && <Link href={`/spades/register?t=${T.slug}`} className="sp-btn sp-btn-sm sp-btn-gold">Register</Link>}
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
                  {x.name}{x.status !== 'approved' ? ' (pending)' : ''}
                </span>
              ))}
            </div>
          ) : <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>No teams yet. Be the first to register.</p>}
        </section>

        {T.bracketPublished && data.matches.length ? <Bracket data={data} /> : <Bracket data={provisionalData(data)} linkMatches={false} />}
        <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Scores update live as hands are scored.</p>
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><BracketView /></Suspense>
}
