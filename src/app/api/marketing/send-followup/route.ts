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

function buildFollowupHtml(data: {
  prospect_name: string;
  company?: string;
  followup_type: string;
  message: string;
  service?: string;
  price?: number;
  tracking_token?: string;
  app_url: string;
}): string {
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " GNF";
  const offerLink = data.tracking_token
    ? `${data.app_url}/offre-confirmee?token=${data.tracking_token}`
    : null;

    const socialLinks = `
      <table cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
        <tr>
          <td style="padding: 0 6px;">
            <a href="https://popytech.com" target="_blank" style="display:inline-block;width:34px;height:34px;background:#e0e7ff;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;font-size:16px;" title="Site web">
              🌐
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://www.facebook.com/popytech" target="_blank" style="display:inline-block;width:34px;height:34px;background:#dbeafe;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;" title="Facebook">
              <span style="font-weight:800;color:#1877F2;font-family:Arial,sans-serif;font-size:15px;">f</span>
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://www.linkedin.com/company/popytech" target="_blank" style="display:inline-block;width:34px;height:34px;background:#dbeafe;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;" title="LinkedIn">
              <span style="font-weight:800;color:#0077B5;font-family:Arial,sans-serif;font-size:13px;">in</span>
            </a>
          </td>
          <td style="padding: 0 6px;">
            <a href="https://wa.me/224629371360" target="_blank" style="display:inline-block;width:34px;height:34px;background:#dcfce7;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;font-size:16px;" title="WhatsApp">
              💬
            </a>
          </td>
        </tr>
      </table>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Relance — Popy Tech</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0066FF 0%,#6A00FF 100%);padding:36px 48px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Popy Tech Agency</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Agence de communication & marketing digital</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:40px 48px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Bonjour <strong style="color:#111827;">${data.prospect_name}${data.company ? ` de ${data.company}` : ""}</strong>,
            </p>

            <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.7;">${data.message.replace(/\n/g, "<br/>")}</p>

            ${data.service && data.price ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:22px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:1px;">Rappel de l'offre</p>
                  <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">${data.service}</p>
                  <p style="margin:0;font-size:26px;font-weight:800;color:#0066FF;">${fmt(data.price)}</p>
                </td>
              </tr>
            </table>` : ""}

            ${offerLink ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${offerLink}" style="display:inline-block;background:linear-gradient(135deg,#0066FF,#6A00FF);color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:50px;text-decoration:none;">
                    Voir l'offre complète →
                  </a>
                </td>
              </tr>
            </table>` : ""}

            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
              N'hésitez pas à nous contacter pour toute question.<br/>
              Nous restons disponibles.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:24px 48px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#6B7280;"><strong>Popy Tech Agency</strong></p>
            <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">
              <a href="mailto:contact@popytech.com" style="color:#6366F1;text-decoration:none;">contact@popytech.com</a>
              &nbsp;·&nbsp;
              <a href="tel:+224629371360" style="color:#9CA3AF;text-decoration:none;">+224 629 37 13 60</a>
            </p>
            ${socialLinks}
            <p style="margin:12px 0 0;font-size:11px;color:#D1D5DB;">Vous recevez cet email car vous avez été contacté par notre équipe commerciale.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      followup_id,
      offer_id,
      prospect_id,
      prospect_name,
      prospect_email,
      company,
      followup_type,
      message,
      service,
      price,
      tracking_token,
    } = body;

    if (!prospect_email) {
      return NextResponse.json({ error: "Email du prospect manquant" }, { status: 400 });
    }

    const app_url = process.env.NEXT_PUBLIC_APP_URL || "https://agenceapp.vercel.app";
    const subject = `${followup_type} — ${service || "Notre proposition"}`;

    const html = buildFollowupHtml({
      prospect_name,
      company,
      followup_type,
      message: message || `Suite à notre précédente proposition, nous revenons vers vous pour faire le point.`,
      service,
      price: price ? Number(price) : undefined,
      tracking_token,
      app_url,
    });

    await sendViaBrevo(prospect_email, prospect_name, subject, html);

    // Log email
    await supabase.from("email_logs").insert({
      offer_id: offer_id || null,
      prospect_id: prospect_id || null,
      event: "followup_sent",
      tracking_token: tracking_token || null,
      recipient_email: prospect_email,
      subject,
    });

    // Marquer le followup comme envoyé
    if (followup_id) {
      await supabase.from("followups").update({ sent_at: new Date().toISOString() }).eq("id", followup_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("send-followup error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
