'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Client } from '@/lib/supabase'
import { cacheSet, cacheInvalidate } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'
import { getPermissions } from '@/lib/permissions'
import { toast } from 'sonner'

function getErrorMessage(error: any, fallback: string) {
  return error?.message ? `${fallback} : ${error.message}` : fallback
}
import {
  Plus, Search, Building, Phone, Mail, MapPin,
  Edit, Trash2, Eye, TrendingUp, Users, Clock, FileDown,
  FolderKanban, Newspaper, Globe, KeyRound, ExternalLink, ShieldCheck,
  MessageSquare, Send, Inbox, LayoutGrid, List, ChevronRight,
  Star, Activity, CheckCircle2, AlertCircle, MoreVertical,
  Upload, FileText, X as XIcon, Loader2
} from 'lucide-react'
import { downloadClientsPDF } from '@/lib/pdf'

function exportClientsCSV(clients: any[]) {
  const headers = ['Entreprise', 'Contact', 'Email', 'Téléphone', 'Ville', 'Statut', 'Secteur']
  const rows = clients.map(c => [
    c.company_name || '',
    c.contact_name || '',
    c.email || '',
    c.phone || '',
    c.city || '',
    c.status || '',
    c.industry || '',
  ])
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const statusConfig = {
  actif:    { label: 'Actif',     color: '#059669', bg: '#d1fae5',   border: '#a7f3d0',  dot: '#059669' },
  prospect: { label: 'Prospect',  color: '#7c3aed', bg: '#ede9fe',   border: '#ddd6fe',  dot: '#7c3aed' },
  inactif:  { label: 'Inactif',   color: '#6b7280', bg: '#f3f4f6',   border: '#e5e7eb',  dot: '#6b7280' },
}

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  en_attente:    { label: 'En attente',    color: '#6b7280' },
  en_cours:      { label: 'En cours',      color: '#2563eb' },
  en_validation: { label: 'En validation', color: '#7c3aed' },
  termine:       { label: 'Terminé',       color: '#059669' },
  bloque:        { label: 'Bloqué',        color: '#dc2626' },
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', tiktok: '🎵',
  linkedin: '💼', twitter: '🐦', youtube: '▶️', autre: '🌐'
}

const AVATAR_COLORS = [
  ['#0066FF','#00E5FF'], ['#6A00FF','#0066FF'], ['#00E5FF','#6A00FF'],
  ['#0066FF','#6A00FF'], ['#00E5FF','#0066FF'], ['#6A00FF','#00E5FF'],
]

function getAvatarColors(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function ClientAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const [c1, c2] = getAvatarColors(name)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm'
  return (
    <div className={cn('rounded-xl flex items-center justify-center font-bold text-white shrink-0', sz)}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {initials}
    </div>
  )
}

const emptyForm = { company_name: '', contact_name: '', email: '', phone: '', address: '', status: 'prospect' as Client['status'], notes: '' }

const CAT_LABELS: Record<string, string> = {
  calendrier_editorial: 'Calendrier éditorial', strategie_publicitaire: 'Stratégie pub',
  analyse: 'Analyse', contrat: 'Contrat', devis: 'Devis', facture: 'Facture', autre: 'Autre'
}

