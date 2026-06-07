import { useEffect } from "react";
import { useLocation } from "wouter";

const ACCESS_KEY = "99935673AaAbb11";
const STORAGE_KEY = "bloum_app_unlocked";

export default function AppGate() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");

    if (access === ACCESS_KEY || localStorage.getItem(STORAGE_KEY) === "true") {
      localStorage.setItem(STORAGE_KEY, "true");
      const isLoggedIn = !!localStorage.getItem("bloum_token");
      if (isLoggedIn) {
        setLocation("/dashboard");
      } else {
        setLocation("/splash");
      }
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1a3fc4] rounded-full animate-spin" />
    </div>
  );
}
