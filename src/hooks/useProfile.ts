import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role_title: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("profiles")
        .upsert(
          { user_id: user.id, email: user.email, ...patch, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert(
          { user_id: user.id, email: user.email, avatar_url: url, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      return url;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function displayName(p: Profile | null | undefined, fallbackEmail?: string | null) {
  if (!p) return fallbackEmail?.split("@")[0] || "";
  const first = (p.first_name || "").trim();
  const last = (p.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || (p.full_name || "").trim() || fallbackEmail?.split("@")[0] || "";
}