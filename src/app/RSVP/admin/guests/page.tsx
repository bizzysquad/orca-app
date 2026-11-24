'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, Send, Ban, Flag, RefreshCw, UserPlus, DollarSign } from 'lucide-react'
import AdminShell from '../_components/AdminShell'
import { useTheme } from '@/context/ThemeContext'
import { PageHeader, Panel, Button, RowMenu, EmptyState, Sheet, Field, useField } from '@/components/ui/kit'

export default function GuestsAdminPage() {
  const { theme } = useTheme()
  const field = useField()
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

  const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
  const tone = (s: string) => ({ valid: theme.ok, checked_in: theme.accent, flagged: theme.warn, cancelled: theme.bad, refunded: theme.bad, invalid: theme.bad } as Record<string, string>)[s] || theme.subtext
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const checkedIn = guests.filter(g => g.checked_in_at).length
  const actionsFor = (g: any) => [
    { label: 'Resend invitation', icon: Send, onClick: () => runAction(g.id, g.qr_token, 'resend') },
    ...(g.rsvp_status !== 'cancelled' ? [{ label: 'Cancel ticket', icon: Ban, onClick: () => runAction(g.id, g.qr_token, 'cancel') }] : []),
    g.rsvp_status !== 'flagged'
      ? { label: 'Flag', icon: Flag, onClick: () => runAction(g.id, g.qr_token, 'flag', { flagged_reason: 'Manually flagged' }) }
      : { label: 'Remove flag', icon: Flag, onClick: () => runAction(g.id, g.qr_token, 'unflag') },
    { label: 'Reissue (new QR)', icon: RefreshCw, onClick: () => runAction(g.id, g.qr_token, 'reissue') },
    ...(g.payment_status === 'paid' ? [{ label: 'Refund through Stripe', icon: DollarSign, danger: true, onClick: () => refund(g.id, g.qr_token) }] : []),
  ]

  return (
    <AdminShell>
      <PageHeader
        title="Guests"
        sub={guests.length ? `${guests.length} guests · ${checkedIn} checked in` : 'Everyone who RSVPd or bought a ticket'}
        right={<>
          <select value={eventId} onChange={e => setEventId(e.target.value)} aria-label="Event" {...field} className={`${field.className} max-w-[240px]`}>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <Button variant="primary" onClick={() => setShowWalkIn(true)}><UserPlus size={15} /> Add walk-in</Button>
        </>}
      />

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.subtext }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email or ticket #" aria-label="Search guests" {...field} className={`${field.className} pl-9`} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={24} style={{ color: theme.subtext }} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title={guests.length ? 'No guests match' : 'No guests yet'} />
      ) : (
        <Panel pad={false}>
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_0.7fr_0.8fr_0.8fr_40px] gap-3 px-5 py-2.5 text-[11.5px] font-medium" style={{ color: theme.subtext, borderBottom: `1px solid ${theme.border}` }}>
            <span>Guest</span><span>Ticket</span><span className="text-right">Paid</span><span>Status</span><span>Checked in</span><span />
          </div>
          <ul>
            {filtered.map((g, i) => (
              <li key={g.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1.4fr_1fr_0.7fr_0.8fr_0.8fr_40px] gap-x-3 gap-y-1 items-center px-4 md:px-5 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined, opacity: busyId === g.id ? 0.5 : 1 }}>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{g.name}</p>
                  <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{g.email}</p>
                </div>
                <div className="md:hidden row-span-3 self-start"><RowMenu label={`Actions for ${g.name}`} items={actionsFor(g)} /></div>
                <p className="text-[12.5px] truncate" style={{ color: theme.subtext }}>
                  {g.ticket_type}{g.ticket_number ? ` · ${g.ticket_number}` : ''}
                  <span className="md:hidden"> · ${(g.amount_paid_cents / 100).toFixed(2)}</span>
                </p>
                <p className="hidden md:block text-[13px] tnum text-right" style={{ color: theme.text }}>${(g.amount_paid_cents / 100).toFixed(2)}</p>
                <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: tone(g.rsvp_status) }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone(g.rsvp_status) }} />{label(g.rsvp_status)}
                  {g.checked_in_at && <span className="md:hidden" style={{ color: theme.subtext }}> · in at {timeOf(g.checked_in_at)}</span>}
                </p>
                <p className="hidden md:block text-[12.5px] tnum" style={{ color: theme.subtext }}>{g.checked_in_at ? timeOf(g.checked_in_at) : '—'}</p>
                <div className="hidden md:block"><RowMenu label={`Actions for ${g.name}`} items={actionsFor(g)} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <WalkInSheet open={showWalkIn} eventId={eventId} onClose={() => setShowWalkIn(false)} onDone={() => { setShowWalkIn(false); load() }} />
    </AdminShell>
  )
}

function WalkInSheet({ open, eventId, onClose, onDone }: { open: boolean; eventId: string; onClose: () => void; onDone: () => void }) {
  const field = useField()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => { if (open) { setName(''); setEmail('') } }, [open])

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
    <Sheet open={open} onClose={onClose} title="Add walk-in" footer={<>
      <Button className="flex-1" onClick={onClose}>Cancel</Button>
      <Button className="flex-1" variant="primary" disabled={submitting || !name.trim()} onClick={submit}>{submitting ? 'Adding' : 'Add guest'}</Button>
    </>}>
      <div className="space-y-3">
        <Field label="Guest name"><input value={name} onChange={e => setName(e.target.value)} autoFocus {...field} /></Field>
        <Field label="Email (optional)"><input type="email" value={email} onChange={e => setEmail(e.target.value)} {...field} /></Field>
      </div>
    </Sheet>
  )
}
