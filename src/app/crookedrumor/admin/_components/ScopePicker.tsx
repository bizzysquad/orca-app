'use client'

import type { SiteDoc } from '@/lib/crooked/types'
import type { Scope } from '@/lib/crooked/pricing'
import { Chip } from './AddonsTab'

// Pick where an add on or promo applies: everything, whole services, or
// individual packages. A whole service also covers packages added to it later.
export default function ScopePicker({
  doc,
  value,
  onChange,
  label,
  allLabel,
}: {
  doc: SiteDoc
  value: Scope
  onChange: (next: Scope) => void
  label: string
  allLabel: string
}) {
  const catIds = value.categoryIds.filter(id => doc.categories.some(c => c.id === id))
  const pkgIds = value.packageIds.filter(id => doc.packages.some(p => p.id === id))
  const everything = value.categoryIds.length === 0 && value.packageIds.length === 0

  const toggleService = (cid: string) => {
    if (catIds.includes(cid)) return onChange({ categoryIds: catIds.filter(x => x !== cid), packageIds: pkgIds })
    // Whole service selected: its individual picks are now redundant.
    const inCat = doc.packages.filter(p => p.categoryId === cid).map(p => p.id)
    onChange({ categoryIds: [...catIds, cid], packageIds: pkgIds.filter(x => !inCat.includes(x)) })
  }

  const togglePackage = (pid: string, cid: string) => {
    if (catIds.includes(cid)) {
      // Unpicking one package from a whole service: switch to the others individually.
      const others = doc.packages.filter(p => p.categoryId === cid && p.id !== pid).map(p => p.id)
      return onChange({ categoryIds: catIds.filter(x => x !== cid), packageIds: [...pkgIds, ...others] })
    }
    onChange({ categoryIds: catIds, packageIds: pkgIds.includes(pid) ? pkgIds.filter(x => x !== pid) : [...pkgIds, pid] })
  }

  const summary = everything
    ? 'Every package'
    : [
        ...doc.categories.filter(c => catIds.includes(c.id)).map(c => `All of ${c.name}`),
        ...doc.packages.filter(p => pkgIds.includes(p.id)).map(p => p.name),
      ].join(', ') || 'Nothing selected, so it is not offered anywhere'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <div className="text-[11px] font-black uppercase tracking-[0.1em]">{label}</div>
        <Chip on={everything} onClick={() => onChange({ categoryIds: [], packageIds: [] })}>{allLabel}</Chip>
      </div>
      <div className="space-y-2">
        {doc.categories.map(c => {
          const pkgs = doc.packages.filter(p => p.categoryId === c.id)
          const whole = catIds.includes(c.id)
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-[var(--cr-tan)] p-2">
              <Chip on={whole} onClick={() => toggleService(c.id)}>{whole ? 'All of ' : ''}{c.name}</Chip>
              {pkgs.length > 0 && <span className="text-[var(--cr-muted)] font-black">›</span>}
              {pkgs.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePackage(p.id, c.id)}
                  className={`px-2.5 py-1 rounded-full border-2 text-[11px] font-bold ${
                    whole || pkgIds.includes(p.id)
                      ? 'border-[var(--cr-red)] bg-[var(--cr-red)] text-[var(--cr-paper)]'
                      : 'border-[var(--cr-ink)] bg-[var(--cr-paper)]'
                  } ${p.hidden ? 'opacity-60' : ''}`}
                  title={p.hidden ? 'This package is hidden on the site' : undefined}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <p className={`mt-1.5 text-xs ${!everything && !catIds.length && !pkgIds.length ? 'font-bold text-[var(--cr-red)]' : 'text-[var(--cr-muted)]'}`}>Applies to: {summary}</p>
    </div>
  )
}

// After a service or package is deleted, strip its id from add on / promo
// targeting. Anything that was targeted and is now left with no target gets
// hidden (add on) or switched off (promo) instead of silently widening to
// every package.
export function dropFromScopes(d: SiteDoc, gone: { categoryIds?: string[]; packageIds?: string[] }): Pick<SiteDoc, 'addons' | 'promos'> {
  const gc = gone.categoryIds || []
  const gp = gone.packageIds || []
  const strip = <T extends Scope>(x: T): { next: T; emptied: boolean } => {
    const was = x.categoryIds.length > 0 || x.packageIds.length > 0
    const next = { ...x, categoryIds: x.categoryIds.filter(id => !gc.includes(id)), packageIds: x.packageIds.filter(id => !gp.includes(id)) }
    return { next, emptied: was && next.categoryIds.length === 0 && next.packageIds.length === 0 }
  }
  return {
    addons: d.addons.map(a => {
      const { next, emptied } = strip(a)
      return emptied ? { ...next, hidden: true } : next
    }),
    promos: d.promos.map(p => {
      const { next, emptied } = strip(p)
      return emptied ? { ...next, active: false } : next
    }),
  }
}
