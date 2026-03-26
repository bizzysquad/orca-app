'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Search, Eye } from 'lucide-react'
import { AdminUser, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  users: AdminUser[]
  supportFilteredUsers: AdminUser[]
  supportSearch: string
  setSupportSearch: (s: string) => void
  selectedSupportUser: string | null
  setSelectedSupportUser: (id: string | null) => void
  supportNotes: Record<string, string>
  setSupportNotes: (notes: Record<string, string>) => void
  newNote: string
  setNewNote: (note: string) => void
}

export default function SupportTab({
  users,
  supportFilteredUsers,
  supportSearch,
  setSupportSearch,
  selectedSupportUser,
  setSelectedSupportUser,
  supportNotes,
  setSupportNotes,
  newNote,
  setNewNote,
}: Props) {
  const selectedUser = selectedSupportUser ? users.find(u => u.id === selectedSupportUser) : null

  const handleSaveNote = () => {
    if (selectedSupportUser && newNote.trim()) {
      setSupportNotes({
        ...supportNotes,
        [selectedSupportUser]: newNote,
      })
      setNewNote('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: TEXT_SECONDARY }} />
        <input
          type="text"
          placeholder="Search users..."
          value={supportSearch}
          onChange={(e) => setSupportSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all"
          style={{
            backgroundColor: BG_CARD,
            borderColor: BORDER_COLOR,
            color: TEXT_PRIMARY,
          }}
        />
      </div>

      {/* Users List */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: BG_CARD,
          borderColor: BORDER_COLOR,
        }}
      >
        <div className="divide-y" style={{ borderColor: BORDER_COLOR }}>
          {supportFilteredUsers.map((user) => (
            <motion.button
              key={user.id}
              onClick={() => setSelectedSupportUser(selectedSupportUser === user.id ? null : user.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:opacity-80 transition-opacity text-left"
              style={{ backgroundColor: selectedSupportUser === user.id ? `${BG_DARK}99` : 'transparent' }}
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                  style={{
                    backgroundColor: GOLD,
                    color: BG_DARK,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: TEXT_PRIMARY }} className="font-semibold truncate">
                    {user.name}
                  </p>
                  <p style={{ color: TEXT_SECONDARY }} className="text-sm truncate">
                    {user.email}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: user.status === 'active' ? `${GOLD}33` : `${TEXT_MUTED}33`,
                      color: user.status === 'active' ? GOLD : TEXT_MUTED,
                    }}
                  >
                    {user.status}
                  </span>
                </div>
              </div>

              {/* Eye Icon */}
              <Eye className="w-5 h-5 ml-4 flex-shrink-0" style={{ color: GOLD }} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Expanded View */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border p-6"
            style={{
              backgroundColor: BG_CARD,
              borderColor: GOLD,
            }}
          >
            {/* Header */}
            <h3 style={{ color: TEXT_PRIMARY }} className="font-semibold text-lg mb-6">
              {selectedUser.name}
            </h3>

            {/* 4-Column Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Joined', value: selectedUser.joinDate || 'N/A' },
                { label: 'Last Active', value: selectedUser.lastActive || 'N/A' },
                { label: 'Credit Score', value: String(selectedUser.creditScore) || 'N/A' },
                { label: '2FA Status', value: selectedUser.twoFA ? 'Enabled' : 'Disabled' },
              ].map((item, idx) => (
                <div key={idx}>
                  <p style={{ color: TEXT_MUTED }} className="text-xs uppercase tracking-wider mb-2">
                    {item.label}
                  </p>
                  <p style={{ color: TEXT_PRIMARY }} className="font-semibold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Activity Log */}
            <div className="mb-8">
              <h4 style={{ color: TEXT_PRIMARY }} className="font-semibold mb-4">
                Activity Log
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedUser.activityLog && selectedUser.activityLog.length > 0 ? (
                  selectedUser.activityLog.map((activity, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 rounded"
                      style={{
                        backgroundColor: `${BG_DARK}99`,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      <p className="text-sm">{activity.action} — {activity.detail} ({activity.date})</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: TEXT_MUTED }} className="text-sm italic">
                    No activity logged
                  </p>
                )}
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h4 style={{ color: TEXT_PRIMARY }} className="font-semibold mb-4">
                Internal Notes
              </h4>

              {/* Existing Notes Display */}
              {supportNotes[selectedUser.id] && (
                <div
                  className="p-4 rounded-lg mb-4 border"
                  style={{
                    backgroundColor: `${GOLD}11`,
                    borderColor: GOLD,
                  }}
                >
                  <p style={{ color: TEXT_SECONDARY }} className="text-sm">
                    {supportNotes[selectedUser.id]}
                  </p>
                </div>
              )}

              {/* Note Input */}
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-4 py-2 rounded-lg border resize-none"
                  rows={3}
                  style={{
                    backgroundColor: BG_DARK,
                    borderColor: BORDER_COLOR,
                    color: TEXT_PRIMARY,
                  }}
                />
                <button
                  onClick={handleSaveNote}
                  className="px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: GOLD,
                    color: BG_DARK,
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
