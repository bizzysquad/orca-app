'use client'

declare global {
  interface Window {
    __ORCA_TASKS?: any[]
  }
}

import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'
import CalendarPicker from '@/components/CalendarPicker'
import {
  Plus,
  Trash2,
  Check,
  Star,
  ShoppingCart,
  Calendar,
  StickyNote,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Circle,
  CheckCircle2,
  Users,
} from 'lucide-react'

type TaskCategory = 'todo' | 'groceries' | 'meetings' | 'notes'
type TaskPriority = 'low' | 'medium' | 'high'

interface Task {
  id: string
  text: string
  completed: boolean
  category: TaskCategory
  priority: TaskPriority
  dueDate?: string
  createdAt: string
  starred: boolean
}

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  color: string
}

// Figma category config with colors
const categoryConfig: Record<TaskCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  todo: { label: 'To-Do List', icon: ListTodo, color: '#6366F1', bg: '#EEF2FF' },
  groceries: { label: 'Groceries', icon: ShoppingCart, color: '#10B981', bg: '#ECFDF5' },
  meetings: { label: 'Meetings', icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
  notes: { label: 'Quick Notes', icon: StickyNote, color: '#F59E0B', bg: '#FFFBEB' },
}

// Figma priority config with colors
const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#10B981', bg: '#ECFDF5' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFFBEB' },
  high: { label: 'High', color: '#EF4444', bg: '#FEF2F2' },
}

// Load tasks from localStorage or return empty array
const loadInitialTasks = (): Task[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('orca-tasks')
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    return []
  }
}

// Load notes from localStorage or return empty array
const loadInitialNotes = (): Note[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('orca-notes')
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    return []
  }
}

const noteColors = ['bg-[#d4a843]/20', 'bg-purple-500/20', 'bg-blue-500/20', 'bg-emerald-500/20', 'bg-pink-500/20']

// Sync tasks to global store and dispatch event for calendars
const syncTasksToCalendars = (tasks: Task[]) => {
  if (typeof window !== 'undefined') {
    window.__ORCA_TASKS = tasks
    window.dispatchEvent(new CustomEvent('orca-tasks-updated', { detail: { tasks } }))
  }
}

