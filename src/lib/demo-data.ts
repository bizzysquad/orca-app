import type {
  OrcaUser, IncomeSource, Bill, Expense, SavingsGoal,
  Group, RentEntry, Notification, RoommateData, PlaidData, OrcaData, AdminConfig,
  EmploymentType
} from './types'

// ── Demo User ──
export const DEMO_USER: OrcaUser = {
  name: 'Alex Johnson',
  email: 'alex@orca.app',
  onboarded: true,
  employmentType: 'employed',
  payFreq: 'biweekly',
  payCycle: 'standard',
  payRate: '28.50',
  hoursPerDay: '8',
  nextPay: '2026-04-03',
  grossIncome: 4940,
  netIncome: 3820,
  dailyIncome: 0,
  weeklyIncome: 0,
  manualCashInput: 0,
  selfEmployedInputMethod: 'weekly',
  rentAmount: 1400,
  creditScore: 742,
  utilization: 24,
  onTime: 98,
  acctAge: 6,
  inquiries: 2,
  totalDebt: 4800,
  creditLimit: 20000,
  scoreHistory: [
    { m: 'Oct', s: 715 },
    { m: 'Nov', s: 722 },
    { m: 'Dec', s: 728 },
    { m: 'Jan', s: 735 },
    { m: 'Feb', s: 738 },
    { m: 'Mar', s: 742 },
  ],
}

// ── Income Sources ──
export const DEMO_INCOME: IncomeSource[] = [
  { id: 'inc1', name: 'Full-Time Job', amount: 2280, freq: 'biweekly', active: true },
  { id: 'inc2', name: 'Freelance Design', amount: 600, freq: 'monthly', active: true },
]

// ── Bills ──
export const DEMO_BILLS: Bill[] = [
  { id: 'b1', name: 'Rent', amount: 1400, cat: 'Housing', due: '2026-04-01', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b2', name: 'Car Payment', amount: 385, cat: 'Transportation', due: '2026-04-05', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b3', name: 'Car Insurance', amount: 142, cat: 'Insurance', due: '2026-04-10', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b4', name: 'Phone Bill', amount: 85, cat: 'Utilities', due: '2026-04-12', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b5', name: 'Netflix', amount: 15.99, cat: 'Entertainment', due: '2026-04-15', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b6', name: 'Gym Membership', amount: 49.99, cat: 'Health', due: '2026-04-08', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b7', name: 'Internet', amount: 65, cat: 'Utilities', due: '2026-04-18', freq: 'monthly', recurrence: 'monthly', status: 'upcoming', alloc: [] },
  { id: 'b8', name: 'Electric Bill', amount: 110, cat: 'Utilities', due: '2026-03-15', freq: 'monthly', recurrence: 'monthly', status: 'paid', alloc: [] },
  { id: 'b9', name: 'Spotify', amount: 10.99, cat: 'Entertainment', due: '2026-03-20', freq: 'monthly', recurrence: 'monthly', status: 'paid', alloc: [] },
]

// ── Expenses ──
export const DEMO_EXPENSES: Expense[] = [
  { id: 'e1', name: 'Grocery Run', amount: 87.42, cat: 'Food', date: '2026-03-19' },
  { id: 'e2', name: 'Gas Station', amount: 52.30, cat: 'Transportation', date: '2026-03-18' },
  { id: 'e3', name: 'Coffee Shop', amount: 12.50, cat: 'Food', date: '2026-03-17' },
  { id: 'e4', name: 'Amazon Order', amount: 34.99, cat: 'Shopping', date: '2026-03-16' },
  { id: 'e5', name: 'Lunch Meeting', amount: 28.75, cat: 'Food', date: '2026-03-15' },
  { id: 'e6', name: 'Uber Ride', amount: 18.40, cat: 'Transportation', date: '2026-03-14' },
]

// ── Savings Goals ──
export const DEMO_GOALS: SavingsGoal[] = [
  { id: 'g1', name: 'Emergency Fund', target: 10000, current: 6500, date: '2026-12-31', cType: 'fixed', cVal: 150, active: true },
  { id: 'g2', name: 'Vacation Fund', target: 3000, current: 1200, date: '2026-08-01', cType: 'fixed', cVal: 75, active: true },
  { id: 'g3', name: 'New Laptop', target: 2000, current: 850, date: '2026-06-15', cType: 'fixed', cVal: 50, active: true },
]

// ── Groups ──
export const DEMO_GROUPS: Group[] = [
  {
    id: 'grp1',
    name: 'Beach House Fund',
    goal: 'Summer trip beach house rental',
    target: 2400,
    current: 1650,
    date: '2026-07-01',
    code: 'BEACH26',
    members: [
      { id: 'm1', name: 'Alex Johnson', role: 'coordinator', target: 600, contrib: 450, balance: 150 },
      { id: 'm2', name: 'Jordan Lee', role: 'member', target: 600, contrib: 500, balance: 100 },
      { id: 'm3', name: 'Sam Rivera', role: 'member', target: 600, contrib: 400, balance: 200 },
      { id: 'm4', name: 'Taylor Kim', role: 'member', target: 600, contrib: 300, balance: 300 },
    ],
    activity: [
      { id: 'a1', user: 'Jordan Lee', msg: 'Added $100 to the group', date: '2026-03-18' },
      { id: 'a2', user: 'Alex Johnson', msg: 'Added $75 to the group', date: '2026-03-15' },
      { id: 'a3', user: 'Sam Rivera', msg: 'Added $50 to the group', date: '2026-03-12' },
      { id: 'a4', user: 'Taylor Kim', msg: 'Joined the group', date: '2026-03-01' },
      { id: 'a5', user: 'Alex Johnson', msg: 'Created the group', date: '2026-02-15' },
    ],
  },
]

