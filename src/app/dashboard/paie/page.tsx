'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { formatGNF } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Plus, Search, Users, CheckCircle2, Clock, Pencil, Trash2,
  TrendingUp, Banknote, Download
} from 'lucide-react'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { downloadPayslipPDF } from '@/lib/pdf'

// ─── Types ───────────────────────────────────────────────────────────────────
// On stocke la paie dans la table `expenses` avec category='salaire'
// + on utilise le champ `description` comme JSON encodé pour stocker les extras
type PayEntry = {
  id: string
  title: string          // Nom employé
  description: string | null  // JSON: { role, bonuses, deductions, status, payment_method, period }
  amount: number         // Salaire de base
  category: string       // 'salaire'
  expense_date: string   // Date de paiement
  paid_to: string | null // Nom de l'employé (redondant pour affichage)
  notes: string | null
  created_at: string
  // Champs parsés depuis description
  _role?: string
  _bonuses?: number
  _deductions?: number
  _status?: 'pending' | 'paid' | 'cancelled'
  _payment_method?: string
  _period?: string
}

type TeamMember = { id: string; full_name: string; role: string }

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'cheque', label: 'Chèque' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', ceo: 'CEO', chef_projet: 'Chef de Projet',
  designer: 'Designer', developpeur: 'Développeur', marketeur: 'Marketeur',
  cm: 'Community Manager', vidéaste: 'Vidéaste', monteur_video: 'Monteur Vidéo',
  formateur: 'Formateur', responsable_formations: 'Resp. Formations',
  assistante_direction: 'Assistante Direction', stagiaire: 'Stagiaire',
  creatrice_contenu: 'Créatrice Contenu', commercial_digital: 'Commercial Digital',
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const year = new Date().getFullYear()
  const d = new Date(year, i, 1)
  return {
    value: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: format(d, 'MMMM yyyy', { locale: fr })
  }
})

const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

const EMPTY_FORM = {
  employee_name: '',
  role: '',
  period: currentPeriod,
  salary_base: 0,
  bonuses: 0,
  deductions: 0,
  status: 'pending' as 'pending' | 'paid' | 'cancelled',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'virement',
  notes: '',
}

