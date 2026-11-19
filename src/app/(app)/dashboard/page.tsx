'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Loader2, DollarSign, TrendingUp, Wallet, Mic2, Palette, Flame, Calendar } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'
import type { WeightLog, MealLog, Bill, Subscription, WellsSettings, PlannerBlock, WorkoutDayPlan, WorkoutExerciseLog } from '@/lib/types'
import { getDefaultWellsSettings, getRequiredWellsBalance } from '@/lib/subscriptions'
import { getDefaultWeekdayTemplates, getBlocksForDate, getLifeTaskRemindersForDate } from '@/lib/planner'
import { getDefaultWorkoutPlan } from '@/lib/workouts'
import { MEAL_ORDER, MEAL_LABELS, PROTEIN_TARGET, getDailyTotals } from '@/lib/meals'
import { getDefaultGrocerySettings, type GrocerySettings } from '@/lib/grocery'
import {
  getDefaultLaundrySettings, getDefaultLiquorSettings, DAILY_BUDGET, getDailySpending,
  type LaundrySettings, type LiquorSettings, type SpendingEntry,
} from '@/lib/lifeTasks'
import {
  C, Card, CardHeader, Header, Alerts, Kpi, TodayCard, DashboardCalendar, DayDetail,
  HealthCard, BillsCard, TasksCard, BizzyPlugCard, GigsCard, IncomeCard,
  type AlertChip, type MonthIncome, type PriorityItem,
} from './widgets'

const CALORIE_TARGET = 3200
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getGreeting(name: string) {
  const h = new Date().getHours()
  const firstName = name?.split(' ')[0] || 'Boss'
  if (h < 6) return { greeting: `Working late, ${firstName}?`, line: "Respect the grind. Don't forget sleep is gains too." }
  if (h < 12) return { greeting: `Morning briefing, ${firstName}.`, line: "Stack the priorities early. The day isn't waiting." }
  if (h < 17) return { greeting: `Midday check-in, ${firstName}.`, line: "How's the execution? Intentions mean nothing without action." }
  return { greeting: `Evening report, ${firstName}.`, line: "What did you actually finish today? Let's review." }
}

function gid() { return Math.random().toString(36).slice(2, 10) }

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}

