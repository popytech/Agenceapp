import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const event = searchParams.get("event") || "open";

  if (!token) {
    return new NextResponse(null, { status: 204 });
  }

  // Trouver l'offre liée au token
  const { data: offer } = await supabase
    .from("offers")
    .select("id, prospect_id, open_count, click_count, opened_at, clicked_at")
    .eq("tracking_token", token)
    .single();

  if (offer) {
    if (event === "open") {
      const updates: Record<string, unknown> = {
        open_count: (offer.open_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (!offer.opened_at) {
        updates.opened_at = new Date().toISOString();
        updates.status = "Ouverte";
        updates.pipeline_stage = "Offre ouverte";

        // Score +10 au prospect
        const { data: prospect } = await supabase
          .from("prospects")
          .select("temperature_score")
          .eq("id", offer.prospect_id)
          .single();

        if (prospect) {
          const newScore = Math.min(100, (prospect.temperature_score || 0) + 10);
          await supabase.from("prospects").update({
            temperature_score: newScore,
            heat: newScore >= 80 ? "Très chaud" : newScore >= 50 ? "Chaud" : newScore >= 20 ? "Tiède" : "Froid",
          }).eq("id", offer.prospect_id);
        }
      } else {
        // 3 ouvertures → Chaud
        if ((offer.open_count || 0) + 1 >= 3) {
          updates.pipeline_stage = "Offre ouverte";
          const { data: prospect } = await supabase
            .from("prospects")
            .select("temperature_score")
            .eq("id", offer.prospect_id)
            .single();
          if (prospect) {
            const newScore = Math.min(100, (prospect.temperature_score || 0) + 20);
            await supabase.from("prospects").update({
              temperature_score: newScore,
              heat: newScore >= 80 ? "Très chaud" : newScore >= 50 ? "Chaud" : newScore >= 20 ? "Tiède" : "Froid",
            }).eq("id", offer.prospect_id);
          }
        }
      }
      await supabase.from("offers").update(updates).eq("id", offer.id);
      await supabase.from("email_logs").insert({
        offer_id: offer.id,
        prospect_id: offer.prospect_id,
        tracking_token: token,
        event: "opened",
      });
    }

    if (event === "click") {
      const updates: Record<string, unknown> = {
        click_count: (offer.click_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (!offer.clicked_at) {
        updates.clicked_at = new Date().toISOString();

        // Score +30 au prospect
        const { data: prospect } = await supabase
          .from("prospects")
          .select("temperature_score")
          .eq("id", offer.prospect_id)
          .single();
        if (prospect) {
          const newScore = Math.min(100, (prospect.temperature_score || 0) + 30);
          await supabase.from("prospects").update({
            temperature_score: newScore,
            heat: newScore >= 80 ? "Très chaud" : newScore >= 50 ? "Chaud" : newScore >= 20 ? "Tiède" : "Froid",
            status: newScore >= 80 ? "Intéressé" : undefined,
          }).eq("id", offer.prospect_id);
        }
      }
      await supabase.from("offers").update(updates).eq("id", offer.id);
      await supabase.from("email_logs").insert({
        offer_id: offer.id,
        prospect_id: offer.prospect_id,
        tracking_token: token,
        event: "clicked",
      });

      // Rediriger vers une page de confirmation
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://orchids.app"}/offre-confirmee?token=${token}`
      );
    }
  }

  // Pour le pixel de tracking (open), retourner une image 1x1 transparente
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
