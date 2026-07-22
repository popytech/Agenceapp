'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Plus, Search, Edit, Trash2, Package, TrendingUp,
  Clock, RotateCcw, Tag, Layers, X, Check, DollarSign,
  Palette, Globe, Film, Code, Megaphone, Settings2, Percent,
  AlertTriangle, CheckCircle2, PauseCircle, XCircle, Calendar, Star,
  User, Download,
} from 'lucide-react'
import { downloadServicesCatalogPDF, downloadPacksCatalogPDF, downloadSubscriptionsPDF } from '@/lib/pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn, formatGNF } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Service {
  id: string
  name: string
  category: string
  description: string | null
  price: number
  production_cost: number
  delivery_time: number
  revisions_included: number
  livrables: string | null
  production_responsible: string | null
  is_recurring: boolean
  is_active: boolean
  created_at: string
}

interface PackService {
  id: string
  service_id: string
  quantity: number
  services: Service
}

interface Pack {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  discount_percent: number
  is_active: boolean
  created_at: string
  pack_services?: PackService[]
}

interface Client { id: string; name?: string; company_name?: string }
interface ServiceRef { id: string; name: string; category: string }
interface PackRef { id: string; name: string }

interface Subscription {
  id: string
  client_id: string
  service_id: string | null
  pack_id: string | null
  monthly_price: number
  start_date: string
  next_billing_date: string | null
  commitment_months: number
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  notes: string | null
  created_at: string
  clients?: Client
  services?: ServiceRef
  packs?: PackRef
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Design', 'Video', 'Web', 'Digital', 'Photo', 'Autre']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Design: <Palette className="h-3.5 w-3.5" />,
  Video: <Film className="h-3.5 w-3.5" />,
  Web: <Code className="h-3.5 w-3.5" />,
  Digital: <Megaphone className="h-3.5 w-3.5" />,
  Photo: <Globe className="h-3.5 w-3.5" />,
  Autre: <Settings2 className="h-3.5 w-3.5" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Design: 'bg-[#6A00FF]/10 text-[#6A00FF] border-[#6A00FF]/30',
  Video:  'bg-red-500/10 text-red-400 border-red-500/30',
  Web:    'bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/30',
  Digital:'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30',
  Photo:  'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Autre:  'bg-[#8A8F98]/10 text-[#8A8F98] border-[#8A8F98]/30',
}

const SUB_STATUS: Record<string, { label: string; color: string; Icon: React.FC<{className?:string}> }> = {
  active:    { label: 'Actif',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', Icon: CheckCircle2 },
  paused:    { label: 'Suspendu',  color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',   Icon: PauseCircle },
  cancelled: { label: 'Annulé',   color: 'bg-red-500/10 text-red-400 border-red-500/30',             Icon: XCircle },
  expired:   { label: 'Expiré',   color: 'bg-[#8A8F98]/10 text-[#8A8F98] border-[#8A8F98]/30',       Icon: AlertTriangle },
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// ─── TABS ──────────────────────────────────────────────────────────────────────

type Tab = 'services' | 'packs' | 'subscriptions'

const TABS: { id: Tab; label: string; icon: React.FC<{className?:string}>; color: string }[] = [
  { id: 'services',      label: 'Services',     icon: Package,    color: '#0066FF' },
  { id: 'packs',         label: 'Packs',        icon: Layers,     color: '#6A00FF' },
  { id: 'subscriptions', label: 'Abonnements',  icon: RotateCcw,  color: '#00E5FF' },
]

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default function ServicesPacksPage() {
  const [tab, setTab] = useState<Tab>('services')

  // shared data
  const [services,  setServices]  = useState<Service[]>([])
  const [packs,     setPacks]     = useState<Pack[]>([])
  const [subs,      setSubs]      = useState<Subscription[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: svcData },
      { data: pkData },
      { data: subData },
      { data: cliData },
    ] = await Promise.all([
      supabase.from('services').select('*').order('category').order('name'),
      supabase.from('packs').select('*, pack_services(id, service_id, quantity, services(*))').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, clients(id,company_name), services(id,name,category), packs(id,name)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, company_name').order('company_name'),
    ])
    setServices(svcData ?? [])
    setPacks(pkData ?? [])
    setSubs(subData ?? [])
    setClients(cliData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue commercial</h1>
          <p className="text-muted-foreground text-sm mt-1">Services, packs et abonnements récurrents</p>
        </div>
        <Button
          onClick={() => {
            if (tab === 'services') downloadServicesCatalogPDF(services)
            else if (tab === 'packs') downloadPacksCatalogPDF(packs)
            else downloadSubscriptionsPDF(subs)
          }}
          className="flex items-center gap-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white shrink-0"
        >
          <Download className="w-4 h-4" />
          Télécharger PDF
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border/50 w-fit mb-8">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              style={active ? { color: t.color } : {}}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenu selon onglet */}
      {tab === 'services' && (
        <ServicesTab
          services={services}
          loading={loading}
          onReload={load}
        />
      )}
      {tab === 'packs' && (
        <PacksTab
          packs={packs}
          services={services}
          loading={loading}
          onReload={load}
        />
      )}
      {tab === 'subscriptions' && (
        <SubscriptionsTab
          subs={subs}
          clients={clients}
          services={services}
          packs={packs}
          loading={loading}
          onReload={load}
          onSubsChange={setSubs}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ONGLET SERVICES
// ══════════════════════════════════════════════════════════════════════════════

function ServicesTab({ services, loading, onReload }: {
  services: Service[]
  loading: boolean
  onReload: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<Partial<Service>>({})
  const [saving, setSaving] = useState(false)

  const EMPTY: Partial<Service> = {
    name: '', category: 'Design', description: '', price: 0,
    production_cost: 0, delivery_time: 7, revisions_included: 2,
    livrables: '', production_responsible: '', is_recurring: false, is_active: true,
  }

  function openNew()        { setEditing(null);  setForm(EMPTY); setShowForm(true) }
  function openEdit(s: Service) { setEditing(s); setForm({ ...s }); setShowForm(true) }

  async function save() {
    if (!form.name || !form.category) return toast.error('Nom et catégorie requis')
    setSaving(true)
    const payload = {
      name: form.name, category: form.category,
      description: form.description || null,
      price: Number(form.price) || 0,
      production_cost: Number(form.production_cost) || 0,
      delivery_time: Number(form.delivery_time) || 7,
      revisions_included: Number(form.revisions_included) || 0,
      livrables: form.livrables || null,
      production_responsible: form.production_responsible || null,
      is_recurring: form.is_recurring ?? false,
      is_active: form.is_active ?? true,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      const { error } = await supabase.from('services').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur mise à jour'); setSaving(false); return }
      await supabase.from('service_margins').upsert({ service_id: editing.id, selling_price: payload.price, production_cost: payload.production_cost, updated_at: new Date().toISOString() }, { onConflict: 'service_id' })
      toast.success('Service mis à jour')
    } else {
      const { data, error } = await supabase.from('services').insert(payload).select().single()
      if (error || !data) { toast.error('Erreur création'); setSaving(false); return }
      await supabase.from('service_margins').insert({ service_id: data.id, selling_price: payload.price, production_cost: payload.production_cost })
      toast.success('Service créé')
    }
    setSaving(false); setShowForm(false); onReload()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce service ?')) return
    await supabase.from('services').delete().eq('id', id)
    toast.success('Service supprimé'); onReload()
  }

  const filtered = services.filter(s => {
    const matchS = s.name.toLowerCase().includes(search.toLowerCase())
    const matchC = activeCategory === 'Tous' || s.category === activeCategory
    return matchS && matchC
  })

  const totalCA  = services.reduce((a, s) => a + s.price, 0)
  const avgMargin = services.length
    ? Math.round(services.reduce((a, s) => a + (s.price > 0 ? (s.price - s.production_cost) / s.price * 100 : 0), 0) / services.length)
    : 0
  const recurring = services.filter(s => s.is_recurring).length

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Services', value: services.length, icon: <Package className="h-5 w-5 text-[#0066FF]" />, color: 'text-[#0066FF]' },
          { label: 'Valeur catalogue', value: formatGNF(totalCA), icon: <DollarSign className="h-5 w-5 text-[#00E5FF]" />, color: 'text-[#00E5FF]' },
          { label: 'Marge moyenne', value: `${avgMargin}%`, icon: <TrendingUp className="h-5 w-5 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Récurrents', value: recurring, icon: <RotateCcw className="h-5 w-5 text-[#6A00FF]" />, color: 'text-[#6A00FF]' },
        ].map(s => (
          <Card key={s.label} className="border border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn('text-xl font-bold mt-0.5', s.color)}>{s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres + bouton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap flex-1">
          {['Tous', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                activeCategory === cat ? 'bg-[#0066FF] text-white border-[#0066FF]' : 'border-border text-muted-foreground hover:border-[#0066FF]/50'
              )}
            >{cat}</button>
          ))}
        </div>
        <Button onClick={openNew} className="bg-[#0066FF] hover:bg-[#0066FF]/90 text-white gap-2 shrink-0">
          <Plus className="h-4 w-4" />Nouveau service
        </Button>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun service trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => {
            const margin = s.price > 0 ? Math.round((s.price - s.production_cost) / s.price * 100) : 0
            return (
              <Card key={s.id} className={cn('border border-border/50 hover:border-[#0066FF]/40 transition-all group', !s.is_active && 'opacity-50')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS['Autre'])}>
                        {CATEGORY_ICONS[s.category]}{s.category}
                      </span>
                      {s.is_recurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#6A00FF]/10 text-[#6A00FF] border border-[#6A00FF]/30">
                          <RotateCcw className="h-3 w-3" /> Récurrent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-[#0066FF]/10 text-muted-foreground hover:text-[#0066FF]"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
                  {s.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.description}</p>}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-[#0066FF]/5 rounded-lg p-2.5 border border-[#0066FF]/20">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Prix vente</p>
                      <p className="text-sm font-bold text-[#0066FF]">{formatGNF(s.price)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Coût prod.</p>
                      <p className="text-sm font-bold">{formatGNF(s.production_cost)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.delivery_time}j</span>
                      <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{s.revisions_included} rév.</span>
                    </div>
                    <span className={cn('flex items-center gap-1 font-semibold', margin >= 50 ? 'text-emerald-400' : margin >= 30 ? 'text-[#00E5FF]' : 'text-orange-400')}>
                      <TrendingUp className="h-3 w-3" />Marge {margin}%
                    </span>
                  </div>
                  {s.livrables && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-1">Livrables</p>
                      <p className="text-xs text-foreground/80">{s.livrables}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal service */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0066FF]">
              <Package className="h-5 w-5" />
              {editing ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Nom du service *</Label>
              <Input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Logo & Identité visuelle" className="mt-1.5" />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={form.category ?? 'Design'} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable production</Label>
              <Input value={form.production_responsible ?? ''} onChange={e => setForm(p => ({ ...p, production_responsible: e.target.value }))} placeholder="Ex: Designer senior" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Prix de vente (GNF)</Label>
              <Input type="number" value={form.price ?? 0} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Coût de production (GNF)</Label>
              <Input type="number" value={form.production_cost ?? 0} onChange={e => setForm(p => ({ ...p, production_cost: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Délai livraison (jours)</Label>
              <Input type="number" value={form.delivery_time ?? 7} onChange={e => setForm(p => ({ ...p, delivery_time: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Révisions incluses</Label>
              <Input type="number" value={form.revisions_included ?? 2} onChange={e => setForm(p => ({ ...p, revisions_included: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Livrables</Label>
              <Input value={form.livrables ?? ''} onChange={e => setForm(p => ({ ...p, livrables: e.target.value }))} placeholder="Ex: Logo PNG/SVG/PDF, charte couleurs" className="mt-1.5" />
            </div>
            {(form.price ?? 0) > 0 && (
              <div className="sm:col-span-2 bg-[#0066FF]/5 border border-[#0066FF]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#0066FF] mb-2">Aperçu rentabilité</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Marge brute</p>
                    <p className="font-bold text-[#00E5FF]">{formatGNF((form.price ?? 0) - (form.production_cost ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Marge %</p>
                    <p className="font-bold text-emerald-400">{(form.price ?? 0) > 0 ? Math.round(((form.price ?? 0) - (form.production_cost ?? 0)) / (form.price ?? 1) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_recurring ?? false} onCheckedChange={v => setForm(p => ({ ...p, is_recurring: v }))} />
              <Label>Service récurrent (abonnement)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Service actif</Label>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-[#0066FF] hover:bg-[#0066FF]/90 text-white">
              {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le service'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ONGLET PACKS
// ══════════════════════════════════════════════════════════════════════════════

function PacksTab({ packs, services, loading, onReload }: {
  packs: Pack[]
  services: Service[]
  loading: boolean
  onReload: () => void
}) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Pack | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: 0, duration_days: 30, discount_percent: 0, is_active: true })
  const [selectedServices, setSelectedServices] = useState<{ service_id: string; quantity: number }[]>([])
  const [saving, setSaving] = useState(false)

  function openNew() {
    setEditing(null)
    setForm({ name: '', description: '', price: 0, duration_days: 30, discount_percent: 0, is_active: true })
    setSelectedServices([])
    setShowForm(true)
  }

  function openEdit(p: Pack) {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', price: p.price, duration_days: p.duration_days, discount_percent: p.discount_percent, is_active: p.is_active })
    setSelectedServices((p.pack_services ?? []).map(ps => ({ service_id: ps.service_id, quantity: ps.quantity })))
    setShowForm(true)
  }

  function toggleService(id: string) {
    setSelectedServices(prev => prev.find(s => s.service_id === id) ? prev.filter(s => s.service_id !== id) : [...prev, { service_id: id, quantity: 1 }])
  }
  function updateQty(id: string, qty: number) {
    setSelectedServices(prev => prev.map(s => s.service_id === id ? { ...s, quantity: qty } : s))
  }

  const suggestedPrice = selectedServices.reduce((sum, sel) => {
    const svc = services.find(s => s.id === sel.service_id)
    return sum + (svc?.price ?? 0) * sel.quantity
  }, 0)
  const discountedPrice = Math.round(suggestedPrice * (1 - form.discount_percent / 100))

  async function save() {
    if (!form.name) return toast.error('Nom du pack requis')
    setSaving(true)
    const payload = {
      name: form.name, description: form.description || null,
      price: Number(form.price) || discountedPrice,
      duration_days: Number(form.duration_days) || 30,
      discount_percent: Number(form.discount_percent) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }
    let packId = editing?.id
    if (editing) {
      const { error } = await supabase.from('packs').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur'); setSaving(false); return }
      await supabase.from('pack_services').delete().eq('pack_id', editing.id)
    } else {
      const { data, error } = await supabase.from('packs').insert(payload).select().single()
      if (error || !data) { toast.error('Erreur'); setSaving(false); return }
      packId = data.id
    }
    if (selectedServices.length > 0 && packId) {
      await supabase.from('pack_services').insert(selectedServices.map(s => ({ pack_id: packId, service_id: s.service_id, quantity: s.quantity })))
    }
    toast.success(editing ? 'Pack mis à jour' : 'Pack créé')
    setSaving(false); setShowForm(false); onReload()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce pack ?')) return
    await supabase.from('packs').delete().eq('id', id)
    toast.success('Pack supprimé'); onReload()
  }

  const filtered = packs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="border border-border/50"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Packs</p><p className="text-xl font-bold text-[#6A00FF] mt-0.5">{packs.length}</p></div>
          <Layers className="h-5 w-5 text-[#6A00FF]" />
        </CardContent></Card>
        <Card className="border border-border/50"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Entrée de gamme</p><p className="text-xl font-bold text-[#00E5FF] mt-0.5">{formatGNF(packs.length ? Math.min(...packs.map(p => p.price)) : 0)}</p></div>
          <Tag className="h-5 w-5 text-[#00E5FF]" />
        </CardContent></Card>
        <Card className="border border-border/50"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Pack premium</p><p className="text-xl font-bold text-amber-400 mt-0.5">{formatGNF(packs.length ? Math.max(...packs.map(p => p.price)) : 0)}</p></div>
          <Star className="h-5 w-5 text-amber-400" />
        </CardContent></Card>
      </div>

      {/* Filtres + bouton */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un pack..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="bg-[#6A00FF] hover:bg-[#6A00FF]/90 text-white gap-2">
          <Plus className="h-4 w-4" />Nouveau pack
        </Button>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Aucun pack trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(pack => {
            const total = (pack.pack_services ?? []).reduce((s, ps) => s + (ps.services?.price ?? 0) * ps.quantity, 0)
            const savings = total - pack.price
            return (
              <Card key={pack.id} className={cn('border border-border/50 hover:border-[#6A00FF]/40 transition-all group overflow-hidden', !pack.is_active && 'opacity-50')}>
                <div className="h-1.5 bg-gradient-to-r from-[#6A00FF] via-[#0066FF] to-[#00E5FF]" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{pack.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{pack.pack_services?.length ?? 0} service(s) inclus</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(pack)} className="p-1.5 rounded-lg hover:bg-[#6A00FF]/10 text-muted-foreground hover:text-[#6A00FF]"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(pack.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {pack.description && <p className="text-xs text-muted-foreground mb-3">{pack.description}</p>}
                  {(pack.pack_services ?? []).length > 0 && (
                    <div className="space-y-1 mb-3">
                      {(pack.pack_services ?? []).map(ps => (
                        <div key={ps.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-[#00E5FF] shrink-0" />
                          <span>{ps.services?.name}{ps.quantity > 1 ? ` ×${ps.quantity}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-border/50 pt-3 mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Prix pack</p>
                      <p className="text-xl font-bold text-[#6A00FF]">{formatGNF(pack.price)}</p>
                    </div>
                    <div className="text-right">
                      {savings > 0 && <>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Économie</p>
                        <p className="text-sm font-semibold text-emerald-400">−{formatGNF(savings)}</p>
                      </>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /><span>{pack.duration_days}j</span>
                    {pack.discount_percent > 0 && <><Percent className="h-3 w-3 ml-1" /><span className="text-emerald-400 font-medium">{pack.discount_percent}% remise</span></>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal pack */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#6A00FF]">
              <Layers className="h-5 w-5" />{editing ? 'Modifier le pack' : 'Nouveau pack'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom du pack *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Pack Business Digital" className="mt-1.5" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1.5" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Durée (jours)</Label>
                <Input type="number" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: Number(e.target.value) }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Remise (%)</Label>
                <Input type="number" min="0" max="100" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: Number(e.target.value) }))} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Services inclus</Label>
              <div className="border border-border/50 rounded-xl divide-y divide-border/50 max-h-56 overflow-y-auto">
                {services.map(svc => {
                  const sel = selectedServices.find(s => s.service_id === svc.id)
                  return (
                    <div key={svc.id} className={cn('flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors', sel && 'bg-[#6A00FF]/5')}>
                      <button onClick={() => toggleService(svc.id)}
                        className={cn('h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors', sel ? 'bg-[#6A00FF] border-[#6A00FF]' : 'border-border')}>
                        {sel && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.category} · {formatGNF(svc.price)}</p>
                      </div>
                      {sel && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(svc.id, Math.max(1, (sel.quantity ?? 1) - 1))} className="h-5 w-5 rounded bg-muted flex items-center justify-center text-xs">-</button>
                          <span className="text-xs w-4 text-center">{sel.quantity}</span>
                          <button onClick={() => updateQty(svc.id, (sel.quantity ?? 1) + 1)} className="h-5 w-5 rounded bg-muted flex items-center justify-center text-xs">+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {suggestedPrice > 0 && (
              <div className="bg-[#6A00FF]/5 border border-[#6A00FF]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6A00FF] mb-3">Calcul automatique</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-[10px] text-muted-foreground mb-1">Valeur services</p><p className="font-bold">{formatGNF(suggestedPrice)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">Après remise {form.discount_percent}%</p><p className="font-bold text-[#6A00FF]">{formatGNF(discountedPrice)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">Économie client</p><p className="font-bold text-emerald-400">{formatGNF(suggestedPrice - discountedPrice)}</p></div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, price: discountedPrice }))} className="mt-3 text-xs text-[#6A00FF] hover:underline">Utiliser ce prix →</button>
              </div>
            )}
            <div>
              <Label>Prix du pack (GNF)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Pack actif</Label>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-[#6A00FF] hover:bg-[#6A00FF]/90 text-white">
              {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le pack'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ONGLET ABONNEMENTS
// ══════════════════════════════════════════════════════════════════════════════

function SubscriptionsTab({ subs, clients, services, packs, loading, onReload, onSubsChange }: {
  subs: Subscription[]
  clients: Client[]
  services: Service[]
  packs: PackRef[]
  loading: boolean
  onReload: () => void
  onSubsChange: (subs: Subscription[]) => void
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [saving, setSaving] = useState(false)

  const EMPTY = {
    client_id: '', service_id: '', pack_id: '', monthly_price: 0,
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: '', commitment_months: 1,
    status: 'active' as Subscription['status'], notes: '',
  }
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)

  function openNew()             { setEditing(null);  setForm(EMPTY); setShowForm(true) }
  function openEdit(s: Subscription) {
    setEditing(s)
    setForm({
      client_id: s.client_id, service_id: s.service_id ?? '',
      pack_id: s.pack_id ?? '', monthly_price: s.monthly_price,
      start_date: s.start_date, next_billing_date: s.next_billing_date ?? '',
      commitment_months: s.commitment_months, status: s.status, notes: s.notes ?? '',
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.client_id) return toast.error('Client requis')
    if (!form.service_id && !form.pack_id) return toast.error('Service ou pack requis')
    setSaving(true)
    const payload = {
      client_id: form.client_id, service_id: form.service_id || null,
      pack_id: form.pack_id || null, monthly_price: Number(form.monthly_price) || 0,
      start_date: form.start_date || new Date().toISOString().split('T')[0],
      next_billing_date: form.next_billing_date || addMonths(form.start_date, 1),
      commitment_months: Number(form.commitment_months) || 1,
      status: form.status, notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', editing.id)
      if (error) { toast.error('Erreur'); setSaving(false); return }
      toast.success('Abonnement mis à jour')
    } else {
      const { error } = await supabase.from('subscriptions').insert(payload)
      if (error) { toast.error('Erreur'); setSaving(false); return }
      toast.success('Abonnement créé')
    }
    setSaving(false); setShowForm(false); onReload()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet abonnement ?')) return
    await supabase.from('subscriptions').delete().eq('id', id)
    toast.success('Supprimé'); onReload()
  }

  async function changeStatus(id: string, status: Subscription['status']) {
    await supabase.from('subscriptions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    onSubsChange(subs.map(s => s.id === id ? { ...s, status } : s))
    toast.success('Statut mis à jour')
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = subs.filter(s => {
      const matchS = (s.clients?.company_name ?? '').toLowerCase().includes(search.toLowerCase())
      || (s.services?.name ?? '').toLowerCase().includes(search.toLowerCase())
      || (s.packs?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchSt = filterStatus === 'all' || s.status === filterStatus
    return matchS && matchSt
  })

  const activeSubs = subs.filter(s => s.status === 'active')
  const mrr = activeSubs.reduce((a, s) => a + s.monthly_price, 0)
  const arr = mrr * 12
  const dueSoon = subs.filter(s => s.status === 'active' && s.next_billing_date && s.next_billing_date <= today).length

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'MRR (mensuel)',    value: formatGNF(mrr),          color: 'text-[#00E5FF]',    icon: <DollarSign className="h-5 w-5 text-[#00E5FF]" /> },
          { label: 'ARR (annuel)',     value: formatGNF(arr),          color: 'text-[#0066FF]',    icon: <TrendingUp className="h-5 w-5 text-[#0066FF]" /> },
          { label: 'Actifs',          value: activeSubs.length,        color: 'text-emerald-400',  icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" /> },
          { label: 'Dus ce mois',     value: dueSoon,                  color: dueSoon > 0 ? 'text-orange-400' : 'text-muted-foreground', icon: <AlertTriangle className="h-5 w-5 text-orange-400" /> },
        ].map(s => (
          <Card key={s.label} className="border border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className={cn('text-xl font-bold mt-0.5', s.color)}>{s.value}</p></div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres + bouton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap flex-1">
          {['all', 'active', 'paused', 'cancelled', 'expired'].map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                filterStatus === st ? 'bg-[#00E5FF] text-black border-[#00E5FF]' : 'border-border text-muted-foreground hover:border-[#00E5FF]/50'
              )}
            >{st === 'all' ? 'Tous' : SUB_STATUS[st]?.label}</button>
          ))}
        </div>
        <Button onClick={openNew} className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black gap-2 shrink-0">
          <Plus className="h-4 w-4" />Nouvel abonnement
        </Button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Aucun abonnement trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const cfg = SUB_STATUS[sub.status]
            const StatusIcon = cfg.Icon
            const isOverdue = sub.next_billing_date && sub.next_billing_date < today && sub.status === 'active'
            return (
              <Card key={sub.id} className={cn('border border-border/50 hover:border-[#00E5FF]/40 transition-all group', isOverdue && 'border-orange-500/40')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{sub.clients?.company_name ?? '—'}</span>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', cfg.color)}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
                            <AlertTriangle className="h-3 w-3" />En retard
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {sub.services && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{sub.services.name}</span>}
                        {sub.packs && <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{sub.packs.name}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(sub.start_date).toLocaleDateString('fr-FR')}</span>
                        {sub.next_billing_date && (
                          <span className={cn('flex items-center gap-1', isOverdue && 'text-orange-400 font-medium')}>
                            <RotateCcw className="h-3 w-3" />{new Date(sub.next_billing_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <span>{sub.commitment_months} mois</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#00E5FF]">{formatGNF(sub.monthly_price)}<span className="text-xs text-muted-foreground font-normal">/mois</span></p>
                      <p className="text-xs text-muted-foreground">{formatGNF(sub.monthly_price * 12)}/an</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sub.status === 'active' && (
                        <button onClick={() => changeStatus(sub.id, 'paused')} className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400" title="Suspendre">
                          <PauseCircle className="h-4 w-4" />
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button onClick={() => changeStatus(sub.id, 'active')} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400" title="Réactiver">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(sub)} className="p-1.5 rounded-lg hover:bg-[#00E5FF]/10 text-muted-foreground hover:text-[#00E5FF]"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => remove(sub.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal abonnement */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#00E5FF]">
              <RotateCcw className="h-5 w-5" />{editing ? "Modifier l'abonnement" : 'Nouvel abonnement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name ?? c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service récurrent</Label>
                <Select value={form.service_id || 'none'} onValueChange={v => setForm(p => ({ ...p, service_id: v === 'none' ? '' : v, pack_id: '' }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir un service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Aucun --</SelectItem>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ou Pack</Label>
                <Select value={form.pack_id || 'none'} onValueChange={v => setForm(p => ({ ...p, pack_id: v === 'none' ? '' : v, service_id: '' }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir un pack" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Aucun --</SelectItem>
                  {packs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix mensuel (GNF)</Label>
                <Input type="number" value={form.monthly_price} onChange={e => setForm(p => ({ ...p, monthly_price: Number(e.target.value) }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Engagement (mois)</Label>
                <Input type="number" min="1" value={form.commitment_months} onChange={e => setForm(p => ({ ...p, commitment_months: Number(e.target.value) }))} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value, next_billing_date: addMonths(e.target.value, p.commitment_months) }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Prochain renouvellement</Label>
                <Input type="date" value={form.next_billing_date} onChange={e => setForm(p => ({ ...p, next_billing_date: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v: Subscription['status']) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SUB_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1.5" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black">
              {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
