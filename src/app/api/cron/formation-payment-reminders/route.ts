import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REMINDER_INTERVAL_DAYS = 7;

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

function buildReminderHtml(params: {
  student_name: string;
  training_title: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
}) {
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " GNF";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:36px 48px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Popy Tech Academy</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Rappel de paiement</p>
</td></tr>
<tr><td style="padding:40px 48px;">
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
    Bonjour <strong>${params.student_name}</strong>,
  </p>
  <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.7;">
    Nous vous rappelons qu'il reste un solde à régler pour votre inscription à la formation <strong>${params.training_title}</strong>.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5FF;border:1px solid #E9D5FF;border-radius:12px;margin-bottom:28px;">
    <tr><td style="padding:22px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#7c3aed;text-transform:uppercase;">Montant total</p>
      <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#111827;">${fmt(params.amount_due)}</p>
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#16a34a;text-transform:uppercase;">Déjà payé</p>
      <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#111827;">${fmt(params.amount_paid)}</p>
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;">Reste à payer</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:#dc2626;">${fmt(params.remaining)}</p>
    </td></tr>
  </table>
  <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">Merci de régulariser votre paiement auprès de notre équipe Academy. N'hésitez pas à nous contacter pour toute question.</p>
</td></tr>
<tr><td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:24px 48px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#6B7280;"><strong>Popy Tech Agency</strong></p>
  <p style="margin:0;font-size:12px;color:#9CA3AF;">
    <a href="mailto:contact@popytech.com" style="color:#7c3aed;text-decoration:none;">contact@popytech.com</a>
    &nbsp;·&nbsp;
    <a href="tel:+224629371360" style="color:#9CA3AF;text-decoration:none;">+224 629 37 13 60</a>
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// Relance automatique des apprenants ayant un solde impaye sur une formation.
// Envoie un email (si student_email connu) et cree une notification interne,
// au plus une fois tous les REMINDER_INTERVAL_DAYS jours par inscription.
// Route: GET /api/cron/formation-payment-reminders (quotidien, voir vercel.json)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "popytech-cron-2024";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from("formation_registrations")
    .select("*, trainings(title)")
    .neq("payment_status", "paid")
    .neq("registration_status", "cancelled")
    .or(`last_reminder_at.is.null,last_reminder_at.lt.${cutoff}`)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 });
  }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["responsable_formations", "assistante_direction", "ceo", "super_admin"]);

  let reminded = 0;
  let failed = 0;

  for (const reg of pending) {
    const remaining = Number(reg.amount_due || 0) - Number(reg.amount_paid || 0);
    if (remaining <= 0) continue;
    const trainingTitle = (reg as { trainings?: { title?: string } }).trainings?.title || "votre formation";

    try {
      if (reg.student_email) {
        const html = buildReminderHtml({
          student_name: reg.student_name,
          training_title: trainingTitle,
          amount_due: Number(reg.amount_due || 0),
          amount_paid: Number(reg.amount_paid || 0),
          remaining,
        });
        await sendEmailViaBrevo(reg.student_email, reg.student_name, `Rappel de paiement — ${trainingTitle}`, html);
      }

      if (staff && staff.length > 0) {
        await supabase.from("notifications").insert(
          staff.map((s) => ({
            user_id: s.id,
            title: "Rappel de paiement envoyé",
            message: `${reg.student_name} (${trainingTitle}) — reste ${remaining.toLocaleString("fr-FR")} GNF`,
            type: "info",
            link: "/dashboard/formations",
          }))
        );
      }

      await supabase.from("formation_registrations").update({ last_reminder_at: now.toISOString() }).eq("id", reg.id);
      reminded++;
    } catch (err) {
      console.error(`Erreur rappel paiement ${reg.id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, reminded, failed, total: pending.length });
}
