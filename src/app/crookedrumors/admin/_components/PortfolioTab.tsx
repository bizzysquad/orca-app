'use client'

import { Plus, Star, Upload, Link2 } from 'lucide-react'
import type { PortfolioItem, SiteDoc } from '@/lib/crooked/types'
import { autoThumbnail, toEmbed } from '@/lib/crooked/embed'
import type { SetDoc } from './AdminApp'
import { Field, Panel, RowActions, StringList, Text, Toggle, UploadButton, move, newId } from './ui'

export default function PortfolioTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const cats = doc.settings.portfolioCategories
  const upd = (id: string, patch: Partial<PortfolioItem>) => setDoc(d => ({ ...d, portfolio: d.portfolio.map(p => (p.id === id ? { ...p, ...patch } : p)) }))
  const add = (source: PortfolioItem['source']) =>
    setDoc(d => ({
      ...d,
      portfolio: [
        { id: newId('work'), title: 'New project', description: '', category: cats[0] || '', client: '', source, videoUrl: '', thumbnailUrl: '', aspect: '9:16', featured: false, hidden: false },
        ...d.portfolio,
      ],
    }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="cr-display text-3xl">Portfolio</h2>
          <p className="text-sm text-[var(--cr-muted)] mt-1">Upload video files, or paste a YouTube, Instagram, TikTok, Vimeo, or Google Drive link. Featured items show first.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => add('upload')} className="cr-btn cr-btn-ink cr-btn-sm"><Upload size={14} strokeWidth={3} /> Upload video</button>
          <button onClick={() => add('embed')} className="cr-btn cr-btn-paper cr-btn-sm"><Link2 size={14} strokeWidth={3} /> Paste link</button>
        </div>
      </div>

      <Panel title="Portfolio categories">
        <p className="text-sm text-[var(--cr-muted)] mb-3">These become the filter buttons on the Work section.</p>
        <StringList items={cats} onChange={v => setDoc(d => ({ ...d, settings: { ...d.settings, portfolioCategories: v } }))} placeholder="e.g. Reels" addLabel="Add category" />
      </Panel>

      {doc.portfolio.length === 0 && <p className="font-semibold">Nothing here yet. Add your first project above.</p>}

      <div className="grid lg:grid-cols-2 gap-4">
        {doc.portfolio.map((item, i) => {
          const thumb = item.thumbnailUrl || autoThumbnail(item.videoUrl)
          const embed = item.source === 'embed' && item.videoUrl ? toEmbed(item.videoUrl) : null
          return (
            <div key={item.id} className={`cr-card-flat !border-[3px] p-4 ${item.hidden ? 'opacity-60' : ''}`}>
              <div className="flex gap-4">
                <div className="w-24 shrink-0">
                  <div className="aspect-[9/16] rounded-lg overflow-hidden bg-[var(--cr-ink)] border-2 border-[var(--cr-ink)] relative">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : item.source === 'upload' && item.videoUrl ? (
                      <video src={item.videoUrl + '#t=0.5'} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--cr-paper)]/60 font-bold text-center p-1">No preview</div>
                    )}
                    {item.featured && <Star size={16} className="absolute top-1 right-1 text-yellow-300" fill="currentColor" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex justify-end">
                    <RowActions
                      index={i}
                      count={doc.portfolio.length}
                      hidden={item.hidden}
                      onMove={dir => setDoc(d => ({ ...d, portfolio: move(d.portfolio, i, dir) }))}
                      onToggleHidden={() => upd(item.id, { hidden: !item.hidden })}
                      onDelete={() => setDoc(d => ({ ...d, portfolio: d.portfolio.filter(x => x.id !== item.id) }))}
                    />
                  </div>
                  <Field label="Title"><Text value={item.title} onChange={v => upd(item.id, { title: v })} /></Field>
                </div>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {item.source === 'upload' ? (
                  <Field label="Video file" className="sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <UploadButton accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" folder="portfolio" label={item.videoUrl ? 'Replace video' : 'Choose video'} onUploaded={url => upd(item.id, { videoUrl: url })} />
                      {item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold underline truncate max-w-[220px]">View file</a>}
                    </div>
                  </Field>
                ) : (
                  <Field label="Video link" className="sm:col-span-2" hint={embed ? (embed.kind === 'link' ? 'Not a recognized player link. It will open in a new tab.' : `Plays from ${embed.kind === 'iframe' ? embed.provider : 'the file'}`) : undefined}>
                    <Text value={item.videoUrl} onChange={v => upd(item.id, { videoUrl: v })} placeholder="https://www.instagram.com/reel/..." />
                  </Field>
                )}
                <Field label="Thumbnail" className="sm:col-span-2" hint={item.source === 'embed' && autoThumbnail(item.videoUrl) && !item.thumbnailUrl ? 'Using the YouTube thumbnail automatically' : 'Optional. A still image makes the grid load faster.'}>
                  <div className="flex flex-wrap items-center gap-3">
                    <UploadButton accept="image/*" folder="thumbs" label={item.thumbnailUrl ? 'Replace image' : 'Upload image'} onUploaded={url => upd(item.id, { thumbnailUrl: url })} />
                    {item.thumbnailUrl && <button onClick={() => upd(item.id, { thumbnailUrl: '' })} className="text-xs font-bold underline text-[var(--cr-red)]">Remove</button>}
                  </div>
                </Field>
                <Field label="Category">
                  <select className="cr-input !text-[15px] !py-2.5" value={item.category} onChange={e => upd(item.id, { category: e.target.value })}>
                    <option value="">None</option>
                    {cats.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Shape">
                  <select className="cr-input !text-[15px] !py-2.5" value={item.aspect} onChange={e => upd(item.id, { aspect: e.target.value as PortfolioItem['aspect'] })}>
                    <option value="9:16">Vertical 9:16 (Reels)</option>
                    <option value="4:5">Portrait 4:5</option>
                    <option value="1:1">Square 1:1</option>
                    <option value="16:9">Widescreen 16:9</option>
                  </select>
                </Field>
                <Field label="Client (optional)"><Text value={item.client} onChange={v => upd(item.id, { client: v })} /></Field>
                <div className="flex items-end pb-2"><Toggle on={item.featured} onChange={v => upd(item.id, { featured: v })} label="Featured" /></div>
                <Field label="Description (optional)" className="sm:col-span-2"><Text area rows={2} value={item.description} onChange={v => upd(item.id, { description: v })} /></Field>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
