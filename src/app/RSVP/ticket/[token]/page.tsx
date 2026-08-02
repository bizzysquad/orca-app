'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, MapPin, Calendar, Users, ShieldAlert, Send, X } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string }> = {
  valid: { label: 'Valid', color: 'text-emerald-400' },
  checked_in: { label: 'Checked In', color: 'text-gold' },
  invalid: { label: 'Invalid', color: 'text-danger' },
  cancelled: { label: 'Cancelled', color: 'text-danger' },
  refunded: { label: 'Refunded', color: 'text-danger' },
  transferred: { label: 'Transferred', color: 'text-text-muted' },
  expired: { label: 'Expired', color: 'text-text-muted' },
  flagged: { label: 'Flagged', color: 'text-amber-400' },
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function TicketPassPage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/rsvp/tickets/${params.token}`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json() })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.token])

  useEffect(load, [load])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={28} /></div>
  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-text-secondary">This ticket link is invalid.</p>
      </div>
    )
  }

  const { ticket, ticketTypeName, event } = data
  const meta = STATUS_META[ticket.status] || STATUS_META.valid
  const canTransfer = ticket.status === 'valid'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Black invitation card */}
        <div className="rounded-3xl bg-gradient-to-b from-[#161616] to-[#0A0A0A] border border-gold/25 shadow-gold-lg overflow-hidden animate-fade-in-up">
          <div className="px-6 pt-7 pb-5 text-center border-b border-white/10">
            <div className="text-2xs font-bold tracking-[0.3em] text-gold uppercase mb-1">DJ Maskoff Events</div>
            <h1 className="text-xl font-extrabold text-white leading-tight">{event.name}</h1>
            <p className="text-2xs text-white/50 mt-1">{fmtDate(event.start_time)}</p>
          </div>

          <div className="px-6 py-5 space-y-3">
            <Row label="Admits">{ticket.holder_name}</Row>
            <Row label="Ticket Type">{ticketTypeName}</Row>
            {ticket.guest_names?.length > 0 && <Row label="Guests">{ticket.guest_names.join(', ')}</Row>}
            <Row label="Ticket #">{ticket.ticket_number}</Row>
            <Row label="Status">
              <span className={`font-bold ${meta.color}`}>{meta.label}</span>
              {ticket.status === 'checked_in' && ticket.checked_in_at && (
                <span className="text-white/40 text-2xs ml-1">({new Date(ticket.checked_in_at).toLocaleTimeString()})</span>
              )}
            </Row>
          </div>

          {/* QR */}
          <div className="px-6 pb-6 flex flex-col items-center">
            <div className="bg-white p-3 rounded-2xl">
              <img src={`/api/rsvp/tickets/${ticket.qr_token}/qr`} alt="Entry QR code" className="w-44 h-44" />
            </div>
            <p className="text-2xs text-white/40 mt-3 tracking-widest">CODE {ticket.verification_code}</p>
          </div>

          <div className="px-6 pb-6 space-y-2 text-2xs text-white/50">
            {event.venue && (
              <p className="flex items-center gap-1.5"><MapPin size={11} /> {event.venue}{event.address ? `, ${event.address}` : ''}{event.city ? `, ${event.city}` : ''}</p>
            )}
            {event.start_time && (
              <p className="flex items-center gap-1.5"><Calendar size={11} /> {fmtTime(event.start_time)}{event.end_time ? ` – ${fmtTime(event.end_time)}` : ''}</p>
            )}
            {event.age_requirement && <p className="flex items-center gap-1.5"><Users size={11} /> {event.age_requirement}</p>}
          </div>

          <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex gap-2 items-start">
            <ShieldAlert size={13} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-2xs text-white/40 leading-snug">
              Screenshots, duplicated passes, and transferred invitations may be rejected at the door. This pass is
              valid only when scanned and matched to its secure ticket record.
            </p>
          </div>
        </div>

        {canTransfer && (
          <div className="mt-5 text-center">
            <button onClick={() => setShowTransfer(true)} className="text-2xs font-semibold text-gold flex items-center gap-1.5 mx-auto">
              <Send size={12} /> Transfer this ticket to someone else
            </button>
          </div>
        )}

        {showTransfer && <TransferModal token={params.token} onClose={() => setShowTransfer(false)} onDone={() => { setShowTransfer(false); load() }} />}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/40 text-2xs">{label}</span>
      <span className="text-white font-semibold text-right">{children}</span>
    </div>
  )
}

function TransferModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) {
  const [toName, setToName] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!toName.trim() || !toEmail.trim()) { setError('Enter the recipient\'s name and email.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, to_name: toName.trim(), to_email: toEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onDone()
    } catch (e: any) {
      setError(e.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-sm">Transfer Ticket</h3>
          <button onClick={onClose} className="text-text-muted"><X size={16} /></button>
        </div>
        <p className="text-2xs text-text-muted mb-4">
          This will invalidate your pass and send a new one to the recipient. This can&apos;t be undone.
        </p>
        <input
          className="w-full mb-3 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none"
          placeholder="Recipient's name" value={toName} onChange={e => setToName(e.target.value)}
        />
        <input
          className="w-full mb-4 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none"
          placeholder="Recipient's email" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)}
        />
        {error && <p className="text-xs text-danger font-semibold mb-3">{error}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60"
        >
          {submitting ? 'Transferring…' : 'Confirm Transfer'}
        </button>
      </div>
    </div>
  )
}
