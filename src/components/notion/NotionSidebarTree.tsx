import { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ChevronDown, Plus, FileText, Folder, Loader2 } from "lucide-react";
import { useSubpages, useCreateSubpage, Subpage } from "@/hooks/useSubpages";
import { useProcesses, ProcessCard } from "@/hooks/useProcesses";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NotionSidebarTreeProps {
  isSidebarOpen: boolean;
}

export function NotionSidebarTree({ isSidebarOpen }: NotionSidebarTreeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: subpages = [], isLoading: loadingSubpages } = useSubpages();
  const { data: processes = [], isLoading: loadingProcesses } = useProcesses();
  const createSubpage = useCreateSubpage();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateChild = async (parentId: string, parentTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const newPage = await createSubpage.mutateAsync({
        title: "Nova Sub-página",
        parent_process_id: parentId,
      });
      toast.success(`Sub-página criada em "${parentTitle}"`);
      setExpandedIds((prev) => ({ ...prev, [parentId]: true }));
      navigate(`/processos/pagina/${newPage.id}`);
    } catch {
      toast.error("Erro ao criar sub-página");
    }
  };

  // Group subpages by parent_process_id
  const subpagesByParent = useMemo(() => {
    const map = new Map<string, Subpage[]>();
    for (const page of subpages) {
      const parentId = page.parent_process_id || "root";
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(page);
    }
    return map;
  }, [subpages]);

  const renderSubpageTree = (page: Subpage, depth = 0) => {
    const children = subpagesByParent.get(page.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedIds[page.id];
    const isCurrentActive = location.pathname === `/processos/pagina/${page.id}`;

    return (
      <div key={page.id} className="space-y-0.5">
        <Link
          to={`/processos/pagina/${page.id}`}
          className={cn(
            "flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors group cursor-pointer",
            isCurrentActive
              ? "bg-[#7a9d96]/20 text-[#7a9d96] font-bold"
              : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-white"
          )}
          style={{ paddingLeft: `${Math.max(8, depth * 12 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(page.id, e)}
                className="p-0.5 text-muted-foreground hover:text-white rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-[#7a9d96]" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0" />
                )}
              </button>
            ) : (
              <span className="w-3" />
            )}
            <span className="text-xs shrink-0 select-none">
              {page.icon_emoji || "📄"}
            </span>
            <span className="truncate text-[11px] font-medium">
              {page.title || "Sem título"}
            </span>
          </div>

          <button
            onClick={(e) => handleCreateChild(page.id, page.title || "Página", e)}
            title="Criar sub-página aqui"
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#2c2c2b] text-muted-foreground hover:text-[#7a9d96] rounded transition-opacity"
          >
            <Plus className="h-3 w-3" />
          </button>
        </Link>

        {isExpanded && hasChildren && (
          <div className="space-y-0.5">
            {children.map((child) => renderSubpageTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isSidebarOpen) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-sidebar-border/40">
      <div className="flex items-center justify-between px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>Árvore do Notion</span>
        {(loadingSubpages || loadingProcesses) && (
          <Loader2 className="h-3 w-3 animate-spin text-[#7a9d96]" />
        )}
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 font-sans">
        {/* Root Processes */}
        {processes.map((proc) => {
          const children = subpagesByParent.get(proc.id) || [];
          const hasChildren = children.length > 0;
          const isExpanded = !!expandedIds[proc.id];

          return (
            <div key={proc.id} className="space-y-0.5">
              <div
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs text-sidebar-foreground/90 hover:bg-white/[0.04] transition-colors group cursor-pointer"
              >
                <div
                  onClick={() => navigate("/processos")}
                  className="flex items-center gap-1.5 min-w-0 flex-1"
                >
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleExpand(proc.id, e)}
                      className="p-0.5 text-muted-foreground hover:text-white rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-[#7a9d96]" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <Folder className="h-3 w-3 text-[#7a9d96] shrink-0" />
                  )}
                  <span className="truncate text-[11px] font-bold text-[#e3e2e0]">
                    {proc.name}
                  </span>
                </div>

                <button
                  onClick={(e) => handleCreateChild(proc.id, proc.name, e)}
                  title="Criar sub-página neste processo"
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#2c2c2b] text-muted-foreground hover:text-[#7a9d96] rounded transition-opacity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {isExpanded && hasChildren && (
                <div className="space-y-0.5">
                  {children.map((child) => renderSubpageTree(child, 1))}
                </div>
              )}
            </div>
          );
        })}

        {/* Root Subpages (independent) */}
        {(subpagesByParent.get("root") || []).map((page) => renderSubpageTree(page, 0))}
      </div>
    </div>
  );
}
