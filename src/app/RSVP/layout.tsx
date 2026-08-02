import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DJ Maskoff Events | RSVP & Tickets',
  description: 'Vote on the next DJ Maskoff event, RSVP, and grab tickets.',
  openGraph: {
    title: 'DJ Maskoff Events | RSVP & Tickets',
    description: 'Vote on the next DJ Maskoff event, RSVP, and grab tickets.',
  },
}

export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-black min-h-screen text-text-primary">{children}</div>
}
