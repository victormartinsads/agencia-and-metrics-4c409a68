import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "editor" | "client";

export function useUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Master Admin override by email
      const isMasterAdmin = user.email?.toLowerCase() === "victordbmartins@gmail.com";

      // 1. Fetch system roles
      const { data: userRolesData, error: userRolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (userRolesErr) throw userRolesErr;
      const systemRoles = (userRolesData || []).map((r) => r.role as AppRole);

      // 2. Fetch staff roles (cast as any to bypass generated types if missing)
      const { data: staffRolesData } = await (supabase as any)
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const staffRole = staffRolesData?.role || null;

      // Determine if user has real admin permissions
      const isRealAdmin = isMasterAdmin || staffRole === "admin" || systemRoles.includes("admin");

      let activeStaffRole = staffRole;
      if (isRealAdmin) {
        const simulated = localStorage.getItem("simulated-staff-role");
        if (simulated && ["gestor", "diretor", "ceo", "admin"].includes(simulated)) {
          activeStaffRole = simulated;
        } else if (simulated === "gerente") {
          activeStaffRole = "diretor";
        }
      }

      // Determine clean role flags based on hierarchy
      const isAdminRole = isRealAdmin && (activeStaffRole === "admin" || !localStorage.getItem("simulated-staff-role"));
      const isCeoRole = isRealAdmin ? activeStaffRole === "ceo" : (staffRole === "ceo");
      const isDiretorRole = isRealAdmin ? (activeStaffRole === "diretor" || activeStaffRole === "gerente") : (staffRole === "diretor" || staffRole === "gerente");
      const isGestorRole = isRealAdmin ? activeStaffRole === "gestor" : (staffRole === "gestor");

      // A client is someone explicitly defined as client or someone with no staff roles who has 'client' system role
      const isClientRole = !isAdminRole && !isCeoRole && !isDiretorRole && !isGestorRole && 
        (systemRoles.includes("client") || (!staffRole && systemRoles.length === 0));

      // Editor flag (for backward compatibility in some pages)
      const isEditorRole = isAdminRole || isCeoRole || isDiretorRole || isGestorRole || systemRoles.includes("editor");

      return {
        roles: systemRoles,
        staffRole: activeStaffRole,
        isMasterAdmin,
        isAdmin: isAdminRole,
        isCeo: isCeoRole,
        isDiretor: isDiretorRole,
        isGestor: isGestorRole,
        isClient: isClientRole,
        isEditor: isEditorRole,
        // Detailed permissions
        canManageUsers: isAdminRole, // Only admin can manage accesses, senhas, members
        canAccessSettings: isAdminRole || isCeoRole || isDiretorRole, // Gestor and Client cannot see general settings
        canManageDiaries: isAdminRole || isCeoRole || isDiretorRole, // Can see everyone's diaries
      };
    },
    enabled: !!user,
  });
}
