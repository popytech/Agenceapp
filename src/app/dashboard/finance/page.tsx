'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { downloadFinanceReportPDF } from '@/lib/pdf'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316']
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function parseLocalDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const parts = str.split('-')
  if (parts.length < 3) return null
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Sélecteur de période : nombre de mois à afficher (3, 6, 12)
  const [periodMonths, setPeriodMonths] = useState(6)
  const [offset, setOffset] = useState(0)
  // Sélecteur de mois pour le rapport PDF
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function load() {
      const [i, p, e] = await Promise.all([
        supabase.from('invoices').select('*, clients(company_name)').order('invoice_date', { ascending: false }),
        supabase.from('payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      ])
      setInvoices(i.data || [])
      setPayments(p.data || [])
      setExpenses(e.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // KPIs — mois en cours vs mois précédent
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const totalCA = useMemo(() =>
    payments
      .filter(p => { const d = parseLocalDate(p.payment_date); return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear })
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  , [payments])

  const prevCA = useMemo(() =>
    payments
      .filter(p => { const d = parseLocalDate(p.payment_date); return d && d.getMonth() === prevMonth && d.getFullYear() === prevYear })
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  , [payments])

  const totalCAAllTime = useMemo(() =>
    payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  , [payments])

  const totalPending = useMemo(() =>
    invoices
      .filter(i => i.status !== 'payee')
      .reduce((s, i) => s + (Number(i.total_amount || 0) - Number(i.paid_amount || 0)), 0)
  , [invoices])

  const totalExpenses = useMemo(() =>
    expenses
      .filter(e => { const d = parseLocalDate(e.expense_date); return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear })
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  , [expenses])

  const prevExpenses = useMemo(() =>
    expenses
      .filter(e => { const d = parseLocalDate(e.expense_date); return d && d.getMonth() === prevMonth && d.getFullYear() === prevYear })
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  , [expenses])

  const netProfit = totalCA - totalExpenses

  const caEvol = prevCA > 0 ? ((totalCA - prevCA) / prevCA * 100).toFixed(0) : null
  const expEvol = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(0) : null

  // Graphique mensuel — basé sur les vraies dates
  const monthlyData = useMemo(() => {
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()

    return Array.from({ length: periodMonths }, (_, i) => {
      // i=0 → le plus ancien mois, i=periodMonths-1 → le plus récent
      // offset=0 : fenêtre = [aujourd'hui - (periodMonths-1) mois .. aujourd'hui]
      // offset=-1 : fenêtre = [aujourd'hui - (2*periodMonths-1) mois .. aujourd'hui - periodMonths mois]
      const monthsBack = (periodMonths - 1 - i) - offset * periodMonths
      let m = todayMonth - monthsBack
      let y = todayYear
      while (m < 0) { m += 12; y -= 1 }
      while (m > 11) { m -= 12; y += 1 }

      // Revenus = paiements reçus ce mois (payment_date)
      const rev = payments
        .filter(p => {
          const date = parseLocalDate(p.payment_date)
          return date && date.getMonth() === m && date.getFullYear() === y
        })
        .reduce((s, p) => s + Number(p.amount || 0), 0)

      // Dépenses ce mois (expense_date)
      const exp = expenses
        .filter(e => {
          const date = parseLocalDate(e.expense_date)
          return date && date.getMonth() === m && date.getFullYear() === y
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      // Factures émises ce mois (invoice_date)
      const invoiced = invoices
        .filter(inv => {
          const date = parseLocalDate(inv.invoice_date)
          return date && date.getMonth() === m && date.getFullYear() === y
        })
        .reduce((s, inv) => s + Number(inv.total_amount || 0), 0)

      return {
        name: `${MONTHS_FR[m]} ${y !== todayYear ? y : ''}`.trim(),
        revenus: rev,
        dépenses: exp,
        facturé: invoiced,
      }
    })
  }, [payments, expenses, invoices, periodMonths, offset])

  // Dépenses par catégorie
  const expenseChartData = useMemo(() => {
    const bycat = expenses.reduce((acc: any, e) => {
      const cat = e.category || 'Autres'
      acc[cat] = (acc[cat] || 0) + Number(e.amount || 0)
      return acc
    }, {})
    return Object.entries(bycat).map(([name, value]) => ({ name, value: value as number }))
  }, [expenses])

  // Paiements par méthode
  const paymentChartData = useMemo(() => {
    const bymethod = payments.reduce((acc: any, p) => {
      const m = (p.payment_method || 'autre').replace(/_/g, ' ')
      acc[m] = (acc[m] || 0) + Number(p.amount || 0)
      return acc
    }, {})
    return Object.entries(bymethod).map(([name, value]) => ({ name, value: value as number }))
  }, [payments])

  const statusConfig: Record<string, { label: string; cls: string }> = {
    payee: { label: 'Payée', cls: 'bg-green-100 text-green-700 border-green-200' },
    impayee: { label: 'Impayée', cls: 'bg-red-100 text-red-700 border-red-200' },
    partielle: { label: 'Partielle', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
        {label && <p className="font-semibold text-foreground mb-2">{label}</p>}
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color || p.fill }} className="font-medium">
            {p.name}: {(p.value as number).toLocaleString('fr-FR')} GNF
          </p>
        ))}
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vue d&apos;ensemble financière de l&apos;agence</p>
        </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <select
              value={`${reportYear}-${reportMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                setReportYear(y)
                setReportMonth(m)
              }}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
            >
              {Array.from({ length: 18 }, (_, i) => {
                const d = new Date()
                d.setDate(1)
                d.setMonth(d.getMonth() - i)
                const m = d.getMonth()
                const y = d.getFullYear()
                const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
                return (
                  <option key={`${y}-${m}`} value={`${y}-${m}`}>
                    {MONTHS[m]} {y}
                  </option>
                )
              })}
            </select>
            <Button
              variant="outline"
              onClick={() => downloadFinanceReportPDF({
                totalRevenue: totalCA,
                totalExpenses,
                invoices,
                expenses,
                payments,
                selectedMonth: reportMonth,
                selectedYear: reportYear,
              })}
              className="gap-2"
              size="sm"
            >
              <FileDown className="h-4 w-4" /> Télécharger rapport
            </Button>
          </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {[
            {
              label: 'CA encaissé (ce mois)',
              value: totalCA,
              icon: TrendingUp,
              iconBg: 'bg-green-100 dark:bg-green-900/30',
              iconColor: 'text-green-600',
              valueColor: 'text-green-600',
              sub: caEvol !== null
                ? `${Number(caEvol) >= 0 ? '+' : ''}${caEvol}% vs mois précédent`
                : `Total cumulé : ${totalCAAllTime.toLocaleString('fr-FR')} GNF`
            },
            {
              label: 'En attente',
              value: totalPending,
              icon: AlertCircle,
              iconBg: 'bg-amber-100 dark:bg-amber-900/30',
              iconColor: 'text-amber-500',
              valueColor: 'text-amber-600',
              sub: `${invoices.filter(i => i.status !== 'payee').length} factures non soldées`
            },
            {
              label: 'Dépenses (ce mois)',
              value: totalExpenses,
              icon: TrendingDown,
              iconBg: 'bg-red-100 dark:bg-red-900/30',
              iconColor: 'text-red-500',
              valueColor: 'text-red-600',
              sub: expEvol !== null
                ? `${Number(expEvol) >= 0 ? '+' : ''}${expEvol}% vs mois précédent`
                : `${expenses.length} dépenses ce mois`
            },
            {
              label: 'Bénéfice net (ce mois)',
              value: netProfit,
              icon: DollarSign,
              iconBg: netProfit >= 0 ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-red-100 dark:bg-red-900/30',
              iconColor: netProfit >= 0 ? 'text-indigo-600' : 'text-red-500',
              valueColor: netProfit >= 0 ? 'text-indigo-600' : 'text-red-600',
              sub: netProfit >= 0 ? 'Bénéficiaire ce mois' : 'Déficitaire ce mois'
            },
          ].map(kpi => (
          <Card key={kpi.label} className="border border-border shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium leading-tight">{kpi.label}</p>
                <div className={`p-1.5 sm:p-2 rounded-xl ${kpi.iconBg} shrink-0`}>
                  <kpi.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${kpi.iconColor}`} />
                </div>
              </div>
              <p className={`text-base sm:text-lg md:text-xl font-bold ${kpi.valueColor} leading-tight`}>
                {kpi.value.toLocaleString('fr-FR')}
                <span className="text-[10px] sm:text-xs font-semibold ml-1">GNF</span>
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique principal — évolution mensuelle */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Revenus encaissés vs Dépenses ({periodMonths} mois)
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sélecteur de période */}
              <div className="flex gap-1">
                {[3, 6, 12].map(p => (
                  <button
                    key={p}
                    onClick={() => { setPeriodMonths(p); setOffset(0) }}
                    className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                      periodMonths === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p}M
                  </button>
                ))}
              </div>
              {/* Navigation passé/futur */}
              <div className="flex gap-1">
                  <button
                    onClick={() => setOffset(o => o + 1)}
                    className="p-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    title="Période précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setOffset(o => Math.max(0, o - 1))}
                    disabled={offset === 0}
                    className="p-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
                    title="Période suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenus" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="dépenses" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="facturé" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} strokeDasharray="5 5" activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Revenus = paiements réellement reçus · Facturé = montant total des factures émises
          </p>
        </CardContent>
      </Card>

      {/* Deux graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseChartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune dépense enregistrée</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%" cy="50%"
                    outerRadius={75} innerRadius={35}
                    dataKey="value" paddingAngle={3}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expenseChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Paiements par méthode (GNF)</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentChartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucun paiement enregistré</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={paymentChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {paymentChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listes récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Dernières dépenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {expenses.slice(0, 6).map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exp.category} · {exp.expense_date ? new Date(exp.expense_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-500 shrink-0">-{(exp.amount || 0).toLocaleString('fr-FR')} GNF</span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Aucune dépense</p>}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Derniers paiements reçus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {payments.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize truncate">
                    {(p.payment_method || 'autre').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600 shrink-0">+{(p.amount || 0).toLocaleString('fr-FR')} GNF</span>
              </div>
            ))}
            {payments.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Aucun paiement</p>}
          </CardContent>
        </Card>
      </div>

      {/* Factures récentes */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Factures récentes</CardTitle>
            <span className="text-xs text-muted-foreground">{invoices.length} factures</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-right py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant</th>
                  <th className="text-right py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Payé</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 8).map(inv => {
                  const sc = statusConfig[inv.status] || { label: inv.status, cls: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-3 font-medium text-foreground truncate max-w-[120px]">{inv.clients?.company_name || '—'}</td>
                      <td className="py-3 pr-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {inv.invoice_date ? new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-3 pr-3 text-right text-muted-foreground whitespace-nowrap">{(inv.total_amount || 0).toLocaleString('fr-FR')} GNF</td>
                      <td className="py-3 pr-3 text-right text-green-600 font-medium whitespace-nowrap hidden sm:table-cell">{(inv.paid_amount || 0).toLocaleString('fr-FR')} GNF</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium border ${sc.cls} whitespace-nowrap`}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {invoices.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Aucune facture</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
