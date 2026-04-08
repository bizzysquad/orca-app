import { useState, useMemo, useCallback, useEffect, createContext, useContext } from "react";

// ============================================================
// ORCA — Financial Command Center
// Premium paycheck budgeting, credit building, rent reporting
// Color palette: Black + Gold (from logo)
// ============================================================

// ---------- THEME SYSTEM ----------

const THEMES = {
  dark: {
    name: 'dark',
    bg: '#0a0a0a',
    bgSecondary: '#141414',
    card: '#1a1a1a',
    cardHover: '#222222',
    border: '#2a2a2a',
    borderLight: '#1f1f1f',
    text: '#f5f5f5',
    textSecondary: '#a0a0a0',
    textMuted: '#6b6b6b',
    gold: '#d4a843',
    goldLight: '#f5d680',
    goldDark: '#b8860b',
    goldMuted: '#8b7535',
    goldBg: 'rgba(212,168,67,0.08)',
    goldBg2: 'rgba(212,168,67,0.15)',
    success: '#4ade80',
    successBg: 'rgba(74,222,128,0.1)',
    warning: '#fbbf24',
    warningBg: 'rgba(251,191,36,0.1)',
    danger: '#f87171',
    dangerBg: 'rgba(248,113,113,0.1)',
    gradientPrimary: 'linear-gradient(135deg, #d4a843, #b8860b)',
    gradientPremium: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
    gradientHero: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
    inputBg: '#141414',
    shadow: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
    shadowLg: '0 4px 12px rgba(0,0,0,0.5)',
    navBg: '#0f0f0f',
    modalOverlay: 'rgba(0,0,0,0.7)',
  },
  light: {
    name: 'light',
    bg: '#faf9f6',
    bgSecondary: '#f0eeea',
    card: '#ffffff',
    cardHover: '#faf9f6',
    border: '#e8e4dd',
    borderLight: '#f0eeea',
    text: '#1a1a1a',
    textSecondary: '#5a5a5a',
    textMuted: '#8a8a8a',
    gold: '#b8860b',
    goldLight: '#d4a843',
    goldDark: '#8b6914',
    goldMuted: '#c5a860',
    goldBg: 'rgba(184,134,11,0.06)',
    goldBg2: 'rgba(184,134,11,0.12)',
    success: '#16a34a',
    successBg: 'rgba(22,163,74,0.08)',
    warning: '#d97706',
    warningBg: 'rgba(217,119,6,0.08)',
    danger: '#dc2626',
    dangerBg: 'rgba(220,38,38,0.08)',
    gradientPrimary: 'linear-gradient(135deg, #b8860b, #8b6914)',
    gradientPremium: 'linear-gradient(135deg, #f5f0e6, #ebe4d4)',
    gradientHero: 'linear-gradient(180deg, #1a1a1a 0%, #2d2518 50%, #faf9f6 50%)',
    inputBg: '#ffffff',
    shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    shadowLg: '0 4px 12px rgba(0,0,0,0.08)',
    navBg: '#ffffff',
    modalOverlay: 'rgba(0,0,0,0.4)',
  },
};

const ThemeContext = createContext(THEMES.dark);

// ---------- CONSTANTS ----------
const BRAND = { name: 'ORCA', tagline: 'Your money. Commanded.' };
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

const CREDIT_SCORE_RANGES = [
  { min: 800, max: 850, label: 'Exceptional', color: '#4ade80' },
  { min: 740, max: 799, label: 'Very Good', color: '#86efac' },
  { min: 670, max: 739, label: 'Good', color: '#fbbf24' },
  { min: 580, max: 669, label: 'Fair', color: '#fb923c' },
  { min: 300, max: 579, label: 'Poor', color: '#f87171' },
];

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

function getToday() { return new Date().toISOString().split('T')[0]; }

function getWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function getWeekEnd() {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().split('T')[0];
}

function generateId() { return Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
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
  return incomeSources.filter(s => s.isActive !== false).reduce((sum, s) => sum + frequencyToWeekly(s.amount, s.frequency), 0);
}

function calculateMonthlyIncome(incomeSources) {
  return incomeSources.filter(s => s.isActive !== false).reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);
}

function calculateWeeklyBillReserve(bills) {
  return bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + frequencyToWeekly(b.amount, b.frequency || 'monthly'), 0);
}

function calculateDueDateAwareReserve(bills, nextPayday) {
  let reserve = 0;
  bills.filter(b => b.status !== 'paid').forEach(bill => {
    const weeklyAmount = frequencyToWeekly(bill.amount, bill.frequency || 'monthly');
    const daysToDue = daysUntil(bill.dueDate);
    const daysToPayday = daysUntil(nextPayday);
    if (daysToDue >= 0 && daysToDue <= daysToPayday) { reserve += bill.amount; }
    else { reserve += weeklyAmount; }
  });
  return reserve;
}

