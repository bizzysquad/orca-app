'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle, X, Upload, GripVertical, Edit3, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import { ThemeConfig, NavItem, GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  activeSubTab: string | null
  // Settings
  appName: string
  setAppName: (v: string) => void
  tagline: string
  setTagline: (v: string) => void
  maintenanceMode: boolean
  setMaintenanceMode: (v: boolean) => void
  signupsEnabled: boolean
  setSignupsEnabled: (v: boolean) => void
  maxUsers: number
  setMaxUsers: (v: number) => void
  settingsSaved: boolean
  handleSaveSettings: () => void
  budgetCategories: string[]
  handleAddCategory: () => void
  handleRemoveCategory: (cat: string) => void
  newCategory: string
  setNewCategory: (v: string) => void
  alertThresholds: { budget: number; churn: number }
  setAlertThresholds: (v: { budget: number; churn: number }) => void
  featureFlags: Record<string, boolean>
  handleFeatureToggle: (flag: string) => void
  onboardingText: string
  setOnboardingText: (v: string) => void
  // Theme
  themeConfig: ThemeConfig
  handleThemeColorChange: (key: keyof ThemeConfig, value: string) => void
  themePresets: Array<{ name: string; primary: string; bg: string; card: string; border: string }>
  handleApplyThemePreset: (preset: { name: string; primary: string; bg: string; card: string; border: string }) => void
  getComplementary: (hex: string) => string
  getContrastRatio: (hex1: string, hex2: string) => string
  // Navigation
  navItems: NavItem[]
  setNavItems: (items: NavItem[]) => void
  editingNavItem: string | null
  setEditingNavItem: (id: string | null) => void
  handleNavItemReorder: (itemId: string, direction: 'up' | 'down') => void
}