export default function TaskListPage() {
  const { theme } = useTheme()
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('todo')
  const [tasks, setTasks] = useState<Task[]>(loadInitialTasks)
  const [notes, setNotes] = useState<Note[]>(loadInitialNotes)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [showAddNote, setShowAddNote] = useState(false)

  // Load tasks and notes from localStorage on mount, initialize global task store
  useEffect(() => {
    syncTasksToCalendars(tasks)
  }, [tasks])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalSynced('orca-tasks', JSON.stringify(tasks))
    }
  }, [tasks])

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalSynced('orca-notes', JSON.stringify(notes))
    }
  }, [notes])

  const filteredTasks = tasks.filter(t => t.category === activeCategory)
  const activeTasks = filteredTasks.filter(t => !t.completed)
  const completedTasks = filteredTasks.filter(t => t.completed)

  const addTask = () => {
    if (!newTaskText.trim()) return
    const task: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      category: activeCategory,
      priority: newTaskPriority,
      dueDate: newTaskDue || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      starred: false,
    }
    const updatedTasks = [task, ...tasks]
    setTasks(updatedTasks)
    syncTasksToCalendars(updatedTasks)
    setNewTaskText('')
    setNewTaskDue('')
    setNewTaskPriority('medium')
  }

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    setTasks(updatedTasks)
    syncTasksToCalendars(updatedTasks)
  }

  const toggleStar = (id: string) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, starred: !t.starred } : t)
    setTasks(updatedTasks)
    syncTasksToCalendars(updatedTasks)
  }

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter(t => t.id !== id)
    setTasks(updatedTasks)
    syncTasksToCalendars(updatedTasks)
  }

  const addNote = () => {
    if (!newNoteTitle.trim()) return
    const note: Note = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      color: noteColors[Math.floor(Math.random() * noteColors.length)],
    }
    setNotes(prev => [note, ...prev])
    setNewNoteTitle('')
    setNewNoteContent('')
    setShowAddNote(false)
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const totalTasks = tasks.filter(t => t.category !== 'notes').length
  const totalCompleted = tasks.filter(t => t.completed && t.category !== 'notes').length

  // Get category counts
  const getCategoryCount = (cat: TaskCategory) => {
    if (cat === 'notes') return notes.length
    return tasks.filter(t => t.category === cat).length
  }

  const formatDueDate = (date?: string) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { text: 'Overdue', className: `text-[${theme.bad}]` }
    if (diffDays === 0) return { text: 'Today', className: `text-[${theme.gold}]` }
    if (diffDays === 1) return { text: 'Tomorrow', className: 'text-blue-400' }
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: `text-[${theme.textM}]` }
  }

  const pct = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-screen overflow-x-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A' }}>Task List & Reminders</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Stay organized with notes, tasks, groceries, and meetings
        </p>
      </div>

      {/* Category cards - 4 column grid with per-category colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.entries(categoryConfig) as [TaskCategory, typeof categoryConfig[TaskCategory]][]).map(([key, cfg]) => {
          const active = activeCategory === key
          const Icon = cfg.icon
          const count = getCategoryCount(key)
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className="rounded-2xl p-5 text-left transition-all hover:shadow-sm"
              style={{
                background: active ? cfg.color : '#FFFFFF',
                border: `2px solid ${active ? cfg.color : '#E2E8F0'}`,
                transform: active ? 'translateY(-1px)' : 'none',
                boxShadow: active ? `0 4px 16px ${cfg.color}30` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: active ? '#fff' : cfg.color }} />
                <span
                  className="text-xs"
                  style={{ fontWeight: 700, color: active ? '#fff' : cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {key === 'todo' ? 'To-Do' : key}
                </span>
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: active ? '#fff' : '#0F172A',
                  lineHeight: 1,
                }}
              >
                {count}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: active ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}
              >
                {cfg.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Overall Progress */}
      {activeCategory !== 'notes' && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>Overall Progress</span>
            <span className="text-sm" style={{ color: '#6366F1', fontWeight: 700 }}>
              {totalCompleted}/{totalTasks} completed
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#F1F5F9' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)' }}
            />
          </div>
          <div className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>{pct}% complete</div>
        </div>
      )}

      {/* Notes View */}
      {activeCategory === 'notes' && (
        <div className="space-y-4">
          {/* Add Note */}
          {!showAddNote ? (
            <button
              onClick={() => setShowAddNote(true)}
              className="w-full rounded-2xl py-12 text-center transition-all hover:bg-opacity-50"
              style={{ background: '#FFFFFF', border: '2px dashed #CBD5E1' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: categoryConfig.notes.bg }}
              >
                <StickyNote className="w-6 h-6" style={{ color: categoryConfig.notes.color }} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                Add a note
              </p>
              <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>
                Click to get started
              </p>
            </button>
          ) : (
            <div
              className="rounded-2xl p-5"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
            >
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  className="w-full text-sm font-semibold outline-none"
                  style={{
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '10px 12px',
                    borderRadius: '8px',
                  }}
                  autoFocus
                />
                <textarea
                  placeholder="Write your note..."
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  rows={3}
                  className="w-full text-sm outline-none resize-none"
                  style={{
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '10px 12px',
                    borderRadius: '8px',
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddNote(false)}
                    className="px-3 py-1.5 text-xs rounded-lg transition-all hover:opacity-60"
                    style={{ color: '#94A3B8' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNote}
                    disabled={!newNoteTitle.trim()}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#F59E0B', color: '#fff' }}
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes Grid */}
          {notes.length === 0 && (
            <div
              className="rounded-2xl py-12 text-center"
              style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1' }}
            >
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                No notes yet
              </p>
              <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>
                Add one above to get started
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map(note => (
              <div
                key={note.id}
                className="rounded-2xl p-5 group"
                style={{
                  backgroundColor: note.color,
                  border: '1px solid #E2E8F0',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 style={{ color: '#0F172A' }} className="text-sm font-bold">{note.title}</h3>
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={{ color: '#EF4444' }}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-70 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p style={{ color: '#374151' }} className="text-xs leading-relaxed">{note.content}</p>
                <p style={{ color: '#94A3B8' }} className="text-[10px] mt-3">{note.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Views (todo, groceries, meetings) */}
      {activeCategory !== 'notes' && (
        <div className="space-y-4">
          {/* Add Task Input */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
          >
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={`Add a ${activeCategory === 'todo' ? 'task' : activeCategory === 'groceries' ? 'grocery item' : activeCategory === 'meetings' ? 'meeting' : 'note'}...`}
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
              />
              <button
                onClick={addTask}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: '#6366F1', color: '#fff', fontWeight: 700 }}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#94A3B8', fontWeight: 600 }}>Priority:</span>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                  const cfg = priorityConfig[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className="px-2.5 py-1 rounded-lg text-xs capitalize transition-all"
                      style={{
                        background: newTaskPriority === p ? cfg.color : cfg.bg,
                        color: newTaskPriority === p ? '#fff' : cfg.color,
                        fontWeight: newTaskPriority === p ? 700 : 500,
                      }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs outline-none"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#374151' }}
                />
              </div>
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-2.5">
            {activeTasks.length === 0 && (
              <div
                className="rounded-2xl py-12 text-center"
                style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: categoryConfig[activeCategory].bg }}
                >
                  {(() => {
                    const Icon = categoryConfig[activeCategory].icon
                    return <Icon className="w-6 h-6" style={{ color: categoryConfig[activeCategory].color }} />
                  })()}
                </div>
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  No {activeCategory === 'todo' ? 'tasks' : activeCategory} yet
                </p>
                <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>
                  Add one above to get started
                </p>
              </div>
            )}

            {/* Pending tasks */}
            {activeTasks.map((task) => {
              const pCfg = priorityConfig[task.priority]
              const due = formatDueDate(task.dueDate)
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-5 rounded-2xl transition-all hover:shadow-sm group"
                  style={{ background: '#FFFFFF', border: '2px solid #E2E8F0' }}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="flex-shrink-0 transition-all hover:opacity-70"
                  >
                    <Circle className="w-5 h-5" style={{ color: '#CBD5E1' }} />
                  </button>

                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: pCfg.color }}
                    title={`${pCfg.label} priority`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>{task.text}</div>
                  </div>

                  {due && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                      <span className="text-xs" style={{ color: '#94A3B8' }}>{due.text}</span>
                    </div>
                  )}

                  <span
                    className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                    style={{ background: pCfg.bg, color: pCfg.color, fontWeight: 600 }}
                  >
                    {pCfg.label}
                  </span>

                  <button
                    onClick={() => toggleStar(task.id)}
                    style={{
                      color: task.starred ? '#F59E0B' : '#CBD5E1',
                      opacity: task.starred ? 1 : 0,
                    }}
                    className="transition-all group-hover:opacity-100 flex-shrink-0"
                  >
                    <Star size={14} fill={task.starred ? '#F59E0B' : 'none'} />
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1" style={{ background: '#E2E8F0' }} />
                  <span className="text-xs px-3" style={{ color: '#94A3B8', fontWeight: 600 }}>
                    COMPLETED ({completedTasks.length})
                  </span>
                  <div className="h-px flex-1" style={{ background: '#E2E8F0' }} />
                </div>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-5 rounded-2xl transition-all group"
                    style={{ background: '#F0FDF4', border: '2px solid #BBF7D0', opacity: 0.75 }}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex-shrink-0 transition-all hover:opacity-70"
                    >
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm"
                        style={{ fontWeight: 500, color: '#6B7280', textDecoration: 'line-through' }}
                      >
                        {task.text}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
