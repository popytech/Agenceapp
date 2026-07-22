'use client'

import { useAuth } from '@/lib/auth-context'
import { getPermissions } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CommercialDashboard from '@/components/commercial/CommercialDashboard'

export default function CommercialPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const perms = profile ? getPermissions(profile.role) : null

  useEffect(() => {
    if (profile && perms && !perms.canViewCommercial) {
      router.replace('/dashboard')
    }
  }, [profile, perms, router])

  if (!profile || !perms) return null
  if (!perms.canViewCommercial) return null

  return <CommercialDashboard />
}
