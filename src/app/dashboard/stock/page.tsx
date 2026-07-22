'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { formatGNF } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
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
import { format, parseISO } from 'date-fns'
import { Plus, Search, Package, Monitor, Camera, Cpu, Wrench, AlertTriangle, Pencil, Trash2, CheckCircle2, Copy, Database } from 'lucide-react'

const CATEGORIES = [
  { value: 'informatique', label: 'Informatique', icon: Monitor, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'audiovisuel', label: 'Audiovisuel', icon: Camera, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'logiciel', label: 'Logiciels / Lic.', icon: Cpu, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'mobilier', label: 'Mobilier', icon: Package, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'consommable', label: 'Consommable', icon: Package, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'autre', label: 'Autre', icon: Package, color: 'bg-slate-100 text-slate-700 border-slate-200' },
]

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'bon', label: 'Bon état', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'usage', label: 'Usagé', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'reparation', label: 'En réparation', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'hors_service', label: 'Hors service', color: 'bg-red-100 text-red-700 border-red-200' },
]

const EMPTY = {
  name: '', category: 'informatique', quantity: 1, unit_value: 0,
  serial_number: '', assigned_to: '', condition: 'bon',
  purchase_date: '', warranty_until: '', notes: '',
}

const STOCK_FALLBACK_KEY = 'erp_stock_fallback'

function normalizeStock(value: any) {
  return {
    id: String(value.id),
    name: String(value.name || ''),
    category: String(value.category || 'autre'),
    quantity: Number(value.quantity || 1),
    unit_value: Number(value.unit_value || 0),
    serial_number: value.serial_number || null,
    assigned_to: value.assigned_to || null,
    condition: String(value.condition || 'bon'),
    purchase_date: value.purchase_date || null,
    warranty_until: value.warranty_until || null,
    notes: value.notes || null,
    created_by: value.created_by || null,
    created_at: value.created_at || new Date().toISOString(),
  }
}

async function loadFallbackStock() {
  const { data } = await supabase.from('settings').select('value').eq('key', STOCK_FALLBACK_KEY).maybeSingle()
  const raw = Array.isArray(data?.value) ? data.value : []
  return raw.map(normalizeStock)
}

