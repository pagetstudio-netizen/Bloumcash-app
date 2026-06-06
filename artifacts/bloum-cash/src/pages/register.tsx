import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
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

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Le nom complet est requis" }),
  email: z.string().email({ message: "Adresse e-mail invalide" }),
  confirmEmail: z.string().email({ message: "Adresse e-mail invalide" }),
  pin: z.string().min(4, { message: "Mot de passe requis (min. 4 caractères)" }),
  confirmPin: z.string().min(4, { message: "Confirmez votre mot de passe" }),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Les adresses e-mail ne correspondent pas",
  path: ["confirmEmail"],
}).refine((data) => data.pin === data.confirmPin, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPin"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      confirmEmail: "",
      pin: "",
      confirmPin: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      const result = await registerMutation.mutateAsync({
        data: { fullName: values.fullName, email: values.email, pin: values.pin },
      });
      login(result.user, result.token);
      toast({ title: "Compte créé avec succès !", description: "Bienvenue sur Bloum Cash." });
      setLocation("/");
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: "Cet email est peut-être déjà utilisé. Veuillez réessayer.",
      });
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      <div className="h-44 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col items-center justify-center p-6 text-white rounded-b-[2rem]">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <div className="w-7 h-7 bg-primary rounded-full" />
        </div>
        <h1 className="text-xl font-bold">Bloum Cash</h1>
      </div>

      <div className="flex-1 p-6 -mt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-xl p-6 border border-border"
        >
          <h2 className="text-xl font-bold text-center mb-6">Inscription</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom Complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom Complet" data-testid="input-fullname" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Adresse e-mail" type="email" data-testid="input-email" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer e-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Confirmer e-mail" type="email" data-testid="input-confirm-email" {...field} className="h-12" />
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Créer votre mot de passe"
                          type={showPin ? "text" : "password"}
                          data-testid="input-pin"
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

              <FormField
                control={form.control}
                name="confirmPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Confirmer votre mot de passe"
                          type={showConfirm ? "text" : "password"}
                          data-testid="input-confirm-pin"
                          {...field}
                          className="h-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                data-testid="button-register"
                className="w-full h-14 mt-2 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Création du compte..." : "S'Inscrire"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Vous avez déjà un compte ?{" "}
              <Link href="/login" className="text-primary font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
