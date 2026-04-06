'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface GlassVars {
  glassBg: string
  glassStrongBg: string
  glassSubtleBg: string
  glassBorder: string
  glassBorderHover: string
  glassHoverBg: string
  glassShadow: string
  depth1: string
  depth2: string
  depth3: string
  scrollThumb: string
  scrollThumbHover: string
}

export interface Theme {
  id: string
  name: string
  bg: string
  surface: string
  card: string
  text: string
  subtext: string
  accent: string
  border: string
  input: string
  nav: string
  ok: string
  okBg: string
  warn: string
  warnBg: string
  bad: string
  badBg: string
  shadow: string
  shadowL: string
  overlay: string
  cardGlass: string
  navGlass: string
  glassVars: GlassVars
  // Backward-compatible aliases (old theme property names)
  gold: string
  goldL: string
  goldD: string
  goldBg: string
  goldBg2: string
  glow: string
  textS: string
  textM: string
  bgS: string
}

const LIGHT_GLASS_VARS: GlassVars = {
  glassBg: 'rgba(255, 255, 255, 0.7)',
  glassStrongBg: 'rgba(255, 255, 255, 0.85)',
  glassSubtleBg: 'rgba(255, 255, 255, 0.5)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  glassBorderHover: 'rgba(0, 0, 0, 0.1)',
  glassHoverBg: 'rgba(255, 255, 255, 0.85)',
  glassShadow: '0 8px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
  depth1: '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
  depth2: '0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
  depth3: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
  scrollThumb: '#d4d4d0',
  scrollThumbHover: '#c4c4c0',
}

const DARK_GLASS_VARS: GlassVars = {
  glassBg: 'rgba(30, 41, 59, 0.7)',
  glassStrongBg: 'rgba(30, 41, 59, 0.85)',
  glassSubtleBg: 'rgba(30, 41, 59, 0.5)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassBorderHover: 'rgba(255, 255, 255, 0.1)',
  glassHoverBg: 'rgba(30, 41, 59, 0.85)',
  glassShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
  depth1: '0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
  depth2: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
  depth3: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
  scrollThumb: '#404854',
  scrollThumbHover: '#505864',
}

// Helper to add backward-compatible aliases to a base theme definition
function withAliases(t: Omit<Theme, 'gold' | 'goldL' | 'goldD' | 'goldBg' | 'goldBg2' | 'glow' | 'textS' | 'textM' | 'bgS'>): Theme {
  return {
    ...t,
    gold: t.accent,
    goldL: t.accent,
    goldD: t.accent,
    goldBg: `${t.accent}14`,
    goldBg2: `${t.accent}26`,
    glow: `0 0 20px ${t.accent}26`,
    textS: t.subtext,
    textM: t.subtext,
    bgS: t.surface,
  }
}

const LIGHT_SHADOW = '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
const LIGHT_SHADOW_L = '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
const LIGHT_OVERLAY = 'rgba(0,0,0,0.4)'

const DARK_SHADOW = '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)'
const DARK_SHADOW_L = '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)'
const DARK_OVERLAY = 'rgba(0,0,0,0.8)'

const BASE_THEME_PROPS = {
  shadow: LIGHT_SHADOW,
  shadowL: LIGHT_SHADOW_L,
  overlay: LIGHT_OVERLAY,
  cardGlass: 'rgba(255,255,255,0.85)',
  navGlass: 'rgba(255,255,255,0.9)',
  glassVars: LIGHT_GLASS_VARS,
  ok: '#16a34a',
  okBg: 'rgba(22,163,74,0.08)',
  warn: '#d97706',
  warnBg: 'rgba(217,119,6,0.08)',
  bad: '#dc2626',
  badBg: 'rgba(220,38,38,0.08)',
} as const

