'use client'

import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, ChevronDown, Loader2, Trash2 } from 'lucide-react'

export interface Preset {
  id: string
  kind: 'venue' | 'schedule'
  name: string
  data: Record<string, string>
}

// "Saved X" dropdown (apply / delete) + "Save this" button, used in the event editor
export default function PresetMenu({
  label,
  saveLabel,
  emptyText,
  presets,
  describe,
  onApply,
  onSave,
  onDelete,
}: {
  label: string
  saveLabel: string
  emptyText: string
  presets: Preset[]
  describe: (p: Preset) => string
  onApply: (p: Preset) => void
  onSave: () => Promise<void>
  onDelete: (p: Preset) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const save = async () => {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-gold-liquid/50 transition"
        >
          {label} <span className="text-text-muted">({presets.length})</span>
          <ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-30 mt-1.5 w-72 max-h-72 overflow-y-auto rounded-xl border border-surface-border bg-surface-elevated shadow-card-hover p-1">
            {presets.length === 0 ? (
              <p className="px-3 py-3 text-2xs text-text-muted">{emptyText}</p>
            ) : (
              presets.map(p => (
                <div key={p.id} className="group flex items-center gap-1 rounded-lg hover:bg-white/5">
                  <button
                    type="button"
                    onClick={() => { onApply(p); setOpen(false) }}
                    className="flex-1 min-w-0 text-left px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-text-primary truncate">{p.name}</p>
                    <p className="text-2xs text-text-muted truncate">{describe(p)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    aria-label={`Delete ${p.name}`}
                    className="p-2 mr-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gold hover:bg-gold-liquid/10 disabled:opacity-60 transition"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <BookmarkPlus size={13} />} {saveLabel}
      </button>
    </div>
  )
}
