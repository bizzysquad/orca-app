'use client'

import React, { useState } from 'react'
import { Plus, RefreshCw, X, ShoppingBag } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Slot } from '@/lib/outfit/types'
import { SLOT_LABELS, CATEGORY_CONFIG } from '@/lib/outfit/catalog'
import type { Entry } from '@/lib/outfit/engine'
import { ACCENT, ACCENT_INK, ItemVisual } from './ui'

export const DRAG_TYPE = 'text/orca-item'

export interface BoardHandlers {
  onSlotTap: (slot: Slot) => void
  onRemove: (entry: Entry) => void
  onDropItem?: (slot: Slot, itemId: string) => void
  onAdopt?: (entry: Entry) => void
}

function SlotTile({ slot, entry, size, handlers, area, minH }: {
  slot: Slot; entry?: Entry; size: 'lg' | 'sm'; handlers?: BoardHandlers; area: string; minH: number
}) {
  const { theme } = useTheme()
  const [over, setOver] = useState(false)
  const unowned = Boolean(entry?.catalog)
  const label = entry ? CATEGORY_CONFIG[entry.piece.category].label : SLOT_LABELS[slot]

  const dropProps = handlers?.onDropItem ? {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(true) } },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData(DRAG_TYPE); if (id) handlers.onDropItem!(slot, id) },
  } : {}

  if (!entry) {
    if (!handlers) return <div style={{ gridArea: area }} />
    return (
      <button
        type="button" {...dropProps}
        onClick={() => handlers.onSlotTap(slot)}
        className="rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
        style={{ gridArea: area, minHeight: minH, border: `1.5px dashed ${over ? ACCENT : theme.border}`, background: over ? `${ACCENT}12` : 'transparent', color: theme.subtext }}
      >
        <Plus size={16} />
        <span className="text-[10px] font-semibold">{SLOT_LABELS[slot]}</span>
      </button>
    )
  }

  return (
    <div className="relative group" style={{ gridArea: area, minHeight: minH }} {...dropProps}>
      <button type="button" disabled={!handlers} onClick={() => handlers?.onSlotTap(slot)} className="w-full h-full block text-left">
        <ItemVisual
          item={entry.piece as any}
          className="w-full h-full"
          rounded={size === 'lg' ? 'rounded-2xl' : 'rounded-xl'}
        />
      </button>
      {unowned && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: `1.5px dashed ${ACCENT}` }} />
      )}
      {size === 'lg' && slot !== 'accessory' && (
        <div className="absolute left-1.5 right-1.5 bottom-1.5 flex items-center gap-1 pointer-events-none">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}>
            {unowned ? 'Suggested' : label}
          </span>
        </div>
      )}
      {handlers && size === 'lg' && (
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {unowned && handlers.onAdopt && (
            <button type="button" onClick={() => handlers.onAdopt!(entry)} className="p-1.5 rounded-full"
              style={{ background: ACCENT, color: ACCENT_INK }} aria-label="Add to wardrobe" title="I own this — add to wardrobe">
              <ShoppingBag size={11} />
            </button>
          )}
          {slot !== 'accessory' && (
            <button type="button" onClick={() => handlers.onSlotTap(slot)} className="p-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }} aria-label="Replace item" title="Replace">
              <RefreshCw size={11} />
            </button>
          )}
          <button type="button" onClick={() => handlers.onRemove(entry)} className="p-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }} aria-label="Remove item" title="Remove">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Flat-lay layout: outerwear | top/bottom | accessories, with shoes under the outerwear column. */
export default function OutfitBoard({ entries, size = 'lg', handlers }: {
  entries: Entry[]
  size?: 'lg' | 'sm'
  handlers?: BoardHandlers
}) {
  const find = (slot: Slot) => entries.find(e => e.slot === slot)
  const onepiece = find('onepiece')
  const covers = onepiece ? CATEGORY_CONFIG[onepiece.piece.category].covers ?? [] : []
  const accessories = entries.filter(e => e.slot === 'accessory')
  const unit = size === 'lg' ? 112 : 56

  // A dress fills the center column; a suit fills center and pushes the shirt to the left column.
  const areas = onepiece
    ? covers.includes('top')
      ? '"outer one acc" "outer one acc" "shoes one acc"'
      : '"top one acc" "top one acc" "shoes one acc"'
    : '"outer top acc" "outer bottom acc" "shoes bottom acc"'

  const accSlots = handlers ? Math.min(3, accessories.length + 1) : accessories.length

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: '1fr 1.35fr 0.8fr',
        gridTemplateRows: `${unit}px ${unit}px ${unit * 0.85}px`,
        gridTemplateAreas: areas,
      }}
    >
      {onepiece ? (
        <>
          <SlotTile slot="onepiece" entry={onepiece} size={size} handlers={handlers} area="one" minH={0} />
          {covers.includes('top')
            ? <SlotTile slot="outerwear" entry={find('outerwear')} size={size} handlers={handlers} area="outer" minH={0} />
            : <SlotTile slot="top" entry={find('top')} size={size} handlers={handlers} area="top" minH={0} />}
        </>
      ) : (
        <>
          <SlotTile slot="outerwear" entry={find('outerwear')} size={size} handlers={handlers} area="outer" minH={0} />
          <SlotTile slot="top" entry={find('top')} size={size} handlers={handlers} area="top" minH={0} />
          <SlotTile slot="bottom" entry={find('bottom')} size={size} handlers={handlers} area="bottom" minH={0} />
        </>
      )}
      <SlotTile slot="shoes" entry={find('shoes')} size={size} handlers={handlers} area="shoes" minH={0} />
      <div className="flex flex-col gap-2 min-h-0" style={{ gridArea: 'acc' }}>
        {Array.from({ length: accSlots }).map((_, i) => (
          <div key={accessories[i]?.id ?? accessories[i]?.catalog?.key ?? `empty-${i}`} className="flex-1 min-h-0 grid">
            <SlotTile slot="accessory" entry={accessories[i]} size={size} handlers={handlers} area="auto" minH={0} />
          </div>
        ))}
      </div>
    </div>
  )
}
