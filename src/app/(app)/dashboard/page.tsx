'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Zap, Target, TrendingUp, Music, Briefcase,
  Dumbbell, ShoppingCart, ChevronRight, Check, Circle,
  DollarSign, Receipt, Calendar, Bell, Mic2, Car,
  RefreshCw, Sparkles, ArrowRight, Plus, Coffee,
  Scale, Flame, Droplets, Star, Clock,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt } from '@/lib/utils'
import type { DailyPriority, WeightLog, MealLog, Song, Business } from '@/lib/types'

const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 26 } },
}

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

function getGreeting(name: string): { greeting: string; line: string } {
  const h = new Date().getHours()
  const firstName = name?.split(' ')[0] || 'Boss'
  if (h < 6) return {
    greeting: `Working late, ${firstName}?`,
    line: "Respect the grind. Don't forget sleep is part of the gains.",
  }
  if (h < 12) return {
    greeting: `Morning briefing, ${firstName}.`,
    line: "Stack the priorities early. The day isn't waiting for you.",
  }
  if (h < 17) return {
    greeting: `Midday check-in, ${firstName}.`,
    line: "How's the execution? Intentions are nothing without action.",
  }
  return {
    greeting: `Evening report, ${firstName}.`,
    line: "What did you actually finish today? Let's review.",
  }
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  href?: string
  alert?: boolean
}

function StatCard({ icon: Icon, label, value, sub, color, href, alert }: StatCardProps) {
  const { theme } = useTheme()
  const inner = (
    <motion.div
      variants={fadeUp}
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {alert && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BENTLEY_RED }} />
        )}
      </div>
      <div className="text-xl font-bold tracking-tight" style={{ color: theme.text }}>{value}</div>
      <div className="text-xs font-medium" style={{ color }}>{label}</div>
      {sub && <div className="text-xs" style={{ color: theme.subtext }}>{sub}</div>}
    </motion.div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

interface PriorityItemProps {
  item: { id: string; text: string; area: string; completed: boolean; addedByBentley: boolean }
  onToggle: (id: string) => void
  index: number
}

function PriorityItem({ item, onToggle, index }: PriorityItemProps) {
  const { theme } = useTheme()
  const areaColors: Record<string, string> = {
    fitness: BENTLEY_GREEN,
    money: '#10B981',
    music: '#A78BFA',
    business: BENTLEY_GOLD,
    dj: '#EC4899',
    lyft: '#F97316',
    personal: BENTLEY_INDIGO,
  }
  const color = areaColors[item.area] || BENTLEY_INDIGO

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 p-3 rounded-xl group"
      style={{ background: item.completed ? `${theme.border}30` : `${theme.card}` }}
    >
      <div className="text-xs font-bold w-5 text-center shrink-0" style={{ color: theme.subtext }}>
        {index + 1}
      </div>
      <button
        onClick={() => onToggle(item.id)}
        className="shrink-0 transition-all"
        style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `2px solid ${item.completed ? color : theme.border}`,
          background: item.completed ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {item.completed && <Check size={11} color="#fff" />}
      </button>
      <span
        className="flex-1 text-sm font-medium leading-snug"
        style={{
          color: item.completed ? theme.subtext : theme.text,
          textDecoration: item.completed ? 'line-through' : 'none',
        }}
      >
        {item.text}
      </span>
      <div
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
        style={{ background: `${color}18`, color }}
      >
        {item.area}
      </div>
    </motion.div>
  )
}

interface BentleyBriefingProps {
  bills: any[]
  checkingBalance: number
  name: string
}

