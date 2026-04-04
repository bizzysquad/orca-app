'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  MapPin,
  Trash2,
  Copy,
  Check,
  Edit3,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plane,
  Hotel,
  Save,
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, pct, gid } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { setLocalSynced } from '@/lib/syncLocal';
import CalendarPicker from '@/components/CalendarPicker';

interface Utility {
  id: string;
  name: string;
  amount: number;
  split: number;
}

interface RoommateMember {
  id: string;
  name: string;
  share: number;
  paidRent: boolean;
  paidUtilities: boolean;
}

interface RoommateData {
  enabled: boolean;
  totalRent: number;
  utilities: Utility[];
  members: RoommateMember[];
  history: any[];
}

interface GroupMember {
  id: string;
  name: string;
  role: string;
  target: number;
  contrib: number;
  balance: number;
  invitedBy?: string;
  joinedAt?: string;
}

interface GroupActivity {
  id: string;
  user: string;
  msg: string;
  date: string;
}

interface GroupTask {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  createdAt: string;
}

interface TripData {
  location: string;
  startDate: string;
  endDate: string;
  departureDate: string;
  returnDate: string;
  flightInfo: string;
  hotelName: string;
  hotelAddress: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  notes: string;
}

interface Group {
  id: string;
  name: string;
  customName?: string;
  goal: string;
  target: number;
  current: number;
  date: string;
  code: string;
  members: GroupMember[];
  activity: GroupActivity[];
  tasks?: GroupTask[];
  trip?: TripData;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const generateInviteCode = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const emptyTrip = (): TripData => ({
  location: '',
  startDate: '',
  endDate: '',
  departureDate: '',
  returnDate: '',
  flightInfo: '',
  hotelName: '',
  hotelAddress: '',
  hotelCheckIn: '',
  hotelCheckOut: '',
  notes: '',
});

export default function StackCirclePage() {
  const { theme, isDark } = useTheme();
  const { data: orcaData, loading } = useOrcaData();

  const initialRoommates: RoommateData = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-roommates');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { enabled: false, totalRent: 0, utilities: [], members: [], history: [] };
  })();

  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [groupSubTabs, setGroupSubTabs] = useState<Record<string, 'savings' | 'tasks' | 'trip'>>({});

  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('');
  const [newGroupDate, setNewGroupDate] = useState('');

  const [activeTab, setActiveTab] = useState<'group' | 'roommates'>('group');
  const [addMoneyAmounts, setAddMoneyAmounts] = useState<Record<string, string>>({});
  const [roommates, setRoommates] = useState<RoommateData>(initialRoommates);
  const [editingRent, setEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState(String(initialRoommates.totalRent));
  const [addingUtility, setAddingUtility] = useState(false);
  const [utilityName, setUtilityName] = useState('');
  const [utilityAmount, setUtilityAmount] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberName, setMemberName] = useState('');

  const [roommateExpanded, setRoommateExpanded] = useState<Record<string, boolean>>({
    rent: true, utilities: true, roommates: true,
  });

  const persistRoommates = (updated: RoommateData) => {
    setRoommates(updated);
    try { setLocalSynced('orca-roommates', JSON.stringify(updated)); } catch {}
  };

  const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});
  const [editingGroupNames, setEditingGroupNames] = useState<Record<string, boolean>>({});
  const [groupNameInputs, setGroupNameInputs] = useState<Record<string, string>>({});

  // Per-group task state
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});

  // Per-group trip editing state (local draft before saving)
  const [tripDrafts, setTripDrafts] = useState<Record<string, TripData>>({});
  const [editingTrip, setEditingTrip] = useState<Record<string, boolean>>({});

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const savedGroups = localStorage.getItem('orca-stack-circle-groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        setGroups(parsed);
        if (parsed.length > 0) {
          setExpandedGroupIds(new Set(parsed.map((g: Group) => g.id)));
        }
      } catch { setGroups([]); }
    }
  }, []);

  useEffect(() => {
    setLocalSynced('orca-stack-circle-groups', JSON.stringify(groups));
  }, [groups]);

  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaid = roommates.members.every((m) => m.paidRent && m.paidUtilities);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const setGroupSubTab = (groupId: string, tab: 'savings' | 'tasks' | 'trip') => {
    setGroupSubTabs(prev => ({ ...prev, [groupId]: tab }));
  };

  const handleCreateGroup = () => {
    if (newGroupName && newGroupGoal && newGroupTarget && newGroupDate && !isNaN(Number(newGroupTarget))) {
      const newGroup: Group = {
        id: gid(), name: newGroupName, goal: newGroupGoal,
        target: Number(newGroupTarget), current: 0, date: newGroupDate,
        code: generateInviteCode(),
        members: [{ id: gid(), name: 'You', role: 'coordinator', target: Number(newGroupTarget), contrib: 0, balance: 0 }],
        activity: [{ id: gid(), user: 'You', msg: `Created group "${newGroupName}"`, date: new Date().toLocaleDateString() }],
      };
      setGroups(prev => [...prev, newGroup]);
      setExpandedGroupIds(prev => new Set(Array.from(prev).concat(newGroup.id)));
      setNewGroupName(''); setNewGroupGoal(''); setNewGroupTarget(''); setNewGroupDate('');
      setShowCreateGroupForm(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    setExpandedGroupIds(prev => { const next = new Set(prev); next.delete(groupId); return next; });
  };

  const handleCopyCode = (group: Group) => {
    if (group.code) {
      navigator.clipboard.writeText(group.code).catch(() => {});
      setCopiedCodes(prev => ({ ...prev, [group.id]: true }));
      setTimeout(() => setCopiedCodes(prev => ({ ...prev, [group.id]: false })), 2000);
    }
  };

  const handleAddTask = (groupId: string) => {
    const text = newTaskTexts[groupId] || '';
    if (!text.trim()) return;
    setGroups(groups.map(g => g.id === groupId
      ? { ...g, tasks: [...(g.tasks || []), { id: gid(), text: text.trim(), completed: false, createdAt: new Date().toLocaleDateString() }], activity: [{ id: gid(), user: 'You', msg: `Added task "${text.trim()}"`, date: new Date().toLocaleDateString() }, ...g.activity] }
      : g));
    setNewTaskTexts(prev => ({ ...prev, [groupId]: '' }));
  };

  const handleToggleTask = (groupId: string, taskId: string) => {
    setGroups(groups.map(g => g.id === groupId
      ? { ...g, tasks: (g.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
      : g));
  };

  const handleDeleteTask = (groupId: string, taskId: string) => {
    setGroups(groups.map(g => g.id === groupId
      ? { ...g, tasks: (g.tasks || []).filter(t => t.id !== taskId) }
      : g));
  };

  // Trip: open edit mode, seeding draft from saved data
  const handleEditTrip = (group: Group) => {
    setTripDrafts(prev => ({ ...prev, [group.id]: { ...emptyTrip(), ...(group.trip || {}) } }));
    setEditingTrip(prev => ({ ...prev, [group.id]: true }));
  };

  const handleTripDraftChange = (groupId: string, field: keyof TripData, value: string) => {
    setTripDrafts(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || emptyTrip()), [field]: value } }));
  };

  const handleSaveTripDetails = (groupId: string) => {
    const draft = tripDrafts[groupId];
    if (!draft) return;
    setGroups(groups.map(g => g.id === groupId ? { ...g, trip: { ...emptyTrip(), ...draft } } : g));
    setEditingTrip(prev => ({ ...prev, [groupId]: false }));
  };

  const handleJoinGroup = () => {
    if (!joinCode.trim()) { setJoinError('Please enter an invite code'); return; }
    const targetGroup = groups.find(g => g.code === joinCode.trim().toUpperCase());
    if (!targetGroup) { setJoinError('Invalid invite code. Please try again.'); return; }
    if (targetGroup.members.some(m => m.name === 'You')) {
      setExpandedGroupIds(prev => new Set(Array.from(prev).concat(targetGroup.id)));
      setJoinCode(''); setJoinError(''); return;
    }
    setGroups(groups.map(g => g.id === targetGroup.id
      ? { ...g, members: [...g.members, { id: gid(), name: 'You', role: 'member', target: g.target, contrib: 0, balance: 0, joinedAt: new Date().toLocaleDateString() }], activity: [{ id: gid(), user: 'You', msg: 'Joined the group via invite code', date: new Date().toLocaleDateString() }, ...g.activity] }
      : g));
    setExpandedGroupIds(prev => new Set(Array.from(prev).concat(targetGroup.id)));
    setJoinCode(''); setJoinError('');
  };

  const handleSaveGroupName = (groupId: string) => {
    const input = groupNameInputs[groupId] || '';
    if (input) {
      setGroups(groups.map(g => g.id === groupId ? { ...g, customName: input } : g));
      setEditingGroupNames(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const handleAddMoney = (groupId: string) => {
    const amount = Number(addMoneyAmounts[groupId] || '');
    const group = groups.find(g => g.id === groupId);
    if (!isNaN(amount) && amount > 0 && group) {
      setGroups(groups.map(g => g.id === groupId
        ? { ...g, current: g.current + amount, members: g.members.map(m => m.name === 'You' ? { ...m, contrib: (m.contrib || 0) + amount, balance: (m.balance || 0) + amount } : m), activity: [{ id: gid(), user: 'You', msg: `Added ${fmt(amount)} to the group`, date: new Date().toLocaleDateString() }, ...g.activity] }
        : g));
      setAddMoneyAmounts(prev => ({ ...prev, [groupId]: '' }));
    }
  };

  const handleSaveRent = () => {
    if (rentInput && !isNaN(Number(rentInput))) {
      persistRoommates({ ...roommates, totalRent: Number(rentInput) });
      setEditingRent(false);
    }
  };

  const handleAddUtility = () => {
    if (utilityName && utilityAmount && !isNaN(Number(utilityAmount))) {
      persistRoommates({ ...roommates, utilities: [...roommates.utilities, { id: gid(), name: utilityName, amount: Number(utilityAmount), split: 0 }] });
      setUtilityName(''); setUtilityAmount(''); setAddingUtility(false);
    }
  };

  const handleAddMember = () => {
    if (memberName) {
      const count = roommates.members.length + 1;
      const share = Math.round(10000 / count) / 100;
      persistRoommates({ ...roommates, members: [...roommates.members.map(m => ({ ...m, share })), { id: gid(), name: memberName, share, paidRent: false, paidUtilities: false }] });
      setMemberName(''); setAddingMember(false);
    }
  };

  const handleRemoveMember = (id: string) => {
    const newMembers = roommates.members.filter(m => m.id !== id);
    if (newMembers.length > 0) {
      const share = Math.round(10000 / newMembers.length) / 100;
      persistRoommates({ ...roommates, members: newMembers.map(m => ({ ...m, share })) });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg, color: theme.text }}><div>Loading...</div></div>;
  }

  // Theme-derived accent colors so everything adapts dynamically
  const accent = '#6366F1';
  const accentLight = isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF';
  const accentBorder = isDark ? 'rgba(99,102,241,0.35)' : '#C7D2FE';
  const teal = '#0891B2';
  const tealLight = isDark ? '#164E63' : '#E0F9FC';
  const tealBorder = isDark ? '#0E7490' : '#A5F3FC';

  const inputStyle = {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    color: theme.text,
    border: `1px solid ${theme.border}`,
  };

  const cardStyle = {
    backgroundColor: theme.card,
    border: `1px solid ${theme.border}`,
  };

  return (
    <div className="min-h-screen pb-32 overflow-x-hidden transition-colors w-full max-w-full" style={{ backgroundColor: theme.bg, color: theme.text }}>
      {/* Header */}
      <motion.div className="border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-colors" style={{ borderColor: theme.border, backgroundColor: theme.bg }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: tealLight }}>
            <Users className="w-5 h-5" style={{ color: teal }} />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold" style={{ color: theme.text }}>Stack Circle</h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <p className="text-sm" style={{ color: theme.textM }}>Save together, achieve more</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b px-4 sm:px-6 lg:px-8 transition-colors" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
        <div className="max-w-4xl mx-auto flex gap-4 sm:gap-8 overflow-x-auto">
          {([['group', 'Group'], ['roommates', 'Roommates']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap"
              style={{ borderColor: activeTab === key ? teal : 'transparent', color: activeTab === key ? teal : theme.textS }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full" variants={containerVariants} initial="hidden" animate="visible">

        {/* ═══════════════════ GROUP TAB ═══════════════════ */}
        {activeTab === 'group' && (
          <>
            {/* Join Group Card */}
            <motion.div variants={itemVariants} className="rounded-2xl p-3 sm:p-5 transition-colors" style={{ ...cardStyle, borderColor: tealBorder }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-2xl" style={{ backgroundColor: tealLight }}>
                  <UserPlus className="w-5 h-5" style={{ color: teal }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base" style={{ color: theme.text }}>Join a Group</h3>
                  <p className="text-xs" style={{ color: theme.textS }}>Enter a group code to join an existing circle</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter 6-character code" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }} onKeyDown={e => e.key === 'Enter' && handleJoinGroup()}
                  className="flex-1 rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors font-mono tracking-widest"
                  style={{ ...inputStyle, borderColor: joinError ? '#EF4444' : theme.border }} maxLength={6} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleJoinGroup}
                  className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm whitespace-nowrap"
                  style={{ backgroundColor: teal, color: '#fff' }}>
                  Join Group
                </motion.button>
              </div>
              {joinError && <p className="text-xs mt-2 font-medium" style={{ color: '#EF4444' }}>{joinError}</p>}
            </motion.div>

            {/* Empty State */}
            {groups.length === 0 && (
              <>
                <motion.div variants={itemVariants} className="text-center py-10 sm:py-16 px-4 rounded-2xl border-2 border-dashed" style={{ borderColor: tealBorder }}>
                  <Users className="w-12 h-12 mx-auto mb-4" style={{ color: theme.textS }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.textM }}>No Groups Yet</h3>
                  <p className="text-sm mb-4" style={{ color: theme.textS }}>Create a group to start saving together</p>
                </motion.div>
                <motion.div variants={itemVariants} className="rounded-2xl p-4 sm:p-6" style={{ ...cardStyle, borderColor: tealBorder }}>
                  <h3 className="font-bold text-base mb-4" style={{ color: theme.text }}>Create Your First Group</h3>
                  <CreateGroupForm
                    newGroupName={newGroupName} setNewGroupName={setNewGroupName}
                    newGroupGoal={newGroupGoal} setNewGroupGoal={setNewGroupGoal}
                    newGroupTarget={newGroupTarget} setNewGroupTarget={setNewGroupTarget}
                    newGroupDate={newGroupDate} setNewGroupDate={setNewGroupDate}
                    onSubmit={handleCreateGroup} theme={theme} teal={teal} inputStyle={inputStyle}
                  />
                </motion.div>
              </>
            )}

            {/* Groups List */}
            {groups.map(group => {
              const isExpanded = expandedGroupIds.has(group.id);
              const subTab = groupSubTabs[group.id] || 'savings';
              const displayName = group.customName || group.name;
              const isCopied = copiedCodes[group.id] || false;
              const isEditingName = editingGroupNames[group.id] || false;
              const isTripEditing = editingTrip[group.id] || false;
              const tripDraft = tripDrafts[group.id] || { ...emptyTrip(), ...(group.trip || {}) };

              return (
                <motion.div key={group.id} variants={itemVariants} className="rounded-2xl overflow-hidden transition-colors" style={{ backgroundColor: theme.card, border: `1px solid ${accentBorder}` }}>
                  {/* Group Header Row */}
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <div className="p-2 rounded-2xl flex-shrink-0" style={{ backgroundColor: accentLight }}>
                      <Plane className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base truncate" style={{ color: theme.text }}>{displayName}</p>
                      <p className="text-xs" style={{ color: theme.textS }}>
                        {group.date ? new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'} · {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleGroupExpand(group.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7', color: '#D97706' }}>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Minimize' : 'Expand'}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 rounded-xl hover:opacity-80 transition-opacity" style={{ color: '#EF4444' }}>
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="px-4 sm:px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${accentBorder}` }}>

                          {/* Compact Overview */}
                          <div className="rounded-xl p-3 sm:p-4 mt-4" style={{ backgroundColor: accentLight, border: `1px solid ${accentBorder}` }}>
                            {/* Editable Name */}
                            <div className="flex items-center justify-between mb-3">
                              {!isEditingName ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-sm truncate" style={{ color: accent }}>{displayName}</span>
                                  <button onClick={() => { setEditingGroupNames(prev => ({ ...prev, [group.id]: true })); setGroupNameInputs(prev => ({ ...prev, [group.id]: displayName })); }}
                                    className="p-1 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.card }}>
                                    <Edit3 className="w-3.5 h-3.5" style={{ color: accent }} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                  <input type="text" value={groupNameInputs[group.id] || ''} onChange={e => setGroupNameInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                                    className="flex-1 px-2 py-1 rounded-lg text-xs focus:outline-none" style={{ ...inputStyle, border: `1px solid ${accent}` }} autoFocus />
                                  <button onClick={() => handleSaveGroupName(group.id)} className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: accent, color: '#fff' }}>Save</button>
                                  <button onClick={() => setEditingGroupNames(prev => ({ ...prev, [group.id]: false }))} className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: theme.border, color: theme.text }}>✕</button>
                                </div>
                              )}
                              {/* Copy code pill */}
                              <button onClick={() => handleCopyCode(group)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
                                style={{ backgroundColor: isCopied ? '#10B981' : accent, color: '#fff' }}>
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {isCopied ? 'Copied!' : group.code}
                              </button>
                            </div>

                            {/* Progress Row */}
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                                <svg width="64" height="64" viewBox="0 0 64 64">
                                  <circle cx="32" cy="32" r="26" fill="none" stroke={accentBorder} strokeWidth="6" />
                                  <motion.circle cx="32" cy="32" r="26" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" transform="rotate(-90 32 32)"
                                    initial={{ strokeDasharray: '0 163' }} animate={{ strokeDasharray: `${Math.min((group.current / group.target) * 163, 163)} 163` }} transition={{ duration: 0.8 }} />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{pct(group.current, group.target)}%</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1 mb-1">
                                  <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{fmt(group.current)}</span>
                                  <span className="text-xs" style={{ color: theme.textM }}>saved</span>
                                </div>
                                <div className="text-xs mb-2" style={{ color: theme.textM }}>Target: <span style={{ fontWeight: 700, color: accent }}>{fmt(group.target)}</span></div>
                                <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: accentBorder }}>
                                  <motion.div className="h-full rounded-full" style={{ backgroundColor: accent }} initial={{ width: 0 }} animate={{ width: `${Math.min((group.current / group.target) * 100, 100)}%` }} transition={{ duration: 0.8 }} />
                                </div>
                                {group.date && (
                                  <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: accent }}>
                                    <Calendar size={10} />
                                    {new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <span className="px-1.5 py-0.5 rounded-full" style={{ background: accent, color: '#fff', fontWeight: 700, fontSize: 9 }}>
                                      {(() => { const d = Math.ceil((new Date(group.date + 'T00:00:00').getTime() - Date.now()) / 86400000); return d > 0 ? `${d}d away` : d === 0 ? 'Today!' : `${Math.abs(d)}d ago`; })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sub-Tabs */}
                          <div className="flex gap-1.5 rounded-xl p-1" style={{ backgroundColor: accentLight, border: `1px solid ${accentBorder}` }}>
                            {([['savings', 'Savings'], ['tasks', 'Checklist'], ['trip', 'Trip']] as const).map(([key, label]) => (
                              <button key={key} onClick={() => setGroupSubTab(group.id, key)}
                                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                                style={{ backgroundColor: subTab === key ? accent : 'transparent', color: subTab === key ? '#fff' : accent }}>
                                {label}
                              </button>
                            ))}
                          </div>

                          {/* ── SAVINGS ── */}
                          {subTab === 'savings' && (
                            <div className="space-y-4">
                              {/* Invite */}
                              <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${tealBorder}` }}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 rounded-xl" style={{ backgroundColor: tealLight }}><UserPlus className="w-4 h-4" style={{ color: teal }} /></div>
                                  <div>
                                    <h4 className="font-bold text-sm" style={{ color: theme.text }}>Invite Members</h4>
                                    <p className="text-xs" style={{ color: theme.textS }}>Share your group code</p>
                                  </div>
                                </div>
                                <div className="rounded-xl p-3 text-center mb-3" style={{ backgroundColor: accentLight, border: `1px solid ${accentBorder}` }}>
                                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accent, opacity: 0.7 }}>Group Code</p>
                                  <div className="text-2xl sm:text-3xl font-black tracking-[0.2em] mb-3" style={{ color: accent }}>{group.code}</div>
                                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleCopyCode(group)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                                    style={{ backgroundColor: isCopied ? '#10B981' : accent, color: '#fff' }}>
                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {isCopied ? 'Copied!' : 'Copy Code'}
                                  </motion.button>
                                </div>
                                <div className="rounded-lg p-2.5 text-xs" style={{ backgroundColor: tealLight, color: teal }}>
                                  <strong>How it works:</strong> Share this code with friends — they open Stack Circle, tap Join Group, enter the code, and they're in instantly.
                                </div>
                              </div>

                              {/* Add Money */}
                              <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${tealBorder}` }}>
                                <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Add Money to Group</h4>
                                <div className="flex gap-2">
                                  <input type="number" placeholder="$0.00" value={addMoneyAmounts[group.id] || ''} onChange={e => setAddMoneyAmounts(prev => ({ ...prev, [group.id]: e.target.value }))}
                                    className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleAddMoney(group.id)}
                                    className="font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap" style={{ backgroundColor: teal, color: '#fff' }}>
                                    Add
                                  </motion.button>
                                </div>
                              </div>

                              {/* Members */}
                              <div>
                                <h4 className="font-bold text-sm mb-2" style={{ color: theme.text }}>Members</h4>
                                <div className="space-y-2">
                                  {group.members.map(member => (
                                    <div key={member.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold" style={{ backgroundColor: accent, color: '#fff' }}>{member.name[0]}</div>
                                      <div className="flex-1 min-w-0">
                                        <p style={{ fontWeight: 700, color: theme.text, fontSize: 13 }}>{member.name}</p>
                                        <p className="text-xs" style={{ color: theme.textS }}>Contributed: {fmt(member.contrib)}</p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p style={{ fontWeight: 800, color: accent, fontSize: 14 }}>{fmt(member.balance)}</p>
                                        <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: accentLight, color: accent, fontWeight: 600 }}>
                                          {member.role === 'coordinator' ? 'Coordinator' : 'Member'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Activity */}
                              {group.activity.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-sm mb-2" style={{ color: theme.text }}>Activity Feed</h4>
                                  <div className="space-y-2">
                                    {group.activity.slice(0, 5).map(act => (
                                      <div key={act.id} className="rounded-xl p-3 flex gap-2 text-sm" style={{ backgroundColor: theme.bg, border: `1px solid ${tealBorder}` }}>
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: teal }} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs" style={{ color: theme.text }}>{act.msg}</p>
                                          <p className="text-xs mt-0.5" style={{ color: theme.textS }}>{act.date}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── CHECKLIST ── */}
                          {subTab === 'tasks' && (
                            <div className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${accentBorder}` }}>
                              <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Trip Checklist</h4>
                              <div className="flex gap-2 mb-3">
                                <input type="text" placeholder="Add a checklist item..." value={newTaskTexts[group.id] || ''} onChange={e => setNewTaskTexts(prev => ({ ...prev, [group.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddTask(group.id)}
                                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleAddTask(group.id)}
                                  className="font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap" style={{ backgroundColor: accent, color: '#fff' }}>
                                  <Plus className="w-4 h-4 inline mr-1" />Add
                                </motion.button>
                              </div>
                              <div className="space-y-2">
                                {(group.tasks || []).length === 0 ? (
                                  <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No items yet. Add one above!</p>
                                ) : (group.tasks || []).map(task => (
                                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, opacity: task.completed ? 0.6 : 1 }}>
                                    <button onClick={() => handleToggleTask(group.id, task.id)}
                                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                      style={{ borderColor: task.completed ? '#10B981' : theme.border, backgroundColor: task.completed ? '#10B981' : 'transparent' }}>
                                      {task.completed && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <span className="flex-1 text-sm" style={{ color: theme.text, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                                    <button onClick={() => handleDeleteTask(group.id, task.id)} className="p-1 rounded-lg hover:opacity-80" style={{ color: '#EF4444' }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── TRIP ── */}
                          {subTab === 'trip' && (
                            <div className="space-y-4">
                              {/* View mode — show saved info */}
                              {!isTripEditing && group.trip && (group.trip.location || group.trip.flightInfo || group.trip.hotelName) && (
                                <div className="rounded-xl p-4" style={{ backgroundColor: accentLight, border: `1px solid ${accentBorder}` }}>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="font-bold text-xs uppercase tracking-wider" style={{ color: accent }}>Current Trip</p>
                                    <button onClick={() => handleEditTrip(group)} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: accent, color: '#fff' }}>
                                      <Edit3 className="w-3 h-3" />Edit
                                    </button>
                                  </div>
                                  {group.trip.location && <p className="font-semibold text-sm mb-1" style={{ color: theme.text }}>📍 {group.trip.location}</p>}
                                  {(group.trip.departureDate || group.trip.returnDate) && (
                                    <p className="text-xs mb-1" style={{ color: theme.textM }}>
                                      ✈️ Departs {group.trip.departureDate ? new Date(group.trip.departureDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                      {group.trip.returnDate ? ` · Returns ${new Date(group.trip.returnDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                                    </p>
                                  )}
                                  {group.trip.flightInfo && <p className="text-xs mb-1" style={{ color: theme.textM }}>🛫 {group.trip.flightInfo}</p>}
                                  {group.trip.hotelName && <p className="text-xs mb-1" style={{ color: theme.textM }}>🏨 {group.trip.hotelName}{group.trip.hotelAddress ? ` — ${group.trip.hotelAddress}` : ''}</p>}
                                  {(group.trip.hotelCheckIn || group.trip.hotelCheckOut) && (
                                    <p className="text-xs mb-1" style={{ color: theme.textM }}>
                                      Check-in: {group.trip.hotelCheckIn ? new Date(group.trip.hotelCheckIn + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                      {group.trip.hotelCheckOut ? ` · Check-out: ${new Date(group.trip.hotelCheckOut + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                                    </p>
                                  )}
                                  {group.trip.notes && <p className="text-xs mt-2 italic" style={{ color: theme.textS }}>📝 {group.trip.notes}</p>}
                                </div>
                              )}

                              {/* Edit / Create Trip Form */}
                              {(isTripEditing || !group.trip || (!group.trip.location && !group.trip.flightInfo && !group.trip.hotelName)) && (
                                <div className="rounded-xl p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${accentBorder}` }}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-sm" style={{ color: theme.text }}>
                                      {isTripEditing ? 'Edit Trip Details' : 'Add Trip Details'}
                                    </h4>
                                    {isTripEditing && (
                                      <button onClick={() => setEditingTrip(prev => ({ ...prev, [group.id]: false }))} className="text-xs" style={{ color: theme.textS }}>Cancel</button>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    {/* Destination */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Destination</label>
                                      <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textS }} />
                                        <input type="text" placeholder="City, Country" value={tripDraft.location}
                                          onChange={e => handleTripDraftChange(group.id, 'location', e.target.value)}
                                          className="w-full rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                      </div>
                                    </div>

                                    {/* Flight Info */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Flight Information</label>
                                      <div className="relative">
                                        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textS }} />
                                        <input type="text" placeholder="e.g. AA 1234 — JFK → LAX" value={tripDraft.flightInfo}
                                          onChange={e => handleTripDraftChange(group.id, 'flightInfo', e.target.value)}
                                          className="w-full rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                      </div>
                                    </div>

                                    {/* Travel Dates */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Travel Dates</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <p className="text-xs mb-1" style={{ color: theme.textS }}>Departure</p>
                                          <input type="date" value={tripDraft.departureDate}
                                            onChange={e => handleTripDraftChange(group.id, 'departureDate', e.target.value)}
                                            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                        </div>
                                        <div>
                                          <p className="text-xs mb-1" style={{ color: theme.textS }}>Return</p>
                                          <input type="date" value={tripDraft.returnDate}
                                            onChange={e => handleTripDraftChange(group.id, 'returnDate', e.target.value)}
                                            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Hotel */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Hotel Name</label>
                                      <div className="relative">
                                        <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textS }} />
                                        <input type="text" placeholder="e.g. The Grand Hyatt" value={tripDraft.hotelName}
                                          onChange={e => handleTripDraftChange(group.id, 'hotelName', e.target.value)}
                                          className="w-full rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Hotel Address</label>
                                      <input type="text" placeholder="Street, City" value={tripDraft.hotelAddress}
                                        onChange={e => handleTripDraftChange(group.id, 'hotelAddress', e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Hotel Check-in</label>
                                        <input type="date" value={tripDraft.hotelCheckIn}
                                          onChange={e => handleTripDraftChange(group.id, 'hotelCheckIn', e.target.value)}
                                          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Hotel Check-out</label>
                                        <input type="date" value={tripDraft.hotelCheckOut}
                                          onChange={e => handleTripDraftChange(group.id, 'hotelCheckOut', e.target.value)}
                                          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: theme.textM }}>Notes</label>
                                      <textarea placeholder="Anything else the group should know..." value={tripDraft.notes}
                                        onChange={e => handleTripDraftChange(group.id, 'notes', e.target.value)} rows={2}
                                        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} />
                                    </div>

                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSaveTripDetails(group.id)}
                                      className="w-full font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                                      style={{ backgroundColor: accent, color: '#fff' }}>
                                      <Save className="w-4 h-4" />
                                      Save Trip Details
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Create Another Group */}
            {groups.length > 0 && (
              <motion.div variants={itemVariants}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateGroupForm(!showCreateGroupForm)}
                  className="w-full px-4 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 font-bold"
                  style={{ backgroundColor: theme.bg, border: `1px dashed ${theme.border}`, color: accent }}>
                  <Plus className="w-4 h-4" />
                  {showCreateGroupForm ? 'Cancel' : 'Create Another Group'}
                </motion.button>
                <AnimatePresence>
                  {showCreateGroupForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                      <div className="rounded-2xl p-4 sm:p-6" style={{ ...cardStyle, borderColor: tealBorder }}>
                        <h3 className="font-bold text-base mb-4" style={{ color: theme.text }}>Create New Group</h3>
                        <CreateGroupForm
                          newGroupName={newGroupName} setNewGroupName={setNewGroupName}
                          newGroupGoal={newGroupGoal} setNewGroupGoal={setNewGroupGoal}
                          newGroupTarget={newGroupTarget} setNewGroupTarget={setNewGroupTarget}
                          newGroupDate={newGroupDate} setNewGroupDate={setNewGroupDate}
                          onSubmit={handleCreateGroup} theme={theme} teal={teal} inputStyle={inputStyle}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* ═══════════════════ ROOMMATES TAB ═══════════════════ */}
        {activeTab === 'roommates' && (
          <>
            {/* Overview */}
            <motion.div variants={itemVariants} className="rounded-2xl p-4 sm:p-8 text-center" style={{ backgroundColor: tealLight, border: `1px solid ${tealBorder}` }}>
              <p className="text-xs sm:text-sm mb-2" style={{ color: theme.textM }}>Total Monthly Housing</p>
              <div className="text-2xl sm:text-5xl font-bold mb-4" style={{ color: teal }}>{fmt(totalMonthly)}</div>
              <div className="flex justify-center gap-6 sm:gap-8 mb-4">
                <div>
                  <p className="text-xs sm:text-sm" style={{ color: theme.textS }}>Rent</p>
                  <p className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>{fmt(roommates.totalRent)}</p>
                </div>
                <div className="w-px" style={{ backgroundColor: tealBorder }} />
                <div>
                  <p className="text-xs sm:text-sm" style={{ color: theme.textS }}>Utilities</p>
                  <p className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>{fmt(totalUtilities)}</p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => persistRoommates({ ...roommates, members: roommates.members.map(m => ({ ...m, paidRent: !allPaid, paidUtilities: !allPaid })) })}
                className="px-6 py-2.5 rounded-full text-sm font-bold"
                style={{ backgroundColor: allPaid ? '#10B981' : teal, color: '#fff' }}>
                {allPaid ? '✓ All Paid This Month' : 'Mark All Paid This Month'}
              </motion.button>
            </motion.div>

            {/* Rent Section */}
            <RoommateSection title="Rent" rightLabel={fmt(roommates.totalRent)} expanded={roommateExpanded.rent}
              onToggle={() => setRoommateExpanded(p => ({ ...p, rent: !p.rent }))}
              accent={teal} accentLight={tealLight} tealBorder={tealBorder} theme={theme} isDark={isDark}
              extra={
                <button onClick={() => { setEditingRent(!editingRent); setRentInput(String(roommates.totalRent)); }}
                  className="text-xs font-semibold hover:opacity-80" style={{ color: teal }}>
                  {editingRent ? 'Cancel' : 'Edit'}
                </button>
              }>
              {!editingRent ? (
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: teal }}>{fmt(roommates.totalRent)}</p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input type="number" value={rentInput} onChange={e => setRentInput(e.target.value)}
                    className="flex-1 rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none" style={inputStyle} />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveRent}
                    className="font-bold px-5 py-2 sm:py-3 rounded-2xl text-sm whitespace-nowrap" style={{ backgroundColor: teal, color: '#fff' }}>Save</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingRent(false)}
                    className="font-bold px-5 py-2 sm:py-3 rounded-2xl text-sm" style={{ backgroundColor: theme.border, color: theme.text }}>Cancel</motion.button>
                </div>
              )}
            </RoommateSection>

            {/* Utilities Section */}
            <RoommateSection title="Shared Utilities" expanded={roommateExpanded.utilities}
              onToggle={() => setRoommateExpanded(p => ({ ...p, utilities: !p.utilities }))}
              accent={teal} accentLight={tealLight} tealBorder={tealBorder} theme={theme} isDark={isDark}
              extra={
                <button onClick={() => setAddingUtility(!addingUtility)} className="text-xs font-semibold hover:opacity-80 flex items-center gap-1" style={{ color: teal }}>
                  <Plus className="w-3 h-3" />{addingUtility ? 'Cancel' : 'Add'}
                </button>
              }>
              <AnimatePresence>
                {addingUtility && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <input type="text" placeholder="Utility name" value={utilityName} onChange={e => setUtilityName(e.target.value)}
                      className="w-full rounded-2xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                    <div className="flex gap-2">
                      <input type="number" placeholder="$0.00" value={utilityAmount} onChange={e => setUtilityAmount(e.target.value)}
                        className="flex-1 rounded-2xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddUtility}
                        className="font-bold px-5 py-2 rounded-2xl text-sm whitespace-nowrap" style={{ backgroundColor: teal, color: '#fff' }}>Add</motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {roommates.utilities.map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <span className="flex-1 text-sm font-semibold" style={{ color: theme.text }}>{u.name}</span>
                    <span className="font-bold" style={{ color: teal }}>{fmt(u.amount)}</span>
                    <button onClick={() => persistRoommates({ ...roommates, utilities: roommates.utilities.filter(x => x.id !== u.id) })}
                      className="p-1 rounded-lg hover:opacity-80" style={{ color: '#EF4444' }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {roommates.utilities.length === 0 && !addingUtility && <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No utilities added yet.</p>}
              </div>
            </RoommateSection>

            {/* Roommates Section */}
            <RoommateSection title="Roommates" expanded={roommateExpanded.roommates}
              onToggle={() => setRoommateExpanded(p => ({ ...p, roommates: !p.roommates }))}
              accent={teal} accentLight={tealLight} tealBorder={tealBorder} theme={theme} isDark={isDark}
              extra={
                <button onClick={() => setAddingMember(!addingMember)} className="text-xs font-semibold hover:opacity-80 flex items-center gap-1" style={{ color: teal }}>
                  <Plus className="w-3 h-3" />{addingMember ? 'Cancel' : 'Add'}
                </button>
              }>
              <AnimatePresence>
                {addingMember && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <input type="text" placeholder="Name" value={memberName} onChange={e => setMemberName(e.target.value)}
                      className="flex-1 rounded-2xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddMember}
                      className="font-bold px-5 py-2 rounded-2xl text-sm whitespace-nowrap" style={{ backgroundColor: teal, color: '#fff' }}>Add</motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-3">
                {roommates.members.map(member => {
                  const rentShare = (roommates.totalRent * member.share) / 100;
                  const utilsShare = (totalUtilities * member.share) / 100;
                  const isPaid = member.paidRent && member.paidUtilities;
                  return (
                    <div key={member.id} className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ backgroundColor: tealLight, color: teal }}>{member.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{member.name}</p>
                          <p className="text-xs" style={{ color: theme.textS }}>Share: {member.share}% · Owes {fmt(rentShare + utilsShare)}/mo</p>
                        </div>
                        <button onClick={() => { persistRoommates({ ...roommates, members: roommates.members.map(m => m.id === member.id ? { ...m, paidRent: !isPaid, paidUtilities: !isPaid } : m) }); }}
                          className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F1F5F9'), color: isPaid ? '#16A34A' : theme.textS }}>
                          {isPaid ? '✓ Paid' : 'Unpaid'}
                        </button>
                      </div>
                      <p className="text-xs mb-3" style={{ color: theme.textM }}>Rent: {fmt(rentShare)} · Utils: {fmt(utilsShare)}</p>
                      <div className="flex gap-2 mb-2">
                        {[['paidRent', 'Rent'] as const, ['paidUtilities', 'Utils'] as const].map(([field, label]) => (
                          <motion.button key={field} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => persistRoommates({ ...roommates, members: roommates.members.map(m => m.id === member.id ? { ...m, [field]: !m[field] } : m) })}
                            className="flex-1 py-2 rounded-xl font-semibold text-xs sm:text-sm"
                            style={{ backgroundColor: member[field] ? '#10B981' : theme.border, color: member[field] ? '#fff' : theme.text }}>
                            {member[field] ? `✓ ${label} Paid` : `Mark ${label} Paid`}
                          </motion.button>
                        ))}
                      </div>
                      {member.name !== 'You' && (
                        <div className="flex gap-2 items-center">
                          <input type="number" min="0" max="100" value={member.share}
                            onChange={e => persistRoommates({ ...roommates, members: roommates.members.map(m => m.id === member.id ? { ...m, share: Math.min(100, Math.max(0, Number(e.target.value))) } : m) })}
                            className="flex-1 rounded-xl px-3 py-1.5 text-xs focus:outline-none" style={{ ...inputStyle, border: `1px solid ${theme.border}` }} />
                          <button onClick={() => handleRemoveMember(member.id)} className="p-1.5 rounded-lg hover:opacity-80 flex-shrink-0" style={{ color: '#EF4444' }}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {roommates.members.length === 0 && !addingMember && <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No roommates added yet.</p>}
              </div>
            </RoommateSection>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── Helper sub-components ── */

function CreateGroupForm({ newGroupName, setNewGroupName, newGroupGoal, setNewGroupGoal, newGroupTarget, setNewGroupTarget, newGroupDate, setNewGroupDate, onSubmit, theme, teal, inputStyle }: any) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Group Name</label>
        <input type="text" placeholder="e.g., Vacation Fund" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
          className="w-full rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Goal Description</label>
        <input type="text" placeholder="e.g., Beach trip next summer" value={newGroupGoal} onChange={e => setNewGroupGoal(e.target.value)}
          className="w-full rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none" style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Amount</label>
          <input type="number" placeholder="$0.00" value={newGroupTarget} onChange={e => setNewGroupTarget(e.target.value)}
            className="w-full rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Date</label>
          <CalendarPicker value={newGroupDate} onChange={setNewGroupDate} placeholder="Target Date" theme={theme} showQuickSelect={false} />
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onSubmit}
        className="w-full font-bold px-4 py-2 sm:py-3 rounded-2xl text-sm"
        style={{ backgroundColor: teal, color: '#fff' }}>
        <Plus className="w-4 h-4 inline mr-2" />Create Group
      </motion.button>
    </div>
  );
}

function RoommateSection({ title, rightLabel, expanded, onToggle, accent, accentLight, tealBorder, theme, isDark, extra, children }: any) {
  return (
    <motion.div className="rounded-2xl overflow-hidden transition-colors" style={{ backgroundColor: (theme as any).card, border: `1px solid ${tealBorder}` }}>
      <div className="flex items-center justify-between p-3 sm:p-5">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-base sm:text-lg" style={{ color: (theme as any).text }}>{title}</h3>
          {rightLabel && <span className="text-sm font-bold" style={{ color: accent }}>{rightLabel}</span>}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ backgroundColor: isDark ? 'rgba(8,145,178,0.15)' : '#E0F9FC', color: accent }}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Minimize' : 'Expand'}
          </motion.button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-1" style={{ borderTop: `1px solid ${tealBorder}` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
