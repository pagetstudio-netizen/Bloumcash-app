import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, Moon, Globe, Lock, ChevronRight, Shield, BellRing, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";

const BG = "h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden";

export default function Parametres() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { showModal } = useModal();

  const [notifs, setNotifs] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [langue, setLangue] = useState("Français");
  const [testNotifLoading, setTestNotifLoading] = useState(false);
  const [testNotifStatus, setTestNotifStatus] = useState<"idle" | "success" | "error" | "not_subscribed">("idle");
  const [testNotifError, setTestNotifError] = useState("");

  async function handleTestNotification() {
    if (!user?.email) return;
    setTestNotifLoading(true);
    setTestNotifStatus("idle");
    setTestNotifError("");
    try {
      const res = await fetch("/api/send-push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          title: "Test Notification",
          message: "Push notifications are working!",
        }),
      });
      const data = await res.json() as { success: boolean; notSubscribed?: boolean; error?: string };
      if (res.ok && data.success) {
        setTestNotifStatus("success");
        setTimeout(() => setTestNotifStatus("idle"), 5000);
      } else if (data.notSubscribed) {
        setTestNotifStatus("not_subscribed");
        setTimeout(() => setTestNotifStatus("idle"), 8000);
      } else {
        setTestNotifStatus("error");
        setTestNotifError(data.error ?? "Erreur inconnue");
        setTimeout(() => setTestNotifStatus("idle"), 6000);
      }
    } catch {
      setTestNotifStatus("error");
      setTestNotifError("Erreur réseau. Réessayez.");
      setTimeout(() => setTestNotifStatus("idle"), 6000);
    } finally {
      setTestNotifLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? "bg-primary" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5.5 left-0.5" : "left-0.5"}`}
        style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );

  const groups = [
    {
      title: "Notifications",
      items: [
        {
          icon: <Bell className="w-5 h-5 text-blue-600" />,
          bg: "bg-blue-50",
          label: "Notifications push",
          description: "Alertes de transactions et actualités",
          type: "toggle",
          value: notifs,
          onChange: () => setNotifs(!notifs),
        },
      ],
    },
    {
      title: "Apparence",
      items: [
        {
          icon: <Moon className="w-5 h-5 text-purple-600" />,
          bg: "bg-purple-50",
          label: "Mode sombre",
          description: "Thème sombre pour l'interface",
          type: "toggle",
          value: darkMode,
          onChange: () => setDarkMode(!darkMode),
        },
        {
          icon: <Globe className="w-5 h-5 text-teal-600" />,
          bg: "bg-teal-50",
          label: "Langue",
          description: langue,
          type: "link",
          onClick: () => showModal({ type: "info", title: "Bientôt disponible", message: "Le choix de langue sera disponible prochainement." }),
        },
      ],
    },
    {
      title: "Sécurité",
      items: [
        {
          icon: <Lock className="w-5 h-5 text-orange-600" />,
          bg: "bg-orange-50",
          label: "Changer mon PIN",
          description: "Modifier votre code d'accès",
          type: "link",
          onClick: () => setLocation("/forgot-pin?from=parametres"),
        },
        {
          icon: <Shield className="w-5 h-5 text-green-600" />,
          bg: "bg-green-50",
          label: "Authentification biométrique",
          description: "Empreinte digitale / Face ID",
          type: "link",
          onClick: () => showModal({ type: "info", title: "Bientôt disponible", message: "L'authentification biométrique sera disponible prochainement." }),
        },
      ],
    },
  ];

  return (
    <div className={BG}>
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white px-5 py-4 flex items-center gap-4 shadow-md z-50">
        <button onClick={() => setLocation("/plus")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1">Paramètres</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {groups.map((group, gi) => (
          <motion.div
            key={gi}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06 }}
          >
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
              {group.title}
            </h3>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {group.items.map((item, ii) => (
                  <div
                    key={ii}
                    onClick={item.type === "link" ? item.onClick : undefined}
                    className={`flex items-center gap-3 px-4 py-3 ${item.type === "link" ? "cursor-pointer active:bg-muted" : ""}`}
                  >
                    <div className={`${item.bg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    {item.type === "toggle" ? (
                      <Toggle value={item.value!} onChange={item.onChange!} />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        {/* ── Test notification push ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groups.length * 0.06 }}
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
            Tests
          </h3>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BellRing className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Notification push</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyer une notification de test à votre appareil
                  </p>
                </div>
              </div>

              <button
                onClick={handleTestNotification}
                disabled={testNotifLoading}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 12,
                  border: "none",
                  cursor: testNotifLoading ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "opacity 0.2s",
                  opacity: testNotifLoading ? 0.65 : 1,
                  background:
                    testNotifStatus === "success"
                      ? "#16a34a"
                      : testNotifStatus === "error"
                      ? "#dc2626"
                      : testNotifStatus === "not_subscribed"
                      ? "#d97706"
                      : "#4f46e5",
                  color: "#fff",
                }}
              >
                {testNotifLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : testNotifStatus === "success" ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Notification envoyée !
                  </>
                ) : testNotifStatus === "not_subscribed" ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Appareil non abonné
                  </>
                ) : testNotifStatus === "error" ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Échec de l'envoi
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    Envoyer une notification test
                  </>
                )}
              </button>

              {testNotifStatus === "success" && (
                <p className="text-xs text-green-600 text-center">
                  ✓ Vérifiez vos notifications sur l'application mobile Bloum Cash
                </p>
              )}
              {testNotifStatus === "not_subscribed" && (
                <p className="text-xs text-amber-600 text-center leading-relaxed">
                  ⚠️ Votre appareil n'est pas encore abonné aux notifications. Acceptez la demande de permission dans votre navigateur et réessayez.
                </p>
              )}
              {testNotifStatus === "error" && (
                <p className="text-xs text-red-500 text-center">
                  {testNotifError || "Erreur inattendue. Réessayez."}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
