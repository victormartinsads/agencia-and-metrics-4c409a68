import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, KanbanSquare, Plus, Settings as SettingsIcon, Tag, Upload, LayoutDashboard, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { useClientUserAccess } from "@/hooks/useClientUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads, usePipelineStages, useTags } from "@/hooks/useCRM";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { LeadModal } from "@/components/crm/LeadModal";
import { ManageStages } from "@/components/crm/ManageStages";
import { ManageTags } from "@/components/crm/ManageTags";
import { ImportLeadsCSV } from "@/components/crm/ImportLeadsCSV";
import { WebhookCard } from "@/components/crm/WebhookCard";

export default function CRMPage() {
  const { clientId: routeClientId } = useParams();
  const { data: role } = useUserRole();
  const { data: clientUserClientId, isLoading: cuLoading } = useClientUserAccess();
  const { signOut } = useAuth();

  // Cliente final usa seu próprio client_id (ignora rota)
  const isClientUser = role?.isClient && !role?.isAdmin && !role?.isEditor;
  const clientId = isClientUser ? clientUserClientId : routeClientId;

  const { data: clients } = useClients();
  const client = (clients || []).find((c) => c.id === clientId);
  const { data: stages = [] } = usePipelineStages(clientId || undefined);
  const { data: leads = [] } = useLeads(clientId || undefined);
  const { data: tags = [] } = useTags(clientId || undefined);

  const [editLead, setEditLead] = useState<any>(null);
  const [openModal, setOpenModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);

  if (cuLoading) return null;
  if (!clientId) {
    if (isClientUser && !clientUserClientId) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="p-6 max-w-md text-center space-y-3">
            <h1 className="text-lg font-bold">Acesso não vinculado</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta ainda não está vinculada a um cliente. Contate o administrador.
            </p>
            <Button onClick={() => signOut()} variant="outline" size="sm">Sair</Button>
          </Card>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  const openNew = (stageId: string) => { setDefaultStageId(stageId); setEditLead(null); setOpenModal(true); };
  const openEdit = (l: any) => { setEditLead(l); setOpenModal(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-3">
          {!isClientUser && (
            <Link to="/" className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <KanbanSquare className="h-5 w-5 text-primary" /> CRM — {(client?.name || "").toUpperCase()}
            </h1>
            <p className="text-xs text-muted-foreground">{leads.length} leads · {stages.length} etapas</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={isClientUser ? `/portal/dashboard` : `/dashboard/${clientId}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Button>
            </Link>
            {client?.slug && (
              <Link to={`/podio/${client.slug}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> Pódio
                </Button>
              </Link>
            )}
            <Button size="sm" className="gap-1.5" onClick={() => openNew(stages[0]?.id || "")}>
              <Plus className="h-3.5 w-3.5" /> Novo lead
            </Button>
            {isClientUser && (
              <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5"><KanbanSquare className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-3.5 w-3.5" /> Etapas</TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-4">
            <PipelineBoard
              stages={stages} leads={leads} clientId={clientId}
              onCardClick={openEdit} onAdd={openNew}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="p-4 max-w-2xl">
              <h2 className="text-sm font-semibold mb-3">Etapas do funil</h2>
              <ManageStages clientId={clientId} stages={stages} />
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <Card className="p-4 max-w-2xl">
              <h2 className="text-sm font-semibold mb-3">Tags</h2>
              <ManageTags clientId={clientId} tags={tags} />
            </Card>
          </TabsContent>

          <TabsContent value="import" className="mt-4 space-y-4 max-w-2xl">
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Importar via CSV</h2>
              <ImportLeadsCSV clientId={clientId} stages={stages} />
            </Card>
            <WebhookCard clientId={clientId} />
          </TabsContent>
        </Tabs>
      </main>

      {openModal && (
        <LeadModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          clientId={clientId}
          lead={editLead}
          stages={stages}
          tags={tags}
          defaultStageId={defaultStageId}
        />
      )}
    </div>
  );
}