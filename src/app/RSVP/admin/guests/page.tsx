'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, Send, Ban, Flag, RefreshCw, UserPlus, DollarSign, X } from 'lucide-react'
import AdminShell from '../_components/AdminShell'

const STATUS_COLOR: Record<string, string> = {
  valid: 'text-emerald-400',
  checked_in: 'text-gold',
  cancelled: 'text-danger',
  refunded: 'text-danger',
  flagged: 'text-amber-400',
  invalid: 'text-danger',
  transferred: 'text-text-muted',
  expired: 'text-text-muted',
}

export default function GuestsAdminPage() {
  const [events, setEvents] = useState<any[]>([])
  const [eventId, setEventId] = useState('')
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState('')
  const [showWalkIn, setShowWalkIn] = useState(false)

  useEffect(() => {
    fetch('/api/rsvp/events').then(r => r.json()).then(d => {
      setEvents(d.events || [])
      if (d.events?.[0]) setEventId(d.events[0].id)
    })
  }, [])

  const load = () => {
    if (!eventId) return
    setLoading(true)
    fetch(`/api/rsvp/guests?event_id=${eventId}`).then(r => r.json()).then(d => setGuests(d.guests || [])).finally(() => setLoading(false))
  }
  useEffect(load, [eventId])

  const runAction = async (id: string, token: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusyId(id)
    try {
      await fetch(`/api/rsvp/tickets/${token}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      load()
    } finally {
      setBusyId('')
    }
  }

  const refund = async (id: string, token: string) => {
    if (!confirm('Refund this ticket through Stripe? This cannot be undone.')) return
    setBusyId(id)
    try {
      await fetch(`/api/rsvp/tickets/${token}/refund`, { method: 'POST' })
      load()
    } finally {
      setBusyId('')
    }
  }

  const filtered = guests.filter(g => {
    if (!query) return true
    const q = query.toLowerCase()
    return g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q) || g.ticket_number?.toLowerCase().includes(q)
  })

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-text-primary">Guests</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm" value={eventId} onChange={e => setEventId(e.target.value)}>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <button onClick={() => setShowWalkIn(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold">
            <UserPlus size={14} /> Add Walk-In
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, email, ticket #"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div>
      ) : (
        <div className="overflow-x-auto border border-surface-border rounded-2xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-card text-text-muted text-left">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Ticket Type</th>
                <th className="p-3 font-semibold">Amount</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Checked In</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className="border-t border-surface-border">
                  <td className="p-3 text-text-primary font-semibold">{g.name}</td>
                  <td className="p-3 text-text-secondary">{g.email}</td>
                  <td className="p-3 text-text-secondary">{g.ticket_type}</td>
                  <td className="p-3 text-text-secondary">${(g.amount_paid_cents / 100).toFixed(2)}</td>
                  <td className={`p-3 font-semibold ${STATUS_COLOR[g.rsvp_status] || 'text-text-secondary'}`}>{g.rsvp_status}</td>
                  <td className="p-3 text-text-muted">{g.checked_in_at ? new Date(g.checked_in_at).toLocaleTimeString() : '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button disabled={busyId === g.id} onClick={() => runAction(g.id, g.qr_token, 'resend')} title="Resend invitation" className="p-1.5 rounded hover:bg-white/10 text-text-secondary"><Send size={13} /></button>
                      {g.rsvp_status !== 'cancelled' && (
                        <button disabled={busyId === g.id} onClick={() => runAction(g.id, g.qr_token, 'cancel')} title="Cancel ticket" className="p-1.5 rounded hover:bg-white/10 text-text-secondary"><Ban size={13} /></button>
                      )}
                      {g.rsvp_status !== 'flagged' ? (
                        <button disabled={busyId === g.id} onClick={() => runAction(g.id, g.qr_token, 'flag', { flagged_reason: 'Manually flagged' })} title="Flag" className="p-1.5 rounded hover:bg-white/10 text-text-secondary"><Flag size={13} /></button>
                      ) : (
                        <button disabled={busyId === g.id} onClick={() => runAction(g.id, g.qr_token, 'unflag')} title="Unflag" className="p-1.5 rounded hover:bg-white/10 text-amber-400"><Flag size={13} /></button>
                      )}
                      <button disabled={busyId === g.id} onClick={() => runAction(g.id, g.qr_token, 'reissue')} title="Reissue (new QR)" className="p-1.5 rounded hover:bg-white/10 text-text-secondary"><RefreshCw size={13} /></button>
                      {g.payment_status === 'paid' && (
                        <button disabled={busyId === g.id} onClick={() => refund(g.id, g.qr_token)} title="Refund via Stripe" className="p-1.5 rounded hover:bg-white/10 text-danger"><DollarSign size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-text-muted">No guests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showWalkIn && <WalkInModal eventId={eventId} onClose={() => setShowWalkIn(false)} onDone={() => { setShowWalkIn(false); load() }} />}
    </AdminShell>
  )
}

function WalkInModal({ eventId, onClose, onDone }: { eventId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/rsvp/guests/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, name: name.trim(), email: email.trim() }),
      })
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary text-sm">Add Walk-In</h3>
          <button onClick={onClose} className="text-text-muted"><X size={16} /></button>
        </div>
        <input className="w-full mb-3 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm outline-none" placeholder="Guest name" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full mb-4 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm outline-none" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
        <button onClick={submit} disabled={submitting} className="w-full py-2.5 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60">
          {submitting ? 'Adding…' : 'Add Guest'}
        </button>
      </div>
    </div>
  )
}