function calculatePriorityFirstReserve(bills, totalIncome) {
  let remaining = totalIncome;
  const sortedBills = [...bills].filter(b => b.status !== 'paid').sort((a, b) => {
    const aIdx = PRIORITY_ORDER.findIndex(p => a.category?.includes(p.split(' ')[0]));
    const bIdx = PRIORITY_ORDER.findIndex(p => b.category?.includes(p.split(' ')[0]));
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
  sortedBills.forEach(bill => {
    const weeklyAmt = frequencyToWeekly(bill.amount, bill.frequency || 'monthly');
    remaining = Math.max(0, remaining - weeklyAmt);
  });
  return { totalReserved: totalIncome - remaining, remaining };
}

function calculateWeeklyAllocation(incomeSources, bills, savingsGoals, splitMode, nextPayday) {
  const weeklyIncome = calculateWeeklyIncome(incomeSources);
  let reservedForBills;
  switch (splitMode) {
    case 'due_date':
      reservedForBills = calculateDueDateAwareReserve(bills, nextPayday); break;
    case 'priority':
      reservedForBills = calculatePriorityFirstReserve(bills, weeklyIncome).totalReserved; break;
    default:
      reservedForBills = calculateWeeklyBillReserve(bills);
  }
  const reservedForSavings = savingsGoals.filter(g => g.isActive !== false).reduce((sum, g) => {
    if (g.contributionType === 'fixed') return sum + (g.contributionValue || 0);
    if (g.contributionType === 'percentage') return sum + (weeklyIncome * (g.contributionValue || 0) / 100);
    return sum;
  }, 0);
  const safeToSpendWeekly = Math.max(0, weeklyIncome - reservedForBills - reservedForSavings);
  const shortfall = Math.max(0, (reservedForBills + reservedForSavings) - weeklyIncome);
  return { totalIncome: weeklyIncome, reservedForBills, reservedForSavings, safeToSpendWeekly, safeToSpendDaily: safeToSpendWeekly / 7, shortfall, periodStart: getWeekStart(), periodEnd: getWeekEnd() };
}

function calculateBudgetHealth(allocation) {
  const { totalIncome, shortfall, safeToSpendWeekly } = allocation;
  if (totalIncome === 0) return { score: 0, label: 'No Income', color: '#6b6b6b' };
  if (shortfall > 0) return { score: 25, label: 'At Risk', color: '#f87171' };
  const ratio = safeToSpendWeekly / totalIncome;
  if (ratio < 0.1) return { score: 50, label: 'Tight', color: '#fbbf24' };
  if (ratio < 0.25) return { score: 70, label: 'Fair', color: '#fbbf24' };
  return { score: 90, label: 'Healthy', color: '#4ade80' };
}

function generateInsights(bills, expenses, savingsGoals, allocation) {
  const insights = [];
  const subBills = bills.filter(b => b.category === 'Subscription Bills' || b.category === 'App / TV Subscriptions');
  const monthlySubTotal = subBills.reduce((s, b) => s + frequencyToMonthly(b.amount, b.frequency || 'monthly'), 0);
  if (monthlySubTotal > 40) insights.push({ type: 'warning', icon: '📺', title: 'Subscription Check', message: `Your subscriptions total ${formatCurrency(monthlySubTotal)}/month. Review if all are needed.` });
  const diningExpenses = expenses.filter(e => e.category === 'Dining Out');
  const weeklyDining = diningExpenses.reduce((s, e) => s + e.amount, 0);
  if (weeklyDining > 50) insights.push({ type: 'warning', icon: '🍽️', title: 'Dining Spending', message: `You've spent ${formatCurrency(weeklyDining)} on dining out. Consider meal prepping to save.` });
  savingsGoals.filter(g => g.isActive && g.targetDate).forEach(goal => {
    const weeksLeft = Math.max(1, daysUntil(goal.targetDate) / 7);
    const needed = (goal.targetAmount - goal.currentAmount) / weeksLeft;
    const actual = goal.contributionType === 'fixed' ? goal.contributionValue : 0;
    if (needed > actual * 1.2) insights.push({ type: 'info', icon: '🎯', title: `${goal.name} Goal`, message: `You need ${formatCurrency(needed)}/week to hit your goal. Consider bumping your contribution.` });
  });
  if (allocation.shortfall > 0) insights.push({ type: 'danger', icon: '⚠️', title: 'Budget Shortfall', message: `You're projected to be ${formatCurrency(allocation.shortfall)} short this week.` });
  const overdueBills = bills.filter(b => b.status === 'overdue' || (daysUntil(b.dueDate) < 0 && b.status !== 'paid'));
  if (overdueBills.length > 0) insights.push({ type: 'danger', icon: '🔴', title: 'Overdue Bills', message: `${overdueBills.length} bill(s) are overdue. Prioritize these to avoid late fees.` });
  const entExpenses = expenses.filter(e => e.category === 'Entertainment');
  const weeklyEnt = entExpenses.reduce((s, e) => s + e.amount, 0);
  if (weeklyEnt > 40) insights.push({ type: 'warning', icon: '🎮', title: 'Entertainment Spending', message: `${formatCurrency(weeklyEnt)} on entertainment this week. Cutting ${formatCurrency(15)} keeps you on track.` });
  return insights.length > 0 ? insights : [{ type: 'success', icon: '✅', title: 'Looking Good!', message: 'Your budget is on track this week. Keep it up!' }];
}

// ---------- CREDIT SCORE ENGINE ----------

function getCreditScoreRange(score) {
  return CREDIT_SCORE_RANGES.find(r => score >= r.min && score <= r.max) || CREDIT_SCORE_RANGES[4];
}

function generateCreditInsights(creditData, bills, rentPayments) {
  const insights = [];
  const { score, utilization, onTimePayments, accountAge, inquiries, totalDebt } = creditData;

  // Utilization insights
  if (utilization > 30) {
    insights.push({
      type: 'danger', icon: '💳', priority: 1,
      title: 'Credit Utilization Too High',
      message: `Your utilization is ${utilization}%. Keeping it under 30% (ideally under 10%) can boost your score by 20-50 points.`,
      impact: 'High', action: `Pay down ${formatCurrency(totalDebt * (utilization - 10) / 100)} to reach 10% utilization.`,
    });
  } else if (utilization > 10) {
    insights.push({
      type: 'warning', icon: '💳', priority: 2,
      title: 'Good Utilization, Could Be Better',
      message: `At ${utilization}%, you're under the 30% threshold. Dropping to under 10% could add 10-20 points.`,
      impact: 'Medium', action: `Pay down ${formatCurrency(totalDebt * (utilization - 5) / 100)} more to optimize.`,
    });
  } else {
    insights.push({
      type: 'success', icon: '💳', priority: 5,
      title: 'Excellent Utilization',
      message: `${utilization}% utilization is excellent. Keep it under 10% for maximum score benefit.`,
      impact: 'Low', action: 'Keep doing what you\'re doing.',
    });
  }

  // Payment history
  if (onTimePayments < 100) {
    insights.push({
      type: 'danger', icon: '📅', priority: 1,
      title: 'Missed Payments Hurting Your Score',
      message: `${onTimePayments}% on-time payment rate. Payment history is 35% of your score. Even one late payment can drop it 60-110 points.`,
      impact: 'Very High', action: 'Set up autopay for all minimum payments. Use ORCA bill reminders to stay ahead.',
    });
  }

  // Rent reporting
  const reportedPayments = rentPayments.filter(r => r.reported);
  if (reportedPayments.length === 0 && bills.some(b => b.category === 'Rent / Mortgage')) {
    insights.push({
      type: 'info', icon: '🏠', priority: 2,
      title: 'Report Your Rent Payments',
      message: 'Rent reporting can add 20-40 points to your credit score. You\'re paying rent anyway — make it count.',
      impact: 'High', action: 'Enable Rent Reporter in ORCA to start building credit from rent.',
    });
  }

  // Hard inquiries
  if (inquiries > 2) {
    insights.push({
      type: 'warning', icon: '🔍', priority: 3,
      title: 'Too Many Recent Inquiries',
      message: `${inquiries} hard inquiries in the last 12 months. Each can drop your score 5-10 points. Avoid new applications for 6 months.`,
      impact: 'Medium', action: 'Wait before applying for new credit. Inquiries fall off after 2 years.',
    });
  }

  // Account age
  if (accountAge < 3) {
    insights.push({
      type: 'info', icon: '⏰', priority: 4,
      title: 'Build Account History',
      message: `Average account age is ${accountAge} years. Lenders prefer 7+ years. Keep old accounts open, even unused.`,
      impact: 'Medium', action: 'Don\'t close old credit cards. Use them for small recurring charges.',
    });
  }

  // Score-specific advice
  if (score < 580) {
    insights.push({
      type: 'info', icon: '🚀', priority: 1,
      title: 'Your Credit Building Plan',
      message: 'Focus on: (1) Pay all bills on time, (2) Get a secured credit card, (3) Report rent payments, (4) Dispute any errors on your report.',
      impact: 'Very High', action: 'Start with ORCA Rent Reporter and set up bill autopay.',
    });
  } else if (score < 670) {
    insights.push({
      type: 'info', icon: '📈', priority: 2,
      title: 'Path to Good Credit',
      message: 'You\'re close to the "Good" range (670+). Reducing utilization and maintaining perfect payment history will get you there in 3-6 months.',
      impact: 'High', action: 'Target 0 missed payments and under 20% utilization.',
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// ---------- SEED DATA ----------

function createSeedData() {
  const today = getToday();
  return {
    user: { id: generateId(), name: '', email: '', onboardingComplete: false, isFoundingUser: true, trialStartAt: today, trialEndAt: addDays(today, TRIAL_DAYS), subscriptionStatus: 'trial', premiumStatus: true, twoFactorEnabled: false, twoFactorMethod: 'none', payFrequency: 'biweekly', nextPayday: addDays(today, 10) },
    incomeSources: [], bills: [], expenses: [], savingsGoals: [], splitMode: 'equal', notifications: [], groups: [],
    creditScore: { score: 0, utilization: 0, onTimePayments: 100, accountAge: 0, inquiries: 0, totalDebt: 0, creditLimit: 0, history: [] },
    rentPayments: [],
  };
}

function createDemoData() {
  const today = getToday();
  return {
    user: { id: generateId(), name: 'Alex Johnson', email: 'alex@example.com', onboardingComplete: true, isFoundingUser: true, trialStartAt: addDays(today, -10), trialEndAt: addDays(today, 30), subscriptionStatus: 'trial', premiumStatus: true, twoFactorEnabled: false, twoFactorMethod: 'none', payFrequency: 'biweekly', nextPayday: addDays(today, 4) },
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
      { id: generateId(), type: 'smart_alert', title: 'Credit Tip', body: 'Your rent payment was reported. Expect a score update in 30 days.', readStatus: false, scheduledAt: today, createdAt: today },
    ],
    groups: [{
      id: generateId(), ownerUserId: 'demo', groupName: 'Beach Trip Crew', goalName: 'Summer Beach Trip',
      targetAmount: 3000, targetDate: addDays(today, 120), currentAmount: 1240, inviteCode: 'BEACH24', isActive: true,
      members: [
        { id: generateId(), name: 'Alex (You)', role: 'owner', weeklyTarget: 30, totalContributed: 450 },
        { id: generateId(), name: 'Jordan', role: 'member', weeklyTarget: 25, totalContributed: 380 },
        { id: generateId(), name: 'Morgan', role: 'member', weeklyTarget: 20, totalContributed: 290 },
        { id: generateId(), name: 'Taylor', role: 'member', weeklyTarget: 15, totalContributed: 120 },
      ],
      activity: [
        { id: generateId(), userName: 'Jordan', type: 'contribution', message: 'Jordan added $25', createdAt: addDays(today, -1) },
        { id: generateId(), userName: 'System', type: 'milestone', message: 'The group reached 40% of its goal!', createdAt: addDays(today, -2) },
        { id: generateId(), userName: 'Alex', type: 'contribution', message: 'Alex added $30', createdAt: addDays(today, -3) },
      ],
    }],
    creditScore: {
      score: 648, utilization: 34, onTimePayments: 94, accountAge: 2.5, inquiries: 3, totalDebt: 4200, creditLimit: 12000,
      history: [
        { month: 'Oct', score: 621 }, { month: 'Nov', score: 628 }, { month: 'Dec', score: 635 },
        { month: 'Jan', score: 640 }, { month: 'Feb', score: 644 }, { month: 'Mar', score: 648 },
      ],
    },
    rentPayments: [
      { id: generateId(), month: addDays(today, -60), amount: 1200, status: 'paid', reported: true, reportedDate: addDays(today, -55) },
      { id: generateId(), month: addDays(today, -30), amount: 1200, status: 'paid', reported: true, reportedDate: addDays(today, -25) },
      { id: generateId(), month: today, amount: 1200, status: 'upcoming', reported: false, reportedDate: null },
    ],
  };
}
// ============================================================
// ORCA - Part 2: Themed UI Components + Onboarding
// ============================================================

// ---------- SHARED UI COMPONENTS (THEMED) ----------

function Icon({ name, size = 20, color }) {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    bill: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    expense: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    split: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>,
    savings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    group: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    credit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>,
    rent: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
    insights: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    chevronLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    crown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    trendUp: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  };
  return icons[name] || null;
}

function Card({ children, style, onClick }) {
  const t = useContext(ThemeContext);
  return (
    <div onClick={onClick} style={{
      background: t.card, borderRadius: 16, padding: 16,
      boxShadow: t.shadow, border: `1px solid ${t.border}`,
      transition: 'all 0.2s ease', cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'md', style, disabled, fullWidth }) {
  const t = useContext(ThemeContext);
  const base = { border: 'none', borderRadius: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, width: fullWidth ? '100%' : 'auto', fontFamily: 'inherit' };
  const sizes = { sm: { padding: '8px 16px', fontSize: 13 }, md: { padding: '12px 24px', fontSize: 14 }, lg: { padding: '14px 28px', fontSize: 16 } };
  const variants = {
    primary: { background: t.gold, color: '#000' },
    secondary: { background: t.bgSecondary, color: t.text },
    success: { background: t.success, color: '#000' },
    danger: { background: t.dangerBg, color: t.danger },
    ghost: { background: 'transparent', color: t.gold },
    outline: { background: 'transparent', color: t.gold, border: `2px solid ${t.gold}` },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>{children}</button>;
}

function Input({ label, value, onChange, type = 'text', placeholder, style, prefix, suffix, required }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>{label}{required && <span style={{ color: t.danger }}> *</span>}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 14, color: t.textMuted, fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '12px 14px', paddingLeft: prefix ? 28 : 14, paddingRight: suffix ? 60 : 14, borderRadius: 12, border: `1.5px solid ${t.border}`, fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', background: t.inputBg, color: t.text, boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = t.gold}
          onBlur={e => e.target.style.borderColor = t.border}
        />
        {suffix && <span style={{ position: 'absolute', right: 14, color: t.textMuted, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, style }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${t.border}`, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: t.inputBg, color: t.text, cursor: 'pointer', appearance: 'none', boxSizing: 'border-box', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23${t.textMuted.replace('#','')}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
        {options.map(opt => <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange, description }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{description}</div>}
      </div>
      <div onClick={() => onChange(!checked)} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s', background: checked ? t.gold : t.border, padding: 3, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: checked ? '#000' : t.textMuted, transition: 'all 0.2s', transform: checked ? 'translateX(20px)' : 'translateX(0)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, height = 8, showLabel, style }) {
  const t = useContext(ThemeContext);
  const pct = percentage(value, max);
  const barColor = color || (pct >= 75 ? t.success : pct >= 40 ? t.warning : t.danger);
  return (
    <div style={style}>
      <div style={{ background: t.bgSecondary, borderRadius: height, height, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: height, background: barColor, transition: 'width 0.6s ease' }} />
      </div>
      {showLabel && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: t.textMuted }}><span>{formatCurrency(value)}</span><span>{pct}%</span></div>}
    </div>
  );
}

function Badge({ children, color }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color, background: `${color}18` }}>{children}</span>;
}

function StatusDot({ color }) { return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: color, marginRight: 6 }} />; }

function EmptyState({ icon, title, message, action }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: t.textMuted, margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
      {action}
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  const t = useContext(ThemeContext);
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.modalOverlay, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: t.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', padding: '24px 20px 40px', animation: 'slideUp 0.3s ease', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: t.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: t.bgSecondary, border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.text }}><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onSelect }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ display: 'flex', gap: 4, background: t.bgSecondary, borderRadius: 12, padding: 4, marginBottom: 16 }}>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onSelect(tab.value)} style={{
          flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13,
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
          background: active === tab.value ? t.card : 'transparent',
          color: active === tab.value ? t.gold : t.textMuted,
          boxShadow: active === tab.value ? t.shadow : 'none',
        }}>{tab.label}</button>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  const t = useContext(ThemeContext);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: t.text }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: t.textMuted, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function TrialBanner({ daysLeft }) {
  const t = useContext(ThemeContext);
  if (daysLeft <= 0) return null;
  return (
    <div style={{ background: t.goldBg, borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.gold}20` }}>
      <Icon name="crown" size={16} color={t.gold} />
      <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>Premium trial: <strong style={{ color: t.gold }}>{daysLeft} days left</strong></span>
    </div>
  );
}

// ---------- ONBOARDING ----------

function OnboardingScreen({ data, setData, onComplete }) {
  const t = useContext(ThemeContext);
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

  function addBillRow() { setBills([...bills, { name: '', amount: '', category: BILL_CATEGORIES[0] }]); }
  function updateBill(idx, field, val) { const u = [...bills]; u[idx] = { ...u[idx], [field]: val }; setBills(u); }
  function removeBill(idx) { setBills(bills.filter((_, i) => i !== idx)); }

  function handleComplete() {
    const validBills = bills.filter(b => b.name && b.amount > 0);
    const incomeAmt = parseFloat(income) || 0;
    const newData = { ...data,
      user: { ...data.user, name, onboardingComplete: true, payFrequency: payFreq, nextPayday },
      incomeSources: [{ id: generateId(), sourceName: 'Main Income', amount: incomeAmt, frequency: payFreq, nextPaymentDate: nextPayday, recurring: true, isActive: true }],
      bills: validBills.map(b => ({ id: generateId(), name: b.name, amount: parseFloat(b.amount), category: b.category, dueDate: addDays(getToday(), Math.floor(Math.random() * 28) + 1), frequency: 'monthly', isEssential: true, isFixed: true, autopay: false, status: 'upcoming', paidAmount: 0, reminderDaysBefore: 3, notes: '' })),
      savingsGoals: [{ id: generateId(), name: savingsChoice === 'Custom' ? 'My Savings Goal' : savingsChoice, targetAmount: parseFloat(savingsTarget) || 1000, currentAmount: 0, targetDate: addDays(getToday(), 180), contributionType: 'fixed', contributionValue: Math.round((parseFloat(savingsTarget) || 1000) / 26), isActive: true }],
    };
    setData(newData);
    onComplete();
  }

  const stepContent = [
    // Step 0: Welcome
    <div key="welcome" style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🐋</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 4px', color: t.gold, letterSpacing: -1 }}>ORCA</h1>
      <p style={{ fontSize: 14, color: t.textMuted, margin: '0 0 32px', lineHeight: 1.6 }}>Your money. Commanded. Let's set up your budget in under 2 minutes.</p>
      <Input label="What's your name?" value={name} onChange={setName} placeholder="Your first name" required />
    </div>,
    // Step 1: Income
    <div key="income">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: t.text }}>Your Income</h2>
      <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 24 }}>How much do you get paid and how often?</p>
      <Input label="Paycheck Amount" value={income} onChange={setIncome} type="number" placeholder="0.00" prefix="$" required />
      <Select label="How often are you paid?" value={payFreq} onChange={setPayFreq} options={PAY_FREQUENCIES} />
      <Input label="When is your next payday?" value={nextPayday} onChange={setNextPayday} type="date" />
      <Card style={{ background: t.successBg, border: `1px solid ${t.success}30` }}>
        <div style={{ fontSize: 13, color: t.success }}><strong>Estimated weekly income:</strong> {formatCurrency(frequencyToWeekly(parseFloat(income) || 0, payFreq))}</div>
      </Card>
    </div>,
    // Step 2: Bills
    <div key="bills">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: t.text }}>Recurring Bills</h2>
      <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 20 }}>Add your regular bills so ORCA can help you plan.</p>
      {bills.map((bill, idx) => (
        <Card key={idx} style={{ marginBottom: 12, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}><Input label="Bill Name" value={bill.name} onChange={v => updateBill(idx, 'name', v)} placeholder="e.g. Rent" style={{ marginBottom: 0 }} /></div>
            <div style={{ width: 100 }}><Input label="Amount" value={bill.amount} onChange={v => updateBill(idx, 'amount', v)} type="number" prefix="$" style={{ marginBottom: 0 }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}><Select value={bill.category} onChange={v => updateBill(idx, 'category', v)} options={BILL_CATEGORIES} style={{ marginBottom: 0 }} /></div>
            {bills.length > 1 && <button onClick={() => removeBill(idx)} style={{ background: t.dangerBg, border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><Icon name="trash" size={16} color={t.danger} /></button>}
          </div>
        </Card>
      ))}
      <Button variant="ghost" size="sm" onClick={addBillRow} fullWidth><Icon name="plus" size={16} /> Add Another Bill</Button>
    </div>,
    // Step 3: Savings
    <div key="savings">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: t.text }}>Savings Goal</h2>
      <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 20 }}>Pick a goal to start. Even small amounts add up.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {SAVINGS_PRESETS.map(preset => (
          <Card key={preset} onClick={() => setSavingsChoice(preset)} style={{ padding: '14px 16px', cursor: 'pointer', textAlign: 'center', border: savingsChoice === preset ? `2px solid ${t.gold}` : `2px solid transparent`, background: savingsChoice === preset ? t.goldBg : t.card }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: savingsChoice === preset ? t.gold : t.text }}>{preset}</div>
          </Card>
        ))}
      </div>
      <Input label="How much do you want to save?" value={savingsTarget} onChange={setSavingsTarget} type="number" prefix="$" placeholder="1000" />
    </div>,
    // Step 4: Summary
    <div key="summary">
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: t.text }}>Almost Done!</h2>
      <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 20 }}>Here's your weekly budget preview.</p>
      <Toggle label="I want to save with friends too" description="Join group savings with Stack Circle" checked={wantGroups} onChange={setWantGroups} />
      {(() => {
        const weeklyInc = frequencyToWeekly(parseFloat(income) || 0, payFreq);
        const weeklyBills = bills.filter(b => b.amount).reduce((s, b) => s + frequencyToWeekly(parseFloat(b.amount), 'monthly'), 0);
        const weeklySavings = (parseFloat(savingsTarget) || 0) / 26;
        const sts = Math.max(0, weeklyInc - weeklyBills - weeklySavings);
        return (
          <Card style={{ background: t.bgSecondary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 14, color: t.textMuted }}>Weekly Income</span><span style={{ fontSize: 14, fontWeight: 700, color: t.success }}>{formatCurrency(weeklyInc)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 14, color: t.textMuted }}>Bills Reserve</span><span style={{ fontSize: 14, fontWeight: 700, color: t.danger }}>-{formatCurrency(weeklyBills)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 14, color: t.textMuted }}>Savings</span><span style={{ fontSize: 14, fontWeight: 700, color: t.gold }}>-{formatCurrency(weeklySavings)}</span></div>
            <div style={{ borderTop: `2px solid ${t.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Safe to Spend</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: sts > 0 ? t.success : t.danger }}>{formatCurrency(sts)}</span>
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, textAlign: 'right' }}>~{formatCurrency(sts / 7)}/day</div>
          </Card>
        );
      })()}
    </div>,
  ];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {Array.from({ length: totalSteps }).map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? t.gold : t.border, transition: 'background 0.3s' }} />)}
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'right' }}>Step {step + 1} of {totalSteps}</div>
      </div>
      <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>{stepContent[step]}</div>
      <div style={{ padding: '16px 20px 24px', display: 'flex', gap: 12 }}>
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
        <Button variant="primary" onClick={() => step < totalSteps - 1 ? setStep(step + 1) : handleComplete()} fullWidth>
          {step === totalSteps - 1 ? "Let's Go!" : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
import React, { useContext, useState, useMemo } from 'react';
import {
  Card, Button, Input, Select, Toggle, ProgressBar, Badge, StatusDot,
  EmptyState, Modal, SectionHeader, Icon
} from './components';
import { ThemeContext } from './ThemeContext';
import {
  formatCurrency, formatDate, formatShortDate, daysUntil, addDays,
  getToday, getWeekStart, getWeekEnd, generateId, percentage,
  frequencyToWeekly, frequencyToMonthly, calculateWeeklyIncome,
  calculateMonthlyIncome, calculateBudgetHealth, generateInsights
} from './utils';
import { PAY_FREQUENCIES, BILL_CATEGORIES, EXPENSE_CATEGORIES } from './constants';

// ============================================================================
// BALANCE BOOK SCREEN
// ============================================================================

export function BalanceBookScreen({ data, setData, setScreen, allocation }) {
  const t = useContext(ThemeContext);
  const today = getToday();

  // Calculate health metrics
  const monthlyIncome = useMemo(() => {
    return data.income.reduce((sum, inc) => {
      const monthly = frequencyToMonthly(inc.frequency, inc.amount);
      return sum + monthly;
    }, 0);
  }, [data.income]);

  const monthlyExpenses = useMemo(() => {
    return data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [data.expenses]);

  const monthlyBills = useMemo(() => {
    return data.bills.reduce((sum, bill) => {
      if (bill.paid === false) {
        const monthly = frequencyToMonthly(bill.frequency, bill.amount);
        return sum + monthly;
      }
      return sum;
    }, 0);
  }, [data.bills]);

  const monthlyTotal = monthlyBills + monthlyExpenses;
  const safeToSpend = Math.max(0, monthlyIncome - monthlyTotal);
  const healthScore = calculateBudgetHealth(monthlyIncome, monthlyTotal);

  // Get upcoming bills
  const upcomingBills = useMemo(() => {
    return data.bills
      .filter(bill => !bill.paid)
      .map(bill => ({
        ...bill,
        daysUntil: daysUntil(bill.dueDate, today)
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [data.bills, today]);

  // Get top insight
  const topInsight = useMemo(() => {
    const insights = generateInsights(data, healthScore, monthlyIncome);
    return insights[0];
  }, [data, healthScore, monthlyIncome]);

  // Get savings preview
  const savingsData = useMemo(() => {
    const groupedByCategory = {};
    data.savings?.forEach(saving => {
      const cat = saving.category || 'Other';
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = { amount: 0, target: 0 };
      }
      groupedByCategory[cat].amount += saving.amount || 0;
      groupedByCategory[cat].target += saving.target || 0;
    });
    return Object.entries(groupedByCategory).map(([cat, data]) => ({
      category: cat,
      ...data
    }));
  }, [data.savings]);

  // Health color
  const getHealthColor = (score) => {
    if (score >= 80) return t.success;
    if (score >= 60) return t.gold;
    if (score >= 40) return t.warning;
    return t.danger;
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      {/* Health Score Hero Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${t.gold}, ${t.goldBg2})`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: t.shadow,
          color: t.text
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', opacity: 0.9 }}>Budget Health</p>
            <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{healthScore}%</div>
          </div>
          <StatusDot status={healthScore >= 70 ? 'success' : healthScore >= 50 ? 'warning' : 'danger'} />
        </div>
        <ProgressBar value={healthScore} max={100} color={getHealthColor(healthScore)} />
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
          {healthScore >= 80 ? 'Excellent budget control' : 'Keep optimizing your spending'}
        </p>
      </div>

      {/* Safe to Spend */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Monthly Income</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: t.success }}>
              {formatCurrency(monthlyIncome)}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Committed</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: t.danger }}>
              {formatCurrency(monthlyTotal)}
            </p>
          </div>
        </div>
      </Card>

      {/* Safe to Spend Hero Card */}
      <div
        style={{
          background: t.successBg,
          border: `2px solid ${t.success}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Safe to Spend</p>
        <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: t.success }}>
          {formatCurrency(safeToSpend)}
        </p>
      </div>

      {/* Upcoming Bills */}
      <SectionHeader title="Upcoming Bills" />
      {upcomingBills.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          {upcomingBills.map(bill => (
            <Card
              key={bill.id}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>{bill.name}</p>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>
                  Due {formatDate(bill.dueDate)} ({bill.daysUntil} days)
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>
                  {formatCurrency(bill.amount)}
                </p>
                <Badge
                  label={bill.daysUntil <= 3 ? 'Due Soon' : 'Upcoming'}
                  variant={bill.daysUntil <= 3 ? 'danger' : 'default'}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No upcoming bills" description="You're all set!" />
      )}

      {/* Savings Preview */}
      {savingsData.length > 0 && (
        <>
          <SectionHeader title="Savings Goals" />
          <div style={{ marginBottom: '20px' }}>
            {savingsData.slice(0, 3).map((saving, idx) => (
              <Card key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontWeight: '600', color: t.text }}>{saving.category}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>
                    {formatCurrency(saving.amount)} / {formatCurrency(saving.target)}
                  </p>
                </div>
                <ProgressBar
                  value={Math.min(saving.amount, saving.target)}
                  max={saving.target}
                  color={t.gold}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Top Insight */}
      {topInsight && (
        <Card
          style={{
            background: t.bgSecondary,
            borderLeft: `4px solid ${t.gold}`,
            marginBottom: '20px'
          }}
        >
          <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>
            Top Insight
          </p>
          <p style={{ margin: 0, fontWeight: '600', color: t.text }}>{topInsight}</p>
        </Card>
      )}

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <Button
          label="Add Income"
          onClick={() => setScreen('Pay Track')}
          style={{ background: t.gold, color: t.bg }}
        />
        <Button
          label="Add Bill"
          onClick={() => setScreen('Bill Boss')}
          style={{ background: t.card, color: t.text, border: `1px solid ${t.border}` }}
        />
        <Button
          label="Log Expense"
          onClick={() => setScreen('Expense Core')}
          style={{ background: t.card, color: t.text, border: `1px solid ${t.border}` }}
        />
        <Button
          label="View Details"
          onClick={() => setScreen('Check Spitter')}
          style={{ background: t.card, color: t.text, border: `1px solid ${t.border}` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// PAY TRACK SCREEN
// ============================================================================

export function PayTrackScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    nextPayDate: ''
  });

  const weeklyTotal = useMemo(() => {
    return data.income.reduce((sum, inc) => {
      const weekly = frequencyToWeekly(inc.frequency, inc.amount);
      return sum + weekly;
    }, 0);
  }, [data.income]);

  const monthlyTotal = useMemo(() => {
    return data.income.reduce((sum, inc) => {
      const monthly = frequencyToMonthly(inc.frequency, inc.amount);
      return sum + monthly;
    }, 0);
  }, [data.income]);

  const today = getToday();
  const nextPayday = useMemo(() => {
    if (data.income.length === 0) return null;
    const dates = data.income.map(inc => inc.nextPayDate).filter(Boolean);
    if (dates.length === 0) return null;
    return dates.sort()[0];
  }, [data.income]);

  const openModal = (income = null) => {
    if (income) {
      setEditingId(income.id);
      setFormData(income);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        nextPayDate: ''
      });
    }
    setShowModal(true);
  };

  const saveIncome = () => {
    if (!formData.name || !formData.amount || !formData.nextPayDate) return;

    if (editingId) {
      setData({
        ...data,
        income: data.income.map(inc =>
          inc.id === editingId ? { ...inc, ...formData } : inc
        )
      });
    } else {
      setData({
        ...data,
        income: [...data.income, { ...formData, id: generateId() }]
      });
    }

    setShowModal(false);
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      nextPayDate: ''
    });
    setEditingId(null);
  };

  const deleteIncome = (id) => {
    setData({
      ...data,
      income: data.income.filter(inc => inc.id !== id)
    });
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      <SectionHeader title="Pay Track" />

      {/* Income Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <Card>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Weekly Total</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: t.gold }}>
            {formatCurrency(weeklyTotal)}
          </p>
        </Card>
        <Card>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Monthly Total</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: t.success }}>
            {formatCurrency(monthlyTotal)}
          </p>
        </Card>
      </div>

      {/* Next Payday */}
      {nextPayday && (
        <Card
          style={{
            background: `linear-gradient(135deg, ${t.goldBg}, ${t.goldBg2})`,
            marginBottom: '20px',
            border: `2px solid ${t.gold}`
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Next Payday</p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: t.text }}>
            {formatDate(nextPayday)}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: t.textSecondary }}>
            In {daysUntil(nextPayday, today)} days
          </p>
        </Card>
      )}

      {/* Income List */}
      <div style={{ marginBottom: '20px' }}>
        {data.income.length > 0 ? (
          data.income.map(income => (
            <Card
              key={income.id}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>
                  {income.name}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>
                  {formatCurrency(income.amount)} {income.frequency}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  label="Edit"
                  onClick={() => openModal(income)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: t.inputBg,
                    color: t.text,
                    border: `1px solid ${t.border}`
                  }}
                />
                <Button
                  label="Delete"
                  onClick={() => deleteIncome(income.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: t.dangerBg,
                    color: t.danger,
                    border: `1px solid ${t.danger}`
                  }}
                />
              </div>
            </Card>
          ))
        ) : (
          <EmptyState title="No income sources" description="Add your first income source" />
        )}
      </div>

      {/* Add Button */}
      <Button
        label="+ Add Income"
        onClick={() => openModal()}
        style={{
          width: '100%',
          background: t.gold,
          color: t.bg,
          padding: '12px',
          fontWeight: 'bold'
        }}
      />

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Income' : 'Add Income'}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Job"
            />
            <Input
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
              placeholder="0.00"
            />
            <Select
              label="Frequency"
              value={formData.frequency}
              onChange={(val) => setFormData({ ...formData, frequency: val })}
              options={PAY_FREQUENCIES.map(f => ({ label: f, value: f }))}
            />
            <Input
              label="Next Pay Date"
              type="date"
              value={formData.nextPayDate}
              onChange={(e) => setFormData({ ...formData, nextPayDate: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button
                label="Save"
                onClick={saveIncome}
                style={{ flex: 1, background: t.gold, color: t.bg }}
              />
              <Button
                label="Cancel"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: t.card,
                  color: t.text,
                  border: `1px solid ${t.border}`
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// BILL BOSS SCREEN
// ============================================================================

export function BillBossScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    frequency: 'monthly',
    dueDate: '',
    paid: false
  });

  const today = getToday();

  const filteredBills = useMemo(() => {
    let bills = data.bills;
    if (filterTab === 'unpaid') {
      bills = bills.filter(b => !b.paid);
    } else if (filterTab === 'paid') {
      bills = bills.filter(b => b.paid);
    }
    return bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [data.bills, filterTab]);

  const overdueBills = useMemo(() => {
    return data.bills.filter(b => !b.paid && new Date(b.dueDate) < new Date(today));
  }, [data.bills, today]);

  const openModal = (bill = null) => {
    if (bill) {
      setEditingId(bill.id);
      setFormData(bill);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        amount: '',
        category: '',
        frequency: 'monthly',
        dueDate: '',
        paid: false
      });
    }
    setShowModal(true);
  };

  const saveBill = () => {
    if (!formData.name || !formData.amount || !formData.dueDate) return;

    if (editingId) {
      setData({
        ...data,
        bills: data.bills.map(b =>
          b.id === editingId ? { ...b, ...formData } : b
        )
      });
    } else {
      setData({
        ...data,
        bills: [...data.bills, { ...formData, id: generateId() }]
      });
    }

    setShowModal(false);
    setFormData({
      name: '',
      amount: '',
      category: '',
      frequency: 'monthly',
      dueDate: '',
      paid: false
    });
    setEditingId(null);
  };

  const deleteBill = (id) => {
    setData({
      ...data,
      bills: data.bills.filter(b => b.id !== id)
    });
  };

  const togglePaid = (id) => {
    setData({
      ...data,
      bills: data.bills.map(b =>
        b.id === id ? { ...b, paid: !b.paid } : b
      )
    });
  };

  const getBillStatus = (bill) => {
    if (bill.paid) return { label: 'Paid', color: t.success };
    const daysLeft = daysUntil(bill.dueDate, today);
    if (daysLeft < 0) return { label: 'Overdue', color: t.danger };
    if (daysLeft <= 3) return { label: 'Due Soon', color: t.warning };
    return { label: 'Upcoming', color: t.gold };
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      <SectionHeader title="Bill Boss" />

      {/* Overdue Alert */}
      {overdueBills.length > 0 && (
        <Card
          style={{
            background: t.dangerBg,
            border: `2px solid ${t.danger}`,
            marginBottom: '20px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: t.danger }}>
            {overdueBills.length} Overdue Bill{overdueBills.length !== 1 ? 's' : ''}
          </p>
          {overdueBills.slice(0, 2).map(bill => (
            <p key={bill.id} style={{ margin: '4px 0', fontSize: '12px', color: t.text }}>
              {bill.name} - {formatCurrency(bill.amount)}
            </p>
          ))}
        </Card>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: 'All', value: 'all' },
          { label: 'Unpaid', value: 'unpaid' },
          { label: 'Paid', value: 'paid' }
        ].map(tab => (
          <Button
            key={tab.value}
            label={tab.label}
            onClick={() => setFilterTab(tab.value)}
            style={{
              flex: 1,
              background: filterTab === tab.value ? t.gold : t.card,
              color: filterTab === tab.value ? t.bg : t.text,
              border: `1px solid ${t.border}`
            }}
          />
        ))}
      </div>

      {/* Bills List */}
      <div style={{ marginBottom: '20px' }}>
        {filteredBills.length > 0 ? (
          filteredBills.map(bill => {
            const status = getBillStatus(bill);
            return (
              <Card
                key={bill.id}
                style={{
                  marginBottom: '12px',
                  opacity: bill.paid ? 0.6 : 1,
                  borderLeft: `4px solid ${status.color}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text, textDecoration: bill.paid ? 'line-through' : 'none' }}>
                      {bill.name}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: t.textSecondary }}>
                      Due {formatDate(bill.dueDate)}
                    </p>
                    {bill.category && (
                      <Badge label={bill.category} variant="default" />
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>
                      {formatCurrency(bill.amount)}
                    </p>
                    <Badge label={status.label} variant={status.color === t.danger ? 'danger' : status.color === t.warning ? 'warning' : 'success'} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    label={bill.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    onClick={() => togglePaid(bill.id)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: bill.paid ? t.inputBg : t.successBg,
                      color: bill.paid ? t.text : t.success,
                      border: `1px solid ${bill.paid ? t.border : t.success}`
                    }}
                  />
                  <Button
                    label="Edit"
                    onClick={() => openModal(bill)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: t.inputBg,
                      color: t.text,
                      border: `1px solid ${t.border}`
                    }}
                  />
                  <Button
                    label="Delete"
                    onClick={() => deleteBill(bill.id)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: t.dangerBg,
                      color: t.danger,
                      border: `1px solid ${t.danger}`
                    }}
                  />
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No bills"
            description={filterTab === 'all' ? 'Add your first bill' : `No ${filterTab} bills`}
          />
        )}
      </div>

      {/* Add Button */}
      <Button
        label="+ Add Bill"
        onClick={() => openModal()}
        style={{
          width: '100%',
          background: t.gold,
          color: t.bg,
          padding: '12px',
          fontWeight: 'bold'
        }}
      />

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Bill' : 'Add Bill'}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Bill Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Electric Bill"
            />
            <Input
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
              placeholder="0.00"
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              options={[
                { label: 'Select category', value: '' },
                ...BILL_CATEGORIES.map(cat => ({ label: cat, value: cat }))
              ]}
            />
            <Select
              label="Frequency"
              value={formData.frequency}
              onChange={(val) => setFormData({ ...formData, frequency: val })}
              options={PAY_FREQUENCIES.map(f => ({ label: f, value: f }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            <Toggle
              label="Paid"
              checked={formData.paid}
              onChange={(checked) => setFormData({ ...formData, paid: checked })}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button
                label="Save"
                onClick={saveBill}
                style={{ flex: 1, background: t.gold, color: t.bg }}
              />
              <Button
                label="Cancel"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: t.card,
                  color: t.text,
                  border: `1px solid ${t.border}`
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// EXPENSE CORE SCREEN
// ============================================================================

export function ExpenseCoreScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    date: ''
  });

  const today = getToday();

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    data.expenses.forEach(exp => {
      const cat = exp.category || 'Other';
      if (!breakdown[cat]) {
        breakdown[cat] = 0;
      }
      breakdown[cat] += exp.amount;
    });
    return Object.entries(breakdown)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: data.expenses.length > 0
          ? (amount / data.expenses.reduce((sum, e) => sum + e.amount, 0)) * 100
          : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data.expenses]);

  const totalExpenses = useMemo(() => {
    return data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [data.expenses]);

  const openModal = (expense = null) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData(expense);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        amount: '',
        category: '',
        date: today
      });
    }
    setShowModal(true);
  };

  const saveExpense = () => {
    if (!formData.name || !formData.amount || !formData.date) return;

    if (editingId) {
      setData({
        ...data,
        expenses: data.expenses.map(exp =>
          exp.id === editingId ? { ...exp, ...formData } : exp
        )
      });
    } else {
      setData({
        ...data,
        expenses: [...data.expenses, { ...formData, id: generateId() }]
      });
    }

    setShowModal(false);
    setFormData({
      name: '',
      amount: '',
      category: '',
      date: today
    });
    setEditingId(null);
  };

  const deleteExpense = (id) => {
    setData({
      ...data,
      expenses: data.expenses.filter(exp => exp.id !== id)
    });
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      <SectionHeader title="Expense Core" />

      {/* Total Expenses */}
      <Card style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: t.textSecondary }}>Total Expenses</p>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: t.danger }}>
          {formatCurrency(totalExpenses)}
        </p>
      </Card>

      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <Button
          label="List"
          onClick={() => setViewMode('list')}
          style={{
            flex: 1,
            background: viewMode === 'list' ? t.gold : t.card,
            color: viewMode === 'list' ? t.bg : t.text,
            border: `1px solid ${t.border}`
          }}
        />
        <Button
          label="Categories"
          onClick={() => setViewMode('categories')}
          style={{
            flex: 1,
            background: viewMode === 'categories' ? t.gold : t.card,
            color: viewMode === 'categories' ? t.bg : t.text,
            border: `1px solid ${t.border}`
          }}
        />
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ marginBottom: '20px' }}>
          {data.expenses.length > 0 ? (
            data.expenses
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(expense => (
                <Card
                  key={expense.id}
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>
                      {expense.name}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>
                        {formatShortDate(expense.date)}
                      </p>
                      {expense.category && (
                        <Badge label={expense.category} variant="default" />
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.danger }}>
                      {formatCurrency(expense.amount)}
                    </p>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        label="Edit"
                        onClick={() => openModal(expense)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: t.inputBg,
                          color: t.text,
                          border: `1px solid ${t.border}`
                        }}
                      />
                      <Button
                        label="Delete"
                        onClick={() => deleteExpense(expense.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: t.dangerBg,
                          color: t.danger,
                          border: `1px solid ${t.danger}`
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))
          ) : (
            <EmptyState title="No expenses" description="Log your first expense" />
          )}
        </div>
      )}

      {/* Categories View */}
      {viewMode === 'categories' && (
        <div style={{ marginBottom: '20px' }}>
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((cat, idx) => (
              <Card key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontWeight: '600', color: t.text }}>{cat.category}</p>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: t.text }}>
                      {formatCurrency(cat.amount)}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: t.textSecondary }}>
                      {cat.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <ProgressBar
                  value={cat.amount}
                  max={Math.max(...categoryBreakdown.map(c => c.amount))}
                  color={t.danger}
                />
              </Card>
            ))
          ) : (
            <EmptyState title="No expense categories" description="Log expenses to see breakdown" />
          )}
        </div>
      )}

      {/* Add Button */}
      <Button
        label="+ Add Expense"
        onClick={() => openModal()}
        style={{
          width: '100%',
          background: t.gold,
          color: t.bg,
          padding: '12px',
          fontWeight: 'bold'
        }}
      />

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Expense' : 'Add Expense'}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Description"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Coffee at cafe"
            />
            <Input
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
              placeholder="0.00"
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              options={[
                { label: 'Select category', value: '' },
                ...EXPENSE_CATEGORIES.map(cat => ({ label: cat, value: cat }))
              ]}
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button
                label="Save"
                onClick={saveExpense}
                style={{ flex: 1, background: t.gold, color: t.bg }}
              />
              <Button
                label="Cancel"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: t.card,
                  color: t.text,
                  border: `1px solid ${t.border}`
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
import React, { useContext, useState, useMemo } from 'react';
import {
  Card, Button, Input, Select, Toggle, ProgressBar, Badge, StatusDot,
  EmptyState, Modal, SectionHeader, Icon, TabBar
} from './orca-part2';
import { ThemeContext, THEMES } from './orca-part1';
import {
  formatCurrency, formatDate, formatShortDate, daysUntil, addDays,
  getToday, getWeekStart, getWeekEnd, generateId, percentage,
  frequencyToWeekly, frequencyToMonthly, calculateWeeklyIncome,
  calculateWeeklyBillReserve, calculateDueDateAwareReserve,
  calculatePriorityFirstReserve, calculateWeeklyAllocation
} from './orca-part1';
import {
  PAY_FREQUENCIES, BILL_CATEGORIES, EXPENSE_CATEGORIES,
  SAVINGS_PRESETS, SPLIT_MODES, PRIORITY_ORDER
} from './orca-part1';

