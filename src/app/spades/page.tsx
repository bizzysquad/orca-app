'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bracket, provisionalData } from './_components/Bracket'
import { useSpades } from './_components/useSpades'
import { ErrorBox, Loading, Shell, SpadeIcon } from './_components/ui'

function Landing() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, reload } = useSpades<any>('public', { t, winners: '1' })
  if (loading && !data) return <Shell active="home"><Loading /></Shell>
  if (!data?.tournament) return <Shell active="home" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Tournament not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const W = data.winners
  const past: any[] = data.pastChampions || []
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
            <span className="sp-chip sp-chip-live">Free to enter</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-7">
            {T.registrationOpen && !T.rosterLocked
              ? <Link href={`/spades/register${q}`} className="sp-btn sp-btn-gold">{data.registration.full ? 'Join the waitlist' : 'Register a team'}</Link>
              : <span className="sp-btn sp-btn-gold" aria-disabled="true" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Registration closed</span>}
            <Link href={`/spades/bracket${q}`} className="sp-btn">Live bracket</Link>
            <Link href="/spades/play" className="sp-btn sp-btn-ghost">My table</Link>
            <Link href={`/spades/rules${q}`} className="sp-btn sp-btn-ghost">Rules</Link>
          </div>
        </div>
      </section>

      <section className="sp-wrap mt-6" aria-label="Winners" id="winners">
        <h2 className="sp-display text-2xl mb-3">Winners</h2>
        {W ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="sp-card-paper p-6 text-center md:col-span-2">
              <p className="sp-label">Champions</p>
              <p className="sp-display mt-1" style={{ fontSize: 'clamp(36px, 7vw, 64px)' }}>{W.champion}</p>
              {W.championPlayers?.length > 0 && <p className="font-bold mt-1">{W.championPlayers.join(' & ')}</p>}
              <p className="sp-serif italic mt-2">{T.award || 'Championship trophy'}{W.score ? ` · won the final ${W.score}` : ''}</p>
            </div>
            <div className="sp-card p-6 text-center grid content-center">
              <p className="sp-label">Runner up</p>
              <p className="sp-display text-3xl mt-1">{W.runnerUp}</p>
            </div>
          </div>
        ) : (
          <div className="sp-card p-6 text-center">
            <SpadeIcon size={32} className="mx-auto mb-2" />
            <p className="sp-display text-2xl">Champion to be crowned</p>
            <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>The winning team shows up here the moment the championship is final.</p>
          </div>
        )}
        {past.length > 0 && (
          <div className="mt-4">
            <p className="sp-label mb-2">Past champions</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {past.map(p => (
                <Link key={p.slug} href={`/spades/bracket?t=${p.slug}`} className="sp-card p-3 block">
                  <div className="font-black">{p.champion}</div>
                  <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>{p.tournament}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="sp-wrap mt-6 grid md:grid-cols-3 gap-4">
        <div className="sp-card p-5">
          <p className="sp-label">Teams</p>
          <p className="sp-display sp-num text-5xl mt-1">{data.registration.approved}<span className="text-2xl" style={{ color: 'var(--sp-dim)' }}>/{T.teamLimit}</span></p>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>{data.registration.full ? 'Bracket is full' : 'Spots open'}{data.registration.waitlist ? ` · ${data.registration.waitlist} on the waitlist` : ''}</p>
        </div>
        <div className="sp-card p-5">
          <p className="sp-label">Format</p>
          <p className="font-black text-xl mt-1">Doubles · {T.gamesToWin > 1 ? `Best of ${T.gamesToWin * 2 - 1}` : T.teamLimit <= 2 ? "One game" : "Single elimination"}</p>
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
      ) : (
        <section className="sp-wrap mt-8">
          <h2 className="sp-display text-2xl mb-3">Live bracket</h2>
          <div className="sp-banner sp-banner-info text-sm mb-3">Preliminary bracket: teams appear as they register. The real matchups are drawn at random when registration closes.</div>
          <Bracket data={provisionalData(data)} linkMatches={false} />
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
