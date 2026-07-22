import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmailViaBrevo(to: string, toName: string, subject: string, html: string) {
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
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json();
}

function buildEmailHtml(params: {
  prospect_name: string;
  company?: string;
  followup_type: string;
  message: string;
  service?: string;
  price?: number;
  tracking_token?: string;
}) {
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " GNF";
  const app_url = process.env.NEXT_PUBLIC_APP_URL || "https://agenceapp.vercel.app";
  const offerLink = params.tracking_token
    ? `${app_url}/offre-confirmee?token=${params.tracking_token}`
    : null;

  const socialLinks = `
    <table cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
      <tr>
        <td style="padding: 0 6px;">
          <a href="https://popytech.com" style="display:inline-block;width:34px;height:34px;background:#e0e7ff;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;font-size:16px;">🌐</a>
        </td>
        <td style="padding: 0 6px;">
          <a href="https://www.facebook.com/popytech" style="display:inline-block;width:34px;height:34px;background:#dbeafe;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;">
            <span style="font-weight:800;color:#1877F2;font-family:Arial,sans-serif;font-size:15px;">f</span>
          </a>
        </td>
        <td style="padding: 0 6px;">
          <a href="https://www.linkedin.com/company/popytech" style="display:inline-block;width:34px;height:34px;background:#dbeafe;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;">
            <span style="font-weight:800;color:#0077B5;font-family:Arial,sans-serif;font-size:13px;">in</span>
          </a>
        </td>
        <td style="padding: 0 6px;">
          <a href="https://wa.me/224629371360" style="display:inline-block;width:34px;height:34px;background:#dcfce7;border-radius:8px;text-align:center;line-height:34px;text-decoration:none;font-size:16px;">💬</a>
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#0066FF 0%,#6A00FF 100%);padding:36px 48px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Popy Tech Agency</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Agence de communication & marketing digital</p>
</td></tr>
<tr><td style="padding:40px 48px;">
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
    Bonjour <strong>${params.prospect_name}${params.company ? ` de ${params.company}` : ""}</strong>,
  </p>
  <p style="margin:0 0 28px;font-size:15px;color:#4B5563;line-height:1.7;">${params.message.replace(/\n/g, "<br/>")}</p>
  ${params.service && params.price ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:12px;margin-bottom:28px;">
    <tr><td style="padding:22px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;">Rappel de l'offre</p>
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">${params.service}</p>
      <p style="margin:0;font-size:26px;font-weight:800;color:#0066FF;">${fmt(params.price)}</p>
    </td></tr>
  </table>` : ""}
  ${offerLink ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td align="center">
      <a href="${offerLink}" style="display:inline-block;background:linear-gradient(135deg,#0066FF,#6A00FF);color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:50px;text-decoration:none;">Voir l'offre complète →</a>
    </td></tr>
  </table>` : ""}
  <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">N'hésitez pas à nous contacter pour toute question.</p>
</td></tr>
<tr><td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:24px 48px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#6B7280;"><strong>Popy Tech Agency</strong></p>
  <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">
    <a href="mailto:contact@popytech.com" style="color:#6366F1;text-decoration:none;">contact@popytech.com</a>
    &nbsp;·&nbsp;
    <a href="tel:+224629371360" style="color:#9CA3AF;text-decoration:none;">+224 629 37 13 60</a>
  </p>
  ${socialLinks}
  <p style="margin:12px 0 0;font-size:11px;color:#D1D5DB;">Vous recevez cet email car vous avez été contacté par notre équipe commerciale.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// Ce cron est appelé automatiquement toutes les heures (ou via un service externe)
// Route: GET /api/cron/process-followups
export async function GET(req: NextRequest) {
  // Sécurité basique : vérifier une clé secrète
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "popytech-cron-2024";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 1. Récupérer toutes les relances "pending" dont la date est passée
  const { data: pending, error } = await supabase
    .from("scheduled_followups")
    .select(`
      *,
      prospect:prospects(id, name, company, email, phone, whatsapp),
      offer:offers(id, service, price, tracking_token)
    `)
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const sf of pending) {
    const prospect = sf.prospect as { id: string; name: string; company?: string; email?: string; phone?: string; whatsapp?: string } | null;
    const offer = sf.offer as { id: string; service: string; price: number; tracking_token?: string } | null;

    try {
      if (sf.channel === "Email") {
        if (!prospect?.email) throw new Error("Email prospect manquant");

        const message = sf.message || `Bonjour ${prospect.name},\n\nNous revenons vers vous concernant notre offre pour "${offer?.service || "nos services"}".\n\nCordialement,\nL'équipe Popy Tech`;

        const html = buildEmailHtml({
          prospect_name: prospect.name,
          company: prospect.company,
          followup_type: sf.followup_type,
          message,
          service: offer?.service,
          price: offer?.price,
          tracking_token: offer?.tracking_token,
        });

        await sendEmailViaBrevo(
          prospect.email,
          prospect.name,
          `${sf.followup_type} — ${offer?.service || "Notre proposition"}`,
          html
        );

        // Enregistrer dans followups
        await supabase.from("followups").insert({
          offer_id: sf.offer_id,
          prospect_id: sf.prospect_id,
          type: sf.followup_type,
          channel: "Email",
          message,
          responded: false,
          date: now,
        });

        // Log activité
        await supabase.from("marketing_activities").insert({
          type: "followup_done",
          description: `[Auto] Relance email envoyée à ${prospect.name} — ${sf.followup_type}`,
          prospect_id: sf.prospect_id,
          offer_id: sf.offer_id,
        });

      } else if (sf.channel === "WhatsApp") {
        // WhatsApp : on crée le followup, l'utilisateur verra une notification
        const message = sf.message || `Bonjour ${prospect?.name || ""},\n\nNous revenons vers vous concernant notre offre pour "${offer?.service || "nos services"}".\n\nCordialement,\nL'équipe Popy Tech`;

        await supabase.from("followups").insert({
          offer_id: sf.offer_id,
          prospect_id: sf.prospect_id,
          type: sf.followup_type,
          channel: "WhatsApp",
          message,
          responded: false,
          date: now,
        });

        await supabase.from("marketing_activities").insert({
          type: "followup_done",
          description: `[Auto] Relance WhatsApp programmée pour ${prospect?.name || "prospect"} — ${sf.followup_type}`,
          prospect_id: sf.prospect_id,
          offer_id: sf.offer_id,
        });
      }

      // Marquer comme envoyé
      await supabase.from("scheduled_followups").update({
        status: "sent",
        sent_at: now,
        updated_at: now,
      }).eq("id", sf.id);

      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`Erreur relance ${sf.id}:`, errMsg);

      await supabase.from("scheduled_followups").update({
        status: "failed",
        error: errMsg,
        updated_at: now,
      }).eq("id", sf.id);

      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed, failed, total: pending.length });
}
