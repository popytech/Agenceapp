'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { getPermissions } from '@/lib/permissions'
import { toast } from 'sonner'
import {
  BookOpen, Plus, ChevronDown, ChevronUp, User,
  Calendar, Clock, AlertCircle, CheckCircle2, Target,
  Smile, Frown, Meh, TrendingUp, Edit, Save, X, Sparkles, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, parseISO, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DailyReport {
  id: string
  user_id: string
  report_date: string
  tasks_done: string | null
  tasks_in_progress: string | null
  blockers: string | null
  next_day_plan: string | null
  mood: string
  hours_worked: number
  achievements: string | null
  created_at: string
  profiles?: { full_name: string; role: string; avatar_url?: string }
}

const MOOD_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  excellent: { label: 'Excellent', icon: Smile, color: 'text-green-600', bg: 'bg-green-50/50 border-green-200/50' },
  bien: { label: 'Bien', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50/50 border-blue-200/50' },
  moyen: { label: 'Moyen', icon: Meh, color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/50' },
  difficile: { label: 'Difficile', icon: Frown, color: 'text-red-500', bg: 'bg-red-50/50 border-red-200/50' },
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', chef_projet: 'Chef de projet',
  developpeur: 'Développeur', designer: 'Designer', marketeur: 'Marketeur',
  cm: 'Community Manager', vidéaste: 'Vidéaste', monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur', stagiaire: 'Stagiaire', client: 'Client',
}

const emptyForm = {
  tasks_done: '',
  tasks_in_progress: '',
  blockers: '',
  next_day_plan: '',
  mood: 'bien',
  hours_worked: 8,
  achievements: '',
}

export default function JournalPage() {
  const { profile } = useAuth()
  const perms = getPermissions(profile?.role)
  const isAdmin = ['super_admin', 'chef_projet', 'ceo', 'dirigeant'].includes(profile?.role || '')

  const [reports, setReports] = useState<DailyReport[]>([])
  const [myReports, setMyReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editReport, setEditReport] = useState<DailyReport | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState('all')
  const [members, setMembers] = useState<any[]>([])

  const hasReportToday = myReports.some(r => isToday(parseISO(r.report_date)))
  const todayReport = myReports.find(r => isToday(parseISO(r.report_date)))

  const profileId = profile?.id
  const profileRole = profile?.role

  const load = useCallback(async () => {
    if (!profileId) return
    setLoading(true)

    const admin = ['super_admin', 'chef_projet', 'ceo', 'dirigeant'].includes(profileRole || '')

    const { data: myData } = await supabase
      .from('daily_reports')
      .select('*, profiles:user_id(full_name, role, avatar_url)')
      .eq('user_id', profileId)
      .order('report_date', { ascending: false })
      .limit(30)
    setMyReports(myData || [])

    if (admin) {
      const [{ data: allData }, { data: membersData }] = await Promise.all([
        supabase.from('daily_reports')
          .select('*, profiles:user_id(full_name, role, avatar_url)')
          .order('report_date', { ascending: false })
          .limit(100),
        supabase.from('profiles').select('id, full_name, role').neq('role', 'client').order('full_name'),
      ])
      setReports(allData || [])
      setMembers(membersData || [])
    }

    setLoading(false)
  }, [profileId, profileRole])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditReport(null)
    if (todayReport) {
      setEditReport(todayReport)
      setForm({
        tasks_done: todayReport.tasks_done || '',
        tasks_in_progress: todayReport.tasks_in_progress || '',
        blockers: todayReport.blockers || '',
        next_day_plan: todayReport.next_day_plan || '',
        mood: todayReport.mood || 'bien',
        hours_worked: todayReport.hours_worked || 8,
        achievements: todayReport.achievements || '',
      })
    } else {
      setForm(emptyForm)
    }
    setDialogOpen(true)
  }

  async function generateWithAI() {
    setAiGenerating(true)
    try {
      const role = profile?.role ?? 'membre'
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Je suis ${role} dans une agence de communication. Génère un exemple de rapport journalier réaliste avec : tâches accomplies (3-4 tâches), tâches en cours (2), blocages (1), plan pour demain (3), et une réussite du jour. Réponds en JSON strict avec les clés : tasks_done, tasks_in_progress, blockers, next_day_plan, achievements. Chaque valeur est une string avec des tirets.` }],
          context: 'Génération rapport journalier'
        })
      })
      const data = await res.json()
      if (data.reply) {
        const jsonMatch = data.reply.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          setForm(f => ({
            ...f,
            tasks_done: parsed.tasks_done ?? f.tasks_done,
            tasks_in_progress: parsed.tasks_in_progress ?? f.tasks_in_progress,
            blockers: parsed.blockers ?? f.blockers,
            next_day_plan: parsed.next_day_plan ?? f.next_day_plan,
            achievements: parsed.achievements ?? f.achievements,
          }))
          toast.success('Rapport généré par l\'IA — modifie selon ta journée')
        }
      }
    } catch {
      toast.error('Erreur lors de la génération IA')
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleSave() {
    if (!profile?.id) return
    setSaving(true)
    const today = format(new Date(), 'yyyy-MM-dd')

    const payload = {
      user_id: profile.id,
      report_date: today,
      tasks_done: form.tasks_done || null,
      tasks_in_progress: form.tasks_in_progress || null,
      blockers: form.blockers || null,
      next_day_plan: form.next_day_plan || null,
      mood: form.mood,
      hours_worked: form.hours_worked,
      achievements: form.achievements || null,
      updated_at: new Date().toISOString(),
    }

    if (editReport || todayReport) {
      const id = editReport?.id || todayReport?.id
      const { error } = await supabase.from('daily_reports').update(payload).eq('id', id!)
      if (error) { toast.error('Erreur mise à jour'); setSaving(false); return }
      toast.success('Rapport mis à jour')
    } else {
      const { error } = await supabase.from('daily_reports').insert(payload)
      if (error) { toast.error('Erreur création'); setSaving(false); return }
      toast.success('Rapport du jour enregistré !')
    }

    setDialogOpen(false)
    setSaving(false)
    load()
  }

  const displayReports = isAdmin
    ? (filterUser === 'all' ? reports : reports.filter(r => r.user_id === filterUser))
    : myReports

  // Stats admin
  const todayReports = reports.filter(r => isToday(parseISO(r.report_date)))
  const avgHours = todayReports.length > 0
    ? todayReports.reduce((s, r) => s + Number(r.hours_worked || 0), 0) / todayReports.length
    : 0
  const moodCounts = todayReports.reduce((acc, r) => { acc[r.mood] = (acc[r.mood] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Journal d'activité
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Rapports journaliers de l'équipe" : 'Votre journal quotidien'}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          {hasReportToday ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {hasReportToday ? 'Modifier mon rapport' : 'Mon rapport du jour'}
        </Button>
      </div>

      {/* Aujourd'hui : alerte si pas encore de rapport */}
      {!hasReportToday && (
        <div className="flex items-center gap-3 bg-amber-50/50 border border-amber-200/50 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">Rapport du jour non soumis</p>
            <p className="text-xs text-amber-600">N'oubliez pas de remplir votre rapport journalier avant la fin de la journée.</p>
          </div>
        </div>
      )}
      {hasReportToday && (
        <div className="flex items-center gap-3 bg-green-50/50 border border-green-200/50 rounded-lg p-4">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700">Rapport du jour soumis — {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
        </div>
      )}

      {/* Stats admin du jour */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Rapports aujourd'hui</p>
              <p className="text-xl md:text-2xl font-bold">{todayReports.length}</p>
              <p className="text-xs text-muted-foreground">/{members.length} membres</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Heures moy. aujourd'hui</p>
              <p className="text-xl md:text-2xl font-bold">{avgHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          {Object.entries(moodCounts).slice(0, 2).map(([mood, count]) => {
            const cfg = MOOD_CONFIG[mood]
            const Icon = cfg?.icon || Meh
            return (
              <Card key={mood}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Humeur : {cfg?.label}</p>
                  <p className={`text-2xl font-bold ${cfg?.color}`}>{count}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tabs admin : équipe / mes rapports */}
      {isAdmin ? (
        <Tabs defaultValue="team">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="team">Équipe</TabsTrigger>
              <TabsTrigger value="mine">Mes rapports</TabsTrigger>
            </TabsList>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Tous les membres" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="team" className="mt-4 space-y-3">
            <ReportList reports={displayReports} expandedId={expandedId} setExpandedId={setExpandedId} showUser loading={loading} />
          </TabsContent>
          <TabsContent value="mine" className="mt-4 space-y-3">
            <ReportList reports={myReports} expandedId={expandedId} setExpandedId={setExpandedId} showUser={false} loading={loading} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-3">
          <ReportList reports={myReports} expandedId={expandedId} setExpandedId={setExpandedId} showUser={false} loading={loading} />
        </div>
      )}

      {/* Dialog rapport */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Rapport du {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateWithAI}
                  disabled={aiGenerating}
                  className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiGenerating ? 'Génération...' : 'Générer avec IA'}
                </Button>
              </div>
            </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Humeur + heures */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Comment s'est passée la journée ?</Label>
                <Select value={form.mood} onValueChange={v => setForm(f => ({ ...f, mood: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">😄 Excellent</SelectItem>
                    <SelectItem value="bien">🙂 Bien</SelectItem>
                    <SelectItem value="moyen">😐 Moyen</SelectItem>
                    <SelectItem value="difficile">😔 Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Heures travaillées</Label>
                <Input
                  type="number" min={0} max={24} step={0.5}
                  value={form.hours_worked}
                  onChange={e => setForm(f => ({ ...f, hours_worked: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Tâches accomplies aujourd'hui</Label>
              <Textarea
                placeholder="- Réunion client Projet X&#10;- Livraison maquette logo&#10;- Relance 3 prospects"
                rows={3}
                value={form.tasks_done}
                onChange={e => setForm(f => ({ ...f, tasks_done: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-500" />Tâches en cours</Label>
              <Textarea
                placeholder="- Montage vidéo campagne Juillet&#10;- Développement fonctionnalité paiement"
                rows={2}
                value={form.tasks_in_progress}
                onChange={e => setForm(f => ({ ...f, tasks_in_progress: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-amber-500" />Blocages / problèmes rencontrés</Label>
              <Textarea
                placeholder="- En attente de validation client&#10;- Problème accès serveur"
                rows={2}
                value={form.blockers}
                onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" />Plan pour demain</Label>
              <Textarea
                placeholder="- Finaliser présentation client&#10;- Réunion équipe 9h&#10;- Envoyer 4 offres"
                rows={2}
                value={form.next_day_plan}
                onChange={e => setForm(f => ({ ...f, next_day_plan: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-500" />Réussites / points positifs du jour (optionnel)</Label>
              <Textarea
                placeholder="- Client très satisfait de la livraison&#10;- Objectif de 4 offres atteint !"
                rows={2}
                value={form.achievements}
                onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Soumettre le rapport'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReportList({ reports, expandedId, setExpandedId, showUser, loading }: {
  reports: DailyReport[]
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  showUser: boolean
  loading: boolean
}) {
  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-7 w-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
  }
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Aucun rapport pour l'instant</p>
        </CardContent>
      </Card>
    )
  }

  // Group by date
  const grouped: Record<string, DailyReport[]> = {}
  reports.forEach(r => {
    if (!grouped[r.report_date]) grouped[r.report_date] = []
    grouped[r.report_date].push(r)
  })

  return (
    <div className="space-y-4">
      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayReports]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground capitalize">
              {isToday(parseISO(date))
                ? "Aujourd'hui"
                : format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            <Badge variant="secondary" className="text-xs">{dayReports.length}</Badge>
          </div>
          <div className="space-y-2">
            {dayReports.map(report => {
              const moodCfg = MOOD_CONFIG[report.mood] || MOOD_CONFIG['bien']
              const MoodIcon = moodCfg.icon
              const isExpanded = expandedId === report.id

              return (
                <Card key={report.id} className={cn('border-border/50 transition-all', isToday(parseISO(date)) && 'border-primary/20')}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  >
                    <div className={cn('flex items-center justify-center h-8 w-8 rounded-full border shrink-0', moodCfg.bg)}>
                      <MoodIcon className={cn('h-4 w-4', moodCfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {showUser && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate">{report.profiles?.full_name || '—'}</p>
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[report.profiles?.role || ''] || report.profiles?.role}</Badge>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {report.tasks_done || report.tasks_in_progress || 'Rapport soumis'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium">{Number(report.hours_worked || 0)}h</p>
                        <p className={cn('text-xs', moodCfg.color)}>{moodCfg.label}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3 mt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        {report.tasks_done && (
                          <ReportSection icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="Tâches accomplies" content={report.tasks_done} />
                        )}
                        {report.tasks_in_progress && (
                          <ReportSection icon={<Clock className="h-3.5 w-3.5 text-blue-500" />} label="En cours" content={report.tasks_in_progress} />
                        )}
                        {report.blockers && (
                          <ReportSection icon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />} label="Blocages" content={report.blockers} className="text-amber-700" />
                        )}
                        {report.next_day_plan && (
                          <ReportSection icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Plan demain" content={report.next_day_plan} />
                        )}
                        {report.achievements && (
                          <ReportSection icon={<TrendingUp className="h-3.5 w-3.5 text-green-500" />} label="Réussites" content={report.achievements} className="text-green-700" />
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportSection({ icon, label, content, className }: { icon: React.ReactNode; label: string; content: string; className?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">{icon}{label}</p>
      <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', className)}>{content}</p>
    </div>
  )
}
