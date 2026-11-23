'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLayoutPrefs, prefOps } from '@/lib/layoutPrefs'
import { NAV_GROUPS, isNavActive } from './navConfig'

// Grouped nav links, shared by the desktop sidebar and the mobile drawer.
// `rail` renders icons only (collapsed desktop sidebar).
export default function NavList({ onNavigate, rail = false }: { onNavigate?: () => void; rail?: boolean }) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { prefs, update } = useLayoutPrefs()

  const groups = NAV_GROUPS.filter(g => !g.hideable || !prefs.hiddenSections.includes(g.id))

  return (
    <nav className={rail ? 'space-y-3' : 'space-y-4'} aria-label="Main">
      {groups.map(group => {
        // A folded section still shows its active page, so you never lose your place.
        const folded = !rail && !!group.label && prefs.foldedSections.includes(group.id)
        const items = folded ? group.items.filter(i => isNavActive(i, pathname)) : group.items
        return (
          <div key={group.id}>
            {group.label && !rail && (
              <button
                onClick={() => update(prefOps.toggleSectionFolded(group.id))}
                className="group w-full flex items-center justify-between px-2.5 mb-1 h-6 rounded-md"
                aria-expanded={!folded}
                aria-label={`${folded ? 'Expand' : 'Collapse'} ${group.label}`}
              >
                <span className="text-[11px] font-medium tracking-wide" style={{ color: theme.subtext }}>{group.label}</span>
                <ChevronDown
                  size={13}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                  style={{ color: theme.subtext, transform: folded ? 'rotate(-90deg)' : undefined, opacity: folded ? 1 : undefined }}
                />
              </button>
            )}
            {group.label && rail && <div className="mx-3 mb-3 h-px" style={{ backgroundColor: theme.border }} />}
            <div className="space-y-px">
              {items.map(item => {
                const active = isNavActive(item, pathname)
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    title={rail ? item.name : undefined}
                    className={`relative flex items-center rounded-lg transition-colors ${rail ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-2.5 h-9'}`}
                    style={{
                      backgroundColor: active ? `${theme.text}0d` : undefined,
                      color: active ? theme.text : theme.subtext,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = `${theme.text}08` }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = '' }}
                  >
                    <Icon size={17} strokeWidth={active ? 2 : 1.75} className="shrink-0" style={{ color: active ? theme.accent : undefined }} />
                    {!rail && <span className={`text-[13.5px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
