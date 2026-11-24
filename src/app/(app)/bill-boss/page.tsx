'use client'

import { useMemo, useState, useEffect } from 'react'
import { Trash2, Check, AlertCircle, X, ChevronLeft, ChevronRight, Edit3, Home, Car, CreditCard, Heart, Utensils, BookOpen, Zap, Plus, Scissors, Copy, Undo2 } from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, gid } from '@/lib/utils'
import { getRecurringBillDates } from '@/lib/income-engine'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'
import {
  SUBSCRIPTION_CATEGORIES,
  getMonthlyEquivalent,
  getRecurringSubscriptionDates,
  getUpcomingCharges,
  getRequiredWellsBalance,
  getAmountNeededThisWeek,
  getAmountNeededBeforeNextCharge,
  getRecommendedBuffer,
  getDefaultWellsSettings,
} from '@/lib/subscriptions'

import type { Bill, BillAlloc, BillRecurrence, RecurrenceEndType, Subscription, WellsSettings, SubscriptionFrequency, SubscriptionStatus } from '@/lib/types'
import { orcaEvents } from '@/lib/eventBus'
import {
  PageShell, PageHeader, Panel, PanelTitle, Stat, MiniStat, Bar, Button, IconButton, MonthSwitcher,
  RowMenu, Disclosure, EmptyState, useField, Field, Choice, Sheet, localISO,
} from '@/components/ui/kit'
import { Segmented } from '@/components/layout/CustomizePanel'
import {
  getBillEffectiveStatus, isBillOccurrenceActive, isBillVisibleInCycle, monthlyOccurrenceIndex, yearlyOccurrenceIndex,
  cycleRemaining, unpaidBillsInMonth, billsOwedInMonth, cycleDueDate, markBillPaid, localDate,
} from '@/lib/billStatus'

// ── Progressive form step type ──
type FormStep = 1 | 2 | 3


// Category to icon mapping with Figma colors
const CATEGORY_ICONS: Record<string, { Icon: React.ComponentType<any>, color: string }> = {
  'Housing': { Icon: Home, color: '#6366F1' },
  'Transportation': { Icon: Car, color: '#F59E0B' },
  'Insurance': { Icon: AlertCircle, color: '#EC4899' },
  'Utilities': { Icon: Zap, color: '#8B5CF6' },
  'Entertainment': { Icon: Heart, color: '#EC4899' },
  'Health': { Icon: Heart, color: '#10B981' },
  'Food': { Icon: Utensils, color: '#F59E0B' },
  'Education': { Icon: BookOpen, color: '#3B82F6' },
  'Debt': { Icon: CreditCard, color: '#EF4444' },
  'Other': { Icon: AlertCircle, color: '#6B7280' },
}

const CATEGORIES = [
  'Housing',
  'Transportation',
  'Insurance',
  'Utilities',
  'Entertainment',
  'Health',
  'Food',
  'Education',
  'Debt',
  'Other',
]


