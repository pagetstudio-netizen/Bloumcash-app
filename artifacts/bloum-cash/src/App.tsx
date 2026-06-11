import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { AppModalProvider } from "@/components/app-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, { Suspense } from "react";

/* ─── Pages chargées immédiatement (chemin critique) ───────────────────────── */
import Splash from "@/pages/splash";
import Offline from "@/pages/offline";
import NotFound from "@/pages/not-found";

/* ─── Pages utilisateur — lazy (chargées à la demande) ─────────────────────── */
const Landing        = React.lazy(() => import("@/pages/landing"));
const AppGate        = React.lazy(() => import("@/pages/app-gate"));
const Login          = React.lazy(() => import("@/pages/login"));
const Register       = React.lazy(() => import("@/pages/register"));
const ForgotPin      = React.lazy(() => import("@/pages/forgot-pin"));
const Dashboard      = React.lazy(() => import("@/pages/dashboard"));
const Encaisser      = React.lazy(() => import("@/pages/encaisser"));
const Promotions     = React.lazy(() => import("@/pages/promotions"));
const Paiement       = React.lazy(() => import("@/pages/paiement"));
const Transfert      = React.lazy(() => import("@/pages/transfert"));
const Historique     = React.lazy(() => import("@/pages/historique"));
const Plus           = React.lazy(() => import("@/pages/plus"));
const Notifications  = React.lazy(() => import("@/pages/notifications"));
const Suggestions    = React.lazy(() => import("@/pages/suggestions"));

/* ─── Sous-pages Plus ───────────────────────────────────────────────────────── */
const MonQrCode         = React.lazy(() => import("@/pages/plus/mon-qr-code"));
const Statistiques      = React.lazy(() => import("@/pages/plus/statistiques"));
const Aide              = React.lazy(() => import("@/pages/plus/aide"));
const Faq               = React.lazy(() => import("@/pages/plus/faq"));
const SupportWhatsApp   = React.lazy(() => import("@/pages/plus/whatsapp"));
const Parametres        = React.lazy(() => import("@/pages/plus/parametres"));
const ModifierPin       = React.lazy(() => import("@/pages/plus/modifier-pin"));
const Conditions        = React.lazy(() => import("@/pages/plus/conditions"));
const Confidentialite   = React.lazy(() => import("@/pages/plus/confidentialite"));
const Apropos           = React.lazy(() => import("@/pages/plus/apropos"));

/* ─── Sous-pages Encaisser ──────────────────────────────────────────────────── */
const ConfigTmoney      = React.lazy(() => import("@/pages/encaisser/tmoney"));
const ConfigMoov        = React.lazy(() => import("@/pages/encaisser/moov"));
const Produits          = React.lazy(() => import("@/pages/encaisser/produits"));
const Boutiques         = React.lazy(() => import("@/pages/encaisser/boutiques"));
const EncaisserWhatsApp = React.lazy(() => import("@/pages/encaisser/whatsapp"));

/* ─── Pages Admin — un seul chunk chargé uniquement si l'URL est /admin/* ──── */
const AdminLogin         = React.lazy(() => import("@/pages/admin/login"));
const AdminDashboard     = React.lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers         = React.lazy(() => import("@/pages/admin/users"));
const AdminTransactions  = React.lazy(() => import("@/pages/admin/transactions"));
const AdminOperators     = React.lazy(() => import("@/pages/admin/operators"));
const AdminBanners       = React.lazy(() => import("@/pages/admin/banners"));
const AdminMessages      = React.lazy(() => import("@/pages/admin/messages"));
const AdminBroadcast     = React.lazy(() => import("@/pages/admin/broadcast"));
const AdminPushCampaigns = React.lazy(() => import("@/pages/admin/push-campaigns"));
const AdminBlacklist     = React.lazy(() => import("@/pages/admin/blacklist"));
const AdminSecurity      = React.lazy(() => import("@/pages/admin/security"));
const AdminSettings      = React.lazy(() => import("@/pages/admin/settings"));
const AdminAdmins        = React.lazy(() => import("@/pages/admin/admins"));
const AdminPromotions    = React.lazy(() => import("@/pages/admin/promotions"));
const AdminFeedback      = React.lazy(() => import("@/pages/admin/feedback"));

/* ─── Fallback minimal pendant qu'un chunk se charge ───────────────────────── */
function PageLoader() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#1a3fc4]/20 border-t-[#1a3fc4] rounded-full animate-spin" />
    </div>
  );
}

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

function Router() {
  return (
    <OnlineGuard>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/admin" component={AdminDashboard} />

          {/* Offline */}
          <Route path="/offline" component={Offline} />

          {/* User routes */}
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
      </Suspense>
    </OnlineGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
