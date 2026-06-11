import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { /* not JSON */ }
  if (!res.ok || !data?.access_token) {
    throw new Error(`Token refresh failed (${res.status}): ${raw.slice(0, 300)}`);
  }
  return data as { access_token: string; expires_in: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, searchQuery } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user & check permission
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get Client Name
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchName = searchQuery?.trim() || client.name.trim();

    // 2. Fetch Google OAuth Token
    let { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!tokenRow) {
      const { data: fallbackToken } = await supabase
        .from("google_tokens")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (fallbackToken) {
        tokenRow = fallbackToken;
      }
    }

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "Google connection not found. Please connect your Google account in Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.expires_at) <= new Date(Date.now() + 60000)) {
      try {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);
        accessToken = refreshed.access_token;
        await supabase.from("google_tokens").update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq("id", tokenRow.id);
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to refresh Google token. Please reconnect in Settings." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Fetch Google Drive Folder ID from system_settings or env
    let driveFolderId = "";
    const { data: settingRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "google_drive_folder_id")
      .maybeSingle();
    
    if (settingRow?.value) {
      driveFolderId = settingRow.value.trim();
    } else {
      driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";
    }

    if (!driveFolderId) {
      return new Response(JSON.stringify({ error: "Google Drive Folder ID not configured in Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Query Google Drive API
    // Search query in Drive API v3:
    // 'folder_id' in parents and name contains 'searchName' and trashed = false
    const queryStr = `'${driveFolderId}' in parents and name contains '${searchName.replace(/'/g, "\\'")}' and trashed = false`;
    const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
    driveUrl.searchParams.set("q", queryStr);
    driveUrl.searchParams.set("fields", "files(id,name,webViewLink,createdTime)");
    driveUrl.searchParams.set("orderBy", "createdTime desc");
    driveUrl.searchParams.set("pageSize", "50");

    const driveRes = await fetch(driveUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveRes.ok) {
      const driveErrText = await driveRes.text();
      console.error("Google Drive API Error:", driveErrText);
      return new Response(JSON.stringify({ error: "Google Drive API returned an error.", details: driveErrText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveData = await driveRes.json();
    const files = driveData.files || [];

    // 5. Generate BlockNote compatible document
    const blocks: any[] = [];
    if (files.length === 0) {
      blocks.push({
        id: `empty-drive-${Date.now()}`,
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left"
        },
        content: [
          {
            type: "text",
            text: "Nenhuma gravação de call encontrada na pasta do Drive correspondente ao nome do cliente.",
            styles: { italic: true }
          }
        ],
        children: []
      });
    } else {
      for (const file of files) {
        const date = new Date(file.createdTime);
        const formattedDate = date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        blocks.push({
          id: `drive-file-${file.id}`,
          type: "bulletListItem",
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left"
          },
          content: [
            {
              type: "link",
              href: file.webViewLink,
              content: [
                {
                  type: "text",
                  text: file.name,
                  styles: { bold: true }
                }
              ]
            },
            {
              type: "text",
              text: ` (Criada em: ${formattedDate})`,
              styles: {}
            }
          ],
          children: []
        });
      }
    }

    // 6. Update client_diary_notion record
    const { data: existingDiary, error: diaryGetErr } = await supabase
      .from("client_diary_notion")
      .select("notion_data")
      .eq("client_id", clientId)
      .maybeSingle();

    if (diaryGetErr) {
      return new Response(JSON.stringify({ error: "Database error fetching diary", details: diaryGetErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notionData = existingDiary?.notion_data || {};
    const updatedNotionData = {
      ...notionData,
      gravacao_call: blocks
    };

    const { error: upsertErr } = await supabase
      .from("client_diary_notion")
      .upsert({
        client_id: clientId,
        notion_data: updatedNotionData
      }, { onConflict: "client_id" });

    if (upsertErr) {
      return new Response(JSON.stringify({ error: "Database error saving diary", details: upsertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, count: files.length, files: files.map((f: any) => ({ name: f.name, link: f.webViewLink })) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Deno execution error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
