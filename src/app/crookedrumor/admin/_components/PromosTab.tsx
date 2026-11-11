'use client'

import { Plus } from 'lucide-react'
import type { Promo, SiteDoc } from '@/lib/crooked/types'
import type { SetDoc } from './AdminApp'
import { Chip } from './AddonsTab'
import { Field, Money, RowActions, Text, Toggle, move, newId } from './ui'

export default function PromosTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const upd = (id: string, patch: Partial<Promo>) => setDoc(d => ({ ...d, promos: d.promos.map(p => (p.id === id ? { ...p, ...patch } : p)) }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="cr-display text-3xl">Promo codes</h2>
          <p className="text-sm text-[var(--cr-muted)] mt-1">Clients enter these at checkout. The promo box only appears when at least one code is active.</p>
        </div>
        <button
          onClick={() =>
            setDoc(d => ({
              ...d,
              promos: [...d.promos, { id: newId('promo'), code: '', label: '', kind: 'percent', amount: 10, active: false, expiresAt: null, minCents: 0, maxUses: null, categoryIds: [] }],
            }))
          }
          className="cr-btn cr-btn-ink cr-btn-sm"
        >
          <Plus size={14} strokeWidth={3} /> New promo
        </button>
      </div>

      {doc.promos.length === 0 && <p className="font-semibold">No promo codes yet.</p>}

      {doc.promos.map((p, i) => (
        <div key={p.id} className={`cr-card-flat !border-[3px] p-4 ${!p.active ? 'opacity-70' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Toggle on={p.active} onChange={v => upd(p.id, { active: v })} label={p.active ? 'Active' : 'Off'} />
            <RowActions
              index={i}
              count={doc.promos.length}
              onMove={dir => setDoc(d => ({ ...d, promos: move(d.promos, i, dir) }))}
              onDelete={() => setDoc(d => ({ ...d, promos: d.promos.filter(x => x.id !== p.id) }))}
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Code"><Text value={p.code} onChange={v => upd(p.id, { code: v.toUpperCase().replace(/\s/g, '') })} placeholder="SUMMER20" /></Field>
            <Field label="Label (shown to client)"><Text value={p.label} onChange={v => upd(p.id, { label: v })} placeholder="20% off summer shoots" /></Field>
            <Field label="Discount type">
              <select className="cr-input !text-[15px] !py-2.5" value={p.kind} onChange={e => upd(p.id, { kind: e.target.value as Promo['kind'], amount: e.target.value === 'percent' ? 10 : 1000 })}>
                <option value="percent">Percent off</option>
                <option value="fixed">Dollars off</option>
              </select>
            </Field>
            <Field label={p.kind === 'percent' ? 'Percent off' : 'Dollars off'}>
              {p.kind === 'percent' ? (
                <input className="cr-input !text-[15px] !py-2.5" inputMode="numeric" value={p.amount} onChange={e => upd(p.id, { amount: Math.min(100, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
              ) : (
                <Money cents={p.amount} onChange={v => upd(p.id, { amount: v ?? 0 })} />
              )}
            </Field>
            <Field label="Expires (optional)"><input type="date" className="cr-input !text-[15px] !py-2.5" value={p.expiresAt || ''} onChange={e => upd(p.id, { expiresAt: e.target.value || null })} /></Field>
            <Field label="Minimum order"><Money cents={p.minCents} onChange={v => upd(p.id, { minCents: v ?? 0 })} /></Field>
            <Field label="Max uses (optional)" hint="Counts paid bookings">
              <input className="cr-input !text-[15px] !py-2.5" inputMode="numeric" placeholder="Unlimited" value={p.maxUses ?? ''} onChange={e => upd(p.id, { maxUses: e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-black uppercase tracking-[0.1em] mb-1.5">Works on</div>
            <div className="flex flex-wrap gap-2">
              <Chip on={p.categoryIds.length === 0} onClick={() => upd(p.id, { categoryIds: [] })}>Everything</Chip>
              {doc.categories.map(c => {
                const on = p.categoryIds.includes(c.id)
                return <Chip key={c.id} on={on} onClick={() => upd(p.id, { categoryIds: on ? p.categoryIds.filter(x => x !== c.id) : [...p.categoryIds, c.id] })}>{c.name}</Chip>
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
