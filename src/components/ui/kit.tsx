'use client'

// Shared building blocks for the redesigned money pages (Bill Boss, Smart
// Stack). Same visual language as the home dashboard: neutral cards, text in
// text colors, color only for meaning, one accent for actions.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function PageShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div className="min-h-screen pb-24 lg:pb-12 overflow-x-hidden" style={{ background: theme.bg, color: theme.text }}>
      <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-6 lg:px-8 lg:pt-8">{children}</div>
    </div>
  )
}

export function PageHeader({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight leading-tight" style={{ color: theme.text }}>{title}</h1>
        {sub && <div className="text-[13.5px] mt-1" style={{ color: theme.subtext }}>{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  )
}

export function Panel({ children, className = '', pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  const { theme } = useTheme()
  return (
    <section className={`rounded-2xl min-w-0 ${pad ? 'p-5' : ''} ${className}`} style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
      {children}
    </section>
  )
}

export function PanelTitle({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold tracking-tight" style={{ color: theme.text }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  const { theme } = useTheme()
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium truncate" style={{ color: theme.subtext }}>{label}</p>
      <p className="mt-1 text-[22px] md:text-[24px] font-semibold tnum tracking-tight leading-none truncate" style={{ color: tone || theme.text }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] truncate" style={{ color: theme.subtext }}>{sub}</p>}
    </div>
  )
}

export function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-xl px-3 py-2.5 min-w-0" style={{ backgroundColor: `${theme.text}08` }}>
      <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{label}</p>
      <p className="text-[14px] font-semibold tnum truncate" style={{ color: tone || theme.text }}>{value}</p>
    </div>
  )
}

export function Bar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-full overflow-hidden" style={{ height, backgroundColor: `${theme.text}12` }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  )
}

export function Button({ children, onClick, variant = 'secondary', disabled, className = '', type = 'button', size = 'md', ariaLabel }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  const { theme } = useTheme()
  const styles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: theme.accent, color: theme.bg },
    secondary: { backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}` },
    ghost: { backgroundColor: 'transparent', color: theme.subtext },
    danger: { backgroundColor: `${theme.bad}18`, color: theme.bad },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-[13px]'} rounded-lg inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  )
}

export function IconButton({ onClick, label, children, tone }: { onClick: () => void; label: string; children: React.ReactNode; tone?: string }) {
  const { theme } = useTheme()
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
      style={{ color: tone || theme.subtext }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${theme.text}0d`)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
    >
      {children}
    </button>
  )
}

export function MonthSwitcher({ month, year, onChange, label }: { month: number; year: number; onChange: (dir: number) => void; label?: string }) {
  const { theme } = useTheme()
  return (
    <div className="inline-flex items-center h-9 rounded-lg" style={{ border: `1px solid ${theme.border}`, backgroundColor: theme.card }}>
      <button onClick={() => onChange(-1)} className="w-8 h-full flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Previous month"><ChevronLeft size={16} /></button>
      <span className="px-1 min-w-[112px] text-center text-[13px] font-medium tnum" style={{ color: theme.text }}>
        {label ?? new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </span>
      <button onClick={() => onChange(1)} className="w-8 h-full flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Next month"><ChevronRight size={16} /></button>
    </div>
  )
}

// ⋯ menu with a short list of row actions.
export function RowMenu({ items, label = 'More actions' }: { items: { label: string; onClick: () => void; danger?: boolean; icon?: React.ElementType }[]; label?: string }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="relative shrink-0" ref={ref}>
      <IconButton onClick={() => setOpen(o => !o)} label={label}><MoreHorizontal size={16} /></IconButton>
      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-[164px] rounded-xl p-1" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.shadowL }} role="menu">
          {items.map(it => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => { setOpen(false); it.onClick() }}
              className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-left"
              style={{ color: it.danger ? theme.bad : theme.text }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${theme.text}0d`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              {it.icon && <it.icon size={14} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Disclosure({ title, right, children, defaultOpen = false, open: openProp, onToggle }: {
  title: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onToggle?: () => void
}) {
  const { theme } = useTheme()
  const [inner, setInner] = useState(defaultOpen)
  const open = openProp ?? inner
  const toggle = onToggle ?? (() => setInner(o => !o))
  return (
    <div>
      <button onClick={toggle} className="w-full flex items-center gap-2 py-2 text-left" aria-expanded={open}>
        <ChevronDown size={14} style={{ color: theme.subtext, transform: open ? undefined : 'rotate(-90deg)' }} className="transition-transform shrink-0" />
        <span className="flex-1 min-w-0 text-[13px] font-medium" style={{ color: theme.text }}>{title}</span>
        {right}
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  )
}

export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-2xl px-6 py-10 text-center" style={{ border: `1px dashed ${theme.border}` }}>
      <p className="text-[14px] font-medium" style={{ color: theme.text }}>{title}</p>
      {sub && <p className="text-[13px] mt-1" style={{ color: theme.subtext }}>{sub}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

// ── Forms ───────────────────────────────────────────────────────────────────

export function useField() {
  const { theme, isDark } = useTheme()
  return {
    className: 'w-full h-10 px-3 rounded-lg text-[14px] outline-none focus:ring-2',
    style: { backgroundColor: theme.input, border: `1px solid ${theme.border}`, color: theme.text, colorScheme: isDark ? 'dark' : 'light', ['--tw-ring-color' as any]: `${theme.accent}55` } as React.CSSProperties,
  }
}

// `group` renders a div with a role instead of a <label>, for button groups
// (a <label> would forward clicks on its text to the first button).
export function Field({ label, hint, children, className = '', group = false }: { label: string; hint?: string; children: React.ReactNode; className?: string; group?: boolean }) {
  const { theme } = useTheme()
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`block min-w-0 ${className}`} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="block text-xs font-medium mb-1.5" style={{ color: theme.subtext }}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: theme.subtext }}>{hint}</span>}
    </Tag>
  )
}

export function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const { theme } = useTheme()
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="h-8 px-3 rounded-lg text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: on ? `${theme.accent}1f` : 'transparent',
              color: on ? theme.text : theme.subtext,
              border: `1px solid ${on ? theme.accent : theme.border}`,
            }}
            aria-pressed={on}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Slide-up sheet on phones, side panel on larger screens.
export function Sheet({ open, onClose, title, sub, children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  sub?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const { theme } = useTheme()
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const set = () => setWide(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55]"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={wide ? { x: '100%' } : { y: '100%' }}
            animate={wide ? { x: 0 } : { y: 0 }}
            exit={wide ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={`fixed z-[56] flex flex-col ${wide ? 'right-0 top-0 bottom-0 w-[440px]' : 'left-0 right-0 bottom-0 max-h-[92vh] rounded-t-2xl'}`}
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, boxShadow: theme.shadowL }}
            role="dialog"
            aria-label={title}
          >
            {!wide && <div className="mx-auto mt-2 w-10 h-1 rounded-full shrink-0" style={{ backgroundColor: theme.border }} />}
            <div className="flex items-start gap-3 px-5 pt-4 pb-3 shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: theme.text }}>{title}</h2>
                {sub && <div className="text-[13px] mt-0.5" style={{ color: theme.subtext }}>{sub}</div>}
              </div>
              <IconButton onClick={onClose} label="Close"><X size={17} /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="px-5 py-4 shrink-0 flex gap-2" style={{ borderTop: `1px solid ${theme.border}` }}>{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// A YYYY-MM-DD string for a local date (no UTC shift).
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
