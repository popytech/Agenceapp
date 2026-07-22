'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatGNF } from '@/lib/utils'
import {
  Sparkles, FolderKanban, FileText, Download, LogOut, CheckCircle,
  Clock, AlertCircle, CreditCard, MessageSquare, Send, ChevronRight,
  TrendingUp, Calendar, Instagram, Facebook, Linkedin, Globe,
  Heart, MessageCircle, Share2, Eye, ExternalLink, Image, Film,
  ThumbsUp, ThumbsDown, Package, LayoutDashboard, X, Check,
  BarChart2, Bell, Paperclip, Upload
} from 'lucide-react'
import { downloadInvoicePDF, downloadQuotePDF } from '@/lib/pdf'
import { toast } from 'sonner'

// ── Helpers ────────────────────────────────────────────────────────────────────
const PROJ_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  en_attente:   { label: 'En attente',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',  dot: 'bg-amber-400' },
  en_cours:     { label: 'En production',color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',     dot: 'bg-blue-400' },
  en_revision:  { label: 'En révision',  color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dot: 'bg-purple-400' },
  termine:      { label: 'Livré',        color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  annule:       { label: 'Annulé',       color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',     dot: 'bg-gray-400' },
}
const INV_STATUS: Record<string, { label: string; color: string }> = {
  payee:     { label: 'Payée',    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  impayee:   { label: 'Impayée', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  partielle: { label: 'Partielle',color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
}
const PUB_STATUS: Record<string, { label: string; color: string }> = {
  published:     { label: 'Publié',      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  scheduled:     { label: 'Planifié',    color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  draft:         { label: 'Brouillon',   color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  pending_review:{ label: 'En révision', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
}
const DELIV_CATEGORY: Record<string, { label: string; icon: string }> = {
  logo:       { label: 'Logo',        icon: '🎨' },
  flyer:      { label: 'Flyer',       icon: '📄' },
  video:      { label: 'Vidéo',       icon: '🎬' },
  website:    { label: 'Site Web',    icon: '🌐' },
  document:   { label: 'Document',    icon: '📋' },
  photo:      { label: 'Photo',       icon: '🖼️' },
  other:      { label: 'Autre',       icon: '📦' },
}

function PlatformIcon({ platform, size = 4 }: { platform: string; size?: number }) {
  const p = platform?.toLowerCase() || ''
  const cls = `h-${size} w-${size}`
  if (p.includes('instagram')) return <Instagram className={`${cls} text-pink-400`} />
  if (p.includes('facebook')) return <Facebook className={`${cls} text-blue-400`} />
  if (p.includes('linkedin')) return <Linkedin className={`${cls} text-sky-400`} />
  if (p.includes('tiktok')) return <Film className={`${cls} text-white`} />
  return <Globe className={`${cls} text-white/40`} />
}
function platformBg(platform: string) {
  const p = platform?.toLowerCase() || ''
  if (p.includes('instagram')) return 'bg-pink-500/10 border-pink-500/20'
  if (p.includes('facebook')) return 'bg-blue-500/10 border-blue-500/20'
  if (p.includes('linkedin')) return 'bg-sky-500/10 border-sky-500/20'
  if (p.includes('tiktok')) return 'bg-white/5 border-white/10'
  return 'bg-white/5 border-white/10'
}

const TABS = [
  { id: 'overview',      label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'projects',      label: 'Mes Projets',      icon: FolderKanban },
  { id: 'deliverables',  label: 'Livrables',        icon: Package },
  { id: 'invoices',      label: 'Factures',         icon: FileText },
  { id: 'quotes',        label: 'Devis',            icon: CreditCard },
  { id: 'social',        label: 'Marketing',        icon: BarChart2 },
  { id: 'messages',      label: 'Messages',         icon: MessageSquare },
]

// ── Card Component ──────────────────────────────────────────────────────────────
function Card({ children, className = '', glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`bg-[#0f1628] border border-white/8 rounded-2xl transition-all duration-200 ${glow ? 'hover:border-[#0066FF]/30 hover:shadow-lg hover:shadow-indigo-500/5' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium ${className}`}>
      {children}
    </span>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
function ClientPortalContent() {
  useSearchParams()
  const [step, setStep] = useState<'login' | 'dashboard'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [clientData, setClientData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pubFilter, setPubFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [delivComment, setDelivComment] = useState<Record<string, string>>({})
  const msgEndRef = useRef<HTMLDivElement>(null)

  // ── Login ─────────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!email || !password) { setLoginError('Veuillez remplir tous les champs'); return }
    setLoading(true); setLoginError('')

    const { data: client } = await supabase
      .from('clients')
      .select('id, company_name, contact_name, email, portal_password, portal_enabled')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!client) { setLoginError('Aucun compte trouvé avec cet email.'); setLoading(false); return }
    if (client.portal_enabled === false) { setLoginError('Votre accès est désactivé. Contactez POPY TECH.'); setLoading(false); return }
    if (client.portal_password && client.portal_password !== password) { setLoginError('Mot de passe incorrect.'); setLoading(false); return }

      const [
        { data: projects },
        { data: invoicesRaw },
        { data: quotes },
        { data: cmDocs },
        { data: crmDocs },
        { data: msgs },
        { data: publications },
        { data: delivs },
      ] = await Promise.all([
        supabase.from('projects').select('*, tasks(id, status)').eq('client_id', client.id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
        supabase.from('quotes').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
        supabase.from('cm_documents').select('*').eq('client_id', client.id).eq('scope', 'clients').order('created_at', { ascending: false }),
        supabase.from('client_documents').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
        supabase.from('client_messages').select('*').eq('client_id', client.id).order('created_at', { ascending: true }),
        supabase.from('publications').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
        supabase.from('deliverables').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      ])

      // Fusionner CM docs + CRM docs, triés par date
      const allDocs = [
        ...(cmDocs || []).map((d: any) => ({ ...d, _source: 'cm' })),
        ...(crmDocs || []).map((d: any) => ({ ...d, _source: 'crm' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Charger les lignes de factures
      let invoicesWithItems = invoicesRaw || []
      if (invoicesRaw && invoicesRaw.length > 0) {
        const invoiceIds = invoicesRaw.map((inv: any) => inv.id)
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('id,invoice_id,description,quantity,unit_price,tax_rate,total')
          .in('invoice_id', invoiceIds)
        const itemsByInvoice = (invoiceItems || []).reduce((acc: any, item: any) => {
          acc[item.invoice_id] = acc[item.invoice_id] || []
          acc[item.invoice_id].push(item)
          return acc
        }, {})
        invoicesWithItems = invoicesRaw.map((inv: any) => ({ ...inv, _items: itemsByInvoice[inv.id] || [] }))
      }

      const msgsData = msgs || []
      setMessages(msgsData)
      setUnreadCount(msgsData.filter((m: any) => m.sender === 'agency' && !m.read).length)
      setDeliverables(delivs || [])

      setClientData({
        client,
        projects: projects || [],
        invoices: invoicesWithItems,
        quotes: quotes || [],
        documents: allDocs,
        publications: publications || [],
      })
    setStep('dashboard')
    setLoading(false)
  }

  // ── Messages ──────────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!newMsg.trim()) return
    setSendingMsg(true)
    const { data } = await supabase.from('client_messages').insert({
      client_id: clientData.client.id,
      sender: 'client',
      message: newMsg.trim(),
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
    setNewMsg('')
    setSendingMsg(false)
  }

  async function markRead() {
    const unread = messages.filter(m => m.sender === 'agency' && !m.read)
    if (!unread.length) return
    await supabase.from('client_messages').update({ read: true }).in('id', unread.map(m => m.id))
    setMessages(prev => prev.map(m => m.sender === 'agency' && !m.read ? { ...m, read: true } : m))
    setUnreadCount(0)
  }

  useEffect(() => { if (activeTab === 'messages') markRead() }, [activeTab])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Devis ─────────────────────────────────────────────────────────────────────
  async function acceptQuote(id: string) {
    await supabase.from('quotes').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id)
    toast.success('Devis accepté !')
    const { data } = await supabase.from('quotes').select('*').eq('client_id', clientData.client.id).order('created_at', { ascending: false })
    setClientData((p: any) => ({ ...p, quotes: data || [] }))
  }
  async function rejectQuote(id: string) {
    await supabase.from('quotes').update({ status: 'rejected' }).eq('id', id)
    toast.info('Devis refusé.')
    const { data } = await supabase.from('quotes').select('*').eq('client_id', clientData.client.id).order('created_at', { ascending: false })
    setClientData((p: any) => ({ ...p, quotes: data || [] }))
  }

  // ── Livrables ────────────────────────────────────────────────────────────────
  async function approveDeliverable(id: string) {
    await supabase.from('deliverables').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    toast.success('Livrable validé !')
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, status: 'approved', approved_at: new Date().toISOString() } : d))
  }
  async function rejectDeliverable(id: string) {
    const reason = delivComment[id]?.trim()
    await supabase.from('deliverables').update({ status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: reason || null }).eq('id', id)
    if (reason) {
      await supabase.from('client_project_comments').insert({
        deliverable_id: id,
        client_id: clientData.client.id,
        content: reason,
        type: 'revision',
      })
    }
    toast.info('Modification demandée.')
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d))
    setDelivComment(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function dlInvoice(inv: any) {
    try { downloadInvoicePDF({ ...inv, clients: clientData.client }) } catch { toast.error('Erreur PDF') }
  }
  function dlQuote(q: any) {
    try { downloadQuotePDF({ ...q, clients: clientData.client }) } catch { toast.error('Erreur PDF') }
  }

  // ── PAGE LOGIN ────────────────────────────────────────────────────────────────
  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #050810 0%, #0a0f20 50%, #050810 100%)' }}>

        {/* Glows */}
        <div className="fixed top-1/3 left-1/4 w-[500px] h-[500px] bg-[#0066FF]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#6A00FF]/6 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-[#0066FF]/30 p-3 border border-white/10">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=400&height=400&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">POPY TECH</h1>
            <p className="text-[#00E5FF]/70 text-sm mt-2 font-medium">Espace Client Sécurisé</p>
          </div>

          {/* Card */}
          <div className="bg-white/4 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Connexion</h2>
            <p className="text-white/35 text-sm mb-7">Accédez à vos projets, factures et publications</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 block">Email</label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#0066FF]/60 focus:bg-white/8 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 block">Mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#0066FF]/60 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {loginError && (
              <div className="mt-4 flex items-center gap-2.5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />{loginError}
              </div>
            )}

            <button
              onClick={handleLogin} disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-[#0066FF] to-[#6A00FF] hover:from-[#0055ee] hover:to-[#5900ee] text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-[#0066FF]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              {loading
                ? <><span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion...</>
                : <>Se connecter <ChevronRight className="h-5 w-5" /></>
              }
            </button>

            <p className="text-xs text-white/20 text-center mt-6">
              Problème d'accès ? Contactez-nous :{' '}
              <span className="text-[#00E5FF]/70">contact@popytech.com</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────────
  const { client, projects, invoices, quotes, publications } = clientData
  const activeProjects = projects.filter((p: any) => ['en_cours', 'en_revision'].includes(p.status))
  const doneProjects = projects.filter((p: any) => p.status === 'termine')
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0)
  const totalDue = totalInvoiced - totalPaid
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'payee')
  const paidPct = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0
  const pendingQuotes = quotes.filter((q: any) => q.status === 'sent')
  const publishedPubs = publications.filter((p: any) => p.status === 'published')
  const pendingDelivs = deliverables.filter((d: any) => d.status === 'pending')

  const platforms = ['all', ...Array.from(new Set(publications.map((p: any) => p.platform).filter(Boolean)))] as string[]
  const filteredPubs = pubFilter === 'all' ? publications : publications.filter((p: any) => p.platform === pubFilter)

  const totalReach = publishedPubs.reduce((s: number, p: any) => s + (p.reach || 0), 0)
  const totalLikes = publishedPubs.reduce((s: number, p: any) => s + (p.likes || 0), 0)
  const totalComments = publishedPubs.reduce((s: number, p: any) => s + (p.comments || 0), 0)

  const notifCount = unreadCount + pendingQuotes.length + pendingDelivs.length

  return (
    <div className="min-h-screen" style={{ background: '#06091a', colorScheme: 'dark' }}>
      {/* Background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#0066FF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#06091a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-[#0066FF]/10 p-1 border border-white/10">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=100&height=100&resize=contain" 
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">POPY TECH</p>
              <p className="text-[10px] text-white/30 mt-0.5">Portail Client</p>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const badge = tab.id === 'messages' ? unreadCount : tab.id === 'quotes' ? pendingQuotes.length : tab.id === 'deliverables' ? pendingDelivs.length : 0
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0066FF]/15 text-[#00E5FF] border border-[#0066FF]/30'
                      : 'text-white/35 hover:text-white/65 hover:bg-white/4'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-[#0066FF] rounded-full text-[9px] text-white flex items-center justify-center font-bold shadow-lg">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            {notifCount > 0 && (
              <div className="relative h-9 w-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Bell className="h-4 w-4 text-white/40" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#0066FF] rounded-full text-[9px] text-white flex items-center justify-center font-bold">{notifCount}</span>
              </div>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-white/90 leading-none">{client.company_name}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{client.contact_name}</p>
            </div>
            <button onClick={() => setStep('login')}
              className="h-9 w-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/8 transition-all"
              title="Déconnexion">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Nav mobile */}
        <div className="lg:hidden flex border-t border-white/5 overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const badge = tab.id === 'messages' ? unreadCount : tab.id === 'quotes' ? pendingQuotes.length : tab.id === 'deliverables' ? pendingDelivs.length : 0
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-semibold transition-all min-w-[52px] ${
                  isActive ? 'text-[#00E5FF] border-t-2 border-[#0066FF] -mt-px bg-[#0066FF]/5' : 'text-white/25 hover:text-white/50'
                }`}>
                <Icon className="h-4 w-4" />
                {tab.label.split(' ')[0]}
                {badge > 0 && (
                  <span className="absolute top-1 right-1.5 h-3.5 w-3.5 bg-[#0066FF] rounded-full text-[8px] text-white flex items-center justify-center">{badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">

        {/* ═══════════════════════ OVERVIEW ═══════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-7">

            {/* Bienvenue Hero */}
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-10"
              style={{ background: 'linear-gradient(135deg, #001a66 0%, #0066FF 45%, #6A00FF 100%)' }}>
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '60px 60px'
              }} />
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4" />
              <div className="absolute left-1/2 bottom-0 w-48 h-48 bg-black/10 rounded-full translate-y-2/3" />
              <div className="relative z-10">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 text-xs text-white/80 font-medium mb-4">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Espace sécurisé
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                      Bienvenue, {client.contact_name} 👋
                    </h1>
                    <p className="text-[#00E5FF]/80 text-sm max-w-lg">
                      Voici votre tableau de bord. Suivez vos projets, validez vos livrables, consultez vos factures et vos publications en un seul endroit.
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-[#00E5FF]/60 mb-1">Votre entreprise</p>
                    <p className="text-lg font-bold text-white">{client.company_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Projets en cours', value: activeProjects.length, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/15', action: () => setActiveTab('projects') },
                { label: 'Projets livrés', value: doneProjects.length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/15', action: () => setActiveTab('projects') },
                { label: 'Factures en attente', value: unpaidInvoices.length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/8 border-red-500/15', action: () => setActiveTab('invoices') },
                { label: 'À valider', value: pendingDelivs.length + pendingQuotes.length, icon: ThumbsUp, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/15', action: () => setActiveTab(pendingDelivs.length > 0 ? 'deliverables' : 'quotes') },
              ].map((kpi, i) => {
                const Icon = kpi.icon
                return (
                  <button key={i} onClick={kpi.action}
                    className={`border rounded-2xl p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${kpi.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-white/40 font-medium leading-tight">{kpi.label}</p>
                      <Icon className={`h-4 w-4 ${kpi.color} shrink-0`} />
                    </div>
                    <p className={`text-4xl font-black ${kpi.color}`}>{kpi.value}</p>
                  </button>
                )
              })}
            </div>

            {/* Alertes urgentes */}
            {(pendingDelivs.length > 0 || pendingQuotes.length > 0 || unpaidInvoices.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Actions requises</h3>
                <div className="space-y-2">
                  {pendingDelivs.length > 0 && (
                    <button onClick={() => setActiveTab('deliverables')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12 transition-all text-left">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{pendingDelivs.length} livrable{pendingDelivs.length > 1 ? 's' : ''} à valider</p>
                        <p className="text-xs text-white/35">Cliquez pour valider ou demander des modifications</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </button>
                  )}
                  {pendingQuotes.length > 0 && (
                    <button onClick={() => setActiveTab('quotes')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-purple-500/8 border border-purple-500/20 hover:bg-purple-500/12 transition-all text-left">
                      <div className="h-10 w-10 rounded-xl bg-[#6A00FF]/20 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-[#a855f7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{pendingQuotes.length} devis en attente de réponse</p>
                        <p className="text-xs text-white/35">Acceptez ou refusez vos devis</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </button>
                  )}
                  {unpaidInvoices.length > 0 && totalDue > 0 && (
                    <button onClick={() => setActiveTab('invoices')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 hover:bg-red-500/12 transition-all text-left">
                      <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">Restant dû : {formatGNF(totalDue)}</p>
                        <p className="text-xs text-white/35">{unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} impayée{unpaidInvoices.length > 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Projets en cours */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Projets en cours</h3>
                  <button onClick={() => setActiveTab('projects')} className="text-xs text-[#00E5FF] hover:text-indigo-300 flex items-center gap-1">Voir tout <ChevronRight className="h-3 w-3" /></button>
                </div>
                {activeProjects.length === 0 ? (
                  <Card className="p-6 text-center"><p className="text-white/25 text-sm">Aucun projet en cours</p></Card>
                ) : (
                  <div className="space-y-3">
                    {activeProjects.slice(0, 3).map((p: any) => {
                      const total = p.tasks?.length || 0
                      const done = p.tasks?.filter((t: any) => t.status === 'termine').length || 0
                      const pct = p.progress ?? (total > 0 ? Math.round((done / total) * 100) : 0)
                      const st = PROJ_STATUS[p.status] || PROJ_STATUS.en_cours
                      return (
                        <Card key={p.id} className="p-4" glow>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <p className="font-semibold text-white text-sm leading-tight">{p.name || p.title}</p>
                            <Badge className={st.color}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</Badge>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-white/30">
                              <span>Progression</span><span className="font-semibold text-white/50">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#0066FF] to-[#00E5FF]" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {p.end_date && (
                            <p className="text-[10px] text-white/25 mt-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />Deadline : {new Date(p.end_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Prochaines publications */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Prochaines publications</h3>
                  <button onClick={() => setActiveTab('social')} className="text-xs text-[#00E5FF] hover:text-indigo-300 flex items-center gap-1">Voir tout <ChevronRight className="h-3 w-3" /></button>
                </div>
                {publications.filter((p: any) => ['scheduled', 'pending_review'].includes(p.status)).length === 0 ? (
                  <Card className="p-6 text-center"><p className="text-white/25 text-sm">Aucune publication planifiée</p></Card>
                ) : (
                  <div className="space-y-3">
                    {publications.filter((p: any) => ['scheduled', 'pending_review'].includes(p.status)).slice(0, 3).map((pub: any) => (
                      <Card key={pub.id} className={`p-4 border ${platformBg(pub.platform)}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${platformBg(pub.platform)}`}>
                            <PlatformIcon platform={pub.platform} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/90 truncate">{pub.title || pub.content?.slice(0, 50)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={PUB_STATUS[pub.status]?.color || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}>
                                {PUB_STATUS[pub.status]?.label || pub.status}
                              </Badge>
                              {pub.scheduled_at && (
                                <span className="text-[10px] text-white/25 flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />{new Date(pub.scheduled_at).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Performances marketing */}
            {publishedPubs.length > 0 && (
              <Card className="p-6" glow>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-pink-400" />
                    <h3 className="text-sm font-bold text-white">Performances Marketing</h3>
                  </div>
                  <button onClick={() => setActiveTab('social')} className="text-xs text-[#00E5FF] hover:text-indigo-300 flex items-center gap-1">Voir détail <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Posts publiés', value: publishedPubs.length, icon: Image, color: 'text-[#00E5FF]' },
                    { label: 'Portée totale', value: totalReach > 0 ? totalReach.toLocaleString('fr-FR') : '–', icon: Eye, color: 'text-blue-400' },
                    { label: "J'aime", value: totalLikes > 0 ? totalLikes.toLocaleString('fr-FR') : '–', icon: Heart, color: 'text-pink-400' },
                    { label: 'Commentaires', value: totalComments > 0 ? totalComments.toLocaleString('fr-FR') : '–', icon: MessageCircle, color: 'text-[#a855f7]' },
                  ].map((s, i) => {
                    const Icon = s.icon
                    return (
                      <div key={i} className="bg-white/3 border border-white/6 rounded-xl p-4 text-center">
                        <Icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-white/25 mt-1">{s.label}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════ PROJETS ═══════════════════════ */}
        {activeTab === 'projects' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Mes Projets</h2>
              <span className="text-xs text-white/30">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
            </div>
            {projects.length === 0 ? (
              <Card className="p-16 text-center">
                <FolderKanban className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-medium">Aucun projet pour l'instant.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {projects.map((p: any) => {
                  const total = p.tasks?.length || 0
                  const done = p.tasks?.filter((t: any) => t.status === 'termine').length || 0
                  const pct = p.progress ?? (total > 0 ? Math.round((done / total) * 100) : 0)
                  const st = PROJ_STATUS[p.status] || { label: p.status, color: 'bg-gray-500/15 text-gray-400 border-gray-500/30', dot: 'bg-gray-400' }
                  const projDelivs = deliverables.filter(d => d.project_id === p.id)
                  return (
                    <Card key={p.id} className="p-5" glow>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <p className="font-bold text-white leading-tight">{p.name || p.title}</p>
                          {p.description && <p className="text-xs text-white/35 mt-1 line-clamp-2">{p.description}</p>}
                        </div>
                        <Badge className={`${st.color} shrink-0`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</Badge>
                      </div>

                      {/* Progression */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-white/30 mb-2">
                          <span>Progression du projet</span>
                          <span className="font-bold text-white/60">{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0066FF] to-[#00E5FF] transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Infos */}
                      <div className="flex flex-wrap gap-3 text-xs text-white/30">
                        {p.start_date && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Début : {new Date(p.start_date).toLocaleDateString('fr-FR')}</span>
                        )}
                        {p.end_date && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Deadline : {new Date(p.end_date).toLocaleDateString('fr-FR')}</span>
                        )}
                        {projDelivs.length > 0 && (
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{projDelivs.length} livrable{projDelivs.length > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {/* Livrables du projet */}
                      {projDelivs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/6">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Livrables</p>
                          <div className="flex flex-wrap gap-2">
                            {projDelivs.slice(0, 4).map(d => {
                              const cat = DELIV_CATEGORY[d.category] || DELIV_CATEGORY.other
                              const statusColor = d.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : d.status === 'rejected' ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                              return (
                                <button key={d.id} onClick={() => setActiveTab('deliverables')}
                                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all hover:opacity-80 ${statusColor}`}>
                                  {cat.icon} {d.name}
                                </button>
                              )
                            })}
                            {projDelivs.length > 4 && <span className="text-xs text-white/25 px-2 py-1">+{projDelivs.length - 4}</span>}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ LIVRABLES ═══════════════════════ */}
        {activeTab === 'deliverables' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Livrables & Téléchargements</h2>
              <div className="flex items-center gap-2">
                {pendingDelivs.length > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {pendingDelivs.length} à valider
                  </Badge>
                )}
              </div>
            </div>

            {deliverables.length === 0 ? (
              <Card className="p-16 text-center">
                <Package className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-medium">Aucun livrable pour l'instant.</p>
                <p className="text-sm text-white/20 mt-1">Vos livrables apparaîtront ici dès qu'ils seront prêts.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {deliverables.map((d: any) => {
                  const cat = DELIV_CATEGORY[d.category] || DELIV_CATEGORY.other
                  const isPending = d.status === 'pending'
                  const isApproved = d.status === 'approved'
                  const isRejected = d.status === 'rejected'
                  const projName = projects.find((p: any) => p.id === d.project_id)?.title || projects.find((p: any) => p.id === d.project_id)?.name

                  return (
                    <Card key={d.id} className={`p-5 ${isPending ? 'border-amber-500/20' : isApproved ? 'border-emerald-500/15' : 'border-red-500/15'}`} glow>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="text-2xl shrink-0">{cat.icon}</div>
                          <div className="min-w-0">
                            <p className="font-bold text-white leading-tight">{d.name}</p>
                            {projName && <p className="text-xs text-white/30 mt-0.5">Projet : {projName}</p>}
                            {d.description && <p className="text-xs text-white/35 mt-1 line-clamp-2">{d.description}</p>}
                          </div>
                        </div>
                        <Badge className={
                          isPending ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                          isApproved ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                          'bg-red-500/15 text-red-300 border-red-500/30'
                        }>
                          {isPending ? '⏳ En attente' : isApproved ? '✓ Validé' : '✕ Révision'}
                        </Badge>
                      </div>

                      {/* Aperçu image */}
                      {d.file_url && d.file_type?.startsWith('image') && (
                        <div className="mb-3 rounded-xl overflow-hidden bg-white/4 border border-white/8 h-36">
                          <img src={d.file_url} alt={d.name} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}

                      {/* Infos */}
                      <div className="flex items-center gap-3 text-[10px] text-white/25 mb-3">
                        <span className="capitalize">{cat.label}</span>
                        {d.file_size && <span>·  {(d.file_size / 1024 / 1024).toFixed(1)} Mo</span>}
                        <span>· {new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-3">
                        {/* Télécharger */}
                        {d.file_url && (
                          <a href={d.file_url} target="_blank" rel="noreferrer" download
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-[#0066FF]/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-600/30 transition-all">
                            <Download className="h-4 w-4" />
                            Télécharger / Aperçu
                          </a>
                        )}

                        {/* Validation (seulement si pending) */}
                        {isPending && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button onClick={() => approveDeliverable(d.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
                                <ThumbsUp className="h-4 w-4" />Valider
                              </button>
                              <button onClick={() => rejectDeliverable(d.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all">
                                <ThumbsDown className="h-4 w-4" />Corriger
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Commentaire de modification (optionnel)..."
                              value={delivComment[d.id] || ''}
                              onChange={e => setDelivComment(prev => ({ ...prev, [d.id]: e.target.value }))}
                              className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#0066FF]/40 transition-all"
                            />
                          </div>
                        )}

                        {isRejected && d.rejection_reason && (
                          <div className="text-xs text-red-300/70 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
                            💬 Votre commentaire : {d.rejection_reason}
                          </div>
                        )}
                        {isApproved && d.approved_at && (
                          <p className="text-[10px] text-emerald-400/50 text-center">Validé le {new Date(d.approved_at).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ FACTURES ═══════════════════════ */}
        {activeTab === 'invoices' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Mes Factures</h2>
            </div>

            {/* Suivi global */}
            {invoices.length > 0 && (
              <Card className={`p-6 border ${totalDue > 0 ? 'border-red-500/20 bg-red-500/4' : 'border-emerald-500/20 bg-emerald-500/4'}`}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Montant restant à payer</p>
                    <p className={`text-4xl font-black ${totalDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatGNF(totalDue).replace(' GNF', '')} <span className="text-base font-semibold">GNF</span>
                    </p>
                    {totalDue === 0
                      ? <p className="text-emerald-400/60 text-sm mt-1">Tout est réglé ✓</p>
                      : <p className="text-white/30 text-xs mt-1">{unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} en attente</p>
                    }
                  </div>
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${totalDue > 0 ? 'bg-red-500/15 border border-red-500/25' : 'bg-emerald-500/15 border border-emerald-500/25'}`}>
                    {totalDue > 0 ? <AlertCircle className="h-7 w-7 text-red-400" /> : <CheckCircle className="h-7 w-7 text-emerald-400" />}
                  </div>
                </div>
                {totalDue > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-white/30 mb-1.5">
                      <span>Payé : {formatGNF(totalPaid)}</span>
                      <span>{paidPct}%</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${paidPct}%` }} />
                    </div>
                  </>
                )}
              </Card>
            )}

            {invoices.length === 0 ? (
              <Card className="p-16 text-center">
                <FileText className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-medium">Aucune facture pour l'instant.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv: any) => {
                  const st = INV_STATUS[inv.status] || { label: inv.status, color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' }
                  const rest = (inv.total_amount || 0) - (inv.paid_amount || 0)
                  return (
                    <Card key={inv.id} className="p-5" glow>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-11 w-11 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-[#00E5FF]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-mono text-xs text-white/40">{inv.invoice_number}</p>
                              <Badge className={st.color}>{st.label}</Badge>
                            </div>
                            <p className="text-lg font-black text-white mt-0.5">{formatGNF(inv.total_amount)}</p>
                            {inv.due_date && (
                              <p className="text-xs text-white/25 mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />Échéance : {new Date(inv.due_date).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => dlInvoice(inv)}
                          className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-[#0066FF]/30 flex items-center justify-center text-[#00E5FF] hover:bg-indigo-600/30 transition-all shrink-0"
                          title="Télécharger PDF">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      {inv.paid_amount > 0 && inv.paid_amount < inv.total_amount && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="flex justify-between text-xs text-white/30 mb-1.5">
                            <span>Payé : {formatGNF(inv.paid_amount)}</span>
                            <span>Restant : {formatGNF(rest)}</span>
                          </div>
                          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(((inv.paid_amount || 0) / (inv.total_amount || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ DEVIS ═══════════════════════ */}
        {activeTab === 'quotes' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Mes Devis</h2>
              {pendingQuotes.length > 0 && (
                <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {pendingQuotes.length} en attente
                </Badge>
              )}
            </div>
            {quotes.length === 0 ? (
              <Card className="p-16 text-center">
                <CreditCard className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-medium">Aucun devis pour l'instant.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotes.map((q: any) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    draft:    { label: 'Brouillon', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
                    sent:     { label: 'En attente', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
                    accepted: { label: 'Accepté', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
                    rejected: { label: 'Refusé', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
                    expired:  { label: 'Expiré', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
                  }
                  const st = statusMap[q.status] || { label: q.status, color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' }
                  return (
                    <Card key={q.id} className={`p-5 ${q.status === 'sent' ? 'border-amber-500/20' : ''}`} glow>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-white truncate">{q.title}</p>
                            <Badge className={st.color}>{st.label}</Badge>
                          </div>
                          <p className="text-xs text-white/30">{q.quote_number}</p>
                          {q.valid_until && <p className="text-xs text-white/25 mt-0.5">Valide jusqu'au {new Date(q.valid_until).toLocaleDateString('fr-FR')}</p>}
                          <p className="text-2xl font-black text-[#00E5FF] mt-2">{formatGNF(q.total_amount)} TTC</p>
                        </div>
                        <div className="flex gap-2 flex-wrap shrink-0">
                          <button onClick={() => dlQuote(q)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10 transition-all">
                            <Download className="h-3.5 w-3.5" />PDF
                          </button>
                          {q.status === 'sent' && (
                            <>
                              <button onClick={() => acceptQuote(q.id)}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
                                <Check className="h-4 w-4" />Accepter
                              </button>
                              <button onClick={() => rejectQuote(q.id)}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all">
                                <X className="h-4 w-4" />Refuser
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ MARKETING / SOCIAL ═══════════════════════ */}
        {activeTab === 'social' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-black text-white">Marketing & Réseaux Sociaux</h2>
              <p className="text-xs text-white/30">{publishedPubs.length} publiée{publishedPubs.length > 1 ? 's' : ''} · {publications.length} total</p>
            </div>

            {/* Stats */}
            {publishedPubs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Publiés', value: publishedPubs.length, icon: Image, color: 'text-[#00E5FF]', bg: 'bg-[#0066FF]/8 border-[#0066FF]/15' },
                  { label: 'Portée totale', value: totalReach > 0 ? totalReach.toLocaleString('fr-FR') : '–', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/15' },
                  { label: "J'aime", value: totalLikes > 0 ? totalLikes.toLocaleString('fr-FR') : '–', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/8 border-pink-500/15' },
                  { label: 'Commentaires', value: totalComments > 0 ? totalComments.toLocaleString('fr-FR') : '–', icon: MessageCircle, color: 'text-[#a855f7]', bg: 'bg-purple-500/8 border-purple-500/15' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className={`border rounded-2xl p-4 ${s.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-white/35">{s.label}</p>
                        <Icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Filtres plateforme */}
            {platforms.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {platforms.map(p => (
                  <button key={p} onClick={() => setPubFilter(p)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      pubFilter === p
                        ? 'bg-indigo-600/20 text-indigo-300 border-[#0066FF]/40'
                        : 'bg-white/4 text-white/35 border-white/8 hover:text-white/65'
                    }`}>
                    {p === 'all' ? 'Toutes les plateformes' : p}
                  </button>
                ))}
              </div>
            )}

            {filteredPubs.length === 0 ? (
              <Card className="p-16 text-center">
                <BarChart2 className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-medium">Aucune publication pour l'instant.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredPubs.map((pub: any) => (
                  <Card key={pub.id} className={`p-5 border ${platformBg(pub.platform)}`} glow>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${platformBg(pub.platform)}`}>
                          <PlatformIcon platform={pub.platform} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/50 capitalize">{pub.platform || 'Réseau'}</p>
                          {pub.content_type && <p className="text-[10px] text-white/25">{pub.content_type}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={PUB_STATUS[pub.status]?.color || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}>
                          {PUB_STATUS[pub.status]?.label || pub.status}
                        </Badge>
                        {pub.post_link && (
                          <a href={pub.post_link} target="_blank" rel="noreferrer"
                            className="h-7 w-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/25 hover:text-[#00E5FF] hover:bg-indigo-600/15 transition-all">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {pub.title && <p className="font-bold text-white text-sm mb-1.5">{pub.title}</p>}
                    {pub.content && <p className="text-xs text-white/40 line-clamp-3 mb-3">{pub.content}</p>}

                    {(pub.proof_url || pub.proof_link || pub.media_url) && (
                      <div className="mb-3 rounded-xl overflow-hidden bg-white/4 border border-white/8 h-40">
                        <img src={pub.proof_url || pub.proof_link || pub.media_url} alt={pub.title || 'Publication'}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    )}

                    {pub.status === 'published' && (pub.likes || pub.comments || pub.shares || pub.reach) ? (
                      <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-white/35">
                        {pub.reach > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{pub.reach.toLocaleString('fr-FR')}</span>}
                        {pub.likes > 0 && <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-400" />{pub.likes.toLocaleString('fr-FR')}</span>}
                        {pub.comments > 0 && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-[#a855f7]" />{pub.comments.toLocaleString('fr-FR')}</span>}
                        {pub.shares > 0 && <span className="flex items-center gap-1"><Share2 className="h-3 w-3 text-blue-400" />{pub.shares.toLocaleString('fr-FR')}</span>}
                      </div>
                    ) : null}

                    <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {pub.published_at
                        ? `Publié le ${new Date(pub.published_at).toLocaleDateString('fr-FR')}`
                        : pub.scheduled_at
                          ? `Planifié le ${new Date(pub.scheduled_at).toLocaleDateString('fr-FR')}`
                          : `Créé le ${new Date(pub.created_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ MESSAGES ═══════════════════════ */}
        {activeTab === 'messages' && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-white">Messages avec POPY TECH</h2>
            <Card className="overflow-hidden">
              {/* Zone messages */}
              <div className="h-[440px] overflow-y-auto p-5 space-y-3">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageSquare className="h-12 w-12 text-white/10 mb-4" />
                    <p className="text-white/30 font-medium">Aucun message pour l'instant.</p>
                    <p className="text-white/20 text-sm mt-1">Envoyez un message à notre équipe ci-dessous.</p>
                  </div>
                )}
                {messages.map((msg: any) => {
                  const isClient = msg.sender === 'client'
                  return (
                    <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      {!isClient && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#0066FF] to-[#6A00FF] flex items-center justify-center mr-2 mt-0.5 shrink-0">
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        isClient
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white/6 border border-white/10 text-white/80 rounded-bl-sm'
                      }`}>
                        {!isClient && <p className="text-[10px] text-[#00E5FF] font-bold mb-1 uppercase tracking-wider">POPY TECH</p>}
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1.5 ${isClient ? 'text-indigo-200/50' : 'text-white/20'}`}>
                          {new Date(msg.created_at).toLocaleDateString('fr-FR')} à {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={msgEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/6 p-4 flex gap-3">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
                />
                <button onClick={sendMessage} disabled={sendingMsg || !newMsg.trim()}
                  className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </Card>

            {/* Documents partagés */}
            {clientData.documents.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Documents partagés par l'agence</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {clientData.documents.map((doc: any) => (
                    <Card key={doc.id} className="p-4 flex items-start gap-3" glow>
                      <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-[#0066FF]/30 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-[#00E5FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90 text-sm truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {doc.category && <p className="text-xs text-white/30">{doc.category.replace(/_/g, ' ')}</p>}
                          <p className="text-xs text-white/20">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {doc.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{doc.description}</p>}
                      </div>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                          <button className="h-8 w-8 rounded-lg bg-white/4 border border-white/8 flex items-center justify-center text-white/30 hover:text-[#00E5FF] hover:bg-indigo-600/15 transition-all">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06091a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[#0066FF]/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-white/25 text-sm">Chargement...</p>
        </div>
      </div>
    }>
      <ClientPortalContent />
    </Suspense>
  )
}
