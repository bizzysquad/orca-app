'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Plus, ArrowLeft, Sparkles, Calendar, DollarSign,
  Check, Clock, MapPin, Phone, Mail, Trash2, ChevronRight,
  FileText, Music, Package,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { DJGig, GigStatus, GigType } from '@/lib/types'
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

const BLANK_GIG = (): Partial<DJGig> => ({
  clientName: '',
  eventType: 'private' as GigType,
  date: '',
  startTime: '20:00',
  endTime: '23:00',
  venue: '',
  status: 'inquiry' as GigStatus,
  fee: 0,
  depositPaid: false,
  balancePaid: false,
  gearChecklist: DEFAULT_GEAR.map((item, i) => ({ id: String(i), item, checked: false })),
})

function GigCard({ gig, onToggleGear, onDelete, onUpdateStatus }: {
  gig: DJGig
  onToggleGear: (gigId: string, itemId: string) => void
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: GigStatus) => void
}) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[gig.status]
  const today = new Date().toISOString().slice(0, 10)
  const daysUntil = Math.ceil((new Date(gig.date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isUpcoming = gig.date >= today && gig.status === 'confirmed'
  const gearDone = gig.gearChecklist.filter(g => g.checked).length

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${isUpcoming && daysUntil <= 3 ? `${DJ_PINK}50` : theme.border}` }}
    >
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="p-2 rounded-xl shrink-0" style={{ background: `${DJ_PINK}18` }}>
          <Mic2 size={15} style={{ color: DJ_PINK }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate" style={{ color: theme.text }}>{gig.clientName}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${status.color}18`, color: status.color }}
            >
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
            <span style={{ color: BENTLEY_GREEN }}>{fmt(gig.fee)}</span>
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{ color: theme.subtext, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              {/* Details */}
              <div className="pt-3 space-y-2 text-sm">
                {gig.venue && (
                  <div className="flex items-center gap-2" style={{ color: theme.subtext }}>
                    <MapPin size={12} /> {gig.venue}
                  </div>
                )}
                <div className="flex items-center gap-2" style={{ color: theme.subtext }}>
                  <Clock size={12} /> {gig.startTime} — {gig.endTime}
                </div>
                {gig.clientEmail && (
                  <div className="flex items-center gap-2" style={{ color: theme.subtext }}>
                    <Mail size={12} /> {gig.clientEmail}
                  </div>
                )}
                {gig.clientPhone && (
                  <div className="flex items-center gap-2" style={{ color: theme.subtext }}>
                    <Phone size={12} /> {gig.clientPhone}
                  </div>
                )}
              </div>

              {/* Payment status */}
              <div className="flex gap-2">
                <div
                  className="flex-1 p-2 rounded-xl text-center text-xs font-semibold"
                  style={{
                    background: gig.depositPaid ? `${BENTLEY_GREEN}18` : `${BENTLEY_RED}18`,
                    color: gig.depositPaid ? BENTLEY_GREEN : BENTLEY_RED,
                  }}
                >
                  Deposit: {gig.depositPaid ? 'PAID' : 'PENDING'}
                </div>
                <div
                  className="flex-1 p-2 rounded-xl text-center text-xs font-semibold"
                  style={{
                    background: gig.balancePaid ? `${BENTLEY_GREEN}18` : `${BENTLEY_GOLD}18`,
                    color: gig.balancePaid ? BENTLEY_GREEN : BENTLEY_GOLD,
                  }}
                >
                  Balance: {gig.balancePaid ? 'PAID' : fmt(gig.fee)}
                </div>
              </div>

              {/* Gear checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.subtext }}>
                    Gear Check
                  </p>
                  <span className="text-xs font-bold" style={{ color: gearDone === gig.gearChecklist.length ? BENTLEY_GREEN : BENTLEY_GOLD }}>
                    {gearDone}/{gig.gearChecklist.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {gig.gearChecklist.map(g => (
                    <button
                      key={g.id}
                      onClick={() => onToggleGear(gig.id, g.id)}
                      className="w-full flex items-center gap-2.5 text-left"
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{
                          background: g.checked ? BENTLEY_GREEN : 'transparent',
                          border: `1.5px solid ${g.checked ? BENTLEY_GREEN : theme.border}`,
                        }}
                      >
                        {g.checked && <Check size={10} color="#fff" />}
                      </div>
                      <span className="text-sm" style={{ color: g.checked ? theme.subtext : theme.text }}>{g.item}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status update */}
              <div className="flex gap-2 flex-wrap">
                {(['confirmed', 'completed', 'cancelled'] as GigStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(gig.id, s)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function DJPage() {
  const { theme } = useTheme()
  const [gigs, setGigs] = useState<DJGig[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newGig, setNewGig] = useState<Partial<DJGig>>(BLANK_GIG())
  const [filterStatus, setFilterStatus] = useState<GigStatus | 'all'>('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) setGigs(JSON.parse(saved))
    } catch {}
  }, [])

  const save = (g: DJGig[]) => {
    try { localStorage.setItem('orca-dj-gigs', JSON.stringify(g)) } catch {}
  }

  const addGig = () => {
    if (!newGig.clientName || !newGig.date) return
    const gig: DJGig = {
      id: Date.now().toString(),
      clientName: newGig.clientName || '',
      clientEmail: newGig.clientEmail,
      clientPhone: newGig.clientPhone,
      eventType: newGig.eventType || 'private',
      date: newGig.date || '',
      startTime: newGig.startTime || '20:00',
      endTime: newGig.endTime || '23:00',
      venue: newGig.venue || '',
      status: newGig.status || 'inquiry',
      fee: newGig.fee || 0,
      depositPaid: false,
      balancePaid: false,
      gearChecklist: DEFAULT_GEAR.map((item, i) => ({ id: String(i), item, checked: false })),
      createdAt: new Date().toISOString(),
    }
    const next = [...gigs, gig]
    setGigs(next)
    save(next)
    setNewGig(BLANK_GIG())
    setShowAdd(false)
  }

  const toggleGear = (gigId: string, itemId: string) => {
    const next = gigs.map(g =>
      g.id !== gigId ? g : {
        ...g,
        gearChecklist: g.gearChecklist.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i)
      }
    )
    setGigs(next)
    save(next)
  }

  const deleteGig = (id: string) => {
    const next = gigs.filter(g => g.id !== id)
    setGigs(next)
    save(next)
  }

  const updateStatus = (id: string, status: GigStatus) => {
    const next = gigs.map(g => g.id === id ? { ...g, status } : g)
    setGigs(next)
    save(next)
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    let list = filterStatus === 'all' ? gigs : gigs.filter(g => g.status === filterStatus)
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [gigs, filterStatus])

  const stats = useMemo(() => {
    const upcoming = gigs.filter(g => g.date >= today && g.status === 'confirmed')
    const totalEarned = gigs.filter(g => g.status === 'completed').reduce((s, g) => s + g.fee, 0)
    const pendingRevenue = upcoming.reduce((s, g) => s + g.fee, 0)
    return { upcoming: upcoming.length, totalEarned, pendingRevenue, nextGig: upcoming.sort((a, b) => a.date.localeCompare(b.date))[0] }
  }, [gigs, today])

  const bentleyAlert = useMemo(() => {
    if (!stats.nextGig) return null
    const days = Math.ceil((new Date(stats.nextGig.date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 7) return `DJ gig in ${days} day${days === 1 ? '' : 's'} — ${stats.nextGig.clientName} at ${stats.nextGig.venue || 'TBD'}. Invoice, playlist, gear check needed.`
    return null
  }, [stats])

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <Link href="/business">
            <div className="p-2 rounded-xl" style={{ background: theme.card }}>
              <ArrowLeft size={16} style={{ color: theme.subtext }} />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>DJ Gig Manager</h1>
            <p className="text-xs" style={{ color: theme.subtext }}>{gigs.length} gig{gigs.length !== 1 ? 's' : ''} total</p>
          </div>
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
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xl font-bold" style={{ color: DJ_PINK }}>{stats.upcoming}</div>
            <div className="text-[10px]" style={{ color: theme.subtext }}>Upcoming</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xl font-bold" style={{ color: BENTLEY_GOLD }}>{fmt(stats.pendingRevenue)}</div>
            <div className="text-[10px]" style={{ color: theme.subtext }}>Pending $</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xl font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(stats.totalEarned)}</div>
            <div className="text-[10px]" style={{ color: theme.subtext }}>Earned</div>
          </div>
        </motion.div>

        {/* Alert */}
        {bentleyAlert && (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${DJ_PINK}30` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Bentley Alert</span>
            </div>
            <p className="text-sm leading-snug" style={{ color: '#CBD5E1' }}>{bentleyAlert}</p>
          </motion.div>
        )}

        {/* Filter */}
        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'inquiry', 'pending', 'confirmed', 'completed'] as const).map(s => (
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
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </motion.div>

        {/* Gig List */}
        {filtered.length === 0 ? (
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <Mic2 size={32} style={{ color: theme.subtext, margin: '0 auto 12px' }} />
              <p className="text-sm font-medium" style={{ color: theme.text }}>No gigs here.</p>
              <p className="text-xs mt-1" style={{ color: theme.subtext }}>Add a gig to start tracking.</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map(gig => (
              <GigCard key={gig.id} gig={gig} onToggleGear={toggleGear} onDelete={deleteGig} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Gig Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-3"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>New Gig</h3>
              <input type="text" value={newGig.clientName || ''} onChange={e => setNewGig(p => ({ ...p, clientName: e.target.value }))}
                placeholder="Client name" autoFocus className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <input type="text" value={newGig.venue || ''} onChange={e => setNewGig(p => ({ ...p, venue: e.target.value }))}
                placeholder="Venue" className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <input type="date" value={newGig.date || ''} onChange={e => setNewGig(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={newGig.startTime || '20:00'} onChange={e => setNewGig(p => ({ ...p, startTime: e.target.value }))}
                  className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="time" value={newGig.endTime || '23:00'} onChange={e => setNewGig(p => ({ ...p, endTime: e.target.value }))}
                  className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={newGig.fee || ''} onChange={e => setNewGig(p => ({ ...p, fee: Number(e.target.value) }))}
                  placeholder="Fee $" className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <select value={newGig.status || 'inquiry'} onChange={e => setNewGig(p => ({ ...p, status: e.target.value as GigStatus }))}
                  className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <input type="email" value={newGig.clientEmail || ''} onChange={e => setNewGig(p => ({ ...p, clientEmail: e.target.value }))}
                placeholder="Client email (optional)" className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                <button onClick={addGig} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: DJ_PINK, color: '#fff' }}>Add Gig</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
