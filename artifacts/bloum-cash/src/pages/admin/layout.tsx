import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, ArrowLeftRight, Globe, Bell, Mail,
  Ban, Shield, Settings, LogOut, Menu, X, ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/admin" },
  { icon: Users, label: "Utilisateurs", href: "/admin/users" },
  { icon: ArrowLeftRight, label: "Transactions", href: "/admin/transactions" },
  { icon: Globe, label: "Pays & Opérateurs", href: "/admin/operators" },
  { icon: Bell, label: "Message global", href: "/admin/messages" },
  { icon: Mail, label: "Email Broadcast", href: "/admin/broadcast" },
  { icon: Ban, label: "Blacklist", href: "/admin/blacklist" },
  { icon: Shield, label: "Logs & Sécurité", href: "/admin/security" },
  { icon: Settings, label: "Paramètres", href: "/admin/settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("bloum_admin_token");
  const userStr = localStorage.getItem("bloum_admin_user");
  const user = userStr ? JSON.parse(userStr) : null;

  const logout = () => {
    localStorage.removeItem("bloum_admin_token");
    localStorage.removeItem("bloum_admin_user");
    setLocation("/admin/login");
  };

  return { token, user, logout, isAuth: !!token };
}

export function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("bloum_admin_token");
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuth } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuth) setLocation("/admin/login");
  }, [isAuth, setLocation]);

  if (!isAuth) return null;

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">Bloum Cash</div>
          <div className="text-xs text-blue-600 font-medium">Administration</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = location === href || (href !== "/admin" && location.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-xs">
              {user?.fullName?.[0] ?? "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">{user?.fullName}</div>
            <div className="text-xs text-gray-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 w-64 z-50 lg:hidden shadow-2xl"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-800 text-base flex-1 truncate">{title}</h1>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {user?.role === "superadmin" ? "Super Admin" : "Admin"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
