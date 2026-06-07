import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
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
        onClose: () => setLocation("/"),
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
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col md:max-w-md md:mx-auto bg-gradient-to-b from-[#1a3fc4] to-[#2b50e8]">

      {/* ── En-tête compact ── */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-10 pb-5 px-6">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-3">
          <div className="w-8 h-8 bg-[#1a3fc4] rounded-full" />
        </div>
        <h1 className="text-[22px] font-extrabold text-white">Bloum Cash</h1>
      </div>

      {/* ── Carte formulaire ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 bg-white rounded-t-3xl px-6 pt-6 pb-4 flex flex-col min-h-0 overflow-hidden"
      >
        <h2 className="text-[18px] font-bold text-gray-900 text-center mb-5">Inscription</h2>

        {/*
          autocomplete="off" + data-form-type="other" bloquent Chrome/Google
          de proposer d'enregistrer le mot de passe et d'afficher l'URL de l'app
        */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-3 flex-1 min-h-0"
        >
          {/* Champs leurres cachés — empêchent la détection par le gestionnaire de mots de passe */}
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Nom complet */}
          <div>
            <label className="text-[12px] font-semibold text-gray-600 mb-1 block">Nom Complet</label>
            <input
              placeholder="Nom Complet"
              type="text"
              autoComplete="off"
              data-form-type="other"
              {...form.register("fullName")}
              data-testid="input-fullname"
              className={`w-full h-11 rounded-xl border px-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/30 focus:border-[#1a3fc4] transition-all ${errors.fullName ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-[12px] font-semibold text-gray-600 mb-1 block">Adresse e-mail</label>
            <input
              placeholder="Adresse e-mail"
              type="text"
              inputMode="email"
              autoComplete="off"
              data-form-type="other"
              {...form.register("email")}
              data-testid="input-email"
              className={`w-full h-11 rounded-xl border px-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/30 focus:border-[#1a3fc4] transition-all ${errors.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="text-[12px] font-semibold text-gray-600 mb-1 block">Mot de passe</label>
            <div className="relative">
              <input
                placeholder="Créer votre mot de passe"
                type={showPin ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("pin")}
                data-testid="input-pin"
                className={`w-full h-11 rounded-xl border px-4 pr-11 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/30 focus:border-[#1a3fc4] transition-all ${errors.pin ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.pin && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.pin.message}</p>
            )}
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="text-[12px] font-semibold text-gray-600 mb-1 block">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                placeholder="Confirmer votre mot de passe"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                {...form.register("confirmPin")}
                data-testid="input-confirm-pin"
                className={`w-full h-11 rounded-xl border px-4 pr-11 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/30 focus:border-[#1a3fc4] transition-all ${errors.confirmPin ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            data-testid="button-register"
            disabled={registerMutation.isPending}
            className="w-full rounded-xl text-[15px] font-bold text-white bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ height: "52px" }}
          >
            {registerMutation.isPending ? "Création du compte..." : "S'inscrire"}
          </button>

          {/* Lien connexion */}
          <p className="text-center text-[13px] text-gray-500 pb-1">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="text-[#1a3fc4] font-bold">
              Se connecter
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
