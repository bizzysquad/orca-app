'use client'

import { useState, useEffect, useMemo, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car, Trash2, ChevronLeft, ChevronRight, Target, X,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import type { LyftSession } from '@/lib/types'

const LYFT_BLUE = '#22D3EE'

function gid() { return Math.random().toString(36).slice(2, 10) }

const BLANK = (): Partial<LyftSession> => ({
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  earnings: 0,
  trips: 0,
  miles: undefined,
  gasExpense: undefined,
  city: '',
  notes: '',
})

export default function LyftMetricsPage() {
  const { theme } = useTheme()
  const [sessions, setSessions] = useState<LyftSession[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<LyftSession>>(BLANK())
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-lyft-sessions')
      if (saved) setSessions(JSON.parse(saved))
    } catch {}
  }, [])

  const save = (updated: LyftSession[]) => {
    setSessions(updated)
    try { localStorage.setItem('orca-lyft-sessions', JSON.stringify(updated)) } catch {}
  }

  const handleAdd = () => {
    if (!form.date || !form.earnings) return
    const sess: LyftSession = {
      id: gid(),
      date: form.date!,
      startTime: form.startTime || '',
      endTime: form.endTime || '',
      earnings: Number(form.earnings) || 0,
      trips: Number(form.trips) || 0,
      miles: form.miles ? Number(form.miles) : undefined,
      gasExpense: form.gasExpense ? Number(form.gasExpense) : undefined,
      city: form.city || '',
      notes: form.notes || '',
    }
    save([...sessions, sess].sort((a, b) => b.date.localeCompare(a.date)))
    setForm(BLANK())
    setShowForm(false)
  }

  const handleDelete = (id: string) => save(sessions.filter(s => s.id !== id))

  // Week date range
  const weekDates = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const sun = new Date(now)
    sun.setDate(now.getDate() - day + weekOffset * 7)
    sun.setHours(0, 0, 0, 0)
    const sat = new Date(sun)
    sat.setDate(sun.getDate() + 6)
    const start = sun.toISOString().slice(0, 10)
    const end = sat.toISOString().slice(0, 10)
    return { start, end, sun, sat }
  }, [weekOffset])

  const weekSessions = useMemo(
    () => sessions.filter(s => s.date >= weekDates.start && s.date <= weekDates.end),
    [sessions, weekDates]
  )

  const weekEarnings = weekSessions.reduce((s, sess) => s + sess.earnings, 0)
  const weekTrips = weekSessions.reduce((s, sess) => s + sess.trips, 0)
  const weekMiles = weekSessions.reduce((s, sess) => s + (sess.miles || 0), 0)
  const weekGas = weekSessions.reduce((s, sess) => s + (sess.gasExpense || 0), 0)
  const weekNet = weekEarnings - weekGas

  const allTimeEarnings = sessions.reduce((s, sess) => s + sess.earnings, 0)
  const allTimeTrips = sessions.reduce((s, sess) => s + sess.trips, 0)
  const earningsPerTrip = allTimeTrips > 0 ? allTimeEarnings / allTimeTrips : 0

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week'
    if (weekOffset === -1) return 'Last Week'
    return `${weekDates.sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates.sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [weekOffset, weekDates])

  const [goalWeekly, setGoalWeekly] = useState(500)

  useEffect(() => {
    try {
      const g = localStorage.getItem('orca-lyft-goal')
      if (g) setGoalWeekly(Number(g))
    } catch {}
  }, [])

  const saveGoal = (v: number) => {
    setGoalWeekly(v)
    try { localStorage.setItem('orca-lyft-goal', String(v)) } catch {}
  }

  const goalPct = Math.min(100, Math.round((weekEarnings / goalWeekly) * 100))

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Lyft Metrics</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Track your driving earnings & performance</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ backgroundColor: LYFT_BLUE, color: '#0a0a0a' }}
          >
            + Log Session
          </button>
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* All-time stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'All-Time Earnings', value: fmt(allTimeEarnings), color: LYFT_BLUE },
            { label: 'Total Trips', value: String(allTimeTrips), color: '#10B981' },
            { label: 'Avg / Trip', value: fmt(earningsPerTrip), color: '#F59E0B' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: theme.textM }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Weekly Goal Progress */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: LYFT_BLUE }} />
              <span className="text-sm font-bold" style={{ color: theme.text }}>Weekly Goal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: theme.textM }}>Goal:</span>
              <input
                type="number"
                value={goalWeekly}
                onChange={e => saveGoal(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded-lg text-xs font-bold text-right border"
                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: LYFT_BLUE }}
              />
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: `${LYFT_BLUE}20` }}>
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${goalPct}%` }}
              style={{ backgroundColor: goalPct >= 100 ? '#10B981' : LYFT_BLUE }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: theme.textM }}>
            <span>{fmt(weekEarnings)} earned this week</span>
            <span className="font-bold" style={{ color: goalPct >= 100 ? '#10B981' : LYFT_BLUE }}>
              {goalPct}% of goal
            </span>
          </div>
        </div>

        {/* Week navigator */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 rounded-xl"
              style={{ backgroundColor: theme.bg, color: theme.textM }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="font-bold text-sm" style={{ color: theme.text }}>{weekLabel}</p>
              <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                {weekDates.sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {weekDates.sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
              disabled={weekOffset >= 0}
              className="p-2 rounded-xl disabled:opacity-30"
              style={{ backgroundColor: theme.bg, color: theme.textM }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Gross Earnings', value: fmt(weekEarnings), color: LYFT_BLUE },
              { label: 'Net (after gas)', value: fmt(weekNet), color: '#10B981' },
              { label: 'Trips', value: String(weekTrips), color: '#F59E0B' },
              { label: 'Miles Driven', value: weekMiles > 0 ? `${weekMiles.toFixed(1)}mi` : '—', color: '#A78BFA' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3" style={{ backgroundColor: theme.bg }}>
                <p className="text-xs mb-0.5" style={{ color: theme.textM }}>{s.label}</p>
                <p className="font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {weekSessions.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: theme.textM }}>No sessions logged this week</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.textM }}>
                Sessions ({weekSessions.length})
              </p>
              {weekSessions.map(sess => (
                <div
                  key={sess.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: theme.bg }}
                >
                  <Car size={16} style={{ color: LYFT_BLUE }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: theme.text }}>
                        {new Date(sess.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      {sess.city && (
                        <span className="text-xs" style={{ color: theme.textM }}>{sess.city}</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: theme.textM }}>
                      {sess.trips} trips{sess.miles ? ` · ${sess.miles}mi` : ''}{sess.gasExpense ? ` · ${fmt(sess.gasExpense)} gas` : ''}
                      {sess.startTime && sess.endTime ? ` · ${sess.startTime}–${sess.endTime}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm" style={{ color: LYFT_BLUE }}>{fmt(sess.earnings)}</p>
                    {sess.gasExpense ? (
                      <p className="text-xs" style={{ color: '#10B981' }}>net {fmt(sess.earnings - sess.gasExpense)}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleDelete(sess.id)}
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: '#EF444420', color: '#EF4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Session Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl" style={{ color: theme.text }}>Log Driving Session</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
                  <X size={16} style={{ color: theme.text }} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Date *</label>
                  <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>City</label>
                  <input type="text" placeholder="Durham, NC" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Start Time</label>
                  <input type="time" value={form.startTime || ''} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>End Time</label>
                  <input type="time" value={form.endTime || ''} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Earnings ($) *</label>
                  <input type="number" placeholder="0.00" step="0.01" value={form.earnings || ''} onChange={e => setForm(f => ({ ...f, earnings: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Trips</label>
                  <input type="number" placeholder="0" value={form.trips || ''} onChange={e => setForm(f => ({ ...f, trips: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Miles Driven</label>
                  <input type="number" placeholder="0" value={form.miles || ''} onChange={e => setForm(f => ({ ...f, miles: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Gas Expense ($)</label>
                  <input type="number" placeholder="0.00" step="0.01" value={form.gasExpense || ''} onChange={e => setForm(f => ({ ...f, gasExpense: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Notes</label>
                <textarea rows={2} placeholder="Any notes about this session..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.date || !form.earnings}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: LYFT_BLUE, color: '#0a0a0a' }}
              >
                Save Session
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
