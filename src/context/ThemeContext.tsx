'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const THEMES = {
  dark: {
    name:'dark',
    bg:'#09090b',
    bgS:'#131316',
    card:'#18181b',
    border:'#27272a',
    text:'#fafafa',
    textS:'#a1a1aa',
    textM:'#71717a',
    gold:'#d4a843',
    goldL:'#f5d680',
    goldD:'#b8860b',
    goldBg:'rgba(212,168,67,0.08)',
    goldBg2:'rgba(212,168,67,0.15)',
    ok:'#4ade80',
    okBg:'rgba(74,222,128,0.08)',
    warn:'#fbbf24',
    warnBg:'rgba(251,191,36,0.08)',
    bad:'#f87171',
    badBg:'rgba(248,113,113,0.08)',
    nav:'#0c0c0e',
    input:'#131316',
    shadow:'0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
    shadowL:'0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
    overlay:'rgba(0,0,0,0.75)',
    glow:'0 0 20px rgba(212,168,67,0.15)',
    cardGlass:'rgba(24,24,27,0.8)',
    navGlass:'rgba(12,12,14,0.85)',
  },
  light: {
    name:'light',
    bg:'#fafaf9',
    bgS:'#f4f4f2',
    card:'#ffffff',
    border:'#e4e4e0',
    text:'#18181b',
    textS:'#52525b',
    textM:'#a1a1aa',
    gold:'#b8860b',
    goldL:'#d4a843',
    goldD:'#8b6914',
    goldBg:'rgba(184,134,11,0.05)',
    goldBg2:'rgba(184,134,11,0.1)',
    ok:'#16a34a',
    okBg:'rgba(22,163,74,0.06)',
    warn:'#d97706',
    warnBg:'rgba(217,119,6,0.06)',
    bad:'#dc2626',
    badBg:'rgba(220,38,38,0.06)',
    nav:'#ffffff',
    input:'#ffffff',
    shadow:'0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
    shadowL:'0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    overlay:'rgba(0,0,0,0.4)',
    glow:'0 0 20px rgba(184,134,11,0.1)',
    cardGlass:'rgba(255,255,255,0.85)',
    navGlass:'rgba(255,255,255,0.9)',
  },
}

export type Theme = typeof THEMES.dark

export interface AdminThemeOverrides {
  primaryColor?: string
  bgDark?: string
  bgCard?: string
  borderColor?: string
  textPrimary?: string
  textSecondary?: string
  textMuted?: string
}

type ThemeContextType = {
  theme: Theme
  isDark: boolean
  setIsDark: (v: boolean) => void
  applyAdminTheme: (overrides: AdminThemeOverrides) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.dark,
  isDark: true,
  setIsDark: () => {},
  applyAdminTheme: () => {},
  resetTheme: () => {},
})

function applyOverrides(base: Theme, overrides: AdminThemeOverrides): Theme {
  return {
    ...base,
    ...(overrides.primaryColor && {
      gold: overrides.primaryColor,
      goldL: overrides.primaryColor,
      goldD: overrides.primaryColor,
      goldBg: `${overrides.primaryColor}14`,
      goldBg2: `${overrides.primaryColor}26`,
      glow: `0 0 20px ${overrides.primaryColor}26`,
    }),
    ...(overrides.bgDark && { bg: overrides.bgDark }),
    ...(overrides.bgCard && { card: overrides.bgCard, bgS: overrides.bgCard }),
    ...(overrides.borderColor && { border: overrides.borderColor }),
    ...(overrides.textPrimary && { text: overrides.textPrimary }),
    ...(overrides.textSecondary && { textS: overrides.textSecondary }),
    ...(overrides.textMuted && { textM: overrides.textMuted }),
  }
}

