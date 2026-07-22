import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action"); // "accept" | "refuse"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agenceapp.vercel.app";

  if (!token || !action) {
    return NextResponse.redirect(`${appUrl}/offre-confirmee?error=invalid`);
  }

  const { data: offer } = await supabase
    .from("offers")
    .select("id, prospect_id, accepted_at, refused_at")
    .eq("tracking_token", token)
    .single();

  if (!offer) {
    return NextResponse.redirect(`${appUrl}/offre-confirmee?error=notfound`);
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    await supabase.from("offers").update({
      accepted_at: now,
      status: "Acceptée",
      pipeline_stage: "Offre acceptée",
      updated_at: now,
    }).eq("id", offer.id);

    await supabase.from("prospects").update({
      status: "Converti",
      heat: "Très chaud",
      temperature_score: 100,
    }).eq("id", offer.prospect_id);

    await supabase.from("email_logs").insert({
      offer_id: offer.id,
      prospect_id: offer.prospect_id,
      tracking_token: token,
      event: "accepted",
    });

    return NextResponse.redirect(`${appUrl}/offre-confirmee?token=${token}&response=accepted`);
  }

  if (action === "refuse") {
    await supabase.from("offers").update({
      refused_at: now,
      status: "Refusée",
      pipeline_stage: "Offre refusée",
      updated_at: now,
    }).eq("id", offer.id);

    await supabase.from("prospects").update({ status: "Perdu" }).eq("id", offer.prospect_id);

    await supabase.from("email_logs").insert({
      offer_id: offer.id,
      prospect_id: offer.prospect_id,
      tracking_token: token,
      event: "refused",
    });

    return NextResponse.redirect(`${appUrl}/offre-confirmee?token=${token}&response=refused`);
  }

  return NextResponse.redirect(`${appUrl}/offre-confirmee?token=${token}`);
}
