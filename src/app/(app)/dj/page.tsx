'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Plus, Sparkles, Calendar, DollarSign,
  Check, Clock, MapPin, Phone, Mail, Trash2, ChevronRight,
  Edit3, X, Users, FileText, ChevronDown, ChevronUp,
  AlertCircle, Star, TrendingUp,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { DJGig, GigStatus, GigType, DJPartialPayment } from '@/lib/types'
import { fmt } from '@/lib/utils'

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
    status: 'inquiry' as GigStatus,
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

  return (
    <div className="space-y-3">
      {/* Balance header */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: `${BENTLEY_RED}10`, border: `1px solid ${BENTLEY_RED}25` }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Balance Remaining</span>
          <span className="text-2xl font-black" style={{ color: remaining <= 0 ? BENTLEY_GREEN : BENTLEY_RED }}>{fmt(remaining)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div>
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Contract</p>
            <p className="text-sm font-bold" style={{ color: theme.text }}>{fmt(contract)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Paid</p>
            <p className="text-sm font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold" style={{ color: theme.subtext }}>Due</p>
            <p className="text-sm font-bold" style={{ color: remaining > 0 ? BENTLEY_RED : BENTLEY_GREEN }}>{remaining > 0 ? fmt(remaining) : 'PAID'}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mt-1" style={{ background: theme.border }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? BENTLEY_GREEN : BENTLEY_GOLD }} />
        </div>
      </div>

      {/* Deposit row */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.text }}>Deposit</p>
          <p className="text-xs" style={{ color: theme.subtext }}>{fmt(gig.depositAmount || 0)}</p>
        </div>
        <button
          onClick={toggleDeposit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
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
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${BENTLEY_INDIGO}10`, border: `1px solid ${BENTLEY_INDIGO}20` }}>
              <Check size={11} style={{ color: BENTLEY_INDIGO }} />
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: theme.text }}>{fmt(p.amount)}</p>
                {p.note && <p className="text-[10px]" style={{ color: theme.subtext }}>{p.note}</p>}
              </div>
              <p className="text-[10px]" style={{ color: theme.subtext }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              <button onClick={() => removePartial(p.id)} className="p-1 rounded" style={{ color: BENTLEY_RED }}>
                <X size={10} />
              </button>
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
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
  const status = STATUS_CONFIG[gig.status]
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

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${isUpcoming && daysUntil <= 3 ? `${DJ_PINK}50` : theme.border}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="p-2 rounded-xl shrink-0" style={{ background: gig.isLead ? `${BENTLEY_GOLD}18` : `${DJ_PINK}18` }}>
          {gig.isLead ? <Star size={15} style={{ color: BENTLEY_GOLD }} /> : <Mic2 size={15} style={{ color: DJ_PINK }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate" style={{ color: theme.text }}>{gig.clientName}</p>
            {gig.isLead && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${BENTLEY_GOLD}20`, color: BENTLEY_GOLD }}>LEAD</span>}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${status.color}18`, color: status.color }}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: theme.subtext }}>
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
                      {(['inquiry', 'pending', 'confirmed', 'completed', 'cancelled'] as GigStatus[]).map(s => (
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
      status: form.status || 'inquiry',
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
        onClick={e => e.stopPropagation()}
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
            <select className={inputCls} style={inputStyle} value={form.status || 'inquiry'} onChange={e => f({ status: e.target.value as GigStatus })}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
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
  const [gigs, setGigs] = useState<DJGig[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState<GigStatus | 'all' | 'leads'>('all')
  const [activeSection, setActiveSection] = useState<'gigs' | 'crm'>('gigs')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Migrate old gigs: ensure partialPayments and contractAmount exist
        const migrated = parsed.map((g: any) => ({
          ...g,
          contractAmount: g.contractAmount || g.fee || 0,
          depositAmount: g.depositAmount || 0,
          partialPayments: g.partialPayments || [],
        }))
        setGigs(migrated)
      }
    } catch {}
  }, [])

  const syncAvailability = (g: DJGig[]) => {
    const dates = g
      .filter(x => x.status === 'confirmed' || x.status === 'pending')
      .map(x => x.date)
      .filter(Boolean)
    fetch('/api/dj-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates }),
    }).catch(() => {})
  }

  const save = (g: DJGig[]) => {
    try { localStorage.setItem('orca-dj-gigs', JSON.stringify(g)) } catch {}
    syncAvailability(g)
  }

  const addGig = (gig: DJGig) => {
    const next = [...gigs, gig]
    setGigs(next)
    save(next)
    setShowAdd(false)
  }

  const updateGig = (updated: DJGig) => {
    const next = gigs.map(g => g.id === updated.id ? updated : g)
    setGigs(next)
    save(next)
  }

  const deleteGig = (id: string) => {
    const next = gigs.filter(g => g.id !== id)
    setGigs(next)
    save(next)
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    let list = gigs
    if (filterStatus === 'leads') list = gigs.filter(g => g.isLead || g.status === 'inquiry')
    else if (filterStatus !== 'all') list = gigs.filter(g => g.status === filterStatus)
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [gigs, filterStatus])

  const stats = useMemo(() => {
    const upcoming = gigs.filter(g => g.date >= today && g.status === 'confirmed')
    const totalEarned = gigs.filter(g => g.status === 'completed').reduce((s, g) => s + calcTotalPaid(g), 0)
    const pendingRevenue = upcoming.reduce((s, g) => s + (g.contractAmount || g.fee), 0)
    const leads = gigs.filter(g => g.isLead || g.status === 'inquiry').length
    return { upcoming: upcoming.length, totalEarned, pendingRevenue, leads, nextGig: upcoming.sort((a, b) => a.date.localeCompare(b.date))[0] }
  }, [gigs, today])

  const bentleyAlert = useMemo(() => {
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
          <h1 className="text-lg font-bold" style={{ color: theme.text }}>DJ Gig Manager</h1>
          <p className="text-xs" style={{ color: theme.subtext }}>{gigs.length} gig{gigs.length !== 1 ? 's' : ''} · {stats.leads} lead{stats.leads !== 1 ? 's' : ''}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowAdd(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: `${DJ_PINK}18`, color: DJ_PINK, border: `1px solid ${DJ_PINK}30` }}
        >
          <Plus size={12} /> Add Gig
        </motion.button>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto"
      >
        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold" style={{ color: DJ_PINK }}>{stats.upcoming}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Upcoming</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold" style={{ color: BENTLEY_GOLD }}>{stats.leads}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Leads</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold leading-tight" style={{ color: BENTLEY_INDIGO }}>{fmt(stats.pendingRevenue)}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Pending</div>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-lg font-bold leading-tight" style={{ color: BENTLEY_GREEN }}>{fmt(stats.totalEarned)}</div>
            <div className="text-[9px]" style={{ color: theme.subtext }}>Earned</div>
          </div>
        </motion.div>

        {/* Bentley Alert */}
        {bentleyAlert && (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${DJ_PINK}30` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Bentley Alert</span>
            </div>
            <p className="text-sm leading-snug" style={{ color: '#CBD5E1' }}>{bentleyAlert}</p>
          </motion.div>
        )}

        {/* Section Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          {([['gigs', 'Gigs', Mic2], ['crm', 'CRM / Clients', Users]] as const).map(([s, label, Icon]) => (
            <button
              key={s}
              onClick={() => setActiveSection(s as 'gigs' | 'crm')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: activeSection === s ? DJ_PINK : 'transparent',
                color: activeSection === s ? '#fff' : theme.subtext,
              }}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </motion.div>

        {activeSection === 'gigs' && (
          <>
            {/* Filter */}
            <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'leads', 'inquiry', 'pending', 'confirmed', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: filterStatus === s ? DJ_PINK : theme.card,
                    color: filterStatus === s ? '#fff' : theme.subtext,
                    border: `1px solid ${filterStatus === s ? DJ_PINK : theme.border}`,
                  }}
                >
                  {s === 'all' ? 'All' : s === 'leads' ? 'Leads' : STATUS_CONFIG[s as GigStatus].label}
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
      </motion.div>

      {/* Add Gig Modal */}
      <AnimatePresence>
        {showAdd && <AddGigModal onAdd={addGig} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
