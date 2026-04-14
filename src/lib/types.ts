// ── Core type aliases ──
export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'yearly'
export type SplitMode = 'equal' | '4way' | '6way' | 'custom'

// ── Standard Status System (used consistently across all modules) ──
export type FinancialStatus = 'on_track' | 'tight' | 'shortfall' | 'covered' | 'overdue'
export type RiskLevel = 'on_track' | 'tight' | 'shortfall'

// ── Bill Data Model (upgraded: separated from occurrences) ──
export interface BillTemplate {
  id: string
  name: string
  amount: number
  category: string
  recurrenceRule: string // 'monthly' | 'weekly' | 'one-time' | etc.
}

export interface BillOccurrence {
  id: string
  billId: string
  dueDate: string
  expectedAmount: number
  status: 'due' | 'paid' | 'partial' | 'skipped'
}

export interface BillPayment {
  id: string
  billOccurrenceId: string
  amount: number
  paidDate: string
  method: string
}

// ── Unified Income Model (multi-source, no "modes") ──
export type IncomeSourceType = 'fixed' | 'irregular' | 'manual'

export interface UnifiedIncomeSource {
  id: string
  type: IncomeSourceType
  name: string
  frequency: string
  nextDate: string
  amount: number
  active: boolean
}

export interface UnifiedIncomeEvent {
  id: string
  sourceId: string
  amount: number
  date: string
  status: 'expected' | 'received' | 'overdue'
  paidDate?: string
  allocations: {
    bills: number
    savings: number
    spending: number
  }
}

export interface Allocation {
  income: number
  billReserve: number
  savingsReserve: number
  safeToSpend: number
  dailySTS: number
  shortfall: number
}

export interface BudgetHealth {
  score: number
  label: string
  color: string
}

// ── Employment Type ──
export type EmploymentType = 'employed' | 'self-employed'

// ── Income Mode ──
export type IncomeMode = 'paycheck' | 'flexible'

// ── User Profile ──
export interface OrcaUser {
  name: string
  email: string
  onboarded: boolean
  employmentType: EmploymentType
  incomeMode: IncomeMode
  payFreq: string
  payCycle: string
  payRate: string
  hoursPerDay: string
  nextPay: string
  grossIncome?: number
  netIncome?: number
  // Self-employed income fields
  dailyIncome?: number
  weeklyIncome?: number
  manualCashInput?: number
  selfEmployedInputMethod?: 'daily' | 'weekly' | 'manual'
  // Buffer for Safe to Spend
  safeToSpendBuffer?: number
  // Checking / Spending Account starting balance
  checkingBalance?: number
  // Rent config
  rentAmount?: number
  creditScore: number
  creditScoreTransUnion?: number
  creditScoreEquifax?: number
  creditScoreExperian?: number
  utilization: number
  onTime: number
  acctAge: number
  inquiries: number
  totalDebt: number
  creditLimit: number
  scoreHistory: { m: string; s: number }[]
}

// Alias used by queries/dashboard
export type UserProfile = OrcaUser
export type User = OrcaUser

// ── Income ──
export interface IncomeSource {
  id: string
  name: string
  amount: number
  freq: string
  active: boolean
}

// ── Bills ──
export interface BillAlloc {
  id: string
  date: string
  amount: number
  paid: boolean
}

export type BillRecurrence = 'one-time' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type RecurrenceEndType = 'ongoing' | 'after-date' | 'after-count'

export interface Bill {
  id: string
  name: string
  amount: number
  cat: string
  due: string
  freq: string
  recurrence: BillRecurrence
  customRecurrenceDays?: number
  recurrenceEndType?: RecurrenceEndType
  recurrenceEndDate?: string       // ISO date — stop recurring after this date
  recurrenceEndAfter?: number      // stop after N occurrences
  status: string
  alloc: BillAlloc[]
  paidDate?: string
}

// ── Expenses ──
export interface Expense {
  id: string
  name: string
  amount: number
  cat: string
  date: string
}

// ── Savings Goals ──
export interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  date: string
  cType: string
  cVal: number
  active: boolean
  plaidAccountId?: string
}

// ── Groups ──
export interface GroupMember {
  id: string
  name: string
  role: string
  target: number
  contrib: number
  balance: number
}

export interface GroupActivity {
  id: string
  user: string
  msg: string
  date: string
}

export interface Group {
  id: string
  name: string
  customName?: string
  goal: string
  target: number
  current: number
  date: string
  code: string
  members: GroupMember[]
  activity: GroupActivity[]
}

// Alias used by queries
export type StackGroup = Group

// ── Rent ──
export interface RentEntry {
  id: string
  month: string
  amount: number
  status: string
  reported: boolean
  rDate: string | null
}

// ── Notifications ──
export interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
}

// ── Roommates ──
export interface RoommateMember {
  id: string
  name: string
  share: number
  paidRent: boolean
  paidUtilities: boolean
}

export interface Utility {
  id: string
  name: string
  amount: number
  split: string
}

export interface RoommateData {
  enabled: boolean
  totalRent: number
  utilities: Utility[]
  members: RoommateMember[]
  history: { id: string; month: string; allPaid: boolean }[]
}

// ── Plaid ──
export interface PlaidData {
  connected: boolean
  accounts: any[]
  lastSync: string
  checkingBalance: number
  savingsBalance: number
  creditUsed: number
  creditLimit: number
}

// ── Income Allocation (Self-Employed) ──
export interface IncomeAllocationTarget {
  id: string
  type: 'bill' | 'task' | 'savings'
  sourceId: string
  name: string
  amount: number
  dueDate: string
  requiredDaily: number
  requiredWeekly: number
}

// ── App Data ──
export interface OrcaData {
  user: OrcaUser
  income: IncomeSource[]
  bills: Bill[]
  expenses: Expense[]
  goals: SavingsGoal[]
  splitMode: string
  notifs: Notification[]
  groups: Group[]
  rent: RentEntry[]
  plaid: PlaidData | null
  roommates: RoommateData
  incomeAllocations?: IncomeAllocationTarget[]
  incomingPayments?: IncomingPayment[]
}

// ── Incoming Payment (mirror of income-engine) ──
export interface IncomingPayment {
  id: string
  amount: number
  date: string
  description: string
  type: 'one-time' | 'recurring'
  recurrence?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  status: 'expected' | 'received' | 'overdue'
  paidDate?: string
}

// ── Admin Config ──
export interface AdminConfig {
  appName: string
  tagline: string
  logoUrl: string | null
  goldColor: string
}

// ── Quick Action types (for global command palette) ──
export type QuickActionType =
  | 'add_bill'
  | 'log_income'
  | 'mark_bill_paid'
  | 'create_savings_goal'
  | 'add_task'

export interface QuickAction {
  id: string
  type: QuickActionType
  label: string
  shortcut?: string
  icon?: string
}

// ── Audit Log (admin) ──
export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ── Credit Insight ──
export interface CreditInsight {
  icon: string
  title: string
  message: string
  type: 'bad' | 'warn' | 'ok' | 'info'
  priority: number
}
