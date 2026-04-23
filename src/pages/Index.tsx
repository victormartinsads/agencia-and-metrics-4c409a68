import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { motion } from "framer-motion";
import { BarChart3, Plus, Users, Settings, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const { data: clients, isLoading } = useClients();
  const { data: role } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1000px] mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meta Ads Dashboard</h1>
              <p className="text-sm text-muted-foreground">Selecione um cliente para ver o dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role?.isAdmin && (
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1" /> Configurações
                </Button>
              </Link>
            )}
            <Link to="/clients">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" /> Gerenciar Clientes
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-8">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-16">Carregando...</p>
        ) : !clients?.length ? (
          <div className="text-center py-20 space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground">Nenhum cliente cadastrado</h2>
            <p className="text-muted-foreground text-sm">Adicione seu primeiro cliente com o token da Meta API</p>
            <Link to="/clients">
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Cliente
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/dashboard/${c.id}`}>
                  <Card className="p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-card-foreground mb-1 uppercase">{c.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {c.ad_account_ids.map((aid) => (
                        <Badge key={aid} variant="secondary" className="text-[10px] font-mono">
                          {aid}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: clients.length * 0.05 }}
            >
              <Link to="/clients">
                <Card className="p-5 border-dashed hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center justify-center h-full min-h-[140px]">
                  <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <span className="text-sm text-muted-foreground">Adicionar Cliente</span>
                </Card>
              </Link>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
