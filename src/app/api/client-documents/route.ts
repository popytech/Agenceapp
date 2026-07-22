import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/client-documents?client_id=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('client_documents')
    .select('*, uploaded_by_profile:profiles(full_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/client-documents — multipart/form-data
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const clientId = formData.get('client_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const category = (formData.get('category') as string) || 'autre'
  const uploadedBy = formData.get('uploaded_by') as string | null

  if (!file || !clientId || !title) {
    return NextResponse.json({ error: 'Champs manquants : file, client_id, title' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = file.name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (É→E, etc.)
    .replace(/[^a-zA-Z0-9._-]/g, '_')                 // replace spaces & special chars
    .replace(/_+/g, '_')                               // collapse consecutive underscores
  const fileName = `${clientId}/${Date.now()}_${safeName}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Normalize MIME types (browsers sometimes send non-standard types)
  const mimeMap: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'application/x-pdf': 'application/pdf',
    'application/msword': 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  const contentType = mimeMap[file.type] || file.type || 'application/octet-stream'

  const { error: storageError } = await supabase.storage
    .from('client-documents')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (storageError) return NextResponse.json({ error: `Storage: ${storageError.message}` }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('client-documents')
    .getPublicUrl(fileName)

  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      client_id: clientId,
      title,
      description: description || null,
      category,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      uploaded_by: uploadedBy || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Envoyer email de notification au client
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('email, contact_name, company_name')
      .eq('id', clientId)
      .single()

    if (client?.email) {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal`
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'POPY TECH',
            email: process.env.BREVO_SENDER_EMAIL || 'contact@popytech.com',
          },
          to: [{ email: client.email, name: client.contact_name || client.company_name }],
          subject: `Nouveau document disponible sur votre espace client`,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px 24px;border-radius:16px">
              <div style="text-align:center;margin-bottom:24px">
                <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0">Nouveau document disponible</h1>
              </div>
              <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0">
                <p style="margin:0 0 8px;color:#374151">Bonjour <strong>${client.contact_name || client.company_name}</strong>,</p>
                <p style="margin:0 0 16px;color:#64748b;font-size:14px">POPY TECH vient de partager un nouveau document avec vous :</p>
                <div style="background:#f1f5f9;border-radius:8px;padding:14px;margin-bottom:16px">
                  <p style="margin:0 0 4px;font-weight:600;color:#0f172a;font-size:15px">${title}</p>
                  ${description ? `<p style="margin:0;color:#64748b;font-size:13px">${description}</p>` : ''}
                </div>
                <a href="${portalUrl}" style="display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
                  Acceder a mon espace client
                </a>
              </div>
              <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0">
                Connectez-vous avec : <strong>${client.email}</strong>
              </p>
            </div>
          `,
        }),
      })
    }
  } catch (_) {
    // Ne pas bloquer si l'email échoue
  }

  return NextResponse.json({ data })
}
