import { useState, useMemo } from "react";

// ============================================================
// SMART STACK - Paycheck Budgeting App MVP
// Built with React + Tailwind-inspired inline styles
// ============================================================

// ---------- CONSTANTS ----------
const BRAND = { name: 'Smart Stack', tagline: 'Your paycheck, organized.' };
const PREMIUM_PRICE = 4.99;
const TRIAL_DAYS = 40;
const FOUNDING_USER_LIMIT = 500;

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', weeksPerYear: 52 },
  { value: 'biweekly', label: 'Every 2 Weeks', weeksPerYear: 26 },
  { value: 'semimonthly', label: 'Twice a Month', weeksPerYear: 24 },
  { value: 'monthly', label: 'Monthly', weeksPerYear: 12 },
];

const BILL_CATEGORIES = [
  'Rent / Mortgage', 'Utilities', 'Phone / Internet', 'Insurance',
  'Debt / Credit Cards', 'Subscription Bills', 'Car Note',
  'Childcare', 'Medical Bills', 'Other Bills',
];

const EXPENSE_CATEGORIES = [
  'Groceries', 'Gas / Transportation', 'Dining Out', 'Entertainment',
  'Shopping', 'Medical', 'Childcare', 'Miscellaneous',
  'App / TV Subscriptions', 'Household', 'Personal Care',
];

const SAVINGS_PRESETS = [
  'Emergency Fund', 'Vacation', 'Moving Fund', 'Car Fund',
  'Holiday Fund', 'Custom',
];

const SPLIT_MODES = [
  { value: 'equal', label: 'Equal Weekly Split', desc: 'Divide all obligations equally across each week' },
  { value: 'due_date', label: 'Due-Date Aware', desc: 'Set aside more when a bill is due before next payday' },
  { value: 'priority', label: 'Priority First', desc: 'Cover essentials first, then allocate the rest' },
];

const PRIORITY_ORDER = [
  'Rent / Mortgage', 'Groceries', 'Gas / Transportation', 'Utilities',
  'Insurance', 'Debt / Credit Cards', 'Savings', 'Other',
];

const COLORS = {
  primary: '#6366f1',    // indigo
  primaryDark: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  accent: '#8b5cf6',
};

// ---------- UTILITY FUNCTIONS ----------

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

function getWeekEnd() {
  const d = new Date(); d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().split('T')[0];
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function percentage(current, target) {
  if (!target || target === 0) return 0;
  return clamp(Math.round((current / target) * 100), 0, 100);
}

// ---------- CORE CALCULATION ENGINE ----------

function frequencyToWeekly(amount, frequency) {
  switch (frequency) {
    case 'weekly': return amount;
    case 'biweekly': return amount / 2;
    case 'semimonthly': return (amount * 24) / 52;
    case 'monthly': return (amount * 12) / 52;
    case 'quarterly': return (amount * 4) / 52;
    case 'yearly': return amount / 52;
    default: return (amount * 12) / 52;
  }
}

function frequencyToMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly': return amount * (52 / 12);
    case 'biweekly': return amount * (26 / 12);
    case 'semimonthly': return amount * 2;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

function calculateWeeklyIncome(incomeSources) {
  return incomeSources
    .filter(s => s.isActive !== false)
    .reduce((sum, s) => sum + frequencyToWeekly(s.amount, s.frequency), 0);
}

function calculateMonthlyIncome(incomeSources) {
  return incomeSources
    .filter(s => s.isActive !== false)
    .reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);
}

function calculateWeeklyBillReserve(bills) {
  return bills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + frequencyToWeekly(b.amount, b.frequency || 'monthly'), 0);
}

function calculateDueDateAwareReserve(bills, nextPayday) {
  let reserve = 0;
  const today = getToday();
  bills.filter(b => b.status !== 'paid').forEach(bill => {
    const weeklyAmount = frequencyToWeekly(bill.amount, bill.frequency || 'monthly');
    const daysToDue = daysUntil(bill.dueDate);
    const daysToPayday = daysUntil(nextPayday);
    if (daysToDue >= 0 && daysToDue <= daysToPayday) {
      reserve += bill.amount;
    } else {
      reserve += weeklyAmount;
    }
  });
  return reserve;
}

