'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// ── Helper: same slug logic as Stack Circle page ────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ── Join logic (localStorage) ───────────────────────────────────────────────
function joinGroupByCode(code: string, slug: string, userName: string): { success: boolean; groupName?: string } {
  try {
    const raw = localStorage.getItem('orca-stack-circle-groups')
    if (!raw) return { success: false }
    const groups = JSON.parse(raw) as any[]

    const idx = groups.findIndex(
      (g) => g.code === code || toSlug(g.name) === slug || toSlug(g.customName || '') === slug
    )
    if (idx === -1) return { success: false }

    const group = groups[idx]

    // Don't double-add the same user (check by name)
    const alreadyMember = (group.members || []).some(
      (m: any) => m.name?.toLowerCase() === userName.toLowerCase()
    )
    if (!alreadyMember) {
      const newMember = {
        id: crypto.randomUUID(),
        name: userName,
        role: 'member',
        target: 0,
        contrib: 0,
        balance: 0,
        invitedBy: group.members?.[0]?.name || 'Group Creator',
        joinedAt: new Date().toISOString(),
      }
      groups[idx] = {
        ...group,
        members: [...(group.members || []), newMember],
        activity: [
          ...(group.activity || []),
          {
            id: crypto.randomUUID(),
            user: userName,
            msg: `${userName} joined the group via invite link`,
            date: new Date().toLocaleDateString(),
          },
        ],
      }
      localStorage.setItem('orca-stack-circle-groups', JSON.stringify(groups))
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key: 'orca-stack-circle-groups' } }))
    }

    return { success: true, groupName: group.customName || group.name }
  } catch {
    return { success: false }
  }
}

// ── Inner page (needs Suspense for useSearchParams) ─────────────────────────
function InvitePageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const slug = (params.slug as string) || ''
  const code = searchParams.get('code') || ''

  const [status, setStatus] = useState<'checking' | 'joining' | 'redirecting' | 'error'>('checking')
  const [message, setMessage] = useState('Checking invite link…')

  useEffect(() => {
    if (!code) {
      setStatus('error')
      setMessage('Invalid invite link — missing code.')
      return
    }

    // Store pending invite in sessionStorage so login/signup pages can pick it up
    try {
      sessionStorage.setItem('orca-pending-invite', JSON.stringify({ slug, code }))
    } catch {}

    // Check Supabase auth status
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session
      if (!session) {
        // Not logged in — redirect to login with returnTo
        const returnTo = encodeURIComponent(`/invite/${slug}?code=${code}`)
        setMessage('Please sign in to join the group…')
        router.replace(`/auth/login?returnTo=${returnTo}&invite=1`)
        return
      }

      // Logged in — attempt the join
      setStatus('joining')
      const userName =
        session.user.user_metadata?.full_name ||
        session.user.email?.split('@')[0] ||
        'Member'

      const result = joinGroupByCode(code, slug, userName)

      if (result.success) {
        // Clear pending invite
        try { sessionStorage.removeItem('orca-pending-invite') } catch {}
        setStatus('redirecting')
        setMessage(`Joined${result.groupName ? ` "${result.groupName}"` : ''}! Taking you to Stack Circle…`)
        setTimeout(() => router.replace('/stack-circle'), 1200)
      } else {
        setStatus('error')
        setMessage('Could not find a matching group. The link may be expired or invalid.')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full text-center space-y-5">
        {/* Logo / icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2.5" fill="none" />
            <circle cx="16" cy="16" r="6" fill="white" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white">ORCA Stack Circle</h1>

        {status === 'checking' || status === 'joining' || status === 'redirecting' ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-300 text-sm">{message}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-500/20">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-medium">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InvitePageInner />
    </Suspense>
  )
}
