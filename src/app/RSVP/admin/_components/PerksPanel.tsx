'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Gift, Loader2, Pause, Pencil, Play, Plus, Send, Trash2, UserX, X } from 'lucide-react'

interface PerkStats {
  issued: number
  redemptions: number
  guestsRedeemed: number
  timeline: string[]
  byStaff: { name: string; count: number }[]
  voided: { ticket_id: string; holder_name: string; ticket_number: string }[]
}
interface Perk {
  id: string
  name: string
  description: string
  delivery: 'ticket' | 'separate'
  uses_per_guest: number | null
  total_cap: number | null
  valid_from: string | null
  valid_until: string | null
  eligibility: 'all' | 'first_n' | 'checked_in'
  first_n: number | null
  is_paused: boolean
  stats: PerkStats
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold-liquid/50 transition'

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)
const fmtShort = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

const EMPTY = {
  name: '', description: '', delivery: 'ticket' as 'ticket' | 'separate', uses_per_guest: '1', total_cap: '',
  valid_from: '', valid_until: '', eligibility: 'all' as 'all' | 'first_n' | 'checked_in', first_n: '',
}
type Draft = typeof EMPTY

function draftFrom(p: Perk): Draft {
  return {
    name: p.name, description: p.description, delivery: p.delivery,
    uses_per_guest: p.uses_per_guest == null ? '' : String(p.uses_per_guest),
    total_cap: p.total_cap == null ? '' : String(p.total_cap),
    valid_from: toLocalInput(p.valid_from), valid_until: toLocalInput(p.valid_until),
    eligibility: p.eligibility, first_n: p.first_n == null ? '' : String(p.first_n),
  }
}

function summary(p: Perk) {
  const bits = [
    p.delivery === 'ticket' ? 'On their ticket' : 'Separate QR code',
    p.uses_per_guest == null ? 'unlimited uses' : `${p.uses_per_guest} per guest`,
    p.total_cap ? `first ${p.total_cap} redemptions` : null,
    p.eligibility === 'first_n' && p.first_n ? `first ${p.first_n} RSVPs` : p.eligibility === 'checked_in' ? 'checked-in guests' : null,
    p.valid_from || p.valid_until ? [p.valid_from && fmtShort(p.valid_from), p.valid_until && fmtShort(p.valid_until)].filter(Boolean).join(' to ') : null,
  ]
  return bits.filter(Boolean).join(' · ')
}

