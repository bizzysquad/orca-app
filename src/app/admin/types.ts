// Color constants
export const GOLD = '#d4a843'
export const BG_DARK = '#09090b'
export const BG_CARD = '#18181b'
export const BORDER_COLOR = '#27272a'
export const TEXT_PRIMARY = '#fafafa'
export const TEXT_SECONDARY = '#a1a1aa'
export const TEXT_MUTED = '#71717a'

// Types
export interface AdminUser {
  id: string
  name: string
  email: string
  status: 'active' | 'trial' | 'premium' | 'founding' | 'suspended'
  twoFA: boolean
  lastActive: string
  joinDate: string
  plan: string
  trialDaysLeft?: number
  creditScore: number
  activityLog: Array<{ action: string; date: string; detail: string }>
}

export interface NavItem {
  id: string
  label: string
  order: number
  visible: boolean
}

export interface ThemeConfig {
  primaryColor: string
  bgDark: string
  bgCard: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  textMuted: string
}

export interface Notification {
  id: string
  type: 'email' | 'sms' | 'push'
  title: string
  body: string
  sentAt: string
  status: 'sent' | 'pending' | 'failed'
  channel: string
}

export interface SubPlan {
  name: string
  price: number
  interval: 'month' | 'year'
  description: string
  users: number
}

export interface AdminRole {
  id: string
  name: string
  permissions: string[]
}

export interface AuditEntry {
  id: string
  admin: string
  action: string
  target: string
  timestamp: string
  details: string
}

export interface NotifTemplate {
  id: string
  name: string
  subject: string
  body: string
  channel: string
  enabled: boolean
}
