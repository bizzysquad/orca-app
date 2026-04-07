'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home, ExternalLink, Layers, ChevronLeft, ChevronRight,
  Wallet, BarChart3, Calculator, Clock,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, fmtD, daysTo, calcAlloc, calcIncome, f2w, pct, getPaycheckAmount } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { setLocalSynced } from '@/lib/syncLocal';
import CalendarPicker from '@/components/CalendarPicker';

type Tab = 'income' | 'savings';

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
  const [result, setResult] = useState<{ perWeek: number; perMonth: number; perDay: number } | null>(null)

  const calculate = () => {
    const goal = parseFloat(goalAmount)
    const time = parseFloat(timeframe)
    if (!goal || !time || goal <= 0 || time <= 0) return

    const remaining = goal - (parseFloat(currentSaved) || 0)
    if (remaining <= 0) {
      setResult({ perWeek: 0, perMonth: 0, perDay: 0 })
      return
    }

    let totalWeeks = time
    if (timeUnit === 'days') totalWeeks = time / 7
    if (timeUnit === 'months') totalWeeks = time * 4.33
    if (timeUnit === 'years') totalWeeks = time * 52

    const perWeek = remaining / totalWeeks
    const perMonth = perWeek * 4.33
    const perDay = perWeek / 7

    setResult({ perWeek, perMonth, perDay })
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
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function SmartStackPage() {
  const { theme } = useTheme();
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
  const [projectionMode, setProjectionMode] = useState<'payment' | 'check' | 'calculator'>('payment');
  const [customAddAmounts, setCustomAddAmounts] = useState<Record<string, string>>({});
  const [collapsedAccounts, setCollapsedAccounts] = useState<Record<string, boolean>>({});

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

  const renderIncomeTab = () => {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex rounded-2xl overflow-hidden p-1 w-full max-w-full" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
          {[
            { key: 'payment', label: 'Incoming Payments', icon: Wallet },
            { key: 'check', label: 'Check Projection', icon: BarChart3 },
            { key: 'calculator', label: 'Projection Calculator', icon: Calculator },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setProjectionMode(key as typeof projectionMode)}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 sm:px-2 text-[10px] sm:text-xs rounded-2xl transition-all min-w-0"
              style={{
                backgroundColor: projectionMode === key ? theme.accent : 'transparent',
                color: projectionMode === key ? '#fff' : theme.accent,
                fontWeight: projectionMode === key ? 700 : 500,
              }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {projectionMode === 'payment' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-4 sm:p-5 overflow-hidden w-full">
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

            <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled Payments</div>
            {paymentEntries.length === 0 ? (
              <div className="text-sm" style={{ color: theme.textM }}>No payments scheduled</div>
            ) : (
              paymentEntries.map(p => (
                <div key={p.id} className="rounded-xl mb-2 overflow-hidden" style={{ border: `1px solid ${theme.border}`, opacity: p.status === 'received' ? 0.6 : 1 }}>
                  <div className="flex items-center gap-3 p-3.5 transition-all">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.status === 'received' ? '#6B7280' : '#10B981' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ fontWeight: 700, color: theme.text }}>{p.description}</div>
                      <div className="text-xs" style={{ color: theme.textM }}>{p.date} · {p.recurrence === 'none' || !p.recurrence ? 'One-time' : p.recurrence}</div>
                    </div>
                    {p.status === 'received' ? (
                      <span className="px-2 py-1 rounded-full text-xs flex-shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>Received</span>
                    ) : (
                      <button
                        onClick={() => {
                          const updated = paymentEntries.map(pe => pe.id === p.id ? { ...pe, status: 'received' as const } : pe);
                          setPaymentEntries(updated);
                          setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                        }}
                        className="px-2 py-1 rounded-full text-xs flex-shrink-0 hover:opacity-80 transition-all"
                        style={{ backgroundColor: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}
                      >
                        Mark Received
                      </button>
                    )}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div style={{ fontSize: 13, fontWeight: 800, color: p.status === 'received' ? '#6B7280' : '#10B981' }}>+${p.amount.toFixed(2)}</div>
                      <button
                        onClick={() => editingPaymentId === p.id ? setEditingPaymentId(null) : startEditingPayment(p)}
                        className="p-1 rounded-lg hover:opacity-80 transition-all"
                        style={{ color: theme.accent }}
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
                        className="p-1 rounded-lg hover:opacity-80 transition-all"
                        style={{ color: '#EF4444' }}
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
              ))
            )}
          </motion.div>
        )}

        {projectionMode === 'check' && renderCheckProjectionWithCalendar()}

        {projectionMode === 'calculator' && <ProjectionCalculator theme={theme} />}
      </motion.div>
    );
  };

  const renderSavingsTab = () => {
    const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.amount, 0);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="rounded-2xl p-5" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: theme.accent }} />
            <span className="text-sm" style={{ fontWeight: 700, color: theme.accent }}>Total Savings</span>
          </div>
          <div className="text-2xl sm:text-[32px] break-words" style={{ fontWeight: 900, color: theme.accent }}>${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs mt-1" style={{ color: theme.textM }}>{savingsAccounts.length} account{savingsAccounts.length !== 1 ? 's' : ''}</div>
        </div>

        {savingsAccounts.map(acct => {
          const isCollapsed = !!collapsedAccounts[acct.id];
          return (
          <motion.div key={acct.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl overflow-hidden">
            {/* Account Header — always visible */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer"
              style={{ borderBottom: isCollapsed ? 'none' : `1px solid ${theme.border}40` }}
              onClick={() => setCollapsedAccounts(prev => ({ ...prev, [acct.id]: !prev[acct.id] }))}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: theme.accent, letterSpacing: '0.06em' }}>{acct.name}</h3>
                  <div className="text-lg font-black" style={{ color: theme.accent }}>${acct.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                {acct.goal > 0 && (
                  <div className="flex-1 min-w-0 max-w-[120px]">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.border}` }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((acct.amount / acct.goal) * 100, 100)}%`, backgroundColor: theme.accent }} />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: theme.textM }}>{Math.round((acct.amount / acct.goal) * 100)}% of ${acct.goal.toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSavingsAccounts(prev => prev.filter(a => a.id !== acct.id)); setLocalSynced('orca-savings-accounts', JSON.stringify(savingsAccounts.filter(a => a.id !== acct.id))); }}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="p-1.5 rounded-lg transition-all" style={{ color: theme.textM }}>
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Collapsible body */}
            {!isCollapsed && (
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 600 }}>Edit Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                    <input type="number" value={acct.amount} onChange={e => {
                      const updated = [...savingsAccounts];
                      const idx = updated.findIndex(a => a.id === acct.id);
                      updated[idx].amount = parseFloat(e.target.value) || 0;
                      setSavingsAccounts(updated);
                      setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
                    }}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 600 }}>Savings Goal</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                    <input type="text" placeholder="Set a goal (optional)" value={acct.goal} onChange={e => {
                      const updated = [...savingsAccounts];
                      const idx = updated.findIndex(a => a.id === acct.id);
                      updated[idx].goal = parseFloat(e.target.value) || 0;
                      setSavingsAccounts(updated);
                      setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
                    }}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2" style={{ color: theme.textM, fontWeight: 600 }}>Quick Add</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[10, 25, 50, 100].map(amt => (
                      <button key={amt} onClick={() => {
                        const updated = [...savingsAccounts];
                        const idx = updated.findIndex(a => a.id === acct.id);
                        updated[idx].amount += amt;
                        updated[idx].saved = true;
                        setSavingsAccounts(updated);
                        setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
                      }}
                        className="py-2 rounded-xl text-sm transition-all hover:opacity-90 font-bold"
                        style={{ backgroundColor: `${theme.accent}20`, color: theme.accent, border: `1px solid ${theme.accent}` }}>
                        +${amt}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                      <input
                        type="number"
                        placeholder="Custom amount"
                        value={customAddAmounts[acct.id] || ''}
                        onChange={e => setCustomAddAmounts(prev => ({ ...prev, [acct.id]: e.target.value }))}
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const customAmount = parseFloat(customAddAmounts[acct.id] || '0');
                        if (customAmount > 0) {
                          const updated = [...savingsAccounts];
                          const idx = updated.findIndex(a => a.id === acct.id);
                          updated[idx].amount += customAmount;
                          updated[idx].saved = true;
                          setSavingsAccounts(updated);
                          setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
                          setCustomAddAmounts(prev => ({ ...prev, [acct.id]: '' }));
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: theme.accent }}>
                      Add
                    </button>
                  </div>
                </div>

                <button className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all font-bold"
                  style={{ backgroundColor: '#16A34A', color: '#fff' }}>
                  ✓ Saved!
                </button>
              </div>
            )}
          </motion.div>
        )})}

        <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `2px dashed ${theme.border}` }}>
          <h3 className="text-sm mb-3" style={{ fontWeight: 700, color: theme.textM }}>Add Savings Account</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="Account name (e.g., Emergency Fund)" value={newAccountName} onChange={e => setNewAccountName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }} />
            <button onClick={() => {
              if (newAccountName.trim()) {
                const newAcct: SavingsAccount = {
                  id: Date.now().toString(),
                  name: newAccountName.trim(),
                  amount: 0,
                  goal: 0,
                  saved: false,
                };
                const updated = [...savingsAccounts, newAcct];
                setSavingsAccounts(updated);
                setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
                setNewAccountName('');
              }
            }}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90 font-bold"
              style={{ backgroundColor: theme.accent, color: '#fff' }}>
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-full">
      <div className="max-w-3xl mx-auto w-full min-w-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 style={{ color: theme.text }} className="text-4xl font-bold mb-2">
            Smart Stack
          </h1>
          <p style={{ color: theme.textM }} className="text-lg">
            Complete financial management at a glance
          </p>
        </motion.div>

        <div
          style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}` }}
          className="rounded-2xl p-1 mb-8 flex gap-2"
        >
          {(['income', 'savings'] as Tab[]).map((tab) => (
            <motion.button
              key={tab}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? theme.accent : 'transparent',
                color: activeTab === tab ? '#fff' : theme.accent,
              }}
              className="flex-1 py-3 rounded-2xl font-bold capitalize transition-all"
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {activeTab === 'income' && renderIncomeTab()}
        {activeTab === 'savings' && renderSavingsTab()}
      </div>
    </div>
  );
}
