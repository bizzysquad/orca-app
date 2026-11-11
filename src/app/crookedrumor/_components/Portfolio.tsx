'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, X, ExternalLink } from 'lucide-react'
import type { PortfolioItem } from '@/lib/crooked/types'
import { autoThumbnail, toEmbed } from '@/lib/crooked/embed'

const ASPECT: Record<PortfolioItem['aspect'], string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-video',
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
}

export default function Portfolio({ items, categories, instagram }: { items: PortfolioItem[]; categories: string[]; instagram?: string }) {
  const [filter, setFilter] = useState('All')
  const [active, setActive] = useState<PortfolioItem | null>(null)

  const usedCats = useMemo(() => categories.filter(c => items.some(i => i.category === c)), [categories, items])
  const shown = useMemo(() => {
    const list = filter === 'All' ? items : items.filter(i => i.category === filter)
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured))
  }, [items, filter])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [active])

  if (items.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['Reels', 'Interviews', 'Event Recaps'].map((t, i) => (
          <div key={t} className={`aspect-[9/16] rounded-2xl border-[3px] border-dashed border-[var(--cr-paper)]/30 flex flex-col items-center justify-center text-center p-4 ${i === 2 ? 'hidden md:flex' : ''}`}>
            <Play className="text-[var(--cr-red)] mb-3" size={36} />
            <div className="cr-display text-lg sm:text-2xl">{t}</div>
            <div className="text-sm opacity-60 mt-2">Fresh work dropping soon</div>
          </div>
        ))}
        {instagram ? (
          <a href={instagram} target="_blank" rel="noreferrer" className="col-span-2 md:col-span-3 text-center underline font-bold opacity-80 hover:opacity-100">
            See the latest on Instagram
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <>
      {usedCats.length > 1 && (
        <div className="cr-scroll-x flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
          {['All', ...usedCats].map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 px-4 py-2 rounded-full border-2 text-sm font-extrabold uppercase tracking-wide transition-colors ${
                filter === c ? 'bg-[var(--cr-red)] border-[var(--cr-red)] text-[var(--cr-paper)]' : 'border-[var(--cr-paper)]/40 hover:border-[var(--cr-paper)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="columns-2 md:columns-3 gap-3 md:gap-5">
        {shown.map(item => {
          const thumb = item.thumbnailUrl || autoThumbnail(item.videoUrl)
          return (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="group relative block w-full mb-3 md:mb-5 break-inside-avoid text-left rounded-2xl overflow-hidden border-[3px] border-[var(--cr-paper)] bg-[var(--cr-ink-soft)]"
            >
              <div className={`${ASPECT[item.aspect] || 'aspect-[9/16]'} relative`}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : item.source === 'upload' ? (
                  <video src={item.videoUrl + '#t=0.5'} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--cr-red-deep)] to-[var(--cr-ink)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute top-3 left-3 w-11 h-11 rounded-full bg-[var(--cr-red)] flex items-center justify-center border-2 border-[var(--cr-paper)] transition-transform group-hover:scale-110">
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  {item.category ? <div className="cr-label text-[var(--cr-red)] mb-1 !text-[10px]">{item.category}</div> : null}
                  <div className="font-black text-sm md:text-lg leading-tight">{item.title}</div>
                  {item.client ? <div className="text-xs opacity-70 mt-0.5">{item.client}</div> : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {active && <Player item={active} onClose={() => setActive(null)} />}
    </>
  )
}

function Player({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const embed = item.source === 'upload' ? { kind: 'video' as const, src: item.videoUrl } : toEmbed(item.videoUrl)
  const vertical = item.aspect === '9:16' || item.aspect === '4:5'
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[var(--cr-paper)] text-[var(--cr-ink)] flex items-center justify-center z-10">
        <X size={22} strokeWidth={3} />
      </button>
      <div className={`w-full ${vertical ? 'max-w-[min(420px,calc((100vh-180px)*0.5625))]' : 'max-w-4xl'}`} onClick={e => e.stopPropagation()}>
        <div className={`${vertical ? 'aspect-[9/16]' : 'aspect-video'} bg-black rounded-2xl overflow-hidden border-[3px] border-[var(--cr-paper)]`}>
          {embed.kind === 'video' ? (
            <video src={embed.src} controls autoPlay playsInline className="w-full h-full object-contain" />
          ) : embed.kind === 'iframe' ? (
            <iframe src={embed.src} title={item.title} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
          ) : (
            <a href={embed.src} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center gap-2 text-[var(--cr-paper)] font-bold underline">
              Watch it here <ExternalLink size={18} />
            </a>
          )}
        </div>
        <div className="mt-4 text-[var(--cr-paper)]">
          <div className="font-black text-xl">{item.title}</div>
          {item.description ? <p className="text-sm opacity-75 mt-1">{item.description}</p> : null}
        </div>
      </div>
    </div>
  )
}
