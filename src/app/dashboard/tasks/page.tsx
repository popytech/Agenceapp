'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { safeChannel } from '@/lib/realtime'
import { useAuth } from '@/lib/auth-context'
import { getPermissions, isChefProjetOrAbove } from '@/lib/permissions'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, closestCenter
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CheckSquare, Plus, Search, Calendar, User,
  AlertCircle, Clock, Trash2, Edit, Check, X,
  Package, ChevronRight, Bell, FileText, ListTodo, Send,
  MessageSquare, BarChart2, Users, GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { format, isAfter, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  deadline: string | null
  assigned_to: string | null
  project_id: string | null
  created_at: string
  progress: number
  delivery_notes: string | null
  delivery_criteria: string | null
  delivered_at: string | null
  projects?: { title: string } | null
  profiles?: { full_name: string } | null
  subtask_count?: number
  subtask_done?: number
}

interface Subtask {
  id: string
  task_id: string
  title: string
  is_done: boolean
  assigned_to: string | null
  deadline: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

interface Project { id: string; title: string }
interface Member { id: string; full_name: string; email?: string }

const STATUS_COLUMNS = [
  { key: 'a_faire', label: 'À faire', color: 'border-t-muted-foreground' },
  { key: 'en_cours', label: 'En cours', color: 'border-t-blue-500' },
  { key: 'en_revision', label: 'En révision', color: 'border-t-orange-500' },
  { key: 'termine', label: 'Terminé', color: 'border-t-green-500' },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  haute: { label: 'Haute', color: 'text-destructive border-destructive/30 bg-destructive/10' },
  moyenne: { label: 'Moyenne', color: 'text-orange-600 border-orange-300/30 bg-orange-50/30' },
  basse: { label: 'Basse', color: 'text-green-600 border-green-300/30 bg-green-50/30' },
}

const emptyForm = {
  title: '', description: '', status: 'a_faire', priority: 'moyenne',
  deadline: '', assigned_to: 'none', project_id: 'none', progress: 0,
  delivery_notes: '', delivery_criteria: '',
}

async function createNotification(userId: string, title: string, message: string, link: string) {
  await supabase.from('notifications').insert({ user_id: userId, title, message, type: 'task', link, is_read: false })
}

function exportTasksCSV(tasks: any[]) {
  const headers = ['Titre', 'Statut', 'Priorité', 'Assigné à', 'Projet', 'Échéance', 'Progression']
  const rows = tasks.map(t => [
    t.title || '',
    t.status || '',
    t.priority || '',
    t.profiles?.full_name || '',
    t.projects?.title || '',
    t.deadline ? new Date(t.deadline).toLocaleDateString('fr-FR') : '',
    `${t.progress || 0}%`,
  ])
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `taches_${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ─── KANBAN DRAG & DROP ────────────────────────────────────────────────────────
function SortableTaskCard({ task, onEdit, onDelete, onStatusChange, onViewDetail, canEdit, canDelete, currentUserId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      <div {...attributes} {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground/30 opacity-0 group-hover/drag:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="pl-4">
        <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange}
          onViewDetail={onViewDetail} canEdit={canEdit} canDelete={canDelete} currentUserId={currentUserId} />
      </div>
    </div>
  )
}

function DroppableColumn({ colKey, children, label, count, colorClass }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })
  return (
    <div className="space-y-3">
      <div className={cn('bg-card border-t-4 rounded-lg px-3 py-2 flex items-center justify-between', colorClass)}>
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div ref={setNodeRef} className={cn('space-y-2 min-h-[100px] rounded-lg transition-colors p-1', isOver && 'bg-primary/5 ring-1 ring-primary/20')}>
        {children}
      </div>
    </div>
  )
}

function KanbanBoard({ filtered, onEdit, onDelete, onStatusChange, onViewDetail, canEdit, canDelete, currentUserId }: any) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activeTask = activeId ? filtered.find((t: any) => t.id === activeId) : null

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)) }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const taskId = String(active.id)
    // Over a column droppable (its id IS the status key)
    const newStatus = STATUS_COLUMNS.find(c => c.key === over.id)?.key
      ?? filtered.find((t: any) => t.id === String(over.id))?.status
    if (newStatus) {
      const task = filtered.find((t: any) => t.id === taskId)
      if (task && task.status !== newStatus) onStatusChange(taskId, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => {
          const colTasks = filtered.filter((t: any) => t.status === col.key)
          return (
            <DroppableColumn key={col.key} colKey={col.key} label={col.label} count={colTasks.length} colorClass={col.color}>
              <SortableContext items={colTasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                {colTasks.map((task: any) => (
                  <SortableTaskCard key={task.id} task={task} onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)}
                    onStatusChange={onStatusChange} onViewDetail={() => onViewDetail(task)}
                    canEdit={canEdit} canDelete={canDelete} currentUserId={currentUserId} />
                ))}
              </SortableContext>
              {colTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Glisser ici</p>
              )}
            </DroppableColumn>
          )
        })}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-1 shadow-xl scale-105">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onStatusChange={() => {}}
              onViewDetail={() => {}} canEdit={false} canDelete={false} currentUserId={currentUserId} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default function TasksPage() {
  const { profile, user } = useAuth()
  const perms = getPermissions(profile?.role)

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list' | 'team'>('kanban')
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isManager = isChefProjetOrAbove(profile?.role)
  const canAssign = perms?.canAssignTask ?? isManager

  // Charger les membres dès que user est connu (indépendamment du profil)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('id, full_name').neq('role', 'client').order('full_name')
      .then(({ data }) => { if (data) setMembers(data) })
  }, [user?.id])

  const fetchAll = useCallback(async () => {
    // userId depuis profile (précis) ou user (toujours disponible)
    const userId = profile?.id || user?.id
    if (!userId) return

    // Tâches : admin/chef voit tout, les autres voient uniquement leurs tâches (assignées ou créées par eux)
    let tasksQuery = supabase.from('tasks').select('*, projects(title), profiles:assigned_to(full_name)').order('created_at', { ascending: false })
    if (!isManager) {
      tasksQuery = tasksQuery.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    }

    // Projets : tout le monde voit tous les projets de l'agence
    const projectsQuery = supabase.from('projects').select('id, title').order('title')

    const [{ data: t }, { data: p }, { data: st }] = await Promise.all([
      tasksQuery.limit(200),
      projectsQuery,
      supabase.from('subtasks').select('task_id, is_done').limit(500),
    ])
    // Enrichir les tâches avec les comptages de sous-tâches
    const enriched = (t || []).map(task => {
      const subs = (st || []).filter(s => s.task_id === task.id)
      return { ...task, subtask_count: subs.length, subtask_done: subs.filter(s => s.is_done).length }
    })
    setTasks(enriched)
    setProjects(p || [])
    setLoading(false)
  }, [profile?.id, user?.id, isManager, canAssign])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Vérifier deadlines imminentes au chargement (pour l'admin)
  useEffect(() => {
    if (!profile) return
    const upcoming = tasks.filter(t => {
      if (!t.deadline || t.status === 'termine') return false
      const days = differenceInDays(parseISO(t.deadline), new Date())
      return days >= 0 && days <= 1
    })
    upcoming.forEach(t => {
      const days = differenceInDays(parseISO(t.deadline!), new Date())
      const msg = days === 0 ? "Deadline aujourd'hui !" : "Deadline demain !"
      toast.warning(`⏰ "${t.title}" — ${msg}`, { duration: 6000 })
    })
  }, [tasks, profile])

  function openCreate() {
    setEditTask(null)
    // Employé sans droit d'assignation : s'auto-assigne par défaut
    setForm({ ...emptyForm, assigned_to: (isManager || canAssign) ? 'none' : (profile?.id || 'none') })
    setDialogOpen(true)
  }

  function openEdit(task: Task) {
    setEditTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline || '',
      assigned_to: task.assigned_to || 'none',
      project_id: task.project_id || 'none',
      progress: task.progress || 0,
      delivery_notes: task.delivery_notes || '',
      delivery_criteria: task.delivery_criteria || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return }
    setSaving(true)

    const assignedId = form.assigned_to === 'none' ? null : form.assigned_to
    const isNewAssignment = !editTask && assignedId
    const isReassigned = editTask && assignedId && editTask.assigned_to !== assignedId
    const wasDelivered = editTask && form.status === 'termine' && editTask.status !== 'termine'

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      deadline: form.deadline || null,
      assigned_to: assignedId,
      project_id: form.project_id === 'none' ? null : form.project_id,
      progress: form.progress,
      delivery_notes: form.delivery_notes || null,
      delivery_criteria: form.delivery_criteria || null,
      delivered_at: wasDelivered ? new Date().toISOString() : (editTask?.delivered_at || null),
    }

    if (editTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editTask.id)
      if (error) { toast.error('Mise à jour impossible'); setSaving(false); return }
      toast.success('Tâche mise à jour')

      // Notification si réassignation
      if (isReassigned && assignedId) {
        await createNotification(
          assignedId,
          'Tâche assignée',
          `La tâche "${form.title}" vous a été assignée.`,
          '/dashboard/tasks'
        )
      }
      // Notification si marqué terminé
      if (wasDelivered && editTask.assigned_to) {
        await createNotification(
          editTask.assigned_to,
          'Tâche terminée',
          `La tâche "${form.title}" a été marquée comme terminée.`,
          '/dashboard/tasks'
        )
      }
    } else {
      const creatorId = profile?.id || user?.id
      const { data: newTask, error } = await supabase.from('tasks')
        .insert({ ...payload, created_by: creatorId })
        .select().single()
      if (error) { toast.error(getErrorMessage(error, 'Opération impossible')); setSaving(false); return }
      toast.success('Tâche créée')

      // Notification d'assignation
      if (isNewAssignment && assignedId) {
        const assignedMember = members.find(m => m.id === assignedId)
        await createNotification(
          assignedId,
          'Nouvelle tâche assignée',
          `La tâche "${form.title}" vous a été assignée${form.deadline ? ` — échéance le ${format(parseISO(form.deadline), 'd MMM yyyy', { locale: fr })}` : ''}.`,
          '/dashboard/tasks'
        )
        if (assignedMember) {
          toast.info(`Notification envoyée à ${assignedMember.full_name}`)
        }
      }
    }

    setDialogOpen(false)
    fetchAll()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) toast.error('Suppression impossible')
    else { toast.success('Tâche supprimée'); setDetailTask(null); fetchAll() }
  }

  async function updateStatus(id: string, status: string) {
    const task = tasks.find(t => t.id === id)
    const isNowDone = status === 'termine' && task?.status !== 'termine'
    await supabase.from('tasks').update({
      status,
      delivered_at: isNowDone ? new Date().toISOString() : undefined,
    }).eq('id', id)

    // Notification livraison
    if (isNowDone && task?.assigned_to) {
      await createNotification(
        task.assigned_to,
        'Tâche terminée',
        `La tâche "${task.title}" a été marquée comme terminée.`,
        '/dashboard/tasks'
      )
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    if (detailTask?.id === id) setDetailTask(prev => prev ? { ...prev, status } : null)
  }

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
    const matchProject = filterProject === 'all' || t.project_id === filterProject
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchSearch && matchProject && matchPriority
  })

  const isOverdue = (deadline: string | null, status: string) =>
    deadline ? isAfter(new Date(), parseISO(deadline)) && status !== 'termine' : false

  const stats = {
    total: tasks.filter(t => t.status !== 'termine').length,
      enCours: tasks.filter(t => t.status === 'en_cours').length,
      termine: tasks.filter(t => t.status === 'termine').length,
      enRetard: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{isManager ? 'Toutes les tâches' : 'Mes tâches'}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isManager ? `${stats.total} tâches au total` : `${stats.total} tâche${stats.total > 1 ? 's' : ''} assignée${stats.total > 1 ? 's' : ''}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportTasksCSV(filtered)} className="gap-2 hidden sm:flex">
            <FileText className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isManager ? 'Actives' : 'Assignées', value: stats.total, icon: CheckSquare, color: 'text-primary' },
          { label: 'En cours', value: stats.enCours, icon: Clock, color: 'text-blue-500' },
          { label: 'Terminées', value: stats.termine, icon: Check, color: 'text-green-500' },
          { label: 'En retard', value: stats.enRetard, icon: AlertCircle, color: 'text-destructive' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn('h-7 w-7', color)} />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une tâche..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Projet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Priorité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border border-border rounded-md p-1 h-10">
          <button onClick={() => setView('kanban')} className={cn('px-3 rounded text-xs font-medium transition-colors', view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>Kanban</button>
          <button onClick={() => setView('list')} className={cn('px-3 rounded text-xs font-medium transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>Liste</button>
          <button onClick={() => setView('team')} className={cn('px-3 rounded text-xs font-medium transition-colors flex items-center gap-1', view === 'team' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}><Users className="h-3 w-3" />Équipe</button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(col => (
            <div key={col.key} className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          filtered={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={updateStatus}
          onViewDetail={setDetailTask}
          canEdit={perms.canCreateTask}
          canDelete={perms.canDeleteTask}
          currentUserId={profile?.id || user?.id}
        />
      ) : view === 'list' ? (
        <Card className="border-border/50">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Aucune tâche trouvée</p>
              </div>
            ) : filtered.map(task => (
              <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTask(task)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-sm font-medium', task.status === 'termine' && 'line-through text-muted-foreground')}>{task.title}</span>
                    <Badge variant="outline" className={cn('text-xs', PRIORITY_CONFIG[task.priority]?.color)}>
                      {PRIORITY_CONFIG[task.priority]?.label}
                    </Badge>
                    {isOverdue(task.deadline, task.status) && (
                      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/10">En retard</Badge>
                    )}
                    {task.delivery_notes && <Package className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {task.projects?.title && <span>{task.projects.title}</span>}
                    {task.profiles?.full_name && (
                      <span className={cn(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium',
                        task.assigned_to === (profile?.id || user?.id)
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        <Avatar name={task.profiles.full_name} size="sm" />
                        {task.assigned_to === (profile?.id || user?.id) ? 'Moi' : task.profiles.full_name.split(' ')[0]}
                      </span>
                    )}
                    {task.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(task.deadline), 'd MMM yyyy', { locale: fr })}</span>}
                    {task.delivered_at && <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" />Livré le {format(parseISO(task.delivered_at), 'd MMM', { locale: fr })}</span>}
                  </div>
                </div>
                <Select value={task.status} onValueChange={v => updateStatus(task.id, v)}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setDetailTask(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {perms.canCreateTask && (
                    <button onClick={() => openEdit(task)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {perms.canDeleteTask && (
                    <button onClick={() => handleDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : view === 'team' ? (
        /* Vue Équipe — charge de travail par membre */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {members.map(member => {
              const memberTasks = tasks.filter(t => t.assigned_to === member.id)
              const inProgress = memberTasks.filter(t => t.status === 'en_cours')
              const todo = memberTasks.filter(t => t.status === 'a_faire')
              const inReview = memberTasks.filter(t => t.status === 'en_revision')
              const done = memberTasks.filter(t => t.status === 'termine')
              const overdue = memberTasks.filter(t => t.deadline && isAfter(new Date(), parseISO(t.deadline)) && t.status !== 'termine')
              const total = memberTasks.filter(t => t.status !== 'termine').length
              const load = total === 0 ? { label: 'Libre', color: 'text-emerald-500', bar: 'bg-emerald-500', pct: 5 }
                : total <= 3 ? { label: 'Léger', color: 'text-blue-500', bar: 'bg-blue-500', pct: 30 }
                : total <= 6 ? { label: 'Occupé', color: 'text-amber-500', bar: 'bg-amber-500', pct: 65 }
                : { label: 'Surchargé', color: 'text-red-500', bar: 'bg-red-500', pct: 95 }
              return (
                <Card key={member.id} className="border-border/60">
                  <CardContent className="p-4 space-y-3">
                    {/* Header membre */}
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-xs font-medium', load.color)}>{load.label}</span>
                          {overdue.length > 0 && (
                            <span className="text-xs text-destructive flex items-center gap-0.5">
                              <AlertCircle className="h-3 w-3" />{overdue.length} en retard
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-foreground">{total}</p>
                        <p className="text-xs text-muted-foreground">en cours</p>
                      </div>
                    </div>

                    {/* Barre charge */}
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', load.bar)} style={{ width: `${load.pct}%` }} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: 'À faire', count: todo.length, color: 'text-muted-foreground' },
                        { label: 'En cours', count: inProgress.length, color: 'text-blue-500' },
                        { label: 'Révision', count: inReview.length, color: 'text-orange-500' },
                        { label: 'Terminé', count: done.length, color: 'text-green-500' },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/30 rounded-lg py-1.5 px-1">
                          <p className={cn('text-base font-bold', s.color)}>{s.count}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tâches actives */}
                    {inProgress.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">En cours</p>
                        {inProgress.slice(0, 3).map(t => (
                          <button
                            key={t.id}
                            onClick={() => setDetailTask(t)}
                            className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/8 border border-blue-500/15 hover:bg-blue-500/15 transition-colors"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-xs text-foreground truncate flex-1">{t.title}</span>
                            {t.deadline && isAfter(new Date(), parseISO(t.deadline)) && (
                              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                            )}
                          </button>
                        ))}
                        {inProgress.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">+{inProgress.length - 3} autres</p>
                        )}
                      </div>
                    )}

                    {inReview.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">En révision</p>
                        {inReview.slice(0, 2).map(t => (
                          <button
                            key={t.id}
                            onClick={() => setDetailTask(t)}
                            className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-500/8 border border-orange-500/15 hover:bg-orange-500/15 transition-colors"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-xs text-foreground truncate">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {total === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2 italic">Aucune tâche active</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">Général</TabsTrigger>
              <TabsTrigger value="livraison" className="flex-1">Livraison</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la tâche" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de la tâche..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_COLUMNS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="moyenne">Moyenne</SelectItem>
                      <SelectItem value="basse">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label>Projet</Label>
                    <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun projet</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigné à</Label>
                    <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Progression (%)</Label>
                  <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="livraison" className="space-y-4 pt-3">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 flex items-start gap-2">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">Définissez les critères de livraison et les notes pour que l'équipe sache exactement ce qui doit être livré.</p>
              </div>
              <div className="space-y-2">
                <Label>Critères d'acceptation</Label>
                <Textarea
                  value={form.delivery_criteria}
                  onChange={e => setForm(f => ({ ...f, delivery_criteria: e.target.value }))}
                  placeholder="Ex: La vidéo doit être en 1080p, avec sous-titres, durée max 3 min..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes de livraison</Label>
                <Textarea
                  value={form.delivery_notes}
                  onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))}
                  placeholder="Ex: Livrer via Google Drive, notifier le client après validation..."
                  rows={4}
                />
              </div>
              {editTask?.delivered_at && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50/30 border border-green-200/30 rounded-lg p-3">
                  <Check className="h-4 w-4" />
                  <span>Livré le {format(parseISO(editTask.delivered_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editTask ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          members={members}
          currentProfile={profile ? { id: profile.id, full_name: profile.full_name || '' } : null}
          onClose={() => setDetailTask(null)}
          onEdit={() => { openEdit(detailTask); setDetailTask(null) }}
          onDelete={() => handleDelete(detailTask.id)}
          onStatusChange={updateStatus}
          canEdit={perms.canCreateTask}
          canDelete={perms.canDeleteTask}
        />
      )}
    </div>
  )
}

// Génère une couleur déterministe à partir du nom
function nameToColor(name: string): string {
  const colors = ['#0066FF', '#00E5FF', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const color = nameToColor(name)
  const cls = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white shrink-0', cls)}
      style={{ background: color }}
      title={name}
    >
      {initials}
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, onViewDetail, canEdit, canDelete, currentUserId }: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (id: string, status: string) => void
  onViewDetail: () => void
  canEdit: boolean
  canDelete: boolean
  currentUserId?: string
}) {
  const isOverdue = task.deadline && isAfter(new Date(), parseISO(task.deadline)) && task.status !== 'termine'
  const daysLeft = task.deadline && task.status !== 'termine'
    ? differenceInDays(parseISO(task.deadline), new Date())
    : null
  const isAssignedToMe = task.assigned_to === currentUserId
  const assigneeName = task.profiles?.full_name

  return (
    <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer" onClick={onViewDetail}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium leading-snug', task.status === 'termine' && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <button onClick={onEdit} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Edit className="h-3 w-3" />
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-xs', PRIORITY_CONFIG[task.priority]?.color)}>
            {PRIORITY_CONFIG[task.priority]?.label}
          </Badge>
          {isOverdue && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/10">
              Retard
            </Badge>
          )}
          {task.delivery_criteria && (
            <Package className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {task.progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progression</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}

        {task.subtask_count !== undefined && task.subtask_count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListTodo className="h-3 w-3" />
            <span>{task.subtask_done}/{task.subtask_count} sous-tâches</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${task.subtask_count ? (task.subtask_done! / task.subtask_count) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer : assigné + deadline */}
        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Assigné */}
          {assigneeName ? (
            <div className={cn(
              'flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-xs font-medium',
              isAssignedToMe
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted text-muted-foreground'
            )}>
              <Avatar name={assigneeName} size="sm" />
              <span className="truncate max-w-[90px]">
                {isAssignedToMe ? 'Moi' : assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/50 italic">
              <User className="h-3 w-3" />
              <span>Non assigné</span>
            </div>
          )}

          {/* Projet + deadline */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {task.deadline && (
              <span className={cn('flex items-center gap-1', isOverdue ? 'text-destructive' : daysLeft !== null && daysLeft <= 2 ? 'text-orange-500' : '')}>
                <Calendar className="h-3 w-3" />
                {format(parseISO(task.deadline), 'd MMM', { locale: fr })}
                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && (
                  <span>({daysLeft === 0 ? 'auj.' : `J-${daysLeft}`})</span>
                )}
              </span>
            )}
          </div>
        </div>

        {task.projects?.title && (
          <p className="text-xs text-muted-foreground truncate border-t border-border/40 pt-1">{task.projects.title}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface TaskComment {
  id: string
  user_id: string
  title: string   // author name
  message: string // comment text
  created_at: string
}

function TaskDetailPanel({ task, members, currentProfile, onClose, onEdit, onDelete, onStatusChange, canEdit, canDelete }: {
  task: Task
  members: Member[]
  currentProfile: { id: string; full_name: string } | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (id: string, status: string) => void
  canEdit: boolean
  canDelete: boolean
}) {
  const isOverdue = task.deadline && isAfter(new Date(), parseISO(task.deadline)) && task.status !== 'termine'
  const daysLeft = task.deadline ? differenceInDays(parseISO(task.deadline), new Date()) : null

  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('none')
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [loadingSubs, setLoadingSubs] = useState(true)

  // Commentaires
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, created_at')
        .eq('type', 'task_comment')
        .eq('link', task.id)
        .order('created_at', { ascending: true })
      setComments(data || [])
    }
    fetchComments()
    // Realtime : écouter les nouveaux commentaires
    const channel = safeChannel(`task-comments-${task.id}`, (ch) => {
      ch.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `type=eq.task_comment`,
      }, (payload) => {
        if (payload.new.link === task.id) {
          setComments(prev => [...prev, payload.new as TaskComment])
          setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      })
      .subscribe()
    })
    return () => { supabase.removeChannel(channel) }
  }, [task.id])

  async function sendComment() {
    if (!newComment.trim() || !currentProfile) return
    setSendingComment(true)
    await supabase.from('notifications').insert({
      user_id: currentProfile.id,
      title: currentProfile.full_name,
      message: newComment.trim(),
      type: 'task_comment',
      link: task.id,
      is_read: true,
    })
    setNewComment('')
    setSendingComment(false)
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(() => {
    async function fetchSubtasks() {
      const { data } = await supabase
        .from('subtasks')
        .select('*, profiles:assigned_to(full_name)')
        .eq('task_id', task.id)
        .order('created_at')
      setSubtasks(data || [])
      setLoadingSubs(false)
    }
    fetchSubtasks()
  }, [task.id])

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return
    const { data, error } = await supabase.from('subtasks').insert({
      task_id: task.id,
      title: newSubtaskTitle.trim(),
      assigned_to: newSubtaskAssignee === 'none' ? null : newSubtaskAssignee,
      deadline: newSubtaskDeadline || null,
    }).select('*, profiles:assigned_to(full_name)').single()
    if (error) { toast.error('Erreur création sous-tâche'); return }
    setSubtasks(prev => [...prev, data])
    setNewSubtaskTitle('')
    setNewSubtaskAssignee('none')
    setNewSubtaskDeadline('')
    setAddingSubtask(false)
    // Notification si assignée
    if (data.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: data.assigned_to,
        title: 'Sous-tâche assignée',
        message: `La sous-tâche "${data.title}" vous a été assignée (tâche: "${task.title}").`,
        type: 'task',
        link: '/dashboard/tasks',
        is_read: false,
      })
      const member = members.find(m => m.id === data.assigned_to)
      if (member) toast.info(`Notification envoyée à ${member.full_name}`)
    }
  }

  async function toggleSubtask(sub: Subtask) {
    const { error } = await supabase.from('subtasks').update({ is_done: !sub.is_done }).eq('id', sub.id)
    if (error) return
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, is_done: !s.is_done } : s))
  }

  async function deleteSubtask(id: string) {
    await supabase.from('subtasks').delete().eq('id', id)
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const doneSubs = subtasks.filter(s => s.is_done).length

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-background border-l border-border shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <h2 className={cn('font-semibold text-base leading-snug', task.status === 'termine' && 'line-through text-muted-foreground')}>
              {task.title}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', PRIORITY_CONFIG[task.priority]?.color)}>
                {PRIORITY_CONFIG[task.priority]?.label}
              </Badge>
              {isOverdue && <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/10">En retard</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit className="h-4 w-4" /></button>}
            {canDelete && <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>

          <div className="p-5 space-y-5">
            {/* Statut */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Statut</Label>
              {canEdit ? (
                <Select value={task.status} onValueChange={v => onStatusChange(task.id, v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-md bg-muted text-sm font-medium">
                    {STATUS_COLUMNS.find(s => s.key === task.status)?.label ?? task.status}
                  </div>
                  {task.status === 'en_cours' && (
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => onStatusChange(task.id, 'en_revision')}
                    >
                      <Send className="h-3.5 w-3.5" /> Soumettre pour validation
                    </Button>
                  )}
                  {task.status === 'en_revision' && (
                    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200/50 rounded-md px-3 py-2">
                      <Bell className="h-3.5 w-3.5" /> En attente de validation par le chef de projet
                    </div>
                  )}
                  {task.status === 'termine' && (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200/50 rounded-md px-3 py-2">
                      <Check className="h-3.5 w-3.5" /> Tâche validée et terminée
                    </div>
                  )}
                </div>
              )}
              {/* Manager : boutons rapides de validation */}
              {canEdit && task.status === 'en_revision' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => onStatusChange(task.id, 'termine')}>
                    <Check className="h-3.5 w-3.5" /> Valider
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => onStatusChange(task.id, 'en_cours')}>
                    <X className="h-3.5 w-3.5" /> Retourner en cours
                  </Button>
                </div>
              )}
            </div>

          {/* Infos */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.profiles?.full_name && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Assigné à</p>
                <p className="flex items-center gap-1.5 font-medium"><User className="h-3.5 w-3.5 text-muted-foreground" />{task.profiles.full_name}</p>
              </div>
            )}
            {task.deadline && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Échéance</p>
                <p className={cn('flex items-center gap-1.5 font-medium', isOverdue ? 'text-destructive' : daysLeft !== null && daysLeft <= 2 ? 'text-orange-500' : '')}>
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(parseISO(task.deadline), 'd MMMM yyyy', { locale: fr })}
                  {daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && (
                    <span className="text-xs ml-1">({daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft}j`})</span>
                  )}
                </p>
              </div>
            )}
            {task.projects?.title && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Projet</p>
                <p className="font-medium">{task.projects.title}</p>
              </div>
            )}
            {task.delivered_at && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Livré le</p>
                <p className="flex items-center gap-1.5 font-medium text-green-600"><Check className="h-3.5 w-3.5" />{format(parseISO(task.delivered_at), 'd MMM yyyy', { locale: fr })}</p>
              </div>
            )}
          </div>

          {/* Progression */}
          {task.progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><FileText className="h-3 w-3" />Description</p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{task.description}</p>
            </div>
          )}

          {/* Sous-tâches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ListTodo className="h-3 w-3" />
                Sous-tâches {subtasks.length > 0 && <span className="ml-1 text-foreground font-medium">{doneSubs}/{subtasks.length}</span>}
              </p>
              {canEdit && (
                <button
                  onClick={() => setAddingSubtask(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              )}
            </div>

            {/* Barre progression sous-tâches */}
            {subtasks.length > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${subtasks.length ? (doneSubs / subtasks.length) * 100 : 0}%` }}
                />
              </div>
            )}

            {loadingSubs ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-start gap-2 group rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <button
                      onClick={() => toggleSubtask(sub)}
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors',
                        sub.is_done
                          ? 'bg-green-500 border-green-500 text-white flex items-center justify-center'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      {sub.is_done && <Check className="h-2.5 w-2.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', sub.is_done && 'line-through text-muted-foreground')}>{sub.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {sub.profiles?.full_name && (
                          <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{sub.profiles.full_name}</span>
                        )}
                        {sub.deadline && (
                          <span className={cn('flex items-center gap-0.5', isAfter(new Date(), parseISO(sub.deadline)) && !sub.is_done ? 'text-destructive' : '')}>
                            <Calendar className="h-2.5 w-2.5" />
                            {format(parseISO(sub.deadline), 'd MMM', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteSubtask(sub.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {subtasks.length === 0 && !addingSubtask && (
                  <p className="text-xs text-muted-foreground text-center py-3">Aucune sous-tâche</p>
                )}
              </div>
            )}

            {/* Formulaire ajout sous-tâche */}
            {addingSubtask && (
              <div className="border border-border/70 rounded-lg p-3 space-y-2 bg-muted/20">
                <Input
                  autoFocus
                  placeholder="Titre de la sous-tâche"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
                  className="h-8 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assigner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={newSubtaskDeadline}
                    onChange={e => setNewSubtaskDeadline(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                    Ajouter
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingSubtask(false); setNewSubtaskTitle('') }}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Critères de livraison */}
          {task.delivery_criteria && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Package className="h-3 w-3" />Critères d'acceptation</p>
              <div className="bg-blue-50/30 border border-blue-200/30 rounded-lg p-3">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{task.delivery_criteria}</p>
              </div>
            </div>
          )}

          {/* Notes de livraison */}
          {task.delivery_notes && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Bell className="h-3 w-3" />Notes de livraison</p>
              <div className="bg-orange-50/30 border border-orange-200/30 rounded-lg p-3">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{task.delivery_notes}</p>
              </div>
            </div>
          )}

          {/* Commentaires */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Commentaires {comments.length > 0 && <span className="text-foreground font-semibold ml-1">{comments.length}</span>}
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun commentaire — soyez le premier !</p>
              )}
              {comments.map(c => (
                <div key={c.id} className={cn(
                  'flex gap-2',
                  c.user_id === currentProfile?.id ? 'flex-row-reverse' : 'flex-row'
                )}>
                  <div className="shrink-0 mt-0.5">
                    <Avatar name={c.title} size="sm" />
                  </div>
                  <div className={cn(
                    'max-w-[80%] space-y-0.5',
                    c.user_id === currentProfile?.id ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      'px-3 py-2 rounded-2xl text-sm',
                      c.user_id === currentProfile?.id
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    )}>
                      {c.message}
                    </div>
                    <p className={cn(
                      'text-[10px] text-muted-foreground px-1',
                      c.user_id === currentProfile?.id ? 'text-right' : 'text-left'
                    )}>
                      {c.user_id !== currentProfile?.id && <span className="font-medium">{c.title.split(' ')[0]} · </span>}
                      {format(parseISO(c.created_at), 'd MMM, HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* Input commentaire */}
            {currentProfile && (
              <div className="flex gap-2 items-end">
                <Avatar name={currentProfile.full_name} size="sm" />
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Écrire un commentaire..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() }
                    }}
                    rows={1}
                    className="resize-none text-sm min-h-[38px] py-2"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={sendComment}
                    disabled={!newComment.trim() || sendingComment}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Créée le {format(parseISO(task.created_at), 'd MMMM yyyy', { locale: fr })}
          </div>
        </div>
      </div>
    </div>
  )
}
