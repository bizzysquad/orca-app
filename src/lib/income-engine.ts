/**
 * Unified Income Engine for ORCA
 * Supports both Paycheck and Flexible Income modes without duplicating logic.
 * All income flows through a single IncomeEvent system.
 */

import type { Bill } from './types'

// ── Income Mode ──
export type IncomeMode = 'paycheck' | 'flexible'

// ── Pay Frequency ──
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

// ── Paycheck Config (for paycheck mode) ──
export interface PaycheckConfig {
  amount: number           // net take-home per check
  frequency: PayFrequency
  nextPayDate: string      // ISO date
  hoursPerDay: number
  daysPerWeek: number
  hourlyRate?: number      // optional, for adjustment calc
}

// ── Adjustment (for paycheck adjustment calculator) ──
export interface PaycheckAdjustment {
  daysOff: number
  hoursLost: number
  extraDays: number
  extraHours: number
}

// ── Incoming Payment (for flexible mode) ──
export interface IncomingPayment {
  id: string
  amount: number
  date: string             // ISO date
  description: string
  type: 'one-time' | 'recurring'
  recurrence?: PayFrequency
  status: 'expected' | 'received' | 'overdue'
  paidDate?: string        // actual date received
}

// ── Unified Income Event ──
// Both paycheck projections and incoming payments become IncomeEvents
export interface IncomeEvent {
  id: string
  source: 'paycheck' | 'incoming-payment' | 'manual-cash'
  amount: number
  date: string
  label: string
  status: 'projected' | 'confirmed' | 'received'
}

// ── Safe to Spend Result ──
export interface SafeToSpendResult {
  amount: number
  daily: number
  weekly: number
  billsDueBefore: number
  savingsAllocBefore: number
  buffer: number
  nextCycleDate: string
  incomeAvailable: number
}

// ── Income to Bills Ratio ──
export interface IncomeBillsRatio {
  monthly: number          // monthly income / monthly bills
  nextCycle: number        // income before next cycle / bills before next cycle
  healthy: boolean         // ratio > 1
}

// ── Allocation Result ──
export interface AllocationResult {
  totalIncome: number
  billsAllocation: number
  savingsAllocation: number
  safeToSpend: number
  dailySafeToSpend: number
  weeklySafeToSpend: number
  requiredPerDay: number   // how much user needs to earn/reserve per day
  requiredPerWeek: number
  shortfall: number
  ratio: IncomeBillsRatio
}

// ════════════════════════════════════════════════
// PURE FUNCTIONS — no side effects, no state
// ════════════════════════════════════════════════

/**
 * Calculate the next N paycheck dates from a starting date and frequency
 */
