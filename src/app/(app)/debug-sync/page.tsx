'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import { getDiagnostics, fullSync, pushToCloud, pullFromCloud, SYNC_KEYS } from '@/lib/syncEngine'
import {
  RefreshCw, CheckCircle, AlertTriangle, AlertCircle,
  Upload, Download, Database, Wifi, WifiOff, Shield,
  Smartphone, Globe, HardDrive, Cloud, Trash2,
} from 'lucide-react'

const GOLD = '#F59E0B'
const GREEN = '#10B981'
const RED = '#EF4444'
const BLUE = '#3B82F6'
const INDIGO = '#6366F1'

export default function DebugSyncPage() {
  const { theme } = useTheme()
  const { syncState, forceSync } = useOrcaData()
  const [diagnostics, setDiagnostics] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLog, setActionLog] = useState<string[]>([])
  const [syncing, setSyncing] = useState(false)

  const log = useCallback((msg: string) => {
    setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
  }, [])

  const loadDiagnostics = useCallback(async () => {
    setLoading(true)
    try {
      const diag = await getDiagnostics()
      setDiagnostics(diag)
      log('Diagnostics loaded')
    } catch (err: any) {
      log(`Error loading diagnostics: ${err.message}`)
    }
    setLoading(false)
  }, [log])

  useEffect(() => { loadDiagnostics() }, [loadDiagnostics])

  const handleFullSync = async () => {
    setSyncing(true)
    log('Starting full bidirectional sync…')
    const result = await forceSync()
    if (result.ok) {
      log('Full sync complete — cloud and local are reconciled')
    } else {
      log(`Sync failed: ${result.error}`)
    }
    await loadDiagnostics()
    setSyncing(false)
  }

  const handlePushOnly = async () => {
    setSyncing(true)
    log('Pushing local data to cloud…')
    const result = await pushToCloud()
    if (result.ok) {
      log('Push complete — local data uploaded to Supabase')
    } else {
      log(`Push failed: ${result.error}`)
    }
    await loadDiagnostics()
    setSyncing(false)
  }

  const handlePullOnly = async () => {
    setSyncing(true)
    log('Pulling cloud data to local…')
    const result = await pullFromCloud()
    if (result.ok) {
      log(`Pull complete — hydrated ${result.hydrated} keys from cloud`)
    } else {
      log(`Pull failed: ${result.error}`)
    }
    await loadDiagnostics()
    setSyncing(false)
  }

  const handleClearLocalSync = () => {
    if (!confirm('This will clear all synced localStorage keys. Your cloud data will NOT be deleted. Continue?')) return
    for (const key of SYNC_KEYS) {
      localStorage.removeItem(key)
    }
    log('Cleared all sync keys from localStorage')
    loadDiagnostics()
  }

  const handleRehydrate = async () => {
    setSyncing(true)
    log('Clearing local and re-pulling everything from cloud…')
    for (const key of SYNC_KEYS) {
      localStorage.removeItem(key)
    }
    const result = await pullFromCloud()
    if (result.ok) {
      log(`Rehydrated ${result.hydrated} keys from cloud — reload the app to see changes`)
      window.dispatchEvent(new Event('orca-sync-ready'))
    } else {
      log(`Rehydrate failed: ${result.error}`)
    }
    await loadDiagnostics()
    setSyncing(false)
  }

  const d = diagnostics

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 max-w-2xl mx-auto" style={{ background: theme.bg, color: theme.text }}>
      <h1 className="text-xl font-bold mb-1">Sync Diagnostics</h1>
      <p className="text-xs mb-6" style={{ color: theme.subtext }}>Debug tool for ORCA cloud sync. Shows real-time state of auth, data, and sync status.</p>

      {loading && !d && (
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.subtext }}>
          <RefreshCw size={14} className="animate-spin" /> Loading diagnostics…
        </div>
      )}

      {d && (
        <div className="space-y-4">
          {/* Auth & Session */}
          <Section title="Auth & Session" icon={<Shield size={14} />} theme={theme}>
            <Row label="User ID" value={d.userId} theme={theme} mono />
            <Row label="Auth Status" value={d.authStatus} theme={theme}
              color={d.authStatus === 'active' ? GREEN : RED} />
            <Row label="Session Expires" value={d.sessionExpiry === 'none' ? 'No session' : new Date(d.sessionExpiry).toLocaleString()} theme={theme}
              color={d.authStatus === 'active' ? undefined : RED} />
            <Row label="Supabase URL" value={d.supabaseUrl} theme={theme} mono small />
          </Section>

          {/* Environment */}
          <Section title="Environment" icon={<Smartphone size={14} />} theme={theme}>
            <Row label="Mode" value={d.isPwa ? 'PWA / Home Screen' : 'Browser'} theme={theme}
              color={d.isPwa ? INDIGO : BLUE} />
            <Row label="Online" value={d.isOnline ? 'Yes' : 'No'} theme={theme}
              color={d.isOnline ? GREEN : RED} />
            <Row label="User Agent" value={d.userAgent?.slice(0, 80)} theme={theme} small />
          </Section>

          {/* Data Counts */}
          <Section title="DJ Gigs Data" icon={<Database size={14} />} theme={theme}>
            <Row label="Local Gigs" value={String(d.localGigCount)} theme={theme} />
            <Row label="Cloud Gigs" value={String(d.cloudGigCount)} theme={theme} />
            <Row label="Mismatch?" value={d.gigMismatch ? 'YES — data not in sync' : 'No'} theme={theme}
              color={d.gigMismatch ? RED : GREEN} />
          </Section>

          {/* Sync Status */}
          <Section title="Sync Status" icon={d.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} theme={theme}>
            <Row label="Sync Engine Status" value={syncState.status} theme={theme}
              color={syncState.status === 'synced' ? GREEN : syncState.status === 'error' ? RED : GOLD} />
            <Row label="Last Sync" value={d.lastSyncTime === 'never' ? 'Never synced' : new Date(d.lastSyncTime).toLocaleString()} theme={theme}
              color={d.lastSyncTime === 'never' ? RED : undefined} />
            <Row label="Last Error" value={d.lastError || syncState.lastError || 'None'} theme={theme}
              color={d.lastError || syncState.lastError ? RED : GREEN} />
          </Section>

          {/* Storage Keys */}
          <Section title="localStorage" icon={<HardDrive size={14} />} theme={theme}>
            <Row label="Keys Stored" value={`${d.localKeyCount} / ${SYNC_KEYS.length}`} theme={theme} />
            <div className="flex flex-wrap gap-1 mt-1">
              {SYNC_KEYS.map(key => (
                <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-md font-mono"
                  style={{
                    background: d.localKeys?.includes(key) ? `${GREEN}20` : `${RED}15`,
                    color: d.localKeys?.includes(key) ? GREEN : RED,
                    border: `1px solid ${d.localKeys?.includes(key) ? GREEN : RED}30`,
                  }}
                >
                  {key.replace('orca-', '')}
                </span>
              ))}
            </div>
          </Section>

          {/* Cloud Keys */}
          <Section title="Cloud (profiles.local_data)" icon={<Cloud size={14} />} theme={theme}>
            <Row label="Keys in Cloud" value={`${d.cloudKeyCount}`} theme={theme} />
            <div className="flex flex-wrap gap-1 mt-1">
              {SYNC_KEYS.map(key => (
                <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-md font-mono"
                  style={{
                    background: d.cloudKeys?.includes(key) ? `${BLUE}20` : `${RED}15`,
                    color: d.cloudKeys?.includes(key) ? BLUE : RED,
                    border: `1px solid ${d.cloudKeys?.includes(key) ? BLUE : RED}30`,
                  }}
                >
                  {key.replace('orca-', '')}
                </span>
              ))}
            </div>
          </Section>

          {/* Service Worker */}
          <Section title="Service Worker / Cache" icon={<Globe size={14} />} theme={theme}>
            <Row label="Service Worker" value={d.serviceWorkerVersion === 'none' ? 'Not registered' : d.serviceWorkerVersion} theme={theme} small />
            <Row label="SW State" value={d.serviceWorkerState} theme={theme} />
            <Row label="IndexedDB" value={d.indexedDBDatabases?.length > 0 ? d.indexedDBDatabases.join(', ') : 'None'} theme={theme} />
          </Section>

          {/* Actions */}
          <Section title="Actions" icon={<RefreshCw size={14} />} theme={theme}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <ActionBtn label="Full Sync" icon={<RefreshCw size={12} />} color={GREEN}
                onClick={handleFullSync} disabled={syncing} theme={theme} />
              <ActionBtn label="Push to Cloud" icon={<Upload size={12} />} color={BLUE}
                onClick={handlePushOnly} disabled={syncing} theme={theme} />
              <ActionBtn label="Pull from Cloud" icon={<Download size={12} />} color={INDIGO}
                onClick={handlePullOnly} disabled={syncing} theme={theme} />
              <ActionBtn label="Rehydrate (wipe local + pull)" icon={<Cloud size={12} />} color={GOLD}
                onClick={handleRehydrate} disabled={syncing} theme={theme} />
              <ActionBtn label="Clear Local Sync Keys" icon={<Trash2 size={12} />} color={RED}
                onClick={handleClearLocalSync} disabled={syncing} theme={theme} />
              <ActionBtn label="Refresh Diagnostics" icon={<RefreshCw size={12} />} color={GOLD}
                onClick={loadDiagnostics} disabled={loading} theme={theme} />
            </div>
          </Section>

          {/* Action Log */}
          {actionLog.length > 0 && (
            <Section title="Action Log" icon={<CheckCircle size={14} />} theme={theme}>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {actionLog.map((msg, i) => (
                  <p key={i} className="text-[10px] font-mono" style={{ color: theme.subtext }}>{msg}</p>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children, theme }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; theme: any
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: GOLD }}>{icon}</span>
        <h2 className="text-xs font-bold" style={{ color: theme.text }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, theme, color, mono, small }: {
  label: string; value: string; theme: any; color?: string; mono?: boolean; small?: boolean
}) {
  return (
    <div className="flex items-start justify-between py-0.5 gap-2">
      <span className="text-[11px] shrink-0" style={{ color: theme.subtext }}>{label}</span>
      <span className={`text-[11px] text-right break-all ${mono ? 'font-mono' : ''} ${small ? 'text-[9px]' : ''}`}
        style={{ color: color || theme.text }}>
        {value}
      </span>
    </div>
  )
}

function ActionBtn({ label, icon, color, onClick, disabled, theme }: {
  label: string; icon: React.ReactNode; color: string; onClick: () => void; disabled: boolean; theme: any
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-opacity"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon} {label}
    </button>
  )
}
