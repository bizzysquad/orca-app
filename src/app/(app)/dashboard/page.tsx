'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { billsOwedInMonth, cycleRemaining, getBillEffectiveStatus } from '@/lib/billStatus'
import { countedLyft } from '@/lib/lyft'
import { Loader2, Disc3, PenTool, Star, SlidersHorizontal } from 'lucide-react'
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
  Alerts, KpiStrip, CashflowCard, IncomeMixCard, BusinessesCard, TodayCard, CalendarCard,
  HealthCard, BillsCard, TasksCard, BizzyPlugCard, GigsCard,
  type AlertChip, type MonthIncome, type PriorityItem, type KpiDef, type BusinessRow,
} from './widgets'
import { useLayoutPrefs, prefOps, FOCUS_META, type FocusId, type WidgetId } from '@/lib/layoutPrefs'
import { Segmented, openCustomize } from '@/components/layout/CustomizePanel'

const CALORIE_TARGET = 3200
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getGreeting(name: string) {
  const h = new Date().getHours()
  const firstName = name?.split(' ')[0] || 'Boss'
  if (h < 5) return `Working late, ${firstName}`
  if (h < 12) return `Good morning, ${firstName}`
  if (h < 17) return `Good afternoon, ${firstName}`
  return `Good evening, ${firstName}`
}

