import { useState } from 'react';
import {
  Plus, Edit2, Trash2, ChevronLeft, ChevronRight,
  Home, Phone, Car, CreditCard, AlertCircle, CheckCircle2, Clock, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Data model ────────────────────────────────────────────────────────────────
// Each bill now tracks:
//   dueDay      – calendar day of the month it recurs on
//   recurring   – true = monthly recurring
//   nextDue     – the NEXT unpaid occurrence (e.g. 'May 1' when Apr is already paid)
//   paidMonths  – set of 'YYYY-M' strings for months already paid
const BILL_DATA = [
  { id: 1, name: 'Rent',            category: 'Housing',        amount: 500, dueDay: 1,  recurring: true,  nextDue: 'May 1',  icon: Home,       color: '#6366F1' },
  { id: 2, name: 'Phone Bill',      category: 'Utilities',      amount: 78,  dueDay: 2,  recurring: true,  nextDue: 'May 2',  icon: Phone,      color: '#8B5CF6' },
  { id: 3, name: 'Self Payment',    category: 'Debt',           amount: 48,  dueDay: 3,  recurring: true,  nextDue: 'May 3',  icon: CreditCard, color: '#EC4899' },
  { id: 4, name: 'Car Insurance',   category: 'Insurance',      amount: 118, dueDay: 12, recurring: true,  nextDue: 'May 12', icon: Car,        color: '#F59E0B' },
  { id: 5, name: 'Affirm',          category: 'Debt',           amount: 36,  dueDay: 14, recurring: true,  nextDue: 'May 14', icon: CreditCard, color: '#EF4444' },
  { id: 6, name: 'Car Note',        category: 'Transportation', amount: 485, dueDay: 16, recurring: true,  nextDue: 'May 16', icon: Car,        color: '#10B981' },
  { id: 7, name: 'Navy Credit Card',category: 'Debt',           amount: 45,  dueDay: 24, recurring: true,  nextDue: 'May 24', icon: CreditCard, color: '#3B82F6' },
];

// Current view: April 2026. April 1-15 bills already paid for April.
// paidMonths tracks which YYYY-M combos have been paid per bill id.
type PaidMonths = Record<number, Set<string>>;

// Bills 1-3 have Apr already paid (nextDue = May), bills 4-7 still upcoming in Apr
const INITIAL_PAID: PaidMonths = {
  1: new Set(['2026-4']),
  2: new Set(['2026-4']),
  3: new Set(['2026-4']),
  4: new Set(),
  5: new Set(),
  6: new Set(),
  7: new Set(),
};

const VIEW_YEAR = 2026;
const VIEW_MONTH = 4; // April (1-based)
const VIEW_MONTH_LABEL = 'April 2026';
const MONTH_DAYS = 30; // April has 30 days

// Build per-day calendar status for April
// A day has a dot only if a bill is due on that day AND it's NOT already paid for this month
function buildCalendarDays(paidMonths: PaidMonths): Record<number, 'unpaid' | 'paid'> {
  const result: Record<number, 'unpaid' | 'paid'> = {};
  const key = `${VIEW_YEAR}-${VIEW_MONTH}`;
  for (const bill of BILL_DATA) {
    if (bill.dueDay >= 1 && bill.dueDay <= MONTH_DAYS) {
      const isPaid = paidMonths[bill.id]?.has(key);
      // Only put a dot if not paid for this month (upcoming/unpaid) OR if paid (show green)
      if (isPaid) {
        result[bill.dueDay] = 'paid'; // mark as paid
      } else {
        result[bill.dueDay] = 'unpaid';
      }
    }
  }
  return result;
}

// April starts on Wednesday (offset = 3 for a 0=Sun grid)
const APRIL_OFFSET = 3;

export function BillBoss() {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const [paidMonths, setPaidMonths] = useState<PaidMonths>(INITIAL_PAID);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthKey = `${VIEW_YEAR}-${VIEW_MONTH}`;

  const isPaidThisMonth = (id: number) => paidMonths[id]?.has(monthKey) ?? false;

  const togglePaid = (id: number) => {
    setPaidMonths(prev => {
      const next: PaidMonths = {};
      for (const k in prev) next[Number(k)] = new Set(prev[Number(k)]);
      const set = next[id] ?? new Set<string>();
      if (set.has(monthKey)) set.delete(monthKey); else set.add(monthKey);
      next[id] = set;
      return next;
    });
  };

  // For display: bills that are DUE in April but not yet paid this month
  const upcomingBills = BILL_DATA.filter(b => !isPaidThisMonth(b.id));
  // Bills already paid this month
  const paidBills = BILL_DATA.filter(b => isPaidThisMonth(b.id));

  // For compact view: show next due date
  const getNextDue = (bill: typeof BILL_DATA[0]) => {
    if (isPaidThisMonth(bill.id)) return bill.nextDue; // already paid Apr → show May
    return `Apr ${bill.dueDay}`;
  };

  // Build calendar day map
  const calendarDayStatus = buildCalendarDays(paidMonths);

  // Bills due on a specific day
  const billsOnDay = (day: number) => BILL_DATA.filter(b => b.dueDay === day);

  const totalPaid = paidBills.reduce((s, b) => s + b.amount, 0);
  const totalBills = BILL_DATA.reduce((s, b) => s + b.amount, 0);
  const paidPct = Math.round((totalPaid / totalBills) * 100);

  // Theme colors
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const subtle = isDark ? '#334155' : '#F8FAFC';
  const subtleBorder = isDark ? '1px solid #475569' : '1px solid #F1F5F9';
  const toggleBg = isDark ? '#334155' : '#F1F5F9';

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 style={{ fontSize: 26, fontWeight: 700, color: txt }}>Bill Boss</h1>
            <p className="text-sm mt-0.5" style={{ color: muted }}>Manage your monthly bills</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: '#6366F1', color: '#fff', fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Bill</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Summary Banner */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm opacity-70 mb-1">Total Monthly Bills</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1 }} className="sm:text-5xl">${totalBills.toLocaleString()}.00</div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.2)', fontWeight: 600 }}
                >
                  Paid: ${totalPaid.toLocaleString()}.00
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.12)', fontWeight: 600 }}
                >
                  Remaining: ${(totalBills - totalPaid).toLocaleString()}.00
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="text-sm opacity-70 mb-1">Next Due</div>
              {upcomingBills.length > 0 ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{upcomingBills[0].name}</div>
                  <div className="text-sm opacity-60">Apr {upcomingBills[0].dueDay} · ${upcomingBills[0].amount}.00</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>All Paid!</div>
                  <div className="text-sm opacity-60">Next cycle: May 1</div>
                </>
              )}
              <button
                className="mt-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-90 w-full sm:w-auto"
                style={{ background: '#fff', color: '#4F46E5', fontWeight: 700 }}
              >
                Pay Now
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-70 mb-1.5">
              <span>{paidPct}% paid</span>
              <span>{paidBills.length}/{BILL_DATA.length} bills</span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%`, background: '#34D399' }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Bill List — 3/5 */}
          <div className="lg:col-span-3 space-y-4 min-w-0">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: toggleBg }}>
                {(['list', 'compact'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className="px-4 py-1.5 rounded-lg text-sm capitalize transition-all"
                    style={{
                      background: viewMode === v ? (isDark ? '#1E293B' : '#fff') : 'transparent',
                      color: viewMode === v ? txt : muted,
                      fontWeight: viewMode === v ? 600 : 400,
                      boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {v === 'list' ? 'List View' : 'Compact'}
                  </button>
                ))}
              </div>
              <div className="text-sm" style={{ color: muted }}>
                {VIEW_MONTH_LABEL} Bills:{' '}
                <span style={{ color: '#6366F1', fontWeight: 700 }}>${totalBills.toLocaleString()}.00</span>
              </div>
            </div>

            {/* Bills */}
            <div className="space-y-2.5">
              {BILL_DATA.map((bill) => {
                const isPaid = isPaidThisMonth(bill.id);
                const Icon = bill.icon;

                if (viewMode === 'compact') {
                  // Compact row — shows next due date correctly
                  return (
                    <div
                      key={bill.id}
                      className="rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
                      style={{
                        background: isPaid ? (isDark ? '#14532D' : '#F0FDF4') : card,
                        border: isPaid ? `1px solid ${isDark ? '#15803D' : '#BBF7D0'}` : cardBorder,
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bill.color}15` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: bill.color }} />
                      </div>
                      <span className="flex-1 text-sm" style={{ fontWeight: 600, color: isPaid ? '#16A34A' : txt, textDecoration: isPaid ? 'line-through' : 'none', opacity: isPaid ? 0.7 : 1 }}>{bill.name}</span>
                      <span className="text-xs" style={{ color: muted }}>Next: {getNextDue(bill)}</span>
                      <span style={{ fontWeight: 700, color: isPaid ? '#16A34A' : '#EF4444', fontSize: 14 }}>−${bill.amount}</span>
                      <button
                        onClick={() => togglePaid(bill.id)}
                        className="p-1 rounded-lg transition-all hover:opacity-80"
                        style={{ background: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F0FDF4'), color: isPaid ? '#16A34A' : muted }}
                        title={isPaid ? `Unmark April payment` : `Mark April paid`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                // List view
                return (
                  <div
                    key={bill.id}
                    className="rounded-2xl p-4 transition-all hover:shadow-sm"
                    style={{
                      background: isPaid ? (isDark ? '#14532D' : '#F0FDF4') : card,
                      border: isPaid ? '1px solid ' + (isDark ? '#15803D' : '#BBF7D0') : cardBorder,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${bill.color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: bill.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm"
                            style={{
                              fontWeight: 700,
                              color: isPaid ? '#16A34A' : txt,
                              textDecoration: isPaid ? 'line-through' : 'none',
                              opacity: isPaid ? 0.7 : 1,
                            }}
                          >
                            {bill.name}
                          </span>
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>
                              April Paid ✓
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: muted }}>
                          {bill.category} ·{' '}
                          {isPaid
                            ? `Next due: ${bill.nextDue}`
                            : `Due Apr ${bill.dueDay} (this month)`}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 mr-2">
                        <div style={{ fontSize: 16, fontWeight: 800, color: isPaid ? '#16A34A' : '#EF4444' }}>
                          −${bill.amount}.00
                        </div>
                        {isPaid && (
                          <div className="text-xs" style={{ color: muted }}>Next: {bill.nextDue}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => togglePaid(bill.id)}
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{
                            background: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F0FDF4'),
                            color: isPaid ? '#16A34A' : muted,
                          }}
                          title={isPaid ? 'Unmark April payment' : 'Mark April as paid'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: muted, background: isDark ? '#334155' : '#F8FAFC' }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#EF4444', background: isDark ? '#450A0A' : '#FEF2F2' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Calendar + Day Detail + Rent Tracker */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            {/* Calendar */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-4">
                <button className="p-1.5 rounded-lg transition-all" style={{ background: subtle }}>
                  <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
                </button>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#6366F1' }} />
                  <span style={{ fontWeight: 700, color: txt, fontSize: 14 }}>{VIEW_MONTH_LABEL}</span>
                </div>
                <button className="p-1.5 rounded-lg transition-all" style={{ background: subtle }}>
                  <ChevronRight className="w-4 h-4" style={{ color: muted }} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center py-1.5" style={{ color: muted, fontSize: 10, fontWeight: 700 }}>
                    {d}
                  </div>
                ))}
              </div>
              {/* April offset = 3 (starts Wednesday) */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: APRIL_OFFSET }).map((_, i) => <div key={`off-${i}`} />)}
                {Array.from({ length: MONTH_DAYS }, (_, i) => i + 1).map((day) => {
                  const status = calendarDayStatus[day];
                  const isSelected = selectedDay === day;
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all hover:opacity-80"
                      style={{ height: 34, background: isSelected ? (isDark ? '#1E1B4B' : '#EEF2FF') : 'transparent' }}
                    >
                      <span
                        className="w-7 h-7 flex items-center justify-center rounded-full text-xs"
                        style={{
                          background: isSelected ? '#6366F1' : 'transparent',
                          color: isSelected ? '#fff' : txt,
                          fontWeight: isSelected ? 800 : 400,
                        }}
                      >
                        {day}
                      </span>
                      {status && (
                        <div
                          className="w-1 h-1 rounded-full"
                          style={{ background: status === 'paid' ? '#10B981' : '#EF4444', marginTop: 1 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[
                  { color: '#EF4444', label: 'Unpaid' },
                  { color: '#10B981', label: 'Paid' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail Panel — appears when a calendar day is selected */}
            {selectedDay !== null && (
              <div className="rounded-2xl p-4" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontWeight: 700, color: txt, fontSize: 14 }}>April {selectedDay}</span>
                  <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:opacity-70 transition-all" style={{ color: muted }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {billsOnDay(selectedDay).length === 0 ? (
                  <p className="text-sm" style={{ color: muted }}>No bills due on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {billsOnDay(selectedDay).map(bill => {
                      const isPaid = isPaidThisMonth(bill.id);
                      const Icon = bill.icon;
                      return (
                        <div key={bill.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isPaid ? (isDark ? '#14532D' : '#F0FDF4') : subtle, border: isPaid ? `1px solid ${isDark ? '#15803D' : '#BBF7D0'}` : subtleBorder }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bill.color}15` }}>
                            <Icon className="w-4 h-4" style={{ color: bill.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm" style={{ fontWeight: 700, color: isPaid ? '#16A34A' : txt }}>{bill.name}</div>
                            {isPaid ? (
                              <div className="text-xs" style={{ color: '#16A34A' }}>
                                April already paid ✓ — next due {bill.nextDue}
                              </div>
                            ) : (
                              <div className="text-xs" style={{ color: muted }}>Due Apr {bill.dueDay} · ${bill.amount}.00</div>
                            )}
                          </div>
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>Paid</span>
                          ) : (
                            <button
                              onClick={() => togglePaid(bill.id)}
                              className="px-3 py-1.5 rounded-lg text-xs flex-shrink-0 hover:opacity-90 transition-all"
                              style={{ background: '#6366F1', color: '#fff', fontWeight: 600 }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Rent Tracker */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: txt }}>Rent Tracker</h3>
                  <p className="text-xs mt-0.5" style={{ color: muted }}>Monthly: $500.00</p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: isPaidThisMonth(1) ? '#DCFCE7' : (isDark ? '#1E1B4B' : '#EEF2FF'), color: isPaidThisMonth(1) ? '#16A34A' : '#6366F1', fontWeight: 700 }}
                >
                  {isPaidThisMonth(1) ? '✓' : '!'}
                </div>
              </div>

              {isPaidThisMonth(1) ? (
                <div className="rounded-xl p-3.5" style={{ background: isDark ? '#14532D' : '#F0FDF4', border: isDark ? '1px solid #15803D' : '1px solid #BBF7D0' }}>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
                    <div className="min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Rent Paid for April</div>
                      <div className="text-xs mt-0.5" style={{ color: muted }}>Next due: May 1, 2026</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3.5" style={{ background: isDark ? '#450A0A' : '#FEF2F2', border: isDark ? '1px solid #7F1D1D' : '1px solid #FECACA' }}>
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                    <div className="min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Rent Due</div>
                      <div className="text-xs mt-0.5" style={{ color: muted }}>
                        Due Apr 1 — mark as paid in your bills list
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment history */}
              <div className="mt-3 pt-3" style={{ borderTop: subtleBorder }}>
                <div className="text-xs mb-2" style={{ color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Payment History
                </div>
                {isPaidThisMonth(1) ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: subtle }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                    <span className="text-xs" style={{ color: txt }}>April 2026 — $500.00</span>
                    <span className="ml-auto text-xs" style={{ color: '#16A34A', fontWeight: 600 }}>Paid</span>
                  </div>
                ) : (
                  <div className="text-xs text-center py-4" style={{ color: muted, opacity: 0.5 }}>
                    No payment history yet
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add */}
            <div className="rounded-2xl p-5" style={{ background: subtle, border: subtleBorder }}>
              <button
                className="w-full flex items-center justify-center gap-2 py-2 text-sm transition-all hover:opacity-80"
                style={{ color: '#6366F1', fontWeight: 600 }}
              >
                <Plus className="w-4 h-4" />
                Add New Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}