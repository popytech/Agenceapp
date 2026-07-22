'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles, Plus, CheckCircle2, Clock, AlertTriangle,
  Lightbulb, Film, CalendarDays, Target, Flame,
  BookOpen, ArrowRight, Loader2, X, Edit2, Save
} from 'lucide-react'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project?: { name: string } | null
}

interface Idea {
  id: string
  title: string
  description: string | null
  created_at: string
}

const STATUS_STEPS = [
  { key: 'idée', label: 'Idée', color: 'bg-violet-500/10 text-violet-600 border-violet-200' },
  { key: 'script', label: 'Script', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { key: 'tournage', label: 'Tournage', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  { key: 'montage', label: 'Montage', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { key: 'publié', label: 'Publié', color: 'bg-green-500/10 text-green-600 border-green-200' },
]

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-600 border-red-200',
  haute: 'bg-orange-500/10 text-orange-600 border-orange-200',
  normale: 'bg-blue-500/10 text-blue-600 border-blue-200',
  basse: 'bg-gray-500/10 text-gray-500 border-gray-200',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function WorkspaceCreatorPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [stats, setStats] = useState({ done: 0, inProgress: 0, overdue: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Nouvelle idée
  const [newIdea, setNewIdea] = useState('')
  const [newIdeaDesc, setNewIdeaDesc] = useState('')
  const [addingIdea, setAddingIdea] = useState(false)
  const [savingIdea, setSavingIdea] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    const [tasksRes, ideasRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,title,status,priority,due_date,projects(name)')
        .eq('assigned_to', profile.id)
        .order('due_date', { ascending: true })
        .limit(20),
      supabase
        .from('content_ideas')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const taskList: Task[] = (tasksRes.data || []).map((t: { id: string; title: string; status: string; priority: string; due_date: string | null; projects: { name: string }[] | { name: string } | null }) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      project: Array.isArray(t.projects) ? (t.projects[0] ?? null) : (t.projects ?? null),
    }))

    const now = new Date()
    void now
    const done = taskList.filter(t => t.status === 'terminée').length
    const inProgress = taskList.filter(t => t.status === 'en cours').length
    const overdue = taskList.filter(t =>
      t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'terminée'
    ).length

    setTasks(taskList)
    setStats({ done, inProgress, overdue, total: taskList.length })

    // Si la table content_ideas n'existe pas encore, on ignore l'erreur
    if (!ideasRes.error) {
      setIdeas(ideasRes.data || [])
    }

    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])

  async function handleAddIdea() {
    if (!newIdea.trim() || !profile) return
    setSavingIdea(true)
    const { data, error } = await supabase
      .from('content_ideas')
      .insert({ title: newIdea.trim(), description: newIdeaDesc.trim() || null, user_id: profile.id })
      .select()
      .single()
    if (!error && data) {
      setIdeas(prev => [data, ...prev])
      setNewIdea('')
      setNewIdeaDesc('')
      setAddingIdea(false)
    }
    setSavingIdea(false)
  }

  async function handleDeleteIdea(id: string) {
    await supabase.from('content_ideas').delete().eq('id', id)
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  const upcomingTasks = tasks.filter(t => t.status !== 'terminée').slice(0, 5)
  const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Créatrice'} ✨
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} · Espace Création de contenu
          </p>
        </div>
        <Badge className="bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200 border">
          <Sparkles className="h-3 w-3 mr-1" />
          Créatrice de contenu
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tâches totales', value: stats.total, icon: Target, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'En cours', value: stats.inProgress, icon: Flame, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Terminées', value: stats.done, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'En retard', value: stats.overdue, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="border border-border">
              <CardContent className="p-4">
                <div className={cn('p-2 rounded-lg w-fit mb-3', s.bg)}>
                  <Icon className={cn('h-4 w-4', s.color)} />
                </div>
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tâches du jour */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-fuchsia-500" />
              Tâches du jour
              {todayTasks.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{todayTasks.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche pour aujourd'hui</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', task.status === 'terminée' ? 'bg-green-500' : task.status === 'en cours' ? 'bg-blue-500' : 'bg-gray-300')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', task.status === 'terminée' && 'line-through text-muted-foreground')}>{task.title}</p>
                    {task.project?.name && <p className="text-xs text-muted-foreground truncate">{task.project.name}</p>}
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', PRIORITY_COLOR[task.priority] || '')}>
                    {task.priority}
                  </Badge>
                </div>
              ))
            )}
            <Link href="/workspace/tasks">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                Voir toutes mes tâches <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Prochaines tâches */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              À venir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tout est à jour !</p>
            ) : (
              upcomingTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', task.status === 'en cours' ? 'bg-blue-500' : 'bg-gray-300')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <p className={cn('text-xs', isPast(parseISO(task.due_date)) ? 'text-red-500' : 'text-muted-foreground')}>
                        {isPast(parseISO(task.due_date)) ? 'En retard · ' : ''}{format(parseISO(task.due_date), 'd MMM', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

      {/* Banque d'idées */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Banque d'idées
              {ideas.length > 0 && (
                <Badge variant="secondary" className="text-xs">{ideas.length}</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setAddingIdea(!addingIdea)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Nouvelle idée
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Formulaire nouvelle idée */}
          {addingIdea && (
            <div className="border border-dashed border-fuchsia-300 rounded-xl p-4 space-y-3 bg-fuchsia-50/50 dark:bg-fuchsia-950/20">
              <Input
                placeholder="Titre de l'idée..."
                value={newIdea}
                onChange={e => setNewIdea(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <Textarea
                placeholder="Description (optionnel)..."
                value={newIdeaDesc}
                onChange={e => setNewIdeaDesc(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setAddingIdea(false); setNewIdea(''); setNewIdeaDesc('') }}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleAddIdea} disabled={savingIdea || !newIdea.trim()}>
                  {savingIdea ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}

          {/* Liste des idées */}
          {ideas.length === 0 && !addingIdea ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune idée pour l'instant.</p>
              <p className="text-xs mt-1">Notez vos inspirations avant qu'elles disparaissent !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ideas.map(idea => (
                <div key={idea.id} className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{idea.title}</p>
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {idea.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{idea.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    {format(new Date(idea.created_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline de création */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Film className="h-4 w-4 text-fuchsia-500" />
            Pipeline de création
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STATUS_STEPS.map(step => {
              const count = tasks.filter(t => t.status === step.key).length
              return (
                <div key={step.key} className={cn('flex-shrink-0 rounded-xl border px-4 py-3 min-w-[120px]', step.color)}>
                  <div className="text-xl font-bold tabular-nums">{count}</div>
                  <div className="text-xs font-medium mt-0.5">{step.label}</div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Gérez vos tâches de création depuis l'onglet <Link href="/workspace/tasks" className="underline">Mes tâches</Link>.
          </p>
        </CardContent>
      </Card>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/workspace/tasks', label: 'Mes tâches', icon: Target, color: 'text-violet-500' },
          { href: '/workspace/calendar', label: 'Calendrier', icon: CalendarDays, color: 'text-blue-500' },
          { href: '/workspace/journal', label: 'Rapport du jour', icon: BookOpen, color: 'text-amber-500' },
          { href: '/workspace/academy', label: 'Formations', icon: Sparkles, color: 'text-fuchsia-500' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="border border-border hover:shadow-md transition-all cursor-pointer hover:border-fuchsia-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={cn('h-5 w-5 shrink-0', item.color)} />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