function HourlyChart({ timeline }: { timeline: string[] }) {
  if (!timeline.length) return <p className="text-2xs text-text-muted">No redemptions yet.</p>
  const buckets = new Map<string, number>()
  for (const iso of timeline) {
    const d = new Date(iso)
    d.setMinutes(0, 0, 0)
    const key = d.toISOString()
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  const rows = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b))
  const max = Math.max(...rows.map(([, n]) => n))
  return (
    <div className="space-y-1">
      {rows.map(([hour, n]) => (
        <div key={hour} className="flex items-center gap-2 text-2xs">
          <span className="w-20 shrink-0 text-text-muted">{fmtShort(hour)}</span>
          <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden">
            <div className="h-full bg-gold-gradient rounded" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="w-6 text-right font-bold text-text-primary tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  )
}

export default function PerksPanel({ eventId, flash }: { eventId: string; flash: (msg: string, isError?: boolean) => void }) {
  const [perks, setPerks] = useState<Perk[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [openStats, setOpenStats] = useState<string | null>(null)
  const [voidQuery, setVoidQuery] = useState('')

  const load = useCallback(() => {
    fetch(`/api/rsvp/events/${eventId}/perks`)
      .then(res => (res.ok ? res.json() : { perks: [] }))
      .then(d => setPerks(d.perks || []))
      .finally(() => setLoading(false))
  }, [eventId])
  useEffect(load, [load])

  // Live counters while the panel is open during the event
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const set = (k: keyof Draft, v: string) => setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        ...draft,
        uses_per_guest: draft.uses_per_guest === '' ? null : Number(draft.uses_per_guest),
        total_cap: draft.total_cap === '' ? null : Number(draft.total_cap),
        first_n: draft.first_n === '' ? null : Number(draft.first_n),
        valid_from: fromLocalInput(draft.valid_from),
        valid_until: fromLocalInput(draft.valid_until),
      }
      const res = await fetch(editing === 'new' ? `/api/rsvp/events/${eventId}/perks` : `/api/rsvp/perks/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      flash(editing === 'new' ? (d.sent ? `Perk added and sent to ${d.sent} guests` : 'Perk added') : 'Perk saved')
      setEditing(null)
      load()
    } catch (e: any) {
      flash(e.message || 'Failed to save perk', true)
    } finally {
      setSaving(false)
    }
  }

  const act = async (p: Perk, kind: 'pause' | 'delete' | 'send') => {
    if (kind === 'delete' && !confirm(`Delete "${p.name}"? Its redemption history is deleted too.`)) return
    setBusy(p.id + kind)
    try {
      const res =
        kind === 'pause'
          ? await fetch(`/api/rsvp/perks/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_paused: !p.is_paused }) })
          : kind === 'delete'
          ? await fetch(`/api/rsvp/perks/${p.id}`, { method: 'DELETE' })
          : await fetch(`/api/rsvp/perks/${p.id}/send`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      if (kind === 'send') flash(d.sent ? `Sent to ${d.sent} more guests` : 'Everyone eligible already has their code')
      if (kind === 'pause') flash(p.is_paused ? 'Perk resumed' : 'Perk paused. Scans will be declined.')
      load()
    } catch (e: any) {
      flash(e.message || 'Something went wrong', true)
    } finally {
      setBusy(null)
    }
  }

  const setVoid = async (p: Perk, query: string, voided: boolean) => {
    if (!query.trim()) return
    const res = await fetch(`/api/rsvp/perks/${p.id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), voided }),
    })
    const d = await res.json()
    if (!res.ok) return flash(d.error, true)
    flash(voided ? `Voided for ${d.tickets.map((t: any) => t.holder_name).join(', ')}` : 'Restored')
    setVoidQuery('')
    load()
  }

  const form = (
    <div className="border border-gold-liquid/30 rounded-xl p-4 space-y-3 bg-gold-liquid/[0.03]">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={inputCls} placeholder='Perk name, e.g. "$5 off any drink"' value={draft.name} onChange={e => set('name', e.target.value)} />
        <input className={inputCls} placeholder="Details (optional), e.g. Well drinks only" value={draft.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-text-secondary mb-1.5">How guests get it</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {([
            { v: 'ticket', t: 'On their ticket', d: 'Shows on the virtual ticket. Same QR for entry and perks.' },
            { v: 'separate', t: 'Separate QR code', d: 'Emailed as its own perk code with its own page.' },
          ] as const).map(o => (
            <button
              key={o.v}
              type="button"
              onClick={() => set('delivery', o.v)}
              className={`text-left p-3 rounded-lg border transition ${draft.delivery === o.v ? 'border-gold bg-gold-liquid/10' : 'border-surface-border hover:border-white/20'}`}
            >
              <p className={`text-sm font-bold ${draft.delivery === o.v ? 'text-gold' : 'text-text-primary'}`}>{o.t}</p>
              <p className="text-2xs text-text-muted mt-0.5">{o.d}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="text-2xs text-text-secondary">Uses per guest
          <input type="number" min={1} className={inputCls + ' mt-1'} placeholder="Unlimited" value={draft.uses_per_guest} onChange={e => set('uses_per_guest', e.target.value)} />
        </label>
        <label className="text-2xs text-text-secondary">Total cap
          <input type="number" min={1} className={inputCls + ' mt-1'} placeholder="No cap" value={draft.total_cap} onChange={e => set('total_cap', e.target.value)} />
        </label>
        <label className="text-2xs text-text-secondary">Starts
          <input type="datetime-local" className={inputCls + ' mt-1'} value={draft.valid_from} onChange={e => set('valid_from', e.target.value)} />
        </label>
        <label className="text-2xs text-text-secondary">Ends
          <input type="datetime-local" className={inputCls + ' mt-1'} value={draft.valid_until} onChange={e => set('valid_until', e.target.value)} />
        </label>
      </div>
      <p className="text-2xs text-text-muted -mt-1">Uses per guest scale with party size: 1 per guest means a party of 3 gets 3. Leave a box empty for no limit.</p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-2xs text-text-secondary">Who gets it
          <select className={inputCls + ' mt-1 min-w-[200px]'} value={draft.eligibility} onChange={e => set('eligibility', e.target.value)}>
            <option value="all">Everyone who RSVPs</option>
            <option value="first_n">First N RSVPs</option>
            <option value="checked_in">Only checked-in guests</option>
          </select>
        </label>
        {draft.eligibility === 'first_n' && (
          <label className="text-2xs text-text-secondary">How many
            <input type="number" min={1} className={inputCls + ' mt-1 w-28'} value={draft.first_n} onChange={e => set('first_n', e.target.value)} />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary">Cancel</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold disabled:opacity-60">
          {saving && <Loader2 size={12} className="animate-spin" />} {editing === 'new' ? (draft.delivery === 'separate' ? 'Add & Send' : 'Add Perk') : 'Save Perk'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary uppercase tracking-wide"><Gift size={16} className="text-gold" /> Event Perks</h2>
        {editing === null && (
          <button onClick={() => { setDraft(EMPTY); setEditing('new') }} className="flex items-center gap-1.5 text-2xs font-semibold text-gold">
            <Plus size={13} /> Add Perk
          </button>
        )}
      </div>
      <p className="text-2xs text-text-muted mb-5">
        Drink discounts, free entry before a time, anything you want. Staff redeem them with the <a href="/RSVP/scan" className="text-gold font-semibold">Perk Scanner</a>.
      </p>

      {editing === 'new' && <div className="mb-4">{form}</div>}

      {loading ? (
        <Loader2 className="animate-spin text-gold mx-auto" size={20} />
      ) : perks.length === 0 && editing !== 'new' ? (
        <p className="text-sm text-text-secondary text-center py-6 border border-dashed border-surface-border rounded-xl">No perks yet.</p>
      ) : (
        <div className="space-y-3">
          {perks.map(p =>
            editing === p.id ? (
              <div key={p.id}>{form}</div>
            ) : (
              <div key={p.id} className={`border rounded-xl p-4 ${p.is_paused ? 'border-amber-500/40 bg-amber-500/5' : 'border-surface-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary flex items-center gap-2">
                      {p.name}
                      {p.is_paused && <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Paused</span>}
                    </p>
                    {p.description && <p className="text-2xs text-text-secondary">{p.description}</p>}
                    <p className="text-2xs text-text-muted mt-1">{summary(p)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => act(p, 'pause')} disabled={!!busy} title={p.is_paused ? 'Resume' : 'Pause'} className="p-2 rounded-lg text-text-secondary hover:text-amber-300 hover:bg-white/5">
                      {p.is_paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    {p.delivery === 'separate' && (
                      <button onClick={() => act(p, 'send')} disabled={!!busy} title="Send codes to new guests" className="p-2 rounded-lg text-text-secondary hover:text-gold hover:bg-white/5">
                        {busy === p.id + 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    )}
                    <button onClick={() => { setDraft(draftFrom(p)); setEditing(p.id) }} title="Edit" className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5"><Pencil size={14} /></button>
                    <button onClick={() => act(p, 'delete')} disabled={!!busy} title="Delete" className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Headline stats */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Issued', value: p.stats.issued },
                    { label: 'Redeemed', value: p.stats.redemptions },
                    { label: 'Guests used', value: p.stats.issued ? `${Math.round((p.stats.guestsRedeemed / p.stats.issued) * 100)}%` : '0%' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="text-lg font-extrabold text-text-primary tabular-nums">{s.value}</div>
                      <div className="text-2xs text-text-muted">{s.label}</div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setOpenStats(o => (o === p.id ? null : p.id))} className="mt-3 flex items-center gap-1 text-2xs font-semibold text-gold">
                  <BarChart3 size={12} /> {openStats === p.id ? 'Hide details' : 'Analytics & guest controls'}
                </button>

                {openStats === p.id && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-4 pt-3 border-t border-surface-border">
                    <div>
                      <p className="text-2xs font-bold text-text-secondary uppercase tracking-wider mb-2">Redemptions by hour</p>
                      <HourlyChart timeline={p.stats.timeline} />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-2xs font-bold text-text-secondary uppercase tracking-wider mb-2">By staff</p>
                        {p.stats.byStaff.length === 0 ? (
                          <p className="text-2xs text-text-muted">No redemptions yet.</p>
                        ) : (
                          p.stats.byStaff.map(s => (
                            <div key={s.name} className="flex justify-between text-xs py-0.5">
                              <span className="text-text-secondary">{s.name}</span>
                              <span className="font-bold text-text-primary tabular-nums">{s.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <p className="text-2xs font-bold text-text-secondary uppercase tracking-wider mb-2">Void for a guest</p>
                        <div className="flex gap-2">
                          <input className={inputCls} placeholder="Ticket # or email" value={voidQuery} onChange={e => setVoidQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && setVoid(p, voidQuery, true)} />
                          <button onClick={() => setVoid(p, voidQuery, true)} className="px-3 rounded-lg border border-danger/40 text-danger text-xs font-bold flex items-center gap-1"><UserX size={13} /> Void</button>
                        </div>
                        {p.stats.voided.map(v => (
                          <div key={v.ticket_id} className="flex items-center justify-between text-2xs mt-1.5">
                            <span className="text-text-secondary">{v.holder_name} <span className="text-text-muted">{v.ticket_number}</span></span>
                            <button onClick={() => setVoid(p, v.ticket_id, false)} className="flex items-center gap-0.5 text-gold font-semibold"><X size={11} /> Restore</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
