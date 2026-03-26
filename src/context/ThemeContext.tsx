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

  // Persist dark/light preference
  const setIsDark = (v: boolean) => {
    setIsDarkState(v)
    try { localStorage.setItem('orca-theme-mode', v ? 'dark' : 'light') } catch {}
  }

  // Load persisted theme mode and admin overrides on mount
  useEffect(() => {
    try {
      const mode = localStorage.getItem('orca-theme-mode')
      if (mode === 'light') setIsDarkState(false)
      else if (mode === 'dark') setIsDarkState(true)
    } catch {}
    try {
      const saved = localStorage.getItem(ADMIN_THEME_KEY)
      if (saved) {
        setAdminOverrides(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const baseTheme = isDark ? THEMES.dark : THEMES.light
  const theme = adminOverrides ? applyOverrides(baseTheme, adminOverrides) : baseTheme

  // Sync CSS custom properties for glass classes in globals.css
  useEffect(() => {
    const root = document.documentElement
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
      root.style.setProperty('--body-bg', '#0A0A0A')
      root.style.setProperty('--body-text', '#F5F5F5')
      root.style.setProperty('--scrollbar-thumb', '#2A2A2A')
      root.style.setProperty('--scrollbar-thumb-hover', '#3A3A3A')
      root.style.setProperty('--card-bg', '#181818')
      root.style.setProperty('--card-border', '#2A2A2A')
      root.style.setProperty('--divider-color', '#2A2A2A')
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
      root.style.setProperty('--body-bg', '#fafaf9')
      root.style.setProperty('--body-text', '#18181b')
      root.style.setProperty('--scrollbar-thumb', '#d4d4d0')
      root.style.setProperty('--scrollbar-thumb-hover', '#c4c4c0')
      root.style.setProperty('--card-bg', '#ffffff')
      root.style.setProperty('--card-border', '#e4e4e0')
      root.style.setProperty('--divider-color', '#e4e4e0')
    }
  }, [isDark])

  const applyAdminTheme = (overrides: AdminThemeOverrides) => {
    setAdminOverrides(overrides)
    try {
      localStorage.setItem(ADMIN_THEME_KEY, JSON.stringify(overrides))
    } catch {}
  }

  const resetTheme = () => {
    setAdminOverrides(null)
    try {
      localStorage.removeItem(ADMIN_THEME_KEY)
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setIsDark, applyAdminTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export { THEMES }
