import { useMemo, useState } from "react";
import { GAUtm } from "@/hooks/useGoogleAnalytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Props {
  utms: GAUtm[];
}

type GroupKey = "source" | "medium" | "campaign";

function aggregate(utms: GAUtm[], key: GroupKey) {
  const map = new Map<string, { sessions: number; users: number; engagedSessions: number }>();
  for (const u of utms) {
    const k = u[key] || "(not set)";
    const cur = map.get(k) || { sessions: 0, users: 0, engagedSessions: 0 };
    cur.sessions += u.sessions;
    cur.users += u.users;
    cur.engagedSessions += u.engagedSessions;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sessions - a.sessions);
}

function Row({ name, sessions, users, max }: { name: string; sessions: number; users: number; max: number }) {
  const pct = max > 0 ? (sessions / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-card-foreground font-medium" title={name}>{name}</span>
        <span className="text-muted-foreground font-mono ml-2 shrink-0">
          {sessions.toLocaleString("pt-BR")} <span className="opacity-60">· {users.toLocaleString("pt-BR")} usr</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function UtmTrafficTable({ utms }: Props) {
  const [tab, setTab] = useState<GroupKey>("source");

  const data = useMemo(() => aggregate(utms, tab), [utms, tab]);
  const max = data[0]?.sessions || 0;

  if (utms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Nenhum dado de UTM encontrado no período.
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
      <TabsList className="bg-muted/40 h-8 mb-3">
        <TabsTrigger value="source" className="text-xs h-6">Origem</TabsTrigger>
        <TabsTrigger value="medium" className="text-xs h-6">Mídia</TabsTrigger>
        <TabsTrigger value="campaign" className="text-xs h-6">Campanha</TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-0">
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {data.slice(0, 15).map((d) => (
            <Row key={d.name} name={d.name} sessions={d.sessions} users={d.users} max={max} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}