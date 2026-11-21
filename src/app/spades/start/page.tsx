'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Feedback, Shell } from '../_components/ui'

// Self-serve: players set up their own game and keep score. No director.
export default function StartGame() {
  const [f, setF] = useState({ teamA: '', captainA: '', partnerA: '', teamB: '', captainB: '', partnerB: '', target: '25', scorekeeping: 'one' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [done, setDone] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }))
  const ok = f.teamA.trim() && f.captainA.trim() && f.partnerA.trim() && f.teamB.trim() && f.captainB.trim() && f.partnerB.trim() && f.target

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/spades/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ action: 'startGame', ...f, target: Number(f.target) }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setMsg({ ok: false, text: j.error || 'Could not start the game' })
      else setDone(j)
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server. Check your connection.' })
    }
    setBusy(false)
  }

  const field = (k: keyof typeof f, label: string) => (
    <label className="sp-field"><span>{label}</span>
      <input className="sp-input" maxLength={40} autoComplete="off" value={f[k]} onChange={e => set(k, e.target.value)} />
    </label>
  )

  if (done) {
    const text = `Spades game: ${f.teamA} vs ${f.teamB}. ${done.otherCaptain}, open ${typeof window !== 'undefined' ? window.location.origin : ''}/spades/join and type ${done.otherCode}`
    return (
      <Shell active="play">
        <div className="sp-wrap-narrow grid gap-4">
          <h1 className="sp-display text-4xl">Game created</h1>
          {done.otherCode && <div className="sp-card-paper p-5 grid gap-3 text-center">
            <p className="sp-label">Send this to {done.otherCaptain}</p>
            <p className="sp-display sp-num" style={{ fontSize: 42, letterSpacing: '0.08em' }}>{done.otherCode}</p>
            <p className="text-sm">They open <b>orcafin.app/spades/join</b> on their phone and type it. That makes them captain of {f.teamB}.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="sp-btn sp-btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true) } catch { prompt('Copy this', text) } }}>{copied ? 'Copied' : 'Copy'}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className="sp-btn sp-btn-sm sp-btn-wine" onClick={() => navigator.share({ title: 'Spades game', text }).catch(() => {})}>Text it</button>}
            </div>
          </div>}
          <div className="sp-card p-4 grid gap-1 text-center">
            <p className="sp-label">Your own code (in case you switch phones)</p>
            <p className="sp-display sp-num text-3xl">{done.myCode}</p>
          </div>
          <p style={{ color: 'var(--sp-muted)' }}>{done.otherCode ? 'When both captains tap Ready, the game begins. You enter both bids before each hand and the books on your side after it.' : 'Tap Ready when everyone is seated. You enter both team bids before each hand and the books after it.'} The score keeps itself.</p>
          <Link href="/spades/play" className="sp-btn sp-btn-gold">Go to my table</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell active="play">
      <div className="sp-wrap-narrow grid gap-4">
        <div>
          <h1 className="sp-display text-4xl">Start a game</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Free. Four players, two teams. One phone can keep score for everyone, or each team&apos;s captain can use their own.</p>
        </div>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <section className="sp-card p-4 grid gap-3">
            <h2 className="sp-display text-xl">Your team</h2>
            {field('teamA', 'Team name')}
            {field('captainA', 'Your name (captain)')}
            {field('partnerA', "Your partner's name")}
          </section>
          <section className="sp-card p-4 grid gap-3">
            <h2 className="sp-display text-xl">Other team</h2>
            {field('teamB', 'Team name')}
            {field('captainB', "Their captain's name")}
            {field('partnerB', "Their partner's name")}
          </section>
          <section className="sp-card p-4 grid gap-3">
            <span className="sp-label">Who keeps score</span>
            <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Who keeps score">
              {[{ k: 'one', t: 'One person keeps score (easiest)', d: 'Only you need the app. You enter every bid and the books for both teams. Nobody else has to do anything.' }, { k: 'two', t: 'Each team keeps its own score', d: 'The other captain gets a code and enters their own team on their phone.' }].map(o => (
                <button key={o.k} type="button" role="radio" aria-checked={f.scorekeeping === o.k} onClick={() => set('scorekeeping', o.k)} className="p-3 rounded-xl text-left" style={{ background: f.scorekeeping === o.k ? 'rgba(224,173,79,0.18)' : 'rgba(0,0,0,0.22)', border: `2px solid ${f.scorekeeping === o.k ? 'var(--sp-gold)' : 'transparent'}` }}>
                  <div className="font-black">{o.t}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>{o.d}</div>
                </button>
              ))}
            </div>
            <label className="sp-field"><span>Play to</span>
              <input className="sp-input" inputMode="numeric" value={f.target} onChange={e => set('target', e.target.value.replace(/\D/g, ''))} />
            </label>
            <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>1 point per book bid. Extra books earn nothing. Get set and you score 0 for the hand. No bags.</p>
          </section>
          <Feedback msg={msg} />
          <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || !ok}>{busy ? 'Creating' : 'Create game'}</button>
        </form>
      </div>
    </Shell>
  )
}
