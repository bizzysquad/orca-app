import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_OF_WEEK = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface CalendarPickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (val: string) => void;
  placeholder?: string;
  minDate?: string;
  label?: string;
}

export function CalendarPicker({ value, onChange, placeholder = 'Select date', label }: CalendarPickerProps) {
  const { isDark, currentTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse value or default to today
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatDisplay = (v: string) => {
    if (!v) return '';
    const d = new Date(v + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSelect = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const numDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  const card = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '#334155' : '#E2E8F0';
  const txt = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const teal = currentTheme.primary;

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="block text-xs mb-1.5" style={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </label>
      )}
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-left transition-all"
        style={{ background: inputBg, border: `1px solid ${open ? teal : cardBorder}`, color: value ? txt : muted, outline: 'none' }}
      >
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: open ? teal : muted }} />
        <span className="flex-1">{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-xs px-1.5 rounded"
            style={{ color: muted, fontSize: 10 }}
          >✕</button>
        )}
      </button>

      {/* Popout */}
      {open && (
        <div
          className="absolute z-50 mt-2 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: card,
            border: `1px solid ${cardBorder}`,
            minWidth: 300,
            left: 0,
            boxShadow: isDark ? '0 25px 50px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? '#0F172A' : '#F0F9FC' }}>
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: teal }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: teal }} />
              <span style={{ fontWeight: 700, color: txt, fontSize: 15 }}>{MONTHS[viewMonth]} {viewYear}</span>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: teal }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4">
            {/* Days of week */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs py-1" style={{ color: muted, fontWeight: 700 }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                const isSelected = selectedDay === day;
                const isToday = todayDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className="flex items-center justify-center rounded-xl text-sm transition-all hover:scale-105"
                    style={{
                      height: 36,
                      background: isSelected ? teal : isToday ? (isDark ? '#164E63' : '#E0F9FC') : 'transparent',
                      color: isSelected ? '#fff' : isToday ? teal : txt,
                      fontWeight: isSelected || isToday ? 700 : 400,
                      border: isToday && !isSelected ? `1px solid ${teal}` : 'none',
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Today button */}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${cardBorder}` }}>
              <button
                type="button"
                onClick={() => {
                  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
                  setViewYear(y); setViewMonth(m);
                  const mm = String(m + 1).padStart(2,'0'), dd = String(d).padStart(2,'0');
                  onChange(`${y}-${mm}-${dd}`);
                  setOpen(false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: isDark ? '#164E63' : '#E0F9FC', color: teal, fontWeight: 700 }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: isDark ? '#334155' : '#F1F5F9', color: muted, fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}