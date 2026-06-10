'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Signup disabled — personal use only. Always redirect to login.
export default function SignupPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/auth/login') }, [router])
  return null
}
