import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if table exists
  const { error } = await supabase.from('payroll').select('id').limit(1)

  if (error?.code === 'PGRST205') {
    return NextResponse.json({
      status: 'table_missing',
      sql: `
CREATE TABLE IF NOT EXISTS public.payroll (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name text NOT NULL,
  role text,
  period text NOT NULL,
  salary_base numeric NOT NULL DEFAULT 0,
  bonuses numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_date date,
  payment_method text DEFAULT 'virement',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "payroll_auth" ON public.payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);
      `.trim(),
      message: 'Run the SQL above in your Supabase SQL editor'
    })
  }

  return NextResponse.json({ status: 'ok' })
}
