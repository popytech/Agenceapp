import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/auth/create-member-account
// Creates an Auth account for a profile that doesn't have one yet
// Body: { email, password, profileId? }
export async function POST(req: NextRequest) {
  try {
    const { email, password, profileId } = await req.json()
    const cleanEmail = email?.trim().toLowerCase()

    if (!cleanEmail || !password) {
      return NextResponse.json({ error: 'email et password requis' }, { status: 400 })
    }

    // Get the existing profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Aucun profil trouvé pour cet email.' }, { status: 404 })
    }

    // Create the Auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        role: profile.role,
      },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Un compte Auth existe déjà pour cet email.', alreadyExists: true }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user) {
      // Re-link profile with the new Auth user ID
      await supabaseAdmin.from('profiles').delete().eq('email', cleanEmail)
      await supabaseAdmin.from('profiles').insert({
        id: data.user.id,
        full_name: profile.full_name,
        email: cleanEmail,
        role: profile.role,
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, userId: data.user?.id })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
