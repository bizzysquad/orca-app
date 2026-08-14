export interface LaundrySettings {
  day: number // 0=Sunday..6=Saturday
}

export function getDefaultLaundrySettings(): LaundrySettings {
  return { day: 0 }
}

export interface LiquorSettings {
  enabled: boolean
  day: number
}

export function getDefaultLiquorSettings(): LiquorSettings {
  return { enabled: false, day: 5 }
}

export const DAILY_BUDGET = 20

export interface SpendingEntry {
  id: string
  date: string
  amount: number
  description: string
}

export function getDailySpending(entries: SpendingEntry[], date: string): number {
  return entries.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0)
}

/** Sum of spending in the calendar week (Sunday–Saturday) containing `date`. */
export function getWeeklySpending(entries: SpendingEntry[], date: string): number {
  const d = new Date(date + 'T00:00:00')
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - d.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return entries
    .filter(e => {
      const ed = new Date(e.date + 'T00:00:00')
      return ed >= weekStart && ed <= weekEnd
    })
    .reduce((sum, e) => sum + e.amount, 0)
}
