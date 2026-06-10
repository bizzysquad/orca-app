'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, RefreshCw,
  Target, Music, Briefcase,
  Dumbbell, DollarSign, Car, Mic2, ShoppingCart,
  Calendar, Search, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import type { BentleyMessage } from '@/lib/types'
import { fmt } from '@/lib/utils'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'

const QUICK_PROMPTS = [
  { label: "Today's plan", icon: Target, prompt: "What should I focus on today? Give me my top 3 priorities." },
  { label: "Calorie check", icon: Dumbbell, prompt: "How are my calories today? What should I eat to hit my goal?" },
  { label: "Music strategy", icon: Music, prompt: "What should I do for my music releases this week?" },
  { label: "Money check", icon: DollarSign, prompt: "How's my financial situation looking right now?" },
  { label: "Business review", icon: Briefcase, prompt: "Which of my businesses needs the most attention right now?" },
  { label: "DJ prep", icon: Mic2, prompt: "Do I have any DJ gigs coming up that need prep?" },
  { label: "Lyft strategy", icon: Car, prompt: "When should I drive Lyft this week to hit my earning goal?" },
  { label: "Grocery check", icon: ShoppingCart, prompt: "What groceries do I need? Suggest meals for muscle gain." },
  { label: "Research mode", icon: Search, prompt: "Research the best affordable high-calorie meals for muscle building." },
  { label: "Weekly plan", icon: Calendar, prompt: "Help me plan my week. I need to balance all my business areas." },
]

function buildContext(data: any): string {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push(`Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)

  // Financial
  if (data.user?.checkingBalance) lines.push(`Checking balance: $${data.user.checkingBalance}`)
  const upcomingBills = data.bills?.filter((b: any) => b.status === 'upcoming') || []
  if (upcomingBills.length > 0) {
    const total = upcomingBills.reduce((s: number, b: any) => s + b.amount, 0)
    lines.push(`Upcoming bills: ${upcomingBills.length} bills totaling $${total.toFixed(2)}`)
    const next = upcomingBills.sort((a: any, b: any) => a.due.localeCompare(b.due))[0]
    if (next) lines.push(`Next bill: ${next.name} — $${next.amount} due ${next.due}`)
  }

  // Fitness
  try {
    const wl = localStorage.getItem('orca-weight-logs')
    const ml = localStorage.getItem('orca-meal-logs')
    if (wl) {
      const logs = JSON.parse(wl).sort((a: any, b: any) => b.date.localeCompare(a.date))
      if (logs[0]) lines.push(`Current weight: ${logs[0].weight} lbs (goal: 200 lbs)`)
    }
    if (ml) {
      const meals = JSON.parse(ml).filter((m: any) => m.date === today)
      const cal = meals.reduce((s: number, m: any) => s + m.calories, 0)
      const pro = meals.reduce((s: number, m: any) => s + m.protein, 0)
      lines.push(`Today's calories: ${cal} / 3200 goal | Protein: ${pro}g / 180g goal`)
    }
  } catch {}

  // Music
  try {
    const songs = localStorage.getItem('orca-songs')
    if (songs) {
      const parsed = JSON.parse(songs)
      const pipeline = parsed.filter((s: any) => s.status !== 'released').length
      const ready = parsed.filter((s: any) => ['uploaded', 'release-date-set'].includes(s.status)).length
      lines.push(`Music: ${pipeline} songs in pipeline, ${ready} ready to release`)
    }
  } catch {}

  // Business
  try {
    const biz = localStorage.getItem('orca-businesses')
    if (biz) {
      const parsed = JSON.parse(biz)
      const tasks = parsed.reduce((s: number, b: any) => s + b.tasks.filter((t: any) => t.status !== 'done').length, 0)
      const rev = parsed.reduce((s: number, b: any) => s + b.currentMonthRevenue, 0)
      lines.push(`Business: ${parsed.length} active businesses, ${tasks} pending tasks, $${rev.toFixed(0)} this month`)
    }
  } catch {}

  // DJ
  try {
    const gigs = localStorage.getItem('orca-dj-gigs')
    if (gigs) {
      const upcoming = JSON.parse(gigs).filter((g: any) => g.status === 'confirmed' && g.date >= today)
      if (upcoming.length > 0) lines.push(`DJ: ${upcoming.length} confirmed gig(s) upcoming`)
    }
  } catch {}

  // Lyft
  try {
    const sessions = localStorage.getItem('orca-lyft-sessions')
    if (sessions) {
      const monday = new Date()
      monday.setDate(monday.getDate() - monday.getDay() + 1)
      const weekStr = monday.toISOString().slice(0, 10)
      const thisWeek = JSON.parse(sessions).filter((s: any) => s.date >= weekStr)
      const earnings = thisWeek.reduce((s: number, x: any) => s + (x.earnings || 0), 0)
      lines.push(`Lyft this week: $${earnings.toFixed(0)} earned`)
    }
  } catch {}

  // Priorities
  try {
    const p = localStorage.getItem(`orca-priorities-${today}`)
    if (p) {
      const items = JSON.parse(p)
      const done = items.filter((i: any) => i.completed).length
      lines.push(`Today's priorities: ${done}/${items.length} completed`)
    }
  } catch {}

  return lines.join('\n')
}

