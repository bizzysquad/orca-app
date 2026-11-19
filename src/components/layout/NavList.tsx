'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { NAV_GROUPS, isNavActive } from './navConfig'

// Grouped nav links, shared by the desktop sidebar and the mobile drawer.
export default function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { theme } = useTheme()

  return (
    <nav className="space-y-5" aria-label="Main">
      {NAV_GROUPS.map(group => (
        <div key={group.id}>
          {group.label && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.subtext, opacity: 0.7 }}>
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(item => {
              const active = isNavActive(item, pathname)
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
                  style={{
                    backgroundColor: active ? `${item.accent}1a` : undefined,
                    color: active ? theme.text : theme.subtext,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: item.accent }} />}
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: active ? `${item.accent}26` : 'transparent', color: active ? item.accent : theme.subtext }}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  <span className="text-sm leading-none">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
