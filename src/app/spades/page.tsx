'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSpades } from './_components/useSpades'
import { Shell, SpadeIcon } from './_components/ui'
import { SignupCard, SignupForm } from './_components/Signup'
import { QUICK_KEY } from '@/lib/spades/quickgame'

// Home: sign up for a tournament right here, mark yourself ready, or keep
// score for a game of your own. Draws right away; tournaments fill in when
// the server answers.
export default function Home() {
  const { data, loading, online, act, reload } = useSpades<any>('public', { events: '1' })
  const [openId, setOpenId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [resume, setResume] = useState(false)
  useEffect(() => {
    try { setResume(!!localStorage.getItem(QUICK_KEY)) } catch {}
  }, [])
  const events: any[] = data?.events || []
  const mine = data?.mySignup || null
  const waiting = loading && !data

  return (
    <Shell active="home" online={online} viewer={data?.viewer}>
      <div className="sp-wrap-narrow grid gap-5">
        <header className="text-center pt-2">
          <span className="inline-grid place-items-center rounded-full mx-auto" style={{ width: 72, height: 72, background: 'var(--sp-gold)', color: 'var(--sp-wine)' }}><SpadeIcon size={40} /></span>
          <h1 className="sp-display mt-3" style={{ fontSize: 'clamp(40px, 10vw, 64px)' }}>Spades HQ</h1>
          <p className="sp-display text-base mt-1 tracking-widest" style={{ color: 'var(--sp-gold)' }}>Powered by DJ MASKOFF</p>
        </header>

        {resume && (
          <Link href="/spades/start" className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 64, fontSize: 19 }}>Resume your game in progress</Link>
        )}

        {code && (
          <div className="sp-card-paper p-5 text-center grid gap-2">
            <p className="sp-label">You are signed up. Your access code</p>
            <p className="sp-display sp-num" style={{ fontSize: 40, letterSpacing: '0.08em' }}>{code}</p>
            <p className="text-sm">Screenshot this. If you switch phones, open orcafin.app/spades/join and type it.</p>
            <button className="sp-btn sp-btn-sm justify-self-center" onClick={() => setCode(null)}>Got it</button>
          </div>
        )}

        {mine && <SignupCard s={mine} act={act} />}

        <section aria-label="Tournaments" className="grid gap-3" id="signup">
          <h2 className="sp-display text-2xl">Tournaments</h2>
          {waiting ? (
            <div className="sp-card p-5 text-center" style={{ color: 'var(--sp-muted)' }} role="status">Loading tournaments</div>
          ) : events.length === 0 ? (
            <div className="sp-card p-5 text-center" style={{ color: 'var(--sp-muted)' }}>No tournament posted right now. Check back soon.</div>
          ) : events.map(e => {
            const signedHere = mine && mine.slug === e.slug
            const canSign = e.registrationOpen && !signedHere
            const state = e.status === 'completed' ? 'Finished' : e.rosterLocked ? 'In progress' : e.registrationOpen ? 'Sign ups open' : 'Sign ups closed'
            return (
              <div key={e.slug} className="sp-card p-4 grid gap-3" style={{ borderColor: canSign ? 'var(--sp-gold)' : undefined }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-xl leading-tight">{e.name}</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>
                      {e.championship ? '🏆 Championship for the trophy' : 'Just for fun'}
                      {e.startsAt ? ` · ${new Date(e.startsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                      {e.venue ? ` · ${e.venue}` : ''}
                    </div>
                    {!e.rosterLocked && e.signedUp && (
                      <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>{e.signedUp.teams} team{e.signedUp.teams === 1 ? '' : 's'}{e.signedUp.solo ? ` · ${e.signedUp.solo} looking for a partner` : ''}</div>
                    )}
                  </div>
                  <span className={`sp-chip ${e.rosterLocked && e.status !== 'completed' ? 'sp-chip-live' : e.registrationOpen ? 'sp-chip-warn' : 'sp-chip-dim'}`}>{state}</span>
                </div>
                {canSign && (openId === e.id ? (
                  <SignupForm event={e} act={act} onDone={c => { setCode(c); setOpenId(null); reload() }} />
                ) : (
                  <button className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60, fontSize: 18 }} onClick={() => setOpenId(e.id)}>Sign up</button>
                ))}
                {(e.rosterLocked || !canSign) && <Link href={`/spades/bracket?t=${e.slug}`} className="sp-btn sp-btn-sm sp-btn-ghost justify-self-start">{e.rosterLocked ? 'Live scores' : 'Who signed up'}</Link>}
              </div>
            )
          })}
        </section>

        <nav className="grid gap-3" aria-label="More">
          <Link href="/spades/start" className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 64, fontSize: 19 }}>Keep score for a game</Link>
          <Link href="/spades/game" className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60, fontSize: 18 }}>Play a game</Link>
          <Link href="/spades/bracket" className="sp-btn sp-btn-block" style={{ minHeight: 56 }}>View scores</Link>
          <Link href="/spades/winners" className="sp-btn sp-btn-ghost sp-btn-block">Winners and records</Link>
        </nav>
      </div>
    </Shell>
  )
}