// ============================================================================
// CHECK SPITTER SCREEN - Paycheck Splitting with Multiple Strategies
// ============================================================================

export function CheckSpitterScreen({ data, setData, allocation }) {
  const t = useContext(ThemeContext);
  const today = getToday();

  const splitMode = data.splitMode || 'equal';

  // Calculate allocations based on split mode
  const calculateAllocation = useMemo(() => {
    return calculateWeeklyAllocation(
      data.incomeSources || [],
      data.bills || [],
      data.savingsGoals || [],
      splitMode,
      data.user?.nextPayday || addDays(today, 7)
    );
  }, [data.incomeSources, data.bills, data.savingsGoals, splitMode, data.user?.nextPayday, today]);

  const allocation_info = calculateAllocation;

  // Get bill breakdown for reserve
  const billBreakdown = useMemo(() => {
    const bills = (data.bills || []).filter(b => b.status !== 'paid');
    if (splitMode === 'due_date') {
      return bills.map(bill => ({
        ...bill,
        weeklyAmount: frequencyToWeekly(bill.amount, bill.frequency || 'monthly'),
        daysUntilDue: daysUntil(bill.dueDate),
        isDueSoon: daysUntil(bill.dueDate) >= 0 && daysUntil(bill.dueDate) <= daysUntil(data.user?.nextPayday || addDays(today, 7)),
        fullAmount: daysUntil(bill.dueDate) >= 0 && daysUntil(bill.dueDate) <= daysUntil(data.user?.nextPayday || addDays(today, 7)) ? bill.amount : frequencyToWeekly(bill.amount, bill.frequency || 'monthly'),
      }));
    }
    return bills.map(bill => ({
      ...bill,
      weeklyAmount: frequencyToWeekly(bill.amount, bill.frequency || 'monthly'),
      daysUntilDue: daysUntil(bill.dueDate),
      fullAmount: frequencyToWeekly(bill.amount, bill.frequency || 'monthly'),
    }));
  }, [data.bills, splitMode, data.user?.nextPayday, today]);

  // Get savings breakdown
  const savingsBreakdown = useMemo(() => {
    return (data.savingsGoals || []).filter(g => g.isActive !== false).map(goal => ({
      ...goal,
      weeklyAmount: goal.contributionType === 'fixed' ? goal.contributionValue :
                    goal.contributionType === 'percentage' ? (allocation_info.totalIncome * (goal.contributionValue || 0) / 100) : 0,
    }));
  }, [data.savingsGoals, allocation_info.totalIncome]);

  // Split mode change handler
  const handleSplitModeChange = (mode) => {
    setData({ ...data, splitMode: mode });
  };

  const isPremium = data.user?.premiumStatus || data.user?.subscriptionStatus === 'trial';

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      {/* Split Mode Selector - Radio Cards with Gold Accents */}
      <SectionHeader
        title="Paycheck Splitter"
        subtitle="Choose how to allocate your paycheck"
      />

      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        {SPLIT_MODES.map(mode => (
          <div
            key={mode.value}
            onClick={() => handleSplitModeChange(mode.value)}
            style={{
              background: splitMode === mode.value ? t.goldBg : t.card,
              border: `2px solid ${splitMode === mode.value ? t.gold : t.border}`,
              borderRadius: 14,
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: `2px solid ${splitMode === mode.value ? t.gold : t.border}`,
                background: splitMode === mode.value ? t.gold : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}>
                {splitMode === mode.value && <Icon name="check" size={14} color="#000" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>
                    {mode.label}
                  </h3>
                  {mode.value !== 'equal' && isPremium && (
                    <Badge color={t.gold}>Premium</Badge>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>
                  {mode.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Income Summary - Gold Gradient Card */}
      <Card style={{
        background: t.gradientPrimary,
        color: '#000',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
            This Week's Income
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            {formatCurrency(allocation_info.totalIncome)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>Period</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {formatShortDate(allocation_info.periodStart)} – {formatShortDate(allocation_info.periodEnd)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>Next Payday</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {daysUntil(data.user?.nextPayday || addDays(today, 7))} days
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Visual Split Bar - Three Segments */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>
          Weekly Allocation
        </div>
        <div style={{ display: 'flex', gap: 4, height: 40, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          {/* Bills - Danger Red */}
          <div
            style={{
              flex: allocation_info.reservedForBills,
              background: t.danger,
              position: 'relative',
              minWidth: '2px',
            }}
            title={`Bills: ${formatCurrency(allocation_info.reservedForBills)}`}
          />
          {/* Savings - Gold */}
          <div
            style={{
              flex: allocation_info.reservedForSavings,
              background: t.gold,
              position: 'relative',
              minWidth: '2px',
            }}
            title={`Savings: ${formatCurrency(allocation_info.reservedForSavings)}`}
          />
          {/* Spending - Success Green */}
          <div
            style={{
              flex: allocation_info.safeToSpendWeekly,
              background: t.success,
              position: 'relative',
              minWidth: '2px',
            }}
            title={`Safe to Spend: ${formatCurrency(allocation_info.safeToSpendWeekly)}`}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: t.dangerBg, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>Bills</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.danger }}>
              {formatCurrency(allocation_info.reservedForBills)}
            </div>
          </div>
          <div style={{ background: t.goldBg, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>Savings</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.gold }}>
              {formatCurrency(allocation_info.reservedForSavings)}
            </div>
          </div>
          <div style={{ background: t.successBg, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>Spending</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.success }}>
              {formatCurrency(allocation_info.safeToSpendWeekly)}
            </div>
          </div>
        </div>
      </div>

      {/* Safe to Spend Cards - Weekly and Daily */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 8 }}>
            Safe This Week
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.success, marginBottom: 4 }}>
            {formatCurrency(allocation_info.safeToSpendWeekly)}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            for expenses & discretionary
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 8 }}>
            Safe Today
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.success, marginBottom: 4 }}>
            {formatCurrency(allocation_info.safeToSpendDaily)}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            daily average budget
          </div>
        </Card>
      </div>

      {/* Shortfall Warning */}
      {allocation_info.shortfall > 0 && (
        <Card style={{
          background: t.dangerBg,
          border: `1px solid ${t.danger}`,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="alert-circle" size={20} color={t.danger} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.danger, marginBottom: 4 }}>
                Budget Shortfall
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary }}>
                You're projected to be <strong>{formatCurrency(allocation_info.shortfall)}</strong> short this week.
                Consider reducing discretionary spending or deferring non-essential purchases.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bill-by-Bill Reserve Breakdown Table */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Bill Reserves"
          subtitle={`${billBreakdown.length} bills to cover`}
        />

        {billBreakdown.length === 0 ? (
          <EmptyState
            icon="✓"
            title="All Bills Paid"
            message="No upcoming bills to allocate for."
          />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {billBreakdown.map(bill => (
              <Card key={bill.id} style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                      {bill.name}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      {bill.category} · Due {formatShortDate(bill.dueDate)} ({bill.daysUntilDue} days)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                      {formatCurrency(bill.fullAmount)}
                    </div>
                    {bill.daysUntilDue <= daysUntil(data.user?.nextPayday || addDays(today, 7)) && bill.daysUntilDue >= 0 && (
                      <Badge color={t.warning}>Due Soon</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Savings Contributions Breakdown */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Savings Allocations"
          subtitle={`${savingsBreakdown.length} goals being funded`}
        />

        {savingsBreakdown.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No Savings Goals"
            message="Create your first savings goal to start building wealth."
            action={<Button variant="primary" onClick={() => {}} size="sm">Create Goal</Button>}
          />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {savingsBreakdown.map(goal => (
              <Card key={goal.id} style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                      {goal.name}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      {goal.contributionType === 'fixed' ? 'Fixed amount' : `${goal.contributionValue}% of income`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>
                      {formatCurrency(goal.weeklyAmount)}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      per week
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SAVINGS GOALS SCREEN - Goal Tracking and Management
// ============================================================================

export function SavingsGoalsScreen({ data, setData, allocation }) {
  const t = useContext(ThemeContext);
  const today = getToday();

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Form state for modal
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    contributionType: 'fixed',
    contributionValue: 0,
  });

  // Calculate total saved
  const totalSaved = useMemo(() => {
    return (data.savingsGoals || []).reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
  }, [data.savingsGoals]);

  // Calculate total target
  const totalTarget = useMemo(() => {
    return (data.savingsGoals || []).reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
  }, [data.savingsGoals]);

  // Enhanced goals with calculations
  const goalsWithMetrics = useMemo(() => {
    const weeklyIncome = calculateWeeklyIncome(data.incomeSources || []);
    return (data.savingsGoals || []).map(goal => {
      const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
      const daysLeft = Math.max(0, daysUntil(goal.targetDate));
      const weeksLeft = Math.max(1, daysLeft / 7);
      const neededPerWeek = remaining / weeksLeft;

      // Determine actual weekly contribution
      const actualWeekly = goal.contributionType === 'fixed' ? goal.contributionValue :
                           goal.contributionType === 'percentage' ? (weeklyIncome * (goal.contributionValue || 0) / 100) : 0;

      const onTrack = actualWeekly >= neededPerWeek * 0.95; // 95% threshold
      const progressPct = percentage(goal.currentAmount || 0, goal.targetAmount || 0);

      return {
        ...goal,
        remaining,
        daysLeft,
        weeksLeft,
        neededPerWeek,
        actualWeekly,
        onTrack,
        progressPct,
      };
    });
  }, [data.savingsGoals, data.incomeSources]);

  // Preset goals
  const handleAddPreset = (presetName) => {
    const newGoal = {
      id: generateId(),
      name: presetName,
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: addDays(today, 90),
      contributionType: 'fixed',
      contributionValue: 25,
      isActive: true,
    };
    setData({
      ...data,
      savingsGoals: [...(data.savingsGoals || []), newGoal],
    });
  };

  // Open goal modal
  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal.id);
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount || 0,
        currentAmount: goal.currentAmount || 0,
        targetDate: goal.targetDate || '',
        contributionType: goal.contributionType || 'fixed',
        contributionValue: goal.contributionValue || 0,
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        targetDate: '',
        contributionType: 'fixed',
        contributionValue: 0,
      });
    }
    setShowGoalModal(true);
  };

  // Save goal
  const handleSaveGoal = () => {
    if (!formData.name || !formData.targetAmount) return;

    if (editingGoal) {
      // Update existing
      setData({
        ...data,
        savingsGoals: (data.savingsGoals || []).map(g =>
          g.id === editingGoal
            ? { ...g, ...formData }
            : g
        ),
      });
    } else {
      // Create new
      const newGoal = {
        id: generateId(),
        ...formData,
        isActive: true,
      };
      setData({
        ...data,
        savingsGoals: [...(data.savingsGoals || []), newGoal],
      });
    }

    setShowGoalModal(false);
  };

  // Delete goal
  const handleDeleteGoal = (goalId) => {
    setData({
      ...data,
      savingsGoals: (data.savingsGoals || []).filter(g => g.id !== goalId),
    });
  };

  // Quick add contribution
  const handleQuickContribution = (goalId, amount) => {
    setData({
      ...data,
      savingsGoals: (data.savingsGoals || []).map(g =>
        g.id === goalId
          ? { ...g, currentAmount: (g.currentAmount || 0) + amount }
          : g
      ),
    });
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      {/* Total Saved Summary - Gold Gradient */}
      <Card style={{
        background: t.gradientPrimary,
        color: '#000',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
            Total Saved
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
            {formatCurrency(totalSaved)}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
            of {formatCurrency(totalTarget)} goal
          </div>
          <ProgressBar
            value={totalSaved}
            max={totalTarget}
            color="#000"
            height={6}
          />
        </div>
      </Card>

      {/* Section Header with Add Button */}
      <SectionHeader
        title="Your Goals"
        subtitle={`${goalsWithMetrics.length} active goal${goalsWithMetrics.length !== 1 ? 's' : ''}`}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenGoalModal()}
          >
            <Icon name="plus" size={16} />
            Add Goal
          </Button>
        }
      />

      {/* Individual Goal Cards */}
      {goalsWithMetrics.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No Savings Goals Yet"
          message="Create your first goal to start saving toward something meaningful."
          action={
            <Button
              variant="primary"
              onClick={() => handleOpenGoalModal()}
            >
              Create Your First Goal
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {goalsWithMetrics.map(goal => (
            <Card key={goal.id} style={{ padding: 16, position: 'relative' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                    {goal.name}
                  </h3>
                  <div style={{ fontSize: 12, color: t.textMuted }}>
                    Target: {formatShortDate(goal.targetDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {goal.onTrack ? (
                    <Badge color={t.success}>On Track</Badge>
                  ) : (
                    <Badge color={t.warning}>Behind</Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 12 }}>
                <ProgressBar
                  value={goal.currentAmount}
                  max={goal.targetAmount}
                  color={goal.onTrack ? t.success : t.warning}
                />
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 2 }}>
                    Saved
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                    {formatCurrency(goal.currentAmount)}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>
                    {goal.progressPct}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 2 }}>
                    Remaining
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                    {formatCurrency(goal.remaining)}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>
                    {goal.daysLeft} days left
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 2 }}>
                    Per Week
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>
                    {formatCurrency(goal.actualWeekly)}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>
                    Need: {formatCurrency(goal.neededPerWeek)}
                  </div>
                </div>
              </div>

              {/* Quick Contribution Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickContribution(goal.id, 10)}
                >
                  +$10
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickContribution(goal.id, 25)}
                >
                  +$25
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickContribution(goal.id, goal.actualWeekly)}
                >
                  +Week
                </Button>
              </div>

              {/* Edit/Delete Actions */}
              <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenGoalModal(goal)}
                  style={{ flex: 1 }}
                >
                  <Icon name="edit" size={14} />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteGoal(goal.id)}
                  style={{ flex: 1 }}
                >
                  <Icon name="trash" size={14} />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Goal Preset Grid */}
      <SectionHeader
        title="Quick Start Goals"
        subtitle="Create a pre-configured goal in seconds"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {SAVINGS_PRESETS.filter(p => p !== 'Custom').map(preset => (
          <Button
            key={preset}
            variant="secondary"
            onClick={() => handleAddPreset(preset)}
            style={{
              padding: 12,
              height: 'auto',
              flexDirection: 'column',
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Icon name="savings" size={16} color={t.gold} />
            {preset}
          </Button>
        ))}
      </div>

      {/* Goal Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={editingGoal ? 'Edit Goal' : 'Create Goal'}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <Input
            label="Goal Name"
            value={formData.name}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="e.g., Emergency Fund"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Target Amount"
              type="number"
              value={formData.targetAmount}
              onChange={v => setFormData({ ...formData, targetAmount: parseFloat(v) || 0 })}
              prefix="$"
              required
            />

            <Input
              label="Current Amount"
              type="number"
              value={formData.currentAmount}
              onChange={v => setFormData({ ...formData, currentAmount: parseFloat(v) || 0 })}
              prefix="$"
            />
          </div>

          <Input
            label="Target Date"
            type="date"
            value={formData.targetDate}
            onChange={v => setFormData({ ...formData, targetDate: v })}
            required
          />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>
              Contribution Type
            </label>
            <TabBar
              tabs={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
              ]}
              active={formData.contributionType}
              onSelect={type => setFormData({ ...formData, contributionType: type })}
            />
          </div>

          <Input
            label={formData.contributionType === 'percentage' ? 'Percentage of Income' : 'Weekly Contribution'}
            type="number"
            value={formData.contributionValue}
            onChange={v => setFormData({ ...formData, contributionValue: parseFloat(v) || 0 })}
            suffix={formData.contributionType === 'percentage' ? '%' : '/week'}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowGoalModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveGoal}
            >
              {editingGoal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Alert Circle Icon (fallback if not in part2)
if (!Icon.prototype.hasOwnProperty('alert-circle')) {
  Icon.defaultProps = { ...Icon.defaultProps };
}
import React, { useState, useContext } from 'react';
import { ThemeContext } from './context/ThemeContext';
import {
  Card,
  Button,
  Input,
  Select,
  Toggle,
  ProgressBar,
  Badge,
  EmptyState,
  Modal,
  SectionHeader,
  Icon,
} from './components';
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  daysUntil,
  addDays,
  getToday,
  generateId,
  percentage,
} from './utils';
import {
  getCreditScoreRange,
  generateCreditInsights,
  CREDIT_SCORE_RANGES,
} from './utils/creditUtils';

// ============================================================================
// RENT REPORTER SCREEN
// ============================================================================

export function RentReporterScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupForm, setSetupForm] = useState({
    landlordName: '',
    rentAmount: '',
    leaseStartDate: getToday(),
    paymentMethod: 'bank_transfer',
  });

  const rentData = data.rentReporter || {
    enabled: false,
    landlordName: '',
    rentAmount: 0,
    leaseStartDate: '',
    paymentMethod: 'bank_transfer',
  };

  const rentPayments = data.rentPayments || [];
  const reportedCount = rentPayments.filter((p) => p.reported).length;
  const totalPayments = rentPayments.length;

  const handleEnableReporting = () => {
    if (!rentData.landlordName) {
      setShowSetupModal(true);
    } else {
      setData((prev) => ({
        ...prev,
        rentReporter: {
          ...prev.rentReporter,
          enabled: !prev.rentReporter.enabled,
        },
      }));
    }
  };

  const handleSaveSetup = () => {
    setData((prev) => ({
      ...prev,
      rentReporter: {
        ...rentData,
        ...setupForm,
        enabled: true,
      },
    }));
    setShowSetupModal(false);
  };

  const handleReportPayment = (paymentId) => {
    setData((prev) => ({
      ...prev,
      rentPayments: prev.rentPayments.map((p) =>
        p.id === paymentId
          ? { ...p, reported: true, reportedDate: getToday() }
          : p
      ),
    }));
  };

  const creditImpact = Math.min(reportedCount * 2, 40);

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Card */}
      <Card
        style={{
          background: t.gradientPrimary,
          padding: '32px',
          marginBottom: '24px',
          borderRadius: '16px',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <Icon name="rent" size={48} color={t.gold} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>
              Build Credit with Rent Reporting
            </h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.95 }}>
              Report your rent payments to all 3 credit bureaus and build your credit score.
              On-time rent can boost your score 20-40 points.
            </p>
          </div>
        </div>
      </Card>

      {/* Status Card */}
      <Card
        style={{
          padding: '24px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              color: t.textSecondary,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Status
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: rentData.enabled ? t.success : t.textMuted,
              }}
            />
            {rentData.enabled ? 'Active' : 'Inactive'}
          </div>
          <Toggle
            checked={rentData.enabled}
            onChange={handleEnableReporting}
            style={{ marginTop: '12px' }}
          />
        </div>

        {rentData.landlordName && (
          <>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: t.textSecondary,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Landlord
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {rentData.landlordName}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: t.textSecondary,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Monthly Rent
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {formatCurrency(rentData.rentAmount)}
              </div>
            </div>
          </>
        )}

        {!rentData.landlordName && (
          <Button
            onClick={() => setShowSetupModal(true)}
            style={{
              gridColumn: 'span 1',
              background: t.goldBg,
              color: t.gold,
            }}
          >
            Setup Reporting
          </Button>
        )}
      </Card>

      {/* Statistics */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <SectionHeader title="Reporting Progress" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            marginTop: '20px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: t.gold,
                marginBottom: '4px',
              }}
            >
              {reportedCount}
            </div>
            <div style={{ fontSize: '13px', color: t.textSecondary }}>
              Payments Reported
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: t.gold,
                marginBottom: '4px',
              }}
            >
              {totalPayments}
            </div>
            <div style={{ fontSize: '13px', color: t.textSecondary }}>
              Total Payments
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: t.success,
                marginBottom: '4px',
              }}
            >
              +{creditImpact}
            </div>
            <div style={{ fontSize: '13px', color: t.textSecondary }}>
              Est. Score Impact
            </div>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      {rentPayments.length > 0 && (
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionHeader title="Payment History" />
          <div style={{ marginTop: '20px' }}>
            {rentPayments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  padding: '16px',
                  background: t.bgSecondary,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    {payment.month}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: t.textSecondary,
                    }}
                  >
                    {payment.status === 'paid'
                      ? `Paid: ${formatDate(payment.datePaid)}`
                      : 'Upcoming payment'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      {formatCurrency(payment.amount)}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: payment.reported ? t.success : t.warning,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {payment.reported ? (
                        <>
                          <Icon name="check" size={14} />
                          Reported
                        </>
                      ) : (
                        'Pending Report'
                      )}
                    </div>
                  </div>

                  {payment.status === 'paid' && !payment.reported && (
                    <Button
                      size="sm"
                      onClick={() => handleReportPayment(payment.id)}
                      style={{
                        background: t.gold,
                        color: '#000',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Report
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <Modal onClose={() => setShowSetupModal(false)}>
          <div style={{ padding: '32px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>
              Setup Rent Reporting
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: t.textSecondary,
                }}
              >
                Landlord Name
              </label>
              <Input
                value={setupForm.landlordName}
                onChange={(e) =>
                  setSetupForm({
                    ...setupForm,
                    landlordName: e.target.value,
                  })
                }
                placeholder="Enter landlord name"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: t.textSecondary,
                }}
              >
                Monthly Rent Amount
              </label>
              <Input
                value={setupForm.rentAmount}
                onChange={(e) =>
                  setSetupForm({
                    ...setupForm,
                    rentAmount: e.target.value,
                  })
                }
                placeholder="0.00"
                type="number"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: t.textSecondary,
                }}
              >
                Lease Start Date
              </label>
              <Input
                value={setupForm.leaseStartDate}
                onChange={(e) =>
                  setSetupForm({
                    ...setupForm,
                    leaseStartDate: e.target.value,
                  })
                }
                type="date"
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: t.textSecondary,
                }}
              >
                Payment Method
              </label>
              <Select
                value={setupForm.paymentMethod}
                onChange={(e) =>
                  setSetupForm({
                    ...setupForm,
                    paymentMethod: e.target.value,
                  })
                }
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
              </Select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                onClick={() => setShowSetupModal(false)}
                style={{ background: t.bgSecondary }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSetup}
                style={{
                  background: t.gold,
                  color: '#000',
                  flex: 1,
                }}
              >
                Enable Rent Reporting
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// CREDIT SCORE SCREEN
// ============================================================================

function CreditScoreGauge({ score }) {
  const t = useContext(ThemeContext);
  const range = getCreditScoreRange(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - ((Math.max(300, Math.min(850, score)) - 300) / 550) * circumference;

  return (
    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
      <svg
        width="200"
        height="200"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Background ring */}
        <circle
          cx="100"
          cy="100"
          r="45"
          fill="none"
          stroke={t.bgSecondary}
          strokeWidth="8"
        />
        {/* Score ring */}
        <circle
          cx="100"
          cy="100"
          r="45"
          fill="none"
          stroke={range.color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '100px 100px',
            transition: 'stroke-dashoffset 0.6s ease',
          }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: '44px',
            fontWeight: 800,
            color: range.color,
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: t.textSecondary,
            marginTop: '4px',
          }}
        >
          {range.label}
        </div>
      </div>
    </div>
  );
}

function SimpleLineChart({ data, height = 200 }) {
  const t = useContext(ThemeContext);
  if (!data || data.length === 0) return null;

  const minScore = Math.min(...data.map((d) => d.score));
  const maxScore = Math.max(...data.map((d) => d.score));
  const range = Math.max(maxScore - minScore, 50);

  const width = Math.max(300, data.length * 40);
  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * graphWidth + padding;
    const y =
      height -
      padding -
      ((d.score - minScore) / range) * graphHeight;
    return `${x},${y}`;
  });

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = height - padding - frac * graphHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={t.bgSecondary}
              strokeWidth="1"
            />
          );
        })}

        {/* Line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={t.gold}
          strokeWidth="3"
        />

        {/* Points */}
        {points.map((point, i) => {
          const [x, y] = point.split(',').map(Number);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={t.gold}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function CreditScoreScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorAmount, setSimulatorAmount] = useState(500);

  const creditScore = data.creditScore || {
    score: 720,
    history: [],
    onTimePayments: 95,
    utilization: 25,
    accountAge: 5,
    creditMix: 'Good',
    inquiries: 1,
  };

  const creditFactors = [
    {
      name: 'Payment History',
      percentage: 35,
      value: creditScore.onTimePayments,
      unit: '%',
    },
    {
      name: 'Credit Utilization',
      percentage: 30,
      value: creditScore.utilization,
      unit: '%',
    },
    {
      name: 'Account Age',
      percentage: 15,
      value: creditScore.accountAge,
      unit: ' years',
    },
    {
      name: 'Credit Mix',
      percentage: 10,
      value: creditScore.creditMix,
    },
    {
      name: 'Hard Inquiries',
      percentage: 10,
      value: creditScore.inquiries,
      unit: ' recent',
    },
  ];

  const simulatedScore = Math.min(
    850,
    creditScore.score + Math.floor(simulatorAmount / 100)
  );

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Big Score Display */}
      <Card
        style={{
          padding: '48px 32px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CreditScoreGauge score={creditScore.score} />
        </div>

        <div style={{ marginTop: '32px' }}>
          <div style={{ color: t.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
            Your Credit Score
          </div>
          <div
            style={{
              fontSize: '18px',
              color: t.gold,
              fontWeight: 600,
            }}
          >
            {getCreditScoreRange(creditScore.score).label}
          </div>
        </div>
      </Card>

      {/* Score History */}
      {creditScore.history && creditScore.history.length > 0 && (
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionHeader title="Score History" />
          <SimpleLineChart data={creditScore.history} />
        </Card>
      )}

      {/* Credit Factors */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <SectionHeader title="Credit Factors" />

        <div style={{ marginTop: '24px' }}>
          {creditFactors.map((factor, i) => (
            <div key={i} style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                    {factor.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: t.textSecondary,
                    }}
                  >
                    {factor.percentage}% of score
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: t.gold,
                  }}
                >
                  {factor.value}
                  {factor.unit || ''}
                </div>
              </div>

              {typeof factor.value === 'number' && (
                <ProgressBar
                  value={Math.min(100, factor.value)}
                  max={100}
                  color={t.gold}
                  height={6}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Score Simulator */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <SectionHeader title="Score Simulator" />

        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: t.textSecondary,
              }}
            >
              What if you paid down ${simulatorAmount.toLocaleString()}?
            </label>
            <Input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={simulatorAmount}
              onChange={(e) => setSimulatorAmount(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              {[500, 1000, 2500].map((amt) => (
                <Button
                  key={amt}
                  size="sm"
                  onClick={() => setSimulatorAmount(amt)}
                  style={{
                    background:
                      simulatorAmount === amt ? t.gold : t.bgSecondary,
                    color:
                      simulatorAmount === amt ? '#000' : t.text,
                  }}
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              background: t.bgSecondary,
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: t.textSecondary,
                marginBottom: '8px',
              }}
            >
              Estimated New Score
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: t.success,
                marginBottom: '8px',
              }}
            >
              {simulatedScore}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: t.success,
              }}
            >
              +{simulatedScore - creditScore.score} points
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card style={{ padding: '24px' }}>
        <SectionHeader title="Quick Stats" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            marginTop: '20px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                color: t.textSecondary,
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Total Debt
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {formatCurrency(data.totalDebt || 0)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                color: t.textSecondary,
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Credit Limit
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {formatCurrency(data.creditLimit || 0)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                color: t.textSecondary,
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Utilization
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {creditScore.utilization}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// CREDIT INSIGHTS SCREEN
// ============================================================================

const InsightImpactColors = {
  'Very High': { bg: 'dangerBg', text: 'danger', badge: 'danger' },
  High: { bg: 'warningBg', text: 'warning', badge: 'warning' },
  Medium: { bg: 'goldBg', text: 'gold', badge: 'gold' },
  Low: { bg: 'successBg', text: 'success', badge: 'success' },
};

function InsightCard({ insight, isPremiumUnlocked, index, t }) {
  const isLocked = !isPremiumUnlocked && index >= 2;
  const colors = InsightImpactColors[insight.impact] || InsightImpactColors.Medium;

  return (
    <Card
      style={{
        padding: '24px',
        marginBottom: '16px',
        opacity: isLocked ? 0.6 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isLocked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Icon name="crown" size={24} color={t.gold} style={{ marginBottom: '8px' }} />
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: t.gold,
              }}
            >
              Premium Feature
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <Icon
          name={insight.icon}
          size={32}
          color={t[colors.text]}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {insight.title}
            </h3>
            <Badge
              label={insight.impact}
              style={{
                background: t[colors.bg],
                color: t[colors.text],
                fontSize: '11px',
              }}
            />
          </div>

          <p
            style={{
              margin: '8px 0 12px 0',
              fontSize: '14px',
              color: t.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {insight.message}
          </p>

          <div
            style={{
              padding: '12px',
              background: t.bgSecondary,
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: t.textSecondary,
                marginBottom: '4px',
              }}
            >
              Action:
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {insight.action}
            </div>
          </div>

          {insight.estimatedImpact && (
            <div
              style={{
                fontSize: '12px',
                color: t.success,
                fontWeight: 500,
              }}
            >
              Est. Impact: +{insight.estimatedImpact} points
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CreditInsightsScreen({ data }) {
  const t = useContext(ThemeContext);
  const [showFullList, setShowFullList] = useState(false);

  const creditScore = data.creditScore || {};
  const bills = data.bills || [];
  const rentPayments = data.rentPayments || [];

  const insights = generateCreditInsights(creditScore, bills, rentPayments);
  const isPremium = data.isPremium || false;

  const displayedInsights = showFullList
    ? insights
    : insights.slice(0, 2);

  const hasMoreInsights = insights.length > 2;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Card */}
      <Card
        style={{
          background: t.gradientPrimary,
          padding: '32px',
          marginBottom: '24px',
          borderRadius: '16px',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <Icon name="shield" size={48} color={t.gold} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>
              Your Credit Building Plan
            </h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.95 }}>
              Personalized actions to improve your credit score. We've analyzed your financial
              situation and prioritized these insights by impact.
            </p>
          </div>
        </div>
      </Card>

      {/* Insights List */}
      {insights.length > 0 ? (
        <>
          {displayedInsights.map((insight, i) => (
            <InsightCard
              key={i}
              insight={insight}
              isPremiumUnlocked={isPremium}
              index={i}
              t={t}
            />
          ))}

          {hasMoreInsights && !showFullList && !isPremium && (
            <Card
              style={{
                padding: '24px',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <Icon name="crown" size={32} color={t.gold} style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0' }}>
                Unlock All {insights.length} Insights
              </h3>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: t.textSecondary,
                }}
              >
                Get personalized recommendations for all aspects of your credit profile with our
                premium plan.
              </p>
              <Button
                style={{
                  background: t.gold,
                  color: '#000',
                }}
              >
                Upgrade to Premium
              </Button>
            </Card>
          )}

          {hasMoreInsights && !showFullList && isPremium && (
            <Button
              onClick={() => setShowFullList(true)}
              style={{
                width: '100%',
                marginBottom: '24px',
                background: t.bgSecondary,
              }}
            >
              Show All {insights.length} Insights
            </Button>
          )}
        </>
      ) : (
        <EmptyState
          title="No Insights Yet"
          message="We'll generate personalized insights once we have more data about your credit profile."
        />
      )}

      {/* Action Plan */}
      {insights.length > 0 && (
        <Card style={{ padding: '24px' }}>
          <SectionHeader title="Quick Action Steps" />

          <div style={{ marginTop: '20px' }}>
            {insights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: i < 2 ? '20px' : 0,
                }}
              >
                <div
                  style={{
                    minWidth: '32px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: t.gold,
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {insight.title}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: t.textSecondary,
                    }}
                  >
                    {insight.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useContext, createContext, useMemo, useEffect } from 'react';
import {
  Card, Button, Input, Select, Toggle, ProgressBar, Badge, StatusDot, EmptyState, Modal, TabBar, SectionHeader, Icon, TrialBanner
} from './orca-ui';
import {
  formatCurrency, formatDate, formatShortDate, daysUntil, addDays, getToday, generateId, percentage, frequencyToWeekly, frequencyToMonthly, calculateWeeklyIncome, calculateMonthlyIncome, calculateWeeklyAllocation, calculateBudgetHealth, generateInsights
} from './orca-utils';
import {
  BRAND, PREMIUM_PRICE, TRIAL_DAYS, PAY_FREQUENCIES, THEMES
} from './orca-constants';
import {
  OnboardingScreen, BalanceBookScreen, PayTrackScreen, BillBossScreen, ExpenseCoreScreen, CheckSpitterScreen, SavingsGoalsScreen, RentReporterScreen, CreditScoreScreen, CreditInsightsScreen
} from './orca-screens';
import { createSeedData, createDemoData } from './orca-data';

export const ThemeContext = createContext();

// ============================================================================
// STACK CIRCLE SCREEN - Premium Group Savings
// ============================================================================

export function StackCircleScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [activeGroup, setActiveGroup] = useState(0);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');

  if (!data.subscription?.isPremium) {
    return (
      <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh' }}>
        <div style={{ marginTop: '40px' }}>
          <EmptyState
            icon="crown"
            title="Stack Circle Premium"
            description="Group savings with your crew. Upgrade to access."
          />
          <Button
            label="Upgrade to Premium"
            full
            style={{ marginTop: '20px', backgroundColor: t.gold }}
          />
        </div>
      </div>
    );
  }

  const groups = data.groups || [];
  const group = groups[activeGroup];

  const handleCreateGroup = () => {
    if (newGroupName && newGroupGoal) {
      const newGroup = {
        id: generateId(),
        name: newGroupName,
        goal: parseFloat(newGroupGoal) || 0,
        current: 0,
        members: [{ id: data.userId || 'user1', name: 'You', avatar: '👤', total: 0, weeklyTarget: 0 }],
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        activity: [],
        createdAt: getToday(),
        messages: [],
      };
      setData({
        ...data,
        groups: [...groups, newGroup],
      });
      setNewGroupName('');
      setNewGroupGoal('');
      setShowCreateGroup(false);
    }
  };

  const handleContribute = () => {
    if (group && contributeAmount) {
      const amount = parseFloat(contributeAmount) || 0;
      if (amount > 0) {
        const updatedGroups = [...groups];
        const currentMember = updatedGroups[activeGroup].members[0];
        currentMember.total += amount;
        updatedGroups[activeGroup].current += amount;
        updatedGroups[activeGroup].activity.push({
          id: generateId(),
          type: 'contribution',
          memberName: currentMember.name,
          amount,
          date: getToday(),
        });
        setData({ ...data, groups: updatedGroups });
        setContributeAmount('');
        setShowContribute(false);
      }
    }
  };

  if (!group) {
    return (
      <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh' }}>
        <div style={{ marginTop: '40px' }}>
          <EmptyState
            icon="group"
            title="No Groups Yet"
            description="Create a group to save together with friends."
          />
          <Button
            label="Create Group"
            full
            onClick={() => setShowCreateGroup(true)}
            style={{ marginTop: '20px', backgroundColor: t.gold }}
          />
        </div>
      </div>
    );
  }

  const groupProgress = group.goal > 0 ? (group.current / group.goal) * 100 : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Group Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto' }}>
        {groups.map((g, idx) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(idx)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: idx === activeGroup ? t.gold : t.card,
              color: idx === activeGroup ? '#000' : t.text,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: idx === activeGroup ? '600' : '500',
              whiteSpace: 'nowrap',
            }}
          >
            {g.name}
          </button>
        ))}
        <button
          onClick={() => setShowCreateGroup(true)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: `1px solid ${t.border}`,
            backgroundColor: 'transparent',
            color: t.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + New
        </button>
      </div>

      {/* Group Hero Card */}
      <Card style={{
        background: `linear-gradient(135deg, ${t.gold}, ${t.goldLight})`,
        color: '#000',
        padding: '30px',
        marginBottom: '20px',
        borderRadius: '16px',
      }}>
        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>GROUP GOAL</div>
        <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>{group.name}</div>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
          {formatCurrency(group.current)} of {formatCurrency(group.goal)}
        </div>
        <ProgressBar value={groupProgress} color="#000" />
        <div style={{ fontSize: '12px', marginTop: '12px', opacity: 0.8 }}>
          {Math.round(groupProgress)}% complete • {group.members.length} members
        </div>
      </Card>

      {/* Member Cards */}
      <SectionHeader title="Members" />
      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        {group.members.map((member) => (
          <Card key={member.id} style={{ padding: '16px', backgroundColor: t.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>{member.avatar}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: t.textSecondary }}>
                    Total: {formatCurrency(member.total)}
                  </div>
                </div>
              </div>
              <Badge label={`${member.weeklyTarget ? formatCurrency(member.weeklyTarget) : '-'}/week`} color={t.gold} />
            </div>
          </Card>
        ))}
      </div>

      {/* Activity Feed */}
      <SectionHeader title="Activity" />
      {group.activity && group.activity.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          {group.activity.slice().reverse().map((event) => (
            <Card key={event.id} style={{ padding: '12px', backgroundColor: t.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '4px' }}>
                    {event.memberName} contributed
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.gold }}>
                    +{formatCurrency(event.amount)}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{formatDate(event.date)}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity yet" description="Make a contribution to get started" />
      )}

      {/* Invite Code */}
      <Card style={{ padding: '16px', backgroundColor: t.card, marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>INVITE CODE</div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: t.inputBg,
          fontFamily: 'monospace',
          fontSize: '16px',
          fontWeight: '600',
        }}>
          {group.inviteCode}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.gold }}>
            📋
          </button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <Button
          label="Contribute"
          onClick={() => setShowContribute(true)}
          style={{ backgroundColor: t.gold, color: '#000' }}
        />
        <Button
          label="Messages"
          variant="outline"
          style={{ borderColor: t.gold, color: t.gold }}
        />
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal onClose={() => setShowCreateGroup(false)}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: t.text }}>
              Create Group
            </div>
            <Input
              placeholder="Group name (e.g., Vacation 2025)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <Input
              placeholder="Goal amount"
              type="number"
              value={newGroupGoal}
              onChange={(e) => setNewGroupGoal(e.target.value)}
              style={{ marginBottom: '20px' }}
            />
            <Button
              label="Create"
              full
              onClick={handleCreateGroup}
              style={{ backgroundColor: t.gold, color: '#000', marginBottom: '12px' }}
            />
            <Button
              label="Cancel"
              full
              variant="outline"
              onClick={() => setShowCreateGroup(false)}
              style={{ borderColor: t.border, color: t.text }}
            />
          </div>
        </Modal>
      )}

      {/* Contribute Modal */}
      {showContribute && (
        <Modal onClose={() => setShowContribute(false)}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: t.text }}>
              Contribute to {group.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              {[25, 50, 100, 250].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setContributeAmount(amount.toString())}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: amount.toString() === contributeAmount ? 'none' : `1px solid ${t.border}`,
                    backgroundColor: amount.toString() === contributeAmount ? t.gold : 'transparent',
                    color: amount.toString() === contributeAmount ? '#000' : t.text,
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or enter custom amount"
              type="number"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              style={{ marginBottom: '20px' }}
            />
            <Button
              label="Contribute"
              full
              onClick={handleContribute}
              style={{ backgroundColor: t.gold, color: '#000', marginBottom: '12px' }}
            />
            <Button
              label="Cancel"
              full
              variant="outline"
              onClick={() => setShowContribute(false)}
              style={{ borderColor: t.border, color: t.text }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// SMART INSIGHTS SCREEN - Budget + Credit Insights
// ============================================================================

export function SmartInsightsScreen({ data, allocation }) {
  const t = useContext(ThemeContext);
  const isPremium = data.subscription?.isPremium;

  const insights = generateInsights(data);
  const visibleInsights = isPremium ? insights : insights.slice(0, 2);

  // Calculate budget overview
  const weeklyIncome = calculateWeeklyIncome(data);
  const weeklyBills = (data.bills || []).reduce((sum, b) => sum + frequencyToWeekly(b.amount, b.frequency), 0);
  const billsRatio = weeklyIncome > 0 ? (weeklyBills / weeklyIncome) * 100 : 0;
  const weeklyExpenses = (data.expenses || []).reduce((sum, e) => sum + frequencyToWeekly(e.amount, e.frequency), 0);
  const nonEssential = weeklyExpenses * 0.4; // Estimate non-essential

  // Get credit health
  const creditHealth = data.creditProfile?.score
    ? data.creditProfile.score >= 750
      ? { label: 'Excellent', color: t.success }
      : data.creditProfile.score >= 650
      ? { label: 'Good', color: t.gold }
      : { label: 'Fair', color: t.warning }
    : null;

  return (
    <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Budget Overview */}
      <SectionHeader title="Budget Overview" />
      <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>BILLS</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>
              {billsRatio.toFixed(0)}%
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary }}>
              {formatCurrency(weeklyBills)}/week
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>INCOME RATIO</div>
            <ProgressBar value={Math.min(billsRatio, 100)} color={billsRatio > 50 ? t.warning : t.success} />
            <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '8px' }}>
              Target: under 50%
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '20px' }}>
          <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>
            NON-ESSENTIAL SPENDING
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: t.text }}>
            {formatCurrency(nonEssential)}/week
          </div>
        </div>
      </Card>

      {/* Credit Health */}
      {creditHealth && (
        <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '4px' }}>
                CREDIT SCORE
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>
                {data.creditProfile?.score || 'N/A'}
              </div>
            </div>
            <Badge label={creditHealth.label} color={creditHealth.color} />
          </div>
          <Button
            label="View Credit Details"
            variant="outline"
            full
            style={{
              marginTop: '16px',
              borderColor: t.border,
              color: t.text,
            }}
          />
        </Card>
      )}

      {/* Insights Cards */}
      <SectionHeader title="Smart Insights" />
      {visibleInsights.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          {visibleInsights.map((insight) => {
            const colorMap = {
              success: t.successBg,
              warning: t.warningBg,
              danger: t.dangerBg,
            };
            return (
              <Card
                key={insight.id}
                style={{
                  padding: '16px',
                  backgroundColor: colorMap[insight.type] || t.card,
                  borderLeft: `4px solid ${
                    insight.type === 'success'
                      ? t.success
                      : insight.type === 'warning'
                      ? t.warning
                      : t.danger
                  }`,
                }}
              >
                <div style={{ fontSize: '13px', color: t.text }}>
                  <strong>{insight.title}</strong>
                </div>
                <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '4px' }}>
                  {insight.message}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No insights yet" description="Add transactions to get personalized insights" />
      )}

      {!isPremium && insights.length > 2 && (
        <Card style={{ padding: '16px', backgroundColor: t.goldBg, marginBottom: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>
                See All Insights
              </div>
              <div style={{ fontSize: '11px', color: '#000', opacity: 0.8 }}>
                Premium members see {insights.length} insights
              </div>
            </div>
            <Badge label="Premium" color={t.gold} />
          </div>
        </Card>
      )}

      {/* Spending Targets */}
      <SectionHeader title="Spending Targets" />
      <div style={{ display: 'grid', gap: '12px' }}>
        {['Food', 'Entertainment', 'Transport'].map((category) => {
          const target = 150;
          const spent = Math.floor(Math.random() * target * 1.1);
          const progress = (spent / target) * 100;
          return (
            <Card key={category} style={{ padding: '12px', backgroundColor: t.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: t.text, fontWeight: '500' }}>{category}</div>
                <div style={{ fontSize: '12px', color: t.textSecondary }}>
                  {formatCurrency(spent)} / {formatCurrency(target)}
                </div>
              </div>
              <ProgressBar
                value={progress}
                color={progress > 100 ? t.danger : progress > 80 ? t.warning : t.success}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATIONS SCREEN
// ============================================================================

export function NotificationsScreen({ data, setData }) {
  const t = useContext(ThemeContext);
  const [notifications] = useState([
    {
      id: '1',
      type: 'bill_reminder',
      title: 'Rent Due Soon',
      message: 'Your rent payment is due in 3 days',
      read: false,
      date: getToday(),
    },
    {
      id: '2',
      type: 'smart_alert',
      title: 'Spending Alert',
      message: 'Your spending is 15% higher than usual this week',
      read: false,
      date: getToday(),
    },
    {
      id: '3',
      type: 'savings',
      title: 'Savings Goal Progress',
      message: 'You\'re 45% towards your $2,000 vacation fund',
      read: true,
      date: addDays(getToday(), -1),
    },
    {
      id: '4',
      type: 'credit',
      title: 'Credit Score Updated',
      message: 'Your credit score improved by 12 points',
      read: true,
      date: addDays(getToday(), -2),
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeIcons = {
    bill_reminder: 'bell',
    smart_alert: 'trendUp',
    overdue: 'warning',
    savings: 'savings',
    group: 'group',
    credit: 'shield',
  };

  const handleMarkAllRead = () => {
    // Update in parent
  };

  return (
    <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header with Mark All Read */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>Notifications</div>
          {unreadCount > 0 && (
            <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '4px' }}>
              {unreadCount} unread
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: t.gold,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              style={{
                padding: '16px',
                backgroundColor: notif.read ? t.card : t.bgSecondary,
                borderLeft: notif.read ? 'none' : `4px solid ${t.gold}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: t.goldBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {notif.type === 'bill_reminder' && '📅'}
                  {notif.type === 'smart_alert' && '📊'}
                  {notif.type === 'savings' && '🎯'}
                  {notif.type === 'credit' && '🛡️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                      {notif.title}
                    </div>
                    {!notif.read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: t.gold,
                        flexShrink: 0,
                        marginTop: '4px',
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '11px', color: t.textMuted }}>
                    {formatDate(notif.date)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="bell"
          title="All Caught Up"
          description="You have no notifications"
        />
      )}
    </div>
  );
}

// ============================================================================
// SETTINGS SCREEN - Account Settings with 2FA
// ============================================================================

export function SettingsScreen({ data, setData, theme, setTheme }) {
  const t = useContext(ThemeContext);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(data.security?.twoFAEnabled || false);
  const [twoFAMethod, setTwoFAMethod] = useState('email');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const trialDaysLeft = data.subscription?.trialDaysLeft || TRIAL_DAYS;

  const handleToggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const handleEnable2FA = () => {
    setTwoFAEnabled(true);
    setData({
      ...data,
      security: {
        ...data.security,
        twoFAEnabled: true,
        twoFAMethod,
      },
    });
    setShowTwoFA(false);
  };

  const handleDisable2FA = () => {
    setTwoFAEnabled(false);
    setData({
      ...data,
      security: {
        ...data.security,
        twoFAEnabled: false,
      },
    });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Account Section */}
      <SectionHeader title="Account" />
      <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '8px',
            backgroundColor: t.gold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            color: '#000',
          }}>
            {data.user?.name?.[0] || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
              {data.user?.name || 'User'}
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary }}>
              {data.user?.email || 'user@example.com'}
            </div>
          </div>
        </div>
      </Card>

      {/* Theme Toggle */}
      <SectionHeader title="Appearance" />
      <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '12px', textTransform: 'uppercase' }}>
            THEME
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => handleToggleTheme('light')}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: theme === 'light' ? 'none' : `1px solid ${t.border}`,
                backgroundColor: theme === 'light' ? t.gold : 'transparent',
                color: theme === 'light' ? '#000' : t.text,
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>☀️</span> Light
            </button>
            <button
              onClick={() => handleToggleTheme('dark')}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: theme === 'dark' ? 'none' : `1px solid ${t.border}`,
                backgroundColor: theme === 'dark' ? t.gold : 'transparent',
                color: theme === 'dark' ? '#000' : t.text,
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>🌙</span> Dark
            </button>
          </div>
        </div>
      </Card>

      {/* Subscription Status */}
      <SectionHeader title="Subscription" />
      <Card style={{ padding: '20px', backgroundColor: t.goldBg, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {data.subscription?.isPremium ? (
              <>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>
                  Premium
                </div>
                <div style={{ fontSize: '12px', color: '#000', opacity: 0.8 }}>
                  Unlimited access to all features
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>
                  Trial
                </div>
                <div style={{ fontSize: '12px', color: '#000', opacity: 0.8 }}>
                  {trialDaysLeft} days left • {formatCurrency(PREMIUM_PRICE)}/month after
                </div>
              </>
            )}
          </div>
          {!data.subscription?.isPremium && (
            <Badge label="Active" color="#000" />
          )}
        </div>
      </Card>

      {/* Security Section */}
      <SectionHeader title="Security" />

      {/* 2FA Toggle */}
      <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '4px' }}>
              Two-Factor Authentication
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary }}>
              {twoFAEnabled ? 'Enabled via ' + (twoFAMethod || 'email') : 'Not enabled'}
            </div>
          </div>
          <Toggle
            checked={twoFAEnabled}
            onChange={() => {
              if (twoFAEnabled) {
                handleDisable2FA();
              } else {
                setShowTwoFA(true);
              }
            }}
          />
        </div>
      </Card>

      {/* Backup Codes */}
      {twoFAEnabled && (
        <Card style={{ padding: '16px', backgroundColor: t.card, marginBottom: '12px' }}>
          <button
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                Backup Codes
              </div>
              <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '4px' }}>
                Save these in a secure place
              </div>
            </div>
            <div style={{ color: t.textSecondary }}>{'→'}</div>
          </button>
          {showBackupCodes && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: t.inputBg,
              fontFamily: 'monospace',
              fontSize: '11px',
              color: t.text,
            }}>
              {['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012'].map((code) => (
                <div key={code} style={{ marginBottom: '4px' }}>{code}</div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Change Password */}
      <Card style={{ padding: '16px', backgroundColor: t.card, marginBottom: '12px' }}>
        <button
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
              Change Password
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '4px' }}>
              Update your password
            </div>
          </div>
          <div style={{ color: t.textSecondary }}>{'→'}</div>
        </button>
      </Card>

      {/* Pay Schedule */}
      <SectionHeader title="Preferences" />
      <Card style={{ padding: '20px', backgroundColor: t.card, marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '8px', textTransform: 'uppercase' }}>
            PAY FREQUENCY
          </div>
          <Select
            value={data.payFrequency || 'weekly'}
            onChange={(e) => setData({ ...data, payFrequency: e.target.value })}
            style={{ width: '100%' }}
          >
            {PAY_FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Coming Soon Section */}
      <SectionHeader title="Coming Soon" />
      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        {[
          { icon: '🏦', title: 'Plaid Integration', desc: 'Auto-sync your bank accounts' },
          { icon: '🔔', title: 'Push Notifications', desc: 'Stay updated on the go' },
        ].map((item, idx) => (
          <Card key={idx} style={{ padding: '16px', backgroundColor: t.card, opacity: 0.6 }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '13px', color: t.textSecondary }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{item.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Danger Zone */}
      <SectionHeader title="Account" />
      <Card style={{
        padding: '16px',
        backgroundColor: t.dangerBg,
        border: `1px solid ${t.danger}`,
      }}>
        <button
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            color: t.danger,
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          Delete Account
        </button>
      </Card>

      {/* 2FA Setup Modal */}
      {showTwoFA && (
        <Modal onClose={() => setShowTwoFA(false)}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: t.text }}>
              Set Up 2FA
            </div>

            {/* Method Selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '12px' }}>
                CHOOSE METHOD
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {[
                  { value: 'email', label: '📧 Email OTP', desc: 'Receive codes via email' },
                  { value: 'authenticator', label: '🔐 Authenticator App', desc: 'Use an authenticator app' },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setTwoFAMethod(method.value)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: twoFAMethod === method.value ? 'none' : `1px solid ${t.border}`,
                      backgroundColor: twoFAMethod === method.value ? t.goldBg : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>
                      {method.label}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '4px' }}>
                      {method.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Input */}
            <div style={{ marginBottom: '20px' }}>
              <Input
                placeholder={twoFAMethod === 'email' ? 'Enter code from email' : 'Enter authenticator code'}
                style={{ marginBottom: '12px' }}
              />
            </div>

            {/* Actions */}
            <Button
              label="Enable 2FA"
              full
              onClick={handleEnable2FA}
              style={{ backgroundColor: t.gold, color: '#000', marginBottom: '12px' }}
            />
            <Button
              label="Cancel"
              full
              variant="outline"
              onClick={() => setShowTwoFA(false)}
              style={{ borderColor: t.border, color: t.text }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// AUTH SCREEN - Login / Signup
// ============================================================================

export function AuthScreen({ onLogin, onDemo }) {
  const t = useContext(ThemeContext);
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('credentials'); // 'credentials' or '2fa'
  const [twoFACode, setTwoFACode] = useState('');

  const handleSubmit = () => {
    if (email && password) {
      setStep('2fa');
    }
  };

  const handleVerify2FA = () => {
    if (twoFACode) {
      onLogin({ email, password, twoFACode });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* ORCA Branding */}
      <div style={{ marginBottom: '60px', textAlign: 'center' }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '800',
          color: t.gold,
          marginBottom: '12px',
          letterSpacing: '2px',
        }}>
          {BRAND.name}
        </div>
        <div style={{
          fontSize: '14px',
          color: t.textSecondary,
          fontStyle: 'italic',
        }}>
          {BRAND.tagline}
        </div>
      </div>

      {/* Auth Card */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: t.card,
        borderRadius: '16px',
        padding: '30px',
      }}>
        {step === 'credentials' ? (
          <>
            {/* Tab Selection */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '30px',
            }}>
              <button
                onClick={() => setTab('login')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: tab === 'login' ? t.gold : 'transparent',
                  color: tab === 'login' ? '#000' : t.textSecondary,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Log In
              </button>
              <button
                onClick={() => setTab('signup')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: tab === 'signup' ? t.gold : 'transparent',
                  color: tab === 'signup' ? '#000' : t.textSecondary,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Sign Up
              </button>
            </div>

            {/* Form Fields */}
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginBottom: '20px' }}
            />

            {/* Submit Button */}
            <Button
              label={tab === 'login' ? 'Log In' : 'Create Account'}
              full
              onClick={handleSubmit}
              style={{
                backgroundColor: t.gold,
                color: '#000',
                marginBottom: '12px',
              }}
            />

            {/* Demo Button */}
            <Button
              label="Try Demo"
              full
              variant="outline"
              onClick={onDemo}
              style={{
                borderColor: t.gold,
                color: t.gold,
                marginBottom: '20px',
              }}
            />

            {/* Founding User Badge */}
            <div style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: t.bgSecondary,
              marginTop: '20px',
            }}>
              <div style={{
                fontSize: '11px',
                color: t.textSecondary,
                marginBottom: '4px',
              }}>
                👑 Founding Member
              </div>
              <div style={{
                fontSize: '11px',
                color: t.gold,
                fontWeight: '600',
              }}>
                Lifetime 50% discount available
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 2FA Verification */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                Verify Your Identity
              </div>
              <div style={{ fontSize: '12px', color: t.textSecondary }}>
                Enter the code we sent to {email}
              </div>
            </div>

            <Input
              placeholder="000000"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '18px',
                letterSpacing: '8px',
                fontFamily: 'monospace',
              }}
            />

            <Button
              label="Verify"
              full
              onClick={handleVerify2FA}
              style={{
                backgroundColor: t.gold,
                color: '#000',
                marginBottom: '12px',
              }}
            />

            <button
              onClick={() => setStep('credentials')}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: t.gold,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Back
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        fontSize: '11px',
        color: t.textMuted,
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '8px' }}>
          Secure • Encrypted • Private
        </div>
        <div>
          © 2025 {BRAND.name}. Your money. Commanded.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BOTTOM NAVIGATION
// ============================================================================

export function BottomNav({ active, onNavigate }) {
  const t = useContext(ThemeContext);
  const [showMore, setShowMore] = useState(false);

  const tabs = [
    { key: 'dashboard', icon: '🏠', label: 'Home' },
    { key: 'check-spitter', icon: '💳', label: 'Splitter' },
    { key: 'credit-score', icon: '🛡️', label: 'Credit' },
    { key: 'savings', icon: '🎯', label: 'Goals' },
    { key: 'more', icon: '⋯', label: 'More' },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.navBg,
      borderTop: `1px solid ${t.border}`,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      padding: '8px 0',
      zIndex: 1000,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => {
            if (tab.key === 'more') {
              setShowMore(!showMore);
            } else {
              onNavigate(tab.key);
              setShowMore(false);
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '12px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: active === tab.key ? t.gold : t.textSecondary,
            fontSize: '12px',
            fontWeight: active === tab.key ? '600' : '500',
            borderTop: active === tab.key ? `3px solid ${t.gold}` : 'none',
            paddingTop: active === tab.key ? '9px' : '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}

      {/* More Menu Dropdown */}
      {showMore && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          backgroundColor: t.card,
          borderRadius: '12px 12px 0 0',
          minWidth: '150px',
          borderTop: `1px solid ${t.border}`,
          zIndex: 1001,
        }}>
          {[
            { key: 'stack-circle', label: 'Stack Circle' },
            { key: 'smart-insights', label: 'Smart Insights' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'settings', label: 'Settings' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setShowMore(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${t.border}`,
                cursor: 'pointer',
                color: t.text,
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOP BAR / HEADER
// ============================================================================

export function TopBar({ screen, onNavigate, unreadNotifs }) {
  const t = useContext(ThemeContext);

  const screenNames = {
    dashboard: 'Dashboard',
    'check-spitter': 'Check Splitter',
    'credit-score': 'Credit Score',
    'savings': 'Savings Goals',
    'stack-circle': 'Stack Circle',
    'smart-insights': 'Smart Insights',
    'notifications': 'Notifications',
    'settings': 'Settings',
    'rent-reporter': 'Rent Reporter',
    'credit-insights': 'Credit Insights',
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      backgroundColor: t.navBg,
      borderBottom: `1px solid ${t.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: t.gold }}>
          {BRAND.name}
        </div>
        {screen !== 'dashboard' && (
          <div style={{ fontSize: '12px', color: t.textSecondary, marginTop: '2px' }}>
            {screenNames[screen] || 'ORCA'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Notifications Bell */}
        <button
          onClick={() => onNavigate('notifications')}
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: t.card,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          🔔
          {unreadNotifs > 0 && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: t.danger,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
            }}>
              {unreadNotifs}
            </div>
          )}
        </button>

        {/* Settings Icon */}
        <button
          onClick={() => onNavigate('settings')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: t.card,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ORCA APP - Main Component (Default Export)
// ============================================================================

export default function OrcaApp() {
  const [appState, setAppState] = useState('auth'); // 'auth', 'onboarding', 'app'
  const [screen, setScreen] = useState('dashboard');
  const [data, setData] = useState(() => createSeedData());
  const [theme, setTheme] = useState('dark');

  const currentTheme = THEMES[theme];
  const unreadNotifs = data.notifications ? data.notifications.filter(n => !n.readStatus).length : 0;

  // Calculate allocation
  const allocation = useMemo(() =>
    calculateWeeklyAllocation(data.incomeSources || [], data.bills || [], data.savingsGoals || [], data.splitMode || 'equal', data.user?.nextPayday),
    [data.incomeSources, data.bills, data.savingsGoals, data.splitMode, data.user?.nextPayday]
  );

  const handleNavigate = (newScreen) => {
    setScreen(newScreen);
  };

  const handleLogin = (credentials) => {
    setAppState('onboarding');
  };

  const handleDemo = () => {
    const demoData = createDemoData();
    setData(demoData);
    setAppState('app');
  };

  return (
    <ThemeContext.Provider value={currentTheme}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background-color: ${currentTheme.bg};
          color: ${currentTheme.text};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {appState === 'auth' ? (
        <AuthScreen onLogin={handleLogin} onDemo={handleDemo} />
      ) : appState === 'onboarding' ? (
        <OnboardingScreen data={data} setData={setData} onComplete={() => setAppState('app')} />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: currentTheme.bg,
        }}>
          <TopBar screen={screen} onNavigate={handleNavigate} unreadNotifs={unreadNotifs} />

          <div style={{ flex: 1, overflow: 'auto', paddingBottom: '80px' }}>
            {screen === 'dashboard' && <BalanceBookScreen data={data} setData={setData} />}
            {screen === 'pay-track' && <PayTrackScreen data={data} setData={setData} />}
            {screen === 'bill-boss' && <BillBossScreen data={data} setData={setData} />}
            {screen === 'expense-core' && <ExpenseCoreScreen data={data} setData={setData} />}
            {screen === 'check-spitter' && <CheckSpitterScreen data={data} setData={setData} />}
            {screen === 'savings' && <SavingsGoalsScreen data={data} setData={setData} />}
            {screen === 'rent-reporter' && <RentReporterScreen data={data} setData={setData} />}
            {screen === 'credit-score' && <CreditScoreScreen data={data} setData={setData} />}
            {screen === 'credit-insights' && <CreditInsightsScreen data={data} setData={setData} />}
            {screen === 'stack-circle' && <StackCircleScreen data={data} setData={setData} />}
            {screen === 'smart-insights' && <SmartInsightsScreen data={data} allocation={allocation} />}
            {screen === 'notifications' && <NotificationsScreen data={data} setData={setData} />}
            {screen === 'settings' && (
              <SettingsScreen data={data} setData={setData} theme={theme} setTheme={setTheme} />
            )}
          </div>

          <BottomNav active={screen} onNavigate={handleNavigate} />
        </div>
      )}
    </ThemeContext.Provider>
  );
}
