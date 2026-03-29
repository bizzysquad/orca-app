'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  MapPin,
  X,
  Trash2,
  Link2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Edit3,
  UserPlus,
  ChevronDown,
  Calendar,
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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Helper: Convert group name to slug for invite URL
const toSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Helper: Generate invite code
const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export default function StackCirclePage() {
  const { theme, isDark } = useTheme();
  const { data: orcaData, loading } = useOrcaData();

  // Load roommate data from localStorage (no demo data)
  const initialRoommates: RoommateData = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-roommates');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      enabled: false,
      totalRent: 0,
      utilities: [],
      members: [],
      history: [],
    };
  })();

  // State for groups (stored in localStorage)
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('');
  const [newGroupDate, setNewGroupDate] = useState('');

  // Other state
  const [activeTab, setActiveTab] = useState<'group' | 'roommates'>('group');
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [roommates, setRoommates] = useState<RoommateData>(initialRoommates);
  const [editingRent, setEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState(String(roommates.totalRent));
  const [addingUtility, setAddingUtility] = useState(false);
  const [utilityName, setUtilityName] = useState('');
  const [utilityAmount, setUtilityAmount] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  // Persist roommate changes to localStorage
  const persistRoommates = (updated: RoommateData) => {
    setRoommates(updated);
    try { setLocalSynced('orca-roommates', JSON.stringify(updated)); } catch {}
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  // Load groups from localStorage on mount
  useEffect(() => {
    const savedGroups = localStorage.getItem('orca-stack-circle-groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        setGroups(parsed);
        if (parsed.length > 0 && !currentGroupId) {
          setCurrentGroupId(parsed[0].id);
        }
      } catch (e) {
        // Invalid JSON in localStorage
        setGroups([]);
      }
    }
  }, []);

  // Save groups to localStorage whenever they change
  useEffect(() => {
    // Always persist — including empty array so deletions are fully cleared
    setLocalSynced('orca-stack-circle-groups', JSON.stringify(groups));
  }, [groups]);

  // Get current group
  const currentGroup = currentGroupId
    ? groups.find((g) => g.id === currentGroupId) || null
    : null;

  // Update group name input when current group changes
  useEffect(() => {
    if (currentGroup) {
      setGroupNameInput(currentGroup.customName || currentGroup.name || '');
    }
  }, [currentGroup]);

  // Calculations
  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaidRent = roommates.members.every((m) => m.paidRent);
  const allPaidUtils = roommates.members.every((m) => m.paidUtilities);
  const allPaid = allPaidRent && allPaidUtils;

  // Invite link - using orcafin.app/invite/{group-name-slug}
  const groupNameSlug = toSlug(
    currentGroup?.customName || currentGroup?.name || ''
  );
  const inviteLink = currentGroup
    ? `https://orcafin.app/invite/${groupNameSlug}`
    : '';

  // Handlers for groups
  const handleCreateGroup = () => {
    if (
      newGroupName &&
      newGroupGoal &&
      newGroupTarget &&
      newGroupDate &&
      !isNaN(Number(newGroupTarget))
    ) {
      const newGroup: Group = {
        id: gid(),
        name: newGroupName,
        goal: newGroupGoal,
        target: Number(newGroupTarget),
        current: 0,
        date: newGroupDate,
        code: generateInviteCode(),
        members: [
          {
            id: gid(),
            name: 'You',
            role: 'coordinator',
            target: Number(newGroupTarget),
            contrib: 0,
            balance: 0,
          },
        ],
        activity: [
          {
            id: gid(),
            user: 'You',
            msg: `Created group "${newGroupName}"`,
            date: new Date().toLocaleDateString(),
          },
        ],
      };

      setGroups([...groups, newGroup]);
      setCurrentGroupId(newGroup.id);

      // Reset form
      setNewGroupName('');
      setNewGroupGoal('');
      setNewGroupTarget('');
      setNewGroupDate('');
      setShowCreateGroupForm(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter((g) => g.id !== groupId);
    setGroups(updatedGroups);

    // If deleted current group, switch to another
    if (currentGroupId === groupId) {
      setCurrentGroupId(updatedGroups.length > 0 ? updatedGroups[0].id : null);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setCurrentGroupId(groupId);
    setShowGroupSelector(false);
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (currentGroup?.code) {
      navigator.clipboard.writeText(currentGroup.code).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveGroupName = () => {
    if (groupNameInput && currentGroup) {
      const updatedGroups = groups.map((g) =>
        g.id === currentGroup.id
          ? {
              ...g,
              customName: groupNameInput,
            }
          : g
      );
      setGroups(updatedGroups);
      setEditingGroupName(false);
    }
  };

  const handleAddMoney = () => {
    if (addMoneyAmount && !isNaN(Number(addMoneyAmount)) && currentGroup) {
      const amount = Number(addMoneyAmount);
      const newCurrent = currentGroup.current + amount;
      const updatedGroups = groups.map((g) =>
        g.id === currentGroup.id
          ? {
              ...g,
              current: newCurrent,
              members: g.members.map((m) =>
                m.name === 'You' ? { ...m, contrib: (m.contrib || 0) + amount, balance: (m.balance || 0) + amount } : m
              ),
              activity: [
                {
                  id: gid(),
                  user: 'You',
                  msg: `Added ${fmt(amount)} to the group`,
                  date: new Date().toLocaleDateString(),
                },
                ...g.activity,
              ],
            }
          : g
      );
      setGroups(updatedGroups);
      setAddMoneyAmount('');
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
      const newUtility: Utility = {
        id: gid(),
        name: utilityName,
        amount: Number(utilityAmount),
        split: 0,
      };
      persistRoommates({
        ...roommates,
        utilities: [...roommates.utilities, newUtility],
      });
      setUtilityName('');
      setUtilityAmount('');
      setAddingUtility(false);
    }
  };

  const handleRemoveUtility = (id: string) => {
    persistRoommates({
      ...roommates,
      utilities: roommates.utilities.filter((u) => u.id !== id),
    });
  };

  const handleAddMember = () => {
    if (memberName) {
      const newMemberCount = roommates.members.length + 1;
      const newShare = Math.round(10000 / newMemberCount) / 100;
      const updatedMembers = roommates.members.map((m) => ({
        ...m,
        share: newShare,
      }));
      updatedMembers.push({
        id: gid(),
        name: memberName,
        share: newShare,
        paidRent: false,
        paidUtilities: false,
      });
      persistRoommates({ ...roommates, members: updatedMembers });
      setMemberName('');
      setAddingMember(false);
    }
  };

  const handleRemoveMember = (id: string) => {
    const newMembers = roommates.members.filter((m) => m.id !== id);
    if (newMembers.length > 0) {
      const newShare = Math.round(10000 / newMembers.length) / 100;
      const updatedMembers = newMembers.map((m) => ({
        ...m,
        share: newShare,
      }));
      persistRoommates({ ...roommates, members: updatedMembers });
    }
  };

  const handleToggleMemberShare = (id: string, newShare: number) => {
    persistRoommates({
      ...roommates,
      members: roommates.members.map((m) =>
        m.id === id ? { ...m, share: newShare } : m
      ),
    });
  };

  const handleToggleRentPaid = (id: string) => {
    persistRoommates({
      ...roommates,
      members: roommates.members.map((m) =>
        m.id === id ? { ...m, paidRent: !m.paidRent } : m
      ),
    });
  };

  const handleToggleUtilsPaid = (id: string) => {
    persistRoommates({
      ...roommates,
      members: roommates.members.map((m) =>
        m.id === id ? { ...m, paidUtilities: !m.paidUtilities } : m
      ),
    });
  };

  const getMemberRentShare = (share: number) => {
    return (roommates.totalRent * share) / 100;
  };

  const getMemberUtilsShare = (share: number) => {
    return (totalUtilities * share) / 100;
  };

  const displayGroupName =
    currentGroup?.customName || currentGroup?.name || 'Stack Circle';

  // Teal color scheme from Figma
  const teal = '#0891B2';
  const tealLight = isDark ? '#164E63' : '#E0F9FC';
  const tealBorder = isDark ? '#0E7490' : '#A5F3FC';

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.bg, color: theme.text }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-32 overflow-x-hidden transition-colors w-full"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Header */}
      <motion.div
        className="border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors"
        style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: tealLight }}>
            <Users className="w-5 h-5" style={{ color: teal }} />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold" style={{ color: theme.text }}>
            Stack Circle
          </h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <p className="text-sm" style={{ color: theme.textM }}>
            Save together, achieve more
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div
        className="border-b px-4 sm:px-6 lg:px-8 transition-colors"
        style={{ borderColor: theme.border, backgroundColor: theme.bg }}
      >
        <div className="max-w-4xl mx-auto flex gap-4 sm:gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('group')}
            className={`py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors ${
              activeTab === 'group' ? 'border-b-2' : 'border-transparent'
            }`}
            style={{
              borderColor:
                activeTab === 'group' ? teal : 'transparent',
              color: activeTab === 'group' ? teal : theme.textS,
            }}
          >
            Group Savings
          </button>
          <button
            onClick={() => setActiveTab('roommates')}
            className={`py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors ${
              activeTab === 'roommates' ? 'border-b-2' : 'border-transparent'
            }`}
            style={{
              borderColor:
                activeTab === 'roommates'
                  ? teal
                  : 'transparent',
              color: activeTab === 'roommates' ? teal : theme.textS,
            }}
          >
            Roommates
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8 max-w-4xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* GROUP SAVINGS TAB */}
        {activeTab === 'group' && (
          <>
            {/* Group Selector */}
            {groups.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="relative"
              >
                <button
                  onClick={() => setShowGroupSelector(!showGroupSelector)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: tealBorder,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" style={{ color: teal }} />
                    <div className="text-left">
                      <p className="text-xs" style={{ color: theme.textS }}>
                        Active Group
                      </p>
                      <p
                        className="font-semibold"
                        style={{ color: theme.text }}
                      >
                        {displayGroupName}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className="w-5 h-5"
                    style={{
                      color: theme.textM,
                      transform: showGroupSelector
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Group Dropdown Menu */}
                <AnimatePresence>
                  {showGroupSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full z-40 rounded-2xl border shadow-lg"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <div className="max-h-64 overflow-y-auto">
                        {groups.map((group) => (
                          <div key={group.id}>
                            <button
                              onClick={() => handleSelectGroup(group.id)}
                              className="w-full text-left px-4 py-3 border-b hover:opacity-80 transition-opacity flex items-center justify-between group"
                              style={{
                                borderColor: theme.border,
                                backgroundColor:
                                  currentGroupId === group.id
                                    ? theme.border
                                    : 'transparent',
                              }}
                            >
                              <div>
                                <p
                                  className="font-semibold"
                                  style={{ color: theme.text }}
                                >
                                  {group.customName || group.name}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: theme.textS }}
                                >
                                  {fmt(group.current)} / {fmt(group.target)}
                                </p>
                              </div>
                              {currentGroupId === group.id && (
                                <Check
                                  className="w-4 h-4"
                                  style={{ color: teal }}
                                />
                              )}
                            </button>

                            {/* Delete button for each group */}
                            {currentGroupId === group.id && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteGroup(group.id)}
                                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors hover:opacity-80 border-b"
                                style={{
                                  color: theme.bad,
                                  borderColor: theme.border,
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Group
                              </motion.button>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {currentGroup ? (
              <>
                {/* Group Overview Card - Indigo branded */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-4 sm:p-8 text-center transition-colors"
                  style={{
                    backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                    borderColor: '#C7D2FE',
                  }}
                >
                  {/* Editable Group Name */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {!editingGroupName ? (
                      <div className="flex items-center gap-3">
                        <h2
                          className="text-lg sm:text-2xl"
                          style={{ fontWeight: 800, color: '#4F46E5' }}
                        >
                          {displayGroupName}
                        </h2>
                        <button
                          onClick={() => {
                            setEditingGroupName(true);
                            setGroupNameInput(
                              currentGroup.customName ||
                                currentGroup.name
                            );
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                          style={{ backgroundColor: '#EEF2FF' }}
                        >
                          <Edit3
                            className="w-4 h-4"
                            style={{ color: '#6366F1' }}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full max-w-sm">
                        <input
                          type="text"
                          value={groupNameInput}
                          onChange={(e) =>
                            setGroupNameInput(e.target.value)
                          }
                          placeholder="Group name (e.g., Vacation Fund)"
                          className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors"
                          style={{
                            backgroundColor: theme.card,
                            color: theme.text,
                            border: `1px solid #6366F1`,
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveGroupName}
                          className="px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                          style={{
                            backgroundColor: '#6366F1',
                            color: '#fff',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingGroupName(false)}
                          className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                          style={{
                            backgroundColor: theme.border,
                            color: theme.text,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SVG Circle Progress */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative" style={{ width: 140, height: 140 }}>
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" fill="none" stroke="#C7D2FE" strokeWidth="10" />
                        <motion.circle
                          cx="70" cy="70" r="60" fill="none" stroke="#6366F1" strokeWidth="10"
                          strokeLinecap="round"
                          transform="rotate(-90 70 70)"
                          initial={{ strokeDasharray: '0 377' }}
                          animate={{ strokeDasharray: `${Math.min((currentGroup.current / currentGroup.target) * 377, 377)} 377` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#4F46E5', lineHeight: 1 }}>{fmt(currentGroup.current)}</div>
                        <div className="text-xs mt-1" style={{ color: '#6366F1' }}>saved</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1 mb-3">
                    <span className="text-sm" style={{ color: theme.textM }}>Target:</span>
                    <span style={{ fontWeight: 700, color: '#4F46E5', fontSize: 15 }}>{fmt(currentGroup.target)}</span>
                    <span className="text-sm" style={{ color: theme.textM }}>· {pct(currentGroup.current, currentGroup.target)}%</span>
                  </div>

                  {currentGroup.date && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm mb-4" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
                      <Calendar size={14} />
                      Trip Date: {new Date(currentGroup.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}>
                        {(() => {
                          const now = new Date();
                          const target = new Date(currentGroup.date + 'T00:00:00');
                          const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return diff > 0 ? `${diff} days away` : diff === 0 ? 'Today!' : `${Math.abs(diff)} days ago`;
                        })()}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div
                    className="w-full rounded-full overflow-hidden mb-4"
                    style={{ height: 6, backgroundColor: '#C7D2FE' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#6366F1' }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          (currentGroup.current /
                            currentGroup.target) *
                            100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>

                  {/* Invite Code */}
                  <div
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                  >
                    <span className="text-xs" style={{ color: theme.textS }}>Invite Code:</span>
                    <span style={{ fontWeight: 800, color: '#4F46E5', letterSpacing: '0.1em' }}>{currentGroup.code}</span>
                  </div>
                </motion.div>

                {/* Invite Link Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: tealBorder,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-2 rounded-2xl"
                      style={{ backgroundColor: tealLight }}
                    >
                      <Share2
                        className="w-5 h-5"
                        style={{ color: teal }}
                      />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-base sm:text-lg"
                        style={{ color: theme.text }}
                      >
                        Invite Friends
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: theme.textS }}
                      >
                        Share a link to join your circle
                      </p>
                    </div>
                  </div>

                  {/* Info about new vs existing users */}
                  <div
                    className="rounded-xl p-3 mb-4 text-xs"
                    style={{
                      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                      color: '#6366F1',
                    }}
                  >
                    <p>
                      <strong>New users:</strong> Will see a sign-up flow
                    </p>
                    <p>
                      <strong>Existing users:</strong>{' '}
                      Will be prompted to log in and auto-join
                    </p>
                  </div>

                  {/* Invite Link Display */}
                  <div
                    className="border rounded-2xl p-3 sm:p-4 mb-4 transition-colors"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: tealBorder,
                    }}
                  >
                    <p
                      className="text-xs mb-2 font-semibold uppercase tracking-wider"
                      style={{ color: theme.textS }}
                    >
                      Invite Link
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <div
                        className="flex-1 min-w-0 border rounded-2xl px-2 sm:px-4 py-2 sm:py-2.5 font-mono text-xs sm:text-sm truncate transition-colors"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: tealBorder,
                          color: teal,
                        }}
                      >
                        {inviteLink}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                        style={{
                          backgroundColor: copiedLink
                            ? theme.ok
                            : teal,
                          color: '#fff',
                        }}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3 sm:w-4 h-3 sm:h-4" />
                            <span className="hidden sm:inline">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 sm:w-4 h-3 sm:h-4" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Quick Share Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyCode}
                      className="py-2 sm:py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors font-medium hover:opacity-80 border"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: tealBorder,
                        color: theme.text,
                      }}
                    >
                      <Copy
                        className="w-3 sm:w-4 h-3 sm:h-4"
                        style={{ color: teal }}
                      />
                      <span className="truncate">Copy Code: {currentGroup.code}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowInviteModal(true)}
                      className="py-2 sm:py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors font-medium hover:opacity-80 border"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: tealBorder,
                        color: theme.text,
                      }}
                    >
                      <Link2
                        className="w-3 sm:w-4 h-3 sm:h-4"
                        style={{ color: teal }}
                      />
                      Share via...
                    </motion.button>
                  </div>

                  {/* Link Settings */}
                  <div
                    className="mt-4 pt-4 border-t"
                    style={{ borderColor: theme.border }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: theme.textM }}
                        >
                          Link expires in
                        </p>
                        <p className="text-xs" style={{ color: theme.textS }}>
                          Anyone with the link can join
                        </p>
                      </div>
                      <select
                        className="rounded-2xl px-3 py-2 text-sm focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: tealBorder,
                          color: theme.text,
                        }}
                      >
                        <option>7 days</option>
                        <option>24 hours</option>
                        <option>1 hour</option>
                        <option>Never</option>
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* Add Money Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: tealBorder,
                  }}
                >
                  <h3
                    className="font-bold text-base sm:text-lg mb-4"
                    style={{ color: theme.text }}
                  >
                    Add Money to Group
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="number"
                      placeholder="$0.00"
                      value={addMoneyAmount}
                      onChange={(e) =>
                        setAddMoneyAmount(e.target.value)
                      }
                      className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddMoney}
                      className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                      style={{
                        backgroundColor: teal,
                        color: '#fff',
                      }}
                    >
                      Add
                    </motion.button>
                  </div>
                </motion.div>

                {/* Members List */}
                <motion.div
                  variants={itemVariants}
                  className="space-y-2"
                >
                  <h3
                    className="font-bold text-base sm:text-lg"
                    style={{ color: theme.text }}
                  >
                    Members
                  </h3>
                  {currentGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border p-3 sm:p-4 flex items-center gap-3 transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: '#6366F1', color: '#fff', fontWeight: 700 }}>
                        {member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{member.name}</p>
                        <p className="text-xs" style={{ color: theme.textS }}>Contributed: {fmt(member.contrib)}</p>
                        {member.invitedBy && (
                          <p className="text-xs" style={{ color: theme.textM }}>Invited by {member.invitedBy}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p style={{ fontWeight: 800, color: '#6366F1', fontSize: 15 }}>{fmt(member.balance)}</p>
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                          style={{
                            backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                            color: '#6366F1',
                            fontWeight: 600,
                          }}
                        >
                          {member.role === 'coordinator' ? 'Coordinator' : 'Member'}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Activity Feed */}
                {currentGroup.activity &&
                  currentGroup.activity.length > 0 && (
                    <motion.div
                      variants={itemVariants}
                      className="space-y-2"
                    >
                      <h3
                        className="font-bold text-base sm:text-lg"
                        style={{ color: theme.text }}
                      >
                        Activity Feed
                      </h3>
                      {currentGroup.activity
                        .slice(0, 5)
                        .map((act) => (
                          <div
                            key={act.id}
                            className="rounded-2xl border p-3 sm:p-4 flex gap-2 sm:gap-3 transition-colors text-sm"
                            style={{
                              backgroundColor: theme.card,
                              borderColor: tealBorder,
                            }}
                          >
                            <MapPin
                              className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-1"
                              style={{ color: teal }}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs sm:text-sm"
                                style={{ color: theme.text }}
                              >
                                {act.msg}
                              </p>
                              <p
                                className="text-xs mt-1"
                                style={{ color: theme.textS }}
                              >
                                {act.date}
                              </p>
                            </div>
                          </div>
                        ))}
                    </motion.div>
                  )}
              </>
            ) : (
              <>
                {/* No Groups Empty State */}
                <motion.div
                  variants={itemVariants}
                  className="text-center py-10 sm:py-16 px-4 sm:px-6 rounded-2xl border-2 border-dashed transition-colors mb-6"
                  style={{
                    borderColor: tealBorder,
                  }}
                >
                  <Users
                    className="w-12 h-12 mx-auto mb-4"
                    style={{ color: theme.textS }}
                  />
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: theme.textM }}
                  >
                    No Groups Yet
                  </h3>
                  <p
                    className="text-sm mb-6"
                    style={{ color: theme.textS }}
                  >
                    Create a group to start saving together
                  </p>
                </motion.div>

                {/* Create Group Form */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: tealBorder,
                  }}
                >
                  <h3
                    className="font-bold text-base sm:text-lg mb-6"
                    style={{ color: theme.text }}
                  >
                    Create Your First Group
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label
                        className="block text-xs sm:text-sm font-medium mb-2"
                        style={{ color: theme.text }}
                      >
                        Group Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Vacation Fund"
                        value={newGroupName}
                        onChange={(e) =>
                          setNewGroupName(e.target.value)
                        }
                        className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs sm:text-sm font-medium mb-2"
                        style={{ color: theme.text }}
                      >
                        Goal Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Beach trip next summer"
                        value={newGroupGoal}
                        onChange={(e) =>
                          setNewGroupGoal(e.target.value)
                        }
                        className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-2"
                          style={{ color: theme.text }}
                        >
                          Target Amount
                        </label>
                        <input
                          type="number"
                          placeholder="$0.00"
                          value={newGroupTarget}
                          onChange={(e) =>
                            setNewGroupTarget(e.target.value)
                          }
                          className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                          style={{
                            backgroundColor: theme.bg,
                            borderColor: theme.border,
                            color: theme.text,
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-2"
                          style={{ color: theme.text }}
                        >
                          Target Date
                        </label>
                        <CalendarPicker
                          value={newGroupDate}
                          onChange={setNewGroupDate}
                          placeholder="Target Date"
                          theme={theme}
                          showQuickSelect={false}
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCreateGroup}
                      className="w-full font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow"
                      style={{
                        backgroundColor: teal,
                        color: '#fff',
                      }}
                    >
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5 inline mr-2" />
                      Create Group
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}

            {/* Create Another Group Button (when groups exist) */}
            {groups.length > 0 && (
              <motion.div
                variants={itemVariants}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateGroupForm(!showCreateGroupForm)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.bg,
                    border: `1px dashed ${isDark ? '#475569' : '#CBD5E1'}`,
                    color: '#6366F1',
                    fontWeight: 700,
                  }}
                >
                  <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                  {showCreateGroupForm
                    ? 'Cancel'
                    : 'Create Another Group'}
                </motion.button>

                {/* Create Group Form - Only show if explicitly opened */}
                <AnimatePresence>
                  {showCreateGroupForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="rounded-2xl border p-3 sm:p-6 transition-colors mt-4"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: tealBorder,
                      }}
                    >
                      <h3
                        className="font-bold text-base sm:text-lg mb-6"
                        style={{ color: theme.text }}
                      >
                        Create New Group
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label
                            className="block text-xs sm:text-sm font-medium mb-2"
                            style={{ color: theme.text }}
                          >
                            Group Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Home Renovation"
                            value={newGroupName}
                            onChange={(e) =>
                              setNewGroupName(e.target.value)
                            }
                            className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                            style={{
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
                        </div>

                        <div>
                          <label
                            className="block text-xs sm:text-sm font-medium mb-2"
                            style={{ color: theme.text }}
                          >
                            Goal Description
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Save for kitchen remodel"
                            value={newGroupGoal}
                            onChange={(e) =>
                              setNewGroupGoal(e.target.value)
                            }
                            className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                            style={{
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label
                              className="block text-xs sm:text-sm font-medium mb-2"
                              style={{ color: theme.text }}
                            >
                              Target Amount
                            </label>
                            <input
                              type="number"
                              placeholder="$0.00"
                              value={newGroupTarget}
                              onChange={(e) =>
                                setNewGroupTarget(e.target.value)
                              }
                              className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.text,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              className="block text-xs sm:text-sm font-medium mb-2"
                              style={{ color: theme.text }}
                            >
                              Target Date
                            </label>
                            <CalendarPicker
                              value={newGroupDate}
                              onChange={setNewGroupDate}
                              placeholder="Select target date"
                              theme={theme}
                              showQuickSelect={false}
                            />
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCreateGroup}
                          className="w-full font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow"
                          style={{
                            backgroundColor: teal,
                            color: '#fff',
                          }}
                        >
                          <Plus className="w-4 sm:w-5 h-4 sm:h-5 inline mr-2" />
                          Create Group
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* ROOMMATES TAB */}
        {activeTab === 'roommates' && (
          <>
            {/* Monthly Overview Card - Teal branded */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-8 text-center transition-colors"
              style={{
                backgroundColor: tealLight,
                borderColor: tealBorder,
              }}
            >
              <p
                className="text-xs sm:text-sm mb-2"
                style={{ color: theme.textM }}
              >
                Total Monthly Housing
              </p>
              <div
                className="text-2xl sm:text-5xl font-bold mb-4 sm:mb-6"
                style={{ color: teal }}
              >
                {fmt(totalMonthly)}
              </div>
              <div className="flex justify-center gap-2 sm:gap-8 mb-4 sm:mb-6">
                <div>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: theme.textS }}
                  >
                    Rent
                  </p>
                  <p
                    className="font-bold text-base sm:text-lg"
                    style={{ color: theme.text }}
                  >
                    {fmt(roommates.totalRent)}
                  </p>
                </div>
                <div
                  className="w-px"
                  style={{ backgroundColor: tealBorder }}
                />
                <div>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: theme.textS }}
                  >
                    Utilities
                  </p>
                  <p
                    className="font-bold text-base sm:text-lg"
                    style={{ color: theme.text }}
                  >
                    {fmt(totalUtilities)}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Toggle all members' paid status
                  const newPaidState = !allPaid;
                  persistRoommates({
                    ...roommates,
                    members: roommates.members.map((m) => ({
                      ...m,
                      paidRent: newPaidState,
                      paidUtilities: newPaidState,
                    })),
                  });
                }}
                className="mt-4 px-6 py-2.5 rounded-full text-sm transition-all hover:opacity-90"
                style={{
                  backgroundColor: allPaid ? '#10B981' : teal,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {allPaid ? '✓ All Paid This Month' : 'Mark All Paid This Month'}
              </motion.button>
            </motion.div>

            {/* Rent Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: tealBorder,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-base sm:text-lg"
                  style={{ color: theme.text }}
                >
                  Rent
                </h3>
                <button
                  onClick={() => {
                    setEditingRent(!editingRent);
                    setRentInput(String(roommates.totalRent));
                  }}
                  className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: teal }}
                >
                  {editingRent ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {!editingRent ? (
                <p
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ color: teal }}
                >
                  {fmt(roommates.totalRent)}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="number"
                    value={rentInput}
                    onChange={(e) => setRentInput(e.target.value)}
                    className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveRent}
                    className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                    style={{
                      backgroundColor: teal,
                      color: '#fff',
                    }}
                  >
                    Save
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditingRent(false)}
                    className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow"
                    style={{
                      backgroundColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    Cancel
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Shared Utilities Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: tealBorder,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-base sm:text-lg"
                  style={{ color: theme.text }}
                >
                  Shared Utilities
                </h3>
                <button
                  onClick={() => setAddingUtility(!addingUtility)}
                  className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{ color: teal }}
                >
                  <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                  {addingUtility ? 'Cancel' : 'Add'}
                </button>
              </div>

              <AnimatePresence>
                {addingUtility && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 sm:space-y-3 mb-6 pb-6 border-b transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    <input
                      type="text"
                      placeholder="Utility name"
                      value={utilityName}
                      onChange={(e) =>
                        setUtilityName(e.target.value)
                      }
                      className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={utilityAmount}
                        onChange={(e) =>
                          setUtilityAmount(e.target.value)
                        }
                        className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddUtility}
                        className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                        style={{
                          backgroundColor: teal,
                          color: '#fff',
                        }}
                      >
                        Add
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {roommates.utilities.map((utility) => (
                  <div
                    key={utility.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                  >
                    <span className="flex-1 text-sm" style={{ fontWeight: 600, color: theme.text }}>{utility.name}</span>
                    <span style={{ color: teal, fontWeight: 700 }}>{fmt(utility.amount)}</span>
                    <button
                      onClick={() => handleRemoveUtility(utility.id)}
                      className="p-1 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {roommates.utilities.length === 0 && !addingUtility && (
                  <p className="text-sm py-2" style={{ color: theme.textS }}>No utilities added yet.</p>
                )}
              </div>
            </motion.div>

            {/* Roommates Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: tealBorder,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-base sm:text-lg"
                  style={{ color: theme.text }}
                >
                  Roommates
                </h3>
                <button
                  onClick={() => setAddingMember(!addingMember)}
                  className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{ color: teal }}
                >
                  <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                  {addingMember ? 'Cancel' : 'Add'}
                </button>
              </div>

              <AnimatePresence>
                {addingMember && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 pb-6 border-b transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={memberName}
                      onChange={(e) =>
                        setMemberName(e.target.value)
                      }
                      className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddMember}
                      className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                      style={{
                        backgroundColor: teal,
                        color: '#fff',
                      }}
                    >
                      Add
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {roommates.members.map((member) => {
                  const rentShare = getMemberRentShare(member.share);
                  const utilsShare = getMemberUtilsShare(member.share);
                  const totalShare = rentShare + utilsShare;
                  const isPaid = member.paidRent && member.paidUtilities;

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl p-3 sm:p-4 transition-colors text-sm"
                      style={{
                        backgroundColor: theme.bg,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tealLight, color: teal, fontWeight: 700, fontSize: 14 }}>
                          {member.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{member.name}</p>
                          <p className="text-xs" style={{ color: theme.textS }}>
                            Share: {member.share}% · Owes {fmt(totalShare)}/mo
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleToggleRentPaid(member.id);
                            handleToggleUtilsPaid(member.id);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs transition-all flex-shrink-0"
                          style={{
                            backgroundColor: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F1F5F9'),
                            color: isPaid ? '#16A34A' : theme.textS,
                            fontWeight: 700,
                          }}
                        >
                          {isPaid ? '✓ Paid' : 'Unpaid'}
                        </button>
                      </div>

                      <div className="space-y-1 mb-3 text-xs" style={{ color: theme.textM }}>
                        <p>Rent: {fmt(rentShare)} · Utils: {fmt(utilsShare)}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleRentPaid(member.id)}
                          className="flex-1 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
                          style={{
                            backgroundColor: member.paidRent ? '#10B981' : theme.border,
                            color: member.paidRent ? '#fff' : theme.text,
                          }}
                        >
                          {member.paidRent ? '✓ Rent Paid' : 'Mark Rent Paid'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleUtilsPaid(member.id)}
                          className="flex-1 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
                          style={{
                            backgroundColor: member.paidUtilities ? '#10B981' : theme.border,
                            color: member.paidUtilities ? '#fff' : theme.text,
                          }}
                        >
                          {member.paidUtilities ? '✓ Utils Paid' : 'Mark Utils Paid'}
                        </motion.button>
                      </div>

                      {member.name !== 'You' && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={member.share}
                            onChange={(e) =>
                              handleToggleMemberShare(
                                member.id,
                                Math.min(100, Math.max(0, Number(e.target.value)))
                              )
                            }
                            className="flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                            style={{
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0"
                            style={{ color: '#EF4444' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
