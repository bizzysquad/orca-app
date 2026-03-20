'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'

type PasswordStrength = 'weak' | 'fair' | 'strong'

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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

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

      setSuccess(true)
      setLoading(false)

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 hero-glow">
        <div className="relative w-full max-w-md text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-success">
              <Check className="w-8 h-8 text-brand-black" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gold">Account Created!</h2>
          <p className="text-sm mb-4 text-text-secondary">
            Verify your email to complete signup. We&apos;ll redirect you shortly.
          </p>
          <p className="text-xs text-text-muted">Redirecting...</p>
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

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-6">
            <p className="text-danger text-sm text-center">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 bottom-3 text-text-muted hover:text-text-secondary transition-colors"
              >
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
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 bottom-3 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              className="w-full py-3 rounded-lg font-semibold transition-all gold-bg text-brand-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-xs text-text-muted">EXISTING USER?</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        {/* Sign in link */}
        <div className="text-center">
          <p className="text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-gold hover:text-gold-highlight transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
