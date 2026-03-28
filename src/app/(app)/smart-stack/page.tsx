'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home, ExternalLink, Layers, ChevronLeft, ChevronRight,
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
    <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.gold}20` }}>
          <Target size={20} style={{ color: theme.gold }} />
        </div>
        <div>
          <h3 style={{ color: theme.text }} className="font-semibold text-lg">Projection Calculator</h3>
          <p style={{ color: theme.textM }} className="text-sm">How much do you need to save?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">Goal Amount ($)</label>
          <input
            type="number"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="e.g. 5000"
            className="w-full rounded-lg px-4 py-2.5 text-sm"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          />
        </div>

        <div>
          <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">How much do you have now? ($)</label>
          <input
            type="number"
            value={currentSaved}
            onChange={(e) => setCurrentSaved(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full rounded-lg px-4 py-2.5 text-sm"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">Timeframe</label>
            <input
              type="number"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="e.g. 6"
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            />
          </div>
          <div className="w-32">
            <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">Unit</label>
            <select
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value as 'days' | 'weeks' | 'months' | 'years')}
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={calculate}
          className="w-full py-3 rounded-lg font-semibold text-sm"
          style={{
            backgroundColor: theme.gold,
            color: theme.bg,
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
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.gold}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Week</p>
                <p style={{ color: theme.gold }} className="text-lg font-bold">{fmt(result.perWeek)}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.ok}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Day</p>
                <p style={{ color: theme.ok }} className="text-lg font-bold">{fmt(result.perDay)}</p>
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

  // Also respond to URL changes (e.g. navigating from Dashboard savings card)
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

  // Pay Splitter adjustable settings (persisted)
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

  // Track which days have custom hours (key = date string, value = hours)
  const [customHours, setCustomHours] = useState<Record<string, number>>({});
  const [editingHoursDay, setEditingHoursDay] = useState<string | null>(null);
  const [editingHoursValue, setEditingHoursValue] = useState('');

  // Check Projector now uses Net Income as the base
  const netIncome = data.user?.netIncome || 0;
  const [inlineNetIncome, setInlineNetIncome] = useState(String(netIncome || ''));
  const [inlinePayDate, setInlinePayDate] = useState('');
  const hasNetIncome = (parseFloat(inlineNetIncome) || netIncome) > 0;

  // Net Income change — local to Check Projector only, no sync to Dashboard/metrics
  const handleNetIncomeChange = (val: string) => {
    setInlineNetIncome(val);
  };

  // Custom pay period dates (user-defined start/end)
  const [customPeriodStart, setCustomPeriodStart] = useState('');
  const [customPeriodEnd, setCustomPeriodEnd] = useState('');

  // Weekend work days — weekends the user has opted to count as work days
  const [weekendWorkDays, setWeekendWorkDays] = useState<string[]>([]);

  // projectedCheckAmount is defined after pay period state below

  // ============== BUDGET LOCK LOGIC ==============
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

  // ============== SELF-EMPLOYED INCOME ALLOCATOR ==============
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

  // ============== PAY PERIOD STATE ==============
  const [projFreq, setProjFreq] = useState<'weekly' | 'biweekly'>('biweekly');
  const [projPeriodIndex, setProjPeriodIndex] = useState(0); // 0 = current period

  // Calculate pay periods based on frequency
  const payPeriods = useMemo(() => {
    const today = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];
    const periodDays = projFreq === 'weekly' ? 7 : 14;

    // Find current period start (assume periods start on Monday of current/recent week)
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + mondayOffset);

    // Generate periods: 2 past, current, 2 future
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

  const currentPeriod = payPeriods[projPeriodIndex + 2] || payPeriods[2]; // offset by 2 since we start at -2

  // Use custom pay period if user provided dates, otherwise use calculated period
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

  // The projected check amount = net income - deductions based on days off
  const effectiveNetIncome = parseFloat(inlineNetIncome) || netIncome;

  const projectedCheckAmount = useMemo(() => {
    if (!effectiveNetIncome || effectiveNetIncome <= 0) return 0;
    if (!effectivePeriod) return effectiveNetIncome;

    // Count total schedulable days (weekdays + weekend work days) and actual work days
    let totalScheduledDays = 0;
    let workDays = 0;
    const d = new Date(effectivePeriod.start);
    while (d <= effectivePeriod.end) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
      const isWeekendWork = isWknd && weekendWorkDays.includes(dateStr);

      if (!isWknd || isWeekendWork) {
        totalScheduledDays++;
        if (!daysOff.some((off) => off.date === dateStr)) {
          workDays++;
        }
      }
      d.setDate(d.getDate() + 1);
    }

    // Projected = netIncome * (workDays / totalScheduledDays)
    if (totalScheduledDays === 0) return effectiveNetIncome;
    return effectiveNetIncome * (workDays / totalScheduledDays);
  }, [effectiveNetIncome, effectivePeriod, daysOff, weekendWorkDays]);

  // For backward compat in other functions
  const checkAmount = projectedCheckAmount;

  // ============== CALENDAR WITH PROJECTION ==============
  const renderCheckProjectionWithCalendar = () => {
    const period = effectivePeriod;
    if (!period) return null;

    // Build array of days in this pay period
    const days: Date[] = [];
    const d = new Date(period.start);
    while (d <= period.end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    // Pad the beginning to align with week grid
    const paddedDays: (Date | null)[] = [];
    const firstDay = days[0].getDay();
    for (let i = 0; i < firstDay; i++) paddedDays.push(null);
    days.forEach(day => paddedDays.push(day));

    const toggleDayOff = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWknd) {
        // For weekends: toggle between off (default) → working → day-off-from-working
        const isMarkedWorking = weekendWorkDays.includes(dateStr);
        const isMarkedOff = daysOff.some((d) => d.date === dateStr);

        if (!isMarkedWorking && !isMarkedOff) {
          // Default weekend off → mark as working
          setWeekendWorkDays(prev => [...prev, dateStr]);
        } else if (isMarkedWorking && !isMarkedOff) {
          // Working weekend → remove from working (back to default off)
          setWeekendWorkDays(prev => prev.filter(d => d !== dateStr));
        }
      } else {
        // For weekdays: toggle day off as before
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

    // Count days off in this period for the progress bar
    const periodDayCount = days.length;
    const daysOffInPeriod = daysOff.filter(day => {
      const dd = new Date(day.date + 'T00:00:00');
      return dd >= period.start && dd <= period.end;
    });

    // Calculate income reduction from days off
    const fullCheckIncome = effectiveNetIncome;
    const incomeReduction = fullCheckIncome - projectedCheckAmount;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
          <DollarSign size={28} style={{ color: theme.gold }} />
          Check Projector
        </h3>

        <div className="space-y-6">
          {/* Inline Net Income Input */}
          <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4 space-y-3">
            <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">Net Income</p>
            <div className="relative">
              <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <input
                type="number"
                value={inlineNetIncome}
                onChange={(e) => handleNetIncomeChange(e.target.value)}
                placeholder="e.g., 3820"
                style={{ backgroundColor: theme.bgS, borderColor: theme.border, color: theme.text }}
                className="w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm font-semibold"
              />
            </div>
            <p style={{ color: theme.textM }} className="text-xs">Your take-home pay per pay period</p>
          </div>

          {/* Pay Frequency Selector */}
          <div className="flex items-center gap-3">
            <p style={{ color: theme.textS }} className="text-sm font-semibold">Frequency:</p>
            <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: theme.bg }}>
              <button
                onClick={() => { setProjFreq('weekly'); setProjPeriodIndex(0); }}
                className="px-4 py-2 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: projFreq === 'weekly' ? theme.gold : 'transparent',
                  color: projFreq === 'weekly' ? theme.bgS : theme.textM,
                }}
              >
                Weekly
              </button>
              <button
                onClick={() => { setProjFreq('biweekly'); setProjPeriodIndex(0); }}
                className="px-4 py-2 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: projFreq === 'biweekly' ? theme.gold : 'transparent',
                  color: projFreq === 'biweekly' ? theme.bgS : theme.textM,
                }}
              >
                Bi-Weekly
              </button>
            </div>
          </div>

          {/* Pay Period Picker */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setProjPeriodIndex(Math.max(-2, projPeriodIndex - 1))}
              disabled={projPeriodIndex <= -2}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: theme.textS }}
            >
              <Calendar size={16} />
            </button>
            <p style={{ color: theme.text }} className="text-sm font-semibold">
              {period.label}
              {projPeriodIndex === 0 && !customPeriodStart && <span style={{ color: theme.gold }} className="ml-2 text-xs">(Current)</span>}
            </p>
            <button
              onClick={() => setProjPeriodIndex(Math.min(2, projPeriodIndex + 1))}
              disabled={projPeriodIndex >= 2}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: theme.textS }}
            >
              <Calendar size={16} />
            </button>
          </div>

          {/* Custom Pay Period Dates */}
          <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4 space-y-3">
            <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase">Custom Pay Period (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ color: theme.textM }} className="text-xs mb-1 block">Start Date</label>
                <CalendarPicker
                  value={customPeriodStart}
                  onChange={setCustomPeriodStart}
                  placeholder="Start"
                  theme={theme}
                  showQuickSelect={false}
                />
              </div>
              <div>
                <label style={{ color: theme.textM }} className="text-xs mb-1 block">End Date</label>
                <CalendarPicker
                  value={customPeriodEnd}
                  onChange={setCustomPeriodEnd}
                  placeholder="End"
                  theme={theme}
                  showQuickSelect={false}
                />
              </div>
            </div>
            {customPeriodStart && customPeriodEnd && (
              <button
                onClick={() => { setCustomPeriodStart(''); setCustomPeriodEnd(''); }}
                style={{ color: theme.textM }}
                className="text-xs underline hover:no-underline"
              >
                Clear custom dates
              </button>
            )}
          </div>

          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
                Pay Period
              </p>
              <p style={{ color: theme.textM }} className="text-xs">
                Click weekdays to mark off · Click weekends to add work days
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dd) => (
                <div key={dd} style={{ color: theme.textM }} className="text-center text-xs font-semibold py-2">
                  {dd}
                </div>
              ))}

              {paddedDays.map((date, idx) => {
                const isOff = isDayOff(date);
                const isWknd = isWeekend(date);
                const isWkndWork = isWeekendWorking(date);

                return (
                  <motion.button
                    key={idx}
                    whileHover={date ? { scale: 1.1 } : {}}
                    onClick={() => date && toggleDayOff(date)}
                    style={{
                      backgroundColor: isOff
                        ? theme.gold
                        : isWkndWork
                        ? `${theme.ok}20`
                        : isWknd
                        ? `${theme.border}40`
                        : theme.bgS,
                      borderColor: isOff
                        ? theme.gold
                        : isWkndWork
                        ? theme.ok
                        : theme.border,
                      color: isOff
                        ? theme.bgS
                        : isWkndWork
                        ? theme.ok
                        : isWknd
                        ? theme.textM
                        : theme.text,
                      opacity: !date ? 0 : 1,
                    }}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-sm font-semibold ${date ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span>{date?.getDate()}</span>
                    {isWknd && date && !isOff && !isWkndWork && (
                      <span className="text-[7px]" style={{ color: theme.textM }}>off</span>
                    )}
                    {isWkndWork && date && (
                      <span className="text-[7px]" style={{ color: theme.ok }}>work</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Days Off Summary */}
          {daysOff.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: theme.bgS, borderColor: theme.border }}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase">
                  Days Off: {daysOff.length}
                </p>
                <button
                  onClick={() => setDaysOff([])}
                  style={{ color: theme.textM }}
                  className="text-xs underline hover:no-underline"
                >
                  Clear All
                </button>
              </div>
              <div style={{ backgroundColor: theme.bg }} className="h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(daysOff.length / periodDayCount) * 100}%` }}
                  style={{ backgroundColor: theme.warn }}
                  className="h-full"
                />
              </div>
            </motion.div>
          )}

          {/* Projected Check Amount */}
          <div style={{ backgroundColor: theme.bg, borderColor: hasNetIncome ? theme.gold : theme.border }} className="border-2 rounded-lg p-4">
            <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
              Projected Check Amount
            </p>
            <p style={{ color: theme.gold }} className="text-3xl font-bold">
              {fmt(projectedCheckAmount)}
            </p>
            {!hasNetIncome && (
              <p style={{ color: theme.warn }} className="text-sm mt-2">
                Enter your Net Income above to see your projected check.
              </p>
            )}
            {hasNetIncome && daysOff.length > 0 && incomeReduction > 0 && (
              <p style={{ color: theme.warn }} className="text-sm mt-2">
                {fmt(incomeReduction)} reduction from {daysOff.length} day(s) off
              </p>
            )}
            {hasNetIncome && (
              <p className="text-xs mt-2" style={{ color: theme.textM }}>
                Based on {fmt(effectiveNetIncome)} net income
              </p>
            )}
          </div>

        </div>
      </motion.div>
    );
  };

  // ============== SYNC PAYMENTS TO DASHBOARD ==============
  const syncPaymentsToDashboard = (entries: PaymentEntry[]) => {
    try { setLocalSynced('orca-payment-entries', JSON.stringify(entries)) } catch {}
    // Sync all payment dates (including recurring future dates) to Dashboard calendar
    const incomeEvents: any[] = [];
    entries.forEach(entry => {
      const freq = entry.recurrence || 'none';
      incomeEvents.push({
        id: entry.id,
        source: entry.description,
        amount: entry.amount,
        date: entry.date,
        frequency: freq === 'none' ? 'once' : freq,
      });
    });
    setData(prev => ({ ...prev, income: incomeEvents as any }));
  };

  // ============== PAYMENT PROJECTION (Incoming Payments) ==============
  const renderPaymentProjection = () => {
    const addPayment = () => {
      const amount = parseFloat(newPaymentAmount);
      if (!amount || !newPaymentDate) return;
      const entry: PaymentEntry = {
        id: `pay-${Date.now()}`,
        amount,
        date: newPaymentDate,
        description: newPaymentDesc || 'Payment',
        recurrence: newPaymentRecurrence,
        status: 'expected',
      };
      const updated = [...paymentEntries, entry];
      setPaymentEntries(updated);
      syncPaymentsToDashboard(updated);
      setNewPaymentAmount('');
      setNewPaymentDate('');
      setNewPaymentDesc('');
      setNewPaymentRecurrence('none');
    };

    const startEditPayment = (entry: PaymentEntry) => {
      setEditingPaymentId(entry.id);
      setNewPaymentAmount(String(entry.amount));
      setNewPaymentDate(entry.date);
      setNewPaymentDesc(entry.description);
      setNewPaymentRecurrence(entry.recurrence || 'none');
    };

    const saveEditPayment = () => {
      if (!editingPaymentId) return;
      const amount = parseFloat(newPaymentAmount);
      if (!amount || !newPaymentDate) return;
      const updated = paymentEntries.map(p =>
        p.id === editingPaymentId
          ? { ...p, amount, date: newPaymentDate, description: newPaymentDesc || 'Payment', recurrence: newPaymentRecurrence }
          : p
      );
      setPaymentEntries(updated);
      syncPaymentsToDashboard(updated);
      setEditingPaymentId(null);
      setNewPaymentAmount('');
      setNewPaymentDate('');
      setNewPaymentDesc('');
      setNewPaymentRecurrence('none');
    };

    const cancelEdit = () => {
      setEditingPaymentId(null);
      setNewPaymentAmount('');
      setNewPaymentDate('');
      setNewPaymentDesc('');
      setNewPaymentRecurrence('none');
    };

    const removePayment = (id: string) => {
      const updated = paymentEntries.filter(p => p.id !== id);
      setPaymentEntries(updated);
      syncPaymentsToDashboard(updated);
    };

    const toggleStatus = (id: string) => {
      const entry = paymentEntries.find(p => p.id === id);
      const wasReceived = entry?.status === 'received';
      const updated = paymentEntries.map(p =>
        p.id === id ? { ...p, status: p.status === 'received' ? 'expected' as const : 'received' as const } : p
      );
      setPaymentEntries(updated);
      syncPaymentsToDashboard(updated);

      // Auto-update checking balance: add when received, subtract when un-received
      if (entry) {
        try {
          const settingsStr = localStorage.getItem('orca-user-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            const currentBal = settings.checkingBalance || 0;
            if (wasReceived) {
              // Toggling from received → expected: subtract
              settings.checkingBalance = Math.max(0, currentBal - entry.amount);
            } else {
              // Toggling from expected → received: add
              settings.checkingBalance = currentBal + entry.amount;
            }
            setLocalSynced('orca-user-settings', JSON.stringify(settings));
            setData(prev => ({
              ...prev,
              user: { ...prev.user, checkingBalance: settings.checkingBalance },
            }));
          }
        } catch {}
      }
    };

    const totalPayments = paymentEntries.reduce((sum, p) => sum + p.amount, 0);
    const nextPayment = paymentEntries
      .filter(p => new Date(p.date) >= new Date() && p.status !== 'received')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    const recurrenceLabel = (r?: string) => {
      if (!r || r === 'none') return '';
      if (r === 'weekly') return 'Weekly';
      if (r === 'biweekly') return 'Bi-weekly';
      if (r === 'monthly') return 'Monthly';
      return '';
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-4 sm:p-6"
      >
        <h3 style={{ color: theme.text }} className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 px-1 sm:px-0">
          <Briefcase size={22} className="flex-shrink-0 sm:hidden" style={{ color: theme.gold }} />
          <Briefcase size={28} className="flex-shrink-0 hidden sm:block" style={{ color: theme.gold }} />
          Incoming Payments
        </h3>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="rounded-lg p-4" style={{ backgroundColor: `${theme.gold}10`, border: `1px solid ${theme.gold}30` }}>
            <p className="text-sm" style={{ color: theme.textS }}>
              Track your expected income here. Add each paycheck or payment you expect to receive, set the date and recurrence, then mark them as received when they arrive. This feeds into your Safe to Spend calculation on the Dashboard.
            </p>
          </div>

          {/* Add / Edit Payment Form */}
          <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4 space-y-3">
            <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
              {editingPaymentId ? 'Edit Payment' : 'Add Next Payment/Paycheck'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <input
                  type="number"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ backgroundColor: theme.bgS, borderColor: theme.border, color: theme.text }}
                  className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                />
              </div>
              <CalendarPicker
                value={newPaymentDate}
                onChange={setNewPaymentDate}
                placeholder="Date"
                theme={theme}
                showQuickSelect={false}
              />
            </div>
            <input
              type="text"
              value={newPaymentDesc}
              onChange={(e) => setNewPaymentDesc(e.target.value)}
              placeholder="Description (e.g., Paycheck, Client invoice)"
              style={{ backgroundColor: theme.bgS, borderColor: theme.border, color: theme.text }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {/* Recurrence selector */}
            <div>
              <label style={{ color: theme.textM }} className="block text-xs font-semibold mb-1">Recurrence</label>
              <div className="grid grid-cols-4 gap-2">
                {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setNewPaymentRecurrence(opt)}
                    className="py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all truncate"
                    style={{
                      backgroundColor: newPaymentRecurrence === opt ? theme.gold : theme.bgS,
                      color: newPaymentRecurrence === opt ? theme.bgS : theme.textM,
                      border: `1px solid ${newPaymentRecurrence === opt ? theme.gold : theme.border}`,
                    }}
                  >
                    {opt === 'none' ? 'One-time' : opt === 'biweekly' ? 'Bi-weekly' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={editingPaymentId ? saveEditPayment : addPayment}
                disabled={!newPaymentAmount || !newPaymentDate}
                style={{
                  backgroundColor: newPaymentAmount && newPaymentDate ? theme.gold : theme.border,
                  color: newPaymentAmount && newPaymentDate ? theme.bgS : theme.textM,
                }}
                className="flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> {editingPaymentId ? 'Update Payment' : 'Add Payment'}
              </motion.button>
              {editingPaymentId && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelEdit}
                  style={{ backgroundColor: theme.border, color: theme.text }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  Cancel
                </motion.button>
              )}
            </div>
          </div>

          {/* Payment Entries List */}
          {paymentEntries.length > 0 && (
            <div className="space-y-3">
              <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">Scheduled Payments</p>
              {paymentEntries
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p style={{ color: theme.text }} className="font-semibold truncate">{entry.description}</p>
                          {entry.status === 'received' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${theme.ok}20`, color: theme.ok }}>RECEIVED</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p style={{ color: theme.textM }} className="text-xs">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          {entry.recurrence && entry.recurrence !== 'none' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: `${theme.gold}20`, color: theme.gold }}>
                              {recurrenceLabel(entry.recurrence)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <p style={{ color: entry.status === 'received' ? theme.ok : '#22c55e' }} className="font-bold">+{fmt(entry.amount)}</p>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleStatus(entry.id)} style={{ color: entry.status === 'received' ? theme.ok : theme.textM }} className="hover:opacity-70" title={entry.status === 'received' ? 'Mark as expected' : 'Mark as received'}>
                          <Check size={16} />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => startEditPayment(entry)} style={{ color: theme.textM }} className="hover:opacity-70">
                          <Edit3 size={16} />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removePayment(entry.id)} style={{ color: theme.textM }} className="hover:opacity-70">
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ============== PAY SPLITTER ==============
  const renderCheckSplitter = () => {
    const billsList = (data.bills || []) as any[];
    const billsTotal = billsList.reduce((sum: number, bill: any) => sum + bill.amount, 0);
    const remaining = Math.max(0, checkAmount - billsTotal);

    const total = checkAmount || 1;
    const items = [
      { name: 'Set Aside for Bills', amount: billsTotal, color: '#ef4444' },
      { name: 'Remaining', amount: remaining, color: '#3b82f6' },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ color: theme.text }} className="text-2xl font-bold flex items-center gap-3">
            <DollarSign size={28} style={{ color: theme.gold }} />
            Pay Splitter
          </h3>
        </div>

        <div className="space-y-6">
          {/* Donut Chart */}
          <div className="flex justify-center">
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                {(() => {
                  let offset = 0;
                  return items.map((item, idx) => {
                    const pctVal = (item.amount / total) * 100;
                    const circumference = 2 * Math.PI * 45;
                    const strokeDashoffset = circumference - (pctVal / 100) * circumference;
                    const rotation = offset;
                    offset += pctVal;

                    return (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform={`rotate(${rotation * 3.6} 60 60)`}
                        strokeLinecap="round"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p style={{ color: theme.textM }} className="text-sm">Per Check</p>
                  <p style={{ color: theme.text }} className="text-3xl font-bold">
                    {fmt(checkAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bills Allocation Summary */}
          <div className="space-y-4">
            {items.map((item, idx) => {
              const pctVal = (item.amount / total) * 100;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                      <p style={{ color: theme.text }} className="font-semibold">
                        {item.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p style={{ color: theme.text }} className="font-bold">
                        {fmt(item.amount)}
                      </p>
                      <p style={{ color: theme.textM }} className="text-xs">
                        {pctVal.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pctVal)}%` }}
                      style={{ backgroundColor: item.color }}
                      className="h-full transition-all"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Individual Bill Breakdown */}
          {billsList.length > 0 && (
            <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4">
              <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase mb-3">Bill Breakdown</p>
              <div className="space-y-2">
                {billsList.map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bill.status === 'paid' ? theme.ok : '#ef4444' }} />
                      <span style={{ color: theme.text }} className="text-sm">{bill.name}</span>
                    </div>
                    <span style={{ color: theme.text }} className="text-sm font-semibold">{fmt(bill.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Set Aside Message */}
          <div style={{ backgroundColor: `${theme.gold}10`, borderColor: `${theme.gold}30` }} className="border rounded-lg p-4 text-center">
            <p style={{ color: theme.gold }} className="font-bold text-lg">{fmt(billsTotal)}</p>
            <p style={{ color: theme.textM }} className="text-sm mt-1">needs to be set aside for bills this period</p>
          </div>
        </div>
      </motion.div>
    );
  };

  // ============== SPLITTER (ALLOCATOR) ==============
  const [splitterMonth, setSplitterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [splitterIncomeMode, setSplitterIncomeMode] = useState<'auto' | 'manual'>('auto');
  const [splitterBillsMode, setSplitterBillsMode] = useState<'auto' | 'manual'>('auto');
  const [splitterManualIncome, setSplitterManualIncome] = useState('');
  const [splitterManualBills, setSplitterManualBills] = useState('');

  // Compute auto income for the selected month from Incoming Payments
  const splitterAutoIncome = useMemo(() => {
    const [y, m] = splitterMonth.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    return paymentEntries
      .filter(p => {
        const d = new Date(p.date + 'T00:00:00');
        if (p.recurrence && p.recurrence !== 'none') {
          // For recurring, check if any occurrence falls in month
          const interval = p.recurrence === 'weekly' ? 7 : p.recurrence === 'biweekly' ? 14 : 0;
          if (p.recurrence === 'monthly') {
            const day = Math.min(d.getDate(), monthEnd.getDate());
            const candidate = new Date(y, m - 1, day);
            return candidate >= d;
          } else if (interval > 0) {
            const cursor = new Date(d);
            while (cursor < monthStart) cursor.setDate(cursor.getDate() + interval);
            return cursor <= monthEnd;
          }
        }
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, p) => {
        if (p.recurrence === 'weekly') {
          // Count how many weeks fall in this month
          const d = new Date(p.date + 'T00:00:00');
          const cursor = new Date(d);
          while (cursor < monthStart) cursor.setDate(cursor.getDate() + 7);
          let count = 0;
          while (cursor <= monthEnd) { count++; cursor.setDate(cursor.getDate() + 7); }
          return sum + (p.amount * count);
        } else if (p.recurrence === 'biweekly') {
          const d = new Date(p.date + 'T00:00:00');
          const cursor = new Date(d);
          while (cursor < monthStart) cursor.setDate(cursor.getDate() + 14);
          let count = 0;
          while (cursor <= monthEnd) { count++; cursor.setDate(cursor.getDate() + 14); }
          return sum + (p.amount * count);
        }
        return sum + p.amount;
      }, 0);
  }, [paymentEntries, splitterMonth]);

  // Compute auto bills total for the selected month from Bill Boss
  const splitterAutoBills = useMemo(() => {
    const [y, m] = splitterMonth.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    return data.bills
      .filter(b => b.status !== 'paid')
      .reduce((sum, b) => {
        const due = new Date(b.due + 'T00:00:00');
        if (b.recurrence === 'monthly') {
          // Monthly recurring: always due once this month
          return sum + b.amount;
        } else if (b.recurrence === 'weekly') {
          const cursor = new Date(due);
          while (cursor < monthStart) cursor.setDate(cursor.getDate() + 7);
          let count = 0;
          while (cursor <= monthEnd) { count++; cursor.setDate(cursor.getDate() + 7); }
          return sum + (b.amount * count);
        } else if (b.recurrence === 'yearly') {
          if (due.getMonth() === m - 1) return sum + b.amount;
          return sum;
        } else {
          // One-time or other: check if due in this month
          if (due >= monthStart && due <= monthEnd) return sum + b.amount;
          return sum;
        }
      }, 0);
  }, [data.bills, splitterMonth]);

  const splitterIncome = splitterIncomeMode === 'auto' ? splitterAutoIncome : (parseFloat(splitterManualIncome) || 0);
  const splitterBillsTotal = splitterBillsMode === 'auto' ? splitterAutoBills : (parseFloat(splitterManualBills) || 0);
  const checkingBal = data.user?.checkingBalance || 0;
  const splitterTotalAvailable = splitterIncome + checkingBal;
  const splitterRemaining = Math.max(0, splitterTotalAvailable - splitterBillsTotal);

  // Weeks in the selected month
  const splitterWeeksInMonth = useMemo(() => {
    const [y, m] = splitterMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return daysInMonth / 7;
  }, [splitterMonth]);

  const splitterWeeklyAlloc = splitterBillsTotal / splitterWeeksInMonth;

  // Count upcoming payments in month for per-payment allocation
  const splitterPaymentCount = useMemo(() => {
    const [y, m] = splitterMonth.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);
    let count = 0;
    paymentEntries.forEach(p => {
      const d = new Date(p.date + 'T00:00:00');
      if (p.recurrence === 'weekly') {
        const cursor = new Date(d);
        while (cursor < monthStart) cursor.setDate(cursor.getDate() + 7);
        while (cursor <= monthEnd) { count++; cursor.setDate(cursor.getDate() + 7); }
      } else if (p.recurrence === 'biweekly') {
        const cursor = new Date(d);
        while (cursor < monthStart) cursor.setDate(cursor.getDate() + 14);
        while (cursor <= monthEnd) { count++; cursor.setDate(cursor.getDate() + 14); }
      } else if (p.recurrence === 'monthly') {
        count++;
      } else if (d >= monthStart && d <= monthEnd) {
        count++;
      }
    });
    return Math.max(count, 1);
  }, [paymentEntries, splitterMonth]);

  const splitterPerPayment = splitterBillsTotal / splitterPaymentCount;

  const renderSplitter = () => {
    const monthLabel = (() => {
      const [y, m] = splitterMonth.split('-').map(Number);
      return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    })();

    const handleMonthNav = (dir: number) => {
      const [y, m] = splitterMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + dir, 1);
      setSplitterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const pctBills = splitterTotalAvailable > 0 ? Math.min((splitterBillsTotal / splitterTotalAvailable) * 100, 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-4 sm:p-6"
      >
        <h3 style={{ color: theme.text }} className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
          <Layers size={24} className="flex-shrink-0" style={{ color: theme.gold }} />
          Splitter
        </h3>
        <p className="text-xs mb-5" style={{ color: theme.textM }}>
          Allocate your income toward bills — see exactly how much to set aside each week or paycheck.
        </p>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-5 rounded-lg p-3" style={{ backgroundColor: theme.bg }}>
          <button onClick={() => handleMonthNav(-1)} className="p-1.5 rounded-lg hover:opacity-70 transition-all" style={{ color: theme.textS }}>
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-semibold" style={{ color: theme.text }}>{monthLabel}</p>
          <button onClick={() => handleMonthNav(1)} className="p-1.5 rounded-lg hover:opacity-70 transition-all" style={{ color: theme.textS }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Income Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textM }}>Monthly Income</p>
            <div className="flex rounded-md overflow-hidden" style={{ backgroundColor: theme.bg }}>
              <button
                onClick={() => setSplitterIncomeMode('auto')}
                className="px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{ backgroundColor: splitterIncomeMode === 'auto' ? theme.gold : 'transparent', color: splitterIncomeMode === 'auto' ? theme.bg : theme.textM }}
              >
                Auto
              </button>
              <button
                onClick={() => setSplitterIncomeMode('manual')}
                className="px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{ backgroundColor: splitterIncomeMode === 'manual' ? theme.gold : 'transparent', color: splitterIncomeMode === 'manual' ? theme.bg : theme.textM }}
              >
                Manual
              </button>
            </div>
          </div>
          {splitterIncomeMode === 'auto' ? (
            <div className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: `${theme.ok}10`, border: `1px solid ${theme.ok}30` }}>
              <div>
                <p className="text-xs" style={{ color: theme.textM }}>From Incoming Payments</p>
                <p className="text-lg font-bold" style={{ color: theme.ok }}>{fmt(splitterAutoIncome)}</p>
              </div>
              {splitterAutoIncome === 0 && (
                <p className="text-[10px] max-w-[120px] text-right" style={{ color: theme.textM }}>No payments found for this month</p>
              )}
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: theme.textM }}>$</span>
              <input
                type="number" min="0" step="0.01"
                value={splitterManualIncome}
                onChange={e => setSplitterManualIncome(e.target.value)}
                placeholder="Enter monthly income"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: theme.input, borderColor: theme.border, borderWidth: '1px', color: theme.text }}
              />
            </div>
          )}
        </div>

        {/* Bills Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textM }}>Monthly Bills</p>
            <div className="flex rounded-md overflow-hidden" style={{ backgroundColor: theme.bg }}>
              <button
                onClick={() => setSplitterBillsMode('auto')}
                className="px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{ backgroundColor: splitterBillsMode === 'auto' ? theme.gold : 'transparent', color: splitterBillsMode === 'auto' ? theme.bg : theme.textM }}
              >
                Bill Boss
              </button>
              <button
                onClick={() => setSplitterBillsMode('manual')}
                className="px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{ backgroundColor: splitterBillsMode === 'manual' ? theme.gold : 'transparent', color: splitterBillsMode === 'manual' ? theme.bg : theme.textM }}
              >
                Manual
              </button>
            </div>
          </div>
          {splitterBillsMode === 'auto' ? (
            <div className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: `${theme.bad}08`, border: `1px solid ${theme.bad}30` }}>
              <div>
                <p className="text-xs" style={{ color: theme.textM }}>From Bill Boss ({monthLabel})</p>
                <p className="text-lg font-bold" style={{ color: theme.bad }}>{fmt(splitterAutoBills)}</p>
              </div>
              <p className="text-[10px] max-w-[120px] text-right" style={{ color: theme.textM }}>
                {data.bills.filter(b => b.status !== 'paid').length} unpaid bills
              </p>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: theme.textM }}>$</span>
              <input
                type="number" min="0" step="0.01"
                value={splitterManualBills}
                onChange={e => setSplitterManualBills(e.target.value)}
                placeholder="Enter monthly bills total"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: theme.input, borderColor: theme.border, borderWidth: '1px', color: theme.text }}
              />
            </div>
          )}
        </div>

        {/* Allocation Results */}
        {splitterIncome > 0 || splitterBillsTotal > 0 ? (
          <div className="space-y-4">
            {/* Visual bar */}
            <div>
              <div className="flex justify-between text-[11px] mb-1.5" style={{ color: theme.textM }}>
                <span>Bills ({Math.round(pctBills)}%)</span>
                <span>Remaining ({Math.round(100 - pctBills)}%)</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: theme.border }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctBills}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-l-full"
                  style={{ backgroundColor: theme.bad }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - pctBills}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-r-full"
                  style={{ backgroundColor: theme.ok }}
                />
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3">
              {checkingBal > 0 && (
                <div className="rounded-lg p-3" style={{ backgroundColor: `${theme.gold}0a`, border: `1px solid ${theme.gold}20` }}>
                  <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: theme.textM }}>Starting Balance</p>
                  <p className="text-base font-bold" style={{ color: theme.gold }}>{fmt(checkingBal)}</p>
                </div>
              )}
              <div className="rounded-lg p-3" style={{ backgroundColor: `${theme.ok}08`, border: `1px solid ${theme.ok}20` }}>
                <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: theme.textM }}>Total Available</p>
                <p className="text-base font-bold" style={{ color: theme.ok }}>{fmt(splitterTotalAvailable)}</p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: `${theme.bad}08`, border: `1px solid ${theme.bad}20` }}>
                <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: theme.textM }}>Total Bills</p>
                <p className="text-base font-bold" style={{ color: theme.bad }}>–{fmt(splitterBillsTotal)}</p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: `${theme.gold}0a`, border: `1px solid ${theme.gold}30` }}>
                <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: theme.textM }}>After Bills</p>
                <p className="text-base font-bold" style={{ color: theme.gold }}>{fmt(splitterRemaining)}</p>
              </div>
            </div>

            {/* Guidance Card */}
            <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.gold}08`, border: `1px solid ${theme.gold}25` }}>
              <p className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
                Based on your income and bills this month, you need to set aside:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.gold}20` }}>
                  <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Week</p>
                  <p style={{ color: theme.gold }} className="text-lg font-bold">{fmt(splitterWeeklyAlloc)}</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.ok}20` }}>
                  <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Day</p>
                  <p style={{ color: theme.ok }} className="text-lg font-bold">{fmt(splitterWeeklyAlloc / 7)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-6 text-center" style={{ backgroundColor: theme.bg }}>
            <p className="text-sm" style={{ color: theme.textM }}>
              Add income payments or bills to see your allocation plan.
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  // ============== INCOME HISTORY ==============
  const [editingActualId, setEditingActualId] = useState<string | null>(null);
  const [editingActualValue, setEditingActualValue] = useState('');

  const handleSaveActualAmount = (entryId: string) => {
    const val = parseFloat(editingActualValue) || 0;
    if (val <= 0) return;
    const updated = paycheckHistory.map(e =>
      e.id === entryId ? { ...e, actualAmount: val } as any : e
    );
    setPaycheckHistory(updated);
    try { setLocalSynced('orca-paycheck-history', JSON.stringify(updated)); } catch {}
    setEditingActualId(null);
    setEditingActualValue('');
  };

  const renderPaycheckHistory = () => {
    // Income History tracks only incoming payments (past, current, and future)
    const now = new Date();
    const pastPayments = paymentEntries.filter(p => p.status === 'received');
    const upcomingPayments = paymentEntries.filter(p => p.status !== 'received');
    const allSorted = [...pastPayments, ...upcomingPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
          <LineChart size={28} style={{ color: theme.ok }} />
          Income History
        </h3>

        {allSorted.length === 0 ? (
          <div style={{ backgroundColor: theme.bg }} className="rounded-lg p-6 text-center">
            <p style={{ color: theme.textM }} className="text-sm">
              No incoming payments recorded yet. Add payments above to start tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allSorted.map((entry) => {
              const isPast = entry.status === 'received';
              const isFuture = new Date(entry.date + 'T00:00:00') > now && entry.status !== 'received';
              return (
                <motion.div
                  key={entry.id}
                  whileHover={{ scale: 1.01 }}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isPast ? theme.ok : isFuture ? theme.warn : theme.gold }} />
                    <div>
                      <p style={{ color: theme.text }} className="font-medium text-sm">{entry.description}</p>
                      <p style={{ color: theme.textM }} className="text-xs">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {entry.recurrence && entry.recurrence !== 'none' && (
                          <span style={{ color: theme.gold }}> · {entry.recurrence === 'biweekly' ? 'Bi-weekly' : entry.recurrence.charAt(0).toUpperCase() + entry.recurrence.slice(1)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                      backgroundColor: isPast ? `${theme.ok}20` : isFuture ? `${theme.warn}20` : `${theme.gold}20`,
                      color: isPast ? theme.ok : isFuture ? theme.warn : theme.gold,
                    }}>
                      {isPast ? 'Received' : isFuture ? 'Upcoming' : 'Expected'}
                    </span>
                    <p style={{ color: '#22c55e' }} className="font-bold text-sm">
                      +{fmt(entry.amount)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  // ============== TAB: INCOME ==============
  const renderIncomeTab = () => {
    // Toggle between Incoming Payments, Check Projector, and Projection Calculator
    const renderProjectionToggle = () => (
      <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-3 mb-8">
        <div className="flex rounded-lg overflow-hidden gap-2" style={{ backgroundColor: theme.bg }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProjectionMode('payment')}
            style={{
              backgroundColor: projectionMode === 'payment' ? theme.gold : 'transparent',
              color: projectionMode === 'payment' ? theme.bgS : theme.textM,
            }}
            className="flex-1 py-2 font-semibold text-xs flex items-center justify-center gap-1 rounded-lg transition-all"
          >
            <Briefcase size={14} /> Incoming Payments
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProjectionMode('check')}
            style={{
              backgroundColor: projectionMode === 'check' ? theme.gold : 'transparent',
              color: projectionMode === 'check' ? theme.bgS : theme.textM,
            }}
            className="flex-1 py-2 font-semibold text-xs flex items-center justify-center gap-1 rounded-lg transition-all"
          >
            <DollarSign size={14} /> Check Projection
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProjectionMode('calculator')}
            style={{
              backgroundColor: projectionMode === 'calculator' ? theme.gold : 'transparent',
              color: projectionMode === 'calculator' ? theme.bgS : theme.textM,
            }}
            className="flex-1 py-2 font-semibold text-xs flex items-center justify-center gap-1 rounded-lg transition-all"
          >
            <Target size={14} /> Projection Calculator
          </motion.button>
        </div>
      </div>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {renderProjectionToggle()}

        {projectionMode === 'payment' ? (
          renderPaymentProjection()
        ) : projectionMode === 'check' ? (
          <>
            {renderCheckProjectionWithCalendar()}
          </>
        ) : (
          <ProjectionCalculator theme={theme} />
        )}

        {renderSplitter()}
        {renderPaycheckHistory()}
      </motion.div>
    );
  };

  // ============== TAB: SAVINGS ==============
  const syncSavingsToDashboard = (accounts: SavingsAccount[]) => {
    const totalSavings = accounts.reduce((sum, a) => sum + a.amount, 0);
    const updatedGoals = [...(data.goals || [])].filter(g => !g.id?.startsWith('savings-acct-'));
    accounts.forEach((acct) => {
      updatedGoals.push({
        id: `savings-acct-${acct.id}`,
        name: acct.name,
        target: acct.goal || 0,
        current: acct.amount,
        date: '',
        cType: 'fixed',
        cVal: 0,
        active: true,
      });
    });
    setData(prev => ({ ...prev, goals: updatedGoals }));
  };

  const addSavingsAccount = () => {
    if (!newAccountName.trim()) return;
    const newAcct: SavingsAccount = {
      id: `sa-${Date.now()}`,
      name: newAccountName.trim(),
      amount: 0,
      goal: 0,
      saved: false,
    };
    const updated = [...savingsAccounts, newAcct];
    setSavingsAccounts(updated);
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
    setNewAccountName('');
  };

  const updateSavingsAccount = (id: string, field: 'amount' | 'goal', value: number) => {
    setSavingsAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value, saved: false } : a));
  };

  const saveSavingsAccount = (id: string) => {
    const updated = savingsAccounts.map(a => a.id === id ? { ...a, saved: true } : a);
    setSavingsAccounts(updated);
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
    syncSavingsToDashboard(updated);
    setTimeout(() => {
      setSavingsAccounts(prev => prev.map(a => a.id === id ? { ...a, saved: false } : a));
    }, 2000);
  };

  const quickAddFunds = (id: string, addAmount: number) => {
    const updated = savingsAccounts.map(a =>
      a.id === id ? { ...a, amount: a.amount + addAmount, saved: true } : a
    );
    setSavingsAccounts(updated);
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
    syncSavingsToDashboard(updated);
    setTimeout(() => {
      setSavingsAccounts(prev => prev.map(a => a.id === id ? { ...a, saved: false } : a));
    }, 2000);
  };

  const removeSavingsAccount = (id: string) => {
    const updated = savingsAccounts.filter(a => a.id !== id);
    setSavingsAccounts(updated);
    setLocalSynced('orca-savings-accounts', JSON.stringify(updated));
    syncSavingsToDashboard(updated);
  };

  const renderSavingsTab = () => {
    const totalSavings = savingsAccounts.reduce((sum, a) => sum + a.amount, 0);
    const totalGoalAmount = savingsAccounts.reduce((sum, a) => sum + (a.goal || 0), 0);
    const overallProgress = totalGoalAmount > 0 ? (totalSavings / totalGoalAmount) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Total Savings Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-6"
        >
          <h3 style={{ color: theme.text }} className="text-xl font-bold mb-4 flex items-center gap-3">
            <DollarSign size={24} style={{ color: theme.gold }} />
            Total Savings
          </h3>
          <p style={{ color: theme.gold }} className="text-4xl font-bold mb-2">{fmt(totalSavings)}</p>
          {totalGoalAmount > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ color: theme.textM }} className="text-xs">Overall Progress</span>
                <span style={{ color: theme.text }} className="text-xs font-bold">{overallProgress.toFixed(1)}%</span>
              </div>
              <div style={{ backgroundColor: theme.bg }} className="h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, overallProgress)}%` }}
                  style={{ backgroundColor: overallProgress >= 100 ? theme.ok : theme.gold }}
                  className="h-full"
                />
              </div>
              <p style={{ color: theme.textM }} className="text-xs mt-1 text-right">Goal: {fmt(totalGoalAmount)}</p>
            </div>
          )}
          <p style={{ color: theme.textM }} className="text-sm mt-3">{savingsAccounts.length} account{savingsAccounts.length !== 1 ? 's' : ''}</p>
        </motion.div>

        {/* Savings Accounts */}
        {savingsAccounts.map((acct, idx) => {
          const acctProgress = acct.goal > 0 ? (acct.amount / acct.goal) * 100 : 0;
          return (
            <motion.div
              key={acct.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="border rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 style={{ color: theme.text }} className="text-lg font-bold">{acct.name}</h4>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeSavingsAccount(acct.id)}
                  style={{ color: theme.textM }}
                  className="hover:opacity-70"
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>

              {/* Current balance */}
              <p style={{ color: theme.gold }} className="text-2xl font-bold mb-3">{fmt(acct.amount)}</p>

              {/* Goal progress bar */}
              {acct.goal > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ color: theme.textM }} className="text-xs">Progress</span>
                    <span style={{ color: theme.text }} className="text-xs font-bold">{Math.min(acctProgress, 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ backgroundColor: theme.bg }} className="h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, acctProgress)}%`, backgroundColor: acctProgress >= 100 ? '#22c55e' : theme.gold }} />
                  </div>
                  <p style={{ color: theme.textM }} className="text-xs mt-1">{fmt(acct.amount)} of {fmt(acct.goal)} goal</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Edit balance */}
                <div>
                  <label style={{ color: theme.textS }} className="block text-xs font-semibold mb-1">Edit Balance</label>
                  <div className="relative">
                    <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                    <input
                      type="number"
                      value={acct.amount || ''}
                      onChange={(e) => updateSavingsAccount(acct.id, 'amount', parseFloat(e.target.value) || 0)}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      className="w-full border rounded-lg pl-7 pr-3 py-2.5 font-semibold text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Savings goal */}
                <div>
                  <label style={{ color: theme.textS }} className="block text-xs font-semibold mb-1">Savings Goal</label>
                  <div className="relative">
                    <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                    <input
                      type="number"
                      value={acct.goal || ''}
                      onChange={(e) => updateSavingsAccount(acct.id, 'goal', parseFloat(e.target.value) || 0)}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      className="w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm"
                      placeholder="Set a goal (optional)"
                    />
                  </div>
                </div>

                {/* Quick add funds buttons + custom amount */}
                <div>
                  <label style={{ color: theme.textS }} className="block text-xs font-semibold mb-1">Quick Add</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[10, 25, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => quickAddFunds(acct.id, amt)}
                        style={{ backgroundColor: `${theme.gold}15`, color: theme.gold, borderColor: `${theme.gold}30` }}
                        className="py-2 rounded-lg text-xs font-semibold border active:scale-95 transition-all"
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                      <input
                        type="number"
                        value={customAddAmounts[acct.id] || ''}
                        onChange={(e) => setCustomAddAmounts(prev => ({ ...prev, [acct.id]: e.target.value }))}
                        placeholder="Custom amount"
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                        className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const amt = parseFloat(customAddAmounts[acct.id] || '0');
                        if (amt > 0) {
                          quickAddFunds(acct.id, amt);
                          setCustomAddAmounts(prev => ({ ...prev, [acct.id]: '' }));
                        }
                      }}
                      disabled={!customAddAmounts[acct.id] || parseFloat(customAddAmounts[acct.id] || '0') <= 0}
                      style={{
                        backgroundColor: customAddAmounts[acct.id] && parseFloat(customAddAmounts[acct.id] || '0') > 0 ? theme.gold : theme.border,
                        color: customAddAmounts[acct.id] && parseFloat(customAddAmounts[acct.id] || '0') > 0 ? theme.bgS : theme.textM,
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => saveSavingsAccount(acct.id)}
                  style={{
                    backgroundColor: acct.saved ? theme.ok : theme.gold,
                    color: theme.bgS,
                  }}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {acct.saved ? <><Check size={16} /> Saved!</> : <><Target size={16} /> Save Changes</>}
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {/* Add New Account */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-5 border-dashed"
        >
          <p style={{ color: theme.textS }} className="text-sm font-semibold mb-3">Add Savings Account</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSavingsAccount()}
              placeholder="Account name (e.g., Emergency Fund)"
              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
              className="flex-1 border rounded-lg px-3 py-2.5 text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addSavingsAccount}
              disabled={!newAccountName.trim()}
              style={{
                backgroundColor: newAccountName.trim() ? theme.gold : theme.border,
                color: newAccountName.trim() ? theme.bgS : theme.textM,
              }}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm disabled:cursor-not-allowed"
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ============== TAB: CREDIT ==============
  const renderCreditTab = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Credit Score Overview */}
        <motion.div
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-6"
        >
          <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Zap size={28} style={{ color: theme.gold }} />
            Credit Score
          </h3>

          <div className="grid grid-cols-2 gap-6">
            {/* Current Score */}
            <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-6 text-center">
              <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
                Current Score
              </p>
              <p style={{ color: theme.gold }} className="text-4xl font-bold">
                {creditScore}
              </p>
              <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creditScore / 850) * 100}%` }}
                  style={{ backgroundColor: theme.ok }}
                  className="h-full"
                />
              </div>
            </div>

            {/* Simulated Score */}
            <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-6 text-center">
              <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
                Simulated Score
              </p>
              <p style={{ color: creditScoreSim > creditScore ? theme.ok : creditScoreSim < creditScore ? theme.bad : theme.gold }} className="text-4xl font-bold">
                {creditScoreSim}
              </p>
              <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creditScoreSim / 850) * 100}%` }}
                  style={{ backgroundColor: creditScoreSim > creditScore ? theme.ok : creditScoreSim < creditScore ? theme.bad : theme.warn }}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Impact Analysis */}
        <motion.div
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-6"
        >
          <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase mb-4">
            Impact Analysis
          </p>

          {creditScoreSim > creditScore ? (
            <div className="flex items-start gap-3">
              <TrendingUp size={20} style={{ color: theme.ok }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p style={{ color: theme.ok }} className="font-semibold">
                  Score Improvement
                </p>
                <p style={{ color: theme.textM }} className="text-sm">
                  +{creditScoreSim - creditScore} points • Better loan rates possible
                </p>
              </div>
            </div>
          ) : creditScoreSim < creditScore ? (
            <div className="flex items-start gap-3">
              <TrendingDown size={20} style={{ color: theme.bad }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p style={{ color: theme.bad }} className="font-semibold">
                  Score Decline
                </p>
                <p style={{ color: theme.textM }} className="text-sm">
                  {creditScoreSim - creditScore} points • May affect loan eligibility
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <CheckCircle size={20} style={{ color: theme.ok }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p style={{ color: theme.ok }} className="font-semibold">
                  No Change
                </p>
                <p style={{ color: theme.textM }} className="text-sm">
                  Score remains stable
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Simulation Controls */}
        <motion.div
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-6"
        >
          <h4 style={{ color: theme.text }} className="text-lg font-bold mb-4">
            Simulate Changes
          </h4>

          <div className="space-y-4">
            <div>
              <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">
                Adjust Simulated Score
              </label>
              <input
                type="range"
                min="300"
                max="850"
                value={creditScoreSim}
                onChange={(e) => setCreditScoreSim(parseInt(e.target.value))}
                style={{ width: '100%' }}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span style={{ color: theme.textM }} className="text-xs">
                  300 (Poor)
                </span>
                <span style={{ color: theme.textM }} className="text-xs">
                  850 (Excellent)
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCreditScoreSim(creditScore)}
              style={{
                backgroundColor: theme.border,
                color: theme.text,
              }}
              className="w-full py-2 rounded-lg font-semibold transition-all"
            >
              Reset Simulation
            </motion.button>
          </div>
        </motion.div>
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
    <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
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

        {/* Tabs */}
        <div
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="border rounded-xl p-2 mb-8 flex gap-2"
        >
          {(['income', 'savings'] as Tab[]).map((tab) => (
            <motion.button
              key={tab}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? theme.gold : 'transparent',
                color: activeTab === tab ? theme.bgS : theme.text,
              }}
              className="flex-1 py-3 rounded-lg font-semibold capitalize transition-all"
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'income' && renderIncomeTab()}
        {activeTab === 'savings' && renderSavingsTab()}
      </div>
    </div>
  );
}

// Helper icon component (Info icon placeholder)
function Info({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}
