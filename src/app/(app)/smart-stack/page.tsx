'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home, ExternalLink, Layers, ChevronLeft, ChevronRight,
  Wallet, BarChart3, Calculator, Clock,
  ChevronDown, ChevronUp, Car, Mic2, Palette, ArrowUpRight,
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, fmtD, daysTo, calcAlloc, calcIncome, f2w, pct, getPaycheckAmount } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { setLocalSynced } from '@/lib/syncLocal';
import CalendarPicker from '@/components/CalendarPicker';
import { useFinancialEngine } from '@/lib/financialEngine';
import { orcaEvents } from '@/lib/eventBus';
import { PageShell, PageHeader, Panel, PanelTitle, Stat, MiniStat, Bar, Button, RowMenu, MonthSwitcher, EmptyState, useField, Field, Sheet } from '@/components/ui/kit';
import { Segmented } from '@/components/layout/CustomizePanel';
import { useStreamColors } from '@/app/(app)/dashboard/widgets';
import { countedLyft, monthsWithTotal, isCovered, isMonthly } from '@/lib/lyft';

type Tab = 'income' | 'savings';

// Local calendar date / month for an ISO timestamp (avoids UTC rolling to the next day)
const localISODate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const localMonthKey = (iso: string) => localISODate(iso).slice(0, 7)
const CR_STATUS: Record<string, string> = {
  quote_requested: 'Quote requested', quoted: 'Quote sent', pending_payment: 'Awaiting payment', deposit_paid: 'Deposit paid',
  paid: 'Paid in full', scheduled: 'Scheduled', in_production: 'In production', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
}

interface Obligation {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  source: 'bill' | 'savings' | 'task';
}

interface IncomeRequirement {
  daily: number;
  weekly: number;
  total: number;
}

interface PaycheckEntry {
  id: string;
  date: string;
  grossAmount: number;
  billsAllocation: number;
  savingsAllocation: number;
  stackCircleAllocation: number;
  spendingAllocation: number;
  frequency: 'weekly' | 'biweekly';
}

interface DayOff {
  date: string;
  hoursPerDay?: number;
}

interface SavingsAccount {
  id: string;
  name: string;
  amount: number;
  goal: number;
  saved: boolean;
}

interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
  description: string;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  status?: 'expected' | 'received';
}

