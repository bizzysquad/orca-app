'use client'

// Slide-over where the user decides what ORCA shows: which sidebar sections are
// visible, and which dashboard widgets appear (and in what order) for each
// focus. Open it from anywhere with:
//   window.dispatchEvent(new CustomEvent('orca-open-customize', { detail: { tab: 'dashboard' } }))

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLayoutPrefs, prefOps, FOCUS_META, WIDGET_META, type FocusId } from '@/lib/layoutPrefs'
import { NAV_GROUPS } from './navConfig'

type Tab = 'sidebar' | 'dashboard'

export function openCustomize(tab: Tab = 'dashboard') {
  window.dispatchEvent(new CustomEvent('orca-open-customize', { detail: { tab } }))
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  const { theme } = useTheme()
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0"
      style={{ backgroundColor: on ? theme.accent : theme.border }}
    >
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(16px)' : undefined }} />
    </button>
  )
}

export default function CustomizePanel() {
  const { theme } = useTheme()
  const { prefs, update } = useLayoutPrefs()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [focus, setFocus] = useState<FocusId>('overview')

  useEffect(() => {
    const onOpen = (e: any) => {
      setTab(e?.detail?.tab === 'sidebar' ? 'sidebar' : 'dashboard')
      setOpen(true)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('orca-open-customize', onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('orca-open-customize', onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Edit the focus the dashboard is currently on.
  useEffect(() => { if (open) setFocus(prefs.focus) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const widgets = prefs.widgets[focus]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full sm:w-[400px] flex flex-col"
            style={{ backgroundColor: theme.surface, borderLeft: `1px solid ${theme.border}`, boxShadow: theme.shadowL }}
            role="dialog"
            aria-label="Customize ORCA"
          >
            <div className="flex items-center justify-between px-5 h-14 shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <h2 className="text-[15px] font-semibold" style={{ color: theme.text }}>Customize</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="px-5 pt-4 shrink-0">
              <Segmented
                value={tab}
                onChange={v => setTab(v as Tab)}
                options={[{ value: 'dashboard', label: 'Dashboard' }, { value: 'sidebar', label: 'Sidebar' }]}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {tab === 'sidebar' ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: theme.text }}>Sections</p>
                    <p className="text-xs mb-3" style={{ color: theme.subtext }}>
                      Hidden sections leave the sidebar only. Their pages and data stay exactly as they are, and you can still open them with Ctrl/Cmd + K.
                    </p>
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                      {NAV_GROUPS.filter(g => g.hideable).map((g, i) => {
                        const visible = !prefs.hiddenSections.includes(g.id)
                        return (
                          <div key={g.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined, backgroundColor: theme.card }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: visible ? theme.text : theme.subtext }}>{g.label}</p>
                              <p className="text-xs truncate" style={{ color: theme.subtext }}>{g.items.map(x => x.name).join(', ')}</p>
                            </div>
                            <Switch on={visible} onChange={() => update(prefOps.toggleSectionHidden(g.id))} label={`Show ${g.label}`} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: theme.text }}>Layout</p>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ border: `1px solid ${theme.border}`, backgroundColor: theme.card }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: theme.text }}>Compact sidebar</p>
                        <p className="text-xs" style={{ color: theme.subtext }}>Icons only on desktop. Hover an icon for its name.</p>
                      </div>
                      <Switch on={prefs.sidebarCollapsed} onChange={() => update(prefOps.toggleSidebar)} label="Compact sidebar" />
                    </div>
                    <p className="text-xs mt-3" style={{ color: theme.subtext }}>Tip: click a section name in the sidebar to fold it.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] font-semibold mb-1" style={{ color: theme.text }}>Focus</p>
                  <p className="text-xs mb-3" style={{ color: theme.subtext }}>Each focus keeps its own set of widgets.</p>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {(Object.keys(FOCUS_META) as FocusId[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setFocus(f)}
                        className="text-left px-3 py-2.5 rounded-xl transition-colors"
                        style={{
                          border: `1px solid ${focus === f ? theme.accent : theme.border}`,
                          backgroundColor: focus === f ? `${theme.accent}14` : theme.card,
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: theme.text }}>{FOCUS_META[f].name}</p>
                        <p className="text-[11px] leading-snug mt-0.5" style={{ color: theme.subtext }}>{FOCUS_META[f].blurb}</p>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-semibold" style={{ color: theme.text }}>Widgets</p>
                    <button onClick={() => update(prefOps.resetFocus(focus))} className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-70" style={{ color: theme.subtext }}>
                      <RotateCcw size={12} /> Reset
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    {widgets.map((w, i) => (
                      <div key={w.id} className="flex items-center gap-2 pl-4 pr-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined, backgroundColor: theme.card }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: w.visible ? theme.text : theme.subtext }}>
                            {w.visible ? null : <EyeOff size={12} />}{WIDGET_META[w.id].name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{WIDGET_META[w.id].description}</p>
                        </div>
                        {w.visible && (
                          <div className="flex flex-col">
                            <button onClick={() => update(prefOps.moveWidget(focus, w.id, -1))} className="p-0.5 hover:opacity-70" style={{ color: theme.subtext }} aria-label={`Move ${WIDGET_META[w.id].name} up`}><ChevronUp size={14} /></button>
                            <button onClick={() => update(prefOps.moveWidget(focus, w.id, 1))} className="p-0.5 hover:opacity-70" style={{ color: theme.subtext }} aria-label={`Move ${WIDGET_META[w.id].name} down`}><ChevronDown size={14} /></button>
                          </div>
                        )}
                        <Switch on={w.visible} onChange={() => update(prefOps.toggleWidget(focus, w.id))} label={`Show ${WIDGET_META[w.id].name}`} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: theme.subtext }}><Eye size={12} /> Changes apply instantly and sync to your other devices.</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Segmented({ value, onChange, options, size = 'md' }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  size?: 'sm' | 'md'
}) {
  const { theme } = useTheme()
  return (
    <div className="inline-flex p-0.5 rounded-lg max-w-full overflow-x-auto no-scrollbar" style={{ backgroundColor: `${theme.text}0a`, border: `1px solid ${theme.border}` }} role="tablist">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`${size === 'sm' ? 'px-2.5 h-7 text-xs' : 'px-3.5 h-8 text-[13px]'} rounded-md font-medium whitespace-nowrap transition-colors`}
            style={{
              backgroundColor: active ? theme.surface : 'transparent',
              color: active ? theme.text : theme.subtext,
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.12)' : undefined,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