export function getPaycheckDates(config: PaycheckConfig, count: number = 6): string[] {
  const dates: string[] = []
  const start = new Date(config.nextPayDate + 'T00:00:00')

  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    switch (config.frequency) {
      case 'weekly':
        d.setDate(d.getDate() + i * 7)
        break
      case 'biweekly':
        d.setDate(d.getDate() + i * 14)
        break
      case 'semimonthly':
        // 1st and 15th pattern
        const monthOffset = Math.floor(i / 2)
        d.setMonth(d.getMonth() + monthOffset)
        if (i % 2 === 1) d.setDate(d.getDate() < 15 ? 15 : 1)
        break
      case 'monthly':
        d.setMonth(d.getMonth() + i)
        break
    }
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

/**
 * Calculate adjusted paycheck amount based on days off, extra hours, etc.
 */
export function adjustPaycheck(config: PaycheckConfig, adj: PaycheckAdjustment): {
  expected: number
  adjusted: number
  difference: number
} {
  const expected = config.amount
  const hoursPerPeriod = config.hoursPerDay * config.daysPerWeek * (config.frequency === 'biweekly' ? 2 : config.frequency === 'monthly' ? 4.33 : config.frequency === 'semimonthly' ? 2.17 : 1)
  const hourlyRate = config.hourlyRate || (expected / hoursPerPeriod)

  const lostIncome = (adj.daysOff * config.hoursPerDay + adj.hoursLost) * hourlyRate
  const extraIncome = (adj.extraDays * config.hoursPerDay + adj.extraHours) * hourlyRate

  const adjusted = expected - lostIncome + extraIncome
  return { expected, adjusted: Math.max(0, adjusted), difference: adjusted - expected }
}

/**
 * Convert incoming payments to income events
 */
export function paymentsToEvents(payments: IncomingPayment[]): IncomeEvent[] {
  return payments.map(p => ({
    id: p.id,
    source: 'incoming-payment' as const,
    amount: p.amount,
    date: p.paidDate || p.date,
    label: p.description,
    status: p.status === 'received' ? 'received' as const : 'projected' as const,
  }))
}

/**
 * Convert paycheck config to income events (projected paychecks)
 */
export function paycheckToEvents(config: PaycheckConfig, count: number = 6): IncomeEvent[] {
  return getPaycheckDates(config, count).map((date, i) => ({
    id: `paycheck-${i}`,
    source: 'paycheck' as const,
    amount: config.amount,
    date,
    label: 'Paycheck',
    status: 'projected' as const,
  }))
}

/**
 * Get the next cycle date based on income mode
 */
export function getNextCycleDate(mode: IncomeMode, config?: PaycheckConfig, payments?: IncomingPayment[]): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (mode === 'paycheck' && config) {
    const dates = getPaycheckDates(config, 6)
    const next = dates.find(d => new Date(d + 'T00:00:00') > today)
    return next || dates[dates.length - 1] || today.toISOString().split('T')[0]
  }

  if (mode === 'flexible' && payments) {
    const upcoming = payments
      .filter(p => p.status !== 'received' && new Date(p.date + 'T00:00:00') > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return upcoming[0]?.date || new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]
  }

  return new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]
}

/**
 * Calculate date-aware Safe to Spend
 * STS = income available before next cycle - bills due before next cycle - savings allocations - buffer
 */
export function calcSafeToSpend(
  incomeEvents: IncomeEvent[],
  bills: Bill[],
  savingsPerCycle: number,
  buffer: number,
  nextCycleDate: string,
): SafeToSpendResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cycleDate = new Date(nextCycleDate + 'T00:00:00')
  const daysUntilCycle = Math.max(1, Math.ceil((cycleDate.getTime() - today.getTime()) / 86400000))

  // Income available before next cycle
  const incomeAvailable = incomeEvents
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00')
      return d >= today && d < cycleDate
    })
    .reduce((sum, e) => sum + e.amount, 0)

  // Bills due before next cycle
  const billsDueBefore = bills
    .filter(b => b.status !== 'paid')
    .filter(b => {
      const d = new Date(b.due + 'T00:00:00')
      return d >= today && d < cycleDate
    })
    .reduce((sum, b) => sum + b.amount, 0)

  const amount = Math.max(0, incomeAvailable - billsDueBefore - savingsPerCycle - buffer)

  return {
    amount,
    daily: amount / daysUntilCycle,
    weekly: (amount / daysUntilCycle) * 7,
    billsDueBefore,
    savingsAllocBefore: savingsPerCycle,
    buffer,
    nextCycleDate,
    incomeAvailable,
  }
}

/**
 * Calculate Income to Bills Ratio
 */
export function calcIncomeBillsRatio(
  monthlyIncome: number,
  monthlyBills: number,
  nextCycleIncome: number,
  nextCycleBills: number,
): IncomeBillsRatio {
  const monthly = monthlyBills > 0 ? monthlyIncome / monthlyBills : Infinity
  const nextCycle = nextCycleBills > 0 ? nextCycleIncome / nextCycleBills : Infinity
  return {
    monthly: Math.round(monthly * 100) / 100,
    nextCycle: Math.round(nextCycle * 100) / 100,
    healthy: monthly >= 1 && nextCycle >= 1,
  }
}

/**
 * Full allocation engine — works for both modes
 */