const BASE_DARK_THEME_PROPS = {
  shadow: DARK_SHADOW,
  shadowL: DARK_SHADOW_L,
  overlay: DARK_OVERLAY,
  cardGlass: 'rgba(30,41,59,0.85)',
  navGlass: 'rgba(30,41,59,0.9)',
  glassVars: DARK_GLASS_VARS,
  ok: '#22c55e',
  okBg: 'rgba(34,197,94,0.15)',
  warn: '#f59e0b',
  warnBg: 'rgba(245,158,11,0.15)',
  bad: '#ef4444',
  badBg: 'rgba(239,68,68,0.15)',
} as const

// Helper function to create a dark variant of a light theme
function makeDark(lightTheme: Theme): Theme {
  // Dark color mappings for backgrounds and surfaces
  const darkBg = '#0F172A'
  const darkSurface = '#1E293B'
  const darkCard = '#1E293B'
  const darkText = '#F1F5F9'
  const darkSubtext = '#94A3B8'
  const darkBorder = '#334155'
  const darkInput = '#1E293B'
  const darkNav = '#1E293B'

  return {
    ...lightTheme,
    bg: darkBg,
    surface: darkSurface,
    card: darkCard,
    text: darkText,
    subtext: darkSubtext,
    border: darkBorder,
    input: darkInput,
    nav: darkNav,
    ...BASE_DARK_THEME_PROPS,
    // Update backward-compatible aliases to use dark values
    textS: darkSubtext,
    textM: darkSubtext,
    bgS: darkSurface,
    goldBg: `${lightTheme.accent}14`,
    goldBg2: `${lightTheme.accent}26`,
    glow: `0 0 20px ${lightTheme.accent}26`,
  }
}

