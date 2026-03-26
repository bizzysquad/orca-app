'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Send, XCircle, Edit3, Mail, Smartphone, MessageSquare } from 'lucide-react'
import { Notification, NotifTemplate, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  notifications: Notification[]
  notifTemplates: NotifTemplate[]
  setNotifTemplates: (templates: NotifTemplate[]) => void
  editingTemplateId: string | null
  setEditingTemplateId: (id: string | null) => void
}

export default function NotificationsTab({
  notifications,
  notifTemplates,
  setNotifTemplates,
  editingTemplateId,
  setEditingTemplateId,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Templates', value: notifTemplates.length, icon: FileText, color: GOLD },
          { label: 'Sent Today', value: notifications.filter((n) => n.status === 'sent').length, icon: Send, color: '#10b981' },
          { label: 'Failed', value: notifications.filter((n) => n.status === 'failed').length, icon: XCircle, color: '#ef4444' },
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

      {/* Notification Templates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        className="rounded-lg border p-6"
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>
          Notification Templates
        </h2>
        <div className="space-y-3">
          {notifTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium" style={{ color: TEXT_PRIMARY }}>
                    {tmpl.name}
                  </span>
                  <span
                    style={{
                      backgroundColor:
                        tmpl.channel === 'email'
                          ? '#3b82f622'
                          : tmpl.channel === 'push'
                            ? '#f59e0b22'
                            : '#10b98122',
                      color:
                        tmpl.channel === 'email'
                          ? '#3b82f6'
                          : tmpl.channel === 'push'
                            ? '#f59e0b'
                            : '#10b981',
                    }}
                    className="text-xs px-2 py-0.5 rounded-full capitalize"
                  >
                    {tmpl.channel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() =>
                      setNotifTemplates(
                        notifTemplates.map((t) =>
                          t.id === tmpl.id ? { ...t, enabled: !t.enabled } : t
                        )
                      )
                    }
                    style={{
                      backgroundColor: tmpl.enabled ? '#10b98144' : BORDER_COLOR,
                      borderColor: tmpl.enabled ? '#10b981' : BORDER_COLOR,
                      color: tmpl.enabled ? '#10b981' : TEXT_MUTED,
                    }}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                  >
                    {tmpl.enabled ? 'Active' : 'Off'}
                  </motion.button>
                  <button
                    onClick={() =>
                      setEditingTemplateId(editingTemplateId === tmpl.id ? null : tmpl.id)
                    }
                    style={{ color: GOLD }}
                    className="p-1 hover:opacity-70"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {editingTemplateId === tmpl.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="pt-3 space-y-3"
                      style={{ borderTopColor: BORDER_COLOR, borderTopWidth: 1 }}
                    >
                      <div>
                        <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={tmpl.subject}
                          onChange={(e) =>
                            setNotifTemplates(
                              notifTemplates.map((t) =>
                                t.id === tmpl.id ? { ...t, subject: e.target.value } : t
                              )
                            )
                          }
                          style={{
                            backgroundColor: BG_CARD,
                            borderColor: BORDER_COLOR,
                            color: TEXT_PRIMARY,
                          }}
                          className="w-full px-3 py-2 rounded-lg border focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">
                          Body
                        </label>
                        <textarea
                          value={tmpl.body}
                          onChange={(e) =>
                            setNotifTemplates(
                              notifTemplates.map((t) =>
                                t.id === tmpl.id ? { ...t, body: e.target.value } : t
                              )
                            )
                          }
                          rows={2}
                          style={{
                            backgroundColor: BG_CARD,
                            borderColor: BORDER_COLOR,
                            color: TEXT_PRIMARY,
                          }}
                          className="w-full px-3 py-2 rounded-lg border focus:outline-none text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">
                          Channel
                        </label>
                        <select
                          value={tmpl.channel}
                          onChange={(e) =>
                            setNotifTemplates(
                              notifTemplates.map((t) =>
                                t.id === tmpl.id ? { ...t, channel: e.target.value } : t
                              )
                            )
                          }
                          style={{
                            backgroundColor: BG_CARD,
                            borderColor: BORDER_COLOR,
                            color: TEXT_PRIMARY,
                          }}
                          className="w-full px-3 py-2 rounded-lg border focus:outline-none text-sm"
                        >
                          <option value="email">Email</option>
                          <option value="push">Push</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sent History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
        className="rounded-lg border p-6"
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>
          Sent History
        </h2>
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {notif.type === 'email' ? (
                  <Mail size={16} style={{ color: '#3b82f6' }} />
                ) : notif.type === 'push' ? (
                  <Smartphone size={16} style={{ color: '#f59e0b' }} />
                ) : (
                  <MessageSquare size={16} style={{ color: '#10b981' }} />
                )}
                <div>
                  <p style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">
                    {notif.title}
                  </p>
                  <p style={{ color: TEXT_MUTED }} className="text-xs">
                    {notif.sentAt}
                  </p>
                </div>
              </div>
              <span
                style={{
                  backgroundColor:
                    notif.status === 'sent'
                      ? '#10b98122'
                      : notif.status === 'failed'
                        ? '#ef444422'
                        : '#f59e0b22',
                  color:
                    notif.status === 'sent'
                      ? '#10b981'
                      : notif.status === 'failed'
                        ? '#ef4444'
                        : '#f59e0b',
                }}
                className="text-xs px-2 py-1 rounded-full font-medium capitalize"
              >
                {notif.status}
              </span>
            </div>
          ))}
          {notifications.length === 0 && (
            <p style={{ color: TEXT_MUTED }} className="text-center py-4">
              No notifications sent yet
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
