import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/social/meta/stats
// Body: { publicationId, accountId }
export async function POST(req: NextRequest) {
  const { publicationId, accountId } = await req.json()

  const { data: account } = await supabase
    .from('social_connected_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  const { data: pub } = await supabase
    .from('publications')
    .select('*')
    .eq('id', publicationId)
    .single()

  if (!account || !pub?.proof_link) {
    return NextResponse.json({ error: 'Missing account or post link' }, { status: 400 })
  }

  const token = account.access_token

  // Extract post ID from proof_link
  const postId = pub.proof_link.split('/').filter(Boolean).pop()

  let stats = { reach: 0, likes: 0, comments: 0, shares: 0 }

  if (pub.platform === 'instagram' && account.ig_user_id) {
    // Instagram insights
    const insightsRes = await fetch(
      `https://graph.facebook.com/v22.0/${postId}/insights?metric=reach,likes,comments,shares&access_token=${token}`
    )
    const insightsData = await insightsRes.json()

    if (insightsData.data) {
      for (const metric of insightsData.data) {
        if (metric.name === 'reach') stats.reach = metric.values?.[0]?.value || 0
        if (metric.name === 'likes') stats.likes = metric.values?.[0]?.value || 0
        if (metric.name === 'comments') stats.comments = metric.values?.[0]?.value || 0
        if (metric.name === 'shares') stats.shares = metric.values?.[0]?.value || 0
      }
    }
  } else if (pub.platform === 'facebook') {
    // Facebook post insights
    const insightsRes = await fetch(
      `https://graph.facebook.com/v22.0/${postId}/insights/post_impressions,post_reactions_by_type_total?access_token=${token}`
    )
    const insightsData = await insightsRes.json()

    if (insightsData.data) {
      for (const metric of insightsData.data) {
        if (metric.name === 'post_impressions') stats.reach = metric.values?.[0]?.value || 0
      }
    }

    // Get likes/comments/shares from post object
    const postRes = await fetch(
      `https://graph.facebook.com/v22.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${token}`
    )
    const postData = await postRes.json()
    stats.likes = postData.likes?.summary?.total_count || 0
    stats.comments = postData.comments?.summary?.total_count || 0
    stats.shares = postData.shares?.count || 0
  }

  // Update publication stats
  await supabase.from('publications').update(stats).eq('id', publicationId)

  return NextResponse.json({ success: true, stats })
}
