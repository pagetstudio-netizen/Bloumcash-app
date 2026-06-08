import React, { useEffect, useState, useCallback } from "react";
import {
  Cpu, Plus, Trash2, Edit3, X, Loader2, RefreshCw, AlertCircle,
  CheckCircle, ShieldAlert, Zap, Globe, Wifi, WifiOff, ChevronDown,
} from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";
import { motion, AnimatePresence } from "framer-motion";

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
  createdAt?: string;
}

const GATEWAYS = ["PayDunya", "GomboPlus"] as const;
const COUNTRIES = ["TG", "BJ", "BF", "CI", "SN", "GH", "CM"];

const COUNTRY_NAME: Record<string, string> = {
  TG: "🇹🇬 Togo", BJ: "🇧🇯 Bénin", BF: "🇧🇫 Burkina Faso",
  CI: "🇨🇮 Côte d'Ivoire", SN: "🇸🇳 Sénégal", GH: "🇬🇭 Ghana", CM: "🇨🇲 Cameroun",
};

const GATEWAY_STYLE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  PayDunya:  { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500",   border: "border-blue-400" },
  GomboPlus: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-400" },
};

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

interface FormState {
  name: string;
  type: string;
  countryCode: string;
  gateway: string;
  dailyLimit: string;
  isActive: boolean;
  maintenanceAll: boolean;
  maintenanceDeposit: boolean;
  maintenanceWithdraw: boolean;
  maintenancePaymentLink: boolean;
  maintenanceApiPayment: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "", type: "mobile_money", countryCode: "TG", gateway: "PayDunya",
  dailyLimit: "1000000", isActive: true,
  maintenanceAll: false, maintenanceDeposit: false, maintenanceWithdraw: false,
  maintenancePaymentLink: false, maintenanceApiPayment: false,
};

function toForm(op: Operator): FormState {
  return {
    name: op.name, type: op.type, countryCode: op.countryCode, gateway: op.gateway,
    dailyLimit: String(op.dailyLimit), isActive: op.isActive,
    maintenanceAll: op.maintenanceAll, maintenanceDeposit: op.maintenanceDeposit,
    maintenanceWithdraw: op.maintenanceWithdraw, maintenancePaymentLink: op.maintenancePaymentLink,
    maintenanceApiPayment: op.maintenanceApiPayment,
  };
}

