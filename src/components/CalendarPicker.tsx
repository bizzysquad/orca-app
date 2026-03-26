'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ backgroundColor: theme.bg, borderColor: theme.border, color: value ? theme.text : `${theme.textM}80` }}
        className="w-full px-4 py-2.5 border rounded-lg text-left flex items-center justify-between focus:outline-none text-sm"
      >
        <span>{value ? fmtD(value) : placeholder}</span>
        <Calendar size={16} style={{ color: theme.textM }} />
      </button>

      {open && (
        <div
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-xl p-4 shadow-xl"
        >
          {/* Quick Select Buttons */}
          {showQuickSelect && (
            <div className="flex gap-2 mb-3">
              {[
                { label: '1st', day: 1 },
                { label: '15th', day: 15 },
                { label: 'Last', day: daysInMonth },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    const m = String(month + 1).padStart(2, '0')
                    const d = String(opt.day).padStart(2, '0')
                    selectDate(`${year}-${m}-${d}`)
                  }}
                  style={{ backgroundColor: `${theme.gold}15`, color: theme.gold, borderColor: `${theme.gold}30` }}
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border hover:opacity-80 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} style={{ color: theme.textM }} className="p-1">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold" style={{ color: theme.text }}>
              {new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button type="button" onClick={nextMonth} style={{ color: theme.textM }} className="p-1">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-semibold py-0.5" style={{ color: theme.textM }}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
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
                  className="aspect-square rounded-md flex items-center justify-center text-xs transition-all hover:opacity-80"
                  style={{
                    backgroundColor: isSelected ? theme.gold : isToday ? `${theme.gold}20` : 'transparent',
                    color: isSelected ? theme.bg : isToday ? theme.gold : theme.text,
                    fontWeight: isSelected || isToday ? 600 : 400,
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
