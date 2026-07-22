'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Palette, Plus, CheckCircle2, AlertCircle, Upload, Layers, Target,
  FolderOpen, Image, RefreshCw, BookOpen, Clock, Star, ExternalLink,
  Trash2, ChevronRight, MessageSquare, Filter, BarChart3, Award,
} from 'lucide-react'
import { format, isToday, isBefore, parseISO, startOfDay, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const VISUAL_TYPES = [
  { value: 'logo',              label: 'Logo / Identité visuelle' },
  { value: 'flyer',             label: 'Flyer / Tract' },
  { value: 'affiche',           label: 'Affiche' },
  { value: 'carrousel',         label: 'Carrousel Social Media' },
  { value: 'banniere',          label: 'Bannière / Cover' },
  { value: 'mockup',            label: 'Mockup' },
  { value: 'ui_design',         label: 'UI Design / Maquette Web' },
  { value: 'carte_visite',      label: 'Carte de visite' },
  { value: 'packaging',         label: 'Packaging' },
  { value: 'motion',            label: 'Motion Design' },
  { value: 'autre',             label: 'Autre' },
]

const TASK_STATUSES = [
  { value: 'a_faire',    label: 'À faire',      color: 'text-slate-600 border-slate-300',   dot: 'bg-slate-400' },
  { value: 'en_cours',   label: 'En cours',     color: 'text-blue-600 border-blue-300',     dot: 'bg-blue-500' },
  { value: 'en_revision',label: 'En révision',  color: 'text-amber-600 border-amber-300',   dot: 'bg-amber-500' },
  { value: 'a_corriger', label: 'À corriger',   color: 'text-red-600 border-red-300',       dot: 'bg-red-500' },
  { value: 'valide',     label: 'Validé',       color: 'text-purple-600 border-purple-300', dot: 'bg-purple-500' },
  { value: 'livre',      label: 'Livré',        color: 'text-emerald-600 border-emerald-300', dot: 'bg-emerald-500' },
]

const PRIORITIES = [
  { value: 'haute',   label: 'Haute',   color: 'text-red-600 border-red-300' },
  { value: 'moyenne', label: 'Moyenne', color: 'text-amber-600 border-amber-300' },
  { value: 'basse',   label: 'Basse',   color: 'text-slate-500 border-slate-300' },
]

const RESOURCE_CATEGORIES = [
  { value: 'logo_client',  label: 'Logo client' },
  { value: 'charte',       label: 'Charte graphique' },
  { value: 'police',       label: 'Police / Typo' },
  { value: 'template',     label: 'Template agence' },
  { value: 'mockup',       label: 'Mockup' },
  { value: 'banque_image', label: 'Banque d\'images' },
  { value: 'autre',        label: 'Autre' },
]

const FILE_VERSIONS = ['V1', 'V2', 'V3', 'V4', 'Final']

function statusInfo(val: string) {
  return TASK_STATUSES.find(s => s.value === val) ?? TASK_STATUSES[0]
}
function priorityInfo(val: string) {
  return PRIORITIES.find(p => p.value === val) ?? PRIORITIES[1]
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DesignPage() {
  useRoleGuard(['super_admin', 'chef_projet', 'designer', 'designer_senior'])
  const { profile } = useAuth()
  const [tab, setTab] = useState('tasks')

  const isManager = profile && ['super_admin', 'chef_projet', 'designer_senior', 'manager', 'ceo', 'dirigeant'].includes(profile.role)

  const NAV = [
    { value: 'tasks',        label: 'Tâches',       icon: Target,      accent: 'text-blue-500',    bg: 'bg-blue-500/10' },
    { value: 'deliverables', label: 'Livrables',    icon: Upload,      accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { value: 'corrections',  label: 'Corrections',  icon: RefreshCw,   accent: 'text-amber-500',   bg: 'bg-amber-500/10' },
    { value: 'resources',    label: 'Ressources',   icon: BookOpen,    accent: 'text-purple-500',  bg: 'bg-purple-500/10' },
    { value: 'stats',        label: 'Productivité', icon: BarChart3,   accent: 'text-indigo-500',  bg: 'bg-indigo-500/10' },
  ]

  return (
    <div className="pt-0 md:pt-0 min-h-screen">
      {/* ── Banner studio ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 px-6 py-8 md:py-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a855f7 0%, transparent 50%)' }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 shadow-xl">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Design Studio</h1>
              <p className="text-indigo-200/70 text-sm mt-0.5">Tâches · Livrables · Corrections · Ressources</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {NAV.map(n => {
              const Icon = n.icon
              return (
                <button
                  key={n.value}
                  onClick={() => setTab(n.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    tab === n.value
                      ? 'bg-white text-indigo-900 border-white/80 shadow-lg'
                      : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{n.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="p-4 md:p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="hidden">
            {NAV.map(n => <TabsTrigger key={n.value} value={n.value} />)}
          </TabsList>

          <TabsContent value="tasks"        className="mt-0"><TasksTab isManager={!!isManager} /></TabsContent>
          <TabsContent value="deliverables" className="mt-0"><DeliverablesTab /></TabsContent>
          <TabsContent value="corrections"  className="mt-0"><CorrectionsTab isManager={!!isManager} /></TabsContent>
          <TabsContent value="resources"    className="mt-0"><ResourcesTab isManager={!!isManager} /></TabsContent>
          <TabsContent value="stats"        className="mt-0"><StatsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── ONGLET TÂCHES ────────────────────────────────────────────────────────────
function TasksTab({ isManager }: { isManager: boolean }) {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [openTask, setOpenTask] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', client_name: '', visual_type: 'logo', description: '',
    deadline: '', priority: 'moyenne', revisions_included: '3', assigned_to: '',
  })

  useEffect(() => { fetchAll() }, [profile?.id])

  async function fetchAll() {
    if (!profile?.id) return
    setLoading(true)
    const [tasksRes, designersRes] = await Promise.all([
      isManager
        ? supabase.from('design_tasks').select('*, assigned_profile:profiles!design_tasks_assigned_to_fkey(full_name)').order('deadline', { ascending: true })
        : supabase.from('design_tasks').select('*, assigned_profile:profiles!design_tasks_assigned_to_fkey(full_name)').eq('assigned_to', profile.id).order('deadline', { ascending: true }),
      isManager
        ? supabase.from('profiles').select('id,full_name').in('role', ['designer','graphiste','designer_senior'])
        : Promise.resolve({ data: [] }),
    ])
    setTasks(tasksRes.data || [])
    setDesigners((designersRes as any).data || [])
    setLoading(false)
  }

  async function createTask() {
    if (!form.title || !profile?.id) return
    setSaving(true)
    await supabase.from('design_tasks').insert({
      title: form.title,
      client_name: form.client_name || null,
      visual_type: form.visual_type,
      description: form.description || null,
      deadline: form.deadline || null,
      priority: form.priority,
      revisions_included: parseInt(form.revisions_included) || 3,
      revisions_used: 0,
      assigned_to: form.assigned_to || profile.id,
      assigned_by: profile.id,
      status: 'a_faire',
    })
    setSaving(false)
    setCreating(false)
    setForm({ title: '', client_name: '', visual_type: 'logo', description: '', deadline: '', priority: 'moyenne', revisions_included: '3', assigned_to: '' })
    fetchAll()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('design_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchAll()
  }

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)
  const urgent = tasks.filter(t => t.deadline && !['livre','valide'].includes(t.status) && isBefore(parseISO(t.deadline), new Date(Date.now() + 3 * 86400000)))

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {/* Alerte urgents */}
      {urgent.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50/50 border border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{urgent.length} tâche(s) urgente(s) — deadline dans moins de 3 jours</p>
        </div>
      )}

      {/* Header + filtres */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')} className="text-xs h-8">
            Toutes ({tasks.length})
          </Button>
          {TASK_STATUSES.map(s => (
            <Button key={s.value} variant={filterStatus === s.value ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterStatus(s.value)} className="text-xs h-8">
              {s.label} ({tasks.filter(t => t.status === s.value).length})
            </Button>
          ))}
        </div>
        {isManager && (
          <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />Assigner une tâche
          </Button>
        )}
      </div>

      {/* Pipeline kanban-like */}
      <div className="flex gap-2 flex-wrap">
        {TASK_STATUSES.map((s, i) => (
          <div key={s.value} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium bg-card">
              <div className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
              {s.label}
              <span className="ml-0.5 text-muted-foreground">{tasks.filter(t => t.status === s.value).length}</span>
            </div>
            {i < TASK_STATUSES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Liste tâches */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune tâche {filterStatus !== 'all' ? `"${statusInfo(filterStatus).label}"` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(task => {
            const st = statusInfo(task.status)
            const pr = priorityInfo(task.priority)
            const isLate = task.deadline && isBefore(parseISO(task.deadline), startOfDay(new Date())) && !['livre','valide'].includes(task.status)
            const daysLeft = task.deadline ? differenceInDays(parseISO(task.deadline), new Date()) : null
            const revisionsLeft = (task.revisions_included || 3) - (task.revisions_used || 0)
            const VISUAL_EMOJI: Record<string, string> = {
              logo: '🔵', flyer: '📄', affiche: '🖼️', carrousel: '📱', banniere: '🏞️',
              mockup: '📦', ui_design: '💻', carte_visite: '🪪', packaging: '📫', motion: '🎬', autre: '✏️',
            }
            const ACCENT: Record<string, string> = {
              a_faire: 'border-l-slate-400', en_cours: 'border-l-blue-500', en_revision: 'border-l-amber-500',
              a_corriger: 'border-l-red-500', valide: 'border-l-purple-500', livre: 'border-l-emerald-500',
            }
            return (
              <div
                key={task.id}
                onClick={() => setOpenTask(task)}
                className={cn(
                  'group relative rounded-xl border border-border/40 bg-card hover:bg-card/80 hover:border-indigo-300/50 transition-all cursor-pointer border-l-4 shadow-sm hover:shadow-md',
                  ACCENT[task.status] || 'border-l-slate-300',
                  isLate && 'border-red-300/60 bg-red-50/10 dark:bg-red-950/5'
                )}
              >
                <div className="p-4">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{VISUAL_EMOJI[task.visual_type] || '✏️'}</span>
                      <p className="font-semibold text-sm truncate">{task.title}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', pr.color)}>{pr.label}</span>
                  </div>

                  {/* Client */}
                  {task.client_name && (
                    <p className="text-xs text-muted-foreground font-medium mb-2 truncate">{task.client_name}</p>
                  )}

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded-full border font-semibold text-[10px]', st.color)}>{st.label}</span>
                      {task.deadline && (
                        <span className={cn('flex items-center gap-1 text-muted-foreground', isLate ? 'text-red-500 font-semibold' : '')}>
                          <Clock className="h-3 w-3" />
                          {isLate ? 'Retard' : daysLeft === 0 ? "Auj." : daysLeft !== null ? `${daysLeft}j` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />{revisionsLeft}/{task.revisions_included || 3}
                    </span>
                  </div>

                  {/* Quick status */}
                  <div className="mt-3 pt-3 border-t border-border/40" onClick={e => e.stopPropagation()}>
                    <Select value={task.status} onValueChange={v => updateStatus(task.id, v)}>
                      <SelectTrigger className="h-7 text-xs bg-muted/40 border-border/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                              {s.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal détail tâche */}
      <Dialog open={!!openTask} onOpenChange={() => setOpenTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{openTask?.title}</span>
              {openTask && <Badge variant="outline" className={cn('text-xs', statusInfo(openTask.status).color)}>{statusInfo(openTask.status).label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {openTask && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium">{openTask.client_name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Type visuel</p><p className="font-medium capitalize">{openTask.visual_type?.replace(/_/g, ' ') || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Priorité</p><Badge variant="outline" className={cn('text-xs', priorityInfo(openTask.priority).color)}>{priorityInfo(openTask.priority).label}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{openTask.deadline ? format(parseISO(openTask.deadline), 'dd MMM yyyy', { locale: fr }) : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Révisions</p><p className="font-medium">{openTask.revisions_used || 0}/{openTask.revisions_included || 3} utilisées</p></div>
                <div><p className="text-xs text-muted-foreground">Assigné à</p><p className="font-medium">{openTask.assigned_profile?.full_name || '—'}</p></div>
              </div>
              {openTask.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Brief / Description</p>
                  <p className="text-sm bg-muted/50 rounded p-3 whitespace-pre-wrap">{openTask.description}</p>
                </div>
              )}
              <div>
                <Label className="text-xs mb-1 block">Changer le statut</Label>
                <Select value={openTask.status} onValueChange={v => { updateStatus(openTask.id, v); setOpenTask({ ...openTask, status: v }) }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full text-xs" onClick={() => { setOpenTask(null); setTimeout(() => document.querySelector('[data-value="deliverables"]')?.dispatchEvent(new MouseEvent('click')), 100) }}>
                <Upload className="h-3.5 w-3.5 mr-2" />Uploader un livrable pour cette tâche
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal créer tâche */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assigner une tâche design</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Nom du projet *</Label>
              <Input placeholder="Ex: Logo Restaurant Le Jardin" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div><Label className="text-xs">Client</Label>
              <Input placeholder="Nom du client" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="mt-1" />
            </div>
            <div><Label className="text-xs">Type de visuel</Label>
              <Select value={form.visual_type} onValueChange={v => setForm(f => ({ ...f, visual_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{VISUAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description / Brief</Label>
              <Textarea rows={3} placeholder="Consignes, références, couleurs, style..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1" />
              </div>
              <div><Label className="text-xs">Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Révisions incluses</Label>
              <Input type="number" min="0" max="10" value={form.revisions_included} onChange={e => setForm(f => ({ ...f, revisions_included: e.target.value }))} className="mt-1 w-24" />
            </div>
            {designers.length > 0 && (
              <div><Label className="text-xs">Assigner à</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Designer…" /></SelectTrigger>
                  <SelectContent>{designers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" disabled={saving || !form.title} onClick={createTask}>
              {saving ? 'Création...' : 'Créer & assigner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ONGLET LIVRABLES ─────────────────────────────────────────────────────────
function DeliverablesTab() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedTask, setSelectedTask] = useState('')
  const [version, setVersion] = useState('V1')
  const [note, setNote] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchAll() }, [profile?.id])

  async function fetchAll() {
    if (!profile?.id) return
    setLoading(true)
    const [tRes, dRes] = await Promise.all([
      supabase.from('design_tasks').select('id,title,client_name,status').eq('assigned_to', profile.id).neq('status', 'livre').order('deadline', { ascending: true }),
      supabase.from('design_deliverables').select('*, design_tasks(title, client_name)').eq('uploaded_by', profile.id).order('uploaded_at', { ascending: false }),
    ])
    setTasks(tRes.data || [])
    setDeliverables(dRes.data || [])
    setLoading(false)
  }

  async function handleUpload() {
    if (!profile?.id || !selectedTask) return
    const file = fileRef.current?.files?.[0]
    if (!file && !figmaUrl) return
    setUploading(true)

    let fileUrl = figmaUrl || ''

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${selectedTask}/${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('design-deliverables').upload(path, file, { upsert: true })
      if (up) {
        const { data: urlData } = supabase.storage.from('design-deliverables').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }
    }

    await supabase.from('design_deliverables').insert({
      task_id: selectedTask,
      file_url: fileUrl || null,
      file_name: file?.name || figmaUrl || 'Lien externe',
      file_type: file?.type || 'figma',
      version,
      uploaded_by: profile.id,
      note: note || null,
    })

    // Passer la tâche en révision automatiquement
    await supabase.from('design_tasks').update({ status: 'en_revision', updated_at: new Date().toISOString() }).eq('id', selectedTask)

    setUploading(false)
    setSelectedTask('')
    setNote('')
    setFigmaUrl('')
    if (fileRef.current) fileRef.current.value = ''
    fetchAll()
  }

  // Grouper livrables par tâche
  const grouped = deliverables.reduce((acc: Record<string, any[]>, d) => {
    const key = d.task_id
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-indigo-300/60 dark:border-indigo-700/60 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h3 className="font-bold text-sm mb-5 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Upload className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          Uploader un livrable
        </h3>
        <div className="space-y-3 relative">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tâche *</Label>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="mt-1 bg-white dark:bg-card border-border/60"><SelectValue placeholder="Sélectionner une tâche..." /></SelectTrigger>
              <SelectContent>
                {tasks.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.title}{t.client_name ? ` — ${t.client_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Version</Label>
              <Select value={version} onValueChange={setVersion}>
                <SelectTrigger className="mt-1 bg-white dark:bg-card border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>{FILE_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lien Figma / Drive</Label>
              <Input placeholder="https://figma.com/..." value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} className="mt-1 bg-white dark:bg-card border-border/60" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fichier (PSD, AI, PNG, JPG, PDF…)</Label>
            <Input ref={fileRef} type="file" accept=".psd,.ai,.png,.jpg,.jpeg,.pdf,.sketch,.xd,.fig,.zip" className="mt-1 bg-white dark:bg-card border-border/60" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note (optionnel)</Label>
            <Input placeholder="Modifications apportées, remarques..." value={note} onChange={e => setNote(e.target.value)} className="mt-1 bg-white dark:bg-card border-border/60" />
          </div>
          <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold" disabled={uploading || !selectedTask} onClick={handleUpload}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Upload en cours...' : 'Uploader le livrable'}
          </Button>
        </div>
      </div>

      {/* Historique par tâche */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Historique des livrables</h3>
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun livrable uploadé</p>
          </div>
        ) : Object.entries(grouped).map(([taskId, items]) => {
          const taskInfo = (items[0] as any).design_tasks
          return (
            <Card key={taskId} className="mb-3 border-border/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">{taskInfo?.title || '—'}{taskInfo?.client_name && <span className="text-muted-foreground font-normal"> — {taskInfo.client_name}</span>}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {(items as any[]).sort((a, b) => a.version.localeCompare(b.version)).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <Badge variant="outline" className={cn('text-xs shrink-0', d.version === 'Final' ? 'text-emerald-600 border-emerald-300' : 'text-purple-600 border-purple-300')}>
                        {d.version}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{d.file_name}</p>
                        {d.note && <p className="text-xs text-muted-foreground truncate">{d.note}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{format(new Date(d.uploaded_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        {d.file_url && (
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── ONGLET CORRECTIONS ───────────────────────────────────────────────────────
function CorrectionsTab({ isManager }: { isManager: boolean }) {
  const { profile } = useAuth()
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ task_id: '', comment: '' })

  useEffect(() => { fetchAll() }, [profile?.id])

  async function fetchAll() {
    if (!profile?.id) return
    setLoading(true)
    const [fRes, tRes] = await Promise.all([
      supabase.from('design_feedbacks')
        .select('*, design_tasks(title, client_name, status, assigned_to), requester:profiles!design_feedbacks_requested_by_fkey(full_name)')
        .order('created_at', { ascending: false }),
      isManager
        ? supabase.from('design_tasks').select('id,title,client_name').not('status', 'in', '("livre")')
        : supabase.from('design_tasks').select('id,title,client_name').eq('assigned_to', profile.id),
    ])
    setFeedbacks(fRes.data || [])
    setTasks((tRes as any).data || [])
    setLoading(false)
  }

  async function createFeedback() {
    if (!form.task_id || !form.comment || !profile?.id) return
    setSaving(true)
    await supabase.from('design_feedbacks').insert({
      task_id: form.task_id,
      comment: form.comment,
      requested_by: profile.id,
      status: 'en_attente',
    })
    // Repasser la tâche en "à corriger"
    await supabase.from('design_tasks').update({ status: 'a_corriger', revisions_used: undefined, updated_at: new Date().toISOString() }).eq('id', form.task_id)
    setSaving(false)
    setCreating(false)
    setForm({ task_id: '', comment: '' })
    fetchAll()
  }

  async function resolveCorrection(id: string, taskId: string) {
    await supabase.from('design_feedbacks').update({ status: 'resolu' }).eq('id', id)
    await supabase.from('design_tasks').update({ status: 'en_cours', updated_at: new Date().toISOString() }).eq('id', taskId)
    fetchAll()
  }

  const pending = feedbacks.filter(f => f.status === 'en_attente')
  const resolved = feedbacks.filter(f => f.status === 'resolu')

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-amber-500" />Corrections</h3>
          {pending.length > 0 && <Badge variant="destructive" className="text-xs">{pending.length} en attente</Badge>}
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />Demander une correction
        </Button>
      </div>

      {/* En attente */}
      {pending.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-emerald-500" />
          <p className="text-sm">Aucune correction en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">En attente ({pending.length})</p>
          {pending.map(f => (
            <Card key={f.id} className="border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm">{f.design_tasks?.title || '—'}</p>
                      {f.design_tasks?.client_name && <span className="text-xs text-muted-foreground">{f.design_tasks.client_name}</span>}
                    </div>
                    <p className="text-sm bg-white/60 dark:bg-black/20 rounded p-2 border border-amber-200/50">{f.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Demandé par {f.requester?.full_name || '—'} · {format(new Date(f.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1" onClick={() => resolveCorrection(f.id, f.task_id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />Résolu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Résolus */}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Résolus ({resolved.length})</p>
          {resolved.slice(0, 5).map(f => (
            <div key={f.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.design_tasks?.title || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{f.comment}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{format(new Date(f.created_at), 'dd/MM', { locale: fr })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal demander correction */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demander une correction</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Tâche concernée *</Label>
              <Select value={form.task_id} onValueChange={v => setForm(f => ({ ...f, task_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{tasks.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}{t.client_name ? ` — ${t.client_name}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Commentaire / Demande de modification *</Label>
              <Textarea rows={4} placeholder="Décrivez précisément les corrections à apporter..." value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} className="mt-1" />
            </div>
            <Button className="w-full" disabled={saving || !form.task_id || !form.comment} onClick={createFeedback}>
              {saving ? 'Envoi...' : 'Envoyer la demande de correction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ONGLET RESSOURCES ────────────────────────────────────────────────────────
function ResourcesTab({ isManager }: { isManager: boolean }) {
  const { profile } = useAuth()
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [form, setForm] = useState({ name: '', category: 'logo_client', client_name: '', external_url: '', tags: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchResources() }, [])

  async function fetchResources() {
    setLoading(true)
    const { data } = await supabase.from('design_resources').select('*, uploader:profiles!design_resources_uploaded_by_fkey(full_name)').order('created_at', { ascending: false })
    setResources(data || [])
    setLoading(false)
  }

  async function addResource() {
    if (!form.name || !profile?.id) return
    setSaving(true)
    let fileUrl = form.external_url || ''
    const file = fileRef.current?.files?.[0]
    if (file) {
      const path = `resources/${profile.id}/${Date.now()}_${file.name}`
      const { data: up } = await supabase.storage.from('design-deliverables').upload(path, file, { upsert: true })
      if (up) {
        const { data: urlData } = supabase.storage.from('design-deliverables').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }
    }
    await supabase.from('design_resources').insert({
      name: form.name,
      category: form.category,
      client_name: form.client_name || null,
      file_url: file ? fileUrl : null,
      external_url: !file ? fileUrl : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      uploaded_by: profile.id,
    })
    setSaving(false)
    setCreating(false)
    setForm({ name: '', category: 'logo_client', client_name: '', external_url: '', tags: '' })
    if (fileRef.current) fileRef.current.value = ''
    fetchResources()
  }

  async function deleteResource(id: string) {
    await supabase.from('design_resources').delete().eq('id', id)
    fetchResources()
  }

  const filtered = filterCat === 'all' ? resources : resources.filter(r => r.category === filterCat)
  const catLabels: Record<string, string> = Object.fromEntries(RESOURCE_CATEGORIES.map(c => [c.value, c.label]))

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterCat === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterCat('all')} className="text-xs h-8">
            Tout ({resources.length})
          </Button>
          {RESOURCE_CATEGORIES.map(c => (
            <Button key={c.value} variant={filterCat === c.value ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterCat(c.value)} className="text-xs h-8">
              {c.label} ({resources.filter(r => r.category === c.value).length})
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />Ajouter une ressource
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune ressource dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <Card key={r.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    {r.client_name && <p className="text-xs text-muted-foreground">{r.client_name}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(r.file_url || r.external_url) && (
                      <a href={r.file_url || r.external_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    )}
                    {isManager && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteResource(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs mb-2">{catLabels[r.category] || r.category}</Badge>
                {r.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{r.uploader?.full_name || '—'} · {format(new Date(r.created_at), 'dd MMM', { locale: fr })}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter une ressource</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Nom *</Label>
              <Input placeholder="Ex: Logo Popytech, Police Montserrat..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div><Label className="text-xs">Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOURCE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Client associé (optionnel)</Label>
              <Input placeholder="Nom du client" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="mt-1" />
            </div>
            <div><Label className="text-xs">Lien externe (Drive, Figma…)</Label>
              <Input placeholder="https://..." value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} className="mt-1" />
            </div>
            <div><Label className="text-xs">Fichier</Label>
              <Input ref={fileRef} type="file" className="mt-1" />
            </div>
            <div><Label className="text-xs">Tags (séparés par virgule)</Label>
              <Input placeholder="logo, vectoriel, blanc..." value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="mt-1" />
            </div>
            <Button className="w-full" disabled={saving || !form.name} onClick={addResource}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ONGLET PRODUCTIVITÉ ──────────────────────────────────────────────────────
function StatsTab() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile?.id) return
      const isManager = profile && ['super_admin', 'chef_projet', 'designer_senior', 'manager', 'ceo', 'dirigeant'].includes(profile.role)
      const [tRes, dRes, fRes] = await Promise.all([
        isManager
          ? supabase.from('design_tasks').select('*')
          : supabase.from('design_tasks').select('*').eq('assigned_to', profile.id),
        isManager
          ? supabase.from('design_deliverables').select('id,version,uploaded_at,task_id')
          : supabase.from('design_deliverables').select('id,version,uploaded_at,task_id').eq('uploaded_by', profile.id),
        isManager
          ? supabase.from('design_feedbacks').select('*')
          : supabase.from('design_feedbacks').select('*, design_tasks(assigned_to)'),
      ])
      setTasks(tRes.data || [])
      setDeliverables(dRes.data || [])
      setFeedbacks(fRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile?.id])

  if (loading) return <Spinner />

  const total       = tasks.length
  const valide      = tasks.filter(t => t.status === 'valide').length
  const livre       = tasks.filter(t => t.status === 'livre').length
  const aCorreger   = tasks.filter(t => t.status === 'a_corriger').length
  const onTime      = tasks.filter(t => ['valide','livre'].includes(t.status) && (!t.deadline || !isBefore(parseISO(t.deadline), new Date()))).length
  const taux_valid  = total > 0 ? Math.round(((valide + livre) / total) * 100) : 0
  const taux_delai  = (valide + livre) > 0 ? Math.round((onTime / (valide + livre)) * 100) : 0

  // V1 validation rate
  const v1Uploaded = deliverables.filter(d => d.version === 'V1').length
  const totalTasks = total || 1
  const tauxV1     = v1Uploaded > 0 ? Math.round((v1Uploaded / Math.min(v1Uploaded, totalTasks)) * 100) : 0

  // Corrections par tâche
  const corrParTache = total > 0 ? (feedbacks.length / total).toFixed(1) : '0'

  // Types de visuels
  const typeStats = VISUAL_TYPES.map(t => ({
    label: t.label,
    count: tasks.filter(tk => tk.visual_type === t.value).length,
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count)

  // Score global
  const score = Math.round((taux_valid * 0.5) + (taux_delai * 0.3) + (Math.max(0, 100 - feedbacks.length * 5) * 0.2))

  return (
    <div className="space-y-5">
      {/* Score global */}
      <Card className={cn('border-2', score >= 80 ? 'border-emerald-300 bg-emerald-50/30' : score >= 60 ? 'border-amber-300 bg-amber-50/30' : 'border-red-300 bg-red-50/30')}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Score productivité global</p>
              <p className="text-4xl font-bold">{score}<span className="text-xl text-muted-foreground">/100</span></p>
              <p className="text-xs text-muted-foreground mt-1">Basé sur validation, délais et corrections</p>
            </div>
            <Award className={cn('h-12 w-12', score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500')} />
          </div>
          <Progress value={score} className="mt-3 h-2" />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Visuels produits</p>
            <p className="text-2xl font-bold mt-1">{deliverables.length}</p>
            <p className="text-xs text-muted-foreground">livrables uploadés</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taux validation</p>
            <p className="text-2xl font-bold mt-1">{taux_valid}%</p>
            <p className="text-xs text-muted-foreground">{valide + livre}/{total} tâches</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Respect délais</p>
            <p className="text-2xl font-bold mt-1">{taux_delai}%</p>
            <p className="text-xs text-muted-foreground">livrés à temps</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Corrections / tâche</p>
            <p className="text-2xl font-bold mt-1">{corrParTache}</p>
            <p className="text-xs text-muted-foreground">moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Types de visuels */}
      {typeStats.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Image className="h-4 w-4 text-primary" />Types de visuels produits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeStats.map(t => (
              <div key={t.label} className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground w-36 shrink-0 truncate">{t.label}</p>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(t.count / Math.max(...typeStats.map(s => s.count))) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold w-6 text-right">{t.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Statuts */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Répartition des statuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TASK_STATUSES.map(s => {
            const count = tasks.filter(t => t.status === s.value).length
            return (
              <div key={s.value} className="flex items-center gap-3">
                <div className={cn('h-2 w-2 rounded-full shrink-0', s.dot)} />
                <p className="text-xs text-muted-foreground w-24 shrink-0">{s.label}</p>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', s.dot)} style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-semibold w-6 text-right">{count}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
