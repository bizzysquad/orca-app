'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Calendar, Clock, MapPin, Users, Phone, Mail,
  RefreshCw, Check, X, ChevronLeft, ChevronRight,
  AlertCircle, Star, TrendingUp, Eye, Trash2, Edit3,
  Lock, Unlock, LayoutGrid, List, ExternalLink,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

const DJ_PINK = '#F43F5E'
const DJ_INDIGO = '#6366F1'
const DJ_GOLD = '#F59E0B'
const DJ_GREEN = '#10B981'

type BookingRequestStatus = 'new' | 'reviewed' | 'quoted' | 'booked' | 'declined'

interface BookingRequest {
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
  special_requests?: string
  status: BookingRequestStatus
  notes?: string
  created_at: string
}

const STATUS_CONFIG: Record<BookingRequestStatus, { label: string; color: string }> = {
  new:      { label: 'New Request',  color: DJ_INDIGO },
  reviewed: { label: 'Reviewed',     color: DJ_GOLD },
  quoted:   { label: 'Quote Sent',   color: '#3B82F6' },
  booked:   { label: 'Booked',       color: DJ_GREEN },
  declined: { label: 'Declined',     color: '#EF4444' },
}

function fmt12(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

type PageTab = 'requests' | 'availability' | 'posterboard'

export default function DJAdminPage() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<PageTab>('requests')
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReq, setSelectedReq] = useState<BookingRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState<BookingRequestStatus | 'all'>('all')
  const [notesEdit, setNotesEdit] = useState('')

  // Availability calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Posterboard state (reads from localStorage DJ gigs)
  const [djGigs, setDjGigs] = useState<any[]>([])
  const [posterView, setPosterView] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  // ── Load data ──────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/booking-requests')
      const d = await r.json()
      if (d.requests) setRequests(d.requests)
    } catch {}
    setLoading(false)
  }, [])

  const fetchBlockedDates = useCallback(async () => {
    try {
      const r = await fetch('/api/dj-availability')
      const d = await r.json()
      setBlockedDates(d.bookedDates || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchRequests()
    fetchBlockedDates()
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) setDjGigs(JSON.parse(saved))
    } catch {}
  }, [fetchRequests, fetchBlockedDates])

  // ── Sync DJ Gig Manager dates to availability calendar ──

  const syncGigDates = async () => {
    setAvailLoading(true)
    setSyncMsg('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const activeDates = djGigs
        .filter(g => ['confirmed', 'pending', 'inquiry'].includes(g.status) && g.date >= today)
        .map(g => g.date)
        .filter(Boolean)

      const r = await fetch('/api/dj-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: activeDates }),
      })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`Synced ${d.synced} dates to availability calendar`)
        await fetchBlockedDates()
      } else {
        setSyncMsg('Sync failed — check console')
      }
    } catch { setSyncMsg('Sync error — check console') }
    setAvailLoading(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  // ── Update booking request status ──

  const updateStatus = async (id: string, status: BookingRequestStatus, notes?: string) => {
    await fetch('/api/admin/booking-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, notes }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, notes: notes ?? r.notes } : r))
    if (selectedReq?.id === id) setSelectedReq(prev => prev ? { ...prev, status, notes: notes ?? prev.notes } : null)
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this booking request?')) return
    await fetch('/api/admin/booking-requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setRequests(prev => prev.filter(r => r.id !== id))
    if (selectedReq?.id === id) setSelectedReq(null)
  }

  // ── Manual date block/unblock ──

  const toggleDateBlock = async (dateStr: string) => {
    const isBlocked = blockedDates.includes(dateStr)
    const newDates = isBlocked
      ? blockedDates.filter(d => d !== dateStr)
      : [...blockedDates, dateStr]

    setBlockedDates(newDates)
    try {
      await fetch('/api/dj-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: newDates }),
      })
    } catch {}
  }

  // ── Computed ──

  const filteredRequests = useMemo(() =>
    filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus),
    [requests, filterStatus]
  )

  const newCount = requests.filter(r => r.status === 'new').length

  const today = new Date().toISOString().slice(0, 10)
  const upcomingGigs = useMemo(() =>
    [...djGigs].filter(g => g.date >= today && g.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [djGigs, today]
  )
  const pastGigs = useMemo(() =>
    [...djGigs].filter(g => g.date < today || g.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date)),
    [djGigs, today]
  )
  const posterGigs = posterView === 'upcoming' ? upcomingGigs
    : posterView === 'past' ? pastGigs
    : [...djGigs].sort((a, b) => a.date.localeCompare(b.date))

  // ── Calendar helpers ──

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir, y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m); setCalYear(y)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DJ_PINK}, ${DJ_INDIGO})` }}>
            <Mic2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>DJ Admin</h1>
            <p className="text-xs" style={{ color: theme.textM }}>Manage your availability & booking pipeline</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/maskoffdadj" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-all"
              style={{ backgroundColor: `${DJ_INDIGO}20`, color: DJ_INDIGO, border: `1px solid ${DJ_INDIGO}` }}>
              <ExternalLink size={12} />
              maskoffdadj
            </a>
            {newCount > 0 && (
              <div className="px-2.5 py-1 rounded-full text-xs font-black text-white" style={{ backgroundColor: DJ_PINK }}>
                {newCount} new
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl p-1 mb-6" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
        {([
          { id: 'requests', label: 'Booking Requests', badge: newCount > 0 ? newCount : null },
          { id: 'availability', label: 'Availability', badge: null },
          { id: 'posterboard', label: 'Posterboard', badge: null },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all"
            style={{
              backgroundColor: tab === t.id ? theme.accent : 'transparent',
              color: tab === t.id ? '#fff' : theme.accent,
            }}
          >
            {t.label}
            {t.badge && (
              <span className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black"
                style={{ backgroundColor: tab === t.id ? 'rgba(255,255,255,0.3)' : DJ_PINK, color: '#fff' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Booking Requests Tab ── */}
      {tab === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'new', 'reviewed', 'quoted', 'booked', 'declined'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all"
                  style={{
                    backgroundColor: filterStatus === s ? theme.accent : `${theme.accent}15`,
                    color: filterStatus === s ? '#fff' : theme.accent,
                  }}>
                  {s === 'all' ? `All (${requests.length})` : `${STATUS_CONFIG[s]?.label || s} (${requests.filter(r => r.status === s).length})`}
                </button>
              ))}
            </div>
            <button onClick={fetchRequests}
              className="p-2 rounded-xl hover:opacity-70 transition-all"
              style={{ color: theme.textM }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12" style={{ color: theme.textM }}>
              {loading ? 'Loading...' : 'No booking requests yet. Submissions from maskoffdadj will appear here.'}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRequests.map(req => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  className="border rounded-2xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black" style={{ color: theme.text }}>{req.client_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: `${STATUS_CONFIG[req.status]?.color || '#999'}20`, color: STATUS_CONFIG[req.status]?.color || '#999' }}>
                            {STATUS_CONFIG[req.status]?.label || req.status}
                          </span>
                          {req.status === 'new' && (
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: DJ_PINK }} />
                          )}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: theme.textM }}>
                          {req.event_type} · {fmtDate(req.date)}
                        </p>
                        {(req.start_time || req.end_time) && (
                          <p className="text-xs" style={{ color: theme.textM }}>
                            <Clock size={10} className="inline mr-1" />
                            {fmt12(req.start_time)} – {fmt12(req.end_time)}
                          </p>
                        )}
                        {(req.location || req.city) && (
                          <p className="text-xs" style={{ color: theme.textM }}>
                            <MapPin size={10} className="inline mr-1" />
                            {[req.location, req.city].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-right flex-shrink-0" style={{ color: theme.textM }}>
                        {req.guest_count && <p>{req.guest_count} guests</p>}
                        {req.mc_needed && <p className="text-yellow-400">MC needed</p>}
                      </div>
                    </div>

                    {req.special_requests && (
                      <p className="text-xs px-3 py-2 rounded-xl mb-3" style={{ backgroundColor: theme.bg, color: theme.textM }}>
                        {req.special_requests}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {req.client_email && (
                        <a href={`mailto:${req.client_email}`}
                          className="flex items-center gap-1 text-xs hover:opacity-80"
                          style={{ color: DJ_INDIGO }}>
                          <Mail size={11} />{req.client_email}
                        </a>
                      )}
                      {req.client_phone && (
                        <a href={`tel:${req.client_phone}`}
                          className="flex items-center gap-1 text-xs hover:opacity-80"
                          style={{ color: DJ_INDIGO }}>
                          <Phone size={11} />{req.client_phone}
                        </a>
                      )}
                      <div className="ml-auto flex gap-1.5">
                        <button onClick={() => { setSelectedReq(req); setNotesEdit(req.notes || '') }}
                          className="p-1.5 rounded-lg hover:opacity-80"
                          style={{ color: DJ_INDIGO, backgroundColor: `${DJ_INDIGO}15` }}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => deleteRequest(req.id)}
                          className="p-1.5 rounded-lg hover:opacity-80"
                          style={{ color: '#EF4444', backgroundColor: '#FEE2E2' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {(['reviewed', 'quoted', 'booked', 'declined'] as BookingRequestStatus[]).map(s => (
                        <button key={s}
                          onClick={() => updateStatus(req.id, s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-90"
                          style={{
                            backgroundColor: req.status === s ? STATUS_CONFIG[s].color : `${STATUS_CONFIG[s].color}20`,
                            color: req.status === s ? '#fff' : STATUS_CONFIG[s].color,
                            opacity: req.status === s ? 1 : 0.8,
                          }}>
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expanded notes */}
                  <AnimatePresence>
                    {selectedReq?.id === req.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t px-4 pb-4 pt-3"
                        style={{ borderColor: theme.border }}
                      >
                        <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: theme.textS }}>
                          Internal Notes
                        </label>
                        <textarea
                          value={notesEdit}
                          onChange={e => setNotesEdit(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                          style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                          placeholder="Add notes about this booking..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { updateStatus(req.id, req.status, notesEdit); setSelectedReq(null) }}
                            className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                            style={{ backgroundColor: DJ_INDIGO }}>
                            Save Notes
                          </button>
                          <button
                            onClick={() => setSelectedReq(null)}
                            className="px-4 py-2 rounded-xl text-sm"
                            style={{ backgroundColor: theme.bg, color: theme.textM }}>
                            Close
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Availability Calendar Tab ── */}
      {tab === 'availability' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Sync button */}
          <div className="flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <div>
              <p className="text-sm font-bold" style={{ color: theme.text }}>Sync DJ Gig Manager → Website</p>
              <p className="text-xs" style={{ color: theme.textM }}>
                Pushes your confirmed/pending gig dates to the maskoffdadj calendar so clients can't book those dates.
              </p>
            </div>
            <button
              onClick={syncGigDates}
              disabled={availLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: DJ_PINK }}>
              <RefreshCw size={14} className={availLoading ? 'animate-spin' : ''} />
              {availLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {syncMsg && (
            <div className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: `${DJ_GREEN}20`, color: DJ_GREEN, border: `1px solid ${DJ_GREEN}` }}>
              {syncMsg}
            </div>
          )}

          {/* Calendar */}
          <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-xl hover:opacity-70" style={{ color: theme.textM }}>
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-base font-bold" style={{ color: theme.text }}>{monthLabel}</h3>
              <button onClick={() => handleMonthChange(1)} className="p-2 rounded-xl hover:opacity-70" style={{ color: theme.textM }}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs py-1 font-semibold" style={{ color: theme.textM }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const isBlocked = blockedDates.includes(dateStr)
                const isPast = dateStr < today
                const isToday = dateStr === today

                // Check if this date has a DJ gig
                const hasGig = djGigs.some(g => g.date === dateStr && g.status !== 'cancelled')
                const hasRequest = requests.some(r => r.date === dateStr && r.status !== 'declined')

                return (
                  <button
                    key={d}
                    onClick={() => !isPast && toggleDateBlock(dateStr)}
                    disabled={isPast}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative"
                    style={{
                      backgroundColor: isBlocked
                        ? (hasGig ? `${DJ_PINK}30` : `${DJ_PINK}20`)
                        : hasRequest
                          ? `${DJ_GOLD}20`
                          : isToday
                            ? `${DJ_INDIGO}20`
                            : 'transparent',
                      border: isToday ? `1px solid ${DJ_INDIGO}` : isBlocked ? `1px solid ${DJ_PINK}60` : '1px solid transparent',
                      color: isPast ? theme.textM + '50' : isBlocked ? DJ_PINK : theme.text,
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      opacity: isPast ? 0.5 : 1,
                    }}
                    title={isBlocked ? 'Click to unblock' : 'Click to block'}
                  >
                    {d}
                    {isBlocked && <Lock size={6} className="absolute bottom-0.5" style={{ color: DJ_PINK }} />}
                    {hasRequest && !isBlocked && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DJ_GOLD }} />}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-4 mt-4 flex-wrap">
              {[
                { color: DJ_PINK, label: 'Blocked / Booked' },
                { color: DJ_GOLD, label: 'Has Request' },
                { color: DJ_INDIGO, label: 'Today' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: theme.textM }}>
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: `${color}40`, border: `1px solid ${color}` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: theme.textM }}>
            Click any date to manually block or unblock it. Use "Sync Now" to push DJ Gig Manager dates automatically.
          </p>
        </motion.div>
      )}

      {/* ── Posterboard Tab ── */}
      {tab === 'posterboard' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          <div className="flex gap-2">
            {(['upcoming', 'past', 'all'] as const).map(v => (
              <button key={v} onClick={() => setPosterView(v)}
                className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={{
                  backgroundColor: posterView === v ? theme.accent : `${theme.accent}15`,
                  color: posterView === v ? '#fff' : theme.accent,
                }}>
                {v === 'upcoming' ? `Upcoming (${upcomingGigs.length})` : v === 'past' ? `Past (${pastGigs.length})` : `All (${djGigs.length})`}
              </button>
            ))}
          </div>

          {posterGigs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              No gigs to show. Add gigs in the DJ Gig Manager.
            </div>
          ) : (
            <div className="grid gap-3">
              {posterGigs.map((gig) => {
                const statusColors: Record<string, string> = {
                  inquiry: '#94A3B8', pending: DJ_GOLD, confirmed: DJ_GREEN,
                  completed: DJ_INDIGO, cancelled: '#EF4444',
                }
                const color = statusColors[gig.status] || '#94A3B8'
                const gigDate = gig.date ? new Date(gig.date + 'T00:00:00') : null
                const daysAway = gigDate ? Math.ceil((gigDate.getTime() - new Date().setHours(0,0,0,0)) / 86400000) : null

                return (
                  <motion.div
                    key={gig.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: theme.card, border: `1px solid ${color}40` }}
                    className="rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-black" style={{ color: theme.text }}>
                            {gig.clientName || 'Private Client'} · {gig.eventType || 'Event'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {gig.status}
                          </span>
                          {daysAway !== null && daysAway >= 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ backgroundColor: daysAway <= 7 ? `${DJ_PINK}20` : `${DJ_INDIGO}15`, color: daysAway <= 7 ? DJ_PINK : DJ_INDIGO }}>
                              {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway}d`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: theme.textM }}>
                          {gig.date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {gigDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {(gig.startTime || gig.endTime) && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {gig.startTime} – {gig.endTime}
                            </span>
                          )}
                          {gig.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {gig.venue}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black" style={{ color }}>
                          ${(gig.contractAmount || gig.fee || 0).toLocaleString()}
                        </p>
                        {gig.depositPaid && (
                          <p className="text-[10px] font-semibold" style={{ color: DJ_GREEN }}>
                            Deposit paid
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-xs mb-3" style={{ color: theme.textM }}>
              This posterboard pulls from your DJ Gig Manager. Add gigs there to see them here.
            </p>
            <a href="/dj" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: DJ_PINK }}>
              <Mic2 size={14} />
              Open DJ Gig Manager
            </a>
          </div>
        </motion.div>
      )}
    </div>
  )
}
