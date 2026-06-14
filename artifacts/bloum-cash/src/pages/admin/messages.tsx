import React, { useEffect, useState, useCallback, useRef } from "react";
import { Plus, RefreshCw, Loader2, Trash2, Edit3, X, Bell, AlertCircle, Upload, Link2, ImageOff, Image, ExternalLink, Zap } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface Notif {
  id: number;
  displayMode: string;
  title: string | null;
  message: string | null;
  type: string;
  imageUrl: string | null;
  actionType: string;
  actionUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const TYPES = [
  { value: "info",    label: "Information",   color: "bg-blue-100 text-blue-700" },
  { value: "success", label: "Succès",        color: "bg-green-100 text-green-700" },
  { value: "warning", label: "Avertissement", color: "bg-yellow-100 text-yellow-700" },
  { value: "error",   label: "Urgent",        color: "bg-red-100 text-red-700" },
];

const ACTION_TYPES = [
  { value: "none",    label: "Aucune action", icon: "—" },
  { value: "link",    label: "URL externe",   icon: "🔗" },
  { value: "page",    label: "Page interne",  icon: "📄" },
];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

interface ModalState extends Omit<Notif, "id" | "createdAt"> {
  id?: number;
  uploadMode: "file" | "url";
  imageData: string;
  previewSrc: string;
}

const EMPTY: ModalState = {
  displayMode: "image_only",
  title: "", message: "", type: "info",
  imageUrl: "", actionType: "none", actionUrl: "",
  buttonText: "", buttonUrl: "", isActive: true,
  uploadMode: "file", imageData: "", previewSrc: "",
};

export default function AdminMessages() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!(modal && modal.id);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/notifications");
      if (r.ok) setNotifs(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => setModal({ ...EMPTY });
  const openEdit = (n: Notif) => setModal({
    ...n, uploadMode: "url", imageData: "", previewSrc: n.imageUrl ?? "",
    title: n.title ?? "", message: n.message ?? "",
    actionType: n.actionType ?? "none", actionUrl: n.actionUrl ?? "",
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert("Image trop grande (max 8 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setModal(m => m ? { ...m, imageData: data, previewSrc: data, uploadMode: "file" } : null);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!modal) return;
    if (modal.displayMode === "image_only") {
      if (!modal.imageData && !modal.imageUrl && !modal.previewSrc) {
        alert("Veuillez importer une image pour ce type de popup"); return;
      }
    } else {
      if (!modal.title || !modal.message) { alert("Titre et message requis"); return; }
    }
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        displayMode: modal.displayMode,
        title: modal.displayMode === "classic" ? modal.title : null,
        message: modal.displayMode === "classic" ? modal.message : null,
        type: modal.type,
        actionType: modal.actionType ?? "none",
        actionUrl: modal.actionType !== "none" ? (modal.actionUrl || null) : null,
        buttonText: modal.displayMode === "classic" ? (modal.buttonText || null) : null,
        buttonUrl: modal.displayMode === "classic" ? (modal.buttonUrl || null) : null,
        isActive: modal.isActive,
      };
      if (modal.uploadMode === "file" && modal.imageData) {
        body.imageData = modal.imageData;
      } else if (modal.imageUrl) {
        body.imageUrl = modal.imageUrl;
      } else {
        body.imageUrl = null;
      }

      if (isEdit) {
        await adminFetch(`/admin/notifications/${modal.id}`, { method: "PUT", body: JSON.stringify(body) });
        showToast("Popup mis à jour");
      } else {
        await adminFetch("/admin/notifications", { method: "POST", body: JSON.stringify(body) });
        showToast("Popup créé");
      }
      setModal(null); load();
    } finally { setActionLoading(false); }
  };

  const deleteNotif = async (id: number) => {
    if (!confirm("Supprimer ce popup ?")) return;
    await adminFetch(`/admin/notifications/${id}`, { method: "DELETE" });
    showToast("Popup supprimé"); load();
  };

  const toggleActive = async (n: Notif) => {
    await adminFetch(`/admin/notifications/${n.id}`, { method: "PUT", body: JSON.stringify({ ...n, isActive: !n.isActive }) });
    setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, isActive: !x.isActive } : x));
    showToast(n.isActive ? "Popup désactivé" : "Popup activé");
  };

  const typeInfo = (type: string) => TYPES.find(t => t.value === type) ?? TYPES[0];

  return (
    <AdminLayout title="Message global">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Popups affichés sur le tableau de bord des utilisateurs.</p>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Nouveau popup
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun popup configuré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map(n => {
              const ti = typeInfo(n.type);
              const isImg = n.displayMode === "image_only";
              return (
                <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {n.imageUrl ? (
                        <img src={n.imageUrl} alt="" className={`flex-shrink-0 rounded-xl object-cover border border-gray-100 ${isImg ? "w-16 h-16" : "w-12 h-12"}`} />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isImg ? "bg-purple-100 text-purple-700" : ti.color}`}>
                            {isImg ? <><Image className="w-3 h-3" /> Image seule</> : ti.label}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${n.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {n.isActive ? "Actif" : "Inactif"}
                          </span>
                          {n.actionType !== "none" && n.actionUrl && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <Zap className="w-3 h-3" /> Action
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                        </div>
                        {isImg ? (
                          <p className="text-sm text-gray-500 italic">Popup image seule {n.actionUrl ? `→ ${n.actionUrl}` : ""}</p>
                        ) : (
                          <>
                            <h3 className="font-semibold text-gray-900 mb-1">{n.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{n.message}</p>
                            {n.buttonText && <p className="text-xs text-blue-600 mt-1">Bouton: {n.buttonText}</p>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ToggleSwitch value={n.isActive} onChange={() => toggleActive(n)} />
                      <button onClick={() => openEdit(n)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteNotif(n.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal création / édition ─────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{isEdit ? "Modifier" : "Nouveau"} popup</h3>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* ── Sélecteur de mode ────────────────────────────────── */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Type de popup</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "image_only", label: "Image seule", desc: "Photo plein écran + bouton ✕", icon: Image },
                  { value: "classic",    label: "Classique",   desc: "Titre + message + bouton",   icon: Bell },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = modal.displayMode === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setModal(m => m ? { ...m, displayMode: opt.value } : null)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl border-2 text-left transition-all ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`text-sm font-semibold ${active ? "text-blue-700" : "text-gray-700"}`}>{opt.label}</span>
                      <span className={`text-xs text-center leading-snug ${active ? "text-blue-500" : "text-gray-400"}`}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">

              {/* ── IMAGE (commun aux deux modes) ───────────────────── */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  {modal.displayMode === "image_only" ? "Image du popup *" : "Image / Icône (optionnel)"}
                </label>
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-3">
                  {(["file", "url"] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => setModal(prev => prev ? { ...prev, uploadMode: m } : null)}
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
                      className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors overflow-hidden ${modal.previewSrc ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
                    >
                      {modal.previewSrc ? (
                        <div className="flex flex-col items-center py-4">
                          <img src={modal.previewSrc} alt="Aperçu" className="max-h-48 w-auto rounded-2xl shadow mb-2 object-contain" />
                          <span className="text-xs text-blue-600 font-medium">Cliquer pour changer</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                          <Upload className="w-8 h-8 text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-500">Cliquez pour importer une image</p>
                          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP — max 8 Mo</p>
                        </div>
                      )}
                    </div>
                    {modal.previewSrc && (
                      <button type="button" onClick={() => setModal(m => m ? { ...m, imageData: "", previewSrc: "" } : null)}
                        className="mt-1.5 text-xs text-red-500 hover:text-red-700">
                        Supprimer l'image
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input value={modal.imageUrl ?? ""} onChange={e => setModal({ ...modal, imageUrl: e.target.value, previewSrc: e.target.value })}
                      placeholder="https://…" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {modal.previewSrc && (
                      <div className="mt-3 flex justify-center">
                        <img src={modal.previewSrc} alt="Aperçu" className="max-h-40 w-auto rounded-2xl shadow border border-gray-100 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── ACTION AU CLIC (image seule) ─────────────────────── */}
              {modal.displayMode === "image_only" && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Action au clic sur l'image (facultatif)</label>
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-3">
                    {ACTION_TYPES.map(at => (
                      <button key={at.value} type="button"
                        onClick={() => setModal(m => m ? { ...m, actionType: at.value } : null)}
                        className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${modal.actionType === at.value ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                        {at.icon} {at.label}
                      </button>
                    ))}
                  </div>
                  {modal.actionType !== "none" && (
                    <input
                      value={modal.actionUrl ?? ""}
                      onChange={e => setModal({ ...modal, actionUrl: e.target.value })}
                      placeholder={modal.actionType === "link" ? "https://example.com" : "/dashboard"}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {modal.actionType !== "none" && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {modal.actionType === "link" ? "Ouvre un lien externe dans le navigateur" : "Navigue vers une page de l'app"}
                    </p>
                  )}
                </div>
              )}

              {/* ── CHAMPS CLASSIQUES (titre, message, type, bouton) ─── */}
              {modal.displayMode === "classic" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
                    <input value={modal.title ?? ""} onChange={e => setModal({ ...modal, title: e.target.value })}
                      placeholder="Titre du message" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Message *</label>
                    <textarea value={modal.message ?? ""} onChange={e => setModal({ ...modal, message: e.target.value })}
                      rows={3} placeholder="Contenu du message" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                    <select value={modal.type ?? "info"} onChange={e => setModal({ ...modal, type: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Texte du bouton</label>
                      <input value={modal.buttonText ?? ""} onChange={e => setModal({ ...modal, buttonText: e.target.value })}
                        placeholder="D'accord" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">URL du bouton</label>
                      <input value={modal.buttonUrl ?? ""} onChange={e => setModal({ ...modal, buttonUrl: e.target.value })}
                        placeholder="/dashboard" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">Activer immédiatement</label>
                <ToggleSwitch value={modal.isActive !== false} onChange={v => setModal({ ...modal, isActive: v })} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={save} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60 flex items-center justify-center">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? "Sauvegarder" : "Créer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
