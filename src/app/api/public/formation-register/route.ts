import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const { training_id, session_id, student_name, student_email, student_phone, student_company, custom_answers } = body;

  if (!training_id || !student_name?.trim() || !EMAIL_RE.test(student_email || "")) {
    return NextResponse.json({ error: "Nom et email valides requis" }, { status: 400 });
  }

  const { data: training } = await supabase
    .from("trainings")
    .select("id, price, is_published")
    .eq("id", training_id)
    .single();
  if (!training || !training.is_published) {
    return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
  }

  if (session_id) {
    const { data: session } = await supabase
      .from("training_sessions")
      .select("id, training_id")
      .eq("id", session_id)
      .eq("training_id", training_id)
      .single();
    if (!session) return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const { count } = await supabase.from("formation_registrations").select("id", { count: "exact", head: true });
  const registration_number = `INS-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("formation_registrations")
    .insert({
      training_id,
      session_id: session_id || null,
      student_name: student_name.trim(),
      student_email: student_email.trim(),
      student_phone: student_phone || null,
      student_company: student_company || null,
      amount_due: training.price || 0,
      amount_paid: 0,
      payment_status: "pending",
      registration_status: "confirmed",
      registration_number,
      custom_answers: custom_answers || null,
    })
    .select("id, registration_number")
    .single();

  if (error) return NextResponse.json({ error: "Inscription impossible, réessayez." }, { status: 500 });

  return NextResponse.json({ ok: true, registration_number: data.registration_number });
}
