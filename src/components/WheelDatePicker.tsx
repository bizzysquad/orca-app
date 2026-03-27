'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface WheelDatePickerProps {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void
  onClose?: () => void
  theme: any
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 5
const HALF_VISIBLE = Math.floor(VISIBLE_ITEMS / 2)

function WheelColumn({ items, selectedIndex, onChange, theme }: {
  items: string[]
  selectedIndex: number
  onChange: (index: number) => void
  theme: any
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const currentOffset = useRef(0)
  const animFrameRef = useRef<number>(0)
  const velocityRef = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)

  const getOffset = useCallback((index: number) => {
    return -(index * ITEM_HEIGHT)
  }, [])

  useEffect(() => {
    currentOffset.current = getOffset(selectedIndex)
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${currentOffset.current}px)`
    }
  }, [selectedIndex, getOffset])

  const snapToNearest = useCallback(() => {
    let index = Math.round(-currentOffset.current / ITEM_HEIGHT)
    index = Math.max(0, Math.min(items.length - 1, index))
    currentOffset.current = getOffset(index)

    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      containerRef.current.style.transform = `translateY(${currentOffset.current}px)`
      setTimeout(() => {
        if (containerRef.current) containerRef.current.style.transition = 'none'
      }, 300)
    }
    onChange(index)
  }, [items.length, getOffset, onChange])

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    startY.current = e.touches[0].clientY
    startOffset.current = currentOffset.current
    lastY.current = e.touches[0].clientY
    lastTime.current = Date.now()
    velocityRef.current = 0
    if (containerRef.current) containerRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    e.preventDefault()

    const y = e.touches[0].clientY
    const now = Date.now()
    const dt = now - lastTime.current
    if (dt > 0) {
      velocityRef.current = (y - lastY.current) / dt
    }
    lastY.current = y
    lastTime.current = now

    const diff = y - startY.current
    currentOffset.current = startOffset.current + diff

    // Clamp with rubber band
    const minOffset = getOffset(items.length - 1)
    const maxOffset = 0
    if (currentOffset.current > maxOffset) {
      currentOffset.current = maxOffset + (currentOffset.current - maxOffset) * 0.3
    } else if (currentOffset.current < minOffset) {
      currentOffset.current = minOffset + (currentOffset.current - minOffset) * 0.3
    }

    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${currentOffset.current}px)`
    }
  }

  const handleTouchEnd = () => {
    isDragging.current = false

    // Apply momentum
    if (Math.abs(velocityRef.current) > 0.3) {
      const momentum = velocityRef.current * 150
      currentOffset.current += momentum
    }

    snapToNearest()
  }

  // Mouse support for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startOffset.current = currentOffset.current
    lastY.current = e.clientY
    lastTime.current = Date.now()
    if (containerRef.current) containerRef.current.style.transition = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const diff = ev.clientY - startY.current
      currentOffset.current = startOffset.current + diff
      const minOffset = getOffset(items.length - 1)
      if (currentOffset.current > 0) currentOffset.current = currentOffset.current * 0.3
      if (currentOffset.current < minOffset) currentOffset.current = minOffset + (currentOffset.current - minOffset) * 0.3
      if (containerRef.current) containerRef.current.style.transform = `translateY(${currentOffset.current}px)`
    }

    const handleMouseUp = () => {
      isDragging.current = false
      snapToNearest()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Highlight bar for selected item */}
      <div
        className="absolute left-0 right-0 rounded-lg pointer-events-none z-10"
        style={{
          top: HALF_VISIBLE * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
          backgroundColor: `${theme.gold}15`,
          borderTop: `1px solid ${theme.gold}30`,
          borderBottom: `1px solid ${theme.gold}30`,
        }}
      />

      {/* Top/bottom fade gradients */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none" style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to bottom, ${theme.card}, ${theme.card}00)` }} />
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to top, ${theme.card}, ${theme.card}00)` }} />

      {/* Items container */}
      <div
        ref={containerRef}
        style={{ paddingTop: HALF_VISIBLE * ITEM_HEIGHT }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex
          return (
            <div
              key={i}
              className="flex items-center justify-center cursor-grab active:cursor-grabbing"
              style={{
                height: ITEM_HEIGHT,
                color: isSelected ? theme.gold : theme.textM,
                fontWeight: isSelected ? 700 : 400,
                fontSize: isSelected ? '18px' : '15px',
                opacity: isSelected ? 1 : 0.6,
                transition: 'color 0.2s, font-weight 0.2s, font-size 0.2s',
              }}
            >
              {item}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WheelDatePicker({ value, onChange, onClose, theme }: WheelDatePickerProps) {
  const now = new Date()
  const initial = value ? new Date(value + 'T00:00:00') : now

  const [month, setMonth] = useState(initial.getMonth())
  const [day, setDay] = useState(initial.getDate() - 1) // 0-indexed
  const [year, setYear] = useState(0) // index into years array

  const currentYear = now.getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i)

  useEffect(() => {
    const idx = years.indexOf(initial.getFullYear())
    setYear(idx >= 0 ? idx : 0)
  }, [])

  const daysInMonth = new Date(years[year] || currentYear, month + 1, 0).getDate()
  const dayItems = Array.from({ length: daysInMonth }, (_, i) => String(i + 1))

  // Clamp day if month/year changes
  useEffect(() => {
    if (day >= daysInMonth) setDay(daysInMonth - 1)
  }, [month, year, daysInMonth])

  const handleConfirm = () => {
    const m = String(month + 1).padStart(2, '0')
    const d = String((day < daysInMonth ? day : daysInMonth - 1) + 1).padStart(2, '0')
    const y = years[year] || currentYear
    onChange(`${y}-${m}-${d}`)
    onClose?.()
  }

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: theme.card, borderColor: theme.border, border: `1px solid ${theme.border}` }}>
      {/* Column labels */}
      <div className="grid grid-cols-3 gap-2">
        <p className="text-xs text-center font-semibold" style={{ color: theme.textM }}>Month</p>
        <p className="text-xs text-center font-semibold" style={{ color: theme.textM }}>Day</p>
        <p className="text-xs text-center font-semibold" style={{ color: theme.textM }}>Year</p>
      </div>

      {/* Wheel columns */}
      <div className="grid grid-cols-3 gap-2">
        <WheelColumn
          items={MONTHS}
          selectedIndex={month}
          onChange={setMonth}
          theme={theme}
        />
        <WheelColumn
          items={dayItems}
          selectedIndex={day}
          onChange={setDay}
          theme={theme}
        />
        <WheelColumn
          items={years.map(String)}
          selectedIndex={year}
          onChange={setYear}
          theme={theme}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: theme.bg, color: theme.textM, borderColor: theme.border }}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors hover:opacity-80"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          style={{ backgroundColor: theme.gold, color: theme.bg }}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
