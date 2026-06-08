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
 * Stratégie à deux niveaux :
 *
 * 1. median.push.register()  — push natif Median, inscription silencieuse
 *    (provisional authorization iOS 12+), AUCUNE popup de permission.
 *    Utilisé dès le lancement pour que l'app soit immédiatement joignable.
 *
 * 2. median.onesignal.login(email) — identifie l'utilisateur dans OneSignal
 *    pour les campagnes avancées (pas de popup, juste un tag de ciblage).
 *    On n'appelle JAMAIS promptForPermission() — la permission est déjà
 *    acquise via le push natif Median.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

function registerMedianPush(): void {
  if (typeof median === "undefined") return;
  try {
    median.push.register();
  } catch {
    // push non disponible sur cette version du wrapper
  }
}

function linkOneSignalUser(email: string): void {
  if (typeof median === "undefined") return;
  try {
    median.onesignal.login({ externalId: email });
  } catch {
    // OneSignal plugin non configuré — silencieux
  }
}

function unlinkOneSignalUser(): void {
  if (typeof median === "undefined") return;
  try {
    median.onesignal.logout();
  } catch {
    // silencieux
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
      // Push natif Median silencieux — aucune popup de permission
      registerMedianPush();
    } else {
      // Web browser : initialiser le SDK OneSignal
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
      // Identifier dans OneSignal pour les campagnes (pas de popup)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("bloum_user", JSON.stringify(userData));
    localStorage.setItem("bloum_token", authToken);

    if (isMedianApp) {
      // Identifier dans OneSignal (pour ciblage campagnes) — jamais de popup
      if (userData.email) {
        linkOneSignalUser(userData.email);
      }
    } else if (userData.email) {
      subscribeWebNotifications(userData.email);
    }
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
