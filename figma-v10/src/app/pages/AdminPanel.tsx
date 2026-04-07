import { useState } from 'react';
import { useNavigate } from 'react-router';
import orcaLogo from 'figma:asset/bb18e3f470e30dc5313d2b4328ae8bb9d12e0188.png';
import {
  Users, CreditCard, Layers, Sliders, Shield, BarChart2,
  Bell, HelpCircle, RefreshCw, ArrowLeft, Search,
  MoreHorizontal, ChevronUp, ChevronDown, Edit2, GripVertical,
  CheckCircle, XCircle, AlertCircle, LogOut, Plus, Trash2,
  Send, Activity, Star, Zap, PiggyBank, Receipt, Calendar,
  CheckSquare, Upload, Settings, Palette,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type AdminTab = 'users' | 'billing' | 'modules' | 'customize' | 'security' | 'analytics' | 'notifications' | 'support';
type BillingSubTab = 'subscription' | 'invoices';
type ModulesSubTab = 'smart' | 'tasks';
type CustomizeSubTab = 'app-settings' | 'theme' | 'navigation';

// ── Static data ────────────────────────────────────────────────────────────
const USERS = [
  { id: 1, name: 'Ebony Greene',    email: 'chantaygreene@gmail.com',    status: 'Trial', plan: 'Trial', twoFA: false, lastActive: '1 hour ago' },
  { id: 2, name: 'Josephine Wooten',email: 'chefjosie@icloud.com',        status: 'Trial', plan: 'Trial', twoFA: false, lastActive: '2 hours ago' },
  { id: 3, name: 'Waydell Harris',  email: 'waydellharris@gmail.com',     status: 'Trial', plan: 'Trial', twoFA: false, lastActive: '1 day ago' },
  { id: 4, name: 'Keih Manning Jr', email: 'info@designerhomesre.com',    status: 'Trial', plan: 'Trial', twoFA: false, lastActive: '1 hour ago' },
  { id: 5, name: 'Edward Jones',    email: 'edward.jones252@yahoo.com',   status: 'Trial', plan: 'Trial', twoFA: false, lastActive: '4 days ago' },
  { id: 6, name: 'Bizzy',           email: 'mckiveja@gmail.com',          status: 'Admin', plan: 'Admin', twoFA: true,  lastActive: '39 min ago' },
];

const NAV_ITEMS = [
  { id: 1, label: 'Dashboard',    path: '/',             visible: true },
  { id: 2, label: 'Smart Stack',  path: '/smart-stack',  visible: true },
  { id: 3, label: 'Bill Boss',    path: '/bill-boss',    visible: true },
  { id: 4, label: 'Stack Circle', path: '/stack-circle', visible: true },
  { id: 5, label: 'Task List',    path: '/task-list',    visible: true },
  { id: 6, label: 'Settings',     path: '/settings',     visible: true },
];

const THEMES = [
  { key: 'ocean-blue',     label: 'Ocean Blue',     accent: '#2563EB', bg: '#EBF5FF', card: '#FFFFFF' },
  { key: 'sage-green',     label: 'Sage Green',     accent: '#16A34A', bg: '#F0FDF4', card: '#FFFFFF' },
  { key: 'sunset-orange',  label: 'Sunset Orange',  accent: '#EA580C', bg: '#FFF7ED', card: '#FFFFFF' },
  { key: 'rose-pink',      label: 'Rose Pink',      accent: '#DB2777', bg: '#FDF2F8', card: '#FFFFFF' },
  { key: 'lavender-purple',label: 'Lavender Purple',accent: '#7C3AED', bg: '#F5F3FF', card: '#FFFFFF' },
  { key: 'teal-mint',      label: 'Teal Mint',      accent: '#0D9488', bg: '#F0FDFA', card: '#FFFFFF' },
  { key: 'sand-beige',     label: 'Sand Beige',     accent: '#D97706', bg: '#FFFBEB', card: '#FFFFFF' },
  { key: 'sky-indigo',     label: 'Sky Indigo',     accent: '#4F46E5', bg: '#EEF2FF', card: '#FFFFFF' },
  { key: 'soft-gray',      label: 'Soft Gray',      accent: '#475569', bg: '#F8FAFC', card: '#FFFFFF' },
  { key: 'cool-aqua',      label: 'Cool Aqua',      accent: '#0891B2', bg: '#ECFEFF', card: '#FFFFFF' },
];

const NOTIF_TEMPLATES = [
  { name: 'Welcome Email',    type: 'Email', active: true },
  { name: 'Trial Expiring',   type: 'Email', active: true },
  { name: 'Payment Failed',   type: 'Email', active: true },
  { name: 'Weekly Summary',   type: 'Push',  active: true },
  { name: 'Budget Alert',     type: 'Push',  active: true },
  { name: 'New Feature',      type: 'Email', active: false },
];

// ── Toggle pill ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex-shrink-0 rounded-full px-3 py-1 text-xs transition-all"
      style={{
        background: on ? '#D1FAE5' : '#F1F5F9',
        color: on ? '#065F46' : '#94A3B8',
        border: `1px solid ${on ? '#6EE7B7' : '#E2E8F0'}`,
        fontWeight: 700,
        minWidth: 44,
      }}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{className?: string; style?: React.CSSProperties}>; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #DBEAFE' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function AdminPanel() {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [billingSubTab, setBillingSubTab] = useState<BillingSubTab>('subscription');
  const [modulesSubTab, setModulesSubTab] = useState<ModulesSubTab>('smart');
  const [customizeSubTab, setCustomizeSubTab] = useState<CustomizeSubTab>('app-settings');

  // Users state
  const [search, setSearch] = useState('');

  // Navigation state
  const [navItems, setNavItems] = useState(NAV_ITEMS.map(n => ({ ...n })));

  // Customize — App Settings
  const [appName, setAppName] = useState('ORCA');
  const [tagline, setTagline] = useState('Your Financial Compass');
  const [maxUsers, setMaxUsers] = useState('10000');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newSignups, setNewSignups] = useState(true);
  const [spendBuffer, setSpendBuffer] = useState('50');
  const [onboardMsg, setOnboardMsg] = useState("Welcome to ORCA! Let's set up your financial dashboard and start building smart money habits.");
  const [budgetWarning, setBudgetWarning] = useState('80');
  const [churnRisk, setChurnRisk] = useState('15');
  const [categories, setCategories] = useState(['Housing', 'Transportation', 'Food', 'Entertainment', 'Healthcare']);
  const [newCategory, setNewCategory] = useState('');
  const [layoutStyle, setLayoutStyle] = useState<'sidebar' | 'top' | 'hybrid'>('sidebar');

  // Customize — Theme
  const [adminTheme, setAdminTheme] = useState('ocean-blue');
  const [defaultUserTheme, setDefaultUserTheme] = useState('ocean-blue');

  // Feature flags
  const [flags, setFlags] = useState<Record<string, boolean>>({
    'Smart Stack': true, 'Bill Boss': true, 'Stack Circle': true,
    'Task Lists': true, 'Dark Mode': true, 'Light Mode': false,
    'Push Notifications': true, 'Receipt Upload': true, 'Credit Score Tracker': true,
    'Rent Tracker': true, 'Export Reports': false, 'AI Insights': false,
    'Social Sharing': true, 'Income Allocator': true,
    'Bill Recurrence': true, 'Calendar Sync': true, 'Invite System': true,
    'Savings Module': true, 'Projection Calculator': true, 'Check Splitter': true,
    'Paycheck History': true, 'Task Persistence': true, 'Live Data Sync': true,
    'Multiple Stack Circle Groups': true,
  });
  const toggleFlag = (k: string) => setFlags(f => ({ ...f, [k]: !f[k] }));

  // Notification templates
  const [notifTemplates, setNotifTemplates] = useState(NOTIF_TEMPLATES.map(t => ({ ...t })));

  // Security
  const [require2FA, setRequire2FA] = useState(false);
  const [fraudMonitoring, setFraudMonitoring] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [roles, setRoles] = useState([
    { id: 1, name: 'Super Admin', perms: ['*'], deletable: false },
    { id: 2, name: 'User Manager', perms: ['users.view', 'users.edit'], deletable: true },
  ]);
  const [newRole, setNewRole] = useState('');

  // Modules — Smart
  const [smartModules, setSmartModules] = useState({
    smartStackEnabled: true, billBossEnabled: true, stackCircleEnabled: true, taskListsEnabled: true,
    savingsEnabled: true, paymentsEnabled: true,
    billsRentPct: '50', savingsPct: '20', spendingPct: '30', autoLock: true,
    reminderDays: '3', lateFeeAlert: true, receiptUpload: true, rentTracker: true,
    maxGroupSize: '50', maxGroupsPerUser: '5', contentModeration: true, inviteOnly: false,
    maxToDo: '100', maxGrocery: '20', meetingReminders: true, quickNotes: true, taskSharing: false,
  });
  const setMod = (k: string, v: string | boolean) => setSmartModules(m => ({ ...m, [k]: v }));

  // Modules — Task
  const [taskFlags, setTaskFlags] = useState({
    'To-Do Lists': true, 'Grocery Lists': true, 'Meeting Reminders': true,
    'Quick Notes': true, 'Task Sharing': false, 'Calendar Sync': true,
  });
  const toggleTask = (k: string) => setTaskFlags(f => ({ ...f, [k as keyof typeof f]: !f[k as keyof typeof f] }));

  // Billing
  const [trialDuration, setTrialDuration] = useState('40');
  const [trialSlots, setTrialSlots] = useState('500');
  const [monthlyPrice, setMonthlyPrice] = useState('4.99');
  const [yearlyPrice, setYearlyPrice] = useState('49.99');

  const filteredUsers = USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleNavVisible = (id: number) => {
    setNavItems(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  };

  // ── Shared card wrapper ──────────────────────────────────────────────────
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: '#FFFFFF', border: '1px solid #DBEAFE' }}>
      {children}
    </div>
  );

  const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
    <div className="mb-4">
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1E40AF' }}>{children}</h2>
      {sub && <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{sub}</p>}
    </div>
  );

  const SubTabBar = ({ options, active, onSelect }: { options: { key: string; label: string }[]; active: string; onSelect: (k: string) => void }) => (
    <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#DBEAFE' }}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onSelect(o.key)}
          className="px-4 py-2 text-sm transition-all"
          style={{
            borderBottom: active === o.key ? '2px solid #2563EB' : '2px solid transparent',
            color: active === o.key ? '#2563EB' : '#64748B',
            fontWeight: active === o.key ? 700 : 500,
            marginBottom: -1,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const FieldRow = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{hint}</p>}
    </div>
  );

  const Input = ({ value, onChange, placeholder, prefix }: { value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string }) => (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
      {prefix && <span className="px-3 py-2.5 text-sm" style={{ color: '#94A3B8', borderRight: '1px solid #DBEAFE' }}>{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent"
        style={{ color: '#0F172A' }}
      />
    </div>
  );

  const ToggleRow = ({ label, sub, on, onToggle, badge }: { label: string; sub?: string; on: boolean; onToggle: () => void; badge?: string }) => (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div>
        <div className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: on ? '#DCFCE7' : '#F1F5F9', color: on ? '#16A34A' : '#94A3B8', fontWeight: 700 }}>
            {badge}
          </span>
        )}
        <Toggle on={on} onToggle={onToggle} />
      </div>
    </div>
  );

  // ── USERS TAB ───────────────────────────────────────────────────────────
  const UsersTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', value: '6',     icon: Users,       color: '#6366F1' },
          { label: 'Active',       value: '0',     icon: CheckCircle, color: '#10B981' },
          { label: 'Trial',        value: '5/500', icon: AlertCircle, color: '#F59E0B' },
          { label: 'Premium',      value: '0',     icon: CreditCard,  color: '#8B5CF6' },
          { label: 'Founding',     value: '0',     icon: Shield,      color: '#D97706' },
          { label: 'Suspended',    value: '0',     icon: XCircle,     color: '#EF4444' },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
        <strong>LIVE MODE</strong> — Showing 6 real users from database
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 rounded-xl px-4 py-2.5" style={{ background: '#FFFFFF', border: '1px solid #DBEAFE', minWidth: 200 }}>
          <Search className="w-4 h-4" style={{ color: '#94A3B8' }} />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none text-sm flex-1" style={{ color: '#0F172A' }} />
        </div>
        <select className="px-4 py-2 rounded-xl text-sm outline-none" style={{ background: '#FFFFFF', border: '1px solid #DBEAFE', color: '#374151' }}>
          <option>All Statuses</option><option>Active</option><option>Trial</option><option>Admin</option>
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #DBEAFE' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #EFF6FF' }}>
                {['Name', 'Email', 'Status', 'Plan', '2FA', 'Last Active', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs whitespace-nowrap" style={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F8FAFC' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => {
                const isAdmin = user.status === 'Admin';
                return (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-all" style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: isAdmin ? '#FEF3C7' : '#EEF2FF', color: isAdmin ? '#D97706' : '#6366F1', fontWeight: 700 }}>
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>{user.name}</div>
                          {isAdmin && <div style={{ fontSize: 9, fontWeight: 700, color: '#D97706', letterSpacing: '0.08em' }}>ADMIN</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>{user.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: isAdmin ? '#FEF3C7' : '#FFFBEB', color: isAdmin ? '#92400E' : '#D97706', fontWeight: 700 }}>{user.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>{user.plan}</td>
                    <td className="px-4 py-3.5">{user.twoFA ? <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} /> : <XCircle className="w-4 h-4" style={{ color: '#CBD5E1' }} />}</td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>{user.lastActive}</td>
                    <td className="px-4 py-3.5"><button className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: '#64748B' }}><MoreHorizontal className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3" style={{ borderTop: '1px solid #F1F5F9' }}>
          <span className="text-xs" style={{ color: '#94A3B8' }}>Showing {filteredUsers.length} of {USERS.length} users</span>
        </div>
      </div>
    </div>
  );

  // ── BILLING TAB ─────────────────────────────────────────────────────────
  const BillingTab = () => (
    <div>
      <SubTabBar options={[{ key: 'subscription', label: 'Subscription & Trial' }, { key: 'invoices', label: 'Invoices & Billing' }]} active={billingSubTab} onSelect={k => setBillingSubTab(k as BillingSubTab)} />

      {billingSubTab === 'subscription' && (
        <div className="space-y-5">
          {/* Trial Settings */}
          <Card>
            <SectionTitle>Trial Settings</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FieldRow label="Trial Duration (days)" hint="Default: 40 days"><Input value={trialDuration} onChange={setTrialDuration} /></FieldRow>
              <FieldRow label="Trial Slots Available" hint={`Current: ${USERS.length} active`}>
                <div className="flex items-center gap-2">
                  <Input value={trialSlots} onChange={setTrialSlots} />
                  <span className="text-sm flex-shrink-0" style={{ color: '#94A3B8' }}>/ {trialSlots}</span>
                </div>
              </FieldRow>
              <FieldRow label="Trial Capacity">
                <div className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{USERS.length} active</span>
                    <span style={{ color: '#64748B' }}>1%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${(USERS.length / parseInt(trialSlots)) * 100}%`, background: '#3B82F6' }} />
                  </div>
                </div>
              </FieldRow>
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Pricing Configuration</SectionTitle>
              <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>Stripe Test</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Monthly Price"><Input value={monthlyPrice} onChange={setMonthlyPrice} prefix="$" placeholder="4.99" /></FieldRow>
              <FieldRow label="Yearly Price"><Input value={yearlyPrice} onChange={setYearlyPrice} prefix="$" placeholder="49.99" /></FieldRow>
            </div>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <SectionTitle>Conversion Funnel</SectionTitle>
            <div className="space-y-3">
              {[
                { label: 'Trial', count: 6, total: 6, color: '#F59E0B' },
                { label: 'Active', count: 0, total: 6, color: '#10B981' },
                { label: 'Premium', count: 0, total: 6, color: '#6366F1' },
                { label: 'Founding', count: 0, total: 6, color: '#D97706' },
              ].map(f => (
                <div key={f.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{f.label}</span>
                    <span style={{ color: f.color, fontWeight: 700 }}>{f.count} ({f.total > 0 ? Math.round((f.count / 6) * 100) : 0}%)</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${f.total > 0 ? (f.count / 6) * 100 : 0}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* MRR Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'MRR', value: '$0.00', icon: CreditCard, color: '#10B981' },
              { label: 'ARR', value: '$0.00', icon: Activity, color: '#3B82F6' },
              { label: 'Churn Rate', value: '2.3%', icon: AlertCircle, color: '#EF4444' },
              { label: 'LTV', value: '$0.00', icon: Zap, color: '#8B5CF6' },
            ].map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* User Distribution */}
          <Card>
            <SectionTitle>User Distribution by Plan</SectionTitle>
            <div className="space-y-3">
              {[
                { label: 'Free Trial', count: 6, pct: 100, color: '#F59E0B' },
                { label: 'Premium', count: 0, pct: 0, color: '#6366F1' },
                { label: 'Founding Member', count: 0, pct: 0, color: '#D97706' },
              ].map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.label}</span>
                    <span style={{ color: d.color, fontWeight: 700 }}>{d.count} users ({d.pct}%)</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {billingSubTab === 'invoices' && (
        <Card>
          <SectionTitle>Invoices & Billing History</SectionTitle>
          <div className="text-center py-12" style={{ color: '#CBD5E1' }}>
            <CreditCard className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No invoices generated yet. Invoices will appear when users upgrade to paid plans.</p>
          </div>
        </Card>
      )}
    </div>
  );

  // ── MODULES TAB ─────────────────────────────────────────────────────────
  const ModulesTab = () => (
    <div>
      <SubTabBar options={[{ key: 'smart', label: 'Smart Modules' }, { key: 'tasks', label: 'Task Lists' }]} active={modulesSubTab} onSelect={k => setModulesSubTab(k as ModulesSubTab)} />

      {modulesSubTab === 'smart' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Smart Stack */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#6366F1' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Smart Stack</span>
                </div>
                <Toggle on={smartModules.smartStackEnabled} onToggle={() => setMod('smartStackEnabled', !smartModules.smartStackEnabled)} />
              </div>
              <div className="space-y-3">
                <FieldRow label="Default Bills/Rent %"><Input value={smartModules.billsRentPct} onChange={v => setMod('billsRentPct', v)} /></FieldRow>
                <FieldRow label="Default Savings %"><Input value={smartModules.savingsPct} onChange={v => setMod('savingsPct', v)} /></FieldRow>
                <FieldRow label="Default Spending %"><Input value={smartModules.spendingPct} onChange={v => setMod('spendingPct', v)} /></FieldRow>
                <ToggleRow label="Auto-Lock Budget" on={smartModules.autoLock} onToggle={() => setMod('autoLock', !smartModules.autoLock)} />
              </div>
            </Card>

            {/* Bill Boss */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Bill Boss</span>
                </div>
                <Toggle on={smartModules.billBossEnabled} onToggle={() => setMod('billBossEnabled', !smartModules.billBossEnabled)} />
              </div>
              <div className="space-y-3">
                <FieldRow label="Reminder Days Before Due"><Input value={smartModules.reminderDays} onChange={v => setMod('reminderDays', v)} /></FieldRow>
                <ToggleRow label="Late Fee Alert" on={smartModules.lateFeeAlert} onToggle={() => setMod('lateFeeAlert', !smartModules.lateFeeAlert)} />
                <ToggleRow label="Receipt Upload" on={smartModules.receiptUpload} onToggle={() => setMod('receiptUpload', !smartModules.receiptUpload)} />
                <ToggleRow label="Rent Tracker" on={smartModules.rentTracker} onToggle={() => setMod('rentTracker', !smartModules.rentTracker)} />
              </div>
            </Card>

            {/* Stack Circle */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Stack Circle</span>
                </div>
                <Toggle on={smartModules.stackCircleEnabled} onToggle={() => setMod('stackCircleEnabled', !smartModules.stackCircleEnabled)} />
              </div>
              <div className="space-y-3">
                <FieldRow label="Max Groups Size"><Input value={smartModules.maxGroupSize} onChange={v => setMod('maxGroupSize', v)} /></FieldRow>
                <FieldRow label="Max Groups Per User"><Input value={smartModules.maxGroupsPerUser} onChange={v => setMod('maxGroupsPerUser', v)} /></FieldRow>
                <ToggleRow label="Content Moderation" on={smartModules.contentModeration} onToggle={() => setMod('contentModeration', !smartModules.contentModeration)} />
                <ToggleRow label="Invite Only" on={smartModules.inviteOnly} onToggle={() => setMod('inviteOnly', !smartModules.inviteOnly)} />
              </div>
            </Card>

            {/* Task Lists */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Task Lists</span>
                </div>
                <Toggle on={smartModules.taskListsEnabled} onToggle={() => setMod('taskListsEnabled', !smartModules.taskListsEnabled)} />
              </div>
              <div className="space-y-3">
                <FieldRow label="Max To-Do Items"><Input value={smartModules.maxToDo} onChange={v => setMod('maxToDo', v)} /></FieldRow>
                <FieldRow label="Max Grocery Lists"><Input value={smartModules.maxGrocery} onChange={v => setMod('maxGrocery', v)} /></FieldRow>
                <ToggleRow label="Meeting Reminders" on={smartModules.meetingReminders} onToggle={() => setMod('meetingReminders', !smartModules.meetingReminders)} />
                <ToggleRow label="Quick Notes" on={smartModules.quickNotes} onToggle={() => setMod('quickNotes', !smartModules.quickNotes)} />
                <ToggleRow label="Task Sharing" on={smartModules.taskSharing} onToggle={() => setMod('taskSharing', !smartModules.taskSharing)} />
              </div>
            </Card>

            {/* Savings Accounts */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" style={{ color: '#D97706' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Savings Accounts</span>
                </div>
                <Toggle on={smartModules.savingsEnabled} onToggle={() => setMod('savingsEnabled', !smartModules.savingsEnabled)} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Goal-based savings tracking and milestone rewards.</p>
            </Card>

            {/* Incoming Payments */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Incoming Payments</span>
                </div>
                <Toggle on={smartModules.paymentsEnabled} onToggle={() => setMod('paymentsEnabled', !smartModules.paymentsEnabled)} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Track and forecast incoming income streams and paycheck timing.</p>
            </Card>
          </div>

          {/* Stack Circle Groups */}
          <Card>
            <SectionTitle>Stack Circle Groups</SectionTitle>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #DBEAFE' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>Vacation</div>
                  <div className="text-xs" style={{ color: '#94A3B8' }}>1 member</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 700 }}>Active</span>
                  <button className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: '#94A3B8' }}>
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {modulesSubTab === 'tasks' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Users',    value: '6',  icon: Users,       color: '#6366F1' },
              { label: 'Total Tasks',     value: '0',  icon: CheckSquare, color: '#10B981' },
              { label: 'Active Modules',  value: '6',  icon: Layers,      color: '#3B82F6' },
              { label: 'Feature Flags',   value: '22', icon: Zap,         color: '#F59E0B' },
            ].map(s => <StatCard key={s.label} {...s} />)}
          </div>

          <Card>
            <SectionTitle sub="Manage the task list feature settings and view usage analytics">Task List &amp; Reminders</SectionTitle>
            <div className="space-y-1">
              {Object.entries(taskFlags).map(([label, on]) => (
                <ToggleRow key={label} label={label}
                  sub={label === 'To-Do Lists' ? 'Allow users to create and manage to-do items with priorities' :
                    label === 'Grocery Lists' ? 'Enable grocery list tracking with categories' :
                    label === 'Meeting Reminders' ? 'Meeting scheduling with date/time and reminders' :
                    label === 'Quick Notes' ? 'Color-coded sticky notes for quick thoughts' :
                    label === 'Task Sharing' ? 'Allow users to share task lists with Stack Circle members' :
                    'Sync tasks and meetings with dashboard calendar'}
                  on={on} onToggle={() => toggleTask(label)} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Recent Task Activity</SectionTitle>
            <div className="text-center py-8" style={{ color: '#CBD5E1' }}>
              <p className="text-sm">Activity will appear here as users interact with the platform</p>
            </div>
          </Card>

          <Card>
            <SectionTitle>Category Limits</SectionTitle>
            <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>Set maximum items per category for each plan</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #EFF6FF' }}>
                    {['Category', 'Trial', 'Premium', 'Founding'].map(h => (
                      <th key={h} className="py-2 text-sm text-left" style={{ color: '#64748B', fontWeight: 700, paddingRight: 16 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cat: 'To-Do Items', trial: 25, premium: 100 },
                    { cat: 'Grocery Lists', trial: 5, premium: 20 },
                    { cat: 'Meetings', trial: 10, premium: 50 },
                    { cat: 'Notes', trial: 10, premium: 50 },
                  ].map((r, i) => (
                    <tr key={r.cat} style={{ borderBottom: i < 3 ? '1px solid #F8FAFC' : 'none' }}>
                      <td className="py-3 text-sm" style={{ fontWeight: 600, color: '#0F172A', paddingRight: 16 }}>{r.cat}</td>
                      <td className="py-3 text-sm" style={{ color: '#64748B', paddingRight: 16 }}>{r.trial}</td>
                      <td className="py-3 text-sm" style={{ color: '#64748B', paddingRight: 16 }}>{r.premium}</td>
                      <td className="py-3 text-sm" style={{ color: '#6366F1', fontWeight: 700 }}>Unlimited</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  // ── CUSTOMIZE TAB ────────────────────────────────────────────────────────
  const CustomizeTab = () => (
    <div>
      <SubTabBar
        options={[
          { key: 'app-settings', label: 'App Settings' },
          { key: 'theme', label: 'Theme & Branding' },
          { key: 'navigation', label: 'Navigation' },
        ]}
        active={customizeSubTab}
        onSelect={k => setCustomizeSubTab(k as CustomizeSubTab)}
      />

      {customizeSubTab === 'app-settings' && (
        <div className="space-y-5">
          {/* General */}
          <Card>
            <SectionTitle>General</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldRow label="App Name"><Input value={appName} onChange={setAppName} /></FieldRow>
              <FieldRow label="Tagline"><Input value={tagline} onChange={setTagline} /></FieldRow>
              <FieldRow label="Max Users"><Input value={maxUsers} onChange={setMaxUsers} /></FieldRow>
              <div className="space-y-2">
                <ToggleRow label="Maintenance Mode" on={maintenanceMode} onToggle={() => setMaintenanceMode(!maintenanceMode)} />
                <ToggleRow label="New Signups" on={newSignups} onToggle={() => setNewSignups(!newSignups)} badge={newSignups ? 'Enabled' : 'Disabled'} />
              </div>
            </div>
          </Card>

          {/* Income & Payments */}
          <Card>
            <SectionTitle sub="Income settings and defaults for the platform">Income &amp; Payments</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Default Safe to Spend Buffer (%)" hint="Safety cushion subtracted from Safe to Spend calculation">
                <Input value={spendBuffer} onChange={setSpendBuffer} />
              </FieldRow>
              <FieldRow label="Primary Income Source">
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#2563EB', fontWeight: 600 }}>
                  All income is managed through Incoming Payments in Smart Stack. Income Planner is available as a standalone calculator.
                </div>
              </FieldRow>
            </div>
          </Card>

          {/* Onboarding Message */}
          <Card>
            <SectionTitle>Onboarding Message</SectionTitle>
            <textarea
              value={onboardMsg}
              onChange={e => setOnboardMsg(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-1"
              style={{ background: '#F8FAFC', border: '1px solid #DBEAFE', color: '#0F172A' }}
            />
            <p className="text-xs" style={{ color: '#94A3B8' }}>Shown to new users after signup</p>
          </Card>

          {/* Budget Categories */}
          <Card>
            <SectionTitle>Budget Categories</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map(cat => (
                <span key={cat} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>
                  {cat}
                  <button onClick={() => setCategories(c => c.filter(x => x !== cat))} style={{ color: '#93C5FD' }}>
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCategory} onChange={setNewCategory} placeholder="Add category..." />
              <button
                onClick={() => { if (newCategory.trim()) { setCategories(c => [...c, newCategory.trim()]); setNewCategory(''); } }}
                className="px-4 py-2 rounded-xl text-sm flex-shrink-0"
                style={{ background: '#2563EB', color: '#fff', fontWeight: 700 }}
              >Add</button>
            </div>
          </Card>

          {/* Alert Thresholds */}
          <Card>
            <SectionTitle>Alert Thresholds</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Budget Warning (%)" hint="Alert fires when user hits X% of their budget">
                <Input value={budgetWarning} onChange={setBudgetWarning} />
              </FieldRow>
              <FieldRow label="Churn Risk (%)" hint="Flag users inactive for this many days">
                <Input value={churnRisk} onChange={setChurnRisk} />
              </FieldRow>
            </div>
          </Card>

          {/* Feature Flags */}
          <Card>
            <SectionTitle>Feature Flags</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
              {Object.entries(flags).map(([key, on]) => (
                <div key={key} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <span className="text-sm" style={{ color: '#0F172A', fontWeight: 500 }}>{key}</span>
                  <Toggle on={on} onToggle={() => toggleFlag(key)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Layout Style */}
          <Card>
            <SectionTitle sub="Choose the primary navigation layout for the app">Layout Style</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'sidebar', label: 'Sidebar', sub: 'Classic left sidebar navigation' },
                { key: 'top', label: 'Top Navigation', sub: 'Horizontal top bar navigation' },
                { key: 'hybrid', label: 'Hybrid', sub: 'Top bar + collapsible sidebar' },
              ] as const).map(l => (
                <button
                  key={l.key}
                  onClick={() => setLayoutStyle(l.key)}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: layoutStyle === l.key ? '#EFF6FF' : '#F8FAFC',
                    border: `2px solid ${layoutStyle === l.key ? '#2563EB' : '#E2E8F0'}`,
                  }}
                >
                  <div className="text-sm mb-1" style={{ fontWeight: 700, color: layoutStyle === l.key ? '#1D4ED8' : '#374151' }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{l.sub}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Button Placement */}
          <Card>
            <SectionTitle sub="Control where key UI buttons appear in the app">Button Placement</SectionTitle>
            <div className="space-y-3">
              {[
                { label: 'Settings Button', sub: 'Current: sidebar bottom', value: 'Sidebar Bottom' },
                { label: 'Theme Toggle', sub: 'Current: settings page', value: 'Settings Page' },
                { label: 'Home Button', sub: 'Current: sidebar top', value: 'Sidebar Top' },
              ].map(b => (
                <div key={b.label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>{b.label}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{b.sub}</div>
                  </div>
                  <select className="px-3 py-1.5 rounded-lg text-sm outline-none" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE', color: '#374151' }}>
                    <option>{b.value}</option>
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm" style={{ background: '#2563EB', color: '#fff', fontWeight: 700 }}>
            <CheckCircle className="w-4 h-4" />
            Save All Settings
          </button>
        </div>
      )}

      {customizeSubTab === 'theme' && (
        <div className="space-y-5">
          {/* Admin Panel Theme */}
          <Card>
            <SectionTitle sub="Customize the appearance of the admin panel only (this doesn't affect the user-facing app theme)">Admin Panel Theme</SectionTitle>
            <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Current theme: <strong style={{ color: '#2563EB' }}>{THEMES.find(t => t.key === adminTheme)?.label}</strong></p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.key}
                  onClick={() => setAdminTheme(theme.key)}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{ border: `2px solid ${adminTheme === theme.key ? theme.accent : '#E2E8F0'}` }}
                >
                  <div className="h-12 relative" style={{ background: theme.bg }}>
                    <div className="absolute left-2 top-2 right-2 h-2 rounded-full" style={{ background: theme.accent }} />
                    <div className="absolute left-2 top-6 right-6 h-1.5 rounded-full opacity-50" style={{ background: theme.accent }} />
                    <div className="absolute left-2 top-9 right-10 h-1.5 rounded-full opacity-30" style={{ background: theme.accent }} />
                    {adminTheme === theme.key && (
                      <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: theme.accent }}>
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="py-1.5 px-2 text-xs text-center" style={{ fontWeight: 600, color: '#374151', background: '#FFFFFF' }}>{theme.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Logo Management */}
          <Card>
            <SectionTitle sub="Upload a new logo to update it across the entire app — login page, sidebar, and admin header">Logo Management</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
              <div>
                <div className="text-xs mb-2" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Logo</div>
                <div className="rounded-xl p-4 flex flex-col items-center gap-3" style={{ background: '#0F172A', border: '1px solid #DBEAFE' }}>
                  <img src={orcaLogo} alt="ORCA" className="w-16 h-16 rounded-2xl object-cover" style={{ boxShadow: '0 0 20px rgba(245,158,11,0.3)' }} />
                  <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: 14, letterSpacing: '0.06em' }}>ORCA</span>
                </div>
                <button className="w-full mt-2 py-1.5 rounded-lg text-xs" style={{ background: '#FEF2F2', color: '#EF4444', fontWeight: 700, border: '1px solid #FECACA' }}>
                  Reset to Default
                </button>
              </div>
              <div>
                <div className="text-xs mb-2" style={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Upload New Logo</div>
                <div className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-all" style={{ background: '#F8FAFC', border: '2px dashed #BFDBFE', minHeight: 110 }}>
                  <Upload className="w-6 h-6" style={{ color: '#93C5FD' }} />
                  <span className="text-sm" style={{ color: '#2563EB', fontWeight: 600 }}>Click to upload</span>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>SVG, PNG, or JPG (recommended 100×100px)</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs mb-3" style={{ color: '#64748B', fontWeight: 700 }}>UPDATES APPLIED TO</div>
              {[
                { place: 'Login Page', desc: 'Main logo above sign-in form' },
                { place: 'Signup Page', desc: 'Logo on registration screen' },
                { place: 'Sidebar', desc: 'Navigation sidebar header logo' },
                { place: 'Admin Header', desc: 'Admin console shared view' },
                { place: 'Favicon', desc: 'Browser tab icon' },
              ].map(p => (
                <div key={p.place} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <div>
                    <div className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>{p.place}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.desc}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 700 }}>Active</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Default User Theme */}
          <Card>
            <SectionTitle sub="Set the default theme for new users and the live site. Users can still change their own theme.">Default User Theme</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEMES.map(theme => (
                <button
                  key={theme.key}
                  onClick={() => setDefaultUserTheme(theme.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                  style={{ background: defaultUserTheme === theme.key ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${defaultUserTheme === theme.key ? '#2563EB' : '#E2E8F0'}` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: theme.accent }} />
                  <span className="text-sm" style={{ fontWeight: defaultUserTheme === theme.key ? 700 : 500, color: '#374151' }}>{theme.label}</span>
                  {defaultUserTheme === theme.key && <CheckCircle className="w-3.5 h-3.5 ml-auto" style={{ color: '#2563EB' }} />}
                </button>
              ))}
            </div>
          </Card>

          {/* Brand Colors */}
          <Card>
            <SectionTitle>Brand Colors</SectionTitle>
            <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>Current theme palette colors</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Accent', color: '#2563EB', hex: '#2563EB' },
                { label: 'Background', color: '#EBF5FF', hex: '#EBF5FF' },
                { label: 'Card', color: '#FFFFFF', hex: '#FFFFFF' },
                { label: 'Border', color: '#BFDBFE', hex: '#BFDBFE' },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: c.color, border: c.color === '#FFFFFF' ? '1px solid #E2E8F0' : 'none' }} />
                  <div>
                    <div className="text-xs" style={{ fontWeight: 700, color: '#374151' }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>{c.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {customizeSubTab === 'navigation' && (
        <div className="space-y-5">
          <Card>
            <SectionTitle sub="Reorder, rename, or hide navigation tabs">Tab Order &amp; Visibility</SectionTitle>
            <div className="space-y-2.5">
              {navItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
                  <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#CBD5E1', cursor: 'grab' }} />
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>{idx + 1}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 14, flex: 1 }}>{item.label}</span>
                  <code className="px-2 py-0.5 rounded-md text-xs hidden sm:block" style={{ background: '#F1F5F9', color: '#64748B', fontFamily: 'monospace' }}>{item.path}</code>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 transition-all" style={{ color: '#94A3B8' }}><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 transition-all" style={{ color: '#94A3B8' }}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 transition-all" style={{ color: '#94A3B8' }}><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => toggleNavVisible(item.id)}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{ background: item.visible ? '#DCFCE7' : '#F1F5F9', color: item.visible ? '#16A34A' : '#94A3B8', fontWeight: 700 }}
                    >
                      {item.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>Navigation Preview</SectionTitle>
            <div className="flex gap-2 flex-wrap p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
              {navItems.filter(n => n.visible).map(item => (
                <div key={item.id} className="px-4 py-2 rounded-xl text-sm" style={{ background: '#FFFFFF', border: '2px solid #DBEAFE', color: '#374151', fontWeight: 600 }}>{item.label}</div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  // ── SECURITY TAB ─────────────────────────────────────────────────────────
  const SecurityTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="2FA Adoption" value="0%" icon={Shield} color="#6366F1" />
        <StatCard label="Active Sessions" value="6" icon={Activity} color="#10B981" />
        <StatCard label="Suspended" value="0" icon={AlertCircle} color="#EF4444" />
        <StatCard label="Admin Roles" value="2" icon={Star} color="#F59E0B" />
      </div>

      <Card>
        <SectionTitle>Security Settings</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
            <div>
              <div className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>Require 2FA for All Users</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Force two-factor authentication</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>Optional</span>
              <Toggle on={require2FA} onToggle={() => setRequire2FA(!require2FA)} />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
            <div>
              <div className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>Fraud Monitoring</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Auto-detect suspicious activity</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 700 }}>Active</span>
              <Toggle on={fraudMonitoring} onToggle={() => setFraudMonitoring(!fraudMonitoring)} />
            </div>
          </div>
          <FieldRow label="Session Timeout (min)"><Input value={sessionTimeout} onChange={setSessionTimeout} /></FieldRow>
          <FieldRow label="IP Whitelist (comma-separated)">
            <Input value={ipWhitelist} onChange={setIpWhitelist} placeholder="e.g. 192.168.1.1, 10.0.0.1" />
          </FieldRow>
        </div>
      </Card>

      <Card>
        <SectionTitle>Admin Roles</SectionTitle>
        <div className="space-y-2.5 mb-4">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
              <div>
                <div className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>{role.name}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {role.perms.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded text-xs" style={{ background: '#EFF6FF', color: '#2563EB', fontFamily: 'monospace', fontSize: 10 }}>{p}</span>
                  ))}
                </div>
              </div>
              {role.deletable && (
                <button onClick={() => setRoles(r => r.filter(x => x.id !== role.id))} className="p-2 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newRole} onChange={setNewRole} placeholder="New role name..." />
          <button
            onClick={() => { if (newRole.trim()) { setRoles(r => [...r, { id: Date.now(), name: newRole.trim(), perms: [], deletable: true }]); setNewRole(''); } }}
            className="px-4 py-2 rounded-xl text-sm flex-shrink-0"
            style={{ background: '#2563EB', color: '#fff', fontWeight: 700 }}
          >Add Role</button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Audit Log</SectionTitle>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Admin', 'Action', 'Target', 'Timestamp', 'Details'].map(h => (
                <th key={h} className="py-2 text-left text-xs" style={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', paddingRight: 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={5} className="text-center py-10 text-sm" style={{ color: '#CBD5E1' }}>No audit entries yet</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );

  // ── ANALYTICS TAB ────────────────────────────────────────────────────────
  const AnalyticsTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="MRR Growth" value="+0%" icon={Activity} color="#10B981" />
        <StatCard label="ARR Growth" value="+0%" icon={CreditCard} color="#3B82F6" />
        <StatCard label="Churn Rate" value="0%" icon={AlertCircle} color="#EF4444" />
        <StatCard label="Avg LTV" value="$0" icon={Zap} color="#8B5CF6" />
      </div>
      {[
        { title: 'User Growth (Last 6 Months)', sub: 'Historical chart data coming soon' },
        { title: 'Feature Usage', sub: 'User engagement metrics coming soon' },
        { title: 'Conversion Rates & Platform Stats', sub: 'Detailed analytics coming soon' },
      ].map(s => (
        <Card key={s.title}>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>{s.title}</h3>
              <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{s.sub}</p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs" style={{ background: '#F1F5F9', color: '#94A3B8', fontWeight: 700 }}>Coming Soon</span>
          </div>
          <div className="mt-4 h-24 rounded-xl flex items-center justify-center" style={{ background: '#F8FAFC', border: '1px dashed #DBEAFE' }}>
            <BarChart2 className="w-6 h-6" style={{ color: '#BFDBFE' }} />
          </div>
        </Card>
      ))}
    </div>
  );

  // ── NOTIFICATIONS TAB ────────────────────────────────────────────────────
  const NotificationsTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Templates" value="6" icon={Bell} color="#6366F1" />
        <StatCard label="Sent Today" value="0" icon={Send} color="#10B981" />
        <StatCard label="Failed" value="0" icon={AlertCircle} color="#EF4444" />
      </div>

      <Card>
        <SectionTitle>Notification Templates</SectionTitle>
        <div className="space-y-2.5">
          {notifTemplates.map((t, i) => (
            <div key={t.name} className="flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>{t.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: t.type === 'Email' ? '#EFF6FF' : '#FFF7ED', color: t.type === 'Email' ? '#2563EB' : '#EA580C', fontWeight: 700 }}>
                    {t.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Toggle
                  on={t.active}
                  onToggle={() => setNotifTemplates(prev => prev.map((x, j) => j === i ? { ...x, active: !x.active } : x))}
                />
                <button className="p-1.5 rounded-lg hover:bg-slate-200 transition-all" style={{ color: '#64748B' }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Sent History</SectionTitle>
        <div className="text-center py-10 text-sm" style={{ color: '#CBD5E1' }}>No notifications sent yet</div>
      </Card>
    </div>
  );

  // ── SUPPORT TAB ──────────────────────────────────────────────────────────
  const SupportTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Open Tickets" value="0" icon={HelpCircle} color="#6366F1" />
        <StatCard label="Avg Response" value="—" icon={Activity} color="#10B981" />
        <StatCard label="Resolved" value="0" icon={CheckCircle} color="#3B82F6" />
      </div>

      <Card>
        <SectionTitle sub="View and respond to user support requests">Support Tickets</SectionTitle>
        <div className="text-center py-10 text-sm" style={{ color: '#CBD5E1' }}>
          <HelpCircle className="w-10 h-10 mx-auto mb-3" />
          No support tickets yet. Tickets will appear here when users submit help requests.
        </div>
      </Card>

      <Card>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Send Announcement', sub: 'Broadcast a message to all users', icon: Send, color: '#6366F1' },
            { label: 'Export User Data', sub: 'Download CSV of all user records', icon: Upload, color: '#10B981' },
            { label: 'Clear Cache', sub: 'Reset server-side cache layers', icon: RefreshCw, color: '#F59E0B' },
            { label: 'System Health', sub: 'View server status and uptime', icon: Activity, color: '#3B82F6' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} className="flex items-center gap-3 p-4 rounded-xl text-left hover:opacity-90 transition-all" style={{ background: '#F8FAFC', border: '1px solid #DBEAFE' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}15` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: a.color }} />
                </div>
                <div>
                  <div className="text-sm" style={{ fontWeight: 700, color: '#0F172A' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{a.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );

  // ── Admin tab definitions ───────────────────────────────────────────────
  const ADMIN_TABS: { key: AdminTab; label: string; icon: React.ComponentType<{className?: string; style?: React.CSSProperties}> }[] = [
    { key: 'users',         label: 'Users',     icon: Users },
    { key: 'billing',       label: 'Billing',   icon: CreditCard },
    { key: 'modules',       label: 'Modules',   icon: Layers },
    { key: 'customize',     label: 'Customize', icon: Sliders },
    { key: 'security',      label: 'Security',  icon: Shield },
    { key: 'analytics',     label: 'Analytics', icon: BarChart2 },
    { key: 'notifications', label: 'Alerts',    icon: Bell },
    { key: 'support',       label: 'Support',   icon: HelpCircle },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-full" style={{ background: '#EBF8FF' }}>
    <div style={{ background: '#EBF8FF', minHeight: '100%' }}>
      {/* Top status bar */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-1.5 text-xs flex-wrap" style={{ background: '#DCFCE7', borderBottom: '1px solid #BBF7D0' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }} />
          <span style={{ color: '#15803D', fontWeight: 700 }}>Live</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: '#166534' }}>
          <CheckCircle className="w-3 h-3" style={{ color: '#16A34A' }} />Connected
        </div>
        <div className="flex items-center gap-1.5" style={{ color: '#166534' }}>
          <Users className="w-3 h-3" />6 users
        </div>
        <div className="flex items-center gap-1.5" style={{ color: '#166534' }}>
          <RefreshCw className="w-3 h-3" />Last sync: 12:57:42 PM
        </div>
      </div>

      {/* Admin header */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 flex-wrap gap-y-3" style={{ background: '#FFFFFF', borderBottom: '1px solid #DBEAFE' }}>
        <div className="flex items-center gap-3">
          <img src={orcaLogo} alt="ORCA" className="w-8 h-8 rounded-xl object-cover" style={{ boxShadow: '0 0 10px rgba(245,158,11,0.2)' }} />
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: '#2563EB' }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: '#1E40AF' }}>Admin Console</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Live Database · Last sync: {new Date().toLocaleTimeString()} · <span style={{ color: '#10B981', fontWeight: 600 }}>Connected</span>
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-slate-50" style={{ color: '#64748B', fontWeight: 600, border: '1px solid #E2E8F0' }}>
            <ArrowLeft className="w-4 h-4" />Back to App
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-90" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 700, border: '1px solid #BFDBFE' }}>
            <RefreshCw className="w-4 h-4" />Sync All
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-90" style={{ background: '#FEF2F2', color: '#EF4444', fontWeight: 700, border: '1px solid #FECACA' }}>
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </div>

      {/* Tab grid — 4×2, no scrollbar */}
      <div className="px-4 sm:px-6 py-3" style={{ background: '#FFFFFF', borderBottom: '1px solid #DBEAFE' }}>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ADMIN_TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all"
                style={{
                  background: active ? '#EFF6FF' : '#F8FAFC',
                  border: `2px solid ${active ? '#2563EB' : '#E2E8F0'}`,
                }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: active ? '#2563EB' : '#94A3B8' }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#1D4ED8' : '#64748B', textAlign: 'center', lineHeight: 1.2 }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {activeTab === 'users'         && <UsersTab />}
        {activeTab === 'billing'       && <BillingTab />}
        {activeTab === 'modules'       && <ModulesTab />}
        {activeTab === 'customize'     && <CustomizeTab />}
        {activeTab === 'security'      && <SecurityTab />}
        {activeTab === 'analytics'     && <AnalyticsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'support'       && <SupportTab />}
      </div>
    </div>
    </div>
  );
}
