import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@workspace/api-client-react";
import OneSignal from "react-onesignal";
import { isMedianApp } from "@/lib/utils";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/* ── OneSignal Web SDK (navigateur uniquement, jamais dans Median) ───────── */

let oneSignalInitialized = false;

async function initOneSignalWeb(): Promise<void> {
  if (oneSignalInitialized || isMedianApp) return;
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json() as { onesignalAppId?: string };
    const appId = cfg.onesignalAppId;
    if (!appId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (OneSignal as any).init({
      appId,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          enabled: true,
          actionMessage: "Activez les notifications pour recevoir vos alertes de transaction en temps réel.",
          acceptButtonText: "Oui, activer",
          cancelButtonText: "Plus tard",
        },
      },
    });
    oneSignalInitialized = true;
  } catch {
    // OneSignal non disponible en navigateur, on continue sans
  }
}

async function subscribeWebNotifications(email: string): Promise<void> {
  if (isMedianApp || !oneSignalInitialized) return;
  try {
    await OneSignal.login(email);
    const permission = await OneSignal.Notifications.permission;
    if (!permission) {
      await OneSignal.Slidedown.promptPush();
    }
  } catch {
    // Silencieux — l'utilisateur peut refuser
  }
}

/* ── Median native ──────────────────────────────────────────────────────────
 *
 * Median expose un objet global `median` APRÈS l'événement `median_ready`.
 * Si on appelle median.xxx avant cet événement, la commande est silencieusement
 * perdue. On stocke les commandes en attente et on les rejoue dès que Median
 * est prêt.
 *
 * Flux correct :
 *  1. Au montage → écouter `median_ready` + appeler median.push.register()
 *  2. À la connexion → appeler median.onesignal.login({ externalId: email })
 *  3. À la déconnexion → appeler median.onesignal.logout()
 * ─────────────────────────────────────────────────────────────────────────── */

let medianReady = false;
const pendingMedianCmds: Array<() => void> = [];

function whenMedianReady(fn: () => void): void {
  if (medianReady) {
    fn();
  } else {
    pendingMedianCmds.push(fn);
  }
}

function onMedianReady(): void {
  medianReady = true;
  for (const fn of pendingMedianCmds) {
    try { fn(); } catch { /* silencieux */ }
  }
  pendingMedianCmds.length = 0;
}

/* Écoute l'événement Median — déclenché quand le bridge natif est prêt */
if (typeof document !== "undefined") {
  document.addEventListener("median_ready", onMedianReady, { once: true });
  /* Fallback si l'event a déjà été déclenché avant notre écoute */
  if (typeof median !== "undefined") {
    onMedianReady();
  }
}

function registerMedianPush(): void {
  whenMedianReady(() => {
    try {
      median.push.register();
    } catch {
      // push non disponible sur cette version du wrapper
    }
  });
}

function linkOneSignalUser(email: string): void {
  whenMedianReady(() => {
    try {
      median.onesignal.login({ externalId: email });
    } catch {
      // OneSignal plugin non configuré dans le dashboard Median
    }
  });
}

function unlinkOneSignalUser(): void {
  whenMedianReady(() => {
    try {
      median.onesignal.logout();
    } catch {
      // silencieux
    }
  });
}

/* ── Détection automatique de la localisation via IP ────────────────────── */

async function detectAndSaveLocation(token: string): Promise<void> {
  try {
    const res = await fetch("https://ip-api.com/json/?fields=city,regionName,country,status&lang=fr", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { status: string; city?: string; regionName?: string; country?: string };
    if (data.status !== "success") return;
    await fetch("/api/profile/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ city: data.city, region: data.regionName, country: data.country }),
    });
  } catch {
    // Silencieux — la localisation est optionnelle
  }
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bloum_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("bloum_token");
  });

  /* Au montage : enregistrement push selon l'environnement */
  useEffect(() => {
    if (isMedianApp) {
      registerMedianPush();
    } else {
      initOneSignalWeb();
    }
  }, []);

  /* Si session restaurée depuis localStorage → ré-identifier l'utilisateur */
  useEffect(() => {
    if (!token) return;

    const storedUser = localStorage.getItem("bloum_user");
    const storedEmail = storedUser ? (JSON.parse(storedUser) as User).email : null;
    if (!storedEmail) return;

    if (isMedianApp) {
      linkOneSignalUser(storedEmail);
    } else if (oneSignalInitialized) {
      subscribeWebNotifications(storedEmail);
    } else {
      const trySubscribe = async () => {
        await initOneSignalWeb();
        await subscribeWebNotifications(storedEmail);
      };
      trySubscribe();
    }

    detectAndSaveLocation(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("bloum_user", JSON.stringify(userData));
    localStorage.setItem("bloum_token", authToken);

    if (isMedianApp) {
      if (userData.email) {
        linkOneSignalUser(userData.email);
      }
    } else if (userData.email) {
      subscribeWebNotifications(userData.email);
    }

    detectAndSaveLocation(authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("bloum_user");
    localStorage.removeItem("bloum_token");

    if (isMedianApp) {
      unlinkOneSignalUser();
    } else {
      OneSignal.logout().catch(() => {});
    }

    window.location.replace("/splash");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
