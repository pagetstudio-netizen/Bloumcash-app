import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";
import { validateTogoPhone } from "@/lib/utils";

const BLUE = "#2d52e8";
const PAGE_BG = "#eff2f7";

const loginSchema = z.object({
  phone: z.string().refine((v) => validateTogoPhone(v).valid, {
    message: "Numéro Togo invalide (TMoney: 90-93, Moov: 96-99)",
  }),
  pin: z.string().min(4, { message: "Mot de passe requis (min. 4 caractères)" }),
});

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

function extractApiError(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  if (e.data && typeof e.data === "object") {
    const d = e.data as Record<string, unknown>;
    if (typeof d.error === "string") return d.error;
  }
  return undefined;
}

/* ── Champ téléphone réutilisable ── */
function PhoneField({ register, hasError }: { register: ReturnType<typeof useForm>["register"]; hasError: boolean }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>
        Numéro de téléphone
      </label>
      <div style={{ display: "flex", alignItems: "center", height: 52, borderRadius: 12, border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb", background: hasError ? "#fef2f2" : "#f9fafb", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: "100%", background: hasError ? "#fee2e2" : "#f1f3f7", borderRight: "1.5px solid #e5e7eb", flexShrink: 0, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>🇹🇬</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>+228</span>
        </div>
        <input placeholder="XX XX XX XX" type="tel" inputMode="numeric" autoComplete="off" data-form-type="other" {...register("phone")} style={{ flex: 1, height: "100%", background: "transparent", border: "none", outline: "none", padding: "0 14px", fontSize: 15, color: "#111827", letterSpacing: 1 }} />
      </div>
      <p style={{ fontSize: 11, color: hasError ? "#ef4444" : "#9ca3af", marginTop: 4, marginLeft: 2 }}>
        TMoney: 90-93 · Moov Money: 96-99
      </p>
    </div>
  );
}

/* ── Champ mot de passe réutilisable ── */
function PinField({ label, placeholder, register, hasError, errorMsg, show, onToggle }: {
  label: string; placeholder: string;
  register: ReturnType<typeof useForm>["register"];
  hasError: boolean; errorMsg?: string;
  show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input placeholder={placeholder} type={show ? "text" : "password"} autoComplete="new-password" data-form-type="other" {...register("pin")} style={{ width: "100%", height: 52, borderRadius: 12, border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb", background: hasError ? "#fef2f2" : "#f9fafb", padding: "0 48px 0 16px", fontSize: 15, color: "#111827", outline: "none", boxSizing: "border-box" }} />
        <button type="button" onClick={onToggle} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {hasError && errorMsg && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errorMsg}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FORMULAIRE CONNEXION
═══════════════════════════════════════════════════════════════ */
function LoginForm() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { showModal } = useModal();
  const loginMutation = useLogin();
  const [showPin, setShowPin] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", pin: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    const { normalized } = validateTogoPhone(values.phone);
    try {
      const result = await loginMutation.mutateAsync({ data: { phone: normalized, pin: values.pin } });
      login(result.user, result.token);
      setLocation("/dashboard");
    } catch (err: unknown) {
      const apiMsg = extractApiError(err);
      showModal({
        type: "error",
        title: "Erreur de connexion",
        message: apiMsg ?? "Numéro ou mot de passe incorrect. Vérifiez vos identifiants.",
      });
    }
  }

  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" data-form-type="other" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
      <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

      <PhoneField register={form.register} hasError={!!errors.phone} />
      {errors.phone && <p style={{ fontSize: 11, color: "#ef4444", marginTop: -12, marginLeft: 2 }}>{errors.phone.message}</p>}

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Mot de passe</label>
          <Link href="/forgot-pin" style={{ fontSize: 13, fontWeight: 600, color: BLUE, textDecoration: "none" }}>
            Code PIN oublié ?
          </Link>
        </div>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Votre mot de passe"
            type={showPin ? "text" : "password"}
            autoComplete="current-password"
            {...form.register("pin")}
            style={{ width: "100%", height: 52, borderRadius: 12, border: errors.pin ? "1.5px solid #f87171" : "1.5px solid #e5e7eb", background: errors.pin ? "#fef2f2" : "#f9fafb", padding: "0 48px 0 16px", fontSize: 15, color: "#111827", outline: "none", boxSizing: "border-box" }}
          />
          <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.pin && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.pin.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loginMutation.isPending}
        style={{ width: "100%", height: 54, borderRadius: 14, background: loginMutation.isPending ? "#7a90f0" : BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: loginMutation.isPending ? "not-allowed" : "pointer", marginTop: 4, letterSpacing: 0.2 }}
      >
        {loginMutation.isPending ? "Connexion en cours…" : "Connexion"}
      </button>
    </form>
  );
}

/* ════════════════════════════════════════════════════════════
   FORMULAIRE INSCRIPTION
═══════════════════════════════════════════════════════════════ */
function RegisterForm() {
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
      const apiMsg = extractApiError(err);
      showModal({
        type: "error",
        title: "Erreur d'inscription",
        message: apiMsg ?? "Impossible de créer le compte. Vérifiez votre connexion et réessayez.",
      });
    }
  }

  const errors = form.formState.errors;

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
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
    <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" data-form-type="other" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
      <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

      <PhoneField register={form.register} hasError={!!errors.phone} />
      {errors.phone && <p style={{ fontSize: 11, color: "#ef4444", marginTop: -12, marginLeft: 2 }}>{errors.phone.message}</p>}

      {/* Mot de passe */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>Mot de passe</label>
        <div style={{ position: "relative" }}>
          <input placeholder="Créer votre mot de passe" type={showPin ? "text" : "password"} autoComplete="new-password" {...form.register("pin")} style={fieldStyle(!!errors.pin)} />
          <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.pin && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.pin.message}</p>}
      </div>

      {/* Confirmer mot de passe */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#374151" }}>Confirmer le mot de passe</label>
        <div style={{ position: "relative" }}>
          <input placeholder="Confirmer votre mot de passe" type={showConfirm ? "text" : "password"} autoComplete="new-password" {...form.register("confirmPin")} style={fieldStyle(!!errors.confirmPin)} />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 0 }}>
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.confirmPin && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 2 }}>{errors.confirmPin.message}</p>}
      </div>

      <button
        type="submit"
        disabled={registerMutation.isPending}
        style={{ width: "100%", height: 54, borderRadius: 14, background: registerMutation.isPending ? "#7a90f0" : BLUE, color: "#fff", fontSize: 16, fontWeight: 700, border: "none", cursor: registerMutation.isPending ? "not-allowed" : "pointer", marginTop: 4, letterSpacing: 0.2 }}
      >
        {registerMutation.isPending ? "Création du compte…" : "S'inscrire"}
      </button>
    </form>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE (onglets)
