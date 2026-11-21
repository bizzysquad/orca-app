import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { StoreError, type Filter, type Row, type SelectOpts, type Store } from './store.ts'

// Server-only Supabase implementation of Store. Uses the service role key,
// which bypasses RLS; the sp_* tables have RLS on with no policies so the
// anon key used by browsers can never touch them.

function applyFilter(q: any, filter: Filter): any {
  for (const [k, v] of Object.entries(filter)) {
    if (v === null) q = q.is(k, null)
    else if (typeof v === 'object') {
      if ('in' in v) q = q.in(k, v.in)
      else if ('neq' in v) q = v.neq === null ? q.not(k, 'is', null) : q.or(`${k}.is.null,${k}.neq.${v.neq}`)
      else if ('gte' in v) q = q.gte(k, v.gte)
      else if ('lt' in v) q = q.lt(k, v.lt)
    } else q = q.eq(k, v)
  }
  return q
}

function mapError(err: { code?: string; message: string }): never {
  if (err.code === '23505') throw new StoreError('unique', err.message)
  if (err.code === '23503') throw new StoreError('foreign_key', err.message)
  if (err.code === '23514') throw new StoreError('check', err.message)
  throw new StoreError('other', err.message)
}

export class SupabaseStore implements Store {
  db: SupabaseClient
  constructor(db: SupabaseClient) {
    this.db = db
  }

  now() {
    return new Date()
  }

  async select<T = Row>(table: string, filter: Filter, opts?: SelectOpts): Promise<T[]> {
    let q = applyFilter(this.db.from(table).select('*'), filter)
    for (const o of opts?.order || []) q = q.order(o.col, { ascending: o.asc !== false })
    if (opts?.limit) q = q.limit(opts.limit)
    else q = q.limit(5000)
    const { data, error } = await q
    if (error) mapError(error)
    return (data || []) as T[]
  }

  async insert<T = Row>(table: string, rows: Row | Row[]): Promise<T[]> {
    const { data, error } = await this.db.from(table).insert(rows as any).select('*')
    if (error) mapError(error)
    return (data || []) as T[]
  }

  async update<T = Row>(table: string, filter: Filter, patch: Row): Promise<T[]> {
    const { data, error } = await applyFilter(this.db.from(table).update(patch), filter).select('*')
    if (error) mapError(error)
    return (data || []) as T[]
  }

  async remove(table: string, filter: Filter): Promise<number> {
    if (!Object.keys(filter).length) throw new StoreError('other', 'refusing unfiltered delete')
    const { error, count } = await applyFilter(this.db.from(table).delete({ count: 'exact' }), filter)
    if (error) mapError(error)
    return count || 0
  }

  async count(table: string, filter: Filter): Promise<number> {
    const { error, count } = await applyFilter(this.db.from(table).select('id', { count: 'exact', head: true }), filter)
    if (error) mapError(error)
    return count || 0
  }
}

let cached: SupabaseStore | null = null
export function getSpadesStore(): SupabaseStore {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new StoreError('other', 'Supabase is not configured on the server')
    cached = new SupabaseStore(
      createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      })
    )
  }
  return cached
}
