import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const action = body.action as string;

    if (action === "list") {
      // List all client_users join with auth.users
      const { data: links } = await admin
        .from("client_users")
        .select("id, user_id, client_id, created_at")
        .order("created_at", { ascending: false });
      const { data: clients } = await admin.from("clients").select("id, name");
      const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const usersById = new Map(usersList.users.map((u: any) => [u.id, u]));
      const clientsById = new Map((clients || []).map((c: any) => [c.id, c.name]));
      const items = (links || []).map((l: any) => {
        const u: any = usersById.get(l.user_id);
        return {
          id: l.id,
          user_id: l.user_id,
          client_id: l.client_id,
          client_name: clientsById.get(l.client_id) || "?",
          email: u?.email || "(removido)",
          last_sign_in_at: u?.last_sign_in_at || null,
          created_at: l.created_at,
        };
      });
      return json({ items });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const client_id = String(body.client_id || "");
      if (!email || !password || !client_id) return json({ error: "email, password, client_id obrigatórios" }, 400);
      if (password.length < 8) return json({ error: "Senha precisa ter ao menos 8 caracteres" }, 400);

      // Procurar usuário existente
      let userId: string | null = null;
      const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = existingList.users.find((u: any) => u.email?.toLowerCase() === email);
      if (existing) {
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (createErr) return json({ error: createErr.message }, 400);
        userId = created.user!.id;
      }

      // Atribuir role 'client' (e remover admin/editor caso tenha)
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role: "client" });

      // Criar/atualizar vínculo
      await admin.from("client_users").upsert(
        { user_id: userId, client_id, created_by: userData.user.id },
        { onConflict: "user_id" }
      );

      // Defaults do CRM para esse cliente
      await admin.rpc("crm_ensure_defaults", { _client_id: client_id });

      return json({ success: true, user_id: userId });
    }

    if (action === "set_password") {
      const user_id = String(body.user_id || "");
      const password = String(body.password || "");
      if (!user_id || password.length < 8) return json({ error: "Senha inválida" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "set_email") {
      const user_id = String(body.user_id || "");
      const email = String(body.email || "").trim().toLowerCase();
      if (!user_id || !email) return json({ error: "Dados inválidos" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { email, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "set_client") {
      const user_id = String(body.user_id || "");
      const client_id = String(body.client_id || "");
      if (!user_id || !client_id) return json({ error: "Dados inválidos" }, 400);
      await admin.from("client_users").upsert(
        { user_id, client_id, created_by: userData.user.id },
        { onConflict: "user_id" }
      );
      await admin.rpc("crm_ensure_defaults", { _client_id: client_id });
      return json({ success: true });
    }

    if (action === "remove") {
      const user_id = String(body.user_id || "");
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      await admin.from("client_users").delete().eq("user_id", user_id);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (err) {
    console.error("manage-client-users error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}