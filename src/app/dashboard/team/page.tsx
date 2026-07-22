'use client'
// v3 - fixed JSX structure
import { useEffect, useState, useCallback } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { toast } from 'sonner'
import {
    Users, Mail, Phone, Shield, Search, Edit, CheckCircle2,
    FolderKanban, TrendingUp, Trash2, Clock, Activity,
    MoreVertical, Briefcase, Zap, Award, ChevronRight, LayoutGrid,
    List, Crown, Target, BarChart3, Sparkles, UserCheck, AlertCircle,
    ArrowUpRight, Filter, X, ChevronDown, Hash, KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { isAdmin } from '@/lib/permissions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const roleConfig: Record<string, { label: string; color: string; bg: string; dot: string; gradient: string; tier: number }> = {
  ceo:                { label: 'CEO / Dirigeant',      color: 'text-indigo-400',   bg: 'bg-indigo-500/10',   dot: 'bg-indigo-400',   gradient: 'from-indigo-600 via-blue-600 to-violet-600',     tier: 0 },
  super_admin:        { label: 'Super Admin',          color: 'text-amber-400',    bg: 'bg-amber-500/10',    dot: 'bg-amber-400',    gradient: 'from-amber-500 via-orange-500 to-yellow-500',    tier: 1 },
  admin:              { label: 'Admin',                color: 'text-violet-400',   bg: 'bg-violet-500/10',   dot: 'bg-violet-400',   gradient: 'from-violet-600 via-purple-500 to-fuchsia-500',  tier: 2 },
  chef_projet:        { label: 'Chef de projet',       color: 'text-blue-400',     bg: 'bg-blue-500/10',     dot: 'bg-blue-400',     gradient: 'from-blue-600 via-blue-500 to-cyan-500',         tier: 3 },
  designer_senior:    { label: 'Designer Senior',      color: 'text-violet-400',   bg: 'bg-violet-500/10',   dot: 'bg-violet-400',   gradient: 'from-indigo-600 via-purple-600 to-pink-600',     tier: 4 },
  designer:           { label: 'Designer',             color: 'text-pink-400',     bg: 'bg-pink-500/10',     dot: 'bg-pink-400',     gradient: 'from-pink-500 via-rose-500 to-red-500',          tier: 4 },
  developpeur:        { label: 'Développeur',          color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  dot: 'bg-emerald-400',  gradient: 'from-emerald-500 via-teal-500 to-cyan-600',      tier: 4 },
  marketeur:          { label: 'Marketeur',            color: 'text-orange-400',   bg: 'bg-orange-500/10',   dot: 'bg-orange-400',   gradient: 'from-orange-500 via-amber-500 to-yellow-500',    tier: 4 },
  cm:                 { label: 'Community Manager',    color: 'text-cyan-400',     bg: 'bg-cyan-500/10',     dot: 'bg-cyan-400',     gradient: 'from-cyan-500 via-sky-500 to-blue-500',          tier: 4 },
  'vidéaste':         { label: 'Vidéaste',             color: 'text-red-400',      bg: 'bg-red-500/10',      dot: 'bg-red-400',      gradient: 'from-red-500 via-rose-500 to-pink-600',          tier: 4 },
  monteur_video:      { label: 'Monteur Vidéo',        color: 'text-rose-400',     bg: 'bg-rose-500/10',     dot: 'bg-rose-400',     gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',      tier: 4 },
  formateur:          { label: 'Formateur',            color: 'text-indigo-400',   bg: 'bg-indigo-500/10',   dot: 'bg-indigo-400',   gradient: 'from-indigo-500 via-blue-500 to-violet-500',     tier: 4 },
  stagiaire:          { label: 'Stagiaire',            color: 'text-slate-400',    bg: 'bg-slate-500/10',    dot: 'bg-slate-400',    gradient: 'from-slate-500 via-gray-500 to-zinc-500',        tier: 5 },
  commercial_digital:   { label: 'Commercial Digital',    color: 'text-green-400',    bg: 'bg-green-500/10',    dot: 'bg-green-400',    gradient: 'from-green-500 via-teal-500 to-emerald-400',     tier: 4 },
  creatrice_contenu:    { label: 'Créatrice de contenu',  color: 'text-fuchsia-400',  bg: 'bg-fuchsia-500/10',  dot: 'bg-fuchsia-400',  gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',      tier: 4 },
  assistante_direction: { label: 'Assistante de Direction', color: 'text-sky-400',   bg: 'bg-sky-500/10',      dot: 'bg-sky-400',      gradient: 'from-sky-500 via-blue-500 to-indigo-500',        tier: 3 },
  responsable_formations: { label: 'Responsable Formations', color: 'text-teal-400', bg: 'bg-teal-500/10',    dot: 'bg-teal-400',     gradient: 'from-teal-500 via-emerald-500 to-green-500',     tier: 3 },
  client:               { label: 'Client',               color: 'text-slate-400',    bg: 'bg-slate-500/10',    dot: 'bg-slate-400',    gradient: 'from-slate-400 via-gray-400 to-zinc-400',        tier: 5 },
}

function getGradient(id: string) {
  const gradients = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',  'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',     'from-indigo-500 to-blue-600',
    'from-cyan-500 to-sky-600',      'from-red-500 to-orange-600',
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % gradients.length
  return gradients[hash]
}

function getInitials(name?: string | null) {
  return (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function workloadInfo(count: number) {
  if (count === 0) return { label: 'Libre',     color: 'text-emerald-400', bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', pct: 0  }
  if (count <= 3) return { label: 'Léger',     color: 'text-blue-400',    bar: 'bg-gradient-to-r from-blue-500 to-cyan-500',    pct: 30 }
  if (count <= 6) return { label: 'Occupé',    color: 'text-amber-400',   bar: 'bg-gradient-to-r from-amber-500 to-orange-500', pct: 65 }
  return              { label: 'Surchargé',  color: 'text-red-400',     bar: 'bg-gradient-to-r from-red-500 to-rose-500',     pct: 95 }
}

interface MemberWithWorkload extends Profile {
  activeTasksCount: number
  totalTasksCount: number
  completedTasksCount: number
  activeProjects: string[]
}

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = value / (duration / 16)
    const t = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(t) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(t)
  }, [value, duration])
  return <>{display}</>
}

export default function TeamPage() {
  const { profile: currentProfile } = useAuth()
  const canManage = isAdmin(currentProfile?.role)
  const isSuperAdmin = currentProfile?.role === 'super_admin'

  const [team, setTeam] = useState<MemberWithWorkload[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editMember, setEditMember] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithWorkload | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [resetPasswordMember, setResetPasswordMember] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  // Statut de disponibilité via Supabase Realtime Presence
  type AvailStatus = 'disponible' | 'reunion' | 'focus' | 'absent'
  const AVAIL_CONFIG: Record<AvailStatus, { label: string; color: string; dot: string; bg: string }> = {
    disponible: { label: 'Disponible',  color: 'text-emerald-500', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10' },
    reunion:    { label: 'En réunion',  color: 'text-orange-500',  dot: 'bg-orange-500',  bg: 'bg-orange-500/10'  },
    focus:      { label: 'Focus',       color: 'text-violet-500',  dot: 'bg-violet-500',  bg: 'bg-violet-500/10'  },
    absent:     { label: 'Absent',      color: 'text-slate-400',   dot: 'bg-slate-400',   bg: 'bg-slate-500/10'   },
  }
  const [myStatus, setMyStatus] = useState<AvailStatus>('disponible')
  const [presenceMap, setPresenceMap] = useState<Record<string, AvailStatus>>({})
  const presenceChannelRef = useState<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!currentProfile?.id) return
    const channel = supabase.channel('team-availability', {
      config: { presence: { key: currentProfile.id } }
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ status: AvailStatus }>()
        const map: Record<string, AvailStatus> = {}
        Object.entries(state).forEach(([key, presences]) => {
          if (presences[0]) map[key] = presences[0].status
        })
        setPresenceMap(map)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ status: myStatus })
        }
      })
    presenceChannelRef[0] = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id])

  async function updateMyStatus(s: AvailStatus) {
    setMyStatus(s)
    const channel = presenceChannelRef[0]
    if (channel) await channel.track({ status: s })
  }

  async function fetchTeam() {
    const [{ data: members }, { data: tasks }, { data: projects }] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('tasks').select('assigned_to, status, project_id, title, deadline, priority, projects(title)'),
      supabase.from('projects').select('id, title, status'),
    ])

    const enriched: MemberWithWorkload[] = (members || []).map(m => {
      const myTasks = (tasks || []).filter(t => t.assigned_to === m.id)
      const activeTasks = myTasks.filter(t => t.status !== 'termine')
      const completedTasks = myTasks.filter(t => t.status === 'termine')
      const projectIds = [...new Set(activeTasks.map(t => t.project_id).filter(Boolean))] as string[]
      const projectTitles = projectIds.map(pid => (projects || []).find(p => p.id === pid)?.title).filter(Boolean) as string[]
      return { ...m, activeTasksCount: activeTasks.length, totalTasksCount: myTasks.length, completedTasksCount: completedTasks.length, activeProjects: projectTitles }
    })
    setTeam(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchTeam() }, [])

  async function handleUpdateMember() {
    if (!editMember) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ role: editRole, status: editStatus }).eq('id', editMember.id)
    if (error) toast.error('Erreur mise à jour')
    else { toast.success('Profil mis à jour'); fetchTeam(); setEditMember(null) }
    setSaving(false)
  }

  async function handleResetPassword() {
    if (!resetPasswordMember || !newPassword) return
    if (newPassword.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères.'); return }
    setResetting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetPasswordMember.email, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur lors de la réinitialisation'); return }
      toast.success(`Mot de passe réinitialisé pour ${resetPasswordMember.full_name}`)
      setResetPasswordMember(null)
      setNewPassword('')
    } catch { toast.error('Erreur réseau') }
    finally { setResetting(false) }
  }

  async function handleDeleteMember(member: Profile) {
    const res = await fetch('/api/auth/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: member.id }) })
    if (!res.ok) {
      const { error } = await supabase.from('profiles').delete().eq('id', member.id)
      if (error) { toast.error('Erreur suppression'); return }
    }
    toast.success(`${member.full_name} supprimé`)
    setConfirmDelete(null)
    setSelectedMember(null)
    fetchTeam()
  }

  const filtered = team.filter(m => {
    const matchSearch = search === '' || (m.full_name || '').toLowerCase().includes(search.toLowerCase()) || (m.email || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchRole
  })

  const totalActive = team.filter(m => m.status === 'active').length
  const overloaded = team.filter(m => m.activeTasksCount > 6).length
  const totalProjects = [...new Set(team.flatMap(m => m.activeProjects))].length
  const avgCompletion = team.length > 0
    ? Math.round(team.reduce((a, m) => a + (m.totalTasksCount > 0 ? (m.completedTasksCount / m.totalTasksCount) * 100 : 0), 0) / team.length)
    : 0

  const roleGroups = Object.entries(roleConfig)
    .map(([role, cfg]) => ({ role, ...cfg, count: team.filter(m => m.role === role).length }))
    .filter(r => r.count > 0)
    .sort((a, b) => a.tier - b.tier)

  const topPerformers = [...team].sort((a, b) => b.completedTasksCount - a.completedTasksCount).slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Chargement de l'équipe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2" />

        <div className="relative p-6 md:p-8 pt-20 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
                  <Users className="h-4 w-4 text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Gestion d'équipe</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Notre <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">équipe</span>
              </h1>
              <p className="text-slate-400 mt-1.5 text-sm">
                {team.length} membres · {totalActive} actifs en ce moment
              </p>
            </div>

            {topPerformers.length > 0 && (
              <div className="flex items-center gap-3 bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex -space-x-2">
                  {topPerformers.map(m => (
                    <Avatar key={m.id} className="h-8 w-8 border-2 border-slate-800 ring-0">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className={cn('text-[10px] font-bold text-white bg-gradient-to-br', getGradient(m.id))}>
                        {getInitials(m.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-400" /> Top Performers
                  </p>
                  <p className="text-[11px] text-slate-400">{topPerformers.map(m => m.full_name?.split(' ')[0]).join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Membres', value: team.length, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Actifs', value: totalActive, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Projets actifs', value: totalProjects, icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Complétion moy.', value: `${avgCompletion}%`, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 bg-card/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                <div className={cn('p-2 rounded-lg', bg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 md:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/30 border-border/50 rounded-xl"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-48 text-sm bg-muted/30 border-border/50 rounded-xl">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {roleGroups.map(r => (
                <SelectItem key={r.role} value={r.role}>{r.label} ({r.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 bg-muted/30 border border-border/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mon statut de disponibilité */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground hidden md:block">Mon statut :</span>
            <div className="flex gap-1">
              {(Object.entries(AVAIL_CONFIG) as [AvailStatus, typeof AVAIL_CONFIG[AvailStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => updateMyStatus(key)}
                  title={cfg.label}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border',
                    myStatus === key
                      ? `${cfg.bg} ${cfg.color} border-current/30`
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/40'
                  )}
                >
                  <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground hidden md:block">
            {filtered.length} / {team.length} membres
          </p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="p-4 md:p-6 space-y-6">

        {filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-muted-foreground">Aucun membre trouvé</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Essaie une autre recherche</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(member => {
              const role = roleConfig[member.role]
              const w = workloadInfo(member.activeTasksCount)
              const completionRate = member.totalTasksCount > 0 ? Math.round((member.completedTasksCount / member.totalTasksCount) * 100) : 0
              const isTopPerformer = topPerformers.some(t => t.id === member.id)

              return (
                <div
                  key={member.id}
                  className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  onClick={() => setSelectedMember(member)}
                >
                  {/* Gradient header */}
                  <div className={cn('h-20 w-full bg-gradient-to-br relative overflow-hidden', role?.gradient || getGradient(member.id))}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-card/10" />
                    <div className="absolute -right-1 top-4 w-12 h-12 rounded-full bg-card/5" />

                    {isTopPerformer && (
                      <div className="absolute top-2 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <Crown className="h-2.5 w-2.5 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-400">Top</span>
                      </div>
                    )}

                    {(canManage || isSuperAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/30 backdrop-blur-sm hover:bg-black/50"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManage && (
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditMember(member); setEditRole(member.role); setEditStatus(member.status) }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Modifier le rôle
                            </DropdownMenuItem>
                          )}
                          {isSuperAdmin && (
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setResetPasswordMember(member); setNewPassword('') }} className="text-amber-600">
                              <KeyRound className="h-3.5 w-3.5 mr-2" /> Réinitialiser mot de passe
                            </DropdownMenuItem>
                          )}
                          {isSuperAdmin && (
                            <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setConfirmDelete(member) }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="px-4 pb-4">
                    <div className="flex items-end justify-between -mt-6 mb-3">
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-4 border-card shadow-lg">
                          <AvatarImage src={member.avatar_url ?? undefined} />
                          <AvatarFallback className={cn('text-sm font-bold text-white bg-gradient-to-br', role?.gradient || getGradient(member.id))}>
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {member.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold border', role?.bg, role?.color, 'border-current/20')}>
                        {role?.label || member.role}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm leading-tight">{member.full_name || 'Sans nom'}</h3>
                      {/* Badge disponibilité */}
                      {(() => {
                        const avail = presenceMap[member.id]
                        if (!avail) return null
                        const cfg = AVAIL_CONFIG[avail]
                        return (
                          <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                            <div className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                            {cfg.label}
                          </span>
                        )
                      })()}
                    </div>
                    {member.email && (
                      <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                    )}

                    <div className="my-3 h-px bg-border/50" />

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Actives', value: member.activeTasksCount },
                        { label: 'Complétées', value: member.completedTasksCount },
                        { label: 'Projets', value: member.activeProjects.length },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-2 rounded-xl bg-muted/40">
                          <p className="text-sm font-bold">{value}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Completion bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> Complétion
                        </span>
                        <span className="text-[11px] font-bold text-emerald-500">{completionRate}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Workload bar */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Charge
                        </span>
                        <span className={cn('text-[11px] font-semibold', w.color)}>{w.label}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-1000', w.bar)} style={{ width: `${w.pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
            {filtered.map(member => {
              const role = roleConfig[member.role]
              const w = workloadInfo(member.activeTasksCount)
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback className={cn('text-sm font-bold text-white bg-gradient-to-br', role?.gradient || getGradient(member.id))}>
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.status === 'active' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold', role?.bg, role?.color)}>
                      {role?.label || member.role}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
                    <span>{member.activeTasksCount} tâches</span>
                    <span className={cn('font-semibold', w.color)}>{w.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FICHE MEMBRE ── */}
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl gap-0">
            {selectedMember && (() => {
              const role = roleConfig[selectedMember.role]
              const w = workloadInfo(selectedMember.activeTasksCount)
              const completionRate = selectedMember.totalTasksCount > 0
                ? Math.round((selectedMember.completedTasksCount / selectedMember.totalTasksCount) * 100)
                : 0
              const isTop = topPerformers.some(t => t.id === selectedMember.id)

              return (
                <>
                  {/* Hero */}
                  <div className={cn('relative h-28 bg-gradient-to-br overflow-hidden', role?.gradient || getGradient(selectedMember.id))}>
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-card/10" />
                    <div className="absolute right-10 top-6 w-20 h-20 rounded-full bg-card/5" />
                    {isTop && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                        <Crown className="h-3 w-3 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Top Performer</span>
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-5">
                    {/* Avatar + Badge */}
                    <div className="flex items-end justify-between -mt-8 mb-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-4 border-background shadow-xl">
                          <AvatarImage src={selectedMember.avatar_url ?? undefined} />
                          <AvatarFallback className={cn('text-base font-bold text-white bg-gradient-to-br', role?.gradient || getGradient(selectedMember.id))}>
                            {getInitials(selectedMember.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {selectedMember.status === 'active' && (
                          <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full shadow" />
                        )}
                      </div>
                      <div className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border', role?.bg, role?.color, 'border-current/20')}>
                        {role?.label || selectedMember.role}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-xl font-bold">{selectedMember.full_name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-xs font-medium', selectedMember.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground')}>
                          {selectedMember.status === 'active' ? '● Actif' : '● Suspendu'}
                        </span>
                        {selectedMember.created_at && (
                          <span className="text-xs text-muted-foreground">
                            · Depuis {new Date(selectedMember.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats 4 colonnes */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: 'Actives',  value: selectedMember.activeTasksCount,   color: w.color },
                        { label: 'Total',    value: selectedMember.totalTasksCount,     color: 'text-foreground' },
                        { label: 'Faites',   value: selectedMember.completedTasksCount, color: 'text-emerald-500' },
                        { label: 'Projets',  value: selectedMember.activeProjects.length, color: 'text-blue-500' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-muted/40 rounded-xl p-2.5 text-center">
                          <p className={cn('text-lg font-bold', color)}>{value}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Barres de progression */}
                    <div className="space-y-3 mb-4">
                      <div className="space-y-1.5 p-3 rounded-xl bg-muted/30">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Target className="h-3 w-3" /> Taux de complétion
                          </span>
                          <span className="text-sm font-bold text-emerald-500">{completionRate}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${completionRate}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1.5 p-3 rounded-xl bg-muted/30">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Zap className="h-3 w-3" /> Charge de travail
                          </span>
                          <span className={cn('text-sm font-bold', w.color)}>{w.label}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', w.bar)} style={{ width: `${w.pct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Projets */}
                    {selectedMember.activeProjects.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Projets assignés</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMember.activeProjects.map(p => (
                            <span key={p} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium">
                              <FolderKanban className="h-3 w-3" /> {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="space-y-2">
                      {selectedMember.email && (
                        <a
                          href={`mailto:${selectedMember.email}`}
                          className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors group/link"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <span className="truncate flex-1">{selectedMember.email}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      )}
                      {selectedMember.phone && (
                        <a
                          href={`tel:${selectedMember.phone}`}
                          className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors group/link"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <span className="flex-1">{selectedMember.phone}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      )}
                    </div>

                    {/* Actions admin */}
                    {(canManage || isSuperAdmin) && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                        {canManage && (
                          <Button
                            variant="outline" size="sm" className="flex-1 text-xs"
                            onClick={() => { setEditMember(selectedMember); setEditRole(selectedMember.role); setEditStatus(selectedMember.status); setSelectedMember(null) }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Modifier le rôle
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <Button
                            variant="outline" size="sm"
                            className="text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                            title="Réinitialiser le mot de passe"
                            onClick={() => { setResetPasswordMember(selectedMember); setNewPassword(''); setSelectedMember(null) }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <Button
                            variant="destructive" size="sm" className="text-xs"
                            onClick={() => { setConfirmDelete(selectedMember); setSelectedMember(null) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>

        {/* ── EDIT DIALOG ── */}
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle>Modifier le rôle</DialogTitle></DialogHeader>
            {editMember && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn('text-sm font-bold text-white bg-gradient-to-br', getGradient(editMember.id))}>
                      {getInitials(editMember.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{editMember.full_name}</p>
                    <p className="text-xs text-muted-foreground">{editMember.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setEditMember(null)}>Annuler</Button>
                  <Button onClick={handleUpdateMember} disabled={saving}>{saving ? 'Mise à jour...' : 'Enregistrer'}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── CONFIRM DELETE ── */}
        <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="text-destructive">Supprimer ce profil ?</DialogTitle></DialogHeader>
            {confirmDelete && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-destructive/20 text-destructive font-bold">
                      {getInitials(confirmDelete.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{confirmDelete.full_name}</p>
                    <p className="text-xs text-muted-foreground">{confirmDelete.email}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Cette action est <strong>irréversible</strong>. Toutes les données liées seront supprimées.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                  <Button variant="destructive" onClick={() => handleDeleteMember(confirmDelete)}>Supprimer définitivement</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── RESET PASSWORD DIALOG ── */}
        <Dialog open={!!resetPasswordMember} onOpenChange={() => { setResetPasswordMember(null); setNewPassword('') }}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" /> Réinitialiser le mot de passe
              </DialogTitle>
            </DialogHeader>
            {resetPasswordMember && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn('text-sm font-bold text-white bg-gradient-to-br', getGradient(resetPasswordMember.id))}>
                      {getInitials(resetPasswordMember.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{resetPasswordMember.full_name}</p>
                    <p className="text-xs text-muted-foreground">{resetPasswordMember.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="Min. 6 caractères"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Ce mot de passe sera actif immédiatement. Communique-le à l'utilisateur en privé.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setResetPasswordMember(null); setNewPassword('') }}>Annuler</Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={resetting || newPassword.length < 6}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {resetting ? 'Réinitialisation...' : 'Confirmer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
