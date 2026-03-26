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
  DollarSign,
} from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { useTheme } from '@/context/ThemeContext'

export default function SettingsPage() {
  const router = useRouter()
  const { data, setData, loading } = useOrcaData()
  const user = data.user
  const { isDark, setIsDark, theme } = useTheme()

  // Personal info edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Core financial input
  const [netIncome, setNetIncome] = useState(String(user.netIncome || ''))

  // Credit score
  const [creditScore, setCreditScore] = useState(String(user.creditScore || ''))

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  // Handlers
  const handleSaveName = () => {
    const updatedUser = { ...user, name: editName }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { localStorage.setItem('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setEditingName(false)
  }
  const handleSaveEmail = () => {
    const updatedUser = { ...user, email: editEmail }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { localStorage.setItem('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setEditingEmail(false)
  }

  const handleSaveIncome = () => {
    const updatedUser = {
      ...user,
      netIncome: parseFloat(netIncome) || 0,
      creditScore: parseInt(creditScore) || 0,
    }
    setData(prev => ({ ...prev, user: updatedUser }))
    try { localStorage.setItem('orca-user-settings', JSON.stringify(updatedUser)) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleResetData = () => setShowResetConfirm(false)

  const bg = theme.bg
  const card = theme.card
  const border = theme.border
  const text = theme.text
  const textS = theme.textS
  const textM = theme.textM
  const gold = theme.gold

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div style={{ color: text }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bg }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 backdrop-blur border-b"
        style={{
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(250, 250, 249, 0.95)',
          borderColor: border,
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold" style={{ color: text }}>
            Settings
          </h1>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg p-6"
          style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: gold, color: isDark ? '#09090b' : '#ffffff' }}
            >
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: text }}>{user.name}</div>
              <div style={{ color: textS }}>{user.email}</div>
            </div>
          </div>
        </motion.div>

        {/* 2. Income Settings (Simplified) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>
            Income
          </h2>
          <div
            className="rounded-lg p-6 space-y-5"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            {/* Net Income */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                Net Income (per pay period)
              </label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: '#22c55e' }} />
                <input
                  type="number"
                  value={netIncome}
                  onChange={e => setNetIncome(e.target.value)}
                  placeholder="e.g., 3820"
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                    borderColor: border,
                    borderWidth: '1px',
                    color: text,
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: textM }}>
                Your take-home pay after taxes — used for all budgeting calculations across the platform
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${border}`, marginTop: '8px', marginBottom: '8px' }} />

            {/* Credit Score */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                Credit Score
              </label>
              <input
                type="number"
                min="300"
                max="850"
                value={creditScore}
                onChange={e => setCreditScore(e.target.value)}
                placeholder="e.g., 720"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                  borderColor: border,
                  borderWidth: '1px',
                  color: text,
                }}
              />
              <p className="text-xs mt-1" style={{ color: textM }}>
                Your current credit score (300-850)
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveIncome}
              className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: saved ? '#22c55e' : gold,
                color: isDark ? '#09090b' : '#ffffff',
              }}
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </motion.div>

        {/* 4. Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>
            Appearance
          </h2>
          <div
            className="rounded-lg p-6 flex gap-4"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            <button
              onClick={() => setIsDark(true)}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: isDark ? gold : '#e4e4e0',
                color: isDark ? '#09090b' : '#52525b',
              }}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setIsDark(false)}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: !isDark ? gold : '#e4e4e0',
                color: !isDark ? '#ffffff' : '#52525b',
              }}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
          </div>
        </motion.div>

        {/* 5. Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>
            Personal Information
          </h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>Full Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                      borderColor: border,
                      borderWidth: '1px',
                      color: text,
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: gold, color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: isDark ? '#27272a' : '#f4f4f2', color: text }}
                >
                  {editName}
                  <button onClick={() => setEditingName(true)} className="text-sm" style={{ color: gold }}>Edit</button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>Email Address</label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <input
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                      borderColor: border,
                      borderWidth: '1px',
                      color: text,
                    }}
                  />
                  <button
                    onClick={handleSaveEmail}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: gold, color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: isDark ? '#27272a' : '#f4f4f2', color: text }}
                >
                  {editEmail}
                  <button onClick={() => setEditingEmail(true)} className="text-sm" style={{ color: gold }}>Edit</button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 6. Privacy & Data */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>Privacy & Data</h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            <div style={{ color: textS }} className="text-sm">
              <Shield className="w-4 h-4 inline mr-2" style={{ color: gold }} />
              Your data is encrypted and stored securely. We never share your information with third parties without explicit consent.
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: '#ef4444', color: '#fafafa' }}
            >
              Reset All Data
            </button>
          </div>
        </motion.div>

        {/* 7. Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: '#ef4444', color: '#fafafa' }}
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
              style={{ backgroundColor: card }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2" style={{ color: text }}>Reset All Data?</h2>
              <p style={{ color: textS }} className="mb-6">
                This action cannot be undone. All your settings and linked accounts will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: isDark ? '#27272a' : '#e4e4e0', color: text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: '#ef4444', color: '#fafafa' }}
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
