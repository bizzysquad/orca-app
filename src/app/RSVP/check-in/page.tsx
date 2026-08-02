'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Search, Loader2, X } from 'lucide-react'
import AdminShell from '../admin/_components/AdminShell'

interface RsvpEvent {
  id: string
  name: string
  status: string
}

function extractToken(scanned: string): string {
  try {
    const url = new URL(scanned)
    const parts = url.pathname.split('/').filter(Boolean)
    return parts[parts.length - 1]
  } catch {
    return scanned.trim()
  }
}

export default function CheckinHubPage() {
  const router = useRouter()
  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerDivId = 'rsvp-qr-reader'

  useEffect(() => {
    fetch('/api/rsvp/events')
      .then(res => res.json())
      .then(d => {
        const active = (d.events || []).filter((e: RsvpEvent) => ['rsvp_open', 'tickets_on_sale', 'sold_out'].includes(e.status))
        setEvents(active)
        if (active[0]) setSelectedEvent(active[0].id)
      })
  }, [])

  useEffect(() => {
    return () => {
      scannerRef.current?.stop?.().catch(() => {})
    }
  }, [])

  const startScanning = async () => {
    setScanError('')
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(scannerDivId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decoded: string) => {
          scanner.stop().catch(() => {})
          setScanning(false)
          router.push(`/RSVP/check-in/${extractToken(decoded)}`)
        },
        () => {}
      )
    } catch (err: any) {
      setScanError(err?.message || 'Could not access camera. Use search instead.')
      setScanning(false)
    }
  }

  const stopScanning = async () => {
    try { await scannerRef.current?.stop() } catch {}
    setScanning(false)
  }

  const search = async () => {
    if (!query.trim() || !selectedEvent) return
    setSearching(true)
    try {
      const res = await fetch(`/api/rsvp/checkin?event_id=${selectedEvent}&q=${encodeURIComponent(query.trim())}`)
      const d = await res.json()
      setResults(d.tickets || [])
    } finally {
      setSearching(false)
    }
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-extrabold text-text-primary mb-1">Door Check-In</h1>
      <p className="text-sm text-text-secondary mb-6">Scan a guest&apos;s QR code or search by name, email, or ticket number.</p>

      {events.length > 0 && (
        <div className="mb-6">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">Event</label>
          <select
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value)}
            className="w-full max-w-sm px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm"
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2"><Camera size={15} className="text-gold" /> Scan QR Code</h2>
          {scanning ? (
            <div>
              <div id={scannerDivId} className="rounded-xl overflow-hidden mb-3" />
              <button onClick={stopScanning} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-surface-border text-text-secondary text-xs font-semibold">
                <X size={14} /> Stop Scanning
              </button>
            </div>
          ) : (
            <button onClick={startScanning} className="w-full py-8 rounded-xl border border-dashed border-surface-border text-text-secondary text-sm font-semibold hover:border-gold/40 transition">
              Tap to start camera
            </button>
          )}
          {scanError && <p className="text-2xs text-danger font-semibold mt-2">{scanError}</p>}
          <p className="text-2xs text-text-muted mt-2">Or have the guest show a QR code — any phone camera app opening it will land here too.</p>
        </div>

        {/* Search */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2"><Search size={15} className="text-gold" /> Search Guest</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Name, email, or ticket #"
              className="flex-1 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none"
            />
            <button onClick={search} disabled={searching} className="px-4 py-2.5 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold disabled:opacity-60">
              {searching ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map(t => (
              <button
                key={t.id}
                onClick={() => router.push(`/RSVP/check-in/${t.qr_token}`)}
                className="w-full text-left p-3 rounded-lg border border-surface-border hover:border-gold/40 transition"
              >
                <div className="text-sm font-semibold text-text-primary">{t.holder_name}</div>
                <div className="text-2xs text-text-muted">{t.ticket_number} · {t.status}</div>
              </button>
            ))}
            {results.length === 0 && query && !searching && <p className="text-2xs text-text-muted">No matches.</p>}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
