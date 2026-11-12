'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, CopyPlus, Plus, X } from 'lucide-react'
import type { Category, DetailRow, Package, SiteDoc } from '@/lib/crooked/types'
import { formatMoney } from '@/lib/crooked/pricing'
import type { SetDoc } from './AdminApp'
import { Field, Money, Panel, RowActions, StringList, Text, move, newId } from './ui'

// Rows a brand new package starts with. Empty values stay hidden on the site.
const STARTER_LABELS = ['Filming', 'Locations', 'Setups', 'Final length', 'You get', 'Revisions']

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

  // Every label used on any package, for the label box suggestions.
  const allLabels = Array.from(new Set(doc.packages.flatMap(p => p.details.map(r => r.label.trim())).filter(Boolean))).sort()

  // Adds the row's label (value left blank) to every other package in the
  // same category that doesn't already have it. Blank values stay hidden on
  // the site until filled in.
  function addRowToCategory(source: Package, row: DetailRow) {
    const label = row.label.trim()
    if (!label) return alert('Give the detail a label first.')
    const targets = doc.packages.filter(
      x => x.categoryId === source.categoryId && x.id !== source.id && !x.details.some(r => r.label.trim().toLowerCase() === label.toLowerCase())
    )
    if (!targets.length) return alert(`Every package in this category already has "${label}".`)
    const ids = new Set(targets.map(t => t.id))
    setDoc(d => ({
      ...d,
      packages: d.packages.map(x => (ids.has(x.id) ? { ...x, details: [...x.details, { id: newId('row'), label, value: '' }] } : x)),
    }))
    alert(`Added "${label}" to ${targets.length} other package${targets.length > 1 ? 's' : ''}. Open each one to fill in its value.`)
  }

  function addCategory() {
    const id = newId('cat')
    setDoc(d => ({ ...d, categories: [...d.categories, { id, slug: id, name: 'New service', tagline: '', description: '', hidden: true }] }))
    setOpen(id)
  }

  function addPackage(categoryId: string) {
    const id = newId('pkg')
    const blank: Package = {
      id, categoryId, name: 'New package', tagline: '', summary: '', priceCents: 0, compareAtCents: null, badge: '', features: [],
      details: STARTER_LABELS.map(label => ({ id: newId('row'), label, value: '' })),
      turnaround: '',
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
                        const copy = { ...p, id: newId('pkg'), name: `${p.name} copy`, hidden: true, features: [...p.features], details: p.details.map(r => ({ ...r, id: newId('row') })) }
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
                      <DetailsEditor
                        pkg={p}
                        categoryName={c.name}
                        labelSuggestions={allLabels}
                        onChange={details => updPkg(p.id, { details })}
                        onTurnaround={v => updPkg(p.id, { turnaround: v })}
                        onAddToCategory={row => addRowToCategory(p, row)}
                      />
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

// "What the client gets": free-form label/value rows the admin fully controls
// (rename, reword, reorder, delete, add new ones like "How many songs").
function DetailsEditor({
  pkg, categoryName, labelSuggestions, onChange, onTurnaround, onAddToCategory,
}: {
  pkg: Package
  categoryName: string
  labelSuggestions: string[]
  onChange: (rows: DetailRow[]) => void
  onTurnaround: (v: string) => void
  onAddToCategory: (row: DetailRow) => void
}) {
  const rows = pkg.details
  const listId = `labels-${pkg.id}`
  const set = (i: number, patch: Partial<DetailRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const btn = 'w-8 h-8 shrink-0 rounded-md border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--cr-tan)]'

  return (
    <div className="md:col-span-2 rounded-xl bg-[var(--cr-tan)]/40 p-3 space-y-3">
      <div>
        <div className="cr-label">What the client gets</div>
        <p className="text-xs text-[var(--cr-muted)] mt-1">Name each detail anything you want. Rows with an empty value are hidden on the site.</p>
      </div>
      <datalist id={listId}>{labelSuggestions.map(l => <option key={l} value={l} />)}</datalist>

      <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 text-[11px] font-black uppercase tracking-[0.1em] px-0.5">
        <span>Label</span><span>What they get</span><span className="w-[148px]" />
      </div>

      {rows.map((r, i) => (
        <div key={r.id} className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 items-center rounded-lg sm:rounded-none bg-[var(--cr-paper)] sm:bg-transparent p-2 sm:p-0 border-2 sm:border-0 border-[var(--cr-ink)]/20">
          <input className="cr-input !text-[15px] !py-2" list={listId} value={r.label} placeholder="Label, e.g. How many songs" onChange={e => set(i, { label: e.target.value })} aria-label="Detail label" />
          <input className="cr-input !text-[15px] !py-2" value={r.value} placeholder="e.g. Up to 2 songs" onChange={e => set(i, { value: e.target.value })} aria-label="Detail value" />
          <div className="flex gap-1.5 justify-end">
            <button type="button" className={btn} disabled={i === 0} onClick={() => onChange(move(rows, i, -1))} title="Move up" aria-label="Move up"><ArrowUp size={14} /></button>
            <button type="button" className={btn} disabled={i === rows.length - 1} onClick={() => onChange(move(rows, i, 1))} title="Move down" aria-label="Move down"><ArrowDown size={14} /></button>
            <button type="button" className={btn} onClick={() => onAddToCategory(r)} title={`Add this detail to every package in ${categoryName}`} aria-label={`Add to all packages in ${categoryName}`}><CopyPlus size={14} /></button>
            <button type="button" className={`${btn} hover:!bg-[var(--cr-red)] hover:text-[var(--cr-paper)]`} onClick={() => onChange(rows.filter((_, j) => j !== i))} title="Remove" aria-label="Remove detail"><X size={14} /></button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={() => onChange([...rows, { id: newId('row'), label: '', value: '' }])} className="inline-flex items-center gap-1 text-sm font-black uppercase text-[var(--cr-red)]">
          <Plus size={16} strokeWidth={3} /> Add detail
        </button>
        <span className="text-xs text-[var(--cr-muted)] inline-flex items-center gap-1"><CopyPlus size={12} /> copies that label to every {categoryName} package</span>
      </div>

      <Field label="Turnaround" hint={'Shown in the black "Delivered in" bar, the booking summary, and emails'}>
        <Text value={pkg.turnaround} placeholder="3 to 5 business days" onChange={onTurnaround} />
      </Field>
    </div>
  )
}
