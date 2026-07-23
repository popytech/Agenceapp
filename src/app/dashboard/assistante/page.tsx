'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
  LayoutDashboard, FolderKanban, Calendar, FileText,
  Users, Bell, AlertTriangle, Plus, Search, X, Check,
  Clock, DollarSign, Building, Megaphone, BookOpen,
  UserCheck, UserX, Coffee, Plane, Download, Trash2,
  Send, Filter, RefreshCw, ChevronRight, TrendingUp,
  Wifi, Activity, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatGNF } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string; title: string; status: string; progress: number
  end_date: string | null; budget: number
  clients?: { company_name: string }
  profiles?: { full_name: string }
}

interface Meeting {
  id: string; title: string; description: string | null
  type: string; date: string; duration_minutes: number
  location: string | null; status: string; created_at: string
}

interface Employee {
  id: string; full_name: string; email: string; role: string; status: string
}

interface HRAttendance {
  id: string; employee_id: string; date: string; status: string; note: string | null
  profiles?: { full_name: string }
}

interface LeaveRequest {
  id: string; employee_id: string; start_date: string; end_date: string
  type: string; reason: string | null; status: string; created_at: string
  profiles?: { full_name: string }
}

interface Announcement {
  id: string; title: string; message: string; priority: string
  created_at: string
  profiles?: { full_name: string }
}

interface Document {
  id: string; title: string; category: string; file_url: string | null
  description: string | null; created_at: string
  profiles?: { full_name: string }
}

interface Invoice {
  id: string; invoice_number: string; total_amount: number; paid_amount: number; status: string
  due_date: string | null; created_at: string
  clients?: { company_name: string }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PROJECT: Record<string, { label: string; color: string }> = {
  active:    { label: 'En cours',   color: 'bg-[#0066FF]/15 text-[#0066FF] border-[#0066FF]/20' },
  completed: { label: 'Terminé',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  on_hold:   { label: 'En pause',   color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  cancelled: { label: 'Annulé',     color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  pending:   { label: 'En attente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
}

const MEETING_TYPES: Record<string, string> = {
  rdv_client: 'RDV Client', reunion_interne: 'Réunion interne',
  tournage: 'Tournage', formation: 'Formation', livraison: 'Livraison',
}

const LEAVE_TYPES: Record<string, string> = {
  conge: 'Congé', absence: 'Absence', maladie: 'Maladie',
  formation: 'Formation', autre: 'Autre',
}

const DOC_CATEGORIES: Record<string, string> = {
  contrat_client: 'Contrat client', contrat_employe: 'Contrat employé',
  nda: 'NDA', devis_type: 'Devis type', procedure: 'Procédure interne',
  autre: 'Autre',
}

const MEETING_ACCENT: Record<string, string> = {
  rdv_client: 'bg-[#0066FF]',
  reunion_interne: 'bg-[#00E5FF]',
  tournage: 'bg-red-500',
  formation: 'bg-emerald-500',
  livraison: 'bg-amber-500',
}

const TABS = [
  { id: 'overview',      label: 'Vue globale',   icon: LayoutDashboard },
  { id: 'projects',      label: 'Projets',        icon: FolderKanban },
  { id: 'agenda',        label: 'Agenda',         icon: Calendar },
  { id: 'hr',            label: 'RH & Présences', icon: Users },
  { id: 'documents',     label: 'Documents',      icon: FileText },
  { id: 'communication', label: 'Communication',  icon: Megaphone },
]

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: number | string; sub?: string; accent?: string; icon: React.ElementType
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5',
      'bg-white dark:bg-[#0A0F1E] border-slate-200 dark:border-white/[0.06]',
    )}>
      {/* glow blob */}
      <div className={cn(
        'absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20',
        accent ?? 'bg-[#0066FF]'
      )} />
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          'bg-gradient-to-br from-[#0066FF]/20 to-[#00E5FF]/10 border border-[#0066FF]/20'
        )}>
          <Icon className="w-4 h-4 text-[#0066FF]" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#00E5FF] mt-1">{sub}</p>}
    </div>
  )
}

