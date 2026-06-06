import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Clients from "./pages/Clients.tsx";
import ClientDashboard from "./pages/ClientDashboard.tsx";
import ClientSheetsConfig from "./pages/ClientSheetsConfig.tsx";
import ClientWebhooksConfig from "./pages/ClientWebhooksConfig.tsx";
import ClientSettings from "./pages/ClientSettings.tsx";
import SharedDashboard from "./pages/SharedDashboard.tsx";
import SharedCreatives from "./pages/SharedCreatives.tsx";
import PodioCreatives from "./pages/PodioCreatives.tsx";
import ComoEstamosPublic from "./pages/ComoEstamosPublic.tsx";
import SavedDiagnosticPublic from "./pages/SavedDiagnosticPublic.tsx";
import ClientView from "./pages/ClientView.tsx";
import GoogleCallback from "./pages/GoogleCallback.tsx";
import MetaCallback from "./pages/MetaCallback.tsx";
import Login from "./pages/Login.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Settings from "./pages/Settings.tsx";
import GestorView from "./pages/GestorView.tsx";
import GestorOverview from "./pages/GestorOverview.tsx";
import NotFound from "./pages/NotFound.tsx";
import CrmAppPage from "./pages/CrmApp.tsx";
import Portal from "./pages/Portal.tsx";
import ClientPortalRouter from "./components/ClientPortalRouter.tsx";
import FunnelPlayground from "./pages/FunnelPlayground.tsx";
import DiarioDoGestor from "./pages/DiarioDoGestor.tsx";
import TrackingHub from "./pages/TrackingHub.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Public share routes */}
            <Route path="/share/:clientId" element={<SharedDashboard />} />
            <Route path="/shared/:clientId" element={<SharedDashboard />} />
            <Route path="/v/:slug" element={<ClientView />} />
            <Route path="/criativos/:clientId" element={<SharedCreatives />} />
            <Route path="/creativos/:slug" element={<SharedCreatives />} />
            <Route path="/criativos-compartilhados/:clientId" element={<SharedCreatives />} />
            <Route path="/shared-creatives/:clientId" element={<SharedCreatives />} />
            <Route path="/podio/:slug" element={<PodioCreatives />} />
            <Route path="/como-estamos/:slug" element={<ComoEstamosPublic />} />
            <Route path="/diagnostico/:id" element={<SavedDiagnosticPublic />} />
            <Route path="/saved-diagnostic/:id" element={<SavedDiagnosticPublic />} />
            <Route path="/visao-cliente/:slug" element={<ClientView />} />
            <Route path="/funnel-playground" element={<FunnelPlayground />} />
            <Route path="/google/callback" element={<GoogleCallback />} />
            <Route path="/meta/callback" element={<MetaCallback />} />
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><ClientPortalRouter><Navigate to="/clients" replace /></ClientPortalRouter></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/dashboard/:clientId" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/:clientId/sheets" element={<ProtectedRoute><ClientSheetsConfig /></ProtectedRoute>} />
            <Route path="/clients/:clientId/webhooks" element={<ProtectedRoute><ClientWebhooksConfig /></ProtectedRoute>} />
            <Route path="/clients/:clientId/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/gestor" element={<ProtectedRoute><GestorOverview /></ProtectedRoute>} />
            <Route path="/gestor/:clientId" element={<ProtectedRoute><GestorView /></ProtectedRoute>} />
            <Route path="/diario-do-gestor" element={<ProtectedRoute><DiarioDoGestor /></ProtectedRoute>} />
            <Route path="/tracking/:clientId" element={<ProtectedRoute><TrackingHub /></ProtectedRoute>} />
            <Route path="/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />
            <Route path="/portal/dashboard" element={<ProtectedRoute><ClientPortalDashboardRedirect /></ProtectedRoute>} />
            <Route path="/crm-app" element={<ProtectedRoute><CrmAppPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useClientUserAccess } from "@/hooks/useClientUserAccess";
function ClientPortalDashboardRedirect() {
  const { data: clientId, isLoading } = useClientUserAccess();
  if (isLoading) return null;
  if (!clientId) return <Navigate to="/portal" replace />;
  return <Navigate to={`/share/${clientId}`} replace />;
}
