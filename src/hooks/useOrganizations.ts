import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

const sb = supabase as any;

export function useMyOrganizations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["my-orgs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: members, error } = await sb
        .from("organization_members")
        .select("organization_id, role, organizations(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      const own = (members || [])
        .filter((m: any) => m.organizations)
        .map((m: any) => ({ ...m.organizations, role: m.role }));

      // Admin/editor da plataforma: incluir TODAS as orgs vinculadas a clientes
      const { data: roles } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const isPlatformStaff = (roles || []).some(
        (r: any) => r.role === "admin" || r.role === "editor",
      );

      let merged = own;
      if (isPlatformStaff) {
        const { data: clientOrgs } = await sb
          .from("organizations")
          .select("*")
          .not("client_id", "is", null);
        const ids = new Set(merged.map((o: any) => o.id));
        for (const o of clientOrgs || []) {
          if (!ids.has(o.id)) merged.push({ ...o, role: "admin" });
        }
      }
      // Ordena por nome
      merged.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      return merged as (Organization & { role: OrgMember["role"] })[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`my-orgs-sync:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["my-orgs", user.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organizations" },
        () => {
          qc.invalidateQueries({ queryKey: ["my-orgs", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  return query;
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { data: org, error } = await sb
        .from("organizations")
        .insert({ name, slug })
        .select()
        .single();
      if (error) throw error;
      const { error: mErr } = await sb.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });
      if (mErr) throw mErr;
      return org as Organization;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-orgs"] }),
  });
}

export function useOrgMembers(orgId?: string) {
  return useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("organization_members")
        .select("*, profiles:user_id(email, full_name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data as any[];
    },
  });
}