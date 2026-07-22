'use client'

import { useEffect, useState } from 'react'
import { supabase, Project, Client } from '@/lib/supabase'
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'
import { getPermissions, isChefProjetOrAbove } from '@/lib/permissions'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import {
  Plus, Search, MoreHorizontal, FolderKanban, Calendar, DollarSign,
  Edit, Trash2, KanbanSquare, List, ChevronRight, Users, Clock,
  FileDown, TrendingUp, CheckCircle2, AlertCircle, Timer, Zap, Target
} from 'lucide-react'
import { downloadProjectsPDF } from '@/lib/pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const statusConfig = {
  en_attente: {
    label: 'En attente',
    color: '#8A8F98',
    bg: 'rgba(138,143,152,0.12)',
    border: 'rgba(138,143,152,0.3)',
    icon: Timer,
    glow: 'shadow-[0_0_12px_rgba(138,143,152,0.2)]'
  },
  en_cours: {
    label: 'En cours',
    color: '#00E5FF',
    bg: 'rgba(0,229,255,0.1)',
    border: 'rgba(0,229,255,0.3)',
    icon: Zap,
    glow: 'shadow-[0_0_12px_rgba(0,229,255,0.25)]'
  },
  en_validation: {
    label: 'En validation',
    color: '#FFB41E',
    bg: 'rgba(255,180,30,0.1)',
    border: 'rgba(255,180,30,0.3)',
    icon: Target,
    glow: 'shadow-[0_0_12px_rgba(255,180,30,0.2)]'
  },
  termine: {
    label: 'Terminé',
    color: '#00FF88',
    bg: 'rgba(0,255,136,0.08)',
    border: 'rgba(0,255,136,0.3)',
    icon: CheckCircle2,
    glow: 'shadow-[0_0_12px_rgba(0,255,136,0.2)]'
  },
  bloque: {
    label: 'Bloqué',
    color: '#FF4444',
    bg: 'rgba(255,68,68,0.1)',
    border: 'rgba(255,68,68,0.3)',
    icon: AlertCircle,
    glow: 'shadow-[0_0_12px_rgba(255,68,68,0.2)]'
  },
}

const emptyForm = {
  client_id: 'none',
  title: '',
  description: '',
  status: 'en_attente' as Project['status'],
  start_date: '',
  end_date: '',
  budget: ''
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: pct > 0 ? `0 0 6px ${color}80` : 'none'
        }}
      />
    </div>
  )
}

