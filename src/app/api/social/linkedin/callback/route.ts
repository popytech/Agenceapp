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
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=linkedin_denied`)
  }

  const [userId, clientId] = (state || '').split(':')
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=invalid_state`)
  }

  const redirectUri = `${appUrl}/api/social/linkedin/callback`

  // Exchange code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=linkedin_token_failed`)
  }

  // Get user info via OpenID Connect
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const meData = await meRes.json()

  const personUrn = `urn:li:person:${meData.sub}`

  await supabase.from('social_connected_accounts').upsert({
    user_id: userId,
    client_id: clientId && clientId !== 'null' ? clientId : null,
    platform: 'linkedin',
    platform_user_id: meData.sub,
    platform_username: meData.name,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    token_expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    scope: tokenData.scope || null,
    avatar_url: meData.picture || null,
    platform_page_id: personUrn,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform,platform_user_id,user_id' })

  return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&success=linkedin_connected`)
}
