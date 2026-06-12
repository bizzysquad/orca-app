import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book MaskOff DJ | Professional DJ Services',
  description: 'Book MaskOff for your next event — weddings, parties, corporate events, and more. View availability and get an instant quote.',
  openGraph: {
    title: 'Book MaskOff DJ',
    description: 'Professional DJ for weddings, parties, and corporate events in the Durham/Raleigh area.',
  },
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children
}