export default function ProjectsPage() {
  const { profile } = useAuth()
  const perms = getPermissions(profile?.role)
  const isManager = isChefProjetOrAbove(profile?.role)
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'list' | 'kanban' | 'grid'>('grid')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

    async function fetchAll() {
      if (!profile?.id) return

    const cached = cacheGet<any>(`projects_all`)
    if (cached) {
      setProjects(cached.projects)
      setClients(cached.clients)
      setLoading(false)
      return
    }

    // Tous les membres de l'agence voient tous les projets
    const projectsQuery = supabase.from('projects').select('*, clients(company_name, contact_name)').order('created_at', { ascending: false })

    const [{ data: projectsData }, { data: taskData }, { data: clientsData }] = await Promise.all([
      projectsQuery,
      supabase.from('tasks').select('project_id, status'),
      supabase.from('clients').select('id, company_name, contact_name').order('company_name'),
    ])

    const mapped = (projectsData || []).map((p: any) => {
      const ptasks = (taskData || []).filter((t: any) => t.project_id === p.id)
      const done = ptasks.filter((t: any) => t.status === 'termine').length
      const pct = ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0
      return { ...p, task_count: ptasks.length, task_done: done, progress_pct: pct }
    })

    cacheSet(`projects_all`, { projects: mapped, clients: clientsData || [] })
    setProjects(mapped)
    setClients(clientsData || [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.id) fetchAll() }, [profile?.id])

  function openCreate() { setEditProject(null); setForm(emptyForm); setDialogOpen(true) }
  function openEdit(p: Project) {
    setEditProject(p)
    setForm({ client_id: (p as any).client_id || 'none', title: p.title, description: p.description || '', status: p.status, start_date: (p as any).start_date || '', end_date: (p as any).end_date || '', budget: (p as any).budget?.toString() || '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title) { toast.error('Titre requis'); return }
    setSaving(true)
    const payload = { ...form, client_id: form.client_id === 'none' ? null : form.client_id, budget: parseFloat(form.budget) || 0, start_date: form.start_date || null, end_date: form.end_date || null }
    if (editProject) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editProject.id)
      if (error) toast.error('Mise à jour impossible')
      else { toast.success('Projet mis à jour'); cacheInvalidate('projects_all', 'dashboard'); fetchAll(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('projects').insert(payload)
      if (error) toast.error('Création impossible')
      else { toast.success('Projet créé'); cacheInvalidate('projects_all', 'dashboard'); fetchAll(); setDialogOpen(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) toast.error('Suppression impossible')
    else { toast.success('Projet supprimé'); cacheInvalidate('projects_all', 'dashboard'); fetchAll() }
  }

  const filtered = projects.filter(p => {
    const matchSearch = search === '' || p.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress_pct || 0), 0) / projects.length) : 0

  return (
    <div className="p-4 md:p-6 space-y-6 pt-4 md:pt-6 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {isManager ? 'Projets' : 'Mes projets'}
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            {projects.length} projet{projects.length > 1 ? 's' : ''} · progression moyenne {avgProgress}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => downloadProjectsPDF(filtered)}
            className="gap-2 border text-sm"
            style={{ borderColor: 'rgba(0,102,255,0.4)', color: '#0066FF', background: 'rgba(0,102,255,0.08)' }}
          >
            <FileDown className="h-4 w-4" /> Exporter PDF
          </Button>
          {perms.canCreateProject && (
            <Button
              onClick={openCreate}
              className="gap-2 font-semibold"
              style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', color: '#0B0F14', border: 'none' }}
            >
              <Plus className="h-4 w-4" /> Nouveau projet
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = projects.filter(p => p.status === key).length
          const Icon = cfg.icon
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className="rounded-xl p-4 text-left transition-all duration-200 cursor-pointer group bg-card border border-border"
              style={{
                background: filter === key ? cfg.bg : undefined,
                border: filter === key ? `1px solid ${cfg.border}` : undefined,
                boxShadow: filter === key ? cfg.glow : 'none'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                <span className="text-2xl font-bold text-foreground">{count}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: filter === key ? cfg.color : '#8A8F98' }}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Budget + progress global */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.2)' }}>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,102,255,0.2)' }}>
            <DollarSign className="h-5 w-5" style={{ color: '#0066FF' }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget total portefeuille</p>
            <p className="text-lg font-bold text-foreground">{totalBudget.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">GNF</span></p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.15)' }}>
            <TrendingUp className="h-5 w-5" style={{ color: '#00E5FF' }} />
          </div>
          <div className="flex-1">
            <p className="text-xs mb-2 text-muted-foreground">Progression moyenne — {avgProgress}%</p>
            <ProgressBar pct={avgProgress} color="#00E5FF" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8A8F98' }} />
          <Input
            placeholder="Rechercher un projet..."
            className="pl-9 border text-foreground placeholder:text-muted-foreground bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* View switcher */}
        <div className="flex items-center gap-1 rounded-lg p-1 bg-muted/30 border border-border">
          {(['grid', 'list', 'kanban'] as const).map(v => {
            const icons = { grid: <FolderKanban className="h-4 w-4" />, list: <List className="h-4 w-4" />, kanban: <KanbanSquare className="h-4 w-4" /> }
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="p-2 rounded-md transition-all"
                style={{
                  background: view === v ? '#0066FF' : 'transparent',
                  color: view === v ? 'white' : '#8A8F98'
                }}
              >
                {icons[v]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: '#00E5FF' }} />
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucun projet trouvé</p>
            </div>
          ) : filtered.map(project => {
            const cfg = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.en_attente
            const Icon = cfg.icon
            const daysLeft = project.end_date ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000) : null
            return (
              <div
                key={project.id}
                className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] group bg-card border border-border"
              >
                {/* Color top bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}60, ${cfg.color})` }} />

                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    {isManager && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/40">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(project)} className="text-foreground">
                            <Edit className="mr-2 h-4 w-4" style={{ color: '#0066FF' }} /> Modifier
                          </DropdownMenuItem>
                          {perms.canDeleteProject && (
                            <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-red-400 hover:bg-red-500/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground text-base mb-1 leading-tight">{project.title}</h3>
                  {project.clients && (
                    <p className="text-xs mb-3 text-muted-foreground">{project.clients.company_name}</p>
                  )}

                  {/* Progress */}
                  {project.task_count > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Avancement</span>
                        <span className="text-xs font-bold" style={{ color: cfg.color }}>{project.progress_pct}%</span>
                      </div>
                      <ProgressBar pct={project.progress_pct} color={cfg.color} />
                      <p className="text-xs mt-1 text-muted-foreground">{project.task_done}/{project.task_count} tâches</p>
                    </div>
                  )}

                  {/* Footer info */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      {project.budget > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" style={{ color: '#0066FF' }} />
                          <span className="text-xs font-medium text-foreground">{(project.budget / 1000).toFixed(0)}k</span>
                          <span className="text-xs text-muted-foreground">GNF</span>
                        </div>
                      )}
                      {daysLeft !== null && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" style={{ color: daysLeft < 7 ? '#FF4444' : '#8A8F98' }} />
                          <span className="text-xs" style={{ color: daysLeft < 0 ? '#FF4444' : daysLeft < 7 ? '#FFB41E' : '#8A8F98' }}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}j dépassé` : `${daysLeft}j restants`}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all" style={{ background: 'rgba(0,102,255,0.1)', color: '#0066FF', border: '1px solid rgba(0,102,255,0.2)' }}>
                        Ouvrir <ChevronRight className="h-3 w-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : view === 'list' ? (
        <div className="rounded-xl overflow-hidden border border-border overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Projet', 'Client', 'Statut', 'Avancement', 'Budget', 'Échéance', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16" style={{ color: '#8A8F98' }}>Aucun projet trouvé</td></tr>
                ) : filtered.map((project, i) => {
                  const cfg = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.en_attente
                  return (
                    <tr
                      key={project.id}
                      className={cn("transition-colors group border-b border-border", i % 2 !== 0 && "bg-muted/10")}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground text-sm">{project.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{project.clients?.company_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        {project.task_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar pct={project.progress_pct} color={cfg.color} /></div>
                            <span className="text-xs font-bold w-8 text-right" style={{ color: cfg.color }}>{project.progress_pct}%</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{project.budget > 0 ? `${project.budget.toLocaleString('fr-FR')} GNF` : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/projects/${project.id}`}>
                            <button className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,102,255,0.1)' }}>
                              <ChevronRight className="h-3.5 w-3.5" style={{ color: '#0066FF' }} />
                            </button>
                          </Link>
                          {isManager && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/40">
                                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(project)} className="text-foreground">
                                  <Edit className="mr-2 h-4 w-4" style={{ color: '#0066FF' }} /> Modifier
                                </DropdownMenuItem>
                                {perms.canDeleteProject && (
                                  <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-red-400 hover:bg-red-500/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(['en_attente', 'en_cours', 'en_validation', 'termine', 'bloque'] as const).map(col => {
            const cfg = statusConfig[col]
            const colProjects = filtered.filter(p => p.status === col)
            return (
              <div key={col} className="flex-shrink-0 w-72">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                    <h3 className="font-semibold text-sm text-foreground">{cfg.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {colProjects.length === 0 && (
                    <div className="rounded-xl p-4 text-center text-xs bg-muted/10 border border-dashed border-border text-muted-foreground"
                      style={{ borderColor: cfg.border }}>
                      Aucun projet
                    </div>
                  )}
                  {colProjects.map(project => (
                    <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                      <div
                        className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] group bg-card border border-border"
                      >
                        <div className="h-0.5 w-8 rounded-full mb-3" style={{ background: cfg.color }} />
                        <p className="font-semibold text-sm text-foreground mb-1 leading-tight">{project.title}</p>
                        {project.clients && <p className="text-xs mb-3 text-muted-foreground">{project.clients.company_name}</p>}
                        {project.task_count > 0 && (
                          <div className="mb-3">
                            <ProgressBar pct={project.progress_pct} color={cfg.color} />
                            <p className="text-xs mt-1 text-muted-foreground">{project.task_done}/{project.task_count} tâches</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {project.budget > 0 && (
                            <span className="text-xs text-muted-foreground">{(project.budget / 1000).toFixed(0)}k GNF</span>
                          )}
                          {project.end_date && (
                            <span className="text-xs text-muted-foreground">{new Date(project.end_date).toLocaleDateString('fr-FR')}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Titre du projet *</Label>
              <Input
                placeholder="Ex: Refonte site web..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Project['status'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Description du projet..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Début', key: 'start_date', type: 'date' },
                { label: 'Échéance', key: 'end_date', type: 'date' },
                { label: 'Budget (GNF)', key: 'budget', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{label}</Label>
                  <Input
                    type={type}
                    placeholder="0"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', color: '#0B0F14', fontWeight: 600, border: 'none' }}
            >
              {saving ? 'Enregistrement...' : editProject ? 'Mettre à jour' : 'Créer le projet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
