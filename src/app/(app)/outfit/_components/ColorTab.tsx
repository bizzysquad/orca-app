'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, Palette } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Category } from '@/lib/outfit/types'
import { COLOR_PALETTE, MATCH_GROUPS, type MatchGroup, getColor, isLight, paletteFor, relation } from '@/lib/outfit/colors'
import type { OutfitStore } from '@/lib/outfit/store'
import { ACCENT, Card, GarmentArt, ItemVisual, SectionTitle, Swatch, fadeUp } from './ui'

const PAIR_COPY: Record<MatchGroup, string> = {
  best: 'A proven pairing. Wear it anywhere.',
  neutral: 'Quiet and grounded. Let one piece carry the interest.',
  accent: 'Works best in a smaller dose: a tee, scarf, sneaker, or bag.',
  bold: 'High contrast. Confident, so keep the rest of the look simple.',
  avoid: 'These compete or blur together. Add a neutral between them, or swap one.',
}

export default function ColorTab({ store, initialColor }: { store: OutfitStore; initialColor?: { id: string; nonce: number } }) {
  const { theme } = useTheme()
  const { wardrobe, prefs } = store
  const [base, setBase] = useState<string>(initialColor?.id ?? wardrobe[0]?.primaryColor ?? 'navy')
  const [pair, setPair] = useState<string | null>(null)
  const [swap, setSwap] = useState(false)

  useEffect(() => { if (initialColor) { setBase(initialColor.id); setPair(null) } }, [initialColor?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => paletteFor(base), [base])
  const color = getColor(base)
  const owned = useMemo(() => Array.from(new Set(wardrobe.map(w => w.primaryColor))), [wardrobe])

  // Pieces you own that go with the base color, best first.
  const ownedMatches = useMemo(() => {
    const rank: Record<MatchGroup, number> = { best: 0, neutral: 1, accent: 2, bold: 3, avoid: 9 }
    return wardrobe
      .filter(w => w.primaryColor !== base && relation(base, w.primaryColor) !== 'avoid')
      .sort((a, b) => rank[relation(base, a.primaryColor)] - rank[relation(base, b.primaryColor)])
      .slice(0, 12)
  }, [wardrobe, base])

  const pairGroup = pair ? relation(base, pair) : null
  const topCat: Category = prefs.gender === 'women' ? 'blouse' : 'shirt'
  const [topColor, bottomColor] = swap ? [pair ?? base, base] : [base, pair ?? base]
  const pairOwned = pair ? wardrobe.filter(w => w.primaryColor === pair) : []

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
      {/* ── Pick a color ── */}
      <motion.section variants={fadeUp}>
        <SectionTitle icon={<Palette size={15} style={{ color: ACCENT }} />} title="Color Match" sub="Pick a piece's color to see what goes with it." />
        {owned.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>From your wardrobe</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2">
              {owned.map(c => (
                <button key={c} onClick={() => { setBase(c); setPair(null) }} className="flex flex-col items-center gap-1 shrink-0 w-12">
                  <Swatch color={c} size={30} ring={base === c} />
                  <span className="text-[9px] truncate w-full text-center" style={{ color: base === c ? theme.text : theme.subtext }}>{getColor(c).name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>All colors</p>
        <div className="grid grid-cols-9 sm:grid-cols-12 gap-2">
          {COLOR_PALETTE.map(c => (
            <button key={c.id} onClick={() => { setBase(c.id); setPair(null) }} className="flex justify-center" aria-label={c.name}>
              <Swatch color={c.id} size={26} ring={base === c.id} />
            </button>
          ))}
        </div>
      </motion.section>

      {/* ── Hero + combo preview ── */}
      <motion.section variants={fadeUp}>
        <Card className="overflow-hidden">
          <div className="p-4 flex items-center gap-4" style={{ background: color.hex, color: isLight(color.hex) ? '#111' : '#fff' }}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{color.kind === 'neutral' ? 'Neutral' : color.kind === 'metal' ? 'Metal' : 'Color'}</p>
              <h3 className="text-2xl font-black tracking-tight">{color.name}</h3>
              <p className="text-xs mt-1 opacity-85">{color.note}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="flex items-end gap-0 shrink-0" style={{ width: 120, height: 104 }}>
              <div style={{ width: 66, height: 66 }}><GarmentArt category={topCat} color={topColor} /></div>
              <div style={{ width: 54, height: 90 }} className="-ml-2"><GarmentArt category="pants" color={bottomColor} /></div>
            </div>
            <div className="flex-1 min-w-0">
              {pair && pairGroup ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: `${MATCH_GROUPS.find(g => g.id === pairGroup)!.color}20`, color: MATCH_GROUPS.find(g => g.id === pairGroup)!.color }}>
                      {MATCH_GROUPS.find(g => g.id === pairGroup)!.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ color: theme.text }}>{color.name} + {getColor(pair).name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: theme.subtext }}>{PAIR_COPY[pairGroup]}</p>
                  {pairOwned.length > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: theme.subtext }}>You own: {pairOwned.slice(0, 3).map(w => w.name).join(', ')}</p>
                  )}
                  <button onClick={() => setSwap(s => !s)} className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: ACCENT }}>
                    <ArrowLeftRight size={11} /> Swap top / bottom
                  </button>
                </>
              ) : (
                <p className="text-xs" style={{ color: theme.subtext }}>Tap any color below to preview the pairing.</p>
              )}
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ── Groups ── */}
      {MATCH_GROUPS.map(g => groups[g.id].length > 0 && (
        <motion.section key={g.id} variants={fadeUp}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>{g.label}</h3>
          </div>
          <p className="text-[11px] mb-2.5" style={{ color: theme.subtext }}>{g.blurb}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-3">
            {groups[g.id].map(c => (
              <button key={c.id} onClick={() => setPair(c.id)} className="flex flex-col items-center gap-1 w-14">
                <div className="relative">
                  <Swatch color={c.id} size={40} ring={pair === c.id} />
                  {owned.includes(c.id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center"
                      style={{ background: ACCENT, color: '#1F1405', border: `2px solid ${theme.bg}` }} title="You own this color">✓</span>
                  )}
                </div>
                <span className="text-[10px] leading-tight text-center" style={{ color: pair === c.id ? theme.text : theme.subtext }}>{c.name}</span>
              </button>
            ))}
          </div>
        </motion.section>
      ))}

      {/* ── From your closet ── */}
      {ownedMatches.length > 0 && (
        <motion.section variants={fadeUp}>
          <SectionTitle title={`In your wardrobe with ${color.name.toLowerCase()}`} sub="Pieces you own that pair well" />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ownedMatches.map(w => (
              <div key={w.id}>
                <ItemVisual item={w} className="aspect-square w-full" rounded="rounded-xl" />
                <p className="text-[10px] mt-1 truncate" style={{ color: theme.subtext }}>{w.name}</p>
                <p className="text-[9px]" style={{ color: MATCH_GROUPS.find(m => m.id === relation(base, w.primaryColor))!.color }}>
                  {MATCH_GROUPS.find(m => m.id === relation(base, w.primaryColor))!.label}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}
