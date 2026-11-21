'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { postAuth } from '../_components/useSpades'
import { Loading, Shell, SpadeIcon } from '../_components/ui'

// Invitation links look like /spades/join#<token>. The token sits in the URL
// fragment so it is never sent in request logs or Referer headers; it only
// travels in the POST body below.

function tokenFromLocation(): string {
  if (typeof window === 'undefined') return ''
  const h = window.location.hash.replace(/^#/, '')
  if (h) return decodeURIComponent(h.replace(/^token=/, ''))
  return new URLSearchParams(window.location.search).get('token') || ''
}

export default function JoinPage() {
  const [token, setToken] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const look = async (tok: string) => {
    setError(null)
    setPreview(null)
    const r = await postAuth({ action: 'preview', token: tok })
    if (!r.ok) setError(r.data?.error || 'Could not check this invitation')
    else setPreview(r.data)
  }

  useEffect(() => {
    const t = tokenFromLocation()
    setToken(t)
    if (t) {
      // Strip the secret from the address bar and history.
      window.history.replaceState(null, '', '/spades/join')
      void look(t)
    }
  }, [])

  const redeem = async () => {
    if (!token || busy) return
    setBusy(true)
    const r = await postAuth({ action: 'redeem', token })
    setBusy(false)
    if (!r.ok) { setError(r.data?.error || 'Could not join'); return }
    window.location.href = r.data.kind === 'staff' ? '/spades/supervisor' : '/spades/play'
  }

  if (token === null) return <Shell><Loading /></Shell>

  return (
    <Shell>
      <div className="sp-wrap-narrow grid gap-4">
        <h1 className="sp-display text-4xl">Join your table</h1>
        {!token && (
          <div className="sp-card p-5 grid gap-3">
            <p>Open the private link or scan the QR code the tournament director gave you. If you were sent a long code instead, paste it here.</p>
            <input className="sp-input" value={manual} onChange={e => setManual(e.target.value.trim())} placeholder="Invitation code" aria-label="Invitation code" autoComplete="off" />
            <button className="sp-btn sp-btn-gold" disabled={manual.length < 20} onClick={() => { const t = manual.replace(/^.*#/, ''); setToken(t); void look(t) }}>Check invitation</button>
          </div>
        )}
        {token && !preview && !error && <Loading label="Checking your invitation" />}
        {error && <div className="sp-banner sp-banner-bad" role="alert">{error}</div>}
        {preview && preview.status !== 'ok' && (
          <div className="sp-card p-5 grid gap-3">
            {preview.signedInAsThis ? (
              <>
                <h2 className="sp-display text-2xl">You are already signed in</h2>
                <p>This phone is signed in as {preview.name}.</p>
                <Link className="sp-btn sp-btn-gold" href={preview.kind === 'staff' ? '/spades/supervisor' : '/spades/play'}>Go to my table</Link>
              </>
            ) : (
              <>
                <h2 className="sp-display text-2xl">
                  {preview.status === 'used' ? 'This link was already used' : preview.status === 'expired' ? 'This link expired' : preview.status === 'revoked' ? 'This link was replaced' : 'This link is not valid'}
                </h2>
                <p style={{ color: 'var(--sp-muted)' }}>Invitations work once, on one phone. If you lost your phone or switched devices, find the tournament director. They can send you a fresh link in seconds and the old one stops working.</p>
              </>
            )}
          </div>
        )}
        {preview && preview.status === 'ok' && (
          <div className="sp-card-paper p-6 grid gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'var(--sp-wine)', color: 'var(--sp-paper)' }}><SpadeIcon size={28} /></span>
              <div>
                <p className="sp-label">{preview.tournamentName}</p>
                <p className="font-black text-lg">{preview.role}</p>
              </div>
            </div>
            <div>
              <p className="sp-label">This invitation is for</p>
              <p className="sp-display text-4xl mt-1">{preview.name}</p>
              {preview.teamName && <p className="sp-serif italic text-xl mt-1">Team {preview.teamName}</p>}
            </div>
            <p className="text-sm">Only continue if this is you. This link signs in one phone and then stops working.</p>
            <button className="sp-btn sp-btn-wine sp-btn-block" disabled={busy} onClick={redeem}>{busy ? 'Signing in' : `Yes, I am ${preview.name}`}</button>
            <p className="text-xs">Not you? Do not continue. Hand the phone to the tournament director.</p>
          </div>
        )}
      </div>
    </Shell>
  )
}
