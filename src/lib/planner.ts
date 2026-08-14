import type { PlannerBlock, Bill, Subscription } from './types'
import { getRecurringSubscriptionDates } from './subscriptions'
import { getRecurringBillDates } from './income-engine'
import type { LaundrySettings, LiquorSettings } from './lifeTasks'

function block(id: string, startTime: string, endTime: string, label: string, type: PlannerBlock['type'], notes?: string): PlannerBlock {
  return { id, startTime, endTime, label, type, notes }
}

const WEEKDAY_TEMPLATE: PlannerBlock[] = [
  block('breakfast', '09:00', '09:30', 'Breakfast', 'meal'),
  block('trades', '09:30', '10:30', 'Look for trades', 'trade'),
  block('workout', '10:30', '11:30', 'Workout', 'workout'),
  block('drive', '11:30', '15:00', 'Drive', 'drive'),
  block('lunch', '12:30', '13:00', 'Lunch', 'meal', 'During/around the Drive block'),
  block('work-priority', '15:00', '17:00', 'Work / Priority Block', 'work'),
  block('work-admin', '17:00', '19:00', 'Work / Admin / Flexible Block', 'work'),
  block('dinner', '18:45', '19:00', 'Dinner', 'meal'),
  block('work-evening', '19:00', '21:00', 'Evening Work Block', 'work'),
  block('work-final', '22:00', '24:00', 'Final Work / Creative / Wind-Down', 'work'),
]

/** 0 = Sunday ... 6 = Saturday. Weekdays get the default schedule; weekend is blank and fully editable. */
export function getDefaultWeekdayTemplates(): Record<number, PlannerBlock[]> {
  return {
    0: [],
    1: WEEKDAY_TEMPLATE,
    2: WEEKDAY_TEMPLATE,
    3: WEEKDAY_TEMPLATE,
    4: WEEKDAY_TEMPLATE,
    5: WEEKDAY_TEMPLATE,
    6: [],
  }
}

function sortByStart(blocks: PlannerBlock[]): PlannerBlock[] {
  return [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Per-date override if one exists, otherwise the weekday's default template. */
export function getBlocksForDate(
  date: string,
  templates: Record<number, PlannerBlock[]>,
  overrides: Record<string, PlannerBlock[]>
): PlannerBlock[] {
  if (overrides[date]) return sortByStart(overrides[date])
  const weekday = new Date(date + 'T00:00:00').getDay()
  return sortByStart(templates[weekday] || [])
}

export interface FinancialReminder {
  label: string
  amount: number
  kind: 'bill' | 'subscription'
}

/** Bills and active subscriptions due on a given date, for the planner's reminders strip. */
export function getFinancialRemindersForDate(date: string, bills: Bill[], subscriptions: Subscription[]): FinancialReminder[] {
  const reminders: FinancialReminder[] = []

  const target = new Date(date + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthDiff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  const monthsAhead = Math.max(3, monthDiff + 3)

  bills.forEach(b => {
    if (getRecurringBillDates(b, monthsAhead).includes(date)) {
      reminders.push({ label: b.name, amount: b.amount, kind: 'bill' })
    }
  })

  subscriptions.filter(s => s.status === 'active').forEach(s => {
    if (getRecurringSubscriptionDates(s, monthsAhead).includes(date)) {
      reminders.push({ label: s.name, amount: s.price, kind: 'subscription' })
    }
  })

  return reminders
}

export interface LifeTaskReminder {
  label: string
  kind: 'laundry' | 'liquor' | 'grocery'
}

/** Recurring life-task reminders (laundry, liquor re-up, grocery re-up) due on a given date. */
export function getLifeTaskRemindersForDate(
  date: string,
  laundry: LaundrySettings,
  liquor: LiquorSettings,
  groceryReUpDay: number
): LifeTaskReminder[] {
  const weekday = new Date(date + 'T00:00:00').getDay()
  const reminders: LifeTaskReminder[] = []

  if (weekday === laundry.day) reminders.push({ label: 'Laundry Day', kind: 'laundry' })
  if (liquor.enabled && weekday === liquor.day) reminders.push({ label: 'Liquor Re-Up', kind: 'liquor' })
  if (weekday === groceryReUpDay) reminders.push({ label: 'Grocery Re-Up Day', kind: 'grocery' })

  return reminders
}
