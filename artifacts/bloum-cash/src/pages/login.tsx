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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

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
    defaultValues: {
      email: "",
      pin: "",
    },
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

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      <div className="h-52 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col items-center justify-center p-6 text-white rounded-b-[2rem]">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <div className="w-8 h-8 bg-primary rounded-full" />
        </div>
        <h1 className="text-2xl font-bold">Bloum Cash</h1>
        <p className="text-blue-100 text-sm mt-1">Connexion à votre compte</p>
      </div>

      <div className="flex-1 p-6 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-xl p-6 border border-border"
        >
          <h2 className="text-xl font-bold text-center mb-6">Connexion</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nom@exemple.com"
                        type="email"
                        autoComplete="email"
                        data-testid="input-email"
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Mot de passe</FormLabel>
                      <Link href="/forgot-pin" className="text-sm text-primary font-medium">
                        Code PIN oublié ?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Votre mot de passe"
                          type={showPin ? "text" : "password"}
                          autoComplete="current-password"
                          data-testid="input-password"
                          {...field}
                          className="h-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                data-testid="button-submit"
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Connexion en cours..." : "Connexion"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Nouveau sur Bloum Cash ?{" "}
              <Link href="/register" className="text-primary font-semibold">
                S'inscrire
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