// ── Rent Entries ──
export const DEMO_RENT: RentEntry[] = [
  { id: 'r1', month: '2026-03', amount: 1400, status: 'paid', reported: true, rDate: '2026-03-02' },
  { id: 'r2', month: '2026-02', amount: 1400, status: 'paid', reported: true, rDate: '2026-02-03' },
  { id: 'r3', month: '2026-01', amount: 1400, status: 'paid', reported: true, rDate: '2026-01-02' },
  { id: 'r4', month: '2025-12', amount: 1400, status: 'paid', reported: false, rDate: null },
]

// ── Notifications ──
export const DEMO_NOTIFS: Notification[] = [
  { id: 'n1', type: 'bill', title: 'Rent Due Soon', body: 'Your rent of $1,400 is due in 12 days', read: false },
  { id: 'n2', type: 'savings', title: 'Goal Progress!', body: 'Emergency Fund is now 65% funded', read: false },
  { id: 'n3', type: 'credit', title: 'Score Update', body: 'Your credit score increased by 4 points', read: true },
]

// ── Roommate Data ──
export const DEMO_ROOMMATES: RoommateData = {
  enabled: true,
  totalRent: 2800,
  utilities: [
    { id: 'u1', name: 'Electric', amount: 110, split: 'equal' },
    { id: 'u2', name: 'Internet', amount: 65, split: 'equal' },
    { id: 'u3', name: 'Water', amount: 45, split: 'equal' },
  ],
  members: [
    { id: 'rm1', name: 'You (Alex)', share: 50, paidRent: true, paidUtilities: true },
    { id: 'rm2', name: 'Jordan Lee', share: 50, paidRent: true, paidUtilities: false },
  ],
  history: [
    { id: 'rh1', month: '2026-03', allPaid: false },
    { id: 'rh2', month: '2026-02', allPaid: true },
    { id: 'rh3', month: '2026-01', allPaid: true },
  ],
}

// ── Plaid Demo Data ──
export const DEMO_PLAID: PlaidData = {
  connected: true,
  accounts: [
    { id: 'pa1', name: 'Chase Checking', type: 'checking', mask: '4521', balance: 3247.82 },
    { id: 'pa2', name: 'Chase Savings', type: 'savings', mask: '8834', balance: 8650.00 },
    { id: 'pa3', name: 'Capital One Visa', type: 'credit', mask: '2201', balance: 4800, limit: 20000 },
  ],
  lastSync: '2026-03-20T10:30:00Z',
  checkingBalance: 3247.82,
  savingsBalance: 8650.00,
  creditUsed: 4800,
  creditLimit: 20000,
}

// ── Admin Config ──
export const DEMO_ADMIN: AdminConfig = {
  appName: 'ORCA',
  tagline: 'Financial Command Center',
  logoUrl: null,
  goldColor: '#d4a843',
}

// ── Full Demo Data Bundle ──
export function getDemoData(): OrcaData {
  return {
    user: { ...DEMO_USER },
    income: DEMO_INCOME.map(i => ({ ...i })),
    bills: DEMO_BILLS.map(b => ({ ...b, alloc: b.alloc.map(a => ({ ...a })) })),
    expenses: DEMO_EXPENSES.map(e => ({ ...e })),
    goals: DEMO_GOALS.map(g => ({ ...g })),
    splitMode: 'equal',
    notifs: DEMO_NOTIFS.map(n => ({ ...n })),
    groups: DEMO_GROUPS.map(g => ({
      ...g,
      members: g.members.map(m => ({ ...m })),
      activity: g.activity.map(a => ({ ...a })),
    })),
    rent: DEMO_RENT.map(r => ({ ...r })),
    plaid: { ...DEMO_PLAID, accounts: DEMO_PLAID.accounts.map(a => ({ ...a })) },
    roommates: {
      ...DEMO_ROOMMATES,
      utilities: DEMO_ROOMMATES.utilities.map(u => ({ ...u })),
      members: DEMO_ROOMMATES.members.map(m => ({ ...m })),
      history: DEMO_ROOMMATES.history.map(h => ({ ...h })),
    },
  }
}

// ── Demo mode helpers ──
let _demoMode = true
export function isDemoMode() { return _demoMode }
export function setDemoMode(v: boolean) { _demoMode = v }

// ── Fresh user data (for new signups) ──
export function getNewUserData(name: string, email: string): OrcaData {
  return {
    user: {
      name,
      email,
      onboarded: false,
      employmentType: 'employed',
      payFreq: 'biweekly',
      payCycle: 'standard',
      payRate: '0',
      hoursPerDay: '8',
      nextPay: '',
      grossIncome: 0,
      netIncome: 0,
      dailyIncome: 0,
      weeklyIncome: 0,
      manualCashInput: 0,
      selfEmployedInputMethod: 'weekly',
      rentAmount: 0,
      creditScore: 0,
      utilization: 0,
      onTime: 0,
      acctAge: 0,
      inquiries: 0,
      totalDebt: 0,
      creditLimit: 0,
      scoreHistory: [],
    },
    income: [],
    bills: [],
    expenses: [],
    goals: [],
    splitMode: 'equal',
    notifs: [],
    groups: [],
    rent: [],
    plaid: null,
    roommates: {
      enabled: false,
      totalRent: 0,
      utilities: [],
      members: [],
      history: [],
    },
  }
}
