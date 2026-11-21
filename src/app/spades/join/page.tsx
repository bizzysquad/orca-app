'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { postAuth } from '../_components/useSpades'
import { Shell, SpadeIcon } from '../_components/ui'

// Sign in with an access code (XXXX-XXXX) from registration or from the
// director. Older links of the form /spades/join#<token> still work.

function formatInput(v: string) {
  const n = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n
}

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const look = async (tok: string) => {
    setError(null)
    setPreview(null)
    setBusy(true)
    const r = await postAuth({ action: 'preview', token: tok })
    setBusy(false)
    if (!r.ok) { setError(r.data?.error || 'Could not check that code'); return }
    if (r.data.status !== 'ok' && !r.data.signedInAsThis) {
      setError(
        r.data.status === 'expired' ? 'That code expired. Ask the tournament director for a new one.'
          : r.data.status === 'revoked' ? 'That code was replaced. Ask the tournament director for the new one.'
            : r.data.status === 'used' ? 'That link was already used. Ask the tournament director for an access code.'
              : 'That code is not right. Check the letters and try again.'
      )
      return
    }
    setPreview({ ...r.data, token: tok })
  }

  useEffect(() => {
    const h = window.location.hash.replace(/^#/, '')
    if (h) {
      window.history.replaceState(null, '', '/spades/join')
      void look(decodeURIComponent(h.replace(/^token=/, '')))
    }
  }, [])

  const redeem = async () => {
    if (!preview || busy) return
    setBusy(true)
    const r = await postAuth({ action: 'redeem', token: preview.token })
    setBusy(false)
    if (!r.ok) { setError(r.data?.error || 'Could not sign in'); return }
    window.location.href = r.data.kind === 'staff' ? '/spades/supervisor' : '/spades/play'
  }

  return (
    <Shell>
      <div className="sp-wrap-narrow grid gap-4">
        <h1 className="sp-display text-4xl">Sign in to your table</h1>
        {!preview && (
          <form className="sp-card p-5 grid gap-3" onSubmit={e => { e.preventDefault(); if (code.replace('-', '').length === 8) void look(code) }}>
            <label className="sp-field"><span>Access code</span>
              <input
                className="sp-input sp-display sp-num text-center"
                style={{ fontSize: 30, letterSpacing: '0.12em' }}
                value={code}
                onChange={e => setCode(formatInput(e.target.value))}
                placeholder="XXXX-XXXX"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="code-help"
              />
            </label>
            <p id="code-help" className="text-sm" style={{ color: 'var(--sp-muted)' }}>You got this code when you registered your team. Supervisors get theirs from the tournament director. Lost it? The director can give you a new one in seconds.</p>
            {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
            <button className="sp-btn sp-btn-gold" disabled={busy || code.replace('-', '').length !== 8}>{busy ? 'Checking' : 'Continue'}</button>
            <Link href="/spades/register" className="sp-btn sp-btn-ghost">Register a new team instead</Link>
          </form>
        )}
        {preview && preview.signedInAsThis && (
          <div className="sp-card p-5 grid gap-3">
            <h2 className="sp-display text-2xl">You are already signed in</h2>
            <p>This phone is signed in as {preview.name}.</p>
            <Link className="sp-btn sp-btn-gold" href={preview.kind === 'staff' ? '/spades/supervisor' : '/spades/play'}>Go to my table</Link>
          </div>
        )}
        {preview && !preview.signedInAsThis && (
          <div className="sp-card-paper p-6 grid gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'var(--sp-wine)', color: 'var(--sp-paper)' }}><SpadeIcon size={28} /></span>
              <div>
                <p className="sp-label">{preview.tournamentName}</p>
                <p className="font-black text-lg">{preview.role === 'Captain' ? 'Team scorekeeper' : preview.role}</p>
              </div>
            </div>
            <div>
              <p className="sp-label">This code is for</p>
              <p className="sp-display text-4xl mt-1">{preview.name}</p>
              {preview.teamName && <p className="sp-serif italic text-xl mt-1">Team {preview.teamName}</p>}
            </div>
            {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
            <button className="sp-btn sp-btn-wine sp-btn-block" disabled={busy} onClick={redeem}>{busy ? 'Signing in' : `Yes, sign me in`}</button>
            <button className="sp-btn sp-btn-ghost sp-btn-block" style={{ color: 'var(--sp-ink)' }} onClick={() => { setPreview(null); setCode('') }}>Not me, try another code</button>
          </div>
        )}
      </div>
    </Shell>
  )
}
