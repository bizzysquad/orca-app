'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, Plus, TrendingUp, ArrowLeft, Sparkles,
  Check, Circle, ChevronRight, DollarSign, Car, Mic2,
  ShoppingBag, Video, Music, Globe, Palette, Zap,
  Trash2, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { Business, BusinessTask, BusinessType } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const BIZ_META: Record<BusinessType, { label: string; icon: React.ElementType; color: string }> = {
  'etsy':             { label: 'Etsy Store',       icon: ShoppingBag, color: '#F97316' },
  'travel-app':       { label: 'Travel App',       icon: Globe,       color: '#06B6D4' },
  'bizzplug':         { label: 'BizzyPlug',        icon: Palette,     color: BENTLEY_GOLD },
  'motivational-video': { label: 'Motivational Videos', icon: Video,  color: '#EC4899' },
  'music':            { label: 'Music',            icon: Music,       color: '#A78BFA' },
  'dj':               { label: 'DJ Gigs',          icon: Mic2,        color: '#F43F5E' },
  'lyft':             { label: 'Lyft',             icon: Car,         color: '#22D3EE' },
  'orca':             { label: 'ORCA App',         icon: Zap,         color: BENTLEY_INDIGO },
  'other':            { label: 'Other',            icon: Briefcase,   color: '#94A3B8' },
}

