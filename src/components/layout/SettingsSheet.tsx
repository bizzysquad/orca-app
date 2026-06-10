'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sun, Moon, LogOut, Shield, Check, ChevronRight,
  User, Delete, ArrowLeft,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme, THEMES } from '@/context/ThemeContext'
import { createBrowserClient } from '@supabase/ssr'

const BENTLEY_GOLD = '#F59E0B'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  userName?: string
  userEmail?: string
}

// ── Reusable PIN pad ──────────────────────────────────────────────
function PinPad({
  label,
  onComplete,
  error,
}: {
  label: string
  onComplete: (pin: string) => void
  error?: string
}) {
  const { theme } = useTheme()
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  const press = (d: string) => {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => { onComplete(next); setPin('') }, 100)
    }
  }

  useEffect(() => {
    if (error) { setShake(true); setTimeout(() => setShake(false), 500) }
  }, [error])

  const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-sm font-medium text-center" style={{ color: theme.subtext }}>{label}</p>

      <motion.div
        animate={shake ? { x: [-8,8,-8,8,0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="flex gap-3"
      >
        {[0,1,2,3,4,5].map(i => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              background: i < pin.length ? BENTLEY_GOLD : 'transparent',
              border: `2px solid ${i < pin.length ? BENTLEY_GOLD : theme.border}`,
            }}
          />
        ))}
      </motion.div>

      {error && <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-52">
        {KEYS.flat().map((k, i) => (
          k === '' ? <div key={i} /> :
          <motion.button
            key={i}
            whileTap={{ scale: 0.85 }}
            onClick={() => press(k)}
            className="h-12 rounded-2xl flex items-center justify-center text-lg font-semibold"
            style={{ background: theme.card, border: `1px solid ${theme.border}`, color: k === '⌫' ? theme.subtext : theme.text }}
          >
            {k === '⌫' ? <Delete size={16} /> : k}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Theme picker ──────────────────────────────────────────────────
function ThemePicker() {
  const { theme, themeId, setThemeId, isDark, toggleDark } = useTheme()
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ color: theme.text }}>Theme</p>
        <button
          onClick={toggleDark}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.subtext }}
        >
          {isDark ? <Sun size={11} /> : <Moon size={11} />}
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Object.values(THEMES).map(t => (
          <button key={t.id} onClick={() => setThemeId(t.id)} className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: t.accent,
                outline: themeId === t.id ? `3px solid #fff` : '3px solid transparent',
                outlineOffset: 2,
              }}
            >
              {themeId === t.id && <Check size={14} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-[9px] text-center leading-tight" style={{ color: theme.subtext }}>
              {t.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Admin panel (inside sheet) ────────────────────────────────────
type AdminView = 'menu' | 'change-pin-current' | 'change-pin-new' | 'change-pin-confirm'

function AdminPanel({ onBack: _onBack }: { onBack: () => void }) {
  const { theme } = useTheme()
  const [view, setView] = useState<AdminView>('menu')
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleNewPin = (pin: string) => {
    setNewPin(pin)
    setPinError('')
    setView('change-pin-confirm')
  }

  const handleConfirmPin = async (pin: string) => {
    if (pin !== newPin) {
      setPinError("PINs don't match — try again.")
      setView('change-pin-new')
      setNewPin('')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/update-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error || 'Failed to save.')
        setView('change-pin-new')
      } else {
        setSaved(true)
        setTimeout(() => { setSaved(false); setView('menu') }, 1800)
      }
    } catch {
      setPinError('Connection error.')
      setView('change-pin-new')
    } finally {
      setSaving(false)
    }
  }

  if (view === 'change-pin-new') {
    return (
      <div>
        <button onClick={() => { setView('menu'); setPinError('') }} className="flex items-center gap-1.5 mb-4 text-sm" style={{ color: theme.subtext }}>
          <ArrowLeft size={14} /> Back
        </button>
        <PinPad label="Enter your new passcode" onComplete={handleNewPin} error={pinError} />
      </div>
    )
  }

  if (view === 'change-pin-confirm') {
    return (
      <div>
        <button onClick={() => setView('change-pin-new')} className="flex items-center gap-1.5 mb-4 text-sm" style={{ color: theme.subtext }}>
          <ArrowLeft size={14} /> Back
        </button>
        <PinPad label="Confirm new passcode" onComplete={handleConfirmPin} error={pinError} />
        {saving && <p className="text-center text-xs mt-3" style={{ color: BENTLEY_GOLD }}>Saving…</p>}
      </div>
    )
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#10B98120' }}>
          <Check size={22} style={{ color: '#10B981' }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: '#10B981' }}>Passcode updated!</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ThemePicker />

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
        <button
          onClick={() => { setView('change-pin-new'); setPinError('') }}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_GOLD}15` }}>
              <Shield size={14} style={{ color: BENTLEY_GOLD }} />
            </div>
            <span className="text-sm font-medium" style={{ color: theme.text }}>Change Passcode</span>
          </div>
          <ChevronRight size={14} style={{ color: theme.subtext }} />
        </button>
      </div>
    </div>
  )
}

// ── Main sheet ────────────────────────────────────────────────────
export default function SettingsSheet({ open, onClose, userName = 'User', userEmail }: SettingsSheetProps) {
  const { theme, isDark, toggleDark } = useTheme()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    if (!open) setTimeout(() => setShowAdmin(false), 300)
  }, [open])

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

  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl overflow-hidden"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: theme.border }} />
            </div>

            <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: '82vh' }}>
              {/* Header */}
              <div className="flex items-center justify-between py-3 mb-3">
                <h2 className="text-base font-bold" style={{ color: theme.text }}>
                  {showAdmin ? 'Admin Settings' : 'Settings'}
                </h2>
                <button
                  onClick={showAdmin ? () => setShowAdmin(false) : onClose}
                  className="p-2 rounded-xl"
                  style={{ background: theme.card }}
                >
                  {showAdmin ? <ArrowLeft size={15} style={{ color: theme.subtext }} /> : <X size={15} style={{ color: theme.subtext }} />}
                </button>
              </div>

              {showAdmin ? (
                <AdminPanel onBack={() => setShowAdmin(false)} />
              ) : (
                <div className="space-y-4">
                  {/* User card */}
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

                  {/* Actions list */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    {/* Dark/light */}
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
                        className="w-9 rounded-full relative"
                        style={{ background: isDark ? theme.accent : theme.border, padding: '2px', height: 20 }}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0)' }}
                        />
                      </div>
                    </button>

                    {/* Settings page */}
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
                          Themes · PIN
                        </span>
                        <ChevronRight size={14} style={{ color: theme.subtext }} />
                      </div>
                    </button>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
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
