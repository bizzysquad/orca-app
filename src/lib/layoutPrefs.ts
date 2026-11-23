'use client'

// What the user has chosen to see: sidebar sections (hidden / folded), the
// desktop sidebar width, the dashboard focus, and which dashboard widgets show
// in which order for each focus. Stored in one synced key so it follows the
// user across devices.

import { useCallback, useEffect, useState } from 'react'
import { setLocalSynced } from '@/lib/syncLocal'

export const LAYOUT_PREFS_KEY = 'orca-layout-prefs'

export type FocusId = 'overview' | 'finances' | 'business' | 'daily'

export type WidgetId =
  | 'kpis' | 'alerts' | 'cashflow' | 'incomeMix' | 'bills' | 'businesses'
  | 'pipeline' | 'gigs' | 'today' | 'calendar' | 'tasks' | 'health'

export interface WidgetLayout { id: WidgetId; visible: boolean }

export interface LayoutPrefs {
  sidebarCollapsed: boolean
  hiddenSections: string[]
  foldedSections: string[]
  focus: FocusId
  widgets: Record<FocusId, WidgetLayout[]>
}

export const WIDGET_META: Record<WidgetId, { name: string; description: string }> = {
  kpis: { name: 'Key numbers', description: 'Income, bills owed, net and spending at a glance' },
  alerts: { name: 'Inbox', description: 'New leads, quotes and reviews' },
  cashflow: { name: 'Financial performance', description: 'Six months of income by stream' },
  incomeMix: { name: 'Income by business', description: 'This month, split by stream' },
  bills: { name: 'Upcoming bills', description: 'Next bills due and what is still owed' },
  businesses: { name: 'Businesses', description: 'Every business, its status and quick links' },
  pipeline: { name: 'BizzyPlug pipeline', description: 'Open design projects and payments' },
  gigs: { name: 'Upcoming gigs', description: 'DJ Maskoff bookings this month' },
  today: { name: 'Today', description: 'Priorities, schedule and recurring tasks' },
  calendar: { name: 'Calendar', description: 'Bills, gigs and plans by day' },
  tasks: { name: 'Tasks', description: 'Starred and open tasks' },
  health: { name: 'Health', description: 'Workout, meals, protein and weight' },
}

export const FOCUS_META: Record<FocusId, { name: string; blurb: string }> = {
  overview: { name: 'Overview', blurb: 'Money, businesses and today in one view' },
  finances: { name: 'Finances', blurb: 'Cash in, cash out, and what is due' },
  business: { name: 'Business', blurb: 'Leads, bookings and revenue by business' },
  daily: { name: 'Daily', blurb: 'Your day: plan, tasks and health' },
}

const ALL_WIDGETS = Object.keys(WIDGET_META) as WidgetId[]

// Default order and visibility for each focus. Widgets not listed are present
// but hidden, so every widget can be switched on from any focus.
const FOCUS_DEFAULTS: Record<FocusId, WidgetId[]> = {
  overview: ['kpis', 'alerts', 'cashflow', 'bills', 'businesses', 'today', 'calendar'],
  finances: ['kpis', 'cashflow', 'incomeMix', 'bills', 'calendar'],
  business: ['alerts', 'businesses', 'incomeMix', 'pipeline', 'gigs', 'cashflow'],
  daily: ['today', 'tasks', 'health', 'calendar'],
}

export function defaultWidgets(focus: FocusId): WidgetLayout[] {
  const on = FOCUS_DEFAULTS[focus]
  return [
    ...on.map(id => ({ id, visible: true })),
    ...ALL_WIDGETS.filter(id => !on.includes(id)).map(id => ({ id, visible: false })),
  ]
}

export function defaultPrefs(): LayoutPrefs {
  return {
    sidebarCollapsed: false,
    hiddenSections: [],
    foldedSections: [],
    focus: 'overview',
    widgets: {
      overview: defaultWidgets('overview'),
      finances: defaultWidgets('finances'),
      business: defaultWidgets('business'),
      daily: defaultWidgets('daily'),
    },
  }
}

