import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";

const loginSchema = z.object({
  email: z.string().email({ message: "Adresse e-mail invalide" }),
  pin: z.string().min(4, { message: "Mot de passe requis (min. 4 caractères)" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { showModal } = useModal();
  const loginMutation = useLogin();
  const [showPin, setShowPin] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", pin: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const result = await loginMutation.mutateAsync({ data: { email: values.email, pin: values.pin } });
      login(result.user, result.token);
      setLocation("/dashboard");
    } catch {
      showModal({
        type: "error",
        title: "Erreur de connexion",
        message: "Email ou mot de passe incorrect. Vérifiez vos identifiants.",
      });
    }
  }

  const errors = form.formState.errors;

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden flex flex-col md:max-w-md md:mx-auto"
      style={{ background: "#f0f2f5" }}
    >
      {/* ── En-tête bleu ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-14 pb-16 px-6"
        style={{ background: "linear-gradient(160deg, #1a3fc4 0%, #2b50e8 100%)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center mb-5 shadow-lg overflow-hidden"
          style={{ width: 76, height: 76, background: "#fff", borderRadius: 22 }}
        >
          <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 76, height: 76, objectFit: "contain" }} />
        </div>
        <h1 className="text-[24px] font-extrabold text-white tracking-tight">Bloum Cash</h1>
        <p className="text-white/80 text-[13px] mt-1 font-normal">Connexion à votre compte</p>
      </div>

      {/* ── Carte blanche ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: "#fff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -22,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 28,
          paddingBottom: 20,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.10)",
        }}
      >
        <h2
          className="text-center font-bold text-gray-900 mb-7"
          style={{ fontSize: 20 }}
        >
          Connexion
        </h2>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-4 flex-1"
        >
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Email */}
          <div>
            <label
              className="block mb-1.5 font-semibold text-gray-700"
              style={{ fontSize: 13 }}
            >
              Adresse e-mail
            </label>
            <input
              placeholder="nom@exemple.com"
              type="text"
              inputMode="email"
              autoComplete="off"
              data-form-type="other"
              {...form.register("email")}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                border: errors.email ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                background: errors.email ? "#fef2f2" : "#fff",
                padding: "0 16px",
                fontSize: 15,
                color: "#111827",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="font-semibold text-gray-700"
                style={{ fontSize: 13 }}
              >
                Mot de passe
              </label>
              <Link
                href="/forgot-pin"
                className="font-semibold"
                style={{ fontSize: 13, color: "#1a3fc4" }}
              >
                Code PIN oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                placeholder="Votre mot de passe"
                type={showPin ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("pin")}
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 12,
                  border: errors.pin ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                  background: errors.pin ? "#fef2f2" : "#fff",
                  padding: "0 48px 0 16px",
                  fontSize: 15,
                  color: "#111827",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                style={{ lineHeight: 0 }}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.pin && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.pin.message}</p>
            )}
          </div>

          {/* Spacer pousse le bouton vers le bas */}
          <div className="flex-1" />

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 14,
              background: "linear-gradient(90deg, #1a3fc4 0%, #2b50e8 100%)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(26,63,196,0.35)",
              opacity: loginMutation.isPending ? 0.65 : 1,
            }}
          >
            {loginMutation.isPending ? "Connexion en cours..." : "Connexion"}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-gray-500" style={{ fontSize: 13, paddingBottom: 4 }}>
            Nouveau sur Bloum Cash ?{" "}
            <Link href="/register" style={{ color: "#1a3fc4", fontWeight: 700 }}>
              S'inscrire
            </Link>
          </p>

          {/* Lien admin discret */}
          <p className="text-center" style={{ fontSize: 11, paddingBottom: 2 }}>
            <Link href="/admin/login" style={{ color: "#9ca3af" }}>
              Accès Administration
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
