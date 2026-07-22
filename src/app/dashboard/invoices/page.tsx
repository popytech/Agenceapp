'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import {
  Plus, Search, MoreHorizontal, Receipt, Edit, Trash2, CheckCircle2,
  CreditCard, Download, FileDown, Sparkles, Loader2, Eye, X,
  Building, User, Mail, Phone, MapPin, Hash, Calendar, FileText,
  ChevronDown, ArrowUpRight, Percent, Minus, Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatGNF } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadInvoicePDF, downloadPaymentReceipt } from '@/lib/pdf'

// ─── Types ───────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
}

interface InvoiceForm {
  client_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'impayee' | 'partielle' | 'payee'
  currency: string
  // Émetteur
  company_name: string
  company_address: string
  company_email: string
  company_phone: string
  tax_number: string
  // Lignes
  items: InvoiceItem[]
  // Totaux
  discount: number
  tax_rate: number
  notes: string
  terms: string
}

// ─── Config ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  payee:    { label: 'Payée',     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  impayee:  { label: 'Impayée',   color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  partielle:{ label: 'Partielle', color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
}

const CURRENCIES = ['GNF', 'EUR', 'USD', 'XOF', 'MAD']

const emptyItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }

function emptyForm(invoiceNumber: string): InvoiceForm {
  return {
    client_id: '', invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'impayee', currency: 'GNF',
    company_name: 'POPY TECH', company_address: '', company_email: '', company_phone: '', tax_number: '',
    items: [{ ...emptyItem }],
    discount: 0, tax_rate: 18, notes: '', terms: 'Paiement sous 30 jours.',
  }
}

// ─── Calculs ─────────────────────────────────────────────────────────────────
function calcTotals(form: InvoiceForm) {
  // Sous-total HT (somme des lignes)
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  // Remise globale sur le HT
  const discountAmt = subtotal * (form.discount / 100)
  const afterDiscount = subtotal - discountAmt
  // TVA : soit par ligne individuelle, soit TVA globale si toutes les lignes sont à 0
  const hasPerLineTax = form.items.some(i => i.tax_rate > 0)
  let taxAmt: number
  if (hasPerLineTax) {
    // Applique la remise proportionnellement puis calcule la TVA par ligne
    const discountRatio = form.discount > 0 ? (1 - form.discount / 100) : 1
    taxAmt = form.items.reduce((s, i) => {
      const lineHT = i.quantity * i.unit_price * discountRatio
      return s + lineHT * (i.tax_rate / 100)
    }, 0)
  } else {
    // Pas de TVA par ligne → utilise la TVA globale du formulaire
    taxAmt = afterDiscount * (form.tax_rate / 100)
  }
  const total = afterDiscount + taxAmt
  return { subtotal, discountAmt, afterDiscount, taxAmt, total, hasPerLineTax }
}

