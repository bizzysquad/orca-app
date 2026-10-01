'use client'

import React, { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Category, Pattern } from '@/lib/outfit/types'
import type { PieceLike } from '@/lib/outfit/engine'
import { getColor, isLight } from '@/lib/outfit/colors'

export const ACCENT = '#E0A96D'      // Outfit's camel accent
export const ACCENT_INK = '#1F1405'  // text on accent fills
export const INDIGO = '#6366F1'
export const GREEN = '#10B981'
export const RED = '#EF4444'
export const GOLD = '#F59E0B'

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

// ── Garment silhouettes ───────────────────────────────────────────────────

type Shape = { body: string; details?: string[] }

const TEE = 'M30 18 L42 12 Q50 19 58 12 L70 18 L87 33 L77 43 L70 37 L70 88 L30 88 L30 37 L23 43 L13 33 Z'
const LONG = 'M32 16 L44 12 Q50 18 56 12 L68 16 L83 26 L90 80 L80 82 L72 42 L72 88 L28 88 L28 42 L20 82 L10 80 L17 26 Z'
const COAT = 'M32 12 L44 9 L50 20 L56 9 L68 12 L84 24 L90 84 L80 86 L73 44 L74 94 L26 94 L27 44 L20 86 L10 84 L16 24 Z'
const PANTS = 'M29 10 L71 10 L75 92 L56 92 L50 36 L44 92 L25 92 Z'

const SHAPES: Record<Category, Shape> = {
  tshirt:   { body: TEE },
  shirt:    { body: TEE, details: ['M44 13 L50 24 L56 13', 'M50 24 L50 88', 'M50 34 h0.1 M50 46 h0.1 M50 58 h0.1 M50 70 h0.1'] },
  blouse:   { body: TEE, details: ['M42 13 L50 30 L58 13'] },
  sweater:  { body: LONG, details: ['M28 82 L72 82', 'M44 13 Q50 20 56 13'] },
  jacket:   { body: LONG, details: ['M50 18 L50 88', 'M44 13 L40 30', 'M56 13 L60 30'] },
  coat:     { body: COAT, details: ['M50 20 L50 94', 'M44 10 L38 36 L50 46', 'M56 10 L62 36 L50 46'] },
  blazer:   { body: COAT, details: ['M44 10 L38 36 L50 52 L62 36 L56 10', 'M50 52 L50 94', 'M58 70 h0.1 M58 80 h0.1'] },
  suit:     { body: COAT, details: ['M44 10 L38 36 L50 52 L62 36 L56 10', 'M47 22 L50 40 L53 22 Z', 'M50 52 L50 94'] },
  pants:    { body: PANTS, details: ['M29 18 L71 18', 'M50 18 L50 36'] },
  jeans:    { body: PANTS, details: ['M29 18 L71 18', 'M34 22 Q38 30 44 26', 'M66 22 Q62 30 56 26'] },
  shorts:   { body: 'M27 20 L73 20 L77 64 L54 64 L50 40 L46 64 L23 64 Z', details: ['M27 27 L73 27'] },
  skirt:    { body: 'M34 18 L66 18 L81 82 L19 82 Z', details: ['M34 25 L66 25'] },
  dress:    { body: 'M38 8 L44 8 Q50 18 56 8 L62 8 L64 30 L58 40 L80 92 L20 92 L42 40 L36 30 Z', details: ['M42 40 L58 40'] },
  shoes:    { body: 'M10 62 Q28 50 54 51 Q78 52 90 64 L90 72 L10 72 Z', details: ['M10 68 L90 68'] },
  sneakers: { body: 'M10 58 L38 54 L50 42 L62 44 Q70 56 88 60 Q93 65 90 72 L10 72 Z', details: ['M10 66 L90 66', 'M44 50 L52 56 M48 46 L56 52'] },
  boots:    { body: 'M30 18 L54 18 L55 56 Q74 58 87 66 L87 76 L30 76 Z', details: ['M30 70 L87 70', 'M30 30 L54 30'] },
  heels:    { body: 'M12 62 Q38 58 56 46 Q70 38 86 50 L82 56 L76 56 L74 78 L69 78 L67 59 Q46 67 16 72 Z' },
  hat:      { body: 'M24 60 Q25 28 50 28 Q75 28 76 60 Z', details: ['M12 60 L88 60 L88 66 L12 66 Z'] },
  watch:    { body: 'M42 8 L58 8 L58 92 L42 92 Z', details: ['M50 50 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', 'M50 50 L50 40 M50 50 L57 54'] },
  jewelry:  { body: 'M50 70 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', details: ['M18 14 Q50 70 82 14'] },
  bag:      { body: 'M20 40 L80 40 L85 88 L15 88 Z', details: ['M35 40 Q35 16 50 16 Q65 16 65 40'] },
  belt:     { body: 'M6 44 L94 44 L94 58 L6 58 Z', details: ['M58 40 L74 40 L74 62 L58 62 Z', 'M62 51 L80 51'] },
  accessory:{ body: 'M44 10 L56 10 L54 22 L62 78 L50 92 L38 78 L46 22 Z', details: ['M44 10 L56 10 L54 22 L46 22 Z'] },
}

