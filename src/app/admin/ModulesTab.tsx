'use client'

import { motion } from 'framer-motion'
import { Puzzle, Ban, Users, ListTodo, FileText, ShoppingCart, Calendar, CheckCircle } from 'lucide-react'
import { GOLD, BG_DARK, BG_CARD, BORDER_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './types'

interface Props {
  activeSubTab: string | null
  modules: Array<{ id: string; name: string; enabled: boolean }>
  handleModuleToggle: (moduleId: string) => void
  moduleConfigs: Record<string, Record<string, any>>
  handleModuleConfigChange: (moduleId: string, key: string, value: any) => void
  stackCircleGroups: Array<{ id: string; name: string; members: number; status: string }>
  setStackCircleGroups: (groups: Array<{ id: string; name: string; members: number; status: string }>) => void
}

export default function ModulesTab({
  activeSubTab,
  modules,
  handleModuleToggle,
  moduleConfigs,
  handleModuleConfigChange,
  stackCircleGroups,
  setStackCircleGroups,
}: Props) {
  return (
    <>
      {/* Section 1: Modules Sub-Tab */}
      {activeSubTab === 'modules' && (
        <div className="space-y-6">
          {/* Module Toggle Cards */}
          <div className="grid grid-cols-2 gap-6">
            {modules.map((module) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  backgroundColor: BG_CARD,
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                {/* Module Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div style={{ color: GOLD }}>
                      <Puzzle size={24} />
                    </div>
                    <span style={{ color: TEXT_PRIMARY }} className="font-semibold text-lg">
                      {module.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleModuleToggle(module.id)}
                    style={{
                      backgroundColor: module.enabled ? GOLD : '#333',
                      color: module.enabled ? BG_DARK : TEXT_SECONDARY,
                      border: `1px solid ${BORDER_COLOR}`,
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-colors duration-200 hover:opacity-90"
                  >
                    {module.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Module Config Section - Shows when enabled */}
                {module.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    style={{
                      borderTop: `1px solid ${BORDER_COLOR}`,
                      paddingTop: '16px',
                    }}
                    className="space-y-4"
                  >
                    {/* Smart Stack Config */}
                    {module.id === 'smart-stack' && (
                      <>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Bills/Rent %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={moduleConfigs[module.id]?.billsRentPercent ?? 30}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'billsRentPercent', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Savings %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={moduleConfigs[module.id]?.savingsPercent ?? 20}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'savingsPercent', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Spending %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={moduleConfigs[module.id]?.spendingPercent ?? 50}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'spendingPercent', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.autoLockBudget ?? false}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'autoLockBudget', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Auto-Lock Budget
                          </span>
                        </label>
                      </>
                    )}

                    {/* Bill Boss Config */}
                    {module.id === 'bill-boss' && (
                      <>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Reminder Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={moduleConfigs[module.id]?.reminderDays ?? 3}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'reminderDays', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.lateFeeAlert ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'lateFeeAlert', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Late Fee Alert
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.receiptUpload ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'receiptUpload', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Receipt Upload
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.rentTracker ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'rentTracker', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Rent Tracker
                          </span>
                        </label>
                      </>
                    )}

                    {/* Stack Circle Config */}
                    {module.id === 'stack-circle' && (
                      <>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Max Group Size
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="100"
                            value={moduleConfigs[module.id]?.maxGroupSize ?? 20}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'maxGroupSize', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Max Groups
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={moduleConfigs[module.id]?.maxGroups ?? 10}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'maxGroups', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.contentModeration ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'contentModeration', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Content Moderation
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.inviteOnly ?? false}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'inviteOnly', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Invite Only
                          </span>
                        </label>
                      </>
                    )}

                    {/* Task Lists Config */}
                    {module.id === 'task-lists' && (
                      <>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Max To-Do Items
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={moduleConfigs[module.id]?.maxTodoItems ?? 100}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'maxTodoItems', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label style={{ color: TEXT_SECONDARY }} className="block text-sm mb-2">
                            Max Grocery Lists
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={moduleConfigs[module.id]?.maxGroceryLists ?? 20}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'maxGroceryLists', parseInt(e.target.value))
                            }
                            style={{
                              backgroundColor: BG_DARK,
                              color: TEXT_PRIMARY,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.meetingReminders ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'meetingReminders', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Meeting Reminders
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.quickNotes ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'quickNotes', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Quick Notes
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfigs[module.id]?.taskSharing ?? true}
                            onChange={(e) =>
                              handleModuleConfigChange(module.id, 'taskSharing', e.target.checked)
                            }
                            className="w-4 h-4 rounded"
                          />
                          <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                            Task Sharing
                          </span>
                        </label>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Stack Circle Groups Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              backgroundColor: BG_CARD,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
              Stack Circle Groups
            </h3>
            <div className="space-y-3">
              {stackCircleGroups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    backgroundColor: BG_DARK,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} style={{ color: GOLD }} />
                    <div>
                      <p style={{ color: TEXT_PRIMARY }} className="font-medium">
                        {group.name}
                      </p>
                      <p style={{ color: TEXT_MUTED }} className="text-sm">
                        {group.members} members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        backgroundColor: group.status === 'active' ? 'rgba(200, 150, 50, 0.1)' : 'rgba(255, 50, 50, 0.1)',
                        color: group.status === 'active' ? GOLD : '#ff3232',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {group.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                    <button
                      onClick={() => {
                        const updatedGroups = stackCircleGroups.map((g) =>
                          g.id === group.id
                            ? { ...g, status: g.status === 'active' ? 'suspended' : 'active' }
                            : g
                        )
                        setStackCircleGroups(updatedGroups)
                      }}
                      style={{
                        backgroundColor: group.status === 'active' ? '#ff3232' : GOLD,
                        color: group.status === 'active' ? 'white' : BG_DARK,
                        border: 'none',
                      }}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-opacity duration-200 hover:opacity-90"
                    >
                      {group.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Section 2: Task List Sub-Tab */}
      {activeSubTab === 'tasklist' && (
        <div className="space-y-6">
          {/* Task List Overview Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold mb-4">
              Task List Overview
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Active Users', value: '8', icon: Users },
                { label: 'Total Tasks', value: '47', icon: ListTodo },
                { label: 'Notes Created', value: '23', icon: FileText },
                { label: 'Grocery Lists', value: '12', icon: ShoppingCart },
              ].map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    style={{
                      backgroundColor: BG_CARD,
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: TEXT_SECONDARY }} className="text-sm">
                        {stat.label}
                      </span>
                      <Icon size={20} style={{ color: GOLD }} />
                    </div>
                    <p style={{ color: TEXT_PRIMARY }} className="text-2xl font-bold">
                      {stat.value}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Feature Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              backgroundColor: BG_CARD,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
              Feature Configuration
            </h3>
            <div className="space-y-4">
              {[
                { label: 'To-Do Lists', id: 'todoLists' },
                { label: 'Grocery Lists', id: 'groceryLists' },
                { label: 'Meeting Reminders', id: 'meetingReminders' },
                { label: 'Quick Notes', id: 'quickNotes' },
                { label: 'Task Sharing', id: 'taskSharing' },
                { label: 'Calendar Sync', id: 'calendarSync' },
              ].map((feature, idx) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor: BG_DARK,
                    border: `1px solid ${BORDER_COLOR}`,
                  }}
                >
                  <span style={{ color: TEXT_PRIMARY }} className="font-medium">
                    {feature.label}
                  </span>
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      backgroundColor: GOLD,
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                    className="relative transition-all duration-200"
                  >
                    <motion.div
                      style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Task Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              backgroundColor: BG_CARD,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
              Recent Task Activity
            </h3>
            <div className="space-y-3">
              {[
                { icon: CheckCircle, text: 'John completed "Quarterly Review"', time: '2 mins ago' },
                { icon: ListTodo, text: 'Sarah created new task list "Q1 Goals"', time: '15 mins ago' },
                { icon: ShoppingCart, text: 'Mike added items to grocery list', time: '1 hour ago' },
                { icon: Users, text: 'Emma shared task with 3 team members', time: '2 hours ago' },
                { icon: Calendar, text: 'New meeting reminder set for tomorrow', time: '3 hours ago' },
              ].map((activity, idx) => {
                const Icon = activity.icon
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: BG_DARK,
                      border: `1px solid ${BORDER_COLOR}`,
                    }}
                  >
                    <Icon size={18} style={{ color: GOLD, marginTop: '2px', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: TEXT_PRIMARY }} className="font-medium">
                        {activity.text}
                      </p>
                      <p style={{ color: TEXT_MUTED }} className="text-xs">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Category Limits Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            style={{
              backgroundColor: BG_CARD,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ color: TEXT_PRIMARY }} className="text-lg font-semibold mb-4">
              Category Limits
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}>
                    <th
                      style={{ color: TEXT_SECONDARY, textAlign: 'left', padding: '12px 0' }}
                      className="font-semibold"
                    >
                      Category
                    </th>
                    <th style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '12px 0' }} className="font-semibold">
                      Trial
                    </th>
                    <th style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '12px 0' }} className="font-semibold">
                      Premium
                    </th>
                    <th style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '12px 0' }} className="font-semibold">
                      Founding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: 'Max To-Do Items', trial: '25', premium: '100', founding: 'Unlimited' },
                    { category: 'Max Grocery Lists', trial: '3', premium: '10', founding: 'Unlimited' },
                    { category: 'Shared Lists', trial: '2', premium: '10', founding: 'Unlimited' },
                    { category: 'Meeting Reminders', trial: '5', premium: '50', founding: 'Unlimited' },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${BORDER_COLOR}`,
                        backgroundColor: idx % 2 === 0 ? 'transparent' : `rgba(${GOLD.replace('#', '')}, 0.02)`,
                      }}
                    >
                      <td style={{ color: TEXT_PRIMARY, padding: '12px 0' }} className="font-medium">
                        {row.category}
                      </td>
                      <td style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '12px 0' }}>
                        {row.trial}
                      </td>
                      <td style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '12px 0' }}>
                        {row.premium}
                      </td>
                      <td style={{ color: GOLD, textAlign: 'center', padding: '12px 0', fontWeight: '600' }}>
                        {row.founding}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
