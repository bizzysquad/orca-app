'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Palette, Eye, Save, ArrowLeft } from 'lucide-react'
import { DEMO_ADMIN } from '@/lib/demo-data'

export default function AdminPage() {
  const [appName, setAppName] = useState(DEMO_ADMIN.appName)
  const [tagline, setTagline] = useState(DEMO_ADMIN.tagline)
  const [logoUrl, setLogoUrl] = useState(DEMO_ADMIN.logoUrl)
  const [goldColor, setGoldColor] = useState(DEMO_ADMIN.goldColor)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-8">
      {/* Header */}
      <div className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-4"
        >
          <Shield size={32} style={{ color: goldColor }} />
          <h1 className="text-4xl font-bold">Admin Panel</h1>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Info Card */}
          <div
            className="p-6 rounded-xl border"
            style={{
              backgroundColor: 'rgba(212, 168, 67, 0.08)',
              borderColor: goldColor,
            }}
          >
            <p className="text-[#a1a1aa] leading-relaxed">
              Changes apply instantly. Use this panel to swap the logo, app name, tagline, and accent color without editing code.
            </p>
          </div>

          {/* Branding Form */}
          <div
            className="p-8 rounded-xl border space-y-8"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Palette size={24} style={{ color: goldColor }} />
              <h2 className="text-2xl font-semibold">Branding Settings</h2>
            </div>

            {/* App Name Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
                App Name
                <span className="text-[#71717a] text-xs ml-2">
                  ({appName.length}/20 characters)
                </span>
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) =>
                  setAppName(e.target.value.slice(0, 20))
                }
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg bg-[#09090b] border text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                style={{
                  borderColor: '#27272a',
                  '--tw-ring-color': goldColor,
                } as React.CSSProperties}
                placeholder="Enter app name"
              />
            </motion.div>

            {/* Tagline Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
                Tagline
                <span className="text-[#71717a] text-xs ml-2">
                  ({tagline.length}/60 characters)
                </span>
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) =>
                  setTagline(e.target.value.slice(0, 60))
                }
                maxLength={60}
                className="w-full px-4 py-3 rounded-lg bg-[#09090b] border text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                style={{
                  borderColor: '#27272a',
                  '--tw-ring-color': goldColor,
                } as React.CSSProperties}
                placeholder="Enter tagline"
              />
            </motion.div>

            {/* Logo URL Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
                Logo URL
                <span className="text-[#71717a] text-xs ml-2">
                  (max 500 chars, leave blank for default)
                </span>
              </label>
              <input
                type="url"
                value={logoUrl || ''}
                onChange={(e) =>
                  setLogoUrl(
                    e.target.value.slice(0, 500) || null
                  )
                }
                maxLength={500}
                className="w-full px-4 py-3 rounded-lg bg-[#09090b] border text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                style={{
                  borderColor: '#27272a',
                  '--tw-ring-color': goldColor,
                } as React.CSSProperties}
                placeholder="https://example.com/logo.png"
              />
            </motion.div>

            {/* Accent Color Picker */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <label className="block text-sm font-medium text-[#a1a1aa] mb-3">
                Accent Color
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={goldColor}
                    onChange={(e) => setGoldColor(e.target.value)}
                    className="w-16 h-12 rounded-lg cursor-pointer border"
                    style={{
                      borderColor: '#27272a',
                    }}
                  />
                  <input
                    type="text"
                    value={goldColor}
                    onChange={(e) => {
                      const hex = e.target.value
                      if (hex.match(/^#[0-9A-F]{6}$/i)) {
                        setGoldColor(hex)
                      }
                    }}
                    maxLength={7}
                    className="w-24 px-3 py-2 rounded-lg bg-[#09090b] border text-[#fafafa] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                    style={{
                      borderColor: '#27272a',
                      '--tw-ring-color': goldColor,
                    } as React.CSSProperties}
                    placeholder="#d4a843"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Save & Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex gap-4"
          >
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-[#09090b] transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: goldColor,
              }}
            >
              <Save size={20} />
              Save Changes
            </button>

            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border transition-all duration-300 hover:scale-105 active:scale-95 text-[#fafafa]"
              style={{
                borderColor: '#27272a',
                backgroundColor: 'transparent',
              }}
            >
              <ArrowLeft size={20} />
              Back to App
            </Link>
          </motion.div>

          {/* Saved Confirmation */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-lg border text-center"
              style={{
                backgroundColor: 'rgba(212, 168, 67, 0.1)',
                borderColor: goldColor,
                color: goldColor,
              }}
            >
              <p className="font-medium">Saved!</p>
            </motion.div>
          )}
        </motion.div>

        {/* Right Column: Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="sticky top-8 h-fit"
        >
          <div
            className="p-8 rounded-xl border space-y-6"
            style={{
              backgroundColor: '#18181b',
              borderColor: '#27272a',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Eye size={24} style={{ color: goldColor }} />
              <h2 className="text-xl font-semibold">Preview</h2>
            </div>

            {/* Logo Preview */}
            <motion.div
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-20 h-20 rounded-full object-cover border"
                  style={{ borderColor: goldColor }}
                  onError={() => {
                    // Fallback to default if image fails
                  }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                  style={{
                    backgroundColor: goldColor,
                    color: '#09090b',
                    border: `2px solid ${goldColor}`,
                  }}
                >
                  O
                </div>
              )}
            </motion.div>

            {/* App Name & Tagline */}
            <div className="text-center space-y-3">
              <motion.h3
                animate={{ color: goldColor }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-bold"
              >
                {appName || 'App Name'}
              </motion.h3>
              <p className="text-[#a1a1aa] text-sm">
                {tagline || 'Add a tagline...'}
              </p>
            </div>

            {/* Color Swatch */}
            <div className="pt-6 border-t" style={{ borderColor: '#27272a' }}>
              <p className="text-xs text-[#71717a] mb-3">Accent Color</p>
              <motion.div
                animate={{ backgroundColor: goldColor }}
                transition={{ duration: 0.3 }}
                className="w-full h-12 rounded-lg border"
                style={{ borderColor: '#27272a' }}
              />
              <p className="text-xs text-[#a1a1aa] mt-2 font-mono text-center">
                {goldColor}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