// Repairs stored prefs: unknown widgets dropped, new widgets appended hidden.
function normalize(raw: any): LayoutPrefs {
  const base = defaultPrefs()
  if (!raw || typeof raw !== 'object') return base
  const widgets = { ...base.widgets }
  for (const f of Object.keys(FOCUS_META) as FocusId[]) {
    const list: WidgetLayout[] = Array.isArray(raw.widgets?.[f])
      ? raw.widgets[f].filter((w: any) => w && ALL_WIDGETS.includes(w.id)).map((w: any) => ({ id: w.id, visible: !!w.visible }))
      : base.widgets[f]
    const seen = new Set(list.map(w => w.id))
    widgets[f] = [...list, ...ALL_WIDGETS.filter(id => !seen.has(id)).map(id => ({ id, visible: false }))]
  }
  return {
    sidebarCollapsed: !!raw.sidebarCollapsed,
    hiddenSections: Array.isArray(raw.hiddenSections) ? raw.hiddenSections.filter((x: any) => typeof x === 'string') : [],
    foldedSections: Array.isArray(raw.foldedSections) ? raw.foldedSections.filter((x: any) => typeof x === 'string') : [],
    focus: raw.focus in FOCUS_META ? raw.focus : 'overview',
    widgets,
  }
}

function read(): LayoutPrefs {
  try { return normalize(JSON.parse(localStorage.getItem(LAYOUT_PREFS_KEY) || 'null')) } catch { return defaultPrefs() }
}

export function useLayoutPrefs() {
  const [prefs, setPrefs] = useState<LayoutPrefs>(defaultPrefs)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPrefs(read())
    setReady(true)
    const reload = () => setPrefs(read())
    const onLocal = (e: any) => { if (e?.detail?.key === LAYOUT_PREFS_KEY) reload() }
    window.addEventListener('orca-sync-ready', reload)
    window.addEventListener('orca-local-write', onLocal)
    const onStorage = (e: StorageEvent) => { if (e.key === LAYOUT_PREFS_KEY) reload() }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('orca-sync-ready', reload)
      window.removeEventListener('orca-local-write', onLocal)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const update = useCallback((fn: (p: LayoutPrefs) => LayoutPrefs) => {
    const next = fn(read())
    setPrefs(next)
    setLocalSynced(LAYOUT_PREFS_KEY, JSON.stringify(next))
  }, [])

  return { prefs, ready, update }
}

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

export const prefOps = {
  toggleSidebar: (p: LayoutPrefs): LayoutPrefs => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }),
  toggleSectionHidden: (id: string) => (p: LayoutPrefs): LayoutPrefs => ({ ...p, hiddenSections: toggleIn(p.hiddenSections, id) }),
  toggleSectionFolded: (id: string) => (p: LayoutPrefs): LayoutPrefs => ({ ...p, foldedSections: toggleIn(p.foldedSections, id) }),
  setFocus: (focus: FocusId) => (p: LayoutPrefs): LayoutPrefs => ({ ...p, focus }),
  toggleWidget: (focus: FocusId, id: WidgetId) => (p: LayoutPrefs): LayoutPrefs => ({
    ...p, widgets: { ...p.widgets, [focus]: p.widgets[focus].map(w => (w.id === id ? { ...w, visible: !w.visible } : w)) },
  }),
  moveWidget: (focus: FocusId, id: WidgetId, dir: -1 | 1) => (p: LayoutPrefs): LayoutPrefs => {
    const list = [...p.widgets[focus]]
    const i = list.findIndex(w => w.id === id)
    // Move past hidden neighbours so one tap always changes the visible order.
    let j = i + dir
    while (j >= 0 && j < list.length && !list[j].visible) j += dir
    if (i < 0 || j < 0 || j >= list.length) return p
    const [w] = list.splice(i, 1)
    list.splice(j, 0, w)
    return { ...p, widgets: { ...p.widgets, [focus]: list } }
  },
  resetFocus: (focus: FocusId) => (p: LayoutPrefs): LayoutPrefs => ({ ...p, widgets: { ...p.widgets, [focus]: defaultWidgets(focus) } }),
}
