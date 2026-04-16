'use client'

/**
 * SetupBanner
 * Shown to new users who haven't added income, bills, or balance yet.
 * A step-by-step guided prompt that tells them exactly what to do first.
 */
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

interface SetupStep {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

interface SetupBannerProps {
  hasIncome: boolean
  hasBills: boolean
  hasBalance: boolean
  theme: any
}

export default function SetupBanner({ hasIncome, hasBills, hasBalance, theme }: SetupBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('orca-setup-dismissed') === 'true'
    }
    return false
  })

  const steps: SetupStep[] = [
    {
      id: 'balance',
      label: 'Add your checking balance',
      description: 'So ORCA knows your real starting point.',
      href: '/settings?tab=financial',
      done: hasBalance,
    },
    {
      id: 'income',
      label: 'Add an income source',
      description: 'When do you get paid and how much?',
      href: '/smart-stack',
      done: hasIncome,
    },
    {
      id: 'bills',
      label: 'Add your monthly bills',
      description: 'Rent, subscriptions, loans — anything recurring.',
      href: '/bill-boss',
      done: hasBills,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const nextStep = steps.find((s) => !s.done)

  const dismiss = () => {
    localStorage.setItem('orca-setup-dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed || allDone) return null

  const pct = Math.round((completedCount / steps.length) * 100)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: '#D4AF37' }}
          aria-label="Dismiss setup guide"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pr-6">
          <div>
            <p className="text-sm font-bold mb-0.5" style={{ color: '#D4AF37' }}>
              Get the most out of ORCA
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {completedCount} of {steps.length} steps complete — takes about 2 minutes
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#D4AF37',
            }}
          >
            {pct}%
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1 rounded-full mb-4 overflow-hidden"
          style={{ background: 'rgba(212,175,55,0.12)' }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ background: 'linear-gradient(90deg, #D4AF37, #F5D76E)' }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-4">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-start gap-3"
              style={{ opacity: step.done ? 0.45 : 1 }}
            >
              {step.done ? (
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
              ) : (
                <Circle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.35)' }} />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: step.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Next action CTA */}
        {nextStep && (
          <Link
            href={nextStep.href}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5D76E 50%, #D4AF37 100%)',
              backgroundSize: '200% 100%',
              color: '#0A0A0A',
            }}
          >
            {nextStep.label}
            <ArrowRight size={14} />
          </Link>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
