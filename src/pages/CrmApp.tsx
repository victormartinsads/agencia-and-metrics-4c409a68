import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KanbanSquare, List as ListIcon, Plus, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgSwitcher } from "@/components/crm-app/OrgSwitcher";
import { KanbanBoard } from "@/components/crm-app/KanbanBoard";
import { LeadsList } from "@/components/crm-app/LeadsList";
import { LeadDetail } from "@/components/crm-app/LeadDetail";
import { AddLeadDialog } from "@/components/crm-app/AddLeadDialog";
import { WebhookPanel } from "@/components/crm-app/WebhookPanel";
import { useLeadsForOrg } from "@/hooks/useCrmAppLeads";
import { Lead } from "@/lib/crm-app";

export default function CrmAppPage() {
  const [orgId, setOrgId] = useState<string | null>(() => localStorage.getItem("crm-app:orgId"));
  const { data: leads = [], isLoading } = useLeadsForOrg(orgId || undefined);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  const handleOrgChange = (id: string) => { setOrgId(id); localStorage.setItem("crm-app:orgId", id); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <KanbanSquare className="h-5 w-5 text-primary" /> CRM
            </h1>
            <p className="text-xs text-muted-foreground">{leads.length} leads</p>
          </div>
          <OrgSwitcher value={orgId} onChange={handleOrgChange} />
          <Button size="sm" className="gap-1.5" onClick={() => setOpenAdd(true)} disabled={!orgId}>
            <Plus className="h-3.5 w-3.5" /> Novo lead
          </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {!orgId ? (
          <Card className="p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Crie sua primeira organização</h2>
            <p className="text-sm text-muted-foreground">Use o botão "Nova" no topo para começar.</p>
          </Card>
        ) : (
          <Tabs defaultValue="board">
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5"><KanbanSquare className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><ListIcon className="h-3.5 w-3.5" /> Lista</TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="mt-4">
              {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> :
                <KanbanBoard leads={leads} orgId={orgId} onCardClick={(l) => { setSelected(l); setOpenDetail(true); }} />}
            </TabsContent>
            <TabsContent value="list" className="mt-4">
              <LeadsList leads={leads} onClick={(l) => { setSelected(l); setOpenDetail(true); }} />
            </TabsContent>
            <TabsContent value="webhooks" className="mt-4 max-w-2xl">
              <WebhookPanel orgId={orgId} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <LeadDetail lead={selected} orgId={orgId || ""} open={openDetail} onClose={() => setOpenDetail(false)} />
      {orgId && <AddLeadDialog orgId={orgId} open={openAdd} onClose={() => setOpenAdd(false)} />}
    </div>
  );
}