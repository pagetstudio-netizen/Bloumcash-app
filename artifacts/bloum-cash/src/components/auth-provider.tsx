import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@workspace/api-client-react/src/generated/api.schemas";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Demande la permission de notifications si elle n'a pas encore été accordée/refusée. */
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bloum_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("bloum_token");
  });

  /* Au démarrage : si l'utilisateur est déjà connecté (session restaurée),
     vérifier le statut des notifications et demander si besoin. */
  useEffect(() => {
    if (token && typeof median !== "undefined") {
      requestNotificationPermissionIfNeeded(3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("bloum_user", JSON.stringify(userData));
    localStorage.setItem("bloum_token", authToken);

    if (typeof median !== "undefined" && userData.email) {
      // Lier cet utilisateur à OneSignal
      median.onesignal.login({ externalId: userData.email });
      // Demander la permission de notifications si pas encore décidé
      requestNotificationPermissionIfNeeded(2000);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("bloum_user");
    localStorage.removeItem("bloum_token");

    if (typeof median !== "undefined") {
      median.onesignal.logout();
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
