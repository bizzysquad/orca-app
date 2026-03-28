import { AdminUser, SubPlan, NavItem, ThemeConfig, NotifTemplate, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

// Users are loaded from Supabase in production — start with empty array
export const DEMO_USERS: AdminUser[] = []

// Subscription Plans
export const SUB_PLANS: SubPlan[] = [
  { name: 'Free Trial', price: 0, interval: 'month', description: '40 days free', users: 0 },
  { name: 'Premium', price: 4.99, interval: 'month', description: 'Monthly subscription', users: 0 },
  { name: 'Founding Member', price: 0, interval: 'month', description: 'Lifetime access', users: 0 },
]

// Default Navigation
export const DEFAULT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', order: 1, visible: true },
  { id: 'smart-stack', label: 'Smart Stack', order: 2, visible: true },
  { id: 'bill-boss', label: 'Bill Boss', order: 3, visible: true },
  { id: 'task-list', label: 'Task List', order: 4, visible: true },
  { id: 'stack-circle', label: 'Stack Circle', order: 5, visible: true },
  { id: 'settings', label: 'Settings', order: 6, visible: true },
]

// Default Theme
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: GOLD,
  bgDark: BG_DARK,
  bgCard: BG_CARD,
  borderColor: BORDER_COLOR,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
}

// Tabs Configuration
export const TABS = [
  { id: 'users', label: 'Users', icon: 'Users' },
  { id: 'billing-subs', label: 'Billing & Subs', icon: 'CreditCard' },
  { id: 'modules', label: 'Modules', icon: 'Puzzle' },
  { id: 'customize', label: 'Customize', icon: 'Palette' },
  { id: 'security', label: 'Security', icon: 'ShieldAlert' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'support', label: 'Support', icon: 'HelpCircle' },
]

// Sub-tabs for grouped sections
export const SUB_TABS: Record<string, { id: string; label: string }[]> = {
  'billing-subs': [
    { id: 'subscription', label: 'Subscription & Trial' },
    { id: 'billing', label: 'Invoices & Billing' },
  ],
  'modules': [
    { id: 'modules', label: 'Smart Modules' },
    { id: 'tasklist', label: 'Task Lists' },
  ],
  'customize': [
    { id: 'settings', label: 'App Settings' },
    { id: 'theme', label: 'Theme & Branding' },
    { id: 'navigation', label: 'Navigation' },
  ],
}

// Default notification templates
export const DEFAULT_NOTIF_TEMPLATES: NotifTemplate[] = [
  { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to ORCA!', body: 'Thanks for joining ORCA. Start your journey...', channel: 'email', enabled: true },
  { id: 'trial-expiring', name: 'Trial Expiring', subject: 'Your trial ends soon', body: 'Your ORCA trial expires in {{days}} days...', channel: 'email', enabled: true },
  { id: 'payment-failed', name: 'Payment Failed', subject: 'Payment issue', body: 'We couldn\'t process your payment...', channel: 'email', enabled: true },
  { id: 'weekly-summary', name: 'Weekly Summary', subject: 'Your weekly spending summary', body: 'Here\'s your weekly overview...', channel: 'push', enabled: true },
  { id: 'budget-alert', name: 'Budget Alert', subject: 'Budget threshold reached', body: 'You\'ve reached {{percent}}% of your budget...', channel: 'push', enabled: true },
  { id: 'new-feature', name: 'New Feature', subject: 'New feature available!', body: 'Check out our latest feature...', channel: 'email', enabled: false },
]

// Default module configs
export const DEFAULT_MODULE_CONFIGS: Record<string, Record<string, any>> = {
  'smart-stack': { defaultAllocBR: 50, defaultAllocSR: 20, defaultAllocSP: 30, maxCategories: 10, autoLockBudget: true, selfEmployedAllocator: true, incomeAllocationEnabled: true },
  'bill-boss': { reminderDays: 3, lateFeeAlert: true, receiptUploadEnabled: true, splitPayments: true, rentTrackerEnabled: true, recurrenceOptions: true, weeklyMonthlyToggle: true, incomeExpenseRatio: true },
  'stack-circle': { maxGroupSize: 50, maxGroups: 5, moderationEnabled: true, inviteOnly: false, anonymousMode: false, customGroupNames: true, inviteSystem: true, inviteDomain: 'orcafin.app' },
  'task-lists': { maxTodoItems: 100, maxGroceryLists: 20, meetingReminders: true, quickNotes: true, taskSharing: false, calendarSync: true },
}

// Theme presets
export const THEME_PRESETS = [
  { name: 'ORCA Gold', primary: '#d4a843', bg: '#09090b', card: '#18181b', border: '#27272a' },
  { name: 'Ocean Blue', primary: '#3b82f6', bg: '#0a0a1a', card: '#141428', border: '#1e1e3a' },
  { name: 'Emerald', primary: '#10b981', bg: '#0a0f0d', card: '#141f1a', border: '#1e2f27' },
  { name: 'Rose', primary: '#f43f5e', bg: '#0f0a0b', card: '#1f141a', border: '#2f1e27' },
  { name: 'Violet', primary: '#8b5cf6', bg: '#0d0a14', card: '#1a1428', border: '#271e3a' },
  { name: 'Sunset', primary: '#f97316', bg: '#0f0c0a', card: '#1f1814', border: '#2f261e' },
]

// Invoices loaded from payment provider in production
export const DEFAULT_INVOICES: Array<{ id: string; user: string; amount: number; date: string; status: string }> = []

// Default feature flags
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  smartStack: true,
  billBoss: true,
  stackCircle: true,
  taskLists: true,
  darkMode: true,
  lightMode: true,
  pushNotifications: true,
  receiptUpload: true,
  creditScoreTracker: true,
  rentTracker: true,
  exportReports: false,
  aiInsights: false,
  socialSharing: false,
  selfEmployedMode: true,
  incomeAllocator: true,
  billRecurrence: true,
  calendarSync: true,
  inviteSystem: true,
  savingsModule: true,
}
