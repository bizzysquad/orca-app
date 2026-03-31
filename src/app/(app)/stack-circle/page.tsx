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
  Calendar,
  Plane,
  Hotel,
  ListChecks,
  Tag,
  Circle,
  CheckCircle2,
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

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: string; // 'packing' | 'documents' | 'expenses' | 'other'
}

interface TripDetails {
  duration: number;       // number of days
  startDate: string;
  endDate: string;
  flight?: string;
  hotel?: string;
  packingList: ChecklistItem[];
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
  entryType?: 'savings' | 'vacation';  // default is 'savings'
  purpose?: string;                     // what they're saving for
  trip?: TripDetails;                   // vacation details
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
  const { theme, isDark, currentTheme } = useTheme();
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (id: string) => setCollapsedGroups(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGoal, setNewGroupGoal] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('');
  const [newGroupDate, setNewGroupDate] = useState('');
  const [newEntryType, setNewEntryType] = useState<'savings' | 'vacation'>('savings');
  const [newPurpose, setNewPurpose] = useState('');
  // Vacation-specific fields
  const [newTripDuration, setNewTripDuration] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripFlight, setNewTripFlight] = useState('');
  const [newTripHotel, setNewTripHotel] = useState('');
  const [newPackingItem, setNewPackingItem] = useState('');
  const [newPackingList, setNewPackingList] = useState<ChecklistItem[]>([]);
  const [newPackingCategory, setNewPackingCategory] = useState<string>('packing');

  // Auto-calculate trip duration when start/end dates change
  useEffect(() => {
    if (newTripStart && newTripEnd) {
      const start = new Date(newTripStart);
      const end = new Date(newTripEnd);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setNewTripDuration(String(diffDays));
      }
    }
  }, [newTripStart, newTripEnd]);

  // Other state
  const [activeTab, setActiveTab] = useState<'trip' | 'savings' | 'roommates'>('trip');
  const [tripViewMode, setTripViewMode] = useState<'list' | 'compact'>('list');
  const [savingsViewMode, setSavingsViewMode] = useState<'list' | 'compact'>('list');
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

  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  // Trip details editing state
  const [editingTrip, setEditingTrip] = useState(false);
  const [editTripStart, setEditTripStart] = useState('');
  const [editTripEnd, setEditTripEnd] = useState('');
  const [editTripFlight, setEditTripFlight] = useState('');
  const [editTripHotel, setEditTripHotel] = useState('');

  // Trip checklist management
  const [tripChecklistItems, setTripChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState('packing');
  const [checklistFilter, setChecklistFilter] = useState<string>('All');

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
      // Load trip checklist if it's a vacation
      if (currentGroup.entryType === 'vacation' && currentGroup.trip?.packingList) {
        setTripChecklistItems(currentGroup.trip.packingList);
      } else {
        setTripChecklistItems([]);
      }
      setChecklistFilter('All');
    }
  }, [currentGroup]);

  // Calculations
  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaidRent = roommates.members.every((m) => m.paidRent);
  const allPaidUtils = roommates.members.every((m) => m.paidUtilities);
  const allPaid = allPaidRent && allPaidUtils;


  // Handlers for groups
  const handleCreateGroup = () => {
    // For trips: only name is required. For savings: name + goal + target required.
    const isVacation = newEntryType === 'vacation';
    const savingsValid = newGroupName && newGroupGoal && newGroupTarget && !isNaN(Number(newGroupTarget));
    const tripValid = newGroupName.trim().length > 0;
    if (isVacation ? tripValid : savingsValid) {
      const tripDetails: TripDetails | undefined = isVacation ? {
        duration: parseInt(newTripDuration) || 0,
        startDate: newTripStart,
        endDate: newTripEnd,
        flight: newTripFlight || undefined,
        hotel: newTripHotel || undefined,
        packingList: newPackingList,
      } : undefined;

      const newGroup: Group = {
        id: gid(),
        name: newGroupName.trim(),
        goal: newGroupGoal || newGroupName.trim(),
        target: Number(newGroupTarget) || 0,
        current: 0,
        date: newGroupDate || new Date().toLocaleDateString(),
        code: generateInviteCode(),
        entryType: newEntryType,
        purpose: newPurpose || undefined,
        trip: tripDetails,
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
            msg: `Created ${newEntryType === 'vacation' ? 'trip' : 'savings goal'} "${newGroupName}"`,
            date: new Date().toLocaleDateString(),
          },
        ],
      };

      setGroups([...groups, newGroup]);
      setCurrentGroupId(newGroup.id);

      // If vacation, sync to Task List as a checklist and block calendar dates
      if (newEntryType === 'vacation' && newTripStart && newTripEnd) {
        try {
          // Create tasks from packing list
          const existingTasks = JSON.parse(localStorage.getItem('orca-tasks') || '[]');
          const vacationTasks = newPackingList.map(item => ({
            id: gid(),
            text: `[${newGroupName}] ${item.text}`,
            completed: false,
            category: 'todo',
            priority: 'medium',
            dueDate: newTripStart,
            createdAt: new Date().toISOString(),
            starred: false,
          }));
          // Add a trip prep task
          vacationTasks.unshift({
            id: gid(),
            text: `Prepare for trip: ${newGroupName}`,
            completed: false,
            category: 'todo',
            priority: 'high',
            dueDate: newTripStart,
            createdAt: new Date().toISOString(),
            starred: true,
          });
          const updatedTasks = [...existingTasks, ...vacationTasks];
          setLocalSynced('orca-tasks', JSON.stringify(updatedTasks));
          window.dispatchEvent(new CustomEvent('orca-tasks-updated'));
        } catch {}
      }

      // Reset form
      setNewGroupName('');
      setNewGroupGoal('');
      setNewGroupTarget('');
      setNewGroupDate('');
      // Keep newEntryType as-is so next creation defaults to same tab type
      setNewPurpose('');
      setNewTripDuration('');
      setNewTripStart('');
      setNewTripEnd('');
      setNewTripFlight('');
      setNewTripHotel('');
      setNewPackingItem('');
      setNewPackingList([]);
      setNewPackingCategory('packing');
      setShowCreateGroupForm(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    const groupToDelete = groups.find(g => g.id === groupId);
    const updatedGroups = groups.filter((g) => g.id !== groupId);
    setGroups(updatedGroups);

    // If deleted current group, switch to another
    if (currentGroupId === groupId) {
      setCurrentGroupId(updatedGroups.length > 0 ? updatedGroups[0].id : null);
    }

    // Auto-delete related Task List tasks if it was a vacation group
    if (groupToDelete?.entryType === 'vacation') {
      try {
        const existingTasks = JSON.parse(localStorage.getItem('orca-tasks') || '[]');
        const tripName = groupToDelete.customName || groupToDelete.name;
        // Remove tasks that were created for this trip (tagged with group name)
        const filteredTasks = existingTasks.filter((task: any) =>
          !task.text.startsWith(`[${tripName}]`) && task.text !== `Prepare for trip: ${tripName}`
        );
        setLocalSynced('orca-tasks', JSON.stringify(filteredTasks));
        window.dispatchEvent(new CustomEvent('orca-tasks-updated'));
      } catch {}
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setCurrentGroupId(groupId);
    setShowGroupSelector(false);
  };

  const handleCopyCode = () => {
    if (currentGroup?.code) {
      const code = currentGroup.code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
        }).catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = code;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
        });
      }
    }
  };

  const handleJoinGroup = () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a group code');
      return;
    }
    const target = groups.find(g => g.code === joinCode.trim().toUpperCase());
    if (!target) {
      setJoinError('Invalid code. Please check and try again.');
      return;
    }
    if (!target.members.some(m => m.name === 'You')) {
      const updated = groups.map(g =>
        g.id === target.id
          ? {
              ...g,
              members: [...g.members, { id: gid(), name: 'You', role: 'member', target: g.target, contrib: 0, balance: 0, joinedAt: new Date().toLocaleDateString() }],
              activity: [{ id: gid(), user: 'You', msg: 'Joined the group via group code', date: new Date().toLocaleDateString() }, ...g.activity],
            }
          : g
      );
      setGroups(updated);
    }
    setCurrentGroupId(target.id);
    setJoinCode('');
    setJoinError('');
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

  const handleSaveTripEdit = () => {
    if (!currentGroup || !currentGroup.trip) return;
    const start = new Date(editTripStart);
    const end = new Date(editTripEnd);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const updatedGroups = groups.map(g =>
      g.id === currentGroup.id ? {
        ...g,
        trip: {
          ...g.trip!,
          startDate: editTripStart,
          endDate: editTripEnd,
          duration: duration > 0 ? duration : g.trip!.duration,
          flight: editTripFlight || undefined,
          hotel: editTripHotel || undefined,
        }
      } : g
    );
    setGroups(updatedGroups);
    setEditingTrip(false);
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

  // Trip checklist handlers
  const handleAddChecklistItem = () => {
    if (newChecklistText.trim() && currentGroup) {
      const newItem: ChecklistItem = {
        id: gid(),
        text: newChecklistText.trim(),
        completed: false,
        category: newChecklistCategory,
      };
      const updatedItems = [...tripChecklistItems, newItem];
      setTripChecklistItems(updatedItems);
      setNewChecklistText('');

      // Update group data
      const updatedGroups = groups.map((g) =>
        g.id === currentGroup.id
          ? {
              ...g,
              trip: g.trip ? { ...g.trip, packingList: updatedItems } : undefined,
            }
          : g
      );
      setGroups(updatedGroups);
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const updatedItems = tripChecklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setTripChecklistItems(updatedItems);

    if (currentGroup) {
      const updatedGroups = groups.map((g) =>
        g.id === currentGroup.id
          ? {
              ...g,
              trip: g.trip ? { ...g.trip, packingList: updatedItems } : undefined,
            }
          : g
      );
      setGroups(updatedGroups);
    }
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const updatedItems = tripChecklistItems.filter((item) => item.id !== itemId);
    setTripChecklistItems(updatedItems);

    if (currentGroup) {
      const updatedGroups = groups.map((g) =>
        g.id === currentGroup.id
          ? {
              ...g,
              trip: g.trip ? { ...g.trip, packingList: updatedItems } : undefined,
            }
          : g
      );
      setGroups(updatedGroups);
    }
  };

  // Theme-aware accent colors
  const teal = currentTheme.primary;
  const tealLight = isDark ? `${currentTheme.primary}20` : `${currentTheme.primary}12`;
  const tealBorder = isDark ? `${currentTheme.primary}50` : `${currentTheme.primary}30`;

  if (loading) {
    return (
      <div className="w-full min-h-full flex items-center justify-center">
        <div style={{ color: theme.textS }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full pb-32 overflow-x-hidden transition-colors max-w-full">
      {/* Header */}
      <motion.div
        className="border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-colors"
        style={{ borderColor: theme.border }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: tealLight }}>
            <Users className="w-5 h-5" style={{ color: teal }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>
            Stack Circle
          </h1>
        </div>
        <div className="max-w-5xl mx-auto">
          <p className="text-sm mt-0.5" style={{ color: theme.textM }}>
            Save together, achieve more
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div
        className="border-b px-4 sm:px-6 lg:px-8 transition-colors"
        style={{ borderColor: theme.border }}
      >
        <div className="max-w-5xl mx-auto flex gap-4 sm:gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('trip')}
            className={`py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'trip' ? 'border-b-2' : 'border-transparent'
            }`}
            style={{
              borderColor: activeTab === 'trip' ? teal : 'transparent',
              color: activeTab === 'trip' ? teal : theme.textS,
            }}
          >
            Group Trip
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'savings' ? 'border-b-2' : 'border-transparent'
            }`}
            style={{
              borderColor: activeTab === 'savings' ? teal : 'transparent',
              color: activeTab === 'savings' ? teal : theme.textS,
            }}
          >
            Group Savings
          </button>
          <button
            onClick={() => setActiveTab('roommates')}
            className={`py-2 sm:py-3 px-0 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
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
        className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* TRIP TAB */}
        {activeTab === 'trip' && (
          <>
            {/* Join a Group */}
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
                  <p className="text-xs" style={{ color: theme.textS }}>Enter a group code to join an existing trip</p>
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
                  Join
                </motion.button>
              </div>
              {joinError && <p className="text-xs mt-2 font-medium" style={{ color: '#EF4444' }}>{joinError}</p>}
            </motion.div>

            {/* Create Group Trip Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowCreateGroupForm(!showCreateGroupForm); setNewEntryType('vacation'); }}
                className="w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.bg,
                  border: `1px dashed ${isDark ? '#475569' : '#CBD5E1'}`,
                  color: teal,
                  fontWeight: 700,
                }}
              >
                <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                {showCreateGroupForm ? 'Cancel' : 'Create Group Trip'}
              </motion.button>

              <AnimatePresence>
                {showCreateGroupForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rounded-2xl border p-4 sm:p-5 transition-colors mt-4"
                    style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                  >
                    <h3 className="font-bold text-base mb-4" style={{ color: theme.text }}>New Group Trip</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Trip Name</label>
                        <input type="text" placeholder="e.g., Hawaii 2026"
                          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full border rounded-2xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Budget (optional)</label>
                          <input type="number" placeholder="$0.00" value={newGroupTarget} onChange={(e) => setNewGroupTarget(e.target.value)}
                            className="w-full border rounded-2xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Target Date (optional)</label>
                          <CalendarPicker value={newGroupDate} onChange={setNewGroupDate} placeholder="Select date" theme={theme} showQuickSelect={false} />
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: theme.textS }}>Trip details (departure, hotel, packing list, etc.) can be added after creation.</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setNewEntryType('vacation'); handleCreateGroup(); }}
                        className="w-full font-bold px-4 py-2.5 rounded-2xl text-sm transition-shadow"
                        style={{ backgroundColor: teal, color: '#fff' }}
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Create Trip
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Trip Groups List */}
            {(() => {
              const tripGroups = groups.filter(g => g.entryType === 'vacation');
              if (tripGroups.length === 0) {
                return (
                  <motion.div variants={itemVariants} className="text-center py-12">
                    <p className="font-bold text-base mb-1" style={{ color: theme.text }}>No group trips yet</p>
                    <p className="text-sm" style={{ color: theme.textM }}>Create or join a group trip to get started.</p>
                  </motion.div>
                );
              }
              return tripGroups.map(group => {
                const isCollapsed = collapsedGroups.has(group.id);
                return (
                <motion.div key={group.id} variants={itemVariants}
                  className="rounded-2xl border transition-all p-4 sm:p-5"
                  style={{ backgroundColor: currentGroupId === group.id ? `${teal}10` : theme.card, borderColor: currentGroupId === group.id ? teal : theme.border }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: tealLight }}>
                        <Plane className="w-4 h-4" style={{ color: teal }} />
                      </div>
                      <div>
                        <button
                          className="font-bold text-sm text-left hover:opacity-75 transition-opacity"
                          style={{ color: theme.text }}
                          onClick={() => setCurrentGroupId(group.id)}
                        >
                          {group.customName || group.name}
                        </button>
                        {!isCollapsed && (
                          <p className="text-xs" style={{ color: theme.textM }}>{group.trip?.startDate || 'No date set'} · {group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isCollapsed && group.target > 0 && (
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{ color: teal }}>{fmt(group.current)} / {fmt(group.target)}</p>
                          <p className="text-xs" style={{ color: theme.textM }}>{Math.round((group.current / group.target) * 100) || 0}%</p>
                        </div>
                      )}
                      <button
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ backgroundColor: tealLight, color: teal }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        {isCollapsed ? 'Expand' : 'Minimize'}
                      </button>
                      <button onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg" style={{ color: theme.bad }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && group.target > 0 && (
                    <div className="mt-3">
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: theme.border }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min((group.current / group.target) * 100, 100)}%`, backgroundColor: teal }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              );});
            })()}

            {currentGroup && currentGroup.entryType === 'vacation' ? (
              <>
                {/* Group Overview Card - Indigo branded */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-4 sm:p-8 text-center transition-colors"
                  style={{
                    backgroundColor: isDark ? `${currentTheme.primary}20` : `${currentTheme.primary}10`,
                    borderColor: `${currentTheme.primary}40`,
                  }}
                >
                  {/* Editable Group Name */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {!editingGroupName ? (
                      <div className="flex items-center gap-3">
                        <h2
                          className="text-lg sm:text-2xl"
                          style={{ fontWeight: 800, color: currentTheme.primary }}
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
                          style={{ backgroundColor: `${currentTheme.primary}15` }}
                        >
                          <Edit3
                            className="w-4 h-4"
                            style={{ color: currentTheme.primary }}
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
                            border: `1px solid ${currentTheme.primary}`,
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveGroupName}
                          className="px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                          style={{
                            backgroundColor: currentTheme.primary,
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
                        <circle cx="70" cy="70" r="60" fill="none" stroke={`${currentTheme.primary}40`} strokeWidth="10" />
                        <motion.circle
                          cx="70" cy="70" r="60" fill="none" stroke={currentTheme.primary} strokeWidth="10"
                          strokeLinecap="round"
                          transform="rotate(-90 70 70)"
                          initial={{ strokeDasharray: '0 377' }}
                          animate={{ strokeDasharray: `${Math.min((currentGroup.current / currentGroup.target) * 377, 377)} 377` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div style={{ fontSize: 28, fontWeight: 900, color: currentTheme.primary, lineHeight: 1 }}>{fmt(currentGroup.current)}</div>
                        <div className="text-xs mt-1" style={{ color: currentTheme.primary }}>saved</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1 mb-3">
                    <span className="text-sm" style={{ color: theme.textM }}>Target:</span>
                    <span style={{ fontWeight: 700, color: currentTheme.primary, fontSize: 15 }}>{fmt(currentGroup.target)}</span>
                    <span className="text-sm" style={{ color: theme.textM }}>· {pct(currentGroup.current, currentGroup.target)}%</span>
                  </div>

                  {currentGroup.date && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm mb-4" style={{ background: isDark ? `${currentTheme.primary}20` : `${currentTheme.primary}12`, color: currentTheme.primary }}>
                      <Calendar size={14} />
                      {currentGroup.entryType === 'vacation' ? 'Trip Date' : 'Target Date'}: {new Date(currentGroup.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: currentTheme.primary, color: '#fff', fontWeight: 700 }}>
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
                    style={{ height: 6, backgroundColor: `${currentTheme.primary}40` }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: currentTheme.primary }}
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
                    <span style={{ fontWeight: 800, color: currentTheme.primary, letterSpacing: '0.1em' }}>{currentGroup.code}</span>
                  </div>
                </motion.div>

                {/* Trip Details Card - Only for vacation groups */}
                {currentGroup.entryType === 'vacation' && currentGroup.trip && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-2xl border p-3 sm:p-6 transition-colors"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: tealBorder,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="font-bold text-base sm:text-lg flex items-center gap-2"
                        style={{ color: theme.text }}
                      >
                        <Plane className="w-5 h-5" style={{ color: teal }} />
                        Trip Details
                      </h3>
                      {!editingTrip && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingTrip(true);
                            setEditTripStart(currentGroup.trip?.startDate || '');
                            setEditTripEnd(currentGroup.trip?.endDate || '');
                            setEditTripFlight(currentGroup.trip?.flight || '');
                            setEditTripHotel(currentGroup.trip?.hotel || '');
                          }}
                          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                          style={{ color: teal }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>

                    {editingTrip ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.textS }}>Departure</p>
                            <input
                              type="date"
                              value={editTripStart}
                              onChange={(e) => setEditTripStart(e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.text,
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.textS }}>Return</p>
                            <input
                              type="date"
                              value={editTripEnd}
                              onChange={(e) => setEditTripEnd(e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.text,
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.textS }}>Flight</p>
                            <input
                              type="text"
                              value={editTripFlight}
                              onChange={(e) => setEditTripFlight(e.target.value)}
                              placeholder="e.g., AA123"
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.text,
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: theme.textS }}>Hotel</p>
                            <input
                              type="text"
                              value={editTripHotel}
                              onChange={(e) => setEditTripHotel(e.target.value)}
                              placeholder="e.g., Hilton Downtown"
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.text,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSaveTripEdit}
                            className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors"
                            style={{ backgroundColor: teal, color: '#fff' }}
                          >
                            Save
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setEditingTrip(false)}
                            className="flex-1 py-2 rounded-lg font-semibold text-sm border transition-colors"
                            style={{ borderColor: theme.border, color: theme.text }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium" style={{ color: theme.textS }}>Departure</p>
                            <p className="text-sm font-semibold" style={{ color: theme.text }}>
                              {currentGroup.trip.startDate
                                ? new Date(currentGroup.trip.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: theme.textS }}>Return</p>
                            <p className="text-sm font-semibold" style={{ color: theme.text }}>
                              {currentGroup.trip.endDate
                                ? new Date(currentGroup.trip.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: theme.textS }}>Duration</p>
                            <p className="text-sm font-semibold" style={{ color: theme.text }}>
                              {currentGroup.trip.duration} day{currentGroup.trip.duration !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Flight & Hotel Info */}
                        {(currentGroup.trip.flight || currentGroup.trip.hotel) && (
                          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
                            {currentGroup.trip.flight && (
                              <div className="flex gap-3 mb-3">
                                <Plane className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: teal }} />
                                <div>
                                  <p className="text-xs font-medium" style={{ color: theme.textS }}>Flight</p>
                                  <p className="text-sm" style={{ color: theme.text }}>{currentGroup.trip.flight}</p>
                                </div>
                              </div>
                            )}
                            {currentGroup.trip.hotel && (
                              <div className="flex gap-3">
                                <Hotel className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: teal }} />
                                <div>
                                  <p className="text-xs font-medium" style={{ color: theme.textS }}>Hotel</p>
                                  <p className="text-sm" style={{ color: theme.text }}>{currentGroup.trip.hotel}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* Share Group Code Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-4 transition-colors"
                  style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-xl" style={{ backgroundColor: tealLight }}>
                      <UserPlus className="w-4 h-4" style={{ color: teal }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: theme.text }}>Invite Members</h3>
                      <p className="text-xs" style={{ color: theme.textS }}>Share your group code to invite friends</p>
                    </div>
                  </div>

                  {/* Compact code display */}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: '1.5px solid #C7D2FE' }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6366F1', opacity: 0.7 }}>Group Code</p>
                      <span className="text-xl font-black tracking-[0.18em]" style={{ color: '#4F46E5' }}>{currentGroup.code}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all"
                      style={{ backgroundColor: copiedCode ? '#10B981' : teal, color: '#fff' }}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Trip Checklist - Only show for vacation groups */}
                {currentGroup.entryType === 'vacation' && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-2xl border p-3 sm:p-6 transition-colors"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: tealBorder,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="font-bold text-base sm:text-lg flex items-center gap-2"
                        style={{ color: theme.text }}
                      >
                        <ListChecks className="w-5 h-5" style={{ color: teal }} />
                        Trip Checklist
                      </h3>
                      {tripChecklistItems.length > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: tealLight, color: teal, fontWeight: 600 }}>
                          {tripChecklistItems.filter(i => i.completed).length}/{tripChecklistItems.length}
                        </span>
                      )}
                    </div>

                    {/* Category Filter */}
                    {tripChecklistItems.length > 0 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {['All', 'packing', 'documents', 'expenses', 'other'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setChecklistFilter(cat)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{
                              backgroundColor: checklistFilter === cat ? teal : theme.bg,
                              color: checklistFilter === cat ? '#fff' : theme.textM,
                              border: `1px solid ${checklistFilter === cat ? teal : theme.border}`,
                            }}
                          >
                            {cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add Item */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Add checklist item..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddChecklistItem();
                          }
                        }}
                        className="flex-1 border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                      <select
                        value={newChecklistCategory}
                        onChange={(e) => setNewChecklistCategory(e.target.value)}
                        className="border rounded-2xl px-3 py-2 sm:py-3 text-sm focus:outline-none"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      >
                        <option value="packing">Packing</option>
                        <option value="documents">Documents</option>
                        <option value="expenses">Expenses</option>
                        <option value="other">Other</option>
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddChecklistItem}
                        className="font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-sm transition-shadow whitespace-nowrap"
                        style={{
                          backgroundColor: teal,
                          color: '#fff',
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Checklist Items */}
                    {tripChecklistItems.length > 0 ? (
                      <div className="space-y-2">
                        {tripChecklistItems
                          .filter((item) => checklistFilter === 'All' || item.category === checklistFilter)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                              style={{
                                backgroundColor: theme.bg,
                                opacity: item.completed ? 0.6 : 1,
                              }}
                            >
                              <button
                                onClick={() => handleToggleChecklistItem(item.id)}
                                className="flex-shrink-0 transition-transform hover:scale-110"
                              >
                                {item.completed ? (
                                  <CheckCircle2 className="w-5 h-5" style={{ color: teal }} />
                                ) : (
                                  <Circle className="w-5 h-5" style={{ color: theme.textM }} />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block text-xs px-2 py-1 rounded-md font-medium"
                                    style={{
                                      backgroundColor: isDark ? `${teal}20` : `${teal}10`,
                                      color: teal,
                                    }}
                                  >
                                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                  </span>
                                  <p
                                    className={`text-sm ${item.completed ? 'line-through' : ''}`}
                                    style={{
                                      color: item.completed ? theme.textS : theme.text,
                                    }}
                                  >
                                    {item.text}
                                  </p>
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteChecklistItem(item.id)}
                                className="flex-shrink-0 text-sm transition-colors hover:opacity-70"
                              >
                                <Trash2 className="w-4 h-4" style={{ color: theme.textS }} />
                              </motion.button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: theme.textS }}>
                        No checklist items yet
                      </p>
                    )}
                  </motion.div>
                )}

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
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: currentTheme.primary, color: '#fff', fontWeight: 700 }}>
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
                        <p style={{ fontWeight: 800, color: currentTheme.primary, fontSize: 15 }}>{fmt(member.balance)}</p>
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                          style={{
                            backgroundColor: isDark ? `${currentTheme.primary}20` : `${currentTheme.primary}10`,
                            color: currentTheme.primary,
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
            ) : null}
          </>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <>
            {/* Join a Group - always visible at top */}
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
                  Join
                </motion.button>
              </div>
              {joinError && <p className="text-xs mt-2 font-medium" style={{ color: '#EF4444' }}>{joinError}</p>}
            </motion.div>

            {/* Create Group Savings Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowCreateGroupForm(!showCreateGroupForm); setNewEntryType('savings'); }}
                className="w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.bg,
                  border: `1px dashed ${isDark ? '#475569' : '#CBD5E1'}`,
                  color: teal,
                  fontWeight: 700,
                }}
              >
                <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                {showCreateGroupForm ? 'Cancel' : 'Create Group Savings'}
              </motion.button>

              <AnimatePresence>
                {showCreateGroupForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rounded-2xl border p-4 sm:p-5 transition-colors mt-4"
                    style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                  >
                    <h3 className="font-bold text-base mb-4" style={{ color: theme.text }}>New Savings Group</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Group Name</label>
                        <input type="text" placeholder="e.g., Home Renovation"
                          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full border rounded-2xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>What are you saving for?</label>
                        <input type="text" placeholder="e.g., Save for kitchen remodel"
                          value={newGroupGoal} onChange={(e) => setNewGroupGoal(e.target.value)}
                          className="w-full border rounded-2xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Target Amount</label>
                          <input type="number" placeholder="$0.00" value={newGroupTarget} onChange={(e) => setNewGroupTarget(e.target.value)}
                            className="w-full border rounded-2xl px-3 py-2.5 text-sm focus:outline-none transition-colors"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textM }}>Target Date</label>
                          <CalendarPicker value={newGroupDate} onChange={setNewGroupDate} placeholder="Select date" theme={theme} showQuickSelect={false} />
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setNewEntryType('savings'); handleCreateGroup(); }}
                        className="w-full font-bold px-4 py-2.5 rounded-2xl text-sm transition-shadow"
                        style={{ backgroundColor: teal, color: '#fff' }}
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Create Group
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Savings Groups List */}
            {(() => {
              const savingsGroups = groups.filter(g => g.entryType !== 'vacation');
              if (savingsGroups.length === 0) {
                return (
                  <motion.div variants={itemVariants} className="text-center py-12">
                    <p className="font-bold text-base mb-1" style={{ color: theme.text }}>No savings groups yet</p>
                    <p className="text-sm" style={{ color: theme.textM }}>Create a group below to get started!</p>
                  </motion.div>
                );
              }
              return savingsGroups.map(group => {
                const isCollapsed = collapsedGroups.has(group.id);
                return (
                <motion.div key={group.id} variants={itemVariants}
                  className="rounded-2xl border transition-all p-4 sm:p-5"
                  style={{ backgroundColor: currentGroupId === group.id ? `${teal}10` : theme.card, borderColor: currentGroupId === group.id ? teal : theme.border }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: tealLight }}>
                        <Users className="w-4 h-4" style={{ color: teal }} />
                      </div>
                      <div>
                        <button
                          className="font-bold text-sm text-left hover:opacity-75 transition-opacity"
                          style={{ color: theme.text }}
                          onClick={() => setCurrentGroupId(group.id)}
                        >
                          {group.customName || group.name}
                        </button>
                        {!isCollapsed && (
                          <p className="text-xs" style={{ color: theme.textM }}>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isCollapsed && (
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{ color: teal }}>{fmt(group.current)} / {fmt(group.target)}</p>
                          <p className="text-xs" style={{ color: theme.textM }}>{Math.round((group.current / group.target) * 100) || 0}%</p>
                        </div>
                      )}
                      <button
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ backgroundColor: tealLight, color: teal }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        {isCollapsed ? 'Expand' : 'Minimize'}
                      </button>
                      <button onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg" style={{ color: theme.bad }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="mt-3">
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: theme.border }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min((group.current / group.target) * 100, 100)}%`, backgroundColor: teal }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              );});
            })()}

            {currentGroup && currentGroup.entryType !== 'vacation' ? (
              <>
                {/* Group Overview Card - Indigo branded */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-4 sm:p-8 text-center transition-colors"
                  style={{
                    backgroundColor: isDark ? `${currentTheme.primary}20` : `${currentTheme.primary}10`,
                    borderColor: `${currentTheme.primary}40`,
                  }}
                >
                  {/* Editable Group Name */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {!editingGroupName ? (
                      <div className="flex items-center gap-3">
                        <h2
                          className="text-lg sm:text-2xl"
                          style={{ fontWeight: 800, color: currentTheme.primary }}
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
                          style={{ backgroundColor: `${currentTheme.primary}15` }}
                        >
                          <Edit3
                            className="w-4 h-4"
                            style={{ color: currentTheme.primary }}
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
                            border: `1px solid ${currentTheme.primary}`,
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveGroupName}
                          className="px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                          style={{
                            backgroundColor: currentTheme.primary,
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

                  {/* Group Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div>
                      <p className="text-xs font-medium" style={{ color: theme.textS }}>Raised</p>
                      <p className="text-lg sm:text-xl font-black" style={{ color: currentTheme.primary }}>{fmt(currentGroup.current)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: theme.textS }}>Goal</p>
                      <p className="text-lg sm:text-xl font-black" style={{ color: currentTheme.primary }}>{fmt(currentGroup.target)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: theme.textS }}>Progress</p>
                      <p className="text-lg sm:text-xl font-black" style={{ color: currentTheme.primary }}>{Math.round((currentGroup.current / currentGroup.target) * 100) || 0}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((currentGroup.current / currentGroup.target) * 100, 100)}%`, backgroundColor: currentTheme.primary }} />
                  </div>
                </motion.div>

                {/* Invite Members / Share Code Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-2xl" style={{ backgroundColor: tealLight }}>
                      <UserPlus className="w-5 h-5" style={{ color: teal }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Invite Members</h3>
                      <p className="text-sm" style={{ color: theme.textS }}>Share your group code to invite friends</p>
                    </div>
                  </div>

                  {/* Compact code display */}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', border: '1.5px solid #C7D2FE' }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6366F1', opacity: 0.7 }}>Group Code</p>
                      <span className="text-xl font-black tracking-[0.18em]" style={{ color: '#4F46E5' }}>{currentGroup.code}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all"
                      style={{ backgroundColor: copiedCode ? '#10B981' : teal, color: '#fff' }}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Members, Progress, Activity Log, Add Money sections copied from group tab
                   (These sections should be identical to the trip tab version) */}
                {/* Members Section */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-2xl" style={{ backgroundColor: tealLight }}>
                      <Users className="w-5 h-5" style={{ color: teal }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Members</h3>
                      <p className="text-sm" style={{ color: theme.textS }}>{currentGroup.members.length} member{currentGroup.members.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.bg }}>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{member.name}</p>
                        <p className="text-xs font-bold" style={{ color: teal }}>{fmt(member.contrib)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Add Money / Contribute Form */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-3 sm:p-6 transition-colors"
                  style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-2xl" style={{ backgroundColor: tealLight }}>
                      <Plus className="w-5 h-5" style={{ color: teal }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Add Money</h3>
                      <p className="text-sm" style={{ color: theme.textS }}>Contribute to the group savings</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: theme.text }}>Amount</label>
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={addMoneyAmount}
                        onChange={(e) => setAddMoneyAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMoney()}
                        className="w-full border rounded-2xl px-3 py-2 text-sm focus:outline-none transition-colors"
                        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddMoney}
                      className="w-full font-bold px-4 py-3 rounded-2xl text-sm transition-colors"
                      style={{ backgroundColor: teal, color: '#fff' }}
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Money
                    </motion.button>
                  </div>
                </motion.div>

                {/* Recent Activity */}
                {currentGroup.activity && currentGroup.activity.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-2xl border p-3 sm:p-6 transition-colors"
                    style={{ backgroundColor: theme.card, borderColor: tealBorder }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-2xl" style={{ backgroundColor: tealLight }}>
                        <Calendar className="w-5 h-5" style={{ color: teal }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>Activity</h3>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {currentGroup.activity.map((act) => (
                        <div key={act.id} className="text-sm flex items-start gap-3">
                          <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: teal }} />
                          <div>
                            <p style={{ color: theme.text }}>
                              <strong>{act.user}</strong>: {act.msg}
                            </p>
                            <p className="text-xs" style={{ color: theme.textM }}>{act.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            ) : null}

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
