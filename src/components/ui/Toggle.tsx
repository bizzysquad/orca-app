'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled = false }) => {
  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-gold' : 'bg-surface-border/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        disabled={disabled}
      >
        <motion.div
          initial={false}
          animate={checked ? { x: 28 } : { x: 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="h-6 w-6 rounded-full bg-white shadow-md"
        />
      </motion.button>

      {label && (
        <label className="text-sm font-medium text-text-primary cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}

export default Toggle
