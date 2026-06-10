import React, { useEffect, useState } from "react";
import AdminLayout, { adminFetch } from "./layout";
import {
  MessageSquare, Lightbulb, Bug, RefreshCw, CheckCheck, Eye, Loader2,
  ChevronDown, Clock, CheckCircle2, MailOpen, Settings, Save, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FeedbackStatus = "nouveau" | "lu" | "traité";
type FeedbackType   = "suggestion" | "retour" | "bug";

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

interface FeedbackTypeConfig {
  key: string;
  label: string;
  desc: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
}

interface FeedbackConfig {
  pageTitle: string;
  pageSubtitle: string;
  introQuestion: string;
  footerMessage: string;
  types: FeedbackTypeConfig[];
}

const DEFAULT_CONFIG: FeedbackConfig = {
  pageTitle: "Suggestions & Retours",
  pageSubtitle: "Aidez-nous à améliorer Bloum Cash",
  introQuestion: "Que souhaitez-vous partager avec nous ?",
  footerMessage: "Vos retours sont précieux. Chaque suggestion est lue et étudiée par notre équipe. Merci de contribuer à l'amélioration de Bloum Cash.",
  types: [
    { key: "suggestion", label: "Suggestion d'amélioration", desc: "Proposez une nouvelle fonctionnalité", colorHex: "#f59e0b", bgHex: "#fffbeb", borderHex: "#fde68a" },
    { key: "retour",     label: "Retour sur l'application", desc: "Partagez votre expérience utilisateur", colorHex: "#2d52e8", bgHex: "#eff2ff", borderHex: "#c7d2fe" },
    { key: "bug",        label: "Signaler un problème",     desc: "Décrivez un bug ou dysfonctionnement",  colorHex: "#ef4444", bgHex: "#fef2f2", borderHex: "#fecaca" },
  ],
};

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  suggestion: { label: "Suggestion", icon: Lightbulb,      color: "#f59e0b", bg: "#fffbeb" },
  retour:     { label: "Retour",     icon: MessageSquare,  color: "#2d52e8", bg: "#eff2ff" },
  bug:        { label: "Problème",   icon: Bug,            color: "#ef4444", bg: "#fef2f2" },
};

const STATUS_META: Record<FeedbackStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  nouveau: { label: "Nouveau",  icon: Clock,         color: "#f59e0b", bg: "#fffbeb" },
  lu:      { label: "Lu",       icon: MailOpen,      color: "#2d52e8", bg: "#eff2ff" },
  traité:  { label: "Traité",   icon: CheckCircle2,  color: "#10b981", bg: "#ecfdf5" },
};

