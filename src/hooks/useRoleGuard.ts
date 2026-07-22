'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook de protection côté client.
 * Redirige vers /dashboard si le rôle de l'utilisateur n'est pas dans `allowedRoles`.
 * Usage : useRoleGuard(['designer', 'super_admin', 'chef_projet'])
 */
export function useRoleGuard(allowedRoles: string[]) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!profile) { router.replace('/login'); return }
    if (!allowedRoles.includes(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, loading, allowedRoles, router])
}