// BizzyPlug clients were occasionally stored double-encoded; unwrap once.
function asArray(v: any): any[] {
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return [] } }
  return Array.isArray(v) ? v : []
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data, loading } = useOrcaData()
  const { user, bills } = data

  // ISO timestamp when each alert type was last dismissed
  const [dismissedAt, setDismissedAt] = useState<Record<string, string>>(() => readJSON('orca-dismissed-notifs-ts', {}))

  const displayName = user?.name?.trim() || 'Boss'
  const { greeting, line } = getGreeting(displayName)

  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  // Priorities for every date (today included), keyed by YYYY-MM-DD. One store
  // feeds the Today card, the calendar dots, and the day view.
  const [allPriorities, setAllPriorities] = useState<Record<string, PriorityItem[]>>(() => ({
    [todayStr]: readJSON(`orca-priorities-${todayStr}`, []),
  }))

  const [gigs, setGigs] = useState<any[]>([])
  const [newQuoteCount, setNewQuoteCount] = useState(0)
  const [newTestimonialCount, setNewTestimonialCount] = useState(0)
  const [bizzyplugNotifications, setBizzyplugNotifications] = useState<any[]>([])
  const [todayCalories, setTodayCalories] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(159)
  const [checkingBalance, setCheckingBalance] = useState(0)
  const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean; priority: string; starred: boolean; category: string }[]>([])
  const [lyftSessions, setLyftSessions] = useState<any[]>([])
  const [bizzplugClientsList, setBizzplugClientsList] = useState<any[]>([])

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [wellsSettings, setWellsSettings] = useState<WellsSettings>(getDefaultWellsSettings())
  const [plannerTemplates, setPlannerTemplates] = useState<Record<number, PlannerBlock[]>>(getDefaultWeekdayTemplates())
  const [plannerOverrides, setPlannerOverrides] = useState<Record<string, PlannerBlock[]>>({})
  const [workoutPlan, setWorkoutPlan] = useState<Record<number, WorkoutDayPlan>>(getDefaultWorkoutPlan())
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutExerciseLog[]>([])
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [dailySpendingEntries, setDailySpendingEntries] = useState<SpendingEntry[]>([])
  const [grocerySettings, setGrocerySettings] = useState<GrocerySettings>(getDefaultGrocerySettings())
  const [laundrySettings, setLaundrySettings] = useState<LaundrySettings>(getDefaultLaundrySettings())
  const [liquorSettings, setLiquorSettings] = useState<LiquorSettings>(getDefaultLiquorSettings())

  useEffect(() => {
    setSubscriptions(readJSON('orca-subscriptions', []))
    setWellsSettings(readJSON('orca-wells-settings', getDefaultWellsSettings()))
    setPlannerTemplates(readJSON('orca-planner-templates', getDefaultWeekdayTemplates()))
    setPlannerOverrides(readJSON('orca-planner-overrides', {}))
    setWorkoutPlan(readJSON('orca-workout-plan', getDefaultWorkoutPlan()))
    setWorkoutLogs(readJSON('orca-workout-logs', []))
    setMealLogs(readJSON('orca-meal-logs', []))
    setDailySpendingEntries(readJSON('orca-daily-spending', []))
    setGrocerySettings(readJSON('orca-grocery-settings', getDefaultGrocerySettings()))
    setLaundrySettings(readJSON('orca-laundry-settings', getDefaultLaundrySettings()))
    setLiquorSettings(readJSON('orca-liquor-settings', getDefaultLiquorSettings()))
  }, [])

  // Re-read income sources when cloud sync merges new data
  useEffect(() => {
    const onSync = () => {
      const g = readJSON<any[] | null>('orca-dj-gigs', null)
      if (g) setGigs(g)
      const ls = readJSON<any[] | null>('orca-lyft-sessions', null)
      if (ls) setLyftSessions(ls)
      const biz = readJSON<any>('orca-bizzplug-clients', null)
      if (biz) setBizzplugClientsList(asArray(biz))
    }
    window.addEventListener('orca-sync-ready', onSync)
    return () => window.removeEventListener('orca-sync-ready', onSync)
  }, [])

  useEffect(() => {
    setGigs(readJSON('orca-dj-gigs', []))
    try {
      const logs: WeightLog[] = readJSON('orca-weight-logs', [])
      const latest = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latest) setCurrentWeight(latest.weight)
      const meals: MealLog[] = readJSON('orca-meal-logs', [])
      setTodayCalories(meals.filter(m => m.date === todayStr).reduce((s, m) => s + m.calories, 0))
    } catch {}
    const settings = readJSON<any>('orca-user-settings', {})
    if (settings?.checkingBalance > 0) setCheckingBalance(settings.checkingBalance)
    setLyftSessions(readJSON('orca-lyft-sessions', []))
    setBizzplugClientsList(asArray(readJSON('orca-bizzplug-clients', [])))
    setTasks(readJSON('orca-tasks', []))

    // BizzyPlug leads: fresh from Supabase, falling back to the local copy
    const loadBPLeads = (projectList: any[]) => {
      if (!Array.isArray(projectList)) return
      setBizzyplugNotifications(projectList.filter((p: any) =>
        p && p.status === 'new-lead' && p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 7 * 86400000))
      setBizzplugClientsList(projectList)
    }
    const fromLocal = () => loadBPLeads(asArray(readJSON('orca-bizzplug-clients', [])))
    fetch('/api/bizzyplug/projects').then(r => (r.ok ? r.json() : null)).then(d => {
      if (d?.projects?.length > 0) {
        loadBPLeads(d.projects)
        try { localStorage.setItem('orca-bizzplug-clients', JSON.stringify(d.projects)) } catch {}
      } else fromLocal()
    }).catch(fromLocal)

    fetch('/api/dj/bookings').then(r => (r.ok ? r.json() : null)).then(d => {
      if (d?.bookings) {
        setNewQuoteCount(d.bookings.filter((b: any) => b.status === 'pending' && !['__DJ_GIG__', '__DJ_BLOCK__', '__BIZZYPLUG__'].includes(b.client_name)).length)
      }
    }).catch(() => {})
    fetch('/api/dj/testimonials').then(r => (r.ok ? r.json() : null)).then(d => {
      if (d?.all) setNewTestimonialCount(d.all.filter((t: any) => t.created_at && Date.now() - new Date(t.created_at).getTime() < 7 * 86400000).length)
    }).catch(() => {})

    // Priorities: scan six months back and forward for calendar dots
    const loaded: Record<string, PriorityItem[]> = {}
    const now = new Date()
    for (let offset = -6; offset <= 6; offset++) {
      const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1)
      const days = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      for (let d = 1; d <= days; d++) {
        const ds = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        try { const saved = localStorage.getItem(`orca-priorities-${ds}`); if (saved) loaded[ds] = JSON.parse(saved) } catch {}
      }
    }
    setAllPriorities(loaded)
  }, [todayStr])

  // ── Priority edits (any date) ──
  const writePriorities = useCallback((date: string, fn: (items: PriorityItem[]) => PriorityItem[]) => {
    setAllPriorities(prev => {
      const items = fn(prev[date] || [])
      setLocalSynced(`orca-priorities-${date}`, JSON.stringify(items))
      return { ...prev, [date]: items }
    })
  }, [])
  const priorityHandlers = (date: string) => ({
    onAdd: (text: string) => writePriorities(date, items => [...items, { id: gid(), text, area: 'personal', completed: false, addedByBentley: false }]),
    onToggle: (id: string) => writePriorities(date, items => items.map(p => (p.id === id ? { ...p, completed: !p.completed } : p))),
    onDelete: (id: string) => writePriorities(date, items => items.filter(p => p.id !== id)),
  })

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  const monthKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`

  // ── Income for the viewed month (same formulas as before) ──
  const lyftNetIncome = useMemo(() => lyftSessions
    .filter((s: any) => s.date?.startsWith(monthKey))
    .reduce((sum: number, s: any) => sum + (s.earnings || 0) - (s.gasExpense || 0), 0), [lyftSessions, monthKey])

  const djEarnedIncome = useMemo(() => gigs
    .filter((g: any) => g.date?.startsWith(monthKey))
    .reduce((sum: number, g: any) => sum + (g.depositPaid ? (g.depositAmount || 0) : 0) + (g.partialPayments || []).reduce((sp: number, p: any) => sp + p.amount, 0), 0), [gigs, monthKey])

  const bizzplugEarnedIncome = useMemo(() => bizzplugClientsList
    .filter((c: any) => { const dt = c?.paidDate || c?.createdAt || ''; return dt.startsWith(monthKey) && (c.paid || 0) > 0 })
    .reduce((sum: number, c: any) => sum + (c.paid || 0), 0), [bizzplugClientsList, monthKey])

  // ── Six month income chart (gross Lyft, as before) ──
  const monthlyIncome = useMemo<MonthIncome[]>(() => {
    const out: MonthIncome[] = []
    const cm = new Date().getMonth()
    const cy = new Date().getFullYear()
    for (let i = 5; i >= 0; i--) {
      let m = cm - i
      let y = cy
      if (m < 0) { m += 12; y-- }
      const key = `${y}-${String(m + 1).padStart(2, '0')}`
      const lyft = lyftSessions.filter((s: any) => s.date?.startsWith(key)).reduce((s: number, x: any) => s + (x.earnings || 0), 0)
      const dj = gigs.filter((g: any) => g.date?.startsWith(key)).reduce((s: number, g: any) => s + (g.depositPaid ? (g.depositAmount || 0) : 0) + (g.partialPayments || []).reduce((sp: number, p: any) => sp + p.amount, 0), 0)
      const bizzplug = bizzplugClientsList.filter((c: any) => { const dt = c?.paidDate || c?.createdAt || ''; return dt.startsWith(key) && (c.paid || 0) > 0 }).reduce((s: number, c: any) => s + (c.paid || 0), 0)
      out.push({ month: MONTH_NAMES[m], year: y, lyft, dj, bizzplug, total: lyft + dj + bizzplug })
    }
    return out
  }, [lyftSessions, gigs, bizzplugClientsList])

  // Bills still owed in the viewed calendar month (recurrence + partial payments aware)
  const totalDue = useMemo(() => {
    const monthEnd = new Date(calYear, calMonth + 1, 0)
    let total = 0
    bills.forEach(b => {
      const rec = b.recurrence || 'one-time'
      const dueDate = new Date(b.due + 'T00:00:00')
      let appears = false
      if (rec === 'one-time') appears = dueDate.getMonth() === calMonth && dueDate.getFullYear() === calYear
      else if (rec === 'monthly') appears = dueDate <= monthEnd
      else if (rec === 'yearly') appears = dueDate.getMonth() === calMonth && calYear >= dueDate.getFullYear()
      if (!appears) return
      const cycleAllocs = rec !== 'one-time' && b.alloc.length > 0
        ? b.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === calMonth && ad.getFullYear() === calYear })
        : b.alloc
      const paid = cycleAllocs.filter(a => a.paid).reduce((s, a) => s + a.amount, 0)
      if (paid >= b.amount) return
      if (b.status === 'paid' && rec === 'one-time') return
      if (rec === 'monthly' && b.status === 'paid' && b.paidDate) {
        const pd = new Date(b.paidDate + 'T00:00:00')
        if (pd.getMonth() === calMonth && pd.getFullYear() === calYear) return
      }
      total += Math.max(0, b.amount - paid)
    })
    return total
  }, [bills, calMonth, calYear])

  const upcomingGigs = useMemo(() => {
    const monthEnd = `${monthKey}-${String(new Date(calYear, calMonth + 1, 0).getDate()).padStart(2, '0')}`
    return gigs
      .filter(g => g.date >= todayStr && g.date <= monthEnd && g.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2)
  }, [gigs, calMonth, calYear, monthKey, todayStr])

  // Next unpaid bills, rolled forward to their next cycle
  const upcomingBills = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const items: { bill: Bill; due: Date }[] = []
    bills.forEach(b => {
      const rec = b.recurrence || 'one-time'
      let due = new Date(b.due + 'T00:00:00')
      if (rec === 'one-time') {
        if (b.status === 'paid' || due < today) return
      } else {
        const stepDays = rec === 'weekly' ? 7 : rec === 'custom' ? Math.max(1, b.customRecurrenceDays || 30) : null
        let guard = 0
        while (due < today && guard < 60) {
          if (stepDays) due = new Date(due.getTime() + stepDays * 86400000)
          else if (rec === 'monthly') due = new Date(due.getFullYear(), due.getMonth() + 1, due.getDate())
          else if (rec === 'yearly') due = new Date(due.getFullYear() + 1, due.getMonth(), due.getDate())
          else break
          guard++
        }
        const cycleAllocs = b.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === due.getMonth() && ad.getFullYear() === due.getFullYear() })
        if (cycleAllocs.filter(a => a.paid).reduce((s, a) => s + a.amount, 0) >= b.amount) return
        if (b.status === 'paid' && b.paidDate) {
          const pd = new Date(b.paidDate + 'T00:00:00')
          if (pd.getMonth() === due.getMonth() && pd.getFullYear() === due.getFullYear()) return
        }
      }
      items.push({ bill: b, due })
    })
    return items.sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 5)
  }, [bills])

  const upcomingBillsOwed = useMemo(() => upcomingBills.reduce((s, { bill: b, due }) => {
    const cycleAllocs = (b.recurrence || 'one-time') !== 'one-time'
      ? b.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === due.getMonth() && ad.getFullYear() === due.getFullYear() })
      : b.alloc
    return s + Math.max(0, b.amount - cycleAllocs.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0))
  }, 0), [upcomingBills])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: C.indigo }} />
      </div>
    )
  }

  // ── Alerts ──
  const dismiss = (key: string) => {
    const next = { ...dismissedAt, [key]: new Date().toISOString() }
    setDismissedAt(next)
    try { localStorage.setItem('orca-dismissed-notifs-ts', JSON.stringify(next)) } catch {}
  }
  const latestLead = bizzyplugNotifications.reduce((l: string, n: any) => ((n.createdAt || '') > l ? n.createdAt || '' : l), '')
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const alerts: AlertChip[] = [
    ...(bizzyplugNotifications.length > 0 && (!dismissedAt.bp || latestLead > dismissedAt.bp)
      ? [{ key: 'bp', label: plural(bizzyplugNotifications.length, 'new BizzyPlug lead'), sub: 'View in Projects', href: '/bizzplug', color: C.purple, icon: Palette }] : []),
    ...(newQuoteCount > 0 && !dismissedAt.quotes
      ? [{ key: 'quotes', label: plural(newQuoteCount, 'new DJ quote'), sub: 'Review in DJ Maskoff', href: '/dj', color: C.pink, icon: Mic2 }] : []),
    ...(newTestimonialCount > 0 && !dismissedAt.reviews
      ? [{ key: 'reviews', label: plural(newTestimonialCount, 'new review'), sub: 'See the Website tab', href: '/dj', color: C.gold, icon: Flame }] : []),
  ]

  // ── Today ──
  const todayWeekday = new Date(todayStr + 'T00:00:00').getDay()
  const todayWorkout = workoutPlan[todayWeekday] || { title: 'Rest Day', exercises: [] }
  const loggedIds = workoutLogs.filter(l => l.date === todayStr).map(l => l.exerciseId)
  const mealTotals = getDailyTotals(mealLogs, todayStr)
  const dailySpent = getDailySpending(dailySpendingEntries, todayStr)
  const dailyRemaining = DAILY_BUDGET - dailySpent
  const income = lyftNetIncome + djEarnedIncome + bizzplugEarnedIncome
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long' })
  const isCurrentMonth = calMonth === new Date().getMonth() && calYear === new Date().getFullYear()

  return (
    <div className="min-h-screen pb-16 lg:pb-8" style={{ background: theme.bg, color: theme.text }}>
      <div className="mx-auto max-w-[1440px] px-4 pt-5 md:px-6 lg:px-8 lg:pt-8 space-y-5 md:space-y-6">
        <Header greeting={greeting} line={line} todayStr={todayStr} />
        <Alerts alerts={alerts} onDismiss={dismiss} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi label={`Bills due · ${monthLabel}`} value={fmt(totalDue)} sub="Still owed this month" color={C.red} href="/bill-boss" icon={DollarSign} />
          <Kpi
            label={`Income · ${monthLabel}`}
            value={income > 0 ? fmt(income) : checkingBalance > 0 ? fmt(checkingBalance) : '$0.00'}
            sub={income > 0 ? 'Lyft net, DJ, BizzyPlug' : checkingBalance > 0 ? 'Checking balance' : 'Nothing logged yet'}
            color={C.green}
            href="/smart-stack"
            icon={TrendingUp}
          />
          <Kpi label="Spent today" value={fmt(dailySpent)} sub={`${fmt(dailyRemaining)} left of ${fmt(DAILY_BUDGET)}`} color={dailyRemaining < 0 ? C.red : C.gold} href="/planner" icon={Wallet} />
          <Kpi label={isCurrentMonth ? 'Gigs this month' : `Gigs · ${monthLabel}`} value={String(upcomingGigs.length)} sub={upcomingGigs[0] ? `Next: ${upcomingGigs[0].venue || upcomingGigs[0].clientName || 'Gig'}` : 'None booked'} color={C.pink} href="/dj" icon={Mic2} />
        </div>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-12 items-start">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-5 md:space-y-6 min-w-0">
            <TodayCard
              priorities={allPriorities[todayStr] || []}
              {...priorityHandlers(todayStr)}
              schedule={getBlocksForDate(todayStr, plannerTemplates, plannerOverrides)}
              lifeTasks={getLifeTaskRemindersForDate(todayStr, laundrySettings, liquorSettings, grocerySettings.reUpDay)}
            />

            <Card>
              <CardHeader icon={Calendar} title="Command Calendar" accent={C.indigo} />
              <div className="grid xl:grid-cols-[1fr_320px] border-t" style={{ borderColor: theme.border }}>
                <DashboardCalendar
                  bills={bills}
                  gigs={gigs}
                  priorities={allPriorities}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  month={calMonth}
                  year={calYear}
                  onMonthChange={handleMonthChange}
                />
                <div className="border-t xl:border-t-0 xl:border-l" style={{ borderColor: theme.border }}>
                  <DayDetail
                    date={selectedDate}
                    todayStr={todayStr}
                    bills={bills}
                    gigs={gigs}
                    priorities={allPriorities[selectedDate] || []}
                    {...priorityHandlers(selectedDate)}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Side rail: two columns on tablet, one on desktop */}
          <div className="lg:col-span-4 grid md:grid-cols-2 lg:grid-cols-1 gap-5 md:gap-6 min-w-0">
            <HealthCard
              workoutTitle={todayWorkout.title}
              workoutLogged={todayWorkout.exercises.filter(e => loggedIds.includes(e.id)).length}
              workoutTotal={todayWorkout.exercises.length}
              meals={MEAL_ORDER.map(m => ({ label: MEAL_LABELS[m], logged: mealLogs.some(l => l.date === todayStr && l.meal === m) }))}
              protein={mealTotals.protein}
              proteinTarget={PROTEIN_TARGET}
              calories={todayCalories}
              calorieTarget={CALORIE_TARGET}
              weight={currentWeight}
            />
            <BillsCard upcoming={upcomingBills} todayStr={todayStr} dueSoonTotal={upcomingBillsOwed} wellsRequired={getRequiredWellsBalance(subscriptions, wellsSettings)} />
            <TasksCard tasks={tasks} />
            <BizzyPlugCard leads={bizzplugClientsList.filter((p: any) => p.status === 'new-lead')} earnedThisMonth={bizzplugEarnedIncome} />
            <GigsCard gigs={upcomingGigs} />
            <IncomeCard months={monthlyIncome} />
          </div>
        </div>
      </div>
    </div>
  )
}
