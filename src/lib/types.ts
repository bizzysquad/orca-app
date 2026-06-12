// ── Core type aliases ──
export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'yearly'
export type SplitMode = 'equal' | '4way' | '6way' | 'custom'

// ── Standard Status System ──
export type FinancialStatus = 'on_track' | 'tight' | 'shortfall' | 'covered' | 'overdue'
export type RiskLevel = 'on_track' | 'tight' | 'shortfall'

// ── Bill Data Model ──
export interface BillTemplate {
  id: string
  name: string
  amount: number
  category: string
  recurrenceRule: string
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

// ── Unified Income Model ──
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
  dailyIncome?: number
  weeklyIncome?: number
  manualCashInput?: number
  selfEmployedInputMethod?: 'daily' | 'weekly' | 'manual'
  safeToSpendBuffer?: number
  checkingBalance?: number
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
  recurrenceEndDate?: string
  recurrenceEndAfter?: number
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

// ── Incoming Payment ──
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

// ── Quick Actions ──
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

// ── Audit Log ──
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

// ═══════════════════════════════════════════════════════
// BENTLEY AI — NEW TYPES
// ═══════════════════════════════════════════════════════

// ── Bentley Chat ──
export interface BentleyMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  context?: string
}

export interface BentleyConversation {
  id: string
  messages: BentleyMessage[]
  createdAt: string
  updatedAt: string
}

// ── Fitness ──
export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'sports' | 'other'
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full-body'

export interface WorkoutExercise {
  id: string
  name: string
  sets: number
  reps: number | string
  weight?: number
  notes?: string
}

export interface WorkoutSession {
  id: string
  date: string
  type: WorkoutType
  muscleGroups: MuscleGroup[]
  exercises: WorkoutExercise[]
  duration: number
  notes?: string
  completed: boolean
}

export interface WeightLog {
  id: string
  date: string
  weight: number
  notes?: string
}

export interface MealLog {
  id: string
  date: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'smoothie'
  name: string
  calories: number
  protein: number
  carbs?: number
  fat?: number
  notes?: string
}

export interface FitnessProfile {
  height: number
  currentWeight: number
  goalWeight: number
  dailyCalorieGoal: number
  dailyProteinGoal: number
  dailyWaterGoal: number
  workoutsPerWeek: number
  birthday: string
  age: number
}

// ── Grocery ──
export type GroceryCategory = 'protein' | 'produce' | 'dairy' | 'grains' | 'frozen' | 'pantry' | 'snacks' | 'beverages' | 'other'

export interface GroceryItem {
  id: string
  name: string
  category: GroceryCategory
  quantity: number
  unit: string
  purchaseDate: string
  expirationDate?: string
  estimatedDays?: number
  calories?: number
  protein?: number
  price?: number
  lowStockThreshold?: number
  notes?: string
}

// ── Music ──
export type SongStatus =
  | 'finished'
  | 'artwork-needed'
  | 'artwork-done'
  | 'content-ideas-needed'
  | 'content-recorded'
  | 'release-date-set'
  | 'uploaded'
  | 'promo-scheduled'
  | 'released'

export interface Song {
  id: string
  title: string
  genre?: string
  bpm?: number
  key?: string
  status: SongStatus
  releaseDate?: string
  artworkUrl?: string
  artworkConcept?: string
  contentIdeas: string[]
  distributionLink?: string
  streamingLinks?: {
    spotify?: string
    apple?: string
    youtube?: string
    tiktok?: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MusicRelease {
  id: string
  songId: string
  releaseDate: string
  platform: string[]
  status: 'scheduled' | 'live' | 'delayed'
  promoPlanned: boolean
  notes?: string
}

export interface ContentIdea {
  id: string
  songId?: string
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'all'
  type: 'reel' | 'short' | 'story' | 'post' | 'video'
  concept: string
  caption?: string
  hashtags?: string[]
  status: 'idea' | 'planned' | 'recorded' | 'posted'
  scheduledDate?: string
}

// ── Business ──
export type BusinessType = 'etsy' | 'travel-app' | 'bizzplug' | 'motivational-video' | 'music' | 'dj' | 'lyft' | 'orca' | 'other'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked'

export interface BusinessTask {
  id: string
  businessId: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  estimatedHours?: number
  revenue?: number
  notes?: string
  createdAt: string
}

export interface BusinessRevenue {
  id: string
  businessId: string
  amount: number
  date: string
  source: string
  notes?: string
}

export interface BusinessExpense {
  id: string
  businessId: string
  amount: number
  date: string
  category: string
  description: string
}

export interface Business {
  id: string
  name: string
  type: BusinessType
  description?: string
  active: boolean
  monthlyRevenueGoal?: number
  weeklyTimeGoal?: number
  currentMonthRevenue: number
  currentMonthExpenses: number
  tasks: BusinessTask[]
  notes?: string
  color?: string
  icon?: string
}

// ── DJ Gigs ──
export type GigStatus = 'inquiry' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type GigType = 'wedding' | 'birthday' | 'corporate' | 'nightclub' | 'bar' | 'festival' | 'private' | 'other'

export interface DJPartialPayment {
  id: string
  amount: number
  date: string
  note?: string
}

export interface DJGig {
  id: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  eventType: GigType
  date: string
  startTime: string
  endTime: string
  venue: string
  eventAddress?: string
  status: GigStatus
  contractAmount: number
  fee: number
  depositAmount: number
  depositPaid: boolean
  partialPayments: DJPartialPayment[]
  balancePaid: boolean
  playlist?: string[]
  musicPreferences?: string
  gearChecklist: { id: string; item: string; checked: boolean }[]
  invoiceNumber?: string
  notes?: string
  createdAt: string
  isLead?: boolean
}

export interface DJBookingRequest {
  id: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  eventType: string
  date: string
  startTime?: string
  endTime?: string
  venue?: string
  budget?: string
  musicPreferences?: string
  notes?: string
  status: 'new' | 'reviewed' | 'quoted' | 'booked' | 'declined'
  createdAt: string
}

// ── Lyft ──
export interface LyftSession {
  id: string
  date: string
  startTime: string
  endTime: string
  earnings: number
  trips: number
  miles?: number
  gasExpense?: number
  city?: string
  notes?: string
}

export interface LyftGoal {
  weeklyEarningsGoal: number
  dailyEarningsGoal: number
}

// ── Goals / Priorities ──
export interface OrcaGoal {
  id: string
  area: 'fitness' | 'money' | 'music' | 'business' | 'dj' | 'lyft' | 'personal' | 'travel'
  title: string
  description?: string
  targetDate?: string
  completed: boolean
  weeklyFocusPct?: number
  createdAt: string
}

export interface DailyPriority {
  id: string
  date: string
  items: {
    id: string
    text: string
    area: string
    completed: boolean
    addedByBentley: boolean
  }[]
}

// ── Research ──
export interface ResearchRequest {
  id: string
  topic: string
  category: 'workout' | 'meal' | 'travel' | 'music' | 'business' | 'dj' | 'lyft' | 'other'
  result?: string
  status: 'pending' | 'done'
  createdAt: string
}

// ── Travel ──
export interface TravelTrip {
  id: string
  destination: string
  startDate: string
  endDate: string
  budget: number
  status: 'planning' | 'booked' | 'completed'
  notes?: string
  packingList: { id: string; item: string; packed: boolean }[]
}
