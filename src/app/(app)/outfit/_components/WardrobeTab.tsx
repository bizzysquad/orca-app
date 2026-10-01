'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Plus, SlidersHorizontal, Shirt, Sparkles, Palette, Trash2, ShoppingBag, ExternalLink, Check, X,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Season, Style, WardrobeGroup, WardrobeItem } from '@/lib/outfit/types'
import { CATEGORY_CONFIG, GROUP_LABELS, SEASONS, STYLES, itemFromCatalog } from '@/lib/outfit/catalog'
import { COLOR_BY_ID, getColor } from '@/lib/outfit/colors'
import { wardrobeGaps } from '@/lib/outfit/engine'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import type { OutfitStore } from '@/lib/outfit/store'
import ItemEditor from './ItemEditor'
import {
  ACCENT, ACCENT_INK, ActionButton, Card, Chip, EmptyBlock, FavButton, GREEN, ItemVisual, SectionTitle, Sheet, Swatch, fadeUp, inputStyle,
} from './ui'

type Tab = 'all' | WardrobeGroup | 'favorites'
const TABS: Tab[] = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'favorites']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function WardrobeTab({ store, onAdd, onBuildAround, onColorMatch }: {
  store: OutfitStore
  onAdd: () => void
  onBuildAround: (id: string) => void
  onColorMatch: (color: string) => void
}) {
  const { theme } = useTheme()
  const { wardrobe, prefs } = store
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [color, setColor] = useState<string | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [style, setStyle] = useState<Style | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: wardrobe.length, favorites: wardrobe.filter(w => w.favorite).length }
    wardrobe.forEach(w => { const g = CATEGORY_CONFIG[w.category].group; c[g] = (c[g] ?? 0) + 1 })
    return c
  }, [wardrobe])

  const colorsPresent = useMemo(() => Array.from(new Set(wardrobe.map(w => w.primaryColor))), [wardrobe])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return wardrobe.filter(w => {
      if (tab === 'favorites' ? !w.favorite : tab !== 'all' && CATEGORY_CONFIG[w.category].group !== tab) return false
      if (color && w.primaryColor !== color && !w.accentColors.includes(color)) return false
      if (season && !w.seasons.includes(season)) return false
      if (style && !w.styles.includes(style)) return false
      if (term) {
        const hay = `${w.name} ${w.brand ?? ''} ${CATEGORY_CONFIG[w.category].label} ${getColor(w.primaryColor).name} ${w.pattern}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [wardrobe, tab, q, color, season, style])

  const gaps = useMemo(() => wardrobeGaps(wardrobe, prefs.gender), [wardrobe, prefs.gender])
  const open = openId ? wardrobe.find(w => w.id === openId) : undefined
  const activeFilters = [color, season, style].filter(Boolean).length
  const hasSample = wardrobe.some(w => w.source === 'sample')

  if (!wardrobe.length) {
    return (
      <EmptyBlock icon={<Shirt size={22} />} title="Your digital closet is empty"
        body="Snap your clothes, paste product links, or scan your whole closet. You can also start with a sample wardrobe to explore.">
        <ActionButton variant="primary" icon={<Plus size={13} />} label="Add clothes" onClick={onAdd} />
        <ActionButton icon={<Sparkles size={13} />} label={`Load sample ${prefs.gender === 'men' ? "men's" : "women's"} closet`} onClick={() => store.loadSample(prefs.gender)} />
      </EmptyBlock>
    )
  }

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="space-y-4">
      {hasSample && (
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs"
          style={{ background: `${ACCENT}12`, color: ACCENT }}>
          <span>Includes sample pieces, so you can try every feature before adding your own.</span>
          <button onClick={store.clearSample} className="font-bold whitespace-nowrap underline">Remove samples</button>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.subtext }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${wardrobe.length} pieces`}
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none" style={inputStyle(theme)} />
        </div>
        <button onClick={() => setShowFilters(s => !s)} className="px-3 rounded-xl relative" aria-label="Filters"
          style={{ background: showFilters || activeFilters ? `${ACCENT}1c` : theme.card, border: `1px solid ${theme.border}`, color: activeFilters ? ACCENT : theme.subtext }}>
          <SlidersHorizontal size={15} />
          {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: ACCENT, color: ACCENT_INK }}>{activeFilters}</span>}
        </button>
        <button onClick={onAdd} className="px-3 rounded-xl flex items-center gap-1 text-xs font-semibold" style={{ background: ACCENT, color: ACCENT_INK }}>
          <Plus size={14} /> Add
        </button>
      </motion.div>

      {showFilters && (
        <Card className="p-3 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>Color</p>
            <div className="flex flex-wrap gap-2">
              {colorsPresent.map(c => (
                <button key={c} onClick={() => setColor(color === c ? null : c)} aria-label={COLOR_BY_ID[c]?.name}>
                  <Swatch color={c} size={22} ring={color === c} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>Season</p>
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map(s => <Chip key={s} size="sm" active={season === s} onClick={() => setSeason(season === s ? null : s)}>{cap(s)}</Chip>)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>Style</p>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map(s => <Chip key={s} size="sm" active={style === s} onClick={() => setStyle(style === s ? null : s)}>{cap(s)}</Chip>)}
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setColor(null); setSeason(null); setStyle(null) }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: theme.subtext }}>
              <X size={11} /> Clear filters
            </button>
          )}
        </Card>
      )}

      <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
        {TABS.map(t => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'favorites' ? 'Favorites' : GROUP_LABELS[t]}
            <span style={{ opacity: 0.65 }}>{counts[t] ?? 0}</span>
          </Chip>
        ))}
      </motion.div>

      {filtered.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: theme.subtext }}>No pieces match. Try clearing a filter.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(w => (
            <motion.button key={w.id} variants={fadeUp} type="button" onClick={() => { setOpenId(w.id); setConfirmDelete(false) }} className="text-left">
              <div className="relative">
                <ItemVisual item={w} className="w-full aspect-[4/5]" />
                <div className="absolute top-2 right-2"><FavButton on={w.favorite} onClick={() => store.updateItem(w.id, { favorite: !w.favorite })} /></div>
                {w.wearCount > 0 && (
                  <span className="absolute bottom-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                    Worn {w.wearCount}×
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold mt-1.5 truncate" style={{ color: theme.text }}>{w.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Swatch color={w.primaryColor} size={10} />
                {w.accentColors.map(a => <Swatch key={a} color={a} size={8} />)}
                <span className="text-[10px] truncate ml-0.5" style={{ color: theme.subtext }}>{CATEGORY_CONFIG[w.category].label}</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* ── Complete Your Wardrobe ── */}
      {gaps.length > 0 && (
        <motion.section variants={fadeUp} className="pt-4">
          <SectionTitle icon={<ShoppingBag size={15} style={{ color: ACCENT }} />} title="Complete Your Wardrobe" sub="Pieces that would unlock the most new outfits" />
          <div className="space-y-2.5">
            {gaps.map(g => (
              <Card key={g.piece.key} className="p-3">
                <div className="flex gap-3">
                  <ItemVisual item={g.piece} className="w-16 h-16 shrink-0" rounded="rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>{g.piece.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>
                      Works with <b style={{ color: GREEN }}>{g.matches} item{g.matches === 1 ? '' : 's'}</b> already in your wardrobe
                    </p>
                    <div className="flex -space-x-1.5 mt-1.5">
                      {g.examples.map(e => <div key={e.id} className="w-6 h-6"><ItemVisual item={e} className="w-6 h-6" rounded="rounded-full" /></div>)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {OUTFIT_PROVIDERS.shopping.linksFor(g.piece, prefs.gender).map(l => (
                    <a key={l.label} href={l.url} target="_blank" rel={l.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
                      {l.label} <ExternalLink size={10} />
                    </a>
                  ))}
                  <button onClick={() => store.addItems([itemFromCatalog(g.piece)])} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                    style={{ background: `${GREEN}14`, color: GREEN, border: `1px solid ${GREEN}30` }}>
                    <Check size={11} /> I own this
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Item detail / edit ── */}
      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''}>
        {open && (
          <>
            <div className="flex gap-3 mb-4">
              <ItemVisual item={open} className="w-28 h-32 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <ActionButton full icon={<Sparkles size={13} />} label="Build outfit around this" variant="primary" onClick={() => { setOpenId(null); onBuildAround(open.id) }} />
                <ActionButton full icon={<Palette size={13} />} label="Match its color" onClick={() => { setOpenId(null); onColorMatch(open.primaryColor) }} />
                {open.productUrl && (
                  <a href={open.productUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 justify-center" style={{ color: theme.subtext }}>
                    View product <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
            <ItemEditor value={open} onChange={p => store.updateItem(open.id, p)} gender={prefs.gender} />
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <ActionButton full label="Cancel" onClick={() => setConfirmDelete(false)} />
                  <ActionButton full variant="danger" icon={<Trash2 size={13} />} label="Delete for good" onClick={() => { store.removeItem(open.id); setOpenId(null) }} />
                </div>
              ) : (
                <ActionButton full variant="danger" icon={<Trash2 size={13} />} label="Remove from wardrobe" onClick={() => setConfirmDelete(true)} />
              )}
            </div>
          </>
        )}
      </Sheet>
    </motion.div>
  )
}
