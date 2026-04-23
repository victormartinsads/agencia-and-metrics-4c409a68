import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm admin role
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "list") {
      // List all users with their roles
      const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw listErr;
      const { data: allRoles } = await admin.from("user_roles").select("user_id, role");
      const rolesByUser = new Map<string, string[]>();
      for (const r of (allRoles || []) as any[]) {
        const arr = rolesByUser.get(r.user_id) || [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      }
      const members = usersList.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rolesByUser.get(u.id) || [],
      }));
      return new Response(JSON.stringify({ members }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite") {
      const email = String(body.email || "").trim().toLowerCase();
      const role = (body.role as "admin" | "editor") || "editor";
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Try invite by email; if user exists, generate a magic link instead
      let userId: string | null = null;
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email);
      if (invErr) {
        // user may already exist – look it up
        const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = existingList.users.find((u: any) => u.email?.toLowerCase() === email);
        if (!existing) {
          return new Response(JSON.stringify({ error: invErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;
      } else {
        userId = invited.user?.id ?? null;
      }
      if (!userId) {
        return new Response(JSON.stringify({ error: "Could not resolve user id" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Insert role (ignore duplicates)
      await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true, userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_role") {
      const userId = String(body.userId || "");
      const role = body.role as "admin" | "editor";
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "userId and role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Replace user's roles with the single chosen role
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const userId = String(body.userId || "");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Prevent removing yourself
      if (userId === userData.user.id) {
        return new Response(JSON.stringify({ error: "Você não pode remover sua própria conta" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-members error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
