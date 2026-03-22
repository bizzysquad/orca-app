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
} from 'lucide-react';
import { getDemoData } from '@/lib/demo-data';
import { fmt, pct, gid } from '@/lib/utils';

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
  goal: number;
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

export default function StackCirclePage() {
  const demoData = getDemoData();
  const group = demoData.groups[0] || null;
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

  // Calculations
  const totalUtilities = roommates.utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalMonthly = roommates.totalRent + totalUtilities;
  const allPaidRent = roommates.members.every((m) => m.paidRent);
  const allPaidUtils = roommates.members.every((m) => m.paidUtilities);
  const allPaid = allPaidRent && allPaidUtils;

  // Invite link
  const inviteLink = group ? `https://orca.app/invite/${group.code}` : '';

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (group?.code) {
      navigator.clipboard.writeText(group.code).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddMoney = () => {
    if (addMoneyAmount && !isNaN(Number(addMoneyAmount))) {
      console.log(`Added $${addMoneyAmount} to group`);
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

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] pb-32 overflow-x-hidden">
      {/* Header */}
      <motion.div
        className="border-b border-[#27272a] bg-[#09090b] px-4 sm:px-6 py-6 sm:py-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#d4a843]">
            <Users className="w-5 h-5 text-[#09090b]" />
          </div>
          <h1 className="text-3xl font-bold text-[#fafafa]">Stack Circle</h1>
        </div>
        <p className="text-sm text-[#a1a1aa]">Save together, achieve more</p>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-[#27272a] bg-[#09090b] px-4 sm:px-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('group')}
            className={`py-4 px-0 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'group'
                ? 'border-[#d4a843] text-[#d4a843]'
                : 'border-transparent text-[#71717a] hover:text-[#fafafa]'
            }`}
          >
            Group Savings
          </button>
          <button
            onClick={() => setActiveTab('roommates')}
            className={`py-4 px-0 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'roommates'
                ? 'border-[#d4a843] text-[#d4a843]'
                : 'border-transparent text-[#71717a] hover:text-[#fafafa]'
            }`}
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
            {group ? (
              <>
                {/* Group Overview Card */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl bg-gradient-to-br from-[#d4a843]/20 to-[#d4a843]/5 border border-[#d4a843]/30 p-5 sm:p-8 text-center"
                >
                  <h2 className="text-[#d4a843] font-bold text-2xl mb-4">
                    {group.name}
                  </h2>
                  <div className="text-3xl sm:text-5xl font-bold text-[#d4a843] mb-4 sm:mb-6">
                    {fmt(group.current)}
                  </div>
                  <div className="mb-6">
                    <p className="text-[#a1a1aa] text-sm mb-2">
                      Target: {fmt(group.target)}{' '}
                      <span className="text-[#d4a843] font-bold">
                        {pct(group.current, group.target)}%
                      </span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-[#27272a] rounded-full overflow-hidden mb-6">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#d4a843] to-[#d4a843]"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          (group.current / group.target) * 100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>

                  {/* Invite Code */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 inline-block">
                    <p className="text-[#71717a] text-xs mb-1">Invite Code</p>
                    <p className="font-mono font-bold text-[#d4a843]">
                      {group.code}
                    </p>
                  </div>
                </motion.div>

                {/* Invite Link Card — Discord-style */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl bg-[#18181b] border border-[#27272a] p-4 sm:p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-[#d4a843]/20">
                      <Share2 className="w-5 h-5 text-[#d4a843]" />
                    </div>
                    <div>
                      <h3 className="text-[#fafafa] font-bold text-lg">Invite Friends</h3>
                      <p className="text-[#71717a] text-sm">Share a link to join your circle</p>
                    </div>
                  </div>

                  {/* Invite Link Display */}
                  <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 mb-4">
                    <p className="text-[#71717a] text-xs mb-2 font-semibold uppercase tracking-wider">Invite Link</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 bg-[#18181b] border border-[#27272a] rounded-lg px-3 sm:px-4 py-2.5 font-mono text-xs sm:text-sm text-[#d4a843] truncate">
                        {inviteLink}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
                          copiedLink
                            ? 'bg-[#22c55e] text-[#09090b]'
                            : 'bg-[#d4a843] text-[#09090b] hover:bg-[#e5b75d]'
                        }`}
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
                      className="py-3 rounded-xl bg-[#27272a] text-[#fafafa] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#3f3f46] transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#d4a843]" />
                      Copy Code: {group.code}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowInviteModal(true)}
                      className="py-3 rounded-xl bg-[#27272a] text-[#fafafa] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#3f3f46] transition-colors"
                    >
                      <Link2 className="w-4 h-4 text-[#d4a843]" />
                      Share via...
                    </motion.button>
                  </div>

                  {/* Link Settings */}
                  <div className="mt-4 pt-4 border-t border-[#27272a]/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#a1a1aa] text-sm font-medium">Link expires in</p>
                        <p className="text-[#71717a] text-xs">Anyone with the link can join</p>
                      </div>
                      <select className="bg-[#27272a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#d4a843]">
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
                  className="rounded-2xl bg-[#18181b] border border-[#27272a] p-6"
                >
                  <h3 className="text-[#fafafa] font-bold text-lg mb-4">
                    Add Money to Group
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="$0.00"
                      value={addMoneyAmount}
                      onChange={(e) => setAddMoneyAmount(e.target.value)}
                      className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843]"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddMoney}
                      className="bg-[#d4a843] text-[#09090b] font-bold px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-[#d4a843]/30 transition-shadow"
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
                  <h3 className="text-[#fafafa] font-bold text-lg">Members</h3>
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg bg-[#18181b] border border-[#27272a] p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-[#fafafa] font-semibold">
                          {member.name}
                        </p>
                        <p className="text-[#71717a] text-sm">
                          Contributed: {fmt(member.contrib)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#d4a843] font-bold">
                          {fmt(member.balance)}
                        </p>
                        <span className="inline-block bg-[#27272a] text-[#a1a1aa] text-xs font-semibold px-3 py-1 rounded mt-1">
                          {member.role === 'coordinator'
                            ? 'Coordinator'
                            : 'Member'}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Activity Feed */}
                {group.activity && group.activity.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="space-y-3"
                  >
                    <h3 className="text-[#fafafa] font-bold text-lg">
                      Activity Feed
                    </h3>
                    {group.activity.slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className="rounded-lg bg-[#18181b] border border-[#27272a] p-4 flex gap-3"
                      >
                        <MapPin className="w-4 h-4 text-[#d4a843] flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-[#fafafa] text-sm">{act.msg}</p>
                          <p className="text-[#71717a] text-xs mt-1">{act.date}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                variants={itemVariants}
                className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-[#27272a]"
              >
                <Users className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#a1a1aa] mb-2">
                  No Groups Yet
                </h3>
                <p className="text-sm text-[#71717a] mb-6">
                  Create a group to start saving together
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#d4a843] text-[#09090b] font-bold px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-[#d4a843]/30 transition-shadow"
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
              className="rounded-2xl bg-gradient-to-br from-[#d4a843]/20 to-[#d4a843]/5 border border-[#d4a843]/30 p-5 sm:p-8 text-center"
            >
              <p className="text-[#a1a1aa] text-sm mb-2">
                Total Monthly Housing
              </p>
              <div className="text-3xl sm:text-5xl font-bold text-[#d4a843] mb-4 sm:mb-6">
                {fmt(totalMonthly)}
              </div>
              <div className="flex justify-center gap-4 sm:gap-8 mb-4 sm:mb-6">
                <div>
                  <p className="text-[#71717a] text-sm">Rent</p>
                  <p className="text-[#fafafa] font-bold text-lg">
                    {fmt(roommates.totalRent)}
                  </p>
                </div>
                <div className="w-px bg-[#27272a]" />
                <div>
                  <p className="text-[#71717a] text-sm">Utilities</p>
                  <p className="text-[#fafafa] font-bold text-lg">
                    {fmt(totalUtilities)}
                  </p>
                </div>
              </div>
              {allPaid && (
                <span className="inline-block bg-[#22c55e] text-[#09090b] text-xs font-bold px-4 py-2 rounded-full">
                  All Paid This Month
                </span>
              )}
            </motion.div>

            {/* Rent Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl bg-[#18181b] border border-[#27272a] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[#fafafa] font-bold text-lg">Rent</h3>
                <button
                  onClick={() => {
                    setEditingRent(!editingRent);
                    setRentInput(String(roommates.totalRent));
                  }}
                  className="text-[#d4a843] text-sm font-semibold hover:text-[#d4a843]/80"
                >
                  {editingRent ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {!editingRent ? (
                <p className="text-3xl font-bold text-[#d4a843]">
                  {fmt(roommates.totalRent)}
                </p>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={rentInput}
                    onChange={(e) => setRentInput(e.target.value)}
                    className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843]"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveRent}
                    className="bg-[#d4a843] text-[#09090b] font-bold px-6 py-3 rounded-lg"
                  >
                    Save
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Shared Utilities Section */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl bg-[#18181b] border border-[#27272a] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[#fafafa] font-bold text-lg">
                  Shared Utilities
                </h3>
                <button
                  onClick={() => setAddingUtility(!addingUtility)}
                  className="text-[#d4a843] text-sm font-semibold hover:text-[#d4a843]/80 flex items-center gap-1"
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
                    className="space-y-3 mb-6 pb-6 border-b border-[#27272a]"
                  >
                    <input
                      type="text"
                      placeholder="Utility name"
                      value={utilityName}
                      onChange={(e) => setUtilityName(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843]"
                    />
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="$0.00"
                        value={utilityAmount}
                        onChange={(e) => setUtilityAmount(e.target.value)}
                        className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843]"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddUtility}
                        className="bg-[#d4a843] text-[#09090b] font-bold px-6 py-3 rounded-lg"
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
                    className="flex items-center justify-between p-4 bg-[#09090b] rounded-lg border border-[#27272a]"
                  >
                    <div>
                      <p className="text-[#fafafa] font-semibold">
                        {utility.name}
                      </p>
                      <p className="text-[#71717a] text-sm">{fmt(utility.amount)}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveUtility(utility.id)}
                      className="text-[#ef4444] hover:text-[#ef4444]/80 transition-colors"
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
              className="rounded-2xl bg-[#18181b] border border-[#27272a] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[#fafafa] font-bold text-lg">Roommates</h3>
                <button
                  onClick={() => setAddingMember(!addingMember)}
                  className="text-[#d4a843] text-sm font-semibold hover:text-[#d4a843]/80 flex items-center gap-1"
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
                    className="flex gap-3 mb-6 pb-6 border-b border-[#27272a]"
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843]"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddMember}
                      className="bg-[#d4a843] text-[#09090b] font-bold px-6 py-3 rounded-lg"
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
                      className={`rounded-lg bg-[#09090b] border-2 p-4 transition-colors ${
                        isPaid
                          ? 'border-[#22c55e]/50'
                          : 'border-[#27272a]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[#fafafa] font-bold text-base">
                            {member.name}
                          </p>
                          <p className="text-[#71717a] text-sm">
                            Share: {member.share}% · Owes {fmt(totalShare)}/mo
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded ${
                            isPaid
                              ? 'bg-[#22c55e] text-[#09090b]'
                              : 'bg-[#eab308] text-[#09090b]'
                          }`}
                        >
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4 text-sm text-[#a1a1aa]">
                        <p>Rent share: {fmt(rentShare)}</p>
                        <p>Utilities share: {fmt(utilsShare)}</p>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleRentPaid(member.id)}
                          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                            member.paidRent
                              ? 'bg-[#22c55e] text-[#09090b]'
                              : 'bg-[#27272a] text-[#fafafa] hover:bg-[#3f3f46]'
                          }`}
                        >
                          {member.paidRent ? '✓ Rent Paid' : 'Mark Rent Paid'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleToggleUtilsPaid(member.id)}
                          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                            member.paidUtilities
                              ? 'bg-[#22c55e] text-[#09090b]'
                              : 'bg-[#27272a] text-[#fafafa] hover:bg-[#3f3f46]'
                          }`}
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
                            className="flex-1 bg-[#18181b] border border-[#27272a] rounded px-3 py-2 text-[#fafafa] text-sm focus:outline-none focus:border-[#d4a843]"
                          />
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-[#ef4444] hover:text-[#ef4444]/80 transition-colors p-2"
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
                className="rounded-2xl bg-[#18181b] border border-[#27272a] p-6"
              >
                <h3 className="text-[#fafafa] font-bold text-lg mb-4">
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
                        className="flex items-center justify-between p-3 rounded-lg bg-[#09090b] border border-[#27272a]"
                      >
                        <p className="text-[#fafafa]">{member.name}</p>
                        <p
                          className={`font-bold ${
                            isPaid ? 'text-[#22c55e]' : 'text-[#fafafa]'
                          }`}
                        >
                          {isPaid && '✓ '} {fmt(totalShare)}
                        </p>
                      </div>
                    );
                  })}
                  <div className="border-t border-[#27272a] pt-3 mt-3 flex items-center justify-between">
                    <p className="text-[#fafafa] font-bold">Total</p>
                    <p className="text-[#d4a843] font-bold text-lg">
                      {fmt(totalMonthly)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* Share Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#18181b] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[#fafafa] font-bold text-lg">Share Invite</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#a1a1aa]" />
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
                  className="w-full p-4 rounded-xl bg-[#27272a] text-[#fafafa] flex items-center gap-3 hover:bg-[#3f3f46] transition-colors"
                >
                  <Copy className="w-5 h-5 text-[#d4a843]" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Copy Link</p>
                    <p className="text-xs text-[#71717a]">Copy invite link to clipboard</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.open(`sms:?body=Join my ORCA Stack Circle! ${inviteLink}`, '_blank');
                    setShowInviteModal(false);
                  }}
                  className="w-full p-4 rounded-xl bg-[#27272a] text-[#fafafa] flex items-center gap-3 hover:bg-[#3f3f46] transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-[#22c55e]" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Text Message</p>
                    <p className="text-xs text-[#71717a]">Send via SMS</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.open(`mailto:?subject=Join my ORCA Stack Circle&body=Join my group savings circle! ${inviteLink}`, '_blank');
                    setShowInviteModal(false);
                  }}
                  className="w-full p-4 rounded-xl bg-[#27272a] text-[#fafafa] flex items-center gap-3 hover:bg-[#3f3f46] transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-[#3b82f6]" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Email</p>
                    <p className="text-xs text-[#71717a]">Send invite via email</p>
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
