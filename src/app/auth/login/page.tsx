'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Phone, Shield, ChevronLeft, CheckCircle } from 'lucide-react'
import Input from '@/components/ui/Input'

type LoginMethod = 'email' | 'phone'
type LoginStep = 'credentials' | 'phone-verify' | '2fa'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Login method
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [step, setStep] = useState<LoginStep>('credentials')

  // Email/Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Phone
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCode, setPhoneCode] = useState(['', '', '', '', '', ''])
  const phoneInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [phoneSent, setPhoneSent] = useState(false)
  const [phoneTimer, setPhoneTimer] = useState(0)

  // 2FA
  const [twoFACode, setTwoFACode] = useState(['', '', '', '', '', ''])
  const twoFAInputRefs = useRef<(HTMLInputElement | null)[]>([])

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
  }, [searchParams])

  // Phone code timer
  useEffect(() => {
    if (phoneTimer > 0) {
      const interval = setInterval(() => setPhoneTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [phoneTimer])

  const handleCodeInput = (
    codes: string[],
    setCodes: (val: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    value: string
  ) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newCodes = [...codes]
      digits.forEach((d, i) => {
        if (i + index < 6) newCodes[i + index] = d
      })
      setCodes(newCodes)
      const nextIdx = Math.min(index + digits.length, 5)
      refs.current[nextIdx]?.focus()
      return
    }
    const digit = value.replace(/\D/g, '')
    const newCodes = [...codes]
    newCodes[index] = digit
    setCodes(newCodes)
    if (digit && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (
    codes: string[],
    setCodes: (val: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    e: React.KeyboardEvent
  ) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      const newCodes = [...codes]
      newCodes[index - 1] = ''
      setCodes(newCodes)
      refs.current[index - 1]?.focus()
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

  // Phone verification - send code via real Supabase
  const handleSendPhoneCode = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code')
        setLoading(false)
        return
      }

      setPhoneSent(true)
      setPhoneTimer(60)
      setStep('phone-verify')
      setLoading(false)
    } catch {
      setError('Failed to send verification code. Please try again.')
      setLoading(false)
    }
  }

  // Phone verification - verify code via real Supabase
  const handleVerifyPhoneCode = async () => {
    const code = phoneCode.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid verification code')
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  // 2FA verification (placeholder - real 2FA would go through Supabase MFA)
  const handleVerify2FA = () => {
    const code = twoFACode.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    // For now, 2FA is not active in Supabase - direct to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  const goBack = () => {
    setStep('credentials')
    setError('')
    setPhoneCode(['', '', '', '', '', ''])
    setTwoFACode(['', '', '', '', '', ''])
  }

  // Code input renderer
  const renderCodeInputs = (
    codes: string[],
    setCodes: (val: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => (
    <div className="flex justify-center gap-2.5">
      {codes.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleCodeInput(codes, setCodes, refs, idx, e.target.value)}
          onKeyDown={(e) => handleCodeKeyDown(codes, setCodes, refs, idx, e)}
          className="w-11 h-14 text-center text-xl font-bold bg-[#18181b] border border-[#27272a] rounded-xl text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843] transition-all"
          autoFocus={idx === 0}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-5 hero-glow">
      <div className="relative w-full max-w-[360px] z-10 animate-fade-in">
        {/* Logo & Branding */}
        <div className="flex justify-center mb-8">
          <Image src="/logo.svg" alt="ORCA" width={48} height={48} className="rounded-xl" priority />
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

        {/* STEP: Credentials */}
        {step === 'credentials' && (
          <>
            {/* Login Method Toggle */}
            <div className="flex items-center gap-2 mb-6 p-1 rounded-xl bg-[#18181b] border border-[#27272a]">
              <button
                onClick={() => { setLoginMethod('email'); setError('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'email'
                    ? 'bg-[#d4a843] text-[#09090b]'
                    : 'text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                <Mail size={14} /> Email
              </button>
              <button
                onClick={() => { setLoginMethod('phone'); setError('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'phone'
                    ? 'bg-[#d4a843] text-[#09090b]'
                    : 'text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                <Phone size={14} /> Phone
              </button>
            </div>

            {/* Email Login */}
            {loginMethod === 'email' && (
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
            )}

            {/* Phone Login */}
            {loginMethod === 'phone' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d()-\s+]/g, ''))}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-11 pr-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843] transition-all"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleSendPhoneCode}
                    disabled={loading || !phoneNumber}
                    className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 gold-bg text-brand-black disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="my-6 text-center">
              <Link href="/auth/signup" className="text-sm text-text-muted hover:text-gold transition-colors">
                Don&apos;t have an account?{' '}
                <span className="text-gold font-semibold">Create one</span>
              </Link>
            </div>
          </>
        )}

        {/* STEP: Phone Verification */}
        {step === 'phone-verify' && (
          <div className="space-y-6">
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-gold transition-colors mb-2">
              <ChevronLeft size={16} /> Back
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
                <Phone size={24} className="text-[#d4a843]" />
              </div>
              <h2 className="text-xl font-bold text-[#fafafa] mb-2">Verify Your Phone</h2>
              <p className="text-sm text-text-muted">
                We sent a 6-digit code to <span className="text-[#fafafa] font-medium">{phoneNumber}</span>
              </p>
            </div>

            {renderCodeInputs(phoneCode, setPhoneCode, phoneInputRefs)}

            <button
              onClick={handleVerifyPhoneCode}
              disabled={loading || phoneCode.join('').length < 6}
              className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 gold-bg text-brand-black disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <div className="text-center">
              {phoneTimer > 0 ? (
                <p className="text-xs text-text-muted">Resend code in {phoneTimer}s</p>
              ) : (
                <button
                  onClick={() => { handleSendPhoneCode(); setPhoneCode(['', '', '', '', '', '']) }}
                  className="text-xs text-gold hover:text-gold/80 transition-colors font-semibold"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP: 2FA Verification */}
        {step === '2fa' && (
          <div className="space-y-6">
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-gold transition-colors mb-2">
              <ChevronLeft size={16} /> Back
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-[#d4a843]" />
              </div>
              <h2 className="text-xl font-bold text-[#fafafa] mb-2">Two-Factor Authentication</h2>
              <p className="text-sm text-text-muted">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {renderCodeInputs(twoFACode, setTwoFACode, twoFAInputRefs)}

            <button
              onClick={handleVerify2FA}
              disabled={loading || twoFACode.join('').length < 6}
              className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 gold-bg text-brand-black disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="text-center">
              <p className="text-xs text-text-muted">
                Lost access to your authenticator?{' '}
                <button className="text-gold hover:text-gold/80 transition-colors font-semibold">
                  Use recovery code
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] text-text-muted/50">Secured with end-to-end encryption</p>
        </div>
      </div>
    </div>
  )
}
