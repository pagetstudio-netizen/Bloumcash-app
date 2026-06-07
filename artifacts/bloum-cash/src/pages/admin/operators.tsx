import React, { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Trash2, Edit3, X, Globe, Wifi, WifiOff, AlertCircle } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface Country {
  id: number;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  feeDeposit: number;
  feeWithdraw: number;
}

interface Operator {
  id: number;
  name: string;
  type: string;
  countryCode: string;
  gateway: string;
  dailyLimit: number;
  isActive: boolean;
  maintenanceAll: boolean;
  maintenanceDeposit: boolean;
  maintenanceWithdraw: boolean;
  maintenancePaymentLink: boolean;
  maintenanceApiPayment: boolean;
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminOperators() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"operators" | "countries">("operators");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [editOp, setEditOp] = useState<Operator | null>(null);
  const [addOpOpen, setAddOpOpen] = useState(false);
  const [newOp, setNewOp] = useState({ name: "", countryCode: "TG", gateway: "PayDunya", dailyLimit: "1000000" });
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [cr, or] = await Promise.all([adminFetch("/admin/countries"), adminFetch("/admin/operators")]);
      if (cr.ok) setCountries(await cr.json());
      if (or.ok) setOperators(await or.json());
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateOperator = async (op: Operator, field: Partial<Operator>) => {
    const updated = { ...op, ...field };
    setOperators(ops => ops.map(o => o.id === op.id ? updated : o));
    await adminFetch(`/admin/operators/${op.id}`, { method: "PUT", body: JSON.stringify(updated) });
    showToast("Opérateur mis à jour");
  };

  const saveEditOp = async () => {
    if (!editOp) return;
    setActionLoading(true);
    try {
      await adminFetch(`/admin/operators/${editOp.id}`, { method: "PUT", body: JSON.stringify(editOp) });
      showToast("Opérateur modifié");
      setEditOp(null);
      load();
    } finally { setActionLoading(false); }
  };

  const deleteOp = async (id: number) => {
    if (!confirm("Supprimer cet opérateur ?")) return;
    await adminFetch(`/admin/operators/${id}`, { method: "DELETE" });
    showToast("Opérateur supprimé");
    load();
  };

  const addOperator = async () => {
    if (!newOp.name) { alert("Nom requis"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch("/admin/operators", { method: "POST", body: JSON.stringify(newOp) });
      if (r.ok) { showToast("Opérateur ajouté"); setAddOpOpen(false); setNewOp({ name: "", countryCode: "TG", gateway: "PayDunya", dailyLimit: "1000000" }); load(); }
    } finally { setActionLoading(false); }
  };

  const updateCountry = async (c: Country, field: Partial<Country>) => {
    const updated = { ...c, ...field };
    setCountries(cs => cs.map(x => x.id === c.id ? updated : x));
    await adminFetch(`/admin/countries/${c.id}`, { method: "PUT", body: JSON.stringify(updated) });
    showToast("Pays mis à jour");
  };

  return (
    <AdminLayout title="Pays & Opérateurs">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(["operators", "countries"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {t === "operators" ? "Opérateurs" : "Pays"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {tab === "operators" && (
              <button onClick={() => setAddOpOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : tab === "operators" ? (
          <div className="space-y-3">
            {operators.map(op => (
              <div key={op.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{op.name}</h3>
                      <p className="text-xs text-gray-400">{op.countryCode} · {op.gateway} · {(op.dailyLimit / 1000).toFixed(0)}K FCFA/jour</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditOp({ ...op })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteOp(op.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Actif", field: "isActive" as const, value: op.isActive },
                    { label: "Maintenance totale", field: "maintenanceAll" as const, value: op.maintenanceAll },
                    { label: "Dépôts bloqués", field: "maintenanceDeposit" as const, value: op.maintenanceDeposit },
                    { label: "Retraits bloqués", field: "maintenanceWithdraw" as const, value: op.maintenanceWithdraw },
                    { label: "Lien paiement bloqué", field: "maintenancePaymentLink" as const, value: op.maintenancePaymentLink },
                    { label: "API paiement bloquée", field: "maintenanceApiPayment" as const, value: op.maintenanceApiPayment },
                  ].map(({ label, field, value }) => (
                    <div key={field} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-600">{label}</span>
                      <ToggleSwitch value={value} onChange={v => updateOperator(op, { [field]: v })} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {operators.length === 0 && <div className="text-center py-12 text-sm text-gray-400">Aucun opérateur configuré</div>}
          </div>
        ) : (
          <div className="space-y-3">
            {countries.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{c.name} ({c.code})</h3>
                      <p className="text-xs text-gray-400">{c.currency}</p>
                    </div>
                  </div>
                  <ToggleSwitch value={c.isActive} onChange={v => updateCountry(c, { isActive: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <label className="text-xs text-gray-500 block mb-1">Frais dépôt (%)</label>
                    <input type="number" value={c.feeDeposit} step="0.5"
                      onChange={e => updateCountry(c, { feeDeposit: parseFloat(e.target.value) })}
                      className="w-full text-sm font-semibold text-gray-900 bg-transparent focus:outline-none" />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <label className="text-xs text-gray-500 block mb-1">Frais retrait (%)</label>
                    <input type="number" value={c.feeWithdraw} step="0.5"
                      onChange={e => updateCountry(c, { feeWithdraw: parseFloat(e.target.value) })}
                      className="w-full text-sm font-semibold text-gray-900 bg-transparent focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit operator modal */}
      {editOp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Modifier {editOp.name}</h3>
              <button onClick={() => setEditOp(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Nom", key: "name" as const, type: "text" },
                { label: "Passerelle", key: "gateway" as const, type: "text" },
                { label: "Code pays", key: "countryCode" as const, type: "text" },
                { label: "Limite journalière (FCFA)", key: "dailyLimit" as const, type: "number" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input type={type} value={String(editOp[key])} onChange={e => setEditOp({ ...editOp, [key]: type === "number" ? parseInt(e.target.value) : e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditOp(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={saveEditOp} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add operator modal */}
      {addOpOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Nouvel opérateur</h3>
              <button onClick={() => setAddOpOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={newOp.name} onChange={e => setNewOp({ ...newOp, name: e.target.value })} placeholder="Nom (ex: Flooz)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={newOp.countryCode} onChange={e => setNewOp({ ...newOp, countryCode: e.target.value.toUpperCase().slice(0, 2) })} placeholder="Code pays (TG, BJ…)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={newOp.gateway} onChange={e => setNewOp({ ...newOp, gateway: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PayDunya">PayDunya</option>
                <option value="MbiyoPay">MbiyoPay</option>
                <option value="Autre">Autre</option>
              </select>
              <input type="number" value={newOp.dailyLimit} onChange={e => setNewOp({ ...newOp, dailyLimit: e.target.value })} placeholder="Limite journalière (FCFA)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAddOpOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={addOperator} disabled={actionLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
