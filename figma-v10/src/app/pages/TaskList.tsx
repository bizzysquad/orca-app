import { useState } from 'react';
import {
  Plus, CheckCircle2, Circle, Trash2, Calendar,
  ShoppingCart, Users, StickyNote, ListTodo, ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type Priority = 'low' | 'medium' | 'high';
type Category = 'todo' | 'groceries' | 'meetings' | 'notes';

interface Task {
  id: number;
  text: string;
  priority: Priority;
  dueDate?: string;
  done: boolean;
  category: Category;
}

const initialTasks: Task[] = [
  { id: 1, text: 'Get car wash', priority: 'medium', dueDate: 'Mar 29', done: false, category: 'todo' },
];

const categoryConfig = {
  todo: { label: 'To-Do List', icon: ListTodo, color: '#6366F1', bg: '#EEF2FF' },
  groceries: { label: 'Groceries', icon: ShoppingCart, color: '#10B981', bg: '#ECFDF5' },
  meetings: { label: 'Meetings', icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
  notes: { label: 'Quick Notes', icon: StickyNote, color: '#F59E0B', bg: '#FFFBEB' },
};

const priorityConfig = {
  low: { color: '#10B981', bg: '#ECFDF5', label: 'Low' },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium' },
  high: { color: '#EF4444', bg: '#FEF2F2', label: 'High' },
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeCategory, setActiveCategory] = useState<Category>('todo');
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  const filtered = tasks.filter((t) => t.category === activeCategory);
  const completed = filtered.filter((t) => t.done).length;
  const total = filtered.length;

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: newTask.trim(),
        priority,
        dueDate: dueDate || undefined,
        done: false,
        category: activeCategory,
      },
    ]);
    setNewTask('');
    setDueDate('');
  };

  const toggleTask = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id: number) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Category counts
  const counts = Object.fromEntries(
    (Object.keys(categoryConfig) as Category[]).map((k) => [
      k,
      tasks.filter((t) => t.category === k).length,
    ])
  );

  const { isDark } = useTheme();

  return (
    <div className="w-full min-h-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A' }}>Task List & Reminders</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Stay organized with notes, tasks, groceries, and meetings
          </p>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(Object.entries(categoryConfig) as [Category, typeof categoryConfig[Category]][]).map(([key, cfg]) => {
            const active = activeCategory === key;
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className="rounded-2xl p-4 text-left transition-all hover:shadow-sm"
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
                  {counts[key]}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: active ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}
                >
                  {cfg.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ fontWeight: 600, color: '#0F172A' }}>Overall Progress</span>
            <span className="text-sm" style={{ color: '#6366F1', fontWeight: 700 }}>
              {completed}/{total} completed
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

        {/* Add task */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder={`Add a ${activeCategory === 'todo' ? 'task' : activeCategory === 'notes' ? 'note' : activeCategory.slice(0, -1)}...`}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
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
              {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                const cfg = priorityConfig[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="px-2.5 py-1 rounded-lg text-xs capitalize transition-all"
                    style={{
                      background: priority === p ? cfg.color : cfg.bg,
                      color: priority === p ? '#fff' : cfg.color,
                      fontWeight: priority === p ? 700 : 500,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs outline-none"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#374151' }}
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <div
              className="rounded-2xl py-12 text-center"
              style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: categoryConfig[activeCategory].bg }}
              >
                {(() => {
                  const Icon = categoryConfig[activeCategory].icon;
                  return <Icon className="w-6 h-6" style={{ color: categoryConfig[activeCategory].color }} />;
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
          {filtered.filter((t) => !t.done).map((task) => {
            const pCfg = priorityConfig[task.priority];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:shadow-sm group"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
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

                {task.dueDate && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{task.dueDate}</span>
                  </div>
                )}

                <span
                  className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                  style={{ background: pCfg.bg, color: pCfg.color, fontWeight: 600 }}
                >
                  {pCfg.label}
                </span>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* Completed tasks */}
          {filtered.filter((t) => t.done).length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1" style={{ background: '#E2E8F0' }} />
                <span className="text-xs px-3" style={{ color: '#94A3B8', fontWeight: 600 }}>
                  COMPLETED ({filtered.filter((t) => t.done).length})
                </span>
                <div className="h-px flex-1" style={{ background: '#E2E8F0' }} />
              </div>
              {filtered.filter((t) => t.done).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-4 rounded-2xl transition-all group"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', opacity: 0.75 }}
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
    </div>
  );
}