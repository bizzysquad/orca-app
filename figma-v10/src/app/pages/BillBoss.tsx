import { useState } from 'react';
import {
  Plus, Check, Edit2, Trash2, ChevronLeft, ChevronRight,
  Home, Phone, Car, CreditCard, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const bills = [
  { id: 1, name: 'Rent', category: 'Housing', amount: 500, due: 'Apr 1', daysAway: 4, status: 'unpaid', icon: Home, color: '#6366F1' },
  { id: 2, name: 'Phone Bill', category: 'Utilities', amount: 78, due: 'Apr 2', daysAway: 5, status: 'unpaid', icon: Phone, color: '#8B5CF6' },
  { id: 3, name: 'Self Payment', category: 'Debt', amount: 48, due: 'Apr 3', daysAway: 6, status: 'unpaid', icon: CreditCard, color: '#EC4899' },
  { id: 4, name: 'Car Insurance', category: 'Insurance', amount: 118, due: 'Apr 12', daysAway: 15, status: 'unpaid', icon: Car, color: '#F59E0B' },
  { id: 5, name: 'Affirm', category: 'Debt', amount: 36, due: 'Apr 14', daysAway: 17, status: 'unpaid', icon: CreditCard, color: '#EF4444' },
  { id: 6, name: 'Car Note', category: 'Transportation', amount: 485, due: 'Apr 16', daysAway: 19, status: 'unpaid', icon: Car, color: '#10B981' },
  { id: 7, name: 'Navy Credit Card', category: 'Debt', amount: 45, due: 'Apr 24', daysAway: 27, status: 'unpaid', icon: CreditCard, color: '#3B82F6' },
];

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const billDays: Record<number, 'unpaid' | 'paid'> = { 1: 'unpaid', 2: 'unpaid', 3: 'unpaid', 5: 'unpaid', 12: 'unpaid', 14: 'unpaid', 16: 'unpaid', 24: 'unpaid' };

export function BillBoss() {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const [paidIds, setPaidIds] = useState<number[]>([]);

  const togglePaid = (id: number) => {
    setPaidIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const totalPaid = bills.filter((b) => paidIds.includes(b.id)).reduce((s, b) => s + b.amount, 0);
  const totalBills = bills.reduce((s, b) => s + b.amount, 0);
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
                  Paid: ${totalPaid}.00
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.12)', fontWeight: 600 }}
                >
                  Remaining: ${totalBills - totalPaid}.00
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="text-sm opacity-70 mb-1">Next Due</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Rent</div>
              <div className="text-sm opacity-60">Apr 1 · $500.00</div>
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
              <span>{bills.filter((b) => paidIds.includes(b.id)).length}/{bills.length} bills</span>
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
                April Bills:{' '}
                <span style={{ color: '#6366F1', fontWeight: 700 }}>${totalBills.toLocaleString()}.00</span>
              </div>
            </div>

            {/* Bills */}
            <div className="space-y-2.5">
              {bills.map((bill) => {
                const isPaid = paidIds.includes(bill.id);
                const Icon = bill.icon;
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
                          {isPaid && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}
                            >
                              Paid
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: muted }}>
                          {bill.category} · Due {bill.due} · {bill.daysAway}d away
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 mr-2">
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: isPaid ? '#16A34A' : '#EF4444',
                          }}
                        >
                          −${bill.amount}.00
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => togglePaid(bill.id)}
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{
                            background: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F0FDF4'),
                            color: isPaid ? '#16A34A' : muted,
                          }}
                          title={isPaid ? 'Mark unpaid' : 'Mark paid'}
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

          {/* Right — Calendar + Rent Tracker */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            {/* Calendar */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-4">
                <button className="p-1.5 rounded-lg transition-all" style={{ background: subtle }}>
                  <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
                </button>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#6366F1' }} />
                  <span style={{ fontWeight: 700, color: txt, fontSize: 14 }}>March 2026</span>
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
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day) => {
                  const today = day === 28;
                  const hasBill = billDays[day];
                  return (
                    <div
                      key={day}
                      className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all"
                      style={{ height: 34, background: today ? 'transparent' : 'transparent' }}
                    >
                      <span
                        className="w-7 h-7 flex items-center justify-center rounded-full text-xs"
                        style={{
                          background: today ? '#6366F1' : 'transparent',
                          color: today ? '#fff' : txt,
                          fontWeight: today ? 800 : 400,
                        }}
                      >
                        {day}
                      </span>
                      {hasBill && (
                        <div
                          className="w-1 h-1 rounded-full"
                          style={{ background: hasBill === 'paid' ? '#10B981' : '#EF4444', marginTop: 1 }}
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
                  { color: '#F59E0B', label: 'Split' },
                  { color: '#10B981', label: 'Paid' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rent Tracker */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: txt }}>Rent Tracker</h3>
                  <p className="text-xs mt-0.5" style={{ color: muted }}>Monthly: $500.00</p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1', fontWeight: 700 }}
                >
                  0
                </div>
              </div>
              <div
                className="rounded-xl p-3.5"
                style={{ background: isDark ? '#450A0A' : '#FEF2F2', border: isDark ? '1px solid #7F1D1D' : '1px solid #FECACA' }}
              >
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

              {/* Payment history placeholder */}
              <div className="mt-3 pt-3" style={{ borderTop: subtleBorder }}>
                <div className="text-xs mb-2" style={{ color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Payment History
                </div>
                <div className="text-xs text-center py-4" style={{ color: muted, opacity: 0.5 }}>
                  No payment history yet
                </div>
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