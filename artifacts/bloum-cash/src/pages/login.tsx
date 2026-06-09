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

const TEAL = "#0EC4BA";
const BLUE = "#2d52e8";

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

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 52,
    borderRadius: 12,
    border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
    background: hasError ? "#fef2f2" : "#f9fafb",
    padding: "0 16px",
    fontSize: 15,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div
      className="h-[100dvh] w-full flex flex-col md:max-w-md md:mx-auto overflow-hidden"
      style={{ background: BLUE }}
    >
      {/* ── En-tête bleu ── */}
      <div className="flex-shrink-0 flex flex-col items-center pt-12 pb-16 px-6">
        <div
          className="flex items-center justify-center mb-4 overflow-hidden"
          style={{
            width: 72,
            height: 72,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          }}
        >
          <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 72, height: 72, objectFit: "contain" }} />
        </div>
        <h1 className="text-[22px] font-extrabold text-white tracking-tight">Bloum Cash</h1>
      </div>

      {/* ── Carte blanche fixe ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: "#fff",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -28,
          padding: "32px 24px 28px",
          boxShadow: "0 -6px 30px rgba(0,0,0,0.10)",
        }}
      >
        <h2
          className="text-center font-extrabold mb-8"
          style={{ fontSize: 24, color: BLUE }}
        >
          Connexion
        </h2>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-5"
        >
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Email */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700" style={{ fontSize: 14 }}>
              Adresse e-mail
            </label>
            <input
              placeholder="Adresse e-mail"
              type="text"
              inputMode="email"
              autoComplete="off"
              data-form-type="other"
              {...form.register("email")}
              style={fieldStyle(!!errors.email)}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-700" style={{ fontSize: 14 }}>
                Mot de passe
              </label>
              <Link href="/forgot-pin" className="font-semibold" style={{ fontSize: 13, color: BLUE }}>
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                placeholder="Votre mot de passe"
                type={showPin ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("pin")}
                style={{ ...fieldStyle(!!errors.pin), padding: "0 48px 0 16px" }}
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
              <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.pin.message}</p>
            )}
          </div>

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 14,
              background: TEAL,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
              opacity: loginMutation.isPending ? 0.65 : 1,
            }}
          >
            {loginMutation.isPending ? "Connexion en cours..." : "Connexion"}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-gray-500" style={{ fontSize: 14 }}>
            Nouveau sur Bloum Cash ?{" "}
            <Link href="/register" style={{ color: BLUE, fontWeight: 700 }}>
              S'inscrire
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