// Grid packing. Each widget has a preferred width in columns of the 3 column
// desktop grid. Rows are packed in the user's order and the last widget in a
// row stretches to fill any gap, so every order lays out without holes.
const WIDGET_SPAN: Record<WidgetId, 1 | 2 | 3> = {
  kpis: 3, alerts: 3, calendar: 3,
  cashflow: 2, businesses: 2, today: 2, pipeline: 2,
  incomeMix: 1, bills: 1, tasks: 1, health: 1, gigs: 1,
}
function pack(ids: WidgetId[], cols: number): number[] {
  const spans: number[] = []
  let used = 0
  ids.forEach((id, i) => {
    const want = Math.min(WIDGET_SPAN[id], cols)
    if (used + want > cols) { spans[i - 1] += cols - used; used = 0 }
    spans.push(want)
    used = (used + want) % cols
  })
  if (used > 0 && spans.length) spans[spans.length - 1] += cols - used
  return spans
}
const MD_SPAN = ['', 'md:col-span-1', 'md:col-span-2']
const LG_SPAN = ['', 'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3']

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
  const greeting = getGreeting(displayName)
  const { prefs, ready, update } = useLayoutPrefs()

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
  const lyftCounted = useMemo(() => countedLyft(lyftSessions), [lyftSessions])
  const lyftNetIncome = useMemo(() => lyftCounted
    .filter((s: any) => s.date?.startsWith(monthKey))
    .reduce((sum: number, s: any) => sum + (s.earnings || 0) - (s.gasExpense || 0), 0), [lyftCounted, monthKey])

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
      const lyft = lyftCounted.filter((s: any) => s.date?.startsWith(key)).reduce((s: number, x: any) => s + (x.earnings || 0), 0)
      const dj = gigs.filter((g: any) => g.date?.startsWith(key)).reduce((s: number, g: any) => s + (g.depositPaid ? (g.depositAmount || 0) : 0) + (g.partialPayments || []).reduce((sp: number, p: any) => sp + p.amount, 0), 0)
      const bizzplug = bizzplugClientsList.filter((c: any) => { const dt = c?.paidDate || c?.createdAt || ''; return dt.startsWith(key) && (c.paid || 0) > 0 }).reduce((s: number, c: any) => s + (c.paid || 0), 0)
      out.push({ month: MONTH_NAMES[m], year: y, lyft, dj, bizzplug, total: lyft + dj + bizzplug })
    }
    return out
  }, [lyftCounted, gigs, bizzplugClientsList])

  // Bills still owed in the viewed month: the same number Bill Boss shows.
  const totalDue = useMemo(() => billsOwedInMonth(bills, calMonth, calYear), [bills, calMonth, calYear])

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
        if (getBillEffectiveStatus(b, due.getMonth(), due.getFullYear()) === 'paid') return
      }
      items.push({ bill: b, due })
    })
    return items.sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 5)
  }, [bills])

  const upcomingBillsOwed = useMemo(() => upcomingBills.reduce((s, { bill: b, due }) => s + cycleRemaining(b, due.getMonth(), due.getFullYear()), 0), [upcomingBills])

  if (loading || !ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={22} className="animate-spin" style={{ color: theme.subtext }} />
      </div>
    )
  }

  // ── Inbox ──
  const dismiss = (key: string) => {
    const next = { ...dismissedAt, [key]: new Date().toISOString() }
    setDismissedAt(next)
    try { localStorage.setItem('orca-dismissed-notifs-ts', JSON.stringify(next)) } catch {}
  }
  const latestLead = bizzyplugNotifications.reduce((l: string, n: any) => ((n.createdAt || '') > l ? n.createdAt || '' : l), '')
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const alerts: AlertChip[] = [
    ...(bizzyplugNotifications.length > 0 && (!dismissedAt.bp || latestLead > dismissedAt.bp)
      ? [{ key: 'bp', label: plural(bizzyplugNotifications.length, 'new BizzyPlug lead'), sub: 'View in Projects', href: '/bizzplug', icon: PenTool }] : []),
    ...(newQuoteCount > 0 && !dismissedAt.quotes
      ? [{ key: 'quotes', label: plural(newQuoteCount, 'new DJ quote'), sub: 'Review in DJ Maskoff', href: '/dj', icon: Disc3 }] : []),
    ...(newTestimonialCount > 0 && !dismissedAt.reviews
      ? [{ key: 'reviews', label: plural(newTestimonialCount, 'new review'), sub: 'DJ Maskoff, Settings, Website', href: '/dj', icon: Star }] : []),
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
  const monthShort = MONTH_NAMES[calMonth]
  const isCurrentMonth = calMonth === new Date().getMonth() && calYear === new Date().getFullYear()
  const incomeShown = income > 0 ? income : checkingBalance
  const net = income - totalDue

  // ── Focus + widgets ──
  const focus = prefs.focus
  const visible = prefs.widgets[focus].filter(w => w.visible).map(w => w.id)

  const kpis: KpiDef[] = [
    {
      label: `Income · ${monthShort}`,
      value: incomeShown > 0 ? fmt(incomeShown) : '$0.00',
      sub: income > 0 ? 'Lyft net, DJ, BizzyPlug' : checkingBalance > 0 ? 'Checking balance' : 'Nothing logged yet',
      href: '/smart-stack', tone: income > 0 ? 'ok' : null,
    },
    { label: `Bills owed · ${monthShort}`, value: fmt(totalDue), sub: totalDue > 0 ? 'Still owed this month' : 'All paid', href: '/bill-boss', tone: totalDue > 0 ? 'bad' : 'ok' },
    { label: `Net · ${monthShort}`, value: `${net < 0 ? '-' : ''}${fmt(Math.abs(net))}`, sub: 'Income minus bills still owed', href: '/smart-stack', tone: net >= 0 ? 'ok' : 'bad' },
    {
      label: 'Spent today', value: fmt(dailySpent),
      sub: dailyRemaining >= 0 ? `${fmt(dailyRemaining)} left of ${fmt(DAILY_BUDGET)}` : `${fmt(-dailyRemaining)} over budget`,
      href: '/planner',
      progress: { pct: (dailySpent / DAILY_BUDGET) * 100, tone: dailyRemaining < 0 ? 'bad' : dailySpent / DAILY_BUDGET > 0.8 ? 'warn' : 'ok' },
    },
  ]

  const openLeads = bizzplugClientsList.filter((p: any) => p.status === 'new-lead')
  const pendingValue = openLeads.reduce((s: number, p: any) => s + (p.quote || 0), 0)
  const lyftCount = lyftCounted.filter((s: any) => s.date?.startsWith(monthKey)).length
  const nextGig = upcomingGigs[0]
  const businesses: BusinessRow[] = [
    {
      id: 'dj', name: 'DJ Maskoff', href: '/dj', attention: newQuoteCount > 0,
      status: newQuoteCount > 0 ? `${plural(newQuoteCount, 'quote')} waiting`
        : nextGig ? `Next gig ${new Date(nextGig.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${nextGig.venue || nextGig.clientName || 'Gig'}`
        : `No more gigs booked in ${monthLabel}`,
      metric: fmt(djEarnedIncome),
    },
    {
      id: 'bizzplug', name: 'BizzyPlug', href: '/bizzplug', attention: bizzyplugNotifications.length > 0,
      status: openLeads.length ? `${plural(openLeads.length, 'open project')} · ${fmt(pendingValue)} pending` : 'No open projects',
      metric: fmt(bizzplugEarnedIncome),
    },
    { id: 'lyft', name: 'Lyft', href: '/business', status: lyftCount ? `${plural(lyftCount, 'session')} in ${monthLabel}, net of gas` : `No sessions in ${monthLabel}`, metric: fmt(lyftNetIncome) },
    { id: 'crookedrumor', name: 'Crooked Rumor', href: '/crookedrumor/admin', status: 'Bookings, clients and site' },
    { id: 'rsvp', name: 'RSVP', href: '/RSVP/admin', status: 'Events, guests and check in' },
  ]

  const render: Record<WidgetId, () => React.ReactNode> = {
    kpis: () => <KpiStrip items={kpis} />,
    alerts: () => <Alerts alerts={alerts} onDismiss={dismiss} />,
    cashflow: () => <CashflowCard months={monthlyIncome} />,
    incomeMix: () => <IncomeMixCard monthLabel={monthLabel} values={{ lyft: lyftNetIncome, dj: djEarnedIncome, bizzplug: bizzplugEarnedIncome }} />,
    bills: () => <BillsCard upcoming={upcomingBills} todayStr={todayStr} dueSoonTotal={upcomingBillsOwed} wellsRequired={getRequiredWellsBalance(subscriptions, wellsSettings)} />,
    businesses: () => <BusinessesCard rows={businesses} />,
    pipeline: () => <BizzyPlugCard leads={openLeads} earnedThisMonth={bizzplugEarnedIncome} />,
    gigs: () => <GigsCard gigs={upcomingGigs} />,
    today: () => (
      <TodayCard
        priorities={allPriorities[todayStr] || []}
        {...priorityHandlers(todayStr)}
        schedule={getBlocksForDate(todayStr, plannerTemplates, plannerOverrides)}
        lifeTasks={getLifeTaskRemindersForDate(todayStr, laundrySettings, liquorSettings, grocerySettings.reUpDay)}
      />
    ),
    calendar: () => (
      <CalendarCard
        bills={bills}
        gigs={gigs}
        priorities={allPriorities}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        month={calMonth}
        year={calYear}
        onMonthChange={handleMonthChange}
        todayStr={todayStr}
        dayProps={{ priorities: allPriorities[selectedDate] || [], ...priorityHandlers(selectedDate), todayShownElsewhere: visible.includes('today') }}
      />
    ),
    health: () => (
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
    ),
    tasks: () => <TasksCard tasks={tasks} />,
  }

  // The inbox renders nothing when empty; leave it out of the packing so it never holds a gap.
  const shown = visible.filter(id => id !== 'alerts' || alerts.length > 0)
  const mdSpans = pack(shown, 2)
  const lgSpans = pack(shown, 3)

  const when = isCurrentMonth ? 'this month' : `in ${monthLabel}`
  const summary = income > 0
    ? `${fmt(income)} in and ${totalDue > 0 ? `${fmt(totalDue)} still owed` : 'every bill covered'} ${when}.`
    : totalDue > 0 ? `${fmt(totalDue)} in bills still owed ${when}.` : `Every bill is covered ${when}.`

  return (
    <div className="min-h-screen pb-16 lg:pb-10" style={{ background: theme.bg, color: theme.text }}>
      <div className="mx-auto max-w-[1360px] px-4 pt-6 md:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-[13px]" style={{ color: theme.subtext }}>
              {new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight leading-tight mt-0.5" style={{ color: theme.text }}>{greeting}</h1>
            <p className="text-[13.5px] mt-1" style={{ color: theme.subtext }}>{summary}</p>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 flex-1 md:flex-none overflow-x-auto no-scrollbar">
              <Segmented
                value={focus}
                onChange={v => update(prefOps.setFocus(v as FocusId))}
                options={(Object.keys(FOCUS_META) as FocusId[]).map(f => ({ value: f, label: FOCUS_META[f].name }))}
              />
            </div>
            <button
              onClick={() => openCustomize('dashboard')}
              className="h-9 px-3 rounded-lg inline-flex items-center gap-2 text-[13px] font-medium shrink-0"
              style={{ border: `1px solid ${theme.border}`, color: theme.text, backgroundColor: theme.card }}
              aria-label="Customize dashboard"
            >
              <SlidersHorizontal size={14} /> <span className="hidden sm:inline">Customize</span>
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ border: `1px dashed ${theme.border}` }}>
            <p className="text-[14px] font-medium" style={{ color: theme.text }}>Nothing on this focus yet</p>
            <p className="text-[13px] mt-1 mb-4" style={{ color: theme.subtext }}>Pick the widgets you want to see.</p>
            <button onClick={() => openCustomize('dashboard')} className="h-9 px-4 rounded-lg text-[13px] font-medium" style={{ backgroundColor: theme.accent, color: theme.bg }}>Add widgets</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {shown.map((id, i) => (
              <div key={id} className={`min-w-0 [&>section]:h-full ${MD_SPAN[mdSpans[i]]} ${LG_SPAN[lgSpans[i]]}`}>
                {render[id]()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
