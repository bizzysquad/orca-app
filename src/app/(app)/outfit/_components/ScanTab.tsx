'use client'

import React, { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, Camera, ImagePlus, Loader2, Sparkles, Save, PenLine } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Category, OutfitDraft, WardrobeItem } from '@/lib/outfit/types'
import { CATEGORY_CONFIG, categoriesFor } from '@/lib/outfit/catalog'
import { generateOutfits, piecesToEntries } from '@/lib/outfit/engine'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import type { OutfitStore } from '@/lib/outfit/store'
import { autoName } from './ItemEditor'
import OutfitBoard from './OutfitBoard'
import ReviewQueue, { type Draft, toDraft } from './ReviewQueue'
import { ACCENT, ActionButton, Card, Chip, INDIGO, SectionTitle, fadeUp } from './ui'

export default function ScanTab({ store, onOpenLook }: { store: OutfitStore; onOpenLook: (outfitId: string) => void }) {
  const { theme } = useTheme()
  const { prefs } = store
  const cameraRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<WardrobeItem[]>([])
  const [savedIds, setSavedIds] = useState<Record<number, string>>({})
  const scanner = OUTFIT_PROVIDERS.closetScan

  const saveLook = (i: number, d: OutfitDraft) => {
    const o = store.saveOutfit(d.pieces, { name: 'Closet Scan Look' })
    setSavedIds(s => ({ ...s, [i]: o.id }))
    return o.id
  }

  const scan = async (list: FileList | null) => {
    if (!list?.length) return
    setAdded([])
    const files = Array.from(list).slice(0, 6)
    const found: Draft[] = []
    for (let i = 0; i < files.length; i++) {
      setBusy(`Scanning photo ${i + 1} of ${files.length}…`)
      setPhotos(prev => [...prev, URL.createObjectURL(files[i])])
      try { (await scanner.scan(files[i])).forEach(d => found.push(toDraft(d))) } catch { /* unreadable photo */ }
    }
    setDrafts(prev => [...prev, ...found])
    setBusy(null)
  }

  const setAll = (category: Category) => setDrafts(prev => prev.map(d => {
    const cfg = CATEGORY_CONFIG[category]
    const auto = d.name === autoName(d)
    return {
      ...d, category, formality: cfg.formality, styles: cfg.styles, seasons: cfg.seasons,
      confidence: { ...d.confidence, category: 1 },
      name: auto ? autoName({ ...d, category }) : d.name,
    }
  }))

  const onConfirm = (items: WardrobeItem[]) => {
    store.addItems(items)
    setAdded(items)
    setSavedIds({})
    setDrafts([])
    photos.forEach(u => URL.revokeObjectURL(u))
    setPhotos([])
  }

  // Once saved, suggest looks that put the newly scanned pieces to work.
  const looks: OutfitDraft[] = useMemo(() => {
    if (!added.length) return []
    const newIds = new Set(added.map(a => a.id))
    const all = [...added, ...store.wardrobe.filter(w => !newIds.has(w.id))]
    return generateOutfits({ wardrobe: all, ctx: { gender: prefs.gender }, limit: 20 })
      .filter(d => [d.pieces.top, d.pieces.bottom, d.pieces.onepiece, d.pieces.outerwear, d.pieces.shoes, ...d.pieces.accessories].some(id => id && newIds.has(id)))
      .slice(0, 4)
  }, [added, store.wardrobe, prefs.gender])

  const byIdAll = useMemo(() => ({ ...store.byId, ...Object.fromEntries(added.map(a => [a.id, a])) }), [store.byId, added])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    added.forEach(a => { const p = CATEGORY_CONFIG[a.category].plural; c[p] = (c[p] ?? 0) + 1 })
    return Object.entries(c)
  }, [added])

  const quickTypes = categoriesFor(prefs.gender).filter(c => ['shirt', 'tshirt', 'sweater', 'blouse', 'jacket', 'coat', 'pants', 'jeans', 'dress', 'skirt', 'shoes', 'sneakers'].includes(c))

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-5">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { scan(e.target.files); e.target.value = '' }} />
      <input ref={filesRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { scan(e.target.files); e.target.value = '' }} />

      <motion.section variants={fadeUp}>
        <Card className="p-5 overflow-hidden relative" style={{ background: `linear-gradient(150deg, ${INDIGO}1a, ${theme.card} 60%)` }}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${INDIGO}22`, color: INDIGO }}>
              <ScanLine size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: theme.text }}>Scan My Closet</h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.subtext }}>
                Photograph a rack of hanging clothes straight-on. ORCA splits it into individual pieces and reads each one&apos;s color. You confirm what they are, then it builds outfits from them.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <ActionButton variant="primary" icon={<Camera size={14} />} label="Take Photo" onClick={() => cameraRef.current?.click()} disabled={!!busy} />
            <ActionButton icon={<ImagePlus size={14} />} label="Upload Photos" onClick={() => filesRef.current?.click()} disabled={!!busy} />
          </div>
          <p className="text-[10px] mt-3" style={{ color: theme.subtext }}>
            Engine: {scanner.label}. Works best on hanging clothes. For folded stacks or shoes, add pieces one at a time.
          </p>
        </Card>
      </motion.section>

      {busy && (
        <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl" style={{ background: `${INDIGO}14`, color: INDIGO }}>
          <Loader2 size={14} className="animate-spin" /> {busy}
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {photos.map(u => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="Closet" className="h-24 rounded-xl object-cover shrink-0" style={{ border: `1px solid ${theme.border}` }} />
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title={`Found ${drafts.length} piece${drafts.length === 1 ? '' : 's'}`} sub="Remove anything that isn't a garment, then confirm each type." />
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: theme.subtext }}>
              <PenLine size={10} /> Set all to
            </p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {quickTypes.map(c => <Chip key={c} size="sm" onClick={() => setAll(c)}>{CATEGORY_CONFIG[c].plural}</Chip>)}
            </div>
          </div>
          <ReviewQueue drafts={drafts} setDrafts={setDrafts} gender={prefs.gender} onConfirm={onConfirm}
            confirmLabel={`Save ${drafts.length} to Wardrobe`} />
        </motion.section>
      )}

      {added.length > 0 && (
        <motion.section variants={fadeUp} className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-bold" style={{ color: theme.text }}>Added {added.length} pieces to your wardrobe</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {counts.map(([label, n]) => (
                <span key={label} className="text-[11px] px-2 py-1 rounded-full" style={{ background: theme.bg, color: theme.subtext }}>{n} {label}</span>
              ))}
            </div>
          </Card>
          {looks.length > 0 && (
            <div>
              <SectionTitle icon={<Sparkles size={15} style={{ color: ACCENT }} />} title="Outfits from your closet" sub="Built around what you just scanned" />
              <div className="grid sm:grid-cols-2 gap-3">
                {looks.map((d, i) => (
                  <Card key={i} className="p-3">
                    <OutfitBoard size="sm" entries={piecesToEntries(d.pieces, byIdAll)} />
                    <p className="text-[11px] mt-2" style={{ color: theme.subtext }}>{d.reasons[0]}</p>
                    <div className="flex gap-2 mt-2">
                      <ActionButton full icon={<Save size={12} />} label={savedIds[i] ? 'Saved' : 'Save'} disabled={!!savedIds[i]}
                        onClick={() => saveLook(i, d)} />
                      <ActionButton full variant="primary" label="Open in Builder" onClick={() => onOpenLook(savedIds[i] ?? saveLook(i, d))} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      )}
    </motion.div>
  )
}
