'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import { downloadQuotePDF } from '@/lib/pdf'
import {
  Plus, Search, MoreHorizontal, FileText, Download, Send,
  CheckCircle, XCircle, Trash2, Eye, PlusCircle, Minus, Package, Layers, Check
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré'
}

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
}

const EMPTY_ITEM: QuoteItem = { description: '', quantity: 1, unit_price: 0 }

export default function QuotesPage() {
  const { profile } = useAuth()
  const [quotes, setQuotes] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [viewOpen, setViewOpen] = useState(false)

  // Form state
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    tax_rate: 18,
    valid_until: '',
    notes: '',
  })
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)
  const [catalogServices, setCatalogServices] = useState<any[]>([])
  const [catalogPacks, setCatalogPacks] = useState<any[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(company_name, contact_name, email, phone)')
      .order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    supabase.from('clients').select('id, company_name').order('company_name').then(({ data }) => setClients(data || []))
    supabase.from('services').select('id, name, category, price').eq('is_active', true).order('name').then(({ data }) => setCatalogServices(data || []))
    supabase.from('packs').select('id, name, price, pack_services(quantity, services(name, price))').eq('is_active', true).order('name').then(({ data }) => setCatalogPacks(data || []))
  }, [load])

  function calcTotals(itms: QuoteItem[], taxRate: number) {
    const subtotal = itms.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const tax_amount = subtotal * (taxRate / 100)
    return { subtotal, tax_amount, total_amount: subtotal + tax_amount }
  }

  async function handleSave() {
    if (!form.client_id || !form.title) {
      toast.error('Client et titre requis')
      return
    }
    setSaving(true)
    const { subtotal, tax_amount, total_amount } = calcTotals(items, form.tax_rate)

    // Generate quote number
    const count = quotes.length + 1
    const quote_number = `DEV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`

    const { error } = await supabase.from('quotes').insert({
      ...form,
      quote_number,
      items,
      subtotal,
      tax_amount,
      total_amount,
      created_by: profile?.id,
    })
    if (error) { toast.error(getErrorMessage(error, 'Opération impossible')); setSaving(false); return }
    toast.success('Devis créé avec succès')
    setOpen(false)
    setForm({ client_id: '', title: '', description: '', tax_rate: 18, valid_until: '', notes: '' })
    setItems([{ ...EMPTY_ITEM }])
    load()
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const extra = status === 'accepted' ? { accepted_at: new Date().toISOString() } : {}
    const { error } = await supabase.from('quotes').update({ status, ...extra }).eq('id', id)
    if (error) { toast.error(getErrorMessage(error, 'Opération impossible')); return }

    // Conversion automatique devis → facture si accepté
    if (status === 'accepted') {
      const quote = quotes.find(q => q.id === id)
      if (quote) {
        const count = await supabase.from('invoices').select('id', { count: 'exact', head: true })
        const invoiceNumber = `FAC-${new Date().getFullYear()}-${String((count.count || 0) + 1).padStart(4, '0')}`
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        const { error: invErr } = await supabase.from('invoices').insert({
          client_id: quote.client_id,
          quote_id: quote.id,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          items: quote.items,
          subtotal: quote.subtotal,
          tax_rate: quote.tax_rate,
          total_amount: quote.total_amount,
          paid_amount: 0,
          status: 'en_attente',
          notes: `Facture générée depuis le devis ${quote.quote_number}`,
          created_by: profile?.id,
        })
        if (invErr) {
          toast.warning(`Devis accepté mais erreur lors de la création de la facture: ${invErr.message}`)
        } else {
          toast.success('Devis accepté — Facture créée automatiquement dans la section Factures !')
          load()
          return
        }
      }
    }

    toast.success(`Devis marqué comme "${STATUS_LABELS[status]}"`)
    load()
  }

  async function deleteQuote(id: string) {
    if (!confirm('Supprimer ce devis ?')) return
    await supabase.from('quotes').delete().eq('id', id)
    toast.success('Devis supprimé')
    load()
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof QuoteItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function importService(svc: any) {
    setItems(prev => [...prev.filter(i => i.description || i.unit_price > 0), { description: svc.name, quantity: 1, unit_price: svc.price }])
    setShowCatalog(false)
  }

  function importPack(pack: any) {
    const packItems: QuoteItem[] = (pack.pack_services ?? []).map((ps: any) => ({
      description: ps.services?.name ?? '',
      quantity: ps.quantity ?? 1,
      unit_price: ps.services?.price ?? 0,
    }))
    if (packItems.length > 0) {
      setItems(prev => [...prev.filter(i => i.description || i.unit_price > 0), ...packItems])
    }
    setShowCatalog(false)
  }

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.title?.toLowerCase().includes(search.toLowerCase()) ||
      q.clients?.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  const totals = {
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalAccepted: quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total_amount || 0), 0),
  }

  const { subtotal: previewSub, tax_amount: previewTax, total_amount: previewTotal } = calcTotals(items, form.tax_rate)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Devis</h1>
          <p className="text-muted-foreground text-sm mt-1">Créez et gérez vos devis clients</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouveau devis</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un devis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Client *</Label>
                  <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Titre du devis *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Refonte site web" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Valable jusqu'au</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>TVA (%)</Label>
                  <Input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: Number(e.target.value) }))} />
                </div>
              </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Prestations / Articles</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowCatalog(true)}>
                        <Package className="h-3.5 w-3.5 mr-1 text-[#0066FF]" />Catalogue
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />Ajouter
                      </Button>
                    </div>
                  </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-right p-2 font-medium w-16">Qté</th>
                        <th className="text-right p-2 font-medium w-28">Prix unit. (GNF)</th>
                        <th className="text-right p-2 font-medium w-28">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">
                            <Input className="h-8 border-0 bg-transparent" value={item.description}
                              onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" />
                          </td>
                          <td className="p-1">
                            <Input className="h-8 border-0 bg-transparent text-right" type="number" value={item.quantity}
                              onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                          </td>
                          <td className="p-1">
                            <Input className="h-8 border-0 bg-transparent text-right" type="number" value={item.unit_price}
                              onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} />
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {(item.quantity * item.unit_price).toLocaleString('fr-FR')}
                          </td>
                          <td className="p-1">
                            {items.length > 1 && (
                              <button onClick={() => removeItem(i)} className="text-destructive hover:opacity-80">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals preview */}
                <div className="flex justify-end">
                  <div className="text-sm space-y-1 min-w-48">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total HT</span>
                      <span>{previewSub.toLocaleString('fr-FR')} GNF</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>TVA ({form.tax_rate}%)</span>
                      <span>{previewTax.toLocaleString('fr-FR')} GNF</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary border-t pt-1">
                      <span>Total TTC</span>
                      <span>{previewTotal.toLocaleString('fr-FR')} GNF</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conditions, remarques..." rows={2} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Créer le devis'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Brouillons</CardTitle></CardHeader>
          <CardContent><p className="text-xl md:text-2xl font-bold">{totals.draft}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Envoyés</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">{totals.sent}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Acceptés</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{totals.accepted}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CA signé</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{totals.totalAccepted.toLocaleString('fr-FR')}</p><p className="text-xs text-muted-foreground">GNF</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un devis..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0 overflow-visible">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun devis trouvé</p>
              <Button className="mt-3" onClick={() => setOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />Créer un devis
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-4 font-medium text-muted-foreground">N° Devis</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Titre</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Montant TTC</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Valide jusqu'au</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Statut</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono text-xs text-muted-foreground">{q.quote_number}</td>
                    <td className="p-4 font-medium">{q.clients?.company_name || '—'}</td>
                    <td className="p-4 max-w-xs truncate">{q.title}</td>
                    <td className="p-4 text-right font-semibold">{(q.total_amount || 0).toLocaleString('fr-FR')} GNF</td>
                    <td className="p-4 text-muted-foreground">
                      {q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] || ''}`}>
                        {STATUS_LABELS[q.status] || q.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedQuote(q); setViewOpen(true) }}>Voir</Button>
                        {q.status === 'draft' && <Button size="sm" onClick={() => updateStatus(q.id, 'sent')}>Envoyer</Button>}
                        {q.status === 'sent' && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(q.id, 'accepted')}>Accepter</Button>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                          <DropdownMenuItem onClick={() => { setSelectedQuote(q); setViewOpen(true) }}>
                            <Eye className="mr-2 h-4 w-4" />Voir le détail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadQuotePDF(q)}>
                            <Download className="mr-2 h-4 w-4" />Télécharger PDF
                          </DropdownMenuItem>
                          {q.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateStatus(q.id, 'sent')}>
                              <Send className="mr-2 h-4 w-4" />Marquer comme envoyé
                            </DropdownMenuItem>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(q.id, 'accepted')} className="text-green-600">
                                <CheckCircle className="mr-2 h-4 w-4" />Marquer accepté
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(q.id, 'rejected')} className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />Marquer refusé
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => deleteQuote(q.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedQuote?.quote_number} — {selectedQuote?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedQuote.status]}`}>
                  {STATUS_LABELS[selectedQuote.status]}
                </span>
                {selectedQuote.valid_until && (
                  <span className="text-xs text-muted-foreground">
                    Valide jusqu'au {new Date(selectedQuote.valid_until).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                  <p className="font-semibold">{selectedQuote.clients?.company_name}</p>
                  <p className="text-muted-foreground">{selectedQuote.clients?.contact_name}</p>
                  <p className="text-muted-foreground">{selectedQuote.clients?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Montants</p>
                  <p className="text-muted-foreground">HT: {(selectedQuote.subtotal || 0).toLocaleString('fr-FR')} GNF</p>
                  <p className="text-muted-foreground">TVA ({selectedQuote.tax_rate}%): {(selectedQuote.tax_amount || 0).toLocaleString('fr-FR')} GNF</p>
                  <p className="font-bold text-primary text-lg">{(selectedQuote.total_amount || 0).toLocaleString('fr-FR')} GNF TTC</p>
                </div>
              </div>

              {/* Items */}
              {selectedQuote.items?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Prestations</p>
                  <div className="border rounded-lg overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Description</th>
                          <th className="text-right p-2 font-medium">Qté</th>
                          <th className="text-right p-2 font-medium">Prix unit.</th>
                          <th className="text-right p-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.items.map((item: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{Number(item.unit_price).toLocaleString('fr-FR')}</td>
                            <td className="p-2 text-right font-medium">{(item.quantity * item.unit_price).toLocaleString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedQuote.notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Notes</p>
                  {selectedQuote.notes}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => downloadQuotePDF(selectedQuote)}>
                  <Download className="h-4 w-4 mr-2" />Télécharger PDF
                </Button>
                {selectedQuote.status === 'draft' && (
                  <Button onClick={() => { updateStatus(selectedQuote.id, 'sent'); setViewOpen(false) }}>
                    <Send className="h-4 w-4 mr-2" />Marquer comme envoyé
                  </Button>
                )}
                {selectedQuote.status === 'sent' && (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateStatus(selectedQuote.id, 'accepted'); setViewOpen(false) }}>
                    <CheckCircle className="h-4 w-4 mr-2" />Accepter
                  </Button>
                )}
                </div>
              </div>
            )}
          </DialogContent>
          </Dialog>

        {/* Modal catalogue services/packs */}
        <Dialog open={showCatalog} onOpenChange={setShowCatalog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#0066FF]">
                <Package className="h-5 w-5" />
                Importer depuis le catalogue
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Packs */}
              {catalogPacks.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#6A00FF] flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4" /> Packs commerciaux
                  </p>
                  <div className="space-y-2">
                    {catalogPacks.map(pack => (
                      <button
                        key={pack.id}
                        onClick={() => importPack(pack)}
                        className="w-full text-left border border-border/50 hover:border-[#6A00FF]/50 hover:bg-[#6A00FF]/5 rounded-lg p-3 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{pack.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(pack.pack_services ?? []).map((ps: any) => ps.services?.name).filter(Boolean).join(' + ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#6A00FF] text-sm">{Number(pack.price).toLocaleString('fr-FR')} GNF</p>
                            <p className="text-xs text-[#00E5FF] group-hover:opacity-100 opacity-0 transition-opacity">Importer →</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Services unitaires */}
              {catalogServices.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#0066FF] flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" /> Services unitaires
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catalogServices.map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => importService(svc)}
                        className="text-left border border-border/50 hover:border-[#0066FF]/50 hover:bg-[#0066FF]/5 rounded-lg p-3 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{svc.name}</p>
                            <p className="text-xs text-muted-foreground">{svc.category}</p>
                          </div>
                          <p className="font-bold text-[#0066FF] text-sm shrink-0">{Number(svc.price).toLocaleString('fr-FR')} GNF</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
}
