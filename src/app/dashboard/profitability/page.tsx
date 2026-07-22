'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp, TrendingDown, DollarSign, Clock, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Wallet
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

export default function ProfitabilityPage() {
  const [period, setPeriod] = useState('all')
  const [projects, setProjects] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: inv }, { data: exp }, { data: te }, { data: pay }] = await Promise.all([
      supabase.from('projects').select('id, title, budget, status, created_at, clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, project_id, total_amount, paid_amount, status, created_at, due_date'),
      supabase.from('expenses').select('id, amount, category, expense_date, project_id, title'),
      supabase.from('time_entries').select('id, project_id, duration_seconds, hourly_rate, is_billable, started_at').not('duration_seconds', 'is', null),
      supabase.from('payments').select('id, invoice_id, amount, payment_date').order('payment_date', { ascending: false }).limit(1000),
    ])
    setProjects(p || [])
    setInvoices(inv || [])
    setExpenses(exp || [])
    setTimeEntries(te || [])
    setPayments(pay || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function inPeriod(dateStr: string | null) {
    if (!dateStr || period === 'all') return true
    const date = new Date(dateStr)
    const now = new Date()
    if (period === 'month') return date >= startOfMonth(now) && date <= endOfMonth(now)
    if (period === 'quarter') return date >= subMonths(now, 3)
    if (period === 'year') return date.getFullYear() === now.getFullYear()
    return true
  }

  const filteredPayments = payments.filter(p => inPeriod(p.payment_date))
  const filteredInvoices = invoices.filter(i => inPeriod(i.created_at))
  const filteredExpenses = expenses.filter(e => inPeriod(e.expense_date))
  const filteredTime = timeEntries.filter(t => inPeriod(t.started_at))

  const totalRevenue = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalInvoiced = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalHours = filteredTime.reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600
  const laborCost = filteredTime.filter(t => t.is_billable).reduce((s, t) => s + ((t.duration_seconds || 0) / 3600) * Number(t.hourly_rate || 0), 0)
  const totalCost = totalExpenses + laborCost
  const netProfit = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const unpaid = totalInvoiced - totalRevenue

  // Build a map: invoice_id -> project_id for linking payments to projects
  const invoiceProjectMap: Record<string, string> = {}
  invoices.forEach(inv => { if (inv.project_id) invoiceProjectMap[inv.id] = inv.project_id })

  const projectData = projects.map(proj => {
    const projInvoiceIds = new Set(invoices.filter(i => i.project_id === proj.id).map(i => i.id))
    const pPay = filteredPayments.filter(p => p.invoice_id && projInvoiceIds.has(p.invoice_id))
    const pExp = filteredExpenses.filter(e => e.project_id === proj.id)
    const pTime = filteredTime.filter(t => t.project_id === proj.id)
    const billed = pPay.reduce((s, p) => s + Number(p.amount || 0), 0)
    const expCost = pExp.reduce((s, e) => s + Number(e.amount || 0), 0)
    const hours = pTime.reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600
    const labor = pTime.filter(t => t.is_billable).reduce((s, t) => s + ((t.duration_seconds || 0) / 3600) * Number(t.hourly_rate || 0), 0)
    const cost = expCost + labor
    const projMargin = billed > 0 ? ((billed - cost) / billed) * 100 : null
    const budget = Number(proj.budget) || 0
    const budgetUsage = budget > 0 ? (billed / budget) * 100 : null
    return { ...proj, billed, expCost, hours, cost, projMargin, budget, budgetUsage }
  }).filter(p => p.billed > 0 || p.hours > 0)

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    const ms = startOfMonth(d), me = endOfMonth(d)
    const rev = payments.filter(p => { if (!p.payment_date) return false; const dt = new Date(p.payment_date); return dt >= ms && dt <= me }).reduce((s, p) => s + Number(p.amount || 0), 0)
    const exp = expenses.filter(e => { if (!e.expense_date) return false; const dt = new Date(e.expense_date); return dt >= ms && dt <= me }).reduce((s, e) => s + Number(e.amount || 0), 0)
    return { mois: format(d, 'MMM', { locale: fr }), CA: Math.round(rev / 1000), Charges: Math.round(exp / 1000), Bénéfice: Math.round((rev - exp) / 1000) }
  })

  const expByCategory: Record<string, number> = {}
  filteredExpenses.forEach(e => { const cat = e.category || 'Autre'; expByCategory[cat] = (expByCategory[cat] || 0) + Number(e.amount || 0) })
  const pieData = Object.entries(expByCategory).map(([name, value]) => ({ name, value: Math.round(Number(value)) }))

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pt-4 md:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Rentabilité</h1>
          <p className="text-muted-foreground text-sm mt-1">Analyse financière et rentabilité par projet</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout le temps</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">3 derniers mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CA encaissé', value: fmt(totalRevenue), sub: unpaid > 0 ? `+ ${fmt(unpaid)} à encaisser` : 'GNF', icon: DollarSign, color: 'text-green-600' },
          { label: 'Charges totales', value: fmt(totalCost), sub: 'dépenses + MO', icon: TrendingDown, color: 'text-red-500' },
          { label: 'Bénéfice net', value: fmt(netProfit), sub: 'GNF', icon: netProfit >= 0 ? ArrowUpRight : ArrowDownRight, color: netProfit >= 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'Marge nette', value: totalRevenue > 0 ? `${margin.toFixed(1)}%` : '—', sub: `${totalHours.toFixed(1)}h travaillées`, icon: Target, color: margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-amber-500' : 'text-red-500' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Tendance 6 mois (milliers GNF)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${v}k GNF`} />
                <Legend />
                <Bar dataKey="CA" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Charges" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bénéfice" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" />Charges par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">Aucune dépense</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${fmt(Number(v))} GNF`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table par projet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rentabilité par projet</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : projectData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucune donnée. Ajoutez des factures ou enregistrez du temps sur les projets.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Projet', 'Client', 'Budget', 'CA encaissé', 'Dépenses', 'Heures', 'Marge', 'Budget utilisé'].map(h => (
                      <th key={h} className={`px-4 py-2.5 font-medium text-muted-foreground text-xs ${h === 'Projet' || h === 'Client' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectData.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{p.title}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{(p.clients as any)?.company_name || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs">{p.budget > 0 ? fmt(p.budget) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{p.billed > 0 ? fmt(p.billed) : '—'}</td>
                      <td className="px-4 py-3 text-right text-red-500 text-xs">{p.expCost > 0 ? fmt(p.expCost) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{p.hours > 0 ? `${p.hours.toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {p.projMargin !== null ? (
                          <Badge variant="outline" className={`text-xs ${p.projMargin >= 50 ? 'text-green-600 border-green-300/40 bg-green-50/30' : p.projMargin >= 20 ? 'text-amber-600 border-amber-300/40 bg-amber-50/30' : 'text-red-500 border-red-300/40 bg-red-50/30'}`}>
                            {p.projMargin.toFixed(1)}%
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.budgetUsage !== null ? (
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p.budgetUsage > 100 ? 'bg-red-500' : p.budgetUsage > 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(p.budgetUsage, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-mono ${p.budgetUsage > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>{p.budgetUsage.toFixed(0)}%</span>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-semibold border-t-2">
                    <td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">Total</td>
                    <td className="px-4 py-3 text-right text-green-600">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(totalExpenses)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline" className={`text-xs ${margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                        {totalRevenue > 0 ? `${margin.toFixed(1)}%` : '—'}
                      </Badge>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
