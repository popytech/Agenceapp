'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, FolderKanban, AlertCircle, CheckCircle2,
  Target, Send, FileText, Users, BarChart3, Timer, TrendingDown,
  MessageSquare, Eye, BookOpen,
  PhoneCall, Handshake, DollarSign, UserCheck, CalendarClock,
  Trophy, PlusCircle, ChevronDown, Flame, MapPin, Copy
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'

function formatGNF(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`
  return amount.toString()
}

function Spinner() {
  return (
    <div className="p-4 md:p-6 pt-4 md:pt-6 space-y-4 animate-pulse">
      <div className="h-8 w-56 bg-muted rounded-lg" />
      <div className="flex gap-1 overflow-x-hidden">
        {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-9 w-28 bg-muted rounded-t shrink-0" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    </div>
  )
}

function RapportAlert({ report }: { report: any }) {
  if (!report) {
    return (
      <div className="flex items-center justify-between bg-amber-50/50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Rapport du jour non soumis</p>
        </div>
        <Link href="/dashboard/journal">
          <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-400">Soumettre</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 bg-green-50/50 border border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30 rounded-lg p-4">
      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      <p className="text-sm font-medium text-green-700 dark:text-green-400">Rapport du jour soumis</p>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TaskList({ tasks }: { tasks: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />Mes tâches
        </CardTitle>
        <Link href="/dashboard/tasks"><Button variant="ghost" size="sm" className="text-xs h-7">Voir tout</Button></Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0
          ? <p className="text-xs text-muted-foreground text-center py-4">Aucune tâche en cours</p>
          : tasks.slice(0, 6).map(t => {
            const isLate = t.deadline && new Date(t.deadline) < new Date()
            return (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className={cn('h-2 w-2 rounded-full shrink-0', {
                  'bg-destructive': t.priority === 'haute' || t.priority === 'elevee' || isLate,
                  'bg-amber-500': t.priority === 'moyenne',
                  'bg-muted-foreground': t.priority === 'basse',
                })} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{t.title}</p>
                  {t.deadline && (
                    <p className={cn('text-xs', isLate ? 'text-destructive' : 'text-muted-foreground')}>
                      {isLate ? 'En retard — ' : ''}{new Date(t.deadline).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {t.status === 'a_faire' ? 'À faire' : t.status === 'en_cours' ? 'En cours' : 'Révision'}
                </Badge>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}

export default function CommercialDashboard() {
  const { profile } = useAuth()
  const [leads, setLeads] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview'|'pipeline'|'prospects'|'rdv'|'propositions'|'objectifs'|'scripts'>('overview')
  const [openScript, setOpenScript] = useState<string|null>(null)

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showRdvModal, setShowRdvModal] = useState(false)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendingProposal, setSendingProposal] = useState<any>(null)
  const [sendForm, setSendForm] = useState({ email: '', phone: '', message: '' })
  const [sending, setSendingState] = useState(false)
  const [saving, setSaving] = useState(false)

  const [leadForm, setLeadForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', source: 'manuel', status: 'lead_recu', score: '50', urgency: 'normal', estimated_budget: '', need: '' })
  const [rdvForm, setRdvForm] = useState({ title: '', lead_id: '', scheduled_at: '', duration_min: '30', type: 'visio', meet_link: '', notes: '' })
  const [proposalForm, setProposalForm] = useState({ title: '', lead_id: '', price: '', description: '', status: 'brouillon' })

    async function saveLead() {
      if (!leadForm.company_name) return
      setSaving(true)
      const { data, error } = await supabase.from('sales_leads').insert({
        company_name: leadForm.company_name,
        contact_name: leadForm.contact_name || null,
        contact_email: leadForm.contact_email || null,
        contact_phone: leadForm.contact_phone || null,
        source: leadForm.source,
        status: leadForm.status,
        score: Number(leadForm.score),
        urgency: leadForm.urgency,
        estimated_budget: leadForm.estimated_budget ? Number(leadForm.estimated_budget) : null,
        need: leadForm.need || null,
        assigned_to: profile!.id,
      }).select('id,company_name,contact_name,contact_email,contact_phone,status,score,estimated_budget,urgency,decision_level,source,need,notes,assigned_to,created_at,updated_at').single()
      setSaving(false)
      if (error) { console.error('saveLead error:', error); return }
      if (data) {
        setLeads(prev => [data, ...prev])
        setShowLeadModal(false)
        setLeadForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', source: 'manuel', status: 'lead_recu', score: '50', urgency: 'normal', estimated_budget: '', need: '' })
      }
    }

  async function saveRdv() {
    if (!rdvForm.scheduled_at) return
    setSaving(true)
    const { data, error } = await supabase.from('meetings').insert({
      title: rdvForm.title || 'RDV prospect',
      sales_lead_id: rdvForm.lead_id || null,
      lead_id: rdvForm.lead_id || null,
      assigned_to: profile!.id,
      scheduled_at: rdvForm.scheduled_at,
      duration_min: Number(rdvForm.duration_min),
      type: rdvForm.type,
      meet_link: rdvForm.meet_link || null,
      notes: rdvForm.notes || null,
      status: 'planifie',
    }).select('id,title,status,type,scheduled_at,duration_min,meet_link,notes,sales_leads(company_name,contact_name)').single()
    setSaving(false)
    if (error) { console.error('saveRdv error:', error); return }
    if (data) {
      setMeetings(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
      setShowRdvModal(false)
      setRdvForm({ title: '', lead_id: '', scheduled_at: '', duration_min: '30', type: 'visio', meet_link: '', notes: '' })
    }
  }

  async function saveProposal() {
    if (!proposalForm.title || !proposalForm.price) return
    setSaving(true)
    const { data, error } = await supabase.from('proposals').insert({
      title: proposalForm.title,
      sales_lead_id: proposalForm.lead_id || null,
      lead_id: proposalForm.lead_id || null,
      created_by: profile!.id,
      price: Number(proposalForm.price),
      description: proposalForm.description || null,
      status: proposalForm.status,
    }).select('id,title,price,status,view_count,created_at,sales_leads(company_name)').single()
    setSaving(false)
    if (error) { console.error('saveProposal error:', error); return }
    if (data) {
      setProposals(prev => [data, ...prev])
      setShowProposalModal(false)
      setProposalForm({ title: '', lead_id: '', price: '', description: '', status: 'brouillon' })
    }
  }

  function openSendModal(proposal: any) {
    // Pre-fill with lead contact info if available
    const lead = leads.find(l => l.id === proposal.lead_id || l.id === proposal.sales_lead_id)
    setSendingProposal(proposal)
    setSendForm({
      email: lead?.contact_email || '',
      phone: lead?.contact_phone || '',
      message: `Bonjour${lead?.contact_name ? ' ' + lead.contact_name : ''},\n\nVeuillez trouver ci-joint notre proposition commerciale "${proposal.title}" d'un montant de ${Number(proposal.price).toLocaleString('fr-FR')} GNF.\n\nNous restons disponibles pour toute question.\n\nCordialement,\nL'équipe Popytech`,
    })
    setShowSendModal(true)
  }

  async function sendByEmail() {
    if (!sendForm.email || !sendingProposal) return
    setSendingState(true)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendForm.email,
          proposalTitle: sendingProposal.title,
          proposalPrice: sendingProposal.price,
          message: sendForm.message,
          pdfUrl: sendingProposal.pdf_url,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Marquer comme envoyée
        await supabase.from('proposals').update({ status: 'envoyee', sent_at: new Date().toISOString() }).eq('id', sendingProposal.id)
        setProposals(prev => prev.map(p => p.id === sendingProposal.id ? { ...p, status: 'envoyee', sent_at: new Date().toISOString() } : p))
        setShowSendModal(false)
        toast.success(`Proposition envoyée par email à ${sendForm.email}`)
      } else {
        toast.error('Erreur envoi email : ' + (data.error || 'inconnu'))
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSendingState(false)
    }
  }

  function sendByWhatsApp() {
    if (!sendForm.phone || !sendingProposal) return
    const phone = sendForm.phone.replace(/\D/g, '')
    const text = encodeURIComponent(sendForm.message + (sendingProposal.pdf_url ? `\n\nLien PDF : ${sendingProposal.pdf_url}` : ''))
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
    // Marquer comme envoyée
    supabase.from('proposals').update({ status: 'envoyee', sent_at: new Date().toISOString() }).eq('id', sendingProposal.id)
    setProposals(prev => prev.map(p => p.id === sendingProposal.id ? { ...p, status: 'envoyee' } : p))
    toast.success('WhatsApp ouvert — proposition envoyée')
    setShowSendModal(false)
  }

    useEffect(() => {
      async function load() {
        if (!profile?.id) return
        const today = format(new Date(), 'yyyy-MM-dd')
        const isSuperAdmin = profile.role === 'super_admin'

        let leadsQuery = supabase.from('sales_leads').select('id,company_name,contact_name,status,score,estimated_budget,urgency,decision_level,source,need,notes,assigned_to,created_at,updated_at')
          let meetingsQuery = supabase.from('meetings').select('id,title,status,type,scheduled_at,duration_min,meet_link,notes,outcome,summary,sales_lead_id,lead_id')
          let proposalsQuery = supabase.from('proposals').select('id,title,price,status,view_count,sent_at,pdf_url,created_at,sales_lead_id,lead_id')
        let commissionsQuery = supabase.from('commissions').select('id,amount,status,percentage,paid_at,proposals(price,status)')
        let tasksQuery = supabase.from('tasks').select('id,title,status,priority,deadline')

        if (!isSuperAdmin) {
          leadsQuery = leadsQuery.eq('assigned_to', profile.id)
          meetingsQuery = meetingsQuery.eq('assigned_to', profile.id)
          proposalsQuery = proposalsQuery.eq('created_by', profile.id)
          commissionsQuery = commissionsQuery.eq('user_id', profile.id)
          tasksQuery = tasksQuery.or(`assigned_to.eq.${profile.id},assigned_to.is.null`)
        }

          const [l, m, pr, cm, t, rep] = await Promise.all([
            leadsQuery.order('updated_at', { ascending: false }).limit(100),
            meetingsQuery.order('scheduled_at', { ascending: true }).limit(50),
            proposalsQuery.order('created_at', { ascending: false }).limit(50),
            commissionsQuery.limit(50),
            tasksQuery.neq('status', 'termine').order('deadline', { ascending: true }).limit(10),
            supabase.from('daily_reports').select('id,report_date,mood,user_id').eq('user_id', profile.id).eq('report_date', today).maybeSingle(),
          ])
          const leadsData = l.data || []
          const leadsMap = Object.fromEntries(leadsData.map((ld: any) => [ld.id, ld]))

          // Enrichir meetings et proposals avec les infos du lead
          const meetingsEnriched = (m.data || []).map((mt: any) => ({
            ...mt,
            sales_leads: leadsMap[mt.sales_lead_id || mt.lead_id] || null,
          }))
          const proposalsEnriched = (pr.data || []).map((p: any) => ({
            ...p,
            sales_leads: leadsMap[p.sales_lead_id || p.lead_id] || null,
          }))

          setLeads(leadsData)
          setMeetings(meetingsEnriched)
          setProposals(proposalsEnriched)
          setCommissions(cm.data || [])
          setTasks(t.data || [])
          setReport(rep.data)
          setLoading(false)
      }
      load()
    }, [profile?.id, profile?.role])

  if (loading) return <Spinner />

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  const leadsToday = leads.filter(l => l.created_at?.startsWith(today))
  const rdvToday = meetings.filter(m => m.scheduled_at?.startsWith(today))
  const rdvUpcoming = meetings.filter(m => m.status === 'planifie' && new Date(m.scheduled_at) >= now)
  const inNegotiation = leads.filter(l => l.status === 'negociation')
  const nearClose = leads.filter(l => l.status === 'negociation' && l.score >= 70)
  const wonLeads = leads.filter(l => l.status === 'gagne')
  const totalCA = proposals.filter(p => p.status === 'acceptee').reduce((s, p) => s + (p.price || 0), 0)
  const monthlyGoal = 5000000
  const goalPct = Math.min(Math.round((totalCA / monthlyGoal) * 100), 100)
  const leadRdvRate = leads.length > 0
    ? Math.round((leads.filter(l => ['rdv_fixe','rdv_effectue','proposition_envoyee','negociation','gagne'].includes(l.status)).length / leads.length) * 100)
    : 0
  const rdvSignRate = meetings.filter(m => m.status === 'effectue').length > 0
    ? Math.round((wonLeads.length / meetings.filter(m => m.status === 'effectue').length) * 100)
    : 0
  const totalCommission = commissions.reduce((s, c) => s + (c.amount || 0), 0)
  const estimatedFutureComm = proposals.filter(p => p.status === 'en_discussion').reduce((s, p) => s + (p.price || 0) * 0.1, 0)

  const pipelineStages = [
    { key: 'lead_recu', label: 'Lead reçu', color: 'bg-slate-500' },
    { key: 'contact_etabli', label: 'Contact établi', color: 'bg-blue-500' },
    { key: 'rdv_fixe', label: 'RDV fixé', color: 'bg-indigo-500' },
    { key: 'rdv_effectue', label: 'RDV effectué', color: 'bg-violet-500' },
    { key: 'proposition_envoyee', label: 'Proposition', color: 'bg-amber-500' },
    { key: 'negociation', label: 'Négociation', color: 'bg-orange-500' },
    { key: 'gagne', label: 'Gagné', color: 'bg-emerald-500' },
    { key: 'perdu', label: 'Perdu', color: 'bg-destructive' },
  ]

  const scoreColor = (s: number) => s >= 70 ? 'text-emerald-500' : s >= 40 ? 'text-amber-500' : 'text-muted-foreground'
  const urgencyBadge: Record<string, string> = {
    critique: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    haute: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    faible: 'bg-muted text-muted-foreground',
  }
  const proposalBadge: Record<string, string> = {
    envoyee: 'border-muted-foreground text-muted-foreground',
    en_discussion: 'border-amber-500 text-amber-500',
    acceptee: 'border-emerald-500 text-emerald-500',
    refusee: 'border-destructive text-destructive',
    brouillon: 'border-muted text-muted-foreground',
  }

  const tabs = [
    { key: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { key: 'pipeline', label: 'Pipeline', icon: FolderKanban },
    { key: 'prospects', label: 'Prospects', icon: Users },
    { key: 'rdv', label: 'RDV', icon: CalendarClock },
    { key: 'propositions', label: 'Propositions', icon: FileText },
    { key: 'objectifs', label: 'Objectifs', icon: Trophy },
    { key: 'scripts', label: 'Scripts de vente', icon: BookOpen },
  ] as const

  return (
    <>
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Bonjour, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Badge variant="outline" className="text-xs w-fit">Commercial Digital</Badge>
      </div>

      <RapportAlert report={report} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border/50">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-t text-xs font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: VUE D'ENSEMBLE ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {nearClose.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/30 rounded-lg p-3">
              <Flame className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {nearClose.length} deal(s) chaud(s) proche(s) de la signature
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Leads aujourd'hui" value={leadsToday.length} sub="nouveaux leads reçus" icon={Users} color="text-indigo-500" />
            <KpiCard label="RDV prévus" value={rdvUpcoming.length} sub={`${rdvToday.length} aujourd'hui`} icon={CalendarClock} color="text-blue-500" />
            <KpiCard label="En négociation" value={inNegotiation.length} sub={`${nearClose.length} proche(s) signature`} icon={Handshake} color="text-amber-500" />
            <KpiCard label="Deals signés" value={wonLeads.length} sub="ce mois" icon={Trophy} color="text-emerald-500" />
            <KpiCard label="CA signé" value={formatGNF(totalCA)} sub={`objectif: ${formatGNF(monthlyGoal)}`} icon={DollarSign} color="text-emerald-500" />
            <KpiCard label="Taux lead → RDV" value={`${leadRdvRate}%`} sub={`RDV → Signature: ${rdvSignRate}%`} icon={TrendingUp} color="text-violet-500" />
          </div>

          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Objectif CA mensuel</p>
                <p className={cn('text-xl font-bold', goalPct >= 100 ? 'text-emerald-500' : goalPct >= 60 ? 'text-amber-500' : 'text-destructive')}>{goalPct}%</p>
              </div>
              <Progress value={goalPct} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{formatGNF(totalCA)} GNF signés</span>
                <span>Manque: {formatGNF(Math.max(0, monthlyGoal - totalCA))} GNF</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-destructive" />Qui appeler maintenant ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leads.filter(l => ['lead_recu','contact_etabli'].includes(l.status)).slice(0, 5).length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-3">Aucun lead en attente de contact</p>
                  : leads.filter(l => ['lead_recu','contact_etabli'].includes(l.status)).slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={cn('h-2 w-2 rounded-full shrink-0', l.status === 'lead_recu' ? 'bg-slate-400' : 'bg-blue-400')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{l.company_name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {l.source && <MapPin className="h-2.5 w-2.5 shrink-0" />}
                          {l.contact_name || 'Contact inconnu'}
                        </p>
                      </div>
                      <span className={cn('text-xs font-bold', scoreColor(l.score))}>{l.score}%</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />Deals proches de la signature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leads.filter(l => l.status === 'negociation').slice(0, 5).length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-3">Aucune négociation en cours</p>
                  : leads.filter(l => l.status === 'negociation').slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="h-2 w-2 rounded-full shrink-0 bg-orange-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{l.company_name}</p>
                        <p className="text-xs text-muted-foreground">{l.estimated_budget ? formatGNF(l.estimated_budget) + ' GNF' : 'Budget ?'}</p>
                      </div>
                      <span className={cn('text-xs font-bold', scoreColor(l.score))}>{l.score}%</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />RDV aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rdvToday.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-3">Aucun RDV aujourd'hui</p>
                : rdvToday.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="h-2 w-2 rounded-full shrink-0 bg-indigo-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.sales_leads?.company_name || 'Prospect'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {m.type}
                      </p>
                    </div>
                    {m.meet_link && (
                      <a href={m.meet_link} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-7">Rejoindre</Button>
                      </a>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>

          <TaskList tasks={tasks} />
        </div>
      )}

      {/* ── TAB: PIPELINE ── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{leads.length} leads au total</p>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowLeadModal(true)}>
              <PlusCircle className="h-3.5 w-3.5" />Nouveau lead
            </Button>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {pipelineStages.map(stage => {
                const stageLeads = leads.filter(l => l.status === stage.key)
                return (
                  <div key={stage.key} className="w-52 shrink-0">
                    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-xs font-semibold', stage.color)}>
                      <span>{stage.label}</span>
                      <span className="ml-auto bg-white/20 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <div className="bg-muted/40 border border-border/50 rounded-b-lg min-h-[200px] p-2 space-y-2">
                      {stageLeads.length === 0
                        ? <p className="text-xs text-muted-foreground text-center pt-6">Vide</p>
                        : stageLeads.map(l => (
                          <div key={l.id} className="bg-card border border-border/60 rounded-lg p-3 space-y-1.5 shadow-sm">
                            <p className="text-xs font-semibold truncate">{l.company_name}</p>
                            {l.contact_name && <p className="text-xs text-muted-foreground truncate">{l.contact_name}</p>}
                            <div className="flex items-center justify-between">
                              {l.estimated_budget > 0 && (
                                <span className="text-xs text-emerald-600 font-medium">{formatGNF(l.estimated_budget)}</span>
                              )}
                              <span className={cn('text-xs font-bold ml-auto', scoreColor(l.score))}>{l.score}%</span>
                            </div>
                            {l.urgency && l.urgency !== 'normal' && (
                              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', urgencyBadge[l.urgency])}>
                                {l.urgency}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Taux lead→RDV" value={`${leadRdvRate}%`} sub="transformation" icon={TrendingUp} color="text-indigo-500" />
            <KpiCard label="Taux RDV→Signature" value={`${rdvSignRate}%`} sub="closing" icon={UserCheck} color="text-emerald-500" />
            <KpiCard label="Cycle moyen" value="—" sub="jours (bientôt)" icon={Timer} color="text-muted-foreground" />
            <KpiCard label="Valeur moy. contrat" value={wonLeads.length > 0 ? formatGNF(totalCA / wonLeads.length) : '—'} sub="GNF" icon={DollarSign} color="text-amber-500" />
          </div>
        </div>
      )}

      {/* ── TAB: PROSPECTS ── */}
      {activeTab === 'prospects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{leads.length} prospects</p>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowLeadModal(true)}>
              <PlusCircle className="h-3.5 w-3.5" />Nouveau prospect
            </Button>
          </div>
          {leads.length === 0
            ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun prospect assigné</p>
              </div>
            )
            : leads.map(l => (
              <Card key={l.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{l.company_name}</p>
                        <Badge variant="outline" className="text-xs">{pipelineStages.find(s => s.key === l.status)?.label || l.status}</Badge>
                        {l.urgency && l.urgency !== 'normal' && (
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', urgencyBadge[l.urgency])}>{l.urgency}</span>
                        )}
                      </div>
                      {l.contact_name && <p className="text-xs text-muted-foreground mt-0.5">{l.contact_name}{l.contact_email ? ` · ${l.contact_email}` : ''}</p>}
                      {l.need && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.need}</p>}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {l.estimated_budget > 0 && (
                          <span className="text-xs font-medium text-emerald-600">Budget: {formatGNF(l.estimated_budget)} GNF</span>
                        )}
                        <span className="text-xs text-muted-foreground">Source: {l.source}</span>
                        {l.decision_level && <span className="text-xs text-muted-foreground">Décision: {l.decision_level}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-lg font-bold', scoreColor(l.score))}>{l.score}%</p>
                      <p className="text-xs text-muted-foreground">score</p>
                    </div>
                  </div>
                  {l.notes && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <p className="text-xs text-muted-foreground line-clamp-2">{l.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* ── TAB: RDV ── */}
      {activeTab === 'rdv' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{meetings.length} RDV au total</p>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowRdvModal(true)}>
              <PlusCircle className="h-3.5 w-3.5" />Planifier RDV
            </Button>
          </div>
          {['planifie','effectue','annule'].map(statusGroup => {
            const groupMeetings = meetings.filter(m => m.status === statusGroup)
            if (groupMeetings.length === 0) return null
            const groupLabel: Record<string, string> = { planifie: 'À venir', effectue: 'Effectués', annule: 'Annulés' }
            return (
              <div key={statusGroup}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{groupLabel[statusGroup]}</p>
                <div className="space-y-2">
                  {groupMeetings.map(m => (
                    <Card key={m.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', {
                            'bg-indigo-400': m.status === 'planifie',
                            'bg-emerald-400': m.status === 'effectue',
                            'bg-destructive': m.status === 'annule',
                          })} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{m.sales_leads?.company_name || 'Prospect'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(m.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {' · '}
                              {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{m.type}
                            </p>
                            {m.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.summary}</p>}
                            {m.outcome && (
                              <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full mt-1', {
                                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400': m.outcome === 'chaud',
                                'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400': m.outcome === 'a_suivre',
                                'bg-muted text-muted-foreground': m.outcome === 'non_qualifie',
                              })}>
                                {m.outcome === 'chaud' ? 'Chaud' : m.outcome === 'a_suivre' ? 'À suivre' : 'Non qualifié'}
                              </span>
                            )}
                          </div>
                          {m.meet_link && m.status === 'planifie' && (
                            <a href={m.meet_link} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">Rejoindre</Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
          {meetings.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun RDV planifié</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PROPOSITIONS ── */}
      {activeTab === 'propositions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{proposals.length} propositions</p>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowProposalModal(true)}>
              <PlusCircle className="h-3.5 w-3.5" />Nouvelle proposition
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Envoyées" value={proposals.filter(p => p.status === 'envoyee').length} sub="en attente réponse" icon={Send} color="text-muted-foreground" />
            <KpiCard label="En discussion" value={proposals.filter(p => p.status === 'en_discussion').length} sub="actives" icon={MessageSquare} color="text-amber-500" />
            <KpiCard label="Acceptées" value={proposals.filter(p => p.status === 'acceptee').length} sub="signées" icon={TrendingUp} color="text-emerald-500" />
            <KpiCard label="Refusées" value={proposals.filter(p => p.status === 'refusee').length} sub="perdues" icon={TrendingDown} color="text-destructive" />
          </div>
          {proposals.filter(p => p.status === 'en_discussion' && (p.view_count || p.views_count || 0) >= 3).length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/30 rounded-lg p-3">
              <Flame className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {proposals.filter(p => p.status === 'en_discussion' && (p.view_count || p.views_count || 0) >= 3).length} proposition(s) consultée(s) 3+ fois — Deal chaud !
              </p>
            </div>
          )}
          {proposals.length === 0
            ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune proposition créée</p>
              </div>
            )
            : proposals.map(p => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{p.title}</p>
                        <Badge variant="outline" className={cn('text-xs shrink-0', proposalBadge[p.status] || '')}>
                          {p.status === 'envoyee' ? 'Envoyée' : p.status === 'en_discussion' ? 'En discussion' : p.status === 'acceptee' ? 'Acceptée' : p.status === 'refusee' ? 'Refusée' : 'Brouillon'}
                        </Badge>
                        {(p.view_count || p.views_count || 0) >= 3 && <Flame className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.sales_leads?.company_name}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-sm font-bold text-emerald-600">{formatGNF(p.price)} GNF</span>
                        {p.sent_at && <span className="text-xs text-muted-foreground">Envoyée le {new Date(p.sent_at).toLocaleDateString('fr-FR')}</span>}
                        {(p.view_count || p.views_count || 0) > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{p.view_count || p.views_count} vue(s)</span>}
                      </div>
                    </div>
                      {p.pdf_url && (
                        <a href={p.pdf_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">PDF</Button>
                        </a>
                      )}
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1 shrink-0 border-green-300 text-green-700 hover:bg-green-50" onClick={() => openSendModal(p)}>
                        <Send className="h-3 w-3" /> Envoyer
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* ── TAB: OBJECTIFS ── */}
      {activeTab === 'objectifs' && (
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />Objectif CA mensuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-3xl font-bold text-emerald-500">{formatGNF(totalCA)} <span className="text-sm font-normal text-muted-foreground">GNF</span></p>
                  <p className="text-xs text-muted-foreground">/ {formatGNF(monthlyGoal)} GNF</p>
                </div>
                <Progress value={goalPct} className="h-4" />
                <p className="text-xs text-muted-foreground mt-1">
                  {goalPct >= 100 ? 'Objectif atteint !' : `Il manque ${formatGNF(monthlyGoal - totalCA)} GNF pour atteindre l'objectif`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Deals signés</p>
                  <p className="text-xl font-bold mt-0.5">{wonLeads.length}</p>
                  <p className="text-xs text-muted-foreground">/ 10 objectif</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Taux de clôture</p>
                  <p className="text-xl font-bold mt-0.5">{rdvSignRate}%</p>
                  <p className="text-xs text-muted-foreground">RDV → Signature</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />Commissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Commission gagnée</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatGNF(totalCommission)} <span className="text-xs font-normal">GNF</span></p>
                </div>
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Comm. potentielle</p>
                  <p className="text-xl font-bold text-amber-600 mt-0.5">{formatGNF(estimatedFutureComm)} <span className="text-xs font-normal">GNF</span></p>
                </div>
              </div>
              {commissions.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-3">Aucune commission enregistrée</p>
                : commissions.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Commission {c.percentage}%</p>
                      <p className="text-xs text-muted-foreground">{c.proposals?.price ? formatGNF(c.proposals.price) + ' GNF (deal)' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600">{formatGNF(c.amount)} GNF</p>
                      <Badge variant="outline" className={cn('text-xs', c.status === 'payee' ? 'border-emerald-500 text-emerald-500' : c.status === 'validee' ? 'border-blue-500 text-blue-500' : 'border-muted-foreground text-muted-foreground')}>
                        {c.status === 'payee' ? 'Payée' : c.status === 'validee' ? 'Validée' : 'Estimée'}
                      </Badge>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />Indicateurs de performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Lead→RDV', val: leadRdvRate, target: 60 },
                  { name: 'RDV→Sign.', val: rdvSignRate, target: 40 },
                  { name: 'Obj. CA', val: goalPct, target: 100 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} formatter={(v: any) => [`${v}%`]} />
                  <Bar dataKey="val" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Actuel" />
                  <Bar dataKey="target" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Objectif" opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: SCRIPTS DE VENTE ── */}
      {activeTab === 'scripts' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Scripts prêts à l'emploi — cliquez pour dérouler le script complet.</p>
          {[
            {
              id: 'premier_appel',
              emoji: '📞',
              title: 'Premier appel à froid',
              context: 'Lead reçu, aucun contact préalable',
              color: 'border-blue-200 dark:border-blue-800/50',
              badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
              steps: [
                { label: 'Accroche (5 sec)', text: "« Bonjour [Prénom], c'est [Votre prénom] de Popytech. Je vous appelle car j'ai vu que [entreprise/secteur] et je pense avoir quelque chose d'utile pour vous. Vous avez 2 minutes ? »" },
                { label: 'Pitch elevator (30 sec)', text: "« On aide les entreprises comme la vôtre à [résultat concret] grâce à [votre solution]. On l'a fait récemment pour [exemple client similaire] — ils ont [résultat chiffré]. »" },
                { label: 'Question de qualification', text: "« Actuellement, comment est-ce que vous gérez [problème que vous résolvez] ? Est-ce que c'est quelque chose qui vous pèse ? »" },
                { label: "Objectif de l'appel", text: "« Mon but n'est pas de vous vendre quoi que ce soit aujourd'hui — juste de comprendre votre situation et voir si on peut vous aider. Est-ce qu'on peut fixer 20 minutes cette semaine ? »" },
                { label: 'Fermer sur un RDV', text: "« Est-ce que jeudi ou vendredi vous convient mieux ? Matin ou après-midi ? » → Confirmer par email/WhatsApp dans les 10 min." },
              ],
            },
            {
              id: 'relance',
              emoji: '🔁',
              title: 'Relance après silence',
              context: 'Proposition envoyée, pas de réponse depuis +3 jours',
              color: 'border-amber-200 dark:border-amber-800/50',
              badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
              steps: [
                { label: 'Email/Message J+3', text: "« Bonjour [Prénom], je voulais m'assurer que vous avez bien reçu notre proposition. Avez-vous eu l'occasion d'y jeter un œil ? Si vous avez des questions ou souhaitez qu'on en discute, je suis disponible. »" },
                { label: 'Appel J+5', text: "« Bonjour [Prénom], c'est [Votre prénom]. Je vous rappelle suite à la proposition que je vous ai envoyée. Est-ce que vous avez pu la consulter ? Qu'est-ce que vous en avez pensé ? »" },
                { label: "Si pas de réponse — créer de l'urgence", text: "« Je voulais vous informer qu'on a une ouverture ce mois-ci pour démarrer rapidement. Si vous souhaitez en profiter, il faudrait qu'on se décide avant [date]. Sinon pas de souci, on reporte. »" },
                { label: 'Relance finale J+10', text: "« Je pense que ma proposition n'est peut-être pas la bonne pour vous en ce moment — et c'est ok. Dites-moi juste un mot pour que je ne vous relance plus. Ou si vous voulez qu'on discute d'une version ajustée, je suis là. »" },
              ],
            },
            {
              id: 'objections',
              emoji: '🛡️',
              title: 'Gestion des objections',
              context: 'Pendant ou après le pitch',
              color: 'border-orange-200 dark:border-orange-800/50',
              badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
              steps: [
                { label: "« C'est trop cher »", text: "« Je comprends. Par rapport à quoi vous trouvez ça cher ? [écouter] ... En fait, si on regarde ce que ça vous rapporte — [ROI concret] — le prix se rentabilise en [délai]. Qu'est-ce qui vous ferait dire que c'est un bon investissement ? »" },
                { label: "« J'ai pas le temps »", text: "« C'est exactement pour ça qu'on existe — pour vous faire gagner du temps. Combien d'heures par semaine passez-vous sur [tâche concernée] ? [écouter] ... On peut réduire ça à [durée]. »" },
                { label: "« On a déjà quelqu'un »", text: "« Très bien ! C'est quoi ce que vous utilisez actuellement ? [écouter] ... Et est-ce qu'il y a des points où vous n'êtes pas 100% satisfait ? [écouter] ... C'est justement ce que beaucoup de nos clients nous ont dit avant de tester notre approche. »" },
                { label: "« Je dois en parler à mon associé »", text: "« Bien sûr. Pour vous aider à lui présenter le sujet, qu'est-ce qui l'intéresserait le plus dans ce qu'on fait ? Et vous, personnellement, qu'est-ce qui vous a le plus convaincu ? ... Est-ce qu'on peut faire une réunion à 3 ? »" },
                { label: "« Rappelez-moi dans 3 mois »", text: "« Je note ça. Juste pour comprendre — qu'est-ce qui change dans 3 mois ? [écouter] ... Si cette contrainte n'existait pas, est-ce que vous seriez prêt à avancer aujourd'hui ? »" },
              ],
            },
            {
              id: 'closing',
              emoji: '🏆',
              title: 'Script de closing',
              context: 'Prospect chaud, score ≥ 70%, en négociation',
              color: 'border-emerald-200 dark:border-emerald-800/50',
              badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
              steps: [
                { label: 'Résumer les bénéfices validés', text: "« Pour résumer ce dont on a discuté — vous cherchez à [besoin 1] et [besoin 2], et vous aviez mentionné que [problème actuel]. Notre solution vous permet de [résultat 1] et [résultat 2]. C'est toujours votre priorité ? »" },
                { label: "Tester l'intention", text: "« Sur une échelle de 1 à 10, à quel point vous vous sentez prêt à avancer avec nous ? » → Si < 7 : « Qu'est-ce qui vous empêche d'être à 9 ? » → Traiter le blocage." },
                { label: 'Proposition finale simple', text: "« Voilà ce que je vous propose : on commence avec [offre de départ] à [prix]. Ça vous permet de [résultat immédiat]. Si vous êtes satisfait, on élargit. Ça vous convient ? »" },
                { label: 'Silence après la question de closing', text: "→ NE PAS PARLER. Le premier qui parle après « Ça vous convient ? » cède du terrain. Attendez la réponse." },
                { label: 'Lever la dernière hésitation', text: "« Je sens qu'il reste quelque chose. Qu'est-ce qui vous retient encore ? » [écouter sans interrompre] → Répondre uniquement au vrai blocage exprimé." },
                { label: 'Signer maintenant', text: "« On peut envoyer le bon de commande maintenant et vous recevrez la confirmation dans la minute. On bloque votre démarrage pour [date]. Ça vous va ? »" },
              ],
            },
            {
              id: 'rdv_confirmation',
              emoji: '📅',
              title: 'Confirmation de RDV',
              context: 'J-1 avant un rendez-vous important',
              color: 'border-indigo-200 dark:border-indigo-800/50',
              badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
              steps: [
                { label: 'Message de confirmation (J-1)', text: "« Bonjour [Prénom], je vous confirme notre RDV de demain [heure] via [plateforme]. Lien : [lien]. Pour qu'on soit le plus efficaces possible, pouvez-vous me dire rapidement quel est votre objectif principal pour 2025 côté [domaine] ? »" },
                { label: "Préparation mentale avant l'appel", text: "→ Relire les notes du prospect. → Préparer 3 questions ouvertes. → Avoir la proposition prête. → Objectif de l'appel : fixer la prochaine étape concrète." },
                { label: 'Ouverture du RDV', text: "« Bonjour [Prénom], merci de votre temps. Pour qu'on soit le plus efficaces, j'ai prévu 20 minutes — les 10 premières pour comprendre votre situation, les 10 suivantes pour voir si et comment on peut vous aider. Ça vous va ? »" },
                { label: 'Clôturer le RDV sur une action', text: "« Super. La prochaine étape logique c'est [envoyer la proposition / faire une démo / impliquer votre associé]. Je vous envoie ça d'ici [délai]. On se cale un appel [date] pour en discuter ? »" },
              ],
            },
            {
              id: 'reactivation',
              emoji: '♻️',
              title: "Réactivation d'un prospect froid",
              context: 'Lead perdu ou sans contact depuis +30 jours',
              color: 'border-violet-200 dark:border-violet-800/50',
              badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
              steps: [
                { label: 'Accroche (nouvelle info)', text: "« Bonjour [Prénom], j'espère que vous allez bien. Je vous recontacte car on vient de [lancer une nouvelle fonctionnalité / sortir un cas client dans votre secteur / avoir une nouvelle offre]. Je me suis dit que ça pourrait vous intéresser. »" },
                { label: 'Rappeler le contexte', text: "« On s'était parlé il y a quelques mois de [sujet]. À l'époque ce n'était pas le bon moment. Est-ce que la situation a évolué de votre côté ? »" },
                { label: 'Offre de réengagement sans pression', text: "« Je ne veux pas vous solliciter pour rien. Juste vous partager [article / étude de cas / résultat client]. Et si ça vous donne envie d'échanger 15 minutes, je suis là. Sinon, aucun souci. »" },
              ],
            },
          ].map(script => (
            <Card key={script.id} className={`border ${script.color} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setOpenScript(openScript === script.id ? null : script.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl shrink-0">{script.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{script.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{script.context}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${script.badge}`}>{script.steps.length} étapes</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openScript === script.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {openScript === script.id && (
                  <div className="mt-4 space-y-3 border-t border-border/50 pt-4" onClick={e => e.stopPropagation()}>
                    {script.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground mb-1">{step.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3 italic">{step.text}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => {
                        const text = script.steps.map((s, i) => `${i+1}. ${s.label}\n${s.text}`).join('\n\n')
                        navigator.clipboard.writeText(text)
                      }}>
                        <Copy className="h-3.5 w-3.5" />Copier le script
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

    {/* ── MODAL: NOUVEAU LEAD ── */}
    <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau prospect / lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Entreprise *</Label>
              <Input placeholder="Nom de l'entreprise" value={leadForm.company_name} onChange={e => setLeadForm(f => ({...f, company_name: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact</Label>
              <Input placeholder="Prénom Nom" value={leadForm.contact_name} onChange={e => setLeadForm(f => ({...f, contact_name: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="contact@entreprise.com" value={leadForm.contact_email} onChange={e => setLeadForm(f => ({...f, contact_email: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Téléphone</Label>
              <Input placeholder="+224 xxx xxx xxx" value={leadForm.contact_phone} onChange={e => setLeadForm(f => ({...f, contact_phone: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={leadForm.source} onValueChange={v => setLeadForm(f => ({...f, source: v}))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">Manuel</SelectItem>
                  <SelectItem value="reseaux_sociaux">Réseaux sociaux</SelectItem>
                  <SelectItem value="referral">Référence</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="cold_call">Cold call</SelectItem>
                  <SelectItem value="site_web">Site web</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Urgence</Label>
              <Select value={leadForm.urgency} onValueChange={v => setLeadForm(f => ({...f, urgency: v}))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Score (%)</Label>
              <Input type="number" min={0} max={100} placeholder="50" value={leadForm.score} onChange={e => setLeadForm(f => ({...f, score: e.target.value}))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Budget estimé (GNF)</Label>
            <Input type="number" placeholder="0" value={leadForm.estimated_budget} onChange={e => setLeadForm(f => ({...f, estimated_budget: e.target.value}))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Besoin / Description</Label>
            <Textarea placeholder="Décrivez le besoin du prospect..." rows={3} value={leadForm.need} onChange={e => setLeadForm(f => ({...f, need: e.target.value}))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowLeadModal(false)}>Annuler</Button>
          <Button disabled={!leadForm.company_name || saving} onClick={saveLead}>
            {saving ? 'Enregistrement...' : 'Créer le lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── MODAL: PLANIFIER RDV ── */}
    <Dialog open={showRdvModal} onOpenChange={setShowRdvModal}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planifier un RDV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Titre du RDV</Label>
            <Input placeholder="Ex: Présentation offre réseaux sociaux" value={rdvForm.title} onChange={e => setRdvForm(f => ({...f, title: e.target.value}))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prospect lié</Label>
            <Select value={rdvForm.lead_id} onValueChange={v => setRdvForm(f => ({...f, lead_id: v}))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir un prospect (optionnel)" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}{l.contact_name ? ` — ${l.contact_name}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date et heure *</Label>
              <Input type="datetime-local" value={rdvForm.scheduled_at} onChange={e => setRdvForm(f => ({...f, scheduled_at: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Durée (min)</Label>
              <Select value={rdvForm.duration_min} onValueChange={v => setRdvForm(f => ({...f, duration_min: v}))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={rdvForm.type} onValueChange={v => setRdvForm(f => ({...f, type: v}))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visio">Visio</SelectItem>
                  <SelectItem value="presentiel">Présentiel</SelectItem>
                  <SelectItem value="telephone">Téléphone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lien Meet / Zoom</Label>
              <Input placeholder="https://meet.google.com/..." value={rdvForm.meet_link} onChange={e => setRdvForm(f => ({...f, meet_link: e.target.value}))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes de préparation</Label>
            <Textarea placeholder="Points à aborder, questions clés..." rows={3} value={rdvForm.notes} onChange={e => setRdvForm(f => ({...f, notes: e.target.value}))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRdvModal(false)}>Annuler</Button>
          <Button disabled={!rdvForm.scheduled_at || saving} onClick={saveRdv}>
            {saving ? 'Enregistrement...' : 'Planifier le RDV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── MODAL: NOUVELLE PROPOSITION ── */}
    <Dialog open={showProposalModal} onOpenChange={setShowProposalModal}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle proposition commerciale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Titre de la proposition *</Label>
            <Input placeholder="Ex: Pack réseaux sociaux 3 mois" value={proposalForm.title} onChange={e => setProposalForm(f => ({...f, title: e.target.value}))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prospect lié</Label>
            <Select value={proposalForm.lead_id} onValueChange={v => setProposalForm(f => ({...f, lead_id: v}))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Associer à un prospect (optionnel)" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}{l.contact_name ? ` — ${l.contact_name}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Montant (GNF) *</Label>
              <Input type="number" placeholder="0" value={proposalForm.price} onChange={e => setProposalForm(f => ({...f, price: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Select value={proposalForm.status} onValueChange={v => setProposalForm(f => ({...f, status: v}))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="en_discussion">En discussion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description / Contenu</Label>
            <Textarea placeholder="Détaillez les services inclus, livrables, conditions..." rows={4} value={proposalForm.description} onChange={e => setProposalForm(f => ({...f, description: e.target.value}))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowProposalModal(false)}>Annuler</Button>
          <Button disabled={!proposalForm.title || !proposalForm.price || saving} onClick={saveProposal}>
            {saving ? 'Enregistrement...' : 'Créer la proposition'}
          </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Modal Envoyer Proposition ── */}
    <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-green-600" />
            Envoyer la proposition
          </DialogTitle>
        </DialogHeader>
        {sendingProposal && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-semibold">{sendingProposal.title}</p>
              <p className="text-xs text-muted-foreground">{Number(sendingProposal.price).toLocaleString('fr-FR')} GNF</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email du prospect</Label>
              <Input placeholder="contact@client.com" value={sendForm.email} onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Téléphone WhatsApp (avec indicatif, ex: 224XXXXXXXXX)</Label>
              <Input placeholder="224XXXXXXXXX" value={sendForm.phone} onChange={e => setSendForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message d'accompagnement</Label>
              <Textarea rows={5} value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))} className="text-xs" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!sendForm.email || sending}
                onClick={sendByEmail}
              >
                {sending ? <><MapPin className="h-3.5 w-3.5 animate-spin" />Envoi...</> : <><Send className="h-3.5 w-3.5" />Envoyer par Email</>}
              </Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={!sendForm.phone}
                onClick={sendByWhatsApp}
              >
                <MessageSquare className="h-3.5 w-3.5" />WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              WhatsApp ouvre dans un nouvel onglet · Email envoyé directement depuis l'app
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
