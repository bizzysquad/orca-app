// Lyft earnings can be logged per week or as one total for a whole month.
// A monthly total covers its month: weekly entries in that month stay saved
// but are left out of every total, so nothing is counted twice.

export interface LyftEntry {
  id: string
  date: string // week ending (weekly) or YYYY-MM-01 (monthly)
  earnings: number
  trips?: number
  miles?: number
  gasExpense?: number
  hours?: number
  period?: 'week' | 'month' // missing means week (older entries)
}

export const isMonthly = (s: Pick<LyftEntry, 'period'>) => s.period === 'month'
export const monthOf = (s: Pick<LyftEntry, 'date'>) => (s.date || '').slice(0, 7)

/** Months (YYYY-MM) that have a monthly total. */
export function monthsWithTotal<T extends LyftEntry>(sessions: T[]): Set<string> {
  return new Set(sessions.filter(isMonthly).map(monthOf))
}

/** True when a weekly entry is replaced by its month's monthly total. */
export function isCovered<T extends LyftEntry>(s: T, covered: Set<string>): boolean {
  return !isMonthly(s) && covered.has(monthOf(s))
}

/** The entries that count toward totals. Use this before any sum. */
export function countedLyft<T extends LyftEntry>(sessions: T[]): T[] {
  const covered = monthsWithTotal(sessions)
  return sessions.filter(s => !isCovered(s, covered))
}

/** Weekly entries only, for "this week" style numbers. */
export function weeklyLyft<T extends LyftEntry>(sessions: T[]): T[] {
  return sessions.filter(s => !isMonthly(s))
}
