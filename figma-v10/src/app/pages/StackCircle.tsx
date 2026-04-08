import { useState } from 'react';
import { Users, Plus, Copy, Share2, ChevronDown, Edit2, Activity, UserPlus, Trash2, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const groups = [
  { id: 1, name: 'Vacation', saved: 0, target: 6000, tripDate: 'Mon, March 30, 2026', daysAway: 2, inviteCode: 'J32JIA' },
];

const members = [
  { name: 'You', role: 'Coordinator', contributed: 0 },
];

const activityFeed = [
  { icon: '⚡', text: 'Created group "Vacation"', date: '3/28/2026' },
];

interface Utility { id: number; name: string; amount: string; paid: boolean; }
interface Roommate { id: number; name: string; rent: string; paid: boolean; }

export function StackCircle() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'group' | 'roommates'>('group');
  const [addAmount, setAddAmount] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('7 days');
  const [copied, setCopied] = useState(false);

  // Roommates state
  const [rent, setRent] = useState('0.00');
  const [editingRent, setEditingRent] = useState(false);
  const [tempRent, setTempRent] = useState('');
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [newUtilityName, setNewUtilityName] = useState('');
  const [newUtilityAmt, setNewUtilityAmt] = useState('');
  const [showUtilityForm, setShowUtilityForm] = useState(false);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [newRoommateName, setNewRoommateName] = useState('');
  const [showRoommateForm, setShowRoommateForm] = useState(false);
  const [allPaidThisMonth, setAllPaidThisMonth] = useState(false);

  const group = groups[0];
  const pct = Math.round((group.saved / group.target) * 100);

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const totalUtilities = utilities.reduce((s, u) => s + (parseFloat(u.amount) || 0), 0);
  const totalRent = parseFloat(rent) || 0;
  const totalHousing = totalRent + totalUtilities;

  const addUtility = () => {
    if (!newUtilityName.trim()) return;
    setUtilities(u => [...u, { id: Date.now(), name: newUtilityName.trim(), amount: newUtilityAmt || '0', paid: false }]);
    setNewUtilityName(''); setNewUtilityAmt(''); setShowUtilityForm(false);
  };
  const addRoommate = () => {
    if (!newRoommateName.trim()) return;
    setRoommates(r => [...r, { id: Date.now(), name: newRoommateName.trim(), rent: '0.00', paid: false }]);
    setNewRoommateName(''); setShowRoommateForm(false);
  };
  const toggleUtilityPaid = (id: number) => setUtilities(u => u.map(x => x.id === id ? { ...x, paid: !x.paid } : x));
  const toggleRoommatePaid = (id: number) => setRoommates(r => r.map(x => x.id === id ? { ...x, paid: !x.paid } : x));

  const handleSaveRent = () => { setRent(parseFloat(tempRent || '0').toFixed(2)); setEditingRent(false); };

  // Theme
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const subtle = isDark ? '#0F172A' : '#F8FAFC';
  const subtleBorder = isDark ? '1px solid #334155' : '1px solid #E2E8F0';
  const inputStyle = { background: isDark ? '#0F172A' : '#FFFFFF', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, color: txt } as React.CSSProperties;

  // Teal palette matching the app screenshots
  const teal = '#0891B2';
  const tealLight = isDark ? '#164E63' : '#E0F9FC';
  const tealBorder = isDark ? '#0E7490' : '#A5F3FC';

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: tealLight }}>
            <Users className="w-6 h-6" style={{ color: teal }} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: txt }}>Stack Circle</h1>
            <p className="text-sm" style={{ color: muted }}>Save together, achieve more</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
          {(['group', 'roommates'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-sm transition-all"
              style={{
                borderBottom: activeTab === tab ? `2px solid ${teal}` : '2px solid transparent',
                color: activeTab === tab ? teal : muted,
                fontWeight: activeTab === tab ? 700 : 400,
                marginBottom: -1,
              }}
            >
              {tab === 'group' ? 'Group Savings' : 'Roommates'}
            </button>
          ))}
        </div>

        {/* ── GROUP SAVINGS ─────────────────────────────────────────────────── */}
        {activeTab === 'group' && (
          <div className="space-y-5">
            {/* Group selector */}
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:opacity-90" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" style={{ color: teal }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: muted, fontWeight: 600 }}>Active Group</div>
                  <div style={{ fontWeight: 700, color: txt, fontSize: 15 }}>Vacation</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: muted }} />
            </button>

            {/* Group hero */}
            <div className="rounded-2xl p-6 text-center" style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#4F46E5' }}>{group.name}</h2>
                <button className="p-1 rounded-lg hover:bg-indigo-100 transition-all">
                  <Edit2 className="w-4 h-4" style={{ color: '#6366F1' }} />
                </button>
              </div>

              <div className="flex items-center justify-center mb-4">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="60" fill="none" stroke="#C7D2FE" strokeWidth="10" />
                    <circle cx="70" cy="70" r="60" fill="none" stroke="#6366F1" strokeWidth="10"
                      strokeDasharray={`${pct === 0 ? 0 : (pct / 100) * 377} 377`} strokeLinecap="round" transform="rotate(-90 70 70)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#4F46E5', lineHeight: 1 }}>${group.saved.toFixed(2)}</div>
                    <div className="text-xs mt-1" style={{ color: '#6366F1' }}>saved</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-sm" style={{ color: muted }}>Target:</span>
                <span style={{ fontWeight: 700, color: '#4F46E5', fontSize: 15 }}>${group.target.toLocaleString()}.00</span>
                <span className="text-sm" style={{ color: muted }}>· {pct}%</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
                📅 Trip Date: {group.tripDate}
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}>{group.daysAway} days away</span>
              </div>

              <div className="mt-4 rounded-full overflow-hidden" style={{ height: 6, background: '#C7D2FE' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#6366F1' }} />
              </div>

              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <span className="text-xs" style={{ color: muted }}>Invite Code:</span>
                <span style={{ fontWeight: 800, color: '#4F46E5', letterSpacing: '0.1em' }}>{group.inviteCode}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Add Money */}
              <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }} className="mb-3">Add Money to Group</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                    <input type="number" placeholder="0.00" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <button className="px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all" style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}>Add</button>
                </div>
                <p className="text-xs mt-2" style={{ color: muted }}>Your contribution will be tracked and visible to group members</p>
              </div>

              {/* Invite */}
              <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Invite Friends</h3>
                  <UserPlus className="w-4 h-4" style={{ color: '#6366F1' }} />
                </div>
                <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1' }}>
                  <strong>New users:</strong> Will see a sign-up flow<br />
                  <strong>Existing users:</strong> Will be prompted to log in and auto-join
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ background: isDark ? '#0F172A' : '#F8FAFC', border: subtleBorder }}>
                  <span className="flex-1 text-xs truncate" style={{ color: muted }}>https://orcafin.app/invite/vacation</span>
                  <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all" style={{ background: '#6366F1', color: '#fff', fontWeight: 600 }}>
                    <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:opacity-80 transition-all" style={{ border: cardBorder, color: muted, fontWeight: 600 }}>
                    <Copy className="w-3 h-3" /> Code: {group.inviteCode}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:opacity-80 transition-all" style={{ border: cardBorder, color: muted, fontWeight: 600 }}>
                    <Share2 className="w-3 h-3" /> Share via...
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs" style={{ color: muted }}>
                  <span>Link expires in</span>
                  <select value={inviteExpiry} onChange={e => setInviteExpiry(e.target.value)} className="outline-none rounded-lg px-2 py-1 text-xs" style={{ background: isDark ? '#334155' : '#F1F5F9', color: txt, border: 'none' }}>
                    <option>7 days</option><option>30 days</option><option>Never</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }} className="mb-4">Members</h3>
              {members.map((member, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: subtle, border: subtleBorder }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm" style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}>{member.name[0]}</div>
                  <div className="flex-1">
                    <div style={{ fontWeight: 700, color: txt, fontSize: 14 }}>{member.name}</div>
                    <div className="text-xs" style={{ color: muted }}>Contributed: ${member.contributed.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontWeight: 800, color: '#6366F1', fontSize: 15 }}>${member.contributed.toFixed(2)}</div>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1', fontWeight: 600 }}>{member.role}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Feed */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" style={{ color: '#6366F1' }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Activity Feed</h3>
              </div>
              {activityFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: subtle }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm" style={{ fontWeight: 600, color: txt }}>{item.text}</div>
                    <div className="text-xs mt-0.5" style={{ color: muted }}>{item.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm hover:opacity-80 transition-all" style={{ background: subtle, border: `1px dashed ${isDark ? '#475569' : '#CBD5E1'}`, color: '#6366F1', fontWeight: 700 }}>
              <Plus className="w-4 h-4" />Create Another Group
            </button>
          </div>
        )}

        {/* ── ROOMMATES ─────────────────────────────────────────────────────── */}
        {activeTab === 'roommates' && (
          <div className="space-y-5">
            {/* Total Housing Hero */}
            <div className="rounded-2xl p-6 text-center" style={{ background: tealLight, border: `1px solid ${tealBorder}` }}>
              <div className="text-sm mb-2" style={{ color: teal, fontWeight: 600 }}>Total Monthly Housing</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: teal }}>${totalHousing.toFixed(2)}</div>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div>
                  <div className="text-xs" style={{ color: muted }}>Rent</div>
                  <div style={{ fontWeight: 700, color: txt }}>${totalRent.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: muted }}>Utilities</div>
                  <div style={{ fontWeight: 700, color: txt }}>${totalUtilities.toFixed(2)}</div>
                </div>
              </div>
              <button
                onClick={() => setAllPaidThisMonth(v => !v)}
                className="mt-4 px-6 py-2.5 rounded-full text-sm transition-all hover:opacity-90"
                style={{ background: allPaidThisMonth ? '#10B981' : teal, color: '#fff', fontWeight: 700 }}
              >
                {allPaidThisMonth ? '✓ All Paid This Month' : 'Mark All Paid This Month'}
              </button>
            </div>

            {/* Rent */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Rent</h3>
                <button onClick={() => { setTempRent(rent); setEditingRent(true); }} className="text-sm hover:opacity-80 transition-all" style={{ color: teal, fontWeight: 600 }}>
                  {editingRent ? '' : 'Edit'}
                </button>
              </div>

              {editingRent ? (
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }}>$</span>
                    <input type="number" value={tempRent} onChange={e => setTempRent(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} autoFocus />
                  </div>
                  <button onClick={handleSaveRent} className="px-4 py-2.5 rounded-xl text-sm flex-shrink-0" style={{ background: teal, color: '#fff', fontWeight: 700 }}>Save</button>
                  <button onClick={() => setEditingRent(false)} className="px-4 py-2.5 rounded-xl text-sm flex-shrink-0" style={{ background: isDark ? '#334155' : '#F1F5F9', color: muted }}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: 26, fontWeight: 900, color: teal }}>${parseFloat(rent).toFixed(2)}</div>
              )}
            </div>

            {/* Shared Utilities */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Shared Utilities</h3>
                <button onClick={() => setShowUtilityForm(v => !v)} className="flex items-center gap-1 text-sm hover:opacity-80 transition-all" style={{ color: teal, fontWeight: 600 }}>
                  <Plus className="w-3.5 h-3.5" />Add
                </button>
              </div>

              {utilities.length === 0 && !showUtilityForm && (
                <p className="text-sm" style={{ color: muted }}>No utilities added yet.</p>
              )}

              {utilities.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: subtleBorder }}>
                  <button onClick={() => toggleUtilityPaid(u.id)} className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: u.paid ? '#10B981' : isDark ? '#475569' : '#CBD5E1', background: u.paid ? '#10B981' : 'transparent' }}>
                    {u.paid && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: u.paid ? muted : txt, fontWeight: 600, textDecoration: u.paid ? 'line-through' : 'none' }}>{u.name}</span>
                  <span style={{ color: teal, fontWeight: 700 }}>${parseFloat(u.amount).toFixed(2)}</span>
                  <button onClick={() => setUtilities(list => list.filter(x => x.id !== u.id))} className="p-1 rounded-lg hover:bg-red-50" style={{ color: '#EF4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {showUtilityForm && (
                <div className="mt-3 space-y-2">
                  <input type="text" placeholder="Utility name (e.g., Electric)" value={newUtilityName} onChange={e => setNewUtilityName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: muted }}>$</span>
                      <input type="number" placeholder="Amount" value={newUtilityAmt} onChange={e => setNewUtilityAmt(e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                    </div>
                    <button onClick={addUtility} className="px-4 py-2.5 rounded-xl text-sm flex-shrink-0" style={{ background: teal, color: '#fff', fontWeight: 700 }}>Add</button>
                  </div>
                </div>
              )}
            </div>

            {/* Roommates */}
            <div className="rounded-2xl p-5" style={{ background: card, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: txt }}>Roommates</h3>
                <button onClick={() => setShowRoommateForm(v => !v)} className="flex items-center gap-1 text-sm hover:opacity-80 transition-all" style={{ color: teal, fontWeight: 600 }}>
                  <Plus className="w-3.5 h-3.5" />Add
                </button>
              </div>

              {roommates.length === 0 && !showRoommateForm && (
                <p className="text-sm" style={{ color: muted }}>No roommates added yet. Add one to track shared housing costs.</p>
              )}

              {roommates.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: subtle, border: subtleBorder }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tealLight, color: teal, fontWeight: 700, fontSize: 14 }}>{r.name[0]}</div>
                  <div className="flex-1">
                    <div style={{ fontWeight: 700, color: txt, fontSize: 14 }}>{r.name}</div>
                    <div className="text-xs" style={{ color: muted }}>Rent share: ${parseFloat(r.rent).toFixed(2)}</div>
                  </div>
                  <button onClick={() => toggleRoommatePaid(r.id)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{ background: r.paid ? '#DCFCE7' : (isDark ? '#334155' : '#F1F5F9'), color: r.paid ? '#16A34A' : muted, fontWeight: 700 }}>
                    {r.paid ? '✓ Paid' : 'Unpaid'}
                  </button>
                  <button onClick={() => setRoommates(list => list.filter(x => x.id !== r.id))} className="p-1.5 rounded-lg hover:bg-red-50 transition-all" style={{ color: '#EF4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {showRoommateForm && (
                <div className="mt-3 flex gap-2">
                  <input type="text" placeholder="Roommate name" value={newRoommateName} onChange={e => setNewRoommateName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  <button onClick={addRoommate} className="px-4 py-2.5 rounded-xl text-sm flex-shrink-0" style={{ background: teal, color: '#fff', fontWeight: 700 }}>Add</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}