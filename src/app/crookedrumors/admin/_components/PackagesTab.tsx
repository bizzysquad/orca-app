'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { Category, Package, SiteDoc } from '@/lib/crooked/types'
import { formatMoney } from '@/lib/crooked/pricing'
import type { SetDoc } from './AdminApp'
import { Field, Money, Panel, RowActions, StringList, Text, Toggle, move, newId } from './ui'

const SPEC_FIELDS: { key: keyof Package['specs']; label: string; placeholder: string }[] = [
  { key: 'filmingTime', label: 'Filming time', placeholder: 'Up to 20 min' },
  { key: 'locations', label: 'Locations', placeholder: '1 location' },
  { key: 'setups', label: 'Setups / scenes', placeholder: '1 scene / setup' },
  { key: 'videoLength', label: 'Final video length', placeholder: 'Up to 60 sec' },
  { key: 'deliverables', label: 'Deliverables', placeholder: '1 edited reel' },
  { key: 'revisions', label: 'Revisions', placeholder: '1 revision' },
  { key: 'turnaround', label: 'Turnaround', placeholder: '3 to 5 business days' },
]

// Move a package up/down among packages of the same category only.
function moveInCategory(pkgs: Package[], id: string, dir: -1 | 1): Package[] {
  const i = pkgs.findIndex(p => p.id === id)
  const cat = pkgs[i].categoryId
  let j = i + dir
  while (j >= 0 && j < pkgs.length && pkgs[j].categoryId !== cat) j += dir
  if (j < 0 || j >= pkgs.length) return pkgs
  const next = [...pkgs]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export default function PackagesTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const [open, setOpen] = useState<string | null>(null)

  const updCat = (id: string, patch: Partial<Category>) => setDoc(d => ({ ...d, categories: d.categories.map(c => (c.id === id ? { ...c, ...patch } : c)) }))
  const updPkg = (id: string, patch: Partial<Package>) => setDoc(d => ({ ...d, packages: d.packages.map(p => (p.id === id ? { ...p, ...patch } : p)) }))

  function addCategory() {
    const id = newId('cat')
    setDoc(d => ({ ...d, categories: [...d.categories, { id, slug: id, name: 'New service', tagline: '', description: '', hidden: true }] }))
    setOpen(id)
  }

  function addPackage(categoryId: string) {
    const id = newId('pkg')
    const blank: Package = {
      id, categoryId, name: 'New package', tagline: '', summary: '', priceCents: 0, compareAtCents: null, badge: '', features: [],
      specs: { filmingTime: '', locations: '', setups: '', videoLength: '', deliverables: '', revisions: '', turnaround: '' },
      hidden: true,
    }
    setDoc(d => ({ ...d, packages: [...d.packages, blank] }))
    setOpen(id)
  }

  function deleteCategory(c: Category) {
    const n = doc.packages.filter(p => p.categoryId === c.id).length
    if (n && !confirm(`"${c.name}" has ${n} package${n > 1 ? 's' : ''}. Delete them too?`)) return
    setDoc(d => ({
      ...d,
      categories: d.categories.filter(x => x.id !== c.id),
      packages: d.packages.filter(p => p.categoryId !== c.id),
      addons: d.addons.map(a => ({ ...a, categoryIds: a.categoryIds.filter(id => id !== c.id) })),
    }))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="cr-display text-3xl">Services & packages</h2>
          <p className="text-sm text-[var(--cr-muted)] mt-1">New items start hidden so you can finish them before they go live. Use the eye to show them.</p>
        </div>
        <button onClick={addCategory} className="cr-btn cr-btn-ink cr-btn-sm"><Plus size={14} strokeWidth={3} /> New service category</button>
      </div>

      {doc.categories.map((c, ci) => {
        const pkgs = doc.packages.filter(p => p.categoryId === c.id)
        return (
          <section key={c.id} className={`rounded-2xl border-[3px] border-[var(--cr-ink)] bg-[var(--cr-tan)]/30 p-3 md:p-4 ${c.hidden ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button onClick={() => setOpen(open === c.id ? null : c.id)} className="text-left flex items-center gap-2">
                <ChevronDown className={`transition-transform ${open === c.id ? 'rotate-180' : ''}`} />
                <span className="cr-display text-2xl">{c.name || 'Untitled'}</span>
                {c.hidden && <span className="text-xs font-black uppercase bg-[var(--cr-ink)] text-[var(--cr-paper)] px-2 py-0.5 rounded">Hidden</span>}
              </button>
              <RowActions
                index={ci}
                count={doc.categories.length}
                hidden={c.hidden}
                onMove={dir => setDoc(d => ({ ...d, categories: move(d.categories, ci, dir) }))}
                onToggleHidden={() => updCat(c.id, { hidden: !c.hidden })}
                onDelete={() => deleteCategory(c)}
              />
            </div>

            {open === c.id && (
              <div className="mt-4 grid md:grid-cols-2 gap-3 bg-[var(--cr-paper)] rounded-xl border-2 border-[var(--cr-ink)] p-4">
                <Field label="Category name"><Text value={c.name} onChange={v => updCat(c.id, { name: v })} /></Field>
                <Field label="Tagline"><Text value={c.tagline} onChange={v => updCat(c.id, { tagline: v })} /></Field>
                <Field label="Description" className="md:col-span-2"><Text area value={c.description} onChange={v => updCat(c.id, { description: v })} /></Field>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {pkgs.map((p, pi) => (
                <div key={p.id} className={`cr-card-flat !border-[3px] ${p.hidden ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex-1 min-w-[180px] text-left flex items-center gap-2">
                      <ChevronDown size={18} className={`shrink-0 transition-transform ${open === p.id ? 'rotate-180' : ''}`} />
                      <span className="font-black uppercase">{p.name || 'Untitled'}</span>
                      <span className="cr-display text-lg text-[var(--cr-red)]">{formatMoney(p.priceCents)}</span>
                      {p.badge && <span className="text-[10px] font-black uppercase border-2 border-[var(--cr-red)] text-[var(--cr-red)] px-1.5 rounded">{p.badge}</span>}
                      {p.hidden && <span className="text-[10px] font-black uppercase bg-[var(--cr-ink)] text-[var(--cr-paper)] px-1.5 py-0.5 rounded">Hidden</span>}
                    </button>
                    <RowActions
                      index={pi}
                      count={pkgs.length}
                      hidden={p.hidden}
                      onMove={dir => setDoc(d => ({ ...d, packages: moveInCategory(d.packages, p.id, dir) }))}
                      onToggleHidden={() => updPkg(p.id, { hidden: !p.hidden })}
                      onDuplicate={() => {
                        const copy = { ...p, id: newId('pkg'), name: `${p.name} copy`, hidden: true, features: [...p.features], specs: { ...p.specs } }
                        setDoc(d => {
                          const idx = d.packages.findIndex(x => x.id === p.id)
                          const next = [...d.packages]
                          next.splice(idx + 1, 0, copy)
                          return { ...d, packages: next }
                        })
                        setOpen(copy.id)
                      }}
                      onDelete={() => setDoc(d => ({ ...d, packages: d.packages.filter(x => x.id !== p.id) }))}
                    />
                  </div>

                  {open === p.id && (
                    <div className="border-t-2 border-[var(--cr-tan)] p-4 grid md:grid-cols-2 gap-3">
                      <Field label="Package name"><Text value={p.name} onChange={v => updPkg(p.id, { name: v })} /></Field>
                      <Field label="Tagline" hint="Shows above the name, e.g. One Location | One Setup"><Text value={p.tagline} onChange={v => updPkg(p.id, { tagline: v })} /></Field>
                      <Field label="Price"><Money cents={p.priceCents} onChange={v => updPkg(p.id, { priceCents: v ?? 0 })} /></Field>
                      <Field label="Was price (optional)" hint="Shows crossed out to highlight a deal"><Money nullable placeholder="None" cents={p.compareAtCents} onChange={v => updPkg(p.id, { compareAtCents: v })} /></Field>
                      <Field label="Badge (optional)" hint="Most popular, Best value, Save $40…"><Text value={p.badge} onChange={v => updPkg(p.id, { badge: v })} /></Field>
                      <Field label="Service category">
                        <select className="cr-input !text-[15px] !py-2.5" value={p.categoryId} onChange={e => updPkg(p.id, { categoryId: e.target.value })}>
                          {doc.categories.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Short description" className="md:col-span-2"><Text area rows={2} value={p.summary} onChange={v => updPkg(p.id, { summary: v })} /></Field>
                      <div className="md:col-span-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl bg-[var(--cr-tan)]/40 p-3">
                        <div className="sm:col-span-2 lg:col-span-4 cr-label">What the client gets</div>
                        {SPEC_FIELDS.map(f => (
                          <Field key={f.key} label={f.label}>
                            <Text value={p.specs[f.key]} placeholder={f.placeholder} onChange={v => updPkg(p.id, { specs: { ...p.specs, [f.key]: v } })} />
                          </Field>
                        ))}
                      </div>
                      <Field label="Extra bullet points" className="md:col-span-2">
                        <StringList items={p.features} onChange={v => updPkg(p.id, { features: v })} placeholder="e.g. Basic color correction and transitions" addLabel="Add bullet" />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => addPackage(c.id)} className="w-full rounded-xl border-[3px] border-dashed border-[var(--cr-ink)]/40 py-3 font-black uppercase text-sm hover:border-[var(--cr-ink)]">
                <Plus size={16} strokeWidth={3} className="inline -mt-0.5" /> Add package to {c.name}
              </button>
            </div>
          </section>
        )
      })}

      <Panel title="Tip">
        <p className="text-sm">Bundle deals are just packages: put them in the Bundles category with a <b>Was price</b> and a badge like <i>Save $40</i>. Time limited discounts live under <b>Promos</b>.</p>
      </Panel>
    </div>
  )
}
