import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Clients from "./pages/Clients.tsx";
import ClientDashboard from "./pages/ClientDashboard.tsx";
import ClientSheetsConfig from "./pages/ClientSheetsConfig.tsx";
import SharedDashboard from "./pages/SharedDashboard.tsx";
import SharedCreatives from "./pages/SharedCreatives.tsx";
import PodioCreatives from "./pages/PodioCreatives.tsx";
import GoogleCallback from "./pages/GoogleCallback.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

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
            {/* Public share routes */}
            <Route path="/share/:clientId" element={<SharedDashboard />} />
            <Route path="/criativos/:clientId" element={<SharedCreatives />} />
            <Route path="/podio/:slug" element={<PodioCreatives />} />
            <Route path="/google/callback" element={<GoogleCallback />} />
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/dashboard/:clientId" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/:clientId/sheets" element={<ProtectedRoute><ClientSheetsConfig /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
