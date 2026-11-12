import type { Metadata } from 'next'
import AdminApp from './_components/AdminApp'

export const metadata: Metadata = { title: 'Admin | Crooked Rumor', robots: { index: false } }

export default function CrAdminPage() {
  return <AdminApp />
}
