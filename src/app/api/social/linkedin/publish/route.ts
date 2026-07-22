import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/social/linkedin/publish
// Body: { accountId, content, mediaUrl?, publicationId? }
export async function POST(req: NextRequest) {
  const { accountId, content, mediaUrl, publicationId } = await req.json()

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
  const authorUrn = account.platform_page_id // urn:li:person:xxx or urn:li:organization:xxx

  let postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: content,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  // If media: add image content block (URL only, no upload for now)
  if (mediaUrl) {
    postBody.content = {
      article: {
        source: mediaUrl,
        title: content.slice(0, 100),
        description: '',
      },
    }
  }

  const publishRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  })

  if (!publishRes.ok) {
    const errData = await publishRes.json().catch(() => ({}))
    return NextResponse.json({ error: 'LinkedIn publish failed', detail: errData }, { status: 500 })
  }

  // LinkedIn returns post URN in x-restli-id header
  const postUrn = publishRes.headers.get('x-restli-id') || ''
  const postUrl = postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : ''

  if (publicationId) {
    await supabase.from('publications').update({
      status: 'publie',
      published_at: new Date().toISOString(),
      proof_link: postUrl || null,
    }).eq('id', publicationId)
  }

  return NextResponse.json({ success: true, postUrn, postUrl })
}
