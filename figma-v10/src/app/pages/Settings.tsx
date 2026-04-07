import { useState } from 'react';
import {
  User, Wallet, CreditCard, Palette, Shield, LogOut,
  AlertTriangle, Save, Edit2, ChevronRight, Check, Moon, Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ALL_THEMES } from '../context/ThemeContext';

type SettingsTab = 'account' | 'financial' | 'appearance' | 'privacy';

const tabs = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'financial', label: 'Financial', icon: Wallet },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'privacy', label: 'Privacy & Data', icon: Shield },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const { colorThemeId, setColorTheme, isDark, toggleTheme, currentTheme } = useTheme();
  const [balance, setBalance] = useState('');
  const [creditScore, setCreditScore] = useState('648');
  const [transUnion, setTransUnion] = useState('');
  const [equifax, setEquifax] = useState('');
  const [experian, setExperian] = useState('');
  const [fullName, setFullName] = useState('Bizzy');
  const [email, setEmail] = useState('mckiveja@gmail.com');

  const womenThemes = ALL_THEMES.filter(t => t.category === 'women');
  const menThemes = ALL_THEMES.filter(t => t.category === 'men');

  const cardBg = isDark ? `${currentTheme.sidebarBg}` : '#FFFFFF';
  const cardBorder = isDark ? currentTheme.sidebarBorderColor : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#64748B';
  const inputBg = isDark ? `${currentTheme.pageBg}` : '#F8FAFC';
  const inputBorder = isDark ? currentTheme.sidebarBorderColor : '#E2E8F0';
  const inputText = isDark ? '#E2E8F0' : '#0F172A';

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>Manage your account, preferences, and data</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar nav */}
          <div className="sm:w-52 flex-shrink-0">
            <div
              className="rounded-2xl p-2 sticky top-6"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
            >
              {tabs.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as SettingsTab)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5"
                    style={{
                      background: active ? currentTheme.navActiveBg : 'transparent',
                      color: active ? currentTheme.primaryLight : textMuted,
                      fontWeight: active ? 700 : 400,
                      textAlign: 'left',
                      border: active ? `1px solid ${currentTheme.sidebarBorderColor}` : '1px solid transparent',
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? currentTheme.navActiveIcon : textMuted }} />
                    {label}
                    {active && <ChevronRight className="w-4 h-4 ml-auto opacity-70" style={{ color: currentTheme.navActiveIcon }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-5">

            {/* Account */}
            {activeTab === 'account' && (
              <>
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary }} className="mb-5">Account</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: currentTheme.primary, fontSize: 22, fontWeight: 800 }}
                    >
                      B
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: textPrimary, fontSize: 16 }}>{fullName}</div>
                      <div className="text-sm" style={{ color: textMuted }}>{email}</div>
                      <div
                        className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                        Active
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Full Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                        />
                        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                        />
                        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
                      </div>
                    </div>
                  </div>

                  <button
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{ background: currentTheme.primary, color: '#fff', fontWeight: 700 }}
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {/* Financial */}
            {activeTab === 'financial' && (
              <>
                {/* Checking account */}
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${currentTheme.primary}18` }}>
                      <Wallet className="w-5 h-5" style={{ color: currentTheme.primary }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Checking / Spending Account</h2>
                      <p className="text-sm mt-0.5" style={{ color: textMuted }}>
                        Enter your current balance to calculate your Safe to Spend amount
                      </p>
                    </div>
                  </div>

                  <label className="block text-xs mb-1.5" style={{ color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Current Balance
                  </label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: textMuted }}>$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                    />
                  </div>

                  <div
                    className="flex items-start gap-2 p-3 rounded-xl mb-4 text-xs"
                    style={{ background: `${currentTheme.primary}15`, color: currentTheme.primaryLight }}
                  >
                    ℹ️ This balance combines with your incoming payments. Bills are allocated first, and the remainder becomes your "Safe to Spend" on the Dashboard.
                  </div>

                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{ background: currentTheme.primary, color: '#fff', fontWeight: 700 }}
                  >
                    <Save className="w-4 h-4" />
                    Save Balance
                  </button>
                </div>

                {/* Credit Scores */}
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
                      <CreditCard className="w-5 h-5" style={{ color: '#D97706' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Credit Scores</h2>
                      <p className="text-sm mt-0.5" style={{ color: textMuted }}>Track your credit across all 3 bureaus</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Overall Score (300–850)
                      </label>
                      <input
                        type="number"
                        placeholder="648"
                        value={creditScore}
                        onChange={(e) => setCreditScore(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                      />
                      <p className="text-xs mt-1" style={{ color: textMuted }}>Your primary credit score (300–850)</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'TransUnion', val: transUnion, set: setTransUnion },
                        { label: 'Equifax', val: equifax, set: setEquifax },
                        { label: 'Experian', val: experian, set: setExperian },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className="block text-xs mb-1.5" style={{ color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {label}
                          </label>
                          <input
                            type="number"
                            placeholder="—"
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center"
                            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{ background: currentTheme.primary, color: '#fff', fontWeight: 700 }}
                  >
                    <Save className="w-4 h-4" />
                    Save Credit Scores
                  </button>
                </div>
              </>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* Dark / Light mode toggle */}
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary }} className="mb-1">Display Mode</h2>
                  <p className="text-sm mb-4" style={{ color: textMuted }}>Choose between dark and light backgrounds</p>
                  <div className="flex gap-3">
                    {[
                      { label: 'Dark Mode', icon: Moon, value: true },
                      { label: 'Light Mode', icon: Sun, value: false },
                    ].map(({ label, icon: Icon, value }) => {
                      const active = isDark === value;
                      return (
                        <button
                          key={label}
                          onClick={() => { if (!active) toggleTheme(); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all"
                          style={{
                            background: active ? currentTheme.navActiveBg : (isDark ? `${currentTheme.pageBg}` : '#F8FAFC'),
                            border: `2px solid ${active ? currentTheme.primary : (isDark ? currentTheme.sidebarBorderColor : '#E2E8F0')}`,
                            color: active ? currentTheme.primaryLight : textMuted,
                            fontWeight: active ? 700 : 400,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                          {active && <Check className="w-3.5 h-3.5 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Women's Themes */}
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 17 }}>💜</span>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary }}>Themes for Women</h2>
                  </div>
                  <p className="text-sm mb-4" style={{ color: textMuted }}>Vivid & Night variants</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {womenThemes.map((theme) => {
                      const active = colorThemeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setColorTheme(theme.id)}
                          className="relative flex flex-col items-start p-3 rounded-xl transition-all hover:scale-[1.02]"
                          style={{
                            background: active ? theme.navActiveBg : (isDark ? `${theme.sidebarBg}80` : '#F8FAFC'),
                            border: `2px solid ${active ? theme.primary : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0')}`,
                            boxShadow: active ? `0 0 16px ${theme.primary}33` : 'none',
                          }}
                        >
                          {/* Gradient swatch */}
                          <div
                            className="w-full h-10 rounded-lg mb-2.5 relative overflow-hidden flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.swatchFrom}, ${theme.swatchTo})` }}
                          >
                            {theme.variant === 'night' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Moon className="w-3.5 h-3.5 text-white opacity-60" />
                              </div>
                            )}
                            {active && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#fff' }}>
                                <Check className="w-2.5 h-2.5" style={{ color: theme.primary }} />
                              </div>
                            )}
                          </div>
                          <span className="text-xs" style={{ fontWeight: 600, color: active ? theme.primaryLight : textPrimary }}>
                            {theme.name}
                          </span>
                          <span className="text-xs mt-0.5" style={{ color: textMuted, fontSize: 10 }}>
                            {theme.variant === 'vivid' ? '✨ Vivid' : '🌙 Night'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Men's Themes */}
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 17 }}>🔥</span>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary }}>Themes for Men</h2>
                  </div>
                  <p className="text-sm mb-4" style={{ color: textMuted }}>Vivid & Night variants</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {menThemes.map((theme) => {
                      const active = colorThemeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setColorTheme(theme.id)}
                          className="relative flex flex-col items-start p-3 rounded-xl transition-all hover:scale-[1.02]"
                          style={{
                            background: active ? theme.navActiveBg : (isDark ? `${theme.sidebarBg}80` : '#F8FAFC'),
                            border: `2px solid ${active ? theme.primary : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0')}`,
                            boxShadow: active ? `0 0 16px ${theme.primary}33` : 'none',
                          }}
                        >
                          {/* Gradient swatch */}
                          <div
                            className="w-full h-10 rounded-lg mb-2.5 relative overflow-hidden flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.swatchFrom}, ${theme.swatchTo})` }}
                          >
                            {theme.variant === 'night' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Moon className="w-3.5 h-3.5 text-white opacity-60" />
                              </div>
                            )}
                            {active && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#fff' }}>
                                <Check className="w-2.5 h-2.5" style={{ color: theme.primary }} />
                              </div>
                            )}
                          </div>
                          <span className="text-xs" style={{ fontWeight: 600, color: active ? theme.primaryLight : textPrimary }}>
                            {theme.name}
                          </span>
                          <span className="text-xs mt-0.5" style={{ color: textMuted, fontSize: 10 }}>
                            {theme.variant === 'vivid' ? '✨ Vivid' : '🌙 Night'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current theme preview badge */}
                <div
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: currentTheme.navActiveBg, border: `1px solid ${currentTheme.sidebarBorderColor}` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${currentTheme.swatchFrom}, ${currentTheme.swatchTo})` }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: currentTheme.primaryLight, fontSize: 14 }}>
                      Active: {currentTheme.name}
                    </div>
                    <div style={{ color: textMuted, fontSize: 12 }}>
                      {currentTheme.variant === 'vivid' ? '✨ Vivid' : '🌙 Night'} · {currentTheme.category === 'women' ? 'Women\'s' : 'Men\'s'} Collection
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy */}
            {activeTab === 'privacy' && (
              <>
                <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary }} className="mb-4">Privacy & Data</h2>
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm"
                    style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}
                  >
                    🔒 Your data is encrypted and stored securely. We never share your information with third parties without explicit consent.
                  </div>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{ background: '#EF4444', color: '#fff', fontWeight: 700 }}
                  >
                    Reset All Data
                  </button>
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm transition-all hover:opacity-90"
                  style={{ background: '#EF4444', color: '#fff', fontWeight: 700 }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>

                {/* Danger Zone */}
                <div
                  className="rounded-2xl p-5"
                  style={{ background: '#FFF5F5', border: '2px solid #FCA5A5' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444' }}>Danger Zone</h2>
                  </div>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>Permanently delete your account</div>
                      <div className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                        This will permanently remove your account and all associated data (bills, income, goals, expenses, credit scores, and rent history) across all devices. This action cannot be undone.
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                    style={{ background: '#EF4444', color: '#fff', fontWeight: 700 }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Delete My Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}