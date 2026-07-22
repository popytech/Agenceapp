'use client'

  import { useEffect, useState } from 'react'
  import { useAuth } from '@/lib/auth-context'
  import { useRouter } from 'next/navigation'
  
  const ADMIN_ROLES = ['super_admin', 'ceo', 'dirigeant', 'chef_projet', 'assistante_direction', 'creatrice_contenu', 'commercial_digital', 'responsable_formations']
  
  function getDestination(role: string | undefined): string {
    if (!role) return '/login'
    return '/dashboard'
  }
  
  export default function RootPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
  
    useEffect(() => { setMounted(true) }, [])
  
    useEffect(() => {
      if (!mounted || loading) return
      
      if (!user) {
        router.replace('/login')
        return
      }
      
      const role = profile?.role || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'super_admin' : null)
      
      if (user && role) {
        router.replace(getDestination(role))
      } else if (user && !loading) {
        router.replace('/dashboard')
      }
    }, [user, profile, loading, mounted, router])
  
    return null
  }
