import { useState } from 'react';
import {
  TrendingUp, Plus, Check, Edit2, Trash2, ChevronLeft,
  ChevronRight, Wallet, BarChart3, Calculator, Clock, Target, Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Data ─────────────────────────────────────────────────────────────────────
const scheduledPayments = [
  { id: 1, name: 'Doordash', date: 'Wed, Apr 1', amount: 497, recurrence: 'One-time', status: 'upcoming' },
];
const incomeHistory = [
  { name: 'Doordash', date: 'Apr 1, 2026', amount: 497, status: 'Upcoming' },
];

interface SavingsAccount {
  id: number;
  name: string;
  balance: number;
  goal: string;
  customAdd: string;
  saved: boolean;
}

const INITIAL_SAVINGS: SavingsAccount[] = [
  { id: 1, name: 'BG WEALTH', balance: 3226.54, goal: '', customAdd: '', saved: true },
  { id: 2, name: 'Acorns', balance: 496.28, goal: '', customAdd: '', saved: true },
];

// ── Check Projection calendar helper ────────────────────────────────────────
const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Mar 23 – Apr 5 = 14 days (bi-weekly pay period)
function buildPayPeriodDays(startDay: number, startMonth: number, count: number) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const totalDay = startDay + i;
    let day = totalDay;
    let month = startMonth;
    if (month === 3 && day > 31) { day -= 31; month = 4; }
    const dow = (startDay - 1 + i) % 7; // Mar 23 is Sunday=0
    result.push({ day, month, dow, isWeekend: dow === 0 || dow === 6, label: DAYS_LABEL[dow] });
  }
  return result;
}

