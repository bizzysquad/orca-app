'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from '@/context/ThemeContext'
import {
  Shield,
  Users,
  CreditCard,
  Settings,
  Bell,
  Puzzle,
  ShieldAlert,
  BarChart3,
  HelpCircle,
  Lock,
  Search,
  MoreHorizontal,
  UserCheck,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  Globe,
  Mail,
  Smartphone,
  Key,
  Database,
  Zap,
  FileText,
  MessageSquare,
  Palette,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Trash2,
  Edit3,
  Save,
  Star,
  Crown,
  Clock,
  ArrowUpDown,
  Upload,
  RefreshCw,
  Send,
  X,
  ClipboardList,
  ListTodo,
  ShoppingCart,
  Calendar,
  Check,
} from 'lucide-react'

// Color constants (fallbacks only — component uses theme-aware values)
const GOLD_FALLBACK = '#d4a843'
const BG_DARK_FALLBACK = '#09090b'
const BG_CARD_FALLBACK = '#18181b'
const BORDER_FALLBACK = '#27272a'
const TEXT_PRIMARY_FALLBACK = '#fafafa'
const TEXT_SECONDARY_FALLBACK = '#a1a1aa'
const TEXT_MUTED_FALLBACK = '#71717a'

// Supabase Client
const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// Helpers
function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

// Types
interface AdminUser {
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
  creditScoreTransUnion?: number
  creditScoreEquifax?: number
  creditScoreExperian?: number
  activityLog: Array<{ action: string; date: string; detail: string }>
}

interface NavItem {
  id: string
  label: string
  order: number
  visible: boolean
}

interface Notification {
  id: string
  type: 'email' | 'sms' | 'push'
  title: string
  body: string
  sentAt: string
  status: 'sent' | 'pending' | 'failed'
  channel: string
}

interface SubPlan {
  name: string
  price: number
  interval: 'month' | 'year'
  description: string
  users: number
}

interface AdminRole {
  id: string
  name: string
  permissions: string[]
}

interface AuditEntry {
  id: string
  admin: string
  action: string
  target: string
  timestamp: string
  details: string
}


// Subscription Plans
const SUB_PLANS: SubPlan[] = [
  { name: 'Free Trial', price: 0, interval: 'month', description: '40 days free', users: 0 },
  { name: 'Premium', price: 4.99, interval: 'month', description: 'Monthly subscription', users: 0 },
  { name: 'Founding Member', price: 0, interval: 'month', description: 'Lifetime access', users: 0 },
]

// Default Navigation
const DEFAULT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', order: 1, visible: true },
  { id: 'smart-stack', label: 'Smart Stack', order: 2, visible: true },
  { id: 'bill-boss', label: 'Bill Boss', order: 3, visible: true },
  { id: 'task-list', label: 'Task List', order: 4, visible: true },
  { id: 'stack-circle', label: 'Stack Circle', order: 5, visible: true },
  { id: 'settings', label: 'Settings', order: 6, visible: true },
]

// Admin settings localStorage key
const ADMIN_SETTINGS_KEY = 'orca-admin-settings'

// Tabs Configuration — grouped to fit without scrolling
const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'billing-subs', label: 'Billing & Subs', icon: CreditCard },
  { id: 'modules', label: 'Modules', icon: Puzzle },
  { id: 'customize', label: 'Customize', icon: Palette },
  { id: 'security', label: 'Security', icon: ShieldAlert },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'support', label: 'Support', icon: HelpCircle },
]

