'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bracket } from './_components/Bracket'
import { useSpades } from './_components/useSpades'
import { ErrorBox, Loading, Shell, SpadeIcon, fmtDate, fmtTime } from './_components/ui'

function Landing() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, reload } = useSpades<any>('public', { t })
  if (loading && !data) return <Shell active="home"><Loading /></Shell>
  if (!data?.tournament) return <Shell active="home" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Tournament not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const champ = T.championTeamId ? data.teams.find((x: any) => x.id === T.championTeamId) : null
  const live = data.matches.filter((m: any) => m.status === 'live' || m.status === 'paused')
  const q = t ? `?t=${t}` : ''
  return (
    <Shell active="home" online={online} viewer={data.viewer}>
      <section className="sp-wrap">
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10" style={{ background: 'linear-gradient(135deg, var(--sp-wine) 0%, #2a0b13 70%)', border: '2px solid var(--sp-line)' }}>
          <div aria-hidden className="sp-vinyl absolute" style={{ width: 340, height: 340, right: -110, top: -90, opacity: 0.55 }} />
          <div aria-hidden className="absolute rounded-full" style={{ width: 92, height: 92, right: 14, top: 36, background: 'var(--sp-gold)', display: 'grid', placeItems: 'center', color: 'var(--sp-wine)' }}>
            <SpadeIcon size={46} />
          </div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>DJ Maskoff presents</p>
          <h1 className="sp-display mt-2" style={{ fontSize: 'clamp(40px, 9vw, 92px)', maxWidth: 760 }}>{T.name.replace(/^DJ Maskoff Presents\s*/i, '')}</h1>
          {T.subtitle && <p className="sp-serif italic text-xl mt-3" style={{ color: 'var(--sp-cream)' }}>{T.subtitle}</p>}
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="sp-chip sp-chip-warn">{fmtDate(T.startsAt, T.timezone)}</span>
            {T.startsAt && <span className="sp-chip sp-chip-info">{fmtTime(T.startsAt, T.timezone)} to {fmtTime(T.endsAt, T.timezone)}</span>}
            <span className="sp-chip sp-chip-live">Free to enter</span>
          </div>
          <div className="mt-5 grid gap-1">
            <div className="font-black text-lg">{T.venue}</div>
            <div style={{ color: 'var(--sp-muted)' }}>{T.address}</div>
            {T.scheduleNote && <div className="mt-1">{T.scheduleNote}</div>}
          </div>
          <div className="flex flex-wrap gap-3 mt-7">
            {T.registrationOpen && !T.rosterLocked && <Link href={`/spades/register${q}`} className="sp-btn sp-btn-gold">{data.registration.full ? 'Join the waitlist' : 'Register a team'}</Link>}
            <Link href={`/spades/bracket${q}`} className="sp-btn">Live bracket</Link>
            <Link href="/spades/play" className="sp-btn sp-btn-ghost">My table</Link>
            <Link href={`/spades/rules${q}`} className="sp-btn sp-btn-ghost">Rules</Link>
          </div>
        </div>
      </section>

      {champ && (
        <section className="sp-wrap mt-6">
          <div className="sp-card-paper p-6 text-center">
            <p className="sp-label">Champions</p>
            <h2 className="sp-display text-5xl mt-1">{champ.name}</h2>
            <p className="sp-serif italic mt-2">{T.award || 'Championship trophy'}</p>
          </div>
        </section>
      )}

      <section className="sp-wrap mt-6 grid md:grid-cols-3 gap-4">
        <div className="sp-card p-5">
          <p className="sp-label">Teams</p>
          <p className="sp-display sp-num text-5xl mt-1">{data.registration.approved}<span className="text-2xl" style={{ color: 'var(--sp-dim)' }}>/{T.capacity}</span></p>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>{data.registration.full ? 'Bracket is full' : 'Spots open'}{data.registration.waitlist ? ` · ${data.registration.waitlist} on the waitlist` : ''}</p>
        </div>
        <div className="sp-card p-5">
          <p className="sp-label">Format</p>
          <p className="font-black text-xl mt-1">Doubles · Single elimination</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>Opening rounds to {T.rules.targetDefault}. Championship to {T.rules.targetFinal}. Joker deck.</p>
        </div>
        <div className="sp-card p-5">
          <p className="sp-label">Prize</p>
          <p className="font-black text-xl mt-1">{T.award || 'Championship trophy'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>Recognition only. No buy ins, no cash, no wagering.</p>
        </div>
      </section>

      {live.length > 0 && (
        <section className="sp-wrap mt-6">
          <h2 className="sp-display text-2xl mb-3">On the tables now</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {live.map((m: any) => {
              const a = data.teams.find((x: any) => x.id === m.teamA)?.name
              const b = data.teams.find((x: any) => x.id === m.teamB)?.name
              return (
                <Link key={m.id} href={`/spades/match/${m.id}`} className="sp-card p-4 block">
                  <div className="flex justify-between mb-2"><span className="sp-label">Table {m.table} · {m.roundName}</span><span className="sp-chip sp-chip-live"><span className="sp-dot sp-dot-pulse" />{m.label}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>{a}</span><span className="sp-display sp-num">{m.scoreA}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>{b}</span><span className="sp-display sp-num">{m.scoreB}</span></div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {T.bracketPublished && data.matches.length > 0 ? (
        <section className="sp-wrap mt-8">
          <h2 className="sp-display text-2xl mb-3">Bracket</h2>
          <Bracket data={data} />
        </section>
      ) : data.teams.length > 0 && (
        <section className="sp-wrap mt-8">
          <h2 className="sp-display text-2xl mb-3">Registered teams</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.teams.map((x: any) => <div key={x.id} className="sp-card p-3 font-bold">{x.name}</div>)}
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--sp-muted)' }}>The bracket is drawn at random after registration closes.</p>
        </section>
      )}

      <section className="sp-wrap mt-8">
        <div className="sp-banner sp-banner-warn text-sm">House rule: no gambling, betting, side bets or wagering of any kind. This is a recreational tournament.</div>
      </section>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Landing /></Suspense>
}
