'use client'

import React, { useRef, useState } from 'react'
import { UserRound, Layers, Wand2, Loader2, Upload, Lock } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Gender, Slot } from '@/lib/outfit/types'
import { CATEGORY_CONFIG } from '@/lib/outfit/catalog'
import { getColor } from '@/lib/outfit/colors'
import type { Entry } from '@/lib/outfit/engine'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import { blobToDataUrl, downscale } from '@/lib/outfit/vision'
import { ACCENT, ACCENT_INK, Card, GarmentArt, INDIGO, ItemVisual, SectionTitle, Swatch } from './ui'

/** Approximate body regions (fractions of photo height/width) for the composition overlay. */
const REGIONS: Partial<Record<Slot, { top: number; height: number; width: number }>> = {
  outerwear: { top: 0.17, height: 0.38, width: 0.62 },
  top:       { top: 0.18, height: 0.32, width: 0.5 },
  onepiece:  { top: 0.18, height: 0.62, width: 0.56 },
  bottom:    { top: 0.47, height: 0.42, width: 0.4 },
  shoes:     { top: 0.88, height: 0.1, width: 0.34 },
}
const LAYER_ORDER: Slot[] = ['bottom', 'onepiece', 'top', 'outerwear', 'shoes']

export default function TryOnStudio({ entries, gender }: { entries: Entry[]; gender: Gender }) {
  const { theme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'preview' | 'tryon'>('preview')
  const [photo, setPhoto] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(0.8)
  const [rendering, setRendering] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const tryOn = OUTFIT_PROVIDERS.tryOn

  const onPhoto = async (f?: File) => {
    if (!f) return
    // Stays in this browser tab only — never uploaded unless a try-on provider is used.
    setPhoto(await blobToDataUrl(await downscale(f, 900, 0.85)))
    setResult(null)
  }

  const render = async () => {
    if (!photo) return
    setRendering(true); setErr(null)
    try {
      const out = await tryOn.render({
        personImage: photo, gender,
        garments: entries.map(e => ({ imageUrl: (e.piece as { imageUrl?: string }).imageUrl, category: e.piece.category, color: e.piece.primaryColor, name: e.piece.name })),
      })
      setResult(out.imageUrl)
    } catch (e: any) { setErr(e.message) } finally { setRendering(false) }
  }

  const stack = entries.filter(e => e.slot !== 'accessory').sort((a, b) => LAYER_ORDER.indexOf(b.slot) - LAYER_ORDER.indexOf(a.slot))

  return (
    <div>
      <SectionTitle icon={<UserRound size={15} style={{ color: ACCENT }} />} title="See It On You" sub="Upload a full-length photo to visualize this look." />
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
        {([['preview', 'Outfit preview', Layers], ['tryon', 'Virtual try-on', Wand2]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            style={{ background: mode === id ? (id === 'tryon' ? INDIGO : ACCENT) : 'transparent', color: mode === id ? (id === 'tryon' ? '#fff' : ACCENT_INK) : theme.subtext }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] mb-3" style={{ color: theme.subtext }}>
        {mode === 'preview'
          ? 'Coordination preview: your pieces layered over your photo at approximate positions, so you can judge colors and proportions together. It is not a fitted render.'
          : 'AI try-on renders the actual garments on your body. It needs an image-generation model, which isn\'t connected yet.'}
      </p>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />

      <div className="grid grid-cols-[1.25fr_1fr] gap-2.5">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3 / 4.4', background: theme.card, border: `1px solid ${theme.border}` }}>
          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mode === 'tryon' && result ? result : photo} alt="You" className="absolute inset-0 w-full h-full object-cover" />
              {mode === 'preview' && LAYER_ORDER.map(slot => {
                const e = entries.find(x => x.slot === slot)
                const r = REGIONS[slot]
                if (!e || !r) return null
                return (
                  <div key={slot} className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ top: `${r.top * 100}%`, height: `${r.height * 100}%`, width: `${r.width * 100}%`, opacity }}>
                    <GarmentArt category={e.piece.category} color={e.piece.primaryColor} pattern={e.piece.pattern} />
                  </div>
                )
              })}
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>Change</button>
            </>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <Upload size={20} style={{ color: ACCENT }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>Add your photo</span>
              <span className="text-[10px]" style={{ color: theme.subtext }}>Full-length, standing, plain background. Stays on this device.</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {stack.length === 0 && <p className="text-[11px]" style={{ color: theme.subtext }}>Build an outfit above to preview it.</p>}
          {stack.map(e => (
            <div key={e.slot} className="flex items-center gap-2">
              <ItemVisual item={e.piece as any} className="w-12 h-12 shrink-0" rounded="rounded-xl" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{ color: theme.text }}>{e.piece.name}</p>
                <p className="text-[10px]" style={{ color: theme.subtext }}>{CATEGORY_CONFIG[e.piece.category].label}</p>
              </div>
            </div>
          ))}
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Array.from(new Set(entries.map(e => e.piece.primaryColor))).map(c => (
                <span key={c} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: theme.bg, color: theme.subtext }}>
                  <Swatch color={c} size={9} /> {getColor(c).name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'preview' && photo && (
        <label className="flex items-center gap-3 mt-3 text-[11px]" style={{ color: theme.subtext }}>
          Overlay
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="flex-1" style={{ accentColor: ACCENT }} />
        </label>
      )}

      {mode === 'tryon' && (
        <Card className="p-3 mt-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${INDIGO}1c`, color: INDIGO }}>
            {tryOn.live ? <Wand2 size={16} /> : <Lock size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: theme.text }}>{tryOn.live ? tryOn.label : 'AI try-on: not connected yet'}</p>
            <p className="text-[10px]" style={{ color: theme.subtext }}>
              {tryOn.live ? `Sends your photo + ${entries.length} pieces to ${tryOn.label}.` : 'The pipeline is already wired in. Once a try-on model is connected, this button renders the look.'}
            </p>
            {err && <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>{err}</p>}
          </div>
          <button type="button" onClick={render} disabled={!tryOn.live || !photo || !entries.length || rendering}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: INDIGO, color: '#fff' }}>
            {rendering ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Render
          </button>
        </Card>
      )}
    </div>
  )
}
