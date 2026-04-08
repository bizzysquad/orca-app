import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ColorTheme {
  id: string;
  name: string;
  category: 'women' | 'men';
  variant: 'vivid' | 'night';
  primary: string;
  primaryLight: string;
  sidebarBg: string;
  pageBg: string;
  headerBg: string;   // used in dark mode header
  navActiveBg: string;
  navActiveIcon: string;
  sidebarBorderColor: string;
  // Gradient stops for sidebar
  sidebarGradientFrom: string;
  sidebarGradientTo: string;
  // For theme swatch display
  swatchFrom: string;
  swatchTo: string;
}

export const ALL_THEMES: ColorTheme[] = [
  // ─────────────── WOMEN'S VIVID ───────────────
  {
    id: 'rose-vivid',
    name: 'Rose Glow',
    category: 'women',
    variant: 'vivid',
    primary: '#E91E8C',
    primaryLight: '#F472B6',
    sidebarBg: '#1E0535',
    sidebarGradientFrom: '#2D0A4E',
    sidebarGradientTo: '#1A0230',
    pageBg: '#180228',
    headerBg: '#1E0535',
    navActiveBg: 'rgba(233,30,140,0.22)',
    navActiveIcon: '#F472B6',
    sidebarBorderColor: 'rgba(233,30,140,0.15)',
    swatchFrom: '#E91E8C',
    swatchTo: '#9C27B0',
  },
  {
    id: 'violet-vivid',
    name: 'Violet Dream',
    category: 'women',
    variant: 'vivid',
    primary: '#6366F1',
    primaryLight: '#A78BFA',
    sidebarBg: '#120D3B',
    sidebarGradientFrom: '#1E1560',
    sidebarGradientTo: '#0E0A2A',
    pageBg: '#0C0828',
    headerBg: '#120D3B',
    navActiveBg: 'rgba(99,102,241,0.22)',
    navActiveIcon: '#A78BFA',
    sidebarBorderColor: 'rgba(99,102,241,0.15)',
    swatchFrom: '#6366F1',
    swatchTo: '#312E8F',
  },
  {
    id: 'teal-vivid',
    name: 'Teal Wave',
    category: 'women',
    variant: 'vivid',
    primary: '#0D9488',
    primaryLight: '#2DD4BF',
    sidebarBg: '#032A26',
    sidebarGradientFrom: '#044038',
    sidebarGradientTo: '#021C18',
    pageBg: '#021A16',
    headerBg: '#032A26',
    navActiveBg: 'rgba(13,148,136,0.22)',
    navActiveIcon: '#2DD4BF',
    sidebarBorderColor: 'rgba(13,148,136,0.15)',
    swatchFrom: '#0D9488',
    swatchTo: '#065F50',
  },
  // ─────────────── WOMEN'S NIGHT ───────────────
  {
    id: 'rose-night',
    name: 'Rose Night',
    category: 'women',
    variant: 'night',
    primary: '#E91E8C',
    primaryLight: '#F472B6',
    sidebarBg: '#0A0010',
    sidebarGradientFrom: '#0E0018',
    sidebarGradientTo: '#060008',
    pageBg: '#050007',
    headerBg: '#0A0010',
    navActiveBg: 'rgba(233,30,140,0.14)',
    navActiveIcon: '#F472B6',
    sidebarBorderColor: 'rgba(233,30,140,0.09)',
    swatchFrom: '#3D0020',
    swatchTo: '#0A0010',
  },
  {
    id: 'violet-night',
    name: 'Violet Night',
    category: 'women',
    variant: 'night',
    primary: '#6366F1',
    primaryLight: '#A78BFA',
    sidebarBg: '#07031A',
    sidebarGradientFrom: '#0C0726',
    sidebarGradientTo: '#040210',
    pageBg: '#030110',
    headerBg: '#07031A',
    navActiveBg: 'rgba(99,102,241,0.14)',
    navActiveIcon: '#A78BFA',
    sidebarBorderColor: 'rgba(99,102,241,0.09)',
    swatchFrom: '#1E1B4B',
    swatchTo: '#07031A',
  },
  {
    id: 'teal-night',
    name: 'Teal Night',
    category: 'women',
    variant: 'night',
    primary: '#0D9488',
    primaryLight: '#2DD4BF',
    sidebarBg: '#020D0B',
    sidebarGradientFrom: '#041410',
    sidebarGradientTo: '#010806',
    pageBg: '#010706',
    headerBg: '#020D0B',
    navActiveBg: 'rgba(13,148,136,0.14)',
    navActiveIcon: '#2DD4BF',
    sidebarBorderColor: 'rgba(13,148,136,0.09)',
    swatchFrom: '#134E4A',
    swatchTo: '#020D0B',
  },
  // ─────────────── MEN'S VIVID ───────────────
  {
    id: 'amber-vivid',
    name: 'Amber Blaze',
    category: 'men',
    variant: 'vivid',
    primary: '#F59E0B',
    primaryLight: '#FCD34D',
    sidebarBg: '#1C1000',
    sidebarGradientFrom: '#2C1A00',
    sidebarGradientTo: '#110900',
    pageBg: '#140B00',
    headerBg: '#1C1000',
    navActiveBg: 'rgba(245,158,11,0.22)',
    navActiveIcon: '#FCD34D',
    sidebarBorderColor: 'rgba(245,158,11,0.15)',
    swatchFrom: '#F59E0B',
    swatchTo: '#B45309',
  },
  {
    id: 'crimson-vivid',
    name: 'Crimson Fire',
    category: 'men',
    variant: 'vivid',
    primary: '#EF4444',
    primaryLight: '#F87171',
    sidebarBg: '#1A0404',
    sidebarGradientFrom: '#280808',
    sidebarGradientTo: '#100202',
    pageBg: '#120202',
    headerBg: '#1A0404',
    navActiveBg: 'rgba(239,68,68,0.22)',
    navActiveIcon: '#F87171',
    sidebarBorderColor: 'rgba(239,68,68,0.15)',
    swatchFrom: '#EF4444',
    swatchTo: '#991B1B',
  },
  {
    id: 'rust-vivid',
    name: 'Warm Spice',
    category: 'men',
    variant: 'vivid',
    primary: '#F97316',
    primaryLight: '#FB923C',
    sidebarBg: '#1A0900',
    sidebarGradientFrom: '#2A1200',
    sidebarGradientTo: '#100500',
    pageBg: '#120600',
    headerBg: '#1A0900',
    navActiveBg: 'rgba(249,115,22,0.22)',
    navActiveIcon: '#FB923C',
    sidebarBorderColor: 'rgba(249,115,22,0.15)',
    swatchFrom: '#F97316',
    swatchTo: '#C2410C',
  },
  // ─────────────── MEN'S NIGHT ───────────────
  {
    id: 'amber-night',
    name: 'Amber Night',
    category: 'men',
    variant: 'night',
    primary: '#F59E0B',
    primaryLight: '#FCD34D',
    sidebarBg: '#0A0700',
    sidebarGradientFrom: '#0F0B00',
    sidebarGradientTo: '#050300',
    pageBg: '#060400',
    headerBg: '#0A0700',
    navActiveBg: 'rgba(245,158,11,0.14)',
    navActiveIcon: '#FCD34D',
    sidebarBorderColor: 'rgba(245,158,11,0.09)',
    swatchFrom: '#78350F',
    swatchTo: '#0A0700',
  },
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    category: 'men',
    variant: 'night',
    primary: '#EF4444',
    primaryLight: '#F87171',
    sidebarBg: '#0A0202',
    sidebarGradientFrom: '#100303',
    sidebarGradientTo: '#060101',
    pageBg: '#060101',
    headerBg: '#0A0202',
    navActiveBg: 'rgba(239,68,68,0.14)',
    navActiveIcon: '#F87171',
    sidebarBorderColor: 'rgba(239,68,68,0.09)',
    swatchFrom: '#7F1D1D',
    swatchTo: '#0A0202',
  },
  {
    id: 'rust-night',
    name: 'Spice Night',
    category: 'men',
    variant: 'night',
    primary: '#F97316',
    primaryLight: '#FB923C',
    sidebarBg: '#0A0400',
    sidebarGradientFrom: '#100600',
    sidebarGradientTo: '#060200',
    pageBg: '#060200',
    headerBg: '#0A0400',
    navActiveBg: 'rgba(249,115,22,0.14)',
    navActiveIcon: '#FB923C',
    sidebarBorderColor: 'rgba(249,115,22,0.09)',
    swatchFrom: '#7C2D12',
    swatchTo: '#0A0400',
  },
];

