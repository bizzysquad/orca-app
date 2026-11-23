// Single source of truth for the navigation. The desktop sidebar, the mobile
// drawer, the Customize panel and the command palette all render this.
//
// Order is intentional: money and businesses come first, the day to day
// tools last. Sections marked `hideable` can be hidden from the sidebar in
// Customize; their pages keep working and stay reachable from Ctrl/Cmd+K.
import {
  LayoutGrid, CalendarDays, ListChecks, Shirt, Receipt, PiggyBank,
  Disc3, PenTool, Clapperboard, Ticket,
} from 'lucide-react'

export interface NavLink {
  id: string
  name: string
  href: string
  icon: React.ElementType
  accent: string
  // Extra path prefixes that should light this link up.
  match?: string[]
}

export interface NavGroup {
  id: string
  label: string | null
  hideable?: boolean
  items: NavLink[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: null,
    items: [{ id: 'dashboard', name: 'Home', href: '/dashboard', icon: LayoutGrid, accent: '#2DD4BF' }],
  },
  {
    id: 'money',
    label: 'Finances',
    hideable: true,
    items: [
      { id: 'bill-boss', name: 'Bill Boss', href: '/bill-boss', icon: Receipt, accent: '#2DD4BF' },
      { id: 'smart-stack', name: 'Smart Stack', href: '/smart-stack', icon: PiggyBank, accent: '#2DD4BF' },
    ],
  },
  {
    id: 'businesses',
    label: 'Businesses',
    hideable: true,
    items: [
      { id: 'dj', name: 'DJ Maskoff', href: '/dj', icon: Disc3, accent: '#2DD4BF' },
      { id: 'bizzplug', name: 'BizzyPlug', href: '/bizzplug', icon: PenTool, accent: '#2DD4BF' },
      { id: 'crookedrumor', name: 'Crooked Rumor', href: '/crookedrumor/admin', icon: Clapperboard, accent: '#2DD4BF', match: ['/crookedrumor'] },
      { id: 'rsvp', name: 'RSVP', href: '/RSVP/admin', icon: Ticket, accent: '#2DD4BF', match: ['/RSVP'] },
    ],
  },
  {
    id: 'daily',
    label: 'Daily',
    hideable: true,
    items: [
      { id: 'planner', name: 'Planner', href: '/planner', icon: CalendarDays, accent: '#2DD4BF' },
      { id: 'task-list', name: 'Task List', href: '/task-list', icon: ListChecks, accent: '#2DD4BF' },
      { id: 'outfit', name: 'Outfit', href: '/outfit', icon: Shirt, accent: '#2DD4BF' },
    ],
  },
]

export const NAV_ITEMS: NavLink[] = NAV_GROUPS.flatMap(g => g.items)

export function isNavActive(item: NavLink, pathname: string): boolean {
  if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  const prefixes = item.match || [item.href]
  return prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
}