// ============== PROJECTION CALCULATOR COMPONENT ==============
function ProjectionCalculator({ theme }: { theme: any }) {
  const [goalAmount, setGoalAmount] = useState('')
  const [currentSaved, setCurrentSaved] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [timeUnit, setTimeUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months')
  const [result, setResult] = useState<{
    perWeek: number; perMonth: number; perDay: number
    projectedCompletionDate: string; requiredPace: string
  } | null>(null)

  const calculate = () => {
    const goal = parseFloat(goalAmount)
    const time = parseFloat(timeframe)
    if (!goal || !time || goal <= 0 || time <= 0) return

    const remaining = goal - (parseFloat(currentSaved) || 0)
    if (remaining <= 0) {
      setResult({ perWeek: 0, perMonth: 0, perDay: 0, projectedCompletionDate: 'Already reached!', requiredPace: '$0/day' })
      return
    }

    let totalWeeks = time
    if (timeUnit === 'days') totalWeeks = time / 7
    if (timeUnit === 'months') totalWeeks = time * 4.33
    if (timeUnit === 'years') totalWeeks = time * 52

    const perWeek = remaining / totalWeeks
    const perMonth = perWeek * 4.33
    const perDay = perWeek / 7

    // Required pace
    const requiredPace = perDay < 10
      ? `$${perDay.toFixed(2)}/day`
      : `$${perWeek.toFixed(2)}/week`

    // Projected completion date (based on required pace, from today)
    const totalDays = remaining / perDay
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + Math.ceil(totalDays))
    const projectedCompletionDate = completionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    setResult({ perWeek, perMonth, perDay, projectedCompletionDate, requiredPace })
  }

  return (
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.accent}20` }}>
          <Target size={20} style={{ color: theme.accent }} />
        </div>
        <div>
          <h3 style={{ color: theme.text }} className="font-bold text-base">Projection Calculator</h3>
          <p style={{ color: theme.textM }} className="text-xs">How much do you need to save?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label style={{ color: theme.textS }} className="block text-xs font-bold mb-1.5 uppercase tracking-wide">Goal Amount ($)</label>
          <input
            type="number"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="e.g. 5000"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          />
        </div>

        <div>
          <label style={{ color: theme.textS }} className="block text-xs font-bold mb-1.5 uppercase tracking-wide">How much do you have now? ($)</label>
          <input
            type="number"
            value={currentSaved}
            onChange={(e) => setCurrentSaved(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          />
        </div>

        <div>
          <label style={{ color: theme.textS }} className="block text-xs font-bold mb-1.5 uppercase tracking-wide">Timeframe &amp; Unit</label>
          <div className="flex gap-2">
            <input type="number" placeholder="e.g. 6" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none" style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }} />
            <select value={timeUnit} onChange={(e) => setTimeUnit(e.target.value as 'days' | 'weeks' | 'months' | 'years')}
              className="px-4 py-3 rounded-xl text-sm outline-none" style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={calculate}
          className="w-full py-2.5 rounded-xl font-bold text-sm"
          style={{
            backgroundColor: theme.accent,
            color: '#fff',
          }}
        >
          Calculate
        </motion.button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t space-y-3"
            style={{ borderColor: theme.border }}
          >
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              Based on your income and bills this month, you need to set aside:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${theme.accent}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Week</p>
                <p style={{ color: theme.accent }} className="text-lg font-bold">{fmt(result.perWeek)}</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${theme.accent}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Day</p>
                <p style={{ color: theme.accent }} className="text-lg font-bold">{fmt(result.perDay)}</p>
              </div>
            </div>
            {/* Projected completion date */}
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: theme.textS }}>Required Pace</span>
                <span className="text-sm font-bold" style={{ color: '#10B981' }}>{result.requiredPace}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: theme.textS }}>Projected Completion</span>
                <span className="text-sm font-bold" style={{ color: '#10B981' }}>{result.projectedCompletionDate}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function SmartStackPage() {
  const { theme, isDark } = useTheme();
  const { data, setData, loading } = useOrcaData();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'savings') return 'savings';
    }
    return 'income';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'savings') setActiveTab('savings');
    else if (tab === 'income') setActiveTab('income');
  }, [searchParams]);

  // Load income source data
  useEffect(() => {
    try { const ls = localStorage.getItem('orca-lyft-sessions'); if (ls) setLyftSessions(JSON.parse(ls)) } catch {}
    try { const dj = localStorage.getItem('orca-dj-gigs'); if (dj) setDjGigs(JSON.parse(dj)) } catch {}
    try { const biz = localStorage.getItem('orca-bizzplug-clients'); if (biz) setBizzplugClients(JSON.parse(biz)) } catch {}
    fetch('/api/crookedrumors/summary', { cache: 'no-store' })
      .then(async r => {
        if (r.status === 401) { setCrState('denied'); return }
        if (!r.ok) { setCrState('error'); return }
        const d = await r.json()
        setCrData({ bookings: d.bookings || [], payments: d.payments || [] })
        setCrState('ok')
      })
      .catch(() => setCrState('error'))
  }, [])

  const [budgetLocked, setBudgetLocked] = useState(false);
  const [paycheckHistory, setPaycheckHistory] = useState<PaycheckEntry[]>([]);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('biweekly');
  const [creditScore, setCreditScore] = useState(720);
  const [creditScoreSim, setCreditScoreSim] = useState(720);
  const [selectedObligations, setSelectedObligations] = useState<string[]>([]);
  const [selfEmployedIncome, setSelfEmployedIncome] = useState(0);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [forecastedIncome, setForecastedIncome] = useState<any[]>([]);
  const [currentSavingsAmount, setCurrentSavingsAmount] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-savings-accounts');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [newAccountName, setNewAccountName] = useState('');
  const [projectionMode, setProjectionMode] = useState<'lyft' | 'dj' | 'bizzplug' | 'crooked'>('lyft');

  // ── Income source data from localStorage ──
  const [lyftSessions, setLyftSessions] = useState<{id:string;date:string;earnings:number;trips:number;miles?:number;gasExpense?:number;period?:'week'|'month'}[]>([])
  const [lyftAddPeriod, setLyftAddPeriod] = useState<'week' | 'month'>('week')
  const [lyftAddMonth, setLyftAddMonth] = useState('')
  // Crooked Rumor bookings and Stripe payments (read only, from the server)
  const [crData, setCrData] = useState<{ bookings: { id: string; ref: string; status: string; package_name: string | null; client_name: string; project_date: string | null; total_cents: number; amount_paid_cents: number; created_at: string }[]; payments: { booking_id: string; amount_cents: number; created_at: string }[] } | null>(null)
  const [crState, setCrState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading')
  const [lyftFormExpanded, setLyftFormExpanded] = useState(false)
  const [lyftAddDate, setLyftAddDate] = useState('')
  const [lyftAddEarnings, setLyftAddEarnings] = useState('')
  const [lyftAddTrips, setLyftAddTrips] = useState('')
  const [lyftAddMiles, setLyftAddMiles] = useState('')
  const [lyftAddGas, setLyftAddGas] = useState('')
  const [lyftEditId, setLyftEditId] = useState<string | null>(null)
  const [lyftEditEarnings, setLyftEditEarnings] = useState('')
  const [djGigs, setDjGigs] = useState<{id:string;date:string;clientName?:string;eventType?:string;contractAmount?:number;fee?:number;depositPaid?:boolean;depositAmount?:number;partialPayments?:{amount:number}[];status:string}[]>([])
  const [bizzplugClients, setBizzplugClients] = useState<{id:string;quote:number;paid:number;status:string}[]>([])
  const [metricsMonth, setMetricsMonth] = useState(new Date().getMonth())
  const [metricsYear, setMetricsYear] = useState(new Date().getFullYear())
  const [summaryAllTime, setSummaryAllTime] = useState(false)
  const [customAddAmounts, setCustomAddAmounts] = useState<Record<string, string>>({});
  const [collapsedAccounts, setCollapsedAccounts] = useState<Record<string, boolean>>({});
  const [scheduledPaymentsCollapsed, setScheduledPaymentsCollapsed] = useState(false);

  const [customSavingsAmount, setCustomSavingsAmount] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('orca-splitter-savings') || '' } catch {}
    }
    return '';
  });
  const [customSpendingCash, setCustomSpendingCash] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('orca-splitter-spending') || '' } catch {}
    }
    return '';
  });

  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-payment-entries');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentDesc, setNewPaymentDesc] = useState('');
  const [newPaymentRecurrence, setNewPaymentRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const savingsSectionRef = useRef<HTMLDivElement>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState('');
  const [editingPaymentDate, setEditingPaymentDate] = useState('');
  const [editingPaymentDesc, setEditingPaymentDesc] = useState('');
  const [editingPaymentRecurrence, setEditingPaymentRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');

  const startEditingPayment = (p: PaymentEntry) => {
    setEditingPaymentId(p.id);
    setEditingPaymentAmount(String(p.amount));
    setEditingPaymentDate(p.date);
    setEditingPaymentDesc(p.description);
    setEditingPaymentRecurrence(p.recurrence || 'none');
  };

  const saveEditingPayment = () => {
    if (!editingPaymentId) return;
    const amt = parseFloat(editingPaymentAmount);
    if (!amt || !editingPaymentDate) return;
    const updated = paymentEntries.map(pe =>
      pe.id === editingPaymentId
        ? { ...pe, amount: amt, date: editingPaymentDate, description: editingPaymentDesc, recurrence: editingPaymentRecurrence }
        : pe
    );
    setPaymentEntries(updated);
    setLocalSynced('orca-payment-entries', JSON.stringify(updated));
    setEditingPaymentId(null);
  };

  const [customHours, setCustomHours] = useState<Record<string, number>>({});
  const [editingHoursDay, setEditingHoursDay] = useState<string | null>(null);
  const [editingHoursValue, setEditingHoursValue] = useState('');

  const netIncome = data.user?.netIncome || 0;
  const [inlineNetIncome, setInlineNetIncome] = useState(String(netIncome || ''));

  // ── Canonical Financial Engine ──
  const engine = useFinancialEngine({
    incomeSources: data.income || [],
    bills: data.bills || [],
    savingsGoals: data.goals || [],
    accountSettings: {
      balance: data.user?.checkingBalance || 0,
      buffer: data.user?.safeToSpendBuffer || 0,
    },
  })

  const [inlinePayDate, setInlinePayDate] = useState('');
  const hasNetIncome = (parseFloat(inlineNetIncome) || netIncome) > 0;

  const handleNetIncomeChange = (val: string) => {
    setInlineNetIncome(val);
  };

  const [customPeriodStart, setCustomPeriodStart] = useState('');
  const [customPeriodEnd, setCustomPeriodEnd] = useState('');

  const [weekendWorkDays, setWeekendWorkDays] = useState<string[]>([]);

  const handleBudgetLock = () => {
    if (!budgetLocked) {
      const billsTotal = (data.bills || []).reduce((sum: number, bill: any) => sum + bill.amount, 0);
      const savingsTotal = (data.goals || []).reduce((sum: number, goal: any) => sum + (goal.target / 52), 0);
      const stackCircleTotal = (data.groups || []).reduce((sum: number, group: any) => sum + group.current, 0);
      const spendingTotal = checkAmount - billsTotal - savingsTotal - stackCircleTotal;

      const newEntry: PaycheckEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        grossAmount: checkAmount,
        billsAllocation: billsTotal,
        savingsAllocation: savingsTotal,
        stackCircleAllocation: stackCircleTotal,
        spendingAllocation: Math.max(0, spendingTotal),
        frequency,
      };

      setPaycheckHistory([newEntry, ...paycheckHistory.slice(0, 11)]);

      const forecasted = Array.from({ length: 12 }).map((_, i) => ({
        month: i,
        amount: checkAmount,
        frequency,
      }));
      setForecastedIncome(forecasted);
      setBudgetLocked(true);
    } else {
      setBudgetLocked(false);
    }
  };

  const obligations = useMemo<Obligation[]>(() => {
    const obs: Obligation[] = [];

    if (data.bills) {
      data.bills.forEach((bill: any, idx: number) => {
        obs.push({
          id: `bill-${idx}`,
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.due || new Date().toISOString().split('T')[0],
          source: 'bill',
        });
      });
    }

    if (data.goals) {
      data.goals.forEach((goal: any, idx: number) => {
        obs.push({
          id: `goal-${idx}`,
          name: goal.name,
          amount: goal.target,
          dueDate: goal.date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'savings',
        });
      });
    }

    return obs;
  }, [data]);

  const incomeRequirements = useMemo<IncomeRequirement>(() => {
    if (selectedObligations.length === 0) {
      return { daily: 0, weekly: 0, total: 0 };
    }

    const today = new Date();
    let totalRequired = 0;

    selectedObligations.forEach((obligationId) => {
      const obligation = obligations.find((o) => o.id === obligationId);
      if (!obligation) return;

      const dueDate = new Date(obligation.dueDate);
      const daysUntilDue = Math.max(1, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      totalRequired += obligation.amount / daysUntilDue;
    });

    const dailyRequired = totalRequired;
    const weeklyRequired = dailyRequired * 7;

    return {
      daily: dailyRequired,
      weekly: weeklyRequired,
      total: totalRequired,
    };
  }, [selectedObligations, obligations]);

  const [projFreq, setProjFreq] = useState<'weekly' | 'biweekly'>('biweekly');
  const [projPeriodIndex, setProjPeriodIndex] = useState(0);
  const [payMonthOffset, setPayMonthOffset] = useState(0); // 0 = current month

  const payPeriods = useMemo(() => {
    const today = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];
    const periodDays = projFreq === 'weekly' ? 7 : 14;

    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + mondayOffset);

    for (let i = -2; i <= 2; i++) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() + i * periodDays);
      const end = new Date(start);
      end.setDate(start.getDate() + periodDays - 1);

      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      periods.push({ start, end, label: `${startStr} – ${endStr}` });
    }
    return periods;
  }, [projFreq]);

  const currentPeriod = payPeriods[projPeriodIndex + 2] || payPeriods[2];

  const effectivePeriod = useMemo(() => {
    if (customPeriodStart && customPeriodEnd) {
      return {
        start: new Date(customPeriodStart + 'T00:00:00'),
        end: new Date(customPeriodEnd + 'T00:00:00'),
        label: `${new Date(customPeriodStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(customPeriodEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    }
    return currentPeriod;
  }, [customPeriodStart, customPeriodEnd, currentPeriod]);

  const effectiveNetIncome = parseFloat(inlineNetIncome) || netIncome;

  const projectedCheckAmount = useMemo(() => {
    if (!effectiveNetIncome || effectiveNetIncome <= 0) return 0;
    if (!effectivePeriod) return effectiveNetIncome;

    let totalScheduledHours = 0;
    let actualWorkHours = 0;
    const d = new Date(effectivePeriod.start);
    while (d <= effectivePeriod.end) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
      const isWeekendWork = isWknd && weekendWorkDays.includes(dateStr);

      if (!isWknd || isWeekendWork) {
        totalScheduledHours += 8; // baseline 8h per scheduled day
        if (!daysOff.some((off) => off.date === dateStr)) {
          actualWorkHours += customHours[dateStr] || 8;
        }
      }
      d.setDate(d.getDate() + 1);
    }

    if (totalScheduledHours === 0) return effectiveNetIncome;
    return effectiveNetIncome * (actualWorkHours / totalScheduledHours);
  }, [effectiveNetIncome, effectivePeriod, daysOff, weekendWorkDays, customHours]);

  const checkAmount = projectedCheckAmount;

  // ── Consolidated income totals across all income sources ──
  const lyftCounted = useMemo(() => countedLyft(lyftSessions), [lyftSessions])
  const lyftCovered = useMemo(() => monthsWithTotal(lyftSessions), [lyftSessions])
  const lyftGross = useMemo(() => lyftCounted.reduce((s, sess) => s + (sess.earnings || 0), 0), [lyftCounted])
  const lyftGas = useMemo(() => lyftCounted.reduce((s, sess) => s + (sess.gasExpense || 0), 0), [lyftCounted])
  const lyftNet = useMemo(() => lyftGross - lyftGas, [lyftGross, lyftGas])
  const lyftTrips = useMemo(() => lyftCounted.reduce((s, sess) => s + (sess.trips || 0), 0), [lyftCounted])

  const djEarned = useMemo(() => djGigs.reduce((s, gig) => {
    const deposit = gig.depositPaid ? (gig.depositAmount || 0) : 0
    const partials = (gig.partialPayments || []).reduce((sp, p) => sp + p.amount, 0)
    return s + deposit + partials
  }, 0), [djGigs])
  const djBooked = useMemo(() => djGigs
    .filter(g => ['confirmed', 'pending', 'inquiry'].includes(g.status))
    .reduce((s, gig) => s + (gig.contractAmount || gig.fee || 0), 0), [djGigs])
  const djUpcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return djGigs.filter(g => g.date >= today && g.status !== 'cancelled').length
  }, [djGigs])

  const bizzplugEarned = useMemo(() => bizzplugClients.reduce((s, c) => s + (c.paid || 0), 0), [bizzplugClients])
  const bizzplugPending = useMemo(() => bizzplugClients.reduce((s, c) => s + Math.max(0, (c.quote || 0) - (c.paid || 0)), 0), [bizzplugClients])

  const crEarned = useMemo(() => (crData?.payments || []).reduce((s, p) => s + (p.amount_cents || 0), 0) / 100, [crData])
  const totalIncome = lyftNet + djEarned + bizzplugEarned + crEarned

  // ── Metrics month navigation (Lyft / DJ / BizzyPlug metrics reset each month, like Bill Boss) ──
  const handleMetricsMonthChange = (dir: number) => {
    let m = metricsMonth + dir
    let y = metricsYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMetricsMonth(m)
    setMetricsYear(y)
  }
  const metricsMonthKey = useMemo(() => `${metricsYear}-${String(metricsMonth + 1).padStart(2, '0')}`, [metricsMonth, metricsYear])

  // Every entry in the month (for the list) and the ones that count (for totals)
  const lyftEntriesMonth = useMemo(() => lyftSessions.filter(s => (s.date || '').startsWith(metricsMonthKey)), [lyftSessions, metricsMonthKey])
  const lyftSessionsMonth = useMemo(() => lyftCounted.filter(s => (s.date || '').startsWith(metricsMonthKey)), [lyftCounted, metricsMonthKey])
  const lyftGrossMonth = useMemo(() => lyftSessionsMonth.reduce((s, sess) => s + (sess.earnings || 0), 0), [lyftSessionsMonth])
  const lyftGasMonth = useMemo(() => lyftSessionsMonth.reduce((s, sess) => s + (sess.gasExpense || 0), 0), [lyftSessionsMonth])
  const lyftNetMonth = useMemo(() => lyftGrossMonth - lyftGasMonth, [lyftGrossMonth, lyftGasMonth])
  const lyftTripsMonth = useMemo(() => lyftSessionsMonth.reduce((s, sess) => s + (sess.trips || 0), 0), [lyftSessionsMonth])

  const djGigsMonth = useMemo(() => djGigs.filter(g => (g.date || '').startsWith(metricsMonthKey)), [djGigs, metricsMonthKey])
  const djEarnedMonth = useMemo(() => djGigsMonth.reduce((s, gig) => {
    const deposit = gig.depositPaid ? (gig.depositAmount || 0) : 0
    const partials = (gig.partialPayments || []).reduce((sp, p) => sp + p.amount, 0)
    return s + deposit + partials
  }, 0), [djGigsMonth])
  const djBookedMonth = useMemo(() => djGigsMonth
    .filter(g => ['confirmed', 'pending', 'inquiry'].includes(g.status))
    .reduce((s, gig) => s + (gig.contractAmount || gig.fee || 0), 0), [djGigsMonth])
  const djUpcomingMonth = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return djGigsMonth.filter(g => g.date >= today && g.status !== 'cancelled').length
  }, [djGigsMonth])

  const bizzplugClientsMonth = useMemo(() => bizzplugClients.filter((c: any) => ((c.paidDate || c.createdAt || '') as string).startsWith(metricsMonthKey)), [bizzplugClients, metricsMonthKey])
  const bizzplugEarnedMonth = useMemo(() => bizzplugClientsMonth.reduce((s: number, c: any) => s + (c.paid || 0), 0), [bizzplugClientsMonth])
  const bizzplugPendingMonth = useMemo(() => bizzplugClientsMonth.reduce((s: number, c: any) => s + Math.max(0, (c.quote || 0) - (c.paid || 0)), 0), [bizzplugClientsMonth])

  // Crooked Rumor: money in = Stripe payments received this month; booked = bookings whose shoot is this month
  const crPaymentsMonth = useMemo(() => (crData?.payments || []).filter(p => localMonthKey(p.created_at) === metricsMonthKey), [crData, metricsMonthKey])
  const crEarnedMonth = useMemo(() => crPaymentsMonth.reduce((s, p) => s + (p.amount_cents || 0), 0) / 100, [crPaymentsMonth])
  const crBookingsMonth = useMemo(() => (crData?.bookings || []).filter(b => b.status !== 'cancelled' && (b.project_date || localISODate(b.created_at)).startsWith(metricsMonthKey)), [crData, metricsMonthKey])
  const crBookedMonth = useMemo(() => crBookingsMonth.reduce((s, b) => s + (b.total_cents || 0), 0) / 100, [crBookingsMonth])
  const crOwed = useMemo(() => (crData?.bookings || []).filter(b => b.status !== 'cancelled' && b.total_cents > 0).reduce((s, b) => s + Math.max(0, b.total_cents - (b.amount_paid_cents || 0)), 0) / 100, [crData])
  const totalIncomeMonth = lyftNetMonth + djEarnedMonth + bizzplugEarnedMonth + crEarnedMonth

  // ── Financial Summary Banner data — All Time or scoped to the selected month ──
  const summaryLyftNet = summaryAllTime ? lyftNet : lyftNetMonth
  const summaryLyftTrips = summaryAllTime ? lyftTrips : lyftTripsMonth
  const summaryLyftSessions = summaryAllTime ? lyftCounted : lyftSessionsMonth
  const summaryCrEarned = summaryAllTime ? crEarned : crEarnedMonth
  const summaryCrPayments = summaryAllTime ? (crData?.payments || []).length : crPaymentsMonth.length
  const summaryDjEarned = summaryAllTime ? djEarned : djEarnedMonth
  const summaryDjGigs = summaryAllTime ? djGigs : djGigsMonth
  const summaryBizzplugEarned = summaryAllTime ? bizzplugEarned : bizzplugEarnedMonth
  const summaryBizzplugClients = summaryAllTime ? bizzplugClients : bizzplugClientsMonth
  const summaryTotalIncome = summaryAllTime ? totalIncome : totalIncomeMonth

  // Live summary totals — recompute any time income sources or savings change
  const summaryTotals = useMemo(() => {
    const totalSavings = savingsAccounts.reduce((sum, a) => sum + (a.amount || 0), 0);
    return { totalIncome, totalSavings };
  }, [totalIncome, savingsAccounts]);

  // Duplicate checks for the Log sheet
  const lyftDupWeek = lyftAddPeriod === 'week' && !!lyftAddDate && lyftSessions.some(x => !isMonthly(x) && x.date === lyftAddDate)
  const lyftDupMonth = lyftAddPeriod === 'month' && !!lyftAddMonth && lyftSessions.some(x => isMonthly(x) && x.date.slice(0, 7) === lyftAddMonth)
  const lyftWeeksInAddMonth = lyftAddPeriod === 'month' && lyftAddMonth ? lyftSessions.filter(x => !isMonthly(x) && x.date.slice(0, 7) === lyftAddMonth) : []
  const lyftWeekInCoveredMonth = lyftAddPeriod === 'week' && !!lyftAddDate && lyftCovered.has(lyftAddDate.slice(0, 7))
  const lyftCanSave = !!parseFloat(lyftAddEarnings) && (lyftAddPeriod === 'week' ? !!lyftAddDate && !lyftDupWeek : !!lyftAddMonth && !lyftDupMonth)

  const openLyftLog = (period: 'week' | 'month' = 'week') => {
    setLyftAddPeriod(period)
    setLyftAddDate(localISODate(new Date().toISOString()))
    setLyftAddMonth(metricsMonthKey)
    setLyftAddEarnings('')
    setLyftFormExpanded(true)
  }

  const addLyftSession = () => {
    const earnings = parseFloat(lyftAddEarnings)
    if (!lyftCanSave || !earnings) return
    const newSession = lyftAddPeriod === 'month'
      ? { id: Date.now().toString(), date: `${lyftAddMonth}-01`, earnings, trips: 0, period: 'month' as const }
      : { id: Date.now().toString(), date: lyftAddDate, earnings, trips: 0, period: 'week' as const }
    const updated = [...lyftSessions, newSession]
    setLyftSessions(updated)
    try { setLocalSynced('orca-lyft-sessions', JSON.stringify(updated)) } catch {}
    setLyftAddDate('')
    setLyftAddEarnings('')
    setLyftAddTrips('')
    setLyftAddMiles('')
    setLyftAddGas('')
    setLyftFormExpanded(false)
  }

  const updateLyftSession = () => {
    if (!lyftEditId) return
    const earnings = parseFloat(lyftEditEarnings)
    if (isNaN(earnings) || earnings <= 0) return
    const updated = lyftSessions.map(s => s.id === lyftEditId ? { ...s, earnings } : s)
    setLyftSessions(updated)
    try { setLocalSynced('orca-lyft-sessions', JSON.stringify(updated)) } catch {}
    setLyftEditId(null)
    setLyftEditEarnings('')
  }

  const deleteLyftSession = (id: string) => {
    const updated = lyftSessions.filter(s => s.id !== id)
    setLyftSessions(updated)
    try { setLocalSynced('orca-lyft-sessions', JSON.stringify(updated)) } catch {}
    if (lyftEditId === id) { setLyftEditId(null); setLyftEditEarnings('') }
  }

  const renderCheckProjectionWithCalendar = () => {
    const period = effectivePeriod;
    if (!period) return null;

    const days: Date[] = [];
    const d = new Date(period.start);
    while (d <= period.end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    const paddedDays: (Date | null)[] = [];
    const firstDay = days[0].getDay();
    for (let i = 0; i < firstDay; i++) paddedDays.push(null);
    days.forEach(day => paddedDays.push(day));

    const toggleDayOff = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWknd) {
        const isMarkedWorking = weekendWorkDays.includes(dateStr);
        const isMarkedOff = daysOff.some((d) => d.date === dateStr);

        if (!isMarkedWorking && !isMarkedOff) {
          setWeekendWorkDays(prev => [...prev, dateStr]);
        } else if (isMarkedWorking && !isMarkedOff) {
          setWeekendWorkDays(prev => prev.filter(d => d !== dateStr));
        }
      } else {
        setDaysOff((prev) => {
          const exists = prev.find((d) => d.date === dateStr);
          if (exists) {
            return prev.filter((d) => d.date !== dateStr);
          } else {
            return [...prev, { date: dateStr }];
          }
        });
      }
    };

    const isDayOff = (date: Date | null) => {
      if (!date) return false;
      const dateStr = date.toISOString().split('T')[0];
      return daysOff.some((d) => d.date === dateStr);
    };

    const isWeekend = (date: Date | null) => {
      if (!date) return false;
      const day = date.getDay();
      return day === 0 || day === 6;
    };

    const isWeekendWorking = (date: Date | null) => {
      if (!date) return false;
      const dateStr = date.toISOString().split('T')[0];
      return weekendWorkDays.includes(dateStr);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-2xl p-4 sm:p-5 overflow-hidden w-full"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.accent}20` }}>
            <BarChart3 size={20} style={{ color: theme.accent }} />
          </div>
          <div>
            <h3 style={{ color: theme.text }} className="text-base font-bold">Check Projector</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-xl p-4 space-y-2">
            <p style={{ color: theme.textS }} className="text-xs font-bold uppercase tracking-wide">Net Income</p>
            <div className="relative">
              <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <input
                type="number"
                value={inlineNetIncome}
                onChange={(e) => handleNetIncomeChange(e.target.value)}
                placeholder="e.g., 3820"
                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm font-semibold outline-none"
              />
            </div>
            <p style={{ color: theme.textM }} className="text-xs">Your take-home pay per pay period</p>
          </div>

          <div>
            <p style={{ color: theme.textS }} className="text-xs font-bold uppercase tracking-wide mb-2">Frequency</p>
            <div className="flex gap-2 rounded-2xl p-1" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
              <button
                onClick={() => setProjFreq('weekly')}
                className="flex-1 py-3 rounded-2xl text-sm transition-all font-bold"
                style={{
                  backgroundColor: projFreq === 'weekly' ? theme.accent : 'transparent',
                  color: projFreq === 'weekly' ? '#fff' : theme.accent,
                }}
              >
                Weekly
              </button>
              <button
                onClick={() => setProjFreq('biweekly')}
                className="flex-1 py-3 rounded-2xl text-sm transition-all font-bold"
                style={{
                  backgroundColor: projFreq === 'biweekly' ? theme.accent : 'transparent',
                  color: projFreq === 'biweekly' ? '#fff' : theme.accent,
                }}
              >
                Bi-Weekly
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-full">
            <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 flex-wrap max-w-full" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent, border: `1px solid ${theme.accent}` }}>
              <span>📅</span>
              <span className="truncate">{effectivePeriod.label}</span>
              <span className="px-1.5 py-0.5 rounded text-xs whitespace-nowrap" style={{ background: theme.accent, color: '#fff', fontWeight: 700 }}>Current</span>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
            <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom Pay Period (Optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs mb-1" style={{ color: theme.textM }}>Start Date</label>
                <input type="date" value={customPeriodStart} onChange={(e) => setCustomPeriodStart(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none box-border" style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }} />
              </div>
              <div className="min-w-0">
                <label className="block text-xs mb-1" style={{ color: theme.textM }}>Last Date</label>
                <input type="date" value={customPeriodEnd} onChange={(e) => setCustomPeriodEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm outline-none box-border" style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pay Period Calendar</div>
              <div className="text-xs" style={{ color: theme.textM }}>Click to mark days off</div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs py-1" style={{ color: theme.textM, fontWeight: 600 }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: Math.ceil(paddedDays.length / 7) }).map((_, week) =>
                paddedDays.slice(week * 7, (week + 1) * 7).map((day, dayIdx) => {
                  const off = day && isDayOff(day);
                  const wk = day && isWeekend(day);
                  const wkWork = day && isWeekendWorking(day);
                  const dateStr = day?.toISOString().split('T')[0];
                  const dayHours = dateStr && !off ? (customHours[dateStr] || 8) : null;

                  return (
                    <button
                      key={`${week}-${dayIdx}`}
                      onClick={() => day && toggleDayOff(day)}
                      className="flex flex-col items-center justify-center rounded-xl transition-all"
                      style={{
                        height: 52,
                        backgroundColor: day ? (off ? (theme.bg) : wk ? (theme.bg) : `${theme.accent}20`) : 'transparent',
                        border: day ? `1px solid ${off ? theme.border : wk ? theme.border : theme.accent}` : 'none',
                        opacity: day && wk && !wkWork ? 0.5 : 1,
                        cursor: day && (wk && !wkWork) ? 'default' : day ? 'pointer' : 'default',
                      }}
                    >
                      {day && (
                        <>
                          <span className="text-xs" style={{ color: theme.textM, fontWeight: 500 }}>{day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: off ? theme.textM : wk ? theme.textM : theme.accent }}>
                            {day.getDate()}
                          </span>
                          {!wk && !off && dayHours && (
                            <span className="text-xs" style={{ color: theme.accent, fontSize: 9 }}>{dayHours}h</span>
                          )}
                          {!wk && (
                            <span className="text-xs" style={{ color: off ? theme.textM : theme.accent, fontSize: 9 }}>{off ? 'off' : dayHours ? '' : 'on'}</span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Work Summary */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(() => {
              let totalDays = 0;
              let workingDays = 0;
              let offDays = 0;
              let totalHours = 0;
              const d2 = new Date(effectivePeriod.start);
              while (d2 <= effectivePeriod.end) {
                const dateStr2 = d2.toISOString().split('T')[0];
                const dayOfWeek2 = d2.getDay();
                const isWknd2 = dayOfWeek2 === 0 || dayOfWeek2 === 6;
                const isWkndWork2 = weekendWorkDays.includes(dateStr2);
                if (!isWknd2 || isWkndWork2) {
                  totalDays++;
                  if (!daysOff.some(off => off.date === dateStr2)) {
                    workingDays++;
                    totalHours += customHours[dateStr2] || 8;
                  } else {
                    offDays++;
                  }
                }
                d2.setDate(d2.getDate() + 1);
              }
              return (
                <>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="text-xs" style={{ color: theme.textM }}>Period Days</div>
                    <div className="text-lg font-bold" style={{ color: theme.accent }}>{totalDays}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="text-xs" style={{ color: theme.textM }}>Working</div>
                    <div className="text-lg font-bold" style={{ color: '#10B981' }}>{workingDays}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="text-xs" style={{ color: theme.textM }}>Days Off</div>
                    <div className="text-lg font-bold" style={{ color: '#EF4444' }}>{offDays}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    <div className="text-xs" style={{ color: theme.textM }}>Total Hours</div>
                    <div className="text-lg font-bold" style={{ color: theme.accent }}>{totalHours}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Hours Per Day Editor */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hours Per Day</div>
              <div className="text-xs" style={{ color: theme.textM }}>Default: 8h · Click to edit</div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(() => {
                const workDaysList: { date: Date; dateStr: string }[] = [];
                const d3 = new Date(effectivePeriod.start);
                while (d3 <= effectivePeriod.end) {
                  const dateStr3 = d3.toISOString().split('T')[0];
                  const dayOfWeek3 = d3.getDay();
                  const isWknd3 = dayOfWeek3 === 0 || dayOfWeek3 === 6;
                  const isWkndWork3 = weekendWorkDays.includes(dateStr3);
                  if ((!isWknd3 || isWkndWork3) && !daysOff.some(off => off.date === dateStr3)) {
                    workDaysList.push({ date: new Date(d3), dateStr: dateStr3 });
                  }
                  d3.setDate(d3.getDate() + 1);
                }
                return workDaysList.map(({ date: wd, dateStr: wds }) => (
                  <div key={wds} className="rounded-xl p-2 text-center cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}
                    onClick={() => { setEditingHoursDay(editingHoursDay === wds ? null : wds); setEditingHoursValue(String(customHours[wds] || 8)); }}
                  >
                    <div className="text-xs" style={{ color: theme.textM }}>{wd.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-xs" style={{ color: theme.textM }}>{wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    {editingHoursDay === wds ? (
                      <input
                        type="number"
                        value={editingHoursValue}
                        onChange={(e) => setEditingHoursValue(e.target.value)}
                        onBlur={() => {
                          const hrs = parseFloat(editingHoursValue);
                          if (!isNaN(hrs) && hrs >= 0 && hrs <= 24) {
                            setCustomHours(prev => ({ ...prev, [wds]: hrs }));
                          }
                          setEditingHoursDay(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const hrs = parseFloat(editingHoursValue);
                            if (!isNaN(hrs) && hrs >= 0 && hrs <= 24) {
                              setCustomHours(prev => ({ ...prev, [wds]: hrs }));
                            }
                            setEditingHoursDay(null);
                          }
                        }}
                        className="w-full text-center text-sm font-bold mt-1 rounded-lg px-1 py-0.5 outline-none"
                        style={{ backgroundColor: theme.card, color: theme.accent, border: `1px solid ${theme.accent}` }}
                        autoFocus
                        min="0"
                        max="24"
                        step="0.5"
                      />
                    ) : (
                      <div className="text-sm font-bold mt-1" style={{ color: theme.accent }}>{customHours[wds] || 8}h</div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
            <div className="text-xs mb-1" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projected Check Amount</div>
            <div className="text-2xl sm:text-[32px] break-words" style={{ fontWeight: 900, color: theme.accent }}>${projectedCheckAmount.toFixed(2)}</div>
            <div className="text-xs mt-1 break-words" style={{ color: theme.textM }}>
              Based on ${effectiveNetIncome.toFixed(2)} net income · {(() => {
                let wd = 0;
                let th = 0;
                const d4 = new Date(effectivePeriod.start);
                while (d4 <= effectivePeriod.end) {
                  const ds = d4.toISOString().split('T')[0];
                  const dow = d4.getDay();
                  const isW = dow === 0 || dow === 6;
                  const isWW = weekendWorkDays.includes(ds);
                  if ((!isW || isWW) && !daysOff.some(o => o.date === ds)) {
                    wd++;
                    th += customHours[ds] || 8;
                  }
                  d4.setDate(d4.getDate() + 1);
                }
                return `${wd} work days · ${th}h total`;
              })()}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Incoming Payments: hidden before the 2026-11 redesign (it was wrapped in
  // `false &&`). Kept intact and uncalled so the feature can be restored.
  const renderIncomingPaymentsHidden = () => (
          <motion.div ref={paymentSectionRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-4 sm:p-5 overflow-hidden w-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.accent}20` }}>
                <Wallet className="w-5 h-5" style={{ color: theme.accent }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Incoming Payments</h2>
                <p className="text-xs" style={{ color: theme.textM }}>Track expected income</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
              <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Add Next Payment / Paycheck</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="relative min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                  <input type="number" placeholder="Amount" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none box-border" style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }} />
                </div>
                <div className="min-w-0">
                  <input type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none box-border" style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }} />
                </div>
              </div>
              <input type="text" placeholder="Description (e.g., Paycheck, Client Invoice)" value={newPaymentDesc} onChange={e => setNewPaymentDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-3" style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }} />
              <div className="mb-3">
                <div className="text-xs mb-2" style={{ color: theme.textM, fontWeight: 600 }}>Recurrence</div>
                <div className="flex gap-2 flex-wrap">
                  {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
                    <button key={r} onClick={() => setNewPaymentRecurrence(r)}
                      className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                      style={{ backgroundColor: newPaymentRecurrence === r ? theme.accent : (theme.border), color: newPaymentRecurrence === r ? '#fff' : theme.textM, fontWeight: newPaymentRecurrence === r ? 700 : 400 }}>
                      {r.replace('-', '‑')}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const amt = parseFloat(newPaymentAmount);
                  if (!amt || !newPaymentDate) return;
                  const newEntry: PaymentEntry = {
                    id: Date.now().toString(),
                    amount: amt,
                    date: newPaymentDate,
                    description: newPaymentDesc || 'Payment',
                    recurrence: newPaymentRecurrence,
                    status: 'expected',
                  };
                  const updated = [...paymentEntries, newEntry];
                  setPaymentEntries(updated);
                  setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                  setNewPaymentAmount('');
                  setNewPaymentDate('');
                  setNewPaymentDesc('');
                  setNewPaymentRecurrence('none');
                }}
                className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all font-bold"
                style={{ backgroundColor: theme.accent, color: '#fff' }}>
                <Plus className="w-4 h-4" />Add Payment
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-xs" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled Payments</div>
                {paymentEntries.length > 0 && (
                  <div className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                    {paymentEntries.length} total
                  </div>
                )}
              </div>
              <button
                onClick={() => setScheduledPaymentsCollapsed(c => !c)}
                className="p-1 rounded-lg transition-colors hover:opacity-70"
                style={{ color: theme.textM }}
                title={scheduledPaymentsCollapsed ? 'Expand' : 'Minimize'}
              >
                {scheduledPaymentsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
            {!scheduledPaymentsCollapsed && paymentEntries.length === 0 && (
              <div className="text-sm py-4 text-center" style={{ color: theme.textM }}>No payments scheduled yet</div>
            )}
            {!scheduledPaymentsCollapsed && paymentEntries.length > 0 && paymentEntries.map(p => {
                const pDate = p.date ? new Date(p.date + 'T00:00:00') : null;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const isOverdue = pDate && p.status !== 'received' && pDate < today;
                const daysAway = pDate ? Math.ceil((pDate.getTime() - today.getTime()) / 86400000) : null;
                const recurrenceLabel = !p.recurrence || p.recurrence === 'none' ? 'One-time' : p.recurrence.charAt(0).toUpperCase() + p.recurrence.slice(1);
                return (
                <div key={p.id} className="rounded-xl mb-3 overflow-hidden" style={{ border: `1px solid ${p.status === 'received' ? theme.border : isOverdue ? '#FCA5A5' : theme.accent + '60'}`, opacity: p.status === 'received' ? 0.65 : 1 }}>
                  {/* Main payment row */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      {/* Left: description + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.status === 'received' ? '#6B7280' : isOverdue ? '#EF4444' : '#10B981' }} />
                          <span className="text-sm font-bold truncate" style={{ color: theme.text }}>{p.description || 'Payment'}</span>
                          {p.status === 'received' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>✓ Received</span>
                          )}
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>Overdue</span>
                          )}
                        </div>
                        {/* Date + recurrence row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1" style={{ color: theme.textM }}>
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs font-semibold">
                              {pDate ? pDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                          {daysAway !== null && p.status !== 'received' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: isOverdue ? '#FEE2E2' : daysAway <= 3 ? '#FEF3C7' : `${theme.accent}15`, color: isOverdue ? '#DC2626' : daysAway <= 3 ? '#D97706' : theme.accent }}>
                              {isOverdue ? `${Math.abs(daysAway)}d overdue` : daysAway === 0 ? 'Today' : `In ${daysAway}d`}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: theme.bg, color: theme.textM, border: `1px solid ${theme.border}` }}>
                            {recurrenceLabel}
                          </span>
                        </div>
                      </div>
                      {/* Right: amount */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-black" style={{ color: p.status === 'received' ? '#6B7280' : '#10B981' }}>
                          +${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${theme.border}40` }}>
                      {p.status !== 'received' ? (
                        <button
                          onClick={() => {
                            const updated = paymentEntries.map(pe => pe.id === p.id ? { ...pe, status: 'received' as const } : pe);
                            setPaymentEntries(updated);
                            setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                          style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
                        >
                          <Check className="w-3 h-3" /> Mark Received
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const updated = paymentEntries.map(pe => pe.id === p.id ? { ...pe, status: 'expected' as const } : pe);
                            setPaymentEntries(updated);
                            setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                          style={{ backgroundColor: theme.bg, color: theme.textM, border: `1px solid ${theme.border}` }}
                        >
                          Undo
                        </button>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => editingPaymentId === p.id ? setEditingPaymentId(null) : startEditingPayment(p)}
                        className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                        style={{ color: theme.accent, backgroundColor: `${theme.accent}15` }}
                        title="Edit payment"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const updated = paymentEntries.filter(pe => pe.id !== p.id);
                          setPaymentEntries(updated);
                          setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                        }}
                        className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                        style={{ color: '#EF4444', backgroundColor: '#FEE2E2' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {editingPaymentId === p.id && (
                    <div className="p-3.5 pt-0 space-y-2 border-t" style={{ borderColor: theme.border }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                          <input type="number" value={editingPaymentAmount} onChange={e => setEditingPaymentAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
                        </div>
                        <input type="date" value={editingPaymentDate} onChange={e => setEditingPaymentDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
                      </div>
                      <input type="text" value={editingPaymentDesc} onChange={e => setEditingPaymentDesc(e.target.value)}
                        placeholder="Description" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
                      <div className="flex gap-2 flex-wrap">
                        {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
                          <button key={r} onClick={() => setEditingPaymentRecurrence(r)}
                            className="px-3 py-1 rounded-lg text-xs capitalize transition-all"
                            style={{ backgroundColor: editingPaymentRecurrence === r ? theme.accent : theme.border, color: editingPaymentRecurrence === r ? '#fff' : theme.textM, fontWeight: editingPaymentRecurrence === r ? 700 : 400 }}>
                            {r === 'none' ? 'One-time' : r}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEditingPayment}
                          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                          style={{ backgroundColor: theme.accent, color: '#fff' }}>Save</button>
                        <button onClick={() => setEditingPaymentId(null)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                          style={{ backgroundColor: theme.border, color: theme.text }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
          </motion.div>
          );
  void renderIncomingPaymentsHidden;

  // ── Layout state (2026-11 redesign) ──
  const [newAcctOpen, setNewAcctOpen] = useState(false)
  const [newAcctName, setNewAcctName] = useState('')
  const [newAcctBalance, setNewAcctBalance] = useState('')
  const [newAcctGoal, setNewAcctGoal] = useState('')
  const field = useField()
  const streamColors = useStreamColors()

  // Savings edits are immutable so React state never shares objects with what was saved.
  const updateAccount = (id: string, patch: Partial<SavingsAccount>) => {
    const updated = savingsAccounts.map(a => (a.id === id ? { ...a, ...patch } : a))
    setSavingsAccounts(updated)
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated))
  }
  const addToAccount = (id: string, amt: number) => {
    const acct = savingsAccounts.find(a => a.id === id)
    if (acct && amt > 0) updateAccount(id, { amount: acct.amount + amt, saved: true })
  }
  const deleteAccount = (id: string) => {
    const updated = savingsAccounts.filter(a => a.id !== id)
    setSavingsAccounts(updated)
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated))
  }
  const createAccount = () => {
    if (!newAcctName.trim()) return
    const newAcct: SavingsAccount = {
      id: Date.now().toString(),
      name: newAcctName.trim(),
      amount: parseFloat(newAcctBalance) || 0,
      goal: parseFloat(newAcctGoal) || 0,
      saved: false,
    }
    const updated = [...savingsAccounts, newAcct]
    setSavingsAccounts(updated)
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated))
    setNewAcctName(''); setNewAcctBalance(''); setNewAcctGoal('')
    setNewAcctOpen(false)
    setActiveTab('savings')
  }

  // BizzyPlug createdAt can be a full ISO timestamp or a plain date.
  const projectDate = (v?: string) => {
    if (!v) return ''
    const d = new Date(v.includes('T') ? v : v + 'T00:00:00')
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const shortDay = (v?: string) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD')
  const monthLabel = new Date(metricsYear, metricsMonth).toLocaleDateString('en-US', { month: 'long' })

  const renderIncomeTab = () => {
    return (
      <div className="space-y-4 md:space-y-5">
        <div className="overflow-x-auto no-scrollbar">
          <Segmented
            size="sm"
            value={projectionMode}
            onChange={v => setProjectionMode(v as typeof projectionMode)}
            options={[{ value: 'lyft', label: 'Lyft' }, { value: 'dj', label: 'DJ Maskoff' }, { value: 'bizzplug', label: 'BizzyPlug' }, { value: 'crooked', label: 'Crooked Rumor' }]}
          />
        </div>

        {projectionMode === 'lyft' && (
          <Panel>
            <PanelTitle
              title={`Lyft · ${monthLabel}`}
              sub={lyftCovered.has(metricsMonthKey) ? 'Monthly total logged' : `${lyftSessionsMonth.length} week${lyftSessionsMonth.length !== 1 ? 's' : ''} logged`}
              right={<Button size="sm" variant="primary" onClick={() => openLyftLog('week')}><Plus size={14} /> Log earnings</Button>}
            />
            <div className="grid grid-cols-3 gap-2 mb-5">
              <MiniStat label="Earned" value={fmt(lyftGrossMonth)} />
              <MiniStat label="Gas" value={fmt(lyftGasMonth)} />
              <MiniStat label="Net" value={fmt(lyftNetMonth)} tone={lyftNetMonth > 0 ? theme.ok : undefined} />
            </div>

            {lyftEntriesMonth.length === 0 ? (
              <div className="py-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[13px]" style={{ color: theme.subtext }}>Nothing logged in {monthLabel}.</p>
                <Button size="sm" onClick={() => openLyftLog('month')}>Log the whole month</Button>
              </div>
            ) : (
              <ul>
                {[...lyftEntriesMonth].sort((a, b) => Number(isMonthly(b)) - Number(isMonthly(a)) || (b.date || '').localeCompare(a.date || '')).slice(0, 8).map((sess, i) => {
                  const entryLabel = isMonthly(sess) ? `${monthLabel} total` : `Week ending ${shortDay(sess.date)}`
                  const covered = isCovered(sess, lyftCovered)
                  return (
                  <li key={sess.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                    {lyftEditId === sess.id ? (
                      <div className="py-3 space-y-2">
                        <p className="text-[13px] font-medium" style={{ color: theme.text }}>{entryLabel}</p>
                        <div className="flex gap-2">
                          <input type="number" inputMode="decimal" value={lyftEditEarnings} onChange={e => setLyftEditEarnings(e.target.value)} autoFocus aria-label="Amount earned" {...field} />
                          <Button variant="danger" ariaLabel="Delete entry" onClick={() => deleteLyftSession(sess.id)}><Trash2 size={14} /></Button>
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1" onClick={() => { setLyftEditId(null); setLyftEditEarnings('') }}>Cancel</Button>
                          <Button className="flex-1" variant="primary" disabled={!lyftEditEarnings || parseFloat(lyftEditEarnings) <= 0} onClick={updateLyftSession}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <button className="w-full flex items-center justify-between gap-3 py-3 text-left" onClick={() => { setLyftEditId(sess.id); setLyftEditEarnings(String(sess.earnings)) }} aria-label={`Edit ${entryLabel}`}>
                        <span className="min-w-0">
                          <span className="block text-[13.5px]" style={{ color: covered ? theme.subtext : theme.text }}>{entryLabel}</span>
                          {covered && <span className="block text-[11.5px]" style={{ color: theme.subtext }}>Covered by monthly total, not counted</span>}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[13.5px] font-semibold tnum ${covered ? 'line-through' : ''}`} style={{ color: covered ? theme.subtext : theme.text }}>{fmt(sess.earnings)}</span>
                          <Edit3 size={13} style={{ color: theme.subtext }} />
                        </span>
                      </button>
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        )}

        {projectionMode === 'crooked' && (
          <Panel>
            <PanelTitle
              title={`Crooked Rumor · ${monthLabel}`}
              sub={crState === 'ok' ? `${crBookingsMonth.length} booking${crBookingsMonth.length !== 1 ? 's' : ''} this month · read only` : 'Bookings and payments from your Crooked Rumor site'}
              right={<Link href="/crookedrumor/admin"><Button size="sm">Open Crooked Rumor <ArrowUpRight size={13} /></Button></Link>}
            />
            {crState === 'loading' && <p className="text-[13px] py-2" style={{ color: theme.subtext }}>Loading bookings…</p>}
            {crState === 'denied' && <p className="text-[13px] py-2" style={{ color: theme.subtext }}>Sign in to the Crooked Rumor admin once on this device to connect it here.</p>}
            {crState === 'error' && <p className="text-[13px] py-2" style={{ color: theme.bad }}>Couldn&apos;t load Crooked Rumor right now. Try again in a moment.</p>}
            {crState === 'ok' && (<>
              <div className="grid grid-cols-3 gap-2 mb-5">
                <MiniStat label="Received" value={fmt(crEarnedMonth)} tone={crEarnedMonth > 0 ? theme.ok : undefined} />
                <MiniStat label="Booked" value={fmt(crBookedMonth)} />
                <MiniStat label="Still owed" value={fmt(crOwed)} />
              </div>
              {crBookingsMonth.length === 0 ? (
                <p className="text-[13px] py-2" style={{ color: theme.subtext }}>No bookings in {monthLabel}.</p>
              ) : (
                <ul>
                  {[...crBookingsMonth].sort((a, b) => (b.project_date || b.created_at).localeCompare(a.project_date || a.created_at)).slice(0, 8).map((bk, i) => {
                    const owed = Math.max(0, (bk.total_cents || 0) - (bk.amount_paid_cents || 0)) / 100
                    return (
                      <li key={bk.id} className="flex items-center justify-between gap-3 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                        <div className="min-w-0">
                          <p className="text-[13.5px] truncate" style={{ color: theme.text }}>{bk.client_name || 'Client'}{bk.package_name ? ` · ${bk.package_name}` : ''}</p>
                          <p className="text-[12px]" style={{ color: theme.subtext }}>{bk.project_date ? shortDay(bk.project_date) : 'Date TBD'} · {CR_STATUS[bk.status] || bk.status}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13.5px] font-semibold tnum" style={{ color: theme.text }}>{fmt((bk.total_cents || 0) / 100)}</p>
                          {bk.total_cents > 0 && <p className="text-[11.5px] tnum" style={{ color: owed <= 0 ? theme.ok : theme.subtext }}>{owed <= 0 ? 'Paid' : `${fmt(owed)} owed`}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>)}
          </Panel>
        )}

        {projectionMode === 'dj' && (
          <Panel>
            <PanelTitle
              title={`DJ Maskoff · ${monthLabel}`}
              sub={`${djGigsMonth.length} gig${djGigsMonth.length !== 1 ? 's' : ''}, ${djUpcomingMonth} still to come`}
              right={<Link href="/dj"><Button size="sm">Open DJ Maskoff <ArrowUpRight size={13} /></Button></Link>}
            />
            <div className="grid grid-cols-3 gap-2 mb-5">
              <MiniStat label="Earned" value={fmt(djEarnedMonth)} tone={djEarnedMonth > 0 ? theme.ok : undefined} />
              <MiniStat label="Booked" value={fmt(djBookedMonth)} />
              <MiniStat label="Upcoming" value={String(djUpcomingMonth)} />
            </div>
            {djGigsMonth.length === 0 ? (
              <p className="text-[13px] py-2" style={{ color: theme.subtext }}>No gigs in {monthLabel} yet.</p>
            ) : (
              <ul>
                {[...djGigsMonth].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((gig, i) => (
                  <li key={gig.id} className="flex items-center justify-between gap-3 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                    <div className="min-w-0">
                      <p className="text-[13.5px] truncate" style={{ color: theme.text }}>{gig.clientName || 'Client'} · {gig.eventType || 'Event'}</p>
                      <p className="text-[12px] capitalize" style={{ color: theme.subtext }}>{shortDay(gig.date)} · {gig.status}</p>
                    </div>
                    <span className="text-[13.5px] font-semibold tnum" style={{ color: theme.text }}>{fmt(gig.contractAmount || gig.fee || 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {projectionMode === 'bizzplug' && (() => {
          const totalProjects = bizzplugClientsMonth.length
          const newLeads = bizzplugClientsMonth.filter((c: any) => c.status === 'new-lead').length
          const completed = bizzplugClientsMonth.filter((c: any) => c.status === 'completed').length
          const recentProjects = [...bizzplugClientsMonth].sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6)
          return (
            <Panel>
              <PanelTitle
                title={`BizzyPlug · ${monthLabel}`}
                sub={`${totalProjects} project${totalProjects !== 1 ? 's' : ''}, ${newLeads} active`}
                right={<Link href="/bizzplug"><Button size="sm">Open BizzyPlug <ArrowUpRight size={13} /></Button></Link>}
              />
              <div className="grid grid-cols-3 gap-2 mb-5">
                <MiniStat label="Earned" value={fmt(bizzplugEarnedMonth)} tone={bizzplugEarnedMonth > 0 ? theme.ok : undefined} />
                <MiniStat label="Pending" value={fmt(bizzplugPendingMonth)} />
                <MiniStat label="Completed" value={String(completed)} />
              </div>
              {recentProjects.length === 0 ? (
                <p className="text-[13px] py-2" style={{ color: theme.subtext }}>No projects in {monthLabel} yet.</p>
              ) : (
                <ul>
                  {recentProjects.map((proj: any, i: number) => (
                    <li key={proj.id} className="flex items-center justify-between gap-3 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      <div className="min-w-0">
                        <p className="text-[13.5px] truncate" style={{ color: theme.text }}>{proj.artistName || 'Client'} · {proj.projectType || 'Project'}</p>
                        <p className="text-[12px]" style={{ color: theme.subtext }}>{[projectDate(proj.createdAt), (proj.status || 'new-lead').replace('-', ' ')].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="text-[13.5px] font-semibold tnum" style={{ color: proj.paid > 0 ? theme.ok : theme.text }}>
                        {proj.paid > 0 ? `+${fmt(proj.paid)}` : fmt(proj.quote || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )
        })()}
      </div>
    )
  }

  const renderSavingsTab = () => {
    if (savingsAccounts.length === 0) {
      return <EmptyState title="No savings accounts yet" sub="Add an account to track its balance and a goal." action={<Button variant="primary" onClick={() => setNewAcctOpen(true)}><Plus size={15} /> New account</Button>} />
    }
    return (
      <div ref={savingsSectionRef} className="grid gap-4 md:gap-5 md:grid-cols-2 items-start">
        {savingsAccounts.map(acct => {
          const editing = collapsedAccounts[acct.id] === false
          const pctGoal = acct.goal > 0 ? (acct.amount / acct.goal) * 100 : 0
          return (
            <Panel key={acct.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: theme.subtext }}>{acct.name}</p>
                  <p className="text-[26px] font-semibold tnum tracking-tight leading-tight" style={{ color: theme.text }}>{fmt(acct.amount)}</p>
                </div>
                <RowMenu label={`More actions for ${acct.name}`} items={[
                  { label: editing ? 'Done editing' : 'Edit balance and goal', icon: Edit3, onClick: () => setCollapsedAccounts(p => ({ ...p, [acct.id]: editing ? true : false })) },
                  { label: 'Delete account', icon: Trash2, danger: true, onClick: () => deleteAccount(acct.id) },
                ]} />
              </div>
              {acct.goal > 0 && (
                <div className="mt-3">
                  <Bar pct={pctGoal} color={pctGoal >= 100 ? theme.ok : theme.accent} />
                  <p className="text-[11.5px] mt-1.5 tnum" style={{ color: theme.subtext }}>{Math.round(pctGoal)}% of {fmt(acct.goal)} goal{acct.goal > acct.amount ? ` · ${fmt(acct.goal - acct.amount)} to go` : ''}</p>
                </div>
              )}

              {editing && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Field label="Balance ($)"><input type="number" inputMode="decimal" value={acct.amount} onChange={e => updateAccount(acct.id, { amount: parseFloat(e.target.value) || 0 })} {...field} /></Field>
                  <Field label="Goal ($)"><input type="number" inputMode="decimal" value={acct.goal || ''} placeholder="Optional" onChange={e => updateAccount(acct.id, { goal: parseFloat(e.target.value) || 0 })} {...field} /></Field>
                </div>
              )}

              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                <p className="text-xs font-medium mb-2" style={{ color: theme.subtext }}>Add money</p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[10, 25, 50, 100].map(amt => (
                    <Button key={amt} size="sm" onClick={() => addToAccount(acct.id, amt)}>+${amt}</Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Other amount"
                    aria-label={`Other amount to add to ${acct.name}`}
                    value={customAddAmounts[acct.id] || ''}
                    onChange={e => setCustomAddAmounts(prev => ({ ...prev, [acct.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { addToAccount(acct.id, parseFloat(customAddAmounts[acct.id] || '0')); setCustomAddAmounts(prev => ({ ...prev, [acct.id]: '' })) } }}
                    {...field}
                  />
                  <Button variant="primary" disabled={!(parseFloat(customAddAmounts[acct.id] || '0') > 0)} onClick={() => { addToAccount(acct.id, parseFloat(customAddAmounts[acct.id] || '0')); setCustomAddAmounts(prev => ({ ...prev, [acct.id]: '' })) }}>Add</Button>
                </div>
              </div>
            </Panel>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: theme.bg }} className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm" style={{ color: theme.subtext }}>Loading…</div>
      </div>
    )
  }

  const sources = [
    { key: 'lyft' as const, name: 'Lyft', value: summaryLyftNet, meta: !summaryAllTime && lyftCovered.has(metricsMonthKey) ? 'monthly total, net of gas' : summaryAllTime ? `${summaryLyftSessions.length} entr${summaryLyftSessions.length === 1 ? 'y' : 'ies'}, net of gas` : `${summaryLyftSessions.length} week${summaryLyftSessions.length === 1 ? '' : 's'}, net of gas` },
    { key: 'dj' as const, name: 'DJ Maskoff', value: summaryDjEarned, meta: `${summaryDjGigs.length} gig${summaryDjGigs.length === 1 ? '' : 's'}` },
    { key: 'bizzplug' as const, name: 'BizzyPlug', value: summaryBizzplugEarned, meta: `${summaryBizzplugClients.length} client${summaryBizzplugClients.length === 1 ? '' : 's'}` },
    ...(crState === 'ok' ? [{ key: 'crooked' as const, name: 'Crooked Rumor', value: summaryCrEarned, meta: `${summaryCrPayments} payment${summaryCrPayments === 1 ? '' : 's'}` }] : []),
  ]
  const maxSource = Math.max(...sources.map(x => x.value), 1)
  const sourceColor = (k: string) => (k === 'crooked' ? (isDark ? '#9b7cf0' : '#7c5ce0') : streamColors[k as keyof typeof streamColors])

  return (
    <PageShell>
      <PageHeader
        title="Smart Stack"
        sub="Income from every business, and your savings"
        right={<>
          <MonthSwitcher month={metricsMonth} year={metricsYear} onChange={dir => { setSummaryAllTime(false); handleMetricsMonthChange(dir) }} />
          <Segmented size="sm" value={summaryAllTime ? 'all' : 'month'} onChange={v => setSummaryAllTime(v === 'all')} options={[{ value: 'month', label: 'Month' }, { value: 'all', label: 'All time' }]} />
        </>}
      />

      <Panel pad={false} className="mb-5">
        <div className="grid md:grid-cols-[1.6fr_1fr]">
          <div className="p-5">
            <p className="text-xs font-medium" style={{ color: theme.subtext }}>Total income · {summaryAllTime ? 'all time' : `${monthLabel} ${metricsYear}`}</p>
            <p className="mt-1 text-[30px] md:text-[34px] font-semibold tnum tracking-tight leading-tight" style={{ color: theme.text }}>{fmt(summaryTotalIncome)}</p>
            <ul className="mt-4 space-y-3">
              {sources.map(src => (
                <li key={src.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px] mb-1.5">
                    <span className="flex items-center gap-2 min-w-0" style={{ color: theme.text }}>
                      <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: sourceColor(src.key) }} />
                      {src.name}
                      <span className="text-xs truncate" style={{ color: theme.subtext }}>{src.meta}</span>
                    </span>
                    <span className="font-medium tnum shrink-0" style={{ color: theme.text }}>{fmt(src.value)}</span>
                  </div>
                  <Bar pct={(src.value / maxSource) * 100} color={sourceColor(src.key)} />
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 flex flex-col justify-between gap-4 border-t md:border-t-0 md:border-l" style={{ borderColor: theme.border }}>
            <Stat label="Total savings" value={fmt(summaryTotals.totalSavings)} sub={`${savingsAccounts.length} account${savingsAccounts.length !== 1 ? 's' : ''}, current balance`} />
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={() => setNewAcctOpen(true)}><Plus size={15} /> New account</Button>
              <Button className="flex-1" onClick={() => setActiveTab('savings')}>View savings</Button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="mb-4">
        <Segmented value={activeTab} onChange={v => setActiveTab(v as Tab)} options={[{ value: 'income', label: 'Income' }, { value: 'savings', label: `Savings${savingsAccounts.length ? ` · ${savingsAccounts.length}` : ''}` }]} />
      </div>

      {activeTab === 'income' && renderIncomeTab()}
      {activeTab === 'savings' && renderSavingsTab()}

      <Sheet
        open={lyftFormExpanded}
        onClose={() => setLyftFormExpanded(false)}
        title="Log Lyft earnings"
        sub="Log each week, or one total for a month you missed."
        footer={<>
          <Button className="flex-1" onClick={() => setLyftFormExpanded(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!lyftCanSave} onClick={addLyftSession}>{lyftAddPeriod === 'month' ? 'Save month' : 'Save week'}</Button>
        </>}
      >
        <div className="space-y-3">
          <Segmented value={lyftAddPeriod} onChange={v => setLyftAddPeriod(v as 'week' | 'month')} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Whole month' }]} />
          <div className="grid grid-cols-2 gap-3">
            {lyftAddPeriod === 'week'
              ? <Field label="Week ending"><input type="date" value={lyftAddDate} onChange={e => setLyftAddDate(e.target.value)} {...field} /></Field>
              : <Field label="Month"><input type="month" value={lyftAddMonth} onChange={e => setLyftAddMonth(e.target.value)} {...field} /></Field>}
            <Field label="Total earned ($)"><input type="number" inputMode="decimal" value={lyftAddEarnings} onChange={e => setLyftAddEarnings(e.target.value)} autoFocus {...field} /></Field>
          </div>
          {lyftDupWeek && <p className="text-[12.5px]" style={{ color: theme.bad }}>That week is already logged. Tap it in the list to change the amount.</p>}
          {lyftDupMonth && <p className="text-[12.5px]" style={{ color: theme.bad }}>That month already has a total. Tap it in the list to change the amount.</p>}
          {!lyftDupMonth && lyftWeeksInAddMonth.length > 0 && (
            <p className="text-[12.5px]" style={{ color: theme.warn }}>
              You logged {fmt(lyftWeeksInAddMonth.reduce((t, x) => t + (x.earnings || 0), 0))} across {lyftWeeksInAddMonth.length} week{lyftWeeksInAddMonth.length === 1 ? '' : 's'} in this month. This total will replace them so nothing counts twice.
            </p>
          )}
          {!lyftDupWeek && lyftWeekInCoveredMonth && <p className="text-[12.5px]" style={{ color: theme.warn }}>This month already has a monthly total, so this week will be saved but not counted.</p>}
        </div>
      </Sheet>

      <Sheet
        open={newAcctOpen}
        onClose={() => setNewAcctOpen(false)}
        title="New savings account"
        footer={<>
          <Button className="flex-1" onClick={() => setNewAcctOpen(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!newAcctName.trim()} onClick={createAccount}>Create account</Button>
        </>}
      >
        <div className="space-y-3">
          <Field label="Name"><input value={newAcctName} onChange={e => setNewAcctName(e.target.value)} placeholder="e.g. Emergency fund" autoFocus onKeyDown={e => e.key === 'Enter' && createAccount()} {...field} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting balance ($)"><input type="number" inputMode="decimal" value={newAcctBalance} onChange={e => setNewAcctBalance(e.target.value)} placeholder="0" {...field} /></Field>
            <Field label="Goal ($)" hint="Optional"><input type="number" inputMode="decimal" value={newAcctGoal} onChange={e => setNewAcctGoal(e.target.value)} {...field} /></Field>
          </div>
        </div>
      </Sheet>
    </PageShell>
  );
}
