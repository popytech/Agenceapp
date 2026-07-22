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
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=meta_denied`)
  }

  const [userId, clientId] = (state || '').split(':')
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=invalid_state`)
  }

  const clientIdVal = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const redirectUri = `${appUrl}/api/social/meta/callback`

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${clientIdVal}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
  )
  const tokenData = await tokenRes.json()

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&error=meta_token_failed`)
  }

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientIdVal}&client_secret=${clientSecret}&fb_exchange_token=${tokenData.access_token}`
  )
  const llData = await llRes.json()
  const longToken = llData.access_token || tokenData.access_token

  // Get user info
  const meRes = await fetch(`https://graph.facebook.com/v22.0/me?fields=id,name,picture&access_token=${longToken}`)
  const meData = await meRes.json()

  // Get pages managed by user
  const pagesRes = await fetch(`https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}&fields=id,name,access_token,picture,fan_count,instagram_business_account`)
  const pagesData = await pagesRes.json()
  const pages = pagesData.data || []

  // Save each page as a connected account
  for (const page of pages) {
    const pageToken = page.access_token
    const igAccountId = page.instagram_business_account?.id

    // Save Facebook page
    await supabase.from('social_connected_accounts').upsert({
      user_id: userId,
      client_id: clientId && clientId !== 'null' ? clientId : null,
      platform: 'facebook',
      platform_user_id: meData.id,
      platform_username: meData.name,
      platform_page_id: page.id,
      platform_page_name: page.name,
      access_token: pageToken,
      token_expires_at: llData.expires_in ? new Date(Date.now() + llData.expires_in * 1000).toISOString() : null,
      avatar_url: page.picture?.data?.url || meData.picture?.data?.url,
      followers_count: page.fan_count || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'platform,platform_page_id,user_id' })

    // Save Instagram account if linked
    if (igAccountId) {
      const igRes = await fetch(`https://graph.facebook.com/v22.0/${igAccountId}?fields=id,name,username,followers_count,profile_picture_url&access_token=${pageToken}`)
      const igData = await igRes.json()

      await supabase.from('social_connected_accounts').upsert({
        user_id: userId,
        client_id: clientId && clientId !== 'null' ? clientId : null,
        platform: 'instagram',
        platform_user_id: meData.id,
        platform_username: igData.username || igData.name,
        platform_page_id: page.id,
        platform_page_name: page.name,
        ig_user_id: igAccountId,
        access_token: pageToken,
        token_expires_at: llData.expires_in ? new Date(Date.now() + llData.expires_in * 1000).toISOString() : null,
        avatar_url: igData.profile_picture_url,
        followers_count: igData.followers_count || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform,ig_user_id,user_id' })
    }
  }

  // If no pages, save user-level account
  if (pages.length === 0) {
    await supabase.from('social_connected_accounts').upsert({
      user_id: userId,
      client_id: clientId && clientId !== 'null' ? clientId : null,
      platform: 'facebook',
      platform_user_id: meData.id,
      platform_username: meData.name,
      access_token: longToken,
      avatar_url: meData.picture?.data?.url,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'platform,platform_user_id,user_id' })
  }

  return NextResponse.redirect(`${appUrl}/dashboard/community?tab=connexions&success=meta_connected`)
}
