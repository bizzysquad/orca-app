'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Shuffle, Save, Heart, Eraser, Wand2, Loader2, Send, Shirt, Plus,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { CatalogPiece, Occasion, OutfitDraft, Season, Slot, WardrobeGroup, WardrobeItem } from '@/lib/outfit/types'
import { CATEGORY_CONFIG, GROUP_LABELS, OCCASIONS, OCCASION_IDS, SLOT_LABELS, itemFromCatalog } from '@/lib/outfit/catalog'
import { getColor } from '@/lib/outfit/colors'
import {
  type Entry, type StyleContext, coordinatesWith, emptyPieces, entriesToDraft, generateOutfits,
  piecesToEntries, scoreEntries, slotOf,
} from '@/lib/outfit/engine'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import type { OutfitStore } from '@/lib/outfit/store'
import OutfitBoard, { DRAG_TYPE } from './OutfitBoard'
import SlotPicker from './SlotPicker'
import TryOnStudio from './TryOnStudio'
import { ACCENT, ACCENT_INK, ActionButton, Card, Chip, INDIGO, ItemVisual, SectionTitle, Swatch, fadeUp, inputStyle } from './ui'

export interface BuildSeed { nonce: number; outfitId?: string; anchorId?: string }

const EXAMPLES: Record<'men' | 'women', string[]> = {
  men: ['Rooftop dinner in Miami', 'First date, cool fall night', 'Job interview at a startup', 'Sunday church then brunch'],
  women: ['Rooftop dinner in Miami', 'Garden wedding guest', 'Girls night out downtown', 'Airport outfit, long flight'],
}

/** Apply a pick to an outfit, clearing anything it covers or conflicts with. */
function place(entries: Entry[], slot: Slot, pick: { item?: WardrobeItem; catalog?: CatalogPiece }): Entry[] {
  const piece = pick.item ?? pick.catalog!
  const entry: Entry = { slot, piece, id: pick.item?.id, catalog: pick.catalog }
  if (slot === 'accessory') return [...entries.filter(e => !(e.slot === 'accessory' && e.piece.category === piece.category)), entry]
  const covers = CATEGORY_CONFIG[piece.category].covers ?? []
  return [
    ...entries.filter(e => {
      if (e.slot === slot) return false
      if (covers.includes(e.slot)) return false
      const eCovers = CATEGORY_CONFIG[e.piece.category].covers ?? []
      return !eCovers.includes(slot)
    }),
    entry,
  ]
}

function draftToEntries(d: OutfitDraft, byId: Record<string, WardrobeItem>): Entry[] {
  const entries = piecesToEntries(d.pieces, byId)
  for (const [slot, cat] of Object.entries(d.suggestions)) if (cat) entries.push({ slot: slot as Slot, piece: cat, catalog: cat })
  return entries
}

