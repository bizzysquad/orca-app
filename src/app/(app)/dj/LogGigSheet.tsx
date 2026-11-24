'use client'

// Log gig: record past gigs after the fact. Pick one or many dates, a client,
// the amount and how it was paid. Each date becomes a completed gig with its
// payment recorded, so Smart Stack's DJ earnings pick it up automatically.

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { DJGig, GigType } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { Button, Field, Choice, Sheet, useField } from '@/components/ui/kit'
import { localISO } from '@/lib/djRecurring'

export const PAY_METHODS = ['Cash', 'Zelle', 'Cash App', 'Venmo', 'Card', 'Check', 'Other'] as const

const GIG_TYPES: GigType[] = ['wedding', 'birthday', 'corporate', 'nightclub', 'bar', 'festival', 'private', 'other']
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const gid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const pretty = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

type PayStatus = 'paid' | 'deposit' | 'unpaid'

export default function LogGigSheet({ open, gigs, gear, onClose, onLog }: {
  open: boolean
  gigs: DJGig[]
  gear: string[]
  onClose: () => void
  onLog: (newGigs: DJGig[]) => void
}) {
  const { theme } = useTheme()
  const field = useField()
  const today = localISO(new Date())

  const [clients, setClients] = useState<any[]>([])
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [venue, setVenue] = useState('')
  const [eventType, setEventType] = useState<GigType>('nightclub')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<string>('Cash')
  const [status, setStatus] = useState<PayStatus>('paid')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })

  useEffect(() => {
    if (!open) return
    try { setClients(JSON.parse(localStorage.getItem('orca-dj-client-db') || '[]')) } catch { setClients([]) }
    const d = new Date()
    setView({ y: d.getFullYear(), m: d.getMonth() })
    setClientId(''); setName(''); setEmail(''); setPhone(''); setVenue(''); setEventType('nightclub')
    setAmount(''); setMethod('Cash'); setStatus('paid'); setDeposit(''); setNotes(''); setDates([])
  }, [open])

  const pickClient = (id: string) => {
    setClientId(id)
    const c = clients.find(x => x.id === id)
    if (!c) { setName(''); setEmail(''); setPhone(''); return }
    setName(c.name || ''); setEmail(c.email || ''); setPhone(c.phone || '')
    if (c.venue) setVenue(c.venue)
    if (c.rate) setAmount(String(c.rate))
    if (c.eventType) setEventType(c.eventType)
  }

  // Dates where this client already has a gig: skipped so nothing is logged twice.
  const clientKey = (email || name).trim().toLowerCase()
  const taken = useMemo(() => new Set(
    gigs.filter(g => g.status !== 'cancelled' && clientKey && (g.clientEmail || g.clientName || '').trim().toLowerCase() === clientKey).map(g => g.date)
  ), [gigs, clientKey])
  const newDates = dates.filter(d => !taken.has(d)).sort()
  const dupDates = dates.filter(d => taken.has(d)).sort()

  const amt = parseFloat(amount) || 0
  const dep = parseFloat(deposit) || 0
  const canSave = !!name.trim() && newDates.length > 0 && amt > 0 && (status !== 'deposit' || (dep > 0 && dep <= amt))

  const toggle = (iso: string) => setDates(ds => (ds.includes(iso) ? ds.filter(d => d !== iso) : [...ds, iso]))

  const save = () => {
    if (!canSave) return
    const now = new Date().toISOString()
    const out: DJGig[] = newDates.map(date => {
      const paid = status === 'paid' ? amt : status === 'deposit' ? dep : 0
      return {
        id: gid(),
        clientName: name.trim(),
        clientEmail: email.trim() || undefined,
        clientPhone: phone.trim() || undefined,
        eventType,
        date,
        startTime: '',
        endTime: '',
        venue: venue.trim(),
        status: 'completed',
        contractAmount: amt,
        fee: amt,
        depositAmount: 0,
        depositPaid: false,
        partialPayments: paid > 0 ? [{ id: gid(), amount: paid, date, method, note: status === 'deposit' ? 'Deposit' : undefined }] : [],
        balancePaid: status === 'paid',
        gearChecklist: gear.map((item, i) => ({ id: String(i), item, checked: true })),
        notes: notes.trim() || undefined,
        createdAt: now,
      }
    })
    onLog(out)
  }

  // Month grid (Sunday first). Future days can't be picked.
  const first = new Date(view.y, view.m, 1)
  const daysIn = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => localISO(new Date(view.y, view.m, i + 1)))]
  const atThisMonth = view.y === new Date().getFullYear() && view.m === new Date().getMonth()
  const shift = (dir: number) => setView(v => { const d = new Date(v.y, v.m + dir, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  const total = newDates.length * amt
  const received = newDates.length * (status === 'paid' ? amt : status === 'deposit' ? dep : 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log past gigs"
      sub="Record gigs you already played. Pick one date or several for a regular client."
      footer={<>
        <Button className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" variant="primary" disabled={!canSave} onClick={save}>
          {newDates.length > 1 ? `Log ${newDates.length} gigs` : 'Log gig'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Client">
          <select value={clientId} onChange={e => pickClient(e.target.value)} {...field}>
            <option value="">New client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.venue ? ` · ${c.venue}` : ''}</option>)}
          </select>
        </Field>
        {!clientId && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client name"><input value={name} onChange={e => setName(e.target.value)} {...field} /></Field>
            <Field label="Phone (optional)"><input value={phone} onChange={e => setPhone(e.target.value)} {...field} /></Field>
          </div>
        )}

        <Field label={`Dates played${dates.length ? ` · ${dates.length} picked` : ''}`} group>
          <div className="rounded-xl p-3" style={{ border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: theme.subtext }}><ChevronLeft size={16} /></button>
              <span className="text-[13px] font-medium" style={{ color: theme.text }}>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button type="button" onClick={() => shift(1)} disabled={atThisMonth} aria-label="Next month" className="w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30" style={{ color: theme.subtext }}><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-[10.5px] py-1" style={{ color: theme.subtext }}>{d}</span>)}
              {cells.map((iso, i) => {
                if (!iso) return <span key={i} />
                const future = iso > today
                const on = dates.includes(iso)
                const dup = taken.has(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={future}
                    onClick={() => toggle(iso)}
                    aria-pressed={on}
                    aria-label={pretty(iso)}
                    className="h-9 rounded-lg text-[13px] tnum disabled:opacity-25 relative"
                    style={{
                      backgroundColor: on ? theme.accent : 'transparent',
                      color: on ? theme.bg : theme.text,
                      border: `1px solid ${on ? theme.accent : 'transparent'}`,
                    }}
                  >
                    {Number(iso.slice(8))}
                    {dup && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: on ? theme.bg : theme.subtext }} />}
                  </button>
                )
              })}
            </div>
          </div>
        </Field>
        {dates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...dates].sort().map(d => (
              <span key={d} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full text-[12px]" style={{ border: `1px solid ${theme.border}`, color: taken.has(d) ? theme.subtext : theme.text }}>
                {pretty(d)}
                <button type="button" onClick={() => toggle(d)} aria-label={`Remove ${pretty(d)}`} className="w-5 h-5 flex items-center justify-center"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {dupDates.length > 0 && (
          <p className="text-[12.5px]" style={{ color: theme.warn }}>
            {name || 'This client'} already has a gig on {dupDates.map(pretty).join(', ')}. {dupDates.length === 1 ? 'That date' : 'Those dates'} will be skipped.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={newDates.length > 1 ? 'Earned per gig ($)' : 'Earned ($)'}><input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} {...field} /></Field>
          <Field label="Venue"><input value={venue} onChange={e => setVenue(e.target.value)} {...field} /></Field>
        </div>

        <Field label="Payment" group>
          <Choice<PayStatus> value={status} onChange={setStatus} options={[{ value: 'paid', label: 'Paid in full' }, { value: 'deposit', label: 'Deposit only' }, { value: 'unpaid', label: 'Not paid yet' }]} />
        </Field>
        {status === 'deposit' && (
          <Field label={newDates.length > 1 ? 'Deposit received per gig ($)' : 'Deposit received ($)'}><input type="number" inputMode="decimal" value={deposit} onChange={e => setDeposit(e.target.value)} {...field} /></Field>
        )}
        {status !== 'unpaid' && (
          <Field label="Paid with" group>
            <Choice<string> value={method} onChange={setMethod} options={PAY_METHODS.map(m => ({ value: m, label: m }))} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Event type">
            <select value={eventType} onChange={e => setEventType(e.target.value as GigType)} {...field}>
              {GIG_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
            </select>
          </Field>
          <Field label="Notes (optional)"><input value={notes} onChange={e => setNotes(e.target.value)} {...field} /></Field>
        </div>

        {newDates.length > 0 && amt > 0 && (
          <p className="text-[12.5px]" style={{ color: theme.subtext }}>
            {newDates.length} gig{newDates.length === 1 ? '' : 's'} · {fmt(total)} total · {fmt(received)} received{total - received > 0 ? ` · ${fmt(total - received)} still owed` : ''}
          </p>
        )}
      </div>
    </Sheet>
  )
}
