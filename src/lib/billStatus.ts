// Bill status math shared by Bill Boss and the home page, so both always
// agree on what is paid and what is still owed in a month.

import type { Bill } from './types'

/** YYYY-MM-DD in the device's local time (not UTC). */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns the effective display status of a bill for a given calendar month/year.
 * For recurring bills that are stored as 'paid', the paid status only applies
 * to the specific cycle in which payment was made. All other cycles show as 'upcoming'.
 * This prevents recurring bills from disappearing permanently after being paid once.
 */
export function getBillEffectiveStatus(bill: Bill, calMonth: number, calYear: number): 'upcoming' | 'paid' {
  const recurrence = bill.recurrence || 'one-time'
  const cycleAllocs = (recurrence !== 'one-time' && bill.alloc.length > 0)
    ? bill.alloc.filter(a => {
        const ad = new Date(a.date + 'T00:00:00')
        return ad.getMonth() === calMonth && ad.getFullYear() === calYear
      })
    : bill.alloc

  const totalAllocPaid = cycleAllocs.filter(a => a.paid).reduce((sum, a) => sum + a.amount, 0)
  if (cycleAllocs.length > 0 && totalAllocPaid >= bill.amount) return 'paid'

  if (bill.status !== 'paid') return bill.status as 'upcoming' | 'paid'
  // One-time bills: paid is permanent
  if (!bill.recurrence || bill.recurrence === 'one-time') return 'paid'
  // No paidDate means legacy data — treat as paid
  if (!bill.paidDate) return 'paid'

  const pd = new Date(bill.paidDate + 'T00:00:00')

  if (bill.recurrence === 'monthly') {
    if (pd.getMonth() === calMonth && pd.getFullYear() === calYear) return 'paid'
    return 'upcoming'
  }
  if (bill.recurrence === 'yearly') {
    if (pd.getFullYear() === calYear) return 'paid'
    return 'upcoming'
  }
  if (bill.recurrence === 'weekly' || bill.recurrence === 'custom') {
    // Use the first day of the viewed month as the reference point so that
    // viewing past/future months gives a stable, cycle-correct result.
    const intervalDays = bill.recurrence === 'weekly' ? 7 : (bill.customRecurrenceDays || 30)
    const viewRef = new Date(calYear, calMonth, 1)
    viewRef.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((viewRef.getTime() - pd.getTime()) / 86400000)
    // Paid if the viewRef falls within one interval after the paidDate
    if (diffDays >= 0 && diffDays < intervalDays) return 'paid'
    return 'upcoming'
  }
  return 'paid'
}

// Returns true if a recurring bill occurrence falls within its active start/end window.
// `occurrenceDate` is the candidate date for this cycle; `occurrenceIndex` is the
// zero-based count of this occurrence since the bill's start date (used for the
// "after N times" end condition).
export function isBillOccurrenceActive(bill: Bill, occurrenceDate: Date, occurrenceIndex: number): boolean {
  const start = new Date(bill.due + 'T00:00:00')
  if (occurrenceDate < start) return false
  if (bill.recurrenceEndType === 'after-date' && bill.recurrenceEndDate) {
    if (occurrenceDate > new Date(bill.recurrenceEndDate + 'T00:00:00')) return false
  }
  if (bill.recurrenceEndType === 'after-count' && bill.recurrenceEndAfter) {
    if (occurrenceIndex >= bill.recurrenceEndAfter) return false
  }
  return true
}

export function monthlyOccurrenceIndex(start: Date, y: number, m: number): number {
  return (y - start.getFullYear()) * 12 + (m - start.getMonth())
}

export function yearlyOccurrenceIndex(start: Date, y: number): number {
  return y - start.getFullYear()
}

