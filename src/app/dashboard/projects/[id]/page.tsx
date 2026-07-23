'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Task, Project } from '@/lib/supabase'
import { safeChannel } from '@/lib/realtime'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, MoreHorizontal, Calendar, Edit, Trash2,
  MessageSquare, Paperclip, Upload, Download, X, Send, File, Image, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const columns = [
  { key: 'a_faire', label: 'À faire', color: 'bg-muted-foreground/20' },
  { key: 'en_cours', label: 'En cours', color: 'bg-chart-1/20' },
  { key: 'en_revision', label: 'En révision', color: 'bg-chart-3/20' },
  { key: 'termine', label: 'Terminé', color: 'bg-chart-2/20' },
]

const priorityConfig = {
  basse: { label: 'Basse', dot: 'bg-muted-foreground' },
  moyenne: { label: 'Moyenne', dot: 'bg-chart-3' },
  elevee: { label: 'Élevée', dot: 'bg-destructive' },
}

const emptyTask = { title: '', description: '', priority: 'moyenne' as Task['priority'], status: 'a_faire' as Task['status'], deadline: '' }

function fileIcon(mime: string) {
  if (mime?.startsWith('image/')) return Image
  if (mime?.includes('pdf')) return FileText
  return File
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('kanban')

  // Task dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyTask)
  const [saving, setSaving] = useState(false)

  // Comments
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Files
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const [p, t, c, f] = await Promise.all([
      supabase.from('projects').select('*, clients(company_name)').eq('id', projectId).single(),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('project_comments').select('*, profiles(full_name, avatar_url)').eq('project_id', projectId).order('created_at'),
      supabase.from('project_files').select('*, profiles(full_name)').eq('project_id', projectId).order('created_at', { ascending: false }),
    ])
    setProject(p.data)
    setTasks(t.data || [])
    // For project-level comments, we use task_id = projectId (repurposed)
    setComments(c.data || [])
    setFiles(f.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime on tasks
  useEffect(() => {
    const channel = safeChannel(`project-${projectId}`, (ch) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, () => {
        supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at').then(({ data }) => setTasks(data || []))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_comments', filter: `project_id=eq.${projectId}` }, (payload) => {
        setComments(prev => [...prev, payload.new])
      })
      .subscribe()
    })
    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  function openCreate(status: Task['status'] = 'a_faire') {
    setEditTask(null)
    setForm({ ...emptyTask, status })
    setDialogOpen(true)
  }

  function openEdit(t: Task) {
    setEditTask(t)
    setForm({ title: t.title, description: t.description || '', priority: t.priority, status: t.status, deadline: t.deadline || '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title) { toast.error('Titre requis'); return }
    setSaving(true)
    const payload = { ...form, project_id: projectId, deadline: form.deadline || null }
    if (editTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editTask.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Tâche mise à jour'); setDialogOpen(false); fetchData()
    } else {
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Tâche créée'); setDialogOpen(false); fetchData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Tâche supprimée')
  }

  async function moveTask(task: Task, newStatus: Task['status']) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
  }

  async function sendComment() {
    if (!commentText.trim() || !profile?.id) return
    setSendingComment(true)
    const { error } = await supabase.from('project_comments').insert({
      project_id: projectId,
      user_id: profile.id,
      content: commentText.trim(),
    })
    if (error) toast.error(error.message)
    else setCommentText('')
    setSendingComment(false)
  }

  async function uploadFile(file: File) {
    if (!profile?.id) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${Date.now()}-${file.name}`

    const { error: storageError } = await supabase.storage.from('project-files').upload(path, file)
    if (storageError) { toast.error(storageError.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

    await supabase.from('project_files').insert({
      project_id: projectId,
      uploaded_by: profile.id,
      name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
    })

    toast.success(`${file.name} uploadé`)
    fetchData()
    setUploading(false)
  }

  async function deleteFile(id: string, path: string) {
    if (!confirm('Supprimer ce fichier ?')) return
    await supabase.storage.from('project-files').remove([path])
    await supabase.from('project_files').delete().eq('id', id)
    toast.success('Fichier supprimé')
    fetchData()
  }

  function getFileUrl(path: string) {
    const { data } = supabase.storage.from('project-files').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project?.title || (project as any)?.name}</h1>
          {(project as any)?.clients && <p className="text-muted-foreground text-sm">{(project as any).clients.company_name}</p>}
        </div>
        <div className="flex items-center gap-3">
          {(project as any)?.deadline && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date((project as any).deadline).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
          {project?.budget && project.budget > 0 && (
            <Badge variant="outline">{project.budget.toLocaleString('fr-FR')} GNF</Badge>
          )}
          <Button onClick={() => openCreate()} className="gap-2"><Plus className="h-4 w-4" /> Ajouter tâche</Button>
        </div>
      </div>

  {/* Progress bar */}
        {tasks.length > 0 && (() => {
          const done = tasks.filter(t => t.status === 'termine').length
          const pct = Math.round((done / tasks.length) * 100)
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avancement global</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-chart-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{done} / {tasks.length} tâches terminées</p>
            </div>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {columns.map(col => (
            <Card key={col.key} className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{tasks.filter(t => t.status === col.key).length}</p>
                <p className="text-xs text-muted-foreground">{col.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Commentaires
            {comments.length > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5">{comments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            Fichiers
            {files.length > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5">{files.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Kanban */}
        <TabsContent value="kanban">
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {columns.map(col => (
              <div key={col.key} className="flex-shrink-0 w-72">
                <div className={cn('flex items-center justify-between mb-3 px-3 py-2 rounded-lg', col.color)}>
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{tasks.filter(t => t.status === col.key).length}</Badge>
                    <button onClick={() => openCreate(col.key as Task['status'])} className="hover:opacity-70 transition-opacity">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {tasks.filter(t => t.status === col.key).map(task => {
                    const isLate = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'termine'
                    return (
                      <Card key={task.id} className="border-border/50 hover:border-primary/40 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className={cn('h-2 w-2 rounded-full shrink-0', priorityConfig[task.priority]?.dot)} />
                                <p className="text-sm font-medium leading-tight">{task.title}</p>
                              </div>
                              {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                              {task.deadline && (
                                <div className={cn('flex items-center gap-1 mt-2 text-xs', isLate ? 'text-destructive' : 'text-muted-foreground')}>
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
                                  {isLate && <span className="font-medium">— Retard</span>}
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="mr-2 h-3.5 w-3.5" />Modifier</DropdownMenuItem>
                                {col.key !== 'a_faire' && <DropdownMenuItem onClick={() => moveTask(task, 'a_faire')}>↩ À faire</DropdownMenuItem>}
                                {col.key !== 'en_cours' && <DropdownMenuItem onClick={() => moveTask(task, 'en_cours')}>▶ En cours</DropdownMenuItem>}
                                {col.key !== 'en_revision' && <DropdownMenuItem onClick={() => moveTask(task, 'en_revision')}>👁 En révision</DropdownMenuItem>}
                                {col.key !== 'termine' && <DropdownMenuItem onClick={() => moveTask(task, 'termine')}>✓ Terminé</DropdownMenuItem>}
                                <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {tasks.filter(t => t.status === col.key).length === 0 && (
                    <button onClick={() => openCreate(col.key as Task['status'])} className="w-full border-2 border-dashed border-border/50 rounded-lg p-4 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors text-sm">
                      + Ajouter une tâche
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun commentaire. Soyez le premier !</p>
                  </div>
                ) : (
                  comments.map(c => {
                    const initials = c.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
                    const isMe = c.user_id === profile?.id
                    // Highlight @mentions
                    const content = c.content.replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
                    return (
                      <div key={c.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div className={cn('max-w-[75%]', isMe && 'items-end flex flex-col')}>
                          <div className={cn('rounded-2xl px-3 py-2 text-sm', isMe ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            <span dangerouslySetInnerHTML={{ __html: content }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 px-1">
                            {c.profiles?.full_name || 'Inconnu'} · {new Date(c.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={commentsEndRef} />
              </div>
              <div className="flex gap-2 border-t pt-3">
                <Input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Écrire un commentaire... (@mention pour notifier)"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                />
                <Button size="icon" onClick={sendComment} disabled={sendingComment || !commentText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Fichiers du projet</CardTitle>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={async e => {
                      const filesToUpload = Array.from(e.target.files || [])
                      for (const f of filesToUpload) await uploadFile(f)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  />
                  <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploading ? 'Upload...' : 'Uploader'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {files.length === 0 ? (
                <div className="p-8 text-center">
                  <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Aucun fichier</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Uploader un fichier
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {files.map(f => {
                    const Icon = fileIcon(f.mime_type)
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                        <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.file_size ? formatBytes(f.file_size) : ''} · {f.profiles?.full_name || 'Inconnu'} · {new Date(f.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={getFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer" download={f.name}>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteFile(f.id, f.file_path)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input placeholder="Description de la tâche" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Détails..." rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Task['priority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="elevee">Élevée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Task['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_faire">À faire</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="en_revision">En révision</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editTask ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
