import type { Metadata, Viewport } from 'next'
import { Archivo_Black, Inter, Fraunces } from 'next/font/google'
import './crooked.css'

const display = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--cr-font-display', display: 'swap' })
const body = Inter({ subsets: ['latin'], variable: '--cr-font-body', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], style: ['italic', 'normal'], weight: ['600', '800'], variable: '--cr-font-serif', display: 'swap' })

export const metadata: Metadata = {
  title: 'Crooked Rumor | Video Production & Content Creation',
  description: 'Interviews, event recaps, and Instagram reels with straight up pricing. Book a shoot online with Crooked Rumor.',
  icons: { icon: '/crookedrumors/icon.png', apple: '/crookedrumors/icon.png' },
  manifest: null,
  appleWebApp: { capable: false, title: 'Crooked Rumor' },
  openGraph: {
    title: 'Crooked Rumor | Video Production & Content Creation',
    description: 'Interviews, event recaps, and Instagram reels. Reels from $50. Book online.',
    images: ['/crookedrumors/badge.webp'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#F3E7CF',
}

export default function CrookedRumorsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`cr-root ${display.variable} ${body.variable} ${serif.variable}`}>{children}</div>
}
