'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Wallet,
  CreditCard,
  Palette,
  Shield,
  LogOut,
  Save,
  Edit2,
  Check,
  Trash2,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'

type SettingsTab = 'account' | 'financial' | 'appearance' | 'privacy'

const settingsTabs = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'financial', label: 'Financial', icon: Wallet },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'privacy', label: 'Privacy & Data', icon: Shield },
]

export default function SettingsPage() {
  const router = useRouter()
  const { data, setData, loading } = useOrcaData()
  const user = data.user
  const { theme, themeId, setThemeId, allThemes } = useTheme()

  // Tab navigation — read from URL query param if present
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'account'
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  // Sync tab with URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab
    if (tabParam && ['account', 'financial', 'appearance', 'privacy'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Profile edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Checking / Spending account balance
  const [checkingBalance, setCheckingBalance] = useState(String(user.checkingBalance || ''))

  // Credit scores — per-bureau
  const [creditScore, setCreditScore] = useState(String(user.creditScore || ''))
  const [scoreTransUnion, setScoreTransUnion] = useState(String(user.creditScoreTransUnion || ''))
  const [scoreEquifax, setScoreEquifax] = useState(String(user.creditScoreEquifax || ''))
  const [scoreExperian, setScoreExperian] = useState(String(user.creditScoreExperian || ''))

  // Auto-calculate average credit score from bureau scores
  const averageCreditScore = useMemo(() => {
    const scores = [scoreTransUnion, scoreEquifax, scoreExperian]
      .map(s => parseInt(s))
      .filter(n => !isNaN(n) && n > 0)
    if (scores.length === 0) return null
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
  }, [scoreTransUnion, scoreEquifax, scoreExperian])

  // Auto-update overall score when bureau scores change
  useEffect(() => {
    if (averageCreditScore !== null) {
      setCreditScore(String(averageCreditScore))
    }
  }, [averageCreditScore])

  // Reset / Delete account state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
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
      checkingBalance: parseFloat(checkingBalance) || 0,
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete account')
        setIsDeleting(false)
        return
      }
      // Clear all localStorage
      try { localStorage.clear() } catch {}
      // Redirect to login
      router.push('/auth/login')
    } catch (err) {
      setDeleteError('Network error. Please try again.')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div style={{ color: theme.text }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 w-full max-w-full overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Manage your account, preferences, and data</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full flex flex-col sm:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="sm:w-52 flex-shrink-0">
          <div
            className="rounded-2xl p-2 sticky top-24"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {settingsTabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as SettingsTab)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5"
                  style={{
                    background: active ? '#6366F1' : 'transparent',
                    color: active ? '#fff' : theme.textM,
                    fontWeight: active ? 700 : 400,
                    textAlign: 'left',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <>
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: theme.text }} className="mb-5">Account</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: '#6366F1', fontSize: 22, fontWeight: 800 }}
                  >
                    {editName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: theme.text, fontSize: 16 }}>{user.name}</div>
                    <div className="text-sm" style={{ color: theme.textM }}>{user.email}</div>
                    <div
                      className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                      Active
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Full Name
                    </label>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveName}
                          className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                          style={{ backgroundColor: '#6366F1', color: '#fff' }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={editName}
                          disabled
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                        />
                        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textM, cursor: 'pointer' }} onClick={() => setEditingName(true)} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Email Address
                    </label>
                    {editingEmail ? (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEmail}
                          className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                          style={{ backgroundColor: '#6366F1', color: '#fff' }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="email"
                          value={editEmail}
                          disabled
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                        />
                        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textM, cursor: 'pointer' }} onClick={() => setEditingEmail(true)} />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!editingName && !editingEmail) {
                      handleSaveSettings()
                    }
                  }}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <>
              {/* Checking account */}
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
                    <Wallet className="w-5 h-5" style={{ color: '#6366F1' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Checking / Spending Account</h2>
                    <p className="text-sm mt-0.5" style={{ color: theme.textM }}>
                      Enter your current balance to calculate your Safe to Spend amount
                    </p>
                  </div>
                </div>

                <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Current Balance
                </label>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.textM }}>$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={checkingBalance}
                    onChange={(e) => setCheckingBalance(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                  />
                </div>

                <div
                  className="flex items-start gap-2 p-3 rounded-xl mb-4 text-xs"
                  style={{ background: '#EEF2FF', color: '#4F46E5' }}
                >
                  ℹ️ This balance combines with your incoming payments. Bills are allocated first, and the remainder becomes your "Safe to Spend" on the Dashboard.
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}
                >
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved!' : 'Save Balance'}
                </button>
              </div>

              {/* Credit Scores */}
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
                    <CreditCard className="w-5 h-5" style={{ color: '#D97706' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Credit Scores</h2>
                    <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Track your credit across all 3 bureaus</p>
                  </div>
                </div>

                <div className="space-y-4" id="credit-score-section">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Overall Score (300–850)
                      </label>
                      {averageCreditScore !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#6366F115', color: '#6366F1', fontWeight: 600 }}>
                          Auto-averaged
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="648"
                      value={creditScore}
                      onChange={(e) => setCreditScore(e.target.value)}
                      readOnly={averageCreditScore !== null}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{
                        background: averageCreditScore !== null ? `${theme.input}80` : theme.input,
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                        cursor: averageCreditScore !== null ? 'default' : undefined,
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: theme.textM }}>
                      {averageCreditScore !== null
                        ? 'Automatically calculated from your bureau scores below'
                        : 'Enter manually, or fill in bureau scores below for auto-average'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'TransUnion', val: scoreTransUnion, set: setScoreTransUnion },
                      { label: 'Equifax', val: scoreEquifax, set: setScoreEquifax },
                      { label: 'Experian', val: scoreExperian, set: setScoreExperian },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="block text-xs mb-1.5" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {label}
                        </label>
                        <input
                          type="number"
                          placeholder="—"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center"
                          style={{ background: theme.input, border: `1px solid ${theme.border}`, color: theme.text }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}
                >
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved!' : 'Save Credit Scores'}
                </button>
              </div>
            </>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: theme.text }} className="mb-2">Appearance</h2>
              <p className="text-sm mb-5" style={{ color: theme.textM }}>Choose a theme that matches your style</p>

              <div className="text-xs mb-3" style={{ color: theme.textM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Theme
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allThemes.map((t) => {
                  const active = themeId === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className="relative flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all hover:opacity-90"
                      style={{
                        background: active ? `${t.accent}12` : theme.input,
                        border: `2px solid ${active ? t.accent : theme.border}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 relative overflow-hidden"
                        style={{ background: t.accent }}
                      >
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-lg"
                          style={{ background: t.border }}
                        />
                      </div>
                      <span className="text-xs" style={{ fontWeight: 600, color: theme.text }}>
                        {t.name}
                      </span>
                      {active && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: t.accent }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <>
              <div className="rounded-2xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: theme.text }} className="mb-4">Privacy & Data</h2>
                <div
                  className="flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}
                >
                  🔒 Your data is encrypted and stored securely. We never share your information with third parties without explicit consent.
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: theme.bad, color: '#fff', fontWeight: 700 }}
                >
                  Reset All Data
                </button>
              </div>

              <button
                onClick={() => router.push('/auth/login')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm transition-all hover:opacity-90"
                style={{ background: theme.bad, color: '#fff', fontWeight: 700 }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              {/* Danger Zone */}
              <div
                className="rounded-2xl p-5"
                style={{ background: '#FFF5F5', border: '2px solid #FCA5A5' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" style={{ color: theme.bad }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.bad }}>Danger Zone</h2>
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: theme.bad }} />
                  <div>
                    <div style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>Permanently delete your account</div>
                    <div className="text-xs mt-0.5" style={{ color: theme.bad }}>
                      This will permanently remove your account and all associated data (bills, income, goals, expenses, credit scores, and rent history) across all devices. This action cannot be undone.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: theme.bad, color: '#fff', fontWeight: 700 }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Delete My Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reset Data Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
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
              <p style={{ color: theme.textM }} className="mb-6 text-sm">
                This action cannot be undone. All your settings and linked accounts will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold"
                  style={{ backgroundColor: theme.input, color: theme.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 py-2.5 rounded-xl font-semibold"
                  style={{ backgroundColor: theme.bad, color: '#ffffff' }}
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => { if (!isDeleting) { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError('') } }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full rounded-2xl p-8"
              style={{ backgroundColor: theme.card }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.bad}20` }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: theme.bad }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>Delete Account</h2>
              </div>

              <p style={{ color: theme.textM }} className="mb-4 text-sm">
                This will permanently delete your entire account, including all bills, income sources, expenses, savings goals, credit scores, and rent history. This cannot be undone.
              </p>

              <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
                Type <span style={{ color: theme.bad }}>DELETE</span> to confirm:
              </p>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                disabled={isDeleting}
                className="w-full px-3 py-2.5 rounded-xl mb-4"
                style={{
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  borderWidth: '1px',
                  color: theme.text,
                }}
                autoFocus
              />

              {deleteError && (
                <p className="text-sm mb-3" style={{ color: theme.bad }}>{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError('') }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-semibold"
                  style={{ backgroundColor: theme.input, color: theme.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: theme.bad, color: '#ffffff' }}
                >
                  {isDeleting ? (
                    <span className="animate-pulse">Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
