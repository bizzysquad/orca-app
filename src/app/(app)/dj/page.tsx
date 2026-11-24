'use client'

// DJ Maskoff admin (2026-11 redesign). Layout rebuilt on the shared UI kit;
// gig, payment, sync, quote, email, client and website logic is unchanged.
// New: Settings → Recurring events (see src/lib/djRecurring.ts).

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Check, Clock, MapPin, Phone, Mail, Trash2, ChevronRight, Edit3, X, Users,
  AlertCircle, AlertTriangle, Send, Copy, Loader2, CheckCircle2, RefreshCw, ExternalLink,
  Pause, Play, Repeat, Upload, Star, Ban, ChevronDown, ChevronUp, History,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import type { DJGig, GigStatus, GigType, DJPartialPayment } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { syncDjCalendar, setLocalSynced } from '@/lib/syncEngine'
import {
  PageShell, PageHeader, Panel, PanelTitle, MiniStat, Bar, Button, IconButton, RowMenu,
  Disclosure, EmptyState, useField, Field, Choice, Sheet,
} from '@/components/ui/kit'
import { Segmented } from '@/components/layout/CustomizePanel'
import { MonthSwitcher } from '@/components/ui/kit'
import LogGigSheet, { PAY_METHODS } from './LogGigSheet'
import {
  RECURRING_KEY, WEEKDAYS, type GigSeries, reconcileSeries, readSeries, describeSeries, localISO, isEditableOccurrence,
} from '@/lib/djRecurring'

const DEFAULT_GEAR = [
  'Controller / CDJs',
  'Mixer',
  'Laptop + software',
  'Headphones',
  'Power strips / cables',
  'Speaker cables',
  'USB drives (music)',
  'Phone charger',
  'Business cards',
  'Invoice ready',
]

// Brand colors used only by the hidden calendar tools below.
const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_RED = '#EF4444'
const DJ_PINK = '#F43F5E'

const GIG_TYPES: GigType[] = ['wedding', 'birthday', 'corporate', 'nightclub', 'bar', 'festival', 'private', 'other']
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: 'blast' | 'invoice' | 'confirmation' | 'followup' | 'custom'
  createdAt: string
}

interface BookingRequest {
  id: string
  client_name: string
  client_email: string
  client_phone?: string
  event_type: string
  date: string
  city: string
  location?: string
  start_time?: string
  end_time?: string
  guest_count?: number
  mc_needed?: boolean
  special_requests?: string
  budget_range?: string
  status: 'pending' | 'confirmed' | 'declined'
  created_at: string
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-confirm',
    name: 'Booking Confirmation',
    subject: 'Your Booking is Confirmed – {eventType} on {date}',
    body: 'Hi {clientName},\n\nGreat news — your booking has been confirmed!\n\nEvent: {eventType}\nDate: {date}\nVenue: {venue}\n\nContract Amount: {contractAmount}\nDeposit Due: {depositAmount}\n\nPlease reach out if you have any questions. I look forward to making your event unforgettable!\n\nBest,\n[Your Name]',
    type: 'confirmation',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-invoice',
    name: 'Invoice',
    subject: 'Invoice – DJ Services – {eventType} on {date}',
    body: 'Hi {clientName},\n\nThank you for having me at your event! Please find your invoice details below.\n\n──────────────────────\nINVOICE\n──────────────────────\nEvent: {eventType}\nDate: {date}\nVenue: {venue}\n\nContract Total:  {contractAmount}\nDeposit Paid:    {depositAmount}\nBalance Due:     {balanceDue}\n──────────────────────\n\nPayment is due within 7 days. Please contact me if you have any questions.\n\nThank you,\n[Your Name]',
    type: 'invoice',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-followup',
    name: 'Follow-up',
    subject: 'Following Up – DJ Services for Your {eventType}',
    body: 'Hi {clientName},\n\nI wanted to follow up regarding DJ services for your upcoming {eventType}.\n\nI would love to help make your event memorable. Please let me know if you have any questions or would like to move forward with a booking.\n\nLooking forward to hearing from you!\n\nBest,\n[Your Name]',
    type: 'followup',
    createdAt: new Date().toISOString(),
  },
]

function gid() { return Math.random().toString(36).slice(2, 10) }

function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m || 0).padStart(2, '0')} ${period}`
}

function BLANK_GIG(): Partial<DJGig> {
  return {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventType: 'private' as GigType,
    date: '',
    startTime: '20:00',
    endTime: '23:00',
    venue: '',
    eventAddress: '',
    status: 'confirmed' as GigStatus,
    contractAmount: 0,
    fee: 0,
    depositAmount: 0,
    depositPaid: false,
    partialPayments: [],
    balancePaid: false,
    notes: '',
    gearChecklist: DEFAULT_GEAR.map((item, i) => ({ id: String(i), item, checked: false })),
  }
}

function calcRemaining(gig: DJGig): number {
  const contract = gig.contractAmount || gig.fee || 0
  const deposit = gig.depositPaid ? (gig.depositAmount || 0) : 0
  const partials = (gig.partialPayments || []).reduce((s, p) => s + p.amount, 0)
  return Math.max(0, contract - deposit - partials)
}

function calcTotalPaid(gig: DJGig): number {
  const deposit = gig.depositPaid ? (gig.depositAmount || 0) : 0
  const partials = (gig.partialPayments || []).reduce((s, p) => s + p.amount, 0)
  return deposit + partials
}

function useStatusColor() {
  const { theme } = useTheme()
  return (s: GigStatus) => ({ confirmed: theme.ok, completed: theme.subtext, cancelled: theme.bad, pending: theme.warn, inquiry: theme.subtext }[s] || theme.subtext)
}
const STATUS_LABEL: Record<GigStatus, string> = { inquiry: 'Inquiry', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }

function DateBlock({ date }: { date: string }) {
  const { theme } = useTheme()
  const d = date ? new Date(date + 'T00:00:00') : null
  return (
    <div className="w-11 text-center shrink-0">
      <p className="text-[10px] uppercase tracking-wide" style={{ color: theme.subtext }}>{d ? d.toLocaleDateString('en-US', { month: 'short' }) : '—'}</p>
      <p className="text-[17px] font-semibold tnum leading-tight" style={{ color: theme.text }}>{d ? d.getDate() : ''}</p>
      <p className="text-[10px]" style={{ color: theme.subtext }}>{d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : ''}</p>
    </div>
  )
}

// ── Payments ──────────────────────────────────────────────────────────────
function PaymentPanel({ gig, onUpdate }: { gig: DJGig; onUpdate: (updated: DJGig) => void }) {
  const { theme } = useTheme()
  const field = useField()
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [editingPartialId, setEditingPartialId] = useState<string | null>(null)
  const [editingPartialAmount, setEditingPartialAmount] = useState('')
  const [editingPartialNote, setEditingPartialNote] = useState('')

  const contract = gig.contractAmount || gig.fee || 0
  const remaining = calcRemaining(gig)
  const totalPaid = calcTotalPaid(gig)
  const paidPct = contract > 0 ? Math.min((totalPaid / contract) * 100, 100) : 0

  const toggleDeposit = () => onUpdate({ ...gig, depositPaid: !gig.depositPaid })

  const addPartialPayment = () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    const payment: DJPartialPayment = { id: gid(), amount: amt, date: localISO(new Date()), note: payNote || undefined, method: payMethod || undefined }
    const updated = { ...gig, partialPayments: [...(gig.partialPayments || []), payment] }
    if (calcRemaining(updated) <= 0) updated.balancePaid = true
    onUpdate(updated)
    setPayAmount('')
    setPayNote('')
    setPayMethod('')
    setShowAddPayment(false)
  }

  const removePartial = (id: string) => onUpdate({ ...gig, partialPayments: (gig.partialPayments || []).filter(p => p.id !== id) })

  const saveEditPartial = () => {
    if (!editingPartialId) return
    const amt = parseFloat(editingPartialAmount)
    if (!amt || amt <= 0) return
    onUpdate({
      ...gig,
      partialPayments: (gig.partialPayments || []).map(p => (p.id === editingPartialId ? { ...p, amount: amt, note: editingPartialNote || undefined } : p)),
    })
    setEditingPartialId(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs" style={{ color: theme.subtext }}>Balance due</span>
          <span className="text-[24px] font-semibold tnum" style={{ color: remaining <= 0 ? theme.ok : theme.text }}>{remaining <= 0 ? 'Paid' : fmt(remaining)}</span>
        </div>
        <Bar pct={paidPct} color={paidPct >= 100 ? theme.ok : theme.accent} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <MiniStat label="Contract" value={fmt(contract)} />
          <MiniStat label="Paid so far" value={fmt(totalPaid)} tone={totalPaid > 0 ? theme.ok : undefined} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ border: `1px solid ${theme.border}` }}>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium" style={{ color: theme.text }}>Deposit</p>
          <p className="text-xs tnum" style={{ color: theme.subtext }}>{fmt(gig.depositAmount || 0)}</p>
        </div>
        <Button size="sm" variant={gig.depositPaid ? 'secondary' : 'primary'} onClick={toggleDeposit}>
          {gig.depositPaid ? <><Check size={13} style={{ color: theme.ok }} /> Received</> : 'Mark received'}
        </Button>
      </div>

      {(gig.partialPayments || []).length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: theme.subtext }}>Payments</p>
          <ul>
            {(gig.partialPayments || []).map((p, i) => (
              <li key={p.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                {editingPartialId === p.id ? (
                  <div className="py-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" inputMode="decimal" value={editingPartialAmount} onChange={e => setEditingPartialAmount(e.target.value)} aria-label="Amount" {...field} />
                      <input value={editingPartialNote} onChange={e => setEditingPartialNote(e.target.value)} placeholder="Note" aria-label="Note" {...field} />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" onClick={() => setEditingPartialId(null)}>Cancel</Button>
                      <Button className="flex-1" size="sm" variant="primary" onClick={saveEditPartial}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <Check size={13} style={{ color: theme.ok }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium tnum" style={{ color: theme.text }}>{fmt(p.amount)}</p>
                      {(p.note || p.method) && <p className="text-[11.5px] truncate" style={{ color: theme.subtext }}>{[p.method, p.note].filter(Boolean).join(' · ')}</p>}
                    </div>
                    <span className="text-xs" style={{ color: theme.subtext }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <RowMenu label="Payment actions" items={[
                      { label: 'Edit', icon: Edit3, onClick: () => { setEditingPartialId(p.id); setEditingPartialAmount(String(p.amount)); setEditingPartialNote(p.note || '') } },
                      { label: 'Remove', icon: Trash2, danger: true, onClick: () => removePartial(p.id) },
                    ]} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAddPayment ? (
        <div className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${theme.border}` }}>
          <p className="text-[13px] font-medium" style={{ color: theme.text }}>Log a payment</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" inputMode="decimal" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount" aria-label="Amount" autoFocus {...field} />
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" {...field} />
          </div>
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} aria-label="Paid with" {...field}>
            <option value="">Paid with (optional)</option>
            {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex gap-2">
            <Button className="flex-1" size="sm" onClick={() => setShowAddPayment(false)}>Cancel</Button>
            <Button className="flex-1" size="sm" variant="primary" disabled={!payAmount} onClick={addPartialPayment}>Save payment</Button>
          </div>
        </div>
      ) : remaining > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => { setPayAmount(String(remaining)); setShowAddPayment(true) }}>Paid in full</Button>
          <Button onClick={() => { setPayAmount(String(Math.round((remaining / 2) * 100) / 100)); setShowAddPayment(true) }}>Paid half</Button>
          <Button onClick={() => { setPayAmount(''); setShowAddPayment(true) }}>Other amount</Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setShowAddPayment(true)}><Plus size={14} /> Log a payment</Button>
      )}
    </div>
  )
}

