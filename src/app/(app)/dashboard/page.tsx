'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy,
} from 'lucide-react'

import { getDemoData } from '@/lib/demo-data'
import { fmt, fmtD, daysTo, calcAlloc, pct } from '@/lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

function CreditScoreRing({ score, limit }: { score: number; limit: number }) {
  const circ = 2 * Math.PI * 42
  const offset = circ - (score / limit) * circ

  let color = '#ef4444'
  let label = 'Poor'

  if (score >= 800) {
    color = '#22c55e'
    label = 'Excellent'
  } else if (score >= 740) {
    color = '#22c55e'
    label = 'Very Good'
  } else if (score >= 670) {
    color = '#d4a843'
    label = 'Good'
  } else if (score >= 580) {
    color = '#f59e0b'
    label = 'Fair'
  }

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="4" />
        <motion.circle
          cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ} strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-xl font-bold text-fafafa">{score}</p>
          <p className="text-xs font-semibold text-center" style={{ color }}>{label}</p>
        </motion.div>
      </div>
    </div>
  )
}

function ProgressBar({ current, target, color = '#d4a843' }: { current: number; target: number; color?: string }) {
  const percentage = Math.min((current / target) * 100, 100)
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#27272a' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

export default function DashboardPage() {
  const data = useMemo(() => getDemoData(), [])

  const { user, income, bills, goals, plaid, groups } = data
  const group = groups[0] || null

  const allocation = useMemo(() => calcAlloc(income, bills, goals), [income, bills, goals])
  const paycheckAmt = useMemo(() => {
    const rate = parseFloat(user.payRate) || 0
    const hrs = parseFloat(user.hoursPerDay) || 8
    const mult: Record<string, number> = { weekly: 5, biweekly: 10, semimonthly: 10.83, monthly: 21.67 }
    return rate * hrs * (mult[user.payFreq] || 10)
  }, [user])
  const firstName = user.name.split(' ')[0]
  const upcomingBills = useMemo(
    () => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 3),
    [bills]
  )
  const topGoals = useMemo(
    () => goals.filter(g => g.active).sort((a, b) => pct(b.current, b.target) - pct(a.current, a.target)).slice(0, 2),
    [goals]
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', color: '#fafafa' }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-5 py-6 pb-12 space-y-6 max-w-4xl"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h1 className="text-5xl font-bold" style={{ color: '#d4a843' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-lg" style={{ color: '#a1a1aa' }}>
            Here's your financial snapshot
          </p>
        </motion.div>

        {/* Safe to Spend + Next Pay */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
          {/* Safe to Spend Card */}
          <div
            className="rounded-2xl p-6 backdrop-blur-sm border"
            style={{
              backgroundColor: 'rgba(212, 168, 67, 0.08)',
              borderColor: '#d4a843',
            }}
          >
            <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>Safe to Spend</p>
            <p className="text-4xl font-bold mb-2" style={{ color: '#d4a843' }}>
              {fmt(allocation.sts)}
            </p>
            <p className="text-sm" style={{ color: '#71717a' }}>
              ~{fmt(allocation.daily)}/day
            </p>
          </div>

          {/* Next Pay Card */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
            }}
          >
            <p className="text-sm mb-2" style={{ color: '#a1a1aa' }}>Next Paycheck</p>
            <p className="text-3xl font-bold mb-1" style={{ color: '#d4a843' }}>
              {fmt(paycheckAmt)}
            </p>
            <p className="text-sm" style={{ color: '#71717a' }}>
              {fmtD(user.nextPay)} · {daysTo(user.nextPay)}d
            </p>
          </div>
        </motion.div>

        {/* Allocated Card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-6 border w-full"
          style={{
            backgroundColor: allocation.short <= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            borderColor: allocation.short <= 0 ? '#22c55e' : '#ef4444',
          }}
        >
          <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>Allocated</p>
          <p className="text-4xl font-bold mb-1" style={{
            color: allocation.short <= 0 ? '#22c55e' : '#ef4444',
          }}>
            {fmt(allocation.br + allocation.sr)}
          </p>
          <p className="text-sm" style={{ color: '#71717a' }}>
            Bills + Savings + Spending
          </p>
        </motion.div>

        {/* Plaid Linked Accounts */}
        <motion.div variants={fadeUp}>
          {plaid?.connected ? (
            <div className="grid grid-cols-3 gap-3">
              {/* Checking */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                }}
              >
                <p className="text-xs mb-2" style={{ color: '#a1a1aa' }}>Checking</p>
                <p className="text-xl font-bold" style={{ color: '#22c55e' }}>
                  {fmt(plaid!.checkingBalance)}
                </p>
              </div>

              {/* Savings */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                }}
              >
                <p className="text-xs mb-2" style={{ color: '#a1a1aa' }}>Savings</p>
                <p className="text-xl font-bold" style={{ color: '#d4a843' }}>
                  {fmt(plaid!.savingsBalance)}
                </p>
              </div>

              {/* Credit */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                }}
              >
                <p className="text-xs mb-2" style={{ color: '#a1a1aa' }}>Credit Used</p>
                <p className="text-xl font-bold" style={{ color: '#ef4444' }}>
                  {fmt(plaid!.creditUsed)}/{fmt(plaid!.creditLimit)}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-4 border text-center"
              style={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
              }}
            >
              <p style={{ color: '#71717a' }}>Connect your bank to see account balances</p>
            </div>
          )}
        </motion.div>

        {/* Credit Score Card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-6 border cursor-pointer hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: '#18181b',
            borderColor: '#27272a',
          }}
          onClick={() => window.location.href = '/smart-stack'}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#a1a1aa' }}>Credit Score</p>
              <p className="text-lg font-semibold" style={{ color: '#a1a1aa' }}>
                {user.creditScore >= 800 ? 'Excellent' : user.creditScore >= 740 ? 'Very Good' : user.creditScore >= 670 ? 'Good' : user.creditScore >= 580 ? 'Fair' : 'Poor'}
              </p>
              <p className="text-xs mt-2" style={{ color: '#71717a' }}>
                {user.utilization}% utilization
              </p>
            </div>
            <CreditScoreRing score={user.creditScore} limit={850} />
          </div>
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Upcoming Bills</h2>
            <Link
              href="/bill-boss"
              className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#d4a843' }}
            >
              See All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingBills.map((bill, i) => {
              const days = daysTo(bill.due)
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl p-4 border flex items-center justify-between hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                  }}
                >
                  <div>
                    <p className="font-semibold">{bill.name}</p>
                    <p className="text-sm" style={{ color: '#71717a' }}>
                      {bill.cat} · {fmtD(bill.due)} · {days}d
                    </p>
                  </div>
                  <p className="font-bold" style={{ color: '#d4a843' }}>
                    {fmt(bill.amount)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Stack Circle Group Stats */}
        {group && (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: 'rgba(212, 168, 67, 0.05)',
              borderColor: '#d4a843',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm mb-1" style={{ color: '#a1a1aa' }}>Stack Circle</p>
                <h3 className="text-2xl font-bold">{group.name}</h3>
                <p className="text-sm mt-2 flex items-center gap-1" style={{ color: '#71717a' }}>
                  <Users size={16} /> {group.members.length} members
                </p>
              </div>
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  backgroundColor: 'rgba(212, 168, 67, 0.15)',
                }}
              >
                <code className="text-sm font-mono" style={{ color: '#d4a843' }}>{group.code}</code>
                <Copy size={14} style={{ color: '#d4a843' }} />
              </div>
            </div>
            <div className="space-y-3">
              <ProgressBar current={group.current} target={group.target} color="#d4a843" />
              <div className="grid grid-cols-3 gap-2">
                {group.members.slice(0, 3).map((member, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs" style={{ color: '#71717a' }}>Member {i + 1}</p>
                    <p className="text-sm font-semibold">{pct(member.contrib || 0, group.target)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Savings Goals */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Savings Goals</h2>
            <Link
              href="/smart-stack"
              className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#d4a843' }}
            >
              See All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-4">
            {topGoals.map((goal, i) => {
              const percentage = pct(goal.current, goal.target)
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl p-4 border"
                  style={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{goal.name}</p>
                    <p className="text-sm font-semibold" style={{ color: '#d4a843' }}>
                      {percentage}%
                    </p>
                  </div>
                  <ProgressBar current={goal.current} target={goal.target} color="#d4a843" />
                  <p className="text-xs mt-2" style={{ color: '#71717a' }}>
                    {fmt(goal.current)} / {fmt(goal.target)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
