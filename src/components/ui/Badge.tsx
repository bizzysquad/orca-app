'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'gold' | 'neutral'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, children, variant = 'gold', ...props }, ref) => {
    const variantStyles = {
      success: 'bg-success/20 text-success border border-success/30',
      warning: 'bg-warning/20 text-warning border border-warning/30',
      danger: 'bg-danger/20 text-danger border border-danger/30',
      gold: 'bg-gold/20 text-gold border border-gold/30',
      neutral: 'bg-surface-border/30 text-text-muted border border-surface-border/50',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1.5 rounded-full',
          'text-xs sm:text-sm font-medium',
          'transition-colors duration-200',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
