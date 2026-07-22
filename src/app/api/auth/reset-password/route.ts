import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/auth/reset-password
// Admin can force-reset any user's password by email
// Body: { email, newPassword }
export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json()
    const cleanEmail = email?.trim().toLowerCase()

    if (!cleanEmail || !newPassword) {
      return NextResponse.json({ error: 'email et newPassword requis' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }

    // Find the auth user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

    const authUser = users.users.find(u => u.email?.toLowerCase() === cleanEmail)
    if (!authUser) {
      return NextResponse.json({ error: 'Aucun compte trouvé pour cet email.' }, { status: 404 })
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
