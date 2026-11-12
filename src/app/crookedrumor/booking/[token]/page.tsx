import type { Metadata } from 'next'
import { loadSite, toPublicSite } from '@/lib/crooked/db'
import SiteHeader from '../../_components/SiteHeader'
import BookingStatus from './BookingStatus'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your Booking | Crooked Rumor', robots: { index: false } }

export default async function BookingPage({ params }: { params: { token: string } }) {
  const { site } = await loadSite()
  const s = toPublicSite(site).settings
  return (
    <>
      <SiteHeader wordmarkUrl={s.logoWordmarkUrl} />
      <BookingStatus token={params.token} successNote={s.bookingSuccessNote} contactEmail={s.contactEmail} />
    </>
  )
}
