'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home, ExternalLink, Layers, ChevronLeft, ChevronRight,
  Wallet, BarChart3, Calculator, Clock
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

/** Convert local PaymentEntry[] → OrcaData-compatible IncomingPayment[] */
function toIncomingPayments(entries: PaymentEntry[]) {
  return entries.map(p => ({
    id: p.id,
    amount: p.amount,
    date: p.date,
    description: p.description,
    type: (p.recurrence && p.recurrence !== 'none' ? 'recurring' : 'one-time') as 'one-time' | 'recurring',
    recurrence: (p.recurrence && p.recurrence !== 'none' ? p.recurrence : undefined) as 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | undefined,
    status: (p.status || 'expected') as 'expected' | 'received' | 'overdue',
  }));
}

// ============== PROJECTION CALCULATOR COMPONENT ==============
function ProjectionCalculator({ theme, currentTheme }: { theme: any; currentTheme: any }) {
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
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
          <Target size={20} style={{ color: currentTheme.primary }} />
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
            backgroundColor: currentTheme.primary,
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
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Week</p>
                <p style={{ color: currentTheme.primary }} className="text-lg font-bold">{fmt(result.perWeek)}</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Day</p>
                <p style={{ color: currentTheme.primary }} className="text-lg font-bold">{fmt(result.perDay)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function SmartStackPage() {
  const { theme, isDark, currentTheme } = useTheme();
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
  const [savingsViewMode, setSavingsViewMode] = useState<'list' | 'compact'>('list');

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

  // Splitter mode: auto pulls from data, manual lets user type custom values
  const [splitterIncomeMode, setSplitterIncomeMode] = useState<'auto' | 'manual'>(() => {
    if (typeof window !== 'undefined') {
      try { return (localStorage.getItem('orca-splitter-income-mode') as 'auto' | 'manual') || 'auto' } catch {}
    }
    return 'auto';
  });
  const [splitterBillsMode, setSplitterBillsMode] = useState<'auto' | 'manual'>(() => {
    if (typeof window !== 'undefined') {
      try { return (localStorage.getItem('orca-splitter-bills-mode') as 'auto' | 'manual') || 'auto' } catch {}
    }
    return 'auto';
  });
  const [manualIncome, setManualIncome] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('orca-splitter-manual-income') || '' } catch {}
    }
    return '';
  });
  const [manualBills, setManualBills] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('orca-splitter-manual-bills') || '' } catch {}
    }
    return '';
  });

  // Splitter month navigation
  const now = new Date();
  const [splitterMonth, setSplitterMonth] = useState(now.getMonth());
  const [splitterYear, setSplitterYear] = useState(now.getFullYear());

  const handleSplitterPrevMonth = () => {
    setSplitterMonth(prev => {
      if (prev === 0) {
        setSplitterYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleSplitterNextMonth = () => {
    setSplitterMonth(prev => {
      if (prev === 11) {
        setSplitterYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

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
  const [paymentFormError, setPaymentFormError] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

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
  const [weekendsEnabled, setWeekendsEnabled] = useState(true);

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

    let totalScheduledDays = 0;
    let workDays = 0;
    const d = new Date(effectivePeriod.start);
    while (d <= effectivePeriod.end) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;

      // A weekend day counts as scheduled if:
      // - weekendsEnabled is true (global toggle), OR
      // - the specific date is in weekendWorkDays (individual override)
      const isScheduled = !isWknd || weekendsEnabled || weekendWorkDays.includes(dateStr);

      if (isScheduled) {
        totalScheduledDays++;
        if (!daysOff.some((off) => off.date === dateStr)) {
          workDays++;
        }
      }
      d.setDate(d.getDate() + 1);
    }

    if (totalScheduledDays === 0) return effectiveNetIncome;
    return effectiveNetIncome * (workDays / totalScheduledDays);
  }, [effectiveNetIncome, effectivePeriod, daysOff, weekendWorkDays, weekendsEnabled]);

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
        if (weekendsEnabled) {
          // When weekends globally enabled, toggle day off like any weekday
          setDaysOff((prev) => {
            const exists = prev.find((d) => d.date === dateStr);
            if (exists) {
              return prev.filter((d) => d.date !== dateStr);
            } else {
              return [...prev, { date: dateStr }];
            }
          });
        } else {
          // When weekends globally disabled, toggle individual override
          const isMarkedWorking = weekendWorkDays.includes(dateStr);
          if (isMarkedWorking) {
            setWeekendWorkDays(prev => prev.filter(d => d !== dateStr));
          } else {
            setWeekendWorkDays(prev => [...prev, dateStr]);
          }
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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${currentTheme.primary}20` }}>
            <BarChart3 size={20} style={{ color: currentTheme.primary }} />
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
            <div className="flex gap-2 rounded-2xl p-1" style={{ backgroundColor: `${currentTheme.primary}20`, border: `1px solid ${currentTheme.primary}` }}>
              <button
                onClick={() => setProjFreq('weekly')}
                className="flex-1 py-3 rounded-2xl text-sm transition-all font-bold"
                style={{
                  backgroundColor: projFreq === 'weekly' ? currentTheme.primary : 'transparent',
                  color: projFreq === 'weekly' ? '#fff' : currentTheme.primaryLight,
                }}
              >
                Weekly
              </button>
              <button
                onClick={() => setProjFreq('biweekly')}
                className="flex-1 py-3 rounded-2xl text-sm transition-all font-bold"
                style={{
                  backgroundColor: projFreq === 'biweekly' ? currentTheme.primary : 'transparent',
                  color: projFreq === 'biweekly' ? '#fff' : currentTheme.primaryLight,
                }}
              >
                Bi-Weekly
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-full">
            <div className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 flex-wrap max-w-full" style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary, border: `1px solid ${currentTheme.primary}` }}>
              <span>📅</span>
              <span className="truncate">{effectivePeriod.label}</span>
              <span className="px-1.5 py-0.5 rounded text-xs whitespace-nowrap" style={{ background: currentTheme.primary, color: '#fff', fontWeight: 700 }}>Current</span>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
            <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom Pay Period (Optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs mb-1" style={{ color: theme.textM }}>Start Date</label>
                <CalendarPicker value={customPeriodStart} onChange={setCustomPeriodStart} placeholder="Select start date" theme={theme} showQuickSelect={false} />
              </div>
              <div className="min-w-0">
                <label className="block text-xs mb-1" style={{ color: theme.textM }}>End Date</label>
                <CalendarPicker value={customPeriodEnd} onChange={setCustomPeriodEnd} placeholder="Select end date" theme={theme} showQuickSelect={false} />
              </div>
            </div>
            {customPeriodStart && customPeriodEnd && (
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                <span className="text-xs" style={{ color: theme.textM }}>Custom period active</span>
                <button onClick={() => { setCustomPeriodStart(''); setCustomPeriodEnd(''); }}
                  className="text-xs px-2 py-1 rounded-lg" style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}>
                  Clear
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pay Period Calendar</div>
              <div className="text-xs" style={{ color: theme.textM }}>Click to toggle days on/off</div>
            </div>

            {/* Weekend toggle */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-3" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
              <div>
                <span className="text-xs font-semibold" style={{ color: theme.text }}>Include Weekends</span>
                <span className="text-xs ml-1.5" style={{ color: theme.textM }}>({weekendsEnabled ? 'on' : 'off'})</span>
              </div>
              <button
                onClick={() => setWeekendsEnabled(prev => !prev)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: weekendsEnabled ? currentTheme.primary : theme.border }}
              >
                <div className="absolute top-0.5 rounded-full w-5 h-5 bg-white shadow transition-transform"
                  style={{ transform: weekendsEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
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
                  // A day is "active" (scheduled to work) if it's a weekday, or weekend with global toggle on, or individually overridden
                  const isActive = day && (!wk || weekendsEnabled || wkWork);
                  const isOff = off || (wk && !weekendsEnabled && !wkWork);

                  return (
                    <button
                      key={`${week}-${dayIdx}`}
                      onClick={() => day && toggleDayOff(day)}
                      className="flex flex-col items-center justify-center rounded-xl transition-all"
                      style={{
                        height: 52,
                        backgroundColor: day ? (isOff ? theme.bg : isActive ? `${currentTheme.primary}20` : theme.bg) : 'transparent',
                        border: day ? `1px solid ${isOff ? theme.border : isActive ? currentTheme.primary : theme.border}` : 'none',
                        opacity: 1,
                        cursor: day ? 'pointer' : 'default',
                      }}
                    >
                      {day && (
                        <>
                          <span className="text-xs" style={{ color: theme.textM, fontWeight: 500 }}>{day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: isOff ? theme.textM : isActive ? currentTheme.primary : theme.textM }}>
                            {day.getDate()}
                          </span>
                          <span className="text-xs" style={{ color: isOff ? theme.textM : isActive ? currentTheme.primary : theme.textM, fontSize: 9 }}>
                            {isOff ? 'off' : isActive ? 'on' : 'off'}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: `${currentTheme.primary}20`, border: `1px solid ${currentTheme.primary}` }}>
            <div className="text-xs mb-1" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projected Check Amount</div>
            <div className="text-2xl sm:text-[32px] break-words" style={{ fontWeight: 900, color: currentTheme.primary }}>${projectedCheckAmount.toFixed(2)}</div>
            <div className="text-xs mt-1 break-words" style={{ color: theme.textM }}>Based on ${effectiveNetIncome.toFixed(2)} net income · {Math.round((projectedCheckAmount / effectiveNetIncome) * 7)} work days</div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderIncomeTab = () => {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex rounded-2xl overflow-hidden p-1 w-full max-w-full" style={{ backgroundColor: `${currentTheme.primary}20`, border: `1px solid ${currentTheme.primary}` }}>
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
                backgroundColor: projectionMode === key ? currentTheme.primary : 'transparent',
                color: projectionMode === key ? '#fff' : currentTheme.primaryLight,
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                <Wallet className="w-5 h-5" style={{ color: currentTheme.primary }} />
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
                      style={{ backgroundColor: newPaymentRecurrence === r ? currentTheme.primary : (theme.border), color: newPaymentRecurrence === r ? '#fff' : theme.textM, fontWeight: newPaymentRecurrence === r ? 700 : 400 }}>
                      {r.replace('-', '‑')}
                    </button>
                  ))}
                </div>
              </div>
              {paymentFormError && (
                <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{paymentFormError}
                </div>
              )}
              <div className="flex gap-2">
                {editingPaymentId && (
                  <button
                    className="py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all font-bold"
                    style={{ backgroundColor: theme.border, color: theme.textM }}
                    onClick={() => {
                      setEditingPaymentId(null);
                      setNewPaymentAmount('');
                      setNewPaymentDate('');
                      setNewPaymentDesc('');
                      setNewPaymentRecurrence('none');
                      setPaymentFormError('');
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all font-bold"
                  style={{ backgroundColor: editingPaymentId ? currentTheme.primary : currentTheme.primary, color: '#fff' }}
                  onClick={() => {
                    const amt = parseFloat(newPaymentAmount);
                    if (!amt || amt <= 0 || !newPaymentDate || !newPaymentDesc.trim()) {
                      setPaymentFormError(!newPaymentAmount ? 'Enter an amount' : !newPaymentDate ? 'Pick a date' : !newPaymentDesc.trim() ? 'Add a description' : 'Enter a valid amount');
                      return;
                    }
                    setPaymentFormError('');

                    let updated: PaymentEntry[];
                    if (editingPaymentId) {
                      // Update existing payment
                      updated = paymentEntries.map(e => e.id === editingPaymentId ? { ...e, amount: amt, date: newPaymentDate, description: newPaymentDesc.trim(), recurrence: newPaymentRecurrence } : e);
                    } else {
                      // Add new payment
                      const entry: PaymentEntry = {
                        id: crypto.randomUUID(),
                        amount: amt,
                        date: newPaymentDate,
                        description: newPaymentDesc.trim(),
                        recurrence: newPaymentRecurrence,
                        status: 'expected',
                      };
                      updated = [...paymentEntries, entry];
                    }
                    setPaymentEntries(updated);
                    setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                    setData(prev => ({ ...prev, incomingPayments: toIncomingPayments(updated) }));
                    // Reset form
                    setEditingPaymentId(null);
                    setNewPaymentAmount('');
                    setNewPaymentDate('');
                    setNewPaymentDesc('');
                    setNewPaymentRecurrence('none');
                  }}
                >
                  {editingPaymentId ? <><Edit3 className="w-4 h-4" />Update Payment</> : <><Plus className="w-4 h-4" />Add Payment</>}
                </button>
              </div>
            </div>

            <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled Payments</div>
            {paymentEntries.length === 0 ? (
              <div className="text-sm" style={{ color: theme.textM }}>No payments scheduled</div>
            ) : (
              <div className="space-y-2">
              {paymentEntries.map(p => (
                <div key={p.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl transition-all" style={{ border: `1px solid ${theme.border}` }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.status === 'received' ? '#6B7280' : '#10B981' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ fontWeight: 700, color: theme.text }}>{p.description}</div>
                    <div className="text-xs" style={{ color: theme.textM }}>{p.date} · {p.recurrence && p.recurrence !== 'none' ? p.recurrence.replace('-', '‑') : 'One‑time'}</div>
                  </div>
                  <span className="px-2 py-1 rounded-full text-[10px] sm:text-xs flex-shrink-0" style={{
                    backgroundColor: p.status === 'received' ? '#E5E7EB' : '#DCFCE7',
                    color: p.status === 'received' ? '#6B7280' : '#16A34A',
                    fontWeight: 600,
                  }}>{p.status === 'received' ? 'Received' : 'Expected'}</span>
                  <div className="flex-shrink-0" style={{ fontSize: 15, fontWeight: 800, color: p.status === 'received' ? '#6B7280' : '#10B981' }}>+${p.amount.toFixed(2)}</div>
                  <div className="flex gap-1 flex-shrink-0">
                    {p.status !== 'received' && (
                      <button title="Mark received" onClick={() => {
                        const updated = paymentEntries.map(e => e.id === p.id ? { ...e, status: 'received' as const } : e);
                        setPaymentEntries(updated);
                        setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                        setData(prev => ({ ...prev, incomingPayments: toIncomingPayments(updated) }));
                      }} className="p-1.5 rounded-lg hover:opacity-80 transition-all" style={{ color: '#10B981' }}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button title="Edit payment" onClick={() => {
                      setEditingPaymentId(p.id);
                      setNewPaymentAmount(String(p.amount));
                      setNewPaymentDate(p.date);
                      setNewPaymentDesc(p.description);
                      setNewPaymentRecurrence(p.recurrence || 'none');
                    }} className="p-1.5 rounded-lg hover:opacity-80 transition-all" style={{ color: currentTheme.primary }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button title="Delete payment" onClick={() => {
                      const updated = paymentEntries.filter(e => e.id !== p.id);
                      setPaymentEntries(updated);
                      setLocalSynced('orca-payment-entries', JSON.stringify(updated));
                      setData(prev => ({ ...prev, incomingPayments: toIncomingPayments(updated) }));
                    }} className="p-1.5 rounded-lg hover:opacity-80 transition-all" style={{ color: '#EF4444' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SPLITTER — always shown below Incoming Payments ─── */}
        {projectionMode === 'payment' && (() => {
          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
          const daysInMonth = new Date(splitterYear, splitterMonth + 1, 0).getDate()

          // Helper: expand recurring payments into a given month
          function getRecurringAmountForMonth(entries: PaymentEntry[], monthIdx: number, year: number): number {
            let total = 0;
            const monthStart = new Date(year, monthIdx, 1);
            const monthEnd = new Date(year, monthIdx + 1, 0);

            entries.forEach(p => {
              const baseDate = new Date(p.date + 'T00:00:00');

              if (!p.recurrence || p.recurrence === 'none') {
                // One-time: exact month match
                if (baseDate.getMonth() === monthIdx && baseDate.getFullYear() === year) {
                  total += p.amount;
                }
              } else if (p.recurrence === 'monthly') {
                // Monthly: occurs once per month if base date <= month end
                if (baseDate <= monthEnd) {
                  total += p.amount;
                }
              } else {
                // Weekly (7) or biweekly (14)
                const interval = p.recurrence === 'weekly' ? 7 : 14;
                const cursor = new Date(baseDate);
                // Fast-forward near the month
                if (cursor < monthStart) {
                  const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * interval)) * interval;
                  cursor.setDate(cursor.getDate() + gap);
                }
                while (cursor <= monthEnd) {
                  if (cursor >= monthStart && cursor >= baseDate) {
                    total += p.amount;
                  }
                  cursor.setDate(cursor.getDate() + interval);
                }
              }
            });

            return total;
          }

          // Helper: expand recurring bills into a given month
          function getRecurringBillsForMonth(bills: any[], monthIdx: number, year: number): number {
            let total = 0;
            const monthStart = new Date(year, monthIdx, 1);
            const monthEnd = new Date(year, monthIdx + 1, 0);

            bills.forEach(b => {
              const baseDate = new Date((b.due || '') + 'T00:00:00');

              if (!b.recurrence || b.recurrence === 'none') {
                // One-time: exact month match
                if (baseDate.getMonth() === monthIdx && baseDate.getFullYear() === year) {
                  total += b.amount;
                }
              } else if (b.recurrence === 'monthly') {
                // Monthly: occurs once per month if base date <= month end
                if (baseDate <= monthEnd) {
                  total += b.amount;
                }
              } else {
                // Weekly (7) or biweekly (14)
                const interval = b.recurrence === 'weekly' ? 7 : 14;
                const cursor = new Date(baseDate);
                // Fast-forward near the month
                if (cursor < monthStart) {
                  const gap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * interval)) * interval;
                  cursor.setDate(cursor.getDate() + gap);
                }
                while (cursor <= monthEnd) {
                  if (cursor >= monthStart && cursor >= baseDate) {
                    total += b.amount;
                  }
                  cursor.setDate(cursor.getDate() + interval);
                }
              }
            });

            return total;
          }

          // Auto income from payment entries (including recurring) for selected month
          const autoIncome = getRecurringAmountForMonth(paymentEntries, splitterMonth, splitterYear)

          // Auto bills from Bill Boss (including recurring) for selected month
          const autoBills = getRecurringBillsForMonth(data.bills || [], splitterMonth, splitterYear)

          // Use auto or manual based on toggle
          const monthlyIncome = splitterIncomeMode === 'manual' ? (parseFloat(manualIncome) || 0) : autoIncome
          const monthlyBills = splitterBillsMode === 'manual' ? (parseFloat(manualBills) || 0) : autoBills

          const unpaidBillCount = (data.bills || []).filter((b: any) => b.status !== 'paid').length
          const afterBills = Math.max(0, monthlyIncome - monthlyBills)
          const billPct = monthlyIncome > 0 ? Math.min(100, Math.round((monthlyBills / monthlyIncome) * 100)) : 0
          const perWeek = monthlyBills / (daysInMonth / 7)
          const perDay = monthlyBills / daysInMonth

          const ModeToggle = ({ mode, setMode, storageKey }: { mode: 'auto' | 'manual'; setMode: (m: 'auto' | 'manual') => void; storageKey: string }) => (
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              {(['auto', 'manual'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); try { localStorage.setItem(storageKey, m) } catch {} }}
                  className="px-3 py-1 text-xs capitalize transition-all"
                  style={{ background: mode === m ? currentTheme.primary : 'transparent', color: mode === m ? '#fff' : theme.textM, fontWeight: mode === m ? 700 : 400 }}>
                  {m}
                </button>
              ))}
            </div>
          )

          return (
            <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentTheme.primary}20` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: currentTheme.primary }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Splitter</h2>
                  <p className="text-xs" style={{ color: theme.textM }}>Allocate your income toward bills — see exactly how much to set aside each week or paycheck</p>
                </div>
              </div>

              {/* Month label with navigation */}
              <div className="flex items-center justify-center gap-4 mb-5">
                <button onClick={handleSplitterPrevMonth} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ backgroundColor: theme.border }}>
                  <ChevronLeft className="w-4 h-4" style={{ color: theme.text }} />
                </button>
                <span style={{ fontWeight: 700, color: theme.text, fontSize: 15, minWidth: 150, textAlign: 'center' }}>{monthNames[splitterMonth]} {splitterYear}</span>
                <button onClick={handleSplitterNextMonth} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ backgroundColor: theme.border }}>
                  <ChevronRight className="w-4 h-4" style={{ color: theme.text }} />
                </button>
              </div>

              {/* Income vs Bills cards with Auto/Manual toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl p-4" style={{ background: isDark ? '#052E16' : '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Income</span>
                    <ModeToggle mode={splitterIncomeMode} setMode={setSplitterIncomeMode} storageKey="orca-splitter-income-mode" />
                  </div>
                  <div className="text-xs mb-1" style={{ color: theme.textM }}>
                    {splitterIncomeMode === 'auto' ? 'From Incoming Payments' : 'Custom amount'}
                  </div>
                  {splitterIncomeMode === 'manual' ? (
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#16A34A', fontWeight: 700 }}>$</span>
                      <input type="number" placeholder="0.00" value={manualIncome}
                        onChange={e => { setManualIncome(e.target.value); try { localStorage.setItem('orca-splitter-manual-income', e.target.value) } catch {} }}
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-lg outline-none"
                        style={{ background: isDark ? '#064E3B' : '#DCFCE7', border: '1px solid #BBF7D0', color: '#16A34A', fontWeight: 800 }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  )}
                  {splitterIncomeMode === 'auto' && monthlyIncome === 0 && <div className="text-xs mt-1" style={{ color: theme.textM }}>No payments found for this month</div>}
                </div>

                <div className="rounded-xl p-4" style={{ background: isDark ? '#2D0A0A' : '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Bills</span>
                    <ModeToggle mode={splitterBillsMode} setMode={setSplitterBillsMode} storageKey="orca-splitter-bills-mode" />
                  </div>
                  <div className="text-xs mb-1" style={{ color: theme.textM }}>
                    {splitterBillsMode === 'auto' ? `From Bill Boss (${monthNames[splitterMonth]} ${splitterYear})` : 'Custom amount'}
                  </div>
                  {splitterBillsMode === 'manual' ? (
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#EF4444', fontWeight: 700 }}>$</span>
                      <input type="number" placeholder="0.00" value={manualBills}
                        onChange={e => { setManualBills(e.target.value); try { localStorage.setItem('orca-splitter-manual-bills', e.target.value) } catch {} }}
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-lg outline-none"
                        style={{ background: isDark ? '#450A0A' : '#FEE2E2', border: '1px solid #FECACA', color: '#EF4444', fontWeight: 800 }} />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>−${monthlyBills.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs mt-1" style={{ color: theme.textM }}>{unpaidBillCount} unpaid bill{unpaidBillCount !== 1 ? 's' : ''}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: theme.textM }}>
                  <span>Bills ({billPct}%)</span><span>Remaining ({100 - billPct}%)</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 10, background: '#10B981' }}>
                  <div className="h-full rounded-full" style={{ width: `${billPct}%`, background: '#EF4444' }} />
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Available', val: `$${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#10B981', bg: isDark ? '#052E16' : '#F0FDF4', border: '#BBF7D0' },
                  { label: 'Total Bills', val: `−$${monthlyBills.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#EF4444', bg: isDark ? '#2D0A0A' : '#FEF2F2', border: '#FECACA' },
                  { label: 'After Bills', val: `$${afterBills.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#10B981', bg: isDark ? '#052E16' : '#F0FDF4', border: '#BBF7D0' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3.5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="text-xs mb-1" style={{ color: theme.textM, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Per period breakdown */}
              <div className="rounded-xl p-4" style={{ background: isDark ? '#164E63' : '#E0F9FC', border: `1px solid ${isDark ? '#0E7490' : '#A5F3FC'}`, overflow: 'hidden' }}>
                <p className="text-sm mb-3" style={{ color: theme.textM }}>Based on your income and bills this month, you need to set aside:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3.5 text-center" style={{ background: isDark ? '#155E75' : '#CFFAFE', border: `1px solid ${isDark ? '#0E7490' : '#A5F3FC'}`, overflow: 'hidden' }}>
                    <div className="text-xs mb-1" style={{ color: currentTheme.primary, fontWeight: 600 }}>Per Week</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: currentTheme.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${perWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-xl p-3.5 text-center" style={{ background: isDark ? '#052E16' : '#F0FDF4', border: '1px solid #BBF7D0', overflow: 'hidden' }}>
                    <div className="text-xs mb-1" style={{ color: '#10B981', fontWeight: 600 }}>Per Day</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${perDay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {projectionMode === 'check' && renderCheckProjectionWithCalendar()}

        {projectionMode === 'calculator' && <ProjectionCalculator theme={theme} currentTheme={currentTheme} />}
      </motion.div>
    );
  };

  const renderSavingsTab = () => {
    const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.amount, 0);

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="rounded-2xl p-5" style={{ backgroundColor: `${currentTheme.primary}20`, border: `1px solid ${currentTheme.primary}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: currentTheme.primary }} />
            <span className="text-sm" style={{ fontWeight: 700, color: currentTheme.primary }}>Total Savings</span>
          </div>
          <div className="text-2xl sm:text-[32px] break-words" style={{ fontWeight: 900, color: currentTheme.primary }}>${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs mt-1" style={{ color: theme.textM }}>{savingsAccounts.length} account{savingsAccounts.length !== 1 ? 's' : ''}</div>
        </div>

        {/* List / Compact Toggle */}
        <div className="flex gap-2">
          {(['list', 'compact'] as const).map(mode => (
            <button key={mode} onClick={() => setSavingsViewMode(mode)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize"
              style={{ backgroundColor: savingsViewMode === mode ? currentTheme.primary : theme.card, color: savingsViewMode === mode ? '#fff' : theme.text, border: `1px solid ${savingsViewMode === mode ? currentTheme.primary : theme.border}` }}>
              {mode} View
            </button>
          ))}
        </div>

        {/* Compact View */}
        {savingsViewMode === 'compact' && savingsAccounts.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            {savingsAccounts.map((acct, i) => (
              <div key={acct.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i < savingsAccounts.length - 1 ? `1px solid ${theme.border}` : 'none', background: theme.card }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${currentTheme.primary}20` }}>
                  <Target className="w-4 h-4" style={{ color: currentTheme.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: theme.text }}>{acct.name}</div>
                  {acct.goal > 0 && <div className="text-xs" style={{ color: theme.textM }}>Goal: ${acct.goal.toLocaleString()}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div style={{ fontSize: 15, fontWeight: 800, color: currentTheme.primary }}>${acct.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  {acct.goal > 0 && (
                    <div className="w-20 mt-1 rounded-full overflow-hidden" style={{ height: 4, background: `${currentTheme.primary}20` }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (acct.amount / acct.goal) * 100)}%`, background: currentTheme.primary }} />
                    </div>
                  )}
                </div>
                <button onClick={() => {
                  setSavingsAccounts(prev => prev.filter(a => a.id !== acct.id));
                  setLocalSynced('orca-savings-accounts', JSON.stringify(savingsAccounts.filter(a => a.id !== acct.id)));
                }} className="p-1.5 rounded-lg hover:opacity-80 transition-all flex-shrink-0" style={{ color: '#EF4444' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {savingsViewMode === 'list' && savingsAccounts.map(acct => (
          <motion.div key={acct.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: 14, fontWeight: 800, color: currentTheme.primary, letterSpacing: '0.06em' }}>{acct.name}</h3>
              <button onClick={() => {
                setSavingsAccounts(prev => prev.filter(a => a.id !== acct.id));
                setLocalSynced('orca-savings-accounts', JSON.stringify(savingsAccounts.filter(a => a.id !== acct.id)));
              }} className="p-1.5 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xl sm:text-[26px] mb-4 break-words" style={{ fontWeight: 900, color: currentTheme.primary }}>${acct.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

            <div className="mb-3">
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

            <div className="mb-3">
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

            <div className="mb-3">
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
                    style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary, border: `1px solid ${currentTheme.primary}` }}>
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
                  style={{ backgroundColor: currentTheme.primary }}>
                  Add
                </button>
              </div>
            </div>

            <button className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all font-bold"
              style={{ backgroundColor: '#16A34A', color: '#fff' }}>
              ✓ Saved!
            </button>
          </motion.div>
        ))}

        <div className="rounded-2xl p-5" style={{ backgroundColor: theme.card, border: `2px dashed ${theme.border}` }}>
          <h3 className="text-sm mb-3" style={{ fontWeight: 700, color: theme.textM }}>Add Account</h3>
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
              style={{ backgroundColor: currentTheme.primary, color: '#fff' }}>
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="w-full min-h-full flex items-center justify-center">
        <div style={{ color: theme.textS }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-full">
      <div className="max-w-5xl mx-auto w-full min-w-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>
            Smart Stack
          </h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textM }}>
            Complete financial management at a glance
          </p>
        </motion.div>

        <div
          style={{ backgroundColor: `${currentTheme.primary}20`, border: `1px solid ${currentTheme.primary}` }}
          className="rounded-2xl p-1 mb-8 flex gap-2"
        >
          {(['income', 'savings'] as Tab[]).map((tab) => (
            <motion.button
              key={tab}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? currentTheme.primary : 'transparent',
                color: activeTab === tab ? '#fff' : currentTheme.primaryLight,
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
