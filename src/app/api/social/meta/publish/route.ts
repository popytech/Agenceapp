import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/social/meta/publish
// Body: { accountId, content, mediaUrl?, platform: 'facebook'|'instagram', publicationId? }
export async function POST(req: NextRequest) {
  const { accountId, content, mediaUrl, platform, publicationId } = await req.json()

  if (!accountId || !content) {
    return NextResponse.json({ error: 'accountId and content required' }, { status: 400 })
  }

  const { data: account, error: accErr } = await supabase
    .from('social_connected_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (accErr || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const token = account.access_token
  let postUrl = ''
  let postData: Record<string, string> = {}

  if (platform === 'instagram') {
    // Instagram 2-step publish
    const igId = account.ig_user_id
    if (!igId) return NextResponse.json({ error: 'No Instagram ID linked to this account' }, { status: 400 })

    // Step 1: Create container
    const containerBody: Record<string, string> = {
      caption: content,
      access_token: token,
    }
    if (mediaUrl) {
      containerBody.image_url = mediaUrl
    } else {
      // Text-only not supported on IG, use a placeholder or skip
      return NextResponse.json({ error: 'Instagram requires an image/video URL' }, { status: 400 })
    }

    const containerRes = await fetch(`https://graph.facebook.com/v22.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    })
    const containerData = await containerRes.json()

    if (!containerData.id) {
      return NextResponse.json({ error: 'Failed to create IG container', detail: containerData }, { status: 500 })
    }

    // Step 2: Publish container
    const publishRes = await fetch(`https://graph.facebook.com/v22.0/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
    })
    const publishData = await publishRes.json()

    if (!publishData.id) {
      return NextResponse.json({ error: 'Failed to publish IG post', detail: publishData }, { status: 500 })
    }

    postUrl = `https://www.instagram.com/p/${publishData.id}/`

    // Update publication status in DB
    if (publicationId) {
      await supabase.from('publications').update({
        status: 'publie',
        published_at: new Date().toISOString(),
        proof_link: postUrl,
      }).eq('id', publicationId)
    }

    return NextResponse.json({ success: true, postId: publishData.id, postUrl })

  } else if (platform === 'facebook') {
    // Facebook page post
    const pageId = account.platform_page_id
    if (!pageId) return NextResponse.json({ error: 'No Facebook Page ID' }, { status: 400 })

    postData = { message: content, access_token: token }
    if (mediaUrl) postData.link = mediaUrl

    const fbRes = await fetch(`https://graph.facebook.com/v22.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    })
    const fbData = await fbRes.json()

    if (!fbData.id) {
      return NextResponse.json({ error: 'Failed to publish Facebook post', detail: fbData }, { status: 500 })
    }

    postUrl = `https://www.facebook.com/${fbData.id}`

    if (publicationId) {
      await supabase.from('publications').update({
        status: 'publie',
        published_at: new Date().toISOString(),
        proof_link: postUrl,
      }).eq('id', publicationId)
    }

    return NextResponse.json({ success: true, postId: fbData.id, postUrl })
  }

  return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
}