const DEFAULT_THEME_ID = 'violet-vivid';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colorThemeId: string;
  setColorTheme: (id: string) => void;
  currentTheme: ColorTheme;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  colorThemeId: DEFAULT_THEME_ID,
  setColorTheme: () => {},
  currentTheme: ALL_THEMES.find(t => t.id === DEFAULT_THEME_ID)!,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('orca-theme');
      return stored !== 'light'; // default dark
    }
    return true;
  });

  const [colorThemeId, setColorThemeId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('orca-color-theme');
      if (stored && ALL_THEMES.find(t => t.id === stored)) return stored;
    }
    return DEFAULT_THEME_ID;
  });

  const currentTheme = ALL_THEMES.find(t => t.id === colorThemeId) ?? ALL_THEMES[1];

  // Apply dark/light class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('orca-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('orca-theme', 'light');
    }
  }, [isDark]);

  // Apply color theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', currentTheme.primary);
    root.style.setProperty('--theme-primary-light', currentTheme.primaryLight);
    root.style.setProperty('--theme-sidebar-bg', currentTheme.sidebarBg);
    root.style.setProperty('--theme-page-bg', currentTheme.pageBg);
    root.style.setProperty('--theme-nav-active-bg', currentTheme.navActiveBg);
    root.style.setProperty('--theme-nav-active-icon', currentTheme.navActiveIcon);
    root.style.setProperty('--theme-sidebar-border', currentTheme.sidebarBorderColor);
    localStorage.setItem('orca-color-theme', colorThemeId);
  }, [colorThemeId, currentTheme]);

  const toggleTheme = () => setIsDark(d => !d);
  const setColorTheme = (id: string) => setColorThemeId(id);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colorThemeId, setColorTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
