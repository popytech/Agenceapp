"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Target, Users, Send, RefreshCw, CheckCircle, TrendingUp, Flame,
  Plus, Search, Bell, BarChart2,
  Phone, Mail, MessageCircle, Building, Clock, AlertCircle,
  ArrowLeft, X, Eye, Zap, Activity,
  Award, FileText, Trash2,
  ThumbsUp, AlertTriangle, Inbox, DollarSign, Percent
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Prospect = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  service?: string;
  source?: string;
  status: string;
  heat: string;
  temperature_score: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

type Offer = {
  id: string;
  prospect_id: string;
  service: string;
  price: number;
  message?: string;
  details?: string;
  status: string;
  pipeline_stage: string;
  sent_at: string;
  opened_at?: string;
  open_count: number;
  clicked_at?: string;
  click_count: number;
  accepted_at?: string;
  refused_at?: string;
  tracking_token?: string;
  created_at: string;
  prospect?: Prospect;
};

type Followup = {
  id: string;
  offer_id?: string;
  prospect_id?: string;
  type: string;
  channel: string;
  message?: string;
  response?: string;
  responded: boolean;
  date: string;
  created_at: string;
};

type MarketingActivity = {
  id: string;
  type: string;
  description: string;
  prospect_id?: string;
  offer_id?: string;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICES = [
  // Web & Développement
  "Site web vitrine",
  "Site web dynamique",
  "Site web e-commerce",
  "Application mobile Android/iOS",
  "Application web sur-mesure",
  "Landing page / Page de vente",
  "Refonte de site web",
  "Tableau de bord / Dashboard",
  "Portail client",
  "Système de réservation en ligne",
  // Marketing Digital
  "SEO / Référencement naturel",
  "SEO local (Google My Business)",
  "Google Ads / Publicité en ligne",
  "Facebook & Instagram Ads",
  "Community Management",
  "Stratégie digitale",
  "Email marketing / Emailing",
  "Newsletters",
  "Campagne SMS marketing",
  "Gestion des réseaux sociaux",
  // Graphisme & Identité
  "Création de logo",
  "Identité visuelle complète",
  "Charte graphique",
  "Flyers / Affiches / Cartes de visite",
  "Pack communication (print + digital)",
  "Bannières publicitaires",
  "Mockup / Maquette produit",
  // Vidéo & Multimédia
  "Vidéo promotionnelle",
  "Motion design / Animation",
  "Montage vidéo",
  "Reportage photo/vidéo d'entreprise",
  "Publicité vidéo (Reels / TikTok Ads)",
  // Formation & Conseil
  "Formation en marketing digital",
  "Formation réseaux sociaux",
  "Formation création de site web",
  "Conseil en transformation digitale",
  "Audit digital complet",
  "Audit de site web",
  "Accompagnement stratégique",
  // ERP & Outils métier
  "Logiciel ERP sur-mesure",
  "CRM / Gestion clients",
  "Logiciel de gestion de facturation",
  "Logiciel RH / Paie",
  "Logiciel de caisse / POS",
  "Intégration API / CRM / ERP",
  // Technique & Infrastructure
  "Maintenance de site web",
  "Hébergement web",
  "Sécurité web / SSL",
  "Migration de site",
  "Nom de domaine",
  "Messagerie professionnelle",
];

const SOURCES = [
  "Manuel", "Recommandation", "LinkedIn", "Facebook", "Instagram",
  "Appel entrant", "Email entrant", "Salon/Événement",
];

const PROSPECT_STATUSES = ["Tous", "Nouveau", "Contacté", "Intéressé", "Sans réponse", "Converti", "Perdu", "Dormant"];

const PIPELINE_STAGES = [
  "Offre envoyée", "Offre ouverte", "Intéressé", "Négociation", "Acceptée", "Refusée", "Sans réponse",
];

const FOLLOWUP_TYPES = ["Relance 1", "Relance 2", "Relance 3", "Relance finale", "Appel", "WhatsApp", "Réunion"];
const CHANNELS = ["Email", "WhatsApp", "Téléphone", "LinkedIn", "En personne"];

const HEAT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  "Froid":      { bg: "bg-blue-500/10",   text: "text-blue-400",   label: "❄️ Froid" },
  "Tiède":      { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "🌤️ Tiède" },
  "Chaud":      { bg: "bg-orange-500/10", text: "text-orange-400", label: "🔥 Chaud" },
  "Très chaud": { bg: "bg-red-500/10",    text: "text-red-400",    label: "🚨 Très chaud" },
};

const STATUS_STYLE: Record<string, string> = {
  "Nouveau":      "bg-muted text-muted-foreground",
  "Contacté":     "bg-blue-500/10 text-blue-400",
  "Intéressé":    "bg-purple-500/10 text-purple-400",
  "Sans réponse": "bg-yellow-500/10 text-yellow-400",
  "Converti":     "bg-green-500/10 text-green-400",
  "Perdu":        "bg-red-500/10 text-red-400",
  "Dormant":      "bg-muted text-muted-foreground",
};

const PIPELINE_STYLE: Record<string, string> = {
  "Offre envoyée":  "bg-blue-500/10 text-blue-400",
  "Offre ouverte":  "bg-indigo-500/10 text-indigo-400",
  "Intéressé":      "bg-purple-500/10 text-purple-400",
  "Négociation":    "bg-orange-500/10 text-orange-400",
  "Acceptée":       "bg-green-500/10 text-green-400",
  "Refusée":        "bg-red-500/10 text-red-400",
  "Sans réponse":   "bg-yellow-500/10 text-yellow-400",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  prospect_added: <UserIcon />,
  offer_sent:     <Send className="w-4 h-4" />,
  offer_opened:   <Eye className="w-4 h-4" />,
  offer_accepted: <ThumbsUp className="w-4 h-4" />,
  offer_refused:  <X className="w-4 h-4" />,
  followup_done:  <RefreshCw className="w-4 h-4" />,
};

