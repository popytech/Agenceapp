import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  const email = process.env.ADMIN_EMAIL
  const newPassword = process.env.ADMIN_NEW_PASSWORD

  if (!email || !newPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_NEW_PASSWORD must be set')
  }

  console.log(`Updating password for ${email}...`)

  const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
  if (fetchError) {
    console.error('Error fetching users:', fetchError)
    return
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    console.error(`User ${email} not found.`)
    return
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  })

  if (updateError) {
    console.error('Error updating password:', updateError)
  } else {
    console.log(`Password updated successfully for ${email}.`)
  }
}

run()
