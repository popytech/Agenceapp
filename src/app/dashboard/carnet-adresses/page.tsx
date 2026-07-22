'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { BookUser, Building2, Phone, Mail, Globe, Plus, Search, Copy, Star, Trash2, Pencil, Database, Download, LayoutGrid, Table2, MessageCircle, ExternalLink, Upload, BellRing, Eye, Flame, CircleDashed, CheckCircle2, Clock3 } from 'lucide-react'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}

type Interaction = {
  id: string
  type: 'appel' | 'email' | 'whatsapp' | 'rdv' | 'note'
  note: string
  created_at: string
}

type Contact = {
  id: string
  full_name: string
  company: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  city: string | null
  sector: string | null
  relation_type: string | null
  tags: string | null
  notes: string | null
  is_favorite: boolean
  follow_up_date?: string | null
  status?: 'a_suivre' | 'chaud' | 'signe' | 'inactif'
  priority?: 'basse' | 'moyenne' | 'haute'
  interactions?: Interaction[]
  created_by: string | null
  created_at: string
}

const CONTACTS_FALLBACK_KEY = 'erp_business_contacts_fallback'
const EMPTY = {
  full_name: '', company: '', job_title: '', email: '', phone: '', whatsapp: '', website: '', city: '', sector: '',
  relation_type: 'partenaire', tags: '', notes: '', is_favorite: false, follow_up_date: '', status: 'a_suivre', priority: 'moyenne',
}

function parseNotesMeta(raw: any) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}
  return null
}

function normalizeContact(value: any): Contact {
  const meta = parseNotesMeta(value.notes)
  const plainNotes = meta?.plain_notes ?? (typeof value.notes === 'string' && !value.notes.trim().startsWith('{') ? value.notes : '')
  return {
    id: String(value.id),
    full_name: String(value.full_name || ''),
    company: value.company || null,
    job_title: value.job_title || null,
    email: value.email || null,
    phone: value.phone || null,
    whatsapp: value.whatsapp || null,
    website: value.website || null,
    city: value.city || null,
    sector: value.sector || null,
    relation_type: value.relation_type || 'partenaire',
    tags: value.tags || null,
    notes: plainNotes || null,
    is_favorite: Boolean(value.is_favorite),
    follow_up_date: value.follow_up_date || null,
    status: meta?.status || 'a_suivre',
    priority: meta?.priority || 'moyenne',
    interactions: Array.isArray(meta?.interactions) ? meta.interactions : [],
    created_by: value.created_by || null,
    created_at: value.created_at || new Date().toISOString(),
  }
}

function serializeContact(contact: Contact) {
  return {
    ...contact,
    notes: JSON.stringify({
      plain_notes: contact.notes || '',
      status: contact.status || 'a_suivre',
      priority: contact.priority || 'moyenne',
      interactions: contact.interactions || [],
    }),
  }
}

async function loadFallbackContacts() {
  const { data } = await supabase.from('settings').select('value').eq('key', CONTACTS_FALLBACK_KEY).maybeSingle()
  const raw = Array.isArray(data?.value) ? data.value : []
  return raw.map(normalizeContact)
}

