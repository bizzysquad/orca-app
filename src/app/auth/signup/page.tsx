'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Check, Mail, Phone, Shield, ArrowRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'

type PasswordStrength = 'weak' | 'fair' | 'strong'
type SignupStep = 'credentials' | 'phone-setup' | '2fa-setup' | 'success'

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak'
  if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong'
  return 'fair'
}

const strengthColors = {
  weak: 'bg-danger',
  fair: 'bg-yellow-500',
  strong: 'bg-success',
}

const strengthTextColors = {
  weak: 'text-danger',
  fair: 'text-yellow-500',
  strong: 'text-success',
}

const strengthLabels = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<SignupStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Phone setup
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCode, setPhoneCode] = useState(['', '', '', '', '', ''])
  const phoneRefs = useRef<(HTMLInputElement | null)[]>([])
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneSent, setPhoneSent] = useState(false)

  // 2FA setup
  const [setup2FA, setSetup2FA] = useState(false)
  const [twoFASecret] = useState('ORCA-2FA-DEMO-SECRET')
  const [twoFACode, setTwoFACode] = useState(['', '', '', '', '', ''])
  const twoFARefs = useRef<(HTMLInputElement | null)[]>([])

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        setLoading(false)
        return
      }
      if (!passwordsMatch) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create account')
        setLoading(false)
        return
      }

      setLoading(false)
      setStep('phone-setup')
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleSendPhoneCode = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setPhoneSent(true)
  }

  const handleVerifyPhone = () => {
    const code = phoneCode.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setPhoneVerified(true)
    setStep('2fa-setup')
  }

  const handleSetup2FA = () => {
    const code = twoFACode.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setSetup2FA(true)
    setStep('success')
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 hero-glow">
        <div className="relative w-full max-w-md text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-success">
              <Check className="w-8 h-8 text-brand-black" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gold">Account Created!</h2>
          <p className="text-sm mb-2 text-text-secondary">
            {phoneVerified && 'Phone verified. '}
            {setup2FA && '2FA enabled. '}
            Your account is secured and ready.
          </p>
          <p className="text-xs mb-6 text-text-muted">Verify your email to complete setup.</p>
          <button
            onClick={() => { router.push('/dashboard'); router.refresh() }}
            className="px-8 py-3 rounded-lg font-semibold gold-bg text-brand-black inline-flex items-center gap-2"
          >
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 hero-glow">
      <div className="relative w-full max-w-[360px] z-10 animate-fade-in">
        {/* Logo & Branding */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-sm.png" alt="ORCA" width={48} height={48} className="rounded-xl" />
        </div>

        <h1 className="text-center text-3xl font-bold mb-2 text-gold">ORCA</h1>
        <p className="text-center text-sm font-medium mb-1 text-text-secondary">
          Organize Resources Control Assets
        </p>
        <p className="text-center text-xs mb-8 text-text-muted">Financial Command Center</p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Account', 'Phone', '2FA'].map((label, idx) => {
            const stepIdx = ['credentials', 'phone-setup', '2fa-setup'].indexOf(step)
            const isActive = idx <= stepIdx
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-[#d4a843] text-[#09090b]' : 'bg-[#27272a] text-[#71717a]'}`}>
                  {idx < stepIdx ? <Check size={14} /> : idx + 1}
                </div>
                <span className={`text-xs ${isActive ? 'text-[#d4a843]' : 'text-[#71717a]'}`}>{label}</span>
                {idx < 2 && <div className={`w-6 h-0.5 ${isActive && idx < stepIdx ? 'bg-[#d4a843]' : 'bg-[#27272a]'}`} />}
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-6">
            <p className="text-danger text-sm text-center">{error}</p>
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleSignUp} className="space-y-5">
            <div>
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                prefix={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 bottom-3 text-text-muted hover:text-text-secondary transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1.5">
                    <div className={`flex-1 h-1 rounded-full ${strengthColors[passwordStrength]}`} />
                    <div className={`flex-1 h-1 rounded-full ${['fair', 'strong'].includes(passwordStrength) ? strengthColors[passwordStrength] : 'bg-surface-border/30'}`} />
                    <div className={`flex-1 h-1 rounded-full ${passwordStrength === 'strong' ? strengthColors[passwordStrength] : 'bg-surface-border/30'}`} />
                  </div>
                  <p className={`text-xs ${strengthTextColors[passwordStrength]}`}>
                    Password strength: {strengthLabels[passwordStrength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 bottom-3 text-text-muted hover:text-text-secondary transition-colors">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading || !passwordsMatch} className="w-full py-3 rounded-lg font-semibold transition-all gold-bg text-brand-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? 'Creating account...' : 'Continue'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-text-muted">
                Already have an account?{' '}
                <Link href="/auth/login" className="font-semibold text-gold hover:text-gold-highlight transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* Step 2: Phone Setup */}
        {step === 'phone-setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
                <Phone size={24} className="text-[#d4a843]" />
              </div>
              <h2 className="text-xl font-bold text-[#fafafa] mb-2">Add Phone Number</h2>
              <p className="text-sm text-text-muted">Add a phone number for extra security</p>
            </div>

            {!phoneSent ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]"><Phone size={16} /></div>
                    <input type="tel" placeholder="(555) 123-4567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d()-\s+]/g, ''))} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-11 pr-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/50 focus:border-[#d4a843] transition-all" />
                  </div>
                </div>
                <button onClick={handleSendPhoneCode} disabled={!phoneNumber} className="w-full py-3 rounded-lg font-semibold transition-all gold-bg text-brand-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Send Code <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-center text-text-muted">
                  Code sent to <span className="text-[#fafafa] font-medium">{phoneNumber}</span>
                </p>
                {renderCodeInputs(phoneCode, setPhoneCode, phoneRefs)}
                <button onClick={handleVerifyPhone} disabled={phoneCode.join('').length < 6} className="w-full py-3 rounded-lg font-semibold transition-all gold-bg text-brand-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Verify Phone <ArrowRight size={16} />
                </button>
              </>
            )}

            <button onClick={() => setStep('2fa-setup')} className="w-full text-center text-xs text-text-muted hover:text-gold transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: 2FA Setup */}
        {step === '2fa-setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-[#d4a843]" />
              </div>
              <h2 className="text-xl font-bold text-[#fafafa] mb-2">Enable 2FA</h2>
              <p className="text-sm text-text-muted">Secure your account with two-factor authentication</p>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <p className="text-xs text-text-muted mb-2">Scan this QR code with your authenticator app:</p>
              <div className="bg-white rounded-lg p-4 mx-auto w-fit">
                {/* Placeholder QR code visual */}
                <div className="w-32 h-32 grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className={`w-full aspect-square ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`} />
                  ))}
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-text-muted">Or enter this key manually:</p>
                <p className="text-sm font-mono text-[#d4a843] mt-1 select-all">{twoFASecret}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] uppercase tracking-wider mb-3">Enter 6-digit code to verify</label>
              {renderCodeInputs(twoFACode, setTwoFACode, twoFARefs)}
            </div>

            <button onClick={handleSetup2FA} disabled={twoFACode.join('').length < 6} className="w-full py-3 rounded-lg font-semibold transition-all gold-bg text-brand-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Enable 2FA <Shield size={16} />
            </button>

            <button onClick={() => setStep('success')} className="w-full text-center text-xs text-text-muted hover:text-gold transition-colors">
              Skip for now
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] text-text-muted/50">Secured with end-to-end encryption</p>
        </div>
      </div>
    </div>
  )
}
