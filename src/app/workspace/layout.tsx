'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { 
  LayoutDashboard, CheckSquare, BookOpen, FileText, BarChart2, 
  LogOut, Sparkles, Menu, X, User, Bell, ChevronRight, 
  Palette, Video, Megaphone, Monitor, GraduationCap, Briefcase, 
  ClipboardList, Calendar, Handshake, Gavel, ShieldCheck, HeartHandshake, Users 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ADMIN_ROLES = ['super_admin', 'ceo', 'dirigeant', 'chef_projet', 'assistante_direction', 'creatrice_contenu', 'commercial_digital', 'responsable_formations']

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrateur',
  ceo: 'CEO / Dirigeant',
  dirigeant: 'CEO / Dirigeant',
  chef_projet: 'Chef de Projet',
  assistante_direction: 'Assistante de Direction',
  creatrice_contenu: 'Créatrice de contenu',
  commercial_digital: 'Commercial Digital',
  responsable_formations: 'Responsable Formation',
  designer: 'Designer',
  developpeur: 'Développeur',
  marketeur: 'Marketeur',
  cm: 'Community Manager',
  vidéaste: 'Vidéaste',
  monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur',
  stagiaire: 'Stagiaire',
  client: 'Client',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <Sparkles className="h-4 w-4" />,
  ceo: <BarChart2 className="h-4 w-4" />,
  dirigeant: <BarChart2 className="h-4 w-4" />,
  chef_projet: <Briefcase className="h-4 w-4" />,
  assistante_direction: <ClipboardList className="h-4 w-4" />,
  creatrice_contenu: <Sparkles className="h-4 w-4" />,
  commercial_digital: <Handshake className="h-4 w-4" />,
  responsable_formations: <GraduationCap className="h-4 w-4" />,
  designer: <Palette className="h-4 w-4" />,
  developpeur: <Monitor className="h-4 w-4" />,
  marketeur: <Megaphone className="h-4 w-4" />,
  cm: <BarChart2 className="h-4 w-4" />,
  vidéaste: <Video className="h-4 w-4" />,
  monteur_video: <Video className="h-4 w-4" />,
  formateur: <GraduationCap className="h-4 w-4" />,
  stagiaire: <Briefcase className="h-4 w-4" />,
  client: <User className="h-4 w-4" />,
}

const NAV_ITEMS = [
  { href: '/workspace', label: 'Accueil', icon: <LayoutDashboard className="h-4 w-4" />, roles: null },
    { href: '/workspace/creator', label: 'Création de contenu', icon: <Sparkles className="h-4 w-4" />, roles: ['creatrice_contenu', 'super_admin'] },
    { href: '/workspace/commercial', label: 'Commercial & Ventes', icon: <Handshake className="h-4 w-4" />, roles: ['commercial_digital', 'super_admin'] },
    { href: '/workspace/clients', label: 'Clients & CRM', icon: <Users className="h-4 w-4" />, roles: ['super_admin', 'ceo', 'dirigeant', 'commercial_digital'] },
    { href: '/workspace/tasks', label: 'Mes tâches', icon: <CheckSquare className="h-4 w-4" />, roles: null },

  { href: '/workspace/projects', label: 'Mes projets', icon: <Briefcase className="h-4 w-4" />, roles: null },
  { href: '/workspace/journal', label: 'Rapport du jour', icon: <ClipboardList className="h-4 w-4" />, roles: null },
  { href: '/workspace/calendar', label: 'Calendrier', icon: <Calendar className="h-4 w-4" />, roles: null },
  { href: '/workspace/academy', label: 'Formations', icon: <BookOpen className="h-4 w-4" />, roles: null },
  { href: '/workspace/contracts', label: 'Contrats & Légal', icon: <Gavel className="h-4 w-4" />, roles: ['super_admin', 'ceo', 'dirigeant', 'assistante_direction'] },
  { href: '/workspace/reports', label: 'Mes rapports', icon: <FileText className="h-4 w-4" />, roles: null },
]

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (profile && !simulatedRole) {
      setSimulatedRole(profile.role)
    }
  }, [profile, simulatedRole])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activeRole = simulatedRole || profile?.role || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'super_admin' : 'client')
  const roleLabel = ROLE_LABELS[activeRole] || activeRole || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'Super Administrateur' : 'Employé')
  const roleIcon = ROLE_ICONS[activeRole] || <User className="h-4 w-4" />

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-sidebar-border">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sidebar-foreground text-sm">POPY TECH</div>
            <div className="text-xs text-sidebar-foreground/50">Espace de travail</div>
          </div>
        </div>
      </div>

      {/* Profile & Role Switcher */}
      <div className="p-4 border-b border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sidebar-foreground truncate">
              {profile?.full_name || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'Popy Traore' : 'Utilisateur')}
            </div>
            <div className="flex items-center gap-1 text-xs text-sidebar-foreground/50">
              {roleIcon}
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>

        {profile?.role === 'super_admin' && (
          <div className="px-1">
            <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest mb-1.5 ml-1">Simuler un métier</p>
            <Select value={activeRole} onValueChange={setSimulatedRole}>
              <SelectTrigger className="h-8 text-[10px] bg-sidebar-accent border-sidebar-border">
                <SelectValue placeholder="Changer de vue" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <SelectItem key={role} value={role} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter(item => 
          !item.roles || 
          item.roles.includes(activeRole) || 
          activeRole === 'super_admin'
        ).map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <span className={cn(active ? 'text-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground')}>
                {item.icon}
              </span>
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {ADMIN_ROLES.includes(profile?.role || '') && (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <BarChart2 className="h-4 w-4 text-sidebar-foreground/50" />
            Vue Admin
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col md:hidden transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background z-30 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-border">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-bold text-sm">POPY TECH</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
