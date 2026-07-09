/**
 * Version actuelle de l'application front-end.
 * À incrémenter à chaque déploiement (web + build Play Store / App Store)
 * qui doit être détectable par le système de mise à jour forcée/optionnelle.
 */
export const APP_VERSION = "1.0.0";

/** Compare deux versions sémantiques "x.y.z". Retourne true si `current` < `required`. */
export function isVersionOlder(current: string, required: string): boolean {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = required.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}
