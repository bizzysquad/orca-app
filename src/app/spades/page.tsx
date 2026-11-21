'use client'

import Link from 'next/link'
import { useSpades } from './_components/useSpades'
import { Loading, Shell, SpadeIcon } from './_components/ui'

// Home: three choices and the events the director posts. Nothing else.
export default function Home() {
  const { data, loading, online } = useSpades<any>('public', { events: '1' })
  if (loading && !data) return <Shell active="home"><Loading /></Shell>
  const events: any[] = data?.events || []
  const open = events.filter(e => e.registrationOpen)
  const joinHref = open.length === 1 ? `/spades/register?t=${open[0].slug}` : '/spades/register'

  return (
    <Shell active="home" online={online} viewer={data?.viewer}>
      <div className="sp-wrap-narrow grid gap-5">
        <header className="text-center pt-2">
          <span className="inline-grid place-items-center rounded-full mx-auto" style={{ width: 72, height: 72, background: 'var(--sp-gold)', color: 'var(--sp-wine)' }}><SpadeIcon size={40} /></span>
          <h1 className="sp-display mt-3" style={{ fontSize: 'clamp(40px, 10vw, 64px)' }}>Spades HQ</h1>
          <p className="sp-display text-base mt-1 tracking-widest" style={{ color: 'var(--sp-gold)' }}>Powered by DJ MASKOFF</p>
        </header>

        <nav className="grid gap-3" aria-label="What do you want to do?">
          {open.length ? (
            <Link href={joinHref} className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 68, fontSize: 20 }}>Join a tournament</Link>
          ) : (
            <span className="sp-btn sp-btn-gold sp-btn-block" aria-disabled="true" style={{ minHeight: 68, fontSize: 20, opacity: 0.5, cursor: 'not-allowed' }}>No tournament open right now</span>
          )}
          <Link href="/spades/start" className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 68, fontSize: 20 }}>Start your own game</Link>
          <Link href="/spades/bracket" className="sp-btn sp-btn-block" style={{ minHeight: 68, fontSize: 20 }}>View scores</Link>
          {data?.viewer?.kind === 'player' && <Link href="/spades/play" className="sp-btn sp-btn-ghost sp-btn-block">Back to my game</Link>}
        </nav>

        <section aria-label="Events" className="grid gap-3">
          <h2 className="sp-display text-2xl">Events</h2>
          {events.length === 0 ? (
            <div className="sp-card p-5 text-center" style={{ color: 'var(--sp-muted)' }}>No events posted right now. Check back soon.</div>
          ) : events.map(e => {
            const full = e.approved >= e.teamLimit
            const state = e.status === 'live' ? 'In progress' : e.status === 'completed' ? 'Finished' : e.registrationOpen ? (full ? 'Waitlist open' : 'Registration open') : 'Registration closed'
            return (
              <div key={e.slug} className="sp-card p-4 grid gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-black text-lg leading-tight">{e.name}</div>
                  <span className={`sp-chip ${e.status === 'live' ? 'sp-chip-live' : e.registrationOpen ? 'sp-chip-warn' : 'sp-chip-dim'}`}>{state}</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>
                  {e.teamLimit <= 2 ? (e.gamesToWin > 1 ? `Best of ${e.gamesToWin * 2 - 1}` : 'One game') : e.useBracket ? 'Tournament' : 'Open play'} · {e.approved} of {e.teamLimit} teams
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.registrationOpen && <Link href={`/spades/register?t=${e.slug}`} className="sp-btn sp-btn-sm sp-btn-gold">{full ? 'Join waitlist' : 'Register'}</Link>}
                  <Link href={`/spades/bracket?t=${e.slug}`} className="sp-btn sp-btn-sm sp-btn-ghost">Scores</Link>
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </Shell>
  )
}
