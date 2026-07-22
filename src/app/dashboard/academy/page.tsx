'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatGNF } from '@/lib/utils'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import {
  Plus, Search, BookOpen, Clock, Users, Edit, Trash2,
  ChevronDown, ChevronUp, Eye, EyeOff, GraduationCap,
  TrendingUp, CheckCircle2, PlayCircle, BarChart3, UserPlus, Award, Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const emptyForm = { title: '', description: '', price: '', duration_hours: '', is_published: false, level: 'debutant', category: '' }
const emptyModuleForm = { title: '', content: '', video_url: '', position: '' }
const emptyEnrollForm = { full_name: '', phone: '', student_email: '', gender: 'homme', birth_date: '', profession: '', city: '', address: '', training_id: '', session_label: '', level: 'debutant', enrolled_at: new Date().toISOString().split('T')[0], course_start: '', course_end: '', price_gnf: 0, amount_paid: 0, payment_method: 'especes', commercial: '', trainer: '', room: '', attendance_status: 'present', progress: 0, certificate_issued: false, certificate_number: '', notes: '' }
const ENROLLMENTS_FALLBACK_KEY = 'erp_enrollments_fallback'

const LEVELS = [
  { value: 'debutant',      label: 'Débutant',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'intermediaire', label: 'Intermédiaire', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'avance',        label: 'Avancé',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
]

const ENROLL_STATUS = {
  active:    { label: 'En cours',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Terminé',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  paused:    { label: 'Suspendu',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  dropped:   { label: 'Abandonné', color: 'bg-red-100 text-red-700 border-red-200' },
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}


function paymentStatusMeta(enrollment: any) {
  const price = Number(enrollment.price_gnf || enrollment.trainings?.price || 0)
  const paid = Number(enrollment.amount_paid || 0)
  const remaining = Math.max(price - paid, 0)
  const status = paid <= 0 ? 'non_paye' : paid >= price ? 'solde' : paid < price / 2 ? 'acompte' : 'partiellement_paye'
  const label = status === 'non_paye' ? 'Non payé' : status === 'solde' ? 'Soldé' : status === 'acompte' ? 'Acompte' : 'Partiellement payé'
  const color = status === 'solde' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'non_paye' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
  return { price, paid, remaining, status, label, color }
}

function attendanceMeta(value: string) {
  if (value === 'absent') return { label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200' }
  if (value === 'retard') return { label: 'Retard', color: 'bg-amber-100 text-amber-700 border-amber-200' }
  return { label: 'Présent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
}

export default function AcademyPage() {
  const [trainings, setTrainings]       = useState<any[]>([])
  const [modules, setModules]           = useState<Record<string, any[]>>({})
  const [enrollments, setEnrollments]   = useState<any[]>([])
  const [search, setSearch]             = useState('')
  const [searchEnroll, setSearchEnroll] = useState('')
  const [enrollView, setEnrollView] = useState('all')
  const [loading, setLoading]           = useState(true)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [moduleDialog, setModuleDialog] = useState<any | null>(null)
  const [enrollDialog, setEnrollDialog] = useState(false)
  const [editTraining, setEditTraining] = useState<any | null>(null)
  const [editEnroll, setEditEnroll]     = useState<any | null>(null)
  const [expandedTraining, setExpandedTraining] = useState<string | null>(null)
  const [form, setForm]                 = useState(emptyForm)
  const [moduleForm, setModuleForm]     = useState(emptyModuleForm)
  const [enrollForm, setEnrollForm]     = useState(emptyEnrollForm)
  const [saving, setSaving]             = useState(false)
  const [activeTab, setActiveTab]       = useState('catalogue')

  const [enrollmentsTableError, setEnrollmentsTableError] = useState(false)

  const fetchAll = useCallback(async () => {
    const [{ data: tr }, { data: en, error: enErr }] = await Promise.all([
      supabase.from('trainings').select('*').order('created_at', { ascending: false }),
      supabase.from('enrollments').select('*, trainings(title, price, duration_hours)').order('enrolled_at', { ascending: false }),
    ])
    const missing = enErr?.message?.includes('schema cache') || enErr?.message?.includes('relation') || enErr?.code === '42P01' || enErr?.code === 'PGRST205'
    setEnrollmentsTableError(Boolean(missing))
    setTrainings(tr || [])
    setEnrollments(missing ? await loadFallbackEnrollments() : (en || []))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function fetchModules(trainingId: string) {
    const { data } = await supabase.from('training_modules').select('*').eq('training_id', trainingId).order('position')
    setModules(prev => ({ ...prev, [trainingId]: data || [] }))
  }

  // ── Stats ──
  const stats = {
    formations:  trainings.length,
    published:   trainings.filter(t => t.is_published).length,
    students:    [...new Set(enrollments.map(e => e.student_email || e.student_name))].length,
    completed:   enrollments.filter(e => e.status === 'completed').length,
    revenue:     enrollments.reduce((s, e) => s + Number(e.price_gnf || e.trainings?.price || 0), 0),
    collected:   enrollments.reduce((s, e) => s + Number(e.amount_paid || 0), 0),
    remaining:   enrollments.reduce((s, e) => s + Math.max(Number(e.price_gnf || e.trainings?.price || 0) - Number(e.amount_paid || 0), 0), 0),
    certificates: enrollments.filter(e => e.certificate_issued).length,
    active: enrollments.filter(e => e.status === 'active').length,
    inProgressTrainings: new Set(enrollments.filter(e => e.status === 'active').map(e => e.training_id)).size,
    avgProgress: enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length)
      : 0,
  }

  // ── Training CRUD ──
  function openCreate() { setEditTraining(null); setForm(emptyForm); setDialogOpen(true) }
  function openEdit(t: any) {
    setEditTraining(t)
    setForm({ title: t.title, description: t.description || '', price: t.price?.toString() || '', duration_hours: t.duration_hours?.toString() || '', is_published: t.is_published, level: t.level || 'debutant', category: t.category || '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title) { toast.error('Titre requis'); return }
    setSaving(true)
    const payload = { title: form.title, description: form.description || null, price: parseFloat(form.price) || 0, duration_hours: parseInt(form.duration_hours) || null, is_published: form.is_published, level: form.level, category: form.category || null }
    const { error } = editTraining
      ? await supabase.from('trainings').update(payload).eq('id', editTraining.id)
      : await supabase.from('trainings').insert(payload)
    if (error) toast.error(getErrorMessage(error, 'Opération impossible'))
    else { toast.success(editTraining ? 'Formation mise a jour' : 'Formation creee'); fetchAll(); setDialogOpen(false) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette formation ?')) return
    await supabase.from('trainings').delete().eq('id', id)
    toast.success('Formation supprimée'); fetchAll()
  }

  async function togglePublish(training: any) {
    await supabase.from('trainings').update({ is_published: !training.is_published }).eq('id', training.id)
    fetchAll()
  }

  // ── Modules ──
  async function handleAddModule() {
    if (!moduleDialog || !moduleForm.title) { toast.error('Titre du module requis'); return }
    setSaving(true)
    const { error } = await supabase.from('training_modules').insert({ training_id: moduleDialog.id, title: moduleForm.title, content: moduleForm.content || null, video_url: moduleForm.video_url || null, position: parseInt(moduleForm.position) || (modules[moduleDialog.id]?.length || 0) + 1 })
    if (error) toast.error('Opération impossible')
    else { toast.success('Module ajoute'); fetchModules(moduleDialog.id); setModuleForm(emptyModuleForm) }
    setSaving(false)
  }

  async function deleteModule(moduleId: string, trainingId: string) {
    await supabase.from('training_modules').delete().eq('id', moduleId)
    fetchModules(trainingId)
  }

  function toggleExpand(id: string) {
    if (expandedTraining === id) { setExpandedTraining(null) }
    else { setExpandedTraining(id); fetchModules(id) }
  }

  // ── Enrollments ──
  function openEnrollCreate() { setEditEnroll(null); setEnrollForm(emptyEnrollForm); setEnrollDialog(true) }
  function openEnrollEdit(e: any) {
    setEditEnroll(e)
    setEnrollForm({ full_name: e.full_name || e.student_name, phone: e.phone || '', student_email: e.student_email || '', gender: e.gender || 'homme', birth_date: e.birth_date || '', profession: e.profession || '', city: e.city || '', address: e.address || '', training_id: e.training_id, session_label: e.session_label || '', level: e.level || 'debutant', enrolled_at: e.enrolled_at || new Date().toISOString().split('T')[0], course_start: e.course_start || '', course_end: e.course_end || '', price_gnf: e.price_gnf || e.trainings?.price || 0, amount_paid: e.amount_paid || 0, payment_method: e.payment_method || 'especes', commercial: e.commercial || '', trainer: e.trainer || '', room: e.room || '', attendance_status: e.attendance_status || 'present', progress: e.progress || 0, certificate_issued: !!e.certificate_issued, certificate_number: e.certificate_number || '', notes: e.notes || '' })
    setEnrollDialog(true)
  }

  async function handleEnrollSave() {
    if (!enrollForm.full_name || !enrollForm.training_id) { toast.error('Nom et formation requis'); return }
    setSaving(true)
    const payload = serializeEnrollmentForm(enrollForm)
    let error: any = null
    if (enrollmentsTableError) {
      const current = await loadFallbackEnrollments()
      const nextPayload = normalizeEnrollment({ ...payload, id: editEnroll?.id || crypto.randomUUID(), trainings: trainings.find(t => t.id === enrollForm.training_id) ? { title: trainings.find(t => t.id === enrollForm.training_id)?.title, price: trainings.find(t => t.id === enrollForm.training_id)?.price, duration_hours: trainings.find(t => t.id === enrollForm.training_id)?.duration_hours } : null })
      const next = editEnroll ? current.map(item => item.id === editEnroll.id ? nextPayload : item) : [nextPayload, ...current]
      const result = await saveFallbackEnrollments(next)
      error = result.error
    } else {
      const result = editEnroll
        ? await supabase.from('enrollments').update(payload).eq('id', editEnroll.id)
        : await supabase.from('enrollments').insert(payload)
      error = result.error
    }
    if (error) toast.error(getErrorMessage(error, 'Opération impossible'))
    else { toast.success(editEnroll ? 'Inscription modifiée' : 'Étudiant inscrit'); fetchAll(); setEnrollDialog(false) }
    setSaving(false)
  }

  async function handleEnrollDelete(id: string) {
    if (!confirm('Supprimer cette inscription ?')) return
    if (enrollmentsTableError) {
      const current = await loadFallbackEnrollments()
      const result = await saveFallbackEnrollments(current.filter(item => item.id !== id))
      if (result.error) return toast.error('Erreur: ' + result.error.message)
    } else {
      const { error } = await supabase.from('enrollments').delete().eq('id', id)
      if (error) return toast.error(getErrorMessage(error, 'Opération impossible'))
    }
    toast.success('Inscription supprimée'); fetchAll()
  }

  async function updateProgress(id: string, progress: number) {
    const status = progress >= 100 ? 'completed' : 'active'
    if (enrollmentsTableError) {
      const current = await loadFallbackEnrollments()
      await saveFallbackEnrollments(current.map(item => item.id === id ? { ...item, progress, status } : item))
    } else {
      await supabase.from('enrollments').update({ progress, status }).eq('id', id)
    }
    fetchAll()
  }


  async function migrateToRealTable() {
    const current = await loadFallbackEnrollments()
    if (current.length === 0) return toast.info('Aucune donnée à migrer')
    const payload = current.map(({ id, trainings, ...rest }) => rest)
    const { error } = await supabase.from('enrollments').insert(payload)
    if (error) return toast.error('Migration impossible: ' + error.message)
    await supabase.from('settings').delete().eq('key', ENROLLMENTS_FALLBACK_KEY)
    toast.success('Migration terminée')
    fetchAll()
  }
  const filtered = trainings.filter(t => search === '' || t.title.toLowerCase().includes(search.toLowerCase()))
  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = (e.full_name || e.student_name).toLowerCase().includes(searchEnroll.toLowerCase()) || (e.trainings?.title || '').toLowerCase().includes(searchEnroll.toLowerCase()) || (e.session_label || '').toLowerCase().includes(searchEnroll.toLowerCase())
    const payment = paymentStatusMeta(e)
    const started = e.course_start && e.course_start <= new Date().toISOString().split('T')[0]
    const viewMatch = enrollView === 'all'
      || (enrollView === 'pending' && payment.remaining > 0)
      || (enrollView === 'sold' && payment.remaining <= 0)
      || (enrollView === 'late' && payment.remaining > 0 && started)
      || (enrollView === 'marketing' && (e.trainings?.title || '').toLowerCase().includes('marketing'))
      || (enrollView === 'contenu' && (e.trainings?.title || '').toLowerCase().includes('contenu'))
      || (enrollView === 'design' && (e.trainings?.title || '').toLowerCase().includes('design'))
      || (enrollView === 'community' && (e.trainings?.title || '').toLowerCase().includes('community'))
      || (enrollView === 'devweb' && (e.trainings?.title || '').toLowerCase().includes('web'))
      || (enrollView === 'ecommerce' && (e.trainings?.title || '').toLowerCase().includes('commerce'))
      || (enrollView === 'ia' && ((e.trainings?.title || '').toLowerCase().includes('intelligence') || (e.trainings?.title || '').toLowerCase().includes('ia')))
    return matchesSearch && viewMatch
  })

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {enrollmentsTableError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Mode sécurisé actif</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Les inscriptions continuent de fonctionner normalement pendant la synchronisation des données.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Academy — Gestion des inscrits
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Catalogue, inscriptions, paiements et suivi des apprenants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEnrollCreate}>
            <UserPlus className="h-4 w-4 mr-2" /> Inscrire un étudiant
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle formation
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-3">
        {[
          { label: 'Formations',   value: stats.formations,              icon: BookOpen,     color: 'text-foreground' },
          { label: 'Publiées',     value: stats.published,               icon: Eye,          color: 'text-emerald-600' },
          { label: 'Étudiants',    value: stats.students,                icon: Users,        color: 'text-blue-600' },
          { label: 'Terminées',    value: stats.completed,               icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Revenus',      value: formatGNF(stats.revenue),      icon: TrendingUp,   color: 'text-primary' },
          { label: 'Progression',  value: stats.avgProgress + '%',       icon: BarChart3,    color: 'text-amber-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><k.icon className="h-3 w-3" />{k.label}</p>
              <p className={`text-lg font-black mt-0.5 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalogue" className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Catalogue ({trainings.length})
          </TabsTrigger>
          <TabsTrigger value="etudiants" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Gestion des inscrits ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Catalogue ── */}
        <TabsContent value="catalogue" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une formation..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(training => {
                const level = LEVELS.find(l => l.value === training.level)
                const enrollCount = enrollments.filter(e => e.training_id === training.id).length
                const completedCount = enrollments.filter(e => e.training_id === training.id && e.status === 'completed').length
                return (
                  <Card key={training.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{training.title}</h3>
                              <Badge variant="outline" className={cn('text-xs', training.is_published ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-muted-foreground text-muted-foreground')}>
                                {training.is_published ? 'Publiée' : 'Brouillon'}
                              </Badge>
                              {level && <Badge className={`text-xs border ${level.color}`}>{level.label}</Badge>}
                              {training.category && <Badge variant="outline" className="text-xs">{training.category}</Badge>}
                            </div>
                            {training.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{training.description}</p>}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {training.duration_hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{training.duration_hours}h</span>}
                              {training.price > 0 && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{formatGNF(training.price)}</span>}
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{enrollCount} inscrit{enrollCount > 1 ? 's' : ''}</span>
                              {completedCount > 0 && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />{completedCount} terminé{completedCount > 1 ? 's' : ''}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(training)} title={training.is_published ? 'Depublier' : 'Publier'}>
                              {training.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setModuleDialog(training); fetchModules(training.id) }}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(training)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(training.id)}><Trash2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpand(training.id)}>
                              {expandedTraining === training.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {expandedTraining === training.id && (
                        <div className="border-t border-border/50 px-4 pb-4 pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Modules ({modules[training.id]?.length || 0})
                          </p>
                          {(modules[training.id] || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun module · Cliquez sur + pour ajouter</p>
                          ) : (
                            <div className="space-y-2">
                              {(modules[training.id] || []).map((mod, idx) => (
                                <div key={mod.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-0.5 shrink-0">#{idx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{mod.title}</p>
                                    {mod.content && <p className="text-xs text-muted-foreground truncate">{mod.content}</p>}
                                    {mod.video_url && <p className="text-xs text-blue-500 truncate mt-0.5">{mod.video_url}</p>}
                                  </div>
                                  <button onClick={() => deleteModule(mod.id, training.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {filtered.length === 0 && (
                <Card><CardContent className="py-16 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Aucune formation trouvée</p>
                </CardContent></Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Étudiants ── */}
        <TabsContent value="etudiants" className="mt-4">
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un étudiant, une session ou une formation..." className="pl-9" value={searchEnroll} onChange={e => setSearchEnroll(e.target.value)} />
            </div>
            <Select value={enrollView} onValueChange={setEnrollView}>
              <SelectTrigger className="w-full lg:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📋 Tous les inscrits</SelectItem>
                <SelectItem value="pending">💰 Paiements en attente</SelectItem>
                <SelectItem value="sold">💵 Formation soldée</SelectItem>
                <SelectItem value="late">🚨 Retard de paiement</SelectItem>
                <SelectItem value="marketing">🎓 Marketing Digital</SelectItem>
                <SelectItem value="contenu">✍️ Création de contenu</SelectItem>
                <SelectItem value="design">🎨 Design Graphique</SelectItem>
                <SelectItem value="community">📱 Community Management</SelectItem>
                <SelectItem value="devweb">🌐 Développement Web</SelectItem>
                <SelectItem value="ecommerce">🛒 E-commerce</SelectItem>
                <SelectItem value="ia">🤖 Intelligence Artificielle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Formateur / Salle</TableHead>
                  <TableHead>Certificat</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12">
                    <div className="flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  </TableCell></TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 opacity-20" />
                      <p className="font-medium">Aucun étudiant inscrit</p>
                      <p className="text-xs">Cliquez sur "Inscrire un étudiant" pour commencer</p>
                    </div>
                  </TableCell></TableRow>
                ) : filteredEnrollments.map(e => {
                  const st = ENROLL_STATUS[e.status as keyof typeof ENROLL_STATUS] || { label: e.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                  const progress = Number(e.progress) || 0
                  const payment = paymentStatusMeta(e)
                  const attendance = attendanceMeta(e.attendance_status)
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(e.full_name || e.student_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{e.full_name || e.student_name}</div>
                            <div className="text-xs text-muted-foreground">{e.student_email || 'Sans email'}{e.phone ? ` · ${e.phone}` : ''}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{e.trainings?.title || '—'}</div>
                          <div className="text-xs text-muted-foreground">{e.session_label || 'Session non définie'} · {e.level || 'Débutant'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={`text-xs border ${payment.color}`}>{payment.label}</Badge>
                          <div className="text-[11px] text-muted-foreground">Payé: {payment.paid.toLocaleString('fr-FR')} / {payment.price.toLocaleString('fr-FR')} GNF</div>
                          <div className="text-[11px] font-medium text-foreground">Reste: {payment.remaining.toLocaleString('fr-FR')} GNF</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                          <Badge className={`text-xs border ${attendance.color}`}>{attendance.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Progression</span><span>{progress}%</span></div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div>{e.trainer || '—'}</div>
                          <div className="text-muted-foreground">{e.room || 'Salle non définie'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={e.certificate_issued ? 'default' : 'outline'}>{e.certificate_issued ? 'Certificat OK' : 'Sans certificat'}</Badge>
                          {e.certificate_number && <div className="text-[11px] text-muted-foreground">#{e.certificate_number}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {progress < 100 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Marquer 100% terminé" onClick={() => updateProgress(e.id, 100)}>
                              <Award className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEnrollEdit(e)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleEnrollDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Training ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTraining ? 'Modifier la formation' : 'Nouvelle formation'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input placeholder="Ex: Formation WordPress" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Objectifs et contenu..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prix (GNF)</Label>
                <Input type="number" placeholder="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Durée (heures)</Label>
                <Input type="number" placeholder="0" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Input placeholder="Ex: Design, Dev..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="published" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="rounded" />
              <Label htmlFor="published" className="cursor-pointer">Publier immédiatement</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editTraining ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Module ── */}
      <Dialog open={!!moduleDialog} onOpenChange={() => setModuleDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ajouter un module — {moduleDialog?.title}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Titre du module *</Label><Input placeholder="Ex: Introduction" value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Contenu / Description</Label><Textarea rows={3} value={moduleForm.content} onChange={e => setModuleForm(f => ({ ...f, content: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>URL Vidéo</Label><Input placeholder="https://..." value={moduleForm.video_url} onChange={e => setModuleForm(f => ({ ...f, video_url: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Position</Label><Input type="number" placeholder="1" value={moduleForm.position} onChange={e => setModuleForm(f => ({ ...f, position: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>Fermer</Button>
            <Button onClick={handleAddModule} disabled={saving}>{saving ? 'Ajout...' : 'Ajouter le module'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Enrollment ── */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEnroll ? 'Modifier l\'inscription' : 'Inscrire un étudiant'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Nom de l'étudiant *</Label>
                <Input placeholder="Ex: Mamadou Bah" value={enrollForm.full_name} onChange={e => setEnrollForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Téléphone</Label>
                <Input type="email" placeholder="email@exemple.com" value={enrollForm.phone} onChange={e => setEnrollForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" value={enrollForm.student_email} onChange={e => setEnrollForm(f => ({ ...f, student_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sexe</Label>
                <Select value={enrollForm.gender} onValueChange={v => setEnrollForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="homme">Homme</SelectItem><SelectItem value="femme">Femme</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <Input type="date" value={enrollForm.birth_date} onChange={e => setEnrollForm(f => ({ ...f, birth_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Profession</Label>
                <Input value={enrollForm.profession} onChange={e => setEnrollForm(f => ({ ...f, profession: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input value={enrollForm.city} onChange={e => setEnrollForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input value={enrollForm.address} onChange={e => setEnrollForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>Formation *</Label>
                <Select value={enrollForm.training_id} onValueChange={v => setEnrollForm(f => ({ ...f, training_id: v, price_gnf: Number(trainings.find(t => t.id === v)?.price || 0) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une formation..." /></SelectTrigger>
                  <SelectContent>{trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Input placeholder="Ex: Juillet 2026" value={enrollForm.session_label} onChange={e => setEnrollForm(f => ({ ...f, session_label: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Select value={enrollForm.level} onValueChange={v => setEnrollForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debutant">Débutant</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                    <SelectItem value="avance">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date d'inscription</Label>
                <Input type="date" value={enrollForm.enrolled_at} onChange={e => setEnrollForm(f => ({ ...f, enrolled_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Début des cours</Label>
                <Input type="date" value={enrollForm.course_start} onChange={e => setEnrollForm(f => ({ ...f, course_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fin des cours</Label>
                <Input type="date" value={enrollForm.course_end} onChange={e => setEnrollForm(f => ({ ...f, course_end: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Prix formation (GNF)</Label>
                <Input type="number" value={enrollForm.price_gnf} onChange={e => setEnrollForm(f => ({ ...f, price_gnf: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Montant payé</Label>
                <Input type="number" value={enrollForm.amount_paid} onChange={e => setEnrollForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Moyen de paiement</Label>
                <Select value={enrollForm.payment_method} onValueChange={v => setEnrollForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="especes">Espèces</SelectItem><SelectItem value="orange_money">Orange Money</SelectItem><SelectItem value="wave">Wave</SelectItem><SelectItem value="virement">Virement bancaire</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commercial</Label>
                <Input value={enrollForm.commercial} onChange={e => setEnrollForm(f => ({ ...f, commercial: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Formateur</Label>
                <Input value={enrollForm.trainer} onChange={e => setEnrollForm(f => ({ ...f, trainer: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Salle</Label>
                <Input value={enrollForm.room} onChange={e => setEnrollForm(f => ({ ...f, room: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Présence</Label>
                <Select value={enrollForm.attendance_status} onValueChange={v => setEnrollForm(f => ({ ...f, attendance_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="present">Présent</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="retard">Retard</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Progression (%)</Label>
                <Input type="number" min={0} max={100} value={enrollForm.progress} onChange={e => setEnrollForm(f => ({ ...f, progress: Number(e.target.value) }))} />
                <Progress value={Number(enrollForm.progress)} className="h-2" />
              </div>
              <div className="space-y-2">
                <Label>Certificat</Label>
                <Select value={enrollForm.certificate_issued ? "oui" : "non"} onValueChange={v => setEnrollForm(f => ({ ...f, certificate_issued: v === "oui" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="non">Non</SelectItem><SelectItem value="oui">Oui</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>N° Certificat</Label>
                <Input value={enrollForm.certificate_number} onChange={e => setEnrollForm(f => ({ ...f, certificate_number: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Commentaires</Label>
                <Textarea rows={3} value={enrollForm.notes} onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialog(false)}>Annuler</Button>
            <Button onClick={handleEnrollSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function normalizeEnrollment(value: any) {
  const rawNotes = typeof value.notes === 'string' ? value.notes : ''
  let meta: any = {}
  try { meta = rawNotes.trim().startsWith('{') ? JSON.parse(rawNotes) : {} } catch { meta = {} }
  return {
    id: String(value.id),
    student_name: String(value.student_name || value.full_name || ''),
    full_name: String(value.student_name || value.full_name || ''),
    phone: meta.phone || '',
    student_email: value.student_email || null,
    gender: meta.gender || 'homme',
    birth_date: meta.birth_date || '',
    profession: meta.profession || '',
    city: meta.city || '',
    address: meta.address || '',
    training_id: String(value.training_id || ''),
    session_label: meta.session_label || '',
    level: meta.level || 'debutant',
    enrolled_at: value.enrolled_at || new Date().toISOString().split('T')[0],
    course_start: meta.course_start || '',
    course_end: meta.course_end || '',
    price_gnf: Number(meta.price_gnf || value.trainings?.price || 0),
    amount_paid: Number(meta.amount_paid || 0),
    payment_method: meta.payment_method || 'especes',
    commercial: meta.commercial || '',
    trainer: meta.trainer || '',
    room: meta.room || '',
    attendance_status: meta.attendance_status || 'present',
    status: value.status || meta.status || 'active',
    progress: Number(value.progress || 0),
    certificate_issued: Boolean(meta.certificate_issued),
    certificate_number: meta.certificate_number || '',
    notes: meta.comments || (rawNotes.trim().startsWith('{') ? '' : rawNotes) || null,
    trainings: value.trainings || null,
  }
}

function serializeEnrollmentForm(form: any) {
  const paymentStatus = form.amount_paid <= 0 ? 'non_paye' : form.amount_paid >= form.price_gnf ? 'solde' : form.amount_paid < form.price_gnf / 2 ? 'acompte' : 'partiellement_paye'
  return {
    student_name: form.full_name,
    student_email: form.student_email || null,
    training_id: form.training_id,
    enrolled_at: form.enrolled_at,
    status: Number(form.progress) >= 100 ? 'completed' : 'active',
    progress: Number(form.progress) || 0,
    notes: JSON.stringify({
      phone: form.phone || '', gender: form.gender || 'homme', birth_date: form.birth_date || '', profession: form.profession || '', city: form.city || '', address: form.address || '',
      session_label: form.session_label || '', level: form.level || 'debutant', course_start: form.course_start || '', course_end: form.course_end || '',
      price_gnf: Number(form.price_gnf) || 0, amount_paid: Number(form.amount_paid) || 0, remaining_gnf: Math.max((Number(form.price_gnf) || 0) - (Number(form.amount_paid) || 0), 0), payment_status: paymentStatus,
      payment_method: form.payment_method || 'especes', commercial: form.commercial || '', trainer: form.trainer || '', room: form.room || '', attendance_status: form.attendance_status || 'present',
      certificate_issued: !!form.certificate_issued, certificate_number: form.certificate_number || '', comments: form.notes || ''
    })
  }
}

async function loadFallbackEnrollments() {
  const { data } = await supabase.from('settings').select('value').eq('key', ENROLLMENTS_FALLBACK_KEY).maybeSingle()
  const raw = Array.isArray(data?.value) ? data.value : []
  return raw.map(normalizeEnrollment)
}

async function saveFallbackEnrollments(enrollments: any[]) {
  return supabase.from('settings').upsert({
    key: ENROLLMENTS_FALLBACK_KEY,
    value: enrollments,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
}
