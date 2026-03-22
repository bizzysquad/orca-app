'use client'

import { f2w } from './utils'
import type { IncomeSource, Bill, SavingsGoal, Expense } from './types'

export type SplitMode = 'equal' | 'due-date-aware' | 'priority-first'

export interface WeeklySplitSummary {
  weeklyIncome: number
  billReserve: number
  savingsReserve: number
  safeToSpendWeekly: number
  safeToSpendDaily: number
  shortfall: number
  nextPaycheckDate: string
  urgentBillAmount: number
  topSuggestion: string
  breakdown: {
    rent: number
    groceries: number
    transportation: number
    utilities: number
    insurance: number
    debt: number
    subscriptions: number
    savings: number
    flexible: number
  }
}

const priorityWeights: Record<string, number> = {
  housing: 0.28,
  groceries: 0.15,
  transportation: 0.1,
  utilities: 0.08,
  insurance: 0.07,
  debt: 0.1,
  savings: 0.12,
  flexible: 0.1,
}

function categoryKey(cat: string) {
  const normalized = cat.trim().toLowerCase()
  if (['rent', 'mortgage', 'housing'].includes(normalized)) return 'rent'
  if (['groceries', 'food'].includes(normalized)) return 'groceries'
  if (['gas', 'transportation', 'taxis', 'uber'].includes(normalized)) return 'transportation'
  if (['utilities', 'electric', 'water', 'internet', 'phone'].includes(normalized)) return 'utilities'
  if (['insurance'].includes(normalized)) return 'insurance'
  if (['debt', 'credit', 'loan'].includes(normalized)) return 'debt'
  if (['subscriptions', 'entertainment', 'tv', 'streaming'].includes(normalized)) return 'subscriptions'
  return 'flexible'
}

export function calcBillWeekly(bills: Bill[]) {
  return bills
    .filter((b) => b.status !== 'paid')
    .reduce((sum, bill) => sum + f2w(bill.amount, bill.freq || 'monthly'), 0)
}

export function calcSavingsWeekly(goals: SavingsGoal[], weeklyIncome: number) {
  return goals
    .filter((g) => g.active !== false)
    .reduce((sum, goal) => {
      if (goal.cType === 'fixed') return sum + (goal.cVal || 0)
      if (goal.cType === 'percent') return sum + ((goal.cVal || 0) / 100) * weeklyIncome
      return sum
    }, 0)
}

export function weightedPriorityAllocation(weeklyIncome: number) {
  const baselineReserved = Object.entries(priorityWeights).reduce((acc, [_k, v]) => acc + v, 0)
  const allocation: Record<string, number> = {
    rent: weeklyIncome * priorityWeights.rent,
    groceries: weeklyIncome * priorityWeights.groceries,
    transportation: weeklyIncome * priorityWeights.transportation,
    utilities: weeklyIncome * priorityWeights.utilities,
    insurance: weeklyIncome * priorityWeights.insurance,
    debt: weeklyIncome * priorityWeights.debt,
    subscriptions: weeklyIncome * priorityWeights.subscriptions,
    savings: weeklyIncome * priorityWeights.savings,
    flexible: weeklyIncome * priorityWeights.flexible,
  }

  // normalize to exact income in case of float drift
  const sum = Object.values(allocation).reduce((acc, v) => acc + v, 0)
  const factor = weeklyIncome > 0 ? weeklyIncome / sum : 0
  Object.keys(allocation).forEach((k) => { allocation[k] *= factor })

  return allocation
}

export function dueDateAwareSplit(bills: Bill[], weeklyIncome: number, nextPaycheckDate: string) {
  const now = new Date()
  const nextPayDate = new Date(nextPaycheckDate)
  const urgent = bills
    .filter((b) => b.status !== 'paid')
    .filter((b) => {
      const dueDate = new Date(b.due)
      const diff = Math.ceil((dueDate.getTime() - now.getTime()) / 864e5)
      return diff <= 14 && diff >= 0
    })
  const urgentWeekly = urgent.reduce((sum, b) => sum + f2w(b.amount, b.freq || 'monthly'), 0)

  const weeklyNeeded = calcBillWeekly(bills)

  return {
    urgentWeekly,
    weeklyNeeded,
    recommendedReserve: Math.max(urgentWeekly, weeklyNeeded * 0.5),
  }
}

export function buildWeeklySplit(
  income: IncomeSource[],
  bills: Bill[],
  goals: SavingsGoal[],
  expenses: Expense[],
  splitMode: SplitMode,
  useri: { nextPay: string }
): WeeklySplitSummary {
  const weeklyIncome = income.reduce((sum, s) => sum + f2w(s.amount, s.freq || 'biweekly'), 0)
  const billReserve = calcBillWeekly(bills)
  const savingsReserve = calcSavingsWeekly(goals, weeklyIncome)
  const safeToSpendWeekly = Math.max(0, weeklyIncome - billReserve - savingsReserve)
  const safeToSpendDaily = Math.max(0, safeToSpendWeekly / 7)
  const shortfall = Math.max(0, billReserve + savingsReserve - weeklyIncome)

  const urgentData = dueDateAwareSplit(bills, weeklyIncome, useri.nextPay)

  const spendByCategory = expenses.reduce(
    (agg, exp) => {
      const key = categoryKey(exp.cat)
      agg[key] = (agg[key] || 0) + exp.amount
      return agg
    },
    {} as Record<string, number>
  )

  const highSpending = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0]
  const topSuggestion = highSpending
    ? `Your ${highSpending[0]} spending is \$${highSpending[1].toFixed(2)} this week. Consider trimming by 15%.`
    : 'Great job keeping your spending controlled. Keep tracking weekly habits.'

  let breakdown = weightedPriorityAllocation(weeklyIncome)
  if (splitMode === 'due-date-aware') {
    breakdown = { ...breakdown, bills: billReserve }
  } else if (splitMode === 'priority-first') {
    breakdown = weightedPriorityAllocation(weeklyIncome)
  }

  return {
    weeklyIncome,
    billReserve,
    savingsReserve,
    safeToSpendWeekly,
    safeToSpendDaily,
    shortfall,
    nextPaycheckDate: useri.nextPay,
    urgentBillAmount: urgentData.urgentWeekly,
    topSuggestion,
    breakdown: {
      rent: breakdown.rent || 0,
      groceries: breakdown.groceries || 0,
      transportation: breakdown.transportation || 0,
      utilities: breakdown.utilities || 0,
      insurance: breakdown.insurance || 0,
      debt: breakdown.debt || 0,
      subscriptions: breakdown.subscriptions || 0,
      savings: breakdown.savings || 0,
      flexible: breakdown.flexible || 0,
    },
  }
}
