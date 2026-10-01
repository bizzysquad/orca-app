'use client'

import React, { useMemo } from 'react'
import { useTheme } from '@/context/ThemeContext'
import type { CatalogPiece, Slot, WardrobeItem } from '@/lib/outfit/types'
import { SLOT_LABELS } from '@/lib/outfit/catalog'
import { getColor } from '@/lib/outfit/colors'
import { type Entry, type StyleContext, optionsForSlot } from '@/lib/outfit/engine'
import { ACCENT, ItemVisual, Sheet } from './ui'

const pct = (s: number) => `${Math.round(s * 100)}%`

/** "Replace Item": ranked owned options for one slot, then a few unowned ideas. */
export default function SlotPicker({ slot, entries, wardrobe, ctx, onPick, onClose }: {
  slot: Slot | null
  entries: Entry[]
  wardrobe: WardrobeItem[]
  ctx: StyleContext
  onPick: (slot: Slot, pick: { item?: WardrobeItem; catalog?: CatalogPiece }) => void
  onClose: () => void
}) {
  const { theme } = useTheme()
  const options = useMemo(() => (slot ? optionsForSlot(slot, entries, wardrobe, ctx) : []), [slot, entries, wardrobe, ctx])
  const owned = options.filter(o => o.item)
  const ideas = options.filter(o => o.catalog)

  return (
    <Sheet open={!!slot} onClose={onClose} title={slot ? `${slot === 'accessory' ? 'Add' : 'Choose'} ${SLOT_LABELS[slot].toLowerCase()}` : ''} wide>
      {owned.length === 0 && (
        <p className="text-xs mb-3" style={{ color: theme.subtext }}>Nothing in your wardrobe fits this slot yet.</p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {owned.map(({ item, score }) => (
          <button key={item!.id} type="button" onClick={() => onPick(slot!, { item })} className="text-left">
            <div className="relative">
              <ItemVisual item={item!} className="aspect-square w-full" />
              <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: score >= 0.75 ? '#10B981' : score >= 0.6 ? ACCENT : 'rgba(0,0,0,0.55)', color: score >= 0.6 && score < 0.75 ? '#1F1405' : '#fff' }}>
                {pct(score)}
              </span>
            </div>
            <p className="text-[11px] font-medium mt-1 truncate" style={{ color: theme.text }}>{item!.name}</p>
          </button>
        ))}
      </div>
      {ideas.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: theme.subtext }}>Ideas you don&apos;t own yet</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {ideas.map(({ catalog, score }) => (
              <button key={catalog!.key} type="button" onClick={() => onPick(slot!, { catalog })} className="text-left">
                <div className="relative">
                  <ItemVisual item={catalog!} className="aspect-square w-full" />
                  <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: `1.5px dashed ${ACCENT}` }} />
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>{pct(score)}</span>
                </div>
                <p className="text-[11px] font-medium mt-1 truncate" style={{ color: theme.text }}>{catalog!.name}</p>
                <p className="text-[10px]" style={{ color: theme.subtext }}>{getColor(catalog!.primaryColor).name}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}
