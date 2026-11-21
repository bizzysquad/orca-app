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
  const [code, setCode] = useState<string | null>(null)
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
    if (r.ok) { setDone(r.data?.status); setCode(r.data?.accessCode || null) }
    else setMsg({ ok: false, text: r.error || 'Could not register' })
  }

  return (
    <Shell active="register" online={online} viewer={data.viewer}>
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
                : 'This phone is now signed in as your team scorekeeper. The tournament director approves your team, then your table shows up here when the game begins.'}
            </p>
            {code && (
              <div className="p-4 rounded-xl text-center" style={{ border: '3px dashed var(--sp-wine)' }}>
                <p className="sp-label">Your team access code</p>
                <p className="sp-display sp-num mt-1" style={{ fontSize: 44, letterSpacing: '0.08em' }}>{code}</p>
                <p className="text-sm mt-1">Screenshot this or write it down. If this phone signs out or you switch phones, open orcafin.app/spades/join and type this code to get back to your table.</p>
              </div>
            )}
            <p className="font-bold">Check in with the tournament director when you arrive.</p>
            <Link href="/spades/play" className="sp-btn sp-btn-wine">Go to my table</Link>
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
            <label className="sp-field"><span>Your name (you keep score for your team on this phone)</span>
              <input className="sp-input" required maxLength={40} autoComplete="off" value={form.player1} onChange={e => set('player1', e.target.value)} />
            </label>
            <label className="sp-field"><span>Your partner&apos;s name</span>
              <input className="sp-input" required maxLength={40} autoComplete="off" value={form.player2} onChange={e => set('player2', e.target.value)} />
            </label>
            <div className="sp-banner sp-banner-info text-sm">Keep this phone with you. After you register, it is your team&apos;s scorekeeper: it enters both of your bids and your books every hand once the director begins the game.</div>
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
