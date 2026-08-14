'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Check, AlertCircle, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Edit3, Home, Car, CreditCard, Heart, Utensils, BookOpen, Zap, Plus, RefreshCw, Landmark } from 'lucide-react'
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
import CalendarPicker from '@/components/CalendarPicker'
import { orcaEvents } from '@/lib/eventBus'

// ── Progressive form step type ──
type FormStep = 1 | 2 | 3

/**
 * Returns the effective display status of a bill for a given calendar month/year.
 * For recurring bills that are stored as 'paid', the paid status only applies
 * to the specific cycle in which payment was made. All other cycles show as 'upcoming'.
 * This prevents recurring bills from disappearing permanently after being paid once.
 */
function getBillEffectiveStatus(bill: Bill, calMonth: number, calYear: number): 'upcoming' | 'paid' {
  const recurrence = bill.recurrence || 'one-time'
  const cycleAllocs = (recurrence !== 'one-time' && bill.alloc.length > 0)
    ? bill.alloc.filter(a => {
        const ad = new Date(a.date + 'T00:00:00')
        return ad.getMonth() === calMonth && ad.getFullYear() === calYear
      })
    : bill.alloc

  const totalAllocPaid = cycleAllocs.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0)
  if (cycleAllocs.length > 0 && totalAllocPaid >= bill.amount) return 'paid'

  if (bill.status !== 'paid') return bill.status as 'upcoming' | 'paid'
  // One-time bills: paid is permanent
  if (!bill.recurrence || bill.recurrence === 'one-time') return 'paid'
  // No paidDate means legacy data — treat as paid
  if (!bill.paidDate) return 'paid'

  const pd = new Date(bill.paidDate + 'T00:00:00')

  if (bill.recurrence === 'monthly') {
    if (pd.getMonth() === calMonth && pd.getFullYear() === calYear) return 'paid'
    return 'upcoming'
  }
  if (bill.recurrence === 'yearly') {
    if (pd.getFullYear() === calYear) return 'paid'
    return 'upcoming'
  }
  if (bill.recurrence === 'weekly' || bill.recurrence === 'custom') {
    // Use the first day of the viewed month as the reference point so that
    // viewing past/future months gives a stable, cycle-correct result.
    const intervalDays = bill.recurrence === 'weekly' ? 7 : (bill.customRecurrenceDays || 30)
    const viewRef = new Date(calYear, calMonth, 1)
    viewRef.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((viewRef.getTime() - pd.getTime()) / 86400000)
    // Paid if the viewRef falls within one interval after the paidDate
    if (diffDays >= 0 && diffDays < intervalDays) return 'paid'
    return 'upcoming'
  }
  return 'paid'
}

// Returns true if a recurring bill occurrence falls within its active start/end window.
// `occurrenceDate` is the candidate date for this cycle; `occurrenceIndex` is the
// zero-based count of this occurrence since the bill's start date (used for the
// "after N times" end condition).
function isBillOccurrenceActive(bill: Bill, occurrenceDate: Date, occurrenceIndex: number): boolean {
  const start = new Date(bill.due + 'T00:00:00')
  if (occurrenceDate < start) return false
  if (bill.recurrenceEndType === 'after-date' && bill.recurrenceEndDate) {
    if (occurrenceDate > new Date(bill.recurrenceEndDate + 'T00:00:00')) return false
  }
  if (bill.recurrenceEndType === 'after-count' && bill.recurrenceEndAfter) {
    if (occurrenceIndex >= bill.recurrenceEndAfter) return false
  }
  return true
}

function monthlyOccurrenceIndex(start: Date, y: number, m: number): number {
  return (y - start.getFullYear()) * 12 + (m - start.getMonth())
}

