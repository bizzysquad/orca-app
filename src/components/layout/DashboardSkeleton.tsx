'use client'

/**
 * DashboardSkeleton
 * A polished loading skeleton that mirrors the real dashboard layout.
 * Replaces the old bare "Loading…" text.
 */
export default function DashboardSkeleton({ theme }: { theme: any }) {
  const card = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
  }

  return (
    <div
      className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full animate-pulse"
      style={{ color: theme.text }}
    >
      {/* Welcome line */}
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-xl" style={{ background: `${theme.border}` }} />
        <div className="skeleton h-4 w-36 rounded-lg" style={{ background: `${theme.border}` }} />
      </div>

      {/* Safe to Spend hero */}
      <div
        className="rounded-2xl p-5 sm:p-6 space-y-3"
        style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}30` }}
      >
        <div className="flex items-center justify-between">
          <div className="skeleton h-3 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <div className="skeleton h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div className="skeleton h-14 w-44 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="skeleton h-3 w-36 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-6 w-16 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      {/* Metrics header */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-16 rounded-full" style={{ background: theme.border }} />
        <div className="skeleton h-7 w-28 rounded-lg" style={{ background: theme.border }} />
      </div>

      {/* 3 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-3" style={card}>
            <div className="flex items-center gap-2">
              <div className="skeleton w-4 h-4 rounded-full" style={{ background: theme.border }} />
              <div className="skeleton h-3 w-24 rounded-full" style={{ background: theme.border }} />
            </div>
            <div className="skeleton h-8 w-28 rounded-lg" style={{ background: theme.border }} />
            <div className="skeleton h-3 w-20 rounded-full" style={{ background: theme.border }} />
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl p-5 space-y-3" style={card}>
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-5 w-5 rounded-full" style={{ background: theme.border }} />
          <div className="skeleton h-4 w-28 rounded-lg" style={{ background: theme.border }} />
          <div className="skeleton h-5 w-5 rounded-full" style={{ background: theme.border }} />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg"
              style={{ background: i % 7 === 0 || i % 11 === 0 ? `${theme.border}80` : theme.border }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
