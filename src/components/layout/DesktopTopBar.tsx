'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Settings, Menu, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface Notification {
  id: string
  type: 'bill' | 'savings' | 'task' | 'group'
  title: string
  message: string
  timestamp: Date
  read: boolean
  icon?: string
}

interface DesktopTopBarProps {
  onMenuToggle?: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/smart-stack': 'Smart Stack',
  '/bill-boss': 'Bill Boss',
  '/stack-circle': 'Stack Circle',
  '/task-list': 'Task List',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
}

// Initial notifications
const INITIAL_NOTIFICATIONS: Notification[] = []

function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'bill':
      return '💳'
    case 'task':
      return '✓'
    case 'savings':
      return '💰'
    case 'group':
      return '👥'
    default:
      return '📢'
  }
}

function getNotificationTypeColor(type: string, theme: any): string {
  switch (type) {
    case 'bill':
      return 'text-red-400'
    case 'task':
      return 'text-green-400'
    case 'savings':
      return 'text-blue-400'
    case 'group':
      return 'text-purple-400'
    default:
      return theme.textM
  }
}

export default function DesktopTopBar({ onMenuToggle }: DesktopTopBarProps) {
  const pathname = usePathname()
  const title = ROUTE_TITLES[pathname] || 'ORCA'
  const { theme } = useTheme()

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBellClick = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ))
  }

  const handleClearAll = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  // Group notifications by type
  const groupedNotifications = {
    bill: notifications.filter(n => n.type === 'bill'),
    task: notifications.filter(n => n.type === 'task'),
    savings: notifications.filter(n => n.type === 'savings'),
    group: notifications.filter(n => n.type === 'group'),
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'backdrop-blur-xl',
        'flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 transition-colors duration-200'
      )}
      style={{
        backgroundColor: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger menu — mobile only */}
        <button
          onClick={onMenuToggle}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors duration-200',
            'hover:text-[#d4a843]'
          )}
          style={{ color: theme.textM }}
        >
          <Menu size={22} />
        </button>
        <h1
          className="text-lg sm:text-xl font-semibold"
          style={{ color: theme.text }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={handleBellClick}
            className={cn(
              'relative p-2 sm:p-2.5 rounded-lg transition-colors duration-200',
              'hover:text-[#d4a843]'
            )}
            style={{ color: theme.textM }}
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: theme.gold }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className={cn(
                'absolute right-0 mt-2 w-96 rounded-xl shadow-2xl',
                'max-h-[600px] overflow-y-auto',
                'border backdrop-blur-xl'
              )}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              {/* Header */}
              <div
                className="sticky top-0 px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: theme.border }}
              >
                <h3 className="font-semibold" style={{ color: theme.text }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs font-medium transition-colors hover:text-[#d4a843]"
                    style={{ color: theme.textM }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification Groups */}
              <div className="py-2">
                {Object.entries(groupedNotifications).map(([type, typeNotifs]) => {
                  if (typeNotifs.length === 0) return null
                  return (
                    <div key={type}>
                      <div
                        className={cn(
                          'px-4 py-2 text-xs font-semibold uppercase tracking-wide',
                          getNotificationTypeColor(type, theme)
                        )}
                        style={{ color: getNotificationTypeColor(type, theme) }}
                      >
                        {type === 'bill' && '💳 Bills'}
                        {type === 'task' && '✓ Tasks'}
                        {type === 'savings' && '💰 Savings'}
                        {type === 'group' && '👥 Stack Circle'}
                      </div>
                      <div>
                        {typeNotifs.map(notification => (
                          <button
                            key={notification.id}
                            onClick={() => handleMarkAsRead(notification.id)}
                            className={cn(
                              'w-full px-4 py-3 text-left transition-colors',
                              'border-b last:border-b-0',
                              'hover:opacity-80',
                              notification.read ? 'opacity-60' : ''
                            )}
                            style={{
                              backgroundColor: notification.read
                                ? 'transparent'
                                : `${theme.bgS}cc`,
                              borderColor: theme.border,
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                <span className="text-lg">
                                  {getNotificationIcon(notification.type)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className="font-medium text-sm leading-tight"
                                    style={{ color: theme.text }}
                                  >
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                                      style={{ backgroundColor: theme.gold }}
                                    />
                                  )}
                                </div>
                                <p
                                  className="text-xs mt-1 leading-snug"
                                  style={{ color: theme.textS }}
                                >
                                  {notification.message}
                                </p>
                                <p
                                  className="text-[10px] mt-2"
                                  style={{ color: theme.textM }}
                                >
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {notifications.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p
                      className="text-sm"
                      style={{ color: theme.textM }}
                    >
                      No notifications
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 border-t text-center"
                style={{ borderColor: theme.border }}
              >
                <Link
                  href="/notifications"
                  className="text-xs font-medium transition-colors hover:text-[#d4a843]"
                  style={{ color: theme.textM }}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Settings Link */}
        <Link
          href="/settings"
          className={cn(
            'p-2 sm:p-2.5 rounded-lg transition-colors duration-200',
            'hover:text-[#d4a843]'
          )}
          style={{ color: theme.textM }}
        >
          <Settings size={20} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
