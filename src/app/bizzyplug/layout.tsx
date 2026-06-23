import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BizzyPlug — Graphic Design Services',
  description: 'Custom artwork, logos, album covers, flyers, and more. Submit your project request and get started today.',
  openGraph: {
    title: 'BizzyPlug — Graphic Design Services',
    description: 'Custom artwork, logos, album covers, flyers, and more.',
  },
}

export default function BizzyPlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