function calculatePriorityFirstReserve(bills, totalIncome) {
  let remaining = totalIncome;
  const allocations = [];
  const sortedBills = [...bills].filter(b => b.status !== 'paid').sort((a, b) => {
    const aIdx = PRIORITY_ORDER.findIndex(p => a.category?.includes(p.split(' ')[0]));
    const bIdx = PRIORITY_ORDER.findIndex(p => b.category?.includes(p.split(' ')[0]));
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
  sortedBills.forEach(bill => {
    const weeklyAmt = frequencyToWeekly(bill.amount, bill.frequency || 'monthly');
    const allocated = Math.min(weeklyAmt, remaining);
    remaining = Math.max(0, remaining - weeklyAmt);
    allocations.push({ ...bill, weeklyAllocated: allocated, fullyCovered: allocated >= weeklyAmt });
  });
  return { allocations, totalReserved: totalIncome - remaining, remaining };
}

function calculateWeeklyAllocation(incomeSources, bills, savingsGoals, splitMode, nextPayday) {
  const weeklyIncome = calculateWeeklyIncome(incomeSources);
  let reservedForBills;

  switch (splitMode) {
    case 'due_date':
      reservedForBills = calculateDueDateAwareReserve(bills, nextPayday);
      break;
    case 'priority':
      const result = calculatePriorityFirstReserve(bills, weeklyIncome);
      reservedForBills = result.totalReserved;
      break;
    default:
      reservedForBills = calculateWeeklyBillReserve(bills);
  }

  const reservedForSavings = savingsGoals
    .filter(g => g.isActive !== false)
    .reduce((sum, g) => {
      if (g.contributionType === 'fixed') return sum + (g.contributionValue || 0);
      if (g.contributionType === 'percentage') return sum + (weeklyIncome * (g.contributionValue || 0) / 100);
      return sum;
    }, 0);

  const safeToSpendWeekly = Math.max(0, weeklyIncome - reservedForBills - reservedForSavings);
  const safeToSpendDaily = safeToSpendWeekly / 7;
  const shortfall = Math.max(0, (reservedForBills + reservedForSavings) - weeklyIncome);

  return {
    totalIncome: weeklyIncome,
    reservedForBills,
    reservedForSavings,
    safeToSpendWeekly,
    safeToSpendDaily,
    shortfall,
    periodStart: getWeekStart(),
    periodEnd: getWeekEnd(),
  };
}

function calculateBudgetHealth(allocation) {
  const { totalIncome, shortfall, safeToSpendWeekly } = allocation;
  if (totalIncome === 0) return { score: 0, label: 'No Income', color: COLORS.textMuted };
  if (shortfall > 0) return { score: 25, label: 'At Risk', color: COLORS.danger };
  const ratio = safeToSpendWeekly / totalIncome;
  if (ratio < 0.1) return { score: 50, label: 'Tight', color: COLORS.warning };
  if (ratio < 0.25) return { score: 70, label: 'Fair', color: COLORS.warning };
  return { score: 90, label: 'Healthy', color: COLORS.success };
}

function generateInsights(bills, expenses, savingsGoals, allocation) {
  const insights = [];

  // Subscription spending
  const subBills = bills.filter(b => b.category === 'Subscription Bills' || b.category === 'App / TV Subscriptions');
  const monthlySubTotal = subBills.reduce((s, b) => s + frequencyToMonthly(b.amount, b.frequency || 'monthly'), 0);
  if (monthlySubTotal > 40) {
    insights.push({
      type: 'warning', icon: '📺',
      title: 'Subscription Check',
      message: `Your subscriptions total ${formatCurrency(monthlySubTotal)}/month. Review if all are needed.`,
    });
  }

  // Dining out
  const diningExpenses = expenses.filter(e => e.category === 'Dining Out');
  const weeklyDining = diningExpenses.reduce((s, e) => s + e.amount, 0);
  if (weeklyDining > 50) {
    insights.push({
      type: 'warning', icon: '🍽️',
      title: 'Dining Spending',
      message: `You've spent ${formatCurrency(weeklyDining)} on dining out. Consider meal prepping to save.`,
    });
  }

  // Savings behind
  savingsGoals.filter(g => g.isActive && g.targetDate).forEach(goal => {
    const weeksLeft = Math.max(1, daysUntil(goal.targetDate) / 7);
    const needed = (goal.targetAmount - goal.currentAmount) / weeksLeft;
    const actual = goal.contributionType === 'fixed' ? goal.contributionValue : 0;
    if (needed > actual * 1.2) {
      insights.push({
        type: 'info', icon: '🎯',
        title: `${goal.name} Goal`,
        message: `You need ${formatCurrency(needed)}/week to hit your goal. Consider bumping your contribution.`,
      });
    }
  });

  // Shortfall
  if (allocation.shortfall > 0) {
    insights.push({
      type: 'danger', icon: '⚠️',
      title: 'Budget Shortfall',
      message: `You're projected to be ${formatCurrency(allocation.shortfall)} short this week. Review non-essential spending.`,
    });
  }

  // Overdue bills
  const overdueBills = bills.filter(b => b.status === 'overdue' || (daysUntil(b.dueDate) < 0 && b.status !== 'paid'));
  if (overdueBills.length > 0) {
    insights.push({
      type: 'danger', icon: '🔴',
      title: 'Overdue Bills',
      message: `${overdueBills.length} bill(s) are overdue. Prioritize these to avoid late fees.`,
    });
  }

  // Entertainment
  const entExpenses = expenses.filter(e => e.category === 'Entertainment');
  const weeklyEnt = entExpenses.reduce((s, e) => s + e.amount, 0);
  if (weeklyEnt > 40) {
    insights.push({
      type: 'warning', icon: '🎮',
      title: 'Entertainment Spending',
      message: `${formatCurrency(weeklyEnt)} on entertainment this week. Cutting ${formatCurrency(15)} keeps you on track.`,
    });
  }

  return insights.length > 0 ? insights : [{
    type: 'success', icon: '✅',
    title: 'Looking Good!',
    message: 'Your budget is on track this week. Keep it up!',
  }];
}

// ---------- SEED DATA ----------

function createSeedData() {
  const today = getToday();
  return {
    user: {
      id: generateId(), name: '', email: '',
      onboardingComplete: false, isFoundingUser: true,
      trialStartAt: today, trialEndAt: addDays(today, TRIAL_DAYS),
      subscriptionStatus: 'trial', premiumStatus: true,
      twoFactorEnabled: false, twoFactorMethod: 'none',
      payFrequency: 'biweekly', nextPayday: addDays(today, 10),
    },
    incomeSources: [],
    bills: [],
    expenses: [],
    savingsGoals: [],
    splitMode: 'equal',
    notifications: [],
    groups: [],
  };
}

function createDemoData() {
  const today = getToday();
  return {
    user: {
      id: generateId(), name: 'Alex Johnson', email: 'alex@example.com',
      onboardingComplete: true, isFoundingUser: true,
      trialStartAt: addDays(today, -10), trialEndAt: addDays(today, 30),
      subscriptionStatus: 'trial', premiumStatus: true,
      twoFactorEnabled: false, twoFactorMethod: 'none',
      payFrequency: 'biweekly', nextPayday: addDays(today, 4),
    },
    incomeSources: [
      { id: generateId(), sourceName: 'Main Job', amount: 2400, frequency: 'biweekly', nextPaymentDate: addDays(today, 4), recurring: true, isActive: true },
      { id: generateId(), sourceName: 'Freelance Work', amount: 300, frequency: 'monthly', nextPaymentDate: addDays(today, 12), recurring: true, isActive: true },
    ],
    bills: [
      { id: generateId(), name: 'Rent', amount: 1200, category: 'Rent / Mortgage', dueDate: addDays(today, 12), frequency: 'monthly', isEssential: true, isFixed: true, autopay: false, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 7, notes: '' },
      { id: generateId(), name: 'Electric Bill', amount: 95, category: 'Utilities', dueDate: addDays(today, 8), frequency: 'monthly', isEssential: true, isFixed: false, autopay: true, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 3, notes: '' },
      { id: generateId(), name: 'Car Insurance', amount: 180, category: 'Insurance', dueDate: addDays(today, 18), frequency: 'monthly', isEssential: true, isFixed: true, autopay: true, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 3, notes: '' },
      { id: generateId(), name: 'Phone Bill', amount: 65, category: 'Phone / Internet', dueDate: addDays(today, 5), frequency: 'monthly', isEssential: true, isFixed: true, autopay: false, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 3, notes: '' },
      { id: generateId(), name: 'Netflix', amount: 15.99, category: 'Subscription Bills', dueDate: addDays(today, 20), frequency: 'monthly', isEssential: false, isFixed: true, autopay: true, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 1, notes: '' },
      { id: generateId(), name: 'Spotify', amount: 10.99, category: 'Subscription Bills', dueDate: addDays(today, 22), frequency: 'monthly', isEssential: false, isFixed: true, autopay: true, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 1, notes: '' },
      { id: generateId(), name: 'Credit Card Min', amount: 150, category: 'Debt / Credit Cards', dueDate: addDays(today, 15), frequency: 'monthly', isEssential: true, isFixed: false, autopay: false, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 7, notes: '' },
    ],
    expenses: [
      { id: generateId(), name: 'Grocery run', amount: 62.40, category: 'Groceries', date: addDays(today, -2), isEssential: true, isFixed: false, notes: '' },
      { id: generateId(), name: 'Gas fill-up', amount: 45.00, category: 'Gas / Transportation', date: addDays(today, -1), isEssential: true, isFixed: false, notes: '' },
      { id: generateId(), name: 'Dinner with friends', amount: 38.50, category: 'Dining Out', date: today, isEssential: false, isFixed: false, notes: '' },
      { id: generateId(), name: 'New headphones', amount: 29.99, category: 'Shopping', date: addDays(today, -3), isEssential: false, isFixed: false, notes: '' },
    ],
    savingsGoals: [
      { id: generateId(), name: 'Emergency Fund', targetAmount: 2000, currentAmount: 480, targetDate: addDays(today, 180), contributionType: 'fixed', contributionValue: 25, isActive: true },
      { id: generateId(), name: 'Vacation', targetAmount: 1500, currentAmount: 220, targetDate: addDays(today, 270), contributionType: 'fixed', contributionValue: 15, isActive: true },
    ],
    splitMode: 'equal',
    notifications: [
      { id: generateId(), type: 'bill_reminder', title: 'Phone Bill Due Soon', body: 'Your phone bill of $65 is due in 5 days.', readStatus: false, scheduledAt: today, createdAt: today },
      { id: generateId(), type: 'smart_alert', title: 'Budget Tip', body: 'Dining out is trending above your target this week.', readStatus: false, scheduledAt: today, createdAt: today },
    ],
    groups: [
      {
        id: generateId(), ownerUserId: 'demo', groupName: 'Beach Trip Crew', goalName: 'Summer Beach Trip',
        targetAmount: 3000, targetDate: addDays(today, 120), currentAmount: 1240,
        inviteCode: 'BEACH24', isActive: true,
        members: [
          { id: generateId(), name: 'Alex (You)', role: 'owner', weeklyTarget: 30, totalContributed: 450 },
          { id: generateId(), name: 'Jordan', role: 'member', weeklyTarget: 25, totalContributed: 380 },
          { id: generateId(), name: 'Morgan', role: 'member', weeklyTarget: 20, totalContributed: 290 },
          { id: generateId(), name: 'Taylor', role: 'member', weeklyTarget: 15, totalContributed: 120 },
        ],
        activity: [
          { id: generateId(), userName: 'Jordan', type: 'contribution', message: 'Jordan added $25', createdAt: addDays(today, -1) },
          { id: generateId(), userName: 'System', type: 'milestone', message: 'The group reached 40% of its goal! 🎉', createdAt: addDays(today, -2) },
          { id: generateId(), userName: 'Alex', type: 'contribution', message: 'Alex added $30', createdAt: addDays(today, -3) },
          { id: generateId(), userName: 'Morgan', type: 'contribution', message: 'Morgan added $20', createdAt: addDays(today, -4) },
          { id: generateId(), userName: 'Taylor', type: 'message', message: 'Taylor: "Let\'s keep it up team!"', createdAt: addDays(today, -5) },
        ],
      }
    ],
  };
}
// ============================================================
// SMART STACK - Part 2: Shared UI Components + Onboarding
// ============================================================

// ---------- SHARED UI COMPONENTS ----------

function Icon({ name, size = 20, color }) {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    bill: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    expense: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    split: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>,
    savings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    group: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    insights: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    chevronLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color||"currentColor"} stroke={color||"currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    crown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>,
  };
  return icons[name] || null;
}

function Card({ children, style, onClick, className }) {
  return (
    <div onClick={onClick} className={className} style={{
      background: '#fff', borderRadius: 16, padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid #f1f5f9', transition: 'all 0.2s ease',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'md', style, disabled, fullWidth }) {
  const base = {
    border: 'none', borderRadius: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s ease', opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto', fontFamily: 'inherit',
  };
  const sizes = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '12px 24px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 16 },
  };
  const variants = {
    primary: { background: COLORS.primary, color: '#fff' },
    secondary: { background: '#f1f5f9', color: COLORS.text },
    success: { background: COLORS.success, color: '#fff' },
    danger: { background: '#fef2f2', color: COLORS.danger },
    ghost: { background: 'transparent', color: COLORS.primary },
    outline: { background: 'transparent', color: COLORS.primary, border: `2px solid ${COLORS.primary}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, style, prefix, suffix, required }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>{label}{required && <span style={{color: COLORS.danger}}> *</span>}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 14, color: COLORS.textMuted, fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '12px 14px', paddingLeft: prefix ? 28 : 14,
            paddingRight: suffix ? 60 : 14,
            borderRadius: 12, border: `1.5px solid ${COLORS.border}`, fontSize: 15,
            outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit',
            background: '#fff', color: COLORS.text, boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = COLORS.primary}
          onBlur={e => e.target.style.borderColor = COLORS.border}
        />
        {suffix && <span style={{ position: 'absolute', right: 14, color: COLORS.textMuted, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>{label}</label>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          border: `1.5px solid ${COLORS.border}`, fontSize: 15, outline: 'none',
          fontFamily: 'inherit', background: '#fff', color: COLORS.text,
          cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
        }}
      >
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{description}</div>}
      </div>
      <div onClick={() => onChange(!checked)} style={{
        width: 48, height: 28, borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
        background: checked ? COLORS.primary : '#e2e8f0', padding: 3, flexShrink: 0,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11, background: '#fff',
          transition: 'all 0.2s', transform: checked ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, height = 8, showLabel, style }) {
  const pct = percentage(value, max);
  const barColor = color || (pct >= 75 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger);
  return (
    <div style={style}>
      <div style={{ background: '#f1f5f9', borderRadius: height, height, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: height,
          background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: COLORS.textMuted }}>
          <span>{formatCurrency(value)}</span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  );
}

function Badge({ children, color = COLORS.primary, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      color, background: bg || `${color}15`,
    }}>{children}</span>
  );
}

function StatusDot({ color }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: color, marginRight: 6 }} />;
}

function EmptyState({ icon, title, message, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: COLORS.textMuted, margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
      {action}
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto',
        padding: '24px 20px', paddingBottom: 40,
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: COLORS.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 }}>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onSelect(tab.value)} style={{
          flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13,
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
          background: active === tab.value ? '#fff' : 'transparent',
          color: active === tab.value ? COLORS.primary : COLORS.textMuted,
          boxShadow: active === tab.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}>{tab.label}</button>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: COLORS.text }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PremiumBanner({ onUpgrade }) {
  return (
    <Card style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 }}>
          <Icon name="crown" size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Unlock Premium</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Stack Circle, Smart Alerts, Advanced Splits & more</div>
        </div>
        <Button variant="secondary" size="sm" onClick={onUpgrade} style={{ background: '#fff', color: COLORS.primary }}>
          ${PREMIUM_PRICE}/mo
        </Button>
      </div>
    </Card>
  );
}

function TrialBanner({ daysLeft }) {
  if (daysLeft <= 0) return null;
  return (
    <div style={{
      background: `linear-gradient(90deg, ${COLORS.primary}15, ${COLORS.accent}15)`,
      borderRadius: 12, padding: '10px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${COLORS.primary}20`,
    }}>
      <Icon name="crown" size={16} color={COLORS.primary} />
      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>
        Premium trial: <strong>{daysLeft} days left</strong>
      </span>
    </div>
  );
}

// ---------- ONBOARDING SCREEN ----------

function OnboardingScreen({ data, setData, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [payFreq, setPayFreq] = useState('biweekly');
  const [nextPayday, setNextPayday] = useState(addDays(getToday(), 7));
  const [bills, setBills] = useState([{ name: '', amount: '', category: BILL_CATEGORIES[0] }]);
  const [savingsChoice, setSavingsChoice] = useState('Emergency Fund');
  const [savingsTarget, setSavingsTarget] = useState('1000');
  const [wantGroups, setWantGroups] = useState(false);

  const totalSteps = 5;

  function addBillRow() {
    setBills([...bills, { name: '', amount: '', category: BILL_CATEGORIES[0] }]);
  }

  function updateBill(idx, field, val) {
    const updated = [...bills];
    updated[idx] = { ...updated[idx], [field]: val };
    setBills(updated);
  }

  function removeBill(idx) {
    setBills(bills.filter((_, i) => i !== idx));
  }

  function handleComplete() {
    const validBills = bills.filter(b => b.name && b.amount > 0);
    const incomeAmt = parseFloat(income) || 0;

    const newData = {
      ...data,
      user: {
        ...data.user,
        name,
        onboardingComplete: true,
        payFrequency: payFreq,
        nextPayday,
      },
      incomeSources: [{
        id: generateId(), sourceName: 'Main Income', amount: incomeAmt,
        frequency: payFreq, nextPaymentDate: nextPayday, recurring: true, isActive: true,
      }],
      bills: validBills.map(b => ({
        id: generateId(), name: b.name, amount: parseFloat(b.amount),
        category: b.category, dueDate: addDays(getToday(), Math.floor(Math.random() * 28) + 1),
        frequency: 'monthly', isEssential: true, isFixed: true, autopay: false,
        status: 'upcoming', paidAmount: 0, reminderDaysBefore: 3, notes: '',
      })),
      savingsGoals: [{
        id: generateId(), name: savingsChoice === 'Custom' ? 'My Savings Goal' : savingsChoice,
        targetAmount: parseFloat(savingsTarget) || 1000, currentAmount: 0,
        targetDate: addDays(getToday(), 180), contributionType: 'fixed',
        contributionValue: Math.round((parseFloat(savingsTarget) || 1000) / 26), isActive: true,
      }],
    };
    setData(newData);
    onComplete();
  }

  const stepContent = [
    // Step 0: Welcome
    <div key="welcome" style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>💰</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: COLORS.text }}>Welcome to Smart Stack</h1>
      <p style={{ fontSize: 16, color: COLORS.textMuted, margin: '0 0 32px', lineHeight: 1.6 }}>
        Let's set up your personal budget in under 2 minutes. We'll help you split your paycheck, stay ahead of bills, and start saving.
      </p>
      <Input label="What's your name?" value={name} onChange={setName} placeholder="Your first name" required />
    </div>,

    // Step 1: Income
    <div key="income">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Your Income</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>How much do you get paid and how often?</p>
      <Input label="Paycheck Amount (before taxes is fine)" value={income} onChange={setIncome} type="number" placeholder="0.00" prefix="$" required />
      <Select label="How often are you paid?" value={payFreq} onChange={setPayFreq} options={PAY_FREQUENCIES} />
      <Input label="When is your next payday?" value={nextPayday} onChange={setNextPayday} type="date" />
      <Card style={{ background: '#f0fdf4', border: `1px solid ${COLORS.success}30`, marginTop: 8 }}>
        <div style={{ fontSize: 13, color: '#166534' }}>
          <strong>Estimated weekly income:</strong> {formatCurrency(frequencyToWeekly(parseFloat(income) || 0, payFreq))}
        </div>
      </Card>
    </div>,

    // Step 2: Bills
    <div key="bills">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Your Recurring Bills</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>Add your regular bills so we can help you plan for them.</p>
      {bills.map((bill, idx) => (
        <Card key={idx} style={{ marginBottom: 12, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <Input label="Bill Name" value={bill.name} onChange={v => updateBill(idx, 'name', v)} placeholder="e.g. Rent" style={{ marginBottom: 0 }} />
            </div>
            <div style={{ width: 100 }}>
              <Input label="Amount" value={bill.amount} onChange={v => updateBill(idx, 'amount', v)} type="number" prefix="$" style={{ marginBottom: 0 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Select value={bill.category} onChange={v => updateBill(idx, 'category', v)} options={BILL_CATEGORIES} style={{ marginBottom: 0 }} />
            </div>
            {bills.length > 1 && (
              <button onClick={() => removeBill(idx)} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
                <Icon name="trash" size={16} color={COLORS.danger} />
              </button>
            )}
          </div>
        </Card>
      ))}
      <Button variant="ghost" size="sm" onClick={addBillRow} fullWidth>
        <Icon name="plus" size={16} /> Add Another Bill
      </Button>
    </div>,

    // Step 3: Savings
    <div key="savings">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Savings Goal</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>Pick a goal to start working toward. Even small amounts add up!</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {SAVINGS_PRESETS.map(preset => (
          <Card key={preset} onClick={() => setSavingsChoice(preset)} style={{
            padding: '14px 16px', cursor: 'pointer', textAlign: 'center',
            border: savingsChoice === preset ? `2px solid ${COLORS.primary}` : `2px solid transparent`,
            background: savingsChoice === preset ? `${COLORS.primary}08` : '#fff',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: savingsChoice === preset ? COLORS.primary : COLORS.text }}>{preset}</div>
          </Card>
        ))}
      </div>
      <Input label="How much do you want to save?" value={savingsTarget} onChange={setSavingsTarget} type="number" prefix="$" placeholder="1000" />
      <Card style={{ background: '#f0fdf4', border: `1px solid ${COLORS.success}30` }}>
        <div style={{ fontSize: 13, color: '#166534' }}>
          <strong>Weekly contribution needed:</strong> {formatCurrency((parseFloat(savingsTarget) || 0) / 26)}
          <div style={{ fontSize: 12, marginTop: 2, color: '#15803d' }}>Based on roughly 6 months to reach your goal</div>
        </div>
      </Card>
    </div>,

    // Step 4: Groups + Summary
    <div key="summary">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Almost Done!</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>Here's a preview of your weekly budget.</p>
      <Toggle label="I want to save with friends too" description="Join or create group savings with Stack Circle" checked={wantGroups} onChange={setWantGroups} />
      {(() => {
        const weeklyInc = frequencyToWeekly(parseFloat(income) || 0, payFreq);
        const weeklyBills = bills.filter(b => b.amount).reduce((s, b) => s + frequencyToWeekly(parseFloat(b.amount), 'monthly'), 0);
        const weeklySavings = (parseFloat(savingsTarget) || 0) / 26;
        const safeToSpend = Math.max(0, weeklyInc - weeklyBills - weeklySavings);
        return (
          <Card style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>Weekly Income</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.success }}>{formatCurrency(weeklyInc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>Bills Reserve</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>-{formatCurrency(weeklyBills)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>Savings</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>-{formatCurrency(weeklySavings)}</span>
            </div>
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Safe to Spend</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: safeToSpend > 0 ? COLORS.success : COLORS.danger }}>{formatCurrency(safeToSpend)}</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' }}>
              ~{formatCurrency(safeToSpend / 7)}/day
            </div>
          </Card>
        );
      })()}
    </div>,
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Progress */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? COLORS.primary : '#e2e8f0',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'right' }}>Step {step + 1} of {totalSteps}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
        {stepContent[step]}
      </div>

      {/* Navigation */}
      <div style={{ padding: '16px 20px 24px', display: 'flex', gap: 12 }}>
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)} style={{ flex: 0 }}>
            Back
          </Button>
        )}
        <Button variant="primary" onClick={() => step < totalSteps - 1 ? setStep(step + 1) : handleComplete()} fullWidth>
          {step === totalSteps - 1 ? "Let's Go!" : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
// ============================================================
// SMART STACK - Part 3: Balance Book + Pay Track + Bill Boss + Expense Core
// ============================================================

// ---------- BALANCE BOOK DASHBOARD ----------

function BalanceBookScreen({ data, setData, setScreen, allocation }) {
  const health = calculateBudgetHealth(allocation);
  const upcomingBills = [...data.bills]
    .filter(b => b.status !== 'paid')
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
    .slice(0, 3);
  const unreadNotifs = data.notifications.filter(n => !n.readStatus).length;
  const trialDaysLeft = data.user.subscriptionStatus === 'trial' ? daysUntil(data.user.trialEndAt) : 0;

  return (
    <div>
      {trialDaysLeft > 0 && <TrialBanner daysLeft={trialDaysLeft} />}

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: COLORS.text }}>
          Hey, {data.user.name || 'there'} 👋
        </h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, margin: '4px 0 0' }}>Here's your money snapshot</p>
      </div>

      {/* Health Score Card */}
      <Card style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, border: 'none', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Budget Health</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{health.label}</div>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: 28, border: '3px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800,
          }}>{health.score}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 6 }}>
          <div style={{ width: `${health.score}%`, height: '100%', borderRadius: 6, background: '#fff', transition: 'width 0.6s' }} />
        </div>
      </Card>

      {/* Safe to Spend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Weekly Safe to Spend</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: allocation.safeToSpendWeekly > 0 ? COLORS.success : COLORS.danger }}>
            {formatCurrency(allocation.safeToSpendWeekly)}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>This week's flexible cash</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Daily Limit</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: allocation.safeToSpendDaily > 0 ? COLORS.primary : COLORS.danger }}>
            {formatCurrency(allocation.safeToSpendDaily)}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Safe to spend today</div>
        </Card>
      </div>

      {/* Shortfall Warning */}
      {allocation.shortfall > 0 && (
        <Card style={{ background: '#fef2f2', border: `1px solid ${COLORS.danger}30`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>Projected Shortfall</div>
              <div style={{ fontSize: 13, color: '#991b1b' }}>
                You're projected to be {formatCurrency(allocation.shortfall)} short this week. Review your Check Spitter.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Income Split Preview */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>This Week's Split</div>
          <button onClick={() => setScreen('check-spitter')} style={{ background: 'none', border: 'none', fontSize: 13, color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>View Details →</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Bills', value: allocation.reservedForBills, color: COLORS.danger },
            { label: 'Savings', value: allocation.reservedForSavings, color: COLORS.primary },
            { label: 'Spending', value: allocation.safeToSpendWeekly, color: COLORS.success },
          ].map(item => {
            const pct = allocation.totalIncome > 0 ? (item.value / allocation.totalIncome * 100) : 0;
            return (
              <div key={item.label} style={{ flex: Math.max(pct, 5), background: `${item.color}20`, borderRadius: 8, padding: '8px 10px', minWidth: 60 }}>
                <div style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{formatCurrency(item.value)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
          Weekly income: {formatCurrency(allocation.totalIncome)}
        </div>
      </Card>

      {/* Upcoming Bills */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Upcoming Bills</div>
          <button onClick={() => setScreen('bill-boss')} style={{ background: 'none', border: 'none', fontSize: 13, color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>See All →</button>
        </div>
        {upcomingBills.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted, padding: '8px 0' }}>No upcoming bills. Nice!</div>
        ) : upcomingBills.map(bill => {
          const days = daysUntil(bill.dueDate);
          const urgencyColor = days <= 1 ? COLORS.danger : days <= 3 ? COLORS.warning : COLORS.textMuted;
          return (
            <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{bill.name}</div>
                <div style={{ fontSize: 12, color: urgencyColor, fontWeight: 500 }}>
                  {days === 0 ? 'Due today' : days < 0 ? `${Math.abs(days)} days overdue` : `Due in ${days} days`}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(bill.amount)}</div>
            </div>
          );
        })}
      </Card>

      {/* Savings Progress */}
      {data.savingsGoals.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Savings Goals</div>
            <button onClick={() => setScreen('savings')} style={{ background: 'none', border: 'none', fontSize: 13, color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>View All →</button>
          </div>
          {data.savingsGoals.filter(g => g.isActive).slice(0, 2).map(goal => (
            <div key={goal.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{goal.name}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
              </div>
              <ProgressBar value={goal.currentAmount} max={goal.targetAmount} height={8} color={COLORS.primary} />
            </div>
          ))}
        </Card>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Income', icon: '💵', screen: 'pay-track' },
          { label: 'Expense', icon: '🧾', screen: 'expense-core' },
          { label: 'Bill', icon: '📋', screen: 'bill-boss' },
          { label: 'Save', icon: '🎯', screen: 'savings' },
        ].map(item => (
          <Card key={item.label} onClick={() => setScreen(item.screen)} style={{ textAlign: 'center', padding: '14px 8px', cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>+ {item.label}</div>
          </Card>
        ))}
      </div>

      {/* Group Preview */}
      {data.user.premiumStatus && data.groups.length > 0 && (
        <Card onClick={() => setScreen('stack-circle')} style={{ marginBottom: 16, cursor: 'pointer', border: `1px solid ${COLORS.accent}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${COLORS.accent}15`, borderRadius: 12, padding: 10 }}>
              <Icon name="group" size={20} color={COLORS.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{data.groups[0].groupName}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{percentage(data.groups[0].currentAmount, data.groups[0].targetAmount)}% toward {data.groups[0].goalName}</div>
            </div>
            <Icon name="chevronRight" size={18} color={COLORS.textMuted} />
          </div>
          <ProgressBar value={data.groups[0].currentAmount} max={data.groups[0].targetAmount} height={6} color={COLORS.accent} style={{ marginTop: 12 }} />
        </Card>
      )}

      {/* Top Insight */}
      {(() => {
        const insights = generateInsights(data.bills, data.expenses, data.savingsGoals, allocation);
        const top = insights[0];
        return (
          <Card onClick={() => setScreen('insights')} style={{ marginBottom: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{top.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{top.title}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{top.message}</div>
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

// ---------- PAY TRACK SCREEN ----------

function PayTrackScreen({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ sourceName: '', amount: '', frequency: 'biweekly', nextPaymentDate: addDays(getToday(), 14), recurring: true });

  const weeklyTotal = calculateWeeklyIncome(data.incomeSources);
  const monthlyTotal = calculateMonthlyIncome(data.incomeSources);

  function openAdd() {
    setForm({ sourceName: '', amount: '', frequency: 'biweekly', nextPaymentDate: addDays(getToday(), 14), recurring: true });
    setEditId(null);
    setShowAdd(true);
  }

  function openEdit(source) {
    setForm({ ...source, amount: String(source.amount) });
    setEditId(source.id);
    setShowAdd(true);
  }

  function handleSave() {
    if (!form.sourceName || !form.amount) return;
    if (editId) {
      setData({ ...data, incomeSources: data.incomeSources.map(s => s.id === editId ? { ...s, ...form, amount: parseFloat(form.amount) } : s) });
    } else {
      setData({ ...data, incomeSources: [...data.incomeSources, { ...form, id: generateId(), amount: parseFloat(form.amount), isActive: true }] });
    }
    setShowAdd(false);
  }

  function handleDelete(id) {
    setData({ ...data, incomeSources: data.incomeSources.filter(s => s.id !== id) });
  }

  const sourceTypes = ['Paycheck', 'Side Hustle', 'Benefits', 'Cash Income', 'One-Time Income', 'Other'];

  return (
    <div>
      <SectionHeader title="Pay Track" subtitle="Manage your income sources" action={
        <Button size="sm" onClick={openAdd}><Icon name="plus" size={16} /> Add</Button>
      } />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Card style={{ background: `${COLORS.success}08` }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Weekly Income</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.success }}>{formatCurrency(weeklyTotal)}</div>
        </Card>
        <Card style={{ background: `${COLORS.primary}08` }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Monthly Income</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(monthlyTotal)}</div>
        </Card>
      </div>

      {/* Next Payday */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: `1px solid ${COLORS.success}20` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Next Payday</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>
              {data.user.nextPayday ? `${formatDate(data.user.nextPayday)} (${daysUntil(data.user.nextPayday)} days)` : 'Not set'}
            </div>
          </div>
        </div>
      </Card>

      {/* Income Sources */}
      {data.incomeSources.length === 0 ? (
        <EmptyState icon="💵" title="No Income Sources" message="Add your paycheck and other income to start budgeting." action={<Button onClick={openAdd}>Add Income</Button>} />
      ) : data.incomeSources.map(source => (
        <Card key={source.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{source.sourceName}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                {PAY_FREQUENCIES.find(f => f.value === source.frequency)?.label || source.frequency}
                {source.recurring && ' • Recurring'}
              </div>
              {source.nextPaymentDate && (
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                  Next: {formatDate(source.nextPaymentDate)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.success }}>{formatCurrency(source.amount)}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatCurrency(frequencyToWeekly(source.amount, source.frequency))}/wk</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(source)}><Icon name="edit" size={14} /> Edit</Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(source.id)}><Icon name="trash" size={14} /> Remove</Button>
          </div>
        </Card>
      ))}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? 'Edit Income' : 'Add Income'}>
        <Input label="Source Name" value={form.sourceName} onChange={v => setForm({ ...form, sourceName: v })} placeholder="e.g. Main Job" required />
        <Input label="Amount" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" prefix="$" placeholder="0.00" required />
        <Select label="Frequency" value={form.frequency} onChange={v => setForm({ ...form, frequency: v })} options={PAY_FREQUENCIES} />
        <Input label="Next Payment Date" value={form.nextPaymentDate} onChange={v => setForm({ ...form, nextPaymentDate: v })} type="date" />
        <Toggle label="Recurring" checked={form.recurring} onChange={v => setForm({ ...form, recurring: v })} />
        <Button variant="primary" onClick={handleSave} fullWidth size="lg">{editId ? 'Save Changes' : 'Add Income'}</Button>
      </Modal>
    </div>
  );
}

// ---------- BILL BOSS SCREEN ----------

function BillBossScreen({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    name: '', amount: '', category: BILL_CATEGORIES[0], dueDate: addDays(getToday(), 15),
    frequency: 'monthly', isEssential: true, isFixed: true, autopay: false, notes: '',
  });

  const monthlyBillTotal = data.bills.reduce((s, b) => s + frequencyToMonthly(b.amount, b.frequency || 'monthly'), 0);
  const weeklyBillTotal = data.bills.reduce((s, b) => s + frequencyToWeekly(b.amount, b.frequency || 'monthly'), 0);

  const filteredBills = data.bills.filter(b => {
    if (filter === 'upcoming') return b.status !== 'paid' && daysUntil(b.dueDate) > 0;
    if (filter === 'overdue') return b.status === 'overdue' || (daysUntil(b.dueDate) < 0 && b.status !== 'paid');
    if (filter === 'paid') return b.status === 'paid';
    return true;
  }).sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  function openAdd() {
    setForm({ name: '', amount: '', category: BILL_CATEGORIES[0], dueDate: addDays(getToday(), 15), frequency: 'monthly', isEssential: true, isFixed: true, autopay: false, notes: '' });
    setEditId(null);
    setShowAdd(true);
  }

  function openEdit(bill) {
    setForm({ ...bill, amount: String(bill.amount) });
    setEditId(bill.id);
    setShowAdd(true);
  }

  function handleSave() {
    if (!form.name || !form.amount) return;
    const billData = { ...form, amount: parseFloat(form.amount), status: form.status || 'upcoming', paidAmount: form.paidAmount || 0, reminderDaysBefore: 3 };
    if (editId) {
      setData({ ...data, bills: data.bills.map(b => b.id === editId ? { ...b, ...billData } : b) });
    } else {
      setData({ ...data, bills: [...data.bills, { ...billData, id: generateId() }] });
    }
    setShowAdd(false);
  }

  function markPaid(id) {
    setData({ ...data, bills: data.bills.map(b => b.id === id ? { ...b, status: 'paid', paidAmount: b.amount } : b) });
  }

  function markPartial(id) {
    const bill = data.bills.find(b => b.id === id);
    if (!bill) return;
    const amount = parseFloat(prompt('Enter amount paid:'));
    if (isNaN(amount)) return;
    setData({ ...data, bills: data.bills.map(b => b.id === id ? { ...b, status: 'partial', paidAmount: amount } : b) });
  }

  function handleDelete(id) {
    setData({ ...data, bills: data.bills.filter(b => b.id !== id) });
  }

  function getBillStatusInfo(bill) {
    const days = daysUntil(bill.dueDate);
    if (bill.status === 'paid') return { label: 'Paid', color: COLORS.success, bg: '#f0fdf4' };
    if (bill.status === 'partial') return { label: 'Partial', color: COLORS.warning, bg: '#fffbeb' };
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: COLORS.danger, bg: '#fef2f2' };
    if (days === 0) return { label: 'Due today', color: COLORS.danger, bg: '#fef2f2' };
    if (days <= 3) return { label: `Due in ${days}d`, color: COLORS.warning, bg: '#fffbeb' };
    return { label: `Due in ${days}d`, color: COLORS.textMuted, bg: '#f8fafc' };
  }

  return (
    <div>
      <SectionHeader title="Bill Boss" subtitle="Stay on top of every bill" action={
        <Button size="sm" onClick={openAdd}><Icon name="plus" size={16} /> Add</Button>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Monthly Bills</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.danger }}>{formatCurrency(monthlyBillTotal)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Weekly Reserve</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(weeklyBillTotal)}</div>
        </Card>
      </div>

      <TabBar tabs={[
        { value: 'all', label: 'All' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'paid', label: 'Paid' },
      ]} active={filter} onSelect={setFilter} />

      {filteredBills.length === 0 ? (
        <EmptyState icon="📋" title={filter === 'all' ? 'No Bills Yet' : `No ${filter} bills`} message="Add your bills to start tracking them." action={filter === 'all' ? <Button onClick={openAdd}>Add Bill</Button> : null} />
      ) : filteredBills.map(bill => {
        const status = getBillStatusInfo(bill);
        return (
          <Card key={bill.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{bill.name}</span>
                  {bill.autopay && <Badge color={COLORS.primary}>Auto</Badge>}
                  {bill.isEssential && <Badge color={COLORS.warning}>Essential</Badge>}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>{bill.category}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>Due {formatShortDate(bill.dueDate)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatCurrency(bill.amount)}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatCurrency(frequencyToWeekly(bill.amount, bill.frequency || 'monthly'))}/wk</div>
              </div>
            </div>
            {bill.status !== 'paid' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <Button variant="success" size="sm" onClick={() => markPaid(bill.id)}><Icon name="check" size={14} /> Paid</Button>
                <Button variant="secondary" size="sm" onClick={() => markPartial(bill.id)}>Partial</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(bill)}><Icon name="edit" size={14} /></Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(bill.id)}><Icon name="trash" size={14} /></Button>
              </div>
            )}
          </Card>
        );
      })}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? 'Edit Bill' : 'Add Bill'}>
        <Input label="Bill Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Rent" required />
        <Input label="Amount" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" prefix="$" required />
        <Select label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={BILL_CATEGORIES} />
        <Input label="Due Date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} type="date" />
        <Select label="Frequency" value={form.frequency} onChange={v => setForm({ ...form, frequency: v })} options={[
          { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Biweekly' },
          { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' },
        ]} />
        <Toggle label="Essential" description="Must-pay bill" checked={form.isEssential} onChange={v => setForm({ ...form, isEssential: v })} />
        <Toggle label="Fixed Amount" description="Same amount every time" checked={form.isFixed} onChange={v => setForm({ ...form, isFixed: v })} />
        <Toggle label="Autopay" description="Automatically paid from your account" checked={form.autopay} onChange={v => setForm({ ...form, autopay: v })} />
        <Input label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Optional notes..." />
        <Button variant="primary" onClick={handleSave} fullWidth size="lg">{editId ? 'Save Changes' : 'Add Bill'}</Button>
      </Modal>
    </div>
  );
}

// ---------- EXPENSE CORE SCREEN ----------

function ExpenseCoreScreen({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [view, setView] = useState('list');
  const [form, setForm] = useState({
    name: '', amount: '', category: EXPENSE_CATEGORIES[0], date: getToday(),
    isEssential: false, isFixed: false, notes: '',
  });

  // This week's expenses
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  const weekExpenses = data.expenses.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const categoryTotals = {};
  weekExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  function openAdd() {
    setForm({ name: '', amount: '', category: EXPENSE_CATEGORIES[0], date: getToday(), isEssential: false, isFixed: false, notes: '' });
    setEditId(null);
    setShowAdd(true);
  }

  function openEdit(expense) {
    setForm({ ...expense, amount: String(expense.amount) });
    setEditId(expense.id);
    setShowAdd(true);
  }

  function handleSave() {
    if (!form.name || !form.amount) return;
    const expenseData = { ...form, amount: parseFloat(form.amount) };
    if (editId) {
      setData({ ...data, expenses: data.expenses.map(e => e.id === editId ? { ...e, ...expenseData } : e) });
    } else {
      setData({ ...data, expenses: [...data.expenses, { ...expenseData, id: generateId() }] });
    }
    setShowAdd(false);
  }

  function handleDelete(id) {
    setData({ ...data, expenses: data.expenses.filter(e => e.id !== id) });
  }

  const categoryColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6', '#a855f7'];

  return (
    <div>
      <SectionHeader title="Expense Core" subtitle="Track where your money goes" action={
        <Button size="sm" onClick={openAdd}><Icon name="plus" size={16} /> Add</Button>
      } />

      <Card style={{ marginBottom: 16, background: `${COLORS.primary}08` }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>This Week's Spending</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text }}>{formatCurrency(weekTotal)}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{weekExpenses.length} transactions</div>
      </Card>

      <TabBar tabs={[
        { value: 'list', label: 'Transactions' },
        { value: 'categories', label: 'Categories' },
      ]} active={view} onSelect={setView} />

      {view === 'categories' ? (
        <div>
          {sortedCategories.length === 0 ? (
            <EmptyState icon="📊" title="No Spending Data" message="Add some expenses to see category breakdown." />
          ) : sortedCategories.map(([cat, total], idx) => (
            <Card key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: categoryColors[idx % categoryColors.length] }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cat}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(total)}</span>
              </div>
              <ProgressBar value={total} max={weekTotal || 1} height={6} color={categoryColors[idx % categoryColors.length]} />
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{weekTotal > 0 ? Math.round(total / weekTotal * 100) : 0}% of weekly spending</div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          {data.expenses.length === 0 ? (
            <EmptyState icon="🧾" title="No Expenses Yet" message="Add your purchases and spending to track where your money goes." action={<Button onClick={openAdd}>Add Expense</Button>} />
          ) : [...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).map(expense => (
            <Card key={expense.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{expense.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{expense.category} • {formatShortDate(expense.date)}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {expense.isEssential && <Badge color={COLORS.warning}>Essential</Badge>}
                    {!expense.isEssential && <Badge color={COLORS.textMuted}>Non-essential</Badge>}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.danger }}>-{formatCurrency(expense.amount)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(expense)}><Icon name="edit" size={14} /> Edit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(expense.id)}><Icon name="trash" size={14} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? 'Edit Expense' : 'Add Expense'}>
        <Input label="What did you spend on?" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Grocery run" required />
        <Input label="Amount" value={form.amount} onChange={v => setForm({ ...form, amount: v })} type="number" prefix="$" required />
        <Select label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={EXPENSE_CATEGORIES} />
        <Input label="Date" value={form.date} onChange={v => setForm({ ...form, date: v })} type="date" />
        <Toggle label="Essential Spending" description="Is this a must-have purchase?" checked={form.isEssential} onChange={v => setForm({ ...form, isEssential: v })} />
        <Input label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Optional notes..." />
        <Button variant="primary" onClick={handleSave} fullWidth size="lg">{editId ? 'Save Changes' : 'Add Expense'}</Button>
      </Modal>
    </div>
  );
}
// ============================================================
// SMART STACK - Part 4: Check Spitter + Savings Goals
// ============================================================

// ---------- CHECK SPITTER SCREEN ----------

function CheckSpitterScreen({ data, setData, allocation }) {
  const [mode, setMode] = useState(data.splitMode || 'equal');

  function handleModeChange(newMode) {
    setMode(newMode);
    setData({ ...data, splitMode: newMode });
  }

  const alloc = calculateWeeklyAllocation(data.incomeSources, data.bills, data.savingsGoals, mode, data.user.nextPayday);
  const health = calculateBudgetHealth(alloc);

  // Build allocation breakdown
  const billBreakdown = data.bills.filter(b => b.status !== 'paid').map(bill => {
    const weekly = frequencyToWeekly(bill.amount, bill.frequency || 'monthly');
    const daysToDue = daysUntil(bill.dueDate);
    const daysToPayday = daysUntil(data.user.nextPayday);
    let adjusted = weekly;
    if (mode === 'due_date' && daysToDue >= 0 && daysToDue <= daysToPayday) {
      adjusted = bill.amount;
    }
    return { ...bill, weeklyReserve: weekly, adjustedReserve: adjusted, daysToDue };
  }).sort((a, b) => a.daysToDue - b.daysToDue);

  const savingsBreakdown = data.savingsGoals.filter(g => g.isActive).map(goal => {
    let weeklyContrib = 0;
    if (goal.contributionType === 'fixed') weeklyContrib = goal.contributionValue || 0;
    else if (goal.contributionType === 'percentage') weeklyContrib = alloc.totalIncome * (goal.contributionValue || 0) / 100;
    return { ...goal, weeklyContrib };
  });

  const totalBillReserve = mode === 'due_date'
    ? billBreakdown.reduce((s, b) => s + b.adjustedReserve, 0)
    : billBreakdown.reduce((s, b) => s + b.weeklyReserve, 0);
  const totalSavings = savingsBreakdown.reduce((s, g) => s + g.weeklyContrib, 0);
  const flexibleSpend = Math.max(0, alloc.totalIncome - totalBillReserve - totalSavings);

  return (
    <div>
      <SectionHeader title="Check Spitter" subtitle="See exactly how your paycheck splits" />

      {/* Split Mode Selector */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Split Mode</div>
        {SPLIT_MODES.map(sm => (
          <div key={sm.value} onClick={() => handleModeChange(sm.value)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
            borderRadius: 12, marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s',
            background: mode === sm.value ? `${COLORS.primary}08` : 'transparent',
            border: `2px solid ${mode === sm.value ? COLORS.primary : 'transparent'}`,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, border: `2px solid ${mode === sm.value ? COLORS.primary : '#cbd5e1'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {mode === sm.value && <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.primary }} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{sm.label}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{sm.desc}</div>
            </div>
            {sm.value !== 'equal' && !data.user.premiumStatus && (
              <Badge color={COLORS.accent}><Icon name="crown" size={10} color={COLORS.accent} /> PRO</Badge>
            )}
          </div>
        ))}
      </Card>

      {/* Income Summary */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: `1px solid ${COLORS.success}20` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>Weekly Income</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.success }}>{formatCurrency(alloc.totalIncome)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>Next Payday</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{formatShortDate(data.user.nextPayday)}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{daysUntil(data.user.nextPayday)} days</div>
          </div>
        </div>
      </Card>

      {/* Visual Split Bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Your Weekly Split</div>
        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 32, marginBottom: 16 }}>
          {alloc.totalIncome > 0 && [
            { value: totalBillReserve, color: '#ef4444', label: 'Bills' },
            { value: totalSavings, color: '#6366f1', label: 'Savings' },
            { value: flexibleSpend, color: '#22c55e', label: 'Spending' },
          ].map(seg => {
            const pct = Math.max(2, (seg.value / alloc.totalIncome) * 100);
            return (
              <div key={seg.label} style={{
                width: `${pct}%`, background: seg.color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 30,
              }}>{Math.round(pct)}%</div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Bills', value: totalBillReserve, color: '#ef4444' },
            { label: 'Savings', value: totalSavings, color: '#6366f1' },
            { label: 'Spending', value: flexibleSpend, color: '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: '8px', background: `${item.color}08`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: item.color, margin: '0 auto 6px' }} />
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{formatCurrency(item.value)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Safe to Spend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card style={{ background: flexibleSpend > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${flexibleSpend > 0 ? COLORS.success : COLORS.danger}20` }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Safe to Spend / Week</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: flexibleSpend > 0 ? COLORS.success : COLORS.danger }}>{formatCurrency(flexibleSpend)}</div>
        </Card>
        <Card style={{ background: `${COLORS.primary}08`, border: `1px solid ${COLORS.primary}20` }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Daily Limit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(flexibleSpend / 7)}</div>
        </Card>
      </div>

      {/* Shortfall Warning */}
      {alloc.shortfall > 0 && (
        <Card style={{ background: '#fef2f2', border: `1px solid ${COLORS.danger}30`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.danger }}>Budget Shortfall: {formatCurrency(alloc.shortfall)}</div>
              <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                Your planned bills and savings exceed your weekly income. Consider reducing non-essential spending or adjusting savings targets.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bill-by-Bill Breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Bill Reserves (Weekly)</div>
        {billBreakdown.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted, padding: '12px 0' }}>No bills added yet.</div>
        ) : billBreakdown.map(bill => {
          const dueSoon = bill.daysToDue >= 0 && bill.daysToDue <= 7;
          return (
            <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{bill.name}</div>
                <div style={{ fontSize: 12, color: dueSoon ? COLORS.warning : COLORS.textMuted }}>
                  {bill.daysToDue < 0 ? 'Overdue' : bill.daysToDue === 0 ? 'Due today' : `Due in ${bill.daysToDue}d`}
                  {mode === 'due_date' && bill.adjustedReserve > bill.weeklyReserve && ' • Full amount this week'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>
                  {formatCurrency(mode === 'due_date' ? bill.adjustedReserve : bill.weeklyReserve)}
                </div>
                {mode === 'due_date' && bill.adjustedReserve !== bill.weeklyReserve && (
                  <div style={{ fontSize: 11, color: COLORS.textMuted, textDecoration: 'line-through' }}>{formatCurrency(bill.weeklyReserve)}/wk usual</div>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 14 }}>
          <span>Total Bill Reserve</span>
          <span style={{ color: COLORS.danger }}>{formatCurrency(totalBillReserve)}</span>
        </div>
      </Card>

      {/* Savings Breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Savings Contributions (Weekly)</div>
        {savingsBreakdown.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted, padding: '12px 0' }}>No savings goals set.</div>
        ) : savingsBreakdown.map(goal => (
          <div key={goal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{goal.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                {percentage(goal.currentAmount, goal.targetAmount)}% toward {formatCurrency(goal.targetAmount)}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{formatCurrency(goal.weeklyContrib)}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 14 }}>
          <span>Total Savings</span>
          <span style={{ color: COLORS.primary }}>{formatCurrency(totalSavings)}</span>
        </div>
      </Card>
    </div>
  );
}

// ---------- SAVINGS GOALS SCREEN ----------

function SavingsGoalsScreen({ data, setData, allocation }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: 'Emergency Fund', targetAmount: '', currentAmount: '0', targetDate: addDays(getToday(), 180),
    contributionType: 'fixed', contributionValue: '', isActive: true,
  });

  const totalSaved = data.savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = data.savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const weeklyContrib = data.savingsGoals.filter(g => g.isActive).reduce((s, g) => {
    if (g.contributionType === 'fixed') return s + (g.contributionValue || 0);
    if (g.contributionType === 'percentage') return s + (allocation.totalIncome * (g.contributionValue || 0) / 100);
    return s;
  }, 0);

  function openAdd() {
    setForm({ name: 'Emergency Fund', targetAmount: '', currentAmount: '0', targetDate: addDays(getToday(), 180), contributionType: 'fixed', contributionValue: '', isActive: true });
    setEditId(null);
    setShowAdd(true);
  }

  function openEdit(goal) {
    setForm({ ...goal, targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount), contributionValue: String(goal.contributionValue) });
    setEditId(goal.id);
    setShowAdd(true);
  }

  function handleSave() {
    if (!form.name || !form.targetAmount) return;
    const goalData = {
      ...form, targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      contributionValue: parseFloat(form.contributionValue) || 0,
    };
    if (editId) {
      setData({ ...data, savingsGoals: data.savingsGoals.map(g => g.id === editId ? { ...g, ...goalData } : g) });
    } else {
      setData({ ...data, savingsGoals: [...data.savingsGoals, { ...goalData, id: generateId() }] });
    }
    setShowAdd(false);
  }

  function addContribution(goalId, amount) {
    setData({
      ...data,
      savingsGoals: data.savingsGoals.map(g =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
      ),
    });
  }

  function handleDelete(id) {
    setData({ ...data, savingsGoals: data.savingsGoals.filter(g => g.id !== id) });
  }

  return (
    <div>
      <SectionHeader title="Savings Goals" subtitle="Build your financial cushion" action={
        <Button size="sm" onClick={openAdd}><Icon name="plus" size={16} /> New Goal</Button>
      } />

      {/* Summary */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Total Saved</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(totalSaved)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Weekly Contribution</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(weeklyContrib)}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 8, marginBottom: 4 }}>
          <div style={{ width: `${percentage(totalSaved, totalTarget)}%`, height: '100%', borderRadius: 6, background: '#fff', transition: 'width 0.6s' }} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, textAlign: 'right' }}>{percentage(totalSaved, totalTarget)}% of all goals</div>
      </Card>

      {/* Goals List */}
      {data.savingsGoals.length === 0 ? (
        <EmptyState icon="🎯" title="No Goals Yet" message="Set a savings goal to start building your financial future." action={<Button onClick={openAdd}>Create Goal</Button>} />
      ) : data.savingsGoals.map(goal => {
        const pct = percentage(goal.currentAmount, goal.targetAmount);
        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
        const weeksLeft = goal.targetDate ? Math.max(1, Math.ceil(daysUntil(goal.targetDate) / 7)) : null;
        const neededPerWeek = weeksLeft ? remaining / weeksLeft : 0;
        const onTrack = goal.contributionType === 'fixed' ? goal.contributionValue >= neededPerWeek : true;

        return (
          <Card key={goal.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{goal.name}</span>
                  {pct >= 100 && <Badge color={COLORS.success}>Complete!</Badge>}
                  {!goal.isActive && <Badge color={COLORS.textMuted}>Paused</Badge>}
                </div>
                {goal.targetDate && (
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                    Target: {formatDate(goal.targetDate)} ({weeksLeft}w left)
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(goal.currentAmount)}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>of {formatCurrency(goal.targetAmount)}</div>
              </div>
            </div>

            <ProgressBar value={goal.currentAmount} max={goal.targetAmount} height={10} color={pct >= 100 ? COLORS.success : COLORS.primary} showLabel />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Remaining</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(remaining)}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Per Week</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>
                  {goal.contributionType === 'fixed' ? formatCurrency(goal.contributionValue) : `${goal.contributionValue}%`}
                </div>
              </div>
              <div style={{ background: onTrack ? '#f0fdf4' : '#fffbeb', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: onTrack ? COLORS.success : COLORS.warning }}>
                  {onTrack ? 'On Track' : 'Behind'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              <Button variant="primary" size="sm" onClick={() => {
                const weeklyAmt = goal.contributionType === 'fixed' ? goal.contributionValue : allocation.totalIncome * goal.contributionValue / 100;
                addContribution(goal.id, weeklyAmt);
              }}>+ Add Weekly</Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}><Icon name="edit" size={14} /></Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(goal.id)}><Icon name="trash" size={14} /></Button>
            </div>
          </Card>
        );
      })}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editId ? 'Edit Goal' : 'New Savings Goal'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {SAVINGS_PRESETS.map(preset => (
            <button key={preset} onClick={() => setForm({ ...form, name: preset === 'Custom' ? '' : preset })} style={{
              padding: '10px', borderRadius: 10, border: `2px solid ${form.name === preset ? COLORS.primary : '#e2e8f0'}`,
              background: form.name === preset ? `${COLORS.primary}08` : '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: form.name === preset ? COLORS.primary : COLORS.text,
            }}>{preset}</button>
          ))}
        </div>
        {(form.name === '' || !SAVINGS_PRESETS.includes(form.name)) && (
          <Input label="Goal Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="My savings goal" required />
        )}
        <Input label="Target Amount" value={form.targetAmount} onChange={v => setForm({ ...form, targetAmount: v })} type="number" prefix="$" required />
        <Input label="Already Saved" value={form.currentAmount} onChange={v => setForm({ ...form, currentAmount: v })} type="number" prefix="$" />
        <Input label="Target Date" value={form.targetDate} onChange={v => setForm({ ...form, targetDate: v })} type="date" />
        <Select label="Contribution Type" value={form.contributionType} onChange={v => setForm({ ...form, contributionType: v })} options={[
          { value: 'fixed', label: 'Fixed Amount Per Week' },
          { value: 'percentage', label: 'Percentage of Income' },
          { value: 'leftover', label: 'Leftover-Based' },
        ]} />
        {form.contributionType === 'fixed' && (
          <Input label="Weekly Amount" value={form.contributionValue} onChange={v => setForm({ ...form, contributionValue: v })} type="number" prefix="$" />
        )}
        {form.contributionType === 'percentage' && (
          <Input label="Percentage of Income" value={form.contributionValue} onChange={v => setForm({ ...form, contributionValue: v })} type="number" suffix="%" />
        )}
        <Button variant="primary" onClick={handleSave} fullWidth size="lg">{editId ? 'Save Changes' : 'Create Goal'}</Button>
      </Modal>
    </div>
  );
}
// ============================================================
// SMART STACK - Part 5: Stack Circle + Smart Insights + Settings/2FA + Notifications
// ============================================================

// ---------- STACK CIRCLE SCREEN (PREMIUM) ----------

function StackCircleScreen({ data, setData }) {
  const [selectedGroup, setSelectedGroup] = useState(data.groups[0]?.id || null);
  const [showCreate, setShowCreate] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [newGroup, setNewGroup] = useState({ groupName: '', goalName: '', targetAmount: '', targetDate: addDays(getToday(), 120) });
  const [messageText, setMessageText] = useState('');

  const group = data.groups.find(g => g.id === selectedGroup);

  if (!data.user.premiumStatus) {
    return (
      <div>
        <SectionHeader title="Stack Circle" subtitle="Save together with friends" />
        <Card style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Premium Feature</h2>
          <p style={{ fontSize: 14, opacity: 0.9, margin: '0 0 24px', lineHeight: 1.6 }}>
            Stack Circle lets you create savings groups with friends and family. Track progress, encourage each other, and reach goals together.
          </p>
          <Button style={{ background: '#fff', color: COLORS.primary }} size="lg">Upgrade to Premium - ${PREMIUM_PRICE}/mo</Button>
        </Card>
        <Card style={{ marginTop: 16, padding: '20px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>What you get with Stack Circle:</h3>
          {[
            'Create and join savings groups',
            'Track group progress in real-time',
            'See member contributions',
            'Group activity feed and milestones',
            'Encouragement and accountability',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <Icon name="check" size={16} color={COLORS.success} />
              <span style={{ fontSize: 14 }}>{item}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  function handleCreateGroup() {
    if (!newGroup.groupName || !newGroup.targetAmount) return;
    const grp = {
      id: generateId(), ...newGroup, targetAmount: parseFloat(newGroup.targetAmount),
      currentAmount: 0, inviteCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
      isActive: true, ownerUserId: data.user.id,
      members: [{ id: generateId(), name: data.user.name || 'You', role: 'owner', weeklyTarget: 25, totalContributed: 0 }],
      activity: [{ id: generateId(), userName: 'System', type: 'milestone', message: 'Group created! Start inviting members.', createdAt: getToday() }],
    };
    setData({ ...data, groups: [...data.groups, grp] });
    setSelectedGroup(grp.id);
    setShowCreate(false);
  }

  function handleContribute() {
    if (!contribAmount || !group) return;
    const amt = parseFloat(contribAmount);
    const updatedGroups = data.groups.map(g => {
      if (g.id !== group.id) return g;
      const updatedMembers = g.members.map((m, i) => i === 0 ? { ...m, totalContributed: m.totalContributed + amt } : m);
      const newActivity = { id: generateId(), userName: data.user.name || 'You', type: 'contribution', message: `${data.user.name || 'You'} added ${formatCurrency(amt)}`, createdAt: getToday() };
      return { ...g, currentAmount: g.currentAmount + amt, members: updatedMembers, activity: [newActivity, ...g.activity] };
    });
    setData({ ...data, groups: updatedGroups });
    setShowContribute(false);
    setContribAmount('');
  }

  function sendMessage() {
    if (!messageText.trim() || !group) return;
    const updatedGroups = data.groups.map(g => {
      if (g.id !== group.id) return g;
      const newActivity = { id: generateId(), userName: data.user.name || 'You', type: 'message', message: `${data.user.name || 'You'}: "${messageText}"`, createdAt: getToday() };
      return { ...g, activity: [newActivity, ...g.activity] };
    });
    setData({ ...data, groups: updatedGroups });
    setMessageText('');
  }

  return (
    <div>
      <SectionHeader title="Stack Circle" subtitle="Save together, achieve more" action={
        <Button size="sm" onClick={() => setShowCreate(true)}><Icon name="plus" size={16} /> New Group</Button>
      } />

      {data.groups.length === 0 ? (
        <EmptyState icon="👥" title="No Groups Yet" message="Create a savings group or join one with an invite code." action={<Button onClick={() => setShowCreate(true)}>Create Group</Button>} />
      ) : (
        <>
          {/* Group Tabs */}
          {data.groups.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              {data.groups.map(g => (
                <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                  padding: '8px 16px', borderRadius: 20, border: `2px solid ${selectedGroup === g.id ? COLORS.accent : '#e2e8f0'}`,
                  background: selectedGroup === g.id ? `${COLORS.accent}10` : '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                  color: selectedGroup === g.id ? COLORS.accent : COLORS.textMuted,
                }}>{g.groupName}</button>
              ))}
            </div>
          )}

          {group && (
            <>
              {/* Group Header Card */}
              <Card style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: '#fff', marginBottom: 16 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Group Goal</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{group.goalName}</div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>{group.groupName}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(group.currentAmount)}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>of {formatCurrency(group.targetAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{percentage(group.currentAmount, group.targetAmount)}%</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {group.targetDate ? `${daysUntil(group.targetDate)} days left` : 'No deadline'}
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 10 }}>
                  <div style={{ width: `${percentage(group.currentAmount, group.targetAmount)}%`, height: '100%', borderRadius: 8, background: '#fff', transition: 'width 0.6s' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <Button style={{ background: '#fff', color: COLORS.accent, flex: 1 }} onClick={() => setShowContribute(true)}>
                    + Contribute
                  </Button>
                  <Button style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} size="md">
                    Invite: {group.inviteCode}
                  </Button>
                </div>
              </Card>

              {/* Members */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Members ({group.members.length})
                </div>
                {group.members.map((member, idx) => {
                  const memberPct = group.targetAmount > 0 ? Math.round(member.totalContributed / (group.targetAmount / group.members.length) * 100) : 0;
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < group.members.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 20,
                        background: `hsl(${idx * 60 + 240}, 70%, 60%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 16,
                      }}>{member.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{member.name}</span>
                          {member.role === 'owner' && <Badge color={COLORS.accent}>Owner</Badge>}
                        </div>
                        <ProgressBar value={member.totalContributed} max={group.targetAmount / group.members.length} height={4} color={`hsl(${idx * 60 + 240}, 70%, 60%)`} style={{ marginTop: 6 }} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(member.totalContributed)}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatCurrency(member.weeklyTarget)}/wk</div>
                      </div>
                    </div>
                  );
                })}
              </Card>

              {/* Activity Feed */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Activity</div>

                {/* Message Input */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    value={messageText} onChange={e => setMessageText(e.target.value)}
                    placeholder="Send encouragement..."
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 12,
                      border: `1.5px solid ${COLORS.border}`, fontSize: 14,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <Button size="sm" onClick={sendMessage}>Send</Button>
                </div>

                {group.activity.slice(0, 10).map(act => {
                  const iconMap = { contribution: '💰', milestone: '🎉', join: '👋', message: '💬', celebration: '🏆' };
                  return (
                    <div key={act.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 18 }}>{iconMap[act.type] || '📌'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: COLORS.text }}>{act.message}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{formatDate(act.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Savings Group">
        <Input label="Group Name" value={newGroup.groupName} onChange={v => setNewGroup({ ...newGroup, groupName: v })} placeholder="e.g. Beach Trip Crew" required />
        <Input label="Goal Name" value={newGroup.goalName} onChange={v => setNewGroup({ ...newGroup, goalName: v })} placeholder="e.g. Summer Vacation" required />
        <Input label="Target Amount" value={newGroup.targetAmount} onChange={v => setNewGroup({ ...newGroup, targetAmount: v })} type="number" prefix="$" required />
        <Input label="Target Date" value={newGroup.targetDate} onChange={v => setNewGroup({ ...newGroup, targetDate: v })} type="date" />
        <Button variant="primary" onClick={handleCreateGroup} fullWidth size="lg">Create Group</Button>
      </Modal>

      {/* Contribute Modal */}
      <Modal isOpen={showContribute} onClose={() => setShowContribute(false)} title="Add Contribution">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Contributing to</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{group?.goalName}</div>
        </div>
        <Input label="Amount" value={contribAmount} onChange={setContribAmount} type="number" prefix="$" placeholder="0.00" required />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[10, 25, 50].map(amt => (
            <button key={amt} onClick={() => setContribAmount(String(amt))} style={{
              padding: '10px', borderRadius: 10, border: `2px solid ${contribAmount === String(amt) ? COLORS.primary : '#e2e8f0'}`,
              background: contribAmount === String(amt) ? `${COLORS.primary}08` : '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>${amt}</button>
          ))}
        </div>
        <Button variant="primary" onClick={handleContribute} fullWidth size="lg">Contribute {contribAmount ? formatCurrency(parseFloat(contribAmount)) : ''}</Button>
      </Modal>
    </div>
  );
}

// ---------- SMART INSIGHTS SCREEN ----------

function SmartInsightsScreen({ data, allocation }) {
  const insights = generateInsights(data.bills, data.expenses, data.savingsGoals, allocation);

  // Additional deep insights
  const monthlyIncome = calculateMonthlyIncome(data.incomeSources);
  const monthlyBills = data.bills.reduce((s, b) => s + frequencyToMonthly(b.amount, b.frequency || 'monthly'), 0);
  const billToIncomeRatio = monthlyIncome > 0 ? Math.round(monthlyBills / monthlyIncome * 100) : 0;
  const essentialBills = data.bills.filter(b => b.isEssential);
  const nonEssentialBills = data.bills.filter(b => !b.isEssential);
  const nonEssentialTotal = nonEssentialBills.reduce((s, b) => s + frequencyToMonthly(b.amount, b.frequency || 'monthly'), 0);

  if (!data.user.premiumStatus) {
    return (
      <div>
        <SectionHeader title="Smart Insights" subtitle="Get smarter about your money" />
        {insights.slice(0, 2).map((insight, idx) => (
          <Card key={idx} style={{ marginBottom: 12, opacity: idx > 0 ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{insight.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{insight.title}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{insight.message}</div>
              </div>
            </div>
          </Card>
        ))}
        <PremiumBanner onUpgrade={() => {}} />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Smart Insights" subtitle="Personalized money tips" />

      {/* Budget Health Overview */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Budget Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Bills / Income</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: billToIncomeRatio > 60 ? COLORS.danger : billToIncomeRatio > 40 ? COLORS.warning : COLORS.success }}>{billToIncomeRatio}%</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{billToIncomeRatio > 60 ? 'Too high' : billToIncomeRatio > 40 ? 'Watch this' : 'Healthy'}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Non-Essential Bills</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{formatCurrency(nonEssentialTotal)}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>/month potential savings</div>
          </div>
        </div>
      </Card>

      {/* Insights List */}
      {insights.map((insight, idx) => {
        const bgMap = { danger: '#fef2f2', warning: '#fffbeb', info: `${COLORS.primary}08`, success: '#f0fdf4' };
        const borderMap = { danger: `${COLORS.danger}20`, warning: `${COLORS.warning}20`, info: `${COLORS.primary}15`, success: `${COLORS.success}20` };
        return (
          <Card key={idx} style={{ marginBottom: 12, background: bgMap[insight.type], border: `1px solid ${borderMap[insight.type]}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{insight.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{insight.title}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>{insight.message}</div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Category Targets */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Spending Category Targets</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>Based on your income, here are suggested weekly limits:</div>
        {[
          { cat: 'Groceries', pct: 12 },
          { cat: 'Gas / Transportation', pct: 8 },
          { cat: 'Dining Out', pct: 5 },
          { cat: 'Entertainment', pct: 4 },
          { cat: 'Shopping', pct: 5 },
          { cat: 'Personal Care', pct: 3 },
        ].map(item => {
          const target = allocation.totalIncome * item.pct / 100;
          const weekExpenses = data.expenses.filter(e => e.category === item.cat && e.date >= getWeekStart());
          const actual = weekExpenses.reduce((s, e) => s + e.amount, 0);
          const overBudget = actual > target;
          return (
            <div key={item.cat} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.cat}</span>
                <span style={{ fontSize: 13, color: overBudget ? COLORS.danger : COLORS.success, fontWeight: 600 }}>
                  {formatCurrency(actual)} / {formatCurrency(target)}
                </span>
              </div>
              <ProgressBar value={actual} max={target} height={6} color={overBudget ? COLORS.danger : COLORS.success} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ---------- NOTIFICATIONS SCREEN ----------

function NotificationsScreen({ data, setData }) {
  function markRead(id) {
    setData({ ...data, notifications: data.notifications.map(n => n.id === id ? { ...n, readStatus: true } : n) });
  }

  function markAllRead() {
    setData({ ...data, notifications: data.notifications.map(n => ({ ...n, readStatus: true })) });
  }

  const unread = data.notifications.filter(n => !n.readStatus).length;

  return (
    <div>
      <SectionHeader title="Notifications" subtitle={`${unread} unread`} action={
        unread > 0 ? <Button variant="ghost" size="sm" onClick={markAllRead}>Mark All Read</Button> : null
      } />

      {data.notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No Notifications" message="You're all caught up! Notifications about bills, savings, and more will appear here." />
      ) : data.notifications.map(notif => {
        const iconMap = { bill_reminder: '📋', smart_alert: '💡', overdue: '🔴', savings: '🎯', group: '👥' };
        return (
          <Card key={notif.id} onClick={() => markRead(notif.id)} style={{
            marginBottom: 10, cursor: 'pointer',
            background: notif.readStatus ? '#fff' : `${COLORS.primary}04`,
            border: `1px solid ${notif.readStatus ? '#f1f5f9' : COLORS.primary + '20'}`,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>{iconMap[notif.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: notif.readStatus ? 500 : 700 }}>{notif.title}</span>
                  {!notif.readStatus && <StatusDot color={COLORS.primary} />}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, marginTop: 2 }}>{notif.body}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{formatDate(notif.createdAt)}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- SETTINGS SCREEN WITH 2FA ----------

function SettingsScreen({ data, setData }) {
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(0);
  const [otpCode, setOtpCode] = useState('');

  const trialDaysLeft = data.user.subscriptionStatus === 'trial' ? Math.max(0, daysUntil(data.user.trialEndAt)) : 0;

  function toggleTwoFactor() {
    if (data.user.twoFactorEnabled) {
      setData({ ...data, user: { ...data.user, twoFactorEnabled: false, twoFactorMethod: 'none' } });
    } else {
      setShowTwoFactor(true);
      setTwoFAStep(0);
    }
  }

  function completeTwoFactorSetup(method) {
    setData({ ...data, user: { ...data.user, twoFactorEnabled: true, twoFactorMethod: method } });
    setShowTwoFactor(false);
  }

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Manage your account" />

      {/* Account Info */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Account</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 22,
          }}>{(data.user.name || 'U')[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data.user.name || 'User'}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>{data.user.email || 'email@example.com'}</div>
          </div>
        </div>
        {data.user.isFoundingUser && <Badge color={COLORS.accent}>Founding Member</Badge>}
      </Card>

      {/* Subscription */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Subscription</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14 }}>Status</span>
          <Badge color={data.user.premiumStatus ? COLORS.success : COLORS.textMuted}>
            {data.user.subscriptionStatus === 'trial' ? `Trial (${trialDaysLeft}d left)` : data.user.subscriptionStatus}
          </Badge>
        </div>
        {data.user.subscriptionStatus === 'trial' && (
          <div>
            <ProgressBar value={TRIAL_DAYS - trialDaysLeft} max={TRIAL_DAYS} height={6} color={COLORS.primary} style={{ marginTop: 8 }} />
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
              Trial ends {formatDate(data.user.trialEndAt)} • Then ${PREMIUM_PRICE}/month
            </div>
          </div>
        )}
        {!data.user.premiumStatus && (
          <Button variant="primary" fullWidth style={{ marginTop: 12 }}>Upgrade to Premium - ${PREMIUM_PRICE}/mo</Button>
        )}
      </Card>

      {/* Security */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Icon name="shield" size={18} color={COLORS.primary} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Security</span>
        </div>

        <Toggle
          label="Two-Factor Authentication"
          description={data.user.twoFactorEnabled ? `Enabled via ${data.user.twoFactorMethod}` : 'Add an extra layer of security'}
          checked={data.user.twoFactorEnabled}
          onChange={toggleTwoFactor}
        />

        <div style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
          <button style={{ background: 'none', border: 'none', fontSize: 14, color: COLORS.primary, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Change Password
          </button>
        </div>

        <div style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
          <button style={{ background: 'none', border: 'none', fontSize: 14, color: COLORS.textMuted, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Manage Backup Codes
          </button>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Recovery codes for when you can't access your authenticator</div>
        </div>
      </Card>

      {/* Preferences */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Preferences</div>
        <Toggle label="Bill Reminders" description="Get notified before bills are due" checked={true} onChange={() => {}} />
        <Toggle label="Smart Alerts" description="Spending and savings insights" checked={true} onChange={() => {}} />
        <Toggle label="Group Notifications" description="Activity from your Stack Circles" checked={true} onChange={() => {}} />
      </Card>

      {/* Pay Schedule */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Pay Schedule</div>
        <Select label="Pay Frequency" value={data.user.payFrequency} onChange={v => setData({ ...data, user: { ...data.user, payFrequency: v } })} options={PAY_FREQUENCIES} />
        <Input label="Next Payday" value={data.user.nextPayday} onChange={v => setData({ ...data, user: { ...data.user, nextPayday: v } })} type="date" />
      </Card>

      {/* Future Integrations */}
      <Card style={{ marginBottom: 16, background: '#f8fafc' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Coming Soon</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          Bank account sync via Plaid, push notifications, CSV export, and more features are on the way.
        </div>
        {/* PLAID INTEGRATION POINT: Add Plaid Link button here */}
        {/* PUSH NOTIFICATIONS: Add push notification permission request here */}
      </Card>

      {/* Danger Zone */}
      <Card style={{ marginBottom: 16, border: `1px solid ${COLORS.danger}20` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, marginBottom: 12 }}>Danger Zone</div>
        <Button variant="danger" size="sm">Delete Account</Button>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
          This action requires 2FA verification if enabled.
        </div>
      </Card>

      {/* 2FA Setup Modal */}
      <Modal isOpen={showTwoFactor} onClose={() => setShowTwoFactor(false)} title="Enable Two-Factor Auth">
        {twoFAStep === 0 && (
          <div>
            <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
              Two-factor authentication adds an extra layer of security. Choose your preferred method:
            </p>
            <Card onClick={() => { setTwoFAStep(1); }} style={{ marginBottom: 12, cursor: 'pointer', border: `2px solid ${COLORS.primary}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>📧</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Email OTP</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>We'll send a code to your email</div>
                </div>
              </div>
            </Card>
            <Card onClick={() => { setTwoFAStep(2); }} style={{ cursor: 'pointer', border: `2px solid ${COLORS.primary}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>📱</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Authenticator App</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>Use Google Authenticator, Authy, etc.</div>
                </div>
              </div>
            </Card>
          </div>
        )}
        {twoFAStep === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>📧</span>
              <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>
                We'll send a verification code to your email when you log in.
              </p>
            </div>
            <Input label="Enter verification code" value={otpCode} onChange={setOtpCode} placeholder="000000" />
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16, textAlign: 'center' }}>
              Demo: enter any 6 digits
            </div>
            <Button variant="primary" fullWidth size="lg" onClick={() => completeTwoFactorSetup('email')} disabled={otpCode.length < 6}>
              Verify & Enable
            </Button>
          </div>
        )}
        {twoFAStep === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 160, height: 160, background: '#f1f5f9', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', fontSize: 14, color: COLORS.textMuted,
              }}>
                [QR Code Placeholder]
              </div>
              <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 12 }}>
                Scan this QR code with your authenticator app
              </p>
            </div>
            <Input label="Enter code from app" value={otpCode} onChange={setOtpCode} placeholder="000000" />
            <Button variant="primary" fullWidth size="lg" onClick={() => completeTwoFactorSetup('authenticator')} disabled={otpCode.length < 6}>
              Verify & Enable
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
// ============================================================
// SMART STACK - App Shell: Navigation + Main App Component
// ============================================================

// ---------- LOGIN / AUTH SCREEN ----------

function AuthScreen({ onLogin, onDemo }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  function handleSubmit() {
    if (mode === 'login') {
      // In real app, validate against backend; for demo, simulate 2FA check
      // setShow2FA(true); // Uncomment to simulate 2FA flow
      onLogin({ email });
    } else {
      onLogin({ email, name, isNew: true });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #f8fafc 50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', color: '#fff', marginBottom: 32 }}>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>Smart Stack</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 4 }}>Your paycheck, organized.</div>
      </div>

      <Card style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}>
        <TabBar tabs={[
          { value: 'login', label: 'Log In' },
          { value: 'signup', label: 'Sign Up' },
        ]} active={mode} onSelect={setMode} />

        {show2FA ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>🔐</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 4px' }}>Two-Factor Verification</h3>
              <p style={{ fontSize: 13, color: COLORS.textMuted }}>Enter the code from your authenticator app or email</p>
            </div>
            <Input label="Verification Code" value={otpCode} onChange={setOtpCode} placeholder="000000" />
            <Button variant="primary" fullWidth size="lg" onClick={() => onLogin({ email })}>Verify</Button>
            <button onClick={() => setShow2FA(false)} style={{ background: 'none', border: 'none', fontSize: 13, color: COLORS.primary, cursor: 'pointer', marginTop: 12, width: '100%', textAlign: 'center', fontFamily: 'inherit' }}>
              Back to login
            </button>
          </div>
        ) : (
          <div>
            {mode === 'signup' && (
              <Input label="Full Name" value={name} onChange={setName} placeholder="Your name" required />
            )}
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
            <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <button style={{ background: 'none', border: 'none', fontSize: 13, color: COLORS.primary, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Forgot password?
                </button>
              </div>
            )}
            <Button variant="primary" fullWidth size="lg" onClick={handleSubmit}>
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <Button variant="outline" fullWidth onClick={onDemo}>Try Demo with Sample Data</Button>

            {/* SOCIAL AUTH INTEGRATION POINT */}
            {/* Add Google/Apple sign-in buttons here */}
            <div style={{ marginTop: 12, fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
              Social login (Google, Apple) coming soon
            </div>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 20, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>
        First 500 users get a free 40-day premium trial
      </div>
    </div>
  );
}

// ---------- BOTTOM NAVIGATION ----------

function BottomNav({ active, onNavigate, unreadNotifs }) {
  const items = [
    { id: 'dashboard', icon: 'home', label: 'Home' },
    { id: 'check-spitter', icon: 'split', label: 'Splitter' },
    { id: 'bill-boss', icon: 'bill', label: 'Bills' },
    { id: 'savings', icon: 'savings', label: 'Goals' },
    { id: 'stack-circle', icon: 'group', label: 'Circle' },
  ];

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      background: '#fff', borderTop: '1px solid #f1f5f9',
      padding: '8px 4px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      position: 'sticky', bottom: 0, zIndex: 100,
    }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px',
            borderRadius: 12, transition: 'all 0.2s', position: 'relative',
          }}>
            <div style={{
              padding: '4px 12px', borderRadius: 16,
              background: isActive ? `${COLORS.primary}15` : 'transparent',
              transition: 'all 0.2s',
            }}>
              <Icon name={item.icon} size={22} color={isActive ? COLORS.primary : '#94a3b8'} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              color: isActive ? COLORS.primary : '#94a3b8',
            }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- TOP HEADER BAR ----------

function TopBar({ screen, onNavigate, unreadNotifs }) {
  const screenNames = {
    'dashboard': 'Balance Book',
    'pay-track': 'Pay Track',
    'bill-boss': 'Bill Boss',
    'expense-core': 'Expense Core',
    'check-spitter': 'Check Spitter',
    'savings': 'Savings Goals',
    'stack-circle': 'Stack Circle',
    'insights': 'Smart Insights',
    'settings': 'Settings',
    'notifications': 'Notifications',
  };

  const isSubPage = !['dashboard', 'check-spitter', 'bill-boss', 'savings', 'stack-circle'].includes(screen);

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px', paddingTop: 'max(12px, env(safe-area-inset-top))',
      background: '#fff', borderBottom: '1px solid #f1f5f9',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isSubPage && (
          <button onClick={() => onNavigate('dashboard')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        <div>
          <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 700, letterSpacing: 0.5 }}>SMART STACK</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>{screenNames[screen] || 'Dashboard'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onNavigate('notifications')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <Icon name="bell" size={18} />
          {unreadNotifs > 0 && (
            <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, background: COLORS.danger, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unreadNotifs}
            </div>
          )}
        </button>
        <button onClick={() => onNavigate('settings')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="settings" size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------- MAIN APP COMPONENT ----------

function SmartStackApp() {
  const [appState, setAppState] = useState('auth'); // auth | onboarding | app
  const [screen, setScreen] = useState('dashboard');
  const [data, setData] = useState(createSeedData());

  function handleLogin(info) {
    const d = createSeedData();
    d.user.email = info.email || '';
    d.user.name = info.name || '';
    setData(d);
    setAppState('onboarding');
  }

  function handleDemo() {
    setData(createDemoData());
    setAppState('app');
  }

  function handleOnboardingComplete() {
    setAppState('app');
  }

  // Calculate allocation for current state
  const allocation = useMemo(() =>
    calculateWeeklyAllocation(data.incomeSources, data.bills, data.savingsGoals, data.splitMode, data.user.nextPayday),
    [data.incomeSources, data.bills, data.savingsGoals, data.splitMode, data.user.nextPayday]
  );

  const unreadNotifs = data.notifications.filter(n => !n.readStatus).length;

  if (appState === 'auth') {
    return <AuthScreen onLogin={handleLogin} onDemo={handleDemo} />;
  }

  if (appState === 'onboarding') {
    return <OnboardingScreen data={data} setData={setData} onComplete={handleOnboardingComplete} />;
  }

  const screenComponents = {
    'dashboard': <BalanceBookScreen data={data} setData={setData} setScreen={setScreen} allocation={allocation} />,
    'pay-track': <PayTrackScreen data={data} setData={setData} />,
    'bill-boss': <BillBossScreen data={data} setData={setData} />,
    'expense-core': <ExpenseCoreScreen data={data} setData={setData} />,
    'check-spitter': <CheckSpitterScreen data={data} setData={setData} allocation={allocation} />,
    'savings': <SavingsGoalsScreen data={data} setData={setData} allocation={allocation} />,
    'stack-circle': <StackCircleScreen data={data} setData={setData} />,
    'insights': <SmartInsightsScreen data={data} allocation={allocation} />,
    'notifications': <NotificationsScreen data={data} setData={setData} />,
    'settings': <SettingsScreen data={data} setData={setData} />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: COLORS.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <TopBar screen={screen} onNavigate={setScreen} unreadNotifs={unreadNotifs} />
      <div style={{ flex: 1, padding: '16px 16px 0', overflow: 'auto', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {screenComponents[screen] || screenComponents['dashboard']}
        <div style={{ height: 20 }} />
      </div>
      <BottomNav active={screen} onNavigate={setScreen} unreadNotifs={unreadNotifs} />

      {/* Global Styles */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; background: ${COLORS.bg}; overscroll-behavior: none; }
        input, select, button { font-family: inherit; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ---------- DEFAULT EXPORT ----------
export default SmartStackApp;
