'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/crookedrumor#work', label: 'Work' },
  { href: '/crookedrumor#pricing', label: 'Pricing' },
  { href: '/crookedrumor#process', label: 'How it works' },
  { href: '/crookedrumor#faq', label: 'FAQ' },
]

export default function SiteHeader({ wordmarkUrl, announcement }: { wordmarkUrl: string; announcement?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {announcement ? (
        <div className="bg-[var(--cr-red)] text-[var(--cr-paper)] text-center text-[13px] font-bold px-4 py-2">{announcement}</div>
      ) : null}
      <header className="sticky top-0 z-40 bg-[var(--cr-cream)]/95 backdrop-blur border-b-[3px] border-[var(--cr-ink)]">
        <div className="mx-auto max-w-6xl px-4 h-16 md:h-[72px] flex items-center justify-between gap-4">
          <Link href="/crookedrumor" className="shrink-0" aria-label="Crooked Rumor home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wordmarkUrl} alt="Crooked Rumor" className="h-7 md:h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-sm font-extrabold uppercase tracking-wide hover:text-[var(--cr-red)] transition-colors">
                {l.label}
              </a>
            ))}
            <Link href="/crookedrumor/book" className="cr-btn cr-btn-red cr-btn-sm">Book now</Link>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Link href="/crookedrumor/book" className="cr-btn cr-btn-red cr-btn-sm">Book</Link>
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 -mr-2"><Menu size={26} strokeWidth={2.5} /></button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-[var(--cr-ink)] text-[var(--cr-paper)] flex flex-col md:hidden">
          <div className="flex justify-end p-4">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2"><X size={30} strokeWidth={2.5} /></button>
          </div>
          <nav className="flex flex-col px-6 gap-2">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="cr-display text-5xl py-2 hover:text-[var(--cr-red)]">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto p-6">
            <Link href="/crookedrumor/book" onClick={() => setOpen(false)} className="cr-btn cr-btn-red w-full !border-[var(--cr-paper)]">Book a shoot</Link>
          </div>
        </div>
      )}
    </>
  )
}
