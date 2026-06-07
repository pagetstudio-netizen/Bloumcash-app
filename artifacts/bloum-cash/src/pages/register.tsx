import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useModal } from "@/components/app-modal";

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Nom complet requis" }),
  email: z.string().email({ message: "Email invalide" }),
  pin: z.string().min(4, { message: "Min. 4 caractères" }),
  confirmPin: z.string().min(4, { message: "Confirmez votre mot de passe" }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPin"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { showModal } = useModal();
  const registerMutation = useRegister();
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", pin: "", confirmPin: "" },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      const result = await registerMutation.mutateAsync({
        data: { fullName: values.fullName, email: values.email, pin: values.pin },
      });
      login(result.user, result.token);
      showModal({
        type: "success",
        title: "Compte créé !",
        message: "Bienvenue sur Bloum Cash.",
        onClose: () => setLocation("/dashboard"),
      });
    } catch {
      showModal({
        type: "error",
        title: "Erreur d'inscription",
        message: "Cet email est peut-être déjà utilisé. Veuillez réessayer.",
      });
    }
  }

  const errors = form.formState.errors;

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 54,
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
      className="h-[100dvh] w-full flex flex-col md:max-w-md md:mx-auto"
      style={{ background: "#f0f2f5" }}
    >
      {/* ── En-tête bleu ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-10 pb-16 px-6"
        style={{ background: "#2d52e8" }}
      >
        <div
          className="flex items-center justify-center mb-4 overflow-hidden"
          style={{
            width: 68,
            height: 68,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          }}
        >
          <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 68, height: 68, objectFit: "contain" }} />
        </div>
        <h1 className="text-[22px] font-extrabold text-white tracking-tight">Bloum Cash</h1>
      </div>

      {/* ── Carte blanche scrollable ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          background: "#fff",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -24,
          padding: "28px 24px 32px 24px",
          boxShadow: "0 -6px 30px rgba(0,0,0,0.10)",
        }}
      >
        <h2
          className="text-center font-extrabold text-gray-900 mb-6"
          style={{ fontSize: 22 }}
        >
          Inscription
        </h2>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-5"
        >
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Nom complet */}
          <div>
            <label className="block mb-2 font-semibold text-gray-800" style={{ fontSize: 14 }}>
              Nom Complet
            </label>
            <input
              placeholder="Nom Complet"
              type="text"
              autoComplete="off"
              data-form-type="other"
              {...form.register("fullName")}
              style={fieldStyle(!!errors.fullName)}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 font-semibold text-gray-800" style={{ fontSize: 14 }}>
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
            <label className="block mb-2 font-semibold text-gray-800" style={{ fontSize: 14 }}>
              Mot de passe
            </label>
            <div className="relative">
              <input
                placeholder="Créer votre mot de passe"
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

          {/* Confirmer mot de passe */}
          <div>
            <label className="block mb-2 font-semibold text-gray-800" style={{ fontSize: 14 }}>
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                placeholder="Confirmer votre mot de passe"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("confirmPin")}
                style={{ ...fieldStyle(!!errors.confirmPin), padding: "0 48px 0 16px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                style={{ lineHeight: 0 }}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPin && (
              <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.confirmPin.message}</p>
            )}
          </div>

          {/* Bouton S'inscrire */}
          <button
            type="submit"
            disabled={registerMutation.isPending}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 14,
              background: "#2d52e8",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              marginTop: 4,
              opacity: registerMutation.isPending ? 0.65 : 1,
            }}
          >
            {registerMutation.isPending ? "Création du compte..." : "S'Inscrire"}
          </button>

          {/* Lien connexion */}
          <p className="text-center text-gray-500" style={{ fontSize: 14 }}>
            Vous avez déjà un compte ?{" "}
            <Link href="/login" style={{ color: "#2d52e8", fontWeight: 700 }}>
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
