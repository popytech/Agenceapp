'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp, BookOpen,
  ClipboardList, Zap, Target, Star, ArrowRight, Calendar,
  Palette, Video, Megaphone, BarChart2, Monitor, GraduationCap,
  Briefcase, CheckCircle2, Circle, Flame, Trophy, Handshake, Users, Sparkles
} from 'lucide-react'
import { cn, formatGNF } from '@/lib/utils'
import Link from 'next/link'
import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  project?: { name: string } | null
}

interface DailyReport {
  id: string
  report_date: string
  hours_worked: number
  mood: string
  tasks_done: string[]
}

interface Training {
  id: string
  title: string
  progress?: number
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; greeting: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-indigo-500/10 text-indigo-600', icon: <Sparkles className="h-5 w-5" />, greeting: 'Bienvenue, Administrateur Suprême.' },
  ceo: { label: 'CEO / Dirigeant', color: 'bg-blue-600/10 text-blue-700', icon: <BarChart2 className="h-5 w-5" />, greeting: 'Prêt pour la stratégie du jour ?' },
  dirigeant: { label: 'Dirigeant', color: 'bg-blue-600/10 text-blue-700', icon: <BarChart2 className="h-5 w-5" />, greeting: 'Prêt pour la stratégie du jour ?' },
  chef_projet: { label: 'Chef de Projet', color: 'bg-emerald-500/10 text-emerald-600', icon: <Briefcase className="h-5 w-5" />, greeting: 'Supervisons les opérations !' },
  assistante_direction: { label: 'Assistante de Direction', color: 'bg-amber-500/10 text-amber-600', icon: <ClipboardList className="h-5 w-5" />, greeting: 'L\'organisation est la clé du succès.' },
  creatrice_contenu: { label: 'Créatrice de contenu', color: 'bg-fuchsia-500/10 text-fuchsia-600', icon: <Sparkles className="h-5 w-5" />, greeting: 'Quelle est l\'inspiration du jour ?' },
  commercial_digital: { label: 'Commercial Digital', color: 'bg-cyan-500/10 text-cyan-600', icon: <Handshake className="h-5 w-5" />, greeting: 'Objectif : 100% de conversion !' },
  responsable_formations: { label: 'Responsable Formation', color: 'bg-violet-500/10 text-violet-600', icon: <GraduationCap className="h-5 w-5" />, greeting: 'Transmettons le savoir.' },
  designer: { label: 'Designer', color: 'bg-purple-500/10 text-purple-600', icon: <Palette className="h-5 w-5" />, greeting: 'Prêt à créer aujourd\'hui ?' },
  developpeur: { label: 'Développeur', color: 'bg-blue-500/10 text-blue-600', icon: <Monitor className="h-5 w-5" />, greeting: 'Des bugs à crusher aujourd\'hui ?' },
  marketeur: { label: 'Marketeur', color: 'bg-orange-500/10 text-orange-600', icon: <Megaphone className="h-5 w-5" />, greeting: 'Objectif 4 offres aujourd\'hui !' },
  cm: { label: 'Community Manager', color: 'bg-pink-500/10 text-pink-600', icon: <BarChart2 className="h-5 w-5" />, greeting: 'Engagez votre communauté !' },
  'vidéaste': { label: 'Vidéaste', color: 'bg-red-500/10 text-red-600', icon: <Video className="h-5 w-5" />, greeting: 'Action ! C\'est parti.' },
  monteur_video: { label: 'Monteur Vidéo', color: 'bg-rose-500/10 text-rose-600', icon: <Video className="h-5 w-5" />, greeting: 'Montez vos meilleurs projets !' },
  formateur: { label: 'Formateur', color: 'bg-green-500/10 text-green-600', icon: <GraduationCap className="h-5 w-5" />, greeting: 'Inspirez vos apprenants !' },
  stagiaire: { label: 'Stagiaire', color: 'bg-teal-500/10 text-teal-600', icon: <Briefcase className="h-5 w-5" />, greeting: 'Chaque jour compte !' },
  client: { label: 'Client', color: 'bg-gray-500/10 text-gray-600', icon: <Star className="h-5 w-5" />, greeting: 'Bienvenue sur votre espace !' },
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-600 border-red-200',
  haute: 'bg-orange-500/10 text-orange-600 border-orange-200',
  normale: 'bg-blue-500/10 text-blue-600 border-blue-200',
  basse: 'bg-gray-500/10 text-gray-500 border-gray-200',
}