export default function BuildTab({ store, seed }: { store: OutfitStore; seed?: BuildSeed }) {
  const { theme } = useTheme()
  const { wardrobe, byId, prefs } = store
  const gender = prefs.gender

  const [entries, setEntries] = useState<Entry[]>([])
  const [locked, setLocked] = useState<Set<Slot>>(new Set())
  const [occasion, setOccasion] = useState<Occasion | undefined>(prefs.lastOccasion)
  const [season, setSeason] = useState<Season | undefined>()
  const [results, setResults] = useState<OutfitDraft[]>([])
  const [idx, setIdx] = useState(0)
  const [request, setRequest] = useState('')
  const [thinking, setThinking] = useState(false)
  const [note, setNote] = useState<{ text: string; ai: boolean } | null>(null)
  const [picker, setPicker] = useState<Slot | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [stripGroup, setStripGroup] = useState<WardrobeGroup | 'all'>('all')
  const [anchorId, setAnchorId] = useState<string | null>(null)

  const ctx: StyleContext = useMemo(() => ({ gender, occasion, season }), [gender, occasion, season])

  // Keep entries pointing at the latest version of each owned item (edits in Wardrobe flow through).
  const live = useMemo(() => entries.filter(e => !e.id || byId[e.id]).map(e => (e.id ? { ...e, piece: byId[e.id] } : e)), [entries, byId])
  const { score, reasons } = useMemo(() => scoreEntries(live, ctx), [live, ctx])
  const suggestionsCount = live.filter(e => e.catalog).length

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  // Loading from another tab: "Edit" a saved look or "Build around" an item.
  useEffect(() => {
    if (!seed) return
    if (seed.outfitId) {
      const o = store.outfits.find(x => x.id === seed.outfitId)
      if (o) {
        setEntries(piecesToEntries(o.pieces, byId))
        setLocked(new Set(['top', 'bottom', 'onepiece', 'outerwear', 'shoes', 'accessory'] as Slot[]))
        setOccasion(o.occasion); setEditing({ id: o.id, name: o.name }); setResults([])
      }
    } else if (seed.anchorId && byId[seed.anchorId]) {
      const item = byId[seed.anchorId]
      const slot = slotOf(item)
      const next = place([], slot, { item })
      setEntries(next); setLocked(new Set([slot])); setAnchorId(item.id); setEditing(null)
      runGenerate(next, new Set([slot]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce])

  const lockedPieces = (es: Entry[], lk: Set<Slot>) => {
    const d = entriesToDraft(es.filter(e => lk.has(e.slot) && e.id), 0, [])
    return d.pieces
  }

  function runGenerate(base = live, lk = locked, c: StyleContext = ctx, extra: OutfitDraft[] = []) {
    const out = [...extra, ...generateOutfits({ wardrobe, ctx: c, locked: lockedPieces(base, lk) })]
    setResults(out); setIdx(0)
    if (out[0]) setEntries(draftToEntries(out[0], byId))
    else flash('Add a few pieces to your wardrobe first')
  }

  const tryAnother = () => {
    if (results.length < 2) return runGenerate()
    const next = (idx + 1) % results.length
    setIdx(next)
    setEntries(draftToEntries(results[next], byId))
  }

  const chooseOccasion = (o: Occasion) => {
    const nextOcc = occasion === o ? undefined : o
    setOccasion(nextOcc); setSeason(undefined); setNote(null)
    store.updatePrefs({ lastOccasion: nextOcc })
    runGenerate(live, locked, { gender, occasion: nextOcc })
  }

  const askStylist = async (text = request) => {
    if (!text.trim()) return
    setThinking(true); setNote(null)
    try {
      const r = await OUTFIT_PROVIDERS.stylist.interpret(text, wardrobe, gender)
      const c: StyleContext = { gender, occasion: r.occasion, season: r.season }
      setOccasion(r.occasion); setSeason(r.season)
      // AI-proposed looks are completed + scored by the engine, then lead the carousel.
      const aiLooks = r.looks.map(l => generateOutfits({ wardrobe, ctx: c, locked: l, limit: 1 })[0]).filter(Boolean) as OutfitDraft[]
      runGenerate([], new Set(), c, aiLooks)
      setNote(r.note ? { text: r.note, ai: r.source === 'ai' } : { text: `Styled for ${OCCASIONS[r.occasion].label.toLowerCase()}.`, ai: false })
    } finally { setThinking(false) }
  }

  const pick = (slot: Slot, p: { item?: WardrobeItem; catalog?: CatalogPiece }) => {
    setEntries(prev => place(prev, slot, p))
    if (p.item) { setLocked(prev => new Set(prev).add(slot)); setAnchorId(p.item.id) }
    setPicker(null)
  }

  const removeEntry = (e: Entry) => {
    setEntries(prev => prev.filter(x => x !== e && !(x.slot === e.slot && x.id === e.id && x.catalog === e.catalog)))
    setLocked(prev => { const n = new Set(prev); n.delete(e.slot); return n })
  }

  const adopt = (e: Entry) => {
    if (!e.catalog) return
    const item = itemFromCatalog(e.catalog)
    store.addItems([item])
    setEntries(prev => prev.map(x => (x === e ? { slot: x.slot, piece: item, id: item.id } : x)))
    flash(`${item.name} added to your wardrobe`)
  }

  const save = (favorite = false) => {
    const owned = live.filter(e => e.id)
    if (!owned.length) return flash('Add at least one piece you own')
    const pieces = entriesToDraft(owned, 0, []).pieces
    if (editing) {
      store.updateOutfit(editing.id, { pieces, occasion, ...(favorite ? { favorite: true } : {}) })
      flash('Look updated')
    } else {
      const name = occasion ? `${OCCASIONS[occasion].label} Look` : `${getColor(owned[0].piece.primaryColor).name} ${CATEGORY_CONFIG[owned[0].piece.category].label} Look`
      const saved = store.saveOutfit(pieces, { name, occasion, favorite })
      setEditing({ id: saved.id, name: saved.name })
      flash(suggestionsCount ? 'Saved. Suggested pieces you don\'t own were left out' : favorite ? 'Saved to favorites' : 'Saved to your looks')
    }
  }

  const clear = () => { setEntries([]); setLocked(new Set()); setResults([]); setEditing(null); setNote(null); setAnchorId(null) }

  const anchor = (anchorId && byId[anchorId]) || live.find(e => e.id && (e.slot === 'bottom' || e.slot === 'top' || e.slot === 'onepiece'))?.piece as WardrobeItem | undefined
  const coords = useMemo(() => (anchor ? coordinatesWith(anchor, wardrobe, gender) : []), [anchor, wardrobe, gender])

  const strip = wardrobe.filter(w => stripGroup === 'all' || CATEGORY_CONFIG[w.category].group === stripGroup)

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
      {/* ── AI Outfit Generator ── */}
      <motion.section variants={fadeUp}>
        <Card className="p-4" style={{ background: `linear-gradient(140deg, ${ACCENT}14, ${theme.card} 55%)` }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} style={{ color: ACCENT }} />
            <h2 className="text-[15px] font-bold" style={{ color: theme.text }}>Style me for…</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={request} onChange={e => setRequest(e.target.value)} onKeyDown={e => e.key === 'Enter' && askStylist()}
              placeholder={`"${EXAMPLES[gender][0]}"`}
              className="flex-1 min-w-0 rounded-xl px-3.5 py-3 text-sm outline-none" style={inputStyle(theme)}
            />
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => askStylist()} disabled={thinking || !request.trim()}
              className="px-4 rounded-xl flex items-center disabled:opacity-40" style={{ background: ACCENT, color: ACCENT_INK }} aria-label="Style me">
              {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </motion.button>
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-0.5">
            {EXAMPLES[gender].map(ex => (
              <button key={ex} onClick={() => { setRequest(ex); askStylist(ex) }} className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: theme.bg, color: theme.subtext, border: `1px solid ${theme.border}` }}>{ex}</button>
            ))}
          </div>
          <AnimatePresence>
            {note && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs mt-3 flex items-start gap-1.5" style={{ color: note.ai ? INDIGO : theme.subtext }}>
                <Wand2 size={12} className="mt-0.5 shrink-0" /> {note.text}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex gap-1.5 mt-4 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {OCCASION_IDS.map(o => (
              <Chip key={o} active={occasion === o} onClick={() => chooseOccasion(o)}>
                <span>{OCCASIONS[o].emoji}</span>{OCCASIONS[o].label}
              </Chip>
            ))}
          </div>
        </Card>
      </motion.section>

      {/* ── Outfit Builder workspace ── */}
      <motion.section variants={fadeUp}>
        <SectionTitle
          icon={<Shirt size={15} style={{ color: ACCENT }} />}
          title={editing ? editing.name : 'Outfit Builder'}
          sub={live.length ? (results.length > 1 ? `Look ${idx + 1} of ${results.length}` : 'Tap a piece to replace it') : 'Pick pieces, or let ORCA generate a look'}
          right={live.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative w-11 h-11">
                <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={theme.border} strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={score >= 0.75 ? '#10B981' : ACCENT} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${score * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color: theme.text }}>{Math.round(score * 100)}</span>
              </div>
            </div>
          )}
        />

        {wardrobe.length === 0 && live.length > 0 && (
          <p className="text-[11px] mb-2 px-3 py-2 rounded-xl" style={{ background: `${ACCENT}12`, color: ACCENT }}>
            Your wardrobe is empty, so these are ORCA&apos;s picks. Add your own clothes and looks will be built from what you own.
          </p>
        )}

        <OutfitBoard
          entries={live}
          handlers={{
            onSlotTap: setPicker,
            onRemove: removeEntry,
            onDropItem: (slot, id) => { const it = byId[id]; if (it && slotOf(it) === slot) pick(slot, { item: it }) },
            onAdopt: adopt,
          }}
        />

        {reasons.length > 0 && live.length > 1 && (
          <ul className="mt-3 space-y-1">
            {reasons.slice(0, 4).map(r => (
              <li key={r} className="text-xs flex gap-2" style={{ color: r.startsWith('Heads up') ? '#F59E0B' : theme.subtext }}>
                <span style={{ color: ACCENT }}>•</span>{r}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <ActionButton variant="primary" icon={<Sparkles size={13} />} label="Generate Outfit" onClick={() => runGenerate()} />
          <ActionButton icon={<Shuffle size={13} />} label="Try Another" onClick={tryAnother} disabled={!results.length && !live.length} />
          <ActionButton icon={<Save size={13} />} label={editing ? 'Update Look' : 'Save Outfit'} onClick={() => save(false)} disabled={!live.length} />
          <ActionButton icon={<Heart size={13} />} label="Favorite" onClick={() => save(true)} disabled={!live.length} />
        </div>
        {live.length > 0 && (
          <button onClick={clear} className="mt-2 text-[11px] flex items-center gap-1 mx-auto" style={{ color: theme.subtext }}>
            <Eraser size={11} /> Start over
          </button>
        )}
      </motion.section>

      {/* ── Quick add strip (tap, or drag on desktop) ── */}
      {wardrobe.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title="Your pieces" sub="Tap to place. On desktop you can drag pieces onto the board." />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2">
            {(['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'] as const).map(g => (
              <Chip key={g} size="sm" active={stripGroup === g} onClick={() => setStripGroup(g)}>{g === 'all' ? 'All' : GROUP_LABELS[g]}</Chip>
            ))}
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            {strip.map(w => {
              const inLook = live.some(e => e.id === w.id)
              return (
                <button key={w.id} type="button" draggable
                  onDragStart={e => e.dataTransfer.setData(DRAG_TYPE, w.id)}
                  onClick={() => pick(slotOf(w), { item: w })}
                  className="w-[76px] shrink-0 text-left" style={{ opacity: inLook ? 0.45 : 1 }}>
                  <ItemVisual item={w} className="w-[76px] h-[76px]" rounded="rounded-xl" />
                  <p className="text-[10px] mt-1 truncate" style={{ color: theme.subtext }}>{w.name}</p>
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ── Pairs with ── */}
      {anchor && coords.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle
            icon={<Swatch color={anchor.primaryColor} size={14} />}
            title={`Pairs with your ${anchor.name.toLowerCase()}`}
            sub={getColor(anchor.primaryColor).note}
          />
          <div className="space-y-3">
            {coords.map(c => (
              <div key={c.slot}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>{SLOT_LABELS[c.slot]}</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {c.owned.map(w => (
                    <button key={w.id} onClick={() => pick(c.slot, { item: w })} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full shrink-0"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <ItemVisual item={w} className="w-7 h-7" rounded="rounded-full" />
                      <span className="text-[11px] font-medium" style={{ color: theme.text }}>{w.name}</span>
                    </button>
                  ))}
                  {c.ideas.map(p => (
                    <button key={p.key} onClick={() => pick(c.slot, { catalog: p })} className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
                      style={{ border: `1px dashed ${ACCENT}80`, color: theme.subtext }} title="You don't own this yet">
                      <Swatch color={p.primaryColor} size={12} />
                      <span className="text-[11px]">{p.name}</span>
                      <Plus size={10} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Virtual visualization ── */}
      <motion.section variants={fadeUp}>
        <TryOnStudio entries={live} gender={gender} />
      </motion.section>

      <SlotPicker slot={picker} entries={live} wardrobe={wardrobe} ctx={ctx} onPick={pick} onClose={() => setPicker(null)} />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl"
            style={{ background: theme.text, color: theme.bg }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
