'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export default function MobileHomeButton() {
  const { theme } = useTheme()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg lg:hidden"
          style={{
            background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldD})`,
            boxShadow: `0 4px 20px ${theme.gold}40`,
          }}
        >
          <ArrowUp size={20} strokeWidth={2.5} style={{ color: theme.bg }} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
