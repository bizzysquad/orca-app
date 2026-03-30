'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ── V10 Color Theme (sidebar gradients, accent colors) ──
export interface ColorTheme {
  id: string
  name: string
  category: 'women' | 'men'
  variant: 'vivid' | 'night'
  primary: string
  primaryLight: string
  sidebarBg: string
  pageBg: string
  headerBg: string
  navActiveBg: string
  navActiveIcon: string
  sidebarBorderColor: string
  sidebarGradientFrom: string
  sidebarGradientTo: string
  swatchFrom: string
  swatchTo: string
}

export const ALL_THEMES: ColorTheme[] = [
  // ─────── WOMEN'S VIVID ───────
  {
    id: 'rose-vivid', name: 'Rose Glow', category: 'women', variant: 'vivid',
    primary: '#E91E8C', primaryLight: '#F472B6',
    sidebarBg: '#1E0535', sidebarGradientFrom: '#2D0A4E', sidebarGradientTo: '#1A0230',
    pageBg: '#180228', headerBg: '#1E0535',
    navActiveBg: 'rgba(233,30,140,0.22)', navActiveIcon: '#F472B6',
    sidebarBorderColor: 'rgba(233,30,140,0.15)',
    swatchFrom: '#E91E8C', swatchTo: '#9C27B0',
  },
  {
    id: 'violet-vivid', name: 'Violet Dream', category: 'women', variant: 'vivid',
    primary: '#6366F1', primaryLight: '#A78BFA',
    sidebarBg: '#120D3B', sidebarGradientFrom: '#1E1560', sidebarGradientTo: '#0E0A2A',
    pageBg: '#0C0828', headerBg: '#120D3B',
    navActiveBg: 'rgba(99,102,241,0.22)', navActiveIcon: '#A78BFA',
    sidebarBorderColor: 'rgba(99,102,241,0.15)',
    swatchFrom: '#6366F1', swatchTo: '#312E8F',
  },
  {
    id: 'teal-vivid', name: 'Teal Wave', category: 'women', variant: 'vivid',
    primary: '#0D9488', primaryLight: '#2DD4BF',
    sidebarBg: '#032A26', sidebarGradientFrom: '#044038', sidebarGradientTo: '#021C18',
    pageBg: '#021A16', headerBg: '#032A26',
    navActiveBg: 'rgba(13,148,136,0.22)', navActiveIcon: '#2DD4BF',
    sidebarBorderColor: 'rgba(13,148,136,0.15)',
    swatchFrom: '#0D9488', swatchTo: '#065F50',
  },
  // ─────── WOMEN'S NIGHT ───────
  {
    id: 'rose-night', name: 'Rose Night', category: 'women', variant: 'night',
    primary: '#E91E8C', primaryLight: '#F472B6',
    sidebarBg: '#0A0010', sidebarGradientFrom: '#0E0018', sidebarGradientTo: '#060008',
    pageBg: '#050007', headerBg: '#0A0010',
    navActiveBg: 'rgba(233,30,140,0.14)', navActiveIcon: '#F472B6',
    sidebarBorderColor: 'rgba(233,30,140,0.09)',
    swatchFrom: '#3D0020', swatchTo: '#0A0010',
  },
  {
    id: 'violet-night', name: 'Violet Night', category: 'women', variant: 'night',
    primary: '#6366F1', primaryLight: '#A78BFA',
    sidebarBg: '#07031A', sidebarGradientFrom: '#0C0726', sidebarGradientTo: '#040210',
    pageBg: '#030110', headerBg: '#07031A',
    navActiveBg: 'rgba(99,102,241,0.14)', navActiveIcon: '#A78BFA',
    sidebarBorderColor: 'rgba(99,102,241,0.09)',
    swatchFrom: '#1E1B4B', swatchTo: '#07031A',
  },
  {
    id: 'teal-night', name: 'Teal Night', category: 'women', variant: 'night',
    primary: '#0D9488', primaryLight: '#2DD4BF',
    sidebarBg: '#020D0B', sidebarGradientFrom: '#041410', sidebarGradientTo: '#010806',
    pageBg: '#010706', headerBg: '#020D0B',
    navActiveBg: 'rgba(13,148,136,0.14)', navActiveIcon: '#2DD4BF',
    sidebarBorderColor: 'rgba(13,148,136,0.09)',
    swatchFrom: '#134E4A', swatchTo: '#020D0B',
  },
  // ─────── MEN'S VIVID ───────
  {
    id: 'amber-vivid', name: 'Amber Blaze', category: 'men', variant: 'vivid',
    primary: '#F59E0B', primaryLight: '#FCD34D',
    sidebarBg: '#1C1000', sidebarGradientFrom: '#2C1A00', sidebarGradientTo: '#110900',
    pageBg: '#140B00', headerBg: '#1C1000',
    navActiveBg: 'rgba(245,158,11,0.22)', navActiveIcon: '#FCD34D',
    sidebarBorderColor: 'rgba(245,158,11,0.15)',
    swatchFrom: '#F59E0B', swatchTo: '#B45309',
  },
  {
    id: 'crimson-vivid', name: 'Crimson Fire', category: 'men', variant: 'vivid',
    primary: '#EF4444', primaryLight: '#F87171',
    sidebarBg: '#1A0404', sidebarGradientFrom: '#280808', sidebarGradientTo: '#100202',
    pageBg: '#120202', headerBg: '#1A0404',
    navActiveBg: 'rgba(239,68,68,0.22)', navActiveIcon: '#F87171',
    sidebarBorderColor: 'rgba(239,68,68,0.15)',
    swatchFrom: '#EF4444', swatchTo: '#991B1B',
  },
  {
    id: 'rust-vivid', name: 'Warm Spice', category: 'men', variant: 'vivid',
    primary: '#F97316', primaryLight: '#FB923C',
    sidebarBg: '#1A0900', sidebarGradientFrom: '#2A1200', sidebarGradientTo: '#100500',
    pageBg: '#120600', headerBg: '#1A0900',
    navActiveBg: 'rgba(249,115,22,0.22)', navActiveIcon: '#FB923C',
    sidebarBorderColor: 'rgba(249,115,22,0.15)',
    swatchFrom: '#F97316', swatchTo: '#C2410C',
  },
  // ─────── MEN'S NIGHT ───────
  {
    id: 'amber-night', name: 'Amber Night', category: 'men', variant: 'night',
    primary: '#F59E0B', primaryLight: '#FCD34D',
    sidebarBg: '#0A0700', sidebarGradientFrom: '#0F0B00', sidebarGradientTo: '#050300',
    pageBg: '#060400', headerBg: '#0A0700',
    navActiveBg: 'rgba(245,158,11,0.14)', navActiveIcon: '#FCD34D',
    sidebarBorderColor: 'rgba(245,158,11,0.09)',
    swatchFrom: '#78350F', swatchTo: '#0A0700',
  },
  {
    id: 'crimson-night', name: 'Crimson Night', category: 'men', variant: 'night',
    primary: '#EF4444', primaryLight: '#F87171',
    sidebarBg: '#0A0202', sidebarGradientFrom: '#100303', sidebarGradientTo: '#060101',
    pageBg: '#060101', headerBg: '#0A0202',
    navActiveBg: 'rgba(239,68,68,0.14)', navActiveIcon: '#F87171',
    sidebarBorderColor: 'rgba(239,68,68,0.09)',
    swatchFrom: '#7F1D1D', swatchTo: '#0A0202',
  },
  {
    id: 'rust-night', name: 'Spice Night', category: 'men', variant: 'night',
    primary: '#F97316', primaryLight: '#FB923C',
    sidebarBg: '#0A0400', sidebarGradientFrom: '#100600', sidebarGradientTo: '#060200',
    pageBg: '#060200', headerBg: '#0A0400',
    navActiveBg: 'rgba(249,115,22,0.14)', navActiveIcon: '#FB923C',
    sidebarBorderColor: 'rgba(249,115,22,0.09)',
    swatchFrom: '#7C2D12', swatchTo: '#0A0400',
  },
]

