'use server'

import { createClient } from './server'
import { OrcaData } from '../types'

/**
 * Load user data from Supabase
 * Maps database snake_case fields to camelCase app fields
 */
export async function loadUserData(): Promise<OrcaData | null> {
  const supabase = await createClient()

  // Get current user
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user?.id) {
    return null
  }

  const userId = authData.user.id

  try {
    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return null
    }

    // Load all related data in parallel
    const [
      { data: incomeData },
      { data: billsData },
      { data: expensesData },
      { data: goalsData },
      { data: notifsData },
      { data: rentData },
      { data: plaidData },
    ] = await Promise.all([
      supabase.from('income_sources').select('*').eq('user_id', userId),
      supabase.from('bills').select('*').eq('user_id', userId),
      supabase.from('expenses').select('*').eq('user_id', userId),
      supabase.from('savings_goals').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId),
      supabase.from('rent_entries').select('*').eq('user_id', userId),
      supabase.from('plaid_connections').select('*').eq('user_id', userId).single(),
    ])

    // Map database fields to app format
    const orcaData: OrcaData = {
      user: {
        name: profile.name || '',
        email: profile.email || '',
        onboarded: profile.onboarded || false,
        payFreq: profile.pay_freq || 'biweekly',
        payCycle: profile.pay_cycle || 'standard',
        payRate: profile.pay_rate || '18',
        hoursPerDay: profile.hours_per_day || '8',
        nextPay: profile.next_pay || '',
        creditScore: profile.credit_score || 648,
        utilization: profile.utilization || 34,
        onTime: profile.on_time || 94,
        acctAge: profile.acct_age || 2.5,
        inquiries: profile.inquiries || 3,
        totalDebt: profile.total_debt || 0,
        creditLimit: profile.credit_limit || 12000,
        scoreHistory: profile.score_history || [],
      },
      income: (incomeData || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        amount: i.amount,
        freq: i.freq,
        active: i.active !== false,
      })),
      bills: (billsData || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        cat: b.cat,
        due: b.due,
        freq: b.freq,
        status: b.status,
        alloc: b.alloc || [],
      })),
      expenses: (expensesData || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        amount: e.amount,
        cat: e.cat,
        date: e.date,
      })),
      goals: (goalsData || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        target: g.target,
        current: g.current,
        date: g.date,
        cType: g.c_type,
        cVal: g.c_val,
        active: g.active !== false,
        plaidAccountId: g.plaid_account_id,
      })),
      splitMode: profile.split_mode || 'equal',
      notifs: (notifsData || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read || false,
      })),
      groups: [],
      rent: (rentData || []).map((r: any) => ({
        id: r.id,
        month: r.month,
        amount: r.amount,
        status: r.status,
        reported: r.reported || false,
        rDate: r.r_date || null,
      })),
      plaid: plaidData
        ? {
            connected: plaidData.connected || false,
            accounts: plaidData.accounts || [],
            lastSync: plaidData.last_sync || '',
            checkingBalance: plaidData.checking_balance || 0,
            savingsBalance: plaidData.savings_balance || 0,
            creditUsed: plaidData.credit_used || 0,
            creditLimit: plaidData.credit_limit_plaid || 0,
          }
        : null,
      roommates: {
        enabled: false,
        totalRent: 0,
        utilities: [],
        members: [],
        history: [],
      },
    }

    return orcaData
  } catch (error) {
    console.error('Error loading user data:', error)
    return null
  }
}

/**
 * Save user data to Supabase
 * Maps camelCase app fields to snake_case database fields
 * Uses delete-then-insert strategy for bills/income/expenses/goals
 */
export async function saveUserData(data: OrcaData): Promise<void> {
  const supabase = await createClient()

  // Get current user
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user?.id) {
    throw new Error('No authenticated user')
  }

  const userId = authData.user.id

  try {
    // Update profile
    const profileUpdate = {
      name: data.user.name,
      email: data.user.email,
      onboarded: data.user.onboarded,
      pay_freq: data.user.payFreq,
      pay_cycle: data.user.payCycle,
      pay_rate: data.user.payRate,
      hours_per_day: data.user.hoursPerDay,
      next_pay: data.user.nextPay,
      credit_score: data.user.creditScore,
      utilization: data.user.utilization,
      on_time: data.user.onTime,
      acct_age: data.user.acctAge,
      inquiries: data.user.inquiries,
      total_debt: data.user.totalDebt,
      credit_limit: data.user.creditLimit,
      score_history: data.user.scoreHistory,
      split_mode: data.splitMode,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    if (profileError) throw profileError

    // Delete and re-insert bills
    await supabase.from('bills').delete().eq('user_id', userId)
    if (data.bills.length > 0) {
      const { error: billsError } = await supabase.from('bills').insert(
        data.bills.map((b) => ({
          user_id: userId,
          name: b.name,
          amount: b.amount,
          cat: b.cat,
          due: b.due,
          freq: b.freq,
          status: b.status,
          alloc: b.alloc || [],
        }))
      )
      if (billsError) throw billsError
    }

    // Delete and re-insert income sources
    await supabase.from('income_sources').delete().eq('user_id', userId)
    if (data.income.length > 0) {
      const { error: incomeError } = await supabase.from('income_sources').insert(
        data.income.map((i) => ({
          user_id: userId,
          name: i.name,
          amount: i.amount,
          freq: i.freq,
          active: i.active,
        }))
      )
      if (incomeError) throw incomeError
    }

    // Delete and re-insert expenses
    await supabase.from('expenses').delete().eq('user_id', userId)
    if (data.expenses.length > 0) {
      const { error: expensesError } = await supabase.from('expenses').insert(
        data.expenses.map((e) => ({
          user_id: userId,
          name: e.name,
          amount: e.amount,
          cat: e.cat,
          date: e.date,
        }))
      )
      if (expensesError) throw expensesError
    }

    // Delete and re-insert savings goals
    await supabase.from('savings_goals').delete().eq('user_id', userId)
    if (data.goals.length > 0) {
      const { error: goalsError } = await supabase.from('savings_goals').insert(
        data.goals.map((g) => ({
          user_id: userId,
          name: g.name,
          target: g.target,
          current: g.current,
          date: g.date,
          c_type: g.cType,
          c_val: g.cVal,
          active: g.active,
          plaid_account_id: g.plaidAccountId || null,
        }))
      )
      if (goalsError) throw goalsError
    }

    // Update sync log
    const { error: syncError } = await supabase.from('sync_log').upsert(
      {
        user_id: userId,
        client_type: 'web_app',
        last_sync: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,client_type',
      }
    )
    if (syncError) throw syncError
  } catch (error) {
    console.error('Error saving user data:', error)
    throw error
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.getUser()

  if (error || !authData?.user) {
    return null
  }

  return authData.user
}
