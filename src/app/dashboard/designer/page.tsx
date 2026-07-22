'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Plus, Search, Edit, Trash2, Upload, Download, Eye, X, Check,
  Clock, AlertTriangle, CheckCircle2, RefreshCw, Layers, FileImage,
  MessageSquare, FolderOpen, User, Calendar, Flag, ChevronDown,
  BarChart2, Zap, Target, Award, Filter, Link2, Image, Type,
  Layout, Monitor, Film, Package, Pen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'to_correct' | 'validated' | 'delivered'
type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'

interface Profile { id: string; full_name: string | null; email: string }

interface DesignTask {
  id: string
  project_id: string | null
  assigned_to: string | null
  assigned_by: string | null
  title: string
  description: string | null
  visual_type: string
  client_name: string | null
  deadline: string | null
  priority: TaskPriority
  status: TaskStatus
  revisions_included: number
  revisions_used: number
  created_at: string
  assigned_profile?: { full_name: string | null; email: string } | null
}

interface DesignDeliverable {
  id: string
  task_id: string
  file_url: string
  file_name: string
  file_type: string | null
  version: string
  uploaded_by: string | null
  note: string | null
  uploaded_at: string
  design_tasks?: { title: string; client_name: string | null } | null
  feedbacks?: DesignFeedback[]
}

interface DesignFeedback {
  id: string
  deliverable_id: string
  task_id: string
  comment: string
  requested_by: string | null
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  requester?: { full_name: string | null } | null
}

interface DesignResource {
  id: string
  name: string
  category: string
  client_name: string | null
  file_url: string | null
  external_url: string | null
  tags: string[] | null
  created_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VISUAL_TYPES = ['Logo', 'Flyer', 'Affiche', 'Carrousel', 'Bannière', 'Mockup', 'UI Design', 'Motion', 'Charte graphique', 'Packaging', 'Autre']

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo:        { label: 'À faire',      color: 'text-gray-400',   bg: 'bg-gray-400/10',   icon: <Clock size={12} /> },
  in_progress: { label: 'En cours',     color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: <RefreshCw size={12} /> },
  in_review:   { label: 'En révision',  color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: <Eye size={12} /> },
  to_correct:  { label: 'À corriger',   color: 'text-orange-400', bg: 'bg-orange-400/10', icon: <AlertTriangle size={12} /> },
  validated:   { label: 'Validé',       color: 'text-green-400',  bg: 'bg-green-400/10',  icon: <CheckCircle2 size={12} /> },
  delivered:   { label: 'Livré',        color: 'text-purple-400', bg: 'bg-purple-400/10', icon: <Package size={12} /> },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent',  color: 'text-red-400' },
  high:   { label: 'Haute',   color: 'text-orange-400' },
  normal: { label: 'Normale', color: 'text-blue-400' },
  low:    { label: 'Basse',   color: 'text-gray-400' },
}

const RESOURCE_CATEGORIES = [
  { value: 'logo',     label: 'Logos clients',     icon: <Image size={14} /> },
  { value: 'charte',   label: 'Chartes graphiques', icon: <Pen size={14} /> },
  { value: 'police',   label: 'Polices',            icon: <Type size={14} /> },
  { value: 'template', label: 'Templates agence',   icon: <Layout size={14} /> },
  { value: 'mockup',   label: 'Mockups',            icon: <Monitor size={14} /> },
  { value: 'image',    label: 'Banque images',      icon: <Film size={14} /> },
  { value: 'autre',    label: 'Autre',              icon: <FolderOpen size={14} /> },
]