function parseEntry(e: any): PayEntry {
  let extra: any = {}
  try { extra = JSON.parse(e.description || '{}') } catch { /* ignore */ }
  return {
    ...e,
    _role: extra.role || '',
    _bonuses: Number(extra.bonuses) || 0,
    _deductions: Number(extra.deductions) || 0,
    _status: extra.status || 'paid',
    _payment_method: extra.payment_method || 'virement',
    _period: extra.period || e.expense_date?.slice(0, 7) || currentPeriod,
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PaiePage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<PayEntry[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PayEntry | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: exps }, { data: profiles }] = await Promise.all([
      supabase.from('expenses').select('*').eq('category', 'salaire').order('expense_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').neq('role', 'client').order('full_name'),
    ])
    setEntries((exps || []).map(parseEntry))
    setTeam(profiles || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtres & Stats ──
  const periods = [...new Set(entries.map(e => e._period!))].filter(Boolean).sort().reverse()

  const filtered = entries.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.paid_to || '').toLowerCase().includes(search.toLowerCase())
    const matchPeriod = filterPeriod === 'all' || e._period === filterPeriod
    const matchStatus = filterStatus === 'all' || e._status === filterStatus
    return matchSearch && matchPeriod && matchStatus
  })

  const net = (e: PayEntry) => e.amount + (e._bonuses || 0) - (e._deductions || 0)

  const totalMasse = filtered.reduce((s, e) => s + net(e), 0)
  const totalPaid = filtered.filter(e => e._status === 'paid').reduce((s, e) => s + net(e), 0)
  const totalPending = filtered.filter(e => e._status === 'pending').reduce((s, e) => s + net(e), 0)

  // ── Actions ──
  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }

  function openEdit(e: PayEntry) {
    setEditing(e)
    setForm({
      employee_name: e.title,
      role: e._role || '',
      period: e._period || currentPeriod,
      salary_base: e.amount,
      bonuses: e._bonuses || 0,
      deductions: e._deductions || 0,
      status: e._status || 'paid',
      payment_date: e.expense_date,
      payment_method: e._payment_method || 'virement',
      notes: e.notes || '',
    })
    setOpen(true)
  }

  function pickTeamMember(id: string) {
    const m = team.find(t => t.id === id)
    if (m) setForm(f => ({ ...f, employee_name: m.full_name, role: m.role || '' }))
  }

  async function handleSave() {
    if (!form.employee_name || !form.period || form.salary_base <= 0) {
      toast.error('Nom, période et salaire de base requis')
      return
    }
    setSaving(true)

    const description = JSON.stringify({
      role: form.role,
      bonuses: form.bonuses,
      deductions: form.deductions,
      status: form.status,
      payment_method: form.payment_method,
      period: form.period,
    })

    const payload: Record<string, any> = {
      title: form.employee_name,
      description,
      amount: form.salary_base,
      category: 'salaire',
      expense_date: form.payment_date || form.period + '-01',
      paid_to: form.employee_name,
      paid_by: profile?.id || null,
      notes: form.notes || null,
      created_by: profile?.id || null,
    }

    if (editing) {
      const safePayload = { ...payload }
      const { error } = await supabase.from('expenses').update(safePayload).eq('id', editing.id)
      if (error) { toast.error(getErrorMessage(error, 'Opération impossible')); setSaving(false); return }
      toast.success('Fiche de paie modifiée')
    } else {
      const insertPayload = { ...payload }
      const { error } = await supabase.from('expenses').insert(insertPayload)
      if (error) { toast.error(getErrorMessage(error, 'Opération impossible')); setSaving(false); return }
      toast.success('Fiche de paie créée')
    }
    setSaving(false)
    setOpen(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette fiche de paie ?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error(getErrorMessage(error, 'Suppression impossible')); return }
    toast.success('Fiche supprimée')
    fetchAll()
  }

  async function markPaid(e: PayEntry) {
    const extra = {
      role: e._role,
      bonuses: e._bonuses,
      deductions: e._deductions,
      status: 'paid',
      payment_method: e._payment_method,
      period: e._period,
    }
    const { error } = await supabase.from('expenses').update({
      description: JSON.stringify(extra),
      expense_date: new Date().toISOString().split('T')[0],
      paid_to: e.paid_to || e.title,
    }).eq('id', e.id)
    if (error) {
      toast.error(getErrorMessage(error, 'Opération impossible'))
      return
    }
    toast.success(`${e.title} marqué comme payé ✓`)
    fetchAll()
  }

  const formNet = form.salary_base + form.bonuses - form.deductions

  const statusConfig = {
    paid:      { label: 'Payé',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    pending:   { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    cancelled: { label: 'Annulé',     color: 'bg-red-100 text-red-700 border-red-200' },
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" /> Gestion de la Paie
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Salaires, primes et fiches de paie de l'équipe</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle fiche de paie
        </Button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Masse salariale</p>
            <p className="text-xl font-bold mt-1">{formatGNF(totalMasse)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} fiche{filtered.length > 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Total payé</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatGNF(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.filter(e => e._status === 'paid').length} employé(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> En attente</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatGNF(totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.filter(e => e._status === 'pending').length} en attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Équipe</p>
            <p className="text-xl font-bold mt-1">{team.filter(t => !['client', 'stagiaire'].includes(t.role)).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">membres actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un employé..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les périodes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            {periods.map(p => (
              <SelectItem key={p} value={p}>
                {format(new Date(p + '-01'), 'MMMM yyyy', { locale: fr })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Salaire base</TableHead>
                <TableHead className="text-right">Primes</TableHead>
                <TableHead className="text-right">Déductions</TableHead>
                <TableHead className="text-right font-semibold">Net à payer</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date paiement</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Banknote className="h-10 w-10 opacity-20" />
                      <p className="font-medium">Aucune fiche de paie</p>
                      <p className="text-xs">Cliquez sur "Nouvelle fiche de paie" pour commencer</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(e => {
                const netVal = net(e)
                const st = statusConfig[e._status || 'paid']
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.title}</div>
                      {e._role && (
                        <div className="text-xs text-muted-foreground">
                          {ROLE_LABELS[e._role] || e._role}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {e._period ? format(new Date(e._period + '-01'), 'MMMM yyyy', { locale: fr }) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatGNF(e.amount)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">
                      {(e._bonuses || 0) > 0 ? `+${formatGNF(e._bonuses!)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600">
                      {(e._deductions || 0) > 0 ? `-${formatGNF(e._deductions!)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatGNF(netVal)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {e.expense_date ? format(new Date(e.expense_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {e._status === 'pending' && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Marquer comme payé"
                            onClick={() => markPaid(e)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Télécharger le bulletin de paie"
                          onClick={() => {
                            try {
                              downloadPayslipPDF({
                                employee_name: e.title,
                                role: e._role,
                                period: e._period || currentPeriod,
                                salary_base: e.amount,
                                bonuses: e._bonuses || 0,
                                deductions: e._deductions || 0,
                                payment_date: e.expense_date,
                                payment_method: e._payment_method,
                                notes: e.notes,
                                status: e._status,
                              })
                            } catch (err: any) {
                              toast.error('Erreur PDF: ' + (err?.message || 'inconnue'))
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier la fiche de paie' : 'Nouvelle fiche de paie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sélection rapide équipe */}
            {!editing && team.length > 0 && (
              <div className="space-y-1.5">
                <Label>Choisir dans l'équipe</Label>
                <Select onValueChange={pickTeamMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un membre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {team.filter(t => !['client'].includes(t.role)).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} — {ROLE_LABELS[t.role] || t.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nom de l'employé *</Label>
                <Input
                  placeholder="Ex: Mamadou Diallo"
                  value={form.employee_name}
                  onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Poste</Label>
                <Input
                  placeholder="Ex: Designer"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Période *</Label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Salaire de base (GNF) *</Label>
                <Input
                  type="number" min={0}
                  placeholder="0"
                  value={form.salary_base || ''}
                  onChange={e => setForm(f => ({ ...f, salary_base: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Primes / Bonus (GNF)</Label>
                <Input
                  type="number" min={0}
                  placeholder="0"
                  value={form.bonuses || ''}
                  onChange={e => setForm(f => ({ ...f, bonuses: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Déductions (GNF)</Label>
                <Input
                  type="number" min={0}
                  placeholder="0"
                  value={form.deductions || ''}
                  onChange={e => setForm(f => ({ ...f, deductions: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mode de paiement</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Date de paiement</Label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="Notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Récap net */}
            <div className="rounded-lg bg-muted/50 border p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Salaire net calculé</span>
              <span className="text-lg font-bold text-primary">{formatGNF(formNet)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