const STATUS_COLOR: Record<string, string> = {
  'à faire': 'text-gray-400',
  'en cours': 'text-blue-500',
  terminé: 'text-green-500',
  bloqué: 'text-red-500',
}

function getHour() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function WorkspacePage() {
  const { profile } = useAuth()
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null)
  const [weekReports, setWeekReports] = useState<DailyReport[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [stats, setStats] = useState({ done: 0, inProgress: 0, overdue: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && !activeRole) {
      setActiveRole(profile.role)
    }
  }, [profile, activeRole])

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    const today = format(new Date(), 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const [tasksRes, todayReportRes, weekReportsRes, trainingsRes] = await Promise.all([
      supabase.from('tasks').select('id,title,status,priority,due_date,projects(name)')
        .eq('assigned_to', profile.id).order('due_date', { ascending: true }).limit(20),
      supabase.from('daily_reports').select('*').eq('user_id', profile.id).eq('report_date', today).maybeSingle(),
      supabase.from('daily_reports').select('*').eq('user_id', profile.id)
        .gte('report_date', weekStart).lte('report_date', weekEnd).order('report_date'),
      supabase.from('training_enrollments').select('training:trainings(id,title),progress')
        .eq('user_id', profile.id).limit(5),
    ])

    const taskList = ((tasksRes.data || []).map((t: any) => ({
      ...t,
      project: Array.isArray(t.projects) ? t.projects[0] : t.projects,
    }))) as Task[]
    setTasks(taskList)
    setTodayReport(todayReportRes.data as DailyReport | null)
    setWeekReports((weekReportsRes.data || []) as DailyReport[])
    setTrainings(
      (trainingsRes.data || []).map((e: any) => ({
        id: e.training?.id,
        title: e.training?.title,
        progress: e.progress || 0,
      }))
    )

    const done = taskList.filter((t) => t.status === 'terminé').length
    const inProg = taskList.filter((t) => t.status === 'en cours').length
    const overdue = taskList.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'terminé').length
    setStats({ done, inProgress: inProg, overdue, total: taskList.length })
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])

  if (!profile || !activeRole) return null

  const roleConf = ROLE_CONFIG[activeRole] || ROLE_CONFIG['stagiaire']
  const activeTasks = tasks.filter((t) => t.status !== 'terminé').slice(0, 5)
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const weekChartData = weekDays.map((day, i) => {
    const report = weekReports.find((r) => {
      const d = parseISO(r.report_date)
      return d.getDay() === (i === 6 ? 0 : i + 1)
    })
    return { day, heures: report?.hours_worked || 0 }
  })

  const moodEmoji: Record<string, string> = {
    excellent: '🔥',
    bien: '😊',
    neutre: '😐',
    difficile: '😔',
    épuisé: '😩',
  }

  return (
    <div className="p-4 md:p-6 pt-4 space-y-6 max-w-5xl mx-auto">

      {/* View Switcher (Super Admin only) */}
      {profile.role === 'super_admin' && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-indigo-900">Vue Omnisciente</div>
              <div className="text-xs text-indigo-700">Simulez le dashboard d'un autre métier</div>
            </div>
          </div>
          <Select value={activeRole} onValueChange={setActiveRole}>
            <SelectTrigger className="w-[240px] bg-white border-indigo-200">
              <SelectValue placeholder="Changer de vue" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-sidebar via-sidebar to-sidebar/80 p-6 md:p-8 text-sidebar-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-4/10 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3 ${roleConf.color} bg-opacity-20`}>
              {roleConf.icon}
              {roleConf.label}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {getHour()}, {profile.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sidebar-foreground/70 text-sm md:text-base">{roleConf.greeting}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-xs text-sidebar-foreground/50">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </div>
            {!todayReport ? (
              <Link href="/workspace/journal">
                <Button size="sm" variant="outline" className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                  <ClipboardList className="h-3.5 w-3.5 mr-2" />
                  Rapport du jour
                  <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Rapport soumis {moodEmoji[todayReport.mood] || ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tâches totales', value: stats.total, icon: <CheckSquare className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'En cours', value: stats.inProgress, icon: <Clock className="h-5 w-5" />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Terminées', value: stats.done, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'En retard', value: stats.overdue, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`h-9 w-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Mes tâches prioritaires
                </CardTitle>
                <Link href="/workspace/tasks">
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progression globale</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium">Toutes les tâches sont terminées !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTasks.map((task) => {
                    const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'terminé'
                    const dueToday = task.due_date && isToday(parseISO(task.due_date))
                    const dueTomorrow = task.due_date && isTomorrow(parseISO(task.due_date))
                    return (
                      <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group">
                        <div className={cn('mt-0.5 shrink-0', STATUS_COLOR[task.status] || 'text-gray-400')}>
                          {task.status === 'terminé' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {task.project?.name && (
                              <span className="text-xs text-muted-foreground">{task.project.name}</span>
                            )}
                            {task.due_date && (
                              <span className={cn('text-xs font-medium', overdue ? 'text-red-500' : dueToday ? 'text-orange-500' : dueTomorrow ? 'text-yellow-500' : 'text-muted-foreground')}>
                                {overdue ? '⚠ En retard' : dueToday ? '⏰ Aujourd\'hui' : dueTomorrow ? '📅 Demain' : format(parseISO(task.due_date), 'd MMM', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', PRIORITY_COLOR[task.priority] || '')}>
                          {task.priority}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Heures semaine */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Heures travaillées cette semaine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weekChartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(v: number) => [`${v}h`, 'Heures']}
                  />
                  <Bar dataKey="heures" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Total semaine : <span className="font-semibold text-foreground">{weekReports.reduce((s, r) => s + (r.hours_worked || 0), 0)}h</span></span>
                <span>Rapports : <span className="font-semibold text-foreground">{weekReports.length}/5</span></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Accès rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {[
                { href: '/workspace/tasks', label: 'Mes tâches', icon: <CheckSquare className="h-4 w-4" />, color: 'text-blue-500' },
                { href: '/workspace/journal', label: 'Rapport du jour', icon: <ClipboardList className="h-4 w-4" />, color: 'text-green-500' },
                { href: '/workspace/projects', label: 'Mes projets', icon: <Briefcase className="h-4 w-4" />, color: 'text-purple-500' },
                { href: '/workspace/academy', label: 'Formations', icon: <BookOpen className="h-4 w-4" />, color: 'text-orange-500' },
                { href: '/workspace/calendar', label: 'Calendrier', icon: <Calendar className="h-4 w-4" />, color: 'text-pink-500' },
              ].map((a) => (
                <Link key={a.href} href={a.href}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                    <span className={a.color}>{a.icon}</span>
                    <span className="text-sm font-medium">{a.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Formations */}
          {trainings.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Mes formations
                  </CardTitle>
                  <Link href="/workspace/academy">
                    <Button variant="ghost" size="sm" className="text-xs h-7">Voir tout</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {trainings.map((t) => (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{t.title}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">{t.progress}%</span>
                    </div>
                    <Progress value={t.progress || 0} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Streak rapports */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Activité semaine</div>
                  <div className="text-xs text-muted-foreground">{weekReports.length} rapport(s) soumis</div>
                </div>
              </div>
              <div className="flex gap-1">
                {weekDays.map((day, i) => {
                  const hasReport = weekReports.some((r) => {
                    const d = parseISO(r.report_date)
                    return d.getDay() === (i === 6 ? 0 : i + 1)
                  })
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn('h-6 w-full rounded-md', hasReport ? 'bg-primary' : 'bg-muted')} />
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
