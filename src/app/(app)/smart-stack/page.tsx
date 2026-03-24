'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar, Briefcase,
} from 'lucide-react';
import { getDemoData } from '@/lib/demo-data';
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

export default function SmartStackPage() {
  const { theme } = useTheme();
  const data = getDemoData();
  const [activeTab, setActiveTab] = useState<Tab>('budget');
  const [budgetLocked, setBudgetLocked] = useState(false);
  const [paycheckHistory, setPaycheckHistory] = useState<any[]>([]);
  const [forecastedIncome, setForecastedIncome] = useState<any[]>([]);
  const [checkAmount, setCheckAmount] = useState(1500);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('biweekly');
  const [creditScore, setCreditScore] = useState(720);
  const [creditScoreSim, setCreditScoreSim] = useState(720);
  const [selectedObligations, setSelectedObligations] = useState<string[]>([]);
  const [selfEmployedIncome, setSelfEmployedIncome] = useState(0);

  const isSelfEmployed = data.user?.employmentType === 'self-employed';
  const rentAmount = data.user?.rentAmount || 1400;

  // ============== BUDGET LOCK LOGIC ==============
  const handleBudgetLock = () => {
    if (!budgetLocked) {
      // Lock in the budget - update paycheck history and forecasted income
      const newHistory = [
        {
          date: new Date().toISOString().split('T')[0],
          amount: checkAmount,
          frequency,
        },
        ...paycheckHistory.slice(0, 11),
      ];
      setPaycheckHistory(newHistory);

      // Generate forecasted income for next 12 months
      const forecasted = Array.from({ length: 12 }).map((_, i) => ({
        month: i,
        amount: checkAmount,
        frequency,
      }));
      setForecastedIncome(forecasted);
      setBudgetLocked(true);
    } else {
      // Unlock budget
      setBudgetLocked(false);
    }
  };

  // ============== SELF-EMPLOYED INCOME ALLOCATOR ==============
  const obligations = useMemo<Obligation[]>(() => {
    const obs: Obligation[] = [];

    // Add bills
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

    // Add rent if not already in bills
    obs.push({
      id: 'rent',
      name: 'Rent',
      amount: rentAmount,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toISOString()
        .split('T')[0],
      source: 'bill',
    });

    // Add savings goals
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

    // Calculate daily requirement (total needed / days)
    const dailyRequired = totalRequired;
    const weeklyRequired = dailyRequired * 7;

    return {
      daily: dailyRequired,
      weekly: weeklyRequired,
      total: totalRequired,
    };
  }, [selectedObligations, obligations, isSelfEmployed]);

  // ============== RENT TRACKER ==============
  const rentPayments = useMemo(() => {
    return [
      { date: '2025-03-01', amount: rentAmount, status: 'paid' },
      { date: '2025-04-01', amount: rentAmount, status: 'paid' },
    ];
  }, [rentAmount]);

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

          {/* Rent Tracker */}
          <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
            <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Home size={28} style={{ color: theme.ok }} />
              Rent Tracker
            </h3>
            <div className="space-y-3">
              {rentPayments.map((payment, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p style={{ color: theme.text }} className="font-semibold">
                      {new Date(payment.date).toLocaleDateString()}
                    </p>
                    <p style={{ color: theme.textM }} className="text-sm capitalize">
                      {payment.status}
                    </p>
                  </div>
                  <p style={{ color: theme.text }} className="font-bold text-lg">
                    {fmt(payment.amount)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
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
              {budgetLocked ? 'Locked' : 'Edit'}
            </motion.button>
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
            </div>
          )}
        </div>

        {/* Check Splitter */}
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
          <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
            <TrendingDown size={28} style={{ color: theme.gold }} />
            Check Splitter
          </h3>

          {budgetLocked && (
            <div className="space-y-6">
              {/* Calculate allocations */}
              {(() => {
                const billsWeekly = (data.bills || []).reduce((sum: number, bill: any) => sum + bill.amount, 0);
                const savingsWeekly = (data.goals || []).reduce(
                  (sum: number, goal: any) => sum + (goal.targetAmount / 52),
                  0
                );
                const spendingWeekly = checkAmount * 0.3; // 30% for spending
                const totalWeekly = checkAmount / (frequency === 'weekly' ? 1 : frequency === 'biweekly' ? 2 : 4.33);

                const billsPct = (billsWeekly / totalWeekly) * 100;
                const savingsPct = (savingsWeekly / totalWeekly) * 100;
                const spendingPct = (spendingWeekly / totalWeekly) * 100;

                const allocItems = [
                  { name: 'Bills', amount: billsWeekly, pct: billsPct, color: '#ef4444', type: 'Bills' },
                  {
                    name: 'Savings',
                    amount: savingsWeekly,
                    pct: savingsPct,
                    color: '#22c55e',
                    type: 'Goals',
                  },
                  { name: 'Expenses', amount: spendingWeekly, pct: spendingPct, color: '#3b82f6', type: 'Spending' },
                ];

                return (
                  <>
                    {/* Donut Chart Representation */}
                    <div className="flex justify-center mb-8">
                      <div className="relative w-48 h-48">
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
                                  strokeWidth="12"
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
                            <p style={{ color: theme.textM }} className="text-sm">
                              Per Check
                            </p>
                            <p style={{ color: theme.text }} className="text-2xl font-bold">
                              {fmt(checkAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Allocation Details */}
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
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: item.color }}
                              />
                              <p style={{ color: theme.text }} className="font-semibold">
                                {item.name}
                              </p>
                            </div>
                            <p style={{ color: theme.text }} className="font-bold">
                              {fmt(item.amount)}/wk
                            </p>
                          </div>
                          <div style={{ backgroundColor: theme.bgS }} className="h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.pct}%` }}
                              style={{ backgroundColor: item.color }}
                              className="h-full transition-all"
                            />
                          </div>
                          <p style={{ color: theme.textM }} className="text-xs mt-2">
                            {item.pct.toFixed(1)}% of check
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Rent Tracker */}
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
          <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Home size={28} style={{ color: theme.ok }} />
            Rent Tracker
          </h3>
          <div className="space-y-3">
            {rentPayments.map((payment, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02 }}
                style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p style={{ color: theme.text }} className="font-semibold">
                    {new Date(payment.date).toLocaleDateString()}
                  </p>
                  <p style={{ color: theme.textM }} className="text-sm capitalize">
                    {payment.status}
                  </p>
                </div>
                <p style={{ color: theme.text }} className="font-bold text-lg">
                  {fmt(payment.amount)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
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
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
          <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Heart size={28} style={{ color: theme.ok }} />
            Savings Goals
          </h3>

          {goals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: theme.bgS, borderColor: theme.border }}
              className="border-2 border-dashed rounded-lg p-8 text-center"
            >
              <Heart size={48} style={{ color: theme.textM }} className="mx-auto mb-4 opacity-50" />
              <p style={{ color: theme.textM }} className="mb-4">
                No savings goals yet
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ backgroundColor: theme.gold, color: theme.bgS }}
                className="px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Add Goal
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal: any, idx: number) => {
                const daysRemaining = daysTo(goal.deadline);
                const progressPct = (goal.currentAmount / goal.targetAmount) * 100;

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                    className="border rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p style={{ color: theme.text }} className="font-bold text-lg">
                          {goal.name}
                        </p>
                        <p style={{ color: theme.textM }} className="text-sm">
                          Due in {daysRemaining} days
                        </p>
                      </div>
                      <p style={{ color: theme.gold }} className="font-bold text-lg">
                        {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}
                      </p>
                    </div>

                    <div style={{ backgroundColor: theme.bgS }} className="h-3 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progressPct)}%` }}
                        style={{ backgroundColor: progressPct >= 75 ? theme.ok : theme.warn }}
                        className="h-full transition-all"
                      />
                    </div>

                    <p style={{ color: theme.textM }} className="text-xs">
                      {progressPct.toFixed(1)}% complete
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
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
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-6">
          <h3 style={{ color: theme.text }} className="text-2xl font-bold mb-6 flex items-center gap-3">
            <LineChart size={28} style={{ color: theme.gold }} />
            Credit Score
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div
              style={{ backgroundColor: theme.bgS, borderColor: theme.gold }}
              className="border-2 rounded-lg p-6 text-center"
            >
              <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
                Current Score
              </p>
              <p style={{ color: theme.gold }} className="text-4xl font-bold">
                {creditScore}
              </p>
            </div>

            <div
              style={{ backgroundColor: theme.bgS, borderColor: theme.warn }}
              className="border-2 rounded-lg p-6 text-center"
            >
              <p style={{ color: theme.textM }} className="text-sm font-semibold uppercase mb-2">
                Simulated Score
              </p>
              <p style={{ color: creditScoreSim >= creditScore ? theme.ok : theme.warn }} className="text-4xl font-bold">
                {creditScoreSim}
              </p>
            </div>
          </div>

          {/* Credit Score Simulator */}
          <div className="space-y-6">
            <div>
              <label style={{ color: theme.textS }} className="block text-sm font-semibold mb-3">
                Adjust Your Score
              </label>
              <input
                type="range"
                min="300"
                max="850"
                value={creditScoreSim}
                onChange={(e) => setCreditScoreSim(parseInt(e.target.value))}
                style={{ accentColor: theme.gold }}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span style={{ color: theme.textM }} className="text-xs">
                  300
                </span>
                <span style={{ color: theme.textM }} className="text-xs">
                  850
                </span>
              </div>
            </div>

            {/* Score Impact */}
            <div
              style={{ backgroundColor: theme.bgS, borderColor: theme.border }}
              className="border rounded-lg p-4 space-y-3"
            >
              <p style={{ color: theme.textS }} className="text-sm font-semibold uppercase">
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
            </div>

            {/* Reset Button */}
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
        </div>
      </motion.div>
    );
  };

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
                color: activeTab === tab ? theme.bgS : theme.textM,
              }}
              className="flex-1 py-3 rounded-lg font-semibold capitalize transition-all"
            >
              {tab === 'budget' && <DollarSign className="inline mr-2" size={18} />}
              {tab === 'savings' && <Heart className="inline mr-2" size={18} />}
              {tab === 'credit' && <LineChart className="inline mr-2" size={18} />}
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

// Helper component for Home icon (not in lucide-react)
function Home(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
