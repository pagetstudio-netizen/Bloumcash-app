import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Image, Plus, Trash2, Edit3, X, Loader2, RefreshCw, AlertCircle,
  ArrowUp, ArrowDown, Link2, MonitorSmartphone, Ban, Upload,
  ExternalLink,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";
import { motion, AnimatePresence } from "framer-motion";

interface Banner {
  id: number;
  title: string | null;
  imageUrl: string;
  actionType: string;
  actionUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

type ActionType = "none" | "page" | "link";

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
  { label: "Mon QR Code", value: "/plus/mon-qr-code" },
  { label: "Statistiques", value: "/plus/statistiques" },
  { label: "Aide", value: "/plus/aide" },
  { label: "FAQ", value: "/plus/faq" },
  { label: "Support WhatsApp", value: "/plus/whatsapp" },
  { label: "Paramètres", value: "/plus/parametres" },
  { label: "Produits (marchands)", value: "/encaisser/produits" },
  { label: "Boutiques (marchands)", value: "/encaisser/boutiques" },
];

interface ModalState {
  mode: "create" | "edit";
  banner?: Banner;
  title: string;
  uploadMode: "file" | "url";
  previewSrc: string;
  imageData: string;
  imageUrl: string;
  actionType: ActionType;
  actionUrl: string;
  isActive: boolean;
  sortOrder: string;
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/banners");
      if (r.ok) setBanners(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => setModal({
    mode: "create", title: "", uploadMode: "file", previewSrc: "", imageData: "", imageUrl: "",
    actionType: "none", actionUrl: "", isActive: true, sortOrder: String(banners.length),
  });

  const openEdit = (b: Banner) => setModal({
    mode: "edit", banner: b, title: b.title ?? "", uploadMode: "url", previewSrc: b.imageUrl,
    imageData: "", imageUrl: b.imageUrl, actionType: (b.actionType as ActionType) || "none",
    actionUrl: b.actionUrl ?? "", isActive: b.isActive, sortOrder: String(b.sortOrder),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert("Image trop grande (max 6 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setModal(m => m ? { ...m, imageData: data, previewSrc: data, uploadMode: "file" } : null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 6 * 1024 * 1024) { alert("Image trop grande (max 6 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setModal(m => m ? { ...m, imageData: data, previewSrc: data, uploadMode: "file" } : null);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!modal) return;
    const hasImage = modal.uploadMode === "file" ? !!modal.imageData : !!modal.imageUrl;
    const isEdit = modal.mode === "edit";
    if (!hasImage && !isEdit) { alert("Image requise"); return; }
    if (!hasImage && isEdit && !modal.banner?.imageUrl) { alert("Image requise"); return; }

    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: modal.title || null,
        actionType: modal.actionType,
        actionUrl: modal.actionUrl || null,
        isActive: modal.isActive,
        sortOrder: parseInt(modal.sortOrder) || 0,
      };
      if (modal.uploadMode === "file" && modal.imageData) {
        body.imageData = modal.imageData;
      } else if (modal.uploadMode === "url" && modal.imageUrl) {
        body.imageUrl = modal.imageUrl;
      }

      const r = isEdit
        ? await adminFetch(`/admin/banners/${modal.banner!.id}`, { method: "PUT", body: JSON.stringify(body) })
        : await adminFetch("/admin/banners", { method: "POST", body: JSON.stringify(body) });

      const d = await r.json();
      if (!r.ok) { alert(d.error ?? "Erreur"); return; }
      showToast(isEdit ? "Bannière modifiée !" : "Bannière ajoutée !");
      setModal(null);
      load();
    } catch (err) {
      alert("Erreur lors de l'envoi. L'image est peut-être trop grande.");
    } finally { setActionLoading(false); }
  };

  const deleteBanner = async (id: number) => {
    if (!confirm("Supprimer cette bannière ?")) return;
    await adminFetch(`/admin/banners/${id}`, { method: "DELETE" });
    showToast("Bannière supprimée");
    load();
  };

  const toggleActive = async (b: Banner) => {
    await adminFetch(`/admin/banners/${b.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...b, isActive: !b.isActive }),
    });
    setBanners(bs => bs.map(x => x.id === b.id ? { ...x, isActive: !x.isActive } : x));
    showToast(b.isActive ? "Bannière désactivée" : "Bannière activée");
  };

  const move = async (idx: number, dir: "up" | "down") => {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const newOrder = [...banners];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setBanners(newOrder);
    const orderedIds = newOrder.map(b => b.id);
    await adminFetch("/admin/banners/reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) });
    showToast("Ordre mis à jour");
  };

  return (
    <AdminLayout title="Carrousel d'images">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Gérez les images du carrousel affiché sur le tableau de bord des utilisateurs.</p>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Ajouter une image
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : banners.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Image className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <p className="font-medium text-gray-500 mb-1">Aucune bannière configurée</p>
            <p className="text-sm text-gray-400 mb-4">Les images locales par défaut sont utilisées sur le dashboard</p>
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Ajouter la première image
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, idx) => {
              const ai = ACTION_LABELS[banner.actionType as ActionType] ?? ACTION_LABELS.none;
              const ActionIcon = ai.icon;
              return (
                <motion.div
                  key={banner.id}
                  layout
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${banner.isActive ? "border-gray-100" : "border-gray-100 opacity-60"}`}
                >
                  <div className="flex items-stretch gap-0">
                    {/* Image preview */}
                    <div className="w-28 sm:w-40 flex-shrink-0 relative overflow-hidden bg-gray-100">
                      <img
                        src={banner.imageUrl}
                        alt={banner.title ?? `Bannière ${idx + 1}`}
                        className="w-full h-full object-cover"
                        style={{ minHeight: 90, maxHeight: 110 }}
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/320x90/e5e7eb/9ca3af?text=Image"; }}
                      />
                      {!banner.isActive && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">Inactif</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 text-sm truncate">{banner.title || `Bannière ${idx + 1}`}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 ${ai.color}`}>
                            <ActionIcon className="w-3 h-3" /> {ai.label}
                          </span>
                        </div>
                        {banner.actionUrl && (
                          <p className="text-xs text-gray-400 truncate">{banner.actionUrl}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Reorder */}
                        <div className="flex gap-1">
                          <button onClick={() => move(idx, "up")} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 hover:bg-gray-100 rounded transition-colors">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => move(idx, "down")} disabled={idx === banners.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 hover:bg-gray-100 rounded transition-colors">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-gray-200">|</span>
                        <ToggleSwitch value={banner.isActive} onChange={() => toggleActive(banner)} />
                        <button onClick={() => openEdit(banner)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteBanner(banner.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 Comment ça marche</p>
          <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
            <li>Les bannières actives s'affichent en carrousel sur le tableau de bord</li>
            <li>L'ordre d'affichage suit l'ordre de la liste (utilisez ↑↓)</li>
            <li>Si aucune bannière n'est active, les images par défaut sont utilisées</li>
            <li>Max 6 Mo par image (JPG, PNG, WebP, GIF)</li>
          </ul>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{modal.mode === "create" ? "Ajouter une bannière" : "Modifier la bannière"}</h3>
                <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Image upload section */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 block">Image</label>

                  {/* Mode toggle */}
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-3">
                    {(["file", "url"] as const).map(m => (
                      <button key={m} onClick={() => setModal(prev => prev ? { ...prev, uploadMode: m } : null)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${modal.uploadMode === m ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                        {m === "file" ? <><Upload className="w-3.5 h-3.5" /> Importer</> : <><Link2 className="w-3.5 h-3.5" /> URL</>}
                      </button>
                    ))}
                  </div>

                  {modal.uploadMode === "file" ? (
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                      <div
                        onClick={() => fileRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors overflow-hidden ${modal.previewSrc ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
                        style={{ minHeight: 140 }}
                      >
                        {modal.previewSrc ? (
                          <>
                            <img src={modal.previewSrc} alt="Aperçu" className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 rounded-xl">
                              <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">Changer l'image</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                            <Upload className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-500">Glissez-déposez ou cliquez pour importer</p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF — max 6 Mo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        value={modal.imageUrl}
                        onChange={e => setModal(m => m ? { ...m, imageUrl: e.target.value, previewSrc: e.target.value } : null)}
                        placeholder="https://exemple.com/image.jpg"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                      />
                      {modal.previewSrc && (
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          <img src={modal.previewSrc} alt="Aperçu" className="w-full object-cover" style={{ maxHeight: 160 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Titre (optionnel)</label>
                  <input value={modal.title} onChange={e => setModal(m => m ? { ...m, title: e.target.value } : null)}
                    placeholder="ex: Promo spéciale, Nouveau service…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Action type */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Action au clic</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["none", "page", "link"] as ActionType[]).map(type => {
                      const ai = ACTION_LABELS[type];
                      const ActionIcon = ai.icon;
                      return (
                        <button key={type} onClick={() => setModal(m => m ? { ...m, actionType: type, actionUrl: "" } : null)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${modal.actionType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                          <ActionIcon className="w-5 h-5" />
                          <span className="text-xs text-center leading-tight">{ai.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {modal.actionType === "page" && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 mb-1.5 block">Page à ouvrir</label>
                      <select value={modal.actionUrl} onChange={e => setModal(m => m ? { ...m, actionUrl: e.target.value } : null)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Sélectionner une page —</option>
                        {INTERNAL_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Ou saisissez un chemin personnalisé :</p>
                      <input value={modal.actionUrl} onChange={e => setModal(m => m ? { ...m, actionUrl: e.target.value } : null)}
                        placeholder="/votre-page"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}

                  {modal.actionType === "link" && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 mb-1.5 block">URL du lien externe</label>
                      <input value={modal.actionUrl} onChange={e => setModal(m => m ? { ...m, actionUrl: e.target.value } : null)}
                        placeholder="https://votre-site.com/promo"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-400 mt-1">S'ouvrira dans un nouvel onglet</p>
                    </div>
                  )}
                </div>

                {/* Settings row */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bannière active</p>
                    <p className="text-xs text-gray-400">Visible sur le dashboard utilisateur</p>
                  </div>
                  <ToggleSwitch value={modal.isActive} onChange={v => setModal(m => m ? { ...m, isActive: v } : null)} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Ordre d'affichage</label>
                  <input type="number" value={modal.sortOrder} min={0}
                    onChange={e => setModal(m => m ? { ...m, sortOrder: e.target.value } : null)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">Les bannières sont triées par ordre croissant</p>
                </div>
              </div>

              <div className="flex gap-2 p-6 pt-4 border-t border-gray-100">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button onClick={save} disabled={actionLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : (modal.mode === "create" ? "Ajouter" : "Sauvegarder")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
