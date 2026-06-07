/**
 * Déclarations TypeScript pour le bridge natif Median.co (window.median)
 * Disponible uniquement dans les wrappers iOS/Android générés par Median.
 */
declare const median: {
  onesignal: {
    /** Enregistre un utilisateur identifié dans OneSignal après connexion. */
    login: (options: { externalId: string }) => void;
    /** Désenregistre l'utilisateur de OneSignal à la déconnexion. */
    logout: () => void;
    /** Affiche la boîte de dialogue de demande de permission pour les notifications. */
    promptForPermission: () => void;
    /** Retourne le statut des permissions et le playerId OneSignal. */
    getPermissionStatus: (callback: (result: {
      hasPrompted: boolean;
      status: "authorized" | "denied" | "notDetermined";
      playerId: string | null;
    }) => void) => void;
  };
  share: {
    sharePage: (options?: { text?: string; url?: string }) => void;
  };
  statusbar: {
    set: (options: { style?: "light" | "dark"; color?: string; overlay?: boolean }) => void;
  };
  hardware: {
    setBackButton: (options: { enabled: boolean; callback?: () => void }) => void;
  };
  clipboard: {
    set: (options: { text: string }) => void;
    get: (callback: (result: { text: string }) => void) => void;
  };
  screen: {
    keepScreenOn: (options: { keepOn: boolean }) => void;
  };
  vibrate: () => void;
  toast: (options: { message: string; duration?: "short" | "long" }) => void;
};