// ── Component ────────────────────────────────────────────────────────────────
export function SmartStack() {
  const { isDark } = useTheme();
  const [mainTab, setMainTab] = useState<'income' | 'savings'>('income');
  const [subTab, setSubTab] = useState<'incoming' | 'projection' | 'calculator'>('incoming');

  // Incoming payments form
  const [recurrence, setRecurrence] = useState<'one-time' | 'weekly' | 'bi-weekly' | 'monthly'>('one-time');
  const [pmtAmount, setPmtAmount] = useState('');
  const [pmtDate, setPmtDate] = useState('');
  const [pmtDesc, setPmtDesc] = useState('');

  // Check projection
  const [netIncome, setNetIncome] = useState('1');
  const [freq, setFreq] = useState<'weekly' | 'bi-weekly'>('bi-weekly');
  const [markedOff, setMarkedOff] = useState<Set<number>>(new Set());
  const payPeriodDays = buildPayPeriodDays(23, 3, freq === 'bi-weekly' ? 14 : 7);
  const workDays = payPeriodDays.filter(d => !d.isWeekend && !markedOff.has(d.day)).length;
  const projectedCheck = parseFloat(netIncome || '0');
  const toggleDay = (day: number) => {
    setMarkedOff(prev => { const s = new Set(prev); s.has(day) ? s.delete(day) : s.add(day); return s; });
  };

  // Projection calculator
  const [goalAmt, setGoalAmt] = useState('');
  const [haveNow, setHaveNow] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [tfUnit, setTfUnit] = useState<'Months' | 'Years'>('Months');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const handleCalculate = () => {
    const g = parseFloat(goalAmt);
    const h = parseFloat(haveNow) || 0;
    const t = parseFloat(timeframe);
    if (isNaN(g) || isNaN(t) || t <= 0) { setCalcResult('Please fill all fields.'); return; }
    const need = Math.max(0, g - h);
    const months = tfUnit === 'Years' ? t * 12 : t;
    const perMonth = need / months;
    setCalcResult(`Save $${perMonth.toFixed(2)}/month for ${months.toFixed(0)} months to reach $${g.toLocaleString()}`);
  };

  // Splitter
  const [splitterMonth, setSplitterMonth] = useState(2); // March=2
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const totalIncome = 497;
  const totalBills = 1232;

  // Savings
  const [savings, setSavings] = useState<SavingsAccount[]>(INITIAL_SAVINGS);
  const [newAcctName, setNewAcctName] = useState('');
  const updateSavings = (id: number, field: keyof SavingsAccount, val: string | boolean | number) => {
    setSavings(s => s.map(a => a.id === id ? { ...a, [field]: val } : a));
  };
  const quickAdd = (id: number, amt: number) => {
    setSavings(s => s.map(a => a.id === id ? { ...a, balance: +(a.balance + amt).toFixed(2), saved: true } : a));
  };
  const addCustom = (id: number) => {
    const acct = savings.find(a => a.id === id);
    if (!acct) return;
    const amt = parseFloat(acct.customAdd);
    if (isNaN(amt) || amt <= 0) return;
    setSavings(s => s.map(a => a.id === id ? { ...a, balance: +(a.balance + amt).toFixed(2), customAdd: '', saved: true } : a));
  };
  const deleteSavings = (id: number) => setSavings(s => s.filter(a => a.id !== id));
  const addAccount = () => {
    if (!newAcctName.trim()) return;
    setSavings(s => [...s, { id: Date.now(), name: newAcctName.trim(), balance: 0, goal: '', customAdd: '', saved: false }]);
    setNewAcctName('');
  };
  const totalSaved = savings.reduce((s, a) => s + a.balance, 0);

  // Theme
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const subtle = isDark ? '#0F172A' : '#F8FAFC';
  const subtleBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const inputStyle = { background: isDark ? '#0F172A' : '#FFFFFF', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, color: txt } as React.CSSProperties;
  const sectionBg = isDark ? '#0F172A' : '#F8FAFC';

  // Teal palette (matches screenshots)
  const teal = '#0891B2';
  const tealLight = isDark ? '#164E63' : '#E0F9FC';
  const tealBorder = isDark ? '#0E7490' : '#A5F3FC';

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 800, color: txt }}>Smart Stack</h1>
          <p className="text-sm mt-0.5" style={{ color: muted }}>Complete financial management at a glance</p>
        </div>

        {/* Main tabs */}
        <div className="flex mb-6 rounded-2xl overflow-hidden" style={{ background: isDark ? '#1E293B' : '#E0F9FC', border: `1px solid ${tealBorder}` }}>
          {(['income', 'savings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className="flex-1 py-3 text-sm capitalize transition-all"
              style={{
                background: mainTab === tab ? teal : 'transparent',
                color: mainTab === tab ? '#fff' : (isDark ? '#94A3B8' : '#0E7490'),
                fontWeight: mainTab === tab ? 700 : 500,
              }}
            >
              {tab === 'income' ? 'Income' : 'Savings'}
            </button>
          ))}
        </div>

        {/* ── INCOME TAB ─────────────────────────────────────────────────────── */}
        {mainTab === 'income' && (
          <div className="space-y-6">
            {/* Sub tabs */}
            <div className="flex rounded-2xl overflow-hidden" style={{ background: tealLight, border: `1px solid ${tealBorder}` }}>
              {[
                { key: 'incoming', label: 'Incoming Payments', icon: Wallet },
                { key: 'projection', label: 'Check Projection', icon: BarChart3 },
                { key: 'calculator', label: 'Projection Calculator', icon: Calculator },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSubTab(key as typeof subTab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs transition-all"
                  style={{
                    background: subTab === key ? teal : 'transparent',
                    color: subTab === key ? '#fff' : (isDark ? '#67E8F9' : '#0E7490'),
                    fontWeight: subTab === key ? 700 : 500,
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* ── INCOMING PAYMENTS ─────────────────────────────────────────── */}
            {subTab === 'incoming' && (
              <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tealLight }}>
                    <Wallet className="w-5 h-5" style={{ color: teal }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: txt }}>Incoming Payments</h2>
                    <p className="text-xs" style={{ color: muted }}>Track expected income — feeds into your Safe to Spend calculation</p>
                  </div>
                </div>

                {/* Add form */}
                <div className="rounded-xl p-4 mb-5" style={{ background: sectionBg, border: subtleBorder }}>
                  <div className="text-xs mb-3" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Add Next Payment / Paycheck</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                      <input type="number" placeholder="Amount" value={pmtAmount} onChange={e => setPmtAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                    </div>
                    <input type="date" value={pmtDate} onChange={e => setPmtDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <input type="text" placeholder="Description (e.g., Paycheck, Client Invoice)" value={pmtDesc} onChange={e => setPmtDesc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-3" style={inputStyle} />
                  <div className="mb-3">
                    <div className="text-xs mb-2" style={{ color: muted, fontWeight: 600 }}>Recurrence</div>
                    <div className="flex gap-2 flex-wrap">
                      {(['one-time', 'weekly', 'bi-weekly', 'monthly'] as const).map(r => (
                        <button key={r} onClick={() => setRecurrence(r)}
                          className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{ background: recurrence === r ? teal : (isDark ? '#334155' : '#F1F5F9'), color: recurrence === r ? '#fff' : muted, fontWeight: recurrence === r ? 700 : 400 }}>
                          {r.replace('-', '‑')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    style={{ background: teal, color: '#fff', fontWeight: 700 }}>
                    <Plus className="w-4 h-4" />Add Payment
                  </button>
                </div>

                {/* Scheduled */}
                <div className="text-xs mb-3" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled Payments</div>
                {scheduledPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90" style={{ border: subtleBorder }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                    <div className="flex-1">
                      <div className="text-sm" style={{ fontWeight: 700, color: txt }}>{p.name}</div>
                      <div className="text-xs" style={{ color: muted }}>{p.date} · {p.recurrence}</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>Upcoming</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>+${p.amount}.00</div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-green-50 transition-all" style={{ color: '#10B981' }}><Check className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-all" style={{ color: muted }}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CHECK PROJECTION ──────────────────────────────────────────── */}
            {subTab === 'projection' && (
              <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tealLight }}>
                    <BarChart3 className="w-5 h-5" style={{ color: teal }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: txt }}>Check Projector</h2>
                  </div>
                </div>

                {/* Net income */}
                <div className="mb-4">
                  <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>NET INCOME</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }}>$</span>
                    <input type="number" value={netIncome} onChange={e => setNetIncome(e.target.value)}
                      className="w-full pl-7 pr-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: muted }}>Your take-home pay per pay period</p>
                </div>

                {/* Frequency */}
                <div className="mb-4">
                  <label className="block text-xs mb-2" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequency</label>
                  <div className="flex gap-2">
                    {(['weekly', 'bi-weekly'] as const).map(f => (
                      <button key={f} onClick={() => setFreq(f)}
                        className="px-4 py-2 rounded-xl text-sm capitalize transition-all"
                        style={{ background: freq === f ? teal : (isDark ? '#334155' : '#F1F5F9'), color: freq === f ? '#fff' : muted, fontWeight: freq === f ? 700 : 400 }}>
                        {f === 'bi-weekly' ? 'Bi-Weekly' : 'Weekly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" style={{ background: tealLight, color: teal, border: `1px solid ${tealBorder}` }}>
                    <span>📅</span>
                    {freq === 'bi-weekly' ? 'Mar 23 – Apr 5' : 'Mar 23 – Mar 29'}
                    <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: teal, color: '#fff', fontWeight: 700 }}>Current</span>
                  </div>
                </div>

                {/* Custom pay period */}
                <div className="rounded-xl p-4 mb-4" style={{ background: sectionBg, border: subtleBorder }}>
                  <div className="text-xs mb-3" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom Pay Period (Optional)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: muted }}>Start Date</label>
                      <input type="date" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: muted }}>Last Date</label>
                      <input type="date" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                    </div>
                  </div>
                </div>

                {/* Pay period calendar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pay Period</div>
                    <div className="text-xs" style={{ color: muted }}>Click modifiers to mark off. Click again to add work days.</div>
                  </div>

                  {/* Grid: group into weeks */}
                  {Array.from({ length: Math.ceil(payPeriodDays.length / 7) }, (_, w) => (
                    <div key={w}>
                      {/* Day-of-week header (only first week) */}
                      {w === 0 && (
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {DAYS_LABEL.map(d => (
                            <div key={d} className="text-center text-xs py-1" style={{ color: muted, fontWeight: 600 }}>{d}</div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {payPeriodDays.slice(w * 7, (w + 1) * 7).map(d => {
                          const off = markedOff.has(d.day);
                          const isWk = d.isWeekend;
                          return (
                            <button
                              key={`${d.month}-${d.day}`}
                              onClick={() => !isWk && toggleDay(d.day)}
                              className="flex flex-col items-center justify-center rounded-xl transition-all"
                              style={{
                                height: 52,
                                background: off ? (isDark ? '#1E293B' : '#F1F5F9') : isWk ? (isDark ? '#0F172A' : '#F8FAFC') : (isDark ? '#164E63' : '#E0F9FC'),
                                border: `1px solid ${off ? (isDark ? '#334155' : '#E2E8F0') : isWk ? (isDark ? '#1E293B' : '#F1F5F9') : tealBorder}`,
                                opacity: isWk ? 0.5 : 1,
                                cursor: isWk ? 'default' : 'pointer',
                              }}
                            >
                              <span className="text-xs" style={{ color: muted, fontWeight: 500 }}>{d.label.slice(0, 2)}</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: off ? muted : isWk ? muted : teal }}>
                                {d.day}
                              </span>
                              {!isWk && (
                                <span className="text-xs" style={{ color: off ? muted : teal, fontSize: 9 }}>{off ? 'off' : 'on'}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result */}
                <div className="rounded-xl p-4" style={{ background: tealLight, border: `1px solid ${tealBorder}` }}>
                  <div className="text-xs mb-1" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projected Check Amount</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: teal }}>${projectedCheck.toFixed(2)}</div>
                  <div className="text-xs mt-1" style={{ color: muted }}>Based on ${projectedCheck.toFixed(2)} net income · {workDays} work days</div>
                </div>
              </div>
            )}

            {/* ── PROJECTION CALCULATOR ─────────────────────────────────────── */}
            {subTab === 'calculator' && (
              <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tealLight }}>
                    <Zap className="w-5 h-5" style={{ color: teal }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: txt }}>Projection Calculator</h2>
                    <p className="text-xs" style={{ color: muted }}>How much do you need to save?</p>
                  </div>
                </div>

                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Goal Amount ($)</label>
                    <input type="number" placeholder="e.g. 5000" value={goalAmt} onChange={e => setGoalAmt(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>How much do you have now ($)</label>
                    <input type="number" placeholder="e.g. 1000" value={haveNow} onChange={e => setHaveNow(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timeframe &amp; Unit</label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="e.g. 6" value={timeframe} onChange={e => setTimeframe(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                      <select value={tfUnit} onChange={e => setTfUnit(e.target.value as 'Months' | 'Years')}
                        className="px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option>Months</option>
                        <option>Years</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button onClick={handleCalculate}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all mb-4"
                  style={{ background: teal, color: '#fff', fontWeight: 700 }}>
                  Calculate
                </button>

                {calcResult && (
                  <div className="rounded-xl p-4" style={{ background: tealLight, border: `1px solid ${tealBorder}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="w-4 h-4" style={{ color: teal }} />
                      <span className="text-sm" style={{ fontWeight: 700, color: teal }}>Result</span>
                    </div>
                    <p className="text-sm" style={{ color: txt }}>{calcResult}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SPLITTER (always shown below) ─────────────────────────────── */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tealLight }}>
                  <TrendingUp className="w-5 h-5" style={{ color: teal }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: txt }}>Splitter</h2>
                  <p className="text-xs" style={{ color: muted }}>Allocate your income toward bills — see exactly how much to set aside each week or paycheck</p>
                </div>
              </div>

              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setSplitterMonth(m => m - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                  <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
                </button>
                <span style={{ fontWeight: 700, color: txt, fontSize: 15 }}>{MONTH_NAMES[((splitterMonth % 12) + 12) % 12]} 2026</span>
                <button onClick={() => setSplitterMonth(m => m + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                  <ChevronRight className="w-4 h-4" style={{ color: muted }} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Income */}
                <div className="rounded-xl p-4" style={{ background: isDark ? '#052E16' : '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Income</span>
                    <div className="flex gap-1">
                      {['Auto', 'Manual'].map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-full text-xs" style={{ background: m === 'Auto' ? teal : (isDark ? '#334155' : '#F1F5F9'), color: m === 'Auto' ? '#fff' : muted, fontWeight: 600 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs mb-1" style={{ color: muted }}>From Incoming Payments</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>${totalIncome}.00</div>
                  <div className="text-xs mt-1" style={{ color: muted }}>No payments found for this month</div>
                </div>

                {/* Bills */}
                <div className="rounded-xl p-4" style={{ background: isDark ? '#2D0A0A' : '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Bills</span>
                    <div className="flex gap-1">
                      {['Bill Boss', 'Manual'].map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-full text-xs" style={{ background: m === 'Bill Boss' ? teal : (isDark ? '#334155' : '#F1F5F9'), color: m === 'Bill Boss' ? '#fff' : muted, fontWeight: 600 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs mb-1" style={{ color: muted }}>From Bill Boss (March 2026)</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>−${totalBills}.00</div>
                  <div className="text-xs mt-1" style={{ color: muted }}>7 unpaid bills</div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: muted }}>
                  <span>Bills (0%)</span><span>Remaining (100%)</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 10, background: '#10B981' }}>
                  <div className="h-full rounded-full" style={{ width: '0%', background: '#EF4444' }} />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Available', val: '$0.00', color: '#10B981', bg: isDark ? '#052E16' : '#F0FDF4', border: '#BBF7D0' },
                  { label: 'Total Bills', val: '−$1,232.00', color: '#EF4444', bg: isDark ? '#2D0A0A' : '#FEF2F2', border: '#FECACA' },
                  { label: 'After Bills', val: '$0.00', color: '#10B981', bg: isDark ? '#052E16' : '#F0FDF4', border: '#BBF7D0' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3.5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="text-xs mb-1" style={{ color: muted, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Per period */}
              <div className="rounded-xl p-4" style={{ background: sectionBg, border: subtleBorder }}>
                <p className="text-sm mb-3" style={{ color: muted }}>Based on your income and bills this month, you need to set aside:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3.5 text-center" style={{ background: tealLight, border: `1px solid ${tealBorder}` }}>
                    <div className="text-xs mb-1" style={{ color: teal, fontWeight: 600 }}>Per Week</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: teal }}>$278.19</div>
                  </div>
                  <div className="rounded-xl p-3.5 text-center" style={{ background: isDark ? '#052E16' : '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div className="text-xs mb-1" style={{ color: '#10B981', fontWeight: 600 }}>Per Day</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>$39.74</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Income History */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4" style={{ color: teal }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: txt }}>Income History</h2>
              </div>
              {incomeHistory.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:opacity-90 transition-all">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
                  <div className="flex-1">
                    <div className="text-sm" style={{ fontWeight: 600, color: txt }}>{item.name}</div>
                    <div className="text-xs" style={{ color: muted }}>{item.date}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 600 }}>{item.status}</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>+${item.amount}.00</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SAVINGS TAB ───────────────────────────────────────────────────── */}
        {mainTab === 'savings' && (
          <div className="space-y-5">
            {/* Total Savings hero */}
            <div className="rounded-2xl p-5" style={{ background: isDark ? '#164E63' : '#E0F9FC', border: `1px solid ${tealBorder}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: teal }} />
                <span className="text-sm" style={{ fontWeight: 700, color: teal }}>Total Savings</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: teal }}>${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs mt-1" style={{ color: muted }}>{savings.length} account{savings.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Savings accounts */}
            {savings.map(acct => (
              <div key={acct.id} className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: teal, letterSpacing: '0.06em' }}>{acct.name}</h3>
                  <button onClick={() => deleteSavings(acct.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: teal }} className="mb-4">${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                {/* Edit Balance */}
                <div className="mb-3">
                  <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 600 }}>Edit Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                    <input type="number" value={acct.balance} onChange={e => updateSavings(acct.id, 'balance', parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>

                {/* Savings Goal */}
                <div className="mb-3">
                  <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 600 }}>Savings Goal</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                    <input type="text" placeholder="Set a goal (optional)" value={acct.goal} onChange={e => updateSavings(acct.id, 'goal', e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>

                {/* Quick Add */}
                <div className="mb-3">
                  <label className="block text-xs mb-2" style={{ color: muted, fontWeight: 600 }}>Quick Add</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 25, 50, 100].map(amt => (
                      <button key={amt} onClick={() => quickAdd(acct.id, amt)}
                        className="py-2 rounded-xl text-sm transition-all hover:opacity-90"
                        style={{ background: tealLight, color: teal, fontWeight: 700, border: `1px solid ${tealBorder}` }}>
                        +${amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom add */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                    <input type="number" placeholder="Custom amount" value={acct.customAdd} onChange={e => updateSavings(acct.id, 'customAdd', e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <button onClick={() => addCustom(acct.id)}
                    className="px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 flex-shrink-0"
                    style={{ background: teal, color: '#fff', fontWeight: 700 }}>Add</button>
                </div>

                {/* Saved button */}
                <button className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#16A34A', color: '#fff', fontWeight: 700 }}>
                  ✓ Saved!
                </button>
              </div>
            ))}

            {/* Add Savings Account */}
            <div className="rounded-2xl p-5" style={{ background: card, border: `2px dashed ${isDark ? '#334155' : '#CBD5E1'}` }}>
              <h3 className="text-sm mb-3" style={{ fontWeight: 700, color: muted }}>Add Savings Account</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Account name (e.g., Emergency Fund)" value={newAcctName} onChange={e => setNewAcctName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                <button onClick={addAccount}
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90"
                  style={{ background: teal, color: '#fff' }}>
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}