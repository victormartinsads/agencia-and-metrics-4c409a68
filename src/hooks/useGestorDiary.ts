import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserRole } from "./useUserRole";

// Type definitions
export interface GestorStaffRole {
  id: string;
  user_id: string;
  role: "admin" | "ceo" | "diretor" | "gestor";
  created_at: string;
}

export interface GestorDiary {
  id: string;
  gestor_id: string;
  meta_semana: Array<{ id: string; text: string; done: boolean }>;
  pedidos_cliente: Array<{ id: string; text: string; done: boolean }>;
  created_at?: string;
}

export interface GestorDiaryTask {
  id: string;
  gestor_id: string;
  title: string;
  tag?: string;
  status: "pending" | "done";
  created_at: string;
}

export interface GestorDiaryLog {
  id: string;
  gestor_id: string;
  date: string;
  icon?: string;
  content: string;
  created_at: string;
}

export interface GestorDiaryClient {
  id: string;
  gestor_id: string;
  client_name: string;
  status: "Pendente" | "Configurando" | "Em andamento" | "Pausado";
  created_at: string;
  client_id?: string;
}

export interface GestorDiaryCalendarEvent {
  id: string;
  gestor_id: string;
  date: string;
  title: string;
  meet_link?: string;
  status: "pending" | "done";
  created_at: string;
}

