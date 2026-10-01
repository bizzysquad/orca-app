'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Check, Pencil, Copy, Trash2, Sparkles, CalendarDays } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Occasion } from '@/lib/outfit/types'
import { OCCASIONS } from '@/lib/outfit/catalog'
import { piecesToEntries } from '@/lib/outfit/engine'
import { type OutfitStore, localDay } from '@/lib/outfit/store'
import OutfitBoard from './OutfitBoard'
import { ACCENT, ActionButton, Card, Chip, EmptyBlock, FavButton, GREEN, RED, SectionTitle, fadeUp } from './ui'

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function SavedTab({ store, onEdit, onBuild }: { store: OutfitStore; onEdit: (id: string) => void; onBuild: () => void }) {
  const { theme } = useTheme()
  const { outfits, byId } = store
  const [filter, setFilter] = useState<'all' | 'favorites' | Occasion>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const today = localDay()

  const occasionsPresent = useMemo(() => Array.from(new Set(outfits.map(o => o.occasion).filter(Boolean))) as Occasion[], [outfits])
  const list = outfits.filter(o => filter === 'all' || (filter === 'favorites' ? o.favorite : o.occasion === filter))

  // Last 7 days, for the "what did I wear" strip (the outfit-calendar seed).
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const iso = localDay(d)
    return { iso, label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), look: outfits.find(o => o.wornOn.includes(iso)) }
  }), [outfits])

  if (!outfits.length) {
    return (
      <EmptyBlock icon={<Bookmark size={22} />} title="No saved looks yet" body="Build or generate an outfit, then tap Save. Your looks live here, ready to wear again.">
        <ActionButton variant="primary" icon={<Sparkles size={13} />} label="Build an outfit" onClick={onBuild} />
      </EmptyBlock>
    )
  }

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-5">
      <motion.div variants={fadeUp}>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays size={13} style={{ color: ACCENT }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>This week</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map(d => (
              <div key={d.iso} className="flex flex-col items-center gap-1" title={d.look?.name}>
                <span className="text-[10px]" style={{ color: d.iso === today ? theme.text : theme.subtext, fontWeight: d.iso === today ? 700 : 400 }}>{d.label}</span>
                <span className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: d.look ? `${GREEN}22` : theme.bg, border: `1px solid ${d.iso === today ? ACCENT : theme.border}` }}>
                  {d.look && <Check size={12} style={{ color: GREEN }} />}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All <span style={{ opacity: 0.65 }}>{outfits.length}</span></Chip>
        <Chip active={filter === 'favorites'} onClick={() => setFilter('favorites')}>Favorites</Chip>
        {occasionsPresent.map(o => <Chip key={o} active={filter === o} onClick={() => setFilter(o)}>{OCCASIONS[o].emoji} {OCCASIONS[o].label}</Chip>)}
      </motion.div>

      <SectionTitle title="Saved Looks" sub={`${list.length} look${list.length === 1 ? '' : 's'}`} />
      <div className="grid sm:grid-cols-2 gap-3">
        {list.map(o => {
          const entries = piecesToEntries(o.pieces, byId)
          const ids = [o.pieces.top, o.pieces.bottom, o.pieces.onepiece, o.pieces.outerwear, o.pieces.shoes, ...o.pieces.accessories].filter(Boolean)
          const missing = ids.length - entries.length
          const lastWorn = o.wornOn[o.wornOn.length - 1]
          const wornToday = lastWorn === today
          return (
            <motion.div key={o.id} variants={fadeUp}>
              <Card className="p-3">
                <div className="relative">
                  <OutfitBoard size="sm" entries={entries} />
                  <div className="absolute -top-1 -right-1"><FavButton on={o.favorite} onClick={() => store.updateOutfit(o.id, { favorite: !o.favorite })} /></div>
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {renaming === o.id ? (
                      <input autoFocus defaultValue={o.name}
                        onBlur={e => { store.updateOutfit(o.id, { name: e.target.value.trim() || o.name }); setRenaming(null) }}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className="w-full bg-transparent text-sm font-semibold outline-none border-b" style={{ color: theme.text, borderColor: ACCENT }} />
                    ) : (
                      <button onClick={() => setRenaming(o.id)} className="text-sm font-semibold truncate block max-w-full text-left" style={{ color: theme.text }} title="Rename">
                        {o.name}
                      </button>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: theme.subtext }}>
                      {o.occasion ? `${OCCASIONS[o.occasion].emoji} ${OCCASIONS[o.occasion].label} · ` : ''}
                      {o.wornOn.length ? `Worn ${o.wornOn.length}× · last ${fmt(lastWorn)}` : 'Not worn yet'}
                    </p>
                    {missing > 0 && <p className="text-[10px] mt-0.5" style={{ color: RED }}>{missing} piece{missing === 1 ? ' was' : 's were'} removed from your wardrobe</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  <button onClick={() => store.wearOutfit(o.id)} disabled={wornToday}
                    className="col-span-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{ background: wornToday ? `${GREEN}18` : ACCENT, color: wornToday ? GREEN : '#1F1405' }}>
                    <Check size={13} /> {wornToday ? 'Wearing today' : 'Wear This'}
                  </button>
                  {confirmId === o.id ? (
                    <>
                      <button onClick={() => setConfirmId(null)} className="col-span-2 py-2 rounded-xl text-[11px] font-semibold" style={{ background: theme.bg, color: theme.subtext }}>Keep</button>
                      <button onClick={() => { store.deleteOutfit(o.id); setConfirmId(null) }} className="col-span-2 py-2 rounded-xl text-[11px] font-semibold" style={{ background: `${RED}18`, color: RED }}>Delete look</button>
                    </>
                  ) : (
                    ([
                      [Pencil, 'Edit', () => onEdit(o.id)],
                      [Copy, 'Duplicate', () => store.duplicateOutfit(o.id)],
                      [Bookmark, o.favorite ? 'Unfavorite' : 'Favorite', () => store.updateOutfit(o.id, { favorite: !o.favorite })],
                      [Trash2, 'Delete', () => setConfirmId(o.id)],
                    ] as const).map(([Icon, label, fn]) => (
                      <button key={label} onClick={fn} className="py-2 rounded-xl flex flex-col items-center gap-0.5"
                        style={{ background: theme.bg, color: label === 'Delete' ? RED : theme.subtext }}>
                        <Icon size={13} />
                        <span className="text-[9px] font-semibold">{label}</span>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