// ─── Section Title ─────────────────────────────────────────────────────────────

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-0.5 rounded-full bg-gradient-to-b from-[#0066FF] to-[#00E5FF]" />
        <h2 className="font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  )
}

// ─── Tag Badge ─────────────────────────────────────────────────────────────────

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
      color ?? 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]'
    )}>
      {children}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssistantePage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const validTabs = ['overview', 'projects', 'agenda', 'hr', 'documents', 'communication']
  const [activeTab, setActiveTab] = useState(tabParam && validTabs.includes(tabParam) ? tabParam : 'overview')

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) setActiveTab(tabParam)
  }, [tabParam])

  const [projects,      setProjects]      = useState<Project[]>([])
  const [meetings,      setMeetings]      = useState<Meeting[]>([])
  const [employees,     setEmployees]     = useState<Employee[]>([])
  const [attendance,    setAttendance]    = useState<HRAttendance[]>([])
  const [leaves,        setLeaves]        = useState<LeaveRequest[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [documents,     setDocuments]     = useState<Document[]>([])
  const [invoices,      setInvoices]      = useState<Invoice[]>([])
  const [loading,       setLoading]       = useState(true)

  const [showMeetingModal,      setShowMeetingModal]      = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showDocumentModal,     setShowDocumentModal]     = useState(false)
  const [showLeaveModal,        setShowLeaveModal]        = useState(false)
  const [showAttendanceModal,   setShowAttendanceModal]   = useState(false)

  const [meetingForm,      setMeetingForm]      = useState({ title: '', description: '', type: 'rdv_client', date: '', duration_minutes: '60', location: '', status: 'scheduled' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', priority: 'normal' })
  const [documentForm,     setDocumentForm]     = useState({ title: '', category: 'procedure', file_url: '', description: '' })
  const [leaveForm,        setLeaveForm]        = useState({ employee_id: 'none', start_date: '', end_date: '', type: 'conge', reason: '', status: 'pending' })
  const [attendanceForm,   setAttendanceForm]   = useState({ employee_id: 'none', date: new Date().toISOString().slice(0, 10), status: 'present', note: '' })

  const [search,        setSearch]        = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [saving,        setSaving]        = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const [p, m, emp, att, lv, ann, doc, inv] = await Promise.all([
      supabase.from('projects').select('id,title,status,progress,end_date,budget,clients(company_name),profiles(full_name)').order('end_date', { ascending: true }),
      supabase.from('meetings').select('*').order('date', { ascending: true }).limit(50),
      supabase.from('profiles').select('id,full_name,email,role,status').order('full_name'),
      supabase.from('hr_attendance').select('id,employee_id,date,status,note,profiles(full_name)').eq('date', today),
      supabase.from('hr_leave_requests').select('id,employee_id,start_date,end_date,type,reason,status,created_at,profiles(full_name)').order('created_at', { ascending: false }).limit(30),
      supabase.from('internal_announcements').select('id,title,message,priority,created_at,profiles(full_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('admin_documents').select('id,title,category,file_url,description,created_at,profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('invoices').select('id,invoice_number,total_amount,paid_amount,status,due_date,created_at,clients(company_name)').in('status', ['impayee', 'partielle']).order('due_date', { ascending: true }).limit(20),
    ])
    setProjects((p.data ?? []) as unknown as Project[])
    setMeetings((m.data ?? []) as Meeting[])
    setEmployees((emp.data ?? []) as Employee[])
    setAttendance((att.data ?? []) as unknown as HRAttendance[])
    setLeaves((lv.data ?? []) as unknown as LeaveRequest[])
    setAnnouncements((ann.data ?? []) as unknown as Announcement[])
    setDocuments((doc.data ?? []) as unknown as Document[])
    setInvoices((inv.data ?? []) as unknown as Invoice[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const lateProjects    = projects.filter(p => !p.end_date || p.status === 'completed' ? false : new Date(p.end_date) < new Date())
  const urgentProjects  = projects.filter(p => { const d = daysUntil(p.end_date); return d !== null && d >= 0 && d <= 3 && p.status !== 'completed' })
  const overdueInvoices = invoices.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date()))
  const pendingLeaves   = leaves.filter(l => l.status === 'pending')
  const todayMeetings   = meetings.filter(m => m.date.startsWith(new Date().toISOString().slice(0, 10)))

  async function saveMeeting() {
    if (!meetingForm.title || !meetingForm.date) return toast.error('Titre et date requis')
    setSaving(true)
    const { error } = await supabase.from('meetings').insert({ ...meetingForm, duration_minutes: parseInt(meetingForm.duration_minutes) || 60, created_by: profile?.id })
    setSaving(false)
    if (error) return toast.error('Erreur: ' + error.message)
    toast.success('RDV ajouté')
    setShowMeetingModal(false)
    setMeetingForm({ title: '', description: '', type: 'rdv_client', date: '', duration_minutes: '60', location: '', status: 'scheduled' })
    load()
  }

  async function saveAnnouncement() {
    if (!announcementForm.title || !announcementForm.message) return toast.error('Titre et message requis')
    setSaving(true)
    const { error } = await supabase.from('internal_announcements').insert({ ...announcementForm, created_by: profile?.id })
    setSaving(false)
    if (error) return toast.error('Erreur: ' + error.message)
    toast.success('Annonce envoyée')
    setShowAnnouncementModal(false)
    setAnnouncementForm({ title: '', message: '', priority: 'normal' })
    load()
  }

  async function saveDocument() {
    if (!documentForm.title) return toast.error('Titre requis')
    setSaving(true)
    const { error } = await supabase.from('admin_documents').insert({ ...documentForm, uploaded_by: profile?.id })
    setSaving(false)
    if (error) return toast.error('Erreur: ' + error.message)
    toast.success('Document ajouté')
    setShowDocumentModal(false)
    setDocumentForm({ title: '', category: 'procedure', file_url: '', description: '' })
    load()
  }

  async function saveLeave() {
    if (leaveForm.employee_id === 'none' || !leaveForm.start_date || !leaveForm.end_date) return toast.error('Champs requis')
    setSaving(true)
    const { error } = await supabase.from('hr_leave_requests').insert({ ...leaveForm, employee_id: leaveForm.employee_id })
    setSaving(false)
    if (error) return toast.error('Erreur: ' + error.message)
    toast.success('Demande enregistrée')
    setShowLeaveModal(false)
    setLeaveForm({ employee_id: 'none', start_date: '', end_date: '', type: 'conge', reason: '', status: 'pending' })
    load()
  }

  async function saveAttendance() {
    if (attendanceForm.employee_id === 'none') return toast.error('Sélectionner un employé')
    setSaving(true)
    const { error } = await supabase.from('hr_attendance').upsert({ ...attendanceForm, employee_id: attendanceForm.employee_id }, { onConflict: 'employee_id,date' })
    setSaving(false)
    if (error) return toast.error('Erreur: ' + error.message)
    toast.success('Présence enregistrée')
    setShowAttendanceModal(false)
    load()
  }

  async function updateLeaveStatus(id: string, status: string) {
    const { error } = await supabase.from('hr_leave_requests').update({ status, reviewed_by: profile?.id }).eq('id', id)
    if (error) return toast.error('Erreur')
    toast.success(status === 'approved' ? 'Congé approuvé' : 'Congé refusé')
    load()
  }

  async function deleteMeeting(id: string) {
    await supabase.from('meetings').delete().eq('id', id)
    toast.success('RDV supprimé'); load()
  }

  async function deleteDocument(id: string) {
    await supabase.from('admin_documents').delete().eq('id', id)
    toast.success('Document supprimé'); load()
  }

  const filteredProjects = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.clients?.company_name?.toLowerCase().includes(search.toLowerCase())
    if (projectFilter === 'late')   return matchSearch && lateProjects.find(lp => lp.id === p.id)
    if (projectFilter === 'urgent') return matchSearch && urgentProjects.find(up => up.id === p.id)
    if (projectFilter === 'active') return matchSearch && p.status === 'active'
    return matchSearch
  })

  const hasAlerts = lateProjects.length > 0 || overdueInvoices.length > 0 || pendingLeaves.length > 0

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#0066FF]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0066FF] animate-spin" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement du radar…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060B18]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0066FF]/10 border border-[#0066FF]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                <span className="text-[11px] font-medium text-[#0066FF]">Live</span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Assistante de Direction
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Radar opérationnel — supervision & coordination
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] hover:border-[#0066FF]/40 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>

        {/* ── Alert Banner ── */}
        {hasAlerts && (
          <div className="flex flex-wrap items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/[0.04]">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-500">Alertes actives</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {lateProjects.length > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {lateProjects.length} projet(s) en retard
                </span>
              )}
              {lateProjects.length > 0 && overdueInvoices.length > 0 && <span className="text-slate-400">·</span>}
              {overdueInvoices.length > 0 && (
                <span className="text-xs text-orange-500 font-medium">
                  {overdueInvoices.length} facture(s) impayée(s)
                </span>
              )}
              {overdueInvoices.length > 0 && pendingLeaves.length > 0 && <span className="text-slate-400">·</span>}
              {pendingLeaves.length > 0 && (
                <span className="text-xs text-amber-500 font-medium">
                  {pendingLeaves.length} congé(s) en attente
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white shadow-lg shadow-[#0066FF]/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ─────────────────────────── TAB: Vue globale ─────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Projets en cours"  value={projects.filter(p => p.status === 'active').length}        icon={FolderKanban}  />
              <StatCard label="Projets en retard" value={lateProjects.length}     icon={AlertTriangle} accent="bg-red-500"     sub={lateProjects.length > 0 ? 'Action requise' : undefined} />
              <StatCard label="RDV aujourd'hui"   value={todayMeetings.length}    icon={Calendar}      accent="bg-[#00E5FF]"  />
              <StatCard label="Factures impayées" value={overdueInvoices.length}  icon={DollarSign}    accent="bg-orange-500" sub={overdueInvoices.length > 0 ? 'À relancer' : undefined} />
              <StatCard label="Employés actifs"   value={employees.filter(e => e.status === 'active').length}       icon={Users}         accent="bg-emerald-500" />
              <StatCard label="Congés en attente" value={pendingLeaves.length}    icon={Plane}         accent="bg-amber-500"  />
              <StatCard label="Projets urgents"   value={urgentProjects.length}   icon={Zap}           accent="bg-[#0066FF]"  sub={urgentProjects.length > 0 ? 'J-3 ou moins' : undefined} />
              <StatCard label="Annonces"          value={announcements.length}    icon={Megaphone}     accent="bg-violet-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Alertes & Blocages */}
              <div className="rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Alertes & Blocages</span>
                  </div>
                  {hasAlerts && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className="p-4 space-y-2">
                  {!hasAlerts ? (
                    <div className="flex items-center gap-3 py-4 text-sm text-slate-400 dark:text-slate-500">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Aucune alerte active
                    </div>
                  ) : (
                    <>
                      {lateProjects.slice(0, 3).map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                          <div className="w-1.5 h-8 rounded-full bg-red-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.title}</p>
                            <p className="text-xs text-red-500">{Math.abs(daysUntil(p.end_date) ?? 0)}j de retard</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      ))}
                      {overdueInvoices.slice(0, 2).map(i => (
                        <div key={i.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                          <div className="w-1.5 h-8 rounded-full bg-orange-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{i.clients?.company_name}</p>
                            <p className="text-xs text-orange-500">{formatGNF(i.total_amount - i.paid_amount)} impayé</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      ))}
                      {pendingLeaves.slice(0, 2).map(l => (
                        <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <div className="w-1.5 h-8 rounded-full bg-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.profiles?.full_name}</p>
                            <p className="text-xs text-amber-500">Congé du {formatDate(l.start_date)}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => updateLeaveStatus(l.id, 'approved')} className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 flex items-center justify-center transition-colors">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => updateLeaveStatus(l.id, 'rejected')} className="w-6 h-6 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Agenda du jour */}
              <div className="rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0066FF]" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Agenda du jour</span>
                    {todayMeetings.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-[#0066FF]/10 text-[#0066FF]">
                        {todayMeetings.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowMeetingModal(true)}
                    className="flex items-center gap-1 text-xs text-[#0066FF] hover:text-[#0052CC] font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {todayMeetings.length === 0 ? (
                    <div className="flex items-center gap-3 py-4 text-sm text-slate-400 dark:text-slate-500">
                      <Clock className="w-4 h-4" />
                      Aucun RDV programmé aujourd'hui
                    </div>
                  ) : (
                    todayMeetings.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                        <div className={cn('w-1 h-10 rounded-full shrink-0', MEETING_ACCENT[m.type] ?? 'bg-[#0066FF]')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{MEETING_TYPES[m.type] ?? m.type}
                            {m.location && <span> · {m.location}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{m.duration_minutes}min</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Dernières annonces */}
            <div className="rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-violet-500" />
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">Dernières annonces internes</span>
                </div>
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="flex items-center gap-1 text-xs text-[#0066FF] hover:text-[#0052CC] font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouvelle
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {announcements.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">Aucune annonce</p>
                ) : (
                  announcements.slice(0, 4).map(a => (
                    <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full mt-2 shrink-0',
                        a.priority === 'urgent' ? 'bg-red-500' :
                        a.priority === 'high'   ? 'bg-orange-500' : 'bg-slate-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</span>
                          {a.priority === 'urgent' && <Tag color="bg-red-500/10 text-red-500 border-red-500/20">Urgent</Tag>}
                          {a.priority === 'high'   && <Tag color="bg-orange-500/10 text-orange-500 border-orange-500/20">Important</Tag>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.message}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{formatDate(a.created_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────── TAB: Projets ────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un projet…"
                  className="pl-9 bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] rounded-xl"
                />
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                {[
                  { v: 'all',    l: 'Tous' },
                  { v: 'active', l: 'En cours' },
                  { v: 'late',   l: 'Retard' },
                  { v: 'urgent', l: 'Urgents' },
                ].map(f => (
                  <button
                    key={f.v}
                    onClick={() => setProjectFilter(f.v)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      projectFilter === f.v
                        ? 'bg-[#0066FF] text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredProjects.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <FolderKanban className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucun projet trouvé</p>
                </div>
              )}
              {filteredProjects.map(p => {
                const days    = daysUntil(p.end_date)
                const isLate  = days !== null && days < 0  && p.status !== 'completed'
                const isUrg   = days !== null && days >= 0 && days <= 3 && p.status !== 'completed'
                const st      = STATUS_PROJECT[p.status] ?? { label: p.status, color: 'bg-slate-100 text-slate-500 border-slate-200' }
                const prog    = p.progress ?? 0
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded-2xl bg-white dark:bg-[#0A0F1E] border p-5 transition-all',
                      isLate  ? 'border-red-500/30' :
                      isUrg   ? 'border-amber-500/30' :
                      'border-slate-200 dark:border-white/[0.06]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-slate-900 dark:text-white">{p.title}</span>
                          <Tag color={st.color}>{st.label}</Tag>
                          {isLate && <Tag color="bg-red-500/10 text-red-500 border-red-500/20">Retard {Math.abs(days!)}j</Tag>}
                          {isUrg  && <Tag color="bg-amber-500/10 text-amber-500 border-amber-500/20">J-{days}</Tag>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          {p.clients?.company_name && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />{p.clients.company_name}
                            </span>
                          )}
                          {p.end_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{formatDate(p.end_date)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{formatGNF(p.budget)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{prog}%</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">avancement</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isLate  ? 'bg-red-500' :
                          isUrg   ? 'bg-amber-500' :
                          prog === 100 ? 'bg-emerald-500' :
                          'bg-gradient-to-r from-[#0066FF] to-[#00E5FF]'
                        )}
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────── TAB: Agenda ─────────────────────────────── */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <SectionTitle
              title="Réunions & RDV"
              action={
                <button
                  onClick={() => setShowMeetingModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#0066FF] hover:bg-[#0052CC] text-white transition-colors shadow-lg shadow-[#0066FF]/20"
                >
                  <Plus className="w-4 h-4" /> Nouveau RDV
                </button>
              }
            />
            <div className="space-y-2">
              {meetings.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <Calendar className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucun RDV programmé</p>
                </div>
              )}
              {meetings.map(m => {
                const isPast = new Date(m.date) < new Date()
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06] transition-all',
                      isPast && 'opacity-50'
                    )}
                  >
                    <div className={cn('w-1 h-12 rounded-full shrink-0', MEETING_ACCENT[m.type] ?? 'bg-[#0066FF]')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{m.title}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{m.duration_minutes}min</span>
                        <span>·</span>
                        <Tag>{MEETING_TYPES[m.type] ?? m.type}</Tag>
                        {m.location && <span>📍 {m.location}</span>}
                      </div>
                      {m.description && <p className="text-xs text-slate-400 mt-1 truncate">{m.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteMeeting(m.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────── TAB: RH ─────────────────────────────────── */}
        {activeTab === 'hr' && (
          <div className="space-y-6">

            {/* Présences */}
            <div>
              <SectionTitle
                title={`Présences — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`}
                action={
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Pointer
                  </button>
                }
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {employees.filter(e => e.status === 'active').map(emp => {
                  const rec = attendance.find(a => a.employee_id === emp.id)
                  const statusMap: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
                    present:     { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Présent',     icon: UserCheck },
                    absent:      { color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',         label: 'Absent',      icon: UserX },
                    retard:      { color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/20',     label: 'En retard',   icon: Clock },
                    teletravail: { color: 'text-[#0066FF]',   bg: 'bg-[#0066FF]/10 border-[#0066FF]/20',     label: 'Télétravail', icon: Wifi },
                  }
                  const s = rec ? (statusMap[rec.status] ?? statusMap.present) : null
                  const StatusIcon = s?.icon ?? Activity
                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border',
                        s ? s.bg : 'bg-white dark:bg-[#0A0F1E] border-slate-200 dark:border-white/[0.06]'
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066FF]/20 to-[#00E5FF]/10 flex items-center justify-center text-xs font-bold text-[#0066FF] shrink-0">
                        {initials(emp.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{emp.full_name}</p>
                        {s ? (
                          <span className={cn('text-[11px] flex items-center gap-1 font-medium', s.color)}>
                            <StatusIcon className="w-3 h-3" />{s.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Non pointé</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Congés */}
            <div>
              <SectionTitle
                title="Demandes de congés & absences"
                action={
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="flex items-center gap-1 text-xs text-[#0066FF] hover:text-[#0052CC] font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                }
              />
              <div className="space-y-2">
                {leaves.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Aucune demande</p>
                )}
                {leaves.map(l => (
                  <div key={l.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066FF]/20 to-[#00E5FF]/10 flex items-center justify-center text-xs font-bold text-[#0066FF] shrink-0">
                      {initials(l.profiles?.full_name ?? 'NA')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.profiles?.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {LEAVE_TYPES[l.type]} · {formatDate(l.start_date)} → {formatDate(l.end_date)}
                      </p>
                      {l.reason && <p className="text-xs text-slate-400 truncate mt-0.5">{l.reason}</p>}
                    </div>
                    {l.status === 'pending' ? (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => updateLeaveStatus(l.id, 'approved')}
                          className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 flex items-center justify-center transition-all"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(l.id, 'rejected')}
                          className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Tag color={
                        l.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }>
                        {l.status === 'approved' ? 'Approuvé' : 'Refusé'}
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────── TAB: Documents ──────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-5">
            <SectionTitle
              title="Documents internes"
              action={
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#0066FF] hover:bg-[#0052CC] text-white transition-colors shadow-lg shadow-[#0066FF]/20"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              }
            />
            {documents.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-sm">Aucun document enregistré</p>
              </div>
            )}
            {Object.entries(DOC_CATEGORIES).map(([key, label]) => {
              const docs = documents.filter(d => d.category === key)
              if (docs.length === 0) return null
              return (
                <div key={key}>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">{label}</p>
                  <div className="space-y-2">
                    {docs.map(d => (
                      <div key={d.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/[0.06]">
                        <div className="w-9 h-9 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-[#0066FF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{d.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            {d.profiles?.full_name && <span>Par {d.profiles.full_name}</span>}
                            <span>·</span>
                            <span>{formatDate(d.created_at)}</span>
                          </div>
                          {d.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{d.description}</p>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {d.file_url && (
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-xl bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/20 flex items-center justify-center transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => deleteDocument(d.id)}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─────────────────────────── TAB: Communication ──────────────────────── */}
        {activeTab === 'communication' && (
          <div className="space-y-4">
            <SectionTitle
              title="Communication interne"
              action={
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#0066FF] hover:bg-[#0052CC] text-white transition-colors shadow-lg shadow-[#0066FF]/20"
                >
                  <Send className="w-4 h-4" /> Nouvelle annonce
                </button>
              }
            />
            <div className="space-y-3">
              {announcements.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <Megaphone className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucune annonce envoyée</p>
                </div>
              )}
              {announcements.map(a => (
                <div
                  key={a.id}
                  className={cn(
                    'p-5 rounded-2xl bg-white dark:bg-[#0A0F1E] border transition-all',
                    a.priority === 'urgent' ? 'border-red-500/30'    :
                    a.priority === 'high'   ? 'border-orange-500/25' :
                    'border-slate-200 dark:border-white/[0.06]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.priority === 'urgent' && <Tag color="bg-red-500/10 text-red-500 border-red-500/20">Urgent</Tag>}
                      {a.priority === 'high'   && <Tag color="bg-orange-500/10 text-orange-500 border-orange-500/20">Important</Tag>}
                      {a.priority === 'normal' && <Tag>Normal</Tag>}
                      <span className="font-semibold text-slate-900 dark:text-white">{a.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 mt-0.5">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
                  {a.profiles?.full_name && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                      <div className="w-5 h-5 rounded-full bg-[#0066FF]/20 flex items-center justify-center text-[10px] font-bold text-[#0066FF]">
                        {initials(a.profiles.full_name)}
                      </div>
                      <span className="text-xs text-slate-400">{a.profiles.full_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────── MODALS ──────────────────────────────────── */}

        {/* Modal RDV */}
        <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#0066FF]" />
                </div>
                Nouveau RDV / Réunion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-medium text-slate-500">Titre *</Label>
                <Input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Ex: Réunion projet Alpha..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-500">Type</Label>
                  <Select value={meetingForm.type} onValueChange={v => setMeetingForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MEETING_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Durée (min)</Label>
                  <Input type="number" value={meetingForm.duration_minutes} onChange={e => setMeetingForm(f => ({ ...f, duration_minutes: e.target.value }))} className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Date & Heure *</Label>
                <Input type="datetime-local" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Lieu</Label>
                <Input value={meetingForm.location} onChange={e => setMeetingForm(f => ({ ...f, location: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Bureau, Zoom, Teams…" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Description</Label>
                <Textarea value={meetingForm.description} onChange={e => setMeetingForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={3} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowMeetingModal(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={saveMeeting} disabled={saving} className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC]">
                  {saving ? 'Enregistrement…' : 'Ajouter le RDV'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Annonce */}
        <Dialog open={showAnnouncementModal} onOpenChange={setShowAnnouncementModal}>
          <DialogContent className="max-w-lg rounded-2xl flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-violet-500" />
                </div>
                Nouvelle Annonce Interne
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
              <div>
                <Label className="text-xs font-medium text-slate-500">Titre *</Label>
                <Input value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Priorité</Label>
                <div className="flex gap-2 mt-1.5">
                  {[{ v: 'normal', l: 'Normal' }, { v: 'high', l: 'Important' }, { v: 'urgent', l: 'Urgent' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setAnnouncementForm(f => ({ ...f, priority: opt.v }))}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                        announcementForm.priority === opt.v
                          ? opt.v === 'urgent' ? 'bg-red-500 text-white border-red-500'
                          : opt.v === 'high'   ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-[#0066FF] text-white border-[#0066FF]'
                          : 'bg-transparent text-slate-500 border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                      )}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Message *</Label>
                <Textarea
                  value={announcementForm.message}
                  onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))}
                  className="mt-1.5 rounded-xl resize-y min-h-[120px]"
                  rows={6}
                  placeholder="Rédigez votre annonce…"
                />
                <p className="text-xs text-slate-400 mt-1">{announcementForm.message.length} caractères</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Destinataires</Label>
                <p className="text-xs text-slate-400 mt-1">📢 Toute l'équipe — visible dans la cloche de notifications et sur chaque tableau de bord</p>
              </div>
            </div>
            {/* Boutons toujours visibles en bas */}
            <div className="flex-shrink-0 flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-white/[0.06] mt-2">
              <Button variant="outline" onClick={() => setShowAnnouncementModal(false)} className="rounded-xl">Annuler</Button>
              <Button onClick={saveAnnouncement} disabled={saving} className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC]">
                <Send className="w-4 h-4 mr-2" />
                {saving ? 'Envoi en cours…' : 'Envoyer à toute l\'équipe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Document */}
        <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#0066FF]" />
                </div>
                Ajouter un Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-medium text-slate-500">Titre *</Label>
                <Input value={documentForm.title} onChange={e => setDocumentForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Catégorie</Label>
                <Select value={documentForm.category} onValueChange={v => setDocumentForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DOC_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Lien fichier (Drive, Dropbox…)</Label>
                <Input value={documentForm.file_url} onChange={e => setDocumentForm(f => ({ ...f, file_url: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://…" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Description</Label>
                <Textarea value={documentForm.description} onChange={e => setDocumentForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowDocumentModal(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={saveDocument} disabled={saving} className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC]">
                  {saving ? 'Enregistrement…' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Congé */}
        <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-amber-500" />
                </div>
                Demande de Congé / Absence
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-medium text-slate-500">Employé *</Label>
                <Select value={leaveForm.employee_id} onValueChange={v => setLeaveForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sélectionner un employé</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-500">Du *</Label>
                  <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Au *</Label>
                  <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-500">Type</Label>
                  <Select value={leaveForm.type} onValueChange={v => setLeaveForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(LEAVE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Statut</Label>
                  <Select value={leaveForm.status} onValueChange={v => setLeaveForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="rejected">Refusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Motif</Label>
                <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} className="mt-1.5 rounded-xl resize-none" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowLeaveModal(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={saveLeave} disabled={saving} className="rounded-xl bg-[#0066FF] hover:bg-[#0052CC]">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Présence */}
        <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </div>
                Pointer une Présence
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-medium text-slate-500">Employé *</Label>
                <Select value={attendanceForm.employee_id} onValueChange={v => setAttendanceForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sélectionner un employé</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-500">Date</Label>
                  <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Statut</Label>
                  <Select value={attendanceForm.status} onValueChange={v => setAttendanceForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Présent</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="retard">En retard</SelectItem>
                      <SelectItem value="teletravail">Télétravail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">Note</Label>
                <Input value={attendanceForm.note} onChange={e => setAttendanceForm(f => ({ ...f, note: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Optionnel…" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowAttendanceModal(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={saveAttendance} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                  <UserCheck className="w-4 h-4 mr-2" />
                  {saving ? 'Enregistrement…' : 'Pointer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
