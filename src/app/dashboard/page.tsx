'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, FolderKanban, CheckCircle2, Clock,
  ArrowUpRight, Building2, Receipt, CalendarDays,
  Megaphone, Palette, Video, Target, Send, RefreshCw,
  Play, Clapperboard, GraduationCap, FileText, Code2,
  Users, Timer, TrendingDown, Award, MessageSquare,
  ImageIcon, Hash, Eye, ThumbsUp, Share2,
  DollarSign, UserCheck, PlusCircle, ChevronRight, Upload,
  Briefcase, Percent, Wallet, Activity, ShieldAlert, Rocket,
  Lightbulb, LineChart as LineChartIcon, Menu, X, Handshake, CheckSquare, Sparkles, Zap, Globe,
  Terminal, Film, Scale, Crown, Shield, Pen, BarChart2, BookOpen, Star,
  Coffee, Layers, Radio, Mic, Camera, Monitor, Scissors, Download,
  LayoutDashboard, TrendingUp as TUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

// ─── BRAND TOKENS ─────────────────────────────────────────────────────────────
const B = '#0066FF'   // Bleu néon — autorité tech
const C = '#00E5FF'   // Cyan IA — innovation
const INK = '#0A0F1E' // Texte principal
const MIST = '#F0F4FF' // Fond teinté
const BORDER = '#E2E8FF'

