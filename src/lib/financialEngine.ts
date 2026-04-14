/**
 * ORCA Financial Engine — Canonical Single Source of Truth
 *
 * All pages (Dashboard, Smart Stack, Weekly Split) must call financialEngine()
 * and consume its outputs. No page-level financial calculations.
 *
 * Recompute triggers: bill.created/updated/paid, income.logged,
 *                     goal.updated, settings.updated
 */

import type { Bill, SavingsGoal, IncomeSource } from './types'
import { f2w } from './utils'

// ── Extended types for the engine ──
export interface BillOccurrence {
  id: string
  billId: string
  dueDate: string
  expectedAmount: number
  status: 'due' | 'paid' | 'partial' | 'skipped'
}

export interface Payment {
  id: string
  billOccurrenceId: string
  amount: number
  paidDate: string
  method: string
}

export interface EngineIncomeSource {
  id: string
  type: 'fixed' | 'irregular' | 'manual'
  frequency: string
  nextDate: string
  amount: number
  active?: boolean
}

export interface EngineIncomeEvent {
  id: string
  sourceId: string
  amount: number
  date: string
  allocations: {
    bills: number
    savings: number
    spending: number
  }
}

export interface EngineSettings {
  balance: number
  buffer: number
}

// ── Output types ──
export type RiskLevel = 'on_track' | 'tight' | 'shortfall'
export type ForecastConfidence = 'high' | 'medium' | 'low'
export type FinancialStatus = 'on_track' | 'tight' | 'shortfall' | 'covered' | 'overdue'

export interface NextAction {
  id: string
  type: 'pay_bill' | 'shortfall_warning' | 'savings_move' | 'pause_spending' | 'delay_transfer'
  title: string
  description: string
  amount?: number
  urgency: 'high' | 'medium' | 'low'
}

export interface UpcomingBill {
  id: string
  name: string
  amount: number
  dueDate: string
  daysUntilDue: number
  status: FinancialStatus
  category: string
}

export interface UpcomingIncome {
  id: string
  sourceId: string
  amount: number
  date: string
  label: string
  type: 'fixed' | 'irregular' | 'manual'
}

export interface EngineOutput {
  upcomingIncome: UpcomingIncome[]
  upcomingBills: UpcomingBill[]
  reservedForBills: number
  reservedForSavings: number
  safeToSpendDaily: number
  safeToSpendWeekly: number
  shortfallAmount: number
  riskLevel: RiskLevel
  nextActions: NextAction[]
  coverageRatio: number
  forecastConfidence: ForecastConfidence
  // Extended outputs consumed by pages
  totalMonthlyIncome: number
  totalMonthlyBills: number
  weeklyIncome: number
  billsDueBeforeNextIncome: number
  daysUntilNextIncome: number
  nextIncomeDate: string
  safeToSpendTotal: number
  // Transparency breakdown
  breakdown: {
    balance: number
    buffer: number
    reservedBills: number
    reservedSavings: number
    safeToSpend: number
  }
}

