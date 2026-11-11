'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, ExternalLink, Loader2, Mail, Phone, Instagram, Trash2, Check } from 'lucide-react'
import type { Booking, BookingStatus } from '@/lib/crooked/types'
import { BOOKING_STATUSES, STATUS_LABELS } from '@/lib/crooked/types'
import { formatMoney } from '@/lib/crooked/pricing'
import { Field, Money } from './ui'

type Payment = { booking_id: string; amount_cents: number; kind: string; created_at: string }

const FILTERS: { id: string; label: string; match: (b: Booking) => boolean }[] = [
  { id: 'open', label: 'Active', match: b => !['completed', 'cancelled'].includes(b.status) },
  { id: 'action', label: 'Needs action', match: b => ['quote_requested', 'pending_payment', 'deposit_paid', 'paid'].includes(b.status) },
  { id: 'quotes', label: 'Quotes', match: b => b.kind === 'custom' },
  { id: 'all', label: 'All', match: () => true },
]

const STATUS_COLOR: Partial<Record<BookingStatus, string>> = {
  quote_requested: 'bg-amber-300',
  quoted: 'bg-amber-100',
  pending_payment: 'bg-orange-200',
  deposit_paid: 'bg-sky-200',
  paid: 'bg-green-300',
  scheduled: 'bg-green-200',
  in_production: 'bg-violet-200',
  delivered: 'bg-emerald-200',
  completed: 'bg-gray-200',
  cancelled: 'bg-red-200',
}

