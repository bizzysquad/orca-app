'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
  Home,
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, fmtD, daysTo, calcAlloc, calcIncome, f2w, pct, getPaycheckAmount } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

type Tab = 'budget' | 'savings' | 'credit';

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
  spendingAllocation: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
}

interface DayOff {
  date: string;
  hoursPerDay?: number;
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
  const { data, loading } = useOrcaData();
  const [activeTab, setActiveTab] = useState<Tab>('budget');
  const [budgetLocked, setBudgetLocked] = useState(false);
  const [paycheckHistory, setPaycheckHistory] = useState<PaycheckEntry[]>([]);
  const [checkAmount, setCheckAmount] = useState(1500);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('biweekly');
  const [creditScore, setCreditScore] = useState(720);
  const [creditScoreSim, setCreditScoreSim] = useState(720);
  const [selectedObligations, setSelectedObligations] = useState<string[]>([]);
  const [selfEmployedIncome, setSelfEmployedIncome] = useState(0);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [forecastedIncome, setForecastedIncome] = useState<any[]>([]);

  const isSelfEmployed = data.user?.employmentType === 'self-employed';
  const rentAmount = data.user?.rentAmount || 1400;

  // ============== BUDGET LOCK LOGIC ==============
  const handleBudgetLock = () => {
    if (!budgetLocked) {
      // Lock in the budget - update paycheck history
      const billsTotal = (data.bills || []).reduce((sum: number, bill: any) => sum + bill.amount, 0);
      const savingsTotal = (data.goals || []).reduce(
        (sum: number, goal: any) => sum + (goal.targetAmount / 52),
        0
      );
      const spendingTotal = checkAmount - billsTotal - savingsTotal;

      const newEntry: PaycheckEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        grossAmount: checkAmount,
        billsAllocation: billsTotal,
        savingsAllocation: savingsTotal,
        spendingAllocation: Math.max(0, spendingTotal),
        frequency,
      };

      setPaycheckHistory([newEntry, ...paycheckHistory.slice(0, 11)]);

      // Generate 12-month forecast
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
          dueDate: bill.dueDate || new Date().toISOString().split('T')[0],
          source: 'bill',
        });
      });
    }

    obs.push({
      id: 'rent',
      name: 'Rent',
      amount: rentAmount,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toISOString()
        .split('T')[0],
      source: 'bill',
    });

    if (data.goals) {
      data.goals.forEach((goal: any, idx: number) => {
        obs.push({
          id: `goal-${idx}`,
          name: goal.name,
          amount: goal.targetAmount,
          dueDate: goal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          source: 'savings',
        });
      });
    }

    return obs;
  }, [data, rentAmount]);

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

  // ============== CALENDAR WITH PROJECTION ==============
  const renderCalendarWithProjection = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const toggleDayOff = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      setDaysOff((prev) => {
        const exists = prev.find((d) => d.date === dateStr);
        if (exists) {
          return prev.filter((d) => d.date !== dateStr);
        } else {
          return [...prev, { date: dateStr, hoursPerDay: 8 }];
        }
      });
    };

    const isDayOff = (date: Date | null) => {
      if (!date) return false;
      const dateStr = date.toISOString().split('T')[0];
      return daysOff.some((d) => d.date === dateStr);
    };

    const projectedIncomeReduction = daysOff.reduce((sum, day) => {
      const hoursPerDay = day.hoursPerDay || 8;
      return sum + (hoursPerDay * checkAmount / 40 / (frequency === 'weekly' ? 1 : frequency === 'biweekly' ? 2 : 4.33));
    }, 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
        className="border rounded-xl p-6"
      >
        <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Calendar size={28} style={{ color: theme.gold }} />
          Income Calendar
        </h3>

        <div className="space-y-6">
          {/* Month Header */}
          <div>
            <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase mb-4">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ color: theme.textM }} className="text-center text-xs font-semibold py-2">
                  {d}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((date, idx) => (
                <motion.button
                  key={idx}
                  whileHover={date ? { scale: 1.1 } : {}}
                  onClick={() => date && toggleDayOff(date)}
                  style={{
                    backgroundColor: isDayOff(date) ? theme.gold : theme.bg,
                    borderColor: isDayOff(date) ? theme.gold : theme.border,
                    color: isDayOff(date) ? theme.bgS : theme.text,
                  }}
                  className={`aspect-square rounded-lg border flex items-center justify-center text-sm font-semibold ${date ? 'cursor-pointer' : ''}`}
                >
                  {date?.getDate()}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Day Off Summary */}
          {daysOff.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: theme.bg, borderColor: theme.border }}
              className="border rounded-lg p-4 space-y-3"
            >
              <p style={{ color: theme.textS }} className="text-xs font-semibold uppercase">
                Days Off: {daysOff.length}
              </p>
              <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(daysOff.length / daysInMonth) * 100}%` }}
                  style={{ backgroundColor: theme.warn }}
                  className="h-full"
                />
              </div>
              <p style={{ color: theme.warn }} className="text-sm font-semibold">
                Projected Income Reduction: {fmt(projectedIncomeReduction)}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  // ============== INCOME ALLOCATOR ==============
  const renderIncomeAllocator = () => {
    const billsTotal = (data.bills || []).reduce((sum: number, bill: any) => sum + bill.amount, 0);
    const savingsTotal = (data.goals || []).reduce(
      (sum: number, goal: any) => sum + (goal.targetAmount / 52),
      0
    );
    const spendingTotal = Math.max(0, checkAmount - billsTotal - savingsTotal);

    const billsPct = (billsTotal / checkAmount) * 100;
    const savingsPct = (savingsTotal / checkAmount) * 100;
    const spendingPct = (spendingTotal / checkAmount) * 100;

    const allocItems = [
      { name: 'Bills Reserve', amount: billsTotal, pct: billsPct, color: '#ef4444', icon: Home },
      { name: 'Savings', amount: savingsTotal, pct: savingsPct, color: '#22c55e', icon: Target },
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
            Income Allocator
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBudgetLock}
            style={{
              backgroundColor: budgetLocked ? theme.gold : theme.border,
              color: budgetLocked ? theme.bgS : theme.text,
            }}
            className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            {budgetLocked ? <Lock size={18} /> : <Edit3 size={18} />}
            {budgetLocked ? 'Locked' : 'Lock In'}
          </motion.button>
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

  // ============== PAYCHECK HISTORY ==============
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
          Paycheck History
        </h3>

        {paycheckHistory.length === 0 ? (
          <div style={{ backgroundColor: theme.bg }} className="rounded-lg p-6 text-center">
            <p style={{ color: theme.textM }} className="text-sm">
              No locked paychecks yet. Lock in a budget to save it to history.
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
                      {entry.frequency} paycheck
                    </p>
                  </div>
                  <p style={{ color: theme.text }} className="font-bold text-lg">
                    {fmt(entry.grossAmount)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
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
    if (isSelfEmployed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Self-Employed Income Allocator */}
          <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ color: theme.text }} className="text-2xl font-bold flex items-center gap-3">
                <Briefcase size={28} style={{ color: theme.gold }} />
                Income Allocator
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
                        backgroundColor: isSelected ? theme.goldBg : theme.bg,
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
                      <div style={{ backgroundColor: theme.bg }} className="h-2 rounded-full overflow-hidden">
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

          {/* Paycheck History */}
          {renderPaycheckHistory()}

          {/* Projection Calculator */}
          <ProjectionCalculator theme={theme} />
        </motion.div>
      );
    }

    // Employed users - Check Projection & Budget
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Check Projection */}
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 style={{ color: theme.text }} className="text-2xl font-bold flex items-center gap-3">
              <DollarSign size={28} style={{ color: theme.gold }} />
              Check Projection
            </h3>
          </div>

          {!budgetLocked ? (
            <div className="space-y-6">
              <div>
                <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">
                  Check Amount
                </label>
                <input
                  type="number"
                  value={checkAmount}
                  onChange={(e) => setCheckAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  className="w-full border rounded-lg px-4 py-2 font-bold text-lg"
                  placeholder="Enter check amount"
                />
              </div>

              <div>
                <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                    <motion.button
                      key={freq}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFrequency(freq)}
                      style={{
                        backgroundColor: frequency === freq ? theme.gold : theme.bg,
                        color: frequency === freq ? theme.bgS : theme.text,
                        borderColor: theme.border,
                      }}
                      className="border rounded-lg py-2 font-semibold capitalize transition-all"
                    >
                      {freq}
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBudgetLock}
                style={{
                  backgroundColor: theme.gold,
                  color: theme.bgS,
                }}
                className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                Lock In Budget
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                style={{ backgroundColor: theme.bgS, borderColor: theme.gold }}
                className="border-2 rounded-lg p-4"
              >
                <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
                  Locked Check
                </p>
                <p style={{ color: theme.gold }} className="text-3xl font-bold">
                  {fmt(checkAmount)}
                </p>
                <p style={{ color: theme.textM }} className="text-sm mt-2 capitalize">
                  {frequency}
                </p>
              </div>

              {forecastedIncome.length > 0 && (
                <div className="space-y-3">
                  <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
                    12-Month Forecast
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {forecastedIncome.map((forecast, idx) => (
                      <div
                        key={idx}
                        style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                        className="border rounded p-2 text-center"
                      >
                        <p style={{ color: theme.textM }} className="text-xs">
                          M{idx + 1}
                        </p>
                        <p style={{ color: theme.text }} className="text-sm font-bold">
                          {fmt(forecast.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                Edit Budget
              </motion.button>
            </div>
          )}
        </div>

        {/* Calendar with Projection */}
        {renderCalendarWithProjection()}

        {/* Income Allocator */}
        {renderIncomeAllocator()}

        {/* Paycheck History */}
        {renderPaycheckHistory()}

        {/* Projection Calculator */}
        <ProjectionCalculator theme={theme} />
      </motion.div>
    );
  };

  // ============== TAB: SAVINGS ==============
  const renderSavingsTab = () => {
    const goals = data.goals || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {goals.length === 0 ? (
          <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-8 text-center">
            <Heart size={40} style={{ color: theme.gold }} className="mx-auto mb-4" />
            <h3 style={{ color: theme.text }} className="text-xl font-bold mb-2">
              No Savings Goals Yet
            </h3>
            <p style={{ color: theme.textM }} className="mb-4">
              Create a savings goal in Settings to get started
            </p>
          </div>
        ) : (
          goals.map((goal: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="border rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 style={{ color: theme.text }} className="text-xl font-bold">
                    {goal.name}
                  </h3>
                  <p style={{ color: theme.textM }} className="text-sm">
                    Target: {fmt(goal.targetAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: theme.text }} className="text-2xl font-bold">
                    {fmt(goal.currentAmount || 0)}
                  </p>
                  <p style={{ color: theme.textM }} className="text-xs">
                    {Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100)}% complete
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: theme.bg }} className="h-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100)}%` }}
                  style={{ backgroundColor: theme.ok }}
                  className="h-full transition-all"
                />
              </div>
            </motion.div>
          ))
        )}
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
          {(['budget', 'savings', 'credit'] as Tab[]).map((tab) => (
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
        {activeTab === 'credit' && renderCreditTab()}
      </div>
    </div>
  );
}