function UserIcon() { return <Users className="w-4 h-4" />; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("fr-FR") + " GNF";
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
const avatarGrad = (name: string) => {
  const g = ["from-blue-500 to-cyan-400", "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-400", "from-orange-500 to-amber-400", "from-pink-500 to-rose-400"];
  return g[name.charCodeAt(0) % g.length];
};
const timeAgo = (date: string) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "À l'instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)}min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;
  return `Il y a ${Math.floor(s / 86400)}j`;
};
const heatFromScore = (score: number): string => {
  if (score >= 80) return "Très chaud";
  if (score >= 50) return "Chaud";
  if (score >= 20) return "Tiède";
  return "Froid";
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState<"dashboard" | "prospects" | "offres" | "performance">("dashboard");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [activities, setActivities] = useState<MarketingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showEditProspect, setShowEditProspect] = useState(false);
  const [offerTarget, setOfferTarget] = useState<Prospect | null>(null);
  const [followupTarget, setFollowupTarget] = useState<Offer | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [heatFilter, setHeatFilter] = useState("Tous");

  const [pForm, setPForm] = useState({ name: "", company: "", email: "", phone: "", whatsapp: "", service: "", source: "Manuel", notes: "" });
  const [eForm, setEForm] = useState({ name: "", company: "", email: "", phone: "", whatsapp: "", service: "", source: "", notes: "" });
  const [oForm, setOForm] = useState({ service: "", price: "", message: "", details: "", sendEmail: false, emailPreview: false });
  const [fForm, setFForm] = useState({ type: "Relance 1", channel: "Email", message: "", response: "", responded: false });
  const [emailSending, setEmailSending] = useState(false);
  const [whatsappPreview, setWhatsappPreview] = useState<{ number: string; message: string; name: string } | null>(null);

  // Relances automatiques
  type ScheduledFollowup = {
    id: string;
    offer_id: string;
    prospect_id: string;
    channel: string;
    followup_type: string;
    message?: string;
    scheduled_at: string;
    sent_at?: string;
    status: string;
    error?: string;
    prospect?: Prospect;
    offer?: { id: string; service: string; price: number };
  };
  const [scheduledFollowups, setScheduledFollowups] = useState<ScheduledFollowup[]>([]);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

    const loadAll = useCallback(async () => {
      setLoading(true);
      const [p, o, f, a, sf] = await Promise.all([
        supabase.from("prospects").select("id,name,company,email,phone,whatsapp,service,source,status,heat,temperature_score,notes,created_at,updated_at").order("temperature_score", { ascending: false }).limit(500),
        supabase.from("offers").select("id,prospect_id,service,price,message,details,status,pipeline_stage,sent_at,opened_at,open_count,clicked_at,click_count,accepted_at,refused_at,tracking_token,created_at,prospect:prospects(id,name,company,email,phone,whatsapp)").order("created_at", { ascending: false }).limit(300),
        supabase.from("followups").select("id,offer_id,prospect_id,type,channel,message,response,responded,date,created_at").order("date", { ascending: false }).limit(300),
        supabase.from("marketing_activities").select("id,type,description,prospect_id,offer_id,created_at").order("created_at", { ascending: false }).limit(60),
        supabase.from("scheduled_followups").select("id,offer_id,prospect_id,channel,followup_type,message,scheduled_at,sent_at,status,error,prospect:prospects(id,name,company,email),offer:offers(id,service,price)").order("scheduled_at", { ascending: true }).limit(100),
      ]);
    if (p.data) setProspects(p.data);
    if (o.data) setOffers(o.data as unknown as Offer[]);
    if (f.data) setFollowups(f.data);
    if (a.data) setActivities(a.data);
    if (sf.data) setScheduledFollowups(sf.data as unknown as ScheduledFollowup[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function logActivity(type: string, description: string, prospect_id?: string, offer_id?: string) {
    await supabase.from("marketing_activities").insert({ type, description, prospect_id, offer_id });
    const { data } = await supabase.from("marketing_activities").select("*").order("created_at", { ascending: false }).limit(60);
    if (data) setActivities(data);
  }

  async function updateProspectScore(id: string, delta: number) {
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect) return;
    const newScore = Math.min(100, (prospect.temperature_score || 0) + delta);
    const newHeat = heatFromScore(newScore);
    await supabase.from("prospects").update({ temperature_score: newScore, heat: newHeat, updated_at: new Date().toISOString() }).eq("id", id);
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, temperature_score: newScore, heat: newHeat } : p));
    if (selectedProspect?.id === id) setSelectedProspect((p) => p ? { ...p, temperature_score: newScore, heat: newHeat } : p);
  }

  async function addProspect() {
    if (!pForm.name.trim()) return;
    const { data } = await supabase.from("prospects")
      .insert({ ...pForm, status: "Nouveau", heat: "Froid", temperature_score: 0 })
      .select().single();
    if (data) {
      setProspects((prev) => [data, ...prev]);
      await logActivity("prospect_added", `Prospect ajouté : ${data.name}`, data.id);
      setShowAddProspect(false);
      setPForm({ name: "", company: "", email: "", phone: "", whatsapp: "", service: "", source: "Manuel", notes: "" });
    }
  }

  async function addOffer() {
    if (!offerTarget || !oForm.service.trim()) return;
    setEmailSending(true);

    const { data } = await supabase.from("offers").insert({
      prospect_id: offerTarget.id,
      service: oForm.service,
      price: parseFloat(oForm.price) || 0,
      message: oForm.message,
      details: oForm.details || null,
      status: "Envoyée",
      pipeline_stage: "Offre envoyée",
      sent_at: new Date().toISOString(),
    }).select("*, prospect:prospects(*)").single();

    if (data) {
      setOffers((prev) => [data as Offer, ...prev]);
      await supabase.from("prospects").update({ status: "Contacté", updated_at: new Date().toISOString() }).eq("id", offerTarget.id);
      setProspects((prev) => prev.map((p) => p.id === offerTarget.id ? { ...p, status: "Contacté" } : p));
      await logActivity("offer_sent", `Offre envoyée à ${offerTarget.name} — ${oForm.service} (${fmt(parseFloat(oForm.price) || 0)})`, offerTarget.id, data.id);

        if (oForm.sendEmail && offerTarget.email) {
          try {
            const res = await fetch("/api/marketing/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  offer_id: data.id,
                  prospect_id: offerTarget.id,
                  prospect_name: offerTarget.name,
                  prospect_email: offerTarget.email,
                  company: offerTarget.company,
                  service: oForm.service,
                  price: parseFloat(oForm.price) || 0,
                  message: oForm.message,
                  details: oForm.details || null,
                  sender_name: "L'équipe commerciale",
                  agency_name: "Popy Tech",
                }),
            });
            const result = await res.json();
            if (result.ok) {
              await logActivity("offer_sent", `📧 Email envoyé à ${offerTarget.email} — ${oForm.service}`, offerTarget.id, data.id);
              alert(`✅ Email envoyé avec succès à ${offerTarget.email}`);
            } else {
              alert(`⚠️ Offre enregistrée mais l'email n'a pas pu être envoyé.\nErreur : ${result.error || "Erreur inconnue"}\n\nVérifiez la configuration SMTP.`);
            }
          } catch (e) {
            console.error("Email send error:", e);
            alert(`⚠️ Offre enregistrée mais erreur réseau lors de l'envoi email.`);
          }
        }

      setEmailSending(false);
      setShowAddOffer(false);
      setOForm({ service: "", price: "", message: "", details: "", sendEmail: false, emailPreview: false });
    } else {
      setEmailSending(false);
    }
  }

  async function cancelScheduledFollowup(id: string) {
    await fetch("/api/marketing/scheduled-followups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setScheduledFollowups((prev) => prev.filter((sf) => sf.id !== id));
  }

  async function addFollowup() {
    if (!followupTarget) return;

    // Mode programmé automatique
    if (scheduleMode && scheduleDate) {
      // Guinée-Conakry = GMT+0 = UTC : on traite la date saisie directement comme UTC
      const scheduled_at = new Date(`${scheduleDate}T${scheduleTime}:00Z`).toISOString();
      const res = await fetch("/api/marketing/scheduled-followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: followupTarget.id,
          prospect_id: followupTarget.prospect_id,
          channel: fForm.channel,
          followup_type: fForm.type,
          message: fForm.message,
          scheduled_at,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        await loadAll();
        setShowAddFollowup(false);
        setScheduleMode(false);
        setScheduleDate("");
        setScheduleTime("09:00");
        setFForm({ type: "Relance 1", channel: "Email", message: "", response: "", responded: false });
        alert(`✅ Relance programmée pour le ${new Date(scheduled_at).toLocaleString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Conakry" })}`);
      } else {
        alert(`⚠️ Erreur : ${result.error}`);
      }
      return;
    }

    // Récupérer le prospect pour avoir email/whatsapp/phone
    const prospect = prospects.find((p) => p.id === followupTarget.prospect_id)
      || (followupTarget.prospect as Prospect | undefined);

    // 1. Enregistrer la relance en base
    const { data } = await supabase.from("followups").insert({
      offer_id: followupTarget.id,
      prospect_id: followupTarget.prospect_id,
      type: fForm.type,
      channel: fForm.channel,
      message: fForm.message,
      response: fForm.response,
      responded: fForm.responded,
      date: new Date().toISOString(),
    }).select().single();

    if (!data) return;

    setFollowups((prev) => [data, ...prev]);
    if (fForm.responded) {
      await updateProspectScore(followupTarget.prospect_id, 40);
      await supabase.from("prospects").update({ status: "Intéressé" }).eq("id", followupTarget.prospect_id);
      setProspects((prev) => prev.map((p) => p.id === followupTarget.prospect_id ? { ...p, status: "Intéressé" } : p));
    }

    const pName = prospect?.name || "prospect";
    await logActivity("followup_done", `Relance ${fForm.type} — ${pName} via ${fForm.channel}`, followupTarget.prospect_id, followupTarget.id);

    // 2. Envoyer via le canal choisi
    if (fForm.channel === "Email" && prospect?.email) {
      try {
        const res = await fetch("/api/marketing/send-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followup_id: data.id,
            offer_id: followupTarget.id,
            prospect_id: followupTarget.prospect_id,
            prospect_name: pName,
            prospect_email: prospect.email,
            company: prospect.company,
            followup_type: fForm.type,
            message: fForm.message,
            service: followupTarget.service,
            price: followupTarget.price,
            tracking_token: followupTarget.tracking_token,
          }),
        });
        const result = await res.json();
        if (result.ok) {
          alert(`✅ Email de relance envoyé à ${prospect.email}`);
        } else {
          alert(`⚠️ Relance enregistrée mais l'email n'a pas pu être envoyé.\nErreur : ${result.error || "Erreur inconnue"}`);
        }
      } catch {
        alert(`⚠️ Relance enregistrée mais erreur réseau lors de l'envoi email.`);
      }
    } else if (fForm.channel === "WhatsApp") {
        const waNumber = (prospect?.whatsapp || prospect?.phone || "").replace(/\D/g, "");
        const waMessage = fForm.message || `Bonjour ${pName}, suite à notre offre pour "${followupTarget.service}", nous revenons vers vous.`;
        if (waNumber) {
          setWhatsappPreview({ number: waNumber, message: waMessage, name: pName });
        } else {
          alert(`⚠️ Relance enregistrée. Numéro WhatsApp non renseigné pour ce prospect.`);
        }
    } else if (fForm.channel === "Téléphone") {
      const phoneNumber = prospect?.phone || prospect?.whatsapp;
      if (phoneNumber) {
        alert(`📞 Appel à passer : ${phoneNumber}\n\nMessage prévu :\n${fForm.message || `Bonjour ${pName}, je vous contacte au sujet de notre offre pour "${followupTarget.service}".`}`);
      } else {
        alert(`⚠️ Relance enregistrée. Numéro de téléphone non renseigné pour ce prospect.`);
      }
    } else if (fForm.channel === "LinkedIn") {
      alert(`💼 Relance LinkedIn enregistrée.\n\nMessage à envoyer à ${pName} via LinkedIn :\n\n${fForm.message || `Bonjour ${pName}, suite à notre proposition pour "${followupTarget.service}", je souhaitais faire un suivi.`}`);
    } else if (fForm.channel === "En personne") {
      alert(`🤝 Relance en personne enregistrée pour ${pName}.`);
    }

    setShowAddFollowup(false);
    setFForm({ type: "Relance 1", channel: "Email", message: "", response: "", responded: false });
  }

  async function updateOfferStage(id: string, stage: string, prospectId: string) {
    const updates: Record<string, unknown> = { pipeline_stage: stage, updated_at: new Date().toISOString() };
    if (stage === "Acceptée") { updates.accepted_at = new Date().toISOString(); updates.status = "Acceptée"; }
    if (stage === "Refusée") { updates.refused_at = new Date().toISOString(); updates.status = "Refusée"; }
    if (stage === "Offre ouverte") { updates.opened_at = new Date().toISOString(); }
    await supabase.from("offers").update(updates).eq("id", id);
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, ...updates } : o));
    if (stage === "Offre ouverte") await updateProspectScore(prospectId, 10);
    if (stage === "Intéressé") await updateProspectScore(prospectId, 20);
    if (stage === "Négociation") await updateProspectScore(prospectId, 30);
    if (stage === "Acceptée") {
      await updateProspectScore(prospectId, 100);
      await supabase.from("prospects").update({ status: "Converti" }).eq("id", prospectId);
      setProspects((prev) => prev.map((p) => p.id === prospectId ? { ...p, status: "Converti" } : p));
    }
    if (stage === "Refusée") {
      await supabase.from("prospects").update({ status: "Perdu" }).eq("id", prospectId);
      setProspects((prev) => prev.map((p) => p.id === prospectId ? { ...p, status: "Perdu" } : p));
    }
  }

  async function deleteProspect(id: string) {
    if (!confirm("Supprimer ce prospect et toutes ses données ?")) return;
    await supabase.from("prospects").delete().eq("id", id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProspect?.id === id) setSelectedProspect(null);
  }

  async function deleteOffer(id: string) {
    if (!confirm("Supprimer cette offre ?")) return;
    await supabase.from("offers").delete().eq("id", id);
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  async function updateProspect() {
    if (!selectedProspect || !eForm.name.trim()) return;
    const { data } = await supabase.from("prospects")
      .update({
        name: eForm.name,
        company: eForm.company,
        email: eForm.email,
        phone: eForm.phone,
        whatsapp: eForm.whatsapp,
        service: eForm.service,
        source: eForm.source,
        notes: eForm.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProspect.id)
      .select().single();
    if (data) {
      setSelectedProspect(data);
      setProspects((prev) => prev.map((p) => p.id === data.id ? data : p));
      setShowEditProspect(false);
    }
  }

  // ── KPIs ──
  const now = new Date();
  const todayStr = now.toDateString();
  const offersSentToday = offers.filter((o) => new Date(o.sent_at).toDateString() === todayStr);
  const acceptedOffers = offers.filter((o) => o.pipeline_stage === "Acceptée");
  const openOffers = offers.filter((o) => !["Acceptée", "Refusée"].includes(o.pipeline_stage));
  const totalRevenue = acceptedOffers.reduce((s, o) => s + Number(o.price), 0);
  const conversionRate = offers.length > 0 ? Math.round((acceptedOffers.length / offers.length) * 100) : 0;
  const openRate = offers.length > 0 ? Math.round((offers.filter((o) => o.opened_at).length / offers.length) * 100) : 0;
  const hotProspects = prospects.filter((p) => p.heat === "Chaud" || p.heat === "Très chaud");
  const avgOfferValue = acceptedOffers.length > 0 ? totalRevenue / acceptedOffers.length : 0;
  const potentialRevenue = openOffers
    .filter((o) => hotProspects.some((p) => p.id === o.prospect_id))
    .reduce((s, o) => s + Number(o.price), 0);

  const DAILY_GOAL = 4;
  const progressPct = Math.min(100, Math.round((offersSentToday.length / DAILY_GOAL) * 100));

  const toFollowup = offers.filter((o) => {
    if (["Acceptée", "Refusée"].includes(o.pipeline_stage)) return false;
    const hours = (Date.now() - new Date(o.sent_at).getTime()) / 3600000;
    const alreadyRelanced = followups.some((f) => f.offer_id === o.id);
    return hours >= 48 && !alreadyRelanced && !o.opened_at;
  });

  const filteredProspects = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.company || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "Tous" || p.status === statusFilter;
    const matchHeat = heatFilter === "Tous" || p.heat === heatFilter;
    return matchSearch && matchStatus && matchHeat;
  });

  const prospectOffers = (id: string) => offers.filter((o) => o.prospect_id === id);
  const prospectFollowups = (id: string) => followups.filter((f) => f.prospect_id === id);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
      Chargement...
    </div>
  );

  // ── FICHE PROSPECT DÉTAILLÉE ──
  if (selectedProspect) {
    const pOffers = prospectOffers(selectedProspect.id);
    const pFollowups = prospectFollowups(selectedProspect.id);
    const hs = HEAT_STYLE[selectedProspect.heat] || HEAT_STYLE["Froid"];

    return (
      <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
          <button onClick={() => setSelectedProspect(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux prospects
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(selectedProspect.name)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                {initials(selectedProspect.name)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{selectedProspect.name}</h1>
                {selectedProspect.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3" /> {selectedProspect.company}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[selectedProspect.status] || "bg-muted text-muted-foreground"}`}>
                    {selectedProspect.status}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hs.bg} ${hs.text}`}>
                    {hs.label}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                    Score : {selectedProspect.temperature_score}/100
                  </span>
                </div>
              </div>
            </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setOfferTarget(selectedProspect); setShowAddOffer(true); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                  <Send className="w-4 h-4" /> Envoyer offre
                </button>
                {pOffers.length > 0 && (
                  <button onClick={() => { setFollowupTarget(pOffers[0]); setShowAddFollowup(true); }}
                    className="flex items-center gap-2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Relancer
                  </button>
                )}
                <button onClick={() => {
                  setEForm({
                    name: selectedProspect.name,
                    company: selectedProspect.company || "",
                    email: selectedProspect.email || "",
                    phone: selectedProspect.phone || "",
                    whatsapp: selectedProspect.whatsapp || "",
                    service: selectedProspect.service || "",
                    source: selectedProspect.source || "",
                    notes: selectedProspect.notes || "",
                  });
                  setShowEditProspect(true);
                }}
                  className="flex items-center gap-2 text-foreground bg-muted border border-border text-sm px-4 py-2 rounded-xl hover:bg-muted/80 transition-colors">
                  <FileText className="w-4 h-4" /> Modifier
                </button>
                <button onClick={() => deleteProspect(selectedProspect.id)}
                  className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 text-sm px-4 py-2 rounded-xl hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coordonnées</p>
              <div className="space-y-2.5">
                {selectedProspect.email && (
                  <a href={`mailto:${selectedProspect.email}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                    <Mail className="w-4 h-4 text-muted-foreground" /> {selectedProspect.email}
                  </a>
                )}
                {selectedProspect.phone && (
                  <a href={`tel:${selectedProspect.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary">
                    <Phone className="w-4 h-4 text-muted-foreground" /> {selectedProspect.phone}
                  </a>
                )}
                {selectedProspect.whatsapp && (
                  <a href={`https://wa.me/${selectedProspect.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 text-sm text-green-400 hover:underline">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" /> {selectedProspect.whatsapp}
                  </a>
                )}
                {!selectedProspect.email && !selectedProspect.phone && !selectedProspect.whatsapp && (
                  <p className="text-sm text-muted-foreground">Aucune coordonnée renseignée</p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Informations</p>
              <div className="space-y-2 text-sm">
                {selectedProspect.service && <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium text-foreground">{selectedProspect.service}</span></div>}
                {selectedProspect.source && <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="font-medium text-foreground">{selectedProspect.source}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Ajouté</span><span className="text-foreground">{new Date(selectedProspect.created_at).toLocaleDateString("fr-FR")}</span></div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Score de chaleur</p>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${hs.text}`}>{selectedProspect.temperature_score}/100</span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${hs.bg} ${hs.text}`}>{hs.label}</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  selectedProspect.temperature_score >= 80 ? "bg-gradient-to-r from-red-500 to-rose-400" :
                  selectedProspect.temperature_score >= 50 ? "bg-gradient-to-r from-orange-400 to-amber-400" :
                  selectedProspect.temperature_score >= 20 ? "bg-gradient-to-r from-yellow-400 to-lime-400" :
                  "bg-gradient-to-r from-blue-400 to-cyan-400"
                }`} style={{ width: `${selectedProspect.temperature_score}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedProspect.temperature_score < 20 && "Aucune interaction détectée."}
                {selectedProspect.temperature_score >= 20 && selectedProspect.temperature_score < 50 && "Quelques signaux d'intérêt."}
                {selectedProspect.temperature_score >= 50 && selectedProspect.temperature_score < 80 && "Prospect engagé. Relancer !"}
                {selectedProspect.temperature_score >= 80 && "Priorité absolue ! Fermer maintenant."}
              </p>
            </div>

            {selectedProspect.notes && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                <p className="text-xs font-semibold text-yellow-400 mb-1">Notes</p>
                <p className="text-sm text-foreground">{selectedProspect.notes}</p>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Changer le statut</p>
              <div className="flex flex-wrap gap-1.5">
                {["Nouveau", "Contacté", "Intéressé", "Sans réponse", "Converti", "Perdu", "Dormant"].map((s) => (
                  <button key={s} onClick={async () => {
                    await supabase.from("prospects").update({ status: s }).eq("id", selectedProspect.id);
                    setSelectedProspect((p) => p ? { ...p, status: s } : p);
                    setProspects((prev) => prev.map((p) => p.id === selectedProspect.id ? { ...p, status: s } : p));
                  }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${selectedProspect.status === s
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right col — Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-semibold text-foreground">Offres ({pOffers.length})</p>
                <button onClick={() => { setOfferTarget(selectedProspect); setShowAddOffer(true); }}
                  className="text-xs text-primary hover:opacity-80 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Nouvelle offre
                </button>
              </div>
              {pOffers.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune offre envoyée</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pOffers.map((o) => (
                    <div key={o.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{o.service}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PIPELINE_STYLE[o.pipeline_stage] || "bg-muted text-muted-foreground"}`}>
                              {o.pipeline_stage}
                            </span>
                          </div>
                          <p className="text-primary font-bold mt-1">{fmt(Number(o.price))}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {new Date(o.sent_at).toLocaleDateString("fr-FR")}</span>
                            {o.opened_at && <span className="flex items-center gap-1 text-indigo-400"><Eye className="w-3 h-3" /> Ouvert {o.open_count}x</span>}
                            {o.clicked_at && <span className="flex items-center gap-1 text-purple-400"><Zap className="w-3 h-3" /> Cliqué</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={o.pipeline_stage}
                            onChange={(e) => updateOfferStage(o.id, e.target.value, o.prospect_id)}
                            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                          <button onClick={() => deleteOffer(o.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-semibold text-foreground">Relances ({pFollowups.length})</p>
                {pOffers.length > 0 && (
                  <button onClick={() => { setFollowupTarget(pOffers[0]); setShowAddFollowup(true); }}
                    className="text-xs text-violet-400 hover:opacity-80 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Ajouter relance
                  </button>
                )}
              </div>
              {pFollowups.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune relance effectuée</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pFollowups.map((f) => (
                    <div key={f.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${f.responded ? "bg-green-500/10 text-green-400" : "bg-violet-500/10 text-violet-400"}`}>
                          {f.responded ? "✓" : "→"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">{f.type}</p>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">{f.channel}</span>
                            {f.responded && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Répondu</span>}
                          </div>
                          {f.message && <p className="text-sm text-muted-foreground mt-1">{f.message}</p>}
                          {f.response && <p className="text-sm text-green-400 mt-1 bg-green-500/10 px-3 py-1.5 rounded-lg">💬 {f.response}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(f.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditProspect && (
        <Modal title={`Modifier — ${selectedProspect?.name || ""}`} onClose={() => setShowEditProspect(false)} onConfirm={updateProspect} confirmLabel="Enregistrer les modifications" confirmColor="bg-primary hover:opacity-90">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nom *" value={eForm.name} onChange={(v) => setEForm((f) => ({ ...f, name: v }))} placeholder="Jean Dupont" autoFocus />
            <InputField label="Entreprise" value={eForm.company} onChange={(v) => setEForm((f) => ({ ...f, company: v }))} placeholder="ABC Corp" />
            <InputField label="Email" value={eForm.email} onChange={(v) => setEForm((f) => ({ ...f, email: v }))} placeholder="jean@abc.com" type="email" />
            <InputField label="Téléphone" value={eForm.phone} onChange={(v) => setEForm((f) => ({ ...f, phone: v }))} placeholder="+224 62x xxx xxx" />
            <InputField label="WhatsApp" value={eForm.whatsapp} onChange={(v) => setEForm((f) => ({ ...f, whatsapp: v }))} placeholder="+224 62x xxx xxx" />
            <SelectField label="Source" value={eForm.source} onChange={(v) => setEForm((f) => ({ ...f, source: v }))} options={["", ...SOURCES]} />
            <SelectField label="Service souhaité" value={eForm.service} onChange={(v) => setEForm((f) => ({ ...f, service: v }))} options={["", ...SERVICES]} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea value={eForm.notes} onChange={(e) => setEForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
        </Modal>
      )}

      {showAddOffer && (
        <Modal
          title={`Envoyer une offre${offerTarget ? ` — ${offerTarget.name}` : ""}`}
          onClose={() => { setShowAddOffer(false); setOForm({ service: "", price: "", message: "", details: "", sendEmail: false, emailPreview: false }); }}
          onConfirm={addOffer}
          confirmLabel={emailSending ? "Envoi en cours..." : oForm.sendEmail ? "Enregistrer & Envoyer l'email" : "Enregistrer l'offre"}
          confirmColor={oForm.sendEmail ? "bg-indigo-600 hover:opacity-90" : "bg-primary hover:opacity-90"}
        >
          <SelectField label="Service *" value={oForm.service} onChange={(v) => setOForm((f) => ({ ...f, service: v }))} options={["", ...SERVICES]} />
          <InputField label="Montant (GNF)" value={oForm.price} onChange={(v) => setOForm((f) => ({ ...f, price: v }))} placeholder="1500000" type="number" />
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message d'accroche <span className="text-muted-foreground/60">(intro dans l'email)</span></label>
              <textarea value={oForm.message} onChange={(e) => setOForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={`Bonjour ${offerTarget?.name || ""},\n\nSuite à notre échange, je vous fais parvenir notre proposition.\n\nCordialement,\nL'équipe Popy Tech`}
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Détails de l'offre <span className="text-muted-foreground/60">(affiché sur la page "Voir les détails")</span>
              </label>
              <textarea value={oForm.details} onChange={(e) => setOForm((f) => ({ ...f, details: e.target.value }))}
                placeholder={`Ex :\n• Création d'un site vitrine 5 pages\n• Design moderne responsive\n• Formulaire de contact\n• Livraison en 15 jours\n• 3 révisions incluses\n• Hébergement 1 an offert`}
                rows={6}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Utilisez • pour les puces, ou écrivez librement. Ce contenu sera mis en valeur sur la page prospect.</p>
            </div>
            {offerTarget?.email && (
            <label className="flex items-center justify-between p-4 border border-border rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${oForm.sendEmail ? "bg-indigo-500/10 text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Envoyer par email</p>
                  <p className="text-xs text-muted-foreground">{offerTarget.email}</p>
                </div>
              </div>
              <div className="relative">
                  <input type="checkbox" checked={oForm.sendEmail} onChange={(e) => setOForm((f) => ({ ...f, sendEmail: e.target.checked }))} className="sr-only" />
                  <div className={`w-11 h-6 rounded-full transition-colors ${oForm.sendEmail ? "bg-indigo-600" : "bg-muted"}`}>
                    <div className={`w-5 h-5 bg-background rounded-full shadow transition-transform mt-0.5 ml-0.5 ${oForm.sendEmail ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>
              </label>
            )}
          </Modal>
        )}

      {showAddFollowup && followupTarget && (
          <Modal
            title="Ajouter une relance"
            onClose={() => { setShowAddFollowup(false); setScheduleMode(false); setScheduleDate(""); setScheduleTime("09:00"); }}
            onConfirm={addFollowup}
            confirmLabel={scheduleMode ? "Programmer l'envoi automatique" : "Envoyer maintenant"}
            confirmColor={scheduleMode ? "bg-indigo-600 hover:opacity-90" : "bg-violet-600 hover:opacity-90"}
          >
            <div className="bg-muted rounded-xl p-3 text-sm mb-2">
              <p className="text-muted-foreground">Offre : <span className="font-semibold text-foreground">{followupTarget.service}</span></p>
              {followupTarget.prospect && <p className="text-muted-foreground">Prospect : <span className="font-semibold text-foreground">{(followupTarget.prospect as Prospect).name}</span></p>}
            </div>

            {/* Toggle : envoyer maintenant / programmer */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setScheduleMode(false)}
                className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all font-medium ${!scheduleMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Send className="w-4 h-4" /> Envoyer maintenant
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode(true)}
                className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all font-medium ${scheduleMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Clock className="w-4 h-4" /> Programmer
              </button>
            </div>

            {scheduleMode && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Envoi automatique programmé
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Heure</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-300">
                  L&apos;email sera envoyé automatiquement à la date et l&apos;heure choisies, sans intervention de votre part.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Type" value={fForm.type} onChange={(v) => setFForm((f) => ({ ...f, type: v }))} options={FOLLOWUP_TYPES} />
              <SelectField label="Canal" value={fForm.channel} onChange={(v) => setFForm((f) => ({ ...f, channel: v }))} options={CHANNELS} />
            </div>
            {fForm.channel === "WhatsApp" && !scheduleMode && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3 py-2 rounded-xl">
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                Le message sera prévisualisé avant envoi — sans quitter l&apos;ERP
              </div>
            )}
            {fForm.channel === "WhatsApp" && scheduleMode && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                La relance WhatsApp sera enregistrée automatiquement, vous serez notifié pour l&apos;envoyer.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
              <textarea value={fForm.message} onChange={(e) => setFForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Contenu de la relance..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
            </div>
            {!scheduleMode && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Réponse reçue (si applicable)</label>
                  <textarea value={fForm.response} onChange={(e) => setFForm((f) => ({ ...f, response: e.target.value }))}
                    placeholder="Le prospect a répondu..."
                    rows={2}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fForm.responded} onChange={(e) => setFForm((f) => ({ ...f, responded: e.target.checked }))}
                    className="w-4 h-4 rounded accent-violet-600" />
                  <span className="text-sm text-foreground">Le prospect a répondu positivement (+40 pts de score)</span>
                </label>
              </>
            )}
          </Modal>
        )}

        {/* ─── MODAL WHATSAPP ───────────────────────────────────────────────────── */}
        {whatsappPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWhatsappPreview(null)} />
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-green-500/5">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">Relance WhatsApp</h2>
                  <p className="text-xs text-muted-foreground">Relance enregistrée · En attente d&apos;envoi</p>
                </div>
                <button onClick={() => setWhatsappPreview(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aperçu du message style WhatsApp */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>Destinataire :</span>
                  <span className="font-semibold text-foreground">{whatsappPreview.name}</span>
                  <span className="text-muted-foreground/60">(+{whatsappPreview.number})</span>
                </div>

                <div className="bg-[#DCF8C6] dark:bg-green-900/30 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-green-100 leading-relaxed shadow-sm max-w-[85%]">
                  {whatsappPreview.message.split("\n").map((line, i) => (
                    <span key={i}>{line}{i < whatsappPreview.message.split("\n").length - 1 && <br />}</span>
                  ))}
                  <div className="text-right text-xs text-gray-500 dark:text-green-300/60 mt-1">{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ✓</div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
                  Copiez le message ou cliquez sur &quot;Ouvrir WhatsApp Web&quot; pour envoyer directement depuis votre navigateur.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappPreview.message);
                    alert("Message copié !");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground text-sm py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4" /> Copier le message
                </button>
                <a
                  href={`https://web.whatsapp.com/send?phone=${whatsappPreview.number}&text=${encodeURIComponent(whatsappPreview.message)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setWhatsappPreview(null)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm py-2.5 rounded-xl transition-colors font-semibold"
                >
                  <MessageCircle className="w-4 h-4" /> Ouvrir WhatsApp Web
                </a>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" /> Marketing & Prospection
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-3">
            {toFollowup.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm px-3 py-2 rounded-xl">
                <Bell className="w-4 h-4" />
                <span className="font-semibold">{toFollowup.length}</span> offre{toFollowup.length > 1 ? "s" : ""} à relancer
              </div>
            )}
            <button onClick={() => setShowAddProspect(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
              <Plus className="w-4 h-4" /> Nouveau prospect
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-muted p-1 rounded-xl w-fit">
          {([
            { key: "dashboard", label: "Dashboard", icon: <BarChart2 className="w-4 h-4" /> },
            { key: "prospects", label: "Prospects", icon: <Users className="w-4 h-4" />, count: prospects.length },
            { key: "offres", label: "Offres", icon: <FileText className="w-4 h-4" />, count: openOffers.length },
            { key: "performance", label: "Performance", icon: <TrendingUp className="w-4 h-4" /> },
          ] as const).map(({ key, label, icon, count }: { key: "dashboard" | "prospects" | "offres" | "performance"; label: string; icon: React.ReactNode; count?: number }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {icon} {label}
              {count !== undefined && count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground"}`}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ─── TAB: DASHBOARD ──────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Morning brief */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">Briefing du jour</p>
                  <h2 className="text-2xl font-bold mb-3">
                    {offersSentToday.length >= DAILY_GOAL ? "🎯 Objectif atteint !" : `🚀 ${DAILY_GOAL - offersSentToday.length} offre${DAILY_GOAL - offersSentToday.length > 1 ? "s" : ""} restante${DAILY_GOAL - offersSentToday.length > 1 ? "s" : ""} aujourd'hui`}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-sm text-blue-100">
                    <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-300" /> <strong className="text-white">{hotProspects.length}</strong> prospects chauds</span>
                    <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-yellow-300" /> <strong className="text-white">{toFollowup.length}</strong> à relancer</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-green-300" /> <strong className="text-white">{fmt(Math.round(potentialRevenue))}</strong> potentiel</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-200 text-xs mb-1">Objectif journalier</p>
                  <p className="text-4xl font-bold">{offersSentToday.length}/{DAILY_GOAL}</p>
                  <div className="w-32 h-2 bg-blue-500/50 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-card rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Prospects total", value: prospects.length, icon: <Users className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10", sub: `${prospects.filter((p) => p.status === "Nouveau").length} nouveaux` },
                { label: "CA réalisé", value: fmt(totalRevenue), icon: <DollarSign className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-500/10", sub: `${acceptedOffers.length} offre${acceptedOffers.length > 1 ? "s" : ""} acceptée${acceptedOffers.length > 1 ? "s" : ""}` },
                { label: "Taux conversion", value: `${conversionRate}%`, icon: <Percent className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10", sub: `${offers.length} offres envoyées` },
                { label: "Offres en cours", value: openOffers.length, icon: <Activity className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-500/10", sub: `Taux ouverture : ${openRate}%` },
              ].map(({ label, value, icon, color, bg, sub }) => (
                <div key={label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{label}</p>
                    <div className={`w-9 h-9 ${bg} ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prospects chauds */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" /> Prospects prioritaires
                  </p>
                  <button onClick={() => setTab("prospects")} className="text-xs text-primary hover:opacity-80">Voir tous</button>
                </div>
                {hotProspects.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Flame className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Aucun prospect chaud pour l'instant</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {hotProspects.slice(0, 5).map((p) => {
                      const hs = HEAT_STYLE[p.heat] || HEAT_STYLE["Froid"];
                      return (
                        <div key={p.id} onClick={() => setSelectedProspect(p)}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad(p.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {initials(p.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.company || p.service || "—"}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${hs.bg} ${hs.text}`}>{hs.label}</span>
                            <p className="text-xs text-muted-foreground mt-1">{p.temperature_score}pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* À relancer */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-400" /> À relancer maintenant
                  </p>
                  <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">{toFollowup.length}</span>
                </div>
                {toFollowup.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Toutes les offres ont été suivies</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {toFollowup.slice(0, 5).map((o) => {
                      const p = o.prospect as Prospect | undefined;
                      const hours = Math.round((Date.now() - new Date(o.sent_at).getTime()) / 3600000);
                      return (
                        <div key={o.id} className="flex items-center gap-3 px-5 py-3.5">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad(p?.name || "?")} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {initials(p?.name || "?")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{p?.name || "Prospect"}</p>
                            <p className="text-xs text-muted-foreground">{o.service} — il y a {hours}h</p>
                          </div>
                          <button onClick={() => { setFollowupTarget(o); setShowAddFollowup(true); }}
                            className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0">
                            Relancer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Relances programmées */}
            {scheduledFollowups.filter(sf => sf.status === "pending").length > 0 && (
              <div className="bg-card rounded-2xl border border-indigo-500/30 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-indigo-500/5">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> Relances programmées
                    <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                      {scheduledFollowups.filter(sf => sf.status === "pending").length}
                    </span>
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {scheduledFollowups.filter(sf => sf.status === "pending").slice(0, 8).map((sf) => {
                    const p = sf.prospect as Prospect | undefined;
                    const o = sf.offer as { id: string; service: string; price: number } | undefined;
                    const isOverdue = new Date(sf.scheduled_at) < new Date();
                    return (
                      <div key={sf.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sf.channel === "Email" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                          {sf.channel === "Email" ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{p?.name || "Prospect"}</p>
                          <p className="text-xs text-muted-foreground">{sf.followup_type} · {o?.service || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs font-medium ${isOverdue ? "text-orange-400" : "text-indigo-400"}`}>
                            {isOverdue ? "⏰ En attente" : new Date(sf.scheduled_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Conakry" })}
                          </p>
                          <button
                            onClick={() => cancelScheduledFollowup(sf.id)}
                            className="text-xs text-red-400 hover:text-red-300 mt-0.5"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activité récente */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Activité récente
                </p>
              </div>
              {activities.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        a.type === "offer_accepted" ? "bg-green-500/10 text-green-400" :
                        a.type === "prospect_added" ? "bg-blue-500/10 text-blue-400" :
                        a.type === "offer_sent" ? "bg-indigo-500/10 text-indigo-400" :
                        a.type === "followup_done" ? "bg-violet-500/10 text-violet-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {ACTIVITY_ICONS[a.type] || <Zap className="w-4 h-4" />}
                      </div>
                      <p className="text-sm text-foreground flex-1">{a.description}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: PROSPECTS ──────────────────────────────────────────────────── */}
        {tab === "prospects" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un prospect..."
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PROSPECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={heatFilter} onChange={(e) => setHeatFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="Tous">Toutes chaleurs</option>
                <option>Froid</option><option>Tiède</option><option>Chaud</option><option>Très chaud</option>
              </select>
              <button onClick={() => setShowAddProspect(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{filteredProspects.length}</span> prospect{filteredProspects.length > 1 ? "s" : ""}</p>
              </div>
              {filteredProspects.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Aucun prospect trouvé</p>
                  <p className="text-sm mt-1">Modifiez vos filtres ou ajoutez un prospect</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredProspects.map((p) => {
                    const hs = HEAT_STYLE[p.heat] || HEAT_STYLE["Froid"];
                    const pOff = prospectOffers(p.id);
                    return (
                      <div key={p.id} onClick={() => setSelectedProspect(p)}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad(p.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                          {initials(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {p.company && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building className="w-3 h-3" />{p.company}</span>}
                            {p.service && <span className="text-xs text-muted-foreground">{p.service}</span>}
                          </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                          {p.email && <Mail className="w-4 h-4 text-muted-foreground/50" />}
                          {p.phone && <Phone className="w-4 h-4 text-muted-foreground/50" />}
                          {p.whatsapp && <MessageCircle className="w-4 h-4 text-muted-foreground/50" />}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[p.status] || "bg-muted text-muted-foreground"}`}>{p.status}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hs.bg} ${hs.text}`}>{hs.label}</span>
                          <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">{pOff.length} offre{pOff.length > 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: OFFRES ─────────────────────────────────────────────────────── */}
        {tab === "offres" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Envoyées", stages: ["Offre envoyée"], color: "border-blue-500/20 bg-blue-500/10", textColor: "text-blue-400" },
                { label: "Ouvertes/Intéressées", stages: ["Offre ouverte", "Intéressé"], color: "border-purple-500/20 bg-purple-500/10", textColor: "text-purple-400" },
                { label: "Négociation", stages: ["Négociation"], color: "border-orange-500/20 bg-orange-500/10", textColor: "text-orange-400" },
                { label: "Acceptées", stages: ["Acceptée"], color: "border-green-500/20 bg-green-500/10", textColor: "text-green-400" },
              ].map(({ label, stages, color, textColor }) => {
                const stageOffers = offers.filter((o) => stages.includes(o.pipeline_stage));
                return (
                  <div key={label} className={`border rounded-2xl p-4 ${color}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${textColor} mb-2`}>{label}</p>
                    <p className={`text-3xl font-bold ${textColor}`}>{stageOffers.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmt(stageOffers.reduce((s, o) => s + Number(o.price), 0))}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-foreground">Toutes les offres ({offers.length})</p>
                <button onClick={() => { setOfferTarget(null); setShowAddOffer(true); }}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Nouvelle offre
                </button>
              </div>
              {offers.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Aucune offre envoyée</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {offers.map((o) => {
                    const p = o.prospect as Prospect | undefined;
                    return (
                      <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                        {p && (
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad(p.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                            {initials(p.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{o.service}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PIPELINE_STYLE[o.pipeline_stage] || "bg-muted text-muted-foreground"}`}>{o.pipeline_stage}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-sm text-primary font-bold">{fmt(Number(o.price))}</p>
                            {p && <p className="text-xs text-muted-foreground">→ {p.name}</p>}
                            <p className="text-xs text-muted-foreground">{new Date(o.sent_at).toLocaleDateString("fr-FR")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {o.opened_at && <span className="text-xs text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> {o.open_count}x</span>}
                          <select value={o.pipeline_stage}
                            onChange={(e) => updateOfferStage(o.id, e.target.value, o.prospect_id)}
                            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none"
                            onClick={(e) => e.stopPropagation()}>
                            {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                          <button onClick={() => { setFollowupTarget(o); setShowAddFollowup(true); }}
                            className="text-xs text-violet-400 border border-violet-500/20 px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors whitespace-nowrap">
                            Relancer
                          </button>
                          <button onClick={() => deleteOffer(o.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: PERFORMANCE ────────────────────────────────────────────────── */}
        {tab === "performance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "CA réalisé", value: fmt(totalRevenue), icon: <DollarSign className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-500/10", detail: `${acceptedOffers.length} offres acceptées` },
                { label: "Taux de conversion", value: `${conversionRate}%`, icon: <Percent className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10", detail: `Sur ${offers.length} offres envoyées` },
                { label: "Taux d'ouverture", value: `${openRate}%`, icon: <Eye className="w-5 h-5" />, color: "text-indigo-400", bg: "bg-indigo-500/10", detail: `${offers.filter((o) => o.opened_at).length} emails ouverts` },
                { label: "Valeur moy. offre", value: acceptedOffers.length > 0 ? fmt(Math.round(avgOfferValue)) : "—", icon: <Award className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/10", detail: "Offres acceptées uniquement" },
                { label: "CA potentiel", value: fmt(Math.round(potentialRevenue)), icon: <TrendingUp className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10", detail: `${hotProspects.length} prospects chauds × probabilité` },
                { label: "Prospects actifs", value: prospects.filter((p) => !["Perdu", "Dormant"].includes(p.status)).length, icon: <Zap className="w-5 h-5" />, color: "text-rose-400", bg: "bg-rose-500/10", detail: `${prospects.filter((p) => p.status === "Converti").length} convertis` },
              ].map(({ label, value, icon, color, bg, detail }) => (
                <div key={label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{label}</p>
                    <div className={`w-9 h-9 ${bg} ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{detail}</p>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="font-semibold text-foreground mb-5">Tunnel de conversion</h3>
              <div className="space-y-3">
                {[
                  { label: "Prospects totaux", count: prospects.length, color: "bg-blue-500", max: prospects.length },
                  { label: "Offres envoyées", count: offers.length, color: "bg-indigo-500", max: prospects.length },
                  { label: "Offres ouvertes", count: offers.filter((o) => o.opened_at).length, color: "bg-purple-500", max: prospects.length },
                  { label: "Intéressés", count: offers.filter((o) => ["Intéressé", "Négociation"].includes(o.pipeline_stage)).length, color: "bg-orange-500", max: prospects.length },
                  { label: "Convertis", count: acceptedOffers.length, color: "bg-green-500", max: prospects.length },
                ].map(({ label, count, color, max }) => (
                  <div key={label} className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</p>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                        style={{ width: max > 0 ? `${Math.max(5, (count / max) * 100)}%` : "5%" }}>
                        {count > 0 && <span className="text-xs text-white font-bold">{count}</span>}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground w-8 text-right">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="font-semibold text-foreground mb-5">Sources de prospects</h3>
              <div className="space-y-3">
                {SOURCES.map((source) => {
                  const count = prospects.filter((p) => p.source === source).length;
                  if (count === 0) return null;
                  const pct = prospects.length > 0 ? Math.round((count / prospects.length) * 100) : 0;
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground w-40 flex-shrink-0">{source}</p>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-sm text-foreground font-semibold w-8 text-right">{count}</p>
                      <p className="text-xs text-muted-foreground w-10">{pct}%</p>
                    </div>
                  );
                })}
                {prospects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {showAddProspect && (
        <Modal title="Nouveau prospect" onClose={() => setShowAddProspect(false)} onConfirm={addProspect} confirmLabel="Ajouter" confirmColor="bg-primary hover:opacity-90">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nom *" value={pForm.name} onChange={(v) => setPForm((f) => ({ ...f, name: v }))} placeholder="Jean Dupont" autoFocus />
            <InputField label="Entreprise" value={pForm.company} onChange={(v) => setPForm((f) => ({ ...f, company: v }))} placeholder="ABC Corp" />
            <InputField label="Email" value={pForm.email} onChange={(v) => setPForm((f) => ({ ...f, email: v }))} placeholder="jean@abc.com" type="email" />
            <InputField label="Téléphone" value={pForm.phone} onChange={(v) => setPForm((f) => ({ ...f, phone: v }))} placeholder="+224 62x xxx xxx" />
            <InputField label="WhatsApp" value={pForm.whatsapp} onChange={(v) => setPForm((f) => ({ ...f, whatsapp: v }))} placeholder="+224 62x xxx xxx" />
            <SelectField label="Source" value={pForm.source} onChange={(v) => setPForm((f) => ({ ...f, source: v }))} options={SOURCES} />
            <SelectField label="Service souhaité" value={pForm.service} onChange={(v) => setPForm((f) => ({ ...f, service: v }))} options={["", ...SERVICES]} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea value={pForm.notes} onChange={(e) => setPForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
        </Modal>
      )}

      {showAddOffer && (
        <Modal
          title={`Envoyer une offre${offerTarget ? ` — ${offerTarget.name}` : ""}`}
          onClose={() => { setShowAddOffer(false); setOForm({ service: "", price: "", message: "", details: "", sendEmail: false, emailPreview: false }); }}
          onConfirm={addOffer}
          confirmLabel={emailSending ? "Envoi en cours..." : oForm.sendEmail ? "Enregistrer & Envoyer l'email" : "Enregistrer l'offre"}
          confirmColor={oForm.sendEmail ? "bg-indigo-600 hover:opacity-90" : "bg-primary hover:opacity-90"}
        >
          {!offerTarget && (
            <SelectField label="Prospect *" value="" onChange={(v) => {
              const p = prospects.find((pr) => pr.id === v);
              if (p) setOfferTarget(p);
            }} options={[{ label: "Sélectionner un prospect...", value: "" }, ...prospects.map((p) => ({ label: p.name + (p.company ? ` (${p.company})` : ""), value: p.id }))]} />
          )}

          {offerTarget && !offerTarget.email && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm px-3 py-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Aucun email renseigné pour ce prospect. <button onClick={() => setSelectedProspect(offerTarget)} className="underline font-medium">Ajouter depuis la fiche</button></span>
            </div>
          )}

            <SelectField label="Service *" value={oForm.service} onChange={(v) => setOForm((f) => ({ ...f, service: v }))} options={["", ...SERVICES]} />
            <InputField label="Montant (GNF)" value={oForm.price} onChange={(v) => setOForm((f) => ({ ...f, price: v }))} placeholder="1500000" type="number" />
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message d'accroche <span className="text-muted-foreground/60">(intro dans l'email)</span></label>
              <textarea value={oForm.message} onChange={(e) => setOForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={`Bonjour ${offerTarget?.name || ""},\n\nSuite à notre échange, je vous fais parvenir notre proposition pour ${oForm.service || "votre projet"}.\n\nNous restons disponibles pour tout complément d'information.\n\nCordialement,\nL'équipe Popy Tech`}
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Détails de l'offre <span className="text-muted-foreground/60">(affiché sur la page "Voir les détails")</span>
              </label>
              <textarea value={oForm.details} onChange={(e) => setOForm((f) => ({ ...f, details: e.target.value }))}
                placeholder={`Ex :\n• Création d'un site vitrine 5 pages\n• Design moderne responsive\n• Formulaire de contact\n• Livraison en 15 jours\n• 3 révisions incluses\n• Hébergement 1 an offert`}
                rows={6}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Utilisez • pour les puces, ou écrivez librement. Ce contenu sera mis en valeur sur la page prospect.</p>
            </div>

            {offerTarget?.email && (
            <div className="border border-border rounded-2xl overflow-hidden">
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${oForm.sendEmail ? "bg-indigo-500/10 text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Envoyer par email</p>
                    <p className="text-xs text-muted-foreground">{offerTarget.email}</p>
                  </div>
                </div>
                <div className="relative">
                  <input type="checkbox" checked={oForm.sendEmail} onChange={(e) => setOForm((f) => ({ ...f, sendEmail: e.target.checked }))} className="sr-only" />
                    <div className={`w-11 h-6 rounded-full transition-colors ${oForm.sendEmail ? "bg-indigo-600" : "bg-muted"}`}>
                      <div className={`w-5 h-5 bg-background rounded-full shadow transition-transform mt-0.5 ml-0.5 ${oForm.sendEmail ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </div>
                </label>
              </div>
            )}
          </Modal>
        )}

        {showEditProspect && (
        <Modal title={`Modifier — ${(selectedProspect as Prospect | null)?.name ?? ""}`} onClose={() => setShowEditProspect(false)} onConfirm={updateProspect} confirmLabel="Enregistrer les modifications" confirmColor="bg-primary hover:opacity-90">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nom *" value={eForm.name} onChange={(v) => setEForm((f) => ({ ...f, name: v }))} placeholder="Jean Dupont" autoFocus />
            <InputField label="Entreprise" value={eForm.company} onChange={(v) => setEForm((f) => ({ ...f, company: v }))} placeholder="ABC Corp" />
            <InputField label="Email" value={eForm.email} onChange={(v) => setEForm((f) => ({ ...f, email: v }))} placeholder="jean@abc.com" type="email" />
            <InputField label="Téléphone" value={eForm.phone} onChange={(v) => setEForm((f) => ({ ...f, phone: v }))} placeholder="+224 62x xxx xxx" />
            <InputField label="WhatsApp" value={eForm.whatsapp} onChange={(v) => setEForm((f) => ({ ...f, whatsapp: v }))} placeholder="+224 62x xxx xxx" />
            <SelectField label="Source" value={eForm.source} onChange={(v) => setEForm((f) => ({ ...f, source: v }))} options={["", ...SOURCES]} />
            <SelectField label="Service souhaité" value={eForm.service} onChange={(v) => setEForm((f) => ({ ...f, service: v }))} options={["", ...SERVICES]} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea value={eForm.notes} onChange={(e) => setEForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
        </Modal>
      )}

        {showAddFollowup && followupTarget && (
          <Modal
            title="Ajouter une relance"
            onClose={() => { setShowAddFollowup(false); setScheduleMode(false); setScheduleDate(""); setScheduleTime("09:00"); setFForm({ type: "Relance 1", channel: "Email", message: "", response: "", responded: false }); }}
            onConfirm={addFollowup}
            confirmLabel={scheduleMode ? "Programmer l'envoi automatique" : fForm.channel === "WhatsApp" ? "Voir la prévisualisation WhatsApp" : "Envoyer maintenant"}
            confirmColor={scheduleMode ? "bg-indigo-600 hover:opacity-90" : "bg-violet-600 hover:opacity-90"}
          >
            <div className="bg-muted rounded-xl p-3 text-sm mb-2">
              <p className="text-muted-foreground">Offre : <span className="font-semibold text-foreground">{followupTarget.service}</span></p>
              {(() => {
                const p = prospects.find((pr) => pr.id === followupTarget.prospect_id) || (followupTarget.prospect as Prospect | undefined);
                return p ? <p className="text-muted-foreground">Prospect : <span className="font-semibold text-foreground">{p.name}</span>{p.whatsapp || p.phone ? <span className="text-green-400 ml-2">· {p.whatsapp || p.phone}</span> : null}</p> : null;
              })()}
            </div>

            {/* Toggle : envoyer maintenant / programmer */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button type="button" onClick={() => setScheduleMode(false)}
                className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all font-medium ${!scheduleMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                <Send className="w-4 h-4" /> Envoyer maintenant
              </button>
              <button type="button" onClick={() => setScheduleMode(true)}
                className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all font-medium ${scheduleMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                <Clock className="w-4 h-4" /> Programmer
              </button>
            </div>

            {scheduleMode && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Envoi automatique programmé
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                    <input type="date" value={scheduleDate} min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Heure</label>
                    <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                </div>
                <p className="text-xs text-indigo-300">L&apos;email sera envoyé automatiquement à la date et l&apos;heure choisies.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Type" value={fForm.type} onChange={(v) => setFForm((f) => ({ ...f, type: v }))} options={FOLLOWUP_TYPES} />
              <SelectField label="Canal" value={fForm.channel} onChange={(v) => setFForm((f) => ({ ...f, channel: v }))} options={CHANNELS} />
            </div>

            {fForm.channel === "WhatsApp" && !scheduleMode && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3 py-2 rounded-xl">
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                Une prévisualisation du message s&apos;ouvrira avant envoi — sans quitter l&apos;ERP
              </div>
            )}
            {fForm.channel === "WhatsApp" && scheduleMode && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                La relance WhatsApp sera enregistrée — vous serez notifié pour l&apos;envoyer.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
              <textarea value={fForm.message} onChange={(e) => setFForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Contenu de la relance..."
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
            </div>

            {!scheduleMode && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Réponse reçue (si applicable)</label>
                  <textarea value={fForm.response} onChange={(e) => setFForm((f) => ({ ...f, response: e.target.value }))}
                    placeholder="Le prospect a répondu..."
                    rows={2}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fForm.responded} onChange={(e) => setFForm((f) => ({ ...f, responded: e.target.checked }))}
                    className="w-4 h-4 rounded accent-violet-600" />
                  <span className="text-sm text-foreground">Le prospect a répondu positivement (+40 pts de score)</span>
                </label>
              </>
            )}
          </Modal>
        )}

        {/* ─── MODAL WHATSAPP (layout principal) ───────────────────────────────── */}
        {whatsappPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWhatsappPreview(null)} />
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-green-500/5">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">Relance WhatsApp</h2>
                  <p className="text-xs text-muted-foreground">Relance enregistrée · En attente d&apos;envoi</p>
                </div>
                <button onClick={() => setWhatsappPreview(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>Destinataire :</span>
                  <span className="font-semibold text-foreground">{whatsappPreview.name}</span>
                  <span className="text-muted-foreground/60">(+{whatsappPreview.number})</span>
                </div>
                <div className="bg-[#DCF8C6] dark:bg-green-900/30 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-green-100 leading-relaxed shadow-sm max-w-[85%]">
                  {whatsappPreview.message.split("\n").map((line, i) => (
                    <span key={i}>{line}{i < whatsappPreview.message.split("\n").length - 1 && <br />}</span>
                  ))}
                  <div className="text-right text-xs text-gray-500 dark:text-green-300/60 mt-1">{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ✓</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
                  Copiez le message ou cliquez sur &quot;Ouvrir WhatsApp Web&quot; pour envoyer directement.
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => { navigator.clipboard.writeText(whatsappPreview.message); alert("Message copié !"); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground text-sm py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4" /> Copier le message
                </button>
                <a
                  href={`https://web.whatsapp.com/send?phone=${whatsappPreview.number}&text=${encodeURIComponent(whatsappPreview.message)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setWhatsappPreview(null)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm py-2.5 rounded-xl transition-colors font-semibold"
                >
                  <MessageCircle className="w-4 h-4" /> Ouvrir WhatsApp Web
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Modal({ title, children, onClose, onConfirm, confirmLabel, confirmColor }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">{children}</div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 border border-border text-foreground text-sm py-2.5 rounded-xl hover:bg-muted transition-colors">Annuler</button>
          <button onClick={onConfirm} className={`flex-1 text-white text-sm py-2.5 rounded-xl transition-all font-semibold ${confirmColor}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", autoFocus, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[] | { label: string; value: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          {options.map((o) =>
            typeof o === "string"
              ? <option key={o} value={o}>{o || "Sélectionner..."}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          )}
      </select>
    </div>
  );
}
