'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo } from '@/lib/utils'
import { buildWeeklySplit } from '@/lib/budget'
import { useTheme } from '@/context/ThemeContext'
import { useFinancialEngine } from '@/lib/financialEngine'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingDown, Pause, ArrowRight } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

// ── Explanation Card ──
function ExplainCard({ title, value, explanation, color, theme }: {
  title: string; value: string; explanation: string; color: string; theme: any
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: theme.textM }}>{title}</p>
        <button onClick={() => setOpen(o => !o)} className="text-xs opacity-50 hover:opacity-100 flex items-center gap-1" style={{ color: theme.textS }}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Why?
        </button>
      </div>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-xs mt-3 p-3 rounded-xl" style={{ backgroundColor: theme.bg, color: theme.textS }}>{explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Smart Suggestion Card ──
function SuggestionCard({ icon, title, description, urgency, theme }: {
  icon: React.ReactNode; title: string; description: string; urgency: 'high' | 'medium' | 'low'; theme: any
}) {
  const color = urgency === 'high' ? '#EF4444' : urgency === 'medium' ? '#F59E0B' : '#10B981'
  return (
    <div className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}30` }}>
      <span className="mt-0.5" style={{ color }}>{icon}</span>
      <div>
        <p className="text-sm font-bold" style={{ color }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: theme.textS }}>{description}</p>
      </div>
    </div>
  )
}

export default function WeeklySplitPage() {
  const { data, loading } = useOrcaData()
  const { theme } = useTheme()

  const summary = useMemo(() =>
    buildWeeklySplit(data.income, data.bills, data.goals, data.expenses, 'due-date-aware', data.user),
    [data]
  )

  // ── Engine for action-first insights ──
  const engine = useFinancialEngine({
    incomeSources: data.income || [],
    bills: data.bills || [],
    savingsGoals: data.goals || [],
    accountSettings: {
      balance: data.user?.checkingBalance || 0,
      buffer: data.user?.safeToSpendBuffer || 0,
    },
  })

  // ── Smart Suggestions ──
  const suggestions = useMemo(() => {
    const result: { icon: React.ReactNode; title: string; description: string; urgency: 'high' | 'medium' | 'low' }[] = []

    if (summary.shortfall > 0) {
      result.push({
        icon: <AlertCircle size={16} />,
        title: 'Pause Discretionary Spending',
        description: `You have a ${fmt(summary.shortfall)} shortfall this week. Hold off on non-essential purchases until your next paycheck.`,
        urgency: 'high',
      })
    }

    if (engine.riskLevel === 'tight' && engine.reservedForSavings > 0) {
      result.push({
        icon: <Pause size={16} />,
        title: 'Delay Savings Transfer',
        description: `Consider pausing your ${fmt(engine.reservedForSavings)} weekly savings contribution this cycle to maintain cash flow.`,
        urgency: 'medium',
      })
    }

    if (summary.urgentBillAmount > 0 && summary.urgentBillAmount > summary.safeToSpendWeekly) {
      result.push({
        icon: <TrendingDown size={16} />,
        title: 'Reallocate Funds',
        description: `Urgent bills (${fmt(summary.urgentBillAmount)}) exceed your safe-to-spend this week. Move funds from flexible spending categories to cover them.`,
        urgency: 'medium',
      })
    }

    if (engine.riskLevel === 'on_track' && summary.safeToSpendWeekly > 0) {
      result.push({
        icon: <CheckCircle size={16} />,
        title: 'You\'re On Track',
        description: `All obligations are covered with ${fmt(summary.safeToSpendWeekly)} available this week. Consider boosting a savings goal.`,
        urgency: 'low',
      })
    }

    return result
  }, [summary, engine])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg, color: theme.text }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-14 max-w-full overflow-x-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="px-5 py-6 space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div variants={fadeUp} className="rounded-2xl border p-6" style={{ borderColor: theme.border, backgroundColor: theme.bgS }}>
          <h1 className="text-3xl font-bold" style={{ color: theme.gold }}>Weekly Decision Engine</h1>
          <p className="text-sm mt-1" style={{ color: theme.textM }}>
            A clear, explainable picture of this week's finances — with smart suggestions for what to do next.
          </p>
          {/* Risk level badge */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
              backgroundColor: engine.riskLevel === 'on_track' ? '#10B98120' : engine.riskLevel === 'tight' ? '#F59E0B20' : '#EF444420',
              color: engine.riskLevel === 'on_track' ? '#10B981' : engine.riskLevel === 'tight' ? '#F59E0B' : '#EF4444',
            }}>
              {engine.riskLevel === 'on_track' ? '✓ On Track' : engine.riskLevel === 'tight' ? '⚠ Tight' : '✗ Shortfall'}
            </span>
            <span className="text-xs" style={{ color: theme.textS }}>
              Next income in {engine.daysUntilNextIncome} day{engine.daysUntilNextIncome !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>

        {/* Key Metrics with Explanations */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExplainCard
            title="Weekly Income"
            value={fmt(summary.weeklyIncome)}
            explanation="This is your estimated weekly take-home across all active income sources, normalized from your pay frequency."
            color={theme.gold}
            theme={theme}
          />
          <ExplainCard
            title="Reserved for Bills"
            value={fmt(summary.billReserve)}
            explanation="This is the portion of your weekly income allocated to upcoming bills. It's calculated by spreading each bill's total amount across its payment frequency."
            color="#EF4444"
            theme={theme}
          />
          <ExplainCard
            title="Reserved for Savings"
            value={fmt(summary.savingsReserve)}
            explanation="This is the amount set aside for your active savings goals each week, based on their contribution settings (fixed amount or percentage of income)."
            color="#6366F1"
            theme={theme}
          />
          <ExplainCard
            title="Safe to Spend"
            value={fmt(engine.safeToSpendTotal)}
            explanation={`Safe to Spend = Account balance (${fmt(engine.breakdown.balance)}) − safety buffer (${fmt(engine.breakdown.buffer)}) − reserved for bills (${fmt(engine.breakdown.reservedBills)}) − reserved for savings (${fmt(engine.breakdown.reservedSavings)})`}
            color={engine.safeToSpendTotal > 0 ? '#22c55e' : '#ef4444'}
            theme={theme}
          />
        </motion.div>

        {/* Bills Before Next Income */}
        {engine.billsDueBeforeNextIncome > 0 && (
          <motion.div variants={fadeUp} className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <h2 className="text-base font-bold mb-3" style={{ color: theme.text }}>Bills Due Before Next Income</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: theme.textS }}>Total due in next {engine.daysUntilNextIncome} days</span>
              <span className="text-lg font-bold" style={{ color: '#EF4444' }}>{fmt(engine.billsDueBeforeNextIncome)}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: theme.border }}>
              <div className="h-full rounded-full" style={{
                width: `${Math.min(100, (engine.billsDueBeforeNextIncome / Math.max(engine.safeToSpendTotal, 1)) * 100)}%`,
                backgroundColor: '#EF4444',
              }} />
            </div>
            <p className="text-xs mt-2" style={{ color: theme.textS }}>
              {engine.billsDueBeforeNextIncome > engine.safeToSpendTotal
                ? '⚠️ Bills exceed available funds — action required'
                : '✓ Bills are within your available balance'}
            </p>
            {engine.upcomingBills.filter(b => b.daysUntilDue >= 0 && b.daysUntilDue <= engine.daysUntilNextIncome).map(b => (
              <div key={b.id} className="flex items-center justify-between mt-2 text-sm">
                <span style={{ color: theme.text }}>{b.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: theme.textS }}>Due in {b.daysUntilDue}d</span>
                  <span className="font-bold" style={{ color: '#EF4444' }}>{fmt(b.amount)}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-2xl border p-5 space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
            <h2 className="text-base font-bold" style={{ color: theme.text }}>Smart Suggestions</h2>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <SuggestionCard key={i} {...s} theme={theme} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Weekly Health */}
        <motion.div variants={fadeUp} className="rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>This Week at a Glance</h2>
          <p className="text-sm mt-1" style={{ color: theme.textM }}>
            Next payment: {fmtD(summary.nextPaycheckDate)} ({daysTo(summary.nextPaycheckDate)} days)
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: theme.textS }}>Urgent bills before next pay</span>
              <span className="font-bold" style={{ color: '#EF4444' }}>{fmt(summary.urgentBillAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: theme.textS }}>Daily safe-to-spend</span>
              <span className="font-bold" style={{ color: '#10B981' }}>{fmt(engine.safeToSpendDaily)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: theme.textS }}>Weekly safe-to-spend</span>
              <span className="font-bold" style={{ color: '#10B981' }}>{fmt(engine.safeToSpendWeekly)}</span>
            </div>
          </div>
          {summary.shortfall > 0 ? (
            <p className="mt-3 text-sm font-semibold" style={{ color: '#ef4444' }}>
              ⚠️ Shortfall: {fmt(summary.shortfall)} — action needed
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold" style={{ color: '#22c55e' }}>
              ✓ You're on track this week
            </p>
          )}
        </motion.div>

        {/* Allocation Snapshot */}
        <motion.div variants={fadeUp} className="rounded-2xl border p-5 space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.card }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Allocation Breakdown</h3>
          <p className="text-xs" style={{ color: theme.textS }}>These are estimated weekly amounts per spending category.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(summary.breakdown).map(([label, value]) => (
              <div key={label} className="rounded-lg p-3" style={{ backgroundColor: theme.bg }}>
                <p className="text-xs uppercase font-semibold" style={{ color: theme.textM }}>{label}</p>
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
