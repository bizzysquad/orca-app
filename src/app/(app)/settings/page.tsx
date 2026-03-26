'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Home,
  Building2,
} from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import type { EmploymentType } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const { data, loading } = useOrcaData()
  const user = data.user
  const { isDark, setIsDark, theme } = useTheme()

  // Personal info edit state
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)

  // Employment type
  const [employmentType, setEmploymentType] = useState<EmploymentType>(user.employmentType || 'employed')

  // Employed income state
  const [grossIncome, setGrossIncome] = useState(String(user.grossIncome || ''))
  const [netIncome, setNetIncome] = useState(String(user.netIncome || ''))
  const [payRate, setPayRate] = useState(user.payRate)
  const [hoursPerDay, setHoursPerDay] = useState(user.hoursPerDay)
  const [payFreq, setPayFreq] = useState(user.payFreq)

  // Self-employed income state
  const [dailyIncome, setDailyIncome] = useState(String(user.dailyIncome || ''))
  const [weeklyIncome, setWeeklyIncome] = useState(String(user.weeklyIncome || ''))
  const [manualCash, setManualCash] = useState(String(user.manualCashInput || ''))
  const [selfEmployedMethod, setSelfEmployedMethod] = useState<'daily' | 'weekly' | 'manual'>(
    user.selfEmployedInputMethod || 'weekly'
  )

  // Rent config
  const [rentAmount, setRentAmount] = useState(String(user.rentAmount || ''))

  // Credit score
  const [creditScore, setCreditScore] = useState(String(user.creditScore || ''))

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  // Handlers
  const handleSaveName = () => setEditingName(false)
  const handleSaveEmail = () => setEditingEmail(false)

  const handleSaveIncome = () => {
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

        {/* 2. Employment Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>
            Employment Type
          </h2>
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            <div className="flex gap-3">
              <button
                onClick={() => setEmploymentType('employed')}
                className="flex-1 py-4 rounded-lg font-semibold transition-all flex flex-col items-center gap-2"
                style={{
                  backgroundColor: employmentType === 'employed' ? gold : isDark ? '#27272a' : '#e4e4e0',
                  color: employmentType === 'employed' ? (isDark ? '#09090b' : '#ffffff') : textS,
                }}
              >
                <Building2 className="w-5 h-5" />
                Employed
              </button>
              <button
                onClick={() => setEmploymentType('self-employed')}
                className="flex-1 py-4 rounded-lg font-semibold transition-all flex flex-col items-center gap-2"
                style={{
                  backgroundColor: employmentType === 'self-employed' ? gold : isDark ? '#27272a' : '#e4e4e0',
                  color: employmentType === 'self-employed' ? (isDark ? '#09090b' : '#ffffff') : textS,
                }}
              >
                <Briefcase className="w-5 h-5" />
                Self-Employed
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: textM }}>
              {employmentType === 'employed'
                ? 'Standard paycheck-based income with hourly rate and pay frequency.'
                : 'Flexible income entry — daily, weekly, or manual cash flow tracking.'}
            </p>
          </div>
        </motion.div>

        {/* 3. Income & Pay Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: text }}>
            {employmentType === 'self-employed' ? 'Cash Flow Settings' : 'Income & Pay'}
          </h2>
          <div
            className="rounded-lg p-6 space-y-5"
            style={{ backgroundColor: card, borderColor: border, borderWidth: '1px' }}
          >
            {employmentType === 'employed' ? (
              <>
                {/* Gross Income */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                    Gross Income (per pay period)
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" style={{ color: textM }} />
                    <input
                      type="number"
                      value={grossIncome}
                      onChange={e => setGrossIncome(e.target.value)}
                      placeholder="e.g., 4940"
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
                    Your total earnings before taxes and deductions
                  </p>
                </div>

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
                    Your take-home pay after taxes — used for budgeting calculations
                  </p>
                </div>

                <div style={{ borderTop: `1px solid ${border}`, marginTop: '8px', marginBottom: '8px' }} />

                {/* Pay Frequency */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                    Pay Frequency
                  </label>
                  <select
                    value={payFreq}
                    onChange={e => setPayFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                      borderColor: border,
                      borderWidth: '1px',
                      color: text,
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
                    <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                      Hourly Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <span style={{ color: textM }}>$</span>
                      <input
                        type="number"
                        value={payRate}
                        onChange={e => setPayRate(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                          borderColor: border,
                          borderWidth: '1px',
                          color: text,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
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
                        backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                        borderColor: border,
                        borderWidth: '1px',
                        color: text,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Self-Employed Income Input Method */}
                <div>
                  <label className="text-sm font-medium mb-3 block" style={{ color: textS }}>
                    Income Input Method
                  </label>
                  <div className="flex gap-2">
                    {(['daily', 'weekly', 'manual'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => setSelfEmployedMethod(method)}
                        className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-all"
                        style={{
                          backgroundColor: selfEmployedMethod === method ? gold : isDark ? '#27272a' : '#f4f4f2',
                          color: selfEmployedMethod === method ? (isDark ? '#09090b' : '#ffffff') : textS,
                        }}
                      >
                        {method === 'daily' ? 'Daily' : method === 'weekly' ? 'Weekly' : 'Cash'}
                      </button>
                    ))}
                  </div>
                </div>

                {selfEmployedMethod === 'daily' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                      Average Daily Income
                    </label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: '#22c55e' }} />
                      <input
                        type="number"
                        value={dailyIncome}
                        onChange={e => setDailyIncome(e.target.value)}
                        placeholder="e.g., 250"
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
                      Your typical daily earnings — used to project weekly/monthly income
                    </p>
                  </div>
                )}

                {selfEmployedMethod === 'weekly' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                      Average Weekly Income
                    </label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: '#22c55e' }} />
                      <input
                        type="number"
                        value={weeklyIncome}
                        onChange={e => setWeeklyIncome(e.target.value)}
                        placeholder="e.g., 1500"
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
                      Your typical weekly earnings — used for all platform calculations
                    </p>
                  </div>
                )}

                {selfEmployedMethod === 'manual' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                      Manual Cash Flow
                    </label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: '#d4a843' }} />
                      <input
                        type="number"
                        value={manualCash}
                        onChange={e => setManualCash(e.target.value)}
                        placeholder="e.g., 5000"
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
                      Enter your current cash on hand — manually update as you earn
                    </p>
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${border}`, marginTop: '8px', marginBottom: '8px' }} />

                {/* Pay Frequency for self-employed (for projection purposes) */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                    Projection Period
                  </label>
                  <select
                    value={payFreq}
                    onChange={e => setPayFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: isDark ? '#27272a' : '#f4f4f2',
                      borderColor: border,
                      borderWidth: '1px',
                      color: text,
                    }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </>
            )}

            <div style={{ borderTop: `1px solid ${border}`, marginTop: '8px', marginBottom: '8px' }} />

            {/* Rent Amount Config */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: textS }}>
                <Home className="w-4 h-4 inline mr-1" />
                Monthly Rent Amount
              </label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: textM }} />
                <input
                  type="number"
                  value={rentAmount}
                  onChange={e => setRentAmount(e.target.value)}
                  placeholder="e.g., 1400"
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
                Used for Rent Tracker in Bill Boss and Smart Stack
              </p>
            </div>

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
                backgroundColor: isDark ? gold : (isDark ? '#27272a' : '#e4e4e0'),
                color: isDark ? '#09090b' : textS,
              }}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setIsDark(false)}
              className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: !isDark ? gold : (isDark ? '#27272a' : '#e4e4e0'),
                color: !isDark ? '#ffffff' : textS,
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
