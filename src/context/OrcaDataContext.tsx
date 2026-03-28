'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrcaData } from '@/lib/types'
import { getNewUserData } from '@/lib/demo-data'

interface OrcaDataContextType {
  data: OrcaData
  setData: React.Dispatch<React.SetStateAction<OrcaData>>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  save: (data: OrcaData) => Promise<void>
  syncToCloud: () => Promise<void>
}

const OrcaDataContext = createContext<OrcaDataContextType | null>(null)

export function useOrcaData() {
  const ctx = useContext(OrcaDataContext)
  if (!ctx) throw new Error('useOrcaData must be used within OrcaDataProvider')
  return ctx
}

// Empty data for initial state before load
const EMPTY_DATA: OrcaData = getNewUserData('', '')

export function OrcaDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OrcaData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user?.id) {
        setData(EMPTY_DATA)
        setLoading(false)
        return
      }

      const userId = authData.user.id
      const userEmail = authData.user.email || ''
      const userName = authData.user.user_metadata?.full_name
        || authData.user.user_metadata?.display_name
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
        // New user - use blank data with their name/email
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
    // Import and call the server action
    const { saveUserData } = await import('@/lib/supabase/data')
    await saveUserData(newData)
    setData(newData)
  }, [])

  // ── Cross-device localStorage sync ──
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)

  const SYNC_KEYS = useMemo(() => [
    'orca-bills',
    'orca-user-settings',
    'orca-savings-accounts',
    'orca-payment-entries',
    'orca-paycheck-history',
    'orca-tasks',
    'orca-notes',
    'orca-stack-circle-groups',
    'orca-roommates',
    'orca-dashboard-order',
    'orca-dashboard-pinned',
    'orca-theme-id',
    'orca-admin-nav',
  ], [])

  // Push current localStorage to Supabase profiles.local_data
  const syncToCloud = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid) return
    const localData: Record<string, any> = {}
    let keyCount = 0
    for (const key of SYNC_KEYS) {
      try {
        const val = localStorage.getItem(key)
        if (val !== null) {
          try { localData[key] = JSON.parse(val) } catch { localData[key] = val }
          keyCount++
        }
      } catch {}
    }
    try {
      const { error } = await supabase.from('profiles').update({ local_data: localData }).eq('id', uid)
      if (error) {
        console.warn('[ORCA Sync] Cloud push failed:', error.message)
      } else {
        console.log(`[ORCA Sync] Pushed ${keyCount} keys to cloud`)
      }
    } catch (err) {
      console.warn('[ORCA Sync] Cloud sync error:', err)
    }
  }, [supabase, SYNC_KEYS])

  // Debounced auto-sync: call after any localStorage write
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => { syncToCloud() }, 2000)
  }, [syncToCloud])

  // On initial load: pull cloud local_data and hydrate localStorage (always overwrite for cross-device sync)
  useEffect(() => {
    async function hydrateFromCloud() {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user?.id) return
        userIdRef.current = authData.user.id

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('local_data')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          console.warn('[ORCA Sync] Could not fetch cloud data:', profileError.message)
          // Still push local data to cloud so other devices can pick it up
          debouncedSync()
          return
        }

        if (profile?.local_data && typeof profile.local_data === 'object') {
          const cloud = profile.local_data as Record<string, any>
          let hydrated = 0
          for (const key of SYNC_KEYS) {
            if (cloud[key] !== undefined) {
              const val = typeof cloud[key] === 'string' ? cloud[key] : JSON.stringify(cloud[key])
              // Always overwrite local with cloud data to ensure cross-device consistency
              localStorage.setItem(key, val)
              hydrated++
            }
          }
          console.log(`[ORCA Sync] Hydrated ${hydrated} keys from cloud`)
          // Signal that cloud data has been hydrated — components can re-read
          window.dispatchEvent(new Event('orca-sync-ready'))
        } else {
          console.log('[ORCA Sync] No cloud data found — pushing local data to cloud')
          // First time: push local state to cloud for other devices
          syncToCloud()
        }
      } catch (err) {
        console.warn('[ORCA Sync] Hydration error (local_data column may not exist):', err)
        // Push local to cloud anyway in case column now exists
        debouncedSync()
      }
    }
    hydrateFromCloud()
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current) }
  }, [supabase, SYNC_KEYS, syncToCloud, debouncedSync])

  // Listen for localStorage writes (cross-tab and programmatic) to auto-sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key)) debouncedSync()
    }
    const handleCustom = () => debouncedSync()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orca-local-write', handleCustom)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orca-local-write', handleCustom)
    }
  }, [debouncedSync, SYNC_KEYS])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Re-load data after cloud hydration to pick up synced localStorage values
  useEffect(() => {
    const handleSyncReady = () => {
      console.log('[ORCA Sync] Cloud hydration complete — reloading data context')
      loadData()
    }
    window.addEventListener('orca-sync-ready', handleSyncReady)
    return () => window.removeEventListener('orca-sync-ready', handleSyncReady)
  }, [loadData])

  return (
    <OrcaDataContext.Provider value={{ data, setData, loading, error, refresh: loadData, save, syncToCloud }}>
      {children}
    </OrcaDataContext.Provider>
  )
}
