import type {
  OrcaUser, IncomeSource, Bill, Expense, SavingsGoal,
  Group, RentEntry, Notification, RoommateData, PlaidData, OrcaData, AdminConfig,
  EmploymentType
} from './types'

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
