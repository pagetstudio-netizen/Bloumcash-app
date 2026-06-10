import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import { validateTogoPhone } from "@/lib/utils";

const registerSchema = z.object({
  phone: z.string().refine((v) => validateTogoPhone(v).valid, {
    message: "Numéro Togo invalide (TMoney: 90-93, Moov: 96-99)",
  }),
  pin: z.string().min(4, { message: "Min. 4 caractères" }),
  confirmPin: z.string().min(4, { message: "Confirmez votre mot de passe" }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPin"],
});

const BLUE = "#2d52e8";
const PAGE_BG = "#eff2f7";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { showModal } = useModal();
  const registerMutation = useRegister();
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: "", pin: "", confirmPin: "" },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    const { normalized } = validateTogoPhone(values.phone);
    try {
      const result = await registerMutation.mutateAsync({
        data: { phone: normalized, pin: values.pin } as Parameters<typeof registerMutation.mutateAsync>[0]["data"],
      });
      login(result.user, result.token);
      showModal({
        type: "success",
        title: "Compte créé !",
        message: "Bienvenue sur Bloum Cash.",
        onClose: () => setLocation("/dashboard"),
      });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const data = e?.data as Record<string, unknown> | undefined;
      const apiMsg = typeof data?.error === "string" ? data.error : undefined;
      showModal({
        type: "error",
        title: "Erreur d'inscription",
        message: apiMsg ?? "Impossible de créer le compte. Vérifiez votre connexion et réessayez.",
      });
    }
  }

  const errors = form.formState.errors;

  const fieldBase = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 52,
    borderRadius: 12,
    border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
    background: hasError ? "#fef2f2" : "#f9fafb",
    padding: "0 48px 0 16px",
    fontSize: 15,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: PAGE_BG }}>
      <div className="md:max-w-md md:mx-auto w-full flex flex-col min-h-[100dvh]">

        {/* ── En-tête bleue ── */}
        <div className="flex flex-col items-center" style={{ background: BLUE, paddingTop: 44, paddingBottom: 56, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <div style={{ width: 72, height: 72, background: "#fff", borderRadius: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" }}>
            <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 72, height: 72, objectFit: "contain" }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Bloum Cash</h1>
        </div>

        {/* ── Carte formulaire ── */}
        <div style={{ background: "#fff", borderRadius: 24, margin: "0 16px", marginTop: -28, padding: "24px 24px 20px", boxShadow: "0 4px 32px rgba(0,0,0,0.11)" }}>
          <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: 22, color: "#111827", marginBottom: 20 }}>Inscription</h2>

          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" data-form-type="other" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
            <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

            {/* ── Numéro de téléphone ── */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>Numéro de téléphone</label>
              <div style={{ display: "flex", alignItems: "center", height: 50, borderRadius: 12, border: errors.phone ? "1.5px solid #f87171" : "1.5px solid #e5e7eb", background: errors.phone ? "#fef2f2" : "#f9fafb", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 11px", height: "100%", background: errors.phone ? "#fee2e2" : "#f1f3f7", borderRight: "1.5px solid #e5e7eb", flexShrink: 0, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 17, lineHeight: 1 }}>🇹🇬</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>+228</span>
                </div>
                <input placeholder="XX XX XX XX" type="tel" inputMode="numeric" autoComplete="off" data-form-type="other" {...form.register("phone")} style={{ flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", padding: "0 12px", fontSize: 15, color: "#111827", letterSpacing: 1 }} />
              </div>
              {errors.phone
                ? <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.phone.message}</p>
                : <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, marginLeft: 2 }}>TMoney: 90-93 · Moov Money: 96-99</p>}
            </div>

            {/* ── Mot de passe ── */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input placeholder="Créer votre mot de passe" type={showPin ? "text" : "password"} autoComplete="new-password" data-form-type="other" {...form.register("pin")} style={fieldBase(!!errors.pin)} />
                <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.pin && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.pin.message}</p>}
            </div>

            {/* ── Confirmer mot de passe ── */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14, color: "#374151" }}>Confirmer le mot de passe</label>
              <div style={{ position: "relative" }}>
                <input placeholder="Confirmer votre mot de passe" type={showConfirm ? "text" : "password"} autoComplete="new-password" data-form-type="other" {...form.register("confirmPin")} style={fieldBase(!!errors.confirmPin)} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPin && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.confirmPin.message}</p>}
            </div>

            {/* ── Bouton ── */}
            <button type="submit" disabled={registerMutation.isPending} style={{ width: "100%", height: 52, borderRadius: 14, background: registerMutation.isPending ? "#7a90f0" : BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: registerMutation.isPending ? "not-allowed" : "pointer", marginTop: 4, letterSpacing: 0.2 }}>
              {registerMutation.isPending ? "Création du compte…" : "S'Inscrire"}
            </button>

            {/* ── Lien connexion ── */}
            <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", marginTop: 2 }}>
              Vous avez déjà un compte ?{" "}
              <Link href="/login" style={{ color: BLUE, fontWeight: 700, textDecoration: "none" }}>Se connecter</Link>
            </p>
          </form>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />
      </div>
    </div>
  );
}
