'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Shield,
  Link2,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Cloud,
  Save,
} from 'lucide-react'
import { getDemoData } from '@/lib/demo-data'
import { fmt } from '@/lib/utils'

export default function SettingsPage() {
  const demoData = getDemoData()
  const user = demoData.user
  const plaidData = demoData.plaid

  // Personal info edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Plaid connect flow state
  const [plaidStep, setPlaidStep] = useState<number | null>(null)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const banks = [
    { id: 'chase', name: 'Chase', logo: '🏦' },
    { id: 'bofa', name: 'Bank of America', logo: '🏦' },
    { id: 'wellsfargo', name: 'Wells Fargo', logo: '🏦' },
    { id: 'ally', name: 'Ally Bank', logo: '🏦' },
    { id: 'capitalone', name: 'Capital One', logo: '🏦' },
    { id: 'citi', name: 'Citibank', logo: '🏦' },
  ]

  // Handlers
  const handleSaveName = () => {
    setEditingName(false)
  }

  const handleSaveEmail = () => {
    setEditingEmail(false)
  }

  const handleStartPlaidConnect = () => {
    setPlaidStep(1)
  }

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId)
    setPlaidStep(2)
  }

  const handlePlaidNext = () => {
    if (plaidStep === 2) {
      setPlaidStep(3)
    } else if (plaidStep === 3) {
      setPlaidStep(4)
    }
  }

  const handleDisconnectBank = () => {
    setPlaidStep(null)
  }

  const handleResetData = () => {
    setShowResetConfirm(false)
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#09090b' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 backdrop-blur border-b"
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.95)',
          borderColor: '#27272a',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold" style={{ color: '#fafafa' }}>
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
          style={{
            backgroundColor: '#18181b',
            borderColor: '#27272a',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#d4a843', color: '#09090b' }}
            >
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: '#fafafa' }}>
                {user.name}
              </div>
              <div style={{ color: '#a1a1aa' }}>{user.email}</div>
            </div>
          </div>
        </motion.div>

        {/* 2. Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#fafafa' }}>
            Appearance
          </h2>
          <div
            className="rounded-lg p-6 flex gap-4"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
              borderWidth: '1px',
            }}
          >
            <button
              onClick={() => setTheme('dark')}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme === 'dark' ? '#d4a843' : '#27272a',
                color: theme === 'dark' ? '#09090b' : '#a1a1aa',
              }}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme === 'light' ? '#d4a843' : '#27272a',
                color: theme === 'light' ? '#09090b' : '#a1a1aa',
              }}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
          </div>
        </motion.div>

        {/* 3. Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#fafafa' }}>
            Personal Information
          </h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
              borderWidth: '1px',
            }}
          >
            {/* Name */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
                Full Name
              </label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      borderColor: '#27272a',
                      borderWidth: '1px',
                      color: '#fafafa',
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{
                      backgroundColor: '#d4a843',
                      color: '#09090b',
                    }}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{
                    backgroundColor: '#27272a',
                    color: '#fafafa',
                  }}
                >
                  {editName}
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm"
                    style={{ color: '#d4a843' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
                Email Address
              </label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <input
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      borderColor: '#27272a',
                      borderWidth: '1px',
                      color: '#fafafa',
                    }}
                  />
                  <button
                    onClick={handleSaveEmail}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
                    style={{
                      backgroundColor: '#d4a843',
                      color: '#09090b',
                    }}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg flex items-center justify-between"
                  style={{
                    backgroundColor: '#27272a',
                    color: '#fafafa',
                  }}
                >
                  {editEmail}
                  <button
                    onClick={() => setEditingEmail(true)}
                    className="text-sm"
                    style={{ color: '#d4a843' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 4. Linked Accounts (Plaid) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#fafafa' }}>
            Linked Bank Accounts
          </h2>

          {plaidData?.connected ? (
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
                borderWidth: '1px',
              }}
            >
              {/* Connected Card */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#22c55e' }}
                />
                <span className="font-semibold" style={{ color: '#22c55e' }}>
                  Bank Connected
                </span>
              </div>
              <p
                className="text-sm mb-4"
                style={{ color: '#a1a1aa' }}
              >
                {plaidData?.accounts?.length || 0} account(s) linked • Last synced{' '}
                {plaidData?.lastSync ? new Date(plaidData.lastSync).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A'}
              </p>

              {/* Accounts List */}
              <div className="space-y-3 mb-6">
                {plaidData?.accounts?.map((account: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div style={{ color: '#fafafa' }}>{account.name}</div>
                        <div style={{ color: '#71717a' }} className="text-sm">
                          {account.type === 'checking'
                            ? 'Checking'
                            : account.type === 'savings'
                            ? 'Savings'
                            : 'Credit'}{' '}
                          • ••••{account.mask}
                        </div>
                      </div>
                      <div style={{ color: '#d4a843' }} className="font-semibold">
                        {fmt(account.balance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleDisconnectBank}
                className="w-full py-2 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fafafa',
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div
              className="rounded-lg p-6 border-2"
              style={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
                borderStyle: 'dashed',
              }}
            >
              <div className="flex flex-col items-center gap-3 mb-6">
                <Link2 className="w-8 h-8" style={{ color: '#a1a1aa' }} />
                <h3 className="text-lg font-semibold" style={{ color: '#fafafa' }}>
                  Link Your Bank
                </h3>
                <p style={{ color: '#a1a1aa' }} className="text-sm text-center">
                  Connect your bank account to see your balance and transactions
                </p>
              </div>
              <button
                onClick={handleStartPlaidConnect}
                className="w-full py-3 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: '#d4a843',
                  color: '#09090b',
                }}
              >
                Connect Bank Account
              </button>
            </div>
          )}
        </motion.div>

        {/* 5. Cloud Sync Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg p-6 flex items-center gap-3"
          style={{
            backgroundColor: '#18181b',
            borderColor: '#27272a',
            borderWidth: '1px',
          }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#22c55e' }}
          />
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: '#22c55e' }}>
              Connected to Cloud
            </h3>
            <p style={{ color: '#a1a1aa' }} className="text-sm">
              Your settings sync across all devices
            </p>
          </div>
          <Cloud className="w-5 h-5" style={{ color: '#22c55e' }} />
        </motion.div>

        {/* 6. Privacy & Data */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#fafafa' }}>
            Privacy & Data
          </h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
              borderWidth: '1px',
            }}
          >
            <div style={{ color: '#a1a1aa' }} className="text-sm">
              <Shield className="w-4 h-4 inline mr-2" style={{ color: '#d4a843' }} />
              Your data is encrypted and stored securely. We never share your information with
              third parties without explicit consent.
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: '#ef4444',
                color: '#fafafa',
              }}
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
            className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#ef4444',
              color: '#fafafa',
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>

      {/* Plaid Connect Flow Modal */}
      <AnimatePresence>
        {plaidStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setPlaidStep(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: '#18181b' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Step 1: Bank Selection */}
              {plaidStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>
                      Select Your Bank
                    </h2>
                    <p style={{ color: '#a1a1aa' }}>
                      Choose your financial institution
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {banks.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => handleBankSelect(bank.id)}
                        className="p-4 rounded-lg font-semibold transition-all border"
                        style={{
                          backgroundColor: '#27272a',
                          borderColor: '#27272a',
                          color: '#fafafa',
                        }}
                      >
                        <div className="text-2xl mb-2">{bank.logo}</div>
                        <div className="text-sm">{bank.name}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPlaidStep(null)}
                    className="w-full py-2 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      color: '#a1a1aa',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Step 2: Credentials */}
              {plaidStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>
                      Enter Credentials
                    </h2>
                    <p style={{ color: '#a1a1aa' }}>
                      Sandbox mode - pre-filled credentials
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label style={{ color: '#a1a1aa' }} className="text-sm block mb-1">
                        Username
                      </label>
                      <input
                        value="user_good"
                        readOnly
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: '#27272a',
                          color: '#fafafa',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#a1a1aa' }} className="text-sm block mb-1">
                        Password
                      </label>
                      <input
                        value="pass_good"
                        readOnly
                        type="password"
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: '#27272a',
                          color: '#fafafa',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePlaidNext}
                    className="w-full py-3 rounded-lg font-semibold"
                    style={{
                      backgroundColor: '#d4a843',
                      color: '#09090b',
                    }}
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => setPlaidStep(null)}
                    className="w-full py-2 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      color: '#a1a1aa',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Step 3: Loading */}
              {plaidStep === 3 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>
                      Connecting...
                    </h2>
                  </div>
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <div
                        className="w-12 h-12 rounded-full border-4 border-transparent border-t-4"
                        style={{
                          borderTopColor: '#d4a843',
                          borderRightColor: 'rgba(212, 168, 67, 0.2)',
                          borderBottomColor: 'rgba(212, 168, 67, 0.2)',
                          borderLeftColor: 'rgba(212, 168, 67, 0.2)',
                        }}
                      />
                    </motion.div>
                  </div>
                  <p style={{ color: '#a1a1aa' }}>
                    Authenticating with your bank...
                  </p>
                  <button
                    onClick={() => handlePlaidNext()}
                    className="w-full py-2 text-sm"
                    style={{
                      backgroundColor: '#27272a',
                      color: '#a1a1aa',
                    }}
                  >
                    Simulating connection...
                  </button>
                </div>
              )}

              {/* Step 4: Success */}
              {plaidStep === 4 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>
                      Connected!
                    </h2>
                    <p style={{ color: '#a1a1aa' }}>
                      Your bank account is now linked
                    </p>
                  </div>
                  <div className="text-4xl">✓</div>
                  <div className="space-y-2">
                    <div style={{ color: '#fafafa' }}>
                      <strong>Checking</strong> • ...1234
                    </div>
                    <div style={{ color: '#a1a1aa' }} className="text-sm">
                      Balance: $5,234.56
                    </div>
                  </div>
                  <button
                    onClick={() => setPlaidStep(null)}
                    className="w-full py-3 rounded-lg font-semibold"
                    style={{
                      backgroundColor: '#d4a843',
                      color: '#09090b',
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              style={{ backgroundColor: '#18181b' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2" style={{ color: '#fafafa' }}>
                Reset All Data?
              </h2>
              <p style={{ color: '#a1a1aa' }} className="mb-6">
                This action cannot be undone. All your settings and linked accounts will be
                permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: '#27272a',
                    color: '#fafafa',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fafafa',
                  }}
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
