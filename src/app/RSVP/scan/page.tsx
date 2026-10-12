'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Gift, Keyboard, Loader2, ScanLine, X, XCircle, Users } from 'lucide-react'
import AdminShell from '../admin/_components/AdminShell'

interface PerkStatus {
  perk: { id: string; name: string; description: string; delivery: string }
  ok: boolean
  reason: string | null
  usesAllowed: number | null
  usesLeft: number | null
  usedCount: number
}
interface Lookup {
  guest: { ticket_id: string; name: string; ticket_number: string; status: string; party_size: number }
  perks: PerkStatus[]
  scannedPerkCode: boolean
}

// Ticket QRs encode .../RSVP/check-in/<token>, perk QRs .../RSVP/perk/<token>.
// Either way the token is the last path segment.
function extractCode(scanned: string): string {
  try {
    const parts = new URL(scanned).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1]
  } catch {
    return scanned.trim()
  }
}

function usesLabel(s: PerkStatus) {
  if (s.usesAllowed == null) return `Unlimited · used ${s.usedCount}`
  return `${s.usesLeft} of ${s.usesAllowed} left`
}

export default function PerkScannerPage() {
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [eventId, setEventId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [looking, setLooking] = useState(false)
  const [result, setResult] = useState<Lookup | null>(null)
  const [error, setError] = useState('')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ perk: string; left: string } | null>(null)
  const [tonight, setTonight] = useState(0)
  const scannerRef = useRef<any>(null)
  const readerId = 'perk-qr-reader'

  useEffect(() => {
    fetch('/api/rsvp/events')
      .then(res => res.json())
      .then(d => {
        const live = (d.events || []).filter((e: any) => ['rsvp_open', 'tickets_on_sale', 'sold_out', 'date_selected'].includes(e.status))
        setEvents(live)
        if (live[0]) setEventId(live[0].id)
      })
    return () => { scannerRef.current?.stop?.().catch(() => {}) }
  }, [])

  const loadCounter = useCallback(() => {
    if (!eventId) return
    fetch(`/api/rsvp/events/${eventId}/perks`)
      .then(res => (res.ok ? res.json() : { perks: [] }))
      .then(d => setTonight((d.perks || []).reduce((n: number, p: any) => n + (p.stats?.redemptions || 0), 0)))
  }, [eventId])
  useEffect(loadCounter, [loadCounter])

  const lookup = async (raw: string) => {
    const code = extractCode(raw)
    if (!code || !eventId) return
    setLooking(true)
    setError('')
    setResult(null)
    setFlash(null)
    try {
      const res = await fetch('/api/rsvp/perks/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, event_id: eventId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Lookup failed')
      setResult(d)
      if (navigator.vibrate) navigator.vibrate(60)
    } catch (e: any) {
      setError(e.message)
      if (navigator.vibrate) navigator.vibrate([80, 60, 80])
    } finally {
      setLooking(false)
    }
  }

  const startCamera = async () => {
    setError('')
    setResult(null)
    setFlash(null)
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(readerId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decoded: string) => {
          scanner.stop().catch(() => {})
          setScanning(false)
          lookup(decoded)
        },
        () => {}
      )
    } catch (err: any) {
      setError(err?.message || 'Could not open the camera. Type the ticket number instead.')
      setScanning(false)
      setShowManual(true)
    }
  }

  const stopCamera = async () => {
    try { await scannerRef.current?.stop() } catch {}
    setScanning(false)
  }

  const redeem = async (s: PerkStatus) => {
    if (!result) return
    setRedeeming(s.perk.id)
    try {
      const res = await fetch('/api/rsvp/perks/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perk_id: s.perk.id, ticket_id: result.guest.ticket_id }),
      })
      const d = await res.json()
      const next: PerkStatus | undefined = d.status
      if (next) setResult(r => (r ? { ...r, perks: r.perks.map(p => (p.perk.id === s.perk.id ? next : p)) } : r))
      if (!res.ok) throw new Error(d.error || 'Could not redeem')
      setFlash({ perk: s.perk.name, left: next ? usesLabel(next) : '' })
      setTonight(n => n + 1)
      if (navigator.vibrate) navigator.vibrate(120)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRedeeming(null)
    }
  }

  const reset = () => {
    setResult(null)
    setError('')
    setFlash(null)
    setManual('')
  }

  const anyOk = result?.perks.some(p => p.ok)

  return (
    <AdminShell>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2"><ScanLine className="text-gold" size={22} /> Perk Scanner</h1>
            <p className="text-2xs text-text-muted">Scan a guest&apos;s ticket or perk QR to redeem.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-gold tabular-nums">{tonight}</div>
            <div className="text-2xs text-text-muted uppercase tracking-wider">Redeemed</div>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-16 border border-dashed border-surface-border rounded-2xl">No live events right now.</p>
        ) : (
          <>
            {events.length > 1 && (
              <select
                value={eventId}
                onChange={e => { setEventId(e.target.value); reset() }}
                className="w-full mb-4 px-3 py-2.5 rounded-xl bg-brand-soft border border-surface-border text-text-primary text-sm"
              >
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            )}

            {/* Camera */}
            {!result && (
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
                {scanning ? (
                  <>
                    <div id={readerId} className="rounded-xl overflow-hidden" />
                    <button onClick={stopCamera} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border text-text-secondary text-xs font-semibold">
                      <X size={14} /> Stop camera
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startCamera}
                    disabled={looking}
                    className="w-full py-14 rounded-xl bg-gold-gradient text-brand-black font-extrabold text-lg flex flex-col items-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {looking ? <Loader2 size={34} className="animate-spin" /> : <Camera size={34} />}
                    {looking ? 'Checking' : 'Tap to Scan'}
                  </button>
                )}

                <button onClick={() => setShowManual(s => !s)} className="mt-3 w-full flex items-center justify-center gap-1.5 text-2xs font-semibold text-text-muted">
                  <Keyboard size={12} /> Type a ticket number instead
                </button>
                {showManual && (
                  <div className="flex gap-2 mt-2">
                    <input
                      value={manual}
                      onChange={e => setManual(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && lookup(manual)}
                      placeholder="MOD-XXXXXXXX"
                      autoCapitalize="characters"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-brand-soft border border-surface-border text-text-primary text-sm uppercase placeholder:normal-case placeholder:text-text-muted outline-none"
                    />
                    <button onClick={() => lookup(manual)} disabled={looking} className="px-4 rounded-xl bg-gold-gradient text-brand-black text-xs font-bold disabled:opacity-60">Go</button>
                  </div>
                )}
              </div>
            )}

            {error && !result && (
              <div className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 p-5 text-center">
                <XCircle className="mx-auto text-danger mb-2" size={36} />
                <p className="font-bold text-text-primary">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-2xl border-2 p-5 ${anyOk ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-danger/50 bg-danger/5'}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xl font-extrabold text-text-primary">{result.guest.name}</p>
                    <p className="text-2xs text-text-muted">
                      {result.guest.ticket_number} · {result.guest.status.replace('_', ' ')}
                      {result.guest.party_size > 1 && <span className="inline-flex items-center gap-0.5 ml-1"><Users size={10} /> party of {result.guest.party_size}</span>}
                    </p>
                  </div>
                  {anyOk ? <Check className="text-emerald-400 shrink-0" size={30} /> : <XCircle className="text-danger shrink-0" size={30} />}
                </div>

                {flash && (
                  <div className="mb-4 rounded-xl bg-emerald-500 text-white p-3 text-center animate-scale-in">
                    <p className="font-extrabold">Redeemed: {flash.perk}</p>
                    {flash.left && <p className="text-2xs opacity-90">{flash.left}</p>}
                  </div>
                )}

                {result.perks.length === 0 ? (
                  <p className="text-sm text-text-secondary">No perks set up on tickets for this event.</p>
                ) : (
                  <div className="space-y-2.5">
                    {result.perks.map(s => (
                      <div key={s.perk.id} className={`rounded-xl border p-3.5 ${s.ok ? 'border-emerald-500/30 bg-surface-card' : 'border-surface-border bg-surface-card opacity-80'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-text-primary flex items-center gap-1.5"><Gift size={14} className="text-gold shrink-0" /> {s.perk.name}</p>
                            <p className={`text-2xs mt-0.5 ${s.ok ? 'text-emerald-400' : 'text-danger font-semibold'}`}>{s.ok ? usesLabel(s) : s.reason}</p>
                          </div>
                          {s.ok && (
                            <button
                              onClick={() => redeem(s)}
                              disabled={redeeming === s.perk.id}
                              className="shrink-0 px-5 py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-sm active:scale-95 transition disabled:opacity-60"
                            >
                              {redeeming === s.perk.id ? <Loader2 size={16} className="animate-spin" /> : 'Redeem'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && <p className="text-sm text-danger font-semibold mt-3">{error}</p>}

                <button onClick={() => { reset(); startCamera() }} className="mt-5 w-full py-3.5 rounded-xl bg-gold-gradient text-brand-black font-extrabold flex items-center justify-center gap-2">
                  <Camera size={18} /> Scan Next Guest
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  )
}
