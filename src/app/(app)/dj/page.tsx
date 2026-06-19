'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Plus, Calendar, DollarSign,
  Check, Clock, MapPin, Phone, Mail, Trash2, ChevronRight,
  Edit3, X, Users, FileText, ChevronDown, ChevronUp,
  AlertCircle, Star, TrendingUp, CheckCircle, AlertTriangle,
  Send, Copy, Loader2, CheckCircle2, XCircle, Ban, MessageSquare, RefreshCw,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import type { DJGig, GigStatus, GigType, DJPartialPayment } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { fullSync, syncDjCalendar, setLocalSynced, type SyncStatus as EngineSyncStatus } from '@/lib/syncEngine'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'
const DJ_PINK = '#F43F5E'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const STATUS_CONFIG: Record<GigStatus, { label: string; color: string }> = {
  inquiry:   { label: 'Inquiry',    color: '#94A3B8' },
  pending:   { label: 'Pending',    color: BENTLEY_GOLD },
  confirmed: { label: 'Confirmed',  color: BENTLEY_GREEN },
  completed: { label: 'Completed',  color: BENTLEY_INDIGO },
  cancelled: { label: 'Cancelled',  color: BENTLEY_RED },
}

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
  status: 'new' | 'reviewed' | 'quoted' | 'booked' | 'declined' | 'dj_blocked'
  created_at: string
}

