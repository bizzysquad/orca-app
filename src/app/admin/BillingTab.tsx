'use client'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertTriangle, Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { AdminUser, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  activeSubTab: string | null
  users: AdminUser[]
  userStats: { total: number; active: number; trial: number; premium: number; founding: number; suspended: number }
  subscriptionStats: { trialCount: number; premiumCount: number; foundingCount: number; mrrEstimate: number; arrEstimate: number; churnRate: number; ltv: number }
  trialDuration: number
  setTrialDuration: (v: number) => void
  trialSlots: number
  setTrialSlots: (v: number) => void
  monthlyPrice: number
  setMonthlyPrice: (v: number) => void
  yearlyPrice: number
  setYearlyPrice: (v: number) => void
  stripeLive: boolean
  setStripeLive: (v: boolean) => void
  invoices: Array<{ id: string; user: string; amount: number; date: string; status: string }>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function BillingTab({
  activeSubTab,
  users,
  userStats,
  subscriptionStats,
  trialDuration,
  setTrialDuration,
  trialSlots,
  setTrialSlots,
  monthlyPrice,
  setMonthlyPrice,
  yearlyPrice,
  setYearlyPrice,
  stripeLive,
  setStripeLive,
  invoices,
}: Props) {
  return (
    <>
      {activeSubTab === 'subscription' && (
        <div className="space-y-6">
          {/* Trial Settings Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="mb-4 text-lg font-semibold">
              Trial Settings
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Trial Duration Input */}
              <div>
                <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                  Trial Duration (days)
                </label>
                <input
                  type="number"
                  value={trialDuration}
                  onChange={(e) => setTrialDuration(Number(e.target.value))}
                  style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              {/* Trial Slots Input */}
              <div>
                <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                  Trial Slots / Total
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trialSlots}
                    onChange={(e) => setTrialSlots(Number(e.target.value))}
                    style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                  <span style={{ color: TEXT_MUTED }} className="text-sm font-medium">
                    /{userStats.trial}
                  </span>
                </div>
              </div>

              {/* Trial Capacity Progress Bar */}
              <div>
                <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                  Capacity Used
                </label>
                <div style={{ backgroundColor: BG_DARK }} className="rounded p-3">
                  <div className="relative h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: BORDER_COLOR }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: GOLD }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((userStats.trial / trialSlots) * 100, 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs">
                    {Math.round((userStats.trial / trialSlots) * 100)}% used
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pricing Configuration Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold">
                Pricing Configuration
              </h3>
              <div className="flex items-center gap-2">
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  {stripeLive ? 'Live' : 'Test'} Mode
                </span>
                <button
                  onClick={() => setStripeLive(!stripeLive)}
                  style={{
                    backgroundColor: stripeLive ? GOLD : BORDER_COLOR,
                  }}
                  className="relative inline-flex h-6 w-11 rounded-full transition-colors"
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                      stripeLive ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Monthly Price Input */}
              <div>
                <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                  Monthly Price
                </label>
                <div className="relative">
                  <span style={{ color: TEXT_MUTED }} className="absolute left-3 top-2.5 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                    className="w-full rounded border px-3 py-2 pl-7 text-sm"
                    placeholder="0.00"
                  />
                  <span style={{ color: TEXT_MUTED }} className="absolute right-3 top-2.5 text-sm">
                    /mo
                  </span>
                </div>
              </div>

              {/* Yearly Price Input */}
              <div>
                <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                  Yearly Price
                </label>
                <div className="relative">
                  <span style={{ color: TEXT_MUTED }} className="absolute left-3 top-2.5 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                    style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                    className="w-full rounded border px-3 py-2 pl-7 text-sm"
                    placeholder="0.00"
                  />
                  <span style={{ color: TEXT_MUTED }} className="absolute right-3 top-2.5 text-sm">
                    /yr
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Conversion Funnel Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="mb-4 text-lg font-semibold">
              Conversion Funnel
            </h3>
            <div className="space-y-4">
              {/* Trial Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Free Trial Users
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {userStats.trial} ({Math.round((userStats.trial / userStats.total) * 100)}%)
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.trial / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Active Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Active Users
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {userStats.active} ({Math.round((userStats.active / userStats.total) * 100)}%)
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.active / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Premium Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Premium Users
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {userStats.premium} ({Math.round((userStats.premium / userStats.total) * 100)}%)
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.premium / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Founding Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Founding Members
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {userStats.founding} ({Math.round((userStats.founding / userStats.total) * 100)}%)
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.founding / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Revenue Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-4 gap-4"
          >
            {/* MRR Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    MRR
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    ${subscriptionStats.mrrEstimate.toLocaleString()}
                  </p>
                </div>
                <DollarSign style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* ARR Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    ARR
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    ${subscriptionStats.arrEstimate.toLocaleString()}
                  </p>
                </div>
                <TrendingUp style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* Churn Rate Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    Churn Rate
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    {subscriptionStats.churnRate.toFixed(2)}%
                  </p>
                </div>
                <AlertTriangle style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* LTV Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    LTV
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    ${subscriptionStats.ltv.toLocaleString()}
                  </p>
                </div>
                <Activity style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>
          </motion.div>

          {/* User Distribution by Plan */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="mb-4 text-lg font-semibold">
              User Distribution by Plan
            </h3>
            <div className="space-y-4">
              {/* Free Trial Distribution */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Free Trial
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {Math.round((userStats.trial / userStats.total) * 100)}%
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.trial / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Premium Distribution */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Premium
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {Math.round((userStats.premium / userStats.total) * 100)}%
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.premium / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Founding Member Distribution */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                    Founding Member
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-semibold">
                    {Math.round((userStats.founding / userStats.total) * 100)}%
                  </span>
                </div>
                <div style={{ backgroundColor: BORDER_COLOR }} className="relative h-3 w-full rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((userStats.founding / userStats.total) * 100, 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {activeSubTab === 'billing' && (
        <div className="space-y-6">
          {/* Billing Overview Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-4 gap-4"
          >
            {/* Total Revenue Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    Total Revenue
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    ${invoices.reduce((sum, inv) => (inv.status === 'paid' ? sum + inv.amount : sum), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* Paid Invoices Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    Paid Invoices
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    {invoices.filter((inv) => inv.status === 'paid').length}
                  </p>
                </div>
                <CheckCircle style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* Failed Invoices Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    Failed
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    {invoices.filter((inv) => inv.status === 'failed').length}
                  </p>
                </div>
                <XCircle style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>

            {/* Refunded Card */}
            <motion.div
              variants={itemVariants}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                    Refunded
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="mt-1 text-2xl font-bold">
                    {invoices.filter((inv) => inv.status === 'refunded').length}
                  </p>
                </div>
                <RefreshCw style={{ color: GOLD }} size={24} />
              </div>
            </motion.div>
          </motion.div>

          {/* Stripe Integration Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <div className="mb-4">
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold">
                Stripe Integration
              </h3>
              <div className="mt-3 flex items-center gap-2">
                <div
                  style={{ backgroundColor: stripeLive ? '#10b981' : '#6b7280' }}
                  className="h-3 w-3 rounded-full"
                />
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  {stripeLive ? 'Live Mode' : 'Test Mode'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Monthly Price Display */}
              <div style={{ backgroundColor: BG_DARK }} className="rounded p-4">
                <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                  Monthly Price
                </p>
                <p style={{ color: TEXT_PRIMARY }} className="mt-2 text-xl font-semibold">
                  ${monthlyPrice}/mo
                </p>
              </div>

              {/* Yearly Price Display */}
              <div style={{ backgroundColor: BG_DARK }} className="rounded p-4">
                <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                  Yearly Price
                </p>
                <p style={{ color: TEXT_PRIMARY }} className="mt-2 text-xl font-semibold">
                  ${yearlyPrice}/yr
                </p>
              </div>
            </div>
          </motion.div>

          {/* Invoice History Table */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="rounded-lg border p-6"
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="mb-4 text-lg font-semibold">
              Invoice History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottomColor: BORDER_COLOR }} className="border-b">
                    <th style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-left text-sm font-semibold">
                      Invoice ID
                    </th>
                    <th style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-left text-sm font-semibold">
                      User
                    </th>
                    <th style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-left text-sm font-semibold">
                      Amount
                    </th>
                    <th style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-left text-sm font-semibold">
                      Date
                    </th>
                    <th style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      variants={itemVariants}
                      style={{ borderBottomColor: BORDER_COLOR }}
                      className="border-b hover:opacity-80 transition-opacity"
                    >
                      <td style={{ color: TEXT_PRIMARY }} className="px-4 py-3 text-sm font-mono">
                        {invoice.id}
                      </td>
                      <td style={{ color: TEXT_PRIMARY }} className="px-4 py-3 text-sm">
                        {invoice.user}
                      </td>
                      <td style={{ color: TEXT_PRIMARY }} className="px-4 py-3 text-sm font-semibold">
                        ${invoice.amount.toLocaleString()}
                      </td>
                      <td style={{ color: TEXT_MUTED }} className="px-4 py-3 text-sm">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          style={{
                            backgroundColor:
                              invoice.status === 'paid'
                                ? '#10b981'
                                : invoice.status === 'failed'
                                  ? '#ef4444'
                                  : invoice.status === 'refunded'
                                    ? '#f59e0b'
                                    : BORDER_COLOR,
                            color: '#ffffff',
                          }}
                          className="inline-block rounded px-2 py-1 text-xs font-semibold capitalize"
                        >
                          {invoice.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