export default function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState('open')
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/crookedrumors/admin/bookings', { cache: 'no-store' })
    const data = await res.json()
    setBookings(data.bookings || [])
    setPayments(data.payments || [])
    if (data.error) setError(data.error)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => (bookings || []).filter(FILTERS.find(f => f.id === filter)!.match), [bookings, filter])
  const stats = useMemo(() => {
    const list = bookings || []
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    return {
      collectedMonth: payments.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.amount_cents, 0),
      outstanding: list.filter(b => !['cancelled', 'quote_requested'].includes(b.status)).reduce((s, b) => s + Math.max(0, b.total_cents - b.amount_paid_cents), 0),
      needsAction: list.filter(FILTERS[1].match).length,
      upcoming: list.filter(b => b.project_date && new Date(b.project_date + 'T23:59') >= new Date() && b.status !== 'cancelled').length,
    }
  }, [bookings, payments])

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch('/api/crookedrumors/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Update failed'); return false }
    setBookings(list => (list || []).map(b => (b.id === id ? data.booking : b)))
    return true
  }

  async function remove(b: Booking) {
    if (!confirm(`Delete booking ${b.ref} for ${b.client_name}? This can't be undone. (Stripe payments are not refunded.)`)) return
    const res = await fetch(`/api/crookedrumors/admin/bookings?id=${b.id}`, { method: 'DELETE' })
    if (res.ok) setBookings(list => (list || []).filter(x => x.id !== b.id))
  }

  if (!bookings) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin" size={32} /></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Collected this month" value={formatMoney(stats.collectedMonth)} />
        <Stat label="Outstanding balances" value={formatMoney(stats.outstanding)} />
        <Stat label="Needs action" value={String(stats.needsAction)} red={stats.needsAction > 0} />
        <Stat label="Upcoming shoots" value={String(stats.upcoming)} />
      </div>

      {error && <p className="text-sm font-bold text-[var(--cr-red)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full border-2 border-[var(--cr-ink)] text-xs font-extrabold uppercase ${filter === f.id ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)]' : 'bg-[var(--cr-paper)]'}`}>
            {f.label} ({(bookings || []).filter(f.match).length})
          </button>
        ))}
        <button onClick={load} className="ml-auto text-xs font-bold underline">Refresh</button>
      </div>

      {shown.length === 0 && <p className="font-semibold py-10 text-center">No bookings here yet.</p>}

      <div className="space-y-3">
        {shown.map(b => (
          <BookingRow
            key={b.id}
            b={b}
            payments={payments.filter(p => p.booking_id === b.id)}
            open={open === b.id}
            onToggle={() => setOpen(open === b.id ? null : b.id)}
            onPatch={body => patch(b.id, body)}
            onDelete={() => remove(b)}
          />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className={`cr-card-flat !border-[3px] p-3 ${red ? '!bg-[#fff1dc] !border-[var(--cr-red)]' : ''}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{label}</div>
      <div className="cr-display text-2xl md:text-3xl mt-1">{value}</div>
    </div>
  )
}

function BookingRow({
  b, payments, open, onToggle, onPatch, onDelete,
}: {
  b: Booking
  payments: Payment[]
  open: boolean
  onToggle: () => void
  onPatch: (body: Record<string, unknown>) => Promise<boolean>
  onDelete: () => void
}) {
  const [notes, setNotes] = useState(b.admin_notes)
  const [total, setTotal] = useState<number | null>(b.total_cents)
  const [deposit, setDeposit] = useState<number | null>(b.deposit_cents)
  const [date, setDate] = useState(b.project_date || '')
  const [time, setTime] = useState(b.project_time)
  const [turnaround, setTurnaround] = useState(b.turnaround)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const balance = Math.max(0, b.total_cents - b.amount_paid_cents)
  const link = typeof window !== 'undefined' ? `${window.location.origin}/crookedrumors/booking/${b.token}` : ''

  useEffect(() => {
    setNotes(b.admin_notes); setTotal(b.total_cents); setDeposit(b.deposit_cents)
    setDate(b.project_date || ''); setTime(b.project_time); setTurnaround(b.turnaround)
  }, [b])

  const changed = notes !== b.admin_notes || total !== b.total_cents || deposit !== b.deposit_cents || date !== (b.project_date || '') || time !== b.project_time || turnaround !== b.turnaround

  async function saveEdits() {
    setSaving(true)
    const body: Record<string, unknown> = { admin_notes: notes, project_date: date, project_time: time, turnaround }
    if (total !== b.total_cents) body.total_cents = total ?? 0
    else if (deposit !== b.deposit_cents) body.deposit_cents = deposit ?? 0
    await onPatch(body)
    setSaving(false)
  }

  return (
    <div className="cr-card-flat !border-[3px] overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-3 md:p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="flex-1 min-w-[160px]">
          <div className="font-black">{b.client_name} <span className="text-xs font-bold text-[var(--cr-muted)]">{b.ref}</span></div>
          <div className="text-sm text-[var(--cr-ink-soft)]">{b.package_name || `Quote: ${b.category_name || 'custom'}`}{b.project_date ? ` · ${new Date(b.project_date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="font-black">{b.total_cents ? formatMoney(b.total_cents) : '—'}</div>
          <div className="text-xs font-bold text-[var(--cr-muted)]">{b.amount_paid_cents ? `${formatMoney(b.amount_paid_cents)} paid` : 'Unpaid'}</div>
        </div>
        <span className={`text-[11px] font-black uppercase px-2 py-1 rounded border-2 border-[var(--cr-ink)] ${STATUS_COLOR[b.status] || ''}`}>{STATUS_LABELS[b.status]}</span>
      </button>

      {open && (
        <div className="border-t-2 border-[var(--cr-tan)] p-4 grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <a href={`mailto:${b.client_email}?subject=${encodeURIComponent(`Your Crooked Rumors booking ${b.ref}`)}`} className="cr-btn cr-btn-paper cr-btn-sm !normal-case"><Mail size={14} /> {b.client_email}</a>
              {b.client_phone && <a href={`tel:${b.client_phone}`} className="cr-btn cr-btn-paper cr-btn-sm"><Phone size={14} /> {b.client_phone}</a>}
              {b.client_instagram && <a href={`https://instagram.com/${b.client_instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="cr-btn cr-btn-paper cr-btn-sm !normal-case"><Instagram size={14} /> {b.client_instagram}</a>}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {b.company && <Info k="Business" v={b.company} />}
              {b.location && <Info k="Location" v={b.location} />}
              {b.budget && <Info k="Budget" v={b.budget} />}
              {b.referral && <Info k="Heard about us" v={b.referral} />}
              <Info k="Booked" v={new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} />
              {b.payment_choice && <Info k="Chose to pay" v={b.payment_choice === 'deposit' ? 'Deposit' : 'In full'} />}
            </dl>
            {b.details && <div className="text-sm whitespace-pre-wrap rounded-lg bg-[var(--cr-tan)]/40 p-3">{b.details}</div>}

            {b.items.length > 0 && (
              <ul className="text-sm space-y-1">
                {b.items.map((i, idx) => <li key={idx} className="flex justify-between"><span>{i.label}{i.qty > 1 ? ` × ${i.qty}` : ''}</span><span className="font-bold">{formatMoney(i.totalCents)}</span></li>)}
                {b.custom_requests.map(r => <li key={r} className="flex justify-between text-[var(--cr-red)] font-bold"><span>{r}</span><span>needs price</span></li>)}
                {b.discount_cents > 0 && <li className="flex justify-between"><span>Promo {b.promo_code}</span><span className="font-bold">-{formatMoney(b.discount_cents)}</span></li>}
              </ul>
            )}

            {payments.length > 0 && (
              <div className="text-sm">
                <div className="cr-label mb-1">Payments</div>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between"><span>{new Date(p.created_at).toLocaleDateString()} · {p.kind}</span><span className="font-bold">{formatMoney(p.amount_cents, { always2: true })}</span></div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Field label="Status">
              <select className="cr-input !text-[15px] !py-2.5" value={b.status} onChange={e => onPatch({ status: e.target.value })}>
                {BOOKING_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={b.kind === 'custom' ? 'Quote total' : 'Total'} hint={b.kind === 'custom' && b.status === 'quote_requested' ? 'Setting a price marks it Quote sent' : 'Adjust for custom add ons or travel'}>
                <Money cents={total} onChange={setTotal} />
              </Field>
              <Field label="Deposit" hint="Auto set from your deposit rule when the total changes">
                <Money cents={deposit} onChange={setDeposit} />
              </Field>
              <Field label="Shoot date"><input type="date" className="cr-input !text-[15px] !py-2.5" value={date} onChange={e => setDate(e.target.value)} /></Field>
              <Field label="Time"><input className="cr-input !text-[15px] !py-2.5" value={time} onChange={e => setTime(e.target.value)} /></Field>
              <Field label="Turnaround" className="col-span-2"><input className="cr-input !text-[15px] !py-2.5" value={turnaround} onChange={e => setTurnaround(e.target.value)} /></Field>
            </div>
            <Field label="Private notes"><textarea className="cr-input !text-[15px]" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
            {changed && (
              <button onClick={saveEdits} disabled={saving} className="cr-btn cr-btn-red cr-btn-sm w-full">{saving ? <Loader2 className="animate-spin" size={14} /> : null} Save booking changes</button>
            )}

            <div className="rounded-xl border-2 border-[var(--cr-ink)] p-3 bg-[var(--cr-paper)]">
              <div className="cr-label mb-1">Client payment link</div>
              <p className="text-xs text-[var(--cr-muted)] mb-2">
                {balance > 0 && b.status !== 'quote_requested'
                  ? `Send this link. The client can pay ${b.amount_paid_cents ? `the ${formatMoney(balance)} balance` : 'online'} from it.`
                  : 'The client can check status here anytime.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                  className="cr-btn cr-btn-ink cr-btn-sm flex-1"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
                </button>
                <a href={link} target="_blank" rel="noreferrer" className="cr-btn cr-btn-paper cr-btn-sm" aria-label="Open client page"><ExternalLink size={14} /></a>
              </div>
            </div>

            <button onClick={onDelete} className="text-xs font-bold text-[var(--cr-red)] inline-flex items-center gap-1"><Trash2 size={12} /> Delete booking</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{k}</dt>
      <dd className="font-semibold break-words">{v}</dd>
    </div>
  )
}
