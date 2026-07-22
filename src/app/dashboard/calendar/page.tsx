'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const EVENT_COLORS: Record<string, string> = {
  project: 'bg-blue-500',
  task: 'bg-violet-500',
  publication: 'bg-pink-500',
  rdv_client: 'bg-emerald-500',
  reunion_interne: 'bg-amber-500',
  autre: 'bg-muted-foreground',
}
const EVENT_LABELS: Record<string, string> = {
  project: 'Projet', task: 'Tâche', publication: 'Publication',
  rdv_client: 'RDV Client', reunion_interne: 'Réunion interne', autre: 'Autre',
}

const emptyForm = {
  title: '', description: '', type: 'rdv_client', client_id: '',
  start_at: '', end_at: '', location: '', status: 'planifie',
}

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAppt, setEditAppt] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: projects }, { data: tasks }, { data: pubs }, { data: appts }, { data: cls }] = await Promise.all([
      supabase.from('projects').select('id, title, end_date, status, clients(company_name)').not('end_date', 'is', null),
      supabase.from('tasks').select('id, title, deadline, status, priority, projects(title)').not('deadline', 'is', null),
      supabase.from('publications').select('id, title, scheduled_at, platform, status, clients(company_name)').not('scheduled_at', 'is', null),
      supabase.from('appointments').select('*, clients(company_name)').order('start_at'),
      supabase.from('clients').select('id, company_name').order('company_name'),
    ])
    const evts = [
      ...(projects || []).map(p => ({ ...p, kind: 'project', label: p.title, date: p.end_date })),
      ...(tasks || []).map(t => ({ ...t, kind: 'task', label: t.title, date: t.deadline })),
      ...(pubs || []).map(p => ({ ...p, kind: 'publication', label: p.title, date: p.scheduled_at?.split('T')[0] })),
      ...(appts || []).map(a => ({ ...a, kind: a.type, label: a.title, date: a.start_at?.split('T')[0] })),
    ]
    setEvents(evts)
    setAppointments(appts || [])
    setClients(cls || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const days: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function eventsOnDay(date: Date) {
    const iso = date.toISOString().split('T')[0]
    return events.filter(e => e.date === iso)
  }

  const upcoming = events
    .filter(e => { const d = new Date(e.date); const diff = d.getTime() - today.getTime(); return diff >= 0 && diff <= 14 * 86400000 })
    .sort((a, b) => a.date.localeCompare(b.date))

  function openCreate(day?: Date) {
    setEditAppt(null)
    const base = day ? day.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    setForm({ ...emptyForm, start_at: `${base}T09:00`, end_at: `${base}T10:00` })
    setDialogOpen(true)
  }

  function openEdit(appt: any) {
    setEditAppt(appt)
    setForm({
      title: appt.title,
      description: appt.description || '',
      type: appt.type,
      client_id: appt.client_id || '',
      start_at: appt.start_at ? new Date(appt.start_at).toISOString().slice(0, 16) : '',
      end_at: appt.end_at ? new Date(appt.end_at).toISOString().slice(0, 16) : '',
      location: appt.location || '',
      status: appt.status,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title || !form.start_at || !form.end_at) { toast.error('Titre et dates requis'); return }
    setSaving(true)
    const payload = { ...form, client_id: form.client_id || null }
    if (editAppt) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', editAppt.id)
      if (error) toast.error('Erreur'); else { toast.success('Mis à jour'); load(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('appointments').insert(payload)
      if (error) toast.error('Erreur'); else { toast.success('Rendez-vous créé'); load(); setDialogOpen(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    toast.success('Supprimé'); load()
  }

  const dayAppts = selectedDay
    ? appointments.filter(a => a.start_at?.split('T')[0] === selectedDay.toISOString().split('T')[0])
    : []

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground text-sm mt-1">Rendez-vous, deadlines et publications</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau rendez-vous
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold text-base">{MONTHS_FR[month]} {year}</h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS_FR.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="bg-muted/20 min-h-24 p-1" />
                  const dayEvts = eventsOnDay(day)
                  const isToday = day.getTime() === today.getTime()
                  const isPast = day < today
                  const isSelected = selectedDay?.getTime() === day.getTime()
                  return (
                    <div
                      key={i}
                      className={cn(
                        'bg-background min-h-24 p-1 cursor-pointer hover:bg-muted/30 transition-colors',
                        isPast && 'opacity-60',
                        isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                      )}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      onDoubleClick={() => openCreate(day)}
                    >
                      <div className={cn(
                        'text-xs font-medium mb-1 h-5 w-5 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      )}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvts.slice(0, 3).map(evt => (
                          <div
                            key={evt.id + evt.kind}
                            className={cn('text-[10px] truncate px-1 py-0.5 rounded text-white font-medium', EVENT_COLORS[evt.kind] || 'bg-primary')}
                            title={evt.label}
                          >
                            {evt.label}
                          </div>
                        ))}
                        {dayEvts.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{dayEvts.length - 3}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-3 mt-3 flex-wrap text-xs text-muted-foreground">
                {Object.entries(EVENT_LABELS).map(([k, label]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={cn('h-2.5 w-2.5 rounded-sm', EVENT_COLORS[k])} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Selected day detail */}
              {selectedDay && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">
                      {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => openCreate(selectedDay)}>
                      <Plus className="h-3 w-3" /> RDV
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {eventsOnDay(selectedDay).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Rien ce jour. Double-cliquez pour ajouter un RDV.</p>
                    ) : eventsOnDay(selectedDay).map(evt => (
                      <div key={evt.id + evt.kind} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', EVENT_COLORS[evt.kind])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{evt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{EVENT_LABELS[evt.kind]}</p>
                        </div>
                        {(evt.kind === 'rdv_client' || evt.kind === 'reunion_interne' || evt.kind === 'autre') && (
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(evt)} className="text-muted-foreground hover:text-foreground">
                              <Edit className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(evt.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Prochaines 14 jours</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : upcoming.length === 0 ? (
            <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Rien dans les 14 jours</p></CardContent></Card>
          ) : upcoming.map((evt, i) => {
            const d = new Date(evt.date)
            const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000)
            return (
              <Card key={`${evt.id}-${evt.kind}-${i}`} className={cn(
                daysLeft <= 2 ? 'border-red-200 dark:border-red-900' : daysLeft <= 5 ? 'border-amber-200 dark:border-amber-900' : ''
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{evt.label}</p>
                      {evt.clients?.company_name && <p className="text-[10px] text-muted-foreground">{evt.clients.company_name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: daysLeft <= 2 ? '#ef4444' : daysLeft <= 5 ? '#f59e0b' : '' }}>
                        J-{daysLeft}
                      </p>
                    </div>
                  </div>
                  <span className={cn('mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full text-white', EVENT_COLORS[evt.kind] || 'bg-primary')}>
                    {EVENT_LABELS[evt.kind] || evt.kind}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAppt ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input placeholder="Ex: Réunion kick-off client..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rdv_client">RDV Client</SelectItem>
                    <SelectItem value="reunion_interne">Réunion interne</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Début *</Label>
                <Input type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fin *</Label>
                <Input type="datetime-local" value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lieu / Lien</Label>
              <Input placeholder="Ex: Bureau principal, Google Meet..." value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifie">Planifié</SelectItem>
                  <SelectItem value="confirme">Confirmé</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Détails..." rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editAppt ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
