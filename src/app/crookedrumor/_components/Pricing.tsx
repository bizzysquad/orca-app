'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, Clock, MapPin, Layers, Film, Package as Box, RotateCcw, Timer, ArrowRight,
  Music, Mic, Camera, Users, MessageSquare, Image as ImageIcon, Captions, Sparkles,
} from 'lucide-react'
import type { PublicSiteDoc, Package } from '@/lib/crooked/types'
import { addonPriceLabel, addonsFor, formatMoney } from '@/lib/crooked/pricing'

// Detail labels are free text, so pick an icon from keywords in the label.
const ICON_RULES: [RegExp, typeof Clock][] = [
  [/song|music|track|beat/i, Music],
  [/question|interview/i, MessageSquare],
  [/caption|subtitle/i, Captions],
  [/mic|audio|sound/i, Mic],
  [/camera|angle/i, Camera],
  [/guest|people|person|talent|artist/i, Users],
  [/photo|thumbnail|cover|still/i, ImageIcon],
  [/revision|edit round/i, RotateCcw],
  [/locat|venue|place|spot/i, MapPin],
  [/setup|scene|outfit|look/i, Layers],
  [/length|duration|runtime|second|minute long/i, Film],
  [/film|shoot|time|hour|coverage/i, Clock],
  [/get|deliver|clip|reel|video|edit/i, Box],
]
const iconFor = (label: string) => ICON_RULES.find(([re]) => re.test(label))?.[1] || Sparkles

export default function Pricing({ site }: { site: PublicSiteDoc }) {
  const cats = site.categories.filter(c => site.packages.some(p => p.categoryId === c.id))
  const [catId, setCatId] = useState(cats[0]?.id || '')
  const cat = cats.find(c => c.id === catId) || cats[0]
  if (!cat) return <p className="text-center opacity-70">Packages are being updated. Check back soon or request a custom quote.</p>

  const pkgs = site.packages.filter(p => p.categoryId === cat.id)
  const addons = addonsFor(site, cat.id)

  return (
    <div>
      <div className="cr-scroll-x flex gap-2 md:gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:justify-center" role="tablist">
        {cats.map(c => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === cat.id}
            onClick={() => setCatId(c.id)}
            className={`shrink-0 px-4 md:px-5 py-3 rounded-xl border-[3px] border-[var(--cr-ink)] font-black uppercase text-sm md:text-base tracking-wide transition-all ${
              c.id === cat.id ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)] shadow-[4px_4px_0_var(--cr-red)]' : 'bg-[var(--cr-paper)] hover:-translate-y-0.5'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="text-center max-w-2xl mx-auto mt-6 mb-10">
        <div className="cr-label text-[var(--cr-red)]">{cat.tagline}</div>
        <p className="mt-2 text-[17px] leading-relaxed text-[var(--cr-ink-soft)]">{cat.description}</p>
      </div>

      {cat.id === 'content' && site.settings.angleVsSceneBody ? (
        <div className="max-w-3xl mx-auto mb-10 rounded-2xl border-[3px] border-dashed border-[var(--cr-ink)] p-5 md:p-6 bg-[var(--cr-tan)]/40 flex gap-4">
          <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-[var(--cr-red)] text-[var(--cr-paper)] items-center justify-center">
            <Layers size={22} />
          </div>
          <div>
            <div className="cr-display text-xl">{site.settings.angleVsSceneTitle}</div>
            <p className="mt-2 text-[15px] leading-relaxed">{site.settings.angleVsSceneBody}</p>
          </div>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
        {pkgs.map(p => <PackageCard key={p.id} p={p} />)}
      </div>

      {addons.length > 0 && (
        <div className="mt-14">
          <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
            <h3 className="cr-display text-3xl md:text-4xl">Add ons</h3>
            <span className="text-sm text-[var(--cr-muted)] font-semibold">Pick these when you book</span>
          </div>
          <div className="cr-card overflow-hidden !shadow-[6px_6px_0_var(--cr-red)]">
            <ul className="grid md:grid-cols-2 -mb-[2px]">
              {addons.map(a => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 px-5 py-4 border-b-2 border-[var(--cr-tan)] md:odd:border-r-2"
                >
                  <div>
                    <div className="font-extrabold">{a.name}</div>
                    {a.description ? <div className="text-[13px] text-[var(--cr-muted)] mt-0.5">{a.description}</div> : null}
                  </div>
                  <div className={`shrink-0 text-right font-black text-sm ${a.priceCents == null ? 'text-[var(--cr-muted)]' : 'text-[var(--cr-red)]'}`}>
                    {addonPriceLabel(a)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function PackageCard({ p }: { p: Package }) {
  const hot = !!p.badge && /popular|best/i.test(p.badge)
  return (
    <article className={`cr-card relative flex flex-col p-6 ${hot ? 'lg:-translate-y-2 !shadow-[8px_8px_0_var(--cr-red)]' : ''}`}>
      {p.badge ? (
        <div className={`absolute -top-4 right-5 cr-stamp !text-xs !py-1 !px-2.5 ${hot ? 'bg-[var(--cr-red)] text-[var(--cr-paper)] !border-[var(--cr-ink)]' : 'bg-[var(--cr-paper)] text-[var(--cr-red)]'}`}>
          {p.badge}
        </div>
      ) : null}
      <div className="cr-label text-[var(--cr-red)]">{p.tagline}</div>
      <h3 className="cr-display text-[28px] md:text-3xl mt-2">{p.name}</h3>
      <div className="flex items-baseline gap-2 mt-3">
        <span className="cr-display text-6xl tracking-tight">{formatMoney(p.priceCents)}</span>
        {p.compareAtCents && p.compareAtCents > p.priceCents ? (
          <span className="text-lg font-bold text-[var(--cr-muted)] line-through">{formatMoney(p.compareAtCents)}</span>
        ) : null}
      </div>
      {p.summary ? <p className="mt-3 text-[15px] leading-relaxed text-[var(--cr-ink-soft)]">{p.summary}</p> : null}

      <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-t-2 border-[var(--cr-tan)] pt-5">
        {p.details.filter(d => d.label.trim() && d.value.trim()).map(d => {
          const Icon = iconFor(d.label)
          return (
            <div key={d.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--cr-muted)]">
                <Icon size={12} strokeWidth={2.5} className="shrink-0" /> <span className="truncate">{d.label}</span>
              </dt>
              <dd className="text-[14px] font-bold leading-snug mt-0.5 break-words">{d.value}</dd>
            </div>
          )
        })}
      </dl>

      {p.turnaround ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--cr-ink)] text-[var(--cr-paper)] px-3 py-2 text-sm font-bold">
          <Timer size={16} className="text-[var(--cr-red)]" strokeWidth={2.5} /> Delivered in {p.turnaround}
        </div>
      ) : null}

      {p.features.length > 0 && (
        <ul className="mt-5 space-y-2">
          {p.features.map((f, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-snug">
              <Check size={18} strokeWidth={3} className="shrink-0 text-[var(--cr-red)] mt-px" /> {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <Link href={`/crookedrumor/book?package=${encodeURIComponent(p.id)}`} className={`cr-btn w-full ${hot ? 'cr-btn-red' : 'cr-btn-ink'}`}>
          Book {p.name.replace(/^the\s+/i, '')} <ArrowRight size={18} strokeWidth={3} />
        </Link>
      </div>
    </article>
  )
}