const DEFAULT_COLOR_THEME_ID = 'violet-vivid'

// ── Legacy Theme interface (used across all existing pages) ──
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

const LIGHT_SHADOW = '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
const LIGHT_SHADOW_L = '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
const LIGHT_OVERLAY = 'rgba(0,0,0,0.4)'
const DARK_SHADOW = '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)'
const DARK_SHADOW_L = '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)'
const DARK_OVERLAY = 'rgba(0,0,0,0.8)'

/** Build a full backward-compatible Theme from a V10 ColorTheme + isDark flag */
function buildTheme(ct: ColorTheme, isDark: boolean): Theme {
  const accent = ct.primary
  if (isDark) {
    return {
      id: ct.id, name: ct.name,
      bg: ct.pageBg,
      surface: ct.sidebarBg,
      card: ct.headerBg,
      text: '#F1F5F9',
      subtext: '#94A3B8',
      accent,
      border: ct.sidebarBorderColor,
      input: ct.sidebarBg,
      nav: ct.sidebarBg,
      ok: '#22c55e', okBg: 'rgba(34,197,94,0.15)',
      warn: '#f59e0b', warnBg: 'rgba(245,158,11,0.15)',
      bad: '#ef4444', badBg: 'rgba(239,68,68,0.15)',
      shadow: DARK_SHADOW, shadowL: DARK_SHADOW_L, overlay: DARK_OVERLAY,
      cardGlass: 'rgba(30,41,59,0.85)', navGlass: 'rgba(30,41,59,0.9)',
      glassVars: DARK_GLASS_VARS,
      gold: accent, goldL: ct.primaryLight, goldD: accent,
      goldBg: `${accent}14`, goldBg2: `${accent}26`,
      glow: `0 0 20px ${accent}26`,
      textS: '#94A3B8', textM: '#94A3B8', bgS: ct.sidebarBg,
    }
  }
  // Light mode — use universal light backgrounds, accent from theme
  return {
    id: ct.id, name: ct.name,
    bg: '#F0F2FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    accent,
    border: '#E2E8F0',
    input: '#FFFFFF',
    nav: '#FFFFFF',
    ok: '#16a34a', okBg: 'rgba(22,163,74,0.08)',
    warn: '#d97706', warnBg: 'rgba(217,119,6,0.08)',
    bad: '#dc2626', badBg: 'rgba(220,38,38,0.08)',
    shadow: LIGHT_SHADOW, shadowL: LIGHT_SHADOW_L, overlay: LIGHT_OVERLAY,
    cardGlass: 'rgba(255,255,255,0.85)', navGlass: 'rgba(255,255,255,0.9)',
    glassVars: LIGHT_GLASS_VARS,
    gold: accent, goldL: ct.primaryLight, goldD: accent,
    goldBg: `${accent}14`, goldBg2: `${accent}26`,
    glow: `0 0 20px ${accent}26`,
    textS: '#64748B', textM: '#64748B', bgS: '#FFFFFF',
  }
}

