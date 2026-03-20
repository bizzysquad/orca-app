import { SupabaseClient } from '@supabase/supabase-js'
import type { User, IncomeSource, Bill, Expense, SavingsGoal, StackGroup, Notification } from '../types'

// ============== User ==============
export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data: data as User | null, error }
}

export async function updateUserProfile(supabase: SupabaseClient, userId: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ============== Income Sources ==============
export async function getIncomeSources(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: (data || []) as IncomeSource[], error }
}

export async function upsertIncomeSource(supabase: SupabaseClient, source: Partial<IncomeSource>) {
  const { data, error } = await supabase
    .from('income_sources')
    .upsert(source)
    .select()
    .single()
  return { data, error }
}

export async function deleteIncomeSource(supabase: SupabaseClient, id: string) {
  return supabase.from('income_sources').delete().eq('id', id)
}

// ============== Bills ==============
export async function getBills(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
  return { data: (data || []) as Bill[], error }
}

export async function upsertBill(supabase: SupabaseClient, bill: Partial<Bill>) {
  const { data, error } = await supabase
    .from('bills')
    .upsert(bill)
    .select()
    .single()
  return { data, error }
}

export async function deleteBill(supabase: SupabaseClient, id: string) {
  return supabase.from('bills').delete().eq('id', id)
}

// ============== Expenses ==============
export async function getExpenses(supabase: SupabaseClient, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
  return { data: (data || []) as Expense[], error }
}

export async function upsertExpense(supabase: SupabaseClient, expense: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .upsert(expense)
    .select()
    .single()
  return { data, error }
}

export async function deleteExpense(supabase: SupabaseClient, id: string) {
  return supabase.from('expenses').delete().eq('id', id)
}

// ============== Savings Goals ==============
export async function getSavingsGoals(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: (data || []) as SavingsGoal[], error }
}

export async function upsertSavingsGoal(supabase: SupabaseClient, goal: Partial<SavingsGoal>) {
  const { data, error } = await supabase
    .from('savings_goals')
    .upsert(goal)
    .select()
    .single()
  return { data, error }
}

export async function deleteSavingsGoal(supabase: SupabaseClient, id: string) {
  return supabase.from('savings_goals').delete().eq('id', id)
}

// ============== Stack Circle Groups ==============
export async function getGroups(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      members:group_members(*),
      activities:group_activity(*)
    `)
    .or(`created_by.eq.${userId},members.user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  return { data: (data || []) as StackGroup[], error }
}

// ============== Notifications ==============
export async function getNotifications(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return { data: (data || []) as Notification[], error }
}

export async function markNotificationRead(supabase: SupabaseClient, id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string) {
  return supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
}

// ============== Founding User Check ==============
export async function getFoundingUserCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_founding_user', true)
  return { count: count || 0, error }
}