export const THEMES: Record<string, Theme> = {
  'ocean-blue': withAliases({
    id: 'ocean-blue', name: 'Ocean Blue',
    bg: '#EAF3FF', surface: '#FFFFFF', card: '#DCEBFF',
    text: '#0F172A', subtext: '#475569', accent: '#2563EB',
    border: '#B3D4FF', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'sage-green': withAliases({
    id: 'sage-green', name: 'Sage Green',
    bg: '#ECFDF5', surface: '#FFFFFF', card: '#D1FAE5',
    text: '#022C22', subtext: '#065F46', accent: '#10B981',
    border: '#A7F3D0', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'sunset-orange': withAliases({
    id: 'sunset-orange', name: 'Sunset Orange',
    bg: '#FFF7ED', surface: '#FFFFFF', card: '#FFEDD5',
    text: '#431407', subtext: '#9A3412', accent: '#F97316',
    border: '#FED7AA', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'rose-pink': withAliases({
    id: 'rose-pink', name: 'Rose Pink',
    bg: '#FFF1F2', surface: '#FFFFFF', card: '#FFE4E6',
    text: '#4C0519', subtext: '#9F1239', accent: '#F43F5E',
    border: '#FECDD3', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'lavender-purple': withAliases({
    id: 'lavender-purple', name: 'Lavender Purple',
    bg: '#F5F3FF', surface: '#FFFFFF', card: '#EDE9FE',
    text: '#2E1065', subtext: '#6D28D9', accent: '#7C3AED',
    border: '#DDD6FE', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'teal-mint': withAliases({
    id: 'teal-mint', name: 'Teal Mint',
    bg: '#F0FDFA', surface: '#FFFFFF', card: '#CCFBF1',
    text: '#042F2E', subtext: '#0F766E', accent: '#14B8A6',
    border: '#99F6E4', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'sand-beige': withAliases({
    id: 'sand-beige', name: 'Sand Beige',
    bg: '#FAF3E0', surface: '#FFFFFF', card: '#F5E6CC',
    text: '#1F2937', subtext: '#6B7280', accent: '#D97706',
    border: '#E5D5B0', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'sky-indigo': withAliases({
    id: 'sky-indigo', name: 'Sky Indigo',
    bg: '#EEF2FF', surface: '#FFFFFF', card: '#E0E7FF',
    text: '#1E1B4B', subtext: '#4338CA', accent: '#6366F1',
    border: '#C7D2FE', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'soft-gray': withAliases({
    id: 'soft-gray', name: 'Soft Gray',
    bg: '#F3F4F6', surface: '#FFFFFF', card: '#E5E7EB',
    text: '#111827', subtext: '#6B7280', accent: '#3B82F6',
    border: '#D1D5DB', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
  'cool-aqua': withAliases({
    id: 'cool-aqua', name: 'Cool Aqua',
    bg: '#ECFEFF', surface: '#FFFFFF', card: '#CFFAFE',
    text: '#083344', subtext: '#155E75', accent: '#06B6D4',
    border: '#A5F3FC', input: '#FFFFFF', nav: '#FFFFFF',
    ...BASE_THEME_PROPS,
  }),
}

export const THEME_LIST = Object.values(THEMES)

// Aliases for backward compatibility (used by admin page)
export const ALL_THEMES = THEME_LIST
export function buildTheme(theme: Theme, isDark: boolean): Theme {
  return isDark ? makeDark(theme) : theme
}

type ThemeContextType = {
  theme: Theme
  themeId: string
  setThemeId: (id: string) => void
  allThemes: Theme[]
  isDark: boolean
  toggleDark: () => void
}

const defaultTheme = THEMES['ocean-blue']

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  themeId: 'ocean-blue',
  setThemeId: () => {},
  allThemes: THEME_LIST,
  isDark: false,
  toggleDark: () => {},
})

const THEME_ID_KEY = 'orca-theme-id'
const DARK_MODE_KEY = 'orca-dark-mode'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>('ocean-blue')
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false)

  const baseTheme = THEMES[themeId] || THEMES['ocean-blue']
  const theme = isDarkMode ? makeDark(baseTheme) : baseTheme

  const setThemeId = (id: string) => {
    if (THEMES[id]) {
      setThemeIdState(id)
      try {
        localStorage.setItem(THEME_ID_KEY, id)
        window.dispatchEvent(new StorageEvent('storage', { key: THEME_ID_KEY, newValue: id }))
        window.dispatchEvent(new CustomEvent('orca-theme-changed', { detail: { themeId: id } }))
      } catch {}
      if (typeof console !== 'undefined') console.log('[ORCA Theme] Theme changed to:', id)
    }
  }

  const toggleDark = () => {
    const newDarkMode = !isDarkMode
    setIsDarkModeState(newDarkMode)
    try {
      localStorage.setItem(DARK_MODE_KEY, newDarkMode ? 'true' : 'false')
      window.dispatchEvent(new CustomEvent('orca-dark-mode-changed', { detail: { isDark: newDarkMode } }))
    } catch {}
    if (typeof console !== 'undefined') console.log('[ORCA Theme] Dark mode changed to:', newDarkMode)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_ID_KEY)
      if (saved && THEMES[saved]) {
        setThemeIdState(saved)
        if (typeof console !== 'undefined') console.log('[ORCA Theme] Loaded theme:', saved)
      } else {
        setThemeIdState('ocean-blue')
        if (typeof console !== 'undefined') console.log('[ORCA Theme] Using default theme: ocean-blue')
      }

      const savedDarkMode = localStorage.getItem(DARK_MODE_KEY)
      if (savedDarkMode === 'true') {
        setIsDarkModeState(true)
        if (typeof console !== 'undefined') console.log('[ORCA Theme] Dark mode enabled')
      }
    } catch {}
  }, [])

  useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === THEME_ID_KEY && e.newValue && THEMES[e.newValue]) {
        setThemeIdState(e.newValue)
      }
      if (e.key === DARK_MODE_KEY && e.newValue !== null) {
        setIsDarkModeState(e.newValue === 'true')
      }
    }
    const localWriteHandler = (e: any) => {
      const key = e?.detail?.key || ''
      if (key === THEME_ID_KEY) {
        try {
          const saved = localStorage.getItem(THEME_ID_KEY)
          if (saved && THEMES[saved]) {
            setThemeIdState(saved)
          }
        } catch {}
      }
      if (key === DARK_MODE_KEY) {
        try {
          const saved = localStorage.getItem(DARK_MODE_KEY)
          setIsDarkModeState(saved === 'true')
        } catch {}
      }
    }
    const darkModeChangedHandler = (e: any) => {
      setIsDarkModeState(e?.detail?.isDark ?? false)
    }
    window.addEventListener('storage', storageHandler)
    window.addEventListener('orca-local-write', localWriteHandler)
    window.addEventListener('orca-dark-mode-changed', darkModeChangedHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener('orca-local-write', localWriteHandler)
      window.removeEventListener('orca-dark-mode-changed', darkModeChangedHandler)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    // Add or remove dark class
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    root.style.setProperty('--body-bg', theme.bg)
    root.style.setProperty('--body-text', theme.text)
    root.style.setProperty('--card-bg', theme.card)
    root.style.setProperty('--card-border', theme.border)
    root.style.setProperty('--divider-color', theme.border)

    root.style.setProperty('--surface-bg', theme.surface)
    root.style.setProperty('--surface-card', theme.card)
    root.style.setProperty('--surface-elevated', theme.surface)
    root.style.setProperty('--surface-border', theme.border)
    root.style.setProperty('--brand-black', theme.bg)
    root.style.setProperty('--brand-soft', theme.surface)
    root.style.setProperty('--text-primary', theme.text)
    root.style.setProperty('--text-secondary', theme.subtext)
    root.style.setProperty('--text-muted', theme.subtext)
    root.style.setProperty('--accent-color', theme.accent)
    root.style.setProperty('--gold-primary', theme.accent)
    root.style.setProperty('--gold-highlight', theme.accent)
    root.style.setProperty('--gold-deep', theme.accent)
    root.style.setProperty('--nav-bg', theme.nav)
    root.style.setProperty('--input-bg', theme.input)

    root.style.setProperty('--ok-color', theme.ok)
    root.style.setProperty('--ok-bg', theme.okBg)
    root.style.setProperty('--warn-color', theme.warn)
    root.style.setProperty('--warn-bg', theme.warnBg)
    root.style.setProperty('--bad-color', theme.bad)
    root.style.setProperty('--bad-bg', theme.badBg)

    root.style.setProperty('--shadow', theme.shadow)
    root.style.setProperty('--shadow-lg', theme.shadowL)
    root.style.setProperty('--overlay', theme.overlay)

    root.style.setProperty('--glass-bg', theme.glassVars.glassBg)
    root.style.setProperty('--glass-strong-bg', theme.glassVars.glassStrongBg)
    root.style.setProperty('--glass-subtle-bg', theme.glassVars.glassSubtleBg)
    root.style.setProperty('--glass-border', theme.glassVars.glassBorder)
    root.style.setProperty('--glass-border-hover', theme.glassVars.glassBorderHover)
    root.style.setProperty('--glass-hover-bg', theme.glassVars.glassHoverBg)
    root.style.setProperty('--glass-shadow', theme.glassVars.glassShadow)
    root.style.setProperty('--depth-1', theme.glassVars.depth1)
    root.style.setProperty('--depth-2', theme.glassVars.depth2)
    root.style.setProperty('--depth-3', theme.glassVars.depth3)
    root.style.setProperty('--scrollbar-thumb', theme.glassVars.scrollThumb)
    root.style.setProperty('--scrollbar-thumb-hover', theme.glassVars.scrollThumbHover)

    document.body.style.setProperty('background-color', theme.bg, 'important')
    document.body.style.setProperty('color', theme.text, 'important')
    root.style.setProperty('background-color', theme.bg, 'important')
    root.style.setProperty('color', theme.text, 'important')

    document.body.style.backgroundColor = theme.bg
    document.body.style.color = theme.text

    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.bg)
    }

    let styleEl = document.getElementById('orca-theme-override') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'orca-theme-override'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `
      html, body, #__next {
        background-color: ${theme.bg} !important;
        color: ${theme.text} !important;
      }
    `

    root.setAttribute('data-theme', themeId)
  }, [theme, themeId, isDarkMode])

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, allThemes: THEME_LIST, isDark: isDarkMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
