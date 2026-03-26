'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home, ExternalLink,
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, fmtD, daysTo, calcAlloc, calcIncome, f2w, pct, getPaycheckAmount } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import CalendarPicker from '@/components/CalendarPicker';

type Tab = 'budget' | 'savings';

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
}

// ============== PROJECTION CALCULATOR COMPONENT ==============
function ProjectionCalculator({ theme }: { theme: any }) {
  const [goalAmount, setGoalAmount] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [timeUnit, setTimeUnit] = useState<'weeks' | 'months' | 'years'>('months')
  const [result, setResult] = useState<{ perWeek: number; perMonth: number; perDay: number } | null>(null)

  const calculate = () => {
    const goal = parseFloat(goalAmount)
    const time = parseFloat(timeframe)
    if (!goal || !time || goal <= 0 || time <= 0) return

    let totalWeeks = time
    if (timeUnit === 'months') totalWeeks = time * 4.33
    if (timeUnit === 'years') totalWeeks = time * 52

    const perWeek = goal / totalWeeks
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
              onChange={(e) => setTimeUnit(e.target.value as 'weeks' | 'months' | 'years')}
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
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
            className="grid grid-cols-3 gap-3 pt-4 border-t"
            style={{ borderColor: theme.border }}
          >
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.ok}20` }}>
              <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Day</p>
              <p style={{ color: theme.ok }} className="text-sm font-bold">{fmt(result.perDay)}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.gold}20` }}>
              <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Week</p>
              <p style={{ color: theme.gold }} className="text-sm font-bold">{fmt(result.perWeek)}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.warn}20` }}>
              <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Per Month</p>
              <p style={{ color: theme.warn }} className="text-sm font-bold">{fmt(result.perMonth)}</p>
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
  const [activeTab, setActiveTab] = useState<Tab>('budget');
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
  const [projectionMode, setProjectionMode] = useState<'check' | 'payment'>('check');
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentDesc, setNewPaymentDesc] = useState('');

  const isSelfEmployed = data.user?.employmentType === 'self-employed';

  // Track which days have custom hours (key = date string, value = hours)
  const [customHours, setCustomHours] = useState<Record<string, number>>({});
  const [editingHoursDay, setEditingHoursDay] = useState<string | null>(null);
  const [editingHoursValue, setEditingHoursValue] = useState('');

  // Check amount is always derived from calendar interaction + Settings
  // Defaults to $0 until user has configured payRate in Settings
  const basePayRate = parseFloat(data.user?.payRate || '0');
  const baseHoursPerDay = parseFloat(data.user?.hoursPerDay || '0');
  const payFreq = data.user?.payFreq || 'biweekly';
  const hasSettingsInput = basePayRate > 0 && baseHoursPerDay > 0;

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
    if (!isSelfEmployed || selectedObligations.length === 0) {
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
  }, [selectedObligations, obligations, isSelfEmployed]);

  // ============== PAY PERIOD STATE ==============
  const [projFreq, setProjFreq] = useState<'weekly' | 'biweekly'>(payFreq === 'weekly' ? 'weekly' : 'biweekly');
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

  // Calculate projected check dynamically from selected pay period
  const projectedCheckAmount = useMemo(() => {
    if (isSelfEmployed || !hasSettingsInput) return 0;
    if (!currentPeriod) return 0;

    let totalHours = 0;
    const d = new Date(currentPeriod.start);
    while (d <= currentPeriod.end) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;

      // Skip days off
      if (daysOff.some((off) => off.date === dateStr)) {
        d.setDate(d.getDate() + 1);
        continue;
      }

      // Use custom hours if set; weekends default to 0 unless custom hours set
      const defaultHrs = isWknd ? 0 : baseHoursPerDay;
      const hours = customHours[dateStr] ?? defaultHrs;
      totalHours += hours;
      d.setDate(d.getDate() + 1);
    }

    return totalHours * basePayRate;
  }, [isSelfEmployed, hasSettingsInput, basePayRate, baseHoursPerDay, currentPeriod, daysOff, customHours]);

  // For backward compat in other functions
  const checkAmount = projectedCheckAmount;

  // ============== CALENDAR WITH PROJECTION ==============
  const renderCheckProjectionWithCalendar = () => {
    const period = currentPeriod;
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
      setDaysOff((prev) => {
        const exists = prev.find((d) => d.date === dateStr);
        if (exists) {
          return prev.filter((d) => d.date !== dateStr);
        } else {
          return [...prev, { date: dateStr, hoursPerDay: baseHoursPerDay }];
        }
      });
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

    const startEditHours = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const currentHours = customHours[dateStr] ?? (isWeekend(date) ? 0 : baseHoursPerDay);
      setEditingHoursDay(dateStr);
      setEditingHoursValue(String(currentHours));
    };

    const saveEditHours = () => {
      if (editingHoursDay) {
        const hrs = parseFloat(editingHoursValue);
        if (!isNaN(hrs) && hrs >= 0) {
          setCustomHours((prev) => ({ ...prev, [editingHoursDay]: hrs }));
        }
        setEditingHoursDay(null);
        setEditingHoursValue('');
      }
    };

    // Calculate income reduction from days off in this period
    const incomeReduction = daysOff
      .filter(day => {
        const dd = new Date(day.date + 'T00:00:00');
        return dd >= period.start && dd <= period.end;
      })
      .reduce((sum, day) => {
        const hrs = customHours[day.date] ?? baseHoursPerDay;
        return sum + (hrs * basePayRate);
      }, 0);

    // Count days in this period for daysInMonth ref (used in days off bar)
    const periodDayCount = days.length;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
          <DollarSign size={28} style={{ color: theme.gold }} />
          Check Projection
        </h3>

        <div className="space-y-6">
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
              {projPeriodIndex === 0 && <span style={{ color: theme.gold }} className="ml-2 text-xs">(Current)</span>}
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

          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
                Pay Period
              </p>
              <p style={{ color: theme.textM }} className="text-xs">
                Click a day to mark it off · Double-click to edit hours
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dd) => (
                <div key={dd} style={{ color: theme.textM }} className="text-center text-xs font-semibold py-2">
                  {dd}
                </div>
              ))}

              {paddedDays.map((date, idx) => {
                const dateStr = date?.toISOString().split('T')[0] || '';
                const isOff = isDayOff(date);
                const isWknd = isWeekend(date);
                const hasCustom = date && customHours[dateStr] !== undefined;

                return (
                  <motion.button
                    key={idx}
                    whileHover={date ? { scale: 1.1 } : {}}
                    onClick={() => date && toggleDayOff(date)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (date && !isOff) startEditHours(date);
                    }}
                    style={{
                      backgroundColor: isOff ? theme.gold : isWknd ? `${theme.border}40` : hasCustom ? `${theme.gold}15` : theme.bgS,
                      borderColor: isOff ? theme.gold : hasCustom ? `${theme.gold}60` : theme.border,
                      color: isOff ? theme.bgS : isWknd ? theme.textM : theme.text,
                      opacity: !date ? 0 : 1,
                    }}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-sm font-semibold ${date ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span>{date?.getDate()}</span>
                    {hasCustom && !isOff && (
                      <span className="text-[8px]" style={{ color: theme.gold }}>{customHours[dateStr]}h</span>
                    )}
                    {isWknd && date && !isOff && !hasCustom && (
                      <span className="text-[7px]" style={{ color: theme.textM }}>off</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Edit Hours Modal */}
          {editingHoursDay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: theme.bgS, borderColor: theme.gold }}
              className="border-2 rounded-lg p-4"
            >
              <p style={{ color: theme.text }} className="text-sm font-semibold mb-3">
                Edit hours for {new Date(editingHoursDay + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={editingHoursValue}
                  onChange={(e) => setEditingHoursValue(e.target.value)}
                  min="0"
                  max="24"
                  step="0.5"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={saveEditHours}
                  style={{ backgroundColor: theme.gold, color: theme.bgS }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  Save
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingHoursDay(null)}
                  style={{ backgroundColor: theme.border, color: theme.text }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}

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
          <div style={{ backgroundColor: theme.bg, borderColor: hasSettingsInput ? theme.gold : theme.border }} className="border-2 rounded-lg p-4">
            <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
              Projected Check Amount
            </p>
            <p style={{ color: theme.gold }} className="text-3xl font-bold">
              {fmt(projectedCheckAmount)}
            </p>
            {!hasSettingsInput && (
              <p style={{ color: theme.warn }} className="text-sm mt-2">
                Set your pay rate and hours in{' '}
                <a href="/settings" className="underline hover:no-underline" style={{ color: theme.gold }}>Settings</a>{' '}
                to see your projected check.
              </p>
            )}
            {hasSettingsInput && daysOff.length > 0 && (
              <p style={{ color: theme.warn }} className="text-sm mt-2">
                {fmt(incomeReduction)} reduction from {daysOff.length} day(s) off
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: theme.textM }}>
              <Info size={14} />
              <span>
                Based on your <a href="/settings" className="underline hover:no-underline" style={{ color: theme.gold }}>Settings</a> ({hasSettingsInput ? `$${basePayRate}/hr × ${baseHoursPerDay}hrs` : 'not configured'})
              </span>
            </div>
          </div>

          {!budgetLocked ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBudgetLock}
              disabled={projectedCheckAmount <= 0}
              style={{
                backgroundColor: projectedCheckAmount > 0 ? theme.gold : theme.border,
                color: projectedCheckAmount > 0 ? theme.bgS : theme.textM,
              }}
              className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              <Lock size={18} />
              Lock In
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBudgetLock}
              style={{
                backgroundColor: theme.border,
                color: theme.text,
              }}
              className="w-full py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Edit3 size={18} />
              Edit
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  };

  // ============== PAYMENT PROJECTION (Self-Employed) ==============
  const renderPaymentProjection = () => {
    const addPayment = () => {
      const amount = parseFloat(newPaymentAmount);
      if (!amount || !newPaymentDate) return;
      const entry: PaymentEntry = {
        id: `pay-${Date.now()}`,
        amount,
        date: newPaymentDate,
        description: newPaymentDesc || 'Payment',
      };
      const updated = [...paymentEntries, entry];
      setPaymentEntries(updated);
      try { localStorage.setItem('orca-payment-entries', JSON.stringify(updated)) } catch {}
      // Sync payment dates to Dashboard calendar via data context
      const existingIncome = data.income || [];
      const newIncome = [...existingIncome, { id: entry.id, source: entry.description, amount: entry.amount, date: entry.date, frequency: 'once' as const }];
      setData(prev => ({ ...prev, income: newIncome as any }));
      setNewPaymentAmount('');
      setNewPaymentDate('');
      setNewPaymentDesc('');
    };

    const removePayment = (id: string) => {
      const updated = paymentEntries.filter(p => p.id !== id);
      setPaymentEntries(updated);
      try { localStorage.setItem('orca-payment-entries', JSON.stringify(updated)) } catch {}
      const existingIncome = data.income || [];
      setData(prev => ({ ...prev, income: (existingIncome as any[]).filter((i: any) => i.id !== id) as any }));
    };

    const totalPayments = paymentEntries.reduce((sum, p) => sum + p.amount, 0);
    const nextPayment = paymentEntries
      .filter(p => new Date(p.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Briefcase size={28} style={{ color: theme.gold }} />
          Payment Projection
        </h3>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div style={{ backgroundColor: theme.bg, borderColor: theme.gold }} className="border-2 rounded-lg p-4">
              <p style={{ color: theme.textM }} className="text-xs font-semibold uppercase mb-1">Total Expected</p>
              <p style={{ color: theme.gold }} className="text-2xl font-bold">{fmt(totalPayments)}</p>
            </div>
            <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4">
              <p style={{ color: theme.textM }} className="text-xs font-semibold uppercase mb-1">Next Payment</p>
              <p style={{ color: theme.text }} className="text-2xl font-bold">
                {nextPayment ? fmt(nextPayment.amount) : '$0.00'}
              </p>
              {nextPayment && (
                <p style={{ color: theme.textM }} className="text-xs mt-1">
                  {new Date(nextPayment.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Add Payment Form */}
          <div style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="border rounded-lg p-4 space-y-3">
            <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">Add Incoming Payment</p>
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
              placeholder="Description (e.g., Client invoice, Freelance work)"
              style={{ backgroundColor: theme.bgS, borderColor: theme.border, color: theme.text }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={addPayment}
              disabled={!newPaymentAmount || !newPaymentDate}
              style={{
                backgroundColor: newPaymentAmount && newPaymentDate ? theme.gold : theme.border,
                color: newPaymentAmount && newPaymentDate ? theme.bgS : theme.textM,
              }}
              className="w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Add Payment
            </motion.button>
          </div>

          {/* Payment Entries List */}
          {paymentEntries.length > 0 && (
            <div className="space-y-3">
              <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">Upcoming Payments</p>
              {paymentEntries
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p style={{ color: theme.text }} className="font-semibold">{entry.description}</p>
                      <p style={{ color: theme.textM }} className="text-xs">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p style={{ color: '#22c55e' }} className="font-bold">+{fmt(entry.amount)}</p>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removePayment(entry.id)}
                        style={{ color: theme.textM }}
                        className="hover:opacity-70"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ============== CHECK SPLITTER ==============
  const renderCheckSplitter = () => {
    const billsTotal = (data.bills || []).reduce((sum: number, bill: any) => sum + bill.amount, 0);
    const savingsTotal = (data.goals || []).reduce((sum: number, goal: any) => sum + (goal.target / 52), 0);
    const stackCircleTotal = (data.groups || []).reduce((sum: number, group: any) => sum + group.current, 0);
    const spendingTotal = Math.max(0, checkAmount - billsTotal - savingsTotal - stackCircleTotal);

    const billsPct = (billsTotal / checkAmount) * 100;
    const savingsPct = (savingsTotal / checkAmount) * 100;
    const stackCirclePct = (stackCircleTotal / checkAmount) * 100;
    const spendingPct = (spendingTotal / checkAmount) * 100;

    const allocItems = [
      { name: 'Bills', amount: billsTotal, pct: billsPct, color: '#ef4444', icon: Home },
      { name: 'Savings', amount: savingsTotal, pct: savingsPct, color: '#22c55e', icon: Target },
      ...(stackCircleTotal > 0 ? [{ name: 'Stack Circle', amount: stackCircleTotal, pct: stackCirclePct, color: '#f59e0b', icon: Heart }] : []),
      { name: 'Spending Money', amount: spendingTotal, pct: spendingPct, color: '#3b82f6', icon: DollarSign },
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
            Check Splitter
          </h3>
        </div>

        <div className="space-y-6">
          {/* Donut Chart */}
          <div className="flex justify-center">
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                {(() => {
                  let offset = 0;
                  return allocItems.map((item, idx) => {
                    const circumference = 2 * Math.PI * 45;
                    const strokeDashoffset = circumference - (item.pct / 100) * circumference;
                    const rotation = offset;
                    offset += item.pct;

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

          {/* Allocation Items */}
          <div className="space-y-4">
            {allocItems.map((item, idx) => (
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
                      {item.pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    style={{ backgroundColor: item.color }}
                    className="h-full transition-all"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // ============== INCOME HISTORY ==============
  const renderPaycheckHistory = () => {
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

        {paycheckHistory.length === 0 ? (
          <div style={{ backgroundColor: theme.bg }} className="rounded-lg p-6 text-center">
            <p style={{ color: theme.textM }} className="text-sm">
              No locked entries yet. Lock in a budget to save it to history.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {paycheckHistory.map((entry) => (
              <motion.div
                key={entry.id}
                whileHover={{ scale: 1.02 }}
                style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ color: theme.text }} className="font-semibold">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    <p style={{ color: theme.textM }} className="text-sm capitalize">
                      {entry.frequency} income
                    </p>
                  </div>
                  <p style={{ color: theme.text }} className="font-bold text-lg">
                    {fmt(entry.grossAmount)}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div style={{ backgroundColor: theme.bgS }} className="rounded p-2 text-center">
                    <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Bills</p>
                    <p style={{ color: '#ef4444' }} className="font-bold">
                      {fmt(entry.billsAllocation)}
                    </p>
                  </div>
                  <div style={{ backgroundColor: theme.bgS }} className="rounded p-2 text-center">
                    <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Savings</p>
                    <p style={{ color: '#22c55e' }} className="font-bold">
                      {fmt(entry.savingsAllocation)}
                    </p>
                  </div>
                  {entry.stackCircleAllocation > 0 && (
                    <div style={{ backgroundColor: theme.bgS }} className="rounded p-2 text-center">
                      <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Stack</p>
                      <p style={{ color: '#f59e0b' }} className="font-bold">
                        {fmt(entry.stackCircleAllocation)}
                      </p>
                    </div>
                  )}
                  <div style={{ backgroundColor: theme.bgS }} className="rounded p-2 text-center">
                    <p style={{ color: theme.textM }} className="text-xs font-semibold mb-1">Spending</p>
                    <p style={{ color: '#3b82f6' }} className="font-bold">
                      {fmt(entry.spendingAllocation)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // ============== TAB: BUDGET ==============
  const renderBudgetTab = () => {
    // Toggle between Check Projection and Payment Projection
    const renderProjectionToggle = () => (
      <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-3 mb-8">
        <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: theme.bg }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProjectionMode('check')}
            style={{
              backgroundColor: projectionMode === 'check' ? theme.gold : 'transparent',
              color: projectionMode === 'check' ? theme.bgS : theme.textM,
            }}
            className="flex-1 py-3 font-semibold text-sm flex items-center justify-center gap-2 rounded-lg transition-all"
          >
            <DollarSign size={16} /> Check Projection
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProjectionMode('payment')}
            style={{
              backgroundColor: projectionMode === 'payment' ? theme.gold : 'transparent',
              color: projectionMode === 'payment' ? theme.bgS : theme.textM,
            }}
            className="flex-1 py-3 font-semibold text-sm flex items-center justify-center gap-2 rounded-lg transition-all"
          >
            <Briefcase size={16} /> Payment Projection
          </motion.button>
        </div>
      </div>
    );

    if (isSelfEmployed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {renderProjectionToggle()}

          {projectionMode === 'payment' ? (
            renderPaymentProjection()
          ) : (
            renderCheckProjectionWithCalendar()
          )}

          {/* Self-Employed Income Allocator */}
          <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ color: theme.text }} className="text-2xl font-bold flex items-center gap-3">
                <Briefcase size={28} style={{ color: theme.gold }} />
                Check Splitter
              </h3>
            </div>

            {/* Obligations List */}
            <div className="mb-8">
              <h4 style={{ color: theme.textS }} className="text-sm font-semibold uppercase mb-4">
                Financial Obligations
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {obligations.map((obl) => {
                  const daysRemaining = daysTo(obl.dueDate);
                  const isSelected = selectedObligations.includes(obl.id);
                  return (
                    <motion.div
                      key={obl.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedObligations((prev) =>
                          prev.includes(obl.id) ? prev.filter((id) => id !== obl.id) : [...prev, obl.id]
                        );
                      }}
                      style={{
                        backgroundColor: isSelected ? `${theme.gold}20` : theme.bg,
                        borderColor: isSelected ? theme.gold : theme.border,
                      }}
                      className="border rounded-lg p-4 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p style={{ color: theme.text }} className="font-semibold">
                            {obl.name}
                          </p>
                          <p style={{ color: theme.textM }} className="text-sm">
                            Due in {daysRemaining} days
                          </p>
                        </div>
                        <div className="text-right">
                          <p style={{ color: theme.text }} className="font-bold">
                            {fmt(obl.amount)}
                          </p>
                          {isSelected && <CheckCircle size={20} style={{ color: theme.gold }} className="ml-auto mt-2" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Income Requirements */}
            {selectedObligations.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                className="border rounded-lg p-6 space-y-6"
              >
                <h4 style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
                  Required Income Target
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    style={{ backgroundColor: theme.bgS, borderColor: theme.gold }}
                    className="border-2 rounded-lg p-4"
                  >
                    <p style={{ color: theme.textM }} className="text-xs font-semibold uppercase mb-2">
                      Daily Target
                    </p>
                    <p style={{ color: theme.gold }} className="text-2xl font-bold">
                      {fmt(incomeRequirements.daily)}
                    </p>
                  </div>

                  <div
                    style={{ backgroundColor: theme.bgS, borderColor: theme.gold }}
                    className="border-2 rounded-lg p-4"
                  >
                    <p style={{ color: theme.textM }} className="text-xs font-semibold uppercase mb-2">
                      Weekly Target
                    </p>
                    <p style={{ color: theme.gold }} className="text-2xl font-bold">
                      {fmt(incomeRequirements.weekly)}
                    </p>
                  </div>
                </div>

                {/* Current Income vs Required */}
                <div className="space-y-3">
                  <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase">
                    Your Current Pace
                  </p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.textM }} className="text-sm">
                          Daily Income
                        </span>
                        <span style={{ color: theme.text }} className="text-sm font-semibold">
                          {fmt(selfEmployedIncome)}
                        </span>
                      </div>
                      <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: Math.min(
                              100,
                              (selfEmployedIncome / Math.max(1, incomeRequirements.daily)) * 100
                            ),
                          }}
                          style={{
                            backgroundColor:
                              selfEmployedIncome >= incomeRequirements.daily ? theme.ok : theme.warn,
                          }}
                          className="h-full transition-all"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.bgS }}>
                      <p style={{ color: theme.textM }} className="text-xs mb-2">
                        Status:
                      </p>
                      {selfEmployedIncome >= incomeRequirements.daily ? (
                        <p style={{ color: theme.ok }} className="font-semibold flex items-center gap-2">
                          <CheckCircle size={16} />
                          On track to meet all obligations
                        </p>
                      ) : (
                        <p style={{ color: theme.warn }} className="font-semibold flex items-center gap-2">
                          <AlertCircle size={16} />
                          Need {fmt(incomeRequirements.daily - selfEmployedIncome)}/day to stay on track
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Income Input */}
                <div className="space-y-3 pt-4 border-t" style={{ borderColor: theme.border }}>
                  <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase">
                    Daily Income
                  </p>
                  <input
                    type="number"
                    value={selfEmployedIncome}
                    onChange={(e) => setSelfEmployedIncome(parseFloat(e.target.value) || 0)}
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    className="w-full border rounded-lg px-4 py-2 font-semibold"
                    placeholder="Enter daily income"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Income History */}
          {renderPaycheckHistory()}

          {/* Projection Calculator */}
          <ProjectionCalculator theme={theme} />
        </motion.div>
      );
    }

    // Employed users - Check Projection & Check Splitter
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {renderProjectionToggle()}

        {projectionMode === 'payment' ? (
          renderPaymentProjection()
        ) : (
          <>
            {/* Check Projection with Calendar */}
            {renderCheckProjectionWithCalendar()}

            {/* Check Splitter */}
            {renderCheckSplitter()}
          </>
        )}

        {/* Paycheck */}
        {renderPaycheckHistory()}

        {/* Projection Calculator */}
        <ProjectionCalculator theme={theme} />
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
    localStorage.setItem('orca-savings-accounts', JSON.stringify(updated));
    setNewAccountName('');
  };

  const updateSavingsAccount = (id: string, field: 'amount' | 'goal', value: number) => {
    setSavingsAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value, saved: false } : a));
  };

  const saveSavingsAccount = (id: string) => {
    const updated = savingsAccounts.map(a => a.id === id ? { ...a, saved: true } : a);
    setSavingsAccounts(updated);
    localStorage.setItem('orca-savings-accounts', JSON.stringify(updated));
    syncSavingsToDashboard(updated);
    setTimeout(() => {
      setSavingsAccounts(prev => prev.map(a => a.id === id ? { ...a, saved: false } : a));
    }, 2000);
  };

  const removeSavingsAccount = (id: string) => {
    const updated = savingsAccounts.filter(a => a.id !== id);
    setSavingsAccounts(updated);
    localStorage.setItem('orca-savings-accounts', JSON.stringify(updated));
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
              <div className="flex items-center justify-between mb-4">
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

              <div className="space-y-3">
                <div>
                  <label style={{ color: theme.textS }} className="block text-xs font-semibold mb-1">Amount</label>
                  <div className="relative">
                    <span style={{ color: theme.textM }} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                    <input
                      type="number"
                      value={acct.amount || ''}
                      onChange={(e) => updateSavingsAccount(acct.id, 'amount', parseFloat(e.target.value) || 0)}
                      style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      className="w-full border rounded-lg pl-7 pr-3 py-2.5 font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Goal removed per user request */}

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
                  {acct.saved ? <><Check size={16} /> Saved!</> : <><Target size={16} /> Save</>}
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
    <div style={{ backgroundColor: theme.bg, color: theme.text }} className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
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
          {(['budget', 'savings'] as Tab[]).map((tab) => (
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
        {activeTab === 'budget' && renderBudgetTab()}
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