function yearlyOccurrenceIndex(start: Date, y: number): number {
  return y - start.getFullYear()
}

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
    cells.push(<div key={`empty-${i}`} className="aspect-square" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d)
    const isToday = d === todayDay
    const hasBill = dayEvents.length > 0
    const allPaid = dayEvents.length > 0 && dayEvents.every(e => e.paid)

    cells.push(
      <div
        key={d}
        onClick={() => onDayClick?.(d)}
        className="aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs sm:text-sm transition-all cursor-pointer"
        style={{
          backgroundColor: isToday
            ? `${theme.gold}33`
            : selectedDay === d
            ? `${theme.gold}1a`
            : hasBill && !allPaid && selectedDay !== d
            ? `${theme.bad}1a`
            : allPaid && selectedDay !== d
            ? `${theme.ok}1a`
            : 'transparent',
          border: isToday
            ? `1px solid ${theme.gold}`
            : selectedDay === d
            ? `1px solid ${theme.gold}80`
            : 'none',
        }}
      >
        <span className="font-medium" style={{ color: isToday ? theme.gold : hasBill ? theme.text : theme.textM }}>
          {d}
        </span>
        {hasBill && (
          <div className="flex gap-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map((ev, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.paid ? theme.ok : ev.type === 'split' ? '#f59e0b' : theme.bad }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-full box-border">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => onMonthChange(-1)} className={`p-2 rounded-lg transition-colors`} style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.accent} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Calendar size={18} style={{ color: theme.accent }} />
          <h3 className="font-bold text-lg" style={{ color: theme.text }}>{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className={`p-2 rounded-lg transition-colors`} style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.accent} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs font-semibold py-1" style={{ color: theme.textM }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>

      <div className="flex gap-4 mt-4 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.bad }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textM }}>Unpaid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textM }}>Split</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.ok }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textM }}>Paid</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && selectedDay > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => onDayClick?.(0)} className="text-xs hover:color" style={{ color: theme.textM }}>Close</button>
          </div>
          {getEventsForDay(selectedDay).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDay(selectedDay).map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: `${theme.card}60` }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: ev.paid ? theme.ok : ev.type === 'split' ? '#f59e0b' : theme.bad }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.text }}>{ev.label}</p>
                      <p className="text-xs" style={{ color: theme.textM }}>
                        {new Date(year, month, selectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold" style={{ color: ev.paid ? theme.ok : theme.bad }}>
                    -{fmt(ev.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: theme.textM }}>No bills due this day</p>
          )}
        </div>
      )}
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
    cells.push(<div key={`empty-${i}`} className="aspect-square" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = eventsByDay.get(d) || []
    const isToday = d === todayDay
    const hasSub = dayEvents.length > 0

    cells.push(
      <div
        key={d}
        onClick={() => onDayClick?.(d)}
        className="aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs sm:text-sm transition-all cursor-pointer"
        style={{
          backgroundColor: isToday ? `${theme.gold}33` : selectedDay === d ? `${theme.gold}1a` : hasSub && selectedDay !== d ? `${theme.accent}1a` : 'transparent',
          border: isToday ? `1px solid ${theme.gold}` : selectedDay === d ? `1px solid ${theme.gold}80` : 'none',
        }}
      >
        <span className="font-medium" style={{ color: isToday ? theme.gold : hasSub ? theme.text : theme.textM }}>
          {d}
        </span>
        {hasSub && (
          <div className="flex gap-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const selectedDayEvents = selectedDay ? (eventsByDay.get(selectedDay) || []) : []

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-full box-border">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-lg transition-colors" style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.accent} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <RefreshCw size={18} style={{ color: theme.accent }} />
          <h3 className="font-bold text-lg" style={{ color: theme.text }}>{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-lg transition-colors" style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.accent} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs font-semibold py-1" style={{ color: theme.textM }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{cells}</div>

      {selectedDay && selectedDay > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => onDayClick?.(0)} className="text-xs" style={{ color: theme.textM }}>Close</button>
          </div>
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDayEvents.map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: `${theme.card}60` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>{ev.name}</p>
                    <p className="text-xs" style={{ color: theme.textM }}>{ev.category}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: theme.accent }}>-{fmt(ev.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: theme.textM }}>No subscriptions due this day</p>
          )}
        </div>
      )}
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
  // Index for cycling through upcoming bills in the hero card
  const [nextDueIndex, setNextDueIndex] = useState(0)

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

  // Returns true if a bill has any relevant occurrence in the given calendar month/year —
  // i.e. it is on/after its start date and not yet past its end date (or occurrence count).
  const isBillVisibleInCycle = (b: Bill, cMonth: number, cYear: number): boolean => {
    const recurrence = b.recurrence || 'one-time'
    const monthStart = new Date(cYear, cMonth, 1)
    const monthEnd = new Date(cYear, cMonth + 1, 0)

    if (b.alloc.length > 0) {
      const hasCurrentCycleAlloc = b.alloc.some(a => {
        const ad = new Date(a.date + 'T00:00:00')
        return ad.getMonth() === cMonth && ad.getFullYear() === cYear
      })
      // One-time bills: their alloc entries are the sole source of truth
      if (recurrence === 'one-time') return hasCurrentCycleAlloc
      // Recurring bills: current-cycle allocs keep the bill visible this month,
      // but stale (past-cycle) allocs must NOT hide the bill in future months —
      // fall through to recurrence-based logic below in either case.
      if (hasCurrentCycleAlloc) return true
    }

    const dueDate = new Date(b.due + 'T00:00:00')

    if (recurrence === 'monthly') {
      const day = Math.min(dueDate.getDate(), monthEnd.getDate())
      const candidate = new Date(cYear, cMonth, day)
      return isBillOccurrenceActive(b, candidate, monthlyOccurrenceIndex(dueDate, cYear, cMonth))
    }
    if (recurrence === 'yearly') {
      if (dueDate.getMonth() !== cMonth) return false
      const candidate = new Date(cYear, cMonth, dueDate.getDate())
      return isBillOccurrenceActive(b, candidate, yearlyOccurrenceIndex(dueDate, cYear))
    }
    if (recurrence === 'one-time' || !recurrence) {
      return dueDate.getMonth() === cMonth && dueDate.getFullYear() === cYear
    }
    // Weekly / custom — check if any occurrence lands in the month
    const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
    const cursor = new Date(dueDate)
    let occurrenceIndex = 0
    if (cursor < monthStart) {
      const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
      cursor.setDate(cursor.getDate() + gap)
      occurrenceIndex = Math.round(gap / intervalDays)
    }
    while (cursor <= monthEnd) {
      if (cursor >= monthStart && cursor >= dueDate && isBillOccurrenceActive(b, cursor, occurrenceIndex)) return true
      cursor.setDate(cursor.getDate() + intervalDays)
      occurrenceIndex++
    }
    return false
  }

  // Calculate unpaid total — subtracts any partial payments made in this billing cycle
  const unpaidTotal = bills
    .filter(b => isBillVisibleInCycle(b, calMonth, calYear) && getBillEffectiveStatus(b, calMonth, calYear) === 'upcoming')
    .reduce((sum, b) => {
      const rec = b.recurrence || 'one-time'
      const cycleAllocs = (rec !== 'one-time' && b.alloc.length > 0)
        ? b.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === calMonth && ad.getFullYear() === calYear })
        : b.alloc
      const partialPaid = cycleAllocs.filter(a => a.paid).reduce((s, a) => s + a.amount, 0)
      return sum + Math.max(0, b.amount - partialPaid)
    }, 0)

  // Calculate paid total — uses effective status for the currently viewed month
  const paidTotal = bills
    .filter(b => isBillVisibleInCycle(b, calMonth, calYear) && getBillEffectiveStatus(b, calMonth, calYear) === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)


  // Full ordered list of upcoming bill instances used by the hero carousel.
  // Monthly recurring bills show their NEXT unpaid occurrence (current or future months).
  // This allows future-month bills to appear and be paid in advance.
  const upcomingBillsForHero = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const candidates: { name: string; due: string; amount: number; isSplit: boolean; billId: string }[] = []

    bills.forEach(b => {
      // Only treat allocs as a split-schedule when there are UNPAID future alloc entries.
      // If all allocs are already paid (partial payment records from past cycles), fall
      // through to the normal recurrence logic so the bill keeps appearing in future months.
      const hasUnpaidFutureAlloc = b.alloc.some(
        (a: any) => !a.paid && new Date(a.date + 'T00:00:00') >= today
      )
      if (hasUnpaidFutureAlloc) {
        b.alloc.forEach((a: any) => {
          if (!a.paid) candidates.push({ name: b.name, due: a.date, amount: a.amount, isSplit: true, billId: b.id })
        })
        return
      }

      const recurrence = b.recurrence || 'one-time'
      const dueDate = new Date(b.due + 'T00:00:00')

      if (recurrence === 'monthly') {
        // Walk forward up to 6 months to find the next unpaid occurrence
        for (let offset = 0; offset < 6; offset++) {
          const tMon = (today.getMonth() + offset) % 12
          const tYear = today.getFullYear() + Math.floor((today.getMonth() + offset) / 12)
          const daysInMon = new Date(tYear, tMon + 1, 0).getDate()
          const targetDay = Math.min(dueDate.getDate(), daysInMon)
          const targetDate = new Date(tYear, tMon, targetDay)
          if (targetDate < dueDate) continue // hasn't started yet
          if (!isBillOccurrenceActive(b, targetDate, monthlyOccurrenceIndex(dueDate, tYear, tMon))) break // past end date/count
          const targetStr = targetDate.toISOString().split('T')[0]
          const isPaid = getBillEffectiveStatus(b, tMon, tYear) === 'paid'
          if (!isPaid) {
            candidates.push({ name: b.name, due: targetStr, amount: b.amount, isSplit: false, billId: b.id })
            break // Only the single next unpaid occurrence per monthly bill
          }
        }
      } else if (recurrence === 'yearly') {
        // Use getBillEffectiveStatus scoped to the bill's own due month/year so that
        // yearly bills reappear correctly in future years after being paid once.
        const dueDate2 = new Date(b.due + 'T00:00:00')
        const candidateDate = new Date(today.getFullYear(), dueDate2.getMonth(), dueDate2.getDate())
        if (isBillOccurrenceActive(b, candidateDate, yearlyOccurrenceIndex(dueDate2, today.getFullYear()))) {
          const isPaid = getBillEffectiveStatus(b, dueDate2.getMonth(), today.getFullYear()) === 'paid'
          if (!isPaid) candidates.push({ name: b.name, due: b.due, amount: b.amount, isSplit: false, billId: b.id })
        }
      } else if (recurrence === 'one-time') {
        if (b.status !== 'paid') candidates.push({ name: b.name, due: b.due, amount: b.amount, isSplit: false, billId: b.id })
      } else {
        // Weekly / custom — check effective status for current month so paid status resets properly
        const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
        const occurrenceIndex = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (86400000 * intervalDays)))
        if (isBillOccurrenceActive(b, today, occurrenceIndex)) {
          const isPaid = getBillEffectiveStatus(b, today.getMonth(), today.getFullYear()) === 'paid'
          if (!isPaid) candidates.push({ name: b.name, due: b.due, amount: b.amount, isSplit: false, billId: b.id })
        }
      }
    })

    candidates.sort((a, b) => a.due.localeCompare(b.due))
    return candidates
  }, [bills])

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
  const getCycleRemaining = (bill: Bill, cMonth: number, cYear: number): number => {
    const rec = bill.recurrence || 'one-time'
    const relevant = (rec !== 'one-time' && bill.alloc.length > 0)
      ? bill.alloc.filter(a => {
          const ad = new Date(a.date + 'T00:00:00')
          return ad.getMonth() === cMonth && ad.getFullYear() === cYear
        })
      : bill.alloc
    const paid = relevant.filter(a => a.paid).reduce((s, a) => s + a.amount, 0)
    return Math.max(0, bill.amount - paid)
  }

  // Returns the bill's effective due date within the currently viewed calendar month/year.
  // For monthly bills this is the same day-of-month clamped to the viewed month's length.
  // For yearly bills the year is updated to calYear.
  // All other recurrence types return the original due date unchanged.
  // This date is passed to handlePayFull so that paidDate is stamped to the correct
  // billing cycle even when paying from the list/compact view of a future or past month.
  const getEffectiveBillDate = (bill: Bill): string => {
    const dueDate = new Date(bill.due + 'T00:00:00')
    const recurrence = bill.recurrence || 'one-time'
    if (recurrence === 'monthly') {
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
      const day = Math.min(dueDate.getDate(), daysInMonth)
      return new Date(calYear, calMonth, day).toISOString().split('T')[0]
    }
    if (recurrence === 'yearly') {
      const daysInMonth = new Date(calYear, dueDate.getMonth() + 1, 0).getDate()
      const day = Math.min(dueDate.getDate(), daysInMonth)
      return new Date(calYear, dueDate.getMonth(), day).toISOString().split('T')[0]
    }
    return bill.due
  }

  // Handler: open the payment bottom-sheet for a bill.
  // `targetDueDate` pins the payment to the correct billing cycle (past, current, or future).
  // Always pass getEffectiveBillDate(bill) from list/compact view so that paidDate is
  // stamped with the viewed-month's date and getBillEffectiveStatus resolves correctly.
  const handlePayFull = (billId: string, targetDueDate?: string) => {
    const bill = bills.find(b => b.id === billId)
    if (!bill) return
    const today = new Date().toISOString().split('T')[0]
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

    const today = new Date().toISOString().split('T')[0]
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

    const rec = bill.recurrence || 'one-time'

    if (effectiveAmount >= remaining) {
      // Full (or completing) payment for this cycle.
      // For recurring bills keep alloc entries from OTHER cycles intact —
      // only remove the entries that belong to this billing cycle.
      const allocAfterPay = rec !== 'one-time'
        ? bill.alloc.filter(a => {
            const ad = new Date(a.date + 'T00:00:00')
            return !(ad.getMonth() === cycleMonth && ad.getFullYear() === cycleYear)
          })
        : []
      persistBills(bills.map(b =>
        b.id === partialPayId
          ? { ...b, status: 'paid' as const, paidDate: effectiveDate, alloc: allocAfterPay }
          : b
      ))
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
      const dueDate = new Date(b.due)

      for (let i = 0; i < numPayments; i++) {
        const paymentDate = new Date(dueDate)
        paymentDate.setDate(paymentDate.getDate() + i * 7)

        alloc.push({
          id: gid(),
          date: paymentDate.toISOString().split('T')[0],
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

  // Framer motion variants
  const container = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  const visibleBills = getVisibleBills()

  if (loading) {
    return (
      <div style={{ backgroundColor: theme.bg }} className="min-h-screen flex items-center justify-center">
        <div style={{ color: theme.text }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: theme.bg }} className="w-full min-h-screen pb-20 overflow-x-hidden max-w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6 sm:py-4 lg:px-8 lg:py-4"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Bill Boss</h1>
            <p className="text-sm mt-1" style={{ color: theme.textM }}>Manage your monthly bills</p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setTimeout(() => { const el = document.getElementById('bill-boss-add-form'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}
            className="shrink-0 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 hover:opacity-90"
            style={{ backgroundColor: theme.accent, color: '#fff' }}
          >
            Add Bill
          </button>
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {/* 1. Hero Card - Total Monthly Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-8 w-full max-w-full box-border" style={{ backgroundImage: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`, color: '#fff' }}>
            <div className="text-center mb-6">
              <p className="text-sm font-medium opacity-80 mb-2">Total Monthly Bills</p>
              <p className="text-3xl sm:text-5xl font-bold mb-4 break-words">{fmt(unpaidTotal)}</p>
              <div className="rounded-full inline-flex gap-4 px-5 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div>
                  <p className="text-xs opacity-70">Paid</p>
                  <p className="text-sm font-bold">{fmt(paidTotal)}</p>
                </div>
                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <p className="text-xs opacity-70">Total</p>
                  <p className="text-sm font-bold">{fmt(unpaidTotal + paidTotal)}</p>
                </div>
              </div>
            </div>

            {/* Next Bill Due + Quick Pay — arrow-nav carousel across all upcoming bills */}
            {upcomingBillsForHero.length > 0 && (() => {
              const safeIdx = Math.min(nextDueIndex, upcomingBillsForHero.length - 1)
              const heroBill = upcomingBillsForHero[safeIdx]
              const today = new Date().toISOString().split('T')[0]
              const isFuture = heroBill.due > today
              return (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                  <div className="flex items-center gap-2">
                    {/* ← Prev */}
                    <button
                      onClick={() => setNextDueIndex(i => Math.max(0, i - 1))}
                      disabled={safeIdx === 0}
                      className="shrink-0 p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-25"
                      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                      aria-label="Previous bill"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Bill info */}
                    <div className="flex-1 min-w-0 px-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium opacity-70">Next Due</p>
                        {upcomingBillsForHero.length > 1 && (
                          <span className="text-[10px] opacity-40 font-semibold">{safeIdx + 1}/{upcomingBillsForHero.length}</span>
                        )}
                        {isFuture && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>FUTURE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-base font-bold truncate">{heroBill.name}</p>
                        {heroBill.isSplit && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>SPLIT</span>
                        )}
                      </div>
                      <p className="text-xs opacity-70">{fmtD(heroBill.due)} · {fmt(heroBill.amount)}</p>
                    </div>

                    {/* → Next */}
                    <button
                      onClick={() => setNextDueIndex(i => Math.min(upcomingBillsForHero.length - 1, i + 1))}
                      disabled={safeIdx >= upcomingBillsForHero.length - 1}
                      className="shrink-0 p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-25"
                      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                      aria-label="Next bill"
                    >
                      <ChevronRight size={16} />
                    </button>

                    {/* Pay Now */}
                    <button
                      onClick={() => handlePayFull(heroBill.billId, heroBill.due)}
                      className="shrink-0 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 hover:opacity-90"
                      style={{ backgroundColor: '#fff', color: theme.accent }}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </motion.div>

        {/* Bill Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <BillCalendar
            bills={[...bills, ...creditCards.flatMap(c => c.payments.filter(p => !p.paid).map(p => ({ id: `cc-${c.id}-${p.date}`, name: `${c.name} Payment`, amount: p.amount, cat: 'Debt', due: p.date, freq: '', recurrence: 'one-time' as const, alloc: [], status: 'unpaid' })))]}
            month={calMonth}
            year={calYear}
            onMonthChange={handleMonthChange}
            onDayClick={(day) => setSelectedDay(day === 0 ? null : day)}
            selectedDay={selectedDay}
            theme={theme}
          />
          {/* Monthly Bill Total for selected month */}
          <div className="mt-3 flex items-center justify-between px-2 py-2 rounded-lg" style={{ backgroundColor: `${theme.gold}10` }}>
            <span className="text-sm font-medium" style={{ color: theme.textS }}>
              {new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long' })} Bills Total
            </span>
            <span className="text-lg font-bold" style={{ color: theme.gold }}>{fmt(monthlyBillTotal)}</span>
          </div>
        </motion.div>

        {/* ── CREDIT CARD DEBT PAYOFF ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: theme.accent }} />
              <h2 className="text-sm font-bold" style={{ color: theme.text }}>Credit Card Payoff</h2>
            </div>
            {!showAddCard && (
              <button onClick={() => setShowAddCard(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
                <Plus size={11} /> Add Card
              </button>
            )}
          </div>

          {showAddCard && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: `${theme.accent}08`, border: `1px solid ${theme.accent}25` }}>
              <p className="text-xs font-bold" style={{ color: theme.accent }}>Add Credit Card Debt</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Card name *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input type="number" value={cardForm.balance} onChange={e => setCardForm({ ...cardForm, balance: e.target.value })} placeholder="Total balance *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input type="number" value={cardForm.apr} onChange={e => setCardForm({ ...cardForm, apr: e.target.value })} placeholder="APR % (e.g. 24.99)" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input type="number" value={cardForm.minPayment} onChange={e => setCardForm({ ...cardForm, minPayment: e.target.value })} placeholder="Minimum payment $" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input type="number" value={cardForm.monthlyPayment} onChange={e => setCardForm({ ...cardForm, monthlyPayment: e.target.value })} placeholder="Your monthly payment $" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input type="number" value={cardForm.dueDay} onChange={e => setCardForm({ ...cardForm, dueDay: e.target.value })} placeholder="Due day (1-28)" min="1" max="28" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddCard(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.textM }}>Cancel</button>
                <button onClick={addCreditCard} disabled={!cardForm.name || !cardForm.balance} className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40" style={{ background: theme.accent, color: '#fff' }}>Create Plan</button>
              </div>
            </div>
          )}

          {creditCards.length === 0 && !showAddCard && (
            <div className="rounded-2xl p-5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <CreditCard size={24} className="mx-auto mb-2" style={{ color: theme.textM, opacity: 0.5 }} />
              <p className="text-sm" style={{ color: theme.textM }}>No credit cards tracked yet</p>
              <p className="text-xs mt-1" style={{ color: theme.textS }}>Add a card to start your payoff plan</p>
            </div>
          )}

          {creditCards.map(card => {
            const isEditing = editingCardId === card.id
            const nextPayment = card.payments.find(p => !p.paid)
            const paidCount = card.payments.filter(p => p.paid).length
            const totalPaid = card.payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0)
            const currentBalance = nextPayment ? nextPayment.remaining + nextPayment.amount : 0
            const progressPct = card.balance > 0 ? Math.min(100, (totalPaid / card.balance) * 100) : 0
            const unpaidPayments = card.payments.filter(p => !p.paid)
            const totalInterest = unpaidPayments.reduce((s, p) => s + (p.interest || 0), 0)
            const payoffDate = unpaidPayments.length > 0 ? unpaidPayments[unpaidPayments.length - 1].date : null
            const insights = getPayoffInsights(currentBalance, card.monthlyPayment, card.apr, card.minPayment)

            if (isEditing) {
              return (
                <div key={card.id} className="rounded-2xl p-4 space-y-3" style={{ background: `${theme.accent}08`, border: `1px solid ${theme.accent}` }}>
                  <p className="text-xs font-bold" style={{ color: theme.accent }}>Edit {card.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Card name *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                    <input type="number" value={cardForm.balance} onChange={e => setCardForm({ ...cardForm, balance: e.target.value })} placeholder="Total balance *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                    <input type="number" value={cardForm.apr} onChange={e => setCardForm({ ...cardForm, apr: e.target.value })} placeholder="APR %" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                    <input type="number" value={cardForm.minPayment} onChange={e => setCardForm({ ...cardForm, minPayment: e.target.value })} placeholder="Minimum payment $" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                    <input type="number" value={cardForm.monthlyPayment} onChange={e => setCardForm({ ...cardForm, monthlyPayment: e.target.value })} placeholder="Your monthly payment $" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                    <input type="number" value={cardForm.dueDay} onChange={e => setCardForm({ ...cardForm, dueDay: e.target.value })} placeholder="Due day (1-28)" min="1" max="28" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={cancelEditCard} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.textM }}>Cancel</button>
                    <button onClick={() => deleteCard(card.id)} className="py-2 px-4 rounded-xl text-xs font-bold" style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}><Trash2 size={12} /></button>
                    <button onClick={saveEditCard} disabled={!cardForm.name || !cardForm.balance} className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40" style={{ background: theme.accent, color: '#fff' }}>Save Changes</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={card.id} className="rounded-2xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{card.name}</p>
                      <p className="text-xs" style={{ color: theme.textM }}>
                        {card.apr}% APR · ${card.monthlyPayment}/mo · {unpaidPayments.length} payments left
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditCard(card)} className="p-1.5 rounded-lg" style={{ color: theme.textM }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteCard(card.id)} className="p-1.5 rounded-lg" style={{ color: theme.textS }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: theme.textM }}>Paid: ${fmt(totalPaid)}</span>
                      <span className="font-bold" style={{ color: currentBalance > 0 ? '#EF4444' : '#10B981' }}>Remaining: ${fmt(currentBalance)}</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: theme.border }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct >= 100 ? '#10B981' : theme.accent }} />
                    </div>
                  </div>

                  {/* Payoff Strategy */}
                  {currentBalance > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: `${theme.accent}06`, border: `1px solid ${theme.accent}20` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>Payoff Strategy</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center px-2 py-1.5 rounded-lg" style={{ background: theme.bg }}>
                          <p className="text-[10px]" style={{ color: theme.textM }}>Debt Free</p>
                          <p className="text-xs font-bold" style={{ color: theme.text }}>{payoffDate ? new Date(payoffDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</p>
                        </div>
                        <div className="text-center px-2 py-1.5 rounded-lg" style={{ background: theme.bg }}>
                          <p className="text-[10px]" style={{ color: theme.textM }}>Interest Cost</p>
                          <p className="text-xs font-bold" style={{ color: '#EF4444' }}>${fmt(totalInterest)}</p>
                        </div>
                        <div className="text-center px-2 py-1.5 rounded-lg" style={{ background: theme.bg }}>
                          <p className="text-[10px]" style={{ color: theme.textM }}>Months Left</p>
                          <p className="text-xs font-bold" style={{ color: theme.text }}>{unpaidPayments.length}</p>
                        </div>
                      </div>

                      {insights.minOnly && insights.minOnly.months > insights.current.months && (
                        <div className="px-2 py-1.5 rounded-lg text-[10px]" style={{ background: '#EF444410', border: '1px solid #EF444420' }}>
                          <span style={{ color: '#EF4444' }}>Minimum-only warning: </span>
                          <span style={{ color: theme.textM }}>Paying only ${card.minPayment}/mo would take {insights.minOnly.months} months and cost ${fmt(insights.minOnly.totalInterest)} in interest</span>
                        </div>
                      )}

                      {/* Recommended: Cut payoff in half */}
                      {insights.halvePmt > card.monthlyPayment && insights.halve.months < insights.current.months && (
                        <div className="rounded-lg p-2.5" style={{ background: '#10B98112', border: '1px solid #10B98130' }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: '#10B981' }}>⚡ Recommended — Pay Off in Half the Time</p>
                          <p className="text-[10px]" style={{ color: theme.textM }}>
                            Raise your payment to <span className="font-bold" style={{ color: '#10B981' }}>${fmt(insights.halvePmt)}/mo</span> and pay off in{' '}
                            <span className="font-bold" style={{ color: theme.text }}>{insights.halve.months} months</span> instead of {insights.current.months}.
                            You'd save <span className="font-bold" style={{ color: '#10B981' }}>${fmt(insights.current.totalInterest - insights.halve.totalInterest)}</span> in interest.
                          </p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold" style={{ color: theme.textM }}>Other options:</p>
                        {[
                          { label: `+$25/mo ($${Math.round(card.monthlyPayment + 25)})`, data: insights.extra25 },
                          { label: `+$50/mo ($${Math.round(card.monthlyPayment + 50)})`, data: insights.extra50 },
                          { label: `+$100/mo ($${Math.round(card.monthlyPayment + 100)})`, data: insights.extra100 },
                        ].filter(opt => opt.data.months < insights.current.months).map(opt => {
                          const savedMonths = insights.current.months - opt.data.months
                          const savedInterest = insights.current.totalInterest - opt.data.totalInterest
                          return (
                            <div key={opt.label} className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px]" style={{ background: theme.bg }}>
                              <span className="font-bold" style={{ color: '#10B981' }}>{opt.label}</span>
                              <span style={{ color: theme.textM }}>{opt.data.months} mo</span>
                              <span style={{ color: theme.textM }}>Save ${fmt(savedInterest)}</span>
                              <span className="font-semibold" style={{ color: '#10B981' }}>{savedMonths} faster</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Next payment */}
                  {nextPayment && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: theme.bg }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: theme.text }}>Next: {new Date(nextPayment.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-[10px]" style={{ color: theme.textM }}>
                          ${fmt(nextPayment.interest || 0)} interest · ${fmt(nextPayment.amount - (nextPayment.interest || 0))} to principal
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: theme.accent }}>${fmt(nextPayment.amount)}</span>
                        <button onClick={() => markCardPayment(card.id, card.payments.indexOf(nextPayment))} className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: `${theme.accent}18`, color: theme.accent }}>
                          Paid
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upcoming schedule */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: theme.textS }}>Upcoming Payments</p>
                    {unpaidPayments.slice(0, 4).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg" style={{ background: i === 0 ? `${theme.accent}08` : 'transparent' }}>
                        <span style={{ color: theme.text }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span style={{ color: theme.textM }}>${fmt(p.amount)}</span>
                        <span className="font-semibold" style={{ color: theme.textS }}>${fmt(p.remaining)} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* ── SUBSCRIPTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} style={{ color: theme.accent }} />
              <h2 className="text-sm font-bold" style={{ color: theme.text }}>Subscriptions</h2>
            </div>
            {!showAddSubscription && subTab === 'list' && (
              <button onClick={() => setShowAddSubscription(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
                <Plus size={11} /> Add Subscription
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {([
              { key: 'list', label: 'All Subscriptions' },
              { key: 'calendar', label: 'Calendar' },
              { key: 'total', label: 'Monthly Total' },
              { key: 'wells', label: 'Wells Account' },
            ] as { key: typeof subTab; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: subTab === t.key ? theme.accent : theme.card,
                  color: subTab === t.key ? '#fff' : theme.textM,
                  border: `1px solid ${subTab === t.key ? theme.accent : theme.border}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Add / Edit Subscription Form */}
          {(showAddSubscription || editingSubscriptionId) && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: `${theme.accent}08`, border: `1px solid ${theme.accent}25` }}>
              <p className="text-xs font-bold" style={{ color: theme.accent }}>{editingSubscriptionId ? 'Edit Subscription' : 'Add Subscription'}</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="Name *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
                  {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={subForm.price} onChange={e => setSubForm({ ...subForm, price: e.target.value })} placeholder="Price *" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <select value={subForm.frequency} onChange={e => setSubForm({ ...subForm, frequency: e.target.value as SubscriptionFrequency })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom (days)</option>
                </select>
                {subForm.frequency === 'custom' && (
                  <input type="number" value={subForm.customFrequencyDays} onChange={e => setSubForm({ ...subForm, customFrequencyDays: e.target.value })} placeholder="Every N days" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                )}
                <input type="date" value={subForm.billingDate} onChange={e => setSubForm({ ...subForm, billingDate: e.target.value })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <input value={subForm.paymentAccount} onChange={e => setSubForm({ ...subForm, paymentAccount: e.target.value })} placeholder="Payment account (e.g. Wells)" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                <select value={subForm.status} onChange={e => setSubForm({ ...subForm, status: e.target.value as SubscriptionStatus })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddSubscription(false); cancelEditSubscription() }} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.textM }}>Cancel</button>
                <button
                  onClick={editingSubscriptionId ? saveEditSubscription : addSubscription}
                  disabled={!subForm.name || !subForm.price}
                  className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  {editingSubscriptionId ? 'Save Changes' : 'Add Subscription'}
                </button>
              </div>
            </div>
          )}

          {/* All Subscriptions */}
          {subTab === 'list' && (
            <div className="space-y-2">
              {subscriptions.length === 0 && !showAddSubscription && (
                <div className="rounded-2xl p-5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <RefreshCw size={24} className="mx-auto mb-2" style={{ color: theme.textM, opacity: 0.5 }} />
                  <p className="text-sm" style={{ color: theme.textM }}>No subscriptions tracked yet</p>
                  <p className="text-xs mt-1" style={{ color: theme.textS }}>Add one to start tracking recurring charges</p>
                </div>
              )}
              {[...subscriptions].sort((a, b) => {
                if (a.status !== b.status) return a.status === 'active' ? -1 : 1
                return new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
              }).map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}`, opacity: sub.status === 'cancelled' ? 0.55 : 1 }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{sub.name}</p>
                      {sub.status === 'cancelled' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${theme.textM}20`, color: theme.textM }}>CANCELLED</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: theme.textM }}>
                      {sub.category} · {sub.paymentAccount} · Next: {fmtD(sub.nextPaymentDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{fmt(sub.price)}</p>
                      <p className="text-[10px]" style={{ color: theme.textS }}>{fmt(getMonthlyEquivalent(sub))}/mo</p>
                    </div>
                    <button onClick={() => startEditSubscription(sub)} className="p-1.5 rounded-lg" style={{ color: theme.textM }}><Edit3 size={14} /></button>
                    <button onClick={() => toggleSubscriptionStatus(sub.id)} className="p-1.5 rounded-lg" style={{ color: sub.status === 'active' ? theme.bad : theme.ok }}>
                      {sub.status === 'active' ? <X size={14} /> : <Check size={14} />}
                    </button>
                    <button onClick={() => deleteSubscription(sub.id)} className="p-1.5 rounded-lg" style={{ color: theme.bad }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subscription Calendar */}
          {subTab === 'calendar' && (
            <SubscriptionCalendar
              subscriptions={subscriptions}
              month={subCalMonth}
              year={subCalYear}
              onMonthChange={(dir) => {
                let m = subCalMonth + dir, y = subCalYear
                if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
                setSubCalMonth(m); setSubCalYear(y)
              }}
              theme={theme}
            />
          )}

          {/* Monthly Subscription Total */}
          {subTab === 'total' && (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: theme.textS }}>Total Monthly Subscription Cost</span>
                <span className="text-2xl font-bold" style={{ color: theme.gold }}>{fmt(monthlySubscriptionTotal)}</span>
              </div>
              {subscriptionCategoryTotals.length > 0 && (
                <div className="space-y-2 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
                  {subscriptionCategoryTotals.map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: theme.textM }}>{cat}</span>
                      <span className="text-xs font-semibold" style={{ color: theme.text }}>{fmt(amt)}/mo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wells Subscription Account */}
          {subTab === 'wells' && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2">
                  <Landmark size={14} style={{ color: theme.accent }} />
                  <p className="text-xs font-bold" style={{ color: theme.accent }}>Wells Account Settings</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={wellsSettings.accountName} onChange={e => saveWellsSettings({ ...wellsSettings, accountName: e.target.value })} placeholder="Account name (e.g. Wells)" className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                  <select value={wellsSettings.depositFreq} onChange={e => saveWellsSettings({ ...wellsSettings, depositFreq: e.target.value as WellsSettings['depositFreq'] })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
                    <option value="weekly">Weekly deposit</option>
                    <option value="biweekly">Biweekly deposit</option>
                    <option value="monthly">Monthly deposit</option>
                    <option value="manual">Manual / irregular</option>
                  </select>
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium block mb-1" style={{ color: theme.textS }}>Next planned deposit / re-up date</label>
                    <input type="date" value={wellsSettings.nextDepositDate} onChange={e => saveWellsSettings({ ...wellsSettings, nextDepositDate: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3" style={{ background: `${theme.gold}12`, border: `1px solid ${theme.gold}30` }}>
                  <p className="text-[10px] font-medium" style={{ color: theme.textS }}>Required Wells Balance</p>
                  <p className="text-lg font-bold" style={{ color: theme.gold }}>{fmt(wellsRequiredBalance)}</p>
                  <p className="text-[10px]" style={{ color: theme.textM }}>before {fmtD(wellsSettings.nextDepositDate)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-[10px] font-medium" style={{ color: theme.textS }}>Monthly Subscription Cost</p>
                  <p className="text-lg font-bold" style={{ color: theme.text }}>{fmt(wellsMonthlyTotal)}</p>
                  <p className="text-[10px]" style={{ color: theme.textM }}>on {wellsSettings.accountName || 'Wells'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-[10px] font-medium" style={{ color: theme.textS }}>Needed This Week</p>
                  <p className="text-lg font-bold" style={{ color: theme.text }}>{fmt(wellsNeededThisWeek)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-[10px] font-medium" style={{ color: theme.textS }}>Before Next Charge</p>
                  <p className="text-lg font-bold" style={{ color: theme.text }}>{fmt(wellsNeededBeforeNextCharge)}</p>
                </div>
                <div className="rounded-xl p-3 col-span-2" style={{ background: `${theme.accent}10`, border: `1px solid ${theme.accent}30` }}>
                  <p className="text-[10px] font-medium" style={{ color: theme.textS }}>Recommended Account Buffer</p>
                  <p className="text-lg font-bold" style={{ color: theme.accent }}>{fmt(wellsRecommendedBuffer)}</p>
                  <p className="text-[10px]" style={{ color: theme.textM }}>{Math.round((wellsSettings.bufferMultiplier || 1.15) * 100)}% of monthly Wells total, rounded up</p>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs font-bold mb-2" style={{ color: theme.text }}>Upcoming Charges</p>
                {wellsUpcomingCharges.length === 0 ? (
                  <p className="text-xs" style={{ color: theme.textM }}>No upcoming charges on {wellsSettings.accountName || 'Wells'}</p>
                ) : (
                  <div className="space-y-2">
                    {wellsUpcomingCharges.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm" style={{ color: theme.text }}>{c.sub.name}</p>
                          <p className="text-[10px]" style={{ color: theme.textM }}>{fmtD(c.date)}</p>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: theme.text }}>{fmt(c.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* List / Compact Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="flex gap-3"
        >
          <button
            onClick={() => setViewMode('list')}
            style={{
              backgroundColor: viewMode === 'list' ? theme.accent : theme.card,
              color: viewMode === 'list' ? '#fff' : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-5 py-3 rounded-xl border font-bold transition-all"
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('compact')}
            style={{
              backgroundColor: viewMode === 'compact' ? theme.accent : theme.card,
              color: viewMode === 'compact' ? '#fff' : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-5 py-3 rounded-xl border font-bold transition-all"
          >
            Compact View
          </button>
        </motion.div>

        {/* 2. Add Bill Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              id="bill-boss-add-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="border rounded-2xl p-5 sm:p-8 space-y-5"
            >
              {/* ── Progressive Form Steps ── */}
              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-2">
                {([1, 2, 3] as FormStep[]).map(step => (
                  <div key={step} className="flex items-center gap-2">
                    <button
                      onClick={() => formStep > step && setFormStep(step)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        backgroundColor: formStep >= step ? theme.accent : theme.bg,
                        color: formStep >= step ? '#fff' : theme.textS,
                        border: `2px solid ${formStep >= step ? theme.accent : theme.border}`,
                        cursor: formStep > step ? 'pointer' : 'default',
                      }}
                    >{step}</button>
                    {step < 3 && <div className="h-0.5 w-8 rounded" style={{ backgroundColor: formStep > step ? theme.accent : theme.border }} />}
                  </div>
                ))}
                <span className="ml-2 text-xs font-semibold" style={{ color: theme.textS }}>
                  {formStep === 1 ? 'Basic Info' : formStep === 2 ? 'Recurrence' : 'Advanced'}
                </span>
                <button
                  onClick={() => { setShowAddForm(false); setFormStep(1); setEditingBillId(null) }}
                  className="ml-auto text-xs opacity-60 hover:opacity-100"
                  style={{ color: theme.textS }}
                >✕ Close</button>
              </div>

              <AnimatePresence mode="wait">
                {/* STEP 1: Basic Info */}
                {formStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Bill Name (e.g. Rent, Netflix)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      className="w-full px-5 py-3 border rounded-xl placeholder:opacity-50 focus:outline-none font-medium"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                        className="w-full px-5 py-3 border rounded-xl placeholder:opacity-50 focus:outline-none font-medium"
                      />
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: theme.textM }}>
                          {formData.recurrence === 'one-time' ? 'Due Date' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={formData.due}
                          onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                          className="w-full px-5 py-3 border rounded-xl focus:outline-none font-medium"
                        />
                        {formData.recurrence !== 'one-time' && (
                          <p className="text-[10px] mt-1" style={{ color: theme.textM }}>The bill won&apos;t appear before this date</p>
                        )}
                      </div>
                    </div>
                    <select
                      value={formData.cat}
                      onChange={(e) => setFormData({ ...formData, cat: e.target.value })}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      className="w-full px-5 py-3 border rounded-xl focus:outline-none font-medium"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {formData.cat === 'Other' && (
                      <input type="text" placeholder="Custom Category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                        className="w-full px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none" />
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setFormStep(2)}
                        disabled={!formData.name || !formData.amount || !formData.due}
                        style={{ backgroundColor: theme.accent, color: '#fff' }}
                        className="flex-1 px-5 py-3 rounded-xl font-bold disabled:opacity-50"
                      >Next: Recurrence →</button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Recurrence */}
                {formStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <label style={{ color: theme.textM }} className="text-sm font-medium block">How often does this bill recur?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {([
                        { value: 'one-time', label: 'One-Time' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'yearly', label: 'Yearly' },
                        { value: 'custom', label: 'Custom' },
                      ] as { value: BillRecurrence; label: string }[]).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setFormData({ ...formData, recurrence: opt.value })}
                          style={{
                            backgroundColor: formData.recurrence === opt.value ? `${theme.accent}20` : theme.bg,
                            borderColor: formData.recurrence === opt.value ? theme.accent : theme.border,
                            color: formData.recurrence === opt.value ? theme.accent : theme.textM,
                          }}
                          className="px-4 py-2.5 rounded-lg text-sm font-bold border transition-all"
                        >{opt.label}</button>
                      ))}
                    </div>
                    {formData.recurrence === 'custom' && (
                      <input type="number" placeholder="Days between each occurrence" value={formData.customRecurrenceDays}
                        onChange={(e) => setFormData({ ...formData, customRecurrenceDays: e.target.value })} min="1"
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                        className="w-full px-4 py-2.5 border rounded-lg focus:outline-none" />
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setFormStep(1)} style={{ borderColor: theme.border, color: theme.textS }}
                        className="flex-1 px-5 py-3 rounded-xl font-bold border">← Back</button>
                      <button onClick={() => setFormStep(3)} style={{ backgroundColor: theme.accent, color: '#fff' }}
                        className="flex-1 px-5 py-3 rounded-xl font-bold">Next: Advanced →</button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Advanced + Preview + Save */}
                {formStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    {formData.recurrence !== 'one-time' && (
                      <>
                        <label style={{ color: theme.textM }} className="text-sm font-medium block">End Condition</label>
                        <div className="flex gap-2">
                          {([
                            { value: 'ongoing', label: 'Ongoing' },
                            { value: 'after-date', label: 'End Date' },
                            { value: 'after-count', label: 'N Times' },
                          ] as { value: RecurrenceEndType; label: string }[]).map(opt => (
                            <button key={opt.value} type="button"
                              onClick={() => setFormData({ ...formData, recurrenceEndType: opt.value })}
                              style={{
                                backgroundColor: formData.recurrenceEndType === opt.value ? `${theme.accent}20` : theme.bg,
                                borderColor: formData.recurrenceEndType === opt.value ? theme.accent : theme.border,
                                color: formData.recurrenceEndType === opt.value ? theme.accent : theme.textM,
                              }}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all"
                            >{opt.label}</button>
                          ))}
                        </div>
                        {formData.recurrenceEndType === 'after-date' && (
                          <CalendarPicker value={formData.recurrenceEndDate || ''} onChange={(date) => setFormData({ ...formData, recurrenceEndDate: date })}
                            placeholder="End Date" theme={theme} showQuickSelect={false} />
                        )}
                        {formData.recurrenceEndType === 'after-count' && (
                          <input type="number" placeholder="Number of occurrences" value={formData.recurrenceEndAfter}
                            onChange={(e) => setFormData({ ...formData, recurrenceEndAfter: e.target.value })} min="1"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            className="w-full px-4 py-2.5 border rounded-lg focus:outline-none" />
                        )}
                      </>
                    )}

                    {/* Preview future occurrences */}
                    {formData.recurrence !== 'one-time' && formData.due && (
                      <div>
                        <button onClick={() => setShowOccurrencePreview(o => !o)} className="text-xs font-semibold" style={{ color: theme.accent }}>
                          {showOccurrencePreview ? '▲ Hide preview' : '▼ Preview future occurrences'}
                        </button>
                        {showOccurrencePreview && (() => {
                          const tempBill: Bill = { id: 'preview', name: formData.name, amount: parseFloat(formData.amount) || 0,
                            cat: formData.cat, due: formData.due, freq: formData.freq, recurrence: formData.recurrence,
                            customRecurrenceDays: formData.recurrence === 'custom' ? parseInt(formData.customRecurrenceDays) : undefined,
                            recurrenceEndDate: formData.recurrenceEndDate, recurrenceEndAfter: parseInt(formData.recurrenceEndAfter) || undefined,
                            status: 'upcoming', alloc: [] }
                          const dates = getRecurringBillDates(tempBill, 3)
                          return (
                            <div className="mt-2 rounded-xl p-3 space-y-1" style={{ background: theme.bg }}>
                              {dates.slice(0, 5).map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span style={{ color: theme.textS }}>{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  <span style={{ color: '#EF4444', fontWeight: 700 }}>−{fmt(parseFloat(formData.amount) || 0)}</span>
                                </div>
                              ))}
                              {dates.length > 5 && <p className="text-xs opacity-50" style={{ color: theme.textS }}>+{dates.length - 5} more...</p>}
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setFormStep(2)} style={{ borderColor: theme.border, color: theme.textS }}
                        className="flex-1 px-5 py-3 rounded-xl font-bold border">← Back</button>
                      {editingBillId && (
                        <button onClick={handleCancelEdit} style={{ borderColor: theme.border, color: theme.textS }}
                          className="flex-1 px-5 py-3 rounded-xl font-bold border">Cancel</button>
                      )}
                      <button
                        onClick={editingBillId ? handleSaveEdit : handleAddBill}
                        disabled={!formData.name || !formData.amount || !formData.due}
                        style={{ backgroundColor: theme.accent, color: '#fff' }}
                        className="flex-1 px-5 py-3 rounded-xl font-bold disabled:opacity-50"
                      >{editingBillId ? '✓ Update Bill' : '✓ Save Bill'}</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Bills List — List View (detailed) */}
        {viewMode === 'list' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {visibleBills
              .filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'upcoming')
              .map((bill, idx) => {
                const iconConfig = CATEGORY_ICONS[bill.cat] || CATEGORY_ICONS['Other']
                return (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.05 }}
                >
                  {(() => {
                    const partial = getPartialPayInfo(bill)
                    return (
                  <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-6 space-y-4">
                    {/* Bill Header */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                          <h3 style={{ color: theme.text }} className="font-bold text-base sm:text-lg truncate">{bill.name}</h3>
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${iconConfig.color}15`, color: iconConfig.color }}>
                            {bill.cat}
                          </span>
                          {partial?.isPartial && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                              Partially Paid
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: theme.textM }}>
                          Due {fmtD(cycleDue(bill))}
                          {bill.recurrence && bill.recurrence !== 'monthly' && (
                            <span> · {bill.recurrence === 'custom' && bill.customRecurrenceDays ? `Every ${bill.customRecurrenceDays}d` : bill.recurrence}</span>
                          )}
                          {bill.recurrence && bill.recurrence !== 'one-time' && <span> · Starts {fmtD(bill.due)}</span>}
                          {bill.recurrenceEndDate && <span> · Ends {fmtD(bill.recurrenceEndDate)}</span>}
                          {bill.recurrenceEndAfter && <span> · {bill.recurrenceEndAfter}x left</span>}
                        </p>
                        {partial?.isPartial && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1" style={{ color: theme.textM }}>
                              <span>Paid: <span className="font-bold" style={{ color: theme.ok }}>{fmt(partial.totalPaid)}</span></span>
                              <span>Remaining: <span className="font-bold" style={{ color: '#EF4444' }}>{fmt(partial.remaining)}</span></span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                              <div className="h-full rounded-full" style={{ width: `${partial.pct}%`, backgroundColor: '#F59E0B' }} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl sm:text-3xl font-bold" style={{ color: '#EF4444' }}>
                          –{fmt(partial?.isPartial ? partial.remaining : bill.amount)}
                        </p>
                        {partial?.isPartial && (
                          <p className="text-xs mt-0.5" style={{ color: theme.textM }}>of {fmt(bill.amount)}</p>
                        )}
                      </div>
                    </div>

                    {/* Partial/Split Payment Schedule (collapsible) */}
                    {bill.alloc.length > 0 && (
                      <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-xl p-4">
                        <button
                          onClick={() => setCollapsedSplits(prev => ({ ...prev, [bill.id]: !prev[bill.id] }))}
                          className="w-full flex items-center justify-between"
                        >
                          <p className="text-xs font-bold" style={{ color: theme.gold }}>
                            {partial?.isPartial ? `PARTIAL PAYMENTS (${fmt(partial.totalPaid)} of ${fmt(bill.amount)})` : `SPLIT SCHEDULE (${bill.alloc.filter(a => a.paid).length}/${bill.alloc.length} paid)`}
                          </p>
                          {collapsedSplits[bill.id]
                            ? <ChevronDown className="w-4 h-4" style={{ color: theme.textM }} />
                            : <ChevronUp className="w-4 h-4" style={{ color: theme.textM }} />
                          }
                        </button>
                        <AnimatePresence initial={false}>
                          {!collapsedSplits[bill.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-2 mt-3">
                                {bill.alloc.map(alloc => (
                                  <div
                                    key={alloc.id}
                                    className={`flex justify-between items-center p-2 rounded ${
                                      alloc.paid ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {alloc.paid && (
                                        <Check className="w-4 h-4" style={{ color: theme.ok }} />
                                      )}
                                      <span className={`text-sm ${alloc.paid ? 'line-through' : ''}`} style={{ color: theme.textM }}>
                                        {fmtD(alloc.date)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold" style={{ color: theme.text }}>
                                        {fmt(alloc.amount)}
                                      </span>
                                      {!alloc.paid && (
                                        <button
                                          onClick={() => handlePayment(bill.id, alloc.id)}
                                          style={{ backgroundColor: `${theme.ok}20`, color: theme.ok }}
                                          className="px-2 py-1 text-xs rounded hover:opacity-80 transition-colors"
                                        >
                                          Pay
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3 pt-2 flex-wrap sm:flex-nowrap">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePayFull(bill.id, getEffectiveBillDate(bill))}
                        style={{ backgroundColor: theme.accent, color: '#fff' }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-colors"
                      >
                        Pay
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStartEdit(bill.id)}
                        style={{ backgroundColor: `${theme.gold}20`, color: theme.gold }}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-80 transition-colors"
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSplitModalBillId(bill.id)}
                        style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-80 transition-colors"
                      >
                        Split
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDeleteBill(bill.id)}
                        style={{ backgroundColor: `${theme.bad}20`, color: theme.bad }}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-80 transition-colors"
                      >
                        Del
                      </motion.button>
                    </div>
                  </div>
                    )
                  })()}
                </motion.div>
              )
              })}
          </motion.div>
        )}

        {/* 4b. Bills — Compact View (condensed, easy-to-scan) */}
        {viewMode === 'compact' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
            className="border rounded-2xl overflow-hidden divide-y"
          >
            {visibleBills
              .filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'upcoming')
              .map((bill, idx) => {
                const partial = getPartialPayInfo(bill)
                return (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: theme.border }}
                >
                  {/* Name + Due Date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{bill.name}</p>
                    <p className="text-xs" style={{ color: theme.textM }}>Due {fmtD(bill.due)}</p>
                  </div>
                  {/* Amount */}
                  <p className="text-sm font-bold flex-shrink-0 tabular-nums" style={{ color: '#EF4444' }}>–{fmt(partial?.isPartial ? partial.remaining : bill.amount)}</p>
                  {/* Pay button only */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handlePayFull(bill.id, getEffectiveBillDate(bill))}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: theme.accent }}
                      title="Mark Paid"
                    >
                      <Check size={13} style={{ color: '#fff' }} />
                    </button>
                  </div>
                </motion.div>
              )
              })}

              {/* (Payment flow handled by the partial-pay bottom-sheet below) */}
            {visibleBills.filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'upcoming').length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: theme.textM }}>No upcoming bills</p>
              </div>
            )}
          </motion.div>
        )}

        {/* 5. Paid Bills Section */}
        {bills.filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'paid').length > 0 && (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="space-y-4 mt-8"
          >
            <h3 style={{ color: theme.text }} className="font-bold text-lg mb-4">Paid Bills</h3>
            {viewMode === 'list' ? (
              bills
                .filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'paid')
                .map(bill => {
                  const paidOn = getDisplayPaidDate(bill)
                  return (
                  <div
                    key={bill.id}
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    className="border rounded-2xl p-6 opacity-60 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5" style={{ color: theme.ok }} />
                      <div>
                        <p style={{ color: theme.text }} className="font-bold">{bill.name}</p>
                        <p className="text-sm" style={{ color: theme.textM }}>{bill.cat}</p>
                        {paidOn && (
                          <p className="text-xs font-semibold mt-0.5" style={{ color: theme.ok }}>
                            ✓ Paid {fmtD(paidOn)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p style={{ color: '#ef4444' }} className="font-bold">–{fmt(bill.amount)}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => persistBills(bills.map(b => {
                          if (b.id !== bill.id) return b
                          // Clear paidDate and unpay any cycle alloc entries so
                          // getBillEffectiveStatus correctly reverts to 'upcoming'.
                          return {
                            ...b,
                            status: 'upcoming' as const,
                            paidDate: undefined,
                            alloc: b.alloc.map(a => {
                              const ad = new Date(a.date + 'T00:00:00')
                              if (ad.getMonth() === calMonth && ad.getFullYear() === calYear) {
                                return { ...a, paid: false }
                              }
                              return a
                            }),
                          }
                        }))}
                        style={{ backgroundColor: theme.ok, color: '#fff' }}
                        className="px-4 py-1.5 text-sm font-bold rounded-lg hover:opacity-90 transition-colors"
                      >
                        Undo
                      </motion.button>
                    </div>
                  </div>
                  )
                })
            ) : (
              <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl overflow-hidden divide-y opacity-70">
                {bills.filter(b => getBillEffectiveStatus(b, calMonth, calYear) === 'paid').map(bill => {
                  const paidOn = getDisplayPaidDate(bill)
                  return (
                  <div key={bill.id} className="flex items-center gap-3 px-5 py-3" style={{ borderColor: theme.border }}>
                    <Check size={14} style={{ color: theme.ok }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: theme.text }}>{bill.name}</p>
                      {paidOn && (
                        <p className="text-[10px] font-semibold" style={{ color: theme.ok }}>Paid {fmtD(paidOn)}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold flex-shrink-0" style={{ color: theme.textM }}>–{fmt(bill.amount)}</p>
                    <button
                      onClick={() => persistBills(bills.map(b => {
                        if (b.id !== bill.id) return b
                        return {
                          ...b,
                          status: 'upcoming' as const,
                          paidDate: undefined,
                          alloc: b.alloc.map(a => {
                            const ad = new Date(a.date + 'T00:00:00')
                            if (ad.getMonth() === calMonth && ad.getFullYear() === calYear) {
                              return { ...a, paid: false }
                            }
                            return a
                          }),
                        }
                      }))}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                      style={{ backgroundColor: theme.ok, color: '#fff' }}
                    >
                      Undo
                    </button>
                  </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* 6b. Partial Payment Modal — Redesigned */}
      <AnimatePresence>
        {partialPayId && (() => {
          const bill = bills.find(b => b.id === partialPayId)
          if (!bill) return null
          // Use cycle-remaining as the "total due" so the modal always reflects
          // what's actually owed this cycle, not the raw bill amount.
          const today = new Date().toISOString().split('T')[0]
          // Use paymentTargetDate (which encodes the billing cycle) if set; otherwise today.
          const tDate = paymentTargetDate || today
          const mcd = new Date(tDate + 'T00:00:00')
          const billTotal = getCycleRemaining(bill, mcd.getMonth(), mcd.getFullYear()) || bill.amount
          const enteredAmount = parseFloat(partialPayAmount) || 0
          const clampedAmount = Math.min(enteredAmount, billTotal)
          const fillPct = billTotal > 0 ? Math.min((clampedAmount / billTotal) * 100, 100) : 0
          const remaining = Math.max(billTotal - clampedAmount, 0)
          const isFullPayment = clampedAmount >= billTotal

          return (
            <motion.div
              key="pay-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
              onClick={() => { setPartialPayId(null); setPaymentTargetDate(null) }}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{ backgroundColor: theme.card, borderColor: theme.border }}
                className="w-full max-w-full border-t rounded-t-3xl p-5 sm:p-6 space-y-4 overflow-hidden"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: theme.textM }}>Make a Payment</p>
                    <h2 style={{ color: theme.text }} className="font-bold text-xl leading-tight">{bill.name}</h2>
                    <p className="text-sm mt-0.5" style={{ color: theme.textM }}>
                      Total due: <span className="font-bold" style={{ color: theme.bad }}>{fmt(billTotal)}</span>
                    </p>
                    {(() => {
                      if (!paymentTargetDate) return null
                      const targetD = new Date(paymentTargetDate + 'T00:00:00')
                      const now = new Date()
                      const isNonCurrentCycle = targetD.getMonth() !== now.getMonth() || targetD.getFullYear() !== now.getFullYear()
                      if (!isNonCurrentCycle) return null
                      const isFutureCycle = paymentTargetDate > now.toISOString().split('T')[0]
                      return (
                        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
                          <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: theme.accent }} />
                          <p className="text-xs font-semibold" style={{ color: theme.accent }}>
                            {isFutureCycle ? 'Advance payment' : 'Back-dated payment'} — applies to {targetD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} cycle
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                  <button
                    onClick={() => { setPartialPayId(null); setPaymentTargetDate(null) }}
                    className="p-2 rounded-xl transition-colors mt-1"
                    style={{ backgroundColor: theme.border }}
                  >
                    <X className="w-4 h-4" style={{ color: theme.text }} />
                  </button>
                </div>

                {/* Quick-pick chips */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: theme.textM }}>Payment Amount</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Full', sublabel: fmt(billTotal), mode: 'full' as const, amount: billTotal },
                      { label: 'Half', sublabel: fmt(billTotal / 2), mode: 'half' as const, amount: billTotal / 2 },
                      { label: 'Custom', sublabel: 'Enter amount', mode: 'custom' as const, amount: null },
                    ].map(opt => (
                      <motion.button
                        key={opt.mode}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setPartialPayMode(opt.mode)
                          if (opt.amount !== null) setPartialPayAmount(String(opt.amount))
                        }}
                        className="rounded-xl p-3 text-center transition-all border-2"
                        style={{
                          backgroundColor: partialPayMode === opt.mode ? theme.accent : theme.bg,
                          borderColor: partialPayMode === opt.mode ? theme.accent : theme.border,
                          color: partialPayMode === opt.mode ? '#fff' : theme.text,
                        }}
                      >
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-xs mt-0.5 opacity-80">{opt.sublabel}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Custom amount input */}
                <AnimatePresence>
                  {partialPayMode === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg" style={{ color: theme.textM }}>$</span>
                        <input
                          type="number"
                          value={partialPayAmount}
                          onChange={(e) => setPartialPayAmount(e.target.value)}
                          placeholder="0.00"
                          autoFocus
                          className="w-full pl-8 pr-4 py-4 rounded-xl border-2 font-bold text-xl outline-none transition-colors"
                          style={{
                            backgroundColor: theme.bg,
                            borderColor: theme.accent,
                            color: theme.text,
                          }}
                          step="0.01"
                          min="0"
                          max={billTotal}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-xs font-semibold" style={{ color: theme.textM }}>
                      Paying <span style={{ color: theme.accent }}>{fmt(clampedAmount)}</span>
                    </p>
                    <p className="text-xs font-semibold" style={{ color: remaining > 0 ? theme.warn : theme.ok }}>
                      {remaining > 0 ? `${fmt(remaining)} remaining` : '✓ Fully paid'}
                    </p>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${fillPct}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      style={{ backgroundColor: isFullPayment ? theme.ok : theme.accent }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-right tabular-nums" style={{ color: theme.textM }}>
                    {fillPct.toFixed(0)}% of bill
                  </p>
                </div>

                {/* Confirm button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyPartialPayment}
                  disabled={clampedAmount <= 0}
                  style={{
                    backgroundColor: clampedAmount > 0 ? (isFullPayment ? theme.ok : theme.accent) : theme.border,
                    color: clampedAmount > 0 ? '#fff' : theme.textM,
                  }}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all"
                >
                  {clampedAmount <= 0
                    ? 'Enter an amount to continue'
                    : isFullPayment
                    ? `✓ Confirm Full Payment — ${fmt(clampedAmount)}`
                    : `Confirm Partial Payment — ${fmt(clampedAmount)}`}
                </motion.button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* 7. Split Modal */}
      <AnimatePresence>
        {splitModalBillId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSplitModalBillId(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-8 space-y-5"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 style={{ color: theme.text }} className="font-bold text-xl">Split Payment</h2>
                <button
                  onClick={() => setSplitModalBillId(null)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: theme.textS }}
                >
                  <X className="w-5 h-5" style={{ color: theme.textM }} />
                </button>
              </div>

              <p style={{ color: theme.textM }} className="text-sm">
                Split this bill into how many payments?
              </p>

              <div className="grid grid-cols-3 gap-4">
                {[2, 3, 4].map(num => (
                  <motion.button
                    key={num}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApplySplit(splitModalBillId, num)}
                    style={{ backgroundColor: theme.accent, color: '#fff' }}
                    className="px-4 py-3.5 rounded-xl font-bold hover:opacity-90 transition-colors"
                  >
                    {num} Payments
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
