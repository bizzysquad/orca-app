import type { Metadata, Viewport } from 'next'
import { Archivo_Black, Inter, Fraunces } from 'next/font/google'
import './spades.css'

const display = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--sp-font-display', display: 'swap' })
const body = Inter({ subsets: ['latin'], variable: '--sp-font-body', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], style: ['italic', 'normal'], weight: ['600', '800'], variable: '--sp-font-serif', display: 'swap' })

export const metadata: Metadata = {
  title: 'Spades HQ | DJ Maskoff Presents R&B Spades',
  description: 'Live bracket, scores and table check in for the DJ Maskoff Presents R&B Spades Tournament at Korner Pocket, Raleigh.',
  manifest: null,
  appleWebApp: { capable: false, title: 'Spades HQ' },
  openGraph: {
    title: 'DJ Maskoff Presents R&B Spades Tournament',
    description: 'Joker spades. Eight teams. One trophy. Follow the live bracket.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#14090b',
}

export default function SpadesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`sp-root ${display.variable} ${body.variable} ${serif.variable}`}>{children}</div>
}
