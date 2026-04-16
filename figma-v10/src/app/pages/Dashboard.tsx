import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import orcaLogo from 'figma:asset/bb18e3f470e30dc5313d2b4328ae8bb9d12e0188.png';
import {
  TrendingUp, Receipt, PiggyBank, ChevronRight,
  ArrowUpRight, ArrowDownRight, Users, CreditCard,
  Zap, Bell, GripVertical, ChevronLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Data ────────────────────────────────────────────────────────────────────
const upcomingBills = [
  { name: 'Rent', category: 'Housing', amount: 500, due: 'Apr 1', daysAway: 4 },
  { name: 'Phone Bill', category: 'Utilities', amount: 78, due: 'Apr 2', daysAway: 5 },
  { name: 'Self Payment', category: 'Debt', amount: 48, due: 'Apr 3', daysAway: 6 },
  { name: 'Car Insurance', category: 'Insurance', amount: 118, due: 'Apr 12', daysAway: 15 },
];

// March 2026: starts on Sunday (offset=0), 31 days
const MARCH_OFFSET = 0;
const MARCH_DAYS = 31;
const BILL_DAYS: Record<number, 'bill' | 'payment' | 'task' | 'group'> = {
  1: 'bill', 2: 'bill', 3: 'bill', 5: 'payment', 12: 'bill', 14: 'bill', 16: 'bill', 24: 'task', 30: 'group',
};

// Week of Mar 22–28
const WEEK_DAYS = [
  { label: 'Sun', num: 22 },
  { label: 'Mon', num: 23 },
  { label: 'Tue', num: 24 },
  { label: 'Wed', num: 25 },
  { label: 'Thu', num: 26 },
  { label: 'Fri', num: 27 },
  { label: 'Sat', num: 28 },
];

type SectionKey = 'metrics' | 'calendar' | 'bills' | 'credit' | 'circle' | 'upcoming';

const DEFAULT_ORDER: SectionKey[] = ['metrics', 'calendar', 'bills', 'credit', 'circle', 'upcoming'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function dotColor(type: 'bill' | 'payment' | 'task' | 'group') {
  return { bill: '#EF4444', payment: '#10B981', task: '#8B5CF6', group: '#F59E0B' }[type];
}

// ── Component ────────────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Calendar
  const [calView, setCalView] = useState<'month' | 'week'>('month');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = Mar 22-28, -1 = Mar 15-21, +1 = Mar 29-Apr 4
  const [monthOffset, setMonthOffset] = useState(0); // 0 = March 2026

  // Drag-to-reorder
  const [sections, setSections] = useState<SectionKey[]>(() => {
    // Load saved order from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orca-dashboard-order');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return DEFAULT_ORDER;
        }
      }
    }
    return DEFAULT_ORDER;
  });
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragActive, setDragActive] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Persist order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('orca-dashboard-order', JSON.stringify(sections));
  }, [sections]);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx;
    setDragActive(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (idx: number) => {
    dragOverIndex.current = idx;
    setDragOver(idx);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    const next = [...sections];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(idx, 0, moved);
    setSections(next);
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragActive(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragActive(null); setDragOver(null); };

  // Theme colors
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const subtle = isDark ? '#334155' : '#F8FAFC';
  const subtleBorder = isDark ? '1px solid #475569' : '1px solid #F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#F8FAFC';

  // ── Calendar helpers ────────────────────────────────────────────────────
  const getWeekDays = () => {
    // Base week: Mar 22-28 (weekOffset=0)
    const baseStart = 22; // March 22
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayNum = baseStart + (weekOffset * 7) + i;
      let month = 'Mar';
      let displayNum = dayNum;
      if (dayNum > 31) { displayNum = dayNum - 31; month = 'Apr'; }
      else if (dayNum < 1) { displayNum = 31 + dayNum; month = 'Feb'; }
      days.push({ label: labels[i], num: displayNum, month, isToday: dayNum === 28 && weekOffset === 0, dayNum });
    }
    return days;
  };

  const weekLabel = () => {
    const w = getWeekDays();
    return `${w[0].month} ${w[0].num} – ${w[6].month} ${w[6].num}, 2026`;
  };

  const getMonthLabel = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIdx = (2 + monthOffset + 12) % 12; // March=2
    const year = 2026 + Math.floor((2 + monthOffset) / 12);
    return `${months[monthIdx]} ${year}`;
  };

  // ── Section renderers ────────────────────────────────────────────────────
  const Metrics = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: 'Next Payment', sub: 'Doordash · Apr 1 · 4 days', val: '+$497.00', color: '#10B981', Icon: TrendingUp, dir: ArrowUpRight, nav: '/smart-stack' },
        { label: 'Bills Due', sub: 'Next: Rent · Apr 1 · $500', val: '−$578.00', color: '#EF4444', Icon: Receipt, dir: ArrowDownRight, nav: '/bill-boss' },
        { label: 'Total Saved', sub: 'Across all accounts', val: '$3,722.82', color: '#6366F1', Icon: PiggyBank, dir: ArrowUpRight, nav: '/smart-stack' },
      ].map(({ label, sub, val, color, Icon, dir: Dir, nav }) => (
        <div key={label} className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: card, border: cardBorder }} onClick={() => navigate(nav)}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: muted }}>
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </div>
            <Dir className="w-4 h-4" style={{ color }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
          <div className="text-sm mt-1" style={{ color: muted }}>{sub}</div>
        </div>
      ))}
    </div>
  );

  const CalendarSection = () => (
    <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Calendar</h3>
        <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: isDark ? '#334155' : '#F1F5F9' }}>
          {(['Month', 'Week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setCalView(v.toLowerCase() as 'month' | 'week')}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: calView === v.toLowerCase() ? '#0891B2' : 'transparent',
                color: calView === v.toLowerCase() ? '#fff' : muted,
                fontWeight: calView === v.toLowerCase() ? 700 : 400,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {calView === 'week' && (
        <div className="rounded-2xl p-4" style={{ background: isDark ? '#0F172A' : '#E0F9FC', border: `1px solid ${isDark ? '#334155' : '#A5F3FC'}` }}>
          {/* Week nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all" style={{ color: '#0891B2' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ fontWeight: 700, color: isDark ? '#67E8F9' : '#0E7490', fontSize: 14 }}>{weekLabel()}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all" style={{ color: '#0891B2' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map(day => (
              <div key={day.label + day.num} className="flex flex-col items-center gap-1">
                <div className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>{day.label}</div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    background: day.isToday ? '#0891B2' : (isDark ? '#1E293B' : '#FFFFFF'),
                    border: day.isToday ? 'none' : `2px solid ${isDark ? '#334155' : '#BAE6FD'}`,
                    color: day.isToday ? '#fff' : (isDark ? '#F1F5F9' : '#0F172A'),
                    fontWeight: day.isToday ? 800 : 600,
                    fontSize: 15,
                  }}
                >
                  {day.num}
                </div>
                {/* dot indicator */}
                {BILL_DAYS[day.dayNum] && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor(BILL_DAYS[day.dayNum]) }} />
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {[
              { color: '#10B981', label: 'Payment' },
              { color: '#EF4444', label: 'Bill Due' },
              { color: '#94A3B8', label: 'Day Off' },
              { color: '#8B5CF6', label: 'Task' },
              { color: '#F59E0B', label: 'Group' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {calView === 'month' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonthOffset(m => m - 1)} className="p-1.5 rounded-lg transition-all hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" style={{ color: muted }} />
            </button>
            <span style={{ fontWeight: 700, color: txt, fontSize: 14 }}>{getMonthLabel()}</span>
            <button onClick={() => setMonthOffset(m => m + 1)} className="p-1.5 rounded-lg transition-all hover:bg-slate-100">
              <ChevronRight className="w-4 h-4" style={{ color: muted }} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
              <div key={i} className="text-center text-xs py-1" style={{ color: muted, fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: MARCH_OFFSET }).map((_, i) => <div key={`off-${i}`} />)}
            {Array.from({ length: MARCH_DAYS }, (_, i) => i + 1).map(day => {
              const today = day === 28 && monthOffset === 0;
              const hasEvent = BILL_DAYS[day];
              return (
                <div
                  key={day}
                  className="flex flex-col items-center justify-center rounded-lg cursor-pointer hover:opacity-80 transition-all"
                  style={{
                    height: 32,
                    background: today ? '#6366F1' : 'transparent',
                    color: today ? '#fff' : txt,
                    fontWeight: today ? 700 : 400,
                    fontSize: 12,
                  }}
                >
                  {day}
                  {hasEvent && !today && (
                    <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: dotColor(hasEvent) }} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { color: '#10B981', label: 'Payment' },
              { color: '#EF4444', label: 'Bill Due' },
              { color: '#8B5CF6', label: 'Task' },
              { color: '#F59E0B', label: 'Group' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const UpcomingBills = () => (
    <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Upcoming Bills</h3>
        <button onClick={() => navigate('/bill-boss')} className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: '#6366F1', fontWeight: 600 }}>
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2.5">
        {upcomingBills.map((bill, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl transition-all" style={{ background: subtle, border: subtleBorder }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? '#2D1515' : '#FEF2F2' }}>
              <CreditCard className="w-4 h-4" style={{ color: '#EF4444' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ fontWeight: 600, color: txt }}>{bill.name}</div>
              <div className="text-xs" style={{ color: muted }}>{bill.category}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>−${bill.amount}</div>
              <div className="text-xs" style={{ color: muted }}>{bill.due} · {bill.daysAway}d</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs flex-shrink-0 hover:opacity-90 transition-all" style={{ background: '#6366F1', color: '#fff', fontWeight: 600 }}>Pay</button>
          </div>
        ))}
      </div>
    </div>
  );

  const CreditScore = () => (
    <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Credit Score</h3>
        <button onClick={() => navigate('/settings')} className="text-xs hover:opacity-80" style={{ color: '#6366F1' }}>Update</button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke={isDark ? '#334155' : '#F1F5F9'} strokeWidth="7" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#F59E0B" strokeWidth="7"
              strokeDasharray={`${(648 / 850) * 201} 201`} strokeLinecap="round" transform="rotate(-90 40 40)" />
            <text x="40" y="44" textAnchor="middle" fontSize="15" fontWeight="800" fill={txt}>648</text>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>Fair</div>
          <div className="text-xs mt-0.5" style={{ color: muted }}>34% utilization</div>
          <div className="text-xs mt-1" style={{ color: muted }}>Range: 300–850</div>
          <div className="mt-2 rounded-full overflow-hidden" style={{ height: 5, background: isDark ? '#334155' : '#F1F5F9', width: 120 }}>
            <div className="h-full rounded-full" style={{ width: `${(648 / 850) * 100}%`, background: 'linear-gradient(90deg, #EF4444, #F59E0B, #10B981)' }} />
          </div>
        </div>
      </div>
    </div>
  );

  const StackCircleWidget = () => (
    <div className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: card, border: cardBorder }} onClick={() => navigate('/stack-circle')}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#6366F1' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Stack Circle</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1', fontWeight: 600 }}>1 group</span>
      </div>
      <div className="space-y-2 text-sm">
        {[
          { label: 'Group', val: 'Vacation', color: txt },
          { label: 'Members', val: '1', color: txt },
          { label: 'Saved', val: '$0.00', color: '#10B981' },
          { label: 'Goal', val: '$6,000.00', color: '#6366F1' },
        ].map(r => (
          <div key={r.label} className="flex justify-between">
            <span style={{ color: muted }}>{r.label}</span>
            <span style={{ fontWeight: 600, color: r.color }}>{r.val}</span>
          </div>
        ))}
        <div className="mt-2 rounded-full overflow-hidden" style={{ height: 6, background: isDark ? '#334155' : '#F1F5F9' }}>
          <div className="h-full rounded-full" style={{ width: '0%', background: '#6366F1' }} />
        </div>
        <div className="text-xs" style={{ color: muted }}>0% · Trip: Mar 30 (2 days away)</div>
      </div>
    </div>
  );

  const UpcomingEvents = () => (
    <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4" style={{ color: '#F59E0B' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Upcoming</h3>
      </div>
      {[
        { icon: '🚗', label: 'Get car wash', date: 'Mar 30', type: 'task', color: '#FEF3C7', tc: '#D97706' },
        { icon: '✈️', label: 'Vacation', date: 'Mar 30', type: 'group', color: isDark ? '#1E1B4B' : '#EEF2FF', tc: '#6366F1' },
      ].map((ev, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i === 0 ? `1px solid ${isDark ? '#334155' : '#F1F5F9'}` : 'none' }}>
          <span style={{ fontSize: 18 }}>{ev.icon}</span>
          <div className="flex-1">
            <div className="text-sm" style={{ fontWeight: 600, color: txt }}>{ev.label}</div>
            <div className="text-xs" style={{ color: muted }}>{ev.date}</div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: ev.color, color: ev.tc, fontWeight: 600 }}>{ev.type}</span>
        </div>
      ))}
    </div>
  );

  const sectionMap: Record<SectionKey, { label: string; node: React.ReactNode }> = {
    metrics:  { label: 'Metric Cards',    node: <Metrics /> },
    calendar: { label: 'Calendar',        node: <CalendarSection /> },
    bills:    { label: 'Upcoming Bills',  node: <UpcomingBills /> },
    credit:   { label: 'Credit Score',   node: <CreditScore /> },
    circle:   { label: 'Stack Circle',   node: <StackCircleWidget /> },
    upcoming: { label: 'Upcoming Events', node: <UpcomingEvents /> },
  };

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 style={{ fontSize: 26, fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              Good afternoon, Bizzy 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Saturday, March 28, 2026 · Here's your financial snapshot
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate('/bill-boss')} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:opacity-90 transition-all" style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1', fontWeight: 600 }}>
              <Zap className="w-4 h-4" />Quick Pay
            </button>
          </div>
        </div>

        {/* Hero — Safe to Spend (pinned, not draggable) */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#fff' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <img src={orcaLogo} alt="ORCA" className="w-5 h-5 rounded-md object-cover opacity-80" />
                <span className="text-sm opacity-70">Safe to Spend</span>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>After bills & savings</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>$0.00</div>
              <div className="text-sm opacity-60 mt-1">$0.00 / day available</div>
              <div className="flex gap-2 mt-4">
                {['Daily', 'Weekly', 'Monthly'].map(v => (
                  <button key={v} className="px-3 py-1 rounded-lg text-xs transition-all"
                    style={{ background: v === 'Weekly' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', fontWeight: v === 'Weekly' ? 700 : 400 }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.12)', minWidth: 200 }}>
              <div className="text-xs opacity-60 uppercase tracking-widest mb-3" style={{ fontWeight: 700 }}>How it's calculated</div>
              <button
                onClick={() => navigate('/smart-stack')}
                className="w-full flex justify-between items-center text-sm rounded-lg px-1 py-0.5 transition-all hover:opacity-80 cursor-pointer"
                style={{ background: 'transparent' }}
                title="View incoming payments in Smart Stack"
              >
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} /><span className="opacity-80">Incoming payments</span></div>
                <span style={{ color: '#34D399', fontWeight: 700 }}>+$497.00 →</span>
              </button>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#F87171' }} /><span className="opacity-80">Bills Reserved</span></div>
                <span style={{ color: '#F87171', fontWeight: 700 }}>−$1,310.00</span>
              </div>
              <div className="pt-2 flex justify-between items-center text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontWeight: 700 }}>Safe to Spend</span>
                <span style={{ fontWeight: 800 }}>$0.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reorder hint */}
        <div className="flex items-center gap-2 text-xs" style={{ color: isDark ? '#475569' : '#CBD5E1' }}>
          <GripVertical className="w-3.5 h-3.5" />
          Drag the grip handle to reorder sections
        </div>

        {/* Draggable sections */}
        <div className="space-y-5">
          {sections.map((key, idx) => {
            const { label, node } = sectionMap[key];
            const isDragging = dragActive === idx;
            const isOver = dragOver === idx;
            return (
              <div
                key={key}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className="transition-all duration-150"
                style={{
                  opacity: isDragging ? 0.4 : 1,
                  transform: isOver && !isDragging ? 'scale(1.01)' : 'scale(1)',
                  outline: isOver && !isDragging ? `2px dashed #6366F1` : 'none',
                  borderRadius: 16,
                }}
              >
                {/* Drag handle row */}
                <div className="flex items-center gap-2 mb-1.5 px-1 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4" style={{ color: isDark ? '#475569' : '#CBD5E1' }} />
                  <span style={{ fontSize: 10, color: isDark ? '#475569' : '#CBD5E1', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                </div>
                {node}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}