function BentleyBriefing({ bills, checkingBalance, name }: BentleyBriefingProps) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)

  const upcomingBills = bills.filter(b => b.status === 'upcoming').length
  const totalBillAmount = bills.filter(b => b.status === 'upcoming').reduce((s, b) => s + b.amount, 0)

  const insights = useMemo(() => {
    const list: string[] = []
    if (upcomingBills > 0)
      list.push(`${upcomingBills} bill${upcomingBills > 1 ? 's' : ''} upcoming — ${fmt(totalBillAmount)} due.`)
    list.push("You haven't logged a workout today. Don't let the streak die.")
    list.push("Music: Check your release pipeline. Consistency is the whole game.")
    list.push("BizzyPlug: Any leads you haven't followed up on this week?")
    return list.slice(0, 3)
  }, [upcomingBills, totalBillAmount])

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #0F1A35 0%, #141B2D 100%)`,
        border: `1px solid ${BENTLEY_GOLD}25`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_GOLD}20` }}>
          <Sparkles size={14} style={{ color: BENTLEY_GOLD }} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>
          Bentley's Briefing
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: BENTLEY_GOLD }} />
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{insight}</p>
          </div>
        ))}
      </div>

      <Link href="/bentley">
        <motion.div
          whileTap={{ scale: 0.97 }}
          className="mt-4 flex items-center gap-2 text-xs font-semibold"
          style={{ color: BENTLEY_GOLD }}
        >
          Talk to Bentley <ArrowRight size={12} />
        </motion.div>
      </Link>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data, loading } = useOrcaData()
  const { user, income, bills, goals } = data

  const [syncReady, setSyncReady] = useState(0)
  useEffect(() => {
    const handler = () => setSyncReady(c => c + 1)
    window.addEventListener('orca-sync-ready', handler)
    return () => window.removeEventListener('orca-sync-ready', handler)
  }, [])

  // User display name
  const displayName = user?.name?.trim() || 'Boss'
  const { greeting, line } = getGreeting(displayName)

  // ── Checking balance ──
  const checkingBalance = useMemo(() => {
    if (user.checkingBalance && user.checkingBalance > 0) return user.checkingBalance
    try {
      const s = localStorage.getItem('orca-user-settings')
      if (s) { const p = JSON.parse(s); if (p.checkingBalance > 0) return p.checkingBalance }
    } catch {}
    return 0
  }, [user.checkingBalance, syncReady])

  // ── Bills summary ──
  const billsData = useMemo(() => {
    const upcoming = bills.filter(b => b.status === 'upcoming')
    const totalDue = upcoming.reduce((s, b) => s + b.amount, 0)
    const nextBill = upcoming.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0]
    return { upcoming, totalDue, nextBill }
  }, [bills])

  // ── Daily priorities ──
  const todayKey = new Date().toISOString().slice(0, 10)
  const [priorities, setPriorities] = useState<DailyPriority['items']>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`orca-priorities-${todayKey}`)
      if (saved) {
        setPriorities(JSON.parse(saved))
      } else {
        const defaults: DailyPriority['items'] = [
          { id: '1', text: 'Hit your calorie goal (3,200 cal)', area: 'fitness', completed: false, addedByBentley: true },
          { id: '2', text: 'Work on your top business task', area: 'business', completed: false, addedByBentley: true },
          { id: '3', text: 'Check music release pipeline', area: 'music', completed: false, addedByBentley: true },
        ]
        setPriorities(defaults)
      }
    } catch {}
  }, [todayKey])

  const togglePriority = useCallback((id: string) => {
    setPriorities(prev => {
      const next = prev.map(p => p.id === id ? { ...p, completed: !p.completed } : p)
      try { localStorage.setItem(`orca-priorities-${todayKey}`, JSON.stringify(next)) } catch {}
      return next
    })
  }, [todayKey])

  const prioritiesCompleted = priorities.filter(p => p.completed).length

  // ── Fitness data ──
  const fitnessData = useMemo(() => {
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const ml = localStorage.getItem('orca-meal-logs')
      const weightLogs: WeightLog[] = wl ? JSON.parse(wl) : []
      const mealLogs: MealLog[] = ml ? JSON.parse(ml) : []
      const latest = weightLogs.sort((a, b) => b.date.localeCompare(a.date))[0]
      const todayMeals = mealLogs.filter(m => m.date === todayKey)
      const todayCalories = todayMeals.reduce((s, m) => s + m.calories, 0)
      const todayProtein = todayMeals.reduce((s, m) => s + m.protein, 0)
      return {
        currentWeight: latest?.weight || 159,
        goalWeight: 200,
        todayCalories,
        todayProtein,
        calorieGoal: 3200,
        proteinGoal: 180,
      }
    } catch {
      return { currentWeight: 159, goalWeight: 200, todayCalories: 0, todayProtein: 0, calorieGoal: 3200, proteinGoal: 180 }
    }
  }, [todayKey, syncReady])

  // ── Music data ──
  const musicData = useMemo(() => {
    try {
      const saved = localStorage.getItem('orca-songs')
      const songs: Song[] = saved ? JSON.parse(saved) : []
      const readyToRelease = songs.filter(s => s.status === 'uploaded' || s.status === 'release-date-set').length
      const inPipeline = songs.filter(s => s.status !== 'released').length
      return { readyToRelease, inPipeline, total: songs.length }
    } catch {
      return { readyToRelease: 0, inPipeline: 0, total: 0 }
    }
  }, [syncReady])

  // ── Business data ──
  const businessData = useMemo(() => {
    try {
      const saved = localStorage.getItem('orca-businesses')
      const businesses: Business[] = saved ? JSON.parse(saved) : []
      const totalRevenue = businesses.reduce((s, b) => s + b.currentMonthRevenue, 0)
      const pendingTasks = businesses.reduce((s, b) => s + b.tasks.filter(t => t.status !== 'done').length, 0)
      return { totalRevenue, pendingTasks, count: businesses.length }
    } catch {
      return { totalRevenue: 0, pendingTasks: 0, count: 0 }
    }
  }, [syncReady])

  // ── DJ data ──
  const djData = useMemo(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      const gigs = saved ? JSON.parse(saved) : []
      const upcoming = gigs.filter((g: any) => g.status === 'confirmed' && g.date >= todayKey)
      return { upcoming: upcoming.length, nextGig: upcoming[0] || null }
    } catch {
      return { upcoming: 0, nextGig: null }
    }
  }, [syncReady, todayKey])

  // ── Lyft data ──
  const lyftData = useMemo(() => {
    try {
      const saved = localStorage.getItem('orca-lyft-sessions')
      const sessions = saved ? JSON.parse(saved) : []
      const monday = new Date()
      monday.setDate(monday.getDate() - monday.getDay() + 1)
      const weekStr = monday.toISOString().slice(0, 10)
      const thisWeek = sessions.filter((s: any) => s.date >= weekStr)
      const weekEarnings = thisWeek.reduce((sum: number, s: any) => sum + (s.earnings || 0), 0)
      return { weekEarnings, weekGoal: 400 }
    } catch {
      return { weekEarnings: 0, weekGoal: 400 }
    }
  }, [syncReady])

  // ── Upcoming events (today + next 3 days) ──
  const upcomingEvents = useMemo(() => {
    const events: { label: string; date: string; type: string; color: string }[] = []
    const today = new Date()
    bills
      .filter(b => b.status === 'upcoming')
      .slice(0, 2)
      .forEach(b => events.push({ label: b.name, date: b.due, type: 'bill', color: BENTLEY_RED }))
    if (djData.nextGig) {
      events.push({ label: `DJ: ${djData.nextGig.venue || 'Gig'}`, date: djData.nextGig.date, type: 'dj', color: '#EC4899' })
    }
    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
  }, [bills, djData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <RefreshCw size={24} style={{ color: BENTLEY_INDIGO }} />
        </motion.div>
      </div>
    )
  }

  const caloriesPct = Math.min((fitnessData.todayCalories / fitnessData.calorieGoal) * 100, 100)
  const weightPct = Math.min(((fitnessData.currentWeight - 159) / (fitnessData.goalWeight - 159)) * 100, 100)
  const lyftPct = Math.min((lyftData.weekEarnings / lyftData.weekGoal) * 100, 100)

  return (
    <div
      className="min-h-screen overflow-x-hidden pb-28"
      style={{ background: theme.bg, color: theme.text }}
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5"
      >
        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>
                ORCA · Command Center
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: theme.text }}>{greeting}</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.subtext }}>{line}</p>
          </div>
          <Link href="/bentley">
            <motion.div
              whileTap={{ scale: 0.93 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${BENTLEY_GOLD}22, ${BENTLEY_GOLD}10)`,
                border: `1px solid ${BENTLEY_GOLD}40`,
                color: BENTLEY_GOLD,
              }}
            >
              <MessageSquare size={13} />
              Bentley
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Today's Command ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: BENTLEY_INDIGO }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
                Today's Command
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO }}>
              {prioritiesCompleted}/{priorities.length} done
            </span>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${theme.border}` }}
          >
            {priorities.map((item, i) => (
              <div key={item.id} style={{ borderBottom: i < priorities.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                <PriorityItem item={item} onToggle={togglePriority} index={i} />
              </div>
            ))}
          </div>
          {prioritiesCompleted === priorities.length && priorities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-xs font-semibold py-2 rounded-xl"
              style={{ background: `${BENTLEY_GREEN}15`, color: BENTLEY_GREEN }}
            >
              All 3 done. That's what I'm talking about.
            </motion.div>
          )}
        </motion.div>

        {/* ── Bentley's Briefing ── */}
        <BentleyBriefing
          bills={bills}
          checkingBalance={checkingBalance}
          name={displayName}
        />

        {/* ── Life Metrics Grid ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
              Life Metrics
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Scale}
              label="Weight"
              value={`${fitnessData.currentWeight} lbs`}
              sub={`Goal: ${fitnessData.goalWeight} lbs`}
              color={BENTLEY_GREEN}
              href="/fitness"
            />
            <StatCard
              icon={Flame}
              label="Calories Today"
              value={`${fitnessData.todayCalories}`}
              sub={`/ ${fitnessData.calorieGoal} goal`}
              color={fitnessData.todayCalories < fitnessData.calorieGoal * 0.5 ? BENTLEY_RED : BENTLEY_GREEN}
              href="/fitness"
              alert={fitnessData.todayCalories < 800}
            />
            <StatCard
              icon={DollarSign}
              label="Safe to Spend"
              value={checkingBalance > 0 ? fmt(Math.max(0, checkingBalance - billsData.totalDue)) : '—'}
              sub={billsData.totalDue > 0 ? `${fmt(billsData.totalDue)} in bills` : 'No bills due'}
              color={BENTLEY_INDIGO}
              href="/bill-boss"
              alert={billsData.upcoming.length > 0}
            />
            <StatCard
              icon={Music}
              label="Music Pipeline"
              value={`${musicData.inPipeline}`}
              sub={`${musicData.readyToRelease} ready to release`}
              color="#A78BFA"
              href="/music"
              alert={musicData.readyToRelease > 0}
            />
            <StatCard
              icon={Briefcase}
              label="Business"
              value={businessData.totalRevenue > 0 ? fmt(businessData.totalRevenue) : `${businessData.pendingTasks} tasks`}
              sub={businessData.totalRevenue > 0 ? 'this month' : 'pending'}
              color={BENTLEY_GOLD}
              href="/business"
            />
            <StatCard
              icon={Mic2}
              label="DJ Gigs"
              value={`${djData.upcoming}`}
              sub={djData.nextGig ? `Next: ${new Date(djData.nextGig.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'None upcoming'}
              color="#EC4899"
              href="/dj"
              alert={djData.upcoming > 0}
            />
            <StatCard
              icon={Car}
              label="Lyft This Week"
              value={fmt(lyftData.weekEarnings)}
              sub={`/ ${fmt(lyftData.weekGoal)} goal`}
              color={lyftData.weekEarnings >= lyftData.weekGoal ? BENTLEY_GREEN : '#F97316'}
              href="/business"
            />
            <StatCard
              icon={ShoppingCart}
              label="Grocery"
              value="Tap to log"
              sub="Inventory tracker"
              color="#14B8A6"
              href="/grocery"
            />
          </div>
        </motion.div>

        {/* ── Upcoming Events ── */}
        {upcomingEvents.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: BENTLEY_INDIGO }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
                  Upcoming
                </span>
              </div>
              <Link href="/bill-boss">
                <span className="text-xs" style={{ color: BENTLEY_INDIGO }}>View all</span>
              </Link>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              {upcomingEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < upcomingEvents.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{ev.label}</p>
                  </div>
                  <p className="text-xs font-semibold shrink-0" style={{ color: ev.color }}>
                    {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Fitness Progress ── */}
        <motion.div variants={fadeUp}>
          <Link href="/fitness">
            <div
              className="rounded-2xl p-4"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Dumbbell size={14} style={{ color: BENTLEY_GREEN }} />
                  <span className="text-sm font-bold" style={{ color: theme.text }}>Fitness Progress</span>
                </div>
                <ChevronRight size={14} style={{ color: theme.subtext }} />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: theme.text }}>{fitnessData.currentWeight}</div>
                  <div className="text-xs" style={{ color: theme.subtext }}>Current lbs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: BENTLEY_GOLD }}>{fitnessData.goalWeight}</div>
                  <div className="text-xs" style={{ color: theme.subtext }}>Goal lbs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: BENTLEY_GREEN }}>{fitnessData.goalWeight - fitnessData.currentWeight}</div>
                  <div className="text-xs" style={{ color: theme.subtext }}>lbs to go</div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: theme.subtext }}>
                    <span>Weight Goal</span>
                    <span style={{ color: BENTLEY_GREEN }}>{weightPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${weightPct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: BENTLEY_GREEN }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: theme.subtext }}>
                    <span>Calories Today</span>
                    <span style={{ color: caloriesPct < 50 ? BENTLEY_RED : BENTLEY_GREEN }}>
                      {fitnessData.todayCalories} / {fitnessData.calorieGoal}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${caloriesPct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: caloriesPct < 50 ? BENTLEY_RED : BENTLEY_GREEN }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* ── Quick Action Row ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: BENTLEY_INDIGO }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
              Quick Actions
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Log Meal', icon: Coffee, href: '/fitness', color: BENTLEY_GREEN },
              { label: 'Log Weight', icon: Scale, href: '/fitness', color: BENTLEY_GOLD },
              { label: 'Music Task', icon: Music, href: '/music', color: '#A78BFA' },
              { label: 'Ask Bentley', icon: MessageSquare, href: '/bentley', color: BENTLEY_INDIGO },
            ].map(({ label, icon: Icon, href, color }) => (
              <Link key={label} href={href}>
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight" style={{ color: theme.subtext }}>{label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Financial Summary ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={14} style={{ color: BENTLEY_GREEN }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
                Money
              </span>
            </div>
            <Link href="/smart-stack">
              <span className="text-xs" style={{ color: BENTLEY_INDIGO }}>Details</span>
            </Link>
          </div>
          <div
            className="rounded-2xl p-4 grid grid-cols-3 gap-3"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div>
              <div className="text-xs mb-1" style={{ color: theme.subtext }}>Balance</div>
              <div className="text-base font-bold" style={{ color: theme.text }}>
                {checkingBalance > 0 ? fmt(checkingBalance) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: theme.subtext }}>Bills Due</div>
              <div className="text-base font-bold" style={{ color: billsData.totalDue > 0 ? BENTLEY_RED : BENTLEY_GREEN }}>
                {fmt(billsData.totalDue)}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: theme.subtext }}>Savings</div>
              <div className="text-base font-bold" style={{ color: BENTLEY_INDIGO }}>
                {fmt(goals.reduce((s, g) => s + g.current, 0))}
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