═══════════════════════════════════════════════════════════════ */
export default function AuthPage({ defaultTab = "login" }: { defaultTab?: "login" | "register" }) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: PAGE_BG }}>
      <div className="md:max-w-md md:mx-auto w-full flex flex-col min-h-[100dvh]">

        {/* ── En-tête bleue ── */}
        <div
          className="flex flex-col items-center"
          style={{ background: BLUE, paddingTop: 52, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <div style={{ width: 76, height: 76, background: "#fff", borderRadius: 22, boxShadow: "0 6px 24px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" }}>
            <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 76, height: 76, objectFit: "contain" }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: -0.3 }}>
            Bloum Cash
          </h1>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 400 }}>
            {tab === "login" ? "Connexion à votre compte" : "Créer votre compte"}
          </p>
        </div>

        {/* ── Carte formulaire ── */}
        <div style={{ background: "#fff", borderRadius: 24, margin: "0 16px", marginTop: -32, padding: "0 0 24px", boxShadow: "0 4px 32px rgba(0,0,0,0.11)" }}>

          {/* ── Onglets ── */}
          <div style={{ display: "flex", borderBottom: "1.5px solid #f0f0f0" }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  height: 52,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: tab === t ? 800 : 500,
                  color: tab === t ? BLUE : "#9ca3af",
                  borderBottom: tab === t ? `2.5px solid ${BLUE}` : "2.5px solid transparent",
                  transition: "all 0.18s",
                  letterSpacing: 0.1,
                }}
              >
                {t === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* ── Formulaire actif ── */}
          <div style={{ padding: "20px 24px 0" }}>
            {tab === "login" ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />
      </div>
    </div>
  );
}
