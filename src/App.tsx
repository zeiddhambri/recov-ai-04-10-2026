import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Dossiers from "./pages/Dossiers";
import Analytics from "./pages/Analytics";

import Litigation from "./pages/Litigation";
import LitigationDetail from "./pages/LitigationDetail";
import Leasing from "./pages/Leasing";
import LeasingNew from "./pages/LeasingNew";
import LeasingDetail from "./pages/LeasingDetail";
import LeasingImport from "./pages/LeasingImport";
import RegulatoryWatch from "./pages/RegulatoryWatch";
import Reporting from "./pages/Reporting";
import Settings from "./pages/Settings";
import Scoring from "./pages/Scoring";
import Relances from "./pages/Relances";
import DecisionCredit from "./pages/DecisionCredit";
import Ifrs9Engine from "./pages/Ifrs9Engine";
import Factoring from "./pages/Factoring";
import Microfinance from "./pages/Microfinance";
import TousPortefeuilles from "./pages/portefeuilles/TousPortefeuilles";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

import MoteurRelance from "./pages/MoteurRelance";
import ReglesEscalade from "./pages/ReglesEscalade";
import ModelesMessages from "./pages/ModelesMessages";
import Workflows from "./pages/Workflows";

import TableauDeBordGlobal from "./pages/pilotage/TableauDeBordGlobal";
import IndicateursRecouvrement from "./pages/pilotage/IndicateursRecouvrement";
import IndicateursContentieux from "./pages/pilotage/IndicateursContentieux";
import Rapports from "./pages/pilotage/Rapports";
import CreditIfrs9 from "./pages/CreditIfrs9";
import Client360 from "./pages/Client360";
import IntegrationsBancaires from "./pages/IntegrationsBancaires";
import EnterpriseSecurity from "./pages/EnterpriseSecurity";
import TotpAssistant from "./pages/TotpAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="recovai-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Navigate to="/pilotage/tableau-de-bord-global" replace />} />
              <Route path="/pilotage/tableau-de-bord-global" element={<TableauDeBordGlobal />} />
              <Route path="/dossiers" element={<Dossiers />} />
              <Route path="/client-360" element={<Client360 />} />
              <Route path="/analytics" element={<Navigate to="/pilotage/indicateurs-recouvrement" replace />} />
              <Route path="/pilotage/indicateurs-recouvrement" element={<IndicateursRecouvrement />} />
              <Route path="/pilotage/indicateurs-contentieux" element={<IndicateursContentieux />} />
              
              <Route path="/litigation" element={<Litigation />} />
              <Route path="/litigation/:id" element={<LitigationDetail />} />
              <Route path="/leasing" element={<Leasing />} />
              <Route path="/leasing/new" element={<LeasingNew />} />
              <Route path="/leasing/import" element={<LeasingImport />} />
              <Route path="/leasing/:id" element={<LeasingDetail />} />
              <Route path="/regulatory" element={<RegulatoryWatch />} />
              <Route path="/regulatory/ifrs9-engine" element={<Ifrs9Engine />} />
              <Route path="/reporting" element={<Navigate to="/pilotage/rapports" replace />} />
              <Route path="/pilotage/rapports" element={<Rapports />} />
              <Route path="/scoring" element={<Scoring />} />
              <Route path="/relances" element={<Relances />} />
              <Route path="/relances/decision-credit" element={<DecisionCredit />} />
              <Route path="/automatisation/moteur-relance" element={<MoteurRelance />} />
              <Route path="/automatisation/regles-escalade" element={<ReglesEscalade />} />
              <Route path="/automatisation/modeles-messages" element={<ModelesMessages />} />
              <Route path="/automatisation/workflows" element={<Workflows />} />
              <Route path="/factoring" element={<Factoring />} />
              <Route path="/microfinance" element={<Microfinance />} />
              <Route path="/portefeuilles" element={<Navigate to="/portefeuilles/tous" replace />} />
              <Route path="/portefeuilles/tous" element={<TousPortefeuilles />} />
              <Route path="/portefeuilles/microfinance" element={<Microfinance />} />
              <Route path="/portefeuilles/factoring" element={<Factoring />} />
              <Route path="/portefeuilles/leasing" element={<Leasing />} />
              <Route path="/credit-ifrs9" element={<Navigate to="/credit-ifrs9/nouveau" replace />} />
              <Route path="/credit-ifrs9/:activeTab" element={<CreditIfrs9 />} />
              <Route path="/integrations-bancaires" element={<IntegrationsBancaires />} />
              <Route path="/integrations" element={<Navigate to="/integrations-bancaires" replace />} />
              <Route path="/enterprise-security" element={<EnterpriseSecurity />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/totp-assistant" element={<TotpAssistant />} />
            </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