// Build the THEMES record for backward compatibility (used by Settings page etc.)
export const THEMES: Record<string, Theme> = Object.fromEntries(
  ALL_THEMES.map(ct => [ct.id, buildTheme(ct, true)])
)
export const THEME_LIST = Object.values(THEMES)

// ── Context ──
type ThemeContextType = {
  theme: Theme
  themeId: string
  setThemeId: (id: string) => void
  allThemes: Theme[]
  isDark: boolean
  toggleDark: () => void
  // V10 additions
  currentTheme: ColorTheme
  colorThemeId: string
  setColorTheme: (id: string) => void
}

const defaultCT = ALL_THEMES.find(t => t.id === DEFAULT_COLOR_THEME_ID)!

const ThemeContext = createContext<ThemeContextType>({
  theme: buildTheme(defaultCT, true),
  themeId: DEFAULT_COLOR_THEME_ID,
  setThemeId: () => {},
  allThemes: THEME_LIST,
  isDark: true,
  toggleDark: () => {},
  currentTheme: defaultCT,
  colorThemeId: DEFAULT_COLOR_THEME_ID,
  setColorTheme: () => {},
})

const THEME_ID_KEY = 'orca-theme-id'
const DARK_MODE_KEY = 'orca-dark-mode'
const COLOR_THEME_KEY = 'orca-color-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorThemeId, setColorThemeIdState] = useState<string>(DEFAULT_COLOR_THEME_ID)
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(true) // V10 default: dark

  const currentTheme = ALL_THEMES.find(t => t.id === colorThemeId) ?? defaultCT
  const theme = buildTheme(currentTheme, isDarkMode)

  const setColorTheme = (id: string) => {
    if (ALL_THEMES.find(t => t.id === id)) {
      setColorThemeIdState(id)
      try {
        localStorage.setItem(COLOR_THEME_KEY, id)
        localStorage.setItem(THEME_ID_KEY, id) // backward compat
        window.dispatchEvent(new CustomEvent('orca-theme-changed', { detail: { themeId: id } }))
      } catch {}
    }
  }

  // Alias for backward compatibility
  const setThemeId = setColorTheme

  const toggleDark = () => {
    const newDark = !isDarkMode
    setIsDarkModeState(newDark)
    try {
      localStorage.setItem(DARK_MODE_KEY, newDark ? 'true' : 'false')
      window.dispatchEvent(new CustomEvent('orca-dark-mode-changed', { detail: { isDark: newDark } }))
    } catch {}
  }

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      // Color theme
      const savedColor = localStorage.getItem(COLOR_THEME_KEY) || localStorage.getItem(THEME_ID_KEY)
      if (savedColor && ALL_THEMES.find(t => t.id === savedColor)) {
        setColorThemeIdState(savedColor)
      }
      // Dark mode (default true for V10)
      const savedDark = localStorage.getItem(DARK_MODE_KEY)
      if (savedDark !== null) {
        setIsDarkModeState(savedDark !== 'false')
      }
    } catch {}
  }, [])

  // Cross-tab sync
  useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if ((e.key === COLOR_THEME_KEY || e.key === THEME_ID_KEY) && e.newValue && ALL_THEMES.find(t => t.id === e.newValue!)) {
        setColorThemeIdState(e.newValue)
      }
      if (e.key === DARK_MODE_KEY && e.newValue !== null) {
        setIsDarkModeState(e.newValue !== 'false')
      }
    }
    const localWriteHandler = (e: any) => {
      const key = e?.detail?.key || ''
      if (key === COLOR_THEME_KEY || key === THEME_ID_KEY) {
        try {
          const saved = localStorage.getItem(COLOR_THEME_KEY) || localStorage.getItem(THEME_ID_KEY)
          if (saved && ALL_THEMES.find(t => t.id === saved)) setColorThemeIdState(saved)
        } catch {}
      }
      if (key === DARK_MODE_KEY) {
        try {
          const saved = localStorage.getItem(DARK_MODE_KEY)
          setIsDarkModeState(saved !== 'false')
        } catch {}
      }
    }
    const darkModeChangedHandler = (e: any) => {
      setIsDarkModeState(e?.detail?.isDark ?? true)
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

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement

    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // V10 CSS custom properties for sidebar/gradients
    root.style.setProperty('--theme-primary', currentTheme.primary)
    root.style.setProperty('--theme-primary-light', currentTheme.primaryLight)
    root.style.setProperty('--theme-sidebar-bg', currentTheme.sidebarBg)
    root.style.setProperty('--theme-page-bg', currentTheme.pageBg)
    root.style.setProperty('--theme-nav-active-bg', currentTheme.navActiveBg)
    root.style.setProperty('--theme-nav-active-icon', currentTheme.navActiveIcon)
    root.style.setProperty('--theme-sidebar-border', currentTheme.sidebarBorderColor)

    // Legacy CSS custom properties
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
    if (metaThemeColor) metaThemeColor.setAttribute('content', theme.bg)

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
    root.setAttribute('data-theme', colorThemeId)
  }, [theme, colorThemeId, isDarkMode, currentTheme])

  return (
    <ThemeContext.Provider value={{
      theme, themeId: colorThemeId, setThemeId,
      allThemes: THEME_LIST, isDark: isDarkMode, toggleDark,
      currentTheme, colorThemeId, setColorTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
