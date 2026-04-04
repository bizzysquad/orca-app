'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  MapPin,
  X,
  Trash2,
  Copy,
  Check,
  Edit3,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plane,
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

interface TripItinerary {
  id: string;
  title: string;
  description?: string;
  date?: string;
  completed: boolean;
}

interface TripData {
  location: string;
  startDate: string;
  endDate: string;
  itinerary: TripItinerary[];
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

// Helper: Generate group code
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
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);

  // Per-group expand/minimize state — all expanded by default
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  // Per-group sub-tab state
  const [groupSubTabs, setGroupSubTabs] = useState<Record<string, 'savings' | 'tasks' | 'trip'>>({});

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('');
  const [newGroupDate, setNewGroupDate] = useState('');

  // Other state
  const [activeTab, setActiveTab] = useState<'group' | 'roommates'>('group');
  const [addMoneyAmounts, setAddMoneyAmounts] = useState<Record<string, string>>({});
  const [roommates, setRoommates] = useState<RoommateData>(initialRoommates);
  const [editingRent, setEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState(String(roommates.totalRent));
  const [addingUtility, setAddingUtility] = useState(false);
  const [utilityName, setUtilityName] = useState('');
  const [utilityAmount, setUtilityAmount] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberName, setMemberName] = useState('');

  // Roommates section expand/minimize
  const [roommateExpanded, setRoommateExpanded] = useState<Record<string, boolean>>({
    rent: true,
    utilities: true,
    roommates: true,
  });

  // Persist roommate changes to localStorage
  const persistRoommates = (updated: RoommateData) => {
    setRoommates(updated);
    try { setLocalSynced('orca-roommates', JSON.stringify(updated)); } catch {}
  };

  const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});
  const [editingGroupNames, setEditingGroupNames] = useState<Record<string, boolean>>({});
  const [groupNameInputs, setGroupNameInputs] = useState<Record<string, string>>({});

  // Per-group task/trip form state
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});
  const [tripLocations, setTripLocations] = useState<Record<string, string>>({});
  const [tripStartDates, setTripStartDates] = useState<Record<string, string>>({});
  const [tripEndDates, setTripEndDates] = useState<Record<string, string>>({});
  const [newItineraryTitles, setNewItineraryTitles] = useState<Record<string, string>>({});
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Load groups from localStorage on mount
  useEffect(() => {
    const savedGroups = localStorage.getItem('orca-stack-circle-groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        setGroups(parsed);
        // All groups start expanded
        if (parsed.length > 0) {
          setExpandedGroupIds(new Set(parsed.map((g: Group) => g.id)));
        }
      } catch (e) {
        setGroups([]);
      }
    }
  }, []);

  // Save groups to localStorage whenever they change
  useEffect(() => {
    setLocalSynced('orca-stack-circle-groups', JSON.stringify(groups));
  }, [groups]);

  // Calculations
  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaidRent = roommates.members.every((m) => m.paidRent);
  const allPaidUtils = roommates.members.every((m) => m.paidUtilities);
  const allPaid = allPaidRent && allPaidUtils;

  // Toggle group expand/minimize
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Set sub-tab for a specific group
  const setGroupSubTab = (groupId: string, tab: 'savings' | 'tasks' | 'trip') => {
    setGroupSubTabs(prev => ({ ...prev, [groupId]: tab }));
  };

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

      setGroups(prev => {
        const next = [...prev, newGroup];
        return next;
      });
      // Auto-expand new group
      setExpandedGroupIds(prev => new Set([...prev, newGroup.id]));

      // Reset form
      setNewGroupName('');
      setNewGroupGoal('');
      setNewGroupTarget('');
      setNewGroupDate('');
      setShowCreateGroupForm(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleCopyCode = (group: Group) => {
    if (group.code) {
      navigator.clipboard.writeText(group.code).catch(() => {});
      setCopiedCodes(prev => ({ ...prev, [group.id]: true }));
      setTimeout(() => setCopiedCodes(prev => ({ ...prev, [group.id]: false })), 2000);
    }
  };

  // Task handlers
  const handleAddTask = (groupId: string) => {
    const text = newTaskTexts[groupId] || '';
    if (!text.trim()) return;
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? {
            ...g,
            tasks: [...(g.tasks || []), { id: gid(), text: text.trim(), completed: false, createdAt: new Date().toLocaleDateString() }],
            activity: [{ id: gid(), user: 'You', msg: `Added task "${text.trim()}"`, date: new Date().toLocaleDateString() }, ...g.activity],
          }
        : g
    );
    setGroups(updatedGroups);
    setNewTaskTexts(prev => ({ ...prev, [groupId]: '' }));
  };

  const handleToggleTask = (groupId: string, taskId: string) => {
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? { ...g, tasks: (g.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : g
    );
    setGroups(updatedGroups);
  };

  const handleDeleteTask = (groupId: string, taskId: string) => {
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? { ...g, tasks: (g.tasks || []).filter(t => t.id !== taskId) }
        : g
    );
    setGroups(updatedGroups);
  };

  // Trip handlers
  const handleSaveTripDetails = (groupId: string) => {
    const g = groups.find(gr => gr.id === groupId);
    if (!g) return;
    const updatedGroups = groups.map(gr =>
      gr.id === groupId
        ? { ...gr, trip: { ...(gr.trip || { location: '', startDate: '', endDate: '', itinerary: [] }), location: tripLocations[groupId] || gr.trip?.location || '', startDate: tripStartDates[groupId] || gr.trip?.startDate || '', endDate: tripEndDates[groupId] || gr.trip?.endDate || '' } }
        : gr
    );
    setGroups(updatedGroups);
  };

  const handleAddItinerary = (groupId: string) => {
    const title = newItineraryTitles[groupId] || '';
    if (!title.trim()) return;
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? { ...g, trip: { ...(g.trip || { location: '', startDate: '', endDate: '', itinerary: [] }), itinerary: [...(g.trip?.itinerary || []), { id: gid(), title: title.trim(), completed: false }] } }
        : g
    );
    setGroups(updatedGroups);
    setNewItineraryTitles(prev => ({ ...prev, [groupId]: '' }));
  };

  const handleToggleItinerary = (groupId: string, itemId: string) => {
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? { ...g, trip: { ...(g.trip || { location: '', startDate: '', endDate: '', itinerary: [] }), itinerary: (g.trip?.itinerary || []).map(i => i.id === itemId ? { ...i, completed: !i.completed } : i) } }
        : g
    );
    setGroups(updatedGroups);
  };

  const handleDeleteItinerary = (groupId: string, itemId: string) => {
    const updatedGroups = groups.map(g =>
      g.id === groupId
        ? { ...g, trip: { ...(g.trip || { location: '', startDate: '', endDate: '', itinerary: [] }), itinerary: (g.trip?.itinerary || []).filter(i => i.id !== itemId) } }
        : g
    );
    setGroups(updatedGroups);
  };

  // Join group handler
  const handleJoinGroup = () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter an invite code');
      return;
    }
    const targetGroup = groups.find(g => g.code === joinCode.trim().toUpperCase());
    if (!targetGroup) {
      setJoinError('Invalid invite code. Please try again.');
      return;
    }
    if (targetGroup.members.some(m => m.name === 'You')) {
      setExpandedGroupIds(prev => new Set([...prev, targetGroup.id]));
      setJoinCode('');
      setJoinError('');
      return;
    }
    const updatedGroups = groups.map(g =>
      g.id === targetGroup.id
        ? {
            ...g,
            members: [...g.members, { id: gid(), name: 'You', role: 'member', target: g.target, contrib: 0, balance: 0, joinedAt: new Date().toLocaleDateString() }],
            activity: [{ id: gid(), user: 'You', msg: 'Joined the group via invite code', date: new Date().toLocaleDateString() }, ...g.activity],
          }
        : g
    );
    setGroups(updatedGroups);
    setExpandedGroupIds(prev => new Set([...prev, targetGroup.id]));
    setJoinCode('');
    setJoinError('');
  };

  const handleSaveGroupName = (groupId: string) => {
    const input = groupNameInputs[groupId] || '';
    if (input) {
      const updatedGroups = groups.map((g) =>
        g.id === groupId ? { ...g, customName: input } : g
      );
      setGroups(updatedGroups);
      setEditingGroupNames(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const handleAddMoney = (groupId: string) => {
    const amount = Number(addMoneyAmounts[groupId] || '');
    const group = groups.find(g => g.id === groupId);
    if (!isNaN(amount) && amount > 0 && group) {
      const newCurrent = group.current + amount;
      const updatedGroups = groups.map((g) =>
        g.id === groupId
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

  // Teal color scheme
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
      className="min-h-screen pb-32 overflow-x-hidden transition-colors w-full max-w-full"
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
              borderColor: activeTab === 'group' ? teal : 'transparent',
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
              borderColor: activeTab === 'roommates' ? teal : 'transparent',
              color: activeTab === 'roommates' ? teal : theme.textS,
            }}
          >
            Roommates
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* GROUP SAVINGS TAB */}
        {activeTab === 'group' && (
          <>
            {/* Join Group Card */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-5 transition-colors"
              style={{ backgroundColor: theme.card, borderColor: tealBorder }}
            >
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
                <input
                  type="text"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                  className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors font-mono tracking-widest"
                  style={{ backgroundColor: theme.bg, borderColor: joinError ? '#EF4444' : theme.border, color: theme.text }}
                  maxLength={6}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinGroup}
                  className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                  style={{ backgroundColor: teal, color: '#fff' }}
                >
                  Join Group
                </motion.button>
              </div>
              {joinError && <p className="text-xs mt-2 font-medium" style={{ color: '#EF4444' }}>{joinError}</p>}
            </motion.div>

            {/* Groups List */}
            {groups.length === 0 ? (
              <>
                {/* Empty State */}
                <motion.div
                  variants={itemVariants}
                  className="text-center py-10 sm:py-16 px-4 sm:px-6 rounded-2xl border-2 border-dashed transition-colors"
                  style={{ borderColor: tealBorder }}
                >
                  <Users className="w-12 h-12 mx-auto mb-4" style={{ color: theme.textS }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.textM }}>No Groups Yet</h3>
                  <p className="text-sm mb-6" style={{ color: theme.textS }}>Create a group to start saving together</p>
                </motion.div>

                {/* Create First Group Form */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                >
                  <h3 className="font-bold text-base sm:text-lg mb-6" style={{ color: theme.text }}>Create Your First Group</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Vacation Fund"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Goal Description</label>
                      <input
                        type="text"
                        placeholder="e.g., Beach trip next summer"
                        value={newGroupGoal}
                        onChange={(e) => setNewGroupGoal(e.target.value)}
                        className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Amount</label>
                        <input
                          type="number"
                          placeholder="$0.00"
                          value={newGroupTarget}
                          onChange={(e) => setNewGroupTarget(e.target.value)}
                          className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Date</label>
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
                      style={{ backgroundColor: teal, color: '#fff' }}
                    >
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5 inline mr-2" />
                      Create Group
                    </motion.button>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
                {/* Render each group as an expandable card */}
                {groups.map((group) => {
                  const isExpanded = expandedGroupIds.has(group.id);
                  const subTab = groupSubTabs[group.id] || 'savings';
                  const displayGroupName = group.customName || group.name;
                  const isCopied = copiedCodes[group.id] || false;
                  const isEditingName = editingGroupNames[group.id] || false;

                  return (
                    <motion.div key={group.id} variants={itemVariants} className="rounded-2xl border overflow-hidden transition-colors" style={{ backgroundColor: theme.card, borderColor: isDark ? '#312E81' : '#C7D2FE' }}>
                      {/* Group Header Row */}
                      <div className="flex items-center gap-3 p-4 sm:p-5">
                        <div className="p-2 rounded-2xl flex-shrink-0" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }}>
                          <Plane className="w-5 h-5" style={{ color: '#6366F1' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate" style={{ color: theme.text }}>{displayGroupName}</p>
                          <p className="text-xs" style={{ color: theme.textS }}>
                            {group.date ? new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'} · {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleGroupExpand(group.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{ backgroundColor: isDark ? '#1E1B4B' : '#FEF3C7', color: '#D97706' }}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isExpanded ? 'Minimize' : 'Expand'}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-2 rounded-xl transition-colors hover:opacity-80"
                            style={{ color: '#EF4444' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Expandable Group Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4" style={{ borderTop: `1px solid ${isDark ? '#312E81' : '#C7D2FE'}` }}>

                              {/* Compact Group Overview */}
                              <div className="rounded-xl p-3 sm:p-4 mt-4" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: '1px solid #C7D2FE' }}>
                                {/* Editable Name Row */}
                                <div className="flex items-center justify-between mb-3">
                                  {!isEditingName ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-bold text-sm truncate" style={{ color: '#4F46E5' }}>{displayGroupName}</span>
                                      <button
                                        onClick={() => {
                                          setEditingGroupNames(prev => ({ ...prev, [group.id]: true }));
                                          setGroupNameInputs(prev => ({ ...prev, [group.id]: group.customName || group.name }));
                                        }}
                                        className="p-1 rounded-lg flex-shrink-0"
                                        style={{ backgroundColor: '#EEF2FF' }}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" style={{ color: '#6366F1' }} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-1 mr-2">
                                      <input
                                        type="text"
                                        value={groupNameInputs[group.id] || ''}
                                        onChange={(e) => setGroupNameInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                                        className="flex-1 px-2 py-1 rounded-lg text-xs focus:outline-none"
                                        style={{ backgroundColor: theme.card, color: theme.text, border: `1px solid #6366F1` }}
                                        autoFocus
                                      />
                                      <button onClick={() => handleSaveGroupName(group.id)} className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#6366F1', color: '#fff' }}>Save</button>
                                      <button onClick={() => setEditingGroupNames(prev => ({ ...prev, [group.id]: false }))} className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: theme.border, color: theme.text }}>✕</button>
                                    </div>
                                  )}
                                  {/* Mini Group Code */}
                                  <button
                                    onClick={() => handleCopyCode(group)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
                                    style={{ backgroundColor: isCopied ? '#10B981' : '#6366F1', color: '#fff' }}
                                  >
                                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {isCopied ? 'Copied!' : group.code}
                                  </button>
                                </div>

                                {/* Progress Row */}
                                <div className="flex items-center gap-3">
                                  {/* Small circle */}
                                  <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                                    <svg width="64" height="64" viewBox="0 0 64 64">
                                      <circle cx="32" cy="32" r="26" fill="none" stroke="#C7D2FE" strokeWidth="6" />
                                      <motion.circle
                                        cx="32" cy="32" r="26" fill="none" stroke="#6366F1" strokeWidth="6"
                                        strokeLinecap="round"
                                        transform="rotate(-90 32 32)"
                                        initial={{ strokeDasharray: '0 163' }}
                                        animate={{ strokeDasharray: `${Math.min((group.current / group.target) * 163, 163)} 163` }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>{pct(group.current, group.target)}%</div>
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1 mb-1">
                                      <span style={{ fontSize: 18, fontWeight: 900, color: '#4F46E5' }}>{fmt(group.current)}</span>
                                      <span className="text-xs" style={{ color: '#6366F1', opacity: 0.7 }}>saved</span>
                                    </div>
                                    <div className="text-xs mb-2" style={{ color: theme.textM }}>
                                      Target: <span style={{ fontWeight: 700, color: '#4F46E5' }}>{fmt(group.target)}</span>
                                    </div>
                                    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: '#C7D2FE' }}>
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: '#6366F1' }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((group.current / group.target) * 100, 100)}%` }}
                                        transition={{ duration: 0.8 }}
                                      />
                                    </div>
                                    {group.date && (
                                      <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: '#6366F1' }}>
                                        <Calendar size={10} />
                                        {new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        <span className="px-1.5 py-0.5 rounded-full" style={{ background: '#6366F1', color: '#fff', fontWeight: 700, fontSize: 9 }}>
                                          {(() => {
                                            const now = new Date();
                                            const target = new Date(group.date + 'T00:00:00');
                                            const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            return diff > 0 ? `${diff}d away` : diff === 0 ? 'Today!' : `${Math.abs(diff)}d ago`;
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Sub-Tabs */}
                              <div className="flex gap-1.5 rounded-xl p-1" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: `1px solid #C7D2FE` }}>
                                {[
                                  { key: 'savings', label: 'Group Savings' },
                                  { key: 'tasks', label: 'Task List' },
                                  { key: 'trip', label: 'Group Trip' },
                                ].map(({ key, label }) => (
                                  <button
                                    key={key}
                                    onClick={() => setGroupSubTab(group.id, key as 'savings' | 'tasks' | 'trip')}
                                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                                    style={{
                                      backgroundColor: subTab === key ? '#6366F1' : 'transparent',
                                      color: subTab === key ? '#fff' : '#6366F1',
                                    }}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>

                              {/* ── SAVINGS SUB-TAB ── */}
                              {subTab === 'savings' && (
                                <div className="space-y-4">
                                  {/* Invite Members */}
                                  <div className="rounded-xl border p-3 sm:p-4 transition-colors" style={{ backgroundColor: theme.bg, borderColor: tealBorder }}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="p-1.5 rounded-xl" style={{ backgroundColor: tealLight }}>
                                        <UserPlus className="w-4 h-4" style={{ color: teal }} />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-sm" style={{ color: theme.text }}>Invite Members</h4>
                                        <p className="text-xs" style={{ color: theme.textS }}>Share your group code</p>
                                      </div>
                                    </div>
                                    <div className="rounded-xl p-3 text-center mb-3" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: '1px solid #C7D2FE' }}>
                                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6366F1', opacity: 0.7 }}>Group Code</p>
                                      <div className="text-2xl sm:text-3xl font-black tracking-[0.2em] mb-3" style={{ color: '#4F46E5' }}>{group.code}</div>
                                      <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleCopyCode(group)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                                        style={{ backgroundColor: isCopied ? '#10B981' : '#6366F1', color: '#fff' }}
                                      >
                                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {isCopied ? 'Code Copied!' : 'Copy Code'}
                                      </motion.button>
                                    </div>
                                    <div className="rounded-lg p-2.5 text-xs" style={{ backgroundColor: isDark ? '#164E63' : '#E0F9FC', color: teal }}>
                                      <strong>How it works:</strong> Share this code with friends. They open Stack Circle, tap Join Group, enter the code, and they're in instantly.
                                    </div>
                                  </div>

                                  {/* Add Money */}
                                  <div className="rounded-xl border p-3 sm:p-4 transition-colors" style={{ backgroundColor: theme.bg, borderColor: tealBorder }}>
                                    <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Add Money to Group</h4>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        placeholder="$0.00"
                                        value={addMoneyAmounts[group.id] || ''}
                                        onChange={(e) => setAddMoneyAmounts(prev => ({ ...prev, [group.id]: e.target.value }))}
                                        className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                        style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                      />
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAddMoney(group.id)}
                                        className="font-bold px-4 py-2 rounded-xl text-sm transition-shadow whitespace-nowrap"
                                        style={{ backgroundColor: teal, color: '#fff' }}
                                      >
                                        Add
                                      </motion.button>
                                    </div>
                                  </div>

                                  {/* Members */}
                                  <div>
                                    <h4 className="font-bold text-sm mb-2" style={{ color: theme.text }}>Members</h4>
                                    <div className="space-y-2">
                                      {group.members.map((member) => (
                                        <div
                                          key={member.id}
                                          className="rounded-xl border p-3 flex items-center gap-3 transition-colors"
                                          style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                                        >
                                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ backgroundColor: '#6366F1', color: '#fff', fontWeight: 700 }}>
                                            {member.name[0]}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p style={{ fontWeight: 700, color: theme.text, fontSize: 13 }}>{member.name}</p>
                                            <p className="text-xs" style={{ color: theme.textS }}>Contributed: {fmt(member.contrib)}</p>
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            <p style={{ fontWeight: 800, color: '#6366F1', fontSize: 14 }}>{fmt(member.balance)}</p>
                                            <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', color: '#6366F1', fontWeight: 600 }}>
                                              {member.role === 'coordinator' ? 'Coordinator' : 'Member'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Activity Feed */}
                                  {group.activity && group.activity.length > 0 && (
                                    <div>
                                      <h4 className="font-bold text-sm mb-2" style={{ color: theme.text }}>Activity Feed</h4>
                                      <div className="space-y-2">
                                        {group.activity.slice(0, 5).map((act) => (
                                          <div
                                            key={act.id}
                                            className="rounded-xl border p-3 flex gap-2 transition-colors text-sm"
                                            style={{ backgroundColor: theme.bg, borderColor: tealBorder }}
                                          >
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

                              {/* ── TASKS SUB-TAB ── */}
                              {subTab === 'tasks' && (
                                <div className="rounded-xl border p-3 sm:p-4 transition-colors" style={{ backgroundColor: theme.bg, borderColor: '#C7D2FE' }}>
                                  <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Trip Checklist</h4>
                                  <div className="flex gap-2 mb-3">
                                    <input
                                      type="text"
                                      placeholder="Add a new task..."
                                      value={newTaskTexts[group.id] || ''}
                                      onChange={(e) => setNewTaskTexts(prev => ({ ...prev, [group.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(group.id)}
                                      className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                      style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleAddTask(group.id)}
                                      className="font-bold px-4 py-2 rounded-xl text-sm transition-shadow whitespace-nowrap"
                                      style={{ backgroundColor: '#6366F1', color: '#fff' }}
                                    >
                                      <Plus className="w-4 h-4 inline mr-1" />Add
                                    </motion.button>
                                  </div>
                                  <div className="space-y-2">
                                    {(group.tasks || []).length === 0 ? (
                                      <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No tasks yet. Add one above!</p>
                                    ) : (
                                      (group.tasks || []).map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors" style={{ backgroundColor: theme.card, borderColor: theme.border, opacity: task.completed ? 0.6 : 1 }}>
                                          <button onClick={() => handleToggleTask(group.id, task.id)} className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors" style={{ borderColor: task.completed ? '#10B981' : theme.border, backgroundColor: task.completed ? '#10B981' : 'transparent' }}>
                                            {task.completed && <Check className="w-3 h-3 text-white" />}
                                          </button>
                                          <span className="flex-1 text-sm" style={{ color: theme.text, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                                          <button onClick={() => handleDeleteTask(group.id, task.id)} className="p-1 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0" style={{ color: '#EF4444' }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* ── TRIP SUB-TAB ── */}
                              {subTab === 'trip' && (
                                <div className="space-y-4">
                                  {/* Show existing trip info if saved */}
                                  {group.trip && (group.trip.location || group.trip.startDate) && (
                                    <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: '1px solid #C7D2FE' }}>
                                      <p className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: '#6366F1', opacity: 0.7 }}>Current Trip</p>
                                      {group.trip.location && <p className="font-semibold" style={{ color: '#4F46E5' }}>📍 {group.trip.location}</p>}
                                      {group.trip.startDate && <p className="text-xs mt-1" style={{ color: '#6366F1' }}>
                                        {new Date(group.trip.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {group.trip.endDate && ` → ${new Date(group.trip.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                      </p>}
                                    </div>
                                  )}

                                  {/* Trip Details Form */}
                                  <div className="rounded-xl border p-3 sm:p-4 transition-colors" style={{ backgroundColor: theme.bg, borderColor: '#C7D2FE' }}>
                                    <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Trip Details</h4>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-xs font-medium mb-1" style={{ color: theme.textM }}>Location</label>
                                        <input
                                          type="text"
                                          placeholder="Where are you going?"
                                          value={tripLocations[group.id] ?? (group.trip?.location || '')}
                                          onChange={(e) => setTripLocations(prev => ({ ...prev, [group.id]: e.target.value }))}
                                          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                          style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textM }}>Start Date</label>
                                          <input
                                            type="date"
                                            value={tripStartDates[group.id] ?? (group.trip?.startDate || '')}
                                            onChange={(e) => setTripStartDates(prev => ({ ...prev, [group.id]: e.target.value }))}
                                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                            style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textM }}>End Date</label>
                                          <input
                                            type="date"
                                            value={tripEndDates[group.id] ?? (group.trip?.endDate || '')}
                                            onChange={(e) => setTripEndDates(prev => ({ ...prev, [group.id]: e.target.value }))}
                                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                            style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                          />
                                        </div>
                                      </div>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSaveTripDetails(group.id)}
                                        className="w-full font-bold px-4 py-2 rounded-xl text-sm transition-shadow"
                                        style={{ backgroundColor: '#6366F1', color: '#fff' }}
                                      >
                                        Save Trip Details
                                      </motion.button>
                                    </div>
                                  </div>

                                  {/* Itinerary */}
                                  <div className="rounded-xl border p-3 sm:p-4 transition-colors" style={{ backgroundColor: theme.bg, borderColor: '#C7D2FE' }}>
                                    <h4 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Itinerary</h4>
                                    <div className="flex gap-2 mb-3">
                                      <input
                                        type="text"
                                        placeholder="Add itinerary item..."
                                        value={newItineraryTitles[group.id] || ''}
                                        onChange={(e) => setNewItineraryTitles(prev => ({ ...prev, [group.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItinerary(group.id)}
                                        className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                                        style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
                                      />
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAddItinerary(group.id)}
                                        className="font-bold px-4 py-2 rounded-xl text-sm transition-shadow whitespace-nowrap"
                                        style={{ backgroundColor: '#6366F1', color: '#fff' }}
                                      >
                                        <Plus className="w-4 h-4 inline mr-1" />Add
                                      </motion.button>
                                    </div>
                                    <div className="space-y-2">
                                      {(group.trip?.itinerary || []).length === 0 ? (
                                        <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No itinerary items yet.</p>
                                      ) : (
                                        (group.trip?.itinerary || []).map(item => (
                                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors" style={{ backgroundColor: theme.card, borderColor: theme.border, opacity: item.completed ? 0.6 : 1 }}>
                                            <button onClick={() => handleToggleItinerary(group.id, item.id)} className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors" style={{ borderColor: item.completed ? '#10B981' : theme.border, backgroundColor: item.completed ? '#10B981' : 'transparent' }}>
                                              {item.completed && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                            <span className="flex-1 text-sm" style={{ color: theme.text, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                                            <button onClick={() => handleDeleteItinerary(group.id, item.id)} className="p-1 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0" style={{ color: '#EF4444' }}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Create Another Group Button */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateGroupForm(!showCreateGroupForm)}
                    className="w-full px-4 sm:px-6 py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: theme.bg,
                      border: `1px dashed ${isDark ? '#475569' : '#CBD5E1'}`,
                      color: '#6366F1',
                      fontWeight: 700,
                    }}
                  >
                    <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                    {showCreateGroupForm ? 'Cancel' : 'Create Another Group'}
                  </motion.button>

                  <AnimatePresence>
                    {showCreateGroupForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="rounded-2xl border p-3 sm:p-6 transition-colors mt-4 overflow-hidden"
                        style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                      >
                        <h3 className="font-bold text-base sm:text-lg mb-6" style={{ color: theme.text }}>Create New Group</h3>
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Group Name</label>
                            <input
                              type="text"
                              placeholder="e.g., Home Renovation"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Goal Description</label>
                            <input
                              type="text"
                              placeholder="e.g., Save for kitchen remodel"
                              value={newGroupGoal}
                              onChange={(e) => setNewGroupGoal(e.target.value)}
                              className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Amount</label>
                              <input
                                type="number"
                                placeholder="$0.00"
                                value={newGroupTarget}
                                onChange={(e) => setNewGroupTarget(e.target.value)}
                                className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: theme.text }}>Target Date</label>
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
                            style={{ backgroundColor: teal, color: '#fff' }}
                          >
                            <Plus className="w-4 sm:w-5 h-4 sm:h-5 inline mr-2" />
                            Create Group
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </>
            )}
          </>
        )}

        {/* ROOMMATES TAB */}
        {activeTab === 'roommates' && (
          <>
            {/* Monthly Overview Card */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-3 sm:p-8 text-center transition-colors"
              style={{ backgroundColor: tealLight, borderColor: tealBorder }}
            >
              <p className="text-xs sm:text-sm mb-2" style={{ color: theme.textM }}>Total Monthly Housing</p>
              <div className="text-2xl sm:text-5xl font-bold mb-4 sm:mb-6" style={{ color: teal }}>{fmt(totalMonthly)}</div>
              <div className="flex justify-center gap-2 sm:gap-8 mb-4 sm:mb-6">
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const newPaidState = !allPaid;
                  persistRoommates({
                    ...roommates,
                    members: roommates.members.map((m) => ({ ...m, paidRent: newPaidState, paidUtilities: newPaidState })),
                  });
                }}
                className="mt-4 px-6 py-2.5 rounded-full text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: allPaid ? '#10B981' : teal, color: '#fff', fontWeight: 700 }}
              >
                {allPaid ? '✓ All Paid This Month' : 'Mark All Paid This Month'}
              </motion.button>
            </motion.div>

            {/* Rent Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border transition-colors"
              style={{ backgroundColor: theme.card, borderColor: tealBorder }}
            >
              {/* Rent Header with expand/minimize */}
              <div
                className="flex items-center justify-between p-3 sm:p-5 cursor-pointer"
                onClick={() => setRoommateExpanded(prev => ({ ...prev, rent: !prev.rent }))}
              >
                <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Rent</h3>
                <div className="flex items-center gap-3">
                  <span className="font-bold" style={{ color: teal }}>{fmt(roommates.totalRent)}</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); setRoommateExpanded(prev => ({ ...prev, rent: !prev.rent })); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: isDark ? '#164E63' : '#E0F9FC', color: teal }}
                  >
                    {roommateExpanded.rent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {roommateExpanded.rent ? 'Minimize' : 'Expand'}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {roommateExpanded.rent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-5 pb-4 sm:pb-6" style={{ borderTop: `1px solid ${tealBorder}` }}>
                      <div className="flex items-center justify-end pt-3 mb-3">
                        <button
                          onClick={() => { setEditingRent(!editingRent); setRentInput(String(roommates.totalRent)); }}
                          className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity"
                          style={{ color: teal }}
                        >
                          {editingRent ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                      {!editingRent ? (
                        <p className="text-2xl sm:text-3xl font-bold" style={{ color: teal }}>{fmt(roommates.totalRent)}</p>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <input
                            type="number"
                            value={rentInput}
                            onChange={(e) => setRentInput(e.target.value)}
                            className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveRent}
                            className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                            style={{ backgroundColor: teal, color: '#fff' }}
                          >
                            Save
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEditingRent(false)}
                            className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow"
                            style={{ backgroundColor: theme.border, color: theme.text }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Shared Utilities Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border transition-colors"
              style={{ backgroundColor: theme.card, borderColor: tealBorder }}
            >
              {/* Utilities Header with expand/minimize */}
              <div className="flex items-center justify-between p-3 sm:p-5">
                <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Shared Utilities</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddingUtility(!addingUtility)}
                    className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                    style={{ color: teal }}
                  >
                    <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                    {addingUtility ? 'Cancel' : 'Add'}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRoommateExpanded(prev => ({ ...prev, utilities: !prev.utilities }))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: isDark ? '#164E63' : '#E0F9FC', color: teal }}
                  >
                    {roommateExpanded.utilities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {roommateExpanded.utilities ? 'Minimize' : 'Expand'}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {roommateExpanded.utilities && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-5 pb-4 sm:pb-6" style={{ borderTop: `1px solid ${tealBorder}` }}>
                      <AnimatePresence>
                        {addingUtility && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 sm:space-y-3 mt-4 mb-4 pb-4 border-b transition-colors"
                            style={{ borderColor: theme.border }}
                          >
                            <input
                              type="text"
                              placeholder="Utility name"
                              value={utilityName}
                              onChange={(e) => setUtilityName(e.target.value)}
                              className="w-full border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <input
                                type="number"
                                placeholder="$0.00"
                                value={utilityAmount}
                                onChange={(e) => setUtilityAmount(e.target.value)}
                                className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                                style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                              />
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAddUtility}
                                className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                                style={{ backgroundColor: teal, color: '#fff' }}
                              >
                                Add
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-1 mt-2">
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
                          <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No utilities added yet.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Roommates Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border transition-colors"
              style={{ backgroundColor: theme.card, borderColor: tealBorder }}
            >
              {/* Roommates Header with expand/minimize */}
              <div className="flex items-center justify-between p-3 sm:p-5">
                <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Roommates</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddingMember(!addingMember)}
                    className="text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                    style={{ color: teal }}
                  >
                    <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                    {addingMember ? 'Cancel' : 'Add'}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRoommateExpanded(prev => ({ ...prev, roommates: !prev.roommates }))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: isDark ? '#164E63' : '#E0F9FC', color: teal }}
                  >
                    {roommateExpanded.roommates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {roommateExpanded.roommates ? 'Minimize' : 'Expand'}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {roommateExpanded.roommates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 sm:px-5 pb-4 sm:pb-6" style={{ borderTop: `1px solid ${tealBorder}` }}>
                      <AnimatePresence>
                        {addingMember && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 mb-4 pb-4 border-b transition-colors"
                            style={{ borderColor: theme.border }}
                          >
                            <input
                              type="text"
                              placeholder="Name"
                              value={memberName}
                              onChange={(e) => setMemberName(e.target.value)}
                              className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                            />
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleAddMember}
                              className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                              style={{ backgroundColor: teal, color: '#fff' }}
                            >
                              Add
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-3 mt-2">
                        {roommates.members.map((member) => {
                          const rentShare = getMemberRentShare(member.share);
                          const utilsShare = getMemberUtilsShare(member.share);
                          const totalShare = rentShare + utilsShare;
                          const isPaid = member.paidRent && member.paidUtilities;

                          return (
                            <div
                              key={member.id}
                              className="rounded-xl p-3 sm:p-4 transition-colors text-sm"
                              style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tealLight, color: teal, fontWeight: 700, fontSize: 14 }}>
                                  {member.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{member.name}</p>
                                  <p className="text-xs" style={{ color: theme.textS }}>Share: {member.share}% · Owes {fmt(totalShare)}/mo</p>
                                </div>
                                <button
                                  onClick={() => { handleToggleRentPaid(member.id); handleToggleUtilsPaid(member.id); }}
                                  className="px-3 py-1.5 rounded-full text-xs transition-all flex-shrink-0"
                                  style={{ backgroundColor: isPaid ? '#DCFCE7' : (isDark ? '#334155' : '#F1F5F9'), color: isPaid ? '#16A34A' : theme.textS, fontWeight: 700 }}
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
                                  style={{ backgroundColor: member.paidRent ? '#10B981' : theme.border, color: member.paidRent ? '#fff' : theme.text }}
                                >
                                  {member.paidRent ? '✓ Rent Paid' : 'Mark Rent Paid'}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleToggleUtilsPaid(member.id)}
                                  className="flex-1 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
                                  style={{ backgroundColor: member.paidUtilities ? '#10B981' : theme.border, color: member.paidUtilities ? '#fff' : theme.text }}
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
                                    onChange={(e) => handleToggleMemberShare(member.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                                    style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}
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
                        {roommates.members.length === 0 && !addingMember && (
                          <p className="text-sm py-3 text-center" style={{ color: theme.textS }}>No roommates added yet.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
