'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Feedback } from './ui'
import type { ActResult } from './useSpades'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null

export interface SignupInfo {
  tournament: string
  name: string
  teamName: string
  solo: boolean
  ready: boolean
  partner: string | null
  started: boolean
  status: string
}

// After signing up: the "I'm here, seated and ready" button, plus a team
// name box once a partner is set (people paired at random can name theirs).
export function SignupCard({ s, act, showTableLink = false }: { s: SignupInfo; act: Act; showTableLink?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState(s.teamName)
  const tap = async (action: string, payload: Record<string, unknown>, ok?: string) => {
    setBusy(true)
    setMsg(null)
    const r = await act(action, payload)
    setBusy(false)
    setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error || 'Failed' })
    return r.ok
  }
  if (s.started) {
    return (
      <section className="sp-card p-5 grid gap-3 text-center" style={{ borderColor: 'var(--sp-gold)' }}>
        <p className="sp-label">{s.tournament}</p>
        {s.status === 'waitlist' ? (
          <>
            <h2 className="sp-display text-2xl">Sitting this one out</h2>
            <p style={{ color: 'var(--sp-muted)' }}>The tournament started with the teams that were ready{s.solo ? ' and paired' : ''}. Catch the next one, or keep score for a game of your own.</p>
          </>
        ) : (
          <>
            <h2 className="sp-display text-2xl">{s.teamName}</h2>
            <p>The tournament is on.</p>
            <Link href="/spades/play" className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60, fontSize: 18 }}>Go to my table</Link>
          </>
        )}
      </section>
    )
  }
  return (
    <section className="sp-card p-5 grid gap-3" style={{ borderColor: s.ready ? 'var(--sp-green)' : 'var(--sp-gold)' }} aria-label="Your sign up">
      <div className="text-center">
        <p className="sp-label">{s.tournament}</p>
        <h2 className="sp-display text-3xl mt-1">{s.solo ? s.name : s.teamName}</h2>
        <p className="font-bold" style={{ color: 'var(--sp-muted)' }}>{s.solo ? 'Signed up. You get a partner when the director pairs players.' : `${s.name} & ${s.partner}`}</p>
      </div>
      <button
        className={`sp-btn sp-btn-block ${s.ready ? 'sp-btn-ghost' : 'sp-btn-gold'}`}
        style={{ minHeight: 68, fontSize: 19 }}
        disabled={busy}
        onClick={() => tap('present', { ready: !s.ready })}
      >
        {busy ? 'Sending' : s.ready ? '✓ Ready. Tap if you step away' : "I'm here, seated and ready"}
      </button>
      <p className="text-sm text-center" style={{ color: 'var(--sp-muted)' }}>
        {s.ready ? 'The director sees you are ready. When the tournament starts, this screen takes you to your table.' : 'Tap it once you are here and seated. Only ready teams are put in the bracket.'}
      </p>
      {!s.solo && (naming ? (
        <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (await tap('renameTeam', { name }, 'Team name saved')) setNaming(false) }}>
          <input className="sp-input" aria-label="Team name" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
          <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || !name.trim()}>Save</button>
        </form>
      ) : <button className="text-sm underline font-bold justify-self-center" onClick={() => setNaming(true)}>Change team name</button>)}
      {showTableLink && <Link href="/spades/play" className="sp-btn sp-btn-sm sp-btn-ghost justify-self-center">My table</Link>}
      <Feedback msg={msg} />
    </section>
  )
}

// The sign up sheet on the home page: your name, then either your partner
// and team name, or "I need a partner".
export function SignupForm({ event, act, onDone }: { event: any; act: Act; onDone: (code: string | null) => void }) {
  const [f, setF] = useState({ player1: '', partner: 'yes' as 'yes' | 'no', player2: '', name: '', contact: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const solo = f.partner === 'no'
  const ok = f.player1.trim() && (solo || (f.player2.trim() && f.name.trim()))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !ok) return
    setBusy(true)
    setMsg(null)
    const r = await act('register', { tournamentId: event.id, solo, player1: f.player1, player2: solo ? '' : f.player2, name: solo ? '' : f.name, contact: f.contact })
    setBusy(false)
    if (r.ok) onDone(r.data?.accessCode || null)
    else setMsg({ ok: false, text: r.error || 'Could not sign up' })
  }
  const choice = (on: boolean) => ({ background: on ? 'rgba(224,173,79,0.18)' : 'rgba(0,0,0,0.22)', border: `2px solid ${on ? 'var(--sp-gold)' : 'transparent'}` })
  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <label className="sp-field"><span>Your name</span>
        <input className="sp-input" maxLength={40} autoComplete="given-name" value={f.player1} onChange={e => setF({ ...f, player1: e.target.value })} />
      </label>
      <span className="sp-label">Do you have a partner?</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Do you have a partner?">
        {[{ v: 'yes', t: 'Yes, I have a partner' }, { v: 'no', t: 'No, I need a partner' }].map(o => (
          <button key={o.v} type="button" role="radio" aria-checked={f.partner === o.v} onClick={() => setF({ ...f, partner: o.v as 'yes' | 'no' })} className="p-3 rounded-xl font-black text-left" style={choice(f.partner === o.v)}>{o.t}</button>
        ))}
      </div>
      {!solo ? (
        <>
          <label className="sp-field"><span>Partner&apos;s name</span>
            <input className="sp-input" maxLength={40} autoComplete="off" value={f.player2} onChange={e => setF({ ...f, player2: e.target.value })} />
          </label>
          <label className="sp-field"><span>Team name (required)</span>
            <input className="sp-input" maxLength={40} autoComplete="off" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </label>
        </>
      ) : <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>No problem. The director pairs everyone who needs a partner at random before the games start.</p>}
      <label className="sp-field"><span>Phone or email (optional, only the director sees it)</span>
        <input className="sp-input" maxLength={120} autoComplete="off" value={f.contact} onChange={e => setF({ ...f, contact: e.target.value })} />
      </label>
      <Feedback msg={msg} />
      <button className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 56 }} disabled={busy || !ok}>{busy ? 'Signing up' : 'Sign me up'}</button>
      <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Free. No wagering of any kind.</p>
    </form>
  )
}
