'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useOrcaData } from '@/context/OrcaDataContext';
import { fmt, pct, gid } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

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

export default function StackCirclePage() {
  const { theme } = useTheme();
  const { data: orcaData, loading } = useOrcaData();
  const group = orcaData.groups[0] || null;

  const initialRoommates: RoommateData = {
    enabled: true,
    totalRent: 3600,
    utilities: [
      { id: gid(), name: 'Electric', amount: 120, split: 0 },
      { id: gid(), name: 'Internet', amount: 80, split: 0 },
      { id: gid(), name: 'Water', amount: 60, split: 0 },
    ],
    members: [
      {
        id: gid(),
        name: 'You',
        share: 50,
        paidRent: true,
        paidUtilities: true,
      },
      {
        id: gid(),
        name: 'Alex',
        share: 50,
        paidRent: false,
        paidUtilities: true,
      },
    ],
    history: [],
  };

  // State
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(group);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(
    group?.customName || group?.name || ''
  );

  // Calculations
  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaidRent = roommates.members.every((m) => m.paidRent);
  const allPaidUtils = roommates.members.every((m) => m.paidUtilities);
  const allPaid = allPaidRent && allPaidUtils;

  // Invite link - using orcafin.app/invite/{group-name-slug}
  const groupNameSlug = toSlug(currentGroup?.customName || currentGroup?.name || '');
  const inviteLink = currentGroup
    ? `https://orcafin.app/invite/${groupNameSlug}`
    : '';

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
      setCurrentGroup({
        ...currentGroup,
        customName: groupNameInput,
      });
      setEditingGroupName(false);
    }
  };

  const handleAddMoney = () => {
    if (addMoneyAmount && !isNaN(Number(addMoneyAmount))) {
      if (currentGroup) {
        const newCurrent = currentGroup.current + Number(addMoneyAmount);
        setCurrentGroup({
          ...currentGroup,
          current: newCurrent,
          activity: [
            {
              id: gid(),
              user: 'You',
              msg: `Added ${fmt(Number(addMoneyAmount))} to the group`,
              date: new Date().toLocaleDateString(),
            },
            ...currentGroup.activity,
          ],
        });
      }
      setAddMoneyAmount('');
    }
  };

  const handleSaveRent = () => {
    if (rentInput && !isNaN(Number(rentInput))) {
      setRoommates({ ...roommates, totalRent: Number(rentInput) });
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
      setRoommates({
        ...roommates,
        utilities: [...roommates.utilities, newUtility],
      });
      setUtilityName('');
      setUtilityAmount('');
      setAddingUtility(false);
    }
  };

  const handleRemoveUtility = (id: string) => {
    setRoommates({
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
      setRoommates({ ...roommates, members: updatedMembers });
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
      setRoommates({ ...roommates, members: updatedMembers });
    }
  };

  const handleToggleMemberShare = (id: string, newShare: number) => {
    setRoommates({
      ...roommates,
      members: roommates.members.map((m) =>
        m.id === id ? { ...m, share: newShare } : m
      ),
    });
  };

  const handleToggleRentPaid = (id: string) => {
    setRoommates({
      ...roommates,
      members: roommates.members.map((m) =>
        m.id === id ? { ...m, paidRent: !m.paidRent } : m
      ),
    });
  };

  const handleToggleUtilsPaid = (id: string) => {
    setRoommates({
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg, color: theme.text }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-32 overflow-x-hidden transition-colors"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Header */}
      <motion.div
        className="border-b px-4 sm:px-6 py-6 sm:py-8 transition-colors"
        style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: theme.gold }}>
            <Users className="w-5 h-5" style={{ color: theme.bg }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: theme.text }}>
            Stack Circle
          </h1>
        </div>
        <p className="text-sm" style={{ color: theme.textM }}>
          Save together, achieve more
        </p>
      </motion.div>

      {/* Tabs */}
      <div
        className="border-b px-4 sm:px-6 transition-colors"
        style={{ borderColor: theme.border, backgroundColor: theme.bg }}
      >
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('group')}
            className={`py-4 px-0 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'group'
                ? 'border-b-2'
                : 'border-transparent'
            }`}
            style={{
              borderColor: activeTab === 'group' ? theme.gold : 'transparent',
              color: activeTab === 'group' ? theme.gold : theme.textS,
            }}
          >
            Group Savings
          </button>
          <button
            onClick={() => setActiveTab('roommates')}
            className={`py-4 px-0 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'roommates'
                ? 'border-b-2'
                : 'border-transparent'
            }`}
            style={{
              borderColor: activeTab === 'roommates' ? theme.gold : 'transparent',
              color: activeTab === 'roommates' ? theme.gold : theme.textS,
            }}
          >
            Roommates
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* GROUP SAVINGS TAB */}
        {activeTab === 'group' && (
          <>
            {currentGroup ? (
              <>
                {/* Group Overview Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-5 sm:p-8 text-center transition-colors"
                  style={{
                    backgroundColor: theme.goldBg,
                    borderColor: theme.gold,
                  }}
                >
                  {/* Editable Group Name */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {!editingGroupName ? (
                      <div className="flex items-center gap-3">
                        <h2
                          className="text-2xl font-bold"
                          style={{ color: theme.gold }}
                        >
                          {displayGroupName}
                        </h2>
                        <button
                          onClick={() => {
                            setEditingGroupName(true);
                            setGroupNameInput(
                              currentGroup.customName || currentGroup.name
                            );
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                          style={{ backgroundColor: theme.goldBg2 }}
                        >
                          <Edit3
                            className="w-4 h-4"
                            style={{ color: theme.gold }}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full max-w-sm">
                        <input
                          type="text"
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                          placeholder="Group name (e.g., Vacation Fund)"
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                          style={{
                            backgroundColor: theme.card,
                            borderColor: theme.gold,
                            color: theme.text,
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveGroupName}
                          className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                          style={{
                            backgroundColor: theme.gold,
                            color: theme.bg,
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingGroupName(false)}
                          className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
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

                  <div
                    className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6"
                    style={{ color: theme.gold }}
                  >
                    {fmt(currentGroup.current)}
                  </div>
                  <div className="mb-6">
                    <p
                      className="text-sm mb-2"
                      style={{ color: theme.textM }}
                    >
                      Target: {fmt(currentGroup.target)}{' '}
                      <span
                        className="font-bold"
                        style={{ color: theme.gold }}
                      >
                        {pct(currentGroup.current, currentGroup.target)}%
                      </span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="w-full h-3 rounded-full overflow-hidden mb-6"
                    style={{ backgroundColor: theme.border }}
                  >
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: theme.gold }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          (currentGroup.current / currentGroup.target) * 100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>

                  {/* Invite Code */}
                  <div
                    className="border rounded-lg p-3 inline-block transition-colors"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    }}
                  >
                    <p
                      className="text-xs mb-1"
                      style={{ color: theme.textS }}
                    >
                      Invite Code
                    </p>
                    <p
                      className="font-mono font-bold"
                      style={{ color: theme.gold }}
                    >
                      {currentGroup.code}
                    </p>
                  </div>
                </motion.div>

                {/* Invite Link Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border p-4 sm:p-6 transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: theme.goldBg }}
                    >
                      <Share2
                        className="w-5 h-5"
                        style={{ color: theme.gold }}
                      />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-lg"
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
                    className="rounded-xl p-3 mb-4 border text-sm"
                    style={{
                      backgroundColor: theme.goldBg2,
                      borderColor: theme.gold,
                    }}
                  >
                    <p style={{ color: theme.text }}>
                      <span className="font-semibold">New users:</span> Will see
                      a sign-up flow
                    </p>
                    <p style={{ color: theme.text }}>
                      <span className="font-semibold">Existing users:</span> Will
                      be prompted to log in and auto-join
                    </p>
                  </div>

                  {/* Invite Link Display */}
                  <div
                    className="border rounded-xl p-4 mb-4 transition-colors"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  >
                    <p
                      className="text-xs mb-2 font-semibold uppercase tracking-wider"
                      style={{ color: theme.textS }}
                    >
                      Invite Link
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 min-w-0 border rounded-lg px-3 sm:px-4 py-2.5 font-mono text-xs sm:text-sm truncate transition-colors"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          color: theme.gold,
                        }}
                      >
                        {inviteLink}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                        style={{
                          backgroundColor: copiedLink
                            ? theme.ok
                            : theme.gold,
                          color: theme.bg,
                        }}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Quick Share Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyCode}
                      className="py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors font-medium hover:opacity-80"
                      style={{
                        backgroundColor: theme.border,
                        color: theme.text,
                      }}
                    >
                      <Copy
                        className="w-4 h-4"
                        style={{ color: theme.gold }}
                      />
                      Copy Code: {currentGroup.code}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowInviteModal(true)}
                      className="py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors font-medium hover:opacity-80"
                      style={{
                        backgroundColor: theme.border,
                        color: theme.text,
                      }}
                    >
                      <Link2
                        className="w-4 h-4"
                        style={{ color: theme.gold }}
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
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                        style={{
                          backgroundColor: theme.border,
                          borderColor: theme.border,
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
                  className="rounded-2xl border p-6 transition-colors"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <h3
                    className="font-bold text-lg mb-4"
                    style={{ color: theme.text }}
                  >
                    Add Money to Group
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="$0.00"
                      value={addMoneyAmount}
                      onChange={(e) => setAddMoneyAmount(e.target.value)}
                      className="flex-1 border rounded-lg px-4 py-3 focus:outline-none transition-colors"
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
                      className="font-bold px-6 py-3 rounded-lg transition-shadow"
                      style={{
                        backgroundColor: theme.gold,
                        color: theme.bg,
                      }}
                    >
                      Add
                    </motion.button>
                  </div>
                </motion.div>

                {/* Members List */}
                <motion.div
                  variants={itemVariants}
                  className="space-y-3"
                >
                  <h3
                    className="font-bold text-lg"
                    style={{ color: theme.text }}
                  >
                    Members
                  </h3>
                  {currentGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg border p-4 flex items-center justify-between transition-colors"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: theme.text }}
                        >
                          {member.name}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: theme.textS }}
                        >
                          Contributed: {fmt(member.contrib)}
                        </p>
                        {member.invitedBy && (
                          <p
                            className="text-xs mt-1"
                            style={{ color: theme.textM }}
                          >
                            Invited by {member.invitedBy}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className="font-bold"
                          style={{ color: theme.gold }}
                        >
                          {fmt(member.balance)}
                        </p>
                        <span
                          className="inline-block text-xs font-semibold px-3 py-1 rounded mt-1"
                          style={{
                            backgroundColor: theme.border,
                            color: theme.textS,
                          }}
                        >
                          {member.role === 'coordinator'
                            ? 'Coordinator'
                            : 'Member'}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Activity Feed */}
                {currentGroup.activity && currentGroup.activity.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="space-y-3"
                  >
                    <h3
                      className="font-bold text-lg"
                      style={{ color: theme.text }}
                    >
                      Activity Feed
                    </h3>
                    {currentGroup.activity.slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className="rounded-lg border p-4 flex gap-3 transition-colors"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        }}
                      >
                        <MapPin
                          className="w-4 h-4 flex-shrink-0 mt-1"
                          style={{ color: theme.gold }}
                        />
                        <div className="flex-1">
                          <p
                            className="text-sm"
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
              <motion.div
                variants={itemVariants}
                className="text-center py-16 px-6 rounded-2xl border-2 border-dashed transition-colors"
                style={{
                  borderColor: theme.border,
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="font-bold px-6 py-3 rounded-lg transition-shadow"
                  style={{
                    backgroundColor: theme.gold,
                    color: theme.bg,
                  }}
                >
                  Create Group
                </motion.button>
              </motion.div>
            )}
          </>
        )}

        {/* ROOMMATES TAB */}
        {activeTab === 'roommates' && (
          <>
            {/* Monthly Overview Card */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-5 sm:p-8 text-center transition-colors"
              style={{
                backgroundColor: theme.goldBg,
                borderColor: theme.gold,
              }}
            >
              <p
                className="text-sm mb-2"
                style={{ color: theme.textM }}
              >
                Total Monthly Housing
              </p>
              <div
                className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6"
                style={{ color: theme.gold }}
              >
                {fmt(totalMonthly)}
              </div>
              <div className="flex justify-center gap-4 sm:gap-8 mb-4 sm:mb-6">
                <div>
                  <p
                    className="text-sm"
                    style={{ color: theme.textS }}
                  >
                    Rent
                  </p>
                  <p
                    className="font-bold text-lg"
                    style={{ color: theme.text }}
                  >
                    {fmt(roommates.totalRent)}
                  </p>
                </div>
                <div
                  className="w-px"
                  style={{ backgroundColor: theme.border }}
                />
                <div>
                  <p
                    className="text-sm"
                    style={{ color: theme.textS }}
                  >
                    Utilities
                  </p>
                  <p
                    className="font-bold text-lg"
                    style={{ color: theme.text }}
                  >
                    {fmt(totalUtilities)}
                  </p>
                </div>
              </div>
              {allPaid && (
                <span
                  className="inline-block text-xs font-bold px-4 py-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: theme.ok,
                    color: theme.bg,
                  }}
                >
                  All Paid This Month
                </span>
              )}
            </motion.div>

            {/* Rent Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  Rent
                </h3>
                <button
                  onClick={() => {
                    setEditingRent(!editingRent);
                    setRentInput(String(roommates.totalRent));
                  }}
                  className="text-sm font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: theme.gold }}
                >
                  {editingRent ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {!editingRent ? (
                <p
                  className="text-3xl font-bold"
                  style={{ color: theme.gold }}
                >
                  {fmt(roommates.totalRent)}
                </p>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={rentInput}
                    onChange={(e) => setRentInput(e.target.value)}
                    className="flex-1 border rounded-lg px-4 py-3 focus:outline-none transition-colors"
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
                    className="font-bold px-6 py-3 rounded-lg transition-shadow"
                    style={{
                      backgroundColor: theme.gold,
                      color: theme.bg,
                    }}
                  >
                    Save
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Shared Utilities Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  Shared Utilities
                </h3>
                <button
                  onClick={() => setAddingUtility(!addingUtility)}
                  className="text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{ color: theme.gold }}
                >
                  <Plus className="w-4 h-4" />
                  {addingUtility ? 'Cancel' : 'Add'}
                </button>
              </div>

              <AnimatePresence>
                {addingUtility && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 mb-6 pb-6 border-b transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    <input
                      type="text"
                      placeholder="Utility name"
                      value={utilityName}
                      onChange={(e) => setUtilityName(e.target.value)}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={utilityAmount}
                        onChange={(e) => setUtilityAmount(e.target.value)}
                        className="flex-1 border rounded-lg px-4 py-3 focus:outline-none transition-colors"
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
                        className="font-bold px-6 py-3 rounded-lg transition-shadow"
                        style={{
                          backgroundColor: theme.gold,
                          color: theme.bg,
                        }}
                      >
                        Add
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {roommates.utilities.map((utility) => (
                  <div
                    key={utility.id}
                    className="flex items-center justify-between p-4 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  >
                    <div>
                      <p
                        className="font-semibold"
                        style={{ color: theme.text }}
                      >
                        {utility.name}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: theme.textS }}
                      >
                        {fmt(utility.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveUtility(utility.id)}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: theme.bad }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Roommates Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  Roommates
                </h3>
                <button
                  onClick={() => setAddingMember(!addingMember)}
                  className="text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
                  style={{ color: theme.gold }}
                >
                  <Plus className="w-4 h-4" />
                  {addingMember ? 'Cancel' : 'Add'}
                </button>
              </div>

              <AnimatePresence>
                {addingMember && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex gap-3 mb-6 pb-6 border-b transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="flex-1 border rounded-lg px-4 py-3 focus:outline-none transition-colors"
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
                      className="font-bold px-6 py-3 rounded-lg transition-shadow"
                      style={{
                        backgroundColor: theme.gold,
                        color: theme.bg,
                      }}
                    >
                      Add
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {roommates.members.map((member) => {
                  const rentShare = getMemberRentShare(member.share);
                  const utilsShare = getMemberUtilsShare(member.share);
                  const totalShare = rentShare + utilsShare;
                  const isPaid = member.paidRent && member.paidUtilities;

                  return (
                    <div
                      key={member.id}
                      className="rounded-lg p-4 transition-colors"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: isPaid ? theme.ok : theme.border,
                        borderWidth: '2px',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p
                            className="font-bold text-base"
                            style={{ color: theme.text }}
                          >
                            {member.name}
                          </p>
                          <p
                            className="text-sm"
                            style={{ color: theme.textS }}
                          >
                            Share: {member.share}% · Owes {fmt(totalShare)}/mo
                          </p>
                        </div>
                        <span
                          className="text-xs font-bold px-3 py-1 rounded transition-colors"
                          style={{
                            backgroundColor: isPaid
                              ? theme.ok
                              : theme.warn,
                            color: theme.bg,
                          }}
                        >
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </div>

                      <div
                        className="space-y-2 mb-4 text-sm"
                        style={{ color: theme.textM }}
                      >
                        <p>Rent share: {fmt(rentShare)}</p>
                        <p>Utilities share: {fmt(utilsShare)}</p>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleRentPaid(member.id)}
                          className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors"
                          style={{
                            backgroundColor: member.paidRent
                              ? theme.ok
                              : theme.border,
                            color: member.paidRent
                              ? theme.bg
                              : theme.text,
                          }}
                        >
                          {member.paidRent ? '✓ Rent Paid' : 'Mark Rent Paid'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleUtilsPaid(member.id)}
                          className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors"
                          style={{
                            backgroundColor: member.paidUtilities
                              ? theme.ok
                              : theme.border,
                            color: member.paidUtilities
                              ? theme.bg
                              : theme.text,
                          }}
                        >
                          {member.paidUtilities
                            ? '✓ Utils Paid'
                            : 'Mark Utils Paid'}
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
                            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none transition-colors"
                            style={{
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 hover:opacity-80 transition-opacity"
                            style={{ color: theme.bad }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Split Summary Card */}
            {roommates.members.length >= 2 && (
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border p-6 transition-colors"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              >
                <h3
                  className="font-bold text-lg mb-4"
                  style={{ color: theme.text }}
                >
                  Split Summary
                </h3>
                <div className="space-y-3">
                  {roommates.members.map((member) => {
                    const totalShare =
                      getMemberRentShare(member.share) +
                      getMemberUtilsShare(member.share);
                    const isPaid = member.paidRent && member.paidUtilities;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border transition-colors"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                        }}
                      >
                        <p style={{ color: theme.text }}>{member.name}</p>
                        <p
                          className="font-bold"
                          style={{
                            color: isPaid ? theme.ok : theme.text,
                          }}
                        >
                          {isPaid && '✓ '} {fmt(totalShare)}
                        </p>
                      </div>
                    );
                  })}
                  <div
                    className="border-t pt-3 mt-3 flex items-center justify-between transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    <p
                      className="font-bold"
                      style={{ color: theme.text }}
                    >
                      Total
                    </p>
                    <p
                      className="font-bold text-lg"
                      style={{ color: theme.gold }}
                    >
                      {fmt(totalMonthly)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center transition-colors"
            style={{ backgroundColor: theme.overlay }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4 transition-colors"
              style={{
                backgroundColor: theme.card,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  Share Invite
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: theme.border }}
                >
                  <X
                    className="w-5 h-5"
                    style={{ color: theme.textM }}
                  />
                </button>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleCopyLink();
                    setShowInviteModal(false);
                  }}
                  className="w-full p-4 rounded-xl flex items-center gap-3 transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <Copy
                    className="w-5 h-5"
                    style={{ color: theme.gold }}
                  />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Copy Link</p>
                    <p
                      className="text-xs"
                      style={{ color: theme.textS }}
                    >
                      Copy invite link to clipboard
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.open(
                      `sms:?body=Join my ORCA Stack Circle! ${inviteLink}`,
                      '_blank'
                    );
                    setShowInviteModal(false);
                  }}
                  className="w-full p-4 rounded-xl flex items-center gap-3 transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <ExternalLink
                    className="w-5 h-5"
                    style={{ color: theme.ok }}
                  />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Text Message</p>
                    <p
                      className="text-xs"
                      style={{ color: theme.textS }}
                    >
                      Send via SMS
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.open(
                      `mailto:?subject=Join my ORCA Stack Circle&body=Join my group savings circle! ${inviteLink}`,
                      '_blank'
                    );
                    setShowInviteModal(false);
                  }}
                  className="w-full p-4 rounded-xl flex items-center gap-3 transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <ExternalLink
                    className="w-5 h-5"
                    style={{ color: theme.gold }}
                  />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Email</p>
                    <p
                      className="text-xs"
                      style={{ color: theme.textS }}
                    >
                      Send invite via email
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
