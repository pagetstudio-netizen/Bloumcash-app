import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";

import Splash from "@/pages/splash";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPin from "@/pages/forgot-pin";
import Dashboard from "@/pages/dashboard";
import Encaisser from "@/pages/encaisser";
import Paiement from "@/pages/paiement";
import Transfert from "@/pages/transfert";
import Historique from "@/pages/historique";
import Plus from "@/pages/plus";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/splash" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-pin" component={ForgotPin} />
      <Route path="/" component={Dashboard} />
      <Route path="/encaisser" component={Encaisser} />
      <Route path="/paiement/:reference" component={Paiement} />
      <Route path="/transfert" component={Transfert} />
      <Route path="/historique" component={Historique} />
      <Route path="/plus" component={Plus} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
