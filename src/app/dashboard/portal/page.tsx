'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { formatGNF } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Users, Building2, FolderKanban, Receipt, FileText, MessageSquare,
  CheckCircle2, Clock, XCircle, AlertTriangle, Plus, Search,
  Eye, Send, TrendingUp, Globe, Mail, Phone, Pencil, Trash2, ExternalLink
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type Client = {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type Project = {
  id: string
  name: string
  status: string
  budget: number | null
  deadline: string | null
  client_id: string | null
  description: string | null
  clients?: { company_name: string } | { company_name: string }[] | null
}

type Invoice = {
  id: string
  invoice_number: string
  total_amount: number
  paid_amount: number | null
  status: string
  due_date: string | null
  issue_date: string | null
  client_id: string | null
  clients?: { company_name: string } | { company_name: string }[] | null
}

type Quote = {
  id: string
  quote_number: string
  total_amount: number
  status: string
  valid_until: string | null
  created_at: string
  client_id: string | null
  clients?: { company_name: string } | { company_name: string }[] | null
}

type Message = {
  id: string
  content: string
  sender_id: string | null
  created_at: string
  profiles?: { full_name: string; role: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  en_attente:   { label: 'En attente',   color: 'bg-gray-100 text-gray-700 border-gray-200' },
  en_cours:     { label: 'En cours',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  en_revision:  { label: 'En révision',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  livre:        { label: 'Livré',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  annule:       { label: 'Annulé',       color: 'bg-red-100 text-red-700 border-red-200' },
}

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  brouillon: { label: 'Brouillon',  color: 'bg-gray-100 text-gray-600 border-gray-200',        icon: FileText },
  envoyee:   { label: 'Envoyée',    color: 'bg-blue-100 text-blue-700 border-blue-200',         icon: Send },
  payee:     { label: 'Payée',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  en_retard: { label: 'En retard',  color: 'bg-red-100 text-red-700 border-red-200',            icon: AlertTriangle },
  annulee:   { label: 'Annulée',    color: 'bg-gray-100 text-gray-500 border-gray-200',         icon: XCircle },
}

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  envoye:    { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  accepte:   { label: 'Accepté',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  refuse:    { label: 'Refusé',    color: 'bg-red-100 text-red-700 border-red-200' },
  expire:    { label: 'Expiré',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function clientName(c: { company_name: string } | { company_name: string }[] | null | undefined): string {
  if (!c) return '—'
  if (Array.isArray(c)) return c[0]?.company_name || '—'
  return c.company_name || '—'
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PortalPage() {
  const { profile } = useAuth()
  const [clients, setClients]     = useState<Client[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [quotes, setQuotes]       = useState<Quote[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen]         = useState(false)
  const [activeTab, setActiveTab]           = useState('clients')

  const isAdmin = ['super_admin', 'ceo', 'chef_projet', 'assistante_direction', 'commercial_digital'].includes(profile?.role || '')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: cl }, { data: pr }, { data: inv }, { data: qt }] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('projects').select('id,name,status,budget,deadline,client_id,description,clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('invoices').select('id,invoice_number,total_amount,paid_amount,status,due_date,issue_date,client_id,clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('quotes').select('id,quote_number,total_amount,status,valid_until,created_at,client_id,clients(company_name)').order('created_at', { ascending: false }),
    ])
    setClients(cl || [])
    setProjects(pr || [])
    setInvoices(inv || [])
    setQuotes(qt || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtered & Stats ──
  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'actif').length,
    pendingInvoices: invoices.filter(i => i.status === 'envoyee').length,
    totalOwed: invoices.filter(i => i.status !== 'payee' && i.status !== 'annulee')
      .reduce((s, i) => s + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0),
  }

  // ── Client detail helpers ──
  function openClientDetail(client: Client) {
    setSelectedClient(client)
    setDetailOpen(true)
  }

  const clientProjects = selectedClient ? projects.filter(p => p.client_id === selectedClient.id) : []
  const clientInvoices = selectedClient ? invoices.filter(i => i.client_id === selectedClient.id) : []
  const clientQuotes   = selectedClient ? quotes.filter(q => q.client_id === selectedClient.id) : []

  const clientBalance = clientInvoices
    .filter(i => i.status !== 'payee' && i.status !== 'annulee')
    .reduce((s, i) => s + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0)

  const clientTotalBilled = clientInvoices
    .filter(i => i.status !== 'annulee')
    .reduce((s, i) => s + i.total_amount, 0)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Portail Client
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vue centralisée par client — projets, factures, devis et historique
          </p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Clients totaux',    value: stats.totalClients,                     icon: Users,        color: 'text-foreground' },
          { label: 'Clients actifs',    value: stats.activeClients,                    icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Factures en cours', value: stats.pendingInvoices,                  icon: Receipt,      color: 'text-amber-600' },
          { label: 'Solde à encaisser', value: formatGNF(stats.totalOwed),             icon: TrendingUp,   color: 'text-blue-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <k.icon className="h-3.5 w-3.5" />{k.label}
              </p>
              <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <TabsList>
            <TabsTrigger value="clients" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Clients
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Projets
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Factures
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Devis
            </TabsTrigger>
          </TabsList>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* ── Tab: Clients ── */}
        <TabsContent value="clients" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 opacity-20" />
              <p className="font-medium">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => {
                const cProjects = projects.filter(p => p.client_id === client.id)
                const cInvoices = invoices.filter(i => i.client_id === client.id)
                const cBalance  = cInvoices
                  .filter(i => i.status !== 'payee' && i.status !== 'annulee')
                  .reduce((s, i) => s + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0)
                const activeProjects = cProjects.filter(p => p.status === 'en_cours').length

                return (
                  <Card
                    key={client.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openClientDetail(client)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                            {initials(client.company_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{client.company_name}</p>
                            {client.status && (
                              <Badge className={`text-xs shrink-0 ${client.status === 'actif' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'} border`}>
                                {client.status}
                              </Badge>
                            )}
                          </div>
                          {client.contact_name && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{client.contact_name}</p>
                          )}
                          {client.email && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 shrink-0" />{client.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                        <div className="text-center">
                          <p className="text-lg font-bold">{cProjects.length}</p>
                          <p className="text-xs text-muted-foreground">Projets</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{cInvoices.length}</p>
                          <p className="text-xs text-muted-foreground">Factures</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-bold ${cBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {cBalance > 0 ? formatGNF(cBalance) : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">Solde dû</p>
                        </div>
                      </div>
                      {activeProjects > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-xs text-blue-600">{activeProjects} projet{activeProjects > 1 ? 's' : ''} en cours</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Projets ── */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12">
                    <div className="flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  </TableCell></TableRow>
                ) : projects.filter(p => (clientName(p.clients) || '').toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><FolderKanban className="h-8 w-8 opacity-20" /><p>Aucun projet</p></div>
                  </TableCell></TableRow>
                ) : projects
                    .filter(p => (clientName(p.clients) || '').toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()))
                    .map(p => {
                      const st = PROJECT_STATUS[p.status] || { label: p.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                      const overdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'livre'
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{p.name}</div>
                            {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {clientName(p.clients) || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {p.budget ? formatGNF(p.budget) : '—'}
                          </TableCell>
                          <TableCell className={`text-sm ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {p.deadline ? format(parseISO(p.deadline), 'dd/MM/yyyy') : '—'}
                            {overdue && <span className="ml-1 text-xs">(en retard)</span>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab: Factures ── */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Reste dû</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12">
                    <div className="flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  </TableCell></TableRow>
                ) : invoices.filter(i => (clientName(i.clients) || '').toLowerCase().includes(search.toLowerCase()) || i.invoice_number.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><Receipt className="h-8 w-8 opacity-20" /><p>Aucune facture</p></div>
                  </TableCell></TableRow>
                ) : invoices
                    .filter(i => (clientName(i.clients) || '').toLowerCase().includes(search.toLowerCase()) || i.invoice_number.toLowerCase().includes(search.toLowerCase()))
                    .map(inv => {
                      const st = INVOICE_STATUS[inv.status] || { label: inv.status, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: FileText }
                      const reste = Math.max(0, inv.total_amount - (inv.paid_amount || 0))
                      const overdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'payee'
                      const StatusIcon = st.icon
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div className="font-mono text-sm font-medium">{inv.invoice_number}</div>
                            {inv.issue_date && <div className="text-xs text-muted-foreground">Émise le {format(parseISO(inv.issue_date), 'dd/MM/yyyy')}</div>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {clientName(inv.clients) || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${st.color} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />{st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatGNF(inv.total_amount)}</TableCell>
                          <TableCell className={`text-right font-bold text-sm ${reste > 0 ? (overdue ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600'}`}>
                            {reste > 0 ? formatGNF(reste) : '—'}
                          </TableCell>
                          <TableCell className={`text-sm ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab: Devis ── */}
        <TabsContent value="quotes" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Devis</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Validité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12">
                    <div className="flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  </TableCell></TableRow>
                ) : quotes.filter(q => (clientName(q.clients) || '').toLowerCase().includes(search.toLowerCase()) || q.quote_number.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2"><FileText className="h-8 w-8 opacity-20" /><p>Aucun devis</p></div>
                  </TableCell></TableRow>
                ) : quotes
                    .filter(q => (clientName(q.clients) || '').toLowerCase().includes(search.toLowerCase()) || q.quote_number.toLowerCase().includes(search.toLowerCase()))
                    .map(qt => {
                      const st = QUOTE_STATUS[qt.status] || { label: qt.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                      const expired = qt.valid_until && new Date(qt.valid_until) < new Date() && qt.status !== 'accepte'
                      return (
                        <TableRow key={qt.id}>
                          <TableCell>
                            <div className="font-mono text-sm font-medium">{qt.quote_number}</div>
                            <div className="text-xs text-muted-foreground">{format(parseISO(qt.created_at), 'dd/MM/yyyy')}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {clientName(qt.clients) || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatGNF(qt.total_amount)}</TableCell>
                          <TableCell className={`text-sm ${expired ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {qt.valid_until ? format(parseISO(qt.valid_until), 'dd/MM/yyyy') : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Client Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {initials(selectedClient.company_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">{selectedClient.company_name}</p>
                    {selectedClient.contact_name && (
                      <p className="text-sm text-muted-foreground font-normal">{selectedClient.contact_name}</p>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedClient.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedClient.email}`} className="text-primary hover:underline truncate">{selectedClient.email}</a>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{selectedClient.phone}</span>
                    </div>
                  )}
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-xs text-muted-foreground">Total facturé</p>
                      <p className="text-base font-bold mt-0.5">{formatGNF(clientTotalBilled)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-xs text-muted-foreground">Projets</p>
                      <p className="text-base font-bold mt-0.5">{clientProjects.length}</p>
                    </CardContent>
                  </Card>
                  <Card className={clientBalance > 0 ? 'border-amber-200' : ''}>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-xs text-muted-foreground">Solde dû</p>
                      <p className={`text-base font-bold mt-0.5 ${clientBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {clientBalance > 0 ? formatGNF(clientBalance) : 'Soldé'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Projects */}
                {clientProjects.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-primary" /> Projets ({clientProjects.length})
                    </h4>
                    <div className="space-y-2">
                      {clientProjects.map(p => {
                        const st = PROJECT_STATUS[p.status] || { label: p.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              {p.deadline && <p className="text-xs text-muted-foreground">Échéance: {format(parseISO(p.deadline), 'dd/MM/yyyy')}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {p.budget && <span className="text-xs text-muted-foreground">{formatGNF(p.budget)}</span>}
                              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {clientInvoices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" /> Factures ({clientInvoices.length})
                    </h4>
                    <div className="space-y-1.5">
                      {clientInvoices.map(inv => {
                        const st = INVOICE_STATUS[inv.status] || { label: inv.status, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: FileText }
                        const reste = Math.max(0, inv.total_amount - (inv.paid_amount || 0))
                        return (
                          <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                            <div>
                              <p className="text-sm font-mono font-medium">{inv.invoice_number}</p>
                              {inv.due_date && <p className="text-xs text-muted-foreground">Échéance: {format(parseISO(inv.due_date), 'dd/MM/yyyy')}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{formatGNF(inv.total_amount)}</span>
                              {reste > 0 && <span className="text-xs text-amber-600 font-medium">({formatGNF(reste)} restant)</span>}
                              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quotes */}
                {clientQuotes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> Devis ({clientQuotes.length})
                    </h4>
                    <div className="space-y-1.5">
                      {clientQuotes.map(qt => {
                        const st = QUOTE_STATUS[qt.status] || { label: qt.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                        return (
                          <div key={qt.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                            <div>
                              <p className="text-sm font-mono font-medium">{qt.quote_number}</p>
                              <p className="text-xs text-muted-foreground">{format(parseISO(qt.created_at), 'dd/MM/yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{formatGNF(qt.total_amount)}</span>
                              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedClient.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
