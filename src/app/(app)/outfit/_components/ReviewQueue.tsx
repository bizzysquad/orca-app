'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Trash2, Check, Loader2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { DetectedItem, Gender, WardrobeItem } from '@/lib/outfit/types'
import { CATEGORY_CONFIG } from '@/lib/outfit/catalog'
import { getColor } from '@/lib/outfit/colors'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import { newId } from '@/lib/outfit/store'
import ItemEditor, { autoName } from './ItemEditor'
import { ACCENT, ACCENT_INK, GOLD, ItemVisual, Swatch } from './ui'

export type Draft = DetectedItem & { key: string }

export const toDraft = (d: DetectedItem): Draft => ({ ...d, name: d.name || autoName(d), key: newId('draft') })

/** Upload photos and turn reviewed drafts into wardrobe items. */
export async function commitDrafts(drafts: Draft[]): Promise<WardrobeItem[]> {
  const now = new Date().toISOString()
  return Promise.all(drafts.map(async d => {
    let imageUrl = d.imageUrl, imagePath = d.imagePath
    if (d.blob) {
      const saved = await OUTFIT_PROVIDERS.images.save(d.blob)
      imageUrl = saved.url; imagePath = saved.path
    }
    if (d.previewUrl) URL.revokeObjectURL(d.previewUrl)
    const { blob, previewUrl, key, ...rest } = d
    return {
      ...rest, imageUrl, imagePath,
      name: d.name.trim() || autoName(d),
      id: newId('item'), favorite: false, wearCount: 0, createdAt: now,
    }
  }))
}

export default function ReviewQueue({ drafts, setDrafts, gender, onConfirm, confirmLabel }: {
  drafts: Draft[]
  setDrafts: (fn: (prev: Draft[]) => Draft[]) => void
  gender: Gender
  onConfirm: (items: WardrobeItem[]) => void
  confirmLabel?: string
}) {
  const { theme } = useTheme()
  const [open, setOpen] = useState<string | null>(drafts.length === 1 ? drafts[0].key : null)
  const [saving, setSaving] = useState(false)
  const needsReview = drafts.filter(d => (d.confidence?.category ?? 1) < 0.5).length

  const patch = (key: string, p: Partial<Draft>) => setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...p } : d)))
  const remove = (key: string) => setDrafts(prev => {
    const d = prev.find(x => x.key === key)
    if (d?.previewUrl) URL.revokeObjectURL(d.previewUrl)
    return prev.filter(x => x.key !== key)
  })

  const confirm = async () => {
    setSaving(true)
    try { onConfirm(await commitDrafts(drafts)) } finally { setSaving(false) }
  }

  return (
    <div>
      {needsReview > 0 && (
        <p className="text-xs mb-3 px-3 py-2 rounded-xl" style={{ background: `${GOLD}12`, color: GOLD }}>
          Colors are read from the photo. Tap {needsReview === 1 ? 'the item' : `the ${needsReview} items`} marked “Confirm type” to set what each piece is.
        </p>
      )}
      <div className="space-y-2">
        {drafts.map(d => {
          const expanded = open === d.key
          const unsure = (d.confidence?.category ?? 1) < 0.5
          return (
            <div key={d.key} className="rounded-2xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${unsure ? `${GOLD}55` : theme.border}` }}>
              <div className="flex items-center gap-3 p-2.5 cursor-pointer" onClick={() => setOpen(expanded ? null : d.key)}>
                <ItemVisual item={{ ...d, imageUrl: d.previewUrl ?? d.imageUrl }} className="w-14 h-14 shrink-0" rounded="rounded-xl" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{d.name || autoName(d)}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Swatch color={d.primaryColor} size={12} />
                    {d.accentColors.map(a => <Swatch key={a} color={a} size={10} />)}
                    <span className="text-[11px] truncate" style={{ color: theme.subtext }}>
                      {getColor(d.primaryColor).name} · {CATEGORY_CONFIG[d.category].label}{d.pattern !== 'solid' ? ` · ${d.pattern}` : ''}
                    </span>
                  </div>
                  {unsure && <span className="text-[10px] font-semibold" style={{ color: GOLD }}>Confirm type</span>}
                </div>
                <button onClick={e => { e.stopPropagation(); remove(d.key) }} className="p-2" aria-label="Remove">
                  <Trash2 size={14} style={{ color: theme.subtext }} />
                </button>
                <ChevronDown size={16} style={{ color: theme.subtext, transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-4 pt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
                      <div className="pt-3">
                        <ItemEditor value={d} onChange={p => patch(d.key, p)} gender={gender} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={!drafts.length || saving}
        onClick={confirm}
        className="w-full mt-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 sticky bottom-0"
        style={{ background: ACCENT, color: ACCENT_INK, boxShadow: `0 10px 30px ${ACCENT}40` }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? 'Saving photos…' : confirmLabel ?? `Add ${drafts.length} to Wardrobe`}
      </motion.button>
    </div>
  )
}
