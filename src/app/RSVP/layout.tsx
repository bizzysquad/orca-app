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
  // Pin the gold brand for the public event pages. ThemeContext rewrites
  // --gold-* on :root with the app's accent color, which would otherwise
  // clash with the hard-coded bg-gold-gradient buttons.
  const brandVars = {
    '--gold-primary': '#D4AF37',
    '--gold-highlight': '#F5D76E',
    '--gold-deep': '#8C6A1A',
  } as React.CSSProperties
  return (
    <div className="bg-brand-black min-h-screen text-text-primary" style={brandVars}>
      {children}
    </div>
  )
}
