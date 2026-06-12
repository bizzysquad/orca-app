'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, Users, FileText, Mail, RefreshCw, Plus,
  Check, X, Phone, Calendar, MapPin, Clock, DollarSign,
  Send, Sparkles, Trash2, Edit3, AlertCircle,
} from 'lucide-react'
import { useTheme, type Theme } from '@/context/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingStatus = 'new' | 'contacted' | 'pending' | 'confirmed' | 'declined'
type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'

interface Booking {
  id: string
  client_name: string
  client_email: string
  client_phone?: string
  event_type: string
  date: string
  start_time?: string
  end_time?: string
  location?: string
  city?: string
  guest_count?: number
  mc_needed?: boolean
  budget_range?: string
  special_requests?: string
  status: BookingStatus
  notes?: string
  created_at: string
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  source?: string
  notes?: string
  tags?: string[]
  created_at: string
}

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  client_name?: string
  client_email?: string
  client_phone?: string
  event_date?: string
  event_type?: string
  status: InvoiceStatus
  line_items: LineItem[]
  subtotal: number
  deposit_amount: number
  deposit_paid: boolean
  balance_due: number
  due_date?: string
  notes?: string
  created_at: string
  sent_at?: string
  paid_at?: string
  dj_clients?: { name: string; email: string }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  new: '#6366F1',
  contacted: '#F59E0B',
  pending: '#3B82F6',
  confirmed: '#10B981',
  declined: '#EF4444',
}

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#6B7280',
  sent: '#6366F1',
  viewed: '#F59E0B',
  paid: '#10B981',
  overdue: '#EF4444',
  cancelled: '#9CA3AF',
}

const TABS = [
  { id: 'bookings', label: 'Bookings', icon: Inbox },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'email', label: 'Email', icon: Mail },
] as const

