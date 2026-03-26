'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo } from '@/lib/utils'
import { buildWeeklySplit } from '@/lib/budget'

const statCard = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function WeeklySplitPage() {
  const { data, loading } = useOrcaData()
  const summary = useMemo(() => buildWeeklySplit(data.income, data.bills, data.goals, data.expenses, 'due-date-aware', data.user), [data])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa]">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] pb-14">
      <motion.div initial="hidden" animate="show" className="px-5 py-6 space-y-5 max-w-5xl mx-auto">
        <motion.div variants={statCard} className="rounded-2xl border border-[#27272a] bg-[#121214] p-6">
          <h1 className="text-3xl font-bold text-[#d4a843]">Weekly Income Split</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">An income-focused breakdown for your money survival plan.</p>
        </motion.div>

        <motion.div variants={statCard} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <p className="text-sm text-[#a1a1aa]">Weekly Income</p>
            <p className="text-3xl font-bold text-[#d4a843]">{fmt(summary.weeklyIncome)}</p>
          </div>
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <p className="text-sm text-[#a1a1aa]">Reserved for Bills</p>
            <p className="text-3xl font-bold text-[#22c55e]">{fmt(summary.billReserve)}</p>
          </div>
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <p className="text-sm text-[#a1a1aa]">Reserved for Savings</p>
            <p className="text-3xl font-bold text-[#22c55e]">{fmt(summary.savingsReserve)}</p>
          </div>
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <p className="text-sm text-[#a1a1aa]">Safe-to-Spend Weekly</p>
            <p className="text-3xl font-bold" style={{ color: summary.safeToSpendWeekly > 0 ? '#22c55e' : '#ef4444' }}>
              {fmt(summary.safeToSpendWeekly)}
            </p>
            <p className="text-xs text-[#71717a]">Daily: {fmt(summary.safeToSpendDaily)}</p>
          </div>
        </motion.div>

        <motion.div variants={statCard} className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
          <h2 className="text-xl font-bold">Current Week Health</h2>
          <p className="text-sm text-[#a1a1aa] mt-1">Next payment: {fmtD(summary.nextPaycheckDate)} ({daysTo(summary.nextPaycheckDate)} days)</p>
          <p className="mt-3 text-base text-[#fafafa]">Urgent due-before-next-payment reserve: {fmt(summary.urgentBillAmount)}</p>
          {summary.shortfall > 0 ? (
            <p className="mt-2 text-sm text-[#ef4444]">Shortfall warning: {fmt(summary.shortfall)}. Needs action now.</p>
          ) : (
            <p className="mt-2 text-sm text-[#22c55e]">You are on track this week. Keep it up.</p>
          )}
          <p className="mt-3 text-sm text-[#a1a1aa]">Suggestion: {summary.topSuggestion}</p>
        </motion.div>

        <motion.div variants={statCard} className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 space-y-3">
          <h3 className="text-lg font-semibold">Allocation Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(summary.breakdown).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#09090b] p-3">
                <p className="text-xs uppercase text-[#a1a1aa]">{label}</p>
                <p className="text-base font-bold" style={{ color: label === 'flexible' ? '#d4a843' : '#fafafa' }}>
                  {fmt(value)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
