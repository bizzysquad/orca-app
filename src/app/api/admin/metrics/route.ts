import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_TOKEN = 'orca-admin-session-2026'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(url, serviceKey)
}

/**
 * GET /api/admin/metrics — Platform-wide metrics (bypasses RLS)
 */
export async function GET(request: NextRequest) {
  if (request.cookies.get('orca-admin-token')?.value !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const [billsRes, expensesRes, goalsRes, incomeRes] = await Promise.all([
      supabase.from('bills').select('id', { count: 'exact', head: true }),
      supabase.from('expenses').select('id', { count: 'exact', head: true }),
      supabase.from('savings_goals').select('id', { count: 'exact', head: true }),
      supabase.from('income_sources').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      totalBills: billsRes.count || 0,
      totalExpenses: expensesRes.count || 0,
      totalGoals: goalsRes.count || 0,
      totalIncome: incomeRes.count || 0,
    })
  } catch (err: any) {
    console.error('Admin metrics API error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
