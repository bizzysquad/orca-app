'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Category, DetectedItem, Formality, Gender, Pattern, Season, Style } from '@/lib/outfit/types'
import {
  CATEGORY_CONFIG, FORMALITY_LABELS, GROUP_LABELS, PATTERNS, SEASONS, STYLES, categoriesFor,
} from '@/lib/outfit/catalog'
import { COLOR_PALETTE, getColor } from '@/lib/outfit/colors'
import { ACCENT, Chip, GOLD, Swatch, inputStyle } from './ui'

export type EditableItem = Pick<DetectedItem,
  'name' | 'category' | 'primaryColor' | 'accentColors' | 'pattern' | 'styles' | 'seasons' | 'formality' | 'brand' | 'confidence'>

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

/** Suggests "Olive Pants" style names from color + type. */
export function autoName(item: Pick<EditableItem, 'primaryColor' | 'category'>): string {
  return `${getColor(item.primaryColor).name} ${CATEGORY_CONFIG[item.category].label}`
}

function Label({ children, warn }: { children: React.ReactNode; warn?: string }) {
  const { theme } = useTheme()
  return (
    <div className="flex items-center gap-2 mb-1.5 mt-4 first:mt-0">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>{children}</span>
      {warn && (
        <span className="text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: `${GOLD}18`, color: GOLD }}>
          <AlertCircle size={10} /> {warn}
        </span>
      )}
    </div>
  )
}

export default function ItemEditor({ value, onChange, gender, compact }: {
  value: EditableItem
  onChange: (patch: Partial<EditableItem>) => void
  gender: Gender
  compact?: boolean
}) {
  const { theme } = useTheme()
  const conf = value.confidence ?? {}
  const cats = categoriesFor(gender)
  const groups = Array.from(new Set(cats.map(c => CATEGORY_CONFIG[c].group)))

  const setCategory = (category: Category) => {
    const cfg = CATEGORY_CONFIG[category]
    const wasAuto = !value.name || value.name === autoName(value)
    onChange({
      category, formality: cfg.formality, styles: cfg.styles, seasons: cfg.seasons,
      confidence: { ...conf, category: 1 },
      ...(wasAuto ? { name: autoName({ ...value, category }) } : {}),
    })
  }
  const setPrimary = (primaryColor: string) => {
    const wasAuto = !value.name || value.name === autoName(value)
    onChange({
      primaryColor, accentColors: value.accentColors.filter(a => a !== primaryColor),
      confidence: { ...conf, color: 1 },
      ...(wasAuto ? { name: autoName({ ...value, primaryColor }) } : {}),
    })
  }

  return (
    <div>
      <Label>Name</Label>
      <input
        value={value.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder={autoName(value)}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
        style={inputStyle(theme)}
      />

      <Label warn={(conf.category ?? 1) < 0.5 ? 'Confirm type' : undefined}>Type</Label>
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g} className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] w-16 shrink-0" style={{ color: theme.subtext }}>{GROUP_LABELS[g]}</span>
            {cats.filter(c => CATEGORY_CONFIG[c].group === g).map(c => (
              <Chip key={c} size="sm" active={value.category === c} onClick={() => setCategory(c)}>{CATEGORY_CONFIG[c].label}</Chip>
            ))}
          </div>
        ))}
      </div>

      <Label warn={(conf.color ?? 1) < 0.5 ? 'Check color' : undefined}>Primary color · {getColor(value.primaryColor).name}</Label>
      <div className="grid grid-cols-9 sm:grid-cols-12 gap-2">
        {COLOR_PALETTE.map(c => (
          <button key={c.id} type="button" onClick={() => setPrimary(c.id)} className="flex justify-center" aria-label={c.name}>
            <Swatch color={c.id} size={24} ring={value.primaryColor === c.id} />
          </button>
        ))}
      </div>

      <Label>Accent colors {value.accentColors.length > 0 && `· ${value.accentColors.map(a => getColor(a).name).join(', ')}`}</Label>
      <div className="grid grid-cols-9 sm:grid-cols-12 gap-2">
        {COLOR_PALETTE.filter(c => c.id !== value.primaryColor).map(c => (
          <button
            key={c.id} type="button" aria-label={c.name}
            onClick={() => onChange({ accentColors: toggle(value.accentColors, c.id).slice(-2) })}
            className="flex justify-center"
            style={{ opacity: value.accentColors.includes(c.id) ? 1 : 0.55 }}
          >
            <Swatch color={c.id} size={20} ring={value.accentColors.includes(c.id)} />
          </button>
        ))}
      </div>

      <Label>Pattern</Label>
      <div className="flex flex-wrap gap-1.5">
        {PATTERNS.map((p: Pattern) => <Chip key={p} size="sm" active={value.pattern === p} onClick={() => onChange({ pattern: p })}>{cap(p)}</Chip>)}
      </div>

      {!compact && (
        <>
          <Label>Style</Label>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s: Style) => <Chip key={s} size="sm" active={value.styles.includes(s)} onClick={() => onChange({ styles: toggle(value.styles, s) })}>{cap(s)}</Chip>)}
          </div>

          <Label>Seasons</Label>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s: Season) => <Chip key={s} size="sm" active={value.seasons.includes(s)} onClick={() => onChange({ seasons: toggle(value.seasons, s) })}>{cap(s)}</Chip>)}
          </div>

          <Label>Formality · {FORMALITY_LABELS[value.formality]}</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as Formality[]).map(f => (
              <button
                key={f} type="button" onClick={() => onChange({ formality: f })}
                className="py-2 rounded-lg text-[10px] font-semibold"
                style={{
                  background: value.formality === f ? ACCENT : theme.card,
                  color: value.formality === f ? '#1F1405' : theme.subtext,
                  border: `1px solid ${value.formality === f ? ACCENT : theme.border}`,
                }}
              >
                {FORMALITY_LABELS[f]}
              </button>
            ))}
          </div>

          <Label>Brand (optional)</Label>
          <input
            value={value.brand || ''}
            onChange={e => onChange({ brand: e.target.value || undefined })}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={inputStyle(theme)}
          />
        </>
      )}
    </div>
  )
}