const ACCENT = '#FF6B35'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete, onStatus }: {
  task: DesignTask
  onEdit: (t: DesignTask) => void
  onDelete: (id: string) => void
  onStatus: (id: string, s: TaskStatus) => void
}) {
  const st = STATUS_CONFIG[task.status]
  const pr = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.deadline) && task.status !== 'delivered' && task.status !== 'validated'

  return (
    <Card className="bg-[#111] border-white/5 hover:border-white/10 transition-all group">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">{task.title}</p>
            {task.client_name && <p className="text-xs text-gray-500 truncate">{task.client_name}</p>}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(task)} className="p-1 hover:text-white text-gray-500 transition-colors">
              <Edit size={13} />
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1 hover:text-red-400 text-gray-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Type + Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-300">{task.visual_type}</span>
          <span className={cn('text-xs font-medium', pr.color)}>
            <Flag size={10} className="inline mr-1" />{pr.label}
          </span>
        </div>

        {/* Status select */}
        <Select value={task.status} onValueChange={(v) => onStatus(task.id, v as TaskStatus)}>
          <SelectTrigger className={cn('h-7 text-xs border-0', st.bg, st.color)}>
            <div className="flex items-center gap-1.5">{st.icon}<span>{st.label}</span></div>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([k, v]) => (
              <SelectItem key={k} value={k} className={cn('text-xs', v.color)}>
                <div className="flex items-center gap-1.5">{v.icon}<span>{v.label}</span></div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className={cn('flex items-center gap-1', overdue && 'text-red-400')}>
            <Calendar size={11} />
            <span>{formatDate(task.deadline)}</span>
            {overdue && <AlertTriangle size={10} />}
          </div>
          <span>{task.revisions_used}/{task.revisions_included} révisions</span>
        </div>

        {task.assigned_profile && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} />
            <span>{task.assigned_profile.full_name ?? task.assigned_profile.email}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── TasksTab ────────────────────────────────────────────────────────────────

function TasksTab({ tasks, profiles, onRefresh }: {
  tasks: DesignTask[]
  profiles: Profile[]
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DesignTask | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', visual_type: 'Logo', client_name: '',
    deadline: '', priority: 'normal' as TaskPriority, status: 'todo' as TaskStatus,
    revisions_included: 2, assigned_to: 'none',
  })

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = t.title.toLowerCase().includes(q) || (t.client_name?.toLowerCase().includes(q) ?? false)
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const grouped = {
    todo:        filtered.filter(t => t.status === 'todo'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    in_review:   filtered.filter(t => t.status === 'in_review'),
    to_correct:  filtered.filter(t => t.status === 'to_correct'),
    validated:   filtered.filter(t => t.status === 'validated'),
    delivered:   filtered.filter(t => t.status === 'delivered'),
  }

  function openNew() {
    setEditing(null)
    setForm({ title: '', description: '', visual_type: 'Logo', client_name: '', deadline: '', priority: 'normal', status: 'todo', revisions_included: 2, assigned_to: 'none' })
    setShowForm(true)
  }

  function openEdit(t: DesignTask) {
    setEditing(t)
    setForm({
      title: t.title, description: t.description ?? '', visual_type: t.visual_type,
      client_name: t.client_name ?? '', deadline: t.deadline ? t.deadline.slice(0, 16) : '',
      priority: t.priority, status: t.status, revisions_included: t.revisions_included,
      assigned_to: t.assigned_to ?? 'none',
    })
    setShowForm(true)
  }

  async function save() {
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      visual_type: form.visual_type,
      client_name: form.client_name || null,
      deadline: form.deadline || null,
      priority: form.priority,
      status: form.status,
      revisions_included: form.revisions_included,
      assigned_to: form.assigned_to === 'none' ? null : form.assigned_to,
    }
    if (!payload.title) { toast.error('Titre requis'); return }
    if (editing) {
      const { error } = await supabase.from('design_tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('Tâche mise à jour')
    } else {
      const { error } = await supabase.from('design_tasks').insert(payload)
      if (error) { toast.error(error.message); return }
      toast.success('Tâche créée')
    }
    setShowForm(false)
    onRefresh()
  }

  async function deleteTask(id: string) {
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('design_tasks').delete().eq('id', id)
    toast.success('Tâche supprimée')
    onRefresh()
  }

  async function updateStatus(id: string, status: TaskStatus) {
    await supabase.from('design_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    onRefresh()
  }

  // Stats
  const total = tasks.length
  const urgent = tasks.filter(t => t.priority === 'urgent' && !['validated','delivered'].includes(t.status)).length
  const overdue = tasks.filter(t => isOverdue(t.deadline) && !['validated','delivered'].includes(t.status)).length
  const validated = tasks.filter(t => t.status === 'validated' || t.status === 'delivered').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total tâches', value: total, icon: <Layers size={18} />, color: 'text-blue-400' },
          { label: 'Urgentes', value: urgent, icon: <Zap size={18} />, color: 'text-red-400' },
          { label: 'En retard', value: overdue, icon: <AlertTriangle size={18} />, color: 'text-orange-400' },
          { label: 'Validées', value: validated, icon: <CheckCircle2 size={18} />, color: 'text-green-400' },
        ].map(s => (
          <Card key={s.label} className="bg-[#111] border-white/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-white/5', s.color)}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une tâche..." className="pl-8 bg-[#111] border-white/10 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-[#111] border-white/10 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all">Tous statuts</SelectItem>
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 bg-[#111] border-white/10 text-sm">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all">Toutes priorités</SelectItem>
            {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="text-white shrink-0" style={{ background: ACCENT }}>
          <Plus size={16} className="mr-2" />Nouvelle tâche
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {(Object.entries(grouped) as [TaskStatus, DesignTask[]][]).map(([status, list]) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={status} className="space-y-3">
              <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium', cfg.bg, cfg.color)}>
                {cfg.icon}<span>{cfg.label}</span>
                <span className="ml-auto bg-white/10 rounded-full px-1.5 py-0.5">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.length === 0 && (
                  <div className="border border-dashed border-white/5 rounded-lg p-4 text-center text-xs text-gray-600">Vide</div>
                )}
                {list.map(t => (
                  <TaskCard key={t.id} task={t} onEdit={openEdit} onDelete={deleteTask} onStatus={updateStatus} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la tâche' : 'Nouvelle tâche design'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-gray-400">Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="Ex: Logo Startup XYZ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Client</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="Nom du client" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Type de visuel</Label>
                <Select value={form.visual_type} onValueChange={v => setForm(f => ({ ...f, visual_type: v }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {VISUAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Deadline</Label>
                <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-[#1a1a1a] border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Révisions incluses</Label>
                <Input type="number" min={0} max={10} value={form.revisions_included} onChange={e => setForm(f => ({ ...f, revisions_included: parseInt(e.target.value) || 0 }))} className="bg-[#1a1a1a] border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Assigner à</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10">
                    <SelectValue placeholder="Choisir un designer" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="none">Non assigné</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-gray-400">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[#1a1a1a] border-white/10 resize-none" rows={3} placeholder="Brief, consignes, notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400">Annuler</Button>
              <Button onClick={save} style={{ background: ACCENT }} className="text-white">
                {editing ? 'Mettre à jour' : 'Créer la tâche'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── DeliverablesTab ─────────────────────────────────────────────────────────

function DeliverablesTab({ deliverables, tasks, onRefresh }: {
  deliverables: DesignDeliverable[]
  tasks: DesignTask[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [showFeedback, setShowFeedback] = useState<DesignDeliverable | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [filterTask, setFilterTask] = useState<string>('all')
  const [form, setForm] = useState({ task_id: 'none', file_url: '', file_name: '', file_type: 'PNG', version: 'V1', note: '' })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `deliverables/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('design-deliverables').upload(path, file, { upsert: false })
      if (error) { toast.error('Erreur upload : ' + error.message); return }
      const { data: urlData } = supabase.storage.from('design-deliverables').getPublicUrl(path)
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE'
      const knownTypes = ['PSD', 'AI', 'PNG', 'JPG', 'PDF', 'SVG', 'MP4', 'GIF', 'WEBP']
      setForm(f => ({
        ...f,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: knownTypes.includes(ext) ? ext : 'FILE',
      }))
      toast.success('Fichier uploadé !')
    } finally {
      setUploading(false)
    }
  }

  const versions = ['V1', 'V2', 'V3', 'V4', 'Final']
  const fileTypes = ['PSD', 'AI', 'PNG', 'JPG', 'PDF', 'Figma', 'SVG', 'MP4']

  const filtered = filterTask === 'all' ? deliverables : deliverables.filter(d => d.task_id === filterTask)

  async function save() {
    if (!form.file_url.trim() || form.task_id === 'none') { toast.error('Tâche et lien fichier requis'); return }
    const { error } = await supabase.from('design_deliverables').insert({
      task_id: form.task_id,
      file_url: form.file_url.trim(),
      file_name: form.file_name.trim() || form.file_url.split('/').pop() || 'fichier',
      file_type: form.file_type,
      version: form.version,
      note: form.note || null,
    })
    if (error) { toast.error(error.message); return }
    // update task status to in_review
    await supabase.from('design_tasks').update({ status: 'in_review', updated_at: new Date().toISOString() }).eq('id', form.task_id)
    toast.success('Livrable ajouté — tâche passée en révision')
    setShowForm(false)
    setForm({ task_id: 'none', file_url: '', file_name: '', file_type: 'PNG', version: 'V1', note: '' })
    onRefresh()
  }

  async function addFeedback() {
    if (!feedbackText.trim() || !showFeedback) return
    const { error } = await supabase.from('design_feedbacks').insert({
      deliverable_id: showFeedback.id,
      task_id: showFeedback.task_id,
      comment: feedbackText.trim(),
      status: 'pending',
    })
    if (error) { toast.error(error.message); return }
    // update task status to to_correct
    await supabase.from('design_tasks').update({ status: 'to_correct', updated_at: new Date().toISOString() }).eq('id', showFeedback.task_id)
    toast.success('Correction demandée — tâche repassée en correction')
    setFeedbackText('')
    onRefresh()
  }

  async function resolveFeedback(id: string) {
    await supabase.from('design_feedbacks').update({ status: 'resolved' }).eq('id', id)
    toast.success('Correction résolue')
    onRefresh()
  }

  const FILE_TYPE_COLOR: Record<string, string> = {
    PSD: 'bg-blue-500/20 text-blue-300', AI: 'bg-orange-500/20 text-orange-300',
    PNG: 'bg-green-500/20 text-green-300', JPG: 'bg-yellow-500/20 text-yellow-300',
    PDF: 'bg-red-500/20 text-red-300', Figma: 'bg-purple-500/20 text-purple-300',
    SVG: 'bg-cyan-500/20 text-cyan-300', MP4: 'bg-pink-500/20 text-pink-300',
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterTask} onValueChange={setFilterTask}>
          <SelectTrigger className="flex-1 bg-[#111] border-white/10 text-sm">
            <SelectValue placeholder="Filtrer par tâche" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all">Toutes les tâches</SelectItem>
            {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)} className="text-white shrink-0" style={{ background: ACCENT }}>
          <Upload size={16} className="mr-2" />Ajouter un livrable
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <FileImage size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucun livrable</p>
          </div>
        )}
        {filtered.map(d => {
          const pendingFeedbacks = d.feedbacks?.filter(f => f.status === 'pending').length ?? 0
          return (
            <Card key={d.id} className="bg-[#111] border-white/5 hover:border-white/10 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn('px-2 py-1 rounded text-xs font-bold shrink-0', FILE_TYPE_COLOR[d.file_type ?? ''] ?? 'bg-white/5 text-gray-300')}>
                      {d.file_type ?? 'FILE'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{d.file_name}</p>
                      <p className="text-xs text-gray-500">{d.design_tasks?.title} · {d.design_tasks?.client_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-gray-300">{d.version}</span>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-white">
                        <Download size={13} className="mr-1" />Voir
                      </Button>
                    </a>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-orange-400" onClick={() => setShowFeedback(d)}>
                      <MessageSquare size={13} className="mr-1" />
                      {pendingFeedbacks > 0 && <span className="bg-orange-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center mr-1">{pendingFeedbacks}</span>}
                      Retour
                    </Button>
                  </div>
                </div>
                {d.note && <p className="mt-2 text-xs text-gray-500 italic">{d.note}</p>}

                {/* Feedbacks inline */}
                {(d.feedbacks?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                    {d.feedbacks!.map(fb => (
                      <div key={fb.id} className={cn('flex items-start justify-between gap-2 text-xs px-2 py-1.5 rounded', fb.status === 'resolved' ? 'bg-green-500/5 text-gray-500 line-through' : 'bg-orange-500/10 text-orange-300')}>
                        <span>{fb.comment}</span>
                        {fb.status !== 'resolved' && (
                          <button onClick={() => resolveFeedback(fb.id)} className="shrink-0 hover:text-green-400 transition-colors">
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Livrable Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Ajouter un livrable</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Tâche associée *</Label>
              <Select value={form.task_id} onValueChange={v => setForm(f => ({ ...f, task_id: v }))}>
                <SelectTrigger className="bg-[#1a1a1a] border-white/10"><SelectValue placeholder="Choisir une tâche" /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="none">Choisir une tâche</SelectItem>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Fichier *</Label>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.psd,.ai,.svg,.mp4,.fig" />
                {form.file_url ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    <span className="text-xs text-green-300 flex-1 truncate">{form.file_name || 'Fichier uploadé'}</span>
                    <button onClick={() => setForm(f => ({ ...f, file_url: '', file_name: '' }))} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-gray-400 hover:text-white transition-colors text-xs"
                    >
                      {uploading ? <><RefreshCw size={14} className="animate-spin" />Upload en cours...</> : <><Upload size={14} />Uploader un fichier (image, PDF, PSD, Figma...)</>}
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-gray-600">ou coller un lien</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="https://drive.google.com/... ou Figma" />
                  </div>
                )}
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Type fichier</Label>
                <Select value={form.file_type} onValueChange={v => setForm(f => ({ ...f, file_type: v }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {fileTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Version</Label>
                <Select value={form.version} onValueChange={v => setForm(f => ({ ...f, version: v }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {versions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Note</Label>
              <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-[#1a1a1a] border-white/10 resize-none" rows={2} placeholder="Commentaire optionnel..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400">Annuler</Button>
              <Button onClick={save} style={{ background: ACCENT }} className="text-white">Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={!!showFeedback} onOpenChange={() => setShowFeedback(null)}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Demander une correction</DialogTitle></DialogHeader>
          {showFeedback && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-400">Livrable : <span className="text-white">{showFeedback.file_name}</span></p>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Commentaire de correction</Label>
                <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} className="bg-[#1a1a1a] border-white/10 resize-none" rows={3} placeholder="Décrivez la correction souhaitée..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowFeedback(null)} className="text-gray-400">Annuler</Button>
                <Button onClick={addFeedback} className="bg-orange-500 hover:bg-orange-600 text-white">Demander correction</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ResourcesTab ────────────────────────────────────────────────────────────

function ResourcesTab({ resources, onRefresh }: { resources: DesignResource[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'logo', client_name: '', file_url: '', external_url: '', tags: '' })

  const filtered = resources.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.name.toLowerCase().includes(q) || (r.client_name?.toLowerCase().includes(q) ?? false)
    const matchCat = filterCat === 'all' || r.category === filterCat
    return matchSearch && matchCat
  })

  async function save() {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('design_resources').insert({
      name: form.name.trim(),
      category: form.category,
      client_name: form.client_name || null,
      file_url: form.file_url || null,
      external_url: form.external_url || null,
      tags: tags.length ? tags : null,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Ressource ajoutée')
    setShowForm(false)
    setForm({ name: '', category: 'logo', client_name: '', file_url: '', external_url: '', tags: '' })
    onRefresh()
  }

  async function deleteResource(id: string) {
    await supabase.from('design_resources').delete().eq('id', id)
    toast.success('Ressource supprimée')
    onRefresh()
  }

  const catCounts = RESOURCE_CATEGORIES.reduce((acc, c) => {
    acc[c.value] = resources.filter(r => r.category === c.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat('all')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all', filterCat === 'all' ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white')}
          style={filterCat === 'all' ? { background: ACCENT } : {}}
        >
          Tout ({resources.length})
        </button>
        {RESOURCE_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all', filterCat === c.value ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white')}
            style={filterCat === c.value ? { background: ACCENT } : {}}
          >
            {c.icon}{c.label} ({catCounts[c.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une ressource..." className="pl-8 bg-[#111] border-white/10 text-sm" />
        </div>
        <Button onClick={() => setShowForm(true)} style={{ background: ACCENT }} className="text-white">
          <Plus size={16} className="mr-2" />Ajouter
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-600">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune ressource</p>
          </div>
        )}
        {filtered.map(r => {
          const cat = RESOURCE_CATEGORIES.find(c => c.value === r.category)
          const link = r.file_url ?? r.external_url
          return (
            <Card key={r.id} className="bg-[#111] border-white/5 hover:border-white/10 transition-all group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-white/5 text-gray-400">{cat?.icon ?? <FolderOpen size={14} />}</div>
                  <button onClick={() => deleteResource(r.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-500 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate">{r.name}</p>
                  {r.client_name && <p className="text-xs text-gray-500">{r.client_name}</p>}
                  <p className="text-xs text-gray-600 mt-0.5">{cat?.label}</p>
                </div>
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-xs text-gray-400">{tag}</span>
                    ))}
                  </div>
                )}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <Link2 size={11} />Ouvrir le fichier
                  </a>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Ajouter une ressource</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Nom *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="Logo Popytech, Charte 2024..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {RESOURCE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Client</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="Nom client" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Lien fichier (Drive, Figma, etc.)</Label>
              <Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Tags (séparés par virgule)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="bg-[#1a1a1a] border-white/10" placeholder="branding, 2024, client..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400">Annuler</Button>
              <Button onClick={save} style={{ background: ACCENT }} className="text-white">Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DesignerPage() {
  const [tasks, setTasks] = useState<DesignTask[]>([])
  const [deliverables, setDeliverables] = useState<DesignDeliverable[]>([])
  const [resources, setResources] = useState<DesignResource[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [tasksRes, delRes, resRes, profRes] = await Promise.all([
      supabase.from('design_tasks').select('*, assigned_profile:profiles!design_tasks_assigned_to_fkey(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('design_deliverables').select('*, design_tasks(title, client_name), feedbacks:design_feedbacks(*)').order('uploaded_at', { ascending: false }),
      supabase.from('design_resources').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
    ])
    setTasks((tasksRes.data ?? []) as unknown as DesignTask[])
    setDeliverables((delRes.data ?? []) as unknown as DesignDeliverable[])
    setResources(resRes.data ?? [])
    setProfiles(profRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Productivity stats
  const totalTasks = tasks.length
  const doneRate = totalTasks > 0 ? Math.round((tasks.filter(t => ['validated','delivered'].includes(t.status)).length / totalTasks) * 100) : 0
  const v1Rate = deliverables.length > 0 ? Math.round((deliverables.filter(d => d.version === 'V1' && (d.feedbacks?.length ?? 0) === 0).length / deliverables.length) * 100) : 0
  const pendingCorrections = deliverables.reduce((acc, d) => acc + (d.feedbacks?.filter(f => f.status === 'pending').length ?? 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Studio Design</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestion tâches, livrables & ressources créatives</p>
        </div>
        {/* Perf banner */}
        <div className="hidden md:flex items-center gap-6 bg-[#111] border border-white/5 rounded-xl px-5 py-3">
          {[
            { label: 'Taux validation', value: `${doneRate}%`, icon: <Target size={14} />, color: 'text-green-400' },
            { label: 'Validés V1', value: `${v1Rate}%`, icon: <Award size={14} />, color: 'text-blue-400' },
            { label: 'Corrections en attente', value: pendingCorrections, icon: <AlertTriangle size={14} />, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={cn('flex items-center gap-1 text-lg font-bold', s.color)}>
                {s.icon}{s.value}
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="bg-[#111] border border-white/5">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 gap-2">
            <Layers size={14} />Tâches
            {tasks.filter(t => !['validated','delivered'].includes(t.status)).length > 0 && (
              <span className="bg-white/10 rounded-full px-1.5 text-xs">{tasks.filter(t => !['validated','delivered'].includes(t.status)).length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 gap-2">
            <Upload size={14} />Livrables
            {deliverables.length > 0 && (
              <span className="bg-white/10 rounded-full px-1.5 text-xs">{deliverables.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 gap-2">
            <FolderOpen size={14} />Ressources
            {resources.length > 0 && (
              <span className="bg-white/10 rounded-full px-1.5 text-xs">{resources.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <TasksTab tasks={tasks} profiles={profiles} onRefresh={loadAll} />
        </TabsContent>
        <TabsContent value="deliverables" className="mt-6">
          <DeliverablesTab deliverables={deliverables} tasks={tasks} onRefresh={loadAll} />
        </TabsContent>
        <TabsContent value="resources" className="mt-6">
          <ResourcesTab resources={resources} onRefresh={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
