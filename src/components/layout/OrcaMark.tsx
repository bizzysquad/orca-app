'use client'

import { useTheme } from '@/context/ThemeContext'

// The ORCA logo mark: a solid tile with a ringed eye in the accent color.
export function OrcaMark({ size = 28 }: { size?: number }) {
  const { theme } = useTheme()
  return (
    <span
      className="rounded-[9px] flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: theme.text }}
      aria-hidden
    >
      <span className="rounded-full" style={{ width: size * 0.42, height: size * 0.42, border: `${Math.max(2, size * 0.09)}px solid ${theme.bg}`, boxShadow: `inset 0 0 0 ${size * 0.05}px ${theme.accent}` }} />
    </span>
  )
}