function ClientDocumentsSection({ clientDocs, loadingDocs, uploadingDoc, docForm, setDocForm, docFile, setDocFile, docInputRef, onUpload, onDelete }: {
  clientDocs: any[]
  loadingDocs: boolean
  uploadingDoc: boolean
  docForm: { title: string; description: string; category: string }
  setDocForm: (fn: (f: any) => any) => void
  docFile: File | null
  setDocFile: (f: File | null) => void
  docInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-gray-500">
        <FileText className="h-3.5 w-3.5 text-blue-500" /> Documents partagés ({clientDocs.length})
      </p>

      <div className="rounded-xl p-4 mb-3 space-y-3 bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-gray-700">Ajouter un document</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Titre du document *" value={docForm.title}
            onChange={e => setDocForm((f: any) => ({ ...f, title: e.target.value }))}
            className="h-9 text-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
          <select value={docForm.category} onChange={e => setDocForm((f: any) => ({ ...f, category: e.target.value }))}
            className="h-9 text-sm rounded-md px-3 bg-white border border-gray-300 text-gray-900">
            <option value="calendrier_editorial">Calendrier éditorial</option>
            <option value="strategie_publicitaire">Stratégie publicitaire</option>
            <option value="analyse">Analyse / Rapport</option>
            <option value="contrat">Contrat</option>
            <option value="devis">Devis</option>
            <option value="facture">Facture</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <Input placeholder="Description (optionnel)" value={docForm.description}
          onChange={e => setDocForm((f: any) => ({ ...f, description: e.target.value }))}
          className="h-9 text-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
        <div className="flex gap-2 items-center">
          <label className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md cursor-pointer text-sm bg-white border border-gray-300"
            style={{ color: docFile ? '#2563eb' : '#9ca3af' }}>
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{docFile ? docFile.name : 'Choisir un fichier...'}</span>
            <input ref={docInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.csv" className="hidden"
              onChange={e => setDocFile(e.target.files?.[0] || null)} />
          </label>
          {docFile && (
            <button onClick={() => { setDocFile(null); if (docInputRef.current) docInputRef.current.value = '' }}
              className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-red-50 border border-red-200">
              <XIcon className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
          <Button size="sm" onClick={onUpload} disabled={!docFile || !docForm.title || uploadingDoc}
            className="shrink-0 gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', border: 'none' }}>
            {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Partager
          </Button>
        </div>
      </div>

      {loadingDocs ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </div>
      ) : clientDocs.length === 0 ? (
        <p className="text-xs p-3 rounded-lg text-gray-400 bg-gray-50 border border-gray-100">Aucun document partagé</p>
      ) : (
        <div className="space-y-2">
          {clientDocs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                    {CAT_LABELS[doc.category] || doc.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-100">
                  <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                </a>
                <button onClick={() => onDelete(doc.id)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-50 border border-red-100">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientsPage() {
  const { profile } = useAuth()
  const perms = getPermissions(profile?.role)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientPubs, setClientPubs] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [portalPassword, setPortalPassword] = useState('')
  const [savingPortal, setSavingPortal] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [clientMessages, setClientMessages] = useState<any[]>([])
  const [agencyMsg, setAgencyMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Documents
  const [clientDocs, setClientDocs] = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docForm, setDocForm] = useState({ title: '', description: '', category: 'calendrier_editorial' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    cacheSet('clients', data || [])
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  async function openDetail(client: Client) {
    setViewClient(client)
    setPortalPassword('')
    setShowMessages(false)
    setClientMessages([])
    setAgencyMsg('')
    setClientDocs([])
    setDocFile(null)
    setDocForm({ title: '', description: '', category: 'calendrier_editorial' })
    setLoadingDetail(true)
    const [{ data: projs }, { data: pubs }] = await Promise.all([
      supabase.from('projects').select('id, title, status, start_date, end_date').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('publications').select('id, title, platform, status, scheduled_at').eq('client_id', client.id).order('scheduled_at', { ascending: false }).limit(10),
    ])
    setClientProjects(projs || [])
    setClientPubs(pubs || [])
    setLoadingDetail(false)
    loadDocs(client.id)
  }

  async function loadDocs(clientId: string) {
    setLoadingDocs(true)
    const res = await fetch(`/api/client-documents?client_id=${clientId}`)
    const json = await res.json()
    setClientDocs(json.data || [])
    setLoadingDocs(false)
  }

  async function uploadDoc() {
    if (!docFile || !docForm.title || !viewClient) return
    setUploadingDoc(true)
    const fd = new FormData()
    fd.append('file', docFile)
    fd.append('client_id', viewClient.id)
    fd.append('title', docForm.title)
    fd.append('description', docForm.description)
    fd.append('category', docForm.category)
    if (profile?.id) fd.append('uploaded_by', profile.id)
    const res = await fetch('/api/client-documents', { method: 'POST', body: fd })
    const json = await res.json()
    if (res.ok) {
      toast.success('Document partagé avec le client')
      setDocFile(null)
      setDocForm({ title: '', description: '', category: 'calendrier_editorial' })
      if (docInputRef.current) docInputRef.current.value = ''
      loadDocs(viewClient.id)
    } else {
      toast.error('Erreur : ' + (json?.error || 'Upload échoué'))
    }
    setUploadingDoc(false)
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/client-documents/${docId}`, { method: 'DELETE' })
    toast.success('Document supprimé')
    if (viewClient) loadDocs(viewClient.id)
  }

  function openCreate() { setEditClient(null); setForm(emptyForm); setDialogOpen(true) }

  function openEdit(c: Client) {
    setEditClient(c)
    setForm({ company_name: c.company_name, contact_name: c.contact_name, email: c.email || '', phone: c.phone || '', address: c.address || '', status: c.status, notes: c.notes || '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.company_name || !form.contact_name) { toast.error('Nom entreprise et contact requis'); return }
    setSaving(true)
    if (editClient) {
      const { error } = await supabase.from('clients').update(form).eq('id', editClient.id)
      if (error) toast.error('Mise à jour impossible')
      else { toast.success('Client mis à jour'); cacheInvalidate('clients', 'dashboard'); fetchClients(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('clients').insert(form)
      if (error) toast.error('Création impossible')
      else { toast.success('Client créé'); cacheInvalidate('clients', 'dashboard'); fetchClients(); setDialogOpen(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) toast.error('Suppression impossible')
    else { toast.success('Client supprimé'); cacheInvalidate('clients', 'dashboard'); fetchClients() }
  }

  async function savePortal(enable: boolean) {
    if (!viewClient) return
    if (enable && !portalPassword.trim()) { toast.error('Définissez un mot de passe pour le portail'); return }
    setSavingPortal(true)
    const { error } = await supabase.from('clients').update({
      portal_enabled: enable,
      portal_password: enable ? portalPassword.trim() : null,
    }).eq('id', viewClient.id)
    if (error) { toast.error('Portail client indisponible') }
    else {
      toast.success(enable ? 'Portail activé ✓' : 'Portail désactivé')
      setViewClient({ ...viewClient, portal_enabled: enable, portal_password: enable ? portalPassword.trim() : null } as any)
      fetchClients()
    }
    setSavingPortal(false)
  }

  async function loadMessages(clientId: string) {
    const { data } = await supabase.from('client_messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true })
    setClientMessages(data || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    await supabase.from('client_messages').update({ read: true }).eq('client_id', clientId).eq('sender', 'client')
  }

  async function sendAgencyMessage() {
    if (!agencyMsg.trim() || !viewClient) return
    setSendingMsg(true)
    const { data, error } = await supabase.from('client_messages').insert({
      client_id: viewClient.id, sender: 'agency', message: agencyMsg.trim(),
    }).select().single()
    if (error) toast.error('Envoi impossible')
    else { setClientMessages(prev => [...prev, data]); setAgencyMsg(''); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }
    setSendingMsg(false)
  }

  const filtered = clients.filter(c => {
    const matchSearch = search === '' || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.contact_name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: clients.length,
    actif: clients.filter(c => c.status === 'actif').length,
    prospect: clients.filter(c => c.status === 'prospect').length,
    inactif: clients.filter(c => c.status === 'inactif').length,
  }

  return (
    <div className="min-h-screen pt-0 md:pt-0 bg-gray-50">
      <div className="p-4 md:p-6 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM — Clients</h1>
            <p className="text-sm mt-1 text-gray-500">{clients.length} clients enregistrés</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportClientsCSV(filtered)}
              className="gap-2 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 bg-white">
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => downloadClientsPDF(filtered)}
              className="gap-2 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 bg-white">
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
            {perms.canCreateClient && (
              <Button onClick={openCreate} className="gap-2 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', border: 'none' }}>
                <Plus className="h-4 w-4" /> Nouveau client
              </Button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total clients', value: stats.total, icon: Building, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Actifs', value: stats.actif, icon: Activity, color: '#059669', bg: '#f0fdf4' },
            { label: 'Prospects', value: stats.prospect, icon: TrendingUp, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Inactifs', value: stats.inactif, icon: Clock, color: '#6b7280', bg: '#f9fafb' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-sm">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Rechercher un client, contact, email..."
              className="w-full h-10 pl-9 pr-4 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-200 bg-white border border-gray-200"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'actif', label: 'Actifs' },
              { key: 'prospect', label: 'Prospects' },
              { key: 'inactif', label: 'Inactifs' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={filter === f.key
                  ? { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }
                  : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }
                }>
                {f.label}
              </button>
            ))}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['grid', 'list'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-3 py-1.5 transition-all"
                  style={viewMode === m ? { background: '#2563eb', color: '#fff' } : { background: '#fff', color: '#6b7280' }}>
                  {m === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CLIENT LIST */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin border-blue-200" style={{ borderTopColor: '#2563eb' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-16 text-center bg-white border border-gray-100">
            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => {
              const sc = statusConfig[client.status]
              return (
                <div key={client.id} className="rounded-2xl p-5 flex flex-col gap-4 group cursor-pointer transition-all hover:shadow-md bg-white border border-gray-100 shadow-sm hover:border-blue-200"
                  onClick={() => openDetail(client)}>
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.company_name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{client.company_name}</p>
                        <p className="text-xs truncate text-gray-500">{client.contact_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: sc?.bg, color: sc?.color, border: `1px solid ${sc?.border}` }}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle" style={{ background: sc?.dot }} />
                        {sc?.label}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors text-gray-400 hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-gray-200">
                          <DropdownMenuItem onClick={() => openDetail(client)} className="text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                            <Eye className="mr-2 h-4 w-4" /> Voir fiche
                          </DropdownMenuItem>
                          {perms.canCreateClient && (
                            <DropdownMenuItem onClick={() => openEdit(client)} className="text-gray-700 focus:text-gray-900 focus:bg-gray-50">
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                          )}
                          {perms.canDeleteClient && (
                            <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5">
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Depuis {new Date(client.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                      Voir fiche <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          ) : (
            /* LIST VIEW */
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-500 border-b border-gray-100">
                  <div className="col-span-3">Client</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Statut</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                {filtered.map((client, i) => {
                  const sc = statusConfig[client.status]
                  return (
                    <div key={client.id}
                      className="grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer transition-colors hover:bg-blue-50 border-b border-gray-50"
                      style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                      onClick={() => openDetail(client)}>
                      <div className="col-span-3 flex items-center gap-3 min-w-0">
                        <ClientAvatar name={client.company_name} size="sm" />
                        <span className="font-medium text-gray-900 text-sm truncate">{client.company_name}</span>
                      </div>
                      <div className="col-span-3 text-sm truncate text-gray-500">{client.contact_name}</div>
                      <div className="col-span-3 text-sm truncate text-gray-500">{client.email || '—'}</div>
                      <div className="col-span-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: sc?.bg, color: sc?.color, border: `1px solid ${sc?.border}` }}>
                          {sc?.label}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-gray-200">
                            <DropdownMenuItem onClick={() => openDetail(client)} className="text-gray-700 focus:bg-gray-50">
                              <Eye className="mr-2 h-4 w-4" /> Voir fiche
                            </DropdownMenuItem>
                            {perms.canCreateClient && (
                              <DropdownMenuItem onClick={() => openEdit(client)} className="text-gray-700 focus:bg-gray-50">
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                              </DropdownMenuItem>
                            )}
                            {perms.canDeleteClient && (
                              <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
      </div>

      {/* ─── CREATE / EDIT DIALOG ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{editClient ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Nom entreprise *</Label>
                <Input placeholder="SARL Example" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Contact principal *</Label>
                <Input placeholder="Jean Dupont" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Email</Label>
                <Input type="email" placeholder="contact@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Téléphone</Label>
                <Input placeholder="+224 6XX XX XX XX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Adresse</Label>
                <Input placeholder="Conakry, Ratoma" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 text-xs">Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as Client['status'] }))}>
                  <SelectTrigger className="border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="prospect" className="text-gray-900 focus:bg-gray-50">Prospect</SelectItem>
                    <SelectItem value="actif" className="text-gray-900 focus:bg-gray-50">Actif</SelectItem>
                    <SelectItem value="inactif" className="text-gray-900 focus:bg-gray-50">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs">Notes</Label>
              <Textarea placeholder="Services, besoins, informations complémentaires..." rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-200 text-gray-600 hover:text-gray-900">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', border: 'none' }}>
              {saving ? 'Enregistrement...' : editClient ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── FICHE CLIENT DIALOG ─── */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white border-gray-200">
          {viewClient && (
            <>
              {/* Header gradient */}
              <div className="relative p-6 pb-5" style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)' }}>
                <div className="flex items-start gap-4">
                  <ClientAvatar name={viewClient.company_name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{viewClient.company_name}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{ background: statusConfig[viewClient.status]?.bg, color: statusConfig[viewClient.status]?.color, border: `1px solid ${statusConfig[viewClient.status]?.border}` }}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle" style={{ background: statusConfig[viewClient.status]?.dot }} />
                        {statusConfig[viewClient.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-gray-500">{viewClient.contact_name}</p>
                    <p className="text-xs mt-1 text-gray-400">
                      Client depuis {new Date(viewClient.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {perms.canCreateClient && (
                      <button onClick={() => { setViewClient(null); openEdit(viewClient) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                        <Edit className="h-3.5 w-3.5" /> Modifier
                      </button>
                    )}
                    <button onClick={() => { setShowMessages(v => !v); if (!showMessages) loadMessages(viewClient.id) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={showMessages
                        ? { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }
                        : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                      <MessageSquare className="h-3.5 w-3.5" /> Messages
                    </button>
                  </div>
                </div>

                {/* Coordonnées inline */}
                <div className="flex flex-wrap gap-4 mt-4">
                  {viewClient.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-blue-500" /> {viewClient.email}
                    </div>
                  )}
                  {viewClient.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="h-4 w-4 text-cyan-500" /> {viewClient.phone}
                    </div>
                  )}
                  {viewClient.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 text-purple-500" /> {viewClient.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-5">

                {/* MESSAGERIE */}
                {showMessages && (
                  <div className="rounded-xl overflow-hidden border border-blue-200 bg-blue-50">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-200">
                      <Inbox className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-semibold text-gray-800">Messagerie — {viewClient.company_name}</p>
                    </div>
                    <div className="h-52 overflow-y-auto p-3 space-y-2">
                      {clientMessages.length === 0 ? (
                        <p className="text-center text-xs py-8 text-gray-400">Aucun message</p>
                      ) : clientMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'agency' ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
                            style={msg.sender === 'agency'
                              ? { background: 'linear-gradient(135deg, #0066FF, #00E5FF)', color: '#fff', borderBottomRightRadius: 4 }
                              : { background: '#fff', color: '#374151', borderBottomLeftRadius: 4, border: '1px solid #e5e7eb' }}>
                            <p>{msg.message}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: msg.sender === 'agency' ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 flex gap-2 border-t border-blue-100 bg-white">
                      <Input placeholder="Répondre au client..." value={agencyMsg} onChange={e => setAgencyMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendAgencyMessage()}
                        className="h-9 text-sm border-gray-300 text-gray-900 placeholder:text-gray-400" />
                      <Button size="sm" onClick={sendAgencyMessage} disabled={!agencyMsg.trim() || sendingMsg}
                        className="shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', border: 'none' }}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* PORTAIL CLIENT */}
                <div className="rounded-xl p-4 bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-800">Portail Client</p>
                    {(viewClient as any).portal_enabled && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Actif
                      </span>
                    )}
                  </div>
                  {(viewClient as any).portal_enabled ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-100">
                          <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-400">Mot de passe</p>
                            <p className="text-sm font-mono font-medium text-gray-900">{(viewClient as any).portal_password}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-100">
                          <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{viewClient.email || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href="/portal" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-purple-100 text-purple-700 border border-purple-200">
                          <ExternalLink className="h-3.5 w-3.5" /> Ouvrir le portail
                        </a>
                        <button onClick={() => savePortal(false)} disabled={savingPortal}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-red-50 text-red-500 border border-red-200">
                          Désactiver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">Activez l&apos;accès pour que ce client consulte ses factures, projets et publications.</p>
                      {!viewClient.email && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                          <p className="text-xs text-amber-600">Ajoutez d&apos;abord un email à ce client pour activer son portail.</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input type="text" placeholder="Définir un mot de passe..." className="h-9 text-sm border-gray-300 text-gray-900 placeholder:text-gray-400"
                          value={portalPassword} onChange={e => setPortalPassword(e.target.value)} disabled={!viewClient.email} />
                        <Button size="sm" onClick={() => savePortal(true)} disabled={savingPortal || !portalPassword.trim() || !viewClient.email}
                          className="shrink-0 text-white gap-1.5" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none' }}>
                          <ShieldCheck className="h-3.5 w-3.5" /> Activer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* DOCUMENTS PARTAGÉS */}
                <ClientDocumentsSection
                  clientDocs={clientDocs}
                  loadingDocs={loadingDocs}
                  uploadingDoc={uploadingDoc}
                  docForm={docForm}
                  setDocForm={setDocForm}
                  docFile={docFile}
                  setDocFile={setDocFile}
                  docInputRef={docInputRef}
                  onUpload={uploadDoc}
                  onDelete={deleteDoc}
                />

                {/* NOTES */}
                {viewClient.notes && (
                  <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">Services & Notes</p>
                    <p className="text-sm leading-relaxed text-gray-700">{viewClient.notes}</p>
                  </div>
                )}

                {/* PROJETS */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-gray-500">
                    <FolderKanban className="h-3.5 w-3.5 text-blue-500" /> Projets ({clientProjects.length})
                  </p>
                  {loadingDetail ? (
                    <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin border-blue-200" style={{ borderTopColor: '#2563eb' }} />
                  ) : clientProjects.length === 0 ? (
                    <p className="text-xs p-3 rounded-lg text-gray-400 bg-gray-50">Aucun projet</p>
                  ) : (
                    <div className="space-y-2">
                      {clientProjects.map(p => {
                        const ps = projectStatusConfig[p.status]
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                            <FolderKanban className="h-4 w-4 shrink-0 text-blue-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                              {p.end_date && (
                                <p className="text-xs text-gray-400">
                                  Échéance : {new Date(p.end_date).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                              style={{ background: `${ps?.color}18`, color: ps?.color, border: `1px solid ${ps?.color}40` }}>
                              {ps?.label || p.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* PUBLICATIONS */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-gray-500">
                    <Newspaper className="h-3.5 w-3.5 text-purple-500" /> Publications récentes ({clientPubs.length})
                  </p>
                  {loadingDetail ? null : clientPubs.length === 0 ? (
                    <p className="text-xs p-3 rounded-lg text-gray-400 bg-gray-50">Aucune publication</p>
                  ) : (
                    <div className="space-y-2">
                      {clientPubs.slice(0, 5).map(pub => (
                        <div key={pub.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                          <span className="text-base shrink-0">{PLATFORM_ICONS[pub.platform] || '🌐'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{pub.title}</p>
                            {pub.scheduled_at && (
                              <p className="text-xs text-gray-400">
                                {new Date(pub.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                            {pub.status === 'publie' ? 'Publié' : pub.status === 'programme' ? 'Programmé' : pub.status === 'en_validation' ? 'Validation' : 'À créer'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
