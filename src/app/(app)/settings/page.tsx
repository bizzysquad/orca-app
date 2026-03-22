'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Shield,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Save,
  DollarSign,
  Briefcase,
} from 'lucide-react'
import { getDemoData } from '@/lib/demo-data'
import { fmt } from '@/lib/utils'

export default function SettingsPage() {
  const demoData = getDemoData()
  const user = demoData.user

  // Personal info edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Income state
  const [grossIncome, setGrossIncome] = useState(String(user.grossIncome || ''))
  const [netIncome, setNetIncome] = useState(String(user.netIncome || ''))
  const [payRate, setPayRate] = useState(user.payRate)
  const [hoursPerDay, setHoursPerDay] = useState(user.hoursPerDay)
  const [payFreq, setPayFreq] = useState(user.payFreq)
  const [editingIncome, setEditingIncome] = useState(false)
  const [creditScore, setCreditScore] = useState(String(user.creditScore || ''))

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Handlers
  const handleSaveName = () => {
    setEditingName(false)
  }

  const handleSaveEmail = () => {
    setEditingEmail(false)
  }

  const handleSaveIncome = () => {
    setEditingIncome(false)
  }

  const handleResetData = () => {
    setShowResetConfirm(false)
  }

  // Calculate effective income for display
  const effectiveIncome = netIncome ? parseFloat(netIncome) : (grossIncome ? parseFloat(grossIncome) : 0)

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

        {/* 2. Income & Pay Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#fafafa' }}>
            Income & Pay
          </h2>
          <div
            className="rounded-lg p-6 space-y-5"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
              borderWidth: '1px',
            }}
          >
            {/* Gross Income */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
                Gross Income (per pay period)
              </label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: '#71717a' }} />
                <input
                  type="number"
                  value={grossIncome}
                  onChange={e => setGrossIncome(e.target.value)}
                  placeholder="e.g., 4940"
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: '#27272a',
                    borderColor: '#27272a',
                    borderWidth: '1px',
                    color: '#fafafa',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: '#71717a' }}>
                Your total earnings before taxes and deductions
              </p>
            </div>

            {/* Net Income */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
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
                    backgroundColor: '#27272a',
                    borderColor: '#27272a',
                    borderWidth: '1px',
                    color: '#fafafa',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: '#71717a' }}>
                Your take-home pay after taxes — used for budgeting calculations
              </p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #27272a', marginTop: '8px', marginBottom: '8px' }} />

            {/* Pay Frequency */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
                Pay Frequency
              </label>
              <select
                value={payFreq}
                onChange={e => setPayFreq(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: '#27272a',
                  borderColor: '#27272a',
                  borderWidth: '1px',
                  color: '#fafafa',
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="semimonthly">Semi-Monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Hourly Rate & Hours/Day */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: '#a1a1aa' }}
                >
                  Hourly Rate
                </label>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#71717a' }}>$</span>
                  <input
                    type="number"
                    value={payRate}
                    onChange={e => setPayRate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      borderColor: '#27272a',
                      borderWidth: '1px',
                      color: '#fafafa',
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: '#a1a1aa' }}
                >
                  Hours/Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={hoursPerDay}
                  onChange={e => setHoursPerDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: '#27272a',
                    borderColor: '#27272a',
                    borderWidth: '1px',
                    color: '#fafafa',
                  }}
                />
              </div>
            </div>

            {/* Credit Score */}
            <div>
              <label
                className="text-sm font-medium mb-2 block"
                style={{ color: '#a1a1aa' }}
              >
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
                  backgroundColor: '#27272a',
                  borderColor: '#27272a',
                  borderWidth: '1px',
                  color: '#fafafa',
                }}
              />
              <p className="text-xs mt-1" style={{ color: '#71717a' }}>
                Your current credit score (300-850)
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveIncome}
              className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#d4a843',
                color: '#09090b',
              }}
            >
              <Save className="w-4 h-4" />
              Save Income Settings
            </button>
          </div>
        </motion.div>

        {/* 3. Appearance */}
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

        {/* 4. Personal Info */}
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

        {/* 5. Privacy & Data */}
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

        {/* 8. Sign Out */}
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
