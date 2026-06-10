'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Delete } from 'lucide-react'

const GOLD = '#F59E0B'
const INDIGO = '#6366F1'

export default function LoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = async (finalPin: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: finalPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setShake(true)
        setPin('')
        setError(data.error || 'Wrong passcode')
        setTimeout(() => setShake(false), 600)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Connection error. Try again.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleDigit = (d: string) => {
    if (loading || pin.length >= 6) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 6) submit(next)
  }

  const handleDelete = () => {
    if (loading) return
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#070B14' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-12"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, ${INDIGO}, #4F46E5)`, boxShadow: `0 0 40px ${INDIGO}40` }}
        >
          <span className="text-white font-black text-2xl">O</span>
        </div>
        <h1 className="text-2xl font-black tracking-widest" style={{ color: GOLD }}>ORCA</h1>
        <p className="text-xs font-semibold tracking-widest mt-1" style={{ color: '#475569' }}>
          COMMAND CENTER
        </p>
      </motion.div>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-4 mb-8"
      >
        {[0,1,2,3,4,5].map(i => (
          <motion.div
            key={i}
            animate={{
              scale: i < pin.length ? 1.15 : 1,
              backgroundColor: i < pin.length ? GOLD : 'transparent',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-3.5 h-3.5 rounded-full"
            style={{
              border: `2px solid ${i < pin.length ? GOLD : '#1E2A45'}`,
            }}
          />
        ))}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm mb-6 font-medium"
            style={{ color: '#EF4444' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {!error && <div className="mb-6 h-5" />}

      {/* Keypad */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="grid grid-cols-3 gap-4 w-64"
      >
        {KEYS.flat().map((key, i) => {
          if (!key) return <div key={i} />
          const isDelete = key === '⌫'
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              onClick={() => isDelete ? handleDelete() : handleDigit(key)}
              disabled={loading}
              className="h-16 rounded-2xl flex items-center justify-center text-xl font-semibold select-none disabled:opacity-40"
              style={{
                background: '#111827',
                border: '1px solid #1E2A45',
                color: isDelete ? '#475569' : '#F8FAFC',
              }}
            >
              {isDelete ? <Delete size={18} /> : key}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 flex gap-1.5"
          >
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: GOLD }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="absolute bottom-8 text-xs" style={{ color: '#1E2A45' }}>
        orcafin.app
      </p>
    </div>
  )
}
