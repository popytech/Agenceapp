'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import { format, differenceInBusinessDays, parseISO } from 'date-fns'
import {
  Plus, Search, CalendarOff, CheckCircle2, XCircle, Clock,
  Users, Palmtree, Stethoscope, Baby, AlertTriangle, Pencil, Trash2, Copy, Database
} from 'lucide-react'

const LEAVE_TYPES = [
  { value: 'conge_paye', label: 'Congé payé', icon: Palmtree, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'maladie', label: 'Arrêt maladie', icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'maternite', label: 'Maternité/Paternité', icon: Baby, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'sans_solde', label: 'Sans solde', icon: CalendarOff, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'formation', label: 'Formation', icon: Users, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'exceptionnel', label: 'Exceptionnel', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200' },
]

const STATUS = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approuvé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700 border-red-200' },
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', ceo: 'CEO', chef_projet: 'Chef de Projet',
  designer: 'Designer', developpeur: 'Développeur', marketeur: 'Marketeur',
  cm: 'Community Manager', vidéaste: 'Vidéaste', monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur', responsable_formations: 'Resp. Formations',
  assistante_direction: 'Assistante Direction', stagiaire: 'Stagiaire',
  creatrice_contenu: 'Créatrice Contenu', commercial_digital: 'Commercial Digital',
}

const EMPTY: {
  employee_name: string; role: string; leave_type: string;
  start_date: string; end_date: string; reason: string;
  status: 'pending' | 'approved' | 'rejected'
} = {
  employee_name: '', role: '', leave_type: 'conge_paye',
  start_date: '', end_date: '', reason: '', status: 'pending',
}

type Leave = {
  id: string
  employee_name: string
  role: string | null
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  days: number
  notes: string | null
  created_by: string | null
  created_at: string
}

const LEAVES_FALLBACK_KEY = 'erp_leaves_fallback'

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  try {
    const s = parseISO(start), e = parseISO(end)
    return Math.max(1, differenceInBusinessDays(e, s) + 1)
  } catch { return 0 }
}

function normalizeLeave(value: any): Leave | null {
  if (!value || !value.id) return null
  return {
    id: String(value.id),
    employee_name: String(value.employee_name || ''),
    role: value.role || null,
    leave_type: String(value.leave_type || 'conge_paye'),
    start_date: String(value.start_date || ''),
    end_date: String(value.end_date || ''),
    reason: value.reason || null,
    status: (value.status || 'pending') as 'pending' | 'approved' | 'rejected',
    days: Number(value.days || calcDays(value.start_date || '', value.end_date || '')),
    notes: value.notes || null,
    created_by: value.created_by || null,
    created_at: String(value.created_at || new Date().toISOString()),
  }
}

async function loadFallbackLeaves() {
  const { data } = await supabase.from('settings').select('value').eq('key', LEAVES_FALLBACK_KEY).maybeSingle()
  const raw = Array.isArray(data?.value) ? data.value : []
  return raw.map(normalizeLeave).filter(Boolean) as Leave[]
}

