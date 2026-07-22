'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar, { SidebarTrigger } from '@/components/sidebar'
import GlobalSearch from '@/components/GlobalSearch'
import FloatingActions from '@/components/FloatingActions'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Rediriger vers login seulement si le chargement est terminé ET pas d'utilisateur
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

    if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 mb-2 animate-pulse">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
              alt="Logo POPY TECH"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-loading-bar" style={{ width: '40%' }} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 animate-pulse">Initialisation...</p>
        </div>
      </div>
    )
  }

  // Pas d'utilisateur après chargement → redirection en cours
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 overflow-auto relative">
        {/* Mobile Header */}
        <div className="h-14 md:hidden border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 flex items-center px-4 justify-between">
          <SidebarTrigger onClick={() => setMobileOpen(true)} />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-border">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-black text-xs tracking-tight uppercase">Popy Tech</span>
          </div>
          <div className="w-10" />
        </div>
        {children}
      </main>
      <GlobalSearch />
      <FloatingActions />
    </div>
  )
}
