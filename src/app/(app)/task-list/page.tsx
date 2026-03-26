'use client'

declare global {
  interface Window {
    __ORCA_TASKS?: any[]
  }
}

import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
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

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ElementType }> = {
  todo: { label: 'To-Do List', icon: ListTodo },
  groceries: { label: 'Groceries', icon: ShoppingCart },
  meetings: { label: 'Meetings', icon: Calendar },
  notes: { label: 'Quick Notes', icon: StickyNote },
}

const priorityConfig: Record<TaskPriority, { label: string }> = {
  low: { label: 'Low' },
  medium: { label: 'Medium' },
  high: { label: 'High' },
}

const initialTasks: Task[] = []

const initialNotes: Note[] = []

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
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [showAddNote, setShowAddNote] = useState(false)

  // Initialize global task store on mount
  useEffect(() => {
    syncTasksToCalendars(tasks)
  }, [])

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

  const getCategoryColor = (category: TaskCategory) => {
    const colors: Record<TaskCategory, string> = {
      todo: theme.gold,
      groceries: '#4ade80',
      meetings: '#60a5fa',
      notes: '#a78bfa',
    }
    return colors[category]
  }

  const getCategoryBgColor = (category: TaskCategory) => {
    const colors: Record<TaskCategory, string> = {
      todo: `rgba(212,168,67,0.1)`,
      groceries: 'rgba(74,222,128,0.1)',
      meetings: 'rgba(96,165,250,0.1)',
      notes: 'rgba(167,139,250,0.1)',
    }
    return colors[category]
  }

  const getPriorityColor = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, string> = {
      low: theme.textM,
      medium: theme.gold,
      high: theme.bad,
    }
    return colors[priority]
  }

  return (
    <div style={{ color: theme.text }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ color: theme.text }} className="text-2xl font-bold">Task List & Reminders</h1>
        <p style={{ color: theme.textM }} className="text-sm mt-1">Stay organized with notes, tasks, groceries, and meetings</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(categoryConfig) as TaskCategory[]).map(cat => {
          const config = categoryConfig[cat]
          const Icon = config.icon
          const count = cat === 'notes' ? notes.length : tasks.filter(t => t.category === cat && !t.completed).length
          const color = getCategoryColor(cat)
          const bgColor = getCategoryBgColor(cat)
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                borderColor: activeCategory === cat ? theme.gold : theme.border,
                backgroundColor: activeCategory === cat ? theme.goldBg : theme.bgS,
              }}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:opacity-80"
            >
              <div style={{ backgroundColor: bgColor }} className="p-2 rounded-lg">
                <Icon size={16} style={{ color }} />
              </div>
              <div className="text-left">
                <p style={{ color: theme.text }} className="text-lg font-bold">{count}</p>
                <p style={{ color: theme.textM }} className="text-[10px] uppercase tracking-wider">{config.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress Bar */}
      {activeCategory !== 'notes' && (
        <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: theme.textM }} className="text-xs">Overall Progress</span>
            <span style={{ color: theme.gold }} className="text-xs font-semibold">{totalCompleted}/{totalTasks} completed</span>
          </div>
          <div style={{ backgroundColor: theme.border }} className="w-full h-2 rounded-full overflow-hidden">
            <div
              style={{
                width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%`,
                background: `linear-gradient(to right, ${theme.gold}, ${theme.goldD})`,
              }}
              className="h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      )}

      {/* Notes View */}
      {activeCategory === 'notes' && (
        <div className="space-y-4">
          {/* Add Note */}
          {!showAddNote ? (
            <button
              onClick={() => setShowAddNote(true)}
              style={{
                borderColor: theme.border,
                color: theme.textM,
              }}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed hover:border-opacity-40 transition-all"
            >
              <Plus size={18} /> Add a note
            </button>
          ) : (
            <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.text,
                  borderBottomColor: theme.border,
                }}
                className="w-full border-b pb-2 placeholder-opacity-50 focus:outline-none text-sm font-semibold"
                autoFocus
              />
              <textarea
                placeholder="Write your note..."
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                rows={3}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.text,
                }}
                className="w-full placeholder-opacity-50 focus:outline-none text-sm resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddNote(false)}
                  style={{ color: theme.textM }}
                  className="px-3 py-1.5 text-xs hover:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addNote}
                  disabled={!newNoteTitle.trim()}
                  style={{ backgroundColor: theme.gold, color: theme.bg }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map(note => (
              <div
                key={note.id}
                style={{
                  backgroundColor: note.color,
                  borderColor: theme.border,
                }}
                className="border rounded-xl p-4 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 style={{ color: theme.text }} className="text-sm font-bold">{note.title}</h3>
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={{ color: theme.textM }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p style={{ color: theme.textS }} className="text-xs leading-relaxed">{note.content}</p>
                <p style={{ color: theme.textM }} className="text-[10px] mt-3">{note.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Views (todo, groceries, meetings) */}
      {activeCategory !== 'notes' && (
        <div className="space-y-4">
          {/* Add Task Input */}
          <div style={{ backgroundColor: theme.card, borderColor: theme.border }} className="border rounded-xl p-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Add ${activeCategory === 'groceries' ? 'an item' : activeCategory === 'meetings' ? 'a meeting' : 'a task'}...`}
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.text,
                }}
                className="flex-1 placeholder-opacity-50 focus:outline-none text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTaskText.trim()}
                style={{ backgroundColor: theme.gold, color: theme.bg }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {/* Options row */}
            <div style={{ borderTopColor: theme.border }} className="flex items-center gap-3 mt-2 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <span style={{ color: theme.textM }} className="text-[10px]">Priority:</span>
                {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    style={{
                      color: newTaskPriority === p ? getPriorityColor(p) : theme.textM,
                      backgroundColor: newTaskPriority === p ? 'rgba(255,255,255,0.1)' : 'transparent',
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium transition-all hover:opacity-80"
                  >
                    {priorityConfig[p].label}
                  </button>
                ))}
              </div>
              {activeCategory !== 'groceries' && (
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.textM,
                  }}
                  className="text-[10px] focus:outline-none cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Active Tasks */}
          <div className="space-y-1">
            {activeTasks.sort((a, b) => {
              if (a.starred !== b.starred) return a.starred ? -1 : 1
              const pOrder = { high: 0, medium: 1, low: 2 }
              return pOrder[a.priority] - pOrder[b.priority]
            }).map(task => {
              const due = formatDueDate(task.dueDate)
              return (
                <div key={task.id} style={{ color: theme.text }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] group transition-all">
                  <button
                    onClick={() => toggleTask(task.id)}
                    style={{
                      borderColor: theme.border,
                    }}
                    className="w-5 h-5 rounded-md border-2 hover:opacity-80 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    {task.completed && <Check size={12} style={{ color: theme.gold }} />}
                  </button>
                  <div style={{ backgroundColor: getPriorityColor(task.priority) }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{task.text}</span>
                  {due && (
                    <span style={{ color: due.className.includes('bad') ? theme.bad : due.className.includes('gold') ? theme.gold : theme.textM }} className="text-[10px] flex items-center gap-1">
                      {due.text === 'Overdue' ? <AlertCircle size={10} /> : <Clock size={10} />}
                      {due.text}
                    </span>
                  )}
                  <button
                    onClick={() => toggleStar(task.id)}
                    style={{
                      color: task.starred ? theme.gold : theme.border,
                      opacity: task.starred ? 1 : 0,
                    }}
                    className="transition-all group-hover:opacity-100"
                  >
                    <Star size={14} fill={task.starred ? theme.gold : 'none'} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{ color: theme.border }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            {activeTasks.length === 0 && (
              <div style={{ color: theme.textM }} className="text-center py-8">
                <ListTodo size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active {activeCategory === 'groceries' ? 'items' : activeCategory === 'meetings' ? 'meetings' : 'tasks'}</p>
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                style={{ color: theme.textM }}
                className="flex items-center gap-2 text-xs hover:opacity-60 transition-colors mb-2"
              >
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Completed ({completedTasks.length})
              </button>
              {showCompleted && (
                <div style={{ color: theme.textM, opacity: 0.6 }} className="space-y-1">
                  {completedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] group transition-all">
                      <button
                        onClick={() => toggleTask(task.id)}
                        style={{
                          borderColor: theme.gold,
                          backgroundColor: 'rgba(212,168,67,0.2)',
                        }}
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                      >
                        <Check size={12} style={{ color: theme.gold }} />
                      </button>
                      <span className="flex-1 text-sm line-through truncate">{task.text}</span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{ color: theme.border }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
