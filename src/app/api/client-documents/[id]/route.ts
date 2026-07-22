import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/client-documents/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: doc } = await supabase
    .from('client_documents')
    .select('file_url, client_id')
    .eq('id', id)
    .single()

  if (doc?.file_url) {
    // Extraire le path depuis l'URL publique
    const url = new URL(doc.file_url)
    const pathParts = url.pathname.split('/client-documents/')
    if (pathParts[1]) {
      await supabase.storage.from('client-documents').remove([pathParts[1]])
    }
  }

  const { error } = await supabase.from('client_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
