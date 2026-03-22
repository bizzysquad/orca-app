'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label?: string
  showPercentage?: boolean
  color?: 'gold' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  color = 'gold',
  size = 'md',
  animated = true,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100)

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  const colorClasses = {
    gold: 'bg-gold',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gold">{label}</span>}
          {showPercentage && <span className="text-sm font-semibold text-gold">{clampedValue}%</span>}
        </div>
      )}

      <div className={cn('w-full bg-surface-border/30 rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          initial={animated ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
          className={cn('h-full rounded-full transition-all duration-300', colorClasses[color])}
          style={{
            backgroundSize: '200% 100%',
            backgroundPosition: animated ? '200% 0' : '0 0',
            animation: animated ? 'shimmer 2s linear infinite' : 'none',
          }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
