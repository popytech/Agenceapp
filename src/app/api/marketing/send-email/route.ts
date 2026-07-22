import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendViaBrevo(to: string, toName: string, subject: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Popytech",
        email: process.env.BREVO_SENDER_EMAIL || "contact@popytech.com",
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
  return res.json();
}

function buildEmailHtml(data: {
  prospect_name: string;
  company?: string;
  service: string;
  price: number;
  message: string;
  sender_name: string;
  agency_name: string;
  tracking_token: string;
  app_url: string;
}): string {
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " GNF";
  const trackingPixelUrl = `${data.app_url}/api/marketing/track?token=${data.tracking_token}&event=open`;
  const trackLink = `${data.app_url}/api/marketing/track?token=${data.tracking_token}&event=click`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Offre de service — ${data.agency_name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0066FF 0%,#6A00FF 100%);padding:40px 48px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${data.agency_name}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Proposition commerciale</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px;">
            <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
              Bonjour <strong style="color:#111827;">${data.prospect_name}${data.company ? ` de ${data.company}` : ""}</strong>,
            </p>

            <p style="margin:0 0 32px;font-size:15px;color:#4B5563;line-height:1.7;">${data.message.replace(/\n/g, "<br/>")}</p>

            <!-- Offer card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:12px;margin-bottom:32px;">
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:1px;">Service proposé</p>
                  <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">${data.service}</p>
                  <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;" />
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Investissement</p>
                  <p style="margin:0;font-size:32px;font-weight:800;color:#0066FF;">${fmt(data.price)}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${trackLink}" style="display:inline-block;background:linear-gradient(135deg,#0066FF,#6A00FF);color:#ffffff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;">
                    Voir les détails de l'offre →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6;">
              Pour toute question, n'hésitez pas à nous contacter directement.<br/>
              Nous restons disponibles pour en discuter.
            </p>
          </td>
        </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:24px 48px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#6B7280;">Envoyé par <strong>${data.sender_name}</strong> — ${data.agency_name}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">
                <a href="mailto:contact@popytech.com" style="color:#6366F1;text-decoration:none;">contact@popytech.com</a>
                &nbsp;·&nbsp;
                <a href="tel:+224629371360" style="color:#9CA3AF;text-decoration:none;">+224 629 37 13 60</a>
              </p>
              <!-- Icônes réseaux sociaux -->
                <table cellpadding="0" cellspacing="0" style="margin:14px auto 0;">
                  <tr>
                    <td style="padding:0 5px;">
                      <a href="https://popytech.com" target="_blank" style="display:inline-block;width:36px;height:36px;background:#e0e7ff;border-radius:8px;text-align:center;line-height:36px;text-decoration:none;font-size:16px;" title="Site web">
                        🌐
                      </a>
                    </td>
                    <td style="padding:0 5px;">
                      <a href="https://www.facebook.com/popytech" target="_blank" style="display:inline-block;width:36px;height:36px;background:#dbeafe;border-radius:8px;text-align:center;line-height:36px;text-decoration:none;font-size:16px;" title="Facebook">
                        <span style="font-weight:800;color:#1877F2;font-family:Arial,sans-serif;font-size:15px;">f</span>
                      </a>
                    </td>
                    <td style="padding:0 5px;">
                      <a href="https://www.linkedin.com/company/popytech" target="_blank" style="display:inline-block;width:36px;height:36px;background:#dbeafe;border-radius:8px;text-align:center;line-height:36px;text-decoration:none;" title="LinkedIn">
                        <span style="font-weight:800;color:#0077B5;font-family:Arial,sans-serif;font-size:13px;">in</span>
                      </a>
                    </td>
                    <td style="padding:0 5px;">
                      <a href="https://wa.me/224629371360" target="_blank" style="display:inline-block;width:36px;height:36px;background:#dcfce7;border-radius:8px;text-align:center;line-height:36px;text-decoration:none;font-size:16px;" title="WhatsApp">
                        💬
                      </a>
                    </td>
                  </tr>
                </table>
              <p style="margin:12px 0 0;font-size:11px;color:#D1D5DB;">Vous recevez cet email car vous avez été contacté par notre équipe commerciale.</p>
            </td>
          </tr>

      </table>
    </td></tr>
  </table>

  <!-- Tracking pixel -->
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      offer_id,
      prospect_id,
      prospect_name,
      prospect_email,
      company,
      service,
      price,
      message,
      sender_name = "L'équipe commerciale",
      agency_name = "Popytech",
    } = body;

    if (!prospect_email) {
      return NextResponse.json({ error: "Email du prospect manquant" }, { status: 400 });
    }
    if (!service || !price) {
      return NextResponse.json({ error: "Service et prix requis" }, { status: 400 });
    }

    const tracking_token = `${offer_id || prospect_id}_${Date.now()}`;
    const app_url = process.env.NEXT_PUBLIC_APP_URL || "https://popytech.com";

    const html = buildEmailHtml({
      prospect_name,
      company,
      service,
      price: Number(price),
      message: message || `Veuillez trouver ci-dessous notre proposition pour le service : ${service}.`,
      sender_name,
      agency_name,
      tracking_token,
      app_url,
    });

    const subject = `Proposition commerciale — ${service}`;

    // Envoi via Brevo API HTTP (pas de SMTP)
    await sendViaBrevo(prospect_email, prospect_name, subject, html);

    // Log l'envoi
    await supabase.from("email_logs").insert({
      offer_id: offer_id || null,
      prospect_id: prospect_id || null,
      event: "sent",
      tracking_token,
      recipient_email: prospect_email,
      subject,
    });

    // Met à jour l'offre
    if (offer_id) {
      await supabase.from("offers").update({
        tracking_token,
        status: "Envoyée",
        pipeline_stage: "Offre envoyée",
        sent_at: new Date().toISOString(),
      }).eq("id", offer_id);
    }

    // Met à jour le statut prospect
    if (prospect_id) {
      await supabase.from("prospects").update({ status: "Contacté" })
        .eq("id", prospect_id)
        .eq("status", "Nouveau");
    }

    return NextResponse.json({ ok: true, tracking_token });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("send-email error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
