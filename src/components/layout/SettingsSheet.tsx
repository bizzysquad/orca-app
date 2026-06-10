'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sun, Moon, LogOut, Shield, Check, ChevronRight,
  User, Settings, Palette, Bell, Delete,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme, THEMES } from '@/context/ThemeContext'
import { createBrowserClient } from '@supabase/ssr'

const BENTLEY_GOLD = '#F59E0B'
const ADMIN_PIN_KEY = 'orca-admin-pin'
const DEFAULT_PIN = '' // empty = not set yet

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  userName?: string
  userEmail?: string
}

// Simple dot PIN input
function PinInput({ onSubmit, label }: { onSubmit: (pin: string) => void; label: string }) {
  const { theme } = useTheme()
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => {
        onSubmit(next)
        setPin('')
      }, 120)
    }
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  const DIGITS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ]

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-sm font-medium" style={{ color: theme.subtext }}>{label}</p>

      {/* Dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map(i => (
          <motion.div
            key={i}
            animate={shake ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
            className="w-3.5 h-3.5 rounded-full"
            style={{
              background: i < pin.length ? BENTLEY_GOLD : theme.border,
              border: `2px solid ${i < pin.length ? BENTLEY_GOLD : theme.border}`,
            }}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-48">
        {DIGITS.flat().map((d, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: d ? 0.88 : 1 }}
            onClick={() => d === '⌫' ? handleDelete() : d ? handleDigit(d) : undefined}
            className="h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
            style={{
              background: d ? theme.card : 'transparent',
              border: d ? `1px solid ${theme.border}` : 'none',
              color: d === '⌫' ? theme.subtext : theme.text,
              cursor: d ? 'pointer' : 'default',
            }}
          >
            {d === '⌫' ? <Delete size={16} /> : d}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function ThemePicker({ onClose }: { onClose: () => void }) {
  const { theme, themeId, setThemeId, isDark, toggleDark } = useTheme()
  const allThemes = Object.values(THEMES)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold" style={{ color: theme.text }}>Choose Theme</p>
        <button
          onClick={toggleDark}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.subtext }}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {allThemes.map(t => (
          <button
            key={t.id}
            onClick={() => setThemeId(t.id)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="w-10 h-10 rounded-xl relative"
              style={{ background: t.accent, border: `3px solid ${themeId === t.id ? '#fff' : 'transparent'}` }}
            >
              {themeId === t.id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check size={14} color="#fff" />
                </div>
              )}
            </div>
            <span className="text-[9px] font-medium text-center leading-tight" style={{ color: theme.subtext }}>
              {t.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

type AdminView = 'locked' | 'set-pin' | 'confirm-pin' | 'unlocked'

function AdminSection() {
  const { theme } = useTheme()
  const [view, setView] = useState<AdminView>('locked')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_PIN_KEY)
    if (!stored) setView('set-pin')
    else setView('locked')
  }, [])

  const handleUnlock = (pin: string) => {
    const stored = localStorage.getItem(ADMIN_PIN_KEY)
    if (pin === stored) {
      setError('')
      setView('unlocked')
    } else {
      setError('Wrong PIN. Try again.')
      setTimeout(() => setError(''), 2000)
    }
  }

  const handleSetPin = (pin: string) => {
    setNewPin(pin)
    setView('confirm-pin')
  }

  const handleConfirmPin = (pin: string) => {
    if (pin === newPin) {
      localStorage.setItem(ADMIN_PIN_KEY, pin)
      setView('unlocked')
    } else {
      setError("PINs don't match.")
      setView('set-pin')
      setNewPin('')
      setTimeout(() => setError(''), 2000)
    }
  }

  if (view === 'set-pin') {
    return (
      <div>
        {error && <p className="text-xs text-center mb-2" style={{ color: '#EF4444' }}>{error}</p>}
        <PinInput label="Set a 4-digit admin PIN" onSubmit={handleSetPin} />
      </div>
    )
  }

  if (view === 'confirm-pin') {
    return <PinInput label="Confirm your PIN" onSubmit={handleConfirmPin} />
  }

  if (view === 'locked') {
    return (
      <div>
        {error && <p className="text-xs text-center mb-2" style={{ color: '#EF4444' }}>{error}</p>}
        <PinInput label="Enter admin PIN" onSubmit={handleUnlock} />
        <button
          onClick={() => {
            if (confirm('Reset admin PIN? You will need to set a new one.')) {
              localStorage.removeItem(ADMIN_PIN_KEY)
              setView('set-pin')
            }
          }}
          className="w-full text-xs text-center mt-2"
          style={{ color: theme.subtext }}
        >
          Forgot PIN? Reset it
        </button>
      </div>
    )
  }

  // Unlocked admin view
  return (
    <div className="space-y-5">
      <ThemePicker onClose={() => setView('locked')} />
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs" style={{ color: theme.subtext }}>Admin PIN</span>
        <button
          onClick={() => {
            localStorage.removeItem(ADMIN_PIN_KEY)
            setView('set-pin')
          }}
          className="text-xs font-semibold"
          style={{ color: BENTLEY_GOLD }}
        >
          Change PIN
        </button>
      </div>
    </div>
  )
}

export default function SettingsSheet({ open, onClose, userName = 'User', userEmail }: SettingsSheetProps) {
  const { theme, isDark, toggleDark } = useTheme()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.auth.signOut()
      onClose()
      router.push('/auth/login')
    } catch {
      setLoggingOut(false)
    }
  }

  // Reset admin view when sheet closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => setShowAdmin(false), 300)
    }
  }, [open])

  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl overflow-hidden"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: theme.border }} />
            </div>

            <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: '80vh' }}>
              {/* Header */}
              <div className="flex items-center justify-between py-3 mb-2">
                <h2 className="text-base font-bold" style={{ color: theme.text }}>
                  {showAdmin ? 'Admin Settings' : 'Settings'}
                </h2>
                <button
                  onClick={showAdmin ? () => setShowAdmin(false) : onClose}
                  className="p-2 rounded-xl"
                  style={{ background: theme.card }}
                >
                  <X size={15} style={{ color: theme.subtext }} />
                </button>
              </div>

              {showAdmin ? (
                <AdminSection />
              ) : (
                <div className="space-y-4">
                  {/* User info */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: `${theme.accent}20`, border: `2px solid ${theme.accent}40`, color: theme.accent }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: theme.text }}>{userName}</p>
                      {userEmail && <p className="text-xs truncate" style={{ color: theme.subtext }}>{userEmail}</p>}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    {/* Dark / Light toggle */}
                    <button
                      onClick={toggleDark}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      style={{ background: theme.card, borderBottom: `1px solid ${theme.border}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg" style={{ background: `${theme.accent}15` }}>
                          {isDark ? <Sun size={14} style={{ color: theme.accent }} /> : <Moon size={14} style={{ color: theme.accent }} />}
                        </div>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>
                          {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        </span>
                      </div>
                      <div
                        className="w-8 h-4.5 rounded-full relative transition-all"
                        style={{ background: isDark ? theme.accent : theme.border, padding: '2px' }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-white transition-transform"
                          style={{ transform: isDark ? 'translateX(14px)' : 'translateX(0)' }}
                        />
                      </div>
                    </button>

                    {/* Profile settings */}
                    <button
                      onClick={() => { onClose(); router.push('/settings') }}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      style={{ background: theme.card, borderBottom: `1px solid ${theme.border}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg" style={{ background: '#6366F115' }}>
                          <User size={14} style={{ color: '#6366F1' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>Profile & Finance Settings</span>
                      </div>
                      <ChevronRight size={14} style={{ color: theme.subtext }} />
                    </button>

                    {/* Admin */}
                    <button
                      onClick={() => setShowAdmin(true)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                      style={{ background: theme.card }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_GOLD}15` }}>
                          <Shield size={14} style={{ color: BENTLEY_GOLD }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>Admin Settings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${BENTLEY_GOLD}15`, color: BENTLEY_GOLD }}>
                          PIN
                        </span>
                        <ChevronRight size={14} style={{ color: theme.subtext }} />
                      </div>
                    </button>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-opacity"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#F87171',
                    }}
                  >
                    <LogOut size={15} />
                    {loggingOut ? 'Signing out…' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