function BillCalendar({ bills, month, year, onMonthChange, onDayClick, selectedDay, theme }: {
  bills: Bill[]
  month: number
  year: number
  onMonthChange: (dir: number) => void
  onDayClick?: (day: number) => void
  selectedDay?: number | null
  theme: any
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = new Date()
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Compute whether a bill is effectively paid for a specific calendar month/year.
  // Mirrors the getBillEffectiveStatus logic used in the bill list.
  const isBillPaidForMonth = (b: Bill, m: number, y: number): boolean => {
    // For recurring bills, only count alloc entries that belong to this specific cycle
    const rec = b.recurrence || 'one-time'
    const cycleAllocs = (rec !== 'one-time' && b.alloc.length > 0)
      ? b.alloc.filter(a => {
          const ad = new Date(a.date + 'T00:00:00')
          return ad.getMonth() === m && ad.getFullYear() === y
        })
      : b.alloc
    const totalAllocPaid = cycleAllocs.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0)
    if (cycleAllocs.length > 0 && totalAllocPaid >= b.amount) return true

    if (b.status !== 'paid') return false
    if (!b.paidDate) return true // legacy: no paidDate, treat as paid

    const pd = new Date(b.paidDate + 'T00:00:00')
    const recurrence = b.recurrence || 'one-time'

    if (recurrence === 'one-time') return true
    if (recurrence === 'monthly') return pd.getMonth() === m && pd.getFullYear() === y
    if (recurrence === 'yearly') return pd.getFullYear() === y
    if (recurrence === 'weekly' || recurrence === 'custom') {
      const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
      const now = new Date(); now.setHours(0, 0, 0, 0)
      return Math.floor((now.getTime() - pd.getTime()) / 86400000) < intervalDays
    }
    return false
  }

  // Compute partial payment info for a bill scoped to the currently viewed calendar month.
  // For recurring bills, only alloc entries from the current billing cycle are counted.
  const getBillAllocInfo = (b: Bill) => {
    const rec = b.recurrence || 'one-time'
    const cycleAllocs = (rec !== 'one-time' && b.alloc.length > 0)
      ? b.alloc.filter(a => {
          const ad = new Date(a.date + 'T00:00:00')
          return ad.getMonth() === month && ad.getFullYear() === year
        })
      : b.alloc
    const totalPaid = cycleAllocs.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0)
    const remaining = Math.max(0, b.amount - totalPaid)
    return { totalPaid, remaining, isPartial: totalPaid > 0 && remaining > 0 }
  }

  // Get all bill events for a calendar day. Rewritten to:
  // - Always show monthly/yearly recurring bills on their due day (regardless of alloc state)
  // - Use cycle-aware paid status (paid this month ≠ paid every month)
  // - Deduplicate by case-insensitive name+type (prevents showing the same bill twice)
  const getEventsForDay = (day: number) => {
    const raw: { label: string; amount: number; type: 'bill' | 'split'; paid: boolean }[] = []

    bills.forEach(b => {
      const recurrence = b.recurrence || 'one-time'
      const dueDate = new Date(b.due + 'T00:00:00')
      const effectivePaid = isBillPaidForMonth(b, month, year)

      // Partial payment info
      const { totalPaid: allocPaid, remaining } = getBillAllocInfo(b)
      const displayAmount = allocPaid > 0 ? Math.max(remaining, b.amount) : b.amount

      // Determine if this bill lands on this specific day in the viewed month
      let showOnThisDay = false

      if (recurrence === 'one-time') {
        showOnThisDay = dueDate.getDate() === day && dueDate.getMonth() === month && dueDate.getFullYear() === year
      } else if (recurrence === 'monthly') {
        if (dueDate.getDate() === day) {
          const candidate = new Date(year, month, day)
          showOnThisDay = isBillOccurrenceActive(b, candidate, monthlyOccurrenceIndex(dueDate, year, month))
        }
      } else if (recurrence === 'yearly') {
        if (dueDate.getDate() === day && dueDate.getMonth() === month) {
          const candidate = new Date(year, month, day)
          showOnThisDay = isBillOccurrenceActive(b, candidate, yearlyOccurrenceIndex(dueDate, year))
        }
      } else {
        // Weekly / custom — check if any occurrence in this month lands on this day
        const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0)
        const cursor = new Date(dueDate)
        let occurrenceIndex = 0
        if (cursor < monthStart) {
          const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
          cursor.setDate(cursor.getDate() + gap)
          occurrenceIndex = Math.round(gap / intervalDays)
        }
        while (cursor <= monthEnd) {
          if (cursor >= dueDate && cursor.getDate() === day && cursor.getMonth() === month && cursor.getFullYear() === year && isBillOccurrenceActive(b, cursor, occurrenceIndex)) {
            showOnThisDay = true
            break
          }
          cursor.setDate(cursor.getDate() + intervalDays)
          occurrenceIndex++
        }
      }

      if (showOnThisDay) {
        raw.push({ label: b.name, amount: displayAmount, type: 'bill', paid: effectivePaid })
      }

      // Alloc / split payment entries — shown on their specific date
      b.alloc.forEach(a => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getDate() === day && ad.getMonth() === month && ad.getFullYear() === year) {
          raw.push({ label: `${b.name} (partial)`, amount: a.amount, type: 'split', paid: a.paid })
        }
      })
    })

    // Deduplicate: case-insensitive name + type — prefer the paid=true entry
    const seen = new Map<string, typeof raw[0]>()
    raw.forEach(ev => {
      const key = `${ev.label.toLowerCase().trim()}-${ev.type}`
      const existing = seen.get(key)
      if (!existing || (!existing.paid && ev.paid)) {
        seen.set(key, ev)
      }
    })
    return Array.from(seen.values())
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d)
    const isToday = d === todayDay
    const isSelected = selectedDay === d
    cells.push(
      <button
        key={d}
        onClick={() => onDayClick?.(isSelected ? 0 : d)}
        className="flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg min-h-[46px] md:min-h-[54px] transition-colors"
        style={{ backgroundColor: isSelected ? `${theme.text}14` : 'transparent' }}
        aria-label={`${monthName.split(' ')[0]} ${d}${dayEvents.length ? `, ${dayEvents.length} payments` : ''}`}
        aria-pressed={isSelected}
      >
        <span
          className="text-xs tnum w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            color: isToday ? theme.accent : dayEvents.length ? theme.text : theme.subtext,
            fontWeight: isToday || isSelected ? 700 : 500,
            boxShadow: isToday ? `inset 0 0 0 1.5px ${theme.accent}` : undefined,
          }}
        >{d}</span>
        {dayEvents.length > 0 && (
          <div className="flex gap-[3px] mt-1">
            {dayEvents.slice(0, 3).map((ev, i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: ev.paid ? theme.ok : ev.type === 'split' ? theme.warn : theme.bad }} />
            ))}
          </div>
        )}
      </button>
    )
  }

  const selectedEvents = selectedDay && selectedDay > 0 ? getEventsForDay(selectedDay) : []

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[13.5px]" style={{ color: theme.text }}>{monthName}</h3>
        <div className="flex">
          <button onClick={() => onMonthChange(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button onClick={() => onMonthChange(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10.5px] font-medium py-1" style={{ color: theme.subtext }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
      <div className="flex gap-4 mt-3 pt-3 flex-wrap" style={{ borderTop: `1px solid ${theme.border}` }}>
        {[{ c: theme.bad, l: 'Unpaid' }, { c: theme.warn, l: 'Split' }, { c: theme.ok, l: 'Paid' }].map(x => (
          <div key={x.l} className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: x.c }} />
            <span className="text-[11px]" style={{ color: theme.subtext }}>{x.l}</span>
          </div>
        ))}
      </div>

      {selectedDay && selectedDay > 0 ? (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: theme.text }}>
            {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedEvents.length > 0 ? (
            <ul>
              {selectedEvents.map((ev, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: ev.paid ? theme.ok : ev.type === 'split' ? theme.warn : theme.bad }} />
                    <span className="text-[13px] truncate" style={{ color: theme.text }}>{ev.label}</span>
                  </span>
                  <span className="text-[13px] font-medium tnum shrink-0" style={{ color: ev.paid ? theme.ok : theme.text }}>{ev.paid ? 'Paid · ' : ''}{fmt(ev.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: theme.subtext }}>No bills due this day.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function SubscriptionCalendar({ subscriptions, month, year, onMonthChange, onDayClick, selectedDay, theme }: {
  subscriptions: Subscription[]
  month: number
  year: number
  onMonthChange: (dir: number) => void
  onDayClick?: (day: number) => void
  selectedDay?: number | null
  theme: any
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = new Date()
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const today = new Date()
  const monthDiff = (year - today.getFullYear()) * 12 + (month - today.getMonth())
  const monthsAhead = Math.max(3, monthDiff + 3)

  const eventsByDay = useMemo(() => {
    const map = new Map<number, { name: string; amount: number; category: string }[]>()
    subscriptions.filter(s => s.status === 'active').forEach(sub => {
      getRecurringSubscriptionDates(sub, monthsAhead).forEach(dateStr => {
        const d = new Date(dateStr + 'T00:00:00')
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate()
          const list = map.get(day) || []
          list.push({ name: sub.name, amount: sub.price, category: sub.category })
          map.set(day, list)
        }
      })
    })
    return map
  }, [subscriptions, month, year, monthsAhead])

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = eventsByDay.get(d) || []
    const isToday = d === todayDay
    const isSelected = selectedDay === d
    cells.push(
      <button
        key={d}
        onClick={() => onDayClick?.(isSelected ? 0 : d)}
        className="flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg min-h-[46px] md:min-h-[54px] transition-colors"
        style={{ backgroundColor: isSelected ? `${theme.text}14` : 'transparent' }}
        aria-label={`${monthName.split(' ')[0]} ${d}${dayEvents.length ? `, ${dayEvents.length} charges` : ''}`}
        aria-pressed={isSelected}
      >
        <span
          className="text-xs tnum w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            color: isToday ? theme.accent : dayEvents.length ? theme.text : theme.subtext,
            fontWeight: isToday || isSelected ? 700 : 500,
            boxShadow: isToday ? `inset 0 0 0 1.5px ${theme.accent}` : undefined,
          }}
        >{d}</span>
        {dayEvents.length > 0 && (
          <div className="flex gap-[3px] mt-1">
            {dayEvents.slice(0, 3).map((_, i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: theme.accent }} />
            ))}
          </div>
        )}
      </button>
    )
  }

  const selectedDayEvents = selectedDay ? (eventsByDay.get(selectedDay) || []) : []

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[13.5px]" style={{ color: theme.text }}>{monthName}</h3>
        <div className="flex">
          <button onClick={() => onMonthChange(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button onClick={() => onMonthChange(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10.5px] font-medium py-1" style={{ color: theme.subtext }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>

      {selectedDay && selectedDay > 0 ? (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: theme.text }}>
            {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedDayEvents.length > 0 ? (
            <ul>
              {selectedDayEvents.map((ev, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <div className="min-w-0">
                    <p className="text-[13px] truncate" style={{ color: theme.text }}>{ev.name}</p>
                    <p className="text-[11.5px]" style={{ color: theme.subtext }}>{ev.category}</p>
                  </div>
                  <span className="text-[13px] font-medium tnum" style={{ color: theme.text }}>{fmt(ev.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: theme.subtext }}>No subscriptions charge this day.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function BillBossPage() {
  const { data, setData, loading } = useOrcaData()
  const { theme } = useTheme()

  const [bills, setBills] = useState<Bill[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formStep, setFormStep] = useState<FormStep>(1)
  const [splitModalBillId, setSplitModalBillId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [showOccurrencePreview, setShowOccurrencePreview] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('compact')
  const [notifications, setNotifications] = useState<Array<{ id: string; billId: string; billName: string; amount: number; dueDate: string; type: 'due-today' | 'upcoming'; dismissed: boolean }>>([])
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [collapsedSplits, setCollapsedSplits] = useState<Record<string, boolean>>({})
  const [partialPayId, setPartialPayId] = useState<string | null>(null)
  const [partialPayAmount, setPartialPayAmount] = useState('')
  const [partialPayMode, setPartialPayMode] = useState<'full' | 'half' | 'custom'>('full')
  // Target date for future-month bill payments (so paidDate maps to the right cycle)
  const [paymentTargetDate, setPaymentTargetDate] = useState<string | null>(null)
  const [showPayAll, setShowPayAll] = useState(false)

  // Credit card debt payoff
  interface CreditCardDebt {
    id: string
    name: string
    balance: number
    apr: number
    minPayment: number
    monthlyPayment: number
    dueDay: number
    payments: { date: string; amount: number; remaining: number; interest: number; paid: boolean }[]
  }
  const [creditCards, setCreditCards] = useState<CreditCardDebt[]>(() => { try { return JSON.parse(localStorage.getItem('orca-credit-cards') || '[]') } catch { return [] } })
  const [showAddCard, setShowAddCard] = useState(false)
  const [cardForm, setCardForm] = useState({ name: '', balance: '', apr: '', minPayment: '', monthlyPayment: '', dueDay: '' })
  const [editingCardId, setEditingCardId] = useState<string | null>(null)

  const saveCreditCards = (cards: CreditCardDebt[]) => {
    setCreditCards(cards)
    try { setLocalSynced('orca-credit-cards', JSON.stringify(cards)) } catch {}
  }

  const generatePayments = (balance: number, monthly: number, apr: number, dueDay: number) => {
    const payments: CreditCardDebt['payments'] = []
    let remaining = balance
    const today = new Date()
    let payDate = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay || 1, 28))
    const monthlyRate = apr / 100 / 12
    while (remaining > 0 && payments.length < 360) {
      const interest = remaining * monthlyRate
      const payAmount = Math.min(monthly, remaining + interest)
      remaining = Math.max(0, remaining + interest - payAmount)
      payments.push({
        date: payDate.toISOString().slice(0, 10),
        amount: Math.round(payAmount * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        paid: false,
      })
      payDate = new Date(payDate.getFullYear(), payDate.getMonth() + 1, Math.min(dueDay || 1, 28))
    }
    return payments
  }

  const getPayoffInsights = (balance: number, monthly: number, apr: number, minPayment: number) => {
    const monthlyRate = apr / 100 / 12
    const calcSchedule = (pmt: number) => {
      let rem = balance; let totalInterest = 0; let months = 0
      while (rem > 0 && months < 360) {
        const interest = rem * monthlyRate
        const pay = Math.min(pmt, rem + interest)
        rem = Math.max(0, rem + interest - pay)
        totalInterest += interest
        months++
      }
      return { months, totalInterest: Math.round(totalInterest * 100) / 100 }
    }
    const current = calcSchedule(monthly)
    const minOnly = minPayment > 0 ? calcSchedule(minPayment) : null
    const extra25 = calcSchedule(monthly + 25)
    const extra50 = calcSchedule(monthly + 50)
    const extra100 = calcSchedule(monthly + 100)
    const double = calcSchedule(monthly * 2)
    // Find the payment that cuts months roughly in half using binary search
    const targetMonths = Math.ceil(current.months / 2)
    let lo = monthly, hi = balance + monthly, halvePmt = monthly * 2
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      const m = calcSchedule(mid).months
      if (m <= targetMonths) { halvePmt = mid; hi = mid } else { lo = mid }
    }
    halvePmt = Math.ceil(halvePmt / 5) * 5 // round up to nearest $5
    const halve = calcSchedule(halvePmt)
    return { current, minOnly, extra25, extra50, extra100, double, halvePmt: Math.round(halvePmt * 100) / 100, halve }
  }

  const addCreditCard = () => {
    const balance = parseFloat(cardForm.balance) || 0
    const monthly = parseFloat(cardForm.monthlyPayment) || parseFloat(cardForm.minPayment) || 50
    const apr = parseFloat(cardForm.apr) || 0
    const dueDay = parseInt(cardForm.dueDay) || 1
    if (!cardForm.name || balance <= 0) return

    const payments = generatePayments(balance, monthly, apr, dueDay)

    const card: CreditCardDebt = {
      id: Date.now().toString(),
      name: cardForm.name,
      balance,
      apr,
      minPayment: parseFloat(cardForm.minPayment) || 0,
      monthlyPayment: monthly,
      dueDay,
      payments,
    }
    saveCreditCards([...creditCards, card])
    setCardForm({ name: '', balance: '', apr: '', minPayment: '', monthlyPayment: '', dueDay: '' })
    setShowAddCard(false)
  }

  const startEditCard = (card: CreditCardDebt) => {
    setEditingCardId(card.id)
    setCardForm({
      name: card.name,
      balance: String(card.balance),
      apr: String(card.apr),
      minPayment: String(card.minPayment || ''),
      monthlyPayment: String(card.monthlyPayment),
      dueDay: String(card.dueDay || ''),
    })
  }

  const saveEditCard = () => {
    if (!editingCardId) return
    const balance = parseFloat(cardForm.balance) || 0
    const monthly = parseFloat(cardForm.monthlyPayment) || parseFloat(cardForm.minPayment) || 50
    const apr = parseFloat(cardForm.apr) || 0
    const dueDay = parseInt(cardForm.dueDay) || 1
    if (!cardForm.name || balance <= 0) return

    const oldCard = creditCards.find(c => c.id === editingCardId)
    const paidPayments = oldCard?.payments.filter(p => p.paid) || []
    const totalAlreadyPaid = paidPayments.reduce((s, p) => s + p.amount, 0)
    const effectiveBalance = Math.max(0, balance - totalAlreadyPaid)
    const newPayments = generatePayments(effectiveBalance, monthly, apr, dueDay)

    saveCreditCards(creditCards.map(c => c.id === editingCardId ? {
      ...c, name: cardForm.name, balance, apr,
      minPayment: parseFloat(cardForm.minPayment) || 0,
      monthlyPayment: monthly, dueDay,
      payments: [...paidPayments, ...newPayments],
    } : c))
    setEditingCardId(null)
    setCardForm({ name: '', balance: '', apr: '', minPayment: '', monthlyPayment: '', dueDay: '' })
  }

  const cancelEditCard = () => {
    setEditingCardId(null)
    setCardForm({ name: '', balance: '', apr: '', minPayment: '', monthlyPayment: '', dueDay: '' })
  }

  const markCardPayment = (cardId: string, paymentIdx: number) => {
    saveCreditCards(creditCards.map(c => c.id === cardId ? { ...c, payments: c.payments.map((p, i) => i === paymentIdx ? { ...p, paid: true } : p) } : c))
  }

  const deleteCard = (cardId: string) => {
    saveCreditCards(creditCards.filter(c => c.id !== cardId))
  }

  // ── Subscriptions ──
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => { try { return JSON.parse(localStorage.getItem('orca-subscriptions') || '[]') } catch { return [] } })
  const [wellsSettings, setWellsSettings] = useState<WellsSettings>(() => {
    try {
      const saved = localStorage.getItem('orca-wells-settings')
      return saved ? JSON.parse(saved) : getDefaultWellsSettings()
    } catch { return getDefaultWellsSettings() }
  })
  const [subTab, setSubTab] = useState<'list' | 'calendar' | 'total' | 'wells'>('list')
  const [subCalMonth, setSubCalMonth] = useState(new Date().getMonth())
  const [subCalYear, setSubCalYear] = useState(new Date().getFullYear())
  const [showAddSubscription, setShowAddSubscription] = useState(false)
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null)
  const emptySubForm = { name: '', category: SUBSCRIPTION_CATEGORIES[0], price: '', billingDate: new Date().toISOString().split('T')[0], frequency: 'monthly' as SubscriptionFrequency, customFrequencyDays: '', paymentAccount: 'Wells', status: 'active' as SubscriptionStatus }
  const [subForm, setSubForm] = useState(emptySubForm)

  const persistSubscriptions = (updated: Subscription[]) => {
    setSubscriptions(updated)
    try { setLocalSynced('orca-subscriptions', JSON.stringify(updated)) } catch {}
  }

  const saveWellsSettings = (updated: WellsSettings) => {
    setWellsSettings(updated)
    try { setLocalSynced('orca-wells-settings', JSON.stringify(updated)) } catch {}
  }

  const addSubscription = () => {
    const price = parseFloat(subForm.price) || 0
    if (!subForm.name || price <= 0) return
    const candidate: Subscription = {
      id: Date.now().toString(),
      name: subForm.name,
      category: subForm.category,
      price,
      billingDate: subForm.billingDate,
      frequency: subForm.frequency,
      customFrequencyDays: subForm.frequency === 'custom' ? (parseInt(subForm.customFrequencyDays) || 30) : undefined,
      paymentAccount: subForm.paymentAccount || 'Wells',
      nextPaymentDate: subForm.billingDate,
      status: subForm.status,
      createdAt: new Date().toISOString(),
    }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const occurrences = getRecurringSubscriptionDates(candidate, 24)
    const nextOccurrence = occurrences.find(d => new Date(d + 'T00:00:00') >= today)
    candidate.nextPaymentDate = nextOccurrence || subForm.billingDate
    persistSubscriptions([...subscriptions, candidate])
    setSubForm(emptySubForm)
    setShowAddSubscription(false)
  }

  const startEditSubscription = (sub: Subscription) => {
    setEditingSubscriptionId(sub.id)
    setSubForm({
      name: sub.name,
      category: sub.category,
      price: String(sub.price),
      billingDate: sub.billingDate,
      frequency: sub.frequency,
      customFrequencyDays: sub.customFrequencyDays ? String(sub.customFrequencyDays) : '',
      paymentAccount: sub.paymentAccount,
      status: sub.status,
    })
  }

  const saveEditSubscription = () => {
    if (!editingSubscriptionId) return
    const price = parseFloat(subForm.price) || 0
    if (!subForm.name || price <= 0) return
    persistSubscriptions(subscriptions.map(s => {
      if (s.id !== editingSubscriptionId) return s
      const updated: Subscription = {
        ...s,
        name: subForm.name,
        category: subForm.category,
        price,
        billingDate: subForm.billingDate,
        frequency: subForm.frequency,
        customFrequencyDays: subForm.frequency === 'custom' ? (parseInt(subForm.customFrequencyDays) || 30) : undefined,
        paymentAccount: subForm.paymentAccount || 'Wells',
        status: subForm.status,
      }
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const occurrences = getRecurringSubscriptionDates(updated, 24)
      updated.nextPaymentDate = occurrences.find(d => new Date(d + 'T00:00:00') >= today) || updated.billingDate
      return updated
    }))
    setEditingSubscriptionId(null)
    setSubForm(emptySubForm)
  }

  const cancelEditSubscription = () => {
    setEditingSubscriptionId(null)
    setSubForm(emptySubForm)
  }

  const toggleSubscriptionStatus = (id: string) => {
    persistSubscriptions(subscriptions.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'cancelled' : 'active' } : s))
  }

  const deleteSubscription = (id: string) => {
    persistSubscriptions(subscriptions.filter(s => s.id !== id))
  }

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions])
  const sortedSubscriptions = useMemo(() => [...activeSubscriptions].sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()), [activeSubscriptions])
  const monthlySubscriptionTotal = useMemo(() => activeSubscriptions.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0), [activeSubscriptions])
  const subscriptionCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    activeSubscriptions.forEach(s => { totals[s.category] = (totals[s.category] || 0) + getMonthlyEquivalent(s) })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [activeSubscriptions])
  const wellsRequiredBalance = useMemo(() => getRequiredWellsBalance(subscriptions, wellsSettings), [subscriptions, wellsSettings])
  const wellsNeededThisWeek = useMemo(() => getAmountNeededThisWeek(subscriptions, wellsSettings), [subscriptions, wellsSettings])
  const wellsNeededBeforeNextCharge = useMemo(() => getAmountNeededBeforeNextCharge(subscriptions, wellsSettings), [subscriptions, wellsSettings])
  const wellsRecommendedBuffer = useMemo(() => getRecommendedBuffer(subscriptions, wellsSettings), [subscriptions, wellsSettings])
  const wellsMonthlyTotal = useMemo(() => {
    const wellsSubs = activeSubscriptions.filter(s => s.paymentAccount.trim().toLowerCase() === wellsSettings.accountName.trim().toLowerCase())
    return wellsSubs.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0)
  }, [activeSubscriptions, wellsSettings])
  const wellsUpcomingCharges = useMemo(() => {
    const wellsSubs = subscriptions.filter(s => s.status === 'active' && s.paymentAccount.trim().toLowerCase() === wellsSettings.accountName.trim().toLowerCase())
    const from = new Date()
    const to = new Date(from); to.setMonth(to.getMonth() + 3)
    return getUpcomingCharges(wellsSubs, from, to).slice(0, 10)
  }, [subscriptions, wellsSettings])

  // Load bills: prefer context data, fallback to localStorage
  useEffect(() => {
    if (data.bills && data.bills.length > 0) {
      setBills(data.bills)
    } else {
      try {
        const saved = localStorage.getItem('orca-bills')
        if (saved) setBills(JSON.parse(saved))
      } catch {}
    }
  }, [data.bills])

  // Persist bills to both context and localStorage whenever they change
  // Also auto-deduct from checking balance when a bill transitions to "paid"
  const persistBills = (updatedBills: Bill[]) => {
    // Detect newly paid bills (were not paid before, now paid)
    const previousBills = bills;
    let deductTotal = 0;
    updatedBills.forEach(ub => {
      if (ub.status === 'paid') {
        const prev = previousBills.find(pb => pb.id === ub.id);
        if (prev && prev.status !== 'paid') {
          // One-time or first-time payment — status flipped to paid
          deductTotal += ub.amount;
        } else if (prev && prev.status === 'paid' && ub.paidDate && ub.paidDate !== prev.paidDate) {
          // Recurring bill paid again in a new cycle — paidDate changed
          deductTotal += ub.amount;
        }
      }
      // Check for newly paid split allocations (both newly added paid allocs and
      // existing allocs that just had their paid flag flipped to true)
      ub.alloc.forEach(ua => {
        if (ua.paid) {
          const prevBill = previousBills.find(pb => pb.id === ub.id);
          const prevAlloc = prevBill?.alloc.find(pa => pa.id === ua.id);
          if (!prevAlloc) {
            // Brand-new alloc that is already marked paid (partial payment just recorded)
            deductTotal += ua.amount;
          } else if (!prevAlloc.paid) {
            // Existing alloc that was just marked paid via handlePayment
            deductTotal += ua.amount;
          }
        }
      });
    });

    // Auto-deduct from checking balance
    if (deductTotal > 0) {
      try {
        const settingsStr = localStorage.getItem('orca-user-settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const currentBal = settings.checkingBalance || 0;
          settings.checkingBalance = Math.max(0, currentBal - deductTotal);
          setLocalSynced('orca-user-settings', JSON.stringify(settings));
          // Also update context
          setData(prev => ({
            ...prev,
            user: { ...prev.user, checkingBalance: settings.checkingBalance },
          }));
        }
      } catch {}
    }

    setBills(updatedBills);
    setData(prev => ({ ...prev, bills: updatedBills }));
    try { setLocalSynced('orca-bills', JSON.stringify(updatedBills)); } catch {}
    // Emit event for financial engine recompute
    if (deductTotal > 0) {
      orcaEvents.broadcast('bill.paid', { amount: deductTotal })
    }
  }

  // ── Duplicate a bill ──
  const handleDuplicateBill = (bill: Bill) => {
    const newBill: Bill = {
      ...bill,
      id: gid(),
      name: `${bill.name} (copy)`,
      status: 'upcoming',
      alloc: [],
    }
    const updated = [...bills, newBill]
    persistBills(updated)
    orcaEvents.broadcast('bill.created', { billId: newBill.id })
  }

  // Generate notifications from bills
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newNotifs: typeof notifications = []

    bills.forEach(b => {
      if (getBillEffectiveStatus(b, today.getMonth(), today.getFullYear()) === 'paid') return
      const due = new Date(b.due + 'T00:00:00')
      due.setHours(0, 0, 0, 0)
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        newNotifs.push({ id: `notif-${b.id}-today`, billId: b.id, billName: b.name, amount: b.amount, dueDate: b.due, type: 'due-today', dismissed: false })
      } else if (diffDays > 0 && diffDays <= 3) {
        newNotifs.push({ id: `notif-${b.id}-upcoming`, billId: b.id, billName: b.name, amount: b.amount, dueDate: b.due, type: 'upcoming', dismissed: false })
      }
    })

    setNotifications(prev => {
      const dismissed = new Set(prev.filter(n => n.dismissed).map(n => n.id))
      return newNotifs.map(n => ({ ...n, dismissed: dismissed.has(n.id) }))
    })
  }, [bills])

  void notifications // notifications used for dismissal state only

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due: '',
    cat: CATEGORIES[0],
    freq: 'monthly',
    recurrence: 'monthly' as BillRecurrence,
    customRecurrenceDays: '',
    recurrenceEndType: 'ongoing' as RecurrenceEndType,
    recurrenceEndDate: '',
    recurrenceEndAfter: '',
  })

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  // Returns the display due date adjusted to the currently viewed billing cycle
  const cycleDue = (bill: Bill): string => {
    const rec = bill.recurrence || 'one-time'
    if (rec === 'one-time') return bill.due
    const originalDay = new Date(bill.due + 'T00:00:00').getDate()
    // Clamp to valid days in the viewed month (e.g. day 31 in a 30-day month)
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const day = Math.min(originalDay, daysInMonth)
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Still owed this month (shared with the home page via lib/billStatus)
  const unpaidTotal = billsOwedInMonth(bills, calMonth, calYear)

  // Calculate paid total — uses effective status for the currently viewed month
  const paidTotal = bills
    .filter(b => isBillVisibleInCycle(b, calMonth, calYear) && getBillEffectiveStatus(b, calMonth, calYear) === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)


  // Calculate monthly bill total for selected calendar month — expands recurring bills
  const monthlyBillTotal = useMemo(() => {
    let total = 0
    const monthStart = new Date(calYear, calMonth, 1)
    const monthEnd = new Date(calYear, calMonth + 1, 0)

    bills.forEach(b => {
      // Count split allocs in this month
      const allocInMonth = b.alloc.reduce((aSum, a) => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getMonth() === calMonth && ad.getFullYear() === calYear) return aSum + a.amount
        return aSum
      }, 0)

      if (allocInMonth > 0) {
        total += allocInMonth
        return
      }

      const dueDate = new Date(b.due + 'T00:00:00')
      const recurrence = b.recurrence || 'one-time'

      if (recurrence === 'one-time' || !recurrence) {
        // One-time: count only if due date is in the selected month
        if (dueDate.getMonth() === calMonth && dueDate.getFullYear() === calYear) {
          total += b.amount
        }
      } else if (recurrence === 'monthly') {
        // Monthly: appears once per month (on the same day, clamped to month length)
        const day = Math.min(dueDate.getDate(), monthEnd.getDate())
        const candidate = new Date(calYear, calMonth, day)
        if (isBillOccurrenceActive(b, candidate, monthlyOccurrenceIndex(dueDate, calYear, calMonth))) {
          total += b.amount
        }
      } else if (recurrence === 'yearly') {
        // Yearly: appears once per year on the same month/day
        if (dueDate.getMonth() === calMonth) {
          const candidate = new Date(calYear, calMonth, dueDate.getDate())
          if (isBillOccurrenceActive(b, candidate, yearlyOccurrenceIndex(dueDate, calYear))) {
            total += b.amount
          }
        }
      } else {
        // Weekly, biweekly, custom: generate occurrences and count those in this month
        const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
        const cursor = new Date(dueDate)
        let occurrenceIndex = 0
        // Fast-forward to near the month start
        if (cursor < monthStart) {
          const daysGap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
          cursor.setDate(cursor.getDate() + daysGap)
          occurrenceIndex = Math.round(daysGap / intervalDays)
        }
        // Walk forward and count hits in the month
        while (cursor <= monthEnd) {
          if (cursor >= monthStart && cursor >= dueDate && isBillOccurrenceActive(b, cursor, occurrenceIndex)) {
            total += b.amount
          }
          cursor.setDate(cursor.getDate() + intervalDays)
          occurrenceIndex++
        }
      }
    })

    return total
  }, [bills, calMonth, calYear])

  // Returns bills relevant to the currently selected calendar month.
  // Monthly recurring bills always appear (they recur every month).
  // One-time / weekly / biweekly bills only appear if they have an occurrence in the selected month.
  const getVisibleBills = () => {
    return [...bills]
      .filter(b => isBillVisibleInCycle(b, calMonth, calYear))
      .sort((a, b) => {
        // Sort by effective due day within the currently viewed month
        const dayA = new Date(a.due + 'T00:00:00').getDate()
        const dayB = new Date(b.due + 'T00:00:00').getDate()
        // For the current month, bills already past sort after upcoming ones
        const today = new Date()
        const isCurrentView = calMonth === today.getMonth() && calYear === today.getFullYear()
        if (isCurrentView) {
          const todayDay = today.getDate()
          const aOverdue = dayA < todayDay
          const bOverdue = dayB < todayDay
          if (aOverdue !== bOverdue) return aOverdue ? 1 : -1
        }
        return dayA - dayB
      })
  }

  // Handler: Add bill
  const handleAddBill = () => {
    if (!formData.name || !formData.amount || !formData.due) return

    const newBill: Bill = {
      id: gid(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      cat: formData.cat === 'Other' ? customCategory : formData.cat,
      due: formData.due,
      freq: formData.freq,
      recurrence: formData.recurrence,
      customRecurrenceDays: formData.recurrence === 'custom' ? parseInt(formData.customRecurrenceDays) : undefined,
      recurrenceEndType: formData.recurrenceEndType,
      recurrenceEndDate: formData.recurrenceEndType === 'after-date' ? formData.recurrenceEndDate : undefined,
      recurrenceEndAfter: formData.recurrenceEndType === 'after-count' ? parseInt(formData.recurrenceEndAfter) : undefined,
      status: 'upcoming',
      alloc: [],
    }

    persistBills([...bills, newBill])
    orcaEvents.broadcast('bill.created', { billId: newBill.id, name: newBill.name })
    setFormData({
      name: '',
      amount: '',
      due: '',
      cat: CATEGORIES[0],
      freq: 'monthly',
      recurrence: 'monthly',
      customRecurrenceDays: '',
      recurrenceEndType: 'ongoing',
      recurrenceEndDate: '',
      recurrenceEndAfter: '',
    })
    setCustomCategory('')
    setFormStep(1)
    setShowAddForm(false)
  }

  // Handler: Start editing a bill
  const handleStartEdit = (billId: string) => {
    const bill = bills.find(b => b.id === billId)
    if (!bill) return
    setFormData({
      name: bill.name,
      amount: String(bill.amount),
      due: bill.due,
      cat: CATEGORIES.includes(bill.cat) ? bill.cat : 'Other',
      freq: bill.freq,
      recurrence: bill.recurrence,
      customRecurrenceDays: bill.customRecurrenceDays ? String(bill.customRecurrenceDays) : '',
      recurrenceEndType: bill.recurrenceEndType || 'ongoing',
      recurrenceEndDate: bill.recurrenceEndDate || '',
      recurrenceEndAfter: bill.recurrenceEndAfter ? String(bill.recurrenceEndAfter) : '',
    })
    if (!CATEGORIES.includes(bill.cat)) setCustomCategory(bill.cat)
    setEditingBillId(billId)
    setShowAddForm(true)
  }

  // Handler: Save edit
  const handleSaveEdit = () => {
    if (!editingBillId || !formData.name || !formData.amount || !formData.due) return
    const updated = bills.map(b => {
      if (b.id !== editingBillId) return b
      return {
        ...b,
        name: formData.name,
        amount: parseFloat(formData.amount),
        cat: formData.cat === 'Other' ? customCategory : formData.cat,
        due: formData.due,
        freq: formData.freq,
        recurrence: formData.recurrence,
        customRecurrenceDays: formData.recurrence === 'custom' ? parseInt(formData.customRecurrenceDays) : undefined,
        recurrenceEndType: formData.recurrenceEndType,
        recurrenceEndDate: formData.recurrenceEndType === 'after-date' ? formData.recurrenceEndDate : undefined,
        recurrenceEndAfter: formData.recurrenceEndType === 'after-count' ? parseInt(formData.recurrenceEndAfter) : undefined,
      }
    })
    persistBills(updated)
    setEditingBillId(null)
    setFormData({
      name: '', amount: '', due: '', cat: CATEGORIES[0], freq: 'monthly',
      recurrence: 'monthly', customRecurrenceDays: '', recurrenceEndType: 'ongoing',
      recurrenceEndDate: '', recurrenceEndAfter: '',
    })
    setCustomCategory('')
    setShowAddForm(false)
  }

  // Handler: Cancel edit
  const handleCancelEdit = () => {
    setEditingBillId(null)
    setFormData({
      name: '', amount: '', due: '', cat: CATEGORIES[0], freq: 'monthly',
      recurrence: 'monthly', customRecurrenceDays: '', recurrenceEndType: 'ongoing',
      recurrenceEndDate: '', recurrenceEndAfter: '',
    })
    setCustomCategory('')
    setShowAddForm(false)
  }

  // Returns how much is still owed for a bill in a specific billing cycle.
  // For recurring bills only alloc entries whose date falls in that cycle month/year
  // are counted, so past-cycle partial payments never reduce the current balance.
  const getCycleRemaining = cycleRemaining


  // Returns the bill's effective due date within the currently viewed calendar month/year.
  // For monthly bills this is the same day-of-month clamped to the viewed month's length.
  // For yearly bills the year is updated to calYear.
  // All other recurrence types return the original due date unchanged.
  // This date is passed to handlePayFull so that paidDate is stamped to the correct
  // billing cycle even when paying from the list/compact view of a future or past month.
  const getEffectiveBillDate = (bill: Bill): string => cycleDueDate(bill, calMonth, calYear)


  // Handler: open the payment bottom-sheet for a bill.
  // `targetDueDate` pins the payment to the correct billing cycle (past, current, or future).
  // Always pass getEffectiveBillDate(bill) from list/compact view so that paidDate is
  // stamped with the viewed-month's date and getBillEffectiveStatus resolves correctly.
  const handlePayFull = (billId: string, targetDueDate?: string) => {
    const bill = bills.find(b => b.id === billId)
    if (!bill) return
    const today = localDate()
    // Use the provided cycle date; fall back to today only when no date is given.
    const tDate = targetDueDate || today
    const cd = new Date(tDate + 'T00:00:00')
    const cycleRemaining = getCycleRemaining(bill, cd.getMonth(), cd.getFullYear())
    setPartialPayId(billId)
    setPartialPayMode('full')
    // Pre-fill with the amount still owed in this cycle (full bill if nothing paid yet)
    setPartialPayAmount(String(cycleRemaining > 0 ? cycleRemaining : bill.amount))
    // Always record the target date so handleApplyPartialPayment uses the right cycle
    setPaymentTargetDate(targetDueDate || null)
  }

  // Handler: Apply partial or full payment
  // Partial payments are tracked via alloc entries (bill.amount is never mutated).
  // Once alloc paid total reaches bill.amount the bill is considered fully paid.
  const handleApplyPartialPayment = () => {
    if (!partialPayId || !partialPayAmount) return

    const amount = parseFloat(partialPayAmount)
    if (isNaN(amount) || amount <= 0) return

    const bill = bills.find(b => b.id === partialPayId)
    if (!bill) return

    const today = localDate()
    // Use the target cycle date when provided (past, current, or future month) so that
    // paidDate is stamped with a date that getBillEffectiveStatus can match correctly.
    // Fall back to today only when no target date was specified (e.g. hero-card pay-now).
    const effectiveDate = paymentTargetDate || today

    // Determine which billing cycle this payment belongs to
    const cd = new Date(effectiveDate + 'T00:00:00')
    const cycleMonth = cd.getMonth()
    const cycleYear = cd.getFullYear()

    // Use the cycle-scoped remaining so past-cycle partial payments never
    // block the current payment from going through.
    const remaining = getCycleRemaining(bill, cycleMonth, cycleYear)
    const effectiveAmount = Math.min(amount, remaining)

    if (effectiveAmount <= 0) {
      setPartialPayId(null)
      setPartialPayAmount('')
      setPartialPayMode('full')
      setPaymentTargetDate(null)
      return
    }

    if (effectiveAmount >= remaining) {
      // Full (or completing) payment for this cycle. Allocs from other cycles stay.
      persistBills(bills.map(b => (b.id === partialPayId ? markBillPaid(b, effectiveDate) : b)))
    } else {
      // Genuine partial payment — record as alloc entry, keep status upcoming.
      // Future recurring cycles are completely unaffected because alloc records
      // are scoped to their cycle date when status checks run.
      const newAlloc: BillAlloc = {
        id: gid(),
        date: effectiveDate,
        amount: effectiveAmount,
        paid: true,
      }
      persistBills(bills.map(b =>
        b.id === partialPayId
          ? { ...b, alloc: [...b.alloc, newAlloc] }
          : b
      ))
    }

    setPartialPayId(null)
    setPartialPayAmount('')
    setPartialPayMode('full')
    setPaymentTargetDate(null)
  }

  // Handler: Delete bill
  const handleDeleteBill = (billId: string) => {
    persistBills(bills.filter(b => b.id !== billId))
  }

  // Helper: compute partial payment info for a bill.
  // For recurring bills, only alloc entries from the currently viewed billing cycle
  // are counted so past-cycle partial payments don't bleed into future months.
  const getPartialPayInfo = (bill: Bill) => {
    const rec = bill.recurrence || 'one-time'
    const allocsToCount = (rec !== 'one-time' && bill.alloc.length > 0)
      ? bill.alloc.filter(a => {
          const ad = new Date(a.date + 'T00:00:00')
          return ad.getMonth() === calMonth && ad.getFullYear() === calYear
        })
      : bill.alloc
    const totalPaid = allocsToCount.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0)
    if (totalPaid <= 0) return null
    const remaining = Math.max(0, bill.amount - totalPaid)
    return {
      totalPaid,
      remaining,
      isPartial: remaining > 0,
      pct: Math.min(100, Math.round((totalPaid / bill.amount) * 100)),
    }
  }

  // Returns the date a bill was paid for the currently viewed billing cycle.
  // For bills paid via handleApplyPartialPayment, paidDate is set directly.
  // For bills paid via individual split-alloc entries (handlePayment), we derive
  // the date from the most-recently paid alloc in the current cycle.
  const getDisplayPaidDate = (bill: Bill): string | null => {
    if (bill.paidDate) return bill.paidDate
    const rec = bill.recurrence || 'one-time'
    const cycleAllocs = (rec !== 'one-time' && bill.alloc.length > 0)
      ? bill.alloc.filter(a => {
          const ad = new Date(a.date + 'T00:00:00')
          return ad.getMonth() === calMonth && ad.getFullYear() === calYear && a.paid
        })
      : bill.alloc.filter(a => a.paid)
    if (cycleAllocs.length === 0) return null
    return cycleAllocs.sort((a, b) => b.date.localeCompare(a.date))[0].date
  }

  // Handler: Apply split
  const handleApplySplit = (billId: string, numPayments: number) => {
    persistBills(bills.map(b => {
      if (b.id !== billId) return b

      const baseAmount = b.amount / numPayments
      const alloc: BillAlloc[] = []
      // Parse as a local date; new Date('YYYY-MM-DD') is UTC and can land a day early.
      const dueDate = new Date(b.due + 'T00:00:00')

      for (let i = 0; i < numPayments; i++) {
        const paymentDate = new Date(dueDate)
        paymentDate.setDate(paymentDate.getDate() + i * 7)

        alloc.push({
          id: gid(),
          date: localISO(paymentDate),
          amount: baseAmount,
          paid: false,
        })
      }

      return { ...b, alloc }
    }))
    setSplitModalBillId(null)
  }

  // Handler: Mark payment as paid
  const handlePayment = (billId: string, allocId: string) => {
    persistBills(bills.map(b => {
      if (b.id !== billId) return b
      return {
        ...b,
        alloc: b.alloc.map(a =>
          a.id === allocId ? { ...a, paid: true } : a
        ),
      }
    }))
  }

  // ── Layout state (2026-11 redesign) ──
  const [tab, setTab] = useState<'bills' | 'cards' | 'subs'>('bills')
  const [billsView, setBillsView] = useState<'list' | 'calendar'>('list')
  const [paidOpen, setPaidOpen] = useState(false)
  const [openSplits, setOpenSplits] = useState<Record<string, boolean>>({})
  const [openPlans, setOpenPlans] = useState<Record<string, boolean>>({})
  const [subSelectedDay, setSubSelectedDay] = useState<number | null>(null)
  const field = useField()

  const visibleBills = getVisibleBills()

  if (loading) {
    return (
      <div style={{ backgroundColor: theme.bg }} className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm" style={{ color: theme.subtext }}>Loading…</div>
      </div>
    )
  }

  const upcomingVisible = visibleBills.filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'upcoming')
  const paidVisible = bills.filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'paid')
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long' })
  const todayISO = localISO(new Date())

  const resetBillForm = () => {
    setFormData({
      name: '', amount: '', due: '', cat: CATEGORIES[0], freq: 'monthly',
      recurrence: 'monthly', customRecurrenceDays: '', recurrenceEndType: 'ongoing',
      recurrenceEndDate: '', recurrenceEndAfter: '',
    })
    setCustomCategory('')
    setShowOccurrencePreview(false)
  }
  const closeBillForm = () => {
    if (editingBillId) handleCancelEdit()
    else { resetBillForm(); setShowAddForm(false) }
    setFormStep(1)
  }
  const closeCardForm = () => {
    if (editingCardId) cancelEditCard()
    else { setShowAddCard(false); setCardForm({ name: '', balance: '', apr: '', minPayment: '', monthlyPayment: '', dueDay: '' }) }
  }
  const closeSubForm = () => { setShowAddSubscription(false); cancelEditSubscription() }

  const undoPaid = (bill: Bill) => persistBills(bills.map(b => {
    if (b.id !== bill.id) return b
    // Clear paidDate and unpay this cycle's alloc entries so the bill reverts to upcoming.
    return {
      ...b,
      status: 'upcoming' as const,
      paidDate: undefined,
      alloc: b.alloc.map(a => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getMonth() === calMonth && ad.getFullYear() === calYear) return { ...a, paid: false }
        return a
      }),
    }
  }))

  const onAdd = () => {
    if (tab === 'bills') { resetBillForm(); setEditingBillId(null); setShowAddForm(true) }
    else if (tab === 'cards') { setEditingCardId(null); setShowAddCard(true) }
    else { cancelEditSubscription(); setShowAddSubscription(true) }
  }
  const addLabel = tab === 'bills' ? 'Add bill' : tab === 'cards' ? 'Add card' : 'Add subscription'

  const recurrenceText = (bill: Bill) => {
    const r = bill.recurrence || 'one-time'
    const base = r === 'custom' && bill.customRecurrenceDays ? `Every ${bill.customRecurrenceDays} days` : r === 'one-time' ? 'One time' : r.charAt(0).toUpperCase() + r.slice(1)
    const extra = [
      bill.recurrenceEndDate ? `ends ${fmtD(bill.recurrenceEndDate)}` : null,
      bill.recurrenceEndAfter ? `${bill.recurrenceEndAfter} times` : null,
    ].filter(Boolean).join(', ')
    return extra ? `${base}, ${extra}` : base
  }

  // Pay all: every bill still owed in the viewed month, each paid for its own cycle.
  const payAllBills = unpaidBillsInMonth(bills, calMonth, calYear).filter(b => cycleRemaining(b, calMonth, calYear) > 0)
  const handlePayAll = () => {
    const ids = new Set(payAllBills.map(b => b.id))
    if (!ids.size) return
    persistBills(bills.map(b => (ids.has(b.id) ? markBillPaid(b, getEffectiveBillDate(b)) : b)))
    setShowPayAll(false)
  }

  const cardsWithPayments = creditCards.flatMap(c => c.payments.filter(p => !p.paid).map(p => ({ id: `cc-${c.id}-${p.date}`, name: `${c.name} Payment`, amount: p.amount, cat: 'Debt', due: p.date, freq: '', recurrence: 'one-time' as const, alloc: [], status: 'unpaid' })))
  const totalCardDebt = creditCards.reduce((s, c) => {
    const next = c.payments.find(p => !p.paid)
    return s + (next ? next.remaining + next.amount : 0)
  }, 0)

  const cardFormFields = (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Card name" className="col-span-2"><input value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="e.g. Capital One" {...field} /></Field>
      <Field label="Total balance ($)"><input type="number" inputMode="decimal" value={cardForm.balance} onChange={e => setCardForm({ ...cardForm, balance: e.target.value })} {...field} /></Field>
      <Field label="APR (%)"><input type="number" inputMode="decimal" value={cardForm.apr} onChange={e => setCardForm({ ...cardForm, apr: e.target.value })} placeholder="24.99" {...field} /></Field>
      <Field label="Minimum payment ($)"><input type="number" inputMode="decimal" value={cardForm.minPayment} onChange={e => setCardForm({ ...cardForm, minPayment: e.target.value })} {...field} /></Field>
      <Field label="Your monthly payment ($)"><input type="number" inputMode="decimal" value={cardForm.monthlyPayment} onChange={e => setCardForm({ ...cardForm, monthlyPayment: e.target.value })} {...field} /></Field>
      <Field label="Due day (1 to 28)" className="col-span-2"><input type="number" min="1" max="28" value={cardForm.dueDay} onChange={e => setCardForm({ ...cardForm, dueDay: e.target.value })} {...field} /></Field>
    </div>
  )

  return (
    <PageShell>
      <PageHeader
        title="Bill Boss"
        sub="Bills, credit cards and subscriptions"
        right={<>
          {tab === 'bills' && <MonthSwitcher month={calMonth} year={calYear} onChange={handleMonthChange} />}
          <Button variant="primary" onClick={onAdd}><Plus size={15} /> {addLabel}</Button>
        </>}
      />

      <div className="mb-5 overflow-x-auto no-scrollbar">
        <Segmented
          value={tab}
          onChange={v => setTab(v as typeof tab)}
          options={[
            { value: 'bills', label: `Bills${upcomingVisible.length ? ` · ${upcomingVisible.length}` : ''}` },
            { value: 'cards', label: `Credit cards${creditCards.length ? ` · ${creditCards.length}` : ''}` },
            { value: 'subs', label: `Subscriptions${activeSubscriptions.length ? ` · ${activeSubscriptions.length}` : ''}` },
          ]}
        />
      </div>

      {/* ═══════════════ BILLS ═══════════════ */}
      {tab === 'bills' && (
        <div className="space-y-4 md:space-y-5">
          <Panel pad={false}>
            <div className="grid grid-cols-3">
              {[
                { label: 'Still owed', value: fmt(unpaidTotal), tone: unpaidTotal > 0 ? theme.bad : theme.ok },
                { label: 'Paid', value: fmt(paidTotal), tone: undefined },
                { label: 'Scheduled', value: fmt(monthlyBillTotal), tone: undefined },
              ].map((s, i) => (
                <div key={s.label} className="px-3 sm:px-5 py-4 min-w-0" style={{ borderLeft: i ? `1px solid ${theme.border}` : undefined }}>
                  <p className="text-[11.5px] sm:text-xs font-medium truncate flex items-center gap-1.5" style={{ color: theme.subtext }}>
                    {i === 0 && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.tone }} />}{s.label}
                  </p>
                  <p className="mt-1 text-[15px] min-[400px]:text-[17px] sm:text-[24px] font-semibold tnum tracking-tight leading-tight whitespace-nowrap" style={{ color: theme.text }}>{s.value}</p>
                </div>
              ))}
            </div>
            {payAllBills.length > 0 && (
              <div className="flex items-center gap-3 px-3 sm:px-5 py-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                <p className="flex-1 min-w-0 text-[12.5px] truncate" style={{ color: theme.subtext }}>
                  {payAllBills.length} bill{payAllBills.length === 1 ? '' : 's'} left to pay in {monthName}
                </p>
                <Button variant="primary" size="sm" onClick={() => setShowPayAll(true)}><Check size={14} /> Pay all</Button>
              </div>
            )}
          </Panel>

          <div className="flex items-center justify-between gap-3">
            <Segmented size="sm" value={billsView} onChange={v => setBillsView(v as typeof billsView)} options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} />
            <span className="text-xs" style={{ color: theme.subtext }}>{upcomingVisible.length} to pay in {monthName}</span>
          </div>

          {billsView === 'calendar' && (
            <Panel>
              <BillCalendar
                bills={[...bills, ...cardsWithPayments]}
                month={calMonth}
                year={calYear}
                onMonthChange={handleMonthChange}
                onDayClick={(day) => setSelectedDay(day === 0 ? null : day)}
                selectedDay={selectedDay}
                theme={theme}
              />
            </Panel>
          )}

          {billsView === 'list' && (
            upcomingVisible.length === 0 ? (
              <EmptyState
                title={bills.length ? `Nothing left to pay in ${monthName}` : 'No bills yet'}
                sub={bills.length ? 'Paid bills are listed below.' : 'Add your first bill to start tracking due dates.'}
                action={!bills.length ? <Button variant="primary" onClick={onAdd}><Plus size={15} /> Add bill</Button> : undefined}
              />
            ) : (
              <Panel pad={false}>
                <ul>
                  {upcomingVisible.map((bill, i) => {
                    const partial = getPartialPayInfo(bill)
                    const due = cycleDue(bill)
                    const overdue = due < todayISO
                    const dueSoon = !overdue && Math.ceil((new Date(due + 'T00:00:00').getTime() - new Date(todayISO + 'T00:00:00').getTime()) / 86400000) <= 3
                    const iconConfig = CATEGORY_ICONS[bill.cat] || CATEGORY_ICONS['Other']
                    const Icon = iconConfig.Icon
                    const splitOpen = !!openSplits[bill.id]
                    return (
                      <li key={bill.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                          <span className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: `${theme.text}0a`, color: theme.text }}>
                            <Icon size={16} strokeWidth={1.75} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>{bill.name}</p>
                            <p className="text-[12px] truncate flex items-center gap-1.5" style={{ color: overdue || dueSoon ? theme.bad : theme.subtext }}>
                              {(overdue || dueSoon) && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.bad }} />}
                              {overdue ? 'Overdue · ' : ''}Due {fmtD(due)}
                              <span style={{ color: theme.subtext }}>· {bill.cat} · {recurrenceText(bill)}</span>
                            </p>
                            {partial?.isPartial && (
                              <div className="mt-2 max-w-[260px]">
                                <Bar pct={partial.pct} color={theme.warn} height={4} />
                                <p className="text-[11px] mt-1 tnum" style={{ color: theme.subtext }}>{fmt(partial.totalPaid)} paid of {fmt(bill.amount)}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[14px] font-semibold tnum" style={{ color: theme.text }}>{fmt(partial?.isPartial ? partial.remaining : bill.amount)}</p>
                            {partial?.isPartial && <p className="text-[11px]" style={{ color: theme.subtext }}>left</p>}
                          </div>
                          <Button variant="primary" size="sm" onClick={() => handlePayFull(bill.id, getEffectiveBillDate(bill))}>Pay</Button>
                          <RowMenu
                            label={`More actions for ${bill.name}`}
                            items={[
                              { label: 'Edit', icon: Edit3, onClick: () => handleStartEdit(bill.id) },
                              { label: 'Split into payments', icon: Scissors, onClick: () => setSplitModalBillId(bill.id) },
                              { label: 'Duplicate', icon: Copy, onClick: () => handleDuplicateBill(bill) },
                              { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDeleteBill(bill.id) },
                            ]}
                          />
                        </div>
                        {bill.alloc.length > 0 && (
                          <div className="px-4 sm:px-5 pb-3 sm:pl-[68px]">
                            <Disclosure
                              open={splitOpen}
                              onToggle={() => setOpenSplits(p => ({ ...p, [bill.id]: !p[bill.id] }))}
                              title={<span className="text-xs" style={{ color: theme.subtext }}>{partial?.isPartial ? `Partial payments · ${fmt(partial.totalPaid)} of ${fmt(bill.amount)}` : `Split schedule · ${bill.alloc.filter(a => a.paid).length} of ${bill.alloc.length} paid`}</span>}
                            >
                              <ul className="rounded-xl px-3" style={{ backgroundColor: `${theme.text}06` }}>
                                {bill.alloc.map((alloc, j) => (
                                  <li key={alloc.id} className="flex items-center justify-between gap-2 py-2" style={{ borderTop: j ? `1px solid ${theme.border}` : undefined }}>
                                    <span className="flex items-center gap-2 text-[13px]" style={{ color: alloc.paid ? theme.subtext : theme.text, textDecoration: alloc.paid ? 'line-through' : undefined }}>
                                      {alloc.paid && <Check size={13} style={{ color: theme.ok }} />}{fmtD(alloc.date)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-[13px] font-medium tnum" style={{ color: theme.text }}>{fmt(alloc.amount)}</span>
                                      {!alloc.paid && <Button size="sm" onClick={() => handlePayment(bill.id, alloc.id)}>Mark paid</Button>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </Disclosure>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            )
          )}

          {paidVisible.length > 0 && (
            <Panel pad={false}>
              <div className="px-4 sm:px-5">
                <Disclosure
                  open={paidOpen}
                  onToggle={() => setPaidOpen(o => !o)}
                  title={`Paid in ${monthName} · ${paidVisible.length}`}
                  right={<span className="text-[13px] tnum" style={{ color: theme.ok }}>{fmt(paidTotal)}</span>}
                >
                  <ul className="pb-2">
                    {paidVisible.map((bill, i) => {
                      const paidOn = getDisplayPaidDate(bill)
                      return (
                        <li key={bill.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                          <Check size={15} style={{ color: theme.ok }} className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] truncate" style={{ color: theme.text }}>{bill.name}</p>
                            <p className="text-[11.5px]" style={{ color: theme.subtext }}>{bill.cat}{paidOn ? ` · Paid ${fmtD(paidOn)}` : ''}</p>
                          </div>
                          <span className="text-[13px] tnum" style={{ color: theme.subtext }}>{fmt(bill.amount)}</span>
                          <Button size="sm" variant="ghost" onClick={() => undoPaid(bill)}><Undo2 size={13} /> Undo</Button>
                        </li>
                      )
                    })}
                  </ul>
                </Disclosure>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ═══════════════ CREDIT CARDS ═══════════════ */}
      {tab === 'cards' && (
        <div className="space-y-4 md:space-y-5">
          {creditCards.length === 0 ? (
            <EmptyState title="No credit cards tracked" sub="Add a card to get a payoff plan with dates and interest." action={<Button variant="primary" onClick={onAdd}><Plus size={15} /> Add card</Button>} />
          ) : (
            <>
              <Panel>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Total card debt" value={fmt(totalCardDebt)} tone={totalCardDebt > 0 ? undefined : theme.ok} />
                  <Stat label="Monthly payments" value={fmt(creditCards.reduce((s, c) => s + (c.payments.some(p => !p.paid) ? c.monthlyPayment : 0), 0))} sub={`${creditCards.length} card${creditCards.length === 1 ? '' : 's'}`} />
                </div>
              </Panel>
              <div className="grid gap-4 md:gap-5 md:grid-cols-2 items-start">
                {creditCards.map(card => {
                  const nextPayment = card.payments.find(p => !p.paid)
                  const totalPaid = card.payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0)
                  const currentBalance = nextPayment ? nextPayment.remaining + nextPayment.amount : 0
                  const progressPct = card.balance > 0 ? Math.min(100, (totalPaid / card.balance) * 100) : 0
                  const unpaidPayments = card.payments.filter(p => !p.paid)
                  const totalInterest = unpaidPayments.reduce((s, p) => s + (p.interest || 0), 0)
                  const payoffDate = unpaidPayments.length > 0 ? unpaidPayments[unpaidPayments.length - 1].date : null
                  const insights = getPayoffInsights(currentBalance, card.monthlyPayment, card.apr, card.minPayment)
                  const options = [
                    { label: `+$25 a month (${fmt(card.monthlyPayment + 25)})`, data: insights.extra25 },
                    { label: `+$50 a month (${fmt(card.monthlyPayment + 50)})`, data: insights.extra50 },
                    { label: `+$100 a month (${fmt(card.monthlyPayment + 100)})`, data: insights.extra100 },
                  ].filter(o => o.data.months < insights.current.months)
                  return (
                    <Panel key={card.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold truncate" style={{ color: theme.text }}>{card.name}</p>
                          <p className="text-xs" style={{ color: theme.subtext }}>{card.apr}% APR · {fmt(card.monthlyPayment)} a month · {unpaidPayments.length} payments left</p>
                        </div>
                        <RowMenu label={`More actions for ${card.name}`} items={[
                          { label: 'Edit', icon: Edit3, onClick: () => startEditCard(card) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteCard(card.id) },
                        ]} />
                      </div>

                      <div className="mt-4">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-[22px] font-semibold tnum tracking-tight" style={{ color: theme.text }}>{fmt(currentBalance)}</span>
                          <span className="text-xs tnum" style={{ color: theme.subtext }}>{fmt(totalPaid)} paid</span>
                        </div>
                        <Bar pct={progressPct} color={progressPct >= 100 ? theme.ok : theme.accent} />
                      </div>

                      {nextPayment && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: `${theme.text}08` }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium" style={{ color: theme.text }}>Next payment {new Date(nextPayment.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-[11.5px] tnum" style={{ color: theme.subtext }}>{fmt(nextPayment.interest || 0)} interest · {fmt(nextPayment.amount - (nextPayment.interest || 0))} to principal</p>
                          </div>
                          <span className="text-[14px] font-semibold tnum" style={{ color: theme.text }}>{fmt(nextPayment.amount)}</span>
                          <Button size="sm" variant="primary" onClick={() => markCardPayment(card.id, card.payments.indexOf(nextPayment))}>Paid</Button>
                        </div>
                      )}

                      {currentBalance > 0 && (
                        <div className="mt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                          <Disclosure open={!!openPlans[card.id]} onToggle={() => setOpenPlans(p => ({ ...p, [card.id]: !p[card.id] }))} title="Payoff plan">
                            <div className="space-y-3 pb-1">
                              <div className="grid grid-cols-3 gap-2">
                                <MiniStat label="Debt free" value={payoffDate ? new Date(payoffDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'} />
                                <MiniStat label="Interest left" value={fmt(totalInterest)} tone={theme.bad} />
                                <MiniStat label="Months left" value={String(unpaidPayments.length)} />
                              </div>
                              {insights.minOnly && insights.minOnly.months > insights.current.months && (
                                <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.badBg, color: theme.text }}>
                                  <span style={{ color: theme.bad }}>Minimum only:</span> paying {fmt(card.minPayment)} a month would take {insights.minOnly.months} months and cost {fmt(insights.minOnly.totalInterest)} in interest.
                                </p>
                              )}
                              {insights.halvePmt > card.monthlyPayment && insights.halve.months < insights.current.months && (
                                <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.okBg, color: theme.text }}>
                                  <span style={{ color: theme.ok }}>Recommended:</span> pay {fmt(insights.halvePmt)} a month to finish in {insights.halve.months} months instead of {insights.current.months}, saving {fmt(insights.current.totalInterest - insights.halve.totalInterest)} in interest.
                                </p>
                              )}
                              {options.length > 0 && (
                                <ul className="text-xs">
                                  {options.map((o, j) => (
                                    <li key={o.label} className="grid grid-cols-[1fr_auto_auto] gap-3 py-1.5" style={{ borderTop: j ? `1px solid ${theme.border}` : undefined }}>
                                      <span style={{ color: theme.text }}>{o.label}</span>
                                      <span className="tnum" style={{ color: theme.subtext }}>{o.data.months} mo, {insights.current.months - o.data.months} sooner</span>
                                      <span className="tnum" style={{ color: theme.ok }}>save {fmt(insights.current.totalInterest - o.data.totalInterest)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div>
                                <p className="text-[11px] font-medium mb-1" style={{ color: theme.subtext }}>Upcoming payments</p>
                                <ul className="text-xs">
                                  {unpaidPayments.slice(0, 4).map((p, j) => (
                                    <li key={j} className="grid grid-cols-3 py-1.5 tnum" style={{ borderTop: j ? `1px solid ${theme.border}` : undefined }}>
                                      <span style={{ color: theme.text }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                      <span className="text-center" style={{ color: theme.subtext }}>{fmt(p.amount)}</span>
                                      <span className="text-right" style={{ color: theme.subtext }}>{fmt(p.remaining)} left</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </Disclosure>
                        </div>
                      )}
                    </Panel>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ SUBSCRIPTIONS ═══════════════ */}
      {tab === 'subs' && (
        <div className="space-y-4 md:space-y-5">
          <Panel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Monthly cost" value={fmt(monthlySubscriptionTotal)} sub={`${activeSubscriptions.length} active`} />
              <Stat label={`${wellsSettings.accountName || 'Wells'} balance needed`} value={fmt(wellsRequiredBalance)} sub={wellsSettings.nextDepositDate ? `before ${fmtD(wellsSettings.nextDepositDate)}` : undefined} />
              <div className="hidden sm:block"><Stat label="Next charge" value={sortedSubscriptions[0] ? fmt(sortedSubscriptions[0].price) : '—'} sub={sortedSubscriptions[0] ? `${sortedSubscriptions[0].name}, ${fmtD(sortedSubscriptions[0].nextPaymentDate)}` : undefined} /></div>
            </div>
          </Panel>

          <div className="overflow-x-auto no-scrollbar">
            <Segmented size="sm" value={subTab} onChange={v => setSubTab(v as typeof subTab)} options={[
              { value: 'list', label: 'All' },
              { value: 'calendar', label: 'Calendar' },
              { value: 'total', label: 'By category' },
              { value: 'wells', label: `${wellsSettings.accountName || 'Wells'} account` },
            ]} />
          </div>

          {subTab === 'list' && (
            subscriptions.length === 0 ? (
              <EmptyState title="No subscriptions yet" sub="Track recurring charges and what your account needs to cover them." action={<Button variant="primary" onClick={onAdd}><Plus size={15} /> Add subscription</Button>} />
            ) : (
              <Panel pad={false}>
                <ul>
                  {[...subscriptions].sort((a, b) => {
                    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
                    return new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
                  }).map((sub, i) => (
                    <li key={sub.id} className="flex items-center gap-3 px-4 sm:px-5 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined, opacity: sub.status === 'cancelled' ? 0.55 : 1 }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                          {sub.name}{sub.status === 'cancelled' && <span className="ml-2 text-[11px] font-normal" style={{ color: theme.subtext }}>Cancelled</span>}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{sub.category} · {sub.paymentAccount}{sub.status === 'active' ? ` · Next ${fmtD(sub.nextPaymentDate)}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-semibold tnum" style={{ color: theme.text }}>{fmt(sub.price)}</p>
                        <p className="text-[11px] tnum" style={{ color: theme.subtext }}>{fmt(getMonthlyEquivalent(sub))}/mo</p>
                      </div>
                      <RowMenu label={`More actions for ${sub.name}`} items={[
                        { label: 'Edit', icon: Edit3, onClick: () => { setShowAddSubscription(false); startEditSubscription(sub) } },
                        { label: sub.status === 'active' ? 'Mark cancelled' : 'Reactivate', icon: sub.status === 'active' ? X : Check, onClick: () => toggleSubscriptionStatus(sub.id) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteSubscription(sub.id) },
                      ]} />
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          )}

          {subTab === 'calendar' && (
            <Panel>
              <SubscriptionCalendar
                subscriptions={subscriptions}
                month={subCalMonth}
                year={subCalYear}
                onMonthChange={(dir) => {
                  let m = subCalMonth + dir, y = subCalYear
                  if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
                  setSubCalMonth(m); setSubCalYear(y); setSubSelectedDay(null)
                }}
                onDayClick={(d) => setSubSelectedDay(d === 0 ? null : d)}
                selectedDay={subSelectedDay}
                theme={theme}
              />
            </Panel>
          )}

          {subTab === 'total' && (
            <Panel>
              <PanelTitle title="Monthly cost by category" right={<span className="text-[15px] font-semibold tnum" style={{ color: theme.text }}>{fmt(monthlySubscriptionTotal)}</span>} />
              {subscriptionCategoryTotals.length === 0 ? <p className="text-[13px]" style={{ color: theme.subtext }}>No active subscriptions.</p> : (
                <div className="space-y-3">
                  {subscriptionCategoryTotals.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-[13px] mb-1.5">
                        <span style={{ color: theme.text }}>{cat}</span>
                        <span className="tnum" style={{ color: theme.text }}>{fmt(amt)}/mo <span className="text-xs" style={{ color: theme.subtext }}>{monthlySubscriptionTotal > 0 ? `${Math.round((amt / monthlySubscriptionTotal) * 100)}%` : ''}</span></span>
                      </div>
                      <Bar pct={monthlySubscriptionTotal > 0 ? (amt / monthlySubscriptionTotal) * 100 : 0} color={theme.accent} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {subTab === 'wells' && (
            <div className="grid gap-4 md:gap-5 md:grid-cols-2 items-start">
              <Panel>
                <PanelTitle title="Account settings" sub="Used to work out what this account needs to hold" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Account name"><input value={wellsSettings.accountName} onChange={e => saveWellsSettings({ ...wellsSettings, accountName: e.target.value })} placeholder="Wells" {...field} /></Field>
                  <Field label="Deposits">
                    <select value={wellsSettings.depositFreq} onChange={e => saveWellsSettings({ ...wellsSettings, depositFreq: e.target.value as WellsSettings['depositFreq'] })} {...field}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="manual">Manual / irregular</option>
                    </select>
                  </Field>
                  <Field label="Next deposit date" className="col-span-2"><input type="date" value={wellsSettings.nextDepositDate} onChange={e => saveWellsSettings({ ...wellsSettings, nextDepositDate: e.target.value })} {...field} /></Field>
                </div>
              </Panel>
              <Panel>
                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                  <Stat label="Balance needed" value={fmt(wellsRequiredBalance)} sub={wellsSettings.nextDepositDate ? `before ${fmtD(wellsSettings.nextDepositDate)}` : undefined} tone={theme.accent} />
                  <Stat label="Monthly on this account" value={fmt(wellsMonthlyTotal)} />
                  <Stat label="Needed this week" value={fmt(wellsNeededThisWeek)} />
                  <Stat label="Before next charge" value={fmt(wellsNeededBeforeNextCharge)} />
                  <div className="col-span-2"><Stat label="Recommended buffer" value={fmt(wellsRecommendedBuffer)} sub={`${Math.round((wellsSettings.bufferMultiplier || 1.15) * 100)}% of the monthly total, rounded up`} /></div>
                </div>
              </Panel>
              <Panel className="md:col-span-2">
                <PanelTitle title="Upcoming charges" sub={`Next three months on ${wellsSettings.accountName || 'Wells'}`} />
                {wellsUpcomingCharges.length === 0 ? <p className="text-[13px]" style={{ color: theme.subtext }}>No upcoming charges on this account.</p> : (
                  <ul>
                    {wellsUpcomingCharges.map((c, i) => (
                      <li key={i} className="flex items-center justify-between py-2" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                        <div>
                          <p className="text-[13.5px]" style={{ color: theme.text }}>{c.sub.name}</p>
                          <p className="text-[11.5px]" style={{ color: theme.subtext }}>{fmtD(c.date)}</p>
                        </div>
                        <span className="text-[13.5px] font-medium tnum" style={{ color: theme.text }}>{fmt(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SHEETS ═══════════════ */}

      {/* Add / edit bill — one form */}
      <Sheet
        open={showAddForm}
        onClose={closeBillForm}
        title={editingBillId ? 'Edit bill' : 'Add bill'}
        footer={<>
          <Button className="flex-1" onClick={closeBillForm}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!formData.name || !formData.amount || !formData.due} onClick={editingBillId ? handleSaveEdit : handleAddBill}>
            {editingBillId ? 'Save changes' : 'Save bill'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Name"><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Rent, Phone" autoFocus {...field} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)"><input type="number" inputMode="decimal" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} {...field} /></Field>
            <Field label={formData.recurrence === 'one-time' ? 'Due date' : 'Start date'}><input type="date" value={formData.due} onChange={e => setFormData({ ...formData, due: e.target.value })} {...field} /></Field>
          </div>
          <Field label="Category">
            <select value={formData.cat} onChange={e => setFormData({ ...formData, cat: e.target.value })} {...field}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          {formData.cat === 'Other' && (
            <Field label="Custom category"><input value={customCategory} onChange={e => setCustomCategory(e.target.value)} {...field} /></Field>
          )}
          <Field group label="Repeats">
            <Choice value={formData.recurrence} onChange={v => setFormData({ ...formData, recurrence: v })} options={[
              { value: 'one-time', label: 'One time' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' }, { value: 'custom', label: 'Custom' },
            ]} />
          </Field>
          {formData.recurrence === 'custom' && (
            <Field label="Days between payments"><input type="number" min="1" value={formData.customRecurrenceDays} onChange={e => setFormData({ ...formData, customRecurrenceDays: e.target.value })} {...field} /></Field>
          )}
          {formData.recurrence !== 'one-time' && (
            <>
              <Field group label="Ends" hint="The bill won't show before its start date.">
                <Choice value={formData.recurrenceEndType} onChange={v => setFormData({ ...formData, recurrenceEndType: v })} options={[
                  { value: 'ongoing', label: 'Never' }, { value: 'after-date', label: 'On a date' }, { value: 'after-count', label: 'After a number of times' },
                ]} />
              </Field>
              {formData.recurrenceEndType === 'after-date' && (
                <Field label="End date"><input type="date" value={formData.recurrenceEndDate} onChange={e => setFormData({ ...formData, recurrenceEndDate: e.target.value })} {...field} /></Field>
              )}
              {formData.recurrenceEndType === 'after-count' && (
                <Field label="Number of payments"><input type="number" min="1" value={formData.recurrenceEndAfter} onChange={e => setFormData({ ...formData, recurrenceEndAfter: e.target.value })} {...field} /></Field>
              )}
              {formData.due && (
                <Disclosure open={showOccurrencePreview} onToggle={() => setShowOccurrencePreview(o => !o)} title={<span className="text-xs" style={{ color: theme.subtext }}>Preview upcoming dates</span>}>
                  {(() => {
                    const tempBill: Bill = {
                      id: 'preview', name: formData.name, amount: parseFloat(formData.amount) || 0,
                      cat: formData.cat, due: formData.due, freq: formData.freq, recurrence: formData.recurrence,
                      customRecurrenceDays: formData.recurrence === 'custom' ? parseInt(formData.customRecurrenceDays) : undefined,
                      recurrenceEndDate: formData.recurrenceEndDate, recurrenceEndAfter: parseInt(formData.recurrenceEndAfter) || undefined,
                      status: 'upcoming', alloc: [],
                    }
                    const dates = getRecurringBillDates(tempBill, 3)
                    return (
                      <ul className="rounded-xl px-3" style={{ backgroundColor: `${theme.text}06` }}>
                        {dates.slice(0, 5).map((d, i) => (
                          <li key={i} className="flex justify-between py-1.5 text-[13px] tnum" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                            <span style={{ color: theme.text }}>{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span style={{ color: theme.subtext }}>{fmt(parseFloat(formData.amount) || 0)}</span>
                          </li>
                        ))}
                        {dates.length > 5 && <li className="py-1.5 text-xs" style={{ color: theme.subtext }}>and {dates.length - 5} more</li>}
                      </ul>
                    )
                  })()}
                </Disclosure>
              )}
            </>
          )}
        </div>
      </Sheet>

      {/* Add / edit credit card */}
      <Sheet
        open={showAddCard || !!editingCardId}
        onClose={closeCardForm}
        title={editingCardId ? `Edit ${creditCards.find(c => c.id === editingCardId)?.name || 'card'}` : 'Add credit card'}
        sub={editingCardId ? 'Payments already marked paid are kept; the rest of the plan is recalculated.' : 'We build a month by month payoff plan from these numbers.'}
        footer={<>
          {editingCardId && <Button variant="danger" ariaLabel="Delete card" onClick={() => { deleteCard(editingCardId); cancelEditCard() }}><Trash2 size={14} /></Button>}
          <Button className="flex-1" onClick={closeCardForm}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!cardForm.name || !cardForm.balance} onClick={editingCardId ? saveEditCard : addCreditCard}>
            {editingCardId ? 'Save changes' : 'Create plan'}
          </Button>
        </>}
      >
        {cardFormFields}
      </Sheet>

      {/* Add / edit subscription */}
      <Sheet
        open={showAddSubscription || !!editingSubscriptionId}
        onClose={closeSubForm}
        title={editingSubscriptionId ? 'Edit subscription' : 'Add subscription'}
        footer={<>
          <Button className="flex-1" onClick={closeSubForm}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!subForm.name || !subForm.price} onClick={editingSubscriptionId ? saveEditSubscription : addSubscription}>
            {editingSubscriptionId ? 'Save changes' : 'Add subscription'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" className="col-span-2"><input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="e.g. Netflix" {...field} /></Field>
          <Field label="Price ($)"><input type="number" inputMode="decimal" value={subForm.price} onChange={e => setSubForm({ ...subForm, price: e.target.value })} {...field} /></Field>
          <Field label="Category">
            <select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} {...field}>
              {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Billing date"><input type="date" value={subForm.billingDate} onChange={e => setSubForm({ ...subForm, billingDate: e.target.value })} {...field} /></Field>
          <Field label="Repeats">
            <select value={subForm.frequency} onChange={e => setSubForm({ ...subForm, frequency: e.target.value as SubscriptionFrequency })} {...field}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom (days)</option>
            </select>
          </Field>
          {subForm.frequency === 'custom' && (
            <Field label="Every how many days" className="col-span-2"><input type="number" value={subForm.customFrequencyDays} onChange={e => setSubForm({ ...subForm, customFrequencyDays: e.target.value })} {...field} /></Field>
          )}
          <Field label="Paid from"><input value={subForm.paymentAccount} onChange={e => setSubForm({ ...subForm, paymentAccount: e.target.value })} placeholder="Wells" {...field} /></Field>
          <Field label="Status">
            <select value={subForm.status} onChange={e => setSubForm({ ...subForm, status: e.target.value as SubscriptionStatus })} {...field}>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
        </div>
      </Sheet>

      {/* Pay a bill (full or partial) */}
      {(() => {
        const bill = partialPayId ? bills.find(b => b.id === partialPayId) : null
        const close = () => { setPartialPayId(null); setPaymentTargetDate(null) }
        if (!bill) return <Sheet open={false} onClose={close} title="">{null}</Sheet>
        // What is still owed in the cycle this payment applies to.
        const tDate = paymentTargetDate || localDate()
        const mcd = new Date(tDate + 'T00:00:00')
        const billTotal = getCycleRemaining(bill, mcd.getMonth(), mcd.getFullYear()) || bill.amount
        const enteredAmount = parseFloat(partialPayAmount) || 0
        const clampedAmount = Math.min(enteredAmount, billTotal)
        const fillPct = billTotal > 0 ? Math.min((clampedAmount / billTotal) * 100, 100) : 0
        const remaining = Math.max(billTotal - clampedAmount, 0)
        const isFullPayment = clampedAmount >= billTotal
        let cycleNote: string | null = null
        if (paymentTargetDate) {
          const now = new Date()
          if (mcd.getMonth() !== now.getMonth() || mcd.getFullYear() !== now.getFullYear()) {
            cycleNote = `${paymentTargetDate > localDate(now) ? 'Advance payment' : 'Back-dated payment'} for the ${mcd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} cycle`
          }
        }
        return (
          <Sheet
            open
            onClose={close}
            title={`Pay ${bill.name}`}
            sub={<>Owed this cycle: <span className="tnum font-medium" style={{ color: theme.text }}>{fmt(billTotal)}</span>{cycleNote && <span className="block mt-1" style={{ color: theme.accent }}>{cycleNote}</span>}</>}
            footer={
              <Button className="flex-1" variant="primary" disabled={clampedAmount <= 0} onClick={handleApplyPartialPayment}>
                {clampedAmount <= 0 ? 'Enter an amount' : isFullPayment ? `Pay in full · ${fmt(clampedAmount)}` : `Pay part · ${fmt(clampedAmount)}`}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Full', sub: fmt(billTotal), mode: 'full' as const, amount: billTotal },
                  { label: 'Half', sub: fmt(billTotal / 2), mode: 'half' as const, amount: billTotal / 2 },
                  { label: 'Custom', sub: 'Any amount', mode: 'custom' as const, amount: null },
                ].map(opt => {
                  const on = partialPayMode === opt.mode
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => { setPartialPayMode(opt.mode); if (opt.amount !== null) setPartialPayAmount(String(opt.amount)) }}
                      className="rounded-xl px-3 py-2.5 text-left transition-colors"
                      style={{ border: `1px solid ${on ? theme.accent : theme.border}`, backgroundColor: on ? `${theme.accent}14` : 'transparent' }}
                      aria-pressed={on}
                    >
                      <p className="text-[13px] font-medium" style={{ color: theme.text }}>{opt.label}</p>
                      <p className="text-[11.5px] tnum" style={{ color: theme.subtext }}>{opt.sub}</p>
                    </button>
                  )
                })}
              </div>
              {partialPayMode === 'custom' && (
                <Field label="Amount ($)">
                  <input type="number" inputMode="decimal" value={partialPayAmount} onChange={e => setPartialPayAmount(e.target.value)} autoFocus step="0.01" min="0" max={billTotal} {...field} className={`${field.className} text-[18px] font-semibold h-12`} />
                </Field>
              )}
              <div>
                <div className="flex justify-between text-xs mb-1.5 tnum">
                  <span style={{ color: theme.subtext }}>Paying {fmt(clampedAmount)}</span>
                  <span style={{ color: remaining > 0 ? theme.warn : theme.ok }}>{remaining > 0 ? `${fmt(remaining)} left after this` : 'Paid in full'}</span>
                </div>
                <Bar pct={fillPct} color={isFullPayment ? theme.ok : theme.accent} />
              </div>
            </div>
          </Sheet>
        )
      })()}

      {/* Pay all bills still owed this month */}
      <Sheet
        open={showPayAll}
        onClose={() => setShowPayAll(false)}
        title={`Pay all bills in ${monthName}`}
        sub={<>Marks {payAllBills.length} bill{payAllBills.length === 1 ? '' : 's'} paid in full: <span className="tnum font-medium" style={{ color: theme.text }}>{fmt(unpaidTotal)}</span></>}
        footer={<>
          <Button className="flex-1" onClick={() => setShowPayAll(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!payAllBills.length} onClick={handlePayAll}>Pay all · {fmt(unpaidTotal)}</Button>
        </>}
      >
        <ul className="rounded-xl px-3" style={{ border: `1px solid ${theme.border}` }}>
          {payAllBills.map((b, i) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
              <div className="min-w-0">
                <p className="text-[13.5px] truncate" style={{ color: theme.text }}>{b.name}</p>
                <p className="text-[11.5px]" style={{ color: theme.subtext }}>Due {fmtD(getEffectiveBillDate(b))}</p>
              </div>
              <span className="text-[13.5px] font-medium tnum shrink-0" style={{ color: theme.text }}>{fmt(cycleRemaining(b, calMonth, calYear))}</span>
            </li>
          ))}
        </ul>
      </Sheet>

      {/* Split a bill */}
      <Sheet
        open={!!splitModalBillId}
        onClose={() => setSplitModalBillId(null)}
        title="Split into payments"
        sub={(() => { const b = bills.find(x => x.id === splitModalBillId); return b ? `${b.name} · ${fmt(b.amount)}, one payment a week starting ${fmtD(b.due)}` : null })()}
      >
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map(num => {
            const b = bills.find(x => x.id === splitModalBillId)
            return (
              <button
                key={num}
                onClick={() => splitModalBillId && handleApplySplit(splitModalBillId, num)}
                className="rounded-xl px-3 py-3 text-left transition-colors hover:opacity-90"
                style={{ border: `1px solid ${theme.border}` }}
              >
                <p className="text-[14px] font-semibold" style={{ color: theme.text }}>{num} payments</p>
                {b && <p className="text-[11.5px] tnum" style={{ color: theme.subtext }}>{fmt(b.amount / num)} each</p>}
              </button>
            )
          })}
        </div>
      </Sheet>
    </PageShell>
  )
}
