'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LayoutDashboard, MessageSquare, Calendar, Users, FileText, Mail,
  ChevronDown, ChevronUp, RefreshCw, Send, Check, X, Edit3,
  Loader2, AlertTriangle, Clock, Plus, Eye, ArrowRight, Zap,
  Music2, DollarSign, Star, Phone, MapPin, User, ExternalLink,
  CheckCircle2, XCircle, Copy, Trash2, ChevronLeft, ChevronRight,
  Ban, Bell,
} from 'lucide-react'

// ── Color palette ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0A0E1A',
  surface: '#111827',
  surface2: '#1F2937',
  surface3: '#374151',
  border: '#1F2937',
  borderLight: '#374151',
  text: '#F9FAFB',
  muted: '#9CA3AF',
  mutedDark: '#6B7280',
  blue: '#3B82F6',
  blueLight: '#1D4ED8',
  blueBg: '#1E3A5F',
  gold: '#F59E0B',
  goldBg: '#451A03',
  green: '#22C55E',
  greenBg: '#052E16',
  red: '#EF4444',
  redBg: '#450A0A',
  amber: '#F97316',
  amberBg: '#431407',
  purple: '#A78BFA',
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface LocalGig {
  id: string
  clientName: string
  eventType: string
  date: string
  venue: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'inquiry' | 'pending'
  contractAmount?: number
  fee?: number
  depositPaid?: boolean
  balancePaid?: boolean
  clientEmail?: string
  clientPhone?: string
  notes?: string
}

interface DJClient {
  id: string
  name: string
  email: string
  phone?: string
  created_at: string
  total_gigs?: number
  total_revenue?: number
}

interface DJInvoice {
  id: string
  client_name: string
  client_email: string
  amount: number
  status: 'draft' | 'sent' | 'paid'
  due_date: string
  created_at: string
  event_type?: string
  event_date?: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: 'inquiry' | 'confirmation' | 'invoice' | 'followup' | 'custom'
  createdAt: string
}

