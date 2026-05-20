import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AuthClaims = { sub: string; email?: string; role?: string; [k: string]: any };

/** Validate JWT from request. Returns null if invalid. */
export async function getUserClaims(req: Request): Promise<AuthClaims | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  // Allow service-role calls (internal function-to-function) to bypass user JWT validation.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { sub: "service-role", role: "service_role" };
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  try {
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return { sub: data.user.id, email: data.user.email } as AuthClaims;
  } catch {
    return null;
  }
}

/** Returns true if user has admin or editor role. */
export async function hasAdminOrEditor(userId: string): Promise<boolean> {
  if (userId === "service-role") return true;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"])
    .limit(1);
  return !!(data && data.length > 0);
}

/** Returns true if user is admin/editor OR assigned to the client (client_users/client_assignments). */
export async function canAccessClient(userId: string, clientId: string): Promise<boolean> {
  if (userId === "service-role") return true;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"])
    .limit(1);
  if (roles && roles.length > 0) return true;
  const { data: cu } = await admin
    .from("client_users")
    .select("client_id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .limit(1);
  if (cu && cu.length > 0) return true;
  const { data: ca } = await admin
    .from("client_assignments")
    .select("client_id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .limit(1);
  return !!(ca && ca.length > 0);
}

export function unauthorized(corsHeaders: Record<string, string>, msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, msg = "Forbidden") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}