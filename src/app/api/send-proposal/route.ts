import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { to, proposalTitle, proposalPrice, message, pdfUrl } = await req.json()

  if (!to || !proposalTitle) {
    return NextResponse.json({ success: false, error: 'Paramètres manquants' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact@popytech.com'
  const senderName = process.env.BREVO_SENDER_NAME || 'Popytech'

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'BREVO_API_KEY non configurée' }, { status: 500 })
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 32px 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Proposition Commerciale</h1>
        <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">${senderName}</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Proposition</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e293b;">${proposalTitle}</p>
          <p style="margin: 8px 0 0 0; font-size: 22px; font-weight: bold; color: #16a34a;">${Number(proposalPrice).toLocaleString('fr-FR')} GNF</p>
        </div>
        <div style="white-space: pre-wrap; font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 20px;">${message?.replace(/\n/g, '<br>')}</div>
        ${pdfUrl ? `<a href="${pdfUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Télécharger la proposition PDF</a>` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Cet email a été envoyé par ${senderName} · <a href="mailto:${senderEmail}" style="color: #2563eb;">${senderEmail}</a></p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject: `Proposition commerciale : ${proposalTitle}`,
        htmlContent,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.message || 'Erreur Brevo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: data.messageId })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