type TabId = 'overview' | 'requests' | 'gigs' | 'clients' | 'invoices' | 'email'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  quoted: 'Quoted',
  booked: 'Booked',
  declined: 'Declined',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#451A03', text: '#F97316' },
  reviewed: { bg: '#1E3A5F', text: '#60A5FA' },
  quoted: { bg: '#2E1065', text: '#A78BFA' },
  booked: { bg: '#052E16', text: '#4ADE80' },
  declined: { bg: '#450A0A', text: '#F87171' },
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-confirm',
    name: 'Booking Confirmation',
    type: 'confirmation',
    subject: 'Your Booking is Confirmed – {eventType} on {date}',
    body: 'Hi {clientName},\n\nGreat news — your booking for a {eventType} on {date} at {venue} is officially confirmed!\n\nLooking forward to making it an incredible event.\n\nMask Off Da DJ\nmaskoffdadj@gmail.com',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-followup',
    name: 'Follow-up',
    type: 'followup',
    subject: 'Following Up – DJ Services for Your {eventType}',
    body: "Hi {clientName},\n\nJust following up on your inquiry for a {eventType} on {date}. I'd love to connect and discuss how I can make your event unforgettable.\n\nFeel free to reply or reach out directly.\n\nMask Off Da DJ\nmaskoffdadj@gmail.com",
    createdAt: new Date().toISOString(),
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtDate = (d: string) => {
  try {
    return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

const fmtDateLong = (d: string) => {
  try {
    return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

// ── Shared style ──────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 20,
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: C.surface2, text: C.muted }
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// ── GIG STATUS badge ──────────────────────────────────────────────────────────

function GigStatusBadge({ status }: { status: LocalGig['status'] }) {
  const map: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: '#052E16', text: '#4ADE80' },
    completed: { bg: '#1E3A5F', text: '#60A5FA' },
    cancelled: { bg: C.surface2, text: C.muted },
    inquiry: { bg: '#2E1065', text: '#A78BFA' },
    pending: { bg: '#451A03', text: '#F97316' },
  }
  const colors = map[status] || { bg: C.surface2, text: C.muted }
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DJHubPage() {
  // Tab
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Core data
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [localGigs, setLocalGigs] = useState<LocalGig[]>([])
  const [clients, setClients] = useState<DJClient[]>([])
  const [invoices, setInvoices] = useState<DJInvoice[]>([])

  // Request loading / reply state
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [generatedReply, setGeneratedReply] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  // Requests filter
  const [requestFilter, setRequestFilter] = useState<string>('all')

  // Gigs sub-tab
  const [gigsSubTab, setGigsSubTab] = useState<'mygigs' | 'blocked'>('mygigs')
  const [gigStatusFilter, setGigStatusFilter] = useState<string>('all')

  // Block date
  const [blockedDate, setBlockedDate] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [blockSuccess, setBlockSuccess] = useState('')

  // Clients
  const [clientSearch, setClientSearch] = useState('')

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState('')

  // Hover states
  const [hoveredReq, setHoveredReq] = useState<string | null>(null)
  const [hoveredGig, setHoveredGig] = useState<string | null>(null)

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/dj/bookings')
      if (res.ok) {
        const data = await res.json()
        setRequests(
          (data.bookings || data || []).filter(
            (r: BookingRequest) => r.status !== 'dj_blocked'
          )
        )
      }
    } catch {}
    setLoadingRequests(false)
  }, [])

  // Load local gigs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('orca-dj-gigs')
      if (raw) setLocalGigs(JSON.parse(raw))
    } catch {}
  }, [])

  // Load email templates from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('orca-dj-email-templates')
      if (raw) {
        const parsed = JSON.parse(raw)
        setEmailTemplates(parsed.length ? parsed : DEFAULT_TEMPLATES)
      } else {
        setEmailTemplates(DEFAULT_TEMPLATES)
      }
    } catch {
      setEmailTemplates(DEFAULT_TEMPLATES)
    }
  }, [])

  // Load clients / invoices on tab switch
  useEffect(() => {
    if (activeTab === 'clients') {
      fetch('/api/dj/clients')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d) setClients(d.clients || d || [])
        })
        .catch(() => {})
    }
    if (activeTab === 'invoices') {
      fetch('/api/dj/invoices')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d) setInvoices(d.invoices || d || [])
        })
        .catch(() => {})
    }
  }, [activeTab])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const newReqs = requests.filter(r => r.status === 'new').length
    const upcoming = localGigs.filter(
      g => g.date >= today && g.status === 'confirmed'
    )
    const totalEarned = localGigs
      .filter(g => g.status === 'completed')
      .reduce((s, g) => s + (g.contractAmount || g.fee || 0), 0)
    const bookedValue = upcoming.reduce(
      (s, g) => s + (g.contractAmount || g.fee || 0),
      0
    )
    const nextGig = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0]
    return { newReqs, upcoming: upcoming.length, totalEarned, bookedValue, nextGig }
  }, [requests, localGigs])

  // ── Actions ────────────────────────────────────────────────────────────────

  const generateReply = async (type: 'inquiry' | 'decline' = 'inquiry') => {
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
      setReplyError(e instanceof Error ? e.message : 'Generation failed')
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
        body: JSON.stringify({
          to: selectedRequest.client_email,
          subject: replySubject,
          body: generatedReply,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      await fetch('/api/dj/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequest.id, status: 'reviewed' }),
      })
      setSendSuccess(`Reply sent to ${selectedRequest.client_email}`)
      setRequests(prev =>
        prev.map(r =>
          r.id === selectedRequest.id ? { ...r, status: 'reviewed' } : r
        )
      )
      setTimeout(() => setSendSuccess(''), 4000)
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : 'Send failed')
    }
    setSendingReply(false)
  }

  const updateRequestStatus = async (
    id: string,
    status: BookingRequest['status']
  ) => {
    try {
      await fetch('/api/dj/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
    } catch {}
  }

  const blockDate = async () => {
    if (!blockedDate) return
    setBlockingDate(true)
    try {
      await fetch('/api/dj/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [{ date: blockedDate, reason: 'Manual block' }],
        }),
      })
      setBlockSuccess(`${fmtDate(blockedDate)} has been blocked.`)
      setBlockedDate('')
      setTimeout(() => setBlockSuccess(''), 4000)
    } catch {}
    setBlockingDate(false)
  }

  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      })
      if (!res.ok) throw new Error('Send failed')
      setEmailSuccess(`Email sent to ${emailTo}`)
      setEmailTo('')
      setEmailSubject('')
      setEmailBody('')
      setTimeout(() => setEmailSuccess(''), 4000)
    } catch {}
    setSendingEmail(false)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredRequests =
    requestFilter === 'all'
      ? requests
      : requests.filter(r => r.status === requestFilter)

  const filteredGigs =
    gigStatusFilter === 'all'
      ? localGigs
      : localGigs.filter(g => g.status === gigStatusFilter)

  const filteredClients = clients.filter(
    c =>
      !clientSearch ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const today = new Date().toISOString().split('T')[0]

  // ── Shared input style ─────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    background: C.surface2,
    border: `1px solid ${C.borderLight}`,
    borderRadius: 8,
    color: C.text,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  }

  const btnPrimary = (color = C.blue): React.CSSProperties => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  })

  const btnGhost = (color = C.muted): React.CSSProperties => ({
    background: 'transparent',
    color,
    border: `1px solid ${C.borderLight}`,
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Music2 size={22} color={C.gold} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
              DJ Control Center
            </h1>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Mask Off Da DJ</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={loadRequests}
            title="Refresh"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: C.muted,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {loadingRequests ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
          <a
            href="/dj"
            style={{
              color: C.gold,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: C.goldBg,
              border: `1px solid ${C.gold}40`,
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            Open Gig Manager <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: C.bg,
          zIndex: 50,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '12px 24px 0',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 0,
            overflowX: 'auto',
          }}
        >
          {(
            [
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'requests', label: 'Requests', icon: MessageSquare, badge: stats.newReqs },
              { id: 'gigs', label: 'Gigs', icon: Calendar },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'email', label: 'Email', icon: Mail },
            ] as Array<{ id: TabId; label: string; icon: React.ElementType; badge?: number }>
          ).map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2px solid ${C.gold}` : '2px solid transparent',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  color: active ? C.gold : C.muted,
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}
              >
                <Icon size={15} />
                {tab.label}
                {tab.badge ? (
                  <span
                    style={{
                      background: C.amber,
                      color: '#000',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      lineHeight: '16px',
                    }}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 60px',
        }}
      >
        {/* ================================================================= */}
        {/* OVERVIEW TAB */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ paddingTop: 24 }}>
            {/* Stats grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: 'New Requests',
                  value: stats.newReqs,
                  icon: Bell,
                  color: C.amber,
                  bg: C.amberBg,
                },
                {
                  label: 'Upcoming Gigs',
                  value: stats.upcoming,
                  icon: Calendar,
                  color: C.blue,
                  bg: C.blueBg,
                },
                {
                  label: 'Booked Value',
                  value: fmt(stats.bookedValue),
                  icon: DollarSign,
                  color: C.green,
                  bg: C.greenBg,
                },
                {
                  label: 'Total Earned',
                  value: fmt(stats.totalEarned),
                  icon: Star,
                  color: C.gold,
                  bg: C.goldBg,
                },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          background: s.bg,
                          borderRadius: 8,
                          padding: 8,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon size={16} color={s.color} />
                      </div>
                      <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>
                      {s.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Next Gig alert */}
            {stats.nextGig && (
              <div
                style={{
                  background: C.goldBg,
                  border: `1px solid ${C.gold}50`,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: C.gold,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Next Gig
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>
                    {stats.nextGig.clientName}
                    <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>
                      {' '}
                      — {stats.nextGig.eventType}
                    </span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                    {fmtDateLong(stats.nextGig.date)} · {stats.nextGig.venue}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('gigs')}
                  style={btnGhost(C.gold)}
                >
                  View in Gigs <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* Two-column: Recent Requests + Recent Gigs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 20,
                marginBottom: 24,
              }}
            >
              {/* Recent Requests */}
              <div style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Recent Requests
                  </h3>
                  <button
                    onClick={() => setActiveTab('requests')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.gold,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>
                {requests.length === 0 && (
                  <p style={{ color: C.muted, fontSize: 13 }}>No requests yet.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.slice(0, 3).map(r => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '10px 0',
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                          {r.client_name}
                        </div>
                        <div style={{ color: C.muted, fontSize: 12 }}>
                          {r.event_type} · {fmtDate(r.date)} · {r.city}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={r.status} />
                        <button
                          onClick={() => {
                            setActiveTab('requests')
                            setSelectedRequest(r)
                            setGeneratedReply('')
                            setReplySubject('')
                            setReplyError('')
                          }}
                          style={{
                            background: C.goldBg,
                            color: C.gold,
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Gigs */}
              <div style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Upcoming Gigs
                  </h3>
                  <button
                    onClick={() => setActiveTab('gigs')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.gold,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>
                {localGigs.filter(g => g.date >= today).length === 0 && (
                  <p style={{ color: C.muted, fontSize: 13 }}>No upcoming gigs.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {localGigs
                    .filter(g => g.date >= today)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 3)
                    .map(g => (
                      <div
                        key={g.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '10px 0',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                            {g.clientName}
                          </div>
                          <div style={{ color: C.muted, fontSize: 12 }}>
                            {g.eventType} · {fmtDate(g.date)}
                          </div>
                        </div>
                        <GigStatusBadge status={g.status} />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a
                  href="/dj"
                  style={{
                    ...btnPrimary(C.blue),
                    textDecoration: 'none',
                  }}
                >
                  <Plus size={15} /> Add Gig
                </a>
                <button
                  onClick={() => {
                    setActiveTab('gigs')
                    setGigsSubTab('blocked')
                  }}
                  style={btnGhost(C.muted)}
                >
                  <Ban size={15} /> Block a Date
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  style={btnGhost(C.muted)}
                >
                  <Mail size={15} /> Send Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* REQUESTS TAB */}
        {/* ================================================================= */}
        {activeTab === 'requests' && (
          <div style={{ paddingTop: 24 }}>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', 'new', 'reviewed', 'quoted', 'booked', 'declined'].map(s => {
                const active = requestFilter === s
                return (
                  <button
                    key={s}
                    onClick={() => setRequestFilter(s)}
                    style={{
                      background: active
                        ? s === 'all'
                          ? C.blue
                          : STATUS_COLORS[s]?.bg || C.surface2
                        : C.surface2,
                      color: active
                        ? s === 'all'
                          ? '#fff'
                          : STATUS_COLORS[s]?.text || C.text
                        : C.muted,
                      border: `1px solid ${active ? 'transparent' : C.borderLight}`,
                      borderRadius: 20,
                      padding: '5px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {s === 'all' ? 'All' : STATUS_LABELS[s] || s}
                    {s !== 'all' && (
                      <span style={{ marginLeft: 4, opacity: 0.7 }}>
                        ({requests.filter(r => r.status === s).length})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <p style={{ color: C.mutedDark, fontSize: 13, marginBottom: 14 }}>
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? 's' : ''} found
            </p>

            {loadingRequests && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: C.muted,
                  padding: '40px 0',
                }}
              >
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Loading requests…
              </div>
            )}

            {!loadingRequests && filteredRequests.length === 0 && (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: C.muted,
                }}
              >
                <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontWeight: 600 }}>No requests found</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>
                  Booking requests from your website will appear here.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRequests.map(r => {
                const isExpanded = selectedRequest?.id === r.id
                const isHovered = hoveredReq === r.id && !isExpanded
                return (
                  <div
                    key={r.id}
                    style={{
                      ...cardStyle,
                      padding: 0,
                      overflow: 'hidden',
                      background: isHovered ? C.surface2 : C.surface,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Collapsed row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '14px 18px',
                        cursor: 'pointer',
                        flexWrap: 'wrap',
                      }}
                      onMouseEnter={() => setHoveredReq(r.id)}
                      onMouseLeave={() => setHoveredReq(null)}
                      onClick={() => {
                        if (isExpanded) {
                          setSelectedRequest(null)
                        } else {
                          setSelectedRequest(r)
                          setGeneratedReply('')
                          setReplySubject('')
                          setReplyError('')
                          setSendSuccess('')
                        }
                      }}
                    >
                      {/* Left: status badge + name + type */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <StatusBadge status={r.status} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                            {r.client_name}
                          </div>
                          <div style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                            {r.event_type}
                          </div>
                        </div>
                      </div>

                      {/* Middle: date + city + guests */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          color: C.muted,
                          fontSize: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {fmtDate(r.date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} />
                          {r.city}
                        </span>
                        {r.guest_count && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={12} />
                            {r.guest_count} guests
                          </span>
                        )}
                      </div>

                      {/* Right: button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            background: C.goldBg,
                            color: C.gold,
                            border: `1px solid ${C.gold}40`,
                            borderRadius: 7,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isExpanded ? (
                            <>
                              Close <ChevronUp size={12} />
                            </>
                          ) : (
                            <>
                              View & Reply <ChevronDown size={12} />
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          padding: '20px 18px',
                          background: C.bg,
                        }}
                      >
                        {/* Request Details */}
                        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.muted }}>
                          Request Details
                        </h4>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '10px 24px',
                            marginBottom: 20,
                          }}
                        >
                          {[
                            { label: 'Name', value: r.client_name },
                            { label: 'Email', value: r.client_email },
                            { label: 'Phone', value: r.client_phone || '—' },
                            { label: 'Event Type', value: r.event_type },
                            { label: 'Date', value: fmtDateLong(r.date) },
                            { label: 'City', value: r.city },
                            { label: 'Venue', value: r.location || '—' },
                            { label: 'Start Time', value: r.start_time || '—' },
                            { label: 'End Time', value: r.end_time || '—' },
                            { label: 'Guests', value: r.guest_count ? String(r.guest_count) : '—' },
                            { label: 'MC Services', value: r.mc_needed ? 'Yes' : 'No' },
                            { label: 'Budget', value: r.budget_range || '—' },
                          ].map(f => (
                            <div key={f.label}>
                              <div
                                style={{ fontSize: 11, color: C.mutedDark, fontWeight: 600, marginBottom: 2 }}
                              >
                                {f.label}
                              </div>
                              <div style={{ fontSize: 14, color: C.text }}>{f.value}</div>
                            </div>
                          ))}
                          {r.special_requests && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div
                                style={{ fontSize: 11, color: C.mutedDark, fontWeight: 600, marginBottom: 2 }}
                              >
                                Special Requests
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: C.muted,
                                  background: C.surface2,
                                  borderRadius: 8,
                                  padding: '8px 12px',
                                  fontStyle: 'italic',
                                }}
                              >
                                {r.special_requests}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Generate Reply */}
                        <h4
                          style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: C.muted }}
                        >
                          Generate Reply
                        </h4>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                          <button
                            onClick={() => generateReply('inquiry')}
                            disabled={generatingReply}
                            style={btnPrimary(C.blue)}
                          >
                            {generatingReply ? (
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Edit3 size={14} />
                            )}
                            Draft Inquiry Reply
                          </button>
                          <button
                            onClick={() => generateReply('decline')}
                            disabled={generatingReply}
                            style={{
                              ...btnGhost(C.red),
                              borderColor: `${C.red}60`,
                            }}
                          >
                            {generatingReply ? (
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Draft Decline
                          </button>
                        </div>

                        {replyError && (
                          <div
                            style={{
                              background: C.redBg,
                              color: C.red,
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 13,
                              marginBottom: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <AlertTriangle size={14} />
                            {replyError}
                          </div>
                        )}

                        {generatedReply && (
                          <div style={{ marginBottom: 16 }}>
                            <label
                              style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.mutedDark,
                                marginBottom: 6,
                              }}
                            >
                              Subject
                            </label>
                            <input
                              value={replySubject}
                              onChange={e => setReplySubject(e.target.value)}
                              style={{ ...inputStyle, marginBottom: 10 }}
                            />
                            <label
                              style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.mutedDark,
                                marginBottom: 6,
                              }}
                            >
                              Message
                            </label>
                            <textarea
                              value={generatedReply}
                              onChange={e => setGeneratedReply(e.target.value)}
                              rows={8}
                              style={{
                                ...inputStyle,
                                resize: 'vertical',
                                minHeight: 200,
                                fontFamily: 'inherit',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginTop: 10,
                              }}
                            >
                              <button
                                onClick={sendReply}
                                disabled={sendingReply}
                                style={btnPrimary(C.green)}
                              >
                                {sendingReply ? (
                                  <Loader2
                                    size={14}
                                    style={{ animation: 'spin 1s linear infinite' }}
                                  />
                                ) : (
                                  <Send size={14} />
                                )}
                                Send to {r.client_email}
                              </button>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(generatedReply)
                                }
                                style={btnGhost(C.muted)}
                              >
                                <Copy size={13} /> Copy
                              </button>
                              {sendSuccess && (
                                <span
                                  style={{
                                    color: C.green,
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <CheckCircle2 size={14} />
                                  {sendSuccess}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status update row */}
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: C.mutedDark,
                              fontWeight: 600,
                              marginBottom: 8,
                            }}
                          >
                            Update Status
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(
                              ['new', 'reviewed', 'quoted', 'booked'] as Array<
                                BookingRequest['status']
                              >
                            ).map(s => (
                              <button
                                key={s}
                                onClick={() => {
                                  updateRequestStatus(r.id, s)
                                  setSelectedRequest({ ...r, status: s })
                                }}
                                style={{
                                  background:
                                    r.status === s
                                      ? STATUS_COLORS[s]?.bg || C.surface2
                                      : C.surface2,
                                  color:
                                    r.status === s
                                      ? STATUS_COLORS[s]?.text || C.muted
                                      : C.muted,
                                  border: `1px solid ${
                                    r.status === s
                                      ? STATUS_COLORS[s]?.text + '60' || C.border
                                      : C.borderLight
                                  }`,
                                  borderRadius: 7,
                                  padding: '5px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                updateRequestStatus(r.id, 'declined')
                                setSelectedRequest({ ...r, status: 'declined' })
                              }}
                              style={{
                                background:
                                  r.status === 'declined' ? C.redBg : C.surface2,
                                color: r.status === 'declined' ? C.red : C.muted,
                                border: `1px solid ${
                                  r.status === 'declined'
                                    ? C.red + '60'
                                    : C.borderLight
                                }`,
                                borderRadius: 7,
                                padding: '5px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* GIGS TAB */}
        {/* ================================================================= */}
        {activeTab === 'gigs' && (
          <div style={{ paddingTop: 24 }}>
            {/* Sub-tabs */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 20,
              }}
            >
              {(
                [
                  { id: 'mygigs', label: 'My Gigs' },
                  { id: 'blocked', label: 'Blocked Dates' },
                ] as Array<{ id: 'mygigs' | 'blocked'; label: string }>
              ).map(t => (
                <button
                  key={t.id}
                  onClick={() => setGigsSubTab(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom:
                      gigsSubTab === t.id
                        ? `2px solid ${C.blue}`
                        : '2px solid transparent',
                    padding: '8px 18px',
                    cursor: 'pointer',
                    color: gigsSubTab === t.id ? C.blue : C.muted,
                    fontWeight: gigsSubTab === t.id ? 700 : 500,
                    fontSize: 14,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {gigsSubTab === 'mygigs' && (
              <div>
                {/* Top row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  {/* Status filters */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['all', 'confirmed', 'completed', 'cancelled'].map(s => (
                      <button
                        key={s}
                        onClick={() => setGigStatusFilter(s)}
                        style={{
                          background:
                            gigStatusFilter === s ? C.surface3 : C.surface2,
                          color: gigStatusFilter === s ? C.text : C.muted,
                          border: `1px solid ${
                            gigStatusFilter === s ? C.borderLight : C.border
                          }`,
                          borderRadius: 20,
                          padding: '5px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                  <a
                    href="/dj"
                    style={{
                      color: C.gold,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Open Full Gig Manager <ExternalLink size={12} />
                  </a>
                </div>

                {filteredGigs.length === 0 && (
                  <div
                    style={{
                      ...cardStyle,
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: C.muted,
                    }}
                  >
                    <Calendar size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontWeight: 600 }}>No gigs yet</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>
                      Add your first gig in the Gig Manager.
                    </p>
                    <a
                      href="/dj"
                      style={{
                        ...btnPrimary(C.blue),
                        display: 'inline-flex',
                        marginTop: 14,
                        textDecoration: 'none',
                      }}
                    >
                      <Plus size={14} /> Add Gig
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredGigs
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(g => (
                      <div
                        key={g.id}
                        style={{
                          ...cardStyle,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          background:
                            hoveredGig === g.id ? C.surface2 : C.surface,
                          transition: 'background 0.15s',
                          cursor: 'default',
                        }}
                        onMouseEnter={() => setHoveredGig(g.id)}
                        onMouseLeave={() => setHoveredGig(null)}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                        >
                          <GigStatusBadge status={g.status} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              {g.clientName}
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                              {g.eventType}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            color: C.muted,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} />
                            {fmtDate(g.date)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} />
                            {g.venue}
                          </span>
                          {(g.contractAmount || g.fee) && (
                            <span
                              style={{
                                color: C.green,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <DollarSign size={13} />
                              {fmt(g.contractAmount || g.fee || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {gigsSubTab === 'blocked' && (
              <div>
                <div style={{ ...cardStyle, maxWidth: 520 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
                    Block a Date
                  </h3>
                  <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
                    Manually block dates on your public booking website to prevent
                    customers from requesting those dates.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <input
                      type="date"
                      value={blockedDate}
                      onChange={e => setBlockedDate(e.target.value)}
                      style={{ ...inputStyle, width: 'auto', flex: 1 }}
                    />
                    <button
                      onClick={blockDate}
                      disabled={blockingDate || !blockedDate}
                      style={btnPrimary(C.red)}
                    >
                      {blockingDate ? (
                        <Loader2
                          size={14}
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                      ) : (
                        <Ban size={14} />
                      )}
                      Block This Date
                    </button>
                  </div>
                  {blockSuccess && (
                    <div
                      style={{
                        color: C.green,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <CheckCircle2 size={14} />
                      {blockSuccess}
                    </div>
                  )}
                  <p style={{ color: C.mutedDark, fontSize: 12, marginTop: 4 }}>
                    Note: Confirmed gigs from your Gig Manager are automatically
                    blocked.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* CLIENTS TAB */}
        {/* ================================================================= */}
        {activeTab === 'clients' && (
          <div style={{ paddingTop: 24 }}>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
              Clients are pulled from your DJ booking database.
            </p>
            <input
              type="text"
              placeholder="Search clients…"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              style={{ ...inputStyle, maxWidth: 360, marginBottom: 20 }}
            />

            {filteredClients.length === 0 && (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: C.muted,
                }}
              >
                <Users size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontWeight: 600 }}>No clients found</p>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
              }}
            >
              {filteredClients.map(c => (
                <div key={c.id} style={cardStyle}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                    {c.name}
                  </div>
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 13,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={12} />
                      {c.email}
                    </span>
                    {c.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={12} />
                        {c.phone}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} />
                      Since {fmtDate(c.created_at)}
                    </span>
                  </div>
                  {(c.total_gigs !== undefined || c.total_revenue !== undefined) && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: `1px solid ${C.border}`,
                        fontSize: 12,
                        color: C.muted,
                      }}
                    >
                      {c.total_gigs !== undefined && (
                        <span>
                          <strong style={{ color: C.text }}>{c.total_gigs}</strong> gigs
                        </span>
                      )}
                      {c.total_revenue !== undefined && (
                        <span>
                          <strong style={{ color: C.green }}>
                            {fmt(c.total_revenue)}
                          </strong>{' '}
                          revenue
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* INVOICES TAB */}
        {/* ================================================================= */}
        {activeTab === 'invoices' && (
          <div style={{ paddingTop: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Invoices</h2>
              <button
                onClick={() => alert('Invoice creation coming soon')}
                style={btnPrimary(C.blue)}
              >
                <Plus size={14} /> Create Invoice
              </button>
            </div>

            {invoices.length === 0 && (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: C.muted,
                }}
              >
                <FileText size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontWeight: 600 }}>No invoices yet</p>
              </div>
            )}

            {invoices.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {['Client', 'Event', 'Amount', 'Due Date', 'Status', 'Actions'].map(
                        col => (
                          <th
                            key={col}
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              color: C.mutedDark,
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const statusColors: Record<
                        string,
                        { bg: string; text: string }
                      > = {
                        draft: { bg: C.surface2, text: C.muted },
                        sent: { bg: C.blueBg, text: C.blue },
                        paid: { bg: C.greenBg, text: C.green },
                      }
                      const sc = statusColors[inv.status] || { bg: C.surface2, text: C.muted }
                      return (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td style={{ padding: '12px', fontWeight: 600 }}>
                            {inv.client_name}
                          </td>
                          <td style={{ padding: '12px', color: C.muted }}>
                            {inv.event_type || '—'}
                            {inv.event_date && (
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                {fmtDate(inv.event_date)}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              fontWeight: 700,
                              color: C.green,
                            }}
                          >
                            {fmt(inv.amount)}
                          </td>
                          <td style={{ padding: '12px', color: C.muted }}>
                            {fmtDate(inv.due_date)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                background: sc.bg,
                                color: sc.text,
                                borderRadius: 6,
                                padding: '3px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'capitalize',
                              }}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => {}}
                              style={{
                                background: C.surface2,
                                color: C.muted,
                                border: `1px solid ${C.borderLight}`,
                                borderRadius: 6,
                                padding: '5px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* EMAIL TAB */}
        {/* ================================================================= */}
        {activeTab === 'email' && (
          <div style={{ paddingTop: 24 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr',
                gap: 20,
                alignItems: 'start',
              }}
            >
              {/* Left: Template library */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>
                  Templates
                </h3>
                {emailTemplates.length === 0 && (
                  <p style={{ color: C.muted, fontSize: 13 }}>No templates saved.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {emailTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setEmailSubject(t.subject)
                        setEmailBody(t.body)
                      }}
                      style={{
                        background: C.surface2,
                        border: `1px solid ${C.borderLight}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: C.text,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          C.surface3)
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          C.surface2)
                      }
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                      <div style={{ color: C.mutedDark, fontSize: 11, marginTop: 3 }}>
                        {t.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Compose */}
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                  Compose Email
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.mutedDark,
                        marginBottom: 6,
                      }}
                    >
                      To
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="client@email.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.mutedDark,
                        marginBottom: 6,
                      }}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Email subject"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.mutedDark,
                        marginBottom: 6,
                      }}
                    >
                      Message
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      rows={9}
                      placeholder="Email body…"
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: 200,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <button
                    onClick={sendEmail}
                    disabled={sendingEmail || !emailTo || !emailSubject || !emailBody}
                    style={{
                      ...btnPrimary(C.blue),
                      justifyContent: 'center',
                      opacity:
                        sendingEmail || !emailTo || !emailSubject || !emailBody
                          ? 0.5
                          : 1,
                    }}
                  >
                    {sendingEmail ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Send size={14} />
                    )}
                    {sendingEmail ? 'Sending…' : 'Send Email'}
                  </button>
                  {emailSuccess && (
                    <div
                      style={{
                        color: C.green,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={14} />
                      {emailSuccess}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spin keyframe via a style tag */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
