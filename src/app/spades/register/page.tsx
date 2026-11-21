'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useSpades } from '../_components/useSpades'
import { ErrorBox, Feedback, Loading, Shell } from '../_components/ui'

function Register() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, act, reload } = useSpades<any>('public', { t })
  const [form, setForm] = useState({ name: '', player1: '', player2: '', captainSeat: 1, contact: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [done, setDone] = useState<string | null>(null)
  if (loading && !data) return <Shell active="home"><Loading /></Shell>
  if (!data?.tournament) return <Shell online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Tournament not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const open = T.registrationOpen && !T.rosterLocked
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    const r = await act('register', { tournamentId: T.id, ...form })
    setBusy(false)
    if (r.ok) setDone(r.data?.status)
    else setMsg({ ok: false, text: r.error || 'Could not register' })
  }

  return (
    <Shell active="home" online={online} viewer={data.viewer}>
      <div className="sp-wrap-narrow grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
          <h1 className="sp-display text-4xl mt-1">Register a team</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Free. Two players per team. {data.registration.approved} of {T.capacity} spots confirmed.</p>
        </div>
        {done ? (
          <div className="sp-card-paper p-6 grid gap-3">
            <h2 className="sp-display text-3xl">{done === 'waitlist' ? 'You are on the waitlist' : 'Request received'}</h2>
            <p>
              {done === 'waitlist'
                ? 'The bracket is full right now. The tournament director will call teams from the waitlist in order if a spot opens. The waitlist does not enter the bracket on its own.'
                : 'The tournament director will confirm your team at check in. Each player then gets a private link or QR code to join their table.'}
            </p>
            <p className="font-bold">Check in at the venue between 8:00 and 8:30 PM.</p>
            <Link href="/spades" className="sp-btn sp-btn-wine">Back to Spades HQ</Link>
          </div>
        ) : !open ? (
          <div className="sp-card p-6">
            <h2 className="sp-display text-2xl">Registration is closed</h2>
            <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>See the tournament director at the venue.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="sp-card p-5 grid gap-4" noValidate>
            {data.registration.full && <div className="sp-banner sp-banner-warn text-sm">The bracket is full. New teams go on the waitlist.</div>}
            <label className="sp-field"><span>Team name</span>
              <input className="sp-input" required maxLength={40} autoComplete="off" value={form.name} onChange={e => set('name', e.target.value)} />
            </label>
            <label className="sp-field"><span>Player 1 display name</span>
              <input className="sp-input" required maxLength={40} autoComplete="off" value={form.player1} onChange={e => set('player1', e.target.value)} />
            </label>
            <label className="sp-field"><span>Player 2 display name</span>
              <input className="sp-input" required maxLength={40} autoComplete="off" value={form.player2} onChange={e => set('player2', e.target.value)} />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold mb-1" style={{ color: 'var(--sp-muted)' }}>Team captain (reports books and confirms each hand)</legend>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map(n => (
                  <button key={n} type="button" className={`sp-btn ${form.captainSeat === n ? 'sp-btn-gold' : 'sp-btn-ghost'}`} aria-pressed={form.captainSeat === n} onClick={() => set('captainSeat', n)}>
                    {(n === 1 ? form.player1 : form.player2) || `Player ${n}`}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="sp-field"><span>Phone or email (optional, only the director sees it)</span>
              <input className="sp-input" maxLength={120} autoComplete="off" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </label>
            <Feedback msg={msg} />
            <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || !form.name.trim() || !form.player1.trim() || !form.player2.trim()}>{busy ? 'Sending' : 'Submit team'}</button>
            <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>No entry fee, no wagering. One person can only play on one team.</p>
          </form>
        )}
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Register /></Suspense>
}
