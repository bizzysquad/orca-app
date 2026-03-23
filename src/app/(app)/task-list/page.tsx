'use client'

import { useState } from 'react'
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

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  todo: { label: 'To-Do List', icon: ListTodo, color: 'text-[#d4a843]', bgColor: 'bg-[#d4a843]/10' },
  groceries: { label: 'Groceries', icon: ShoppingCart, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  meetings: { label: 'Meetings', icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  notes: { label: 'Quick Notes', icon: StickyNote, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-[#71717a]', dot: 'bg-[#71717a]' },
  medium: { label: 'Medium', color: 'text-[#d4a843]', dot: 'bg-[#d4a843]' },
  high: { label: 'High', color: 'text-red-400', dot: 'bg-red-400' },
}

const noteColors = ['bg-[#d4a843]/20', 'bg-purple-500/20', 'bg-blue-500/20', 'bg-emerald-500/20', 'bg-pink-500/20']

// Demo data
const initialTasks: Task[] = [
  { id: '1', text: 'Review monthly budget report', completed: false, category: 'todo', priority: 'high', dueDate: '2026-03-24', createdAt: '2026-03-22', starred: true },
  { id: '2', text: 'Pay electricity bill', completed: true, category: 'todo', priority: 'medium', dueDate: '2026-03-23', createdAt: '2026-03-20', starred: false },
  { id: '3', text: 'Set up automatic savings transfer', completed: false, category: 'todo', priority: 'medium', createdAt: '2026-03-21', starred: false },
  { id: '4', text: 'Organic milk', completed: false, category: 'groceries', priority: 'low', createdAt: '2026-03-22', starred: false },
  { id: '5', text: 'Chicken breast (2 lbs)', completed: false, category: 'groceries', priority: 'low', createdAt: '2026-03-22', starred: false },
  { id: '6', text: 'Avocados (4)', completed: true, category: 'groceries', priority: 'low', createdAt: '2026-03-22', starred: false },
  { id: '7', text: 'Brown rice', completed: false, category: 'groceries', priority: 'low', createdAt: '2026-03-22', starred: false },
  { id: '8', text: 'Olive oil', completed: false, category: 'groceries', priority: 'low', createdAt: '2026-03-22', starred: false },
  { id: '9', text: 'Financial advisor - Q1 review', completed: false, category: 'meetings', priority: 'high', dueDate: '2026-03-25T10:00', createdAt: '2026-03-20', starred: true },
  { id: '10', text: 'Tax preparation call', completed: false, category: 'meetings', priority: 'high', dueDate: '2026-03-28T14:30', createdAt: '2026-03-21', starred: false },
  { id: '11', text: 'Insurance renewal discussion', completed: true, category: 'meetings', priority: 'medium', dueDate: '2026-03-20T09:00', createdAt: '2026-03-18', starred: false },
]

const initialNotes: Note[] = [
  { id: 'n1', title: 'Investment Ideas', content: 'Look into index funds, consider increasing 401k contribution by 2%. Research REIT options for passive income.', createdAt: '2026-03-22', color: noteColors[0] },
  { id: 'n2', title: 'Password Reminders', content: 'Update bank passwords this month. Enable 2FA on all financial accounts.', createdAt: '2026-03-21', color: noteColors[1] },
  { id: 'n3', title: 'Budget Notes', content: 'Dining out exceeded budget by $120 last month. Set weekly limit of $50.', createdAt: '2026-03-20', color: noteColors[2] },
]

export default function TaskListPage() {
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
    setTasks(prev => [task, ...prev])
    setNewTaskText('')
    setNewTaskDue('')
    setNewTaskPriority('medium')
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const toggleStar = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
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
    if (diffDays < 0) return { text: 'Overdue', className: 'text-red-400' }
    if (diffDays === 0) return { text: 'Today', className: 'text-[#d4a843]' }
    if (diffDays === 1) return { text: 'Tomorrow', className: 'text-blue-400' }
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'text-[#71717a]' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#fafafa]">Task List & Reminders</h1>
        <p className="text-sm text-[#71717a] mt-1">Stay organized with notes, tasks, groceries, and meetings</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(categoryConfig) as TaskCategory[]).map(cat => {
          const config = categoryConfig[cat]
          const Icon = config.icon
          const count = cat === 'notes' ? notes.length : tasks.filter(t => t.category === cat && !t.completed).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                activeCategory === cat
                  ? 'border-[#d4a843]/40 bg-[#d4a843]/5'
                  : 'border-[#27272a] bg-[#18181b]/50 hover:border-[#3f3f46]'
              }`}
            >
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon size={16} className={config.color} />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-[#fafafa]">{count}</p>
                <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{config.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress Bar */}
      {activeCategory !== 'notes' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#71717a]">Overall Progress</span>
            <span className="text-xs font-semibold text-[#d4a843]">{totalCompleted}/{totalTasks} completed</span>
          </div>
          <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d4a843] to-[#b8860b] rounded-full transition-all duration-500"
              style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
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
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#27272a] text-[#71717a] hover:border-[#d4a843]/40 hover:text-[#d4a843] transition-all"
            >
              <Plus size={18} /> Add a note
            </button>
          ) : (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                className="w-full bg-transparent border-b border-[#27272a] pb-2 text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#d4a843] text-sm font-semibold"
                autoFocus
              />
              <textarea
                placeholder="Write your note..."
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-[#fafafa] placeholder-[#71717a] focus:outline-none text-sm resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddNote(false)} className="px-3 py-1.5 text-xs text-[#71717a] hover:text-[#fafafa] transition-colors">Cancel</button>
                <button onClick={addNote} disabled={!newNoteTitle.trim()} className="px-4 py-1.5 text-xs font-semibold bg-[#d4a843] text-[#09090b] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Save Note</button>
              </div>
            </div>
          )}

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map(note => (
              <div key={note.id} className={`${note.color} border border-[#27272a] rounded-xl p-4 group`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#fafafa]">{note.title}</h3>
                  <button onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-[#71717a] hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{note.content}</p>
                <p className="text-[10px] text-[#71717a] mt-3">{note.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Views (todo, groceries, meetings) */}
      {activeCategory !== 'notes' && (
        <div className="space-y-4">
          {/* Add Task Input */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Add ${activeCategory === 'groceries' ? 'an item' : activeCategory === 'meetings' ? 'a meeting' : 'a task'}...`}
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                className="flex-1 bg-transparent text-[#fafafa] placeholder-[#71717a] focus:outline-none text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTaskText.trim()}
                className="px-3 py-1.5 bg-[#d4a843] text-[#09090b] rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {/* Options row */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#27272a]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#71717a]">Priority:</span>
                {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      newTaskPriority === p
                        ? `${priorityConfig[p].color} bg-white/10`
                        : 'text-[#71717a] hover:text-[#a1a1aa]'
                    }`}
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
                  className="bg-transparent text-[10px] text-[#71717a] focus:outline-none focus:text-[#fafafa] cursor-pointer"
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
                <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] group transition-all">
                  <button onClick={() => toggleTask(task.id)} className="w-5 h-5 rounded-md border-2 border-[#3f3f46] hover:border-[#d4a843] flex items-center justify-center flex-shrink-0 transition-colors">
                    {task.completed && <Check size={12} className="text-[#d4a843]" />}
                  </button>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityConfig[task.priority].dot}`} />
                  <span className="flex-1 text-sm text-[#fafafa] truncate">{task.text}</span>
                  {due && (
                    <span className={`text-[10px] flex items-center gap-1 ${due.className}`}>
                      {due.text === 'Overdue' ? <AlertCircle size={10} /> : <Clock size={10} />}
                      {due.text}
                    </span>
                  )}
                  <button onClick={() => toggleStar(task.id)} className={`transition-all ${task.starred ? 'text-[#d4a843]' : 'text-[#3f3f46] opacity-0 group-hover:opacity-100'}`}>
                    <Star size={14} fill={task.starred ? '#d4a843' : 'none'} />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="text-[#3f3f46] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            {activeTasks.length === 0 && (
              <div className="text-center py-8 text-[#71717a]">
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
                className="flex items-center gap-2 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors mb-2"
              >
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Completed ({completedTasks.length})
              </button>
              {showCompleted && (
                <div className="space-y-1 opacity-60">
                  {completedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] group transition-all">
                      <button onClick={() => toggleTask(task.id)} className="w-5 h-5 rounded-md border-2 border-[#d4a843] bg-[#d4a843]/20 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-[#d4a843]" />
                      </button>
                      <span className="flex-1 text-sm text-[#71717a] line-through truncate">{task.text}</span>
                      <button onClick={() => deleteTask(task.id)} className="text-[#3f3f46] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
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
