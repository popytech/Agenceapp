'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap, Users, Award, TrendingUp, BookOpen, Calendar, Star, AlertTriangle,
  Plus, Search, Clock, DollarSign, CheckCircle, XCircle, BarChart2, Edit, Trash2,
  UserPlus, CreditCard, FileText, Download, Receipt, Building, Phone, Mail,
  FolderKanban, ExternalLink
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { downloadFormationReceiptPDF, downloadFormationCertificatePDF, downloadRegistrationsListPDF } from '@/lib/pdf'
import type { CertificateOverrides } from '@/lib/pdf'

const supabaseClient = supabase

type Training = {
  id: string; title: string; description: string; price: number
  duration_hours: number; is_published: boolean; created_at: string
}
type TrainingSession = {
  id: string; training_id: string; trainer_id: string | null; title: string | null
  format: string; start_date: string; end_date: string; capacity: number
  location: string | null; visio_link: string | null; status: string; created_at: string
  trainings?: { title: string }
  profiles?: { full_name: string }
  session_enrollments?: { count: number }[]
}
type Profile = { id: string; full_name: string; role: string; email?: string }
type Certification = {
  id: string; student_id: string; training_id: string; issued_at: string
  status: string; certificate_number: string | null
  profiles?: { full_name: string }
  trainings?: { title: string }
}
type Feedback = {
  id: string; session_id: string; satisfaction: number; trainer_note: number; comment: string; submitted_at: string
  profiles?: { full_name: string }
  training_sessions?: { title: string; trainings?: { title: string } }
}
type Enrollment = {
  id: string; session_id: string; student_id: string; status: string
  attendance_rate: number; grade: number | null; enrolled_at: string
  profiles?: { full_name: string }
  training_sessions?: { title: string | null; trainings?: { title: string } }
}

// ─── NEW TYPES ────────────────────────────────────────────────────────────────
type Registration = {
  id: string; training_id: string; session_id: string | null
  student_name: string; student_email: string; student_phone: string | null
  student_company: string | null; registration_number: string
  amount_due: number; amount_paid: number
  payment_status: string; registration_status: string
  notes: string | null; registered_at: string; created_at: string
  trainings?: { title: string; price: number }
  training_sessions?: { title: string | null }
}

type Payment = {
  id: string; registration_id: string | null; training_id: string | null
  student_name: string; amount: number; payment_method: string
  payment_date: string; reference: string | null; receipt_number: string
  notes: string | null; created_at: string
  trainings?: { title: string }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

const statusColor: Record<string, string> = {
  planifiee: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-green-100 text-green-700',
  terminee: 'bg-gray-100 text-gray-600',
  annulee: 'bg-red-100 text-red-700',
}
const statusLabel: Record<string, string> = {
  planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée'
}
const formatLabel: Record<string, string> = {
  online: 'En ligne', presentiel: 'Présentiel', hybride: 'Hybride'
}
const payStatusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
}
const payStatusLabel: Record<string, string> = {
  pending: 'En attente', partial: 'Partiel', paid: 'Payé', refunded: 'Remboursé'
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  chef_projet: 'Chef de Projet',
  designer: 'Designer',
  developpeur: 'Développeur',
  marketeur: 'Marketeur',
  cm: 'Community Manager',
  vidéaste: 'Vidéaste',
  monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur',
  responsable_formations: 'Responsable Formations',
  assistante_direction: 'Assistante Direction',
  stagiaire: 'Apprenant Academy',
  client: 'Client',
  creatrice_contenu: 'Créatrice de Contenu',
  commercial_digital: 'Commercial Digital'
}