export interface EngineInput {
  incomeSources: IncomeSource[]
  incomeEvents?: EngineIncomeEvent[]
  bills: Bill[]
  billOccurrences?: BillOccurrence[]
  payments?: Payment[]
  savingsGoals: SavingsGoal[]
  contributions?: { goalId: string; amount: number; date: string }[]
  accountSettings: EngineSettings
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function todayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function daysUntil(dateStr: string): number {
  const now = todayDate()
  const d = parseDate(dateStr)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function freqToMonthly(amount: number, freq: string): number {
  const map: Record<string, number> = {
    weekly: 52 / 12,
    biweekly: 26 / 12,
    semimonthly: 2,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
    'one-time': 0,
  }
  return amount * (map[freq] ?? 1)
}

function getNextIncomeDate(sources: IncomeSource[]): string {
  const today = todayDate()
  const active = sources.filter(s => s.active !== false)
  if (!active.length) {
    const d = new Date(today)
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  }
  // Use the earliest next pay based on frequency from today
  // For paycheck sources, approximate next pay
  const nextDates = active.map(s => {
    const freqDays: Record<string, number> = {
      weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30, quarterly: 90, yearly: 365,
    }
    const d = new Date(today)
    d.setDate(d.getDate() + (freqDays[s.freq] ?? 14))
    return d.toISOString().split('T')[0]
  })
  return nextDates.sort()[0]
}

function getForecastConfidence(sources: IncomeSource[]): ForecastConfidence {
  const active = sources.filter(s => s.active !== false)
  if (!active.length) return 'low'
  const hasFixed = active.some(s => s.freq === 'biweekly' || s.freq === 'weekly' || s.freq === 'semimonthly' || s.freq === 'monthly')
  const hasIrregular = active.some(s => !s.freq || s.freq === 'one-time')
  if (hasFixed && !hasIrregular) return 'high'
  if (hasFixed && hasIrregular) return 'medium'
  return 'low'
}

function getBillStatus(daysUntilDue: number, paid: boolean): FinancialStatus {
  if (paid) return 'covered'
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 3) return 'tight'
  return 'on_track'
}

// ════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════

export function financialEngine(input: EngineInput): EngineOutput {
  const {
    incomeSources,
    bills,
    savingsGoals,
    accountSettings,
  } = input

  const today = todayDate()
  const nextIncomeDate = getNextIncomeDate(incomeSources)
  const nextIncomeD = parseDate(nextIncomeDate)
  const daysUntilNextIncome = Math.max(1, Math.ceil((nextIncomeD.getTime() - today.getTime()) / 86400000))

  // ── Weekly income ──
  const weeklyIncome = incomeSources
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + f2w(s.amount, s.freq || 'biweekly'), 0)