async function saveFallbackStock(items: any[]) {
  return supabase.from('settings').upsert({
    key: STOCK_FALLBACK_KEY,
    value: items,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
}

export default function StockPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterCond, setFilterCond] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: st, error: stErr }, { data: pr }] = await Promise.all([
      supabase.from('stock').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name').neq('role', 'client').order('full_name'),
    ])
    const missing = stErr?.message?.includes('schema cache') || stErr?.message?.includes('relation') || stErr?.code === '42P01' || stErr?.code === 'PGRST205'
    setTableError(Boolean(missing))
    setItems(missing ? await loadFallbackStock() : (st || []))
    setTeam(pr || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = items.filter(i => {
    const ms = i.name?.toLowerCase().includes(search.toLowerCase()) || i.serial_number?.toLowerCase().includes(search.toLowerCase())
    const mc = filterCat === 'all' || i.category === filterCat
    const md = filterCond === 'all' || i.condition === filterCond
    return ms && mc && md
  })

  const totalValue = items.reduce((sum, i) => sum + Number(i.unit_value || 0) * Number(i.quantity || 1), 0)
  const totalItems = items.reduce((sum, i) => sum + Number(i.quantity || 1), 0)
  const alertItems = items.filter(i => ['reparation', 'hors_service'].includes(i.condition)).length
  const warrantyExpiring = items.filter(i => {
    if (!i.warranty_until) return false
    const d = new Date(i.warranty_until)
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    return d <= in30 && d >= new Date()
  }).length

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true) }
  function openEdit(item: any) {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit_value: item.unit_value || 0,
      serial_number: item.serial_number || '',
      assigned_to: item.assigned_to || '',
      condition: item.condition || 'bon',
      purchase_date: item.purchase_date || '',
      warranty_until: item.warranty_until || '',
      notes: item.notes || '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name) return toast.error('Nom requis')
    setSaving(true)
    const payload = normalizeStock({
      ...form,
      unit_value: Number(form.unit_value) || 0,
      quantity: Number(form.quantity) || 1,
      created_by: profile?.id || null,
      id: editing?.id || crypto.randomUUID(),
      created_at: editing?.created_at || new Date().toISOString(),
    })

    let error: any = null
    if (tableError) {
      const current = await loadFallbackStock()
      const next = editing ? current.map(item => item.id === editing.id ? payload : item) : [payload, ...current]
      const result = await saveFallbackStock(next)
      error = result.error
    } else {
      const result = editing
        ? await supabase.from('stock').update(payload).eq('id', editing.id)
        : await supabase.from('stock').insert(payload)
      error = result.error
    }

    setSaving(false)
    if (error) return toast.error(getErrorMessage(error, 'Opération impossible'))
    toast.success(editing ? 'Article modifié' : 'Article ajouté')
    setOpen(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    let error: any = null
    if (tableError) {
      const current = await loadFallbackStock()
      const result = await saveFallbackStock(current.filter(item => item.id !== id))
      error = result.error
    } else {
      const result = await supabase.from('stock').delete().eq('id', id)
      error = result.error
    }
    if (error) return toast.error('Suppression impossible')
    toast.success('Article supprimé')
    fetchAll()
  }


  async function migrateToRealTable() {
    const current = await loadFallbackStock()
    if (current.length === 0) return toast.info('Aucune donnée à migrer')
    const { error } = await supabase.from('stock').insert(current.map(({ id, ...rest }) => rest))
    if (error) return toast.error('Migration impossible: ' + error.message)
    await supabase.from('settings').delete().eq('key', STOCK_FALLBACK_KEY)
    toast.success('Migration terminée')
    fetchAll()
  }
  const SQL_STOCK = `create table if not exists public.stock (\n  id uuid primary key default gen_random_uuid(),\n  name text not null,\n  category text not null default 'autre',\n  quantity integer not null default 1,\n  unit_value numeric(15,0) default 0,\n  serial_number text, assigned_to text,\n  condition text default 'bon',\n  purchase_date date, warranty_until date,\n  notes text, created_by uuid,\n  created_at timestamptz default now()\n);\nalter table public.stock enable row level security;\ncreate policy "stock_all" on public.stock using (true) with check (auth.uid() is not null);`

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {tableError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Table Supabase manquante</p>
              <p className="text-sm text-amber-700 mt-0.5">La table <code className="bg-amber-100 px-1 rounded">stock</code> n'existe pas encore. La page fonctionne quand même avec un stockage de secours. Pour une vraie table métier, exécutez le SQL ci-dessous.</p>
            </div>
          </div>
          <div className="relative">
            <pre className="bg-amber-100 text-amber-900 text-xs rounded p-3 overflow-x-auto font-mono">{SQL_STOCK}</pre>
            <button className="absolute top-2 right-2 bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs px-2 py-1 rounded flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(SQL_STOCK); toast.success('SQL copié !') }}>
              <Copy className="h-3 w-3" /> Copier
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Stock & Inventaire</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Suivi du matériel, licences et équipements de l'agence</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Ajouter un article</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Articles', value: totalItems, icon: Package, color: 'text-foreground' },
          { label: 'Valeur totale', value: formatGNF(totalValue), icon: CheckCircle2, color: 'text-blue-600' },
          { label: 'À surveiller', value: alertItems, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Garanties proches', value: warrantyExpiring, icon: Wrench, color: 'text-amber-600' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Card key={item.label}><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</p></div><div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Icon className={`h-5 w-5 ${item.color}`} /></div></CardContent></Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-full md:w-72" placeholder="Rechercher un article ou n° série..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={filterCat} onValueChange={setFilterCat}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes catégories</SelectItem>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
              <Select value={filterCond} onValueChange={setFilterCond}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="État" /></SelectTrigger><SelectContent><SelectItem value="all">Tous états</SelectItem>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead>Catégorie</TableHead><TableHead>Qté</TableHead><TableHead>Valeur unitaire</TableHead><TableHead>Assigné à</TableHead><TableHead>État</TableHead><TableHead>Garantie</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun article trouvé</TableCell></TableRow>
              : filtered.map(item => {
                  const cat = CATEGORIES.find(c => c.value === item.category)
                  const cond = CONDITIONS.find(c => c.value === item.condition)
                  const assigned = team.find(t => t.id === item.assigned_to)?.full_name || item.assigned_to || '—'
                  return (
                    <TableRow key={item.id}>
                      <TableCell><div className="font-medium text-sm">{item.name}</div>{item.serial_number && <div className="text-xs text-muted-foreground">S/N: {item.serial_number}</div>}</TableCell>
                      <TableCell><Badge className={`text-xs border ${cat?.color || ''}`}>{cat?.label || item.category}</Badge></TableCell>
                      <TableCell className="font-bold">{item.quantity}</TableCell>
                      <TableCell>{formatGNF(item.unit_value || 0)}</TableCell>
                      <TableCell className="text-sm">{assigned}</TableCell>
                      <TableCell><Badge className={`text-xs border ${cond?.color || ''}`}>{cond?.label || item.condition}</Badge></TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{item.warranty_until ? format(parseISO(item.warranty_until), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell><div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Modifier un article' : 'Ajouter un article'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Catégorie</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>État</Label><Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Quantité</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
            <div className="space-y-2"><Label>Valeur unitaire</Label><Input type="number" min={0} value={form.unit_value} onChange={e => setForm(f => ({ ...f, unit_value: Number(e.target.value) }))} /></div>
            <div className="space-y-2"><Label>N° de série</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Assigné à</Label><Select value={form.assigned_to || 'none'} onValueChange={v => setForm(f => ({ ...f, assigned_to: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Personne" /></SelectTrigger><SelectContent><SelectItem value="none">Personne</SelectItem>{team.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Date d'achat</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Fin garantie</Label><Input type="date" value={form.warranty_until} onChange={e => setForm(f => ({ ...f, warranty_until: e.target.value }))} /></div>
            <div className="col-span-2 space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