const REQUEST_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:      { bg: '#451A0325', text: '#F97316' },
  reviewed: { bg: '#1E3A5F25', text: '#60A5FA' },
  quoted:   { bg: '#2E106525', text: '#A78BFA' },
  booked:   { bg: '#052E1625', text: '#4ADE80' },
  declined: { bg: '#450A0A25', text: '#F87171' },
}
const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: 'New', reviewed: 'Reviewed', quoted: 'Quoted', booked: 'Booked', declined: 'Declined',
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
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function BLANK_GIG(): Partial<DJGig> {
  return {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventType: 'private' as GigType,
    date: '',
    startTime: '08:00 PM',
    endTime: '11:00 PM',
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

// ── Payment Tracker Panel ──
function PaymentPanel({ gig, onUpdate }: { gig: DJGig; onUpdate: (updated: DJGig) => void }) {
  const { theme } = useTheme()
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [editingPartialId, setEditingPartialId] = useState<string | null>(null)
  const [editingPartialAmount, setEditingPartialAmount] = useState('')
  const [editingPartialNote, setEditingPartialNote] = useState('')

  const contract = gig.contractAmount || gig.fee || 0
  const remaining = calcRemaining(gig)
  const totalPaid = calcTotalPaid(gig)
  const paidPct = contract > 0 ? Math.min((totalPaid / contract) * 100, 100) : 0

  const toggleDeposit = () => {
    onUpdate({ ...gig, depositPaid: !gig.depositPaid })
  }

  const addPartialPayment = () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    const payment: DJPartialPayment = { id: gid(), amount: amt, date: new Date().toISOString().slice(0, 10), note: payNote || undefined }
    const updated = { ...gig, partialPayments: [...(gig.partialPayments || []), payment] }
    if (calcRemaining(updated) <= 0) updated.balancePaid = true
    onUpdate(updated)
    setPayAmount('')
    setPayNote('')
    setShowAddPayment(false)
  }

  const removePartial = (id: string) => {
    const updated = { ...gig, partialPayments: (gig.partialPayments || []).filter(p => p.id !== id) }
    onUpdate(updated)
  }

  const startEditPartial = (p: DJPartialPayment) => {
    setEditingPartialId(p.id)
    setEditingPartialAmount(String(p.amount))
    setEditingPartialNote(p.note || '')
  }

  const saveEditPartial = () => {
    if (!editingPartialId) return
    const amt = parseFloat(editingPartialAmount)
    if (!amt || amt <= 0) return
    const updated = {
      ...gig,
      partialPayments: (gig.partialPayments || []).map(p =>
        p.id === editingPartialId ? { ...p, amount: amt, note: editingPartialNote || undefined } : p
      ),
    }
    onUpdate(updated)
    setEditingPartialId(null)
  }

  return (
    <div className="space-y-3">
      {/* Balance header */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: `${BENTLEY_RED}10`, border: `1px solid ${BENTLEY_RED}25` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Balance Remaining</span>
          <span className="text-xl font-black" style={{ color: remaining <= 0 ? BENTLEY_GREEN : BENTLEY_RED }}>{fmt(remaining)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div className="overflow-hidden">
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Contract</p>
            <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{fmt(contract)}</p>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Paid</p>
            <p className="text-sm font-bold truncate" style={{ color: BENTLEY_GREEN }}>{fmt(totalPaid)}</p>
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Due</p>
            <p className="text-sm font-bold truncate" style={{ color: remaining > 0 ? BENTLEY_RED : BENTLEY_GREEN }}>{remaining > 0 ? fmt(remaining) : 'PAID'}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mt-1" style={{ background: theme.border }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? BENTLEY_GREEN : BENTLEY_GOLD }} />
        </div>
      </div>

      {/* Deposit row */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-sm font-semibold" style={{ color: theme.text }}>Deposit</p>
          <p className="text-xs" style={{ color: theme.subtext }}>{fmt(gig.depositAmount || 0)}</p>
        </div>
        <button
          onClick={toggleDeposit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
          style={{ background: gig.depositPaid ? `${BENTLEY_GREEN}18` : `${BENTLEY_GOLD}18`, color: gig.depositPaid ? BENTLEY_GREEN : BENTLEY_GOLD }}
        >
          {gig.depositPaid ? <><Check size={11} /> RECEIVED</> : 'PENDING'}
        </button>
      </div>

      {/* Partial payments list */}
      {(gig.partialPayments || []).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Partial Payments</p>
          {(gig.partialPayments || []).map(p => (
            <div key={p.id}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${BENTLEY_INDIGO}10`, border: `1px solid ${BENTLEY_INDIGO}20` }}>
                <Check size={11} style={{ color: BENTLEY_INDIGO }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: theme.text }}>{fmt(p.amount)}</p>
                  {p.note && <p className="text-[10px]" style={{ color: theme.subtext }}>{p.note}</p>}
                </div>
                <p className="text-[10px] shrink-0" style={{ color: theme.subtext }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <button
                  onClick={() => editingPartialId === p.id ? setEditingPartialId(null) : startEditPartial(p)}
                  className="p-1 rounded"
                  style={{ color: BENTLEY_INDIGO }}
                >
                  <Edit3 size={10} />
                </button>
                <button onClick={() => removePartial(p.id)} className="p-1 rounded" style={{ color: BENTLEY_RED }}>
                  <X size={10} />
                </button>
              </div>
              {editingPartialId === p.id && (
                <div className="mt-1 p-2.5 rounded-xl space-y-2" style={{ background: `${BENTLEY_INDIGO}08`, border: `1px solid ${BENTLEY_INDIGO}30` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BENTLEY_INDIGO }}>Edit Payment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editingPartialAmount}
                      onChange={e => setEditingPartialAmount(e.target.value)}
                      placeholder="Amount $"
                      className="px-3 py-2 rounded-xl border text-sm"
                      style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
                    />
                    <input
                      type="text"
                      value={editingPartialNote}
                      onChange={e => setEditingPartialNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="px-3 py-2 rounded-xl border text-sm"
                      style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingPartialId(null)} className="flex-1 py-1.5 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                    <button onClick={saveEditPartial} className="flex-1 py-1.5 rounded-xl text-xs font-semibold" style={{ background: BENTLEY_INDIGO, color: '#fff' }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment quick actions + form */}
      {remaining > 0 && !showAddPayment && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { setPayAmount(String(remaining)); setShowAddPayment(true) }}
            className="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5"
            style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}35` }}
          >
            <Check size={13} />
            Paid Full
          </button>
          <button
            onClick={() => { setPayAmount(String(Math.round(remaining / 2 * 100) / 100)); setShowAddPayment(true) }}
            className="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5"
            style={{ background: `${BENTLEY_GOLD}18`, color: BENTLEY_GOLD, border: `1px solid ${BENTLEY_GOLD}35` }}
          >
            <DollarSign size={13} />
            Paid Half
          </button>
          <button
            onClick={() => { setPayAmount(''); setShowAddPayment(true) }}
            className="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5"
            style={{ background: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO, border: `1px dashed ${BENTLEY_INDIGO}40` }}
          >
            <Plus size={13} />
            Custom
          </button>
        </div>
      )}

      {remaining <= 0 && !showAddPayment && (
        <button
          onClick={() => setShowAddPayment(true)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: `${BENTLEY_INDIGO}12`, color: BENTLEY_INDIGO, border: `1px dashed ${BENTLEY_INDIGO}40` }}
        >
          <Plus size={12} /> Log Payment
        </button>
      )}

      {showAddPayment && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: `${BENTLEY_INDIGO}08`, border: `1px solid ${BENTLEY_INDIGO}30` }}>
          <p className="text-xs font-bold" style={{ color: BENTLEY_INDIGO }}>Log Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="Amount $"
              className="px-3 py-2 rounded-xl border text-sm"
              style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
            />
            <input
              type="text"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              placeholder="Note (optional)"
              className="px-3 py-2 rounded-xl border text-sm"
              style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddPayment(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
            <button onClick={addPartialPayment} disabled={!payAmount} className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-40" style={{ background: BENTLEY_INDIGO, color: '#fff' }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Gig Edit Form ──
function GigEditForm({ gig, onSave, onCancel }: {
  gig: DJGig
  onSave: (updated: DJGig) => void
  onCancel: () => void
}) {
  const { theme } = useTheme()
  const [form, setForm] = useState<DJGig>({ ...gig })
  const f = (field: Partial<DJGig>) => setForm(p => ({ ...p, ...field }))

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
  const inputStyle = { background: theme.card, borderColor: theme.border, color: theme.text }

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Client Name</label>
          <input className={inputCls} style={inputStyle} value={form.clientName} onChange={e => f({ clientName: e.target.value })} placeholder="Client name" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Phone</label>
          <input className={inputCls} style={inputStyle} value={form.clientPhone || ''} onChange={e => f({ clientPhone: e.target.value })} placeholder="Phone number" />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Email</label>
        <input className={inputCls} style={inputStyle} type="email" value={form.clientEmail || ''} onChange={e => f({ clientEmail: e.target.value })} placeholder="Client email" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Venue</label>
        <input className={inputCls} style={inputStyle} value={form.venue} onChange={e => f({ venue: e.target.value })} placeholder="Venue name" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Address</label>
        <input className={inputCls} style={inputStyle} value={form.eventAddress || ''} onChange={e => f({ eventAddress: e.target.value })} placeholder="Full event address" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Date</label>
          <input className={inputCls} style={inputStyle} type="date" value={form.date} onChange={e => f({ date: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Status</label>
          <select className={inputCls} style={inputStyle} value={form.status} onChange={e => f({ status: e.target.value as GigStatus })}>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Start Time</label>
          <input className={inputCls} style={inputStyle} type="time" value={form.startTime} onChange={e => f({ startTime: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>End Time</label>
          <input className={inputCls} style={inputStyle} type="time" value={form.endTime} onChange={e => f({ endTime: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Contract $</label>
          <input className={inputCls} style={inputStyle} type="number" value={form.contractAmount || form.fee || ''} onChange={e => f({ contractAmount: Number(e.target.value), fee: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Deposit $</label>
          <input className={inputCls} style={inputStyle} type="number" value={form.depositAmount || ''} onChange={e => f({ depositAmount: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Type</label>
          <select className={inputCls} style={inputStyle} value={form.eventType} onChange={e => f({ eventType: e.target.value as GigType })}>
            {(['wedding','birthday','corporate','nightclub','bar','festival','private','other'] as GigType[]).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Notes</label>
        <textarea
          className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
          style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
          rows={3}
          value={form.notes || ''}
          onChange={e => f({ notes: e.target.value })}
          placeholder="Client notes, special requests, etc."
        />
      </div>

      {/* Payment section edit */}
      <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: theme.subtext }}>Payment Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Deposit Amount $</label>
            <input className={inputCls} style={inputStyle} type="number" value={form.depositAmount || ''} onChange={e => f({ depositAmount: Number(e.target.value) })} placeholder="0" />
          </div>
          <div className="flex items-end pb-0.5">
            <button
              onClick={() => f({ depositPaid: !form.depositPaid })}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: form.depositPaid ? `${BENTLEY_GREEN}18` : `${BENTLEY_GOLD}18`, color: form.depositPaid ? BENTLEY_GREEN : BENTLEY_GOLD, border: `1px solid ${form.depositPaid ? BENTLEY_GREEN : BENTLEY_GOLD}40` }}
            >
              {form.depositPaid ? <><Check size={11} /> Deposit Received</> : 'Mark Deposit Received'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
        <button onClick={() => onSave(form)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: DJ_PINK, color: '#fff' }}>Save Changes</button>
      </div>
    </div>
  )
}

// ── Gig Card ──
function GigCard({ gig, onUpdate, onDelete }: {
  gig: DJGig
  onUpdate: (updated: DJGig) => void
  onDelete: (id: string) => void
}) {
  const { theme } = useTheme()
  const [tab, setTab] = useState<'info' | 'payments' | 'gear' | 'edit'>('info')
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[gig.status] || STATUS_CONFIG.confirmed
  const today = new Date().toISOString().slice(0, 10)
  const daysUntil = Math.ceil((new Date(gig.date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isUpcoming = gig.date >= today && gig.status !== 'cancelled' && gig.status !== 'completed'
  const gearDone = gig.gearChecklist.filter(g => g.checked).length
  const remaining = calcRemaining(gig)
  const contract = gig.contractAmount || gig.fee || 0

  const toggleGear = (itemId: string) => {
    const updated = { ...gig, gearChecklist: gig.gearChecklist.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
    onUpdate(updated)
  }

  const eventTypeLabel = gig.eventType
    ? gig.eventType.charAt(0).toUpperCase() + gig.eventType.slice(1)
    : ''

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${isUpcoming && daysUntil <= 3 ? `${DJ_PINK}50` : theme.border}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="p-2 rounded-xl shrink-0" style={{ background: `${DJ_PINK}18` }}>
          <Mic2 size={15} style={{ color: DJ_PINK }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm" style={{ color: theme.text }}>{gig.clientName}</p>
            {eventTypeLabel && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${DJ_PINK}12`, color: DJ_PINK }}>
                {eventTypeLabel}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${status.color}18`, color: status.color }}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs flex-wrap" style={{ color: theme.subtext }}>
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {new Date(gig.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {isUpcoming && daysUntil >= 0 && (
              <span style={{ color: daysUntil <= 3 ? DJ_PINK : BENTLEY_GOLD }}>
                {daysUntil === 0 ? 'TODAY' : `${daysUntil}d away`}
              </span>
            )}
            {contract > 0 && <span style={{ color: remaining <= 0 ? BENTLEY_GREEN : BENTLEY_RED }}>{remaining <= 0 ? '✓ Paid' : `${fmt(remaining)} due`}</span>}
          </div>
        </div>
        {expanded ? <ChevronDown size={14} style={{ color: theme.subtext }} /> : <ChevronRight size={14} style={{ color: theme.subtext }} />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: `1px solid ${theme.border}` }}>
              {/* Tabs */}
              <div className="flex border-b" style={{ borderColor: theme.border }}>
                {(['info', 'payments', 'gear', 'edit'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-1 py-2.5 text-xs font-bold capitalize transition-colors"
                    style={{
                      color: tab === t ? DJ_PINK : theme.subtext,
                      borderBottom: tab === t ? `2px solid ${DJ_PINK}` : '2px solid transparent',
                    }}
                  >
                    {t === 'info' ? 'Info' : t === 'payments' ? 'Payments' : t === 'gear' ? 'Gear' : 'Edit'}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* INFO TAB */}
                {tab === 'info' && (
                  <div className="space-y-2.5">
                    {gig.venue && (
                      <div className="flex items-start gap-2 text-sm" style={{ color: theme.subtext }}>
                        <MapPin size={13} className="shrink-0 mt-0.5" />
                        <span>{gig.venue}{gig.eventAddress && ` · ${gig.eventAddress}`}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.subtext }}>
                      <Clock size={13} />
                      <span>{to12Hour(gig.startTime)} — {to12Hour(gig.endTime)}</span>
                    </div>
                    {gig.clientEmail && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.subtext }}>
                        <Mail size={13} /> <a href={`mailto:${gig.clientEmail}`} style={{ color: BENTLEY_INDIGO }}>{gig.clientEmail}</a>
                      </div>
                    )}
                    {gig.clientPhone && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.subtext }}>
                        <Phone size={13} /> <a href={`tel:${gig.clientPhone}`} style={{ color: BENTLEY_INDIGO }}>{gig.clientPhone}</a>
                      </div>
                    )}
                    {gig.notes && (
                      <div className="rounded-xl p-3 text-sm" style={{ background: `${BENTLEY_INDIGO}08`, color: theme.text }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.subtext }}>Notes</p>
                        {gig.notes}
                      </div>
                    )}

                    {/* Status buttons */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      {(['confirmed', 'completed', 'cancelled'] as GigStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => onUpdate({ ...gig, status: s })}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{
                            background: gig.status === s ? STATUS_CONFIG[s].color : `${STATUS_CONFIG[s].color}18`,
                            color: gig.status === s ? '#fff' : STATUS_CONFIG[s].color,
                          }}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                      <button onClick={() => onDelete(gig.id)} className="ml-auto p-1.5 rounded-xl" style={{ background: `${BENTLEY_RED}18`, color: BENTLEY_RED }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* PAYMENTS TAB */}
                {tab === 'payments' && (
                  <PaymentPanel gig={gig} onUpdate={onUpdate} />
                )}

                {/* GEAR TAB */}
                {tab === 'gear' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Gear Checklist</p>
                      <span className="text-xs font-bold" style={{ color: gearDone === gig.gearChecklist.length ? BENTLEY_GREEN : BENTLEY_GOLD }}>
                        {gearDone}/{gig.gearChecklist.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {gig.gearChecklist.map(g => (
                        <button
                          key={g.id}
                          onClick={() => toggleGear(g.id)}
                          className="w-full flex items-center gap-2.5 text-left"
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: g.checked ? BENTLEY_GREEN : 'transparent', border: `1.5px solid ${g.checked ? BENTLEY_GREEN : theme.border}` }}
                          >
                            {g.checked && <Check size={10} color="#fff" />}
                          </div>
                          <span className="text-sm" style={{ color: g.checked ? theme.subtext : theme.text }}>{g.item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDIT TAB */}
                {tab === 'edit' && (
                  <GigEditForm
                    gig={gig}
                    onSave={updated => { onUpdate(updated); setTab('info') }}
                    onCancel={() => setTab('info')}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── CRM Client History ──
function CRMPanel({ gigs }: { gigs: DJGig[] }) {
  const { theme } = useTheme()

  const clients = useMemo(() => {
    const map = new Map<string, { name: string; email?: string; phone?: string; gigs: DJGig[]; totalPaid: number }>()
    gigs.forEach(g => {
      const key = g.clientEmail || g.clientName
      if (!map.has(key)) map.set(key, { name: g.clientName, email: g.clientEmail, phone: g.clientPhone, gigs: [], totalPaid: 0 })
      const entry = map.get(key)!
      entry.gigs.push(g)
      entry.totalPaid += calcTotalPaid(g)
    })
    return Array.from(map.values()).sort((a, b) => b.gigs.length - a.gigs.length)
  }, [gigs])

  if (clients.length === 0) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <Users size={28} style={{ color: theme.subtext, margin: '0 auto 8px' }} />
      <p className="text-sm" style={{ color: theme.subtext }}>No clients yet. Add your first gig above.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {clients.map(client => (
        <div key={client.name} className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm" style={{ background: `${DJ_PINK}18`, color: DJ_PINK }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: theme.text }}>{client.name}</p>
              <div className="flex gap-3 text-xs" style={{ color: theme.subtext }}>
                {client.email && <span className="truncate">{client.email}</span>}
                {client.phone && <span>{client.phone}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(client.totalPaid)}</p>
              <p className="text-[10px]" style={{ color: theme.subtext }}>{client.gigs.length} gig{client.gigs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Email & Invoice Panel ──
function EmailPanel({ gigs }: { gigs: DJGig[] }) {
  const { theme } = useTheme()

  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_TEMPLATES
    try {
      const saved = localStorage.getItem('orca-dj-email-templates')
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_TEMPLATES
  })

  const [emailSubTab, setEmailSubTab] = useState<'templates' | 'compose'>('templates')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTplName, setNewTplName] = useState('')
  const [newTplSubject, setNewTplSubject] = useState('')
  const [newTplBody, setNewTplBody] = useState('')
  const [newTplType, setNewTplType] = useState<EmailTemplate['type']>('custom')

  const [selectedGigId, setSelectedGigId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const saveTemplates = (updated: EmailTemplate[]) => {
    setTemplates(updated)
    try { localStorage.setItem('orca-dj-email-templates', JSON.stringify(updated)) } catch {}
  }

  const addTemplate = () => {
    if (!newTplName.trim()) return
    const t: EmailTemplate = {
      id: gid(),
      name: newTplName.trim(),
      subject: newTplSubject.trim(),
      body: newTplBody.trim(),
      type: newTplType,
      createdAt: new Date().toISOString(),
    }
    saveTemplates([...templates, t])
    setNewTplName('')
    setNewTplSubject('')
    setNewTplBody('')
    setNewTplType('custom')
    setShowNewTemplate(false)
  }

  const duplicateTemplate = (t: EmailTemplate) => {
    const copy: EmailTemplate = { ...t, id: gid(), name: `${t.name} (Copy)`, createdAt: new Date().toISOString() }
    saveTemplates([...templates, copy])
  }

  const deleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id))
  }

  const saveEditTemplate = () => {
    if (!editingTemplate) return
    saveTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t))
    setEditingTemplate(null)
  }

  const applyTemplate = (templateId: string, gigId: string) => {
    const template = templates.find(t => t.id === templateId)
    const gig = gigs.find(g => g.id === gigId)
    if (!template) return

    const replacements: Record<string, string> = {
      clientName: gig?.clientName || '',
      eventType: gig?.eventType ? gig.eventType.charAt(0).toUpperCase() + gig.eventType.slice(1) : '',
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
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          text: composeBody,
          html: composeBody.replace(/\n/g, '<br/>'),
        }),
      })
      setSendStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setSendStatus('idle'), 4000)
    } catch {
      setSendStatus('error')
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
  const inputStyle = { background: theme.card, borderColor: theme.border, color: theme.text }

  const TYPE_LABELS: Record<EmailTemplate['type'], string> = {
    blast: 'Blast',
    invoice: 'Invoice',
    confirmation: 'Confirmation',
    followup: 'Follow-up',
    custom: 'Custom',
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
        {(['templates', 'compose'] as const).map(t => (
          <button
            key={t}
            onClick={() => setEmailSubTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
            style={{ background: emailSubTab === t ? DJ_PINK : 'transparent', color: emailSubTab === t ? '#fff' : theme.subtext }}
          >
            {t === 'templates' ? 'Templates' : 'Compose & Send'}
          </button>
        ))}
      </div>

      {/* TEMPLATES TAB */}
      {emailSubTab === 'templates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Email Templates</p>
            <button
              onClick={() => setShowNewTemplate(!showNewTemplate)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${DJ_PINK}18`, color: DJ_PINK, border: `1px solid ${DJ_PINK}30` }}
            >
              <Plus size={11} /> New Template
            </button>
          </div>

          {/* New Template form */}
          {showNewTemplate && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: `${DJ_PINK}08`, border: `1px solid ${DJ_PINK}30` }}>
              <p className="text-xs font-bold" style={{ color: DJ_PINK }}>New Template</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="Template name" value={newTplName} onChange={e => setNewTplName(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Type</label>
                  <select className={inputCls} style={inputStyle} value={newTplType} onChange={e => setNewTplType(e.target.value as EmailTemplate['type'])}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Subject</label>
                <input className={inputCls} style={inputStyle} placeholder="Email subject (use {clientName}, {date}, etc.)" value={newTplSubject} onChange={e => setNewTplSubject(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Body</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={inputStyle}
                  rows={5}
                  placeholder="Email body — use {clientName}, {date}, {venue}, {contractAmount}, {depositAmount}, {balanceDue}, {eventType}"
                  value={newTplBody}
                  onChange={e => setNewTplBody(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewTemplate(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                <button onClick={addTemplate} disabled={!newTplName.trim()} className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-40" style={{ background: DJ_PINK, color: '#fff' }}>Save Template</button>
              </div>
            </div>
          )}

          {/* Template list */}
          {templates.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <Mail size={24} style={{ color: theme.subtext, margin: '0 auto 8px' }} />
              <p className="text-sm" style={{ color: theme.subtext }}>No templates yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id}>
                  <div className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${editingTemplate?.id === t.id ? DJ_PINK : theme.border}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm" style={{ color: theme.text }}>{t.name}</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${DJ_PINK}18`, color: DJ_PINK }}>{TYPE_LABELS[t.type]}</span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: theme.subtext }}>{t.subject}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingTemplate(editingTemplate?.id === t.id ? null : { ...t })}
                          className="p-1.5 rounded-lg"
                          style={{ color: BENTLEY_INDIGO, background: `${BENTLEY_INDIGO}15` }}
                          title="Edit"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => duplicateTemplate(t)}
                          className="p-1.5 rounded-lg"
                          style={{ color: BENTLEY_GOLD, background: `${BENTLEY_GOLD}15` }}
                          title="Duplicate"
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="p-1.5 rounded-lg"
                          style={{ color: BENTLEY_RED, background: `${BENTLEY_RED}15` }}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline editor */}
                  {editingTemplate?.id === t.id && (
                    <div className="mt-1 rounded-xl p-3 space-y-2" style={{ background: `${BENTLEY_INDIGO}08`, border: `1px solid ${BENTLEY_INDIGO}30` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BENTLEY_INDIGO }}>Editing Template</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Name</label>
                          <input className={inputCls} style={inputStyle} value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Type</label>
                          <select className={inputCls} style={inputStyle} value={editingTemplate.type} onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value as EmailTemplate['type'] })}>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Subject</label>
                        <input className={inputCls} style={inputStyle} value={editingTemplate.subject} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Body</label>
                        <textarea
                          className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                          style={inputStyle}
                          rows={6}
                          value={editingTemplate.body}
                          onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTemplate(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                        <button onClick={saveEditTemplate} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: BENTLEY_INDIGO, color: '#fff' }}>Update Template</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl p-3 mt-2" style={{ background: `${BENTLEY_GOLD}10`, border: `1px solid ${BENTLEY_GOLD}30` }}>
            <p className="text-[10px] font-bold" style={{ color: BENTLEY_GOLD }}>Template Variables</p>
            <p className="text-[10px] mt-1" style={{ color: theme.subtext }}>
              Use these in your templates: <span style={{ color: BENTLEY_GOLD }}>{'{clientName}'} {'{date}'} {'{eventType}'} {'{venue}'} {'{contractAmount}'} {'{depositAmount}'} {'{balanceDue}'}</span>
            </p>
          </div>
        </div>
      )}

      {/* COMPOSE TAB */}
      {emailSubTab === 'compose' && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Compose & Send</p>

          {/* Gig + Template picker */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Select Gig</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={selectedGigId}
                onChange={e => {
                  setSelectedGigId(e.target.value)
                  if (selectedTemplateId && e.target.value) applyTemplate(selectedTemplateId, e.target.value)
                  else if (e.target.value) {
                    const gig = gigs.find(g => g.id === e.target.value)
                    if (gig?.clientEmail) setComposeTo(gig.clientEmail)
                  }
                }}
              >
                <option value="">— Select gig —</option>
                {[...gigs].sort((a, b) => b.date.localeCompare(a.date)).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.clientName} · {g.date ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Apply Template</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={selectedTemplateId}
                onChange={e => {
                  setSelectedTemplateId(e.target.value)
                  if (e.target.value) applyTemplate(e.target.value, selectedGigId)
                }}
              >
                <option value="">— Select template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* To field */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>To (email address)</label>
            <input
              className={inputCls}
              style={inputStyle}
              type="email"
              placeholder="recipient@email.com (separate multiple with commas)"
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Subject</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="Email subject"
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Message</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={inputStyle}
              rows={8}
              placeholder="Type your message here..."
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
            />
          </div>

          {/* Send */}
          <button
            onClick={sendEmail}
            disabled={!composeTo.trim() || !composeSubject.trim() || sendStatus === 'sending'}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: sendStatus === 'sent' ? BENTLEY_GREEN : sendStatus === 'error' ? BENTLEY_RED : DJ_PINK,
              color: '#fff',
            }}
          >
            <Send size={14} />
            {sendStatus === 'sending' ? 'Sending…' : sendStatus === 'sent' ? '✓ Sent!' : sendStatus === 'error' ? 'Failed — Retry' : 'Send Email'}
          </button>

          {sendStatus === 'error' && (
            <p className="text-xs text-center" style={{ color: BENTLEY_RED }}>
              Send failed. Check that your Gmail credentials are configured in environment variables.
            </p>
          )}

          {/* Quick clear */}
          {(composeSubject || composeBody || composeTo) && (
            <button
              onClick={() => { setComposeTo(''); setComposeSubject(''); setComposeBody(''); setSelectedGigId(''); setSelectedTemplateId(''); setSendStatus('idle'); }}
              className="w-full py-2 rounded-xl text-xs font-semibold"
              style={{ background: theme.card, color: theme.subtext, border: `1px solid ${theme.border}` }}
            >
              Clear Composer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Gig Modal ──
function AddGigModal({ onAdd, onClose }: { onAdd: (gig: DJGig) => void; onClose: () => void }) {
  const { theme } = useTheme()
  const [form, setForm] = useState<Partial<DJGig>>(BLANK_GIG())
  const f = (field: Partial<DJGig>) => setForm(p => ({ ...p, ...field }))

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none"
  const inputStyle = { background: theme.card, borderColor: theme.border, color: theme.text }

  const handleAdd = () => {
    if (!form.clientName || !form.date) return
    const contract = form.contractAmount || form.fee || 0
    const gig: DJGig = {
      id: Date.now().toString(),
      clientName: form.clientName || '',
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      eventType: form.eventType || 'private',
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
    }
    onAdd(gig)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto"
        style={{ background: theme.surface || theme.card, border: `1px solid ${theme.border}` }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>New Gig</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: theme.subtext }}><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Client Name *</label>
            <input className={inputCls} style={inputStyle} placeholder="Client name" autoFocus value={form.clientName || ''} onChange={e => f({ clientName: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Phone</label>
            <input className={inputCls} style={inputStyle} placeholder="Phone" value={form.clientPhone || ''} onChange={e => f({ clientPhone: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Email</label>
          <input className={inputCls} style={inputStyle} type="email" placeholder="Client email" value={form.clientEmail || ''} onChange={e => f({ clientEmail: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Date *</label>
            <input className={inputCls} style={inputStyle} type="date" value={form.date || ''} onChange={e => f({ date: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Status</label>
            <select className={inputCls} style={inputStyle} value={form.status || 'confirmed'} onChange={e => f({ status: e.target.value as GigStatus })}>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Type</label>
          <select className={inputCls} style={inputStyle} value={form.eventType || 'private'} onChange={e => f({ eventType: e.target.value as GigType })}>
            {(['wedding','birthday','corporate','nightclub','bar','festival','private','other'] as GigType[]).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Venue</label>
          <input className={inputCls} style={inputStyle} placeholder="Venue name" value={form.venue || ''} onChange={e => f({ venue: e.target.value })} />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Event Address</label>
          <input className={inputCls} style={inputStyle} placeholder="Full address" value={form.eventAddress || ''} onChange={e => f({ eventAddress: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Start Time</label>
            <input className={inputCls} style={inputStyle} type="time" value={form.startTime || '20:00'} onChange={e => f({ startTime: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>End Time</label>
            <input className={inputCls} style={inputStyle} type="time" value={form.endTime || '23:00'} onChange={e => f({ endTime: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Contract Amount $</label>
            <input className={inputCls} style={inputStyle} type="number" placeholder="Total contract" value={form.contractAmount || ''} onChange={e => f({ contractAmount: Number(e.target.value), fee: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Deposit Amount $</label>
            <input className={inputCls} style={inputStyle} type="number" placeholder="Deposit" value={form.depositAmount || ''} onChange={e => f({ depositAmount: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Notes</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
            style={inputStyle}
            rows={2}
            placeholder="Special requests, notes..."
            value={form.notes || ''}
            onChange={e => f({ notes: e.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
          <button onClick={handleAdd} disabled={!form.clientName || !form.date} className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40" style={{ background: DJ_PINK, color: '#fff' }}>Add Gig</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ──
export default function DJPage() {
  const { theme } = useTheme()
  const { syncState, forceSync } = useOrcaData()
  const [gigs, setGigs] = useState<DJGig[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState<GigStatus | 'all'>('all')
  const [activeSection, setActiveSection] = useState<'gigs' | 'requests' | 'crm' | 'email'>('gigs')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [syncDetail, setSyncDetail] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<{ date: string; clientName: string }[]>([])

  // Booking requests (from public website)
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null)
  const [requestFilter, setRequestFilter] = useState<string>('all')
  const [generatingReply, setGeneratingReply] = useState(false)
  const [generatedReply, setGeneratedReply] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [replySent, setReplySent] = useState('')
  const [blockedDate, setBlockedDate] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [blockSuccess, setBlockSuccess] = useState('')

  // Load gigs: localStorage first, then listen for cloud sync to merge
  useEffect(() => {
    function loadGigsFromLocal() {
      try {
        const saved = localStorage.getItem('orca-dj-gigs')
        if (saved) {
          const parsed = JSON.parse(saved)
          const migrated = parsed.map((g: any) => ({
            ...g,
            contractAmount: g.contractAmount || g.fee || 0,
            depositAmount: g.depositAmount || 0,
            partialPayments: g.partialPayments || [],
          }))
          setGigs(migrated)
          autoSyncGigs(migrated)
        }
      } catch {}
    }

    loadGigsFromLocal()

    // Re-read after cloud sync completes (syncEngine merges cloud + local)
    const handleSyncReady = () => loadGigsFromLocal()
    window.addEventListener('orca-sync-ready', handleSyncReady)
    return () => window.removeEventListener('orca-sync-ready', handleSyncReady)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const autoSyncGigs = useCallback((gigList: DJGig[]) => {
    setSyncStatus('syncing')
    setSyncDetail(null)
    setConflicts([])

    // Sync to both: cloud data (profiles.local_data) and calendar (booking_requests)
    Promise.all([
      // 1. Push gigs to localStorage + cloud data sync
      (async () => {
        try {
          setLocalSynced('orca-dj-gigs', JSON.stringify(gigList))
        } catch {}
      })(),
      // 2. Sync to booking_requests for calendar blocking
      syncDjCalendar(gigList),
    ]).then(([, calResult]) => {
      if (!calResult.ok) {
        setSyncStatus('error')
        setSyncDetail(calResult.error || 'Calendar sync failed')
      } else {
        setSyncStatus('synced')
        setSyncDetail(null)
        if (calResult.conflicts.length > 0) {
          setConflicts(calResult.conflicts)
        }
        try {
          const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
          log.unshift({ at: new Date().toISOString(), action: 'sync', synced: gigList.length })
          localStorage.setItem('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
        } catch {}
      }
    }).catch(() => {
      setSyncStatus('error')
      setSyncDetail('Network error — check your connection')
    })
  }, [])

  const handleForceSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncDetail('Full cloud sync…')
    const result = await forceSync()
    if (result.ok) {
      // Re-read gigs from localStorage (now merged with cloud)
      try {
        const saved = localStorage.getItem('orca-dj-gigs')
        if (saved) {
          const parsed = JSON.parse(saved)
          setGigs(parsed)
          // Also sync to calendar
          autoSyncGigs(parsed)
        }
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
    try {
      localStorage.setItem('orca-dj-gigs', JSON.stringify(g))
      window.dispatchEvent(new Event('orca-local-write'))
    } catch {}
    autoSyncGigs(g)
  }

  const addGig = (gig: DJGig) => {
    const next = [...gigs, gig]
    setGigs(next)
    save(next)
    setShowAdd(false)
    try {
      const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
      log.unshift({ at: new Date().toISOString(), action: 'created', gigId: gig.id, client: gig.clientName, date: gig.date })
      localStorage.setItem('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
    } catch {}
  }

  const updateGig = (updated: DJGig) => {
    const prev = gigs.find(g => g.id === updated.id)
    const next = gigs.map(g => g.id === updated.id ? updated : g)
    setGigs(next)
    save(next)
    if (prev && prev.status !== updated.status) {
      try {
        const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
        log.unshift({ at: new Date().toISOString(), action: 'status_changed', gigId: updated.id, client: updated.clientName, from: prev.status, to: updated.status })
        localStorage.setItem('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
      } catch {}
    }
  }

  const deleteGig = (id: string) => {
    const gig = gigs.find(g => g.id === id)
    const next = gigs.filter(g => g.id !== id)
    setGigs(next)
    save(next)
    if (gig) {
      try {
        const log = JSON.parse(localStorage.getItem('orca-dj-activity') || '[]')
        log.unshift({ at: new Date().toISOString(), action: 'deleted', gigId: id, client: gig.clientName, date: gig.date })
        localStorage.setItem('orca-dj-activity', JSON.stringify(log.slice(0, 50)))
      } catch {}
    }
  }

  // Load booking requests when switching to requests tab
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/dj/bookings')
      if (res.ok) {
        const data = await res.json()
        setRequests((data.bookings || data || []).filter((r: BookingRequest) => r.status !== 'dj_blocked'))
      }
    } catch {}
    setLoadingRequests(false)
  }, [])

  useEffect(() => {
    if (activeSection === 'requests' && requests.length === 0) loadRequests()
  }, [activeSection, loadRequests, requests.length])

  const generateReply = async (type: 'inquiry' | 'decline') => {
    if (!selectedRequest) return
    setGeneratingReply(true)
    setReplyError('')
    try {
      const res = await fetch('/api/dj/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: selectedRequest, type }),
      })
      if (!res.ok) throw new Error('Generation failed')
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
        body: JSON.stringify({ to: selectedRequest.client_email, subject: replySubject, body: generatedReply }),
      })
      if (!res.ok) throw new Error('Send failed')
      await fetch('/api/dj/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequest.id, status: 'reviewed' }),
      })
      setReplySent(`Reply sent to ${selectedRequest.client_email}`)
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: 'reviewed' as const } : r))
      setTimeout(() => setReplySent(''), 4000)
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : 'Send failed')
    }
    setSendingReply(false)
  }

  const updateRequestStatus = async (id: string, status: BookingRequest['status']) => {
    try {
      await fetch('/api/dj/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      if (selectedRequest?.id === id) setSelectedRequest(prev => prev ? { ...prev, status } : prev)
    } catch {}
  }

  const blockDate = async () => {
    if (!blockedDate) return
    setBlockingDate(true)
    try {
      await fetch('/api/dj/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: [{ date: blockedDate, reason: 'Manual block' }] }),
      })
      setBlockSuccess(`${new Date(blockedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} blocked.`)
      setBlockedDate('')
      setTimeout(() => setBlockSuccess(''), 4000)
    } catch {}
    setBlockingDate(false)
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? gigs : gigs.filter(g => g.status === filterStatus)
    return [...list].sort((a, b) => a.date.localeCompare(b.date))
  }, [gigs, filterStatus])

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
    if (days <= 7) return `Gig in ${days} day${days === 1 ? '' : 's'} — ${stats.nextGig.clientName} at ${stats.nextGig.venue || 'TBD'}. Confirm invoice, playlist, and gear.`
    return null
  }, [stats])

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: theme.text }}>DJ Maskoff</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: theme.subtext }}>{gigs.length} gig{gigs.length !== 1 ? 's' : ''}</p>
            {syncStatus === 'syncing' && <span className="text-[10px] font-bold animate-pulse" style={{ color: BENTLEY_GOLD }}>Syncing…</span>}
            {syncStatus === 'synced' && conflicts.length === 0 && <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: BENTLEY_GREEN }}><CheckCircle size={9} /> Synced</span>}
            {syncStatus === 'error' && (
              <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: BENTLEY_RED }} title={syncDetail || syncState.lastError || 'Unknown error'}>
                <AlertCircle size={9} /> {syncDetail ? syncDetail.slice(0, 40) : 'Sync error'}
              </span>
            )}
            {!navigator.onLine && <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: BENTLEY_GOLD }}><AlertTriangle size={9} /> Offline</span>}
            {conflicts.length > 0 && <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: BENTLEY_RED }}><AlertTriangle size={9} /> Conflict</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleForceSync}
            disabled={syncStatus === 'syncing'}
            className="px-2 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
            title="Full cloud sync — pull + push all data"
            style={{ background: `${BENTLEY_GREEN}15`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30`, opacity: syncStatus === 'syncing' ? 0.5 : 1 }}
          >
            <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} /> Sync Now
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              const data = JSON.stringify(gigs, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `dj-gigs-backup-${new Date().toISOString().slice(0,10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-2 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
            title="Export gig data backup"
            style={{ background: `${BENTLEY_INDIGO}15`, color: BENTLEY_INDIGO, border: `1px solid ${BENTLEY_INDIGO}30` }}
          >
            <FileText size={12} /> Backup
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAdd(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${DJ_PINK}18`, color: DJ_PINK, border: `1px solid ${DJ_PINK}30` }}
          >
            <Plus size={12} /> Add Gig
          </motion.button>
        </div>
      </div>

      {/* Double-booking conflict banner */}
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-2 rounded-xl p-3 flex items-start gap-2"
            style={{ background: `${BENTLEY_RED}15`, border: `1px solid ${BENTLEY_RED}30` }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: BENTLEY_RED }} />
            <div>
              <p className="text-xs font-bold" style={{ color: BENTLEY_RED }}>Double-booking conflict detected</p>
              <p className="text-[11px] mt-0.5" style={{ color: theme.subtext }}>
                {conflicts.map(c => c.date).join(', ')} already has a client booking request. Review in Website tab.
              </p>
            </div>
            <button onClick={() => setConflicts([])} className="ml-auto p-0.5" style={{ color: theme.subtext }}><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto lg:max-w-3xl"
      >
        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          <div className="rounded-xl p-2.5 text-center overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold" style={{ color: DJ_PINK }}>{stats.upcoming}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Upcoming</div>
          </div>
          <div className="rounded-xl p-2.5 text-center overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold" style={{ color: BENTLEY_GOLD }}>{gigs.length}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Total</div>
          </div>
          <div className="rounded-xl p-2.5 text-center overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xs font-black leading-tight truncate" style={{ color: BENTLEY_INDIGO }}>{fmt(stats.bookedValue)}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Booked</div>
          </div>
          <div className="rounded-xl p-2.5 text-center overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xs font-black leading-tight truncate" style={{ color: BENTLEY_GREEN }}>{fmt(stats.totalEarned)}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Earned</div>
          </div>
        </motion.div>

        {/* Upcoming gig alert */}
        {upcomingAlert && (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: `${DJ_PINK}12`, border: `1px solid ${DJ_PINK}30` }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: DJ_PINK }} />
            <p className="text-sm leading-snug flex-1" style={{ color: theme.text }}>{upcomingAlert}</p>
          </motion.div>
        )}

        {/* Section Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          {([
            ['gigs', 'Gigs', Mic2],
            ['requests', 'Website', MessageSquare],
            ['crm', 'Clients', Users],
            ['email', 'Email', Mail],
          ] as const).map(([s, label, Icon]) => (
            <button
              key={s}
              onClick={() => setActiveSection(s as typeof activeSection)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              style={{
                background: activeSection === s ? DJ_PINK : 'transparent',
                color: activeSection === s ? '#fff' : theme.subtext,
                minWidth: 60,
              }}
            >
              <Icon size={12} /> {label}
              {s === 'requests' && requests.filter(r => r.status === 'new').length > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded-full text-[9px] font-black" style={{ background: DJ_PINK, color: '#fff', opacity: activeSection === 'requests' ? 0.7 : 1 }}>
                  {requests.filter(r => r.status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {activeSection === 'gigs' && (
          <>
            {/* Filter */}
            <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'confirmed', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s as GigStatus | 'all')}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: filterStatus === s ? DJ_PINK : theme.card,
                    color: filterStatus === s ? '#fff' : theme.subtext,
                    border: `1px solid ${filterStatus === s ? DJ_PINK : theme.border}`,
                  }}
                >
                  {s === 'all' ? 'All' : STATUS_CONFIG[s as GigStatus].label}
                </button>
              ))}
            </motion.div>

            {/* Gig List */}
            {filtered.length === 0 ? (
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <Mic2 size={32} style={{ color: theme.subtext, margin: '0 auto 12px' }} />
                  <p className="text-sm font-medium" style={{ color: theme.text }}>No gigs here.</p>
                  <p className="text-xs mt-1" style={{ color: theme.subtext }}>Tap "Add Gig" to get started.</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filtered.map(gig => (
                  <GigCard key={gig.id} gig={gig} onUpdate={updateGig} onDelete={deleteGig} />
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'crm' && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: DJ_PINK }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Client Database</span>
            </div>
            <CRMPanel gigs={gigs} />
          </motion.div>
        )}

        {activeSection === 'email' && (
          <motion.div variants={fadeUp}>
            <EmailPanel gigs={gigs} />
          </motion.div>
        )}

        {activeSection === 'requests' && (
          <motion.div variants={fadeUp} className="space-y-4">
            {/* Filter row */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'new', 'reviewed', 'quoted', 'booked', 'declined'] as const).map(s => {
                const count = s !== 'all' ? requests.filter(r => r.status === s).length : requests.length
                const colors = REQUEST_STATUS_COLORS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setRequestFilter(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
                    style={{
                      background: requestFilter === s ? (colors?.bg || `${DJ_PINK}20`) : theme.card,
                      color: requestFilter === s ? (colors?.text || DJ_PINK) : theme.subtext,
                      border: `1px solid ${requestFilter === s ? (colors?.text || DJ_PINK) + '60' : theme.border}`,
                    }}
                  >
                    {s === 'all' ? 'All' : REQUEST_STATUS_LABELS[s]} ({count})
                  </button>
                )
              })}
            </div>

            {/* Reload + block date row */}
            <div className="flex items-center gap-2">
              <button
                onClick={loadRequests}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: `${BENTLEY_INDIGO}15`, color: BENTLEY_INDIGO, border: `1px solid ${BENTLEY_INDIGO}30` }}
              >
                <RefreshCw size={11} /> Refresh
              </button>
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="date"
                  value={blockedDate}
                  onChange={e => setBlockedDate(e.target.value)}
                  className="px-2 py-1.5 rounded-xl border text-xs"
                  style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
                />
                <button
                  onClick={blockDate}
                  disabled={!blockedDate || blockingDate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                  style={{ background: `${BENTLEY_RED}15`, color: BENTLEY_RED, border: `1px solid ${BENTLEY_RED}30` }}
                >
                  <Ban size={11} /> Block Date
                </button>
              </div>
            </div>
            {blockSuccess && <p className="text-xs font-semibold" style={{ color: BENTLEY_GREEN }}>{blockSuccess}</p>}

            {/* Loading state */}
            {loadingRequests && (
              <div className="flex items-center justify-center py-12 gap-2" style={{ color: theme.subtext }}>
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading requests…</span>
              </div>
            )}

            {/* Empty state */}
            {!loadingRequests && requests.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <MessageSquare size={32} style={{ color: theme.subtext, margin: '0 auto 12px' }} />
                <p className="text-sm font-semibold" style={{ color: theme.text }}>No booking requests yet</p>
                <p className="text-xs mt-1" style={{ color: theme.subtext }}>Requests from orcafin.app/maskoffdadj will appear here.</p>
                <a href="/maskoffdadj" target="_blank" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${DJ_PINK}18`, color: DJ_PINK, border: `1px solid ${DJ_PINK}30` }}>
                  View Public Website
                </a>
              </div>
            )}

            {/* Request cards */}
            {!loadingRequests && (requestFilter === 'all' ? requests : requests.filter(r => r.status === requestFilter)).map(r => {
              const isExpanded = selectedRequest?.id === r.id
              const colors = REQUEST_STATUS_COLORS[r.status] || REQUEST_STATUS_COLORS['reviewed']
              return (
                <div key={r.id} className="rounded-2xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  {/* Collapsed header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => {
                      if (isExpanded) {
                        setSelectedRequest(null)
                      } else {
                        setSelectedRequest(r)
                        setGeneratedReply('')
                        setReplySubject('')
                        setReplyError('')
                        setReplySent('')
                      }
                    }}
                  >
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: colors.bg, color: colors.text }}>
                      {REQUEST_STATUS_LABELS[r.status] || r.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{r.client_name}</p>
                      <p className="text-xs truncate" style={{ color: theme.subtext }}>{r.event_type} · {r.date} · {r.city}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} style={{ color: theme.subtext, shrink: 0 }} /> : <ChevronDown size={14} style={{ color: theme.subtext }} />}
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: theme.border }}>
                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {[
                          ['Email', r.client_email],
                          ['Phone', r.client_phone || '—'],
                          ['Date', r.date],
                          ['City', r.city],
                          ['Venue', r.location || '—'],
                          ['Start', r.start_time || '—'],
                          ['End', r.end_time || '—'],
                          ['Guests', r.guest_count ? String(r.guest_count) : '—'],
                          ['MC', r.mc_needed ? 'Yes' : 'No'],
                          ['Budget', r.budget_range || '—'],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>{label}</p>
                            <p className="text-sm" style={{ color: theme.text }}>{val}</p>
                          </div>
                        ))}
                        {r.special_requests && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.subtext }}>Special Requests</p>
                            <p className="text-xs px-3 py-2 rounded-xl" style={{ color: theme.text, background: theme.bg }}>{r.special_requests}</p>
                          </div>
                        )}
                      </div>

                      {/* Generate reply */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.subtext }}>AI Reply</p>
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => generateReply('inquiry')}
                            disabled={generatingReply}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                            style={{ background: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO, border: `1px solid ${BENTLEY_INDIGO}30` }}
                          >
                            {generatingReply ? <Loader2 size={11} className="animate-spin" /> : <Edit3 size={11} />} Draft Inquiry
                          </button>
                          <button
                            onClick={() => generateReply('decline')}
                            disabled={generatingReply}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                            style={{ background: `${BENTLEY_RED}18`, color: BENTLEY_RED, border: `1px solid ${BENTLEY_RED}30` }}
                          >
                            {generatingReply ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Draft Decline
                          </button>
                        </div>
                        {replyError && <p className="text-xs mb-2" style={{ color: BENTLEY_RED }}>{replyError}</p>}
                        {generatedReply && (
                          <div className="space-y-2">
                            <input
                              value={replySubject}
                              onChange={e => setReplySubject(e.target.value)}
                              placeholder="Subject"
                              className="w-full px-3 py-2 rounded-xl border text-sm"
                              style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                            <textarea
                              value={generatedReply}
                              onChange={e => setGeneratedReply(e.target.value)}
                              rows={7}
                              className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none"
                              style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={sendReply}
                                disabled={sendingReply}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                                style={{ background: BENTLEY_GREEN, color: '#fff' }}
                              >
                                {sendingReply ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Send to {r.client_email}
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(generatedReply)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                                style={{ background: theme.card, color: theme.subtext, border: `1px solid ${theme.border}` }}
                              >
                                <Copy size={11} /> Copy
                              </button>
                              {replySent && <span className="text-xs flex items-center gap-1" style={{ color: BENTLEY_GREEN }}><CheckCircle2 size={11} /> {replySent}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status update */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.subtext }}>Update Status</p>
                        <div className="flex gap-2 flex-wrap">
                          {(['new', 'reviewed', 'quoted', 'booked', 'declined'] as const).map(s => {
                            const sc = REQUEST_STATUS_COLORS[s]
                            return (
                              <button
                                key={s}
                                onClick={() => updateRequestStatus(r.id, s)}
                                className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                                style={{
                                  background: r.status === s ? sc.bg : theme.bg,
                                  color: r.status === s ? sc.text : theme.subtext,
                                  border: `1px solid ${r.status === s ? sc.text + '60' : theme.border}`,
                                }}
                              >
                                {REQUEST_STATUS_LABELS[s]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Add Gig Modal */}
      <AnimatePresence>
        {showAdd && <AddGigModal onAdd={addGig} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
