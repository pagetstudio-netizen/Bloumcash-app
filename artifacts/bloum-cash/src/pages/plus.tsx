import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { 
  ArrowLeft, HelpCircle, MessageCircleQuestion, 
  Phone, Settings, FileText, Shield, Info, LogOut, ChevronRight 
} from "lucide-react";
import { motion } from "framer-motion";

export default function Plus() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const menuGroups = [
    {
      title: "Assistance",
      items: [
        { icon: <HelpCircle className="w-5 h-5" />, label: "Centre d'aide", href: "/plus/aide" },
        { icon: <MessageCircleQuestion className="w-5 h-5" />, label: "FAQ", href: "/plus/faq" },
        { icon: <Phone className="w-5 h-5" />, label: "Support WhatsApp", href: "/plus/whatsapp", color: "text-green-500" },
      ]
    },
    {
      title: "Préférences & Légal",
      items: [
        { icon: <Settings className="w-5 h-5" />, label: "Paramètres", href: "/plus/parametres" },
        { icon: <FileText className="w-5 h-5" />, label: "Conditions d'utilisation", href: "/plus/conditions" },
        { icon: <Shield className="w-5 h-5" />, label: "Politique de confidentialité", href: "/plus/confidentialite" },
        { icon: <Info className="w-5 h-5" />, label: "À propos de Bloum Cash", href: "/plus/apropos" },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:max-w-md md:mx-auto overflow-hidden">
      {/* Header — flex-shrink-0 : ne défile jamais */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] text-white p-4 shadow-md z-50">
        <div className="flex items-center">
          <button onClick={() => setLocation("/dashboard")} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Plus</h1>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-6">
        {/* Profile summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-4"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
            {user?.fullName?.substring(0, 2).toUpperCase() || "JD"}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-foreground">{user?.fullName || "Utilisateur"}</h2>
            <p className="text-muted-foreground text-sm">{user?.email || "email@exemple.com"}</p>
          </div>
          <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
            Vérifié
          </div>
        </motion.div>

        {/* Menu Groups */}
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
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="pt-4"
        >
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
