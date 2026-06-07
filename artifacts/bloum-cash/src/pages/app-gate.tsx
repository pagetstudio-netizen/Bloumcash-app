import { useEffect } from "react";
import { useLocation } from "wouter";

const ACCESS_KEY = "99935673AaAbb11";
const STORAGE_KEY = "bloum_app_unlocked";

export default function AppGate() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawAccess = params.get("access") ?? "";
    // Strip trailing # characters (some messaging apps append them when sharing)
    const access = rawAccess.replace(/#+$/, "");

    const alreadyUnlocked = localStorage.getItem(STORAGE_KEY) === "true";
    const isValidCode = access === ACCESS_KEY;

    if (isValidCode || alreadyUnlocked) {
      localStorage.setItem(STORAGE_KEY, "true");
      const isLoggedIn = !!localStorage.getItem("bloum_token");
      if (isLoggedIn) {
        // replace: true → back button won't return to the access URL
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } else {
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
