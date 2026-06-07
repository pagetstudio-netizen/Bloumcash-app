import { useEffect, useState } from "react";

const SECRET_TOKEN = "99935673AaAbb11";
const STORAGE_KEY = "bloum_app_access";

function PageUnavailable() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <img
        src="/page-unavailable.jpg"
        alt=""
        style={{
          width: "260px",
          maxWidth: "80vw",
          marginBottom: "24px",
          borderRadius: "12px",
        }}
      />
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "10px",
        }}
      >
        Cette page n'est pas disponible
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#666",
          maxWidth: "300px",
          lineHeight: 1.6,
        }}
      >
        Il est possible que le lien soit rompu ou que la page ait été supprimée.
      </p>
    </div>
  );
}

export function AccessGuard({ children }: { children: React.ReactNode }) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("access");

    if (tokenFromUrl === SECRET_TOKEN) {
      localStorage.setItem(STORAGE_KEY, "granted");
      params.delete("access");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? "?" + newSearch : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
      setHasAccess(true);
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    setHasAccess(saved === "granted");
  }, []);

  if (hasAccess === null) return null;
  if (!hasAccess) return <PageUnavailable />;
  return <>{children}</>;
}