/** Vector stand-in for a garment, tinted with its real color + pattern. Used whenever there's no photo. */
export function GarmentArt({ category, color, accent, pattern = 'solid', size = '100%' }: {
  category: Category; color: string; accent?: string; pattern?: Pattern; size?: number | string
}) {
  const uid = useId().replace(/:/g, '')
  const base = getColor(color).hex
  const second = accent ? getColor(accent).hex : isLight(base) ? '#1F2A44' : '#F7F7F5'
  const stroke = isLight(base) ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.22)'
  const shape = SHAPES[category] ?? SHAPES.tshirt
  const fill = pattern === 'solid' || pattern === 'textured' ? base : `url(#p${uid})`
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <defs>
        <pattern id={`p${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={base} />
          {pattern === 'striped' && <rect y="0" width="10" height="3.5" fill={second} />}
          {pattern === 'plaid' && <><rect width="10" height="2.5" fill={second} opacity="0.6" /><rect width="2.5" height="10" fill={second} opacity="0.6" /></>}
          {(pattern === 'floral' || pattern === 'print' || pattern === 'graphic') && <><circle cx="3" cy="3" r="1.8" fill={second} /><circle cx="8" cy="8" r="1.2" fill={second} opacity="0.7" /></>}
        </pattern>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path d={shape.body} fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={shape.body} fill={`url(#g${uid})`} />
      {pattern === 'textured' && <path d={shape.body} fill="none" stroke={stroke} strokeWidth="0.6" strokeDasharray="1 2.5" />}
      {shape.details?.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

/** Photo if we have one, otherwise the tinted silhouette. */
export function ItemVisual({ item, className = '', rounded = 'rounded-2xl' }: {
  item: PieceLike & { imageUrl?: string; accentColors?: string[] }
  className?: string
  rounded?: string
}) {
  const { theme } = useTheme()
  const hex = getColor(item.primaryColor).hex
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${rounded} ${className}`}
      style={{ background: `radial-gradient(120% 90% at 50% 20%, ${hex}22, ${theme.card} 70%)`, border: `1px solid ${theme.border}` }}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-[72%] h-[72%]">
          <GarmentArt category={item.category} color={item.primaryColor} accent={item.accentColors?.[0]} pattern={item.pattern} />
        </div>
      )}
    </div>
  )
}

// ── Small primitives ──────────────────────────────────────────────────────

export function Swatch({ color, size = 18, ring }: { color: string; size?: number; ring?: boolean }) {
  const { theme } = useTheme()
  const hex = getColor(color).hex
  const metal = getColor(color).kind === 'metal'
  return (
    <span
      className="inline-block rounded-full shrink-0"
      title={getColor(color).name}
      style={{
        width: size, height: size,
        background: metal ? `linear-gradient(135deg, ${hex}, #ffffff88 50%, ${hex})` : hex,
        boxShadow: ring ? `0 0 0 2px ${theme.bg}, 0 0 0 4px ${ACCENT}` : `inset 0 0 0 1px ${isLight(hex) ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.14)'}`,
      }}
    />
  )
}

export function Chip({ active, onClick, children, color = ACCENT, size = 'md' }: {
  active?: boolean; onClick?: () => void; children: React.ReactNode; color?: string; size?: 'sm' | 'md'
}) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'} rounded-full font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors`}
      style={{
        background: active ? color : theme.card,
        color: active ? (isLight(color) ? ACCENT_INK : '#fff') : theme.subtext,
        border: `1px solid ${active ? color : theme.border}`,
      }}
    >
      {children}
    </button>
  )
}

export function SectionTitle({ icon, title, sub, right }: { icon?: React.ReactNode; title: string; sub?: string; right?: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[15px] font-bold tracking-tight" style={{ color: theme.text }}>{title}</h2>
        </div>
        {sub && <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { theme } = useTheme()
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: theme.card, border: `1px solid ${theme.border}`, ...style }}>
      {children}
    </div>
  )
}

export function ActionButton({ icon, label, onClick, variant = 'ghost', disabled, full }: {
  icon?: React.ReactNode; label: string; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; full?: boolean
}) {
  const { theme } = useTheme()
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: ACCENT, color: ACCENT_INK, border: `1px solid ${ACCENT}` },
    ghost: { background: theme.card, color: theme.text, border: `1px solid ${theme.border}` },
    danger: { background: `${RED}14`, color: RED, border: `1px solid ${RED}30` },
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${full ? 'w-full' : ''}`}
      style={styles[variant]}
    >
      {icon}{label}
    </motion.button>
  )
}

export function FavButton({ on, onClick, size = 14 }: { on: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className="p-1.5 rounded-full"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
      aria-label={on ? 'Unfavorite' : 'Favorite'}
    >
      <Heart size={size} fill={on ? '#F43F5E' : 'none'} color={on ? '#F43F5E' : '#fff'} />
    </button>
  )
}

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean
}) {
  const { theme } = useTheme()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl`}
            style={{ background: theme.surface, border: `1px solid ${theme.border}`, paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="text-base font-bold" style={{ color: theme.text }}>{title}</h3>
              <button onClick={onClose} className="p-2 rounded-xl" style={{ background: theme.card }} aria-label="Close">
                <X size={15} style={{ color: theme.subtext }} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function EmptyBlock({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${ACCENT}18`, color: ACCENT }}>{icon}</div>
      <p className="text-sm font-semibold" style={{ color: theme.text }}>{title}</p>
      <p className="text-xs mt-1 mb-4 max-w-xs mx-auto" style={{ color: theme.subtext }}>{body}</p>
      <div className="flex flex-wrap gap-2 justify-center">{children}</div>
    </Card>
  )
}

export const inputStyle = (theme: { card: string; border: string; text: string }): React.CSSProperties => ({
  background: theme.card, border: `1px solid ${theme.border}`, color: theme.text,
})
