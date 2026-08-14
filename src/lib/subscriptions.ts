import type { Subscription, WellsSettings } from './types'

export const SUBSCRIPTION_CATEGORIES = [
  'Streaming',
  'Software',
  'Fitness',
  'Cloud/Storage',
  'Gaming',
  'News',
  'Other',
]

/**
 * Normalize price to a monthly-equivalent cost so subscriptions on
 * different billing cadences can be summed/compared.
 */
export function getMonthlyEquivalent(sub: Subscription): number {
  switch (sub.frequency) {
    case 'weekly':
      return (sub.price * 52) / 12
    case 'yearly':
      return sub.price / 12
    case 'custom':
      return sub.price * (30 / (sub.customFrequencyDays || 30))
    case 'monthly':
    default:
      return sub.price
  }
}

/**
 * Generate recurring charge dates for calendar display, anchored on billingDate.
 */
export function getRecurringSubscriptionDates(sub: Subscription, monthsAhead: number = 3): string[] {
  const dates: string[] = []
  const start = new Date(sub.billingDate + 'T00:00:00')
  const limit = new Date()
  limit.setMonth(limit.getMonth() + monthsAhead)

  const d = new Date(start)
  let guard = 0
  while (d <= limit && guard < 500) {
    dates.push(d.toISOString().split('T')[0])
    guard++
    switch (sub.frequency) {
      case 'weekly':
        d.setDate(d.getDate() + 7)
        break
      case 'yearly':
        d.setFullYear(d.getFullYear() + 1)
        break
      case 'custom':
        d.setDate(d.getDate() + (sub.customFrequencyDays || 30))
        break
      case 'monthly':
      default:
        d.setMonth(d.getMonth() + 1)
    }
  }

  return dates
}

export interface UpcomingCharge {
  sub: Subscription
  date: string
  amount: number
}

/**
 * All active-subscription charges landing within [fromDate, toDate], sorted by date.
 */
export function getUpcomingCharges(subs: Subscription[], fromDate: Date, toDate: Date): UpcomingCharge[] {
  const from = new Date(fromDate); from.setHours(0, 0, 0, 0)
  const to = new Date(toDate); to.setHours(0, 0, 0, 0)
  const monthsAhead = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (30 * 86400000)) + 1)

  const charges: UpcomingCharge[] = []
  subs.filter(s => s.status === 'active').forEach(sub => {
    getRecurringSubscriptionDates(sub, monthsAhead).forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00')
      if (d >= from && d <= to) {
        charges.push({ sub, date: dateStr, amount: sub.price })
      }
    })
  })

  return charges.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function wellsSubs(subs: Subscription[], wells: WellsSettings): Subscription[] {
  return subs.filter(s => s.status === 'active' && s.paymentAccount.trim().toLowerCase() === wells.accountName.trim().toLowerCase())
}

/** Sum of Wells-account charges due strictly before the next planned deposit date. */
export function getRequiredWellsBalance(subs: Subscription[], wells: WellsSettings, today: Date = new Date()): number {
  const from = new Date(today); from.setHours(0, 0, 0, 0)
  const to = new Date(wells.nextDepositDate + 'T00:00:00')
  to.setDate(to.getDate() - 1)
  if (to < from) return 0
  return getUpcomingCharges(wellsSubs(subs, wells), from, to).reduce((sum, c) => sum + c.amount, 0)
}

/** Sum of Wells-account charges due within the next 7 days. */
export function getAmountNeededThisWeek(subs: Subscription[], wells: WellsSettings, today: Date = new Date()): number {
  const from = new Date(today); from.setHours(0, 0, 0, 0)
  const to = new Date(from); to.setDate(to.getDate() + 7)
  return getUpcomingCharges(wellsSubs(subs, wells), from, to).reduce((sum, c) => sum + c.amount, 0)
}

/** Amount due before (and including) the single soonest Wells-account charge. */
export function getAmountNeededBeforeNextCharge(subs: Subscription[], wells: WellsSettings, today: Date = new Date()): number {
  const from = new Date(today); from.setHours(0, 0, 0, 0)
  const farOut = new Date(from); farOut.setFullYear(farOut.getFullYear() + 1)
  const charges = getUpcomingCharges(wellsSubs(subs, wells), from, farOut)
  if (charges.length === 0) return 0
  const nextDate = charges[0].date
  return charges.filter(c => c.date === nextDate).reduce((sum, c) => sum + c.amount, 0)
}

/** Recommended cushion balance: monthly Wells total padded by the buffer multiplier, rounded up to nearest $5. */
export function getRecommendedBuffer(subs: Subscription[], wells: WellsSettings): number {
  const monthlyTotal = wellsSubs(subs, wells).reduce((sum, s) => sum + getMonthlyEquivalent(s), 0)
  const buffered = monthlyTotal * (wells.bufferMultiplier || 1.15)
  return Math.ceil(buffered / 5) * 5
}

export function getDefaultWellsSettings(): WellsSettings {
  const nextDeposit = new Date()
  nextDeposit.setDate(nextDeposit.getDate() + 7)
  return {
    accountName: 'Wells',
    nextDepositDate: nextDeposit.toISOString().split('T')[0],
    depositFreq: 'biweekly',
    bufferMultiplier: 1.15,
  }
}
