import { useState } from 'react';
import orcaLogo from 'figma:asset/bb18e3f470e30dc5313d2b4328ae8bb9d12e0188.png';
import {
  Eye, EyeOff, Mail, Lock, User as UserIcon,
  ChevronRight, BarChart3, Receipt, PiggyBank,
  Users, CheckSquare, Calendar, Shield, ArrowRight
} from 'lucide-react';
import type { User } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LoginProps {
  onLogin: (user: User) => void;
}

const ADMIN_EMAIL = 'mckiveja@gmail.com';

const features = [
  {
    icon: BarChart3,
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'Smart Stack',
    desc: 'Track every dollar in and out. Plan paychecks, split bills, and see exactly how much is safe to spend.',
  },
  {
    icon: Receipt,
    color: '#EF4444',
    bg: '#FEF2F2',
    title: 'Bill Boss',
    desc: 'Never miss a bill. See all dues in one place, mark payments, and stay ahead of every deadline.',
  },
  {
    icon: PiggyBank,
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'Savings Goals',
    desc: 'Set targets, track progress, and watch your savings grow with visual goal trackers.',
  },
  {
    icon: Users,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    title: 'Stack Circle',
    desc: 'Save together with friends or family. Create group goals, invite members, and share progress.',
  },
  {
    icon: CheckSquare,
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'Task List',
    desc: 'Organize to-dos, groceries, meetings, and notes — all linked to your financial life.',
  },
  {
    icon: Calendar,
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Calendar View',
    desc: 'See bills, payments, and events on a unified calendar so nothing sneaks up on you.',
  },
];

const steps = [
  { num: '01', title: 'Create your account', desc: 'Sign up in seconds — no credit card required.' },
  { num: '02', title: 'Add your income & bills', desc: 'Enter what you earn and what you owe each month.' },
  { num: '03', title: 'See your Safe to Spend', desc: 'ORCA calculates what\'s truly available after bills.' },
  { num: '04', title: 'Take control', desc: 'Pay bills, hit goals, and build wealth — all in one place.' },
];

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { currentTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    const isAdmin = email.toLowerCase().trim() === ADMIN_EMAIL;
    const displayName = name.trim() || (isAdmin ? 'Bizzy' : email.split('@')[0]);

    onLogin({ name: displayName, email: email.toLowerCase().trim(), isAdmin });
  };

  return (
    <div className="min-h-screen flex" style={{ background: currentTheme.pageBg }}>
      {/* LEFT PANEL — Feature explanation */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 xl:p-14"
        style={{ 
          width: '55%', 
          background: `linear-gradient(160deg, ${currentTheme.sidebarGradientFrom} 0%, ${currentTheme.sidebarGradientTo} 60%, ${currentTheme.pageBg} 100%)`, 
          borderRight: `1px solid ${currentTheme.sidebarBorderColor}` 
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={orcaLogo} alt="ORCA" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <div style={{ color: currentTheme.primary, fontWeight: 900, fontSize: 18, letterSpacing: '0.08em' }}>ORCA</div>
            <div style={{ color: '#64748B', fontSize: 10, letterSpacing: '0.14em', fontWeight: 600 }}>ORGANIZE RESOURCES CONTROL ASSETS</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="py-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: currentTheme.navActiveBg, border: `1px solid ${currentTheme.sidebarBorderColor}`, color: currentTheme.primaryLight, fontWeight: 600 }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentTheme.primaryLight }} />
            Your Financial Command Center
          </div>
          <h1 className="mb-4" style={{ fontSize: 38, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.15 }}>
            Take complete control<br />
            <span style={{ color: currentTheme.primary }}>of your money</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.7, maxWidth: 440 }}>
            ORCA is a personal finance command center that shows you exactly where your money goes, 
            what's safe to spend, and how to hit your financial goals — all in one beautifully designed platform.
          </p>
        </div>

        {/* How it works steps */}
        <div className="mb-8">
          <div className="text-xs mb-5" style={{ color: '#475569', fontWeight: 700, letterSpacing: '0.12em' }}>
            HOW IT WORKS
          </div>
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="mb-2" style={{ fontSize: 11, fontWeight: 800, color: currentTheme.primary, letterSpacing: '0.08em' }}>
                  {step.num}
                </div>
                <div className="text-sm mb-1" style={{ fontWeight: 700, color: '#F1F5F9' }}>{step.title}</div>
                <div className="text-xs" style={{ color: '#64748B', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div>
          <div className="text-xs mb-4" style={{ color: '#475569', fontWeight: 700, letterSpacing: '0.12em' }}>
            EVERYTHING INCLUDED
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${feat.color}20` }}>
                    <Icon className="w-4 h-4" style={{ color: feat.color }} />
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ fontWeight: 700, color: '#E2E8F0' }}>{feat.title}</div>
                    <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>{feat.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Auth form */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10"
        style={{ background: currentTheme.pageBg }}
      >
        {/* Mobile logo */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <img src={orcaLogo} alt="ORCA" className="w-16 h-16 rounded-2xl object-cover mb-3" />
          <div style={{ color: currentTheme.primary, fontWeight: 900, fontSize: 22, letterSpacing: '0.08em' }}>ORCA</div>
          <div style={{ color: '#64748B', fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>ORGANIZE RESOURCES CONTROL ASSETS</div>
        </div>

        <div className="w-full" style={{ maxWidth: 400 }}>
          {/* Tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-7"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm capitalize transition-all"
                style={{
                  background: mode === m ? currentTheme.primary : 'transparent',
                  color: mode === m ? '#FFFFFF' : '#64748B',
                  fontWeight: mode === m ? 700 : 500,
                }}
              >
                {m === 'login' ? 'Member Login' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Desktop logo (inside form panel) */}
          <div className="hidden lg:flex flex-col items-center mb-6">
            <img src={orcaLogo} alt="ORCA" className="w-14 h-14 rounded-2xl object-cover mb-3" style={{ boxShadow: `0 0 32px ${currentTheme.primary}50` }} />
            <div style={{ color: currentTheme.primary, fontWeight: 900, fontSize: 20, letterSpacing: '0.08em' }}>ORCA</div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>FINANCIAL COMMAND CENTER</div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9' }}>
              {mode === 'login' ? 'Welcome back' : 'Get started free'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              {mode === 'login'
                ? 'Sign in to your financial command center'
                : 'Join thousands taking control of their finances'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
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
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg"
                  style={{ color: '#475569' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm transition-all hover:opacity-90 mt-2"
              style={{ background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryLight} 100%)`, color: '#fff', fontWeight: 700 }}
            >
              {mode === 'login' ? 'Sign In' : 'Create My Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center mt-5">
            <span className="text-sm" style={{ color: '#475569' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already a member? '}
            </span>
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-sm transition-all hover:opacity-80"
              style={{ color: currentTheme.primaryLight, fontWeight: 700 }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <Shield className="w-3.5 h-3.5" style={{ color: '#334155' }} />
            <span style={{ color: '#334155', fontSize: 11 }}>Secured with end-to-end encryption</span>
          </div>

          {/* Sign up feature highlights (mobile) */}
          {mode === 'signup' && (
            <div className="mt-8 space-y-3 lg:hidden">
              <div className="text-xs mb-3" style={{ color: '#475569', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                What you get
              </div>
              {features.slice(0, 4).map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${feat.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: feat.color }} />
                    </div>
                    <div>
                      <span className="text-xs" style={{ fontWeight: 700, color: '#CBD5E1' }}>{feat.title}</span>
                      <span className="text-xs ml-2" style={{ color: '#475569' }}>— {feat.desc.split('.')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}