// ── Edit gig ──────────────────────────────────────────────────────────────
function GigEditForm({ gig, onSave, onCancel }: { gig: DJGig; onSave: (updated: DJGig) => void; onCancel: () => void }) {
  const field = useField()
  const [form, setForm] = useState<DJGig>({ ...gig })
  const f = (patch: Partial<DJGig>) => setForm(p => ({ ...p, ...patch }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client name"><input value={form.clientName} onChange={e => f({ clientName: e.target.value })} {...field} /></Field>
        <Field label="Phone"><input value={form.clientPhone || ''} onChange={e => f({ clientPhone: e.target.value })} {...field} /></Field>
      </div>
      <Field label="Email"><input type="email" value={form.clientEmail || ''} onChange={e => f({ clientEmail: e.target.value })} {...field} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Venue"><input value={form.venue} onChange={e => f({ venue: e.target.value })} {...field} /></Field>
        <Field label="Address"><input value={form.eventAddress || ''} onChange={e => f({ eventAddress: e.target.value })} {...field} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={form.date} onChange={e => f({ date: e.target.value })} {...field} /></Field>
        <Field label="Status">
          <select value={form.status} onChange={e => f({ status: e.target.value as GigStatus })} {...field}>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Start time"><input type="time" value={form.startTime} onChange={e => f({ startTime: e.target.value })} {...field} /></Field>
        <Field label="End time"><input type="time" value={form.endTime} onChange={e => f({ endTime: e.target.value })} {...field} /></Field>
        <Field label="Contract ($)"><input type="number" inputMode="decimal" value={form.contractAmount || form.fee || ''} onChange={e => f({ contractAmount: Number(e.target.value), fee: Number(e.target.value) })} {...field} /></Field>
        <Field label="Deposit ($)"><input type="number" inputMode="decimal" value={form.depositAmount || ''} onChange={e => f({ depositAmount: Number(e.target.value) })} {...field} /></Field>
      </div>
      <Field label="Event type">
        <select
          value={form.customEventType !== undefined ? '__custom__' : form.eventType}
          onChange={e => {
            const val = e.target.value
            if (val === '__custom__') f({ eventType: 'other', customEventType: form.customEventType || '' })
            else f({ eventType: val as GigType, customEventType: undefined })
          }}
          {...field}
        >
          {GIG_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
      </Field>
      {form.customEventType !== undefined && (
        <Field label="Custom event name"><input value={form.customEventType || ''} onChange={e => f({ customEventType: e.target.value })} {...field} /></Field>
      )}
      <Field label="Ticket link (optional)"><input value={form.ticketLink || ''} onChange={e => f({ ticketLink: e.target.value })} placeholder="https://" {...field} /></Field>
      <Field label="Notes"><textarea rows={3} value={form.notes || ''} onChange={e => f({ notes: e.target.value })} {...field} className={`${field.className} h-auto py-2`} /></Field>
      <Field label="Deposit received" group>
        <Choice value={form.depositPaid ? 'yes' : 'no'} onChange={v => f({ depositPaid: v === 'yes' })} options={[{ value: 'no', label: 'Not yet' }, { value: 'yes', label: 'Received' }]} />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" variant="primary" onClick={() => onSave(form)}>Save changes</Button>
      </div>
    </div>
  )
}

// ── Gig detail sheet ──────────────────────────────────────────────────────
function GigSheet({ gig, onClose, onUpdate, onDelete }: { gig: DJGig | null; onClose: () => void; onUpdate: (g: DJGig) => void; onDelete: (id: string) => void }) {
  const { theme } = useTheme()
  const statusColor = useStatusColor()
  const [tab, setTab] = useState<'overview' | 'payments' | 'gear' | 'edit'>('overview')
  useEffect(() => { setTab('overview') }, [gig?.id])
  if (!gig) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const gearDone = gig.gearChecklist.filter(g => g.checked).length
  const toggleGear = (itemId: string) => onUpdate({ ...gig, gearChecklist: gig.gearChecklist.map(i => (i.id === itemId ? { ...i, checked: !i.checked } : i)) })
  const typeLabel = gig.customEventType || cap(gig.eventType)

  return (
    <Sheet
      open
      onClose={onClose}
      title={gig.clientName || 'Gig'}
      sub={<span>{new Date(gig.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{typeLabel ? ` · ${typeLabel}` : ''}{gig.seriesId ? ' · Recurring' : ''}</span>}
    >
      <div className="mb-4 overflow-x-auto no-scrollbar">
        <Segmented size="sm" value={tab} onChange={v => setTab(v as typeof tab)} options={[
          { value: 'overview', label: 'Overview' }, { value: 'payments', label: 'Payments' },
          { value: 'gear', label: `Gear ${gearDone}/${gig.gearChecklist.length}` }, { value: 'edit', label: 'Edit' },
        ]} />
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-[13.5px]">
            {gig.venue && <li className="flex items-start gap-2.5" style={{ color: theme.text }}><MapPin size={15} className="mt-0.5 shrink-0" style={{ color: theme.subtext }} />{gig.venue}{gig.eventAddress ? `, ${gig.eventAddress}` : ''}</li>}
            <li className="flex items-center gap-2.5" style={{ color: theme.text }}><Clock size={15} style={{ color: theme.subtext }} />{to12Hour(gig.startTime)} to {to12Hour(gig.endTime)}</li>
            {gig.clientEmail && <li className="flex items-center gap-2.5"><Mail size={15} style={{ color: theme.subtext }} /><a href={`mailto:${gig.clientEmail}`} style={{ color: theme.accent }}>{gig.clientEmail}</a></li>}
            {gig.clientPhone && <li className="flex items-center gap-2.5"><Phone size={15} style={{ color: theme.subtext }} /><a href={`tel:${gig.clientPhone}`} style={{ color: theme.accent }}>{gig.clientPhone}</a></li>}
            {gig.ticketLink && <li className="flex items-center gap-2.5"><ExternalLink size={15} style={{ color: theme.subtext }} /><a href={gig.ticketLink} target="_blank" rel="noreferrer" style={{ color: theme.accent }} className="truncate">Ticket link</a></li>}
          </ul>
          {gig.notes && <p className="text-[13px] rounded-xl px-3 py-2.5 whitespace-pre-wrap" style={{ backgroundColor: `${theme.text}08`, color: theme.text }}>{gig.notes}</p>}
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Contract" value={fmt(gig.contractAmount || gig.fee || 0)} />
            <MiniStat label="Balance due" value={calcRemaining(gig) > 0 ? fmt(calcRemaining(gig)) : 'Paid'} tone={calcRemaining(gig) > 0 ? undefined : theme.ok} />
          </div>
          <Field label="Status" group>
            <Choice
              value={gig.status}
              onChange={v => onUpdate({ ...gig, status: v as GigStatus })}
              options={(['confirmed', 'completed', 'cancelled'] as GigStatus[]).map(s => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          </Field>
          <p className="text-xs flex items-center gap-1.5" style={{ color: statusColor(gig.status) }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(gig.status) }} />{STATUS_LABEL[gig.status]}</p>
          <div className="pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
            <Button variant="danger" onClick={() => { onDelete(gig.id); onClose() }}><Trash2 size={14} /> Delete gig{gig.seriesId ? ' (skips this date)' : ''}</Button>
          </div>
        </div>
      )}

      {tab === 'payments' && <PaymentPanel gig={gig} onUpdate={onUpdate} />}

      {tab === 'gear' && (
        <ul>
          {gig.gearChecklist.length === 0 && <p className="text-[13px]" style={{ color: theme.subtext }}>No gear list on this gig.</p>}
          {gig.gearChecklist.map((g, i) => (
            <li key={g.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
              <button onClick={() => toggleGear(g.id)} className="w-full flex items-center gap-3 py-2.5 text-left">
                <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: g.checked ? theme.accent : 'transparent', border: `1.5px solid ${g.checked ? theme.accent : theme.subtext}` }}>
                  {g.checked && <Check size={11} color={theme.bg} strokeWidth={3} />}
                </span>
                <span className="text-[13.5px]" style={{ color: g.checked ? theme.subtext : theme.text, textDecoration: g.checked ? 'line-through' : undefined }}>{g.item}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'edit' && <GigEditForm key={gig.id} gig={gig} onSave={u => { onUpdate(u); setTab('overview') }} onCancel={() => setTab('overview')} />}
    </Sheet>
  )
}

// ── Clients ───────────────────────────────────────────────────────────────
function CRMPanel({ gigs, quotes, onBookAgain }: { gigs: DJGig[]; quotes: BookingRequest[]; onBookAgain: (data: Partial<DJGig>) => void }) {
  const { theme } = useTheme()
  const field = useField()
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clientDb, setClientDb] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('orca-dj-client-db') || '[]') } catch { return [] } })
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(() => { try { const raw = localStorage.getItem('orca-dj-deleted-clients'); return raw ? new Set(JSON.parse(raw)) : new Set() } catch { return new Set() } })
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [query, setQuery] = useState('')

  const saveDb = (db: any[]) => { setClientDb(db); try { setLocalSynced('orca-dj-client-db', JSON.stringify(db)) } catch {} }
  const saveDeletedKeys = (keys: Set<string>) => { setDeletedKeys(keys); try { setLocalSynced('orca-dj-deleted-clients', JSON.stringify(Array.from(keys))) } catch {} }

  // Auto-import clients from gigs/quotes into the DB (skip deleted ones)
  useMemo(() => {
    let updated = false
    const db = [...clientDb]
    const existingKeys = new Set(db.map((c: any) => (c.email || c.name).toLowerCase()))
    gigs.forEach(g => {
      if (!g.clientName) return
      const key = (g.clientEmail || g.clientName).toLowerCase()
      if (!existingKeys.has(key) && !deletedKeys.has(key)) {
        db.push({ id: gid(), name: g.clientName, email: g.clientEmail || '', phone: g.clientPhone || '', venue: g.venue || '', address: g.eventAddress || '', rate: g.contractAmount || g.fee || 0, deposit: g.depositAmount || 0, eventType: g.eventType || '' })
        existingKeys.add(key)
        updated = true
      }
    })
    quotes.forEach(q => {
      if (!q.client_name || q.client_name.startsWith('__')) return
      const key = (q.client_email || q.client_name).toLowerCase()
      if (!existingKeys.has(key) && !deletedKeys.has(key)) {
        db.push({ id: gid(), name: q.client_name, email: q.client_email || '', phone: q.client_phone || '' })
        existingKeys.add(key)
        updated = true
      }
    })
    try {
      const history = JSON.parse(localStorage.getItem('orca-dj-client-history') || '[]')
      history.forEach((h: any) => {
        if (!h.name) return
        const key = (h.email || h.name).toLowerCase()
        if (!existingKeys.has(key) && !deletedKeys.has(key)) {
          db.push({ id: gid(), name: h.name, email: h.email || '', phone: h.phone || '' })
          existingKeys.add(key)
          updated = true
        }
      })
    } catch {}
    if (updated) saveDb(db)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigs.length, quotes.length])

  const gigsByClient = useMemo(() => {
    const m = new Map<string, DJGig[]>()
    gigs.forEach(g => { if (!g.clientName) return; const k = (g.clientEmail || g.clientName).toLowerCase(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(g) })
    return m
  }, [gigs])

  const submit = () => {
    if (!editForm.name) return
    if (editingId) saveDb(clientDb.map(c => (c.id === editingId ? { ...c, ...editForm } : c)))
    else saveDb([...clientDb, { id: gid(), ...editForm }])
    setEditingId(null)
    setEditForm({})
    setFormOpen(false)
  }

  const deleteClient = (id: string) => {
    const client = clientDb.find(c => c.id === id)
    if (client) {
      const next = new Set(deletedKeys)
      next.add((client.email || client.name).toLowerCase())
      saveDeletedKeys(next)
    }
    saveDb(clientDb.filter(c => c.id !== id))
    setExpandedClient(null)
  }

  const shown = clientDb.filter((c: any) => !query || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients" aria-label="Search clients" {...field} />
        <Button variant="primary" onClick={() => { setEditingId(null); setEditForm({ name: '', email: '', phone: '', venue: '', rate: '' }); setFormOpen(true) }}><Plus size={15} /> Add</Button>
      </div>

      {clientDb.length === 0 ? (
        <EmptyState title="No clients yet" sub="Clients from gigs and quotes are added here automatically." />
      ) : (
        <Panel pad={false}>
          <ul>
            {shown.map((client: any, i: number) => {
              const isExpanded = expandedClient === client.id
              const clientGigs = gigsByClient.get((client.email || client.name).toLowerCase()) || []
              const totalPaid = clientGigs.reduce((s, g) => s + calcTotalPaid(g), 0)
              const sorted = [...clientGigs].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              return (
                <li key={client.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setExpandedClient(isExpanded ? null : client.id)} aria-expanded={isExpanded}>
                      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold" style={{ backgroundColor: `${theme.text}0d`, color: theme.text }}>{(client.name || '?').charAt(0).toUpperCase()}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{client.name}</p>
                        <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact info'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-medium tnum" style={{ color: theme.text }}>{totalPaid > 0 ? fmt(totalPaid) : ''}</p>
                        <p className="text-[11px]" style={{ color: theme.subtext }}>{clientGigs.length} gig{clientGigs.length !== 1 ? 's' : ''}</p>
                      </div>
                    </button>
                    <Button size="sm" variant="primary" onClick={() => {
                      const lastGig = sorted[0]
                      onBookAgain(lastGig
                        ? { clientName: lastGig.clientName, clientEmail: lastGig.clientEmail, clientPhone: lastGig.clientPhone, eventType: lastGig.eventType, venue: lastGig.venue, eventAddress: lastGig.eventAddress, contractAmount: lastGig.contractAmount, fee: lastGig.fee, depositAmount: lastGig.depositAmount, startTime: lastGig.startTime, endTime: lastGig.endTime, notes: lastGig.notes }
                        : { clientName: client.name, clientEmail: client.email, clientPhone: client.phone, venue: client.venue, contractAmount: client.rate, fee: client.rate, depositAmount: client.deposit })
                    }}>Book</Button>
                    <RowMenu label={`More actions for ${client.name}`} items={[
                      { label: 'Edit', icon: Edit3, onClick: () => { setEditingId(client.id); setEditForm({ name: client.name, email: client.email, phone: client.phone, venue: client.venue || '', rate: client.rate || '' }); setFormOpen(true) } },
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteClient(client.id) },
                    ]} />
                  </div>
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-4 sm:pl-[68px] space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                        {client.venue && <p style={{ color: theme.subtext }}>Venue <span style={{ color: theme.text }}>{client.venue}</span></p>}
                        {client.rate > 0 && <p style={{ color: theme.subtext }}>Rate <span className="tnum" style={{ color: theme.text }}>{fmt(client.rate)}</span></p>}
                      </div>
                      {sorted.length > 0 ? (
                        <ul className="rounded-xl px-3" style={{ backgroundColor: `${theme.text}06` }}>
                          {sorted.map((g, j) => (
                            <li key={g.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]" style={{ borderTop: j ? `1px solid ${theme.border}` : undefined }}>
                              <span style={{ color: theme.text }}>{g.date ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                              <span className="truncate flex-1 text-center" style={{ color: theme.subtext }}>{cap(g.eventType)}{g.venue ? ` · ${g.venue}` : ''}</span>
                              <span className="tnum" style={{ color: theme.text }}>{fmt(g.contractAmount || 0)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-[12.5px]" style={{ color: theme.subtext }}>No bookings yet.</p>}
                    </div>
                  )}
                </li>
              )
            })}
            {shown.length === 0 && <li className="px-5 py-6 text-[13px]" style={{ color: theme.subtext }}>No clients match “{query}”.</li>}
          </ul>
        </Panel>
      )}

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit client' : 'Add client'}
        footer={<>
          <Button className="flex-1" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!editForm.name} onClick={submit}>{editingId ? 'Save changes' : 'Save client'}</Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" className="col-span-2"><input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus {...field} /></Field>
          <Field label="Email"><input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} {...field} /></Field>
          <Field label="Phone"><input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} {...field} /></Field>
          <Field label="Usual venue"><input value={editForm.venue || ''} onChange={e => setEditForm({ ...editForm, venue: e.target.value })} {...field} /></Field>
          <Field label="Usual rate ($)"><input type="number" inputMode="decimal" value={editForm.rate || ''} onChange={e => setEditForm({ ...editForm, rate: Number(e.target.value) })} {...field} /></Field>
        </div>
      </Sheet>
    </div>
  )
}

// ── Email ─────────────────────────────────────────────────────────────────
function EmailPanel({ gigs }: { gigs: DJGig[] }) {
  const { theme } = useTheme()
  const field = useField()
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_TEMPLATES
    try { const saved = localStorage.getItem('orca-dj-email-templates'); if (saved) return JSON.parse(saved) } catch {}
    return DEFAULT_TEMPLATES
  })
  const [emailSubTab, setEmailSubTab] = useState<'compose' | 'templates'>('compose')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [isNewTemplate, setIsNewTemplate] = useState(false)

  const [selectedGigId, setSelectedGigId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const saveTemplates = (updated: EmailTemplate[]) => {
    setTemplates(updated)
    try { setLocalSynced('orca-dj-email-templates', JSON.stringify(updated)) } catch {}
  }
  const duplicateTemplate = (t: EmailTemplate) => saveTemplates([...templates, { ...t, id: gid(), name: `${t.name} (Copy)`, createdAt: new Date().toISOString() }])
  const deleteTemplate = (id: string) => saveTemplates(templates.filter(t => t.id !== id))
  const saveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return
    if (isNewTemplate) saveTemplates([...templates, { ...editingTemplate, name: editingTemplate.name.trim(), subject: editingTemplate.subject.trim(), body: editingTemplate.body.trim() }])
    else saveTemplates(templates.map(t => (t.id === editingTemplate.id ? editingTemplate : t)))
    setEditingTemplate(null)
  }

  const applyTemplate = (templateId: string, gigId: string) => {
    const template = templates.find(t => t.id === templateId)
    const gig = gigs.find(g => g.id === gigId)
    if (!template) return
    const replacements: Record<string, string> = {
      clientName: gig?.clientName || '',
      eventType: gig?.eventType ? cap(gig.eventType) : '',
      date: gig?.date ? new Date(gig.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '',
      venue: gig?.venue || '',
      contractAmount: fmt(gig?.contractAmount || gig?.fee || 0),
      depositAmount: fmt(gig?.depositAmount || 0),
      balanceDue: fmt(gig ? calcRemaining(gig) : 0),
    }
    let subject = template.subject
    let body = template.body
    Object.entries(replacements).forEach(([key, val]) => {
      subject = subject.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
    })
    setComposeSubject(subject)
    setComposeBody(body)
    if (gig?.clientEmail) setComposeTo(gig.clientEmail)
  }

  const sendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) return
    setSendStatus('sending')
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, text: composeBody, html: composeBody.replace(/\n/g, '<br/>') }),
      })
      setSendStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setSendStatus('idle'), 4000)
    } catch {
      setSendStatus('error')
    }
  }

  const TYPE_LABELS: Record<EmailTemplate['type'], string> = { blast: 'Blast', invoice: 'Invoice', confirmation: 'Confirmation', followup: 'Follow-up', custom: 'Custom' }
  const area = { ...field, className: `${field.className} h-auto py-2 leading-relaxed` }

  return (
    <div className="space-y-4">
      <Segmented size="sm" value={emailSubTab} onChange={v => setEmailSubTab(v as typeof emailSubTab)} options={[{ value: 'compose', label: 'Compose' }, { value: 'templates', label: `Templates · ${templates.length}` }]} />

      {emailSubTab === 'compose' && (
        <Panel>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Gig">
                <select value={selectedGigId} onChange={e => {
                  setSelectedGigId(e.target.value)
                  if (selectedTemplateId && e.target.value) applyTemplate(selectedTemplateId, e.target.value)
                  else if (e.target.value) { const gig = gigs.find(g => g.id === e.target.value); if (gig?.clientEmail) setComposeTo(gig.clientEmail) }
                }} {...field}>
                  <option value="">Choose a gig</option>
                  {[...gigs].sort((a, b) => b.date.localeCompare(a.date)).map(g => (
                    <option key={g.id} value={g.id}>{g.clientName} · {g.date ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</option>
                  ))}
                </select>
              </Field>
              <Field label="Template">
                <select value={selectedTemplateId} onChange={e => { setSelectedTemplateId(e.target.value); if (e.target.value) applyTemplate(e.target.value, selectedGigId) }} {...field}>
                  <option value="">No template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="To" hint="Separate several addresses with commas"><input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="client@email.com" {...field} /></Field>
            <Field label="Subject"><input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} {...field} /></Field>
            <Field label="Message"><textarea rows={9} value={composeBody} onChange={e => setComposeBody(e.target.value)} {...area} /></Field>
            {sendStatus === 'error' && <p className="text-xs" style={{ color: theme.bad }}>Send failed. Check that the Gmail credentials are set in the environment variables.</p>}
            <div className="flex gap-2">
              {(composeSubject || composeBody || composeTo) && (
                <Button onClick={() => { setComposeTo(''); setComposeSubject(''); setComposeBody(''); setSelectedGigId(''); setSelectedTemplateId(''); setSendStatus('idle') }}>Clear</Button>
              )}
              <Button className="flex-1" variant="primary" disabled={!composeTo.trim() || !composeSubject.trim() || sendStatus === 'sending'} onClick={sendEmail}>
                {sendStatus === 'sending' ? <><Loader2 size={14} className="animate-spin" /> Sending</> : sendStatus === 'sent' ? <><Check size={14} /> Sent</> : sendStatus === 'error' ? 'Retry' : <><Send size={14} /> Send email</>}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {emailSubTab === 'templates' && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: theme.subtext }}>Use {'{clientName} {date} {eventType} {venue} {contractAmount} {depositAmount} {balanceDue}'}</p>
            <Button size="sm" variant="primary" onClick={() => { setIsNewTemplate(true); setEditingTemplate({ id: gid(), name: '', subject: '', body: '', type: 'custom', createdAt: new Date().toISOString() }) }}><Plus size={14} /> New</Button>
          </div>
          {templates.length === 0 ? <EmptyState title="No templates" /> : (
            <Panel pad={false}>
              <ul>
                {templates.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{t.name} <span className="text-[11px] font-normal" style={{ color: theme.subtext }}>{TYPE_LABELS[t.type]}</span></p>
                      <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{t.subject}</p>
                    </div>
                    <RowMenu label={`Actions for ${t.name}`} items={[
                      { label: 'Edit', icon: Edit3, onClick: () => { setIsNewTemplate(false); setEditingTemplate({ ...t }) } },
                      { label: 'Duplicate', icon: Copy, onClick: () => duplicateTemplate(t) },
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteTemplate(t.id) },
                    ]} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Sheet
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={isNewTemplate ? 'New template' : 'Edit template'}
        footer={<>
          <Button className="flex-1" onClick={() => setEditingTemplate(null)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!editingTemplate?.name.trim()} onClick={saveTemplate}>Save template</Button>
        </>}
      >
        {editingTemplate && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} {...field} /></Field>
              <Field label="Type">
                <select value={editingTemplate.type} onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value as EmailTemplate['type'] })} {...field}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Subject"><input value={editingTemplate.subject} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} {...field} /></Field>
            <Field label="Body"><textarea rows={10} value={editingTemplate.body} onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })} {...area} /></Field>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ── Add gig ───────────────────────────────────────────────────────────────
