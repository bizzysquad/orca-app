'use client'

import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  prefix?: React.ReactNode
}

export default function Input({ label, error, prefix, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]">
            {prefix}
          </div>
        )}
        <input
          className={`w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843] transition-all ${prefix ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
