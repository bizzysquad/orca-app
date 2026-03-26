'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo } from '@/lib/utils'
import { buildWeeklySplit } from '@/lib/budget'
import { useTheme } from '@/context/ThemeContext'

const statCard = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function WeeklySplitPage() {
  const { data, loading } = useOrcaData()
  const { theme } = useTheme()
  const summary = useMemo(() => buildWeeklySplit(data.income, data.bills, data.goals, data.expenses, 'due-date-aware', data.user), [data])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg, color: theme.text }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-14" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <motion.div initial="hidden" animate="show" className="px-5 py-6 space-y-5 max-w-5xl mx-auto">
        <motion.div variants={statCard} className="rounded-2xl border p-6" style={{ borderColor: theme.border, backgroundColor: theme.bgS }}>
          <h1 className="text-3xl font-bold" style={{ color: theme.gold }}>Weekly Income Split</h1>
          <p className="text-sm mt-1" style={{ color: theme.textM }}>An income-focused breakdown for your money survival plan.</p>
        </motion.div>

        <motion.div variants={statCard} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <p className="text-sm" style={{ color: theme.textM }}>Weekly Income</p>
            <p className="text-3xl font-bold" style={{ color: theme.gold }}>{fmt(summary.weeklyIncome)}</p>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <p className="text-sm" style={{ color: theme.textM }}>Reserved for Bills</p>
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{fmt(summary.billReserve)}</p>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <p className="text-sm" style={{ color: theme.textM }}>Reserved for Savings</p>
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{fmt(summary.savingsReserve)}</p>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <p className="text-sm" style={{ color: theme.textM }}>Safe-to-Spend Weekly</p>
            <p className="text-3xl font-bold" style={{ color: summary.safeToSpendWeekly > 0 ? '#22c55e' : '#ef4444' }}>
              {fmt(summary.safeToSpendWeekly)}
            </p>
            <p className="text-xs" style={{ color: theme.textS }}>Daily: {fmt(summary.safeToSpendDaily)}</p>
          </div>
        </motion.div>

        <motion.div variants={statCard} className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>Current Week Health</h2>
          <p className="text-sm mt-1" style={{ color: theme.textM }}>Next payment: {fmtD(summary.nextPaycheckDate)} ({daysTo(summary.nextPaycheckDate)} days)</p>
          <p className="mt-3 text-base" style={{ color: theme.text }}>Urgent due-before-next-payment reserve: {fmt(summary.urgentBillAmount)}</p>
          {summary.shortfall > 0 ? (
            <p className="mt-2 text-sm" style={{ color: '#ef4444' }}>Shortfall warning: {fmt(summary.shortfall)}. Needs action now.</p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: '#22c55e' }}>You are on track this week. Keep it up.</p>
          )}
          <p className="mt-3 text-sm" style={{ color: theme.textM }}>Suggestion: {summary.topSuggestion}</p>
        </motion.div>

        <motion.div variants={statCard} className="rounded-2xl border p-5 space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Allocation Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(summary.breakdown).map(([label, value]) => (
              <div key={label} className="rounded-lg p-3" style={{ backgroundColor: theme.bg }}>
                <p className="text-xs uppercase" style={{ color: theme.textM }}>{label}</p>
                <p className="text-base font-bold" style={{ color: label === 'flexible' ? theme.gold : theme.text }}>
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
