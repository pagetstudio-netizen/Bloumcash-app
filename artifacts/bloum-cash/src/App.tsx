import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { AppModalProvider } from "@/components/app-modal";
import { UpdateGate, useUpdateCheck } from "@/components/update-gate";
import { ErrorBoundary } from "@/components/error-boundary";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React from "react";

/* ─── Pages utilisateur ─────────────────────────────────────────────────────── */
import Splash from "@/pages/splash";
import Offline from "@/pages/offline";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AppGate from "@/pages/app-gate";
import Onboarding from "@/pages/onboarding";
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
import Notifications from "@/pages/notifications";
import Suggestions from "@/pages/suggestions";

/* ─── Sous-pages Plus ───────────────────────────────────────────────────────── */
import MonQrCode from "@/pages/plus/mon-qr-code";
import Statistiques from "@/pages/plus/statistiques";
import Aide from "@/pages/plus/aide";
import Faq from "@/pages/plus/faq";
import SupportWhatsApp from "@/pages/plus/whatsapp";
import Parametres from "@/pages/plus/parametres";
import ModifierPin from "@/pages/plus/modifier-pin";
import Conditions from "@/pages/plus/conditions";
import Confidentialite from "@/pages/plus/confidentialite";
import Apropos from "@/pages/plus/apropos";

/* ─── Sous-pages Encaisser ──────────────────────────────────────────────────── */
import ConfigTmoney from "@/pages/encaisser/tmoney";
import ConfigMoov from "@/pages/encaisser/moov";
import Produits from "@/pages/encaisser/produits";
import Boutiques from "@/pages/encaisser/boutiques";
import EncaisserWhatsApp from "@/pages/encaisser/whatsapp";

/* ─── Pages Admin ───────────────────────────────────────────────────────────── */
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminTransactions from "@/pages/admin/transactions";
import AdminOperators from "@/pages/admin/operators";
import AdminBanners from "@/pages/admin/banners";
import AdminMessages from "@/pages/admin/messages";
import AdminBroadcast from "@/pages/admin/broadcast";
import AdminPushCampaigns from "@/pages/admin/push-campaigns";
import AdminBlacklist from "@/pages/admin/blacklist";
import AdminSecurity from "@/pages/admin/security";
import AdminSettings from "@/pages/admin/settings";
import AdminUpdates from "@/pages/admin/updates";
import AdminAdmins from "@/pages/admin/admins";
import AdminPromotions from "@/pages/admin/promotions";
import AdminFeedback from "@/pages/admin/feedback";

setAuthTokenGetter(() => localStorage.getItem("bloum_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function OnlineGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!navigator.onLine) {
      setLocation("/offline");
    }

    const handleOffline = () => setLocation("/offline");
    const handleOnline = () => {
      if (window.location.pathname === "/offline") {
        setLocation("/dashboard");
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [setLocation]);

  return <>{children}</>;
}

function SplashRedirect() {
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    const isAdminRoute = location.startsWith("/admin");
    const isPaymentRoute = location.startsWith("/paiement");
    const isAppGate = location.startsWith("/app");
    const isSplash = location === "/splash";
    const isLanding = location === "/";
    const isOnboarding = location === "/onboarding";
    if (isAdminRoute || isPaymentRoute || isAppGate || isSplash || isLanding || isOnboarding) return;

    const shown = sessionStorage.getItem("splashShown");
    if (!shown) {
      sessionStorage.setItem("splashShown", "1");
      setLocation("/splash");
    }
  }, [location, setLocation]);

  return null;
}

function Router() {
  return (
    <OnlineGuard>
      <SplashRedirect />
      <Switch>
        {/* Admin routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/transactions" component={AdminTransactions} />
        <Route path="/admin/operators" component={AdminOperators} />
        <Route path="/admin/banners" component={AdminBanners} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/broadcast" component={AdminBroadcast} />
        <Route path="/admin/push-campaigns" component={AdminPushCampaigns} />
        <Route path="/admin/blacklist" component={AdminBlacklist} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/admins" component={AdminAdmins} />
        <Route path="/admin/promotions" component={AdminPromotions} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/updates" component={AdminUpdates} />
        <Route path="/admin" component={AdminDashboard} />

        {/* Offline */}
        <Route path="/offline" component={Offline} />

        {/* User routes */}
        <Route path="/" component={Landing} />
        <Route path="/app" component={AppGate} />
        <Route path="/onboarding" component={Onboarding} />
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
        <Route path="/plus/modifier-pin" component={ModifierPin} />
        <Route path="/plus/conditions" component={Conditions} />
        <Route path="/plus/confidentialite" component={Confidentialite} />
        <Route path="/plus/apropos" component={Apropos} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/suggestions" component={Suggestions} />
        <Route path="/encaisser/tmoney" component={ConfigTmoney} />
        <Route path="/encaisser/moov" component={ConfigMoov} />
        <Route path="/encaisser/produits" component={Produits} />
        <Route path="/encaisser/boutiques" component={Boutiques} />
        <Route path="/encaisser/whatsapp" component={EncaisserWhatsApp} />
        <Route component={NotFound} />
      </Switch>
    </OnlineGuard>
  );
}

function AppGated() {
  const { checking } = useUpdateCheck();

  // Tant que /api/config n'a pas répondu, on ne rend aucune route — évite
  // qu'un utilisateur navigue avant qu'un mode "obligatoire" soit détecté.
  if (checking) return null;

  return (
    <>
      <UpdateGate />
      <WouterRouter base="">
        <Router />
      </WouterRouter>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppModalProvider>
            <TooltipProvider>
              <AppGated />
            </TooltipProvider>
          </AppModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