  const totalMonthlyIncome = incomeSources
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + freqToMonthly(s.amount, s.freq || 'monthly'), 0)

  // ── Bills ──
  const unpaidBills = bills.filter(b => b.status !== 'paid')

  const totalMonthlyBills = unpaidBills.reduce((sum, b) =>
    sum + freqToMonthly(b.amount, b.freq || 'monthly'), 0)

  // Bills due before next income
  const billsDueBeforeNextIncome = unpaidBills
    .filter(b => {
      const d = parseDate(b.due)
      return d >= today && d <= nextIncomeD
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // Reserved for ALL upcoming bills (next 30 days)
  const reservedForBills = unpaidBills
    .filter(b => {
      const d = parseDate(b.due)
      const days = Math.ceil((d.getTime() - today.getTime()) / 86400000)
      return d >= today && days <= 30
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // ── Savings ──
  const reservedForSavings = savingsGoals
    .filter(g => g.active !== false && g.current < g.target)
    .reduce((sum, g) => {
      if (g.cType === 'fixed') return sum + (g.cVal || 0)
      if (g.cType === 'percent') return sum + (weeklyIncome * (g.cVal || 0) / 100)
      return sum
    }, 0)

  // ── Safe to Spend (balance-based) ──
  const { balance, buffer } = accountSettings
  const safeToSpendTotal = Math.max(0, balance - buffer - reservedForBills - reservedForSavings)
  const safeToSpendDaily = safeToSpendTotal / Math.max(daysUntilNextIncome, 1)
  const safeToSpendWeekly = safeToSpendDaily * 7

  // ── Shortfall ──
  const obligationsTotal = billsDueBeforeNextIncome + reservedForSavings
  const incomeBeforeNext = weeklyIncome * (daysUntilNextIncome / 7)
  const shortfallAmount = Math.max(0, obligationsTotal - (balance - buffer))

  // ── Coverage Ratio ──
  const obligations30 = reservedForBills + reservedForSavings
  const income30 = weeklyIncome * (30 / 7)
  const coverageRatio = obligations30 > 0
    ? Math.round((income30 / obligations30) * 100) / 100
    : Infinity

  // ── Risk Level ──
  let riskLevel: RiskLevel = 'on_track'
  if (shortfallAmount > 0) {
    riskLevel = 'shortfall'
  } else if (coverageRatio < 1.1 || safeToSpendTotal < reservedForBills * 0.2) {
    riskLevel = 'tight'
  }

  // ── Upcoming Bills (next 30 days) ──
  const upcomingBills: UpcomingBill[] = unpaidBills
    .filter(b => {
      const days = daysUntil(b.due)
      return days >= -7 && days <= 30
    })
    .map(b => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      dueDate: b.due,
      daysUntilDue: daysUntil(b.due),
      status: getBillStatus(daysUntil(b.due), b.status === 'paid'),
      category: b.cat,
    }))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  // ── Upcoming Income ──
  const upcomingIncome: UpcomingIncome[] = incomeSources
    .filter(s => s.active !== false)
    .map(s => ({
      id: `upcoming-${s.id}`,
      sourceId: s.id,
      amount: f2w(s.amount, s.freq || 'biweekly') * (daysUntilNextIncome / 7),
      date: nextIncomeDate,
      label: s.name,
      type: (s.freq === 'one-time' ? 'manual' : 'fixed') as 'fixed' | 'irregular' | 'manual',
    }))

  // ── Next Actions ──
  const nextActions: NextAction[] = []

  const overdueOrUrgentBills = upcomingBills.filter(b => b.daysUntilDue <= 3)
  overdueOrUrgentBills.forEach(b => {
    nextActions.push({
      id: `pay-${b.id}`,
      type: 'pay_bill',
      title: `Pay ${b.name}`,
      description: b.daysUntilDue < 0
        ? `${Math.abs(b.daysUntilDue)} days overdue`
        : b.daysUntilDue === 0
        ? 'Due today'
        : `Due in ${b.daysUntilDue} day${b.daysUntilDue === 1 ? '' : 's'}`,
      amount: b.amount,
      urgency: b.daysUntilDue <= 0 ? 'high' : 'medium',
    })
  })

  if (shortfallAmount > 0) {
    nextActions.push({
      id: 'shortfall-warning',
      type: 'shortfall_warning',
      title: 'Shortfall Detected',
      description: `You're short $${shortfallAmount.toFixed(2)} to cover upcoming obligations`,
      amount: shortfallAmount,
      urgency: 'high',
    })
  }

  if (riskLevel === 'tight' && reservedForSavings > 0) {
    nextActions.push({
      id: 'delay-transfer',
      type: 'delay_transfer',
      title: 'Consider Delaying Savings Transfer',
      description: `Pausing $${reservedForSavings.toFixed(2)} in savings contributions could improve cash flow`,
      amount: reservedForSavings,
      urgency: 'medium',
    })
  }

  if (riskLevel === 'on_track' && weeklyIncome > 0) {
    nextActions.push({
      id: 'savings-move',
      type: 'savings_move',
      title: 'Move to Savings',
      description: `You have $${safeToSpendTotal.toFixed(2)} available — consider boosting a savings goal`,
      amount: safeToSpendTotal * 0.1,
      urgency: 'low',
    })
  }

  // ── Forecast Confidence ──
  const forecastConfidence = getForecastConfidence(incomeSources)

  return {
    upcomingIncome,
    upcomingBills,
    reservedForBills,
    reservedForSavings,
    safeToSpendDaily,
    safeToSpendWeekly,
    shortfallAmount,
    riskLevel,
    nextActions,
    coverageRatio,
    forecastConfidence,
    totalMonthlyIncome,
    totalMonthlyBills,
    weeklyIncome,
    billsDueBeforeNextIncome,
    daysUntilNextIncome,
    nextIncomeDate,
    safeToSpendTotal,
    breakdown: {
      balance,
      buffer,
      reservedBills: reservedForBills,
      reservedSavings: reservedForSavings,
      safeToSpend: safeToSpendTotal,
    },
  }
}

// ════════════════════════════════════════
// REACT HOOK — consume engine in any component
// ════════════════════════════════════════

import { useMemo } from 'react'

export function useFinancialEngine(input: EngineInput): EngineOutput {
  return useMemo(() => financialEngine(input), [
    JSON.stringify(input.incomeSources),
    JSON.stringify(input.bills),
    JSON.stringify(input.savingsGoals),
    input.accountSettings.balance,
    input.accountSettings.buffer,
  ])
}
