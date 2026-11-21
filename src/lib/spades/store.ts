// Storage abstraction for Spades HQ. Production uses the Supabase store
// (supabaseStore.ts); the test suite uses MemoryStore below, which mirrors
// the unique constraints in supabase-migration-spades.sql so idempotency and
// duplicate protection are exercised by the same service code.

export type Primitive = string | number | boolean | null
export type FilterValue = Primitive | { in: Primitive[] } | { neq: Primitive } | { gte: string | number } | { lt: string | number }
export type Filter = Record<string, FilterValue>
export type Row = Record<string, any>

export interface SelectOpts {
  order?: { col: string; asc?: boolean }[]
  limit?: number
}

export interface Store {
  select<T = Row>(table: string, filter: Filter, opts?: SelectOpts): Promise<T[]>
  insert<T = Row>(table: string, rows: Row | Row[]): Promise<T[]>
  update<T = Row>(table: string, filter: Filter, patch: Row): Promise<T[]>
  remove(table: string, filter: Filter): Promise<number>
  count(table: string, filter: Filter): Promise<number>
  now(): Date
}

export class StoreError extends Error {
  code: 'unique' | 'foreign_key' | 'check' | 'other'
  constructor(code: 'unique' | 'foreign_key' | 'check' | 'other', message: string) {
    super(message)
    this.code = code
  }
}

export function matches(row: Row, filter: Filter): boolean {
  for (const [k, v] of Object.entries(filter)) {
    const cell = row[k] === undefined ? null : row[k]
    if (v !== null && typeof v === 'object') {
      if ('in' in v) { if (!v.in.includes(cell)) return false; continue }
      if ('neq' in v) { if (cell === v.neq) return false; continue }
      if ('gte' in v) { if (cell === null || cell < v.gte) return false; continue }
      if ('lt' in v) { if (cell === null || cell >= v.lt) return false; continue }
    }
    if (cell !== v) return false
  }
  return true
}

interface UniqueRule { cols: string[]; where?: (r: Row) => boolean }

// Keep in sync with the unique indexes in supabase-migration-spades.sql.
export const UNIQUES: Record<string, UniqueRule[]> = {
  sp_tournaments: [{ cols: ['slug'] }],
  sp_teams: [{ cols: ['tournament_id', 'name_key'] }],
  sp_players: [
    { cols: ['tournament_id', 'name_key'] },
    { cols: ['team_id', 'seat'] },
    { cols: ['team_id'], where: r => r.is_captain === true },
  ],
  sp_staff: [],
  sp_tables: [{ cols: ['tournament_id', 'number'] }],
  sp_matches: [{ cols: ['tournament_id', 'round', 'slot'] }],
  sp_hands: [
    { cols: ['match_id', 'hand_number'] },
    { cols: ['match_id'], where: r => r.status !== 'verified' && r.status !== 'void' },
  ],
  sp_bids: [{ cols: ['hand_id', 'player_id'], where: r => r.active === true }],
  sp_book_reports: [{ cols: ['hand_id', 'team_id'], where: r => r.active === true }],
  sp_hand_approvals: [{ cols: ['hand_id', 'team_id'] }],
  sp_score_ledger: [{ cols: ['hand_id', 'team_id'] }],
  sp_disputes: [{ cols: ['hand_id', 'kind'], where: r => r.status === 'open' && r.kind === 'report_mismatch' }],
  sp_invitations: [{ cols: ['token_hash'] }],
  sp_sessions: [{ cols: ['token_hash'] }],
}

const APPEND_ONLY = new Set(['sp_audit'])

export class MemoryStore implements Store {
  tables: Record<string, Row[]> = {}
  clock: Date
  private seq = 0

  constructor(start?: Date) {
    this.clock = start || new Date('2026-11-21T20:00:00-05:00')
  }

  now(): Date {
    return new Date(this.clock.getTime())
  }

  advance(ms: number) {
    this.clock = new Date(this.clock.getTime() + ms)
  }

  private t(table: string): Row[] {
    if (!this.tables[table]) this.tables[table] = []
    return this.tables[table]
  }

  private checkUnique(table: string, candidate: Row, ignore?: Row) {
    for (const rule of UNIQUES[table] || []) {
      if (rule.where && !rule.where(candidate)) continue
      if (rule.cols.some(c => candidate[c] === null || candidate[c] === undefined)) continue
      const clash = this.t(table).find(
        r => r !== ignore && (!rule.where || rule.where(r)) && rule.cols.every(c => r[c] === candidate[c])
      )
      if (clash) throw new StoreError('unique', `duplicate key on ${table}(${rule.cols.join(',')})`)
    }
  }

  async select<T = Row>(table: string, filter: Filter, opts?: SelectOpts): Promise<T[]> {
    let rows = this.t(table).filter(r => matches(r, filter)).map(r => ({ ...r }))
    for (const o of [...(opts?.order || [])].reverse()) {
      rows = rows.sort((x, y) => {
        const a = x[o.col], b = y[o.col]
        if (a === b) return 0
        const res = a === null ? -1 : b === null ? 1 : a < b ? -1 : 1
        return o.asc === false ? -res : res
      })
    }
    if (opts?.limit) rows = rows.slice(0, opts.limit)
    return rows as T[]
  }

  async insert<T = Row>(table: string, rows: Row | Row[]): Promise<T[]> {
    const list = Array.isArray(rows) ? rows : [rows]
    const out: Row[] = []
    for (const raw of list) {
      const row: Row = { ...raw }
      if (table === 'sp_audit') row.id = ++this.seq
      else if (!row.id) row.id = `mem-${table}-${++this.seq}`
      if (!row.created_at) row.created_at = this.now().toISOString()
      if (table === 'sp_book_reports' && row.books_a + row.books_b !== 13) throw new StoreError('check', 'books must total 13')
      if (table === 'sp_bids' && (row.bid < 0 || row.bid > 13)) throw new StoreError('check', 'bid out of range')
      this.checkUnique(table, row)
      this.t(table).push(row)
      out.push({ ...row })
    }
    return out as T[]
  }

  async update<T = Row>(table: string, filter: Filter, patch: Row): Promise<T[]> {
    if (APPEND_ONLY.has(table)) throw new StoreError('other', `${table} is append only`)
    const hits = this.t(table).filter(r => matches(r, filter))
    for (const r of hits) this.checkUnique(table, { ...r, ...patch }, r)
    for (const r of hits) Object.assign(r, patch)
    return hits.map(r => ({ ...r })) as T[]
  }

  async remove(table: string, filter: Filter): Promise<number> {
    if (APPEND_ONLY.has(table)) {
      // Mirrors the trigger: only audit rows of test events may be deleted.
      const hits = this.t(table).filter(r => matches(r, filter))
      const testIds = new Set(this.t('sp_tournaments').filter(t => t.is_test).map(t => t.id))
      if (!hits.every(r => testIds.has(r.tournament_id))) throw new StoreError('other', `${table} is append only`)
    }
    const before = this.t(table).length
    this.tables[table] = this.t(table).filter(r => !matches(r, filter))
    return before - this.tables[table].length
  }

  async count(table: string, filter: Filter): Promise<number> {
    return this.t(table).filter(r => matches(r, filter)).length
  }
}