function AddGigSheet({ open, onAdd, onClose, prefill }: { open: boolean; onAdd: (gig: DJGig) => void; onClose: () => void; prefill?: Partial<DJGig> | null }) {
  const field = useField()
  const [form, setForm] = useState<Partial<DJGig>>(BLANK_GIG())
  const [savedClients, setSavedClients] = useState<any[]>([])
  useEffect(() => {
    if (!open) return
    setForm(prefill ? { ...BLANK_GIG(), ...prefill, date: '' } : BLANK_GIG())
    try { setSavedClients(JSON.parse(localStorage.getItem('orca-dj-client-db') || '[]')) } catch { setSavedClients([]) }
  }, [open, prefill])
  const f = (patch: Partial<DJGig>) => setForm(p => ({ ...p, ...patch }))

  const selectClient = (client: any) => {
    f({ clientName: client.name, clientEmail: client.email, clientPhone: client.phone, venue: client.venue || '', eventAddress: client.address || '', contractAmount: client.rate || 0, fee: client.rate || 0, depositAmount: client.deposit || 0, eventType: client.eventType || form.eventType })
  }

  const handleAdd = () => {
    if (!form.clientName || !form.date) return
    const contract = form.contractAmount || form.fee || 0
    onAdd({
      id: Date.now().toString(),
      clientName: form.clientName || '',
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      eventType: form.eventType || 'private',
      customEventType: form.customEventType,
      ticketLink: form.ticketLink,
      date: form.date || '',
      startTime: form.startTime || '20:00',
      endTime: form.endTime || '23:00',
      venue: form.venue || '',
      eventAddress: form.eventAddress,
      status: form.status || 'confirmed',
      contractAmount: contract,
      fee: contract,
      depositAmount: form.depositAmount || 0,
      depositPaid: false,
      partialPayments: [],
      balancePaid: false,
      gearChecklist: DEFAULT_GEAR.map((item, i) => ({ id: String(i), item, checked: false })),
      notes: form.notes,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={prefill ? 'Book client again' : 'New gig'}
      footer={<>
        <Button className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" variant="primary" disabled={!form.clientName || !form.date} onClick={handleAdd}>{prefill ? 'Book' : 'Add gig'}</Button>
      </>}
    >
      <div className="space-y-3">
        {savedClients.length > 0 && !prefill && (
          <Field label="Existing client (optional)">
            <select value="" onChange={e => { const c = savedClients.find((x: any) => x.id === e.target.value); if (c) selectClient(c) }} {...field}>
              <option value="">New client</option>
              {savedClients.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client name"><input value={form.clientName || ''} onChange={e => f({ clientName: e.target.value })} autoFocus {...field} /></Field>
          <Field label="Phone"><input value={form.clientPhone || ''} onChange={e => f({ clientPhone: e.target.value })} {...field} /></Field>
        </div>
        <Field label="Email"><input type="email" value={form.clientEmail || ''} onChange={e => f({ clientEmail: e.target.value })} {...field} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" value={form.date || ''} onChange={e => f({ date: e.target.value })} {...field} /></Field>
          <Field label="Event type">
            <select value={form.customEventType !== undefined ? '__custom__' : form.eventType || 'private'} onChange={e => {
              const val = e.target.value
              if (val === '__custom__') f({ eventType: 'other', customEventType: '' })
              else f({ eventType: val as GigType, customEventType: undefined })
            }} {...field}>
              {GIG_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
              <option value="__custom__">Custom…</option>
            </select>
          </Field>
        </div>
        {form.customEventType !== undefined && (
          <Field label="Custom event name"><input value={form.customEventType || ''} onChange={e => f({ customEventType: e.target.value })} {...field} /></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time"><input type="time" value={form.startTime || ''} onChange={e => f({ startTime: e.target.value })} {...field} /></Field>
          <Field label="End time"><input type="time" value={form.endTime || ''} onChange={e => f({ endTime: e.target.value })} {...field} /></Field>
          <Field label="Venue"><input value={form.venue || ''} onChange={e => f({ venue: e.target.value })} {...field} /></Field>
          <Field label="Address"><input value={form.eventAddress || ''} onChange={e => f({ eventAddress: e.target.value })} {...field} /></Field>
          <Field label="Contract ($)"><input type="number" inputMode="decimal" value={form.contractAmount || ''} onChange={e => f({ contractAmount: Number(e.target.value), fee: Number(e.target.value) })} {...field} /></Field>
          <Field label="Deposit ($)"><input type="number" inputMode="decimal" value={form.depositAmount || ''} onChange={e => f({ depositAmount: Number(e.target.value) })} {...field} /></Field>
        </div>
        <Field label="Ticket link (optional)"><input value={form.ticketLink || ''} onChange={e => f({ ticketLink: e.target.value })} placeholder="https://" {...field} /></Field>
        <Field label="Notes"><textarea rows={2} value={form.notes || ''} onChange={e => f({ notes: e.target.value })} {...field} className={`${field.className} h-auto py-2`} /></Field>
      </div>
    </Sheet>
  )
}

// ── Recurring events (Settings) ───────────────────────────────────────────
function blankSeries(): GigSeries {
  return {
    id: gid(), name: '', clientName: '', venue: '', eventAddress: '', eventType: 'nightclub',
    days: [5, 6], startTime: '22:00', endTime: '02:00', rate: 0, depositAmount: 0,
    startDate: localISO(new Date()), endDate: '', weeksAhead: 8, paused: false, skipped: [], notes: '',
    createdAt: new Date().toISOString(),
  }
}

function RecurringPanel({ series, gigs, onSave, onDelete, onTogglePause }: {
  series: GigSeries[]
  gigs: DJGig[]
  onSave: (s: GigSeries) => void
  onDelete: (id: string) => void
  onTogglePause: (id: string) => void
}) {
  const { theme } = useTheme()
  const field = useField()
  const [draft, setDraft] = useState<GigSeries | null>(null)
  const [isNew, setIsNew] = useState(false)
  const todayISO = localISO(new Date())
  const d = (patch: Partial<GigSeries>) => setDraft(x => (x ? { ...x, ...patch } : x))

  return (
    <div className="space-y-4">
      <Panel>
        <PanelTitle
          title="Recurring events"
          sub="For nights you play every week, like Fridays and Saturdays at the same club. ORCA adds each night to your gigs automatically."
          right={<Button variant="primary" size="sm" onClick={() => { setIsNew(true); setDraft(blankSeries()) }}><Plus size={14} /> New</Button>}
        />
        {series.length === 0 ? (
          <EmptyState title="No recurring events yet" sub="Set one up once and every night shows in Gigs, on your website calendar, and in your income." action={<Button variant="primary" onClick={() => { setIsNew(true); setDraft(blankSeries()) }}><Repeat size={14} /> Add recurring event</Button>} />
        ) : (
          <ul>
            {series.map((s, i) => {
              const upcoming = gigs.filter(g => g.seriesId === s.id && g.date >= todayISO && g.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
              return (
                <li key={s.id} className="flex items-center gap-3 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined, opacity: s.paused ? 0.6 : 1 }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}><Repeat size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{s.name || s.venue}{s.paused && <span className="ml-2 text-[11px] font-normal" style={{ color: theme.warn }}>Paused</span>}</p>
                    <p className="text-[12px] truncate" style={{ color: theme.subtext }}>
                      {describeSeries(s)} · {to12Hour(s.startTime)} to {to12Hour(s.endTime)}{s.rate ? ` · ${fmt(s.rate)} a night` : ''}
                    </p>
                    <p className="text-[11.5px] truncate" style={{ color: theme.subtext }}>
                      {upcoming[0] ? `Next ${new Date(upcoming[0].date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${upcoming.length} upcoming` : 'No upcoming nights'}
                      {s.endDate ? ` · ends ${new Date(s.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                  <RowMenu label={`Actions for ${s.name}`} items={[
                    { label: 'Edit', icon: Edit3, onClick: () => { setIsNew(false); setDraft({ ...s, endDate: s.endDate || '' }) } },
                    { label: s.paused ? 'Resume' : 'Pause', icon: s.paused ? Play : Pause, onClick: () => onTogglePause(s.id) },
                    { label: 'Delete series', icon: Trash2, danger: true, onClick: () => { if (confirm(`Delete "${s.name || s.venue}"? Future unpaid nights are removed. Past and paid nights stay.`)) onDelete(s.id) } },
                  ]} />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Sheet
        open={!!draft}
        onClose={() => setDraft(null)}
        title={isNew ? 'New recurring event' : 'Edit recurring event'}
        sub={isNew ? undefined : 'Changes apply to future nights that are not paid yet.'}
        footer={<>
          <Button className="flex-1" onClick={() => setDraft(null)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!draft || !(draft.name || draft.venue) || draft.days.length === 0 || !draft.startDate} onClick={() => { if (draft) { onSave({ ...draft, endDate: draft.endDate || undefined }); setDraft(null) } }}>
            {isNew ? 'Create' : 'Save changes'}
          </Button>
        </>}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Name"><input value={draft.name} onChange={e => d({ name: e.target.value })} placeholder="e.g. Club X weekends" autoFocus {...field} /></Field>
            <Field label="Repeats every" group>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map(day => {
                  const on = draft.days.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() => d({ days: on ? draft.days.filter(x => x !== day) : [...draft.days, day] })}
                      className="w-11 h-10 rounded-lg text-[13px] font-medium transition-colors"
                      style={{ backgroundColor: on ? `${theme.accent}22` : 'transparent', color: on ? theme.text : theme.subtext, border: `1px solid ${on ? theme.accent : theme.border}` }}
                    >{WEEKDAYS[day]}</button>
                  )
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time"><input type="time" value={draft.startTime} onChange={e => d({ startTime: e.target.value })} {...field} /></Field>
              <Field label="End time"><input type="time" value={draft.endTime} onChange={e => d({ endTime: e.target.value })} {...field} /></Field>
              <Field label="Venue"><input value={draft.venue} onChange={e => d({ venue: e.target.value })} {...field} /></Field>
              <Field label="Address"><input value={draft.eventAddress || ''} onChange={e => d({ eventAddress: e.target.value })} {...field} /></Field>
              <Field label="Pay per night ($)"><input type="number" inputMode="decimal" value={draft.rate || ''} onChange={e => d({ rate: Number(e.target.value) })} {...field} /></Field>
              <Field label="Deposit per night ($)"><input type="number" inputMode="decimal" value={draft.depositAmount || ''} onChange={e => d({ depositAmount: Number(e.target.value) })} {...field} /></Field>
              <Field label="Who pays" hint="Shown as the client on each night"><input value={draft.clientName} onChange={e => d({ clientName: e.target.value })} placeholder={draft.name || 'Club or promoter'} {...field} /></Field>
              <Field label="Event type">
                <select value={draft.eventType} onChange={e => d({ eventType: e.target.value as GigType })} {...field}>
                  {GIG_TYPES.map(t => <option key={t} value={t}>{cap(t)}</option>)}
                </select>
              </Field>
              <Field label="Starts"><input type="date" value={draft.startDate} onChange={e => d({ startDate: e.target.value })} {...field} /></Field>
              <Field label="Ends (optional)"><input type="date" value={draft.endDate || ''} onChange={e => d({ endDate: e.target.value })} {...field} /></Field>
            </div>
            <Field label="Keep nights created" group hint="How far ahead nights appear in Gigs and on your website.">
              <Choice value={String(draft.weeksAhead)} onChange={v => d({ weeksAhead: Number(v) })} options={[{ value: '4', label: '4 weeks' }, { value: '8', label: '8 weeks' }, { value: '12', label: '12 weeks' }]} />
            </Field>
            <Field label="Notes (optional)"><textarea rows={2} value={draft.notes || ''} onChange={e => d({ notes: e.target.value })} {...field} className={`${field.className} h-auto py-2`} /></Field>
            {draft.skipped.length > 0 && (
              <Disclosure title={<span className="text-xs" style={{ color: theme.subtext }}>{draft.skipped.length} skipped date{draft.skipped.length === 1 ? '' : 's'}</span>}>
                <ul className="space-y-1">
                  {[...draft.skipped].sort().map(date => (
                    <li key={date} className="flex items-center justify-between text-[13px]">
                      <span style={{ color: theme.text }}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <Button size="sm" variant="ghost" onClick={() => d({ skipped: draft.skipped.filter(x => x !== date) })}>Add back</Button>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DJPage() {
  const { theme } = useTheme()
  const field = useField()
  const statusColor = useStatusColor()
  const { syncState, forceSync } = useOrcaData()
  const [gigs, setGigs] = useState<DJGig[]>([])
  const [series, setSeries] = useState<GigSeries[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [rebookClient, setRebookClient] = useState<Partial<DJGig> | null>(null)
  const [openGigId, setOpenGigId] = useState<string | null>(null)
  const [gigView, setGigView] = useState<'upcoming' | 'confirmed' | 'completed' | 'all'>('upcoming')
  const [upMonth, setUpMonth] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const [showLog, setShowLog] = useState(false)
  const [activeSection, setActiveSection] = useState<'gigs' | 'quotes' | 'crm' | 'email' | 'settings'>('gigs')
  const [settingsTab, setSettingsTab] = useState<'recurring' | 'website'>('recurring')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [syncDetail, setSyncDetail] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<{ date: string; clientName: string }[]>([])
  const [online, setOnline] = useState(true)

  // Booking requests (from public website)
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [generatedReply, setGeneratedReply] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [replySent, setReplySent] = useState('')
  const [quoteAmount, setQuoteAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [testimonials, setTestimonials] = useState<any[]>([])
  const [websitePhotos, setWebsitePhotos] = useState<any[]>([])
  const [photoUploadError, setPhotoUploadError] = useState('')
  // Website content editing
  const [siteBio, setSiteBio] = useState(() => { try { return localStorage.getItem('orca-dj-site-bio') || '' } catch { return '' } })
  const [siteServices, setSiteServices] = useState(() => { try { return localStorage.getItem('orca-dj-site-services') || '' } catch { return '' } })
  const [sitePosterSubtitle, setSitePosterSubtitle] = useState(() => { try { return localStorage.getItem('orca-dj-site-poster-subtitle') || 'Upcoming Events' } catch { return 'Upcoming Events' } })
  const [sitePosterTitle, setSitePosterTitle] = useState(() => { try { return localStorage.getItem('orca-dj-site-poster-title') || 'MASK OFF DA DJ' } catch { return 'MASK OFF DA DJ' } })
  const [sitePosterTagline, setSitePosterTagline] = useState(() => { try { return localStorage.getItem('orca-dj-site-poster-tagline') || 'UPCOMING BOOKINGS' } catch { return 'UPCOMING BOOKINGS' } })
  const [siteInstagram, setSiteInstagram] = useState(() => { try { return localStorage.getItem('orca-dj-site-instagram') || '@maskoffdadj' } catch { return '@maskoffdadj' } })
  const [siteTiktok, setSiteTiktok] = useState(() => { try { return localStorage.getItem('orca-dj-site-tiktok') || '@maskoffdadj' } catch { return '@maskoffdadj' } })
  const [sitePhone, setSitePhone] = useState(() => { try { return localStorage.getItem('orca-dj-site-phone') || '' } catch { return '' } })
  const [siteTestimonials, setSiteTestimonials] = useState(() => {
    try {
      const saved = localStorage.getItem('orca-dj-site-testimonials')
      return saved ? JSON.parse(saved) : [
        { name: 'Jessica M.', event: 'Wedding Reception', quote: 'DJ Maskoff made our wedding reception absolutely incredible. He read the room perfectly and kept everyone dancing all night.' },
        { name: 'Marcus T.', event: 'Corporate Event', quote: 'We hired DJ Maskoff for our company holiday party and he was phenomenal. Professional, punctual, and the music selection was spot on.' },
        { name: 'Aaliyah R.', event: 'Birthday Party', quote: 'Best birthday party ever! DJ Maskoff brought the energy from start to finish. Everyone was asking who the DJ was.' },
      ]
    } catch { return [] }
  })
  const [siteSaved, setSiteSaved] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const saveWebsiteSettings = async () => {
    const settings = {
      bio: siteBio, services: siteServices, instagram: siteInstagram, tiktok: siteTiktok, phone: sitePhone,
      testimonials: siteTestimonials,
      posterSubtitle: sitePosterSubtitle, posterTitle: sitePosterTitle, posterTagline: sitePosterTagline,
    }
    try {
      setLocalSynced('orca-dj-site-bio', siteBio)
      setLocalSynced('orca-dj-site-services', siteServices)
      setLocalSynced('orca-dj-site-instagram', siteInstagram)
      setLocalSynced('orca-dj-site-tiktok', siteTiktok)
      setLocalSynced('orca-dj-site-phone', sitePhone)
      setLocalSynced('orca-dj-site-testimonials', JSON.stringify(siteTestimonials))
      setLocalSynced('orca-dj-site-poster-subtitle', sitePosterSubtitle)
      setLocalSynced('orca-dj-site-poster-title', sitePosterTitle)
      setLocalSynced('orca-dj-site-poster-tagline', sitePosterTagline)
    } catch {}
    try {
      await fetch('/api/dj/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    } catch {}
    setSiteSaved(true)
    setTimeout(() => setSiteSaved(false), 3000)
  }

  const autoSyncGigs = useCallback((gigList: DJGig[]) => {
    setSyncStatus('syncing')
    setSyncDetail(null)
    setConflicts([])
    // Sync to both: cloud data (profiles.local_data) and calendar (booking_requests)
    Promise.all([
      (async () => { try { setLocalSynced('orca-dj-gigs', JSON.stringify(gigList)) } catch {} })(),
      syncDjCalendar(gigList),
    ]).then(([, calResult]) => {
      if (!calResult.ok) {
        setSyncStatus('error')
        setSyncDetail(calResult.error || 'Calendar sync failed')
      } else {
        setSyncStatus('synced')
        setSyncDetail(null)
        if (calResult.conflicts.length > 0) setConflicts(calResult.conflicts)
        try {
          const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
          log.unshift({ at: new Date().toISOString(), action: 'sync', synced: gigList.length })
          setLocalSynced('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
        } catch {}
      }
    }).catch(() => {
      setSyncStatus('error')
      setSyncDetail('Network error — check your connection')
    })
  }, [])

  // Load gigs: localStorage first, then listen for cloud sync to merge.
  // Recurring series are applied on every load so upcoming nights stay filled in.
  useEffect(() => {
    function loadGigsFromLocal() {
      try {
        const seriesList = readSeries()
        setSeries(seriesList)
        const saved = localStorage.getItem('orca-dj-gigs')
        const parsed = saved ? JSON.parse(saved) : []
        const migrated: DJGig[] = parsed.map((g: any) => ({
          ...g,
          date: g.date || '',
          status: g.status || 'confirmed',
          contractAmount: g.contractAmount || g.fee || 0,
          depositAmount: g.depositAmount || 0,
          partialPayments: g.partialPayments || [],
          gearChecklist: g.gearChecklist || [],
        }))
        const { gigs: withSeries } = reconcileSeries(migrated, seriesList)
        if (saved || withSeries.length) {
          setGigs(withSeries)
          autoSyncGigs(withSeries)
        }
      } catch {}
    }
    loadGigsFromLocal()
    const handleSyncReady = () => loadGigsFromLocal()
    window.addEventListener('orca-sync-ready', handleSyncReady)
    return () => window.removeEventListener('orca-sync-ready', handleSyncReady)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleForceSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncDetail('Full cloud sync…')
    const result = await forceSync()
    if (result.ok) {
      try {
        const saved = localStorage.getItem('orca-dj-gigs')
        if (saved) {
          const parsed = JSON.parse(saved)
          setGigs(parsed)
          autoSyncGigs(parsed)
        }
        try {
          const settings = {
            bio: localStorage.getItem('orca-dj-site-bio') || '',
            services: localStorage.getItem('orca-dj-site-services') || '',
            instagram: localStorage.getItem('orca-dj-site-instagram') || '@maskoffdadj',
            tiktok: localStorage.getItem('orca-dj-site-tiktok') || '@maskoffdadj',
            phone: localStorage.getItem('orca-dj-site-phone') || '',
            posterSubtitle: localStorage.getItem('orca-dj-site-poster-subtitle') || 'Upcoming Events',
            posterTitle: localStorage.getItem('orca-dj-site-poster-title') || 'MASK OFF DA DJ',
            posterTagline: localStorage.getItem('orca-dj-site-poster-tagline') || 'UPCOMING BOOKINGS',
            testimonials: JSON.parse(localStorage.getItem('orca-dj-site-testimonials') || '[]'),
          }
          await fetch('/api/dj/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
        } catch {}
        setSyncStatus('synced')
        setSyncDetail('Cloud sync complete')
      } catch {
        setSyncStatus('synced')
        setSyncDetail(null)
      }
    } else {
      setSyncStatus('error')
      setSyncDetail(result.error || 'Sync failed')
    }
  }, [forceSync, autoSyncGigs])

  const save = (g: DJGig[]) => {
    try { setLocalSynced('orca-dj-gigs', JSON.stringify(g)) } catch {}
    autoSyncGigs(g)
  }

  const logActivity = (entry: Record<string, unknown>) => {
    try {
      const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
      log.unshift({ at: new Date().toISOString(), ...entry })
      setLocalSynced('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
    } catch {}
  }

  const addGig = (gig: DJGig) => {
    const next = [...gigs, gig]
    setGigs(next)
    save(next)
    setShowAdd(false)
    setRebookClient(null)
    logActivity({ action: 'created', gigId: gig.id, client: gig.clientName, date: gig.date })
  }

  // Log gig: one or many past gigs at once
  const logGigs = (newGigs: DJGig[]) => {
    if (!newGigs.length) return
    const next = [...gigs, ...newGigs]
    setGigs(next)
    save(next)
    setShowLog(false)
    setGigView('completed')
    logActivity({ action: 'logged', count: newGigs.length, client: newGigs[0].clientName, dates: newGigs.map(g => g.date) })
  }

  const markCompleted = (gig: DJGig) => updateGig({ ...gig, status: 'completed' })

  const updateGig = (updated: DJGig) => {
    const prev = gigs.find(g => g.id === updated.id)
    const next = gigs.map(g => (g.id === updated.id ? updated : g))
    setGigs(next)
    save(next)
    if (prev && prev.status !== updated.status) logActivity({ action: 'status_changed', gigId: updated.id, client: updated.clientName, from: prev.status, to: updated.status })
  }

  const saveClientHistory = (gig: DJGig) => {
    if (!gig.clientName) return
    try {
      const history = JSON.parse(localStorage.getItem('orca-dj-client-history') || '[]')
      const key = (gig.clientEmail || gig.clientName).toLowerCase()
      const existing = history.find((c: any) => (c.email || c.name).toLowerCase() === key)
      const event = { date: gig.date, type: gig.eventType, venue: gig.venue, status: gig.status, amount: gig.contractAmount || gig.fee || 0, deletedAt: new Date().toISOString() }
      if (existing) {
        if (!existing.events) existing.events = []
        existing.events.push(event)
        if (gig.clientEmail && !existing.email) existing.email = gig.clientEmail
        if (gig.clientPhone && !existing.phone) existing.phone = gig.clientPhone
      } else {
        history.push({ name: gig.clientName, email: gig.clientEmail || '', phone: gig.clientPhone || '', events: [event] })
      }
      setLocalSynced('orca-dj-client-history', JSON.stringify(history))
    } catch {}
  }

  const persistSeries = (list: GigSeries[]) => {
    setSeries(list)
    try { setLocalSynced(RECURRING_KEY, JSON.stringify(list)) } catch {}
  }

  const deleteGig = (id: string) => {
    const gig = gigs.find(g => g.id === id)
    const next = gigs.filter(g => g.id !== id)
    setGigs(next)
    save(next)
    if (gig) {
      // A night removed from a recurring series is skipped, so it is not recreated.
      if (gig.seriesId) persistSeries(series.map(s => (s.id === gig.seriesId && !s.skipped.includes(gig.date) ? { ...s, skipped: [...s.skipped, gig.date] } : s)))
      saveClientHistory(gig)
      logActivity({ action: 'deleted', gigId: id, client: gig.clientName, date: gig.date })
      syncDjCalendar(next)
    }
  }

  // Applies a change to the series list and brings the gigs in line with it.
  const applySeries = (list: GigSeries[]) => {
    persistSeries(list)
    const { gigs: next, changed } = reconcileSeries(gigs, list)
    if (changed) { setGigs(next); save(next) }
  }
  const saveSeriesItem = (s: GigSeries) => applySeries(series.some(x => x.id === s.id) ? series.map(x => (x.id === s.id ? s : x)) : [...series, s])
  const deleteSeries = (id: string) => applySeries(series.filter(s => s.id !== id))
  const toggleSeriesPause = (id: string) => applySeries(series.map(s => (s.id === id ? { ...s, paused: !s.paused } : s)))

  // Booking requests from the public site
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/dj/bookings')
      if (res.ok) {
        const data = await res.json()
        setRequests((data.bookings || data || []).filter((r: BookingRequest) => r.client_name !== '__DJ_GIG__' && r.client_name !== '__DJ_BLOCK__'))
      }
    } catch {}
    setLoadingRequests(false)
  }, [])

  // Load once for the Requests badge.
  useEffect(() => { loadRequests() }, [loadRequests])

  useEffect(() => {
    if (activeSection === 'settings') {
      fetch('/api/dj/testimonials').then(r => (r.ok ? r.json() : null)).then(d => { if (d?.all) setTestimonials(d.all) }).catch(() => {})
      fetch('/api/dj/photos').then(r => (r.ok ? r.json() : null)).then(d => {
        if (d?.photos) {
          setWebsitePhotos(d.photos)
          try { setLocalSynced('orca-dj-website-photos', JSON.stringify(d.photos)) } catch {}
        }
      }).catch(() => {
        try { const saved = localStorage.getItem('orca-dj-website-photos'); if (saved) setWebsitePhotos(JSON.parse(saved)) } catch {}
      })
    }
  }, [activeSection])

  const generateReply = async (type: 'inquiry' | 'decline' | 'invoice') => {
    if (!selectedRequest) return
    setGeneratingReply(true)
    setReplyError('')
    try {
      const res = await fetch('/api/dj/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: selectedRequest, type, quoteAmount: quoteAmount || undefined, depositAmount: depositAmount || undefined, paymentLink: paymentLink || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }
      const data = await res.json()
      setGeneratedReply(data.reply || '')
      setReplySubject(data.subject || '')
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : 'Failed to generate reply')
    }
    setGeneratingReply(false)
  }

  const sendReply = async () => {
    if (!selectedRequest || !generatedReply) return
    setSendingReply(true)
    setReplyError('')
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedRequest.client_email, subject: replySubject, text: generatedReply }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Email send failed')
      }
      setReplySent(`Reply sent to ${selectedRequest.client_email}`)
      setGeneratedReply('')
      setReplySubject('')
      setQuoteAmount('')
      setDepositAmount('')
      setPaymentLink('')
      setTimeout(() => setReplySent(''), 4000)
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : 'Send failed')
    }
    setSendingReply(false)
  }

  const updateRequestStatus = async (id: string, status: BookingRequest['status']) => {
    try {
      await fetch('/api/dj/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
      const req = requests.find(r => r.id === id)
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
      if (selectedRequest?.id === id) setSelectedRequest(prev => (prev ? { ...prev, status } : prev))
      // Auto-create a gig when a quote is approved (booked)
      if (status === 'confirmed' && req) {
        addGig({
          id: gid(),
          clientName: req.client_name || '',
          clientEmail: req.client_email || '',
          clientPhone: req.client_phone || '',
          eventType: (req.event_type || 'private') as GigType,
          date: req.date || '',
          startTime: req.start_time || '',
          endTime: req.end_time || '',
          venue: req.location || req.city || '',
          eventAddress: '',
          status: 'confirmed' as GigStatus,
          contractAmount: 0,
          fee: 0,
          depositAmount: 0,
          depositPaid: false,
          partialPayments: [],
          balancePaid: false,
          gearChecklist: [],
          notes: `From quote: ${req.client_name}`,
          createdAt: new Date().toISOString(),
          isLead: true,
        })
      }
    } catch {}
  }

  // ── Hidden before the 2026-11 redesign (was wrapped in `false &&` inside the
  // Website tab). Kept intact and uncalled so it can be restored: public
  // calendar preview, block-a-date, and the synced gig list.
  const [blockedDate, setBlockedDate] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [blockSuccess, setBlockSuccess] = useState('')
  const [gCalMonth, setGCalMonth] = useState(new Date().getMonth())
  const [gCalYear, setGCalYear] = useState(new Date().getFullYear())
  const blockDate = async () => {
    if (!blockedDate) return
    setBlockingDate(true)
    try {
      const res = await fetch('/api/dj-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: blockedDate }),
      })
      if (res.ok) {
        setBlockSuccess(`${new Date(blockedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} blocked.`)
        setBlockedDate('')
        setTimeout(() => setBlockSuccess(''), 4000)
      } else {
        setBlockSuccess('Failed to block date.')
        setTimeout(() => setBlockSuccess(''), 4000)
      }
    } catch {}
    setBlockingDate(false)
  }

  const renderHiddenCalendarTools = () => {
              const gigDates = new Set(gigs.filter(g => g.status === 'confirmed' || g.status === 'pending').map(g => g.date))
              const daysInMonth = new Date(gCalYear, gCalMonth + 1, 0).getDate()
              const firstDay = new Date(gCalYear, gCalMonth, 1).getDay()
              const monthName = new Date(gCalYear, gCalMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              const todayStr = new Date().toISOString().slice(0, 10)

              return (
                <div className="space-y-3">
                  {/* Calendar preview */}
                  <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => { if (gCalMonth === 0) { setGCalMonth(11); setGCalYear(y => y - 1) } else setGCalMonth(m => m - 1) }} className="p-1.5 rounded-lg" style={{ color: theme.subtext }}><ChevronDown size={14} className="rotate-90" /></button>
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{monthName}</p>
                      <button onClick={() => { if (gCalMonth === 11) { setGCalMonth(0); setGCalYear(y => y + 1) } else setGCalMonth(m => m + 1) }} className="p-1.5 rounded-lg" style={{ color: theme.subtext }}><ChevronUp size={14} className="rotate-90" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                      {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-center text-[10px] font-bold py-1" style={{ color: theme.subtext }}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const d = i + 1
                        const dateStr = `${gCalYear}-${String(gCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        const isBooked = gigDates.has(dateStr)
                        const isToday = dateStr === todayStr
                        return (
                          <div key={d} className="flex flex-col items-center justify-center py-1.5 rounded-lg" style={{
                            background: isBooked ? `${DJ_PINK}18` : isToday ? `${BENTLEY_GOLD}15` : 'transparent',
                            border: isToday ? `1px solid ${BENTLEY_GOLD}60` : isBooked ? `1px solid ${DJ_PINK}40` : '1px solid transparent',
                          }}>
                            <span className="text-xs font-bold" style={{ color: isBooked ? DJ_PINK : theme.text }}>{d}</span>
                            {isBooked && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: DJ_PINK }} />}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-4 mt-3 pt-2 border-t" style={{ borderColor: `${theme.border}60` }}>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: DJ_PINK }} /><span className="text-[10px]" style={{ color: theme.subtext }}>Booked</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: BENTLEY_GOLD }} /><span className="text-[10px]" style={{ color: theme.subtext }}>Today</span></div>
                    </div>
                  </div>

                  {/* Block date */}
                  <div className="flex items-center gap-2">
                    <input type="date" value={blockedDate} onChange={e => setBlockedDate(e.target.value)} className="flex-1 px-2 py-1.5 rounded-xl border text-xs" style={{ background: theme.card, borderColor: theme.border, color: theme.text }} />
                    <button onClick={blockDate} disabled={!blockedDate || blockingDate} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40" style={{ background: `${BENTLEY_RED}15`, color: BENTLEY_RED, border: `1px solid ${BENTLEY_RED}30` }}>
                      <Ban size={11} /> Block Date
                    </button>
                  </div>
                  {blockSuccess && <p className="text-xs font-semibold" style={{ color: BENTLEY_GREEN }}>{blockSuccess}</p>}

                  {/* Gig list */}
                  <p className="text-xs font-bold uppercase tracking-wider pt-2" style={{ color: theme.subtext }}>All Gigs (auto-synced to website)</p>
                  {gigs.filter(g => g.status !== 'cancelled').length === 0 && (
                    <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <p className="text-sm" style={{ color: theme.subtext }}>No gigs yet. Add one in the Gigs tab.</p>
                    </div>
                  )}
                  {gigs.filter(g => g.status !== 'cancelled' && g.date).sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(g => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <div className="text-center" style={{ minWidth: 44 }}>
                        <p className="text-[10px] font-bold uppercase" style={{ color: DJ_PINK }}>{new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</p>
                        <p className="text-lg font-black leading-none" style={{ color: theme.text }}>{new Date(g.date + 'T00:00:00').getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{g.clientName || g.venue || 'Gig'}</p>
                        <p className="text-xs truncate" style={{ color: theme.subtext }}>{g.venue || ''} {g.eventAddress ? `· ${g.eventAddress}` : ''}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: g.status === 'confirmed' ? `${BENTLEY_GREEN}18` : g.status === 'completed' ? `${BENTLEY_INDIGO}18` : `${BENTLEY_GOLD}18`, color: g.status === 'confirmed' ? BENTLEY_GREEN : g.status === 'completed' ? BENTLEY_INDIGO : BENTLEY_GOLD }}>
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
  }
  void renderHiddenCalendarTools

  const today = localISO(new Date())
  const upMonthKey = `${upMonth.y}-${String(upMonth.m + 1).padStart(2, '0')}`
  // A confirmed gig whose date has passed belongs with Completed until it's marked done.
  const isPastConfirmed = (g: DJGig) => g.status === 'confirmed' && !!g.date && g.date < today
  const isUpcoming = (g: DJGig) => !!g.date && g.date >= today && g.status !== 'cancelled' && g.status !== 'completed'
  const gigCounts = useMemo(() => ({
    upcoming: gigs.filter(isUpcoming).length,
    confirmed: gigs.filter(g => g.status === 'confirmed' && !isPastConfirmed(g)).length,
    completed: gigs.filter(g => g.status === 'completed' || isPastConfirmed(g)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [gigs, today])

  const laterUpcoming = gigs.filter(g => isUpcoming(g) && g.date.slice(0, 7) > upMonthKey).length

  const filtered = useMemo(() => {
    const list =
      gigView === 'upcoming' ? gigs.filter(g => isUpcoming(g) && g.date.startsWith(upMonthKey))
      : gigView === 'confirmed' ? gigs.filter(g => g.status === 'confirmed' && !isPastConfirmed(g))
      : gigView === 'completed' ? gigs.filter(g => g.status === 'completed' || isPastConfirmed(g))
      : gigs
    const asc = [...list].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    return gigView === 'completed' || gigView === 'all' ? asc.reverse() : asc
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigs, gigView, upMonthKey, today])

  const stats = useMemo(() => {
    const upcoming = gigs.filter(g => g.date >= today && g.status === 'confirmed')
    const totalEarned = gigs.filter(g => g.status === 'completed').reduce((s, g) => s + calcTotalPaid(g), 0)
    const bookedValue = upcoming.reduce((s, g) => s + (g.contractAmount || g.fee || 0), 0)
    const balanceDue = gigs.filter(g => g.status !== 'cancelled').reduce((s, g) => s + calcRemaining(g), 0)
    return { upcoming: upcoming.length, totalEarned, bookedValue, balanceDue, nextGig: upcoming.sort((a, b) => a.date.localeCompare(b.date))[0] }
  }, [gigs, today])

  const upcomingAlert = useMemo(() => {
    if (!stats.nextGig) return null
    const days = Math.ceil((new Date(stats.nextGig.date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 7) return `${days <= 0 ? 'Gig today' : `Gig in ${days} day${days === 1 ? '' : 's'}`}: ${stats.nextGig.clientName} at ${stats.nextGig.venue || 'TBD'}. Confirm invoice, playlist and gear.`
    return null
  }, [stats])

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const openGig = gigs.find(g => g.id === openGigId) || null
  const area = { ...field, className: `${field.className} h-auto py-2 leading-relaxed` }

  const syncLabel = syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'error' ? 'Sync problem' : !online ? 'Offline' : conflicts.length ? 'Date conflict' : syncStatus === 'synced' ? 'Synced' : 'Not synced yet'
  const syncTone = syncStatus === 'error' || conflicts.length ? theme.bad : !online ? theme.warn : syncStatus === 'synced' ? theme.ok : theme.subtext

  return (
    <PageShell>
      <PageHeader
        title="DJ Maskoff"
        sub={<span className="inline-flex items-center gap-1.5" title={syncDetail || syncState.lastError || undefined}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: syncTone }} />{syncLabel} · {gigs.length} gig{gigs.length !== 1 ? 's' : ''}</span> }
        right={<>
          <Button onClick={() => { save(gigs); handleForceSync() }} disabled={syncStatus === 'syncing'}><RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} /> Sync</Button>
          <Link href="/maskoffdadj" target="_blank"><Button><ExternalLink size={14} /> Website</Button></Link>
          <Button onClick={() => setShowLog(true)}><History size={14} /> Log gig</Button>
          <Button variant="primary" onClick={() => { setRebookClient(null); setShowAdd(true) }}><Plus size={15} /> Add gig</Button>
        </>}
      />

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: theme.badBg }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: theme.bad }} />
          <p className="flex-1 text-[13px]" style={{ color: theme.text }}><strong>Double booking:</strong> {conflicts.map(c => c.date).join(', ')} already has a client request. Check Requests.</p>
          <IconButton onClick={() => setConflicts([])} label="Dismiss"><X size={14} /></IconButton>
        </div>
      )}

      <Panel pad={false} className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Upcoming gigs', value: String(stats.upcoming), sub: stats.nextGig ? `Next ${new Date(stats.nextGig.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'None booked' },
            { label: 'Booked value', value: fmt(stats.bookedValue), sub: 'Upcoming confirmed' },
            { label: 'Balance due', value: fmt(stats.balanceDue), sub: 'Still owed to you', tone: stats.balanceDue > 0 ? theme.warn : undefined },
            { label: 'Earned', value: fmt(stats.totalEarned), sub: 'Completed gigs' },
          ].map((s, i) => (
            <div key={s.label} className={`px-4 sm:px-5 py-4 min-w-0 ${i % 2 ? 'border-l' : ''} ${i > 0 ? 'lg:border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''}`} style={{ borderColor: theme.border }}>
              <p className="text-xs font-medium flex items-center gap-1.5 truncate" style={{ color: theme.subtext }}>{s.tone && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.tone }} />}{s.label}</p>
              <p className="mt-1 text-[20px] md:text-[24px] font-semibold tnum tracking-tight leading-tight truncate" style={{ color: theme.text }}>{s.value}</p>
              <p className="mt-1 text-[11.5px] truncate" style={{ color: theme.subtext }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </Panel>

      {upcomingAlert && (
        <button onClick={() => stats.nextGig && setOpenGigId(stats.nextGig.id)} className="w-full mb-4 rounded-xl px-4 py-3 flex items-center gap-3 text-left" style={{ backgroundColor: `${theme.accent}14` }}>
          <Star size={16} style={{ color: theme.accent }} className="shrink-0" />
          <span className="flex-1 text-[13px]" style={{ color: theme.text }}>{upcomingAlert}</span>
          <ChevronRight size={15} style={{ color: theme.subtext }} />
        </button>
      )}

      <div className="mb-4 overflow-x-auto no-scrollbar">
        <Segmented value={activeSection} onChange={v => setActiveSection(v as typeof activeSection)} options={[
          { value: 'gigs', label: 'Gigs' },
          { value: 'quotes', label: `Requests${pendingRequests.length ? ` · ${pendingRequests.length}` : ''}` },
          { value: 'crm', label: 'Clients' },
          { value: 'email', label: 'Email' },
          { value: 'settings', label: 'Settings' },
        ]} />
      </div>

      {/* ═══ GIGS ═══ */}
      {activeSection === 'gigs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="overflow-x-auto no-scrollbar max-w-full">
              <Segmented size="sm" value={gigView} onChange={v => setGigView(v as typeof gigView)} options={[
                { value: 'upcoming', label: `Upcoming · ${gigCounts.upcoming}` },
                { value: 'confirmed', label: `Confirmed · ${gigCounts.confirmed}` },
                { value: 'completed', label: `Completed · ${gigCounts.completed}` },
                { value: 'all', label: 'All' },
              ]} />
            </div>
            {gigView === 'upcoming' && (
              <MonthSwitcher month={upMonth.m} year={upMonth.y} onChange={dir => setUpMonth(v => { const d = new Date(v.y, v.m + dir, 1); return { y: d.getFullYear(), m: d.getMonth() } })} />
            )}
          </div>
          {filtered.length === 0 ? (
            gigView === 'completed'
              ? <EmptyState title="No completed gigs" sub="Played a gig you never entered? Log it here." action={<Button variant="primary" onClick={() => setShowLog(true)}><History size={15} /> Log gig</Button>} />
              : gigView === 'upcoming'
                ? <EmptyState title={`Nothing coming up in ${new Date(upMonth.y, upMonth.m).toLocaleDateString('en-US', { month: 'long' })}`} sub="Add a gig, or set up a recurring event in Settings." action={<Button variant="primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add gig</Button>} />
                : <EmptyState title="No gigs here" sub="Add a gig, or set up a recurring event in Settings." action={<Button variant="primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add gig</Button>} />
          ) : (
            <Panel pad={false}>
              <ul>
                {filtered.map((gig, i) => {
                  const remaining = calcRemaining(gig)
                  const contract = gig.contractAmount || gig.fee || 0
                  const daysUntil = Math.ceil((new Date(gig.date + 'T00:00:00').getTime() - Date.now()) / 86400000)
                  const soon = gig.status === 'confirmed' && gig.date >= today && daysUntil <= 3
                  return (
                    <li key={gig.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      <button onClick={() => setOpenGigId(gig.id)} className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${theme.text}06`)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <DateBlock date={gig.date} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate flex items-center gap-1.5" style={{ color: theme.text }}>
                            {gig.clientName}
                            {gig.seriesId && <Repeat size={12} style={{ color: theme.subtext }} aria-label="Recurring" />}
                          </p>
                          <p className="text-[12px] truncate" style={{ color: theme.subtext }}>
                            {[gig.venue, gig.startTime ? `${to12Hour(gig.startTime)}` : '', gig.customEventType || cap(gig.eventType)].filter(Boolean).join(' · ')}
                          </p>
                          <p className="text-[11.5px] flex items-center gap-1.5 mt-0.5" style={{ color: statusColor(gig.status) }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(gig.status) }} />{STATUS_LABEL[gig.status]}
                            {soon && <span style={{ color: theme.accent }}>· {daysUntil <= 0 ? 'Today' : `${daysUntil}d away`}</span>}
                            {isPastConfirmed(gig) && <span style={{ color: theme.subtext }}>· date passed</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {contract > 0 && <p className="text-[14px] font-semibold tnum" style={{ color: theme.text }}>{fmt(contract)}</p>}
                          {contract > 0 && <p className="text-[11.5px] tnum" style={{ color: remaining <= 0 ? theme.ok : theme.subtext }}>{remaining <= 0 ? 'Paid' : `${fmt(remaining)} due`}</p>}
                        </div>
                        <ChevronRight size={15} className="shrink-0" style={{ color: theme.subtext }} />
                      </button>
                      {isPastConfirmed(gig) && (
                        <div className="px-4 sm:px-5 pb-3 -mt-1 pl-[68px] sm:pl-[76px]">
                          <Button size="sm" onClick={() => markCompleted(gig)}><Check size={13} /> Mark completed</Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
          {gigView === 'upcoming' && laterUpcoming > 0 && (
            <button onClick={() => setUpMonth(v => { const d = new Date(v.y, v.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() } })} className="text-[13px] flex items-center gap-1" style={{ color: theme.accent }}>
              {laterUpcoming} more upcoming after {new Date(upMonth.y, upMonth.m).toLocaleDateString('en-US', { month: 'long' })} <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* ═══ REQUESTS (quotes from the website) ═══ */}
      {activeSection === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px]" style={{ color: theme.subtext }}>{pendingRequests.length} waiting for a reply · {requests.length} total</p>
            <Button size="sm" onClick={loadRequests}><RefreshCw size={13} className={loadingRequests ? 'animate-spin' : ''} /> Refresh</Button>
          </div>
          {loadingRequests && requests.length === 0 ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[13px]" style={{ color: theme.subtext }}><Loader2 size={16} className="animate-spin" /> Loading</div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState title="No new requests" sub="Booking requests from your website show up here." />
          ) : (
            <Panel pad={false}>
              <ul>
                {pendingRequests.map((r, i) => {
                  const isExpanded = selectedRequest?.id === r.id
                  const dep = depositAmount || String(Math.round(Number(quoteAmount) * 0.25))
                  return (
                    <li key={r.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      <button className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left" aria-expanded={isExpanded} onClick={() => {
                        if (isExpanded) setSelectedRequest(null)
                        else { setSelectedRequest(r); setGeneratedReply(''); setReplySubject(''); setReplyError(''); setReplySent('') }
                      }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} aria-label="New" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{r.client_name}</p>
                          <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{[cap(r.event_type), r.date, r.city].filter(Boolean).join(' · ')}</p>
                        </div>
                        <ChevronRight size={15} style={{ color: theme.subtext, transform: isExpanded ? 'rotate(90deg)' : undefined }} className="transition-transform" />
                      </button>
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            {[['Email', r.client_email], ['Phone', r.client_phone || '—'], ['Date', r.date], ['City', r.city], ['Venue', r.location || '—'], ['Guests', r.guest_count ? String(r.guest_count) : '—'], ['Budget', r.budget_range || '—'], ['MC', r.mc_needed ? 'Yes' : 'No']].map(([label, val]) => (
                              <div key={label} className="min-w-0"><p className="text-[11px]" style={{ color: theme.subtext }}>{label}</p><p className="text-[13px] truncate" style={{ color: theme.text }}>{val}</p></div>
                            ))}
                          </div>
                          {r.special_requests && <p className="text-[13px] rounded-xl px-3 py-2.5 whitespace-pre-wrap" style={{ backgroundColor: `${theme.text}08`, color: theme.text }}>{r.special_requests}</p>}

                          {!generatedReply ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Quote ($)"><input type="number" inputMode="decimal" placeholder="500" value={quoteAmount} onChange={e => { setQuoteAmount(e.target.value); if (e.target.value) setDepositAmount(String(Math.round(Number(e.target.value) * 0.25))) }} {...field} /></Field>
                                <Field label="Deposit ($)"><input type="number" inputMode="decimal" placeholder="125" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} {...field} /></Field>
                              </div>
                              {quoteAmount && (
                                <p className="text-xs" style={{ color: theme.subtext }}>
                                  PayPal: for a {fmt(Number(dep))} deposit the customer sends <span className="tnum" style={{ color: theme.text }}>${(Number(dep) * 1.0349 + 0.49).toFixed(2)}</span> (includes ${(Number(dep) * 0.0349 + 0.49).toFixed(2)} fee).
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Button variant="primary" disabled={generatingReply} onClick={() => generateReply('invoice')}>{generatingReply ? <Loader2 size={13} className="animate-spin" /> : null} Draft quote with invoice</Button>
                                <Button disabled={generatingReply} onClick={() => generateReply('inquiry')}>Draft quick reply</Button>
                                <Button variant="ghost" disabled={generatingReply} onClick={() => generateReply('decline')}>Draft decline</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs flex items-center gap-1.5" style={{ color: theme.warn }}><AlertCircle size={13} /> Review before sending. You can edit anything.</p>
                              <input value={replySubject} onChange={e => setReplySubject(e.target.value)} placeholder="Subject" aria-label="Subject" {...field} />
                              <textarea rows={10} value={generatedReply} onChange={e => setGeneratedReply(e.target.value)} aria-label="Reply" {...area} />
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="primary" disabled={sendingReply} onClick={sendReply}>{sendingReply ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send reply</Button>
                                <Button onClick={() => navigator.clipboard.writeText(generatedReply)}><Copy size={13} /> Copy</Button>
                                <Button variant="ghost" onClick={() => { setGeneratedReply(''); setReplySubject(''); setQuoteAmount(''); setDepositAmount(''); setPaymentLink('') }}>Discard</Button>
                              </div>
                            </div>
                          )}
                          {replyError && <p className="text-xs" style={{ color: theme.bad }}>{replyError}</p>}
                          {replySent && <p className="text-xs flex items-center gap-1" style={{ color: theme.ok }}><CheckCircle2 size={13} /> {replySent}</p>}

                          <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                            <Button className="flex-1" variant="primary" onClick={() => updateRequestStatus(r.id, 'confirmed')}><Check size={14} /> Approve and book</Button>
                            <Button className="flex-1" variant="danger" onClick={() => updateRequestStatus(r.id, 'declined')}><X size={14} /> Decline</Button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {activeSection === 'crm' && <CRMPanel gigs={gigs} quotes={requests} onBookAgain={(data) => { setRebookClient(data); setShowAdd(true) }} />}

      {activeSection === 'email' && <EmailPanel gigs={gigs} />}

      {/* ═══ SETTINGS ═══ */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          <Segmented size="sm" value={settingsTab} onChange={v => setSettingsTab(v as typeof settingsTab)} options={[{ value: 'recurring', label: `Recurring events${series.length ? ` · ${series.length}` : ''}` }, { value: 'website', label: 'Website' }]} />

          {settingsTab === 'recurring' && (
            <RecurringPanel series={series} gigs={gigs} onSave={saveSeriesItem} onDelete={deleteSeries} onTogglePause={toggleSeriesPause} />
          )}

          {settingsTab === 'website' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[13px]" style={{ color: theme.subtext }}>
                  {gigs.filter(g => g.status !== 'cancelled' && g.status !== 'completed').length} active gigs show on your public calendar after you sync.
                </p>
                <div className="flex gap-2">
                  <Link href="/maskoffdadj" target="_blank"><Button size="sm"><ExternalLink size={13} /> View site</Button></Link>
                  <Button size="sm" variant="primary" onClick={saveWebsiteSettings}>{siteSaved ? <><Check size={13} /> Saved</> : 'Save website'}</Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-start">
                <Panel>
                  <PanelTitle title="Posterboard" sub="Headings above your upcoming dates" />
                  <div className="space-y-3">
                    <Field label="Small text above the title"><input value={sitePosterSubtitle} onChange={e => setSitePosterSubtitle(e.target.value)} {...field} /></Field>
                    <Field label="Main title"><input value={sitePosterTitle} onChange={e => setSitePosterTitle(e.target.value)} {...field} /></Field>
                    <Field label="Tagline below the title"><input value={sitePosterTagline} onChange={e => setSitePosterTagline(e.target.value)} {...field} /></Field>
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle title="Social links and contact" />
                  <div className="space-y-3">
                    <Field label="Instagram"><input value={siteInstagram} onChange={e => setSiteInstagram(e.target.value)} placeholder="@handle" {...field} /></Field>
                    <Field label="TikTok"><input value={siteTiktok} onChange={e => setSiteTiktok(e.target.value)} placeholder="@handle" {...field} /></Field>
                    <Field label="Phone"><input value={sitePhone} onChange={e => setSitePhone(e.target.value)} placeholder="(919) 555-0123" {...field} /></Field>
                  </div>
                </Panel>

                <Panel className="md:col-span-2">
                  <PanelTitle title="Photos" sub="Hero shows in the banner; About shows next to your bio" />
                  {photoUploadError && (
                    <p className="mb-3 text-xs flex items-center gap-2" style={{ color: theme.bad }}><AlertCircle size={13} /> {photoUploadError} <button onClick={() => setPhotoUploadError('')} aria-label="Dismiss"><X size={12} /></button></p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(['hero', 'about'] as const).map(slot => {
                      const photo = websitePhotos.find((p: any) => typeof p === 'object' && p.slot === slot)
                      const photoUrl = typeof photo === 'object' ? (photo as any).url : null
                      return (
                        <div key={slot} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                          {photoUrl ? <img src={photoUrl} alt={`${slot} photo`} className="w-full h-40 object-cover" /> : (
                            <div className="h-40 flex items-center justify-center text-xs" style={{ backgroundColor: `${theme.text}06`, color: theme.subtext }}>No {slot} photo yet</div>
                          )}
                          <div className="flex items-center gap-2 p-3">
                            <span className="flex-1 text-[13px] font-medium capitalize" style={{ color: theme.text }}>{slot} photo</span>
                            {photoUrl && (
                              <Button size="sm" variant="ghost" onClick={async () => {
                                await fetch('/api/dj/photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot }) })
                                setWebsitePhotos((prev: any[]) => {
                                  const updated = prev.filter((p: any) => !(typeof p === 'object' && p.slot === slot))
                                  try { setLocalSynced('orca-dj-website-photos', JSON.stringify(updated)) } catch {}
                                  return updated
                                })
                              }}>Remove</Button>
                            )}
                            <label className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ border: `1px solid ${theme.border}`, color: theme.text }}>
                              <Upload size={13} /> {photoUrl ? 'Replace' : 'Upload'}
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setPhotoUploadError('')
                                const fd = new FormData()
                                fd.append('file', file)
                                fd.append('slot', slot)
                                try {
                                  const res = await fetch('/api/dj/photos', { method: 'POST', body: fd })
                                  const data = await res.json()
                                  if (data.ok && data.url) {
                                    setWebsitePhotos((prev: any[]) => {
                                      const kept = prev.filter((p: any) => !(typeof p === 'object' && p.slot === slot))
                                      const updated = [...kept, { slot, url: data.url, uploadedAt: new Date().toISOString() }]
                                      try { setLocalSynced('orca-dj-website-photos', JSON.stringify(updated)) } catch {}
                                      return updated
                                    })
                                  } else setPhotoUploadError(data.error || 'Upload failed')
                                } catch (err: any) {
                                  setPhotoUploadError(err.message || 'Upload failed — check connection')
                                }
                                e.target.value = ''
                              }} />
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle title="About you" />
                  <div className="space-y-3">
                    <Field label="Bio"><textarea rows={5} value={siteBio} onChange={e => setSiteBio(e.target.value)} placeholder="Write your DJ bio for the public website" {...area} /></Field>
                    <Field label="Services" hint="One per line"><textarea rows={4} value={siteServices} onChange={e => setSiteServices(e.target.value)} placeholder={'Private Parties\nCorporate Events\nWeddings'} {...area} /></Field>
                  </div>
                </Panel>

                <Panel>
                  <PanelTitle title="Customer reviews" sub="Posted by customers from your website" right={<span className="text-[13px] tnum" style={{ color: theme.subtext }}>{testimonials.length}</span>} />
                  {testimonials.length === 0 ? <p className="text-[13px]" style={{ color: theme.subtext }}>No customer reviews yet.</p> : (
                    <ul>
                      {testimonials.map((t: any, i: number) => (
                        <li key={t.id} className="flex items-start gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>{t.name} <span className="font-normal" style={{ color: theme.subtext }}>{t.event_type}</span></p>
                            <p className="text-[12px] line-clamp-2" style={{ color: theme.subtext }}>{t.review}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => { fetch('/api/dj/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: 'deleted' }) }).then(() => setTestimonials(prev => prev.filter(x => x.id !== t.id))) }}>Delete</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel className="md:col-span-2">
                  <PanelTitle title="Sample testimonials" sub="Shown on the site when there are no customer reviews" right={<Button size="sm" onClick={() => setSiteTestimonials([...siteTestimonials, { name: '', event: '', quote: '' }])}><Plus size={13} /> Add</Button>} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    {siteTestimonials.map((t: any, i: number) => (
                      <div key={i} className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${theme.border}` }}>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={t.name} onChange={e => { const u = [...siteTestimonials]; u[i] = { ...u[i], name: e.target.value }; setSiteTestimonials(u) }} placeholder="Name" aria-label="Name" {...field} />
                          <input value={t.event} onChange={e => { const u = [...siteTestimonials]; u[i] = { ...u[i], event: e.target.value }; setSiteTestimonials(u) }} placeholder="Event" aria-label="Event" {...field} />
                        </div>
                        <textarea rows={3} value={t.quote} onChange={e => { const u = [...siteTestimonials]; u[i] = { ...u[i], quote: e.target.value }; setSiteTestimonials(u) }} aria-label="Quote" {...area} />
                        <Button size="sm" variant="ghost" onClick={() => setSiteTestimonials(siteTestimonials.filter((_: any, j: number) => j !== i))}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="sticky bottom-4 flex justify-end">
                <Button variant="primary" onClick={saveWebsiteSettings}>{siteSaved ? <><Check size={14} /> Saved</> : 'Save website'}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <GigSheet gig={openGig} onClose={() => setOpenGigId(null)} onUpdate={updateGig} onDelete={deleteGig} />
      <AddGigSheet open={showAdd} onAdd={addGig} onClose={() => { setShowAdd(false); setRebookClient(null) }} prefill={rebookClient} />
      <LogGigSheet open={showLog} gigs={gigs} gear={DEFAULT_GEAR} onClose={() => setShowLog(false)} onLog={logGigs} />
    </PageShell>
  )
}
