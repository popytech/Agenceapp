'use client'
// sidebar v2026c - Updated role logic and métier views

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard, Users, FolderKanban, UserCheck, GraduationCap,
    Receipt, MessageSquare, Settings, Sparkles, ChevronLeft, ChevronRight,
    Sun, Moon, LogOut, User, TrendingUp, Building2, FileText,
    Clock, CalendarDays, BarChart3, CheckSquare, Search,
    CalendarCheck, Megaphone, Film, Palette, BookOpen, Menu, X, Globe, Handshake, Scale, Package, ClipboardList, RefreshCw, Code2, Terminal, Zap, Star as StarIcon, Mic, Banknote, TrendingDown, Landmark, CalendarOff, BookUser
  } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import NotificationsBell from '@/components/notifications/NotificationsBell'

const roleLabels: Record<string, string> = {
  super_admin: 'Super Administrateur',
  ceo: 'CEO / Dirigeant',
  dirigeant: 'CEO / Dirigeant',
  chef_projet: 'Chef de Projet',
  assistante_direction: 'Assistante de Direction',
  creatrice_contenu: 'Créatrice de contenu',
  commercial_digital: 'Commercial Digital',
  responsable_formations: 'Responsable Formation',
  designer: 'Designer',
  designer_senior: 'Designer Senior',
  developpeur: 'Développeur',
  marketeur: 'Marketeur',
  cm: 'Community Manager',
  copywriter: 'Copywriter / Content',
  vidéaste: 'Vidéaste',
  monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur',
  stagiaire: 'Apprenant Academy',
  client: 'Client',
}

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavGroup = { label: string; items: NavItem[] }

const METIER_VIEWS = [
  { href: '/dashboard?view=creatrice_contenu', label: 'Création de contenu ✨', icon: Sparkles },
  { href: '/dashboard?view=copywriter', label: 'Copywriting & Content ✍️', icon: FileText },
  { href: '/dashboard?view=commercial_digital', label: 'Commercial Digital 🧡', icon: Handshake },
  { href: '/dashboard?view=designer', label: 'Designers 🎨', icon: Palette },
  { href: '/dashboard?view=designer_senior', label: 'Designers Senior 🏆', icon: Palette },
  { href: '/dashboard?view=developpeur', label: 'Développement 💻', icon: Code2 },
  { href: '/dashboard?view=marketeur', label: 'Marketing Ops 🚀', icon: Megaphone },
  { href: '/dashboard?view=cm', label: 'Community Management 📱', icon: Globe },
  { href: '/dashboard?view=vidéaste', label: 'Vidéastes 🎥', icon: Film },
  { href: '/dashboard?view=monteur_video', label: 'Monteurs Vidéo 🎬', icon: Film },
  { href: '/dashboard?view=formateur', label: 'Formateurs 👨‍🏫', icon: GraduationCap },
  { href: '/dashboard?view=responsable_formations', label: 'Responsable Formations 🎓', icon: GraduationCap },
  { href: '/dashboard?view=assistante_direction', label: 'Assistante Direction 📋', icon: Building2 },
  { href: '/dashboard?view=stagiaire', label: 'Stagiaires 🎓', icon: UserCheck },
]

