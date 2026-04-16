import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, BarChart3, Receipt, Users,
  CheckSquare, Settings, Shield, Menu, X,
  Bell, Search, ChevronRight, LogOut, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MobileHomeButton } from './MobileHomeButton';
import orcaLogo from 'figma:asset/bb18e3f470e30dc5313d2b4328ae8bb9d12e0188.png';

const navGroups = [
  {
    label: 'MAIN',
    items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'FINANCE',
    items: [
      { path: '/smart-stack', label: 'Smart Stack', icon: BarChart3 },
      { path: '/bill-boss', label: 'Bill Boss', icon: Receipt },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [{ path: '/stack-circle', label: 'Stack Circle', icon: Users }],
  },
  {
    label: 'PRODUCTIVITY',
    items: [{ path: '/task-list', label: 'Task List', icon: CheckSquare }],
  },
];

// ── Command items for the floating search/command button ────────────────────
const COMMAND_ITEMS = [
  { path: '/',            label: 'Dashboard',   icon: LayoutDashboard, color: '#6366F1' },
  { path: '/smart-stack', label: 'Smart Stack', icon: BarChart3,       color: '#10B981' },
  { path: '/bill-boss',   label: 'Bill Boss',   icon: Receipt,         color: '#EF4444' },
  { path: '/stack-circle',label: 'Stack Circle',icon: Users,           color: '#0891B2' },
  { path: '/task-list',   label: 'Task List',   icon: CheckSquare,     color: '#8B5CF6' },
  { path: '/settings',    label: 'Settings',    icon: Settings,        color: '#F59E0B' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, currentTheme } = useTheme();

  // Close command menu on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCmdOpen(false); setCmdQuery(''); }
      // ⌘K / Ctrl+K shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); setCmdQuery(''); }
    };
    const handleClick = (e: MouseEvent) => {
      if (cmdRef.current && !cmdRef.current.contains(e.target as Node)) { setCmdOpen(false); setCmdQuery(''); }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick); };
  }, []);

  const filteredItems = cmdQuery.trim()
    ? COMMAND_ITEMS.filter(i => i.label.toLowerCase().includes(cmdQuery.toLowerCase()))
    : COMMAND_ITEMS;

  const handleCmdNavigate = (path: string) => { navigate(path); setCmdOpen(false); setCmdQuery(''); setSidebarOpen(false); };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/smart-stack') return 'Smart Stack';
    if (path === '/bill-boss') return 'Bill Boss';
    if (path === '/stack-circle') return 'Stack Circle';
    if (path === '/task-list') return 'Task List';
    if (path === '/settings') return 'Settings';
    if (path === '/admin') return 'Admin Panel';
    return 'ORCA';
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Dark mode colors
  const D = {
    sidebar: currentTheme.sidebarBg,
    sidebarBorder: currentTheme.sidebarBorderColor,
    headerBg: isDark ? currentTheme.headerBg : '#FFFFFF',
    headerBorder: isDark ? `${currentTheme.primary}22` : '#E2E8F0',
    pageBg: isDark ? currentTheme.pageBg : '#F0F2FA',
    searchBg: isDark ? `${currentTheme.sidebarBg}` : '#F8FAFC',
    searchBorder: isDark ? `${currentTheme.primary}30` : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#64748B' : '#94A3B8',
    inputText: isDark ? '#94A3B8' : '#94A3B8',
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: D.pageBg }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: 240,
          background: `linear-gradient(180deg, ${currentTheme.sidebarGradientFrom} 0%, ${currentTheme.sidebarGradientTo} 100%)`,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: `1px solid ${D.sidebarBorder}` }}>
          <img src={orcaLogo} alt="ORCA" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" style={{ boxShadow: `0 0 12px ${currentTheme.primary}44` }} />
          <div className="min-w-0">
            <div style={{ color: currentTheme.primaryLight, fontWeight: 900, fontSize: 14, letterSpacing: '0.06em' }}>ORCA</div>
            <div style={{ color: '#475569', fontSize: 9, letterSpacing: '0.1em', fontWeight: 600 }}>FINANCIAL CONTROL</div>
          </div>
          <button className="ml-auto lg:hidden p-1 rounded-lg text-slate-400 hover:text-white flex-shrink-0" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <div className="px-3 mb-1.5" style={{ color: `${currentTheme.primaryLight}55`, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(item => {
                  const NavIcon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.exact}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`
                      }
                      style={({ isActive }) => ({
                        background: isActive ? currentTheme.navActiveBg : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <NavIcon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? currentTheme.navActiveIcon : '#475569' }} />
                          <span className="flex-1">{item.label}</span>
                          {isActive && <ChevronRight className="w-3 h-3" style={{ color: currentTheme.navActiveIcon }} />}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${D.sidebarBorder}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`
            }
            style={({ isActive }) => ({ background: isActive ? currentTheme.navActiveBg : 'transparent', fontWeight: isActive ? 600 : 400 })}
          >
            {({ isActive }) => (
              <>
                <Settings className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? currentTheme.navActiveIcon : '#475569' }} />
                <span>Settings</span>
              </>
            )}
          </NavLink>

          {user.isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`
              }
              style={({ isActive }) => ({ background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent', fontWeight: isActive ? 600 : 400 })}
            >
              {({ isActive }) => (
                <>
                  <Shield className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#F59E0B' : '#475569' }} />
                  <span style={{ color: isActive ? '#FBBF24' : undefined }}>Admin Panel</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontWeight: 700, fontSize: 9 }}>ADMIN</span>
                </>
              )}
            </NavLink>
          )}
        </div>

        {/* User profile */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${D.sidebarBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: currentTheme.primary, fontSize: 11, fontWeight: 800 }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white truncate" style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
              <div className="truncate" style={{ color: '#475569', fontSize: 10 }}>{user.email}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0" style={{ color: '#475569' }} title="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 lg:px-6" style={{ background: D.headerBg, borderBottom: `1px solid ${D.headerBorder}`, height: 60, flexShrink: 0, transition: 'background 0.2s, border-color 0.2s' }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg" style={{ color: D.muted }}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <img src={orcaLogo} alt="ORCA" className="w-7 h-7 rounded-lg object-cover" />
            <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: 13, letterSpacing: '0.06em' }}>ORCA</span>
          </div>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2">
            <span style={{ color: D.muted, fontSize: 13 }}>ORCA</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: D.muted }} />
            <span style={{ color: D.text, fontSize: 13, fontWeight: 600 }}>{getPageTitle()}</span>
          </div>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 ml-3 flex-1" style={{ maxWidth: 300, background: D.searchBg, border: `1px solid ${D.searchBorder}`, borderRadius: 12, padding: '6px 14px', transition: 'background 0.2s' }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: D.muted }} />
            <input type="text" placeholder="Search anything..." className="bg-transparent outline-none text-sm w-full" style={{ color: D.text }} />
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Dark/Light toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{ background: isDark ? `${currentTheme.primary}25` : '#F1F5F9', color: isDark ? currentTheme.primaryLight : '#64748B' }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button className="relative p-2 rounded-xl transition-colors" style={{ color: D.muted }}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />
            </button>

            {user.isAdmin && (
              <button onClick={() => navigate('/admin')} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80" style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)' }}>
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            )}

            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer flex-shrink-0" style={{ background: currentTheme.primary, fontSize: 11, fontWeight: 800 }}>{initials}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: D.pageBg, transition: 'background 0.2s' }}>
          <Outlet />
          <MobileHomeButton />
        </main>
      </div>

      {/* ── Floating Command / Search Button ─────────────────────────────── */}
      <div ref={cmdRef}>
        {/* FAB */}
        <button
          onClick={() => { setCmdOpen(o => !o); setCmdQuery(''); }}
          className="fixed z-40 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            bottom: 88,
            right: 24,
            width: 52,
            height: 52,
            borderRadius: 26,
            background: cmdOpen
              ? (isDark ? '#6366F1' : '#4F46E5')
              : (isDark ? '#1E293B' : '#FFFFFF'),
            border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: cmdOpen ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
            cursor: 'pointer',
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
          }}
          title="Command menu (⌘K)"
          aria-label="Open command menu"
        >
          {cmdOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        {/* Command palette popup */}
        {cmdOpen && (
          <div
            className="fixed z-50 rounded-2xl overflow-hidden"
            style={{
              bottom: 152,
              right: 16,
              width: 280,
              background: isDark ? '#1E293B' : '#FFFFFF',
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
              <input
                type="text"
                placeholder="Go to..."
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                autoFocus
              />
              <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: isDark ? '#334155' : '#F1F5F9', color: isDark ? '#64748B' : '#94A3B8', fontSize: 10 }}>⌘K</kbd>
            </div>

            {/* Navigation items */}
            <div className="py-1.5">
              <div className="px-4 pb-1" style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#475569' : '#CBD5E1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Navigate
              </div>
              {filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleCmdNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:opacity-80"
                    style={{
                      background: isActive ? (isDark ? '#1E1B4B' : '#EEF2FF') : 'transparent',
                      color: isActive ? item.color : (isDark ? '#F1F5F9' : '#0F172A'),
                      fontWeight: isActive ? 700 : 400,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}18` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${item.color}20`, color: item.color, fontWeight: 600 }}>
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="px-4 py-4 text-sm text-center" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>No results</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}