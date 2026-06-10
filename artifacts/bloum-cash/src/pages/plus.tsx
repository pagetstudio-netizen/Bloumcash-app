import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { 
  ArrowLeft, MessageCircleQuestion, 
  Phone, KeyRound, FileText, Shield, LogOut, ChevronRight, Bell, Loader2
} from "lucide-react";

import { motion } from "framer-motion";
import { toast } from "sonner";

function formatTogoPhone(raw: string | undefined | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("228") && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+228${digits}`;
  return `+${digits}`;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  color?: string;
  external?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const TEST_EMAIL = "blousprono@gmail.com";

export default function Plus() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [testingPush, setTestingPush] = useState(false);

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/test-push-self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      const data = await res.json() as { success: boolean; notSubscribed?: boolean; error?: string; notificationId?: string };
      if (data.success) {
        toast.success("Notification envoyée ! Vérifiez votre téléphone.");
      } else if (data.notSubscribed) {
        toast.warning("Appareil non abonné. Ouvrez l'app mobile et acceptez les notifications.");
      } else {
        toast.error(data.error ?? "Échec de l'envoi.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setTestingPush(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const menuGroups: MenuGroup[] = [
    {
      title: "Assistance",
      items: [
        { icon: <MessageCircleQuestion className="w-5 h-5" />, label: "Centre d'aide", href: "/plus/faq" },
        { icon: <Phone className="w-5 h-5" />, label: "Support WhatsApp", href: "/plus/whatsapp", color: "text-green-500" },
      ]
    },
    {
      title: "Préférences & Légal",
      items: [
        { icon: <KeyRound className="w-5 h-5" />, label: "Modifier mot de passe", href: "/plus/modifier-pin" },
        { icon: <FileText className="w-5 h-5" />, label: "Conditions d'utilisation", href: "/plus/conditions", external: "https://bloumcash.com/conditions-generales-dutilisation" },
        { icon: <Shield className="w-5 h-5" />, label: "Politique de confidentialité", href: "/plus/confidentialite", external: "https://bloumcash.com/politique-de-confidentialite" },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden">
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 shadow-md z-50">
        <div className="flex items-center">
          <button onClick={() => setLocation("/dashboard")} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Plus</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-6">
        {/* Profile summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-4"
        >
          <img
            src="/icon-avatar.png"
            alt="avatar"
            className="w-16 h-16 rounded-full flex-shrink-0 object-cover"
          />
          <div className="flex-1">
            <p className="font-bold text-lg text-foreground">{formatTogoPhone(user?.phone)}</p>
          </div>
        </motion.div>

        {menuGroups.map((group, groupIdx) => (
          <motion.div 
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + (groupIdx * 0.05) }}
          >
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-2">{group.title}</h3>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {group.items.map((item, itemIdx) => (
                  item.external ? (
                    <button
                      key={itemIdx}
                      onClick={() => window.open(item.external, '_system')}
                      className="w-full text-left"
                    >
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-muted ${item.color || 'text-foreground'}`}>
                            {item.icon}
                          </div>
                          <span className="font-medium text-foreground">{item.label}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
                  ) : (
                    <Link key={itemIdx} href={item.href}>
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-muted ${item.color || 'text-foreground'}`}>
                            {item.icon}
                          </div>
                          <span className="font-medium text-foreground">{item.label}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Link>
                  )
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="pt-4 space-y-3"
        >
          {user?.email === TEST_EMAIL && (
            <button
              onClick={handleTestPush}
              disabled={testingPush}
              className="w-full bg-blue-50 text-blue-700 font-bold p-4 rounded-2xl border border-blue-100 flex items-center justify-center gap-2 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-60"
            >
              {testingPush ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              Tester les notifications push
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 font-bold p-4 rounded-2xl border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 active:bg-red-200 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
          
          <p className="text-center text-xs text-muted-foreground mt-6">
            Bloum Cash v1.0.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
