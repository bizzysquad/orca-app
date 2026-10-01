'use client'

import React, { useRef, useState } from 'react'
import { Camera, ImagePlus, Link2, PenLine, Loader2, ArrowRight } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Category, Gender, WardrobeItem } from '@/lib/outfit/types'
import { CATEGORY_CONFIG } from '@/lib/outfit/catalog'
import { OUTFIT_PROVIDERS } from '@/lib/outfit/providers'
import ReviewQueue, { type Draft, toDraft } from './ReviewQueue'
import { ACCENT, ACCENT_INK, RED, Sheet, inputStyle } from './ui'

function Tile({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <button
      type="button" onClick={onClick}
      className="rounded-2xl p-4 text-left flex flex-col gap-3 transition-transform active:scale-[0.98]"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}1c`, color: ACCENT }}>{icon}</div>
      <div>
        <p className="text-sm font-semibold" style={{ color: theme.text }}>{title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: theme.subtext }}>{sub}</p>
      </div>
    </button>
  )
}

export default function AddItemsSheet({ open, onClose, gender, onAdd }: {
  open: boolean
  onClose: () => void
  gender: Gender
  onAdd: (items: WardrobeItem[]) => void
}) {
  const { theme } = useTheme()
  const cameraRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  const reset = () => { drafts.forEach(d => d.previewUrl && URL.revokeObjectURL(d.previewUrl)); setDrafts([]); setError(null); setUrl(''); setBusy(null) }
  const close = () => { reset(); onClose() }

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setError(null)
    const files = Array.from(list).slice(0, 20)
    const out: Draft[] = []
    for (let i = 0; i < files.length; i++) {
      setBusy(`Analyzing ${i + 1} of ${files.length}…`)
      try {
        out.push(toDraft(await OUTFIT_PROVIDERS.recognition.analyze(files[i], files[i].name)))
      } catch {
        setError(`Couldn't read ${files[i].name} — try a JPG or PNG.`)
      }
    }
    setDrafts(prev => [...prev, ...out])
    setBusy(null)
  }

  const importUrl = async () => {
    if (!url.trim()) return
    setError(null); setBusy('Reading product page…')
    try {
      const d = await OUTFIT_PROVIDERS.productImport.importUrl(url.trim())
      setDrafts(prev => [...prev, toDraft(d)])
      setUrl('')
    } catch (e: any) {
      setError(e.message || 'Could not import that link')
    } finally { setBusy(null) }
  }

  const addManual = (category: Category = 'shirt') => {
    const cfg = CATEGORY_CONFIG[category]
    setDrafts(prev => [...prev, toDraft({
      name: '', category, primaryColor: 'navy', accentColors: [], pattern: 'solid',
      styles: cfg.styles, seasons: cfg.seasons, formality: cfg.formality, source: 'manual',
    })])
  }

  return (
    <Sheet open={open} onClose={close} title={drafts.length ? `Review ${drafts.length} item${drafts.length === 1 ? '' : 's'}` : 'Add to Wardrobe'}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      <input ref={filesRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />

      {busy && (
        <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2.5 rounded-xl" style={{ background: `${ACCENT}14`, color: ACCENT }}>
          <Loader2 size={14} className="animate-spin" /> {busy}
        </div>
      )}
      {error && <p className="text-xs mb-3 px-3 py-2 rounded-xl" style={{ background: `${RED}12`, color: RED }}>{error}</p>}

      {drafts.length === 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Tile icon={<Camera size={18} />} title="Take Photo" sub="Snap one piece" onClick={() => cameraRef.current?.click()} />
            <Tile icon={<ImagePlus size={18} />} title="Upload Photos" sub="Pick several at once" onClick={() => filesRef.current?.click()} />
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: theme.subtext }}>
              <Link2 size={12} /> Product link
            </p>
            <div className="flex gap-2">
              <input
                value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && importUrl()}
                inputMode="url" placeholder="Paste a link from any retailer"
                className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm outline-none" style={inputStyle(theme)}
              />
              <button onClick={importUrl} disabled={!url.trim() || !!busy} className="px-3.5 rounded-xl disabled:opacity-40"
                style={{ background: ACCENT, color: ACCENT_INK }} aria-label="Import link">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <button onClick={() => addManual()} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold"
            style={{ background: theme.card, color: theme.subtext, border: `1px dashed ${theme.border}` }}>
            <PenLine size={13} /> Add without a photo
          </button>
          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: theme.subtext }}>
            Tip: lay the piece flat on a bed or plain wall in daylight. ORCA reads colors on your phone; you can confirm the type and details before anything is saved.
          </p>
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={() => filesRef.current?.click()} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}>
              <ImagePlus size={13} /> More photos
            </button>
            <button onClick={() => addManual()} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}>
              <PenLine size={13} /> Manual
            </button>
          </div>
          <ReviewQueue drafts={drafts} setDrafts={setDrafts} gender={gender} onConfirm={items => { onAdd(items); setDrafts([]); onClose() }} />
        </>
      )}
    </Sheet>
  )
}
