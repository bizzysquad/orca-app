'use client'

import { Plus } from 'lucide-react'
import type { Addon, SiteDoc } from '@/lib/crooked/types'
import type { SetDoc } from './AdminApp'
import { Field, Money, RowActions, Text, Toggle, move, newId } from './ui'
import ScopePicker from './ScopePicker'

export default function AddonsTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const upd = (id: string, patch: Partial<Addon>) => setDoc(d => ({ ...d, addons: d.addons.map(a => (a.id === id ? { ...a, ...patch } : a)) }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="cr-display text-3xl">Add ons</h2>
          <p className="text-sm text-[var(--cr-muted)] mt-1">Leave the price empty for custom priced extras. Clients can request them, and you price them on the booking.</p>
        </div>
        <button
          onClick={() => setDoc(d => ({ ...d, addons: [...d.addons, { id: newId('addon'), name: 'New add on', description: '', priceCents: 0, pricePrefix: '', unit: '', allowQty: false, categoryIds: [], packageIds: [], hidden: true }] }))}
          className="cr-btn cr-btn-ink cr-btn-sm"
        >
          <Plus size={14} strokeWidth={3} /> New add on
        </button>
      </div>

      {doc.addons.map((a, i) => (
        <div key={a.id} className={`cr-card-flat !border-[3px] p-4 ${a.hidden ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap gap-3 items-start justify-between">
            <div className="flex-1 min-w-[220px] grid sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
              <Field label="Name"><Text value={a.name} onChange={v => upd(a.id, { name: v })} /></Field>
              <Field label="Price" hint="Empty = custom quote"><Money nullable cents={a.priceCents} onChange={v => upd(a.id, { priceCents: v })} /></Field>
              <Field label="Before price" hint={'e.g. Starting at, +'}><Text value={a.pricePrefix} onChange={v => upd(a.id, { pricePrefix: v })} /></Field>
              <Field label="Unit" hint="e.g. per reel, per hour"><Text value={a.unit} onChange={v => upd(a.id, { unit: v })} /></Field>
            </div>
            <RowActions
              index={i}
              count={doc.addons.length}
              hidden={a.hidden}
              onMove={dir => setDoc(d => ({ ...d, addons: move(d.addons, i, dir) }))}
              onToggleHidden={() => upd(a.id, { hidden: !a.hidden })}
              onDelete={() => setDoc(d => ({ ...d, addons: d.addons.filter(x => x.id !== a.id) }))}
            />
          </div>
          <div className="mt-3 grid md:grid-cols-[2fr_1fr] gap-3 items-start">
            <Field label="Note (optional)"><Text value={a.description} onChange={v => upd(a.id, { description: v })} placeholder="e.g. Subject to availability" /></Field>
            <div className="pt-5"><Toggle on={a.allowQty} onChange={v => upd(a.id, { allowQty: v })} label="Client can pick a quantity" /></div>
          </div>
          <div className="mt-3">
            <ScopePicker doc={doc} value={a} onChange={scope => upd(a.id, scope)} label="Offered on" allLabel="Every package" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full border-2 border-[var(--cr-ink)] text-xs font-extrabold uppercase ${on ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)]' : 'bg-[var(--cr-paper)]'}`}>
      {children}
    </button>
  )
}
