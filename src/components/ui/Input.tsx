'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  prefix?: React.ReactNode
}

export default function Input({ label, error, prefix, className = '', ...props }: InputProps) {
  const { theme } = useTheme()

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: theme.textM }}>
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textS }}>
            {prefix}
          </div>
        )}
        <input
          className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 transition-all ${prefix ? 'pl-11' : ''} ${className}`}
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            color: theme.text,
          }}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
