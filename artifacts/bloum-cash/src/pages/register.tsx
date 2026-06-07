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

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden flex flex-col md:max-w-md md:mx-auto"
      style={{ background: "#f0f2f5" }}
    >
      {/* ── En-tête bleu compact ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-10 pb-12 px-6"
        style={{ background: "linear-gradient(160deg, #1a3fc4 0%, #2b50e8 100%)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center mb-4 shadow-lg overflow-hidden"
          style={{ width: 66, height: 66, background: "#fff", borderRadius: 20 }}
        >
          <img src="/logo-512.png" alt="Bloum Cash" style={{ width: 66, height: 66, objectFit: "contain" }} />
        </div>
        <h1 className="text-[22px] font-extrabold text-white tracking-tight">Bloum Cash</h1>
      </div>

      {/* ── Carte blanche ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: "#fff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -20,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 24,
          paddingBottom: 16,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.10)",
        }}
      >
        <h2
          className="text-center font-bold text-gray-900 mb-5"
          style={{ fontSize: 20 }}
        >
          Inscription
        </h2>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-3 flex-1"
        >
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Nom complet */}
          <div>
            <label
              className="block mb-1.5 font-semibold text-gray-700"
              style={{ fontSize: 13 }}
            >
              Nom Complet
            </label>
            <input
              placeholder="Nom Complet"
              type="text"
              autoComplete="off"
              data-form-type="other"
              {...form.register("fullName")}
              style={{
                width: "100%",
                height: 50,
                borderRadius: 12,
                border: errors.fullName ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                background: errors.fullName ? "#fef2f2" : "#fff",
                padding: "0 16px",
                fontSize: 14,
                color: "#111827",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              className="block mb-1.5 font-semibold text-gray-700"
              style={{ fontSize: 13 }}
            >
              Adresse e-mail
            </label>
            <input
              placeholder="Adresse e-mail"
              type="text"
              inputMode="email"
              autoComplete="off"
              data-form-type="other"
              {...form.register("email")}
              style={{
                width: "100%",
                height: 50,
                borderRadius: 12,
                border: errors.email ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                background: errors.email ? "#fef2f2" : "#fff",
                padding: "0 16px",
                fontSize: 14,
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
            <label
              className="block mb-1.5 font-semibold text-gray-700"
              style={{ fontSize: 13 }}
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                placeholder="Créer votre mot de passe"
                type={showPin ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("pin")}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 12,
                  border: errors.pin ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                  background: errors.pin ? "#fef2f2" : "#fff",
                  padding: "0 48px 0 16px",
                  fontSize: 14,
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

          {/* Confirmer mot de passe */}
          <div>
            <label
              className="block mb-1.5 font-semibold text-gray-700"
              style={{ fontSize: 13 }}
            >
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                placeholder="Confirmer votre mot de passe"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("confirmPin")}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 12,
                  border: errors.confirmPin ? "1.5px solid #f87171" : "1.5px solid #d1d5db",
                  background: errors.confirmPin ? "#fef2f2" : "#fff",
                  padding: "0 48px 0 16px",
                  fontSize: 14,
                  color: "#111827",
                  outline: "none",
                  boxSizing: "border-box",
                }}
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
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.confirmPin.message}</p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bouton S'inscrire */}
          <button
            type="submit"
            disabled={registerMutation.isPending}
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
              opacity: registerMutation.isPending ? 0.65 : 1,
            }}
          >
            {registerMutation.isPending ? "Création du compte..." : "S'Inscrire"}
          </button>

          {/* Lien connexion */}
          <p className="text-center text-gray-500" style={{ fontSize: 13, paddingBottom: 4 }}>
            Vous avez déjà un compte ?{" "}
            <Link href="/login" style={{ color: "#1a3fc4", fontWeight: 700 }}>
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
