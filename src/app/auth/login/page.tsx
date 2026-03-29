'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Receipt,
  PiggyBank,
  Users,
  CheckSquare,
  Calendar,
  Shield,
  User as UserIcon,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import Input from '@/components/ui/Input'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
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

  // Tab state (Member Login vs Create Account)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Email/Password/Full Name
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')

  // General
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)

  // Check for success message from signup redirect
  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'account-created') {
      setSuccessMessage('Account created! Please check your email to verify, then sign in.')
      setIsSignUp(false)
    }
    if (message === 'email-verified') {
      setSuccessMessage('Email verified successfully! You can now sign in.')
      setIsSignUp(false)
    }
    if (message === 'verify-email') {
      setSuccessMessage('Please check your email for a verification link, then sign in.')
      setIsSignUp(false)
    }
  }, [searchParams])

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setForgotPasswordError('')
    setForgotPasswordMessage('')
    setForgotPasswordLoading(true)

    if (!forgotPasswordEmail) {
      setForgotPasswordError('Please enter your email address')
      setForgotPasswordLoading(false)
      return
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/login`,
      })

      if (error) {
        setForgotPasswordError(error.message || 'Failed to send reset email. Please try again.')
      } else {
        setForgotPasswordMessage('Check your email for a password reset link')
        setForgotPasswordEmail('')
      }
    } catch {
      setForgotPasswordError('An unexpected error occurred. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

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

  // Email sign up - real Supabase auth
  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const form = e.currentTarget
    const formEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value || email
    const formPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value || password
    const formName = (form.elements.namedItem('fullName') as HTMLInputElement)?.value || fullName
    const formConfirmPassword =
      (form.elements.namedItem('confirmPassword') as HTMLInputElement)?.value || confirmPassword

    if (!formEmail || !formPassword || !formName || !formConfirmPassword) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (formPassword !== formConfirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPassword, fullName: formName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Sign up failed. Please try again.')
        setLoading(false)
        return
      }

      // Success - show message and redirect to login
      setSuccessMessage('Account created! Please check your email to verify, then sign in.')
      setIsSignUp(false)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Feature cards data
  const features = [
    {
      icon: BarChart3,
      title: 'Smart Stack',
      description:
        'Track every dollar in and out. Plan paychecks, split bills, and see exactly how much is safe to spend.',
      color: 'indigo',
    },
    {
      icon: Receipt,
      title: 'Bill Boss',
      description:
        'Never miss a bill. See all dues in one place, mark payments, and stay ahead of every deadline.',
      color: 'red',
    },
    {
      icon: PiggyBank,
      title: 'Savings Goals',
      description:
        'Set targets, track progress, and watch your savings grow with visual goal trackers.',
      color: 'green',
    },
    {
      icon: Users,
      title: 'Stack Circle',
      description:
        'Save together with friends or family. Create group goals, invite members, and share progress.',
      color: 'amber',
    },
    {
      icon: CheckSquare,
      title: 'Task List',
      description:
        'Organize to-dos, groceries, meetings, and notes — all linked to your financial life.',
      color: 'blue',
    },
    {
      icon: Calendar,
      title: 'Calendar View',
      description:
        'See bills, payments, and events on a unified calendar so nothing sneaks up on you.',
      color: 'purple',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Create your account',
      description: 'Sign up in seconds — no credit card required.',
    },
    {
      number: '02',
      title: 'Add your income & bills',
      description: 'Enter what you earn and what you owe each month.',
    },
    {
      number: '03',
      title: 'See your Safe to Spend',
      description: "ORCA calculates what's truly available after bills.",
    },
    {
      number: '04',
      title: 'Take control',
      description: 'Pay bills, hit goals, and build wealth — all in one place.',
    },
  ]

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      indigo: '#6366F1',
      red: '#EF4444',
      green: '#10B981',
      amber: '#F59E0B',
      blue: '#3B82F6',
      purple: '#8B5CF6',
    }
    return colors[color] || '#64748B'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel - Info/Marketing (55%) */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-14"
        style={{
          background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Top: Logo + Branding */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center">
              {customLogo ? (
                <img src={customLogo} alt="ORCA" width={48} height={48} className="rounded-xl object-cover" />
              ) : (
                <img src="/ORCA-Logo.png" alt="ORCA" width={48} height={48} className="rounded-xl object-cover" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: '#F59E0B', letterSpacing: '0.08em' }}>
                ORCA
              </h1>
              <p className="text-xs text-slate-400" style={{ letterSpacing: '0.14em', fontWeight: 600 }}>
                ORGANIZE RESOURCES CONTROL ASSETS
              </p>
            </div>
          </div>

          {/* Purple pill badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8', fontWeight: 600 }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#818CF8' }} />
            Your Financial Command Center
          </div>

          {/* Hero heading */}
          <div className="mb-4">
            <h2 className="text-4xl font-black text-white mb-2" style={{ lineHeight: 1.15 }}>
              Take complete control
            </h2>
            <h2 className="text-4xl font-black" style={{ color: '#F59E0B', lineHeight: 1.15 }}>
              of your money
            </h2>
          </div>

          {/* Description */}
          <p className="text-base text-slate-300 mb-12 max-w-md" style={{ lineHeight: 1.7 }}>
            ORCA is a personal finance command center that shows you exactly where your money goes, what's safe to
            spend, and how to hit your financial goals — all in one beautifully designed platform.
          </p>

          {/* HOW IT WORKS Section */}
          <div className="mb-8">
            <p className="text-xs mb-5" style={{ color: '#475569', fontWeight: 700, letterSpacing: '0.12em' }}>
              HOW IT WORKS
            </p>
            <div className="grid grid-cols-2 gap-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="mb-2 font-black" style={{ fontSize: 11, color: '#F59E0B', letterSpacing: '0.08em' }}>
                    {step.number}
                  </div>
                  <div className="text-sm mb-1 font-bold" style={{ color: '#F1F5F9' }}>
                    {step.title}
                  </div>
                  <div className="text-xs" style={{ color: '#64748B', lineHeight: 1.5 }}>
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Features Section */}
        <div>
          <p className="text-xs mb-4" style={{ color: '#475569', fontWeight: 700, letterSpacing: '0.12em' }}>
            EVERYTHING INCLUDED
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${getIconColor(feature.color)}20` }}>
                    <IconComponent className="w-4 h-4" style={{ color: getIconColor(feature.color) }} />
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ fontWeight: 700, color: '#E2E8F0' }}>
                      {feature.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>
                      {feature.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form (45% on desktop, 100% on mobile) */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10" style={{ background: '#0F172A' }}>
        {/* Mobile logo */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          {customLogo ? (
            <img src={customLogo} alt="ORCA" width={64} height={64} className="rounded-2xl object-cover mb-3" />
          ) : (
            <img src="/ORCA-Logo.png" alt="ORCA" width={64} height={64} className="rounded-2xl object-cover mb-3" />
          )}
          <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: 22, letterSpacing: '0.08em' }}>ORCA</div>
          <div style={{ color: '#64748B', fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>ORGANIZE RESOURCES CONTROL ASSETS</div>
        </div>

        <div className="w-full" style={{ maxWidth: 400 }}>
          {!showForgotPassword ? (
            <>
              {/* Tabs */}
              <div
                className="flex gap-1 p-1 rounded-xl mb-7"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setIsSignUp(m === 'signup')
                      setError('')
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm capitalize transition-all"
                    style={{
                      background: isSignUp === (m === 'signup') ? '#6366F1' : 'transparent',
                      color: isSignUp === (m === 'signup') ? '#FFFFFF' : '#64748B',
                      fontWeight: isSignUp === (m === 'signup') ? 700 : 500,
                    }}
                  >
                    {m === 'login' ? 'Member Login' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Desktop logo (inside form panel) */}
              <div className="hidden lg:flex flex-col items-center mb-6">
                {customLogo ? (
                  <img
                    src={customLogo}
                    alt="ORCA"
                    width={56}
                    height={56}
                    className="rounded-2xl object-cover mb-3"
                    style={{ boxShadow: '0 0 32px rgba(245,158,11,0.3)' }}
                  />
                ) : (
                  <img
                    src="/ORCA-Logo.png"
                    alt="ORCA"
                    width={56}
                    height={56}
                    className="rounded-2xl object-cover mb-3"
                    style={{ boxShadow: '0 0 32px rgba(245,158,11,0.3)' }}
                  />
                )}
                <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: 20, letterSpacing: '0.08em' }}>ORCA</div>
                <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>
                  FINANCIAL COMMAND CENTER
                </div>
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9' }}>
                  {isSignUp ? 'Get started free' : 'Welcome back'}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                  {isSignUp ? 'Join thousands taking control of their finances' : 'Sign in to your financial command center'}
                </p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-6"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <CheckCircle size={16} style={{ color: '#6EE7B7', flexShrink: 0 }} />
                  <span style={{ color: '#6EE7B7' }}>{successMessage}</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-6"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <AlertCircle size={16} style={{ color: '#FCA5A5', flexShrink: 0 }} />
                  <span style={{ color: '#FCA5A5' }}>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                      <input
                        type="text"
                        name="fullName"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg"
                      style={{ color: '#475569' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true)
                        setError('')
                      }}
                      className="text-xs mt-2 transition-all hover:opacity-80"
                      style={{ color: '#818CF8', fontWeight: 700 }}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                {isSignUp && (
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                        required={isSignUp}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg"
                        style={{ color: '#475569' }}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm transition-all hover:opacity-90 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#fff', fontWeight: 700 }}
                >
                  {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create My Account' : 'Sign In')}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Toggle */}
              <div className="text-center mt-5">
                <span className="text-sm" style={{ color: '#475569' }}>
                  {isSignUp ? "Already a member? " : "Don't have an account? "}
                </span>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                  }}
                  className="text-sm transition-all hover:opacity-80"
                  style={{ color: '#818CF8', fontWeight: 700 }}
                >
                  {isSignUp ? 'Sign in' : 'Create one'}
                </button>
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <Shield className="w-3.5 h-3.5" style={{ color: '#334155' }} />
                <span style={{ color: '#334155', fontSize: 11 }}>Secured with end-to-end encryption</span>
              </div>
            </>
          ) : (
            <>
              {/* Forgot Password Form */}
              <div className="mb-6">
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9' }}>Reset Password</h2>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                  Enter your email to receive a password reset link
                </p>
              </div>

              {forgotPasswordMessage && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-6"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <CheckCircle size={16} style={{ color: '#6EE7B7', flexShrink: 0 }} />
                  <span style={{ color: '#6EE7B7' }}>{forgotPasswordMessage}</span>
                </div>
              )}

              {forgotPasswordError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-6"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <AlertCircle size={16} style={{ color: '#FCA5A5', flexShrink: 0 }} />
                  <span style={{ color: '#FCA5A5' }}>{forgotPasswordError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm transition-all hover:opacity-90 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#fff', fontWeight: 700 }}
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  {!forgotPasswordLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="text-center mt-5">
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordMessage('')
                    setForgotPasswordError('')
                  }}
                  className="text-sm transition-all hover:opacity-80"
                  style={{ color: '#818CF8', fontWeight: 700 }}
                >
                  Back to login
                </button>
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <Shield className="w-3.5 h-3.5" style={{ color: '#334155' }} />
                <span style={{ color: '#334155', fontSize: 11 }}>Secured with end-to-end encryption</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
