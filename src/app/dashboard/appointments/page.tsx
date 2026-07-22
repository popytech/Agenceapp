'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus, Pencil, Trash2, Search, CalendarDays, Clock,
  MapPin, Video, User, Building, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPES = [
  { value: 'meeting', label: 'Réunion', color: 'bg-blue-100 text-blue-700' },
  { value: 'call', label: 'Appel', color: 'bg-green-100 text-green-700' },
  { value: 'demo', label: 'Démo / Présentation', color: 'bg-purple-100 text-purple-700' },
  { value: 'formation', label: 'Formation', color: 'bg-orange-100 text-orange-700' },
  { value: 'livraison', label: 'Livraison projet', color: 'bg-teal-100 text-teal-700' },
  { value: 'autre', label: 'Autre', color: 'bg-muted text-muted-foreground' },
]

const STATUSES = [
  { value: 'planifie', label: 'Planifié', color: 'bg-blue-100 text-blue-700', icon: CalendarDays },
  { value: 'confirme', label: 'Confirmé', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  { value: 'termine', label: 'Terminé', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
  { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-700', icon: XCircle },
]

type Appointment = {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  start_at: string
  end_at: string | null
  location: string | null
  meeting_link: string | null
  client_id: string | null
  project_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
    client?: { company_name: string } | null
    project?: { title: string } | null
}

type Client = { id: string; company_name: string }
type Project = { id: string; title: string }

const EMPTY = {
  title: '',
  description: '',
  type: 'meeting',
  status: 'planifie',
  start_at: '',
  end_at: '',
  location: '',
  meeting_link: '',
  client_id: 'none',
  project_id: 'none',
  notes: '',
}

function getDateLabel(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Aujourd\'hui'
  if (isTomorrow(d)) return 'Demain'
  return format(d, 'EEEE d MMMM', { locale: fr })
}

export default function AppointmentsPage() {
  const { profile } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: appts }, { data: cls }, { data: projs }] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, client:clients(company_name), project:projects(title)')
          .order('start_at', { ascending: true }),
        supabase.from('clients').select('id, company_name').order('company_name'),
        supabase.from('projects').select('id, title').order('title'),
    ])
    setAppointments(appts || [])
    setClients(cls || [])
    setProjects(projs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openCreate() {
    setEditing(null)
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const startStr = now.toISOString().slice(0, 16)
    const endDate = new Date(now.getTime() + 60 * 60 * 1000)
    const endStr = endDate.toISOString().slice(0, 16)
    setForm({ ...EMPTY, start_at: startStr, end_at: endStr })
    setOpen(true)
  }

  function openEdit(a: Appointment) {
    setEditing(a)
    setForm({
      title: a.title,
      description: a.description || '',
      type: a.type,
      status: a.status,
      start_at: a.start_at.slice(0, 16),
      end_at: a.end_at?.slice(0, 16) || '',
      location: a.location || '',
      meeting_link: a.meeting_link || '',
      client_id: a.client_id || 'none',
      project_id: a.project_id || 'none',
      notes: a.notes || '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.title || !form.start_at) {
      toast.error('Remplissez le titre et la date/heure')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      status: form.status,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location: form.location || null,
      meeting_link: form.meeting_link || null,
      client_id: form.client_id === 'none' ? null : form.client_id,
      project_id: form.project_id === 'none' ? null : form.project_id,
      notes: form.notes || null,
      created_by: profile?.id || null,
    }
    if (editing) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur lors de la modification'); setSaving(false); return }
      toast.success('RDV modifié')
    } else {
      const { error } = await supabase.from('appointments').insert(payload)
      if (error) { toast.error('Erreur lors de la création'); setSaving(false); return }
      toast.success('RDV créé')
    }
    setSaving(false)
    setOpen(false)
    fetchAll()
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    toast.success('Statut mis à jour')
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce rendez-vous ?')) return
    await supabase.from('appointments').delete().eq('id', id)
    toast.success('RDV supprimé')
    fetchAll()
  }

  const now = new Date()
  const filtered = appointments.filter(a => {
                          const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.client as any)?.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchType = filterType === 'all' || a.type === filterType
    const matchView = view === 'all' || !isPast(parseISO(a.start_at)) || a.status === 'planifie' || a.status === 'confirme'
    return matchSearch && matchStatus && matchType && matchView
  })

  const upcoming = appointments.filter(a =>
    (a.status === 'planifie' || a.status === 'confirme') && !isPast(parseISO(a.start_at))
  )
  const todayCount = appointments.filter(a => isToday(parseISO(a.start_at))).length

  function getTypeInfo(v: string) { return TYPES.find(t => t.value === v) || TYPES[TYPES.length - 1] }
  function getStatusInfo(v: string) { return STATUSES.find(s => s.value === v) || STATUSES[0] }

  // Group by date
  const grouped: Record<string, Appointment[]> = {}
  filtered.forEach(a => {
    const key = a.start_at.slice(0, 10)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(a)
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Rendez-vous</h1>
          <p className="text-muted-foreground text-sm">Réunions, appels, démos, livraisons...</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau RDV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
            <p className="text-xl md:text-2xl font-bold">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">À venir</p>
            <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Confirmés</p>
            <p className="text-2xl font-bold text-green-600">{appointments.filter(a => a.status === 'confirme').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl md:text-2xl font-bold">{appointments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button variant={view === 'upcoming' ? 'default' : 'ghost'} size="sm" onClick={() => setView('upcoming')}>À venir</Button>
          <Button variant={view === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setView('all')}>Tous</Button>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Liste groupée par date */}
      {loading ? (
        <p className="text-center text-muted-foreground py-10">Chargement...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun rendez-vous trouvé</p>
        </div>
      ) : Object.entries(grouped).map(([date, appts]) => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm capitalize">{getDateLabel(date + 'T00:00:00')}</h3>
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">{appts.length} RDV</span>
          </div>
          <div className="space-y-2">
            {appts.map(a => {
              const typeInfo = getTypeInfo(a.type)
              const statusInfo = getStatusInfo(a.status)
                const isOverdue = isPast(parseISO(a.start_at)) && (a.status === 'planifie')
              return (
                <Card key={a.id} className={`transition-all hover:shadow-md ${isOverdue ? 'border-orange-300' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{a.title}</span>
                          <Badge className={`text-xs border-0 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                          <Badge className={`text-xs border-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          {isOverdue && <Badge className="text-xs border-0 bg-orange-100 text-orange-700">En attente</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(parseISO(a.start_at), 'HH:mm')}
                            {a.end_at && ` → ${format(parseISO(a.end_at), 'HH:mm')}`}
                          </span>
                          {a.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {a.location}
                            </span>
                          )}
                          {a.meeting_link && (
                            <a href={a.meeting_link} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Video className="h-3.5 w-3.5" /> Lien réunion
                            </a>
                          )}
                            {(a.client as any)?.company_name && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3.5 w-3.5" /> {(a.client as any).company_name}
                              </span>
                            )}
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {a.status !== 'termine' && a.status !== 'annule' && (
                            <>
                              {a.status !== 'confirme' && (
                                <Button variant="outline" size="sm" className="text-xs h-7 text-green-600 border-green-200"
                                  onClick={() => handleStatusChange(a.id, 'confirme')}>
                                  Confirmer
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-xs h-7"
                                onClick={() => handleStatusChange(a.id, 'termine')}>
                                Terminé
                              </Button>
                            </>
                          )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le RDV' : 'Nouveau rendez-vous'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input placeholder="Ex: Réunion de suivi projet" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Début *</Label>
                <Input type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fin</Label>
                <Input type="datetime-local" value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lieu</Label>
                <Input placeholder="Adresse, bureau..." value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Lien réunion</Label>
                <Input placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">Aucun client</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Projet</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">Aucun projet</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description / Notes</Label>
              <Textarea placeholder="Ordre du jour, notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
