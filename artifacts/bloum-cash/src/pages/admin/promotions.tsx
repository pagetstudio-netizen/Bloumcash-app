import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle,
  RefreshCw, X, Eye, EyeOff, Tag,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

type BadgeType = "new" | "active" | "soon" | "expired";

interface Promo {
  id: number;
  icon: string;
  title: string;
  description: string;
  badge: BadgeType;
  color: string;
  bgColor: string;
  isActive: boolean;
  sortOrder: number;
  expiresAt: string | null;
  createdAt: string;
}

interface FormData {
  icon: string;
  title: string;
  description: string;
  badge: BadgeType;
  color: string;
  bgColor: string;
  isActive: boolean;
  sortOrder: string;
  expiresAt: string;
}

const EMPTY_FORM: FormData = {
  icon: "🎁",
  title: "",
  description: "",
  badge: "active",
  color: "#1a3fc4",
  bgColor: "#eff2ff",
  isActive: true,
  sortOrder: "0",
  expiresAt: "",
};

const BADGE_LABELS: Record<BadgeType, string> = {
  new: "Nouveau",
  active: "En cours",
  soon: "Bientôt disponible",
  expired: "Expiré",
};

const BADGE_COLORS: Record<BadgeType, { color: string; bg: string }> = {
  new:     { color: "#1a3fc4", bg: "#dbeafe" },
  active:  { color: "#16a34a", bg: "#dcfce7" },
  soon:    { color: "#d97706", bg: "#fef3c7" },
  expired: { color: "#9ca3af", bg: "#f3f4f6" },
};

const EMOJI_PRESETS = ["🎁", "💰", "🏆", "🎉", "📢", "🌟", "🔥", "💎", "🎊", "⚡", "🛍️", "🎯"];

function Modal({
  title, onClose, onSubmit, saving, error, form, setForm,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string;
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Icône */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Icône</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, icon: e })}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    form.icon === e ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.icon}
              onChange={e => setForm({ ...form, icon: e.target.value })}
              maxLength={4}
              placeholder="Ou saisir un emoji…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Titre */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Bonus de bienvenue"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Décrivez l'offre promotionnelle…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Badge */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Statut</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BADGE_LABELS) as BadgeType[]).map(b => (
                <button
                  key={b}
                  onClick={() => setForm({ ...form, badge: b })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    form.badge === b ? "ring-2 ring-blue-500" : ""
                  }`}
                  style={{
                    color: BADGE_COLORS[b].color,
                    background: BADGE_COLORS[b].bg,
                  }}
                >
                  {BADGE_LABELS[b]}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Couleur principale</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Couleur fond icône</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.bgColor}
                  onChange={e => setForm({ ...form, bgColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={form.bgColor}
                  onChange={e => setForm({ ...form, bgColor: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Ordre + Expiration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ordre d'affichage</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Expiration (optionnel)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Visible */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800">Visible par les utilisateurs</p>
              <p className="text-xs text-gray-400">Afficher cette promotion dans l'application</p>
            </div>
            <button
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: form.isActive ? "translateX(20px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {/* Aperçu */}
          <div className="rounded-2xl border border-gray-100 p-4" style={{ background: "white" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Aperçu</p>
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: form.bgColor }}
              >
                {form.icon || "🎁"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-sm text-gray-900 leading-tight">{form.title || "Titre de la promotion"}</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ color: BADGE_COLORS[form.badge].color, background: BADGE_COLORS[form.badge].bg }}
                  >
                    {BADGE_LABELS[form.badge]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {form.description || "Description de la promotion…"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromotions() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Promo | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Promo | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/promotions");
      if (r.ok) setPromos(await r.json());
      else setError("Impossible de charger les promotions");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setFormError(""); setModal("create"); };

  const openEdit = (p: Promo) => {
    setEditTarget(p);
    setForm({
      icon: p.icon,
      title: p.title,
      description: p.description,
      badge: p.badge,
      color: p.color,
      bgColor: p.bgColor,
      isActive: p.isActive,
      sortOrder: String(p.sortOrder),
      expiresAt: p.expiresAt ? p.expiresAt.split("T")[0] : "",
    });
    setFormError(""); setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setFormError(""); };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Titre et description requis"); return;
    }
    setSaving(true);
    try {
      const url = modal === "edit" ? `/admin/promotions/${editTarget!.id}` : "/admin/promotions";
      const method = modal === "edit" ? "PUT" : "POST";
      const payload = { ...form, sortOrder: parseInt(form.sortOrder) || 0, expiresAt: form.expiresAt || null };
      const r = await adminFetch(url, { method, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error ?? "Erreur serveur"); return; }
      closeModal();
      await load();
      showToast(modal === "create" ? "Promotion créée !" : "Promotion mise à jour !");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      const r = await adminFetch(`/admin/promotions/${confirmDelete.id}`, { method: "DELETE" });
      if (!r.ok) { const d = await r.json(); showToast(d.error ?? "Erreur"); return; }
      setConfirmDelete(null);
      await load();
      showToast("Promotion supprimée");
    } finally { setSaving(false); }
  };

  const toggleActive = async (p: Promo) => {
    await adminFetch(`/admin/promotions/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  };

  return (
    <AdminLayout title="Promotions">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      {modal && (
        <Modal
          title={modal === "create" ? "Créer une promotion" : "Modifier la promotion"}
          onClose={closeModal}
          onSubmit={handleSubmit}
          saving={saving}
          error={formError}
          form={form}
          setForm={setForm}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-1">Supprimer cette promotion ?</h3>
              <p className="text-sm text-gray-500"><strong>"{confirmDelete.title}"</strong> sera retiré de l'application.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Gérez les promotions affichées dans l'application</p>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Créer une promotion
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : promos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-blue-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Aucune promotion</p>
            <p className="text-sm text-gray-400 mb-4">Créez votre première promotion pour l'afficher dans l'application.</p>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
              Créer une promotion
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {promos.map(p => {
              const badgeCfg = { new: { label: "Nouveau", color: "#1a3fc4", bg: "#dbeafe" }, active: { label: "En cours", color: "#16a34a", bg: "#dcfce7" }, soon: { label: "Bientôt", color: "#d97706", bg: "#fef3c7" }, expired: { label: "Expiré", color: "#9ca3af", bg: "#f3f4f6" } }[p.badge] ?? { label: p.badge, color: "#9ca3af", bg: "#f3f4f6" };
              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!p.isActive ? "opacity-50" : "border-gray-100"}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: p.bgColor }}>{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900 leading-tight truncate">{p.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase" style={{ color: badgeCfg.color, background: badgeCfg.bg }}>{badgeCfg.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${p.isActive ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-gray-500 bg-gray-100 hover:bg-gray-200"}`}
                      >
                        {p.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {p.isActive ? "Visible" : "Masqué"}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
