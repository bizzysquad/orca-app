'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, CheckCircle, Clock, Crown, Star, Ban, Search, MoreHorizontal, XCircle, AlertTriangle } from 'lucide-react'
import { AdminUser, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  users: AdminUser[]
  filteredUsers: AdminUser[]
  userStats: { total: number; active: number; trial: number; premium: number; founding: number; suspended: number }
  searchQuery: string
  setSearchQuery: (q: string) => void
  statusFilter: string | null
  setStatusFilter: (f: string | null) => void
  showDropdown: string | null
  setShowDropdown: (id: string | null) => void
  handleUserAction: (userId: string, action: string) => void
}

export default function UsersTab(props: Props) {
  const {
    users,
    filteredUsers,
    userStats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showDropdown,
    setShowDropdown,
    handleUserAction,
  } = props

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: userStats.total, icon: Users, color: GOLD },
          { label: 'Active', value: userStats.active, icon: CheckCircle, color: '#10b981' },
          { label: 'Trial', value: `${userStats.trial}/500`, icon: Clock, color: '#f59e0b' },
          { label: 'Premium', value: userStats.premium, icon: Crown, color: '#8b5cf6' },
          { label: 'Founding', value: userStats.founding, icon: Star, color: GOLD },
          { label: 'Suspended', value: userStats.suspended, icon: Ban, color: '#ef4444' },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p style={{ color: TEXT_MUTED }} className="text-xs font-medium">
                  {stat.label}
                </p>
                <Icon size={16} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <Search
            size={18}
            style={{ color: TEXT_MUTED }}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: BG_CARD,
              borderColor: BORDER_COLOR,
              color: TEXT_PRIMARY,
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-0"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = GOLD
              e.currentTarget.style.boxShadow = `0 0 0 2px ${GOLD}44`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = BORDER_COLOR
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          style={{
            backgroundColor: BG_CARD,
            borderColor: BORDER_COLOR,
            color: TEXT_PRIMARY,
          }}
          className="px-4 py-2 rounded-lg border focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="premium">Premium</option>
          <option value="founding">Founding</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        className="rounded-lg border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: BG_DARK, borderBottomColor: BORDER_COLOR }} className="border-b">
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Name
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Status
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Plan
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  2FA
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Trial Days
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-left text-sm font-semibold">
                  Last Active
                </th>
                <th style={{ color: TEXT_MUTED }} className="px-6 py-4 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  style={{ borderBottomColor: BORDER_COLOR }}
                  className="border-b hover:bg-opacity-50 transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BG_DARK
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.status === 'founding' && <Star size={16} style={{ color: GOLD }} />}
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td style={{ color: TEXT_SECONDARY }} className="px-6 py-4 text-sm">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      style={{
                        backgroundColor:
                          user.status === 'active'
                            ? '#10b98144'
                            : user.status === 'trial'
                              ? '#f59e0b44'
                              : user.status === 'premium'
                                ? '#8b5cf644'
                                : user.status === 'founding'
                                  ? `${GOLD}44`
                                  : '#ef444444',
                        color:
                          user.status === 'active'
                            ? '#10b981'
                            : user.status === 'trial'
                              ? '#f59e0b'
                              : user.status === 'premium'
                                ? '#8b5cf6'
                                : user.status === 'founding'
                                  ? GOLD
                                  : '#ef4444',
                      }}
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize"
                    >
                      {user.status}
                    </span>
                  </td>
                  <td style={{ color: TEXT_SECONDARY }} className="px-6 py-4 text-sm">
                    {user.plan}
                  </td>
                  <td className="px-6 py-4">
                    {user.twoFA ? (
                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                    ) : (
                      <XCircle size={18} style={{ color: TEXT_MUTED }} />
                    )}
                  </td>
                  <td style={{ color: TEXT_SECONDARY }} className="px-6 py-4 text-sm">
                    {user.trialDaysLeft ? `${user.trialDaysLeft}d` : '-'}
                  </td>
                  <td style={{ color: TEXT_SECONDARY }} className="px-6 py-4 text-sm">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() =>
                          setShowDropdown(showDropdown === user.id ? null : user.id)
                        }
                        style={{ color: TEXT_SECONDARY }}
                        className="p-1 rounded-lg hover:bg-opacity-50 transition-colors"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = GOLD
                          e.currentTarget.style.backgroundColor = `${GOLD}11`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = TEXT_SECONDARY
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </motion.button>

                      <AnimatePresence>
                        {showDropdown === user.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                            className="absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-xl z-50"
                          >
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => handleUserAction(user.id, 'grant-premium')}
                                style={{ color: TEXT_PRIMARY, borderColor: BORDER_COLOR }}
                                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors border border-transparent hover:border-current"
                              >
                                Grant Premium
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, 'revoke-premium')}
                                style={{ color: TEXT_PRIMARY, borderColor: BORDER_COLOR }}
                                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors border border-transparent hover:border-current"
                              >
                                Revoke Premium
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, 'extend-trial')}
                                style={{ color: TEXT_PRIMARY, borderColor: BORDER_COLOR }}
                                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors border border-transparent hover:border-current"
                              >
                                Extend Trial (+10d)
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, 'reset-trial')}
                                style={{ color: TEXT_PRIMARY, borderColor: BORDER_COLOR }}
                                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors border border-transparent hover:border-current"
                              >
                                Reset Trial (40d)
                              </button>
                              <div style={{ borderTopColor: BORDER_COLOR }} className="my-1 border-t" />
                              {user.status === 'suspended' ? (
                                <button
                                  onClick={() => handleUserAction(user.id, 'reactivate')}
                                  style={{ color: '#10b981' }}
                                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserAction(user.id, 'suspend')}
                                  style={{ color: '#ef4444' }}
                                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p style={{ color: TEXT_MUTED }} className="text-sm">
        Showing {filteredUsers.length} of {users.length} users
      </p>
    </div>
  )
}