export default function AdminOperators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"operators" | "countries">("operators");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; op?: Operator; form: FormState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [or, cr] = await Promise.all([adminFetch("/admin/operators"), adminFetch("/admin/countries")]);
      if (or.ok) setOperators(await or.json());
      if (cr.ok) setCountries(await cr.json());
      else if (!or.ok) setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => setModal({ mode: "create", form: { ...DEFAULT_FORM } });
  const openEdit   = (op: Operator) => setModal({ mode: "edit", op, form: toForm(op) });
  const closeModal = () => { if (!saving) setModal(null); };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setModal(prev => prev ? { ...prev, form: { ...prev.form, [key]: val } } : null);

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const { form, mode, op } = modal;
      const body = {
        name: form.name, type: form.type, countryCode: form.countryCode, gateway: form.gateway,
        dailyLimit: parseInt(form.dailyLimit || "1000000"), isActive: form.isActive,
        maintenanceAll: form.maintenanceAll, maintenanceDeposit: form.maintenanceDeposit,
        maintenanceWithdraw: form.maintenanceWithdraw, maintenancePaymentLink: form.maintenancePaymentLink,
        maintenanceApiPayment: form.maintenanceApiPayment,
      };
      const url    = mode === "create" ? "/admin/operators" : `/admin/operators/${op!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const r = await adminFetch(url, { method, body: JSON.stringify(body) });
      if (r.ok) {
        showToast(mode === "create" ? "Opérateur créé ✅" : "Opérateur mis à jour ✅");
        setModal(null);
        await load();
      } else {
        const d = await r.json().catch(() => ({})) as { error?: string };
        showToast(d.error ?? "Erreur sauvegarde");
      }
    } catch { showToast("Erreur réseau"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet opérateur ?")) return;
    setDeleting(id);
    try {
      const r = await adminFetch(`/admin/operators/${id}`, { method: "DELETE" });
      if (r.ok) { showToast("Opérateur supprimé"); await load(); }
      else showToast("Erreur suppression");
    } catch { showToast("Erreur réseau"); } finally { setDeleting(null); }
  };

  const updateOperator = async (op: Operator, field: Partial<Operator>) => {
    const updated = { ...op, ...field };
    setOperators(ops => ops.map(o => o.id === op.id ? updated : o));
    await adminFetch(`/admin/operators/${op.id}`, { method: "PUT", body: JSON.stringify(updated) });
    showToast("Mis à jour");
  };

  const updateCountry = async (c: Country, field: Partial<Country>) => {
    const updated = { ...c, ...field };
    setCountries(cs => cs.map(x => x.id === c.id ? updated : x));
    await adminFetch(`/admin/countries/${c.id}`, { method: "PUT", body: JSON.stringify(updated) });
    showToast("Pays mis à jour");
  };

  const byCountry = operators.reduce<Record<string, Operator[]>>((acc, op) => {
    (acc[op.countryCode] ??= []).push(op);
    return acc;
  }, {});

  return (
    <AdminLayout title="Pays & Opérateurs">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs + actions */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {(["operators", "countries"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              {t === "operators" ? "Opérateurs" : "Pays"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          {tab === "operators" && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nouvel opérateur
            </button>
          )}
        </div>
      </div>

      {/* Gateway legend */}
      {tab === "operators" && (
        <div className="flex gap-3 mb-5">
          {GATEWAYS.map(gw => {
            const s = GATEWAY_STYLE[gw];
            const count = operators.filter(o => o.gateway === gw).length;
            return (
              <div key={gw} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${s.bg} ${s.text}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {gw} <span className="opacity-60">({count})</span>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : tab === "operators" ? (

        /* ── OPERATORS ── */
        operators.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun opérateur configuré</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">Créer le premier opérateur</button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCountry).map(([code, ops]) => (
              <div key={code}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> {COUNTRY_NAME[code] ?? code}
                </h3>
                <div className="space-y-3">
                  {ops.map(op => {
                    const gwStyle = GATEWAY_STYLE[op.gateway] ?? GATEWAY_STYLE.PayDunya;
                    const hasMaint = op.maintenanceAll || op.maintenanceDeposit || op.maintenanceWithdraw;
                    return (
                      <motion.div key={op.id} layout
                        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${op.isActive ? "bg-blue-50" : "bg-gray-100"}`}>
                              {op.isActive ? <Wifi className="w-4 h-4 text-blue-600" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{op.name}</span>
                                {!op.isActive && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Inactif</span>}
                                {hasMaint && (
                                  <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                                    <ShieldAlert className="w-2.5 h-2.5" /> Maintenance
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {/* Gateway badge */}
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${gwStyle.bg} ${gwStyle.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${gwStyle.dot}`} />
                                  {op.gateway}
                                </span>
                                <span className="text-xs text-gray-400">{(op.dailyLimit / 1000).toFixed(0)}K FCFA/j</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(op)}
                              className="p-2 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id}
                              className="p-2 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-colors disabled:opacity-40">
                              {deleting === op.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Inline toggles */}
                        <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: "Actif",           field: "isActive"              as const },
                            { label: "Maintenance tout", field: "maintenanceAll"        as const },
                            { label: "Dépôts",          field: "maintenanceDeposit"    as const },
                            { label: "Retraits",        field: "maintenanceWithdraw"   as const },
                            { label: "Lien paiement",   field: "maintenancePaymentLink" as const },
                            { label: "API paiement",    field: "maintenanceApiPayment"  as const },
                          ].map(({ label, field }) => (
                            <div key={field} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-2.5 py-2">
                              <span className="text-xs text-gray-500">{label}</span>
                              <ToggleSwitch value={op[field] as boolean} onChange={v => updateOperator(op, { [field]: v })} />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )

      ) : (

        /* ── COUNTRIES ── */
        <div className="space-y-3">
          {countries.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                    <Globe className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{c.name} ({c.code})</h3>
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
          {countries.length === 0 && <div className="text-center py-12 text-sm text-gray-400">Aucun pays configuré</div>}
        </div>
      )}

      {/* ── Modal create/edit ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                <h2 className="font-semibold text-gray-900">
                  {modal.mode === "create" ? "Nouvel opérateur" : `Modifier — ${modal.op?.name}`}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'opérateur</label>
                  <input value={modal.form.name} onChange={e => setField("name", e.target.value)}
                    placeholder="ex: TMoney, Moov Money"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Pays + Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
                    <div className="relative">
                      <select value={modal.form.countryCode} onChange={e => setField("countryCode", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {COUNTRIES.map(c => <option key={c} value={c}>{COUNTRY_NAME[c] ?? c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <div className="relative">
                      <select value={modal.form.type} onChange={e => setField("type", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank">Banque</option>
                        <option value="crypto">Crypto</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* ── Gateway selector ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passerelle de paiement</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GATEWAYS.map(gw => {
                      const s = GATEWAY_STYLE[gw];
                      const active = modal.form.gateway === gw;
                      return (
                        <button key={gw} type="button" onClick={() => setField("gateway", gw)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${active ? `${s.border} ${s.bg} ${s.text}` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? s.dot : "bg-gray-300"}`} />
                          <span className="font-medium text-sm">{gw}</span>
                          {active && <CheckCircle className="w-4 h-4 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {modal.form.gateway === "GomboPlus" && (
                    <div className="mt-2 p-3 bg-orange-50 rounded-xl text-xs text-orange-700 flex gap-2 items-start">
                      <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div>
                        Les transferts de cet opérateur passeront par <strong>GomboPlus (EgoPay)</strong>.
                        Vérifiez que les secrets <code className="font-mono bg-orange-100 px-1 rounded">GOMBOPLUS_PUBLIC_KEY</code> et <code className="font-mono bg-orange-100 px-1 rounded">GOMBOPLUS_PRIVATE_KEY</code> sont configurés.
                      </div>
                    </div>
                  )}
                </div>

                {/* Limite journalière */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Limite journalière (FCFA)</label>
                  <input type="number" value={modal.form.dailyLimit} onChange={e => setField("dailyLimit", e.target.value)}
                    min="0" step="10000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Actif */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Opérateur actif</span>
                  <ToggleSwitch value={modal.form.isActive} onChange={v => setField("isActive", v)} />
                </div>

                {/* Maintenance */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-yellow-500" /> Modes maintenance
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "maintenanceAll"          as const, label: "Tout désactiver",   desc: "Bloque toutes les opérations" },
                      { key: "maintenanceDeposit"      as const, label: "Dépôts",            desc: "Bloque les dépôts" },
                      { key: "maintenanceWithdraw"     as const, label: "Retraits",          desc: "Bloque les retraits" },
                      { key: "maintenancePaymentLink"  as const, label: "Liens paiement",    desc: "Bloque les liens QR" },
                      { key: "maintenanceApiPayment"   as const, label: "API paiement",      desc: "Bloque les paiements API" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                        <ToggleSwitch value={modal.form[item.key]} onChange={v => setField(item.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-white border-t border-gray-50">
                <button onClick={closeModal} disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || !modal.form.name.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {modal.mode === "create" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
