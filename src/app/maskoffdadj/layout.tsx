import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mask Off Da DJ | DJ for Hire in Raleigh, Durham, Cary & Morrisville, NC',
  description: 'Book Mask Off Da DJ for weddings, private parties, corporate events, and more in the Raleigh-Durham-Cary-Morrisville area. Check availability and request a quote.',
  verification: {
    google: 'googlecb0cf129ecdd57b9',
  },
  openGraph: {
    title: 'Mask Off Da DJ | DJ for Hire in Raleigh, Durham, Cary & Morrisville, NC',
    description: 'Book Mask Off Da DJ for weddings, private parties, corporate events, and more in the Raleigh-Durham-Cary-Morrisville area. Check availability and request a quote.',
  },
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children
}
