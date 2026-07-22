import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role } = await req.json()
    const cleanEmail = email?.trim().toLowerCase()

    if (!cleanEmail || !password || !fullName) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Check if a profile already exists for this email (pre-created by admin)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', cleanEmail)
      .maybeSingle()

    // Try to create the Auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: existingProfile?.full_name || fullName,
        role: existingProfile?.role || role || 'client',
      },
    })

    if (error) {
      // User already exists in Auth — that's a login error, not signup
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Un compte existe déjà avec cet email. Utilisez la connexion.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user) {
      if (existingProfile) {
        // Profile already exists — update its ID to match the new Auth user
        // First delete the old profile row, then re-insert with correct auth ID
        await supabaseAdmin.from('profiles').delete().eq('email', cleanEmail)
        await supabaseAdmin.from('profiles').insert({
          id: data.user.id,
          full_name: existingProfile.full_name || fullName,
          email: cleanEmail,
            role: existingProfile.role || role || 'client',
          updated_at: new Date().toISOString(),
        })
      } else {
        // New user — create profile
        await supabaseAdmin.from('profiles').upsert(
          {
            id: data.user.id,
            full_name: fullName,
            email: cleanEmail,
            role: role || 'client',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