// LocalStorage helpers for resilient fallback
const getLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const val = localStorage.getItem(`diario-gestor:${key}`);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setLocal = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(`diario-gestor:${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("Erro ao salvar localmente", e);
  }
};

// Check if error is related to missing relation (table doesn't exist yet)
const isMissingTableError = (error: any) => {
  const msg = (error?.message || "").toLowerCase();
  const hint = (error?.hint || "").toLowerCase();
  const details = (error?.details || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    hint.includes("table") ||
    details.includes("table")
  );
};

/**
 * Hook to retrieve staff custom roles
 */
export function useStaffRoles() {
  return useQuery({
    queryKey: ["staff-roles"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("staff_roles").select("*");
        if (error) throw error;
        return (data || []) as GestorStaffRole[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorStaffRole[]>("staff_roles", []);
        }
        throw err;
      }
    },
  });
}

/**
 * Mutation to update or set custom role for a team member
 */
export function useSetStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: GestorStaffRole["role"] }) => {
      try {
        const { data, error } = await (supabase as any)
          .from("staff_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id" })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<GestorStaffRole[]>("staff_roles", []);
          const existing = list.findIndex((x) => x.user_id === userId);
          const updated: GestorStaffRole = {
            id: `local-role-${userId}`,
            user_id: userId,
            role,
            created_at: new Date().toISOString(),
          };
          if (existing > -1) list[existing] = updated;
          else list.push(updated);
          setLocal("staff_roles", list);
          return updated;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-roles"] });
      qc.invalidateQueries({ queryKey: ["user-role"] }); // Invalidate to sync user role
    },
  });
}

export function useStaffMemberRole(userId?: string) {
  const { data: roles = [] } = useStaffRoles();
  const { data: sysRole } = useUserRole();
  const userRole = roles.find((r) => r.user_id === userId);
  const realRole = userRole?.role || null;
  
  const isRealAdmin = sysRole?.isAdmin || realRole === "admin";
  let roleValue = realRole;

  // Role impersonation/simulation (if real role is admin or system admin)
  if (isRealAdmin) {
    const simulated = localStorage.getItem("simulated-staff-role");
    if (simulated && ["gestor", "diretor", "ceo", "admin"].includes(simulated)) {
      roleValue = simulated as any;
    } else if (simulated === "gerente") {
      roleValue = "diretor" as any;
    } else {
      // Default system admins to 'admin' so they land on /clients by default
      roleValue = "admin";
    }
  }

  return {
    role: (roleValue as any) === "gerente" ? "diretor" : roleValue,
    isAdmin: roleValue === "admin",
    isCeo: roleValue === "ceo",
    isGerente: roleValue === "diretor" || (roleValue as any) === "gerente",
    isDiretor: roleValue === "diretor" || (roleValue as any) === "gerente",
    isGestor: roleValue === "gestor",
    realRole: (realRole as any) === "gerente" ? "diretor" : realRole,
  };
}

/**
 * Hook to load the active diary parameters (meta_semana, pedidos_cliente)
 */
export function useGestorDiary(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-diary", gestorId],
    queryFn: async () => {
      if (!gestorId) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diaries")
          .select("*")
          .eq("gestor_id", gestorId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          return {
            id: `temp-${gestorId}`,
            gestor_id: gestorId,
            meta_semana: [],
            pedidos_cliente: [],
          } as GestorDiary;
        }
        return data as GestorDiary;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorDiary>(`diary:${gestorId}`, {
            id: `local-diary-${gestorId}`,
            gestor_id: gestorId,
            meta_semana: [],
            pedidos_cliente: [],
          });
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Hook to save general parameters (meta_semana, pedidos_cliente)
 */
export function useSaveGestorDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (diary: Partial<GestorDiary> & { gestor_id: string }) => {
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diaries")
          .upsert(diary, { onConflict: "gestor_id" })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const current = getLocal<GestorDiary>(`diary:${diary.gestor_id}`, {
            id: `local-diary-${diary.gestor_id}`,
            gestor_id: diary.gestor_id,
            meta_semana: [],
            pedidos_cliente: [],
          });
          const updated = { ...current, ...diary };
          setLocal(`diary:${diary.gestor_id}`, updated);
          return updated;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-diary", variables.gestor_id] });
    },
  });
}

/**
 * Hook to retrieve routine checklist tasks
 */
export function useGestorTasks(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-tasks", gestorId],
    queryFn: async () => {
      if (!gestorId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_tasks")
          .select("*")
          .eq("gestor_id", gestorId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return (data || []) as GestorDiaryTask[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorDiaryTask[]>(`tasks:${gestorId}`, []);
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Mutation to manage routine tasks (create/update/delete)
 */
export function useManageGestorTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      task,
    }: {
      action: "insert" | "update" | "delete";
      task: Partial<GestorDiaryTask> & { gestor_id: string; id?: string };
    }) => {
      const gestorId = task.gestor_id;
      try {
        if (action === "insert") {
          const { data, error } = await (supabase as any)
            .from("gestor_diary_tasks")
            .insert({ title: task.title, tag: task.tag, status: "pending", gestor_id: gestorId })
            .select()
            .single();
          if (error) throw error;
          return data;
        } else if (action === "update") {
          if (!task.id) throw new Error("Task ID is required for updates");
          const { data, error } = await (supabase as any)
            .from("gestor_diary_tasks")
            .update({ title: task.title, tag: task.tag, status: task.status })
            .eq("id", task.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          if (!task.id) throw new Error("Task ID is required for deletes");
          const { error } = await (supabase as any).from("gestor_diary_tasks").delete().eq("id", task.id);
          if (error) throw error;
          return { id: task.id, deleted: true };
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<GestorDiaryTask[]>(`tasks:${gestorId}`, []);
          if (action === "insert") {
            const inserted: GestorDiaryTask = {
              id: `local-task-${Date.now()}`,
              gestor_id: gestorId,
              title: task.title || "",
              tag: task.tag,
              status: "pending",
              created_at: new Date().toISOString(),
            };
            list.push(inserted);
            setLocal(`tasks:${gestorId}`, list);
            return inserted;
          } else if (action === "update") {
            const idx = list.findIndex((t) => t.id === task.id);
            if (idx > -1) {
              list[idx] = { ...list[idx], ...task } as GestorDiaryTask;
              setLocal(`tasks:${gestorId}`, list);
              return list[idx];
            }
          } else {
            const filtered = list.filter((t) => t.id !== task.id);
            setLocal(`tasks:${gestorId}`, filtered);
            return { id: task.id, deleted: true };
          }
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-tasks", variables.task.gestor_id] });
    },
  });
}

/**
 * Hook to retrieve logs/notes
 */
export function useGestorLogs(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-logs", gestorId],
    queryFn: async () => {
      if (!gestorId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_logs")
          .select("*")
          .eq("gestor_id", gestorId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []) as GestorDiaryLog[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorDiaryLog[]>(`logs:${gestorId}`, []);
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Mutation to manage logs/notes (create/delete)
 */
export function useManageGestorLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      log,
    }: {
      action: "insert" | "delete";
      log: Partial<GestorDiaryLog> & { gestor_id: string; id?: string };
    }) => {
      const gestorId = log.gestor_id;
      try {
        if (action === "insert") {
          const { data, error } = await (supabase as any)
            .from("gestor_diary_logs")
            .insert({
              gestor_id: gestorId,
              date: log.date || new Date().toISOString().split("T")[0],
              icon: log.icon,
              content: log.content || "",
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          if (!log.id) throw new Error("Log ID is required for deletion");
          const { error } = await (supabase as any).from("gestor_diary_logs").delete().eq("id", log.id);
          if (error) throw error;
          return { id: log.id, deleted: true };
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<GestorDiaryLog[]>(`logs:${gestorId}`, []);
          if (action === "insert") {
            const inserted: GestorDiaryLog = {
              id: `local-log-${Date.now()}`,
              gestor_id: gestorId,
              date: log.date || new Date().toISOString().split("T")[0],
              icon: log.icon,
              content: log.content || "",
              created_at: new Date().toISOString(),
            };
            list.unshift(inserted);
            setLocal(`logs:${gestorId}`, list);
            return inserted;
          } else {
            const filtered = list.filter((l) => l.id !== log.id);
            setLocal(`logs:${gestorId}`, filtered);
            return { id: log.id, deleted: true };
          }
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-logs", variables.log.gestor_id] });
    },
  });
}

/**
 * Hook to retrieve managed clients list
 */
export function useGestorClients(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-clients", gestorId],
    queryFn: async () => {
      if (!gestorId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_clients")
          .select("*")
          .eq("gestor_id", gestorId)
          .order("client_name", { ascending: true });

        if (error) throw error;
        return (data || []) as GestorDiaryClient[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorDiaryClient[]>(`clients:${gestorId}`, []);
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Mutation to manage gestor clients (create/update/delete)
 */
export function useManageGestorClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      item,
    }: {
      action: "insert" | "update" | "delete";
      item: Partial<GestorDiaryClient> & { gestor_id: string; id?: string };
    }) => {
      const gestorId = item.gestor_id;
      try {
        if (action === "insert") {
          const { data, error } = await (supabase as any)
            .from("gestor_diary_clients")
            .insert({
              gestor_id: gestorId,
              client_name: item.client_name,
              status: item.status || "Pendente",
              client_id: item.client_id,
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        } else if (action === "update") {
          if (!item.id) throw new Error("ID is required for updates");
          const { data, error } = await (supabase as any)
            .from("gestor_diary_clients")
            .update({ status: item.status, client_name: item.client_name, client_id: item.client_id })
            .eq("id", item.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          if (!item.id) throw new Error("ID is required for deletion");
          const { error } = await (supabase as any).from("gestor_diary_clients").delete().eq("id", item.id);
          if (error) throw error;
          return { id: item.id, deleted: true };
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<GestorDiaryClient[]>(`clients:${gestorId}`, []);
          if (action === "insert") {
            const inserted: GestorDiaryClient = {
              id: `local-client-${Date.now()}`,
              gestor_id: gestorId,
              client_name: item.client_name || "",
              status: item.status || "Pendente",
              created_at: new Date().toISOString(),
              client_id: item.client_id,
            };
            list.push(inserted);
            setLocal(`clients:${gestorId}`, list);
            return inserted;
          } else if (action === "update") {
            const idx = list.findIndex((c) => c.id === item.id);
            if (idx > -1) {
              list[idx] = { ...list[idx], ...item } as GestorDiaryClient;
              setLocal(`clients:${gestorId}`, list);
              return list[idx];
            }
          } else {
            const filtered = list.filter((c) => c.id !== item.id);
            setLocal(`clients:${gestorId}`, filtered);
            return { id: item.id, deleted: true };
          }
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-clients", variables.item.gestor_id] });
    },
  });
}

/**
 * Hook to retrieve calendar events
 */
export function useGestorCalendar(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-calendar", gestorId],
    queryFn: async () => {
      if (!gestorId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_calendar")
          .select("*")
          .eq("gestor_id", gestorId)
          .order("date", { ascending: true });

        if (error) throw error;
        return (data || []) as GestorDiaryCalendarEvent[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorDiaryCalendarEvent[]>(`calendar:${gestorId}`, []);
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Mutation to manage calendar events (create/update/delete)
 */
export function useManageGestorCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      event,
    }: {
      action: "insert" | "update" | "delete";
      event: Partial<GestorDiaryCalendarEvent> & { gestor_id: string; id?: string };
    }) => {
      const gestorId = event.gestor_id;
      try {
        if (action === "insert") {
          const { data, error } = await (supabase as any)
            .from("gestor_diary_calendar")
            .insert({
              gestor_id: gestorId,
              date: event.date,
              title: event.title,
              meet_link: event.meet_link,
              status: "pending",
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        } else if (action === "update") {
          if (!event.id) throw new Error("ID is required for updates");
          const { data, error } = await (supabase as any)
            .from("gestor_diary_calendar")
            .update({ status: event.status, title: event.title, meet_link: event.meet_link, date: event.date })
            .eq("id", event.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          if (!event.id) throw new Error("ID is required for deletion");
          const { error } = await (supabase as any).from("gestor_diary_calendar").delete().eq("id", event.id);
          if (error) throw error;
          return { id: event.id, deleted: true };
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<GestorDiaryCalendarEvent[]>(`calendar:${gestorId}`, []);
          if (action === "insert") {
            const inserted: GestorDiaryCalendarEvent = {
              id: `local-event-${Date.now()}`,
              gestor_id: gestorId,
              date: event.date || new Date().toISOString().split("T")[0],
              title: event.title || "",
              meet_link: event.meet_link,
              status: "pending",
              created_at: new Date().toISOString(),
            };
            list.push(inserted);
            setLocal(`calendar:${gestorId}`, list);
            return inserted;
          } else if (action === "update") {
            const idx = list.findIndex((e) => e.id === event.id);
            if (idx > -1) {
              list[idx] = { ...list[idx], ...event } as GestorDiaryCalendarEvent;
              setLocal(`calendar:${gestorId}`, list);
              return list[idx];
            }
          } else {
            const filtered = list.filter((e) => e.id !== event.id);
            setLocal(`calendar:${gestorId}`, filtered);
            return { id: event.id, deleted: true };
          }
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-calendar", variables.event.gestor_id] });
    },
  });
}

/**
 * Hook to retrieve the Notion-like template state (toggles, checkboxes, text)
 */
export function useGestorNotionData(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-notion-data", gestorId],
    queryFn: async () => {
      if (!gestorId) return {};
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_notion")
          .select("notion_data")
          .eq("gestor_id", gestorId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return {};
        return data.notion_data || {};
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<any>(`notion_data:${gestorId}`, {});
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

/**
 * Mutation to save the Notion-like template state
 */
export function useSaveGestorNotionData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gestor_id, data }: { gestor_id: string; data: any }) => {
      try {
        const { data: result, error } = await (supabase as any)
          .from("gestor_diary_notion")
          .upsert({ gestor_id, notion_data: data }, { onConflict: "gestor_id" })
          .select()
          .single();

        if (error) throw error;
        return result;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          setLocal(`notion_data:${gestor_id}`, data);
          return data;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-notion-data", variables.gestor_id] });
    },
  });
}

// ---- Novo Hook para Dados Adicionais do Cliente (Saúde e Tarefas) ----
export interface GestorClientMeta {
  gestor_id: string;
  client_id: string;
  health: number; // 0 a 10
  tasks: Array<{ id: string; text: string; done: boolean }>;
}

export function useGestorClientMeta(gestorId: string, clientId: string) {
  return useQuery({
    queryKey: ["gestor-client-meta", gestorId, clientId],
    queryFn: async () => {
      if (!gestorId || !clientId) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_diary_client_meta")
          .select("*")
          .eq("gestor_id", gestorId)
          .eq("client_id", clientId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return {
            gestor_id: gestorId,
            client_id: clientId,
            health: 10,
            tasks: [],
          } as GestorClientMeta;
        }
        return data as GestorClientMeta;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorClientMeta>(`client_meta:${gestorId}:${clientId}`, {
            gestor_id: gestorId,
            client_id: clientId,
            health: 10,
            tasks: [],
          });
        }
        throw err;
      }
    },
    enabled: !!gestorId && !!clientId,
  });
}

export function useSaveGestorClientMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gestor_id, client_id, meta }: { gestor_id: string; client_id: string; meta: Partial<GestorClientMeta> }) => {
      try {
        const { data: current } = await (supabase as any)
          .from("gestor_diary_client_meta")
          .select("*")
          .eq("gestor_id", gestor_id)
          .eq("client_id", client_id)
          .maybeSingle();

        const newMeta = {
          gestor_id,
          client_id,
          health: meta.health ?? (current?.health ?? 10),
          tasks: meta.tasks ?? (current?.tasks ?? []),
        };

        const { data: result, error } = await (supabase as any)
          .from("gestor_diary_client_meta")
          .upsert(newMeta, { onConflict: "gestor_id, client_id" })
          .select()
          .single();

        if (error) throw error;
        return result;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const current = getLocal<GestorClientMeta>(`client_meta:${gestor_id}:${client_id}`, {
            gestor_id,
            client_id,
            health: 10,
            tasks: [],
          });
          const updated = { ...current, ...meta };
          setLocal(`client_meta:${gestor_id}:${client_id}`, updated);
          return updated;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-client-meta", variables.gestor_id, variables.client_id] });
    },
  });
}

// ---- Novo Hook para Dados Adicionais do Perfil do Gestor (Salário, Cargo, etc) ----
export interface GestorProfileMeta {
  gestor_id: string;
  salary: string;
  role_override: string;
  name_override: string;
  email_override: string;
  banner_override?: string;
}

export function useGestorProfileMeta(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-profile-meta", gestorId],
    queryFn: async () => {
      if (!gestorId) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("gestor_profile_meta")
          .select("*")
          .eq("gestor_id", gestorId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return {
            gestor_id: gestorId,
            salary: "",
            role_override: "",
            name_override: "",
            email_override: "",
            banner_override: "",
          } as GestorProfileMeta;
        }
        return data as GestorProfileMeta;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<GestorProfileMeta>(`profile_meta:${gestorId}`, {
            gestor_id: gestorId,
            salary: "",
            role_override: "",
            name_override: "",
            email_override: "",
            banner_override: "",
          });
        }
        throw err;
      }
    },
    enabled: !!gestorId,
  });
}

export function useSaveGestorProfileMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gestor_id, meta }: { gestor_id: string; meta: Partial<GestorProfileMeta> }) => {
      try {
        const { data: current } = await (supabase as any)
          .from("gestor_profile_meta")
          .select("*")
          .eq("gestor_id", gestor_id)
          .maybeSingle();

        const newMeta = {
          gestor_id,
          salary: meta.salary ?? (current?.salary ?? ""),
          role_override: meta.role_override ?? (current?.role_override ?? ""),
          name_override: meta.name_override ?? (current?.name_override ?? ""),
          email_override: meta.email_override ?? (current?.email_override ?? ""),
          banner_override: meta.banner_override ?? (current?.banner_override ?? ""),
        };

        const { data: result, error } = await (supabase as any)
          .from("gestor_profile_meta")
          .upsert(newMeta, { onConflict: "gestor_id" })
          .select()
          .single();

        if (error) throw error;
        return result;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const current = getLocal<GestorProfileMeta>(`profile_meta:${gestor_id}`, {
            gestor_id,
            salary: "",
            role_override: "",
            name_override: "",
            email_override: "",
            banner_override: "",
          });
          const updated = { ...current, ...meta };
          setLocal(`profile_meta:${gestor_id}`, updated);
          return updated;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestor-profile-meta", variables.gestor_id] });
    },
  });
}

// ==========================================
// CLIENT DIARY NOTION DATA (Ficha do Cliente)
// ==========================================

export function useClientNotionData(clientId: string) {
  return useQuery({
    queryKey: ["client-notion-data", clientId],
    queryFn: async () => {
      if (!clientId) return {};
      try {
        const { data, error } = await (supabase as any)
          .from("client_diary_notion")
          .select("notion_data")
          .eq("client_id", clientId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return {};
        return data.notion_data || {};
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<any>(`client_notion_data:${clientId}`, {});
        }
        throw err;
      }
    },
  });
}

export function useSaveClientNotionData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, data }: { client_id: string; data: any }) => {
      try {
        const { error } = await (supabase as any)
          .from("client_diary_notion")
          .upsert({ client_id, notion_data: data }, { onConflict: "client_id" });
        if (error) throw error;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          setLocal(`client_notion_data:${client_id}`, data);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["client-notion-data", variables.client_id] });
    },
  });
}

