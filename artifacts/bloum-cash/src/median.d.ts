/**
 * Déclarations TypeScript pour le bridge natif Median.co (window.median)
 * Disponible uniquement dans les wrappers iOS/Android générés par Median.
 */
declare const median: {
  /** Push natif Median (sans popup de permission — inscription silencieuse) */
  push: {
    /**
     * Enregistre silencieusement l'appareil pour le push natif Median.
     * Sur iOS utilise la provisional authorization (iOS 12+) → zéro dialog.
     * À appeler dès que l'app est prête.
     */
    register: () => void;
  };

  /** OneSignal — uniquement pour l'identification et les campagnes avancées */
  onesignal: {
    /** Associe un utilisateur identifié (email) à un device OneSignal. */
    login: (options: { externalId: string }) => void;
    /** Désenregistre l'utilisateur de OneSignal à la déconnexion. */
    logout: () => void;
    /**
     * Retourne le statut des permissions et le playerId OneSignal.
     * Ne pas utiliser pour déclencher promptForPermission — on n'interrompt
     * pas l'utilisateur ; la permission vient du push natif Median.
     */
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

  /**
   * Contrôle le titre affiché dans la barre de navigation supérieure Median.
   * Appelé après median_ready pour remplacer l'URL par un titre personnalisé.
   */
  navigationtitle: {
    set: (options: { title: string }) => void;
  };
};
