import React, { useEffect, useState } from "react";
import AdminLayout, { adminFetch } from "./layout";
import { MessageSquare, Lightbulb, Bug, RefreshCw, CheckCheck, Eye, Loader2, ChevronDown, Clock, CheckCircle2, MailOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FeedbackStatus = "nouveau" | "lu" | "traité";
type FeedbackType = "suggestion" | "retour" | "bug";

interface Feedback {
  id: number;
  userId: number | null;
  type: FeedbackType;
  title: string;
  message: string;
  status: FeedbackStatus;
  userPhone: string | null;
  userName: string | null;
  createdAt: string;
}

const TYPE_META: Record<FeedbackType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  suggestion: { label: "Suggestion", icon: Lightbulb, color: "#f59e0b", bg: "#fffbeb" },
  retour:     { label: "Retour",     icon: MessageSquare, color: "#2d52e8", bg: "#eff2ff" },
  bug:        { label: "Problème",   icon: Bug,           color: "#ef4444", bg: "#fef2f2" },
};

const STATUS_META: Record<FeedbackStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  nouveau:  { label: "Nouveau",  icon: Clock,          color: "#f59e0b", bg: "#fffbeb" },
  lu:       { label: "Lu",       icon: MailOpen,       color: "#2d52e8", bg: "#eff2ff" },
  traité:   { label: "Traité",   icon: CheckCircle2,   color: "#10b981", bg: "#ecfdf5" },
};

export default function AdminFeedback() {
  const [items, setItems]               = useState<Feedback[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterType, setFilterType]     = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expanded, setExpanded]         = useState<number | null>(null);
  const [updating, setUpdating]         = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/feedback");
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: FeedbackStatus) => {
    setUpdating(id);
    try {
      await adminFetch(`/admin/feedback/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = items.filter((f) => {
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    nouveau: items.filter((f) => f.status === "nouveau").length,
    total: items.length,
  };

  return (
    <AdminLayout title="Suggestions & Retours">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: counts.total, color: "bg-blue-50 text-blue-700" },
          { label: "Nouveaux", value: counts.nouveau, color: "bg-amber-50 text-amber-700" },
          { label: "Suggestions", value: items.filter((f) => f.type === "suggestion").length, color: "bg-yellow-50 text-yellow-700" },
          { label: "Problèmes", value: items.filter((f) => f.type === "bug").length, color: "bg-red-50 text-red-700" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-4 ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs font-medium opacity-70 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type :</span>
          {["all", "suggestion", "retour", "bug"].map((t) => (
            <button key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t === "all" ? "Tous" : t === "suggestion" ? "Suggestions" : t === "retour" ? "Retours" : "Problèmes"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut :</span>
          {["all", "nouveau", "lu", "traité"].map((s) => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s === "all" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun retour pour ces filtres</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const type = TYPE_META[f.type] ?? TYPE_META.retour;
            const status = STATUS_META[f.status] ?? STATUS_META.nouveau;
            const TypeIcon = type.icon;
            const StatusIcon = status.icon;
            const isExp = expanded === f.id;

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${f.status === "nouveau" ? "border-amber-200" : "border-gray-100"}`}
              >
                <button
                  className="w-full flex items-start gap-3 p-4 text-left"
                  onClick={() => {
                    setExpanded(isExp ? null : f.id);
                    if (f.status === "nouveau") updateStatus(f.id, "lu");
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: type.bg }}>
                    <TypeIcon className="w-5 h-5" style={{ color: type.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 truncate">{f.title}</span>
                      {f.status === "nouveau" && (
                        <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NOUVEAU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: type.bg, color: type.color }}>{type.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: status.bg, color: status.color }}>
                        <StatusIcon className="inline w-3 h-3 mr-0.5" />{status.label}
                      </span>
                      <span className="text-xs text-gray-400">{f.userName ?? "Utilisateur"}</span>
                      <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExp ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-50">
                        <div className="bg-gray-50 rounded-xl p-3 mt-3 mb-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{f.message}</p>
                        </div>

                        {/* Actions statut */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 mr-1">Marquer comme :</span>
                          {(["nouveau", "lu", "traité"] as FeedbackStatus[]).map((s) => {
                            const sm = STATUS_META[s];
                            const SIcon = sm.icon;
                            return (
                              <button key={s}
                                disabled={f.status === s || updating === f.id}
                                onClick={() => updateStatus(f.id, s)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${f.status === s ? "opacity-40 cursor-default" : "hover:opacity-90 cursor-pointer"}`}
                                style={{ background: sm.bg, color: sm.color, borderColor: sm.color + "44" }}
                              >
                                {updating === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SIcon className="w-3 h-3" />}
                                {sm.label}
                              </button>
                            );
                          })}
                        </div>

                        {f.userPhone && (
                          <p className="text-xs text-gray-400 mt-3">Téléphone : {f.userPhone}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
