import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: client } = await supabase
      .from("clients")
      .select("meta_access_token, ad_account_ids")
      .eq("id", clientId)
      .single();

    if (!client?.meta_access_token) {
      return new Response(JSON.stringify({ error: "Token não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = client.meta_access_token;
    const accounts: string[] = client.ad_account_ids || [];
    const out: {
      id: string;
      name: string;
      custom_event_type?: string;
      rule?: string;
      account_id: string;
      pixel_id?: string;
    }[] = [];
    const errors: { accountId: string; message: string }[] = [];

    await Promise.all(
      accounts.map(async (acc) => {
        const actId = acc.startsWith("act_") ? acc : `act_${acc}`;
        try {
          const url =
            `${GRAPH}/${actId}/customconversions?fields=id,name,custom_event_type,rule,pixel,description&limit=200&access_token=${token}`;
          const r = await fetch(url);
          const j = await r.json();
          if (j.error) throw new Error(j.error.message);
          for (const cc of j.data || []) {
            out.push({
              id: cc.id,
              name: cc.name,
              custom_event_type: cc.custom_event_type,
              rule: cc.rule,
              account_id: actId,
              pixel_id: cc.pixel?.id,
            });
          }
        } catch (e) {
          errors.push({
            accountId: actId,
            message: e instanceof Error ? e.message : "unknown",
          });
        }
      }),
    );

    return new Response(JSON.stringify({ customConversions: out, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-custom-conversions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});