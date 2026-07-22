import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user_id:client_id
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=tiktok_denied`)
  }

  const [userId, clientId] = (state || '').split(':')
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=invalid_state`)
  }

  const redirectUri = `${appUrl}/api/social/tiktok/callback`

  // Exchange code for token
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=tiktok_token_failed`)
  }

  // Get user info
  const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userData = await userRes.json()
  const user = userData.data?.user || {}

  await supabase.from('social_connected_accounts').upsert({
    user_id: userId,
    client_id: clientId && clientId !== 'null' ? clientId : null,
    platform: 'tiktok',
    platform_user_id: user.open_id,
    platform_username: user.display_name,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    token_expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    scope: tokenData.scope || null,
    avatar_url: user.avatar_url || null,
    followers_count: user.follower_count || 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform,platform_user_id,user_id' })

  return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&success=tiktok_connected`)
}
