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
} from 'lucide-react'
import Input from '@/components/ui/Input'

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

  // Email/Password/Full Name
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // General
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
      indigo: 'text-indigo-400',
      red: 'text-red-400',
      green: 'text-green-400',
      amber: 'text-amber-400',
      blue: 'text-blue-400',
      purple: 'text-purple-400',
    }
    return colors[color] || 'text-slate-400'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel - Info/Marketing (55%) */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 bg-slate-900" style={{ backgroundColor: '#0F172A' }}>
        {/* Top: Logo + Branding */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center">
              {customLogo ? (
                <img src={customLogo} alt="ORCA" width={48} height={48} className="rounded-lg object-contain" />
              ) : (
                <Image src="/logo.svg" alt="ORCA" width={48} height={48} className="rounded-lg" priority />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#d4a843' }}>
                ORCA
              </h1>
              <p className="text-xs text-slate-400">ORGANIZE RESOURCES CONTROL ASSETS</p>
            </div>
          </div>

          {/* Purple pill badge */}
          <div className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-500/30 rounded-full px-4 py-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-sm text-purple-300">Your Financial Command Center</span>
          </div>

          {/* Hero heading */}
          <div className="mb-6">
            <h2 className="text-5xl font-bold text-white leading-tight mb-2">
              Take complete control
            </h2>
            <h2 className="text-5xl font-bold leading-tight" style={{ color: '#F59E0B' }}>
              of your money
            </h2>
          </div>

          {/* Description */}
          <p className="text-base text-slate-300 mb-12 max-w-md">
            ORCA is a personal finance command center that shows you exactly where your money goes, what's safe to
            spend, and how to hit your financial goals — all in one beautifully designed platform.
          </p>

          {/* HOW IT WORKS Section */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">How It Works</p>
            <div className="grid grid-cols-2 gap-6 mb-12">
              {steps.map((step) => (
                <div key={step.number}>
                  <p className="text-2xl font-bold text-slate-300 mb-2">{step.number}</p>
                  <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Features Section */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Everything Included</p>
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <div key={feature.title} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent size={20} className={`${getIconColor(feature.color)} flex-shrink-0 mt-1`} />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-xs text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form (45% on desktop, 100% on mobile) */}
      <div className="w-full lg:w-[45%] bg-slate-950" style={{ backgroundColor: '#1E293B' }}>
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Logo at top (smaller) */}
            <div className="flex justify-center mb-8">
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 border-gold/30">
                {customLogo ? (
                  <img src={customLogo} alt="ORCA" width={40} height={40} className="rounded-lg object-contain" />
                ) : (
                  <Image src="/logo.svg" alt="ORCA" width={40} height={40} className="rounded-lg" priority />
                )}
              </div>
            </div>

            <h1 className="text-center text-2xl font-bold mb-1" style={{ color: '#d4a843' }}>
              ORCA
            </h1>
            <p className="text-center text-xs text-slate-400 mb-8">FINANCIAL COMMAND CENTER</p>

            {/* Tab Toggle */}
            <div className="flex gap-3 mb-8 bg-slate-800/50 p-1 rounded-lg">
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-medium ${
                  !isSignUp
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Member Login
              </button>
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-medium ${
                  isSignUp
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Heading based on mode */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-400 mb-8">Sign in to your financial command center</p>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-6 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-400 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn} className="space-y-5 mb-8">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      name="fullName"
                      placeholder="John Doe"
                      prefix={<UserIcon size={16} />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  prefix={<Mail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    prefix={<Lock size={16} />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      prefix={<Lock size={16} />}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required={isSignUp}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </div>
            </form>

            {/* Toggle Link */}
            <div className="text-center mb-8">
              {isSignUp ? (
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                  >
                    Create one
                  </button>
                </p>
              )}
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield size={14} />
              <span>Secured with end-to-end encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
