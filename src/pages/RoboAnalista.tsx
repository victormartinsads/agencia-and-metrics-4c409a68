import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InboxView } from "@/components/robo-analista/InboxView";
import { ConfigView } from "@/components/robo-analista/ConfigView";
import { Bot, Settings, Inbox } from "lucide-react";

export default function RoboAnalista() {
  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              Robô Analista 24/7
            </h1>
            <p className="text-muted-foreground mt-2">
              Seu assistente inteligente para otimização de campanhas. Analisa métricas e sugere ações automáticas.
            </p>
          </div>
        </div>

        <Tabs defaultValue="inbox" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox de Ações
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuração de Metas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4 outline-none">
            <InboxView />
          </TabsContent>

          <TabsContent value="config" className="space-y-4 outline-none">
            <ConfigView />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
