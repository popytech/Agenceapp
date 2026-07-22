import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/social/tiktok/publish
// Body: { accountId, content, videoUrl, publicationId? }
// Note: TikTok requires a video URL or file upload. Text-only not supported.
export async function POST(req: NextRequest) {
  const { accountId, content, videoUrl, publicationId } = await req.json()

  if (!accountId || !videoUrl) {
    return NextResponse.json({ error: 'accountId and videoUrl required for TikTok' }, { status: 400 })
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

  // Query creator info (required by TikTok UX guidelines)
  await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  // Initialize post via PULL_FROM_URL
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: content.slice(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        is_aigc: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  })

  const initData = await initRes.json()

  if (!initData.data?.publish_id) {
    return NextResponse.json({ error: 'TikTok init failed', detail: initData }, { status: 500 })
  }

  const publishId = initData.data.publish_id

  if (publicationId) {
    await supabase.from('publications').update({
      status: 'publie',
      published_at: new Date().toISOString(),
    }).eq('id', publicationId)
  }

  return NextResponse.json({ success: true, publishId, note: 'Video is being processed by TikTok' })
}
