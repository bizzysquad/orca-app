'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Heart,
  Lock, Edit3, Plus, Trash2, Pause, Play, LineChart,
  AlertCircle, CheckCircle, Zap, Check, Calendar,
} from 'lucide-react';
import { getDemoData } from '@/lib/demo-data';
import { fmt, fmtD, daysTo, calcAlloc, calcIncome, f2w, pct, getPaycheckAmount } from '@/lib/utils';

export default function SmartStackPage() {
  const data = getDemoData();
  const [activeTab, setActiveTab] = useState<'budget' | 'savings' | 'credit'>('budget');

  // Budget tab state
  const [payFreqToggle, setPayFreqToggle] = useState<'weekly' | 'biweekly'>(
    data.user.payFreq as 'weekly' | 'biweekly'
  );
  const [hourlyRate, setHourlyRate] = useState(parseFloat(data.user.payRate));
  const defaultHours = parseInt(data.user.hoursPerDay) || 8;
  // Pay period start: next pay date as reference, show only the days in the current period
  const payPeriodStart = useMemo(() => {
    const nextPay = new Date(data.user.nextPay + 'T00:00:00');
    const periodDays = payFreqToggle === 'weekly' ? 7 : 14;
    // Find the start of the current pay period (go back from nextPay by periodDays)
    const start = new Date(nextPay);
    start.setDate(start.getDate() - periodDays);
    return start;
  }, [data.user.nextPay, payFreqToggle]);

  const periodDays = payFreqToggle === 'weekly' ? 7 : 14;

  // Build array of dates in the pay period
  const payPeriodDates = useMemo(() => {
    return Array.from({ length: periodDays }, (_, i) => {
      const d = new Date(payPeriodStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [payPeriodStart, periodDays]);

  const [dayHours, setDayHours] = useState<number[]>(
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(payPeriodStart);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      return dow !== 0 && dow !== 6 ? defaultHours : 0;
    })
  );
  const [editingDayHours, setEditingDayHours] = useState<number | null>(null);

  // Reset day hours when frequency changes
  const resetDayHours = (freq: 'weekly' | 'biweekly') => {
    const days = freq === 'weekly' ? 7 : 14;
    const newHours = Array.from({ length: days }, (_, i) => {
      const d = new Date(payPeriodStart);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      return dow !== 0 && dow !== 6 ? defaultHours : 0;
    });
    setDayHours(newHours);
    setEditingDayHours(null);
  };
  const [budgetLocked, setBudgetLocked] = useState(false);

  // Savings tab state
  const [goals, setGoals] = useState(data.goals);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalWeekly, setNewGoalWeekly] = useState('');

  // Credit tab state
  const [simUtilization, setSimUtilization] = useState(data.user.utilization);
  const [simOnTime, setSimOnTime] = useState(data.user.onTime);

  // ─── BUDGET CALCULATIONS ───
  const alloc = useMemo(() => calcAlloc(data.income, data.bills, data.goals), []);
  const paycheckAmount = useMemo(() => getPaycheckAmount(data.user, data.income), []);

  const budgetHealth = useMemo(() => {
    const ratio = paycheckAmount > 0 ? (alloc.br / paycheckAmount) * 100 : 0;
    if (ratio < 70) return { label: 'Healthy', color: '#22c55e' };
    if (ratio < 90) return { label: 'Tight', color: '#f59e0b' };
    return { label: 'Over Budget', color: '#ef4444' };
  }, [paycheckAmount, alloc.br]);

  // Only count hours from the active pay period days
  const activeDayHours = useMemo(() => dayHours.slice(0, periodDays), [dayHours, periodDays]);
  const workingDaysCount = useMemo(() => activeDayHours.filter(h => h > 0).length, [activeDayHours]);
  const totalHoursCalc = useMemo(() => activeDayHours.reduce((sum, h) => sum + h, 0), [activeDayHours]);
  const projectedCheckAmount = useMemo(() => {
    return totalHoursCalc * hourlyRate;
  }, [totalHoursCalc, hourlyRate]);

  // When budget is locked, the check splitter uses the projected check amount
  const activeCheckAmount = budgetLocked ? projectedCheckAmount : paycheckAmount;
  const billsWeekly = useMemo(() => alloc.br, [alloc.br]);
  const savingsWeekly = useMemo(() => alloc.sr, [alloc.sr]);
  const lockedSpending = useMemo(() => Math.max(0, activeCheckAmount - alloc.br - alloc.sr), [activeCheckAmount, alloc.br, alloc.sr]);
  const spendingWeekly = budgetLocked ? lockedSpending : alloc.sts;

  const totalAllocated = billsWeekly + savingsWeekly + spendingWeekly;
  const billsPct = totalAllocated > 0 ? pct(billsWeekly, totalAllocated) : 0;
  const savingsPct = totalAllocated > 0 ? pct(savingsWeekly, totalAllocated) : 0;
  const spendingPct = totalAllocated > 0 ? pct(spendingWeekly, totalAllocated) : 0;

  const allocItems = [
    { name: 'Bills', amount: billsWeekly, pct: billsPct, color: '#ef4444', type: 'Bill' },
    { name: 'Savings', amount: savingsWeekly, pct: savingsPct, color: '#22c55e', type: 'Goal' },
    { name: 'Expenses', amount: spendingWeekly, pct: spendingPct, color: '#3b82f6', type: 'Expenses' },
  ];

  // Paycheck history (4 past, 1 next, 3 future)
  const paycheckHistory = useMemo(() => {
    const today = new Date(2026, 2, 20);
    const dates = [];

    for (let i = -4; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + (i * 14));
      dates.push({
        date: date.toISOString().split('T')[0],
        isPast: i < 0,
        isNext: i === 0,
        isFuture: i > 0,
      });
    }
    return dates;
  }, []);

  // ─── SAVINGS CALCULATIONS ───
  const totalSaved = useMemo(() => goals.reduce((sum, g) => sum + g.current, 0), [goals]);

  const handleCreateGoal = () => {
    if (!newGoalName || !newGoalTarget) return;
    const newGoal = {
      id: `g${Date.now()}`,
      name: newGoalName,
      target: parseFloat(newGoalTarget),
      current: parseFloat(newGoalCurrent) || 0,
      date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cType: 'fixed' as const,
      cVal: parseFloat(newGoalWeekly) || 50,
      active: true,
    };
    setGoals([...goals, newGoal]);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setNewGoalWeekly('');
  };

  const handleAddToGoal = (id: string, amount: number) => {
    setGoals(goals.map(g =>
      g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g
    ));
  };

  const handleToggleGoal = (id: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, active: !g.active } : g));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  // ─── CREDIT CALCULATIONS ───
  const simScore = useMemo(() => {
    const base = data.user.creditScore;
    const utilChange = (simUtilization - data.user.utilization) * 0.5;
    const paymentChange = (simOnTime - data.user.onTime) * 0.3;
    return Math.max(300, Math.min(850, Math.round(base + utilChange + paymentChange)));
  }, [simUtilization, simOnTime]);

  const scoreColor = useMemo(() => {
    if (simScore >= 750) return '#22c55e';
    if (simScore >= 700) return '#f59e0b';
    return '#ef4444';
  }, [simScore]);

  const scoreLabel = useMemo(() => {
    if (simScore >= 800) return 'Excellent';
    if (simScore >= 740) return 'Very Good';
    if (simScore >= 670) return 'Good';
    if (simScore >= 580) return 'Fair';
    return 'Poor';
  }, [simScore]);

  // ─── RENDER TAB CONTENT ───
  const renderBudgetTab = () => (
    <div className="space-y-6 pb-24">
      {/* Weekly Safe to Spend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#18181b] to-[#09090b] border border-[#27272a] rounded-xl p-8 text-center"
      >
        <p className="text-[#a1a1aa] text-sm mb-2">Weekly Safe to Spend</p>
        <p className="text-[#d4a843] text-4xl font-bold">{fmt(alloc.sts)}</p>
        <p className="text-[#71717a] text-sm mt-2">{fmt(alloc.daily)}/day</p>
      </motion.div>

      {/* Income / Expense Ratio */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#fafafa] font-semibold">Income / Expense Ratio</h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30">
            <CheckCircle size={14} className="text-[#22c55e]" />
            <span className="text-[#22c55e] text-xs font-medium">{budgetHealth.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#09090b] rounded-lg p-4">
            <p className="text-[#a1a1aa] text-xs mb-1">Paycheck</p>
            <p className="text-[#22c55e] text-xl font-bold">{fmt(paycheckAmount)}</p>
          </div>
          <div className="bg-[#09090b] rounded-lg p-4">
            <p className="text-[#a1a1aa] text-xs mb-1">Allocated</p>
            <p className="text-[#ef4444] text-xl font-bold">{fmt(alloc.br)}</p>
          </div>
        </div>

        <div className="w-full bg-[#27272a] rounded-full h-2 overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (alloc.br / paycheckAmount) * 100)}%` }}
            className="h-full bg-gradient-to-r from-[#22c55e] to-[#ef4444]"
          />
        </div>

        <p className="text-[#a1a1aa] text-sm">
          {alloc.br <= paycheckAmount ? (
            <>Remaining: <span className="text-[#22c55e] font-semibold">{fmt(paycheckAmount - alloc.br)}</span></>
          ) : (
            <>Deficit: <span className="text-[#ef4444] font-semibold">{fmt(alloc.br - paycheckAmount)}</span></>
          )}
          {' '} • <span className="text-[#d4a843]">{Math.round((alloc.br / paycheckAmount) * 100)}% used</span>
        </p>
      </motion.div>

      {/* Check Projection Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-4">Check Projection Calendar</h3>

        {/* Frequency Toggle */}
        <div className="flex gap-2 mb-6">
          {(['weekly', 'biweekly'] as const).map(freq => (
            <button
              key={freq}
              onClick={() => {
                setPayFreqToggle(freq);
                resetDayHours(freq);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                payFreqToggle === freq
                  ? 'bg-[#d4a843] text-[#09090b]'
                  : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#2d2d30]'
              }`}
            >
              {freq === 'weekly' ? 'Weekly' : 'Bi-Weekly'}
            </button>
          ))}
        </div>

        {/* Rate & Hours */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-[#a1a1aa] text-xs block mb-2">Hourly Rate</label>
            <div className="flex items-center gap-2">
              <span className="text-[#71717a]">$</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded px-3 py-2 flex-1 focus:outline-none focus:border-[#d4a843]"
              />
            </div>
          </div>
          <div>
            <label className="text-[#a1a1aa] text-xs block mb-2">Total Hours</label>
            <p className="text-[#fafafa] text-lg font-semibold px-3 py-2">{totalHoursCalc}h</p>
            <p className="text-[#71717a] text-xs">Tap a day to adjust hours</p>
          </div>
        </div>

        {/* Pay Period Label */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#a1a1aa] text-xs">
            Pay Period: {payPeriodDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {payPeriodDates[periodDays - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[#71717a] text-xs">{periodDays} days</p>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#09090b] rounded-lg p-4 mb-6">
          <div className={`grid ${periodDays === 7 ? 'grid-cols-7' : 'grid-cols-7'} gap-2 mb-2`}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[#a1a1aa] text-[10px] font-semibold py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Render only the pay period days, aligned to correct weekday columns */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells before first day of period */}
            {Array.from({ length: payPeriodDates[0]?.getDay() || 0 }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {payPeriodDates.map((dateObj, i) => {
              const hours = dayHours[i] ?? 0;
              const today = new Date();
              const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
              const isWorking = hours > 0;
              const isEditing = editingDayHours === i;
              const dayNum = dateObj.getDate();

              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingDayHours(null);
                      } else {
                        setEditingDayHours(i);
                      }
                    }}
                    onDoubleClick={() => {
                      const newHours = [...dayHours];
                      newHours[i] = hours > 0 ? 0 : defaultHours;
                      setDayHours(newHours);
                    }}
                    className={`w-full aspect-square rounded-lg font-semibold text-sm transition-all ${
                      isToday ? 'border-2 border-[#d4a843]' : 'border border-[#27272a]'
                    } ${
                      isWorking
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#ef4444]/20 text-[#ef4444]'
                    } ${
                      isEditing ? 'ring-2 ring-[#d4a843]' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs">{dayNum}</span>
                      {isWorking && <span className="text-[8px] opacity-70">{hours}h</span>}
                    </div>
                  </button>
                  {isEditing && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 bg-[#27272a] border border-[#d4a843]/50 rounded-lg p-2 shadow-lg min-w-[80px]">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={hours}
                        onChange={(e) => {
                          const newHours = [...dayHours];
                          newHours[i] = Math.min(24, Math.max(0, parseInt(e.target.value) || 0));
                          setDayHours(newHours);
                        }}
                        className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-[#d4a843]"
                        autoFocus
                        onBlur={() => setEditingDayHours(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingDayHours(null); }}
                      />
                      <p className="text-[8px] text-[#71717a] text-center mt-1">hours</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#27272a] rounded-lg p-3 text-center">
            <p className="text-[#a1a1aa] text-xs mb-1">Days Working</p>
            <p className="text-[#22c55e] font-bold text-lg">{workingDaysCount}</p>
          </div>
          <div className="bg-[#27272a] rounded-lg p-3 text-center">
            <p className="text-[#a1a1aa] text-xs mb-1">Days Off</p>
            <p className="text-[#ef4444] font-bold text-lg">{periodDays - workingDaysCount}</p>
          </div>
          <div className="bg-[#27272a] rounded-lg p-3 text-center">
            <p className="text-[#a1a1aa] text-xs mb-1">Total Hours</p>
            <p className="text-[#d4a843] font-bold text-lg">{totalHoursCalc}</p>
          </div>
        </div>

        {/* Projected Check Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl p-6 text-center mb-4 ${
            projectedCheckAmount >= paycheckAmount
              ? 'bg-gradient-to-br from-[#22c55e]/20 to-[#16a34a]/10 border border-[#22c55e]/30'
              : 'bg-gradient-to-br from-[#ef4444]/20 to-[#dc2626]/10 border border-[#ef4444]/30'
          }`}
        >
          <p className="text-[#a1a1aa] text-sm mb-2">Projected Check</p>
          <p className={`text-3xl font-bold ${projectedCheckAmount >= paycheckAmount ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {fmt(projectedCheckAmount)}
          </p>
          {projectedCheckAmount !== paycheckAmount && (
            <p className="text-[#a1a1aa] text-xs mt-2">
              {projectedCheckAmount > paycheckAmount ? '+' : ''}{fmt(projectedCheckAmount - paycheckAmount)}
            </p>
          )}
        </motion.div>

        {/* Lock/Edit Button */}
        <button
          onClick={() => setBudgetLocked(!budgetLocked)}
          className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: budgetLocked ? '#d4a843' : '#27272a',
            color: budgetLocked ? '#09090b' : '#fafafa',
          }}
        >
          {budgetLocked ? (
            <>
              <Lock size={16} />
              Locked In
            </>
          ) : (
            <>
              <Edit3 size={16} />
              Edit
            </>
          )}
        </button>
      </motion.div>

      {/* Check Splitter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-4">Check Splitter</h3>
        <div className="space-y-3">
          {allocItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="bg-[#09090b] rounded-lg p-4"
            >
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <p className="text-[#fafafa] font-medium">{item.name}</p>
                    <p className="text-[#d4a843] font-bold">{fmt(item.amount)}</p>
                  </div>
                  <p className="text-[#a1a1aa] text-xs">{item.type}</p>
                </div>
              </div>
              <div className="w-full bg-[#27272a] rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  className="h-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
              <p className="text-[#71717a] text-xs mt-2 text-right">{item.pct}%</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Paycheck History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-4">Paycheck History</h3>
        <div className="space-y-2">
          {paycheckHistory.map((pc, idx) => {
            const daysFromNow = daysTo(pc.date);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  pc.isNext
                    ? 'bg-[#d4a843]/10 border border-[#d4a843]/30'
                    : 'bg-[#27272a] border border-[#27272a]'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {pc.isPast && <CheckCircle size={16} className="text-[#22c55e]" />}
                  {pc.isNext && <Zap size={16} className="text-[#d4a843]" />}
                  {pc.isFuture && <Calendar size={16} className="text-[#71717a]" />}
                  <div>
                    <p className="text-[#fafafa] text-sm font-medium">{fmtD(pc.date)}</p>
                    <p className="text-[#a1a1aa] text-xs">
                      {pc.isPast && 'Paid ✓'}
                      {pc.isNext && 'Next'}
                      {pc.isFuture && `In ${daysFromNow} days`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {pc.isNext && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-[#d4a843] text-[#09090b] mr-2">
                      Next
                    </span>
                  )}
                  <p className="text-[#fafafa] font-bold">{fmt(paycheckAmount)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );

  const renderSavingsTab = () => (
    <div className="space-y-6 pb-24">
      {/* Total Saved */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#22c55e]/20 to-[#16a34a]/10 border border-[#22c55e]/30 rounded-xl p-8 text-center"
      >
        <p className="text-[#a1a1aa] text-sm mb-2">Total Saved</p>
        <p className="text-[#22c55e] text-4xl font-bold">{fmt(totalSaved)}</p>
      </motion.div>

      {/* Create Goal Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-4">Create New Goal</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[#a1a1aa] text-xs block mb-2">Goal Name</label>
            <input
              type="text"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              placeholder="e.g., Emergency Fund"
              className="w-full bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:border-[#d4a843] placeholder-[#71717a]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[#a1a1aa] text-xs block mb-2">Target</label>
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="10000"
                className="w-full bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:border-[#d4a843] placeholder-[#71717a]"
              />
            </div>
            <div>
              <label className="text-[#a1a1aa] text-xs block mb-2">Current</label>
              <input
                type="number"
                value={newGoalCurrent}
                onChange={(e) => setNewGoalCurrent(e.target.value)}
                placeholder="2000"
                className="w-full bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:border-[#d4a843] placeholder-[#71717a]"
              />
            </div>
            <div>
              <label className="text-[#a1a1aa] text-xs block mb-2">Weekly</label>
              <input
                type="number"
                value={newGoalWeekly}
                onChange={(e) => setNewGoalWeekly(e.target.value)}
                placeholder="75"
                className="w-full bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:border-[#d4a843] placeholder-[#71717a]"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleCreateGoal}
          className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-[#d4a843] text-[#09090b] hover:bg-[#e5b75d]"
        >
          <Plus size={16} />
          Create Goal
        </button>
      </motion.div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-[#fafafa] font-semibold">{goal.name}</h4>
                <p className="text-[#a1a1aa] text-sm">
                  {fmt(goal.current)} / {fmt(goal.target)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#d4a843] font-bold text-lg">{pct(goal.current, goal.target)}%</p>
              </div>
            </div>

            <div className="w-full bg-[#27272a] rounded-full h-2 overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(goal.current, goal.target)}%` }}
                className="h-full bg-[#22c55e]"
              />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                placeholder="Add amount"
                defaultValue=""
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const amount = parseFloat((e.target as HTMLInputElement).value);
                    if (amount > 0) {
                      handleAddToGoal(goal.id, amount);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                className="flex-1 bg-[#27272a] border border-[#2d2d30] text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:border-[#d4a843] placeholder-[#71717a] text-sm"
              />
              <button
                onClick={() => {
                  const input = document.querySelector(`input[placeholder="Add amount"]`) as HTMLInputElement;
                  if (input) {
                    const amount = parseFloat(input.value);
                    if (amount > 0) {
                      handleAddToGoal(goal.id, amount);
                      input.value = '';
                    }
                  }
                }}
                className="px-3 py-2 bg-[#d4a843] text-[#09090b] rounded-lg font-medium transition-all hover:bg-[#e5b75d]"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleGoal(goal.id)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  goal.active
                    ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                    : 'bg-[#27272a] text-[#a1a1aa] border border-[#27272a]'
                }`}
              >
                {goal.active ? <Play size={14} /> : <Pause size={14} />}
                {goal.active ? 'Active' : 'Paused'}
              </button>
              <button
                onClick={() => handleDeleteGoal(goal.id)}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderCreditTab = () => (
    <div className="space-y-6 pb-24">
      {/* Score Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center"
      >
        <p className="text-[#a1a1aa] text-sm mb-4">Credit Score</p>
        <p style={{ color: scoreColor }} className="text-6xl font-bold mb-2">
          {data.user.creditScore}
        </p>
        <p style={{ color: scoreColor }} className="font-semibold mb-4">
          {scoreLabel}
        </p>
        <div className="w-full bg-[#27272a] rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((data.user.creditScore - 300) / 550) * 100}%` }}
            className="h-full bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]"
          />
        </div>
        <div className="flex justify-between text-[#71717a] text-xs mt-2">
          <span>300</span>
          <span>850</span>
        </div>
      </motion.div>

      {/* Score History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-4">Score History</h3>
        <div className="bg-[#09090b] rounded-lg p-4 h-48 flex items-end justify-between gap-2">
          {data.user.scoreHistory.map((entry, idx) => {
            const height = ((entry.s - 700) / 150) * 100;
            return (
              <motion.div
                key={idx}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(5, height)}%` }}
                transition={{ delay: 0.05 * idx }}
                className="flex-1 rounded-t-lg group relative"
                style={{ backgroundColor: '#d4a843' }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#27272a] text-[#fafafa] text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
                  {entry.s}
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="grid grid-cols-6 gap-2 mt-4">
          {data.user.scoreHistory.map((entry, idx) => (
            <p key={idx} className="text-[#a1a1aa] text-xs text-center font-medium">
              {entry.m}
            </p>
          ))}
        </div>
      </motion.div>

      {/* Credit Factors */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="text-[#fafafa] font-semibold px-2">What Makes Your Score</h3>
        {[
          { label: 'Payment History', pct: 35, current: data.user.onTime },
          { label: 'Utilization', pct: 30, current: data.user.utilization },
          { label: 'Account Age', pct: 15, current: Math.min(100, (data.user.acctAge / 10) * 100) },
          { label: 'Credit Mix', pct: 10, current: 80 },
          { label: 'Inquiries', pct: 10, current: Math.max(0, 100 - (data.user.inquiries * 15)) },
        ].map((factor, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="bg-[#18181b] border border-[#27272a] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#fafafa] font-semibold text-sm">{factor.label}</p>
              <p className="text-[#d4a843] text-sm font-bold">{factor.pct}%</p>
            </div>
            <div className="w-full bg-[#27272a] rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${factor.current}%` }}
                className="h-full bg-[#22c55e]"
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Score Simulator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-6"
      >
        <h3 className="text-[#fafafa] font-semibold mb-6">Score Simulator</h3>

        <div className="bg-[#09090b] rounded-lg p-6 mb-6 text-center">
          <p className="text-[#a1a1aa] text-sm mb-2">Simulated Score</p>
          <p style={{ color: scoreColor }} className="text-5xl font-bold">
            {simScore}
          </p>
          <p style={{ color: scoreColor }} className="text-sm mt-2">
            {scoreLabel}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[#fafafa] font-medium text-sm">Utilization</label>
              <span className="text-[#d4a843] font-bold">{simUtilization}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simUtilization}
              onChange={(e) => setSimUtilization(parseInt(e.target.value))}
              className="w-full h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#d4a843]"
            />
            <p className="text-[#71717a] text-xs mt-2">
              Lower utilization = higher score (aim for under 10%)
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[#fafafa] font-medium text-sm">On-Time Payments</label>
              <span className="text-[#d4a843] font-bold">{simOnTime}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simOnTime}
              onChange={(e) => setSimOnTime(parseInt(e.target.value))}
              className="w-full h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#d4a843]"
            />
            <p className="text-[#71717a] text-xs mt-2">
              Payment history is 35% of your score (aim for 100%)
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <h3 className="text-[#fafafa] font-semibold px-2">AI Insights</h3>
        {[
          {
            icon: TrendingDown,
            title: 'Lower Your Utilization',
            msg: `Your utilization is at ${data.user.utilization}%. Try to keep it under 10% for optimal credit health.`,
            type: 'warn' as const,
          },
          {
            icon: CheckCircle,
            title: 'Excellent Payment History',
            msg: `You're at ${data.user.onTime}% on-time payments. Keep it up to maintain a strong score!`,
            type: 'ok' as const,
          },
          {
            icon: Heart,
            title: 'Rent Reporting Available',
            msg: 'Connect your rent payments to build credit history even faster.',
            type: 'info' as const,
          },
          {
            icon: AlertCircle,
            title: `${data.user.inquiries} Recent Inquiries`,
            msg: `Each inquiry can temporarily lower your score. Space out new credit applications if possible.`,
            type: 'warn' as const,
          },
          {
            icon: TrendingUp,
            title: 'Debt Snowball Strategy',
            msg: 'Focus on paying off your highest-interest debt first to improve your score faster.',
            type: 'info' as const,
          },
          {
            icon: Target,
            title: '50/30/20 Budget Rule',
            msg: 'Allocate 50% to needs, 30% to wants, 20% to savings. Your current ratio shows good discipline.',
            type: 'ok' as const,
          },
        ].map((insight, idx) => {
          const Icon = insight.icon;
          const bgColor =
            insight.type === 'warn'
              ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
              : insight.type === 'ok'
              ? 'bg-[#22c55e]/10 border-[#22c55e]/30'
              : 'bg-[#3b82f6]/10 border-[#3b82f6]/30';
          const iconColor =
            insight.type === 'warn'
              ? 'text-[#f59e0b]'
              : insight.type === 'ok'
              ? 'text-[#22c55e]'
              : 'text-[#3b82f6]';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className={`bg-[#18181b] border rounded-xl p-4 ${bgColor}`}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1">
                  <p className="text-[#fafafa] font-semibold text-sm">{insight.title}</p>
                  <p className="text-[#a1a1aa] text-sm mt-1">{insight.msg}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b] border-b border-[#27272a] px-6 py-4">
        <h1 className="text-3xl font-bold text-[#d4a843]">Smart Stack</h1>
        <p className="text-[#a1a1aa] text-sm mt-1">Monitor, plan, and optimize your finances</p>
      </div>

      {/* Content Area */}
      <div className="px-6 pt-6">
        {activeTab === 'budget' && renderBudgetTab()}
        {activeTab === 'savings' && renderSavingsTab()}
        {activeTab === 'credit' && renderCreditTab()}
      </div>

      {/* Sticky Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#09090b] border-t border-[#27272a] px-6">
        <div className="flex justify-around max-w-4xl mx-auto">
          {(['budget', 'savings', 'credit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 font-semibold transition-all relative ${
                activeTab === tab
                  ? 'text-[#d4a843]'
                  : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-border"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#d4a843]"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