// Returns true if a bill has any relevant occurrence in the given calendar month/year —
// i.e. it is on/after its start date and not yet past its end date (or occurrence count).
export function isBillVisibleInCycle(b: Bill, cMonth: number, cYear: number): boolean {
  const recurrence = b.recurrence || 'one-time'
  const monthStart = new Date(cYear, cMonth, 1)
  const monthEnd = new Date(cYear, cMonth + 1, 0)

  if (b.alloc.length > 0) {
    const hasCurrentCycleAlloc = b.alloc.some(a => {
      const ad = new Date(a.date + 'T00:00:00')
      return ad.getMonth() === cMonth && ad.getFullYear() === cYear
    })
    // One-time bills: their alloc entries are the sole source of truth
    if (recurrence === 'one-time') return hasCurrentCycleAlloc
    // Recurring bills: current-cycle allocs keep the bill visible this month,
    // but stale (past-cycle) allocs must NOT hide the bill in future months —
    // fall through to recurrence-based logic below in either case.
    if (hasCurrentCycleAlloc) return true
  }

  const dueDate = new Date(b.due + 'T00:00:00')

  if (recurrence === 'monthly') {
    const day = Math.min(dueDate.getDate(), monthEnd.getDate())
    const candidate = new Date(cYear, cMonth, day)
    return isBillOccurrenceActive(b, candidate, monthlyOccurrenceIndex(dueDate, cYear, cMonth))
  }
  if (recurrence === 'yearly') {
    if (dueDate.getMonth() !== cMonth) return false
    const candidate = new Date(cYear, cMonth, dueDate.getDate())
    return isBillOccurrenceActive(b, candidate, yearlyOccurrenceIndex(dueDate, cYear))
  }
  if (recurrence === 'one-time' || !recurrence) {
    return dueDate.getMonth() === cMonth && dueDate.getFullYear() === cYear
  }
  // Weekly / custom — check if any occurrence lands in the month
  const intervalDays = recurrence === 'weekly' ? 7 : (b.customRecurrenceDays || 30)
  const cursor = new Date(dueDate)
  let occurrenceIndex = 0
  if (cursor < monthStart) {
    const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
    cursor.setDate(cursor.getDate() + gap)
    occurrenceIndex = Math.round(gap / intervalDays)
  }
  while (cursor <= monthEnd) {
    if (cursor >= monthStart && cursor >= dueDate && isBillOccurrenceActive(b, cursor, occurrenceIndex)) return true
    cursor.setDate(cursor.getDate() + intervalDays)
    occurrenceIndex++
  }
  return false
}

/** Paid allocations that belong to a bill's cycle in the given month. */
function cycleAllocs(bill: Bill, cMonth: number, cYear: number) {
  const rec = bill.recurrence || 'one-time'
  return rec !== 'one-time' && bill.alloc.length > 0
    ? bill.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === cMonth && ad.getFullYear() === cYear })
    : bill.alloc
}

/** How much is still owed on a bill for the cycle in the given month. */
export function cycleRemaining(bill: Bill, cMonth: number, cYear: number): number {
  const paid = cycleAllocs(bill, cMonth, cYear).filter(a => a.paid).reduce((s, a) => s + a.amount, 0)
  return Math.max(0, bill.amount - paid)
}

/** Bills shown in a month that are not paid yet. */
export function unpaidBillsInMonth(bills: Bill[], cMonth: number, cYear: number): Bill[] {
  return bills.filter(b => isBillVisibleInCycle(b, cMonth, cYear) && getBillEffectiveStatus(b, cMonth, cYear) === 'upcoming')
}

/** Total still owed in a month: the Bill Boss "Still owed" number. */
export function billsOwedInMonth(bills: Bill[], cMonth: number, cYear: number): number {
  return unpaidBillsInMonth(bills, cMonth, cYear).reduce((sum, b) => sum + cycleRemaining(b, cMonth, cYear), 0)
}

/** The due date of a bill's cycle in the given month (local time). */
export function cycleDueDate(bill: Bill, cMonth: number, cYear: number): string {
  const dueDate = new Date(bill.due + 'T00:00:00')
  const recurrence = bill.recurrence || 'one-time'
  if (recurrence === 'monthly') {
    const day = Math.min(dueDate.getDate(), new Date(cYear, cMonth + 1, 0).getDate())
    return localDate(new Date(cYear, cMonth, day))
  }
  if (recurrence === 'yearly') {
    const day = Math.min(dueDate.getDate(), new Date(cYear, dueDate.getMonth() + 1, 0).getDate())
    return localDate(new Date(cYear, dueDate.getMonth(), day))
  }
  return bill.due
}

/**
 * Marks a bill fully paid for the cycle that `cycleDate` falls in, the same way
 * paying in full from the Pay sheet does.
 */
export function markBillPaid(bill: Bill, cycleDate: string): Bill {
  const rec = bill.recurrence || 'one-time'
  const cd = new Date(cycleDate + 'T00:00:00')
  const alloc = rec !== 'one-time'
    ? bill.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return !(ad.getMonth() === cd.getMonth() && ad.getFullYear() === cd.getFullYear()) })
    : []
  return { ...bill, status: 'paid', paidDate: cycleDate, alloc }
}
