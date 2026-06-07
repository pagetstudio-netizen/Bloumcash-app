import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { AppModalProvider } from "@/components/app-modal";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Landing from "@/pages/landing";
import AppGate from "@/pages/app-gate";
import Splash from "@/pages/splash";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPin from "@/pages/forgot-pin";
import Dashboard from "@/pages/dashboard";
import Encaisser from "@/pages/encaisser";
import Promotions from "@/pages/promotions";
import Paiement from "@/pages/paiement";
import Transfert from "@/pages/transfert";
import Historique from "@/pages/historique";
import Plus from "@/pages/plus";
import NotFound from "@/pages/not-found";

import MonQrCode from "@/pages/plus/mon-qr-code";
import Statistiques from "@/pages/plus/statistiques";
import Aide from "@/pages/plus/aide";
import Faq from "@/pages/plus/faq";
import SupportWhatsApp from "@/pages/plus/whatsapp";
import Parametres from "@/pages/plus/parametres";
import Conditions from "@/pages/plus/conditions";
import Confidentialite from "@/pages/plus/confidentialite";
import Apropos from "@/pages/plus/apropos";
import Notifications from "@/pages/notifications";

import ConfigTmoney from "@/pages/encaisser/tmoney";
import ConfigMoov from "@/pages/encaisser/moov";
import Produits from "@/pages/encaisser/produits";
import Boutiques from "@/pages/encaisser/boutiques";
import EncaisserWhatsApp from "@/pages/encaisser/whatsapp";

import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminTransactions from "@/pages/admin/transactions";
import AdminOperators from "@/pages/admin/operators";
import AdminBanners from "@/pages/admin/banners";
import AdminMessages from "@/pages/admin/messages";
import AdminBroadcast from "@/pages/admin/broadcast";
import AdminBlacklist from "@/pages/admin/blacklist";
import AdminSecurity from "@/pages/admin/security";
import AdminSettings from "@/pages/admin/settings";

setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Admin routes — no AuthProvider wrapper */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/transactions" component={AdminTransactions} />
      <Route path="/admin/operators" component={AdminOperators} />
      <Route path="/admin/banners" component={AdminBanners} />
      <Route path="/admin/messages" component={AdminMessages} />
      <Route path="/admin/broadcast" component={AdminBroadcast} />
      <Route path="/admin/blacklist" component={AdminBlacklist} />
      <Route path="/admin/security" component={AdminSecurity} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin" component={AdminDashboard} />

      {/* User-facing routes */}
      <Route path="/" component={Landing} />
      <Route path="/app" component={AppGate} />
      <Route path="/splash" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-pin" component={ForgotPin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/encaisser" component={Encaisser} />
      <Route path="/promotions" component={Promotions} />
      <Route path="/paiement/:reference" component={Paiement} />
      <Route path="/transfert" component={Transfert} />
      <Route path="/historique" component={Historique} />
      <Route path="/plus" component={Plus} />
      <Route path="/plus/mon-qr-code" component={MonQrCode} />
      <Route path="/plus/statistiques" component={Statistiques} />
      <Route path="/plus/aide" component={Aide} />
      <Route path="/plus/faq" component={Faq} />
      <Route path="/plus/whatsapp" component={SupportWhatsApp} />
      <Route path="/plus/parametres" component={Parametres} />
      <Route path="/plus/conditions" component={Conditions} />
      <Route path="/plus/confidentialite" component={Confidentialite} />
      <Route path="/plus/apropos" component={Apropos} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/encaisser/tmoney" component={ConfigTmoney} />
      <Route path="/encaisser/moov" component={ConfigMoov} />
      <Route path="/encaisser/produits" component={Produits} />
      <Route path="/encaisser/boutiques" component={Boutiques} />
      <Route path="/encaisser/whatsapp" component={EncaisserWhatsApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppModalProvider>
          <TooltipProvider>
            <WouterRouter base="">
              <Router />
            </WouterRouter>
          </TooltipProvider>
        </AppModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