function getNavGroups(role: string | null | undefined, isAdminViewingMetier: boolean = false): NavGroup[] {
  const groups: NavGroup[] = []

  if (isAdminViewingMetier) {
    groups.push({
      label: 'Supervision',
      items: [
        { href: '/dashboard', label: 'Retour Command Center', icon: Zap },
      ]
    })
  }

  switch (role) {
    case 'super_admin':
    case 'ceo':
    case 'dirigeant':
      return [
        ...groups,
        {
          label: 'Pilotage',
          items: [
            { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
            { href: '/dashboard/tasks', label: 'Tâches', icon: CheckSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
          ],
        },
        {
          label: 'Finance',
          items: [
            { href: '/dashboard/finance', label: 'Finance & ROI', icon: TrendingUp },
            { href: '/dashboard/tresorerie', label: 'Trésorerie', icon: Landmark },
            { href: '/dashboard/profitability', label: 'Marge & Rentabilité', icon: BarChart3 },
            { href: '/dashboard/expenses', label: 'Dépenses', icon: TrendingDown },
            { href: '/dashboard/invoices', label: 'Facturation', icon: Receipt },
            { href: '/dashboard/quotes', label: 'Devis & Offres', icon: FileText },
          ],
        },
        {
          label: 'Commercial',
          items: [
            { href: '/dashboard/commercial', label: 'Pipeline Commercial', icon: Handshake },
            { href: '/dashboard/clients', label: 'CRM Clients', icon: Users },
            { href: '/dashboard/portal', label: 'Portail Client', icon: Globe },
            { href: '/dashboard/marketing', label: 'Marketing & Ads', icon: Megaphone },
            { href: '/dashboard/services', label: 'Services & Catalogue', icon: Package },
            { href: '/dashboard/carnet-adresses', label: "Carnet d'adresses", icon: BookUser },
          ],
        },
        {
          label: 'Ressources Humaines',
          items: [
            { href: '/dashboard/team', label: 'Équipe & Performance', icon: Users },
            { href: '/dashboard/paie', label: 'Gestion Paie', icon: Banknote },
            { href: '/dashboard/conges', label: 'Congés & Absences', icon: CalendarOff },
            { href: '/dashboard/stock', label: 'Stock & Inventaire', icon: Package },
            { href: '/dashboard/legal', label: 'Legal & Compliance', icon: Scale },
          ],
        },
        {
          label: 'Academy & Formations',
          items: [
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
            { href: '/dashboard/formations', label: 'Sessions & Formateurs', icon: BookOpen },
            { href: '/dashboard/interns', label: 'Stagiaires', icon: UserCheck },
          ],
        },
        {
          label: 'Production',
          items: [
            { href: '/dashboard/podcast', label: 'Podcast Studio', icon: Mic },
          ],
        },
        {
          label: 'Vues Équipe',
          items: METIER_VIEWS,
        },
        {
          label: 'Système',
          items: [
            { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]

    case 'chef_projet':
      return [
        ...groups,
        {
          label: 'Pilotage',
          items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
            { href: '/dashboard/tasks', label: 'Tâches', icon: CheckSquare },
            { href: '/dashboard/team', label: 'Équipe', icon: Users },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
          ],
        },
        {
          label: 'Finance',
          items: [
            { href: '/dashboard/finance', label: 'Finance & ROI', icon: TrendingUp },
            { href: '/dashboard/tresorerie', label: 'Trésorerie', icon: Landmark },
            { href: '/dashboard/expenses', label: 'Dépenses', icon: TrendingDown },
            { href: '/dashboard/invoices', label: 'Facturation', icon: Receipt },
            { href: '/dashboard/quotes', label: 'Devis & Offres', icon: FileText },
          ],
        },
        {
          label: 'Commercial',
          items: [
            { href: '/dashboard/clients', label: 'CRM Clients', icon: Building2 },
            { href: '/dashboard/portal', label: 'Portail Client', icon: Globe },
            { href: '/dashboard/services', label: 'Services & Catalogue', icon: Package },
          ],
        },
        {
          label: 'Ressources Humaines',
          items: [
            { href: '/dashboard/paie', label: 'Gestion Paie', icon: Banknote },
            { href: '/dashboard/conges', label: 'Congés & Absences', icon: CalendarOff },
            { href: '/dashboard/stock', label: 'Stock & Inventaire', icon: Package },
          ],
        },
        {
          label: 'Production',
          items: [
            { href: '/dashboard/podcast', label: 'Podcast Studio', icon: Mic },
          ],
        },
        {
          label: 'Vues Équipe',
          items: METIER_VIEWS,
        },
        {
          label: 'Système',
          items: [
            { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]

    case 'designer':
    case 'designer_senior':
      return [
        {
          label: 'ESPACE DESIGNER',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Projets (Studio)', icon: FolderKanban },
            { href: '/dashboard/design', label: 'Design & Studio', icon: Palette },
            { href: '/dashboard/tasks', label: 'Tâches & Contrôle', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'developpeur':
      return [
        {
          label: 'ESPACE DÉVELOPPEUR',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Mes Projets (Dev)', icon: FolderKanban },
            { href: '/dashboard/dev', label: 'Espace Dev', icon: Terminal },
            { href: '/dashboard/tasks', label: 'Tâches & Tickets', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'vidéaste':
    case 'videaste':
    case 'monteur_video':
    case 'production':
      return [
        {
          label: 'ESPACE VIDÉO & MONTAGE',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Mes Projets (Vidéo)', icon: FolderKanban },
            { href: '/dashboard/production', label: 'Production Vidéo', icon: Film },
            { href: '/dashboard/tasks', label: 'Suivi des tâches', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'cm':
    case 'community_manager':
      return [
        {
          label: 'ESPACE COMMUNITY MANAGER',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Mes Projets (Social)', icon: FolderKanban },
            { href: '/dashboard/community', label: 'Community Manager', icon: Globe },
            { href: '/dashboard/tasks', label: 'Suivi des tâches', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/appointments', label: 'Rendez-vous', icon: CalendarCheck },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'marketeur':
    case 'marketing':
      return [
        {
          label: 'ESPACE MARKETING OPS',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Mes Projets (Ads)', icon: FolderKanban },
            { href: '/dashboard/marketing', label: 'Marketing Agence', icon: Megaphone },
            { href: '/dashboard/community', label: 'Social Media', icon: Globe },
            { href: '/dashboard/tasks', label: 'Suivi des tâches', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'creatrice_contenu':
    case 'copywriter':
      return [
        {
          label: 'ESPACE CRÉATRICE DE CONTENU',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Mes Projets (Content)', icon: FolderKanban },
            { href: '/dashboard/creator', label: 'Création de contenu', icon: Sparkles },
            { href: '/dashboard/podcast', label: 'Podcast Studio', icon: Mic },
            { href: '/dashboard/tasks', label: 'Suivi des tâches', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'commercial_digital':
      return [
        {
          label: 'ESPACE COMMERCIAL DIGITAL',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Suivi Projets (Sales)', icon: FolderKanban },
            { href: '/dashboard/commercial', label: 'Espace Commercial', icon: Handshake },
            { href: '/dashboard/clients', label: 'CRM Clients', icon: Building2 },
            { href: '/dashboard/services', label: 'Services & Catalogue', icon: Package },
            { href: '/dashboard/quotes', label: 'Devis & Offres', icon: FileText },
            { href: '/dashboard/invoices', label: 'Facturation Agence', icon: Receipt },
            { href: '/dashboard/portal', label: 'Portail Client', icon: Globe },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/tasks', label: 'Mes Tâches', icon: CheckSquare },
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/appointments', label: 'Rendez-vous', icon: CalendarCheck },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources & Academy',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
          ],
        },
      ]

    case 'formateur':
      return [
        {
          label: 'Formation & Opérations',
          items: [
            { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Projets (Formation)', icon: FolderKanban },
            { href: '/dashboard/academy', label: 'Catalogue Academy & Formations', icon: GraduationCap },
            { href: '/dashboard/tasks', label: 'Suivi des tâches', icon: CheckSquare },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
            { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
          ],
        },
        {
          label: 'Ressources',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/clients', label: 'Annuaire Clients', icon: Users },
          ],
        },
      ]

    case 'responsable_formations':
    case 'responsable_formation':
    case 'academy':
      return [
        {
          label: 'Direction Academy',
          items: [
            { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
            { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
            { href: '/dashboard/formations', label: 'Sessions & Formateurs', icon: BookOpen },
            { href: '/dashboard/legal', label: 'Contrats Formation', icon: Scale },
          ],
        },
        {
          label: 'Opérations Agence',
          items: [
            { href: '/dashboard/projects', label: 'Supervision Projets', icon: FolderKanban },
            { href: '/dashboard/tasks', label: 'Mes Tâches', icon: CheckSquare },
            { href: '/dashboard/clients', label: 'Clients Agence', icon: Users },
            { href: '/dashboard/finance', label: 'Finances Agence', icon: TrendingUp },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
          ],
        },
        {
          label: 'Ressources',
          items: [
            { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            { href: '/dashboard/interns', label: 'Stagiaires Agence', icon: UserCheck },
          ],
        },
      ]

    case 'assistante_direction':
    case 'assistante':
      return [
        {
          label: 'Pilotage',
          items: [
            { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
            { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban },
            { href: '/dashboard/tasks', label: 'Tâches', icon: CheckSquare },
            { href: '/dashboard/clients', label: 'CRM Clients', icon: Users },
          ],
        },
        {
          label: 'Administration',
          items: [
            { href: '/dashboard/assistante?tab=hr', label: 'RH & Présences', icon: ClipboardList },
            { href: '/dashboard/assistante?tab=agenda', label: 'Agenda / RDV', icon: CalendarCheck },
            { href: '/dashboard/paie', label: 'Gestion Paie', icon: Banknote },
            { href: '/dashboard/conges', label: 'Congés & Absences', icon: CalendarOff },
            { href: '/dashboard/stock', label: 'Stock & Inventaire', icon: Package },
            { href: '/dashboard/team', label: 'Équipe', icon: Users },
            { href: '/dashboard/interns', label: 'Stagiaires', icon: UserCheck },
          ],
        },
        {
          label: 'Finance',
          items: [
            { href: '/dashboard/tresorerie', label: 'Trésorerie', icon: Landmark },
            { href: '/dashboard/expenses', label: 'Dépenses', icon: TrendingDown },
            { href: '/dashboard/invoices', label: 'Facturation', icon: Receipt },
            { href: '/dashboard/quotes', label: 'Devis & Offres', icon: FileText },
            { href: '/dashboard/services', label: 'Services & Catalogue', icon: Package },
          ],
        },
        {
          label: 'Mon Espace',
          items: [
            { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
            { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
          ],
        },
      ]

      case 'stagiaire':
        return [
          {
            label: 'Mon Espace Apprenant',
            items: [
              { href: '/dashboard', label: 'Mon espace', icon: LayoutDashboard },
              { href: '/dashboard/tasks', label: 'Mes Missions', icon: CheckSquare },
              { href: '/dashboard/projects', label: 'Mes Projets', icon: FolderKanban },
              { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays },
              { href: '/dashboard/journal', label: "Journal d'activité", icon: BookOpen },
              { href: '/dashboard/timetracking', label: 'Suivi du temps', icon: Clock },
            ],
          },
          {
            label: 'Ma Formation',
            items: [
              { href: '/dashboard/academy', label: 'Gestion des inscrits', icon: GraduationCap },
              { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            ],
          },
          {
            label: 'Ressources',
            items: [
              { href: '/dashboard/team', label: 'Équipe Agence', icon: Users },
            ],
          },
        ]

      case 'client':
        return [
          {
            label: 'Espace Client',
            items: [
              { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { href: '/dashboard/projects', label: 'Mes Projets en cours', icon: FolderKanban },
              { href: '/dashboard/invoices', label: 'Mes Factures', icon: Receipt },
              { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            ],
          },
        ]

      default:
        return [
          {
            label: 'Principal',
            items: [
              { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { href: '/dashboard/projects', label: 'Tous les projets', icon: FolderKanban },
              { href: '/dashboard/tasks', label: 'Mes Tâches', icon: CheckSquare },
              { href: '/dashboard/clients', label: 'Annuaire Clients', icon: Users },
              { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
            ],
          },
        ]
    }
  }

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="bg-sidebar border border-sidebar-border rounded-lg p-1.5 shadow-sm hover:bg-sidebar-accent transition-colors md:hidden"
      onClick={onClick}
      aria-label="Ouvrir le menu"
    >
      <Menu className="h-5 w-5 text-sidebar-foreground" />
    </button>
  )
}

export default function Sidebar({ mobileOpen: propsMobileOpen, setMobileOpen: propsSetMobileOpen }: { 
  mobileOpen?: boolean; 
  setMobileOpen?: (open: boolean) => void 
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  
  const mobileOpen = propsMobileOpen !== undefined ? propsMobileOpen : internalMobileOpen
  const setMobileOpen = propsSetMobileOpen !== undefined ? propsSetMobileOpen : setInternalMobileOpen

  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  useEffect(() => setMounted(true), [])
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const { user, profile, signOut, loading: authLoading } = useAuth()
  const { theme, setTheme } = useTheme()

  const dbRole = profile?.role || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'super_admin' : 'client')
  const isAdmin = ['super_admin', 'ceo', 'dirigeant', 'chef_projet'].includes(dbRole)
  
  const activeRole = (isAdmin && viewParam) ? viewParam : dbRole
  const isAdminViewingMetier = !!(isAdmin && viewParam)
  
  // Debug log to verify role detection
  console.log("Sidebar Detection:", { email: user?.email, dbRole, activeRole, isAdmin })
  
  const navGroups = React.useMemo(() => {
    const groups = getNavGroups(activeRole, isAdminViewingMetier)
    if (groups.length === 0) return getNavGroups('client')
    return groups
  }, [activeRole, isAdminViewingMetier])

  if (authLoading || (!profile && user)) {
    return (
      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0 w-64 items-center justify-center p-8'
      )}>
        <div className="h-16 w-16 mb-6 animate-pulse">
          <img 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
            alt="Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary rounded-full animate-loading-bar" style={{ width: '40%' }} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 animate-pulse">Chargement...</p>
        {user && <p className="text-[8px] text-muted-foreground mt-4 opacity-30">{user.email}</p>}
      </aside>
    )
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.split('@')[0]?.slice(0, 2).toUpperCase() || 'PT')


  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  function closeOnMobile() {
    setMobileOpen(false)
  }

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  function NavLinks({ isMobile = false }: { isMobile?: boolean }) {
    const showLabels = isMobile || !collapsed
    return (
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            {showLabels && (
              <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const hrefPath = href.split('?')[0]
                const hrefParams = new URLSearchParams(href.split('?')[1] || '')
                const hrefView = hrefParams.get('view')
                
                const isDashboard = hrefPath === '/dashboard'
                const isActive = isDashboard 
                  ? (pathname === '/dashboard' && (hrefView ? viewParam === hrefView : !viewParam))
                  : (pathname === hrefPath || pathname.startsWith(hrefPath))

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeOnMobile}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      !showLabels && 'justify-center px-2'
                    )}
                    title={!showLabels ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {showLabels && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  function Footer({ isMobile = false }: { isMobile?: boolean }) {
    const showLabels = isMobile || !collapsed

    return (
      <div className="border-t border-sidebar-border p-3 space-y-2 shrink-0">
        {/* Search button */}
        {showLabels && (
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="flex items-center gap-2 px-3 py-2 rounded-lg w-full border border-sidebar-border/50 hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground mb-1"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-xs text-left">Rechercher...</span>
            <kbd className="text-[9px] font-semibold bg-sidebar-accent px-1.5 py-0.5 rounded border border-sidebar-border">⌘K</kbd>
          </button>
        )}
        <div className={cn('flex items-center gap-2 px-2', !showLabels && 'flex-col')}>
          {!showLabels && (
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              className="p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              title="Recherche globale (⌘K)"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          <NotificationsBell />
          <button
            onClick={handleRefresh}
            className="p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title="Rafraîchir la page"
          >
            <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title={mounted ? (theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre') : 'Thème'}
          >
            {mounted && (theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
            {!mounted && <Moon className="h-5 w-5" />}
          </button>
          {showLabels && mounted && (
            <span className="text-xs text-sidebar-foreground/50 ml-1">
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent w-full transition-colors',
              !showLabels && 'justify-center'
            )}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
                  {showLabels && (
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-medium text-sidebar-foreground truncate">
                          {profile?.full_name || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'Popy Traore' : 'Utilisateur')}
                        </p>
                        <p className="text-xs text-sidebar-foreground/50 truncate">
                          {roleLabels[profile?.role || (user?.email?.toLowerCase().trim() === 'contact@popytech.com' ? 'super_admin' : 'client')] || profile?.role || 'Utilisateur'}
                        </p>
                      </div>
                  )}

            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { router.push('/dashboard/settings'); closeOnMobile() }}>
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 md:hidden animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-[70] w-72 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-sidebar-border">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-bold text-sidebar-foreground text-lg tracking-tight">POPY TECH</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks isMobile />
        <Footer isMobile />
      </aside>

      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-sidebar-border">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground text-lg tracking-tight">POPY TECH</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors',
              collapsed && 'mx-auto'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <NavLinks />
        <Footer />
      </aside>
    </>
  )
}