export function allocate(
  mode: IncomeMode,
  incomeEvents: IncomeEvent[],
  bills: Bill[],
  savingsGoals: { target: number; current: number; date: string }[],
  buffer: number = 0,
  config?: PaycheckConfig,
  payments?: IncomingPayment[],
): AllocationResult {
  const nextCycleDate = getNextCycleDate(mode, config, payments)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cycleDate = new Date(nextCycleDate + 'T00:00:00')
  const daysUntilCycle = Math.max(1, Math.ceil((cycleDate.getTime() - today.getTime()) / 86400000))

  // Total income events before next cycle
  const totalIncome = incomeEvents
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00')
      return d >= today && d < cycleDate
    })
    .reduce((sum, e) => sum + e.amount, 0)

  // Bills due before next cycle
  const billsAllocation = bills
    .filter(b => b.status !== 'paid')
    .filter(b => {
      const d = new Date(b.due + 'T00:00:00')
      return d >= today && d < cycleDate
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // Savings allocation (proportional for the cycle)
  const savingsAllocation = savingsGoals.reduce((sum, g) => {
    if (g.current >= g.target) return sum
    const remaining = g.target - g.current
    const goalDate = new Date(g.date + 'T00:00:00')
    const daysToGoal = Math.max(1, Math.ceil((goalDate.getTime() - today.getTime()) / 86400000))
    return sum + (remaining / daysToGoal) * daysUntilCycle
  }, 0)

  const safeToSpend = Math.max(0, totalIncome - billsAllocation - savingsAllocation - buffer)
  const shortfall = Math.max(0, (billsAllocation + savingsAllocation + buffer) - totalIncome)

  // Monthly estimates
  const monthlyIncome = mode === 'paycheck' && config
    ? config.amount * (config.frequency === 'weekly' ? 4.33 : config.frequency === 'biweekly' ? 2.17 : config.frequency === 'semimonthly' ? 2 : 1)
    : (payments || []).reduce((sum, p) => sum + p.amount, 0)

  const monthlyBills = bills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + b.amount, 0)

  const ratio = calcIncomeBillsRatio(monthlyIncome, monthlyBills, totalIncome, billsAllocation)

  return {
    totalIncome,
    billsAllocation,
    savingsAllocation,
    safeToSpend,
    dailySafeToSpend: safeToSpend / daysUntilCycle,
    weeklySafeToSpend: (safeToSpend / daysUntilCycle) * 7,
    requiredPerDay: (billsAllocation + savingsAllocation) / daysUntilCycle,
    requiredPerWeek: ((billsAllocation + savingsAllocation) / daysUntilCycle) * 7,
    shortfall,
    ratio,
  }
}

/**
 * Get income history (only paid dates) for Smart Stack display
 */
export function getIncomeHistory(payments: IncomingPayment[]): { date: string; amount: number }[] {
  return payments
    .filter(p => p.status === 'received' && p.paidDate)
    .map(p => ({ date: p.paidDate!, amount: p.amount }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Generate recurring bill dates for calendar display
 */
export function getRecurringBillDates(bill: Bill, monthsAhead: number = 3): string[] {
  const dates: string[] = []
  const start = new Date(bill.due + 'T00:00:00')
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + monthsAhead)

  // Check recurrence end conditions
  const maxOccurrences = bill.recurrenceEndAfter || 999
  const endAfterDate = bill.recurrenceEndDate ? new Date(bill.recurrenceEndDate + 'T00:00:00') : endDate
  const limit = new Date(Math.min(endDate.getTime(), endAfterDate.getTime()))

  let count = 0
  const d = new Date(start)

  while (d <= limit && count < maxOccurrences) {
    dates.push(d.toISOString().split('T')[0])
    count++

    switch (bill.recurrence) {
      case 'weekly':
        d.setDate(d.getDate() + 7)
        break
      case 'monthly':
        d.setMonth(d.getMonth() + 1)
        break
      case 'yearly':
        d.setFullYear(d.getFullYear() + 1)
        break
      case 'custom':
        d.setDate(d.getDate() + (bill.customRecurrenceDays || 30))
        break
      default:
        d.setMonth(d.getMonth() + 1)
    }
  }

  return dates
}
