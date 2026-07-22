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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus, Pencil, Trash2, Search, TrendingDown, ShoppingCart,
  Users, Car, Utensils, AlertTriangle, Wrench, MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const CATEGORIES = [
  { value: 'salaire', label: 'Salaires & Primes', icon: Users, color: 'bg-blue-100 text-blue-700' },
  { value: 'achat', label: 'Achats & Matériel', icon: ShoppingCart, color: 'bg-purple-100 text-purple-700' },
  { value: 'transport', label: 'Transport', icon: Car, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'nourriture', label: 'Nourriture', icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  { value: 'imprevue', label: 'Imprévu', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  { value: 'logiciel', label: 'Logiciels & Abonnements', icon: MoreHorizontal, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'maintenance', label: 'Maintenance & Réparation', icon: Wrench, color: 'bg-muted text-muted-foreground' },
  { value: 'autre', label: 'Autre', icon: TrendingDown, color: 'bg-slate-100 text-slate-700' },
]

type Expense = {
  id: string
  title: string
  description: string | null
  amount: number
  category: string
  expense_date: string
  paid_to: string | null
  paid_by: string | null
  project_id: string | null
  notes: string | null
  created_at: string
  project?: { title: string } | null
  paid_by_profile?: { full_name: string } | null
}

type Project = { id: string; title: string }

const EMPTY: Partial<Expense> = {
  title: '',
  description: '',
  amount: 0,
  category: 'achat',
  expense_date: new Date().toISOString().slice(0, 10),
  paid_to: '',
  project_id: 'none',
  notes: '',
}

export default function ExpensesPage() {
  const { profile } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<Partial<Expense>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: exp }, { data: proj }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, project:projects(title), paid_by_profile:profiles!paid_by(full_name)')
          .order('expense_date', { ascending: false }),
        supabase.from('projects').select('id, title').order('title'),
    ])
    setExpenses(exp || [])
    setProjects(proj || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(e: Expense) {
    setEditing(e)
    setForm({ ...e, project_id: e.project_id ?? 'none' })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.title || !form.amount || !form.category || !form.expense_date) {
      toast.error('Remplissez les champs obligatoires')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      amount: Number(form.amount),
      category: form.category,
      expense_date: form.expense_date,
      paid_to: form.paid_to || null,
      paid_by: profile?.id || null,
      project_id: form.project_id === 'none' ? null : form.project_id || null,
      notes: form.notes || null,
      created_by: profile?.id || null,
    }
    if (editing) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur lors de la modification'); setSaving(false); return }
      toast.success('Dépense modifiée')
    } else {
      const { error } = await supabase.from('expenses').insert(payload)
      if (error) { toast.error('Erreur lors de la création'); setSaving(false); return }
      toast.success('Dépense ajoutée')
    }
    setSaving(false)
    setOpen(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('expenses').delete().eq('id', id)
    toast.success('Dépense supprimée')
    fetchAll()
  }

  // Months available
  const months = [...new Set(expenses.map(e => e.expense_date.slice(0, 7)))].sort().reverse()

  const filtered = expenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.paid_to || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || e.category === filterCategory
    const matchMonth = filterMonth === 'all' || e.expense_date.startsWith(filterMonth)
    return matchSearch && matchCat && matchMonth
  })

  // Stats
  const totalAll = filtered.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  function getCatInfo(value: string) {
    return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1]
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Sorties d'argent</h1>
          <p className="text-muted-foreground text-sm">Suivi des dépenses : salaires, achats, transport...</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle dépense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total affiché</p>
            <p className="text-xl font-bold text-red-600">{formatGNF(totalAll)}</p>
          </CardContent>
        </Card>
        {byCategory.slice(0, 3).map(cat => (
          <Card key={cat.value}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{cat.label}</p>
              <p className="text-xl font-bold">{formatGNF(cat.total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous les mois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Payé à</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Aucune dépense trouvée</TableCell></TableRow>
              ) : filtered.map(e => {
                const cat = getCatInfo(e.category)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.expense_date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.title}</div>
                      {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${cat.color} border-0`}>{cat.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.paid_to || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {(e.project as any)?.title || '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatGNF(e.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
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

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Libellé *</Label>
                <Input placeholder="Ex: Achat imprimante" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie *</Label>
                <Select value={form.category || 'achat'} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Montant (GNF) *</Label>
                <Input type="number" min={0} placeholder="0" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.expense_date || ''} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Payé à</Label>
                <Input placeholder="Nom du bénéficiaire" value={form.paid_to || ''} onChange={e => setForm(f => ({ ...f, paid_to: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Détails..." value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Projet lié</Label>
                <Select value={form.project_id || 'none'} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">Aucun projet</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Notes supplémentaires..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
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
