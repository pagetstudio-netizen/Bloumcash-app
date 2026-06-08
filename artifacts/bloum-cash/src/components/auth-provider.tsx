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

/* ── OneSignal Web SDK (navigateur) ─────────────────────────────────────── */

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
    // OneSignal non disponible, on continue sans
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

/* ── Median native ──────────────────────────────────────────────────────── */

function requestNotificationPermissionIfNeeded(delayMs = 2000) {
  if (typeof median === "undefined") return;
  median.onesignal.getPermissionStatus((result) => {
    if (result.status === "notDetermined") {
      setTimeout(() => {
        if (typeof median !== "undefined") {
          median.onesignal.promptForPermission();
        }
      }, delayMs);
    }
  });
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

  /* Initialiser OneSignal Web au montage (une seule fois, hors Median) */
  useEffect(() => {
    if (!isMedianApp) {
      initOneSignalWeb();
    }
  }, []);

  /* Si l'utilisateur est déjà connecté (session restaurée), abonner aux notifs */
  useEffect(() => {
    if (!token) return;

    const storedUser = localStorage.getItem("bloum_user");
    const storedEmail = storedUser ? (JSON.parse(storedUser) as User).email : null;

    if (isMedianApp) {
      requestNotificationPermissionIfNeeded(3000);
    } else if (storedEmail && oneSignalInitialized) {
      subscribeWebNotifications(storedEmail);
    } else if (storedEmail && !isMedianApp) {
      // Attendre que OneSignal soit prêt (init asynchrone)
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
      if (typeof median !== "undefined" && userData.email) {
        median.onesignal.login({ externalId: userData.email });
        requestNotificationPermissionIfNeeded(2000);
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
      if (typeof median !== "undefined") {
        median.onesignal.logout();
      }
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
