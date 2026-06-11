import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KanbanSquare, LayoutDashboard, List as ListIcon, Plus, Webhook, Loader2 } from "lucide-react";
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
          <Tabs defaultValue="dashboard">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5"><KanbanSquare className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><ListIcon className="h-3.5 w-3.5" /> Lista</TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
            </TabsList>

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
            <TabsContent value="list" className="mt-4">
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