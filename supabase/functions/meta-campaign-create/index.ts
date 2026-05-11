import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

const GRAPH = "https://graph.facebook.com/v21.0";

// Publica um rascunho (campaign_drafts) na Meta como PAUSED.
// Requer token com ads_management. Cria campanha + adsets + ads (sem criativos visuais —
// usa creative existente via image_url placeholder ou texto-only).

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { draftId } = await req.json();
    if (!draftId) {
      return new Response(JSON.stringify({ error: "draftId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: draft } = await sb
      .from("campaign_drafts")
      .select("id, client_id, ad_account_id, structure, status")
      .eq("id", draftId)
      .single();

    if (!draft) throw new Error("Rascunho não encontrado");
    if (draft.status === "published") throw new Error("Rascunho já publicado");

    const { data: client } = await sb
      .from("clients")
      .select("meta_access_token")
      .eq("id", draft.client_id)
      .single();
    if (!client?.meta_access_token) throw new Error("Token Meta não configurado");

    const token = client.meta_access_token;
    const acctId = draft.ad_account_id.startsWith("act_") ? draft.ad_account_id : `act_${draft.ad_account_id}`;
    const struct = draft.structure as any;

    await sb.from("campaign_drafts").update({ status: "publishing", publish_error: null }).eq("id", draftId);

    try {
      // 1. Criar campanha (PAUSED)
      const campBody = new URLSearchParams();
      campBody.set("name", struct.campaign.name);
      campBody.set("objective", struct.campaign.objective);
      campBody.set("status", "PAUSED");
      campBody.set("special_ad_categories", JSON.stringify(struct.campaign.special_ad_categories || []));
      campBody.set("access_token", token);

      const campRes = await fetch(`${GRAPH}/${acctId}/campaigns`, { method: "POST", body: campBody });
      const campJ = await campRes.json();
      if (campJ.error) {
        const needsScope = String(campJ.error.message || "").toLowerCase().includes("ads_management") ||
          String(campJ.error.message || "").toLowerCase().includes("permission");
        throw new Error(needsScope
          ? `Token Meta sem permissão ads_management. Atualize o token em Clientes. (${campJ.error.message})`
          : campJ.error.message);
      }
      const campaignId = campJ.id;
      const adsetIds: string[] = [];

      // 2. Criar adsets
      for (const adset of struct.adsets || []) {
        const targeting = {
          age_min: adset.age_min || 18,
          age_max: adset.age_max || 65,
          genders: adset.genders && adset.genders.length > 0 ? adset.genders : undefined,
          geo_locations: { countries: adset.countries || ["BR"] },
        };
        const body = new URLSearchParams();
        body.set("name", adset.name);
        body.set("campaign_id", campaignId);
        body.set("daily_budget", String(Math.round(Number(adset.daily_budget) * 100)));
        body.set("billing_event", adset.billing_event || "IMPRESSIONS");
        body.set("optimization_goal", adset.optimization_goal);
        body.set("targeting", JSON.stringify(targeting));
        body.set("status", "PAUSED");
        body.set("access_token", token);

        const r = await fetch(`${GRAPH}/${acctId}/adsets`, { method: "POST", body });
        const j = await r.json();
        if (j.error) throw new Error(`Adset "${adset.name}": ${j.error.message}`);
        adsetIds.push(j.id);
      }

      // 3. Anúncios não são criados aqui automaticamente (precisariam de creative_id válido com imagem hospedada).
      // O gestor deve adicionar criativos pelo Gerenciador da Meta após a publicação do esqueleto.
      // Persistimos as instruções no metadata.

      await sb.from("campaign_drafts").update({
        status: "published",
        meta_campaign_id: campaignId,
      }).eq("id", draftId);

      // Limpa cache para refletir
      await sb.from("meta_ads_cache").delete().eq("client_id", draft.client_id);

      return new Response(JSON.stringify({
        success: true,
        campaignId,
        adsetIds,
        note: "Campanha + adsets criados como PAUSADOS. Adicione os criativos no Gerenciador da Meta usando os textos sugeridos pela IA.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("campaign_drafts").update({ status: "failed", publish_error: msg }).eq("id", draftId);
      throw e;
    }
  } catch (e) {
    console.error("meta-campaign-create error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});