import type { Metadata } from 'next'
import { loadSite, toPublicSite } from '@/lib/crooked/db'
import SiteHeader from '../_components/SiteHeader'
import BookingFlow from './BookingFlow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Book a Shoot | Crooked Rumors' }

export default async function BookPage({ searchParams }: { searchParams: { package?: string; custom?: string } }) {
  const { site: full, dbReady } = await loadSite()
  const site = toPublicSite(full)
  return (
    <>
      <SiteHeader wordmarkUrl={site.settings.logoWordmarkUrl} />
      <BookingFlow
        site={site}
        bookingOpen={dbReady}
        initialPackageId={searchParams.package || ''}
        initialMode={searchParams.custom ? 'custom' : 'package'}
      />
    </>
  )
}
