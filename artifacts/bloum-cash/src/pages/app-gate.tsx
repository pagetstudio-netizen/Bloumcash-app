import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AppGate() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const isLoggedIn = !!localStorage.getItem("bloum_token");
    if (isLoggedIn) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/splash", { replace: true });
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
