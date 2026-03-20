'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, AlertCircle, X } from 'lucide-react'
import { getDemoData } from '@/lib/demo-data'
import { fmt, fmtD, daysTo, gid } from '@/lib/utils'

import type { Bill, BillAlloc, RentEntry } from '@/lib/types'

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

export default function BillBossPage() {
  const demoData = useMemo(() => getDemoData(), [])

  const [bills, setBills] = useState(demoData.bills || [] as Bill[])
  const [showAddForm, setShowAddForm] = useState(false)
  const [splitModalBillId, setSplitModalBillId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due: '',
    cat: CATEGORIES[0],
    freq: 'monthly',
  })

  // Calculate unpaid total
  const unpaidTotal = bills
    .filter(b => b.status === 'upcoming')
    .reduce((sum, b) => sum + b.amount, 0)

  // Calculate paid total
  const paidTotal = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0)

  // Get rent bill if exists
  const rentBill = bills.find(b => b.cat.toLowerCase() === 'housing' && b.name.toLowerCase().includes('rent'))
  const rentEntries: RentEntry[] = demoData.rent || []

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

  return (
    <div className="min-h-screen bg-[#09090b] pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-b border-[#27272a] p-4 sm:p-6"
      >
        <h1 className="text-3xl font-bold text-[#fafafa]">Bill Boss</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Manage your monthly bills</p>
      </motion.div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* 1. Hero Card - Total Monthly Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-[#d4a843] to-[#b8941e] text-[#09090b]">
            <div className="text-center">
              <p className="text-sm font-medium opacity-90 mb-2">Total Monthly Bills</p>
              <p className="text-5xl font-bold mb-6">{fmt(unpaidTotal)}</p>
              <div className="bg-[#09090b]/10 rounded-lg inline-block px-4 py-2">
                <p className="text-sm">
                  Paid: <span className="font-bold">{fmt(paidTotal)}</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Add Bill Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full px-6 py-3 rounded-xl bg-[#d4a843] text-[#09090b] font-semibold flex items-center justify-center gap-2 hover:bg-[#e0b857] transition-colors"
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
              className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 space-y-4"
            >
              <input
                type="text"
                placeholder="Bill Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
                <input
                  type="date"
                  value={formData.due}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                  className="px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>

              <select
                value={formData.cat}
                onChange={(e) => setFormData({ ...formData, cat: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
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
                  className="w-full px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              )}

              <button
                onClick={handleAddBill}
                disabled={!formData.name || !formData.amount || !formData.due}
                className="w-full px-4 py-2.5 rounded-lg bg-[#d4a843] text-[#09090b] font-semibold disabled:opacity-50 hover:bg-[#e0b857] transition-colors"
              >
                Save Bill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Upcoming Bills List */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {bills
            .filter(b => b.status === 'upcoming')
            .map((bill, idx) => (
              <motion.div
                key={bill.id}
                variants={item}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-3">
                  {/* Bill Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-[#fafafa] font-bold">{bill.name}</h3>
                      <p className="text-sm text-[#a1a1aa]">
                        {bill.cat} · {fmtD(bill.due)}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-[#d4a843]">{fmt(bill.amount)}</p>
                  </div>

                  {/* Split Payment Schedule (if split) */}
                  {bill.alloc.length > 0 && (
                    <div className="bg-[#09090b] rounded-lg p-4 border border-[#27272a]">
                      <p className="text-xs font-bold text-[#d4a843] mb-3">PAYMENT SCHEDULE</p>
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
                                <Check className="w-4 h-4 text-[#22c55e]" />
                              )}
                              <span className={`text-sm ${
                                alloc.paid
                                  ? 'text-[#71717a] line-through'
                                  : 'text-[#a1a1aa]'
                              }`}>
                                {fmtD(alloc.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#fafafa]">
                                {fmt(alloc.amount)}
                              </span>
                              {!alloc.paid && (
                                <button
                                  onClick={() => handlePayment(bill.id, alloc.id)}
                                  className="px-2 py-1 text-xs bg-[#22c55e]/20 text-[#22c55e] rounded hover:bg-[#22c55e]/30 transition-colors"
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
                      className="flex-1 px-4 py-2 rounded-lg bg-[#22c55e]/20 text-[#22c55e] font-medium text-sm hover:bg-[#22c55e]/30 transition-colors"
                    >
                      Pay Full
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSplitModalBillId(bill.id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#27272a] text-[#a1a1aa] font-medium text-sm hover:bg-[#2a2a2e] transition-colors"
                    >
                      Split
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDeleteBill(bill.id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#ef4444]/20 text-[#ef4444] font-medium text-sm hover:bg-[#ef4444]/30 transition-colors"
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
            <h3 className="text-[#fafafa] font-bold text-lg mt-6 mb-3">Paid Bills</h3>
            {bills
              .filter(b => b.status === 'paid')
              .map(bill => (
                <div
                  key={bill.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 opacity-50 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#22c55e]" />
                    <div>
                      <p className="text-[#fafafa] font-bold">{bill.name}</p>
                      <p className="text-sm text-[#a1a1aa]">{bill.cat}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[#d4a843] font-bold">{fmt(bill.amount)}</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setBills(bills.map(b =>
                        b.id === bill.id ? { ...b, status: 'upcoming' as const } : b
                      ))}
                      className="px-3 py-1 text-xs bg-[#27272a] text-[#a1a1aa] rounded hover:bg-[#2a2a2e] transition-colors"
                    >
                      Undo
                    </motion.button>
                  </div>
                </div>
              ))}
          </motion.div>
        )}

        {/* 6. Rent Reporter Section */}
        {rentBill ? (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="mt-6 bg-gradient-to-br from-[#d4a843]/10 to-[#d4a843]/5 border border-[#d4a843]/30 rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-[#d4a843] font-bold text-lg">Rent Reporter</h3>
                <p className="text-[#a1a1aa] text-sm mt-1">Monthly: {fmt(rentBill.amount)}</p>
              </div>
              <div className="bg-[#d4a843] text-[#09090b] rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                {rentEntries.filter(r => r.reported).length}
              </div>
            </div>

            <p className="text-[#71717a] text-xs mb-4">+20-40 pts impact</p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-2.5 rounded-lg bg-[#d4a843] text-[#09090b] font-semibold hover:bg-[#e0b857] transition-colors mb-4"
            >
              Report Current Month
            </motion.button>

            {rentEntries.length > 0 && (
              <div className="bg-[#09090b] rounded-lg p-4 border border-[#27272a]">
                <p className="text-xs font-bold text-[#a1a1aa] mb-3">History</p>
                <div className="space-y-2">
                  {rentEntries.map(entry => (
                    <div key={entry.id} className="flex justify-between items-center text-sm">
                      <span className="text-[#a1a1aa]">{entry.month}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.reported
                            ? 'bg-[#22c55e]/20 text-[#22c55e]'
                            : 'bg-[#71717a]/20 text-[#a1a1aa]'
                        }`}>
                          {entry.reported ? 'Reported' : 'Pending'}
                        </span>
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
            className="mt-6 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-6 flex items-center gap-4"
          >
            <AlertCircle className="w-6 h-6 text-[#ef4444] flex-shrink-0" />
            <div>
              <p className="text-[#ef4444] font-semibold">No Rent Bill Found</p>
              <p className="text-[#a1a1aa] text-sm">Add a housing bill to track rent reporting</p>
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
              className="w-full bg-[#18181b] border-t border-[#27272a] rounded-t-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#fafafa] font-bold text-lg">Split Payment</h2>
                <button
                  onClick={() => setSplitModalBillId(null)}
                  className="p-1 hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#a1a1aa]" />
                </button>
              </div>

              <p className="text-[#a1a1aa] text-sm">
                Split this bill into how many payments?
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map(num => (
                  <motion.button
                    key={num}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApplySplit(splitModalBillId, num)}
                    className="px-4 py-3 rounded-lg bg-[#27272a] text-[#fafafa] font-semibold hover:bg-[#2a2a2e] transition-colors"
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
