import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  // Get all paid invoices marked as retainer (recurring)
  const { data: retainerInvoices } = await supabase
    .from('invoices')
    .select('*, clients(id, company_name)')
    .eq('is_recurring', true)
    .eq('status', 'payee')

  if (!retainerInvoices?.length) {
    return NextResponse.json({ ok: true, created: 0 })
  }

  let created = 0
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  for (const inv of retainerInvoices) {
    // Check if invoice for this month already exists
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString()
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString()

    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', inv.client_id)
      .eq('notes', `[Retainer] ${inv.invoice_number}`)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    if (existing?.length) continue // Already created this month

    // Create new invoice for this month
    const newInvNumber = `RET-${currentYear}${String(currentMonth + 1).padStart(2, '0')}-${inv.invoice_number}`
    const dueDate = new Date(currentYear, currentMonth + 1, 0) // last day of month

    await supabase.from('invoices').insert({
      client_id: inv.client_id,
      project_id: inv.project_id,
      invoice_number: newInvNumber,
      total_amount: inv.total_amount,
      paid_amount: 0,
      status: 'impayee',
      due_date: dueDate.toISOString().split('T')[0],
      notes: `[Retainer] ${inv.invoice_number}`,
    })
    created++
  }

  return NextResponse.json({ ok: true, created })
}
