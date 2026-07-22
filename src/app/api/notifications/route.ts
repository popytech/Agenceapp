import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in3days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayStr = today.toISOString().split('T')[0]

  const { data: profiles } = await supabase.from('profiles').select('id, role')
  if (!profiles?.length) return NextResponse.json({ ok: true, generated: 0 })

  // Admins et chefs de projet uniquement pour les notifs sensibles
  const adminIds = profiles.filter(p => ['super_admin', 'chef_projet'].includes(p.role)).map(p => p.id)
  const allIds = profiles.map(p => p.id)

  let generated = 0
  const notifs: any[] = []

  // ─── 1. Tâches — deadline dans 3 jours ───────────────────────────────────
  const { data: urgentTasks } = await supabase
    .from('tasks')
    .select('id, title, deadline, assigned_to, projects(title)')
    .not('deadline', 'is', null)
    .lte('deadline', in3days.toISOString().split('T')[0])
    .gte('deadline', todayStr)
    .neq('status', 'termine')

  for (const task of urgentTasks || []) {
    const daysLeft = Math.ceil((new Date(task.deadline).getTime() - today.getTime()) / 86400000)
    const targets = task.assigned_to ? [task.assigned_to, ...adminIds.filter(id => id !== task.assigned_to)] : adminIds
    const uniqueTargets = [...new Set(targets)]
    for (const uid of uniqueTargets) {
      notifs.push({
        user_id: uid,
        title: `Deadline dans ${daysLeft} jour(s)`,
        message: `Tâche "${task.title}"${(task.projects as any)?.title ? ` — ${(task.projects as any).title}` : ''} — ${new Date(task.deadline).toLocaleDateString('fr-FR')}`,
        type: daysLeft <= 1 ? 'error' : 'warning',
        link: '/dashboard/projects',
      })
      generated++
    }
  }

  // ─── 2. Projets — deadline dans 7 jours ──────────────────────────────────
  const { data: urgentProjects } = await supabase
    .from('projects')
    .select('id, title, end_date')
    .not('end_date', 'is', null)
    .lte('end_date', in7days.toISOString().split('T')[0])
    .gte('end_date', todayStr)
    .neq('status', 'termine')

  for (const proj of urgentProjects || []) {
    const daysLeft = Math.ceil((new Date(proj.end_date).getTime() - today.getTime()) / 86400000)
    for (const uid of adminIds) {
      notifs.push({
        user_id: uid,
        title: `Projet — échéance dans ${daysLeft} jour(s)`,
        message: `"${proj.title}" doit être livré le ${new Date(proj.end_date).toLocaleDateString('fr-FR')}`,
        type: 'warning',
        link: '/dashboard/projects',
      })
      generated++
    }
  }

  // ─── 3. Publications en validation ───────────────────────────────────────
  const { data: pubsToValidate } = await supabase
    .from('publications')
    .select('id, title, platform, clients(company_name)')
    .eq('status', 'en_validation')

  for (const pub of pubsToValidate || []) {
    for (const uid of adminIds) {
      notifs.push({
        user_id: uid,
        title: 'Publication à valider',
        message: `"${pub.title}"${(pub.clients as any)?.company_name ? ` — ${(pub.clients as any).company_name}` : ''} attend votre validation`,
        type: 'info',
        link: '/dashboard/publications',
      })
      generated++
    }
  }

  // ─── 4. Publications programmées aujourd'hui ──────────────────────────────
  const { data: todayPubs } = await supabase
    .from('publications')
    .select('id, title, platform, clients(company_name)')
    .eq('status', 'programme')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', new Date(today.getTime() + 86400000).toISOString())

  for (const pub of todayPubs || []) {
    for (const uid of allIds) {
      notifs.push({
        user_id: uid,
        title: 'Publication prévue aujourd\'hui',
        message: `"${pub.title}"${(pub.clients as any)?.company_name ? ` — ${(pub.clients as any).company_name}` : ''}`,
        type: 'info',
        link: '/dashboard/publications',
      })
      generated++
    }
  }

  // ─── 5. Factures impayées en retard ──────────────────────────────────────
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date, clients(company_name)')
    .not('due_date', 'is', null)
    .lt('due_date', todayStr)
    .eq('status', 'impayee')

  for (const inv of overdueInvoices || []) {
    for (const uid of adminIds) {
      notifs.push({
        user_id: uid,
        title: 'Facture impayée en retard',
        message: `${inv.invoice_number} — ${(inv.clients as any)?.company_name} — ${Number(inv.total_amount).toLocaleString('fr-FR')} GNF`,
        type: 'error',
        link: '/dashboard/invoices',
      })
      generated++
    }
  }

  // ─── 6. Rendez-vous du jour ───────────────────────────────────────────────
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, title, start_at, clients(company_name)')
    .gte('start_at', today.toISOString())
    .lt('start_at', new Date(today.getTime() + 86400000).toISOString())
    .neq('status', 'annule')

  for (const appt of todayAppts || []) {
    const hour = new Date(appt.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    for (const uid of allIds) {
      notifs.push({
        user_id: uid,
        title: `Rendez-vous aujourd'hui à ${hour}`,
        message: `"${appt.title}"${(appt.clients as any)?.company_name ? ` — ${(appt.clients as any).company_name}` : ''}`,
        type: 'info',
        link: '/dashboard/calendar',
      })
      generated++
    }
  }

  if (notifs.length > 0) {
    await supabase.from('notifications').insert(notifs)
  }

  return NextResponse.json({ ok: true, generated })
}
