import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { KanbanSquare, LayoutDashboard, List as ListIcon, Plus, Webhook, Loader2, Archive, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgSwitcher } from "@/components/crm-app/OrgSwitcher";
import { PipelineSwitcher } from "@/components/crm-app/PipelineSwitcher";
import { usePipelines } from "@/hooks/usePipelines";
import { KanbanBoard } from "@/components/crm-app/KanbanBoard";
import { LeadsList } from "@/components/crm-app/LeadsList";
import { LeadDetail } from "@/components/crm-app/LeadDetail";
import { AddLeadDialog } from "@/components/crm-app/AddLeadDialog";
import { WebhookPanel } from "@/components/crm-app/WebhookPanel";
import { CrmDashboard } from "@/components/crm-app/CrmDashboard";
import { BulkActionsBar } from "@/components/crm-app/BulkActionsBar";
import { useLeadsForOrg } from "@/hooks/useCrmAppLeads";
import { Lead } from "@/lib/crm-app";
import AppShell from "@/components/layout/AppShell";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { usePipelineStages } from "@/hooks/usePipelineStages";

export default function CrmAppPage() {
  const [searchParams] = useSearchParams();
  const queryOrg = searchParams.get("org");
  const { data: orgs = [], isLoading: orgsLoading } = useMyOrganizations();
  const [orgId, setOrgId] = useState<string | null>(() => queryOrg || localStorage.getItem("crm-app:orgId"));
  const [pipelineId, setPipelineId] = useState<string | null>(() => localStorage.getItem("crm-app:pipelineId"));

  useEffect(() => {
    if (queryOrg && queryOrg !== orgId) {
      setOrgId(queryOrg);
      localStorage.setItem("crm-app:orgId", queryOrg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrg]);

  // Sync orgId with a valid/authorized organization
  useEffect(() => {
    if (!orgsLoading && orgs.length > 0) {
      if (!orgId || !orgs.some((o) => o.id === orgId)) {
        const fallbackId = orgs[0].id;
        setOrgId(fallbackId);
        localStorage.setItem("crm-app:orgId", fallbackId);
      }
    }
  }, [orgs, orgsLoading, orgId]);

  const isOrgAuthorized = orgs.some((o) => o.id === orgId);
  const activeOrgId = isOrgAuthorized ? orgId : null;

  const { data: allLeads = [], isLoading } = useLeadsForOrg(activeOrgId || undefined);
  const { data: pipelines = [] } = usePipelines(activeOrgId || undefined);
  const { data: stages = [] } = usePipelineStages(pipelineId);
  const leads = pipelineId
    ? allLeads.filter((l: any) => l.pipeline_id === pipelineId)
    : allLeads;

  const activeLeads = useMemo(() => leads.filter((l: any) => l.status !== "closed" && l.status !== "lost"), [leads]);
  const archivedLeads = useMemo(() => leads.filter((l: any) => l.status === "closed" || l.status === "lost"), [leads]);

  const activityBadges = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayCount = leads.filter(l => {
      const created = l.created_at ? new Date(l.created_at) : null;
      const updated = l.updated_at ? new Date(l.updated_at) : null;
      
      const createdMatch = created && !isNaN(created.getTime()) && created.toDateString() === todayStr;
      const updatedMatch = updated && !isNaN(updated.getTime()) && updated.toDateString() === todayStr;
      
      return createdMatch || updatedMatch;
    }).length;

    const noActivityCount = leads.filter(l => !l.notes && (!l.tags || l.tags.length === 0)).length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueCount = leads.filter(l => {
      const created = l.created_at ? new Date(l.created_at) : null;
      const updated = l.updated_at ? new Date(l.updated_at) : null;
      
      const hasCreated = created && !isNaN(created.getTime());
      const hasUpdated = updated && !isNaN(updated.getTime());
      
      const createdVal = hasCreated ? created : new Date();
      const updatedVal = hasUpdated ? updated : createdVal;
      
      return createdVal < sevenDaysAgo && updatedVal < sevenDaysAgo && l.status !== "closed" && l.status !== "lost";
    }).length;

    return { today: todayCount, none: noActivityCount, overdue: overdueCount };
  }, [leads]);

  // Sync pipelineId with a valid pipeline of the active organization
  useEffect(() => {
    if (activeOrgId && pipelineId) {
      if (!pipelines.some((p) => p.id === pipelineId)) {
        setPipelineId(null);
        localStorage.removeItem("crm-app:pipelineId");
      }
    }
  }, [activeOrgId, pipelines, pipelineId]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set());
  const clearSelection = () => setSelectedIds(new Set());

  const handleOrgChange = (id: string) => { setOrgId(id); localStorage.setItem("crm-app:orgId", id); };
  const handlePipelineChange = (id: string | null) => {
    setPipelineId(id);
    if (id) localStorage.setItem("crm-app:pipelineId", id);
    else localStorage.removeItem("crm-app:pipelineId");
  };

  const currentPipeline = pipelines.find((p) => p.id === pipelineId) || null;

  const header = (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-elevated)]">
          <KanbanSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight uppercase">
            <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">CRM</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">{leads.length} leads</p>
        </div>
      </div>
      <OrgSwitcher value={activeOrgId} onChange={handleOrgChange} />
      {activeOrgId && <PipelineSwitcher orgId={activeOrgId} value={pipelineId} onChange={handlePipelineChange} />}
      <Button size="sm" className="gap-1.5" onClick={() => setOpenAdd(true)} disabled={!activeOrgId}>
        <Plus className="h-3.5 w-3.5" /> Novo lead
      </Button>
    </div>
  );

  if (orgsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell currentPage="crm" header={header} noContainer>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {!activeOrgId ? (
          <Card className="p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Crie sua primeira organização</h2>
            <p className="text-sm text-muted-foreground">Use o botão "Nova" no topo para começar.</p>
          </Card>
        ) : (
          <Tabs defaultValue="board">
            <div className="flex flex-col gap-4">
              <TabsList className="flex-wrap h-auto bg-muted/20 border border-border/40 p-1 rounded-xl w-fit">
                <TabsTrigger value="board" className="gap-1.5"><KanbanSquare className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
                <TabsTrigger value="active" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Ativos</TabsTrigger>
                <TabsTrigger value="archived" className="gap-1.5"><Archive className="h-3.5 w-3.5" /> Arquivados</TabsTrigger>
                <TabsTrigger value="all" className="gap-1.5"><ListIcon className="h-3.5 w-3.5" /> Todos</TabsTrigger>
                <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Indicadores</TabsTrigger>
                <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
              </TabsList>

              {/* Flowlu Activity Status Badges */}
              <div className="flex items-center gap-3 flex-wrap bg-card/40 p-3 rounded-2xl border border-border/50">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status das Tarefas:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Atividades de hoje: {activityBadges.today}
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                    Sem atividades: {activityBadges.none}
                  </div>
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    Atividades atrasadas: {activityBadges.overdue}
                  </div>
                </div>
              </div>
            </div>

            <TabsContent value="dashboard" className="mt-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <CrmDashboard leads={leads} pipelines={pipelines} isAllPipelines={!pipelineId} />
              )}
            </TabsContent>
            <TabsContent value="board" className="mt-4">
              {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
                <>
                  <BulkActionsBar orgId={activeOrgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
                  <KanbanBoard
                    leads={leads}
                    orgId={activeOrgId}
                    pipelineId={pipelineId}
                    stages={stages}
                    onCardClick={(l) => { setSelected(l); setOpenDetail(true); }}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                </>
              )}
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <BulkActionsBar orgId={activeOrgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
              <LeadsList
                leads={activeLeads}
                onClick={(l) => { setSelected(l); setOpenDetail(true); }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
              />
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
              <BulkActionsBar orgId={activeOrgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
              <LeadsList
                leads={archivedLeads}
                onClick={(l) => { setSelected(l); setOpenDetail(true); }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
              />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <BulkActionsBar orgId={activeOrgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
              <LeadsList
                leads={leads}
                onClick={(l) => { setSelected(l); setOpenDetail(true); }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
              />
            </TabsContent>
            <TabsContent value="webhooks" className="mt-4 max-w-2xl">
              <WebhookPanel orgId={activeOrgId} pipelineId={pipelineId} pipelineName={currentPipeline?.name} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <LeadDetail lead={selected} orgId={activeOrgId || ""} open={openDetail} onClose={() => setOpenDetail(false)} />
      {activeOrgId && <AddLeadDialog orgId={activeOrgId} pipelineId={pipelineId} open={openAdd} onClose={() => setOpenAdd(false)} />}
    </AppShell>
  );
}