type Tab = typeof TABS[number]['id']

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DJHubPage() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<Tab>('bookings')

  // Data state
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  // UI state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'all'>('all')

  // Email composer state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailContext, setEmailContext] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dj/bookings')
      const d = await r.json()
      if (d.bookings) setBookings(d.bookings)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    const r = await fetch('/api/dj/clients')
    const d = await r.json()
    if (d.clients) setClients(d.clients)
  }, [])

  const fetchInvoices = useCallback(async () => {
    const r = await fetch('/api/dj/invoices')
    const d = await r.json()
    if (d.invoices) setInvoices(d.invoices)
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchClients()
    fetchInvoices()
  }, [fetchBookings, fetchClients, fetchInvoices])

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function updateBookingStatus(id: string, status: BookingStatus, notes?: string) {
    const payload: Record<string, unknown> = { id, status }
    if (notes !== undefined) payload.notes = notes
    await fetch('/api/dj/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status, ...(notes !== undefined ? { notes } : {}) } : b))
    if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status } : null)
  }

  async function createClientFromBooking(b: Booking) {
    const r = await fetch('/api/dj/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: b.client_name, email: b.client_email, phone: b.client_phone, source: 'booking_form' }),
    })
    const d = await r.json()
    if (d.client) setClients(prev => [d.client, ...prev])
    return d.client
  }

  async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
    await fetch('/api/dj/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
    if (selectedInvoice?.id === id) setSelectedInvoice(prev => prev ? { ...prev, status } : null)
  }

  // ── Bentley email draft ──────────────────────────────────────────────────────

  async function bentleyDraftEmail() {
    if (!emailContext.trim()) return
    setEmailLoading(true)
    try {
      const prompt = `Draft a professional DJ booking email. Context: ${emailContext}.
To: ${emailTo || 'client'}. Subject should match the context.
Write the email body only (no subject line at the top). Keep it professional, warm, and concise.
End with: "Best regards,\nMask Off Da DJ\nmaskoffdadj@gmail.com"`
      const r = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await r.json()
      if (d.message) {
        setEmailBody(d.message)
        if (!emailSubject && emailContext) {
          const subjectPrompt = `Write only a short email subject line (under 10 words) for this DJ booking email context: ${emailContext}`
          const sr = await fetch('/api/bentley', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: subjectPrompt }] }),
          })
          const sd = await sr.json()
          if (sd.message) setEmailSubject(sd.message.replace(/^["']|["']$/g, ''))
        }
      }
    } finally {
      setEmailLoading(false)
    }
  }

  async function sendEmail() {
    if (!emailTo || !emailSubject || !emailBody) return
    setEmailSending(true)
    try {
      const r = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, html: emailBody.replace(/\n/g, '<br/>') }),
      })
      const d = await r.json()
      if (d.success) {
        setEmailSent(true)
        setTimeout(() => { setEmailSent(false); setEmailTo(''); setEmailSubject(''); setEmailBody(''); setEmailContext('') }, 3000)
      }
    } finally {
      setEmailSending(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filteredBookings = bookingFilter === 'all' ? bookings : bookings.filter(b => b.status === bookingFilter)
  const newCount = bookings.filter(b => b.status === 'new').length
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.subtotal || 0), 0)
  const pendingRevenue = invoices.filter(i => ['sent', 'viewed'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-12">
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black" style={{ color: theme.text }}>DJ Business Hub</h1>
              <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                {newCount > 0 && <span className="text-indigo-400 font-semibold">{newCount} new {newCount === 1 ? 'booking' : 'bookings'} · </span>}
                {clients.length} clients · {fmt(totalRevenue)} collected · {fmt(pendingRevenue)} pending
              </p>
            </div>
            <button
              onClick={() => { fetchBookings(); fetchClients(); fetchInvoices() }}
              className="p-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <RefreshCw size={15} style={{ color: theme.textM }} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-3">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: active ? '#6366F1' : theme.card,
                    color: active ? '#fff' : theme.textM,
                    border: `1px solid ${active ? '#6366F1' : theme.border}`,
                  }}
                >
                  <Icon size={12} />
                  {t.label}
                  {t.id === 'bookings' && newCount > 0 && (
                    <span className="ml-0.5 bg-white/30 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                      {newCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">

        {/* ── BOOKINGS TAB ───────────────────────────────────────────────────── */}
        {tab === 'bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Status filter */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {(['all', 'new', 'contacted', 'pending', 'confirmed', 'declined'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setBookingFilter(s)}
                  className="px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all"
                  style={{
                    backgroundColor: bookingFilter === s
                      ? (s === 'all' ? '#6366F1' : BOOKING_STATUS_COLORS[s as BookingStatus])
                      : theme.card,
                    color: bookingFilter === s ? '#fff' : theme.textM,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {s}
                  {s !== 'all' && ` (${bookings.filter(b => b.status === s).length})`}
                </button>
              ))}
            </div>

            {loading && (
              <div className="text-center py-12" style={{ color: theme.textM }}>Loading bookings…</div>
            )}

            {!loading && filteredBookings.length === 0 && (
              <div className="text-center py-16" style={{ color: theme.textM }}>
                <Inbox size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No {bookingFilter !== 'all' ? bookingFilter : ''} bookings yet</p>
                <p className="text-sm mt-1">They'll appear here when customers submit requests at orcafin.app/maskoffdadj</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredBookings.map(b => (
                <motion.div
                  key={b.id}
                  layoutId={b.id}
                  className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                  onClick={() => setSelectedBooking(b)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: theme.text }}>{b.client_name}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${BOOKING_STATUS_COLORS[b.status]}20`, color: BOOKING_STATUS_COLORS[b.status] }}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color: theme.textM }}>
                          <Calendar size={11} />{fmtDate(b.date)}
                        </span>
                        <span className="text-xs capitalize" style={{ color: theme.textM }}>{b.event_type?.replace(/-/g, ' ')}</span>
                        {b.city && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: theme.textM }}>
                            <MapPin size={11} />{b.city}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: theme.textM }}>{b.client_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {b.budget_range && (
                        <p className="text-xs font-semibold" style={{ color: '#10B981' }}>{b.budget_range}</p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: theme.textM }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CLIENTS TAB ────────────────────────────────────────────────────── */}
        {tab === 'clients' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold" style={{ color: theme.textM }}>{clients.length} clients</p>
              <button
                onClick={() => setShowNewClient(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                <Plus size={13} /> Add Client
              </button>
            </div>

            {clients.length === 0 && (
              <div className="text-center py-16" style={{ color: theme.textM }}>
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No clients yet</p>
                <p className="text-sm mt-1">Add clients manually or promote booking requests to clients</p>
              </div>
            )}

            <div className="space-y-3">
              {clients.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: theme.text }}>{c.name}</p>
                      {c.email && <p className="text-xs mt-0.5" style={{ color: theme.textM }}>{c.email}</p>}
                      {c.phone && (
                        <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: theme.textM }}>
                          <Phone size={11} />{c.phone}
                        </p>
                      )}
                      {c.notes && <p className="text-xs mt-2 italic" style={{ color: theme.textM }}>{c.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      {c.email && (
                        <button
                          onClick={() => { setTab('email'); setEmailTo(c.email || '') }}
                          className="p-2 rounded-xl"
                          style={{ backgroundColor: `#6366F120`, color: '#6366F1' }}
                          title="Email this client"
                        >
                          <Mail size={13} />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await fetch(`/api/dj/clients?id=${c.id}`, { method: 'DELETE' })
                          setClients(prev => prev.filter(x => x.id !== c.id))
                        }}
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: `#EF444420`, color: '#EF4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {c.source && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                        style={{ backgroundColor: `#6366F115`, color: '#6366F1' }}>
                        {c.source.replace(/_/g, ' ')}
                      </span>
                    )}
                    {c.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{ backgroundColor: theme.border, color: theme.textM }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── INVOICES TAB ───────────────────────────────────────────────────── */}
        {tab === 'invoices' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: theme.textM }}>{invoices.length} invoices</p>
              </div>
              <button
                onClick={() => setShowNewInvoice(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                <Plus size={13} /> New Invoice
              </button>
            </div>

            {/* Revenue summary */}
            {invoices.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Collected', value: fmt(totalRevenue), color: '#10B981' },
                  { label: 'Pending', value: fmt(pendingRevenue), color: '#F59E0B' },
                  { label: 'Drafts', value: String(invoices.filter(i => i.status === 'draft').length), color: '#6B7280' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: theme.textM }}>{s.label}</p>
                    <p className="font-black text-base" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {invoices.length === 0 && (
              <div className="text-center py-16" style={{ color: theme.textM }}>
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No invoices yet</p>
                <p className="text-sm mt-1">Create invoices from booking requests or manually</p>
              </div>
            )}

            <div className="space-y-3">
              {invoices.map(inv => {
                const clientName = inv.client_name || inv.dj_clients?.name || 'Unknown Client'
                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.005]"
                    style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold" style={{ color: theme.textM }}>
                            {inv.invoice_number}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            style={{ backgroundColor: `${INVOICE_STATUS_COLORS[inv.status]}20`, color: INVOICE_STATUS_COLORS[inv.status] }}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="font-bold text-sm mt-1" style={{ color: theme.text }}>{clientName}</p>
                        {inv.event_date && (
                          <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: theme.textM }}>
                            <Calendar size={11} />{fmtDate(inv.event_date)}
                            {inv.event_type && ` · ${inv.event_type}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-lg" style={{ color: theme.text }}>{fmt(inv.subtotal)}</p>
                        {inv.deposit_paid && (
                          <p className="text-[10px] text-green-400">Deposit paid</p>
                        )}
                        {inv.balance_due > 0 && inv.status !== 'paid' && (
                          <p className="text-[10px]" style={{ color: theme.textM }}>
                            {fmt(inv.balance_due)} due
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── EMAIL TAB ──────────────────────────────────────────────────────── */}
        {tab === 'email' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <h2 className="font-bold text-base" style={{ color: theme.text }}>Compose Email</h2>

              {/* To field */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>To</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                {/* Quick-fill from clients */}
                {clients.filter(c => c.email).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {clients.filter(c => c.email).slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setEmailTo(c.email || '')}
                        className="px-2 py-0.5 rounded-full text-[10px] transition-all"
                        style={{ backgroundColor: emailTo === c.email ? '#6366F1' : theme.border, color: emailTo === c.email ? '#fff' : theme.textM }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>

              {/* Bentley draft assistant */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ backgroundColor: `#F59E0B10`, border: `1px solid #F59E0B30` }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} style={{ color: '#F59E0B' }} />
                  <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>Bentley Draft Assistant</span>
                </div>
                <input
                  type="text"
                  value={emailContext}
                  onChange={e => setEmailContext(e.target.value)}
                  placeholder="Tell Bentley what to write… e.g. 'follow-up for Sarah's wedding quote from last week'"
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                  onKeyDown={e => { if (e.key === 'Enter') bentleyDraftEmail() }}
                />
                <button
                  onClick={bentleyDraftEmail}
                  disabled={emailLoading || !emailContext.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#F59E0B', color: '#000' }}
                >
                  {emailLoading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {emailLoading ? 'Drafting…' : 'Draft Email'}
                </button>
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>Message</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={10}
                  placeholder="Email body — or let Bentley draft it above"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={sendEmail}
                disabled={emailSending || !emailTo || !emailSubject || !emailBody || emailSent}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: emailSent ? '#10B981' : '#6366F1', color: '#fff' }}
              >
                {emailSending ? <RefreshCw size={14} className="animate-spin" /> : emailSent ? <Check size={14} /> : <Send size={14} />}
                {emailSending ? 'Sending…' : emailSent ? 'Sent!' : 'Send Email'}
              </button>

              <p className="text-[10px] text-center" style={{ color: theme.textM }}>
                Sent from maskoffdadj@gmail.com · Add GMAIL_USER + GMAIL_APP_PASSWORD to env to enable
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── BOOKING DETAIL MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-black text-lg" style={{ color: theme.text }}>{selectedBooking.client_name}</h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 inline-block"
                    style={{ backgroundColor: `${BOOKING_STATUS_COLORS[selectedBooking.status]}20`, color: BOOKING_STATUS_COLORS[selectedBooking.status] }}
                  >
                    {selectedBooking.status}
                  </span>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
                  <X size={14} style={{ color: theme.textM }} />
                </button>
              </div>

              {/* Event details */}
              <div className="space-y-2 text-sm" style={{ color: theme.text }}>
                {[
                  { icon: Calendar, label: 'Date', value: fmtDate(selectedBooking.date) },
                  { icon: Clock, label: 'Time', value: selectedBooking.start_time && selectedBooking.end_time ? `${selectedBooking.start_time} – ${selectedBooking.end_time}` : '—' },
                  { icon: MapPin, label: 'Location', value: [selectedBooking.location, selectedBooking.city].filter(Boolean).join(', ') || '—' },
                  { icon: Users, label: 'Guests', value: selectedBooking.guest_count ? String(selectedBooking.guest_count) : '—' },
                  { icon: DollarSign, label: 'Budget', value: selectedBooking.budget_range || '—' },
                  { icon: Phone, label: 'Phone', value: selectedBooking.client_phone || '—' },
                  { icon: Mail, label: 'Email', value: selectedBooking.client_email },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon size={13} style={{ color: '#6366F1' }} className="shrink-0" />
                    <span className="text-xs font-semibold w-16 shrink-0" style={{ color: theme.textM }}>{label}</span>
                    <span className="text-sm">{value}</span>
                  </div>
                ))}
                {selectedBooking.event_type && (
                  <div className="flex items-center gap-3">
                    <Inbox size={13} style={{ color: '#6366F1' }} className="shrink-0" />
                    <span className="text-xs font-semibold w-16 shrink-0" style={{ color: theme.textM }}>Type</span>
                    <span className="text-sm capitalize">{selectedBooking.event_type.replace(/-/g, ' ')}</span>
                  </div>
                )}
                {selectedBooking.mc_needed && (
                  <div className="flex items-center gap-3">
                    <AlertCircle size={13} style={{ color: '#F59E0B' }} className="shrink-0" />
                    <span className="text-xs font-semibold w-16 shrink-0" style={{ color: theme.textM }}>MC</span>
                    <span className="text-sm text-amber-400">MC/Host requested</span>
                  </div>
                )}
                {selectedBooking.special_requests && (
                  <div className="flex gap-3 mt-1">
                    <Edit3 size={13} style={{ color: '#6366F1' }} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: theme.textM }}>Special Requests</span>
                      <p className="text-sm italic">{selectedBooking.special_requests}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status actions */}
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: theme.textM }}>Update Status</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['contacted', 'pending', 'confirmed', 'declined'] as BookingStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => updateBookingStatus(selectedBooking.id, s)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all"
                      style={{
                        backgroundColor: selectedBooking.status === s ? BOOKING_STATUS_COLORS[s] : `${BOOKING_STATUS_COLORS[s]}20`,
                        color: selectedBooking.status === s ? '#fff' : BOOKING_STATUS_COLORS[s],
                      }}
                    >
                      {s === 'confirmed' && <Check size={10} className="inline mr-1" />}
                      {s === 'declined' && <X size={10} className="inline mr-1" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 flex-wrap pt-2 border-t" style={{ borderColor: theme.border }}>
                <button
                  onClick={() => { setTab('email'); setEmailTo(selectedBooking.client_email); setSelectedBooking(null) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                  style={{ backgroundColor: `#6366F120`, color: '#6366F1', border: `1px solid #6366F140` }}
                >
                  <Mail size={12} /> Email Client
                </button>
                <button
                  onClick={async () => {
                    await createClientFromBooking(selectedBooking)
                    setSelectedBooking(null)
                    setTab('clients')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                  style={{ backgroundColor: `#10B98120`, color: '#10B981', border: `1px solid #10B98140` }}
                >
                  <Users size={12} /> Save as Client
                </button>
                <button
                  onClick={() => {
                    setShowNewInvoice(true)
                    setSelectedBooking(null)
                    setTab('invoices')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                  style={{ backgroundColor: `#F59E0B20`, color: '#F59E0B', border: `1px solid #F59E0B40` }}
                >
                  <FileText size={12} /> Create Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INVOICE DETAIL MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedInvoice(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs font-bold" style={{ color: theme.textM }}>{selectedInvoice.invoice_number}</p>
                  <h2 className="font-black text-lg mt-0.5" style={{ color: theme.text }}>
                    {selectedInvoice.client_name || selectedInvoice.dj_clients?.name || 'Invoice'}
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 inline-block"
                    style={{ backgroundColor: `${INVOICE_STATUS_COLORS[selectedInvoice.status]}20`, color: INVOICE_STATUS_COLORS[selectedInvoice.status] }}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
                  <X size={14} style={{ color: theme.textM }} />
                </button>
              </div>

              {/* Line items */}
              {selectedInvoice.line_items?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: theme.textM }}>Services</p>
                  {selectedInvoice.line_items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: theme.border }}>
                      <div>
                        <p className="text-sm" style={{ color: theme.text }}>{item.description}</p>
                        <p className="text-xs" style={{ color: theme.textM }}>
                          {item.quantity} × {fmt(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-bold text-sm" style={{ color: theme.text }}>{fmt(item.total)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: theme.textM }}>Subtotal</span>
                  <span className="font-bold" style={{ color: theme.text }}>{fmt(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.deposit_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textM }}>
                      Deposit {selectedInvoice.deposit_paid ? '(paid ✓)' : '(due)'}
                    </span>
                    <span className="font-bold" style={{ color: selectedInvoice.deposit_paid ? '#10B981' : '#F59E0B' }}>
                      {fmt(selectedInvoice.deposit_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t" style={{ borderColor: theme.border }}>
                  <span className="font-bold" style={{ color: theme.text }}>Balance Due</span>
                  <span className="font-black text-lg" style={{ color: selectedInvoice.status === 'paid' ? '#10B981' : theme.text }}>
                    {fmt(selectedInvoice.balance_due)}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="text-xs italic" style={{ color: theme.textM }}>{selectedInvoice.notes}</p>
              )}

              {/* Invoice status actions */}
              <div className="flex gap-2 flex-wrap pt-2 border-t" style={{ borderColor: theme.border }}>
                {selectedInvoice.status === 'draft' && (
                  <>
                    <button
                      onClick={() => updateInvoiceStatus(selectedInvoice.id, 'sent')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                      style={{ backgroundColor: '#6366F1', color: '#fff' }}
                    >
                      <Send size={12} /> Mark Sent
                    </button>
                    {selectedInvoice.client_email && (
                      <button
                        onClick={() => { setTab('email'); setEmailTo(selectedInvoice.client_email || ''); setEmailSubject(`Invoice ${selectedInvoice.invoice_number} — Mask Off Da DJ`); setSelectedInvoice(null) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                        style={{ backgroundColor: `#6366F120`, color: '#6366F1', border: `1px solid #6366F140` }}
                      >
                        <Mail size={12} /> Email Invoice
                      </button>
                    )}
                  </>
                )}
                {['sent', 'viewed', 'overdue'].includes(selectedInvoice.status) && (
                  <>
                    <button
                      onClick={() => updateInvoiceStatus(selectedInvoice.id, 'paid')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                      style={{ backgroundColor: '#10B981', color: '#fff' }}
                    >
                      <Check size={12} /> Mark Paid
                    </button>
                    {!selectedInvoice.deposit_paid && selectedInvoice.deposit_amount > 0 && (
                      <button
                        onClick={() => {
                          fetch('/api/dj/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedInvoice.id, deposit_paid: true }) })
                          setInvoices(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, deposit_paid: true } : i))
                          setSelectedInvoice(prev => prev ? { ...prev, deposit_paid: true } : null)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-1"
                        style={{ backgroundColor: `#F59E0B20`, color: '#F59E0B', border: `1px solid #F59E0B40` }}
                      >
                        <DollarSign size={12} /> Deposit Paid
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => { updateInvoiceStatus(selectedInvoice.id, 'overdue'); setSelectedInvoice(null) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: `#EF444420`, color: '#EF4444', border: `1px solid #EF444440` }}
                >
                  <AlertCircle size={12} /> Overdue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NEW CLIENT FORM ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewClient && (
          <NewClientModal
            theme={theme}
            onClose={() => setShowNewClient(false)}
            onSave={async (data) => {
              const r = await fetch('/api/dj/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
              const d = await r.json()
              if (d.client) setClients(prev => [d.client, ...prev])
              setShowNewClient(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── NEW INVOICE FORM ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewInvoice && (
          <NewInvoiceModal
            theme={theme}
            clients={clients}
            onClose={() => setShowNewInvoice(false)}
            onSave={async (data) => {
              const r = await fetch('/api/dj/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
              const d = await r.json()
              if (d.invoice) setInvoices(prev => [d.invoice, ...prev])
              setShowNewInvoice(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── New Client Modal ──────────────────────────────────────────────────────────

function NewClientModal({ theme, onClose, onSave }: {
  theme: Theme
  onClose: () => void
  onSave: (data: Record<string, string>) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: theme.text }}>Add Client</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
            <X size={14} style={{ color: theme.textM }} />
          </button>
        </div>
        {[
          { label: 'Name *', value: name, set: setName, type: 'text', placeholder: 'Client full name' },
          { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'client@email.com' },
          { label: 'Phone', value: phone, set: setPhone, type: 'tel', placeholder: '+1 (555) 000-0000' },
          { label: 'Notes', value: notes, set: setNotes, type: 'text', placeholder: 'Any notes…' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>{f.label}</label>
            <input
              type={f.type}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>
        ))}
        <button
          onClick={() => name.trim() && onSave({ name, email, phone, notes })}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ backgroundColor: '#6366F1', color: '#fff' }}
        >
          Save Client
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── New Invoice Modal ─────────────────────────────────────────────────────────

function NewInvoiceModal({ theme, clients, onClose, onSave }: {
  theme: Theme
  clients: Client[]
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
}) {
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ description: 'DJ Services', quantity: 1, unit_price: 0, total: 0 }])
  const [depositPct, setDepositPct] = useState(25)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const depositAmount = Math.round(subtotal * (depositPct / 100))
  const balanceDue = subtotal - depositAmount

  function updateItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }

  function handleClientSelect(id: string) {
    setClientId(id)
    const c = clients.find(c => c.id === id)
    if (c) { setClientName(c.name); setClientEmail(c.email || '') }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: theme.text }}>New Invoice</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
            <X size={14} style={{ color: theme.textM }} />
          </button>
        </div>

        {/* Client */}
        {clients.length > 0 && (
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>Select Client</label>
            <select
              value={clientId}
              onChange={e => handleClientSelect(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              <option value="">— Select existing client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {[
          { label: 'Client Name *', value: clientName, set: setClientName, placeholder: 'Full name', type: 'text' },
          { label: 'Client Email', value: clientEmail, set: setClientEmail, placeholder: 'email@example.com', type: 'email' },
          { label: 'Event Date', value: eventDate, set: setEventDate, placeholder: '', type: 'date' },
          { label: 'Event Type', value: eventType, set: setEventType, placeholder: 'e.g. Wedding, Corporate', type: 'text' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>{f.label}</label>
            <input
              type={f.type}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>
        ))}

        {/* Line items */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: theme.textM }}>Services</label>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                <input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="$"
                  className="w-20 rounded-xl px-2 py-2 text-xs outline-none text-center"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                <button
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `#EF444415`, color: '#EF4444' }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }])}
            className="flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: `#6366F115`, color: '#6366F1' }}
          >
            <Plus size={11} /> Add Line Item
          </button>
        </div>

        {/* Deposit % */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>
            Deposit: {depositPct}% ({subtotal > 0 ? `$${depositAmount}` : '$0'})
          </label>
          <select
            value={depositPct}
            onChange={e => setDepositPct(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
          >
            {[0, 25, 50, 100].map(p => <option key={p} value={p}>{p}%</option>)}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>Payment Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
          />
        </div>

        {/* Totals preview */}
        {subtotal > 0 && (
          <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: `#6366F110`, border: `1px solid #6366F130` }}>
            <div className="flex justify-between text-xs" style={{ color: theme.textM }}>
              <span>Subtotal</span><span>${subtotal}</span>
            </div>
            <div className="flex justify-between text-xs" style={{ color: theme.textM }}>
              <span>Deposit ({depositPct}%)</span><span>${depositAmount}</span>
            </div>
            <div className="flex justify-between text-sm font-bold" style={{ color: theme.text }}>
              <span>Balance Due</span><span>${balanceDue}</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: theme.textM }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Payment terms, cancellation policy, etc."
            className="w-full rounded-xl px-3 py-2.5 text-xs outline-none resize-none"
            style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
          />
        </div>

        <button
          onClick={() => clientName.trim() && onSave({
            client_id: clientId || null,
            client_name: clientName,
            client_email: clientEmail,
            event_date: eventDate || null,
            event_type: eventType || null,
            line_items: items.filter(i => i.description),
            subtotal,
            deposit_amount: depositAmount,
            balance_due: balanceDue,
            due_date: dueDate || null,
            notes,
          })}
          disabled={!clientName.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ backgroundColor: '#6366F1', color: '#fff' }}
        >
          Create Invoice
        </button>
      </motion.div>
    </motion.div>
  )
}