async function saveFallbackLeaves(leaves: Leave[]) {
  return supabase.from('settings').upsert({
    key: LEAVES_FALLBACK_KEY,
    value: leaves,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
}

export default function CongesPage() {
  const { profile } = useAuth()
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Leave | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const isAdmin = ['super_admin', 'ceo', 'chef_projet', 'assistante_direction'].includes(profile?.role || '')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: lv, error: lvErr }, { data: pr }] = await Promise.all([
      supabase.from('leaves').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,role').neq('role', 'client').order('full_name'),
    ])
    const missing = lvErr?.message?.includes('schema cache') || lvErr?.message?.includes('relation') || lvErr?.code === '42P01' || lvErr?.code === 'PGRST205'
    setTableError(Boolean(missing))
    setLeaves(missing ? await loadFallbackLeaves() : (lv || []))
    setTeam(pr || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = leaves.filter(l => {
    const ms = l.employee_name.toLowerCase().includes(search.toLowerCase())
    const mst = filterStatus === 'all' || l.status === filterStatus
    const mt = filterType === 'all' || l.leave_type === filterType
    return ms && mst && mt
  })

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    days: leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0),
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true) }
  function openEdit(l: Leave) {
    setEditing(l)
    setForm({
      employee_name: l.employee_name,
      role: l.role || '',
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      reason: l.reason || '',
      status: l.status,
    })
    setOpen(true)
  }
  function pickMember(id: string) {
    const member = team.find(t => t.id === id)
    if (member) setForm(f => ({ ...f, employee_name: member.full_name, role: member.role || '' }))
  }

  async function handleSave() {
    if (!form.employee_name || !form.start_date || !form.end_date) {
      toast.error('Nom, date début et fin requis')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      days: calcDays(form.start_date, form.end_date),
      role: form.role || null,
      reason: form.reason || null,
      notes: null,
      created_by: profile?.id || null,
    }

    let error: any = null
    if (tableError) {
      const current = await loadFallbackLeaves()
      const next = editing
        ? current.map(item => item.id === editing.id ? normalizeLeave({ ...item, ...payload })! : item)
        : [normalizeLeave({ ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() })!, ...current]
      const result = await saveFallbackLeaves(next)
      error = result.error
    } else {
      const result = editing
        ? await supabase.from('leaves').update(payload).eq('id', editing.id)
        : await supabase.from('leaves').insert(payload)
      error = result.error
    }

    setSaving(false)
    if (error) return toast.error(getErrorMessage(error, 'Enregistrement impossible'))
    toast.success(editing ? 'Demande mise à jour' : 'Demande créée')
    setOpen(false)
    setForm(EMPTY)
    setEditing(null)
    fetchAll()
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    let error: any = null
    if (tableError) {
      const current = await loadFallbackLeaves()
      const result = await saveFallbackLeaves(current.map(item => item.id === id ? { ...item, status } : item))
      error = result.error
    } else {
      const result = await supabase.from('leaves').update({ status }).eq('id', id)
      error = result.error
    }
    if (error) return toast.error('Mise à jour impossible')
    toast.success(status === 'approved' ? 'Demande approuvée' : 'Demande refusée')
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette demande ?')) return
    let error: any = null
    if (tableError) {
      const current = await loadFallbackLeaves()
      const result = await saveFallbackLeaves(current.filter(item => item.id !== id))
      error = result.error
    } else {
      const result = await supabase.from('leaves').delete().eq('id', id)
      error = result.error
    }
    if (error) return toast.error('Suppression impossible')
    toast.success('Demande supprimée')
    fetchAll()
  }


  async function migrateToRealTable() {
    const current = await loadFallbackLeaves()
    if (current.length === 0) return toast.info('Aucune donnée à migrer')
    const { error } = await supabase.from('leaves').insert(current.map(({ id, ...rest }) => rest))
    if (error) return toast.error('Migration impossible: ' + error.message)
    await supabase.from('settings').delete().eq('key', LEAVES_FALLBACK_KEY)
    toast.success('Migration terminée')
    fetchAll()
  }
  const days = form.start_date && form.end_date ? calcDays(form.start_date, form.end_date) : 0

  const SQL_LEAVES = `create table if not exists public.leaves (\n  id uuid primary key default gen_random_uuid(),\n  employee_name text not null, role text,\n  leave_type text not null default 'conge_paye',\n  start_date date not null, end_date date not null,\n  days numeric(5,1), reason text,\n  status text not null default 'pending',\n  created_by uuid, created_at timestamptz default now()\n);\nalter table public.leaves enable row level security;\ncreate policy "leaves_all" on public.leaves using (true) with check (auth.uid() is not null);`

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {tableError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Table Supabase manquante</p>
              <p className="text-sm text-amber-700 mt-0.5">La table <code className="bg-amber-100 px-1 rounded">leaves</code> n'existe pas encore. La page fonctionne quand même grâce à un stockage de secours. Pour une vraie table métier, exécutez le SQL ci-dessous dans <strong>Supabase → SQL Editor</strong>.</p>
            </div>
          </div>
          <div className="relative">
            <pre className="bg-amber-100 text-amber-900 text-xs rounded p-3 overflow-x-auto font-mono">{SQL_LEAVES}</pre>
                        <button className="absolute top-2 right-24 bg-emerald-200 hover:bg-emerald-300 text-emerald-800 text-xs px-2 py-1 rounded" onClick={migrateToRealTable}>Migrer</button>
            <button
              className="absolute top-2 right-2 bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs px-2 py-1 rounded flex items-center gap-1"
              onClick={() => { navigator.clipboard.writeText(SQL_LEAVES); toast.success('SQL copié !') }}
            >
              <Copy className="h-3 w-3" /> Copier
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarOff className="h-6 w-6 text-primary" /> Congés & Absences</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion des demandes de congés et absences de l'équipe</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nouvelle demande</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Demandes totales', value: stats.total, icon: Users, color: 'text-foreground' },
          { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Approuvées', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Jours approuvés', value: stats.days, icon: CalendarOff, color: 'text-blue-600' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Icon className={`h-5 w-5 ${item.color}`} /></div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <CardTitle className="text-base">Demandes</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 w-full sm:w-64" placeholder="Rechercher un employé..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Refusés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="text-center">Jours</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune demande trouvée</TableCell></TableRow>
              ) : filtered.map(l => {
                const lt = LEAVE_TYPES.find(t => t.value === l.leave_type)
                const st = STATUS[l.status]
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{l.employee_name}</div>
                      {l.role && <div className="text-xs text-muted-foreground">{ROLE_LABELS[l.role] || l.role}</div>}
                    </TableCell>
                    <TableCell><Badge className={`text-xs border ${lt?.color || ''}`}>{lt?.label || l.leave_type}</Badge></TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{format(parseISO(l.start_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{format(parseISO(l.end_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center font-bold">{l.days || calcDays(l.start_date, l.end_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{l.reason || '—'}</TableCell>
                    <TableCell><Badge className={`text-xs border ${st.color}`}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {isAdmin && l.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => updateStatus(l.id, 'approved')}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateStatus(l.id, 'rejected')}><XCircle className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Modifier la demande' : 'Nouvelle demande de congé'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editing && team.length > 0 && (
              <div className="space-y-1.5">
                <Label>Choisir dans l'équipe</Label>
                <Select onValueChange={pickMember}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un membre..." /></SelectTrigger>
                  <SelectContent>{team.filter(t => t.role !== 'client').map(t => <SelectItem key={t.id} value={t.id}>{t.full_name} — {ROLE_LABELS[t.role] || t.role}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nom de l'employé *</Label>
                <Input value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type de congé *</Label>
                <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de début *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Motif</Label>
                <Textarea rows={2} placeholder="Raison de l'absence..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            {days > 0 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">Durée calculée (jours ouvrés)</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300">{days} jour{days > 1 ? 's' : ''}</span>
              </div>
            )}
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
