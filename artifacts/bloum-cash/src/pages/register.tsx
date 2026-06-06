import React from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useRegister } from "@workspace/api-client-react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Le nom complet est requis" }),
  email: z.string().email({ message: "Adresse e-mail invalide" }),
  pin: z.string().length(6, { message: "Le code PIN doit contenir 6 chiffres" }),
  confirmPin: z.string().length(6, { message: "Le code PIN doit contenir 6 chiffres" }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "Les codes PIN ne correspondent pas",
  path: ["confirmPin"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      pin: "",
      confirmPin: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      // In a real app:
      // await registerMutation.mutateAsync({ data: { fullName: values.fullName, email: values.email, pin: values.pin } });
      
      setTimeout(() => {
        toast({
          title: "Compte créé",
          description: "Votre compte a été créé avec succès. Veuillez vous connecter.",
        });
        setLocation("/login");
      }, 1000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative">
      <div className="h-40 bg-gradient-to-br from-[#1a3fc4] to-[#2b50e8] flex flex-col items-center justify-center p-6 text-white rounded-b-[2rem]">
        <h1 className="text-2xl font-bold mt-4">Créer un compte</h1>
      </div>

      <div className="flex-1 p-6 -mt-8 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-xl p-6 border border-border"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom Complet</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} className="h-12" />
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
                      <Input placeholder="nom@exemple.com" type="email" {...field} className="h-12" />
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
                    <FormLabel>Code PIN (6 chiffres)</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} className="w-10 h-12 text-lg border-2" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
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
                    <FormLabel>Confirmer Code PIN</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} className="w-10 h-12 text-lg border-2" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 mt-4 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Création..." : "S'inscrire"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Déjà un compte ?{" "}
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
