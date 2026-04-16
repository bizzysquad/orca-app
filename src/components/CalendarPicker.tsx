'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { fmtD } from '@/lib/utils'

interface CalendarPickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  theme: any
  showQuickSelect?: boolean
}

export default function CalendarPicker({ value, onChange, placeholder = 'Select Date', theme, showQuickSelect = true }: CalendarPickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => value ? new Date(value + 'T00:00:00').getMonth() : new Date().getMonth())
  const [year, setYear] = useState(() => value ? new Date(value + 'T00:00:00').getFullYear() : new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Lock body scroll when modal is open on mobile
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open, isMobile])

  // Sync month/year when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setMonth(d.getMonth())
      setYear(d.getFullYear())
    }
  }, [value])

  const prevMonth = () => {
    let m = month - 1, y = year
    if (m < 0) { m = 11; y-- }
    setMonth(m); setYear(y)
  }
  const nextMonth = () => {
    let m = month + 1, y = year
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const selectDate = (dateStr: string) => {
    onChange(dateStr)
    setOpen(false)
  }

  // Calculate popup position from trigger button rect (desktop only)
  const handleOpen = () => {
    if (!open && !isMobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const minWidth = 300
      const popupWidth = Math.max(rect.width, minWidth)
      let left = rect.left
      // Clamp so popup doesn't overflow right edge of viewport
      if (left + popupWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popupWidth - 8)
      }
      // If popup would overflow bottom, flip above the trigger
      const estimatedHeight = showQuickSelect ? 390 : 340
      const top = rect.bottom + window.scrollY + 4
      const flipTop = rect.top + window.scrollY - estimatedHeight - 4
      setPopupPos({
        top: rect.bottom + estimatedHeight > window.innerHeight ? flipTop : top,
        left,
        width: popupWidth,
      })
    }
    setOpen(prev => !prev)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const calendarContent = (
    <>
      {/* Quick Select Buttons */}
      {showQuickSelect && (
        <div className="flex gap-2 mb-4">
          {[
            { label: 'Today', day: today.getDate(), m: today.getMonth(), y: today.getFullYear() },
            { label: '1st', day: 1, m: month, y: year },
            { label: '15th', day: 15, m: month, y: year },
            { label: 'Last', day: daysInMonth, m: month, y: year },
          ].map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                const mm = String(opt.m + 1).padStart(2, '0')
                const dd = String(opt.day).padStart(2, '0')
                selectDate(`${opt.y}-${mm}-${dd}`)
              }}
              style={{ backgroundColor: `${theme.gold}15`, color: theme.gold, borderColor: `${theme.gold}30` }}
              className="flex-1 px-2 py-2 sm:py-1.5 rounded-lg text-sm sm:text-xs font-semibold border active:opacity-70 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} style={{ color: theme.textM }} className="p-2 -ml-1 rounded-lg active:opacity-60">
          <ChevronLeft size={20} />
        </button>
        <span className="text-base font-semibold" style={{ color: theme.text }}>
          {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={nextMonth} style={{ color: theme.textM }} className="p-2 -mr-1 rounded-lg active:opacity-60">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold py-1" style={{ color: theme.textM }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const m = String(month + 1).padStart(2, '0')
          const d = String(day).padStart(2, '0')
          const dateStr = `${year}-${m}-${d}`
          const isSelected = value === dateStr
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDate(dateStr)}
              className="aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all active:scale-95"
              style={{
                backgroundColor: isSelected ? theme.gold : isToday ? `${theme.gold}20` : 'transparent',
                color: isSelected ? theme.bg : isToday ? theme.gold : theme.text,
                fontWeight: isSelected || isToday ? 700 : 500,
                minHeight: 40,
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: value ? theme.text : `${theme.textM}80` }}
        className="w-full px-4 py-2.5 border rounded-lg text-left flex items-center justify-between focus:outline-none text-sm"
      >
        <span>{value ? fmtD(value) : placeholder}</span>
        <Calendar size={16} style={{ color: theme.textM }} />
      </button>

      {open && (
        <>
          {isMobile ? (
            /* ─── Mobile: Full-screen bottom sheet modal ─── */
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              {/* Backdrop */}
              <div
                ref={backdropRef}
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                onClick={() => setOpen(false)}
              />
              {/* Sheet */}
              <div
                className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl p-6 pb-8"
                style={{ backgroundColor: theme.card, borderTop: `2px solid ${theme.gold}40` }}
              >
                {/* Handle bar */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
                </div>
                {/* Header with close */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: theme.text }}>Select Date</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-xl active:opacity-60"
                    style={{ backgroundColor: `${theme.border}40` }}
                  >
                    <X size={18} style={{ color: theme.textM }} />
                  </button>
                </div>
                {calendarContent}
              </div>
            </div>
          ) : (
            /* ─── Desktop: Fixed popover (escapes overflow-hidden parents) ─── */
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
              <div
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  position: 'fixed',
                  top: popupPos?.top ?? 0,
                  left: popupPos?.left ?? 0,
                  width: popupPos?.width ?? 300,
                  minWidth: 280,
                  zIndex: 9999,
                }}
                className="border rounded-xl p-4 shadow-2xl"
              >
                {calendarContent}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