/* ─────────────── Onglet Retours ─────────────── */
function RetoursList() {
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
    <>
      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",        value: counts.total,                                           color: "bg-blue-50 text-blue-700" },
          { label: "Nouveaux",     value: counts.nouveau,                                         color: "bg-amber-50 text-amber-700" },
          { label: "Suggestions",  value: items.filter((f) => f.type === "suggestion").length,    color: "bg-yellow-50 text-yellow-700" },
          { label: "Problèmes",    value: items.filter((f) => f.type === "bug").length,           color: "bg-red-50 text-red-700" },
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
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t === "all" ? "Tous" : t === "suggestion" ? "Suggestions" : t === "retour" ? "Retours" : "Problèmes"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut :</span>
          {["all", "nouveau", "lu", "traité"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
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
            const type   = TYPE_META[f.type] ?? TYPE_META.retour;
            const status = STATUS_META[f.status] ?? STATUS_META.nouveau;
            const TypeIcon   = type.icon;
            const StatusIcon = status.icon;
            const isExp      = expanded === f.id;

            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${f.status === "nouveau" ? "border-amber-200" : "border-gray-100"}`}>
                <button className="w-full flex items-start gap-3 p-4 text-left"
                  onClick={() => { setExpanded(isExp ? null : f.id); if (f.status === "nouveau") updateStatus(f.id, "lu"); }}>
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
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-gray-50">
                        <div className="bg-gray-50 rounded-xl p-3 mt-3 mb-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{f.message}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 mr-1">Marquer comme :</span>
                          {(["nouveau", "lu", "traité"] as FeedbackStatus[]).map((s) => {
                            const sm    = STATUS_META[s];
                            const SIcon = sm.icon;
                            return (
                              <button key={s} disabled={f.status === s || updating === f.id}
                                onClick={() => updateStatus(f.id, s)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${f.status === s ? "opacity-40 cursor-default" : "hover:opacity-90 cursor-pointer"}`}
                                style={{ background: sm.bg, color: sm.color, borderColor: sm.color + "44" }}>
                                {updating === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SIcon className="w-3 h-3" />}
                                {sm.label}
                              </button>
                            );
                          })}
                        </div>
                        {f.userPhone && <p className="text-xs text-gray-400 mt-3">Téléphone : {f.userPhone}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ─────────────── Onglet Configuration ─────────────── */
function ConfigPanel() {
  const [config, setConfig] = useState<FeedbackConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/feedback/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateType = (idx: number, field: keyof FeedbackTypeConfig, value: string) => {
    setConfig((prev) => {
      const types = [...prev.types];
      types[idx] = { ...types[idx], [field]: value };
      return { ...prev, types };
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await adminFetch("/admin/feedback/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const ICON_MAP: Record<string, React.ElementType> = {
    suggestion: Lightbulb,
    retour: MessageSquare,
    bug: Bug,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Textes de la page ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/60">
          <h2 className="font-semibold text-gray-800 text-sm">Textes de la page</h2>
          <p className="text-xs text-gray-500 mt-0.5">Ce que les utilisateurs voient en haut de la page suggestions</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Titre principal</label>
            <input
              type="text"
              value={config.pageTitle}
              onChange={(e) => setConfig((p) => ({ ...p, pageTitle: e.target.value }))}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Ex : Suggestions & Retours"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Sous-titre</label>
            <input
              type="text"
              value={config.pageSubtitle}
              onChange={(e) => setConfig((p) => ({ ...p, pageSubtitle: e.target.value }))}
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Ex : Aidez-nous à améliorer Bloum Cash"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Question d'introduction</label>
            <input
              type="text"
              value={config.introQuestion}
              onChange={(e) => setConfig((p) => ({ ...p, introQuestion: e.target.value }))}
              maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Ex : Que souhaitez-vous partager avec nous ?"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Message de bas de page</label>
            <textarea
              value={config.footerMessage}
              onChange={(e) => setConfig((p) => ({ ...p, footerMessage: e.target.value }))}
              maxLength={300}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
              placeholder="Message d'encouragement affiché sous les options..."
            />
            <p className="text-xs text-gray-400 text-right mt-1">{config.footerMessage.length}/300</p>
          </div>
        </div>
      </div>

      {/* ── Types de retour ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/60">
          <h2 className="font-semibold text-gray-800 text-sm">Types de retour</h2>
          <p className="text-xs text-gray-500 mt-0.5">Personnalisez les 3 cartes que l'utilisateur voit pour choisir son type de retour</p>
        </div>
        <div className="p-6 space-y-5">
          {config.types.map((t, idx) => {
            const Icon = ICON_MAP[t.key] ?? MessageSquare;
            return (
              <div key={t.key} className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: t.borderHex }}>
                {/* Aperçu */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bgHex }}>
                    <Icon className="w-5 h-5" style={{ color: t.colorHex }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{t.label || "Label…"}</p>
                    <p className="text-xs text-gray-500">{t.desc || "Description…"}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: t.bgHex, color: t.colorHex }}>
                    {t.key}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Label de la carte</label>
                    <input
                      type="text"
                      value={t.label}
                      onChange={(e) => updateType(idx, "label", e.target.value)}
                      maxLength={50}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Description courte</label>
                    <input
                      type="text"
                      value={t.desc}
                      onChange={(e) => updateType(idx, "desc", e.target.value)}
                      maxLength={70}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Couleur principale</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={t.colorHex}
                        onChange={(e) => updateType(idx, "colorHex", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <span className="text-xs text-gray-500 font-mono">{t.colorHex}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Couleur de fond</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={t.bgHex}
                        onChange={(e) => updateType(idx, "bgHex", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <span className="text-xs text-gray-500 font-mono">{t.bgHex}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Erreur / succès ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-3">
            {error}
          </motion.div>
        )}
        {saved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl px-5 py-3 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 flex-shrink-0" />
            Configuration sauvegardée ! Les utilisateurs voient les changements immédiatement.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Boutons ── */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={load}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Réinitialiser
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #1a3fc4, #2d52e8)" }}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</> : <><Save className="w-4 h-4" /> Sauvegarder la configuration</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Page principale ─────────────── */
export default function AdminFeedback() {
  const [tab, setTab] = useState<"retours" | "config">("retours");

  return (
    <AdminLayout title="Suggestions & Retours">
      {/* Onglets */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab("retours")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "retours" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Eye className="w-4 h-4" />
          Retours reçus
        </button>
        <button
          onClick={() => setTab("config")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "config" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Settings className="w-4 h-4" />
          Configuration du formulaire
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "retours" ? (
          <motion.div key="retours" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
            <RetoursList />
          </motion.div>
        ) : (
          <motion.div key="config" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <ConfigPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
