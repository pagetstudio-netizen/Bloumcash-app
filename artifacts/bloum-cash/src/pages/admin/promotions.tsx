import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Pencil, Trash2, Loader2, AlertCircle,
  RefreshCw, X, Eye, EyeOff, Tag, Upload, Link2,
  Ban, MonitorSmartphone, ExternalLink,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

type BadgeType = "new" | "active" | "soon" | "expired";
type ActionType = "none" | "page" | "link";

interface Promo {
  id: number;
  icon: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  badge: BadgeType;
  color: string;
  bgColor: string;
  buttonText: string | null;
  buttonActionType: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  expiresAt: string | null;
  createdAt: string;
}

interface FormData {
  icon: string;
  title: string;
  description: string;
  uploadMode: "file" | "url";
  imageData: string;
  imageUrl: string;
  previewSrc: string;
  badge: BadgeType;
  color: string;
  bgColor: string;
  buttonText: string;
  buttonActionType: ActionType;
  buttonUrl: string;
  isActive: boolean;
  sortOrder: string;
  expiresAt: string;
}

const EMPTY_FORM: FormData = {
  icon: "🎁",
  title: "",
  description: "",
  uploadMode: "file",
  imageData: "",
  imageUrl: "",
  previewSrc: "",
  badge: "active",
  color: "#1a3fc4",
  bgColor: "#eff2ff",
  buttonText: "",
  buttonActionType: "none",
  buttonUrl: "",
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

const ACTION_LABELS: Record<ActionType, { label: string; icon: React.ElementType; color: string }> = {
  none: { label: "Aucune action", icon: Ban, color: "text-gray-400" },
  page: { label: "Page interne", icon: MonitorSmartphone, color: "text-blue-600" },
  link: { label: "Lien externe", icon: ExternalLink, color: "text-purple-600" },
};

const INTERNAL_PAGES = [
  { label: "Tableau de bord", value: "/dashboard" },
  { label: "Transférer", value: "/transfert" },
  { label: "Historique", value: "/historique" },
  { label: "Encaisser (QR)", value: "/encaisser" },
  { label: "Promotions", value: "/promotions" },
  { label: "Avis & Suggestions", value: "/suggestions" },
  { label: "Notifications", value: "/notifications" },
  { label: "Plus", value: "/plus" },
  { label: "Paramètres", value: "/plus/parametres" },
  { label: "Aide", value: "/plus/aide" },
  { label: "FAQ", value: "/plus/faq" },
];

const EMOJI_PRESETS = ["🎁", "💰", "🏆", "🎉", "📢", "🌟", "🔥", "💎", "🎊", "⚡", "🛍️", "🎯"];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Modal({
  title, onClose, onSubmit, saving, error, form, setForm,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string;
  form: FormData;
  setForm: (f: FormData | ((prev: FormData) => FormData)) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 6 * 1024 * 1024) { alert("Image trop grande (max 6 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setForm(f => ({ ...f, imageData: data, previewSrc: data, uploadMode: "file" }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
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
                  onClick={() => setForm(f => ({ ...f, icon: e }))}
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
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
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
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Bonus de bienvenue"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description (optionnelle) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description <span className="font-normal text-gray-400">(optionnel)</span></label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez l'offre promotionnelle…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Image <span className="font-normal text-gray-400">(optionnel)</span></label>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-3">
              {(["file", "url"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, uploadMode: m }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${form.uploadMode === m ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {m === "file" ? <><Upload className="w-3.5 h-3.5" /> Importer</> : <><Link2 className="w-3.5 h-3.5" /> URL</>}
                </button>
              ))}
            </div>
            {form.uploadMode === "file" ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={e => e.preventDefault()}
                  className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors overflow-hidden ${form.previewSrc ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
                  style={{ minHeight: 120 }}
                >
                  {form.previewSrc ? (
                    <>
                      <img src={form.previewSrc} alt="Aperçu" className="w-full object-cover rounded-xl" style={{ maxHeight: 180 }} />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 rounded-xl">
                        <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">Changer l'image</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Upload className="w-7 h-7 text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-500">Glissez-déposez ou cliquez</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 6 Mo</p>
                    </div>
                  )}
                </div>
                {form.previewSrc && (
                  <button
                    onClick={() => setForm(f => ({ ...f, imageData: "", previewSrc: "" }))}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >Supprimer l'image</button>
                )}
              </>
            ) : (
              <>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value, previewSrc: e.target.value }))}
                  placeholder="https://exemple.com/image.jpg"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                {form.previewSrc && (
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={form.previewSrc} alt="Aperçu" className="w-full object-cover" style={{ maxHeight: 160 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Badge */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Statut</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BADGE_LABELS) as BadgeType[]).map(b => (
                <button
                  key={b}
                  onClick={() => setForm(f => ({ ...f, badge: b }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${form.badge === b ? "ring-2 ring-blue-500" : ""}`}
                  style={{ color: BADGE_COLORS[b].color, background: BADGE_COLORS[b].bg }}
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
                <input type="color" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <input type="text" value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Couleur fond icône</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.bgColor}
                  onChange={e => setForm(f => ({ ...f, bgColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <input type="text" value={form.bgColor}
                  onChange={e => setForm(f => ({ ...f, bgColor: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
            </div>
          </div>

          {/* Bouton */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Bouton <span className="font-normal text-gray-400">(optionnel)</span></label>

            {/* Texte du bouton */}
            <input
              type="text"
              value={form.buttonText}
              onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))}
              placeholder="Ex: En profiter maintenant"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />

            {/* Action type */}
            <div className="grid grid-cols-3 gap-2">
              {(["none", "page", "link"] as ActionType[]).map(type => {
                const ai = ACTION_LABELS[type];
                const ActionIcon = ai.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, buttonActionType: type, buttonUrl: "" }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.buttonActionType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
                  >
                    <ActionIcon className="w-5 h-5" />
                    <span className="text-xs text-center leading-tight">{ai.label}</span>
                  </button>
                );
              })}
            </div>

            {form.buttonActionType === "page" && (
              <div className="mt-3 space-y-2">
                <label className="text-xs text-gray-500 block">Page à ouvrir</label>
                <select
                  value={form.buttonUrl}
                  onChange={e => setForm(f => ({ ...f, buttonUrl: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner une page —</option>
                  {INTERNAL_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <p className="text-xs text-gray-400">Ou saisissez un chemin personnalisé :</p>
                <input
                  value={form.buttonUrl}
                  onChange={e => setForm(f => ({ ...f, buttonUrl: e.target.value }))}
                  placeholder="/votre-page"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {form.buttonActionType === "link" && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 mb-1.5 block">URL du lien externe</label>
                <input
                  value={form.buttonUrl}
                  onChange={e => setForm(f => ({ ...f, buttonUrl: e.target.value }))}
                  placeholder="https://votre-site.com/promo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">S'ouvrira dans le navigateur de l'utilisateur</p>
              </div>
            )}
          </div>

          {/* Ordre + Expiration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ordre d'affichage</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Expiration <span className="font-normal text-gray-400">(optionnel)</span></label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
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
            <ToggleSwitch value={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>

          {/* Aperçu */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Aperçu</p>
            {form.previewSrc ? (
              <div className="rounded-xl overflow-hidden mb-3" style={{ maxHeight: 160 }}>
                <img src={form.previewSrc} alt="" className="w-full object-cover" />
              </div>
            ) : null}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: form.bgColor }}>
                {form.icon || "🎁"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-sm text-gray-900 leading-tight">{form.title || "Titre de la promotion"}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ color: BADGE_COLORS[form.badge].color, background: BADGE_COLORS[form.badge].bg }}>
                    {BADGE_LABELS[form.badge]}
                  </span>
                </div>
                {form.description && (
                  <p className="text-xs text-gray-400 leading-relaxed">{form.description}</p>
                )}
              </div>
            </div>
            {form.buttonText && form.buttonActionType !== "none" && (
              <div
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold text-white text-center"
                style={{ background: `linear-gradient(90deg, ${form.color}, ${form.color}cc)` }}
              >
                {form.buttonText} {form.buttonActionType === "link" ? "↗" : "→"}
              </div>
            )}
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
    const hasFile = p.imageUrl?.startsWith("/uploads/");
    setEditTarget(p);
    setForm({
      icon: p.icon,
      title: p.title,
      description: p.description ?? "",
      uploadMode: hasFile ? "file" : "url",
      imageData: "",
      imageUrl: hasFile ? "" : (p.imageUrl ?? ""),
      previewSrc: p.imageUrl ?? "",
      badge: p.badge,
      color: p.color,
      bgColor: p.bgColor,
      buttonText: p.buttonText ?? "",
      buttonActionType: (p.buttonActionType as ActionType) ?? "none",
      buttonUrl: p.buttonUrl ?? "",
      isActive: p.isActive,
      sortOrder: String(p.sortOrder),
      expiresAt: p.expiresAt ? p.expiresAt.split("T")[0] : "",
    });
    setFormError(""); setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setFormError(""); };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.title.trim()) { setFormError("Le titre est requis"); return; }
    setSaving(true);
    try {
      const url = modal === "edit" ? `/admin/promotions/${editTarget!.id}` : "/admin/promotions";
      const method = modal === "edit" ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        icon: form.icon,
        title: form.title,
        description: form.description || null,
        badge: form.badge,
        color: form.color,
        bgColor: form.bgColor,
        buttonText: form.buttonText || null,
        buttonActionType: form.buttonActionType,
        buttonUrl: form.buttonUrl || null,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder) || 0,
        expiresAt: form.expiresAt || null,
      };
      if (form.uploadMode === "file" && form.imageData) {
        payload.imageData = form.imageData;
      } else if (form.uploadMode === "url" && form.imageUrl) {
        payload.imageUrl = form.imageUrl;
      } else if (modal === "edit" && !form.previewSrc) {
        payload.imageUrl = null;
      }
      const r = await adminFetch(url, { method, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error ?? "Erreur serveur"); return; }
      closeModal();
      await load();
      showToast(modal === "create" ? "Promotion créée !" : "Promotion mise à jour !");
    } catch {
      setFormError("Erreur réseau. L'image est peut-être trop grande.");
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
              const actionCfg = ACTION_LABELS[(p.buttonActionType as ActionType) ?? "none"] ?? ACTION_LABELS.none;
              const ActionIcon = actionCfg.icon;
              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!p.isActive ? "opacity-50" : "border-gray-100"}`}>
                  {p.imageUrl && (
                    <div className="w-full overflow-hidden bg-gray-100" style={{ height: 100 }}>
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: p.bgColor }}>{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900 leading-tight truncate">{p.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase" style={{ color: badgeCfg.color, background: badgeCfg.bg }}>{badgeCfg.label}</span>
                        </div>
                        {p.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</p>}
                        {p.buttonText && p.buttonActionType !== "none" && (
                          <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${actionCfg.color}`}>
                            <ActionIcon className="w-3 h-3" />
                            <span className="truncate">{p.buttonText}</span>
                          </div>
                        )}
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
