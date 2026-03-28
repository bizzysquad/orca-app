'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Custom logo
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  useEffect(() => {
    setCustomLogo(localStorage.getItem('orca-custom-logo') || null)
  }, [])

  // Email/Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // General
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Check for success message from signup redirect
  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'account-created') {
      setSuccessMessage('Account created! Please check your email to verify, then sign in.')
    }
    if (message === 'email-verified') {
      setSuccessMessage('Email verified successfully! You can now sign in.')
    }
    if (message === 'verify-email') {
      setSuccessMessage('Please check your email for a verification link, then sign in.')
    }
  }, [searchParams])

  // Email sign in - real Supabase auth
  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const form = e.currentTarget
    const formEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value || email
    const formPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value || password

    if (!formEmail || !formPassword) {
      setError('Please enter your email and password')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_CONFIRMED') {
          setError('Please verify your email before signing in. Check your inbox for a confirmation link.')
        } else {
          setError(data.error || 'Sign in failed. Please try again.')
        }
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-5 hero-glow">
      <div className="relative w-full max-w-[360px] z-10 animate-fade-in">
        {/* Logo & Branding */}
        <div className="flex justify-center mb-8">
          {customLogo ? (
            <img src={customLogo} alt="ORCA" width={48} height={48} className="rounded-xl object-contain" />
          ) : (
            <Image src="/logo.svg" alt="ORCA" width={48} height={48} className="rounded-xl" priority />
          )}
        </div>

        <h1 className="text-center text-3xl font-bold mb-2" style={{ color: '#d4a843' }}>
          ORCA
        </h1>
        <p className="text-center text-sm font-medium mb-1 text-text-secondary">
          Organize Resources Control Assets
        </p>
        <p className="text-center text-xs mb-8 text-text-muted">
          Financial Command Center
        </p>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-6 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-6">
            <p className="text-danger text-sm text-center">{error}</p>
          </div>
        )}

        {/* Email Login Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-5">
          <div>
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="you@example.com"
              prefix={<Mail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                label="Password"
                placeholder="Enter your password"
                prefix={<Lock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 bottom-3 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 gold-bg text-brand-black disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </form>

        {/* Links */}
        <div className="my-6 text-center">
          <Link href="/auth/signup" className="text-sm text-text-muted hover:text-gold transition-colors">
            Don&apos;t have an account?{' '}
            <span className="text-gold font-semibold">Create one</span>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-text-muted/50">Secured with end-to-end encryption</p>
        </div>
      </div>
    </div>
  )
}