interface MessageBubbleProps {
  message: BentleyMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const { theme } = useTheme()
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
          style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}
        >
          <Sparkles size={13} color="#fff" />
        </div>
      )}
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3"
        style={{
          background: isUser
            ? `linear-gradient(135deg, ${BENTLEY_INDIGO}, #4F46E5)`
            : theme.card,
          border: isUser ? 'none' : `1px solid ${theme.border}`,
          color: isUser ? '#fff' : theme.text,
        }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className="text-[10px] mt-1.5 opacity-50">
          {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  const { theme } = useTheme()
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2 mb-3"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}
      >
        <Sparkles size={13} color="#fff" />
      </div>
      <div
        className="rounded-2xl px-4 py-3"
        style={{ background: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: BENTLEY_GOLD }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const STORAGE_KEY = 'orca-bentley-messages'
const MAX_HISTORY = 50

export default function BentleyPage() {
  const { theme } = useTheme()
  const { data } = useOrcaData()
  const [messages, setMessages] = useState<BentleyMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load saved messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMessages(parsed)
        if (parsed.length > 0) setShowQuickPrompts(false)
      }
    } catch {}
  }, [])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveMessages = useCallback((msgs: BentleyMessage[]) => {
    const trimmed = msgs.slice(-MAX_HISTORY)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)) } catch {}
    return trimmed
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setShowQuickPrompts(false)
    setInput('')

    const userMsg: BentleyMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => {
      const next = [...prev, userMsg]
      saveMessages(next)
      return next
    })

    setLoading(true)
    setApiMissing(false)

    try {
      const context = buildContext(data)
      const historyForApi = [...messages, userMsg]
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi, context }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 503) setApiMissing(true)
        throw new Error(json.error || 'Failed')
      }

      const assistantMsg: BentleyMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: json.message,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => {
        const next = [...prev, assistantMsg]
        saveMessages(next)
        return next
      })
    } catch (err: any) {
      const errMsg: BentleyMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: apiMissing
          ? "I'm offline right now — the DEEPSEEK_API_KEY hasn't been set. Grab a key at platform.deepseek.com, add it to .env.local, then restart. Costs almost nothing to run."
          : "Hit a snag on my end. Try again in a sec.",
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => {
        const next = [...prev, errMsg]
        saveMessages(next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [loading, messages, data, saveMessages, apiMissing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearHistory = () => {
    setMessages([])
    setShowQuickPrompts(true)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: theme.bg, color: theme.text }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 shrink-0 sticky top-0 z-10"
        style={{
          background: `${theme.bg}f0`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="p-2 rounded-xl" style={{ background: theme.card }}>
              <ArrowLeft size={16} style={{ color: theme.subtext }} />
            </div>
          </Link>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: theme.text }}>Bentley</div>
            <div className="text-[11px] flex items-center gap-1" style={{ color: BENTLEY_GOLD }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Your AI COO
            </div>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="p-2 rounded-xl text-xs"
          style={{ background: theme.card, color: theme.subtext }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        <div className="max-w-lg mx-auto">
          {/* Intro if empty */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center pt-8 pb-4"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}
              >
                <Sparkles size={28} color="#fff" />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>Bentley's on duty.</h2>
              <p className="text-sm" style={{ color: theme.subtext }}>
                Your AI Chief Operating Officer. Ask me anything about your life, business, fitness, money, music, or DJ gigs.
              </p>
            </motion.div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {loading && <TypingIndicator />}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      <AnimatePresence>
        {showQuickPrompts && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-2"
          >
            <div className="max-w-lg mx-auto">
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.subtext }}>
                Quick Start
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 text-xs font-medium"
                    style={{
                      background: theme.card,
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                    }}
                  >
                    <Icon size={12} style={{ color: BENTLEY_GOLD }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: theme.bg,
          borderTop: `1px solid ${theme.border}`,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <div
            className="flex-1 flex items-end rounded-2xl overflow-hidden"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bentley anything..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent px-4 py-3 text-sm resize-none outline-none leading-relaxed"
              style={{
                color: theme.text,
                maxHeight: 120,
                minHeight: 44,
              }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-3 rounded-2xl flex items-center justify-center shrink-0 transition-all"
            style={{
              background: input.trim() && !loading
                ? `linear-gradient(135deg, ${BENTLEY_INDIGO}, #4F46E5)`
                : theme.card,
              border: `1px solid ${input.trim() && !loading ? BENTLEY_INDIGO : theme.border}`,
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            {loading
              ? <RefreshCw size={16} style={{ color: BENTLEY_GOLD }} className="animate-spin" />
              : <Send size={16} color={input.trim() ? '#fff' : theme.subtext} />
            }
          </motion.button>
        </div>
        <p className="text-center text-[10px] mt-1.5" style={{ color: theme.subtext }}>
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
