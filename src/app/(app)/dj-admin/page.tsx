'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Calendar, Clock, MapPin, Phone, Mail,
  RefreshCw, Check, X, ChevronLeft, ChevronRight,
  Star, Trash2, Edit3, Lock, ExternalLink,
  Plus, AlertCircle, CheckCircle2, Loader2, ArrowRight,
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

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

const STATUS_CONFIG: Record<BookingRequestStatus, { label: string; color: string }> = {
  new:      { label: 'New Request',  color: DJ_INDIGO },
  reviewed: { label: 'Reviewed',     color: DJ_GOLD },
  quoted:   { label: 'Quote Sent',   color: '#3B82F6' },
  booked:   { label: 'Booked ✓',    color: DJ_GREEN },
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

function gid() { return Math.random().toString(36).slice(2, 9) }

type PageTab = 'requests' | 'availability' | 'posterboard' | 'profile' | 'activity'

export default function DJAdminPage() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<PageTab>('requests')
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReq, setSelectedReq] = useState<BookingRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState<BookingRequestStatus | 'all'>('all')
  const [notesEdit, setNotesEdit] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Availability
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [availLoading, setAvailLoading] = useState(false)

  // Posterboard — from localStorage DJ gigs
  const [djGigs, setDjGigs] = useState<any[]>([])
  const [posterView, setPosterView] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  // DJ Profile — localStorage
  const [profile, setProfile] = useState({
    name: 'maskoffdadj',
    bio: '',
    genres: '',
    baseRate: '',
    contactEmail: 'mckiveja@gmail.com',
    contactPhone: '',
    instagram: '',
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [activityLog, setActivityLog] = useState<any[]>([])

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = gid()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // ── Load data ──────────────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/booking-requests')
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.requests) setRequests(d.requests)
    } catch (e: any) {
      toast('error', `Failed to load requests: ${e.message}`)
    }
    setLoading(false)
  }, [toast])

  const fetchBlockedDates = useCallback(async () => {
    try {
      const r = await fetch('/api/dj-availability')
      const d = await r.json()
      setBlockedDates(d.bookedDates || [])
    } catch {
      // Silent — calendar still renders
    }
  }, [])

  const loadGigs = useCallback(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) setDjGigs(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    fetchRequests()
    fetchBlockedDates()
    loadGigs()
    try {
      const p = localStorage.getItem('orca-dj-profile')
      if (p) setProfile(JSON.parse(p))
    } catch {}
    try {
      const log = localStorage.getItem('orca-dj-activity')
      if (log) setActivityLog(JSON.parse(log))
    } catch {}
  }, [fetchRequests, fetchBlockedDates, loadGigs])

  // ── Sync DJ Gig Manager → availability + posterboard ──────────────────────

  const syncGigDates = async () => {
    setAvailLoading(true)
    try {
      const r = await fetch('/api/dj/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigs: djGigs }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      const hasConflicts = d.conflicts && d.conflicts.length > 0
      toast(
        hasConflicts ? 'error' : 'success',
        `Synced ${d.synced} gig${d.synced !== 1 ? 's' : ''} → calendar & posterboard${hasConflicts ? ` — ${d.conflicts.length} conflict(s) detected!` : ''}`
      )
      await fetchBlockedDates()
      try {
        const log = localStorage.getItem('orca-dj-activity')
        if (log) setActivityLog(JSON.parse(log))
      } catch {}
    } catch (e: any) {
      toast('error', `Sync failed: ${e.message}`)
    }
    setAvailLoading(false)
  }

  // ── Update booking request status ──────────────────────────────────────────

  const updateStatus = async (id: string, status: BookingRequestStatus, notes?: string) => {
    const prev = requests.find(r => r.id === id)
    // Optimistic update
    setRequests(prev2 => prev2.map(r => r.id === id ? { ...r, status, notes: notes ?? r.notes } : r))
    if (selectedReq?.id === id) setSelectedReq(p => p ? { ...p, status, notes: notes ?? p.notes } : null)

    try {
      const res = await fetch('/api/admin/booking-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, notes }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast('success', `Status updated to "${STATUS_CONFIG[status].label}"`)
    } catch (e: any) {
      // Rollback
      if (prev) {
        setRequests(p2 => p2.map(r => r.id === id ? prev : r))
        if (selectedReq?.id === id) setSelectedReq(prev)
      }
      toast('error', `Update failed: ${e.message}`)
    }
  }

  // ── Delete booking request ─────────────────────────────────────────────────

  const deleteRequest = async (id: string) => {
    if (!confirm('Permanently delete this booking request?')) return
    const prev = requests.find(r => r.id === id)
    setRequests(p => p.filter(r => r.id !== id))
    if (selectedReq?.id === id) setSelectedReq(null)

    try {
      const res = await fetch('/api/admin/booking-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast('success', 'Booking request deleted')
    } catch (e: any) {
      // Rollback
      if (prev) setRequests(p2 => [...p2, prev])
      toast('error', `Delete failed: ${e.message}`)
    }
  }

  // ── Convert booking request to DJ Gig ─────────────────────────────────────

  const convertToGig = (req: BookingRequest) => {
    try {
      const existing: any[] = (() => { try { return JSON.parse(localStorage.getItem('orca-dj-gigs') || '[]') } catch { return [] } })()
      const alreadyExists = existing.some(g => g.bookingRequestId === req.id)
      if (alreadyExists) {
        toast('info', 'Already converted to DJ Gig Manager')
        return
      }

      const newGig = {
        id: gid(),
        bookingRequestId: req.id,
        clientName: req.client_name,
        clientEmail: req.client_email,
        clientPhone: req.client_phone || '',
        eventType: req.event_type,
        date: req.date,
        startTime: req.start_time || '',
        endTime: req.end_time || '',
        venue: req.location || '',
        city: req.city || '',
        guestCount: req.guest_count || 0,
        mcNeeded: req.mc_needed || false,
        notes: req.notes || req.special_requests || '',
        status: 'confirmed',
        contractAmount: 0,
        fee: 0,
        depositPaid: false,
        depositAmount: 0,
        partialPayments: [],
        createdAt: new Date().toISOString(),
      }

      const updated = [...existing, newGig]
      localStorage.setItem('orca-dj-gigs', JSON.stringify(updated))
      setDjGigs(updated)

      // Auto-sync new gig to availability + posterboard
      fetch('/api/dj/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigs: updated }),
      }).then(r => r.json()).then(d => {
        if (!d.error) {
          fetchBlockedDates()
          try {
            const log2 = localStorage.getItem('orca-dj-activity')
            if (log2) setActivityLog(JSON.parse(log2))
          } catch {}
        }
      }).catch(() => {})

      toast('success', 'Gig added to DJ Gig Manager & synced to calendar!')
    } catch (e: any) {
      toast('error', `Convert failed: ${e.message}`)
    }
  }

  // ── Manual date block/unblock ──────────────────────────────────────────────

  const toggleDateBlock = async (dateStr: string) => {
    // Dates managed by DJ Gig Manager (auto-synced) cannot be toggled here
    const gigDates = djGigs.filter(g => g.status !== 'cancelled').map(g => g.date).filter(Boolean)
    if (gigDates.includes(dateStr)) {
      toast('info', 'This date is auto-blocked by the DJ Gig Manager. Edit or cancel the gig there to change it.')
      return
    }

    const isBlocked = blockedDates.includes(dateStr)
    const newAllDates = isBlocked
      ? blockedDates.filter(d => d !== dateStr)
      : [...blockedDates, dateStr]

    setBlockedDates(newAllDates)

    // Only send manual blocks to the API — the API now only manages __DJ_BLOCK__ rows
    const manualDates = newAllDates.filter(d => !gigDates.includes(d))
    try {
      const res = await fetch('/api/dj-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: manualDates }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast('success', isBlocked ? 'Date unblocked' : 'Date manually blocked')
    } catch (e: any) {
      setBlockedDates(blockedDates)
      toast('error', `Failed to update availability: ${e.message}`)
    }
  }

  // ── Save DJ Profile ────────────────────────────────────────────────────────

  const saveProfile = () => {
    try {
      localStorage.setItem('orca-dj-profile', JSON.stringify(profile))
      setProfileSaved(true)
      toast('success', 'Profile saved')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      toast('error', 'Failed to save profile')
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const filteredRequests = useMemo(() =>
    filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus),
    [requests, filterStatus]
  )

  const newCount = requests.filter(r => r.status === 'new').length
  const today = new Date().toISOString().slice(0, 10)

  const upcomingGigs = useMemo(() =>
    [...djGigs].filter(g => g.date >= today && g.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date)),
    [djGigs, today]
  )
  const pastGigs = useMemo(() =>
    [...djGigs].filter(g => g.date < today || g.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)),
    [djGigs, today]
  )
  const posterGigs = posterView === 'upcoming' ? upcomingGigs
    : posterView === 'past' ? pastGigs
    : [...djGigs].sort((a, b) => a.date.localeCompare(b.date))

  // ── Calendar helpers ───────────────────────────────────────────────────────

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir, y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m); setCalYear(y)
  }

  const TABS: { id: PageTab; label: string; badge?: number }[] = [
    { id: 'requests', label: 'Requests', badge: newCount > 0 ? newCount : undefined },
    { id: 'availability', label: 'Calendar' },
    { id: 'posterboard', label: 'Gigs' },
    { id: 'activity', label: 'Activity' },
    { id: 'profile', label: 'Profile' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto pb-28">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg pointer-events-auto"
              style={{
                background: t.type === 'success' ? `linear-gradient(135deg, ${DJ_GREEN}20, ${DJ_GREEN}10)` : t.type === 'error' ? '#FEF2F2' : `${DJ_INDIGO}15`,
                border: `1px solid ${t.type === 'success' ? DJ_GREEN : t.type === 'error' ? '#FECACA' : DJ_INDIGO}`,
                color: t.type === 'success' ? DJ_GREEN : t.type === 'error' ? '#EF4444' : DJ_INDIGO,
                minWidth: 240,
              }}>
              {t.type === 'success' ? <CheckCircle2 size={15} />
                : t.type === 'error' ? <AlertCircle size={15} />
                : <Star size={15} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DJ_PINK}, ${DJ_INDIGO})` }}>
            <Mic2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>DJ Admin</h1>
            <p className="text-xs" style={{ color: theme.textM }}>Bookings · Availability · Gig Pipeline</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/maskoffdadj" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-all"
              style={{ backgroundColor: `${DJ_INDIGO}20`, color: DJ_INDIGO, border: `1px solid ${DJ_INDIGO}` }}>
              <ExternalLink size={12} />
              Public Page
            </a>
            {newCount > 0 && (
              <div className="px-2.5 py-1 rounded-full text-xs font-black text-white animate-pulse" style={{ backgroundColor: DJ_PINK }}>
                {newCount} new
              </div>
            )}
          </div>
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {(['new', 'reviewed', 'quoted', 'booked', 'declined'] as BookingRequestStatus[]).map(s => (
            <button key={s} onClick={() => { setTab('requests'); setFilterStatus(s) }}
              className="rounded-xl p-2.5 text-center transition-all hover:opacity-80"
              style={{ backgroundColor: `${STATUS_CONFIG[s].color}15`, border: `1px solid ${STATUS_CONFIG[s].color}30` }}>
              <p className="text-xl font-black" style={{ color: STATUS_CONFIG[s].color }}>{requests.filter(r => r.status === s).length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: STATUS_CONFIG[s].color }}>{s}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl p-1 mb-6" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold transition-all"
            style={{ backgroundColor: tab === t.id ? theme.accent : 'transparent', color: tab === t.id ? '#fff' : theme.accent }}>
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

      {/* ── REQUESTS TAB ── */}
      {tab === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilterStatus('all')}
                className="px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all"
                style={{ backgroundColor: filterStatus === 'all' ? theme.accent : `${theme.accent}15`, color: filterStatus === 'all' ? '#fff' : theme.accent }}>
                All ({requests.length})
              </button>
              {(['new', 'reviewed', 'quoted', 'booked', 'declined'] as BookingRequestStatus[]).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                  style={{ backgroundColor: filterStatus === s ? STATUS_CONFIG[s].color : `${STATUS_CONFIG[s].color}15`, color: filterStatus === s ? '#fff' : STATUS_CONFIG[s].color }}>
                  {s} ({requests.filter(r => r.status === s).length})
                </button>
              ))}
            </div>
            <button onClick={fetchRequests}
              className="p-2 rounded-xl hover:opacity-70 transition-all flex items-center gap-1.5 text-xs"
              style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              {loading ? (
                <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: theme.textM }} />
              ) : (
                <>
                  <Mic2 size={24} className="mx-auto mb-3" style={{ color: theme.textM }} />
                  <p className="font-semibold">No booking requests</p>
                  <p className="text-xs mt-1">Submissions from your public page will appear here.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRequests.map(req => {
                const isConverted = djGigs.some(g => g.bookingRequestId === req.id)
                return (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    className="border rounded-2xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-black truncate" style={{ color: theme.text }}>{req.client_name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: `${STATUS_CONFIG[req.status]?.color}20`, color: STATUS_CONFIG[req.status]?.color }}>
                              {STATUS_CONFIG[req.status]?.label}
                            </span>
                            {req.status === 'new' && (
                              <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: DJ_PINK }} />
                            )}
                          </div>
                          <p className="text-xs font-semibold" style={{ color: theme.textM }}>
                            {req.event_type} · {fmtDate(req.date)}
                          </p>
                          {(req.start_time || req.end_time) && (
                            <p className="text-xs" style={{ color: theme.textM }}>
                              <Clock size={10} className="inline mr-1" />
                              {fmt12(req.start_time)}{req.end_time ? ` – ${fmt12(req.end_time)}` : ''}
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
                          {req.guest_count ? <p>{req.guest_count} guests</p> : null}
                          {req.mc_needed ? <p className="text-yellow-400 font-bold">MC needed</p> : null}
                          <p className="text-[10px] mt-1" style={{ color: theme.textM + '80' }}>
                            {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {req.special_requests && (
                        <p className="text-xs px-3 py-2 rounded-xl mb-3 italic" style={{ backgroundColor: theme.bg, color: theme.textM }}>
                          "{req.special_requests}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {req.client_email && (
                          <a href={`mailto:${req.client_email}`} className="flex items-center gap-1 text-xs hover:opacity-80" style={{ color: DJ_INDIGO }}>
                            <Mail size={11} />{req.client_email}
                          </a>
                        )}
                        {req.client_phone && (
                          <a href={`tel:${req.client_phone}`} className="flex items-center gap-1 text-xs hover:opacity-80" style={{ color: DJ_INDIGO }}>
                            <Phone size={11} />{req.client_phone}
                          </a>
                        )}
                        <div className="ml-auto flex gap-1.5">
                          <button onClick={() => { setSelectedReq(selectedReq?.id === req.id ? null : req); setNotesEdit(req.notes || '') }}
                            className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={{ color: DJ_INDIGO, backgroundColor: `${DJ_INDIGO}15` }}>
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => deleteRequest(req.id)}
                            className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Status action buttons */}
                      <div className="flex gap-1.5 flex-wrap">
                        {(['reviewed', 'quoted', 'booked', 'declined'] as BookingRequestStatus[]).map(s => (
                          <button key={s} onClick={() => updateStatus(req.id, s)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-90 active:scale-95"
                            style={{
                              backgroundColor: req.status === s ? STATUS_CONFIG[s].color : `${STATUS_CONFIG[s].color}20`,
                              color: req.status === s ? '#fff' : STATUS_CONFIG[s].color,
                              border: `1px solid ${STATUS_CONFIG[s].color}${req.status === s ? '' : '50'}`,
                            }}>
                            {s === req.status ? '✓ ' : ''}{STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>

                      {/* Convert to Gig button */}
                      {(req.status === 'booked') && (
                        <div className="mt-3">
                          {isConverted ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: DJ_GREEN }}>
                              <CheckCircle2 size={12} /> Added to DJ Gig Manager
                            </div>
                          ) : (
                            <button onClick={() => convertToGig(req)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                              style={{ background: `linear-gradient(135deg, ${DJ_GREEN}, #059669)`, color: '#fff' }}>
                              <Plus size={13} /> Add to DJ Gig Manager
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notes editor */}
                    <AnimatePresence>
                      {selectedReq?.id === req.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t px-4 pb-4 pt-3" style={{ borderColor: theme.border }}>
                          <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: theme.textM }}>
                            Internal Notes
                          </label>
                          <textarea
                            value={notesEdit}
                            onChange={e => setNotesEdit(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                            style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                            placeholder="Internal notes (not visible to client)..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { updateStatus(req.id, req.status, notesEdit); setSelectedReq(null) }}
                              className="flex-1 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                              style={{ backgroundColor: DJ_INDIGO }}>
                              <Check size={13} className="inline mr-1" />Save Notes
                            </button>
                            <button onClick={() => setSelectedReq(null)}
                              className="px-4 py-2 rounded-xl text-sm hover:opacity-70 transition-all"
                              style={{ backgroundColor: theme.bg, color: theme.textM }}>
                              <X size={13} className="inline mr-1" />Close
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── AVAILABILITY TAB ── */}
      {tab === 'availability' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          <div className="rounded-2xl p-4" style={{ backgroundColor: `${DJ_GREEN}12`, border: `1px solid ${DJ_GREEN}30` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={13} style={{ color: DJ_GREEN }} />
                  <p className="text-sm font-bold" style={{ color: theme.text }}>Auto-Sync Active</p>
                </div>
                <p className="text-xs" style={{ color: theme.textM }}>
                  Every gig change in DJ Gig Manager auto-blocks the date and updates the public posterboard.
                </p>
                <p className="text-xs mt-1 font-semibold" style={{ color: DJ_GREEN }}>
                  {djGigs.filter(g => g.status !== 'cancelled' && g.date).length} gigs synced · {djGigs.filter(g => ['confirmed', 'pending'].includes(g.status) && g.date >= today).length} upcoming blocked
                </p>
              </div>
              <button onClick={syncGigDates} disabled={availLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                style={{ backgroundColor: `${DJ_INDIGO}20`, color: DJ_INDIGO, border: `1px solid ${DJ_INDIGO}40` }}>
                <RefreshCw size={12} className={availLoading ? 'animate-spin' : ''} />
                {availLoading ? 'Syncing...' : 'Force Sync'}
              </button>
            </div>
          </div>

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
                const hasGig = djGigs.some(g => g.date === dateStr && g.status !== 'cancelled')
                const hasRequest = requests.some(r => r.date === dateStr && r.status !== 'declined')

                return (
                  <button key={d}
                    onClick={() => !isPast && toggleDateBlock(dateStr)}
                    disabled={isPast}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative hover:opacity-80"
                    style={{
                      backgroundColor: isBlocked ? (hasGig ? `${DJ_PINK}30` : `${DJ_PINK}20`) : hasRequest ? `${DJ_GOLD}20` : isToday ? `${DJ_INDIGO}20` : 'transparent',
                      border: isToday ? `1px solid ${DJ_INDIGO}` : isBlocked ? `1px solid ${DJ_PINK}60` : '1px solid transparent',
                      color: isPast ? (theme.textM + '50') : isBlocked ? DJ_PINK : theme.text,
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      opacity: isPast ? 0.5 : 1,
                    }}
                    title={isPast ? '' : hasGig ? 'Managed by DJ Gig Manager' : isBlocked ? 'Click to unblock' : 'Click to block'}>
                    {d}
                    {isBlocked && <Lock size={6} className="absolute bottom-0.5" style={{ color: DJ_PINK }} />}
                    {hasRequest && !isBlocked && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DJ_GOLD }} />}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-4 mt-4 flex-wrap">
              {[
                { color: DJ_PINK, label: 'DJ Gig (auto)' },
                { color: DJ_GOLD, label: 'Has Request' },
                { color: DJ_INDIGO, label: 'Today' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: theme.textM }}>
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: `${color}40`, border: `1px solid ${color}` }} />
                  {label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textM }}>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: `${DJ_PINK}20`, border: `1px solid ${DJ_PINK}60` }} />
                Manual block
              </div>
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: theme.textM }}>
            DJ gig dates are auto-blocked. Click any unmanaged future date to add/remove a manual block.
          </p>
        </motion.div>
      )}

      {/* ── POSTERBOARD TAB ── */}
      {tab === 'posterboard' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          <div className="flex gap-2">
            {(['upcoming', 'past', 'all'] as const).map(v => (
              <button key={v} onClick={() => setPosterView(v)}
                className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={{ backgroundColor: posterView === v ? theme.accent : `${theme.accent}15`, color: posterView === v ? '#fff' : theme.accent }}>
                {v === 'upcoming' ? `Upcoming (${upcomingGigs.length})` : v === 'past' ? `Past (${pastGigs.length})` : `All (${djGigs.length})`}
              </button>
            ))}
          </div>

          {/* Gig revenue summary */}
          {djGigs.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Gigs', value: String(djGigs.length), color: DJ_INDIGO },
                { label: 'Confirmed', value: String(djGigs.filter(g => g.status === 'confirmed').length), color: DJ_GREEN },
                { label: 'Total Revenue', value: `$${djGigs.reduce((s: number, g: any) => s + (g.contractAmount || g.fee || 0), 0).toLocaleString()}`, color: DJ_GOLD },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${stat.color}12`, border: `1px solid ${stat.color}25` }}>
                  <p className="text-base font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: theme.textM }}>{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {posterGigs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <Mic2 size={24} className="mx-auto mb-3" style={{ color: theme.textM }} />
              <p className="font-semibold">No gigs to show</p>
              <p className="text-xs mt-1">Add gigs in DJ Gig Manager or convert Booked requests.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {posterGigs.map((gig: any) => {
                const statusColors: Record<string, string> = {
                  inquiry: '#94A3B8', pending: DJ_GOLD, confirmed: DJ_GREEN,
                  completed: DJ_INDIGO, cancelled: '#EF4444',
                }
                const color = statusColors[gig.status] || '#94A3B8'
                const gigDate = gig.date ? new Date(gig.date + 'T00:00:00') : null
                const daysAway = gigDate ? Math.ceil((gigDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null

                return (
                  <motion.div key={gig.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: theme.card, border: `1px solid ${color}40` }}
                    className="rounded-2xl p-4">
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
                          {gig.bookingRequestId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${DJ_GREEN}15`, color: DJ_GREEN }}>
                              from booking
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: theme.textM }}>
                          {gig.date && <span className="flex items-center gap-1"><Calendar size={10} />{gigDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                          {(gig.startTime || gig.endTime) && <span className="flex items-center gap-1"><Clock size={10} />{gig.startTime} – {gig.endTime}</span>}
                          {(gig.venue || gig.city) && <span className="flex items-center gap-1"><MapPin size={10} />{[gig.venue, gig.city].filter(Boolean).join(', ')}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black" style={{ color }}>${(gig.contractAmount || gig.fee || 0).toLocaleString()}</p>
                        {gig.depositPaid && <p className="text-[10px] font-semibold" style={{ color: DJ_GREEN }}>Deposit ✓</p>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-xs mb-3" style={{ color: theme.textM }}>Add gigs directly in the DJ Gig Manager, or mark requests as Booked above.</p>
            <a href="/dj" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: DJ_PINK }}>
              <Mic2 size={14} /> Open DJ Gig Manager
            </a>
          </div>
        </motion.div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>Activity Log</h2>
            <button
              onClick={() => {
                localStorage.removeItem('orca-dj-activity')
                setActivityLog([])
                toast('success', 'Activity log cleared')
              }}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              Clear Log
            </button>
          </div>

          {activityLog.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ color: theme.textM, backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <CheckCircle2 size={24} className="mx-auto mb-3" style={{ color: theme.textM }} />
              <p className="font-semibold">No activity yet</p>
              <p className="text-xs mt-1">Actions in DJ Gig Manager will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activityLog.map((entry: any, i: number) => {
                const actionColors: Record<string, string> = {
                  created: DJ_GREEN,
                  deleted: '#EF4444',
                  status_changed: DJ_GOLD,
                  sync: DJ_INDIGO,
                }
                const actionLabels: Record<string, string> = {
                  created: 'Gig Created',
                  deleted: 'Gig Deleted',
                  status_changed: 'Status Changed',
                  sync: 'Synced',
                }
                const color = actionColors[entry.action] || theme.textM
                const label = actionLabels[entry.action] || entry.action
                const at = new Date(entry.at)
                const timeStr = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold" style={{ color }}>{label}</span>
                        {entry.client && <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{entry.client}</span>}
                        {entry.date && <span className="text-[10px]" style={{ color: theme.textM }}>{entry.date}</span>}
                      </div>
                      {entry.action === 'status_changed' && (
                        <p className="text-[11px] mt-0.5" style={{ color: theme.textM }}>
                          {entry.from} → {entry.to}
                        </p>
                      )}
                      {entry.action === 'sync' && (
                        <p className="text-[11px] mt-0.5" style={{ color: theme.textM }}>
                          {entry.synced} gig{entry.synced !== 1 ? 's' : ''} synced to Supabase
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: theme.textM }}>{timeStr}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ backgroundColor: `${DJ_INDIGO}10`, border: `1px solid ${DJ_INDIGO}20` }}>
            <p className="text-xs" style={{ color: DJ_INDIGO }}>
              Activity is logged locally on this device. Logs persist across sessions and cap at 50 entries.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Star size={15} style={{ color: DJ_GOLD }} />
              <h2 className="font-bold text-base" style={{ color: theme.text }}>DJ Profile & Settings</h2>
            </div>

            <div className="space-y-3">
              {[
                { key: 'name' as const, label: 'DJ Name / Brand', placeholder: 'maskoffdadj' },
                { key: 'genres' as const, label: 'Genres', placeholder: 'Hip-Hop, R&B, Top 40, Old School...' },
                { key: 'baseRate' as const, label: 'Base Rate', placeholder: 'e.g., Starting at $500 for 3 hours' },
                { key: 'contactEmail' as const, label: 'Booking Email', placeholder: 'your@email.com' },
                { key: 'contactPhone' as const, label: 'Booking Phone', placeholder: '(555) 000-0000' },
                { key: 'instagram' as const, label: 'Instagram Handle', placeholder: '@maskoffdadj' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: theme.textM }}>
                    {field.label}
                  </label>
                  <input
                    value={profile[field.key]}
                    onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-1" style={{ color: theme.textM }}>Bio / About</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={4}
                  placeholder="Tell clients about your style, experience, what makes you unique..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
            </div>
          </div>

          <button onClick={saveProfile}
            className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-97"
            style={{ background: profileSaved ? `linear-gradient(135deg, ${DJ_GREEN}, #059669)` : `linear-gradient(135deg, ${DJ_PINK}, ${DJ_INDIGO})`, color: '#fff' }}>
            {profileSaved ? <><CheckCircle2 size={15} /> Saved!</> : <><Check size={15} /> Save Profile</>}
          </button>

          <div className="rounded-2xl p-4" style={{ backgroundColor: `${DJ_INDIGO}10`, border: `1px solid ${DJ_INDIGO}30` }}>
            <p className="text-xs font-semibold" style={{ color: DJ_INDIGO }}>
              Profile data is saved locally. To display it on your public page (maskoffdadj), your public page reads from this localStorage key: <code className="font-mono">orca-dj-profile</code>.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