const ADMIN_THEME_KEY = 'orca-admin-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState(true)
  const [adminOverrides, setAdminOverrides] = useState<AdminThemeOverrides | null>(null)

  // Persist dark/light preference and notify other tabs / components
  const setIsDark = (v: boolean) => {
    setIsDarkState(v)
    const mode = v ? 'dark' : 'light'
    try {
      localStorage.setItem('orca-theme-mode', mode)
      // Notify all listeners: cross-tab via storage event, same-tab via custom event
      window.dispatchEvent(new StorageEvent('storage', { key: 'orca-theme-mode', newValue: mode }))
      window.dispatchEvent(new CustomEvent('orca-theme-changed', { detail: { mode } }))
    } catch {}
  }

  // Load persisted theme mode and admin overrides on mount
  useEffect(() => {
    try {
      const mode = localStorage.getItem('orca-theme-mode')
      if (mode === 'light') setIsDarkState(false)
      else if (mode === 'dark') setIsDarkState(true)
      if (typeof console !== 'undefined') console.log('[ORCA Theme] Loaded mode:', mode || 'dark (default)')
    } catch {}
    try {
      const saved = localStorage.getItem(ADMIN_THEME_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setAdminOverrides(parsed)
        if (typeof console !== 'undefined') console.log('[ORCA Theme] Loaded admin overrides:', parsed)
      }
    } catch {}
  }, [])

  // Listen for cross-tab storage changes (admin theme + mode)
  useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === ADMIN_THEME_KEY) {
        try {
          setAdminOverrides(e.newValue ? JSON.parse(e.newValue) : null)
        } catch {}
      }
      if (e.key === 'orca-theme-mode') {
        setIsDarkState(e.newValue === 'dark' || e.newValue === null)
      }
    }
    // Also listen for same-tab orca-local-write events (e.g. from admin or settings)
    const localWriteHandler = (e: any) => {
      const key = e?.detail?.key || ''
      if (key === 'orca-theme-mode') {
        try {
          const mode = localStorage.getItem('orca-theme-mode')
          setIsDarkState(mode === 'dark' || mode === null)
        } catch {}
      }
      if (key === ADMIN_THEME_KEY) {
        try {
          const saved = localStorage.getItem(ADMIN_THEME_KEY)
          setAdminOverrides(saved ? JSON.parse(saved) : null)
        } catch {}
      }
    }
    window.addEventListener('storage', storageHandler)
    window.addEventListener('orca-local-write', localWriteHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener('orca-local-write', localWriteHandler)
    }
  }, [])

  const baseTheme = isDark ? THEMES.dark : THEMES.light
  const theme = adminOverrides ? applyOverrides(baseTheme, adminOverrides) : baseTheme

  // Sync CSS custom properties for glass classes, Tailwind colors, and globals.css
  useEffect(() => {
    const root = document.documentElement
    // Theme-aware color tokens for Tailwind and CSS
    root.style.setProperty('--brand-black', theme.bg)
    root.style.setProperty('--brand-soft', theme.bgS)
    root.style.setProperty('--surface-card', theme.card)
    root.style.setProperty('--surface-elevated', isDark ? '#202020' : '#f0f0ee')
    root.style.setProperty('--surface-border', theme.border)
    root.style.setProperty('--gold-primary', theme.gold)
    root.style.setProperty('--gold-highlight', theme.goldL)
    root.style.setProperty('--gold-deep', theme.goldD)
    root.style.setProperty('--text-primary', theme.text)
    root.style.setProperty('--text-secondary', theme.textS)
    root.style.setProperty('--text-muted', theme.textM)
    root.style.setProperty('--nav-bg', theme.nav)
    root.style.setProperty('--input-bg', theme.input)
    root.style.setProperty('--ok-color', theme.ok)
    root.style.setProperty('--bad-color', theme.bad)
    root.style.setProperty('--warn-color', theme.warn)

    if (isDark) {
      root.style.setProperty('--glass-bg', 'rgba(24, 24, 27, 0.6)')
      root.style.setProperty('--glass-strong-bg', 'rgba(24, 24, 27, 0.75)')
      root.style.setProperty('--glass-subtle-bg', 'rgba(24, 24, 27, 0.4)')
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.06)')
      root.style.setProperty('--glass-border-hover', 'rgba(255, 255, 255, 0.1)')
      root.style.setProperty('--glass-hover-bg', 'rgba(24, 24, 27, 0.75)')
      root.style.setProperty('--glass-shadow', '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)')
      root.style.setProperty('--depth-1', '0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03)')
      root.style.setProperty('--depth-2', '0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)')
      root.style.setProperty('--depth-3', '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)')
      root.style.setProperty('--scrollbar-thumb', '#2A2A2A')
      root.style.setProperty('--scrollbar-thumb-hover', '#3A3A3A')
    } else {
      root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)')
      root.style.setProperty('--glass-strong-bg', 'rgba(255, 255, 255, 0.85)')
      root.style.setProperty('--glass-subtle-bg', 'rgba(255, 255, 255, 0.5)')
      root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.06)')
      root.style.setProperty('--glass-border-hover', 'rgba(0, 0, 0, 0.1)')
      root.style.setProperty('--glass-hover-bg', 'rgba(255, 255, 255, 0.85)')
      root.style.setProperty('--glass-shadow', '0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)')
      root.style.setProperty('--depth-1', '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)')
      root.style.setProperty('--depth-2', '0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)')
      root.style.setProperty('--depth-3', '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)')
      root.style.setProperty('--scrollbar-thumb', '#d4d4d0')
      root.style.setProperty('--scrollbar-thumb-hover', '#c4c4c0')
    }
    // Legacy aliases
    root.style.setProperty('--body-bg', theme.bg)
    root.style.setProperty('--body-text', theme.text)
    root.style.setProperty('--card-bg', theme.card)
    root.style.setProperty('--card-border', theme.border)
    root.style.setProperty('--divider-color', theme.border)

    // CRITICAL: Set body and html background/color directly so all pages inherit
    document.body.style.backgroundColor = theme.bg
    document.body.style.color = theme.text
    root.style.backgroundColor = theme.bg
    root.style.color = theme.text

    // Update meta theme-color for mobile browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.bg)
    }

    // Toggle a data attribute for CSS selectors
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark, theme])

  const applyAdminTheme = (overrides: AdminThemeOverrides) => {
    setAdminOverrides(overrides)
    const json = JSON.stringify(overrides)
    try {
      localStorage.setItem(ADMIN_THEME_KEY, json)
      // Dispatch StorageEvent for cross-tab sync (same-tab state is already set above)
      window.dispatchEvent(new StorageEvent('storage', { key: ADMIN_THEME_KEY, newValue: json }))
    } catch {}
    if (typeof console !== 'undefined') console.log('[ORCA Theme] Admin overrides applied:', overrides)
  }

  const resetTheme = () => {
    setAdminOverrides(null)
    try {
      localStorage.removeItem(ADMIN_THEME_KEY)
      window.dispatchEvent(new StorageEvent('storage', { key: ADMIN_THEME_KEY, newValue: null }))
    } catch {}
    if (typeof console !== 'undefined') console.log('[ORCA Theme] Theme reset to defaults')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setIsDark, applyAdminTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export { THEMES }
