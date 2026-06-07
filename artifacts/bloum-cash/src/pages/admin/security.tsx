import React, { useEffect, useState, useCallback } from "react";
import { Shield, Plus, Trash2, RefreshCw, Loader2, AlertCircle, X, Check, Clock, ShieldOff, ShieldCheck } from "lucide-react";
import AdminLayout, { adminFetch } from "./layout";

interface BlockedIp { id: number; ip: string; reason: string | null; createdAt: string; }
interface WhitelistedIp { id: number; ip: string; label: string | null; createdAt: string; }
interface SecurityEvent { id: number; type: string; ip: string | null; details: string | null; createdAt: string; }

interface SecurityData {
  stats: { blockedIps: number; whitelistedIps: number; failedLogins: number; attempts1h: number };
  blockedIps: BlockedIp[];
  whitelistedIps: WhitelistedIp[];
  events: SecurityEvent[];
}

const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  ip_blocked: { label: "IP bloquée", color: "bg-red-100 text-red-700" },
  phone_blacklisted: { label: "Numéro blacklisté", color: "bg-orange-100 text-orange-700" },
  email_broadcast: { label: "Email broadcast", color: "bg-blue-100 text-blue-700" },
  login_failed: { label: "Connexion échouée", color: "bg-yellow-100 text-yellow-700" },
};

export default function AdminSecurity() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"blocked" | "whitelist" | "logs">("blocked");
  const [toast, setToast] = useState("");
  const [blockModal, setBlockModal] = useState(false);
  const [whiteModal, setWhiteModal] = useState(false);
  const [ipInput, setIpInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await adminFetch("/admin/security");
      if (r.ok) setData(await r.json());
      else setError("Erreur chargement");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const blockIp = async () => {
    if (!ipInput) { alert("IP requise"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch("/admin/security/block-ip", { method: "POST", body: JSON.stringify({ ip: ipInput, reason: reasonInput || null }) });
      const d = await r.json();
      if (r.ok) { showToast("IP bloquée"); setBlockModal(false); setIpInput(""); setReasonInput(""); load(); }
      else { alert(d.error); }
    } finally { setActionLoading(false); }
  };

  const unblockIp = async (id: number) => {
    if (!confirm("Débloquer cette IP ?")) return;
    await adminFetch(`/admin/security/block-ip/${id}`, { method: "DELETE" });
    showToast("IP débloquée"); load();
  };

  const whitelistIp = async () => {
    if (!ipInput) { alert("IP requise"); return; }
    setActionLoading(true);
    try {
      const r = await adminFetch("/admin/security/whitelist-ip", { method: "POST", body: JSON.stringify({ ip: ipInput, label: labelInput || null }) });
      const d = await r.json();
      if (r.ok) { showToast("IP ajoutée en liste blanche"); setWhiteModal(false); setIpInput(""); setLabelInput(""); load(); }
      else { alert(d.error); }
    } finally { setActionLoading(false); }
  };

  const removeWhitelist = async (id: number) => {
    if (!confirm("Retirer de la liste blanche ?")) return;
    await adminFetch(`/admin/security/whitelist-ip/${id}`, { method: "DELETE" });
    showToast("IP retirée"); load();
  };

  const eventInfo = (type: string) => EVENT_TYPES[type] ?? { label: type, color: "bg-gray-100 text-gray-600" };

  return (
    <AdminLayout title="Logs & Sécurité">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}

      <div className="space-y-4">
        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "IPs bloquées", value: data.stats.blockedIps, icon: ShieldOff, color: "text-red-600 bg-red-50" },
              { label: "IPs en liste blanche", value: data.stats.whitelistedIps, icon: ShieldCheck, color: "text-green-600 bg-green-50" },
              { label: "Connexions échouées", value: data.stats.failedLogins, icon: AlertCircle, color: "text-yellow-600 bg-yellow-50" },
              { label: "Tentatives (1h)", value: data.stats.attempts1h, icon: Clock, color: "text-blue-600 bg-blue-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color.split(" ")[1]} mb-2`}>
                  <Icon className={`w-4 h-4 ${color.split(" ")[0]}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(["blocked", "whitelist", "logs"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {t === "blocked" ? "IPs bloquées" : t === "whitelist" ? "Liste blanche" : "Événements"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {tab === "blocked" && (
              <button onClick={() => { setBlockModal(true); setIpInput(""); setReasonInput(""); }} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">
                <Plus className="w-3.5 h-3.5" /> Bloquer IP
              </button>
            )}
            {tab === "whitelist" && (
              <button onClick={() => { setWhiteModal(true); setIpInput(""); setLabelInput(""); }} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700">
                <Plus className="w-3.5 h-3.5" /> Ajouter IP
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {tab === "blocked" && (
              data?.blockedIps.length === 0 ? (
                <div className="py-16 text-center"><Shield className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-sm text-gray-400">Aucune IP bloquée</p></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data?.blockedIps.map(ip => (
                    <div key={ip.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center"><ShieldOff className="w-4 h-4 text-red-500" /></div>
                        <div>
                          <div className="font-mono font-semibold text-gray-900 text-sm">{ip.ip}</div>
                          <div className="text-xs text-gray-400">{ip.reason ?? "Bloquée manuellement"} · {new Date(ip.createdAt).toLocaleDateString("fr-FR")}</div>
                        </div>
                      </div>
                      <button onClick={() => unblockIp(ip.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Débloquer">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "whitelist" && (
              data?.whitelistedIps.length === 0 ? (
                <div className="py-16 text-center"><ShieldCheck className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-sm text-gray-400">Aucune IP en liste blanche</p></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data?.whitelistedIps.map(ip => (
                    <div key={ip.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-green-500" /></div>
                        <div>
                          <div className="font-mono font-semibold text-gray-900 text-sm">{ip.ip}</div>
                          <div className="text-xs text-gray-400">{ip.label ?? "Sans étiquette"} · {new Date(ip.createdAt).toLocaleDateString("fr-FR")}</div>
                        </div>
                      </div>
                      <button onClick={() => removeWhitelist(ip.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "logs" && (
              data?.events.length === 0 ? (
                <div className="py-16 text-center"><Clock className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-sm text-gray-400">Aucun événement enregistré</p></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data?.events.map(ev => {
                    const ei = eventInfo(ev.type);
                    return (
                      <div key={ev.id} className="px-5 py-3 flex items-center gap-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ei.color}`}>{ei.label}</span>
                        <span className="text-sm text-gray-600 flex-1 truncate">{ev.details ?? ev.ip ?? "—"}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{new Date(ev.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Block IP modal */}
      {blockModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">Bloquer une IP</h3><button onClick={() => setBlockModal(false)}><X className="w-4 h-4 text-gray-400" /></button></div>
            <div className="space-y-3">
              <input value={ipInput} onChange={e => setIpInput(e.target.value)} placeholder="192.168.0.1 ou 192.168.0.0/24" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500" />
              <textarea value={reasonInput} onChange={e => setReasonInput(e.target.value)} rows={2} placeholder="Raison du blocage…" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setBlockModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={blockIp} disabled={actionLoading} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Bloquer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist modal */}
      {whiteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">Ajouter en liste blanche</h3><button onClick={() => setWhiteModal(false)}><X className="w-4 h-4 text-gray-400" /></button></div>
            <div className="space-y-3">
              <input value={ipInput} onChange={e => setIpInput(e.target.value)} placeholder="192.168.0.1" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
              <input value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="Étiquette (ex: Bureau principal)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setWhiteModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm">Annuler</button>
              <button onClick={whitelistIp} disabled={actionLoading} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