const DEFAULT_BUSINESSES: Business[] = [
  { id: 'etsy', name: 'Etsy Store', type: 'etsy', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'bizzplug', name: 'BizzyPlug', type: 'bizzplug', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'motivational-video', name: 'Motivational Videos', type: 'motivational-video', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'lyft', name: 'Lyft', type: 'lyft', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'music', name: 'Music', type: 'music', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'dj', name: 'DJ Gigs', type: 'dj', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'travel-app', name: 'Travel App', type: 'travel-app', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
  { id: 'orca', name: 'ORCA App', type: 'orca', active: true, currentMonthRevenue: 0, currentMonthExpenses: 0, tasks: [] },
]

function BizCard({ biz, onAddTask, onCompleteTask, onDeleteTask, onUpdateRevenue }: {
  biz: Business
  onAddTask: (bizId: string, title: string, priority: BusinessTask['priority']) => void
  onCompleteTask: (bizId: string, taskId: string) => void
  onDeleteTask: (bizId: string, taskId: string) => void
  onUpdateRevenue: (bizId: string, amount: number) => void
}) {
  const { theme } = useTheme()
  const meta = BIZ_META[biz.type]
  const Icon = meta.icon
  const [expanded, setExpanded] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [editRevenue, setEditRevenue] = useState(false)
  const [revenueInput, setRevenueInput] = useState(biz.currentMonthRevenue.toString())

  const activeTasks = biz.tasks.filter(t => t.status !== 'done')
  const doneTasks = biz.tasks.filter(t => t.status === 'done')

  const profit = biz.currentMonthRevenue - biz.currentMonthExpenses

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-2 rounded-xl shrink-0" style={{ background: `${meta.color}18` }}>
          <Icon size={16} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: theme.text }}>{biz.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: biz.currentMonthRevenue > 0 ? BENTLEY_GREEN : theme.subtext }}>
              {biz.currentMonthRevenue > 0 ? fmt(biz.currentMonthRevenue) : 'No revenue logged'}
            </span>
            {activeTasks.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${meta.color}18`, color: meta.color }}
              >
                {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: theme.subtext,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
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
              {/* Revenue row */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-xs" style={{ color: theme.subtext }}>This Month</div>
                  {editRevenue ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={revenueInput}
                        onChange={e => setRevenueInput(e.target.value)}
                        className="w-24 rounded-lg px-2 py-1 text-sm outline-none"
                        style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdateRevenue(biz.id, Number(revenueInput) || 0)
                          setEditRevenue(false)
                        }}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: BENTLEY_GREEN, color: '#fff' }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditRevenue(true)}
                      className="text-base font-bold"
                      style={{ color: biz.currentMonthRevenue > 0 ? BENTLEY_GREEN : theme.subtext }}
                    >
                      {biz.currentMonthRevenue > 0 ? fmt(biz.currentMonthRevenue) : 'Tap to log revenue'}
                    </button>
                  )}
                </div>
                {profit !== 0 && (
                  <div>
                    <div className="text-xs" style={{ color: theme.subtext }}>Profit</div>
                    <div className="text-sm font-bold" style={{ color: profit > 0 ? BENTLEY_GREEN : BENTLEY_RED }}>
                      {profit > 0 ? '+' : ''}{fmt(profit)}
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks */}
              {activeTasks.length > 0 && (
                <div className="space-y-1.5">
                  {activeTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2.5">
                      <button onClick={() => onCompleteTask(biz.id, task.id)}>
                        <Circle size={16} style={{ color: task.priority === 'high' ? BENTLEY_RED : meta.color }} />
                      </button>
                      <span className="flex-1 text-sm" style={{ color: theme.text }}>{task.title}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: task.priority === 'high' ? `${BENTLEY_RED}18` : `${BENTLEY_GOLD}18`,
                          color: task.priority === 'high' ? BENTLEY_RED : BENTLEY_GOLD,
                        }}
                      >
                        {task.priority}
                      </span>
                      <button onClick={() => onDeleteTask(biz.id, task.id)}>
                        <Trash2 size={11} style={{ color: theme.subtext }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add task */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTask.trim()) {
                      onAddTask(biz.id, newTask.trim(), 'medium')
                      setNewTask('')
                    }
                  }}
                  placeholder="Add task..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                <button
                  onClick={() => {
                    if (newTask.trim()) {
                      onAddTask(biz.id, newTask.trim(), 'medium')
                      setNewTask('')
                    }
                  }}
                  className="p-2 rounded-xl"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {doneTasks.length > 0 && (
                <p className="text-xs" style={{ color: theme.subtext }}>{doneTasks.length} task{doneTasks.length > 1 ? 's' : ''} completed</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BusinessPage() {
  const { theme } = useTheme()
  const [businesses, setBusinesses] = useState<Business[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-businesses')
      if (saved) {
        setBusinesses(JSON.parse(saved))
      } else {
        setBusinesses(DEFAULT_BUSINESSES)
        setLocalSynced('orca-businesses', JSON.stringify(DEFAULT_BUSINESSES))
      }
    } catch {
      setBusinesses(DEFAULT_BUSINESSES)
    }
  }, [])

  const save = (b: Business[]) => {
    try { setLocalSynced('orca-businesses', JSON.stringify(b)) } catch {}
  }

  const addTask = (bizId: string, title: string, priority: BusinessTask['priority']) => {
    const task: BusinessTask = {
      id: Date.now().toString(),
      businessId: bizId,
      title,
      priority,
      status: 'todo',
      createdAt: new Date().toISOString(),
    }
    const next = businesses.map(b =>
      b.id === bizId ? { ...b, tasks: [...b.tasks, task] } : b
    )
    setBusinesses(next)
    save(next)
  }

  const completeTask = (bizId: string, taskId: string) => {
    const next = businesses.map(b =>
      b.id === bizId
        ? { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t) }
        : b
    )
    setBusinesses(next)
    save(next)
  }

  const deleteTask = (bizId: string, taskId: string) => {
    const next = businesses.map(b =>
      b.id === bizId ? { ...b, tasks: b.tasks.filter(t => t.id !== taskId) } : b
    )
    setBusinesses(next)
    save(next)
  }

  const updateRevenue = (bizId: string, amount: number) => {
    const next = businesses.map(b => b.id === bizId ? { ...b, currentMonthRevenue: amount } : b)
    setBusinesses(next)
    save(next)
  }

  const stats = useMemo(() => {
    const totalRevenue = businesses.reduce((s, b) => s + b.currentMonthRevenue, 0)
    const totalTasks = businesses.reduce((s, b) => s + b.tasks.filter(t => t.status !== 'done').length, 0)
    const highPriority = businesses.reduce((s, b) => s + b.tasks.filter(t => t.status !== 'done' && t.priority === 'high').length, 0)
    const profitable = businesses.filter(b => b.currentMonthRevenue > b.currentMonthExpenses && b.currentMonthRevenue > 0).length
    return { totalRevenue, totalTasks, highPriority, profitable }
  }, [businesses])

  const bentleyPriority = useMemo(() => {
    const highTasks = businesses
      .flatMap(b => b.tasks.filter(t => t.status !== 'done' && t.priority === 'high').map(t => ({ biz: b.name, task: t.title })))
    const noRevenue = businesses.filter(b => b.active && b.currentMonthRevenue === 0)
    if (highTasks.length > 0) return `${highTasks[0].biz}: "${highTasks[0].task}" — this is high priority. Handle it.`
    if (noRevenue.length >= 3) return `${noRevenue.length} businesses have zero revenue this month. Pick one and move it forward today.`
    return 'Log your revenue across businesses. Measurement is accountability.'
  }, [businesses])

  // Lyft specific data
  const [lyftSessions, setLyftSessions] = useState<any[]>([])
  const [showLyftLog, setShowLyftLog] = useState(false)
  const [lyftForm, setLyftForm] = useState({ date: new Date().toISOString().slice(0, 10), earnings: '', trips: '', hours: '' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-lyft-sessions')
      if (saved) setLyftSessions(JSON.parse(saved))
    } catch {}
  }, [])

  const logLyft = () => {
    if (!lyftForm.earnings) return
    const session = {
      id: Date.now().toString(),
      date: lyftForm.date,
      earnings: Number(lyftForm.earnings),
      trips: Number(lyftForm.trips) || 0,
      hours: Number(lyftForm.hours) || 0,
    }
    const next = [...lyftSessions, session]
    setLyftSessions(next)
    try { setLocalSynced('orca-lyft-sessions', JSON.stringify(next)) } catch {}

    // Also update Lyft business revenue
    const totalThisMonth = next
      .filter(s => s.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, s) => sum + s.earnings, 0)
    updateRevenue('lyft', totalThisMonth)

    setLyftForm({ date: new Date().toISOString().slice(0, 10), earnings: '', trips: '', hours: '' })
    setShowLyftLog(false)
  }

  const weeklyLyft = useMemo(() => {
    const monday = new Date()
    monday.setDate(monday.getDate() - monday.getDay() + 1)
    const weekStr = monday.toISOString().slice(0, 10)
    return lyftSessions
      .filter(s => s.date >= weekStr)
      .reduce((sum, s) => sum + s.earnings, 0)
  }, [lyftSessions])

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="p-2 rounded-xl" style={{ background: theme.card }}>
              <ArrowLeft size={16} style={{ color: theme.subtext }} />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>Work</h1>
            <p className="text-xs" style={{ color: theme.subtext }}>8 Businesses + Lyft</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowLyftLog(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: `#22D3EE18`, color: '#22D3EE', border: `1px solid #22D3EE30` }}
        >
          <Car size={12} /> Log Lyft
        </motion.button>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto lg:max-w-3xl"
      >
        {/* ── Stats ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xs mb-1" style={{ color: theme.subtext }}>Month Revenue</div>
            <div className="text-2xl font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(stats.totalRevenue)}</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="text-xs mb-1" style={{ color: theme.subtext }}>Lyft This Week</div>
            <div className="text-2xl font-bold" style={{ color: '#22D3EE' }}>{fmt(weeklyLyft)}</div>
            <div className="text-xs mt-0.5" style={{ color: theme.subtext }}>/ $400 goal</div>
          </div>
        </motion.div>

        {/* ── Bentley Notes ── */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Bentley's Take</span>
          </div>
          <p className="text-sm leading-snug" style={{ color: '#CBD5E1' }}>{bentleyPriority}</p>
        </motion.div>

        {/* ── Business Cards ── */}
        <div className="space-y-3">
          {businesses.map(biz => (
            <BizCard
              key={biz.id}
              biz={biz}
              onAddTask={addTask}
              onCompleteTask={completeTask}
              onDeleteTask={deleteTask}
              onUpdateRevenue={updateRevenue}
            />
          ))}
        </div>

        {/* ── DJ Link ── */}
        <motion.div variants={fadeUp}>
          <Link href="/dj">
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: theme.card, border: `1px solid #F43F5E30` }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `#F43F5E18` }}>
                  <Mic2 size={16} style={{ color: '#F43F5E' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: theme.text }}>DJ Gig Manager</p>
                  <p className="text-xs" style={{ color: theme.subtext }}>Track gigs, invoices & bookings</p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: theme.subtext }} />
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Lyft Log Modal ── */}
      <AnimatePresence>
        {showLyftLog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowLyftLog(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Log Lyft Session</h3>
              <input type="date" value={lyftForm.date} onChange={e => setLyftForm(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={lyftForm.earnings} onChange={e => setLyftForm(p => ({ ...p, earnings: e.target.value }))}
                  placeholder="Earnings $" className="rounded-xl px-3 py-3 outline-none text-sm"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="number" value={lyftForm.trips} onChange={e => setLyftForm(p => ({ ...p, trips: e.target.value }))}
                  placeholder="Trips" className="rounded-xl px-3 py-3 outline-none text-sm"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="number" value={lyftForm.hours} onChange={e => setLyftForm(p => ({ ...p, hours: e.target.value }))}
                  placeholder="Hours" className="rounded-xl px-3 py-3 outline-none text-sm"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowLyftLog(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                <button onClick={logLyft} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: '#22D3EE', color: '#0F172A' }}>Log It</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
