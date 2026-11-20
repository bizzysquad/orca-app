'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Availability } from '@/lib/crooked/availability'
import AvailabilityCalendar from './AvailabilityCalendar'

export default function AvailabilitySection({ av }: { av: Availability }) {
  const [date, setDate] = useState('')
  return (
    <div className="max-w-xl mx-auto">
      <AvailabilityCalendar
        av={av}
        durationMins={av.defaultDurationMins}
        value={date}
        onChange={setDate}
        footer={d => (
          <Link href={`/crookedrumor/book?date=${d}`} className="cr-btn cr-btn-red cr-btn-sm mt-4">
            Book this date <ArrowRight size={16} strokeWidth={3} />
          </Link>
        )}
      />
      {!date && <p className="mt-3 text-center text-sm text-[var(--cr-muted)] font-semibold">Tap an open day to see times.</p>}
    </div>
  )
}
