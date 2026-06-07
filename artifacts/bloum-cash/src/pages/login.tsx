import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
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
      setLocation("/");
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
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col md:max-w-md md:mx-auto bg-gradient-to-b from-[#1a3fc4] to-[#2b50e8]">

      {/* ── En-tête ── */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-14 pb-8 px-6">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-4">
          <div className="w-10 h-10 bg-[#1a3fc4] rounded-full" />
        </div>
        <h1 className="text-[26px] font-extrabold text-white">Bloum Cash</h1>
        <p className="text-white/70 text-[13px] mt-1">Connexion à votre compte</p>
      </div>

      {/* ── Carte formulaire ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 bg-white rounded-t-3xl px-6 pt-7 pb-5 flex flex-col min-h-0 overflow-hidden"
      >
        <h2 className="text-[20px] font-bold text-gray-900 text-center mb-7">Connexion</h2>

        {/*
          autocomplete="off" + data-form-type="other" bloquent la détection
          du gestionnaire de mots de passe Chrome / Google
        */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-4 flex-1 min-h-0"
        >
          {/* Champ email invisible leurre — trompe le gestionnaire de mots de passe */}
          <input type="text" name="prevent_autofill" style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: "none" }} readOnly tabIndex={-1} />

          {/* Email */}
          <div>
            <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">Adresse e-mail</label>
            <input
              placeholder="nom@exemple.com"
              type="text"
              inputMode="email"
              autoComplete="off"
              data-form-type="other"
              data-testid="input-email"
              {...form.register("email")}
              className={`w-full h-12 rounded-xl border px-4 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/25 focus:border-[#1a3fc4] transition-all ${errors.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-semibold text-gray-600">Mot de passe</label>
              <Link href="/forgot-pin" className="text-[12px] text-[#1a3fc4] font-semibold">
                Code PIN oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                placeholder="Votre mot de passe"
                type={showPin ? "text" : "password"}
                autoComplete="new-password"
                data-form-type="other"
                data-testid="input-password"
                {...form.register("pin")}
                className={`w-full h-12 rounded-xl border px-4 pr-12 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3fc4]/25 focus:border-[#1a3fc4] transition-all ${errors.pin ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.pin && (
              <p className="text-[11px] text-red-500 mt-0.5 ml-1">{errors.pin.message}</p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bouton connexion */}
          <button
            type="submit"
            data-testid="button-submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl text-[15px] font-bold text-white bg-gradient-to-r from-[#1a3fc4] to-[#2b50e8] shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ height: "52px" }}
          >
            {loginMutation.isPending ? "Connexion en cours..." : "Connexion"}
          </button>

          {/* Lien inscription */}
          <p className="text-center text-[13px] text-gray-500 pb-1">
            Nouveau sur Bloum Cash ?{" "}
            <Link href="/register" className="text-[#1a3fc4] font-bold">
              S'inscrire
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
