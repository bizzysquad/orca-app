'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, AlertCircle, X, ChevronLeft, ChevronRight, Calendar, Upload } from 'lucide-react'
import { getDemoData } from '@/lib/demo-data'
import { fmt, fmtD, daysTo, gid, calcAlloc, calcIncome } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

import type { Bill, BillAlloc, RentEntry, BillRecurrence } from '@/lib/types'

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

const RECURRENCE_OPTIONS: BillRecurrence[] = ['weekly', 'monthly', 'yearly', 'custom']

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

  // Get all events for a day including split payments
  const getEventsForDay = (day: number) => {
    const events: { label: string; amount: number; type: 'bill' | 'split'; paid: boolean }[] = []

    bills.forEach(b => {
      // Check main due date
      const d = new Date(b.due + 'T00:00:00')
      if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
        if (b.alloc.length === 0) {
          events.push({ label: b.name, amount: b.amount, type: 'bill', paid: b.status === 'paid' })
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
        className={`aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs sm:text-sm transition-all cursor-pointer ${
          isToday ? `bg-[${theme.gold}]/20 border border-[${theme.gold}]` : ''
        } ${selectedDay === d ? `bg-[${theme.gold}]/10 border border-[${theme.gold}]/50` : ''} ${hasBill && !allPaid && selectedDay !== d ? `bg-[${theme.bad}]/10` : ''} ${allPaid && selectedDay !== d ? `bg-[${theme.ok}]/10` : ''}`}
      >
        <span className={`font-medium ${isToday ? `text-[${theme.gold}]` : hasBill ? `text-[${theme.text}]` : `text-[${theme.textM}]`}`}>
          {d}
        </span>
        {hasBill && (
          <div className="flex gap-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map((ev, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${ev.paid ? `bg-[${theme.ok}]` : ev.type === 'split' ? `bg-[#f59e0b]` : `bg-[${theme.bad}]`}`} />
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
  const demoData = useMemo(() => getDemoData(), [])
  const { theme } = useTheme()

  const [bills, setBills] = useState(demoData.bills || [] as Bill[])
  const [showAddForm, setShowAddForm] = useState(false)
  const [splitModalBillId, setSplitModalBillId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [calMonth, setCalMonth] = useState(2)
  const [calYear, setCalYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [rentReceipts, setRentReceipts] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due: '',
    cat: CATEGORIES[0],
    freq: 'monthly',
    recurrence: 'monthly' as BillRecurrence,
    customRecurrenceDays: '',
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

  // Calculate weekly income and bills
  const weeklyIncome = calcIncome(demoData.income)
  const { br: weeklyBills } = calcAlloc(demoData.income, bills, demoData.goals)
  const incomeToExpenseRatio = weeklyIncome > 0 ? (weeklyBills / weeklyIncome) * 100 : 0

  const getHealthStatus = () => {
    if (incomeToExpenseRatio <= 70) return { text: 'Healthy', color: theme.ok }
    if (incomeToExpenseRatio <= 90) return { text: 'Tight', color: theme.warn }
    return { text: 'Over Budget', color: theme.bad }
  }

  const healthStatus = getHealthStatus()

  // Filter bills based on view mode
  const getVisibleBills = () => {
    if (viewMode === 'monthly') return bills

    // Weekly view: bills due in the next 7 days from today
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    return bills.filter(b => {
      const dueDate = new Date(b.due)
      return dueDate >= today && dueDate <= nextWeek
    })
  }

  // Get rent bill if exists
  const rentBill = bills.find(b => b.cat.toLowerCase() === 'housing' && b.name.toLowerCase().includes('rent'))
  const rentEntries: RentEntry[] = demoData.rent || []

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
      status: 'upcoming',
      alloc: [],
    }

    setBills([...bills, newBill])
    setFormData({
      name: '',
      amount: '',
      due: '',
      cat: CATEGORIES[0],
      freq: 'monthly',
      recurrence: 'monthly',
      customRecurrenceDays: '',
    })
    setCustomCategory('')
    setShowAddForm(false)
  }

  // Handler: Pay full bill
  const handlePayFull = (billId: string) => {
    setBills(bills.map(b =>
      b.id === billId
        ? { ...b, status: 'paid' as const }
        : b
    ))
  }

  // Handler: Delete bill
  const handleDeleteBill = (billId: string) => {
    setBills(bills.filter(b => b.id !== billId))
  }

  // Handler: Apply split
  const handleApplySplit = (billId: string, numPayments: number) => {
    setBills(bills.map(b => {
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
    setBills(bills.map(b => {
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

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b p-4 sm:p-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Bill Boss</h1>
        <p className="text-sm mt-1" style={{ color: theme.textM }}>Manage your monthly bills</p>
      </motion.div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* 1. Hero Card - Total Monthly Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl p-8" style={{ backgroundImage: `linear-gradient(to bottom right, ${theme.gold}, ${theme.goldD})`, color: theme.bg }}>
            <div className="text-center">
              <p className="text-sm font-medium opacity-90 mb-2">Total Monthly Bills</p>
              <p className="text-4xl sm:text-5xl font-bold mb-6">{fmt(unpaidTotal)}</p>
              <div className="rounded-lg inline-block px-4 py-2" style={{ backgroundColor: `${theme.bg}20` }}>
                <p className="text-sm">
                  Paid: <span className="font-bold">{fmt(paidTotal)}</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Income-to-Expense Ratio Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.textM }}>Income vs Bills Ratio</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{incomeToExpenseRatio.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: theme.textM }}>Status</p>
              <p className="text-lg font-bold mt-1" style={{ color: healthStatus.color }}>{healthStatus.text}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.textM + '20' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(incomeToExpenseRatio, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                backgroundImage: `linear-gradient(to right, ${theme.ok}, ${theme.warn}, ${theme.bad})`,
              }}
            />
          </div>

          <p className="text-xs mt-3" style={{ color: theme.textM }}>
            Weekly Income: {fmt(weeklyIncome)} • Weekly Bills: {fmt(weeklyBills)}
          </p>
        </motion.div>

        {/* Bill Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <BillCalendar
            bills={visibleBills}
            month={calMonth}
            year={calYear}
            onMonthChange={handleMonthChange}
            onDayClick={(day) => setSelectedDay(day === 0 ? null : day)}
            selectedDay={selectedDay}
            theme={theme}
          />
        </motion.div>

        {/* Weekly/Monthly Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="flex gap-2"
        >
          <button
            onClick={() => setViewMode('weekly')}
            style={{
              backgroundColor: viewMode === 'weekly' ? theme.gold : theme.card,
              color: viewMode === 'weekly' ? theme.bg : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-4 py-2.5 rounded-lg border font-semibold transition-all"
          >
            Weekly View
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            style={{
              backgroundColor: viewMode === 'monthly' ? theme.gold : theme.card,
              color: viewMode === 'monthly' ? theme.bg : theme.text,
              borderColor: theme.border,
            }}
            className="flex-1 px-4 py-2.5 rounded-lg border font-semibold transition-all"
          >
            Monthly View
          </button>
        </motion.div>

        {/* 2. Add Bill Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ backgroundColor: theme.gold, color: theme.bg }}
          className="w-full px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Bill
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
                <input
                  type="date"
                  value={formData.due}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.gold}40`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
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

              <button
                onClick={handleAddBill}
                disabled={!formData.name || !formData.amount || !formData.due}
                style={{ backgroundColor: theme.gold, color: theme.bg }}
                className="w-full px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition-colors"
              >
                Save Bill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Bills List */}
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
                      </p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: theme.gold }}>{fmt(bill.amount)}</p>
                  </div>

                  {/* Split Payment Schedule (if split) */}
                  {bill.alloc.length > 0 && (
                    <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4">
                      <p className="text-xs font-bold mb-3" style={{ color: theme.gold }}>BILLS SCHEDULE</p>
                      <div className="space-y-2">
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
                              <span className={`text-sm ${
                                alloc.paid
                                  ? 'line-through'
                                  : ''
                              }`} style={{ color: alloc.paid ? theme.textM : theme.textM }}>
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

        {/* 5. Paid Bills Section */}
        {bills.filter(b => b.status === 'paid').length > 0 && (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <h3 style={{ color: theme.text }} className="font-bold text-lg mt-6 mb-3">Paid Bills</h3>
            {bills
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
                    <p style={{ color: theme.gold }} className="font-bold">{fmt(bill.amount)}</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setBills(bills.map(b =>
                        b.id === bill.id ? { ...b, status: 'upcoming' as const } : b
                      ))}
                      style={{ backgroundColor: theme.textS, color: theme.textM }}
                      className="px-3 py-1 text-xs rounded hover:opacity-80 transition-colors"
                    >
                      Undo
                    </motion.button>
                  </div>
                </div>
              ))}
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ backgroundColor: theme.gold, color: theme.bg }}
              className="w-full px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-colors mb-4"
            >
              Report Current Month
            </motion.button>

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