async function saveFallbackContacts(contacts: Contact[]) {
  return supabase.from('settings').upsert({
    key: CONTACTS_FALLBACK_KEY,
    value: contacts.map(serializeContact),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
}

export default function CarnetAdressesPage() {
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRelation, setFilterRelation] = useState('all')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [editing, setEditing] = useState<Contact | null>(null)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [interactionText, setInteractionText] = useState('')
  const [interactionType, setInteractionType] = useState<'appel' | 'email' | 'whatsapp' | 'rdv' | 'note'>('note')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('business_contacts').select('*').order('is_favorite', { ascending: false }).order('full_name')
    const missing = error?.message?.includes('schema cache') || error?.message?.includes('relation') || error?.code === '42P01' || error?.code === 'PGRST205'
    setTableError(Boolean(missing))
    setContacts(missing ? await loadFallbackContacts() : (data || []).map(normalizeContact))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => contacts.filter(c => {
    const q = search.toLowerCase()
    const scoreText = [c.full_name, c.company, c.email, c.phone, c.city, c.sector, c.tags, c.status, c.priority].join(' ').toLowerCase()
    const matchSearch = scoreText.includes(q)
    const matchRelation = filterRelation === 'all' || c.relation_type === filterRelation
    return matchSearch && matchRelation
  }), [contacts, search, filterRelation])

  const today = new Date().toISOString().split('T')[0]
  const reminders = contacts.filter(c => c.follow_up_date && c.follow_up_date <= today)

  function contactScore(contact: Contact) {
    let score = 0
    if (contact.is_favorite) score += 20
    if (contact.email) score += 10
    if (contact.phone || contact.whatsapp) score += 10
    if (contact.company) score += 10
    if (contact.website) score += 5
    if (contact.status === 'chaud') score += 25
    if (contact.status === 'signe') score += 35
    if (contact.priority === 'haute') score += 15
    if ((contact.interactions || []).length > 0) score += Math.min((contact.interactions || []).length * 3, 15)
    return Math.min(score, 100)
  }

  const topContacts = [...contacts].sort((a, b) => contactScore(b) - contactScore(a)).slice(0, 5)
  const byRelation = ['partenaire','client_potentiel','prestataire','investisseur','mentor','media'].map(key => ({ key, count: contacts.filter(c => c.relation_type === key).length }))
  const avgScore = contacts.length ? Math.round(contacts.reduce((sum, c) => sum + contactScore(c), 0) / contacts.length) : 0

  const stats = {
    total: contacts.length,
    favorites: contacts.filter(c => c.is_favorite).length,
    hot: contacts.filter(c => c.status === 'chaud').length,
    signed: contacts.filter(c => c.status === 'signe').length,
    avgScore,
  }

  function statusBadge(status?: Contact['status']) {
    switch (status) {
      case 'chaud': return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Flame className="h-3 w-3 mr-1" />Chaud</Badge>
      case 'signe': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Signé</Badge>
      case 'inactif': return <Badge className="bg-slate-100 text-slate-700 border-slate-200"><CircleDashed className="h-3 w-3 mr-1" />Inactif</Badge>
      default: return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock3 className="h-3 w-3 mr-1" />À suivre</Badge>
    }
  }

  function priorityBadge(priority?: Contact['priority']) {
    if (priority === 'haute') return <Badge variant="destructive">Priorité haute</Badge>
    if (priority === 'basse') return <Badge variant="outline">Priorité basse</Badge>
    return <Badge variant="secondary">Priorité moyenne</Badge>
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true) }
  function openEdit(contact: Contact) {
    setEditing(contact)
    setForm({
      full_name: contact.full_name,
      company: contact.company || '',
      job_title: contact.job_title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      website: contact.website || '',
      city: contact.city || '',
      sector: contact.sector || '',
      relation_type: contact.relation_type || 'partenaire',
      tags: contact.tags || '',
      notes: contact.notes || '',
      is_favorite: contact.is_favorite,
      follow_up_date: contact.follow_up_date || '',
      status: contact.status || 'a_suivre',
      priority: contact.priority || 'moyenne',
    })
    setOpen(true)
  }
  function openDetail(contact: Contact) { setSelected(contact); setDetailOpen(true); setInteractionText(''); setInteractionType('note') }

  async function handleSave() {
    if (!form.full_name.trim()) return toast.error('Nom complet requis')
    setSaving(true)
    const payload = normalizeContact({
      ...form,
      id: editing?.id || crypto.randomUUID(),
      created_by: profile?.id || null,
      created_at: editing?.created_at || new Date().toISOString(),
      interactions: editing?.interactions || [],
    })

    let error: any = null
    if (tableError) {
      const current = await loadFallbackContacts()
      const next = editing ? current.map((c: Contact) => c.id === editing.id ? payload : c) : [payload, ...current]
      const result = await saveFallbackContacts(next)
      error = result.error
    } else {
      const dbPayload = serializeContact(payload)
      const result = editing
        ? await supabase.from('business_contacts').update(dbPayload).eq('id', editing.id)
        : await supabase.from('business_contacts').insert(dbPayload)
      error = result.error
    }

    setSaving(false)
    if (error) return toast.error(getErrorMessage(error, 'Enregistrement impossible'))
    toast.success(editing ? 'Contact mis à jour' : 'Contact ajouté')
    setOpen(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce contact ?')) return
    let error: any = null
    if (tableError) {
      const current = await loadFallbackContacts()
      const result = await saveFallbackContacts(current.filter((c: Contact) => c.id !== id))
      error = result.error
    } else {
      const result = await supabase.from('business_contacts').delete().eq('id', id)
      error = result.error
    }
    if (error) return toast.error(getErrorMessage(error, 'Suppression impossible'))
    toast.success('Contact supprimé')
    fetchAll()
  }

  async function toggleFavorite(contact: Contact) {
    const updated = { ...contact, is_favorite: !contact.is_favorite }
    if (tableError) {
      const current = await loadFallbackContacts()
      const result = await saveFallbackContacts(current.map((c: Contact) => c.id === contact.id ? updated : c))
      if (result.error) return toast.error(getErrorMessage(result.error, 'Mise à jour impossible'))
    } else {
      const { error } = await supabase.from('business_contacts').update({ is_favorite: !contact.is_favorite }).eq('id', contact.id)
      if (error) return toast.error(getErrorMessage(error, 'Mise à jour impossible'))
    }
    fetchAll()
  }

  async function addInteraction() {
    if (!selected || !interactionText.trim()) return toast.error('Note d’interaction requise')
    const updated: Contact = {
      ...selected,
      interactions: [{ id: crypto.randomUUID(), type: interactionType, note: interactionText.trim(), created_at: new Date().toISOString() }, ...(selected.interactions || [])],
    }
    let error: any = null
    if (tableError) {
      const current = await loadFallbackContacts()
      const result = await saveFallbackContacts(current.map((c: Contact) => c.id === selected.id ? updated : c))
      error = result.error
    } else {
      const result = await supabase.from('business_contacts').update({ notes: serializeContact(updated).notes }).eq('id', selected.id)
      error = result.error
    }
    if (error) return toast.error(getErrorMessage(error, 'Ajout impossible'))
    setSelected(updated)
    setInteractionText('')
    toast.success('Interaction ajoutée')
    fetchAll()
  }

  function exportCsv() {
    const headers = ['Nom', 'Entreprise', 'Fonction', 'Email', 'Téléphone', 'WhatsApp', 'Site web', 'Ville', 'Secteur', 'Relation', 'Statut', 'Priorité', 'Tags', 'Favori', 'Relance', 'Notes']
    const rows = filtered.map(c => [c.full_name, c.company || '', c.job_title || '', c.email || '', c.phone || '', c.whatsapp || '', c.website || '', c.city || '', c.sector || '', c.relation_type || '', c.status || '', c.priority || '', c.tags || '', c.is_favorite ? 'Oui' : 'Non', c.follow_up_date || '', (c.notes || '').replace(/\n/g, ' ')])
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'carnet-adresses-professionnel.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé')
  }

  async function importCsv(file: File) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return toast.error('CSV vide ou invalide')
    const parse = (line: string) => line.split(';').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
    const rows = lines.slice(1).map(parse)
    const imported = rows.map(cols => normalizeContact({ id: crypto.randomUUID(), full_name: cols[0] || '', company: cols[1] || '', job_title: cols[2] || '', email: cols[3] || '', phone: cols[4] || '', whatsapp: cols[5] || '', website: cols[6] || '', city: cols[7] || '', sector: cols[8] || '', relation_type: cols[9] || 'partenaire', status: cols[10] || 'a_suivre', priority: cols[11] || 'moyenne', tags: cols[12] || '', is_favorite: cols[13] === 'Oui', follow_up_date: cols[14] || '', notes: cols[15] || '', created_by: profile?.id || null, interactions: [] })).filter(c => c.full_name)
    if (imported.length === 0) return toast.error('Aucun contact valide détecté dans le CSV')
    if (tableError) {
      const current = await loadFallbackContacts()
      const result = await saveFallbackContacts([...imported, ...current])
      if (result.error) return toast.error(getErrorMessage(result.error, 'Import impossible'))
    } else {
      const { error } = await supabase.from('business_contacts').insert(imported.map(serializeContact))
      if (error) return toast.error(getErrorMessage(error, 'Import impossible'))
    }
    toast.success(`${imported.length} contact(s) importé(s)`)
    fetchAll()
  }

  function openEmail(email?: string | null) { if (!email) return toast.error('Aucun email disponible'); window.open(`mailto:${email}`, '_blank') }
  function openPhone(phone?: string | null) { if (!phone) return toast.error('Aucun téléphone disponible'); window.open(`tel:${phone}`, '_self') }
  function openWhatsApp(phone?: string | null) { if (!phone) return toast.error('Aucun numéro WhatsApp disponible'); const digits = phone.replace(/[^\d]/g, ''); window.open(`https://wa.me/${digits}`, '_blank') }
  function openWebsite(url?: string | null) { if (!url) return toast.error('Aucun site web disponible'); const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`; window.open(normalized, '_blank') }

  const SQL_CONTACTS = `create table if not exists public.business_contacts (\n  id uuid primary key default gen_random_uuid(),\n  full_name text not null,\n  company text, job_title text, email text, phone text, whatsapp text, website text,\n  city text, sector text, relation_type text default 'partenaire',\n  tags text, notes text, is_favorite boolean default false, follow_up_date date,\n  created_by uuid, created_at timestamptz default now()\n);\nalter table public.business_contacts enable row level security;\ncreate policy "business_contacts_all" on public.business_contacts using (true) with check (auth.uid() is not null);`

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {tableError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Table Supabase manquante</p>
              <p className="text-sm text-amber-700 mt-0.5">Le carnet d'adresses fonctionne grâce à un stockage de secours. Pour une vraie table dédiée, exécutez le SQL ci-dessous.</p>
            </div>
          </div>
          <div className="relative">
            <pre className="bg-amber-100 text-amber-900 text-xs rounded p-3 overflow-x-auto font-mono">{SQL_CONTACTS}</pre>
            <button className="absolute top-2 right-2 bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs px-2 py-1 rounded flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(SQL_CONTACTS); toast.success('SQL copié !') }}>
              <Copy className="h-3 w-3" /> Copier
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookUser className="h-6 w-6 text-primary" /> Carnet d'adresses professionnel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Répertoire entrepreneur, partenaires, prestataires, investisseurs et réseau d'affaires</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setView(view === 'table' ? 'grid' : 'table')}>{view === 'table' ? <LayoutGrid className="h-4 w-4 mr-2" /> : <Table2 className="h-4 w-4 mr-2" />}{view === 'table' ? 'Vue cartes' : 'Vue tableau'}</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Import CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) importCsv(file); e.currentTarget.value = '' }} />
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nouveau contact</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[{ label: 'Contacts', value: stats.total, icon: BookUser }, { label: 'Favoris', value: stats.favorites, icon: Star }, { label: 'Contacts chauds', value: stats.hot, icon: Flame }, { label: 'Signés', value: stats.signed, icon: CheckCircle2 }, { label: 'Score moyen', value: `${stats.avgScore}/100`, icon: BellRing }].map(item => {
          const Icon = item.icon
          return <Card key={item.label}><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-2xl font-black mt-1">{item.value}</p></div><div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div></CardContent></Card>
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-orange-700"><BellRing className="w-4 h-4" /> Relances à faire aujourd'hui</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reminders.length === 0 ? <p className="text-sm text-muted-foreground">Aucune relance aujourd'hui</p> : reminders.slice(0, 5).map(contact => <div key={contact.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm"><div><span className="font-medium">{contact.full_name}</span>{contact.company ? ` · ${contact.company}` : ''}</div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openWhatsApp(contact.whatsapp || contact.phone)}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button><Button size="sm" variant="outline" onClick={() => openEmail(contact.email)}><Mail className="h-4 w-4 mr-2" />Email</Button></div></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top contacts stratégiques</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topContacts.length === 0 ? <p className="text-sm text-muted-foreground">Aucun contact pour le moment</p> : topContacts.map(contact => <div key={contact.id} className="flex items-center justify-between gap-3"><div><p className="font-medium text-sm">{contact.full_name}</p><p className="text-xs text-muted-foreground">{contact.company || 'Sans entreprise'} · {contact.status || 'a_suivre'}</p></div><Badge variant="outline">{contactScore(contact)}/100</Badge></div>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Répartition du réseau</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {byRelation.map(item => <div key={item.key} className="rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between text-sm"><span className="capitalize text-muted-foreground">{item.key.replace('_', ' ')}</span><span className="font-bold">{item.count}</span></div><div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${contacts.length ? (item.count / contacts.length) * 100 : 0}%` }} /></div></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><div className="flex flex-col md:flex-row gap-3 md:items-center justify-between"><CardTitle className="text-base">Répertoire</CardTitle><div className="flex flex-col md:flex-row gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-full md:w-80" placeholder="Rechercher un contact, une société, un secteur..." value={search} onChange={e => setSearch(e.target.value)} /></div><Select value={filterRelation} onValueChange={setFilterRelation}><SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Relation" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les relations</SelectItem><SelectItem value="partenaire">Partenaire</SelectItem><SelectItem value="client_potentiel">Client potentiel</SelectItem><SelectItem value="prestataire">Prestataire</SelectItem><SelectItem value="investisseur">Investisseur</SelectItem><SelectItem value="mentor">Mentor</SelectItem><SelectItem value="media">Média / Presse</SelectItem></SelectContent></Select></div></div></CardHeader>
        {view === 'table' ? (
          <CardContent className="overflow-x-auto rounded-lg border border-border/40">
            <Table>
              <TableHeader><TableRow><TableHead>Contact</TableHead><TableHead>Statut</TableHead><TableHead>Entreprise</TableHead><TableHead>Coordonnées</TableHead><TableHead>Relance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun contact</TableCell></TableRow> : filtered.map(contact => <TableRow key={contact.id}><TableCell><div className="flex items-center gap-2"><button onClick={() => toggleFavorite(contact)} className="text-amber-500 hover:scale-110 transition-transform">{contact.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}</button><div><div className="font-medium text-sm">{contact.full_name}</div>{contact.job_title && <div className="text-xs text-muted-foreground">{contact.job_title}</div>}</div></div></TableCell><TableCell><div className="flex flex-col gap-1">{statusBadge(contact.status)}{priorityBadge(contact.priority)}</div></TableCell><TableCell><div className="font-medium">{contact.company || '—'}</div>{contact.sector && <div className="text-xs text-muted-foreground">{contact.sector}</div>}</TableCell><TableCell className="text-sm"><div className="space-y-1">{contact.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{contact.email}</div>}{(contact.phone || contact.whatsapp) && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{contact.whatsapp || contact.phone}</div>}</div></TableCell><TableCell>{contact.follow_up_date ? <Badge variant="outline">{contact.follow_up_date}</Badge> : '—'}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(contact)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openWhatsApp(contact.whatsapp || contact.phone)}><MessageCircle className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        ) : (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? <div className="col-span-full text-center py-8 text-muted-foreground">Chargement...</div> : filtered.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">Aucun contact</div> : filtered.map(contact => <div key={contact.id} className="rounded-xl border border-border/60 p-4 space-y-3 bg-card"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><button onClick={() => toggleFavorite(contact)} className="text-amber-500">{contact.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}</button><h3 className="font-semibold">{contact.full_name}</h3></div><p className="text-sm text-muted-foreground">{contact.job_title || '—'}{contact.company ? ` · ${contact.company}` : ''}</p></div><Badge variant="outline">{contactScore(contact)}/100</Badge></div><div className="flex flex-wrap gap-2">{statusBadge(contact.status)}{priorityBadge(contact.priority)}</div><div className="space-y-1 text-sm">{contact.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{contact.email}</div>}{(contact.whatsapp || contact.phone) && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{contact.whatsapp || contact.phone}</div>}{contact.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />{contact.website}</div>}{(contact.city || contact.sector) && <div className="text-muted-foreground">{[contact.city, contact.sector].filter(Boolean).join(' · ')}</div>}{contact.follow_up_date && <div className="text-xs text-orange-600 font-medium">Relance : {contact.follow_up_date}</div>}</div>{contact.tags && <p className="text-xs text-muted-foreground">{contact.tags}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => openDetail(contact)}><Eye className="h-4 w-4 mr-2" />Détail</Button><Button variant="outline" size="sm" onClick={() => openEmail(contact.email)}><Mail className="h-4 w-4 mr-2" />Email</Button><Button variant="outline" size="sm" onClick={() => openWhatsApp(contact.whatsapp || contact.phone)}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button><Button variant="outline" size="sm" onClick={() => openWebsite(contact.website)}><ExternalLink className="h-4 w-4 mr-2" />Site</Button></div><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}
          </CardContent>
        )}
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Détail du contact</DialogTitle></DialogHeader>{selected && <div className="space-y-4"><div><h3 className="text-lg font-semibold">{selected.full_name}</h3><p className="text-sm text-muted-foreground">{selected.job_title || '—'}{selected.company ? ` · ${selected.company}` : ''}</p></div><div className="flex flex-wrap gap-2">{statusBadge(selected.status)}{priorityBadge(selected.priority)}<Badge variant="outline">Score {contactScore(selected)}/100</Badge></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><span className="font-medium">Email :</span> {selected.email || '—'}</div><div><span className="font-medium">Téléphone :</span> {selected.phone || '—'}</div><div><span className="font-medium">WhatsApp :</span> {selected.whatsapp || '—'}</div><div><span className="font-medium">Site web :</span> {selected.website || '—'}</div><div><span className="font-medium">Ville :</span> {selected.city || '—'}</div><div><span className="font-medium">Secteur :</span> {selected.sector || '—'}</div><div><span className="font-medium">Relation :</span> {selected.relation_type || '—'}</div><div><span className="font-medium">Relance :</span> {selected.follow_up_date || '—'}</div></div>{selected.tags && <div><p className="font-medium text-sm mb-1">Tags</p><p className="text-sm text-muted-foreground">{selected.tags}</p></div>}{selected.notes && <div><p className="font-medium text-sm mb-1">Notes</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</p></div>}<div><p className="font-medium text-sm mb-2">Timeline des interactions</p><div className="space-y-2">{selected.interactions?.length ? selected.interactions.map(interaction => <div key={interaction.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between"><Badge variant="outline">{interaction.type}</Badge><span className="text-xs text-muted-foreground">{new Date(interaction.created_at).toLocaleString('fr-FR')}</span></div><p className="mt-2 text-muted-foreground">{interaction.note}</p></div>) : <p className="text-sm text-muted-foreground">Aucune interaction enregistrée</p>}</div><div className="mt-3 grid gap-3"><Select value={interactionType} onValueChange={v => setInteractionType(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="appel">Appel</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="rdv">Rendez-vous</SelectItem></SelectContent></Select><Textarea rows={3} placeholder="Ajouter une interaction..." value={interactionText} onChange={e => setInteractionText(e.target.value)} /><Button onClick={addInteraction}><Plus className="h-4 w-4 mr-2" />Ajouter à la timeline</Button></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openEmail(selected.email)}><Mail className="h-4 w-4 mr-2" />Email</Button><Button variant="outline" onClick={() => openWhatsApp(selected.whatsapp || selected.phone)}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button><Button variant="outline" onClick={() => openPhone(selected.phone)}><Phone className="h-4 w-4 mr-2" />Appeler</Button><Button variant="outline" onClick={() => openWebsite(selected.website)}><ExternalLink className="h-4 w-4 mr-2" />Site</Button></div></div>}</DialogContent></Dialog>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing ? 'Modifier le contact' : 'Nouveau contact professionnel'}</DialogTitle></DialogHeader><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Nom complet *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div><div className="space-y-2"><Label>Entreprise</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div><div className="space-y-2"><Label>Fonction</Label><Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div><div className="space-y-2"><Label>Type de relation</Label><Select value={form.relation_type} onValueChange={v => setForm(f => ({ ...f, relation_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="partenaire">Partenaire</SelectItem><SelectItem value="client_potentiel">Client potentiel</SelectItem><SelectItem value="prestataire">Prestataire</SelectItem><SelectItem value="investisseur">Investisseur</SelectItem><SelectItem value="mentor">Mentor</SelectItem><SelectItem value="media">Média / Presse</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Statut</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_suivre">À suivre</SelectItem><SelectItem value="chaud">Chaud</SelectItem><SelectItem value="signe">Signé</SelectItem><SelectItem value="inactif">Inactif</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Priorité</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basse">Basse</SelectItem><SelectItem value="moyenne">Moyenne</SelectItem><SelectItem value="haute">Haute</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div><div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div><div className="space-y-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} /></div><div className="space-y-2"><Label>Site web</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div><div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div><div className="space-y-2"><Label>Secteur</Label><Input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} /></div><div className="space-y-2"><Label>Date de relance</Label><Input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} /></div><div className="md:col-span-2 space-y-2"><Label>Tags</Label><Input placeholder="startup, fintech, média, réseau..." value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div><div className="md:col-span-2 space-y-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div><div className="md:col-span-2 flex items-center gap-2"><input id="favorite" type="checkbox" checked={form.is_favorite} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} /><Label htmlFor="favorite">Ajouter aux favoris</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
