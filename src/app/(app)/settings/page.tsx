'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Shield,
  Moon,
  Sun,
  LogOut,
  Save,
  Edit3,
  Check,
} from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'

export default function SettingsPage() {
  const router = useRouter()
  const { data, setData, loading } = useOrcaData()
  const user = data.user
  const { isDark, setIsDark, theme } = useTheme()

  // Profile edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Credit scores — per-bureau
  const [creditScore, setCreditScore] = useState(String(user.creditScore || ''))
  const [scoreTransUnion, setScoreTransUnion] = useState(String(user.creditScoreTransUnion || ''))
  const [scoreEquifax, setScoreEquifax] = useState(String(user.creditScoreEquifax || ''))
  const [scoreExperian, setScoreExperian] = useState(String(user.creditScoreExperian || ''))

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  // Handlers
  const handleSaveName = () => {
    const updatedUser = { ...user, name: editName }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { setLocalSynced('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setEditingName(false)
  }
  const handleSaveEmail = () => {
    const updatedUser = { ...user, email: editEmail }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { setLocalSynced('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setEditingEmail(false)
  }

  const handleSaveSettings = () => {
    const updatedUser = {
      ...user,
      creditScore: parseInt(creditScore) || 0,
      creditScoreTransUnion: parseInt(scoreTransUnion) || 0,
      creditScoreEquifax: parseInt(scoreEquifax) || 0,
      creditScoreExperian: parseInt(scoreExperian) || 0,
    }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { setLocalSynced('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleResetData = () => setShowResetConfirm(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div style={{ color: theme.text }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 backdrop-blur border-b"
        style={{
          backgroundColor: theme.navGlass,
          borderColor: theme.border,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold" style={{ color: theme.text }}>
            Settings
          </h1>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Profile / Account Card — consolidated Name + Email */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
            Account
          </h2>
          <div
            className="rounded-lg p-6 space-y-5"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: '1px' }}
          >
            {/* Avatar + summary */}
            <div className="flex items-center gap-4 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ backgroundColor: theme.gold, color: theme.bg }}
              >
                {editName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg truncate" style={{ color: theme.text }}>{user.name}</div>
                <div className="text-sm truncate" style={{ color: theme.textS }}>{user.email}</div>
              </div>
            </div>

            {/* Name field */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.textS }}>Full Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      borderWidth: '1px',
                      color: theme.text,
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: theme.gold, color: theme.bg }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: theme.bgS, color: theme.text }}
                >
                  <span className="truncate">{editName}</span>
                  <button onClick={() => setEditingName(true)} className="text-sm font-medium ml-2 flex-shrink-0" style={{ color: theme.gold }}>
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Email field */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.textS }}>Email Address</label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <input
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      borderWidth: '1px',
                      color: theme.text,
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEmail}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: theme.gold, color: theme.bg }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: theme.bgS, color: theme.text }}
                >
                  <span className="truncate">{editEmail}</span>
                  <button onClick={() => setEditingEmail(true)} className="text-sm font-medium ml-2 flex-shrink-0" style={{ color: theme.gold }}>
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 2. Credit Scores */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
            Credit Scores
          </h2>
          <div
            className="rounded-lg p-6 space-y-5"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: '1px' }}
          >
            {/* Overall / Primary Score */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textS }}>
                Overall Score
              </label>
              <input
                type="number"
                min="300"
                max="850"
                value={creditScore}
                onChange={e => setCreditScore(e.target.value)}
                placeholder="e.g., 720"
                className="w-full px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  borderWidth: '1px',
                  color: theme.text,
                }}
              />
              <p className="text-xs mt-1" style={{ color: theme.textM }}>
                Your primary credit score (300-850)
              </p>
            </div>

            {/* Bureau-specific scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.textM }}>
                  TransUnion
                </label>
                <input
                  type="number"
                  min="300"
                  max="850"
                  value={scoreTransUnion}
                  onChange={e => setScoreTransUnion(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    borderWidth: '1px',
                    color: theme.text,
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.textM }}>
                  Equifax
                </label>
                <input
                  type="number"
                  min="300"
                  max="850"
                  value={scoreEquifax}
                  onChange={e => setScoreEquifax(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    borderWidth: '1px',
                    color: theme.text,
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.textM }}>
                  Experian
                </label>
                <input
                  type="number"
                  min="300"
                  max="850"
                  value={scoreExperian}
                  onChange={e => setScoreExperian(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    borderWidth: '1px',
                    color: theme.text,
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: saved ? theme.ok : theme.gold,
                color: theme.bg,
              }}
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </motion.div>

        {/* 3. Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
            Appearance
          </h2>
          <div
            className="rounded-lg p-6 flex gap-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: '1px' }}
          >
            <button
              onClick={() => setIsDark(true)}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: isDark ? theme.gold : theme.bgS,
                color: isDark ? theme.bg : theme.textS,
                borderWidth: '1px',
                borderColor: isDark ? theme.gold : theme.border,
              }}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setIsDark(false)}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: !isDark ? theme.gold : theme.bgS,
                color: !isDark ? theme.bg : theme.textS,
                borderWidth: '1px',
                borderColor: !isDark ? theme.gold : theme.border,
              }}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
          </div>
        </motion.div>

        {/* 4. Privacy & Data */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Privacy & Data</h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: '1px' }}
          >
            <div style={{ color: theme.textS }} className="text-sm">
              <Shield className="w-4 h-4 inline mr-2" style={{ color: theme.gold }} />
              Your data is encrypted and stored securely. We never share your information with third parties without explicit consent.
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: theme.bad, color: '#ffffff' }}
            >
              Reset All Data
            </button>
          </div>
        </motion.div>

        {/* 5. Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.bad, color: '#ffffff' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>

      {/* Reset Data Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: theme.overlay }}
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm rounded-2xl p-8"
              style={{ backgroundColor: theme.card }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Reset All Data?</h2>
              <p style={{ color: theme.textS }} className="mb-6">
                This action cannot be undone. All your settings and linked accounts will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: theme.bgS, color: theme.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: theme.bad, color: '#ffffff' }}
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
