'use client'

import { motion } from 'framer-motion'
import { Lock, Activity, Ban, Key, Trash2 } from 'lucide-react'
import { AdminUser, AdminRole, AuditEntry, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  users: AdminUser[]
  userStats: { total: number; active: number; trial: number; premium: number; founding: number; suspended: number }
  adminRoles: AdminRole[]
  setAdminRoles: (roles: AdminRole[]) => void
  auditLog: AuditEntry[]
  newRoleName: string
  setNewRoleName: (name: string) => void
  twoFARequired: boolean
  setTwoFARequired: (v: boolean) => void
  sessionTimeout: number
  setSessionTimeout: (v: number) => void
  ipWhitelist: string
  setIpWhitelist: (v: string) => void
  fraudMonitoring: boolean
  setFraudMonitoring: (v: boolean) => void
  handleAddRole: () => void
}

export default function SecurityTab({
  users,
  userStats,
  adminRoles,
  setAdminRoles,
  auditLog,
  newRoleName,
  setNewRoleName,
  twoFARequired,
  setTwoFARequired,
  sessionTimeout,
  setSessionTimeout,
  ipWhitelist,
  setIpWhitelist,
  fraudMonitoring,
  setFraudMonitoring,
  handleAddRole,
}: Props) {
  const twoFAAdoptionRate = userStats.total > 0 ? Math.round((users.filter(u => u.twoFA).length / userStats.total) * 100) : 0
  const activeSessions = users.filter(u => u.lastActive && new Date().getTime() - new Date(u.lastActive).getTime() < 3600000).length

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg border"
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        >
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">2FA Adoption</p>
            <Lock size={18} style={{ color: GOLD }} />
          </div>
          <p style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold">{twoFAAdoptionRate}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-lg border"
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        >
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">Active Sessions</p>
            <Activity size={18} style={{ color: GOLD }} />
          </div>
          <p style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold">{activeSessions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-lg border"
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        >
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">Suspended</p>
            <Ban size={18} style={{ color: GOLD }} />
          </div>
          <p style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold">{userStats.suspended}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-lg border"
          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        >
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">Admin Roles</p>
            <Key size={18} style={{ color: GOLD }} />
          </div>
          <p style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold">{adminRoles.length}</p>
        </motion.div>
      </div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-lg border"
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
      >
        <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-6">Security Settings</h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Require 2FA */}
          <div>
            <label style={{ color: TEXT_PRIMARY }} className="block text-sm font-medium mb-2">
              Require 2FA for All Admins
            </label>
            <button
              onClick={() => setTwoFARequired(!twoFARequired)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                twoFARequired ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  twoFARequired ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Fraud Monitoring */}
          <div>
            <label style={{ color: TEXT_PRIMARY }} className="block text-sm font-medium mb-2">
              Fraud Monitoring
            </label>
            <button
              onClick={() => setFraudMonitoring(!fraudMonitoring)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                fraudMonitoring ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  fraudMonitoring ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Session Timeout */}
          <div>
            <label style={{ color: TEXT_PRIMARY }} className="block text-sm font-medium mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 30)}
              min="5"
              max="480"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
            />
          </div>

          {/* IP Whitelist */}
          <div>
            <label style={{ color: TEXT_PRIMARY }} className="block text-sm font-medium mb-2">
              IP Whitelist (comma-separated)
            </label>
            <input
              type="text"
              value={ipWhitelist}
              onChange={(e) => setIpWhitelist(e.target.value)}
              placeholder="192.168.1.1, 10.0.0.1"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
            />
          </div>
        </div>
      </motion.div>

      {/* Admin Roles */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="p-6 rounded-lg border"
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
      >
        <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-6">Admin Roles</h3>

        <div className="space-y-3 mb-6">
          {adminRoles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded border"
              style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
            >
              <div className="flex-1">
                <p style={{ color: TEXT_PRIMARY }} className="font-medium">{role.name}</p>
                <div className="flex gap-2 mt-2">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 text-xs rounded"
                      style={{ backgroundColor: GOLD + '20', color: GOLD }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
              {role.name !== 'super' && (
                <button
                  onClick={() => setAdminRoles(adminRoles.filter(r => r.id !== role.id))}
                  className="ml-4 p-2 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
                >
                  <Trash2 size={18} style={{ color: '#EF4444' }} />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Enter new role name"
            className="flex-1 px-3 py-2 rounded border text-sm"
            style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
            onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
          />
          <button
            onClick={handleAddRole}
            className="px-4 py-2 rounded font-medium text-sm transition-colors hover:opacity-90"
            style={{ backgroundColor: GOLD, color: BG_DARK }}
          >
            Add Role
          </button>
        </div>
      </motion.div>

      {/* Audit Log */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="p-6 rounded-lg border"
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
      >
        <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-6">Audit Log</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottomColor: BORDER_COLOR }} className="border-b">
                <th style={{ color: TEXT_SECONDARY }} className="text-left py-3 px-4 font-medium">Admin</th>
                <th style={{ color: TEXT_SECONDARY }} className="text-left py-3 px-4 font-medium">Action</th>
                <th style={{ color: TEXT_SECONDARY }} className="text-left py-3 px-4 font-medium">Target</th>
                <th style={{ color: TEXT_SECONDARY }} className="text-left py-3 px-4 font-medium">Timestamp</th>
                <th style={{ color: TEXT_SECONDARY }} className="text-left py-3 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 + idx * 0.05 }}
                  style={{ borderBottomColor: BORDER_COLOR }}
                  className="border-b hover:bg-opacity-50 transition-colors"
                >
                  <td style={{ color: TEXT_PRIMARY }} className="py-3 px-4">{entry.admin}</td>
                  <td style={{ color: TEXT_PRIMARY }} className="py-3 px-4">{entry.action}</td>
                  <td style={{ color: TEXT_PRIMARY }} className="py-3 px-4">{entry.target}</td>
                  <td style={{ color: TEXT_SECONDARY }} className="py-3 px-4 text-xs">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ color: TEXT_MUTED }} className="py-3 px-4 text-xs">{entry.details}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
