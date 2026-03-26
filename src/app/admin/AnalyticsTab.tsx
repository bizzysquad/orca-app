'use client'

import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, AlertTriangle, Activity } from 'lucide-react'
import { GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  analyticsData: { mrrGrowth: number; arrGrowth: number; churnRate: number; ltv: number }
}

export default function AnalyticsTab({ analyticsData }: Props) {
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
      transition: { duration: 0.5 },
    },
  }

  // Mock data for user growth
  const userGrowthData = [
    { month: 'Oct', value: 120 },
    { month: 'Nov', value: 245 },
    { month: 'Dec', value: 410 },
    { month: 'Jan', value: 580 },
    { month: 'Feb', value: 790 },
    { month: 'Mar', value: 1024 },
  ]

  // Mock data for feature usage
  const featureUsage = [
    { name: 'Dashboard', usage: 94 },
    { name: 'Smart Stack', usage: 78 },
    { name: 'Bill Boss', usage: 65 },
    { name: 'Stack Circle', usage: 42 },
    { name: 'Credit Score Tracker', usage: 55 },
  ]

  const maxUserGrowth = Math.max(...userGrowthData.map(d => d.value))

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Revenue Metrics */}
      <motion.div variants={itemVariants}>
        <h3 style={{ color: TEXT_PRIMARY }} className="text-xl font-bold mb-4">
          Revenue Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR Growth */}
          <motion.div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                MRR Growth
              </h4>
              <DollarSign size={20} style={{ color: GOLD }} />
            </div>
            <p style={{ color: TEXT_PRIMARY }} className="text-3xl font-bold">
              +45.2%
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
              Monthly recurring revenue
            </p>
          </motion.div>

          {/* ARR Growth */}
          <motion.div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                ARR Growth
              </h4>
              <TrendingUp size={20} style={{ color: GOLD }} />
            </div>
            <p style={{ color: TEXT_PRIMARY }} className="text-3xl font-bold">
              +52.1%
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
              Annual recurring revenue
            </p>
          </motion.div>

          {/* Churn Rate */}
          <motion.div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                Churn Rate
              </h4>
              <AlertTriangle size={20} style={{ color: GOLD }} />
            </div>
            <p style={{ color: TEXT_PRIMARY }} className="text-3xl font-bold">
              2.3%
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
              Monthly churn rate
            </p>
          </motion.div>

          {/* Avg LTV */}
          <motion.div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                Avg LTV
              </h4>
              <Activity size={20} style={{ color: GOLD }} />
            </div>
            <p style={{ color: TEXT_PRIMARY }} className="text-3xl font-bold">
              $160
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
              Average lifetime value
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* User Growth */}
      <motion.div variants={itemVariants}>
        <h3 style={{ color: TEXT_PRIMARY }} className="text-xl font-bold mb-4">
          User Growth (Last 6 Months)
        </h3>
        <div
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
          className="border rounded-lg p-6"
        >
          <div className="flex items-end justify-between h-64 gap-2">
            {userGrowthData.map((data, idx) => (
              <motion.div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2"
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
              >
                <motion.div
                  style={{
                    backgroundColor: GOLD,
                    height: `${(data.value / maxUserGrowth) * 100}%`,
                  }}
                  className="w-full rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.value / maxUserGrowth) * 100}%` }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.6 }}
                />
                <span style={{ color: TEXT_SECONDARY }} className="text-xs font-medium">
                  {data.month}
                </span>
                <span style={{ color: TEXT_MUTED }} className="text-xs">
                  {data.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Feature Usage */}
      <motion.div variants={itemVariants}>
        <h3 style={{ color: TEXT_PRIMARY }} className="text-xl font-bold mb-4">
          Feature Usage
        </h3>
        <div
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
          className="border rounded-lg p-6 space-y-6"
        >
          {featureUsage.map((feature, idx) => (
            <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.1 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">
                  {feature.name}
                </span>
                <span style={{ color: TEXT_SECONDARY }} className="text-sm font-bold">
                  {feature.usage}%
                </span>
              </div>
              <div
                style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
                className="border rounded-full h-2 overflow-hidden"
              >
                <motion.div
                  style={{ backgroundColor: GOLD }}
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${feature.usage}%` }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.8 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Conversion & Retention */}
      <motion.div variants={itemVariants}>
        <h3 style={{ color: TEXT_PRIMARY }} className="text-xl font-bold mb-4">
          Conversion & Retention
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Rates */}
          <div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
          >
            <h4 style={{ color: TEXT_PRIMARY }} className="font-bold mb-4">
              Conversion Rates
            </h4>
            <div className="space-y-4">
              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                    Trial → Active
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-bold">
                    62%
                  </span>
                </div>
                <div
                  style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
                  className="border rounded-full h-2 overflow-hidden"
                >
                  <motion.div
                    style={{ backgroundColor: GOLD }}
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '62%' }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                    Active → Premium
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-bold">
                    28%
                  </span>
                </div>
                <div
                  style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
                  className="border rounded-full h-2 overflow-hidden"
                >
                  <motion.div
                    style={{ backgroundColor: GOLD }}
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '28%' }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                    Overall
                  </span>
                  <span style={{ color: GOLD }} className="text-sm font-bold">
                    17%
                  </span>
                </div>
                <div
                  style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
                  className="border rounded-full h-2 overflow-hidden"
                >
                  <motion.div
                    style={{ backgroundColor: GOLD }}
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '17%' }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Platform Stats */}
          <div
            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
            className="border rounded-lg p-6"
          >
            <h4 style={{ color: TEXT_PRIMARY }} className="font-bold mb-4">
              Platform Stats
            </h4>
            <div className="space-y-4">
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: BG_DARK }}
              >
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  DAU
                </span>
                <span style={{ color: GOLD }} className="text-lg font-bold">
                  342
                </span>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: BG_DARK }}
              >
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  MAU
                </span>
                <span style={{ color: GOLD }} className="text-lg font-bold">
                  1,024
                </span>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: BG_DARK }}
              >
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  DAU/MAU
                </span>
                <span style={{ color: GOLD }} className="text-lg font-bold">
                  33.4%
                </span>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: BG_DARK }}
              >
                <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                  Avg Session
                </span>
                <span style={{ color: GOLD }} className="text-lg font-bold">
                  8.2 min
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