// Sub-tabs for grouped sections
const SUB_TABS: Record<string, { id: string; label: string }[]> = {
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

export default function AdminPage() {
  const { theme: globalTheme, allThemes } = useTheme()

  // Admin has its own local theme state that doesn't affect the global site theme
  const [adminThemeId, setAdminThemeIdState] = useState<string>('ocean-blue')
  const adminTheme = allThemes.find(t => t.id === adminThemeId) || allThemes[0]

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-admin-panel-theme')
      if (saved) setAdminThemeIdState(saved)
    } catch {}
  }, [])

  const setAdminThemeId = (id: string) => {
    setAdminThemeIdState(id)
    try { localStorage.setItem('orca-admin-panel-theme', id) } catch {}
  }

  // Theme-aware color constants — these map to the admin's chosen theme
  // The admin panel has its own theme independent of the user's global theme choice.
  const GOLD = adminTheme.accent
  const BG_DARK = adminTheme.bg
  const BG_CARD = adminTheme.card
  const BORDER_COLOR = adminTheme.border
  const TEXT_PRIMARY = adminTheme.text
  const TEXT_SECONDARY = adminTheme.subtext
  const TEXT_MUTED = adminTheme.subtext

  // Admin auth state
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => {
        if (res.ok) setAdminAuthenticated(true)
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [])

  // Helper: convert raw profile rows to AdminUser[]
  const profilesToAdminUsers = (profiles: any[]): AdminUser[] =>
    profiles.map((profile: any, idx: number) => ({
      id: profile.id || `user-${idx}`,
      name: profile.name || profile.full_name || profile.email?.split('@')[0] || 'New User',
      email: profile.email || 'unknown@example.com',
      status: profile.onboarded ? 'active' as const : 'trial' as const,
      twoFA: false,
      lastActive: profile.updated_at ? getRelativeTime(profile.updated_at) : 'Just signed up',
      joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      plan: profile.onboarded ? 'Active' : 'Trial',
      creditScore: profile.credit_score || 0,
      creditScoreTransUnion: profile.credit_score_transunion || 0,
      creditScoreEquifax: profile.credit_score_equifax || 0,
      creditScoreExperian: profile.credit_score_experian || 0,
      activityLog: [{ action: 'Account created', date: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : '', detail: 'User registration' }],
    }))

  // Fetch users via server-side API (bypasses RLS using service role key)
  useEffect(() => {
    if (!adminAuthenticated) return

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true)
        setUserLoadError('')

        const res = await fetch('/api/admin/users')
        if (!res.ok) {
          setDbConnected(false)
          setIsLiveMode(false)
          setUserLoadError('Could not fetch users from server')
          return
        }

        const { users: profiles } = await res.json()
        setUsers(profilesToAdminUsers(profiles || []))
        setDbConnected(true)
        setIsLiveMode(true)
        setLastSyncTime(new Date().toLocaleTimeString())

        // Set up real-time subscriptions for live updates (uses anon key — only for change detection)
        const supabase = createSupabaseClient()
        supabaseRef.current = supabase

        const channel = supabase
          .channel('admin-all-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            () => { refetchUsers(); setLastSyncTime(new Date().toLocaleTimeString()); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bills' },
            () => { refetchMetrics(); setLastSyncTime(new Date().toLocaleTimeString()); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'expenses' },
            () => { refetchMetrics(); setLastSyncTime(new Date().toLocaleTimeString()); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'savings_goals' },
            () => { refetchMetrics(); setLastSyncTime(new Date().toLocaleTimeString()); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'income_sources' },
            () => { refetchMetrics(); setLastSyncTime(new Date().toLocaleTimeString()); }
          )
          .subscribe()

        return () => {
          if (supabaseRef.current && channel) {
            supabaseRef.current.removeChannel(channel)
          }
        }
      } catch (err) {
        console.error('Admin initialization error:', err)
        setDbConnected(false)
        setIsLiveMode(false)
        setUserLoadError('Failed to initialize admin panel')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [adminAuthenticated])

  // Refetch users via server-side API (bypasses RLS)
  const refetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) return
      const { users: profiles } = await res.json()
      if (profiles) {
        setUsers(profilesToAdminUsers(profiles))
        setLastSyncTime(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error('Refetch error:', err)
    }
  }

  // Refetch platform metrics via server-side API
  const refetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics')
      if (!res.ok) return
      const data = await res.json()
      setPlatformMetrics(data)
    } catch {}
  }

  const handleAdminLogin = async () => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      if (res.ok) {
        setAdminAuthenticated(true)
        setAdminError('')
      } else {
        setAdminError('Invalid admin password')
        setAdminPassword('')
      }
    } catch {
      setAdminError('Authentication failed')
      setAdminPassword('')
    }
  }

  const handleAdminLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setAdminAuthenticated(false)
  }

  // Core state
  const [activeTab, setActiveTab] = useState('users')
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // Custom logo state
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('orca-custom-logo') || null
    }
    return null
  })

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setCustomLogo(dataUrl)
      localStorage.setItem('orca-custom-logo', dataUrl)
      // Dispatch event so other components can pick up the change
      window.dispatchEvent(new CustomEvent('orca-logo-updated', { detail: { logo: dataUrl } }))
    }
    reader.readAsDataURL(file)
  }

  const resetLogo = () => {
    setCustomLogo(null)
    localStorage.removeItem('orca-custom-logo')
    window.dispatchEvent(new CustomEvent('orca-logo-updated', { detail: { logo: null } }))
  }

  // Subscription states
  const [trialDuration, setTrialDuration] = useState(40)
  const [trialSlots, setTrialSlots] = useState(500)
  const [monthlyPrice, setMonthlyPrice] = useState(4.99)
  const [yearlyPrice, setYearlyPrice] = useState(49.99)
  const [stripeLive, setStripeLive] = useState(false)

  // Settings states
  const [appName, setAppName] = useState('ORCA')
  const [tagline, setTagline] = useState('Your Financial Compass')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [signupsEnabled, setSignupsEnabled] = useState(true)
  const [maxUsers, setMaxUsers] = useState(10000)
  const [defaultSafeToSpendBuffer, setDefaultSafeToSpendBuffer] = useState(50)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [budgetCategories, setBudgetCategories] = useState<string[]>([
    'Housing',
    'Transportation',
    'Food',
    'Entertainment',
    'Healthcare',
  ])
  const [alertThresholds, setAlertThresholds] = useState({ budget: 80, churn: 15 })

  // Layout & UI controls
  const [layoutStyle, setLayoutStyle] = useState<'sidebar' | 'topnav' | 'hybrid'>('sidebar')
  const [buttonPlacements, setButtonPlacements] = useState({
    settingsBtn: 'sidebar-bottom' as 'sidebar-bottom' | 'topbar-right' | 'hidden',
    themeToggle: 'settings-page' as 'topbar-right' | 'sidebar-bottom' | 'settings-page' | 'hidden',
    homeBtn: 'sidebar-top' as 'sidebar-top' | 'topbar-left' | 'hidden',
  })
  const [defaultUserTheme, setDefaultUserTheme] = useState<string>('ocean-blue')

  // Module states
  const [modules, setModules] = useState([
    { id: 'smart-stack', name: 'Smart Stack', enabled: true },
    { id: 'bill-boss', name: 'Bill Boss', enabled: true },
    { id: 'stack-circle', name: 'Stack Circle', enabled: true },
    { id: 'task-lists', name: 'Task Lists', enabled: true },
    { id: 'savings-accounts', name: 'Savings Accounts', enabled: true },
    { id: 'payment-projection', name: 'Incoming Payments', enabled: true },
  ])

  // Connection states
  const [dbConnected, setDbConnected] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userLoadError, setUserLoadError] = useState<string>('')
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null)
  // Platform-wide metrics
  const [platformMetrics, setPlatformMetrics] = useState({ totalBills: 0, totalExpenses: 0, totalGoals: 0, totalIncome: 0 })
  const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({})

  // Fetch platform-wide metrics via server-side API (bypasses RLS)
  useEffect(() => {
    if (!adminAuthenticated) return
    refetchMetrics()
  }, [adminAuthenticated])

  // Load persisted admin settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_SETTINGS_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.trialDuration !== undefined) setTrialDuration(s.trialDuration)
      if (s.trialSlots !== undefined) setTrialSlots(s.trialSlots)
      if (s.monthlyPrice !== undefined) setMonthlyPrice(s.monthlyPrice)
      if (s.yearlyPrice !== undefined) setYearlyPrice(s.yearlyPrice)
      if (s.stripeLive !== undefined) setStripeLive(s.stripeLive)
      if (s.appName !== undefined) setAppName(s.appName)
      if (s.tagline !== undefined) setTagline(s.tagline)
      if (s.maintenanceMode !== undefined) setMaintenanceMode(s.maintenanceMode)
      if (s.signupsEnabled !== undefined) setSignupsEnabled(s.signupsEnabled)
      if (s.maxUsers !== undefined) setMaxUsers(s.maxUsers)
      if (s.defaultSafeToSpendBuffer !== undefined) setDefaultSafeToSpendBuffer(s.defaultSafeToSpendBuffer)
      if (s.budgetCategories) setBudgetCategories(s.budgetCategories)
      if (s.alertThresholds) setAlertThresholds(s.alertThresholds)
      if (s.featureFlags) setFeatureFlags(s.featureFlags)
      if (s.onboardingText !== undefined) setOnboardingText(s.onboardingText)
      if (s.moduleConfigs) setModuleConfigs(s.moduleConfigs)
      if (s.modules) setModules(s.modules)
      if (s.twoFARequired !== undefined) setTwoFARequired(s.twoFARequired)
      if (s.sessionTimeout !== undefined) setSessionTimeout(s.sessionTimeout)
      if (s.ipWhitelist !== undefined) setIpWhitelist(s.ipWhitelist)
      if (s.fraudMonitoring !== undefined) setFraudMonitoring(s.fraudMonitoring)
      if (s.adminRoles) setAdminRoles(s.adminRoles)
      if (s.notifTemplates) setNotifTemplates(s.notifTemplates)
      if (s.layoutStyle) setLayoutStyle(s.layoutStyle)
      if (s.buttonPlacements) setButtonPlacements(s.buttonPlacements)
      if (s.defaultUserTheme) setDefaultUserTheme(s.defaultUserTheme)
    } catch {}
  }, [])

  // Navigation states — load from localStorage, auto-merge missing items, fall back to defaults
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-admin-nav')
        if (saved) {
          const parsed: NavItem[] = JSON.parse(saved)
          // Auto-merge any items from DEFAULT_NAV that are missing in saved config
          let merged = [...parsed]
          let changed = false
          DEFAULT_NAV.forEach(def => {
            if (!merged.some(n => n.id === def.id)) {
              merged.push({ ...def, order: merged.length + 1 })
              changed = true
            }
          })
          if (changed) {
            localStorage.setItem('orca-admin-nav', JSON.stringify(merged))
          }
          return merged
        }
      } catch {}
    }
    return DEFAULT_NAV
  })
  const [editingNavItem, setEditingNavItem] = useState<string | null>(null)

  // Persist nav changes to localStorage and broadcast to all components in real time
  useEffect(() => {
    try {
      localStorage.setItem('orca-admin-nav', JSON.stringify(navItems))
      // Dispatch both events for immediate same-tab sync + cloud sync
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key: 'orca-admin-nav' } }))
      window.dispatchEvent(new CustomEvent('orca-nav-updated', { detail: { navItems } }))
    } catch {}
  }, [navItems])

  // Notification states — empty until real notifications are sent
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)

  // Security states
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([
    { id: 'super', name: 'Super Admin', permissions: ['*'] },
    { id: 'user-mgmt', name: 'User Manager', permissions: ['users.view', 'users.edit'] },
  ])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string; userEmail: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Analytics states — computed from live user data
  const analyticsData = useMemo(() => {
    const premiumCount = users.filter(u => u.status === 'premium').length
    const mrrEstimate = premiumCount * monthlyPrice
    return {
      mrrGrowth: mrrEstimate > 0 ? mrrEstimate : 0,
      arrGrowth: mrrEstimate * 12,
      churnRate: users.length > 0 ? Math.round((users.filter(u => u.status === 'suspended').length / users.length) * 100 * 10) / 10 : 0,
      ltv: premiumCount > 0 ? (mrrEstimate * 12) / Math.max(1, premiumCount * 0.023) : 0,
    }
  }, [users, monthlyPrice])

  // Stack Circle groups — loaded from Supabase via localStorage sync
  const [stackCircleGroups, setStackCircleGroups] = useState<Array<{ id: string; name: string; members: number; status: string }>>([])

  // Load live stack circle groups
  useEffect(() => {
    if (!adminAuthenticated) return
    try {
      const saved = localStorage.getItem('orca-stack-circle-groups')
      if (saved) {
        const groups = JSON.parse(saved)
        setStackCircleGroups(groups.map((g: any, i: number) => ({
          id: g.id || `group-${i}`,
          name: g.customName || g.name || `Group ${i + 1}`,
          members: g.members?.length || 0,
          status: 'active',
        })))
      }
    } catch {}
  }, [adminAuthenticated])

  // Settings extras
  const [newCategory, setNewCategory] = useState('')
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
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
    projectionCalculator: true,
    checkSplitter: true,
    paycheckHistory: true,
    taskPersistence: true,
    liveDataSync: true,
    multipleStackCircleGroups: true,
  })
  const [onboardingText, setOnboardingText] = useState(
    'Welcome to ORCA! Let\'s set up your financial dashboard and start building smart money habits.'
  )

  // Support extras
  const [supportSearch, setSupportSearch] = useState('')
  const [selectedSupportUser, setSelectedSupportUser] = useState<string | null>(null)
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>({})
  const [newNote, setNewNote] = useState('')

  // Notification extras
  const [notifTemplates, setNotifTemplates] = useState([
    { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to ORCA!', body: 'Thanks for joining ORCA. Start your journey...', channel: 'email', enabled: true },
    { id: 'trial-expiring', name: 'Trial Expiring', subject: 'Your trial ends soon', body: 'Your ORCA trial expires in {{days}} days...', channel: 'email', enabled: true },
    { id: 'payment-failed', name: 'Payment Failed', subject: 'Payment issue', body: 'We couldn\'t process your payment...', channel: 'email', enabled: true },
    { id: 'weekly-summary', name: 'Weekly Summary', subject: 'Your weekly spending summary', body: 'Here\'s your weekly overview...', channel: 'push', enabled: true },
    { id: 'budget-alert', name: 'Budget Alert', subject: 'Budget threshold reached', body: 'You\'ve reached {{percent}}% of your budget...', channel: 'push', enabled: true },
    { id: 'new-feature', name: 'New Feature', subject: 'New feature available!', body: 'Check out our latest feature...', channel: 'email', enabled: false },
  ])
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [newNotifChannel, setNewNotifChannel] = useState<'email' | 'push' | 'sms'>('email')

  // Module settings extras
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, Record<string, any>>>({
    'smart-stack': {
      defaultAllocBR: 50,
      defaultAllocSR: 20,
      defaultAllocSP: 30,
      maxCategories: 10,
      autoLockBudget: true,
      selfEmployedAllocator: true,
      incomeAllocationEnabled: true,
      projectionCalculatorEnabled: true,
      calendarIntegration: true,
      allocatorEnabled: true,
      checkSplitterEnabled: true,
      paycheckHistoryEnabled: true,
    },
    'bill-boss': {
      reminderDays: 3,
      lateFeeAlert: true,
      receiptUploadEnabled: true,
      splitPayments: true,
      rentTrackerEnabled: true,
      recurrenceOptions: true,
      weeklyMonthlyToggle: true,
      incomeExpenseRatio: true,
      liveDataSyncEnabled: true,
    },
    'stack-circle': {
      maxGroupSize: 50,
      maxGroups: 5,
      moderationEnabled: true,
      inviteOnly: false,
      anonymousMode: false,
      customGroupNames: true,
      inviteSystem: true,
      inviteDomain: 'orcafin.app',
      multipleGroupsEnabled: true,
    },
    'task-lists': {
      maxTodoItems: 100,
      maxGroceryLists: 20,
      meetingReminders: true,
      quickNotes: true,
      taskSharing: false,
      calendarSync: true,
      persistenceEnabled: true,
    },
  })

  // Security extras
  const [newRoleName, setNewRoleName] = useState('')
  const [twoFARequired, setTwoFARequired] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [ipWhitelist, setIpWhitelist] = useState('')
  const [fraudMonitoring, setFraudMonitoring] = useState(true)

  // Billing extras — loaded from payment provider in production
  const [invoices] = useState<Array<{ id: string; user: string; amount: number; date: string; status: string }>>([])
  const [refundReason, setRefundReason] = useState('')

  // Computed values
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = !statusFilter || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter])

  const userStats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'active').length
    const trial = users.filter((u) => u.status === 'trial').length
    const premium = users.filter((u) => u.status === 'premium').length
    const founding = users.filter((u) => u.status === 'founding').length
    const suspended = users.filter((u) => u.status === 'suspended').length
    return { total, active, trial, premium, founding, suspended }
  }, [users])

  const subscriptionStats = useMemo(() => {
    const trialCount = users.filter((u) => u.status === 'trial').length
    const premiumCount = users.filter((u) => u.status === 'premium').length
    const foundingCount = users.filter((u) => u.status === 'founding').length
    const mrrEstimate = premiumCount * monthlyPrice + foundingCount * 0
    const arrEstimate = mrrEstimate * 12
    const churnRate = 2.3
    const ltv = premiumCount > 0 ? arrEstimate / (premiumCount * (churnRate / 100)) : 0
    return { trialCount, premiumCount, foundingCount, mrrEstimate, arrEstimate, churnRate, ltv }
  }, [users, monthlyPrice])

  // Handler functions
  const handleUserAction = (userId: string, action: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    switch (action) {
      case 'grant-premium':
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'premium' as const } : u)))
        break
      case 'revoke-premium':
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'active' as const } : u)))
        break
      case 'extend-trial':
        setUsers(
          users.map((u) =>
            u.id === userId
              ? { ...u, trialDaysLeft: (u.trialDaysLeft || 0) + 10 }
              : u
          )
        )
        break
      case 'reset-trial':
        setUsers(
          users.map((u) =>
            u.id === userId
              ? { ...u, status: 'trial' as const, trialDaysLeft: 40 }
              : u
          )
        )
        break
      case 'suspend':
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'suspended' as const } : u)))
        break
      case 'reactivate':
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'active' as const } : u)))
        break
      case 'delete-user':
        setDeleteConfirm({ userId: user.id, userName: user.name, userEmail: user.email })
        break
    }
    setShowDropdown(null)
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users?userId=${deleteConfirm.userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        console.error('Delete user error:', data.error)
      } else {
        setUsers(users.filter((u) => u.id !== deleteConfirm.userId))
      }
    } catch (err) {
      console.error('Delete user error:', err)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  // Collect all admin settings into a single object for persistence
  const collectAdminSettings = () => ({
    trialDuration, trialSlots, monthlyPrice, yearlyPrice, stripeLive,
    appName, tagline, maintenanceMode, signupsEnabled, maxUsers,
    defaultSafeToSpendBuffer, budgetCategories, alertThresholds,
    featureFlags, onboardingText, moduleConfigs, modules,
    twoFARequired, sessionTimeout, ipWhitelist, fraudMonitoring,
    adminRoles, notifTemplates, layoutStyle, buttonPlacements, defaultUserTheme,
  })

  const persistAdminSettings = () => {
    try {
      const settings = collectAdminSettings()
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings))
      // Broadcast for cross-tab/device sync
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key: ADMIN_SETTINGS_KEY } }))
      // Broadcast specific events for components that listen
      window.dispatchEvent(new CustomEvent('orca-admin-settings-updated', { detail: settings }))
      // If default user theme changed, broadcast it
      if (settings.defaultUserTheme) {
        localStorage.setItem('orca-default-theme', settings.defaultUserTheme)
        window.dispatchEvent(new CustomEvent('orca-default-theme-updated', { detail: { themeId: settings.defaultUserTheme } }))
      }
      // Persist layout and button placement settings
      localStorage.setItem('orca-layout-style', settings.layoutStyle)
      localStorage.setItem('orca-button-placements', JSON.stringify(settings.buttonPlacements))
      // Persist feature flags for live app components
      localStorage.setItem('orca-feature-flags', JSON.stringify(settings.featureFlags))
      // Persist module configs for live app
      localStorage.setItem('orca-module-configs', JSON.stringify(settings.moduleConfigs))
    } catch (err) {
      console.error('Failed to persist admin settings:', err)
    }
  }

  const handleSaveSettings = () => {
    persistAdminSettings()
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  const handleModuleToggle = (moduleId: string) => {
    setModules(
      modules.map((m) => (m.id === moduleId ? { ...m, enabled: !m.enabled } : m))
    )
  }

  const handleNavItemReorder = (itemId: string, direction: 'up' | 'down') => {
    const index = navItems.findIndex((item) => item.id === itemId)
    if (direction === 'up' && index > 0) {
      const newItems = [...navItems]
      ;[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]]
      setNavItems(newItems)
    } else if (direction === 'down' && index < navItems.length - 1) {
      const newItems = [...navItems]
      ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      setNavItems(newItems)
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !budgetCategories.includes(newCategory.trim())) {
      setBudgetCategories([...budgetCategories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const handleRemoveCategory = (cat: string) => {
    setBudgetCategories(budgetCategories.filter((c) => c !== cat))
  }

  const handleFeatureToggle = (flag: string) => {
    setFeatureFlags({ ...featureFlags, [flag]: !featureFlags[flag] })
  }

  const handleModuleConfigChange = (moduleId: string, key: string, value: any) => {
    setModuleConfigs({
      ...moduleConfigs,
      [moduleId]: { ...moduleConfigs[moduleId], [key]: value },
    })
  }

  const handleAddRole = () => {
    if (newRoleName.trim()) {
      setAdminRoles([
        ...adminRoles,
        { id: `role-${Date.now()}`, name: newRoleName.trim(), permissions: ['users.view'] },
      ])
      setNewRoleName('')
    }
  }

  const supportFilteredUsers = useMemo(() => {
    if (!supportSearch) return users.slice(0, 5)
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(supportSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(supportSearch.toLowerCase())
    )
  }, [users, supportSearch])

  if (authLoading) {
    return (
      <div style={{ backgroundColor: adminTheme.bg, color: adminTheme.text }} className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div style={{ borderColor: `${adminTheme.gold}44`, borderTopColor: adminTheme.gold }} className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: adminTheme.textM }} className="text-sm">Verifying session...</p>
        </motion.div>
      </div>
    )
  }

  if (!adminAuthenticated) {
    return (
      <div style={{ backgroundColor: adminTheme.bg, color: adminTheme.text }} className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ backgroundColor: adminTheme.card, borderColor: adminTheme.border }}
          className="rounded-2xl border p-8 w-full max-w-md mx-4"
        >
          <div className="text-center mb-8">
            <div style={{ backgroundColor: `${adminTheme.gold}22`, width: 64, height: 64 }} className="rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} style={{ color: adminTheme.gold }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: adminTheme.gold }}>Admin Console</h1>
            <p style={{ color: adminTheme.textM }} className="text-sm mt-1">Enter your admin password to continue</p>
          </div>
          <div className="space-y-4">
            <div>
              <label style={{ color: adminTheme.textS }} className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin password"
                style={{ backgroundColor: adminTheme.bg, borderColor: adminError ? '#ef4444' : adminTheme.border, color: adminTheme.text }}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                autoFocus
              />
              <AnimatePresence>
                {adminError && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ color: '#ef4444' }} className="text-sm mt-2 flex items-center gap-1">
                    <AlertTriangle size={14} /> {adminError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdminLogin}
              style={{ backgroundColor: adminTheme.gold, color: adminTheme.bg }}
              className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Lock size={18} /> Authenticate
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: BG_DARK, color: TEXT_PRIMARY }} className="min-h-screen">
      {/* Platform Status Banner */}
      {isLiveMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ backgroundColor: '#10b98122', borderBottomColor: '#10b981' }}
          className="border-b"
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: '#10b981' }}
                    className="w-2 h-2 rounded-full animate-pulse"
                  />
                  <span style={{ color: '#10b981' }} className="font-medium">
                    {isLiveMode ? 'Live' : 'Demo Mode'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database size={14} style={{ color: TEXT_MUTED }} />
                  <span style={{ color: TEXT_SECONDARY }}>
                    {dbConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: TEXT_MUTED }} />
                  <span style={{ color: TEXT_SECONDARY }}>
                    {userStats.total} users
                  </span>
                </div>
                {lastSyncTime && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: TEXT_MUTED }} />
                    <span style={{ color: TEXT_SECONDARY }}>
                      Last sync: {lastSyncTime}
                    </span>
                  </div>
                )}
              </div>
              {userLoadError && (
                <span style={{ color: '#f59e0b' }} className="text-xs">
                  {userLoadError}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: BG_CARD, borderBottomColor: BORDER_COLOR }}
        className="border-b sticky top-0 z-40 backdrop-blur"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield style={{ color: GOLD }} size={32} />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: GOLD }}>
                  Admin Console
                </h1>
                <p style={{ color: TEXT_MUTED }} className="text-sm">
                  {isLiveMode ? 'Live Database' : 'Local Mode'} {lastSyncTime ? `· Last sync: ${lastSyncTime}` : ''} {dbConnected ? '· Connected' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="/dashboard" style={{ color: TEXT_SECONDARY, borderColor: BORDER_COLOR }} className="px-4 py-2 rounded-lg border text-sm hover:opacity-80 transition-opacity">
                ← Back to App
              </a>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  persistAdminSettings()
                  if (isLiveMode) { refetchUsers(); refetchMetrics() }
                  setSettingsSaved(true)
                  setTimeout(() => setSettingsSaved(false), 2000)
                }}
                disabled={isLoadingUsers}
                style={{ backgroundColor: `${GOLD}22`, borderColor: GOLD, color: GOLD, opacity: isLoadingUsers ? 0.5 : 1 }}
                className="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw size={14} className={isLoadingUsers ? 'animate-spin' : ''} /> Sync All
              </motion.button>
              <AnimatePresence>
                {settingsSaved && (
                  <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ color: '#10b981' }} className="text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Synced</motion.span>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAdminLogout}
                style={{ backgroundColor: '#ef444422', borderColor: '#ef4444', color: '#ef4444' }}
                className="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2"
              >
                <Lock size={14} /> Logout
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation — fixed, no scroll */}
      <div style={{ backgroundColor: BG_CARD, borderBottomColor: BORDER_COLOR }} className="border-b sticky top-[104px] z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-1 py-3">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    // Auto-select first sub-tab for grouped sections
                    const subs = SUB_TABS[tab.id]
                    setActiveSubTab(subs ? subs[0].id : null)
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    backgroundColor: isActive ? BG_DARK : 'transparent',
                    borderColor: isActive ? GOLD : BORDER_COLOR,
                    color: isActive ? GOLD : TEXT_SECONDARY,
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm font-medium"
                >
                  <Icon size={16} />
                  {tab.label}
                </motion.button>
              )
            })}
          </div>
          {/* Sub-tab bar for grouped sections */}
          {SUB_TABS[activeTab] && (
            <div className="flex gap-1 pb-3 -mt-1">
              {SUB_TABS[activeTab].map((sub) => {
                const isSubActive = activeSubTab === sub.id
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubTab(sub.id)}
                    style={{
                      backgroundColor: isSubActive ? `${GOLD}18` : 'transparent',
                      borderColor: isSubActive ? `${GOLD}66` : 'transparent',
                      color: isSubActive ? GOLD : TEXT_MUTED,
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium border transition-all hover:opacity-80"
                  >
                    {sub.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'users' && (
              <div className="space-y-6">
                {isLoadingUsers && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                    className="rounded-lg border p-4 flex items-center gap-3"
                  >
                    <div style={{ borderColor: `${GOLD}44`, borderTopColor: GOLD }} className="w-4 h-4 border-2 rounded-full animate-spin" />
                    <span style={{ color: TEXT_SECONDARY }}>Loading live user data...</span>
                  </motion.div>
                )}

                {/* Mode Indicator and Demo Data Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                  className="rounded-lg border p-4 flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: isLiveMode ? '#10b981' : '#ef4444',
                        boxShadow: isLiveMode ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                      }}
                    />
                    <span style={{ color: TEXT_PRIMARY }} className="font-semibold">
                      {isLiveMode ? 'LIVE MODE' : 'OFFLINE MODE'}
                    </span>
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                      {isLiveMode && `(${users.length} users from database)`}
                      {!isLiveMode && '(Database connection failed)'}
                    </span>
                  </div>
                </motion.div>

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
                                        <div style={{ borderTopColor: BORDER_COLOR }} className="my-1 border-t" />
                                        <button
                                          onClick={() => handleUserAction(user.id, 'delete-user')}
                                          style={{ color: '#ef4444' }}
                                          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-opacity-50 transition-colors flex items-center gap-2"
                                        >
                                          <Trash2 size={14} />
                                          Delete User
                                        </button>
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
            )}

            {activeTab === 'billing-subs' && activeSubTab === 'subscription' && (
              <div className="space-y-6">
                {/* Trial Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                  className="rounded-lg border p-6"
                >
                  <h2 className="text-xl font-bold mb-6" style={{ color: GOLD }}>
                    Trial Settings
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                        Trial Duration (days)
                      </label>
                      <input
                        type="number"
                        value={trialDuration}
                        onChange={(e) => setTrialDuration(parseInt(e.target.value) || 0)}
                        style={{
                          backgroundColor: BG_DARK,
                          borderColor: BORDER_COLOR,
                          color: TEXT_PRIMARY,
                        }}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                      />
                      <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
                        Default: 40 days
                      </p>
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                        Trial Slots Available
                      </label>
                      <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center border rounded-lg overflow-hidden">
                        <input
                          type="number"
                          value={trialSlots}
                          onChange={(e) => setTrialSlots(parseInt(e.target.value) || 0)}
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: TEXT_PRIMARY,
                          }}
                          className="flex-1 px-4 py-2 focus:outline-none"
                        />
                        <span style={{ color: TEXT_MUTED, borderLeftColor: BORDER_COLOR }} className="px-4 border-l text-sm font-medium">
                          / {trialSlots}
                        </span>
                      </div>
                      <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
                        Current: {subscriptionStats.trialCount} active
                      </p>
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                        Trial Capacity
                      </label>
                      <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">{subscriptionStats.trialCount} active</span>
                          <span style={{ color: TEXT_MUTED }} className="text-sm">
                            {Math.round((subscriptionStats.trialCount / trialSlots) * 100)}%
                          </span>
                        </div>
                        <div style={{ backgroundColor: BORDER_COLOR }} className="h-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(subscriptionStats.trialCount / trialSlots) * 100}%`,
                            }}
                            style={{ backgroundColor: GOLD }}
                            className="h-full transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Pricing */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                  className="rounded-lg border p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: GOLD }}>
                      Pricing Configuration
                    </h2>
                    <div className="flex items-center gap-2">
                      <span style={{ color: stripeLive ? '#10b981' : TEXT_MUTED }} className="text-sm font-medium">
                        {stripeLive ? 'Stripe Live' : 'Stripe Test'}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setStripeLive(!stripeLive)}
                        style={{
                          backgroundColor: stripeLive ? '#10b98144' : `${BORDER_COLOR}`,
                          borderColor: stripeLive ? '#10b981' : BORDER_COLOR,
                          color: stripeLive ? '#10b981' : TEXT_MUTED,
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                      >
                        {stripeLive ? 'Live' : 'Test'}
                      </motion.button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                        Monthly Price
                      </label>
                      <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center border rounded-lg overflow-hidden">
                        <span style={{ color: TEXT_MUTED }} className="px-4 py-2">
                          $
                        </span>
                        <input
                          type="number"
                          value={monthlyPrice}
                          onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                          step="0.01"
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: TEXT_PRIMARY,
                          }}
                          className="flex-1 px-2 py-2 focus:outline-none"
                        />
                        <span style={{ color: TEXT_MUTED }} className="px-4 py-2">
                          /mo
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                        Yearly Price
                      </label>
                      <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center border rounded-lg overflow-hidden">
                        <span style={{ color: TEXT_MUTED }} className="px-4 py-2">
                          $
                        </span>
                        <input
                          type="number"
                          value={yearlyPrice}
                          onChange={(e) => setYearlyPrice(parseFloat(e.target.value) || 0)}
                          step="0.01"
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: TEXT_PRIMARY,
                          }}
                          className="flex-1 px-2 py-2 focus:outline-none"
                        />
                        <span style={{ color: TEXT_MUTED }} className="px-4 py-2">
                          /yr
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Conversion Funnel */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                  className="rounded-lg border p-6"
                >
                  <h2 className="text-xl font-bold mb-6" style={{ color: GOLD }}>
                    Conversion Funnel
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Trial', value: subscriptionStats.trialCount, color: '#f59e0b' },
                      { label: 'Active', value: userStats.active, color: '#10b981' },
                      { label: 'Premium', value: subscriptionStats.premiumCount, color: '#8b5cf6' },
                      { label: 'Founding', value: subscriptionStats.foundingCount, color: GOLD },
                    ].map((stage, idx) => {
                      const prev = idx === 0 ? subscriptionStats.trialCount : [subscriptionStats.trialCount, userStats.active, subscriptionStats.premiumCount, subscriptionStats.foundingCount][idx - 1]
                      const percentage = prev > 0 ? Math.round((stage.value / prev) * 100) : 0
                      return (
                        <div key={stage.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{stage.label}</span>
                            <span style={{ color: stage.color }} className="font-bold">
                              {stage.value} ({percentage}%)
                            </span>
                          </div>
                          <div style={{ backgroundColor: BORDER_COLOR }} className="h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(stage.value / subscriptionStats.trialCount * 100, 100)}%`,
                              }}
                              style={{ backgroundColor: stage.color }}
                              className="h-full"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Revenue Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'MRR',
                      value: `$${subscriptionStats.mrrEstimate.toFixed(2)}`,
                      icon: DollarSign,
                      color: '#10b981',
                    },
                    {
                      label: 'ARR',
                      value: `$${subscriptionStats.arrEstimate.toFixed(2)}`,
                      icon: TrendingUp,
                      color: GOLD,
                    },
                    {
                      label: 'Churn Rate',
                      value: `${subscriptionStats.churnRate.toFixed(1)}%`,
                      icon: AlertTriangle,
                      color: '#ef4444',
                    },
                    {
                      label: 'LTV',
                      value: `$${subscriptionStats.ltv.toFixed(2)}`,
                      icon: Activity,
                      color: '#8b5cf6',
                    },
                  ].map((card, idx) => {
                    const Icon = card.icon
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p style={{ color: TEXT_MUTED }} className="text-sm font-medium">
                            {card.label}
                          </p>
                          <Icon size={18} style={{ color: card.color }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: card.color }}>
                          {card.value}
                        </p>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Plan Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                  className="rounded-lg border p-6"
                >
                  <h2 className="text-xl font-bold mb-6" style={{ color: GOLD }}>
                    User Distribution by Plan
                  </h2>
                  <div className="space-y-4">
                    {[
                      { name: 'Free Trial', count: subscriptionStats.trialCount, color: '#f59e0b' },
                      { name: 'Premium', count: subscriptionStats.premiumCount, color: '#8b5cf6' },
                      { name: 'Founding Member', count: subscriptionStats.foundingCount, color: GOLD },
                    ].map((plan) => {
                      const percentage = (plan.count / userStats.total) * 100
                      return (
                        <div key={plan.name}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{plan.name}</span>
                            <span style={{ color: plan.color }} className="font-bold">
                              {plan.count} users ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ backgroundColor: BORDER_COLOR }} className="h-3 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              style={{ backgroundColor: plan.color }}
                              className="h-full transition-all"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'customize' && activeSubTab === 'settings' && (
              <div className="space-y-6">
                {/* General Settings */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-6" style={{ color: GOLD }}>General</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">App Name</label>
                      <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Tagline</label>
                      <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Max Users</label>
                      <input type="number" value={maxUsers} onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">Maintenance Mode</span>
                        <motion.button whileHover={{ scale: 1.05 }} onClick={() => setMaintenanceMode(!maintenanceMode)} style={{ backgroundColor: maintenanceMode ? '#ef444444' : `${BORDER_COLOR}`, borderColor: maintenanceMode ? '#ef4444' : BORDER_COLOR, color: maintenanceMode ? '#ef4444' : TEXT_MUTED }} className="px-3 py-1 rounded-full text-xs font-semibold border">{maintenanceMode ? 'ON' : 'OFF'}</motion.button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">New Signups</span>
                        <motion.button whileHover={{ scale: 1.05 }} onClick={() => setSignupsEnabled(!signupsEnabled)} style={{ backgroundColor: signupsEnabled ? '#10b98144' : `${BORDER_COLOR}`, borderColor: signupsEnabled ? '#10b981' : BORDER_COLOR, color: signupsEnabled ? '#10b981' : TEXT_MUTED }} className="px-3 py-1 rounded-full text-xs font-semibold border">{signupsEnabled ? 'Enabled' : 'Disabled'}</motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Income & Payments */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.025 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Income & Payments</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Income settings and defaults for the platform</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Default Safe-to-Spend Buffer ($)</label>
                      <input type="number" value={defaultSafeToSpendBuffer} onChange={(e) => setDefaultSafeToSpendBuffer(parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                      <p style={{ color: TEXT_MUTED }} className="text-xs mt-1">Safety cushion subtracted from Safe to Spend calculation</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">Primary Income Source</span>
                        <span style={{ color: GOLD }} className="text-sm font-semibold">Incoming Payments</span>
                      </div>
                      <p style={{ color: TEXT_MUTED }} className="text-xs">All income is managed through Incoming Payments in Smart Stack. Check Projector is available as a standalone calculator.</p>
                    </div>
                  </div>
                </motion.div>

                {/* Onboarding Text */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Onboarding Message</h2>
                  <textarea value={onboardingText} onChange={(e) => setOnboardingText(e.target.value)} rows={3} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-3 rounded-lg border focus:outline-none resize-none" />
                  <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">Shown to new users after signup</p>
                </motion.div>

                {/* Budget Categories */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Budget Categories</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {budgetCategories.map((cat) => (
                      <span key={cat} style={{ backgroundColor: `${GOLD}22`, borderColor: `${GOLD}44`, color: GOLD }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border">
                        {cat}
                        <button onClick={() => handleRemoveCategory(cat)} className="ml-1 hover:opacity-70"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} placeholder="Add category..." style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="flex-1 px-4 py-2 rounded-lg border focus:outline-none" />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddCategory} style={{ backgroundColor: `${GOLD}22`, borderColor: GOLD, color: GOLD }} className="px-4 py-2 rounded-lg border font-medium text-sm">Add</motion.button>
                  </div>
                </motion.div>

                {/* Alert Thresholds */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Alert Thresholds</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Budget Warning (%)</label>
                      <input type="number" value={alertThresholds.budget} onChange={(e) => setAlertThresholds({ ...alertThresholds, budget: parseInt(e.target.value) || 0 })} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                      <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">Alert when user hits this % of their budget</p>
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Churn Risk (%)</label>
                      <input type="number" value={alertThresholds.churn} onChange={(e) => setAlertThresholds({ ...alertThresholds, churn: parseInt(e.target.value) || 0 })} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                      <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">Flag users inactive for this many days</p>
                    </div>
                  </div>
                </motion.div>

                {/* Feature Flags */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Feature Flags</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(featureFlags).map(([flag, enabled]) => (
                      <div key={flag} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center justify-between p-3 rounded-lg border">
                        <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium capitalize">{flag.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleFeatureToggle(flag)} style={{ backgroundColor: enabled ? '#10b98144' : `${BORDER_COLOR}`, borderColor: enabled ? '#10b981' : BORDER_COLOR, color: enabled ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{enabled ? 'ON' : 'OFF'}</motion.button>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Layout Style */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Layout Style</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Choose the primary navigation layout for the app</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([
                      { id: 'sidebar' as const, label: 'Sidebar', desc: 'Classic left sidebar navigation' },
                      { id: 'topnav' as const, label: 'Top Navigation', desc: 'Horizontal top bar navigation' },
                      { id: 'hybrid' as const, label: 'Hybrid', desc: 'Top bar + collapsible sidebar' },
                    ]).map((layout) => (
                      <motion.button
                        key={layout.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setLayoutStyle(layout.id)}
                        style={{
                          backgroundColor: layoutStyle === layout.id ? `${GOLD}22` : BG_DARK,
                          borderColor: layoutStyle === layout.id ? GOLD : BORDER_COLOR,
                        }}
                        className="p-4 rounded-lg border text-left transition-all"
                      >
                        <p className="font-medium text-sm" style={{ color: layoutStyle === layout.id ? GOLD : TEXT_PRIMARY }}>{layout.label}</p>
                        <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>{layout.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Button Placement Controls */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Button Placement</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Control where key UI buttons appear in the app</p>
                  <div className="space-y-4">
                    {([
                      { key: 'settingsBtn' as const, label: 'Settings Button', options: ['sidebar-bottom', 'topbar-right', 'hidden'] },
                      { key: 'themeToggle' as const, label: 'Theme Toggle', options: ['topbar-right', 'sidebar-bottom', 'settings-page', 'hidden'] },
                      { key: 'homeBtn' as const, label: 'Home Button', options: ['sidebar-top', 'topbar-left', 'hidden'] },
                    ]).map((control) => (
                      <div key={control.key} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, borderWidth: 1 }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: TEXT_PRIMARY }}>{control.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>Current: {buttonPlacements[control.key]}</p>
                        </div>
                        <select
                          value={buttonPlacements[control.key]}
                          onChange={(e) => setButtonPlacements({ ...buttonPlacements, [control.key]: e.target.value })}
                          style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                          className="px-3 py-1.5 rounded-lg border text-sm focus:outline-none"
                        >
                          {control.options.map((opt) => (
                            <option key={opt} value={opt}>{opt.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Save Button */}
                <div className="flex items-center gap-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveSettings} style={{ backgroundColor: GOLD, color: BG_DARK }} className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2"><Save size={18} /> Save All Settings</motion.button>
                  <AnimatePresence>
                    {settingsSaved && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ color: '#10b981' }} className="text-sm font-medium flex items-center gap-1"><CheckCircle size={16} /> Settings saved successfully</motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Security Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: '2FA Adoption', value: `${Math.round((users.filter((u) => u.twoFA).length / users.length) * 100)}%`, icon: Lock, color: '#10b981' },
                    { label: 'Active Sessions', value: users.filter((u) => u.status !== 'suspended').length, icon: Activity, color: GOLD },
                    { label: 'Suspended', value: userStats.suspended, icon: Ban, color: '#ef4444' },
                    { label: 'Admin Roles', value: adminRoles.length, icon: Key, color: '#8b5cf6' },
                  ].map((stat, idx) => {
                    const Icon = stat.icon
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2"><p style={{ color: TEXT_MUTED }} className="text-xs font-medium">{stat.label}</p><Icon size={16} style={{ color: stat.color }} /></div>
                        <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Security Settings */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-6" style={{ color: GOLD }}>Security Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <div><p style={{ color: TEXT_PRIMARY }} className="font-medium">Require 2FA for All Users</p><p style={{ color: TEXT_MUTED }} className="text-xs">Force two-factor authentication</p></div>
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => setTwoFARequired(!twoFARequired)} style={{ backgroundColor: twoFARequired ? '#10b98144' : BORDER_COLOR, borderColor: twoFARequired ? '#10b981' : BORDER_COLOR, color: twoFARequired ? '#10b981' : TEXT_MUTED }} className="px-3 py-1 rounded-full text-xs font-semibold border">{twoFARequired ? 'Required' : 'Optional'}</motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p style={{ color: TEXT_PRIMARY }} className="font-medium">Fraud Monitoring</p><p style={{ color: TEXT_MUTED }} className="text-xs">Auto-detect suspicious activity</p></div>
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => setFraudMonitoring(!fraudMonitoring)} style={{ backgroundColor: fraudMonitoring ? '#10b98144' : BORDER_COLOR, borderColor: fraudMonitoring ? '#10b981' : BORDER_COLOR, color: fraudMonitoring ? '#10b981' : TEXT_MUTED }} className="px-3 py-1 rounded-full text-xs font-semibold border">{fraudMonitoring ? 'Active' : 'Inactive'}</motion.button>
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">Session Timeout (min)</label>
                      <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                    </div>
                    <div>
                      <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">IP Whitelist (comma-separated)</label>
                      <input type="text" value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} placeholder="e.g. 192.168.1.1, 10.0.0.1" style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-4 py-2 rounded-lg border focus:outline-none" />
                    </div>
                  </div>
                </motion.div>

                {/* Admin Roles */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Admin Roles</h2>
                  <div className="space-y-3 mb-4">
                    {adminRoles.map((role) => (
                      <div key={role.id} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p style={{ color: TEXT_PRIMARY }} className="font-medium">{role.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {role.permissions.map((perm) => (
                              <span key={perm} style={{ backgroundColor: `${GOLD}11`, color: TEXT_MUTED }} className="text-xs px-2 py-0.5 rounded">{perm}</span>
                            ))}
                          </div>
                        </div>
                        {role.id !== 'super' && (
                          <button onClick={() => setAdminRoles(adminRoles.filter((r) => r.id !== role.id))} style={{ color: '#ef4444' }} className="p-1 hover:opacity-70"><Trash2 size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRole()} placeholder="New role name..." style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="flex-1 px-4 py-2 rounded-lg border focus:outline-none" />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddRole} style={{ backgroundColor: `${GOLD}22`, borderColor: GOLD, color: GOLD }} className="px-4 py-2 rounded-lg border font-medium text-sm">Add Role</motion.button>
                  </div>
                </motion.div>

                {/* Audit Log */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Audit Log</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottomColor: BORDER_COLOR }} className="border-b">
                          <th style={{ color: TEXT_MUTED }} className="px-4 py-3 text-left text-sm font-semibold">Admin</th>
                          <th style={{ color: TEXT_MUTED }} className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                          <th style={{ color: TEXT_MUTED }} className="px-4 py-3 text-left text-sm font-semibold">Target</th>
                          <th style={{ color: TEXT_MUTED }} className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                          <th style={{ color: TEXT_MUTED }} className="px-4 py-3 text-left text-sm font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.map((entry) => (
                          <tr key={entry.id} style={{ borderBottomColor: BORDER_COLOR }} className="border-b">
                            <td className="px-4 py-3 text-sm">{entry.admin}</td>
                            <td className="px-4 py-3"><span style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }} className="text-xs px-2 py-1 rounded-full font-medium">{entry.action}</span></td>
                            <td style={{ color: TEXT_SECONDARY }} className="px-4 py-3 text-sm">{entry.target}</td>
                            <td style={{ color: TEXT_MUTED }} className="px-4 py-3 text-sm">{entry.timestamp}</td>
                            <td style={{ color: TEXT_MUTED }} className="px-4 py-3 text-sm">{entry.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {auditLog.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-center py-8">No audit entries yet</p>}
                </motion.div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Revenue Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'MRR Growth', value: `+${analyticsData.mrrGrowth}%`, icon: TrendingUp, color: '#10b981' },
                    { label: 'ARR Growth', value: `+${analyticsData.arrGrowth}%`, icon: DollarSign, color: GOLD },
                    { label: 'Churn Rate', value: `${analyticsData.churnRate}%`, icon: AlertTriangle, color: '#ef4444' },
                    { label: 'Avg LTV', value: `$${analyticsData.ltv.toFixed(0)}`, icon: Activity, color: '#8b5cf6' },
                  ].map((card, idx) => {
                    const Icon = card.icon
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2"><p style={{ color: TEXT_MUTED }} className="text-xs font-medium">{card.label}</p><Icon size={16} style={{ color: card.color }} /></div>
                        <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                      </motion.div>
                    )
                  })}
                </div>

                {/* User Growth Chart - Coming Soon */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-1" style={{ color: GOLD }}>User Growth (Last 6 Months)</h2>
                      <p style={{ color: TEXT_SECONDARY }} className="text-sm">Historical chart data coming soon</p>
                    </div>
                    <div style={{ backgroundColor: GOLD + '22', color: GOLD }} className="px-4 py-2 rounded-full text-xs font-semibold">Coming Soon</div>
                  </div>
                </motion.div>

                {/* Feature Usage - Coming Soon */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-1" style={{ color: GOLD }}>Feature Usage</h2>
                      <p style={{ color: TEXT_SECONDARY }} className="text-sm">User engagement metrics coming soon</p>
                    </div>
                    <div style={{ backgroundColor: GOLD + '22', color: GOLD }} className="px-4 py-2 rounded-full text-xs font-semibold">Coming Soon</div>
                  </div>
                </motion.div>

                {/* Conversion & Retention - Coming Soon */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-1" style={{ color: GOLD }}>Conversion Rates & Platform Stats</h2>
                      <p style={{ color: TEXT_SECONDARY }} className="text-sm">Detailed analytics coming soon</p>
                    </div>
                    <div style={{ backgroundColor: GOLD + '22', color: GOLD }} className="px-4 py-2 rounded-full text-xs font-semibold">Coming Soon</div>
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'notifications' && (
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
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2"><p style={{ color: TEXT_MUTED }} className="text-xs font-medium">{stat.label}</p><Icon size={16} style={{ color: stat.color }} /></div>
                        <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Notification Templates */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Notification Templates</h2>
                  <div className="space-y-3">
                    {notifTemplates.map((tmpl) => (
                      <div key={tmpl.id} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium" style={{ color: TEXT_PRIMARY }}>{tmpl.name}</span>
                            <span style={{ backgroundColor: tmpl.channel === 'email' ? '#3b82f622' : tmpl.channel === 'push' ? '#f59e0b22' : '#10b98122', color: tmpl.channel === 'email' ? '#3b82f6' : tmpl.channel === 'push' ? '#f59e0b' : '#10b981' }} className="text-xs px-2 py-0.5 rounded-full capitalize">{tmpl.channel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => setNotifTemplates(notifTemplates.map((t) => t.id === tmpl.id ? { ...t, enabled: !t.enabled } : t))} style={{ backgroundColor: tmpl.enabled ? '#10b98144' : BORDER_COLOR, borderColor: tmpl.enabled ? '#10b981' : BORDER_COLOR, color: tmpl.enabled ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{tmpl.enabled ? 'Active' : 'Off'}</motion.button>
                            <button onClick={() => setEditingTemplateId(editingTemplateId === tmpl.id ? null : tmpl.id)} style={{ color: GOLD }} className="p-1 hover:opacity-70"><Edit3 size={16} /></button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {editingTemplateId === tmpl.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pt-3 space-y-3" style={{ borderTopColor: BORDER_COLOR }}>
                                <div>
                                  <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">Subject</label>
                                  <input type="text" value={tmpl.subject} onChange={(e) => setNotifTemplates(notifTemplates.map((t) => t.id === tmpl.id ? { ...t, subject: e.target.value } : t))} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-3 py-2 rounded-lg border focus:outline-none text-sm" />
                                </div>
                                <div>
                                  <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">Body</label>
                                  <textarea value={tmpl.body} onChange={(e) => setNotifTemplates(notifTemplates.map((t) => t.id === tmpl.id ? { ...t, body: e.target.value } : t))} rows={2} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full px-3 py-2 rounded-lg border focus:outline-none text-sm resize-none" />
                                </div>
                                <div>
                                  <label style={{ color: TEXT_MUTED }} className="block text-xs mb-1">Channel</label>
                                  <select value={tmpl.channel} onChange={(e) => setNotifTemplates(notifTemplates.map((t) => t.id === tmpl.id ? { ...t, channel: e.target.value } : t))} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="px-3 py-2 rounded-lg border focus:outline-none text-sm">
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Sent History</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-center py-8">No notifications sent yet</p>
                </motion.div>
              </div>
            )}

            {activeTab === 'modules' && activeSubTab === 'modules' && (
              <div className="space-y-6">
                {/* Module Toggle Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((mod, idx) => (
                    <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} style={{ backgroundColor: BG_CARD, borderColor: mod.enabled ? `${GOLD}66` : BORDER_COLOR }} className="rounded-lg border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Puzzle size={20} style={{ color: mod.enabled ? GOLD : TEXT_MUTED }} />
                          <h3 className="text-lg font-bold" style={{ color: mod.enabled ? TEXT_PRIMARY : TEXT_MUTED }}>{mod.name}</h3>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleToggle(mod.id)} style={{ backgroundColor: mod.enabled ? '#10b98144' : BORDER_COLOR, borderColor: mod.enabled ? '#10b981' : BORDER_COLOR, color: mod.enabled ? '#10b981' : TEXT_MUTED }} className="px-3 py-1 rounded-full text-xs font-semibold border">{mod.enabled ? 'Enabled' : 'Disabled'}</motion.button>
                      </div>

                      {mod.enabled && moduleConfigs[mod.id] && (
                        <div className="space-y-3 pt-4" style={{ borderTopColor: BORDER_COLOR, borderTopWidth: 1 }}>
                          {mod.id === 'smart-stack' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Default Bills/Rent %</span>
                                <input type="number" value={moduleConfigs[mod.id].defaultAllocBR} onChange={(e) => handleModuleConfigChange(mod.id, 'defaultAllocBR', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Default Savings %</span>
                                <input type="number" value={moduleConfigs[mod.id].defaultAllocSR} onChange={(e) => handleModuleConfigChange(mod.id, 'defaultAllocSR', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Default Spending %</span>
                                <input type="number" value={moduleConfigs[mod.id].defaultAllocSP} onChange={(e) => handleModuleConfigChange(mod.id, 'defaultAllocSP', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Auto-Lock Budget</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'autoLockBudget', !moduleConfigs[mod.id].autoLockBudget)} style={{ backgroundColor: moduleConfigs[mod.id].autoLockBudget ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].autoLockBudget ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].autoLockBudget ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].autoLockBudget ? 'ON' : 'OFF'}</motion.button>
                              </div>
                            </>
                          )}
                          {mod.id === 'bill-boss' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Reminder Days Before Due</span>
                                <input type="number" value={moduleConfigs[mod.id].reminderDays} onChange={(e) => handleModuleConfigChange(mod.id, 'reminderDays', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Late Fee Alert</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'lateFeeAlert', !moduleConfigs[mod.id].lateFeeAlert)} style={{ backgroundColor: moduleConfigs[mod.id].lateFeeAlert ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].lateFeeAlert ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].lateFeeAlert ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].lateFeeAlert ? 'ON' : 'OFF'}</motion.button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Receipt Upload</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'receiptUploadEnabled', !moduleConfigs[mod.id].receiptUploadEnabled)} style={{ backgroundColor: moduleConfigs[mod.id].receiptUploadEnabled ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].receiptUploadEnabled ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].receiptUploadEnabled ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].receiptUploadEnabled ? 'ON' : 'OFF'}</motion.button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Rent Tracker</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'rentTrackerEnabled', !moduleConfigs[mod.id].rentTrackerEnabled)} style={{ backgroundColor: moduleConfigs[mod.id].rentTrackerEnabled ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].rentTrackerEnabled ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].rentTrackerEnabled ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].rentTrackerEnabled ? 'ON' : 'OFF'}</motion.button>
                              </div>
                            </>
                          )}
                          {mod.id === 'stack-circle' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Max Group Size</span>
                                <input type="number" value={moduleConfigs[mod.id].maxGroupSize} onChange={(e) => handleModuleConfigChange(mod.id, 'maxGroupSize', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Max Groups Per User</span>
                                <input type="number" value={moduleConfigs[mod.id].maxGroups} onChange={(e) => handleModuleConfigChange(mod.id, 'maxGroups', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Content Moderation</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'moderationEnabled', !moduleConfigs[mod.id].moderationEnabled)} style={{ backgroundColor: moduleConfigs[mod.id].moderationEnabled ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].moderationEnabled ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].moderationEnabled ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].moderationEnabled ? 'ON' : 'OFF'}</motion.button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Invite Only</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'inviteOnly', !moduleConfigs[mod.id].inviteOnly)} style={{ backgroundColor: moduleConfigs[mod.id].inviteOnly ? '#f59e0b44' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].inviteOnly ? '#f59e0b' : BORDER_COLOR, color: moduleConfigs[mod.id].inviteOnly ? '#f59e0b' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].inviteOnly ? 'ON' : 'OFF'}</motion.button>
                              </div>
                            </>
                          )}
                          {mod.id === 'task-lists' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Max To-Do Items</span>
                                <input type="number" value={moduleConfigs[mod.id].maxTodoItems} onChange={(e) => handleModuleConfigChange(mod.id, 'maxTodoItems', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Max Grocery Lists</span>
                                <input type="number" value={moduleConfigs[mod.id].maxGroceryLists} onChange={(e) => handleModuleConfigChange(mod.id, 'maxGroceryLists', parseInt(e.target.value) || 0)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-20 px-2 py-1 rounded border text-sm text-right focus:outline-none" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Meeting Reminders</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'meetingReminders', !moduleConfigs[mod.id].meetingReminders)} style={{ backgroundColor: moduleConfigs[mod.id].meetingReminders ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].meetingReminders ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].meetingReminders ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].meetingReminders ? 'ON' : 'OFF'}</motion.button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Quick Notes</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'quickNotes', !moduleConfigs[mod.id].quickNotes)} style={{ backgroundColor: moduleConfigs[mod.id].quickNotes ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].quickNotes ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].quickNotes ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].quickNotes ? 'ON' : 'OFF'}</motion.button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ color: TEXT_SECONDARY }} className="text-sm">Task Sharing</span>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleModuleConfigChange(mod.id, 'taskSharing', !moduleConfigs[mod.id].taskSharing)} style={{ backgroundColor: moduleConfigs[mod.id].taskSharing ? '#10b98144' : BORDER_COLOR, borderColor: moduleConfigs[mod.id].taskSharing ? '#10b981' : BORDER_COLOR, color: moduleConfigs[mod.id].taskSharing ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border">{moduleConfigs[mod.id].taskSharing ? 'ON' : 'OFF'}</motion.button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Stack Circle Moderation */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>Stack Circle Groups</h2>
                  <div className="space-y-3">
                    {stackCircleGroups.map((group) => (
                      <div key={group.id} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p style={{ color: TEXT_PRIMARY }} className="font-medium">{group.name}</p>
                          <p style={{ color: TEXT_MUTED }} className="text-xs">{group.members} members</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ backgroundColor: group.status === 'active' ? '#10b98122' : '#ef444422', color: group.status === 'active' ? '#10b981' : '#ef4444' }} className="text-xs px-2 py-1 rounded-full font-medium capitalize">{group.status}</span>
                          <button onClick={() => setStackCircleGroups(stackCircleGroups.map((g) => g.id === group.id ? { ...g, status: g.status === 'active' ? 'suspended' : 'active' } : g))} style={{ color: TEXT_MUTED }} className="p-1 hover:opacity-70"><Ban size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                {/* User Lookup */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: GOLD }}>User Lookup</h2>
                  <div className="relative mb-4">
                    <Search size={18} style={{ color: TEXT_MUTED }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search by name or email..." value={supportSearch} onChange={(e) => setSupportSearch(e.target.value)} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    {supportFilteredUsers.map((user) => (
                      <motion.div key={user.id} whileHover={{ scale: 1.005 }} onClick={() => setSelectedSupportUser(selectedSupportUser === user.id ? null : user.id)} style={{ backgroundColor: selectedSupportUser === user.id ? `${GOLD}11` : BG_DARK, borderColor: selectedSupportUser === user.id ? `${GOLD}44` : BORDER_COLOR, cursor: 'pointer' }} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div style={{ backgroundColor: `${GOLD}22`, width: 36, height: 36 }} className="rounded-full flex items-center justify-center"><span style={{ color: GOLD }} className="text-sm font-bold">{user.name.charAt(0)}</span></div>
                            <div>
                              <p style={{ color: TEXT_PRIMARY }} className="font-medium">{user.name}</p>
                              <p style={{ color: TEXT_MUTED }} className="text-xs">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ backgroundColor: user.status === 'active' ? '#10b98144' : user.status === 'trial' ? '#f59e0b44' : user.status === 'premium' ? '#8b5cf644' : user.status === 'founding' ? `${GOLD}44` : '#ef444444', color: user.status === 'active' ? '#10b981' : user.status === 'trial' ? '#f59e0b' : user.status === 'premium' ? '#8b5cf6' : user.status === 'founding' ? GOLD : '#ef4444' }} className="text-xs px-2 py-1 rounded-full font-medium capitalize">{user.status}</span>
                            <Eye size={16} style={{ color: TEXT_MUTED }} />
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedSupportUser === user.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-4 pt-4 space-y-4" style={{ borderTopColor: BORDER_COLOR, borderTopWidth: 1 }}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div><p style={{ color: TEXT_MUTED }} className="text-xs">Joined</p><p style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">{user.joinDate}</p></div>
                                  <div><p style={{ color: TEXT_MUTED }} className="text-xs">Last Active</p><p style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">{user.lastActive}</p></div>
                                  <div><p style={{ color: TEXT_MUTED }} className="text-xs">Credit Score</p><p style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">{user.creditScore}</p></div>
                                  <div><p style={{ color: TEXT_MUTED }} className="text-xs">2FA</p><p style={{ color: user.twoFA ? '#10b981' : '#ef4444' }} className="text-sm font-medium">{user.twoFA ? 'Enabled' : 'Disabled'}</p></div>
                                </div>
                                <div>
                                  <p style={{ color: TEXT_MUTED }} className="text-xs mb-2">Activity Log</p>
                                  <div className="space-y-1">
                                    {user.activityLog.map((log, i) => (
                                      <div key={i} style={{ backgroundColor: BG_CARD }} className="flex items-center justify-between px-3 py-2 rounded text-sm">
                                        <span style={{ color: TEXT_PRIMARY }}>{log.action}</span>
                                        <div className="flex items-center gap-3">
                                          <span style={{ color: TEXT_MUTED }} className="text-xs">{log.detail}</span>
                                          <span style={{ color: TEXT_MUTED }} className="text-xs">{log.date}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p style={{ color: TEXT_MUTED }} className="text-xs mb-2">Internal Notes</p>
                                  {supportNotes[user.id] && <p style={{ color: TEXT_SECONDARY, backgroundColor: BG_CARD }} className="text-sm p-3 rounded mb-2">{supportNotes[user.id]}</p>}
                                  <div className="flex gap-2">
                                    <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR, color: TEXT_PRIMARY }} className="flex-1 px-3 py-2 rounded-lg border focus:outline-none text-sm" />
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if (newNote.trim()) { setSupportNotes({ ...supportNotes, [user.id]: (supportNotes[user.id] ? supportNotes[user.id] + '\n' : '') + newNote.trim() }); setNewNote('') } }} style={{ backgroundColor: `${GOLD}22`, borderColor: GOLD, color: GOLD }} className="px-3 py-2 rounded-lg border font-medium text-sm">Save</motion.button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'billing-subs' && activeSubTab === 'billing' && (
              <div className="space-y-6">
                {/* Billing Coming Soon */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Invoices & Billing</h2>
                      <p style={{ color: TEXT_SECONDARY }} className="text-sm">Integration with Stripe and invoice tracking coming soon</p>
                    </div>
                    <div style={{ backgroundColor: GOLD + '22', color: GOLD }} className="px-4 py-2 rounded-full text-xs font-semibold">Coming Soon</div>
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'customize' && activeSubTab === 'theme' && (
              <div className="space-y-6">
                {/* Theme Selector */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Admin Panel Theme</h2>
                    <p style={{ color: TEXT_SECONDARY }} className="text-sm">Customize the appearance of the admin panel only (this doesn't affect the user-facing app theme)</p>
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm">Current theme:</span>
                    <span style={{ color: adminTheme.text }} className="text-sm font-semibold">
                      {adminTheme.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allThemes.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setAdminThemeId(t.id)}
                        className="cursor-pointer rounded-xl p-3 transition-all border-2"
                        style={{
                          borderColor: adminThemeId === t.id ? t.accent : adminTheme.border,
                          backgroundColor: adminTheme.card,
                        }}
                      >
                        {/* Mini preview */}
                        <div className="rounded-lg overflow-hidden mb-3 h-24" style={{ backgroundColor: t.bg }}>
                          <div className="p-2 space-y-1.5">
                            <div className="h-2 w-12 rounded" style={{ backgroundColor: t.accent }} />
                            <div className="flex gap-1.5">
                              <div className="h-8 flex-1 rounded" style={{ backgroundColor: t.card }} />
                              <div className="h-8 flex-1 rounded" style={{ backgroundColor: t.card }} />
                            </div>
                            <div className="h-3 w-16 rounded" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                          </div>
                        </div>
                        {/* Name + checkmark */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: adminTheme.text }}>{t.name}</p>
                          {adminThemeId === t.id && <Check size={16} style={{ color: t.accent }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* ─── Branding: Logo Management ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-xl p-6 border"
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                >
                  <h3 className="text-xl font-bold mb-1" style={{ color: GOLD }}>Logo Management</h3>
                  <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>Upload a new logo to update it across the entire app — login page, sidebar, and admin header.</p>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Current Logo Preview */}
                    <div className="flex-shrink-0">
                      <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Current Logo</p>
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden" style={{ borderColor: BORDER_COLOR, backgroundColor: BG_DARK }}>
                        <img src={customLogo || '/logo.svg'} alt="Current Logo" className="w-20 h-20 object-contain" />
                      </div>
                      {customLogo && (
                        <button
                          onClick={resetLogo}
                          className="mt-2 text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                          style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>

                    {/* Upload Section */}
                    <div className="flex-1 space-y-4">
                      <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Upload New Logo</p>
                      <div
                        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-opacity-60"
                        style={{ borderColor: GOLD + '40', backgroundColor: GOLD + '05' }}
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                      >
                        <Upload size={32} className="mx-auto mb-3" style={{ color: GOLD }} />
                        <p className="text-sm font-medium mb-1" style={{ color: TEXT_PRIMARY }}>Click to upload</p>
                        <p className="text-xs" style={{ color: TEXT_MUTED }}>SVG, PNG, or JPG (recommended: 200×200px)</p>
                        <input
                          id="logo-upload-input"
                          type="file"
                          accept="image/svg+xml,image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleLogoUpload(file);
                            }
                          }}
                        />
                      </div>

                      {/* Logo Locations */}
                      <div className="rounded-lg p-4 border" style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }}>
                        <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Updates Applied To</p>
                        <div className="space-y-2">
                          {[
                            { location: 'Login Page', desc: 'Main logo above sign-in form', file: '/logo.svg' },
                            { location: 'Signup Page', desc: 'Logo on registration screens', file: '/logo.svg' },
                            { location: 'Sidebar', desc: 'Navigation sidebar header logo', file: '/logo.svg' },
                            { location: 'Admin Header', desc: 'Admin console shield icon', file: '/logo.svg' },
                            { location: 'Favicon', desc: 'Browser tab icon', file: '/logo-sm.png' },
                          ].map((item) => (
                            <div key={item.location} className="flex items-center justify-between py-1.5">
                              <div>
                                <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{item.location}</p>
                                <p className="text-xs" style={{ color: TEXT_MUTED }}>{item.desc}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>Active</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Default User Theme — admin controls which theme new users get */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-xl p-6 border"
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                >
                  <h3 className="text-xl font-bold mb-1" style={{ color: GOLD }}>Default User Theme</h3>
                  <p className="text-sm mb-4" style={{ color: TEXT_MUTED }}>Set the default theme for new users and the live site. Users can still change their own theme.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allThemes.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setDefaultUserTheme(t.id)}
                        className="cursor-pointer rounded-lg p-3 transition-all border-2"
                        style={{
                          borderColor: defaultUserTheme === t.id ? t.accent : BORDER_COLOR,
                          backgroundColor: BG_DARK,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.accent }} />
                          <p className="text-sm font-medium" style={{ color: defaultUserTheme === t.id ? t.accent : TEXT_PRIMARY }}>{t.name}</p>
                          {defaultUserTheme === t.id && <Check size={14} style={{ color: t.accent }} className="ml-auto" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Brand Colors Overview */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl p-6 border"
                  style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
                >
                  <h3 className="text-xl font-bold mb-1" style={{ color: GOLD }}>Brand Colors</h3>
                  <p className="text-sm mb-4" style={{ color: TEXT_MUTED }}>Current theme palette colors.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'Accent', hex: adminTheme.accent },
                      { name: 'Background', hex: adminTheme.bg },
                      { name: 'Card', hex: adminTheme.card },
                      { name: 'Border', hex: adminTheme.border },
                    ].map((c) => (
                      <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: BORDER_COLOR }}>
                        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: c.hex }} />
                        <div>
                          <p className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{c.name}</p>
                          <p className="text-xs font-mono" style={{ color: TEXT_MUTED }}>{c.hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'customize' && activeSubTab === 'navigation' && (
              <div className="space-y-6">
                {/* Nav Editor */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Tab Order & Names</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-sm mb-6">Reorder, rename, or hide main navigation tabs</p>
                  <div className="space-y-2">
                    {navItems.map((item, index) => (
                      <motion.div key={item.id} layout style={{ backgroundColor: BG_DARK, borderColor: editingNavItem === item.id ? `${GOLD}66` : BORDER_COLOR, opacity: item.visible ? 1 : 0.5 }} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <GripVertical size={18} style={{ color: TEXT_MUTED }} />
                          <span style={{ color: TEXT_MUTED }} className="text-xs font-mono w-6">{index + 1}</span>
                          {editingNavItem === item.id ? (
                            <input type="text" value={item.label} onChange={(e) => setNavItems(navItems.map((n) => n.id === item.id ? { ...n, label: e.target.value } : n))} onBlur={() => setEditingNavItem(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingNavItem(null)} autoFocus style={{ backgroundColor: BG_CARD, borderColor: GOLD, color: TEXT_PRIMARY }} className="px-3 py-1 rounded border focus:outline-none text-sm" />
                          ) : (
                            <span style={{ color: TEXT_PRIMARY }} className="font-medium">{item.label}</span>
                          )}
                          <span style={{ color: TEXT_MUTED }} className="text-xs font-mono">/{item.id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingNavItem(editingNavItem === item.id ? null : item.id)} style={{ color: GOLD }} className="p-1.5 rounded hover:opacity-70"><Edit3 size={14} /></button>
                          <button onClick={() => handleNavItemReorder(item.id, 'up')} disabled={index === 0} style={{ color: index === 0 ? BORDER_COLOR : TEXT_SECONDARY }} className="p-1.5 rounded hover:opacity-70"><ChevronUp size={14} /></button>
                          <button onClick={() => handleNavItemReorder(item.id, 'down')} disabled={index === navItems.length - 1} style={{ color: index === navItems.length - 1 ? BORDER_COLOR : TEXT_SECONDARY }} className="p-1.5 rounded hover:opacity-70"><ChevronDown size={14} /></button>
                          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setNavItems(navItems.map((n) => n.id === item.id ? { ...n, visible: !n.visible } : n))} style={{ backgroundColor: item.visible ? '#10b98144' : BORDER_COLOR, borderColor: item.visible ? '#10b981' : BORDER_COLOR, color: item.visible ? '#10b981' : TEXT_MUTED }} className="px-2 py-0.5 rounded-full text-xs font-semibold border ml-2">{item.visible ? 'Visible' : 'Hidden'}</motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Preview */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-lg font-bold mb-4" style={{ color: GOLD }}>Navigation Preview</h2>
                  <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                    <div className="flex flex-wrap gap-2">
                      {navItems.filter((n) => n.visible).map((item) => (
                        <span key={item.id} style={{ backgroundColor: `${GOLD}22`, borderColor: `${GOLD}44`, color: GOLD }} className="px-4 py-2 rounded-lg text-sm font-medium border">{item.label}</span>
                      ))}
                    </div>
                    {navItems.some((n) => !n.visible) && (
                      <div className="mt-3 pt-3" style={{ borderTopColor: BORDER_COLOR, borderTopWidth: 1 }}>
                        <p style={{ color: TEXT_MUTED }} className="text-xs mb-2">Hidden tabs:</p>
                        <div className="flex flex-wrap gap-2">
                          {navItems.filter((n) => !n.visible).map((item) => (
                            <span key={item.id} style={{ backgroundColor: BORDER_COLOR, color: TEXT_MUTED }} className="px-3 py-1.5 rounded-lg text-xs">{item.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === 'modules' && activeSubTab === 'tasklist' && (
              <div className="space-y-6">
                {/* Task List Overview */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Task List & Reminders</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-sm mb-6">Manage the task list feature settings and view usage analytics</p>

                  {/* Feature Stats — live from user data */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Active Users', value: String(users.filter(u => u.status !== 'suspended').length), icon: Users, color: GOLD },
                      { label: 'Total Tasks', value: String(platformMetrics.totalBills + platformMetrics.totalExpenses), icon: ListTodo, color: '#10b981' },
                      { label: 'Active Modules', value: String(modules.filter(m => m.enabled).length), icon: FileText, color: '#8b5cf6' },
                      { label: 'Feature Flags', value: String(Object.values(featureFlags).filter(Boolean).length), icon: ShoppingCart, color: '#3b82f6' },
                    ].map((stat) => {
                      const Icon = stat.icon
                      return (
                        <div key={stat.label} style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="rounded-lg border p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon size={16} style={{ color: stat.color }} />
                            <span className="text-xs" style={{ color: TEXT_MUTED }}>{stat.label}</span>
                          </div>
                          <p className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>{stat.value}</p>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Feature Configuration */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-lg font-bold mb-4" style={{ color: GOLD }}>Feature Configuration</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'To-Do Lists', desc: 'Allow users to create and manage to-do items with priorities', key: 'taskLists' as const, configKey: null },
                      { label: 'Grocery Lists', desc: 'Enable grocery list tracking with categories', key: null, configKey: 'maxGroceryLists' },
                      { label: 'Meeting Reminders', desc: 'Meeting scheduling with date/time and reminders', key: null, configKey: 'meetingReminders' },
                      { label: 'Quick Notes', desc: 'Color-coded sticky notes for quick thoughts', key: null, configKey: 'quickNotes' },
                      { label: 'Task Sharing', desc: 'Allow users to share task lists with Stack Circle members', key: null, configKey: 'taskSharing' },
                      { label: 'Calendar Sync', desc: 'Sync tasks and meetings with dashboard calendar', key: 'calendarSync' as const, configKey: 'calendarSync' },
                    ].map((feature) => {
                      const enabled = feature.key ? featureFlags[feature.key] : feature.configKey ? !!moduleConfigs['task-lists']?.[feature.configKey] : false
                      return (
                        <div key={feature.label} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR, borderWidth: 1 }}>
                          <div>
                            <p className="font-medium text-sm" style={{ color: TEXT_PRIMARY }}>{feature.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{feature.desc}</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => {
                              if (feature.key) handleFeatureToggle(feature.key)
                              else if (feature.configKey) handleModuleConfigChange('task-lists', feature.configKey, !moduleConfigs['task-lists']?.[feature.configKey])
                            }}
                            style={{ backgroundColor: enabled ? '#10b98144' : BORDER_COLOR, borderColor: enabled ? '#10b981' : BORDER_COLOR, color: enabled ? '#10b981' : TEXT_MUTED }}
                            className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                          >
                            {enabled ? 'ON' : 'OFF'}
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Recent Activity — populated from audit log */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-lg font-bold mb-4" style={{ color: GOLD }}>Recent Task Activity</h2>
                  {auditLog.length > 0 ? (
                    <div className="space-y-3">
                      {auditLog.slice(0, 5).map((entry, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: BG_DARK }}>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${GOLD}15` }}>
                            <Activity size={14} style={{ color: GOLD }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: TEXT_PRIMARY }}>
                              <span className="font-semibold">{entry.admin}</span>{' '}
                              <span style={{ color: TEXT_SECONDARY }}>{entry.action} — {entry.target}</span>
                            </p>
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: TEXT_MUTED }}>{entry.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: TEXT_MUTED }} className="text-center py-6 text-sm">Activity will appear here as users interact with the platform</p>
                  )}
                </motion.div>

                {/* Category Limits */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }} className="rounded-lg border p-6">
                  <h2 className="text-lg font-bold mb-4" style={{ color: GOLD }}>Category Limits</h2>
                  <p style={{ color: TEXT_MUTED }} className="text-sm mb-4">Set maximum items per category for each plan</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottomColor: BORDER_COLOR }} className="border-b">
                          <th className="text-left py-3 text-xs font-medium" style={{ color: TEXT_MUTED }}>Category</th>
                          <th className="text-center py-3 text-xs font-medium" style={{ color: TEXT_MUTED }}>Trial</th>
                          <th className="text-center py-3 text-xs font-medium" style={{ color: TEXT_MUTED }}>Premium</th>
                          <th className="text-center py-3 text-xs font-medium" style={{ color: TEXT_MUTED }}>Founding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { cat: 'To-Do Items', trial: '25', premium: '100', founding: 'Unlimited' },
                          { cat: 'Grocery Lists', trial: '5', premium: '20', founding: 'Unlimited' },
                          { cat: 'Meetings', trial: '10', premium: '50', founding: 'Unlimited' },
                          { cat: 'Notes', trial: '10', premium: '50', founding: 'Unlimited' },
                        ].map((row) => (
                          <tr key={row.cat} style={{ borderBottomColor: BORDER_COLOR }} className="border-b last:border-b-0">
                            <td className="py-3 text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{row.cat}</td>
                            <td className="py-3 text-center text-sm" style={{ color: TEXT_SECONDARY }}>{row.trial}</td>
                            <td className="py-3 text-center text-sm" style={{ color: TEXT_SECONDARY }}>{row.premium}</td>
                            <td className="py-3 text-center text-sm" style={{ color: GOLD }}>{row.founding}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_COLOR }}
              className="rounded-xl border shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full" style={{ backgroundColor: '#ef444422' }}>
                  <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  Delete User
                </h3>
              </div>
              <p style={{ color: TEXT_SECONDARY }} className="mb-2">
                Are you sure you want to permanently delete this user?
              </p>
              <div style={{ backgroundColor: BG_DARK, borderColor: BORDER_COLOR }} className="rounded-lg border p-3 mb-4">
                <p className="font-medium" style={{ color: TEXT_PRIMARY }}>{deleteConfirm.userName}</p>
                <p className="text-sm" style={{ color: TEXT_MUTED }}>{deleteConfirm.userEmail}</p>
              </div>
              <p style={{ color: '#ef4444' }} className="text-sm mb-6">
                This action cannot be undone. All user data will be permanently removed.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  style={{ borderColor: BORDER_COLOR, color: TEXT_PRIMARY }}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  style={{ backgroundColor: '#ef4444' }}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <RefreshCw size={14} />
                      </motion.div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Delete User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
