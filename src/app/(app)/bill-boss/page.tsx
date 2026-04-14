'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, AlertCircle, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Edit3, Home, Phone, Car, CreditCard, Heart, Utensils, BookOpen, Zap } from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo, gid } from '@/lib/utils'
import { getRecurringBillDates } from '@/lib/income-engine'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'

import type { Bill, BillAlloc, BillRecurrence, RecurrenceEndType } from '@/lib/types'
import CalendarPicker from '@/components/CalendarPicker'
import { orcaEvents } from '@/lib/eventBus'

// ── Progressive form step type ──
type FormStep = 1 | 2 | 3

// ── Payment type for the payment flow ──
type PaymentType = 'full' | 'partial' | 'early' | 'skipped'

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

const RECURRENCE_OPTIONS: BillRecurrence[] = ['one-time', 'weekly', 'monthly', 'yearly', 'custom']

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

  // Get all events for a day including split payments and recurring bill dates.
  // Deduplicates so a bill never shows more than once on the same day (prefers paid=true).
  const getEventsForDay = (day: number) => {
    const raw: { label: string; amount: number; type: 'bill' | 'split'; paid: boolean }[] = []

    bills.forEach(b => {
      if (b.alloc.length === 0) {
        if (b.status === 'paid' && (b as any).paidDate) {
          // Show on the actual paid date (green)
          const pd = new Date((b as any).paidDate + 'T00:00:00')
          if (pd.getDate() === day && pd.getMonth() === month && pd.getFullYear() === year) {
            raw.push({ label: b.name, amount: b.amount, type: 'bill', paid: true })
          }
          // For monthly bills that are paid: also show upcoming occurrence in OTHER months as red
          if (b.recurrence === 'monthly') {
            const paidMonth = pd.getMonth()
            const paidYear = pd.getFullYear()
            const dueDay = new Date(b.due + 'T00:00:00').getDate()
            if ((month !== paidMonth || year !== paidYear) && dueDay === day) {
              raw.push({ label: b.name, amount: b.amount, type: 'bill', paid: false })
            }
          }
        } else if (b.recurrence && b.recurrence !== 'one-time' && b.recurrence !== 'monthly') {
          // Weekly / biweekly / custom: expand into dates for the viewed month
          const recurDates = getRecurringBillDates(b, 6)
          recurDates.forEach(dateStr => {
            const rd = new Date(dateStr + 'T00:00:00')
            if (rd.getDate() === day && rd.getMonth() === month && rd.getFullYear() === year) {
              raw.push({ label: b.name, amount: b.amount, type: 'bill', paid: false })
            }
          })
        } else {
          const d = new Date(b.due + 'T00:00:00')
          if (b.recurrence === 'monthly') {
            // Monthly: show on same day-of-month each month, with correct paid status
            // Paid status applies only to the calendar month that matches paidDate (or current if no paidDate)
            if (d.getDate() === day) {
              const isPaidThisMonth = b.status === 'paid' && !(b as any).paidDate
              raw.push({ label: b.name, amount: b.amount, type: 'bill', paid: isPaidThisMonth })
            }
          } else if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
            raw.push({ label: b.name, amount: b.amount, type: 'bill', paid: b.status === 'paid' })
          }
        }
      }

      // Split payment dates
      b.alloc.forEach(a => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getDate() === day && ad.getMonth() === month && ad.getFullYear() === year) {
          raw.push({ label: `${b.name} (split)`, amount: a.amount, type: 'split', paid: a.paid })
        }
      })
    })

    // Deduplicate: same label + same type on the same day — prefer paid=true
    const seen = new Map<string, typeof raw[0]>()
    raw.forEach(ev => {
      const key = `${ev.label}-${ev.type}`
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

export default function BillBossPage() {
  const { data, setData, loading } = useOrcaData()
  const { theme, isDark } = useTheme()

  const [bills, setBills] = useState<Bill[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formStep, setFormStep] = useState<FormStep>(1)
  const [splitModalBillId, setSplitModalBillId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [paymentModalBillId, setPaymentModalBillId] = useState<string | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('full')
  const [paymentAmount, setPaymentAmount] = useState('')
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
          deductTotal += ub.amount;
        }
      }
      // Check for newly paid split allocations
      ub.alloc.forEach(ua => {
        if (ua.paid) {
          const prevBill = previousBills.find(pb => pb.id === ub.id);
          const prevAlloc = prevBill?.alloc.find(pa => pa.id === ua.id);
          if (prevAlloc && !prevAlloc.paid) {
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

  // ── Advanced Payment Flow ──
  const handlePaymentSubmit = (billId: string) => {
    const bill = bills.find(b => b.id === billId)
    if (!bill) return

    const amount = paymentType === 'full' ? bill.amount
      : paymentType === 'skipped' ? 0
      : parseFloat(paymentAmount) || 0

    if (paymentType === 'skipped') {
      // Mark as skipped — keep upcoming but log it
      const updated = bills.map(b =>
        b.id === billId ? { ...b, status: 'upcoming' as const } : b
      )
      persistBills(updated)
    } else if (paymentType === 'partial' && amount < bill.amount) {
      // Partial — create alloc entry for partial amount
      const alloc: BillAlloc = {
        id: gid(),
        date: new Date().toISOString().split('T')[0],
        amount,
        paid: true,
      }
      const updated = bills.map(b =>
        b.id === billId ? { ...b, alloc: [...b.alloc, alloc] } : b
      )
      persistBills(updated)
    } else {
      // Full or early payment
      const updated = bills.map(b =>
        b.id === billId ? { ...b, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] } : b
      )
      persistBills(updated)
    }
    orcaEvents.broadcast('bill.paid', { billId, paymentType, amount })
    setPaymentModalBillId(null)
    setPaymentAmount('')
    setPaymentType('full')
  }

  // Generate notifications from bills
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newNotifs: typeof notifications = []

    bills.forEach(b => {
      if (b.status === 'paid') return
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

  const activeNotifCount = notifications.filter(n => !n.dismissed).length

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

  // Calculate unpaid total
  const unpaidTotal = bills
    .filter(b => b.status === 'upcoming')
    .reduce((sum, b) => sum + b.amount, 0)

  // Calculate paid total
  const paidTotal = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)

  // Next bill due (soonest upcoming)
  const nextBillDue = useMemo(() => {
    return bills
      .filter(b => b.status === 'upcoming')
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0] || null
  }, [bills])

  // Next due item — split-aware: if a bill has unpaid alloc entries, surface the nearest one
  const nextDueItem = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const candidates: { name: string; due: string; amount: number; isSplit: boolean; billId: string }[] = []
    bills.forEach(b => {
      if (b.status === 'paid') return
      if (b.alloc && b.alloc.length > 0) {
        b.alloc.forEach((a: any) => {
          if (!a.paid && a.date >= todayStr) {
            candidates.push({ name: b.name, due: a.date, amount: a.amount, isSplit: true, billId: b.id })
          }
        })
      } else if (b.status === 'upcoming') {
        candidates.push({ name: b.name, due: b.due, amount: b.amount, isSplit: false, billId: b.id })
      }
    })
    candidates.sort((a, b) => a.due.localeCompare(b.due))
    return candidates[0] || null
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
        if (candidate >= dueDate) {
          total += b.amount
        }
      } else if (recurrence === 'yearly') {
        // Yearly: appears once per year on the same month/day
        if (dueDate.getMonth() === calMonth) {
          const candidate = new Date(calYear, calMonth, dueDate.getDate())
          if (candidate >= dueDate) {
            total += b.amount
          }
        }
      } else {
        // Weekly, biweekly, custom: generate occurrences and count those in this month
        const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
        const cursor = new Date(dueDate)
        // Fast-forward to near the month start
        if (cursor < monthStart) {
          const daysGap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
          cursor.setDate(cursor.getDate() + daysGap)
        }
        // Walk forward and count hits in the month
        while (cursor <= monthEnd) {
          if (cursor >= monthStart && cursor >= dueDate) {
            total += b.amount
          }
          cursor.setDate(cursor.getDate() + intervalDays)
        }
      }
    })

    return total
  }, [bills, calMonth, calYear])

  // Returns bills relevant to the currently selected calendar month.
  // Monthly recurring bills always appear (they recur every month).
  // One-time / weekly / biweekly bills only appear if they have an occurrence in the selected month.
  const getVisibleBills = () => {
    const monthStart = new Date(calYear, calMonth, 1)
    const monthEnd = new Date(calYear, calMonth + 1, 0)

    return [...bills]
      .filter(b => {
        // Split alloc: show if any alloc date falls in this month
        if (b.alloc.length > 0) {
          return b.alloc.some(a => {
            const ad = new Date(a.date + 'T00:00:00')
            return ad.getMonth() === calMonth && ad.getFullYear() === calYear
          })
        }

        const recurrence = b.recurrence || 'one-time'
        const dueDate = new Date(b.due + 'T00:00:00')

        if (recurrence === 'monthly') return true  // always visible — recurs every month
        if (recurrence === 'yearly') {
          return dueDate.getMonth() === calMonth  // same month, any year
        }
        if (recurrence === 'one-time' || !recurrence) {
          return dueDate.getMonth() === calMonth && dueDate.getFullYear() === calYear
        }
        // Weekly / biweekly / custom: check if any occurrence lands in the month
        const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
        const cursor = new Date(dueDate)
        if (cursor < monthStart) {
          const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
          cursor.setDate(cursor.getDate() + gap)
        }
        while (cursor <= monthEnd) {
          if (cursor >= monthStart && cursor >= dueDate) return true
          cursor.setDate(cursor.getDate() + intervalDays)
        }
        return false
      })
      .sort((a, b) => new Date(a.due + 'T00:00:00').getTime() - new Date(b.due + 'T00:00:00').getTime())
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

  // Handler: Show partial payment dialog
  const handlePayFull = (billId: string) => {
    const bill = bills.find(b => b.id === billId)
    if (bill) {
      setPartialPayId(billId)
      setPartialPayMode('full')
      setPartialPayAmount(String(bill.amount))
    }
  }

  // Handler: Apply partial or full payment
  const handleApplyPartialPayment = () => {
    if (!partialPayId || !partialPayAmount) return

    const amount = parseFloat(partialPayAmount)
    if (isNaN(amount) || amount <= 0) return

    const bill = bills.find(b => b.id === partialPayId)
    if (!bill) return

    const today = new Date().toISOString().split('T')[0]

    if (amount >= bill.amount) {
      // Full payment
      persistBills(bills.map(b =>
        b.id === partialPayId
          ? { ...b, status: 'paid' as const, paidDate: today }
          : b
      ))
    } else {
      // Partial payment
      persistBills(bills.map(b =>
        b.id === partialPayId
          ? { ...b, amount: b.amount - amount, status: 'upcoming' as const }
          : b
      ))
    }

    setPartialPayId(null)
    setPartialPayAmount('')
    setPartialPayMode('full')
  }

  // Handler: Delete bill
  const handleDeleteBill = (billId: string) => {
    persistBills(bills.filter(b => b.id !== billId))
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
                  <p className="text-xs opacity-70">Remaining</p>
                  <p className="text-sm font-bold">{fmt(unpaidTotal - paidTotal)}</p>
                </div>
              </div>
            </div>

            {/* Next Bill Due + Quick Pay — split-aware */}
            {nextDueItem && (
              <div className="mt-6 pt-6 border-t flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium opacity-70">Next Due</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-base sm:text-lg font-bold truncate">{nextDueItem.name}</p>
                    {nextDueItem.isSplit && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>SPLIT</span>
                    )}
                  </div>
                  <p className="text-xs opacity-70 mt-1">{fmtD(nextDueItem.due)} · {fmt(nextDueItem.amount)}</p>
                </div>
                <button
                  onClick={() => handlePayFull(nextDueItem.billId)}
                  className="shrink-0 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: '#fff', color: theme.accent }}
                >
                  Pay Now
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bill Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <BillCalendar
            bills={bills}
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
                        <label className="text-xs font-medium block mb-1" style={{ color: theme.textM }}>Due Date</label>
                        <CalendarPicker value={formData.due} onChange={(date) => setFormData({ ...formData, due: date })} placeholder="Due Date" theme={theme} />
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
              .filter(b => b.status === 'upcoming')
              .map((bill, idx) => {
                const iconConfig = CATEGORY_ICONS[bill.cat] || CATEGORY_ICONS['Other']
                const Icon = iconConfig.Icon
                return (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-6 space-y-4">
                    {/* Bill Header */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                          <h3 style={{ color: theme.text }} className="font-bold text-base sm:text-lg truncate">{bill.name}</h3>
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${iconConfig.color}15`, color: iconConfig.color }}>
                            {bill.cat}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: theme.textM }}>
                          Due {fmtD(bill.due)}
                          {bill.recurrence && bill.recurrence !== 'monthly' && (
                            <span> · {bill.recurrence === 'custom' && bill.customRecurrenceDays ? `Every ${bill.customRecurrenceDays}d` : bill.recurrence}</span>
                          )}
                          {bill.recurrenceEndDate && <span> · Ends {fmtD(bill.recurrenceEndDate)}</span>}
                          {bill.recurrenceEndAfter && <span> · {bill.recurrenceEndAfter}x left</span>}
                        </p>
                      </div>
                      <p className="text-xl sm:text-3xl font-bold flex-shrink-0" style={{ color: '#EF4444' }}>
                        –{fmt(bill.amount)}
                      </p>
                    </div>

                    {/* Split Payment Schedule (collapsible) */}
                    {bill.alloc.length > 0 && (
                      <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-xl p-4">
                        <button
                          onClick={() => setCollapsedSplits(prev => ({ ...prev, [bill.id]: !prev[bill.id] }))}
                          className="w-full flex items-center justify-between"
                        >
                          <p className="text-xs font-bold" style={{ color: theme.gold }}>
                            SPLIT SCHEDULE ({bill.alloc.filter(a => a.paid).length}/{bill.alloc.length} paid)
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
                        onClick={() => handlePayFull(bill.id)}
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
              .filter(b => b.status === 'upcoming')
              .map((bill, idx) => {
                return (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: theme.border }}
                >
                  {/* Name + Category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{bill.name}</p>
                    <p className="text-xs truncate" style={{ color: theme.textM }}>
                      {bill.cat} · Due {fmtD(bill.due)}
                    </p>
                  </div>
                  {/* Amount */}
                  <p className="text-sm font-bold flex-shrink-0 tabular-nums" style={{ color: '#EF4444' }}>–{fmt(bill.amount)}</p>
                  {/* Quick actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handlePayFull(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: theme.accent }}
                      title="Pay"
                    >
                      <Check size={13} style={{ color: '#fff' }} />
                    </button>
                    <button
                      onClick={() => setSplitModalBillId(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: '#F59E0B20' }}
                      title="Split Payment"
                    >
                      <ChevronRight size={13} style={{ color: '#F59E0B' }} />
                    </button>
                    <button
                      onClick={() => handleStartEdit(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.gold}20` }}
                      title="Edit"
                    >
                      <Edit3 size={13} style={{ color: theme.gold }} />
                    </button>
                    <button
                      onClick={() => handleDuplicateBill(bill)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.accent}15` }}
                      title="Duplicate"
                    >
                      <span style={{ color: theme.accent, fontSize: 11, fontWeight: 700 }}>⊕</span>
                    </button>
                    <button
                      onClick={() => { setPaymentModalBillId(bill.id); setPaymentType('full'); setPaymentAmount(String(bill.amount)) }}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: '#10B98120' }}
                      title="Pay"
                    >
                      <Check size={13} style={{ color: '#10B981' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteBill(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.bad}20` }}
                      title="Delete"
                    >
                      <Trash2 size={14} style={{ color: theme.bad }} />
                    </button>
                  </div>
                </motion.div>
              )
              })}

              {/* Payment Modal */}
              <AnimatePresence>
                {paymentModalBillId && (() => {
                  const bill = bills.find(b => b.id === paymentModalBillId)
                  if (!bill) return null
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      onClick={(e) => { if (e.target === e.currentTarget) setPaymentModalBillId(null) }}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="rounded-2xl p-6 w-full max-w-sm space-y-4"
                        style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base" style={{ color: theme.text }}>Pay {bill.name}</h3>
                          <button onClick={() => setPaymentModalBillId(null)} style={{ color: theme.textS }}>✕</button>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{fmt(bill.amount)}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'full', label: '✓ Full Payment', desc: `Pay ${fmt(bill.amount)}` },
                            { value: 'partial', label: '◑ Partial', desc: 'Pay a portion' },
                            { value: 'early', label: '⚡ Early', desc: 'Pay before due date' },
                            { value: 'skipped', label: '⏭ Skip', desc: 'Mark as skipped' },
                          ] as { value: PaymentType; label: string; desc: string }[]).map(opt => (
                            <button key={opt.value} onClick={() => setPaymentType(opt.value)}
                              style={{
                                backgroundColor: paymentType === opt.value ? `${theme.accent}20` : theme.bg,
                                borderColor: paymentType === opt.value ? theme.accent : theme.border,
                                color: paymentType === opt.value ? theme.accent : theme.textS,
                              }}
                              className="p-3 rounded-xl border text-left transition-all"
                            >
                              <div className="text-xs font-bold">{opt.label}</div>
                              <div className="text-[10px] opacity-70">{opt.desc}</div>
                            </button>
                          ))}
                        </div>
                        {paymentType === 'partial' && (
                          <input type="number" placeholder="Amount to pay" value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            className="w-full px-4 py-3 border rounded-xl focus:outline-none" />
                        )}
                        <div className="flex gap-3">
                          <button onClick={() => setPaymentModalBillId(null)} style={{ borderColor: theme.border, color: theme.textS }}
                            className="flex-1 px-4 py-3 rounded-xl font-bold border">Cancel</button>
                          <button onClick={() => handlePaymentSubmit(bill.id)} style={{ backgroundColor: '#10B981', color: '#fff' }}
                            className="flex-1 px-4 py-3 rounded-xl font-bold">Confirm</button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            {visibleBills.filter(b => b.status === 'upcoming').length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: theme.textM }}>No upcoming bills</p>
              </div>
            )}
          </motion.div>
        )}

        {/* 5. Paid Bills Section */}
        {bills.filter(b => b.status === 'paid').length > 0 && (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="space-y-4 mt-8"
          >
            <h3 style={{ color: theme.text }} className="font-bold text-lg mb-4">Paid Bills</h3>
            {viewMode === 'list' ? (
              bills
                .filter(b => b.status === 'paid')
                .map(bill => (
                  <div
                    key={bill.id}
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    className="border rounded-2xl p-6 opacity-50 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5" style={{ color: theme.ok }} />
                      <div>
                        <p style={{ color: theme.text }} className="font-bold">{bill.name}</p>
                        <p className="text-sm" style={{ color: theme.textM }}>{bill.cat}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p style={{ color: '#ef4444' }} className="font-bold">–{fmt(bill.amount)}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => persistBills(bills.map(b =>
                          b.id === bill.id ? { ...b, status: 'upcoming' as const } : b
                        ))}
                        style={{ backgroundColor: theme.ok, color: '#fff' }}
                        className="px-4 py-1.5 text-sm font-bold rounded-lg hover:opacity-90 transition-colors"
                      >
                        Undo
                      </motion.button>
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl overflow-hidden divide-y opacity-60">
                {bills.filter(b => b.status === 'paid').map(bill => (
                  <div key={bill.id} className="flex items-center gap-4 px-5 py-4" style={{ borderColor: theme.border }}>
                    <Check size={14} style={{ color: theme.ok }} />
                    <p className="text-sm flex-1 truncate" style={{ color: theme.text }}>{bill.name}</p>
                    <p className="text-sm font-bold" style={{ color: theme.textM }}>–{fmt(bill.amount)}</p>
                    <button
                      onClick={() => persistBills(bills.map(b => b.id === bill.id ? { ...b, status: 'upcoming' as const } : b))}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                      style={{ backgroundColor: theme.ok, color: '#fff' }}
                    >
                      Undo
                    </button>
                  </div>
                ))}
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
          const billTotal = bill.amount
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
              onClick={() => setPartialPayId(null)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
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
                  </div>
                  <button
                    onClick={() => setPartialPayId(null)}
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
              onClick={(e) => e.stopPropagation()}
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
