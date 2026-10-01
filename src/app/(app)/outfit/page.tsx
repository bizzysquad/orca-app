'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ScanLine, Shirt, Palette, Bookmark, Plus } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Gender } from '@/lib/outfit/types'
import { useOutfitStore } from '@/lib/outfit/store'
import BuildTab, { type BuildSeed } from './_components/BuildTab'
import ScanTab from './_components/ScanTab'
import WardrobeTab from './_components/WardrobeTab'
import ColorTab from './_components/ColorTab'
import SavedTab from './_components/SavedTab'
import AddItemsSheet from './_components/AddItemsSheet'
import { ACCENT, ACCENT_INK } from './_components/ui'

type TabId = 'build' | 'scan' | 'wardrobe' | 'color' | 'saved'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'build', label: 'Build Outfit', icon: Sparkles },
  { id: 'scan', label: 'Scan Closet', icon: ScanLine },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
  { id: 'color', label: 'Color Match', icon: Palette },
  { id: 'saved', label: 'Saved Looks', icon: Bookmark },
]

const TAB_KEY = 'orca-outfit-tab' // per-device UI convenience; intentionally not synced

export default function OutfitPage() {
  const { theme } = useTheme()
  const store = useOutfitStore()
  const { prefs, wardrobe, outfits, ready } = store
  const [tab, setTab] = useState<TabId>('build')
  const [adding, setAdding] = useState(false)
  const [buildSeed, setBuildSeed] = useState<BuildSeed>()
  const [colorSeed, setColorSeed] = useState<{ id: string; nonce: number }>()

  useEffect(() => {
    try { const t = localStorage.getItem(TAB_KEY) as TabId | null; if (t && TABS.some(x => x.id === t)) setTab(t) } catch {}
  }, [])

  const go = (t: TabId) => {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setGender = (g: Gender) => {
    if (g === prefs.gender) return
    store.updatePrefs({ gender: g })
    // Sample closets are for exploring — swap them to match the selected styling.
    if (wardrobe.some(w => w.source === 'sample')) store.loadSample(g)
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 max-w-lg mx-auto lg:max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: ACCENT }}>ORCA Outfit</p>
            <h1 className="text-2xl font-black tracking-tight mt-0.5" style={{ color: theme.text }}>Your stylist</h1>
            <p className="text-xs mt-1" style={{ color: theme.subtext }}>
              {ready ? `${wardrobe.length} piece${wardrobe.length === 1 ? '' : 's'} · ${outfits.length} saved look${outfits.length === 1 ? '' : 's'}` : ' '}
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setAdding(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
            style={{ background: ACCENT, color: ACCENT_INK, boxShadow: `0 8px 24px ${ACCENT}35` }}>
            <Plus size={14} /> Add clothes
          </motion.button>
        </div>

        {/* Men | Women */}
        <div className="relative grid grid-cols-2 p-1 rounded-2xl mt-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }} role="tablist" aria-label="Styling for">
          {(['men', 'women'] as Gender[]).map(g => (
            <button key={g} onClick={() => setGender(g)} role="tab" aria-selected={prefs.gender === g}
              className="relative py-2.5 text-sm font-bold rounded-xl z-10 transition-colors"
              style={{ color: prefs.gender === g ? ACCENT_INK : theme.subtext }}>
              {prefs.gender === g && (
                <motion.span layoutId="outfit-gender" className="absolute inset-0 rounded-xl -z-10" style={{ background: ACCENT }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              {g === 'men' ? 'Men' : 'Women'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="sticky top-[58px] z-30" style={{ background: `${theme.bg}f2`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${theme.border}` }}>
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide px-4 py-2 max-w-lg mx-auto lg:max-w-4xl">
          {TABS.map(t => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => go(t.id)}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                style={{ color: active ? theme.text : theme.subtext }}>
                {active && <motion.span layoutId="outfit-tab" className="absolute inset-0 rounded-xl" style={{ background: `${ACCENT}1f`, border: `1px solid ${ACCENT}40` }} />}
                <Icon size={14} className="relative" style={{ color: active ? ACCENT : undefined }} />
                <span className="relative">{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="px-4 pt-5 max-w-lg mx-auto lg:max-w-4xl">
        {!ready ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: theme.card }} />)}
          </div>
        ) : (
          <>
            {/* Build stays mounted so an in-progress outfit survives tab switches. */}
            <div hidden={tab !== 'build'}><BuildTab store={store} seed={buildSeed} /></div>
            {tab === 'scan' && <ScanTab store={store} onOpenLook={id => { setBuildSeed({ nonce: Date.now(), outfitId: id }); go('build') }} />}
            {tab === 'wardrobe' && (
              <WardrobeTab
                store={store}
                onAdd={() => setAdding(true)}
                onBuildAround={id => { setBuildSeed({ nonce: Date.now(), anchorId: id }); go('build') }}
                onColorMatch={c => { setColorSeed({ id: c, nonce: Date.now() }); go('color') }}
              />
            )}
            {tab === 'color' && <ColorTab store={store} initialColor={colorSeed} />}
            {tab === 'saved' && (
              <SavedTab store={store} onEdit={id => { setBuildSeed({ nonce: Date.now(), outfitId: id }); go('build') }} onBuild={() => go('build')} />
            )}
          </>
        )}
      </div>

      <AddItemsSheet open={adding} onClose={() => setAdding(false)} gender={prefs.gender} onAdd={items => { store.addItems(items); go('wardrobe') }} />
    </div>
  )
}