export default function CustomizeTab(props: Props) {
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  useEffect(() => {
    setCustomLogo(localStorage.getItem('orca-custom-logo') || null)
    const handler = (e: any) => setCustomLogo(e.detail?.logo || null)
    window.addEventListener('orca-logo-updated', handler)
    return () => window.removeEventListener('orca-logo-updated', handler)
  }, [])

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setCustomLogo(dataUrl)
      localStorage.setItem('orca-custom-logo', dataUrl)
      window.dispatchEvent(new CustomEvent('orca-logo-updated', { detail: { logo: dataUrl } }))
    }
    reader.readAsDataURL(file)
  }

  const resetLogo = () => {
    setCustomLogo(null)
    localStorage.removeItem('orca-custom-logo')
    window.dispatchEvent(new CustomEvent('orca-logo-updated', { detail: { logo: null } }))
  }

  return (
    <>
      {/* Settings Sub-Tab */}
      <AnimatePresence mode="wait">
        {props.activeSubTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* General Settings Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                General Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={props.appName}
                    onChange={(e) => props.setAppName(e.target.value)}
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                      color: TEXT_PRIMARY,
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={props.tagline}
                    onChange={(e) => props.setTagline(e.target.value)}
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                      color: TEXT_PRIMARY,
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={props.maxUsers}
                    onChange={(e) => props.setMaxUsers(parseInt(e.target.value) || 0)}
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                      color: TEXT_PRIMARY,
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={props.maintenanceMode}
                      onChange={(e) => props.setMaintenanceMode(e.target.checked)}
                      className="rounded"
                    />
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                      Maintenance Mode
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={props.signupsEnabled}
                      onChange={(e) => props.setSignupsEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                      New Signups
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Onboarding Message Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Onboarding Message
              </h3>
              <textarea
                value={props.onboardingText}
                onChange={(e) => props.setOnboardingText(e.target.value)}
                style={{
                  backgroundColor: BG_DARK,
                  borderColor: BORDER_COLOR,
                  color: TEXT_PRIMARY,
                }}
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                rows={4}
              />
              <p style={{ color: TEXT_MUTED }} className="text-xs mt-2">
                This message appears when new users log in for the first time.
              </p>
            </motion.div>

            {/* Budget Categories Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Budget Categories
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {props.budgetCategories.map((cat) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                      backgroundColor: GOLD,
                      color: BG_DARK,
                    }}
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {cat}
                    <button
                      onClick={() => props.handleRemoveCategory(cat)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={props.newCategory}
                  onChange={(e) => props.setNewCategory(e.target.value)}
                  placeholder="Enter category name..."
                  style={{
                    backgroundColor: BG_DARK,
                    borderColor: BORDER_COLOR,
                    color: TEXT_PRIMARY,
                  }}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={props.handleAddCategory}
                  style={{
                    backgroundColor: GOLD,
                    color: BG_DARK,
                  }}
                  className="px-4 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Add
                </button>
              </div>
            </motion.div>

            {/* Alert Thresholds Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Alert Thresholds
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                    Budget Warning %
                  </label>
                  <input
                    type="number"
                    value={props.alertThresholds.budget}
                    onChange={(e) =>
                      props.setAlertThresholds({
                        ...props.alertThresholds,
                        budget: parseInt(e.target.value) || 0,
                      })
                    }
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                      color: TEXT_PRIMARY,
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2">
                    Churn Risk %
                  </label>
                  <input
                    type="number"
                    value={props.alertThresholds.churn}
                    onChange={(e) =>
                      props.setAlertThresholds({
                        ...props.alertThresholds,
                        churn: parseInt(e.target.value) || 0,
                      })
                    }
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                      color: TEXT_PRIMARY,
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </motion.div>

            {/* Feature Flags Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Feature Flags
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(props.featureFlags).map(([flag, enabled]) => (
                  <label key={flag} className="flex items-center gap-3 cursor-pointer p-3 rounded" style={{ backgroundColor: BG_DARK }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => props.handleFeatureToggle(flag)}
                      className="rounded"
                    />
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium capitalize">
                      {flag.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>

            {/* Save Settings Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={props.handleSaveSettings}
                style={{
                  backgroundColor: GOLD,
                  color: BG_DARK,
                }}
                className="w-full px-4 py-3 rounded font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Save size={18} />
                Save All Settings
              </button>
              <AnimatePresence>
                {props.settingsSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 flex items-center gap-2 p-3 rounded"
                    style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                  >
                    <CheckCircle size={18} />
                    <span className="text-sm font-medium">Settings saved successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Sub-Tab */}
      <AnimatePresence mode="wait">
        {props.activeSubTab === 'theme' && (
          <motion.div
            key="theme"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Theme Presets Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Theme Presets
              </h3>
              <div className="grid grid-cols-6 gap-3">
                {props.themePresets.map((preset) => (
                  <motion.button
                    key={preset.name}
                    onClick={() => props.handleApplyThemePreset(preset)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      borderColor: BORDER_COLOR,
                    }}
                    className="border rounded-lg p-3 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex gap-1">
                      <div
                        style={{ backgroundColor: preset.primary }}
                        className="w-4 h-4 rounded"
                      />
                      <div
                        style={{ backgroundColor: preset.bg }}
                        className="w-4 h-4 rounded"
                      />
                      <div
                        style={{ backgroundColor: preset.card }}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                    <span style={{ color: TEXT_SECONDARY }} className="text-xs font-medium">
                      {preset.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Custom Colors Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Custom Colors
              </h3>
              <div className="grid grid-cols-3 gap-6">
                {Object.entries(props.themeConfig).map(([key, value]) => (
                  <div key={key}>
                    <label style={{ color: TEXT_SECONDARY }} className="block text-sm font-medium mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          props.handleThemeColorChange(key as keyof ThemeConfig, e.target.value)
                        }
                        style={{
                          borderColor: BORDER_COLOR,
                        }}
                        className="border rounded w-12 h-10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          props.handleThemeColorChange(key as keyof ThemeConfig, e.target.value)
                        }
                        style={{
                          backgroundColor: BG_DARK,
                          borderColor: BORDER_COLOR,
                          color: TEXT_PRIMARY,
                        }}
                        className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Color Harmony & Legibility Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Color Harmony & Legibility
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                    Complementary Colors
                  </h4>
                  <div className="flex gap-3">
                    <div>
                      <p style={{ color: TEXT_MUTED }} className="text-xs mb-2">Primary</p>
                      <div
                        style={{ backgroundColor: props.themeConfig.primaryColor, borderColor: BORDER_COLOR }}
                        className="w-16 h-16 rounded border"
                      />
                    </div>
                    <div>
                      <p style={{ color: TEXT_MUTED }} className="text-xs mb-2">Complementary</p>
                      <div
                        style={{ backgroundColor: props.getComplementary(props.themeConfig.primaryColor), borderColor: BORDER_COLOR }}
                        className="w-16 h-16 rounded border"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                    Contrast Ratios (WCAG)
                  </h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: 'Primary on Dark BG', hex1: props.themeConfig.primaryColor, hex2: props.themeConfig.bgDark },
                      { label: 'Text on Dark BG', hex1: props.themeConfig.textPrimary, hex2: props.themeConfig.bgDark },
                      { label: 'Text on Card BG', hex1: props.themeConfig.textPrimary, hex2: props.themeConfig.bgCard },
                      { label: 'Muted on Card BG', hex1: props.themeConfig.textMuted, hex2: props.themeConfig.bgCard },
                    ].map((item) => {
                      const ratio = parseFloat(props.getContrastRatio(item.hex1, item.hex2))
                      const pass = ratio >= 4.5
                      return (
                        <div key={item.label} className="flex justify-between items-center">
                          <span style={{ color: TEXT_SECONDARY }}>{item.label}</span>
                          <span style={{ color: pass ? '#10b981' : '#ef4444' }} className="font-semibold">
                            {ratio.toFixed(2)}:1 {pass ? '✓' : '✗'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Live Preview Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Live Preview
              </h3>
              <div
                style={{
                  backgroundColor: props.themeConfig.bgDark,
                  borderColor: props.themeConfig.borderColor,
                }}
                className="border rounded-lg p-6 min-h-[300px]"
              >
                <div className="space-y-4">
                  <h4
                    style={{ color: props.themeConfig.primaryColor }}
                    className="text-lg font-semibold"
                  >
                    Sample Header
                  </h4>
                  <div
                    style={{
                      backgroundColor: props.themeConfig.bgCard,
                      borderColor: props.themeConfig.borderColor,
                      color: props.themeConfig.textPrimary,
                    }}
                    className="border rounded-lg p-4"
                  >
                    <p className="mb-2">Card component with current theme</p>
                    <button
                      style={{
                        backgroundColor: props.themeConfig.primaryColor,
                        color: props.themeConfig.bgDark,
                      }}
                      className="px-4 py-2 rounded font-medium text-sm hover:opacity-90"
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Logo Management Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Logo Management
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                    Current Logo
                  </h4>
                  <div
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                    }}
                    className="border rounded-lg p-6 h-32 flex items-center justify-center"
                  >
                    {customLogo ? (
                      <img src={customLogo} alt="Logo" className="w-20 h-20 object-contain" />
                    ) : (
                      <p style={{ color: TEXT_MUTED }} className="text-sm">
                        No custom logo
                      </p>
                    )}
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
                <div>
                  <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                    Upload New Logo
                  </h4>
                  <label
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                    }}
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <Upload size={24} style={{ color: GOLD }} className="mb-2" />
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                      Click to upload
                    </span>
                    <input
                      type="file"
                      accept="image/svg+xml,image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-2">
                  Logo Locations
                </h4>
                <ul style={{ color: TEXT_MUTED }} className="text-sm space-y-1">
                  <li>• Header / Navigation</li>
                  <li>• Footer</li>
                  <li>• Login Page</li>
                  <li>• Favicon</li>
                </ul>
              </div>
            </motion.div>

            {/* Brand Colors Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Brand Colors
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Gold (Primary)', color: props.themeConfig.primaryColor },
                  { label: 'Background', color: props.themeConfig.bgDark },
                  { label: 'Card', color: props.themeConfig.bgCard },
                  { label: 'Border', color: props.themeConfig.borderColor },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div
                      style={{ backgroundColor: item.color, borderColor: BORDER_COLOR }}
                      className="w-full h-20 rounded-lg mb-2 border"
                    />
                    <p style={{ color: TEXT_SECONDARY }} className="text-sm font-medium">
                      {item.label}
                    </p>
                    <p style={{ color: TEXT_MUTED }} className="text-xs font-mono">
                      {item.color}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Sub-Tab */}
      <AnimatePresence mode="wait">
        {props.activeSubTab === 'navigation' && (
          <motion.div
            key="navigation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Tab Order & Names Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Tab Order & Names
              </h3>
              <div className="space-y-2">
                {props.navItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                      backgroundColor: BG_DARK,
                      borderColor: BORDER_COLOR,
                    }}
                    className="border rounded-lg p-4 flex items-center gap-3"
                  >
                    <GripVertical size={18} style={{ color: TEXT_MUTED }} />
                    <span style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold min-w-[2rem]">
                      {index + 1}
                    </span>
                    {props.editingNavItem === item.id ? (
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const updated = props.navItems.map((n) =>
                            n.id === item.id ? { ...n, label: e.target.value } : n
                          )
                          props.setNavItems(updated)
                        }}
                        style={{
                          backgroundColor: BG_CARD,
                          borderColor: GOLD,
                          color: TEXT_PRIMARY,
                        }}
                        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: TEXT_PRIMARY }} className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                    <span style={{ color: TEXT_MUTED }} className="text-xs font-mono">
                      /{item.id}
                    </span>
                    <button
                      onClick={() =>
                        props.setEditingNavItem(
                          props.editingNavItem === item.id ? null : item.id
                        )
                      }
                      className="p-2 hover:opacity-70 transition-opacity"
                      style={{ color: GOLD }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => props.handleNavItemReorder(item.id, 'up')}
                      disabled={index === 0}
                      className="p-2 hover:opacity-70 transition-opacity disabled:opacity-30"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => props.handleNavItemReorder(item.id, 'down')}
                      disabled={index === props.navItems.length - 1}
                      className="p-2 hover:opacity-70 transition-opacity disabled:opacity-30"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.visible}
                        onChange={(e) => {
                          const updated = props.navItems.map((n) =>
                            n.id === item.id ? { ...n, visible: e.target.checked } : n
                          )
                          props.setNavItems(updated)
                        }}
                        className="rounded"
                      />
                      <Eye size={16} style={{ color: TEXT_MUTED }} />
                    </label>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Navigation Preview Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                backgroundColor: BG_CARD,
                borderColor: BORDER_COLOR,
              }}
              className="border rounded-lg p-6"
            >
              <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
                Navigation Preview
              </h3>
              <div>
                <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                  Visible Tabs
                </h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {props.navItems
                    .filter((item) => item.visible)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                          backgroundColor: GOLD,
                          color: BG_DARK,
                        }}
                        className="px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {item.label}
                      </motion.div>
                    ))}
                </div>
                {props.navItems.some((item) => !item.visible) && (
                  <div>
                    <h4 style={{ color: TEXT_SECONDARY }} className="text-sm font-semibold mb-3">
                      Hidden Tabs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {props.navItems
                        .filter((item) => !item.visible)
                        .map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                              backgroundColor: BG_DARK,
                              borderColor: BORDER_COLOR,
                              color: TEXT_MUTED,
                            }}
                            className="px-4 py-2 rounded-full text-sm font-medium border opacity-50"
                          >
                            {item.label}
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
