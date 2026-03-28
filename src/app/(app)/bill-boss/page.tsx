'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, AlertCircle, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Upload, Bell, BellRing, Edit3 } from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo, gid } from '@/lib/utils'
import { getRecurringBillDates } from '@/lib/income-engine'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'

import type { Bill, BillAlloc, RentEntry, BillRecurrence, RecurrenceEndType } from '@/lib/types'
import CalendarPicker from '@/components/CalendarPicker'

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

  // Get all events for a day including split payments and recurring bill dates
  // Paid bills show on their actual paid date; unpaid bills show on due date with red indicator
  const getEventsForDay = (day: number) => {
    const events: { label: string; amount: number; type: 'bill' | 'split'; paid: boolean }[] = []

    bills.forEach(b => {
      if (b.alloc.length === 0) {
        if (b.status === 'paid' && (b as any).paidDate) {
          const pd = new Date((b as any).paidDate + 'T00:00:00')
          if (pd.getDate() === day && pd.getMonth() === month && pd.getFullYear() === year) {
            events.push({ label: b.name, amount: b.amount, type: 'bill', paid: true })
          }
        } else if (b.recurrence && b.recurrence !== 'monthly') {
          // For recurring bills, generate all dates in this month
          const recurDates = getRecurringBillDates(b, 6)
          recurDates.forEach(dateStr => {
            const rd = new Date(dateStr + 'T00:00:00')
            if (rd.getDate() === day && rd.getMonth() === month && rd.getFullYear() === year) {
              events.push({ label: b.name, amount: b.amount, type: 'bill', paid: false })
            }
          })
        } else {
          // Standard: show on due date, and for monthly recurrence on same day-of-month
          const d = new Date(b.due + 'T00:00:00')
          if (b.recurrence === 'monthly') {
            // Monthly recurring: show on the same day every month
            if (d.getDate() === day) {
              events.push({ label: b.name, amount: b.amount, type: 'bill', paid: b.status === 'paid' })
            }
          } else if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
            events.push({ label: b.name, amount: b.amount, type: 'bill', paid: b.status === 'paid' })
          }
        }
      }

      // Check split payment dates
      b.alloc.forEach(a => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getDate() === day && ad.getMonth() === month && ad.getFullYear() === year) {
          events.push({ label: `${b.name} (split)`, amount: a.amount, type: 'split', paid: a.paid })
        }
      })
    })

    return events
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
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className={`p-2 rounded-lg transition-colors`} style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.gold} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: theme.gold }} />
          <h3 className="font-semibold" style={{ color: theme.text }}>{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className={`p-2 rounded-lg transition-colors`} style={{ color: theme.textM }} onMouseEnter={(e) => e.currentTarget.style.color = theme.gold} onMouseLeave={(e) => e.currentTarget.style.color = theme.textM}>
          <ChevronRight size={18} />
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
  const { theme } = useTheme()

  const [bills, setBills] = useState<Bill[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [splitModalBillId, setSplitModalBillId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [calMonth, setCalMonth] = useState(2)
  const [calYear, setCalYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [rentReceipts, setRentReceipts] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('compact')
  const [notifications, setNotifications] = useState<Array<{ id: string; billId: string; billName: string; amount: number; dueDate: string; type: 'due-today' | 'upcoming'; dismissed: boolean }>>([])
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [collapsedSplits, setCollapsedSplits] = useState<Record<string, boolean>>({})

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

  // Quick-pay from notification
  const handleNotifPay = (billId: string) => {
    const today = new Date().toISOString().split('T')[0]
    persistBills(bills.map(b => b.id === billId ? { ...b, status: 'paid' as const, paidDate: today } : b))
    setNotifications(prev => prev.map(n => n.billId === billId ? { ...n, dismissed: true } : n))
  }

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

  // Calculate monthly bill total for selected calendar month
  const monthlyBillTotal = useMemo(() => {
    return bills.reduce((sum, b) => {
      const d = new Date(b.due + 'T00:00:00')
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        return sum + b.amount
      }
      // Also count split allocs in this month
      const allocInMonth = b.alloc.reduce((aSum, a) => {
        const ad = new Date(a.date + 'T00:00:00')
        if (ad.getMonth() === calMonth && ad.getFullYear() === calYear) return aSum + a.amount
        return aSum
      }, 0)
      return sum + allocInMonth
    }, 0)
  }, [bills, calMonth, calYear])

  // Both views show all bills — view mode only changes layout
  const getVisibleBills = () => bills

  // Get rent bill if exists
  const rentBill = bills.find(b => b.cat.toLowerCase() === 'housing' && b.name.toLowerCase().includes('rent'))
  const rentEntries: RentEntry[] = data.rent || []

  // Auto-update rent tracker (filter entries that match paid bills)
  const updatedRentEntries = rentEntries.map(entry => {
    if (rentBill?.status === 'paid') {
      return { ...entry, reported: true }
    }
    return entry
  })

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

  // Handler: Pay full bill — track actual paid date
  const handlePayFull = (billId: string) => {
    const today = new Date().toISOString().split('T')[0]
    persistBills(bills.map(b =>
      b.id === billId
        ? { ...b, status: 'paid' as const, paidDate: today }
        : b
    ))
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
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-20 overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b p-4 sm:p-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Bill Boss</h1>
            <p className="text-sm mt-1" style={{ color: theme.textM }}>Manage your monthly bills</p>
          </div>
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl transition-colors"
              style={{ backgroundColor: activeNotifCount > 0 ? `${theme.gold}15` : theme.card }}
            >
              {activeNotifCount > 0 ? <BellRing size={22} style={{ color: theme.gold }} /> : <Bell size={22} style={{ color: theme.textM }} />}
              {activeNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: theme.bad, color: '#fff' }}>
                  {activeNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b" style={{ borderColor: theme.border }}>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>Bill Reminders</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.filter(n => !n.dismissed).length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-sm" style={{ color: theme.textM }}>No upcoming reminders</p>
                      </div>
                    ) : (
                      notifications.filter(n => !n.dismissed).map(notif => (
                        <div key={notif.id} className="p-3 border-b last:border-b-0 flex items-center gap-3" style={{ borderColor: `${theme.border}60` }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: notif.type === 'due-today' ? theme.bad : theme.warn }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{notif.billName}</p>
                            <p className="text-xs" style={{ color: theme.textM }}>
                              {notif.type === 'due-today' ? 'Due today' : `Due ${fmtD(notif.dueDate)}`} · {fmt(notif.amount)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleNotifPay(notif.billId)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 hover:opacity-80 transition-colors"
                            style={{ backgroundColor: `${theme.ok}20`, color: theme.ok }}
                          >
                            Pay
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* 1. Hero Card - Total Monthly Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ backgroundImage: `linear-gradient(to bottom right, ${theme.gold}, ${theme.goldD})`, color: theme.bg }}>
            <div className="text-center mb-4">
              <p className="text-sm font-medium opacity-90 mb-2">Total Monthly Bills</p>
              <p className="text-4xl sm:text-5xl font-bold mb-3">{fmt(unpaidTotal)}</p>
              <div className="rounded-lg inline-block px-4 py-1.5" style={{ backgroundColor: `${theme.bg}20` }}>
                <p className="text-sm">
                  Paid: <span className="font-bold">{fmt(paidTotal)}</span>
                </p>
              </div>
            </div>

            {/* Next Bill Due + Quick Pay */}
            {nextBillDue && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: `${theme.bg}25` }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium opacity-80">Next Due</p>
                  <p className="text-base font-bold truncate">{nextBillDue.name}</p>
                  <p className="text-xs opacity-80">{fmtD(nextBillDue.due)} · {fmt(nextBillDue.amount)}</p>
                </div>
                <button
                  onClick={() => handlePayFull(nextBillDue.id)}
                  className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ backgroundColor: theme.bg, color: theme.gold }}
                >
                  Pay
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
          className="flex gap-2"
        >
          <button
            onClick={() => setViewMode('list')}
            style={{
              backgroundColor: viewMode === 'list' ? theme.gold : theme.card,
              color: viewMode === 'list' ? theme.bg : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-4 py-2.5 rounded-lg border font-semibold transition-all"
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('compact')}
            style={{
              backgroundColor: viewMode === 'compact' ? theme.gold : theme.card,
              color: viewMode === 'compact' ? theme.bg : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-4 py-2.5 rounded-lg border font-semibold transition-all"
          >
            Compact View
          </button>
        </motion.div>

        {/* 2. Add Bill Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { if (editingBillId) handleCancelEdit(); else setShowAddForm(!showAddForm) }}
          style={{ backgroundColor: theme.gold, color: theme.bg }}
          className="w-full px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          {editingBillId ? 'Cancel Edit' : 'Add Bill'}
        </motion.button>

        {/* 3. Add Bill Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="border rounded-xl p-6 space-y-4"
            >
              <input
                type="text"
                placeholder="Bill Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                className="w-full px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2"
                onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                />
                <CalendarPicker
                  value={formData.due}
                  onChange={(date) => setFormData({ ...formData, due: date })}
                  placeholder="Due Date"
                  theme={theme}
                />
              </div>

              <select
                value={formData.cat}
                onChange={(e) => setFormData({ ...formData, cat: e.target.value })}
                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {formData.cat === 'Other' && (
                <input
                  type="text"
                  placeholder="Custom Category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="w-full px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                />
              )}

              {/* Recurrence Selector */}
              <div>
                <label style={{ color: theme.textM }} className="text-sm font-medium block mb-2">Recurrence</label>
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as BillRecurrence })}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <option value="one-time">One-Time Payment</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Recurrence Days */}
              {formData.recurrence === 'custom' && (
                <input
                  type="number"
                  placeholder="Days between recurrence"
                  value={formData.customRecurrenceDays}
                  onChange={(e) => setFormData({ ...formData, customRecurrenceDays: e.target.value })}
                  min="1"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="w-full px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                />
              )}

              {/* Recurrence End Options */}
              <div>
                <label style={{ color: theme.textM }} className="text-sm font-medium block mb-2">Recurrence Duration</label>
                <div className="flex gap-2">
                  {([
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: 'after-date', label: 'End Date' },
                    { value: 'after-count', label: 'N Times' },
                  ] as { value: RecurrenceEndType; label: string }[]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, recurrenceEndType: opt.value })}
                      style={{
                        backgroundColor: formData.recurrenceEndType === opt.value ? `${theme.gold}20` : theme.bg,
                        borderColor: formData.recurrenceEndType === opt.value ? theme.gold : theme.border,
                        color: formData.recurrenceEndType === opt.value ? theme.gold : theme.textM,
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.recurrenceEndType === 'after-date' && (
                <CalendarPicker
                  value={formData.recurrenceEndDate || ''}
                  onChange={(date) => setFormData({ ...formData, recurrenceEndDate: date })}
                  placeholder="End Date"
                  theme={theme}
                  showQuickSelect={false}
                />
              )}

              {formData.recurrenceEndType === 'after-count' && (
                <input
                  type="number"
                  placeholder="Number of occurrences"
                  value={formData.recurrenceEndAfter}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndAfter: e.target.value })}
                  min="1"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="w-full px-4 py-2.5 border rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                />
              )}

              <div className="flex gap-3">
                {editingBillId && (
                  <button
                    onClick={handleCancelEdit}
                    style={{ borderColor: theme.border, color: theme.textS }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-semibold border hover:opacity-80 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={editingBillId ? handleSaveEdit : handleAddBill}
                  disabled={!formData.name || !formData.amount || !formData.due}
                  style={{ backgroundColor: theme.gold, color: theme.bg }}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition-colors"
                >
                  {editingBillId ? 'Update Bill' : 'Save Bill'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Bills List — List View (detailed) */}
        {viewMode === 'list' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {visibleBills
              .filter(b => b.status === 'upcoming')
              .map((bill, idx) => (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-5 space-y-3">
                    {/* Bill Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 style={{ color: theme.text }} className="font-bold">{bill.name}</h3>
                        <p className="text-sm" style={{ color: theme.textM }}>
                          {bill.cat} · {fmtD(bill.due)}
                          {bill.recurrence && bill.recurrence !== 'monthly' && (
                            <span> · {bill.recurrence === 'custom' && bill.customRecurrenceDays ? `Every ${bill.customRecurrenceDays}d` : bill.recurrence}</span>
                          )}
                          {bill.recurrenceEndDate && <span> · Ends {fmtD(bill.recurrenceEndDate)}</span>}
                          {bill.recurrenceEndAfter && <span> · {bill.recurrenceEndAfter}x left</span>}
                        </p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                        –{fmt(bill.amount)}
                      </p>
                    </div>

                    {/* Split Payment Schedule (collapsible) */}
                    {bill.alloc.length > 0 && (
                      <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4">
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
                    <div className="flex gap-2 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePayFull(bill.id)}
                        style={{ backgroundColor: `${theme.ok}20`, color: theme.ok }}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm hover:opacity-80 transition-colors"
                      >
                        Pay Full
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStartEdit(bill.id)}
                        style={{ backgroundColor: `${theme.gold}20`, color: theme.gold }}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm hover:opacity-80 transition-colors"
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSplitModalBillId(bill.id)}
                        style={{ backgroundColor: theme.textS, color: theme.textM }}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm hover:opacity-80 transition-colors"
                      >
                        Split
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDeleteBill(bill.id)}
                        style={{ backgroundColor: `${theme.bad}20`, color: theme.bad }}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-sm hover:opacity-80 transition-colors"
                      >
                        Del
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </motion.div>
        )}

        {/* 4b. Bills — Compact View (condensed, easy-to-scan) */}
        {viewMode === 'compact' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
            className="border rounded-xl overflow-hidden divide-y"
          >
            {visibleBills
              .filter(b => b.status === 'upcoming')
              .map((bill, idx) => (
                <motion.div
                  key={bill.id}
                  variants={item}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: theme.border }}
                >
                  {/* Status dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: daysTo(bill.due) <= 3 ? theme.bad : theme.warn }} />
                  {/* Name + Category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{bill.name}</p>
                    <p className="text-[11px]" style={{ color: theme.textM }}>
                      {bill.cat} · Due {fmtD(bill.due)}
                      {bill.recurrenceEndDate && ` · Ends ${fmtD(bill.recurrenceEndDate)}`}
                    </p>
                  </div>
                  {/* Amount */}
                  <p className="text-sm font-bold flex-shrink-0" style={{ color: '#ef4444' }}>–{fmt(bill.amount)}</p>
                  {/* Quick actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handlePayFull(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.ok}15` }}
                      title="Pay"
                    >
                      <Check size={14} style={{ color: theme.ok }} />
                    </button>
                    <button
                      onClick={() => handleStartEdit(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.gold}15` }}
                      title="Edit"
                    >
                      <Edit3 size={14} style={{ color: theme.gold }} />
                    </button>
                    <button
                      onClick={() => handleDeleteBill(bill.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: `${theme.bad}15` }}
                      title="Delete"
                    >
                      <Trash2 size={14} style={{ color: theme.bad }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            {visibleBills.filter(b => b.status === 'upcoming').length === 0 && (
              <div className="p-6 text-center">
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
            className="space-y-3"
          >
            <h3 style={{ color: theme.text }} className="font-bold text-lg mt-6 mb-3">Paid Bills</h3>
            {viewMode === 'list' ? (
              bills
                .filter(b => b.status === 'paid')
                .map(bill => (
                  <div
                    key={bill.id}
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    className="border rounded-xl p-5 opacity-50 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5" style={{ color: theme.ok }} />
                      <div>
                        <p style={{ color: theme.text }} className="font-bold">{bill.name}</p>
                        <p className="text-sm" style={{ color: theme.textM }}>{bill.cat}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p style={{ color: '#ef4444' }} className="font-bold">–{fmt(bill.amount)}</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => persistBills(bills.map(b =>
                          b.id === bill.id ? { ...b, status: 'upcoming' as const } : b
                        ))}
                        style={{ backgroundColor: theme.textS, color: theme.textM }}
                        className="px-3 py-1 text-xs rounded hover:opacity-80 transition-colors"
                      >
                        Undo
                      </motion.button>
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl overflow-hidden divide-y opacity-60">
                {bills.filter(b => b.status === 'paid').map(bill => (
                  <div key={bill.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: theme.border }}>
                    <Check size={14} style={{ color: theme.ok }} />
                    <p className="text-sm flex-1 truncate" style={{ color: theme.text }}>{bill.name}</p>
                    <p className="text-sm font-bold" style={{ color: theme.textM }}>–{fmt(bill.amount)}</p>
                    <button
                      onClick={() => persistBills(bills.map(b => b.id === bill.id ? { ...b, status: 'upcoming' as const } : b))}
                      className="text-[10px] px-2 py-0.5 rounded hover:opacity-80 transition-colors"
                      style={{ backgroundColor: theme.textS, color: theme.textM }}
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 6. Rent Tracker Section */}
        {rentBill ? (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            style={{ backgroundColor: `${theme.gold}10`, borderColor: `${theme.gold}30` }}
            className="border rounded-xl p-6 mt-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 style={{ color: theme.gold }} className="font-bold text-lg">Rent Tracker</h3>
                <p style={{ color: theme.textM }} className="text-sm mt-1">Monthly: {fmt(rentBill.amount)}</p>
              </div>
              <div style={{ backgroundColor: theme.gold, color: theme.bg }} className="rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                {updatedRentEntries.filter(r => r.reported).length}
              </div>
            </div>

            {/* Auto-tracked status */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: rentBill.status === 'paid' ? `${theme.ok}15` : `${theme.warn}15` }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rentBill.status === 'paid' ? theme.ok : theme.warn }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: rentBill.status === 'paid' ? theme.ok : theme.warn }}>
                  {rentBill.status === 'paid' ? 'Rent Paid This Month' : 'Rent Due'}
                </p>
                <p className="text-xs" style={{ color: theme.textM }}>
                  {rentBill.status === 'paid' ? 'Automatically tracked from your payment' : `Due ${fmtD(rentBill.due)} — mark as paid in your bills list`}
                </p>
              </div>
              {rentBill.status === 'paid' && <Check size={18} style={{ color: theme.ok }} />}
            </div>

            {updatedRentEntries.length > 0 && (
              <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4">
                <p className="text-xs font-bold mb-3" style={{ color: theme.textM }}>Payment History</p>
                <div className="space-y-3">
                  {updatedRentEntries.map(entry => (
                    <div key={entry.id} style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium" style={{ color: theme.text }}>{entry.month}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium`} style={{ backgroundColor: entry.reported ? `${theme.ok}20` : `${theme.textM}20`, color: entry.reported ? theme.ok : theme.textM }}>
                            {entry.reported ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: theme.textM }}>{fmt(rentBill.amount)}</p>
                        {rentReceipts[entry.id] ? (
                          <span className="text-xs flex items-center gap-1" style={{ color: theme.ok }}>
                            <Check size={12} /> Receipt uploaded
                          </span>
                        ) : (
                          <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: theme.gold }}>
                            <Upload size={12} />
                            Upload Receipt
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setRentReceipts(prev => ({ ...prev, [entry.id]: e.target.files![0].name }))
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            style={{ backgroundColor: `${theme.bad}10`, borderColor: `${theme.bad}30` }}
            className="border rounded-xl p-6 mt-6 flex items-center gap-4"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: theme.bad }} />
            <div>
              <p style={{ color: theme.bad }} className="font-semibold">No Rent Bill Found</p>
              <p style={{ color: theme.textM }} className="text-sm">Add a housing bill to track rent reporting</p>
            </div>
          </motion.div>
        )}
      </div>

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
              className="w-full border-t rounded-t-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 style={{ color: theme.text }} className="font-bold text-lg">Split Payment</h2>
                <button
                  onClick={() => setSplitModalBillId(null)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ backgroundColor: theme.textS }}
                >
                  <X className="w-5 h-5" style={{ color: theme.textM }} />
                </button>
              </div>

              <p style={{ color: theme.textM }} className="text-sm">
                Split this bill into how many payments?
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map(num => (
                  <motion.button
                    key={num}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApplySplit(splitModalBillId, num)}
                    style={{ backgroundColor: theme.textS, color: theme.text }}
                    className="px-4 py-3 rounded-lg font-semibold hover:opacity-80 transition-colors"
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
