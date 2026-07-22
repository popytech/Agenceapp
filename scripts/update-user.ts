
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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

  // 1. Find the user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    console.error(`User ${email} not found in auth.users`)
    return
  }

  // 2. Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  })

  if (updateError) {
    console.error('Error updating password:', updateError)
  } else {
    console.log(`Password updated successfully for ${email}`)
  }

  // 3. Update profile role to super_admin
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
  } else {
    console.log(`Profile role updated to super_admin for ${email}`)
  }

  // 4. Delete admin@popytech.com if it exists
  const adminUser = users.find(u => u.email === 'admin@popytech.com')
  if (adminUser) {
    console.log('Deleting admin@popytech.com...')
    const { error: deleteError } = await supabase.auth.admin.deleteUser(adminUser.id)
    if (deleteError) {
      console.error('Error deleting admin user:', deleteError)
    } else {
      console.log('admin@popytech.com deleted successfully')
    }
  }
}

run()
