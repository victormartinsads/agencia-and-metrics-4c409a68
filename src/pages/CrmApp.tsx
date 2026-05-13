import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, KanbanSquare, LayoutDashboard, List as ListIcon, Plus, Trophy, Webhook, ExternalLink } from "lucide-react";
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
import { useOrgClient } from "@/hooks/useClientCrm";
import { Lead } from "@/lib/crm-app";
import AppShell from "@/components/layout/AppShell";

export default function CrmAppPage() {
  const [searchParams] = useSearchParams();
  const queryOrg = searchParams.get("org");
  const [orgId, setOrgId] = useState<string | null>(() => queryOrg || localStorage.getItem("crm-app:orgId"));
  const [pipelineId, setPipelineId] = useState<string | null>(() => localStorage.getItem("crm-app:pipelineId"));
  useEffect(() => {
    if (queryOrg && queryOrg !== orgId) {
      setOrgId(queryOrg);
      localStorage.setItem("crm-app:orgId", queryOrg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrg]);
  const { data: allLeads = [], isLoading } = useLeadsForOrg(orgId || undefined);
  const { data: pipelines = [] } = usePipelines(orgId || undefined);
  const leads = pipelineId
    ? allLeads.filter((l: any) => l.pipeline_id === pipelineId)
    : allLeads;
  const { data: orgClient } = useOrgClient(orgId);
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
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-primary" /> CRM
        </h1>
        <p className="text-xs text-muted-foreground">{leads.length} leads</p>
      </div>
      <OrgSwitcher value={orgId} onChange={handleOrgChange} />
      {orgId && <PipelineSwitcher orgId={orgId} value={pipelineId} onChange={handlePipelineChange} />}
      <Button size="sm" className="gap-1.5" onClick={() => setOpenAdd(true)} disabled={!orgId}>
        <Plus className="h-3.5 w-3.5" /> Novo lead
      </Button>
    </div>
  );

  return (
    <AppShell currentPage="crm" header={header} noContainer>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {!orgId ? (
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
              <TabsTrigger value="overview" className="gap-1.5" disabled={!orgClient}><BarChart3 className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
              <TabsTrigger value="podium" className="gap-1.5" disabled={!orgClient}><Trophy className="h-3.5 w-3.5" /> Pódio</TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-4">
              {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : <CrmDashboard leads={leads} />}
            </TabsContent>
            <TabsContent value="board" className="mt-4">
              {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : (
                <>
                  <BulkActionsBar orgId={orgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
                  <KanbanBoard
                    leads={leads}
                    orgId={orgId}
                    onCardClick={(l) => { setSelected(l); setOpenDetail(true); }}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                </>
              )}
            </TabsContent>
            <TabsContent value="list" className="mt-4">
              <BulkActionsBar orgId={orgId} selectedIds={Array.from(selectedIds)} onClear={clearSelection} />
              <LeadsList
                leads={leads}
                onClick={(l) => { setSelected(l); setOpenDetail(true); }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
              />
            </TabsContent>
            <TabsContent value="overview" className="mt-4">
              {orgClient ? <EmbedFrame title="Visão Geral" url={`/share/${orgClient.id}`} /> : <EmptyEmbed label="Cliente vinculado não encontrado" />}
            </TabsContent>
            <TabsContent value="podium" className="mt-4">
              {orgClient ? <EmbedFrame title="Pódio de Criativos" url={`/podio/${orgClient.slug}`} /> : <EmptyEmbed label="Cliente vinculado não encontrado" />}
            </TabsContent>
            <TabsContent value="webhooks" className="mt-4 max-w-2xl">
              <WebhookPanel orgId={orgId} pipelineId={pipelineId} pipelineName={currentPipeline?.name} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <LeadDetail lead={selected} orgId={orgId || ""} open={openDetail} onClose={() => setOpenDetail(false)} />
      {orgId && <AddLeadDialog orgId={orgId} pipelineId={pipelineId} open={openAdd} onClose={() => setOpenAdd(false)} />}
    </AppShell>
  );
}

function EmbedFrame({ title, url }: { title: string; url: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
        <a href={url} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba</Button>
        </a>
      </div>
      <iframe src={url} title={title} className="w-full" style={{ height: "calc(100vh - 280px)", minHeight: 600, border: 0 }} />
    </Card>
  );
}

function EmptyEmbed({ label }: { label: string }) {
  return <Card className="p-8 text-center text-sm text-muted-foreground">{label}</Card>;
}