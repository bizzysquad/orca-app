// Single source of truth for the command center navigation. Both the
// desktop sidebar (AppShell) and the mobile drawer (SideSidebar) render this,
// so they can never drift apart again.
import {
  LayoutDashboard, CalendarDays, CheckSquare, Shirt, CreditCard, TrendingUp,
  Mic2, Briefcase, Clapperboard, Ticket,
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
  items: NavLink[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: null,
    items: [{ id: 'dashboard', name: 'Home', href: '/dashboard', icon: LayoutDashboard, accent: '#6366F1' }],
  },
  {
    id: 'daily',
    label: 'Daily',
    items: [
      { id: 'planner', name: 'Planner', href: '/planner', icon: CalendarDays, accent: '#EC4899' },
      { id: 'task-list', name: 'Task List', href: '/task-list', icon: CheckSquare, accent: '#6366F1' },
      { id: 'outfit', name: 'Outfit', href: '/outfit', icon: Shirt, accent: '#E0A96D' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    items: [
      { id: 'bill-boss', name: 'Bill Boss', href: '/bill-boss', icon: CreditCard, accent: '#10B981' },
      { id: 'smart-stack', name: 'Smart Stack', href: '/smart-stack', icon: TrendingUp, accent: '#10B981' },
    ],
  },
  {
    id: 'businesses',
    label: 'Businesses',
    items: [
      { id: 'dj', name: 'DJ Maskoff', href: '/dj', icon: Mic2, accent: '#F43F5E' },
      { id: 'bizzplug', name: 'BizzyPlug', href: '/bizzplug', icon: Briefcase, accent: '#F59E0B' },
      { id: 'crookedrumor', name: 'Crooked Rumor', href: '/crookedrumor/admin', icon: Clapperboard, accent: '#C4161C', match: ['/crookedrumor'] },
      { id: 'rsvp', name: 'RSVP', href: '/RSVP/admin', icon: Ticket, accent: '#D4AF37', match: ['/RSVP'] },
    ],
  },
]

export const NAV_ITEMS: NavLink[] = NAV_GROUPS.flatMap(g => g.items)

export function isNavActive(item: NavLink, pathname: string): boolean {
  if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  const prefixes = item.match || [item.href]
  return prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
}