// ─── Aperçu Facture — Design 2026 Split-Panel ────────────────────────────────
function InvoicePreview({ form, client }: { form: InvoiceForm; client: any }) {
  const { subtotal, discountAmt, taxAmt, total } = calcTotals(form)
  const fmt = (n: number) => form.currency === 'GNF' ? formatGNF(n) : `${form.currency} ${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`
  const statusColors: Record<string, string> = {
    payee:    'bg-emerald-100 text-emerald-700',
    impayee:  'bg-red-100 text-red-700',
    partielle:'bg-amber-100 text-amber-700',
  }
  const statusLabels: Record<string, string> = { payee: 'PAYÉE', impayee: 'IMPAYÉE', partielle: 'PARTIELLE' }

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-md text-sm flex" style={{ minHeight: 480 }}>
      {/* ── Panneau gauche sombre ── */}
      <div className="w-40 shrink-0 flex flex-col" style={{ background: '#121220' }}>
        {/* Bande orange top */}
        <div className="h-1.5 w-full" style={{ background: '#FF6B35' }} />
        {/* Contenu */}
        <div className="flex-1 p-3 space-y-3">
          {/* Nom agence */}
          <div className="pt-1">
            <p className="font-bold text-white text-sm tracking-wide">POPY TECH</p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: '#aaa8c8', fontSize: '9px' }}>
              Agence de communication &amp; marketing digital
            </p>
          </div>
          {/* Séparateur orange */}
          <div className="h-px w-4/5" style={{ background: '#FF6B35' }} />
          {/* Coordonnées */}
          <div className="space-y-2">
            {[
              { label: 'EMAIL', val: form.company_email || 'contact@popytech.com' },
              { label: 'TÉL', val: form.company_phone || '+224 629 37 13 60' },
              { label: 'SITE', val: 'www.popytech.com' },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="font-bold" style={{ color: '#FF6B35', fontSize: '7px' }}>{label}</p>
                <p style={{ color: '#c8cce0', fontSize: '8px' }} className="break-all leading-tight">{val}</p>
              </div>
            ))}
          </div>
          {/* Séparateur */}
          <div className="h-px w-4/5" style={{ background: '#FF6B35' }} />
          {/* Client */}
          <div>
            <p className="font-bold mb-1" style={{ color: '#FF6B35', fontSize: '7px' }}>FACTURÉ À</p>
            {client ? (
              <div>
                <p className="font-bold text-white leading-tight" style={{ fontSize: '9px' }}>{client.company_name}</p>
                {client.contact_name && <p style={{ color: '#c0c4dc', fontSize: '8px' }}>{client.contact_name}</p>}
                {client.email && <p style={{ color: '#9094aa', fontSize: '7px' }} className="break-all">{client.email}</p>}
              </div>
            ) : (
              <p style={{ color: '#66697c', fontSize: '8px' }} className="italic">Client non sélectionné</p>
            )}
          </div>
        </div>
        {/* Footer panneau gauche */}
        <div className="p-3 pt-2" style={{ background: '#1c1c30', borderTop: '1px solid #2a2a40' }}>
          <p style={{ color: '#555870', fontSize: '7px' }}>Généré le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Barre séparatrice orange fine */}
      <div className="w-0.5 shrink-0" style={{ background: '#FF6B35' }} />

      {/* ── Zone droite blanche ── */}
      <div className="flex-1 flex flex-col bg-[#fcfcfe]">
        {/* Header zone droite */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight" style={{ color: '#121220' }}>FACTURE</h2>
              {/* Trait orange */}
              <div className="h-0.5 mt-1 mb-2" style={{ background: '#FF6B35', width: '100%' }} />
              <p className="font-mono text-xs font-semibold" style={{ color: '#75859a' }}>
                {form.invoice_number || 'FAC-XXXX-XXX'}
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex gap-6 text-xs">
                <div>
                  <p style={{ color: '#9498a8', fontSize: '9px' }} className="uppercase tracking-wider font-semibold">Émise le</p>
                  <p className="font-semibold" style={{ color: '#121220' }}>
                    {form.invoice_date ? new Date(form.invoice_date).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#9498a8', fontSize: '9px' }} className="uppercase tracking-wider font-semibold">Échéance</p>
                  <p className="font-semibold text-red-600">
                    {form.due_date ? new Date(form.due_date).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
              </div>
              <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-bold', statusColors[form.status] || 'bg-gray-100 text-gray-600')}>
                {statusLabels[form.status] || form.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tableau lignes */}
        <div className="flex-1 px-5 pb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#121220' }}>
                <th className="text-left py-2 px-3 font-semibold text-white rounded-tl">Désignation</th>
                <th className="text-center py-2 w-12 font-semibold text-white">Qté</th>
                <th className="text-right py-2 w-24 font-semibold text-white px-2">Prix unit.</th>
                <th className="text-center py-2 w-12 font-semibold text-white">TVA</th>
                <th className="text-right py-2 px-3 w-28 font-semibold text-white rounded-tr">Total</th>
              </tr>
            </thead>
            <tbody>
              {form.items.filter(i => i.description).map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f8fc]'}>
                  <td className="py-2 px-3" style={{ color: '#1c1c26' }}>{item.description}</td>
                  <td className="py-2 text-center" style={{ color: '#75859a' }}>{item.quantity}</td>
                  <td className="py-2 text-right px-2" style={{ color: '#75859a' }}>{fmt(item.unit_price)}</td>
                  <td className="py-2 text-center" style={{ color: '#75859a' }}>{item.tax_rate}%</td>
                  <td className="py-2 text-right px-3 font-semibold" style={{ color: '#121220' }}>{fmt(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
              {form.items.filter(i => i.description).length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center italic text-xs" style={{ color: '#c0c4d0' }}>Aucune ligne ajoutée</td></tr>
              )}
            </tbody>
          </table>

          {/* Trait orange fin */}
          <div className="h-0.5 mt-0" style={{ background: '#FF6B35' }} />

          {/* Totaux */}
          <div className="mt-3 flex justify-end">
            <div className="w-56 space-y-1.5 text-xs">
              <div className="flex justify-between" style={{ color: '#9498a8' }}>
                <span>Sous-total HT</span>
                <span className="font-medium" style={{ color: '#4a5060' }}>{fmt(subtotal)}</span>
              </div>
              {form.discount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Remise ({form.discount}%)</span>
                  <span>- {fmt(discountAmt)}</span>
                </div>
              )}
              {form.tax_rate > 0 && (
                <div className="flex justify-between" style={{ color: '#9498a8' }}>
                  <span>TVA ({form.tax_rate}%)</span>
                  <span style={{ color: '#4a5060' }}>+ {fmt(taxAmt)}</span>
                </div>
              )}
              {/* Box total orange */}
              <div className="rounded-md px-3 py-2 flex justify-between font-bold text-sm text-white" style={{ background: '#FF6B35' }}>
                <span>TOTAL TTC</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes + Conditions */}
          {(form.notes || form.terms) && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {form.notes && (
                <div className="rounded-md overflow-hidden border border-gray-100">
                  <div className="px-3 py-1 font-bold text-white text-xs" style={{ background: '#121220' }}>NOTES</div>
                  <div className="px-3 py-2" style={{ color: '#6a7080' }}>{form.notes}</div>
                </div>
              )}
              {form.terms && (
                <div className="rounded-md overflow-hidden border border-orange-100">
                  <div className="px-3 py-1 font-bold text-white text-xs" style={{ background: '#FF6B35' }}>CONDITIONS</div>
                  <div className="px-3 py-2" style={{ color: '#6a7080' }}>{form.terms}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 flex justify-between items-center" style={{ background: '#121220' }}>
          <p style={{ color: '#6a6e80', fontSize: '9px' }}>Merci pour votre confiance — Tout retard est soumis à pénalités.</p>
          <p style={{ color: '#6a6e80', fontSize: '9px' }}>www.popytech.com</p>
        </div>
      </div>
    </div>
  )
}

// ─── Formulaire Création / Édition ───────────────────────────────────────────
function InvoiceSheet({
  open, onOpenChange, editInvoice, clients, invoiceCount, onSaved
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editInvoice: any | null
  clients: any[]
  invoiceCount: number
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'form' | 'preview'>('form')
  const [form, setForm] = useState<InvoiceForm>(emptyForm(`FAC-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`))
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const initializedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      initializedRef.current = null
      return
    }
    // Clé unique pour éviter la réinitialisation lors des re-renders
    const key = editInvoice ? `edit-${editInvoice.id}` : `new-${invoiceCount}`
    if (initializedRef.current === key) return
    initializedRef.current = key

    if (editInvoice) {
      setForm({
        client_id: editInvoice.client_id || '',
        invoice_number: editInvoice.invoice_number || '',
        invoice_date: editInvoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: editInvoice.due_date || '',
        status: editInvoice.status || 'impayee',
        currency: editInvoice.currency || 'GNF',
        company_name: editInvoice.company_name || 'POPY TECH',
        company_address: editInvoice.company_address || '',
        company_email: editInvoice.company_email || '',
        company_phone: editInvoice.company_phone || '',
        tax_number: editInvoice.tax_number || '',
        items: editInvoice._items?.length
          ? editInvoice._items.map((it: any) => ({
              id: it.id,
              description: it.description || '',
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              tax_rate: Number(it.tax_rate) || 0,
            }))
          : editInvoice.total_amount > 0
            ? [{ description: 'Prestation', quantity: 1, unit_price: Number(editInvoice.total_amount) || 0, tax_rate: 0 }]
            : [{ ...emptyItem }],
        discount: editInvoice.discount || 0,
        tax_rate: editInvoice.tax_rate ?? 18,
        notes: editInvoice.notes || '',
        terms: editInvoice.terms || 'Paiement sous 30 jours.',
      })
    } else {
      setForm(emptyForm(`FAC-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`))
    }
    setTab('form')
  }, [open, editInvoice, invoiceCount])

  const selectedClient = clients.find(c => c.id === form.client_id) || null
  const { subtotal, discountAmt, taxAmt, total, hasPerLineTax } = calcTotals(form)

  function setItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it)
    }))
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }))
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  async function generateWithAI() {
    const clientName = selectedClient?.company_name
    if (!clientName) { toast.error('Sélectionne un client d\'abord'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Génère des lignes de facture professionnelles pour une agence digitale POPY TECH facturant le client "${clientName}". Retourne un JSON avec exactement ce format :
{
  "items": [
    { "description": "...", "quantity": 1, "unit_price": 500000, "tax_rate": 18 },
    ...
  ],
  "notes": "...",
  "terms": "..."
}
Utilise des prix en GNF (francs guinéens), entre 200 000 et 2 000 000 GNF par ligne. 3-4 lignes max. Prestations typiques d'agence digitale. Réponds UNIQUEMENT avec le JSON valide, sans markdown.`,
          context: 'invoice'
        })
      })
      const data = await res.json()
      const text = data.reply || ''
      const parsed = JSON.parse(text)
      if (parsed.items) {
        setForm(f => ({
          ...f,
          items: parsed.items,
          notes: parsed.notes || f.notes,
          terms: parsed.terms || f.terms,
        }))
        toast.success('Lignes générées par l\'IA')
      }
    } catch {
      toast.error('Erreur IA — réessaie')
    }
    setAiLoading(false)
  }

  async function handleSave() {
    if (!form.invoice_number) { toast.error('Numéro de facture requis'); return }
    const validItems = form.items.filter(i => i.description.trim())
    if (validItems.length === 0) { toast.error('Ajoute au moins une ligne'); return }
    setSaving(true)

    const { subtotal: _, discountAmt: __, taxAmt: ___, total } = calcTotals(form)
    const payload = {
      client_id: form.client_id || null,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      status: form.status,
      currency: form.currency,
      company_name: form.company_name,
      company_address: form.company_address,
      company_email: form.company_email,
      company_phone: form.company_phone,
      tax_number: form.tax_number,
      discount: form.discount,
      tax_rate: form.tax_rate,
      notes: form.notes,
      terms: form.terms,
      total_amount: total,
      paid_amount: editInvoice?.paid_amount || 0,
      created_by: profile?.id || null,
    }

    let invoiceId = editInvoice?.id
    if (editInvoice) {
      const { error } = await supabase.from('invoices').update(payload).eq('id', invoiceId)
      if (error) { toast.error('Mise à jour impossible'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('invoices').insert(payload).select().single()
      if (error || !data) { toast.error(getErrorMessage(error, 'Création impossible')); setSaving(false); return }
      invoiceId = data.id
    }

    // Sauvegarder les lignes
    if (editInvoice) {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    }
      const itemsPayload = validItems.map(i => ({
        invoice_id: invoiceId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        total: i.quantity * i.unit_price,
      }))
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsPayload)
      if (itemsError) { toast.error('Erreur sauvegarde des lignes: ' + itemsError.message); setSaving(false); return }

    toast.success(editInvoice ? 'Facture mise à jour' : 'Facture créée')
    onSaved()
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[90vw] xl:max-w-[1100px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-lg font-semibold">
            {editInvoice ? `Modifier ${editInvoice.invoice_number}` : 'Nouvelle facture'}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTab(tab === 'form' ? 'preview' : 'form')} className="gap-2">
              <Eye className="h-4 w-4" />
              {tab === 'form' ? 'Aperçu' : 'Formulaire'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? 'Enregistrement...' : editInvoice ? 'Mettre à jour' : 'Créer la facture'}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {tab === 'preview' ? (
            <div className="p-6">
              <InvoicePreview form={form} client={selectedClient} />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 xl:divide-x divide-border min-h-full">
              {/* ── Formulaire gauche ── */}
              <div className="p-6 space-y-6 overflow-y-auto">

                {/* Section émetteur */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" /> Votre entreprise
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Nom de l'entreprise</Label>
                      <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="POPY TECH" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} placeholder="contact@popytech.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input value={form.company_phone} onChange={e => setForm(f => ({ ...f, company_phone: e.target.value }))} placeholder="+224 ..." />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Adresse</Label>
                      <Input value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} placeholder="Conakry, Guinée" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>N° fiscal / TVA</Label>
                      <Input value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="NIF-XXXXX" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section client + meta */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Client & Références
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Client</Label>
                      <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>N° Facture *</Label>
                      <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Devise</Label>
                      <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date facture</Label>
                      <Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date d'échéance</Label>
                      <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Statut</Label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="impayee">Impayée</SelectItem>
                          <SelectItem value="partielle">Partielle</SelectItem>
                          <SelectItem value="payee">Payée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Lignes de prestation */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Prestations
                    </h3>
                    <Button variant="outline" size="sm" onClick={generateWithAI} disabled={aiLoading} className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50">
                      {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Générer avec IA
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {/* Header colones */}
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                      <span className="col-span-5">Description</span>
                      <span className="col-span-2 text-center">Qté</span>
                      <span className="col-span-3 text-right">Prix unit.</span>
                      <span className="col-span-1 text-center">TVA%</span>
                      <span className="col-span-1"></span>
                    </div>
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center group">
                        <Input
                          className="col-span-5 h-9 text-sm"
                          placeholder="Prestation, service..."
                          value={item.description}
                          onChange={e => setItem(idx, 'description', e.target.value)}
                        />
                        <Input
                          className="col-span-2 h-9 text-sm text-center"
                          type="number" min="0.1" step="0.5"
                          value={item.quantity}
                          onChange={e => setItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          className="col-span-3 h-9 text-sm text-right"
                          type="number" min="0"
                          value={item.unit_price}
                          onChange={e => setItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          className="col-span-1 h-9 text-sm text-center px-1"
                          type="number" min="0" max="100"
                          value={item.tax_rate}
                          onChange={e => setItem(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        />
                        <button
                          onClick={() => removeItem(idx)}
                          className="col-span-1 h-9 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addItem} className="w-full gap-2 border-dashed mt-1">
                      <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Totaux + remise + TVA globale */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" /> Totaux & Taxes
                  </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Remise globale (%)</Label>
                        <Input type="number" min="0" max="100" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={hasPerLineTax ? 'text-muted-foreground/50' : ''}>
                          TVA globale (%) {hasPerLineTax && <span className="text-xs font-normal text-amber-600">— TVA par ligne active</span>}
                        </Label>
                        <Input
                          type="number" min="0" max="100"
                          value={form.tax_rate}
                          disabled={hasPerLineTax}
                          className={hasPerLineTax ? 'opacity-40' : ''}
                          onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    {/* Récap totaux */}
                    <div className="mt-4 bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Sous-total HT</span><span className="font-medium text-foreground">{formatGNF(subtotal)}</span>
                      </div>
                      {form.discount > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Remise ({form.discount}%)</span><span>- {formatGNF(discountAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>TVA {hasPerLineTax ? '(par ligne)' : `(${form.tax_rate}%)`}</span>
                        <span className="font-medium text-foreground">+ {formatGNF(taxAmt)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                        <span>TOTAL TTC {form.currency}</span>
                        <span className="text-primary">{form.currency === 'GNF' ? formatGNF(total) : `${form.currency} ${total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`}</span>
                      </div>
                    </div>
                </div>

                <Separator />

                {/* Notes + Conditions */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes & Conditions</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Notes internes / pour le client</Label>
                      <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Merci pour votre confiance..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Conditions de paiement</Label>
                      <Textarea rows={2} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} placeholder="Paiement sous 30 jours..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Aperçu droite ── */}
              <div className="hidden xl:block p-6 bg-muted/20 overflow-y-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-semibold">Aperçu en temps réel</p>
                <InvoicePreview form={form} client={selectedClient} />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<any | null>(null)
  const [paymentDialog, setPaymentDialog] = useState<any | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'orange_money', payment_date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, clients(company_name, contact_name, email, address)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data && data.length > 0) {
      const ids = data.map((i: any) => i.id)
      // Charger items ET paiements en parallèle
      const [{ data: items }, { data: pays }] = await Promise.all([
        supabase.from('invoice_items').select('id,invoice_id,description,quantity,unit_price,tax_rate,total').in('invoice_id', ids),
        supabase.from('payments').select('id,invoice_id,amount,payment_method,payment_date,notes').in('invoice_id', ids).order('created_at', { ascending: false }),
      ])
      const grouped = (items || []).reduce((acc: any, item: any) => {
        acc[item.invoice_id] = acc[item.invoice_id] || []
        acc[item.invoice_id].push(item)
        return acc
      }, {})
      setInvoices(data.map((inv: any) => ({ ...inv, _items: grouped[inv.id] || [] })))
      setPayments(pays || [])
    } else {
      setInvoices(data || [])
      setPayments([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInvoices()
    supabase.from('clients').select('id, company_name, contact_name, email, address').order('company_name').then(({ data }) => setClients(data || []))
  }, [fetchInvoices])

  function openCreate() { setEditInvoice(null); setSheetOpen(true) }
  function openEdit(inv: any) { setEditInvoice(inv); setSheetOpen(true) }

  async function handleDelete(id: string) {
    await supabase.from('invoices').delete().eq('id', id)
    toast.success('Facture supprimée')
    fetchInvoices()
  }

  async function handleRelance(inv: any) {
    const balance = (inv.total_amount || 0) - (inv.paid_amount || 0)
    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date()
    const subject = `Relance facture ${inv.invoice_number} — ${inv.clients?.company_name || ''}`
    const body = `Bonjour,\n\nNous vous contactons concernant la facture ${inv.invoice_number} d'un montant de ${formatGNF(balance)} GNF${inv.due_date ? `, dont l'échéance était le ${new Date(inv.due_date).toLocaleDateString('fr-FR')}` : ''}.\n\nMerci de procéder au règlement dans les meilleurs délais.\n\nCordialement,\nPOPY TECH`
    const email = inv.clients?.email || ''
    if (email) {
      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      toast.success(`Relance préparée pour ${inv.clients?.company_name}`)
    } else {
      // Copy to clipboard if no email
      navigator.clipboard.writeText(`${subject}\n\n${body}`)
      toast.info('Message de relance copié (pas d\'email client renseigné)')
    }
  }

  async function handlePayment() {
    if (!paymentDialog || !paymentForm.amount) { toast.error('Montant requis'); return }
    const maxAmount = Math.max(0, (paymentDialog.total_amount || 0) - (paymentDialog.paid_amount || 0))
    if (parseFloat(paymentForm.amount) <= 0) { toast.error('Montant invalide'); return }
    if (parseFloat(paymentForm.amount) > maxAmount) { toast.error(`Le montant ne peut pas dépasser le solde restant (${formatGNF(maxAmount)})`); return }
    setSaving(true)
    const { data: paymentData } = await supabase.from('payments').insert({
      invoice_id: paymentDialog.id,
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || null,
    }).select().single()
    const newPaid = (paymentDialog.paid_amount || 0) + parseFloat(paymentForm.amount)
    const newStatus = newPaid >= paymentDialog.total_amount ? 'payee' : newPaid > 0 ? 'partielle' : 'impayee'
    await supabase.from('invoices').update({ paid_amount: newPaid, status: newStatus }).eq('id', paymentDialog.id)
    // Notification si facture entièrement payée
    if (newStatus === 'payee' && profile?.id) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: `✅ Facture ${paymentDialog.invoice_number} payée`,
        message: `${paymentDialog.clients?.company_name || 'Client'} — ${formatGNF(paymentDialog.total_amount)} GNF encaissés`,
        type: 'success',
        link: '/dashboard/invoices',
        is_read: false,
      })
    }
    toast.success('Paiement enregistré', {
        action: { label: 'Télécharger le reçu', onClick: () => {
          const p = paymentData || { id: crypto.randomUUID(), amount: parseFloat(paymentForm.amount), payment_method: paymentForm.payment_method, payment_date: paymentForm.payment_date, notes: paymentForm.notes || null }
          downloadPaymentReceipt(p, { ...paymentDialog, paid_amount: newPaid })
        }}
      })
    fetchInvoices()
    setPaymentDialog(null)
    setPaymentForm({ amount: '', payment_method: 'orange_money', payment_date: new Date().toISOString().split('T')[0], notes: '' })
    setSaving(false)
  }

  const filtered = invoices.filter(i => {
    const matchSearch = search === '' ||
      (i.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.clients?.company_name || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || i.status === filter
    return matchSearch && matchFilter
  })

  const totalCA = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalPending = invoices
    .filter(i => i.status !== 'payee')
    .reduce((s, i) => s + Math.max(0, (i.total_amount || 0) - (i.paid_amount || 0)), 0)
  const countUnpaid = invoices.filter(i => i.status === 'impayee').length

  const methodLabels: Record<string, string> = {
    orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave',
    cash: 'Espèces', bank_transfer: 'Virement bancaire', stripe: 'Stripe', autre: 'Autre'
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Factures</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{invoices.length} factures · {formatGNF(totalCA)} encaissés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 hidden sm:flex">
            <FileDown className="h-4 w-4" /> Exporter
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total encaissé</p>
            <p className="text-lg md:text-xl font-bold text-emerald-600">{formatGNF(totalCA)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">En attente</p>
            <p className="text-lg md:text-xl font-bold text-amber-600">{formatGNF(totalPending)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Impayées</p>
            <p className="text-lg md:text-xl font-bold text-red-600">{countUnpaid}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets Factures / Reçus */}
      <Tabs defaultValue="factures">
        <TabsList className="mb-4">
          <TabsTrigger value="factures" className="gap-2">
            <Receipt className="h-4 w-4" /> Factures
          </TabsTrigger>
          <TabsTrigger value="recus" className="gap-2">
            <Download className="h-4 w-4" /> Reçus de paiement
            {payments.length > 0 && (
              <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{payments.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet Factures ── */}
        <TabsContent value="factures" className="space-y-4 mt-0">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par numéro, client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5">
              {[
                { key: 'all', label: 'Toutes' },
                { key: 'impayee', label: 'Impayées' },
                { key: 'partielle', label: 'Partielles' },
                { key: 'payee', label: 'Payées' },
              ].map(f => (
                <Button key={f.key} variant={filter === f.key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f.key)} className="text-xs">
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">Aucune facture trouvée</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Crée ta première facture en cliquant sur "Nouvelle facture"</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="h-4 w-4" />Créer une facture</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(inv => {
            const balance = (inv.total_amount || 0) - (inv.paid_amount || 0)
            const progress = inv.total_amount > 0 ? ((inv.paid_amount || 0) / inv.total_amount) * 100 : 0
            const cfg = statusConfig[inv.status] || statusConfig.impayee
            const isOverdue = inv.due_date && inv.status !== 'payee' && new Date(inv.due_date) < new Date()

            return (
              <Card key={inv.id} className="border-border/50 hover:border-primary/20 transition-all hover:shadow-sm group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icône */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Receipt className="h-5 w-5 text-indigo-500" />
                    </div>

                    {/* Info principale */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold font-mono text-sm">{inv.invoice_number}</span>
                        <Badge variant="outline" className={cn('text-xs border', cfg.bg, cfg.color)}>{cfg.label}</Badge>
                        {isOverdue && <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-600">En retard</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {inv.clients && <span className="text-sm text-muted-foreground">{inv.clients.company_name}</span>}
                        {inv.invoice_date && <span className="text-xs text-muted-foreground/60">{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</span>}
                        {inv._items?.length > 0 && <span className="text-xs text-muted-foreground/60">{inv._items.length} ligne{inv._items.length > 1 ? 's' : ''}</span>}
                      </div>
                      {/* Barre de progression paiement */}
                      {inv.status !== 'payee' && inv.total_amount > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>

                      {/* Montants */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatGNF(inv.total_amount || 0)}</p>
                        {inv.status === 'payee' ? (
                          <p className="text-xs text-emerald-600 font-medium">Payée intégralement</p>
                        ) : (
                          <>
                            {(inv.paid_amount || 0) > 0 && (
                              <p className="text-xs text-emerald-600">Payé: {formatGNF(inv.paid_amount)}</p>
                            )}
                            {balance > 0 && (
                              <p className="text-xs font-bold text-red-600">Reste: {formatGNF(balance)}</p>
                            )}
                          </>
                        )}
                        {inv.due_date && (
                          <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                            {isOverdue ? 'Expiré' : 'Éch.'} {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Bouton Télécharger Facture — toujours visible */}
                          <Button
                            variant="outline" size="sm"
                            className="gap-1.5 h-8 text-xs hidden sm:flex"
                            onClick={() => downloadInvoicePDF(inv)}
                          >
                            <FileDown className="h-3.5 w-3.5" /> Facture
                          </Button>
                          {inv.status !== 'payee' && (
                            <Button
                              variant="outline" size="sm"
                              className="gap-1.5 h-8 text-xs hidden sm:flex border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              onClick={() => {
                                setPaymentDialog(inv)
                                setPaymentForm(f => ({ ...f, amount: String(Math.max(0, balance)) }))
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Paiement
                            </Button>
                          )}
                          {isOverdue && (
                            <Button
                              variant="outline" size="sm"
                              className="gap-1.5 h-8 text-xs hidden sm:flex border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleRelance(inv)}
                            >
                              <Bell className="h-3.5 w-3.5" /> Relancer
                            </Button>
                          )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(inv)}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadInvoicePDF(inv)}>
                                <Download className="mr-2 h-4 w-4" /> Télécharger facture
                              </DropdownMenuItem>
                              {inv.status !== 'payee' && (
                                <DropdownMenuItem onClick={() => { setPaymentDialog(inv); setPaymentForm(f => ({ ...f, amount: String(Math.max(0, balance)) })) }}>
                                  <CreditCard className="mr-2 h-4 w-4" /> Enregistrer paiement
                                </DropdownMenuItem>
                              )}
                              {inv.status !== 'payee' && (
                                <DropdownMenuItem onClick={() => handleRelance(inv)} className="text-amber-600">
                                  <Bell className="mr-2 h-4 w-4" /> Envoyer relance
                                </DropdownMenuItem>
                              )}
                              {payments.filter(p => p.invoice_id === inv.id).length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  {payments.filter(p => p.invoice_id === inv.id).map((p, i) => (
                                    <DropdownMenuItem key={p.id} onClick={() => downloadPaymentReceipt(p, inv)}>
                                      <Receipt className="mr-2 h-4 w-4 text-emerald-600" />
                                      Reçu {i + 1} — {formatGNF(p.amount)}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </div>
        )}
        </TabsContent>

        {/* ── Onglet Reçus ── */}
        <TabsContent value="recus" className="mt-0">
          {payments.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="py-16 text-center">
                <Download className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">Aucun reçu disponible</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Les reçus apparaîtront ici après l'enregistrement d'un paiement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p, i) => {
                const inv = invoices.find(inv => inv.id === p.invoice_id)
                return (
                  <Card key={p.id} className="border-border/50 hover:border-emerald-200 transition-all hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Receipt className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">Reçu #{String(i + 1).padStart(3, '0')}</span>
                            <span className="font-mono text-xs text-muted-foreground">{inv?.invoice_number || '—'}</span>
                            <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                              {methodLabels[p.payment_method] || p.payment_method}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {inv?.clients?.company_name && (
                              <span className="text-sm text-muted-foreground">{inv.clients.company_name}</span>
                            )}
                            <span className="text-xs text-muted-foreground/60">
                              {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                            </span>
                            {p.notes && <span className="text-xs text-muted-foreground/60 italic">"{p.notes}"</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 mr-2">
                          <p className="font-bold text-emerald-600">{formatGNF(p.amount)}</p>
                          {inv && (
                            <p className="text-xs text-muted-foreground">/ {formatGNF(inv.total_amount || 0)}</p>
                          )}
                        </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 shrink-0 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold"
                            onClick={() => inv && downloadPaymentReceipt(p, inv)}
                          >
                            <Download className="h-4 w-4" /> Télécharger le reçu
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet création/édition */}
      <InvoiceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editInvoice={editInvoice}
        clients={clients}
        invoiceCount={(() => {
          const year = new Date().getFullYear()
          const maxNum = invoices.reduce((max, inv) => {
            const match = inv.invoice_number?.match(/FAC-\d{4}-(\d+)/)
            return match ? Math.max(max, parseInt(match[1], 10)) : max
          }, 0)
          return maxNum
        })()}
        onSaved={fetchInvoices}
      />

      {/* Dialog paiement */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          {paymentDialog && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted rounded-lg space-y-1.5">
                <p className="font-semibold font-mono text-sm mb-2">{paymentDialog.invoice_number} · {paymentDialog.clients?.company_name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total facture</span>
                  <span className="font-medium">{formatGNF(paymentDialog.total_amount || 0)}</span>
                </div>
                {(paymentDialog.paid_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Déjà payé</span>
                    <span className="text-emerald-600 font-medium">- {formatGNF(paymentDialog.paid_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1">
                  <span className="font-semibold">Reste à payer</span>
                  <span className="font-bold text-red-600">{formatGNF(Math.max(0, (paymentDialog.total_amount || 0) - (paymentDialog.paid_amount || 0)))}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Montant payé *</Label>
                <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Méthode</Label>
                <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="mtn_money">MTN Money</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Référence / Notes</Label>
                <Input placeholder="Réf. transaction..." value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setPaymentDialog(null)}>Annuler</Button>
                <Button onClick={handlePayment} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