function formatGNF(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`
  return amount.toString()
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse p-6 space-y-6">
      <div className="h-24 rounded-2xl bg-[#F0F4FF]" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[#F0F4FF]" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 rounded-2xl bg-[#F0F4FF]" />
        <div className="h-64 rounded-2xl bg-[#F0F4FF]" />
      </div>
    </div>
  )
}

// ─── MONTHLY GOAL BAR ─────────────────────────────────────────────────────────
const GOAL_KEY = 'popytech_monthly_goal'

function MonthlyGoalBar({ revenue }: { revenue: number }) {
  const [goal, setGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(GOAL_KEY)
      return saved ? parseInt(saved) : 50000000
    }
    return 50000000
  })
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  const pct = goal > 0 ? Math.min(100, Math.round((revenue / goal) * 100)) : 0
  const color = pct >= 100 ? '#059669' : pct >= 70 ? '#0066FF' : pct >= 40 ? '#F59E0B' : '#EF4444'

  function saveGoal() {
    const v = parseInt(input.replace(/\s/g, ''))
    if (v > 0) { setGoal(v); localStorage.setItem(GOAL_KEY, String(v)) }
    setEditing(false)
  }

  return (
    <div className="mx-6 mb-5 bg-white rounded-2xl border border-[#E2E8FF] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <Target size={14} style={{ color: B }} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Objectif mensuel</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-[#F0F4FF] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
        </div>
        <span className="text-sm font-bold shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
        <span>{formatGNF(revenue)} / {formatGNF(goal)} GNF</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditing(false) }}
              placeholder="Ex: 50000000" className="border border-[#E2E8FF] rounded-lg px-2 py-1 text-xs w-32 outline-none focus:border-[#0066FF]" />
            <button onClick={saveGoal} className="text-[10px] font-semibold text-white px-2 py-1 rounded-lg" style={{ background: B }}>OK</button>
            <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400">✕</button>
          </div>
        ) : (
          <button onClick={() => { setInput(String(goal)); setEditing(true) }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#E2E8FF] hover:bg-[#F0F4FF] transition-colors">
            Modifier
          </button>
        )}
      </div>
    </div>
  )
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, badge, icon: Icon, actions }: {
  title: React.ReactNode, subtitle?: string, badge?: string, icon?: any, actions?: React.ReactNode
}) {
  return (
    <div className="bg-white border-b border-[#E2E8FF] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${B}, ${C})` }}>
            <Icon size={20} className="text-white" />
          </div>
        )}
        <div>
          {badge && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1"
              style={{ background: `${B}15`, color: B }}>
              {badge}
            </span>
          )}
          <h1 className="text-xl font-bold tracking-tight text-[#0A0F1E] leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent = B, trend, trendValue, index = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="bg-white rounded-2xl border border-[#E2E8FF] p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all duration-300 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] group-hover:opacity-[0.07] transition-opacity"
        style={{ background: accent, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}15` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        {trend && (
          <span className={cn("text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
            trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
            {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trendValue}
          </span>
        )}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#0A0F1E] leading-none tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5">{sub}</p>}
    </motion.div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionTitle({ children, accent = B }: { children: React.ReactNode, accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-5 w-0.5 rounded-full" style={{ background: `linear-gradient(to bottom, ${B}, ${C})` }} />
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#0A0F1E]">{children}</h2>
    </div>
  )
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onStatusUpdate, isAdmin }: { task: any, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const isLate = task.deadline && new Date(task.deadline) < new Date()
  const isReview = task.status === 'en_attente_validation'

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F0F4FF]/50 transition-all group">
      <div className={cn("h-2 w-2 rounded-full shrink-0", {
        'bg-red-500 animate-pulse': isLate || task.priority === 'haute',
        'bg-amber-400': task.priority === 'moyenne' && !isLate,
        'bg-slate-300': task.priority === 'basse' && !isLate,
      })} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#0A0F1E] truncate">{task.title}</p>
        {task.deadline && (
          <p className={cn("text-[10px] mt-0.5", isLate ? 'text-red-500 font-medium' : 'text-slate-400')}>
            {isLate ? 'Dépassé — ' : ''}{format(new Date(task.deadline), 'dd MMM yyyy', { locale: fr })}
          </p>
        )}
      </div>
      {onStatusUpdate && task.status !== 'termine' && (
        isReview ? (
          isAdmin ? (
            <button onClick={() => onStatusUpdate(task.id, 'termine')}
              className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shrink-0">
              Valider
            </button>
          ) : (
            <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0 flex items-center gap-1">
              <Clock size={10} className="animate-pulse" /> Review
            </span>
          )
        ) : (
          <button onClick={() => onStatusUpdate(task.id, 'en_attente_validation')}
            className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-all shrink-0">
            Soumettre
          </button>
        )
      )}
      <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
        task.status === 'termine' ? 'bg-emerald-50 text-emerald-600' :
        task.status === 'en_cours' ? 'bg-blue-50 text-blue-600' :
        task.status === 'en_attente_validation' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}>
        {task.status === 'a_faire' ? 'À faire' : task.status === 'en_cours' ? 'En cours' : task.status === 'en_attente_validation' ? 'Review' : 'Terminé'}
      </span>
    </div>
  )
}

// ─── TASK LIST CARD ───────────────────────────────────────────────────────────
function TaskListCard({ tasks, title, href, onStatusUpdate, isAdmin }: {
  tasks: any[], title: string, href: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E2E8FF] flex items-center justify-between bg-[#F8FAFF]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
        <Link href={href}>
          <span className="text-[10px] font-semibold text-[#0066FF] hover:underline">Voir tout →</span>
        </Link>
      </div>
      <div className="p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-slate-300">
            <CheckCircle2 size={24} className="mx-auto mb-2" />
            <p className="text-[10px] font-semibold uppercase">Aucune tâche</p>
          </div>
        ) : tasks.slice(0, 6).map(t => (
          <TaskRow key={t.id} task={t} onStatusUpdate={onStatusUpdate} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  )
}

// ─── VIEW SWITCHER ────────────────────────────────────────────────────────────
function ViewSwitcher({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleValueChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'unified') params.delete('view')
    else params.set('view', v)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={current} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px] h-9 text-[10px] font-semibold uppercase tracking-wider bg-white border-[#E2E8FF] rounded-xl shadow-sm">
        <SelectValue placeholder="Vue" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-[#E2E8FF] shadow-2xl">
        {[
          { value: 'unified', label: 'Vue Globale' },
          { value: 'strategy', label: 'Stratégie & ROI' },
          { value: 'cashflow', label: 'Trésorerie' },
          { value: 'commercial_digital', label: 'Commercial' },
          { value: 'marketeur', label: 'Marketeur' },
          { value: 'cm', label: 'Community Manager' },
          { value: 'creatrice_contenu', label: 'Créatrice Contenu' },
          { value: 'designer', label: 'Designer' },
          { value: 'designer_senior', label: 'Designer Senior' },
          { value: 'developpeur', label: 'Développeur' },
          { value: 'vidéaste', label: 'Vidéaste' },
          { value: 'monteur_video', label: 'Monteur Vidéo' },
          { value: 'formateur', label: 'Formateur' },
          { value: 'responsable_formations', label: 'Resp. Formations' },
          { value: 'chef_projet', label: 'Chef de Projet' },
          { value: 'assistante_direction', label: 'Assistante Direction' },
          { value: 'stagiaire', label: 'Stagiaire' },
        ].map(item => (
          <SelectItem key={item.value} value={item.value} className="text-[11px] font-medium py-2">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, user } = useAuth()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<string>('unified')

  const isAdminRole = profile?.role && ['super_admin', 'ceo', 'dirigeant', 'chef_projet'].includes(profile.role)

  useEffect(() => {
    if (viewParam) setActiveView(viewParam)
  }, [viewParam])

  const loadData = useCallback(async () => {
    if (!profile) return
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const userId = profile.id
      const role = profile.role
      const isAdmin = ['super_admin', 'ceo', 'dirigeant', 'chef_projet'].includes(role)

      let projectsQuery = supabase.from('projects').select('id, status, title, progress, created_at, created_by, clients(company_name)')
      let tasksQuery = supabase.from('tasks').select('id, title, status, deadline, priority, assigned_to, project_id, delivery_notes, delivered_at')
      let invoicesQuery = supabase.from('invoices').select('id, status, paid_amount, total_amount, created_at, invoice_number, clients(company_name), created_by')
      let paymentsQuery = supabase.from('payments').select('id, amount, payment_date, invoice_id')
      let quotesQuery = supabase.from('quotes').select('id, status, total_amount, created_at, title, created_by')
      let mkpiQuery = supabase.from('marketing_kpi').select('date, leads_generated, spend, user_id')
      let pubsQuery = supabase.from('publications').select('id, title, content, status, platform, created_at, scheduled_at, assigned_to')
      let leadsQuery = supabase.from('sales_leads').select('id, status, created_at, assigned_to')

      if (!isAdmin) {
        tasksQuery = tasksQuery.eq('assigned_to', userId)
        projectsQuery = (supabase.from('projects').select('id, status, title, progress, created_at, created_by, clients(company_name), tasks(assigned_to)').or(`created_by.eq.${userId},tasks.assigned_to.eq.${userId}`) as any)
        pubsQuery = pubsQuery.eq('assigned_to', userId)
        invoicesQuery = invoicesQuery.eq('created_by', userId)
        leadsQuery = leadsQuery.eq('assigned_to', userId)
        if (role === 'commercial_digital') quotesQuery = quotesQuery.eq('created_by', userId)
        else if (role === 'marketeur') mkpiQuery = mkpiQuery.eq('user_id', userId)
      }

      const needsFinance = isAdmin || role === 'client' || role === 'commercial_digital'
      const needsMarketing = isAdmin || role === 'marketeur' || role === 'cm'
      const needsAcademy = isAdmin || role === 'formateur' || role === 'responsable_formations'
      const needsHR = isAdmin || role === 'assistante_direction'

      const results = await Promise.allSettled([
        needsFinance ? invoicesQuery.order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
        isAdmin ? supabase.from('expenses').select('id, amount, expense_date, title, category').order('expense_date', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
        projectsQuery.order('created_at', { ascending: false }).limit(20),
        isAdmin ? supabase.from('subscriptions').select('monthly_price, status') : Promise.resolve({ data: [] }),
        (isAdmin || role === 'commercial_digital') ? leadsQuery.limit(50) : Promise.resolve({ data: [] }),
        (isAdmin || role === 'commercial_digital') ? quotesQuery.order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        needsMarketing ? mkpiQuery.order('date', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
        supabase.from('appointments').select('id, start_at, status, title').gte('start_at', new Date().toISOString()).limit(10),
        supabase.from('profiles').select('id, full_name, role, avatar_url').order('created_at', { ascending: false }).limit(50),
        tasksQuery.order('deadline', { ascending: true }).limit(100),
        supabase.from('internal_announcements').select('id, title, message, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(10),
        (needsMarketing || role === 'creatrice_contenu') ? pubsQuery.order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        isAdmin ? supabase.from('service_margins').select('margin_percent') : Promise.resolve({ data: [] }),
        needsAcademy ? supabase.from('trainings').select('id, title, price').limit(10) : Promise.resolve({ data: [] }),
        needsAcademy ? supabase.from('training_enrollments').select('id, status').limit(50) : Promise.resolve({ data: [] }),
        needsHR ? supabase.from('contracts').select('id, status, title').limit(10) : Promise.resolve({ data: [] }),
        needsHR ? supabase.from('hr_attendance').select('id, status, date').gte('date', today).limit(20) : Promise.resolve({ data: [] }),
        isAdmin ? supabase.from('projects').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        needsFinance ? paymentsQuery.order('payment_date', { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
      ])

      const [inv, exp, pro, sub, leads, quotes, mkpi, appts, team, tks, ann, pubs, margins, trn, enr, ctr, att, globalPro, pay] = results.map(r => r.status === 'fulfilled' ? (r.value as any) : { data: [], count: 0 })

      const invoices = inv.data || []
      const payments = pay.data || []
      const expenses = exp.data || []
      const projects = pro.data || []
      const subscriptions = sub.data || []
      const salesLeads = leads.data || []
      const allQuotes = quotes.data || []
      const marketingKpis = mkpi.data || []
      const tasks = tks.data || []
      const announcements = ann.data || []
      const publications = pubs.data || []
      const marginsData = margins.data || []
      const trainings = trn.data || []
      const enrollments = enr.data || []
      const contracts = ctr.data || []
      const attendance = att.data || []
      const totalErpProjects = globalPro.count || 0

      // ── Revenus : basés sur la table payments (payment_date) ──
      const now = new Date()
      const thisYear = now.getFullYear()
      const thisMonth = now.getMonth()
      const prevMonthDate = subMonths(now, 1)
      const prevMonthYear = prevMonthDate.getFullYear()
      const prevMonthNum = prevMonthDate.getMonth()

      const totalRevenueYear = payments
        .filter((p: any) => p.payment_date && new Date(p.payment_date).getFullYear() === thisYear)
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)
      const totalRevenueMonth = payments
        .filter((p: any) => { const d = new Date(p.payment_date); return d.getFullYear() === thisYear && d.getMonth() === thisMonth })
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)
      const lastMonthRevenue = payments
        .filter((p: any) => { const d = new Date(p.payment_date); return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthNum })
        .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)
      const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((totalRevenueMonth - lastMonthRevenue) / lastMonthRevenue) * 100) : 0

      const unpaidRevenue = invoices.filter((i: any) => !['payee', 'paid'].includes(i.status)).reduce((acc: number, i: any) => acc + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0)
      const mrr = subscriptions.filter((s: any) => ['actif', 'active'].includes(s.status)).reduce((acc: number, s: any) => acc + Number(s.monthly_price || 0), 0)
      const totalExpenses = expenses
        .filter((e: any) => e.expense_date && new Date(e.expense_date).getFullYear() === thisYear)
        .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0)
      const avgMargin = marginsData.length > 0 ? Math.round(marginsData.reduce((acc: number, m: any) => acc + Number(m.margin_percent || 0), 0) / marginsData.length) : 0
      const marketingSpendMonth = marketingKpis.reduce((acc: number, k: any) => acc + Number(k.spend || 0), 0)
      const leadsMonth = marketingKpis.reduce((acc: number, k: any) => acc + Number(k.leads_generated || 0), 0)
      const cac = leadsMonth > 0 ? Math.round(marketingSpendMonth / leadsMonth) : 0
      const roas = marketingSpendMonth > 0 ? (totalRevenueMonth / marketingSpendMonth).toFixed(1) : '0'
      const totalExpensesYear = expenses.filter((e: any) => e.expense_date && new Date(e.expense_date).getFullYear() === thisYear).reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0)
      const currentBalance = totalRevenueYear - totalExpensesYear
      const monthlyFixedCosts = (totalExpensesYear / Math.max(1, thisMonth + 1)) || 1000000
      const predictedMonthlyRevenue = mrr + allQuotes.filter((q: any) => ['envoye', 'sent', 'pending'].includes(q.status)).reduce((acc: number, q: any) => acc + Number(q.total_amount || 0), 0) * 0.1

      const cashFlowForecast = [
        { name: format(new Date(), 'MMM', { locale: fr }), balance: currentBalance },
        { name: format(subMonths(new Date(), -1), 'MMM', { locale: fr }), balance: currentBalance + predictedMonthlyRevenue - monthlyFixedCosts },
        { name: format(subMonths(new Date(), -2), 'MMM', { locale: fr }), balance: currentBalance + (predictedMonthlyRevenue - monthlyFixedCosts) * 2 },
        { name: format(subMonths(new Date(), -3), 'MMM', { locale: fr }), balance: currentBalance + (predictedMonthlyRevenue - monthlyFixedCosts) * 3 },
      ]

      const pipeline = {
        totalLeads: salesLeads.length,
        appointments: appts.data?.length || 0,
        pendingProposals: allQuotes.filter((q: any) => ['envoye', 'sent', 'pending', 'draft'].includes(q.status)).length,
        dealsSigned: allQuotes.filter((q: any) => ['accepte', 'accepted', 'validated'].includes(q.status)).length,
        forecastValue: allQuotes.filter((q: any) => ['envoye', 'sent', 'pending'].includes(q.status)).reduce((acc: number, q: any) => acc + Number(q.total_amount || 0), 0) * 0.35,
        conversionRate: salesLeads.length > 0 ? Math.round((allQuotes.filter((q: any) => ['accepte', 'accepted'].includes(q.status)).length / salesLeads.length) * 100) : 0,
      }

      const activeProjects = projects.filter((p: any) => ['en_cours', 'active', 'en_validation', 'en_attente'].includes(p.status))
      const lateTasks = tasks.filter((t: any) => !['termine', 'completed'].includes(t.status) && t.deadline && new Date(t.deadline) < new Date())
      const deliveryRate = projects.length > 0 ? Math.round((projects.filter((p: any) => ['termine', 'completed', 'livre'].includes(p.status)).length / projects.length) * 100) : 0

      // Graphique revenus vs dépenses : 6 derniers mois réels
      const chartProduction = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        const y = d.getFullYear(), m = d.getMonth()
        const rev = payments
          .filter((p: any) => { const pd = new Date(p.payment_date); return pd.getFullYear() === y && pd.getMonth() === m })
          .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
        const exp = expenses
          .filter((e: any) => { const ed = new Date(e.expense_date); return ed.getFullYear() === y && ed.getMonth() === m })
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
        return {
          name: format(d, 'MMM', { locale: fr }),
          CA: Math.round(rev / 1000),
          Charges: Math.round(exp / 1000),
          Bénéfice: Math.round((rev - exp) / 1000),
        }
      })

      setData({
        financial: { totalRevenueYear, totalRevenueMonth, unpaidRevenue, mrr, totalExpenses, marginGlobal: avgMargin, growth: revenueGrowth, cac, roas, cashFlowForecast },
        pipeline,
        production: { activeCount: activeProjects.length, lateCount: lateTasks.length, deliveryRate, capacity: Math.min(100, Math.round(activeProjects.length * 15 / (team.data?.length || 10))) },
        chartProduction, team: team.data || [], tasks, lateTasks, projects, totalErpProjects,
        recentInvoices: invoices.slice(0, 10), recentExpenses: expenses.slice(0, 10), recentQuotes: allQuotes.slice(0, 10),
        upcomingAppts: appts.data || [], recentAnnouncements: announcements, recentPublications: publications,
        marketingKpis, academy: { trainings, enrollments: enrollments.length }, hrLegal: { contracts, attendance: attendance.length },
      })
    } catch (err) {
      console.error('Dashboard Error:', err)
      setData({ financial: { totalRevenueYear: 0, totalRevenueMonth: 0, unpaidRevenue: 0, mrr: 0, totalExpenses: 0, marginGlobal: 0, growth: 0, cac: 0, roas: '0', cashFlowForecast: [] }, pipeline: { totalLeads: 0, appointments: 0, pendingProposals: 0, dealsSigned: 0, forecastValue: 0, conversionRate: 0 }, production: { activeCount: 0, lateCount: 0, deliveryRate: 0, capacity: 0 }, chartProduction: [], team: [], tasks: [], lateTasks: [], projects: [], totalErpProjects: 0, recentInvoices: [], recentExpenses: [], recentQuotes: [], upcomingAppts: [], recentAnnouncements: [], recentPublications: [], marketingKpis: [], academy: { trainings: [], enrollments: 0 }, hrLegal: { contracts: [], attendance: 0 } })
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    if (profile?.id) {
      if (!data) setLoading(true)
      loadData()
      const interval = setInterval(loadData, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [profile?.id, loadData])

  useEffect(() => {
    if (profile?.role) {
      const role = profile.role
      const isAdmin = ['super_admin', 'ceo', 'dirigeant', 'chef_projet'].includes(role)
      if (!isAdmin) {
        if ((role as string) === 'copywriter') setActiveView('creatrice_contenu')
        else if ((role as string) === 'production') setActiveView('vidéaste')
        else if ((role as string) === 'academy') setActiveView('responsable_formations')
        else if ((role as string) === 'assistante') setActiveView('assistante_direction')
        else setActiveView(role)
      } else if (viewParam) {
        setActiveView(viewParam)
      }
    }
  }, [profile?.role, viewParam])

  if (loading || !data || !profile) return <Skeleton />

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      if (error) throw error
      toast.success(`Tâche mise à jour`)
      loadData()
    } catch (err: any) { toast.error(err.message) }
  }

  const renderMetierView = () => {
    const userId = profile.id
    const role = profile.role || 'client'
    const isAdmin = ['super_admin', 'ceo', 'dirigeant', 'chef_projet'].includes(role)
    const v = isAdmin ? activeView : role

    switch (v) {
      case 'strategy': return <StrategyView data={data} />
      case 'cashflow': return <CashFlowView data={data} />
      case 'commercial_digital': return <CommercialView data={data} userId={isAdmin ? undefined : userId} />
      case 'marketeur': case 'marketing': return <MarketeurView kpis={data.marketingKpis} userId={isAdmin ? undefined : userId} />
      case 'cm': case 'community_manager': return <CMView publications={data.recentPublications} userId={isAdmin ? undefined : userId} />
      case 'creatrice_contenu': case 'copywriter': return <CopywriterView data={data} userId={isAdmin ? undefined : userId} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'designer': case 'designer_senior': return <DesignerView tasks={data.tasks} userId={isAdmin ? undefined : userId} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'developpeur': return <DevView tasks={data.tasks} userId={isAdmin ? undefined : userId} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'vidéaste': case 'videaste': case 'monteur_video': case 'production': return <VideoView projects={data.projects} tasks={data.tasks} userId={isAdmin ? undefined : userId} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'formateur': return <AcademyView academy={data.academy} role="formateur" />
      case 'responsable_formations': case 'academy': return <AcademyView academy={data.academy} role="responsable" />
      case 'stagiaire': return <StagiaireView tasks={data.tasks} userId={isAdmin ? undefined : userId} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'chef_projet': return <ChefProjetView data={data} onStatusUpdate={updateTaskStatus} isAdmin={isAdmin} />
      case 'assistante_direction': case 'assistante': return <AssistanteView data={data} userId={isAdmin ? undefined : userId} />
      case 'client': return <ClientView data={data} onStatusUpdate={updateTaskStatus} />
      default: return null
    }
  }

  const metierContent = renderMetierView()
  const isAdmin = isAdminRole

  if (metierContent) {
    return (
      <div className="min-h-screen bg-[#F8FAFF]">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E2E8FF] px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {isAdmin ? `Vue : ${activeView.replace('_', ' ')}` : `Espace ${profile?.role?.replace('_', ' ')}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <ViewSwitcher current={activeView} />}
            <button onClick={loadData} className="h-8 w-8 rounded-lg border border-[#E2E8FF] flex items-center justify-center hover:bg-[#F0F4FF] transition-colors">
              <RefreshCw size={13} className="text-slate-400" />
            </button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {metierContent}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[#E2E8FF] p-10 text-center max-w-sm">
          <ShieldAlert size={32} className="mx-auto mb-4 text-red-400" />
          <h2 className="font-bold text-[#0A0F1E] mb-2">Accès non configuré</h2>
          <p className="text-xs text-slate-400">Rôle : {profile?.role}</p>
        </div>
      </div>
    )
  }

  // ─── CEO / ADMIN GLOBAL VIEW ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* HERO HEADER */}
      <div className="bg-white border-b border-[#E2E8FF]">
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl overflow-hidden border border-[#E2E8FF] shrink-0 bg-white flex items-center justify-center shadow-sm">
              <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/25eb9797-83ec-431b-8731-1404e452f4c6/popy-tech-pro-2026-resized-1772085194508.webp?width=120&height=120&resize=contain" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: `linear-gradient(90deg, ${B}, ${C})` }}>ERP · Live</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A0F1E] leading-none">
                Popytech <span style={{ color: B }}>Command Center</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Tableau de bord global — {format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher current={activeView} />
            <button onClick={loadData} className="h-9 w-9 rounded-xl border border-[#E2E8FF] flex items-center justify-center hover:bg-[#F0F4FF] transition-colors">
              <RefreshCw size={14} className="text-slate-400" />
            </button>
            <Link href="/dashboard/projects/new">
              <button className="h-9 px-4 rounded-xl text-white text-[11px] font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${B}, ${C})` }}>
                <PlusCircle size={14} /> Nouveau projet
              </button>
            </Link>
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard index={0} label="CA Mois" value={`${formatGNF(data.financial.totalRevenueMonth)} GNF`} icon={DollarSign} accent={B} trend="up" trendValue={`+${data.financial.growth}%`} sub="vs mois précédent" />
          <KpiCard index={1} label="CA Annuel" value={`${formatGNF(data.financial.totalRevenueYear)} GNF`} icon={TrendingUp} accent="#0055DD" sub="Cumul 2026" />
          <KpiCard index={2} label="MRR" value={`${formatGNF(data.financial.mrr)} GNF`} icon={RefreshCw} accent={C} sub="Revenus récurrents" />
          <KpiCard index={3} label="Impayés" value={`${formatGNF(data.financial.unpaidRevenue)} GNF`} icon={ShieldAlert} accent="#EF4444" sub="À recouvrer" />
          <KpiCard index={4} label="Marge nette" value={`${data.financial.marginGlobal}%`} icon={Percent} accent="#7C3AED" sub="Objectif 75%" />
          <KpiCard index={5} label="Trésorerie" value={`${formatGNF(data.financial.totalRevenueYear - data.financial.totalExpenses)} GNF`} icon={Wallet} accent="#059669" sub="Solde disponible" />
        </div>

        {/* OBJECTIF CA MENSUEL */}
        <MonthlyGoalBar revenue={data.financial.totalRevenueMonth} />
      </div>

      <div className="p-6 space-y-6">

        {/* ROW 1 : Graphiques + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Trésorerie prévisionnelle */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <SectionTitle>Trésorerie prévisionnelle (3 mois)</SectionTitle>
              <span className="text-[10px] text-slate-400 font-medium">MRR + Pipeline pondéré</span>
            </div>
            <div className="p-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.financial.cashFlowForecast}>
                  <defs>
                    <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={B} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={B} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FF" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${BORDER}`, boxShadow: '0 4px 20px rgba(0,102,255,0.08)', fontSize: 11 }} formatter={(v: number) => [`${formatGNF(v)} GNF`, 'Solde']} />
                  <Area type="monotone" dataKey="balance" stroke={B} strokeWidth={2.5} fill="url(#gBlue)" dot={{ r: 4, fill: B, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline commercial */}
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]">
              <SectionTitle>Pipeline Commercial</SectionTitle>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Leads', value: data.pipeline.totalLeads, color: C },
                { label: 'Propositions', value: data.pipeline.pendingProposals, color: B },
                { label: 'Deals signés', value: data.pipeline.dealsSigned, color: '#059669' },
                { label: 'Taux conversion', value: `${data.pipeline.conversionRate}%`, color: '#7C3AED' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFF] border border-[#E2E8FF]">
                  <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#E2E8FF]">
                <p className="text-[10px] text-slate-400 mb-1.5">Forecast pondéré</p>
                <p className="text-xl font-bold" style={{ color: B }}>{formatGNF(data.pipeline.forecastValue)} GNF</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2 : Projets actifs + Tâches critiques + Équipe */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Projets */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <SectionTitle>Projets actifs ({data.production.activeCount})</SectionTitle>
              <Link href="/dashboard/projects">
                <span className="text-[10px] font-semibold text-[#0066FF] hover:underline">Voir tout →</span>
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {data.projects.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] transition-all group">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${B}10` }}>
                    <Briefcase size={14} style={{ color: B }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0F1E] truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.clients?.company_name || 'Interne'}</p>
                  </div>
                  <div className="w-24 space-y-1 shrink-0">
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                      <span>Avancement</span><span>{p.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F4FF] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, ${B}, ${C})` }} />
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                    p.status === 'en_cours' ? 'bg-blue-50 text-blue-600' :
                    p.status === 'termine' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                    {p.status}
                  </span>
                </div>
              ))}
              {data.projects.length === 0 && (
                <div className="py-10 text-center text-slate-300 text-[11px] font-medium">Aucun projet actif</div>
              )}
            </div>
          </div>

          {/* Équipe */}
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <SectionTitle>Équipe</SectionTitle>
              <Link href="/dashboard/team">
                <span className="text-[10px] font-semibold text-[#0066FF] hover:underline">Gérer →</span>
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {data.team.slice(0, 6).map((m: any, i: number) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFF] transition-colors">
                  <Avatar className="h-8 w-8 border border-[#E2E8FF] shrink-0">
                    <AvatarImage src={m.avatar_url} />
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${B}, ${C})` }}>
                      {m.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0F1E] truncate">{m.full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.role?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3 : Tâches critiques + Annonces */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TaskListCard tasks={data.lateTasks} title={`Tâches en retard (${data.lateTasks.length})`} href="/dashboard/tasks" onStatusUpdate={updateTaskStatus} isAdmin={true} />

          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]">
              <SectionTitle>Annonces internes</SectionTitle>
            </div>
            <div className="p-4 space-y-3">
              {data.recentAnnouncements.slice(0, 4).map((ann: any, i: number) => (
                <div key={ann.id} className={cn("p-3.5 rounded-xl border", i === 0 ? 'border-[#0066FF]/20 bg-[#F0F4FF]' : 'border-[#E2E8FF]')}>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? B : '#F0F4FF' }}>
                      <Megaphone size={12} className={i === 0 ? 'text-white' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0A0F1E] truncate">{ann.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{ann.message}</p>
                      <p className="text-[9px] text-slate-300 mt-1">{format(new Date(ann.created_at), 'dd MMM', { locale: fr })} · {ann.profiles?.full_name || 'Admin'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.recentAnnouncements.length === 0 && (
                <div className="py-8 text-center text-slate-300 text-[11px]">Aucune annonce récente</div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4 : Flux financier */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Factures */}
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Factures récentes</span>
              <Link href="/dashboard/invoices"><span className="text-[10px] font-semibold text-[#0066FF]">Voir tout →</span></Link>
            </div>
            <div className="p-4 space-y-2">
              {data.recentInvoices.slice(0, 4).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#0A0F1E]">{inv.invoice_number}</p>
                    <p className="text-[9px] text-slate-400 truncate max-w-[120px]">{inv.clients?.company_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: B }}>{formatGNF(inv.total_amount)} GNF</p>
                    <span className={cn("text-[8px] font-bold uppercase", inv.status === 'payee' ? 'text-emerald-500' : 'text-amber-500')}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dépenses */}
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dépenses</span>
              <Link href="/dashboard/expenses"><span className="text-[10px] font-semibold text-[#0066FF]">Voir tout →</span></Link>
            </div>
            <div className="p-4 space-y-2">
              {data.recentExpenses.slice(0, 4).map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#0A0F1E] truncate max-w-[140px]">{exp.title}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{exp.category}</p>
                  </div>
                  <p className="text-xs font-bold text-red-500">-{formatGNF(exp.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Devis */}
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Devis actifs</span>
              <Link href="/dashboard/quotes"><span className="text-[10px] font-semibold text-[#0066FF]">Voir tout →</span></Link>
            </div>
            <div className="p-4 space-y-2">
              {data.recentQuotes.slice(0, 4).map((q: any) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#0A0F1E] truncate max-w-[130px]">{q.title}</p>
                    <span className="text-[8px] font-bold uppercase text-slate-400">{q.status}</span>
                  </div>
                  <p className="text-xs font-bold" style={{ color: C }}>{formatGNF(q.total_amount)} GNF</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÉTIER VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── STRATEGY VIEW ────────────────────────────────────────────────────────────
function StrategyView({ data }: { data: any }) {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Stratégie & <span style={{ color: B }}>ROI</span></>} subtitle="Analyse performance globale" badge="Direction" icon={TrendingUp}
        actions={<span className="text-[10px] font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: B }}>Score : 92 / 100</span>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="CAC Global" value={`${formatGNF(data.financial.cac)} GNF`} icon={Target} accent={B} sub="Cible < 50k" />
          <KpiCard index={1} label="LTV Moyen" value="12.5M GNF" icon={TrendingUp} accent="#059669" sub="Lifetime value" />
          <KpiCard index={2} label="ROAS" value={`${data.financial.roas}x`} icon={Activity} accent={C} sub="Ads performance" />
          <KpiCard index={3} label="Équité Marque" value="Forte" icon={Award} accent="#7C3AED" sub="Perception marché" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>ROI par Acquisition</SectionTitle></div>
            <div className="p-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Leads', v: data.pipeline.totalLeads },
                  { name: 'Meetings', v: data.pipeline.appointments },
                  { name: 'Offres', v: data.pipeline.pendingProposals },
                  { name: 'Deals', v: data.pipeline.dealsSigned },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FF" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${BORDER}`, fontSize: 11 }} />
                  <Bar dataKey="v" radius={[8, 8, 0, 0]} barSize={48} fill={B} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Checklist Stratégique</SectionTitle></div>
            <div className="p-4 space-y-2">
              {[{ t: 'Mettre à jour les OKRs Q1', done: true }, { t: 'Réviser les créatifs Ads', done: false }, { t: 'Audit marque 2026', done: false }, { t: 'Refactoring pricing', done: false }].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                  <div className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center", c.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200')}>
                    {c.done && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <span className={cn("text-xs font-medium", c.done ? 'line-through text-slate-300' : 'text-[#0A0F1E]')}>{c.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CASH FLOW VIEW ────────────────────────────────────────────────────────────
function CashFlowView({ data }: { data: any }) {
  const months = [0, 1, 2, 3].map(i => format(subMonths(new Date(), -i), 'yyyy-MM'))
  const cashData = months.map(m => {
    const income = data.financial.totalRevenueMonth
    const charges = data.financial.totalExpenses / 12 || 1000000
    const isFuture = m > new Date().toISOString().slice(0, 7)
    const projIn = isFuture ? (data.financial.mrr + data.pipeline.forecastValue / 3) : income
    return { name: format(new Date(m + '-01'), 'MMM yy', { locale: fr }), encaissé: projIn, charges, solde: projIn - charges }
  })

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Trésorerie <span style={{ color: B }}>Prévisionnelle</span></>} subtitle="Anticipation 3 mois" badge="Finance" icon={Wallet} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Solde Actuel" value={`${formatGNF(data.financial.totalRevenueYear - data.financial.totalExpenses)} GNF`} icon={Wallet} accent={B} />
          <KpiCard index={1} label="Projeté M+3" value={`${formatGNF(cashData[3]?.solde || 0)} GNF`} icon={TrendingUp} accent="#059669" />
          <KpiCard index={2} label="Charges Fixes/Mois" value={`${formatGNF(data.financial.totalExpenses / 12)} GNF`} icon={TrendingDown} accent="#EF4444" />
          <KpiCard index={3} label="MRR" value={`${formatGNF(data.financial.mrr)} GNF`} icon={RefreshCw} accent={C} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Encaissé vs Charges Fixes</SectionTitle></div>
          <div className="p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashData}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FF" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${BORDER}`, fontSize: 11 }} />
                <Area type="monotone" dataKey="encaissé" stroke="#059669" strokeWidth={2.5} fill="url(#gIn)" name="CA Encaissé" />
                <Area type="monotone" dataKey="charges" stroke="#EF4444" strokeWidth={2} fill="url(#gOut)" name="Charges" />
                <Line type="monotone" dataKey="solde" stroke={B} strokeWidth={2} dot={{ r: 4, fill: B }} name="Solde Net" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── COMMERCIAL VIEW ──────────────────────────────────────────────────────────
function CommercialView({ data, userId }: { data: any, userId?: string }) {
  const { pipeline, recentQuotes } = data
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Pipeline <span style={{ color: B }}>Commercial</span></>} subtitle="Gestion des opportunités et propositions" badge="Commercial Digital" icon={Handshake}
        actions={
          <Link href="/dashboard/commercial">
            <button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Espace complet →</button>
          </Link>
        } />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Leads actifs" value={pipeline.totalLeads} icon={Users} accent={B} />
          <KpiCard index={1} label="Deals signés" value={pipeline.dealsSigned} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={2} label="En négociation" value={pipeline.pendingProposals} icon={MessageSquare} accent={C} />
          <KpiCard index={3} label="Taux conversion" value={`${pipeline.conversionRate}%`} icon={Percent} accent="#7C3AED" />
        </div>

        {/* Forecast */}
        <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Forecast pondéré (35% close rate)</p>
            <p className="text-3xl font-bold" style={{ color: B }}>{formatGNF(pipeline.forecastValue)} GNF</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-[#0A0F1E]">{pipeline.appointments}</p>
              <p className="text-[10px] text-slate-400">RDV prévus</p>
            </div>
            <div className="h-10 w-px bg-[#E2E8FF]" />
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: '#059669' }}>{pipeline.dealsSigned}</p>
              <p className="text-[10px] text-slate-400">Deals gagnés</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Propositions actives</SectionTitle></div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentQuotes.map((q: any) => (
              <div key={q.id} className="p-4 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${B}10` }}>
                    <Building2 size={14} style={{ color: B }} />
                  </div>
                  <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                    q.status === 'accepte' ? 'bg-emerald-50 text-emerald-600' :
                    q.status === 'envoye' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                    {q.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#0A0F1E] mb-1 truncate">{q.title}</p>
                <p className="text-base font-bold" style={{ color: B }}>{formatGNF(q.total_amount)} GNF</p>
                <Link href={`/dashboard/quotes/${q.id}`}>
                  <button className="mt-3 w-full h-7 rounded-lg text-[10px] font-semibold border border-[#E2E8FF] hover:border-[#0066FF]/40 hover:text-[#0066FF] transition-colors">Suivre →</button>
                </Link>
              </div>
            ))}
            {recentQuotes.length === 0 && <div className="col-span-full py-12 text-center text-slate-300 text-[11px]">Aucune proposition active</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MARKETEUR VIEW ────────────────────────────────────────────────────────────
function MarketeurView({ kpis, userId }: { kpis: any[], userId?: string }) {
  const chartData = useMemo(() => [...kpis].reverse(), [kpis])
  const totalLeads = kpis.reduce((a, k) => a + Number(k.leads_generated || 0), 0)
  const totalSpend = kpis.reduce((a, k) => a + Number(k.spend || 0), 0)
  const avgCac = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Marketing <span style={{ color: B }}>Ops</span></>} subtitle="Performance des campagnes et acquisition" badge="Marketeur" icon={BarChart2}
        actions={<Link href="/dashboard/marketing"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Dashboard complet →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Leads générés" value={totalLeads} icon={TrendingUp} accent={B} />
          <KpiCard index={1} label="Budget dépensé" value={`${formatGNF(totalSpend)} GNF`} icon={DollarSign} accent="#EF4444" />
          <KpiCard index={2} label="CAC Moyen" value={`${formatGNF(avgCac)} GNF`} icon={Target} accent={C} sub="Cible < 50k" />
          <KpiCard index={3} label="Entrées" value={kpis.length} icon={Activity} accent="#7C3AED" sub="Sessions KPI" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Vélocité Lead Generation</SectionTitle></div>
            <div className="p-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={B} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={B} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FF" />
                  <XAxis dataKey="date" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${BORDER}`, fontSize: 11 }} />
                  <Area type="monotone" dataKey="leads_generated" stroke={B} strokeWidth={2.5} fill="url(#gLead)" name="Leads" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Métriques récentes</SectionTitle></div>
            <div className="p-4 space-y-2">
              {chartData.slice(-5).map((k: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400">{k.date ? format(new Date(k.date), 'dd MMM') : '—'}</p>
                    <p className="text-xs font-bold text-[#0A0F1E]">{k.leads_generated || 0} leads</p>
                  </div>
                  <p className="text-xs font-bold" style={{ color: B }}>{formatGNF(k.spend || 0)} GNF</p>
                </div>
              ))}
              {chartData.length === 0 && <div className="py-8 text-center text-slate-300 text-[11px]">Aucune métrique</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CM VIEW ──────────────────────────────────────────────────────────────────
function CMView({ publications, userId }: { publications: any[], userId?: string }) {
  const myPubs = userId ? publications.filter(p => p.assigned_to === userId) : publications
  const platforms = [...new Set(myPubs.map(p => p.platform).filter(Boolean))]

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Community <span style={{ color: B }}>Manager</span></>} subtitle="Gestion des publications multi-plateforme" badge="Social Media" icon={Globe}
        actions={<Link href="/dashboard/community"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Espace CM →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Publications" value={myPubs.length} icon={ImageIcon} accent={B} />
          <KpiCard index={1} label="Publiées" value={myPubs.filter(p => p.status === 'publie').length} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={2} label="Programmées" value={myPubs.filter(p => p.status === 'programme').length} icon={Clock} accent={C} />
          <KpiCard index={3} label="Plateformes" value={platforms.length} icon={Share2} accent="#7C3AED" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myPubs.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
              <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden hover:border-[#0066FF]/30 hover:shadow-sm transition-all h-full flex flex-col">
                <div className="px-4 py-3 border-b border-[#E2E8FF] flex items-center justify-between" style={{ background: `${B}08` }}>
                  <div className="flex items-center gap-2">
                    <Globe size={13} style={{ color: B }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: B }}>{p.platform || 'Social'}</span>
                  </div>
                  <span className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                    p.status === 'publie' ? 'bg-emerald-50 text-emerald-600' :
                    p.status === 'programme' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                    {p.status}
                  </span>
                </div>
                <div className="p-4 flex-1">
                  <p className="text-xs font-semibold text-[#0A0F1E] mb-2 truncate">{p.title || 'Post sans titre'}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{p.content}</p>
                </div>
                <div className="px-4 py-2.5 border-t border-[#E2E8FF] flex items-center justify-between bg-[#F8FAFF]">
                  <span className="text-[9px] text-slate-400 flex items-center gap-1"><CalendarDays size={9} /> {p.scheduled_at ? format(new Date(p.scheduled_at), 'dd/MM') : 'TBD'}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {myPubs.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8FF] rounded-2xl">
              <Globe size={28} className="mx-auto mb-3 text-slate-200" />
              <p className="text-[11px] text-slate-300 font-medium">Aucune publication assignée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── COPYWRITER VIEW ───────────────────────────────────────────────────────────
function CopywriterView({ data, userId, onStatusUpdate, isAdmin }: { data: any, userId?: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const tasks = userId ? data.tasks.filter((t: any) => t.assigned_to === userId) : data.tasks.filter((t: any) => ['copy', 'content', 'blog', 'article', 'script', 'rédaction', 'contenu'].some(k => (t.title || '').toLowerCase().includes(k)))
  const [saving, setSaving] = useState<string | null>(null)

  const handleUpdate = async (id: string, status: string) => {
    if (!onStatusUpdate) return
    setSaving(id)
    try { await onStatusUpdate(id, status) } finally { setSaving(null) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Créatrice de <span style={{ color: B }}>Contenu</span></>} subtitle="Pipeline de production éditoriale" badge="Contenu" icon={Pen}
        actions={<Link href="/dashboard/creator"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Espace Créatrice →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Tâches actives" value={tasks.length} icon={FileText} accent={B} />
          <KpiCard index={1} label="En review" value={tasks.filter((t: any) => t.status === 'en_attente_validation').length} icon={Clock} accent={C} />
          <KpiCard index={2} label="Terminées" value={tasks.filter((t: any) => t.status === 'termine').length} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={3} label="En cours" value={tasks.filter((t: any) => t.status === 'en_cours').length} icon={Activity} accent="#7C3AED" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Pipeline de contenus</SectionTitle></div>
            <div className="p-4 space-y-2">
              {tasks.length > 0 ? tasks.map((t: any, i: number) => (
                <div key={t.id || i} className="p-4 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] transition-all">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold text-[#0A0F1E] truncate flex-1">{t.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.status !== 'termine' && (
                        t.status === 'en_attente_validation' ? (
                          isAdmin ? (
                            <button onClick={() => handleUpdate(t.id, 'termine')} disabled={saving === t.id}
                              className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg bg-emerald-500 text-white">
                              {saving === t.id ? '...' : 'Valider'}
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                              <Clock size={10} className="animate-pulse" /> Review
                            </span>
                          )
                        ) : (
                          <button onClick={() => handleUpdate(t.id, 'en_attente_validation')} disabled={saving === t.id}
                            className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg border border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-all">
                            {saving === t.id ? '...' : 'Prêt'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F0F4FF] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${t.status === 'termine' ? 100 : t.status === 'en_attente_validation' ? 80 : t.status === 'en_cours' ? 45 : 10}%`,
                      background: `linear-gradient(90deg, ${B}, ${C})`
                    }} />
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center border-2 border-dashed border-[#E2E8FF] rounded-xl">
                  <FileText size={24} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-[11px] text-slate-300">Aucune tâche assignée</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5 space-y-4">
            <SectionTitle>Statistiques</SectionTitle>
            {[
              { label: 'Total tâches', value: tasks.length, color: B },
              { label: 'En review', value: tasks.filter((t: any) => t.status === 'en_attente_validation').length, color: C },
              { label: 'Terminées', value: tasks.filter((t: any) => t.status === 'termine').length, color: '#059669' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFF] border border-[#E2E8FF]">
                <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
                <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DESIGNER VIEW ─────────────────────────────────────────────────────────────
function DesignerView({ tasks, userId, onStatusUpdate, isAdmin }: { tasks: any[], userId?: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const creativeTasks = userId ? tasks.filter((t: any) => t.assigned_to === userId) : tasks.filter((t: any) => ['design', 'logo', 'visuel', 'maquette', 'graphic', 'charte', 'flyer', 'affiche'].some(k => (t.title || '').toLowerCase().includes(k)))
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [activeTask, setActiveTask] = useState<string | null>(null)

  const handleUpdate = async (id: string, status: string) => {
    setSaving(id); try { await onStatusUpdate?.(id, status) } finally { setSaving(null) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeTask) return
    setUploading(activeTask)
    try {
      const fileName = `${activeTask}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('design-deliverables').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('design-deliverables').getPublicUrl(fileName)
      await supabase.from('tasks').update({ delivery_notes: urlData.publicUrl, delivered_at: new Date().toISOString() }).eq('id', activeTask)
      toast.success(`Fichier uploadé avec succès`)
      await onStatusUpdate?.(activeTask, 'en_attente_validation')
    } catch (err: any) { toast.error(`Erreur: ${err.message}`) }
    finally { setUploading(null); setActiveTask(null); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.ai,.psd,.fig,.sketch,.xd,.zip" onChange={handleFileUpload} />
      <PageHeader title={<>Studio <span style={{ color: B }}>Design</span></>} subtitle="Gestion des créations et livrables" badge="Design" icon={Palette}
        actions={<Link href="/dashboard/design"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Studio complet →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Tâches créa" value={creativeTasks.length} icon={Palette} accent={B} />
          <KpiCard index={1} label="En validation" value={creativeTasks.filter(t => t.status === 'en_attente_validation').length} icon={Clock} accent={C} />
          <KpiCard index={2} label="Terminées" value={creativeTasks.filter(t => t.status === 'termine').length} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={3} label="Livrables déposés" value={creativeTasks.filter(t => t.delivery_notes).length} icon={Upload} accent="#7C3AED" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creativeTasks.length > 0 ? creativeTasks.map((t: any, i: number) => (
            <div key={t.id || i} className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden hover:border-[#0066FF]/30 hover:shadow-sm transition-all">
              <div className="px-4 py-3 border-b border-[#E2E8FF] flex items-center justify-between" style={{ background: `${B}06` }}>
                <Palette size={14} style={{ color: B }} />
                <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                  t.status === 'termine' ? 'bg-emerald-50 text-emerald-600' :
                  t.status === 'en_attente_validation' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                  {t.status === 'en_attente_validation' ? 'Validation' : t.status === 'termine' ? 'Terminé' : t.status || 'En cours'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-[#0A0F1E]">{t.title}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={10} /> {t.deadline ? format(new Date(t.deadline), 'dd MMM') : '—'}</span>
                  <span className="font-medium uppercase">{t.priority || 'Normale'}</span>
                </div>
                {t.delivery_notes && (
                  <a href={t.delivery_notes} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 hover:underline">
                    <CheckCircle2 size={11} /> Livrable déposé — Voir
                  </a>
                )}
                {t.status !== 'termine' && (
                  <div className="space-y-2 pt-2 border-t border-[#E2E8FF]">
                    {t.status === 'en_attente_validation' ? (
                      isAdmin ? (
                        <button onClick={() => handleUpdate(t.id, 'termine')} disabled={saving === t.id}
                          className="w-full h-7 rounded-lg text-[10px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600">
                          {saving === t.id ? '...' : '✓ Valider le livrable'}
                        </button>
                      ) : (
                        <div className="w-full h-7 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center gap-1">
                          <Clock size={10} className="animate-pulse" /> En attente de validation
                        </div>
                      )
                    ) : (
                      <button onClick={() => handleUpdate(t.id, 'en_attente_validation')} disabled={saving === t.id}
                        className="w-full h-7 rounded-lg text-[10px] font-semibold border border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-all">
                        Demander validation
                      </button>
                    )}
                    <button onClick={() => { setActiveTask(t.id); fileRef.current?.click() }} disabled={uploading === t.id}
                      className="w-full h-7 rounded-lg text-[10px] font-semibold border border-[#E2E8FF] hover:border-[#00E5FF]/40 hover:text-[#00E5FF] transition-all flex items-center justify-center gap-1.5">
                      {uploading === t.id ? <><RefreshCw size={10} className="animate-spin" /> Upload...</> : <><Upload size={10} /> Upload livrable</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8FF] rounded-2xl">
              <Sparkles size={24} className="mx-auto mb-2 text-slate-200" />
              <p className="text-[11px] text-slate-300">Aucune tâche créative assignée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DEV VIEW ──────────────────────────────────────────────────────────────────
function DevView({ tasks, userId, onStatusUpdate, isAdmin }: { tasks: any[], userId?: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const devTasks = userId ? tasks.filter(t => t.assigned_to === userId) : tasks.filter(t => ['dev', 'bug', 'fix', 'api', 'db', 'ui', 'frontend', 'backend', 'feature'].some(k => (t.title || '').toLowerCase().includes(k)))

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Dev <span style={{ color: B }}>Terminal</span></>} subtitle="Tickets & sprints en cours" badge="Développeur" icon={Code2}
        actions={<Link href="/dashboard/dev"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Espace Dev →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Tickets ouverts" value={devTasks.filter(t => t.status !== 'termine').length} icon={Terminal} accent={B} />
          <KpiCard index={1} label="En PR" value={devTasks.filter(t => t.status === 'en_attente_validation').length} icon={Send} accent={C} sub="Pull Request" />
          <KpiCard index={2} label="Mergés" value={devTasks.filter(t => t.status === 'termine').length} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={3} label="Uptime" value="99.9%" icon={Activity} accent="#7C3AED" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <SectionTitle>Tickets actifs</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devTasks.filter(t => t.status !== 'termine').map((t: any, i: number) => (
                <div key={i} className="bg-white rounded-xl border border-[#E2E8FF] p-4 hover:border-[#0066FF]/30 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${B}10` }}>
                      <Terminal size={12} style={{ color: B }} />
                    </div>
                    <span className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      t.status === 'en_attente_validation' ? 'bg-amber-50 text-amber-600' :
                      t.status === 'en_cours' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                      {t.status === 'en_attente_validation' ? 'PR Open' : t.status || 'backlog'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0A0F1E] mb-3">{t.title}</p>
                  <div className="space-y-1.5">
                    {t.status !== 'en_attente_validation' && (
                      <button onClick={() => onStatusUpdate?.(t.id, 'en_attente_validation')}
                        className="w-full h-7 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: B }}>
                        Push for Review
                      </button>
                    )}
                    {isAdmin && t.status === 'en_attente_validation' && (
                      <button onClick={() => onStatusUpdate?.(t.id, 'termine')}
                        className="w-full h-7 rounded-lg text-[10px] font-semibold bg-emerald-500 text-white">
                        Merge & Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {devTasks.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-[#E2E8FF] rounded-xl">
                  <Terminal size={24} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-[11px] text-slate-300">Aucun ticket</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5">
              <SectionTitle>Time Tracker</SectionTitle>
              <div className="text-center space-y-4 py-4">
                <p className="text-4xl font-bold text-[#0A0F1E] tabular-nums tracking-tight">00:00:00</p>
                <p className="text-[10px] text-slate-400 uppercase font-medium">Session : Idle</p>
                <div className="flex gap-2">
                  <button className="flex-1 h-9 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: B }}>
                    <Play size={12} /> Start
                  </button>
                  <button className="flex-1 h-9 rounded-xl text-[11px] font-semibold border border-[#E2E8FF] flex items-center justify-center gap-1.5 hover:border-[#0066FF]/30">
                    <Clock size={12} /> Log
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-[#E2E8FF] p-4 text-center">
                <p className="text-xl font-bold" style={{ color: B }}>99.9%</p>
                <p className="text-[9px] text-slate-400 mt-1">Uptime</p>
              </div>
              <div className="bg-white rounded-xl border border-[#E2E8FF] p-4 text-center">
                <p className="text-xl font-bold" style={{ color: '#059669' }}>2ms</p>
                <p className="text-[9px] text-slate-400 mt-1">Latence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── VIDEO VIEW ────────────────────────────────────────────────────────────────
function VideoView({ projects, tasks, userId, onStatusUpdate, isAdmin }: { projects: any[], tasks: any[], userId?: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const videoProjects = userId ? projects : projects.filter(p => ['vidéo', 'film', 'clip', 'montage', 'tournage', 'production'].some(k => (p.title || '').toLowerCase().includes(k)))
  const videoTasks = userId ? tasks.filter(t => t.assigned_to === userId) : tasks

  const updateProject = async (id: string, status: string) => {
    try {
      await supabase.from('projects').update({ status }).eq('id', id)
      toast.success('Projet mis à jour')
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Motion <span style={{ color: B }}>Pictures</span></>} subtitle="Pipeline de production vidéo" badge="Vidéo" icon={Video}
        actions={<Link href="/dashboard/production"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Studio →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Projets vidéo" value={videoProjects.length} icon={Film} accent={B} />
          <KpiCard index={1} label="En tournage" value={videoProjects.filter(p => p.status === 'en_cours').length} icon={Camera} accent={C} />
          <KpiCard index={2} label="En montage" value={videoTasks.filter(t => t.status === 'en_cours').length} icon={Scissors} accent="#EF4444" />
          <KpiCard index={3} label="Livrés" value={videoProjects.filter(p => p.status === 'termine').length} icon={CheckCircle2} accent="#059669" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoProjects.map((p: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden hover:border-[#0066FF]/30 hover:shadow-sm transition-all">
              <div className="h-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${INK}, #1a2040)` }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Clapperboard size={48} className="text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
                  <span className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                    p.status === 'en_cours' ? 'bg-red-500/20 text-red-300' :
                    p.status === 'termine' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60')}>
                    {p.status}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-[#0A0F1E]">{p.title}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400"><span>Avancement</span><span>{p.progress || 0}%</span></div>
                  <div className="h-1.5 bg-[#F0F4FF] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, ${B}, ${C})` }} />
                  </div>
                </div>
                {p.status !== 'en_validation' && p.status !== 'termine' && (
                  <button onClick={() => updateProject(p.id, 'en_validation')}
                    className="w-full h-7 rounded-lg text-[10px] font-semibold text-white" style={{ background: B }}>
                    Soumettre pour validation
                  </button>
                )}
                {isAdmin && p.status === 'en_validation' && (
                  <button onClick={() => updateProject(p.id, 'termine')}
                    className="w-full h-7 rounded-lg text-[10px] font-semibold bg-emerald-500 text-white">
                    Valider & Livrer
                  </button>
                )}
              </div>
            </div>
          ))}
          {videoProjects.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E2E8FF] rounded-2xl">
              <Video size={24} className="mx-auto mb-2 text-slate-200" />
              <p className="text-[11px] text-slate-300">Aucun projet vidéo assigné</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ACADEMY VIEW ──────────────────────────────────────────────────────────────
function AcademyView({ academy, role }: { academy: any, role: 'formateur' | 'responsable' }) {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader
        title={role === 'responsable' ? <>Academy <span style={{ color: B }}>Manager</span></> : <>Espace <span style={{ color: B }}>Formateur</span></>}
        subtitle={role === 'responsable' ? 'Gestion de l\'académie et des inscriptions' : 'Vos formations et apprenants'}
        badge={role === 'responsable' ? 'Direction Académie' : 'Formateur'}
        icon={GraduationCap}
        actions={<Link href="/dashboard/academy"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Académie →</button></Link>}
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Apprenants actifs" value={academy.enrollments} icon={Users} accent={B} />
          <KpiCard index={1} label="Formations" value={academy.trainings.length} icon={BookOpen} accent={C} />
          <KpiCard index={2} label="Taux complétion" value="78%" icon={CheckCircle2} accent="#059669" />
          <KpiCard index={3} label="Sessions / mois" value="12" icon={CalendarDays} accent="#7C3AED" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8FF] flex items-center justify-between">
            <SectionTitle>Catalogue de formations</SectionTitle>
            {role === 'responsable' && (
              <button className="h-7 px-3 rounded-lg text-[10px] font-semibold text-white" style={{ background: B }}>+ Nouvelle formation</button>
            )}
          </div>
          <div className="p-4 space-y-2">
            {academy.trainings.length > 0 ? academy.trainings.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${B}10` }}>
                    <GraduationCap size={14} style={{ color: B }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0A0F1E]">{t.title}</p>
                    <p className="text-[10px] text-slate-400">{formatGNF(t.price)} GNF</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Actif</span>
              </div>
            )) : (
              <div className="py-12 text-center border-2 border-dashed border-[#E2E8FF] rounded-xl">
                <GraduationCap size={24} className="mx-auto mb-2 text-slate-200" />
                <p className="text-[11px] text-slate-300">Aucune formation en catalogue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── STAGIAIRE VIEW ────────────────────────────────────────────────────────────
function StagiaireView({ tasks, userId, onStatusUpdate, isAdmin }: { tasks: any[], userId?: string, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  const myTasks = userId ? tasks.filter(t => t.assigned_to === userId) : tasks
  const done = myTasks.filter(t => t.status === 'termine').length
  const progress = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Espace <span style={{ color: B }}>Stagiaire</span></>} subtitle="Missions et objectifs de stage" badge="Stagiaire" icon={Star}
        actions={<span className="text-[10px] font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: B }}>{myTasks.length} missions assignées</span>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Missions totales" value={myTasks.length} icon={CheckSquare} accent={B} />
          <KpiCard index={1} label="En cours" value={myTasks.filter(t => t.status === 'en_cours').length} icon={Activity} accent={C} />
          <KpiCard index={2} label="Terminées" value={done} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={3} label="Progression" value={`${progress}%`} icon={TrendingUp} accent="#7C3AED" sub="Objectif stage" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <TaskListCard tasks={myTasks} title="Mes missions" href="/dashboard/tasks" onStatusUpdate={onStatusUpdate} isAdmin={isAdmin} />
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5">
              <SectionTitle>Progression du stage</SectionTitle>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Global</span><span>{progress}%</span>
                </div>
                <div className="h-2 bg-[#F0F4FF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${B}, ${C})` }} />
                </div>
                <p className="text-[10px] text-slate-400 italic leading-relaxed mt-2">"Apprendre et exceller dans chaque mission confiée. Votre progression est notre priorité."</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5">
              <SectionTitle>Ressources utiles</SectionTitle>
              <div className="space-y-2">
                {['Règlement intérieur', 'Guide de bienvenue', 'Accès Academy', 'Contact tuteur'].map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] cursor-pointer transition-all">
                    <span className="text-[11px] font-medium text-slate-600">{l}</span>
                    <ArrowUpRight size={13} style={{ color: B }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CHEF PROJET VIEW ──────────────────────────────────────────────────────────
function ChefProjetView({ data, onStatusUpdate, isAdmin }: { data: any, onStatusUpdate?: (id: string, s: string) => void, isAdmin?: boolean }) {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Project <span style={{ color: B }}>Director</span></>} subtitle="Supervision du portfolio et des équipes" badge="Chef de Projet" icon={FolderKanban}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-xl border border-[#E2E8FF]">{data.projects.length} projets</span>
            <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-xl", data.production.lateCount > 0 ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100')}>
              {data.production.lateCount} alertes
            </span>
          </div>
        } />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Projets actifs" value={data.production.activeCount} icon={FolderKanban} accent={B} />
          <KpiCard index={1} label="Taux livraison" value={`${data.production.deliveryRate}%`} icon={CheckCircle2} accent="#059669" />
          <KpiCard index={2} label="En retard" value={data.lateTasks.length} icon={ShieldAlert} accent="#EF4444" />
          <KpiCard index={3} label="Capacité équipe" value={`${data.production.capacity}%`} icon={Users} accent={C} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Portfolio actif</SectionTitle></div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.projects.slice(0, 6).map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${B}10` }}>
                      <Briefcase size={13} style={{ color: B }} />
                    </div>
                    <span className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      p.status === 'en_cours' ? 'bg-blue-50 text-blue-600' :
                      p.status === 'termine' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0A0F1E] mb-0.5 truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-400 mb-3 truncate">{p.clients?.company_name || 'Interne'}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400"><span>Avancement</span><span>{p.progress || 0}%</span></div>
                    <div className="h-1.5 bg-[#F0F4FF] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, ${B}, ${C})` }} />
                    </div>
                  </div>
                </div>
              ))}
              {data.projects.length === 0 && <div className="col-span-full py-10 text-center text-slate-300 text-[11px]">Aucun projet supervisé</div>}
            </div>
          </div>
          <TaskListCard tasks={data.tasks.filter((t: any) => t.status !== 'termine')} title="Tâches critiques" href="/dashboard/tasks" onStatusUpdate={onStatusUpdate} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}

// ─── ASSISTANTE VIEW ───────────────────────────────────────────────────────────
function AssistanteView({ data, userId }: { data: any, userId?: string }) {
  const myTasks = userId ? data.tasks.filter((t: any) => t.assigned_to === userId) : data.tasks

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Operations <span style={{ color: B }}>Assistant</span></>} subtitle="Agenda, tâches et coordination" badge="Assistante Direction" icon={Briefcase}
        actions={<Link href="/dashboard/assistante"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Espace complet →</button></Link>} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Tâches du jour" value={myTasks.filter((t: any) => t.status !== 'termine').length} icon={CheckSquare} accent={B} />
          <KpiCard index={1} label="RDV prévus" value={data.upcomingAppts.length} icon={CalendarDays} accent={C} />
          <KpiCard index={2} label="Contrats actifs" value={data.hrLegal.contracts.filter((c: any) => c.status === 'actif').length} icon={FileText} accent="#059669" />
          <KpiCard index={3} label="Présences" value={data.hrLegal.attendance} icon={UserCheck} accent="#7C3AED" sub="Aujourd'hui" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <TaskListCard tasks={myTasks} title="To-do list" href="/dashboard/tasks" />
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Agenda du jour</SectionTitle></div>
            <div className="p-4 space-y-2">
              {data.upcomingAppts.length > 0 ? data.upcomingAppts.slice(0, 5).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF] transition-all">
                  <div className="h-10 w-10 rounded-xl border border-[#E2E8FF] flex flex-col items-center justify-center shrink-0 bg-[#F8FAFF]">
                    <p className="text-[8px] font-bold uppercase" style={{ color: B }}>{format(new Date(a.start_at), 'MMM')}</p>
                    <p className="text-sm font-bold text-[#0A0F1E] leading-none">{format(new Date(a.start_at), 'dd')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400">{format(new Date(a.start_at), 'HH:mm')}</p>
                    <p className="text-xs font-semibold text-[#0A0F1E] truncate">{a.title || 'Réunion'}</p>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-300 text-[11px]">Aucun rendez-vous</div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${B}, ${C})` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-2">Statut Agence</p>
              <p className="text-lg font-bold">Opérations fluides</p>
              <p className="text-[10px] opacity-70 mt-2 leading-relaxed">Tous les membres trackent correctement. Performance optimale.</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8FF] p-5">
              <SectionTitle>RH Résumé</SectionTitle>
              <div className="space-y-2">
                {[
                  { label: 'Équipe active', value: '100%' },
                  { label: 'Congés demandés', value: '0' },
                  { label: 'Contrats signés', value: data.hrLegal.contracts.length },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F8FAFF]">
                    <span className="text-[11px] text-slate-500">{r.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: B }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CLIENT VIEW ───────────────────────────────────────────────────────────────
function ClientView({ data, onStatusUpdate }: { data: any, onStatusUpdate?: (id: string, s: string) => void }) {
  const pendingValidation = data.tasks.filter((t: any) => t.status === 'en_attente_validation')

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <PageHeader title={<>Espace <span style={{ color: B }}>Client</span></>} subtitle="Suivi de vos projets en temps réel" badge="Portail Client" icon={Building2}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/projects"><button className="h-8 px-4 rounded-xl text-white text-[11px] font-semibold" style={{ background: B }}>Mes projets</button></Link>
            <Link href="/dashboard/invoices"><button className="h-8 px-4 rounded-xl text-[11px] font-semibold border border-[#E2E8FF] hover:border-[#0066FF]/30">Mes factures</button></Link>
          </div>
        } />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={0} label="Projets actifs" value={data.projects.filter((p: any) => p.status !== 'termine').length} icon={FolderKanban} accent={B} />
          <KpiCard index={1} label="Livrables à valider" value={pendingValidation.length} icon={CheckCircle2} accent={C} />
          <KpiCard index={2} label="Factures" value={data.recentInvoices.length} icon={Receipt} accent="#059669" />
          <KpiCard index={3} label="Tâches terminées" value={data.tasks.filter((t: any) => t.status === 'termine').length} icon={CheckSquare} accent="#7C3AED" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Mes projets</SectionTitle></div>
            <div className="p-4 space-y-3">
              {data.projects.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-[#E2E8FF] hover:border-[#0066FF]/30 hover:bg-[#F8FAFF] transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-semibold text-[#0A0F1E]">{p.title}</p>
                    <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                      p.status === 'en_cours' ? 'bg-blue-50 text-blue-600' :
                      p.status === 'termine' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {p.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400"><span>Avancement</span><span>{p.progress || 0}%</span></div>
                    <div className="h-1.5 bg-[#F0F4FF] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, ${B}, ${C})` }} />
                    </div>
                  </div>
                </div>
              ))}
              {data.projects.length === 0 && <div className="py-10 text-center text-slate-300 text-[11px]">Aucun projet en cours</div>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8FF] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8FF]"><SectionTitle>Dernières factures</SectionTitle></div>
              <div className="p-4 space-y-2">
                {data.recentInvoices.slice(0, 4).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8FF] hover:bg-[#F8FAFF]">
                    <div>
                      <p className="text-[10px] font-semibold text-[#0A0F1E]">{inv.invoice_number}</p>
                      <p className={cn("text-[9px] font-bold uppercase", inv.status === 'payee' ? 'text-emerald-500' : 'text-amber-500')}>{inv.status}</p>
                    </div>
                    <p className="text-xs font-bold" style={{ color: B }}>{formatGNF(inv.total_amount)} GNF</p>
                  </div>
                ))}
              </div>
            </div>
            {pendingValidation.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Livrables à valider ({pendingValidation.length})</span>
                </div>
                <div className="p-4 space-y-2">
                  {pendingValidation.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl border border-amber-100 bg-amber-50/30">
                      <p className="text-xs font-semibold text-[#0A0F1E] mb-2">{t.title}</p>
                      <button onClick={() => onStatusUpdate?.(t.id, 'termine')}
                        className="w-full h-7 rounded-lg text-[10px] font-semibold bg-amber-500 text-white hover:bg-amber-600">
                        Valider le livrable
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
