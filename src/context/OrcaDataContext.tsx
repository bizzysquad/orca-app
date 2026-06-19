'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrcaData } from '@/lib/types'
import { getNewUserData } from '@/lib/demo-data'
import {
  fullSync,
  pushToCloud,
  debouncedSync,
  subscribeSyncState,
  SYNC_KEYS,
  type SyncState,
  type SyncStatus,
} from '@/lib/syncEngine'

interface OrcaDataContextType {
  data: OrcaData
  setData: React.Dispatch<React.SetStateAction<OrcaData>>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  save: (data: OrcaData) => Promise<void>
  syncToCloud: () => Promise<void>
  syncState: SyncState
  forceSync: () => Promise<{ ok: boolean; error?: string }>
}

const OrcaDataContext = createContext<OrcaDataContextType | null>(null)

export function useOrcaData() {
  const ctx = useContext(OrcaDataContext)
  if (!ctx) throw new Error('useOrcaData must be used within OrcaDataProvider')
  return ctx
}

const EMPTY_DATA: OrcaData = getNewUserData('', '')

export function OrcaDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OrcaData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncTime: null,
    lastError: null,
    localGigCount: 0,
    cloudGigCount: 0,
    userId: null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  })

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  // Subscribe to sync engine state
  useEffect(() => {
    return subscribeSyncState(setSyncState)
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user?.id) {
        // Try session refresh for PWA/standalone mode
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (!refreshed?.user?.id) {
          setData(EMPTY_DATA)
          setLoading(false)
          return
        }
      }

      const user = authData?.user || (await supabase.auth.getUser()).data?.user
      if (!user?.id) {
        setData(EMPTY_DATA)
        setLoading(false)
        return
      }

      const userId = user.id
      const userEmail = user.email || ''
      const userName = user.user_metadata?.full_name
        || user.user_metadata?.display_name
        || userEmail.split('@')[0]
        || ''

      // Load all data in parallel
      const [
        { data: profile },
        { data: incomeData },
        { data: billsData },
        { data: expensesData },
        { data: goalsData },
        { data: notifsData },
        { data: rentData },
        { data: plaidData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('income_sources').select('*').eq('user_id', userId),
        supabase.from('bills').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('savings_goals').select('*').eq('user_id', userId),
        supabase.from('notifications').select('*').eq('user_id', userId),
        supabase.from('rent_entries').select('*').eq('user_id', userId),
        supabase.from('plaid_connections').select('*').eq('user_id', userId).single(),
      ])

      if (!profile) {
        setData(getNewUserData(userName, userEmail))
        setLoading(false)
        return
      }

      const orcaData: OrcaData = {
        user: {
          name: profile.name || userName,
          email: profile.email || userEmail,
          onboarded: profile.onboarded || false,
          employmentType: profile.employment_type || 'employed',
          incomeMode: profile.income_mode || 'paycheck',
          payFreq: profile.pay_freq || 'biweekly',
          payCycle: profile.pay_cycle || 'standard',
          payRate: profile.pay_rate || '0',
          hoursPerDay: profile.hours_per_day || '8',
          nextPay: profile.next_pay || '',
          grossIncome: profile.gross_income || 0,
          netIncome: profile.net_income || 0,
          dailyIncome: profile.daily_income || 0,
          weeklyIncome: profile.weekly_income || 0,
          manualCashInput: profile.manual_cash_input || 0,
          selfEmployedInputMethod: profile.self_employed_input_method || 'weekly',
          safeToSpendBuffer: profile.safe_to_spend_buffer || 0,
          checkingBalance: profile.checking_balance || 0,
          rentAmount: profile.rent_amount || 0,
          creditScore: profile.credit_score || 0,
          creditScoreTransUnion: profile.credit_score_transunion || 0,
          creditScoreEquifax: profile.credit_score_equifax || 0,
          creditScoreExperian: profile.credit_score_experian || 0,
          utilization: profile.utilization || 0,
          onTime: profile.on_time || 0,
          acctAge: profile.acct_age || 0,
          inquiries: profile.inquiries || 0,
          totalDebt: profile.total_debt || 0,
          creditLimit: profile.credit_limit || 0,
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
          recurrence: b.recurrence || 'monthly',
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

      // Merge in any locally saved user settings
      try {
        const savedSettings = localStorage.getItem('orca-user-settings')
        if (savedSettings) {
          const localUser = JSON.parse(savedSettings)
          orcaData.user = { ...orcaData.user, ...localUser }
        }
      } catch {}

      // Merge in locally saved bills
      try {
        const savedBills = localStorage.getItem('orca-bills')
        if (savedBills && (!orcaData.bills || orcaData.bills.length === 0)) {
          orcaData.bills = JSON.parse(savedBills)
        }
      } catch {}

      setData(orcaData)
    } catch (err: any) {
      console.error('Error loading user data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const save = useCallback(async (newData: OrcaData) => {
    const { saveUserData } = await import('@/lib/supabase/data')
    await saveUserData(newData)
    setData(newData)
  }, [])

  // ── Cross-device sync via syncEngine ──
  const syncToCloud = useCallback(async () => {
    await pushToCloud()
  }, [])

  const forceSync = useCallback(async () => {
    const result = await fullSync()
    if (result.ok) {
      await loadData()
    }
    return result
  }, [loadData])

  // On initial load: run full bidirectional sync
  useEffect(() => {
    async function initialSync() {
      const result = await fullSync()
      if (result.ok) {
        console.log('[ORCA] Initial sync complete')
      } else {
        console.warn('[ORCA] Initial sync issue:', result.error)
        // Even if sync fails, still push local data if we have any
        await pushToCloud()
      }
    }
    initialSync()
  }, [])

  // Listen for localStorage writes to auto-sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key as any)) debouncedSync()
    }
    const handleCustom = () => debouncedSync()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orca-local-write', handleCustom)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orca-local-write', handleCustom)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Re-load data after cloud hydration
  useEffect(() => {
    const handleSyncReady = () => {
      console.log('[ORCA] Sync complete — reloading data context')
      loadData()
    }
    window.addEventListener('orca-sync-ready', handleSyncReady)
    return () => window.removeEventListener('orca-sync-ready', handleSyncReady)
  }, [loadData])

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[ORCA] Back online — syncing')
      fullSync()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <OrcaDataContext.Provider value={{
      data, setData, loading, error,
      refresh: loadData, save, syncToCloud,
      syncState, forceSync,
    }}>
      {children}
    </OrcaDataContext.Provider>
  )
}
