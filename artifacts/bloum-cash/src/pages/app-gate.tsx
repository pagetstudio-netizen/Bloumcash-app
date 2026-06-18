import { useEffect } from "react";
import { useLocation } from "wouter";

const ACCESS_KEY = "99935673AaAbb11";
const STORAGE_KEY = "bloum_app_unlocked";

function getAccessParam(): string {
  // Try URLSearchParams first (standard)
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    const val = params.get("access");
    if (val) return val.replace(/#+$/, "");
  }
  // Fallback: parse the full href manually (handles some proxy edge cases)
  const href = window.location.href;
  const match = href.match(/[?&]access=([^&#]*)/);
  if (match) return decodeURIComponent(match[1]).replace(/#+$/, "");
  // Also check hash fragment (some sharing apps move query to hash)
  const hash = window.location.hash;
  if (hash) {
    const hashMatch = hash.match(/[?&]access=([^&#]*)/);
    if (hashMatch) return decodeURIComponent(hashMatch[1]).replace(/#+$/, "");
  }
  return "";
}

export default function AppGate() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const access = getAccessParam();
    const alreadyUnlocked = localStorage.getItem(STORAGE_KEY) === "true";
    const isValidCode = access === ACCESS_KEY;

    if (isValidCode || alreadyUnlocked) {
      localStorage.setItem(STORAGE_KEY, "true");
      const isLoggedIn = !!localStorage.getItem("bloum_token");
      if (isLoggedIn) {
        // Déjà connecté → dashboard directement
        navigate("/dashboard", { replace: true });
      } else {
        // Pas connecté → toujours afficher l'onboarding
        navigate("/onboarding", { replace: true });
      }
    } else {
      // Invalid or missing access code → page non disponible
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center" style={{ background: "#f0f2f5" }}>
      <div
        className="rounded-full animate-spin"
        style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#1a3fc4" }}
      />
    </div>
  );
}