// ─── TAB 1 : Synthèse ──────────────────────────────────────────────────────────
function SyntheseTab({ sessions, enrollments, certifications, feedbacks, trainings, payments, registrations }: {
  sessions: TrainingSession[]; enrollments: Enrollment[]; certifications: Certification[]
  feedbacks: Feedback[]; trainings: Training[]; payments: Payment[]; registrations: Registration[]
}) {
  const activeSessions = sessions.filter(s => s.status === 'en_cours').length
  const totalStudents = new Set(registrations.map(r => r.student_email)).size
  const avgSatisfaction = feedbacks.length
    ? (feedbacks.reduce((a, f) => a + (f.satisfaction || 0), 0) / feedbacks.length).toFixed(1)
    : 'N/A'
  const certCount = certifications.filter(c => isIssuedCertificate(c.status)).length
  const totalRevenue = payments.reduce((a, p) => a + (p.amount || 0), 0)
  const successRate = enrollments.length
    ? Math.round((enrollments.filter(e => e.status === 'termine').length / enrollments.length) * 100)
    : 0

  // alertes
  const underfilledSessions = sessions.filter(s => {
    const enrolled = registrations.filter(r => r.session_id === s.id).length
    return s.status === 'planifiee' && enrolled < s.capacity * 0.5
  })
  const lowFeedbackSessions = sessions.filter(s => {
    const fb = feedbacks.filter(f => f.session_id === s.id)
    if (!fb.length) return false
    const avg = fb.reduce((a, f) => a + (f.satisfaction || 0), 0) / fb.length
    return avg < 3
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Formations actives" value={trainings.filter(t => t.is_published).length} icon={BookOpen} color="bg-violet-500" />
        <KpiCard title="Sessions en cours" value={activeSessions} icon={Calendar} color="bg-blue-500" />
        <KpiCard title="Apprenants inscrits" value={registrations.length} icon={Users} color="bg-emerald-500" />
        <KpiCard title="Certificats délivrés" value={certCount} icon={Award} color="bg-amber-500" />
        <KpiCard title="Satisfaction moy." value={avgSatisfaction + '/5'} icon={Star} color="bg-pink-500" />
        <KpiCard title="Taux réussite" value={successRate + '%'} icon={TrendingUp} color="bg-green-500" />
        <KpiCard title="Revenus encaissés" value={totalRevenue.toLocaleString('fr-FR') + ' GNF'} icon={DollarSign} color="bg-orange-500" />
        <KpiCard title="Total sessions" value={sessions.length} icon={BarChart2} color="bg-slate-500" />
      </div>

      {(underfilledSessions.length > 0 || lowFeedbackSessions.length > 0) && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" /> Alertes Academy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {underfilledSessions.map(s => (
              <p key={s.id} className="text-sm text-orange-700">
                Session sous-inscrite : <strong>{s.title || s.trainings?.title}</strong> ({registrations.filter(r => r.session_id === s.id).length}/{s.capacity} places)
              </p>
            ))}
            {lowFeedbackSessions.map(s => (
              <p key={s.id} className="text-sm text-orange-700">
                Satisfaction faible : <strong>{s.title || s.trainings?.title}</strong>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sessions récentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[60%]">{s.title || s.trainings?.title}</span>
                <Badge className={statusColor[s.status] || ''}>{statusLabel[s.status] || s.status}</Badge>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">Aucune session</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Formations & inscrits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {trainings.slice(0, 5).map(t => {
              const count = registrations.filter(r => r.training_id === t.id).length
              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[70%]">{t.title}</span>
                    <span className="text-muted-foreground">{count} inscrits</span>
                  </div>
                  <Progress value={Math.min((count / 20) * 100, 100)} className="h-1.5" />
                </div>
              )
            })}
            {trainings.length === 0 && <p className="text-sm text-muted-foreground">Aucune formation</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── TAB 2 : Formations ────────────────────────────────────────────────────────
function FormationsTab({ trainings, sessions, reload }: { trainings: Training[]; sessions: TrainingSession[]; reload: () => void }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '', duration_hours: '', is_published: 'true' })

  const filtered = trainings.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!form.title.trim()) return
    const { data: { user } } = await supabaseClient.auth.getUser()
    await supabaseClient.from('trainings').insert({
      title: form.title,
      description: form.description,
      price: parseFloat(form.price) || 0,
      duration_hours: parseInt(form.duration_hours) || 0,
      is_published: form.is_published === 'true',
      created_by: user?.id
    })
    setOpen(false)
    setForm({ title: '', description: '', price: '', duration_hours: '', is_published: 'true' })
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher une formation…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nouvelle formation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvelle formation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix (GNF)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                <div><Label>Durée (h)</Label><Input type="number" value={form.duration_hours} onChange={e => setForm(p => ({ ...p, duration_hours: e.target.value }))} /></div>
              </div>
              <div><Label>Statut</Label>
                <Select value={form.is_published} onValueChange={v => setForm(p => ({ ...p, is_published: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Publié</SelectItem>
                    <SelectItem value="false">Brouillon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleSave}>Créer la formation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => {
          const sessCount = sessions.filter(s => s.training_id === t.id).length
          return (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{t.title}</h3>
                  <Badge variant={t.is_published ? 'default' : 'secondary'} className="shrink-0 text-xs">
                    {t.is_published ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration_hours}h</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{t.price?.toLocaleString('fr-FR')} GNF</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{sessCount} session{sessCount !== 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Aucune formation trouvée</div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 3 : Sessions ─────────────────────────────────────────────────────────
function SessionsTab({ sessions, trainings, profiles, enrollments, reload }: {
  sessions: TrainingSession[]; trainings: Training[]; profiles: Profile[]
  enrollments: Enrollment[]; reload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [editSession, setEditSession] = useState<TrainingSession | null>(null)
  const [deleteSession, setDeleteSession] = useState<TrainingSession | null>(null)
  const [form, setForm] = useState({
    training_id: '', trainer_id: '', title: '', format: 'online',
    start_date: '', end_date: '', capacity: '20', location: '', visio_link: '', status: 'planifiee'
  })

  const filtered = sessions.filter(s => filter === 'all' || s.status === filter)
  const trainers = profiles.filter(p => ['formateur', 'super_admin', 'manager', 'chef_projet', 'responsable_formations'].includes(p.role))

  async function handleDelete() {
    if (!deleteSession) return
    await supabaseClient.from('training_sessions').delete().eq('id', deleteSession.id)
    setDeleteSession(null)
    reload()
  }

  function openEdit(s: TrainingSession) {
    setEditSession(s)
    setForm({
      training_id: s.training_id,
      trainer_id: s.trainer_id || '',
      title: s.title || '',
      format: s.format,
      start_date: s.start_date ? new Date(s.start_date).toISOString().slice(0, 16) : '',
      end_date: s.end_date ? new Date(s.end_date).toISOString().slice(0, 16) : '',
      capacity: String(s.capacity),
      location: s.location || '',
      visio_link: s.visio_link || '',
      status: s.status
    })
  }

  async function handleSave() {
    if (!form.training_id || !form.start_date || !form.end_date) return
    
    const payload = {
      training_id: form.training_id,
      trainer_id: form.trainer_id || null,
      title: form.title || null,
      format: form.format,
      start_date: form.start_date,
      end_date: form.end_date,
      capacity: parseInt(form.capacity) || 20,
      location: form.location || null,
      visio_link: form.visio_link || null,
      status: form.status
    }

    if (editSession) {
      await supabaseClient.from('training_sessions').update(payload).eq('id', editSession.id)
    } else {
      await supabaseClient.from('training_sessions').insert(payload)
    }

    setOpen(false)
    setEditSession(null)
    setForm({ training_id: '', trainer_id: '', title: '', format: 'online', start_date: '', end_date: '', capacity: '20', location: '', visio_link: '', status: 'planifiee' })
    reload()
  }

  async function handleStatusChange(s: TrainingSession, newStatus: string) {
    await supabaseClient.from('training_sessions').update({ status: newStatus }).eq('id', s.id)
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all', 'planifiee', 'en_cours', 'terminee', 'annulee'].map(s => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
              {s === 'all' ? 'Toutes' : statusLabel[s]}
            </Button>
          ))}
        </div>
        <Dialog open={open || !!editSession} onOpenChange={(v) => { if(!v) { setOpen(false); setEditSession(null); setForm({ training_id: '', trainer_id: '', title: '', format: 'online', start_date: '', end_date: '', capacity: '20', location: '', visio_link: '', status: 'planifiee' }) } else setOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto"><Plus className="w-4 h-4 mr-1" />Planifier session</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editSession ? 'Modifier la session' : 'Planifier une session'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div><Label>Formation *</Label>
                <Select value={form.training_id} onValueChange={v => setForm(p => ({ ...p, training_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
                  <SelectContent>{trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Intitulé session</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ex: Promo Janvier 2026" /></div>
              <div><Label>Formateur</Label>
                <Select value={form.trainer_id || 'none'} onValueChange={v => setForm(p => ({ ...p, trainer_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Assigner un formateur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {trainers.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Format</Label>
                <Select value={form.format} onValueChange={v => setForm(p => ({ ...p, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">En ligne</SelectItem>
                    <SelectItem value="presentiel">Présentiel</SelectItem>
                    <SelectItem value="hybride">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date début *</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>Date fin *</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacité</Label><Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
                <div><Label>Statut</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifiee">Planifiée</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="terminee">Terminée</SelectItem>
                      <SelectItem value="annulee">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Lieu / Salle</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>Lien visio</Label><Input value={form.visio_link} onChange={e => setForm(p => ({ ...p, visio_link: e.target.value }))} placeholder="https://meet.google.com/…" /></div>
                <Button className="w-full" onClick={handleSave}>{editSession ? 'Enregistrer les modifications' : 'Créer la session'}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteSession} onOpenChange={v => !v && setDeleteSession(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Supprimer la session ?</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">La session <strong>{deleteSession?.title || deleteSession?.trainings?.title}</strong> sera supprimée définitivement.</p>
              <div className="flex gap-2 mt-2">
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>Supprimer</Button>
                <Button variant="outline" className="flex-1" onClick={() => setDeleteSession(null)}>Annuler</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>


      <div className="space-y-3">
        {filtered.map(s => {
          const enrolled = enrollments.filter(e => e.session_id === s.id).length
          const pct = Math.round((enrolled / s.capacity) * 100)
          return (
            <Card key={s.id} className={s.status === 'annulee' ? 'opacity-60 grayscale' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{s.title || s.trainings?.title || 'Session'}</h3>
                      <Badge className={statusColor[s.status] || ''}>{statusLabel[s.status] || s.status}</Badge>
                      <Badge variant="outline" className="text-xs">{formatLabel[s.format] || s.format}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formation : {s.trainings?.title} · Formateur : {s.profiles?.full_name || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.start_date).toLocaleDateString('fr-FR')} → {new Date(s.end_date).toLocaleDateString('fr-FR')}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs text-muted-foreground mr-4">
                        <p className="font-medium text-foreground">{enrolled}/{s.capacity} inscrits</p>
                        <div className="w-24 mt-1"><Progress value={pct} className="h-1.5" /></div>
                      </div>
                      
                      {s.status !== 'annulee' && s.status !== 'terminee' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleStatusChange(s, 'annulee')}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Annuler
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(s)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteSession(s)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucune session trouvée</div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 4 : Formateurs ───────────────────────────────────────────────────────
function FormateursTab({ profiles, sessions, enrollments, feedbacks }: {
  profiles: Profile[]; sessions: TrainingSession[]; enrollments: Enrollment[]; feedbacks: Feedback[]
}) {
  const trainers = profiles.filter(p => ['formateur', 'super_admin', 'manager'].includes(p.role))

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {trainers.map(trainer => {
          const trainerSessions = sessions.filter(s => s.trainer_id === trainer.id)
          const trainerEnrollments = enrollments.filter(e =>
            trainerSessions.some(s => s.id === e.session_id)
          )
          const trainerFeedbacks = feedbacks.filter(f =>
            trainerSessions.some(s => s.id === f.session_id)
          )
          const avgSatisfaction = trainerFeedbacks.length
            ? (trainerFeedbacks.reduce((a, f) => a + (f.trainer_note || 0), 0) / trainerFeedbacks.length).toFixed(1)
            : null
          const successCount = trainerEnrollments.filter(e => e.status === 'termine').length
          const successRate = trainerEnrollments.length
            ? Math.round((successCount / trainerEnrollments.length) * 100)
            : 0

          return (
            <Card key={trainer.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center font-bold text-violet-600 text-sm">
                    {trainer.full_name?.charAt(0).toUpperCase()}
                  </div>
                    <div>
                      <p className="font-semibold text-sm">{trainer.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{roleLabels[trainer.role] || trainer.role}</p>
                    </div>

                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-lg font-bold">{trainerSessions.length}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-lg font-bold">{trainerEnrollments.length}</p>
                    <p className="text-xs text-muted-foreground">Apprenants</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-lg font-bold">{avgSatisfaction ? avgSatisfaction + '/5' : '—'}</p>
                    <p className="text-xs text-muted-foreground">Note</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taux réussite</span>
                    <span className="font-medium">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-1.5" />
                </div>
                {avgSatisfaction && (
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(parseFloat(avgSatisfaction)) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{avgSatisfaction}/5</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {trainers.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Aucun formateur dans le système</div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 5 : Apprenants ───────────────────────────────────────────────────────
function ApprenantsTab({ enrollments, sessions, trainings, registrations, profiles, interns, reload }: {
  enrollments: Enrollment[]; sessions: TrainingSession[]; trainings: Training[]
  registrations: Registration[]; profiles: Profile[]; interns: any[]; reload: () => void
}) {
  const [filterTraining, setFilterTraining] = useState('all')
  const [search, setSearch] = useState('')
  const [editEnroll, setEditEnroll] = useState<Enrollment | null>(null)
  const [deleteEnroll, setDeleteEnroll] = useState<Enrollment | null>(null)
  const [form, setForm] = useState({ status: '', attendance_rate: '', grade: '' })

  const [activeTab, setActiveTab] = useState<'actifs' | 'attente'>('actifs')
  
  // Apprenants avec profil mais pas encore d'inscription à une session spécifique
  const pendingActivation = registrations.filter(r => {
    const prof = profiles.find(p => p.email === r.student_email)
    if (!prof) return true
    // Vérifier si le profil est déjà inscrit à CETTE formation ou CETTE session spécifique
    const isEnrolled = enrollments.some(e => 
      e.student_id === prof.id && 
      (e.session_id === r.session_id || (e.training_sessions as any)?.training_id === r.training_id)
    )
    return !isEnrolled
  })

  const filteredEnrolled = enrollments.filter(e => {
    const matchTraining = filterTraining === 'all' ||
      sessions.find(s => s.id === e.session_id)?.training_id === filterTraining
    const matchSearch = !search || e.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchTraining && matchSearch
  })

  const filteredPending = pendingActivation.filter(r => {
    const matchTraining = filterTraining === 'all' || r.training_id === filterTraining
    const matchSearch = !search || r.student_name.toLowerCase().includes(search.toLowerCase())
    return matchTraining && matchSearch
  })

  const isAgencyIntern = (profileId: string) => interns.some(i => i.user_id === profileId)

  async function handleActivate(reg: Registration) {
    let studentId = profiles.find(p => p.email === reg.student_email)?.id
    
    if (!studentId) {
      const { data: newProf } = await supabaseClient.from('profiles').insert({
        full_name: reg.student_name,
        email: reg.student_email,
        role: 'stagiaire',
        status: 'active'
      }).select('id').single()
      if (newProf) studentId = newProf.id
    }

    if (studentId && reg.session_id) {
      // Vérifier si déjà inscrit pour éviter doublons
      const { data: existing } = await supabaseClient
        .from('session_enrollments')
        .select('id')
        .eq('session_id', reg.session_id)
        .eq('student_id', studentId)
        .single()
      
      if (!existing) {
        await supabaseClient.from('session_enrollments').insert({
          session_id: reg.session_id,
          student_id: studentId,
          status: 'inscrit'
        })
      }
      reload()
    } else if (studentId) {
      reload()
    }
  }

  function openEdit(e: Enrollment) {
    setEditEnroll(e)
    setForm({
      status: e.status,
      attendance_rate: String(e.attendance_rate || 0),
      grade: e.grade != null ? String(e.grade) : ''
    })
  }

  async function handleUpdate() {
    if (!editEnroll) return
    await supabaseClient.from('session_enrollments').update({
      status: form.status,
      attendance_rate: parseInt(form.attendance_rate) || 0,
      grade: form.grade ? parseFloat(form.grade) : null,
      updated_at: new Date().toISOString()
    }).eq('id', editEnroll.id)
    setEditEnroll(null)
    reload()
  }

  async function handleDelete() {
    if (!deleteEnroll) return
    await supabaseClient.from('session_enrollments').delete().eq('id', deleteEnroll.id)
    setDeleteEnroll(null)
    reload()
  }

  const enrollStatusColor: Record<string, string> = {
    inscrit: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-green-100 text-green-700',
    termine: 'bg-gray-100 text-gray-600',
    abandonne: 'bg-red-100 text-red-700',
  }
  const enrollStatusLabel: Record<string, string> = {
    inscrit: 'Inscrit', en_cours: 'En cours', termine: 'Terminé', abandonne: 'Abandonné'
  }

  return (
    <div className="space-y-4">
      {/* Edit Dialog */}
      <Dialog open={!!editEnroll} onOpenChange={v => !v && setEditEnroll(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Modifier l'apprenant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{editEnroll?.profiles?.full_name}</p>
            <div><Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inscrit">Inscrit</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="abandonne">Abandonné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Taux d'assiduité (%)</Label>
              <Input type="number" value={form.attendance_rate} onChange={e => setForm(p => ({ ...p, attendance_rate: e.target.value }))} />
            </div>
            <div><Label>Note / 20</Label>
              <Input type="number" step="0.5" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleUpdate}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteEnroll} onOpenChange={v => !v && setDeleteEnroll(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Retirer l'apprenant ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">L'apprenant <strong>{deleteEnroll?.profiles?.full_name}</strong> sera retiré de la session.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Retirer</Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteEnroll(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant={activeTab === 'actifs' ? 'default' : 'outline'} onClick={() => setActiveTab('actifs')}>
            Actifs ({filteredEnrolled.length})
          </Button>
          <Button size="sm" variant={activeTab === 'attente' ? 'default' : 'outline'} onClick={() => setActiveTab('attente')}>
            En attente d'activation ({filteredPending.length})
          </Button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un apprenant…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTraining} onValueChange={setFilterTraining}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Toutes les formations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les formations</SelectItem>
            {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Comment fonctionne la gestion des apprenants ?</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>En attente</strong> : Personnes inscrites via le formulaire mais n'ayant pas encore de profil actif ou d'enrôlement dans la session choisie.</li>
            <li><strong>Actifs</strong> : Apprenants ayant un profil et étant officiellement enrôlés dans une session de formation.</li>
            <li><strong>Note sur les Stagiaires</strong> : Si un membre de l'équipe (ou un stagiaire de l'agence) s'inscrit à une formation, il apparaîtra ici avec un badge <Badge variant="outline" className="text-[9px] h-4 border-blue-200 text-blue-600 bg-blue-50">Stagiaire Agence</Badge> pour les distinguer des clients externes.</li>
          </ul>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium text-muted-foreground">Apprenant</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Formation / Session</th>
                {activeTab === 'actifs' ? (
                  <>
                    <th className="p-3 text-left font-medium text-muted-foreground">Assiduité</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Note</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Statut</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Paiement</th>
                  </>
                )}
                <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'actifs' ? (
                filteredEnrolled.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium flex items-center gap-2">
                        {e.profiles?.full_name || '—'}
                        {e.student_id && isAgencyIntern(e.student_id) && (
                          <Badge variant="outline" className="text-[10px] font-normal border-blue-200 text-blue-600 bg-blue-50">Stagiaire Agence</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {e.training_sessions?.trainings?.title || '—'}<br />
                      <span>{e.training_sessions?.title || ''}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={e.attendance_rate || 0} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground">{e.attendance_rate || 0}%</span>
                      </div>
                    </td>
                    <td className="p-3">{e.grade != null ? e.grade + '/20' : '—'}</td>
                    <td className="p-3">
                      <Badge className={enrollStatusColor[e.status] || 'bg-gray-100 text-gray-600'}>
                        {enrollStatusLabel[e.status] || e.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(e)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteEnroll(e)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredPending.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium flex items-center gap-2">
                        {r.student_name}
                        {profiles.find(p => p.email === r.student_email)?.id && isAgencyIntern(profiles.find(p => p.email === r.student_email)!.id) && (
                          <Badge variant="outline" className="text-[10px] font-normal border-blue-200 text-blue-600 bg-blue-50">Stagiaire Agence</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {r.trainings?.title || '—'}<br />
                      <span>{r.training_sessions?.title || ''}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{r.student_email}</td>
                    <td className="p-3">
                      <Badge className={payStatusColor[r.payment_status] || ''}>{payStatusLabel[r.payment_status] || r.payment_status}</Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" onClick={() => handleActivate(r)} className="text-xs h-8">
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Activer
                      </Button>
                    </td>
                  </tr>
                ))
              )}
              {activeTab === 'actifs' && filteredEnrolled.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun apprenant actif trouvé</td></tr>
              )}
              {activeTab === 'attente' && filteredPending.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Aucune inscription en attente</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── TAB 6 : Certifications ────────────────────────────────────────────────────
type CertTemplate = 'classique' | 'moderne' | 'premium'
type CertPreview = { cert: Certification; studentName: string; trainingTitle: string } | null

const ISSUED_CERT_STATUSES = new Set(['delivre', 'delivered', 'issued'])
function isIssuedCertificate(status: string | null | undefined) {
  return ISSUED_CERT_STATUSES.has((status || '').toLowerCase())
}

function CertificateTemplatePreview({ studentName, trainingTitle, certNum, dateStr, template }: {
  studentName: string; trainingTitle: string; certNum: string; dateStr: string; template: CertTemplate
}) {
  if (template === 'classique') return (
    <div className="relative w-full aspect-[297/210] bg-white rounded border-4 border-blue-900 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      <div className="absolute inset-1.5 border border-blue-900 rounded pointer-events-none" />
      <p className="text-[8px] font-bold tracking-widest text-blue-900 uppercase mb-1">Popytech Academy</p>
      <div className="w-16 h-px bg-blue-900 mb-2" />
      <p className="text-xl font-bold text-blue-900 mb-1">Certificat de Réussite</p>
      <p className="text-[9px] text-slate-500 mb-1">Ce certificat est décerné à</p>
      <p className="text-base font-bold italic text-blue-900 mb-0.5">{studentName}</p>
      <div className="w-20 h-px bg-blue-900 mb-1.5" />
      <p className="text-[9px] text-slate-600 mb-0.5">pour avoir complété avec succès la formation</p>
      <p className="text-[10px] font-bold text-blue-900 text-center px-4">{trainingTitle}</p>
      <div className="mt-2 bg-blue-900 text-white text-[8px] font-bold px-3 py-0.5 rounded">✓ CERTIFIÉ</div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[7px] text-slate-400">
        <span>N° {certNum}</span><span>{dateStr}</span><span>contact@popytech.com</span>
      </div>
    </div>
  )
  if (template === 'moderne') return (
    <div className="relative w-full aspect-[297/210] bg-white rounded overflow-hidden flex select-none">
      <div className="w-[18%] bg-violet-600 flex items-end justify-center pb-3 shrink-0">
        <p className="text-white text-[7px] font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>POPYTECH ACADEMY</p>
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center">
        <p className="text-[8px] font-bold text-violet-600 tracking-widest uppercase mb-1">Certificat Officiel</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">Certificat<br/>de Réussite</p>
        <div className="w-12 h-1 bg-violet-600 my-2" />
        <p className="text-[9px] text-slate-400 mb-1">Ce certificat est décerné à</p>
        <p className="text-lg font-bold text-slate-700 mb-1">{studentName}</p>
        <p className="text-[9px] text-slate-500">pour avoir complété avec succès :</p>
        <p className="text-[10px] font-bold text-slate-700">{trainingTitle}</p>
        <div className="mt-auto pt-3 flex gap-8 border-t border-slate-200 text-[7px]">
          <div><p className="font-bold text-slate-700">{dateStr}</p><p className="text-slate-400">Date de délivrance</p></div>
          <div><p className="font-bold text-slate-700">{certNum}</p><p className="text-slate-400">N° certificat</p></div>
        </div>
      </div>
    </div>
  )
  return (
    <div className="relative w-full aspect-[297/210] bg-slate-900 rounded overflow-hidden flex flex-col items-center justify-center p-4 select-none">
      <div className="absolute top-3 left-3 text-[8px] font-bold text-violet-400 tracking-widest">POPYTECH ACADEMY</div>
      <div className="absolute top-3 right-3 text-[7px] text-slate-500">N° {certNum}</div>
      <div className="text-2xl text-yellow-400 mb-1">★</div>
      <p className="text-[8px] font-bold text-violet-400 tracking-widest uppercase mb-1">Certification Officielle</p>
      <p className="text-xl font-bold text-white mb-1">Excellence Award</p>
      <p className="text-[9px] text-slate-400 mb-1">Ce certificat premium est décerné à</p>
      <p className="text-base font-bold text-violet-300 mb-1">{studentName}</p>
      <p className="text-[9px] text-slate-400">pour avoir maîtrisé avec excellence</p>
      <p className="text-[9px] font-bold text-white text-center">{trainingTitle}</p>
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 flex justify-between px-4 py-1.5 text-[7px]">
        <span className="text-slate-400">{dateStr}</span>
        <span className="text-green-400 font-bold">Certifié ✓</span>
      </div>
    </div>
  )
}

function CertificationsTab({ certifications, trainings, profiles, enrollments, registrations, interns, reload }: {
  certifications: Certification[]; trainings: Training[]; profiles: Profile[]; 
  enrollments: Enrollment[]; registrations: Registration[]; interns: any[]; reload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editCert, setEditCert] = useState<Certification | null>(null)
  const [deleteCert, setDeleteCert] = useState<Certification | null>(null)
  const [form, setForm] = useState({ 
    student_id: '', 
    training_id: '', 
    status: 'delivre', 
    certificate_number: '',
    issued_at: new Date().toISOString().slice(0, 16)
  })
  const [certPreview, setCertPreview] = useState<CertPreview>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<CertTemplate>('moderne')
  const [previewTab, setPreviewTab] = useState<'avant' | 'apres'>('avant')
  const [certOverrides, setCertOverrides] = useState<CertificateOverrides>({})

  const isAgencyIntern = (profileId: string) => interns.some(i => i.user_id === profileId)

  function openEdit(c: Certification) {
    setEditCert(c)
    setForm({
      student_id: c.student_id,
      training_id: c.training_id,
      status: c.status,
      certificate_number: c.certificate_number || '',
      issued_at: c.issued_at ? new Date(c.issued_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    })
  }

  async function handleSave() {
    if (!form.student_id || !form.training_id) return
    const { data: { user } } = await supabaseClient.auth.getUser()
    
    let finalStudentId = form.student_id

    // Si c'est un inscrit sans profil, on crée le profil d'abord
    if (finalStudentId.startsWith('REG:')) {
      const regId = finalStudentId.replace('REG:', '')
      const reg = registrations.find(r => r.id === regId)
      if (reg) {
        const { data: newProf, error: profErr } = await supabaseClient.from('profiles').insert({
          full_name: reg.student_name,
          email: reg.student_email,
          role: 'stagiaire',
          status: 'active'
        }).select('id').single()
        
        if (profErr || !newProf) {
          console.error('Erreur creation profil:', profErr)
          return
        }
        finalStudentId = newProf.id
      }
    }

    const payload = {
      student_id: finalStudentId,
      training_id: form.training_id,
      status: form.status,
      certificate_number: form.certificate_number || ('CERT-' + Date.now().toString(36).toUpperCase()),
      issued_at: form.issued_at
    }

    if (editCert) {
      await supabaseClient.from('academy_certifications').update(payload).eq('id', editCert.id)
    } else {
      await supabaseClient.from('academy_certifications').insert({
        ...payload,
        issued_by: user?.id
      })
    }
    
    setOpen(false)
    setEditCert(null)
    setForm({ student_id: '', training_id: '', status: 'delivre', certificate_number: '', issued_at: new Date().toISOString().slice(0, 16) })
    reload()
  }

  async function handleDelete() {
    if (!deleteCert) return
    await supabaseClient.from('academy_certifications').delete().eq('id', deleteCert.id)
    setDeleteCert(null)
    reload()
  }

  async function handleIssue() {
    await handleSave()
  }

  function openPreview(cert: Certification) {
    const sName = cert.profiles?.full_name || 'Apprenant'
    const tTitle = cert.trainings?.title || 'Formation'
    setCertPreview({
      cert,
      studentName: sName,
      trainingTitle: tTitle
    })
    setSelectedTemplate('moderne')
    setPreviewTab('avant')
    // Pré-remplir les overrides avec les valeurs actuelles
    setCertOverrides({
      studentName:   sName,
      trainingTitle: tTitle,
      certNumber:    cert.certificate_number || '',
      issuedAt:      cert.issued_at,
      intro:         'Ce certificat est décerné à',
      middle:        'pour avoir complété avec succès la formation :',
      orgName:       'POPYTECH ACADEMY',
      contactEmail:  'contact@popytech.com',
      website:       'www.popytech.com',
    })
  }

  function handleDownload() {
    if (!certPreview) return
    downloadFormationCertificatePDF(certPreview.cert, certPreview.studentName, certPreview.trainingTitle, selectedTemplate, certOverrides)
  }

  const pending = certifications.filter(c => c.status === 'en_attente')
  const delivered = certifications.filter(c => isIssuedCertificate(c.status))

  const templateOptions: { id: CertTemplate; label: string; desc: string; icon: string }[] = [
    { id: 'classique', label: 'Classique', desc: 'Sobre, cadre bleu marine', icon: '📜' },
    { id: 'moderne', label: 'Moderne', desc: 'Violet & blanc élégant', icon: '🎨' },
    { id: 'premium', label: 'Premium', desc: 'Dark gold prestige', icon: '⭐' },
  ]

    // Filter profiles to show only relevant persons (trainees, or already certified/enrolled)
    const academyLearners = profiles.filter(p => 
      (p.role === 'stagiaire' || 
      certifications.some(c => c.student_id === p.id) ||
      enrollments.some(e => e.student_id === p.id)) &&
      !isAgencyIntern(p.id)
    )

    const agencyInterns = profiles.filter(p => isAgencyIntern(p.id))

    // People from registrations who don't have a profile yet
    const pendingApprenants = registrations.filter(r => 
      !profiles.some(p => p.email === r.student_email)
    )

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{delivered.length}</p>
              <p className="text-xs text-muted-foreground">Délivrés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{pending.length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </div>
          <Dialog open={open || !!editCert} onOpenChange={v => { if (!v) { setOpen(false); setEditCert(null); setForm({ student_id: '', training_id: '', status: 'delivre', certificate_number: '', issued_at: new Date().toISOString().slice(0, 16) }) } else setOpen(true) }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Délivrer certificat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editCert ? 'Modifier certificat' : 'Délivrer un certificat'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Apprenant *</Label>
                  <Select value={form.student_id || 'none'} onValueChange={v => setForm(p => ({ ...p, student_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un apprenant" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">— Sélectionner le bénéficiaire —</SelectItem>
                        
                        {academyLearners.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 uppercase tracking-wider border-y">🎓 Apprenants Academy</div>
                            {academyLearners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                          </>
                        )}

                        {pendingApprenants.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50/50 uppercase tracking-wider border-y">📝 Nouvelles Inscriptions (à valider)</div>
                            {pendingApprenants.map(r => (
                              <SelectItem key={r.id} value={`REG:${r.id}`}>{r.student_name} ({r.student_email})</SelectItem>
                            ))}
                          </>
                        )}

                        {agencyInterns.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-blue-500 bg-blue-50/30 uppercase tracking-wider border-y">🏢 Stagiaires de l'Agence</div>
                            {agencyInterns.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                            ))}
                          </>
                        )}

                        <div className="px-2 py-1.5 text-[10px] font-bold text-red-500 bg-red-50/30 uppercase tracking-wider border-y">⚠ Équipe Agence (Vérifier avant de choisir)</div>
                        {profiles.filter(p => !academyLearners.includes(p) && !agencyInterns.includes(p)).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-muted-foreground italic text-xs">
                            {p.full_name} ({roleLabels[p.role] || p.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                </div>
              <div><Label>Formation *</Label>
                <Select value={form.training_id || 'none'} onValueChange={v => setForm(p => ({ ...p, training_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Choisir —</SelectItem>
                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editCert && (
                <>
                  <div><Label>N° Certificat</Label><Input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} /></div>
                  <div><Label>Date de délivrance</Label><Input type="datetime-local" value={form.issued_at} onChange={e => setForm(p => ({ ...p, issued_at: e.target.value }))} /></div>
                  <div><Label>Statut</Label>
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="delivre">Délivré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={handleIssue}>{editCert ? 'Enregistrer' : 'Valider et délivrer'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!deleteCert} onOpenChange={v => !v && setDeleteCert(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le certificat ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Le certificat de <strong>{deleteCert?.profiles?.full_name}</strong> sera supprimé définitivement.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Supprimer</Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteCert(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal preview + téléchargement */}
      <Dialog open={!!certPreview} onOpenChange={o => { if (!o) setCertPreview(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0066FF]" />
              Certificat — {certPreview?.studentName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Onglets Avant / Après */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] w-fit">
              <button
                onClick={() => setPreviewTab('avant')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${previewTab === 'avant' ? 'bg-white dark:bg-[#0A0F1E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Aperçu original
              </button>
              <button
                onClick={() => setPreviewTab('apres')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${previewTab === 'apres' ? 'bg-[#0066FF] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ✏ Personnaliser
              </button>
            </div>

            {previewTab === 'avant' ? (
              <>
                {/* Sélecteur template */}
                <div className="grid grid-cols-3 gap-3">
                  {templateOptions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTemplate === t.id
                          ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/10'
                          : 'border-slate-200 dark:border-white/[0.08] hover:border-[#0066FF]/40'
                      }`}
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <p className="font-semibold text-sm">{t.label}</p>
                      <p className="text-xs text-slate-500">{t.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Aperçu visuel */}
                {certPreview && (
                  <div className="rounded-xl overflow-hidden border shadow-md">
                    <CertificateTemplatePreview
                      studentName={certPreview.studentName}
                      trainingTitle={certPreview.trainingTitle}
                      certNum={certPreview.cert.certificate_number || 'CERT-XXX'}
                      dateStr={new Date(certPreview.cert.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      template={selectedTemplate}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Champs modifiables */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom de l'apprenant</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.studentName || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, studentName: e.target.value }))}
                      placeholder={certPreview?.studentName}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre de la formation</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.trainingTitle || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, trainingTitle: e.target.value }))}
                      placeholder={certPreview?.trainingTitle}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">N° Certificat</Label>
                    <Input
                      className="mt-1.5 rounded-xl font-mono"
                      value={certOverrides.certNumber || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, certNumber: e.target.value }))}
                      placeholder={certPreview?.cert.certificate_number || 'CERT-XXX'}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date de délivrance</Label>
                    <Input
                      type="date"
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.issuedAt ? certOverrides.issuedAt.slice(0, 10) : ''}
                      onChange={e => setCertOverrides(o => ({ ...o, issuedAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom de l'organisation</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.orgName || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, orgName: e.target.value }))}
                      placeholder="POPYTECH ACADEMY"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email de contact</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.contactEmail || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, contactEmail: e.target.value }))}
                      placeholder="contact@popytech.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Texte d'intro</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.intro || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, intro: e.target.value }))}
                      placeholder="Ce certificat est décerné à"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Texte intermédiaire</Label>
                    <Input
                      className="mt-1.5 rounded-xl"
                      value={certOverrides.middle || ''}
                      onChange={e => setCertOverrides(o => ({ ...o, middle: e.target.value }))}
                      placeholder="pour avoir complété avec succès la formation :"
                    />
                  </div>
                </div>

                {/* Aperçu avec modifications */}
                {certPreview && (
                  <>
                    <p className="text-xs text-slate-500 font-medium">Aperçu avec vos modifications :</p>
                    <div className="rounded-xl overflow-hidden border-2 border-[#0066FF]/30 shadow-md">
                      <CertificateTemplatePreview
                        studentName={certOverrides.studentName || certPreview.studentName}
                        trainingTitle={certOverrides.trainingTitle || certPreview.trainingTitle}
                        certNum={certOverrides.certNumber || certPreview.cert.certificate_number || 'CERT-XXX'}
                        dateStr={certOverrides.issuedAt
                          ? new Date(certOverrides.issuedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : new Date(certPreview.cert.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                        }
                        template={selectedTemplate}
                      />
                    </div>
                    {/* Sélecteur template en bas aussi */}
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {templateOptions.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t.id)}
                          className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                            selectedTemplate === t.id
                              ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]'
                              : 'border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-[#0066FF]/30'
                          }`}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <Button
              className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl shadow-lg shadow-[#0066FF]/20"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF — {templateOptions.find(t => t.id === selectedTemplate)?.label}
              {previewTab === 'apres' && certOverrides.studentName && certOverrides.studentName !== certPreview?.studentName && (
                <span className="ml-2 text-[11px] opacity-80">(personnalisé)</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {certifications.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isIssuedCertificate(c.status) ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  <Award className={`w-4 h-4 ${isIssuedCertificate(c.status) ? 'text-emerald-600' : 'text-orange-500'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{c.profiles?.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{c.trainings?.title || '—'}</p>
                  {c.certificate_number && <p className="text-xs text-muted-foreground font-mono">{c.certificate_number}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge className={isIssuedCertificate(c.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                    {isIssuedCertificate(c.status) ? 'Délivré' : 'En attente'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(c.issued_at).toLocaleDateString('fr-FR')}</p>
                </div>
                  {isIssuedCertificate(c.status) && (
                    <Button size="sm" variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50"
                      onClick={() => openPreview(c)}>
                      <Download className="w-3 h-3 mr-1" />Certificat PDF
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteCert(c)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

        ))}
        {certifications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucun certificat délivré</div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 8 : Inscriptions ─────────────────────────────────────────────────────
const EMPTY_FORM = { training_id: '', session_id: '', student_name: '', student_email: '', student_phone: '', student_company: '', amount_due: '', notes: '' }

function InscriptionsTab({ registrations, trainings, sessions, payments, reload }: {
  registrations: Registration[]; trainings: Training[]; sessions: TrainingSession[]
  payments: Payment[]; reload: () => void
}) {
  const [openAdd, setOpenAdd] = useState(false)
  const [editReg, setEditReg] = useState<Registration | null>(null)
  const [deleteReg, setDeleteReg] = useState<Registration | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // quick-payment dialog
  const [payOpen, setPayOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<Registration | null>(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference: '' })

  const filtered = registrations.filter(r => {
    const matchSearch = !search ||
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.student_email.toLowerCase().includes(search.toLowerCase()) ||
      r.registration_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  function openEdit(r: Registration) {
    setEditReg(r)
    setForm({
      training_id: r.training_id,
      session_id: r.session_id || '',
      student_name: r.student_name,
      student_email: r.student_email,
      student_phone: r.student_phone || '',
      student_company: r.student_company || '',
      amount_due: String(r.amount_due),
      notes: r.notes || '',
    })
  }

  async function handleAdd() {
    if (!form.training_id || !form.student_name || !form.student_email) return
    const { data: { user } } = await supabaseClient.auth.getUser()
    const training = trainings.find(t => t.id === form.training_id)
    await supabaseClient.from('formation_registrations').insert({
      training_id: form.training_id,
      session_id: form.session_id || null,
      student_name: form.student_name,
      student_email: form.student_email,
      student_phone: form.student_phone || null,
      student_company: form.student_company || null,
      amount_due: parseFloat(form.amount_due) || training?.price || 0,
      amount_paid: 0,
      payment_status: 'pending',
      registration_status: 'confirmed',
      notes: form.notes || null,
      registered_by: user?.id
    })
    setOpenAdd(false)
    setForm({ ...EMPTY_FORM })
    reload()
  }

  async function handleUpdate() {
    if (!editReg) return
    const newDue = parseFloat(form.amount_due) || 0
    const newStatus = editReg.amount_paid >= newDue ? 'paid' : editReg.amount_paid > 0 ? 'partial' : 'pending'
    await supabaseClient.from('formation_registrations').update({
      training_id: form.training_id,
      session_id: form.session_id || null,
      student_name: form.student_name,
      student_email: form.student_email,
      student_phone: form.student_phone || null,
      student_company: form.student_company || null,
      amount_due: newDue,
      payment_status: newStatus,
      notes: form.notes || null,
      updated_at: new Date().toISOString()
    }).eq('id', editReg.id)
    setEditReg(null)
    setForm({ ...EMPTY_FORM })
    reload()
  }

  async function handleDelete() {
    if (!deleteReg) return
    await supabaseClient.from('formation_registrations').delete().eq('id', deleteReg.id)
    setDeleteReg(null)
    reload()
  }

  async function handleQuickPay() {
    if (!payTarget || !payForm.amount) return
    const { data: { user } } = await supabaseClient.auth.getUser()
    await supabaseClient.from('formation_payments').insert({
      registration_id: payTarget.id,
      training_id: payTarget.training_id,
      student_name: payTarget.student_name,
      amount: parseFloat(payForm.amount),
      payment_method: payForm.payment_method,
      reference: payForm.reference || null,
      collected_by: user?.id
    })
    const newPaid = (payTarget.amount_paid || 0) + parseFloat(payForm.amount)
    const newStatus = newPaid >= payTarget.amount_due ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
    await supabaseClient.from('formation_registrations').update({
      amount_paid: newPaid,
      payment_status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', payTarget.id)
    setPayOpen(false)
    setPayTarget(null)
    setPayForm({ amount: '', payment_method: 'cash', reference: '' })
    reload()
  }

  function printReceipt(r: Registration, p: Payment) {
    const training = trainings.find(t => t.id === r.training_id)
    downloadFormationReceiptPDF(p, training, {
      registration_number: r.registration_number,
      student_email: r.student_email,
      student_phone: r.student_phone,
      student_company: r.student_company,
      amount_due: r.amount_due,
      amount_paid: r.amount_paid,
    })
  }

  const payStatusColor: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700', partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700', refunded: 'bg-gray-100 text-gray-600',
  }
  const payStatusLabel: Record<string, string> = { pending: 'En attente', partial: 'Partiel', paid: 'Payé', refunded: 'Remboursé' }

  const totalPaid = registrations.reduce((a, r) => a + (r.amount_paid || 0), 0)
  const unpaid = registrations.filter(r => r.payment_status !== 'paid').length

  const formDialog = (isEdit: boolean) => (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{isEdit ? 'Modifier inscription' : 'Inscrire un apprenant'}</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div><Label>Formation *</Label>
          <Select value={form.training_id || 'none'} onValueChange={v => {
            const t = trainings.find(x => x.id === v)
            setForm(p => ({ ...p, training_id: v === 'none' ? '' : v, amount_due: isEdit ? p.amount_due : (t?.price?.toString() || '') }))
          }}>
            <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Choisir —</SelectItem>
              {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title} — {t.price?.toLocaleString('fr-FR')} GNF</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Session (optionnel)</Label>
          <Select value={form.session_id || 'none'} onValueChange={v => setForm(p => ({ ...p, session_id: v === 'none' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="Choisir une session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucune session —</SelectItem>
              {sessions.filter(s => !form.training_id || s.training_id === form.training_id).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title || s.trainings?.title} ({new Date(s.start_date).toLocaleDateString('fr-FR')})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom complet *</Label><Input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} /></div>
          <div><Label>Email *</Label><Input type="email" value={form.student_email} onChange={e => setForm(p => ({ ...p, student_email: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Téléphone</Label><Input value={form.student_phone} onChange={e => setForm(p => ({ ...p, student_phone: e.target.value }))} /></div>
          <div><Label>Entreprise</Label><Input value={form.student_company} onChange={e => setForm(p => ({ ...p, student_company: e.target.value }))} /></div>
        </div>
        <div><Label>Montant à payer (GNF) *</Label>
          <Input type="number" value={form.amount_due} onChange={e => setForm(p => ({ ...p, amount_due: e.target.value }))} />
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        <Button className="w-full" onClick={isEdit ? handleUpdate : handleAdd}>
          {isEdit ? 'Enregistrer les modifications' : "Confirmer l'inscription"}
        </Button>
      </div>
    </DialogContent>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Total inscriptions" value={registrations.length} icon={UserPlus} color="bg-violet-500" />
        <KpiCard title="Montant collecté" value={totalPaid.toLocaleString('fr-FR') + ' GNF'} icon={DollarSign} color="bg-emerald-500" />
        <KpiCard title="Impayés / Partiels" value={unpaid} icon={AlertTriangle} color="bg-orange-500" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher apprenant ou N° inscription…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'partial', 'paid'].map(s => (
            <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} onClick={() => setFilterStatus(s)}>
              {s === 'all' ? 'Tous' : payStatusLabel[s]}
            </Button>
          ))}
        </div>
          <Dialog open={openAdd} onOpenChange={v => { setOpenAdd(v); if (!v) setForm({ ...EMPTY_FORM }) }}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="w-4 h-4 mr-1" />Inscrire un apprenant</Button>
            </DialogTrigger>
            {formDialog(false)}
          </Dialog>
          <Button size="sm" variant="outline" onClick={() => downloadRegistrationsListPDF(filtered)}>
            <Download className="w-4 h-4 mr-1" />Exporter liste PDF
          </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editReg} onOpenChange={v => { if (!v) { setEditReg(null); setForm({ ...EMPTY_FORM }) } }}>
        {formDialog(true)}
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteReg} onOpenChange={v => { if (!v) setDeleteReg(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer l'inscription</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Confirmer la suppression de l'inscription de <strong>{deleteReg?.student_name}</strong> ? Cette action est irréversible.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Supprimer</Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteReg(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick payment dialog */}
      <Dialog open={payOpen} onOpenChange={v => { setPayOpen(v); if (!v) { setPayTarget(null); setPayForm({ amount: '', payment_method: 'cash', reference: '' }) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Encaisser un paiement</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Apprenant : <strong>{payTarget.student_name}</strong><br />
                Reste à payer : <strong className="text-orange-600">{(payTarget.amount_due - payTarget.amount_paid).toLocaleString('fr-FR')} GNF</strong>
              </p>
              <div><Label>Montant encaissé (GNF) *</Label>
                <Input type="number" value={payForm.amount}
                  placeholder={String(payTarget.amount_due - payTarget.amount_paid)}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div><Label>Mode de paiement</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="online">En ligne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Référence</Label>
                <Input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="Optionnel" />
              </div>
              <Button className="w-full" onClick={handleQuickPay}>Enregistrer le paiement</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium text-muted-foreground">N° Inscription</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Apprenant</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Formation</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Montant</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  // dernier paiement lié à cette inscription
                  const lastPayment = payments.filter(p => p.registration_id === r.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.registration_number}</td>
                      <td className="p-3">
                        <p className="font-medium flex items-center gap-1.5">
                          {r.student_name}
                          {(r as any)._source === 'academy' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-600">Gestion des inscrits</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.student_email}</p>
                        {r.student_phone && <p className="text-xs text-muted-foreground">{r.student_phone}</p>}
                        {r.student_company && <p className="text-xs text-muted-foreground italic">{r.student_company}</p>}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{r.trainings?.title || '—'}</td>
                      <td className="p-3">
                        <p className="font-medium text-xs">{r.amount_paid.toLocaleString('fr-FR')} / {r.amount_due.toLocaleString('fr-FR')} GNF</p>
                        <div className="w-20 mt-1"><Progress value={r.amount_due > 0 ? Math.round((r.amount_paid / r.amount_due) * 100) : 0} className="h-1.5" /></div>
                        {r.amount_due > r.amount_paid && <p className="text-xs text-orange-500 mt-0.5">Reste : {(r.amount_due - r.amount_paid).toLocaleString('fr-FR')} GNF</p>}
                      </td>
                      <td className="p-3">
                        <Badge className={payStatusColor[r.payment_status] || ''}>{payStatusLabel[r.payment_status] || r.payment_status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(r.registered_at).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3">
                        {(r as any)._source === 'academy' ? (
                          <span className="text-[11px] text-muted-foreground italic">Gérer dans Gestion des inscrits</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Encaisser */}
                            {r.payment_status !== 'paid' && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => { setPayTarget(r); setPayForm({ amount: String(r.amount_due - r.amount_paid), payment_method: 'cash', reference: '' }); setPayOpen(true) }}>
                                <CreditCard className="w-3 h-3 mr-1" />Encaisser
                              </Button>
                            )}
                            {/* Reçu */}
                            {lastPayment && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-violet-600 border-violet-300 hover:bg-violet-50"
                                onClick={() => printReceipt(r, lastPayment)}>
                                <Download className="w-3 h-3 mr-1" />Reçu
                              </Button>
                            )}
                            {/* Modifier */}
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2"
                              onClick={() => openEdit(r)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            {/* Supprimer */}
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteReg(r)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucune inscription trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── TAB 9 : Paiements ────────────────────────────────────────────────────────
function PaiementsTab({ payments, registrations, trainings, reload }: {
  payments: Payment[]; registrations: Registration[]; trainings: Training[]; reload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [form, setForm] = useState({
    registration_id: '', training_id: '', student_name: '',
    amount: '', payment_method: 'cash', reference: '', notes: ''
  })

  const filtered = payments.filter(p =>
    !search || p.student_name.toLowerCase().includes(search.toLowerCase()) ||
    p.receipt_number.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!form.student_name || !form.amount || !form.training_id) return
    const { data: { user } } = await supabaseClient.auth.getUser()

    await supabaseClient.from('formation_payments').insert({
      registration_id: form.registration_id || null,
      training_id: form.training_id,
      student_name: form.student_name,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      reference: form.reference || null,
      notes: form.notes || null,
      collected_by: user?.id
    })

    if (form.registration_id) {
      const reg = registrations.find(r => r.id === form.registration_id)
      if (reg) {
        const newPaid = (reg.amount_paid || 0) + parseFloat(form.amount)
        const newStatus = newPaid >= reg.amount_due ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
        await supabaseClient.from('formation_registrations').update({
          amount_paid: newPaid,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', form.registration_id)
      }
    }

    setOpen(false)
    setForm({ registration_id: '', training_id: '', student_name: '', amount: '', payment_method: 'cash', reference: '', notes: '' })
    reload()
  }

  async function handleDelete(p: Payment) {
    await supabaseClient.from('formation_payments').delete().eq('id', p.id)
    // Recalculer le montant payé sur l'inscription liée
    if (p.registration_id) {
      const allPay = payments.filter(x => x.id !== p.id && x.registration_id === p.registration_id)
      const newPaid = allPay.reduce((a, x) => a + x.amount, 0)
      const reg = registrations.find(r => r.id === p.registration_id)
      if (reg) {
        const newStatus = newPaid >= reg.amount_due ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
        await supabaseClient.from('formation_registrations').update({
          amount_paid: newPaid, payment_status: newStatus, updated_at: new Date().toISOString()
        }).eq('id', p.registration_id)
      }
    }
    setDeleteTarget(null)
    reload()
  }

  const methodLabel: Record<string, string> = {
    cash: 'Espèces', bank_transfer: 'Virement', card: 'Carte', cheque: 'Chèque', online: 'En ligne'
  }
  const methodColor: Record<string, string> = {
    cash: 'bg-emerald-100 text-emerald-700',
    bank_transfer: 'bg-blue-100 text-blue-700',
    card: 'bg-violet-100 text-violet-700',
    cheque: 'bg-amber-100 text-amber-700',
    online: 'bg-sky-100 text-sky-700',
  }

  const totalToday = payments
    .filter(p => new Date(p.payment_date).toDateString() === new Date().toDateString())
    .reduce((a, p) => a + p.amount, 0)
  const totalMonth = payments.reduce((a, p) => a + (p.amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* Confirm delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer cet encaissement ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Encaissement de <strong>{deleteTarget?.amount.toLocaleString('fr-FR')} GNF</strong> pour <strong>{deleteTarget?.student_name}</strong> sera supprimé définitivement et le solde de l'inscription sera recalculé.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="destructive" className="flex-1" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Supprimer
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Total paiements" value={payments.length} icon={Receipt} color="bg-emerald-500" />
        <KpiCard title="Encaissé aujourd'hui" value={totalToday.toLocaleString('fr-FR') + ' GNF'} icon={CreditCard} color="bg-blue-500" />
        <KpiCard title="Encaissé ce mois" value={totalMonth.toLocaleString('fr-FR') + ' GNF'} icon={DollarSign} color="bg-violet-500" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher paiement…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><CreditCard className="w-4 h-4 mr-1" />Encaisser paiement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Inscription liée (optionnel)</Label>
                <Select value={form.registration_id || 'none'} onValueChange={v => {
                  const reg = registrations.find(r => r.id === v)
                  setForm(p => ({
                    ...p,
                    registration_id: v === 'none' ? '' : v,
                    student_name: reg?.student_name || p.student_name,
                    training_id: reg?.training_id || p.training_id,
                    amount: reg ? String(reg.amount_due - reg.amount_paid) : p.amount
                  }))
                }}>
                  <SelectTrigger><SelectValue placeholder="Lier à une inscription" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sans inscription —</SelectItem>
                    {registrations.filter(r => r.payment_status !== 'paid').map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.student_name} — {r.trainings?.title} (reste {(r.amount_due - r.amount_paid).toLocaleString('fr-FR')} GNF)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Formation *</Label>
                <Select value={form.training_id || 'none'} onValueChange={v => setForm(p => ({ ...p, training_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Choisir —</SelectItem>
                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nom de l'apprenant *</Label>
                <Input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Montant (GNF) *</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div><Label>Mode de paiement</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                      <SelectItem value="card">Carte bancaire</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="online">En ligne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Référence / N° transaction</Label>
                <Input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div><Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleSave}>Enregistrer le paiement</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium text-muted-foreground">N° Reçu</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Apprenant</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Formation</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Montant</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Mode</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{p.receipt_number}</td>
                  <td className="p-3 font-medium">{p.student_name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{p.trainings?.title || '—'}</td>
                  <td className="p-3 font-bold text-emerald-600">{p.amount.toLocaleString('fr-FR')} GNF</td>
                  <td className="p-3">
                    <Badge className={methodColor[p.payment_method] || ''}>{methodLabel[p.payment_method] || p.payment_method}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                      onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun paiement enregistré</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── TAB 10 : Reçus ───────────────────────────────────────────────────────────
function RecusTab({ payments, trainings }: { payments: Payment[]; trainings: Training[] }) {
  const [search, setSearch] = useState('')

  const filtered = payments.filter(p =>
    !search || p.student_name.toLowerCase().includes(search.toLowerCase()) ||
    p.receipt_number.toLowerCase().includes(search.toLowerCase())
  )

  function downloadReceiptPDF(p: Payment) {
    const training = trainings.find(t => t.id === p.training_id)
    downloadFormationReceiptPDF(p, training)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher reçu ou apprenant…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} reçu{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const training = trainings.find(t => t.id === p.training_id)
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-violet-600" />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{p.receipt_number}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.student_name}</p>
                  <p className="text-xs text-muted-foreground">{training?.title || '—'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-emerald-600">{p.amount.toLocaleString('fr-FR')} GNF</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <Button size="sm" className="w-full" onClick={() => downloadReceiptPDF(p)}>
                  <Download className="w-3.5 h-3.5 mr-1" />Télécharger PDF
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Aucun reçu trouvé</div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 7 : Qualité & Feedbacks ──────────────────────────────────────────────
function QualiteTab({ feedbacks, sessions }: { feedbacks: Feedback[]; sessions: TrainingSession[] }) {
  const avgGlobal = feedbacks.length
    ? (feedbacks.reduce((a, f) => a + (f.satisfaction || 0), 0) / feedbacks.length).toFixed(1)
    : null
  const avgTrainer = feedbacks.length
    ? (feedbacks.reduce((a, f) => a + (f.trainer_note || 0), 0) / feedbacks.length).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-amber-500">{avgGlobal ? avgGlobal + '/5' : '—'}</p>
          <p className="text-sm text-muted-foreground mt-1">Satisfaction globale</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-violet-500">{avgTrainer ? avgTrainer + '/5' : '—'}</p>
          <p className="text-sm text-muted-foreground mt-1">Note formateurs</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-blue-500">{feedbacks.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Feedbacks reçus</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-emerald-500">
            {feedbacks.filter(f => f.satisfaction >= 4).length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Très satisfaits (4-5)</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {feedbacks.map(f => (
          <Card key={f.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{f.profiles?.full_name || 'Anonyme'}</p>
                  <p className="text-xs text-muted-foreground">{f.training_sessions?.trainings?.title || '—'}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    Formation : {f.satisfaction}/5
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-violet-400 fill-violet-400" />
                    Formateur : {f.trainer_note}/5
                  </span>
                </div>
              </div>
              {f.comment && <p className="text-sm text-muted-foreground italic">"{f.comment}"</p>}
              <p className="text-xs text-muted-foreground">{new Date(f.submitted_at).toLocaleDateString('fr-FR')}</p>
            </CardContent>
          </Card>
        ))}
        {feedbacks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucun feedback enregistré</div>
        )}
      </div>
    </div>
  )
}

// ─── MES PROJETS TAB ────────────────────────────────────────────────────────
function MesProjetsTab() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile?.id) return
      // Projets où l'utilisateur est membre OU créateur
      const { data: members } = await supabaseClient
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile.id)
      const memberIds = (members || []).map((m: any) => m.project_id)

      const { data: created } = await supabaseClient
        .from('projects')
        .select('id, title, description, status, progress, start_date, end_date, budget')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })

      const { data: member } = memberIds.length > 0
        ? await supabaseClient
            .from('projects')
            .select('id, title, description, status, progress, start_date, end_date, budget')
            .in('id', memberIds)
            .order('created_at', { ascending: false })
        : { data: [] }

      // Déduplique
      const all = [...(created || []), ...(member || [])]
      const seen = new Set<string>()
      setProjects(all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true }))
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const statusColor: Record<string, string> = {
    en_cours: 'bg-blue-100 text-blue-700',
    termine: 'bg-emerald-100 text-emerald-700',
    en_attente: 'bg-amber-100 text-amber-700',
    annule: 'bg-red-100 text-red-700',
  }
  const statusLabel: Record<string, string> = {
    en_cours: 'En cours',
    termine: 'Terminé',
    en_attente: 'En attente',
    annule: 'Annulé',
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-violet-500" /> Mes Projets ({projects.length})
        </h2>
        <a href="/dashboard/projects">
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" /> Voir tous les projets
          </Button>
        </a>
      </div>

      {projects.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun projet assigné pour le moment.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold line-clamp-2">{p.title}</CardTitle>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[p.status] || p.status}
                </span>
              </div>
              {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progression</span>
                  <span className="font-medium">{p.progress ?? 0}%</span>
                </div>
                <Progress value={p.progress ?? 0} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {p.start_date && <span>Début : {new Date(p.start_date).toLocaleDateString('fr-FR')}</span>}
                {p.end_date && <span>Fin : {new Date(p.end_date).toLocaleDateString('fr-FR')}</span>}
              </div>
              {p.budget && (
                <p className="text-xs font-medium text-emerald-600">{Number(p.budget).toLocaleString('fr-FR')} GNF</p>
              )}
              <a href="/dashboard/projects">
                <Button variant="ghost" size="sm" className="w-full text-violet-600 hover:text-violet-700 mt-1">
                  Ouvrir <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FormationsPage() {
  const [mounted, setMounted] = useState(false)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
const [registrations, setRegistrations] = useState<Registration[]>([])
const [payments, setPayments] = useState<Payment[]>([])
const [interns, setInterns] = useState<any[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => { setMounted(true) }, [])

async function loadData() {
setLoading(true)
const [t, s, p, e, c, f, reg, pay, int, acadEnroll] = await Promise.all([
supabaseClient.from('trainings').select('*').order('created_at', { ascending: false }),
supabaseClient.from('training_sessions').select('*, trainings(title), profiles(full_name)').order('start_date', { ascending: false }),
supabaseClient.from('profiles').select('id, full_name, role, email').order('full_name'),
supabaseClient.from('session_enrollments').select('*, profiles(full_name), training_sessions(title, training_id, trainings(title))').order('enrolled_at', { ascending: false }),
supabaseClient.from('academy_certifications').select('*, profiles!academy_certifications_student_id_fkey(full_name), trainings(title)').order('issued_at', { ascending: false }),
supabaseClient.from('training_feedback').select('*, profiles(full_name), training_sessions(title, trainings(title))').order('submitted_at', { ascending: false }),
supabaseClient.from('formation_registrations').select('*, trainings(title, price), training_sessions(title)').order('registered_at', { ascending: false }),
supabaseClient.from('formation_payments').select('*, trainings(title)').order('payment_date', { ascending: false }),
supabaseClient.from('interns').select('user_id'),
// Gestion des inscrits (academy/page.tsx) inscrit ses etudiants dans la
// table enrollments, separee de formation_registrations - on les recupere
// ici pour que les deux pages affichent les memes inscrits.
supabaseClient.from('enrollments').select('*, trainings(title, price)').order('enrolled_at', { ascending: false }),
])

setTrainings(t.data || [])
setSessions(s.data || [])
setProfiles(p.data || [])
setEnrollments(e.data || [])
setCertifications(c.data || [])
setFeedbacks(f.data || [])
const foreignEnrollments = (acadEnroll.data || []).map((en: any) => ({
  id: en.id,
  _source: 'academy' as const,
  training_id: en.training_id,
  session_id: null,
  student_name: en.full_name || en.student_name,
  student_email: en.student_email || '',
  student_phone: en.phone || null,
  student_company: null,
  registration_number: null,
  amount_due: en.price_gnf || en.trainings?.price || 0,
  amount_paid: en.amount_paid || 0,
  payment_status: (en.amount_paid || 0) >= (en.price_gnf || en.trainings?.price || 0) ? 'paid' : (en.amount_paid || 0) > 0 ? 'partial' : 'pending',
  registration_status: en.status === 'dropped' ? 'cancelled' : 'confirmed',
  notes: en.notes,
  registered_at: en.enrolled_at,
  created_at: en.enrolled_at,
  trainings: en.trainings,
  training_sessions: null,
}))
setRegistrations([...(reg.data || []), ...foreignEnrollments])
setPayments(pay.data || [])
setInterns(int.data || [])
setLoading(false)
}

  useEffect(() => { if (mounted) loadData() }, [mounted])

  if (!mounted) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-violet-500" />
            Responsable Formations
          </h1>
          <p className="text-muted-foreground text-sm">Pilotez votre Academy — formations, sessions, formateurs, qualité</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>Actualiser</Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Chargement…</div>
      ) : (
        <Tabs defaultValue="synthese">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="synthese">Synthèse</TabsTrigger>
            <TabsTrigger value="formations">Formations</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
            <TabsTrigger value="paiements">Paiements</TabsTrigger>
            <TabsTrigger value="recus">Reçus</TabsTrigger>
            <TabsTrigger value="formateurs">Formateurs</TabsTrigger>
            <TabsTrigger value="apprenants">Apprenants</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="qualite">Qualité</TabsTrigger>
            <TabsTrigger value="projets">Mes Projets</TabsTrigger>
          </TabsList>

            <TabsContent value="synthese" className="mt-6">
              <SyntheseTab sessions={sessions} enrollments={enrollments} certifications={certifications} feedbacks={feedbacks} trainings={trainings} payments={payments} registrations={registrations} />
            </TabsContent>
          <TabsContent value="formations" className="mt-6">
            <FormationsTab trainings={trainings} sessions={sessions} reload={loadData} />
          </TabsContent>
          <TabsContent value="sessions" className="mt-6">
            <SessionsTab sessions={sessions} trainings={trainings} profiles={profiles} enrollments={enrollments} reload={loadData} />
          </TabsContent>
            <TabsContent value="inscriptions" className="mt-6">
              <InscriptionsTab registrations={registrations} trainings={trainings} sessions={sessions} payments={payments} reload={loadData} />
          </TabsContent>
          <TabsContent value="paiements" className="mt-6">
            <PaiementsTab payments={payments} registrations={registrations} trainings={trainings} reload={loadData} />
          </TabsContent>
          <TabsContent value="recus" className="mt-6">
            <RecusTab payments={payments} trainings={trainings} />
          </TabsContent>
          <TabsContent value="formateurs" className="mt-6">
            <FormateursTab profiles={profiles} sessions={sessions} enrollments={enrollments} feedbacks={feedbacks} />
          </TabsContent>
            <TabsContent value="apprenants" className="mt-6">
              <ApprenantsTab 
                enrollments={enrollments} 
                sessions={sessions} 
                trainings={trainings} 
                registrations={registrations}
                profiles={profiles}
                interns={interns}
                reload={loadData} 
              />
            </TabsContent>
              <TabsContent value="certifications" className="mt-6">
                <CertificationsTab 
                  certifications={certifications} 
                  trainings={trainings} 
                  profiles={profiles} 
                  enrollments={enrollments}
                  registrations={registrations}
                  interns={interns}
                  reload={loadData} 
                />
              </TabsContent>
          <TabsContent value="qualite" className="mt-6">
            <QualiteTab feedbacks={feedbacks} sessions={sessions} />
          </TabsContent>
          <TabsContent value="projets" className="mt-6">
            <MesProjetsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
