'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2, Plus, X, Upload, Loader2 } from 'lucide-react'

export function newId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-black uppercase tracking-[0.1em] mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[var(--cr-muted)] mt-1">{hint}</span> : null}
    </label>
  )
}

export function Text({ value, onChange, placeholder, area, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; rows?: number }) {
  return area ? (
    <textarea className="cr-input !text-[15px] !py-2.5" rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  ) : (
    <input className="cr-input !text-[15px] !py-2.5" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  )
}

// Dollars in the box, cents in the data. Empty → null when `nullable`.
export function Money({ cents, onChange, nullable, placeholder }: { cents: number | null; onChange: (c: number | null) => void; nullable?: boolean; placeholder?: string }) {
  const [txt, setTxt] = useState(cents == null ? '' : String(cents / 100))
  useEffect(() => {
    const parsed = txt.trim() === '' ? null : Math.round(parseFloat(txt) * 100)
    if (parsed !== cents) setTxt(cents == null ? '' : String(cents / 100))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents])
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[var(--cr-muted)]">$</span>
      <input
        className="cr-input !text-[15px] !py-2.5 !pl-7"
        inputMode="decimal"
        value={txt}
        placeholder={placeholder ?? (nullable ? 'Custom' : '0')}
        onChange={e => {
          const v = e.target.value.replace(/[^\d.]/g, '')
          setTxt(v)
          if (v === '') onChange(nullable ? null : 0)
          else if (!isNaN(parseFloat(v))) onChange(Math.round(parseFloat(v) * 100))
        }}
      />
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-sm font-bold">
      <span className={`w-10 h-6 rounded-full border-2 border-[var(--cr-ink)] relative transition-colors ${on ? 'bg-[var(--cr-red)]' : 'bg-[var(--cr-paper)]'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--cr-ink)] transition-all ${on ? 'left-[18px] !bg-[var(--cr-paper)]' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  )
}

export function RowActions({
  index, count, hidden, onMove, onToggleHidden, onDuplicate, onDelete,
}: {
  index: number
  count: number
  hidden?: boolean
  onMove: (dir: -1 | 1) => void
  onToggleHidden?: () => void
  onDuplicate?: () => void
  onDelete: () => void
}) {
  const btn = 'w-9 h-9 rounded-lg border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--cr-tan)]'
  return (
    <div className="flex gap-1.5 shrink-0">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} title="Move up" aria-label="Move up"><ArrowUp size={16} /></button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(1)} title="Move down" aria-label="Move down"><ArrowDown size={16} /></button>
      {onToggleHidden && (
        <button type="button" className={`${btn} ${hidden ? '!bg-[var(--cr-ink)] text-[var(--cr-paper)]' : ''}`} onClick={onToggleHidden} title={hidden ? 'Hidden. Click to show' : 'Visible. Click to hide'} aria-label={hidden ? 'Show' : 'Hide'}>
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {onDuplicate && <button type="button" className={btn} onClick={onDuplicate} title="Duplicate" aria-label="Duplicate"><Copy size={16} /></button>}
      <button
        type="button"
        className={`${btn} hover:!bg-[var(--cr-red)] hover:text-[var(--cr-paper)]`}
        onClick={() => { if (confirm('Delete this? You can still undo by not saving.')) onDelete() }}
        title="Delete"
        aria-label="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export function StringList({ items, onChange, placeholder, addLabel = 'Add' }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input className="cr-input !text-[15px] !py-2" value={it} placeholder={placeholder} onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(move(items, i, -1))} disabled={i === 0} className="px-2 disabled:opacity-30" aria-label="Move up"><ArrowUp size={16} /></button>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2 text-[var(--cr-red)]" aria-label="Remove"><X size={18} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="inline-flex items-center gap-1 text-sm font-black uppercase text-[var(--cr-red)]">
        <Plus size={16} strokeWidth={3} /> {addLabel}
      </button>
    </div>
  )
}

// Direct browser → Supabase Storage upload through a signed URL.
export async function uploadFile(file: File, folder: 'portfolio' | 'thumbs' | 'brand', onProgress?: (pct: number) => void): Promise<string> {
  const res = await fetch('/api/crookedrumors/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, folder }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', data.signedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(parseStorageError(xhr.responseText) || `Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))
    xhr.send(file)
  })
  return data.publicUrl
}

function parseStorageError(text: string): string {
  try {
    const j = JSON.parse(text)
    const msg = j.message || j.error || ''
    if (/exceeded the maximum allowed size|too large/i.test(msg)) return 'That file is bigger than your Supabase storage upload limit. Compress it or raise the limit in Supabase > Storage > Settings.'
    return msg
  } catch {
    return ''
  }
}

export function UploadButton({ accept, folder, onUploaded, label }: { accept: string; folder: 'portfolio' | 'thumbs' | 'brand'; onUploaded: (url: string) => void; label: string }) {
  const [pct, setPct] = useState<number | null>(null)
  const [err, setErr] = useState('')
  return (
    <div>
      <label className={`cr-btn cr-btn-paper cr-btn-sm cursor-pointer ${pct != null ? 'pointer-events-none opacity-70' : ''}`}>
        {pct != null ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} strokeWidth={3} />}
        {pct != null ? `Uploading ${pct}%` : label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setErr('')
            setPct(0)
            try {
              onUploaded(await uploadFile(f, folder, setPct))
            } catch (x: any) {
              setErr(x.message)
            } finally {
              setPct(null)
            }
          }}
        />
      </label>
      {err && <p className="text-xs font-bold text-[var(--cr-red)] mt-1">{err}</p>}
    </div>
  )
}

export function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="cr-card !shadow-[4px_4px_0_var(--cr-ink)] p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="cr-display text-xl">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}
